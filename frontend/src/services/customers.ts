import axios from 'axios';
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerResponse, CustomerTableParams, GoogleOAuthResponse } from '../types/customer.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customersApi = {
  // Get paginated customers with filters
  getCustomers: async (params: CustomerTableParams): Promise<CustomerResponse> => {
    const { page, pageSize, sortBy, sortOrder, filters } = params;
    
    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    if (sortBy) {
      searchParams.append('sortBy', sortBy);
      searchParams.append('sortOrder', sortOrder || 'asc');
    }

    if (filters.search) {
      searchParams.append('search', filters.search);
    }

    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => searchParams.append('status', status));
    }

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => searchParams.append('tags', tag));
    }

    if (filters.hasGoogleAccount !== undefined) {
      searchParams.append('hasGoogleAccount', filters.hasGoogleAccount.toString());
    }

    if (filters.dateRange?.from) {
      searchParams.append('fromDate', filters.dateRange.from);
    }

    if (filters.dateRange?.to) {
      searchParams.append('toDate', filters.dateRange.to);
    }

    const response = await api.get(`/customers?${searchParams.toString()}`);
    // Transform backend response to frontend format
    const backendData = response.data;
    const transformedCustomers = (backendData.data || []).map((customer: any) => ({
      ...customer,
      name: customer.fullName || `${customer.firstName} ${customer.lastName}`.trim(),
      totalCampaigns: 0, // TODO: Get from backend
      totalSpent: 0, // TODO: Get from backend
      status: customer.status?.toLowerCase() || 'active',
    }));

    return {
      customers: transformedCustomers,
      total: backendData.pagination?.total || 0,
      page: backendData.pagination?.page || page,
      pageSize: backendData.pagination?.limit || pageSize,
      totalPages: backendData.pagination?.totalPages || 0,
    };
  },

  // Get single customer
  getCustomer: async (id: string): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    const customer = response.data;
    return {
      ...customer,
      name: customer.fullName || `${customer.firstName} ${customer.lastName}`.trim(),
      totalCampaigns: 0, // TODO: Get from backend
      totalSpent: 0, // TODO: Get from backend
      status: customer.status?.toLowerCase() || 'active',
    };
  },

  // Create new customer
  createCustomer: async (data: CreateCustomerRequest): Promise<Customer> => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  // Update customer
  updateCustomer: async (data: UpdateCustomerRequest): Promise<Customer> => {
    const { id, ...updateData } = data;
    const response = await api.patch(`/customers/${id}`, updateData);
    return response.data;
  },

  // Delete customer
  deleteCustomer: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },

  // Bulk delete customers
  deleteCustomers: async (ids: string[]): Promise<void> => {
    await api.post('/customers/bulk-delete', { ids });
  },

  // Bulk update customer status
  updateCustomersStatus: async (ids: string[], status: string): Promise<void> => {
    await api.post('/customers/bulk-status', { ids, status });
  },

  // Export customers
  exportCustomers: async (params: CustomerTableParams, format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
    const { filters } = params;
    
    const searchParams = new URLSearchParams({
      format,
    });

    if (filters.search) {
      searchParams.append('search', filters.search);
    }

    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => searchParams.append('status', status));
    }

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => searchParams.append('tags', tag));
    }

    if (filters.hasGoogleAccount !== undefined) {
      searchParams.append('hasGoogleAccount', filters.hasGoogleAccount.toString());
    }

    if (filters.dateRange?.from) {
      searchParams.append('fromDate', filters.dateRange.from);
    }

    if (filters.dateRange?.to) {
      searchParams.append('toDate', filters.dateRange.to);
    }

    const response = await api.get(`/customers/export?${searchParams.toString()}`, {
      responseType: 'blob',
    });

    return response.data;
  },

  // Google OAuth flow
  connectGoogleAccount: async (customerId: string): Promise<{ authUrl: string }> => {
    const response = await api.post(`/customers/${customerId}/google/connect`);
    return response.data;
  },

  // Handle OAuth callback
  handleGoogleCallback: async (customerId: string, code: string): Promise<GoogleOAuthResponse> => {
    const response = await api.post(`/customers/${customerId}/google/callback`, { code });
    return response.data;
  },

  // Disconnect Google account
  disconnectGoogleAccount: async (customerId: string): Promise<void> => {
    await api.delete(`/customers/${customerId}/google`);
  },

  // Get Google connection status
  getGoogleConnectionStatus: async (customerId: string): Promise<{
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
  }> => {
    const response = await api.get(`/customers/${customerId}/google/status`);
    return response.data;
  },

  // Get available tags
  getTags: async (): Promise<string[]> => {
    const response = await api.get('/customers/tags');
    return response.data;
  },
};