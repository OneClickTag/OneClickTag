import { TrackingType, RecommendationSeverity } from '@prisma/client';

/**
 * Element patterns for tracking detection, organized by niche.
 * These are fallback patterns used when AI analysis is unavailable.
 */

export interface TrackingPattern {
  name: string;
  trackingType: TrackingType;
  severity: RecommendationSeverity;
  funnelStage: 'top' | 'middle' | 'bottom';
  ga4EventName: string;
  // CSS selector patterns to search for
  selectorPatterns: string[];
  // Text content patterns (button/link text)
  textPatterns: RegExp[];
  // URL patterns where this is likely found
  urlPatterns?: RegExp[];
  description: string;
}

// ========================================
// Universal Patterns (all niches)
// ========================================

export const UNIVERSAL_PATTERNS: TrackingPattern[] = [
  // Forms
  {
    name: 'Form Submission',
    trackingType: 'FORM_SUBMIT',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'generate_lead',
    selectorPatterns: [
      'form[action]',
      'form:has(button[type="submit"])',
      'form:has(input[type="submit"])',
    ],
    textPatterns: [/submit/i, /send/i, /sign\s*up/i, /register/i, /subscribe/i],
    description: 'Track form submissions to measure lead generation and user sign-ups.',
  },
  {
    name: 'Form Start',
    trackingType: 'FORM_START',
    severity: 'IMPORTANT',
    funnelStage: 'middle',
    ga4EventName: 'form_start',
    selectorPatterns: [
      'form input:first-of-type',
      'form textarea:first-of-type',
      'form select:first-of-type',
    ],
    textPatterns: [],
    description: 'Track when users begin filling out forms to measure form engagement.',
  },

  // Phone & Email
  {
    name: 'Phone Call Click',
    trackingType: 'PHONE_CALL_CLICK',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'phone_call_click',
    selectorPatterns: ['a[href^="tel:"]'],
    textPatterns: [/call\s*(us|now)/i, /phone/i],
    description: 'Track phone number clicks as high-intent conversion actions.',
  },
  {
    name: 'Email Click',
    trackingType: 'EMAIL_CLICK',
    severity: 'IMPORTANT',
    funnelStage: 'bottom',
    ga4EventName: 'email_click',
    selectorPatterns: ['a[href^="mailto:"]'],
    textPatterns: [/email\s*(us)?/i, /contact/i],
    description: 'Track email link clicks as lead generation signals.',
  },

  // Engagement
  {
    name: 'Scroll Depth',
    trackingType: 'SCROLL_DEPTH',
    severity: 'RECOMMENDED',
    funnelStage: 'top',
    ga4EventName: 'scroll',
    selectorPatterns: [],
    textPatterns: [],
    description: 'Track how far users scroll to measure content engagement.',
  },
  {
    name: 'Video Play',
    trackingType: 'VIDEO_PLAY',
    severity: 'RECOMMENDED',
    funnelStage: 'top',
    ga4EventName: 'video_start',
    selectorPatterns: [
      'video',
      'iframe[src*="youtube"]',
      'iframe[src*="vimeo"]',
      'iframe[src*="wistia"]',
      '.video-container',
      '[data-video]',
    ],
    textPatterns: [/play/i, /watch/i],
    description: 'Track video plays to measure multimedia engagement.',
  },

  // Downloads
  {
    name: 'File Download',
    trackingType: 'FILE_DOWNLOAD',
    severity: 'RECOMMENDED',
    funnelStage: 'middle',
    ga4EventName: 'file_download',
    selectorPatterns: [
      'a[href$=".pdf"]',
      'a[href$=".doc"]',
      'a[href$=".docx"]',
      'a[href$=".xls"]',
      'a[href$=".xlsx"]',
      'a[href$=".zip"]',
      'a[download]',
    ],
    textPatterns: [/download/i, /get\s*(the\s*)?pdf/i, /brochure/i, /whitepaper/i],
    description: 'Track file downloads as content engagement and lead qualification signals.',
  },

  // Social
  {
    name: 'Social Share',
    trackingType: 'SOCIAL_SHARE',
    severity: 'OPTIONAL',
    funnelStage: 'top',
    ga4EventName: 'share',
    selectorPatterns: [
      'a[href*="facebook.com/sharer"]',
      'a[href*="twitter.com/intent"]',
      'a[href*="linkedin.com/sharing"]',
      '.share-button',
      '[data-share]',
    ],
    textPatterns: [/share/i],
    description: 'Track social sharing to measure content virality.',
  },

  // Newsletter
  {
    name: 'Newsletter Signup',
    trackingType: 'NEWSLETTER_SIGNUP',
    severity: 'RECOMMENDED',
    funnelStage: 'middle',
    ga4EventName: 'newsletter_signup',
    selectorPatterns: [
      'form[action*="subscribe"]',
      'form[action*="newsletter"]',
      'form[action*="mailchimp"]',
      '.newsletter-form',
      '#newsletter-form',
    ],
    textPatterns: [/newsletter/i, /subscribe/i, /stay\s*updated/i, /join\s*(our\s*)?list/i],
    description: 'Track newsletter sign-ups as lead nurturing conversions.',
  },
];

// ========================================
// E-commerce Patterns
// ========================================

export const ECOMMERCE_PATTERNS: TrackingPattern[] = [
  {
    name: 'Add to Cart',
    trackingType: 'ADD_TO_CART',
    severity: 'CRITICAL',
    funnelStage: 'middle',
    ga4EventName: 'add_to_cart',
    selectorPatterns: [
      'button.add-to-cart',
      '[data-action="add-to-cart"]',
      '.product-form__submit',
      '#add-to-cart',
      'button[name="add"]',
    ],
    textPatterns: [/add\s*to\s*cart/i, /add\s*to\s*bag/i, /buy/i],
    urlPatterns: [/\/product/i, /\/item/i],
    description: 'Track add-to-cart actions as key mid-funnel conversion events.',
  },
  {
    name: 'Checkout Start',
    trackingType: 'CHECKOUT_START',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'begin_checkout',
    selectorPatterns: [
      'a[href*="checkout"]',
      'button.checkout',
      '#checkout-button',
      '.cart__checkout-button',
    ],
    textPatterns: [/checkout/i, /proceed\s*to/i, /place\s*order/i],
    urlPatterns: [/\/cart/i, /\/checkout/i],
    description: 'Track checkout initiation as a critical bottom-funnel conversion.',
  },
  {
    name: 'Purchase',
    trackingType: 'PURCHASE',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'purchase',
    selectorPatterns: [
      'button[type="submit"]',
      '.payment-submit',
      '#complete-order',
    ],
    textPatterns: [/complete\s*(order|purchase)/i, /pay\s*now/i, /place\s*order/i, /confirm/i],
    urlPatterns: [/\/checkout/i, /\/payment/i, /\/order/i],
    description: 'Track completed purchases as the primary revenue conversion.',
  },
  {
    name: 'Product View',
    trackingType: 'PRODUCT_VIEW',
    severity: 'IMPORTANT',
    funnelStage: 'top',
    ga4EventName: 'view_item',
    selectorPatterns: [],
    textPatterns: [],
    urlPatterns: [/\/product/i, /\/item/i, /\/p\//i],
    description: 'Track product page views to measure shopping interest and funnel entry.',
  },
  {
    name: 'View Cart',
    trackingType: 'VIEW_CART',
    severity: 'IMPORTANT',
    funnelStage: 'middle',
    ga4EventName: 'view_cart',
    selectorPatterns: [
      'a[href*="cart"]',
      '.cart-icon',
      '#cart-link',
      '.mini-cart',
    ],
    textPatterns: [/view\s*cart/i, /my\s*cart/i, /shopping\s*bag/i],
    description: 'Track cart views to measure purchase intent.',
  },
  {
    name: 'Wishlist Add',
    trackingType: 'ADD_TO_WISHLIST',
    severity: 'RECOMMENDED',
    funnelStage: 'middle',
    ga4EventName: 'add_to_wishlist',
    selectorPatterns: [
      '.wishlist-button',
      '[data-action="wishlist"]',
      '.save-for-later',
    ],
    textPatterns: [/wishlist/i, /save\s*for\s*later/i, /favorite/i],
    description: 'Track wishlist additions as engagement and retargeting signals.',
  },
  {
    name: 'Site Search',
    trackingType: 'SITE_SEARCH',
    severity: 'RECOMMENDED',
    funnelStage: 'top',
    ga4EventName: 'search',
    selectorPatterns: [
      'form[role="search"]',
      'input[type="search"]',
      '.search-form',
      '#search-form',
    ],
    textPatterns: [/search/i],
    description: 'Track site search to understand user intent and product discovery.',
  },
  {
    name: 'Filter Use',
    trackingType: 'FILTER_USE',
    severity: 'OPTIONAL',
    funnelStage: 'top',
    ga4EventName: 'filter_use',
    selectorPatterns: [
      '.filter-option',
      '[data-filter]',
      '.facet-item',
    ],
    textPatterns: [/filter/i, /sort/i, /refine/i],
    urlPatterns: [/\/collection/i, /\/categor/i, /\/shop/i],
    description: 'Track filter usage to understand product discovery behavior.',
  },
];

// ========================================
// SaaS Patterns
// ========================================

export const SAAS_PATTERNS: TrackingPattern[] = [
  {
    name: 'Signup',
    trackingType: 'SIGNUP',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'sign_up',
    selectorPatterns: [
      'a[href*="signup"]',
      'a[href*="register"]',
      'a[href*="sign-up"]',
      'a[href*="get-started"]',
      '.signup-button',
      '#signup-cta',
    ],
    textPatterns: [
      /sign\s*up/i, /get\s*started/i, /start\s*(free|trial)/i,
      /create\s*account/i, /register/i, /try\s*(it\s*)?free/i,
    ],
    description: 'Track sign-ups as the primary SaaS conversion event.',
  },
  {
    name: 'Demo Request',
    trackingType: 'DEMO_REQUEST',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'demo_request',
    selectorPatterns: [
      'a[href*="demo"]',
      'button.demo-button',
      '.request-demo',
    ],
    textPatterns: [/request\s*(a\s*)?demo/i, /book\s*(a\s*)?demo/i, /schedule\s*(a\s*)?demo/i],
    description: 'Track demo requests as high-intent enterprise conversion events.',
  },
  {
    name: 'Pricing Page View',
    trackingType: 'PAGE_VIEW',
    severity: 'IMPORTANT',
    funnelStage: 'middle',
    ga4EventName: 'view_pricing',
    selectorPatterns: [],
    textPatterns: [],
    urlPatterns: [/\/pricing/i],
    description: 'Track pricing page views as key intent signals in SaaS funnels.',
  },
  {
    name: 'Feature Page View',
    trackingType: 'PAGE_VIEW',
    severity: 'RECOMMENDED',
    funnelStage: 'top',
    ga4EventName: 'view_features',
    selectorPatterns: [],
    textPatterns: [],
    urlPatterns: [/\/features/i],
    description: 'Track feature page views to measure product interest.',
  },
];

// ========================================
// Lead Generation Patterns
// ========================================

export const LEAD_GEN_PATTERNS: TrackingPattern[] = [
  {
    name: 'Contact Form Submit',
    trackingType: 'FORM_SUBMIT',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'generate_lead',
    selectorPatterns: [
      'form[action*="contact"]',
      '#contact-form',
      '.contact-form',
      'form:has(input[name="phone"])',
    ],
    textPatterns: [/send\s*message/i, /get\s*in\s*touch/i, /contact\s*us/i, /submit/i],
    urlPatterns: [/\/contact/i],
    description: 'Track contact form submissions as the primary lead conversion.',
  },
  {
    name: 'Quote Request',
    trackingType: 'FORM_SUBMIT',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'request_quote',
    selectorPatterns: [
      'form[action*="quote"]',
      '#quote-form',
      '.quote-form',
    ],
    textPatterns: [/get\s*a?\s*quote/i, /request\s*quote/i, /free\s*estimate/i],
    urlPatterns: [/\/quote/i, /\/estimate/i],
    description: 'Track quote requests as high-intent lead generation events.',
  },
  {
    name: 'Appointment Booking',
    trackingType: 'FORM_SUBMIT',
    severity: 'CRITICAL',
    funnelStage: 'bottom',
    ga4EventName: 'book_appointment',
    selectorPatterns: [
      'a[href*="calendly"]',
      'a[href*="acuity"]',
      '.booking-button',
      'iframe[src*="calendly"]',
    ],
    textPatterns: [/book\s*(an?\s*)?appointment/i, /schedule/i, /book\s*now/i],
    urlPatterns: [/\/book/i, /\/schedule/i, /\/appointment/i],
    description: 'Track appointment bookings as direct lead conversions.',
  },
  {
    name: 'Services Page View',
    trackingType: 'PAGE_VIEW',
    severity: 'IMPORTANT',
    funnelStage: 'top',
    ga4EventName: 'view_services',
    selectorPatterns: [],
    textPatterns: [],
    urlPatterns: [/\/services/i],
    description: 'Track services page views to measure interest in offerings.',
  },
];

// ========================================
// Content Patterns
// ========================================

export const CONTENT_PATTERNS: TrackingPattern[] = [
  {
    name: 'Article Read',
    trackingType: 'SCROLL_DEPTH',
    severity: 'IMPORTANT',
    funnelStage: 'top',
    ga4EventName: 'article_read',
    selectorPatterns: [],
    textPatterns: [],
    urlPatterns: [/\/blog\//i, /\/article/i, /\/post/i],
    description: 'Track article reads to measure content engagement depth.',
  },
  {
    name: 'Newsletter Subscription',
    trackingType: 'NEWSLETTER_SIGNUP',
    severity: 'CRITICAL',
    funnelStage: 'middle',
    ga4EventName: 'newsletter_signup',
    selectorPatterns: [
      'form[action*="subscribe"]',
      '.newsletter-form',
      '#newsletter',
    ],
    textPatterns: [/subscribe/i, /newsletter/i, /join/i, /get\s*updates/i],
    description: 'Track newsletter subscriptions as the primary content conversion.',
  },
  {
    name: 'Comment Submission',
    trackingType: 'FORM_SUBMIT',
    severity: 'RECOMMENDED',
    funnelStage: 'top',
    ga4EventName: 'submit_comment',
    selectorPatterns: [
      '#comment-form',
      '.comment-form',
      'form[action*="comment"]',
    ],
    textPatterns: [/post\s*comment/i, /submit\s*comment/i, /reply/i],
    description: 'Track comment submissions as content engagement conversions.',
  },
];

/**
 * Get niche-specific patterns for a given niche.
 */
export function getPatternsForNiche(niche: string): TrackingPattern[] {
  const nicheMap: Record<string, TrackingPattern[]> = {
    'e-commerce': ECOMMERCE_PATTERNS,
    'saas': SAAS_PATTERNS,
    'lead-generation': LEAD_GEN_PATTERNS,
    'content': CONTENT_PATTERNS,
  };

  const nichePatterns = nicheMap[niche] || [];
  return [...UNIVERSAL_PATTERNS, ...nichePatterns];
}
