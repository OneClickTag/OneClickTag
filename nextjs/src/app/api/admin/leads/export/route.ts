import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

/**
 * GET /api/admin/leads/export
 * Export leads data - Admin only
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

    // Format leads for export
    const exportData = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      purpose: lead.purpose,
      source: lead.source || 'unknown',
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      questionnaireCompleted: lead.questionnaireCompleted,
      completedAt: lead.completedAt?.toISOString() || null,
      createdAt: lead.createdAt.toISOString(),
      responseCount: lead.responses.length,
    }));

    return NextResponse.json(exportData);
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
