import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Default content blocks for fallback
const getDefaultBlocks = () => [
  {
    id: 'hero-1',
    type: 'hero',
    title: 'Hero Section',
    enabled: true,
    order: 0,
    content: {
      badge: 'Get in Touch',
      headline: 'Contact Us',
      subtitle: "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
    },
  },
  {
    id: 'contact-info-1',
    type: 'contact-info',
    title: 'Contact Information',
    enabled: true,
    order: 1,
    content: {},
  },
  {
    id: 'contact-form-1',
    type: 'contact-form',
    title: 'Contact Form',
    enabled: true,
    order: 2,
    content: {
      heading: 'Send us a Message',
      subheading: "Fill out the form below and we'll get back to you shortly.",
    },
  },
  {
    id: 'faqs-1',
    type: 'faqs',
    title: 'FAQ Section',
    enabled: true,
    order: 3,
    content: {
      heading: 'Frequently Asked Questions',
      subheading: 'Find quick answers to common questions',
    },
  },
];

// GET /api/public/contact - Get contact page content (public, no auth)
export async function GET() {
  try {
    const contact = await prisma.contactPageContent.findFirst({
      where: { isActive: true },
      select: {
        email: true,
        phone: true,
        address: true,
        businessHours: true,
        socialLinks: true,
        faqs: true,
        formSettings: true,
        customContent: true,
      },
    });

    if (!contact) {
      return NextResponse.json({
        email: '',
        phone: '',
        address: '',
        businessHours: '',
        socialLinks: [],
        faqs: [],
        formSettings: {
          enableForm: true,
          subjects: ['General Inquiry', 'Sales Question', 'Technical Support', 'Partnership Opportunity', 'Other'],
          successMessage: "Thank you for contacting us. We'll get back to you within 24 hours.",
        },
        contentBlocks: getDefaultBlocks(),
        contactFields: [],
      });
    }

    // Extract contentBlocks and contactFields from customContent
    const customContent = (contact.customContent as Record<string, unknown>) || {};
    const contentBlocks = customContent.contentBlocks || getDefaultBlocks();
    const contactFields = customContent.contactFields || [];

    return NextResponse.json({
      ...contact,
      contentBlocks,
      contactFields,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch contact content:', message);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}
