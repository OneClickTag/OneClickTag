export interface CustomerSearchFilters {
  search?: string;
  status?: string;
  company?: string;
  tags?: string[];
  hasGoogleAccount?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface CustomerSortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GoogleAccountInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAdsAccountInfo {
  accountId: string;
  accountName: string;
  currency: string;
  timeZone: string;
  isActive: boolean;
}

export interface BulkOperationResult<T> {
  success: boolean;
  id: string;
  result?: T;
  error?: string;
}