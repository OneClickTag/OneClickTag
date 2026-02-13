/**
 * HTML Technology Detector - detect tech stack from HTML + headers (no Playwright needed).
 */

import { DetectedTechnology, ExistingTracking } from '../interfaces';

export interface TechnologyDetectionResult {
  technologies: DetectedTechnology[];
  existingTracking: ExistingTracking[];
}

/**
 * Detect technologies and tracking from raw HTML and response headers.
 */
export function detectFromHTML(
  html: string,
  headers: Record<string, string> = {},
): TechnologyDetectionResult {
  const technologies = detectTechnologies(html, headers);
  const existingTracking = detectExistingTracking(html);
  return { technologies, existingTracking };
}

function detectTechnologies(html: string, headers: Record<string, string>): DetectedTechnology[] {
  const techs: DetectedTechnology[] = [];
  const htmlLower = html.toLowerCase();

  // ========================================
  // CMS Detection
  // ========================================

  // WordPress
  if (htmlLower.includes('wp-content/') || htmlLower.includes('wp-includes/')) {
    const versionMatch = html.match(/content="WordPress\s+([\d.]+)"/i);
    techs.push({ name: 'WordPress', category: 'cms', version: versionMatch?.[1], confidence: 1 });
  } else if (html.match(/meta\s+name="generator"\s+content="WordPress/i)) {
    techs.push({ name: 'WordPress', category: 'cms', confidence: 0.95 });
  }

  // Shopify
  if (htmlLower.includes('cdn.shopify.com') || htmlLower.includes('shopify-digital-wallet')) {
    techs.push({ name: 'Shopify', category: 'cms', confidence: 1 });
  }

  // Wix
  if (htmlLower.includes('wix-dynamic-custom-elements') || htmlLower.includes('static.wixstatic.com')) {
    techs.push({ name: 'Wix', category: 'cms', confidence: 1 });
  }

  // Squarespace
  if (htmlLower.includes('squarespace.com') || htmlLower.includes('static1.squarespace.com')) {
    techs.push({ name: 'Squarespace', category: 'cms', confidence: 1 });
  }

  // Webflow
  if (htmlLower.includes('assets.website-files.com') || htmlLower.includes('webflow.com')) {
    techs.push({ name: 'Webflow', category: 'cms', confidence: 0.9 });
  }

  // Drupal
  if (htmlLower.includes('drupal.js') || htmlLower.includes('/sites/default/files/')) {
    techs.push({ name: 'Drupal', category: 'cms', confidence: 0.9 });
  }

  // Joomla
  if (htmlLower.includes('/media/jui/') || html.match(/content="Joomla/i)) {
    techs.push({ name: 'Joomla', category: 'cms', confidence: 0.9 });
  }

  // ========================================
  // Framework Detection
  // ========================================

  // Next.js
  if (htmlLower.includes('__next') || htmlLower.includes('_next/static') || htmlLower.includes('__next_data__')) {
    techs.push({ name: 'Next.js', category: 'framework', confidence: 0.95 });
  }

  // Nuxt.js
  if (htmlLower.includes('__nuxt') || htmlLower.includes('/_nuxt/')) {
    techs.push({ name: 'Nuxt.js', category: 'framework', confidence: 0.95 });
  }

  // React (generic)
  if (!techs.find(t => t.name === 'Next.js') && (htmlLower.includes('data-reactroot') || htmlLower.includes('react-root'))) {
    techs.push({ name: 'React', category: 'framework', confidence: 0.8 });
  }

  // Vue.js (generic)
  if (!techs.find(t => t.name === 'Nuxt.js') && (html.match(/data-v-[a-f0-9]/i) || htmlLower.includes('vue.js'))) {
    techs.push({ name: 'Vue.js', category: 'framework', confidence: 0.8 });
  }

  // Angular
  if (htmlLower.includes('ng-app') || htmlLower.includes('ng-version') || htmlLower.includes('data-ng-app')) {
    techs.push({ name: 'Angular', category: 'framework', confidence: 0.8 });
  }

  // Svelte
  if (html.match(/data-svelte-h/i) || htmlLower.includes('__svelte')) {
    techs.push({ name: 'Svelte', category: 'framework', confidence: 0.8 });
  }

  // Gatsby
  if (htmlLower.includes('___gatsby')) {
    techs.push({ name: 'Gatsby', category: 'framework', confidence: 0.9 });
  }

  // ========================================
  // E-commerce Platform Detection
  // ========================================

  // WooCommerce (on top of WordPress)
  if (htmlLower.includes('woocommerce') || htmlLower.includes('wc-') || htmlLower.includes('add_to_cart')) {
    if (!techs.find(t => t.name === 'Shopify')) {
      techs.push({ name: 'WooCommerce', category: 'other', confidence: 0.9 });
    }
  }

  // Magento
  if (htmlLower.includes('mage-') || htmlLower.includes('magento')) {
    techs.push({ name: 'Magento', category: 'other', confidence: 0.9 });
  }

  // BigCommerce
  if (htmlLower.includes('bigcommerce.com') || htmlLower.includes('stencil-utils')) {
    techs.push({ name: 'BigCommerce', category: 'other', confidence: 0.9 });
  }

  // ========================================
  // Header-based Detection
  // ========================================

  const poweredBy = (headers['x-powered-by'] || '').toLowerCase();
  if (poweredBy.includes('express') && !techs.find(t => t.category === 'framework')) {
    techs.push({ name: 'Express.js', category: 'framework', confidence: 0.7 });
  }

  const server = (headers['server'] || '').toLowerCase();
  if (server.includes('nginx')) {
    techs.push({ name: 'Nginx', category: 'other', confidence: 0.8 });
  } else if (server.includes('apache')) {
    techs.push({ name: 'Apache', category: 'other', confidence: 0.8 });
  }

  if (headers['x-shopify-stage']) {
    if (!techs.find(t => t.name === 'Shopify')) {
      techs.push({ name: 'Shopify', category: 'cms', confidence: 1 });
    }
  }

  // ========================================
  // CDN Detection
  // ========================================

  if (htmlLower.includes('cloudflare') || headers['cf-ray']) {
    techs.push({ name: 'Cloudflare', category: 'other', confidence: 0.9 });
  }

  if (headers['x-vercel-id'] || htmlLower.includes('vercel.app')) {
    techs.push({ name: 'Vercel', category: 'other', confidence: 0.9 });
  }

  return techs;
}

function detectExistingTracking(html: string): ExistingTracking[] {
  const tracking: ExistingTracking[] = [];
  const htmlLower = html.toLowerCase();

  // Google Tag Manager
  const gtmMatch = html.match(/googletagmanager\.com\/gtm\.js\?id=(GTM-[A-Z0-9]+)/i);
  if (gtmMatch || htmlLower.includes('googletagmanager.com')) {
    tracking.push({
      type: 'tag_manager',
      provider: 'Google Tag Manager',
      details: gtmMatch?.[1] || undefined,
    });
  }

  // Google Analytics 4 (gtag.js)
  const ga4Match = html.match(/gtag\/js\?id=(G-[A-Z0-9]+)/i);
  if (ga4Match || htmlLower.includes('gtag/js')) {
    tracking.push({
      type: 'analytics',
      provider: 'Google Analytics 4',
      details: ga4Match?.[1] || undefined,
    });
  }

  // Universal Analytics (legacy)
  if (htmlLower.includes('analytics.js') || html.match(/UA-\d+-\d+/)) {
    tracking.push({ type: 'analytics', provider: 'Universal Analytics (Legacy)' });
  }

  // Facebook Pixel
  if (htmlLower.includes('connect.facebook.net') || htmlLower.includes('fbevents.js')) {
    tracking.push({ type: 'pixel', provider: 'Facebook Pixel' });
  }

  // Meta Pixel / CAPI
  if (htmlLower.includes('facebook.com/tr?')) {
    tracking.push({ type: 'pixel', provider: 'Meta Pixel' });
  }

  // TikTok Pixel
  if (htmlLower.includes('analytics.tiktok.com')) {
    tracking.push({ type: 'pixel', provider: 'TikTok Pixel' });
  }

  // LinkedIn Insight
  if (htmlLower.includes('snap.licdn.com') || htmlLower.includes('linkedin.com/insight')) {
    tracking.push({ type: 'pixel', provider: 'LinkedIn Insight' });
  }

  // Pinterest Tag
  if (htmlLower.includes('pintrk') || htmlLower.includes('s.pinimg.com')) {
    tracking.push({ type: 'pixel', provider: 'Pinterest Tag' });
  }

  // HubSpot
  if (htmlLower.includes('js.hs-scripts.com') || htmlLower.includes('js.hubspot.com')) {
    tracking.push({ type: 'marketing', provider: 'HubSpot' });
  }

  // Hotjar
  if (htmlLower.includes('static.hotjar.com')) {
    tracking.push({ type: 'heatmap', provider: 'Hotjar' });
  }

  // Microsoft Clarity
  if (htmlLower.includes('clarity.ms')) {
    tracking.push({ type: 'heatmap', provider: 'Microsoft Clarity' });
  }

  // Intercom
  if (htmlLower.includes('widget.intercom.io')) {
    tracking.push({ type: 'chat', provider: 'Intercom' });
  }

  // Drift
  if (htmlLower.includes('js.driftt.com')) {
    tracking.push({ type: 'chat', provider: 'Drift' });
  }

  // Crisp
  if (htmlLower.includes('client.crisp.chat')) {
    tracking.push({ type: 'chat', provider: 'Crisp' });
  }

  // Segment
  if (htmlLower.includes('cdn.segment.com')) {
    tracking.push({ type: 'cdp', provider: 'Segment' });
  }

  // Mixpanel
  if (htmlLower.includes('cdn.mxpnl.com') || htmlLower.includes('mixpanel.com/libs')) {
    tracking.push({ type: 'analytics', provider: 'Mixpanel' });
  }

  // Amplitude
  if (htmlLower.includes('cdn.amplitude.com')) {
    tracking.push({ type: 'analytics', provider: 'Amplitude' });
  }

  // Heap
  if (htmlLower.includes('heap-') || htmlLower.includes('heapanalytics.com')) {
    tracking.push({ type: 'analytics', provider: 'Heap' });
  }

  // Google Ads remarketing
  if (htmlLower.includes('googleads.g.doubleclick.net') || htmlLower.includes('google_conversion_id')) {
    tracking.push({ type: 'advertising', provider: 'Google Ads' });
  }

  return tracking;
}

/**
 * Summarize detected tech into LiveDiscovery format.
 */
export function summarizeTechnologies(techResult: TechnologyDetectionResult): {
  cms: string | null;
  framework: string | null;
  analytics: string[];
  ecommerce: string | null;
  cdn: string | null;
} {
  const { technologies, existingTracking } = techResult;

  const cms = technologies.find(t => t.category === 'cms')?.name || null;
  const framework = technologies.find(t => t.category === 'framework')?.name || null;

  const ecommerceNames = ['WooCommerce', 'Magento', 'BigCommerce', 'Shopify'];
  const ecommerce = technologies.find(t => ecommerceNames.includes(t.name))?.name ||
    (cms === 'Shopify' ? 'Shopify' : null);

  const cdnNames = ['Cloudflare', 'Vercel', 'Nginx', 'Apache'];
  const cdn = technologies.find(t => cdnNames.includes(t.name))?.name || null;

  const analytics = existingTracking.map(t => t.provider);

  return { cms, framework, analytics, ecommerce, cdn };
}
