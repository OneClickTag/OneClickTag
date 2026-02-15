/**
 * Chunk Processor - Stateful chunked crawl orchestrator.
 * Client drives the loop by calling /process-chunk repeatedly.
 * Each call processes a small batch within Vercel's 30s timeout.
 */

import { parse } from 'node-html-parser';
import { chromium } from 'playwright-core';
import { prisma } from '@/lib/prisma';
import { SiteScanStatus } from '@prisma/client';
import {
  CrawledPage,
  ExtractedElement,
} from '../interfaces';
import { parsePage, discoverLinks, extractPriorityElements } from './html-crawler';
import { detectFromHTML, summarizeTechnologies } from './html-technology-detector';
import { extractElements } from './crawl-engine';
import { detectOpportunities } from './tracking-detector';
import { processRecommendations } from './recommendation-engine';
import { isScanCancelled } from './site-scanner';
import { dismissObstacles } from './obstacle-handler';
import { simulateInteractions } from './interaction-simulator';
import { detectLoginPage as detectLoginPagePlaywright, serializeCookies, restoreCookies } from './auth-handler';
import { createBehavioralOpportunities } from '../constants/behavioral-tracking';

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
 */
export async function processPhase1Chunk(
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

  // Pop next N URLs from queue
  const toProcess = urlQueue.splice(0, chunkSize);
  const newPages: ChunkResult['newPages'] = [];
  let loginDetected = scan.loginDetected;
  let loginUrl = scan.loginUrl;

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

  // Launch Playwright browser for this chunk
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
    viewport: { width: 1280, height: 720 },
  });

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

      // Skip if already crawled or over max pages
      if (crawledSet.has(item.url)) continue;
      if (crawledSet.size >= scan.maxPages) break;
      if (item.depth > scan.maxDepth) continue;

      crawledSet.add(item.url);

      // Navigate with Playwright
      try {
        await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (navError: any) {
        console.warn(`Failed to navigate to ${item.url}: ${navError?.message}`);
        continue;
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

      // Detect login page with Playwright
      if (!loginDetected) {
        const loginResult = await detectLoginPagePlaywright(page);
        if (loginResult.isLogin) {
          loginDetected = true;
          loginUrl = loginResult.loginUrl || item.url;
        }
      }

      // Extract page data via page.evaluate()
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
        const contentSummary = (mainContent?.textContent || document.body?.textContent || '').trim().slice(0, 500);

        // Collect links
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => {
            try { return new URL(a.getAttribute('href') || '', window.location.href).href; } catch { return null; }
          })
          .filter((h): h is string => h !== null && h.startsWith('http'));

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
          links: Array.from(new Set(links)),
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

      // Add discovered URLs from page links
      for (const link of pageData.links) {
        if (!crawledSet.has(link) && !urlQueue.some(q => q.url === link)) {
          try {
            const linkDomain = getBaseDomain(new URL(link).hostname);
            if (linkDomain === baseDomain) {
              urlQueue.push({ url: link, depth: item.depth + 1, source: 'crawl' });
            }
          } catch { /* skip */ }
        }
      }

      // Add discovered URLs from interactions
      for (const discoveredUrl of interactionResult.discoveredUrls) {
        if (!crawledSet.has(discoveredUrl) && !urlQueue.some(q => q.url === discoveredUrl)) {
          try {
            const linkDomain = getBaseDomain(new URL(discoveredUrl).hostname);
            if (linkDomain === baseDomain) {
              urlQueue.push({ url: discoveredUrl, depth: item.depth + 1, source: 'crawl' });
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
    };
  } finally {
    await browser.close();
  }
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
  // We track this by checking which pages don't have recommendations yet
  const allPages = await prisma.scanPage.findMany({
    where: { scanId },
    orderBy: { importanceScore: 'desc' },
  });

  const existingRecPages = await prisma.trackingRecommendation.findMany({
    where: { scanId },
    select: { pageUrl: true },
  });
  const analyzedUrls = new Set(existingRecPages.map(r => r.pageUrl).filter(Boolean));

  const unanalyzedPages = allPages.filter(p => !analyzedUrls.has(p.url));
  const pagesToProcess = unanalyzedPages.slice(0, chunkSize);

  if (pagesToProcess.length === 0) {
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
      select: { trackingType: true, selector: true, urlPattern: true, pageUrl: true },
    });
    const existingKeys = new Set(
      existingRecs.map(r => `${r.trackingType}:${r.pageUrl}:${r.selector || r.urlPattern || ''}`)
    );

    const newOpps = allOpportunities.filter(opp => {
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
  const path = new URL(url).pathname.toLowerCase();
  if (/\/(checkout|pay|payment)/i.test(path)) return 'checkout';
  if (/\/(cart|basket|bag)/i.test(path)) return 'cart';
  if (/\/(product|item|shop)\//i.test(path)) return 'product';
  if (/\/(pricing|plans)/i.test(path)) return 'pricing';
  if (/\/(contact|reach-us)/i.test(path)) return 'contact';
  if (/\/(about|team)/i.test(path)) return 'about';
  if (/\/(blog|article|post|news)/i.test(path)) return 'blog';
  if (/\/(login|signin|sign-in)/i.test(path)) return 'login';
  if (/\/(signup|register|sign-up)/i.test(path)) return 'signup';
  if (/\/(faq|help|support)/i.test(path)) return 'faq';
  if (/\/(services|solutions)/i.test(path)) return 'services';
  if (/\/(demo|request-demo)/i.test(path)) return 'demo';
  if (/\/(terms|privacy|legal|policy)/i.test(path)) return 'terms';
  if (path === '/' || path === '') return 'homepage';
  if (/\/(categor|collection)/i.test(path)) return 'category';
  return 'other';
}

function detectTemplateGroup(url: string): string | undefined {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return `/${segments[0]}/`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
