import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { validateStapeDomain } from '@/lib/stape/client';

// POST: Validate that the customer's CNAME record is set up correctly
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId, userId: session.id },
      include: { stapeContainer: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.stapeContainer) {
      return NextResponse.json(
        { error: 'No Stape container configured for this customer' },
        { status: 400 }
      );
    }

    const stape = customer.stapeContainer;

    if (!stape.stapeDomainId) {
      return NextResponse.json(
        { error: 'Domain ID not found. Please re-enable server-side tracking.' },
        { status: 400 }
      );
    }

    // Call Stape API to revalidate the domain using the stored domain ID
    const validation = await validateStapeDomain(
      stape.stapeContainerId,
      stape.stapeDomainId
    );

    // Check domain status from Stape response (status.type is lowercase: "active", "verifying", etc.)
    const domainStatusType = validation.status?.type?.toLowerCase();
    const isValid = domainStatusType === 'active' || domainStatusType === 'verified';

    // Update domain status in database
    const newDomainStatus = isValid ? 'VALIDATED' : 'FAILED';
    const newContainerStatus = isValid ? 'ACTIVE' : stape.status;

    // Also persist DNS records if returned (backfills old containers that lack them)
    const dnsRecords = validation.records || [];

    await prisma.stapeContainer.update({
      where: { id: stape.id },
      data: {
        domainStatus: newDomainStatus,
        status: newContainerStatus,
        ...(dnsRecords.length > 0 ? { dnsRecords } : {}),
      },
    });

    return NextResponse.json({
      isValid,
      domain: stape.serverDomain,
      domainStatus: newDomainStatus,
      containerStatus: newContainerStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Domain validation error:', message);
    return NextResponse.json({ error: 'Domain validation failed' }, { status: 500 });
  }
}
