import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding cookie consent banner...');

  // Get first tenant or create one
  let tenant = await prisma.tenant.findFirst();

  if (!tenant) {
    console.log('No tenants found, creating default tenant...');
    tenant = await prisma.tenant.create({
      data: {
        id: 'default-tenant',
        name: 'Default Organization',
        plan: 'FREE',
        isActive: true,
      },
    });
    console.log('✅ Created tenant:', tenant.id);
  } else {
    console.log('Using existing tenant:', tenant.id);
  }

  // Check if banner already exists for this tenant
  const existing = await prisma.cookieConsentBanner.findFirst({
    where: { tenantId: tenant.id },
  });

  if (existing) {
    console.log('Banner already exists for tenant:', existing.id);
    return;
  }

  // Create default banner
  const banner = await prisma.cookieConsentBanner.create({
    data: {
      tenantId: tenant.id,
      headingText: 'We value your privacy',
      bodyText: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      acceptAllButtonText: 'Accept All',
      rejectAllButtonText: 'Reject All',
      customizeButtonText: 'Customize',
      savePreferencesText: 'Save Preferences',
      position: 'bottom',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      acceptButtonColor: '#10b981',
      rejectButtonColor: '#ef4444',
      customizeButtonColor: '#6b7280',
      consentExpiryDays: 365,
      showOnEveryPage: true,
      blockCookiesUntilConsent: true,
      privacyPolicyUrl: '/privacy',
      cookiePolicyUrl: '/cookie-policy',
      isActive: true,
    },
  });

  console.log('✅ Created default banner:', banner.id);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding banner:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
