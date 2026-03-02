import { Page, BrowserContext } from 'playwright-core';
import {
  LOGIN_URL_PATTERNS,
  LOGIN_QUERY_PATTERNS,
  LOGIN_CONTENT_PATTERNS,
} from '../constants/login-patterns';
import { humanType, humanClick, humanDelay, spaFill } from './human-interaction';

// ========================================
// Types
// ========================================

export type LoginErrorType =
  | 'invalid_credentials'
  | 'account_locked'
  | 'too_many_attempts'
  | 'account_not_found'
  | 'email_not_verified'
  | 'password_expired'
  | 'generic_error';

export interface LoginResult {
  success: boolean;
  error?: string;
  errorType?: LoginErrorType;
  requiresMfa?: boolean;
  requiresCaptcha?: boolean;
  redirectUrl?: string;
  ssoProvider?: string;
  attemptCount?: number;
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

// Serialize patterns for injection into page.evaluate (can't pass RegExp across contexts)
const SERIALIZED_URL_PATTERNS = LOGIN_URL_PATTERNS.map(r => ({ source: r.source, flags: r.flags }));
const SERIALIZED_QUERY_PATTERNS = LOGIN_QUERY_PATTERNS.map(r => ({ source: r.source, flags: r.flags }));
const SERIALIZED_CONTENT_PATTERN = { source: LOGIN_CONTENT_PATTERNS.source, flags: LOGIN_CONTENT_PATTERNS.flags };

// ========================================
// Login Page Detection
// ========================================

/**
 * Detect login page elements with Playwright (more accurate than HTML parsing).
 * Uses comprehensive URL, content, and form-based detection.
 */
export async function detectLoginPage(page: Page): Promise<LoginPageInfo> {
  return await page.evaluate((patterns) => {
    const { urlPatterns, queryPatterns, contentPattern } = patterns;

    const url = window.location.href;
    let parsedPath = '';
    let parsedSearch = '';
    try {
      const parsed = new URL(url);
      parsedPath = parsed.hash.startsWith('#/')
        ? parsed.hash.slice(1)
        : parsed.pathname;
      parsedSearch = parsed.search;
    } catch {
      parsedPath = url;
    }

    const fullPathAndQuery = parsedPath + parsedSearch;

    // URL-based detection (comprehensive patterns)
    const urlIsLogin =
      urlPatterns.some((p: { source: string; flags: string }) => new RegExp(p.source, p.flags).test(fullPathAndQuery)) ||
      queryPatterns.some((p: { source: string; flags: string }) => new RegExp(p.source, p.flags).test(parsedSearch));

    // Password field detection
    const passwordField = document.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement | null;

    // Content-based detection
    const bodyText = (document.body?.innerText || '').slice(0, 5000);
    const contentRegex = new RegExp(contentPattern.source, contentPattern.flags);
    const hasLoginText = contentRegex.test(bodyText);

    // Combined: URL match, or (password field AND login content text)
    const isLogin = urlIsLogin || (!!passwordField && hasLoginText);

    if (!isLogin) {
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

    const form = passwordField?.closest('form');

    let usernameField: HTMLInputElement | null = null;
    if (form) {
      const inputs = form.querySelectorAll(
        'input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="button"])'
      );
      usernameField = (inputs[0] as HTMLInputElement) || null;
    }
    if (!usernameField) {
      usernameField = document.querySelector(
        [
          'input[type="email"]',
          'input[autocomplete="username"]',
          'input[autocomplete="email"]',
          'input[name*="email"]',
          'input[name*="user"]',
          'input[name*="login"]',
          'input[name*="account"]',
          'input[id*="email"]',
          'input[id*="user"]',
          'input[id*="login"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="user" i]',
          'input[placeholder*="login" i]',
          // Framework-specific (MUI, Ant Design, shadcn)
          '.MuiInputBase-input[type="email"]',
          '.MuiInputBase-input[type="text"]',
          '.ant-input[type="email"]',
          '.ant-input[type="text"]',
          'input[data-slot="input"][type="email"]',
          'input[aria-label*="email" i]',
          'input[aria-label*="username" i]',
        ].join(', ')
      ) as HTMLInputElement | null;
    }

    let submitBtn: Element | null = null;
    if (form) {
      submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type]), button[type="button"]'
      );
    }
    if (!submitBtn) {
      // Broader search for submit-like buttons near a password field
      submitBtn = document.querySelector(
        'button[type="submit"], input[type="submit"]'
      );
    }

    const buildSelector = (el: Element | null): string | null => {
      if (!el) return null;
      if (el.id) return `#${el.id}`;
      if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
      if (el.getAttribute('type') === 'password') return 'input[type="password"]';
      if (el.getAttribute('type') === 'email') return 'input[type="email"]';
      if (el.getAttribute('autocomplete')) return `[autocomplete="${el.getAttribute('autocomplete')}"]`;
      if (el.getAttribute('placeholder')) return `[placeholder="${el.getAttribute('placeholder')}"]`;
      return null;
    };

    const hasCaptcha = !!(
      document.querySelector(
        '[class*="captcha"], [id*="captcha"], [class*="recaptcha"], [id*="recaptcha"], ' +
        '[class*="hcaptcha"], [id*="hcaptcha"], [class*="turnstile"], [id*="turnstile"]'
      ) ||
      document.querySelector(
        'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], ' +
        'iframe[src*="challenges.cloudflare"]'
      )
    );

    const hasOAuth = !!(
      document.querySelector(
        '[class*="google"], [class*="facebook"], [class*="github"], [class*="oauth"], ' +
        '[class*="social-login"], [class*="social-sign"], [class*="sso"]'
      ) ||
      document.querySelector(
        'a[href*="oauth"], a[href*="google"], a[href*="facebook"], a[href*="github"], ' +
        'a[href*="apple"], a[href*="microsoft"], a[href*="linkedin"]'
      ) ||
      document.querySelector(
        'button[data-provider], [data-social], [class*="apple-sign"], [class*="microsoft-sign"]'
      )
    );

    const hasMfa = !!(
      document.querySelector(
        '[class*="mfa"], [class*="two-factor"], [class*="2fa"], [class*="totp"], ' +
        '[name*="otp"], [name*="code"], [name*="mfa"], [name*="totp"], ' +
        'input[autocomplete="one-time-code"], input[type="tel"][maxlength="6"], ' +
        'input[inputmode="numeric"][maxlength="6"]'
      )
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
  }, {
    urlPatterns: SERIALIZED_URL_PATTERNS,
    queryPatterns: SERIALIZED_QUERY_PATTERNS,
    contentPattern: SERIALIZED_CONTENT_PATTERN,
  });
}

// ========================================
// Selectors
// ========================================

/**
 * Comprehensive username/email field selectors (ordered by specificity).
 */
const USERNAME_SELECTORS = [
  // Framework-specific (MUI, Ant Design, shadcn)
  '.MuiInputBase-input[type="email"]',
  '.MuiInputBase-input[type="text"]',
  '.ant-input[type="email"]',
  '.ant-input[type="text"]',
  'input[data-slot="input"][type="email"]',
  // aria-based
  'input[aria-label*="email" i]',
  'input[aria-label*="username" i]',
  // Standard autocomplete
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
  'input[type="email"]',
  // Name-based
  'input[name="email"]',
  'input[name="username"]',
  'input[name="login"]',
  'input[name="user"]',
  'input[name="userId"]',
  'input[name="user_login"]',
  'input[name="login_email"]',
  'input[name="login_id"]',
  // ID-based
  'input[id="email"]',
  'input[id="username"]',
  'input[id="login"]',
  'input[id="user"]',
  'input[id="login-email"]',
  'input[id="login-username"]',
  // Partial match
  'input[name*="email" i]',
  'input[name*="user" i]',
  'input[name*="login" i]',
  'input[id*="email" i]',
  'input[id*="user" i]',
  'input[id*="login" i]',
  // Placeholder-based
  'input[placeholder*="email" i]',
  'input[placeholder*="user" i]',
  'input[placeholder*="login" i]',
  'input[placeholder*="identifier" i]',
  // Contenteditable / role-based
  '[role="textbox"]',
  '[contenteditable="true"]',
  // Last resort — generic text input
  'input[type="text"]',
];

/**
 * Comprehensive submit button selectors.
 */
const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:not([type])', // Buttons without type default to submit in forms
  // Role-based and styled buttons
  '[role="button"]',
  'div[tabindex="0"][class*="btn"]',
  'span[tabindex="0"][class*="btn"]',
  'a[class*="btn-primary"]',
  'a[class*="button-primary"]',
];

/**
 * Text patterns that indicate a submit/login button.
 */
const SUBMIT_TEXT_PATTERNS = [
  /^(log\s*in|sign\s*in|submit|continue|next|enter|go)$/i,
  /^(send|verify|authenticate|access|proceed|confirm|connect)$/i,
  /^(connexion|anmelden|accedi|entrar|iniciar|inloggen)$/i,
  /^(ingresar|acessar|zaloguj|giriş)$/i,
  /\b(log\s*in|sign\s*in)\b/i,
];

// ========================================
// Element Finders
// ========================================

/**
 * Find the first visible element matching any selector in the list.
 */
async function findVisibleElement(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0 && await el.isVisible({ timeout: 500 })) {
        return el;
      }
    } catch {
      // Selector failed or not visible — try next
    }
  }
  return null;
}

/**
 * Find a submit button — tries selectors first, then text-based matching.
 * Scoped to form if provided, falls back to page-wide search.
 */
async function findSubmitButton(page: Page, formSelector: string | null) {
  const scope = formSelector ? page.locator(formSelector) : page;

  // 1. Try standard selectors within the form/page
  for (const selector of SUBMIT_SELECTORS) {
    try {
      const btn = scope.locator(selector).first();
      if (await btn.count() > 0 && await btn.isVisible({ timeout: 500 })) {
        return btn;
      }
    } catch { /* next */ }
  }

  // 2. Try text-based button matching within the form/page
  for (const pattern of SUBMIT_TEXT_PATTERNS) {
    try {
      const btn = scope.getByRole('button', { name: pattern }).first();
      if (await btn.count() > 0 && await btn.isVisible({ timeout: 500 })) {
        return btn;
      }
    } catch { /* next */ }
  }

  // 3. Try link-styled buttons (some sites use <a> as submit)
  for (const pattern of SUBMIT_TEXT_PATTERNS) {
    try {
      const link = scope.getByRole('link', { name: pattern }).first();
      if (await link.count() > 0 && await link.isVisible({ timeout: 500 })) {
        return link;
      }
    } catch { /* next */ }
  }

  // 4. Fall back to any visible button in the form
  if (formSelector) {
    try {
      const anyBtn = scope.locator('button').first();
      if (await anyBtn.count() > 0 && await anyBtn.isVisible({ timeout: 500 })) {
        return anyBtn;
      }
    } catch { /* next */ }
  }

  // 5. Icon-only buttons (SVG/icon children, short/empty text) in form or parent
  try {
    const iconBtns = (formSelector ? scope : page).locator('button:has(svg), button:has(i[class*="icon"]), button:has(span[class*="icon"])');
    const count = await iconBtns.count();
    for (let i = 0; i < count && i < 5; i++) {
      const btn = iconBtns.nth(i);
      if (await btn.isVisible({ timeout: 300 })) {
        const text = await btn.textContent();
        if (!text || text.trim().length < 3) {
          return btn;
        }
      }
    }
  } catch { /* next */ }

  // 6. Buttons in parent container (outside <form> but visually associated)
  if (formSelector) {
    try {
      const parentBtns = page.locator(`${formSelector} ~ button, ${formSelector} ~ div button`).first();
      if (await parentBtns.count() > 0 && await parentBtns.isVisible({ timeout: 500 })) {
        return parentBtns;
      }
    } catch { /* next */ }
  }

  // 7. Page-wide fallback
  for (const selector of SUBMIT_SELECTORS.slice(0, 3)) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.count() > 0 && await btn.isVisible({ timeout: 500 })) {
        return btn;
      }
    } catch { /* next */ }
  }

  return null;
}

// ========================================
// Post-Submit Handling
// ========================================

/**
 * Wait for navigation or network settle after a form submit.
 * Follows redirect chains (up to 3 hops) for better SPA handling.
 */
async function waitForPostSubmit(page: Page, previousUrl: string): Promise<void> {
  try {
    // Wait for URL change OR network idle — whichever comes first
    await Promise.race([
      page.waitForURL((url) => url.toString() !== previousUrl, { timeout: 12000 }),
      page.waitForLoadState('networkidle', { timeout: 12000 }),
    ]);
  } catch {
    // SPA may not navigate — that's OK
  }

  // Follow redirect chains (up to 3 hops)
  for (let hop = 0; hop < 3; hop++) {
    const currentUrl = page.url();
    try {
      await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 3000 });
    } catch {
      break; // No more redirects
    }
  }

  // Extra settle time for SPAs that update DOM after API calls
  await page.waitForTimeout(2000);
}

// ========================================
// Error Classification
// ========================================

/**
 * Classify a login error message into a category.
 */
function classifyLoginError(errorText: string): LoginErrorType {
  const lower = errorText.toLowerCase();

  if (/incorrect|invalid|wrong|bad\s+(password|credentials)|authentication\s+failed/i.test(lower)) {
    return 'invalid_credentials';
  }
  if (/locked|suspended|disabled|blocked|banned|deactivated/i.test(lower)) {
    return 'account_locked';
  }
  if (/too\s+many|rate\s+limit|temporarily|try\s+again\s+later|slow\s+down/i.test(lower)) {
    return 'too_many_attempts';
  }
  if (/not\s+found|no\s+account|doesn.t\s+exist|does\s+not\s+exist|unregistered|unknown\s+user/i.test(lower)) {
    return 'account_not_found';
  }
  if (/verify|confirm|activation|not\s+verified|unverified/i.test(lower)) {
    return 'email_not_verified';
  }
  if (/expired|reset\s+your\s+password|password\s+reset\s+required/i.test(lower)) {
    return 'password_expired';
  }

  return 'generic_error';
}

// ========================================
// Multi-Step State Machine
// ========================================

/**
 * Wait for the next step in a multi-step login flow.
 * Polls for password field, SSO redirect, loading spinners, CAPTCHA, MFA, or errors.
 */
async function waitForNextStep(
  page: Page,
  previousUrl: string,
): Promise<{
  state: 'password_visible' | 'sso_redirect' | 'captcha' | 'mfa' | 'error';
  ssoProvider?: string;
  errorText?: string;
}> {
  const startTime = Date.now();
  const budget = 15000; // 15s budget
  const interval = 500;

  while (Date.now() - startTime < budget) {
    // Check if password field appeared
    try {
      const pwField = page.locator('input[type="password"]').first();
      if (await pwField.count() > 0 && await pwField.isVisible({ timeout: 300 })) {
        return { state: 'password_visible' };
      }
    } catch { /* not yet */ }

    // Check for SSO redirect (domain changed)
    const currentUrl = page.url();
    try {
      const currentDomain = new URL(currentUrl).hostname;
      const previousDomain = new URL(previousUrl).hostname;
      if (currentDomain !== previousDomain) {
        // Detect SSO provider
        let ssoProvider: string | undefined;
        if (/accounts\.google|google\.com\/o\/oauth/i.test(currentUrl)) ssoProvider = 'google';
        else if (/login\.microsoftonline|microsoft\.com\/oauth/i.test(currentUrl)) ssoProvider = 'microsoft';
        else if (/facebook\.com\/login|facebook\.com\/v\d/i.test(currentUrl)) ssoProvider = 'facebook';
        else if (/github\.com\/login|github\.com\/oauth/i.test(currentUrl)) ssoProvider = 'github';
        else if (/appleid\.apple\.com/i.test(currentUrl)) ssoProvider = 'apple';
        else ssoProvider = 'unknown';
        return { state: 'sso_redirect', ssoProvider };
      }
    } catch { /* URL parse failure */ }

    // Check for loading spinner — wait for it to disappear
    try {
      const spinner = page.locator('[class*="spinner"], [class*="loading"], [class*="loader"], [role="progressbar"]').first();
      if (await spinner.count() > 0 && await spinner.isVisible({ timeout: 200 })) {
        try {
          await spinner.waitFor({ state: 'hidden', timeout: 5000 });
        } catch { /* spinner stuck */ }
        continue; // Re-check after spinner
      }
    } catch { /* no spinner */ }

    // Check for CAPTCHA
    const hasCaptcha = await page.evaluate(() => !!(
      document.querySelector(
        '[class*="captcha"], [id*="captcha"], [class*="recaptcha"], [id*="recaptcha"], ' +
        '[class*="hcaptcha"], [id*="hcaptcha"], [class*="turnstile"], [id*="turnstile"], ' +
        'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]'
      )
    ));
    if (hasCaptcha) return { state: 'captcha' };

    // Check for MFA
    const hasMfa = await page.evaluate(() => !!(
      document.querySelector(
        '[class*="mfa"], [class*="two-factor"], [class*="2fa"], [class*="totp"], ' +
        '[name*="otp"], [name*="code"], [name*="mfa"], ' +
        'input[autocomplete="one-time-code"], input[type="tel"][maxlength="6"]'
      )
    ));
    if (hasMfa) return { state: 'mfa' };

    // Check for error messages
    const errorText = await page.evaluate(() => {
      const errorEl = document.querySelector(
        '[class*="error"]:not(style):not(script), [class*="alert-danger"], [class*="invalid-feedback"], ' +
        '[role="alert"], .error-message, .field-error, .form-error, [class*="login-error"]'
      );
      if (!errorEl) return null;
      const text = (errorEl as HTMLElement).innerText?.trim();
      return text && text.length > 0 && text.length < 300 ? text : null;
    });
    if (errorText) return { state: 'error', errorText };

    await page.waitForTimeout(interval);
  }

  // Timeout — return error
  return { state: 'error', errorText: 'Password field did not appear after email step' };
}

// ========================================
// Core Login Logic
// ========================================

/**
 * Perform automated login on a page.
 *
 * Handles:
 * - Single-step login (email + password on same page)
 * - Multi-step login (email first → submit → password page → submit)
 * - SPA navigation (no full page reload)
 * - Human-like typing for anti-bot evasion
 * - SSO redirect detection
 * - CAPTCHA / MFA detection
 * - Classified error reporting
 */
export async function performLogin(
  page: Page,
  loginInfo: LoginPageInfo,
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    if (loginInfo.hasCaptcha) {
      return { success: false, requiresCaptcha: true, error: 'CAPTCHA detected - cannot auto-login' };
    }

    console.log('[Login] Starting login attempt on:', page.url());

    // ── Step 1: Find and fill the username/email field ──

    // Build prioritized selector list: detected selector first, then fallbacks
    const userSelectors = loginInfo.usernameSelector
      ? [loginInfo.usernameSelector, ...USERNAME_SELECTORS]
      : USERNAME_SELECTORS;

    const usernameEl = await findVisibleElement(page, userSelectors);
    if (!usernameEl) {
      return { success: false, error: 'Could not find username/email field' };
    }

    // Human-like typing for the username field
    await humanType(page, usernameEl, username);
    console.log('[Login] Filled username field');

    // ── Step 2: Check if password field is visible (single-step) or hidden (multi-step) ──

    const passwordSelector = loginInfo.passwordSelector || 'input[type="password"]';
    let passwordEl = page.locator(passwordSelector).first();
    let passwordVisible = false;
    try {
      passwordVisible = await passwordEl.count() > 0 && await passwordEl.isVisible({ timeout: 1000 });
    } catch { /* not visible */ }

    if (passwordVisible) {
      // ── SINGLE-STEP LOGIN: Fill password and submit ──
      console.log('[Login] Single-step login detected (password field visible)');

      await humanType(page, passwordEl, password);

      const currentUrl = page.url();
      const submitBtn = await findSubmitButton(page, loginInfo.formSelector);
      if (!submitBtn) {
        await passwordEl.press('Enter');
      } else {
        await humanClick(page, submitBtn);
      }

      await waitForPostSubmit(page, currentUrl);
    } else {
      // ── MULTI-STEP LOGIN: Submit email first, then fill password ──
      console.log('[Login] Multi-step login detected (no password field visible yet)');

      const currentUrl = page.url();
      const submitBtn = await findSubmitButton(page, loginInfo.formSelector);
      if (!submitBtn) {
        await usernameEl.press('Enter');
      } else {
        await humanClick(page, submitBtn);
      }

      // Use state machine to wait for next step
      const nextStep = await waitForNextStep(page, currentUrl);

      switch (nextStep.state) {
        case 'password_visible':
          // Continue to fill password below
          break;
        case 'sso_redirect':
          return {
            success: false,
            ssoProvider: nextStep.ssoProvider,
            error: `SSO redirect detected (${nextStep.ssoProvider})`,
          };
        case 'captcha':
          return { success: false, requiresCaptcha: true, error: 'CAPTCHA appeared after email step' };
        case 'mfa':
          return { success: false, requiresMfa: true };
        case 'error': {
          const errorType = nextStep.errorText ? classifyLoginError(nextStep.errorText) : 'generic_error';
          return { success: false, error: nextStep.errorText, errorType };
        }
      }

      // Fill password
      passwordEl = page.locator('input[type="password"]').first();
      await humanType(page, passwordEl, password);

      // Find the new submit button (page may have changed)
      const step2Url = page.url();
      const step2Submit = await findSubmitButton(page, null);
      if (!step2Submit) {
        await passwordEl.press('Enter');
      } else {
        await humanClick(page, step2Submit);
      }

      await waitForPostSubmit(page, step2Url);
    }

    // ── Step 3: Verify login success ──

    const loginSuccess = await verifyLoginSuccess(page);
    if (loginSuccess) {
      console.log('[Login] Login verified successfully at:', page.url());
      return { success: true, redirectUrl: page.url() };
    }

    // Check if we ended up on MFA page
    const postLoginInfo = await detectLoginPage(page);
    if (postLoginInfo.hasMfa) {
      console.log('[Login] MFA required');
      return { success: false, requiresMfa: true };
    }

    // Check if CAPTCHA appeared after submit
    if (postLoginInfo.hasCaptcha) {
      return { success: false, requiresCaptcha: true, error: 'CAPTCHA appeared after login submit' };
    }

    // Check if we're still on login page with no errors — might still be successful (e.g. SPA hasn't updated)
    // Give it one more chance with a longer wait
    await page.waitForTimeout(2000);
    const retrySuccess = await verifyLoginSuccess(page);
    if (retrySuccess) {
      console.log('[Login] Login verified on retry at:', page.url());
      return { success: true, redirectUrl: page.url() };
    }

    // Detect specific error messages
    const errorText = await page.evaluate(() => {
      const errorEl = document.querySelector(
        '[class*="error"]:not(style):not(script), [class*="alert-danger"], [class*="invalid-feedback"], ' +
        '[role="alert"], .error-message, .field-error, .form-error, [class*="login-error"]'
      );
      if (!errorEl) return null;
      const text = (errorEl as HTMLElement).innerText?.trim();
      return text && text.length < 200 ? text : null;
    });

    if (errorText) {
      const errorType = classifyLoginError(errorText);
      console.log('[Login] Login error detected:', errorText, `(${errorType})`);
      return { success: false, error: `Login failed: ${errorText}`, errorType };
    }

    return { success: false, error: 'Login may have failed - could not verify success' };
  } catch (error: any) {
    console.error('[Login] Login error:', error?.message);
    return { success: false, error: `Login failed: ${error?.message}` };
  }
}

// ========================================
// Login with Retry
// ========================================

/** Permanent failure types that should not be retried. */
const NON_RETRYABLE_ERRORS: LoginErrorType[] = [
  'account_locked',
  'account_not_found',
  'email_not_verified',
];

/**
 * Perform login with retry logic.
 * Max 2 retries (3 attempts total) with exponential backoff.
 * Does not retry permanent failures (CAPTCHA, MFA, SSO, account_locked, etc.).
 */
export async function performLoginWithRetry(
  page: Page,
  loginInfo: LoginPageInfo,
  username: string,
  password: string,
  loginUrl: string,
): Promise<LoginResult> {
  const maxRetries = 2;
  let lastResult: LoginResult = { success: false, error: 'No attempt made' };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`[Login] Retry ${attempt}/${maxRetries}...`);

      // Exponential backoff: 1s, 2s
      await page.waitForTimeout(1000 * attempt);

      // Re-navigate to login URL
      try {
        await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);
      } catch {
        // Navigation failure — try anyway
      }

      // Re-detect login form
      loginInfo = await detectLoginPage(page);
      if (!loginInfo.isLogin) {
        return { ...lastResult, attemptCount: attempt + 1 };
      }
    }

    lastResult = await performLogin(page, loginInfo, username, password);
    lastResult.attemptCount = attempt + 1;

    // Success → return immediately
    if (lastResult.success) return lastResult;

    // Non-retryable failures → return immediately
    if (lastResult.requiresCaptcha || lastResult.requiresMfa || lastResult.ssoProvider) {
      return lastResult;
    }
    if (lastResult.errorType && NON_RETRYABLE_ERRORS.includes(lastResult.errorType)) {
      return lastResult;
    }
  }

  return lastResult;
}

// ========================================
// MFA
// ========================================

/**
 * Submit MFA code on the current page.
 */
export async function submitMfaCode(page: Page, code: string): Promise<LoginResult> {
  try {
    const mfaInput = page.locator(
      'input[name*="otp"], input[name*="code"], input[name*="mfa"], input[name*="token"], input[type="tel"][maxlength="6"], input[autocomplete="one-time-code"]'
    ).first();

    await mfaInput.waitFor({ state: 'visible', timeout: 5000 });
    await humanType(page, mfaInput, code);
    await humanDelay('short');

    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Verify"), button:has-text("Submit"), button:has-text("Continue")'
    ).first();
    const currentUrl = page.url();
    await humanClick(page, submitBtn);

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

// ========================================
// Verification
// ========================================

async function verifyLoginSuccess(page: Page): Promise<boolean> {
  return await page.evaluate((patterns) => {
    const url = window.location.href;
    let parsedPath = '';
    try {
      const parsed = new URL(url);
      parsedPath = parsed.hash.startsWith('#/') ? parsed.hash.slice(1) : parsed.pathname;
    } catch {
      parsedPath = url;
    }

    // If still on a login-like URL, check for error indicators
    const stillOnLogin = patterns.urlPatterns.some(
      (p: { source: string; flags: string }) => new RegExp(p.source, p.flags).test(parsedPath)
    );
    if (stillOnLogin) {
      const hasError = !!document.querySelector(
        '[class*="error"], [class*="alert-danger"], [class*="alert-error"], [class*="invalid"], ' +
        '[class*="form-error"], [class*="login-error"], [class*="auth-error"], ' +
        '[role="alert"], .error-message, .field-error'
      );
      if (hasError) return false;
    }

    // Check for logout/user indicators (sign of successful login)
    const hasLogout = !!(
      document.querySelector(
        'a[href*="logout"], a[href*="signout"], a[href*="sign-out"], a[href*="log-out"], ' +
        'a[href*="deconnexion"], a[href*="abmelden"], a[href*="esci"], a[href*="sair"], ' +
        'button[class*="logout"], button[class*="signout"]'
      ) ||
      document.querySelector(
        '[class*="avatar"], [class*="user-menu"], [class*="account-menu"], [class*="profile-menu"], ' +
        '[class*="user-dropdown"], [class*="user-nav"], [class*="account-dropdown"], ' +
        '[class*="logged-in"], [class*="authenticated"], [data-user], [data-username]'
      )
    );

    // Check for dashboard-like URLs
    const hasDashboard = /\/(dashboard|account|profile|home|my[-_]|member|admin|console|panel|settings|overview|welcome)/i.test(parsedPath);

    // Check page content for post-login indicators
    const bodyText = (document.body?.innerText || '').slice(0, 3000).toLowerCase();
    const hasPostLoginContent = /\b(welcome back|my account|my dashboard|sign out|log out|hi,|hello,)\b/i.test(bodyText);

    return hasLogout || hasDashboard || hasPostLoginContent;
  }, {
    urlPatterns: SERIALIZED_URL_PATTERNS,
  });
}

// ========================================
// Cookie Persistence
// ========================================

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
