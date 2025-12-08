import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCustomization() {
  console.log('🌱 Seeding customization data...');

  // Seed Landing Page Content
  const heroContent = await prisma.landingPageContent.upsert({
    where: { key: 'hero' },
    update: {},
    create: {
      key: 'hero',
      content: {
        badge: {
          icon: 'Zap',
          text: 'Automated Conversion Tracking',
        },
        headline: 'Setup Google Tracking',
        headlineHighlight: 'In One Click',
        subtitle: 'Stop wasting hours on manual tag setup. OneClickTag automatically creates GTM tags, Google Ads conversions, and GA4 events in seconds.',
        benefits: [
          'No coding required',
          'GTM + Google Ads + GA4',
          'Setup in 2 minutes',
        ],
        primaryCTA: {
          text: 'Start Free Trial',
          url: '/register',
        },
        secondaryCTA: {
          text: 'View Pricing',
          url: '/plans',
        },
        trustIndicators: 'No credit card required • Cancel anytime • 14-day free trial',
        demoVideo: {
          enabled: true,
          thumbnail: null,
          stats: [
            { label: 'Setup Time', value: '2 min', icon: 'Zap' },
          ],
        },
      },
      isActive: true,
    },
  });

  const featuresContent = await prisma.landingPageContent.upsert({
    where: { key: 'features' },
    update: {},
    create: {
      key: 'features',
      content: {
        title: 'Everything You Need',
        titleHighlight: 'In One Platform',
        subtitle: 'Stop juggling multiple tools. OneClickTag brings all your tracking needs together in one simple interface.',
        features: [
          {
            icon: 'Tag',
            title: 'Google Tag Manager',
            description: 'Automatically create tags, triggers, and variables in your GTM container. No manual setup needed.',
            color: 'from-blue-500 to-blue-600',
          },
          {
            icon: 'Target',
            title: 'Google Ads Integration',
            description: 'Sync conversion actions to Google Ads instantly. Track ROI and optimize campaigns effortlessly.',
            color: 'from-green-500 to-green-600',
          },
          {
            icon: 'BarChart3',
            title: 'GA4 Events',
            description: 'Create custom GA4 events with proper parameters. Get accurate analytics data from day one.',
            color: 'from-purple-500 to-purple-600',
          },
          {
            icon: 'Zap',
            title: 'Lightning Fast',
            description: 'What takes 30 minutes manually takes 2 minutes with OneClickTag. Save time, reduce errors.',
            color: 'from-yellow-500 to-orange-600',
          },
          {
            icon: 'Shield',
            title: 'Secure & Reliable',
            description: 'OAuth 2.0 authentication, encrypted data storage, and automatic token refresh. Your data is safe.',
            color: 'from-red-500 to-pink-600',
          },
          {
            icon: 'Globe',
            title: 'Multi-Customer',
            description: 'Manage tracking for multiple clients from one dashboard. Perfect for agencies and consultants.',
            color: 'from-indigo-500 to-indigo-600',
          },
        ],
        bottomCTA: {
          text: 'Ready to simplify your tracking workflow?',
          linkText: 'Get started for free',
          linkUrl: '/register',
        },
      },
      isActive: true,
    },
  });

  const ctaContent = await prisma.landingPageContent.upsert({
    where: { key: 'cta' },
    update: {},
    create: {
      key: 'cta',
      content: {
        badge: {
          icon: 'Sparkles',
          text: 'Limited Time Offer',
        },
        headline: 'Ready to Transform Your',
        headlineSecondLine: 'Tracking Workflow?',
        subtitle: 'Join 1,000+ marketers who are saving hours every week with automated tracking setup. Start your 14-day free trial today—no credit card required.',
        features: [
          '14-day free trial',
          'No credit card required',
          'Cancel anytime',
          'Setup in 2 minutes',
        ],
        primaryCTA: {
          text: 'Start Free Trial',
          url: '/register',
        },
        secondaryCTA: {
          text: 'View Pricing',
          url: '/plans',
        },
        trustBadge: '🔒 Secure OAuth connection • GDPR compliant • SOC 2 certified',
        testimonial: {
          quote: "OneClickTag is the tool I wish I had 5 years ago. It's saved our team countless hours and eliminated tracking errors completely.",
          author: {
            name: 'James Davis',
            role: 'Head of Marketing, TechCorp',
            initials: 'JD',
          },
        },
      },
      isActive: true,
    },
  });

  console.log('✅ Created landing page content:', heroContent.key, featuresContent.key, ctaContent.key);

  // Seed Site Settings
  const siteSettings = await prisma.siteSettings.upsert({
    where: { key: 'global' },
    update: {},
    create: {
      key: 'global',
      brandName: 'OneClickTag',
      logoUrl: null,
      faviconUrl: null,
      heroBackgroundUrl: null,
      brandColors: {
        primary: '#2563eb', // blue-600
        secondary: '#9333ea', // purple-600
        accent: '#ec4899', // pink-600
      },
      metaTitle: 'OneClickTag - Automated Google Tracking Setup',
      metaDescription: 'Setup Google Tag Manager, Google Ads conversions, and GA4 events in seconds. No coding required.',
      socialImageUrl: null,
      customCSS: null,
      customJS: null,
    },
  });

  console.log('✅ Created site settings');

  // Seed Contact Page Content
  const contactContent = await prisma.contactPageContent.upsert({
    where: { id: 'default-contact' },
    update: {},
    create: {
      id: 'default-contact',
      email: 'hello@oneclicktag.com',
      phone: '+1 (555) 123-4567',
      address: 'San Francisco, CA',
      businessHours: 'Mon-Fri: 9AM-6PM PST',
      socialLinks: [
        { platform: 'Twitter', url: 'https://twitter.com/oneclicktag' },
        { platform: 'LinkedIn', url: 'https://linkedin.com/company/oneclicktag' },
        { platform: 'GitHub', url: 'https://github.com/oneclicktag' },
      ],
      faqs: [
        {
          question: 'What is your response time?',
          answer: 'We typically respond to all inquiries within 24 hours during business days.',
        },
        {
          question: 'Do you offer phone support?',
          answer: 'Yes! Phone support is available for all paid plans. Contact us to schedule a call.',
        },
        {
          question: 'Can I schedule a demo?',
          answer: 'Absolutely! Choose "Sales Question" as your subject and mention demo in your message.',
        },
        {
          question: 'How can I report a technical issue?',
          answer: 'Select "Technical Support" as your subject and provide as many details as possible about the issue.',
        },
      ],
      formSettings: {
        enableForm: true,
        emailTo: 'hello@oneclicktag.com',
        successMessage: 'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        subjects: [
          'General Inquiry',
          'Sales Question',
          'Technical Support',
          'Partnership Opportunity',
          'Other',
        ],
      },
      isActive: true,
    },
  });

  console.log('✅ Created contact page content');

  console.log('🎉 Customization seeding complete!');
}

seedCustomization()
  .catch((e) => {
    console.error('❌ Customization seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
