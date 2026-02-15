# AutoTrack V2 - Deep Explorer

## Problem

The current AutoTrack scanner is "weak" - it uses static HTML parsing in Phase 1 (misses SPA routes, JS-rendered content), stores login credentials but never uses them, doesn't handle real-world browsing obstacles (cookie banners, popups), and generates only obvious tracking suggestions. The crawl is shallow (50 pages, depth 3) and doesn't simulate user flows.

## Solution

Replace the crawling engine with a full Playwright-based dynamic explorer that browses sites like a real user, handles authentication live, auto-dismisses obstacles, simulates user interactions, and generates comprehensive behavioral tracking recommendations that give "100% knowledge of the user."

## Architecture

### 1. Playwright-First Unified Crawler

Replace HTML-fetch Phase 1 with Playwright for all page discovery.

**Persistent browser context**: Cookies are serialized to the database between chunks so the Playwright session persists across the client-driven chunk loop (Vercel 30s timeout constraint).

**Adaptive priority queue**: URLs are re-ranked dynamically based on discoveries:
- Checkout page found -> bump all `/checkout/*` paths to top
- User dashboard found -> prioritize authenticated routes
- Product category found -> crawl representatives from each category

**Defaults**: `maxPages: 200`, `maxDepth: 8`

**Smart template deduplication**: Detect pages with identical content structure (e.g., 50 blog posts with same layout). Crawl 3-5 representatives, note the template pattern, skip the rest.

### 2. Auto-Obstacle Handling

Before interacting with any page, run a "clean the page" routine:

1. Wait 2s after load for popups to appear
2. Detect overlay elements (`position: fixed`, `z-index > 1000`, covers >30% of viewport)
3. Find and click close/accept/dismiss buttons
4. Wait 500ms for animation, proceed

Handles:
- Cookie consent banners (always accept)
- Newsletter/subscribe popups (dismiss)
- Age verification gates (accept)
- GDPR/privacy popups (accept all)
- Survey/feedback popups (close)
- Full-screen interstitials (find skip/close)
- Chat widgets (ignore, don't interact)

Additional smart behaviors:
- Infinite scroll: scroll 5 times to load content
- Pagination: click "Next" / page numbers
- "Load More" buttons: click to reveal content
- Rate limiting: exponential backoff on 429
- Bot avoidance: random delays (500-2000ms), human-like scroll patterns

### 3. Live Authentication Flow

When the crawler detects a login page mid-crawl:

1. **Detection** (enhanced): URL patterns, password fields, OAuth buttons, CAPTCHA, MFA indicators
2. **Pause**: Scan pauses, UI shows live credential modal
3. **User provides credentials**: Username/email + password form
4. **Automated login**: Playwright fills form, submits, waits for redirect
5. **Success detection**: Check for redirect away from login, logout button presence, user avatar
6. **Failure handling**: Show error, let user retry
7. **MFA support**: If MFA detected, pause again for code input
8. **Session persistence**: Browser context retains cookies for all subsequent pages
9. **Credential storage**: Encrypted in `SiteCredential` table, user opts in to save for future scans

### 4. Deep Page Analysis (Per Page)

On every page, the crawler performs:

- Full scroll to bottom (measure total page height, detect lazy-loaded content at each scroll position)
- Click all accordions (`[aria-expanded="false"]`) and tabs
- Hover nav items to reveal dropdowns/mega-menus
- Open modals (`data-toggle="modal"`, onclick handlers)
- Expand collapsed sections
- Click "Load More" / "Show More" buttons
- Monitor for dynamically loaded content
- Detect existing analytics/tracking calls (dataLayer pushes, console output)
- Extract all interactive elements with full context (position, visibility, event listeners)
- Detect SPA client-side routing (`pushState` / `popstate`)

### 5. Comprehensive Behavioral Tracking Recommendations

#### Universal (every site):

| Tracking | GA4 Event | Implementation |
|----------|-----------|----------------|
| Scroll Depth (25/50/75/100%) | `scroll_depth` | GTM scroll trigger |
| Time on Page (15/30/60/120/300s) | `time_on_page` | GTM timer trigger |
| Page Engagement Score | `page_engagement` | Custom GTM tag combining scroll+time+clicks |
| Rage Clicks | `rage_click` | Custom JS: rapid repeated clicks on same element |
| Dead Clicks | `dead_click` | Custom JS: clicks on non-interactive elements |
| Tab Focus/Blur | `tab_visibility` | `visibilitychange` event |
| Session Duration | `session_duration` | Custom session timer |
| Exit Intent | `exit_intent` | `mouseleave` on document |
| Copy Text | `text_copy` | `copy` event listener |
| Print Page | `page_print` | `beforeprint` event |
| Form Field Interaction | `form_field_focus` | Focus/blur listeners per field |
| Error Page Views | `error_page` | URL pattern trigger |
| Return Visitor | `return_visitor` | Cookie/localStorage check |
| Outbound Link Clicks | `outbound_click` | Link click listener for external domains |

#### Niche-Specific (added per detected niche):

**E-commerce**: Product image zoom, size/variant changes, wishlist vs cart, cart abandonment, comparison, review depth, price filter patterns

**SaaS/Lead Gen**: Pricing scroll depth, feature comparison interaction, demo video watch %, FAQ expansion, pricing toggle, CTA hover hesitation

**Blog/Content**: Article read-through rate, related article clicks, social shares, comment interaction, category preferences

**Healthcare/Professional**: Location finder usage, appointment booking funnel, insurance form completion, patient portal frequency

### 6. Visual Sitemap in Results

Tree view of all discovered routes:

```
example.com
|-- / (Homepage)              [scanned] 3 trackings
|-- /products/                [scanned]
|   |-- /products/cat-a/     [scanned] 2 trackings
|   |-- /products/cat-b/     [scanned]
|-- /checkout/                [scanned] 5 trackings (CRITICAL)
|   |-- /checkout/shipping/  [scanned] 2 trackings
|   |-- /checkout/payment/   [scanned] 3 trackings
|-- /account/                 [authenticated]
|   |-- /account/dashboard/  [authenticated] 1 tracking
|   |-- /account/orders/     [authenticated]
|-- /blog/                    [scanned]
|   |-- 12 posts (template)  [scanned]
|-- /contact/                 [scanned] 2 trackings
|-- /login/                   [login page]
```

**Color coding**: Green=scanned, Gold=authenticated, Blue=login, Orange=error, Red=blocked

**Each node shows**: Page type, tracking recommendation count, auth status, key elements

**Summary stats**: Total routes, scanned count, authenticated count, total recommendations, coverage %

**Template grouping**: 5+ pages with same layout collapsed into one expandable node

### 7. Schema Changes

#### New TrackingType enum values:
```
RAGE_CLICK, DEAD_CLICK, TAB_VISIBILITY, SESSION_DURATION,
EXIT_INTENT, TEXT_COPY, PAGE_PRINT, FORM_FIELD_INTERACTION,
ERROR_PAGE_VIEW, RETURN_VISITOR, OUTBOUND_CLICK, PAGE_ENGAGEMENT,
PRODUCT_IMAGE_INTERACTION, CART_ABANDONMENT, PRICE_COMPARISON,
REVIEW_INTERACTION, CONTENT_READ_THROUGH
```

#### ScanPage additions:
- `isAuthenticated Boolean @default(false)` - behind login?
- `templateGroup String?` - template pattern grouping
- `scrollableHeight Int?` - total page height in pixels
- `interactiveElementCount Int?` - interactive elements found
- `obstaclesEncountered Json?` - popups/banners dismissed

#### SiteScan additions:
- `authenticatedPagesCount Int @default(0)` - pages requiring auth
- `obstaclesDismissed Int @default(0)` - auto-handled popups
- `totalInteractions Int @default(0)` - clicks/scrolls/hovers during scan
- `sessionCookies Json?` - serialized cookies for context reuse between chunks

#### TrackingRecommendation additions:
- `businessValue String? @db.Text` - why this tracking matters
- `implementationNotes String? @db.Text` - specific implementation notes
- `affectedRoutes Json?` - array of route URLs where this applies

### 8. UI Changes

**During scan (live discovery)**:
- Live credential prompt modal when login detected
- Obstacle dismissal counter ("Dismissed 3 cookie banners, 2 popups")
- "Authenticated area" badge on pages in URL feed
- Interaction counter ("Performed 47 interactions across 12 pages")

**Results page**:
- New "Explored Routes" tab with visual sitemap tree
- Route-aware tracking detail view (shows which routes each tracking affects)
- Coverage percentage banner
- Enhanced recommendation cards with business value explanation

## Files to Modify

### Backend (Services):
- `chunk-processor.ts` - Replace Phase 1 with Playwright, add obstacle handling, auth flow
- `crawl-engine.ts` - Enhance element extraction, add interaction simulation
- `html-crawler.ts` - Keep for fallback/utilities, remove as primary crawler
- `tracking-detector.ts` - Add universal behavioral tracking detection
- `recommendation-engine.ts` - Add behavioral recommendation generation
- New: `obstacle-handler.ts` - Cookie banner/popup auto-dismiss logic
- New: `auth-handler.ts` - Login automation, session management
- New: `interaction-simulator.ts` - Tab/accordion/modal/scroll simulation
- New: `behavioral-tracking.ts` - Universal + niche behavioral tracking definitions

### Database:
- `schema.prisma` - New enum values, new fields on ScanPage/SiteScan/TrackingRecommendation
- New migration for schema changes

### API Routes:
- `process-chunk/route.ts` - Handle auth pause/resume, pass credentials
- New: `scans/[scanId]/provide-credentials/route.ts` - Accept credentials mid-scan
- New: `scans/[scanId]/provide-mfa/route.ts` - Accept MFA code

### Frontend Components:
- `ScanDiscoveryDashboard.tsx` - Add obstacle counter, auth badges
- `AutoTrack.tsx` - Handle auth pause state, credential modal
- `CredentialPrompt.tsx` - Enhance for live mid-scan prompts
- New: `ExploredRoutes.tsx` - Visual sitemap tree component
- New: `RouteNode.tsx` - Individual route tree node
- `ScanResults.tsx` - Add "Explored Routes" tab
- `RecommendationCard.tsx` - Add business value, affected routes

### Hooks:
- `use-site-scanner.ts` - Add credential submission, MFA, auth state handling

## Non-Goals (YAGNI)

- Video recording of crawl sessions
- OAuth-based login (Google/Facebook buttons on target site)
- Custom user agent selection
- Proxy/VPN support
- Multi-language crawling
- Visual regression testing
- Scheduled re-scans
