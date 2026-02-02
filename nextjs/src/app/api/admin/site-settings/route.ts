import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// GET /api/admin/site-settings - Get all site settings
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const settings = await prisma.siteSettings.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error);
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

// POST /api/admin/site-settings - Create site setting
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const {
      key,
      brandName,
      logoUrl,
      faviconUrl,
      brandColors,
      heroBackgroundUrl,
      metaTitle,
      metaDescription,
      socialImageUrl,
      customCSS,
      customJS,
      seoSettings,
    } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Check if key already exists
    const existing = await prisma.siteSettings.findUnique({
      where: { key },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Site setting with key "${key}" already exists` },
        { status: 400 }
      );
    }

    const setting = await prisma.siteSettings.create({
      data: {
        key,
        brandName,
        logoUrl,
        faviconUrl,
        brandColors,
        heroBackgroundUrl,
        metaTitle,
        metaDescription,
        socialImageUrl,
        customCSS,
        customJS,
        seoSettings,
        updatedBy: session.id,
      },
    });

    return NextResponse.json(setting, { status: 201 });
  } catch (error) {
    console.error('Error creating site setting:', error);
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

// PUT /api/admin/site-settings - Update global site settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const {
      brandName,
      logoUrl,
      faviconUrl,
      brandColors,
      heroBackgroundUrl,
      metaTitle,
      metaDescription,
      socialImageUrl,
      customCSS,
      customJS,
      seoSettings,
    } = body;

    // Get or create global settings
    let settings = await prisma.siteSettings.findUnique({
      where: { key: 'global' },
    });

    if (!settings) {
      // Create default global settings if they don't exist
      settings = await prisma.siteSettings.create({
        data: {
          key: 'global',
          brandName: 'OneClickTag',
        },
      });
    }

    const updatedSettings = await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        ...(brandName !== undefined && { brandName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(brandColors !== undefined && { brandColors }),
        ...(heroBackgroundUrl !== undefined && { heroBackgroundUrl }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
        ...(socialImageUrl !== undefined && { socialImageUrl }),
        ...(customCSS !== undefined && { customCSS }),
        ...(customJS !== undefined && { customJS }),
        ...(seoSettings !== undefined && { seoSettings }),
        key: 'global', // Ensure key stays as 'global'
        updatedBy: session.id,
      },
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating global site settings:', error);
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
