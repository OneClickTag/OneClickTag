'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';

function EarlyAccessContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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
          turnstileToken,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-2 md:p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          {/* Header Section */}
          <div className="text-center mb-6">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Limited Early Access</span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Set Up Conversion Tracking <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                in Minutes, Not Hours
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto">
              Join marketers saving hours on GTM setup. Get notified when we launch and receive exclusive early-bird pricing.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="mt-1 bg-white text-gray-900"
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
                className="mt-1 bg-white text-gray-900"
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
                placeholder="I manage conversion tracking for multiple e-commerce clients..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white text-gray-900 text-sm"
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="acceptedTerms"
                  checked={formData.acceptedTerms}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, acceptedTerms: checked === true }))}
                  disabled={loading}
                  required
                  className="mt-0.5"
                />
                <label htmlFor="acceptedTerms" className="text-xs text-gray-600 cursor-pointer">
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
              <div className="flex items-start gap-2">
                <Checkbox
                  id="marketingConsent"
                  checked={formData.marketingConsent}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, marketingConsent: checked === true }))}
                  disabled={loading}
                  className="mt-0.5"
                />
                <label htmlFor="marketingConsent" className="text-xs text-gray-600 cursor-pointer">
                  I agree to receive marketing communications from OneClickTag.
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                onSuccess={setTurnstileToken}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
                options={{ size: 'invisible' }}
              />
            )}

            <Button
              type="submit"
              size="default"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </form>

          {/* Trust Indicators */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              We respect your privacy. No spam, ever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EarlyAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <EarlyAccessContent />
    </Suspense>
  );
}
