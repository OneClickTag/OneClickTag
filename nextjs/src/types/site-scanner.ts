// ========================================
// Enums
// ========================================

export type SiteScanStatus =
  | 'QUEUED'
  | 'DISCOVERING'
  | 'CRAWLING'
  | 'NICHE_DETECTED'
  | 'AWAITING_CONFIRMATION'
  | 'DEEP_CRAWLING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type RecommendationSeverity = 'CRITICAL' | 'IMPORTANT' | 'RECOMMENDED' | 'OPTIONAL';
export type RecommendationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CREATED';

// ========================================
// Scan Models
// ========================================

export interface ScanSummary {
  id: string;
  customerId: string;
  status: SiteScanStatus;
  websiteUrl: string;
  maxPages: number;
  maxDepth: number;
  detectedNiche: string | null;
  nicheConfidence: number | null;
  nicheSubCategory: string | null;
  confirmedNiche: string | null;
  nicheSignals: NicheSignal[] | null;
  detectedTechnologies: DetectedTechnology[] | null;
  existingTracking: ExistingTracking[] | null;
  totalPagesScanned: number | null;
  totalRecommendations: number | null;
  trackingReadinessScore: number | null;
  readinessNarrative: string | null;
  siteMap: Record<string, Array<{ url: string; title: string | null }>> | null;
  aiAnalysisUsed: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  // v2 fields
  liveDiscovery: LiveDiscovery | null;
  totalUrlsFound: number;
  loginDetected: boolean;
  loginUrl: string | null;
  recommendationCounts?: {
    critical: number;
    important: number;
    recommended: number;
    optional: number;
  };
  pages?: ScanPage[];
}

export interface ScanPage {
  id: string;
  url: string;
  title: string | null;
  depth: number;
  pageType: string | null;
  hasForm: boolean;
  hasCTA: boolean;
  hasVideo: boolean;
  hasPhoneLink: boolean;
  hasEmailLink: boolean;
  hasDownloadLink: boolean;
  importanceScore: number | null;
  contentSummary: string | null;
}

export interface ScanHistory {
  id: string;
  status: SiteScanStatus;
  websiteUrl: string;
  detectedNiche: string | null;
  totalPagesScanned: number | null;
  totalRecommendations: number | null;
  trackingReadinessScore: number | null;
  aiAnalysisUsed: boolean;
  createdAt: string;
}

// ========================================
// Recommendation
// ========================================

export interface TrackingRecommendation {
  id: string;
  scanId: string;
  name: string;
  description: string | null;
  trackingType: string;
  severity: RecommendationSeverity;
  severityReason: string | null;
  selector: string | null;
  selectorConfig: any;
  selectorConfidence: number | null;
  urlPattern: string | null;
  pageUrl: string | null;
  funnelStage: 'top' | 'middle' | 'bottom' | null;
  elementContext: any;
  suggestedConfig: Record<string, any> | null;
  suggestedGA4EventName: string | null;
  suggestedDestinations: string[] | null;
  status: RecommendationStatus;
  trackingId: string | null;
  aiGenerated: boolean;
  createdAt: string;
}

// ========================================
// Technology & Tracking
// ========================================

export interface DetectedTechnology {
  name: string;
  category: 'analytics' | 'cms' | 'framework' | 'tracking' | 'advertising' | 'other';
  version?: string;
  confidence: number;
}

export interface ExistingTracking {
  type: string;
  provider: string;
  details?: string;
}

export interface NicheSignal {
  type: string;
  description: string;
  weight: number;
}

// ========================================
// Request Types
// ========================================

export interface StartScanRequest {
  websiteUrl?: string;
  maxPages?: number;
  maxDepth?: number;
}

export interface ConfirmNicheRequest {
  niche: string;
}

export interface RecommendationFilters {
  severity?: RecommendationSeverity[];
  type?: string[];
  status?: RecommendationStatus[];
  funnelStage?: string;
}

export interface BulkAcceptRequest {
  recommendationIds: string[];
}

// ========================================
// SSE Event Types
// ========================================

export interface ScanSSEEvent {
  scanId: string;
  customerId: string;
  [key: string]: any;
}

export interface ScanProgressData extends ScanSSEEvent {
  pagesScanned?: number;
  totalPages?: number;
  currentUrl?: string;
  percentage?: number;
  pageUrl?: string;
  pageTitle?: string;
  pageType?: string;
  step?: string;
  phase?: string;
}

export interface ScanNicheData extends ScanSSEEvent {
  niche: string;
  confidence: number;
  subCategory?: string;
  reasoning: string;
  technologies: DetectedTechnology[];
  existingTracking: ExistingTracking[];
  pagesScanned: number;
}

export interface ScanCompletedData extends ScanSSEEvent {
  totalRecommendations: number;
  readinessScore: number;
  critical: number;
  important: number;
  recommended: number;
  optional: number;
}

// ========================================
// Live Discovery (v2 - chunked processing)
// ========================================

export interface LiveDiscovery {
  technologies: {
    cms: string | null;
    framework: string | null;
    analytics: string[];
    ecommerce: string | null;
    cdn: string | null;
  };
  priorityElements: {
    forms: Array<{ url: string; type: string; selector?: string }>;
    ctas: Array<{ url: string; text: string; selector?: string }>;
    cartPages: string[];
    productPages: string[];
    checkoutPages: string[];
    loginPages: string[];
    videoEmbeds: Array<{ url: string; platform?: string }>;
    phoneLinks: Array<{ url: string; number: string }>;
    emailLinks: Array<{ url: string; email: string }>;
  };
  pageTypes: Record<string, number>;
  urlPatterns: string[];
  sitemapFound: boolean;
  robotsFound: boolean;
  totalUrlsDiscovered: number;
}

export interface ChunkResult {
  pagesProcessed: number;
  hasMore: boolean;
  discovery: LiveDiscovery;
  newPages: Array<{
    url: string;
    title: string | null;
    pageType: string | null;
    hasForm: boolean;
    hasCTA: boolean;
  }>;
  loginDetected?: boolean;
  loginUrl?: string;
}

export interface Phase2ChunkResult {
  pagesProcessed: number;
  hasMore: boolean;
  newRecommendations: number;
}

export interface SiteCredential {
  id: string;
  domain: string;
  username: string; // redacted on GET
  loginUrl: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SaveCredentialRequest {
  domain: string;
  username: string;
  password: string;
  loginUrl?: string;
}

// ========================================
// Available Niches
// ========================================

export const AVAILABLE_NICHES = [
  { value: 'e-commerce', label: 'E-Commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'lead-generation', label: 'Lead Generation' },
  { value: 'content', label: 'Content / Blog' },
  { value: 'non-profit', label: 'Non-Profit' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'travel', label: 'Travel' },
  { value: 'finance', label: 'Finance' },
  { value: 'food-delivery', label: 'Food & Delivery' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
] as const;
