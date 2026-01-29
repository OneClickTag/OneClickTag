import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema for reordering questions
const reorderSchema = z.object({
  questionOrders: z.array(
    z.object({
      id: z.string().min(1, 'Question ID is required'),
      order: z.number().int('Order must be an integer'),
    })
  ).min(1, 'At least one question order is required'),
});

/**
 * PUT /api/admin/questionnaire/reorder
 * Reorder questionnaire questions - Admin only
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();

    // Validate input
    const validationResult = reorderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { questionOrders } = validationResult.data;

    // Update all question orders in a transaction
    await prisma.$transaction(
      questionOrders.map(({ id, order }: { id: string; order: number }) =>
        prisma.questionnaireQuestion.update({
          where: { id },
          data: { order },
        })
      )
    );

    console.log(`Questions reordered: ${questionOrders.length} items`);

    return NextResponse.json({ message: 'Questions reordered successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to reorder questions: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to reorder questions', message: errorMessage },
      { status: 500 }
    );
  }
}
