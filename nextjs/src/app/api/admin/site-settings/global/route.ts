import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// GET /api/admin/site-settings/global - Get global site settings
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

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

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching global site settings:', error);
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

// PUT /api/admin/site-settings/global - Update global site settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const { brandName, logoUrl, faviconUrl, primaryColor, secondaryColor, metadata } = body;

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
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(metadata !== undefined && { metadata }),
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
