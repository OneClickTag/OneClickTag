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

  // Run initial DB lookups in parallel
  const [tracking, oauthToken] = await Promise.all([
    prisma.tracking.findUnique({
      where: { id: trackingId },
      include: { customer: true },
    }),
    prisma.oAuthToken.findFirst({
      where: { tenantId, provider: 'google', scope: 'gtm' },
      select: { userId: true },
    }),
  ]);

  if (!tracking) {
    throw new Error(`Tracking ${trackingId} not found`);
  }

  try {
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

    // Run workspace essentials + GA4 lookup + stape lookup in parallel
    // setupWorkspaceEssentials now returns cached triggers/tags lists
    const [essentialsResult, ga4Property, stapeContainer] = await Promise.all([
      setupWorkspaceEssentials(gtm, accountId, containerId, workspaceId).catch((error) => {
        console.warn('[GTM] Workspace essentials setup failed (non-blocking):', error);
        return null;
      }),
      prisma.gA4Property.findFirst({
        where: { customerId, tenantId, isActive: true },
        select: { measurementId: true },
      }),
      prisma.stapeContainer.findUnique({
        where: { customerId },
      }),
    ]);

    // Use cached lists from setupWorkspaceEssentials to avoid redundant API calls
    const cachedTriggers = essentialsResult?.cachedTriggers || [];
    const cachedTags = essentialsResult?.cachedTags || [];

    if (action === 'create') {
      let measurementId = ga4Property?.measurementId || undefined;

      // Self-healing: if no measurement ID, create GA4 data stream on-demand
      if (!measurementId) {
        console.log('[GTM] No GA4 measurement ID found — attempting on-demand creation...');
        try {
          measurementId = await ensureGA4MeasurementId(tokenUserId, tenantId, customerId);
          console.log(`[GTM] On-demand GA4 data stream created: ${measurementId}`);
        } catch (err) {
          console.error('[GTM] On-demand GA4 setup failed:', err);
        }
      }

      // Validate measurement ID BEFORE creating any GTM resources to prevent orphaned triggers
      if (!measurementId) {
        throw new Error(
          'GA4 Measurement ID is required to create a tracking tag. ' +
          'Please ensure GA4 properties are connected and synced, or contact support if on-demand setup failed.'
        );
      }

      const isServerSide = customer.serverSideEnabled && stapeContainer?.status === 'ACTIVE';

      // Create trigger using cached list (avoids redundant listTriggers call)
      const trigger = await createTriggerForTracking(gtm, accountId, containerId, workspaceId, tracking, cachedTriggers);

      // Create client-side GA4 tag using cached list (avoids redundant listTags call)
      const tag = await createTagForTracking(
        gtm, accountId, containerId, workspaceId, tracking, trigger.triggerId!, measurementId,
        isServerSide ? `https://${stapeContainer!.serverDomain}` : undefined,
        cachedTags
      );

      // Create client-side Google Ads Conversion tag (awct) if applicable
      let clientAdsTagId: string | undefined;
      if (tracking.destinations.includes('GOOGLE_ADS') || tracking.destinations.includes('BOTH')) {
        // Read fresh adsConversionLabel (set by Ads sync running in parallel)
        // Retry up to 8 times with 2s delay (max 16s) to allow Ads sync time to complete
        let conversionLabel: string | null = null;
        let conversionValue: number | null = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          const freshTracking = await prisma.tracking.findUnique({
            where: { id: trackingId },
            select: { adsConversionLabel: true, adsConversionValue: true },
          });
          conversionLabel = freshTracking?.adsConversionLabel || null;
          conversionValue = freshTracking?.adsConversionValue ? Number(freshTracking.adsConversionValue) : null;
          if (conversionLabel) break;
          if (attempt < 7) {
            console.log(`[GTM] Waiting for Ads conversion label (attempt ${attempt + 1}/8)...`);
            await new Promise((r) => setTimeout(r, 2000));
          }
        }

        if (conversionLabel) {
          const slashIndex = conversionLabel.indexOf('/');
          const rawConversionId = slashIndex > 0 ? conversionLabel.substring(0, slashIndex) : conversionLabel;
          const conversionId = rawConversionId.replace(/^AW-/, '');
          const conversionLabelPart = slashIndex > 0 ? conversionLabel.substring(slashIndex + 1) : '';

          const adsTagName = `${tracking.name} - Ads Tag`;

          // Use cached tags list instead of re-fetching
          const existingAdsTag = cachedTags.find((t) => t.name === adsTagName);

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
                conversionValue: conversionValue ?? undefined,
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

      if (isServerSide && stapeContainer && stapeContainer.gtmServerContainerId && stapeContainer.gtmServerAccountId) {
        const serverContainerId = stapeContainer.gtmServerContainerId;
        const serverAccountId = stapeContainer.gtmServerAccountId;

        // Get or create workspace in server container
        const serverWorkspaceId = await getOrCreateWorkspace(gtm, serverAccountId, serverContainerId);

        // Store workspace ID if not saved yet
        if (!stapeContainer.gtmServerWorkspaceId) {
          await prisma.stapeContainer.update({
            where: { id: stapeContainer.id },
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
  tracking: { name: string; type: string; selector?: string | null; urlPattern?: string | null; config?: unknown },
  cachedTriggers?: Awaited<ReturnType<typeof listTriggers>>
) {
  const triggerConfig: {
    name: string;
    type: string;
    filter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
    customEventFilter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
    parameter?: Array<{ type: string; key: string; value: string }>;
  } = {
    name: `${tracking.name} - Trigger`,
    type: 'CLICK',
  };

  switch (tracking.type) {
    case 'BUTTON_CLICK':
    case 'LINK_CLICK':
    case 'PHONE_CALL_CLICK':
    case 'EMAIL_CLICK':
    case 'SOCIAL_CLICK':
    case 'ADD_TO_CART':
    case 'ADD_TO_WISHLIST':
    case 'CHECKOUT_START':
    case 'CHECKOUT_STEP':
    case 'DOWNLOAD':
    case 'PDF_DOWNLOAD':
    case 'FILE_DOWNLOAD':
    case 'SOCIAL_SHARE':
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
    case 'PRODUCT_VIEW':
    case 'VIEW_CART':
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
    case 'FORM_START':
    case 'FORM_ABANDON':
    case 'SIGNUP':
    case 'NEWSLETTER_SIGNUP':
    case 'DEMO_REQUEST':
      triggerConfig.type = 'FORM_SUBMISSION';
      if (tracking.selector) {
        triggerConfig.filter = [
          {
            type: 'CONTAINS',
            parameter: [
              { type: 'TEMPLATE', key: 'arg0', value: '{{Form Element}}' },
              { type: 'TEMPLATE', key: 'arg1', value: tracking.selector },
            ],
          },
        ];
      }
      break;

    case 'SCROLL_DEPTH': {
      triggerConfig.type = 'SCROLL_DEPTH';
      const config = tracking.config as Record<string, unknown> | null | undefined;
      const scrollPercentage = (config?.scrollPercentage as number) || 50;
      triggerConfig.parameter = [
        { type: 'TEMPLATE', key: 'verticalThresholdsPercent', value: String(scrollPercentage) },
        { type: 'TEMPLATE', key: 'verticalThresholdUnits', value: 'PERCENT' },
        { type: 'TEMPLATE', key: 'verticalThresholdOn', value: 'true' },
        { type: 'TEMPLATE', key: 'horizontalThresholdOn', value: 'false' },
        { type: 'TEMPLATE', key: 'triggerStartOption', value: 'WINDOW_LOAD' },
      ];
      break;
    }

    case 'ELEMENT_VISIBILITY':
      triggerConfig.type = 'ELEMENT_VISIBILITY';
      if (tracking.selector) {
        triggerConfig.parameter = [
          { type: 'TEMPLATE', key: 'elementSelector', value: tracking.selector },
          { type: 'TEMPLATE', key: 'selectorType', value: 'CSS_SELECTOR' },
          { type: 'TEMPLATE', key: 'useOnScreenDuration', value: 'false' },
          { type: 'TEMPLATE', key: 'firingFrequency', value: 'ONCE_PER_PAGE' },
        ];
      }
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

  // Check for existing trigger with the same name (idempotent) — use cached list if available
  const existingTriggers = cachedTriggers || await listTriggers(gtm, accountId, containerId, workspaceId);
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
  transportUrl?: string,
  cachedTags?: Awaited<ReturnType<typeof listTags>>
) {
  if (!measurementId) {
    throw new Error('GA4 Measurement ID is required to create a tracking tag. Please sync GA4 properties first.');
  }

  const tagName = `${tracking.name} - Tag`;

  // Check for existing tag with the same name (idempotent) — use cached list if available
  const existingTags = cachedTags || await listTags(gtm, accountId, containerId, workspaceId);
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
