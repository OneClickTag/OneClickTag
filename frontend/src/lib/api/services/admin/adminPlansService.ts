import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

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
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanData {
  name: string;
  description?: string;
  features: string[];
  price: number;
  billingPeriod: string;
  currency?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  order?: number;
  ctaText?: string;
  ctaUrl?: string;
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  features?: string[];
  price?: number;
  billingPeriod?: string;
  currency?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  order?: number;
  ctaText?: string;
  ctaUrl?: string;
}

export interface ToggleActiveData {
  isActive: boolean;
}

export const adminPlansService = {
  /**
   * Get all plans
   */
  async getAll(): Promise<Plan[]> {
    const response = await apiClient.get<Plan[]>(apiEndpoints.admin.plans.list);
    return response.data;
  },

  /**
   * Get plan by ID
   */
  async getById(id: string): Promise<Plan> {
    const response = await apiClient.get<Plan>(apiEndpoints.admin.plans.get(id));
    return response.data;
  },

  /**
   * Create new plan
   */
  async create(data: CreatePlanData): Promise<Plan> {
    const response = await apiClient.post<Plan>(apiEndpoints.admin.plans.create, data);
    return response.data;
  },

  /**
   * Update plan
   */
  async update(id: string, data: UpdatePlanData): Promise<Plan> {
    const response = await apiClient.put<Plan>(apiEndpoints.admin.plans.update(id), data);
    return response.data;
  },

  /**
   * Delete plan
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.plans.delete(id));
  },

  /**
   * Toggle active status
   */
  async toggleActive(id: string, data: ToggleActiveData): Promise<Plan> {
    const response = await apiClient.put<Plan>(apiEndpoints.admin.plans.toggleActive(id), data);
    return response.data;
  },
};
