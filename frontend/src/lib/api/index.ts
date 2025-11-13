// Core exports
export { apiClient, ApiClient } from './client';
export { defaultApiConfig, apiEndpoints } from './config';
export { tokenManager, TokenManager } from './auth/tokenManager';
export { loadingManager, LoadingManager } from './loading/loadingManager';
export { errorHandler, ErrorHandler } from './errors/errorHandler';

// Service exports
export { authService, AuthService } from './services/authService';
export { customerService, CustomerService } from './services/customerService';
export { campaignService, CampaignService } from './services/campaignService';

// Type exports
export type * from './types';
export type * from './generated/schema';

// Interceptor exports
export {
  createRequestInterceptor,
  createResponseInterceptor,
  createRetryInterceptor,
  createTimeoutInterceptor,
  createCacheInterceptor,
  createDeduplicationInterceptor,
} from './interceptors';

// Default API instance with all services
export const api = {
  auth: authService,
  customers: customerService,
  campaigns: campaignService,
  client: apiClient,
};

// Export default as the main api object
export default api;