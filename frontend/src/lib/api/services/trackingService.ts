import axios from 'axios';
import {
  Tracking,
  CreateTrackingRequest,
  UpdateTrackingRequest,
  TrackingResponse,
  TrackingTableParams,
  TrackingAnalytics,
} from '@/types/tracking.types';
import { tokenManager } from '../auth/tokenManager';
import { getBaseURL } from '../config';

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = tokenManager.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const trackingApi = {
  // Get trackings for a customer
  getTrackings: async (
    customerId: string,
    params: TrackingTableParams
  ): Promise<TrackingResponse> => {
    const { page, pageSize, sortBy, sortOrder, filters } = params;

    const searchParams = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });

    if (sortBy) {
      searchParams.append('sortBy', sortBy);
      searchParams.append('sortOrder', sortOrder || 'asc');
    }

    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => searchParams.append('status', status));
    }

    if (filters.type && filters.type.length > 0) {
      filters.type.forEach(type => searchParams.append('type', type));
    }

    if (filters.syncStatus && filters.syncStatus.length > 0) {
      filters.syncStatus.forEach(status =>
        searchParams.append('syncStatus', status)
      );
    }

    if (filters.dateRange?.from) {
      searchParams.append('fromDate', filters.dateRange.from);
    }

    if (filters.dateRange?.to) {
      searchParams.append('toDate', filters.dateRange.to);
    }

    const response = await api.get(
      `/v1/customers/${customerId}/trackings?${searchParams.toString()}`
    );
    return response.data;
  },

  // Get single tracking
  getTracking: async (
    customerId: string,
    trackingId: string
  ): Promise<Tracking> => {
    const response = await api.get(
      `/v1/customers/${customerId}/trackings/${trackingId}`
    );
    return response.data;
  },

  // Create new tracking
  createTracking: async (data: CreateTrackingRequest): Promise<Tracking> => {
    const { customerId, ...trackingData } = data;
    const response = await api.post(
      `/v1/customers/${customerId}/tracking/create`,
      trackingData
    );
    return response.data;
  },

  // Update tracking
  updateTracking: async (data: UpdateTrackingRequest): Promise<Tracking> => {
    const { id, customerId, ...updateData } = data;
    const response = await api.patch(
      `/v1/customers/${customerId}/trackings/${id}`,
      updateData
    );
    return response.data;
  },

  // Delete tracking
  deleteTracking: async (
    customerId: string,
    trackingId: string
  ): Promise<void> => {
    await api.delete(`/v1/customers/${customerId}/trackings/${trackingId}`);
  },

  // Get tracking analytics for a customer
  getTrackingAnalytics: async (
    customerId: string,
    dateRange?: { from: string; to: string }
  ): Promise<TrackingAnalytics> => {
    const searchParams = new URLSearchParams();

    if (dateRange?.from) {
      searchParams.append('fromDate', dateRange.from);
    }

    if (dateRange?.to) {
      searchParams.append('toDate', dateRange.to);
    }

    const response = await api.get(
      `/v1/customers/${customerId}/analytics?${searchParams.toString()}`
    );
    return response.data;
  },

  // Trigger manual sync for a tracking
  syncTracking: async (
    customerId: string,
    trackingId: string
  ): Promise<void> => {
    await api.post(`/v1/customers/${customerId}/trackings/${trackingId}/sync`);
  },

  // Bulk sync all trackings for a customer
  syncAllTrackings: async (customerId: string): Promise<void> => {
    await api.post(`/v1/customers/${customerId}/trackings/sync-all`);
  },

  // Test tracking configuration
  testTracking: async (
    customerId: string,
    trackingId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(
      `/v1/customers/${customerId}/trackings/${trackingId}/test`
    );
    return response.data;
  },
};
