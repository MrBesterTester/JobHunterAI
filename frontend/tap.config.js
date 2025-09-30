module.exports = {
  ts: true,
  jsx: false,
  coverage: true,
  'coverage-report': ['text', 'html', 'lcov'],
  'check-coverage': true,
  statements: 95,
  branches: 90,
  functions: 95,
  lines: 95,
  timeout: 30,
  files: ['test/**/*.test.ts'],
  reporter: 'tap-spec',
  nyc: {
    exclude: [
      'test/**',
      'coverage/**',
      'build/**',
      'public/**'
    ]
  }
};