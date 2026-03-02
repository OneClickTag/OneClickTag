import prisma from '@/lib/prisma';
import {
  getGTMClient,
  getOrCreateWorkspace,
  createTrigger,
  createTag,
  listTriggers,
  listTags,
  createClientAdsConversionTag,
  createServerGA4Tag,
  createServerAdsConversionTag,
  createGA4Client,
  setupWorkspaceEssentials,
} from '@/lib/google/gtm';
import { createConversionAction, getOrCreateOctLabel } from '@/lib/google/ads';
import { getConversionCategory, getDefaultValueSettings } from '@/lib/tracking-config';
import type { TrackingType } from '@/hooks/use-trackings';
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

    // Get customer's per-customer GTM container
    const customer = tracking.customer;
    if (!customer.googleAccountId) {
      throw new Error('Customer not connected to Google account');
    }

    // Use customer's own container (per-customer architecture)
    let accountId = customer.gtmAccountId || undefined;
    let containerId = tracking.gtmContainerId || customer.gtmContainerId || undefined;

    if (!containerId || !accountId) {
      // Fallback: create/find customer's dedicated container
      const { getOrCreateCustomerContainer } = await import('@/lib/google/gtm');
      const result = await getOrCreateCustomerContainer(tokenUserId, tenantId, customerId);
      accountId = result.accountId;
      containerId = result.containerId;
    }

    // Use customer's workspace
    let workspaceId = customer.gtmWorkspaceId || undefined;
    if (!workspaceId) {
      const workspaceName = `OneClickTag - ${customer.fullName}`;
      workspaceId = await getOrCreateWorkspace(gtm, accountId, containerId, workspaceName);
    }

    // Ensure workspace has essential setup (built-in variables, Conversion Linker, etc.)
    // This is idempotent — safe to call every time, skips items that already exist
    try {
      await setupWorkspaceEssentials(gtm, accountId, containerId, workspaceId);
    } catch (error) {
      console.warn('[GTM] Workspace essentials setup failed (non-blocking):', error);
    }

    if (action === 'create') {
      // Get customer's GA4 measurement ID for the tag
      let ga4Property = await prisma.gA4Property.findFirst({
        where: { customerId, tenantId, isActive: true },
        select: { measurementId: true },
      });
      let measurementId = ga4Property?.measurementId || undefined;

      // Self-healing: if no measurement ID, create GA4 data stream on-demand
      if (!measurementId) {
        console.log('[GTM] No GA4 measurement ID found — attempting on-demand creation...');
        try {
          measurementId = await ensureGA4MeasurementId(tokenUserId, tenantId, customerId);
          console.log(`[GTM] On-demand GA4 data stream created: ${measurementId}`);
        } catch (err) {
          console.error('[GTM] On-demand GA4 setup failed:', err);
          // Let it fall through — createTagForTracking will throw a clear error
        }
      }

      // Create trigger based on tracking type (same for both modes)
      const trigger = await createTriggerForTracking(gtm, accountId, containerId, workspaceId, tracking);

      // Check if customer has server-side tracking enabled
      const stapeContainer = await prisma.stapeContainer.findUnique({
        where: { customerId },
      });
      const isServerSide = customer.serverSideEnabled && stapeContainer?.status === 'ACTIVE';

      // Create client-side GA4 tag
      const tag = await createTagForTracking(
        gtm, accountId, containerId, workspaceId, tracking, trigger.triggerId!, measurementId,
        isServerSide ? `https://${stapeContainer!.serverDomain}` : undefined
      );

      // Create client-side Google Ads Conversion tag (awct) if applicable
      let clientAdsTagId: string | undefined;
      if (tracking.destinations.includes('GOOGLE_ADS') || tracking.destinations.includes('BOTH')) {
        // Re-read tracking to get fresh adsConversionLabel (set by Ads sync which ran first)
        const freshTracking = await prisma.tracking.findUnique({
          where: { id: trackingId },
          select: { adsConversionLabel: true, adsConversionValue: true },
        });
        const conversionLabel = freshTracking?.adsConversionLabel;

        if (conversionLabel) {
          // Parse "AW-123456789/abcDEF" into numeric conversionId and conversionLabel
          const slashIndex = conversionLabel.indexOf('/');
          const rawConversionId = slashIndex > 0 ? conversionLabel.substring(0, slashIndex) : conversionLabel;
          // Strip "AW-" prefix — GTM awct tag expects just the numeric ID
          const conversionId = rawConversionId.replace(/^AW-/, '');
          const conversionLabelPart = slashIndex > 0 ? conversionLabel.substring(slashIndex + 1) : '';

          const adsTagName = `${tracking.name} - Ads Tag`;

          // Check for existing tag (idempotent)
          const existingTags = await listTags(gtm, accountId, containerId, workspaceId);
          const existingAdsTag = existingTags.find((t) => t.name === adsTagName);

          if (existingAdsTag) {
            console.log(`[GTM] Found existing Ads tag "${adsTagName}" (${existingAdsTag.tagId})`);
            clientAdsTagId = existingAdsTag.tagId || undefined;
          } else {
            const adsTag = await createClientAdsConversionTag(
              gtm, accountId, containerId, workspaceId,
              {
                name: adsTagName,
                conversionId,
                conversionLabel: conversionLabelPart,
                conversionValue: freshTracking?.adsConversionValue ? Number(freshTracking.adsConversionValue) : undefined,
                firingTriggerId: [trigger.triggerId!],
              }
            );
            clientAdsTagId = adsTag.tagId || undefined;
            console.log(`[GTM] Created client Ads tag "${adsTagName}" (${clientAdsTagId})`);
          }
        } else {
          throw new Error(
            'Google Ads conversion label not found on tracking — Ads sync may have failed or conversion label could not be retrieved. Retry should resolve this.'
          );
        }
      }

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
          // Use customer's selected Ads account (preferred) or fall back to first available
          let adsAccount;
          if (customer.selectedAdsAccountId) {
            adsAccount = await prisma.googleAdsAccount.findUnique({
              where: { id: customer.selectedAdsAccountId },
            });
          }
          if (!adsAccount) {
            adsAccount = await prisma.googleAdsAccount.findFirst({
              where: { customerId, tenantId },
            });
          }
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
          gtmTagIdGA4: tag.tagId,
          gtmTagIdAds: clientAdsTagId || null,
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
      // Use customer's selected Ads account (preferred) or fall back to first available
      const customer = tracking.customer;
      let adsAccount;

      if (customer.selectedAdsAccountId) {
        adsAccount = customer.googleAdsAccounts.find(
          (a) => a.id === customer.selectedAdsAccountId
        );
        if (!adsAccount) {
          console.warn(`[Ads] Selected Ads account ${customer.selectedAdsAccountId} not found in customer's accounts`);
        }
      }

      if (!adsAccount) {
        adsAccount = customer.googleAdsAccounts[0];
      }

      if (!adsAccount) {
        throw new Error(
          'No Google Ads account found. Connect a Google Ads account to this customer before creating trackings with Ads destination.'
        );
      }

      // Create conversion action with type-specific category
      const result = await createConversionAction(tokenUserId, tenantId, adsAccount.accountId, {
        name: tracking.name,
        category: getConversionCategory(tracking.type as TrackingType),
        type: 'WEBPAGE',
        valueSettings: getDefaultValueSettings(
          tracking.type as TrackingType,
          tracking.adsConversionValue ? Number(tracking.adsConversionValue) : undefined,
          tracking.config as Record<string, unknown> | null
        ),
      });

      // Upsert conversion action in DB (handles duplicate from retries or reused actions)
      await prisma.conversionAction.upsert({
        where: {
          googleConversionActionId_tenantId: {
            googleConversionActionId: result.conversionActionId,
            tenantId,
          },
        },
        update: {
          name: tracking.name,
          status: 'ENABLED',
        },
        create: {
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

      // Apply OCT label to the conversion action
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true },
        });
        const labelResourceName = await getOrCreateOctLabel(
          tokenUserId, tenantId, adsAccount.id, adsAccount.accountId, tenant?.name || 'User'
        );
        const { applyLabelToConversionAction } = await import('@/lib/google/ads');
        await applyLabelToConversionAction(
          tokenUserId, tenantId, adsAccount.accountId,
          result.conversionActionId, labelResourceName
        );
        console.log(`[Ads] Applied OCT label to conversion action ${result.conversionActionId}`);
      } catch (labelErr) {
        console.warn('[Ads] Failed to apply OCT label (non-blocking):', labelErr);
      }
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
      triggerConfig.customEventFilter = [
        {
          type: 'EQUALS',
          parameter: [
            { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
            { type: 'TEMPLATE', key: 'arg1', value: tracking.name.toLowerCase().replace(/\s+/g, '_') },
          ],
        },
      ];
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

// ============================================================================
// Self-Healing: Ensure GA4 measurement ID exists for a customer
// ============================================================================

async function ensureGA4MeasurementId(
  userId: string,
  tenantId: string,
  customerId: string
): Promise<string> {
  const { getOrCreateOctProperty, getOrCreateDataStream } = await import('@/lib/google/ga4');

  // Step 1: Ensure tenant has a GA4 property
  const { propertyId } = await getOrCreateOctProperty(userId, tenantId);

  // Step 2: Check if measurement ID is already stored in DB
  const existing = await prisma.gA4Property.findFirst({
    where: { customerId, tenantId, propertyId },
  });
  if (existing?.measurementId) {
    return existing.measurementId;
  }

  // Step 3: Get customer info for the data stream
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { websiteUrl: true, fullName: true },
  });

  if (!customer?.websiteUrl) {
    throw new Error('Customer has no website URL — cannot create GA4 data stream');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  // Step 4: Get or create the data stream (finds existing first, creates only if needed)
  const streamName = `${customer.fullName} - ${customer.websiteUrl}`;
  const { measurementId } = await getOrCreateDataStream(
    userId, tenantId, propertyId, customer.websiteUrl, streamName
  );

  // Step 5: Store in DB
  await prisma.gA4Property.upsert({
    where: {
      propertyId_tenantId: {
        propertyId,
        tenantId,
      },
    },
    update: {
      measurementId,
      isActive: true,
    },
    create: {
      googleAccountId: propertyId,
      propertyId,
      propertyName: `OneClickTag - ${tenant?.name || 'User'}`,
      displayName: streamName,
      measurementId,
      isActive: true,
      customerId,
      tenantId,
    },
  });

  return measurementId;
}
