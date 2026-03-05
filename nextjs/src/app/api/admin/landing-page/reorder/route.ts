import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// PUT /api/admin/landing-page/reorder - Reorder landing page sections
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const sections: { id: string; sortOrder: number }[] = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Body must be an array of sections with id and sortOrder' },
        { status: 400 }
      );
    }

    await Promise.all(
      sections.map((section) =>
        prisma.landingPageContent.update({
          where: { id: section.id },
          data: { sortOrder: section.sortOrder },
        })
      )
    );

    return NextResponse.json({ message: 'Sections reordered successfully' });
  } catch (error) {
    console.error('Error reordering landing page sections:', error);
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
