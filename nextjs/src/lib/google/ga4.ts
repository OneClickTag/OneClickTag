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

  const properties: GA4PropertyInfo[] = [];

  for (const account of accounts) {
    if (!account.name) continue;

    try {
      const propertiesResponse = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`,
      });

      const accountProperties = propertiesResponse.data.properties || [];

      for (const property of accountProperties) {
        if (!property.name) continue;

        // Extract property ID from resource name (e.g., "properties/123456789")
        const propertyId = property.name.replace('properties/', '');

        // Try to get data streams to find measurement ID
        let measurementId: string | undefined;
        try {
          const streamsResponse = await analyticsAdmin.properties.dataStreams.list({
            parent: property.name,
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

        properties.push({
          propertyId,
          propertyName: property.displayName || `Property ${propertyId}`,
          displayName: property.displayName || '',
          websiteUrl: undefined, // Not available in v1beta property listing
          timeZone: property.timeZone || undefined,
          currency: property.currencyCode || undefined,
          industryCategory: property.industryCategory || undefined,
          ...(measurementId && { measurementId }),
        });
      }
    } catch (error) {
      console.warn(`Failed to list properties for account ${account.name}:`, error);
    }
  }

  return properties;
}
