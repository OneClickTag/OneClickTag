import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/public/questionnaire
 * Get active questionnaire questions - Public endpoint, no auth required
 */
export async function GET() {
  try {
    const questions = await prisma.questionnaireQuestion.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        question: true,
        type: true,
        options: true,
        placeholder: true,
        order: true,
        isRequired: true,
        category: true,
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch questions: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to fetch questions', message: errorMessage },
      { status: 500 }
    );
  }
}
