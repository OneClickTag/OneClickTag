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
  const response = await gtm.accounts.containers.list({
    parent: 'accounts/-',
  });
  return response.data.container || [];
}

export async function getOrCreateWorkspace(
  gtm: tagmanager_v2.Tagmanager,
  containerId: string
): Promise<string> {
  // List existing workspaces
  const workspacesResponse = await gtm.accounts.containers.workspaces.list({
    parent: `accounts/-/containers/${containerId}`,
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
    parent: `accounts/-/containers/${containerId}`,
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
    parent: `accounts/-/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: trigger,
  });
  return response.data;
}

export async function createTag(
  gtm: tagmanager_v2.Tagmanager,
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
    parent: `accounts/-/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: tag,
  });
  return response.data;
}

export async function createVariable(
  gtm: tagmanager_v2.Tagmanager,
  containerId: string,
  workspaceId: string,
  variable: {
    name: string;
    type: string;
    parameter?: Array<{ type: string; key: string; value: string }>;
  }
): Promise<tagmanager_v2.Schema$Variable> {
  const response = await gtm.accounts.containers.workspaces.variables.create({
    parent: `accounts/-/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: variable,
  });
  return response.data;
}

export async function publishWorkspace(
  gtm: tagmanager_v2.Tagmanager,
  containerId: string,
  workspaceId: string
): Promise<void> {
  await gtm.accounts.containers.workspaces.create_version({
    path: `accounts/-/containers/${containerId}/workspaces/${workspaceId}`,
    requestBody: {
      name: `OneClickTag Publish - ${new Date().toISOString()}`,
    },
  });
}

export async function deleteTrigger(
  gtm: tagmanager_v2.Tagmanager,
  containerId: string,
  workspaceId: string,
  triggerId: string
): Promise<void> {
  await gtm.accounts.containers.workspaces.triggers.delete({
    path: `accounts/-/containers/${containerId}/workspaces/${workspaceId}/triggers/${triggerId}`,
  });
}

export async function deleteTag(
  gtm: tagmanager_v2.Tagmanager,
  containerId: string,
  workspaceId: string,
  tagId: string
): Promise<void> {
  await gtm.accounts.containers.workspaces.tags.delete({
    path: `accounts/-/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`,
  });
}
