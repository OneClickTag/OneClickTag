/**
 * Global teardown - runs once after all tests
 */

export default async function teardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Close any open database connections
    if (global.__PRISMA__) {
      await global.__PRISMA__.$disconnect();
    }

    // Close Redis connections
    if (global.__REDIS__) {
      await global.__REDIS__.disconnect();
    }

    // Clean up any remaining intervals/timeouts
    if (global.__INTERVALS__) {
      global.__INTERVALS__.forEach(clearInterval);
    }

    if (global.__TIMEOUTS__) {
      global.__TIMEOUTS__.forEach(clearTimeout);
    }

    console.log('✅ Test environment cleanup complete');

  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
}