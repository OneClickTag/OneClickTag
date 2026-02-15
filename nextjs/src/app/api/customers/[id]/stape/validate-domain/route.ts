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
      where: { id, tenantId: session.tenantId },
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

    // Call Stape API to validate the domain
    const validation = await validateStapeDomain(
      stape.stapeContainerId,
      stape.serverDomain
    );

    // Update domain status in database
    const newDomainStatus = validation.isValid ? 'VALIDATED' : 'FAILED';
    const newContainerStatus = validation.isValid ? 'ACTIVE' : stape.status;

    await prisma.stapeContainer.update({
      where: { id: stape.id },
      data: {
        domainStatus: newDomainStatus,
        status: newContainerStatus,
      },
    });

    return NextResponse.json({
      isValid: validation.isValid,
      domain: stape.serverDomain,
      domainStatus: newDomainStatus,
      containerStatus: newContainerStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Domain validation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
