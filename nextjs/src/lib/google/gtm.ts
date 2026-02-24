import { google, tagmanager_v2 } from 'googleapis';
import { getOAuth2ClientWithTokens } from './oauth';
import prisma from '@/lib/prisma';

const ONECLICKTAG_WORKSPACE_NAME = 'OneClickTag';

export async function getGTMClient(userId: string, tenantId: string) {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'gtm');
  if (!oauth2Client) {
    throw new Error('No GTM OAuth token found');
  }
  return google.tagmanager({ version: 'v2', auth: oauth2Client });
}

export async function listContainers(userId: string, tenantId: string) {
  const gtm = await getGTMClient(userId, tenantId);

  // First list all GTM accounts
  const accountsResponse = await gtm.accounts.list();
  const accounts = accountsResponse.data.account || [];

  if (accounts.length === 0) {
    return [];
  }

  // List containers for each account
  const allContainers: tagmanager_v2.Schema$Container[] = [];
  for (const account of accounts) {
    if (!account.accountId) continue;
    try {
      const response = await gtm.accounts.containers.list({
        parent: `accounts/${account.accountId}`,
      });
      const containers = response.data.container || [];
      allContainers.push(...containers);
    } catch (error) {
      console.warn(`Failed to list containers for account ${account.accountId}:`, error);
    }
  }

  return allContainers;
}

export async function getOrCreateWorkspace(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceName: string = ONECLICKTAG_WORKSPACE_NAME
): Promise<string> {
  const containerPath = `accounts/${accountId}/containers/${containerId}`;

  // List existing workspaces
  const workspacesResponse = await gtm.accounts.containers.workspaces.list({
    parent: containerPath,
  });

  const workspaces = workspacesResponse.data.workspace || [];

  // Find existing workspace by name
  const existingWorkspace = workspaces.find(
    (ws) => ws.name === workspaceName
  );

  if (existingWorkspace && existingWorkspace.workspaceId) {
    return existingWorkspace.workspaceId;
  }

  // Create new workspace
  const newWorkspace = await gtm.accounts.containers.workspaces.create({
    parent: containerPath,
    requestBody: {
      name: workspaceName,
      description: 'Workspace managed by OneClickTag - do not edit manually',
    },
  });

  if (!newWorkspace.data.workspaceId) {
    throw new Error('Failed to create workspace');
  }

  return newWorkspace.data.workspaceId;
}

export async function createTrigger(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  trigger: {
    name: string;
    type: string;
    filter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
    customEventFilter?: Array<{ type: string; parameter: Array<{ type: string; key: string; value: string }> }>;
  }
): Promise<tagmanager_v2.Schema$Trigger> {
  const response = await gtm.accounts.containers.workspaces.triggers.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: trigger,
  });
  return response.data;
}

export async function createTag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: {
    name: string;
    type: string;
    parameter?: Array<{ type: string; key: string; value?: string; list?: Array<{ type: string; map: Array<{ type: string; key: string; value: string }> }> }>;
    firingTriggerId: string[];
  }
): Promise<tagmanager_v2.Schema$Tag> {
  const response = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: tag,
  });
  return response.data;
}

export async function createVariable(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  variable: {
    name: string;
    type: string;
    parameter?: Array<{ type: string; key: string; value: string }>;
  }
): Promise<tagmanager_v2.Schema$Variable> {
  const response = await gtm.accounts.containers.workspaces.variables.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: variable,
  });
  return response.data;
}

/**
 * Enable built-in variables in a workspace.
 * These are required for triggers to reference {{Click Element}}, {{Page URL}}, etc.
 */
export async function enableBuiltInVariables(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<void> {
  const workspacePath = `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

  // Check which are already enabled
  let alreadyEnabled: string[] = [];
  try {
    const listResponse = await gtm.accounts.containers.workspaces.built_in_variables.list({
      parent: workspacePath,
    });
    alreadyEnabled = (listResponse.data.builtInVariable || [])
      .map((v) => v.type)
      .filter((t): t is string => !!t);
  } catch {
    // If listing fails (e.g. none enabled yet), continue with empty list
  }

  // All the built-in variable types needed for OneClickTag tracking
  const requiredTypes = [
    // Click tracking
    'CLICK_ELEMENT', 'CLICK_CLASSES', 'CLICK_ID', 'CLICK_URL', 'CLICK_TEXT', 'CLICK_TARGET',
    // Page tracking
    'PAGE_URL', 'PAGE_HOSTNAME', 'PAGE_PATH', 'REFERRER',
    // Form tracking
    'FORM_ELEMENT', 'FORM_ID', 'FORM_CLASSES', 'FORM_URL', 'FORM_TEXT', 'FORM_TARGET',
    // Scroll tracking
    'SCROLL_DEPTH_THRESHOLD', 'SCROLL_DEPTH_UNITS', 'SCROLL_DEPTH_DIRECTION',
    // Event
    'EVENT',
  ];

  const toEnable = requiredTypes.filter((t) => !alreadyEnabled.includes(t));

  if (toEnable.length === 0) {
    console.log('[GTM] All required built-in variables already enabled');
    return;
  }

  await gtm.accounts.containers.workspaces.built_in_variables.create({
    parent: workspacePath,
    type: toEnable,
  });

  console.log(`[GTM] Enabled ${toEnable.length} built-in variables`);
}

/**
 * List user-defined variables in a workspace.
 */
export async function listVariables(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<tagmanager_v2.Schema$Variable[]> {
  const response = await gtm.accounts.containers.workspaces.variables.list({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
  });
  return response.data.variable || [];
}

/**
 * Set up all essential GTM workspace components needed for tracking.
 * This is idempotent — safe to call multiple times.
 *
 * Creates:
 * 1. Enables built-in variables (Click, Page, Form, Scroll, Event)
 * 2. "All Pages" trigger (pageview on all pages)
 * 3. "Conversion Linker" tag (Google Ads attribution — fires on All Pages)
 * 4. "Page Title" custom variable (reads document.title)
 */
export async function setupWorkspaceEssentials(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<{ allPagesTriggerIds: string[] }> {
  // 1. Enable built-in variables
  try {
    await enableBuiltInVariables(gtm, accountId, containerId, workspaceId);
  } catch (error) {
    console.warn('[GTM] Failed to enable built-in variables (non-blocking):', error);
  }

  // 2. Get or create "All Pages" trigger
  const existingTriggers = await listTriggers(gtm, accountId, containerId, workspaceId);
  let allPagesTrigger = existingTriggers.find(
    (t) => t.name === 'All Pages' || t.name === 'All Pages - OneClickTag'
  );

  if (!allPagesTrigger) {
    allPagesTrigger = await createTrigger(gtm, accountId, containerId, workspaceId, {
      name: 'All Pages - OneClickTag',
      type: 'PAGEVIEW',
    });
    console.log(`[GTM] Created "All Pages - OneClickTag" trigger (${allPagesTrigger.triggerId})`);
  } else {
    console.log(`[GTM] Found existing All Pages trigger (${allPagesTrigger.triggerId})`);
  }

  const allPagesTriggerIds = allPagesTrigger.triggerId ? [allPagesTrigger.triggerId] : [];

  // 3. Get or create "Conversion Linker" tag
  const existingTags = await listTags(gtm, accountId, containerId, workspaceId);
  const conversionLinker = existingTags.find(
    (t) => t.type === 'gclidw' || t.name === 'Conversion Linker' || t.name === 'Conversion Linker - OneClickTag'
  );

  if (!conversionLinker) {
    if (allPagesTriggerIds.length > 0) {
      const tag = await createTag(gtm, accountId, containerId, workspaceId, {
        name: 'Conversion Linker - OneClickTag',
        type: 'gclidw',
        firingTriggerId: allPagesTriggerIds,
      });
      console.log(`[GTM] Created "Conversion Linker - OneClickTag" tag (${tag.tagId})`);
    } else {
      console.warn('[GTM] Cannot create Conversion Linker — no All Pages trigger ID');
    }
  } else {
    console.log(`[GTM] Found existing Conversion Linker tag (${conversionLinker.tagId})`);
  }

  // 4. Get or create "Page Title" custom variable
  try {
    const existingVars = await listVariables(gtm, accountId, containerId, workspaceId);
    const pageTitleVar = existingVars.find(
      (v) => v.name === 'Page Title' || v.name === 'Page Title - OneClickTag'
    );

    if (!pageTitleVar) {
      const variable = await createVariable(gtm, accountId, containerId, workspaceId, {
        name: 'Page Title - OneClickTag',
        type: 'jsm',
        parameter: [
          { type: 'TEMPLATE', key: 'javascript', value: 'function(){return document.title;}' },
        ],
      });
      console.log(`[GTM] Created "Page Title - OneClickTag" variable (${variable.variableId})`);
    } else {
      console.log(`[GTM] Found existing Page Title variable (${pageTitleVar.variableId})`);
    }
  } catch (error) {
    console.warn('[GTM] Failed to create Page Title variable (non-blocking):', error);
  }

  return { allPagesTriggerIds };
}

export async function listTriggers(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<tagmanager_v2.Schema$Trigger[]> {
  const response = await gtm.accounts.containers.workspaces.triggers.list({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
  });
  return response.data.trigger || [];
}

export async function listTags(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<tagmanager_v2.Schema$Tag[]> {
  const response = await gtm.accounts.containers.workspaces.tags.list({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
  });
  return response.data.tag || [];
}

export async function publishWorkspace(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<void> {
  await gtm.accounts.containers.workspaces.create_version({
    path: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: `OneClickTag Publish - ${new Date().toISOString()}`,
    },
  });
}

export async function deleteTrigger(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  triggerId: string
): Promise<void> {
  await gtm.accounts.containers.workspaces.triggers.delete({
    path: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`,
  });
}

export async function deleteTag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string
): Promise<void> {
  await gtm.accounts.containers.workspaces.tags.delete({
    path: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`,
  });
}

/**
 * Create a GA4 Client in a server-side GTM container.
 * This client receives incoming GA4 requests from the web container.
 */
export async function createGA4Client(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string
): Promise<tagmanager_v2.Schema$Client> {
  // Check for existing GA4 Client (idempotent)
  const listResponse = await gtm.accounts.containers.workspaces.clients.list({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
  });
  const existing = listResponse.data.client?.find(
    (c) => c.type === 'gaaw' && c.name === 'GA4 Client'
  );
  if (existing) {
    console.log(`[GTM] Found existing GA4 Client (${existing.clientId})`);
    return existing;
  }

  const response = await gtm.accounts.containers.workspaces.clients.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: 'GA4 Client',
      type: 'gaaw',
    },
  });
  return response.data;
}

/**
 * Create a server-side GA4 Event tag.
 * This tag forwards events received by the server container to GA4.
 */
export async function createServerGA4Tag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: {
    name: string;
    measurementId: string;
    firingTriggerId: string[];
  }
): Promise<tagmanager_v2.Schema$Tag> {
  const response = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: tag.name,
      type: 'sgtmgaaw',
      parameter: [
        {
          type: 'TEMPLATE',
          key: 'measurementId',
          value: tag.measurementId,
        },
      ],
      firingTriggerId: tag.firingTriggerId,
    },
  });
  return response.data;
}

/**
 * Create a client-side Google Ads Conversion Tracking tag (awct).
 * This fires on the web container to send conversion data to Google Ads.
 */
export async function createClientAdsConversionTag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: {
    name: string;
    conversionId: string;
    conversionLabel: string;
    conversionValue?: number;
    firingTriggerId: string[];
  }
): Promise<tagmanager_v2.Schema$Tag> {
  const parameters: Array<{ type: string; key: string; value: string }> = [
    { type: 'TEMPLATE', key: 'conversionId', value: tag.conversionId },
    { type: 'TEMPLATE', key: 'conversionLabel', value: tag.conversionLabel },
  ];

  if (tag.conversionValue !== undefined && tag.conversionValue !== null) {
    parameters.push({
      type: 'TEMPLATE',
      key: 'conversionValue',
      value: String(tag.conversionValue),
    });
  }

  const response = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: tag.name,
      type: 'awct',
      parameter: parameters,
      firingTriggerId: tag.firingTriggerId,
    },
  });
  return response.data;
}

/**
 * Create a server-side Google Ads Conversion tag.
 */
export async function createServerAdsConversionTag(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: {
    name: string;
    conversionId: string;
    conversionLabel: string;
    firingTriggerId: string[];
  }
): Promise<tagmanager_v2.Schema$Tag> {
  const response = await gtm.accounts.containers.workspaces.tags.create({
    parent: `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: tag.name,
      type: 'sgtmgacn',
      parameter: [
        { type: 'TEMPLATE', key: 'conversionId', value: tag.conversionId },
        { type: 'TEMPLATE', key: 'conversionLabel', value: tag.conversionLabel },
      ],
      firingTriggerId: tag.firingTriggerId,
    },
  });
  return response.data;
}

/**
 * Create a new web container in a GTM account.
 */
export async function createContainer(
  gtm: tagmanager_v2.Tagmanager,
  accountId: string,
  name: string
): Promise<tagmanager_v2.Schema$Container> {
  const response = await gtm.accounts.containers.create({
    parent: `accounts/${accountId}`,
    requestBody: {
      name,
      usageContext: ['web'],
    },
  });
  return response.data;
}

/**
 * Discover the user's GTM account ID and cache it on the tenant.
 * Uses tenant.octGtmAccountId if already cached, otherwise calls accounts.list().
 */
export async function discoverGtmAccountId(
  userId: string,
  tenantId: string
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { octGtmAccountId: true },
  });

  if (tenant?.octGtmAccountId) {
    return tenant.octGtmAccountId;
  }

  const gtm = await getGTMClient(userId, tenantId);
  const accountsResponse = await gtm.accounts.list();
  const accounts = accountsResponse.data.account || [];

  if (accounts.length === 0) {
    throw new Error('No GTM accounts found. User must have at least one GTM account.');
  }

  const accountId = accounts[0].accountId!;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { octGtmAccountId: accountId },
  });

  console.log(`[GTM] Discovered and cached GTM account ${accountId} on tenant`);
  return accountId;
}

/**
 * Idempotent: get or create a per-customer GTM container.
 * Container is named "OneClickTag - {customerName}".
 *
 * 1. Check if customer already has gtmAccountId + gtmContainerId → return early
 * 2. Discover GTM account (cached on tenant)
 * 3. List containers, search for matching name
 * 4. If found → store on customer, return
 * 5. If not found → create → store on customer, return
 */
export async function getOrCreateCustomerContainer(
  userId: string,
  tenantId: string,
  customerId: string
): Promise<{ accountId: string; containerId: string; publicId: string }> {
  // Step 1: Check if customer already has the container stored
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { gtmAccountId: true, gtmContainerId: true, gtmContainerName: true, fullName: true },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  if (customer.gtmAccountId && customer.gtmContainerId && customer.gtmContainerName) {
    return {
      accountId: customer.gtmAccountId,
      containerId: customer.gtmContainerId,
      publicId: customer.gtmContainerName,
    };
  }

  // Step 2: Discover GTM account (cached on tenant)
  const accountId = await discoverGtmAccountId(userId, tenantId);

  const gtm = await getGTMClient(userId, tenantId);
  const containerName = `OneClickTag - ${customer.fullName}`;

  // Step 3: List containers in that account, search for matching name
  const containersResponse = await gtm.accounts.containers.list({
    parent: `accounts/${accountId}`,
  });
  const containers = containersResponse.data.container || [];
  const existing = containers.find((c) => c.name === containerName);

  if (existing && existing.containerId && existing.publicId) {
    // Step 4: Found existing → store on customer
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        gtmAccountId: accountId,
        gtmContainerId: existing.containerId,
        gtmContainerName: existing.publicId,
      },
    });
    console.log(`[GTM] Found existing customer container "${containerName}" (${existing.publicId})`);
    return {
      accountId,
      containerId: existing.containerId,
      publicId: existing.publicId,
    };
  }

  // Step 5: Create new container
  const newContainer = await createContainer(gtm, accountId, containerName);

  if (!newContainer.containerId || !newContainer.publicId) {
    throw new Error('Failed to create GTM container — missing containerId or publicId');
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      gtmAccountId: accountId,
      gtmContainerId: newContainer.containerId,
      gtmContainerName: newContainer.publicId,
    },
  });

  console.log(`[GTM] Created customer container "${containerName}" (${newContainer.publicId})`);
  return {
    accountId,
    containerId: newContainer.containerId,
    publicId: newContainer.publicId,
  };
}

/**
 * @deprecated Use getOrCreateCustomerContainer() instead.
 * Idempotent: get or create the tenant-level OneClickTag GTM container.
 * 1. Check if tenant already has octGtmContainerId → return it
 * 2. List containers, check if one named "OneClickTag - {tenantName}" exists → store & return
 * 3. Create new container → store IDs on Tenant → return
 */
export async function getOrCreateOctContainer(
  userId: string,
  tenantId: string
): Promise<{ accountId: string; containerId: string; publicId: string }> {
  // Step 1: Check if tenant already has the container stored
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { octGtmAccountId: true, octGtmContainerId: true, octGtmPublicId: true, name: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.octGtmAccountId && tenant.octGtmContainerId && tenant.octGtmPublicId) {
    return {
      accountId: tenant.octGtmAccountId,
      containerId: tenant.octGtmContainerId,
      publicId: tenant.octGtmPublicId,
    };
  }

  const gtm = await getGTMClient(userId, tenantId);
  const containerName = `OneClickTag - ${tenant.name}`;

  // Step 2: List all accounts and containers to find existing
  const accountsResponse = await gtm.accounts.list();
  const accounts = accountsResponse.data.account || [];

  if (accounts.length === 0) {
    throw new Error('No GTM accounts found. User must have at least one GTM account.');
  }

  for (const account of accounts) {
    if (!account.accountId) continue;
    try {
      const containersResponse = await gtm.accounts.containers.list({
        parent: `accounts/${account.accountId}`,
      });
      const containers = containersResponse.data.container || [];
      const existing = containers.find((c) => c.name === containerName);
      if (existing && existing.containerId && existing.publicId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            octGtmAccountId: account.accountId,
            octGtmContainerId: existing.containerId,
            octGtmPublicId: existing.publicId,
          },
        });
        console.log(`[GTM] Found existing OCT container "${containerName}" (${existing.publicId})`);
        return {
          accountId: account.accountId,
          containerId: existing.containerId,
          publicId: existing.publicId,
        };
      }
    } catch (error) {
      console.warn(`[GTM] Failed to list containers for account ${account.accountId}:`, error);
    }
  }

  // Step 3: Create new container in the first account
  const targetAccountId = accounts[0].accountId!;
  const newContainer = await createContainer(gtm, targetAccountId, containerName);

  if (!newContainer.containerId || !newContainer.publicId) {
    throw new Error('Failed to create GTM container — missing containerId or publicId');
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      octGtmAccountId: targetAccountId,
      octGtmContainerId: newContainer.containerId,
      octGtmPublicId: newContainer.publicId,
    },
  });

  console.log(`[GTM] Created OCT container "${containerName}" (${newContainer.publicId})`);
  return {
    accountId: targetAccountId,
    containerId: newContainer.containerId,
    publicId: newContainer.publicId,
  };
}
