import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use jsdom environment for React component testing
    environment: 'jsdom',

    // Setup files (equivalent to Jest's setupFilesAfterEnv)
    setupFiles: ['./src/setupTests.ts'],

    // Test file patterns
    include: [
      'src/**/__tests__/**/*.+(ts|tsx|js)',
      'src/**/?(*.)+(spec|test).+(ts|tsx|js)'
    ],

    // Exclude patterns (equivalent to Jest's testPathIgnorePatterns)
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      '**/e2e/**',
      '**/playwright/**',
      '**/dist/**'
    ],

    // Enable globals for Jest-compatible API (describe, it, expect, beforeEach, etc.)
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: [
        'src/**/*.{ts,tsx}'
      ],
      exclude: [
        'src/index.tsx',
        'src/react-app-env.d.ts',
        'src/**/*.d.ts',
        'src/reportWebVitals.ts'
      ],
      // Match Jest coverage thresholds
      thresholds: {
        branches: 8,
        functions: 9,
        lines: 19,
        statements: 21
      }
    },

    // Test timeout (equivalent to Jest's testTimeout)
    testTimeout: 10000,
  },

  resolve: {
    alias: {
      // CSS module mocking (equivalent to Jest's moduleNameMapper)
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    }
  }
});
