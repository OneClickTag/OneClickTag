import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireTenant } from '@/lib/auth/session';
import { addGTMSyncJob, addAdsSyncJob } from '@/lib/queue';
import { TrackingType, TrackingDestination, TrackingStatus } from '@prisma/client';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const SelectorConfigSchema = z.object({
  selector: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  method: z.string().optional(),
});

const CreateTrackingSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(TrackingType),
  description: z.string().optional(),
  selector: z.string().optional(),
  urlPattern: z.string().optional(),
  selectorConfig: z.array(SelectorConfigSchema).optional(),
  config: z.record(z.any()).optional(),
  destinations: z.array(z.nativeEnum(TrackingDestination)).min(1, 'At least one destination is required'),
  ga4EventName: z.string().optional(),
  ga4Parameters: z.record(z.any()).optional(),
  adsConversionValue: z.number().min(0).optional(),
  ga4PropertyId: z.string().optional(),
  adsAccountId: z.string().optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
});

const ListTrackingsQuerySchema = z.object({
  customerId: z.string().optional(),
  status: z.nativeEnum(TrackingStatus).optional(),
  type: z.nativeEnum(TrackingType).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'status', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// ============================================================================
// GET /api/trackings - List all trackings with pagination and filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedQuery = ListTrackingsQuerySchema.safeParse(queryParams);
    if (!validatedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedQuery.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, status, type, page, limit, sortBy, sortOrder, search } = validatedQuery.data;
    const skip = (page - 1) * limit;

    // Build where clause with multi-tenant filtering
    const where: any = {
      tenantId: session.tenantId,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ga4EventName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute query with count
    const [trackings, total] = await Promise.all([
      prisma.tracking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              slug: true,
              fullName: true,
              company: true,
            },
          },
          conversionAction: {
            select: {
              id: true,
              name: true,
              googleConversionActionId: true,
            },
          },
        },
      }),
      prisma.tracking.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: trackings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing trackings:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to list trackings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/trackings - Create a new tracking
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireTenant(session);

    const body = await request.json();

    const validatedData = CreateTrackingSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      type,
      description,
      selector,
      urlPattern,
      selectorConfig,
      config,
      destinations,
      ga4EventName,
      ga4Parameters,
      adsConversionValue,
      ga4PropertyId,
      adsAccountId,
      customerId,
    } = validatedData.data;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: session.tenantId,
      },
      select: {
        id: true,
        googleAccountId: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' },
        { status: 404 }
      );
    }

    // Validate that customer has Google account connected if needed
    if (!customer.googleAccountId) {
      return NextResponse.json(
        { error: 'Customer must have a connected Google account before creating trackings' },
        { status: 400 }
      );
    }

    // Determine default GA4 event name based on type if not provided
    const effectiveGA4EventName = ga4EventName || getDefaultGA4EventName(type);

    // Create tracking record with PENDING status
    const tracking = await prisma.tracking.create({
      data: {
        name,
        type,
        description,
        selector,
        urlPattern,
        selectorConfig: selectorConfig ? JSON.parse(JSON.stringify(selectorConfig)) : undefined,
        config: config ? JSON.parse(JSON.stringify(config)) : undefined,
        destinations,
        ga4EventName: effectiveGA4EventName,
        ga4Parameters: ga4Parameters ? JSON.parse(JSON.stringify(ga4Parameters)) : undefined,
        adsConversionValue: adsConversionValue !== undefined ? adsConversionValue : null,
        ga4PropertyId,
        status: TrackingStatus.PENDING,
        customerId,
        tenantId: session.tenantId,
        createdBy: session.id,
        updatedBy: session.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            slug: true,
            fullName: true,
            company: true,
          },
        },
      },
    });

    // Add GTM sync job to queue
    const gtmJob = await addGTMSyncJob({
      trackingId: tracking.id,
      customerId,
      tenantId: session.tenantId,
      userId: session.id,
      action: 'create',
    });

    // If destinations include GOOGLE_ADS, add Ads sync job
    let adsJob = null;
    if (destinations.includes(TrackingDestination.GOOGLE_ADS) || destinations.includes(TrackingDestination.BOTH)) {
      adsJob = await addAdsSyncJob({
        trackingId: tracking.id,
        customerId,
        tenantId: session.tenantId,
        userId: session.id,
        action: 'create',
      });
    }

    // Update tracking status to CREATING
    await prisma.tracking.update({
      where: { id: tracking.id },
      data: { status: TrackingStatus.CREATING },
    });

    return NextResponse.json(
      {
        data: tracking,
        jobs: {
          gtmSyncJobId: gtmJob.id,
          adsSyncJobId: adsJob?.id || null,
        },
        message: 'Tracking created and sync jobs queued',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tracking:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'No tenant associated with user') {
      return NextResponse.json({ error: 'No tenant associated with user' }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create tracking' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultGA4EventName(type: TrackingType): string {
  const eventNameMap: Record<TrackingType, string> = {
    BUTTON_CLICK: 'button_click',
    LINK_CLICK: 'link_click',
    PAGE_VIEW: 'page_view',
    ELEMENT_VISIBILITY: 'element_visible',
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
    SITE_SEARCH: 'search',
    FILTER_USE: 'filter_use',
    TAB_SWITCH: 'tab_switch',
    ACCORDION_EXPAND: 'accordion_expand',
    MODAL_OPEN: 'modal_open',
    SOCIAL_SHARE: 'share',
    SOCIAL_CLICK: 'social_click',
    PDF_DOWNLOAD: 'pdf_download',
    FILE_DOWNLOAD: 'file_download',
    NEWSLETTER_SIGNUP: 'newsletter_signup',
    CUSTOM_EVENT: 'custom_event',
  };

  return eventNameMap[type] || 'custom_event';
}
