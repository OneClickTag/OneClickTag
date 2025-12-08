/**
 * Public API Service
 * Handles public endpoints that don't require authentication
 */

import axios, { AxiosInstance } from 'axios';
import { getBaseURL, apiEndpoints } from '../config';

// Create axios instance for public endpoints (no auth required)
const publicApi: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  billingPeriod: string;
  currency: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  ctaText: string;
  ctaUrl: string;
}

export interface FooterConfig {
  id: string;
  brandName: string;
  brandDescription: string;
  socialLinks: Array<{
    platform: string;
    url: string;
    icon: string;
  }>;
  sections: Array<{
    title: string;
    links: Array<{
      label: string;
      url: string;
    }>;
  }>;
  copyrightText: string;
}

export interface LandingSection {
  id: string;
  key: string;
  content: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  id: string;
  key: string;
  value: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPageContent {
  id: string;
  headline: string;
  subheadline: string;
  emailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitButtonText: string;
  successMessage: string;
  errorMessage: string;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const publicService = {
  /**
   * Get content page by slug
   */
  async getContentBySlug(slug: string): Promise<ContentPage> {
    const response = await publicApi.get<ContentPage>(apiEndpoints.public.content(slug));
    return response.data;
  },

  /**
   * Get all active plans
   */
  async getPlans(): Promise<Plan[]> {
    const response = await publicApi.get<Plan[]>(apiEndpoints.public.plans);
    return response.data;
  },

  /**
   * Get all landing page sections
   */
  async getLandingSections(): Promise<LandingSection[]> {
    const response = await publicApi.get<LandingSection[]>(apiEndpoints.public.landing);
    return response.data;
  },

  /**
   * Get specific landing section by key
   */
  async getLandingSection(key: string): Promise<LandingSection> {
    const response = await publicApi.get<LandingSection>(apiEndpoints.public.landingSection(key));
    return response.data;
  },

  /**
   * Get global site settings
   */
  async getSiteSettings(): Promise<SiteSettings> {
    const response = await publicApi.get<SiteSettings>(apiEndpoints.public.siteSettings);
    return response.data;
  },

  /**
   * Get contact page content
   */
  async getContactPageContent(): Promise<ContactPageContent> {
    const response = await publicApi.get<ContactPageContent>(apiEndpoints.public.contact);
    return response.data;
  },

  /**
   * Get footer configuration
   */
  async getFooterConfig(): Promise<FooterConfig> {
    // Try localStorage first (for admin-configured footer)
    const saved = localStorage.getItem('footer_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse footer config from localStorage:', error);
      }
    }

    // Fallback to default config
    return {
      id: 'default',
      brandName: 'OneClickTag',
      brandDescription: 'Simplify your conversion tracking with automated GTM and Google Ads integration.',
      socialLinks: [
        { platform: 'Twitter', url: 'https://twitter.com/oneclicktag', icon: 'twitter' },
        { platform: 'LinkedIn', url: 'https://linkedin.com/company/oneclicktag', icon: 'linkedin' },
        { platform: 'GitHub', url: 'https://github.com/oneclicktag', icon: 'github' },
      ],
      sections: [
        {
          title: 'Product',
          links: [
            { label: 'Pricing', url: '/plans' },
          ],
        },
        {
          title: 'Company',
          links: [
            { label: 'About Us', url: '/about' },
            { label: 'Contact', url: '/contact' },
          ],
        },
        {
          title: 'Legal',
          links: [
            { label: 'Terms of Service', url: '/terms' },
            { label: 'Privacy Policy', url: '/privacy' },
          ],
        },
      ],
      copyrightText: 'OneClickTag. All rights reserved.',
    };
  },
};
