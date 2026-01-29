// Customer API Types for Next.js
// Migrated from NestJS DTOs

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum CustomerSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  EMAIL = 'email',
  COMPANY = 'company',
  STATUS = 'status',
}

// Request Types
export interface CreateCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  status?: CustomerStatus;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateCustomerInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  status?: CustomerStatus;
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  company?: string;
  tags?: string[];
  hasGoogleAccount?: boolean;
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
  includeGoogleAds?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ConnectGoogleAccountInput {
  code: string;
  redirectUri?: string;
}

// Response Types
export interface GoogleAdsAccountResponse {
  id: string;
  googleAccountId: string;
  accountId: string;
  accountName: string;
  currency: string;
  timeZone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleAccountInfo {
  connected: boolean;
  email?: string;
  connectedAt?: string;
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
}

export interface CustomerResponse {
  id: string;
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  company?: string | null;
  phone?: string | null;
  status: CustomerStatus;
  tags: string[];
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
  googleAccountId?: string | null;
  googleEmail?: string | null;
  googleAccount?: GoogleAccountInfo;
  googleAdsAccounts?: GoogleAdsAccountResponse[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedCustomerResponse {
  data: CustomerResponse[];
  pagination: PaginationInfo;
  filters: {
    search?: string;
    status?: CustomerStatus;
    company?: string;
    tags?: string[];
    hasGoogleAccount?: boolean;
    createdAfter?: string;
    createdBefore?: string;
  };
  sort: {
    field: CustomerSortField;
    order: SortOrder;
  };
}

export interface CustomerStatsResponse {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
  withGoogleAccount: number;
  withoutGoogleAccount: number;
  recentlyCreated: number;
  tenantId: string;
  lastUpdated: Date;
}

export interface CustomerTrackingsResponse {
  trackings: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    selector?: string | null;
    urlPattern?: string | null;
    createdAt: Date;
    updatedAt: Date;
    conversionAction?: {
      id: string;
      name: string;
      status: string;
    } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CustomerAnalyticsResponse {
  totalTrackings: number;
  activeTrackings: number;
  failedTrackings: number;
  syncRate: number;
  totalEvents: number;
  recentActivity: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    updatedAt: Date;
  }>;
}

// Bulk Operations
export interface BulkCreateCustomerInput {
  customers: CreateCustomerInput[];
}

export interface BulkUpdateCustomerInput {
  updates: Array<{
    id: string;
    data: UpdateCustomerInput;
  }>;
}

export interface BulkDeleteCustomerInput {
  customerIds: string[];
}

export interface BulkOperationResult {
  success: boolean;
  customerId: string;
  result?: CustomerResponse;
  error?: string;
}
