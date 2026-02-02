import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifyIdToken } from './firebase-admin';
import prisma from '@/lib/prisma';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  firebaseId: string;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const decodedToken = await verifyIdToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseId: decodedToken.uid },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        firebaseId: true,
      },
    });

    if (!user || !user.firebaseId) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      firebaseId: user.firebaseId,
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    console.log('[Session] Auth header present:', !!authHeader);

    if (!token) {
      console.log('[Session] No token found');
      return null;
    }

    console.log('[Session] Token length:', token.length, 'Token prefix:', token.substring(0, 20));

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(token);
      console.log('[Session] Token verified, uid:', decodedToken.uid);
    } catch (verifyError) {
      console.error('[Session] Token verification failed:', verifyError);
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { firebaseId: decodedToken.uid },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        firebaseId: true,
      },
    });

    console.log('[Session] User found:', !!user);

    if (!user || !user.firebaseId) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      firebaseId: user.firebaseId,
    };
  } catch (error) {
    console.error('[Session] Session verification error:', error);
    return null;
  }
}

export function requireAuth(session: SessionUser | null): asserts session is SessionUser {
  if (!session) {
    throw new Error('Unauthorized');
  }
}

export function requireTenant(session: SessionUser | null): asserts session is SessionUser & { tenantId: string } {
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (!session.tenantId) {
    throw new Error('No tenant associated with user');
  }
}

export function requireAdmin(session: SessionUser | null): asserts session is SessionUser {
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden: Admin access required');
  }
}
