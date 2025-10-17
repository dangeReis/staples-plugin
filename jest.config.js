module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js'
  ],

  // Test grouping for organization
  displayName: {
    name: 'BLACK-BOX-TESTS',
    color: 'blue'
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.js',
    'content.js',
    'background.js',
    'popup.js',
    '!src/**/interface.js', // Exclude interface definitions from coverage
    '!src/adapters/mocks.js' // Exclude mocks from coverage
  ],

  // Coverage thresholds (per constitution)
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // Module paths for imports
  moduleNameMapper: {
    '^@primitives/(.*)$': '<rootDir>/src/primitives/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@adapters/(.*)$': '<rootDir>/src/adapters/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout for async tests
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true
};
