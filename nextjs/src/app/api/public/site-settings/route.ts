import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/site-settings - Get site settings (public, no auth)
export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { key: 'global' },
      select: {
        logoUrl: true,
        faviconUrl: true,
        brandName: true,
        brandColors: true,
        heroBackgroundUrl: true,
        metaTitle: true,
        metaDescription: true,
        socialImageUrl: true,
      },
    });

    return NextResponse.json(settings || {});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch site settings:', message);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
