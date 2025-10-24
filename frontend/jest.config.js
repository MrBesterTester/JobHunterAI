module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.+(ts|tsx|js)',
    '<rootDir>/src/**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/e2e/',
    '/playwright/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/index.tsx',
    '!src/react-app-env.d.ts',
    '!src/**/*.d.ts',
    '!src/reportWebVitals.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 9,
      lines: 19,
      statements: 21
    }
  },
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  testTimeout: 10000,
  verbose: true
};
