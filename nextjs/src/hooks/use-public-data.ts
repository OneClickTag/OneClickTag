'use client';

import { useQuery } from '@tanstack/react-query';

// Types
export interface FooterConfig {
  id?: string;
  brandName: string;
  brandDescription: string;
  socialLinks: { platform: string; url: string; icon: string }[];
  sections: { title: string; links: { label: string; url: string }[] }[];
  copyrightText: string;
}

export interface CookieBannerData {
  tenantId: string;
  banner: {
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
  };
  categories: {
    id: string;
    name: string;
    description: string;
    category: 'NECESSARY' | 'ANALYTICS' | 'MARKETING';
    isRequired: boolean;
    cookies: {
      id: string;
      name: string;
      provider: string;
      purpose: string;
      duration: string;
      type?: string;
    }[];
  }[];
}

// Hooks
export function useFooterConfig() {
  return useQuery<FooterConfig | null>({
    queryKey: ['public', 'footer'],
    queryFn: async () => {
      const response = await fetch('/api/public/footer');
      if (!response.ok) {
        throw new Error('Failed to fetch footer config');
      }
      return response.json();
    },
    staleTime: Infinity, // Footer data is nearly static, fetch once per session
  });
}

export function useCookieBannerData() {
  return useQuery<CookieBannerData>({
    queryKey: ['public', 'cookie-banner'],
    queryFn: async () => {
      const response = await fetch('/api/public/cookie-banner');
      if (!response.ok) {
        throw new Error('Failed to fetch cookie banner data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
