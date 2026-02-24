// POST /api/customers/[id]/disconnect-google - Disconnect Google account from customer

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

    // Verify customer exists, belongs to tenant, and has Google connected
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      select: {
        id: true,
        googleAccountId: true,
        fullName: true,
      },
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

    // Delete related Google data for this customer
    const [adsDeleted, ga4Deleted, stapeDeleted] = await Promise.allSettled([
      prisma.googleAdsAccount.deleteMany({
        where: { customerId: id, tenantId: session.tenantId },
      }),
      prisma.gA4Property.deleteMany({
        where: { customerId: id, tenantId: session.tenantId },
      }),
      prisma.stapeContainer.deleteMany({
        where: { customerId: id },
      }),
    ]);

    // Clear Google fields on the customer (including GTM fields via raw SQL)
    await prisma.customer.update({
      where: { id },
      data: {
        googleAccountId: null,
        googleEmail: null,
        serverSideEnabled: false,
      },
    });

    // Clear GTM fields via raw SQL (these may not be in Prisma client cache)
    await prisma.$executeRawUnsafe(
      `UPDATE customers SET "gtmAccountId" = NULL, "gtmContainerId" = NULL, "gtmWorkspaceId" = NULL, "gtmContainerName" = NULL WHERE id = $1`,
      id
    );

    const deletedCounts = {
      googleAdsAccounts: adsDeleted.status === 'fulfilled' ? adsDeleted.value.count : 0,
      ga4Properties: ga4Deleted.status === 'fulfilled' ? ga4Deleted.value.count : 0,
      stapeContainers: stapeDeleted.status === 'fulfilled' ? stapeDeleted.value.count : 0,
    };

    console.log(`[Disconnect] Disconnected Google from customer "${customer.fullName}" (${id}):`, deletedCounts);

    return NextResponse.json({
      message: 'Google account disconnected successfully',
      deleted: deletedCounts,
    });
  } catch (error) {
    console.error('Disconnect Google error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json(
          { error: 'No tenant associated with user' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to disconnect Google account' },
      { status: 500 }
    );
  }
}
