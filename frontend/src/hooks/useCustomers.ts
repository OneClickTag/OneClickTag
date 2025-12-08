import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../lib/api/services';
import { CustomerTableParams, CreateCustomerRequest, UpdateCustomerRequest } from '../types/customer.types';

export const CUSTOMERS_QUERY_KEY = 'customers';

export const useCustomers = (params: CustomerTableParams) => {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, params],
    queryFn: () => customersApi.getCustomers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, id],
    queryFn: () => customersApi.getCustomer(id),
    enabled: !!id,
  });
};

export const useCustomerBySlug = (slug: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, 'slug', slug],
    queryFn: () => customersApi.getCustomerBySlug(slug),
    enabled: !!slug && (options?.enabled !== false),
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customersApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCustomerRequest) => customersApi.updateCustomer(data),
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      queryClient.setQueryData([CUSTOMERS_QUERY_KEY, updatedCustomer.id], updatedCustomer);
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useBulkDeleteCustomers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => customersApi.deleteCustomers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useBulkUpdateCustomersStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      customersApi.updateCustomersStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useExportCustomers = () => {
  return useMutation({
    mutationFn: ({ params, format }: { params: CustomerTableParams; format?: 'csv' | 'excel' }) =>
      customersApi.exportCustomers(params, format),
  });
};

export const useConnectGoogleAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => customersApi.connectGoogleAccount(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useHandleGoogleCallback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, code }: { customerId: string; code: string }) =>
      customersApi.handleGoogleCallback(customerId, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useDisconnectGoogleAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => customersApi.disconnectGoogleAccount(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
    },
  });
};

export const useTags = () => {
  return useQuery({
    queryKey: ['customer-tags'],
    queryFn: () => customersApi.getTags(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useGoogleConnectionStatus = (customerId: string) => {
  return useQuery({
    queryKey: [CUSTOMERS_QUERY_KEY, customerId, 'google-status'],
    queryFn: () => customersApi.getGoogleConnectionStatus(customerId),
    enabled: !!customerId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};