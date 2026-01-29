import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RecordConsentBody {
  tenantId: string;
  anonymousId?: string;
  necessaryCookies: boolean;
  analyticsCookies: boolean;
  marketingCookies: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * POST /api/public/cookie-consent
 * Record user's cookie consent choices (public endpoint - no auth required)
 * This endpoint is called from the cookie banner script embedded on tenant websites
 */
export async function POST(request: NextRequest) {
  try {
    const body: RecordConsentBody = await request.json();

    // Validate required fields
    if (!body.tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    if (body.necessaryCookies === undefined || body.analyticsCookies === undefined || body.marketingCookies === undefined) {
      return NextResponse.json(
        { error: 'necessaryCookies, analyticsCookies, and marketingCookies are required' },
        { status: 400 }
      );
    }

    // Verify tenant exists and is active
    const tenant = await prisma.tenant.findUnique({
      where: { id: body.tenantId },
      select: { id: true, isActive: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid tenant' },
        { status: 400 }
      );
    }

    if (!tenant.isActive) {
      return NextResponse.json(
        { error: 'Tenant is inactive' },
        { status: 403 }
      );
    }

    // Get banner settings to determine expiry
    const banner = await prisma.cookieConsentBanner.findUnique({
      where: { tenantId: body.tenantId },
      select: { consentExpiryDays: true },
    });

    const expiryDays = banner?.consentExpiryDays || 365;

    // Calculate expiration date
    const consentExpiresAt = new Date();
    consentExpiresAt.setDate(consentExpiresAt.getDate() + expiryDays);

    // Extract IP address from headers if not provided
    let ipAddress = body.ipAddress;
    if (!ipAddress) {
      // Try to get IP from various headers (common in proxied environments)
      ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') ||
                  request.headers.get('cf-connecting-ip') || // Cloudflare
                  undefined;
    }

    // Extract user agent from headers if not provided
    const userAgent = body.userAgent || request.headers.get('user-agent') || undefined;

    // Record the consent
    const consent = await prisma.userCookieConsent.create({
      data: {
        tenantId: body.tenantId,
        userId: null, // Public endpoint - no authenticated user
        anonymousId: body.anonymousId,
        necessaryCookies: body.necessaryCookies,
        analyticsCookies: body.analyticsCookies,
        marketingCookies: body.marketingCookies,
        consentExpiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Return the consent record with useful info for the client
    return NextResponse.json({
      id: consent.id,
      consentGivenAt: consent.consentGivenAt,
      consentExpiresAt: consent.consentExpiresAt,
      necessaryCookies: consent.necessaryCookies,
      analyticsCookies: consent.analyticsCookies,
      marketingCookies: consent.marketingCookies,
    }, { status: 201 });
  } catch (error) {
    console.error('Record cookie consent error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/public/cookie-consent
 * Get user's most recent consent record
 * Query params: tenantId (required), anonymousId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const anonymousId = searchParams.get('anonymousId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    if (!anonymousId) {
      return NextResponse.json(
        { error: 'anonymousId is required' },
        { status: 400 }
      );
    }

    // Find most recent consent for this anonymous user
    const consent = await prisma.userCookieConsent.findFirst({
      where: {
        tenantId,
        anonymousId,
      },
      orderBy: {
        consentGivenAt: 'desc',
      },
      select: {
        id: true,
        consentGivenAt: true,
        consentExpiresAt: true,
        necessaryCookies: true,
        analyticsCookies: true,
        marketingCookies: true,
      },
    });

    if (!consent) {
      return NextResponse.json(null);
    }

    // Check if consent has expired
    const now = new Date();
    if (consent.consentExpiresAt && consent.consentExpiresAt < now) {
      return NextResponse.json({
        ...consent,
        isExpired: true,
      });
    }

    return NextResponse.json({
      ...consent,
      isExpired: false,
    });
  } catch (error) {
    console.error('Get cookie consent error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
