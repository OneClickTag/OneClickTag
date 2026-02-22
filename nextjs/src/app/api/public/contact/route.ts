import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email/email.service';

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
    const rawContactFields = customContent.contactFields as Array<{
      id: string;
      type: string;
      label: string;
      value: string;
      enabled: boolean;
      order: number;
    }> | undefined;

    // Filter to only include enabled fields with values
    let contactFields: typeof rawContactFields = [];

    if (rawContactFields && rawContactFields.length > 0) {
      // Filter out disabled fields - only return enabled fields to public
      contactFields = rawContactFields.filter((field) => field.enabled && field.value);
    } else {
      // If no contactFields in customContent, build from legacy fields (all enabled by default)
      if (contact.email) {
        contactFields.push({ id: 'email-1', type: 'email', label: 'Email', value: contact.email, enabled: true, order: 0 });
      }
      if (contact.phone) {
        contactFields.push({ id: 'phone-1', type: 'phone', label: 'Phone', value: contact.phone, enabled: true, order: 1 });
      }
      if (contact.address) {
        contactFields.push({ id: 'address-1', type: 'address', label: 'Office', value: contact.address, enabled: true, order: 2 });
      }
      if (contact.businessHours) {
        contactFields.push({ id: 'hours-1', type: 'hours', label: 'Business Hours', value: contact.businessHours, enabled: true, order: 3 });
      }
    }

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

// Escape HTML special characters to prevent XSS in email content
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// POST /api/public/contact - Handle contact form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get the contact email from settings
    const contact = await prisma.contactPageContent.findFirst({
      where: { isActive: true },
      select: { email: true, customContent: true },
    });

    // Determine the recipient email: check contactFields first, then legacy email field
    let recipientEmail: string | null = null;

    if (contact) {
      const customContent = (contact.customContent as Record<string, unknown>) || {};
      const contactFields = customContent.contactFields as Array<{
        type: string;
        value: string;
        enabled: boolean;
      }> | undefined;

      if (contactFields && contactFields.length > 0) {
        const emailField = contactFields.find((f) => f.type === 'email' && f.enabled && f.value);
        if (emailField) {
          recipientEmail = emailField.value;
        }
      }

      if (!recipientEmail && contact.email) {
        recipientEmail = contact.email;
      }
    }

    if (!recipientEmail) {
      console.error('Contact form submission failed: No contact email configured');
      return NextResponse.json(
        { error: 'Contact form is not configured. Please try again later.' },
        { status: 503 }
      );
    }

    // Sanitize user input for HTML email
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    // Send email to the configured contact email
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Contact Form: ${subject}`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #374151; width: 100px;">Name:</td>
              <td style="padding: 8px 12px; color: #4b5563;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #374151;">Email:</td>
              <td style="padding: 8px 12px; color: #4b5563;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #374151;">Subject:</td>
              <td style="padding: 8px 12px; color: #4b5563;">${safeSubject}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #374151;">Message:</p>
            <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${safeMessage}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">This message was sent via the OneClickTag contact form.</p>
        </div>
      `,
      textContent: `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    if (!result.success) {
      console.error('Failed to send contact email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Contact form error:', msg);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }
}
