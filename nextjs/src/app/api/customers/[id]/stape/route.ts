import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import {
  createStapeContainer,
  addStapeDomain,
  enableCookieKeeper,
  deleteStapeContainer,
} from '@/lib/stape/client';

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
    const stapeContainer = await createStapeContainer({
      name: containerName,
    });

    // 2. Add custom domain
    const domainResult = await addStapeDomain(stapeContainer.id, {
      domain: serverDomain,
    });

    // 3. Enable Cookie Keeper power-up (non-blocking)
    try {
      await enableCookieKeeper(stapeContainer.id);
    } catch (error) {
      console.warn('Failed to enable Cookie Keeper:', error);
    }

    // 4. Save to database
    const stapeRecord = await prisma.stapeContainer.create({
      data: {
        customerId: customer.id,
        stapeContainerId: stapeContainer.id,
        containerName,
        serverDomain,
        stapeDefaultDomain: stapeContainer.domain,
        status: 'PROVISIONING',
        domainStatus: 'PENDING',
        gtmServerContainerId: stapeContainer.gtmContainerId || null,
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
      cnameTarget: domainResult.cnameTarget || stapeContainer.domain,
      message: `Add a CNAME record: ${serverDomain} -> ${domainResult.cnameTarget || stapeContainer.domain}`,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stape setup error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
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
