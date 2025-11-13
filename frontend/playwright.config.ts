import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',

    /* Browser context options */
    ignoreHTTPSErrors: true,
    
    /* Authentication state */
    storageState: 'e2e/auth/user.json'
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/setup/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/setup/global-teardown.ts'),

  /* Configure projects for major browsers */
  projects: [
    // Authentication setup
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'e2e/auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'e2e/auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'e2e/auth/user.json',
      },
      dependencies: ['setup'],
    },

    /* Mobile viewports */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'e2e/auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'e2e/auth/user.json',
      },
      dependencies: ['setup'],
    },

    /* Visual regression tests */
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /.*\.visual\.spec\.ts/,
    },

    /* Multi-tenant isolation tests */
    {
      name: 'tenant-isolation',
      use: {
        ...devices['Desktop Chrome'],
        // Different auth state for tenant tests
        storageState: 'e2e/auth/tenant.json',
      },
      dependencies: ['setup'],
      testMatch: /.*tenant.*\.spec\.ts/,
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../backend && npm run dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  ],

  /* Test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    /* Timeout for expect() assertions */
    timeout: 10 * 1000,
    
    /* Visual comparison threshold */
    threshold: 0.1,
    
    /* Animation handling for visual tests */
    animations: 'disabled',
  },
});