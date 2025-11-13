# OneClickTag E2E Testing Suite

This directory contains comprehensive end-to-end tests for the OneClickTag application using Playwright.

## 📁 Directory Structure

```
e2e/
├── auth/                   # Authentication setup and states
│   ├── auth.setup.ts      # Authentication setup for different users
│   ├── user.json          # Main user authenticated state
│   └── tenant.json        # Tenant user authenticated state
├── fixtures/              # Test data fixtures
├── pages/                 # Page Object Models
│   ├── login.page.ts      # Login page interactions
│   ├── dashboard.page.ts  # Dashboard page interactions
│   ├── customers.page.ts  # Customer management page
│   └── campaigns.page.ts  # Campaign management page
├── setup/                 # Global setup and teardown
│   ├── global-setup.ts    # Global test setup
│   └── global-teardown.ts # Global test cleanup
├── tests/                 # Test specifications
│   ├── auth.spec.ts       # Authentication flow tests
│   ├── customers.spec.ts  # Customer management tests
│   ├── campaigns.spec.ts  # Campaign and GTM sync tests
│   ├── tenant-isolation.spec.ts    # Multi-tenant isolation tests
│   ├── error-handling.spec.ts      # Error scenario tests
│   └── visual-regression.spec.ts   # Visual regression tests
└── utils/                 # Test utilities and helpers
    ├── helpers.ts         # Common test helper functions
    ├── test-data.ts       # Test data management
    └── visual-comparison.ts # Visual testing utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Backend server running on `http://localhost:3001`
- Frontend dev server running on `http://localhost:3000`
- PostgreSQL database with test data

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install
```

### Running Tests

```bash
# Run all E2E tests
npm run e2e

# Run tests with UI mode (interactive)
npm run e2e:ui

# Run tests in headed mode (see browser)
npm run e2e:headed

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run tests for specific browser
npx playwright test --project=chromium

# Run tests in debug mode
npm run e2e:debug
```

### Visual Regression Testing

```bash
# Run visual regression tests
npx playwright test --project=visual-regression

# Update visual baselines
npx playwright test --project=visual-regression --update-snapshots

# Generate visual comparison report
npm run e2e:visual-report
```

## 📊 Test Categories

### Authentication Tests (`auth.spec.ts`)
- ✅ Successful login with valid credentials
- ✅ Error handling for invalid credentials
- ✅ Form validation errors
- ✅ Session persistence and expiration
- ✅ Logout functionality
- ✅ Forgot password flow
- ✅ Registration navigation

### Customer Management Tests (`customers.spec.ts`)
- ✅ Display customers list
- ✅ Create new customers
- ✅ Edit existing customers
- ✅ Delete customers with confirmation
- ✅ Search and filter customers
- ✅ Form validation
- ✅ Bulk operations
- ✅ Import/export functionality
- ✅ Error handling

### Campaign Management Tests (`campaigns.spec.ts`)
- ✅ Display campaigns list
- ✅ Create new campaigns
- ✅ Edit existing campaigns
- ✅ Delete campaigns
- ✅ Google Tag Manager integration
- ✅ GTM authentication flow
- ✅ GTM sync operations
- ✅ Campaign status management
- ✅ Search and filter campaigns

### Multi-Tenant Isolation Tests (`tenant-isolation.spec.ts`)
- ✅ Data isolation between tenants
- ✅ API endpoint security
- ✅ User management isolation
- ✅ WebSocket connection isolation
- ✅ Cross-tenant access prevention
- ✅ Token manipulation security
- ✅ Permission enforcement

### Error Handling Tests (`error-handling.spec.ts`)
- ✅ Network connectivity issues
- ✅ Server error responses (500, 503, 429)
- ✅ Authentication errors
- ✅ Validation error handling
- ✅ File upload errors
- ✅ Concurrent operation conflicts
- ✅ Browser error scenarios
- ✅ Recovery mechanisms

### Visual Regression Tests (`visual-regression.spec.ts`)
- ✅ Page layouts and components
- ✅ Responsive design testing
- ✅ Theme variations (light/dark)
- ✅ Form states and interactions
- ✅ Error and loading states
- ✅ Cross-browser consistency

## 🔧 Configuration

The main configuration is in `playwright.config.ts`:

- **Multiple browsers**: Chromium, Firefox, WebKit
- **Parallel execution**: Tests run in parallel for speed
- **Retry logic**: Automatic retries on CI environments
- **Screenshots**: Captured on failure
- **Videos**: Recorded for failed tests
- **Tracing**: Enabled for debugging

## 🏗️ Page Object Model

Tests use the Page Object Model pattern for maintainable and reusable code:

```typescript
// Example usage
const loginPage = new LoginPage(page);
const customersPage = new CustomersPage(page);

await loginPage.goto();
await loginPage.login('user@example.com', 'password');
await customersPage.createCustomer({
  name: 'Test Customer',
  email: 'test@customer.com'
});
```

## 🔄 CI/CD Integration

Tests are integrated with GitHub Actions:

- **Parallel execution** across multiple browsers and shards
- **Visual regression** testing with baseline comparisons
- **Performance testing** with Lighthouse integration
- **Preview deployments** for pull requests
- **Slack notifications** for test failures
- **Artifact uploads** for test results and screenshots

## 📈 Test Data Management

The `E2ETestData` class provides:

- **Consistent test data** across test runs
- **Isolated test environments** per tenant
- **Automatic cleanup** after tests
- **Dynamic data generation** with Faker.js
- **Database seeding** and teardown

## 🔍 Debugging Tests

### Local Debugging

```bash
# Debug specific test
npx playwright test tests/auth.spec.ts --debug

# Run with browser UI visible
npx playwright test --headed

# Use Playwright Inspector
npx playwright test --debug --headed
```

### CI Debugging

- Check uploaded artifacts for screenshots and videos
- Review detailed logs in GitHub Actions
- Use the HTML report for test results visualization

## 📊 Performance Testing

Performance tests measure:

- **Page load times**
- **Time to interactive**
- **Largest contentful paint**
- **Cumulative layout shift**
- **API response times**

## 🔒 Security Testing

Security tests verify:

- **Authentication flows**
- **Authorization boundaries**
- **Data isolation between tenants**
- **XSS prevention**
- **CSRF protection**
- **API security**

## 📝 Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { PageObjectModel } from '../pages/page.page';
import { E2EHelpers, E2EAssertions } from '../utils/helpers';

test.describe('Feature Name', () => {
  let pageObject: PageObjectModel;
  let helpers: E2EHelpers;

  test.beforeEach(async ({ page }) => {
    pageObject = new PageObjectModel(page);
    helpers = new E2EHelpers(page);
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for elements** to be visible/hidden before interacting
3. **Mock external API calls** when necessary
4. **Clean up test data** after each test
5. **Use meaningful test descriptions** that describe behavior
6. **Group related tests** in describe blocks
7. **Handle async operations** properly with await
8. **Test error scenarios** as well as happy paths

### Adding Visual Tests

```typescript
test('should match component design', async ({ page }) => {
  await page.goto('/component-page');
  await expect(page).toHaveScreenshot('component-design.png');
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or wait for specific conditions
2. **Elements not found**: Verify selectors and wait for elements
3. **Authentication failures**: Check test user credentials and setup
4. **Database conflicts**: Ensure test data isolation
5. **Network issues**: Mock external API calls

### Getting Help

- Check the [Playwright documentation](https://playwright.dev/)
- Review existing test examples in this directory
- Check CI logs for detailed error information
- Use browser developer tools during headed test runs

## 📚 Resources

- [Playwright Official Documentation](https://playwright.dev/docs/intro)
- [Best Practices for E2E Testing](https://playwright.dev/docs/best-practices)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Visual Testing Guide](https://playwright.dev/docs/screenshots)