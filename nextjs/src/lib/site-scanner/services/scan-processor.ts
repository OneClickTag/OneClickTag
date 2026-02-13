import {
  SiteScanJobData,
  CrawlSummary,
  CrawledPage,
} from '../interfaces';
import { crawl, extractElements } from './crawl-engine';
import { detectNiche } from './niche-detector';
import { detectOpportunities } from './tracking-detector';
import { processRecommendations } from './recommendation-engine';
import { getAIAnalysisService } from './ai-analysis';
import {
  savePhase1Results,
  savePhase2Results,
  markScanFailed,
  updateScanStatus,
  getScanPages,
  isScanCancelled,
} from './site-scanner';

/**
 * Site Scan Processor - Legacy monolithic scan orchestrator.
 *
 * DEPRECATED: In v2, scanning is client-driven via chunked processing.
 * - Phase 1: Client calls /process-chunk in a loop (uses html-crawler, not Playwright)
 * - Phase 2: Client calls /process-chunk in a loop (uses Playwright element extraction)
 * - See chunk-processor.ts for the new implementation.
 *
 * Kept as a fallback for non-chunked environments or background job execution.
 */

export interface ScanResult {
  success: boolean;
  data?: any;
  errors?: Array<{ message: string; timestamp: Date }>;
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duration: number;
  };
}

/**
 * Run a site scan (Phase 1 or Phase 2).
 */
export async function runScan(jobData: SiteScanJobData): Promise<ScanResult> {
  const startTime = Date.now();
  console.log(`Processing site scan ${jobData.scanId} - ${jobData.phase}`);

  try {
    if (jobData.phase === 'phase1') {
      return await processPhase1(jobData, startTime);
    } else {
      return await processPhase2(jobData, startTime);
    }
  } catch (error: any) {
    console.error(`Site scan ${jobData.scanId} failed: ${error?.message}`, error?.stack);

    await markScanFailed(jobData.scanId, error?.message || 'Unknown error');

    return {
      success: false,
      errors: [{ message: error?.message || 'Unknown error', timestamp: new Date() }],
      summary: {
        totalProcessed: 0,
        successful: 0,
        failed: 1,
        duration: Date.now() - startTime,
      },
    };
  }
}

// ========================================
// Phase 1: Crawl + Niche Detection
// ========================================

async function processPhase1(jobData: SiteScanJobData, startTime: number): Promise<ScanResult> {
  // Update status
  await updateScanStatus(jobData.scanId, 'CRAWLING');
  console.log(`Crawling ${jobData.websiteUrl} (max ${jobData.maxPages} pages, depth ${jobData.maxDepth})`);

  // Crawl website
  const crawlResult = await crawl(
    jobData.websiteUrl,
    { maxPages: jobData.maxPages, maxDepth: jobData.maxDepth },
    (page, index) => {
      console.log(`Crawled page ${index + 1}: ${page.url} (${page.pageType})`);
      // Could emit SSE event here if needed
    },
  );

  console.log(`Crawled ${crawlResult.pages.length} pages`);

  // Check if cancelled during crawl
  if (await isScanCancelled(jobData.scanId)) {
    console.log(`Scan ${jobData.scanId} was cancelled during crawl, aborting Phase 1`);
    return { success: false, summary: { totalProcessed: 0, successful: 0, failed: 0, duration: Date.now() - startTime } };
  }

  if (crawlResult.pages.length === 0) {
    throw new Error(
      'No pages could be crawled from this website. The site may be blocking automated access, ' +
      'require authentication, or the URL may be unreachable.'
    );
  }

  // Build crawl summary for niche detection
  const crawlSummary = buildCrawlSummary(jobData.websiteUrl, crawlResult);

  // Detect niche
  console.log('Detecting niche...');
  const nicheAnalysis = await detectNiche(crawlSummary);
  console.log(`Detected niche: ${nicheAnalysis.niche} (${nicheAnalysis.confidence})`);

  // Build simple site map
  const siteMap = buildSiteMap(crawlResult.pages);

  const aiAnalysis = getAIAnalysisService();

  // Save results
  await savePhase1Results(
    jobData.scanId,
    crawlResult.pages,
    nicheAnalysis,
    crawlResult.technologies,
    crawlResult.existingTracking,
    siteMap,
    aiAnalysis.isAvailable,
  );

  return {
    success: true,
    data: {
      pagesScanned: crawlResult.pages.length,
      niche: nicheAnalysis.niche,
      confidence: nicheAnalysis.confidence,
    },
    summary: {
      totalProcessed: crawlResult.pages.length,
      successful: crawlResult.pages.length,
      failed: 0,
      duration: Date.now() - startTime,
    },
  };
}

// ========================================
// Phase 2: Deep Analysis + Recommendations
// ========================================

async function processPhase2(jobData: SiteScanJobData, startTime: number): Promise<ScanResult> {
  const niche = jobData.confirmedNiche || 'other';

  // Update status
  await updateScanStatus(jobData.scanId, 'DEEP_CRAWLING');
  console.log(`Phase 2: Starting deep analysis for niche "${niche}"`);

  // Get crawled pages from Phase 1
  const scanPages = await getScanPages(jobData.scanId);
  if (scanPages.length === 0) {
    throw new Error('No pages found from Phase 1. Please restart the scan.');
  }
  const pageUrls = scanPages.map(p => p.url);

  // Check if cancelled before heavy element extraction
  if (await isScanCancelled(jobData.scanId)) {
    console.log(`Scan ${jobData.scanId} was cancelled, aborting Phase 2`);
    return { success: false, summary: { totalProcessed: 0, successful: 0, failed: 0, duration: Date.now() - startTime } };
  }

  console.log(`Phase 2: Extracting elements from ${pageUrls.length} pages`);

  // Extract interactive elements from all pages
  const elements = await extractElements(jobData.websiteUrl, pageUrls);

  // Build CrawledPage objects from scan pages + extracted elements
  const crawledPages: CrawledPage[] = scanPages.map(sp => ({
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
  await updateScanStatus(jobData.scanId, 'ANALYZING');
  console.log('Detecting tracking opportunities...');

  const opportunities = await detectOpportunities(
    crawledPages,
    elements,
    niche,
  );

  console.log(`Found ${opportunities.length} tracking opportunities`);

  // Process into recommendations
  console.log('Processing recommendations...');

  const { recommendations, readinessScore, readinessNarrative, pageImportance } =
    await processRecommendations(opportunities, crawledPages, niche);

  console.log(`Generated ${recommendations.length} recommendations, readiness: ${readinessScore}`);

  const aiAnalysis = getAIAnalysisService();

  // Save results
  await savePhase2Results(
    jobData.scanId,
    recommendations,
    readinessScore,
    readinessNarrative,
    pageImportance,
    aiAnalysis.isAvailable,
  );

  console.log(`Scan ${jobData.scanId} completed successfully`);

  return {
    success: true,
    data: {
      totalRecommendations: recommendations.length,
      readinessScore,
    },
    summary: {
      totalProcessed: recommendations.length,
      successful: recommendations.length,
      failed: 0,
      duration: Date.now() - startTime,
    },
  };
}

// ========================================
// Helpers
// ========================================

function buildCrawlSummary(websiteUrl: string, crawlResult: any): CrawlSummary {
  const pages = crawlResult.pages as CrawledPage[];
  const homepage = pages[0];

  // Count page types
  const pageTypes: Record<string, number> = {};
  for (const page of pages) {
    const type = page.pageType || 'other';
    pageTypes[type] = (pageTypes[type] || 0) + 1;
  }

  // Extract representative URL patterns
  const urlPatterns = pages
    .map(p => {
      try {
        return new URL(p.url).pathname;
      } catch {
        return p.url;
      }
    })
    .slice(0, 30);

  return {
    websiteUrl,
    totalPages: pages.length,
    pageTypes,
    urlPatterns,
    homepageContent: {
      title: homepage?.title || null,
      metaDescription: homepage?.metaTags?.description || null,
      headings: homepage?.headings || [],
      keyContent: homepage?.contentSummary || '',
    },
    technologies: crawlResult.technologies,
    existingTracking: crawlResult.existingTracking,
    hasEcommerce: pages.some(p =>
      p.pageType === 'product' || p.pageType === 'checkout' || p.pageType === 'cart'
    ),
    hasForms: pages.some(p => p.hasForm),
    hasVideo: pages.some(p => p.hasVideo),
    hasPhoneNumbers: pages.some(p => p.hasPhoneLink),
  };
}

function buildSiteMap(pages: CrawledPage[]): Record<string, any> {
  const grouped: Record<string, Array<{ url: string; title: string | null }>> = {};
  for (const page of pages) {
    const type = page.pageType || 'other';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ url: page.url, title: page.title });
  }
  return grouped;
}
