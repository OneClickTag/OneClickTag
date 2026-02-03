import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class LeadAnalyticsService {
  private readonly logger = new Logger(LeadAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get general lead statistics
   */
  async getStats() {
    try {
      const [
        totalLeads,
        completedQuestionnaires,
        todayLeads,
        sourceBreakdown,
      ] = await Promise.all([
        // Total leads
        this.prisma.lead.count(),

        // Completed questionnaires
        this.prisma.lead.count({
          where: { questionnaireCompleted: true },
        }),

        // Today's leads
        this.prisma.lead.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // Breakdown by source
        this.prisma.lead.groupBy({
          by: ['source'],
          _count: true,
        }),
      ]);

      const completionRate = totalLeads > 0
        ? ((completedQuestionnaires / totalLeads) * 100).toFixed(2)
        : '0';

      return {
        totalLeads,
        completedQuestionnaires,
        pendingQuestionnaires: totalLeads - completedQuestionnaires,
        todayLeads,
        completionRate: parseFloat(completionRate),
        sourceBreakdown: sourceBreakdown.map(s => ({
          source: s.source || 'unknown',
          count: s._count,
        })),
      };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get stats: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Get daily lead counts for the last N days
   */
  async getDailyLeadCounts(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const leads = await this.prisma.lead.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
        },
      });

      // Group by date
      const dailyCounts = leads.reduce((acc, lead) => {
        const date = lead.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fill in missing dates with 0
      const result = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.unshift({
          date: dateStr,
          count: dailyCounts[dateStr] || 0,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get daily counts: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Get question response distribution
   */
  async getQuestionResponses(questionId: string) {
    try {
      const responses = await this.prisma.questionnaireResponse.findMany({
        where: { questionId },
        select: {
          answer: true,
        },
      });

      // Count answer frequency
      const distribution = responses.reduce((acc, r) => {
        const answer = typeof r.answer === 'object'
          ? JSON.stringify(r.answer)
          : String(r.answer);
        acc[answer] = (acc[answer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(distribution).map(([answer, count]) => ({
        answer,
        count,
      }));
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get question responses: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Get page view analytics
   */
  async getPageViewStats(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const [totalViews, uniqueSessions, topPages] = await Promise.all([
        // Total page views
        this.prisma.leadPageView.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),

        // Unique sessions
        this.prisma.leadPageView.findMany({
          where: {
            createdAt: { gte: startDate },
          },
          distinct: ['sessionId'],
          select: {
            sessionId: true,
          },
        }),

        // Top pages
        this.prisma.leadPageView.groupBy({
          by: ['path'],
          where: {
            createdAt: { gte: startDate },
          },
          _count: true,
          orderBy: {
            _count: {
              path: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      return {
        totalViews,
        uniqueSessions: uniqueSessions.length,
        topPages: topPages.map(p => ({
          path: p.path,
          views: p._count,
        })),
      };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get page view stats: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Export leads to CSV format
   */
  async exportLeads() {
    try {
      const leads = await this.prisma.lead.findMany({
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

      return leads.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        purpose: lead.purpose,
        source: lead.source || 'unknown',
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        questionnaireCompleted: lead.questionnaireCompleted,
        completedAt: lead.completedAt?.toISOString(),
        createdAt: lead.createdAt.toISOString(),
        responseCount: lead.responses.length,
      }));
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to export leads: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Get response statistics for all questions
   */
  async getAllQuestionResponseStats() {
    try {
      const questions = await this.prisma.questionnaireQuestion.findMany({
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

      return questions.map(question => {
        const responses = question.responses;
        const totalResponses = responses.length;

        // Calculate distribution for choice-based questions
        let distribution: { answer: string; count: number; percentage: number }[] = [];

        if (['RADIO', 'CHECKBOX', 'RATING', 'SCALE'].includes(question.type)) {
          const counts = responses.reduce((acc, r) => {
            // Handle arrays (checkbox) and single values
            const answers = Array.isArray(r.answer) ? r.answer : [r.answer];
            answers.forEach(answer => {
              const key = String(answer);
              acc[key] = (acc[key] || 0) + 1;
            });
            return acc;
          }, {} as Record<string, number>);

          distribution = Object.entries(counts)
            .map(([answer, count]) => ({
              answer,
              count,
              percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count);
        } else {
          // For text questions, show recent samples
          distribution = responses
            .slice(0, 10)
            .map(r => ({
              answer: String(r.answer).substring(0, 100),
              count: 1,
              percentage: 0,
            }));
        }

        // Calculate average for RATING and SCALE
        let average: number | null = null;
        if (['RATING', 'SCALE'].includes(question.type) && totalResponses > 0) {
          const sum = responses.reduce((acc, r) => {
            const num = parseFloat(String(r.answer));
            return acc + (isNaN(num) ? 0 : num);
          }, 0);
          average = Math.round((sum / totalResponses) * 10) / 10;
        }

        return {
          id: question.id,
          question: question.question,
          type: question.type,
          category: question.category,
          totalResponses,
          distribution,
          average,
        };
      });
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to get all question stats: ${errorMessage}`, error?.stack);
      throw error;
    }
  }
}
