export interface Customer {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  status: 'active' | 'inactive' | 'pending';
  tags: string[];
  totalCampaigns: number;
  totalSpent: number;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
  googleAccount?: {
    connected: boolean;
    email?: string;
    connectedAt?: string;
    refreshToken?: string;
    hasGTMAccess?: boolean;
    hasGA4Access?: boolean;
    hasAdsAccess?: boolean;
    gtmError?: string | null;
    ga4Error?: string | null;
    adsError?: string | null;
    gtmAccountId?: string | null;
    gtmContainerId?: string | null;
    ga4PropertyCount?: number;
    adsAccountCount?: number;
  };
  metadata?: Record<string, any>;
}

export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  status?: 'active' | 'inactive' | 'pending';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string;
}

export interface CustomerFilters {
  search?: string;
  status?: string[];
  tags?: string[];
  hasGoogleAccount?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface CustomerTableParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: CustomerFilters;
}

export interface CustomerResponse {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
  action: (customerIds: string[]) => Promise<void>;
}

export interface GoogleOAuthResponse {
  accessToken: string;
  refreshToken: string;
  email: string;
  name: string;
}

export interface GoogleConnectionStatus {
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
  gtmLastSyncedAt: string | null;
  ga4LastSyncedAt: string | null;
  adsLastSyncedAt: string | null;
}