import prisma from '@/lib/prisma';
import {
  getGTMClient,
  getOrCreateWorkspace,
  createTrigger,
  createTag,
  listContainers,
  listTriggers,
  listTags,
  createServerGA4Tag,
  createServerAdsConversionTag,
  createGA4Client,
} from '@/lib/google/gtm';
import { createConversionAction } from '@/lib/google/ads';
import type { GTMSyncJob, AdsSyncJob } from './index';

// ============================================================================
// GTM Sync - Core Logic (used by both workers and inline execution)
// ============================================================================

export async function executeGTMSync(data: GTMSyncJob): Promise<{ success: boolean }> {
  const { trackingId, customerId, tenantId, userId, action } = data;

  const tracking = await prisma.tracking.findUnique({
    where: { id: trackingId },
    include: { customer: true },
  });

  if (!tracking) {
    throw new Error(`Tracking ${trackingId} not found`);
  }

  // Update status to CREATING
  await prisma.tracking.update({
    where: { id: trackingId },
    data: { status: 'CREATING' },
  });

  try {
    // Find the userId that actually has the OAuth tokens (may differ from the requesting user)
    const oauthToken = await prisma.oAuthToken.findFirst({
      where: { tenantId, provider: 'google', scope: 'gtm' },
      select: { userId: true },
    });
    const tokenUserId = oauthToken?.userId || userId;

    const gtm = await getGTMClient(tokenUserId, tenantId);

    // Get customer's GTM container
    const customer = tracking.customer;
    if (!customer.googleAccountId) {
      throw new Error('Customer not connected to Google account');
    }

    // Get container/account IDs - use stored ones or fetch from GTM
    let containerId = tracking.gtmContainerId || customer.gtmContainerId;
    // Fetch gtmAccountId via raw query since Prisma client may not have it cached
    const accountIdResult = await prisma.$queryRawUnsafe<Array<{gtmAccountId: string | null}>>(
      `SELECT "gtmAccountId" FROM customers WHERE id = $1`, customerId
    );
    let accountId = accountIdResult[0]?.gtmAccountId;

    if (!containerId || !accountId) {
      const containers = await listContainers(tokenUserId, tenantId);
      if (containers.length === 0) {
        throw new Error('No GTM containers found for this Google account');
      }
      containerId = containers[0].containerId!;
      accountId = containers[0].accountId!;

      // Store the container/account IDs on the customer for future use
      const containerName = containers[0].name || containers[0].publicId || containerId;
      await prisma.$executeRawUnsafe(
        `UPDATE customers SET "gtmAccountId" = $1, "gtmContainerId" = $2, "gtmContainerName" = $3 WHERE id = $4`,
        accountId, containerId, containerName, customerId
      );
    }

    // Get or create OneClickTag workspace
    const workspaceId = await getOrCreateWorkspace(gtm, accountId, containerId);

    if (action === 'create') {
      // Get customer's GA4 measurement ID for the tag
      const ga4Property = await prisma.gA4Property.findFirst({
        where: { customerId, tenantId, isActive: true },
        select: { measurementId: true },
      });
      const measurementId = ga4Property?.measurementId || undefined;

      // Create trigger based on tracking type (same for both modes)
      const trigger = await createTriggerForTracking(gtm, accountId, containerId, workspaceId, tracking);

      // Check if customer has server-side tracking enabled
      const stapeContainer = await prisma.stapeContainer.findUnique({
        where: { customerId },
      });
      const isServerSide = customer.serverSideEnabled && stapeContainer?.status === 'ACTIVE';

      // Create client-side tag
      const tag = await createTagForTracking(
        gtm, accountId, containerId, workspaceId, tracking, trigger.triggerId!, measurementId,
        isServerSide ? `https://${stapeContainer!.serverDomain}` : undefined
      );

      // Server-side GTM: create tags in the sGTM container
      let sgtmTriggerId: string | undefined;
      let sgtmTagId: string | undefined;
      let sgtmTagIdAds: string | undefined;

      if (isServerSide && stapeContainer!.gtmServerContainerId && stapeContainer!.gtmServerAccountId) {
        const serverContainerId = stapeContainer!.gtmServerContainerId;
        const serverAccountId = stapeContainer!.gtmServerAccountId;

        // Get or create workspace in server container
        const serverWorkspaceId = await getOrCreateWorkspace(gtm, serverAccountId, serverContainerId);

        // Store workspace ID if not saved yet
        if (!stapeContainer!.gtmServerWorkspaceId) {
          await prisma.stapeContainer.update({
            where: { id: stapeContainer!.id },
            data: { gtmServerWorkspaceId: serverWorkspaceId },
          });
        }

        // Ensure GA4 Client exists in the server container (idempotent)
        await createGA4Client(gtm, serverAccountId, serverContainerId, serverWorkspaceId);

        // Create server-side trigger (custom event matching the GA4 event name)
        const serverTrigger = await createTrigger(gtm, serverAccountId, serverContainerId, serverWorkspaceId, {
          name: `${tracking.name} - Server Trigger`,
          type: 'CUSTOM_EVENT',
          customEventFilter: [{
            type: 'EQUALS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.ga4EventName || tracking.name.toLowerCase().replace(/\s+/g, '_') },
            ],
          }],
        });
        sgtmTriggerId = serverTrigger.triggerId || undefined;

        // Create server-side GA4 tag
        if (measurementId) {
          const serverGA4Tag = await createServerGA4Tag(
            gtm, serverAccountId, serverContainerId, serverWorkspaceId,
            {
              name: `${tracking.name} - Server GA4 Tag`,
              measurementId,
              firingTriggerId: [serverTrigger.triggerId!],
            }
          );
          sgtmTagId = serverGA4Tag.tagId || undefined;
        }

        // Create server-side Ads conversion tag if applicable
        if (tracking.adsConversionLabel && (tracking.destinations.includes('GOOGLE_ADS') || tracking.destinations.includes('BOTH'))) {
          const adsAccount = await prisma.googleAdsAccount.findFirst({
            where: { customerId, tenantId },
          });
          if (adsAccount) {
            const serverAdsTag = await createServerAdsConversionTag(
              gtm, serverAccountId, serverContainerId, serverWorkspaceId,
              {
                name: `${tracking.name} - Server Ads Tag`,
                conversionId: adsAccount.accountId,
                conversionLabel: tracking.adsConversionLabel,
                firingTriggerId: [serverTrigger.triggerId!],
              }
            );
            sgtmTagIdAds = serverAdsTag.tagId || undefined;
          }
        }
      }

      // Update tracking with all IDs
      await prisma.tracking.update({
        where: { id: trackingId },
        data: {
          gtmTriggerId: trigger.triggerId,
          gtmTagId: tag.tagId,
          gtmContainerId: containerId,
          gtmWorkspaceId: workspaceId,
          trackingMode: isServerSide ? 'SERVER_SIDE' : 'CLIENT_SIDE',
          sgtmTriggerId: sgtmTriggerId || null,
          sgtmTagId: sgtmTagId || null,
          sgtmTagIdAds: sgtmTagIdAds || null,
          status: 'ACTIVE',
          lastSyncAt: new Date(),
          lastError: null,
        },
      });
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.tracking.update({
      where: { id: trackingId },
      data: {
        status: 'FAILED',
        lastError: errorMessage,
        syncAttempts: { increment: 1 },
      },
    });

    throw error;
  }
}

// ============================================================================
// Google Ads Sync - Core Logic
// ============================================================================

export async function executeAdsSync(data: AdsSyncJob): Promise<{ success: boolean; skipped?: boolean }> {
  const { trackingId, customerId, tenantId, userId, action } = data;

  const tracking = await prisma.tracking.findUnique({
    where: { id: trackingId },
    include: { customer: { include: { googleAdsAccounts: true } } },
  });

  if (!tracking) {
    throw new Error(`Tracking ${trackingId} not found`);
  }

  try {
    // Find the userId that actually has the OAuth tokens
    const oauthToken = await prisma.oAuthToken.findFirst({
      where: { tenantId, provider: 'google', scope: 'ads' },
      select: { userId: true },
    });
    const tokenUserId = oauthToken?.userId || userId;

    if (action === 'create' && (tracking.destinations.includes('GOOGLE_ADS') || tracking.destinations.includes('BOTH'))) {
      const adsAccount = tracking.customer.googleAdsAccounts[0];
      if (!adsAccount) {
        console.log('No Google Ads account found, skipping Ads sync');
        return { success: true, skipped: true };
      }

      // Create conversion action
      const result = await createConversionAction(tokenUserId, tenantId, adsAccount.accountId, {
        name: tracking.name,
        category: 'PURCHASE',
        type: 'WEBPAGE',
      });

      // Create conversion action in DB
      await prisma.conversionAction.create({
        data: {
          name: tracking.name,
          type: 'WEBPAGE',
          status: 'ENABLED',
          googleConversionActionId: result.conversionActionId,
          googleAccountId: adsAccount.accountId,
          customerId,
          tenantId,
        },
      });

      // Update tracking with conversion label
      await prisma.tracking.update({
        where: { id: trackingId },
        data: {
          adsConversionLabel: result.conversionLabel,
        },
      });
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ads sync error:', errorMessage);
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function createTriggerForTracking(
  gtm: Awaited<ReturnType<typeof getGTMClient>>,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tracking: { name: string; type: string; selector?: string | null; urlPattern?: string | null }
) {
  const triggerConfig: {
    name: string;
    type: string;
    filter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
    customEventFilter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
  } = {
    name: `${tracking.name} - Trigger`,
    type: 'CLICK',
  };

  switch (tracking.type) {
    case 'BUTTON_CLICK':
    case 'LINK_CLICK':
      triggerConfig.type = 'CLICK';
      if (tracking.selector) {
        triggerConfig.filter = [
          {
            type: 'CONTAINS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{Click Element}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.selector },
            ],
          },
        ];
      }
      break;

    case 'PAGE_VIEW':
      triggerConfig.type = 'PAGEVIEW';
      if (tracking.urlPattern) {
        triggerConfig.filter = [
          {
            type: 'CONTAINS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{Page URL}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.urlPattern },
            ],
          },
        ];
      }
      break;

    case 'FORM_SUBMIT':
      triggerConfig.type = 'FORM_SUBMISSION';
      break;

    default:
      triggerConfig.type = 'CUSTOM_EVENT';
  }

  // Check for existing trigger with the same name (idempotent)
  const existingTriggers = await listTriggers(gtm, accountId, containerId, workspaceId);
  const existing = existingTriggers.find((t) => t.name === triggerConfig.name);
  if (existing) {
    console.log(`[GTM] Found existing trigger "${triggerConfig.name}" (${existing.triggerId})`);
    return existing;
  }

  return createTrigger(gtm, accountId, containerId, workspaceId, triggerConfig);
}

async function createTagForTracking(
  gtm: Awaited<ReturnType<typeof getGTMClient>>,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tracking: { name: string; ga4EventName?: string | null },
  triggerId: string,
  measurementId?: string,
  transportUrl?: string
) {
  if (!measurementId) {
    throw new Error('GA4 Measurement ID is required to create a tracking tag. Please sync GA4 properties first.');
  }

  const tagName = `${tracking.name} - Tag`;

  // Check for existing tag with the same name (idempotent)
  const existingTags = await listTags(gtm, accountId, containerId, workspaceId);
  const existing = existingTags.find((t) => t.name === tagName);
  if (existing) {
    console.log(`[GTM] Found existing tag "${tagName}" (${existing.tagId})`);
    return existing;
  }

  const parameters: Array<{ type: string; key: string; value: string }> = [
    {
      type: 'TEMPLATE',
      key: 'eventName',
      value: tracking.ga4EventName || tracking.name.toLowerCase().replace(/\s+/g, '_'),
    },
    {
      type: 'TEMPLATE',
      key: 'measurementIdOverride',
      value: measurementId,
    },
  ];

  // If server-side, route events through Stape instead of directly to Google
  if (transportUrl) {
    parameters.push({
      type: 'TEMPLATE',
      key: 'transportUrl',
      value: transportUrl,
    });
  }

  return createTag(gtm, accountId, containerId, workspaceId, {
    name: tagName,
    type: 'gaawe', // GA4 Event tag
    parameter: parameters,
    firingTriggerId: [triggerId],
  });
}
