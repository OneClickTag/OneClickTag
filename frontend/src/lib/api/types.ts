import { components, operations, paths } from './generated/schema';

// Re-export generated types
export type { components, operations, paths };

// Extract commonly used types
export type User = components['schemas']['User'];
export type Customer = components['schemas']['Customer'];
export type Campaign = components['schemas']['Campaign'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type LoginResponse = components['schemas']['LoginResponse'];
export type CreateCustomerRequest = components['schemas']['CreateCustomerRequest'];
export type UpdateCustomerRequest = components['schemas']['UpdateCustomerRequest'];
export type CreateCampaignRequest = components['schemas']['CreateCampaignRequest'];
export type UpdateCampaignRequest = components['schemas']['UpdateCampaignRequest'];
export type PaginatedCustomersResponse = components['schemas']['PaginatedCustomersResponse'];
export type PaginatedCampaignsResponse = components['schemas']['PaginatedCampaignsResponse'];
export type PaginationInfo = components['schemas']['PaginationInfo'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type ValidationErrorResponse = components['schemas']['ValidationErrorResponse'];
export type AnalyticsOverviewResponse = components['schemas']['AnalyticsOverviewResponse'];

// API Client specific types
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  skipRefresh?: boolean;
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  onDownloadProgress?: (progressEvent: { loaded: number; total?: number }) => void;
  signal?: AbortSignal;
  params?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
  statusText?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

// Firebase authentication types
export interface FirebaseAuthRequest {
  idToken: string;
  tenantId?: string | null;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RequestState {
  loading: boolean;
  error: ApiError | null;
  data: any;
  lastUpdated: number | null;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: ApiError | null;
}

// Utility types for better type inference
export type ExtractResponseType<T> = T extends { responses: { 200: { content: { 'application/json': infer R } } } }
  ? R
  : never;

export type ExtractRequestType<T> = T extends { requestBody: { content: { 'application/json': infer R } } }
  ? R
  : never;

export type ExtractPathParams<T> = T extends { parameters: { path: infer P } }
  ? P
  : never;

export type ExtractQueryParams<T> = T extends { parameters: { query: infer Q } }
  ? Q
  : never;

// Helper type for paginated responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Request query parameters
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListParams extends ListQueryParams {
  status?: 'active' | 'inactive' | 'pending';
  tags?: string[];
}

export interface CampaignListParams extends ListQueryParams {
  customerId?: string;
  status?: 'active' | 'paused' | 'completed' | 'draft';
  type?: 'page_view' | 'button_click' | 'form_submit' | 'custom';
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  campaignId?: string;
}

// Bulk operation types
export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkUpdateRequest<T> {
  ids: string[];
  data: Partial<T>;
}

// File upload types
export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadRequest {
  file: File;
  folder?: string;
  filename?: string;
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Search types (extending the ones from search.types.ts)
export interface SearchRequest {
  query: string;
  types?: ('customer' | 'campaign' | 'tag')[];
  limit?: number;
  includeInactive?: boolean;
}

export interface SearchResponse {
  results: Array<{
    id: string;
    type: 'customer' | 'campaign' | 'tag';
    title: string;
    subtitle?: string;
    description?: string;
    url: string;
    metadata?: Record<string, any>;
  }>;
  totalCount: number;
  searchTime: number;
}

// WebSocket event types for real-time updates
export interface WebSocketEvent<T = any> {
  type: string;
  data: T;
  timestamp: string;
}

export interface CampaignSyncEvent {
  campaignId: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export interface AnalyticsUpdateEvent {
  type: 'campaign_event' | 'conversion' | 'customer_update';
  data: {
    campaignId?: string;
    customerId?: string;
    eventType?: string;
    value?: number;
  };
}