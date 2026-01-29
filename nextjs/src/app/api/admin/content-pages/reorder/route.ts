import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// PUT /api/admin/content-pages/reorder - Reorder content pages
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const pages: { id: string; order: number }[] = body;

    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: 'Body must be an array of pages with id and order' }, { status: 400 });
    }

    await Promise.all(
      pages.map((page) =>
        prisma.contentPage.update({
          where: { id: page.id },
          data: { order: page.order },
        })
      )
    );

    return NextResponse.json({ message: 'Content pages reordered successfully' });
  } catch (error) {
    console.error('Error reordering content pages:', error);
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
