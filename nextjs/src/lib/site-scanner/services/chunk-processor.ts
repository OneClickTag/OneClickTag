/**
 * Chunk Processor - Stateful chunked crawl orchestrator.
 * Client drives the loop by calling /process-chunk repeatedly.
 * Each call processes a small batch within Vercel's 30s timeout.
 */

import { parse } from 'node-html-parser';
import { prisma } from '@/lib/prisma';
import { SiteScanStatus } from '@prisma/client';
import {
  CrawledPage,
  ExtractedElement,
  SKIP_PATTERNS,
} from '../interfaces';
import { fetchPage, parsePage, discoverLinks, extractPriorityElements, detectLoginPage as detectLoginPageHTML } from './html-crawler';
import { detectFromHTML, summarizeTechnologies } from './html-technology-detector';
import { extractElements } from './crawl-engine';
import { detectOpportunities } from './tracking-detector';
import { processRecommendations } from './recommendation-engine';
import { isScanCancelled } from './site-scanner';
import { dismissObstacles } from './obstacle-handler';
import { simulateInteractions } from './interaction-simulator';
import { detectLoginPage as detectLoginPagePlaywright, performLogin, serializeCookies, restoreCookies } from './auth-handler';
import { createBehavioralOpportunities } from '../constants/behavioral-tracking';
import { LOGIN_CLASSIFY_PATTERNS, isLoginUrl as isLoginUrlCheck } from '../constants/login-patterns';
import { broadcastScanProgress, pageCrawledEvent, chunkCompleteEvent } from '@/lib/supabase/scan-progress';
import { createStealthBrowser, createStealthContext, warmUpSession } from './stealth-config';

// ========================================
// Types
// ========================================

export interface LiveDiscovery {
  technologies: {
    cms: string | null;
    framework: string | null;
    analytics: string[];
    ecommerce: string | null;
    cdn: string | null;
  };
  priorityElements: {
    forms: Array<{ url: string; type: string; selector?: string }>;
    ctas: Array<{ url: string; text: string; selector?: string }>;
    cartPages: string[];
    productPages: string[];
    checkoutPages: string[];
    loginPages: string[];
    videoEmbeds: Array<{ url: string; platform?: string }>;
    phoneLinks: Array<{ url: string; number: string }>;
    emailLinks: Array<{ url: string; email: string }>;
  };
  pageTypes: Record<string, number>;
  urlPatterns: string[];
  sitemapFound: boolean;
  robotsFound: boolean;
  totalUrlsDiscovered: number;
  obstaclesDismissed: number;
  totalInteractions: number;
  authenticatedPagesCount: number;
}

export interface UrlQueueItem {
  url: string;
  depth: number;
  source: 'sitemap' | 'crawl' | 'homepage';
}

export interface ChunkResult {
  pagesProcessed: number;
  hasMore: boolean;
  discovery: LiveDiscovery;
  newPages: Array<{
    url: string;
    title: string | null;
    pageType: string | null;
    hasForm: boolean;
    hasCTA: boolean;
  }>;
  loginDetected?: boolean;
  loginUrl?: string;
  obstaclesDismissed?: number;
  interactionsPerformed?: number;
  authenticatedPages?: number;
  /** Result of login attempt if credentials were provided */
  authResult?: {
    attempted: boolean;
    success: boolean;
    error?: string;
    requiresMfa?: boolean;
    requiresCaptcha?: boolean;
  };
}

export interface Phase2ChunkResult {
  pagesProcessed: number;
  hasMore: boolean;
  newRecommendations: number;
}

const TERMINAL_STATUSES: SiteScanStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

// ========================================
// Phase 1 Chunk Processing
// ========================================

/**
 * Process a chunk of Phase 1 pages (Playwright-based crawling with obstacles and interactions).
 * Primary Phase 1 implementation — renders full DOM to discover JS-rendered links.
 */
export async function processPhase1ChunkPlaywright(
  scanId: string,
  chunkSize: number = 8,
  credentials?: { username: string; password: string } | null,
): Promise<ChunkResult> {
  // Load scan state from DB
  const scan = await prisma.siteScan.findUnique({
    where: { id: scanId },
    select: {
      id: true,
      status: true,
      websiteUrl: true,
      maxPages: true,
      maxDepth: true,
      urlQueue: true,
      crawledUrls: true,
      liveDiscovery: true,
      totalUrlsFound: true,
      loginDetected: true,
      loginUrl: true,
      sessionCookies: true,
    },
  });

  if (!scan) throw new Error('Scan not found');
  if (TERMINAL_STATUSES.includes(scan.status)) {
    throw new Error(`Scan is in terminal state: ${scan.status}`);
  }

  // Deserialize state
  const urlQueue: UrlQueueItem[] = (scan.urlQueue as unknown as UrlQueueItem[]) || [];
  const crawledUrls: string[] = (scan.crawledUrls as unknown as string[]) || [];
  const crawledSet = new Set(crawledUrls);
  const discovery: LiveDiscovery = (scan.liveDiscovery as unknown as LiveDiscovery) || createEmptyDiscovery();

  const baseUrl = new URL(scan.websiteUrl);
  const baseDomain = getBaseDomain(baseUrl.hostname);

  // Build a Set of queued URLs for O(1) lookup (instead of urlQueue.some)
  const queuedUrls = new Set(urlQueue.map(q => q.url));

  // Pop next N URLs from queue
  const toProcess = urlQueue.splice(0, chunkSize);
  // Remove popped URLs from the lookup set
  for (const item of toProcess) queuedUrls.delete(item.url);

  const newPages: ChunkResult['newPages'] = [];
  let loginDetected = scan.loginDetected;
  let loginUrl = scan.loginUrl;
  let loginBroadcasted = !!scan.loginDetected; // Don't re-broadcast if already detected in a previous chunk
  let loginAttempted = false; // Track if we already tried logging in this chunk
  let authResult: ChunkResult['authResult'] = undefined;

  // Edge case: empty queue
  if (toProcess.length === 0) {
    return {
      pagesProcessed: 0,
      hasMore: false,
      discovery,
      newPages: [],
      loginDetected: loginDetected || undefined,
      loginUrl: loginUrl || undefined,
    };
  }

  // Launch stealth browser for this chunk
  const browser = await createStealthBrowser();
  const context = await createStealthContext(browser);

  // Warm up session (resolve Cloudflare challenges, set cookies)
  await warmUpSession(context, scan.websiteUrl);

  // Restore cookies if available (session persistence between chunks)
  if (scan.sessionCookies) {
    await restoreCookies(context, scan.sessionCookies as string);
  }

  const page = await context.newPage();

  try {
    for (const item of toProcess) {
      // Check cancellation
      if (await isScanCancelled(scanId)) {
        break;
      }

      // Skip if already crawled, over max pages, or non-HTML resource
      if (crawledSet.has(item.url)) continue;
      if (crawledSet.size >= scan.maxPages) break;
      if (item.depth > scan.maxDepth) continue;
      if (shouldSkipCrawlUrl(item.url)) continue;

      crawledSet.add(item.url);

      // Navigate with Playwright
      // Use networkidle for homepage/first pages to catch JS-rendered links
      const isFirstPage = crawledSet.size <= 2;
      const waitUntil = isFirstPage ? 'networkidle' as const : 'domcontentloaded' as const;
      try {
        await page.goto(item.url, { waitUntil, timeout: isFirstPage ? 20000 : 15000 });
        // Extra wait for homepage to ensure SPA frameworks fully render
        if (isFirstPage) {
          await page.waitForTimeout(1500);
        }
      } catch (navError: any) {
        // If networkidle times out, the page likely loaded fine — continue
        if (isFirstPage && navError?.message?.includes('timeout')) {
          console.warn(`networkidle timeout for ${item.url}, continuing with loaded content`);
        } else {
          console.warn(`Failed to navigate to ${item.url}: ${navError?.message}`);
          continue;
        }
      }

      const finalUrl = page.url();
      if (finalUrl !== item.url) {
        crawledSet.add(finalUrl);
      }

      // Dismiss obstacles (cookie banners, popups)
      const obstacleResult = await dismissObstacles(page);
      discovery.obstaclesDismissed += obstacleResult.dismissed;

      // Simulate interactions (scroll, expand accordions, click tabs, etc.)
      const interactionResult = await simulateInteractions(page);
      discovery.totalInteractions += interactionResult.interactions;

      // Detect login page with Playwright and attempt login if credentials available
      if (!loginDetected) {
        const loginResult = await detectLoginPagePlaywright(page);
        if (loginResult.isLogin) {
          loginDetected = true;
          loginUrl = loginResult.loginUrl || item.url;

          // Attempt login if credentials are provided and we haven't tried yet
          if (credentials && !loginAttempted) {
            loginAttempted = true;
            console.log(`[ChunkProcessor] Attempting login on ${loginUrl} with provided credentials`);

            try {
              const result = await performLogin(page, loginResult, credentials.username, credentials.password);
              authResult = {
                attempted: true,
                success: result.success,
                error: result.error,
                requiresMfa: result.requiresMfa,
                requiresCaptcha: result.requiresCaptcha,
              };

              if (result.success) {
                console.log(`[ChunkProcessor] Login successful, continuing authenticated crawl`);
                discovery.authenticatedPagesCount++;
                // Broadcast auth success so frontend knows
                broadcastScanProgress(scanId, {
                  type: 'auth_success',
                  timestamp: new Date().toISOString(),
                  data: { loginUrl: loginUrl || undefined, redirectUrl: result.redirectUrl },
                }).catch(() => {});

                // After successful login, the page may have navigated — update finalUrl
                const postLoginUrl = page.url();
                if (postLoginUrl !== item.url) {
                  crawledSet.add(postLoginUrl);
                }
              } else if (result.requiresMfa) {
                console.log(`[ChunkProcessor] MFA required for login`);
                broadcastScanProgress(scanId, {
                  type: 'mfa_required',
                  timestamp: new Date().toISOString(),
                  data: { loginUrl: loginUrl || undefined },
                }).catch(() => {});
              } else if (result.requiresCaptcha) {
                console.log(`[ChunkProcessor] CAPTCHA detected on login page`);
                broadcastScanProgress(scanId, {
                  type: 'captcha_detected',
                  timestamp: new Date().toISOString(),
                  data: { loginUrl: loginUrl || undefined },
                }).catch(() => {});
              } else {
                console.log(`[ChunkProcessor] Login failed: ${result.error}`);
                broadcastScanProgress(scanId, {
                  type: 'auth_failed',
                  timestamp: new Date().toISOString(),
                  data: { loginUrl: loginUrl || undefined, error: result.error },
                }).catch(() => {});
              }
            } catch (loginError: any) {
              console.error(`[ChunkProcessor] Login error: ${loginError?.message}`);
              authResult = { attempted: true, success: false, error: loginError?.message };
            }
          }
        }
      }

      // Extract page data via page.evaluate() — enhanced link discovery
      const pageData = await page.evaluate(() => {
        const title = document.title || undefined;
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined;
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined;
        const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined;
        const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute('content') || undefined;

        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => ({
          level: parseInt(h.tagName.replace('H', '')),
          text: h.textContent?.trim()?.slice(0, 100) || '',
        }));

        const hasForm = !!document.querySelector('form');
        const hasCTA = !!(document.querySelector('a[href*="signup"], a[href*="register"], a[href*="buy"], a[href*="get-started"], button:not([type="submit"])'));
        const hasVideo = !!(document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]'));
        const hasPhoneLink = !!document.querySelector('a[href^="tel:"]');
        const hasEmailLink = !!document.querySelector('a[href^="mailto:"]');
        const hasDownloadLink = !!document.querySelector('a[href$=".pdf"], a[href$=".zip"], a[download]');

        const mainContent = document.querySelector('main, article, [role="main"], .content, #content');
        const contentSummary = (mainContent?.textContent || document.body?.textContent || '').trim().slice(0, 2000);

        // --- Enhanced link discovery ---
        const allLinks = new Set<string>();
        const base = window.location.href;

        const addUrl = (href: string) => {
          try {
            const url = new URL(href, base);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
              allLinks.add(url.href);
            }
          } catch { /* invalid URL */ }
        };

        // 1. Standard <a href> links
        Array.from(document.querySelectorAll('a[href]')).forEach(a => {
          const href = a.getAttribute('href');
          if (href) addUrl(href);
        });

        // 2. data-href, data-url, data-link attributes (used by frameworks/components)
        Array.from(document.querySelectorAll('[data-href], [data-url], [data-link]')).forEach(el => {
          const href = el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('data-link');
          if (href) addUrl(href);
        });

        // 3. Image map area links
        Array.from(document.querySelectorAll('area[href]')).forEach(area => {
          const href = area.getAttribute('href');
          if (href) addUrl(href);
        });

        // 4. <link> elements (canonical, alternate, prerender)
        Array.from(document.querySelectorAll('link[rel="alternate"][href], link[rel="canonical"][href], link[rel="prerender"][href]')).forEach(link => {
          const href = link.getAttribute('href');
          if (href) addUrl(href);
        });

        // 5. Next.js route manifest
        const nextData = (window as any).__NEXT_DATA__;
        if (nextData?.buildManifest?.sortedPages) {
          for (const route of nextData.buildManifest.sortedPages) {
            if (!route.startsWith('/_') && !route.startsWith('/api/')) {
              addUrl(route);
            }
          }
        }
        // Also check Next.js page list
        if (nextData?.props?.pageProps) {
          const props = nextData.props.pageProps;
          // Some Next.js apps expose navigation/page lists in props
          const findUrls = (obj: any, depth: number) => {
            if (depth > 3 || !obj) return;
            if (typeof obj === 'string' && (obj.startsWith('/') || obj.startsWith('http'))) {
              addUrl(obj);
            }
            if (Array.isArray(obj)) {
              obj.forEach(item => findUrls(item, depth + 1));
            } else if (typeof obj === 'object') {
              for (const key of ['url', 'href', 'path', 'slug', 'link', 'route']) {
                if (obj[key] && typeof obj[key] === 'string') addUrl(obj[key]);
              }
            }
          };
          findUrls(props, 0);
        }

        // 6. Nuxt.js routes
        const nuxtData = (window as any).__NUXT__;
        if (nuxtData?.routeMap) {
          for (const route of Object.keys(nuxtData.routeMap)) {
            addUrl(route);
          }
        }

        // 7. onclick/data-navigate with URL patterns
        Array.from(document.querySelectorAll('[onclick], [data-navigate]')).forEach(el => {
          const handler = el.getAttribute('onclick') || el.getAttribute('data-navigate') || '';
          const urlMatches = handler.match(/['"](\/?[a-zA-Z][\w\-/]*(?:\?[^'"]*)?)['"]/g);
          if (urlMatches) {
            for (const match of urlMatches) {
              const path = match.slice(1, -1);
              if (path.startsWith('/') && !path.startsWith('//')) addUrl(path);
            }
          }
        });

        // 8. Meta refresh redirects
        const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
        if (metaRefresh) {
          const content = metaRefresh.getAttribute('content') || '';
          const urlMatch = content.match(/url=(.+)/i);
          if (urlMatch) addUrl(urlMatch[1].trim());
        }

        return {
          title: title || null,
          metaTags: { title, description: metaDesc, ogTitle, ogDescription: ogDesc, ogType },
          headings,
          hasForm,
          hasCTA,
          hasVideo,
          hasPhoneLink,
          hasEmailLink,
          hasDownloadLink,
          contentSummary,
          links: Array.from(allLinks),
        };
      });

      // Build the CrawledPage
      const crawledPage: CrawledPage = {
        url: finalUrl,
        title: pageData.title,
        depth: item.depth,
        pageType: classifyPageType(finalUrl, pageData),
        hasForm: pageData.hasForm,
        hasCTA: pageData.hasCTA,
        hasVideo: pageData.hasVideo,
        hasPhoneLink: pageData.hasPhoneLink,
        hasEmailLink: pageData.hasEmailLink,
        hasDownloadLink: pageData.hasDownloadLink,
        importanceScore: null,
        metaTags: pageData.metaTags,
        headings: pageData.headings,
        contentSummary: pageData.contentSummary,
        isAuthenticated: false,
        templateGroup: detectTemplateGroup(finalUrl),
        scrollableHeight: interactionResult.scrollableHeight,
        interactiveElementCount: interactionResult.interactions,
        obstaclesEncountered: obstacleResult.obstacles,
        links: pageData.links,
        elements: [],
      };

      // Save to DB with new V2 fields
      await prisma.scanPage.create({
        data: {
          scanId,
          url: crawledPage.url,
          title: crawledPage.title,
          depth: crawledPage.depth,
          pageType: crawledPage.pageType,
          hasForm: crawledPage.hasForm,
          hasCTA: crawledPage.hasCTA,
          hasVideo: crawledPage.hasVideo,
          hasPhoneLink: crawledPage.hasPhoneLink,
          hasEmailLink: crawledPage.hasEmailLink,
          hasDownloadLink: crawledPage.hasDownloadLink,
          importanceScore: crawledPage.importanceScore,
          metaTags: crawledPage.metaTags as any,
          headings: crawledPage.headings as any,
          contentSummary: crawledPage.contentSummary,
          isAuthenticated: crawledPage.isAuthenticated || false,
          templateGroup: crawledPage.templateGroup,
          scrollableHeight: crawledPage.scrollableHeight,
          interactiveElementCount: crawledPage.interactiveElementCount,
          obstaclesEncountered: crawledPage.obstaclesEncountered as any,
        },
      });

      newPages.push({
        url: crawledPage.url,
        title: crawledPage.title,
        pageType: crawledPage.pageType,
        hasForm: crawledPage.hasForm,
        hasCTA: crawledPage.hasCTA,
      });

      // Broadcast per-page progress (non-blocking)
      broadcastScanProgress(scanId, pageCrawledEvent(
        crawledPage.url,
        crawledPage.title,
        crawledPage.pageType,
        crawledSet.size,
        crawledSet.size + urlQueue.length,
        crawledPage.hasForm,
        crawledPage.hasCTA,
      )).catch(() => {});

      // Broadcast login detection (fires when login is detected on current page OR via link discovery)
      if (loginDetected && !loginBroadcasted) {
        loginBroadcasted = true;
        broadcastScanProgress(scanId, {
          type: 'login_detected',
          timestamp: new Date().toISOString(),
          data: {
            loginUrl: loginUrl || undefined,
            pagesProcessed: crawledSet.size,
            totalDiscovered: crawledSet.size + urlQueue.length,
            phase: 'phase1',
          },
        }).catch(() => {});
      }

      // Detect technologies (mainly on first few pages)
      if (crawledSet.size <= 3) {
        const html = await page.content();
        const techResult = detectFromHTML(html, {});
        const summary = summarizeTechnologies(techResult);
        mergeTechnologies(discovery, summary, techResult);
      }

      // Extract priority elements from HTML
      const html = await page.content();
      const root = parse(html, { comment: false, blockTextElements: { script: false, style: false } });
      const priorityEls = extractPriorityElements(item.url, root);
      mergePriorityElements(discovery, priorityEls, crawledPage);

      // Update page types count
      const pageType = crawledPage.pageType || 'other';
      discovery.pageTypes[pageType] = (discovery.pageTypes[pageType] || 0) + 1;

      // Add discovered URLs from page links + interactions (combined, deduplicated)
      const allDiscoveredLinks = [...pageData.links, ...interactionResult.discoveredUrls];
      for (const rawLink of allDiscoveredLinks) {
        const link = normalizeCrawlUrl(rawLink);
        if (!link) continue;
        if (crawledSet.has(link) || queuedUrls.has(link)) continue;
        if (shouldSkipCrawlUrl(link)) continue;
        try {
          const linkDomain = getBaseDomain(new URL(link).hostname);
          if (linkDomain === baseDomain) {
            urlQueue.push({ url: link, depth: item.depth + 1, source: 'crawl' });
            queuedUrls.add(link);
          }
        } catch { /* skip */ }

        // Detect login URLs from discovered links (catch login pages before visiting them)
        if (!loginDetected && link) {
          try {
            if (isLoginUrlCheck(link)) {
              loginDetected = true;
              loginUrl = link;
            }
          } catch { /* skip */ }
        }
      }

      // Update URL patterns (sample)
      if (discovery.urlPatterns.length < 30) {
        try {
          discovery.urlPatterns.push(new URL(item.url).pathname);
        } catch { /* skip */ }
      }
    }

    // Serialize cookies for session persistence between chunks
    const serializedCookies = await serializeCookies(context);

    // Determine if there are more pages to process
    const hasMore = urlQueue.length > 0 && crawledSet.size < scan.maxPages;
    discovery.totalUrlsDiscovered = crawledSet.size + urlQueue.length;

    // Save state back to DB with V2 fields
    await prisma.siteScan.update({
      where: { id: scanId },
      data: {
        urlQueue: urlQueue as any,
        crawledUrls: Array.from(crawledSet) as any,
        liveDiscovery: discovery as any,
        totalUrlsFound: discovery.totalUrlsDiscovered,
        loginDetected,
        loginUrl,
        totalPagesScanned: crawledSet.size,
        status: hasMore ? 'CRAWLING' : 'CRAWLING',
        sessionCookies: serializedCookies as any,
        obstaclesDismissed: discovery.obstaclesDismissed,
        totalInteractions: discovery.totalInteractions,
        authenticatedPagesCount: discovery.authenticatedPagesCount,
      },
    });

    // Broadcast chunk completion (non-blocking)
    broadcastScanProgress(scanId, chunkCompleteEvent(
      crawledSet.size,
      discovery.totalUrlsDiscovered,
      'phase1',
    )).catch(() => {});

    return {
      pagesProcessed: newPages.length,
      hasMore,
      discovery,
      newPages,
      loginDetected: loginDetected || undefined,
      loginUrl: loginUrl || undefined,
      obstaclesDismissed: discovery.obstaclesDismissed,
      interactionsPerformed: discovery.totalInteractions,
      authenticatedPages: discovery.authenticatedPagesCount,
      authResult,
    };
  } finally {
    await browser.close();
  }
}

// ========================================
// Phase 1 HTML-First Chunk Processing
// ========================================

/**
 * Process a chunk of Phase 1 pages using fetch + node-html-parser (no Playwright).
 * 10-50x faster than Playwright-based crawling. Processes 25 URLs per chunk.
 */
export async function processPhase1Chunk(
  scanId: string,
  chunkSize: number = 25,
  credentials?: { username: string; password: string } | null,
): Promise<ChunkResult> {
  const scan = await prisma.siteScan.findUnique({
    where: { id: scanId },
    select: {
      id: true,
      status: true,
      websiteUrl: true,
      maxPages: true,
      maxDepth: true,
      urlQueue: true,
      crawledUrls: true,
      liveDiscovery: true,
      totalUrlsFound: true,
      loginDetected: true,
      loginUrl: true,
    },
  });

  if (!scan) throw new Error('Scan not found');
  if (TERMINAL_STATUSES.includes(scan.status)) {
    throw new Error(`Scan is in terminal state: ${scan.status}`);
  }

  // Deserialize state
  const urlQueue: UrlQueueItem[] = (scan.urlQueue as unknown as UrlQueueItem[]) || [];
  const crawledUrls: string[] = (scan.crawledUrls as unknown as string[]) || [];
  const crawledSet = new Set(crawledUrls);
  const discovery: LiveDiscovery = (scan.liveDiscovery as unknown as LiveDiscovery) || createEmptyDiscovery();

  const baseUrl = new URL(scan.websiteUrl);
  const baseDomain = getBaseDomain(baseUrl.hostname);

  // Build a Set of queued URLs for O(1) lookup
  const queuedUrls = new Set(urlQueue.map(q => q.url));

  // Pop next N URLs from queue
  const toProcess = urlQueue.splice(0, chunkSize);
  for (const item of toProcess) queuedUrls.delete(item.url);

  const newPages: ChunkResult['newPages'] = [];
  let loginDetected = scan.loginDetected;
  let loginUrl = scan.loginUrl;
  let loginBroadcasted = !!scan.loginDetected; // Don't re-broadcast if already detected in a previous chunk

  // Edge case: empty queue
  if (toProcess.length === 0) {
    return {
      pagesProcessed: 0,
      hasMore: false,
      discovery,
      newPages: [],
      loginDetected: loginDetected || undefined,
      loginUrl: loginUrl || undefined,
    };
  }

  let consecutiveFailures = 0;

  for (const item of toProcess) {
    // Check cancellation
    if (await isScanCancelled(scanId)) {
      break;
    }

    // Skip if already crawled, over max pages, or non-HTML resource
    if (crawledSet.has(item.url)) continue;
    if (crawledSet.size >= scan.maxPages) break;
    if (item.depth > scan.maxDepth) continue;
    if (shouldSkipCrawlUrl(item.url)) continue;

    crawledSet.add(item.url);

    // Wrap page crawl in try/catch for error resilience
    try {
      // Fetch page HTML (no Playwright)
      const fetchResult = await fetchPage(item.url);
      if (!fetchResult) {
        // Fetch failed — skip but don't break the loop
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          console.warn(`3 consecutive page failures detected in scan ${scanId}, continuing...`);
        }
        continue;
      }

      const finalUrl = fetchResult.redirectUrl || item.url;
      if (finalUrl !== item.url) {
        crawledSet.add(finalUrl);
      }

      // Parse the HTML into a CrawledPage
      const crawledPage = parsePage(finalUrl, fetchResult.html, item.depth, fetchResult.headers);

      // Detect login page from HTML
      if (!loginDetected) {
        const loginResult = detectLoginPageHTML(fetchResult.html, finalUrl);
        if (loginResult.isLogin) {
          loginDetected = true;
          loginUrl = loginResult.loginUrl || finalUrl;
        }
      }

      // Save to DB
      await prisma.scanPage.create({
        data: {
          scanId,
          url: crawledPage.url,
          title: crawledPage.title,
          depth: crawledPage.depth,
          pageType: crawledPage.pageType,
          hasForm: crawledPage.hasForm,
          hasCTA: crawledPage.hasCTA,
          hasVideo: crawledPage.hasVideo,
          hasPhoneLink: crawledPage.hasPhoneLink,
          hasEmailLink: crawledPage.hasEmailLink,
          hasDownloadLink: crawledPage.hasDownloadLink,
          importanceScore: crawledPage.importanceScore,
          metaTags: crawledPage.metaTags as any,
          headings: crawledPage.headings as any,
          contentSummary: crawledPage.contentSummary,
          isAuthenticated: false,
          templateGroup: detectTemplateGroup(finalUrl),
        },
      });

      newPages.push({
        url: crawledPage.url,
        title: crawledPage.title,
        pageType: crawledPage.pageType,
        hasForm: crawledPage.hasForm,
        hasCTA: crawledPage.hasCTA,
      });

      // Broadcast per-page progress (non-blocking)
      broadcastScanProgress(scanId, pageCrawledEvent(
        crawledPage.url,
        crawledPage.title,
        crawledPage.pageType,
        crawledSet.size,
        crawledSet.size + urlQueue.length,
        crawledPage.hasForm,
        crawledPage.hasCTA,
      )).catch(() => {});

      // Broadcast login detection (fires when login is detected on current page OR via link discovery)
      if (loginDetected && !loginBroadcasted) {
        loginBroadcasted = true;
        broadcastScanProgress(scanId, {
          type: 'login_detected',
          timestamp: new Date().toISOString(),
          data: {
            loginUrl: loginUrl || undefined,
            pagesProcessed: crawledSet.size,
            totalDiscovered: crawledSet.size + urlQueue.length,
            phase: 'phase1',
          },
        }).catch(() => {});
      }

      // Detect technologies (mainly on first few pages)
      if (crawledSet.size <= 3) {
        const techResult = detectFromHTML(fetchResult.html, fetchResult.headers);
        const summary = summarizeTechnologies(techResult);
        mergeTechnologies(discovery, summary, techResult);
      }

      // Extract priority elements from HTML
      const root = parse(fetchResult.html, { comment: false, blockTextElements: { script: false, style: false } });
      const priorityEls = extractPriorityElements(finalUrl, root);
      mergePriorityElements(discovery, priorityEls, crawledPage);

      // Update page types count
      const pageType = crawledPage.pageType || 'other';
      discovery.pageTypes[pageType] = (discovery.pageTypes[pageType] || 0) + 1;

      // Add discovered URLs from page links
      for (const link of crawledPage.links || []) {
        const normalized = normalizeCrawlUrl(link);
        if (!normalized) continue;
        if (crawledSet.has(normalized) || queuedUrls.has(normalized)) continue;
        if (shouldSkipCrawlUrl(normalized)) continue;
        try {
          const linkDomain = getBaseDomain(new URL(normalized).hostname);
          if (linkDomain === baseDomain) {
            urlQueue.push({ url: normalized, depth: item.depth + 1, source: 'crawl' });
            queuedUrls.add(normalized);
          }
        } catch { /* skip */ }

        // Detect login URLs from discovered links (catch login pages before visiting them)
        if (!loginDetected && normalized) {
          try {
            if (isLoginUrlCheck(normalized)) {
              loginDetected = true;
              loginUrl = normalized;
            }
          } catch { /* skip */ }
        }
      }

      // Update URL patterns (sample)
      if (discovery.urlPatterns.length < 30) {
        try {
          discovery.urlPatterns.push(new URL(finalUrl).pathname);
        } catch { /* skip */ }
      }

      // Reset consecutive failures counter on success
      consecutiveFailures = 0;
    } catch (error: any) {
      // Log per-page error and continue with next page
      console.warn(`Error processing page ${item.url} in scan ${scanId}: ${error?.message || String(error)}`);
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        console.warn(`3 consecutive page failures detected in scan ${scanId}, continuing with remaining pages...`);
      }
      // Continue with next page without throwing
      continue;
    }
  }

  // Determine if there are more pages to process
  const hasMore = urlQueue.length > 0 && crawledSet.size < scan.maxPages;
  discovery.totalUrlsDiscovered = crawledSet.size + urlQueue.length;

  // Save state back to DB
  await prisma.siteScan.update({
    where: { id: scanId },
    data: {
      urlQueue: urlQueue as any,
      crawledUrls: Array.from(crawledSet) as any,
      liveDiscovery: discovery as any,
      totalUrlsFound: discovery.totalUrlsDiscovered,
      loginDetected,
      loginUrl,
      totalPagesScanned: crawledSet.size,
      status: 'CRAWLING',
    },
  });

  // Broadcast chunk completion (non-blocking)
  broadcastScanProgress(scanId, chunkCompleteEvent(
    crawledSet.size,
    discovery.totalUrlsDiscovered,
    'phase1',
  )).catch(() => {});

  return {
    pagesProcessed: newPages.length,
    hasMore,
    discovery,
    newPages,
    loginDetected: loginDetected || undefined,
    loginUrl: loginUrl || undefined,
  };
}

// ========================================
// Phase 2 Chunk Processing
// ========================================

/**
 * Process a chunk of Phase 2 pages (Playwright element extraction + tracking detection).
 */
export async function processPhase2Chunk(
  scanId: string,
  chunkSize: number = 5,
): Promise<Phase2ChunkResult> {
  const scan = await prisma.siteScan.findUnique({
    where: { id: scanId },
    select: {
      id: true,
      status: true,
      websiteUrl: true,
      confirmedNiche: true,
    },
  });

  if (!scan) throw new Error('Scan not found');
  if (TERMINAL_STATUSES.includes(scan.status)) {
    throw new Error(`Scan is in terminal state: ${scan.status}`);
  }

  const niche = scan.confirmedNiche || 'other';

  // Get pages that haven't been deeply analyzed yet
  // Track by importanceScore: null means not yet analyzed in Phase 2
  const allPages = await prisma.scanPage.findMany({
    where: { scanId },
    orderBy: { depth: 'asc' },
  });

  // Deduplicate by template group — only analyze one representative per template
  const analyzedTemplates = new Set(
    allPages.filter(p => p.importanceScore !== null && p.templateGroup)
      .map(p => p.templateGroup!)
  );

  const unanalyzedPages = allPages.filter(p => {
    if (p.importanceScore !== null) return false;
    // Skip pages whose template group was already analyzed
    if (p.templateGroup && analyzedTemplates.has(p.templateGroup)) return false;
    return true;
  });

  const pagesToProcess = unanalyzedPages.slice(0, chunkSize);

  // Track templates being processed in this chunk to avoid duplicates within chunk
  for (const page of pagesToProcess) {
    if (page.templateGroup) analyzedTemplates.add(page.templateGroup);
  }

  if (pagesToProcess.length === 0) {
    // Mark all remaining template-duplicate pages as analyzed
    const templateDupes = allPages.filter(p =>
      p.importanceScore === null && p.templateGroup && analyzedTemplates.has(p.templateGroup)
    );
    if (templateDupes.length > 0) {
      await prisma.scanPage.updateMany({
        where: { id: { in: templateDupes.map(p => p.id) } },
        data: { importanceScore: 0 },
      });
    }
    return { pagesProcessed: 0, hasMore: false, newRecommendations: 0 };
  }

  const pageUrls = pagesToProcess.map(p => p.url);

  // Extract interactive elements with Playwright
  const elements = await extractElements(scan.websiteUrl, pageUrls);

  // Build CrawledPage objects
  const crawledPages: CrawledPage[] = pagesToProcess.map(sp => ({
    url: sp.url,
    title: sp.title,
    depth: sp.depth,
    pageType: sp.pageType,
    hasForm: sp.hasForm,
    hasCTA: sp.hasCTA,
    hasVideo: sp.hasVideo,
    hasPhoneLink: sp.hasPhoneLink,
    hasEmailLink: sp.hasEmailLink,
    hasDownloadLink: sp.hasDownloadLink,
    importanceScore: sp.importanceScore,
    metaTags: sp.metaTags as any,
    headings: sp.headings as any,
    contentSummary: sp.contentSummary,
    links: [],
    elements: elements.get(sp.url) || [],
  }));

  // Detect tracking opportunities
  const opportunities = await detectOpportunities(crawledPages, elements, niche);

  // Add behavioral tracking opportunities
  const behavioralOpps = createBehavioralOpportunities(niche, scan.websiteUrl);
  const allOpportunities = [...opportunities, ...behavioralOpps];

  // Save recommendations
  let newRecommendations = 0;
  if (allOpportunities.length > 0) {
    // Deduplicate with existing recommendations
    const existingRecs = await prisma.trackingRecommendation.findMany({
      where: { scanId },
      select: { trackingType: true, name: true, selector: true, urlPattern: true, pageUrl: true },
    });
    const existingKeys = new Set(
      existingRecs.map(r => {
        // For behavioral trackings (urlPattern='.*', no selector), dedup by type+name
        if (r.urlPattern === '.*' && !r.selector) {
          return `${r.trackingType}:${r.name}`;
        }
        return `${r.trackingType}:${r.pageUrl}:${r.selector || r.urlPattern || ''}`;
      })
    );

    const newOpps = allOpportunities.filter(opp => {
      // For behavioral trackings, dedup by type+name (site-wide, not page-specific)
      if (opp.urlPattern === '.*' && !opp.selector) {
        const key = `${opp.trackingType}:${opp.name}`;
        return !existingKeys.has(key);
      }
      const key = `${opp.trackingType}:${opp.pageUrl}:${opp.selector || opp.urlPattern || ''}`;
      return !existingKeys.has(key);
    });

    if (newOpps.length > 0) {
      await prisma.trackingRecommendation.createMany({
        data: newOpps.map(opp => ({
          scanId,
          name: opp.name,
          description: opp.description,
          trackingType: opp.trackingType,
          severity: opp.severity,
          severityReason: opp.severityReason,
          selector: opp.selector,
          selectorConfig: opp.selectorConfig as any,
          selectorConfidence: opp.selectorConfidence,
          urlPattern: opp.urlPattern,
          pageUrl: opp.pageUrl,
          funnelStage: opp.funnelStage,
          elementContext: opp.elementContext as any,
          suggestedConfig: opp.suggestedConfig as any,
          suggestedGA4EventName: opp.suggestedGA4EventName,
          suggestedDestinations: opp.suggestedDestinations as any,
          aiGenerated: opp.aiGenerated,
          businessValue: opp.businessValue || null,
          implementationNotes: opp.implementationNotes || null,
          affectedRoutes: opp.affectedRoutes as any || null,
        })),
      });
      newRecommendations = newOpps.length;
    }
  }

  // Mark processed pages as analyzed (set importanceScore to 0 as placeholder; finalize recalculates)
  await prisma.scanPage.updateMany({
    where: { id: { in: pagesToProcess.map(p => p.id) } },
    data: { importanceScore: 0 },
  });

  const remainingUnanalyzed = unanalyzedPages.length - pagesToProcess.length;
  const hasMore = remainingUnanalyzed > 0;

  return {
    pagesProcessed: pagesToProcess.length,
    hasMore,
    newRecommendations,
  };
}

// ========================================
// Helpers
// ========================================

export function createEmptyDiscovery(): LiveDiscovery {
  return {
    technologies: {
      cms: null,
      framework: null,
      analytics: [],
      ecommerce: null,
      cdn: null,
    },
    priorityElements: {
      forms: [],
      ctas: [],
      cartPages: [],
      productPages: [],
      checkoutPages: [],
      loginPages: [],
      videoEmbeds: [],
      phoneLinks: [],
      emailLinks: [],
    },
    pageTypes: {},
    urlPatterns: [],
    sitemapFound: false,
    robotsFound: false,
    totalUrlsDiscovered: 0,
    obstaclesDismissed: 0,
    totalInteractions: 0,
    authenticatedPagesCount: 0,
  };
}

function mergeTechnologies(
  discovery: LiveDiscovery,
  summary: ReturnType<typeof summarizeTechnologies>,
  techResult: { technologies: any[]; existingTracking: any[] },
) {
  if (summary.cms && !discovery.technologies.cms) {
    discovery.technologies.cms = summary.cms;
  }
  if (summary.framework && !discovery.technologies.framework) {
    discovery.technologies.framework = summary.framework;
  }
  if (summary.ecommerce && !discovery.technologies.ecommerce) {
    discovery.technologies.ecommerce = summary.ecommerce;
  }
  if (summary.cdn && !discovery.technologies.cdn) {
    discovery.technologies.cdn = summary.cdn;
  }
  // Merge analytics (deduplicate)
  const existingAnalytics = new Set(discovery.technologies.analytics);
  for (const a of summary.analytics) {
    if (!existingAnalytics.has(a)) {
      discovery.technologies.analytics.push(a);
      existingAnalytics.add(a);
    }
  }
}

function mergePriorityElements(
  discovery: LiveDiscovery,
  elements: ReturnType<typeof extractPriorityElements>,
  page: CrawledPage,
) {
  discovery.priorityElements.forms.push(...elements.forms);
  discovery.priorityElements.ctas.push(...elements.ctas);
  discovery.priorityElements.videoEmbeds.push(...elements.videoEmbeds);
  discovery.priorityElements.phoneLinks.push(...elements.phoneLinks);
  discovery.priorityElements.emailLinks.push(...elements.emailLinks);

  // Track special page types
  if (page.pageType === 'cart') {
    discovery.priorityElements.cartPages.push(page.url);
  }
  if (page.pageType === 'product') {
    discovery.priorityElements.productPages.push(page.url);
  }
  if (page.pageType === 'checkout') {
    discovery.priorityElements.checkoutPages.push(page.url);
  }
  if (page.pageType === 'login') {
    discovery.priorityElements.loginPages.push(page.url);
  }
}

function getBaseDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

function classifyPageType(url: string, pageData: any): string | null {
  const parsed = new URL(url);
  // Use hash path for hash-based routing (e.g. /#/about), fallback to pathname
  const path = (parsed.hash.startsWith('#/') ? parsed.hash.slice(1) : parsed.pathname).toLowerCase();
  if (/\/(checkout|pay|payment)/i.test(path)) return 'checkout';
  if (/\/(cart|basket|bag)/i.test(path)) return 'cart';
  if (/\/(product|item|shop)\//i.test(path)) return 'product';
  if (/\/(pricing|plans)/i.test(path)) return 'pricing';
  if (/\/(contact|reach-us)/i.test(path)) return 'contact';
  if (/\/(about|team)/i.test(path)) return 'about';
  if (/\/(blog|article|post|news)/i.test(path)) return 'blog';
  if (LOGIN_CLASSIFY_PATTERNS.some(r => r.test(path))) return 'login';
  if (/\/(signup|register|sign-up)/i.test(path)) return 'signup';
  if (/\/(faq|help|support)/i.test(path)) return 'faq';
  if (/\/(services|solutions)/i.test(path)) return 'services';
  if (/\/(demo|request-demo)/i.test(path)) return 'demo';
  if (/\/(terms|privacy|legal|policy)/i.test(path)) return 'terms';
  if ((path === '/' || path === '') && !parsed.hash) return 'homepage';
  if (/\/(categor|collection)/i.test(path)) return 'category';
  return 'other';
}

function detectTemplateGroup(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    // Handle hash-based routing (e.g. /#/product/shoe-1)
    const path = parsed.hash.startsWith('#/') ? parsed.hash.slice(1) : parsed.pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return undefined;

    // Replace likely dynamic segments with {param}
    const normalized = segments.map((seg, i) => {
      if (i === 0) return seg; // Keep first segment literal (e.g., "product", "blog")
      // UUID pattern
      if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg)) return '{id}';
      // Numeric ID
      if (/^\d+$/.test(seg)) return '{id}';
      // Slug-like with numbers (e.g., "shoe-123", "product-abc-456")
      if (/\d/.test(seg) && /^[a-z0-9][\w-]*$/i.test(seg)) return '{slug}';
      // Very long slugs (likely dynamic content)
      if (/^[a-z0-9-]+$/i.test(seg) && seg.length > 30) return '{slug}';
      return seg;
    });

    const result = '/' + normalized.join('/');
    // Only return template group if at least one segment was parameterized
    if (result !== '/' + segments.join('/')) return result;
    // Still return the pattern for multi-segment paths (enables grouping by prefix)
    return '/' + segments.join('/');
  } catch {
    return undefined;
  }
}

/**
 * Normalize a discovered URL for deduplication and queue insertion.
 * - Preserves hash for hash-based routing (#/path)
 * - Strips in-page anchors (#section)
 * - Removes tracking query params
 * - Normalizes trailing slashes
 */
function normalizeCrawlUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Only HTTP(S)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    // Preserve hash for hash-based routing (#/path), strip in-page anchors
    if (parsed.hash && !parsed.hash.startsWith('#/')) {
      parsed.hash = '';
    }
    // Normalize pathname
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    // Remove tracking/session query params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ref', 'mc_cid', 'mc_eid'];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check if a URL should be skipped for crawling (non-HTML resources, admin pages, etc.)
 */
function shouldSkipCrawlUrl(url: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(url));
}
