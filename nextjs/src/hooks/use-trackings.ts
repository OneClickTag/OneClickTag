'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export type TrackingType =
  | 'BUTTON_CLICK'
  | 'LINK_CLICK'
  | 'PAGE_VIEW'
  | 'ELEMENT_VISIBILITY'
  | 'FORM_SUBMIT'
  | 'FORM_START'
  | 'FORM_ABANDON'
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'ADD_TO_WISHLIST'
  | 'VIEW_CART'
  | 'CHECKOUT_START'
  | 'CHECKOUT_STEP'
  | 'PURCHASE'
  | 'PRODUCT_VIEW'
  | 'PHONE_CALL_CLICK'
  | 'EMAIL_CLICK'
  | 'DOWNLOAD'
  | 'DEMO_REQUEST'
  | 'SIGNUP'
  | 'SCROLL_DEPTH'
  | 'TIME_ON_PAGE'
  | 'VIDEO_PLAY'
  | 'VIDEO_COMPLETE'
  | 'SITE_SEARCH'
  | 'FILTER_USE'
  | 'TAB_SWITCH'
  | 'ACCORDION_EXPAND'
  | 'MODAL_OPEN'
  | 'SOCIAL_SHARE'
  | 'SOCIAL_CLICK'
  | 'PDF_DOWNLOAD'
  | 'FILE_DOWNLOAD'
  | 'NEWSLETTER_SIGNUP'
  | 'CUSTOM_EVENT';

export type TrackingStatus =
  | 'PENDING'
  | 'CREATING'
  | 'ACTIVE'
  | 'FAILED'
  | 'PAUSED'
  | 'SYNCING';

export type TrackingDestination = 'GA4' | 'GOOGLE_ADS' | 'BOTH';

export interface Tracking {
  id: string;
  name: string;
  type: TrackingType;
  description?: string;
  status: TrackingStatus;
  selector?: string;
  urlPattern?: string;
  config?: Record<string, unknown>;
  destinations: TrackingDestination[];
  gtmTriggerId?: string;
  gtmTagId?: string;
  ga4EventName?: string;
  adsConversionLabel?: string;
  customerId: string;
  lastError?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingsResponse {
  trackings: Tracking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrackingFilters {
  page?: number;
  pageSize?: number;
  customerId?: string;
  status?: TrackingStatus;
  type?: TrackingType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTrackingInput {
  name: string;
  type: TrackingType;
  description?: string;
  selector?: string;
  urlPattern?: string;
  config?: Record<string, unknown>;
  destinations?: TrackingDestination[];
  ga4EventName?: string;
  customerId: string;
}

export function useTrackings(filters: TrackingFilters = {}) {
  const api = useApi();
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: ['trackings', filters],
    queryFn: () => api.get<TrackingsResponse>(`/api/trackings?${queryString}`),
    staleTime: 30_000,
  });
}

export function useTracking(id: string) {
  const api = useApi();

  return useQuery({
    queryKey: ['tracking', id],
    queryFn: () => api.get<Tracking>(`/api/trackings/${id}`),
    enabled: !!id,
  });
}

export function useCustomerTrackings(customerId: string) {
  return useTrackings({ customerId });
}

export function useCreateTracking() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTrackingInput) => api.post<Tracking>('/api/trackings', data),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
      queryClient.invalidateQueries({ queryKey: ['trackings', { customerId }] });
    },
  });
}

export function useUpdateTracking() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tracking> }) =>
      api.put<Tracking>(`/api/trackings/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
      queryClient.invalidateQueries({ queryKey: ['tracking', id] });
    },
  });
}

export function useDeleteTracking() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/trackings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
    },
  });
}

export function useSyncTracking() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post(`/api/trackings/${id}/sync`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tracking', id] });
      queryClient.invalidateQueries({ queryKey: ['trackings'] });
    },
  });
}
