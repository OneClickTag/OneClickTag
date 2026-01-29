import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/footer - Get footer content (public, no auth)
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

    return NextResponse.json(footer || {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch footer content:', message);
    return NextResponse.json({ error: 'Failed to fetch footer' }, { status: 500 });
  }
}
