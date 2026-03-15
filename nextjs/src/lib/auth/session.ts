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

// In-memory session cache to avoid repeated Firebase verification + DB lookup
// Cache key: token hash (first 32 chars), value: session user, TTL: 60s
const sessionCache = new Map<string, { user: SessionUser; expiresAt: number }>();
const SESSION_CACHE_TTL = 60_000; // 1 minute

export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    // Check session cache first
    const cacheKey = token.substring(0, 32);
    const cached = sessionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(token);
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

    if (!user || !user.firebaseId) {
      return null;
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      firebaseId: user.firebaseId,
    };

    // Cache the session
    sessionCache.set(cacheKey, { user: sessionUser, expiresAt: Date.now() + SESSION_CACHE_TTL });

    // Evict stale entries periodically (keep cache small)
    if (sessionCache.size > 100) {
      const now = Date.now();
      sessionCache.forEach((entry, key) => {
        if (entry.expiresAt < now) sessionCache.delete(key);
      });
    }

    return sessionUser;
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
