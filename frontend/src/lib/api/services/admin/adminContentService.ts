import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContentData {
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished?: boolean;
  order?: number;
}

export interface UpdateContentData {
  title?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished?: boolean;
  order?: number;
}

export interface PublishContentData {
  isPublished: boolean;
}

export const adminContentService = {
  /**
   * Get all content pages
   */
  async getAll(): Promise<ContentPage[]> {
    const response = await apiClient.get<ContentPage[]>(apiEndpoints.admin.content.list);
    return response.data;
  },

  /**
   * Get content page by ID
   */
  async getById(id: string): Promise<ContentPage> {
    const response = await apiClient.get<ContentPage>(apiEndpoints.admin.content.get(id));
    return response.data;
  },

  /**
   * Create new content page
   */
  async create(data: CreateContentData): Promise<ContentPage> {
    const response = await apiClient.post<ContentPage>(apiEndpoints.admin.content.create, data);
    return response.data;
  },

  /**
   * Update content page
   */
  async update(id: string, data: UpdateContentData): Promise<ContentPage> {
    const response = await apiClient.put<ContentPage>(apiEndpoints.admin.content.update(id), data);
    return response.data;
  },

  /**
   * Delete content page
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.content.delete(id));
  },

  /**
   * Toggle publish status
   */
  async togglePublish(id: string, data: PublishContentData): Promise<ContentPage> {
    const response = await apiClient.put<ContentPage>(apiEndpoints.admin.content.publish(id), data);
    return response.data;
  },
};
