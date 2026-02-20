import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/plans - Get all active plans (public, no auth)
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        features: true,
        price: true,
        billingPeriod: true,
        currency: true,
        isFeatured: true,
        ctaText: true,
        ctaUrl: true,
      },
    });

    const response = NextResponse.json(plans);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch plans:', message);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
