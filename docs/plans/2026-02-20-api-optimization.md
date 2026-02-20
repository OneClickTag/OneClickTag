# API Call Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce page load from 7.3s to under 2s by eliminating duplicate API calls, adding caching, and lazy-loading tab content.

**Architecture:** Replace raw `useEffect` + `fetch()` patterns with React Query hooks for deduplication, add HTTP cache headers and `unstable_cache` to public API routes, and gate AutoTrack hooks behind active tab state.

**Tech Stack:** Next.js App Router, React Query (TanStack Query), Prisma ORM, Next.js `unstable_cache`

---

## Phase A: Quick Wins

### Task 1: Create shared public data hooks

**Files:**
- Create: `nextjs/src/hooks/use-public-data.ts`

**Context:** Footer and CookieBanner both use raw `useEffect` + `fetch()` with no deduplication. React Query's global cache automatically deduplicates concurrent requests with the same query key. We need a shared hooks file for public endpoint data.

**Step 1: Create the hooks file**

Create `nextjs/src/hooks/use-public-data.ts` with two hooks:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

// Types matching the API responses
interface FooterConfig {
  id?: string;
  brandName: string;
  brandDescription: string;
  socialLinks: { platform: string; url: string; icon: string }[];
  sections: { title: string; links: { label: string; url: string }[] }[];
  copyrightText: string;
}

interface CookieBannerData {
  tenantId: string;
  banner: {
    isActive: boolean;
    headingText: string;
    bodyText: string;
    acceptAllButtonText: string;
    rejectAllButtonText: string;
    customizeButtonText: string;
    savePreferencesText: string;
    position: string;
    backgroundColor: string;
    textColor: string;
    acceptButtonColor: string;
    rejectButtonColor: string;
    customizeButtonColor: string;
    consentExpiryDays: number;
    showOnEveryPage: boolean;
    blockCookiesUntilConsent: boolean;
    privacyPolicyUrl: string;
    cookiePolicyUrl: string;
  };
  categories: {
    id: string;
    name: string;
    description: string;
    category: 'NECESSARY' | 'ANALYTICS' | 'MARKETING';
    isRequired: boolean;
    cookies: {
      id: string;
      name: string;
      provider: string;
      purpose: string;
      duration: string;
      type?: string;
    }[];
  }[];
}

/**
 * Footer data rarely changes. staleTime: Infinity means it fetches once per session
 * and never refetches. React Query deduplicates concurrent requests automatically.
 */
export function useFooterConfig() {
  return useQuery<FooterConfig | null>({
    queryKey: ['public', 'footer'],
    queryFn: async () => {
      const response = await fetch('/api/public/footer');
      if (!response.ok) throw new Error('Failed to fetch footer config');
      return response.json();
    },
    staleTime: Infinity, // Never refetch - footer data is nearly static
  });
}

/**
 * Cookie banner settings. 5-minute stale time since admin might update banner.
 */
export function useCookieBannerData() {
  return useQuery<CookieBannerData>({
    queryKey: ['public', 'cookie-banner'],
    queryFn: async () => {
      const response = await fetch('/api/public/cookie-banner');
      if (!response.ok) throw new Error('Failed to fetch cookie banner');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Step 2: Verify the file was created correctly**

Run: `cat nextjs/src/hooks/use-public-data.ts | head -5`
Expected: First 5 lines match the code above.

**Step 3: Commit**

```bash
git add nextjs/src/hooks/use-public-data.ts
git commit -m "feat: add shared React Query hooks for public endpoints"
```

---

### Task 2: Migrate Footer.tsx to useFooterConfig hook

**Files:**
- Modify: `nextjs/src/components/layout/Footer.tsx`

**Context:** Footer.tsx (line 127-181) has a raw `useEffect` + `fetch('/api/public/footer')` that fires on every navigation/mount. The new `useFooterConfig()` hook with `staleTime: Infinity` fetches once and caches for the session.

**Step 1: Replace the raw fetch with the hook**

In `Footer.tsx`, make these changes:

1. Add import at top:
```typescript
import { useFooterConfig } from "@/hooks/use-public-data"
```

2. Replace the component body. Remove the `useState` for config/loading and the entire `useEffect` block (lines 121-181). Replace with:

```typescript
export function Footer({ config: serverConfig }: FooterProps = {}) {
  const currentYear = new Date().getFullYear()
  const { data: fetchedConfig, isLoading } = useFooterConfig()
  const isEarlyAccessMode = process.env.NEXT_PUBLIC_EARLY_ACCESS_MODE === "true"

  // Use server config if provided (SSR), then fetched data, then defaults
  const rawConfig = serverConfig || fetchedConfig
  const loading = !serverConfig && isLoading

  // Process the config: merge with defaults, ensure cookie settings link
  const config = React.useMemo(() => {
    if (!rawConfig || (!rawConfig.brandName && !rawConfig.sections?.length)) {
      return defaultFooterConfig
    }

    const sections = Array.isArray(rawConfig.sections) && rawConfig.sections.length > 0
      ? rawConfig.sections
      : defaultFooterConfig.sections

    const sectionsWithCookieSettings = sections.map((section: FooterSection) => {
      if (section.title === "Legal" && !section.links.some((l: FooterLink) => l.url === "#cookie-settings")) {
        return { ...section, links: [...section.links, { label: "Cookie Settings", url: "#cookie-settings" }] }
      }
      return section
    })

    return {
      id: rawConfig.id || "default",
      brandName: rawConfig.brandName || defaultFooterConfig.brandName,
      brandDescription: rawConfig.brandDescription || defaultFooterConfig.brandDescription,
      socialLinks: Array.isArray(rawConfig.socialLinks) && rawConfig.socialLinks.length > 0
        ? rawConfig.socialLinks
        : defaultFooterConfig.socialLinks,
      sections: sectionsWithCookieSettings,
      copyrightText: rawConfig.copyrightText || defaultFooterConfig.copyrightText,
    }
  }, [rawConfig])
```

Keep the rest of the component (loading skeleton, render) exactly as-is, but use the new `loading` variable.

**Step 2: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to Footer.tsx

**Step 3: Commit**

```bash
git add nextjs/src/components/layout/Footer.tsx
git commit -m "refactor: migrate Footer to React Query hook, eliminate duplicate fetches"
```

---

### Task 3: Migrate CookieBanner.tsx to useCookieBannerData hook

**Files:**
- Modify: `nextjs/src/components/CookieBanner.tsx`

**Context:** CookieBanner.tsx (line 107-126) has a raw `useEffect` + `fetch('/api/public/cookie-banner')` that fires on every mount. The `useCookieBannerData()` hook caches for 5 minutes and deduplicates concurrent calls.

**Step 1: Replace the raw fetch with the hook**

In `CookieBanner.tsx`, make these changes:

1. Add import at top:
```typescript
import { useCookieBannerData } from '@/hooks/use-public-data';
```

2. Remove the `isLoading` state variable (line 98). Remove the entire first `useEffect` block (lines 107-126).

3. Replace with the hook call, right after the `preferences` state:
```typescript
  // Fetch banner settings and categories from the database
  const { data: bannerData, isLoading } = useCookieBannerData();

  // Sync fetched data into local state when it arrives
  useEffect(() => {
    if (bannerData) {
      setSettings(bannerData.banner);
      setCategories(bannerData.categories || []);
      setTenantId(bannerData.tenantId);
    }
  }, [bannerData]);
```

**Step 2: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to CookieBanner.tsx

**Step 3: Commit**

```bash
git add nextjs/src/components/CookieBanner.tsx
git commit -m "refactor: migrate CookieBanner to React Query hook, eliminate duplicate fetches"
```

---

### Task 4: Add HTTP cache headers to public API routes

**Files:**
- Modify: `nextjs/src/app/api/public/footer/route.ts`
- Modify: `nextjs/src/app/api/public/cookie-banner/route.ts`
- Modify: `nextjs/src/app/api/public/plans/route.ts`

**Context:** These public endpoints return data that changes rarely but currently have no cache headers. Every request hits the database. Adding `Cache-Control` headers lets Vercel's CDN and browser cache serve cached responses.

**Step 1: Add cache headers to footer/route.ts**

In `nextjs/src/app/api/public/footer/route.ts`, change the success response (line 23) from:
```typescript
    return NextResponse.json(footer);
```
to:
```typescript
    const response = NextResponse.json(footer);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
```

Also add cache headers to the null response (line 20):
```typescript
    if (!footer) {
      const response = NextResponse.json(null);
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return response;
    }
```

**Step 2: Add cache headers to cookie-banner/route.ts**

In `nextjs/src/app/api/public/cookie-banner/route.ts`, change the success response (line 72) from:
```typescript
    return NextResponse.json({
```
to:
```typescript
    const data = {
      tenantId,
      banner: banner || { /* ... existing defaults ... */ },
      categories: categories.map(/* ... existing mapping ... */),
    };
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
```

**Step 3: Add cache headers to plans/route.ts**

In `nextjs/src/app/api/public/plans/route.ts`, change the success response (line 23) from:
```typescript
    return NextResponse.json(plans);
```
to:
```typescript
    const response = NextResponse.json(plans);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
```

**Step 4: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add nextjs/src/app/api/public/footer/route.ts nextjs/src/app/api/public/cookie-banner/route.ts nextjs/src/app/api/public/plans/route.ts
git commit -m "perf: add Cache-Control headers to public API endpoints"
```

---

### Task 5: Optimize cookie-banner API - combine sequential DB queries

**Files:**
- Modify: `nextjs/src/app/api/public/cookie-banner/route.ts`

**Context:** The cookie-banner route makes 4 sequential DB queries (lines 20-69):
1. `prisma.tenant.findFirst()` - find default tenant
2. `prisma.tenant.findUnique()` - verify tenant exists and is active
3. `prisma.cookieConsentBanner.findUnique()` - get banner settings
4. `prisma.cookieCategory.findMany()` - get categories with cookies

Queries 1+2 can be combined (findFirst already returns the tenant). Queries 3+4 can be combined into one query using a tenant include.

**Step 1: Rewrite the query logic**

Replace the entire try block body in `cookie-banner/route.ts` with:

```typescript
  try {
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');

    // If no tenantId provided, get the default/first active tenant
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (!defaultTenant) {
        return NextResponse.json(
          { error: 'No active tenant found' },
          { status: 404 }
        );
      }
      tenantId = defaultTenant.id;
    }

    // Single query: fetch banner + categories together, also verifies tenant exists
    const [banner, categories] = await Promise.all([
      prisma.cookieConsentBanner.findUnique({
        where: { tenantId },
      }),
      prisma.cookieCategory.findMany({
        where: { tenantId },
        include: {
          cookies: {
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { category: 'asc' },
      }),
    ]);

    // Build response
    const data = {
      tenantId,
      banner: banner || {
        isActive: true,
        headingText: 'We value your privacy',
        bodyText: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
        acceptAllButtonText: 'Accept All',
        rejectAllButtonText: 'Reject All',
        customizeButtonText: 'Customize',
        savePreferencesText: 'Save Preferences',
        position: 'bottom',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        acceptButtonColor: '#10b981',
        rejectButtonColor: '#ef4444',
        customizeButtonColor: '#6b7280',
        consentExpiryDays: 365,
        showOnEveryPage: false,
        blockCookiesUntilConsent: true,
        privacyPolicyUrl: '/privacy',
        cookiePolicyUrl: '/cookie-policy',
      },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        category: category.category,
        isRequired: category.isRequired,
        cookies: category.cookies.map((cookie) => ({
          id: cookie.id,
          name: cookie.name,
          provider: cookie.provider,
          purpose: cookie.purpose,
          duration: cookie.duration,
          type: cookie.type,
        })),
      })),
    };

    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (error) {
    console.error('Get public cookie banner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
```

This reduces 4 sequential queries to 2 (findFirst + Promise.all of 2 parallel queries). The separate `tenant.findUnique` verification is removed since the banner/categories queries will simply return null/empty if the tenant doesn't exist.

**Step 2: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add nextjs/src/app/api/public/cookie-banner/route.ts
git commit -m "perf: combine sequential DB queries in cookie-banner API (4→2 queries)"
```

---

### Task 6: Lazy-load AutoTrack tab queries

**Files:**
- Modify: `nextjs/src/app/(dashboard)/customers/[id]/page.tsx`

**Context:** The customer detail page (line 326) uses Radix `<Tabs defaultValue="trackings">` which renders all tab content in the DOM. The AutoTrack component (line 493-497) mounts immediately and its hooks (`useScanHistory`, `useScanDetail`, `useCredentials`) all fire API calls on mount, even when the user is on the Trackings tab.

The fix: track active tab in state and only render AutoTrack when its tab is active.

**Step 1: Add active tab state and conditional rendering**

In `customers/[id]/page.tsx`:

1. Add `activeTab` state after the existing state declarations (around line 83):
```typescript
  const [activeTab, setActiveTab] = useState('trackings');
```

2. Change the `<Tabs>` component (line 326) from:
```typescript
      <Tabs defaultValue="trackings">
```
to:
```typescript
      <Tabs value={activeTab} onValueChange={setActiveTab}>
```

3. Wrap the AutoTrack `TabsContent` (lines 492-497) to conditionally render:
```typescript
        <TabsContent value="autotrack">
          {activeTab === 'autotrack' && (
            <AutoTrack
              customerId={id}
              customerWebsiteUrl={customer?.websiteUrl ?? undefined}
            />
          )}
        </TabsContent>
```

This ensures AutoTrack and all its hooks only mount when the user clicks the AutoTrack tab.

**Step 2: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add nextjs/src/app/(dashboard)/customers/[id]/page.tsx
git commit -m "perf: lazy-load AutoTrack tab to prevent unnecessary API calls on page load"
```

---

### Task 7: Verify Phase A results with Playwright

**Files:** None (verification only)

**Context:** After all Phase A changes, verify that duplicate calls are eliminated and response times improved.

**Step 1: Build and test**

Run: `cd nextjs && npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

**Step 2: Manual verification via dev server**

The dev servers are already running. Open a browser and navigate through the app:
- Check Network tab: Footer should only be fetched once across navigations
- Check Network tab: Cookie-banner should only be fetched once per 5 minutes
- Check Network tab: AutoTrack API calls should NOT fire when on Trackings tab
- Check Response headers: Public endpoints should have `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`

**Step 3: Commit any remaining fixes**

If any issues found, fix and commit.

---

## Phase B: Comprehensive Optimization

### Task 8: Add missing database indexes

**Files:**
- Modify: `nextjs/prisma/schema.prisma`

**Context:** Several foreign key columns used in WHERE clauses and JOINs lack indexes. The Prisma schema needs `@@index` directives added to models.

**Step 1: Read current schema to find exact model locations**

Read `nextjs/prisma/schema.prisma` and find the models: `tracking`, `ga4Property`, `footerContent`, `cookieCategory`, `siteScan`.

**Step 2: Add indexes**

Add these `@@index` directives to the appropriate models:

For `tracking` model (if not already present):
```prisma
  @@index([customerId, tenantId])
```

For `ga4Property` model:
```prisma
  @@index([customerId])
```

For `footerContent` model:
```prisma
  @@index([isActive])
```

For `cookieCategory` model:
```prisma
  @@index([tenantId])
```

For `siteScan` model:
```prisma
  @@index([customerId, tenantId, status])
```

**Step 3: Generate migration**

Run: `cd nextjs && npx prisma migrate dev --name add_missing_indexes 2>&1 | tail -10`
Expected: Migration created and applied successfully.

**Step 4: Commit**

```bash
git add nextjs/prisma/schema.prisma nextjs/prisma/migrations/
git commit -m "perf: add missing database indexes on foreign key columns"
```

---

### Task 9: Parallelize Google API calls in OAuth callback

**Files:**
- Modify: `nextjs/src/app/api/auth/google/callback/route.ts`

**Context:** The OAuth callback makes sequential calls to sync GTM, Ads, and GA4 data. Each sync is independent and non-blocking. They should run in parallel with `Promise.allSettled()`.

**Step 1: Read the callback route**

Read `nextjs/src/app/api/auth/google/callback/route.ts` and identify the sequential sync calls.

**Step 2: Wrap syncs in Promise.allSettled**

Find the section where GTM setup, Ads sync, and GA4 sync are called sequentially. Replace with:

```typescript
// Run all syncs in parallel - each has its own error handling
const [gtmResult, adsResult, ga4Result] = await Promise.allSettled([
  syncGTMSetup(customerId, tokens),
  syncGoogleAdsAccounts(customerId, tokens),
  syncGA4Properties(customerId, tokens),
]);

// Log results but don't block the callback
if (gtmResult.status === 'rejected') {
  console.warn('GTM sync failed:', gtmResult.reason);
}
if (adsResult.status === 'rejected') {
  console.warn('Ads sync failed:', adsResult.reason);
}
if (ga4Result.status === 'rejected') {
  console.warn('GA4 sync failed:', ga4Result.reason);
}
```

**Step 3: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add nextjs/src/app/api/auth/google/callback/route.ts
git commit -m "perf: parallelize GTM/Ads/GA4 syncs in OAuth callback"
```

---

### Task 10: Parallelize Google API list operations

**Files:**
- Modify: `nextjs/src/lib/google/ga4.ts`
- Modify: `nextjs/src/lib/google/ads.ts`

**Context:** `listGA4Properties()` makes 1 + N + M sequential API calls (accounts → properties per account → data streams per property). `listAccessibleAccounts()` makes 1 + N sequential calls. These inner loops should be parallelized.

**Step 1: Read both files**

Read `nextjs/src/lib/google/ga4.ts` and `nextjs/src/lib/google/ads.ts` to find the sequential loops.

**Step 2: Parallelize GA4 property fetches**

In `ga4.ts`, find the loop that iterates through accounts fetching properties for each. Replace the sequential loop with:

```typescript
const propertiesPerAccount = await Promise.allSettled(
  accounts.map(account => fetchPropertiesForAccount(account))
);
const allProperties = propertiesPerAccount
  .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
  .flatMap(r => r.value);
```

**Step 3: Parallelize Ads account detail fetches**

In `ads.ts`, find the loop that fetches details for each account. Replace with similar `Promise.allSettled()` pattern.

**Step 4: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```bash
git add nextjs/src/lib/google/ga4.ts nextjs/src/lib/google/ads.ts
git commit -m "perf: parallelize Google API list operations (GA4 properties, Ads accounts)"
```

---

### Task 11: Split customer detail queries by active tab

**Files:**
- Modify: `nextjs/src/app/(dashboard)/customers/[id]/page.tsx`

**Context:** The customer detail page (line 109-111) always fetches with `?includeGoogleAds=true`, loading Google Ads accounts and GA4 properties even when the user is on the Trackings tab. The Google data is only needed on the Settings tab.

**Step 1: Make the Google data fetch conditional**

Change line 109-112 from:
```typescript
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/api/customers/${id}?includeGoogleAds=true`),
  });
```
to:
```typescript
  // Base customer data - always loaded
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/api/customers/${id}`),
  });

  // Google data - only loaded when Settings tab is active
  const { data: customerWithGoogle } = useQuery({
    queryKey: ['customer', id, 'google'],
    queryFn: () => api.get<Customer>(`/api/customers/${id}?includeGoogleAds=true`),
    enabled: activeTab === 'settings',
  });

  // Merge Google data into customer when available
  const customerForSettings = customerWithGoogle || customer;
```

Then in the Settings tab content, use `customerForSettings` instead of `customer` for Google-related fields (googleAdsAccounts, ga4Properties).

**Step 2: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add nextjs/src/app/(dashboard)/customers/[id]/page.tsx
git commit -m "perf: lazy-load Google Ads/GA4 data only when Settings tab is active"
```

---

### Task 12: Consolidate auth provider duplicate code

**Files:**
- Modify: `nextjs/src/components/providers/auth-provider.tsx`

**Context:** The auth provider has 3 near-identical `fetch('/api/auth/login')` calls. Extract a shared function to eliminate duplication and ensure consistent error handling.

**Step 1: Read the auth provider**

Read `nextjs/src/components/providers/auth-provider.tsx` and identify the 3 duplicate fetch calls.

**Step 2: Extract shared function**

Create a private function inside the provider:

```typescript
async function authenticateWithBackend(
  idToken: string,
  turnstileToken?: string
): Promise<{ user: AuthUser; token: string }> {
  const body: Record<string, string> = { idToken };
  if (turnstileToken) body.turnstileToken = turnstileToken;

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
}
```

Replace all 3 call sites to use this function.

**Step 3: Verify it compiles**

Run: `cd nextjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add nextjs/src/components/providers/auth-provider.tsx
git commit -m "refactor: consolidate duplicate auth login calls into shared function"
```

---

### Task 13: Final verification and build

**Files:** None (verification only)

**Step 1: Full build**

Run: `cd nextjs && npm run build 2>&1 | tail -30`
Expected: Build succeeds.

**Step 2: Run any existing tests**

Run: `cd nextjs && npm test 2>&1 | tail -20` (if tests exist)
Expected: Tests pass or no tests found.

**Step 3: Final commit with all changes verified**

If any remaining fixes needed, commit them.

---

## Expected Impact

### After Phase A (Tasks 1-7):
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial page load | 7.3s | ~2s | 73% faster |
| Cookie banner API | 2,585ms | <100ms (cached) | 96% faster |
| Footer API calls per session | 8x | 1x | 87% reduction |
| Duplicate requests | 10+ | 0 | 100% elimination |
| AutoTrack API calls on page load | 3+ | 0 | 100% elimination |

### After Phase B (Tasks 8-13):
| Metric | After A | After B | Improvement |
|--------|---------|---------|-------------|
| OAuth callback | 10-30s | 3-8s | 60-70% faster |
| Customer detail initial load | ~1s | ~400ms | 60% faster |
| DB query time | Variable | Indexed | 30-50% faster |
