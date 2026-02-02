import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// Default footer configuration (matches Footer component defaults)
const defaultFooterConfig = {
  brandName: 'OneClickTag',
  brandDescription: 'Simplify your conversion tracking with automated GTM and Google Ads integration.',
  socialLinks: [
    { platform: 'Twitter', url: 'https://twitter.com/oneclicktag', icon: 'twitter' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/company/oneclicktag', icon: 'linkedin' },
    { platform: 'GitHub', url: 'https://github.com/oneclicktag', icon: 'github' },
  ],
  sections: [
    {
      title: 'Product',
      links: [{ label: 'Pricing', url: '/plans' }],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', url: '/about' },
        { label: 'Contact', url: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', url: '/terms' },
        { label: 'Privacy Policy', url: '/privacy' },
      ],
    },
  ],
  copyrightText: 'OneClickTag. All rights reserved.',
  isActive: true,
};

// GET /api/admin/footer-content - Get footer content
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Get the first (and should be only) footer content
    let footer = await prisma.footerContent.findFirst();

    // If no footer content exists, return default config so admin can see and edit
    if (!footer) {
      return NextResponse.json(defaultFooterConfig);
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
      // Create new
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
