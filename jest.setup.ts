// Jest setup file for Next.js application testing

// Setup testing library
import "@testing-library/jest-dom";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Mock Next.js headers
jest.mock("next/headers", () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      get: jest.fn(),
      set: jest.fn(),
    }),
  ),
}));

// Mock Next.js server components
jest.mock("next/server", () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url: url || "http://localhost:3000",
    method: init?.method || "GET",
    headers: new Headers(init?.headers || {}),
    json: jest.fn(),
    ...init,
  })),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Headers(),
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      ...init,
    })),
    redirect: jest.fn((url, status) => ({
      status: status || 302,
      headers: new Headers({ Location: url }),
    })),
  },
}));

// Supabase mock will be handled in individual test files

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalLog = console.log;

global.console = {
  ...console,
  error: jest.fn((...args) => {
    // Only show errors that contain certain keywords during testing
    const message = args.join(" ");
    if (message.includes("WARN") || message.includes("ERROR")) {
      originalError(...args);
    }
  }),
  log: jest.fn((...args) => {
    // Suppress logs during testing unless explicitly needed
    if (process.env.JEST_VERBOSE === "true") {
      originalLog(...args);
    }
  }),
};

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  waitFor: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Helper to create mock timers
  useFakeTimers: () => {
    jest.useFakeTimers();
    return {
      advanceTime: (ms) => jest.advanceTimersByTime(ms),
      runAllTimers: () => jest.runAllTimers(),
      cleanup: () => jest.useRealTimers(),
    };
  },
};

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any timers
  jest.clearAllTimers();
});

// Handle unhandled promise rejections in tests
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Custom matchers for better testing experience
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = typeof received === "string" && uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toHaveStatusCode(received, expected) {
    const pass = received.status === expected;

    if (pass) {
      return {
        message: () => `expected response not to have status ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected response to have status ${expected}, but got ${received.status}`,
        pass: false,
      };
    }
  },
});

// TypeScript declarations for Jest extensions
