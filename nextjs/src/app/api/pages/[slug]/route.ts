import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Default content for each static page (same as admin)
const defaultPages: Record<string, { title: string; content: Record<string, unknown> }> = {
  about: {
    title: 'About Us',
    content: {
      hero: {
        badge: 'About OneClickTag',
        headline: 'Simplifying',
        headlineHighlight: 'Conversion Tracking',
        subtitle: "We're on a mission to make Google Tag Manager and conversion tracking accessible to everyone. No coding required, no headaches—just results.",
      },
      mission: {
        title: 'Our Mission',
        description: 'To empower businesses of all sizes with enterprise-level tracking capabilities. We believe that every business deserves access to accurate data and powerful insights, regardless of technical expertise or budget.',
      },
      features: [
        { icon: 'Zap', title: 'Lightning Fast Setup', description: 'Get your tracking up and running in minutes, not hours. No technical expertise required.' },
        { icon: 'Target', title: 'Precision Tracking', description: 'Accurate conversion tracking that helps you measure what matters most to your business.' },
        { icon: 'Users', title: 'Built for Teams', description: 'Collaborate seamlessly with your team members and stakeholders in real-time.' },
        { icon: 'TrendingUp', title: 'Data-Driven Growth', description: 'Make informed decisions with comprehensive analytics and actionable insights.' },
      ],
      values: [
        { title: 'Simplicity First', description: 'We believe powerful tools should be easy to use.' },
        { title: 'Customer Success', description: "Your growth is our success. We're here to help you win." },
        { title: 'Innovation', description: 'Constantly improving and adapting to the latest marketing trends.' },
        { title: 'Transparency', description: 'Clear pricing, honest communication, and no hidden surprises.' },
      ],
      story: {
        title: 'Our Story',
        paragraphs: [
          "OneClickTag was born from a simple frustration: setting up conversion tracking shouldn't require a computer science degree. Our founders, experienced marketers themselves, spent countless hours wrestling with Google Tag Manager configurations, only to realize that most of the process could be automated.",
          "We built OneClickTag to eliminate the complexity and technical barriers that prevent businesses from accessing crucial conversion data. What used to take hours of development time now takes just minutes with our intuitive platform.",
          "Today, we're proud to help thousands of businesses track their conversions accurately and make data-driven decisions with confidence. And we're just getting started.",
        ],
      },
      cta: {
        headline: 'Ready to Get Started?',
        subtitle: 'Join thousands of businesses already tracking their conversions with OneClickTag',
        primaryButton: { text: 'Start Free Trial', url: '/register' },
        secondaryButton: { text: 'Contact Us', url: '/contact' },
      },
    },
  },
  terms: {
    title: 'Terms of Service',
    content: {
      lastUpdated: 'January 1, 2025',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By accessing and using OneClickTag ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
        },
        {
          title: '2. Use License',
          content: 'Permission is granted to temporarily use OneClickTag for personal or commercial purposes. This is the grant of a license, not a transfer of title.',
          list: [
            'Modify or copy the materials',
            'Use the materials for any commercial purpose without proper licensing',
            'Attempt to decompile or reverse engineer any software contained on the platform',
            'Remove any copyright or other proprietary notations from the materials',
            'Transfer the materials to another person or "mirror" the materials on any other server',
          ],
        },
        {
          title: '3. User Accounts',
          content: 'When you create an account with us, you must provide accurate, complete, and current information at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.',
        },
        {
          title: '4. Billing and Payments',
          content: 'Paid subscriptions may be offered with different features and pricing. You will be billed in advance on a recurring and periodic basis. Billing cycles are set on a monthly or annual basis, depending on the type of subscription plan you select.',
        },
        {
          title: '5. Cancellation and Refunds',
          content: 'You may cancel your subscription at any time through your account settings. Your cancellation will take effect at the end of the current paid term. Refunds are provided on a case-by-case basis.',
        },
        {
          title: '6. Intellectual Property',
          content: 'The Service and its original content, features, and functionality are and will remain the exclusive property of OneClickTag and its licensors. The Service is protected by copyright, trademark, and other laws.',
        },
        {
          title: '7. Limitation of Liability',
          content: 'In no event shall OneClickTag, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.',
        },
        {
          title: '8. Changes to Terms',
          content: 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.',
        },
        {
          title: '9. Contact Information',
          content: 'If you have any questions about these Terms, please contact us.',
          contact: {
            name: 'OneClickTag Support',
            email: 'legal@oneclicktag.com',
            address: 'San Francisco, CA',
          },
        },
      ],
    },
  },
  privacy: {
    title: 'Privacy Policy',
    content: {
      lastUpdated: 'January 1, 2025',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.',
        },
        {
          title: '2. How We Use Your Information',
          content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.',
        },
        {
          title: '3. Information Sharing',
          content: 'We do not share your personal information with third parties except as described in this policy or with your consent.',
        },
        {
          title: '4. Data Security',
          content: 'We take reasonable measures to help protect your personal information from loss, theft, misuse, and unauthorized access.',
        },
        {
          title: '5. Your Rights',
          content: 'You have the right to access, update, or delete your personal information at any time through your account settings.',
        },
        {
          title: '6. Contact Us',
          content: 'If you have any questions about this Privacy Policy, please contact us.',
          contact: {
            name: 'OneClickTag Privacy Team',
            email: 'privacy@oneclicktag.com',
            address: 'San Francisco, CA',
          },
        },
      ],
    },
  },
};

// GET /api/pages/[slug] - Get public page content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Check if it's a valid page
    if (!defaultPages[slug]) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Try to get custom content from database
    const page = await prisma.landingPageContent.findUnique({
      where: { key: `page:${slug}` },
    });

    // If page exists and is active, return custom content
    if (page && page.isActive) {
      return NextResponse.json({
        slug,
        title: defaultPages[slug].title,
        content: page.content,
      });
    }

    // If page exists but is inactive, return 404
    if (page && !page.isActive) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Return default content
    return NextResponse.json({
      slug,
      title: defaultPages[slug].title,
      content: defaultPages[slug].content,
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
