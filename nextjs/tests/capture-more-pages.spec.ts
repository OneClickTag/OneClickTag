import { test, expect } from '@playwright/test';

test('Capture network requests across multiple pages', async ({ page }) => {
  const allNetworkRequests: Array<{
    page: string;
    url: string;
    method: string;
    status: number;
    timing: number;
    type: string;
  }> = [];

  const requestStartTimes = new Map<string, number>();

  // Listen to all network requests
  page.on('request', (request) => {
    requestStartTimes.set(request.url(), Date.now());
  });

  page.on('response', async (response) => {
    const request = response.request();
    const startTime = requestStartTimes.get(request.url()) || Date.now();
    const duration = Date.now() - startTime;

    console.log(`← ${request.method()} ${request.url()} - ${response.status()} (${duration}ms)`);
  });

  // Start on homepage
  console.log('\n=== NAVIGATING TO HOMEPAGE ===\n');
  await page.goto('http://localhost:3001', {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  await page.waitForTimeout(3000);

  // Capture homepage requests
  page.on('response', async (response) => {
    const request = response.request();
    const startTime = requestStartTimes.get(request.url()) || Date.now();
    const duration = Date.now() - startTime;

    allNetworkRequests.push({
      page: 'Homepage',
      url: request.url(),
      method: request.method(),
      status: response.status(),
      timing: duration,
      type: request.resourceType()
    });
  });

  // Take screenshot
  await page.screenshot({
    path: '/Users/orharazi/OneClickTag/nextjs/test-results/homepage.png',
    fullPage: true
  });

  // Try to find and click navigation links
  console.log('\n=== LOOKING FOR NAVIGATION LINKS ===\n');

  // Check for "About" link
  const aboutLink = page.locator('a:has-text("About")').first();
  if (await aboutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking "About" link...');
    await aboutLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/Users/orharazi/OneClickTag/nextjs/test-results/about-page.png',
      fullPage: true
    });
    console.log('📸 About page screenshot saved');
    await page.goBack();
  }

  // Check for "Contact" link
  const contactLink = page.locator('a:has-text("Contact")').first();
  if (await contactLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking "Contact" link...');
    await contactLink.click();
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: '/Users/orharazi/OneClickTag/nextjs/test-results/contact-page.png',
      fullPage: true
    });
    console.log('📸 Contact page screenshot saved');
    await page.goBack();
  }

  // Check for "Join Waitlist" button
  const waitlistBtn = page.locator('button:has-text("Join Waitlist"), a:has-text("Join Waitlist")').first();
  if (await waitlistBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking "Join Waitlist" button...');
    await waitlistBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: '/Users/orharazi/OneClickTag/nextjs/test-results/waitlist-modal.png',
      fullPage: true
    });
    console.log('📸 Waitlist modal screenshot saved');
  }

  // Group API requests
  const apiRequests = allNetworkRequests.filter(r =>
    r.type === 'fetch' || r.type === 'xhr' || r.url.includes('/api/')
  );

  console.log('\n' + '='.repeat(80));
  console.log('📊 ALL API REQUESTS CAPTURED');
  console.log('='.repeat(80) + '\n');

  // Group by endpoint
  const endpointGroups = apiRequests.reduce((acc, req) => {
    const endpoint = req.url.replace(/^https?:\/\/[^\/]+/, '');
    if (!acc[endpoint]) acc[endpoint] = [];
    acc[endpoint].push(req);
    return acc;
  }, {} as Record<string, typeof apiRequests>);

  Object.entries(endpointGroups).forEach(([endpoint, requests]) => {
    console.log(`\n${endpoint}:`);
    requests.forEach(req => {
      console.log(`  - ${req.method} (${req.status}) - ${req.timing}ms - Page: ${req.page}`);
    });
    if (requests.length > 1) {
      console.log(`  ⚠️  Called ${requests.length} times`);
    }
  });

  // Save report
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/orharazi/OneClickTag/nextjs/test-results/full-navigation-report.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      totalRequests: allNetworkRequests.length,
      apiRequests: apiRequests.length,
      requests: allNetworkRequests,
      endpointGroups: Object.entries(endpointGroups).map(([endpoint, reqs]) => ({
        endpoint,
        count: reqs.length,
        requests: reqs
      }))
    }, null, 2)
  );

  console.log('\n📝 Full navigation report saved\n');
});
