import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/footer - Get footer content from database ONLY
export async function GET() {
  try {
    const footer = await prisma.footerContent.findFirst({
      where: { isActive: true },
      select: {
        brandName: true,
        brandDescription: true,
        socialLinks: true,
        sections: true,
        copyrightText: true,
      },
    });

    // Return null if no footer configured - let client handle empty state
    if (!footer) {
      const response = NextResponse.json(null);
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return response;
    }

    const response = NextResponse.json(footer);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch footer content:', message);
    return NextResponse.json({ error: 'Failed to fetch footer' }, { status: 500 });
  }
}
