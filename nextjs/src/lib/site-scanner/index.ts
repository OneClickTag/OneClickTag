/**
 * Site Scanner - Main barrel export file
 *
 * This module provides website crawling and tracking recommendation functionality.
 * Ported from the NestJS backend to plain TypeScript for use in Next.js.
 *
 * Key features:
 * - Phase 1: Website crawling and niche detection (AI or rule-based)
 * - Phase 2: Deep element analysis and tracking recommendations
 * - Multi-tenant support (pass tenantId to all functions)
 * - AI-powered analysis using Claude API (optional, falls back to rule-based)
 */

// ========================================
// Main Service Functions
// ========================================

export {
  startScan,
  confirmNiche,
  cancelScan,
  getScan,
  listScans,
  getRecommendations,
  acceptRecommendation,
  rejectRecommendation,
  bulkAcceptRecommendations,
  savePhase1Results,
  savePhase2Results,
  markScanFailed,
  updateScanStatus,
  getScanPages,
} from './services/site-scanner';

export {
  runScan,
  type ScanResult,
} from './services/scan-processor';

// ========================================
// Crawling & Analysis Services
// ========================================

export {
  crawl,
  extractElements,
} from './services/crawl-engine';

export {
  detectNiche,
} from './services/niche-detector';

export {
  detectOpportunities,
} from './services/tracking-detector';

export {
  processRecommendations,
} from './services/recommendation-engine';

export {
  generateSelector,
  getBestSelector,
} from './services/selector-generator';

export {
  detectTechnologyAndTracking,
} from './services/technology-detector';

export {
  detectFromHTML,
  summarizeTechnologies,
} from './services/html-technology-detector';

export {
  fetchPage,
  parsePage,
  discoverLinks,
  detectLoginPage,
  extractPriorityElements,
} from './services/html-crawler';

export {
  discoverAllUrls,
  fetchRobotsTxt,
  fetchSitemap,
} from './services/sitemap-parser';

export {
  processPhase1Chunk,
  processPhase2Chunk,
  createEmptyDiscovery,
  type LiveDiscovery,
  type ChunkResult,
  type Phase2ChunkResult,
  type UrlQueueItem,
} from './services/chunk-processor';

export {
  AIAnalysisService,
  getAIAnalysisService,
} from './services/ai-analysis';

// ========================================
// Constants
// ========================================

export {
  NICHE_PATTERNS,
  AVAILABLE_NICHES,
  type NichePattern,
} from './constants/niche-patterns';

export {
  UNIVERSAL_PATTERNS,
  ECOMMERCE_PATTERNS,
  SAAS_PATTERNS,
  LEAD_GEN_PATTERNS,
  CONTENT_PATTERNS,
  getPatternsForNiche,
  type TrackingPattern,
} from './constants/tracking-patterns';

export {
  DEFAULT_SEVERITY_MAP,
  SEVERITY_ORDER,
  GA4_EVENT_NAMES,
} from './constants/severity-rules';

// ========================================
// Interfaces & Types
// ========================================

export type {
  CrawlOptions,
  CrawledPage,
  PageMetaTags,
  PageHeading,
  ExtractedElement,
  DetectedTechnology,
  ExistingTracking,
  NicheAnalysis,
  NicheSignal,
  CrawlSummary,
  TrackingOpportunity,
  SelectorConfig,
  ElementContext,
  RawRecommendation,
  EnhancedRecommendation,
  ReadinessResult,
  PageAnalysisInput,
  SiteScanJobData,
  ScanProgressEvent,
} from './interfaces';

export {
  DEFAULT_CRAWL_OPTIONS,
  SKIP_PATTERNS,
} from './interfaces';

// ========================================
// Usage Examples
// ========================================

/**
 * Example 1: Run a complete Phase 1 scan
 *
 * ```typescript
 * import { runScan, startScan } from '@/lib/site-scanner';
 *
 * // Create scan record
 * const scan = await startScan(
 *   customerId,
 *   'https://example.com',
 *   50,  // maxPages
 *   3,   // maxDepth
 *   tenantId
 * );
 *
 * // Run Phase 1 (crawl + niche detection)
 * const result = await runScan({
 *   tenantId,
 *   customerId,
 *   scanId: scan.id,
 *   websiteUrl: 'https://example.com',
 *   maxPages: 50,
 *   maxDepth: 3,
 *   phase: 'phase1',
 * });
 *
 * console.log(result.data.niche); // 'e-commerce'
 * ```
 *
 * Example 2: Confirm niche and run Phase 2
 *
 * ```typescript
 * import { confirmNiche, runScan } from '@/lib/site-scanner';
 *
 * // User confirms or changes the detected niche
 * await confirmNiche(customerId, scanId, 'e-commerce', tenantId);
 *
 * // Run Phase 2 (deep analysis + recommendations)
 * const result = await runScan({
 *   tenantId,
 *   customerId,
 *   scanId,
 *   websiteUrl: 'https://example.com',
 *   maxPages: 50,
 *   maxDepth: 3,
 *   phase: 'phase2',
 *   confirmedNiche: 'e-commerce',
 * });
 *
 * console.log(result.data.totalRecommendations); // 15
 * ```
 *
 * Example 3: Get recommendations with filters
 *
 * ```typescript
 * import { getRecommendations } from '@/lib/site-scanner';
 *
 * const recommendations = await getRecommendations(
 *   customerId,
 *   scanId,
 *   {
 *     severity: ['CRITICAL', 'IMPORTANT'],
 *     funnelStage: 'bottom',
 *   },
 *   tenantId
 * );
 *
 * recommendations.forEach(rec => {
 *   console.log(`${rec.name}: ${rec.description}`);
 * });
 * ```
 *
 * Example 4: Direct crawling (without database)
 *
 * ```typescript
 * import { crawl, detectNiche } from '@/lib/site-scanner';
 *
 * // Crawl a website
 * const { pages, technologies, existingTracking } = await crawl(
 *   'https://example.com',
 *   { maxPages: 20, maxDepth: 2 }
 * );
 *
 * // Detect niche from crawl data
 * const crawlSummary = buildCrawlSummary('https://example.com', {
 *   pages,
 *   technologies,
 *   existingTracking,
 * });
 * const niche = await detectNiche(crawlSummary);
 *
 * console.log(niche.niche, niche.confidence);
 * ```
 */
