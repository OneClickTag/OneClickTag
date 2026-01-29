import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret - should be at least 32 characters
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-at-least-32-chars'
);

interface LogoutResponse {
  message: string;
}

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 *
 * Note: JWT tokens are stateless, so logout is primarily handled client-side
 * by removing the token. This endpoint exists for:
 * 1. Consistency with the API design
 * 2. Future enhancements (e.g., token blacklisting)
 * 3. Clearing any server-side session data if needed
 */
export async function POST(request: NextRequest): Promise<NextResponse<LogoutResponse | { error: string }>> {
  try {
    // Optional: Verify the token to ensure only authenticated users can logout
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      try {
        // Verify the token is valid (optional validation)
        await jwtVerify(token, JWT_SECRET);
      } catch (error) {
        // Token is invalid or expired, but we still allow logout
        console.log('Token verification failed during logout, proceeding anyway');
      }
    }

    // In a production environment with token blacklisting, you would:
    // 1. Add the token to a blacklist (Redis/database)
    // 2. Set expiration on blacklist entry to match token expiry

    // For now, we just return success and let the client clear the token
    return NextResponse.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
