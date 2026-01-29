import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/site-settings/[id] - Get site setting by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;

    const setting = await prisma.siteSettings.findUnique({
      where: { id },
    });

    if (!setting) {
      return NextResponse.json(
        { error: `Site setting with ID ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error fetching site setting:', error);
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

// PUT /api/admin/site-settings/[id] - Update site setting
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;
    const body = await request.json();
    const { key, brandName, logoUrl, faviconUrl, primaryColor, secondaryColor, metadata } = body;

    const setting = await prisma.siteSettings.findUnique({ where: { id } });

    if (!setting) {
      return NextResponse.json(
        { error: `Site setting with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Check if key is being changed and if it's already taken
    if (key && key !== setting.key) {
      const existing = await prisma.siteSettings.findUnique({
        where: { key },
      });

      if (existing) {
        return NextResponse.json(
          { error: `Site setting with key "${key}" already exists` },
          { status: 400 }
        );
      }
    }

    const updatedSetting = await prisma.siteSettings.update({
      where: { id },
      data: {
        ...(key !== undefined && { key }),
        ...(brandName !== undefined && { brandName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(metadata !== undefined && { metadata }),
        updatedBy: session.id,
      },
    });

    return NextResponse.json(updatedSetting);
  } catch (error) {
    console.error('Error updating site setting:', error);
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

// DELETE /api/admin/site-settings/[id] - Delete site setting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const { id } = await params;

    const setting = await prisma.siteSettings.findUnique({ where: { id } });

    if (!setting) {
      return NextResponse.json(
        { error: `Site setting with ID ${id} not found` },
        { status: 404 }
      );
    }

    await prisma.siteSettings.delete({ where: { id } });

    return NextResponse.json({ message: 'Site setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting site setting:', error);
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
