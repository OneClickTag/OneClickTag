// POST /api/customers/[id]/sync-google
// Re-sync Google services (GTM workspace, Google Ads accounts, GA4 properties)
// without needing to re-do the OAuth flow

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    // Verify customer belongs to tenant and has Google connected
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId, userId: session.id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer is not connected to Google' },
        { status: 400 }
      );
    }

    // Find the userId that has the OAuth tokens for this tenant
    const oauthToken = await prisma.oAuthToken.findFirst({
      where: { tenantId: session.tenantId, provider: 'google', scope: 'gtm' },
      select: { userId: true },
    });
    const tokenUserId = oauthToken?.userId || session.id;

    const results: Record<string, { success: boolean; message: string }> = {};

    // Sync GTM workspace
    try {
      const { getGTMClient, listContainers, getOrCreateWorkspace } = await import('@/lib/google/gtm');
      const gtm = await getGTMClient(tokenUserId, session.tenantId);
      const containers = await listContainers(tokenUserId, session.tenantId);

      if (containers.length > 0) {
        const container = containers[0];
        const containerId = container.containerId!;
        const containerName = container.name || container.publicId || containerId;
        const accountId = container.accountId!;
        const workspaceId = await getOrCreateWorkspace(gtm, accountId, containerId);

        // Store GTM info on customer - use raw SQL for gtmAccountId
        // since Prisma client may not have it cached yet
        await prisma.$executeRawUnsafe(
          `UPDATE customers SET "gtmAccountId" = $1, "gtmContainerId" = $2, "gtmWorkspaceId" = $3, "gtmContainerName" = $4 WHERE id = $5`,
          accountId, containerId, workspaceId, containerName, id
        );

        results.gtm = { success: true, message: `Workspace ready in container "${containerName}"` };
      } else {
        results.gtm = { success: false, message: 'No GTM containers found' };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      results.gtm = { success: false, message: msg };
    }

    // Sync Google Ads accounts
    try {
      const { listAccessibleAccounts } = await import('@/lib/google/ads');
      const adsAccounts = await listAccessibleAccounts(tokenUserId, session.tenantId);

      for (const account of adsAccounts) {
        await prisma.googleAdsAccount.upsert({
          where: {
            accountId_tenantId: {
              accountId: account.customerId,
              tenantId: session.tenantId,
            },
          },
          update: {
            accountName: account.descriptiveName,
            currency: account.currencyCode,
            timeZone: account.timeZone,
            isActive: true,
          },
          create: {
            googleAccountId: account.customerId,
            accountId: account.customerId,
            accountName: account.descriptiveName,
            currency: account.currencyCode,
            timeZone: account.timeZone,
            isActive: true,
            customerId: id,
            tenantId: session.tenantId,
          },
        });
      }

      results.ads = {
        success: true,
        message: `${adsAccounts.length} account${adsAccounts.length !== 1 ? 's' : ''} synced`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      results.ads = { success: false, message: msg };
    }

    // Sync GA4 properties
    try {
      const { listGA4Properties } = await import('@/lib/google/ga4');
      const ga4Properties = await listGA4Properties(tokenUserId, session.tenantId);

      for (const property of ga4Properties) {
        await prisma.gA4Property.upsert({
          where: {
            propertyId_tenantId: {
              propertyId: property.propertyId,
              tenantId: session.tenantId,
            },
          },
          update: {
            propertyName: property.propertyName,
            displayName: property.displayName,
            timeZone: property.timeZone,
            currency: property.currency,
            industryCategory: property.industryCategory,
            measurementId: property.measurementId || undefined,
            isActive: true,
          },
          create: {
            googleAccountId: property.propertyId,
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            displayName: property.displayName,
            timeZone: property.timeZone,
            currency: property.currency,
            industryCategory: property.industryCategory,
            measurementId: property.measurementId || undefined,
            isActive: true,
            customerId: id,
            tenantId: session.tenantId,
          },
        });
      }

      results.ga4 = {
        success: true,
        message: `${ga4Properties.length} propert${ga4Properties.length !== 1 ? 'ies' : 'y'} synced`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      results.ga4 = { success: false, message: msg };
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Sync Google error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
