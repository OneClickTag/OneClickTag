import { FullConfig } from '@playwright/test';
import { E2ETestData } from '../utils/test-data';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Cleanup test data
    const testData = new E2ETestData();
    await testData.cleanupTestEnvironment();
    
    console.log('✅ E2E test environment cleaned up');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    // Don't throw to avoid breaking the test run
  }
}

export default globalTeardown;