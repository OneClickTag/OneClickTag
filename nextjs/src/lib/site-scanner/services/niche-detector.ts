import {
  CrawlSummary,
  NicheAnalysis,
  NicheSignal,
} from '../interfaces';
import { getAIAnalysisService } from './ai-analysis';
import { NICHE_PATTERNS } from '../constants/niche-patterns';

/**
 * Niche Detector Service - detects website niche using AI or rule-based fallback.
 * Converted from NestJS service to plain TypeScript functions.
 */

/**
 * Detect website niche using AI (primary) or rule-based fallback.
 */
export async function detectNiche(crawlData: CrawlSummary): Promise<NicheAnalysis> {
  const aiAnalysis = getAIAnalysisService();

  // Try AI first
  if (aiAnalysis.isAvailable) {
    const aiResult = await aiAnalysis.detectNiche(crawlData);
    if (aiResult) {
      console.log(`AI detected niche: ${aiResult.niche} (${aiResult.confidence})`);
      return aiResult;
    }
    console.warn('AI niche detection failed, falling back to rules');
  }

  // Fallback to rule-based detection
  return detectNicheByRules(crawlData);
}

/**
 * Rule-based niche detection fallback.
 */
function detectNicheByRules(crawlData: CrawlSummary): NicheAnalysis {
  const scores: Record<string, { score: number; signals: NicheSignal[] }> = {};

  for (const pattern of NICHE_PATTERNS) {
    const signals: NicheSignal[] = [];
    let score = 0;

    // Check URL patterns
    for (const urlPattern of pattern.urlPatterns) {
      const matches = crawlData.urlPatterns.filter(u => urlPattern.test(u));
      if (matches.length > 0) {
        const weight = Math.min(matches.length / 5, 1);
        score += weight * 2;
        signals.push({
          type: 'url_pattern',
          description: `Found ${matches.length} URLs matching ${urlPattern.source}`,
          weight,
        });
      }
    }

    // Check content keywords
    const allContent = [
      crawlData.homepageContent.title,
      crawlData.homepageContent.metaDescription,
      crawlData.homepageContent.keyContent,
      ...crawlData.homepageContent.headings.map(h => h.text),
    ].join(' ').toLowerCase();

    let keywordMatches = 0;
    for (const keyword of pattern.contentKeywords) {
      if (allContent.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }
    if (keywordMatches > 0) {
      const weight = Math.min(keywordMatches / pattern.contentKeywords.length, 1);
      score += weight * 3;
      signals.push({
        type: 'content',
        description: `Found ${keywordMatches}/${pattern.contentKeywords.length} keywords`,
        weight,
      });
    }

    // Check page type distribution
    for (const [pageType, typeWeight] of Object.entries(pattern.pageTypeIndicators)) {
      const count = crawlData.pageTypes[pageType] || 0;
      if (count > 0) {
        const weight = Math.min(count / 3, 1);
        score += weight * typeWeight;
        signals.push({
          type: 'page_structure',
          description: `Found ${count} ${pageType} pages`,
          weight,
        });
      }
    }

    // Check technology indicators
    for (const techName of pattern.technologyIndicators) {
      if (crawlData.technologies.some(t => t.name.toLowerCase() === techName.toLowerCase())) {
        score += 3;
        signals.push({
          type: 'technology',
          description: `Detected ${techName}`,
          weight: 0.9,
        });
      }
    }

    // E-commerce bonus
    if (pattern.niche === 'e-commerce' && crawlData.hasEcommerce) {
      score += 2;
      signals.push({
        type: 'content',
        description: 'E-commerce elements detected (cart, checkout)',
        weight: 0.8,
      });
    }

    scores[pattern.niche] = { score, signals };
  }

  // Find the highest scoring niche
  const sortedNiches = Object.entries(scores).sort(([, a], [, b]) => b.score - a.score);
  const [topNiche, topData] = sortedNiches[0] || ['other', { score: 0, signals: [] }];

  // Calculate confidence based on score gap
  const secondScore = sortedNiches[1]?.[1]?.score || 0;
  const maxPossibleScore = 15; // Rough max
  const confidence = Math.min(1, Math.max(0.1, topData.score / maxPossibleScore));

  return {
    niche: topData.score > 1 ? topNiche : 'other',
    subCategory: null,
    confidence,
    reasoning: `Rule-based detection found ${topData.signals.length} signals pointing to ${topNiche}`,
    signals: topData.signals,
    suggestedTrackingFocus: [],
  };
}
