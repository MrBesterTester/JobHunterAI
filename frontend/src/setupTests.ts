// jest-dom adds custom matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Explicitly cleanup React Testing Library after each test
// This ensures all rendered components unmount properly, triggering their useEffect cleanup functions
// Without this, components stay "mounted" in jsdom, keeping intervals/timers/listeners alive
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Suppress console errors in tests (optional - remove if you want to see them)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';

    // Filter out known React warnings that are expected in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: useLayoutEffect') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)') ||
       args[0].includes('ReactDOMTestUtils.act') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }

    // Filter out expected API errors (tests run without backend, so API calls fail)
    if (
      message.includes('Failed to fetch') ||
      message.includes('Error fetching') ||
      message.includes('Error: Failed to fetch') ||
      message.includes('500')
    ) {
      return; // Suppress expected API errors in tests
    }

    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
