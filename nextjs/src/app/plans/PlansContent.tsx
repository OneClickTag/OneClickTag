'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billingPeriod: string;
  features: string[];
  isFeatured: boolean;
  ctaText: string;
  ctaUrl: string | null;
}

interface FAQ {
  q: string;
  a: string;
}

interface PlansContentProps {
  plans: Plan[];
  faqs: FAQ[];
  earlyAccessMode: boolean;
}

export function PlansContent({ plans, faqs, earlyAccessMode }: PlansContentProps) {
  return (
    <>
      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-md lg:max-w-none mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative ${plan.isFeatured ? 'lg:scale-105 lg:z-10' : ''}`}
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                {/* Description */}
                <p className="text-gray-600 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-2">
                      /{plan.billingPeriod.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  href={
                    earlyAccessMode && plan.ctaText !== 'Contact Sales'
                      ? '/early-access'
                      : plan.ctaUrl || (plan.ctaText === 'Contact Sales' ? '/contact' : '/register')
                  }
                  className="w-full mb-6"
                >
                  <Button
                    className={`w-full ${
                      plan.isFeatured
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : ''
                    }`}
                    variant={plan.isFeatured ? 'default' : 'outline'}
                    size="lg"
                  >
                    {earlyAccessMode && plan.ctaText !== 'Contact Sales'
                      ? 'Join Waitlist'
                      : plan.ctaText}
                  </Button>
                </Link>

                {/* Features List */}
                <div className="space-y-3 pt-6 border-t border-gray-200 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
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
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
