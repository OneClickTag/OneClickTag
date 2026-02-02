import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// About page content in JSON format
const aboutContent = {
  hero: {
    badge: { icon: 'Sparkles', text: 'About OneClickTag' },
    headline: 'Built by Marketers,',
    headlineHighlight: 'For Marketers',
    subtitle: "We understand the pain of manual tracking setup. That's why we built OneClickTag - to give marketers their time back.",
    stats: [
      { value: '2024', label: 'Founded' },
      { value: '1,000+', label: 'Happy Users' },
      { value: '50K+', label: 'Tags Created' },
    ],
  },
  mission: {
    title: 'Our Story:',
    titleHighlight: 'Why We Exist',
    subtitle: 'The journey from frustration to innovation.',
    storyBlocks: [
      {
        id: '1',
        icon: 'Lightbulb',
        title: 'The Problem',
        description: "Marketers waste 30+ hours per month configuring GTM, Google Ads, and GA4 manually. It's tedious, error-prone, and takes time away from actual marketing.",
      },
      {
        id: '2',
        icon: 'Target',
        title: 'The Vision',
        description: 'We envisioned a world where setting up conversion tracking is as simple as a few clicks. No technical expertise required, no manual configuration.',
      },
      {
        id: '3',
        icon: 'Rocket',
        title: 'The Solution',
        description: 'OneClickTag was born - an intelligent platform that automates your entire tracking setup. What used to take hours now takes minutes.',
      },
    ],
  },
  values: {
    title: 'Our Values:',
    titleHighlight: 'What Drives Us',
    subtitle: 'The principles that guide everything we do.',
    values: [
      {
        id: '1',
        icon: 'Users',
        color: 'from-blue-500 to-blue-600',
        title: 'Customer First',
        description: 'Every decision starts with our users. We build what marketers actually need.',
      },
      {
        id: '2',
        icon: 'Zap',
        color: 'from-purple-500 to-purple-600',
        title: 'Simplicity',
        description: "Complex problems deserve simple solutions. We hide complexity so you don't have to deal with it.",
      },
      {
        id: '3',
        icon: 'Shield',
        color: 'from-green-500 to-green-600',
        title: 'Reliability',
        description: 'Your tracking data matters. We ensure accuracy and uptime you can depend on.',
      },
      {
        id: '4',
        icon: 'Rocket',
        color: 'from-orange-500 to-orange-600',
        title: 'Innovation',
        description: 'We continuously evolve with the marketing landscape to keep you ahead.',
      },
    ],
  },
  team: {
    title: 'Meet the',
    titleHighlight: 'Team',
    subtitle: 'The people behind OneClickTag.',
    showSection: false,
    teamMembers: [],
  },
  cta: {
    headline: 'Ready to Get Started?',
    subtitle: 'Join thousands of marketers already saving hours on tracking setup.',
    primaryCTA: { text: 'Start Free Trial', url: '/register' },
    secondaryCTA: { text: 'Contact Us', url: '/contact' },
  },
};

// Terms of Service content in JSON format
const termsContent = {
  effectiveDate: '2024-01-01',
  lastUpdated: '2024-01-01',
  introduction: 'Welcome to OneClickTag. By accessing or using our service, you agree to be bound by these Terms of Service. Please read them carefully before using our platform.',
  sections: [
    {
      id: '1',
      title: 'Acceptance of Terms',
      content: 'By accessing or using the OneClickTag service, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.',
    },
    {
      id: '2',
      title: 'Use of Service',
      content: 'You may use our service only for lawful purposes and in accordance with these Terms. You agree not to use the service:\n\n- In any way that violates any applicable federal, state, local, or international law\n- To transmit any advertising or promotional material without our prior written consent\n- To impersonate or attempt to impersonate the Company, a Company employee, or any other person',
    },
    {
      id: '3',
      title: 'User Accounts',
      content: 'When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding your password and for any activities or actions under your account. You agree to notify us immediately of any unauthorized access or use of your account.',
    },
    {
      id: '4',
      title: 'Intellectual Property',
      content: 'The service and its original content, features, and functionality are and will remain the exclusive property of OneClickTag and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.',
    },
    {
      id: '5',
      title: 'Google API Services',
      content: "OneClickTag's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. We only access the minimum data necessary to provide our services.",
    },
    {
      id: '6',
      title: 'Termination',
      content: 'We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will immediately cease.',
    },
    {
      id: '7',
      title: 'Limitation of Liability',
      content: 'In no event shall OneClickTag, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.',
    },
    {
      id: '8',
      title: 'Changes to Terms',
      content: 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.',
    },
  ],
  contactInfo: 'If you have any questions about these Terms, please contact us at support@oneclicktag.com',
};

// Privacy Policy content in JSON format
const privacyContent = {
  effectiveDate: '2024-01-01',
  lastUpdated: '2024-01-01',
  introduction: 'At OneClickTag, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.',
  sections: [
    {
      id: '1',
      title: 'Information We Collect',
      content: 'We collect information you provide directly to us, such as when you:\n\n- Create an account\n- Connect your Google accounts\n- Use our tracking services\n- Contact customer support\n- Subscribe to newsletters\n\nThis may include your name, email address, and information about your Google Tag Manager and Google Ads accounts.',
    },
    {
      id: '2',
      title: 'How We Use Your Information',
      content: 'We use the information we collect to:\n\n- Provide, maintain, and improve our services\n- Process transactions and send related information\n- Send technical notices, updates, and support messages\n- Respond to your comments, questions, and requests\n- Monitor and analyze trends, usage, and activities',
    },
    {
      id: '3',
      title: 'Google API Data',
      content: "We access your Google Tag Manager and Google Ads data only to provide our tracking automation services. We do not:\n\n- Sell your Google data to third parties\n- Use your data for advertising purposes\n- Store more data than necessary to provide our services\n\nOur use of Google APIs complies with the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).",
    },
    {
      id: '4',
      title: 'Information Sharing',
      content: 'We do not share your personal information with third parties except:\n\n- With your consent\n- To comply with legal obligations\n- To protect our rights and prevent fraud\n- With service providers who assist in our operations (under strict confidentiality agreements)',
    },
    {
      id: '5',
      title: 'Data Security',
      content: 'We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.',
    },
    {
      id: '6',
      title: 'Data Retention',
      content: 'We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including to satisfy any legal, accounting, or reporting requirements. When you delete your account, we will delete or anonymize your data within 30 days.',
    },
    {
      id: '7',
      title: 'Your Rights',
      content: 'You have the right to:\n\n- Access your personal information\n- Correct inaccurate data\n- Request deletion of your data\n- Export your data in a portable format\n- Opt-out of marketing communications\n\nTo exercise these rights, please contact us at privacy@oneclicktag.com',
    },
    {
      id: '8',
      title: 'Cookies and Tracking',
      content: 'We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.',
    },
    {
      id: '9',
      title: 'Changes to This Policy',
      content: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.',
    },
  ],
  contactInfo: 'If you have any questions about this Privacy Policy, please contact us at privacy@oneclicktag.com',
};

async function seedStaticPages() {
  console.log('Seeding static pages...');

  // Upsert About page
  await prisma.contentPage.upsert({
    where: { slug: 'about' },
    update: {
      content: JSON.stringify(aboutContent, null, 2),
      isPublished: true,
    },
    create: {
      slug: 'about',
      title: 'About OneClickTag',
      content: JSON.stringify(aboutContent, null, 2),
      metaTitle: 'About Us | OneClickTag - Marketing Automation Made Simple',
      metaDescription: 'Learn about OneClickTag, the platform that automates Google Tag Manager and conversion tracking setup for marketers.',
      isPublished: true,
      order: 0,
    },
  });
  console.log('✓ About page seeded');

  // Upsert Terms page
  await prisma.contentPage.upsert({
    where: { slug: 'terms' },
    update: {
      content: JSON.stringify(termsContent, null, 2),
      isPublished: true,
    },
    create: {
      slug: 'terms',
      title: 'Terms of Service',
      content: JSON.stringify(termsContent, null, 2),
      metaTitle: 'Terms of Service | OneClickTag',
      metaDescription: 'Read the Terms of Service for OneClickTag. Understand your rights and responsibilities when using our platform.',
      isPublished: true,
      order: 1,
    },
  });
  console.log('✓ Terms page seeded');

  // Upsert Privacy page
  await prisma.contentPage.upsert({
    where: { slug: 'privacy' },
    update: {
      content: JSON.stringify(privacyContent, null, 2),
      isPublished: true,
    },
    create: {
      slug: 'privacy',
      title: 'Privacy Policy',
      content: JSON.stringify(privacyContent, null, 2),
      metaTitle: 'Privacy Policy | OneClickTag',
      metaDescription: 'Learn how OneClickTag collects, uses, and protects your personal information. Read our Privacy Policy.',
      isPublished: true,
      order: 2,
    },
  });
  console.log('✓ Privacy page seeded');

  console.log('\nAll static pages seeded successfully!');
}

seedStaticPages()
  .catch((e) => {
    console.error('Error seeding static pages:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
