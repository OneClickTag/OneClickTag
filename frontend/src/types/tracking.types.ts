// Tracking Types - matching backend TrackingType enum
export enum TrackingType {
  // Basic Interactions
  BUTTON_CLICK = 'BUTTON_CLICK',
  LINK_CLICK = 'LINK_CLICK',
  PAGE_VIEW = 'PAGE_VIEW',
  ELEMENT_VISIBILITY = 'ELEMENT_VISIBILITY',

  // Forms
  FORM_SUBMIT = 'FORM_SUBMIT',
  FORM_START = 'FORM_START',
  FORM_ABANDON = 'FORM_ABANDON',

  // E-commerce
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  ADD_TO_WISHLIST = 'ADD_TO_WISHLIST',
  VIEW_CART = 'VIEW_CART',
  CHECKOUT_START = 'CHECKOUT_START',
  CHECKOUT_STEP = 'CHECKOUT_STEP',
  PURCHASE = 'PURCHASE',
  PRODUCT_VIEW = 'PRODUCT_VIEW',

  // Lead Generation
  PHONE_CALL_CLICK = 'PHONE_CALL_CLICK',
  EMAIL_CLICK = 'EMAIL_CLICK',
  DOWNLOAD = 'DOWNLOAD',
  DEMO_REQUEST = 'DEMO_REQUEST',
  SIGNUP = 'SIGNUP',

  // Engagement
  SCROLL_DEPTH = 'SCROLL_DEPTH',
  TIME_ON_PAGE = 'TIME_ON_PAGE',
  VIDEO_PLAY = 'VIDEO_PLAY',
  VIDEO_COMPLETE = 'VIDEO_COMPLETE',

  // Navigation & Search
  SITE_SEARCH = 'SITE_SEARCH',
  FILTER_USE = 'FILTER_USE',
  TAB_SWITCH = 'TAB_SWITCH',
  ACCORDION_EXPAND = 'ACCORDION_EXPAND',
  MODAL_OPEN = 'MODAL_OPEN',

  // Social & Sharing
  SOCIAL_SHARE = 'SOCIAL_SHARE',
  SOCIAL_CLICK = 'SOCIAL_CLICK',

  // Content
  PDF_DOWNLOAD = 'PDF_DOWNLOAD',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD',
  NEWSLETTER_SIGNUP = 'NEWSLETTER_SIGNUP',

  // Custom
  CUSTOM_EVENT = 'CUSTOM_EVENT',
}

export enum TrackingDestination {
  GA4 = 'GA4',
  GOOGLE_ADS = 'GOOGLE_ADS',
}

export type TrackingCategory =
  | 'basic'
  | 'forms'
  | 'ecommerce'
  | 'lead-gen'
  | 'engagement'
  | 'navigation'
  | 'social'
  | 'content'
  | 'custom';

export interface TrackingTypeMetadata {
  type: TrackingType;
  label: string;
  description: string;
  category: TrackingCategory;
  icon: string;
  requiredFields: string[];
  optionalFields: string[];
  defaultGA4EventName?: string;
  supportsValue: boolean;
}

// Type-specific configuration interfaces
export interface ScrollDepthConfig {
  scrollPercentage: number;
  fireOnce?: boolean;
}

export interface TimeOnPageConfig {
  timeSeconds: number;
  fireOnce?: boolean;
}

export interface VideoTrackingConfig {
  videoSelector?: string;
  trackMilestones?: boolean;
  milestones?: number[]; // [25, 50, 75, 100]
}

export interface EcommerceConfig {
  trackValue?: boolean;
  defaultValue?: number;
  currency?: string;
  trackProductDetails?: boolean;
}

export interface FormTrackingConfig {
  formSelector?: string;
  trackFields?: boolean;
  trackAbandonment?: boolean;
  fieldsToTrack?: string[];
}

export type TrackingConfig =
  | ScrollDepthConfig
  | TimeOnPageConfig
  | VideoTrackingConfig
  | EcommerceConfig
  | FormTrackingConfig
  | Record<string, any>;

export interface Tracking {
  id: string;
  customerId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TrackingType;
  status: 'active' | 'inactive' | 'pending' | 'error' | 'creating' | 'failed' | 'paused' | 'syncing';

  // Tracking Configuration
  selector?: string;
  urlPattern?: string;
  selectorConfig?: Record<string, any>;
  config?: TrackingConfig;

  // Destinations
  destinations: TrackingDestination[];

  // GTM fields
  gtmTriggerId?: string;
  gtmTagId?: string;
  gtmTagIdGA4?: string;
  gtmTagIdAds?: string;
  gtmContainerId?: string;
  gtmWorkspaceId?: string;

  // GA4 Configuration
  ga4EventName?: string;
  ga4Parameters?: Record<string, any>;
  ga4PropertyId?: string;

  // Google Ads
  conversionActionId?: string;
  adsConversionLabel?: string;
  adsConversionValue?: number;

  // Crawler fields
  isAutoCrawled: boolean;
  crawlMetadata?: Record<string, any>;
  selectorConfidence?: number;

  // Error tracking & sync
  lastError?: string;
  lastSyncAt?: string;
  syncAttempts?: number;

  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;

  // Sync status
  syncStatus: 'synced' | 'pending' | 'error' | 'not_synced';
  errorMessage?: string;

  analytics?: {
    totalEvents: number;
    totalConversions: number;
    conversionRate: number;
    totalValue: number;
  };
}

export interface CreateTrackingRequest {
  customerId: string;
  name: string;
  description?: string;
  type: TrackingType;
  selector?: string;
  urlPattern?: string;
  config?: TrackingConfig;
  destinations: TrackingDestination[];
  ga4EventName?: string;
  ga4Parameters?: Record<string, any>;
  adsConversionValue?: number;
}

export interface UpdateTrackingRequest extends Partial<CreateTrackingRequest> {
  id: string;
}

export interface TrackingFilters {
  status?: string[];
  type?: string[];
  syncStatus?: string[];
  dateRange?: {
    from?: string;
    to?: string;
  };
}

export interface TrackingTableParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: TrackingFilters;
}

export interface TrackingResponse {
  trackings: Tracking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrackingAnalytics {
  totalTrackings: number;
  activeTrackings: number;
  totalEvents: number;
  totalConversions: number;
  totalValue: number;
  conversionRate: number;
  recentActivity: {
    date: string;
    events: number;
    conversions: number;
    value: number;
  }[];
  performanceByType: {
    type: string;
    count: number;
    conversions: number;
    value: number;
  }[];
  syncHealth: {
    synced: number;
    pending: number;
    errors: number;
  };
}

export interface SyncStatus {
  trackingId: string;
  status: 'synced' | 'pending' | 'error';
  message?: string;
  timestamp: string;
}

export interface SSEMessage {
  type: 'sync_status' | 'tracking_update' | 'analytics_update';
  data: SyncStatus | Tracking | TrackingAnalytics;
}