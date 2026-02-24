import { google } from 'googleapis';
import { getOAuth2ClientWithTokens } from './oauth';
import prisma from '@/lib/prisma';

export interface GA4PropertyInfo {
  propertyId: string;
  propertyName: string;
  displayName: string;
  websiteUrl?: string;
  timeZone?: string;
  currency?: string;
  industryCategory?: string;
  measurementId?: string;
}

export async function listGA4Properties(
  userId: string,
  tenantId: string
): Promise<GA4PropertyInfo[]> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ga4');
  if (!oauth2Client) {
    throw new Error('No GA4 OAuth token found');
  }

  const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

  // List all accounts first
  const accountsResponse = await analyticsAdmin.accounts.list();
  const accounts = accountsResponse.data.accounts || [];

  if (accounts.length === 0) {
    return [];
  }

  // Parallelize property fetches across accounts
  const accountResults = await Promise.allSettled(
    accounts.filter(account => account.name).map(async (account) => {
      const propertiesResponse = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`,
      });

      const accountProperties = propertiesResponse.data.properties || [];

      // Parallelize data stream fetches across properties
      const propertyResults = await Promise.allSettled(
        accountProperties.filter(p => p.name).map(async (property) => {
          const propertyId = property.name!.replace('properties/', '');

          let measurementId: string | undefined;
          try {
            const streamsResponse = await analyticsAdmin.properties.dataStreams.list({
              parent: property.name!,
            });
            const webStream = (streamsResponse.data.dataStreams || []).find(
              (s) => s.type === 'WEB_DATA_STREAM'
            );
            if (webStream?.webStreamData?.measurementId) {
              measurementId = webStream.webStreamData.measurementId;
            }
          } catch {
            // Ignore stream fetch errors
          }

          return {
            propertyId,
            propertyName: property.displayName || `Property ${propertyId}`,
            displayName: property.displayName || '',
            websiteUrl: undefined,
            timeZone: property.timeZone || undefined,
            currency: property.currencyCode || undefined,
            industryCategory: property.industryCategory || undefined,
            ...(measurementId && { measurementId }),
          } as GA4PropertyInfo;
        })
      );

      return propertyResults
        .filter((r): r is PromiseFulfilledResult<GA4PropertyInfo> => r.status === 'fulfilled')
        .map(r => r.value);
    })
  );

  return accountResults
    .filter((r): r is PromiseFulfilledResult<GA4PropertyInfo[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

/**
 * Create a new GA4 property in an Analytics account.
 */
export async function createGA4Property(
  userId: string,
  tenantId: string,
  accountId: string,
  displayName: string
): Promise<{ propertyId: string }> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ga4');
  if (!oauth2Client) {
    throw new Error('No GA4 OAuth token found');
  }

  const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

  const response = await analyticsAdmin.properties.create({
    requestBody: {
      parent: accountId, // e.g. "accounts/123456"
      displayName,
      timeZone: 'America/Los_Angeles',
      currencyCode: 'USD',
    },
  });

  const propertyName = response.data.name; // e.g. "properties/123456789"
  if (!propertyName) {
    throw new Error('Failed to create GA4 property — no name returned');
  }

  const propertyId = propertyName.replace('properties/', '');
  return { propertyId };
}

/**
 * Create a web data stream for a GA4 property.
 */
export async function createDataStream(
  userId: string,
  tenantId: string,
  propertyId: string,
  websiteUrl: string,
  displayName: string
): Promise<{ streamId: string; measurementId: string }> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ga4');
  if (!oauth2Client) {
    throw new Error('No GA4 OAuth token found');
  }

  const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });

  // Normalize URL: ensure it has a scheme
  let normalizedUrl = websiteUrl;
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const response = await analyticsAdmin.properties.dataStreams.create({
    parent: `properties/${propertyId}`,
    requestBody: {
      type: 'WEB_DATA_STREAM',
      displayName,
      webStreamData: {
        defaultUri: normalizedUrl,
      },
    },
  });

  const streamName = response.data.name;
  const measurementId = response.data.webStreamData?.measurementId;

  if (!streamName || !measurementId) {
    throw new Error('Failed to create data stream — missing stream name or measurement ID');
  }

  const streamId = streamName.split('/').pop()!;
  return { streamId, measurementId };
}

/**
 * Idempotent: get or create the tenant-level OneClickTag GA4 property.
 * 1. Check if tenant already has octGa4PropertyId → return it
 * 2. List properties, check if one named "OneClickTag - {tenantName}" exists → store & return
 * 3. List Analytics accounts → create property in first account → store on Tenant → return
 */
export async function getOrCreateOctProperty(
  userId: string,
  tenantId: string
): Promise<{ propertyId: string; accountId: string }> {
  // Step 1: Check if tenant already has the property stored
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { octGa4AccountId: true, octGa4PropertyId: true, name: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.octGa4AccountId && tenant.octGa4PropertyId) {
    return {
      propertyId: tenant.octGa4PropertyId,
      accountId: tenant.octGa4AccountId,
    };
  }

  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ga4');
  if (!oauth2Client) {
    throw new Error('No GA4 OAuth token found');
  }

  const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
  const propertyName = `OneClickTag - ${tenant.name}`;

  // Step 2: List accounts and search for existing property
  const accountsResponse = await analyticsAdmin.accounts.list();
  const accounts = accountsResponse.data.accounts || [];

  if (accounts.length === 0) {
    throw new Error('No Google Analytics accounts found. User must have at least one Analytics account.');
  }

  for (const account of accounts) {
    if (!account.name) continue;
    try {
      const propertiesResponse = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`,
      });
      const properties = propertiesResponse.data.properties || [];
      const existing = properties.find((p) => p.displayName === propertyName);
      if (existing && existing.name) {
        const existingPropertyId = existing.name.replace('properties/', '');
        const accountId = account.name; // e.g. "accounts/123456"
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            octGa4AccountId: accountId,
            octGa4PropertyId: existingPropertyId,
          },
        });
        console.log(`[GA4] Found existing OCT property "${propertyName}" (${existingPropertyId})`);
        return { propertyId: existingPropertyId, accountId };
      }
    } catch (error) {
      console.warn(`[GA4] Failed to list properties for account ${account.name}:`, error);
    }
  }

  // Step 3: Create new property in the first account
  const targetAccount = accounts[0].name!; // e.g. "accounts/123456"
  const { propertyId } = await createGA4Property(userId, tenantId, targetAccount, propertyName);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      octGa4AccountId: targetAccount,
      octGa4PropertyId: propertyId,
    },
  });

  console.log(`[GA4] Created OCT property "${propertyName}" (${propertyId})`);
  return { propertyId, accountId: targetAccount };
}
