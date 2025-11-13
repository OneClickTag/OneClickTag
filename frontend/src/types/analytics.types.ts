export interface DateRange {
  from: string;
  to: string;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  customerIds?: string[];
  campaignTypes?: string[];
  status?: string[];
}

// Customer Usage Metrics
export interface CustomerUsageMetrics {
  customerId: string;
  customerName: string;
  totalCampaigns: number;
  activeCampaigns: number;
  totalEvents: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  avgCampaignValue: number;
  lastActivity: string;
  usageGrowth: {
    campaigns: number; // percentage change
    events: number;
    conversions: number;
    revenue: number;
  };
  monthlyUsage: Array<{
    month: string;
    campaigns: number;
    events: number;
    conversions: number;
    revenue: number;
  }>;
}

// Campaign Performance
export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  customerId: string;
  customerName: string;
  type: string;
  status: string;
  createdAt: string;
  totalEvents: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  avgEventValue: number;
  costPerConversion: number;
  roi: number;
  dailyMetrics: Array<{
    date: string;
    events: number;
    conversions: number;
    revenue: number;
    clicks?: number;
    impressions?: number;
  }>;
  performanceTrend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

// System Health
export interface SystemHealthMetrics {
  overall: {
    status: 'healthy' | 'warning' | 'critical';
    score: number; // 0-100
    lastUpdated: string;
  };
  apiHealth: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number; // ms
    errorRate: number; // percentage
    uptime: number; // percentage
    requestsPerMinute: number;
  };
  gtmSync: {
    status: 'healthy' | 'degraded' | 'failing';
    successRate: number; // percentage
    avgSyncTime: number; // ms
    pendingJobs: number;
    failedJobs: number;
    lastSync: string;
  };
  database: {
    status: 'healthy' | 'slow' | 'down';
    queryTime: number; // ms
    connections: number;
    slowQueries: number;
    diskUsage: number; // percentage
  };
  realtime: {
    status: 'healthy' | 'degraded' | 'down';
    activeConnections: number;
    messagesPerSecond: number;
    connectionErrors: number;
    latency: number; // ms
  };
  errors: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    component: string;
    timestamp: string;
    count: number;
  }>;
}

// Overview Dashboard Data
export interface DashboardOverview {
  totalCustomers: number;
  totalCampaigns: number;
  totalEvents: number;
  totalConversions: number;
  totalRevenue: number;
  avgConversionRate: number;
  growth: {
    customers: number;
    campaigns: number;
    events: number;
    conversions: number;
    revenue: number;
  };
  topPerformers: {
    customers: Array<{
      customerId: string;
      name: string;
      revenue: number;
      conversions: number;
    }>;
    campaigns: Array<{
      campaignId: string;
      name: string;
      customerName: string;
      conversions: number;
      revenue: number;
      roi: number;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'campaign_created' | 'conversion' | 'customer_added' | 'system_event';
    description: string;
    timestamp: string;
    metadata?: any;
  }>;
  timeSeriesData: Array<{
    date: string;
    customers: number;
    campaigns: number;
    events: number;
    conversions: number;
    revenue: number;
  }>;
}

// Geographic Analytics
export interface GeographicData {
  country: string;
  countryCode: string;
  customers: number;
  campaigns: number;
  events: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

// Funnel Analysis
export interface FunnelData {
  stage: string;
  users: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
}

// Export Data
export interface ExportRequest {
  type: 'customer_usage' | 'campaign_performance' | 'system_health' | 'overview';
  format: 'csv' | 'excel' | 'pdf';
  filters: AnalyticsFilters;
  includeCharts?: boolean;
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  [key: string]: any;
}

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface BarChartData {
  name: string;
  value: number;
  [key: string]: any;
}

// Analytics Response Types
export interface AnalyticsResponse<T> {
  data: T;
  filters: AnalyticsFilters;
  generatedAt: string;
  totalRecords?: number;
  aggregations?: {
    sum?: number;
    avg?: number;
    min?: number;
    max?: number;
  };
}