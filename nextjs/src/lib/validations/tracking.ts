import { z } from 'zod';

const trackingTypeEnum = z.enum([
  'BUTTON_CLICK',
  'LINK_CLICK',
  'PAGE_VIEW',
  'ELEMENT_VISIBILITY',
  'FORM_SUBMIT',
  'FORM_START',
  'FORM_ABANDON',
  'ADD_TO_CART',
  'REMOVE_FROM_CART',
  'ADD_TO_WISHLIST',
  'VIEW_CART',
  'CHECKOUT_START',
  'CHECKOUT_STEP',
  'PURCHASE',
  'PRODUCT_VIEW',
  'PHONE_CALL_CLICK',
  'EMAIL_CLICK',
  'DOWNLOAD',
  'DEMO_REQUEST',
  'SIGNUP',
  'SCROLL_DEPTH',
  'TIME_ON_PAGE',
  'VIDEO_PLAY',
  'VIDEO_COMPLETE',
  'SITE_SEARCH',
  'FILTER_USE',
  'TAB_SWITCH',
  'ACCORDION_EXPAND',
  'MODAL_OPEN',
  'SOCIAL_SHARE',
  'SOCIAL_CLICK',
  'PDF_DOWNLOAD',
  'FILE_DOWNLOAD',
  'NEWSLETTER_SIGNUP',
  'CUSTOM_EVENT',
]);

const trackingDestinationEnum = z.enum(['GA4', 'GOOGLE_ADS', 'BOTH']);

export const createTrackingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: trackingTypeEnum,
  description: z.string().max(1000).optional(),
  selector: z.string().max(500).optional(),
  urlPattern: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
  destinations: z.array(trackingDestinationEnum).optional().default(['GA4']),
  ga4EventName: z.string().max(100).optional(),
  ga4Parameters: z.record(z.unknown()).optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
});

export const updateTrackingSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  selector: z.string().max(500).nullable().optional(),
  urlPattern: z.string().max(500).nullable().optional(),
  config: z.record(z.unknown()).nullable().optional(),
  destinations: z.array(trackingDestinationEnum).optional(),
  ga4EventName: z.string().max(100).nullable().optional(),
  ga4Parameters: z.record(z.unknown()).nullable().optional(),
  status: z.enum(['PENDING', 'CREATING', 'ACTIVE', 'FAILED', 'PAUSED', 'SYNCING']).optional(),
});

export type CreateTrackingInput = z.infer<typeof createTrackingSchema>;
export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>;
