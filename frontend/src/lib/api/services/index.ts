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

// Leads services (public)
export { leadsService } from './leadsService';
export type { Lead, CreateLeadData, SubmitQuestionnaireData } from './leadsService';

// Questionnaire services (public)
export { questionnaireService } from './questionnaireService';
export type { Question, QuestionType } from './questionnaireService';
