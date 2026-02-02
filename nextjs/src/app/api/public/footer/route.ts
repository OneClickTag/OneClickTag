import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
};

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

    // Return DB data if exists, otherwise return defaults
    if (!footer) {
      return NextResponse.json(defaultFooterConfig);
    }

    return NextResponse.json(footer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch footer content:', message);
    return NextResponse.json({ error: 'Failed to fetch footer' }, { status: 500 });
  }
}
