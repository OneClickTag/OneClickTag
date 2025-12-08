import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api/services';
import { AnalyticsFilters, ExportRequest } from '../types/analytics.types';

export const ANALYTICS_QUERY_KEYS = {
  dashboard: 'analytics-dashboard',
  customerUsage: 'analytics-customer-usage',
  campaignPerformance: 'analytics-campaign-performance',
  systemHealth: 'analytics-system-health',
  geographic: 'analytics-geographic',
  funnel: 'analytics-funnel',
  realtime: 'analytics-realtime',
  comparative: 'analytics-comparative',
  cohort: 'analytics-cohort',
  segmentation: 'analytics-segmentation',
  alerts: 'analytics-alerts',
  benchmark: 'analytics-benchmark',
} as const;

// Dashboard Overview
export const useDashboardOverview = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.dashboard, filters],
    queryFn: () => analyticsApi.getDashboardOverview(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
};

// Customer Usage Metrics
export const useCustomerUsageMetrics = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.customerUsage, filters],
    queryFn: () => analyticsApi.getCustomerUsageMetrics(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCustomerUsageById = (customerId: string, filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.customerUsage, customerId, filters],
    queryFn: () => analyticsApi.getCustomerUsageById(customerId, filters),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
};

// Campaign Performance
export const useCampaignPerformance = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.campaignPerformance, filters],
    queryFn: () => analyticsApi.getCampaignPerformance(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCampaignPerformanceById = (campaignId: string, filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.campaignPerformance, campaignId, filters],
    queryFn: () => analyticsApi.getCampaignPerformanceById(campaignId, filters),
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000,
  });
};

// System Health
export const useSystemHealth = () => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.systemHealth],
    queryFn: () => analyticsApi.getSystemHealth(),
    refetchInterval: 30 * 1000, // 30 seconds
    staleTime: 15 * 1000, // 15 seconds
  });
};

export const useSystemHealthHistory = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.systemHealth, 'history', filters],
    queryFn: () => analyticsApi.getSystemHealthHistory(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Geographic Data
export const useGeographicData = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.geographic, filters],
    queryFn: () => analyticsApi.getGeographicData(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Funnel Analysis
export const useFunnelData = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.funnel, filters],
    queryFn: () => analyticsApi.getFunnelData(filters),
    staleTime: 5 * 60 * 1000,
  });
};

// Real-time Metrics
export const useRealTimeMetrics = () => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.realtime],
    queryFn: () => analyticsApi.getRealTimeMetrics(),
    refetchInterval: 10 * 1000, // 10 seconds
    staleTime: 5 * 1000, // 5 seconds
  });
};

// Comparative Analytics
export const useComparativeData = (period1: AnalyticsFilters, period2: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.comparative, period1, period2],
    queryFn: () => analyticsApi.getComparativeData(period1, period2),
    staleTime: 5 * 60 * 1000,
  });
};

// Cohort Analysis
export const useCohortAnalysis = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.cohort, filters],
    queryFn: () => analyticsApi.getCohortAnalysis(filters),
    staleTime: 10 * 60 * 1000,
  });
};

// Customer Segmentation
export const useCustomerSegmentation = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.segmentation, filters],
    queryFn: () => analyticsApi.getCustomerSegmentation(filters),
    staleTime: 10 * 60 * 1000,
  });
};

// Analytics Alerts
export const useAnalyticsAlerts = () => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.alerts],
    queryFn: () => analyticsApi.getAnalyticsAlerts(),
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Benchmark Data
export const useBenchmarkData = (filters: AnalyticsFilters) => {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEYS.benchmark, filters],
    queryFn: () => analyticsApi.getBenchmarkData(filters),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// Mutations
export const useExportData = () => {
  return useMutation({
    mutationFn: (request: ExportRequest) => analyticsApi.exportData(request),
  });
};

export const useRefreshAnalytics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => analyticsApi.refreshAnalytics(),
    onSuccess: () => {
      // Invalidate all analytics queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return Object.values(ANALYTICS_QUERY_KEYS).some(key => 
            query.queryKey[0] === key
          );
        }
      });
    },
  });
};

export const useMarkAlertAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => analyticsApi.markAlertAsRead(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ANALYTICS_QUERY_KEYS.alerts] });
    },
  });
};

export const useCustomQuery = () => {
  return useMutation({
    mutationFn: (query: {
      metrics: string[];
      dimensions: string[];
      filters: Record<string, any>;
      dateRange: { from: string; to: string };
    }) => analyticsApi.executeCustomQuery(query),
  });
};