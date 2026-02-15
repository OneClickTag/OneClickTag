import { TrackingType, RecommendationSeverity } from '@prisma/client';
import { TrackingOpportunity } from '../interfaces';

/**
 * Behavioral Tracking Definition
 * Defines a behavioral tracking pattern with business value and implementation details.
 */
export interface BehavioralTrackingDef {
  name: string;
  description: string;
  trackingType: TrackingType;
  severity: RecommendationSeverity;
  severityReason: string;
  ga4EventName: string;
  funnelStage: 'top' | 'middle' | 'bottom' | null;
  suggestedConfig: Record<string, any>;
  businessValue: string;
  implementationNotes: string;
}

/**
 * Universal Behavioral Trackings
 * These 14 trackings are valuable across all website types and niches.
 * They capture user engagement, frustration, and intent signals.
 */
export const UNIVERSAL_BEHAVIORAL_TRACKINGS: BehavioralTrackingDef[] = [
  {
    name: 'Scroll Depth Milestones',
    description: 'Track when users reach 25%, 50%, 75%, and 100% scroll depth on pages',
    trackingType: TrackingType.SCROLL_DEPTH,
    severity: RecommendationSeverity.HIGH,
    severityReason: 'Essential for understanding content engagement and page optimization',
    ga4EventName: 'scroll',
    funnelStage: 'middle',
    suggestedConfig: {
      thresholds: [25, 50, 75, 100],
      unit: 'percent',
    },
    businessValue: 'Identify which content keeps users engaged and where they drop off. Pages with low scroll depth may have poor content or slow load times. High scroll depth correlates with 2.5x higher conversion rates.',
    implementationNotes: 'Use Intersection Observer API to detect scroll thresholds. Fire once per threshold per page view. Include page_location and threshold percentage in event data.',
  },
  {
    name: 'Time on Page Milestones',
    description: 'Track engagement time milestones (10s, 30s, 60s, 120s, 300s)',
    trackingType: TrackingType.TIME_ON_PAGE,
    severity: RecommendationSeverity.MEDIUM,
    severityReason: 'Helps measure content quality and user interest level',
    ga4EventName: 'time_on_page',
    funnelStage: 'middle',
    suggestedConfig: {
      milestones: [10, 30, 60, 120, 300],
      unit: 'seconds',
    },
    businessValue: 'Users spending 60+ seconds on product pages are 4x more likely to convert. Identify high-value content that keeps users engaged and correlate with conversion patterns.',
    implementationNotes: 'Use Page Visibility API to track active engagement time (tab focused). Pause timer when tab is hidden. Send milestone events with elapsed_time parameter.',
  },
  {
    name: 'Page Engagement Score',
    description: 'Composite engagement metric combining scroll, time, clicks, and interactions',
    trackingType: TrackingType.PAGE_ENGAGEMENT,
    severity: RecommendationSeverity.MEDIUM,
    severityReason: 'Provides holistic view of user engagement quality',
    ga4EventName: 'engagement_score',
    funnelStage: 'middle',
    suggestedConfig: {
      scrollWeight: 0.3,
      timeWeight: 0.3,
      interactionWeight: 0.4,
      scoreThresholds: [30, 60, 90],
    },
    businessValue: 'Single metric to identify highest-quality traffic sources and landing pages. Engagement scores above 60 typically indicate 3x higher conversion potential.',
    implementationNotes: 'Calculate composite score: (scroll_depth * 0.3) + (time_engaged * 0.3) + (interactions * 0.4). Send score on page exit or every 30 seconds. Use for audience building in GA4.',
  },
  {
    name: 'Rage Click Detection',
    description: 'Detect when users rapidly click the same element 3+ times (indicates frustration)',
    trackingType: TrackingType.RAGE_CLICK,
    severity: RecommendationSeverity.CRITICAL,
    severityReason: 'Reveals broken UI elements and user frustration that directly impacts conversions',
    ga4EventName: 'rage_click',
    funnelStage: 'bottom',
    suggestedConfig: {
      clickThreshold: 3,
      timeWindow: 1000,
      captureSelector: true,
      captureScreenshot: false,
    },
    businessValue: 'Find broken buttons, unresponsive UI elements, and frustrating interactions before they cost you conversions. Sites with high rage click rates see 45% lower conversion rates on those pages.',
    implementationNotes: 'Track clicks with timestamps. If 3+ clicks on same element within 1 second, fire rage_click event. Capture element selector, page URL, and click count. Critical for checkout and form pages.',
  },
  {
    name: 'Dead Click Detection',
    description: 'Track clicks on non-interactive elements (suggests users expect functionality)',
    trackingType: TrackingType.DEAD_CLICK,
    severity: RecommendationSeverity.HIGH,
    severityReason: 'Identifies UX confusion and missed interaction opportunities',
    ga4EventName: 'dead_click',
    funnelStage: 'middle',
    suggestedConfig: {
      excludeTags: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'],
      minClicks: 2,
      captureSelector: true,
    },
    businessValue: 'Discover where users expect interactivity but find none. Dead clicks on pricing elements, product images, or features indicate opportunities to add CTAs or links that could boost conversions by 15-25%.',
    implementationNotes: 'Listen for clicks on elements without href, onclick, or interactive ARIA roles. Capture clicked element selector and nearby text. Useful for improving CTA placement and discoverability.',
  },
  {
    name: 'Tab Focus/Blur Events',
    description: 'Track when users switch tabs or return to your page',
    trackingType: TrackingType.TAB_VISIBILITY,
    severity: RecommendationSeverity.LOW,
    severityReason: 'Helps understand multi-tasking behavior and attention patterns',
    ga4EventName: 'tab_visibility',
    funnelStage: 'middle',
    suggestedConfig: {
      trackBlur: true,
      trackFocus: true,
      minTimeAway: 5000,
    },
    businessValue: 'Users who switch tabs during checkout are 60% more likely to abandon. Detect comparison shopping behavior and trigger retargeting campaigns or remarketing strategies.',
    implementationNotes: 'Use Page Visibility API (document.visibilityState). Track hidden/visible state changes. Measure time away and return patterns. Useful for cart abandonment prevention.',
  },
  {
    name: 'Session Duration Tracking',
    description: 'Track total engaged session time with milestones (2min, 5min, 10min, 15min+)',
    trackingType: TrackingType.SESSION_DURATION,
    severity: RecommendationSeverity.MEDIUM,
    severityReason: 'Indicates overall site stickiness and user interest',
    ga4EventName: 'session_duration',
    funnelStage: 'top',
    suggestedConfig: {
      milestones: [120, 300, 600, 900],
      trackIdleTime: false,
      idleThreshold: 30000,
    },
    businessValue: 'Sessions over 5 minutes have 10x higher conversion rates. Identify traffic sources and campaigns that drive quality, engaged visitors vs. bouncing traffic.',
    implementationNotes: 'Store session start timestamp in sessionStorage. Track cumulative engaged time across pages. Fire milestone events at key thresholds. Exclude idle time when tab is hidden.',
  },
  {
    name: 'Exit Intent Detection',
    description: 'Detect when users move cursor toward browser close/back button (intent to leave)',
    trackingType: TrackingType.EXIT_INTENT,
    severity: RecommendationSeverity.HIGH,
    severityReason: 'Last chance to retain users before they leave',
    ga4EventName: 'exit_intent',
    funnelStage: 'bottom',
    suggestedConfig: {
      sensitivity: 'medium',
      delayMs: 0,
      showOnce: true,
      excludeMobile: true,
    },
    businessValue: 'Exit-intent popups with targeted offers recover 10-15% of abandoning visitors. Track exit intent patterns to identify which pages lose visitors and why.',
    implementationNotes: 'Detect mouse movement toward top of viewport (Y < 10px with upward velocity). Desktop only. Fire once per session per page. Use to trigger popups, offers, or survey prompts.',
  },
  {
    name: 'Text Copy Events',
    description: 'Track when users copy text content from your pages',
    trackingType: TrackingType.TEXT_COPY,
    severity: RecommendationSeverity.LOW,
    severityReason: 'Indicates high-value content users want to save or share',
    ga4EventName: 'text_copy',
    funnelStage: 'middle',
    suggestedConfig: {
      minLength: 10,
      captureText: false,
      captureSelector: true,
    },
    businessValue: 'Users who copy pricing, features, or testimonials are 3x more likely to convert later. Identify which content resonates most and influences purchase decisions.',
    implementationNotes: 'Listen for copy events on document. Capture copied text length and source element selector. Do NOT capture actual text (privacy). Useful for content optimization.',
  },
  {
    name: 'Page Print Events',
    description: 'Track when users print pages (indicates high intent or saving for later)',
    trackingType: TrackingType.PAGE_PRINT,
    severity: RecommendationSeverity.LOW,
    severityReason: 'Strong buying signal, especially for B2B and high-ticket items',
    ga4EventName: 'page_print',
    funnelStage: 'bottom',
    suggestedConfig: {
      capturePageType: true,
      captureUrl: true,
    },
    businessValue: 'Users who print product pages, pricing sheets, or proposals are qualified leads with 40% higher close rates. Trigger sales follow-ups and personalized outreach.',
    implementationNotes: 'Listen for beforeprint and afterprint events (window.onbeforeprint). Capture page URL and type. Strong intent signal for B2B, real estate, and high-consideration purchases.',
  },
  {
    name: 'Form Field Interaction',
    description: 'Track which form fields users focus on, complete, and abandon',
    trackingType: TrackingType.FORM_FIELD_INTERACTION,
    severity: RecommendationSeverity.HIGH,
    severityReason: 'Critical for optimizing form conversion rates',
    ga4EventName: 'form_field_interaction',
    funnelStage: 'bottom',
    suggestedConfig: {
      trackFocus: true,
      trackBlur: true,
      trackChange: true,
      capturePII: false,
    },
    businessValue: 'Form field analysis reveals friction points causing 50-70% of form abandonment. Identify problematic fields (phone number, credit card) and optimize or remove them to boost completions.',
    implementationNotes: 'Track focus, blur, and change events on form inputs. Capture field name/ID only, never values. Measure time spent per field. Identify drop-off points in multi-step forms.',
  },
  {
    name: 'Error Page Views (404, 500)',
    description: 'Track when users land on error pages or experience technical issues',
    trackingType: TrackingType.ERROR_PAGE_VIEW,
    severity: RecommendationSeverity.CRITICAL,
    severityReason: 'Technical errors destroy user trust and conversions',
    ga4EventName: 'error_page_view',
    funnelStage: 'top',
    suggestedConfig: {
      errorTypes: ['404', '500', '403', '502'],
      captureReferrer: true,
      captureUrl: true,
    },
    businessValue: 'Error pages have 95% bounce rates. Every 404 from a marketing campaign wastes ad spend. Quickly identify and fix broken links, missing pages, and technical failures.',
    implementationNotes: 'Detect HTTP status codes or error page indicators. Capture error type, referring URL, and intended URL. Set up alerts for sudden spikes in error page views.',
  },
  {
    name: 'Return Visitor Detection',
    description: 'Identify and segment returning visitors vs. first-time visitors',
    trackingType: TrackingType.RETURN_VISITOR,
    severity: RecommendationSeverity.MEDIUM,
    severityReason: 'Essential for understanding customer journey and loyalty',
    ga4EventName: 'return_visitor',
    funnelStage: 'top',
    suggestedConfig: {
      cookieName: 'returning_visitor',
      cookieDuration: 30,
      trackVisitCount: true,
    },
    businessValue: 'Returning visitors convert at 5x the rate of first-time visitors. Personalize messaging, offers, and CTAs based on visit frequency to increase conversion rates.',
    implementationNotes: 'Set first-party cookie on initial visit. Increment visit counter on subsequent visits. Track days since last visit. Use for audience segmentation and personalization.',
  },
  {
    name: 'Outbound Link Clicks',
    description: 'Track clicks on external links leaving your domain',
    trackingType: TrackingType.OUTBOUND_CLICK,
    severity: RecommendationSeverity.MEDIUM,
    severityReason: 'Understand referral traffic and external navigation patterns',
    ga4EventName: 'outbound_click',
    funnelStage: 'middle',
    suggestedConfig: {
      trackAllOutbound: true,
      captureDestination: true,
      captureLinkText: true,
    },
    businessValue: 'Identify which external resources users need (payment gateways, reviews, documentation). High outbound clicks may indicate missing content or need for partnerships.',
    implementationNotes: 'Listen for clicks on links with different hostname. Capture destination URL, link text, and page location. Use to track affiliate links, payment providers, and partner referrals.',
  },
];

/**
 * Niche-Specific Behavioral Trackings
 * Additional behavioral trackings that are highly valuable for specific industries.
 */
export const NICHE_BEHAVIORAL_TRACKINGS: Record<string, BehavioralTrackingDef[]> = {
  'e-commerce': [
    {
      name: 'Product Image Interaction',
      description: 'Track when users zoom, click, or hover on product images',
      trackingType: TrackingType.PRODUCT_IMAGE_INTERACTION,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Strong purchase intent signal for e-commerce',
      ga4EventName: 'product_image_interaction',
      funnelStage: 'middle',
      suggestedConfig: {
        trackZoom: true,
        trackClick: true,
        trackHover: false,
        captureImageIndex: true,
      },
      businessValue: 'Users who interact with product images are 3x more likely to add to cart. Image interaction indicates serious consideration and helps identify best-performing product photography.',
      implementationNotes: 'Track clicks on product images, zoom actions, and gallery navigation. Capture product ID, image index, and interaction type. Link to add-to-cart events.',
    },
    {
      name: 'Cart Abandonment Timer',
      description: 'Track time between cart addition and checkout, detect abandonment patterns',
      trackingType: TrackingType.CART_ABANDONMENT,
      severity: RecommendationSeverity.CRITICAL,
      severityReason: 'Average cart abandonment rate is 70%, direct revenue impact',
      ga4EventName: 'cart_abandonment',
      funnelStage: 'bottom',
      suggestedConfig: {
        abandonmentThreshold: 300000,
        trackPartialCheckout: true,
        captureCartValue: true,
      },
      businessValue: 'Average cart abandonment rate is 70%. Every 1% reduction directly increases revenue. Track abandonment patterns to trigger remarketing emails and optimize checkout flow.',
      implementationNotes: 'Start timer on add_to_cart event. Fire cart_abandonment if no purchase within 5 minutes and user shows exit intent or closes tab. Capture cart value and item count.',
    },
    {
      name: 'Price Comparison Behavior',
      description: 'Detect when users view pricing tables, toggle plans, or compare products',
      trackingType: TrackingType.PRICE_COMPARISON,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Indicates purchase readiness and price sensitivity',
      ga4EventName: 'price_comparison',
      funnelStage: 'middle',
      suggestedConfig: {
        trackTableInteraction: true,
        trackFilterUse: true,
        trackSortChange: true,
      },
      businessValue: 'Users actively comparing prices are in decision mode with 50% conversion potential. Identify which price points and features drive decisions vs. cause abandonment.',
      implementationNotes: 'Track interactions with pricing tables, product comparison tools, and price filters. Capture compared products/plans and time spent comparing. High-intent signal.',
    },
    {
      name: 'Review Interaction',
      description: 'Track when users read, filter, or interact with product reviews',
      trackingType: TrackingType.REVIEW_INTERACTION,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Reviews directly influence 93% of purchase decisions',
      ga4EventName: 'review_interaction',
      funnelStage: 'middle',
      suggestedConfig: {
        trackScroll: true,
        trackFilter: true,
        trackSort: true,
        trackHelpfulVote: true,
      },
      businessValue: '93% of consumers read reviews before buying. Users who read 3+ reviews convert at 2x higher rates. Track which products need more reviews and which reviews drive conversions.',
      implementationNotes: 'Track review section scroll, rating filter usage, and "helpful" votes. Measure time spent reading reviews. Correlate with purchase behavior to identify impact.',
    },
  ],

  'saas': [
    {
      name: 'Pricing Toggle Interaction',
      description: 'Track when users toggle between monthly/annual pricing or plan comparisons',
      trackingType: TrackingType.PRICE_COMPARISON,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Direct indicator of purchase intent and price sensitivity',
      ga4EventName: 'pricing_toggle',
      funnelStage: 'bottom',
      suggestedConfig: {
        trackBillingToggle: true,
        trackPlanComparison: true,
        captureSelectedPlan: true,
      },
      businessValue: 'Users toggling pricing plans are actively evaluating purchase. Annual billing toggle interactions correlate with 35% higher LTV. Identify which pricing strategies resonate.',
      implementationNotes: 'Track clicks on billing frequency toggles (monthly/annual), plan selection changes, and feature comparison interactions. Capture time spent on pricing page.',
    },
  ],

  'blog': [
    {
      name: 'Content Read-Through Score',
      description: 'Measure actual reading behavior: scroll speed, time, and content consumption',
      trackingType: TrackingType.CONTENT_READ_THROUGH,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Indicates content quality and reader engagement',
      ga4EventName: 'content_read_through',
      funnelStage: 'middle',
      suggestedConfig: {
        trackScrollSpeed: true,
        trackTimePerSection: true,
        minimumReadTime: 30,
      },
      businessValue: 'Identify which content truly engages readers vs. just attracts clicks. High read-through articles build authority and convert readers into subscribers at 4x higher rates.',
      implementationNotes: 'Calculate reading score based on scroll speed, time on page, and scroll depth. Slow scroll indicates reading vs. fast scroll (skimming). Fire event on high-quality engagement.',
    },
  ],

  'content': [
    {
      name: 'Content Read-Through Score',
      description: 'Measure actual reading behavior: scroll speed, time, and content consumption',
      trackingType: TrackingType.CONTENT_READ_THROUGH,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Indicates content quality and reader engagement',
      ga4EventName: 'content_read_through',
      funnelStage: 'middle',
      suggestedConfig: {
        trackScrollSpeed: true,
        trackTimePerSection: true,
        minimumReadTime: 30,
      },
      businessValue: 'Identify which content truly engages readers vs. just attracts clicks. High read-through articles build authority and convert readers into subscribers at 4x higher rates.',
      implementationNotes: 'Calculate reading score based on scroll speed, time on page, and scroll depth. Slow scroll indicates reading vs. fast scroll (skimming). Fire event on high-quality engagement.',
    },
  ],

  'healthcare': [
    {
      name: 'Healthcare Form Privacy Interaction',
      description: 'Track form field interactions with special privacy considerations for healthcare data',
      trackingType: TrackingType.FORM_FIELD_INTERACTION,
      severity: RecommendationSeverity.CRITICAL,
      severityReason: 'HIPAA compliance requires careful tracking of form interactions without capturing PII',
      ga4EventName: 'form_field_interaction_healthcare',
      funnelStage: 'bottom',
      suggestedConfig: {
        trackFocus: true,
        trackBlur: true,
        capturePII: false,
        hipaaCompliant: true,
      },
      businessValue: 'Optimize appointment booking and patient intake forms without violating HIPAA. Identify friction in scheduling flows that cause 40% of patients to abandon.',
      implementationNotes: 'Track field-level interactions (focus, blur, change) but NEVER capture values or field names containing PHI. Use generic labels only. Essential for HIPAA compliance.',
    },
  ],

  'lead-generation': [
    {
      name: 'CTA Hover Hesitation',
      description: 'Track when users hover over CTAs but don\'t click (indicates hesitation)',
      trackingType: TrackingType.DEAD_CLICK,
      severity: RecommendationSeverity.HIGH,
      severityReason: 'Reveals friction and hesitation at critical conversion moments',
      ga4EventName: 'cta_hover_hesitation',
      funnelStage: 'bottom',
      suggestedConfig: {
        minHoverTime: 2000,
        trackMouseMovement: true,
        captureCtaText: true,
      },
      businessValue: 'Users who hover but don\'t click need more trust signals, clearer value props, or reduced friction. Fixing hesitation points can increase form submissions by 20-30%.',
      implementationNotes: 'Track mouseenter/mouseleave on CTA buttons. If hover time > 2 seconds without click, fire hesitation event. Capture CTA text and page location. Indicates messaging or trust issues.',
    },
  ],
};

/**
 * Niche alias mapping
 * Some niches share the same behavioral trackings under different names.
 */
const NICHE_ALIASES: Record<string, string> = {
  'ecommerce': 'e-commerce',
  'lead_generation': 'lead-generation',
};

/**
 * Get all behavioral trackings for a specific niche.
 * Returns universal trackings + niche-specific trackings.
 *
 * @param niche - The detected website niche (e.g., 'e-commerce', 'saas')
 * @returns Array of behavioral tracking definitions
 */
export function getBehavioralTrackings(niche: string | null): BehavioralTrackingDef[] {
  // Always include universal trackings
  const trackings = [...UNIVERSAL_BEHAVIORAL_TRACKINGS];

  // Add niche-specific trackings if available
  if (niche) {
    const normalizedNiche = NICHE_ALIASES[niche] || niche;
    const nicheTrackings = NICHE_BEHAVIORAL_TRACKINGS[normalizedNiche];
    if (nicheTrackings) {
      trackings.push(...nicheTrackings);
    }
  }

  return trackings;
}

/**
 * Convert behavioral tracking definitions to TrackingOpportunity objects.
 * These can be returned as recommendations for implementation.
 *
 * @param niche - The detected website niche
 * @param homePageUrl - The home page URL for the site
 * @returns Array of TrackingOpportunity objects
 */
export function createBehavioralOpportunities(
  niche: string | null,
  homePageUrl: string
): TrackingOpportunity[] {
  const trackings = getBehavioralTrackings(niche);

  return trackings.map((def) => ({
    name: def.name,
    description: def.description,
    trackingType: def.trackingType,
    severity: def.severity,
    severityReason: def.severityReason,
    selector: null, // Behavioral trackings don't have selectors
    selectorConfig: null,
    selectorConfidence: null,
    urlPattern: '.*', // Apply to all pages
    pageUrl: homePageUrl,
    funnelStage: def.funnelStage,
    elementContext: null,
    suggestedGA4EventName: def.ga4EventName,
    suggestedDestinations: ['GA4'],
    suggestedConfig: def.suggestedConfig,
    aiGenerated: false,
    businessValue: def.businessValue,
    implementationNotes: def.implementationNotes,
    affectedRoutes: undefined, // Optional field
  }));
}
