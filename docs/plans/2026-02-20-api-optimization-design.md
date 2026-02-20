# API Call Optimization Design

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Phase A (Quick Wins) + Phase B (Comprehensive Optimization)

---

## Problem

Page loads take 7.3 seconds. The target is under 2 seconds. The root causes are:

1. Duplicate API calls on every page load (footer 8x, cookie-banner 2x)
2. Extremely slow public API responses (cookie-banner 2.5s, footer 2s)
3. Customer detail page fetches all tab data upfront regardless of active tab
4. No caching layer anywhere (no Redis, no HTTP cache headers, no ISR)
5. N+1 Google API calls in OAuth callback and sync operations
6. Missing database indexes on foreign key columns

## Phase A: Quick Wins (~2-3 days)

### A1. Fix duplicate footer/cookie-banner calls

**Problem:** Footer.tsx and CookieBanner.tsx each use raw `useEffect` + `fetch()` with no deduplication. React strict mode double-mounts cause 2x calls. Navigation re-mounts the Footer component on each page, causing 8x calls across 4 pages.

**Solution:** Move both to React Query hooks with proper query keys and stale times. Footer data is nearly static - fetch once globally and cache for the session.

**Files:**
- `nextjs/src/components/layout/Footer.tsx` - Replace raw fetch with `useQuery`
- `nextjs/src/components/CookieBanner.tsx` - Replace raw fetch with `useQuery`
- `nextjs/src/hooks/use-public-data.ts` - New shared hook for public endpoints

**Approach:**
- Create `useFooterConfig()` hook with `staleTime: Infinity` (data rarely changes)
- Create `useCookieBanner()` hook with `staleTime: 5 * 60 * 1000` (5 min)
- React Query automatically deduplicates concurrent requests with the same key
- This eliminates all duplicate calls immediately

### A2. Optimize cookie-banner API response time

**Problem:** `/api/public/cookie-banner/route.ts` makes 3-4 sequential DB queries:
1. Find default tenant (no tenantId param)
2. Verify tenant exists and is active
3. Find banner settings
4. Find categories with cookies

**Solution:** Combine into fewer queries and add Next.js response caching.

**Files:**
- `nextjs/src/app/api/public/cookie-banner/route.ts`
- `nextjs/src/app/api/public/footer/route.ts`

**Approach:**
- Combine tenant lookup + banner + categories into a single query using Prisma includes
- Add `unstable_cache` (Next.js) with 5-minute revalidation for these public endpoints
- Add `Cache-Control: s-maxage=300, stale-while-revalidate=600` headers
- Target: 2,500ms down to <100ms

### A3. Lazy-load AutoTrack tab queries

**Problem:** Customer detail page mounts all 3 tabs immediately. AutoTrack tab's hooks (`useScanHistory`, `useScanDetail`, `useCredentials`) all fire on page load even when user is on the Trackings tab.

**Solution:** Add `enabled` flag to AutoTrack queries based on active tab.

**Files:**
- `nextjs/src/app/(dashboard)/customers/[id]/page.tsx`
- `nextjs/src/components/autotrack/AutoTrack.tsx`
- `nextjs/src/hooks/use-site-scanner.ts`

**Approach:**
- Track active tab in state: `const [activeTab, setActiveTab] = useState('trackings')`
- Pass `enabled={activeTab === 'autotrack'}` to AutoTrack component
- AutoTrack component gates its hooks with this flag
- SSE connection for scan progress only opens when AutoTrack tab is active

### A4. Add HTTP cache headers to public endpoints

**Problem:** No cache headers on any API response. Every request hits the database.

**Solution:** Add appropriate cache headers to static-ish endpoints.

**Files:**
- `nextjs/src/app/api/public/footer/route.ts`
- `nextjs/src/app/api/public/cookie-banner/route.ts`
- `nextjs/src/app/api/public/plans/route.ts`

**Approach:**
- Public endpoints: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Auth endpoints: No caching (already correct)
- Customer data: `Cache-Control: private, no-cache` (already correct by default)

### A5. Optimize footer API and reduce calls

**Problem:** Footer is fetched on every navigation (8x across 4 pages). The query is simple but connection pool cold starts on serverless make it slow.

**Solution:** Fetch footer data once at the layout level, share via context.

**Files:**
- `nextjs/src/components/layout/Footer.tsx`
- `nextjs/src/app/layout.tsx` or the appropriate layout wrapping public pages

**Approach:**
- Fetch footer in the root layout's server component and pass as prop
- OR use React Query with `staleTime: Infinity` so it never refetches after first load
- Footer content changes very rarely, so aggressive caching is safe

---

## Phase B: Comprehensive Optimization (~1-2 weeks)

### B1. Add missing database indexes

**Problem:** Foreign key columns used in WHERE clauses and JOINs lack indexes.

**Files:**
- `nextjs/prisma/schema.prisma`

**Indexes to add:**
```
tracking: @@index([customerId, tenantId])
googleAdsAccount: @@index([customerId]) (already has [tenantId, customerId])
ga4Property: @@index([customerId])
footerContent: @@index([isActive])
cookieConsentBanner: already has @@unique([tenantId]) - good
cookieCategory: @@index([tenantId])
siteScan: @@index([customerId, tenantId, status])
```

### B2. Parallelize Google API calls in OAuth callback

**Problem:** OAuth callback makes sequential calls to GTM, Ads, GA4. Takes 10-30s.

**Files:**
- `nextjs/src/app/api/auth/google/callback/route.ts`
- `nextjs/src/lib/google/ga4.ts`
- `nextjs/src/lib/google/ads.ts`

**Approach:**
- Wrap GTM, Ads, GA4 syncs in `Promise.allSettled()` instead of sequential
- Each sync already has its own error handling (non-blocking)
- In `listGA4Properties()`: parallelize property fetches per account with `Promise.allSettled()`
- In `listAccessibleAccounts()`: parallelize account detail fetches with `Promise.allSettled()`

### B3. Batch N+1 database operations

**Problem:** OAuth callback and sync-google loop through results doing individual upserts.

**Files:**
- `nextjs/src/app/api/auth/google/callback/route.ts`
- `nextjs/src/app/api/customers/[id]/sync-google/route.ts`

**Approach:**
- Replace individual `prisma.googleAdsAccount.upsert()` in loops with batch approach
- Use `prisma.$transaction()` to wrap bulk operations
- For GA4 properties: delete stale + createMany for new ones (simpler than individual upserts)

### B4. Implement server-side caching for Google API responses

**Problem:** GTM containers, Ads accounts, GA4 properties fetched from Google APIs repeatedly with no caching.

**Files:**
- `nextjs/src/lib/google/gtm.ts`
- `nextjs/src/lib/google/ads.ts`
- `nextjs/src/lib/google/ga4.ts`
- `nextjs/src/lib/cache.ts` (new)

**Approach:**
- Create a simple in-memory cache with TTL (Map + setTimeout)
- Cache key: `${customerId}:${resource}` (e.g., `cust123:gtm-containers`)
- TTL: 1 hour for containers/accounts/properties
- Invalidate on explicit sync-google action
- No Redis needed - in-memory is fine for serverless with short-lived instances

### B5. Split customer detail queries by tab

**Problem:** `GET /api/customers/{id}?includeGoogleAds=true` returns Google Ads accounts and GA4 properties even when user is on Trackings tab.

**Files:**
- `nextjs/src/app/(dashboard)/customers/[id]/page.tsx`
- `nextjs/src/hooks/use-customers.ts`

**Approach:**
- Default customer query: basic fields only (no `includeGoogleAds`)
- Settings tab: separate query for Google data with `enabled: activeTab === 'settings'`
- Reduces initial payload size and DB query complexity

### B6. Consolidate auth provider duplicate code

**Problem:** Auth provider has 3 near-identical `fetch('/api/auth/login')` calls.

**Files:**
- `nextjs/src/components/providers/auth-provider.tsx`

**Approach:**
- Extract shared `authenticateWithBackend(idToken, turnstileToken?)` function
- All 3 call sites use this function
- Consistent error handling and cookie management

### B7. Fix raw SQL workaround for GTM fields

**Problem:** Customer GET endpoint uses `prisma.$queryRawUnsafe()` to fetch GTM fields separately.

**Files:**
- `nextjs/src/app/api/customers/[id]/route.ts`

**Approach:**
- Investigate why Prisma schema doesn't include GTM fields in the generated client
- Run `prisma generate` to ensure client is up to date
- Remove raw SQL query and use standard Prisma include

---

## Expected Results

### After Phase A:
| Metric | Before | After A | Improvement |
|--------|--------|---------|-------------|
| Initial page load | 7.3s | ~2s | 73% faster |
| Cookie banner API | 2,585ms | <100ms | 96% faster |
| Footer API calls | 8x | 1x | 87% reduction |
| Duplicate requests | 10+ | 0 | 100% elimination |

### After Phase B:
| Metric | After A | After B | Improvement |
|--------|---------|---------|-------------|
| OAuth callback | 10-30s | 3-8s | 60-70% faster |
| Customer detail load | ~1s | ~400ms | 60% faster |
| Google API calls | N+1 | Parallel | 50-70% faster |
| DB query time | Variable | Indexed | 30-50% faster |

---

## Out of Scope (Phase C - Later)

- Static Site Generation for footer/cookie-banner
- WebSocket replacement for SSE
- API response compression middleware
- Request coalescing
- Materialized views for analytics
- PgBouncer for connection pooling
