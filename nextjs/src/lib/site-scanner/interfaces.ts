import { SiteScanStatus, RecommendationSeverity, RecommendationStatus, TrackingType } from '@prisma/client';

// ========================================
// Crawl Engine Interfaces
// ========================================

export interface CrawlOptions {
  maxPages: number;
  maxDepth: number;
  pageTimeout: number; // ms
  crawlDelay: number; // ms between pages
  jobTimeout: number; // ms total
}

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPages: 200,
  maxDepth: 8,
  pageTimeout: 30000,
  crawlDelay: 1000,
  jobTimeout: 20 * 60 * 1000,
};

export const SKIP_PATTERNS = [
  /\.pdf$/i,
  /\.zip$/i,
  /\.rar$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.svg$/i,
  /\.webp$/i,
  /\.mp4$/i,
  /\.mp3$/i,
  /\.ico$/i,
  /\.woff2?$/i,
  /\.ttf$/i,
  /\.eot$/i,
  /\.css$/i,
  /\.js$/i,
  /\.xml$/i,
  /\.json$/i,
  /\/wp-admin\//i,
  /\/wp-json\//i,
  /\/api\//i,
  /\/admin\//i,
  /\/_next\//i,
  /\/static\//i,
  /mailto:/i,
  /tel:/i,
  /javascript:/i,
];

export interface CrawledPage {
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
  metaTags: PageMetaTags | null;
  headings: PageHeading[] | null;
  contentSummary: string | null;
  isAuthenticated?: boolean;
  templateGroup?: string;
  scrollableHeight?: number;
  interactiveElementCount?: number;
  obstaclesEncountered?: Array<{ type: string; selector: string; action: string }>;
  links: string[];
  elements: ExtractedElement[];
}

export interface PageMetaTags {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogImage?: string;
}

export interface PageHeading {
  level: number;
  text: string;
}

export interface ExtractedElement {
  tagName: string;
  type?: string; // input type, button type
  text?: string;
  href?: string;
  id?: string;
  className?: string;
  name?: string;
  action?: string; // form action
  method?: string; // form method
  placeholder?: string;
  ariaLabel?: string;
  dataAttributes?: Record<string, string>;
  parentForm?: string; // parent form id/name
  nearbyText?: string;
  isVisible: boolean;
  rect?: { x: number; y: number; width: number; height: number };
}

// ========================================
// Technology Detection
// ========================================

export interface DetectedTechnology {
  name: string;
  category: 'analytics' | 'cms' | 'framework' | 'tracking' | 'advertising' | 'other';
  version?: string;
  confidence: number; // 0-1
}

export interface ExistingTracking {
  type: string;
  provider: string;
  details?: string;
}

// ========================================
// Niche Detection
// ========================================

export interface NicheAnalysis {
  niche: string;
  subCategory: string | null;
  confidence: number; // 0-1
  reasoning: string;
  signals: NicheSignal[];
  suggestedTrackingFocus: string[];
}

export interface NicheSignal {
  type: string; // 'url_pattern', 'content', 'technology', 'page_structure'
  description: string;
  weight: number;
}

// ========================================
// Crawl Summary (sent to AI)
// ========================================

export interface CrawlSummary {
  websiteUrl: string;
  totalPages: number;
  pageTypes: Record<string, number>; // e.g., { product: 12, blog: 5, checkout: 1 }
  urlPatterns: string[]; // representative URL patterns
  homepageContent: {
    title: string | null;
    metaDescription: string | null;
    headings: PageHeading[];
    keyContent: string; // first ~500 chars of main content
  };
  technologies: DetectedTechnology[];
  existingTracking: ExistingTracking[];
  hasEcommerce: boolean;
  hasForms: boolean;
  hasVideo: boolean;
  hasPhoneNumbers: boolean;
}

// ========================================
// Tracking Detection
// ========================================

export interface TrackingOpportunity {
  name: string;
  description: string;
  trackingType: TrackingType;
  severity: RecommendationSeverity;
  severityReason: string;
  selector: string | null;
  selectorConfig: SelectorConfig | null;
  selectorConfidence: number | null;
  urlPattern: string | null;
  pageUrl: string;
  funnelStage: 'top' | 'middle' | 'bottom' | null;
  elementContext: ElementContext | null;
  suggestedGA4EventName: string | null;
  suggestedDestinations: string[];
  suggestedConfig: Record<string, any> | null;
  aiGenerated: boolean;
  businessValue?: string;
  implementationNotes?: string;
  affectedRoutes?: string[];
}

export interface SelectorConfig {
  selectors: Array<{
    selector: string;
    confidence: number;
    method: 'id' | 'data-attr' | 'unique-class' | 'aria' | 'structural' | 'text';
  }>;
  fallbacks: string[];
}

export interface ElementContext {
  buttonText?: string;
  tagName?: string;
  nearbyContent?: string;
  parentForm?: string;
  inputType?: string;
}

// ========================================
// Recommendation Engine
// ========================================

export interface RawRecommendation {
  name: string;
  description: string;
  trackingType: TrackingType;
  severity: RecommendationSeverity;
  severityReason: string;
  selector: string | null;
  selectorConfig: SelectorConfig | null;
  selectorConfidence: number | null;
  urlPattern: string | null;
  pageUrl: string;
  funnelStage: 'top' | 'middle' | 'bottom' | null;
  elementContext: ElementContext | null;
  suggestedGA4EventName: string | null;
  suggestedDestinations: string[];
  suggestedConfig: Record<string, any> | null;
  aiGenerated: boolean;
}

export interface EnhancedRecommendation extends RawRecommendation {
  description: string;
  severity: RecommendationSeverity;
  severityReason: string;
}

export interface ReadinessResult {
  score: number; // 0-100
  narrative: string;
}

// ========================================
// Page Analysis Input (sent to AI per batch)
// ========================================

export interface PageAnalysisInput {
  url: string;
  title: string | null;
  pageType: string | null;
  headings: PageHeading[];
  elements: ExtractedElement[];
  metaTags: PageMetaTags | null;
  contentSummary: string | null;
}

// ========================================
// Job Data
// ========================================

export interface SiteScanJobData {
  tenantId: string;
  customerId: string;
  scanId: string;
  websiteUrl: string;
  maxPages: number;
  maxDepth: number;
  phase: 'phase1' | 'phase2';
  confirmedNiche?: string;
}

// ========================================
// SSE Event Data
// ========================================

export interface ScanProgressEvent {
  scanId: string;
  customerId: string;
  status: SiteScanStatus;
  progress?: {
    pagesScanned: number;
    totalPages: number;
    currentUrl?: string;
    percentage: number;
  };
  niche?: NicheAnalysis;
  recommendations?: number;
  error?: string;
}
