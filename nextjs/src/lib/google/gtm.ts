import { google, tagmanager_v2 } from 'googleapis';
import { getOAuth2ClientWithTokens } from './oauth';

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
  containerId: string
): Promise<string> {
  const containerPath = `accounts/${accountId}/containers/${containerId}`;

  // List existing workspaces
  const workspacesResponse = await gtm.accounts.containers.workspaces.list({
    parent: containerPath,
  });

  const workspaces = workspacesResponse.data.workspace || [];

  // Find existing OneClickTag workspace
  const existingWorkspace = workspaces.find(
    (ws) => ws.name === ONECLICKTAG_WORKSPACE_NAME
  );

  if (existingWorkspace && existingWorkspace.workspaceId) {
    return existingWorkspace.workspaceId;
  }

  // Create new workspace
  const newWorkspace = await gtm.accounts.containers.workspaces.create({
    parent: containerPath,
    requestBody: {
      name: ONECLICKTAG_WORKSPACE_NAME,
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
