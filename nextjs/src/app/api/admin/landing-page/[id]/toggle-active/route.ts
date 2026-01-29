import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/landing-page/[id]/toggle-active - Toggle landing page section active status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const section = await prisma.landingPageContent.findUnique({ where: { id } });

    if (!section) {
      return NextResponse.json(
        { error: `Landing page section with ID ${id} not found` },
        { status: 404 }
      );
    }

    const updatedSection = await prisma.landingPageContent.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error('Error toggling landing page section status:', error);
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
