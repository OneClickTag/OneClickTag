import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  createStapeContainer,
  addStapeDomain,
  enableCookieKeeper,
  deleteStapeContainer,
  validateStapeDomain,
} from '@/lib/stape/client';

const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

// POST: Enable server-side tracking and provision Stape container
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;
    const body = await request.json();
    const { serverDomain } = body as { serverDomain: string };

    if (!serverDomain) {
      return NextResponse.json(
        { error: 'serverDomain is required (e.g., track.yoursite.com)' },
        { status: 400 }
      );
    }

    if (!DOMAIN_REGEX.test(serverDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format. Use a subdomain like track.yoursite.com' },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer must be connected to Google before enabling server-side tracking' },
        { status: 400 }
      );
    }

    if (customer.stapeContainer) {
      return NextResponse.json(
        { error: 'Server-side tracking is already configured for this customer' },
        { status: 409 }
      );
    }

    // 1. Create Stape sGTM container
    const containerName = `OneClickTag - ${customer.fullName}`;
    const stapeZone = process.env.STAPE_DEFAULT_ZONE || 'usa';
    const stapeContainer = await createStapeContainer({
      name: containerName,
      zone: { type: stapeZone },
    });

    const containerId = stapeContainer.identifier || String(stapeContainer.id);

    try {
      // 2. Add custom domain
      const domainResult = await addStapeDomain(containerId, {
        name: serverDomain,
        cdnType: 'stape',
      });

      // Extract DNS records for the customer to configure
      const dnsRecords = domainResult.records || [];
      const aRecord = dnsRecords.find((r) => r.type?.type === 'a');
      const cnameTarget = aRecord?.value || stapeContainer.stapeDomain;

      // 3. Enable Cookie Keeper power-up (non-blocking)
      try {
        await enableCookieKeeper(containerId);
      } catch (error) {
        console.warn('Failed to enable Cookie Keeper:', error);
      }

      // 4. Save to database
      const stapeRecord = await prisma.stapeContainer.create({
        data: {
          customerId: customer.id,
          stapeContainerId: containerId,
          containerName,
          serverDomain,
          stapeDefaultDomain: stapeContainer.stapeDomain || '',
          stapeDomainId: domainResult.identifier,
          dnsRecords: dnsRecords.length > 0 ? dnsRecords : undefined,
          status: 'PROVISIONING',
          domainStatus: 'PENDING',
          gtmServerContainerId: stapeContainer.sGtmContainerId || null,
          tenantId: session.tenantId,
        },
      });

      // 5. Enable server-side on customer
      await prisma.customer.update({
        where: { id: customer.id },
        data: { serverSideEnabled: true },
      });

      return NextResponse.json({
        stapeContainer: stapeRecord,
        dnsRecords,
        cnameTarget,
        message: `Add an A record: ${serverDomain} -> ${cnameTarget}`,
      }, { status: 201 });
    } catch (innerError) {
      // Rollback: delete the Stape container we just created
      try {
        await deleteStapeContainer(containerId);
      } catch (cleanupError) {
        console.warn('Failed to cleanup Stape container after provisioning error:', cleanupError);
      }
      throw innerError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stape setup error:', error);
    return NextResponse.json({ error: 'Failed to set up server-side tracking' }, { status: 500 });
  }
}

// GET: Get Stape container status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Backfill DNS records from Stape if missing (for containers created before this field existed)
    const stape = customer.stapeContainer;
    if (stape && !stape.dnsRecords && stape.stapeDomainId) {
      try {
        const validation = await validateStapeDomain(stape.stapeContainerId, stape.stapeDomainId);
        const dnsRecords = validation.records || [];
        if (dnsRecords.length > 0) {
          await prisma.stapeContainer.update({
            where: { id: stape.id },
            data: { dnsRecords },
          });
          (stape as Record<string, unknown>).dnsRecords = dnsRecords;
        }
      } catch (e) {
        console.warn('Failed to backfill DNS records:', e);
      }
    }

    return NextResponse.json({
      serverSideEnabled: customer.serverSideEnabled,
      stapeContainer: customer.stapeContainer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Disable server-side tracking and cleanup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (customer.stapeContainer) {
      // Delete from Stape (non-blocking)
      try {
        await deleteStapeContainer(customer.stapeContainer.stapeContainerId);
      } catch (error) {
        console.warn('Failed to delete Stape container:', error);
      }

      // Delete from database
      await prisma.stapeContainer.delete({
        where: { id: customer.stapeContainer.id },
      });
    }

    // Reset server-side trackings to client-side
    await prisma.tracking.updateMany({
      where: { customerId: id, trackingMode: 'SERVER_SIDE' },
      data: {
        trackingMode: 'CLIENT_SIDE',
        sgtmTriggerId: null,
        sgtmTagId: null,
        sgtmTagIdAds: null,
      },
    });

    // Disable server-side on customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: { serverSideEnabled: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
