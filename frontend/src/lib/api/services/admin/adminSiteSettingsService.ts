import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface SiteSettings {
  id: string;
  key: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandName?: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  heroBackgroundUrl?: string;

  // Basic SEO
  metaTitle?: string;
  metaDescription?: string;
  metaTitleTemplate?: string;

  // Open Graph Settings
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogSiteName?: string;
  ogLocale?: string;

  // Twitter Card Settings
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterSite?: string;
  twitterCreator?: string;

  // Robots & Indexing
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsNoArchive?: boolean;
  robotsNoSnippet?: boolean;
  robotsNoImageIndex?: boolean;
  googleVerification?: string;
  bingVerification?: string;

  // Canonical URL Settings
  canonicalUrl?: string;
  forceTrailingSlash?: boolean;

  // Schema.org / JSON-LD Settings
  schemaType?: string;
  schemaData?: Record<string, any>;

  // Legacy field
  socialImageUrl?: string;

  customCSS?: string;
  customJS?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateSiteSettingsData {
  logoUrl?: string;
  faviconUrl?: string;
  brandName?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  heroBackgroundUrl?: string;

  // Basic SEO
  metaTitle?: string;
  metaDescription?: string;
  metaTitleTemplate?: string;

  // Open Graph Settings
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogSiteName?: string;
  ogLocale?: string;

  // Twitter Card Settings
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterSite?: string;
  twitterCreator?: string;

  // Robots & Indexing
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsNoArchive?: boolean;
  robotsNoSnippet?: boolean;
  robotsNoImageIndex?: boolean;
  googleVerification?: string;
  bingVerification?: string;

  // Canonical URL Settings
  canonicalUrl?: string;
  forceTrailingSlash?: boolean;

  // Schema.org / JSON-LD Settings
  schemaType?: string;
  schemaData?: Record<string, any>;

  // Legacy field
  socialImageUrl?: string;

  customCSS?: string;
  customJS?: string;
}

export const adminSiteSettingsService = {
  async getAll(): Promise<SiteSettings[]> {
    const response = await apiClient.get<SiteSettings[]>(apiEndpoints.customization.siteSettings.list);
    return response.data;
  },

  async getGlobal(): Promise<SiteSettings> {
    const response = await apiClient.get<SiteSettings>(apiEndpoints.customization.siteSettings.global);
    return response.data;
  },

  async updateGlobal(data: UpdateSiteSettingsData): Promise<SiteSettings> {
    const response = await apiClient.put<SiteSettings>(
      apiEndpoints.customization.siteSettings.updateGlobal,
      data
    );
    return response.data;
  },

  async getById(id: string): Promise<SiteSettings> {
    const response = await apiClient.get<SiteSettings>(apiEndpoints.customization.siteSettings.get(id));
    return response.data;
  },

  async update(id: string, data: UpdateSiteSettingsData): Promise<SiteSettings> {
    const response = await apiClient.put<SiteSettings>(
      apiEndpoints.customization.siteSettings.update(id),
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.customization.siteSettings.delete(id));
  },
};
