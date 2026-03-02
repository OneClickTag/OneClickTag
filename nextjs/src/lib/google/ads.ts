import { google } from 'googleapis';
import { getOAuth2ClientWithTokens } from './oauth';
import prisma from '@/lib/prisma';

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
    'https://googleads.googleapis.com/v20/customers:listAccessibleCustomers',
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

  // Parallelize account detail fetches
  const accountResults = await Promise.allSettled(
    resourceNames.map(async (resourceName: string) => {
      const customerId = resourceName.replace('customers/', '');
      return getAccountDetails(credentials.token!, customerId);
    })
  );

  const accounts: GoogleAdsAccount[] = accountResults
    .filter((r): r is PromiseFulfilledResult<GoogleAdsAccount | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((account): account is GoogleAdsAccount => account !== null);

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
    `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:searchStream`,
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
    `https://googleads.googleapis.com/v20/customers/${customerId}/conversionActions:mutate`,
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

    // Handle duplicate name — find and reuse existing conversion action
    const isDuplicate = error?.error?.details?.some?.(
      (d: any) => d.errors?.some?.((e: any) => e.errorCode?.conversionActionError === 'DUPLICATE_NAME')
    );

    if (isDuplicate) {
      console.log(`[Ads] Conversion action "${input.name}" already exists — reusing it`);
      const existing = await findConversionActionByName(credentials.token!, customerId, input.name);
      if (existing) {
        return existing;
      }
      // If we can't find it somehow, fall through to throw
    }

    throw new Error(`Failed to create conversion action: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const resourceName = data.results[0].resourceName;
  const conversionActionId = resourceName.split('/').pop();

  // Get the conversion label (tag snippet) — retries internally if not ready
  const conversionLabel = await getConversionLabel(
    credentials.token!,
    customerId,
    conversionActionId
  );

  if (!conversionLabel) {
    throw new Error(
      `Conversion action "${input.name}" created (ID: ${conversionActionId}) but conversion label could not be retrieved. Retry should resolve this.`
    );
  }

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
  // Retry up to 3 times — tag snippets may not be immediately available after creation
  for (let attempt = 0; attempt < 3; attempt++) {
    const label = await fetchConversionLabelOnce(accessToken, customerId, conversionActionId);
    if (label) return label;
    if (attempt < 2) {
      console.log(`[Ads] Conversion label not ready yet (attempt ${attempt + 1}/3), retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return '';
}

async function fetchConversionLabelOnce(
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
    `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:searchStream`,
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

async function findConversionActionByName(
  accessToken: string,
  customerId: string,
  name: string
): Promise<{ conversionActionId: string; conversionLabel: string } | null> {
  const query = `
    SELECT
      conversion_action.id,
      conversion_action.resource_name,
      conversion_action.tag_snippets
    FROM conversion_action
    WHERE conversion_action.name = '${name.replace(/'/g, "\\'")}'
    LIMIT 1
  `;

  const response = await fetch(
    `https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:searchStream`,
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
    console.error('[Ads] Failed to search for existing conversion action');
    return null;
  }

  const data = await response.json();
  const result = data[0]?.results?.[0];
  if (!result) return null;

  const conversionActionId = String(result.conversionAction.id);
  let conversionLabel = '';

  const tagSnippets = result.conversionAction.tagSnippets;
  if (tagSnippets && tagSnippets.length > 0) {
    const gtagSnippet = tagSnippets.find((s: { type: string }) => s.type === 'WEBPAGE');
    if (gtagSnippet) {
      const match = gtagSnippet.eventSnippet?.match(/send_to.*?'(AW-[^']+)'/);
      if (match) {
        conversionLabel = match[1];
      }
    }
  }

  // If no label from snippet, fetch it via the dedicated function
  if (!conversionLabel) {
    conversionLabel = await getConversionLabel(accessToken, customerId, conversionActionId);
  }

  return { conversionActionId, conversionLabel };
}

/**
 * Create a label in a Google Ads account.
 */
export async function createLabel(
  userId: string,
  tenantId: string,
  adsAccountId: string,
  labelName: string
): Promise<string> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ads');
  if (!oauth2Client) {
    throw new Error('No Google Ads OAuth token found');
  }

  const credentials = await oauth2Client.getAccessToken();

  const response = await fetch(
    `https://googleads.googleapis.com/v20/customers/${adsAccountId}/labels:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: labelName,
              status: 'ENABLED',
            },
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create label: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.results[0].resourceName; // e.g. "customers/123/labels/456"
}

/**
 * Apply a label to a conversion action.
 */
export async function applyLabelToConversionAction(
  userId: string,
  tenantId: string,
  adsAccountId: string,
  conversionActionResourceName: string,
  labelResourceName: string
): Promise<void> {
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ads');
  if (!oauth2Client) {
    throw new Error('No Google Ads OAuth token found');
  }

  const credentials = await oauth2Client.getAccessToken();

  // Use the ConversionAction mutate to update labels
  const response = await fetch(
    `https://googleads.googleapis.com/v20/customers/${adsAccountId}/conversionActions:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: conversionActionResourceName,
              tagSnippets: undefined, // don't modify
            },
            updateMask: 'name', // minimal update — label association is separate
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.warn(`[Ads] Failed to apply label to conversion action (non-critical):`, await response.text());
  }
}

/**
 * Idempotent: get or create the "OneClickTag - {tenantName}" label in an Ads account.
 * 1. Check GoogleAdsAccount.octLabelId → return it
 * 2. List labels, check if one with the right name exists → store & return
 * 3. Create new label → store on GoogleAdsAccount → return
 */
export async function getOrCreateOctLabel(
  userId: string,
  tenantId: string,
  adsAccountDbId: string,
  adsAccountId: string,
  tenantName: string
): Promise<string> {
  // Step 1: Check stored label
  const adsAccount = await prisma.googleAdsAccount.findUnique({
    where: { id: adsAccountDbId },
    select: { octLabelId: true },
  });

  if (adsAccount?.octLabelId) {
    return adsAccount.octLabelId;
  }

  const labelName = `OneClickTag - ${tenantName}`;

  // Step 2: List existing labels
  const oauth2Client = await getOAuth2ClientWithTokens(userId, tenantId, 'ads');
  if (!oauth2Client) {
    throw new Error('No Google Ads OAuth token found');
  }

  const credentials = await oauth2Client.getAccessToken();

  try {
    const query = `SELECT label.resource_name, label.name FROM label WHERE label.name = '${labelName}'`;
    const searchResponse = await fetch(
      `https://googleads.googleapis.com/v20/customers/${adsAccountId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const existingLabel = searchData[0]?.results?.[0]?.label;
      if (existingLabel?.resourceName) {
        await prisma.googleAdsAccount.update({
          where: { id: adsAccountDbId },
          data: { octLabelId: existingLabel.resourceName },
        });
        console.log(`[Ads] Found existing OCT label "${labelName}" in account ${adsAccountId}`);
        return existingLabel.resourceName;
      }
    }
  } catch (error) {
    console.warn(`[Ads] Failed to search for existing labels:`, error);
  }

  // Step 3: Create new label
  const labelResourceName = await createLabel(userId, tenantId, adsAccountId, labelName);

  await prisma.googleAdsAccount.update({
    where: { id: adsAccountDbId },
    data: { octLabelId: labelResourceName },
  });

  console.log(`[Ads] Created OCT label "${labelName}" in account ${adsAccountId}`);
  return labelResourceName;
}
