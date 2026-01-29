import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/plans/[id]/toggle-active - Toggle plan active status
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

    const plan = await prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      return NextResponse.json(
        { error: `Plan with ID ${id} not found` },
        { status: 404 }
      );
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    console.error('Error toggling plan status:', error);
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
