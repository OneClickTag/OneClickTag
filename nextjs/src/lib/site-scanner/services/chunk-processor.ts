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
} from '../interfaces';
import { fetchPage, parsePage, discoverLinks, detectLoginPage, extractPriorityElements } from './html-crawler';
import { detectFromHTML, summarizeTechnologies } from './html-technology-detector';
import { extractElements } from './crawl-engine';
import { detectOpportunities } from './tracking-detector';
import { processRecommendations } from './recommendation-engine';
import { isScanCancelled } from './site-scanner';

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
 * Process a chunk of Phase 1 pages (fetch HTML, parse, detect tech, discover links).
 */
export async function processPhase1Chunk(
  scanId: string,
  chunkSize: number = 8,
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

    // Fetch page
    const fetchResult = await fetchPage(item.url);
    if (!fetchResult) continue;

    // Handle redirects - use final URL and mark it as crawled
    const finalUrl = fetchResult.redirectUrl || item.url;
    if (fetchResult.redirectUrl) {
      crawledSet.add(fetchResult.redirectUrl);
    }

    // Parse page
    const crawledPage = parsePage(finalUrl, fetchResult.html, item.depth, fetchResult.headers);

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
      const techResult = detectFromHTML(fetchResult.html, fetchResult.headers);
      const summary = summarizeTechnologies(techResult);
      mergeTechnologies(discovery, summary, techResult);
    }

    // Detect login page
    if (!loginDetected) {
      const loginResult = detectLoginPage(fetchResult.html, item.url);
      if (loginResult.isLogin) {
        loginDetected = true;
        loginUrl = loginResult.loginUrl || item.url;
      }
    }

    // Extract priority elements
    const root = parse(fetchResult.html, { comment: false, blockTextElements: { script: false, style: false } });
    const priorityEls = extractPriorityElements(item.url, root);
    mergePriorityElements(discovery, priorityEls, crawledPage);

    // Update page types count
    const pageType = crawledPage.pageType || 'other';
    discovery.pageTypes[pageType] = (discovery.pageTypes[pageType] || 0) + 1;

    // Discover new links and add to queue
    const newLinks = crawledPage.links.filter(link => {
      if (crawledSet.has(link)) return false;
      if (urlQueue.some(q => q.url === link)) return false;
      try {
        const linkDomain = getBaseDomain(new URL(link).hostname);
        return linkDomain === baseDomain;
      } catch {
        return false;
      }
    });

    for (const link of newLinks) {
      urlQueue.push({ url: link, depth: item.depth + 1, source: 'crawl' });
    }

    // Update URL patterns (sample)
    if (discovery.urlPatterns.length < 30) {
      try {
        discovery.urlPatterns.push(new URL(item.url).pathname);
      } catch { /* skip */ }
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
      status: hasMore ? 'CRAWLING' : 'CRAWLING', // stays CRAWLING until all done
    },
  });

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

  // Save recommendations
  let newRecommendations = 0;
  if (opportunities.length > 0) {
    // Deduplicate with existing recommendations
    const existingRecs = await prisma.trackingRecommendation.findMany({
      where: { scanId },
      select: { trackingType: true, selector: true, urlPattern: true, pageUrl: true },
    });
    const existingKeys = new Set(
      existingRecs.map(r => `${r.trackingType}:${r.pageUrl}:${r.selector || r.urlPattern || ''}`)
    );

    const newOpps = opportunities.filter(opp => {
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
