import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/public/cookie-banner
 * Get cookie banner settings, categories, and cookies for display
 * This is a public endpoint that doesn't require authentication
 *
 * Query params:
 * - tenantId (optional): If not provided, uses the default/main tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');

    // If no tenantId provided, get the default/first active tenant
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (!defaultTenant) {
        return NextResponse.json(
          { error: 'No active tenant found' },
          { status: 404 }
        );
      }
      tenantId = defaultTenant.id;
    }

    // Fetch banner + categories in parallel (also removes separate tenant verification)
    const [banner, categories] = await Promise.all([
      prisma.cookieConsentBanner.findUnique({
        where: { tenantId },
      }),
      prisma.cookieCategory.findMany({
        where: { tenantId },
        include: {
          cookies: {
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { category: 'asc' },
      }),
    ]);

    const data = {
      tenantId,
      banner: banner || {
        isActive: true,
        headingText: 'We value your privacy',
        bodyText: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
        acceptAllButtonText: 'Accept All',
        rejectAllButtonText: 'Reject All',
        customizeButtonText: 'Customize',
        savePreferencesText: 'Save Preferences',
        position: 'bottom',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        acceptButtonColor: '#10b981',
        rejectButtonColor: '#ef4444',
        customizeButtonColor: '#6b7280',
        consentExpiryDays: 365,
        showOnEveryPage: false,
        blockCookiesUntilConsent: true,
        privacyPolicyUrl: '/privacy',
        cookiePolicyUrl: '/cookie-policy',
      },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        category: category.category,
        isRequired: category.isRequired,
        cookies: category.cookies.map((cookie) => ({
          id: cookie.id,
          name: cookie.name,
          provider: cookie.provider,
          purpose: cookie.purpose,
          duration: cookie.duration,
          type: cookie.type,
        })),
      })),
    };

    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Get public cookie banner error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
