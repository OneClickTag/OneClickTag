import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';
import { QuestionType, Prisma } from '@prisma/client';

// Validation schema for updating a question
const updateQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question must be 500 characters or less').optional(),
  type: z.nativeEnum(QuestionType).optional(),
  options: z.array(z.string()).optional().nullable(),
  placeholder: z.string().max(200, 'Placeholder must be 200 characters or less').optional().nullable(),
  order: z.number().int().optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  category: z.string().max(50, 'Category must be 50 characters or less').optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/questionnaire/[id]
 * Get question by ID with response count - Admin only
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;

    const question = await prisma.questionnaireQuestion.findUnique({
      where: { id },
      include: {
        responses: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...question,
      responseCount: question.responses.length,
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

    console.error(`Failed to fetch question: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch question', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/questionnaire/[id]
 * Update a question - Admin only
 */
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const validationResult = updateQuestionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Transform data for Prisma - handle JSON null values
    const data: Prisma.QuestionnaireQuestionUpdateInput = {
      ...validatedData,
      // Handle options - convert null to Prisma.JsonNull for JSON fields
      options: validatedData.options === null
        ? Prisma.JsonNull
        : validatedData.options,
    };

    // Check if question exists
    const existingQuestion = await prisma.questionnaireQuestion.findUnique({
      where: { id },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Update the question
    const question = await prisma.questionnaireQuestion.update({
      where: { id },
      data,
    });

    console.log(`Question updated: ${id}`);

    return NextResponse.json(question);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to update question: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to update question', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/questionnaire/[id]
 * Delete a question - Admin only
 */
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;

    // Check if question exists
    const existingQuestion = await prisma.questionnaireQuestion.findUnique({
      where: { id },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    await prisma.questionnaireQuestion.delete({
      where: { id },
    });

    console.log(`Question deleted: ${id}`);

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to delete question: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to delete question', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/questionnaire/[id]
 * Toggle question active status - Admin only
 */
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;

    // Get current question
    const existingQuestion = await prisma.questionnaireQuestion.findUnique({
      where: { id },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Toggle active status
    const question = await prisma.questionnaireQuestion.update({
      where: { id },
      data: { isActive: !existingQuestion.isActive },
    });

    console.log(`Question active status toggled: ${id}`);

    return NextResponse.json(question);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to toggle question status: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to toggle question status', message: errorMessage },
      { status: 500 }
    );
  }
}
