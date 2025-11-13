export interface Tracking {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  type: 'conversion' | 'event' | 'pageview' | 'custom';
  status: 'active' | 'inactive' | 'pending' | 'error';
  conversionValue?: number;
  currency?: string;
  targetUrl?: string;
  eventName?: string;
  pixelId?: string;
  gtmTrackingId?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  syncStatus: 'synced' | 'pending' | 'error' | 'not_synced';
  errorMessage?: string;
  metadata?: Record<string, any>;
  analytics?: {
    totalEvents: number;
    totalConversions: number;
    conversionRate: number;
    totalValue: number;
  };
}

export interface CreateTrackingRequest {
  customerId: string;
  name: string;
  description?: string;
  type: 'conversion' | 'event' | 'pageview' | 'custom';
  conversionValue?: number;
  currency?: string;
  targetUrl?: string;
  eventName?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTrackingRequest extends Partial<CreateTrackingRequest> {
  id: string;
}

export interface TrackingFilters {
  status?: string[];
  type?: string[];
  syncStatus?: string[];
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface TrackingTableParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: TrackingFilters;
}

export interface TrackingResponse {
  trackings: Tracking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrackingAnalytics {
  totalTrackings: number;
  activeTrackings: number;
  totalEvents: number;
  totalConversions: number;
  totalValue: number;
  conversionRate: number;
  recentActivity: {
    date: string;
    events: number;
    conversions: number;
    value: number;
  }[];
  performanceByType: {
    type: string;
    count: number;
    conversions: number;
    value: number;
  }[];
  syncHealth: {
    synced: number;
    pending: number;
    errors: number;
  };
}

export interface SyncStatus {
  trackingId: string;
  status: 'synced' | 'pending' | 'error';
  message?: string;
  timestamp: string;
}

export interface SSEMessage {
  type: 'sync_status' | 'tracking_update' | 'analytics_update';
  data: SyncStatus | Tracking | TrackingAnalytics;
}