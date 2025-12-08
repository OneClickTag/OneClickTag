// Export all services from a single source of truth

// Admin services
export * from './admin';

// Auth service
export { authService, AuthService } from './authService';

// Customer services
export { customersApi } from './customersService';

// Campaign services
export { campaignsApi } from './campaignsService';

// Tracking services
export { trackingApi } from './trackingService';

// Analytics services
export { analyticsApi } from './analyticsService';

// Search services
export { searchService } from './searchService';

// Public services (no auth required)
export { publicService } from './publicService';
export type { ContentPage, Plan } from './publicService';
