import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth/firebase-admin';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import prisma from '@/lib/prisma';
import { SignJWT } from 'jose';

// JWT secret - should be at least 32 characters
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-chars'
);
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d';

interface RegisterRequestBody {
  idToken: string;
  name?: string;
  tenantName?: string;
  turnstileToken?: string;
}

interface RegisterResponse {
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
 * POST /api/auth/register
 * Register a new user with Firebase ID token
 */
export async function POST(request: NextRequest): Promise<NextResponse<RegisterResponse | { error: string }>> {
  try {
    const body: RegisterRequestBody = await request.json();
    const { idToken, name, tenantName } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'Firebase ID token is required' },
        { status: 400 }
      );
    }

    // Verify Turnstile CAPTCHA
    if (body.turnstileToken) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const isHuman = await verifyTurnstile(body.turnstileToken, ip);
      if (!isHuman) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        );
      }
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid Firebase token' },
        { status: 401 }
      );
    }

    if (!decodedToken.email) {
      return NextResponse.json(
        { error: 'Email is required for registration' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseId: decodedToken.uid },
          { email: decodedToken.email },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists. Please use login instead.' },
        { status: 409 }
      );
    }

    // Create tenant for the new user
    const userDomain = decodedToken.email.split('@')[1];
    const userName = name || decodedToken.name || decodedToken.email.split('@')[0];

    // Try to find existing tenant by domain
    let tenant = await prisma.tenant.findUnique({
      where: { domain: userDomain },
    });

    // If no tenant exists for this domain, create one
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: tenantName || `${userName}'s Organization`,
          domain: userDomain,
          isActive: true,
        },
      });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: decodedToken.email,
        name: userName,
        firebaseId: decodedToken.uid,
        tenantId: tenant.id,
      },
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

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      email: user.email,
      firebaseId: user.firebaseId,
      tenantId: user.tenantId,
      role: user.role,
    };

    const { accessToken, refreshToken } = await generateTokens(payload);

    const response: RegisterResponse = {
      accessToken,
      refreshToken,
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
