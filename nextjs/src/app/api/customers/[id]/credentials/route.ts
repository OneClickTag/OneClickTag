// POST /api/customers/[id]/credentials - Store encrypted credentials
// GET /api/customers/[id]/credentials - List credentials (passwords redacted)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId } = await params;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenantId, userId: session.id },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const credentials = await prisma.siteCredential.findMany({
      where: { customerId, tenantId: session.tenantId },
      select: {
        id: true,
        domain: true,
        username: true,
        loginUrl: true,
        createdAt: true,
        updatedAt: true,
        // password deliberately excluded
      },
      orderBy: { createdAt: 'desc' },
    });

    // Redact username (show first 2 chars + ***)
    const redacted = credentials.map(c => ({
      ...c,
      username: c.username.length > 2
        ? c.username.slice(0, 2) + '***'
        : '***',
    }));

    return NextResponse.json(redacted);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to list credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId } = await params;

    const body = await request.json();
    const { domain, username, password, loginUrl } = body;

    if (!domain || !username || !password) {
      return NextResponse.json(
        { error: 'domain, username, and password are required' },
        { status: 400 }
      );
    }

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenantId, userId: session.id },
      select: { id: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Encrypt credentials
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);

    // Upsert (update if same domain exists)
    const credential = await prisma.siteCredential.upsert({
      where: {
        customerId_domain_tenantId: {
          customerId,
          domain,
          tenantId: session.tenantId,
        },
      },
      update: {
        username: encryptedUsername,
        password: encryptedPassword,
        loginUrl,
      },
      create: {
        customerId,
        tenantId: session.tenantId,
        domain,
        username: encryptedUsername,
        password: encryptedPassword,
        loginUrl,
      },
    });

    return NextResponse.json({
      id: credential.id,
      domain: credential.domain,
      loginUrl: credential.loginUrl,
      createdAt: credential.createdAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to save credentials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
