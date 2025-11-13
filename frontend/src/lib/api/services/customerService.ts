import { apiClient } from '../client';
import { apiEndpoints } from '../config';
import {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  PaginatedCustomersResponse,
  CustomerListParams,
  BulkDeleteRequest,
  BulkUpdateRequest,
  ApiRequestConfig,
  ApiResponse,
} from '../types';

export class CustomerService {
  /**
   * Get list of customers with pagination and filtering
   */
  async getCustomers(
    params?: CustomerListParams,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<PaginatedCustomersResponse>> {
    return apiClient.get<PaginatedCustomersResponse>(apiEndpoints.customers.list, {
      ...config,
      params,
    });
  }

  /**
   * Get a single customer by ID
   */
  async getCustomer(id: string, config?: ApiRequestConfig): Promise<ApiResponse<Customer>> {
    return apiClient.get<Customer>(apiEndpoints.customers.get(id), config);
  }

  /**
   * Create a new customer
   */
  async createCustomer(
    data: CreateCustomerRequest,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer>> {
    return apiClient.post<Customer, CreateCustomerRequest>(
      apiEndpoints.customers.create,
      data,
      config
    );
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerRequest,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer>> {
    return apiClient.put<Customer, UpdateCustomerRequest>(
      apiEndpoints.customers.update(id),
      data,
      config
    );
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string, config?: ApiRequestConfig): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(apiEndpoints.customers.delete(id), config);
  }

  /**
   * Bulk delete customers
   */
  async bulkDeleteCustomers(
    ids: string[],
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ deleted: number; failed: string[] }>> {
    return apiClient.post<{ deleted: number; failed: string[] }, BulkDeleteRequest>(
      apiEndpoints.customers.bulkDelete,
      { ids },
      config
    );
  }

  /**
   * Bulk update customers
   */
  async bulkUpdateCustomers(
    ids: string[],
    data: Partial<UpdateCustomerRequest>,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ updated: number; failed: string[] }>> {
    return apiClient.post<{ updated: number; failed: string[] }, BulkUpdateRequest<UpdateCustomerRequest>>(
      apiEndpoints.customers.bulkUpdate,
      { ids, data },
      config
    );
  }

  /**
   * Export customers to various formats
   */
  async exportCustomers(
    params?: {
      format?: 'csv' | 'excel' | 'pdf';
      filters?: CustomerListParams;
      includeFields?: string[];
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ downloadUrl: string; filename: string }>> {
    return apiClient.post<{ downloadUrl: string; filename: string }>(
      apiEndpoints.customers.export,
      params,
      config
    );
  }

  /**
   * Download customer export file
   */
  async downloadCustomerExport(
    params?: {
      format?: 'csv' | 'excel' | 'pdf';
      filters?: CustomerListParams;
      includeFields?: string[];
    },
    filename?: string,
    config?: ApiRequestConfig
  ): Promise<void> {
    const response = await this.exportCustomers(params, config);
    await apiClient.download(response.data.downloadUrl, filename || response.data.filename);
  }

  /**
   * Get Google connection status
   */
  async getGoogleConnectionStatus(
    id: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    connected: boolean;
    hasAdsAccess: boolean;
    hasGTMAccess: boolean;
    hasGA4Access: boolean;
    googleEmail: string | null;
    connectedAt: string | null;
    gtmError: string | null;
    ga4Error: string | null;
    adsError: string | null;
    gtmAccountId: string | null;
    gtmContainerId: string | null;
    ga4PropertyCount: number;
    adsAccountCount: number;
  }>> {
    return apiClient.get(apiEndpoints.customers.getGoogleStatus(id), config);
  }

  /**
   * Get Google OAuth authorization URL
   */
  async getGoogleAuthUrl(
    id: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ authUrl: string; customerId: string }>> {
    return apiClient.get<{ authUrl: string; customerId: string }>(
      apiEndpoints.customers.getGoogleAuthUrl(id),
      config
    );
  }

  /**
   * Connect Google account for a customer
   */
  async connectGoogleAccount(
    id: string,
    authCode: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer>> {
    return apiClient.post<Customer>(
      apiEndpoints.customers.connectGoogle(id),
      { code: authCode },
      config
    );
  }

  /**
   * Disconnect Google account for a customer
   */
  async disconnectGoogleAccount(
    id: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer>> {
    return apiClient.delete<Customer>(
      apiEndpoints.customers.disconnectGoogle(id),
      config
    );
  }

  /**
   * Search customers
   */
  async searchCustomers(
    query: string,
    params?: {
      limit?: number;
      includeInactive?: boolean;
      filters?: Pick<CustomerListParams, 'status' | 'tags'>;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer[]>> {
    return apiClient.get<Customer[]>(apiEndpoints.customers.list, {
      ...config,
      params: {
        search: query,
        limit: params?.limit || 20,
        ...params?.filters,
      },
    });
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(
    params?: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'day' | 'week' | 'month';
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    growth: {
      total: number;
      active: number;
      percentage: number;
    };
    timeline: Array<{
      date: string;
      count: number;
      active: number;
    }>;
  }>> {
    return apiClient.get<any>('/customers/stats', {
      ...config,
      params,
    });
  }

  /**
   * Get customer activities/history
   */
  async getCustomerActivities(
    id: string,
    params?: {
      page?: number;
      limit?: number;
      activityType?: string;
      startDate?: string;
      endDate?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    data: Array<{
      id: string;
      type: string;
      description: string;
      metadata: Record<string, any>;
      createdAt: string;
    }>;
    pagination: any;
  }>> {
    return apiClient.get<any>(`/customers/${id}/activities`, {
      ...config,
      params,
    });
  }

  /**
   * Validate customer data before creation/update
   */
  async validateCustomerData(
    data: CreateCustomerRequest | UpdateCustomerRequest,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    valid: boolean;
    errors: Array<{
      field: string;
      message: string;
    }>;
  }>> {
    return apiClient.post<any>('/customers/validate', data, config);
  }

  /**
   * Check if customer email is available
   */
  async checkEmailAvailability(
    email: string,
    excludeId?: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{ available: boolean; suggestions?: string[] }>> {
    return apiClient.get<{ available: boolean; suggestions?: string[] }>('/customers/check-email', {
      ...config,
      params: { email, excludeId },
    });
  }

  /**
   * Get customer tags suggestions
   */
  async getTagSuggestions(
    query?: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>('/customers/tag-suggestions', {
      ...config,
      params: { query },
    });
  }

  /**
   * Merge customers
   */
  async mergeCustomers(
    primaryId: string,
    secondaryIds: string[],
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer>> {
    return apiClient.post<Customer>(
      `/customers/${primaryId}/merge`,
      { secondaryIds },
      config
    );
  }

  /**
   * Duplicate customer
   */
  async duplicateCustomer(
    id: string,
    data?: Partial<CreateCustomerRequest>,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<Customer>> {
    return apiClient.post<Customer>(
      `/customers/${id}/duplicate`,
      data || {},
      config
    );
  }

  /**
   * Create tracking configuration
   */
  async createTracking(
    id: string,
    trackingData: {
      name: string;
      type: string;
      selector: string;
      description?: string;
    },
    config?: ApiRequestConfig
  ): Promise<ApiResponse<{
    trackingId: string;
    gtmTriggerId?: string;
    gtmTagId?: string;
    conversionActionId?: string;
    status: string;
    message: string;
  }>> {
    return apiClient.post(
      apiEndpoints.customers.createTracking(id),
      trackingData,
      config
    );
  }
}

// Create and export singleton instance
export const customerService = new CustomerService();

// Export the class for creating custom instances
export default CustomerService;