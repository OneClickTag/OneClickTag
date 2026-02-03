import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailTemplateType } from '@prisma/client';
import * as nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  name?: string;
  leadId?: string;
  variables?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn('SMTP not configured - emails will be logged only');
    }
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(
    template: string,
    variables: Record<string, any>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }

  /**
   * Send email using a template
   */
  async sendTemplateEmail(
    templateType: EmailTemplateType,
    data: EmailData,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get template
      const template = await this.prisma.emailTemplate.findUnique({
        where: { type: templateType },
      });

      if (!template || !template.isActive) {
        this.logger.warn(`Email template ${templateType} not found or inactive`);
        return { success: false, error: 'Template not found or inactive' };
      }

      // Prepare variables
      const variables: Record<string, any> = {
        name: data.name || 'there',
        email: data.to,
        ...data.variables,
      };

      // Replace variables in subject and content
      const subject = this.replaceVariables(template.subject, variables);
      const htmlContent = this.replaceVariables(template.htmlContent, variables);
      const textContent = template.textContent
        ? this.replaceVariables(template.textContent, variables)
        : undefined;

      // Create email log
      const emailLog = await this.prisma.emailLog.create({
        data: {
          templateType,
          recipientEmail: data.to,
          recipientName: data.name,
          subject,
          leadId: data.leadId,
          status: 'PENDING',
        },
      });

      // Send email
      if (this.transporter) {
        try {
          await this.transporter.sendMail({
            from: process.env.SMTP_FROM || 'OneClickTag <noreply@oneclicktag.com>',
            to: data.to,
            subject,
            html: htmlContent,
            text: textContent,
          });

          // Update log to sent
          await this.prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'SENT', sentAt: new Date() },
          });

          this.logger.log(`Email sent to ${data.to} (${templateType})`);
          return { success: true };
        } catch (sendError) {
          const errorMessage = sendError?.message || String(sendError);
          await this.prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'FAILED', errorMessage },
          });
          this.logger.error(`Failed to send email: ${errorMessage}`);
          return { success: false, error: errorMessage };
        }
      } else {
        // Log only mode
        this.logger.log(`[DEV] Email would be sent to ${data.to}:`);
        this.logger.log(`  Subject: ${subject}`);
        this.logger.log(`  Template: ${templateType}`);

        await this.prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: 'SENT', sentAt: new Date() },
        });

        return { success: true };
      }
    } catch (error) {
      const errorMessage = error?.message || String(error);
      this.logger.error(`Email service error: ${errorMessage}`, error?.stack);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send questionnaire thank you email
   */
  async sendQuestionnaireThankYou(
    leadId: string,
    email: string,
    name: string,
    responses?: Array<{ question: string; answer: any }>,
  ) {
    // Format responses for email
    let responsesHtml = '';
    if (responses && responses.length > 0) {
      responsesHtml = responses
        .map(
          (r) =>
            `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${r.question}</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${Array.isArray(r.answer) ? r.answer.join(', ') : r.answer}</td></tr>`,
        )
        .join('');
      responsesHtml = `<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">${responsesHtml}</table>`;
    }

    return this.sendTemplateEmail(EmailTemplateType.QUESTIONNAIRE_THANK_YOU, {
      to: email,
      name,
      leadId,
      variables: {
        responses: responsesHtml,
      },
    });
  }
}
