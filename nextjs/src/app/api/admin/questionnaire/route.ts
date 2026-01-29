import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';
import { QuestionType, Prisma } from '@prisma/client';

// Validation schema for creating a question
const createQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question must be 500 characters or less'),
  type: z.nativeEnum(QuestionType),
  options: z.array(z.string()).optional(),
  placeholder: z.string().max(200, 'Placeholder must be 200 characters or less').optional(),
  order: z.number().int().optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  category: z.string().max(50, 'Category must be 50 characters or less').optional(),
});

/**
 * GET /api/admin/questionnaire
 * List all questionnaire questions - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const questions = await prisma.questionnaireQuestion.findMany({
      where,
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch questions: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch questions', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/questionnaire
 * Create a new questionnaire question - Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();

    // Validate input
    const validationResult = createQuestionSchema.safeParse(body);
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

    // Create the question
    const question = await prisma.questionnaireQuestion.create({
      data: {
        question: data.question,
        type: data.type,
        options: data.options ? data.options : Prisma.JsonNull,
        placeholder: data.placeholder,
        order: data.order ?? 0,
        isRequired: data.isRequired ?? true,
        isActive: data.isActive ?? true,
        category: data.category,
        createdBy: session.id,
      },
    });

    console.log(`New question created: ${question.id}`);

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to create question: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to create question', message: errorMessage },
      { status: 500 }
    );
  }
}
