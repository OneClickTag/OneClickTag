/**
 * Human Interaction — Realistic typing, clicking, scrolling, and SPA-compatible form filling.
 *
 * These utilities make automated interactions indistinguishable from human behaviour,
 * defeating bot-detection heuristics that look at keystroke cadence, mouse paths, etc.
 */

import { Page, Locator } from 'playwright-core';

// ========================================
// Random Delay
// ========================================

/** Wait a random duration between min and max (ms). */
export async function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// Human-Like Typing
// ========================================

/**
 * Type text into a locator with realistic keystroke cadence.
 *
 * - Moves mouse to element first
 * - Clicks to focus
 * - Clears via Ctrl+A → Backspace (not .fill(''))
 * - Types character-by-character with variable delays
 * - Includes micro-pauses and thinking pauses
 */
export async function humanType(
  page: Page,
  locator: Locator,
  text: string,
): Promise<void> {
  // Scroll into view if needed
  await scrollToElement(page, locator);

  // Move mouse and click to focus
  await humanClick(page, locator);

  // Clear existing value with Ctrl+A → Backspace
  await page.keyboard.press('Control+a');
  await randomDelay(50, 120);
  await page.keyboard.press('Backspace');
  await randomDelay(80, 200);

  // Type character-by-character
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Base delay: 45-165ms per char
    let delay = 45 + Math.random() * 120;

    // Uppercase/special chars take a bit longer
    if (char !== char.toLowerCase() || /[!@#$%^&*()_+{}|:"<>?]/.test(char)) {
      delay += 30 + Math.random() * 20;
    }

    // 15% chance of micro-pause every few chars
    if (i > 0 && i % (3 + Math.floor(Math.random() * 4)) === 0 && Math.random() < 0.15) {
      await randomDelay(200, 600);
    }

    // 5% chance of thinking pause
    if (Math.random() < 0.05) {
      await randomDelay(500, 1200);
    }

    await page.keyboard.press(char);
    await randomDelay(Math.floor(delay), Math.floor(delay * 1.3));
  }
}

// ========================================
// Human-Like Click
// ========================================

/**
 * Click an element with realistic mouse movement.
 *
 * - Gets bounding box
 * - Targets a random point within the element (not center)
 * - Moves mouse with intermediate steps
 * - Small delays before/after click
 */
export async function humanClick(
  page: Page,
  locator: Locator,
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) {
    // Fallback to standard click if no bounding box
    await locator.click();
    return;
  }

  // Target a random point within the element (avoid exact center)
  const targetX = box.x + box.width * (0.2 + Math.random() * 0.6);
  const targetY = box.y + box.height * (0.2 + Math.random() * 0.6);

  // Get current mouse position (start from a reasonable spot if unknown)
  const steps = 8 + Math.floor(Math.random() * 13); // 8-20 steps

  // Move mouse with intermediate steps
  await page.mouse.move(targetX, targetY, { steps });

  // Small delay before click
  await randomDelay(50, 200);

  await page.mouse.click(targetX, targetY);

  // Small delay after click
  await randomDelay(100, 400);
}

// ========================================
// Human Delay
// ========================================

/**
 * Wait a human-like delay based on category.
 */
export async function humanDelay(
  type: 'short' | 'medium' | 'long',
): Promise<void> {
  switch (type) {
    case 'short':
      await randomDelay(100, 400);
      break;
    case 'medium':
      await randomDelay(300, 900);
      break;
    case 'long':
      await randomDelay(800, 2000);
      break;
  }
}

// ========================================
// Scroll to Element
// ========================================

/**
 * Smoothly scroll to make an element visible.
 * Only scrolls if the element is below 80% of the viewport.
 */
export async function scrollToElement(
  page: Page,
  locator: Locator,
): Promise<void> {
  try {
    const box = await locator.boundingBox();
    if (!box) return;

    const viewport = page.viewportSize();
    if (!viewport) return;

    const threshold = viewport.height * 0.8;

    if (box.y > threshold || box.y < 0) {
      // Scroll in increments for a smoother look
      const targetScroll = box.y - viewport.height * 0.3;
      const currentScroll = await page.evaluate(() => window.scrollY);
      const distance = targetScroll - currentScroll;
      const stepCount = 5 + Math.floor(Math.random() * 5);
      const stepSize = distance / stepCount;

      for (let i = 0; i < stepCount; i++) {
        await page.evaluate((scrollBy) => window.scrollBy(0, scrollBy), stepSize);
        await randomDelay(50, 150);
      }

      // Final settle
      await randomDelay(100, 300);
    }
  } catch {
    // Scroll failure is non-fatal — element might already be visible
  }
}

// ========================================
// SPA-Compatible Fill
// ========================================

/**
 * Fill a field in a way that works with React, Vue, Angular, etc.
 *
 * Uses the native HTMLInputElement value setter to bypass React's tracked value,
 * then dispatches the full event sequence: focus → input → change → blur.
 * This ensures framework state updates even when .fill() doesn't trigger them.
 */
export async function spaFill(
  page: Page,
  locator: Locator,
  value: string,
): Promise<void> {
  await locator.evaluate((el: HTMLInputElement, val: string) => {
    // Use native setter to bypass React's controlled value tracking
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(el, val);
    } else {
      el.value = val;
    }

    // Dispatch full event sequence (all bubbling) for framework state sync
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }, value);
}

// ========================================
// Field Detection by Label
// ========================================

/**
 * Find an input field by its label text (works with MUI, Ant Design, shadcn, etc.).
 * Tries Playwright's getByLabel first, then falls back to aria-label.
 */
export async function findFieldByLabel(
  page: Page,
  labelPatterns: RegExp[],
): Promise<Locator | null> {
  for (const pattern of labelPatterns) {
    try {
      // Playwright's getByLabel handles standard <label for="..."> and aria-labelledby
      const field = page.getByLabel(pattern).first();
      if (await field.count() > 0 && await field.isVisible({ timeout: 500 })) {
        return field;
      }
    } catch { /* next */ }

    try {
      // Fallback: aria-label attribute
      const ariaField = page.locator(`input[aria-label]`).filter({ hasText: pattern }).first();
      if (await ariaField.count() > 0 && await ariaField.isVisible({ timeout: 500 })) {
        return ariaField;
      }
    } catch { /* next */ }
  }

  return null;
}
