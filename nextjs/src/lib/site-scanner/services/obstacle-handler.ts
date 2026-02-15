import { Page } from 'playwright-core';

export interface ObstacleResult {
  dismissed: number;
  obstacles: Array<{
    type: string;
    selector: string;
    action: string;
  }>;
}

const COOKIE_ACCEPT_SELECTORS = [
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
  '.js-accept-cookies',
  '.accept-cookies-button',
];

const POPUP_CLOSE_SELECTORS = [
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
  'button:has-text("\\u00d7")',
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

const AGE_VERIFY_SELECTORS = [
  'button:has-text("I am over 18")',
  'button:has-text("I am 18")',
  'button:has-text("Yes, I am")',
  'button:has-text("Enter")',
  "button:has-text(\"I'm over 21\")",
  '[data-age-gate-accept]',
];

export async function dismissObstacles(page: Page): Promise<ObstacleResult> {
  const result: ObstacleResult = { dismissed: 0, obstacles: [] };

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
        break;
      }
    } catch {
      // Continue
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

  // 3. Detect and dismiss overlay popups
  await dismissOverlayPopups(page, result);

  return result;
}

async function dismissOverlayPopups(page: Page, result: ObstacleResult): Promise<void> {
  try {
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
          // Continue
        }
      }
    }
  } catch {
    // Overlay detection failed, continue
  }
}
