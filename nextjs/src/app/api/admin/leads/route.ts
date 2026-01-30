import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/leads
 * List all leads with pagination and filters - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const questionnaireCompleted = searchParams.get('questionnaireCompleted');
    const marketingConsent = searchParams.get('marketingConsent');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const source = searchParams.get('source') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause
    const where: Prisma.LeadWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (questionnaireCompleted !== null && questionnaireCompleted !== undefined) {
      where.questionnaireCompleted = questionnaireCompleted === 'true';
    }

    if (marketingConsent !== null && marketingConsent !== undefined) {
      where.marketingConsent = marketingConsent === 'true';
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (source) {
      where.source = source;
    }

    // Get total count
    const total = await prisma.lead.count({ where });

    // Get paginated data
    const skip = (page - 1) * limit;
    const leads = await prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        responses: {
          select: {
            id: true,
          },
        },
      },
    });

    // Add response count to each lead
    const leadsWithCount = leads.map((lead: typeof leads[number]) => ({
      ...lead,
      responseCount: lead.responses.length,
    }));

    return NextResponse.json({
      data: leadsWithCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

    console.error(`Failed to fetch leads: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch leads', message: errorMessage },
      { status: 500 }
    );
  }
}
