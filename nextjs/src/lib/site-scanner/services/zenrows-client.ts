/**
 * ZenRows Client — Fallback fetch/browser when local methods are blocked by bot detection.
 *
 * Strategy: progressive cost escalation.
 *   1. Try free local methods first (fetchPage, stealth Playwright).
 *   2. Only escalate to paid ZenRows tiers when blocked.
 *
 * Credit costs per tier:
 *   local                 → 0
 *   zenrows_basic         → 1
 *   zenrows_js_render     → 5
 *   zenrows_premium       → 25
 *   zenrows_remote_browser → 0 (bandwidth-based)
 */

import { chromium, Browser, BrowserContext } from 'playwright-core';
import { fetchPage, FetchResult } from './html-crawler';
import { createStealthBrowser, createStealthContext, warmUpSession } from './stealth-config';
import type { CreditTracker } from './credit-tracker';

// ========================================
// Types
// ========================================

export type ZenRowsTier =
  | 'local'
  | 'zenrows_basic'
  | 'zenrows_js_render'
  | 'zenrows_premium'
  | 'zenrows_remote_browser';

export const TIER_CREDIT_COSTS: Record<ZenRowsTier, number> = {
  local: 0,
  zenrows_basic: 1,
  zenrows_js_render: 5,
  zenrows_premium: 25,
  zenrows_remote_browser: 0, // bandwidth-based
};

export interface FetchWithFallbackResult {
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  redirectUrl: string | null;
  tier: ZenRowsTier;
  creditsUsed: number;
}

export interface BrowserWithFallbackResult {
  browser: Browser;
  context: BrowserContext;
  isRemote: boolean;
  cleanup: () => Promise<void>;
}

// ========================================
// Helpers
// ========================================

/**
 * Read the ZenRows API key from environment.
 * Returns null if not configured.
 */
export function getZenRowsApiKey(): string | null {
  return process.env.ZENROWS_API_KEY ?? null;
}

/**
 * Shared bot-detection checker.
 *
 * Returns true if the response looks like a bot-protection wall:
 * - HTTP status 403, 429, or 503
 * - Known challenge page text patterns
 * - Empty / very short HTML (< 100 chars) with no real content
 */
export function isBlockedResponse(html: string, statusCode: number): boolean {
  if (statusCode === 403 || statusCode === 429 || statusCode === 503) {
    return true;
  }

  const challengePatterns = [
    'Checking your browser',
    'Just a moment',
    'Verifying you are human',
    'cf-browser-verification',
    'challenge-platform',
    '_cf_chl',
    'DDoS protection by',
  ];

  for (const pattern of challengePatterns) {
    if (html.includes(pattern)) {
      return true;
    }
  }

  // Very short response with no real content is likely a block page or error
  const trimmed = html.trim();
  if (trimmed.length < 100 && !/<(html|body|div|p|h[1-6])/i.test(trimmed)) {
    return true;
  }

  return false;
}

// ========================================
// Phase 1: URL discovery fetch with fallback
// ========================================

/**
 * Fetch a page for Phase 1 URL discovery, escalating through ZenRows tiers
 * if local fetch is blocked.
 *
 * Tier order:
 *   local → zenrows_basic → zenrows_js_render → zenrows_premium
 *
 * Returns null only if all tiers fail or are unavailable.
 */
export async function fetchWithFallback(
  url: string,
  tracker?: CreditTracker,
): Promise<FetchWithFallbackResult | null> {
  // ── Step 1: local fetch ──
  const localResult = await fetchPage(url);

  if (localResult && !isBlockedResponse(localResult.html, localResult.statusCode)) {
    if (tracker) tracker.record('local');
    return {
      ...localResult,
      tier: 'local',
      creditsUsed: TIER_CREDIT_COSTS.local,
    };
  }

  // ── Step 2: ZenRows tiers ──
  const apiKey = getZenRowsApiKey();
  if (!apiKey) {
    // No API key — return local result as-is (even if blocked) or null
    if (localResult) {
      return {
        ...localResult,
        tier: 'local',
        creditsUsed: 0,
      };
    }
    return null;
  }

  const zenRowsTiers: Array<{
    tier: ZenRowsTier;
    params: Record<string, string>;
  }> = [
    {
      tier: 'zenrows_basic',
      params: { apikey: apiKey, url },
    },
    {
      tier: 'zenrows_js_render',
      params: { apikey: apiKey, url, js_render: 'true' },
    },
    {
      tier: 'zenrows_premium',
      params: { apikey: apiKey, url, js_render: 'true', premium_proxy: 'true' },
    },
  ];

  for (const { tier, params } of zenRowsTiers) {
    console.log(`[ZenRows] local fetch blocked for ${url}, trying ${tier}...`);

    const zenResult = await callZenRowsApi(url, params);
    if (!zenResult) {
      console.warn(`[ZenRows] ${tier} failed for ${url}, trying next tier...`);
      continue;
    }

    if (isBlockedResponse(zenResult.html, zenResult.statusCode)) {
      console.warn(`[ZenRows] ${tier} returned a blocked response for ${url}, escalating...`);
      continue;
    }

    if (tracker) tracker.record(tier);

    return {
      ...zenResult,
      tier,
      creditsUsed: TIER_CREDIT_COSTS[tier],
    };
  }

  // All tiers exhausted
  console.warn(`[ZenRows] All tiers failed for ${url}`);
  return null;
}

// ========================================
// Phase 2: Browser with fallback
// ========================================

/**
 * Obtain a browser for Phase 2 deep crawling.
 *
 * First tries a local stealth Playwright browser. If the target site
 * shows a bot-protection challenge, falls back to the ZenRows Scraping Browser
 * via CDP.
 *
 * Always returns a cleanup() function — callers must invoke it when done.
 */
export async function createBrowserWithFallback(
  websiteUrl: string,
): Promise<BrowserWithFallbackResult> {
  // ── Attempt 1: local stealth browser ──
  let localBrowser: Browser | null = null;
  let localContext: BrowserContext | null = null;

  try {
    localBrowser = await createStealthBrowser();
    localContext = await createStealthContext(localBrowser);

    // Warm up to set cookies and resolve short-lived challenges
    await warmUpSession(localContext, websiteUrl);

    // Test whether the site is still blocking after warm-up
    const testPage = await localContext.newPage();
    let bodyText = '';
    try {
      await testPage.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      bodyText = await testPage.evaluate(() => document.body?.innerText?.slice(0, 3000) ?? '');
    } finally {
      await testPage.close();
    }

    const blocked = isBlockedByText(bodyText);

    if (!blocked) {
      const capturedBrowser = localBrowser;
      const capturedContext = localContext;
      return {
        browser: capturedBrowser,
        context: capturedContext,
        isRemote: false,
        cleanup: async () => {
          await capturedContext.close().catch(() => {});
          await capturedBrowser.close().catch(() => {});
        },
      };
    }

    // Local browser is blocked — close it and try ZenRows
    console.log(`[ZenRows] local browser blocked for ${websiteUrl}, trying zenrows_remote_browser...`);
    await localContext.close().catch(() => {});
    await localBrowser.close().catch(() => {});
    localBrowser = null;
    localContext = null;
  } catch (err) {
    // Clean up if anything went wrong
    if (localContext) await localContext.close().catch(() => {});
    if (localBrowser) await localBrowser.close().catch(() => {});
    localBrowser = null;
    localContext = null;
    console.warn('[ZenRows] local stealth browser setup failed:', err instanceof Error ? err.message : String(err));
  }

  // ── Attempt 2: ZenRows Scraping Browser via CDP ──
  const apiKey = getZenRowsApiKey();
  if (!apiKey) {
    // No API key — fall back to a fresh local browser even if blocked
    console.warn('[ZenRows] ZENROWS_API_KEY not set, returning local browser despite block');
    const fallbackBrowser = await createStealthBrowser();
    const fallbackContext = await createStealthContext(fallbackBrowser);
    return {
      browser: fallbackBrowser,
      context: fallbackContext,
      isRemote: false,
      cleanup: async () => {
        await fallbackContext.close().catch(() => {});
        await fallbackBrowser.close().catch(() => {});
      },
    };
  }

  try {
    const cdpUrl = `wss://browser.zenrows.com?apikey=${apiKey}`;
    const remoteBrowser = await chromium.connectOverCDP(cdpUrl);
    const remoteContext = await remoteBrowser.newContext();

    return {
      browser: remoteBrowser,
      context: remoteContext,
      isRemote: true,
      cleanup: async () => {
        await remoteContext.close().catch(() => {});
        await remoteBrowser.close().catch(() => {});
      },
    };
  } catch (err) {
    console.warn(
      '[ZenRows] remote browser connection failed, falling back to local browser:',
      err instanceof Error ? err.message : String(err),
    );

    // Last resort: local browser
    const fallbackBrowser = await createStealthBrowser();
    const fallbackContext = await createStealthContext(fallbackBrowser);
    return {
      browser: fallbackBrowser,
      context: fallbackContext,
      isRemote: false,
      cleanup: async () => {
        await fallbackContext.close().catch(() => {});
        await fallbackBrowser.close().catch(() => {});
      },
    };
  }
}

// ========================================
// Private helpers
// ========================================

/**
 * Call the ZenRows REST API with a 15s timeout.
 * Returns null on any error.
 */
async function callZenRowsApi(
  _url: string,
  params: Record<string, string>,
): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const queryString = new URLSearchParams(params).toString();
    const apiUrl = `https://api.zenrows.com/v1/?${queryString}`;

    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    const html = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // ZenRows passes through the original status via X-Zenrows-Status-Code header
    const originalStatus = parseInt(headers['x-zenrows-status-code'] ?? String(response.status), 10);

    return {
      html,
      statusCode: isNaN(originalStatus) ? response.status : originalStatus,
      headers,
      redirectUrl: null,
    };
  } catch (err) {
    console.warn(
      '[ZenRows] API call failed:',
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Detect bot-protection challenge patterns in body text (used for browser checks).
 */
function isBlockedByText(bodyText: string): boolean {
  const patterns = [
    'Checking your browser',
    'Just a moment',
    'Verifying you are human',
    'cf-browser-verification',
    'challenge-platform',
    '_cf_chl',
    'DDoS protection by',
  ];
  return patterns.some(p => bodyText.includes(p));
}

