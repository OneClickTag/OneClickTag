import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTemplatedEmail, getEmailLogoUrl, getUnsubscribeUrl, LINKEDIN_URL, getEmailAssetsBaseUrl } from '@/lib/email/email.service';
import { EmailTemplateType } from '@prisma/client';

// Helper to verify admin access (simplified - in production, add proper auth)
async function isAdmin(request: NextRequest): Promise<boolean> {
  // Check for authorization header or session
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  // In a real implementation, validate the token/session
  return true;
}

/**
 * GET /api/admin/email-templates/bulk-send
 * Get count of marketing subscribers who can receive emails
 */
export async function GET(request: NextRequest) {
  try {
    // Get count of leads who can receive marketing emails
    const subscribersCount = await prisma.lead.count({
      where: {
        unsubscribed: false,
        marketingConsent: true,
      },
    });

    // Get count of all leads
    const totalLeads = await prisma.lead.count();

    // Get count of unsubscribed leads with reasons
    const unsubscribeReasons = await prisma.lead.groupBy({
      by: ['unsubscribeReason'],
      where: {
        unsubscribed: true,
        unsubscribeReason: { not: null },
      },
      _count: true,
    });

    return NextResponse.json({
      subscribersCount,
      totalLeads,
      unsubscribedCount: totalLeads - subscribersCount,
      unsubscribeReasons: unsubscribeReasons.map(r => ({
        reason: r.unsubscribeReason,
        count: r._count,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to get subscriber stats: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to get subscriber statistics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-templates/bulk-send
 * Send bulk email to marketing subscribers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, subject, testEmail } = body;

    if (!templateType) {
      return NextResponse.json(
        { error: 'Template type is required' },
        { status: 400 }
      );
    }

    // If testEmail is provided, send only to that email
    if (testEmail) {
      const lead = await prisma.lead.findUnique({
        where: { email: testEmail },
      });

      if (!lead) {
        return NextResponse.json(
          { error: 'Test email not found in leads' },
          { status: 404 }
        );
      }

      const siteUrl = getEmailAssetsBaseUrl();
      const result = await sendTemplatedEmail(templateType as EmailTemplateType, {
        to: lead.email,
        toName: lead.name,
        subject,
        leadId: lead.id,
        variables: {
          name: lead.name,
          email: lead.email,
          logoUrl: getEmailLogoUrl(),
          siteUrl: siteUrl,
          linkedinUrl: LINKEDIN_URL,
          unsubscribeUrl: getUnsubscribeUrl(lead.id),
          questionnaireUrl: `${siteUrl}/thank-you?id=${lead.id}`,
          contactUrl: `${siteUrl}/contact`,
        },
      });

      return NextResponse.json({
        success: result.success,
        sent: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        error: result.error,
        testMode: true,
      });
    }

    // Get all marketing subscribers
    const subscribers = await prisma.lead.findMany({
      where: {
        unsubscribed: false,
        marketingConsent: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers to send emails to' },
        { status: 400 }
      );
    }

    // Send emails in batches to avoid overwhelming the server
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    const siteUrl = getEmailAssetsBaseUrl();

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (lead) => {
          const result = await sendTemplatedEmail(templateType as EmailTemplateType, {
            to: lead.email,
            toName: lead.name,
            subject,
            leadId: lead.id,
            variables: {
              name: lead.name,
              email: lead.email,
              logoUrl: getEmailLogoUrl(),
              siteUrl: siteUrl,
              linkedinUrl: LINKEDIN_URL,
              unsubscribeUrl: getUnsubscribeUrl(lead.id),
              questionnaireUrl: `${siteUrl}/thank-you?id=${lead.id}`,
              contactUrl: `${siteUrl}/contact`,
            },
          });

          if (!result.success) {
            throw new Error(`Failed to send to ${lead.email}: ${result.error}`);
          }

          return result;
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          sent++;
        } else {
          failed++;
          errors.push(result.reason.message);
        }
      });

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`Bulk email sent: ${sent} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscribers.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors to first 10
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send bulk email: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to send bulk email' },
      { status: 500 }
    );
  }
}
