import { Browser, Page, BrowserContext } from 'playwright-core';
import {
  CrawlOptions,
  CrawledPage,
  PageMetaTags,
  PageHeading,
  ExtractedElement,
  SKIP_PATTERNS,
  DEFAULT_CRAWL_OPTIONS,
} from '../interfaces';
import { detectTechnologyAndTracking } from './technology-detector';
import { createStealthBrowser, createStealthContext } from './stealth-config';

/**
 * Crawl Engine Service - BFS website crawling with Playwright.
 * Converted from NestJS service to plain TypeScript functions.
 */

/**
 * BFS crawl of a website, extracting page data and links.
 */
export async function crawl(
  websiteUrl: string,
  options: Partial<CrawlOptions> = {},
  onPageCrawled?: (page: CrawledPage, index: number) => void,
): Promise<{
  pages: CrawledPage[];
  technologies: any[];
  existingTracking: any[];
}> {
  const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };

  // Validate URL
  let baseUrl: URL;
  try {
    baseUrl = new URL(websiteUrl);
    if (!baseUrl.protocol.startsWith('http')) {
      throw new Error('URL must use http or https protocol');
    }
  } catch (error: any) {
    throw new Error(`Invalid website URL: ${error?.message || websiteUrl}`);
  }

  const baseDomain = getBaseDomain(baseUrl.hostname);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  // Overall timeout (10 minutes)
  const overallTimeout = 10 * 60 * 1000;
  const scanStartTime = Date.now();

  try {
    try {
      browser = await createStealthBrowser();
    } catch (launchError: any) {
      throw new Error(
        `Failed to launch browser. Ensure Playwright browsers are installed. ` +
        `Run 'npx playwright install chromium' to fix. Error: ${launchError?.message}`
      );
    }

    context = await createStealthContext(browser);

    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: websiteUrl, depth: 0 }];
    const pages: CrawledPage[] = [];
    let technologies: any[] = [];
    let existingTracking: any[] = [];

    while (queue.length > 0 && pages.length < opts.maxPages) {
      // Check overall timeout
      if (Date.now() - scanStartTime > overallTimeout) {
        console.warn(`Crawl timed out after ${overallTimeout / 1000}s. Returning ${pages.length} pages.`);
        break;
      }

      const item = queue.shift();
      if (!item) break;

      const normalizedUrl = normalizeUrl(item.url);
      if (visited.has(normalizedUrl)) continue;
      if (item.depth > opts.maxDepth) continue;
      if (!isSameDomain(normalizedUrl, baseDomain)) continue;
      if (shouldSkipUrl(normalizedUrl)) continue;

      visited.add(normalizedUrl);

      try {
        const page = await context.newPage();
        const crawledPage = await crawlPage(page, normalizedUrl, item.depth, opts.pageTimeout);

        if (crawledPage) {
          pages.push(crawledPage);

          // Detect technologies on homepage
          if (pages.length === 1) {
            const detection = await detectTechnologyAndTracking(page);
            technologies = detection.technologies;
            existingTracking = detection.existingTracking;
          }

          // Add new links to queue
          for (const link of crawledPage.links) {
            const normalizedLink = normalizeUrl(link);
            if (!visited.has(normalizedLink) && isSameDomain(normalizedLink, baseDomain)) {
              queue.push({ url: normalizedLink, depth: item.depth + 1 });
            }
          }

          if (onPageCrawled) {
            onPageCrawled(crawledPage, pages.length - 1);
          }
        }

        await page.close();
      } catch (error: any) {
        console.warn(`Failed to crawl ${normalizedUrl}: ${error?.message}`);
      }

      // Polite crawl delay
      if (queue.length > 0 && pages.length < opts.maxPages) {
        await delay(opts.crawlDelay);
      }
    }

    return { pages, technologies, existingTracking };
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Extract elements from a page for tracking detection (Phase 2).
 */
export async function extractElements(
  websiteUrl: string,
  pageUrls: string[],
): Promise<Map<string, ExtractedElement[]>> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results = new Map<string, ExtractedElement[]>();

  try {
    browser = await createStealthBrowser();

    context = await createStealthContext(browser);

    for (const url of pageUrls) {
      try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000); // Let SPAs hydrate

        const elements = await extractPageElements(page);
        results.set(url, elements);

        await page.close();
        await delay(500);
      } catch (error: any) {
        console.warn(`Failed to extract elements from ${url}: ${error?.message}`);
        results.set(url, []);
      }
    }

    return results;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

// ========================================
// Private Methods
// ========================================

async function crawlPage(
  page: Page,
  url: string,
  depth: number,
  timeout: number,
): Promise<CrawledPage | null> {
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout });
    if (!response || response.status() >= 400) return null;

    // Wait for SPA hydration
    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      // Meta tags
      const metaTags: Record<string, string | undefined> = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
        keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || undefined,
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined,
        ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
        ogType: document.querySelector('meta[property="og:type"]')?.getAttribute('content') || undefined,
        ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined,
      };

      // Headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 20).map(h => ({
        level: parseInt(h.tagName[1]),
        text: (h.textContent || '').trim().slice(0, 200),
      }));

      // Links
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => {
          try {
            return new URL(a.getAttribute('href') || '', document.location.href).href;
          } catch {
            return null;
          }
        })
        .filter((href): href is string => href !== null);

      // Detect page features
      const hasForm = document.querySelectorAll('form').length > 0;
      const hasCTA = !!document.querySelector(
        'button, a.btn, a.button, [role="button"], .cta, [class*="cta"], [class*="btn-primary"]'
      );
      const hasVideo = !!document.querySelector(
        'video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]'
      );
      const hasPhoneLink = !!document.querySelector('a[href^="tel:"]');
      const hasEmailLink = !!document.querySelector('a[href^="mailto:"]');
      const hasDownloadLink = !!document.querySelector(
        'a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".zip"], a[download]'
      );

      // Content summary (first 300 chars of main content)
      const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
      const contentText = (mainContent || document.body).textContent || '';
      const contentSummary = contentText.replace(/\s+/g, ' ').trim().slice(0, 300);

      return {
        title: document.title,
        metaTags,
        headings,
        links: Array.from(new Set(links)),
        hasForm,
        hasCTA,
        hasVideo,
        hasPhoneLink,
        hasEmailLink,
        hasDownloadLink,
        contentSummary,
      };
    });

    const pageType = classifyPageType(url, data.title, data.headings);

    return {
      url,
      title: data.title,
      depth,
      pageType,
      hasForm: data.hasForm,
      hasCTA: data.hasCTA,
      hasVideo: data.hasVideo,
      hasPhoneLink: data.hasPhoneLink,
      hasEmailLink: data.hasEmailLink,
      hasDownloadLink: data.hasDownloadLink,
      importanceScore: null, // Calculated later
      metaTags: data.metaTags as PageMetaTags,
      headings: data.headings as PageHeading[],
      contentSummary: data.contentSummary,
      links: data.links,
      elements: [], // Populated in Phase 2
    };
  } catch (error: any) {
    console.warn(`Failed to process page ${url}: ${error?.message}`);
    return null;
  }
}

async function extractPageElements(page: Page): Promise<ExtractedElement[]> {
  try {
    return await page.evaluate(() => {
      const elements: Array<Record<string, any>> = [];

      // Buttons
      document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        elements.push({
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || undefined,
          text: (el.textContent || '').trim().slice(0, 100),
          id: el.id || undefined,
          className: el.className?.toString()?.slice(0, 200) || undefined,
          name: el.getAttribute('name') || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          isVisible: rect.width > 0 && rect.height > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      });

      // Forms
      document.querySelectorAll('form').forEach(form => {
        const rect = form.getBoundingClientRect();
        elements.push({
          tagName: 'form',
          id: form.id || undefined,
          className: form.className?.toString()?.slice(0, 200) || undefined,
          action: form.action || undefined,
          method: form.method || undefined,
          name: form.getAttribute('name') || undefined,
          isVisible: rect.width > 0 && rect.height > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      });

      // Links with significant text/functionality
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim().slice(0, 100);
        // Only include significant links (CTAs, phone, email, downloads)
        if (
          href.startsWith('tel:') ||
          href.startsWith('mailto:') ||
          href.match(/\.(pdf|doc|docx|xls|xlsx|zip)$/i) ||
          a.getAttribute('download') !== null ||
          a.classList.toString().match(/btn|button|cta/i) ||
          text.match(/buy|cart|checkout|sign\s*up|register|demo|trial|download|subscribe|book|schedule/i)
        ) {
          const rect = a.getBoundingClientRect();
          elements.push({
            tagName: 'a',
            href: href.slice(0, 200),
            text,
            id: a.id || undefined,
            className: a.className?.toString()?.slice(0, 200) || undefined,
            ariaLabel: a.getAttribute('aria-label') || undefined,
            isVisible: rect.width > 0 && rect.height > 0,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          });
        }
      });

      // Videos
      document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        elements.push({
          tagName: el.tagName.toLowerCase(),
          href: el.getAttribute('src') || undefined,
          id: el.id || undefined,
          className: el.className?.toString()?.slice(0, 200) || undefined,
          isVisible: rect.width > 0 && rect.height > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      });

      // Inputs (for form tracking)
      document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach(el => {
        const rect = el.getBoundingClientRect();
        const parentForm = el.closest('form');
        elements.push({
          tagName: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || undefined,
          name: el.getAttribute('name') || undefined,
          placeholder: el.getAttribute('placeholder') || undefined,
          id: el.id || undefined,
          className: el.className?.toString()?.slice(0, 200) || undefined,
          ariaLabel: el.getAttribute('aria-label') || undefined,
          parentForm: parentForm?.id || parentForm?.getAttribute('name') || undefined,
          isVisible: rect.width > 0 && rect.height > 0,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      });

      return elements as any[];
    });
  } catch (error) {
    return [];
  }
}

function classifyPageType(url: string, title: string | null, headings: PageHeading[]): string {
  const urlLower = url.toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const h1Text = headings.find(h => h.level === 1)?.text?.toLowerCase() || '';

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
    ['documentation', [/\/docs?\//i, /\/documentation/i, /\/api\//i]],
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

function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === baseDomain || urlObj.hostname.endsWith('.' + baseDomain);
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove hash, trailing slash, and query params for dedup
    parsed.hash = '';
    let path = parsed.pathname.replace(/\/+$/, '') || '/';
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url;
  }
}

function shouldSkipUrl(url: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(url));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
