import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL!;

// OAuth scopes for different Google services
export const GOOGLE_SCOPES = {
  userinfo: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  gtm: [
    'https://www.googleapis.com/auth/tagmanager.manage.accounts',
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.publish',
  ],
  ads: ['https://www.googleapis.com/auth/adwords'],
  ga4: [
    'https://www.googleapis.com/auth/analytics.edit',
    'https://www.googleapis.com/auth/analytics.readonly',
  ],
};

export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri || GOOGLE_CALLBACK_URL
  );
}

/**
 * Build the callback URL from request origin.
 * This ensures the redirect_uri always matches the actual deployment URL,
 * avoiding unauthorized_client errors on Vercel preview/production deployments.
 */
export function buildCallbackUrl(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function getAuthUrl(state: string, redirectUri?: string): string {
  const oauth2Client = createOAuth2Client(redirectUri);

  const scopes = [
    ...GOOGLE_SCOPES.userinfo,
    ...GOOGLE_SCOPES.gtm,
    ...GOOGLE_SCOPES.ads,
    ...GOOGLE_SCOPES.ga4,
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent', // Force consent to get refresh token
  });
}

export async function exchangeCodeForTokens(code: string, redirectUri?: string) {
  const oauth2Client = createOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getOAuth2ClientWithTokens(
  userId: string,
  tenantId: string,
  scope: 'gtm' | 'ads' | 'ga4'
): Promise<OAuth2Client | null> {
  const token = await prisma.oAuthToken.findUnique({
    where: {
      userId_provider_scope: {
        userId,
        provider: 'google',
        scope,
      },
    },
  });

  if (!token) {
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt?.getTime(),
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.access_token) {
      await prisma.oAuthToken.update({
        where: { id: token.id },
        data: {
          accessToken: newTokens.access_token,
          expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
          ...(newTokens.refresh_token && { refreshToken: newTokens.refresh_token }),
        },
      });
    }
  });

  return oauth2Client;
}

export async function storeOAuthTokens(
  userId: string,
  tenantId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }
): Promise<void> {
  const scopes: Array<'gtm' | 'ads' | 'ga4'> = ['gtm', 'ads', 'ga4'];

  for (const scope of scopes) {
    await prisma.oAuthToken.upsert({
      where: {
        userId_provider_scope: {
          userId,
          provider: 'google',
          scope,
        },
      },
      update: {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      create: {
        userId,
        tenantId,
        provider: 'google',
        scope,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  }
}

export async function revokeOAuthTokens(userId: string): Promise<void> {
  const tokens = await prisma.oAuthToken.findMany({
    where: { userId, provider: 'google' },
  });

  for (const token of tokens) {
    try {
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(token.accessToken);
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  }

  await prisma.oAuthToken.deleteMany({
    where: { userId, provider: 'google' },
  });
}
