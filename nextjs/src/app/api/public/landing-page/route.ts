import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/landing-page - Get all landing page content (public, no auth)
export async function GET() {
  try {
    const content = await prisma.landingPageContent.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    // Transform to object keyed by section key, plus ordered keys array
    const contentMap: Record<string, unknown> = {};
    const sectionOrder: string[] = [];
    for (const item of content) {
      contentMap[item.key] = item.content;
      sectionOrder.push(item.key);
    }
    contentMap._sectionOrder = sectionOrder;

    return NextResponse.json(contentMap);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch landing page content:', message);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
