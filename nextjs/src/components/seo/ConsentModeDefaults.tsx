/**
 * Server component that renders an inline script to set Google Consent Mode V2
 * defaults BEFORE any GTM / GA4 tags load.
 *
 * Must be placed in <head> before <AnalyticsScripts />.
 */
export function ConsentModeDefaults() {
  const script = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

(function(){
  var STORAGE_KEY = 'oct_cookie_consent';
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) {}

  var analyticsGranted = false;
  var marketingGranted = false;

  if (stored && stored.timestamp) {
    var DEFAULT_EXPIRY_DAYS = 365;
    var expiryMs = DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    var isExpired = (Date.now() - stored.timestamp) > expiryMs;

    if (!isExpired) {
      analyticsGranted = !!stored.analytics;
      marketingGranted = !!stored.marketing;
    } else {
      stored = null;
    }
  }

  var consentState = {
    ad_storage:            marketingGranted ? 'granted' : 'denied',
    ad_user_data:          marketingGranted ? 'granted' : 'denied',
    ad_personalization:    marketingGranted ? 'granted' : 'denied',
    analytics_storage:     analyticsGranted ? 'granted' : 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'granted',
    security_storage:      'granted'
  };

  if (stored && stored.timestamp) {
    gtag('consent', 'default', consentState);
  } else {
    gtag('consent', 'default', Object.assign({}, consentState, {
      wait_for_update: 500
    }));
  }

  gtag('set', 'url_passthrough', true);
  gtag('set', 'ads_data_redaction', true);
})();
`.trim();

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
