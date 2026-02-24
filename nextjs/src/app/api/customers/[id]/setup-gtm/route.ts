// POST /api/customers/[id]/setup-gtm
// Creates OneClickTag GTM container + workspace in the chosen GTM account

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { id } = await params;
    const body = await request.json();
    const { gtmAccountId } = body;

    if (!gtmAccountId) {
      return NextResponse.json(
        { error: 'gtmAccountId is required' },
        { status: 400 }
      );
    }

    // Verify customer exists, belongs to tenant, and has Google connected
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: session.tenantId, userId: session.id },
      select: { id: true, googleAccountId: true, fullName: true },
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

    // Find userId that has the OAuth tokens
    const oauthToken = await prisma.oAuthToken.findFirst({
      where: { tenantId: session.tenantId, provider: 'google', scope: 'gtm' },
      select: { userId: true },
    });
    const tokenUserId = oauthToken?.userId || session.id;

    const { getGTMClient, createContainer, getOrCreateWorkspace, setupWorkspaceEssentials } = await import('@/lib/google/gtm');
    const gtm = await getGTMClient(tokenUserId, session.tenantId);

    // 1. List containers in the chosen account, find or create "OneClickTag - {customerName}"
    const containerName = `OneClickTag - ${customer.fullName}`;
    const containersResponse = await gtm.accounts.containers.list({
      parent: `accounts/${gtmAccountId}`,
    });
    const containers = containersResponse.data.container || [];
    let container = containers.find((c) => c.name === containerName);

    if (!container) {
      container = await createContainer(gtm, gtmAccountId, containerName);
    }

    if (!container?.containerId || !container?.publicId) {
      return NextResponse.json(
        { error: 'Failed to create GTM container' },
        { status: 500 }
      );
    }

    // 2. Create or find workspace
    const workspaceName = `OneClickTag - ${customer.fullName}`;
    const workspaceId = await getOrCreateWorkspace(
      gtm, gtmAccountId, container.containerId, workspaceName
    );

    // 3. Set up workspace essentials
    await setupWorkspaceEssentials(gtm, gtmAccountId, container.containerId, workspaceId);

    // 4. Update customer record
    await prisma.customer.update({
      where: { id },
      data: {
        gtmAccountId,
        gtmContainerId: container.containerId,
        gtmContainerName: container.publicId,
        gtmWorkspaceId: workspaceId,
      },
    });

    // 5. Also cache this account on the tenant for future use
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: { octGtmAccountId: gtmAccountId },
    });

    console.log(`[GTM] Setup complete: account=${gtmAccountId}, container=${container.containerId}, workspace=${workspaceId}`);

    return NextResponse.json({
      success: true,
      gtmAccountId,
      gtmContainerId: container.containerId,
      gtmContainerName: container.publicId,
      gtmWorkspaceId: workspaceId,
    });
  } catch (error) {
    console.error('POST /api/customers/[id]/setup-gtm error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
