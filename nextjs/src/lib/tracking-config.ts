import type { TrackingType } from '@/hooks/use-trackings';

// ============================================================================
// 1. Conversion Category Map: TrackingType -> Google Ads ConversionActionCategory
// ============================================================================

export const CONVERSION_CATEGORY_MAP: Record<TrackingType, string> = {
  BUTTON_CLICK: 'DEFAULT',
  LINK_CLICK: 'DEFAULT',
  PAGE_VIEW: 'PAGE_VIEW',
  ELEMENT_VISIBILITY: 'DEFAULT',
  FORM_SUBMIT: 'SUBMIT_LEAD_FORM',
  FORM_START: 'DEFAULT',
  FORM_ABANDON: 'DEFAULT',
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'ADD_TO_CART',
  ADD_TO_WISHLIST: 'ADD_TO_CART',
  VIEW_CART: 'ADD_TO_CART',
  CHECKOUT_START: 'BEGIN_CHECKOUT',
  CHECKOUT_STEP: 'BEGIN_CHECKOUT',
  PURCHASE: 'PURCHASE',
  PRODUCT_VIEW: 'PAGE_VIEW',
  PHONE_CALL_CLICK: 'DEFAULT',
  EMAIL_CLICK: 'CONTACT',
  DOWNLOAD: 'DEFAULT',
  DEMO_REQUEST: 'BOOK_APPOINTMENT',
  SIGNUP: 'SIGNUP',
  SCROLL_DEPTH: 'DEFAULT',
  TIME_ON_PAGE: 'DEFAULT',
  VIDEO_PLAY: 'DEFAULT',
  VIDEO_COMPLETE: 'DEFAULT',
  SITE_SEARCH: 'DEFAULT',
  FILTER_USE: 'DEFAULT',
  TAB_SWITCH: 'DEFAULT',
  ACCORDION_EXPAND: 'DEFAULT',
  MODAL_OPEN: 'DEFAULT',
  SOCIAL_SHARE: 'DEFAULT',
  SOCIAL_CLICK: 'DEFAULT',
  PDF_DOWNLOAD: 'DEFAULT',
  FILE_DOWNLOAD: 'DEFAULT',
  NEWSLETTER_SIGNUP: 'SIGNUP',
  CUSTOM_EVENT: 'DEFAULT',
};

export function getConversionCategory(type: TrackingType): string {
  return CONVERSION_CATEGORY_MAP[type] || 'DEFAULT';
}

// ============================================================================
// 2. Tracking Type Field Config: which form fields to show per type
// ============================================================================

export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number;
}

export interface TrackingFieldConfig {
  showSelector: boolean;
  showUrlPattern: boolean;
  showConversionValue: boolean;
  selectorPlaceholder?: string;
  urlPatternPlaceholder?: string;
  configFields: ConfigFieldDefinition[];
}

const CLICK_CONFIG: TrackingFieldConfig = {
  showSelector: true,
  showUrlPattern: false,
  showConversionValue: false,
  selectorPlaceholder: 'e.g., #buy-now-btn, .cta-button',
  configFields: [],
};

const PAGE_CONFIG: TrackingFieldConfig = {
  showSelector: false,
  showUrlPattern: true,
  showConversionValue: false,
  urlPatternPlaceholder: 'e.g., /thank-you, /checkout/*',
  configFields: [],
};

const ENGAGEMENT_CONFIG: TrackingFieldConfig = {
  showSelector: true,
  showUrlPattern: false,
  showConversionValue: false,
  selectorPlaceholder: 'e.g., .interactive-element',
  configFields: [],
};

export const TRACKING_TYPE_FIELD_CONFIG: Record<TrackingType, TrackingFieldConfig> = {
  BUTTON_CLICK: CLICK_CONFIG,
  LINK_CLICK: {
    ...CLICK_CONFIG,
    selectorPlaceholder: 'e.g., a.external-link, .nav-link',
  },
  PAGE_VIEW: PAGE_CONFIG,
  ELEMENT_VISIBILITY: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #promo-banner, .section-cta',
    configFields: [],
  },
  FORM_SUBMIT: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #contact-form, .signup-form',
    configFields: [],
  },
  FORM_START: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #contact-form, .signup-form',
    configFields: [],
  },
  FORM_ABANDON: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #checkout-form',
    configFields: [],
  },
  ADD_TO_CART: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: true,
    selectorPlaceholder: 'e.g., .add-to-cart-btn',
    configFields: [],
  },
  REMOVE_FROM_CART: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., .remove-item-btn',
    configFields: [],
  },
  ADD_TO_WISHLIST: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., .wishlist-btn',
    configFields: [],
  },
  VIEW_CART: {
    showSelector: false,
    showUrlPattern: true,
    showConversionValue: false,
    urlPatternPlaceholder: 'e.g., /cart',
    configFields: [],
  },
  CHECKOUT_START: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: true,
    selectorPlaceholder: 'e.g., .checkout-btn',
    configFields: [],
  },
  CHECKOUT_STEP: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: true,
    selectorPlaceholder: 'e.g., .next-step-btn',
    configFields: [],
  },
  PURCHASE: {
    showSelector: true,
    showUrlPattern: true,
    showConversionValue: true,
    selectorPlaceholder: 'e.g., .purchase-btn',
    urlPatternPlaceholder: 'e.g., /order-confirmation',
    configFields: [
      {
        key: 'currencyCode',
        label: 'Currency',
        type: 'select',
        options: [
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' },
          { value: 'GBP', label: 'GBP' },
          { value: 'ILS', label: 'ILS' },
          { value: 'CAD', label: 'CAD' },
          { value: 'AUD', label: 'AUD' },
          { value: 'JPY', label: 'JPY' },
        ],
        defaultValue: 'USD',
      },
    ],
  },
  PRODUCT_VIEW: {
    ...PAGE_CONFIG,
    urlPatternPlaceholder: 'e.g., /products/*, /item/*',
  },
  PHONE_CALL_CLICK: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., a[href^="tel:"]',
    configFields: [],
  },
  EMAIL_CLICK: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., a[href^="mailto:"]',
    configFields: [],
  },
  DOWNLOAD: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., .download-btn, a[download]',
    configFields: [],
  },
  DEMO_REQUEST: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #demo-form, .request-demo-btn',
    configFields: [],
  },
  SIGNUP: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #signup-form, .register-btn',
    configFields: [],
  },
  SCROLL_DEPTH: {
    showSelector: false,
    showUrlPattern: false,
    showConversionValue: false,
    configFields: [
      {
        key: 'scrollPercentage',
        label: 'Scroll Percentage',
        type: 'number',
        placeholder: 'e.g., 50, 75, 90',
        defaultValue: 50,
      },
    ],
  },
  TIME_ON_PAGE: {
    showSelector: false,
    showUrlPattern: false,
    showConversionValue: false,
    configFields: [
      {
        key: 'timeSeconds',
        label: 'Time (seconds)',
        type: 'number',
        placeholder: 'e.g., 30, 60, 120',
        defaultValue: 30,
      },
    ],
  },
  VIDEO_PLAY: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., video, .video-player',
    configFields: [],
  },
  VIDEO_COMPLETE: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., video, .video-player',
    configFields: [],
  },
  SITE_SEARCH: ENGAGEMENT_CONFIG,
  FILTER_USE: ENGAGEMENT_CONFIG,
  TAB_SWITCH: ENGAGEMENT_CONFIG,
  ACCORDION_EXPAND: ENGAGEMENT_CONFIG,
  MODAL_OPEN: ENGAGEMENT_CONFIG,
  SOCIAL_SHARE: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., .share-btn, .social-share',
    configFields: [],
  },
  SOCIAL_CLICK: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., .social-link, a[href*="facebook"]',
    configFields: [],
  },
  PDF_DOWNLOAD: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., a[href$=".pdf"]',
    configFields: [],
  },
  FILE_DOWNLOAD: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., a[download], .file-download',
    configFields: [],
  },
  NEWSLETTER_SIGNUP: {
    showSelector: true,
    showUrlPattern: false,
    showConversionValue: false,
    selectorPlaceholder: 'e.g., #newsletter-form, .subscribe-btn',
    configFields: [],
  },
  CUSTOM_EVENT: {
    showSelector: true,
    showUrlPattern: true,
    showConversionValue: true,
    selectorPlaceholder: 'e.g., .custom-element',
    urlPatternPlaceholder: 'e.g., /custom-page/*',
    configFields: [
      {
        key: 'customEventName',
        label: 'Custom Event Name',
        type: 'text',
        placeholder: 'e.g., my_custom_event',
      },
    ],
  },
};

// ============================================================================
// 3. Value Settings Helper for Google Ads API
// ============================================================================

export function getDefaultValueSettings(
  type: TrackingType,
  adsConversionValue?: number | null,
  config?: Record<string, unknown> | null
): { defaultValue: number; defaultCurrencyCode: string } | undefined {
  const fieldConfig = TRACKING_TYPE_FIELD_CONFIG[type];
  if (!fieldConfig?.showConversionValue || adsConversionValue == null) {
    return undefined;
  }

  const currencyCode = (config?.currencyCode as string) || 'USD';
  return {
    defaultValue: adsConversionValue,
    defaultCurrencyCode: currencyCode,
  };
}
