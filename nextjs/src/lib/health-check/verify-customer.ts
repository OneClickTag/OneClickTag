import prisma from '@/lib/prisma';
import { getGTMClient, listTriggers, listTags } from '@/lib/google/gtm';
import { getOAuth2ClientWithTokens } from '@/lib/google/oauth';

const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

export type GoogleHealthValue =
  | 'HEALTHY'
  | 'MISSING_TRIGGER'
  | 'MISSING_TAG'
  | 'MISSING_CONVERSION'
  | 'WORKSPACE_GONE'
  | 'UNCHECKED';

export interface HealthCheckResult {
  customerId: string;
  totalChecked: number;
  healthy: number;
  issues: number;
  trackingIssues: Array<{
    trackingId: string;
    trackingName: string;
    health: GoogleHealthValue;
  }>;
}

/**
 * Verify that all ACTIVE trackings for a customer still exist on Google's side.
 * Makes at most 4 API calls per customer (workspace list, triggers, tags, Ads query).
 */
export async function verifyCustomerHealth(
  customerId: string,
): Promise<HealthCheckResult> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      trackings: {
        where: { status: 'ACTIVE' },
      },
      googleAdsAccounts: true,
    },
  });

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }

  const activeTrackings = customer.trackings;

  if (activeTrackings.length === 0) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { lastHealthCheckAt: new Date(), healthStatus: 'healthy' },
    });
    return { customerId, totalChecked: 0, healthy: 0, issues: 0, trackingIssues: [] };
  }

  // Guard: skip if not connected to Google
  if (!customer.googleAccountId || !customer.gtmContainerId) {
    return { customerId, totalChecked: 0, healthy: 0, issues: 0, trackingIssues: [] };
  }

  // Get OAuth token user (reuse pattern from sync.ts:44-48)
  const oauthToken = await prisma.oAuthToken.findFirst({
    where: { tenantId: customer.tenantId, provider: 'google', scope: 'gtm' },
    select: { userId: true },
  });

  if (!oauthToken) {
    // No token — leave health as UNCHECKED
    return { customerId, totalChecked: 0, healthy: 0, issues: 0, trackingIssues: [] };
  }

  const tokenUserId = oauthToken.userId;
  const accountId = customer.gtmAccountId!;
  const containerId = customer.gtmContainerId!;
  const workspaceId = customer.gtmWorkspaceId;

  const gtm = await getGTMClient(tokenUserId, customer.tenantId);

  // API Call 1: List workspaces — verify workspace exists
  let workspaceExists = false;
  try {
    const workspacesResponse = await gtm.accounts.containers.workspaces.list({
      parent: `accounts/${accountId}/containers/${containerId}`,
    });
    const workspaces = workspacesResponse.data.workspace || [];
    workspaceExists = workspaceId
      ? workspaces.some((ws) => ws.workspaceId === workspaceId)
      : workspaces.length > 0;
  } catch (error: any) {
    // If container itself is gone, workspace is also gone
    if (error?.code === 404 || error?.status === 404) {
      workspaceExists = false;
    } else {
      throw error; // Re-throw unexpected errors (429, network, etc.)
    }
  }

  if (!workspaceExists) {
    // Mark ALL trackings as WORKSPACE_GONE
    const trackingIssues = activeTrackings.map((t) => ({
      trackingId: t.id,
      trackingName: t.name,
      health: 'WORKSPACE_GONE' as GoogleHealthValue,
    }));

    await prisma.tracking.updateMany({
      where: { id: { in: activeTrackings.map((t) => t.id) } },
      data: { googleHealth: 'WORKSPACE_GONE', lastHealthCheckAt: new Date() },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastHealthCheckAt: new Date(), healthStatus: 'issues_found' },
    });

    return {
      customerId,
      totalChecked: activeTrackings.length,
      healthy: 0,
      issues: activeTrackings.length,
      trackingIssues,
    };
  }

  // Use the workspaceId from the customer or fall back to finding the OneClickTag workspace
  const effectiveWorkspaceId = workspaceId || await findWorkspaceId(gtm, accountId, containerId);

  if (!effectiveWorkspaceId) {
    // Workspace not found by name either — mark all as WORKSPACE_GONE
    const trackingIssues = activeTrackings.map((t) => ({
      trackingId: t.id,
      trackingName: t.name,
      health: 'WORKSPACE_GONE' as GoogleHealthValue,
    }));

    await prisma.tracking.updateMany({
      where: { id: { in: activeTrackings.map((t) => t.id) } },
      data: { googleHealth: 'WORKSPACE_GONE', lastHealthCheckAt: new Date() },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastHealthCheckAt: new Date(), healthStatus: 'issues_found' },
    });

    return {
      customerId,
      totalChecked: activeTrackings.length,
      healthy: 0,
      issues: activeTrackings.length,
      trackingIssues,
    };
  }

  // API Call 2: List triggers
  const triggers = await listTriggers(gtm, accountId, containerId, effectiveWorkspaceId);
  const triggerIds = new Set(triggers.map((t) => t.triggerId).filter(Boolean));

  // API Call 3: List tags
  const tags = await listTags(gtm, accountId, containerId, effectiveWorkspaceId);
  const tagIds = new Set(tags.map((t) => t.tagId).filter(Boolean));

  // API Call 4: GAQL query for conversion actions (only if any tracking needs Ads)
  const needsAdsCheck = activeTrackings.some(
    (t) => t.destinations.includes('GOOGLE_ADS') || t.destinations.includes('BOTH'),
  );
  const conversionActionIds = new Set<string>();

  if (needsAdsCheck && customer.googleAdsAccounts.length > 0) {
    // Use selected Ads account or first available
    const adsAccount = customer.selectedAdsAccountId
      ? customer.googleAdsAccounts.find((a) => a.id === customer.selectedAdsAccountId)
      : customer.googleAdsAccounts[0];

    if (adsAccount) {
      try {
        const adsOauthToken = await prisma.oAuthToken.findFirst({
          where: { tenantId: customer.tenantId, provider: 'google', scope: 'ads' },
          select: { userId: true },
        });
        const adsTokenUserId = adsOauthToken?.userId || tokenUserId;
        const oauth2Client = await getOAuth2ClientWithTokens(adsTokenUserId, customer.tenantId, 'ads');

        if (oauth2Client) {
          const credentials = await oauth2Client.getAccessToken();
          const query = `SELECT conversion_action.id FROM conversion_action WHERE conversion_action.status = 'ENABLED'`;

          const response = await fetch(
            `https://googleads.googleapis.com/v20/customers/${adsAccount.accountId}/googleAds:searchStream`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${credentials.token}`,
                'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            const results = data[0]?.results || [];
            for (const result of results) {
              if (result.conversionAction?.id) {
                conversionActionIds.add(String(result.conversionAction.id));
              }
            }
          }
        }
      } catch (error) {
        // Ads check failed — we'll skip Ads verification for this run
        console.warn(`[HealthCheck] Ads query failed for customer ${customerId}:`, error);
      }
    }
  }

  // In-memory matching: check each tracking against the Sets
  const trackingIssues: HealthCheckResult['trackingIssues'] = [];
  const updates: Array<{ id: string; health: GoogleHealthValue }> = [];

  for (const tracking of activeTrackings) {
    let health: GoogleHealthValue = 'HEALTHY';

    // Check trigger exists
    if (tracking.gtmTriggerId && !triggerIds.has(tracking.gtmTriggerId)) {
      health = 'MISSING_TRIGGER';
    }

    // Check tags exist (only if trigger is fine)
    if (health === 'HEALTHY') {
      const ga4TagId = tracking.gtmTagIdGA4 || tracking.gtmTagId;
      if (ga4TagId && !tagIds.has(ga4TagId)) {
        health = 'MISSING_TAG';
      }
    }

    // Check Ads tag (destination-aware — only for GOOGLE_ADS/BOTH)
    if (
      health === 'HEALTHY' &&
      (tracking.destinations.includes('GOOGLE_ADS') || tracking.destinations.includes('BOTH'))
    ) {
      if (tracking.gtmTagIdAds && !tagIds.has(tracking.gtmTagIdAds)) {
        health = 'MISSING_TAG';
      }

      // Check conversion action exists in Ads
      if (health === 'HEALTHY' && tracking.conversionActionId && needsAdsCheck) {
        // Look up the conversion action's Google ID
        const convAction = await prisma.conversionAction.findUnique({
          where: { id: tracking.conversionActionId },
          select: { googleConversionActionId: true },
        });
        if (
          convAction?.googleConversionActionId &&
          conversionActionIds.size > 0 &&
          !conversionActionIds.has(convAction.googleConversionActionId)
        ) {
          health = 'MISSING_CONVERSION';
        }
      }
    }

    updates.push({ id: tracking.id, health });

    if (health !== 'HEALTHY') {
      trackingIssues.push({
        trackingId: tracking.id,
        trackingName: tracking.name,
        health,
      });
    }
  }

  // Batch-update all trackings
  const now = new Date();
  await Promise.all(
    updates.map((u) =>
      prisma.tracking.update({
        where: { id: u.id },
        data: { googleHealth: u.health, lastHealthCheckAt: now },
      }),
    ),
  );

  const healthyCount = updates.filter((u) => u.health === 'HEALTHY').length;
  const issueCount = updates.filter((u) => u.health !== 'HEALTHY').length;

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      lastHealthCheckAt: now,
      healthStatus: issueCount > 0 ? 'issues_found' : 'healthy',
    },
  });

  return {
    customerId,
    totalChecked: activeTrackings.length,
    healthy: healthyCount,
    issues: issueCount,
    trackingIssues,
  };
}

/**
 * Find the OneClickTag workspace ID by name when not stored on the customer.
 */
async function findWorkspaceId(
  gtm: Awaited<ReturnType<typeof getGTMClient>>,
  accountId: string,
  containerId: string,
): Promise<string | null> {
  try {
    const response = await gtm.accounts.containers.workspaces.list({
      parent: `accounts/${accountId}/containers/${containerId}`,
    });
    const workspaces = response.data.workspace || [];
    const octWorkspace = workspaces.find(
      (ws) => ws.name?.includes('OneClickTag'),
    );
    return octWorkspace?.workspaceId || null;
  } catch {
    return null;
  }
}
