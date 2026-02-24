import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ComplianceSettingsBody {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  dpoName?: string;
  dpoEmail?: string;
  dpoPhone?: string;
  ccpaTollFreeNumber?: string;
  apiContactEmail?: string;
  privacyContactEmail?: string;
}

/**
 * GET /api/compliance/settings
 * Get compliance settings for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const settings = await prisma.complianceSettings.findUnique({
      where: { tenantId: session.tenantId },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get compliance settings error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/compliance/settings
 * Create or update compliance settings for the tenant
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body: ComplianceSettingsBody = await request.json();

    // Validate required fields for creation
    const existing = await prisma.complianceSettings.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!existing) {
      // Creating new - validate required fields
      if (!body.companyName || !body.companyAddress || !body.companyEmail) {
        return NextResponse.json(
          { error: 'companyName, companyAddress, and companyEmail are required' },
          { status: 400 }
        );
      }
    }

    // Email validation
    const emailFields = ['companyEmail', 'dpoEmail', 'apiContactEmail', 'privacyContactEmail'] as const;
    for (const field of emailFields) {
      if (body[field] && !isValidEmail(body[field]!)) {
        return NextResponse.json(
          { error: `Invalid email format for ${field}` },
          { status: 400 }
        );
      }
    }

    const settings = await prisma.complianceSettings.upsert({
      where: { tenantId: session.tenantId },
      create: {
        tenantId: session.tenantId,
        companyName: body.companyName!,
        companyAddress: body.companyAddress!,
        companyPhone: body.companyPhone,
        companyEmail: body.companyEmail!,
        dpoName: body.dpoName,
        dpoEmail: body.dpoEmail,
        dpoPhone: body.dpoPhone,
        ccpaTollFreeNumber: body.ccpaTollFreeNumber,
        apiContactEmail: body.apiContactEmail,
        privacyContactEmail: body.privacyContactEmail,
        createdBy: session.id,
        updatedBy: session.id,
      },
      update: {
        companyName: body.companyName,
        companyAddress: body.companyAddress,
        companyPhone: body.companyPhone,
        companyEmail: body.companyEmail,
        dpoName: body.dpoName,
        dpoEmail: body.dpoEmail,
        dpoPhone: body.dpoPhone,
        ccpaTollFreeNumber: body.ccpaTollFreeNumber,
        apiContactEmail: body.apiContactEmail,
        privacyContactEmail: body.privacyContactEmail,
        updatedBy: session.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update compliance settings error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'No tenant associated with user') {
        return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
