import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeOAuthTokens } from '@/lib/google/oauth';
import prisma from '@/lib/prisma';

interface StateData {
  nonce: string;
  userId: string;
  tenantId?: string;
  customerId?: string;
  redirectUrl?: string;
  timestamp: number;
}

interface CallbackSuccessResponse {
  message: string;
  customerId?: string;
  redirectUrl?: string;
}

// State validity duration (15 minutes)
const STATE_VALIDITY_MS = 15 * 60 * 1000;

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 *
 * This endpoint is called by Google after the user authorizes the application.
 * It exchanges the authorization code for tokens and stores them in the database.
 *
 * Query Parameters (from Google):
 * - code: Authorization code to exchange for tokens
 * - state: State parameter for CSRF validation
 * - error: Error code if authorization failed
 * - error_description: Human-readable error description
 */
export async function GET(request: NextRequest): Promise<NextResponse<CallbackSuccessResponse | { error: string }> | Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors from Google
    if (error) {
      console.error('Google OAuth error:', error, errorDescription);

      // If there's a redirect URL in state, redirect with error
      if (state) {
        try {
          const stateData = JSON.parse(Buffer.from(state, 'base64url').toString()) as StateData;
          if (stateData.redirectUrl) {
            const redirectUrl = new URL(stateData.redirectUrl);
            redirectUrl.searchParams.set('error', error);
            if (errorDescription) {
              redirectUrl.searchParams.set('error_description', errorDescription);
            }
            return NextResponse.redirect(redirectUrl.toString());
          }
        } catch {
          // Ignore state parsing errors
        }
      }

      return NextResponse.json(
        { error: `OAuth error: ${error} - ${errorDescription || 'No description'}` },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      );
    }

    // Decode and validate state
    let stateData: StateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString()) as StateData;
    } catch (error) {
      console.error('Failed to decode state:', error);
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Validate state timestamp (prevent replay attacks)
    if (Date.now() - stateData.timestamp > STATE_VALIDITY_MS) {
      return NextResponse.json(
        { error: 'OAuth state has expired. Please try again.' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: stateData.userId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Use tenantId from user if not in state
    const tenantId = stateData.tenantId || user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context is required for OAuth' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for tokens' },
        { status: 500 }
      );
    }

    // Store OAuth tokens for all scopes (GTM, Ads, GA4)
    try {
      await storeOAuthTokens(user.id, tenantId, tokens);
    } catch (error) {
      console.error('Failed to store OAuth tokens:', error);
      return NextResponse.json(
        { error: 'Failed to store OAuth tokens' },
        { status: 500 }
      );
    }

    // If there's a customerId, update the customer with Google account info
    if (stateData.customerId) {
      try {
        // Get Google user info from the tokens
        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
          access_token: tokens.access_token,
        });

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Update customer with Google account info
        await prisma.customer.update({
          where: { id: stateData.customerId },
          data: {
            googleAccountId: userInfo.data.id || undefined,
            googleEmail: userInfo.data.email || undefined,
          },
        });
      } catch (error) {
        console.error('Failed to update customer with Google info:', error);
        // Non-blocking - tokens are still stored
      }
    }

    // Redirect to the specified URL or return success response
    if (stateData.redirectUrl) {
      const redirectUrl = new URL(stateData.redirectUrl);
      redirectUrl.searchParams.set('success', 'true');
      if (stateData.customerId) {
        redirectUrl.searchParams.set('customerId', stateData.customerId);
      }
      return NextResponse.redirect(redirectUrl.toString());
    }

    return NextResponse.json({
      message: 'Google OAuth tokens stored successfully',
      customerId: stateData.customerId,
      redirectUrl: stateData.redirectUrl,
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
