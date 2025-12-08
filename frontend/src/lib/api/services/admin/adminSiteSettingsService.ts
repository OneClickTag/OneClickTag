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
  metaTitle?: string;
  metaDescription?: string;
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
  metaTitle?: string;
  metaDescription?: string;
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
