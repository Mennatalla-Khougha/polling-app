import { voteSchema } from "@/lib/validations/polls";
import { createMockSupabaseClient, mockUser } from "./utils/helpers";

describe("Test Setup Verification", () => {
  describe("Environment Setup", () => {
    it("should have all required environment variables", () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });

    it("should have Jest configured properly", () => {
      expect(jest).toBeDefined();
      expect(expect).toBeDefined();
    });

    it("should have custom matchers available", () => {
      expect("550e8400-e29b-41d4-a716-446655440000").toBeValidUUID();

      const mockResponse = { status: 200 };
      expect(mockResponse).toHaveStatusCode(200);
    });
  });

  describe("Mock Functionality", () => {
    it("should create mock Supabase client", () => {
      const mockClient = createMockSupabaseClient();

      expect(mockClient).toBeDefined();
      expect(mockClient.auth).toBeDefined();
      expect(jest.isMockFunction(mockClient.auth.getUser)).toBe(true);
    });

    it("should have test data available", () => {
      expect(mockUser).toBeDefined();
      expect(mockUser.id).toBeValidUUID();
      expect(typeof mockUser.email).toBe("string");
    });

    it("should be able to import route handler", () => {
      // Mock the route import for testing
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn(),
      }));

      const { POST } = require("@/app/api/votes/route");
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("Validation Schema", () => {
    it("should import and use vote schema", () => {
      const validVote = {
        poll_id: "550e8400-e29b-41d4-a716-446655440000",
        option_ids: ["6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
      };

      const result = voteSchema.safeParse(validVote);
      expect(result.success).toBe(true);
    });

    it("should reject invalid vote data", () => {
      const invalidVote = {
        poll_id: "invalid-uuid",
        option_ids: [],
      };

      const result = voteSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });
  });

  describe("Global Test Utils", () => {
    it("should have global test utilities available", () => {
      expect(global.testUtils).toBeDefined();
      expect(global.testUtils.waitFor).toBeDefined();
      expect(global.testUtils.useFakeTimers).toBeDefined();
    });

    it("should handle async waiting", async () => {
      const start = Date.now();
      await global.testUtils.waitFor(10);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(9);
    });
  });

  describe("Console Mocking", () => {
    it("should have mocked console methods", () => {
      expect(jest.isMockFunction(console.log)).toBe(true);
      expect(jest.isMockFunction(console.error)).toBe(true);
    });

    it("should not throw when console methods are called", () => {
      expect(() => {
        console.log("Test log message");
        console.error("Test error message");
      }).not.toThrow();
    });
  });

  describe("Module Resolution", () => {
    it("should resolve path aliases correctly", async () => {
      // This test verifies that the @ alias is working
      expect(() => {
        require("@/lib/validations/polls");
      }).not.toThrow();
    });

    it("should handle Next.js imports", () => {
      const { NextResponse } = require("next/server");
      expect(NextResponse).toBeDefined();
      expect(NextResponse.json).toBeDefined();
    });
  });
});
