import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/public/unsubscribe/check?token=<leadId>
 * Check if a lead exists and if they're already unsubscribed
 * Public endpoint, no auth required
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing unsubscribe token' },
        { status: 400 }
      );
    }

    // Find the lead
    const lead = await prisma.lead.findUnique({
      where: { id: token },
      select: { id: true, email: true, unsubscribed: true },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe link' },
        { status: 404 }
      );
    }

    // Return the lead status (masked email for privacy)
    const maskedEmail = lead.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    return NextResponse.json({
      success: true,
      email: maskedEmail,
      alreadyUnsubscribed: lead.unsubscribed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to check unsubscribe status: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to check unsubscribe status' },
      { status: 500 }
    );
  }
}
