/**
 * Email Service for sending emails via SMTP
 * Supports variable replacement in templates
 */

import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';
import { EmailTemplateType, EmailTriggerAction } from '@prisma/client';

// Production domain for email assets (email clients can't access localhost)
const PRODUCTION_DOMAIN = 'https://oneclicktag.com';

/**
 * Get the base URL for email assets
 * Always uses production domain since email clients can't access localhost
 */
export function getEmailAssetsBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_DOMAIN;
  // If it's localhost, use production domain for email assets
  if (appUrl.includes('localhost') || appUrl.includes('127.0.0.1')) {
    return PRODUCTION_DOMAIN;
  }
  return appUrl;
}

/**
 * Get the logo URL for emails
 */
export function getEmailLogoUrl(): string {
  return `${getEmailAssetsBaseUrl()}/logo-email.png`;
}

// Create reusable transporter using Gmail/Google Workspace SMTP
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (!smtpUser || !smtpPass) {
    console.warn('SMTP credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: Record<string, string>;
  leadId?: string;
}

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  availableVariables?: Record<string, string> | null;
}

/**
 * Replace variables in template content
 * Variables are in format {{variableName}}
 */
function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

/**
 * Get email template by type
 */
export async function getTemplateByType(type: EmailTemplateType): Promise<EmailTemplate | null> {
  const template = await prisma.emailTemplate.findUnique({
    where: { type },
  });

  if (!template || !template.isActive) {
    return null;
  }

  return {
    id: template.id,
    type: template.type,
    name: template.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    availableVariables: template.availableVariables as Record<string, string> | null,
  };
}

/**
 * Log email send attempt
 */
async function logEmail(
  templateType: EmailTemplateType,
  recipientEmail: string,
  recipientName: string | undefined,
  subject: string,
  status: 'PENDING' | 'SENT' | 'FAILED',
  errorMessage?: string,
  leadId?: string
): Promise<string> {
  const log = await prisma.emailLog.create({
    data: {
      templateType,
      recipientEmail,
      recipientName,
      subject,
      status,
      errorMessage,
      leadId,
      sentAt: status === 'SENT' ? new Date() : null,
    },
  });
  return log.id;
}

/**
 * Update email log status
 */
async function updateEmailLog(
  logId: string,
  status: 'SENT' | 'FAILED',
  errorMessage?: string
): Promise<void> {
  await prisma.emailLog.update({
    where: { id: logId },
    data: {
      status,
      errorMessage,
      sentAt: status === 'SENT' ? new Date() : undefined,
    },
  });
}

/**
 * Send email using template type
 */
export async function sendTemplatedEmail(
  templateType: EmailTemplateType,
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('Email transporter not configured');
    return { success: false, error: 'Email service not configured' };
  }

  // Get template
  const template = await getTemplateByType(templateType);
  if (!template) {
    console.error(`Email template not found or inactive: ${templateType}`);
    return { success: false, error: `Template not found: ${templateType}` };
  }

  // Prepare variables with defaults
  const variables: Record<string, string> = {
    email: options.to,
    name: options.toName || options.to.split('@')[0],
    ...options.variables,
  };

  // Replace variables in subject and content
  const subject = replaceVariables(options.subject || template.subject, variables);
  const htmlContent = replaceVariables(template.htmlContent, variables);
  const textContent = template.textContent
    ? replaceVariables(template.textContent, variables)
    : undefined;

  // Log the email attempt
  const logId = await logEmail(
    templateType,
    options.to,
    options.toName,
    subject,
    'PENDING',
    undefined,
    options.leadId
  );

  try {
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'OneClickTag';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    // Update log as sent
    await updateEmailLog(logId, 'SENT');

    console.log(`Email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update log as failed
    await updateEmailLog(logId, 'FAILED', errorMessage);

    console.error(`Failed to send email to ${options.to}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send custom email (not using a template)
 */
export async function sendEmail(options: SendEmailOptions & { subject: string; htmlContent: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('Email transporter not configured');
    return { success: false, error: 'Email service not configured' };
  }

  // Replace variables if provided
  const subject = options.variables
    ? replaceVariables(options.subject, options.variables)
    : options.subject;
  const htmlContent = options.variables
    ? replaceVariables(options.htmlContent, options.variables)
    : options.htmlContent;
  const textContent = options.textContent && options.variables
    ? replaceVariables(options.textContent, options.variables)
    : options.textContent;

  try {
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'OneClickTag';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`Custom email sent to ${options.to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send email to ${options.to}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if an email trigger is active
 */
export async function isTriggerActive(action: EmailTriggerAction): Promise<boolean> {
  const trigger = await prisma.emailTrigger.findUnique({
    where: { action },
  });
  return trigger?.isActive ?? false;
}

/**
 * Get the template type for a trigger action
 */
export async function getTriggerTemplateType(action: EmailTriggerAction): Promise<EmailTemplateType | null> {
  const trigger = await prisma.emailTrigger.findUnique({
    where: { action },
  });
  if (!trigger || !trigger.isActive) {
    return null;
  }
  return trigger.templateType;
}

/**
 * Send email based on trigger action
 * Only sends if the trigger is active in admin settings
 */
export async function sendTriggeredEmail(
  action: EmailTriggerAction,
  options: SendEmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  // Check if trigger is active
  const templateType = await getTriggerTemplateType(action);

  if (!templateType) {
    console.log(`Email trigger ${action} is not active. Skipping email.`);
    return { success: true, skipped: true };
  }

  // Send the email using the configured template
  return sendTemplatedEmail(templateType, options);
}

/**
 * Get all templates
 */
export async function getAllTemplates(activeOnly = false) {
  const where = activeOnly ? { isActive: true } : {};
  return prisma.emailTemplate.findMany({
    where,
    orderBy: { type: 'asc' },
  });
}

/**
 * Get email logs with pagination
 */
export async function getEmailLogs(options: {
  page?: number;
  limit?: number;
  status?: string;
  templateType?: EmailTemplateType;
  leadId?: string;
}) {
  const { page = 1, limit = 20, status, templateType, leadId } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (templateType) where.templateType = templateType;
  if (leadId) where.leadId = leadId;

  const [data, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.emailLog.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Create or update email template
 */
export async function upsertTemplate(data: {
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  availableVariables?: Record<string, string>;
  isActive?: boolean;
  createdBy?: string;
  updatedBy?: string;
}) {
  const existing = await prisma.emailTemplate.findUnique({
    where: { type: data.type },
  });

  if (existing) {
    return prisma.emailTemplate.update({
      where: { type: data.type },
      data: {
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        textContent: data.textContent,
        availableVariables: data.availableVariables,
        isActive: data.isActive ?? existing.isActive,
        updatedBy: data.updatedBy,
      },
    });
  }

  return prisma.emailTemplate.create({
    data: {
      type: data.type,
      name: data.name,
      subject: data.subject,
      htmlContent: data.htmlContent,
      textContent: data.textContent,
      availableVariables: data.availableVariables,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Initialize default email templates
 */
export async function initializeDefaultTemplates(): Promise<void> {
  const defaults = [
    {
      type: EmailTemplateType.QUESTIONNAIRE_THANK_YOU,
      name: 'Questionnaire Thank You',
      subject: "🎉 You're awesome! Your questionnaire is in!",
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">

          <!-- Confetti Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); padding: 50px 30px; text-align: center; position: relative;">
              <!-- Decorative Elements -->
              <div style="font-size: 60px; margin-bottom: 15px;">🎊</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                Woohoo! You Did It!
              </h1>
              <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0; font-size: 18px; font-weight: 500;">
                Your questionnaire has landed safely in our inbox
              </p>
              <!-- Fun decorative stars -->
              <div style="margin-top: 20px; font-size: 24px; letter-spacing: 10px;">✨ 🚀 ✨</div>
            </td>
          </tr>

          <!-- Logo -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; background-color: #1a1a2e;">
              <img src="{{logoUrl}}" alt="OneClickTag" style="max-width: 160px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 35px 40px; background-color: #1a1a2e;">
              <p style="margin: 0 0 25px; font-size: 18px; color: #e2e8f0; line-height: 1.6;">
                Hey <strong style="color: #a78bfa;">{{name}}</strong>! 👋
              </p>

              <p style="margin: 0 0 25px; font-size: 16px; color: #94a3b8; line-height: 1.7;">
                You just took a huge step towards saying goodbye to tracking headaches forever!
                We're genuinely excited to help you simplify your Google tracking setup.
              </p>

              <!-- Fun Stats Box -->
              <table role="presentation" style="width: 100%; background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%); border-radius: 16px; margin: 30px 0; border: 1px solid rgba(167, 139, 250, 0.3);">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px; font-size: 14px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      🎯 Fun Fact
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                      The average marketer spends <strong style="color: #f472b6;">3+ hours</strong> setting up Google tracking manually.
                      With OneClickTag? <strong style="color: #34d399;">Under 5 minutes.</strong>
                      That's like getting your weekend back! 🏖️
                    </p>
                  </td>
                </tr>
              </table>

              <!-- What's Next Section -->
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 20px; font-size: 20px; color: #f1f5f9; font-weight: 700;">
                      What happens next? 🤔
                    </p>
                  </td>
                </tr>
                <!-- Step 1 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50px; vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center; line-height: 40px; font-size: 18px;">
                            🔍
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 15px;">
                          <p style="margin: 0; font-size: 15px; color: #e2e8f0; font-weight: 600;">We review your answers</p>
                          <p style="margin: 5px 0 0; font-size: 13px; color: #64748b;">Our team is on it!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Step 2 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50px; vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; text-align: center; line-height: 40px; font-size: 18px;">
                            💡
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 15px;">
                          <p style="margin: 0; font-size: 15px; color: #e2e8f0; font-weight: 600;">We craft your personalized plan</p>
                          <p style="margin: 5px 0 0; font-size: 13px; color: #64748b;">Tailored just for you</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Step 3 -->
                <tr>
                  <td style="padding: 12px 0;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50px; vertical-align: top;">
                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%); border-radius: 12px; text-align: center; line-height: 40px; font-size: 18px;">
                            🚀
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 15px;">
                          <p style="margin: 0; font-size: 15px; color: #e2e8f0; font-weight: 600;">You get early access!</p>
                          <p style="margin: 5px 0 0; font-size: 13px; color: #64748b;">Time to track like a pro</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Motivational Quote -->
              <table role="presentation" style="width: 100%; margin: 35px 0;">
                <tr>
                  <td style="padding: 25px; background: rgba(52, 211, 153, 0.1); border-radius: 16px; border-left: 4px solid #34d399;">
                    <p style="margin: 0; font-size: 16px; color: #94a3b8; font-style: italic; line-height: 1.6;">
                      "The best time to set up proper tracking was yesterday. The second best time is with OneClickTag."
                    </p>
                    <p style="margin: 10px 0 0; font-size: 13px; color: #64748b;">
                      — Every marketer who discovered us 😉
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Closing -->
              <p style="margin: 30px 0 0; font-size: 16px; color: #94a3b8; line-height: 1.7;">
                Got questions? Just hit reply - we actually read every email! 📬
              </p>

              <p style="margin: 25px 0 0; font-size: 16px; color: #e2e8f0;">
                Cheers,<br>
                <strong style="color: #a78bfa;">The OneClickTag Crew</strong> 🤘
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #16162a; padding: 30px; border-top: 1px solid #2d2d4a;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 15px; font-size: 24px;">
                      <a href="{{siteUrl}}" style="text-decoration: none; margin: 0 8px;">🌐</a>
                      <a href="{{linkedinUrl}}" style="text-decoration: none; margin: 0 8px;">💼</a>
                    </p>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
                      <a href="{{siteUrl}}" style="color: #a78bfa; text-decoration: none;">Website</a>
                      <span style="color: #475569; margin: 0 10px;">•</span>
                      <a href="{{linkedinUrl}}" style="color: #a78bfa; text-decoration: none;">LinkedIn</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #475569;">
                      OneClickTag — Making tracking less painful since 2025 ✌️
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
      textContent: `
🎉 WOOHOO! YOU DID IT!

Hey {{name}}! 👋

You just took a huge step towards saying goodbye to tracking headaches forever! We're genuinely excited to help you simplify your Google tracking setup.

---

🎯 FUN FACT
The average marketer spends 3+ hours setting up Google tracking manually. With OneClickTag? Under 5 minutes. That's like getting your weekend back! 🏖️

---

WHAT HAPPENS NEXT? 🤔

🔍 We review your answers — Our team is on it!
💡 We craft your personalized plan — Tailored just for you
🚀 You get early access! — Time to track like a pro

---

"The best time to set up proper tracking was yesterday. The second best time is with OneClickTag."
— Every marketer who discovered us 😉

---

Got questions? Just hit reply - we actually read every email! 📬

Cheers,
The OneClickTag Crew 🤘

---
Website: {{siteUrl}}
LinkedIn: {{linkedinUrl}}

OneClickTag — Making tracking less painful since 2025 ✌️
      `.trim(),
      availableVariables: {
        name: 'Recipient name',
        email: 'Recipient email',
        logoUrl: 'Logo image URL',
        siteUrl: 'Website URL',
        linkedinUrl: 'LinkedIn page URL',
      },
    },
    {
      type: EmailTemplateType.LEAD_WELCOME,
      name: 'Early Access Welcome',
      subject: "You're In! Welcome to OneClickTag Early Access",
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OneClickTag</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Logo Header -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <img src="{{logoUrl}}" alt="OneClickTag" style="max-width: 180px; height: auto;">
            </td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to OneClickTag!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">You're on the early access list</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Hi {{name}},</p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">Thank you for applying to OneClickTag early access! We're thrilled to have you join us on this journey to simplify Google tracking for marketers.</p>

              <!-- What's Next Box -->
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">What happens next?</h2>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold;">1</span>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">Complete the quick questionnaire below to help us understand your needs</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold;">2</span>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">Our team reviews your application and tracking requirements</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold;">3</span>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #4b5563;">You'll receive an invite to start using OneClickTag!</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{questionnaireUrl}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Complete Questionnaire</a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-top: 12px;">
                    <span style="font-size: 13px; color: #6b7280;">Takes less than 2 minutes</span>
                  </td>
                </tr>
              </table>

              <!-- Account Info -->
              <table role="presentation" style="width: 100%; background-color: #fef3c7; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e;">
                      <strong>Your registered email:</strong> {{email}}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Secondary CTAs -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{siteUrl}}" style="display: inline-block; color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">Visit Our Website</a>
                    <span style="color: #d1d5db;">|</span>
                    <a href="{{contactUrl}}" style="display: inline-block; color: #667eea; text-decoration: none; font-size: 14px; margin: 0 15px;">Contact Support</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-size: 16px; color: #374151;">Looking forward to helping you simplify your tracking!</p>
              <p style="margin: 10px 0 0; font-size: 16px; color: #374151;">The OneClickTag Team</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 13px; color: #6b7280;">OneClickTag - Simplifying Google Tracking</p>
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      You received this email because you signed up for OneClickTag early access.<br>
                      <a href="{{unsubscribeUrl}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from future emails
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
      textContent: `
Welcome to OneClickTag Early Access!

Hi {{name}},

Thank you for applying to OneClickTag early access! We're thrilled to have you join us on this journey to simplify Google tracking for marketers.

WHAT HAPPENS NEXT?
==================
1. Complete the quick questionnaire to help us understand your needs
2. Our team reviews your application and tracking requirements
3. You'll receive an invite to start using OneClickTag!

COMPLETE YOUR QUESTIONNAIRE
============================
{{questionnaireUrl}}
(Takes less than 2 minutes)

Your registered email: {{email}}

---

Visit our website: {{siteUrl}}
Contact support: {{contactUrl}}

Looking forward to helping you simplify your tracking!
The OneClickTag Team

---
You received this email because you signed up for OneClickTag early access.
Unsubscribe: {{unsubscribeUrl}}
      `.trim(),
      availableVariables: {
        name: 'Recipient name',
        email: 'Recipient email address',
        questionnaireUrl: 'Link to complete questionnaire',
        siteUrl: 'Homepage URL',
        contactUrl: 'Contact page URL',
        unsubscribeUrl: 'Unsubscribe link',
      },
    },
  ];

  for (const template of defaults) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { type: template.type },
    });

    if (!existing) {
      await prisma.emailTemplate.create({
        data: template,
      });
      console.log(`Created default template: ${template.name}`);
    }
  }
}
