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
 */
export async function simulateInteractions(page: Page): Promise<InteractionResult> {
  const result: InteractionResult = {
    interactions: 0,
    scrollableHeight: 0,
    lazyLoadedElements: 0,
    expandedSections: 0,
    discoveredUrls: [],
  };

  await scrollFullPage(page, result);
  await expandCollapsedSections(page, result);
  await clickTabs(page, result);
  await clickLoadMoreButtons(page, result);
  await hoverNavItems(page, result);
  await collectNewUrls(page, result);

  return result;
}

async function scrollFullPage(page: Page, result: InteractionResult): Promise<void> {
  try {
    const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    let currentScroll = 0;
    let previousHeight = initialHeight;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20;

    while (scrollAttempts < maxScrollAttempts) {
      currentScroll += viewportHeight * 0.8;
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), currentScroll);
      await page.waitForTimeout(800);
      result.interactions++;

      const newHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      if (newHeight > previousHeight) {
        result.lazyLoadedElements++;
        previousHeight = newHeight;
      }

      if (currentScroll >= newHeight) break;
      scrollAttempts++;
    }

    result.scrollableHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
  } catch {
    // Scroll failed, continue
  }
}

async function expandCollapsedSections(page: Page, result: InteractionResult): Promise<void> {
  try {
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
        const maxExpand = Math.min(count, 10);

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
            // Element not clickable
          }
        }
      } catch {
        // Selector failed
      }
    }
  } catch {
    // Expansion failed
  }
}

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
            // Tab not clickable
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
    const maxClicks = 5;

    for (const selector of loadMoreSelectors) {
      while (clickCount < maxClicks) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 500 })) {
            await btn.click({ timeout: 2000 });
            result.interactions++;
            clickCount++;
            await page.waitForTimeout(1500);
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
              await page.waitForTimeout(400);
            }
          } catch {
            // Hover failed
          }
        }

        if (count > 0) break;
      } catch {
        // Selector failed
      }
    }
  } catch {
    // Navigation hover failed
  }
}

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
