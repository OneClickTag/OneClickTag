// POST /api/customers/[id]/scans/[scanId]/recommendations/bulk-create-trackings
// Creates real trackings from selected recommendations and queues Google sync

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { addGTMSyncJob, addAdsSyncJob } from '@/lib/queue';
import { TrackingType, TrackingDestination, TrackingStatus } from '@prisma/client';

const BulkCreateSchema = z.object({
  recommendationIds: z.array(z.string()).min(1, 'At least one recommendation required'),
});

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

// Map recommendation trackingType to Prisma TrackingType enum
function mapTrackingType(recType: string): TrackingType | null {
  // TrackingType enum values match the recommendation trackingType (both use UPPER_SNAKE_CASE)
  if (Object.values(TrackingType).includes(recType as TrackingType)) {
    return recType as TrackingType;
  }
  return null;
}

// Map destination strings to TrackingDestination enum
function mapDestinations(destinations: string[] | null): TrackingDestination[] {
  if (!destinations || destinations.length === 0) return [TrackingDestination.GA4];
  const mapped: TrackingDestination[] = [];
  for (const d of destinations) {
    if (d === 'GA4') mapped.push(TrackingDestination.GA4);
    else if (d === 'GOOGLE_ADS') mapped.push(TrackingDestination.GOOGLE_ADS);
    else if (d === 'BOTH') mapped.push(TrackingDestination.BOTH);
  }
  return mapped.length > 0 ? mapped : [TrackingDestination.GA4];
}

// Default GA4 event names per tracking type
function getDefaultGA4EventName(type: TrackingType): string {
  const map: Record<string, string> = {
    BUTTON_CLICK: 'button_click',
    LINK_CLICK: 'link_click',
    PAGE_VIEW: 'page_view',
    FORM_SUBMIT: 'form_submit',
    FORM_START: 'form_start',
    FORM_ABANDON: 'form_abandon',
    ADD_TO_CART: 'add_to_cart',
    REMOVE_FROM_CART: 'remove_from_cart',
    ADD_TO_WISHLIST: 'add_to_wishlist',
    VIEW_CART: 'view_cart',
    CHECKOUT_START: 'begin_checkout',
    CHECKOUT_STEP: 'checkout_progress',
    PURCHASE: 'purchase',
    PRODUCT_VIEW: 'view_item',
    PHONE_CALL_CLICK: 'phone_call_click',
    EMAIL_CLICK: 'email_click',
    DOWNLOAD: 'file_download',
    DEMO_REQUEST: 'request_demo',
    SIGNUP: 'sign_up',
    SCROLL_DEPTH: 'scroll',
    TIME_ON_PAGE: 'time_on_page',
    VIDEO_PLAY: 'video_start',
    VIDEO_COMPLETE: 'video_complete',
    ELEMENT_VISIBILITY: 'element_visible',
    SITE_SEARCH: 'search',
    SOCIAL_SHARE: 'share',
    NEWSLETTER_SIGNUP: 'newsletter_signup',
    CUSTOM_EVENT: 'custom_event',
    RAGE_CLICK: 'rage_click',
    DEAD_CLICK: 'dead_click',
    EXIT_INTENT: 'exit_intent',
    OUTBOUND_CLICK: 'outbound_click',
    PAGE_ENGAGEMENT: 'engagement_score',
    ERROR_PAGE_VIEW: 'error_page_view',
    RETURN_VISITOR: 'return_visitor',
    CART_ABANDONMENT: 'cart_abandonment',
    CONTENT_READ_THROUGH: 'content_read_through',
    FILTER_USE: 'filter_use',
    TAB_SWITCH: 'tab_switch',
    ACCORDION_EXPAND: 'accordion_expand',
    MODAL_OPEN: 'modal_open',
    SOCIAL_CLICK: 'social_click',
    PDF_DOWNLOAD: 'pdf_download',
    FILE_DOWNLOAD: 'file_download',
    TAB_VISIBILITY: 'tab_visibility',
    SESSION_DURATION: 'session_duration',
    TEXT_COPY: 'text_copy',
    PAGE_PRINT: 'page_print',
    FORM_FIELD_INTERACTION: 'form_field_interaction',
    PRODUCT_IMAGE_INTERACTION: 'product_image_interaction',
    PRICE_COMPARISON: 'price_comparison',
    REVIEW_INTERACTION: 'review_interaction',
  };
  return map[type] || 'custom_event';
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);
    const { id: customerId, scanId } = await params;

    const body = await request.json();
    const parsed = BulkCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify customer belongs to tenant and has Google connected
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId: session.tenantId },
      select: { id: true, googleAccountId: true },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!customer.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer must have a connected Google account before creating trackings' },
        { status: 400 }
      );
    }

    // Verify scan belongs to customer
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId, tenantId: session.tenantId },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Fetch the selected recommendations
    const recommendations = await prisma.trackingRecommendation.findMany({
      where: {
        id: { in: parsed.data.recommendationIds },
        scanId,
        status: 'PENDING', // Only create from PENDING recommendations
      },
    });

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'No pending recommendations found for the given IDs' },
        { status: 400 }
      );
    }

    const created: string[] = [];
    const errors: string[] = [];

    // Process sequentially (each needs Ads sync before GTM sync)
    for (const rec of recommendations) {
      try {
        const trackingType = mapTrackingType(rec.trackingType);
        if (!trackingType) {
          errors.push(`${rec.name}: Unknown tracking type "${rec.trackingType}"`);
          continue;
        }

        const destinations = mapDestinations(rec.suggestedDestinations as string[] | null);
        const ga4EventName = rec.suggestedGA4EventName || getDefaultGA4EventName(trackingType);

        // Create the tracking record with CREATING status
        const tracking = await prisma.tracking.create({
          data: {
            name: rec.name,
            type: trackingType,
            description: rec.description,
            selector: rec.selector,
            urlPattern: rec.urlPattern,
            selectorConfig: rec.selectorConfig || undefined,
            config: rec.suggestedConfig || undefined,
            destinations,
            ga4EventName,
            status: TrackingStatus.CREATING,
            customerId,
            tenantId: session.tenantId,
            createdBy: session.id,
            updatedBy: session.id,
            isAutoCrawled: true,
            crawlMetadata: {
              scanId,
              recommendationId: rec.id,
              pageUrl: rec.pageUrl,
              severity: rec.severity,
            },
            selectorConfidence: rec.selectorConfidence,
          },
        });

        // Run Ads sync first (awaited) so adsConversionLabel is available for GTM
        if (destinations.includes(TrackingDestination.GOOGLE_ADS) || destinations.includes(TrackingDestination.BOTH)) {
          try {
            await addAdsSyncJob({
              trackingId: tracking.id,
              customerId,
              tenantId: session.tenantId,
              userId: session.id,
              action: 'create',
            });
          } catch (err: any) {
            console.error(`[BulkCreate] Ads sync failed for ${rec.name}:`, err.message);
          }
        }

        // Then GTM sync (non-blocking)
        addGTMSyncJob({
          trackingId: tracking.id,
          customerId,
          tenantId: session.tenantId,
          userId: session.id,
          action: 'create',
        }).catch((err: any) => {
          console.error(`[BulkCreate] GTM sync failed for ${rec.name}:`, err.message);
        });

        // Update recommendation to CREATED
        await prisma.trackingRecommendation.update({
          where: { id: rec.id },
          data: { status: 'CREATED', trackingId: tracking.id },
        });

        created.push(tracking.id);
      } catch (err: any) {
        const msg = `${rec.name}: ${err.message || 'Unknown error'}`;
        errors.push(msg);
        console.error(`[BulkCreate] Failed to create tracking from recommendation ${rec.id}:`, err);
      }
    }

    return NextResponse.json({
      created: created.length,
      failed: errors.length,
      trackingIds: created,
      errors,
      total: recommendations.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }
    console.error('Bulk create trackings failed:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
