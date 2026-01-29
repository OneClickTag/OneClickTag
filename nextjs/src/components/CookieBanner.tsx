'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

const COOKIE_CONSENT_KEY = 'oct_cookie_consent';
const CONSENT_EXPIRY_DAYS = 365;

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  useEffect(() => {
    // Check if user has already consented
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        // Check if consent has expired
        const expiryTime = parsed.timestamp + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() < expiryTime) {
          setPreferences(parsed);
          return; // Don't show banner if valid consent exists
        }
      } catch {
        // Invalid stored data, show banner
      }
    }
    // Small delay to prevent flash on page load
    const timer = setTimeout(() => setShowBanner(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    const withTimestamp = { ...prefs, timestamp: Date.now() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(withTimestamp));
    setPreferences(withTimestamp);
    setShowBanner(false);

    // Trigger analytics/marketing scripts based on consent
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: withTimestamp }));
    }
  };

  const handleAcceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: 0,
    });
  };

  const handleRejectAll = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: 0,
    });
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full flex-shrink-0">
            <Cookie className="w-6 h-6 text-blue-600" />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  We value your privacy
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
              <button
                onClick={handleRejectAll}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customize Section */}
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              {showCustomize ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Customize preferences
            </button>

            {showCustomize && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                {/* Necessary Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Strictly Necessary</p>
                    <p className="text-xs text-gray-500">Required for the website to function properly</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-5 h-5 rounded border-gray-300 text-blue-600"
                  />
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Analytics & Performance</p>
                    <p className="text-xs text-gray-500">Help us understand how visitors interact with our website</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Marketing</p>
                    <p className="text-xs text-gray-500">Used to deliver personalized ads and track campaigns</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleAcceptAll}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Accept All
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="border-gray-300"
              >
                Reject All
              </Button>
              {showCustomize && (
                <Button
                  onClick={handleSavePreferences}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Save Preferences
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
