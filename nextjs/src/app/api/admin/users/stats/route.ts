import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// GET /api/admin/users/stats - Get user statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const [totalUsers, adminCount, userCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
      prisma.user.count({ where: { role: 'USER' } }),
    ]);

    return NextResponse.json({
      totalUsers,
      adminCount,
      userCount,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
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
