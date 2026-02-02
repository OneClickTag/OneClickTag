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
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  formSettings?: {
    enableForm: boolean;
    emailTo: string;
    successMessage: string;
    subjects: string[];
    showEmail?: boolean;
    showPhone?: boolean;
    showAddress?: boolean;
    showBusinessHours?: boolean;
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
    const response = await publicApi.get<FooterConfig>(apiEndpoints.public.footer);
    return response.data;
  },
};
