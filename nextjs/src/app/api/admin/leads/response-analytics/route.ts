import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

/**
 * GET /api/admin/leads/response-analytics
 * Get aggregated questionnaire response analytics - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Get all active questions with their responses
    const questions = await prisma.questionnaireQuestion.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        responses: {
          select: {
            answer: true,
          },
        },
      },
    });

    // Process each question's responses
    const questionAnalytics = questions.map((question) => {
      const responses = question.responses;
      const totalResponses = responses.length;

      let analytics: Record<string, unknown> = {
        questionId: question.id,
        question: question.question,
        type: question.type,
        category: question.category,
        totalResponses,
        options: question.options,
      };

      if (question.type === 'RADIO' || question.type === 'CHECKBOX') {
        // Count occurrences of each option
        const answerCounts: Record<string, number> = {};
        const options = (question.options as string[]) || [];

        // Initialize all options with 0
        options.forEach((opt) => {
          answerCounts[opt] = 0;
        });

        responses.forEach((response) => {
          const answer = response.answer;
          if (Array.isArray(answer)) {
            // CHECKBOX - multiple selections
            answer.forEach((a) => {
              if (typeof a === 'string') {
                answerCounts[a] = (answerCounts[a] || 0) + 1;
              }
            });
          } else if (typeof answer === 'string') {
            // RADIO - single selection
            answerCounts[answer] = (answerCounts[answer] || 0) + 1;
          }
        });

        analytics.answerBreakdown = Object.entries(answerCounts).map(([option, count]) => ({
          option,
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
        }));
      } else if (question.type === 'RATING') {
        // Calculate average rating
        let sum = 0;
        let validCount = 0;
        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        responses.forEach((response) => {
          const answer = response.answer;
          const rating = typeof answer === 'number' ? answer : parseInt(String(answer), 10);
          if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            sum += rating;
            validCount++;
            ratingCounts[rating]++;
          }
        });

        analytics.averageRating = validCount > 0 ? Math.round((sum / validCount) * 10) / 10 : 0;
        analytics.ratingDistribution = Object.entries(ratingCounts).map(([rating, count]) => ({
          rating: parseInt(rating, 10),
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
        }));
      } else if (question.type === 'TEXT' || question.type === 'TEXTAREA') {
        // For text responses, just show count and sample responses
        analytics.sampleResponses = responses.slice(0, 5).map((r) => r.answer);
      }

      return analytics;
    });

    // Calculate overall completion stats
    const totalLeads = await prisma.lead.count();
    const completedLeads = await prisma.lead.count({
      where: { questionnaireCompleted: true },
    });

    return NextResponse.json({
      overview: {
        totalLeads,
        completedLeads,
        completionRate: totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 100) : 0,
      },
      questions: questionAnalytics,
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

    console.error(`Failed to fetch response analytics: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch response analytics', message: errorMessage },
      { status: 500 }
    );
  }
}
