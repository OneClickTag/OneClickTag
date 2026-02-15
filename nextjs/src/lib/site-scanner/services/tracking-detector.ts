import { TrackingType, RecommendationSeverity } from '@prisma/client';
import {
  CrawledPage,
  ExtractedElement,
  TrackingOpportunity,
  PageAnalysisInput,
} from '../interfaces';
import { getAIAnalysisService } from './ai-analysis';
import { generateSelector, getBestSelector } from './selector-generator';
import { getPatternsForNiche, TrackingPattern } from '../constants/tracking-patterns';
import { DEFAULT_SEVERITY_MAP, GA4_EVENT_NAMES } from '../constants/severity-rules';
import { createBehavioralOpportunities } from '../constants/behavioral-tracking';

/**
 * Tracking Detector Service - detects tracking opportunities on pages.
 * Converted from NestJS service to plain TypeScript functions.
 */

/**
 * Detect tracking opportunities on crawled pages.
 * Uses pattern matching + AI enhancement.
 */
export async function detectOpportunities(
  pages: CrawledPage[],
  elements: Map<string, ExtractedElement[]>,
  niche: string,
): Promise<TrackingOpportunity[]> {
  if (pages.length === 0) {
    return [];
  }

  const patterns = getPatternsForNiche(niche);
  const allOpportunities: TrackingOpportunity[] = [];

  // Phase 1: Pattern-based detection
  for (const page of pages) {
    const pageElements = elements.get(page.url) || page.elements || [];
    const patternOpps = detectByPatterns(page, pageElements, patterns);
    allOpportunities.push(...patternOpps);

    // Page-view tracking for important pages
    const pageViewOpp = detectPageViewTracking(page, niche);
    if (pageViewOpp) {
      allOpportunities.push(pageViewOpp);
    }
  }

  // Phase 2: AI-enhanced detection (batch pages)
  try {
    const aiAnalysis = getAIAnalysisService();
    if (aiAnalysis.isAvailable) {
      const pagesWithElements = pages.map(page => ({
        url: page.url,
        title: page.title,
        pageType: page.pageType,
        headings: page.headings || [],
        elements: (elements.get(page.url) || page.elements || []).slice(0, 20),
        metaTags: page.metaTags,
        contentSummary: page.contentSummary,
      }));

      // Process in batches of 5-10 pages
      const batchSize = 8;
      for (let i = 0; i < pagesWithElements.length; i += batchSize) {
        const batch = pagesWithElements.slice(i, i + batchSize);
        try {
          const aiOpps = await aiAnalysis.analyzePageBatch(batch, niche);
          allOpportunities.push(...aiOpps);
        } catch (error: any) {
          console.warn(`AI batch analysis failed for pages ${i}-${i + batch.length}: ${error?.message}`);
        }
      }
    }
  } catch (error: any) {
    console.warn(`AI analysis service initialization failed: ${error?.message}`);
  }

  // Add comprehensive behavioral tracking (replaces single scroll depth)
  const behavioralOpps = createBehavioralOpportunities(niche, pages[0].url);
  allOpportunities.push(...behavioralOpps);

  return allOpportunities;
}

// ========================================
// Pattern-based Detection
// ========================================

function detectByPatterns(
  page: CrawledPage,
  elements: ExtractedElement[],
  patterns: TrackingPattern[],
): TrackingOpportunity[] {
  const opportunities: TrackingOpportunity[] = [];

  for (const pattern of patterns) {
    // Check URL pattern match (for URL-only patterns with no text/selector patterns)
    if (pattern.urlPatterns?.length && pattern.textPatterns.length === 0) {
      const urlMatch = pattern.urlPatterns.some(p => p.test(page.url));
      if (urlMatch) {
        opportunities.push(createOpportunityFromPattern(pattern, page.url, null));
      }
      continue;
    }

    // Check elements against selector and text patterns
    for (const element of elements) {
      let matched = false;

      // Text pattern matching
      if (element.text) {
        for (const textPattern of pattern.textPatterns) {
          if (textPattern.test(element.text)) {
            matched = true;
            break;
          }
        }
      }

      // Href pattern matching
      if (!matched && element.href) {
        for (const textPattern of pattern.textPatterns) {
          if (textPattern.test(element.href)) {
            matched = true;
            break;
          }
        }
      }

      // Tag-specific matching
      if (!matched) {
        if (pattern.trackingType === 'PHONE_CALL_CLICK' && element.href?.startsWith('tel:')) {
          matched = true;
        }
        if (pattern.trackingType === 'EMAIL_CLICK' && element.href?.startsWith('mailto:')) {
          matched = true;
        }
        if (pattern.trackingType === 'FORM_SUBMIT' && element.tagName === 'form') {
          matched = true;
        }
        if (pattern.trackingType === 'VIDEO_PLAY' &&
          (element.tagName === 'video' || element.href?.includes('youtube') || element.href?.includes('vimeo'))) {
          matched = true;
        }
      }

      if (matched) {
        const selectorConfig = generateSelector(element);
        const bestSelector = getBestSelector(selectorConfig);

        opportunities.push({
          name: pattern.name,
          description: pattern.description,
          trackingType: pattern.trackingType,
          severity: pattern.severity,
          severityReason: `Default severity for ${pattern.trackingType}`,
          selector: bestSelector?.selector || null,
          selectorConfig,
          selectorConfidence: bestSelector?.confidence || null,
          urlPattern: null,
          pageUrl: page.url,
          funnelStage: pattern.funnelStage,
          elementContext: {
            buttonText: element.text || undefined,
            tagName: element.tagName,
            nearbyContent: element.ariaLabel || undefined,
            parentForm: element.parentForm || undefined,
            inputType: element.type || undefined,
          },
          suggestedGA4EventName: pattern.ga4EventName,
          suggestedDestinations: ['GA4'],
          suggestedConfig: null,
          aiGenerated: false,
        });
        break; // One match per pattern per page
      }
    }
  }

  return opportunities;
}

function detectPageViewTracking(page: CrawledPage, _niche: string): TrackingOpportunity | null {
  // Only create page-view tracking for important pages
  const importantPageTypes = ['checkout', 'pricing', 'contact', 'services', 'product', 'cart', 'demo', 'signup'];
  if (!page.pageType || !importantPageTypes.includes(page.pageType)) return null;

  const severityMap: Record<string, RecommendationSeverity> = {
    checkout: 'CRITICAL',
    pricing: 'IMPORTANT',
    contact: 'IMPORTANT',
    cart: 'IMPORTANT',
    demo: 'IMPORTANT',
    signup: 'IMPORTANT',
    product: 'RECOMMENDED',
    services: 'RECOMMENDED',
  };

  return {
    name: `${page.pageType.charAt(0).toUpperCase() + page.pageType.slice(1)} Page View`,
    description: `Track views of the ${page.pageType} page as a key user journey signal.`,
    trackingType: 'PAGE_VIEW',
    severity: severityMap[page.pageType] || 'RECOMMENDED',
    severityReason: `${page.pageType} pages are key indicators in the conversion funnel`,
    selector: null,
    selectorConfig: null,
    selectorConfidence: null,
    urlPattern: generateUrlPattern(page.url),
    pageUrl: page.url,
    funnelStage: ['checkout', 'cart', 'contact', 'demo', 'signup'].includes(page.pageType) ? 'bottom' : 'middle',
    elementContext: null,
    suggestedGA4EventName: `view_${page.pageType}`,
    suggestedDestinations: ['GA4'],
    suggestedConfig: null,
    aiGenerated: false,
  };
}

function createOpportunityFromPattern(
  pattern: TrackingPattern,
  pageUrl: string,
  _element: ExtractedElement | null,
): TrackingOpportunity {
  return {
    name: pattern.name,
    description: pattern.description,
    trackingType: pattern.trackingType,
    severity: pattern.severity,
    severityReason: `Default severity for ${pattern.trackingType}`,
    selector: null,
    selectorConfig: null,
    selectorConfidence: null,
    urlPattern: generateUrlPattern(pageUrl),
    pageUrl,
    funnelStage: pattern.funnelStage,
    elementContext: null,
    suggestedGA4EventName: pattern.ga4EventName,
    suggestedDestinations: ['GA4'],
    suggestedConfig: null,
    aiGenerated: false,
  };
}


function generateUrlPattern(url: string): string {
  try {
    const parsed = new URL(url);
    // Replace specific IDs/slugs with wildcards
    let path = parsed.pathname;
    // Replace UUIDs
    path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '*');
    // Replace numeric IDs
    path = path.replace(/\/\d+(?=\/|$)/g, '/*');
    return path;
  } catch {
    return url;
  }
}
