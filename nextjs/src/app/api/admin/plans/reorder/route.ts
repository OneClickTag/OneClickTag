import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// PUT /api/admin/plans/reorder - Reorder plans
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const plans: { id: string; order: number }[] = body;

    if (!Array.isArray(plans)) {
      return NextResponse.json({ error: 'Body must be an array of plans with id and order' }, { status: 400 });
    }

    await Promise.all(
      plans.map((plan) =>
        prisma.plan.update({
          where: { id: plan.id },
          data: { order: plan.order },
        })
      )
    );

    return NextResponse.json({ message: 'Plans reordered successfully' });
  } catch (error) {
    console.error('Error reordering plans:', error);
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
