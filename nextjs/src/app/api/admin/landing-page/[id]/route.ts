import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/landing-page/[id] - Get landing page section by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;

    const section = await prisma.landingPageContent.findUnique({
      where: { id },
    });

    if (!section) {
      return NextResponse.json(
        { error: `Landing page section with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error fetching landing page section:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Admin access required') || error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/landing-page/[id] - Update landing page section
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();
    const { key, content, isActive, order, metadata } = body;

    const section = await prisma.landingPageContent.findUnique({ where: { id } });

    if (!section) {
      return NextResponse.json(
        { error: `Landing page section with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Check if key is being changed and if it's already taken
    if (key && key !== section.key) {
      const existing = await prisma.landingPageContent.findUnique({
        where: { key },
      });

      if (existing) {
        return NextResponse.json(
          { error: `Landing page section with key "${key}" already exists` },
          { status: 400 }
        );
      }
    }

    const updatedSection = await prisma.landingPageContent.update({
      where: { id },
      data: {
        ...(key !== undefined && { key }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
        ...(metadata !== undefined && { metadata }),
        updatedBy: session.id,
      },
    });

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error('Error updating landing page section:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Admin access required') || error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/landing-page/[id] - Delete landing page section
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;

    const section = await prisma.landingPageContent.findUnique({ where: { id } });

    if (!section) {
      return NextResponse.json(
        { error: `Landing page section with ID ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.landingPageContent.delete({ where: { id } });

    return NextResponse.json({ message: 'Landing page section deleted successfully' });
  } catch (error) {
    console.error('Error deleting landing page section:', error);
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Admin access required') || error.message === 'Forbidden: Admin access required') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
