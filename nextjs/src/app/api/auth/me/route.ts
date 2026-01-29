import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';

// JWT secret - should be at least 32 characters
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-chars'
);

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  firebaseId: string | null;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    isActive: boolean;
  } | null;
}

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
export async function GET(request: NextRequest): Promise<NextResponse<UserProfile | { error: string }>> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT token
    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload as { sub: string; email: string; tenantId?: string; role?: string };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!payload.sub) {
      return NextResponse.json(
        { error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    // Fetch user from database
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
        { status: 404 }
      );
    }

    // Check if tenant is active
    if (user.tenant && !user.tenant.isActive) {
      return NextResponse.json(
        { error: 'Tenant is inactive' },
        { status: 401 }
      );
    }

    const response: UserProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      firebaseId: user.firebaseId,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
