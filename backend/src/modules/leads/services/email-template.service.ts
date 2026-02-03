import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailTemplateType } from '@prisma/client';

export interface CreateEmailTemplateDto {
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  availableVariables?: string[];
  isActive?: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  availableVariables?: string[];
  isActive?: boolean;
}

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all email templates
   */
  async findAll(activeOnly = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: { type: 'asc' },
    });
  }

  /**
   * Get template by type
   */
  async findByType(type: EmailTemplateType) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { type },
    });

    if (!template) {
      throw new NotFoundException(`Template ${type} not found`);
    }

    return template;
  }

  /**
   * Get template by ID
   */
  async findById(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Create or update email template
   */
  async upsert(dto: CreateEmailTemplateDto, userId?: string) {
    const data = {
      name: dto.name,
      subject: dto.subject,
      htmlContent: dto.htmlContent,
      textContent: dto.textContent,
      availableVariables: dto.availableVariables,
      isActive: dto.isActive ?? true,
      updatedBy: userId,
    };

    return this.prisma.emailTemplate.upsert({
      where: { type: dto.type },
      create: {
        type: dto.type,
        ...data,
        createdBy: userId,
      },
      update: data,
    });
  }

  /**
   * Update template by ID
   */
  async update(id: string, dto: UpdateEmailTemplateDto, userId?: string) {
    try {
      return await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          ...dto,
          updatedBy: userId,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Template not found');
      }
      throw error;
    }
  }

  /**
   * Toggle template active status
   */
  async toggleActive(id: string) {
    const template = await this.findById(id);
    return this.prisma.emailTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
  }

  /**
   * Get email logs with pagination
   */
  async getEmailLogs(query: {
    page?: number;
    limit?: number;
    status?: string;
    templateType?: EmailTemplateType;
    leadId?: string;
  }) {
    const { page = 1, limit = 20, status, templateType, leadId } = query;
    const where: any = {};

    if (status) where.status = status;
    if (templateType) where.templateType = templateType;
    if (leadId) where.leadId = leadId;

    const total = await this.prisma.emailLog.count({ where });
    const logs = await this.prisma.emailLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { name: true, email: true },
        },
      },
    });

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Initialize default templates if they don't exist
   */
  async initializeDefaults() {
    const defaults = [
      {
        type: EmailTemplateType.QUESTIONNAIRE_THANK_YOU,
        name: 'Questionnaire Thank You',
        subject: 'Thank you for your feedback, {{name}}!',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #666; }
    h1 { margin: 0; font-size: 24px; }
    .responses { margin-top: 20px; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You!</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>Thank you for taking the time to complete our questionnaire! Your feedback is invaluable as we build OneClickTag.</p>
      <p>We've received your responses and will use them to better understand your needs and improve our product.</p>
      {{responses}}
      <p>We'll keep you updated on our progress and let you know when early access is available.</p>
      <p>Best regards,<br>The OneClickTag Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 OneClickTag. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `.trim(),
        textContent: `Hi {{name}},

Thank you for taking the time to complete our questionnaire! Your feedback is invaluable as we build OneClickTag.

We've received your responses and will use them to better understand your needs and improve our product.

We'll keep you updated on our progress and let you know when early access is available.

Best regards,
The OneClickTag Team`,
        availableVariables: ['name', 'email', 'responses'],
      },
      {
        type: EmailTemplateType.LEAD_WELCOME,
        name: 'Welcome Email',
        subject: 'Welcome to OneClickTag, {{name}}!',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #666; }
    h1 { margin: 0; font-size: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to OneClickTag!</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>Thank you for joining our early access program! We're excited to have you on board.</p>
      <p>OneClickTag simplifies Google tracking setup for marketing campaigns. We'll notify you as soon as early access becomes available.</p>
      <p>In the meantime, feel free to reply to this email if you have any questions.</p>
      <p>Best regards,<br>The OneClickTag Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 OneClickTag. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `.trim(),
        textContent: `Hi {{name}},

Thank you for joining our early access program! We're excited to have you on board.

OneClickTag simplifies Google tracking setup for marketing campaigns. We'll notify you as soon as early access becomes available.

In the meantime, feel free to reply to this email if you have any questions.

Best regards,
The OneClickTag Team`,
        availableVariables: ['name', 'email'],
      },
    ];

    for (const template of defaults) {
      const existing = await this.prisma.emailTemplate.findUnique({
        where: { type: template.type },
      });

      if (!existing) {
        await this.prisma.emailTemplate.create({
          data: template,
        });
        this.logger.log(`Created default template: ${template.type}`);
      }
    }
  }
}
