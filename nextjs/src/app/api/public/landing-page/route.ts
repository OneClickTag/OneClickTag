import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/landing-page - Get all landing page content (public, no auth)
export async function GET() {
  try {
    const content = await prisma.landingPageContent.findMany({
      where: { isActive: true },
    });

    // Transform to object keyed by section key
    const contentMap = content.reduce(
      (acc, item) => {
        acc[item.key] = item.content;
        return acc;
      },
      {} as Record<string, unknown>
    );

    return NextResponse.json(contentMap);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch landing page content:', message);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
