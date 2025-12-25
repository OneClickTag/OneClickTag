import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';

@Injectable()
export class QuestionnaireService {
  private readonly logger = new Logger(QuestionnaireService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new question
   */
  async create(createQuestionDto: CreateQuestionDto, createdBy?: string) {
    try {
      const question = await this.prisma.questionnaireQuestion.create({
        data: {
          ...createQuestionDto,
          createdBy,
        },
      });

      this.logger.log(`New question created: ${question.id}`);
      return question;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to create question: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Get all questions (with optional filter for active only)
   */
  async findAll(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};

    return await this.prisma.questionnaireQuestion.findMany({
      where,
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Get active questions for public use
   */
  async getActiveQuestions() {
    return this.findAll(true);
  }

  /**
   * Get question by ID
   */
  async findOne(id: string) {
    const question = await this.prisma.questionnaireQuestion.findUnique({
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
      throw new NotFoundException('Question not found');
    }

    return {
      ...question,
      responseCount: question.responses.length,
    };
  }

  /**
   * Update a question
   */
  async update(id: string, updateQuestionDto: UpdateQuestionDto) {
    try {
      const question = await this.prisma.questionnaireQuestion.update({
        where: { id },
        data: updateQuestionDto,
      });

      this.logger.log(`Question updated: ${id}`);
      return question;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Question not found');
      }
      throw error;
    }
  }

  /**
   * Delete a question
   */
  async remove(id: string) {
    try {
      await this.prisma.questionnaireQuestion.delete({
        where: { id },
      });

      this.logger.log(`Question deleted: ${id}`);
      return { message: 'Question deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Question not found');
      }
      throw error;
    }
  }

  /**
   * Reorder questions
   */
  async reorder(questionOrders: { id: string; order: number }[]) {
    try {
      await this.prisma.$transaction(
        questionOrders.map(({ id, order }) =>
          this.prisma.questionnaireQuestion.update({
            where: { id },
            data: { order },
          })
        )
      );

      this.logger.log(`Questions reordered: ${questionOrders.length} items`);
      return { message: 'Questions reordered successfully' };
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      this.logger.error(`Failed to reorder questions: ${errorMessage}`, error?.stack);
      throw error;
    }
  }

  /**
   * Toggle question active status
   */
  async toggleActive(id: string) {
    try {
      const question = await this.prisma.questionnaireQuestion.findUnique({
        where: { id },
      });

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const updated = await this.prisma.questionnaireQuestion.update({
        where: { id },
        data: { isActive: !question.isActive },
      });

      this.logger.log(`Question active status toggled: ${id}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }
}
