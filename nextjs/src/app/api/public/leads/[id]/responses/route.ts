import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Validation schema for questionnaire response
const questionnaireAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.any(), // Can be string, number, or array
});

const submitQuestionnaireSchema = z.object({
  responses: z.array(questionnaireAnswerSchema).min(1, 'At least one response is required'),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/public/leads/[id]/responses
 * Submit questionnaire responses for a lead - Public endpoint, no auth required
 */
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id: leadId } = await context.params;
    const body = await request.json();

    // Validate input
    const validationResult = submitQuestionnaireSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { responses } = validationResult.data;

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    if (lead.questionnaireCompleted) {
      return NextResponse.json(
        { error: 'Questionnaire already completed' },
        { status: 400 }
      );
    }

    // Create responses in transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing responses (in case of resubmission attempt)
      await tx.questionnaireResponse.deleteMany({
        where: { leadId },
      });

      // Create new responses
      await tx.questionnaireResponse.createMany({
        data: responses.map((r) => ({
          leadId,
          questionId: r.questionId,
          answer: r.answer as Prisma.InputJsonValue,
        })),
      });

      // Mark questionnaire as completed
      await tx.lead.update({
        where: { id: leadId },
        data: {
          questionnaireCompleted: true,
          completedAt: new Date(),
        },
      });
    });

    console.log(`Questionnaire completed for lead: ${leadId}`);

    // Return the updated lead with responses
    const updatedLead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        responses: {
          include: {
            question: true,
          },
          orderBy: {
            question: {
              order: 'asc',
            },
          },
        },
      },
    });

    return NextResponse.json(updatedLead, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to submit questionnaire: ${errorMessage}`);

    return NextResponse.json(
      { error: 'Failed to submit questionnaire', message: errorMessage },
      { status: 500 }
    );
  }
}
