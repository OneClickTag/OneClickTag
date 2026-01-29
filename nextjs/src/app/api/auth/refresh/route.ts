import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import prisma from '@/lib/prisma';

// JWT secret - should be at least 32 characters
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-chars'
);
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d';

interface RefreshRequestBody {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    tenantId: string | null;
    role: string;
  };
  tenant?: {
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
  };
}

function parseExpiration(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/);
  if (!match) return 3600; // Default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
  }
}

async function generateTokens(payload: Record<string, unknown>): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRATION)
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRATION)
    .sign(JWT_SECRET);

  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/refresh
 * Refresh JWT access token using refresh token
 */
export async function POST(request: NextRequest): Promise<NextResponse<RefreshResponse | { error: string }>> {
  try {
    const body: RefreshRequestBody = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    let payload;
    try {
      const verified = await jwtVerify(refreshToken, JWT_SECRET);
      payload = verified.payload as {
        sub: string;
        email: string;
        firebaseId?: string;
        tenantId?: string;
        role?: string;
      };
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    if (!payload.sub) {
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    // Fetch user from database to get latest data
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Check if tenant is active
    if (user.tenant && !user.tenant.isActive) {
      return NextResponse.json(
        { error: 'Tenant is inactive' },
        { status: 401 }
      );
    }

    // Generate new tokens with latest user data
    const newPayload = {
      sub: user.id,
      email: user.email,
      firebaseId: user.firebaseId,
      tenantId: user.tenantId,
      role: user.role,
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(newPayload);

    const response: RefreshResponse = {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: parseExpiration(JWT_ACCESS_EXPIRATION),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role,
      },
      tenant: user.tenant || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
