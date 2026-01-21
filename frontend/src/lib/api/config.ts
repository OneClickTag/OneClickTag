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

/**
 * Helper to ensure base URL has /api suffix
 * Use this function instead of accessing VITE_API_BASE_URL directly
 */
export const getBaseURL = () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  // Remove trailing slash if present
  const cleanURL = baseURL.replace(/\/$/, '');
  // Add /api if not already present
  return cleanURL.endsWith('/api') ? cleanURL : `${cleanURL}/api`;
};

export const defaultApiConfig: ApiConfig = {
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: import.meta.env.NODE_ENV === 'development',
};

export const apiEndpoints = {
  // Auth endpoints
  auth: {
    login: '/v1/auth/login',
    firebase: '/v1/auth/firebase',
    refresh: '/v1/auth/refresh',
    logout: '/v1/auth/logout',
    me: '/v1/auth/profile',
  },

  // Customer endpoints
  customers: {
    list: '/v1/customers',
    create: '/v1/customers',
    get: (id: string) => `/v1/customers/${id}`,
    getBySlug: (slug: string) => `/v1/customers/by-slug/${slug}`,
    update: (id: string) => `/v1/customers/${id}`,
    delete: (id: string) => `/v1/customers/${id}`,
    bulkDelete: '/v1/customers/bulk-delete',
    bulkUpdate: '/v1/customers/bulk-update',
    export: '/v1/customers/export',
    connectGoogle: (id: string) => `/v1/customers/${id}/google/connect`,
    disconnectGoogle: (id: string) => `/v1/customers/${id}/google/disconnect`,
    getGoogleAuthUrl: (id: string) => `/v1/customers/${id}/google/auth-url`,
    getGoogleStatus: (id: string) => `/v1/customers/${id}/google/status`,
    createTracking: (id: string) => `/v1/customers/${id}/tracking/create`,
  },

  // Campaign endpoints
  campaigns: {
    list: '/v1/campaigns',
    create: '/v1/campaigns',
    get: (id: string) => `/v1/campaigns/${id}`,
    update: (id: string) => `/v1/campaigns/${id}`,
    delete: (id: string) => `/v1/campaigns/${id}`,
    analytics: (id: string) => `/v1/campaigns/${id}/analytics`,
    events: (id: string) => `/v1/campaigns/${id}/events`,
    gtmSync: (id: string) => `/v1/campaigns/${id}/gtm-sync`,
  },

  // Analytics endpoints
  analytics: {
    overview: '/v1/analytics/overview',
    customerUsage: '/v1/analytics/customer-usage',
    campaignPerformance: '/v1/analytics/campaign-performance',
    systemHealth: '/v1/analytics/system-health',
    export: '/v1/analytics/export',
  },

  // Tag endpoints
  tags: {
    list: '/v1/tags',
    create: '/v1/tags',
    get: (id: string) => `/v1/tags/${id}`,
    update: (id: string) => `/v1/tags/${id}`,
    delete: (id: string) => `/v1/tags/${id}`,
    search: '/v1/tags/search',
  },

  // Search endpoints
  search: {
    global: '/v1/search',
    suggestions: '/v1/search/suggestions',
    history: '/v1/search/history',
  },

  // File upload endpoints
  uploads: {
    image: '/v1/uploads/image',
    document: '/v1/uploads/document',
  },

  // Admin endpoints
  admin: {
    users: {
      list: '/v1/admin/users',
      create: '/v1/admin/users',
      get: (id: string) => `/v1/admin/users/${id}`,
      update: (id: string) => `/v1/admin/users/${id}`,
      delete: (id: string) => `/v1/admin/users/${id}`,
      batchDelete: '/v1/admin/users/batch-delete',
      batchUpdateRole: '/v1/admin/users/batch-update-role',
      stats: '/v1/admin/users/stats',
    },
    content: {
      list: '/v1/admin/content',
      create: '/v1/admin/content',
      get: (id: string) => `/v1/admin/content/${id}`,
      update: (id: string) => `/v1/admin/content/${id}`,
      delete: (id: string) => `/v1/admin/content/${id}`,
      publish: (id: string) => `/v1/admin/content/${id}/publish`,
    },
    plans: {
      list: '/v1/admin/plans',
      create: '/v1/admin/plans',
      get: (id: string) => `/v1/admin/plans/${id}`,
      update: (id: string) => `/v1/admin/plans/${id}`,
      delete: (id: string) => `/v1/admin/plans/${id}`,
      toggleActive: (id: string) => `/v1/admin/plans/${id}/toggle-active`,
    },
    leads: {
      list: '/v1/admin/leads',
      get: (id: string) => `/v1/admin/leads/${id}`,
      delete: (id: string) => `/v1/admin/leads/${id}`,
      stats: '/v1/admin/leads/stats',
      dailyCounts: '/v1/admin/leads/analytics/daily',
      pageViews: '/v1/admin/leads/analytics/page-views',
      export: '/v1/admin/leads/export',
    },
    questionnaire: {
      list: '/v1/admin/questionnaire/questions',
      create: '/v1/admin/questionnaire/questions',
      get: (id: string) => `/v1/admin/questionnaire/questions/${id}`,
      update: (id: string) => `/v1/admin/questionnaire/questions/${id}`,
      delete: (id: string) => `/v1/admin/questionnaire/questions/${id}`,
      toggleActive: (id: string) => `/v1/admin/questionnaire/questions/${id}/toggle-active`,
      reorder: '/v1/admin/questionnaire/questions/reorder',
      responses: (id: string) => `/v1/admin/questionnaire/questions/${id}/responses`,
    },
    compliance: {
      settings: '/compliance/settings',
      cookieCategories: {
        list: '/compliance/cookie-categories',
        create: '/compliance/cookie-categories',
        update: (id: string) => `/compliance/cookie-categories/${id}`,
        delete: (id: string) => `/compliance/cookie-categories/${id}`,
      },
      cookies: {
        list: '/compliance/cookies',
        create: '/compliance/cookies',
        update: (id: string) => `/compliance/cookies/${id}`,
        delete: (id: string) => `/compliance/cookies/${id}`,
        bulkDelete: '/compliance/cookies/bulk-delete',
      },
      consentBanner: '/compliance/consent/banner',
      dataRequests: {
        list: '/compliance/data-requests',
        create: '/compliance/data-requests',
        update: (id: string) => `/compliance/data-requests/${id}`,
        delete: (id: string) => `/compliance/data-requests/${id}`,
        export: (userId: string) => `/compliance/data-requests/export/${userId}`,
      },
      auditLogs: '/compliance/audit-logs',
    },
  },

  // Public endpoints
  public: {
    content: (slug: string) => `/v1/content/${slug}`,
    plans: '/v1/plans',
    landing: '/v1/landing',
    landingSection: (key: string) => `/v1/landing/${key}`,
    siteSettings: '/v1/site-settings/global',
    contact: '/v1/contact',
  },

  // Leads endpoints (public)
  leads: {
    create: '/v1/leads',
    get: (id: string) => `/v1/leads/${id}`,
    submitQuestionnaire: (id: string) => `/v1/leads/${id}/responses`,
    trackPageView: '/v1/leads/page-views',
  },

  // Questionnaire endpoints (public)
  questionnaire: {
    getQuestions: '/v1/questionnaire/questions',
  },

  // Customization endpoints (admin)
  customization: {
    // Landing Page
    landing: {
      list: '/v1/admin/landing-page',
      get: (id: string) => `/v1/admin/landing-page/${id}`,
      getByKey: (key: string) => `/v1/admin/landing-page/by-key/${key}`,
      create: '/v1/admin/landing-page',
      update: (id: string) => `/v1/admin/landing-page/${id}`,
      delete: (id: string) => `/v1/admin/landing-page/${id}`,
      toggleActive: (id: string) => `/v1/admin/landing-page/${id}/toggle-active`,
    },
    // Site Settings
    siteSettings: {
      list: '/v1/admin/site-settings',
      get: (id: string) => `/v1/admin/site-settings/${id}`,
      getByKey: (key: string) => `/v1/admin/site-settings/by-key/${key}`,
      global: '/v1/admin/site-settings/global',
      create: '/v1/admin/site-settings',
      update: (id: string) => `/v1/admin/site-settings/${id}`,
      updateGlobal: '/v1/admin/site-settings/global',
      delete: (id: string) => `/v1/admin/site-settings/${id}`,
    },
    // Contact Page
    contact: {
      list: '/v1/admin/contact-page',
      get: (id: string) => `/v1/admin/contact-page/${id}`,
      active: '/v1/admin/contact-page/active',
      create: '/v1/admin/contact-page',
      update: (id: string) => `/v1/admin/contact-page/${id}`,
      delete: (id: string) => `/v1/admin/contact-page/${id}`,
      toggleActive: (id: string) => `/v1/admin/contact-page/${id}/toggle-active`,
    },
  },
} as const;

export type ApiEndpoints = typeof apiEndpoints;
