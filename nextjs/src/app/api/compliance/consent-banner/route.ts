import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface UpdateCookieBannerBody {
  headingText?: string;
  bodyText?: string;
  acceptAllButtonText?: string;
  rejectAllButtonText?: string;
  customizeButtonText?: string;
  savePreferencesText?: string;
  position?: string;
  backgroundColor?: string;
  textColor?: string;
  acceptButtonColor?: string;
  rejectButtonColor?: string;
  customizeButtonColor?: string;
  consentExpiryDays?: number;
  showOnEveryPage?: boolean;
  blockCookiesUntilConsent?: boolean;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  isActive?: boolean;
}

/**
 * GET /api/compliance/consent-banner
 * Get cookie consent banner configuration for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const banner = await prisma.cookieConsentBanner.findUnique({
      where: { tenantId: session.tenantId },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Get consent banner error:', error);

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
 * PUT /api/compliance/consent-banner
 * Create or update cookie consent banner configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body: UpdateCookieBannerBody = await request.json();

    // Validate consentExpiryDays if provided
    if (body.consentExpiryDays !== undefined) {
      if (!Number.isInteger(body.consentExpiryDays) || body.consentExpiryDays < 1 || body.consentExpiryDays > 395) {
        return NextResponse.json(
          { error: 'consentExpiryDays must be an integer between 1 and 395' },
          { status: 400 }
        );
      }
    }

    const banner = await prisma.cookieConsentBanner.upsert({
      where: { tenantId: session.tenantId },
      create: {
        tenantId: session.tenantId,
        headingText: body.headingText,
        bodyText: body.bodyText,
        acceptAllButtonText: body.acceptAllButtonText,
        rejectAllButtonText: body.rejectAllButtonText,
        customizeButtonText: body.customizeButtonText,
        savePreferencesText: body.savePreferencesText,
        position: body.position,
        backgroundColor: body.backgroundColor,
        textColor: body.textColor,
        acceptButtonColor: body.acceptButtonColor,
        rejectButtonColor: body.rejectButtonColor,
        customizeButtonColor: body.customizeButtonColor,
        consentExpiryDays: body.consentExpiryDays,
        showOnEveryPage: body.showOnEveryPage,
        blockCookiesUntilConsent: body.blockCookiesUntilConsent,
        privacyPolicyUrl: body.privacyPolicyUrl,
        cookiePolicyUrl: body.cookiePolicyUrl,
        isActive: body.isActive,
      },
      update: {
        ...(body.headingText !== undefined && { headingText: body.headingText }),
        ...(body.bodyText !== undefined && { bodyText: body.bodyText }),
        ...(body.acceptAllButtonText !== undefined && { acceptAllButtonText: body.acceptAllButtonText }),
        ...(body.rejectAllButtonText !== undefined && { rejectAllButtonText: body.rejectAllButtonText }),
        ...(body.customizeButtonText !== undefined && { customizeButtonText: body.customizeButtonText }),
        ...(body.savePreferencesText !== undefined && { savePreferencesText: body.savePreferencesText }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.backgroundColor !== undefined && { backgroundColor: body.backgroundColor }),
        ...(body.textColor !== undefined && { textColor: body.textColor }),
        ...(body.acceptButtonColor !== undefined && { acceptButtonColor: body.acceptButtonColor }),
        ...(body.rejectButtonColor !== undefined && { rejectButtonColor: body.rejectButtonColor }),
        ...(body.customizeButtonColor !== undefined && { customizeButtonColor: body.customizeButtonColor }),
        ...(body.consentExpiryDays !== undefined && { consentExpiryDays: body.consentExpiryDays }),
        ...(body.showOnEveryPage !== undefined && { showOnEveryPage: body.showOnEveryPage }),
        ...(body.blockCookiesUntilConsent !== undefined && { blockCookiesUntilConsent: body.blockCookiesUntilConsent }),
        ...(body.privacyPolicyUrl !== undefined && { privacyPolicyUrl: body.privacyPolicyUrl }),
        ...(body.cookiePolicyUrl !== undefined && { cookiePolicyUrl: body.cookiePolicyUrl }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Update consent banner error:', error);

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
