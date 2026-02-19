/**
 * HTML Crawler - fetch + node-html-parser based page crawling.
 * Replaces Playwright for Phase 1 (10-50x faster, serverless compatible).
 */

import { parse, HTMLElement } from 'node-html-parser';
import {
  CrawledPage,
  PageMetaTags,
  PageHeading,
  SKIP_PATTERNS,
} from '../interfaces';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PAGE_TIMEOUT = 8000; // 8s per page

export interface FetchResult {
  html: string;
  statusCode: number;
  headers: Record<string, string>;
  redirectUrl: string | null;
}

export interface LoginDetection {
  isLogin: boolean;
  loginUrl?: string;
  formAction?: string;
}

/**
 * Fetch a page's HTML content.
 */
export async function fetchPage(url: string): Promise<FetchResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PAGE_TIMEOUT);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return null;
    }

    const html = await response.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const redirectUrl = response.redirected ? response.url : null;

    return { html, statusCode: response.status, headers, redirectUrl };
  } catch {
    return null;
  }
}

/**
 * Parse HTML into a CrawledPage object.
 */
export function parsePage(url: string, html: string, depth: number, headers: Record<string, string> = {}): CrawledPage {
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false } });

  const title = getTitle(root);
  const metaTags = getMetaTags(root);
  const headings = getHeadings(root);
  const links = discoverLinks(html, url, root);
  const pageType = classifyPageType(url, title, headings);

  const hasForm = root.querySelectorAll('form').length > 0;
  const hasCTA = !!root.querySelector(
    'button, a.btn, a.button, [role="button"], .cta, [class*="cta"], [class*="btn-primary"]'
  );
  const hasVideo = !!root.querySelector(
    'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]'
  );
  const hasPhoneLink = !!root.querySelector('a[href^="tel:"]');
  const hasEmailLink = !!root.querySelector('a[href^="mailto:"]');
  const hasDownloadLink = !!root.querySelector(
    'a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".zip"], a[download]'
  );

  // Content summary - extract enough text for robust niche detection
  const mainContent = root.querySelector('main, article, [role="main"], .content, #content');
  const contentText = (mainContent || root.querySelector('body') || root).textContent || '';
  const contentSummary = contentText.replace(/\s+/g, ' ').trim().slice(0, 800);

  return {
    url,
    title,
    depth,
    pageType,
    hasForm,
    hasCTA,
    hasVideo,
    hasPhoneLink,
    hasEmailLink,
    hasDownloadLink,
    importanceScore: null,
    metaTags,
    headings,
    contentSummary,
    links,
    elements: [], // Populated in Phase 2 (Playwright)
  };
}

/**
 * Discover internal links from HTML.
 */
export function discoverLinks(html: string, baseUrl: string, root?: HTMLElement): string[] {
  const doc = root || parse(html, { comment: false, blockTextElements: { script: false, style: false } });
  const links = new Set<string>();

  let baseUrlObj: URL;
  try {
    baseUrlObj = new URL(baseUrl);
  } catch {
    return [];
  }

  const baseDomain = getBaseDomain(baseUrlObj.hostname);

  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (!href) continue;

    try {
      const resolved = new URL(href, baseUrl).href;
      const resolvedUrl = new URL(resolved);

      // Only internal links (same base domain)
      const linkDomain = getBaseDomain(resolvedUrl.hostname);
      if (linkDomain !== baseDomain) continue;

      // Skip non-HTML resources and patterns
      if (shouldSkipUrl(resolved)) continue;

      links.add(normalizeUrl(resolved));
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(links);
}

/**
 * Detect if a page is a login page.
 */
export function detectLoginPage(html: string, url: string): LoginDetection {
  const urlLower = url.toLowerCase();
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false } });

  // URL-based detection
  const isLoginUrl = /\/(login|signin|sign-in|auth|authenticate|sso)(\/?$|\?)/i.test(urlLower);

  // Form-based detection: look for password field in a form
  const forms = root.querySelectorAll('form');
  let hasPasswordField = false;
  let formAction: string | undefined;

  for (const form of forms) {
    const passwordInput = form.querySelector('input[type="password"]');
    if (passwordInput) {
      hasPasswordField = true;
      formAction = form.getAttribute('action') || undefined;
      break;
    }
  }

  // Content-based detection
  const bodyText = (root.querySelector('body')?.textContent || '').toLowerCase();
  const hasLoginContent = /\b(sign in|log in|login|enter your password|forgot password)\b/i.test(bodyText);

  const isLogin = isLoginUrl || (hasPasswordField && hasLoginContent);

  return {
    isLogin,
    loginUrl: isLogin ? url : undefined,
    formAction,
  };
}

/**
 * Extract priority elements from parsed HTML for live discovery.
 */
export function extractPriorityElements(url: string, root: HTMLElement): {
  forms: Array<{ url: string; type: string; selector?: string }>;
  ctas: Array<{ url: string; text: string; selector?: string }>;
  videoEmbeds: Array<{ url: string; platform?: string }>;
  phoneLinks: Array<{ url: string; number: string }>;
  emailLinks: Array<{ url: string; email: string }>;
} {
  const forms: Array<{ url: string; type: string; selector?: string }> = [];
  const ctas: Array<{ url: string; text: string; selector?: string }> = [];
  const videoEmbeds: Array<{ url: string; platform?: string }> = [];
  const phoneLinks: Array<{ url: string; number: string }> = [];
  const emailLinks: Array<{ url: string; email: string }> = [];

  // Forms
  for (const form of root.querySelectorAll('form')) {
    const action = form.getAttribute('action') || '';
    const id = form.getAttribute('id');
    const className = form.getAttribute('class') || '';

    let type = 'other';
    if (/search/i.test(action + className + (id || ''))) type = 'search';
    else if (/contact|inquiry|message/i.test(action + className + (id || ''))) type = 'contact';
    else if (/login|signin/i.test(action + className + (id || ''))) type = 'login';
    else if (/signup|register|subscribe|newsletter/i.test(action + className + (id || ''))) type = 'signup';
    else if (/checkout|payment|billing/i.test(action + className + (id || ''))) type = 'checkout';

    const selector = id ? `#${id}` : undefined;
    forms.push({ url, type, selector });
  }

  // CTAs (buttons and CTA-like links)
  const ctaPatterns = /buy|cart|checkout|sign\s*up|register|demo|trial|download|subscribe|book|schedule|get\s*started|try\s*free|add\s*to\s*cart|contact/i;
  for (const el of root.querySelectorAll('button, a.btn, a.button, [role="button"], [class*="cta"], [class*="btn-primary"]')) {
    const text = (el.textContent || '').trim().slice(0, 80);
    if (text && ctaPatterns.test(text)) {
      const id = el.getAttribute('id');
      ctas.push({ url, text, selector: id ? `#${id}` : undefined });
    }
  }

  // Videos
  for (const el of root.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]')) {
    const src = el.getAttribute('src') || '';
    let platform: string | undefined;
    if (src.includes('youtube')) platform = 'YouTube';
    else if (src.includes('vimeo')) platform = 'Vimeo';
    else if (src.includes('wistia')) platform = 'Wistia';
    videoEmbeds.push({ url, platform });
  }

  // Phone links
  for (const a of root.querySelectorAll('a[href^="tel:"]')) {
    const href = a.getAttribute('href') || '';
    phoneLinks.push({ url, number: href.replace('tel:', '') });
  }

  // Email links
  for (const a of root.querySelectorAll('a[href^="mailto:"]')) {
    const href = a.getAttribute('href') || '';
    emailLinks.push({ url, email: href.replace('mailto:', '').split('?')[0] });
  }

  return { forms, ctas, videoEmbeds, phoneLinks, emailLinks };
}

// ========================================
// Private helpers
// ========================================

function getTitle(root: HTMLElement): string | null {
  const titleEl = root.querySelector('title');
  return titleEl ? titleEl.textContent.trim() : null;
}

function getMetaTags(root: HTMLElement): PageMetaTags {
  const get = (selector: string) =>
    root.querySelector(selector)?.getAttribute('content') || undefined;

  return {
    title: root.querySelector('title')?.textContent?.trim(),
    description: get('meta[name="description"]'),
    keywords: get('meta[name="keywords"]'),
    ogTitle: get('meta[property="og:title"]'),
    ogDescription: get('meta[property="og:description"]'),
    ogType: get('meta[property="og:type"]'),
    ogImage: get('meta[property="og:image"]'),
  };
}

function getHeadings(root: HTMLElement): PageHeading[] {
  return root.querySelectorAll('h1, h2, h3')
    .slice(0, 20)
    .map(h => ({
      level: parseInt(h.tagName[1]),
      text: (h.textContent || '').trim().slice(0, 200),
    }));
}

function classifyPageType(url: string, title: string | null, headings: PageHeading[]): string {
  const urlLower = url.toLowerCase();

  const patterns: Array<[string, RegExp[]]> = [
    ['homepage', [/^https?:\/\/[^/]+\/?$/]],
    ['product', [/\/product[s]?\//i, /\/item[s]?\//i, /\/p\//i]],
    ['category', [/\/categor(y|ies)\//i, /\/collection[s]?\//i, /\/shop\//i]],
    ['checkout', [/\/checkout/i, /\/payment/i]],
    ['cart', [/\/cart/i, /\/basket/i]],
    ['contact', [/\/contact/i, /\/get-in-touch/i]],
    ['about', [/\/about/i, /\/who-we-are/i, /\/our-story/i]],
    ['blog', [/\/blog\//i, /\/article[s]?\//i, /\/post[s]?\//i, /\/news\//i]],
    ['pricing', [/\/pricing/i, /\/plans/i]],
    ['features', [/\/features/i]],
    ['faq', [/\/faq/i, /\/help/i]],
    ['terms', [/\/terms/i, /\/privacy/i, /\/legal/i, /\/cookie/i]],
    ['login', [/\/login/i, /\/signin/i, /\/sign-in/i]],
    ['signup', [/\/signup/i, /\/register/i, /\/sign-up/i, /\/get-started/i]],
    ['services', [/\/services/i]],
    ['portfolio', [/\/portfolio/i, /\/work/i, /\/case-stud/i]],
    ['testimonials', [/\/testimonials/i, /\/reviews/i]],
    ['demo', [/\/demo/i, /\/trial/i]],
    ['documentation', [/\/docs?\//i, /\/documentation/i]],
  ];

  for (const [type, regexps] of patterns) {
    if (regexps.some(r => r.test(urlLower))) {
      return type;
    }
  }

  return 'other';
}

function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Preserve hash for hash-based routing (#/path), strip in-page anchors (#section)
    if (parsed.hash && !parsed.hash.startsWith('#/')) {
      parsed.hash = '';
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString();
  } catch {
    return url;
  }
}

function shouldSkipUrl(url: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(url));
}
