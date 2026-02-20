import { test, expect } from '@playwright/test';

test('Capture network requests on page load', async ({ page }) => {
  const networkRequests: Array<{
    url: string;
    method: string;
    status: number;
    timing: number;
    type: string;
    startTime: number;
  }> = [];

  const requestStartTimes = new Map<string, number>();

  // Listen to all network requests
  page.on('request', (request) => {
    requestStartTimes.set(request.url(), Date.now());
    console.log(`→ REQUEST: ${request.method()} ${request.url()}`);
  });

  page.on('response', async (response) => {
    const request = response.request();
    const startTime = requestStartTimes.get(request.url()) || Date.now();
    const duration = Date.now() - startTime;

    const requestData = {
      url: request.url(),
      method: request.method(),
      status: response.status(),
      timing: duration,
      type: request.resourceType(),
      startTime: startTime
    };

    networkRequests.push(requestData);

    console.log(`← RESPONSE: ${request.method()} ${request.url()} - Status: ${response.status()} - Time: ${duration}ms - Type: ${request.resourceType()}`);
  });

  // Try different ports
  const ports = [3001, 3000, 5173, 4173, 8080];
  let successfulUrl = '';

  for (const port of ports) {
    const url = `http://localhost:${port}`;
    console.log(`\n=== Trying ${url} ===\n`);

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      successfulUrl = url;
      console.log(`\n✅ Successfully loaded ${url}\n`);

      // Wait for the page to stabilize
      await page.waitForTimeout(5000);

      // Check if we got redirected
      const currentUrl = page.url();
      console.log(`Current URL after load: ${currentUrl}\n`);

      break;
    } catch (error) {
      console.log(`❌ Failed to load ${url}: ${error.message}\n`);
    }
  }

  if (!successfulUrl) {
    throw new Error('Could not connect to app on any port: ' + ports.join(', '));
  }

  // Take screenshot
  const screenshotPath = '/Users/orharazi/OneClickTag/nextjs/test-results/initial-page.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot saved to: ${screenshotPath}\n`);

  // Group requests by type
  const apiRequests = networkRequests.filter(r =>
    r.type === 'fetch' || r.type === 'xhr' || r.url.includes('/api/')
  );

  const resourceRequests = networkRequests.filter(r =>
    r.type === 'script' || r.type === 'stylesheet' || r.type === 'image' || r.type === 'font'
  );

  const documentRequests = networkRequests.filter(r => r.type === 'document');

  console.log('\n' + '='.repeat(80));
  console.log('📊 NETWORK TRAFFIC SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`📄 Document Requests: ${documentRequests.length}`);
  documentRequests.forEach(req => {
    console.log(`   ${req.method} ${req.url} - ${req.status} (${req.timing}ms)`);
  });

  console.log(`\n🔌 API/XHR Requests: ${apiRequests.length}`);
  apiRequests.forEach(req => {
    console.log(`   ${req.method} ${req.url} - ${req.status} (${req.timing}ms)`);
  });

  console.log(`\n📦 Resource Requests: ${resourceRequests.length}`);
  console.log(`   - Scripts: ${resourceRequests.filter(r => r.type === 'script').length}`);
  console.log(`   - Stylesheets: ${resourceRequests.filter(r => r.type === 'stylesheet').length}`);
  console.log(`   - Images: ${resourceRequests.filter(r => r.type === 'image').length}`);
  console.log(`   - Fonts: ${resourceRequests.filter(r => r.type === 'font').length}`);

  console.log(`\n📈 Total Requests: ${networkRequests.length}`);

  // Find duplicates
  const urlCounts = networkRequests.reduce((acc, req) => {
    acc[req.url] = (acc[req.url] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicates = Object.entries(urlCounts).filter(([_, count]) => count > 1);

  if (duplicates.length > 0) {
    console.log('\n⚠️  DUPLICATE REQUESTS DETECTED:');
    duplicates.forEach(([url, count]) => {
      console.log(`   ${count}x - ${url}`);
    });
  }

  // Calculate timing stats
  const totalTime = networkRequests.reduce((sum, req) => sum + req.timing, 0);
  const avgTime = networkRequests.length > 0 ? totalTime / networkRequests.length : 0;
  const slowRequests = networkRequests.filter(req => req.timing > 1000);

  console.log('\n⏱️  TIMING ANALYSIS:');
  console.log(`   Average request time: ${Math.round(avgTime)}ms`);
  console.log(`   Total request time: ${Math.round(totalTime)}ms`);

  if (slowRequests.length > 0) {
    console.log(`\n🐌 SLOW REQUESTS (>1s):`);
    slowRequests.forEach(req => {
      console.log(`   ${req.timing}ms - ${req.method} ${req.url}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save detailed JSON report
  const reportPath = '/Users/orharazi/OneClickTag/nextjs/test-results/network-report.json';
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    url: successfulUrl,
    timestamp: new Date().toISOString(),
    summary: {
      total: networkRequests.length,
      api: apiRequests.length,
      resources: resourceRequests.length,
      duplicates: duplicates.length,
      avgTime: Math.round(avgTime),
      totalTime: Math.round(totalTime)
    },
    requests: networkRequests,
    duplicates: duplicates.map(([url, count]) => ({ url, count })),
    slowRequests: slowRequests
  }, null, 2));

  console.log(`📝 Detailed report saved to: ${reportPath}\n`);
});
