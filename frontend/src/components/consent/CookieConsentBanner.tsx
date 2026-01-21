import React from 'react';
import { useCookieConsent } from './useCookieConsent';

export interface CookieConsentBannerProps {
  tenantId: string;
}

/**
 * Cookie consent banner component
 * Displays a banner asking for cookie consent with customizable styling and text
 */
export function CookieConsentBanner({ tenantId }: CookieConsentBannerProps) {
  const {
    showBanner,
    bannerConfig,
    isLoading,
    acceptAll,
    rejectAll,
    openPreferences,
  } = useCookieConsent(tenantId);

  // Don't render if loading, banner shouldn't be shown, or config is missing
  if (isLoading || !showBanner || !bannerConfig) {
    return null;
  }

  // Position classes based on configuration
  const positionClasses = {
    bottom: 'fixed bottom-0 left-0 right-0',
    top: 'fixed top-0 left-0 right-0',
    center: 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50',
  };

  const containerClasses =
    bannerConfig.position === 'center'
      ? 'max-w-2xl mx-auto p-6 rounded-lg shadow-2xl'
      : 'w-full p-6 shadow-lg';

  return (
    <div
      className={`${positionClasses[bannerConfig.position]} z-[9999]`}
      role="dialog"
      aria-labelledby="cookie-consent-heading"
      aria-describedby="cookie-consent-description"
    >
      <div
        className={containerClasses}
        style={{
          backgroundColor: bannerConfig.secondaryColor,
          color: bannerConfig.textColor,
        }}
      >
        <div className="max-w-5xl mx-auto">
          <h3
            id="cookie-consent-heading"
            className="font-bold text-xl mb-2"
            style={{ color: bannerConfig.textColor }}
          >
            {bannerConfig.headingText}
          </h3>
          <p
            id="cookie-consent-description"
            className="mb-4 text-sm md:text-base"
            style={{ color: bannerConfig.textColor }}
          >
            {bannerConfig.bodyText}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={acceptAll}
              className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                backgroundColor: bannerConfig.primaryColor,
              }}
              aria-label="Accept all cookies"
            >
              {bannerConfig.acceptButtonText}
            </button>
            <button
              onClick={rejectAll}
              className="px-4 py-2 rounded font-medium border transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                borderColor: bannerConfig.textColor,
                color: bannerConfig.textColor,
              }}
              aria-label="Reject all cookies"
            >
              {bannerConfig.rejectButtonText}
            </button>
            <button
              onClick={openPreferences}
              className="px-4 py-2 rounded font-medium transition-opacity hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                color: bannerConfig.textColor,
              }}
              aria-label="Customize cookie preferences"
            >
              {bannerConfig.customizeButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
