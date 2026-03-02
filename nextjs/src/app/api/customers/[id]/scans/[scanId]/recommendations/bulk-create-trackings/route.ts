// POST /api/customers/[id]/scans/[scanId]/recommendations/bulk-create-trackings
// Creates real trackings from selected recommendations and queues them for async processing

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { TrackingType, TrackingDestination, TrackingStatus } from '@prisma/client';

const BulkCreateSchema = z.object({
  recommendationIds: z.array(z.string()).min(1, 'At least one recommendation required'),
  destination: z.enum(['GA4', 'GOOGLE_ADS', 'BOTH']).optional().default('BOTH'),
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
      where: { id: customerId, tenantId: session.tenantId, userId: session.id },
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
      where: { id: scanId, customerId, tenantId: session.tenantId, customer: { userId: session.id } },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Fetch the selected recommendations (PENDING, REPAIR, FAILED, or CREATED — all re-triggerable)
    const recommendations = await prisma.trackingRecommendation.findMany({
      where: {
        id: { in: parsed.data.recommendationIds },
        scanId,
        status: { in: ['PENDING', 'REPAIR', 'FAILED', 'CREATED'] },
      },
    });

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'No actionable recommendations found for the given IDs' },
        { status: 400 }
      );
    }

    // Validate all recommendations upfront and prepare tracking data
    const validRecs: Array<{
      rec: typeof recommendations[0];
      trackingType: TrackingType;
      destinations: TrackingDestination[];
      ga4EventName: string;
    }> = [];
    const skipped: string[] = [];

    // Map user-chosen destination to TrackingDestination array
    const chosenDestination = parsed.data.destination;
    const destinations: TrackingDestination[] =
      chosenDestination === 'BOTH'
        ? [TrackingDestination.GA4, TrackingDestination.GOOGLE_ADS]
        : chosenDestination === 'GA4'
        ? [TrackingDestination.GA4]
        : [TrackingDestination.GOOGLE_ADS];

    for (const rec of recommendations) {
      const trackingType = mapTrackingType(rec.trackingType);
      if (!trackingType) {
        skipped.push(`${rec.name}: Unknown tracking type "${rec.trackingType}"`);
        continue;
      }
      const ga4EventName = rec.suggestedGA4EventName || getDefaultGA4EventName(trackingType);
      validRecs.push({ rec, trackingType, destinations, ga4EventName });
    }

    if (validRecs.length === 0) {
      return NextResponse.json(
        { error: 'No valid recommendations to create', skipped },
        { status: 400 }
      );
    }

    // Create everything in a single transaction using bulk operations (not a loop)
    // This avoids transaction timeout issues with many recommendations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the batch
      const batch = await tx.trackingBatch.create({
        data: {
          scanId,
          customerId,
          tenantId: session.tenantId,
          userId: session.id,
          totalJobs: validRecs.length,
        },
      });

      // 2. Bulk-create all trackings at once and get their IDs back
      const trackings = await tx.tracking.createManyAndReturn({
        data: validRecs.map(({ rec, trackingType, destinations, ga4EventName }) => ({
          name: rec.name,
          type: trackingType,
          description: rec.description,
          selector: rec.selector,
          urlPattern: rec.urlPattern,
          selectorConfig: rec.selectorConfig || undefined,
          config: rec.suggestedConfig || undefined,
          destinations,
          ga4EventName,
          status: TrackingStatus.PENDING,
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
        })),
        select: { id: true },
      });

      // 3. Bulk-create all queue jobs at once
      await tx.trackingQueueJob.createMany({
        data: trackings.map((tracking, i) => ({
          batchId: batch.id,
          trackingId: tracking.id,
          recommendationId: validRecs[i].rec.id,
        })),
      });

      // 4. Bulk-update all recommendations to CREATING with their tracking IDs
      // Single raw SQL UPDATE with CASE — avoids N sequential queries that cause transaction timeout
      // Status is CREATING (not CREATED) — it becomes CREATED only after Google sync succeeds
      if (trackings.length > 0) {
        const caseClause = trackings
          .map((tracking, i) => `WHEN id = '${validRecs[i].rec.id}' THEN '${tracking.id}'`)
          .join(' ');
        const recIds = trackings.map((_, i) => `'${validRecs[i].rec.id}'`).join(',');

        await tx.$executeRaw(Prisma.sql`
          UPDATE tracking_recommendations
          SET status = 'CREATING',
              "trackingId" = CASE ${Prisma.raw(caseClause)} END,
              "updatedAt" = NOW()
          WHERE id IN (${Prisma.raw(recIds)})
        `);
      }

      return { batchId: batch.id, trackingIds: trackings.map(t => t.id) };
    });

    // Jobs are now processed by the cron (runs every minute).
    // No fire-and-forget — Vercel kills the function after response is sent.

    return NextResponse.json({
      batchId: result.batchId,
      queued: validRecs.length,
      trackingIds: result.trackingIds,
      total: recommendations.length,
      skipped,
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

