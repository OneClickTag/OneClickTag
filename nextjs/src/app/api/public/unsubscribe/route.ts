import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/public/unsubscribe?token=<leadId>
 * Redirect to unsubscribe page for confirmation
 * This endpoint no longer auto-unsubscribes - it requires user confirmation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing unsubscribe token' },
      { status: 400 }
    );
  }

  // Redirect to unsubscribe page for confirmation
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://oneclicktag.com';
  return NextResponse.redirect(`${baseUrl}/unsubscribe?token=${token}`);
}

/**
 * POST /api/public/unsubscribe
 * Unsubscribe a lead from emails with optional reason
 * Public endpoint, no auth required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, leadId, reason } = body;

    const id = token || leadId;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing unsubscribe token or leadId' },
        { status: 400 }
      );
    }

    // Find the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, email: true, unsubscribed: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe link' },
        { status: 404 }
      );
    }

    // Check if already unsubscribed
    if (lead.unsubscribed) {
      return NextResponse.json({
        success: true,
        message: 'You are already unsubscribed',
        alreadyUnsubscribed: true,
      });
    }

    // Update the lead to mark as unsubscribed with reason
    await prisma.lead.update({
      where: { id },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || null,
        marketingConsent: false,
        marketingConsentAt: new Date(),
      },
    });

    console.log(`Lead ${lead.email} unsubscribed from emails${reason ? ` (reason: ${reason})` : ''}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from emails',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to unsubscribe: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
