import { Page } from 'playwright-core';
import { DetectedTechnology, ExistingTracking } from '../interfaces';

/**
 * Technology Detector Service - detects technologies and existing tracking.
 * Converted from NestJS service to plain TypeScript functions.
 */

/**
 * Detect technologies and existing tracking on a page.
 */
export async function detectTechnologyAndTracking(page: Page): Promise<{
  technologies: DetectedTechnology[];
  existingTracking: ExistingTracking[];
}> {
  const [technologies, existingTracking] = await Promise.all([
    detectTechnologies(page),
    detectExistingTracking(page),
  ]);

  return { technologies, existingTracking };
}

async function detectTechnologies(page: Page): Promise<DetectedTechnology[]> {
  try {
    const rawTechs = await page.evaluate(() => {
      const techs: Array<{ name: string; category: string; version?: string; confidence: number }> = [];

      // CMS Detection
      const metaGenerator = document.querySelector('meta[name="generator"]');
      const generatorContent = metaGenerator?.getAttribute('content') || '';

      if (generatorContent.includes('WordPress')) {
        techs.push({ name: 'WordPress', category: 'cms', version: generatorContent.split('WordPress ')[1], confidence: 1 });
      }
      if (document.querySelector('meta[name="shopify-digital-wallet"]') || (window as any).Shopify) {
        techs.push({ name: 'Shopify', category: 'cms', confidence: 1 });
      }
      if (document.querySelector('meta[name="wix-dynamic-custom-elements"]') || generatorContent.includes('Wix')) {
        techs.push({ name: 'Wix', category: 'cms', confidence: 1 });
      }
      if ((window as any).Squarespace || generatorContent.includes('Squarespace')) {
        techs.push({ name: 'Squarespace', category: 'cms', confidence: 1 });
      }
      if ((window as any).webflow) {
        techs.push({ name: 'Webflow', category: 'cms', confidence: 0.9 });
      }

      // Framework Detection
      if ((window as any).__NEXT_DATA__ || document.querySelector('#__next')) {
        techs.push({ name: 'Next.js', category: 'framework', confidence: 0.95 });
      }
      if ((window as any).__NUXT__) {
        techs.push({ name: 'Nuxt.js', category: 'framework', confidence: 0.95 });
      }
      if (document.querySelector('[data-reactroot]') || document.querySelector('#root[data-reactroot]')) {
        techs.push({ name: 'React', category: 'framework', confidence: 0.8 });
      }
      if ((window as any).__VUE__ || document.querySelector('[data-v-]')) {
        techs.push({ name: 'Vue.js', category: 'framework', confidence: 0.8 });
      }
      if ((window as any).angular || document.querySelector('[ng-app]') || document.querySelector('[data-ng-app]')) {
        techs.push({ name: 'Angular', category: 'framework', confidence: 0.8 });
      }
      if (document.querySelector('[data-svelte-h]')) {
        techs.push({ name: 'Svelte', category: 'framework', confidence: 0.8 });
      }

      return techs;
    });
    return rawTechs as DetectedTechnology[];
  } catch (error: any) {
    console.warn(`Technology detection failed: ${error?.message}`);
    return [];
  }
}

async function detectExistingTracking(page: Page): Promise<ExistingTracking[]> {
  try {
    return await page.evaluate(() => {
      const tracking: Array<{ type: string; provider: string; details?: string }> = [];

      // Google Tag Manager
      const gtmScripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
      if (gtmScripts.length > 0 || (window as any).google_tag_manager) {
        const containerId = Array.from(gtmScripts)
          .map(s => {
            const match = s.getAttribute('src')?.match(/id=(GTM-[A-Z0-9]+)/);
            return match?.[1];
          })
          .filter(Boolean)[0];
        tracking.push({ type: 'tag_manager', provider: 'Google Tag Manager', details: containerId || undefined });
      }

      // Google Analytics 4
      const ga4Scripts = document.querySelectorAll('script[src*="gtag/js"]');
      if (ga4Scripts.length > 0 || (window as any).gtag) {
        const measurementId = Array.from(ga4Scripts)
          .map(s => {
            const match = s.getAttribute('src')?.match(/id=(G-[A-Z0-9]+)/);
            return match?.[1];
          })
          .filter(Boolean)[0];
        tracking.push({ type: 'analytics', provider: 'Google Analytics 4', details: measurementId || undefined });
      }

      // Facebook Pixel
      if ((window as any).fbq || document.querySelector('script[src*="connect.facebook.net"]')) {
        tracking.push({ type: 'pixel', provider: 'Facebook Pixel' });
      }

      // HubSpot
      if (document.querySelector('script[src*="js.hs-scripts.com"]') || (window as any)._hsq) {
        tracking.push({ type: 'marketing', provider: 'HubSpot' });
      }

      // Hotjar
      if ((window as any).hj || document.querySelector('script[src*="static.hotjar.com"]')) {
        tracking.push({ type: 'heatmap', provider: 'Hotjar' });
      }

      // Intercom
      if ((window as any).Intercom || document.querySelector('script[src*="widget.intercom.io"]')) {
        tracking.push({ type: 'chat', provider: 'Intercom' });
      }

      // Drift
      if ((window as any).drift || document.querySelector('script[src*="js.driftt.com"]')) {
        tracking.push({ type: 'chat', provider: 'Drift' });
      }

      // Segment
      if ((window as any).analytics?.identify || document.querySelector('script[src*="cdn.segment.com"]')) {
        tracking.push({ type: 'cdp', provider: 'Segment' });
      }

      // Mixpanel
      if ((window as any).mixpanel) {
        tracking.push({ type: 'analytics', provider: 'Mixpanel' });
      }

      // Amplitude
      if ((window as any).amplitude) {
        tracking.push({ type: 'analytics', provider: 'Amplitude' });
      }

      return tracking;
    });
  } catch (error: any) {
    console.warn(`Existing tracking detection failed: ${error?.message}`);
    return [];
  }
}
