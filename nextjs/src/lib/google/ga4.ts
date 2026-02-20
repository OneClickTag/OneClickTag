import { google } from 'googleapis';
import { getOAuth2ClientWithTokens } from './oauth';

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
