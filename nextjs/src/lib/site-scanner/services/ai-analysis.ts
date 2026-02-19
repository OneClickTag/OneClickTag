import Anthropic from '@anthropic-ai/sdk';
import { TrackingType, RecommendationSeverity } from '@prisma/client';
import {
  CrawlSummary,
  NicheAnalysis,
  NicheSignal,
  PageAnalysisInput,
  TrackingOpportunity,
  RawRecommendation,
  EnhancedRecommendation,
  ReadinessResult,
} from '../interfaces';

/**
 * AI Analysis Service - handles all Claude API interactions.
 * Converted from NestJS service to plain TypeScript class.
 */

export class AIAnalysisService {
  private anthropic: Anthropic | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.anthropic = new Anthropic({ apiKey: key });
      console.log('Anthropic AI client initialized');
    } else {
      console.warn('ANTHROPIC_API_KEY not set - AI analysis will use fallback rules');
    }
  }

  get isAvailable(): boolean {
    return this.anthropic !== null;
  }

  /**
   * Detect website niche from crawl data using Claude API.
   */
  async detectNiche(crawlData: CrawlSummary): Promise<NicheAnalysis | null> {
    if (!this.anthropic) return null;

    try {
      const prompt = this.buildNicheDetectionPrompt(crawlData);
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      return this.parseNicheResponse(content.text);
    } catch (error: any) {
      console.error(`AI niche detection failed: ${error?.message}`, error?.stack);
      return null;
    }
  }

  /**
   * Analyze pages for tracking opportunities using Claude API.
   * Processes pages in batches for efficiency.
   */
  async analyzePageBatch(
    pages: PageAnalysisInput[],
    niche: string,
  ): Promise<TrackingOpportunity[]> {
    if (!this.anthropic) return [];

    try {
      const prompt = this.buildPageAnalysisPrompt(pages, niche);
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return [];

      return this.parsePageAnalysisResponse(content.text, pages);
    } catch (error: any) {
      console.error(`AI page analysis failed: ${error?.message}`, error?.stack);
      return [];
    }
  }

  /**
   * Enhance and finalize recommendations with AI.
   */
  async enhanceRecommendations(
    recommendations: RawRecommendation[],
    niche: string,
  ): Promise<{ enhanced: EnhancedRecommendation[]; readiness: ReadinessResult } | null> {
    if (!this.anthropic) return null;

    try {
      const prompt = this.buildEnhancementPrompt(recommendations, niche);
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') return null;

      return this.parseEnhancementResponse(content.text, recommendations);
    } catch (error: any) {
      console.error(`AI enhancement failed: ${error?.message}`, error?.stack);
      return null;
    }
  }

  // ========================================
  // Prompt Builders
  // ========================================

  private buildNicheDetectionPrompt(data: CrawlSummary): string {
    // Gather all page content summaries for richer context
    const allPageContent = (data as any).allPageContent as string | undefined;

    return `You are an expert website analyst. Analyze this website's content, structure, and technology to determine its PRIMARY business niche.

Website: ${data.websiteUrl}
Total Pages Crawled: ${data.totalPages}

## Page Type Distribution
${Object.entries(data.pageTypes).map(([type, count]) => `- ${type}: ${count}`).join('\n') || 'No page types detected'}

## URL Patterns Found
${data.urlPatterns.slice(0, 30).map(p => `- ${p}`).join('\n') || 'None'}

## Homepage Content
Title: ${data.homepageContent.title || 'N/A'}
Meta Description: ${data.homepageContent.metaDescription || 'N/A'}
OG Type: ${(data as any).homepageContent?.ogType || 'N/A'}
Headings:
${data.homepageContent.headings.slice(0, 15).map(h => `  H${h.level}: ${h.text}`).join('\n') || '  None'}

Main Content:
${data.homepageContent.keyContent.slice(0, 1500)}

${allPageContent ? `## Additional Page Content (sampled from inner pages)\n${allPageContent.slice(0, 2000)}` : ''}

## Detected Technologies
${data.technologies.map(t => `- ${t.name} (${t.category})`).join('\n') || 'None detected'}

## Existing Tracking
${data.existingTracking.map(t => `- ${t.provider}: ${t.type}`).join('\n') || 'None detected'}

## Structural Signals
- E-commerce elements (cart/checkout): ${data.hasEcommerce}
- Forms detected: ${data.hasForms}
- Video content: ${data.hasVideo}
- Phone numbers: ${data.hasPhoneNumbers}

## Niche Classification Guide
Choose the BEST match from these niches. Read the descriptions carefully:

- **saas**: Software-as-a-Service products. Indicators: pricing/plans pages, free trial/demo CTAs, feature lists, API/integration pages, dashboard mentions, "platform"/"solution" language, subscription billing. Includes AI tools, developer tools, marketing tools, productivity software, B2B/B2C software.
- **e-commerce**: Online stores selling physical or digital products. Indicators: product listings, shopping cart, checkout flow, SKUs, "add to cart", product categories, Shopify/WooCommerce.
- **education**: Educational platforms, online courses, training. Indicators: course listings, lesson/module pages, enrollment, certifications, learning paths, student portals, webinars, tutorials, "learn"/"academy"/"course" language.
- **lead-generation**: Service businesses collecting leads. Indicators: contact forms, "get a quote", consultation booking, service pages, testimonials, portfolio, team pages, local business signals.
- **content**: Blogs, news sites, media publishers. Indicators: article pages, author bylines, publish dates, categories/tags, newsletter signup, "read more" links, WordPress/Ghost.
- **marketplace**: Two-sided platforms connecting buyers/sellers. Indicators: listings from multiple sellers, vendor profiles, search/filter by seller, commission language.
- **healthcare**: Medical, health, wellness businesses. Indicators: doctor/provider pages, appointment booking, medical terminology, HIPAA references, health conditions.
- **finance**: Financial services, fintech, insurance. Indicators: account management, loan/investment calculators, financial products, regulatory compliance language.
- **real-estate**: Property listings, real estate agencies. Indicators: property search, MLS listings, agent profiles, mortgage calculators, neighborhood guides.
- **travel**: Travel booking, hospitality, tourism. Indicators: destination pages, booking engine, hotel/flight search, itineraries, travel guides.
- **non-profit**: Charities, foundations, NGOs. Indicators: donation pages, volunteer signup, mission/impact pages, cause-related content.
- **food-delivery**: Restaurants, food ordering, meal delivery. Indicators: menus, order online, delivery zones, restaurant listings.
- **entertainment**: Media, gaming, streaming, events. Indicators: content catalogs, streaming players, event listings, ticket purchasing.
- **other**: ONLY if the site truly doesn't fit any category above. This should be rare.

IMPORTANT: Avoid defaulting to "other". Most websites fit into one of the above categories. A site that sells AI tools or software is "saas", not "other". A site that teaches things is "education", not "other". A consulting agency is "lead-generation". Think carefully about what the business DOES.

Respond with ONLY valid JSON in this exact format:
{
  "niche": "exact value from the list above",
  "subCategory": "more specific description, e.g., 'AI-powered SaaS platform for content generation'",
  "confidence": 0.95,
  "reasoning": "2-3 sentence explanation of why this niche was detected based on the evidence",
  "signals": [
    {"type": "url_pattern", "description": "specific evidence from the data above", "weight": 0.8},
    {"type": "content", "description": "specific content evidence", "weight": 0.9}
  ],
  "suggestedTrackingFocus": ["specific tracking recommendations for this niche"]
}`;
  }

  private buildPageAnalysisPrompt(pages: PageAnalysisInput[], niche: string): string {
    const pagesData = pages.map((page, i) => {
      const elementsStr = page.elements.slice(0, 20).map(el => {
        const parts = [el.tagName];
        if (el.text) parts.push(`text="${el.text.slice(0, 50)}"`);
        if (el.href) parts.push(`href="${el.href.slice(0, 80)}"`);
        if (el.id) parts.push(`id="${el.id}"`);
        if (el.className) parts.push(`class="${el.className.slice(0, 60)}"`);
        if (el.type) parts.push(`type="${el.type}"`);
        if (el.ariaLabel) parts.push(`aria-label="${el.ariaLabel}"`);
        return `    ${parts.join(' | ')}`;
      }).join('\n');

      return `
--- Page ${i + 1}: ${page.url} ---
Title: ${page.title || 'N/A'}
Type: ${page.pageType || 'unknown'}
Headings: ${page.headings?.slice(0, 5).map(h => `H${h.level}:${h.text}`).join(', ') || 'N/A'}
Content Summary: ${page.contentSummary?.slice(0, 200) || 'N/A'}
Interactive Elements:
${elementsStr || '    None found'}`;
    }).join('\n');

    return `You are a marketing tracking expert. Analyze these pages from a "${niche}" website and identify tracking opportunities.

${pagesData}

For each tracking opportunity you find, respond with ONLY a valid JSON array:
[
  {
    "pageIndex": 0,
    "name": "Add to Cart Button",
    "description": "Track clicks on the primary add-to-cart button to measure purchase intent",
    "trackingType": "ADD_TO_CART",
    "severity": "CRITICAL",
    "severityReason": "Primary conversion action for e-commerce revenue",
    "selector": "button.add-to-cart",
    "funnelStage": "middle",
    "ga4EventName": "add_to_cart",
    "aiGenerated": true
  }
]

Valid trackingType values: BUTTON_CLICK, LINK_CLICK, PAGE_VIEW, ELEMENT_VISIBILITY, FORM_SUBMIT, FORM_START, FORM_ABANDON, ADD_TO_CART, REMOVE_FROM_CART, ADD_TO_WISHLIST, VIEW_CART, CHECKOUT_START, CHECKOUT_STEP, PURCHASE, PRODUCT_VIEW, PHONE_CALL_CLICK, EMAIL_CLICK, DOWNLOAD, DEMO_REQUEST, SIGNUP, SCROLL_DEPTH, TIME_ON_PAGE, VIDEO_PLAY, VIDEO_COMPLETE, SITE_SEARCH, FILTER_USE, TAB_SWITCH, ACCORDION_EXPAND, MODAL_OPEN, SOCIAL_SHARE, SOCIAL_CLICK, PDF_DOWNLOAD, FILE_DOWNLOAD, NEWSLETTER_SIGNUP, CUSTOM_EVENT

Valid severity values: CRITICAL, IMPORTANT, RECOMMENDED, OPTIONAL
Valid funnelStage values: top, middle, bottom

Be creative - identify non-obvious tracking opportunities that a simple pattern matcher would miss. Focus on business-meaningful events.`;
  }

  private buildEnhancementPrompt(recommendations: RawRecommendation[], niche: string): string {
    const recsStr = recommendations.slice(0, 50).map((rec, i) => {
      return `${i + 1}. [${rec.severity}] ${rec.name} (${rec.trackingType}) - Page: ${rec.pageUrl} - Selector: ${rec.selector || 'N/A'}`;
    }).join('\n');

    return `You are a marketing analytics expert. Review these tracking recommendations for a "${niche}" website and provide enhancements.

Current Recommendations:
${recsStr}

Tasks:
1. Identify any duplicates (same intent but different selectors) and mark them
2. Enhance descriptions to explain WHY each tracking matters for business
3. Validate severity assignments (override if needed with reasoning)
4. Calculate a tracking readiness score (0-100) with narrative explanation

Respond with ONLY valid JSON:
{
  "enhancements": [
    {
      "index": 0,
      "description": "Enhanced description explaining business value",
      "severity": "CRITICAL",
      "severityReason": "Reason for this severity level",
      "isDuplicate": false,
      "duplicateOf": null
    }
  ],
  "readiness": {
    "score": 75,
    "narrative": "This website has good tracking potential with 5 critical conversion points identified..."
  }
}`;
  }

  // ========================================
  // Response Parsers
  // ========================================

  private parseNicheResponse(text: string): NicheAnalysis | null {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      const rawNiche = (parsed.niche || 'other').toLowerCase().trim();
      const normalizedNiche = this.normalizeNiche(rawNiche);

      return {
        niche: normalizedNiche,
        subCategory: parsed.subCategory || null,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || '',
        signals: (parsed.signals || []).map((s: any) => ({
          type: s.type || 'content',
          description: s.description || '',
          weight: Math.min(1, Math.max(0, s.weight || 0.5)),
        })),
        suggestedTrackingFocus: parsed.suggestedTrackingFocus || [],
      };
    } catch (error: any) {
      console.warn(`Failed to parse niche response: ${error?.message}`);
      return null;
    }
  }

  /**
   * Normalize AI-returned niche values to match AVAILABLE_NICHES exactly.
   * Handles aliases, typos, and related terms.
   */
  private normalizeNiche(raw: string): string {
    const VALID_NICHES = [
      'e-commerce', 'saas', 'lead-generation', 'content', 'non-profit',
      'marketplace', 'education', 'healthcare', 'real-estate', 'travel',
      'finance', 'food-delivery', 'entertainment', 'other',
    ];

    // Direct match
    if (VALID_NICHES.includes(raw)) return raw;

    // Alias mapping - maps common AI responses to correct niche values
    const NICHE_ALIASES: Record<string, string> = {
      // SaaS aliases
      'software': 'saas',
      'software-as-a-service': 'saas',
      'b2b-saas': 'saas',
      'b2c-saas': 'saas',
      'devtools': 'saas',
      'developer-tools': 'saas',
      'dev-tools': 'saas',
      'ai-tools': 'saas',
      'ai-platform': 'saas',
      'ai': 'saas',
      'ai-saas': 'saas',
      'platform': 'saas',
      'tool': 'saas',
      'tools': 'saas',
      'productivity': 'saas',
      'marketing-tools': 'saas',
      'analytics-platform': 'saas',
      'crm': 'saas',
      'technology': 'saas',
      'tech': 'saas',
      'api': 'saas',
      'cloud': 'saas',
      'automation': 'saas',

      // E-commerce aliases
      'ecommerce': 'e-commerce',
      'e commerce': 'e-commerce',
      'online-store': 'e-commerce',
      'retail': 'e-commerce',
      'shop': 'e-commerce',
      'store': 'e-commerce',
      'shopping': 'e-commerce',

      // Education aliases
      'online-education': 'education',
      'e-learning': 'education',
      'elearning': 'education',
      'edtech': 'education',
      'ed-tech': 'education',
      'courses': 'education',
      'online-courses': 'education',
      'training': 'education',
      'academy': 'education',
      'learning': 'education',
      'tutorial': 'education',
      'tutorials': 'education',

      // Lead generation aliases
      'lead-gen': 'lead-generation',
      'leadgen': 'lead-generation',
      'agency': 'lead-generation',
      'consulting': 'lead-generation',
      'services': 'lead-generation',
      'professional-services': 'lead-generation',
      'local-business': 'lead-generation',
      'b2b': 'lead-generation',
      'corporate': 'lead-generation',

      // Content aliases
      'blog': 'content',
      'news': 'content',
      'media': 'content',
      'publishing': 'content',
      'magazine': 'content',
      'editorial': 'content',

      // Healthcare aliases
      'health': 'healthcare',
      'medical': 'healthcare',
      'wellness': 'healthcare',
      'fitness': 'healthcare',
      'pharma': 'healthcare',
      'dental': 'healthcare',
      'telemedicine': 'healthcare',
      'telehealth': 'healthcare',

      // Finance aliases
      'fintech': 'finance',
      'financial': 'finance',
      'banking': 'finance',
      'insurance': 'finance',
      'investment': 'finance',
      'crypto': 'finance',
      'cryptocurrency': 'finance',

      // Real estate aliases
      'realestate': 'real-estate',
      'real estate': 'real-estate',
      'property': 'real-estate',
      'housing': 'real-estate',

      // Travel aliases
      'tourism': 'travel',
      'hospitality': 'travel',
      'hotel': 'travel',
      'booking': 'travel',

      // Non-profit aliases
      'nonprofit': 'non-profit',
      'non profit': 'non-profit',
      'charity': 'non-profit',
      'ngo': 'non-profit',
      'foundation': 'non-profit',

      // Food delivery aliases
      'food': 'food-delivery',
      'restaurant': 'food-delivery',
      'delivery': 'food-delivery',
      'meal-delivery': 'food-delivery',

      // Entertainment aliases
      'gaming': 'entertainment',
      'streaming': 'entertainment',
      'music': 'entertainment',
      'events': 'entertainment',
      'media-entertainment': 'entertainment',
    };

    // Check aliases
    if (NICHE_ALIASES[raw]) return NICHE_ALIASES[raw];

    // Fuzzy matching - check if any alias is contained in the raw string
    for (const [alias, niche] of Object.entries(NICHE_ALIASES)) {
      if (raw.includes(alias) || alias.includes(raw)) {
        return niche;
      }
    }

    // Check if any valid niche is contained in the raw string
    for (const niche of VALID_NICHES) {
      if (raw.includes(niche)) return niche;
    }

    console.warn(`Could not normalize niche "${raw}", defaulting to "other"`);
    return 'other';
  }

  private parsePageAnalysisResponse(
    text: string,
    pages: PageAnalysisInput[],
  ): TrackingOpportunity[] {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item: any) => item.name && item.trackingType)
        .map((item: any) => {
          const pageIndex = item.pageIndex ?? 0;
          const page = pages[pageIndex] || pages[0];

          return {
            name: item.name,
            description: item.description || '',
            trackingType: this.validateTrackingType(item.trackingType),
            severity: this.validateSeverity(item.severity),
            severityReason: item.severityReason || '',
            selector: item.selector || null,
            selectorConfig: null,
            selectorConfidence: item.selector ? 0.6 : null, // AI selectors get moderate confidence
            urlPattern: item.urlPattern || null,
            pageUrl: page?.url || '',
            funnelStage: this.validateFunnelStage(item.funnelStage),
            elementContext: null,
            suggestedGA4EventName: item.ga4EventName || null,
            suggestedDestinations: ['GA4'],
            suggestedConfig: null,
            aiGenerated: true,
          } as TrackingOpportunity;
        });
    } catch (error: any) {
      console.warn(`Failed to parse page analysis response: ${error?.message}`);
      return [];
    }
  }

  private parseEnhancementResponse(
    text: string,
    originalRecs: RawRecommendation[],
  ): { enhanced: EnhancedRecommendation[]; readiness: ReadinessResult } | null {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      const enhancements = parsed.enhancements || [];
      const readiness = parsed.readiness || { score: 50, narrative: 'Score unavailable.' };

      // Apply enhancements to original recommendations
      const enhanced: EnhancedRecommendation[] = originalRecs.map((rec, index) => {
        const enhancement = enhancements.find((e: any) => e.index === index);
        if (enhancement && !enhancement.isDuplicate) {
          return {
            ...rec,
            description: enhancement.description || rec.description,
            severity: this.validateSeverity(enhancement.severity) || rec.severity,
            severityReason: enhancement.severityReason || rec.severityReason,
          };
        }
        return rec as EnhancedRecommendation;
      }).filter((_, index) => {
        // Remove duplicates
        const enhancement = enhancements.find((e: any) => e.index === index);
        return !enhancement?.isDuplicate;
      });

      return {
        enhanced,
        readiness: {
          score: Math.min(100, Math.max(0, readiness.score || 50)),
          narrative: readiness.narrative || '',
        },
      };
    } catch (error: any) {
      console.warn(`Failed to parse enhancement response: ${error?.message}`);
      return null;
    }
  }

  // ========================================
  // Validators
  // ========================================

  private validateTrackingType(type: string): TrackingType {
    const validTypes: TrackingType[] = [
      'BUTTON_CLICK', 'LINK_CLICK', 'PAGE_VIEW', 'ELEMENT_VISIBILITY',
      'FORM_SUBMIT', 'FORM_START', 'FORM_ABANDON',
      'ADD_TO_CART', 'REMOVE_FROM_CART', 'ADD_TO_WISHLIST', 'VIEW_CART',
      'CHECKOUT_START', 'CHECKOUT_STEP', 'PURCHASE', 'PRODUCT_VIEW',
      'PHONE_CALL_CLICK', 'EMAIL_CLICK', 'DOWNLOAD', 'DEMO_REQUEST', 'SIGNUP',
      'SCROLL_DEPTH', 'TIME_ON_PAGE', 'VIDEO_PLAY', 'VIDEO_COMPLETE',
      'SITE_SEARCH', 'FILTER_USE', 'TAB_SWITCH', 'ACCORDION_EXPAND', 'MODAL_OPEN',
      'SOCIAL_SHARE', 'SOCIAL_CLICK', 'PDF_DOWNLOAD', 'FILE_DOWNLOAD',
      'NEWSLETTER_SIGNUP', 'CUSTOM_EVENT',
    ];
    return validTypes.includes(type as TrackingType)
      ? (type as TrackingType)
      : 'CUSTOM_EVENT';
  }

  private validateSeverity(severity: string): RecommendationSeverity {
    const valid: RecommendationSeverity[] = ['CRITICAL', 'IMPORTANT', 'RECOMMENDED', 'OPTIONAL'];
    return valid.includes(severity as RecommendationSeverity)
      ? (severity as RecommendationSeverity)
      : 'RECOMMENDED';
  }

  private validateFunnelStage(stage: string): 'top' | 'middle' | 'bottom' | null {
    const valid = ['top', 'middle', 'bottom'];
    return valid.includes(stage) ? (stage as 'top' | 'middle' | 'bottom') : null;
  }
}

// Export a singleton instance
let aiAnalysisInstance: AIAnalysisService | null = null;

export function getAIAnalysisService(): AIAnalysisService {
  if (!aiAnalysisInstance) {
    aiAnalysisInstance = new AIAnalysisService();
  }
  return aiAnalysisInstance;
}
