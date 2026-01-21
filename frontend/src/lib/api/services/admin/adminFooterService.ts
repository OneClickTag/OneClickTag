import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterContent {
  id: string;
  brandName?: string;
  brandDescription?: string;
  socialLinks?: SocialLink[];
  sections?: FooterSection[];
  copyrightText?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateFooterData {
  brandName?: string;
  brandDescription?: string;
  socialLinks?: SocialLink[];
  sections?: FooterSection[];
  copyrightText?: string;
  isActive?: boolean;
}

export const adminFooterService = {
  async getAll(): Promise<FooterContent[]> {
    const response = await apiClient.get<FooterContent[]>(apiEndpoints.customization.footer.list);
    return response.data;
  },

  async getActive(): Promise<FooterContent> {
    const response = await apiClient.get<FooterContent>(apiEndpoints.customization.footer.active);
    return response.data;
  },

  async getById(id: string): Promise<FooterContent> {
    const response = await apiClient.get<FooterContent>(apiEndpoints.customization.footer.get(id));
    return response.data;
  },

  async update(id: string, data: UpdateFooterData): Promise<FooterContent> {
    const response = await apiClient.put<FooterContent>(
      apiEndpoints.customization.footer.update(id),
      data
    );
    return response.data;
  },

  async create(data: UpdateFooterData): Promise<FooterContent> {
    const response = await apiClient.post<FooterContent>(
      apiEndpoints.customization.footer.create,
      data
    );
    return response.data;
  },

  async toggleActive(id: string, isActive: boolean): Promise<FooterContent> {
    const response = await apiClient.put<FooterContent>(
      apiEndpoints.customization.footer.toggleActive(id),
      { isActive }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.customization.footer.delete(id));
  },
};
