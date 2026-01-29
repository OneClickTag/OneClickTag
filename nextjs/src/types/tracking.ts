export type TrackingType =
  | 'BUTTON_CLICK'
  | 'LINK_CLICK'
  | 'PAGE_VIEW'
  | 'ELEMENT_VISIBILITY'
  | 'FORM_SUBMIT'
  | 'FORM_START'
  | 'FORM_ABANDON'
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'ADD_TO_WISHLIST'
  | 'VIEW_CART'
  | 'CHECKOUT_START'
  | 'CHECKOUT_STEP'
  | 'PURCHASE'
  | 'PRODUCT_VIEW'
  | 'PHONE_CALL_CLICK'
  | 'EMAIL_CLICK'
  | 'DOWNLOAD'
  | 'DEMO_REQUEST'
  | 'SIGNUP'
  | 'SCROLL_DEPTH'
  | 'TIME_ON_PAGE'
  | 'VIDEO_PLAY'
  | 'VIDEO_COMPLETE'
  | 'SITE_SEARCH'
  | 'FILTER_USE'
  | 'TAB_SWITCH'
  | 'ACCORDION_EXPAND'
  | 'MODAL_OPEN'
  | 'SOCIAL_SHARE'
  | 'SOCIAL_CLICK'
  | 'PDF_DOWNLOAD'
  | 'FILE_DOWNLOAD'
  | 'NEWSLETTER_SIGNUP'
  | 'CUSTOM_EVENT';

export type TrackingStatus =
  | 'PENDING'
  | 'CREATING'
  | 'ACTIVE'
  | 'FAILED'
  | 'PAUSED'
  | 'SYNCING';

export type TrackingDestination = 'GA4' | 'GOOGLE_ADS' | 'BOTH';

export interface Tracking {
  id: string;
  name: string;
  type: TrackingType;
  description?: string | null;
  status: TrackingStatus;
  selector?: string | null;
  urlPattern?: string | null;
  selectorConfig?: {
    selectors?: Array<{
      selector: string;
      confidence: number;
      method: string;
    }>;
    fallbacks?: string[];
  } | null;
  config?: Record<string, unknown> | null;
  destinations: TrackingDestination[];
  gtmTriggerId?: string | null;
  gtmTagId?: string | null;
  gtmTagIdGA4?: string | null;
  gtmTagIdAds?: string | null;
  gtmContainerId?: string | null;
  gtmWorkspaceId?: string | null;
  ga4EventName?: string | null;
  ga4Parameters?: Record<string, unknown> | null;
  ga4PropertyId?: string | null;
  conversionActionId?: string | null;
  adsConversionLabel?: string | null;
  adsConversionValue?: number | null;
  customerId: string;
  tenantId: string;
  isAutoCrawled: boolean;
  crawlMetadata?: Record<string, unknown> | null;
  selectorConfidence?: number | null;
  lastError?: string | null;
  lastSyncAt?: string | null;
  syncAttempts: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateTrackingInput {
  name: string;
  type: TrackingType;
  description?: string;
  selector?: string;
  urlPattern?: string;
  config?: Record<string, unknown>;
  destinations?: TrackingDestination[];
  ga4EventName?: string;
  ga4Parameters?: Record<string, unknown>;
  customerId: string;
}

export interface UpdateTrackingInput {
  name?: string;
  description?: string | null;
  selector?: string | null;
  urlPattern?: string | null;
  config?: Record<string, unknown> | null;
  destinations?: TrackingDestination[];
  ga4EventName?: string | null;
  ga4Parameters?: Record<string, unknown> | null;
  status?: TrackingStatus;
}

export const TRACKING_TYPE_LABELS: Record<TrackingType, string> = {
  BUTTON_CLICK: 'Button Click',
  LINK_CLICK: 'Link Click',
  PAGE_VIEW: 'Page View',
  ELEMENT_VISIBILITY: 'Element Visibility',
  FORM_SUBMIT: 'Form Submit',
  FORM_START: 'Form Start',
  FORM_ABANDON: 'Form Abandon',
  ADD_TO_CART: 'Add to Cart',
  REMOVE_FROM_CART: 'Remove from Cart',
  ADD_TO_WISHLIST: 'Add to Wishlist',
  VIEW_CART: 'View Cart',
  CHECKOUT_START: 'Checkout Start',
  CHECKOUT_STEP: 'Checkout Step',
  PURCHASE: 'Purchase',
  PRODUCT_VIEW: 'Product View',
  PHONE_CALL_CLICK: 'Phone Call Click',
  EMAIL_CLICK: 'Email Click',
  DOWNLOAD: 'Download',
  DEMO_REQUEST: 'Demo Request',
  SIGNUP: 'Sign Up',
  SCROLL_DEPTH: 'Scroll Depth',
  TIME_ON_PAGE: 'Time on Page',
  VIDEO_PLAY: 'Video Play',
  VIDEO_COMPLETE: 'Video Complete',
  SITE_SEARCH: 'Site Search',
  FILTER_USE: 'Filter Use',
  TAB_SWITCH: 'Tab Switch',
  ACCORDION_EXPAND: 'Accordion Expand',
  MODAL_OPEN: 'Modal Open',
  SOCIAL_SHARE: 'Social Share',
  SOCIAL_CLICK: 'Social Click',
  PDF_DOWNLOAD: 'PDF Download',
  FILE_DOWNLOAD: 'File Download',
  NEWSLETTER_SIGNUP: 'Newsletter Signup',
  CUSTOM_EVENT: 'Custom Event',
};

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  PENDING: 'Pending',
  CREATING: 'Creating',
  ACTIVE: 'Active',
  FAILED: 'Failed',
  PAUSED: 'Paused',
  SYNCING: 'Syncing',
};
