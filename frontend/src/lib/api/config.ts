/**
 * API Configuration
 */

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

export const defaultApiConfig: ApiConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: import.meta.env.NODE_ENV === 'development',
};

export const apiEndpoints = {
  // Auth endpoints
  auth: {
    login: '/auth/login',
    firebase: '/auth/firebase',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/profile',
  },
  
  // Customer endpoints
  customers: {
    list: '/customers',
    create: '/customers',
    get: (id: string) => `/customers/${id}`,
    update: (id: string) => `/customers/${id}`,
    delete: (id: string) => `/customers/${id}`,
    bulkDelete: '/customers/bulk-delete',
    bulkUpdate: '/customers/bulk-update',
    export: '/customers/export',
    connectGoogle: (id: string) => `/customers/${id}/google/connect`,
    disconnectGoogle: (id: string) => `/customers/${id}/google/disconnect`,
    getGoogleAuthUrl: (id: string) => `/customers/${id}/google/auth-url`,
    getGoogleStatus: (id: string) => `/customers/${id}/google/status`,
    createTracking: (id: string) => `/customers/${id}/tracking/create`,
  },
  
  // Campaign endpoints
  campaigns: {
    list: '/campaigns',
    create: '/campaigns',
    get: (id: string) => `/campaigns/${id}`,
    update: (id: string) => `/campaigns/${id}`,
    delete: (id: string) => `/campaigns/${id}`,
    analytics: (id: string) => `/campaigns/${id}/analytics`,
    events: (id: string) => `/campaigns/${id}/events`,
    gtmSync: (id: string) => `/campaigns/${id}/gtm-sync`,
  },
  
  // Analytics endpoints
  analytics: {
    overview: '/analytics/overview',
    customerUsage: '/analytics/customer-usage',
    campaignPerformance: '/analytics/campaign-performance',
    systemHealth: '/analytics/system-health',
    export: '/analytics/export',
  },
  
  // Tag endpoints
  tags: {
    list: '/tags',
    create: '/tags',
    get: (id: string) => `/tags/${id}`,
    update: (id: string) => `/tags/${id}`,
    delete: (id: string) => `/tags/${id}`,
    search: '/tags/search',
  },
  
  // Search endpoints
  search: {
    global: '/search',
    suggestions: '/search/suggestions',
    history: '/search/history',
  },
  
  // File upload endpoints
  uploads: {
    image: '/uploads/image',
    document: '/uploads/document',
  },
} as const;

export type ApiEndpoints = typeof apiEndpoints;