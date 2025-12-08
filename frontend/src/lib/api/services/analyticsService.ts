import axios from 'axios';
import {
  AnalyticsFilters,
  CustomerUsageMetrics,
  CampaignPerformance,
  SystemHealthMetrics,
  DashboardOverview,
  GeographicData,
  FunnelData,
  ExportRequest,
  ExportResponse,
  AnalyticsResponse,
} from '@/types/analytics.types';
import { getBaseURL } from '../config';

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const analyticsApi = {
  // Dashboard Overview
  getDashboardOverview: async (
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<DashboardOverview>> => {
    const response = await api.post('/v1/analytics/overview', filters);
    return response.data;
  },

  // Customer Usage Metrics
  getCustomerUsageMetrics: async (
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<CustomerUsageMetrics[]>> => {
    const response = await api.post('/v1/analytics/customer-usage', filters);
    return response.data;
  },

  getCustomerUsageById: async (
    customerId: string,
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<CustomerUsageMetrics>> => {
    const response = await api.post(
      `/v1/analytics/customer-usage/${customerId}`,
      filters
    );
    return response.data;
  },

  // Campaign Performance
  getCampaignPerformance: async (
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<CampaignPerformance[]>> => {
    const response = await api.post('/v1/analytics/campaign-performance', filters);
    return response.data;
  },

  getCampaignPerformanceById: async (
    campaignId: string,
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<CampaignPerformance>> => {
    const response = await api.post(
      `/v1/analytics/campaign-performance/${campaignId}`,
      filters
    );
    return response.data;
  },

  // System Health
  getSystemHealth: async (): Promise<SystemHealthMetrics> => {
    const response = await api.get('/v1/analytics/system-health');
    return response.data;
  },

  getSystemHealthHistory: async (
    filters: AnalyticsFilters
  ): Promise<
    AnalyticsResponse<
      Array<{
        timestamp: string;
        overall: number;
        api: number;
        gtm: number;
        database: number;
        realtime: number;
      }>
    >
  > => {
    const response = await api.post(
      '/v1/analytics/system-health/history',
      filters
    );
    return response.data;
  },

  // Geographic Analytics
  getGeographicData: async (
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<GeographicData[]>> => {
    const response = await api.post('/v1/analytics/geographic', filters);
    return response.data;
  },

  // Funnel Analysis
  getFunnelData: async (
    filters: AnalyticsFilters
  ): Promise<AnalyticsResponse<FunnelData[]>> => {
    const response = await api.post('/v1/analytics/funnel', filters);
    return response.data;
  },

  // Real-time Analytics
  getRealTimeMetrics: async (): Promise<{
    activeUsers: number;
    eventsPerMinute: number;
    conversionsPerMinute: number;
    revenuePerMinute: number;
    topPages: Array<{ page: string; views: number }>;
    topCampaigns: Array<{ name: string; events: number }>;
    errorRate: number;
  }> => {
    const response = await api.get('/v1/analytics/realtime');
    return response.data;
  },

  // Comparative Analytics
  getComparativeData: async (
    period1: AnalyticsFilters,
    period2: AnalyticsFilters
  ): Promise<{
    period1: DashboardOverview;
    period2: DashboardOverview;
    comparison: {
      customers: {
        value: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
      campaigns: {
        value: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
      events: {
        value: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
      conversions: {
        value: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
      revenue: {
        value: number;
        change: number;
        trend: 'up' | 'down' | 'stable';
      };
    };
  }> => {
    const response = await api.post('/v1/analytics/compare', { period1, period2 });
    return response.data;
  },

  // Advanced Analytics
  getCohortAnalysis: async (
    filters: AnalyticsFilters
  ): Promise<
    AnalyticsResponse<
      Array<{
        cohort: string;
        period: number;
        customers: number;
        retention: number;
        revenue: number;
      }>
    >
  > => {
    const response = await api.post('/v1/analytics/cohort', filters);
    return response.data;
  },

  getCustomerSegmentation: async (
    filters: AnalyticsFilters
  ): Promise<
    AnalyticsResponse<
      Array<{
        segment: string;
        customers: number;
        avgRevenue: number;
        avgCampaigns: number;
        conversionRate: number;
      }>
    >
  > => {
    const response = await api.post('/v1/analytics/segmentation', filters);
    return response.data;
  },

  // Export Data
  exportData: async (request: ExportRequest): Promise<ExportResponse> => {
    const response = await api.post('/v1/analytics/export', request);
    return response.data;
  },

  downloadExport: async (downloadUrl: string): Promise<Blob> => {
    const response = await api.get(downloadUrl, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Data Refresh
  refreshAnalytics: async (): Promise<{
    message: string;
    estimatedTime: number;
  }> => {
    const response = await api.post('/v1/analytics/refresh');
    return response.data;
  },

  // Custom Queries
  executeCustomQuery: async (query: {
    metrics: string[];
    dimensions: string[];
    filters: Record<string, any>;
    dateRange: { from: string; to: string };
  }): Promise<AnalyticsResponse<any[]>> => {
    const response = await api.post('/v1/analytics/custom-query', query);
    return response.data;
  },

  // Alerts and Notifications
  getAnalyticsAlerts: async (): Promise<
    Array<{
      id: string;
      type: 'threshold' | 'anomaly' | 'system';
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      message: string;
      timestamp: string;
      isRead: boolean;
      metadata?: any;
    }>
  > => {
    const response = await api.get('/v1/analytics/alerts');
    return response.data;
  },

  markAlertAsRead: async (alertId: string): Promise<void> => {
    await api.patch(`/v1/analytics/alerts/${alertId}/read`);
  },

  // Benchmarking
  getBenchmarkData: async (
    filters: AnalyticsFilters
  ): Promise<{
    industry: {
      avgConversionRate: number;
      avgRevenuePerCustomer: number;
      avgCampaignsPerCustomer: number;
    };
    yourPerformance: {
      conversionRate: number;
      revenuePerCustomer: number;
      campaignsPerCustomer: number;
    };
    percentile: number;
    recommendations: string[];
  }> => {
    const response = await api.post('/v1/analytics/benchmark', filters);
    return response.data;
  },
};
