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
