import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ key: string }>;
}

// GET /api/admin/landing-page/by-key/[key] - Get landing page section by key
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { key } = await params;

    const section = await prisma.landingPageContent.findUnique({
      where: { key },
    });

    if (!section) {
      return NextResponse.json(
        { error: `Landing page section with key "${key}" not found` },
        { status: 404 }
      );
    }

    if (!section.isActive) {
      return NextResponse.json(
        { error: `Landing page section with key "${key}" is not active` },
        { status: 404 }
      );
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error fetching landing page section by key:', error);
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
