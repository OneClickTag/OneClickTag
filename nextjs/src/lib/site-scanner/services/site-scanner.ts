import { SiteScanStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CrawledPage,
  EnhancedRecommendation,
} from '../interfaces';

/**
 * Site Scanner Service - CRUD operations for site scans.
 * Converted from NestJS service to plain TypeScript functions with tenantId parameter.
 */

// ========================================
// State Machine Validation
// ========================================

/**
 * Valid state transitions for SiteScanStatus.
 * Terminal states (COMPLETED, FAILED, CANCELLED) cannot transition to any state.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ['DISCOVERING', 'CRAWLING', 'CANCELLED', 'FAILED'],
  DISCOVERING: ['CRAWLING', 'CANCELLED', 'FAILED'],
  CRAWLING: ['NICHE_DETECTED', 'AWAITING_CONFIRMATION', 'CANCELLED', 'FAILED'],
  NICHE_DETECTED: ['AWAITING_CONFIRMATION', 'DEEP_CRAWLING', 'CANCELLED', 'FAILED'],
  AWAITING_CONFIRMATION: ['DEEP_CRAWLING', 'CANCELLED', 'FAILED'],
  DEEP_CRAWLING: ['ANALYZING', 'COMPLETED', 'CANCELLED', 'FAILED'],
  ANALYZING: ['COMPLETED', 'CANCELLED', 'FAILED'],
  // Terminal states cannot transition
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

/**
 * Check if a state transition is valid.
 * @param from Current state
 * @param to Target state
 * @returns true if transition is allowed, false otherwise
 */
function isValidTransition(from: string, to: string): boolean {
  const validTargets = VALID_TRANSITIONS[from];
  if (!validTargets) return false;
  return validTargets.includes(to);
}

/**
 * Start a new site scan for a customer.
 */
export async function startScan(
  customerId: string,
  websiteUrl: string,
  maxPages: number = 50,
  maxDepth: number = 3,
  tenantId: string,
): Promise<any> {
  // Verify customer exists and belongs to tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) throw new Error('Customer not found');

  // Check for active scans
  const activeScan = await prisma.siteScan.findFirst({
    where: {
      customerId,
      tenantId,
      status: { in: ['QUEUED', 'DISCOVERING', 'CRAWLING', 'NICHE_DETECTED', 'AWAITING_CONFIRMATION', 'DEEP_CRAWLING', 'ANALYZING'] },
    },
  });
  if (activeScan) {
    throw new Error('A scan is already in progress for this customer');
  }

  // Create scan record
  const scan = await prisma.siteScan.create({
    data: {
      customerId,
      tenantId,
      websiteUrl,
      maxPages,
      maxDepth,
      status: 'QUEUED',
    },
  });

  console.log(`Started scan ${scan.id} for customer ${customerId}`);
  return scan;
}

/**
 * Confirm niche and prepare for Phase 2.
 */
export async function confirmNiche(
  customerId: string,
  scanId: string,
  niche: string,
  tenantId: string,
): Promise<any> {
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
  });
  if (!scan) throw new Error('Scan not found');

  if (scan.status !== 'NICHE_DETECTED' && scan.status !== 'AWAITING_CONFIRMATION') {
    throw new Error(`Cannot confirm niche in status: ${scan.status}`);
  }

  // Update scan with confirmed niche
  const updatedScan = await prisma.siteScan.update({
    where: { id: scanId },
    data: {
      confirmedNiche: niche,
      status: 'DEEP_CRAWLING',
    },
  });

  console.log(`Phase 2 started for scan ${scanId}, niche: ${niche}`);
  return updatedScan;
}

/**
 * Cancel an active scan.
 */
export async function cancelScan(customerId: string, scanId: string, tenantId: string): Promise<void> {
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
  });
  if (!scan) throw new Error('Scan not found');

  if (scan.status === 'COMPLETED' || scan.status === 'FAILED' || scan.status === 'CANCELLED') {
    throw new Error(`Cannot cancel scan in status: ${scan.status}`);
  }

  await prisma.siteScan.update({
    where: { id: scanId },
    data: { status: 'CANCELLED' },
  });
}

/**
 * Get scan details with summary.
 */
export async function getScan(customerId: string, scanId: string, tenantId: string): Promise<any> {
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
    include: {
      pages: {
        select: {
          id: true,
          url: true,
          title: true,
          depth: true,
          pageType: true,
          hasForm: true,
          hasCTA: true,
          hasVideo: true,
          hasPhoneLink: true,
          hasEmailLink: true,
          hasDownloadLink: true,
          importanceScore: true,
          contentSummary: true,
          templateGroup: true,
        },
        orderBy: { importanceScore: 'desc' },
      },
      recommendations: {
        select: { severity: true },
      },
    },
  });
  if (!scan) throw new Error('Scan not found');

  // Add recommendation counts
  const counts = { critical: 0, important: 0, recommended: 0, optional: 0 };
  for (const rec of scan.recommendations) {
    const key = rec.severity.toLowerCase() as keyof typeof counts;
    if (key in counts) counts[key]++;
  }

  return {
    ...scan,
    liveDiscovery: scan.liveDiscovery,
    totalUrlsFound: scan.totalUrlsFound,
    loginDetected: scan.loginDetected,
    loginUrl: scan.loginUrl,
    recommendationCounts: counts,
  };
}

/**
 * List scan history for a customer.
 */
export async function listScans(customerId: string, tenantId: string): Promise<any[]> {
  const scans = await prisma.siteScan.findMany({
    where: { customerId, tenantId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return scans.map(scan => ({
    id: scan.id,
    status: scan.status,
    websiteUrl: scan.websiteUrl,
    detectedNiche: scan.detectedNiche,
    totalPagesScanned: scan.totalPagesScanned,
    totalRecommendations: scan.totalRecommendations,
    trackingReadinessScore: scan.trackingReadinessScore,
    aiAnalysisUsed: scan.aiAnalysisUsed,
    createdAt: scan.createdAt,
  }));
}

/**
 * Get recommendations for a scan with filters.
 */
export async function getRecommendations(
  customerId: string,
  scanId: string,
  filters: {
    severity?: string[];
    type?: string[];
    status?: string[];
    funnelStage?: string;
  },
  tenantId: string,
): Promise<any[]> {
  // Verify scan belongs to customer + tenant
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
  });
  if (!scan) throw new Error('Scan not found');

  const where: any = { scanId };

  if (filters.severity?.length) {
    where.severity = { in: filters.severity };
  }
  if (filters.type?.length) {
    where.trackingType = { in: filters.type };
  }
  if (filters.status?.length) {
    where.status = { in: filters.status };
  }
  if (filters.funnelStage) {
    where.funnelStage = filters.funnelStage;
  }

  const recommendations = await prisma.trackingRecommendation.findMany({
    where,
    orderBy: [
      { severity: 'asc' }, // CRITICAL first (alphabetical works here)
      { createdAt: 'asc' },
    ],
  });

  return recommendations;
}

/**
 * Accept a recommendation (sets status, doesn't create tracking yet).
 */
export async function acceptRecommendation(
  customerId: string,
  scanId: string,
  recommendationId: string,
  tenantId: string,
): Promise<any> {
  // Verify chain: tenant -> customer -> scan -> recommendation
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
  });
  if (!scan) throw new Error('Scan not found');

  const rec = await prisma.trackingRecommendation.findFirst({
    where: { id: recommendationId, scanId },
  });
  if (!rec) throw new Error('Recommendation not found');

  const updated = await prisma.trackingRecommendation.update({
    where: { id: recommendationId },
    data: { status: 'ACCEPTED' },
  });

  return updated;
}

/**
 * Reject a recommendation.
 */
export async function rejectRecommendation(
  customerId: string,
  scanId: string,
  recommendationId: string,
  tenantId: string,
): Promise<any> {
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
  });
  if (!scan) throw new Error('Scan not found');

  const rec = await prisma.trackingRecommendation.findFirst({
    where: { id: recommendationId, scanId },
  });
  if (!rec) throw new Error('Recommendation not found');

  const updated = await prisma.trackingRecommendation.update({
    where: { id: recommendationId },
    data: { status: 'REJECTED' },
  });

  return updated;
}

/**
 * Bulk accept recommendations.
 */
export async function bulkAcceptRecommendations(
  customerId: string,
  scanId: string,
  recommendationIds: string[],
  tenantId: string,
): Promise<{ accepted: number }> {
  const scan = await prisma.siteScan.findFirst({
    where: { id: scanId, customerId, tenantId },
  });
  if (!scan) throw new Error('Scan not found');

  const result = await prisma.trackingRecommendation.updateMany({
    where: {
      id: { in: recommendationIds },
      scanId,
      status: 'PENDING',
    },
    data: { status: 'ACCEPTED' },
  });

  return { accepted: result.count };
}

// ========================================
// Internal Methods (called by processor)
// ========================================

const TERMINAL_STATUSES: SiteScanStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

/**
 * Check if a scan has been cancelled (or reached another terminal state).
 */
export async function isScanCancelled(scanId: string): Promise<boolean> {
  return isScanTerminal(scanId);
}

async function isScanTerminal(scanId: string): Promise<boolean> {
  const scan = await prisma.siteScan.findUnique({
    where: { id: scanId },
    select: { status: true },
  });
  return !scan || TERMINAL_STATUSES.includes(scan.status);
}

/**
 * Save Phase 1 results to database.
 */
export async function savePhase1Results(
  scanId: string,
  pages: CrawledPage[],
  nicheAnalysis: any,
  technologies: any[],
  existingTracking: any[],
  siteMap: any,
  aiUsed: boolean,
): Promise<void> {
  // Check if scan was cancelled before saving
  if (await isScanTerminal(scanId)) {
    console.log(`Scan ${scanId} was cancelled/terminal, skipping Phase 1 save`);
    return;
  }

  // Save pages in bulk (outside transaction to avoid timeout on large sites)
  if (pages.length > 0) {
    await prisma.scanPage.createMany({
      data: pages.map(page => ({
        scanId,
        url: page.url,
        title: page.title,
        depth: page.depth,
        pageType: page.pageType,
        hasForm: page.hasForm,
        hasCTA: page.hasCTA,
        hasVideo: page.hasVideo,
        hasPhoneLink: page.hasPhoneLink,
        hasEmailLink: page.hasEmailLink,
        hasDownloadLink: page.hasDownloadLink,
        importanceScore: page.importanceScore,
        metaTags: page.metaTags as any,
        headings: page.headings as any,
        contentSummary: page.contentSummary,
      })),
    });
  }

  // Re-check cancellation after bulk insert (which can take time)
  if (await isScanTerminal(scanId)) {
    console.log(`Scan ${scanId} was cancelled during page save, skipping status update`);
    return;
  }

  // Update scan with niche data
  await prisma.siteScan.update({
    where: { id: scanId },
    data: {
      status: 'NICHE_DETECTED',
      detectedNiche: nicheAnalysis.niche,
      nicheConfidence: nicheAnalysis.confidence,
      nicheSignals: nicheAnalysis.signals as any,
      nicheSubCategory: nicheAnalysis.subCategory,
      detectedTechnologies: technologies as any,
      existingTracking: existingTracking as any,
      totalPagesScanned: pages.length,
      siteMap: siteMap as any,
      aiAnalysisUsed: aiUsed,
    },
  });
}

/**
 * Save Phase 2 results to database.
 */
export async function savePhase2Results(
  scanId: string,
  recommendations: EnhancedRecommendation[],
  readinessScore: number,
  readinessNarrative: string,
  pageImportance: Map<string, number>,
  aiUsed: boolean,
): Promise<void> {
  // Check if scan was cancelled before saving
  if (await isScanTerminal(scanId)) {
    console.log(`Scan ${scanId} was cancelled/terminal, skipping Phase 2 save`);
    return;
  }

  // Save recommendations in bulk
  if (recommendations.length > 0) {
    await prisma.trackingRecommendation.createMany({
      data: recommendations.map(rec => ({
        scanId,
        name: rec.name,
        description: rec.description,
        trackingType: rec.trackingType,
        severity: rec.severity,
        severityReason: rec.severityReason,
        selector: rec.selector,
        selectorConfig: rec.selectorConfig as any,
        selectorConfidence: rec.selectorConfidence,
        urlPattern: rec.urlPattern,
        pageUrl: rec.pageUrl,
        funnelStage: rec.funnelStage,
        elementContext: rec.elementContext as any,
        suggestedConfig: rec.suggestedConfig as any,
        suggestedGA4EventName: rec.suggestedGA4EventName,
        suggestedDestinations: rec.suggestedDestinations as any,
        aiGenerated: rec.aiGenerated,
      })),
    });
  }

  // Update page importance scores
  for (const [url, score] of Array.from(pageImportance.entries())) {
    await prisma.scanPage.updateMany({
      where: { scanId, url },
      data: { importanceScore: score },
    });
  }

  // Re-check cancellation before final status update
  if (await isScanTerminal(scanId)) {
    console.log(`Scan ${scanId} was cancelled during Phase 2 save, skipping completion`);
    return;
  }

  // Update scan status
  await prisma.siteScan.update({
    where: { id: scanId },
    data: {
      status: 'COMPLETED',
      totalRecommendations: recommendations.length,
      trackingReadinessScore: readinessScore,
      readinessNarrative,
      aiAnalysisUsed: aiUsed,
    },
  });
}

/**
 * Mark scan as failed (won't overwrite CANCELLED).
 */
export async function markScanFailed(scanId: string, errorMessage: string): Promise<void> {
  if (await isScanTerminal(scanId)) {
    console.log(`Scan ${scanId} already terminal, skipping markFailed`);
    return;
  }
  await prisma.siteScan.update({
    where: { id: scanId },
    data: {
      status: 'FAILED',
      errorMessage,
    },
  });
}

/**
 * Update scan status (won't overwrite terminal states, validates state transitions).
 */
export async function updateScanStatus(scanId: string, status: SiteScanStatus): Promise<void> {
  if (await isScanTerminal(scanId)) {
    console.log(`Scan ${scanId} already terminal, skipping status update to ${status}`);
    return;
  }

  // Get current status to validate transition
  const scan = await prisma.siteScan.findUnique({
    where: { id: scanId },
    select: { status: true },
  });

  if (!scan) {
    console.warn(`Scan ${scanId} not found, cannot update status`);
    return;
  }

  const currentStatus = scan.status;

  // Validate state transition
  if (!isValidTransition(currentStatus, status)) {
    console.warn(
      `Invalid state transition for scan ${scanId}: ${currentStatus} -> ${status}. Skipping update.`
    );
    return;
  }

  await prisma.siteScan.update({
    where: { id: scanId },
    data: { status },
  });
}

/**
 * Get scan pages from database.
 */
export async function getScanPages(scanId: string): Promise<any[]> {
  return prisma.scanPage.findMany({
    where: { scanId },
    orderBy: { importanceScore: 'desc' },
  });
}
