module.exports = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Module file extensions for importing
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Root directory for tests and modules
  rootDir: '.',
  
  // Patterns for test discovery
  testRegex: '.*\\.spec\\.ts$',
  
  // Transform files with TypeScript
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/index.ts',
  ],
  
  // Coverage directory
  coverageDirectory: './coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  
  // Setup files to run before tests
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts',
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  
  // Test timeout (30 seconds)
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Detect open handles (useful for debugging)
  detectOpenHandles: true,
  forceExit: true,
  
  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/**/*.spec.ts'],
      setupFilesAfterEnv: [
        '<rootDir>/test/setup.ts',
        '<rootDir>/test/integration-setup.ts',
      ],
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: [
        '<rootDir>/test/setup.ts',
        '<rootDir>/test/e2e-setup.ts',
      ],
    },
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // Watch ignore patterns  
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.git',
  ],
  
  // Error on deprecated usage
  errorOnDeprecated: true,
  
  // Bail after first test failure in CI
  bail: process.env.CI ? 1 : false,
  
  // Max workers for parallel execution
  maxWorkers: process.env.CI ? 2 : '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@nestjs|rxjs)/)',
  ],
};