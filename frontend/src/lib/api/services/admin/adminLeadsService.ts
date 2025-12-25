/**
 * Admin Leads API Service
 * Handles admin endpoints for lead management and analytics
 */

import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

export interface AdminLead {
  id: string;
  name: string;
  email: string;
  purpose: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  questionnaireCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  responseCount?: number;
  responses?: {
    id: string;
    questionId: string;
    answer: any;
    question: {
      id: string;
      question: string;
      type: string;
    };
  }[];
  pageViews?: {
    id: string;
    path: string;
    referrer?: string;
    createdAt: string;
  }[];
}

export interface LeadQueryParams {
  search?: string;
  questionnaireCompleted?: boolean;
  startDate?: string;
  endDate?: string;
  source?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeadsListResponse {
  data: AdminLead[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LeadStats {
  totalLeads: number;
  completedQuestionnaires: number;
  pendingQuestionnaires: number;
  todayLeads: number;
  completionRate: number;
  sourceBreakdown: {
    source: string;
    count: number;
  }[];
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface PageViewStats {
  totalViews: number;
  uniqueSessions: number;
  topPages: {
    path: string;
    views: number;
  }[];
}

export const adminLeadsService = {
  /**
   * Get all leads with filtering and pagination
   */
  async getAll(params?: LeadQueryParams): Promise<LeadsListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.questionnaireCompleted !== undefined)
      queryParams.append('questionnaireCompleted', params.questionnaireCompleted.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.source) queryParams.append('source', params.source);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = params
      ? `${apiEndpoints.admin.leads.list}?${queryParams.toString()}`
      : apiEndpoints.admin.leads.list;
    const response = await apiClient.get<LeadsListResponse>(url);
    return response.data;
  },

  /**
   * Get lead by ID with full details
   */
  async getById(id: string): Promise<AdminLead> {
    const response = await apiClient.get<AdminLead>(apiEndpoints.admin.leads.get(id));
    return response.data;
  },

  /**
   * Delete a lead
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.leads.delete(id));
  },

  /**
   * Get lead statistics
   */
  async getStats(): Promise<LeadStats> {
    const response = await apiClient.get<LeadStats>(apiEndpoints.admin.leads.stats);
    return response.data;
  },

  /**
   * Get daily lead counts
   */
  async getDailyCounts(days: number = 30): Promise<DailyCount[]> {
    const response = await apiClient.get<DailyCount[]>(
      `${apiEndpoints.admin.leads.dailyCounts}?days=${days}`
    );
    return response.data;
  },

  /**
   * Get page view statistics
   */
  async getPageViewStats(days: number = 7): Promise<PageViewStats> {
    const response = await apiClient.get<PageViewStats>(
      `${apiEndpoints.admin.leads.pageViews}?days=${days}`
    );
    return response.data;
  },

  /**
   * Export leads to CSV
   */
  async exportLeads(): Promise<any[]> {
    const response = await apiClient.get<any[]>(apiEndpoints.admin.leads.export);
    return response.data;
  },
};
