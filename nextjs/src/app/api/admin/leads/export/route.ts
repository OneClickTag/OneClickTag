import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * GET /api/admin/leads/export
 * Export leads data as CSV - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const leads = await prisma.lead.findMany({
      include: {
        responses: {
          include: {
            question: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // CSV headers
    const headers = [
      'ID',
      'Name',
      'Email',
      'Purpose',
      'Source',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'Questionnaire Completed',
      'Completed At',
      'Created At',
      'Response Count',
      'Marketing Consent',
      'Marketing Consent At',
    ];

    // CSV rows
    const rows = leads.map((lead) => [
      escapeCSV(lead.id),
      escapeCSV(lead.name),
      escapeCSV(lead.email),
      escapeCSV(lead.purpose),
      escapeCSV(lead.source || 'unknown'),
      escapeCSV(lead.utmSource),
      escapeCSV(lead.utmMedium),
      escapeCSV(lead.utmCampaign),
      escapeCSV(lead.questionnaireCompleted),
      escapeCSV(lead.completedAt?.toISOString() || ''),
      escapeCSV(lead.createdAt.toISOString()),
      escapeCSV(lead.responses.length),
      escapeCSV(lead.marketingConsent),
      escapeCSV(lead.marketingConsentAt?.toISOString() || ''),
    ].join(','));

    // Build CSV content
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Return CSV response with proper headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to export leads: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to export leads', message: errorMessage },
      { status: 500 }
    );
  }
}
