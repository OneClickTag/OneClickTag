import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';
import { EmailTriggerAction, EmailTemplateType } from '@prisma/client';

// Validation schema for creating/updating a trigger
const upsertTriggerSchema = z.object({
  action: z.nativeEnum(EmailTriggerAction),
  templateType: z.nativeEnum(EmailTemplateType),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

// Available trigger actions with descriptions
const triggerActions = [
  {
    action: EmailTriggerAction.LEAD_SIGNUP,
    label: 'Lead Signup',
    description: 'Triggered when a new lead signs up for early access',
    defaultTemplate: EmailTemplateType.LEAD_WELCOME,
  },
  {
    action: EmailTriggerAction.QUESTIONNAIRE_COMPLETE,
    label: 'Questionnaire Complete',
    description: 'Triggered when a lead completes the questionnaire',
    defaultTemplate: EmailTemplateType.QUESTIONNAIRE_THANK_YOU,
  },
];

/**
 * GET /api/admin/email-triggers
 * List all email triggers - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const triggers = await prisma.emailTrigger.findMany({
      orderBy: { action: 'asc' },
    });

    // Merge with available actions to show all possible triggers
    const result = triggerActions.map((ta) => {
      const existing = triggers.find((t) => t.action === ta.action);
      return {
        ...ta,
        id: existing?.id || null,
        templateType: existing?.templateType || ta.defaultTemplate,
        isActive: existing?.isActive ?? false,
        configuredDescription: existing?.description,
        createdAt: existing?.createdAt,
        updatedAt: existing?.updatedAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch email triggers: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch email triggers', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-triggers
 * Create or update email trigger - Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();

    // Validate input
    const validationResult = upsertTriggerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Upsert the trigger
    const trigger = await prisma.emailTrigger.upsert({
      where: { action: data.action },
      update: {
        templateType: data.templateType,
        isActive: data.isActive ?? true,
        description: data.description,
        updatedBy: session.id,
      },
      create: {
        action: data.action,
        templateType: data.templateType,
        isActive: data.isActive ?? true,
        description: data.description,
        createdBy: session.id,
      },
    });

    console.log(`Email trigger ${trigger.action} configured with template ${trigger.templateType}`);

    return NextResponse.json(trigger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to save email trigger: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to save email trigger', message: errorMessage },
      { status: 500 }
    );
  }
}
