import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface ContactPageContent {
  id: string;
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  formSettings?: {
    enableForm: boolean;
    emailTo: string;
    successMessage: string;
    subjects: string[];
  };
  customContent?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateContactPageData {
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  formSettings?: {
    enableForm?: boolean;
    emailTo?: string;
    successMessage?: string;
    subjects?: string[];
  };
  customContent?: any;
  isActive?: boolean;
}

export const adminContactService = {
  async getAll(): Promise<ContactPageContent[]> {
    const response = await apiClient.get<ContactPageContent[]>(apiEndpoints.customization.contact.list);
    return response.data;
  },

  async getActive(): Promise<ContactPageContent> {
    const response = await apiClient.get<ContactPageContent>(apiEndpoints.customization.contact.active);
    return response.data;
  },

  async getById(id: string): Promise<ContactPageContent> {
    const response = await apiClient.get<ContactPageContent>(apiEndpoints.customization.contact.get(id));
    return response.data;
  },

  async update(id: string, data: UpdateContactPageData): Promise<ContactPageContent> {
    const response = await apiClient.put<ContactPageContent>(
      apiEndpoints.customization.contact.update(id),
      data
    );
    return response.data;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ContactPageContent> {
    const response = await apiClient.put<ContactPageContent>(
      apiEndpoints.customization.contact.toggleActive(id),
      { isActive }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.customization.contact.delete(id));
  },
};
