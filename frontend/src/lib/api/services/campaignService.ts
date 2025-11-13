import { apiClient } from '../client';
import { apiEndpoints } from '../config';
import {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  PaginatedCampaignsResponse,
  CampaignListParams,
  ApiRequestConfig,
  ApiResponse,
  CampaignSyncEvent,
} from '../types';

export class CampaignService {
  /**
   * Get list of campaigns with pagination and filtering
   */
  async getCampaigns(
    params?: CampaignListParams,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<PaginatedCampaignsResponse>> {
    return apiClient.get<PaginatedCampaignsResponse>(apiEndpoints.campaigns.list, {
      ...config,
      params,
    });
  }

  /**
   * Get a single campaign by ID
   */
  async getCampaign(id: string, config?: ApiRequestConfig): Promise<ApiResponse<Campaign>> {
    return apiClient.get<Campaign>(apiEndpoints.campaigns.get(id), config);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    data: CreateCampaignRequest,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign, CreateCampaignRequest>(
      apiEndpoints.campaigns.create,
      data,
      config
    );
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(
    id: string,
    data: UpdateCampaignRequest,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Campaign>> {
    return apiClient.put<Campaign, UpdateCampaignRequest>(
      apiEndpoints.campaigns.update(id),
      data,
      config
    );
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(id: string, config?: ApiRequestConfig): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(apiEndpoints.campaigns.delete(id), config);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(
    id: string,
    params?: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'hour' | 'day' | 'week' | 'month';
      metrics?: string[];
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    summary: {
      totalEvents: number;
      totalConversions: number;
      conversionRate: number;
      revenue: number;
      uniqueUsers: number;
    };
    timeline: Array<{
      date: string;
      events: number;
      conversions: number;
      conversionRate: number;
      revenue: number;
    }>;
    breakdown: {
      bySource: Record<string, number>;
      byDevice: Record<string, number>;
      byLocation: Record<string, number>;
    };
  }>> {
    return apiClient.get<any>(apiEndpoints.campaigns.analytics(id), {
      ...config,
      params,
    });
  }

  /**
   * Get campaign events
   */
  async getCampaignEvents(
    id: string,
    params?: {
      page?: number;
      limit?: number;
      eventType?: string;
      startDate?: string;
      endDate?: string;
      userId?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    data: Array<{
      id: string;
      type: string;
      userId?: string;
      sessionId: string;
      properties: Record<string, any>;
      timestamp: string;
      ipAddress?: string;
      userAgent?: string;
    }>;
    pagination: any;
  }>> {
    return apiClient.get<any>(apiEndpoints.campaigns.events(id), {
      ...config,
      params,
    });
  }

  /**
   * Sync campaign with Google Tag Manager
   */
  async syncWithGTM(
    id: string,
    params?: {
      containerId?: string;
      workspaceId?: string;
      publishAfterSync?: boolean;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    syncId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message?: string;
  }>> {
    return apiClient.post<any>(
      apiEndpoints.campaigns.gtmSync(id),
      params || {},
      config
    );
  }

  /**
   * Get GTM sync status
   */
  async getGTMSyncStatus(
    id: string,
    syncId: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<CampaignSyncEvent>> {
    return apiClient.get<CampaignSyncEvent>(
      `${apiEndpoints.campaigns.gtmSync(id)}/${syncId}`,
      config
    );
  }

  /**
   * Test campaign configuration
   */
  async testCampaign(
    id: string,
    testData?: {
      url?: string;
      userId?: string;
      properties?: Record<string, any>;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    success: boolean;
    triggered: boolean;
    errors: string[];
    debugInfo: Record<string, any>;
  }>> {
    return apiClient.post<any>(
      `/campaigns/${id}/test`,
      testData || {},
      config
    );
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(
    id: string,
    data?: {
      name?: string;
      customerId?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign>(
      `/campaigns/${id}/duplicate`,
      data || {},
      config
    );
  }

  /**
   * Get campaign templates
   */
  async getCampaignTemplates(
    params?: {
      category?: string;
      industry?: string;
      type?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    type: string;
    config: any;
    preview?: string;
  }>>> {
    return apiClient.get<any>('/campaigns/templates', {
      ...config,
      params,
    });
  }

  /**
   * Create campaign from template
   */
  async createFromTemplate(
    templateId: string,
    data: {
      name: string;
      customerId: string;
      config?: Record<string, any>;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Campaign>> {
    return apiClient.post<Campaign>(
      `/campaigns/templates/${templateId}/create`,
      data,
      config
    );
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(id: string, config?: ApiRequestConfig): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(
      apiEndpoints.campaigns.update(id),
      { status: 'paused' },
      config
    );
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(id: string, config?: ApiRequestConfig): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(
      apiEndpoints.campaigns.update(id),
      { status: 'active' },
      config
    );
  }

  /**
   * Complete campaign
   */
  async completeCampaign(id: string, config?: ApiRequestConfig): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<Campaign>(
      apiEndpoints.campaigns.update(id),
      { status: 'completed' },
      config
    );
  }

  /**
   * Get campaign performance summary
   */
  async getCampaignSummary(
    params?: {
      customerId?: string;
      status?: string[];
      startDate?: string;
      endDate?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalEvents: number;
    totalConversions: number;
    averageConversionRate: number;
    topPerformers: Array<{
      id: string;
      name: string;
      conversionRate: number;
      totalConversions: number;
    }>;
    recentActivity: Array<{
      campaignId: string;
      campaignName: string;
      type: string;
      description: string;
      timestamp: string;
    }>;
  }>> {
    return apiClient.get<any>('/campaigns/summary', {
      ...config,
      params,
    });
  }

  /**
   * Validate campaign configuration
   */
  async validateCampaignConfig(
    config: CreateCampaignRequest['config'],
    type: string,
    requestConfig?: ApiRequestConfig
  ): Promise<ApiResponse<{
    valid: boolean;
    errors: Array<{
      field: string;
      message: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
    }>;
  }>> {
    return apiClient.post<any>('/campaigns/validate-config', {
      config,
      type,
    }, requestConfig);
  }

  /**
   * Get campaign suggestions based on customer data
   */
  async getCampaignSuggestions(
    customerId: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Array<{
    type: string;
    name: string;
    description: string;
    config: any;
    reasoning: string;
    estimatedConversions: number;
  }>>> {
    return apiClient.get<any>(`/campaigns/suggestions/${customerId}`, config);
  }

  /**
   * Export campaign data
   */
  async exportCampaignData(
    id: string,
    params?: {
      format?: 'csv' | 'excel' | 'json';
      dataType?: 'events' | 'analytics' | 'config';
      startDate?: string;
      endDate?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ downloadUrl: string; filename: string }>> {
    return apiClient.post<{ downloadUrl: string; filename: string }>(
      `/campaigns/${id}/export`,
      params,
      config
    );
  }
}

// Create and export singleton instance
export const campaignService = new CampaignService();

// Export the class for creating custom instances
export default CampaignService;