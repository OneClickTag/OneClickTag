import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';
import { EmailTemplateType } from '@prisma/client';

// Validation schema for creating/updating a template
const upsertTemplateSchema = z.object({
  type: z.nativeEnum(EmailTemplateType),
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(200),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  availableVariables: z.record(z.string()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/admin/email-templates
 * List all email templates - Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: {
        type: 'asc',
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch email templates: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch email templates', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/email-templates
 * Create or update (upsert) email template - Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();

    // Validate input
    const validationResult = upsertTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if template already exists
    const existing = await prisma.emailTemplate.findUnique({
      where: { type: data.type },
    });

    let template;
    if (existing) {
      // Update existing template
      template = await prisma.emailTemplate.update({
        where: { type: data.type },
        data: {
          name: data.name,
          subject: data.subject,
          htmlContent: data.htmlContent,
          textContent: data.textContent,
          availableVariables: data.availableVariables,
          isActive: data.isActive ?? existing.isActive,
          updatedBy: session.id,
        },
      });
      console.log(`Email template updated: ${template.id}`);
    } else {
      // Create new template
      template = await prisma.emailTemplate.create({
        data: {
          type: data.type,
          name: data.name,
          subject: data.subject,
          htmlContent: data.htmlContent,
          textContent: data.textContent,
          availableVariables: data.availableVariables,
          isActive: data.isActive ?? true,
          createdBy: session.id,
        },
      });
      console.log(`Email template created: ${template.id}`);
    }

    return NextResponse.json(template, { status: existing ? 200 : 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to save email template: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to save email template', message: errorMessage },
      { status: 500 }
    );
  }
}
