import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums matching Prisma schema
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
  BOTH = 'BOTH',
}

export enum TrackingStatus {
  PENDING = 'PENDING',
  CREATING = 'CREATING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  SYNCING = 'SYNCING',
}

// Type-specific configuration classes

export class ScrollDepthConfigDto {
  @ApiProperty({ description: 'Scroll percentage threshold (25, 50, 75, 100)', example: 75 })
  @IsNumber()
  @Min(1)
  @Max(100)
  scrollPercentage: number;

  @ApiPropertyOptional({ description: 'Fire once per page load or multiple times', default: true })
  @IsOptional()
  @IsBoolean()
  fireOnce?: boolean;
}

export class TimeOnPageConfigDto {
  @ApiProperty({ description: 'Time in seconds', example: 30 })
  @IsNumber()
  @Min(1)
  timeSeconds: number;

  @ApiPropertyOptional({ description: 'Fire once per page load or multiple times', default: true })
  @IsOptional()
  @IsBoolean()
  fireOnce?: boolean;
}

export class VideoTrackingConfigDto {
  @ApiPropertyOptional({ description: 'Video element selector' })
  @IsOptional()
  @IsString()
  videoSelector?: string;

  @ApiPropertyOptional({ description: 'Track specific milestones', example: [25, 50, 75, 100] })
  @IsOptional()
  @IsArray()
  milestones?: number[];
}

export class EcommerceConfigDto {
  @ApiPropertyOptional({ description: 'Track transaction value', default: true })
  @IsOptional()
  @IsBoolean()
  trackValue?: boolean;

  @ApiPropertyOptional({ description: 'Default conversion value if not dynamic' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultValue?: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Track product details (ID, name, category)' })
  @IsOptional()
  @IsBoolean()
  trackProductDetails?: boolean;
}

export class FormTrackingConfigDto {
  @ApiPropertyOptional({ description: 'Form ID or selector' })
  @IsOptional()
  @IsString()
  formSelector?: string;

  @ApiPropertyOptional({ description: 'Track individual field interactions' })
  @IsOptional()
  @IsBoolean()
  trackFields?: boolean;

  @ApiPropertyOptional({ description: 'Track form abandonment' })
  @IsOptional()
  @IsBoolean()
  trackAbandonment?: boolean;

  @ApiPropertyOptional({ description: 'Fields to track', example: ['email', 'name', 'company'] })
  @IsOptional()
  @IsArray()
  fieldsToTrack?: string[];
}

export class SelectorConfigDto {
  @ApiProperty({ description: 'CSS selector' })
  @IsString()
  selector: string;

  @ApiPropertyOptional({ description: 'Confidence score 0-1', example: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Detection method', example: 'auto-crawled' })
  @IsOptional()
  @IsString()
  method?: string; // 'manual', 'auto-crawled', 'ai-suggested'
}

// Main DTO for creating tracking
export class CreateTrackingDto {
  @ApiProperty({ description: 'Tracking name', example: 'Add to Cart - Product Page' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tracking type', enum: TrackingType })
  @IsEnum(TrackingType)
  type: TrackingType;

  @ApiPropertyOptional({ description: 'Tracking description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'CSS selector (for click/visibility tracking)' })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({ description: 'URL pattern (for page view tracking)' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({
    description: 'Multiple selectors with confidence scores (for crawler)',
    type: [SelectorConfigDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectorConfigDto)
  selectorConfig?: SelectorConfigDto[];

  @ApiPropertyOptional({
    description: 'Type-specific configuration',
    example: { scrollPercentage: 75, timeSeconds: 30, value: 99.99 }
  })
  @IsOptional()
  @IsObject()
  config?:
    | ScrollDepthConfigDto
    | TimeOnPageConfigDto
    | VideoTrackingConfigDto
    | EcommerceConfigDto
    | FormTrackingConfigDto
    | Record<string, any>;

  @ApiProperty({
    description: 'Tracking destinations',
    enum: TrackingDestination,
    isArray: true,
    default: [TrackingDestination.GA4]
  })
  @IsArray()
  @IsEnum(TrackingDestination, { each: true })
  destinations: TrackingDestination[];

  @ApiPropertyOptional({ description: 'Custom GA4 event name (overrides default)' })
  @IsOptional()
  @IsString()
  ga4EventName?: string;

  @ApiPropertyOptional({ description: 'GA4 event parameters', example: { item_id: 'PROD123', value: 99.99 } })
  @IsOptional()
  @IsObject()
  ga4Parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Google Ads conversion value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adsConversionValue?: number;

  @ApiPropertyOptional({ description: 'Specific GA4 property ID (overrides default)' })
  @IsOptional()
  @IsString()
  ga4PropertyId?: string;

  @ApiPropertyOptional({ description: 'Specific Google Ads account ID (overrides default)' })
  @IsOptional()
  @IsString()
  adsAccountId?: string;
}

export class UpdateTrackingDto {
  @ApiPropertyOptional({ description: 'Tracking name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tracking description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'CSS selector' })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({ description: 'URL pattern' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ description: 'Type-specific configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tracking destinations',
    enum: TrackingDestination,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TrackingDestination, { each: true })
  destinations?: TrackingDestination[];

  @ApiPropertyOptional({ description: 'Tracking status', enum: TrackingStatus })
  @IsOptional()
  @IsEnum(TrackingStatus)
  status?: TrackingStatus;

  @ApiPropertyOptional({ description: 'Custom GA4 event name' })
  @IsOptional()
  @IsString()
  ga4EventName?: string;

  @ApiPropertyOptional({ description: 'GA4 event parameters' })
  @IsOptional()
  @IsObject()
  ga4Parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Google Ads conversion value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adsConversionValue?: number;
}

export class TrackingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: TrackingType })
  type: TrackingType;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TrackingStatus })
  status: TrackingStatus;

  @ApiPropertyOptional()
  selector?: string;

  @ApiPropertyOptional()
  urlPattern?: string;

  @ApiPropertyOptional()
  config?: Record<string, any>;

  @ApiProperty({ enum: TrackingDestination, isArray: true })
  destinations: TrackingDestination[];

  @ApiPropertyOptional()
  gtmTriggerId?: string;

  @ApiPropertyOptional()
  gtmTagIdGA4?: string;

  @ApiPropertyOptional()
  gtmTagIdAds?: string;

  @ApiPropertyOptional()
  ga4EventName?: string;

  @ApiPropertyOptional()
  ga4PropertyId?: string;

  @ApiPropertyOptional()
  conversionActionId?: string;

  @ApiPropertyOptional()
  adsConversionValue?: number;

  @ApiPropertyOptional()
  isAutoCrawled?: boolean;

  @ApiPropertyOptional()
  selectorConfidence?: number;

  @ApiPropertyOptional()
  lastError?: string;

  @ApiPropertyOptional()
  lastSyncAt?: Date;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Tracking type metadata for frontend
export interface TrackingTypeMetadata {
  type: TrackingType;
  label: string;
  description: string;
  category: 'basic' | 'forms' | 'ecommerce' | 'lead-gen' | 'engagement' | 'navigation' | 'social' | 'content' | 'custom';
  icon: string;
  requiredFields: string[];
  optionalFields: string[];
  defaultGA4EventName: string;
  supportsValue: boolean;
  configSchema?: any;
}

export const TRACKING_TYPE_METADATA: Record<TrackingType, TrackingTypeMetadata> = {
  [TrackingType.BUTTON_CLICK]: {
    type: TrackingType.BUTTON_CLICK,
    label: 'Button Click',
    description: 'Track when a button is clicked',
    category: 'basic',
    icon: 'MousePointer',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'button_click',
    supportsValue: false,
  },
  [TrackingType.LINK_CLICK]: {
    type: TrackingType.LINK_CLICK,
    label: 'Link Click',
    description: 'Track when a link is clicked',
    category: 'basic',
    icon: 'Link',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'link_click',
    supportsValue: false,
  },
  [TrackingType.PAGE_VIEW]: {
    type: TrackingType.PAGE_VIEW,
    label: 'Page View',
    description: 'Track specific page views by URL pattern',
    category: 'basic',
    icon: 'FileText',
    requiredFields: ['urlPattern'],
    optionalFields: [],
    defaultGA4EventName: 'page_view',
    supportsValue: false,
  },
  [TrackingType.FORM_SUBMIT]: {
    type: TrackingType.FORM_SUBMIT,
    label: 'Form Submission',
    description: 'Track form submissions',
    category: 'forms',
    icon: 'CheckSquare',
    requiredFields: ['selector'],
    optionalFields: ['config.trackFields', 'config.fieldsToTrack'],
    defaultGA4EventName: 'form_submit',
    supportsValue: true,
  },
  [TrackingType.ADD_TO_CART]: {
    type: TrackingType.ADD_TO_CART,
    label: 'Add to Cart',
    description: 'Track when products are added to cart',
    category: 'ecommerce',
    icon: 'ShoppingCart',
    requiredFields: ['selector'],
    optionalFields: ['config.trackValue', 'config.trackProductDetails'],
    defaultGA4EventName: 'add_to_cart',
    supportsValue: true,
  },
  [TrackingType.PURCHASE]: {
    type: TrackingType.PURCHASE,
    label: 'Purchase Complete',
    description: 'Track completed purchases',
    category: 'ecommerce',
    icon: 'CreditCard',
    requiredFields: ['urlPattern'],
    optionalFields: ['config.trackValue', 'config.currency'],
    defaultGA4EventName: 'purchase',
    supportsValue: true,
    configSchema: EcommerceConfigDto,
  },
  [TrackingType.SCROLL_DEPTH]: {
    type: TrackingType.SCROLL_DEPTH,
    label: 'Scroll Depth',
    description: 'Track page scroll percentage',
    category: 'engagement',
    icon: 'ArrowDown',
    requiredFields: ['config.scrollPercentage'],
    optionalFields: ['urlPattern'],
    defaultGA4EventName: 'scroll',
    supportsValue: false,
    configSchema: ScrollDepthConfigDto,
  },
  [TrackingType.TIME_ON_PAGE]: {
    type: TrackingType.TIME_ON_PAGE,
    label: 'Time on Page',
    description: 'Track time spent on page',
    category: 'engagement',
    icon: 'Clock',
    requiredFields: ['config.timeSeconds'],
    optionalFields: ['urlPattern'],
    defaultGA4EventName: 'time_on_page',
    supportsValue: false,
    configSchema: TimeOnPageConfigDto,
  },
  [TrackingType.PHONE_CALL_CLICK]: {
    type: TrackingType.PHONE_CALL_CLICK,
    label: 'Phone Call Click',
    description: 'Track clicks on phone numbers',
    category: 'lead-gen',
    icon: 'Phone',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'phone_call_click',
    supportsValue: true,
  },
  [TrackingType.EMAIL_CLICK]: {
    type: TrackingType.EMAIL_CLICK,
    label: 'Email Click',
    description: 'Track clicks on email links',
    category: 'lead-gen',
    icon: 'Mail',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'email_click',
    supportsValue: true,
  },
  [TrackingType.DOWNLOAD]: {
    type: TrackingType.DOWNLOAD,
    label: 'File Download',
    description: 'Track file downloads',
    category: 'lead-gen',
    icon: 'Download',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'file_download',
    supportsValue: false,
  },
  [TrackingType.SITE_SEARCH]: {
    type: TrackingType.SITE_SEARCH,
    label: 'Site Search',
    description: 'Track site search queries',
    category: 'navigation',
    icon: 'Search',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'search',
    supportsValue: false,
  },
  [TrackingType.VIDEO_PLAY]: {
    type: TrackingType.VIDEO_PLAY,
    label: 'Video Play',
    description: 'Track video plays',
    category: 'engagement',
    icon: 'Play',
    requiredFields: ['selector'],
    optionalFields: ['config.milestones'],
    defaultGA4EventName: 'video_start',
    supportsValue: false,
    configSchema: VideoTrackingConfigDto,
  },
  [TrackingType.ADD_TO_WISHLIST]: {
    type: TrackingType.ADD_TO_WISHLIST,
    label: 'Add to Wishlist',
    description: 'Track wishlist additions',
    category: 'ecommerce',
    icon: 'Heart',
    requiredFields: ['selector'],
    optionalFields: ['config.trackProductDetails'],
    defaultGA4EventName: 'add_to_wishlist',
    supportsValue: false,
  },
  // Add remaining types with minimal config for brevity
  [TrackingType.ELEMENT_VISIBILITY]: {
    type: TrackingType.ELEMENT_VISIBILITY,
    label: 'Element Visibility',
    description: 'Track when element becomes visible',
    category: 'basic',
    icon: 'Eye',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'element_visible',
    supportsValue: false,
  },
  [TrackingType.FORM_START]: {
    type: TrackingType.FORM_START,
    label: 'Form Start',
    description: 'Track when user starts filling form',
    category: 'forms',
    icon: 'Edit',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'form_start',
    supportsValue: false,
  },
  [TrackingType.FORM_ABANDON]: {
    type: TrackingType.FORM_ABANDON,
    label: 'Form Abandonment',
    description: 'Track form abandonment',
    category: 'forms',
    icon: 'XCircle',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'form_abandon',
    supportsValue: false,
  },
  [TrackingType.REMOVE_FROM_CART]: {
    type: TrackingType.REMOVE_FROM_CART,
    label: 'Remove from Cart',
    description: 'Track cart removals',
    category: 'ecommerce',
    icon: 'Trash',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'remove_from_cart',
    supportsValue: false,
  },
  [TrackingType.VIEW_CART]: {
    type: TrackingType.VIEW_CART,
    label: 'View Cart',
    description: 'Track cart page views',
    category: 'ecommerce',
    icon: 'ShoppingBag',
    requiredFields: ['urlPattern'],
    optionalFields: [],
    defaultGA4EventName: 'view_cart',
    supportsValue: false,
  },
  [TrackingType.CHECKOUT_START]: {
    type: TrackingType.CHECKOUT_START,
    label: 'Checkout Started',
    description: 'Track checkout initiation',
    category: 'ecommerce',
    icon: 'ShoppingCart',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'begin_checkout',
    supportsValue: true,
  },
  [TrackingType.CHECKOUT_STEP]: {
    type: TrackingType.CHECKOUT_STEP,
    label: 'Checkout Step',
    description: 'Track checkout progress',
    category: 'ecommerce',
    icon: 'List',
    requiredFields: ['selector'],
    optionalFields: ['config.stepNumber', 'config.stepName'],
    defaultGA4EventName: 'checkout_progress',
    supportsValue: false,
  },
  [TrackingType.PRODUCT_VIEW]: {
    type: TrackingType.PRODUCT_VIEW,
    label: 'Product View',
    description: 'Track product page views',
    category: 'ecommerce',
    icon: 'Package',
    requiredFields: ['urlPattern'],
    optionalFields: ['config.trackProductDetails'],
    defaultGA4EventName: 'view_item',
    supportsValue: false,
  },
  [TrackingType.DEMO_REQUEST]: {
    type: TrackingType.DEMO_REQUEST,
    label: 'Demo Request',
    description: 'Track demo requests',
    category: 'lead-gen',
    icon: 'Video',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'request_demo',
    supportsValue: true,
  },
  [TrackingType.SIGNUP]: {
    type: TrackingType.SIGNUP,
    label: 'Sign Up',
    description: 'Track user registrations',
    category: 'lead-gen',
    icon: 'UserPlus',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'sign_up',
    supportsValue: true,
  },
  [TrackingType.VIDEO_COMPLETE]: {
    type: TrackingType.VIDEO_COMPLETE,
    label: 'Video Complete',
    description: 'Track video completions',
    category: 'engagement',
    icon: 'CheckCircle',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'video_complete',
    supportsValue: false,
  },
  [TrackingType.FILTER_USE]: {
    type: TrackingType.FILTER_USE,
    label: 'Filter Used',
    description: 'Track filter usage',
    category: 'navigation',
    icon: 'Filter',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'filter_use',
    supportsValue: false,
  },
  [TrackingType.TAB_SWITCH]: {
    type: TrackingType.TAB_SWITCH,
    label: 'Tab Switch',
    description: 'Track tab switching',
    category: 'navigation',
    icon: 'Layers',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'tab_switch',
    supportsValue: false,
  },
  [TrackingType.ACCORDION_EXPAND]: {
    type: TrackingType.ACCORDION_EXPAND,
    label: 'Accordion Expand',
    description: 'Track accordion expansions',
    category: 'navigation',
    icon: 'ChevronDown',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'accordion_expand',
    supportsValue: false,
  },
  [TrackingType.MODAL_OPEN]: {
    type: TrackingType.MODAL_OPEN,
    label: 'Modal Open',
    description: 'Track modal opens',
    category: 'navigation',
    icon: 'Maximize',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'modal_open',
    supportsValue: false,
  },
  [TrackingType.SOCIAL_SHARE]: {
    type: TrackingType.SOCIAL_SHARE,
    label: 'Social Share',
    description: 'Track social media shares',
    category: 'social',
    icon: 'Share2',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'share',
    supportsValue: false,
  },
  [TrackingType.SOCIAL_CLICK]: {
    type: TrackingType.SOCIAL_CLICK,
    label: 'Social Link Click',
    description: 'Track social media clicks',
    category: 'social',
    icon: 'Users',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'social_click',
    supportsValue: false,
  },
  [TrackingType.PDF_DOWNLOAD]: {
    type: TrackingType.PDF_DOWNLOAD,
    label: 'PDF Download',
    description: 'Track PDF downloads',
    category: 'content',
    icon: 'FileText',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'pdf_download',
    supportsValue: false,
  },
  [TrackingType.FILE_DOWNLOAD]: {
    type: TrackingType.FILE_DOWNLOAD,
    label: 'File Download',
    description: 'Track file downloads',
    category: 'content',
    icon: 'Download',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'file_download',
    supportsValue: false,
  },
  [TrackingType.NEWSLETTER_SIGNUP]: {
    type: TrackingType.NEWSLETTER_SIGNUP,
    label: 'Newsletter Signup',
    description: 'Track newsletter subscriptions',
    category: 'content',
    icon: 'Mail',
    requiredFields: ['selector'],
    optionalFields: [],
    defaultGA4EventName: 'newsletter_signup',
    supportsValue: false,
  },
  [TrackingType.CUSTOM_EVENT]: {
    type: TrackingType.CUSTOM_EVENT,
    label: 'Custom Event',
    description: 'Track custom events',
    category: 'custom',
    icon: 'Code',
    requiredFields: ['selector', 'ga4EventName'],
    optionalFields: ['ga4Parameters'],
    defaultGA4EventName: 'custom_event',
    supportsValue: true,
  },
};
