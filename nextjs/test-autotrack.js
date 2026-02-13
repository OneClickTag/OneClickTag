const { chromium } = require('playwright');

(async () => {
  console.log('Starting AutoTrack feature test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // Listen for errors
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  try {
    // Step 1: Navigate to login
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });

    // Wait for any build errors to clear or page to be ready
    console.log('Waiting for page to be ready (checking for build errors)...');
    await page.waitForTimeout(5000);

    // Check if there's a build error
    const hasBuildError = await page.locator('text="Build Error"').count();
    if (hasBuildError > 0) {
      console.log('❌ Build error detected on page!');
      const errorText = await page.locator('body').textContent();
      console.log('Error content:', errorText.substring(0, 500));
      await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/01-build-error.png' });
      throw new Error('Build error on page - cannot proceed');
    }

    await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/01-login-page.png' });
    console.log('✓ Login page loaded\n');

    // Step 2: Login
    console.log('Step 2: Logging in...');

    // Wait for email input to be visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'test-admin@oneclicktag.com');
    await page.fill('input[type="password"]', 'TestAdmin123!');
    await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/02-login-filled.png' });

    await page.click('button[type="submit"]');
    console.log('Submitted login form, waiting for redirect...');

    // Wait for navigation after login
    await page.waitForURL(/http:\/\/localhost:3001\/(?!login)/, { timeout: 10000 });
    const currentUrl = page.url();
    console.log(`✓ Redirected to: ${currentUrl}\n`);
    await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/03-after-login.png' });

    // Step 3: Navigate to customers page
    console.log('Step 3: Looking for customers...');
    await page.waitForLoadState('networkidle');

    // Try to find customers link or navigate directly
    const hasCustomersLink = await page.locator('a[href*="customers"]').count();
    if (hasCustomersLink > 0) {
      console.log('Found customers link, clicking...');
      await page.click('a[href*="customers"]');
      await page.waitForLoadState('networkidle');
    } else {
      console.log('No customers link found, navigating directly...');
      await page.goto('http://localhost:3001/customers');
      await page.waitForLoadState('networkidle');
    }

    console.log(`Current URL: ${page.url()}`);
    await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/04-customers-page.png' });

    // Step 4: Find and click a customer
    console.log('\nStep 4: Looking for customer to click...');

    // Try different selectors for customer links
    const customerSelectors = [
      'a[href*="/customer/"]',
      '[role="row"] a',
      'table a',
      '.customer-link'
    ];

    let customerLink = null;
    for (const selector of customerSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found ${count} customer link(s) using selector: ${selector}`);
        customerLink = page.locator(selector).first();
        break;
      }
    }

    if (!customerLink) {
      console.log('No customer links found. Page content:');
      const bodyText = await page.locator('body').textContent();
      console.log(bodyText.substring(0, 500));
      throw new Error('No customer links found on page');
    }

    const customerHref = await customerLink.getAttribute('href');
    console.log(`Clicking customer link: ${customerHref}`);
    await customerLink.click();
    await page.waitForLoadState('networkidle');

    const customerPageUrl = page.url();
    console.log(`✓ Navigated to customer page: ${customerPageUrl}\n`);
    await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/05-customer-detail.png' });

    // Step 5: Look for AutoTrack tab
    console.log('Step 5: Looking for AutoTrack tab...');

    // Wait a bit for page to fully render
    await page.waitForTimeout(1000);

    // Try to find AutoTrack tab with different selectors
    const tabSelectors = [
      'button:has-text("AutoTrack")',
      '[role="tab"]:has-text("AutoTrack")',
      'a:has-text("AutoTrack")',
      'div:has-text("AutoTrack")'
    ];

    let autoTrackTab = null;
    for (const selector of tabSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found AutoTrack tab using selector: ${selector}`);
        autoTrackTab = page.locator(selector).first();
        break;
      }
    }

    if (!autoTrackTab) {
      console.log('❌ AutoTrack tab NOT FOUND');
      console.log('\nAll tabs found on page:');
      const allTabs = await page.locator('[role="tab"]').allTextContents();
      console.log(allTabs);

      console.log('\nAll buttons found on page:');
      const allButtons = await page.locator('button').allTextContents();
      console.log(allButtons.filter(text => text.trim()));

      await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/06-no-autotrack-tab.png' });
    } else {
      console.log('✓ AutoTrack tab found!\n');

      // Step 6: Click AutoTrack tab
      console.log('Step 6: Clicking AutoTrack tab...');
      await autoTrackTab.click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');

      console.log('✓ Clicked AutoTrack tab\n');
      await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/07-autotrack-tab-clicked.png' });

      // Check what rendered
      console.log('Step 7: Checking what rendered...');

      // Look for common elements
      const hasHeading = await page.locator('h1, h2, h3').count();
      const hasForm = await page.locator('form').count();
      const hasButton = await page.locator('button').count();
      const hasError = await page.locator('text=/error/i').count();

      console.log(`- Headings found: ${hasHeading}`);
      console.log(`- Forms found: ${hasForm}`);
      console.log(`- Buttons found: ${hasButton}`);
      console.log(`- Errors found: ${hasError}`);

      // Get visible text content
      const tabContent = await page.locator('[role="tabpanel"]').textContent().catch(() => '');
      if (tabContent) {
        console.log('\nTab panel content:');
        console.log(tabContent.substring(0, 500));
      }

      // Check for specific AutoTrack elements
      const autoTrackElements = [
        'text="Scan Website"',
        'text="Start Scan"',
        'text="Auto Track"',
        'text="Recommendations"',
        'input[type="url"]'
      ];

      console.log('\nChecking for AutoTrack-specific elements:');
      for (const selector of autoTrackElements) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`✓ Found: ${selector}`);
        }
      }

      await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/08-autotrack-content.png' });
    }

    console.log('\n=== Test Complete ===');
    console.log('Screenshots saved to /Users/orharazi/OneClickTag/nextjs/screenshots/');

    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: '/Users/orharazi/OneClickTag/nextjs/screenshots/error.png' });
    console.error('\nError screenshot saved');
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
})();
