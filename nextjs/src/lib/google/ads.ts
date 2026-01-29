import { google } from 'googleapis';
import { getOAuth2ClientWithTokens } from './oauth';

const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

export async function getGoogleAdsClient(userId: string, tenantId: string) {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ads');
  if (!oauth2Client) {
    throw new Error('No Google Ads OAuth token found');
  }

  // Note: Google Ads API requires special client setup
  // For now, we'll return the auth client for manual API calls
  return oauth2Client;
}

export interface GoogleAdsAccount {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
}

export async function listAccessibleAccounts(
  userId: string,
  tenantId: string
): Promise<GoogleAdsAccount[]> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ads');
  if (!oauth2Client) {
    throw new Error('No Google Ads OAuth token found');
  }

  const credentials = await oauth2Client.getAccessToken();

  // Use REST API to list accessible customers
  const response = await fetch(
    'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
    {
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list accounts: ${response.statusText}`);
  }

  const data = await response.json();
  const resourceNames = data.resourceNames || [];

  // Get details for each account
  const accounts: GoogleAdsAccount[] = [];
  for (const resourceName of resourceNames) {
    const customerId = resourceName.replace('customers/', '');
    try {
      const accountDetails = await getAccountDetails(
        credentials.token!,
        customerId
      );
      if (accountDetails) {
        accounts.push(accountDetails);
      }
    } catch (error) {
      console.error(`Failed to get details for account ${customerId}:`, error);
    }
  }

  return accounts;
}

async function getAccountDetails(
  accessToken: string,
  customerId: string
): Promise<GoogleAdsAccount | null> {
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone
    FROM customer
    LIMIT 1
  `;

  const response = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const results = data[0]?.results;

  if (!results || results.length === 0) {
    return null;
  }

  const customer = results[0].customer;
  return {
    customerId: customer.id,
    descriptiveName: customer.descriptiveName || `Account ${customer.id}`,
    currencyCode: customer.currencyCode || 'USD',
    timeZone: customer.timeZone || 'America/Los_Angeles',
  };
}

export interface ConversionActionInput {
  name: string;
  category: string;
  type: string;
  valueSettings?: {
    defaultValue?: number;
    defaultCurrencyCode?: string;
  };
}

export async function createConversionAction(
  userId: string,
  tenantId: string,
  customerId: string,
  input: ConversionActionInput
): Promise<{ conversionActionId: string; conversionLabel: string }> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ads');
  if (!oauth2Client) {
    throw new Error('No Google Ads OAuth token found');
  }

  const credentials = await oauth2Client.getAccessToken();

  const operations = [
    {
      create: {
        name: input.name,
        category: input.category,
        type: input.type,
        status: 'ENABLED',
        ...(input.valueSettings && {
          valueSettings: {
            defaultValue: input.valueSettings.defaultValue,
            defaultCurrencyCode: input.valueSettings.defaultCurrencyCode || 'USD',
            alwaysUseDefaultValue: false,
          },
        }),
      },
    },
  ];

  const response = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/conversionActions:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operations }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create conversion action: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const resourceName = data.results[0].resourceName;
  const conversionActionId = resourceName.split('/').pop();

  // Get the conversion label (tag snippet)
  const conversionLabel = await getConversionLabel(
    credentials.token!,
    customerId,
    conversionActionId
  );

  return {
    conversionActionId,
    conversionLabel,
  };
}

async function getConversionLabel(
  accessToken: string,
  customerId: string,
  conversionActionId: string
): Promise<string> {
  const query = `
    SELECT
      conversion_action.tag_snippets
    FROM conversion_action
    WHERE conversion_action.id = ${conversionActionId}
  `;

  const response = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    return '';
  }

  const data = await response.json();
  const tagSnippets = data[0]?.results?.[0]?.conversionAction?.tagSnippets;

  if (tagSnippets && tagSnippets.length > 0) {
    // Extract conversion label from gtag snippet
    const gtagSnippet = tagSnippets.find((s: { type: string }) => s.type === 'WEBPAGE');
    if (gtagSnippet) {
      const match = gtagSnippet.eventSnippet?.match(/send_to.*?'(AW-[^']+)'/);
      if (match) {
        return match[1];
      }
    }
  }

  return '';
}
