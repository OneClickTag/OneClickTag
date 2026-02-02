import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// GET /api/admin/footer-content - Get footer content
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Get the first (and should be only) footer content
    const footer = await prisma.footerContent.findFirst();

    // Return null if no footer exists - admin should create one
    if (!footer) {
      return NextResponse.json(null);
    }

    return NextResponse.json(footer);
  } catch (error) {
    console.error('Error fetching footer content:', error);
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

// PUT /api/admin/footer-content - Update or create footer content
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const {
      brandName,
      brandDescription,
      socialLinks,
      sections,
      copyrightText,
      isActive,
    } = body;

    // Check if footer content exists
    let footer = await prisma.footerContent.findFirst();

    if (footer) {
      // Update existing
      footer = await prisma.footerContent.update({
        where: { id: footer.id },
        data: {
          ...(brandName !== undefined && { brandName }),
          ...(brandDescription !== undefined && { brandDescription }),
          ...(socialLinks !== undefined && { socialLinks }),
          ...(sections !== undefined && { sections }),
          ...(copyrightText !== undefined && { copyrightText }),
          ...(isActive !== undefined && { isActive }),
          updatedBy: session.id,
        },
      });
    } else {
      // Create new - require all fields
      footer = await prisma.footerContent.create({
        data: {
          brandName: brandName || '',
          brandDescription: brandDescription || '',
          socialLinks: socialLinks || [],
          sections: sections || [],
          copyrightText: copyrightText || '',
          isActive: isActive !== undefined ? isActive : true,
          updatedBy: session.id,
        },
      });
    }

    return NextResponse.json(footer);
  } catch (error) {
    console.error('Error updating footer content:', error);
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
