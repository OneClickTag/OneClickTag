import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@oneclicktag.com' },
    update: {},
    create: {
      email: 'admin@oneclicktag.com',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      password: null, // Will use Firebase auth
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create content pages
  const aboutPage = await prisma.contentPage.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      slug: 'about',
      title: 'About OneClickTag',
      content: `# About OneClickTag

OneClickTag is a revolutionary SaaS platform that simplifies Google tracking setup for marketing professionals. Our mission is to make conversion tracking accessible to everyone, eliminating the complexity of manual tag management.

## Our Story

Founded by experienced marketers and developers, OneClickTag was born from frustration with the time-consuming process of setting up tracking tags. We knew there had to be a better way.

## What We Do

OneClickTag automates the entire tracking setup process:
- Automatic GTM container management
- One-click conversion tracking
- GA4 integration
- Google Ads sync

## Our Values

**Simplicity**: We believe powerful tools should be easy to use.

**Automation**: Let technology handle the tedious work.

**Transparency**: See exactly what's being created in your accounts.

**Support**: We're here to help you succeed.`,
      metaTitle: 'About Us - OneClickTag',
      metaDescription: 'Learn about OneClickTag and our mission to simplify conversion tracking for marketers everywhere.',
      isPublished: true,
      order: 1,
    },
  });

  const termsPage = await prisma.contentPage.upsert({
    where: { slug: 'terms' },
    update: {},
    create: {
      slug: 'terms',
      title: 'Terms of Service',
      content: `# Terms of Service

**Last Updated: January 2025**

## 1. Acceptance of Terms

By accessing and using OneClickTag, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License

Permission is granted to temporarily use OneClickTag for personal or commercial purposes. This is the grant of a license, not a transfer of title.

## 3. User Accounts

You are responsible for:
- Maintaining the security of your account
- All activities that occur under your account
- Ensuring your Google account has appropriate permissions

## 4. Service Description

OneClickTag provides:
- Automated Google Tag Manager setup
- Google Ads conversion tracking
- GA4 property management
- Technical support

## 5. Limitations

We reserve the right to:
- Modify or discontinue service with notice
- Refuse service to anyone
- Update these terms at any time

## 6. Data and Privacy

- We do not store your Google Ads data
- We only access APIs with your explicit permission
- See our Privacy Policy for details

## 7. Disclaimer

OneClickTag is provided "as is" without warranties of any kind.

## Contact

Questions about Terms? Contact us at legal@oneclicktag.com`,
      metaTitle: 'Terms of Service - OneClickTag',
      metaDescription: 'Terms and conditions for using OneClickTag services.',
      isPublished: true,
      order: 2,
    },
  });

  const privacyPage = await prisma.contentPage.upsert({
    where: { slug: 'privacy' },
    update: {},
    create: {
      slug: 'privacy',
      title: 'Privacy Policy',
      content: `# Privacy Policy

**Last Updated: January 2025**

## Introduction

OneClickTag ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.

## Information We Collect

### Account Information
- Email address
- Name
- Company name (optional)

### Google Integration Data
- Google account email
- GTM container IDs
- Google Ads account IDs
- GA4 property IDs

### Usage Data
- Tracking configurations you create
- API calls made to Google services
- Error logs for troubleshooting

## How We Use Your Information

We use your information to:
- Provide and maintain our service
- Create tags and tracking in your Google accounts
- Communicate with you about your account
- Improve our service
- Ensure security and prevent fraud

## Data Storage and Security

- All data is encrypted in transit (HTTPS/TLS)
- Passwords are hashed and never stored in plain text
- Database access is restricted and monitored
- Regular security audits performed

## Google API Data

- We use OAuth 2.0 for secure authorization
- We never store your Google password
- API tokens are encrypted at rest
- You can revoke access at any time

## Third-Party Services

We use:
- Firebase (Authentication)
- Vercel (Hosting)
- PostgreSQL (Database)

## Your Rights

You have the right to:
- Access your personal data
- Request data deletion
- Revoke Google API access
- Export your tracking configurations

## Data Retention

- Account data: Retained while account is active
- Tracking configs: Retained until manually deleted
- Logs: Retained for 90 days

## International Data Transfers

Our services are hosted in the United States. By using OneClickTag, you consent to the transfer of your information to the US.

## Children's Privacy

OneClickTag is not intended for users under 13 years of age. We do not knowingly collect information from children.

## Updates to This Policy

We may update this Privacy Policy periodically. Continued use of our service constitutes acceptance of changes.

## Contact Us

Privacy questions? Contact us at privacy@oneclicktag.com`,
      metaTitle: 'Privacy Policy - OneClickTag',
      metaDescription: 'How OneClickTag collects, uses, and protects your data.',
      isPublished: true,
      order: 3,
    },
  });

  console.log('✅ Created content pages:', aboutPage.slug, termsPage.slug, privacyPage.slug);

  // Create plans
  const starterPlan = await prisma.plan.upsert({
    where: { id: 'starter-plan-id' },
    update: {},
    create: {
      id: 'starter-plan-id',
      name: 'Starter',
      description: 'Perfect for small businesses and startups getting started with conversion tracking.',
      features: [
        '5 customers',
        '25 trackings per customer',
        'Basic GTM setup',
        'GA4 integration',
        'Google Ads sync',
        'Email support',
      ],
      price: 29,
      billingPeriod: 'MONTHLY',
      currency: 'USD',
      isActive: true,
      isFeatured: false,
      order: 1,
      ctaText: 'Start Free Trial',
      ctaUrl: '/register',
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { id: 'pro-plan-id' },
    update: {},
    create: {
      id: 'pro-plan-id',
      name: 'Professional',
      description: 'For growing businesses that need advanced tracking and priority support.',
      features: [
        '25 customers',
        'Unlimited trackings',
        'Advanced GTM features',
        'GA4 + Google Ads',
        'Custom events',
        'Priority email support',
        'Slack integration',
        'Team collaboration',
      ],
      price: 99,
      billingPeriod: 'MONTHLY',
      currency: 'USD',
      isActive: true,
      isFeatured: true,
      order: 2,
      ctaText: 'Start Free Trial',
      ctaUrl: '/register',
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { id: 'enterprise-plan-id' },
    update: {},
    create: {
      id: 'enterprise-plan-id',
      name: 'Enterprise',
      description: 'For agencies and large organizations with complex tracking needs.',
      features: [
        'Unlimited customers',
        'Unlimited trackings',
        'White-label options',
        'Dedicated account manager',
        'Custom integrations',
        '24/7 phone support',
        'SLA guarantee',
        'Advanced analytics',
        'API access',
      ],
      price: 299,
      billingPeriod: 'MONTHLY',
      currency: 'USD',
      isActive: true,
      isFeatured: false,
      order: 3,
      ctaText: 'Contact Sales',
      ctaUrl: '/contact',
    },
  });

  console.log('✅ Created plans:', starterPlan.name, proPlan.name, enterprisePlan.name);

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

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
