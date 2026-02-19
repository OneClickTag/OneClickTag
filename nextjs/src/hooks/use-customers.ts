'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export interface Customer {
  id: string;
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  company?: string;
  phone?: string;
  websiteUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  tags: string[];
  notes?: string;
  googleAccountId?: string;
  googleEmail?: string;
  gtmContainerId?: string;
  gtmWorkspaceId?: string;
  gtmContainerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useCustomers(filters: CustomerFilters = {}) {
  const api = useApi();
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: ['customers', filters],
    queryFn: () => api.get<CustomersResponse>(`/api/customers?${queryString}`),
    staleTime: 30_000,
  });
}

export function useCustomer(id: string) {
  const api = useApi();

  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/api/customers/${id}`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Customer>) => api.post<Customer>('/api/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.put<Customer>(`/api/customers/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

export function useDeleteCustomer() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useConnectGoogleAccount() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) =>
      api.post<{ authUrl: string }>(`/api/customers/${customerId}/connect-google`),
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
  });
}
