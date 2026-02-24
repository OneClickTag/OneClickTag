import { chromium, Browser, Page } from 'playwright';
import { randomUUID } from 'crypto';

interface AutoRegisterResult {
  success: boolean;
  credentials?: { email: string; password: string };
  error?: string;
  needsEmailVerification?: boolean;
}

/**
 * Attempt to auto-register a test account on the target website.
 *
 * Process:
 * 1. Navigate to the login page
 * 2. Find signup/register link
 * 3. Navigate to signup page
 * 4. Fill out registration form
 * 5. Submit and verify success
 */
export async function autoRegisterAccount(
  loginUrl: string,
  websiteUrl: string,
): Promise<AutoRegisterResult> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Generate test credentials
    const uuid = randomUUID().slice(0, 8);
    const email = `scanner-${uuid}@oneclicktag-test.com`;
    const password = `Test${randomUUID().slice(0, 12)}!`;

    console.log('[AutoRegister] Starting auto-registration for:', websiteUrl);
    console.log('[AutoRegister] Generated email:', email);

    // Step 1: Navigate to login page
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 20000 });
    console.log('[AutoRegister] Navigated to login page:', loginUrl);

    // Step 2: Find signup link
    const signupLink = await findSignupLink(page);
    if (!signupLink) {
      return { success: false, error: 'Could not find a signup/register link on the login page' };
    }
    console.log('[AutoRegister] Found signup link:', signupLink);

    // Step 3: Navigate to signup page
    await page.goto(signupLink, { waitUntil: 'networkidle', timeout: 20000 });
    console.log('[AutoRegister] Navigated to signup page');

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

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for CAPTCHA
    const hasCaptcha = await detectCaptcha(page);
    if (hasCaptcha) {
      return { success: false, error: 'CAPTCHA detected - cannot auto-register' };
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
    const isSuccess = await detectRegistrationSuccess(page, loginUrl);

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

/**
 * Find signup/register link on the login page
 */
async function findSignupLink(page: Page): Promise<string | null> {
  try {
    // Try common href patterns
    const hrefPatterns = [
      'a[href*="signup"]',
      'a[href*="sign-up"]',
      'a[href*="register"]',
      'a[href*="create-account"]',
      'a[href*="join"]',
    ];

    for (const pattern of hrefPatterns) {
      const link = await page.locator(pattern).first();
      if (await link.count() > 0) {
        const href = await link.getAttribute('href');
        if (href) {
          // Make absolute URL if relative
          const url = new URL(href, page.url());
          return url.toString();
        }
      }
    }

    // Try text-based matching
    const textPatterns = ['Sign Up', 'Register', 'Create Account', 'Get Started', 'Join'];
    for (const text of textPatterns) {
      const link = page.getByRole('link', { name: new RegExp(text, 'i') }).first();
      if (await link.count() > 0) {
        const href = await link.getAttribute('href');
        if (href) {
          const url = new URL(href, page.url());
          return url.toString();
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[AutoRegister] Error finding signup link:', error);
    return null;
  }
}

/**
 * Fill registration form fields
 */
async function fillRegistrationForm(page: Page, email: string, password: string): Promise<boolean> {
  try {
    let fieldsFilledCount = 0;

    // Fill email field
    const emailSelectors = [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      'input[placeholder*="email" i]',
    ];
    for (const selector of emailSelectors) {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible()) {
        await field.fill(email);
        fieldsFilledCount++;
        console.log('[AutoRegister] Filled email field');
        break;
      }
    }

    // Fill password fields (including confirmation)
    const passwordSelectors = [
      'input[type="password"]',
      'input[name*="password" i]',
      'input[id*="password" i]',
    ];
    const passwordFields = await page.locator(passwordSelectors.join(', ')).all();
    for (const field of passwordFields) {
      if (await field.isVisible()) {
        await field.fill(password);
        fieldsFilledCount++;
        console.log('[AutoRegister] Filled password field');
      }
    }

    // Fill name fields if present
    const firstNameSelectors = [
      'input[name*="first" i]',
      'input[name*="name" i]',
      'input[id*="firstname" i]',
      'input[placeholder*="first name" i]',
    ];
    for (const selector of firstNameSelectors) {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible()) {
        await field.fill('Test');
        console.log('[AutoRegister] Filled first name field');
        break;
      }
    }

    const lastNameSelectors = [
      'input[name*="last" i]',
      'input[id*="lastname" i]',
      'input[placeholder*="last name" i]',
    ];
    for (const selector of lastNameSelectors) {
      const field = page.locator(selector).first();
      if (await field.count() > 0 && await field.isVisible()) {
        await field.fill('Scanner');
        console.log('[AutoRegister] Filled last name field');
        break;
      }
    }

    // Check terms of service checkbox
    const tosSelectors = [
      'input[type="checkbox"][name*="terms" i]',
      'input[type="checkbox"][name*="agree" i]',
      'input[type="checkbox"][id*="terms" i]',
      'input[type="checkbox"][id*="agree" i]',
    ];
    for (const selector of tosSelectors) {
      const checkbox = page.locator(selector).first();
      if (await checkbox.count() > 0 && await checkbox.isVisible()) {
        await checkbox.check();
        console.log('[AutoRegister] Checked terms checkbox');
      }
    }

    // Return true if at least email and one password field were filled
    return fieldsFilledCount >= 2;
  } catch (error) {
    console.error('[AutoRegister] Error filling form:', error);
    return false;
  }
}

/**
 * Submit the registration form
 */
async function submitRegistrationForm(page: Page): Promise<boolean> {
  try {
    // Try button[type="submit"]
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0 && await submitButton.isVisible()) {
      await submitButton.click();
      return true;
    }

    // Try buttons with specific text
    const textPatterns = ['Sign Up', 'Register', 'Create Account', 'Join', 'Submit'];
    for (const text of textPatterns) {
      const button = page.getByRole('button', { name: new RegExp(text, 'i') }).first();
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click();
        return true;
      }
    }

    // Try input[type="submit"]
    const submitInput = page.locator('input[type="submit"]').first();
    if (await submitInput.count() > 0 && await submitInput.isVisible()) {
      await submitInput.click();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[AutoRegister] Error submitting form:', error);
    return false;
  }
}

/**
 * Detect CAPTCHA on the page
 */
async function detectCaptcha(page: Page): Promise<boolean> {
  try {
    // Check for reCAPTCHA and hCaptcha iframes
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.g-recaptcha',
      '.h-captcha',
      '[id*="captcha" i]',
      '[class*="captcha" i]',
    ];

    for (const selector of captchaSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        console.log('[AutoRegister] CAPTCHA detected:', selector);
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Detect email verification requirement
 */
async function detectEmailVerification(page: Page): Promise<boolean> {
  try {
    const content = await page.content();
    const verificationPhrases = [
      'verify your email',
      'check your email',
      'verification link',
      'confirm your email',
      'activation link',
      'verification code',
    ];

    const lowerContent = content.toLowerCase();
    for (const phrase of verificationPhrases) {
      if (lowerContent.includes(phrase)) {
        console.log('[AutoRegister] Email verification detected:', phrase);
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Detect successful registration
 */
async function detectRegistrationSuccess(page: Page, loginUrl: string): Promise<boolean> {
  try {
    const currentUrl = page.url();

    // Check if URL changed away from signup page (redirected to dashboard/home)
    if (!currentUrl.includes('signup') &&
        !currentUrl.includes('register') &&
        !currentUrl.includes('sign-up') &&
        currentUrl !== loginUrl) {
      console.log('[AutoRegister] URL changed - likely successful');
      return true;
    }

    // Check page content for success indicators
    const content = await page.content();
    const successPhrases = [
      'welcome',
      'dashboard',
      'account created',
      'successfully',
      'registration complete',
    ];

    const lowerContent = content.toLowerCase();
    for (const phrase of successPhrases) {
      if (lowerContent.includes(phrase)) {
        console.log('[AutoRegister] Success phrase detected:', phrase);
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Detect form error messages
 */
async function detectFormError(page: Page): Promise<string | null> {
  try {
    const errorSelectors = [
      '.error',
      '.alert-danger',
      '[role="alert"]',
      '.form-error',
      '.error-message',
      '[class*="error" i]',
    ];

    for (const selector of errorSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        if (await element.isVisible()) {
          const text = await element.textContent();
          if (text && text.trim()) {
            console.log('[AutoRegister] Error message detected:', text);
            return text.trim();
          }
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
