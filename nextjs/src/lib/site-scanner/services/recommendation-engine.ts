import { RecommendationSeverity } from '@prisma/client';
import {
  TrackingOpportunity,
  RawRecommendation,
  EnhancedRecommendation,
  ReadinessResult,
  CrawledPage,
} from '../interfaces';
import { getAIAnalysisService } from './ai-analysis';
import { SEVERITY_ORDER, GA4_EVENT_NAMES } from '../constants/severity-rules';

/**
 * Recommendation Engine Service - processes raw opportunities into recommendations.
 * Converted from NestJS service to plain TypeScript functions.
 */

/**
 * Process raw tracking opportunities into final recommendations.
 * Deduplicates, scores severity, ranks, and enhances with AI.
 */
export async function processRecommendations(
  opportunities: TrackingOpportunity[],
  pages: CrawledPage[],
  niche: string,
): Promise<{
  recommendations: EnhancedRecommendation[];
  readinessScore: number;
  readinessNarrative: string;
  pageImportance: Map<string, number>;
}> {
  // Step 1: Deduplicate
  const deduped = deduplicateOpportunities(opportunities);
  console.log(`Deduplication: ${opportunities.length} -> ${deduped.length} opportunities`);

  // Step 2: Build raw recommendations
  const rawRecs: RawRecommendation[] = deduped.map(opp => ({
    ...opp,
    suggestedGA4EventName: opp.suggestedGA4EventName || GA4_EVENT_NAMES[opp.trackingType] || null,
  }));

  // Step 3: AI enhancement (or fallback)
  let enhanced: EnhancedRecommendation[];
  let readiness: ReadinessResult;

  const aiAnalysis = getAIAnalysisService();
  if (aiAnalysis.isAvailable) {
    const result = await aiAnalysis.enhanceRecommendations(rawRecs, niche);
    if (result) {
      enhanced = result.enhanced;
      readiness = result.readiness;
    } else {
      enhanced = rawRecs as EnhancedRecommendation[];
      readiness = calculateReadinessFallback(rawRecs);
    }
  } else {
    enhanced = rawRecs as EnhancedRecommendation[];
    readiness = calculateReadinessFallback(rawRecs);
  }

  // Step 4: Sort by severity then by confidence
  enhanced.sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return (b.selectorConfidence || 0) - (a.selectorConfidence || 0);
  });

  // Step 5: Calculate page importance
  const pageImportance = calculatePageImportance(pages, enhanced);

  // Step 6: Pre-fill suggested configs
  for (const rec of enhanced) {
    if (!rec.suggestedConfig) {
      rec.suggestedConfig = buildSuggestedConfig(rec);
    }
    if (!rec.suggestedDestinations || rec.suggestedDestinations.length === 0) {
      rec.suggestedDestinations = determineSuggestedDestinations(rec);
    }
  }

  return {
    recommendations: enhanced,
    readinessScore: readiness.score,
    readinessNarrative: readiness.narrative,
    pageImportance,
  };
}

// ========================================
// Deduplication
// ========================================

function deduplicateOpportunities(opportunities: TrackingOpportunity[]): TrackingOpportunity[] {
  const seen = new Map<string, TrackingOpportunity>();

  for (const opp of opportunities) {
    // Key: type + page URL + (selector or urlPattern)
    const key = `${opp.trackingType}:${opp.pageUrl}:${opp.selector || opp.urlPattern || 'no-selector'}`;

    if (!seen.has(key)) {
      seen.set(key, opp);
    } else {
      // Keep the one with better confidence or AI-generated
      const existing = seen.get(key)!;
      if (opp.aiGenerated && !existing.aiGenerated) {
        seen.set(key, opp);
      } else if ((opp.selectorConfidence || 0) > (existing.selectorConfidence || 0)) {
        seen.set(key, opp);
      }
    }
  }

  // Also deduplicate across pages for the same type (e.g., multiple "Add to Cart" on different product pages)
  const crossPageSeen = new Map<string, TrackingOpportunity>();
  for (const opp of Array.from(seen.values())) {
    const crossKey = `${opp.trackingType}:${opp.name}:${opp.selector || 'no-selector'}`;
    if (!crossPageSeen.has(crossKey)) {
      crossPageSeen.set(crossKey, opp);
    }
    // Keep first occurrence
  }

  return Array.from(crossPageSeen.values());
}

// ========================================
// Readiness Score (Fallback)
// ========================================

function calculateReadinessFallback(recommendations: RawRecommendation[]): ReadinessResult {
  const counts = {
    CRITICAL: 0,
    IMPORTANT: 0,
    RECOMMENDED: 0,
    OPTIONAL: 0,
  };

  for (const rec of recommendations) {
    counts[rec.severity]++;
  }

  // Score calculation:
  // Critical (max 40 points): 10 points each, max 4
  // Important (max 30 points): 6 points each, max 5
  // Recommended (max 20 points): 4 points each, max 5
  // Optional (max 10 points): 2 points each, max 5
  const criticalScore = Math.min(counts.CRITICAL * 10, 40);
  const importantScore = Math.min(counts.IMPORTANT * 6, 30);
  const recommendedScore = Math.min(counts.RECOMMENDED * 4, 20);
  const optionalScore = Math.min(counts.OPTIONAL * 2, 10);
  const score = criticalScore + importantScore + recommendedScore + optionalScore;

  const parts: string[] = [];
  if (counts.CRITICAL > 0) {
    parts.push(`${counts.CRITICAL} critical conversion${counts.CRITICAL > 1 ? 's' : ''}`);
  }
  if (counts.IMPORTANT > 0) {
    parts.push(`${counts.IMPORTANT} important micro-conversion${counts.IMPORTANT > 1 ? 's' : ''}`);
  }
  parts.push(`${recommendations.length} total tracking opportunities`);

  let assessment: string;
  if (score >= 80) {
    assessment = 'Excellent tracking potential.';
  } else if (score >= 60) {
    assessment = 'Good tracking potential with room for improvement.';
  } else if (score >= 40) {
    assessment = 'Moderate tracking potential. Consider adding more conversion points.';
  } else {
    assessment = 'Basic tracking setup. The site would benefit from more conversion-focused elements.';
  }

  return {
    score: Math.min(100, score),
    narrative: `Found ${parts.join(', ')}. ${assessment}`,
  };
}

// ========================================
// Page Importance
// ========================================

function calculatePageImportance(
  pages: CrawledPage[],
  recommendations: EnhancedRecommendation[],
): Map<string, number> {
  const pageScores = new Map<string, number>();

  for (const page of pages) {
    let score = 0;

    // Base score from page type
    const typeScores: Record<string, number> = {
      checkout: 1.0,
      cart: 0.9,
      pricing: 0.85,
      contact: 0.8,
      demo: 0.8,
      signup: 0.8,
      product: 0.7,
      services: 0.6,
      homepage: 0.5,
      about: 0.3,
      blog: 0.2,
      faq: 0.2,
      terms: 0.1,
      other: 0.15,
    };
    score += typeScores[page.pageType || 'other'] || 0.15;

    // Bonus for interactive elements
    if (page.hasForm) score += 0.2;
    if (page.hasCTA) score += 0.1;
    if (page.hasPhoneLink) score += 0.15;
    if (page.hasEmailLink) score += 0.1;

    // Bonus for recommendations on this page
    const pageRecs = recommendations.filter(r => r.pageUrl === page.url);
    const criticalRecs = pageRecs.filter(r => r.severity === 'CRITICAL');
    const importantRecs = pageRecs.filter(r => r.severity === 'IMPORTANT');
    score += criticalRecs.length * 0.15;
    score += importantRecs.length * 0.08;

    // Depth penalty
    score *= 1 - (page.depth * 0.1);

    pageScores.set(page.url, Math.min(1, Math.max(0, score)));
  }

  return pageScores;
}

// ========================================
// Pre-fill Configs
// ========================================

function buildSuggestedConfig(rec: EnhancedRecommendation): Record<string, any> {
  const config: Record<string, any> = {};

  switch (rec.trackingType) {
    case 'SCROLL_DEPTH':
      config.scrollPercentage = 75;
      break;
    case 'TIME_ON_PAGE':
      config.timeSeconds = 30;
      break;
    case 'PURCHASE':
      config.value = 0; // User fills in
      config.currency = 'USD';
      break;
    case 'ADD_TO_CART':
      config.value = 0;
      break;
  }

  if (rec.selector) {
    config.selector = rec.selector;
  }
  if (rec.urlPattern) {
    config.urlPattern = rec.urlPattern;
  }

  return config;
}

function determineSuggestedDestinations(rec: EnhancedRecommendation): string[] {
  // Bottom-funnel conversions should go to both GA4 and Google Ads
  if (rec.funnelStage === 'bottom') {
    return ['GA4', 'GOOGLE_ADS'];
  }
  // Mid-funnel important actions to GA4 + potentially Ads
  if (rec.severity === 'CRITICAL' || rec.severity === 'IMPORTANT') {
    return ['GA4', 'GOOGLE_ADS'];
  }
  // Everything else just GA4
  return ['GA4'];
}
