/**
 * Global setup - runs once before all tests
 */

import { execSync } from 'child_process';
import { join } from 'path';

export default async (): Promise<void> => {
  console.log('🚀 Setting up test environment...');

  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Generate Prisma client for test environment
    console.log('📦 Generating Prisma client...');
    execSync('npx prisma generate', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });

    // Setup test database
    if (process.env.SETUP_TEST_DB !== 'false') {
      console.log('🗃️ Setting up test database...');
      
      // Reset and migrate test database
      try {
        execSync('npx prisma migrate reset --force --skip-seed', {
          cwd: process.cwd(),
          stdio: 'inherit',
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_oneclicktag',
          },
        });
      } catch (error) {
        console.warn('⚠️ Database reset failed, continuing with existing database');
      }
    }

    console.log('✅ Test environment setup complete');

  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
};