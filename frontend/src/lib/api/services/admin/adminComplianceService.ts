import { apiClient } from '../../client';
import { apiEndpoints } from '../../config';

// Compliance Settings Types
export interface ComplianceSettings {
  id: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  dpoName: string;
  dpoEmail: string;
  dpoPhone?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  ccpaTollFreeNumber?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateComplianceSettingsData {
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  dpoName?: string;
  dpoEmail?: string;
  dpoPhone?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  ccpaTollFreeNumber?: string;
}

// Cookie Category Types
export interface CookieCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  isRequired: boolean;
  displayOrder: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCookieCategoryData {
  name: string;
  slug: string;
  description: string;
  isRequired: boolean;
  displayOrder?: number;
}

export interface UpdateCookieCategoryData {
  name?: string;
  slug?: string;
  description?: string;
  isRequired?: boolean;
  displayOrder?: number;
}

// Cookie Types
export interface Cookie {
  id: string;
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  categoryId: string;
  category?: CookieCategory;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCookieData {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  categoryId: string;
}

export interface UpdateCookieData {
  name?: string;
  provider?: string;
  purpose?: string;
  duration?: string;
  categoryId?: string;
}

export interface CookiesListResponse {
  data: Cookie[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CookieQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}

// Consent Banner Types
export interface ConsentBanner {
  id: string;
  headingText: string;
  bodyText: string;
  acceptAllButtonText: string;
  rejectAllButtonText: string;
  customizeButtonText: string;
  savePreferencesText: string;
  backgroundColor: string;
  textColor: string;
  acceptButtonColor: string;
  rejectButtonColor: string;
  customizeButtonColor: string;
  position: string;
  consentExpiryDays: number;
  showOnEveryPage: boolean;
  blockCookiesUntilConsent: boolean;
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConsentBannerData {
  headingText?: string;
  bodyText?: string;
  acceptAllButtonText?: string;
  rejectAllButtonText?: string;
  customizeButtonText?: string;
  savePreferencesText?: string;
  backgroundColor?: string;
  textColor?: string;
  acceptButtonColor?: string;
  rejectButtonColor?: string;
  customizeButtonColor?: string;
  position?: string;
  consentExpiryDays?: number;
  showOnEveryPage?: boolean;
  blockCookiesUntilConsent?: boolean;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
  isActive?: boolean;
}

// Data Request Types
export interface DataRequest {
  id: string;
  userId: string;
  requestType: 'ACCESS' | 'DELETE' | 'PORTABILITY' | 'RECTIFICATION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  requestedAt: string;
  completedAt?: string;
  notes?: string;
  tenantId: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface CreateDataRequestData {
  userId: string;
  requestType: 'ACCESS' | 'DELETE' | 'PORTABILITY' | 'RECTIFICATION';
  notes?: string;
}

export interface UpdateDataRequestData {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  completedAt?: string;
}

export interface DataRequestsListResponse {
  data: DataRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DataRequestQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  requestType?: string;
  userId?: string;
}

// Audit Log Types
export interface ApiAuditLog {
  id: string;
  userId: string;
  service: string;
  method: string;
  endpoint: string;
  statusCode: number;
  requestBody?: any;
  responseBody?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  tenantId: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AuditLogsListResponse {
  data: ApiAuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  service?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

// Compliance Service
export const adminComplianceService = {
  // Compliance Settings
  async getSettings(): Promise<ComplianceSettings> {
    const response = await apiClient.get<ComplianceSettings>(apiEndpoints.admin.compliance.settings);
    return response.data;
  },

  async updateSettings(data: UpdateComplianceSettingsData): Promise<ComplianceSettings> {
    const response = await apiClient.put<ComplianceSettings>(apiEndpoints.admin.compliance.settings, data);
    return response.data;
  },

  // Cookie Categories
  async getCookieCategories(): Promise<CookieCategory[]> {
    const response = await apiClient.get<CookieCategory[]>(apiEndpoints.admin.compliance.cookieCategories.list);
    return response.data;
  },

  async createCookieCategory(data: CreateCookieCategoryData): Promise<CookieCategory> {
    const response = await apiClient.post<CookieCategory>(apiEndpoints.admin.compliance.cookieCategories.create, data);
    return response.data;
  },

  async updateCookieCategory(id: string, data: UpdateCookieCategoryData): Promise<CookieCategory> {
    const response = await apiClient.put<CookieCategory>(apiEndpoints.admin.compliance.cookieCategories.update(id), data);
    return response.data;
  },

  async deleteCookieCategory(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.compliance.cookieCategories.delete(id));
  },

  // Cookies
  async getCookies(params?: CookieQueryParams): Promise<CookiesListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params?.search) queryParams.append('search', params.search);

    const url = params ? `${apiEndpoints.admin.compliance.cookies.list}?${queryParams.toString()}` : apiEndpoints.admin.compliance.cookies.list;
    const response = await apiClient.get<CookiesListResponse>(url);
    return response.data;
  },

  async createCookie(data: CreateCookieData): Promise<Cookie> {
    const response = await apiClient.post<Cookie>(apiEndpoints.admin.compliance.cookies.create, data);
    return response.data;
  },

  async updateCookie(id: string, data: UpdateCookieData): Promise<Cookie> {
    const response = await apiClient.put<Cookie>(apiEndpoints.admin.compliance.cookies.update(id), data);
    return response.data;
  },

  async deleteCookie(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.compliance.cookies.delete(id));
  },

  async bulkDeleteCookies(ids: string[]): Promise<void> {
    await apiClient.post(apiEndpoints.admin.compliance.cookies.bulkDelete, { ids });
  },

  // Consent Banner
  async getConsentBanner(): Promise<ConsentBanner> {
    const response = await apiClient.get<ConsentBanner>(apiEndpoints.admin.compliance.consentBanner);
    return response.data;
  },

  async updateConsentBanner(data: UpdateConsentBannerData): Promise<ConsentBanner> {
    const response = await apiClient.put<ConsentBanner>(apiEndpoints.admin.compliance.consentBanner, data);
    return response.data;
  },

  // Data Requests
  async getDataRequests(params?: DataRequestQueryParams): Promise<DataRequestsListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.requestType) queryParams.append('requestType', params.requestType);
    if (params?.userId) queryParams.append('userId', params.userId);

    const url = params ? `${apiEndpoints.admin.compliance.dataRequests.list}?${queryParams.toString()}` : apiEndpoints.admin.compliance.dataRequests.list;
    const response = await apiClient.get<DataRequestsListResponse>(url);
    return response.data;
  },

  async createDataRequest(data: CreateDataRequestData): Promise<DataRequest> {
    const response = await apiClient.post<DataRequest>(apiEndpoints.admin.compliance.dataRequests.create, data);
    return response.data;
  },

  async updateDataRequest(id: string, data: UpdateDataRequestData): Promise<DataRequest> {
    const response = await apiClient.put<DataRequest>(apiEndpoints.admin.compliance.dataRequests.update(id), data);
    return response.data;
  },

  async deleteDataRequest(id: string): Promise<void> {
    await apiClient.delete(apiEndpoints.admin.compliance.dataRequests.delete(id));
  },

  async exportUserData(userId: string): Promise<void> {
    await apiClient.download(apiEndpoints.admin.compliance.dataRequests.export(userId), `user-data-${userId}.json`);
  },

  // Audit Logs
  async getAuditLogs(params?: AuditLogQueryParams): Promise<AuditLogsListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.service) queryParams.append('service', params.service);
    if (params?.method) queryParams.append('method', params.method);
    if (params?.statusCode) queryParams.append('statusCode', params.statusCode.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const url = params ? `${apiEndpoints.admin.compliance.auditLogs}?${queryParams.toString()}` : apiEndpoints.admin.compliance.auditLogs;
    const response = await apiClient.get<AuditLogsListResponse>(url);
    return response.data;
  },
};
