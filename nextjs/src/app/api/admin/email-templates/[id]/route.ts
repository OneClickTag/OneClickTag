import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';
import { z } from 'zod';
import { EmailTemplateType } from '@prisma/client';

// Validation schema for updating a template
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  subject: z.string().min(1, 'Subject is required').max(200).optional(),
  htmlContent: z.string().min(1, 'HTML content is required').optional(),
  textContent: z.string().optional().nullable(),
  availableVariables: z.record(z.string()).optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/email-templates/[id]
 * Get template by ID - Admin only
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to fetch template: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch template', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/email-templates/[id]
 * Update a template - Admin only
 */
export async function PUT(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const validationResult = updateTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const data = validationResult.data;

    // Update the template - handle null values for JSON fields
    const updateData: Record<string, unknown> = {
      updatedBy: session.id,
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.htmlContent !== undefined) updateData.htmlContent = data.htmlContent;
    if (data.textContent !== undefined) updateData.textContent = data.textContent;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.availableVariables !== undefined) {
      updateData.availableVariables = data.availableVariables === null
        ? undefined
        : data.availableVariables;
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    console.log(`Email template updated: ${id}`);

    return NextResponse.json(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to update template: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to update template', message: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/email-templates/[id]
 * Toggle template active status - Admin only
 */
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Verify admin authentication
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await context.params;

    // Get current template
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Toggle active status
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        isActive: !existingTemplate.isActive,
        updatedBy: session.id,
      },
    });

    console.log(`Template active status toggled: ${id}`);

    return NextResponse.json(template);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle auth errors
    if (errorMessage === 'Unauthorized' || errorMessage.includes('Forbidden')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: errorMessage === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error(`Failed to toggle template status: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to toggle template status', message: errorMessage },
      { status: 500 }
    );
  }
}
