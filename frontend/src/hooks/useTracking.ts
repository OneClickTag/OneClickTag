import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trackingApi } from '../services/tracking';
import { 
  TrackingTableParams, 
  CreateTrackingRequest, 
  UpdateTrackingRequest
} from '../types/tracking.types';

export const TRACKINGS_QUERY_KEY = 'trackings';
export const TRACKING_ANALYTICS_QUERY_KEY = 'tracking-analytics';

export const useTrackings = (customerId: string, params: TrackingTableParams) => {
  return useQuery({
    queryKey: [TRACKINGS_QUERY_KEY, customerId, params],
    queryFn: () => trackingApi.getTrackings(customerId, params),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTracking = (customerId: string, trackingId: string) => {
  return useQuery({
    queryKey: [TRACKINGS_QUERY_KEY, customerId, trackingId],
    queryFn: () => trackingApi.getTracking(customerId, trackingId),
    enabled: !!customerId && !!trackingId,
  });
};

export const useTrackingAnalytics = (
  customerId: string, 
  dateRange?: { from: string; to: string }
) => {
  return useQuery({
    queryKey: [TRACKING_ANALYTICS_QUERY_KEY, customerId, dateRange],
    queryFn: () => trackingApi.getTrackingAnalytics(customerId, dateRange),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTrackingRequest) => trackingApi.createTracking(data),
    onSuccess: (newTracking) => {
      queryClient.invalidateQueries({ queryKey: [TRACKINGS_QUERY_KEY, newTracking.customerId] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_ANALYTICS_QUERY_KEY, newTracking.customerId] });
    },
  });
};

export const useUpdateTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTrackingRequest) => trackingApi.updateTracking(data),
    onSuccess: (updatedTracking) => {
      queryClient.invalidateQueries({ queryKey: [TRACKINGS_QUERY_KEY, updatedTracking.customerId] });
      queryClient.setQueryData(
        [TRACKINGS_QUERY_KEY, updatedTracking.customerId, updatedTracking.id], 
        updatedTracking
      );
    },
  });
};

export const useDeleteTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, trackingId }: { customerId: string; trackingId: string }) =>
      trackingApi.deleteTracking(customerId, trackingId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: [TRACKINGS_QUERY_KEY, customerId] });
      queryClient.invalidateQueries({ queryKey: [TRACKING_ANALYTICS_QUERY_KEY, customerId] });
    },
  });
};

export const useSyncTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, trackingId }: { customerId: string; trackingId: string }) =>
      trackingApi.syncTracking(customerId, trackingId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: [TRACKINGS_QUERY_KEY, customerId] });
    },
  });
};

export const useSyncAllTrackings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (customerId: string) => trackingApi.syncAllTrackings(customerId),
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: [TRACKINGS_QUERY_KEY, customerId] });
    },
  });
};

export const useTestTracking = () => {
  return useMutation({
    mutationFn: ({ customerId, trackingId }: { customerId: string; trackingId: string }) =>
      trackingApi.testTracking(customerId, trackingId),
  });
};