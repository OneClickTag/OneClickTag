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
        // Get Google user info from the tokens using properly configured client
        const { google } = await import('googleapis');
        const { createOAuth2Client } = await import('@/lib/google/oauth');
        const oauth2Client = createOAuth2Client();
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

      // ================================================================
      // STEP 1: Tenant-level setup (idempotent, awaited — critical)
      // Discovers GTM account + creates GA4 property if they don't exist yet
      // ================================================================
      try {
        const { discoverGtmAccountId } = await import('@/lib/google/gtm');
        const { getOrCreateOctProperty } = await import('@/lib/google/ga4');

        const [gtmAccountResult, ga4PropertyResult] = await Promise.allSettled([
          discoverGtmAccountId(user.id, tenantId),
          getOrCreateOctProperty(user.id, tenantId),
        ]);

        if (gtmAccountResult.status === 'rejected') {
          console.warn('[OCT] GTM account discovery failed:', gtmAccountResult.reason);
        }
        if (ga4PropertyResult.status === 'rejected') {
          console.warn('[OCT] Tenant GA4 property setup failed:', ga4PropertyResult.reason);
        }
      } catch (error) {
        console.warn('[OCT] Tenant-level setup failed (non-blocking):', error);
      }

      // ================================================================
      // STEP 2: Customer-level setup (non-blocking)
      // Creates per-customer GTM container + workspace, data stream, syncs Ads accounts + labels
      // ================================================================
      const customerId = stateData.customerId!;

      const [gtmResult, ga4Result, adsResult] = await Promise.allSettled([
        // GTM: Create per-customer container + workspace + essentials
        (async () => {
          const { getOrCreateCustomerContainer, getGTMClient, getOrCreateWorkspace, setupWorkspaceEssentials } = await import('@/lib/google/gtm');

          // 1. Create or find the customer's dedicated container
          const { accountId, containerId } = await getOrCreateCustomerContainer(user.id, tenantId, customerId);

          // 2. Get the customer name for workspace naming
          const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { fullName: true },
          });
          const workspaceName = `OneClickTag - ${customer?.fullName || customerId}`;

          // 3. Create or find workspace inside the customer's container
          const gtm = await getGTMClient(user.id, tenantId);
          const workspaceId = await getOrCreateWorkspace(gtm, accountId, containerId, workspaceName);

          // 4. Set up workspace essentials (built-in variables, All Pages trigger,
          //    Conversion Linker tag, Page Title variable)
          await setupWorkspaceEssentials(gtm, accountId, containerId, workspaceId);

          // 5. Store workspace ID on customer
          await prisma.customer.update({
            where: { id: customerId },
            data: { gtmWorkspaceId: workspaceId },
          });

          console.log(`[GTM] Customer container + workspace ready: ${containerId} / ${workspaceId}`);
        })(),

        // GA4: Create data stream in OCT property for customer's website
        (async () => {
          const { createDataStream } = await import('@/lib/google/ga4');

          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { octGa4PropertyId: true, name: true },
          });

          if (!tenant?.octGa4PropertyId) {
            console.warn('[GA4] No OCT property found on tenant — skipping data stream creation');
            return;
          }

          const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { websiteUrl: true, fullName: true },
          });

          if (!customer?.websiteUrl) {
            console.warn('[GA4] Customer has no website URL — skipping data stream creation');
            return;
          }

          // Check if a GA4 property record already exists for this customer
          const existingProp = await prisma.gA4Property.findFirst({
            where: { customerId, tenantId, propertyId: tenant.octGa4PropertyId },
          });

          if (existingProp?.measurementId) {
            console.log(`[GA4] Customer already has data stream (${existingProp.measurementId})`);
            return;
          }

          const streamName = `${customer.fullName} - ${customer.websiteUrl}`;
          const { streamId, measurementId } = await createDataStream(
            user.id, tenantId, tenant.octGa4PropertyId, customer.websiteUrl, streamName
          );

          // Store as GA4Property record linked to this customer
          await prisma.gA4Property.upsert({
            where: {
              propertyId_tenantId: {
                propertyId: tenant.octGa4PropertyId,
                tenantId,
              },
            },
            update: {
              measurementId,
              isActive: true,
            },
            create: {
              googleAccountId: tenant.octGa4PropertyId,
              propertyId: tenant.octGa4PropertyId,
              propertyName: `OneClickTag - ${tenant.name}`,
              displayName: streamName,
              measurementId,
              isActive: true,
              customerId,
              tenantId,
            },
          });

          console.log(`[GA4] Created data stream for ${customer.websiteUrl} → ${measurementId}`);
        })(),

        // Google Ads: Sync accounts + create OCT labels
        (async () => {
          const { listAccessibleAccounts, getOrCreateOctLabel } = await import('@/lib/google/ads');
          const adsAccounts = await listAccessibleAccounts(user.id, tenantId);

          const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
          });

          for (const account of adsAccounts) {
            try {
              const dbAccount = await prisma.googleAdsAccount.upsert({
                where: {
                  accountId_tenantId: {
                    accountId: account.customerId,
                    tenantId,
                  },
                },
                update: {
                  accountName: account.descriptiveName,
                  currency: account.currencyCode,
                  timeZone: account.timeZone,
                  isActive: true,
                },
                create: {
                  googleAccountId: account.customerId,
                  accountId: account.customerId,
                  accountName: account.descriptiveName,
                  currency: account.currencyCode,
                  timeZone: account.timeZone,
                  isActive: true,
                  customerId,
                  tenantId,
                },
              });

              // Create OCT label in each Ads account
              try {
                await getOrCreateOctLabel(
                  user.id, tenantId, dbAccount.id, account.customerId, tenant?.name || 'User'
                );
              } catch (labelErr) {
                console.warn(`[Ads] Failed to create OCT label in account ${account.customerId}:`, labelErr);
              }
            } catch (err) {
              console.error(`Failed to sync account ${account.customerId}:`, err);
            }
          }
          console.log(`Synced ${adsAccounts.length} Google Ads accounts`);
        })(),
      ]);

      // Log any failures
      if (gtmResult.status === 'rejected') {
        console.warn('GTM workspace setup failed (non-blocking):', gtmResult.reason);
      }
      if (ga4Result.status === 'rejected') {
        console.warn('GA4 data stream setup failed (non-blocking):', ga4Result.reason);
      }
      if (adsResult.status === 'rejected') {
        console.warn('Google Ads sync failed (non-blocking):', adsResult.reason);
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
