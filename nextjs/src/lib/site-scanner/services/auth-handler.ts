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

    const form = passwordField?.closest('form');

    let usernameField: HTMLInputElement | null = null;
    if (form) {
      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="checkbox"])');
      usernameField = (inputs[0] as HTMLInputElement) || null;
    } else {
      usernameField = document.querySelector(
        'input[type="email"], input[name*="email"], input[name*="user"], input[name*="login"], input[autocomplete="username"], input[autocomplete="email"]'
      ) as HTMLInputElement | null;
    }

    let submitBtn: Element | null = null;
    if (form) {
      submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
    }

    const buildSelector = (el: Element | null): string | null => {
      if (!el) return null;
      if (el.id) return `#${el.id}`;
      if (el.getAttribute('name')) return `[name="${el.getAttribute('name')}"]`;
      if (el.getAttribute('type') === 'password') return 'input[type="password"]';
      if (el.getAttribute('type') === 'email') return 'input[type="email"]';
      if (el.getAttribute('autocomplete')) return `[autocomplete="${el.getAttribute('autocomplete')}"]`;
      return null;
    };

    const hasCaptcha = !!(
      document.querySelector('[class*="captcha"], [id*="captcha"], [class*="recaptcha"], [id*="recaptcha"]') ||
      document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]')
    );

    const hasOAuth = !!(
      document.querySelector('[class*="google"], [class*="facebook"], [class*="github"], [class*="oauth"]') ||
      document.querySelector('a[href*="oauth"], a[href*="google"], a[href*="facebook"]')
    );

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
    if (loginInfo.hasCaptcha) {
      return { success: false, requiresCaptcha: true, error: 'CAPTCHA detected - cannot auto-login' };
    }

    const usernameSelector = loginInfo.usernameSelector || 'input[type="email"], input[name*="email"], input[name*="user"]';
    const passwordSelector = loginInfo.passwordSelector || 'input[type="password"]';
    const submitSelector = loginInfo.submitSelector || 'button[type="submit"], input[type="submit"], button:not([type])';

    const usernameEl = page.locator(usernameSelector).first();
    await usernameEl.waitFor({ state: 'visible', timeout: 5000 });
    await usernameEl.fill(username);
    await page.waitForTimeout(300);

    const passwordEl = page.locator(passwordSelector).first();
    await passwordEl.waitFor({ state: 'visible', timeout: 5000 });
    await passwordEl.fill(password);
    await page.waitForTimeout(300);

    const currentUrl = page.url();
    const submitBtn = page.locator(submitSelector).first();
    await submitBtn.click();

    try {
      await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 10000 });
    } catch {
      // URL might not change (SPA)
    }

    await page.waitForTimeout(2000);

    const loginSuccess = await verifyLoginSuccess(page);

    if (loginSuccess) {
      return { success: true, redirectUrl: page.url() };
    }

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
    const mfaInput = page.locator(
      'input[name*="otp"], input[name*="code"], input[name*="mfa"], input[name*="token"], input[type="tel"][maxlength="6"], input[autocomplete="one-time-code"]'
    ).first();

    await mfaInput.waitFor({ state: 'visible', timeout: 5000 });
    await mfaInput.fill(code);
    await page.waitForTimeout(300);

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

async function verifyLoginSuccess(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const url = window.location.href.toLowerCase();

    if (/\/(login|signin|sign-in|auth)/.test(url)) {
      const hasError = !!document.querySelector(
        '[class*="error"], [class*="alert-danger"], [class*="invalid"], [role="alert"]'
      );
      if (hasError) return false;
    }

    const hasLogout = !!(
      document.querySelector('a[href*="logout"], a[href*="signout"]') ||
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
