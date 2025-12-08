import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface LandingSection {
  id: string;
  key: string;
  content: any; // JSON content - flexible structure
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface CreateLandingSectionData {
  key: string;
  content: any;
  isActive?: boolean;
}

export interface UpdateLandingSectionData {
  content?: any;
  isActive?: boolean;
}

export const adminLandingService = {
  async getAll(): Promise<LandingSection[]> {
    const response = await apiClient.get<LandingSection[]>(apiEndpoints.customization.landing.list);
    return response.data;
  },

  async getById(id: string): Promise<LandingSection> {
    const response = await apiClient.get<LandingSection>(apiEndpoints.customization.landing.get(id));
    return response.data;
  },

  async getByKey(key: string): Promise<LandingSection> {
    const response = await apiClient.get<LandingSection>(apiEndpoints.customization.landing.getByKey(key));
    return response.data;
  },

  async create(data: CreateLandingSectionData): Promise<LandingSection> {
    const response = await apiClient.post<LandingSection>(apiEndpoints.customization.landing.create, data);
    return response.data;
  },

  async update(id: string, data: UpdateLandingSectionData): Promise<LandingSection> {
    const response = await apiClient.put<LandingSection>(apiEndpoints.customization.landing.update(id), data);
    return response.data;
  },

  async toggleActive(id: string, isActive: boolean): Promise<LandingSection> {
    const response = await apiClient.put<LandingSection>(
      apiEndpoints.customization.landing.toggleActive(id),
      { isActive }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.customization.landing.delete(id));
  },
};
