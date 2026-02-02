import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export interface PublicConsentBannerSettings {
  isActive: boolean;
  headingText: string;
  bodyText: string;
  acceptAllButtonText: string;
  rejectAllButtonText: string;
  customizeButtonText: string;
  savePreferencesText: string;
  position: string;
  backgroundColor: string;
  textColor: string;
  acceptButtonColor: string;
  rejectButtonColor: string;
  customizeButtonColor: string;
  consentExpiryDays: number;
  showOnEveryPage: boolean;
  blockCookiesUntilConsent: boolean;
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
}

// Default settings if no banner exists in DB
const defaultSettings: PublicConsentBannerSettings = {
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
  acceptButtonColor: '#3b82f6',
  rejectButtonColor: '#6b7280',
  customizeButtonColor: '#6b7280',
  consentExpiryDays: 365,
  showOnEveryPage: false,
  blockCookiesUntilConsent: true,
  privacyPolicyUrl: '/privacy',
  cookiePolicyUrl: '/cookie-policy',
};

/**
 * GET /api/public/consent-banner
 * Get cookie consent banner settings for the public website (no auth required)
 * Returns the first available banner or default settings
 */
export async function GET() {
  try {
    // Try to find the first consent banner (for the public site)
    // In a multi-tenant setup, this would be for the "global" or "main" tenant
    const banner = await prisma.cookieConsentBanner.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the oldest/first one
      },
      select: {
        isActive: true,
        headingText: true,
        bodyText: true,
        acceptAllButtonText: true,
        rejectAllButtonText: true,
        customizeButtonText: true,
        savePreferencesText: true,
        position: true,
        backgroundColor: true,
        textColor: true,
        acceptButtonColor: true,
        rejectButtonColor: true,
        customizeButtonColor: true,
        consentExpiryDays: true,
        showOnEveryPage: true,
        blockCookiesUntilConsent: true,
        privacyPolicyUrl: true,
        cookiePolicyUrl: true,
      },
    });

    if (!banner) {
      // Return default settings if no banner configured
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(banner);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch consent banner settings:', message);
    // Return default settings on error to not break the cookie banner
    return NextResponse.json(defaultSettings);
  }
}
