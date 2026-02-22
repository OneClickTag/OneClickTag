'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react';
import { useCookieBannerData } from '@/hooks/use-public-data';

interface CookieItem {
  id: string;
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  type?: string;
}

interface CookieCategoryData {
  id: string;
  name: string;
  description: string;
  category: 'NECESSARY' | 'ANALYTICS' | 'MARKETING';
  isRequired: boolean;
  cookies: CookieItem[];
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

interface BannerSettings {
  isActive: boolean;
  headingText: string;
  bodyText: string;
  acceptAllButtonText: string;
  rejectAllButtonText: string;
  customizeButtonText: string;
  savePreferencesText: string;
  position: string;
  backgroundColor: string;
  textColor: string;
  acceptButtonColor: string;
  rejectButtonColor: string;
  customizeButtonColor: string;
  consentExpiryDays: number;
  showOnEveryPage: boolean;
  blockCookiesUntilConsent: boolean;
  privacyPolicyUrl: string;
  cookiePolicyUrl: string;
}

interface CookieBannerData {
  tenantId: string;
  banner: BannerSettings;
  categories: CookieCategoryData[];
}

const COOKIE_CONSENT_KEY = 'oct_cookie_consent';

// Default settings used as fallback
const defaultSettings: BannerSettings = {
  isActive: true,
  headingText: 'We value your privacy',
  bodyText: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
  acceptAllButtonText: 'Accept All',
  rejectAllButtonText: 'Reject All',
  customizeButtonText: 'Customize',
  savePreferencesText: 'Save Preferences',
  position: 'bottom',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  acceptButtonColor: '#3b82f6',
  rejectButtonColor: '#6b7280',
  customizeButtonColor: '#6b7280',
  consentExpiryDays: 365,
  showOnEveryPage: false,
  blockCookiesUntilConsent: true,
  privacyPolicyUrl: '/privacy',
  cookiePolicyUrl: '/cookie-policy',
};

// Map category enum to preference key
const categoryToPreferenceKey: Record<string, keyof Omit<CookiePreferences, 'timestamp'>> = {
  NECESSARY: 'necessary',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
};

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [settings, setSettings] = useState<BannerSettings>(defaultSettings);
  const [categories, setCategories] = useState<CookieCategoryData[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  // Fetch banner settings and categories from the database (React Query)
  const { data: bannerData, isLoading } = useCookieBannerData();

  // Sync fetched data into local state when it arrives
  useEffect(() => {
    if (bannerData) {
      setSettings(bannerData.banner);
      setCategories(bannerData.categories || []);
      setTenantId(bannerData.tenantId);
    }
  }, [bannerData]);

  // Check consent and show banner
  useEffect(() => {
    if (isLoading) return;

    // Don't show banner if it's disabled
    if (!settings.isActive) {
      return;
    }

    // Check if user has already consented
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        // Check if consent has expired using settings from DB
        const expiryTime = parsed.timestamp + settings.consentExpiryDays * 24 * 60 * 60 * 1000;
        if (Date.now() < expiryTime) {
          setPreferences(parsed);
          return; // Don't show banner if valid consent exists
        }
      } catch {
        // Invalid stored data, show banner
      }
    }

    // Small delay to prevent flash on page load
    const timer = setTimeout(() => {
      setShowBanner(true);
      // Trigger slide-up animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoading, settings.isActive, settings.consentExpiryDays]);

  // Listen for "Cookie Settings" footer link to reopen the banner
  useEffect(() => {
    const handleOpenSettings = () => {
      // Restore saved preferences so toggles reflect current state
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as CookiePreferences;
          setPreferences(parsed);
        } catch {
          // ignore
        }
      }
      setShowBanner(true);
      setShowCustomize(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
    };

    window.addEventListener('openCookieSettings', handleOpenSettings);
    return () => window.removeEventListener('openCookieSettings', handleOpenSettings);
  }, []);

  const savePreferences = async (prefs: CookiePreferences) => {
    const withTimestamp = { ...prefs, timestamp: Date.now() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(withTimestamp));
    setPreferences(withTimestamp);

    // Push Google Consent Mode V2 update
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      const consentState = {
        analytics_storage: prefs.analytics ? 'granted' : 'denied',
        ad_storage: prefs.marketing ? 'granted' : 'denied',
        ad_user_data: prefs.marketing ? 'granted' : 'denied',
        ad_personalization: prefs.marketing ? 'granted' : 'denied',
      } as const;

      window.gtag('consent', 'update', consentState);

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'consent_updated',
        ...consentState,
      });
    }

    // Animate out before hiding
    setIsVisible(false);
    setTimeout(() => {
      setShowBanner(false);
      setShowCustomize(false);
    }, 300);

    // Record consent to backend if we have tenant info
    if (tenantId) {
      try {
        // Generate anonymous ID for tracking
        let anonymousId = localStorage.getItem('oct_anonymous_id');
        if (!anonymousId) {
          anonymousId = crypto.randomUUID();
          localStorage.setItem('oct_anonymous_id', anonymousId);
        }

        await fetch('/api/public/cookie-consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            anonymousId,
            necessaryCookies: prefs.necessary,
            analyticsCookies: prefs.analytics,
            marketingCookies: prefs.marketing,
          }),
        });
      } catch (error) {
        console.error('Failed to record consent:', error);
      }
    }

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

  const toggleCategoryPreference = (category: string) => {
    const key = categoryToPreferenceKey[category];
    if (key && key !== 'necessary') {
      setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  if (!showBanner || isLoading) return null;

  // Sort categories: NECESSARY first, then rest
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.category === 'NECESSARY') return -1;
    if (b.category === 'NECESSARY') return 1;
    return 0;
  });

  const hasCategories = sortedCategories.length > 0;

  // Determine position classes
  const positionClasses = settings.position === 'top'
    ? 'top-0 border-b'
    : settings.position === 'center'
    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl mx-4 rounded-lg border'
    : 'bottom-0 border-t';

  const animationClasses = settings.position === 'top'
    ? (isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0')
    : settings.position === 'center'
    ? (isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0')
    : (isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0');

  return (
    <div
      className={`fixed ${positionClasses} ${settings.position !== 'center' ? 'left-0 right-0' : ''} z-50 p-4 border-gray-200 shadow-lg transform transition-all duration-300 ease-out ${animationClasses}`}
      style={{ backgroundColor: settings.backgroundColor }}
    >
      <div className={settings.position === 'center' ? '' : 'max-w-7xl mx-auto'}>
        <div className="flex items-start gap-4">
          <div
            className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0"
            style={{ backgroundColor: `${settings.acceptButtonColor}20` }}
          >
            <Cookie className="w-6 h-6" style={{ color: settings.acceptButtonColor }} />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  className="text-lg font-semibold mb-1"
                  style={{ color: settings.textColor }}
                >
                  {settings.headingText}
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: settings.textColor, opacity: 0.8 }}
                >
                  {settings.bodyText}{' '}
                  <Link
                    href={settings.privacyPolicyUrl}
                    className="hover:underline"
                    style={{ color: settings.acceptButtonColor }}
                  >
                    Privacy Policy
                  </Link>
                  {' | '}
                  <Link
                    href={settings.cookiePolicyUrl}
                    className="hover:underline"
                    style={{ color: settings.acceptButtonColor }}
                  >
                    Cookie Policy
                  </Link>
                </p>
              </div>
              <button
                onClick={handleRejectAll}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: settings.textColor }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customize Section */}
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="flex items-center gap-1 text-sm mb-4 opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: settings.textColor }}
            >
              {showCustomize ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {settings.customizeButtonText}
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                showCustomize ? 'max-h-96 opacity-100 mb-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div
                className="rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto"
                style={{ backgroundColor: `${settings.textColor}08` }}
              >
                {/* Display categories from database if available */}
                {hasCategories ? (
                  sortedCategories.map((category) => {
                    const prefKey = categoryToPreferenceKey[category.category];
                    const isChecked = prefKey ? preferences[prefKey] : false;
                    const isDisabled = category.isRequired || category.category === 'NECESSARY';

                    return (
                      <div key={category.id} className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: settings.textColor }}>
                            {category.name}
                            {isDisabled && (
                              <span className="ml-2 text-xs opacity-50">(Required)</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: settings.textColor, opacity: 0.6 }}>
                            {category.description}
                          </p>
                          {category.cookies.length > 0 && (
                            <details className="mt-2">
                              <summary
                                className="text-xs cursor-pointer hover:underline"
                                style={{ color: settings.acceptButtonColor }}
                              >
                                View {category.cookies.length} cookie{category.cookies.length !== 1 ? 's' : ''}
                              </summary>
                              <ul className="mt-1 ml-4 text-xs space-y-1" style={{ color: settings.textColor, opacity: 0.6 }}>
                                {category.cookies.map((cookie) => (
                                  <li key={cookie.id}>
                                    <span className="font-mono">{cookie.name}</span>
                                    <span className="opacity-70"> - {cookie.provider}</span>
                                    {cookie.duration && (
                                      <span className="opacity-70"> ({cookie.duration})</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isDisabled ? true : isChecked}
                          disabled={isDisabled}
                          onChange={() => toggleCategoryPreference(category.category)}
                          className="w-5 h-5 rounded border-gray-300 mt-1 cursor-pointer disabled:cursor-not-allowed"
                          style={{ accentColor: settings.acceptButtonColor }}
                        />
                      </div>
                    );
                  })
                ) : (
                  // Fallback to default categories if none in database
                  <>
                    {/* Necessary Cookies */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: settings.textColor }}>
                          Strictly Necessary
                        </p>
                        <p className="text-xs" style={{ color: settings.textColor, opacity: 0.6 }}>
                          Required for the website to function properly
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-5 h-5 rounded border-gray-300"
                        style={{ accentColor: settings.acceptButtonColor }}
                      />
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: settings.textColor }}>
                          Analytics & Performance
                        </p>
                        <p className="text-xs" style={{ color: settings.textColor, opacity: 0.6 }}>
                          Help us understand how visitors interact with our website
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                        style={{ accentColor: settings.acceptButtonColor }}
                      />
                    </div>

                    {/* Marketing Cookies */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: settings.textColor }}>
                          Marketing
                        </p>
                        <p className="text-xs" style={{ color: settings.textColor, opacity: 0.6 }}>
                          Used to deliver personalized ads and track campaigns
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                        style={{ accentColor: settings.acceptButtonColor }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Buttons – EU compliance: all buttons must be identical in color, size, and font */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleAcceptAll}
                variant="outline"
                style={{
                  borderColor: settings.textColor,
                  color: settings.textColor,
                }}
              >
                {settings.acceptAllButtonText}
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                style={{
                  borderColor: settings.textColor,
                  color: settings.textColor,
                }}
              >
                {settings.rejectAllButtonText}
              </Button>
              {showCustomize && (
                <Button
                  onClick={handleSavePreferences}
                  variant="outline"
                  style={{
                    borderColor: settings.textColor,
                    color: settings.textColor,
                  }}
                >
                  {settings.savePreferencesText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
