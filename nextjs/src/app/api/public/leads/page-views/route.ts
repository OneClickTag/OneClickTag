import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for page view
const createPageViewSchema = z.object({
  leadId: z.string().optional(),
  sessionId: z.string().min(1, 'Session ID is required'),
  path: z.string().min(1, 'Path is required'),
  referrer: z.string().optional(),
});

/**
 * POST /api/public/leads/page-views
 * Track page view - Public endpoint, no auth required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = createPageViewSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create the page view
    const pageView = await prisma.leadPageView.create({
      data: {
        leadId: data.leadId,
        sessionId: data.sessionId,
        path: data.path,
        referrer: data.referrer,
      },
    });

    return NextResponse.json(pageView, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to create page view: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to create page view', message: errorMessage },
      { status: 500 }
    );
  }
}
