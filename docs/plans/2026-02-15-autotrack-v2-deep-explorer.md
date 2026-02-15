# AutoTrack V2 - Deep Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the AutoTrack crawler with a full Playwright-based dynamic explorer that handles authentication, auto-dismisses obstacles, simulates user interactions, generates comprehensive behavioral tracking recommendations, and shows a visual sitemap of explored routes.

**Architecture:** Unified Playwright-first crawler replaces the HTML-fetch Phase 1. Browser context cookies are serialized to the DB between chunks for session persistence. New services handle obstacle dismissal, authentication automation, interaction simulation, and behavioral tracking generation. A visual sitemap component shows the user what was explored.

**Tech Stack:** Playwright (already in project), Prisma ORM, React + Shadcn UI + Tailwind CSS, Next.js API routes

**Design Doc:** `docs/plans/2026-02-15-autotrack-v2-deep-explorer-design.md`

---

## Task 1: Database Schema Migration

**Files:**
- Modify: `nextjs/prisma/schema.prisma`
- Create: Migration via `npx prisma migrate dev`

**Step 1: Add new TrackingType enum values**

In `nextjs/prisma/schema.prisma`, add these values to the `TrackingType` enum (after `CUSTOM_EVENT`):

```prisma
  // Advanced Behavioral
  RAGE_CLICK
  DEAD_CLICK
  TAB_VISIBILITY
  SESSION_DURATION
  EXIT_INTENT
  TEXT_COPY
  PAGE_PRINT
  FORM_FIELD_INTERACTION
  ERROR_PAGE_VIEW
  RETURN_VISITOR
  OUTBOUND_CLICK
  PAGE_ENGAGEMENT

  // Niche-Specific Behavioral
  PRODUCT_IMAGE_INTERACTION
  CART_ABANDONMENT
  PRICE_COMPARISON
  REVIEW_INTERACTION
  CONTENT_READ_THROUGH
```

**Step 2: Add new ScanPage fields**

Add these fields to the `ScanPage` model (after `contentSummary`):

```prisma
  isAuthenticated       Boolean @default(false)
  templateGroup         String?
  scrollableHeight      Int?
  interactiveElementCount Int?
  obstaclesEncountered  Json?
```

**Step 3: Add new SiteScan fields**

Add these fields to the `SiteScan` model (after `aiAnalysisUsed`):

```prisma
  // V2: Deep Explorer
  authenticatedPagesCount Int     @default(0)
  obstaclesDismissed      Int     @default(0)
  totalInteractions       Int     @default(0)
  sessionCookies          Json?
```

**Step 4: Add new TrackingRecommendation fields**

Add these fields to the `TrackingRecommendation` model (after `aiGenerated`):

```prisma
  businessValue       String? @db.Text
  implementationNotes String? @db.Text
  affectedRoutes      Json?
```

**Step 5: Add new SiteScanStatus enum value**

Add `AWAITING_AUTH` after `AWAITING_CONFIRMATION` in the `SiteScanStatus` enum:

```prisma
  AWAITING_AUTH
```

**Step 6: Run migration**

```bash
cd nextjs && npx prisma migrate dev --name autotrack_v2_deep_explorer
```

**Step 7: Generate Prisma client**

```bash
cd nextjs && npx prisma generate
```

**Step 8: Commit**

```bash
git add nextjs/prisma/
git commit -m "feat(db): add AutoTrack V2 schema - new tracking types, scan fields, auth status"
```

---

## Task 2: Obstacle Handler Service

**Files:**
- Create: `nextjs/src/lib/site-scanner/services/obstacle-handler.ts`

**Step 1: Create the obstacle handler**

This service detects and dismisses cookie banners, popups, overlays, and other browsing obstacles on each page.

```typescript
// nextjs/src/lib/site-scanner/services/obstacle-handler.ts
import { Page } from 'playwright-core';

export interface ObstacleResult {
  dismissed: number;
  obstacles: Array<{
    type: string;
    selector: string;
    action: string;
  }>;
}

// Common accept/close button selectors for cookie banners
const COOKIE_ACCEPT_SELECTORS = [
  // Text-based (most reliable)
  'button:has-text("Accept All")',
  'button:has-text("Accept all")',
  'button:has-text("Accept Cookies")',
  'button:has-text("Accept cookies")',
  'button:has-text("I Agree")',
  'button:has-text("I agree")',
  'button:has-text("Allow All")',
  'button:has-text("Allow all")',
  'button:has-text("Allow Cookies")',
  'button:has-text("Agree")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
  'a:has-text("Accept All")',
  'a:has-text("Accept all")',
  'a:has-text("I Agree")',
  // ID-based (common cookie consent libraries)
  '#onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  '#cookie-accept',
  '#accept-cookies',
  '#gdpr-cookie-accept',
  '#cookieAcceptButton',
  '.cc-accept',
  '.cc-allow',
  '.cookie-consent-accept',
  '[data-action="accept-cookies"]',
  '[data-cookie-accept]',
  // Class-based
  '.js-accept-cookies',
  '.accept-cookies-button',
];

// Common close button selectors for popups/overlays
const POPUP_CLOSE_SELECTORS = [
  // Generic close buttons
  'button[aria-label="Close"]',
  'button[aria-label="close"]',
  'button[aria-label="Dismiss"]',
  '[class*="close-button"]',
  '[class*="close-btn"]',
  '[class*="CloseButton"]',
  '[class*="modal-close"]',
  '[class*="popup-close"]',
  '[class*="dismiss"]',
  '.close-modal',
  '.modal-close',
  // X buttons
  'button:has-text("X")',
  'button:has-text("x")',
  'button:has-text("\u00d7")',
  // Skip/No thanks
  'button:has-text("No thanks")',
  'button:has-text("No, thanks")',
  'button:has-text("Skip")',
  'button:has-text("Not now")',
  'button:has-text("Maybe later")',
  'button:has-text("Close")',
  'a:has-text("No thanks")',
  'a:has-text("Skip")',
  'a:has-text("Close")',
];

// Age verification accept selectors
const AGE_VERIFY_SELECTORS = [
  'button:has-text("I am over 18")',
  'button:has-text("I am 18")',
  'button:has-text("Yes, I am")',
  'button:has-text("Enter")',
  'button:has-text("I\'m over 21")',
  '[data-age-gate-accept]',
];

/**
 * Dismiss all obstacles on a page (cookie banners, popups, overlays).
 * Call this after page load and after waiting ~2s for delayed popups.
 */
export async function dismissObstacles(page: Page): Promise<ObstacleResult> {
  const result: ObstacleResult = { dismissed: 0, obstacles: [] };

  // Wait for delayed popups to appear
  await page.waitForTimeout(2000);

  // 1. Cookie consent banners
  for (const selector of COOKIE_ACCEPT_SELECTORS) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 300 })) {
        await el.click({ timeout: 2000 });
        result.dismissed++;
        result.obstacles.push({ type: 'cookie_banner', selector, action: 'accepted' });
        await page.waitForTimeout(500);
        break; // One cookie banner per page
      }
    } catch {
      // Selector not found or not clickable, continue
    }
  }

  // 2. Age verification gates
  for (const selector of AGE_VERIFY_SELECTORS) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 300 })) {
        await el.click({ timeout: 2000 });
        result.dismissed++;
        result.obstacles.push({ type: 'age_verification', selector, action: 'accepted' });
        await page.waitForTimeout(500);
        break;
      }
    } catch {
      // Continue
    }
  }

  // 3. Detect and dismiss overlay popups (newsletter, subscribe, etc.)
  await dismissOverlayPopups(page, result);

  return result;
}

/**
 * Detect overlays covering >30% of viewport and dismiss them.
 */
async function dismissOverlayPopups(page: Page, result: ObstacleResult): Promise<void> {
  try {
    // Find fixed/absolute positioned elements with high z-index covering significant viewport
    const overlays = await page.evaluate(() => {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const viewportArea = viewport.width * viewport.height;
      const results: Array<{ selector: string; area: number }> = [];

      document.querySelectorAll('*').forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          (style.position === 'fixed' || style.position === 'absolute') &&
          parseInt(style.zIndex || '0') > 100
        ) {
          const rect = el.getBoundingClientRect();
          const area = rect.width * rect.height;
          if (area > viewportArea * 0.15) {
            // Build a selector for this element
            let sel = el.tagName.toLowerCase();
            if (el.id) sel = `#${el.id}`;
            else if (el.className && typeof el.className === 'string') {
              const firstClass = el.className.split(' ').filter(c => c.trim())[0];
              if (firstClass) sel = `.${firstClass}`;
            }
            results.push({ selector: sel, area: area / viewportArea });
          }
        }
      });

      return results;
    });

    for (const overlay of overlays) {
      // Try to find and click a close button within the overlay
      for (const closeSelector of POPUP_CLOSE_SELECTORS) {
        try {
          const closeBtn = page.locator(`${overlay.selector} ${closeSelector}`).first();
          if (await closeBtn.isVisible({ timeout: 300 })) {
            await closeBtn.click({ timeout: 2000 });
            result.dismissed++;
            result.obstacles.push({
              type: 'overlay_popup',
              selector: `${overlay.selector} ${closeSelector}`,
              action: 'closed',
            });
            await page.waitForTimeout(500);
            break;
          }
        } catch {
          // Continue trying other close selectors
        }
      }
    }
  } catch {
    // Overlay detection failed, continue
  }
}
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/site-scanner/services/obstacle-handler.ts
git commit -m "feat(scanner): add obstacle handler for cookie banners and popups"
```

---

## Task 3: Authentication Handler Service

**Files:**
- Create: `nextjs/src/lib/site-scanner/services/auth-handler.ts`

**Step 1: Create the authentication handler**

This service handles automated login during crawls.

```typescript
// nextjs/src/lib/site-scanner/services/auth-handler.ts
import { Page, BrowserContext } from 'playwright-core';

export interface LoginResult {
  success: boolean;
  error?: string;
  requiresMfa?: boolean;
  requiresCaptcha?: boolean;
  redirectUrl?: string;
}

export interface LoginPageInfo {
  isLogin: boolean;
  loginUrl: string | null;
  formSelector: string | null;
  usernameSelector: string | null;
  passwordSelector: string | null;
  submitSelector: string | null;
  hasCaptcha: boolean;
  hasOAuth: boolean;
  hasMfa: boolean;
}

/**
 * Detect login page elements with Playwright (more accurate than HTML parsing).
 */
export async function detectLoginPage(page: Page): Promise<LoginPageInfo> {
  return await page.evaluate(() => {
    const url = window.location.href.toLowerCase();
    const urlIsLogin = /\/(login|signin|sign-in|auth|log-in|account\/login)/i.test(url);

    // Find password field
    const passwordField = document.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement | null;

    if (!passwordField && !urlIsLogin) {
      return {
        isLogin: false,
        loginUrl: null,
        formSelector: null,
        usernameSelector: null,
        passwordSelector: null,
        submitSelector: null,
        hasCaptcha: false,
        hasOAuth: false,
        hasMfa: false,
      };
    }

    // Find the form containing the password field
    const form = passwordField?.closest('form');

    // Find username/email field (input before password in the form, or any email/text input)
    let usernameField: HTMLInputElement | null = null;
    if (form) {
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="checkbox"])');
      usernameField = (inputs[0] as HTMLInputElement) || null;
    } else {
      usernameField = document.querySelector(
        'input[type="email"], input[name*="email"], input[name*="user"], input[name*="login"], input[autocomplete="username"], input[autocomplete="email"]'
      ) as HTMLInputElement | null;
    }

    // Find submit button
    let submitBtn: Element | null = null;
    if (form) {
      submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
    }
    if (!submitBtn) {
      submitBtn = document.querySelector(
        'button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Login"), button:has-text("Submit")'
      );
    }

    // Build selectors
    const buildSelector = (el: Element | null): string | null => {
      if (!el) return null;
      if (el.id) return `#${el.id}`;
      if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
      if (el.getAttribute('type') === 'password') return 'input[type="password"]';
      if (el.getAttribute('type') === 'email') return 'input[type="email"]';
      if (el.getAttribute('autocomplete')) return `[autocomplete="${el.getAttribute('autocomplete')}"]`;
      return null;
    };

    // Detect CAPTCHA
    const hasCaptcha = !!(
      document.querySelector('[class*="captcha"], [id*="captcha"], [class*="recaptcha"], [id*="recaptcha"]') ||
      document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]')
    );

    // Detect OAuth buttons
    const hasOAuth = !!(
      document.querySelector('[class*="google"], [class*="facebook"], [class*="github"], [class*="oauth"]') ||
      document.querySelector('a[href*="oauth"], a[href*="google"], a[href*="facebook"]')
    );

    // Detect MFA indicators
    const hasMfa = !!(
      document.querySelector('[class*="mfa"], [class*="two-factor"], [class*="2fa"], [name*="otp"], [name*="code"]')
    );

    return {
      isLogin: true,
      loginUrl: window.location.href,
      formSelector: form ? (form.id ? `#${form.id}` : 'form') : null,
      usernameSelector: buildSelector(usernameField),
      passwordSelector: buildSelector(passwordField),
      submitSelector: buildSelector(submitBtn),
      hasCaptcha,
      hasOAuth,
      hasMfa,
    };
  });
}

/**
 * Perform automated login on a page.
 */
export async function performLogin(
  page: Page,
  loginInfo: LoginPageInfo,
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    // Check for CAPTCHA
    if (loginInfo.hasCaptcha) {
      return { success: false, requiresCaptcha: true, error: 'CAPTCHA detected - cannot auto-login' };
    }

    const usernameSelector = loginInfo.usernameSelector || 'input[type="email"], input[name*="email"], input[name*="user"]';
    const passwordSelector = loginInfo.passwordSelector || 'input[type="password"]';
    const submitSelector = loginInfo.submitSelector || 'button[type="submit"], input[type="submit"], button:not([type])';

    // Fill username
    const usernameEl = page.locator(usernameSelector).first();
    await usernameEl.waitFor({ state: 'visible', timeout: 5000 });
    await usernameEl.fill(username);
    await page.waitForTimeout(300);

    // Fill password
    const passwordEl = page.locator(passwordSelector).first();
    await passwordEl.waitFor({ state: 'visible', timeout: 5000 });
    await passwordEl.fill(password);
    await page.waitForTimeout(300);

    // Click submit and wait for navigation
    const currentUrl = page.url();
    const submitBtn = page.locator(submitSelector).first();
    await submitBtn.click();

    // Wait for navigation or URL change
    try {
      await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 10000 });
    } catch {
      // URL might not change (SPA), check for success indicators
    }

    await page.waitForTimeout(2000);

    // Verify login succeeded
    const loginSuccess = await verifyLoginSuccess(page);

    if (loginSuccess) {
      return { success: true, redirectUrl: page.url() };
    }

    // Check if MFA is required
    const mfaInfo = await detectLoginPage(page);
    if (mfaInfo.hasMfa) {
      return { success: false, requiresMfa: true };
    }

    return { success: false, error: 'Login may have failed - could not verify success' };
  } catch (error: any) {
    return { success: false, error: `Login failed: ${error?.message}` };
  }
}

/**
 * Submit MFA code on the current page.
 */
export async function submitMfaCode(page: Page, code: string): Promise<LoginResult> {
  try {
    // Find MFA/OTP input
    const mfaInput = page.locator(
      'input[name*="otp"], input[name*="code"], input[name*="mfa"], input[name*="token"], input[type="tel"][maxlength="6"], input[autocomplete="one-time-code"]'
    ).first();

    await mfaInput.waitFor({ state: 'visible', timeout: 5000 });
    await mfaInput.fill(code);
    await page.waitForTimeout(300);

    // Find and click submit
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Verify"), button:has-text("Submit"), button:has-text("Continue")'
    ).first();
    const currentUrl = page.url();
    await submitBtn.click();

    try {
      await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 10000 });
    } catch {
      // May not navigate
    }

    await page.waitForTimeout(2000);

    const success = await verifyLoginSuccess(page);
    return { success, redirectUrl: page.url() };
  } catch (error: any) {
    return { success: false, error: `MFA submission failed: ${error?.message}` };
  }
}

/**
 * Check if login was successful by looking for common indicators.
 */
async function verifyLoginSuccess(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const url = window.location.href.toLowerCase();

    // If still on login page, likely failed
    if (/\/(login|signin|sign-in|auth)/.test(url)) {
      // Check for error messages
      const hasError = !!document.querySelector(
        '[class*="error"], [class*="alert-danger"], [class*="invalid"], [role="alert"]'
      );
      if (hasError) return false;
    }

    // Success indicators
    const hasLogout = !!(
      document.querySelector('a[href*="logout"], a[href*="signout"], button:has-text("Log out"), button:has-text("Sign out")') ||
      document.querySelector('[class*="avatar"], [class*="user-menu"], [class*="account-menu"], [class*="profile"]')
    );

    const hasDashboard = /\/(dashboard|account|profile|home|my-|member)/i.test(url);

    return hasLogout || hasDashboard;
  });
}

/**
 * Serialize browser context cookies for storage between chunks.
 */
export async function serializeCookies(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  return JSON.stringify(cookies);
}

/**
 * Restore cookies to a browser context from serialized string.
 */
export async function restoreCookies(context: BrowserContext, serialized: string): Promise<void> {
  try {
    const cookies = JSON.parse(serialized);
    if (Array.isArray(cookies) && cookies.length > 0) {
      await context.addCookies(cookies);
    }
  } catch {
    // Invalid cookie data, skip
  }
}
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/site-scanner/services/auth-handler.ts
git commit -m "feat(scanner): add auth handler for automated login and session management"
```

---

## Task 4: Interaction Simulator Service

**Files:**
- Create: `nextjs/src/lib/site-scanner/services/interaction-simulator.ts`

**Step 1: Create the interaction simulator**

This service simulates user interactions on each page to discover hidden content.

```typescript
// nextjs/src/lib/site-scanner/services/interaction-simulator.ts
import { Page } from 'playwright-core';

export interface InteractionResult {
  interactions: number;
  scrollableHeight: number;
  lazyLoadedElements: number;
  expandedSections: number;
  discoveredUrls: string[];
}

/**
 * Simulate comprehensive user interactions on a page.
 * Scrolls, expands accordions, opens tabs, clicks "load more", etc.
 */
export async function simulateInteractions(page: Page): Promise<InteractionResult> {
  const result: InteractionResult = {
    interactions: 0,
    scrollableHeight: 0,
    lazyLoadedElements: 0,
    expandedSections: 0,
    discoveredUrls: [],
  };

  // 1. Full page scroll with lazy-load detection
  await scrollFullPage(page, result);

  // 2. Expand accordions and collapsed sections
  await expandCollapsedSections(page, result);

  // 3. Click tabs to reveal content
  await clickTabs(page, result);

  // 4. Click "Load More" / "Show More" buttons
  await clickLoadMoreButtons(page, result);

  // 5. Hover navigation items for mega-menus
  await hoverNavItems(page, result);

  // 6. Collect any new URLs discovered after interactions
  await collectNewUrls(page, result);

  return result;
}

/**
 * Scroll full page height in increments, detecting lazy-loaded content.
 */
async function scrollFullPage(page: Page, result: InteractionResult): Promise<void> {
  try {
    const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // Scroll in viewport-height increments
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    let currentScroll = 0;
    let previousHeight = initialHeight;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Safety limit

    while (scrollAttempts < maxScrollAttempts) {
      currentScroll += viewportHeight * 0.8; // 80% of viewport per scroll
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), currentScroll);
      await page.waitForTimeout(800); // Wait for lazy content
      result.interactions++;

      const newHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      if (newHeight > previousHeight) {
        result.lazyLoadedElements++;
        previousHeight = newHeight;
      }

      // If we've scrolled past the document height and no new content loaded, stop
      if (currentScroll >= newHeight) {
        break;
      }

      scrollAttempts++;
    }

    result.scrollableHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // Scroll back to top
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
  } catch {
    // Scroll failed, continue
  }
}

/**
 * Expand accordions and collapsed sections.
 */
async function expandCollapsedSections(page: Page, result: InteractionResult): Promise<void> {
  try {
    // Find collapsed elements
    const collapsedSelectors = [
      '[aria-expanded="false"]',
      '[data-toggle="collapse"]:not(.show)',
      '.accordion-button.collapsed',
      'details:not([open])',
      '[class*="collapsed"]',
      '[class*="expandable"]:not([class*="expanded"])',
    ];

    for (const selector of collapsedSelectors) {
      try {
        const elements = page.locator(selector);
        const count = await elements.count();
        const maxExpand = Math.min(count, 10); // Limit to 10 per type

        for (let i = 0; i < maxExpand; i++) {
          try {
            const el = elements.nth(i);
            if (await el.isVisible({ timeout: 300 })) {
              await el.click({ timeout: 2000 });
              result.interactions++;
              result.expandedSections++;
              await page.waitForTimeout(500);
            }
          } catch {
            // Element not clickable, continue
          }
        }
      } catch {
        // Selector failed, continue
      }
    }
  } catch {
    // Expansion failed, continue
  }
}

/**
 * Click tab elements to reveal tabbed content.
 */
async function clickTabs(page: Page, result: InteractionResult): Promise<void> {
  try {
    const tabSelectors = [
      '[role="tab"]:not([aria-selected="true"])',
      '.nav-tabs .nav-link:not(.active)',
      '.tab-button:not(.active)',
      '[class*="tab"]:not([class*="active"]):not([class*="selected"])',
    ];

    for (const selector of tabSelectors) {
      try {
        const tabs = page.locator(selector);
        const count = await tabs.count();
        const maxTabs = Math.min(count, 8);

        for (let i = 0; i < maxTabs; i++) {
          try {
            const tab = tabs.nth(i);
            if (await tab.isVisible({ timeout: 300 })) {
              await tab.click({ timeout: 2000 });
              result.interactions++;
              await page.waitForTimeout(500);
            }
          } catch {
            // Tab not clickable, continue
          }
        }
      } catch {
        // Selector failed
      }
    }
  } catch {
    // Tab clicking failed
  }
}

/**
 * Click "Load More", "Show More", and pagination buttons.
 */
async function clickLoadMoreButtons(page: Page, result: InteractionResult): Promise<void> {
  try {
    const loadMoreSelectors = [
      'button:has-text("Load More")',
      'button:has-text("Load more")',
      'button:has-text("Show More")',
      'button:has-text("Show more")',
      'button:has-text("View More")',
      'button:has-text("View more")',
      'button:has-text("See More")',
      'button:has-text("See more")',
      'a:has-text("Load More")',
      'a:has-text("Show More")',
      '[class*="load-more"]',
      '[class*="show-more"]',
      '[data-action="load-more"]',
    ];

    let clickCount = 0;
    const maxClicks = 5; // Don't click load more infinitely

    for (const selector of loadMoreSelectors) {
      while (clickCount < maxClicks) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 500 })) {
            await btn.click({ timeout: 2000 });
            result.interactions++;
            clickCount++;
            await page.waitForTimeout(1500); // Wait for content to load
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }
  } catch {
    // Load more failed
  }
}

/**
 * Hover over navigation items to reveal dropdowns/mega-menus.
 */
async function hoverNavItems(page: Page, result: InteractionResult): Promise<void> {
  try {
    const navSelectors = [
      'nav a',
      'nav button',
      '[role="navigation"] a',
      '[role="navigation"] button',
      '.navbar a',
      '.nav-menu a',
      'header nav a',
      'header a[class*="nav"]',
    ];

    for (const selector of navSelectors) {
      try {
        const items = page.locator(selector);
        const count = await items.count();
        const maxHover = Math.min(count, 15);

        for (let i = 0; i < maxHover; i++) {
          try {
            const item = items.nth(i);
            if (await item.isVisible({ timeout: 300 })) {
              await item.hover({ timeout: 1000 });
              result.interactions++;
              await page.waitForTimeout(400); // Wait for dropdown
            }
          } catch {
            // Hover failed
          }
        }

        if (count > 0) break; // Found nav items, stop trying other selectors
      } catch {
        // Selector failed
      }
    }
  } catch {
    // Navigation hover failed
  }
}

/**
 * Collect any new URLs discovered after interactions.
 */
async function collectNewUrls(page: Page, result: InteractionResult): Promise<void> {
  try {
    const urls = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => {
          try {
            return new URL(a.getAttribute('href') || '', window.location.href).href;
          } catch {
            return null;
          }
        })
        .filter((href): href is string => href !== null && href.startsWith('http'));
    });
    result.discoveredUrls = [...new Set(urls)];
  } catch {
    // URL collection failed
  }
}
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/site-scanner/services/interaction-simulator.ts
git commit -m "feat(scanner): add interaction simulator for tabs, accordions, scroll, load-more"
```

---

## Task 5: Behavioral Tracking Definitions

**Files:**
- Create: `nextjs/src/lib/site-scanner/constants/behavioral-tracking.ts`

**Step 1: Create behavioral tracking definitions**

```typescript
// nextjs/src/lib/site-scanner/constants/behavioral-tracking.ts
import { TrackingType, RecommendationSeverity } from '@prisma/client';
import { TrackingOpportunity } from '../interfaces';

export interface BehavioralTrackingDef {
  name: string;
  description: string;
  trackingType: TrackingType;
  severity: RecommendationSeverity;
  severityReason: string;
  ga4EventName: string;
  funnelStage: 'top' | 'middle' | 'bottom';
  suggestedConfig: Record<string, any>;
  businessValue: string;
  implementationNotes: string;
}

/**
 * Universal behavioral trackings applied to every site.
 */
export const UNIVERSAL_BEHAVIORAL_TRACKINGS: BehavioralTrackingDef[] = [
  {
    name: 'Scroll Depth Milestones',
    description: 'Track when users scroll to 25%, 50%, 75%, and 100% of page height. Reveals content engagement and drop-off points.',
    trackingType: 'SCROLL_DEPTH',
    severity: 'RECOMMENDED',
    severityReason: 'Scroll depth reveals content engagement patterns across all pages',
    ga4EventName: 'scroll_depth',
    funnelStage: 'top',
    suggestedConfig: { thresholds: [25, 50, 75, 100], triggerType: 'scroll_percentage' },
    businessValue: 'Identify which sections of your pages users actually see. Optimize above-the-fold content and find where users lose interest.',
    implementationNotes: 'GTM built-in scroll depth trigger with custom percentage thresholds.',
  },
  {
    name: 'Time on Page Milestones',
    description: 'Track when users spend 15s, 30s, 60s, 2min, and 5min on a page. Distinguishes engaged visitors from bouncers.',
    trackingType: 'TIME_ON_PAGE',
    severity: 'RECOMMENDED',
    severityReason: 'Time on page is a core engagement metric for any website',
    ga4EventName: 'time_on_page',
    funnelStage: 'top',
    suggestedConfig: { thresholds: [15, 30, 60, 120, 300], triggerType: 'timer' },
    businessValue: 'Understand how long users actually engage with your content. Identify pages that capture attention vs. those that fail to engage.',
    implementationNotes: 'GTM timer trigger firing at each threshold. Pair with scroll depth for true engagement picture.',
  },
  {
    name: 'Page Engagement Score',
    description: 'Composite engagement metric combining scroll depth, time on page, and click count into a single 0-100 score.',
    trackingType: 'PAGE_ENGAGEMENT',
    severity: 'RECOMMENDED',
    severityReason: 'Single engagement metric simplifies analysis across pages',
    ga4EventName: 'page_engagement',
    funnelStage: 'top',
    suggestedConfig: { scoreWeights: { scroll: 0.4, time: 0.3, clicks: 0.3 } },
    businessValue: 'One number that tells you how engaged users are on each page. Compare pages and optimize the lowest-scoring ones.',
    implementationNotes: 'Custom GTM tag with JavaScript variable calculating composite score from scroll, timer, and click count.',
  },
  {
    name: 'Rage Click Detection',
    description: 'Detect rapid repeated clicks (3+ clicks within 500ms) on the same element, indicating user frustration.',
    trackingType: 'RAGE_CLICK',
    severity: 'IMPORTANT',
    severityReason: 'Rage clicks directly indicate UX problems causing user frustration',
    ga4EventName: 'rage_click',
    funnelStage: 'top',
    suggestedConfig: { clickThreshold: 3, timeWindowMs: 500 },
    businessValue: 'Find broken buttons, unresponsive UI elements, and frustrating interactions before they cost you conversions.',
    implementationNotes: 'Custom JavaScript tag tracking click timestamps per element. Fire event when threshold exceeded.',
  },
  {
    name: 'Dead Click Detection',
    description: 'Detect clicks on non-interactive elements (text, images, divs) that users expect to be clickable.',
    trackingType: 'DEAD_CLICK',
    severity: 'RECOMMENDED',
    severityReason: 'Dead clicks reveal confusing UI elements that look clickable but aren\'t',
    ga4EventName: 'dead_click',
    funnelStage: 'top',
    suggestedConfig: { excludeTags: ['a', 'button', 'input', 'select', 'textarea'] },
    businessValue: 'Discover elements users try to click but can\'t. These are missed interaction opportunities or confusing design patterns.',
    implementationNotes: 'Custom JS listener on document.body filtering clicks on non-interactive elements. Include clicked element info in event.',
  },
  {
    name: 'Tab Focus/Blur',
    description: 'Track when users switch away from the tab and when they return. Measures active attention.',
    trackingType: 'TAB_VISIBILITY',
    severity: 'OPTIONAL',
    severityReason: 'Tab visibility provides context on user attention patterns',
    ga4EventName: 'tab_visibility',
    funnelStage: 'top',
    suggestedConfig: { trackHiddenDuration: true },
    businessValue: 'Understand how often users multitask while on your site. Pages with high tab-switch rates may need more engaging content.',
    implementationNotes: 'Document visibilitychange event listener. Track hidden duration and fire on return.',
  },
  {
    name: 'Session Duration',
    description: 'Track total active time across all pages in a session, with heartbeat pings every 30s.',
    trackingType: 'SESSION_DURATION',
    severity: 'RECOMMENDED',
    severityReason: 'Session duration is a key engagement KPI for understanding user behavior',
    ga4EventName: 'session_duration',
    funnelStage: 'top',
    suggestedConfig: { heartbeatInterval: 30, milestones: [60, 180, 300, 600] },
    businessValue: 'Know exactly how long users spend on your site per visit. Correlate session duration with conversion rates.',
    implementationNotes: 'Custom JS using sessionStorage timer with periodic heartbeat events. Final event on page unload.',
  },
  {
    name: 'Exit Intent Detection',
    description: 'Detect when the user\'s mouse moves toward the browser close/back button area, signaling intent to leave.',
    trackingType: 'EXIT_INTENT',
    severity: 'RECOMMENDED',
    severityReason: 'Exit intent is a key trigger for retention strategies',
    ga4EventName: 'exit_intent',
    funnelStage: 'middle',
    suggestedConfig: { triggerOnce: true, sensitivity: 20 },
    businessValue: 'Know when users are about to leave. Use this data to trigger retention popups, offers, or chat at the right moment.',
    implementationNotes: 'Mouseleave event on document element, triggered when mouse exits toward top of viewport. Desktop only.',
  },
  {
    name: 'Text Copy Events',
    description: 'Track when users copy text from the page (pricing, phone numbers, addresses, product details).',
    trackingType: 'TEXT_COPY',
    severity: 'OPTIONAL',
    severityReason: 'Text copy indicates high interest in specific content',
    ga4EventName: 'text_copy',
    funnelStage: 'middle',
    suggestedConfig: { maxCopiedLength: 500, includePageUrl: true },
    businessValue: 'Learn what information users save for later - prices, contact details, product specs. This reveals what matters most.',
    implementationNotes: 'Document copy event listener. Capture copied text (truncated) and page URL.',
  },
  {
    name: 'Page Print Events',
    description: 'Track when users attempt to print a page, indicating high-value content or decision-making stage.',
    trackingType: 'PAGE_PRINT',
    severity: 'OPTIONAL',
    severityReason: 'Print events indicate high-intent users in decision stage',
    ga4EventName: 'page_print',
    funnelStage: 'bottom',
    suggestedConfig: {},
    businessValue: 'Users who print pages are in a serious decision-making phase. Track which pages get printed to understand your most valuable content.',
    implementationNotes: 'Window beforeprint event listener.',
  },
  {
    name: 'Form Field Interaction',
    description: 'Track which form fields users interact with, time spent per field, and where they abandon forms.',
    trackingType: 'FORM_FIELD_INTERACTION',
    severity: 'IMPORTANT',
    severityReason: 'Form field analytics reveal friction points in conversion forms',
    ga4EventName: 'form_field_focus',
    funnelStage: 'middle',
    suggestedConfig: { trackBlur: true, trackTimePerField: true },
    businessValue: 'Find which form fields cause users to abandon. Optimize forms by removing or simplifying problematic fields.',
    implementationNotes: 'Focus/blur event listeners on all form inputs. Track time per field and field completion rate.',
  },
  {
    name: 'Error Page Views',
    description: 'Track when users land on 404 or other error pages, indicating broken links or navigation issues.',
    trackingType: 'ERROR_PAGE_VIEW',
    severity: 'IMPORTANT',
    severityReason: 'Error pages directly impact user experience and indicate site issues',
    ga4EventName: 'error_page',
    funnelStage: 'top',
    suggestedConfig: { includeReferrer: true, includeStatusCode: true },
    businessValue: 'Find broken links and missing pages that frustrate users. Fix the most-visited error pages first.',
    implementationNotes: 'GTM trigger based on page title or URL pattern matching common 404/error pages.',
  },
  {
    name: 'Return Visitor Detection',
    description: 'Detect whether the user has visited before and track visit frequency.',
    trackingType: 'RETURN_VISITOR',
    severity: 'RECOMMENDED',
    severityReason: 'Return visitor rates directly correlate with brand engagement and conversion likelihood',
    ga4EventName: 'return_visitor',
    funnelStage: 'top',
    suggestedConfig: { storageMethod: 'localStorage', trackVisitCount: true },
    businessValue: 'Know what percentage of your traffic is returning. Return visitors convert at 2-3x the rate of new visitors.',
    implementationNotes: 'Custom tag checking/setting localStorage flag with visit count and first-visit date.',
  },
  {
    name: 'Outbound Link Clicks',
    description: 'Track clicks on links that lead to external domains (partner sites, social media, resources).',
    trackingType: 'OUTBOUND_CLICK',
    severity: 'RECOMMENDED',
    severityReason: 'Outbound clicks show where users go after your site, affecting retention',
    ga4EventName: 'outbound_click',
    funnelStage: 'top',
    suggestedConfig: { excludeDomains: [], includeDestination: true },
    businessValue: 'Understand where users go when they leave your site. Identify which external links draw users away from converting.',
    implementationNotes: 'Click listener on all anchor tags, filtering for different hostname. Capture destination URL.',
  },
];

/**
 * Niche-specific behavioral trackings.
 */
export const NICHE_BEHAVIORAL_TRACKINGS: Record<string, BehavioralTrackingDef[]> = {
  ecommerce: [
    {
      name: 'Product Image Interaction',
      description: 'Track when users zoom, swipe, or interact with product image galleries.',
      trackingType: 'PRODUCT_IMAGE_INTERACTION',
      severity: 'RECOMMENDED',
      severityReason: 'Product image engagement correlates with purchase intent',
      ga4EventName: 'product_image_interaction',
      funnelStage: 'middle',
      suggestedConfig: { trackZoom: true, trackSwipe: true, trackGalleryNav: true },
      businessValue: 'Users who interact with product images are 2x more likely to buy. Track image engagement to measure product interest.',
      implementationNotes: 'Click/touch listeners on product image containers. Detect zoom, gallery navigation, and swipe gestures.',
    },
    {
      name: 'Cart Abandonment',
      description: 'Detect when users add items to cart but leave without completing checkout.',
      trackingType: 'CART_ABANDONMENT',
      severity: 'CRITICAL',
      severityReason: 'Cart abandonment is the #1 revenue leak in e-commerce',
      ga4EventName: 'cart_abandonment',
      funnelStage: 'bottom',
      suggestedConfig: { trackCartValue: true, trackTimeInCart: true },
      businessValue: 'Average cart abandonment rate is 70%. Every 1% reduction directly increases revenue.',
      implementationNotes: 'Track add_to_cart events paired with session/page unload without purchase. Requires cart state tracking.',
    },
    {
      name: 'Price Comparison Behavior',
      description: 'Track when users interact with pricing comparisons, filter by price, or toggle price views.',
      trackingType: 'PRICE_COMPARISON',
      severity: 'RECOMMENDED',
      severityReason: 'Price sensitivity signals help optimize pricing strategy',
      ga4EventName: 'price_comparison',
      funnelStage: 'middle',
      suggestedConfig: { trackSortByPrice: true, trackPriceFilter: true },
      businessValue: 'Understand how price-sensitive your audience is. Users who sort/filter by price need different messaging than feature-driven buyers.',
      implementationNotes: 'Click listeners on price sort/filter controls. Track which price ranges are most selected.',
    },
    {
      name: 'Review Interaction',
      description: 'Track when users read, expand, filter, or interact with product reviews.',
      trackingType: 'REVIEW_INTERACTION',
      severity: 'RECOMMENDED',
      severityReason: 'Review readers convert at higher rates - tracking this identifies high-intent users',
      ga4EventName: 'review_interaction',
      funnelStage: 'middle',
      suggestedConfig: { trackScroll: true, trackFilter: true, trackExpand: true },
      businessValue: '93% of consumers say reviews influence their purchase. Track review engagement to identify your most persuasive social proof.',
      implementationNotes: 'Scroll/click listeners on review sections. Track scroll depth within reviews, star filter clicks, "read more" expansions.',
    },
  ],
  saas: [
    {
      name: 'Pricing Toggle Interaction',
      description: 'Track when users toggle between monthly/annual pricing or compare plan tiers.',
      trackingType: 'PRICE_COMPARISON',
      severity: 'IMPORTANT',
      severityReason: 'Pricing page interactions directly predict conversion intent',
      ga4EventName: 'pricing_toggle',
      funnelStage: 'bottom',
      suggestedConfig: { trackToggle: true, trackPlanComparison: true },
      businessValue: 'Users who toggle pricing are actively evaluating. Track which plan they view last before converting or leaving.',
      implementationNotes: 'Click listeners on pricing toggle and plan comparison elements.',
    },
  ],
  blog: [
    {
      name: 'Content Read-Through Rate',
      description: 'Combine scroll depth + time to calculate what percentage of an article was actually read.',
      trackingType: 'CONTENT_READ_THROUGH',
      severity: 'IMPORTANT',
      severityReason: 'Read-through rate is the true measure of content quality',
      ga4EventName: 'content_read_through',
      funnelStage: 'top',
      suggestedConfig: { calculateRate: true, minTimePerSection: 5 },
      businessValue: 'Page views don\'t tell you if content was read. Read-through rate shows which articles truly engage your audience.',
      implementationNotes: 'Combine scroll depth milestones with time-per-section calculations. Fire at 25%, 50%, 75%, 100% read.',
    },
  ],
  content: [
    {
      name: 'Content Read-Through Rate',
      description: 'Combine scroll depth + time to calculate what percentage of content was actually consumed.',
      trackingType: 'CONTENT_READ_THROUGH',
      severity: 'IMPORTANT',
      severityReason: 'Read-through rate measures true content engagement beyond page views',
      ga4EventName: 'content_read_through',
      funnelStage: 'top',
      suggestedConfig: { calculateRate: true, minTimePerSection: 5 },
      businessValue: 'Understand which content your audience actually reads vs. bounces from. Optimize content strategy with real engagement data.',
      implementationNotes: 'Combine scroll depth milestones with time-per-section calculations.',
    },
  ],
  healthcare: [
    {
      name: 'Form Field Interaction (Healthcare)',
      description: 'Track patient form completion rates and field-level abandonment in appointment/insurance forms.',
      trackingType: 'FORM_FIELD_INTERACTION',
      severity: 'CRITICAL',
      severityReason: 'Healthcare form abandonment directly impacts patient acquisition',
      ga4EventName: 'healthcare_form_interaction',
      funnelStage: 'bottom',
      suggestedConfig: { trackFieldTime: true, trackAbandonment: true, sensitiveFields: false },
      businessValue: 'Long healthcare forms have high abandonment. Find exactly which fields cause patients to give up.',
      implementationNotes: 'Focus/blur listeners on form fields. Do NOT track field values for HIPAA compliance - only field names and timing.',
    },
  ],
  lead_generation: [
    {
      name: 'CTA Hover Hesitation',
      description: 'Track when users hover over CTA buttons for >2 seconds without clicking, indicating hesitation.',
      trackingType: 'EXIT_INTENT',
      severity: 'RECOMMENDED',
      severityReason: 'CTA hesitation reveals messaging or trust issues',
      ga4EventName: 'cta_hesitation',
      funnelStage: 'bottom',
      suggestedConfig: { hoverThresholdMs: 2000, trackElement: true },
      businessValue: 'Users who hover but don\'t click are almost convinced. Identify which CTAs need better copy, trust signals, or urgency.',
      implementationNotes: 'Mouseenter/mouseleave listeners on CTA elements. Fire event if hover duration exceeds threshold without click.',
    },
  ],
};

/**
 * Get all behavioral trackings for a given niche.
 * Returns universal trackings + niche-specific ones.
 */
export function getBehavioralTrackings(niche: string): BehavioralTrackingDef[] {
  const universal = [...UNIVERSAL_BEHAVIORAL_TRACKINGS];
  const nicheSpecific = NICHE_BEHAVIORAL_TRACKINGS[niche] || [];

  // Also check related niches
  const nicheAliases: Record<string, string[]> = {
    ecommerce: ['ecommerce'],
    'e-commerce': ['ecommerce'],
    online_store: ['ecommerce'],
    retail: ['ecommerce'],
    saas: ['saas', 'lead_generation'],
    software: ['saas'],
    technology: ['saas'],
    blog: ['blog', 'content'],
    media: ['content', 'blog'],
    news: ['content', 'blog'],
    healthcare: ['healthcare', 'lead_generation'],
    medical: ['healthcare'],
    lead_generation: ['lead_generation'],
    professional_services: ['lead_generation'],
    agency: ['lead_generation'],
    education: ['content'],
    real_estate: ['lead_generation'],
    finance: ['lead_generation'],
    restaurant: ['lead_generation'],
    nonprofit: ['lead_generation'],
  };

  const aliases = nicheAliases[niche] || [];
  const additionalTrackings: BehavioralTrackingDef[] = [];
  const seenTypes = new Set(nicheSpecific.map(t => t.trackingType));

  for (const alias of aliases) {
    const aliasTrackings = NICHE_BEHAVIORAL_TRACKINGS[alias] || [];
    for (const t of aliasTrackings) {
      if (!seenTypes.has(t.trackingType)) {
        additionalTrackings.push(t);
        seenTypes.add(t.trackingType);
      }
    }
  }

  return [...universal, ...nicheSpecific, ...additionalTrackings];
}

/**
 * Convert behavioral tracking definitions to TrackingOpportunity objects.
 */
export function createBehavioralOpportunities(
  niche: string,
  homePageUrl: string,
): TrackingOpportunity[] {
  const trackings = getBehavioralTrackings(niche);

  return trackings.map(t => ({
    name: t.name,
    description: t.description,
    trackingType: t.trackingType,
    severity: t.severity,
    severityReason: t.severityReason,
    selector: null,
    selectorConfig: null,
    selectorConfidence: null,
    urlPattern: '.*', // Apply to all pages
    pageUrl: homePageUrl,
    funnelStage: t.funnelStage,
    elementContext: null,
    suggestedGA4EventName: t.ga4EventName,
    suggestedDestinations: ['GA4'],
    suggestedConfig: t.suggestedConfig,
    aiGenerated: false,
    // V2 additions (will be stored via new schema fields)
    _businessValue: t.businessValue,
    _implementationNotes: t.implementationNotes,
  }));
}
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/site-scanner/constants/behavioral-tracking.ts
git commit -m "feat(scanner): add comprehensive behavioral tracking definitions (universal + niche-specific)"
```

---

## Task 6: Upgrade Chunk Processor to Playwright-First

**Files:**
- Modify: `nextjs/src/lib/site-scanner/services/chunk-processor.ts`

This is the core change. Phase 1 switches from HTML fetch to Playwright with obstacle handling, interaction simulation, and session persistence.

**Step 1: Replace Phase 1 chunk processing**

Replace the `processPhase1Chunk` function. The new version:
- Uses Playwright instead of `fetchPage()` + `parsePage()`
- Calls `dismissObstacles()` on each page
- Calls `simulateInteractions()` on each page
- Detects login pages with Playwright (more accurate)
- Serializes cookies to DB for session persistence
- Collects dynamically discovered URLs from interactions
- Tracks obstacles dismissed and interactions performed

Key changes to the function:
1. At the start: create Playwright browser + context, restore cookies from `scan.sessionCookies` if they exist
2. For each URL: `page.goto()` -> `dismissObstacles()` -> `simulateInteractions()` -> extract page data via `page.evaluate()` -> detect login -> discover links
3. At the end: serialize cookies back to DB, close browser
4. Return enhanced `ChunkResult` with obstacle and interaction counts

**Step 2: Replace Phase 2 chunk processing**

Phase 2 now also restores the authenticated session (cookies) and uses the interaction simulator to extract deeper element data. It also generates behavioral tracking opportunities by importing `createBehavioralOpportunities()`.

**Step 3: Update imports and types**

Add imports for new services:
```typescript
import { dismissObstacles } from './obstacle-handler';
import { simulateInteractions } from './interaction-simulator';
import { detectLoginPage as detectLoginPagePlaywright, serializeCookies, restoreCookies } from './auth-handler';
import { createBehavioralOpportunities } from '../constants/behavioral-tracking';
```

Update `ChunkResult` interface to include:
```typescript
  obstaclesDismissed?: number;
  interactionsPerformed?: number;
  authenticatedPages?: number;
```

Update `LiveDiscovery` interface to include:
```typescript
  obstaclesDismissed: number;
  totalInteractions: number;
  authenticatedPagesCount: number;
```

**Step 4: Update `createEmptyDiscovery()`**

Add new fields:
```typescript
  obstaclesDismissed: 0,
  totalInteractions: 0,
  authenticatedPagesCount: 0,
```

**Step 5: Commit**

```bash
git add nextjs/src/lib/site-scanner/services/chunk-processor.ts
git commit -m "feat(scanner): replace Phase 1 with Playwright-first crawler with obstacles and interactions"
```

---

## Task 7: Update Tracking Detector for Behavioral Trackings

**Files:**
- Modify: `nextjs/src/lib/site-scanner/services/tracking-detector.ts`

**Step 1: Add behavioral tracking generation**

In the `detectOpportunities` function, replace the single `createScrollDepthTracking` call with the comprehensive behavioral tracking system:

```typescript
import { createBehavioralOpportunities } from '../constants/behavioral-tracking';

// At the end of detectOpportunities, replace:
// allOpportunities.push(createScrollDepthTracking(pages[0].url));
// with:
const behavioralOpps = createBehavioralOpportunities(niche, pages[0].url);
allOpportunities.push(...behavioralOpps);
```

**Step 2: Remove the old `createScrollDepthTracking` function**

Delete the function (lines 242-261) since it's replaced by the behavioral tracking definitions.

**Step 3: Commit**

```bash
git add nextjs/src/lib/site-scanner/services/tracking-detector.ts
git commit -m "feat(scanner): replace basic scroll tracking with comprehensive behavioral tracking system"
```

---

## Task 8: Update Recommendation Engine for Business Value

**Files:**
- Modify: `nextjs/src/lib/site-scanner/services/recommendation-engine.ts`

**Step 1: Propagate business value and implementation notes**

When creating recommendation records from opportunities, pass through the `_businessValue` and `_implementationNotes` fields:

In the `processRecommendations` function, update the recommendation mapping to include:
```typescript
businessValue: (opp as any)._businessValue || null,
implementationNotes: (opp as any)._implementationNotes || null,
```

**Step 2: Update `buildSuggestedConfig` for new tracking types**

Add config entries for new behavioral tracking types:
```typescript
case 'RAGE_CLICK':
  config.clickThreshold = 3;
  config.timeWindowMs = 500;
  break;
case 'DEAD_CLICK':
  config.excludeTags = ['a', 'button', 'input', 'select', 'textarea'];
  break;
case 'TAB_VISIBILITY':
  config.trackHiddenDuration = true;
  break;
case 'SESSION_DURATION':
  config.heartbeatInterval = 30;
  break;
case 'EXIT_INTENT':
  config.triggerOnce = true;
  config.sensitivity = 20;
  break;
case 'PAGE_ENGAGEMENT':
  config.scoreWeights = { scroll: 0.4, time: 0.3, clicks: 0.3 };
  break;
// ... etc
```

**Step 3: Commit**

```bash
git add nextjs/src/lib/site-scanner/services/recommendation-engine.ts
git commit -m "feat(scanner): add business value propagation and new behavioral tracking configs"
```

---

## Task 9: API Route - Provide Credentials Mid-Scan

**Files:**
- Create: `nextjs/src/app/api/customers/[id]/scans/[scanId]/provide-credentials/route.ts`

**Step 1: Create the credential submission API route**

```typescript
// nextjs/src/app/api/customers/[id]/scans/[scanId]/provide-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

interface RouteParams {
  params: Promise<{ id: string; scanId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: customerId, scanId } = await params;
    const body = await request.json();
    const { username, password, saveForFuture } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Verify scan exists and belongs to customer
    const scan = await prisma.siteScan.findFirst({
      where: { id: scanId, customerId },
      select: { id: true, status: true, websiteUrl: true, tenantId: true },
    });

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Update scan status to resume crawling
    await prisma.siteScan.update({
      where: { id: scanId },
      data: { status: 'CRAWLING' },
    });

    // Save credentials if requested
    if (saveForFuture) {
      const domain = new URL(scan.websiteUrl).hostname;
      await prisma.siteCredential.upsert({
        where: {
          customerId_domain_tenantId: {
            customerId,
            domain,
            tenantId: scan.tenantId,
          },
        },
        update: {
          username: encrypt(username),
          password: encrypt(password),
          loginUrl: scan.websiteUrl,
        },
        create: {
          customerId,
          tenantId: scan.tenantId,
          domain,
          username: encrypt(username),
          password: encrypt(password),
          loginUrl: scan.websiteUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      // Return credentials back so the client can pass them to process-chunk
      credentials: { username, password },
    });
  } catch (error: any) {
    console.error('Provide credentials error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save credentials' },
      { status: 500 }
    );
  }
}
```

**Step 2: Check if encryption utility exists, create if needed**

Check for `nextjs/src/lib/encryption.ts`. If it doesn't exist, create a simple AES encryption wrapper using Node.js crypto.

**Step 3: Update process-chunk route to accept credentials**

In `nextjs/src/app/api/customers/[id]/scans/[scanId]/process-chunk/route.ts`, update the POST handler to accept optional `credentials` in the request body and pass them to the chunk processor.

**Step 4: Commit**

```bash
git add nextjs/src/app/api/customers/[id]/scans/[scanId]/provide-credentials/
git add nextjs/src/app/api/customers/[id]/scans/[scanId]/process-chunk/route.ts
git commit -m "feat(api): add credential submission route and pass credentials to chunk processor"
```

---

## Task 10: Update Scan Start Route for V2 Defaults

**Files:**
- Modify: `nextjs/src/app/api/customers/[id]/scans/route.ts`

**Step 1: Update default values**

Change the scan creation to use V2 defaults:
- `maxPages: 200` (was 50)
- `maxDepth: 8` (was 3)

**Step 2: Initialize new discovery fields**

In the `createEmptyDiscovery()` call or inline initialization, include:
- `obstaclesDismissed: 0`
- `totalInteractions: 0`
- `authenticatedPagesCount: 0`

**Step 3: Commit**

```bash
git add nextjs/src/app/api/customers/[id]/scans/route.ts
git commit -m "feat(api): update scan defaults to V2 (200 pages, depth 8)"
```

---

## Task 11: Update Finalize Route for New Fields

**Files:**
- Modify: `nextjs/src/app/api/customers/[id]/scans/[scanId]/finalize/route.ts`

**Step 1: Include new recommendation fields in finalization**

When saving final recommendations, include `businessValue`, `implementationNotes`, and `affectedRoutes` fields.

**Step 2: Include authenticated page count in summary**

Add `authenticatedPagesCount` to the final scan update.

**Step 3: Commit**

```bash
git add nextjs/src/app/api/customers/[id]/scans/[scanId]/finalize/route.ts
git commit -m "feat(api): update finalize route for V2 fields (business value, auth pages)"
```

---

## Task 12: Frontend - Enhanced Credential Prompt Modal

**Files:**
- Modify: `nextjs/src/components/autotrack/CredentialPrompt.tsx`

**Step 1: Add "Save for future scans" checkbox**

Add a checkbox to the existing credential form that lets users opt-in to saving credentials.

**Step 2: Add login status feedback**

Add states for: submitting, login success, login failed (with retry), MFA required.

**Step 3: Add MFA code input**

When MFA is required, show a code input field below the credential form.

**Step 4: Commit**

```bash
git add nextjs/src/components/autotrack/CredentialPrompt.tsx
git commit -m "feat(ui): enhance credential prompt with save option, MFA, and status feedback"
```

---

## Task 13: Frontend - Update Scan Discovery Dashboard

**Files:**
- Modify: `nextjs/src/components/autotrack/ScanDiscoveryDashboard.tsx`

**Step 1: Add obstacle counter**

Show a counter like "Auto-dismissed: 3 cookie banners, 2 popups" in the live discovery dashboard header area.

**Step 2: Add interaction counter**

Show "47 interactions performed across 12 pages" counter.

**Step 3: Add authenticated badge**

In the URL discovery feed, show a lock icon badge next to URLs that were accessed via authenticated session.

**Step 4: Update props interface**

Add to `ScanDiscoveryDashboardProps`:
```typescript
obstaclesDismissed?: number;
totalInteractions?: number;
authenticatedPagesCount?: number;
```

**Step 5: Commit**

```bash
git add nextjs/src/components/autotrack/ScanDiscoveryDashboard.tsx
git commit -m "feat(ui): add obstacle counter, interaction counter, and auth badges to discovery dashboard"
```

---

## Task 14: Frontend - Update AutoTrack Main Component

**Files:**
- Modify: `nextjs/src/components/autotrack/AutoTrack.tsx`

**Step 1: Add AWAITING_AUTH state handling**

When the scan status is `AWAITING_AUTH` (or when `loginDetected` comes back in a chunk result), show the credential prompt modal and pause chunk processing.

**Step 2: Add credential submission logic**

When user provides credentials via the modal:
1. Call the `provide-credentials` API route
2. Store credentials in component state
3. Resume chunk processing, passing credentials to `process-chunk` calls

**Step 3: Pass new props to ScanDiscoveryDashboard**

Forward `obstaclesDismissed`, `totalInteractions`, `authenticatedPagesCount` from the chunk results to the dashboard.

**Step 4: Commit**

```bash
git add nextjs/src/components/autotrack/AutoTrack.tsx
git commit -m "feat(ui): add auth pause/resume flow and forward V2 stats to dashboard"
```

---

## Task 15: Frontend - Update Hook for Credentials and V2

**Files:**
- Modify: `nextjs/src/hooks/use-site-scanner.ts`

**Step 1: Add `useProvideCredentials` mutation**

```typescript
export function useProvideCredentials() {
  return useMutation({
    mutationFn: async ({ customerId, scanId, username, password, saveForFuture }: {
      customerId: string;
      scanId: string;
      username: string;
      password: string;
      saveForFuture: boolean;
    }) => {
      const res = await apiClient(`/api/customers/${customerId}/scans/${scanId}/provide-credentials`, {
        method: 'POST',
        body: JSON.stringify({ username, password, saveForFuture }),
      });
      return res.json();
    },
  });
}
```

**Step 2: Update `useChunkedScan` state for V2**

Add to `ChunkedScanState`:
```typescript
obstaclesDismissed: number;
totalInteractions: number;
authenticatedPagesCount: number;
credentials: { username: string; password: string } | null;
```

Update `startPhase1` to pass credentials to chunk API if available.

**Step 3: Commit**

```bash
git add nextjs/src/hooks/use-site-scanner.ts
git commit -m "feat(hooks): add credential submission hook and V2 chunked scan state"
```

---

## Task 16: Frontend - Visual Sitemap Component (ExploredRoutes)

**Files:**
- Create: `nextjs/src/components/autotrack/ExploredRoutes.tsx`

**Step 1: Create the ExploredRoutes component**

Build a tree view component that shows all discovered routes:

- Takes `scanPages: ScanPage[]` and `recommendations: TrackingRecommendation[]` as props
- Groups pages into a tree structure by URL path segments
- Color-codes nodes: green (scanned), gold (authenticated), blue (login page), orange (error)
- Shows tracking recommendation count per route
- Groups template pages (5+ pages with same `templateGroup`) into collapsible nodes
- Shows summary stats at top: total routes, scanned, authenticated, recommendations, coverage %

Use Shadcn UI `Collapsible` and tree-like indentation with Tailwind.

**Step 2: Create the RouteNode sub-component**

Each node shows:
- Indentation based on depth
- Color-coded icon/dot
- Route path (e.g., `/checkout/shipping/`)
- Page type badge
- Tracking count badge
- Auth indicator (lock icon)
- Expand/collapse for children

**Step 3: Commit**

```bash
git add nextjs/src/components/autotrack/ExploredRoutes.tsx
git commit -m "feat(ui): add ExploredRoutes visual sitemap component"
```

---

## Task 17: Frontend - Update Scan Results with Routes Tab

**Files:**
- Modify: `nextjs/src/components/autotrack/ScanResults.tsx`

**Step 1: Add "Explored Routes" tab**

Add a new tab to the results view alongside the existing tabs. Import and render `ExploredRoutes` component.

**Step 2: Enhance recommendation cards with business value**

In the recommendation display, add the `businessValue` field as a secondary description. Show `affectedRoutes` as small route badges below each recommendation.

**Step 3: Add coverage banner**

Show a coverage percentage banner at the top of results: "Explored X/Y discovered routes (Z%)"

**Step 4: Commit**

```bash
git add nextjs/src/components/autotrack/ScanResults.tsx
git commit -m "feat(ui): add Explored Routes tab and business value to recommendations"
```

---

## Task 18: Update Interfaces and Types

**Files:**
- Modify: `nextjs/src/lib/site-scanner/interfaces.ts`

**Step 1: Update TrackingOpportunity interface**

Add optional V2 fields:
```typescript
  businessValue?: string;
  implementationNotes?: string;
  affectedRoutes?: string[];
```

**Step 2: Update CrawledPage interface**

Add V2 fields:
```typescript
  isAuthenticated?: boolean;
  templateGroup?: string;
  scrollableHeight?: number;
  interactiveElementCount?: number;
  obstaclesEncountered?: Array<{ type: string; selector: string; action: string }>;
```

**Step 3: Commit**

```bash
git add nextjs/src/lib/site-scanner/interfaces.ts
git commit -m "feat(types): update interfaces for AutoTrack V2 fields"
```

---

## Task 19: Update Defaults and Constants

**Files:**
- Modify: `nextjs/src/lib/site-scanner/interfaces.ts`

**Step 1: Update DEFAULT_CRAWL_OPTIONS**

```typescript
export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPages: 200,    // was 50
  maxDepth: 8,      // was 3
  pageTimeout: 30000,
  crawlDelay: 1000,
  jobTimeout: 20 * 60 * 1000, // 20 minutes (was 10)
};
```

**Step 2: Commit**

```bash
git add nextjs/src/lib/site-scanner/interfaces.ts
git commit -m "feat(config): update crawl defaults for V2 (200 pages, depth 8, 20min timeout)"
```

---

## Task 20: Integration Testing

**Files:**
- Manual testing checklist

**Step 1: Test obstacle handling**

1. Start a scan on a site with cookie banners (most sites have them)
2. Verify the obstacle counter increases in the live discovery dashboard
3. Check that crawling continues after banner dismissal

**Step 2: Test login flow**

1. Start a scan on a site with a login page
2. Verify the scan pauses and shows credential prompt
3. Enter credentials and verify login succeeds
4. Verify authenticated pages are discovered with lock icon
5. Verify credentials are saved when "Save for future" is checked

**Step 3: Test behavioral tracking generation**

1. Complete a scan
2. Verify all 14 universal behavioral trackings appear in recommendations
3. Verify niche-specific trackings appear (e.g., cart abandonment for e-commerce)
4. Verify each recommendation has a business value description

**Step 4: Test visual sitemap**

1. Complete a scan
2. Go to the "Explored Routes" tab
3. Verify tree structure matches discovered pages
4. Verify color coding works (scanned, authenticated, login)
5. Verify template grouping works for similar pages
6. Verify coverage stats are accurate

**Step 5: Test interaction simulation**

1. Start a scan on a site with accordions/tabs
2. Verify the interaction counter increases
3. Verify elements inside accordions/tabs are discovered

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes for AutoTrack V2"
```

---

## Dependency Order

```
Task 1 (Schema) ← everything depends on this
Task 18, 19 (Types/Defaults) ← services depend on these
Task 2 (Obstacles) ← Task 6 depends on this
Task 3 (Auth) ← Task 6, 9 depend on this
Task 4 (Interactions) ← Task 6 depends on this
Task 5 (Behavioral) ← Task 7 depends on this
Task 6 (Chunk Processor) ← core, depends on 2,3,4
Task 7 (Tracking Detector) ← depends on 5
Task 8 (Recommendation Engine) ← depends on 5
Task 9 (API - Credentials) ← depends on 3
Task 10, 11 (API updates) ← depends on 1
Tasks 12-17 (Frontend) ← depend on API tasks
Task 20 (Testing) ← depends on everything
```

**Recommended execution order:** 1 → 18 → 19 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 20
