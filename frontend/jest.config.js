module.exports = {
  // Use jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Roots for test discovery
  roots: ['<rootDir>/src'],

  // Setup files (runs after test framework is installed in the environment)
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Test file patterns (equivalent to Vitest's include)
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx,js}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx,js}'
  ],

  // Paths to ignore (equivalent to Vitest's exclude)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/e2e/',
    '/playwright/',
    '/dist/'
  ],

  // Module name mapping for CSS and assets
  moduleNameMapper: {
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Image and asset mocking
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // TypeScript transformation using ts-jest
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration (matching Vitest config)
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/index.tsx',
    '!src/react-app-env.d.ts',
    '!src/**/*.d.ts',
    '!src/reportWebVitals.ts'
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 9,
      lines: 19,
      statements: 21
    }
  },

  // Test timeout (matching Vitest's testTimeout)
  testTimeout: 10000,

  // Maximum number of concurrent workers (matching Vitest's maxWorkers for ISSUE-019 stability)
  maxWorkers: 4,

  // Clear mocks between tests automatically
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Verbose output
  verbose: true
};
