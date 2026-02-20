import { test, expect, type Page } from 'playwright/test';

/**
 * Cookie Consent & Google Consent Mode V2 — Deep Verification Tests
 *
 * These tests verify that when a user selects cookie preferences, the
 * Google Consent Mode V2 signals (dataLayer / gtag) are set correctly,
 * localStorage persists values, and subsequent page loads honour them.
 */

const STORAGE_KEY = 'oct_cookie_consent';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear cookie consent from localStorage and reload the page fresh. */
async function loadFresh(page: Page) {
  await page.goto('/');
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.evaluate(() => localStorage.removeItem('oct_anonymous_id'));
  await page.goto('/');
  // Banner has a 500ms delay + animation
  await page.waitForTimeout(1500);
}

/** Read the full dataLayer array from the page. */
async function getDataLayer(page: Page): Promise<Record<string, unknown>[]> {
  return page.evaluate(() => {
    return (window as any).dataLayer?.map((entry: any) => {
      // dataLayer entries pushed via gtag() are stored as Arguments objects
      // with numeric keys; convert them to a plain object.
      if (typeof entry === 'object' && '0' in entry) {
        return Object.fromEntries(
          Object.keys(entry).map((k) => [k, entry[k]]),
        );
      }
      return entry;
    }) ?? [];
  });
}

/** Find all consent-related entries in the dataLayer. */
function filterConsentEntries(dataLayer: Record<string, unknown>[]) {
  return dataLayer.filter(
    (e) => e['0'] === 'consent',
  );
}

/** Find the last consent 'default' or 'update' entry. */
function findLastConsent(dataLayer: Record<string, unknown>[], type: 'default' | 'update') {
  const entries = filterConsentEntries(dataLayer).filter((e) => e['1'] === type);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

/** Get stored consent from localStorage. */
async function getStoredConsent(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

/** Wait for the cookie banner to be visible. */
async function waitForBanner(page: Page) {
  // The banner renders a heading with the consent text
  await page.waitForSelector('text=We value your privacy', { timeout: 5000 }).catch(() => {
    // Fallback: banner text may be customised, look for the Accept button
  });
  await page.waitForTimeout(500); // animation settle
}

// ---------------------------------------------------------------------------
// Scenario 1: Fresh visit — no prior consent
// ---------------------------------------------------------------------------
test.describe('Scenario 1: Fresh visit (no prior consent)', () => {
  test('sets consent defaults to denied with wait_for_update', async ({ page }) => {
    await loadFresh(page);

    const dataLayer = await getDataLayer(page);
    const defaultEntry = findLastConsent(dataLayer, 'default');

    expect(defaultEntry).not.toBeNull();

    const consentState = defaultEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('denied');
    expect(consentState.ad_storage).toBe('denied');
    expect(consentState.ad_user_data).toBe('denied');
    expect(consentState.ad_personalization).toBe('denied');
    expect(consentState.functionality_storage).toBe('granted');
    expect(consentState.security_storage).toBe('granted');
    expect(consentState.wait_for_update).toBe(500);
  });

  test('cookie banner appears', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    // Look for Accept All button
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    await expect(acceptBtn).toBeVisible();

    // Look for Reject All button
    const rejectBtn = page.getByRole('button', { name: /reject all/i });
    await expect(rejectBtn).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Accept All
// ---------------------------------------------------------------------------
test.describe('Scenario 2: Accept All', () => {
  test('grants all consent signals after clicking Accept All', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    // Click Accept All
    await page.getByRole('button', { name: /accept all/i }).click();
    await page.waitForTimeout(500);

    // Verify dataLayer got a consent update with everything granted
    const dataLayer = await getDataLayer(page);
    const updateEntry = findLastConsent(dataLayer, 'update');

    expect(updateEntry).not.toBeNull();
    const consentState = updateEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('granted');
    expect(consentState.ad_storage).toBe('granted');
    expect(consentState.ad_user_data).toBe('granted');
    expect(consentState.ad_personalization).toBe('granted');
  });

  test('stores consent in localStorage with correct values', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /accept all/i }).click();
    await page.waitForTimeout(500);

    const stored = await getStoredConsent(page);
    expect(stored).not.toBeNull();
    expect(stored.necessary).toBe(true);
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(true);
    expect(stored.timestamp).toBeGreaterThan(0);
  });

  test('pushes consent_updated event to dataLayer', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /accept all/i }).click();
    await page.waitForTimeout(500);

    const dataLayer = await getDataLayer(page);
    const consentEvent = dataLayer.find(
      (e) => e.event === 'consent_updated',
    );

    expect(consentEvent).toBeDefined();
    expect(consentEvent!.analytics_storage).toBe('granted');
    expect(consentEvent!.ad_storage).toBe('granted');
  });

  test('banner disappears after accepting', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /accept all/i }).click();
    // Wait for close animation
    await page.waitForTimeout(600);

    // Banner text should no longer be visible
    await expect(
      page.getByText('We value your privacy'),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Reject All
// ---------------------------------------------------------------------------
test.describe('Scenario 3: Reject All', () => {
  test('denies all consent signals after clicking Reject All', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /reject all/i }).click();
    await page.waitForTimeout(500);

    const dataLayer = await getDataLayer(page);
    const updateEntry = findLastConsent(dataLayer, 'update');

    expect(updateEntry).not.toBeNull();
    const consentState = updateEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('denied');
    expect(consentState.ad_storage).toBe('denied');
    expect(consentState.ad_user_data).toBe('denied');
    expect(consentState.ad_personalization).toBe('denied');
  });

  test('stores rejection in localStorage', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /reject all/i }).click();
    await page.waitForTimeout(500);

    const stored = await getStoredConsent(page);
    expect(stored).not.toBeNull();
    expect(stored.necessary).toBe(true);
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
  });

  test('pushes consent_updated event with denied values', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /reject all/i }).click();
    await page.waitForTimeout(500);

    const dataLayer = await getDataLayer(page);
    const consentEvent = dataLayer.find(
      (e) => e.event === 'consent_updated',
    );

    expect(consentEvent).toBeDefined();
    expect(consentEvent!.analytics_storage).toBe('denied');
    expect(consentEvent!.ad_storage).toBe('denied');
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Custom preferences
// ---------------------------------------------------------------------------
test.describe('Scenario 4: Custom preferences', () => {
  test('analytics only — analytics granted, marketing denied', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    // Open customize section
    await page.getByRole('button', { name: /customize/i }).click();
    await page.waitForTimeout(400);

    // Find all non-disabled checkboxes (analytics and marketing)
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    const count = await checkboxes.count();

    // Enable analytics (first non-disabled checkbox), disable marketing (second)
    // The checkboxes default to unchecked, so we just check analytics
    if (count >= 1) {
      // Check analytics checkbox
      const analyticsCheckbox = checkboxes.nth(0);
      await analyticsCheckbox.check();
    }
    if (count >= 2) {
      // Ensure marketing checkbox is unchecked
      const marketingCheckbox = checkboxes.nth(1);
      await marketingCheckbox.uncheck();
    }

    // Click Save Preferences
    await page.getByRole('button', { name: /save preferences/i }).click();
    await page.waitForTimeout(500);

    const dataLayer = await getDataLayer(page);
    const updateEntry = findLastConsent(dataLayer, 'update');

    expect(updateEntry).not.toBeNull();
    const consentState = updateEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('granted');
    expect(consentState.ad_storage).toBe('denied');

    const stored = await getStoredConsent(page);
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(false);
  });

  test('all non-required categories unchecked — everything denied', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /customize/i }).click();
    await page.waitForTimeout(400);

    // Uncheck all non-disabled checkboxes
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).uncheck();
    }

    await page.getByRole('button', { name: /save preferences/i }).click();
    await page.waitForTimeout(500);

    const dataLayer = await getDataLayer(page);
    const updateEntry = findLastConsent(dataLayer, 'update');

    expect(updateEntry).not.toBeNull();
    const consentState = updateEntry!['2'] as Record<string, string>;
    // With no optional categories checked, analytics should be denied
    expect(consentState.analytics_storage).toBe('denied');
    // Marketing stays denied because no marketing category or it was unchecked
    expect(consentState.ad_storage).toBe('denied');

    const stored = await getStoredConsent(page);
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
  });

  test('all optional categories checked — grants based on available categories', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /customize/i }).click();
    await page.waitForTimeout(400);

    // Fetch actual categories to know what to expect
    const categories = await page.evaluate(() =>
      fetch('/api/public/cookie-banner')
        .then((r) => r.json())
        .then((d) => d.categories.map((c: any) => c.category)),
    );
    const hasAnalytics = categories.includes('ANALYTICS');
    const hasMarketing = categories.includes('MARKETING');

    // Check all non-disabled checkboxes
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await page.getByRole('button', { name: /save preferences/i }).click();
    await page.waitForTimeout(500);

    const dataLayer = await getDataLayer(page);
    const updateEntry = findLastConsent(dataLayer, 'update');

    expect(updateEntry).not.toBeNull();
    const consentState = updateEntry!['2'] as Record<string, string>;

    // Analytics granted only if ANALYTICS category exists and was checked
    expect(consentState.analytics_storage).toBe(hasAnalytics ? 'granted' : 'denied');
    // Marketing granted only if MARKETING category exists and was checked
    expect(consentState.ad_storage).toBe(hasMarketing ? 'granted' : 'denied');

    const stored = await getStoredConsent(page);
    expect(stored.analytics).toBe(hasAnalytics);
    expect(stored.marketing).toBe(hasMarketing);
  });

  test('necessary cookies are always enabled and cannot be unchecked', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    await page.getByRole('button', { name: /customize/i }).click();
    await page.waitForTimeout(400);

    // Necessary checkbox should be checked and disabled
    const necessaryCheckbox = page.locator('input[type="checkbox"][disabled]').first();
    await expect(necessaryCheckbox).toBeChecked();
    await expect(necessaryCheckbox).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Persistence across page loads
// ---------------------------------------------------------------------------
test.describe('Scenario 5: Persistence across page loads', () => {
  test('consent persists and banner does not reappear after accepting', async ({ page }) => {
    // Step 1: Fresh visit — accept all
    await loadFresh(page);
    await waitForBanner(page);
    await page.getByRole('button', { name: /accept all/i }).click();
    await page.waitForTimeout(500);

    // Step 2: Navigate to another page and come back
    await page.goto('/about');
    await page.waitForTimeout(1000);
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Banner should NOT be visible
    await expect(
      page.getByText('We value your privacy'),
    ).not.toBeVisible();

    // Consent defaults should reflect stored "granted" values
    const dataLayer = await getDataLayer(page);
    const defaultEntry = findLastConsent(dataLayer, 'default');

    expect(defaultEntry).not.toBeNull();
    const consentState = defaultEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('granted');
    expect(consentState.ad_storage).toBe('granted');
    // No wait_for_update because consent was already stored
    expect(consentState.wait_for_update).toBeUndefined();
  });

  test('rejected consent persists — defaults stay denied', async ({ page }) => {
    // Step 1: Fresh visit — reject all
    await loadFresh(page);
    await waitForBanner(page);
    await page.getByRole('button', { name: /reject all/i }).click();
    await page.waitForTimeout(500);

    // Step 2: Reload
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Banner should NOT reappear
    await expect(
      page.getByText('We value your privacy'),
    ).not.toBeVisible();

    // Consent defaults should reflect stored "denied" values
    const dataLayer = await getDataLayer(page);
    const defaultEntry = findLastConsent(dataLayer, 'default');

    expect(defaultEntry).not.toBeNull();
    const consentState = defaultEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('denied');
    expect(consentState.ad_storage).toBe('denied');
  });

  test('custom preferences (analytics only) persist across reload', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    // Customize: analytics ON, marketing OFF
    await page.getByRole('button', { name: /customize/i }).click();
    await page.waitForTimeout(400);

    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    if ((await checkboxes.count()) >= 1) await checkboxes.nth(0).check();
    if ((await checkboxes.count()) >= 2) await checkboxes.nth(1).uncheck();

    await page.getByRole('button', { name: /save preferences/i }).click();
    await page.waitForTimeout(500);

    // Reload
    await page.goto('/');
    await page.waitForTimeout(1500);

    const dataLayer = await getDataLayer(page);
    const defaultEntry = findLastConsent(dataLayer, 'default');

    expect(defaultEntry).not.toBeNull();
    const consentState = defaultEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('granted');
    expect(consentState.ad_storage).toBe('denied');
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Consent expiration
// ---------------------------------------------------------------------------
test.describe('Scenario 6: Consent expiration', () => {
  test('banner reappears when stored consent has expired timestamp', async ({ page }) => {
    await page.goto('/');

    // Set an expired consent (timestamp far in the past)
    const expiredConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago
    };

    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: STORAGE_KEY, value: expiredConsent },
    );

    // Reload — the ConsentModeDefaults script should treat this as expired
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Verify consent defaults to denied since stored consent is expired
    const dataLayer = await getDataLayer(page);
    const defaultEntry = findLastConsent(dataLayer, 'default');

    expect(defaultEntry).not.toBeNull();
    const consentState = defaultEntry!['2'] as Record<string, string>;
    expect(consentState.analytics_storage).toBe('denied');
    expect(consentState.ad_storage).toBe('denied');
    // Should have wait_for_update since no valid consent exists
    expect(consentState.wait_for_update).toBe(500);
  });

  test('banner reappears visually when consent expired', async ({ page }) => {
    await page.goto('/');

    const expiredConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now() - 400 * 24 * 60 * 60 * 1000,
    };

    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: STORAGE_KEY, value: expiredConsent },
    );

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Banner should reappear since consent is expired
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    await expect(acceptBtn).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Re-opening cookie settings from footer
// ---------------------------------------------------------------------------
test.describe('Scenario 7: Re-open cookie settings from footer', () => {
  test('clicking Cookie Settings in footer reopens banner with saved preferences', async ({ page }) => {
    // Step 1: Accept all first
    await loadFresh(page);
    await waitForBanner(page);
    await page.getByRole('button', { name: /accept all/i }).click();
    await page.waitForTimeout(600);

    // Banner should be gone
    await expect(
      page.getByText('We value your privacy'),
    ).not.toBeVisible();

    // Step 2: Click Cookie Settings in footer
    await page.getByRole('button', { name: /cookie settings/i }).click();
    await page.waitForTimeout(1000);

    // Banner should reappear with customize expanded
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    await expect(acceptBtn).toBeVisible({ timeout: 5000 });

    // The checkboxes should reflect previously saved preferences (all ON)
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
  });

  test('changing preferences after reopening works correctly', async ({ page }) => {
    // Step 1: Accept all
    await loadFresh(page);
    await waitForBanner(page);
    await page.getByRole('button', { name: /accept all/i }).click();
    await page.waitForTimeout(600);

    // Step 2: Reopen from footer
    await page.getByRole('button', { name: /cookie settings/i }).click();
    await page.waitForTimeout(1000);

    // Step 3: Uncheck the first non-disabled checkbox (analytics)
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Uncheck the first optional category
    await checkboxes.nth(0).uncheck();

    // Step 4: Save
    await page.getByRole('button', { name: /save preferences/i }).click();
    await page.waitForTimeout(500);

    // Verify dataLayer has updated consent
    const dataLayer = await getDataLayer(page);
    const updates = filterConsentEntries(dataLayer).filter((e) => e['1'] === 'update');
    const lastUpdate = updates[updates.length - 1];

    expect(lastUpdate).toBeDefined();
    const consentState = lastUpdate['2'] as Record<string, string>;
    // Analytics should now be denied since we unchecked it
    expect(consentState.analytics_storage).toBe('denied');

    // Verify localStorage was updated
    const stored = await getStoredConsent(page);
    expect(stored.analytics).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bonus: Consent Mode defaults structural validation
// ---------------------------------------------------------------------------
test.describe('Bonus: Structural validation', () => {
  test('url_passthrough is set to true', async ({ page }) => {
    await loadFresh(page);

    const dataLayer = await getDataLayer(page);
    const urlPassthrough = dataLayer.find(
      (e) => e['0'] === 'set' && e['1'] === 'url_passthrough',
    );

    expect(urlPassthrough).toBeDefined();
    expect(urlPassthrough!['2']).toBe(true);
  });

  test('ads_data_redaction is set to true', async ({ page }) => {
    await loadFresh(page);

    const dataLayer = await getDataLayer(page);
    const adsRedaction = dataLayer.find(
      (e) => e['0'] === 'set' && e['1'] === 'ads_data_redaction',
    );

    expect(adsRedaction).toBeDefined();
    expect(adsRedaction!['2']).toBe(true);
  });

  test('functionality_storage and security_storage are always granted', async ({ page }) => {
    await loadFresh(page);

    const dataLayer = await getDataLayer(page);
    const defaultEntry = findLastConsent(dataLayer, 'default');

    expect(defaultEntry).not.toBeNull();
    const consentState = defaultEntry!['2'] as Record<string, string>;
    expect(consentState.functionality_storage).toBe('granted');
    expect(consentState.personalization_storage).toBe('granted');
    expect(consentState.security_storage).toBe('granted');
  });

  test('backend consent recording API is called on save', async ({ page }) => {
    await loadFresh(page);
    await waitForBanner(page);

    // Intercept the POST to cookie-consent API
    const consentRequest = page.waitForRequest(
      (req) =>
        req.url().includes('/api/public/cookie-consent') &&
        req.method() === 'POST',
      { timeout: 5000 },
    );

    await page.getByRole('button', { name: /accept all/i }).click();

    const request = await consentRequest;
    const body = request.postDataJSON();

    expect(body.necessaryCookies).toBe(true);
    expect(body.analyticsCookies).toBe(true);
    expect(body.marketingCookies).toBe(true);
    expect(body.tenantId).toBeDefined();
  });
});
