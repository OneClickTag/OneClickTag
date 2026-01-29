'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/auth-provider';
import { Check, Star, Loader2 } from 'lucide-react';

const EARLY_ACCESS_MODE = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === 'true';
const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN'];

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: string;
  features: string[];
  isFeatured: boolean;
  ctaText: string;
  ctaUrl?: string;
}

export default function PlansPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user && ALLOWED_ROLES.includes(user.role);

  // Redirect to early-access page when in early access mode (unless admin)
  useEffect(() => {
    if (EARLY_ACCESS_MODE && !authLoading && !isAdmin) {
      router.replace('/early-access');
    }
  }, [router, authLoading, isAdmin]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/public/plans');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const parsedPlans = data.map((plan: any) => ({
              ...plan,
              features:
                typeof plan.features === 'string'
                  ? JSON.parse(plan.features)
                  : Array.isArray(plan.features)
                  ? plan.features
                  : [],
            }));
            setPlans(parsedPlans);
          }
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        // Set default plans on error
        setPlans([
          {
            id: '1',
            name: 'Starter',
            description: 'Perfect for small businesses',
            price: 0,
            billingPeriod: 'month',
            features: [
              '1 Customer',
              '5 Trackings',
              'Basic Support',
              'GTM Integration',
            ],
            isFeatured: false,
            ctaText: EARLY_ACCESS_MODE ? 'Join Waitlist' : 'Get Started',
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
            ctaText: EARLY_ACCESS_MODE ? 'Join Waitlist' : 'Start Free Trial',
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
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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

  // Show loading while checking auth or redirecting in early access mode (non-admins)
  if (EARLY_ACCESS_MODE && (authLoading || !isAdmin)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{authLoading ? 'Loading...' : 'Redirecting...'}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

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

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-md lg:max-w-none mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative ${
                plan.isFeatured ? 'lg:scale-105 lg:z-10' : ''
              }`}
            >
              {/* Featured Badge */}
              {plan.isFeatured && (
                <div className="absolute -top-5 left-0 right-0 flex justify-center">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              <div
                className={`h-full bg-white rounded-2xl border-2 ${
                  plan.isFeatured
                    ? 'border-blue-600 shadow-xl'
                    : 'border-gray-200 shadow-lg'
                } p-8 flex flex-col hover:shadow-2xl transition-shadow duration-300`}
              >
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">
                      /{plan.billingPeriod.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link href={plan.ctaUrl || (EARLY_ACCESS_MODE ? '/early-access' : '/register')} className="w-full mb-6">
                  <Button
                    className={`w-full ${
                      plan.isFeatured
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : ''
                    }`}
                    variant={plan.isFeatured ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.ctaText}
                  </Button>
                </Link>

                {/* Features List */}
                <div className="space-y-3 pt-6 border-t border-gray-200 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-start space-x-3"
                    >
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Still have questions?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
