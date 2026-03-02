import { Browser, Page } from 'playwright-core';
import { randomUUID } from 'crypto';
import { createStealthBrowser, createStealthContext } from './stealth-config';
import { humanType, humanClick, humanDelay, spaFill } from './human-interaction';
import { dismissObstacles } from './obstacle-handler';

interface AutoRegisterResult {
  success: boolean;
  credentials?: { email: string; password: string };
  error?: string;
  needsEmailVerification?: boolean;
}

// ========================================
// Password Generation
// ========================================

const SPECIAL_CHARS = '!@#$%&*';

/**
 * Generate a strong password that meets most site policies.
 * Format: Sc{uuid8}{special}n{2digits} (~14 chars)
 * Guarantees: uppercase, lowercase, digit, special char.
 */
function generateStrongPassword(): string {
  const uuid = randomUUID().slice(0, 8);
  const special = SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)];
  const digits = String(Math.floor(Math.random() * 90) + 10);
  const password = `Sc${uuid}${special}n${digits}`;

  // Validate no 3 consecutive identical characters
  for (let i = 0; i < password.length - 2; i++) {
    if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
      // Extremely unlikely with UUID, but just regenerate
      return generateStrongPassword();
    }
  }

  return password;
}

// ========================================
// Main Entry Point
// ========================================

/**
 * Attempt to auto-register a test account on the target website.
 *
 * Process:
 * 1. Navigate to the login page (with stealth browser)
 * 2. Dismiss obstacles (cookie banners, popups)
 * 3. Detect OAuth-only registration
 * 4. Find signup/register link (href + text-based, with broad patterns)
 * 5. Navigate to signup page
 * 6. Detect CAPTCHA before filling (fail fast)
 * 7. Fill out registration form (email, password, name, phone, username, TOS)
 *    - Uses humanType() for email/password (anti-bot)
 *    - Uses spaFill() for other fields (SPA compatibility)
 * 8. Submit and wait for navigation/response
 * 9. Handle multi-step registration wizards
 * 10. Verify success / detect errors / email verification
 */
export async function autoRegisterAccount(
  loginUrl: string,
  websiteUrl: string,
): Promise<AutoRegisterResult> {
  let browser: Browser | null = null;
  try {
    browser = await createStealthBrowser();
    const context = await createStealthContext(browser);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Generate test credentials
    const uuid = randomUUID().slice(0, 8);
    const email = `scanner-${uuid}@oneclicktag-test.com`;
    const password = generateStrongPassword();

    console.log('[AutoRegister] Starting auto-registration for:', websiteUrl);
    console.log('[AutoRegister] Generated email:', email);

    // Step 1: Navigate to login page
    try {
      await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      // networkidle timeout is OK — page likely loaded
      try {
        await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (navError: any) {
        return { success: false, error: `Could not load login page: ${navError?.message}` };
      }
    }
    console.log('[AutoRegister] Navigated to login page:', loginUrl);

    // Dismiss obstacles (cookie banners, popups)
    await dismissObstacles(page);

    // Check for CAPTCHA early
    if (await detectCaptcha(page)) {
      return { success: false, error: 'CAPTCHA detected on login page - cannot auto-register' };
    }

    // Check for OAuth-only registration (no email/password fields at all)
    const isOAuthOnly = await detectOAuthOnlyPage(page);
    if (isOAuthOnly) {
      return { success: false, error: 'OAuth-only registration detected - no email/password form available' };
    }

    // Step 2: Find signup link
    const signupLink = await findSignupLink(page);
    if (!signupLink) {
      return { success: false, error: 'Could not find a signup/register link on the login page' };
    }
    console.log('[AutoRegister] Found signup link:', signupLink);

    // Step 3: Navigate to signup page
    try {
      await page.goto(signupLink, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      try {
        await page.goto(signupLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (navError: any) {
        return { success: false, error: `Could not load signup page: ${navError?.message}` };
      }
    }
    await page.waitForTimeout(1000); // Let SPA render
    console.log('[AutoRegister] Navigated to signup page');

    // Dismiss obstacles on signup page
    await dismissObstacles(page);

    // Check for CAPTCHA on signup page
    if (await detectCaptcha(page)) {
      return { success: false, error: 'CAPTCHA detected on signup page - cannot auto-register' };
    }

    // Check for OAuth-only on signup page too
    const signupOAuthOnly = await detectOAuthOnlyPage(page);
    if (signupOAuthOnly) {
      return { success: false, error: 'OAuth-only registration detected on signup page' };
    }

    // Step 4: Detect and fill the registration form
    const filled = await fillRegistrationForm(page, email, password);
    if (!filled) {
      return { success: false, error: 'Could not detect registration form fields' };
    }
    console.log('[AutoRegister] Form filled successfully');

    // Step 5: Submit the form
    const submitted = await submitRegistrationForm(page);
    if (!submitted) {
      return { success: false, error: 'Could not find or click the submit button' };
    }
    console.log('[AutoRegister] Form submitted');

    // Wait for response — use both URL change and timeout
    const preSubmitUrl = page.url();
    try {
      await Promise.race([
        page.waitForURL((url) => url.toString() !== preSubmitUrl, { timeout: 8000 }),
        page.waitForLoadState('networkidle', { timeout: 8000 }),
      ]);
    } catch {
      // SPA might not navigate
    }
    await page.waitForTimeout(2000);

    // Check for CAPTCHA after submit
    if (await detectCaptcha(page)) {
      return { success: false, error: 'CAPTCHA appeared after form submit - cannot auto-register' };
    }

    // Step 6: Handle multi-step registration wizard
    const wizardResult = await handleMultiStepRegistration(page, email, password);
    if (wizardResult.handled) {
      if (wizardResult.success) {
        return { success: true, credentials: { email, password } };
      }
      if (wizardResult.needsEmailVerification) {
        return { success: false, error: 'Email verification required', needsEmailVerification: true, credentials: { email, password } };
      }
      if (wizardResult.error) {
        return { success: false, error: wizardResult.error };
      }
    }

    // Check for email verification requirement
    const needsVerification = await detectEmailVerification(page);
    if (needsVerification) {
      return {
        success: false,
        error: 'Email verification required',
        needsEmailVerification: true,
        credentials: { email, password },
      };
    }

    // Check for success indicators
    const isSuccess = await detectRegistrationSuccess(page, loginUrl, signupLink);

    if (isSuccess) {
      console.log('[AutoRegister] Registration successful!');
      return { success: true, credentials: { email, password } };
    }

    // Check for form errors
    const formError = await detectFormError(page);
    if (formError) {
      return { success: false, error: `Registration failed: ${formError}` };
    }

    return { success: false, error: 'Could not verify registration success' };
  } catch (error: any) {
    console.error('[AutoRegister] Error during auto-registration:', error);
    return { success: false, error: error?.message || 'Auto-registration failed' };
  } finally {
    if (browser) await browser.close();
  }
}

// ========================================
// OAuth-Only Detection
// ========================================

/**
 * Detect if a page only has OAuth buttons and no email/password form fields.
 */
async function detectOAuthOnlyPage(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const hasEmailField = !!(
      document.querySelector('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
    );
    const hasPasswordField = !!(
      document.querySelector('input[type="password"]')
    );
    const hasOAuthButtons = !!(
      document.querySelector(
        'a[href*="oauth"], a[href*="google"], a[href*="facebook"], a[href*="github"], ' +
        'a[href*="apple"], a[href*="microsoft"], ' +
        'button[data-provider], [data-social], [class*="social-login"], [class*="sso"], ' +
        '[class*="google-sign"], [class*="facebook-sign"], [class*="apple-sign"]'
      )
    );

    // OAuth-only = has OAuth buttons but no email/password fields
    return hasOAuthButtons && !hasEmailField && !hasPasswordField;
  });
}

// ========================================
// Multi-Step Registration Wizard
// ========================================

/**
 * Handle multi-step registration flows (step 1: email, step 2: details, step 3: password, etc.)
 * Returns { handled: false } if the page doesn't appear to be a wizard.
 */
async function handleMultiStepRegistration(
  page: Page,
  email: string,
  password: string,
): Promise<{ handled: boolean; success?: boolean; error?: string; needsEmailVerification?: boolean }> {
  // Detect if we're in a wizard (next/continue button visible but not a final success page)
  const hasNextStep = await page.evaluate(() => {
    const nextButtons = document.querySelectorAll(
      'button:not([type="submit"])'
    );
    for (const btn of Array.from(nextButtons)) {
      const text = (btn as HTMLElement).innerText?.trim().toLowerCase();
      if (/^(next|continue|proceed|step\s*\d)$/i.test(text)) return true;
    }
    // Check for step indicators
    return !!(
      document.querySelector('[class*="step-indicator"], [class*="wizard-step"], [class*="progress-step"], [role="progressbar"]')
    );
  });

  if (!hasNextStep) {
    return { handled: false };
  }

  console.log('[AutoRegister] Multi-step registration wizard detected');

  // Process up to 5 steps
  for (let step = 0; step < 5; step++) {
    // Check for success
    if (await detectEmailVerification(page)) {
      return { handled: true, needsEmailVerification: true };
    }

    const successCheck = await page.evaluate(() => {
      const bodyText = (document.body?.innerText || '').toLowerCase().slice(0, 3000);
      return /welcome|account created|successfully registered|registration complete|you.re all set/.test(bodyText);
    });
    if (successCheck) {
      return { handled: true, success: true };
    }

    // Check for errors
    const error = await detectFormError(page);
    if (error) {
      return { handled: true, error: `Registration wizard failed at step ${step + 1}: ${error}` };
    }

    // Fill any visible fields on this step
    await fillRegistrationForm(page, email, password);

    // Find and click Next/Continue button
    const nextClicked = await clickNextButton(page);
    if (!nextClicked) {
      // No next button — might be the final step, let caller handle
      return { handled: false };
    }

    // Wait for step transition
    await page.waitForTimeout(1500);

    // Check for CAPTCHA
    if (await detectCaptcha(page)) {
      return { handled: true, error: 'CAPTCHA appeared during registration wizard' };
    }
  }

  return { handled: true, error: 'Registration wizard exceeded maximum steps' };
}

/**
 * Click a Next/Continue button in a registration wizard.
 */
async function clickNextButton(page: Page): Promise<boolean> {
  const patterns = [
    /^next$/i, /^continue$/i, /^proceed$/i, /^next\s*step$/i,
  ];

  for (const pattern of patterns) {
    try {
      const btn = page.getByRole('button', { name: pattern }).first();
      if (await btn.count() > 0 && await btn.isVisible({ timeout: 500 })) {
        await humanClick(page, btn);
        return true;
      }
    } catch { /* next */ }
  }

  return false;
}

// ========================================
// Signup Link Discovery
// ========================================

/**
 * Find signup/register link on the login page.
 * Uses comprehensive href patterns + text-based matching + button/link role matching.
 */
async function findSignupLink(page: Page): Promise<string | null> {
  try {
    // ── 1. Href-based patterns (most reliable) ──
    const hrefPatterns = [
      'a[href*="signup"]',
      'a[href*="sign-up"]',
      'a[href*="sign_up"]',
      'a[href*="register"]',
      'a[href*="registration"]',
      'a[href*="create-account"]',
      'a[href*="create_account"]',
      'a[href*="createaccount"]',
      'a[href*="new-account"]',
      'a[href*="join"]',
      'a[href*="get-started"]',
      'a[href*="getstarted"]',
      'a[href*="enroll"]',
      'a[href*="subscribe"]',
      // CMS-specific
      'a[href*="wp-signup"]',           // WordPress
      'a[href*="user/register"]',       // Drupal
      'a[href*="users/sign_up"]',       // Rails/Devise
      'a[href*="account/register"]',    // Shopify/various
      'a[href*="customer/account/create"]', // Magento
      // Internationalized
      'a[href*="inscription"]',         // French
      'a[href*="registro"]',            // Spanish
      'a[href*="registrierung"]',       // German
      'a[href*="registrazione"]',       // Italian
      'a[href*="registreren"]',         // Dutch
      'a[href*="cadastro"]',            // Portuguese
    ];

    for (const pattern of hrefPatterns) {
      try {
        const link = page.locator(pattern).first();
        if (await link.count() > 0 && await link.isVisible({ timeout: 500 })) {
          const href = await link.getAttribute('href');
          if (href) {
            return new URL(href, page.url()).toString();
          }
        }
      } catch { /* next */ }
    }

    // ── 2. Text-based matching on links ──
    const linkTextPatterns = [
      /sign\s*up/i, /register/i, /create\s*(an?\s*)?account/i,
      /get\s*started/i, /join/i, /join\s*(now|free|us)/i,
      /don.t have an account/i, /new\s*(here|user|member)/i,
      /start\s*(free|your)\s*(trial)?/i, /try\s*(it\s*)?(free|now)/i,
      /s'inscrire/i, /inscription/i,   // French
      /registrar/i, /crear\s*cuenta/i,  // Spanish
      /registrieren/i, /konto\s*erstellen/i, // German
      /registrati/i, /crea\s*account/i, // Italian
      /registreren/i,                    // Dutch
      /cadastrar/i, /criar\s*conta/i,   // Portuguese
    ];

    for (const pattern of linkTextPatterns) {
      try {
        const link = page.getByRole('link', { name: pattern }).first();
        if (await link.count() > 0 && await link.isVisible({ timeout: 500 })) {
          const href = await link.getAttribute('href');
          if (href) {
            return new URL(href, page.url()).toString();
          }
        }
      } catch { /* next */ }
    }

    // ── 3. Try buttons that might navigate to signup ──
    for (const pattern of linkTextPatterns.slice(0, 6)) {
      try {
        const btn = page.getByRole('button', { name: pattern }).first();
        if (await btn.count() > 0 && await btn.isVisible({ timeout: 500 })) {
          // Click the button and see if it navigates
          const currentUrl = page.url();
          await btn.click();
          try {
            await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 5000 });
            return page.url();
          } catch {
            // Didn't navigate — might have opened a modal, still continue
          }
        }
      } catch { /* next */ }
    }

    // ── 4. Generic fallback: look for any link with signup-like text in innerText ──
    const fallbackUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const pattern = /sign\s*up|register|create\s*account|join/i;
      for (const link of links) {
        const text = (link.textContent || '').trim();
        if (pattern.test(text)) {
          return (link as HTMLAnchorElement).href;
        }
      }
      return null;
    });

    return fallbackUrl;
  } catch (error) {
    console.error('[AutoRegister] Error finding signup link:', error);
    return null;
  }
}

// ========================================
// Form Filling
// ========================================

/**
 * Helper: find first visible field matching any selector, fill it.
 * Uses humanType() for email/password fields, spaFill() for others.
 */
async function fillField(
  page: Page,
  selectors: string[],
  value: string,
  label: string,
  useHumanType: boolean = false,
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible({ timeout: 500 })) {
        if (useHumanType) {
          await humanType(page, field, value);
        } else {
          // Use spaFill for SPA compatibility
          await spaFill(page, field, value);
        }
        await humanDelay('short');
        console.log(`[AutoRegister] Filled ${label} field`);
        return true;
      }
    } catch { /* next */ }
  }
  return false;
}

/**
 * Fill registration form fields.
 * Handles: email, username, password (+ confirm), first/last name,
 * full name, phone, TOS checkbox, newsletter opt-out.
 *
 * Uses humanType() for email/password (most monitored fields).
 * Uses spaFill() for other fields (SPA compatibility, less critical for detection).
 */
async function fillRegistrationForm(page: Page, email: string, password: string): Promise<boolean> {
  try {
    let fieldsFilledCount = 0;

    // ── Email field (humanType — most monitored) ──
    const emailFilled = await fillField(page, [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="e-mail"]',
      'input[id="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]',
      'input[autocomplete="email"]',
      // Framework-specific
      '.MuiInputBase-input[type="email"]',
      '.ant-input[type="email"]',
      'input[data-slot="input"][type="email"]',
      'input[aria-label*="email" i]',
    ], email, 'email', true);
    if (emailFilled) fieldsFilledCount++;

    // ── Username field (if separate from email) ──
    const usernameFilled = await fillField(page, [
      'input[name="username"]:not([type="hidden"])',
      'input[id="username"]:not([type="hidden"])',
      'input[name*="username" i]:not([type="hidden"])',
      'input[id*="username" i]:not([type="hidden"])',
      'input[placeholder*="username" i]:not([type="hidden"])',
      'input[autocomplete="username"]',
      // Framework-specific
      '.MuiInputBase-input[name*="username" i]',
      '.ant-input[name*="username" i]',
      'input[aria-label*="username" i]',
    ], email.split('@')[0], 'username', false);
    if (usernameFilled) fieldsFilledCount++;

    // ── Password fields (humanType — most monitored) ──
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="password" i]',
      'input[id*="password" i]',
      // Framework-specific
      '.MuiInputBase-input[type="password"]',
      '.ant-input[type="password"]',
    ];
    try {
      const passwordFields = await page.locator(passwordSelectors.join(', ')).all();
      for (const field of passwordFields) {
        try {
          if (await field.isVisible({ timeout: 500 })) {
            await humanType(page, field, password);
            fieldsFilledCount++;
            console.log('[AutoRegister] Filled password field');
          }
        } catch { /* skip hidden field */ }
      }
    } catch { /* no password fields */ }

    // ── Password strength check ──
    await handlePasswordStrength(page, password);

    // ── Full name field ──
    await fillField(page, [
      'input[name="name"]:not([name*="user"]):not([name*="last"]):not([name*="first"])',
      'input[name="full_name"]',
      'input[name="fullname"]',
      'input[id="name"]:not([id*="user"]):not([id*="last"]):not([id*="first"])',
      'input[placeholder*="full name" i]',
      'input[placeholder*="your name" i]',
      'input[autocomplete="name"]',
      'input[aria-label*="full name" i]',
      'input[aria-label*="your name" i]',
    ], 'Test Scanner', 'full name');

    // ── First name field ──
    await fillField(page, [
      'input[name="first_name"]',
      'input[name="firstname"]',
      'input[name="fname"]',
      'input[name*="first" i]:not([name*="last"])',
      'input[id*="first" i]:not([id*="last"])',
      'input[placeholder*="first name" i]',
      'input[autocomplete="given-name"]',
      'input[aria-label*="first name" i]',
    ], 'Test', 'first name');

    // ── Last name field ──
    await fillField(page, [
      'input[name="last_name"]',
      'input[name="lastname"]',
      'input[name="lname"]',
      'input[name*="last" i]:not([name*="first"])',
      'input[id*="last" i]:not([id*="first"])',
      'input[placeholder*="last name" i]',
      'input[placeholder*="surname" i]',
      'input[autocomplete="family-name"]',
      'input[aria-label*="last name" i]',
    ], 'Scanner', 'last name');

    // ── Phone field (optional, some sites require it) ──
    await fillField(page, [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[name*="mobile" i]',
      'input[name*="tel" i]',
      'input[id*="phone" i]',
      'input[placeholder*="phone" i]',
      'input[placeholder*="mobile" i]',
      'input[autocomplete="tel"]',
      'input[aria-label*="phone" i]',
    ], '+15555550100', 'phone');

    // ── Company/Organization field (optional) ──
    await fillField(page, [
      'input[name*="company" i]',
      'input[name*="organization" i]',
      'input[name*="org" i]:not([name*="pass"]):not([name*="forgot"])',
      'input[id*="company" i]',
      'input[placeholder*="company" i]',
      'input[placeholder*="organization" i]',
      'input[aria-label*="company" i]',
    ], 'OneClickTag Test', 'company');

    // ── Terms of service / agree checkbox ──
    const tosSelectors = [
      'input[type="checkbox"][name*="terms" i]',
      'input[type="checkbox"][name*="agree" i]',
      'input[type="checkbox"][name*="accept" i]',
      'input[type="checkbox"][name*="tos" i]',
      'input[type="checkbox"][name*="consent" i]',
      'input[type="checkbox"][name*="policy" i]',
      'input[type="checkbox"][id*="terms" i]',
      'input[type="checkbox"][id*="agree" i]',
      'input[type="checkbox"][id*="accept" i]',
      'input[type="checkbox"][id*="tos" i]',
      'input[type="checkbox"][id*="consent" i]',
    ];
    for (const selector of tosSelectors) {
      try {
        const checkbox = page.locator(selector).first();
        if (await checkbox.count() > 0 && await checkbox.isVisible({ timeout: 500 })) {
          if (!await checkbox.isChecked()) {
            await checkbox.check();
            console.log('[AutoRegister] Checked terms checkbox');
          }
        }
      } catch { /* next */ }
    }

    // Also try clicking labels that are styled as checkboxes (custom UI)
    try {
      const tosLabel = page.locator('label:has(input[type="checkbox"])').filter({ hasText: /terms|agree|accept|policy|consent/i }).first();
      if (await tosLabel.count() > 0 && await tosLabel.isVisible({ timeout: 500 })) {
        const checkbox = tosLabel.locator('input[type="checkbox"]').first();
        if (await checkbox.count() > 0 && !await checkbox.isChecked()) {
          await tosLabel.click();
          console.log('[AutoRegister] Clicked terms label');
        }
      }
    } catch { /* no styled TOS */ }

    // Return true if at least email and one password field were filled
    return fieldsFilledCount >= 2;
  } catch (error) {
    console.error('[AutoRegister] Error filling form:', error);
    return false;
  }
}

// ========================================
// Password Strength Handling
// ========================================

/**
 * Check for "weak"/"too short" password indicators and re-fill with longer password if needed.
 */
async function handlePasswordStrength(page: Page, currentPassword: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const isWeak = await page.evaluate(() => {
      const indicators = document.querySelectorAll(
        '[class*="password-strength"], [class*="strength-meter"], [class*="password-meter"], ' +
        '[class*="weak"], [class*="too-short"], [class*="password-error"]'
      );
      for (const el of Array.from(indicators)) {
        const text = (el as HTMLElement).innerText?.toLowerCase() || '';
        const classes = el.className?.toString()?.toLowerCase() || '';
        if (/weak|too\s*short|very\s*weak|not\s*strong/i.test(text + ' ' + classes)) {
          return true;
        }
      }
      return false;
    });

    if (!isWeak) break;

    // Generate a longer password and re-fill
    console.log(`[AutoRegister] Password strength too weak (attempt ${attempt + 1}), regenerating...`);
    const longerPassword = generateStrongPassword() + randomUUID().slice(0, 4);

    const passwordFields = await page.locator('input[type="password"]').all();
    for (const field of passwordFields) {
      try {
        if (await field.isVisible({ timeout: 500 })) {
          await humanType(page, field, longerPassword);
        }
      } catch { /* skip */ }
    }

    await page.waitForTimeout(500);
  }
}

// ========================================
// Form Submission
// ========================================

/**
 * Submit the registration form.
 */
async function submitRegistrationForm(page: Page): Promise<boolean> {
  try {
    // ── 1. Standard submit buttons ──
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0 && await submitButton.isVisible({ timeout: 500 })) {
      await humanClick(page, submitButton);
      return true;
    }

    // ── 2. input[type="submit"] ──
    const submitInput = page.locator('input[type="submit"]').first();
    if (await submitInput.count() > 0 && await submitInput.isVisible({ timeout: 500 })) {
      await humanClick(page, submitInput);
      return true;
    }

    // ── 3. Buttons with specific text ──
    const textPatterns = [
      /^sign\s*up$/i, /^register$/i, /^create\s*(an?\s*)?account$/i,
      /^join$/i, /^join\s*(now|free)$/i, /^submit$/i,
      /^get\s*started$/i, /^start\s*(free\s*)?trial$/i,
      /^continue$/i, /^next$/i,
      /^s'inscrire$/i, /^registrar$/i, /^registrieren$/i,
      /^registrati$/i, /^registreren$/i, /^cadastrar$/i,
    ];
    for (const pattern of textPatterns) {
      try {
        const button = page.getByRole('button', { name: pattern }).first();
        if (await button.count() > 0 && await button.isVisible({ timeout: 500 })) {
          await humanClick(page, button);
          return true;
        }
      } catch { /* next */ }
    }

    // ── 4. Generic buttons without type (default submit in forms) ──
    try {
      const genericBtn = page.locator('form button:not([type])').first();
      if (await genericBtn.count() > 0 && await genericBtn.isVisible({ timeout: 500 })) {
        await humanClick(page, genericBtn);
        return true;
      }
    } catch { /* no generic button */ }

    // ── 5. Link-styled submit buttons ──
    for (const pattern of textPatterns.slice(0, 4)) {
      try {
        const link = page.getByRole('link', { name: pattern }).first();
        if (await link.count() > 0 && await link.isVisible({ timeout: 500 })) {
          await humanClick(page, link);
          return true;
        }
      } catch { /* next */ }
    }

    // ── 6. Last resort: press Enter on the last password field ──
    try {
      const lastPassword = page.locator('input[type="password"]').last();
      if (await lastPassword.count() > 0 && await lastPassword.isVisible({ timeout: 500 })) {
        await lastPassword.press('Enter');
        return true;
      }
    } catch { /* no password field */ }

    return false;
  } catch (error) {
    console.error('[AutoRegister] Error submitting form:', error);
    return false;
  }
}

// ========================================
// Detection Helpers
// ========================================

/**
 * Detect CAPTCHA on the page.
 */
async function detectCaptcha(page: Page): Promise<boolean> {
  try {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      'iframe[src*="turnstile"]',
      'iframe[src*="challenges.cloudflare"]',
      '.g-recaptcha',
      '.h-captcha',
      '.cf-turnstile',
      '[id*="captcha" i]',
      '[class*="captcha" i]',
      '[class*="recaptcha" i]',
      '[class*="hcaptcha" i]',
      '[class*="turnstile" i]',
    ];

    for (const selector of captchaSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log('[AutoRegister] CAPTCHA detected:', selector);
          return true;
        }
      } catch { /* next */ }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect email verification requirement.
 */
async function detectEmailVerification(page: Page): Promise<boolean> {
  try {
    const bodyText = await page.evaluate(() => (document.body?.innerText || '').toLowerCase().slice(0, 5000));
    const verificationPhrases = [
      'verify your email',
      'check your email',
      'check your inbox',
      'verification link',
      'confirm your email',
      'confirmation email',
      'activation link',
      'activation email',
      'verification code',
      'verify your account',
      'confirm your account',
      'we sent you an email',
      'we\'ve sent you an email',
      'email has been sent',
      'please check your email',
      'check your mail',
      // Internationalized
      'vérifiez votre email',         // French
      'confirme tu correo',           // Spanish
      'bestätige deine e-mail',       // German
      'verifica la tua email',        // Italian
      'bevestig je e-mail',           // Dutch
      'verifique seu email',          // Portuguese
    ];

    for (const phrase of verificationPhrases) {
      if (bodyText.includes(phrase)) {
        console.log('[AutoRegister] Email verification detected:', phrase);
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect successful registration.
 */
async function detectRegistrationSuccess(page: Page, loginUrl: string, signupUrl: string): Promise<boolean> {
  try {
    const currentUrl = page.url().toLowerCase();
    const signupLower = signupUrl.toLowerCase();

    // Check if URL changed away from signup page
    const stillOnSignup =
      currentUrl === signupLower ||
      currentUrl.includes('signup') ||
      currentUrl.includes('sign-up') ||
      currentUrl.includes('sign_up') ||
      currentUrl.includes('register') ||
      currentUrl.includes('registration') ||
      currentUrl.includes('create-account') ||
      currentUrl.includes('create_account') ||
      currentUrl.includes('inscription') ||
      currentUrl.includes('registro') ||
      currentUrl.includes('registrierung');

    if (!stillOnSignup && currentUrl !== loginUrl.toLowerCase()) {
      console.log('[AutoRegister] URL changed away from signup - likely successful');
      return true;
    }

    // Check for post-registration URL patterns
    if (/\/(dashboard|welcome|onboarding|getting-started|account|profile|home|verify|confirm)/i.test(currentUrl)) {
      console.log('[AutoRegister] Redirected to post-registration page');
      return true;
    }

    // Check page content for success indicators
    const bodyText = await page.evaluate(() => (document.body?.innerText || '').toLowerCase().slice(0, 5000));
    const successPhrases = [
      'welcome',
      'account created',
      'successfully registered',
      'registration complete',
      'registration successful',
      'thank you for registering',
      'thank you for signing up',
      'thanks for signing up',
      'account has been created',
      'you\'re all set',
      'you are all set',
      'get started',
      'your account is ready',
      'bienvenue',                // French
      'bienvenido',               // Spanish
      'willkommen',               // German
      'benvenuto',                // Italian
    ];

    for (const phrase of successPhrases) {
      if (bodyText.includes(phrase)) {
        console.log('[AutoRegister] Success phrase detected:', phrase);
        return true;
      }
    }

    // Check for logout/user menu (indicates logged in)
    const hasPostLoginIndicators = await page.evaluate(() => {
      return !!(
        document.querySelector('a[href*="logout"], a[href*="signout"], a[href*="sign-out"]') ||
        document.querySelector('[class*="avatar"], [class*="user-menu"], [class*="account-menu"]') ||
        document.querySelector('[class*="logged-in"], [class*="authenticated"]')
      );
    });

    if (hasPostLoginIndicators) {
      console.log('[AutoRegister] Post-login UI indicators detected');
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect form error messages.
 */
async function detectFormError(page: Page): Promise<string | null> {
  try {
    return await page.evaluate(() => {
      const errorSelectors = [
        '.error:not(style):not(script)',
        '.alert-danger',
        '.alert-error',
        '[role="alert"]',
        '.form-error',
        '.error-message',
        '.field-error',
        '.invalid-feedback',
        '[class*="error-msg"]',
        '[class*="error-text"]',
        '[class*="form-error"]',
        '[class*="validation-error"]',
        '[class*="field-error"]',
      ];

      for (const selector of errorSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const htmlEl = el as HTMLElement;
          if (htmlEl.offsetParent !== null) { // visible check
            const text = htmlEl.innerText?.trim();
            if (text && text.length > 0 && text.length < 300) {
              return text;
            }
          }
        }
      }

      return null;
    });
  } catch {
    return null;
  }
}
