import { Injectable, ConflictException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { SubmitQuestionnaireDto } from '../dto/submit-questionnaire.dto';
import { LeadQueryDto } from '../dto/lead-query.dto';
import { CreatePageViewDto } from '../dto/page-view.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new lead
   */
  async create(createLeadDto: CreateLeadDto) {
    try {
      // Check if email already exists
      const existing = await this.prisma.lead.findUnique({
        where: { email: createLeadDto.email },
      });

      if (existing) {
        throw new ConflictException('Email already registered');
      }

      const lead = await this.prisma.lead.create({
        data: createLeadDto,
      });

      this.logger.log(`New lead created: ${lead.email}`);
      return lead;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to create lead: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Submit questionnaire responses for a lead
   */
  async submitQuestionnaire(leadId: string, submitDto: SubmitQuestionnaireDto) {
    try {
      // Check if lead exists
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      if (lead.questionnaireCompleted) {
        throw new BadRequestException('Questionnaire already completed');
      }

      // Create responses in transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete existing responses (in case of resubmission)
        await tx.questionnaireResponse.deleteMany({
          where: { leadId },
        });

        // Create new responses
        await tx.questionnaireResponse.createMany({
          data: submitDto.responses.map(r => ({
            leadId,
            questionId: r.questionId,
            answer: r.answer,
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

      this.logger.log(`Questionnaire completed for lead: ${leadId}`);

      return this.findOne(leadId);
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to submit questionnaire: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Get lead by ID with responses
   */
  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
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
        pageViews: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  /**
   * Get all leads with pagination and filters
   */
  async findAll(query: LeadQueryDto) {
    const {
      search,
      questionnaireCompleted,
      startDate,
      endDate,
      source,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (questionnaireCompleted !== undefined) {
      where.questionnaireCompleted = questionnaireCompleted;
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
    const total = await this.prisma.lead.count({ where });

    // Get paginated data
    const skip = (page - 1) * limit;
    const leads = await this.prisma.lead.findMany({
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
    const leadsWithCount = leads.map(lead => ({
      ...lead,
      responseCount: lead.responses.length,
    }));

    return {
      data: leadsWithCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Track page view
   */
  async createPageView(createPageViewDto: CreatePageViewDto) {
    try {
      return await this.prisma.leadPageView.create({
        data: createPageViewDto,
      });
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to create page view: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Delete a lead (admin only)
   */
  async remove(id: string) {
    try {
      await this.prisma.lead.delete({
        where: { id },
      });
      this.logger.log(`Lead deleted: ${id}`);
      return { message: 'Lead deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Lead not found');
      }
      throw error;
    }
  }
}
