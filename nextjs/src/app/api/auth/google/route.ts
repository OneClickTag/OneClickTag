import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getAuthUrl } from '@/lib/google/oauth';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// JWT secret - should be at least 32 characters
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-chars'
);

interface OAuthInitiateResponse {
  authUrl: string;
  state: string;
}

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 *
 * This endpoint generates a Google OAuth authorization URL that the client
 * should redirect to. The state parameter is used to prevent CSRF attacks.
 *
 * Query Parameters:
 * - customerId: (optional) Customer ID to associate the Google account with
 * - redirectUrl: (optional) URL to redirect to after OAuth completion
 */
export async function GET(request: NextRequest): Promise<NextResponse<OAuthInitiateResponse | { error: string }>> {
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
      payload = verified.payload as { sub: string; tenantId?: string };
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

    // Get optional parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');
    const redirectUrl = searchParams.get('redirectUrl');

    // Generate state parameter for CSRF protection
    // The state includes user info and optional parameters to reconstruct context after callback
    const stateData = {
      nonce: randomUUID(),
      userId: payload.sub,
      tenantId: payload.tenantId,
      customerId: customerId || undefined,
      redirectUrl: redirectUrl || undefined,
      timestamp: Date.now(),
    };

    // Encode state as base64 JSON
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Generate OAuth URL with all required scopes
    const authUrl = getAuthUrl(state);

    return NextResponse.json({
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
