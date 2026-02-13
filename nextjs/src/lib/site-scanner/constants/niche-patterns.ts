/**
 * Fallback niche detection patterns used when AI is unavailable.
 * Each niche has URL patterns, content keywords, and page type indicators.
 */

export interface NichePattern {
  niche: string;
  subCategories: string[];
  urlPatterns: RegExp[];
  contentKeywords: string[];
  pageTypeIndicators: Record<string, number>; // pageType -> weight
  technologyIndicators: string[]; // technology names that suggest this niche
}

export const NICHE_PATTERNS: NichePattern[] = [
  {
    niche: 'e-commerce',
    subCategories: ['fashion', 'electronics', 'home-garden', 'food-beverage', 'general-retail'],
    urlPatterns: [
      /\/product[s]?\//i,
      /\/shop\//i,
      /\/store\//i,
      /\/cart/i,
      /\/checkout/i,
      /\/collection[s]?\//i,
      /\/categor(y|ies)\//i,
      /\/item[s]?\//i,
      /\/order/i,
      /\/wishlist/i,
    ],
    contentKeywords: [
      'add to cart', 'buy now', 'shop now', 'price', 'checkout',
      'shipping', 'delivery', 'in stock', 'out of stock', 'sku',
      'product', 'catalog', 'sale', 'discount', 'coupon', 'shopping cart',
      'free shipping', 'returns', 'size guide', 'quantity',
    ],
    pageTypeIndicators: {
      product: 5,
      checkout: 5,
      cart: 4,
      category: 3,
      collection: 3,
    },
    technologyIndicators: ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'PrestaShop'],
  },
  {
    niche: 'saas',
    subCategories: ['b2b-saas', 'b2c-saas', 'devtools', 'marketing-tools', 'productivity'],
    urlPatterns: [
      /\/pricing/i,
      /\/features/i,
      /\/integrations/i,
      /\/docs\//i,
      /\/documentation/i,
      /\/api\//i,
      /\/changelog/i,
      /\/signup/i,
      /\/register/i,
      /\/demo/i,
      /\/trial/i,
    ],
    contentKeywords: [
      'free trial', 'start free', 'pricing', 'per month', 'per year',
      'enterprise', 'integration', 'api', 'dashboard', 'analytics',
      'features', 'platform', 'solution', 'subscribe', 'plan',
      'demo', 'request demo', 'get started', 'sign up free',
    ],
    pageTypeIndicators: {
      pricing: 5,
      features: 4,
      integrations: 3,
      documentation: 3,
      changelog: 2,
    },
    technologyIndicators: ['Intercom', 'Drift', 'Stripe'],
  },
  {
    niche: 'lead-generation',
    subCategories: ['real-estate', 'legal', 'medical', 'consulting', 'agency', 'local-business'],
    urlPatterns: [
      /\/contact/i,
      /\/about/i,
      /\/services/i,
      /\/quote/i,
      /\/consultation/i,
      /\/appointment/i,
      /\/book/i,
      /\/schedule/i,
      /\/estimate/i,
      /\/request/i,
    ],
    contentKeywords: [
      'contact us', 'get a quote', 'free consultation', 'call us',
      'request a quote', 'schedule', 'appointment', 'book now',
      'our services', 'our team', 'about us', 'testimonials',
      'case studies', 'portfolio', 'clients', 'free estimate',
      'phone', 'email us', 'get in touch',
    ],
    pageTypeIndicators: {
      contact: 5,
      services: 4,
      about: 3,
      testimonials: 3,
      portfolio: 2,
    },
    technologyIndicators: ['Calendly', 'HubSpot', 'Typeform'],
  },
  {
    niche: 'content',
    subCategories: ['blog', 'news', 'media', 'education', 'publishing'],
    urlPatterns: [
      /\/blog\//i,
      /\/article[s]?\//i,
      /\/post[s]?\//i,
      /\/news\//i,
      /\/stories\//i,
      /\/podcast/i,
      /\/video[s]?\//i,
      /\/learn\//i,
      /\/resource[s]?\//i,
      /\/guide[s]?\//i,
    ],
    contentKeywords: [
      'read more', 'published', 'author', 'subscribe', 'newsletter',
      'blog', 'article', 'latest posts', 'trending', 'editor',
      'share', 'comment', 'category', 'tags', 'read time',
      'related articles', 'featured', 'popular posts',
    ],
    pageTypeIndicators: {
      blog: 5,
      article: 4,
      news: 4,
      resource: 3,
    },
    technologyIndicators: ['WordPress', 'Ghost', 'Medium'],
  },
  {
    niche: 'non-profit',
    subCategories: ['charity', 'education', 'health', 'environment', 'community'],
    urlPatterns: [
      /\/donate/i,
      /\/volunteer/i,
      /\/cause[s]?\//i,
      /\/mission/i,
      /\/impact/i,
      /\/campaign[s]?\//i,
    ],
    contentKeywords: [
      'donate', 'donation', 'volunteer', 'mission', 'impact',
      'cause', 'help', 'support', 'give', 'fundraise',
      'community', 'non-profit', 'nonprofit', 'charity',
    ],
    pageTypeIndicators: {
      donate: 5,
      volunteer: 4,
      mission: 3,
      impact: 3,
    },
    technologyIndicators: [],
  },
];

/**
 * Available niches for user selection in the niche confirmation UI.
 */
export const AVAILABLE_NICHES = [
  'e-commerce',
  'saas',
  'lead-generation',
  'content',
  'non-profit',
  'marketplace',
  'education',
  'healthcare',
  'real-estate',
  'travel',
  'finance',
  'food-delivery',
  'entertainment',
  'other',
];
