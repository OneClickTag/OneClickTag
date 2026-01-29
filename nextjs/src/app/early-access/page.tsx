'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EarlyAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    purpose: '',
    acceptedTerms: false,
    marketingConsent: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Get UTM parameters from URL
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source') || undefined;
      const utmMedium = params.get('utm_medium') || undefined;
      const utmCampaign = params.get('utm_campaign') || undefined;

      // Get session ID from localStorage or create new one
      let sessionId = localStorage.getItem('oct_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('oct_session_id', sessionId);
      }

      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          purpose: formData.purpose,
          acceptedTerms: formData.acceptedTerms,
          marketingConsent: formData.marketingConsent,
          source: 'early-access',
          utmSource,
          utmMedium,
          utmCampaign,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setError(
            'This email is already registered. Check your inbox for the questionnaire link.'
          );
        } else {
          setError(data.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
        return;
      }

      const lead = await response.json();

      // Navigate to questionnaire
      router.push(`/early-access/questionnaire?leadId=${lead.id}`);
    } catch (err: any) {
      console.error('Failed to submit lead:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Get Early Access</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Join the Waitlist
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Be among the first to experience OneClickTag when we launch.
            We&apos;re currently in final development and will notify you as soon
            as we&apos;re ready.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="mt-2"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="mt-2"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="purpose">How do you plan to use OneClickTag?</Label>
              <textarea
                id="purpose"
                name="purpose"
                required
                value={formData.purpose}
                onChange={handleChange}
                placeholder="I manage conversion tracking for multiple e-commerce clients and need an easier way to set up tags..."
                className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={4}
                disabled={loading}
              />
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="acceptedTerms"
                  name="acceptedTerms"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
                <label htmlFor="acceptedTerms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                  <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Marketing Consent Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="marketingConsent"
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, marketingConsent: e.target.checked }))}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor="marketingConsent" className="text-sm text-gray-600">
                  I agree to receive marketing communications and product updates from OneClickTag.
                  You can unsubscribe at any time.
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </form>

          {/* Trust Indicators */}
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              We respect your privacy. No spam, ever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
