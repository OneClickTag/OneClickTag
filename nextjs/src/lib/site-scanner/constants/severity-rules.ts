import { TrackingType, RecommendationSeverity } from '@prisma/client';

/**
 * Default severity classification for each tracking type.
 * AI may override these based on context.
 */
export const DEFAULT_SEVERITY_MAP: Record<TrackingType, RecommendationSeverity> = {
  // Critical - Primary conversions
  PURCHASE: 'CRITICAL',
  FORM_SUBMIT: 'CRITICAL',
  SIGNUP: 'CRITICAL',
  PHONE_CALL_CLICK: 'CRITICAL',
  CHECKOUT_START: 'CRITICAL',
  DEMO_REQUEST: 'CRITICAL',

  // Important - Key micro-conversions
  ADD_TO_CART: 'IMPORTANT',
  EMAIL_CLICK: 'IMPORTANT',
  PRODUCT_VIEW: 'IMPORTANT',
  FORM_START: 'IMPORTANT',
  CHECKOUT_STEP: 'IMPORTANT',
  VIEW_CART: 'IMPORTANT',
  DOWNLOAD: 'IMPORTANT',

  // Recommended - Engagement metrics
  SCROLL_DEPTH: 'RECOMMENDED',
  VIDEO_PLAY: 'RECOMMENDED',
  NEWSLETTER_SIGNUP: 'RECOMMENDED',
  PAGE_VIEW: 'RECOMMENDED',
  SITE_SEARCH: 'RECOMMENDED',
  TIME_ON_PAGE: 'RECOMMENDED',
  VIDEO_COMPLETE: 'RECOMMENDED',
  BUTTON_CLICK: 'RECOMMENDED',
  LINK_CLICK: 'RECOMMENDED',
  ELEMENT_VISIBILITY: 'RECOMMENDED',
  PDF_DOWNLOAD: 'RECOMMENDED',
  FILE_DOWNLOAD: 'RECOMMENDED',
  FORM_ABANDON: 'RECOMMENDED',
  REMOVE_FROM_CART: 'RECOMMENDED',
  ADD_TO_WISHLIST: 'RECOMMENDED',

  // Optional - Detailed behavioral
  SOCIAL_SHARE: 'OPTIONAL',
  SOCIAL_CLICK: 'OPTIONAL',
  FILTER_USE: 'OPTIONAL',
  TAB_SWITCH: 'OPTIONAL',
  MODAL_OPEN: 'OPTIONAL',
  ACCORDION_EXPAND: 'OPTIONAL',
  CUSTOM_EVENT: 'OPTIONAL',
  TAB_VISIBILITY: 'OPTIONAL',
  TEXT_COPY: 'OPTIONAL',
  PAGE_PRINT: 'OPTIONAL',

  // Behavioral tracking - Important
  RAGE_CLICK: 'CRITICAL',
  DEAD_CLICK: 'IMPORTANT',
  EXIT_INTENT: 'IMPORTANT',
  FORM_FIELD_INTERACTION: 'IMPORTANT',
  ERROR_PAGE_VIEW: 'CRITICAL',
  OUTBOUND_CLICK: 'RECOMMENDED',
  RETURN_VISITOR: 'RECOMMENDED',
  SESSION_DURATION: 'RECOMMENDED',
  PAGE_ENGAGEMENT: 'RECOMMENDED',

  // Niche-specific tracking
  PRODUCT_IMAGE_INTERACTION: 'IMPORTANT',
  CART_ABANDONMENT: 'CRITICAL',
  PRICE_COMPARISON: 'IMPORTANT',
  REVIEW_INTERACTION: 'IMPORTANT',
  CONTENT_READ_THROUGH: 'IMPORTANT',
};

/**
 * Severity order for sorting (highest priority first).
 */
export const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  CRITICAL: 0,
  IMPORTANT: 1,
  RECOMMENDED: 2,
  OPTIONAL: 3,
};

/**
 * GA4 recommended event names for each tracking type.
 */
export const GA4_EVENT_NAMES: Partial<Record<TrackingType, string>> = {
  PURCHASE: 'purchase',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',
  CHECKOUT_START: 'begin_checkout',
  CHECKOUT_STEP: 'add_shipping_info',
  PRODUCT_VIEW: 'view_item',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  SIGNUP: 'sign_up',
  FORM_SUBMIT: 'generate_lead',
  FORM_START: 'form_start',
  PHONE_CALL_CLICK: 'phone_call_click',
  EMAIL_CLICK: 'email_click',
  DOWNLOAD: 'file_download',
  FILE_DOWNLOAD: 'file_download',
  PDF_DOWNLOAD: 'file_download',
  DEMO_REQUEST: 'demo_request',
  SCROLL_DEPTH: 'scroll',
  TIME_ON_PAGE: 'time_on_page',
  VIDEO_PLAY: 'video_start',
  VIDEO_COMPLETE: 'video_complete',
  SITE_SEARCH: 'search',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  SOCIAL_SHARE: 'share',
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'click',
  LINK_CLICK: 'click',
};
