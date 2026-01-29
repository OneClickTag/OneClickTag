import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/questionnaire/[id]/responses
 * Get response distribution for a question - Admin only
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id: questionId } = await context.params;

    // Check if question exists
    const question = await prisma.questionnaireQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const responses = await prisma.questionnaireResponse.findMany({
      where: { questionId },
      select: {
        answer: true,
      },
    });

    // Count answer frequency
    const distribution = responses.reduce((acc: Record<string, number>, r) => {
      const answer = typeof r.answer === 'object'
        ? JSON.stringify(r.answer)
        : String(r.answer);
      acc[answer] = (acc[answer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(distribution).map(([answer, count]) => ({
      answer,
      count,
    }));

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch question responses: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch question responses', message: errorMessage },
      { status: 500 }
    );
  }
}
