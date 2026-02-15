export default {
  // Test environment
  testEnvironment: 'jsdom',

  // Root directories for module resolution
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns grouped by suite type
  testMatch: [
    '<rootDir>/tests/contract/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/*.test.js'
  ],

  // Named display for reporters
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

  // Dedicated coverage directory and thresholds
  coverageDirectory: '<rootDir>/coverage',
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

  // Grouped coverage and transformation options
  transform: {},

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true
};