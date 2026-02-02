import { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getPlans, getSiteSettings } from '@/lib/server/api';
import { PlansContent } from './PlansContent';

// Revalidate every 5 minutes
export const revalidate = 300;

// Default plans for fallback
const defaultPlans = [
  {
    id: '1',
    name: 'Starter',
    description: 'Perfect for small businesses',
    price: 0,
    billingPeriod: 'month',
    features: ['1 Customer', '5 Trackings', 'Basic Support', 'GTM Integration'],
    isFeatured: false,
    ctaText: 'Join Waitlist',
    ctaUrl: null,
    order: 0,
  },
  {
    id: '2',
    name: 'Professional',
    description: 'For growing businesses',
    price: 49,
    billingPeriod: 'month',
    features: [
      '10 Customers',
      'Unlimited Trackings',
      'Priority Support',
      'GTM & Google Ads Integration',
      'Analytics Dashboard',
    ],
    isFeatured: true,
    ctaText: 'Join Waitlist',
    ctaUrl: null,
    order: 1,
  },
  {
    id: '3',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 199,
    billingPeriod: 'month',
    features: [
      'Unlimited Customers',
      'Unlimited Trackings',
      'Dedicated Support',
      'All Integrations',
      'Custom Features',
      'SLA Guarantee',
    ],
    isFeatured: false,
    ctaText: 'Contact Sales',
    ctaUrl: null,
    order: 2,
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: 'Pricing Plans | OneClickTag',
    description:
      'Choose the perfect plan for your conversion tracking needs. Simple, transparent pricing.',
    openGraph: {
      title: 'Pricing Plans | OneClickTag',
      description: 'Simple, transparent pricing for automated conversion tracking.',
      images: settings?.socialImageUrl ? [settings.socialImageUrl] : undefined,
    },
  };
}

export default async function PlansPage() {
  // Fetch plans server-side
  const dbPlans = await getPlans();

  const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';

  // Use database plans or fallback to defaults
  const plans = dbPlans.length > 0 ? dbPlans : defaultPlans;

  // FAQs
  const faqs = EARLY_ACCESS_MODE
    ? [
        {
          q: 'When will OneClickTag be available?',
          a: 'We are currently in early access mode and will launch soon. Join the waitlist to be notified when we go live.',
        },
        {
          q: 'How do I get early access?',
          a: 'Join our waitlist and we will notify you as soon as early access becomes available. Early adopters will get special pricing.',
        },
        {
          q: 'Will pricing change after launch?',
          a: 'Early access members will be grandfathered into special pricing. Join the waitlist to lock in the best rates.',
        },
        {
          q: 'Can I change plans later?',
          a: 'Yes! Once we launch, you can upgrade or downgrade your plan at any time.',
        },
        {
          q: 'What payment methods will you accept?',
          a: 'We will accept all major credit cards (Visa, Mastercard, American Express) and PayPal.',
        },
      ]
    : [
        {
          q: 'Can I change plans later?',
          a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we will prorate the difference.',
        },
        {
          q: 'What payment methods do you accept?',
          a: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal.',
        },
        {
          q: 'Is there a free trial?',
          a: 'Yes! All plans come with a 14-day free trial. No credit card required to start.',
        },
        {
          q: 'What happens after the trial ends?',
          a: 'After your trial, you will be charged for your selected plan. You can cancel anytime before the trial ends to avoid charges.',
        },
        {
          q: 'Can I cancel my subscription?',
          a: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
        },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Simple, Transparent
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Pricing
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {EARLY_ACCESS_MODE
            ? 'Preview our pricing plans. Join the waitlist to lock in early adopter rates.'
            : 'Choose the plan that fits your needs. All plans include a 14-day free trial.'}
        </p>
        <p className="text-sm text-gray-500">
          {EARLY_ACCESS_MODE
            ? 'Early access pricing - Limited spots available - Special rates for first users'
            : 'No credit card required - Cancel anytime - Upgrade or downgrade as needed'}
        </p>
      </div>

      {/* Plans Content (Client Component for interactivity) */}
      <PlansContent plans={plans} faqs={faqs} earlyAccessMode={EARLY_ACCESS_MODE} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
