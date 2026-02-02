import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Check, Star, ArrowLeft } from 'lucide-react';
import { publicService, Plan } from '@/lib/api/services';

export function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await publicService.getPlans();
        console.log('💳 Public plans received:', data);
        console.log('💳 Is array?', Array.isArray(data));

        // Handle different response formats
        if (Array.isArray(data)) {
          // Parse features if they're JSON strings
          const parsedPlans = data.map((plan: any) => ({
            ...plan,
            features: typeof plan.features === 'string'
              ? JSON.parse(plan.features)
              : Array.isArray(plan.features)
              ? plan.features
              : []
          }));
          setPlans(parsedPlans);
        } else if (data && typeof data === 'object' && 'data' in data) {
          // Handle wrapped response
          const wrapped = data as any;
          const plans = Array.isArray(wrapped.data) ? wrapped.data : [];
          const parsedPlans = plans.map((plan: any) => ({
            ...plan,
            features: typeof plan.features === 'string'
              ? JSON.parse(plan.features)
              : Array.isArray(plan.features)
              ? plan.features
              : []
          }));
          setPlans(parsedPlans);
        } else {
          console.warn('Unexpected plans data format:', data);
          setPlans([]);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Hero skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="animate-pulse">
            <div className="h-14 bg-gray-200 rounded-lg w-2/3 mx-auto mb-4"></div>
            <div className="h-14 bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg w-1/3 mx-auto mb-6"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
          </div>
        </div>

        {/* Pricing cards skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-gray-200 p-8 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-full mb-6"></div>
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                      <div className="h-4 bg-gray-200 rounded flex-1"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Simple, Transparent
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
          <p className="text-sm text-gray-500">
            No credit card required • Cancel anytime • Upgrade or downgrade as needed
          </p>
        </motion.div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${
                plan.isFeatured ? 'md:scale-105 md:z-10' : ''
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
                <p className="text-gray-600 mb-6">
                  {plan.description}
                </p>

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
                <Button
                  asChild
                  className={`w-full mb-6 ${
                    plan.isFeatured
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : ''
                  }`}
                  variant={plan.isFeatured ? 'default' : 'outline'}
                  size="lg"
                >
                  <Link to={plan.ctaUrl || '/register'}>{plan.ctaText}</Link>
                </Button>

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
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {[
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
          ].map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600">{faq.a}</p>
            </motion.div>
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
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-white text-blue-600 hover:bg-gray-100 border-none"
          >
            <Link to="/contact">Contact Sales</Link>
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
