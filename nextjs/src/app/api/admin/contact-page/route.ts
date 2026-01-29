import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionFromRequest, requireAdmin } from '@/lib/auth/session';

// Default content blocks for new contact pages
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

// GET /api/admin/contact-page - Get contact page content
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    // Get the first (and should be only) contact page content
    const contact = await prisma.contactPageContent.findFirst();

    // If no contact content exists, return empty object with default structure
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
        customContent: {},
        isActive: true,
      });
    }

    // Extract contentBlocks from customContent or use defaults
    const customContent = (contact.customContent as Record<string, unknown>) || {};
    const contentBlocks = customContent.contentBlocks || getDefaultBlocks();

    return NextResponse.json({
      ...contact,
      contentBlocks,
    });
  } catch (error) {
    console.error('Error fetching contact page content:', error);
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

// PUT /api/admin/contact-page - Update or create contact page content
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    requireAdmin(session);

    const body = await request.json();
    const {
      email,
      phone,
      address,
      businessHours,
      socialLinks,
      faqs,
      formSettings,
      contentBlocks,
      customContent,
      isActive,
    } = body;

    // Merge contentBlocks into customContent for storage
    const mergedCustomContent = {
      ...(customContent || {}),
      contentBlocks: contentBlocks || getDefaultBlocks(),
    };

    // Check if contact content exists
    let contact = await prisma.contactPageContent.findFirst();

    if (contact) {
      // Update existing
      contact = await prisma.contactPageContent.update({
        where: { id: contact.id },
        data: {
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(businessHours !== undefined && { businessHours }),
          ...(socialLinks !== undefined && { socialLinks }),
          ...(faqs !== undefined && { faqs }),
          ...(formSettings !== undefined && { formSettings }),
          customContent: mergedCustomContent,
          ...(isActive !== undefined && { isActive }),
          updatedBy: session.id,
        },
      });
    } else {
      // Create new
      contact = await prisma.contactPageContent.create({
        data: {
          email: email || '',
          phone: phone || '',
          address: address || '',
          businessHours: businessHours || '',
          socialLinks: socialLinks || [],
          faqs: faqs || [],
          formSettings: formSettings || {
            enableForm: true,
            subjects: ['General Inquiry', 'Sales Question', 'Technical Support', 'Partnership Opportunity', 'Other'],
            successMessage: "Thank you for contacting us. We'll get back to you within 24 hours.",
          },
          customContent: mergedCustomContent,
          isActive: isActive !== undefined ? isActive : true,
          updatedBy: session.id,
        },
      });
    }

    // Return with contentBlocks extracted for frontend
    const returnCustomContent = (contact.customContent as Record<string, unknown>) || {};
    return NextResponse.json({
      ...contact,
      contentBlocks: returnCustomContent.contentBlocks || getDefaultBlocks(),
    });
  } catch (error) {
    console.error('Error updating contact page content:', error);
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
