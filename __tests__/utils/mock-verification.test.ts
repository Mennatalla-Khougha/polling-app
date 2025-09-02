import {
  createMockSupabaseClient,
  createMockRequest,
  mockUser,
  mockPoll,
} from "./helpers";

describe("Test Utilities - Mock Verification", () => {
  describe("Mock Supabase Client", () => {
    it("should create a properly structured mock client", () => {
      const mockClient = createMockSupabaseClient();

      expect(mockClient).toHaveProperty("auth");
      expect(mockClient.auth).toHaveProperty("getUser");
      expect(mockClient).toHaveProperty("from");
      expect(mockClient).toHaveProperty("select");
      expect(mockClient).toHaveProperty("eq");
      expect(mockClient).toHaveProperty("in");
      expect(mockClient).toHaveProperty("single");
      expect(mockClient).toHaveProperty("insert");
      expect(mockClient).toHaveProperty("update");
      expect(mockClient).toHaveProperty("delete");

      // Verify all methods are Jest mocks
      expect(jest.isMockFunction(mockClient.auth.getUser)).toBe(true);
      expect(jest.isMockFunction(mockClient.from)).toBe(true);
      expect(jest.isMockFunction(mockClient.select)).toBe(true);
      expect(jest.isMockFunction(mockClient.eq)).toBe(true);
      expect(jest.isMockFunction(mockClient.in)).toBe(true);
      expect(jest.isMockFunction(mockClient.single)).toBe(true);
      expect(jest.isMockFunction(mockClient.insert)).toBe(true);
    });

    it("should allow method chaining like real Supabase client", () => {
      const mockClient = createMockSupabaseClient();

      // Configure chaining behavior
      mockClient.from.mockReturnValue(mockClient);
      mockClient.select.mockReturnValue(mockClient);
      mockClient.eq.mockReturnValue(mockClient);

      // Test chaining
      const result = mockClient.from("polls").select("*").eq("id", "test");

      expect(result).toBe(mockClient);
      expect(mockClient.from).toHaveBeenCalledWith("polls");
      expect(mockClient.select).toHaveBeenCalledWith("*");
      expect(mockClient.eq).toHaveBeenCalledWith("id", "test");
    });
  });

  describe("Mock Request Creation", () => {
    it("should create a request with default properties", () => {
      const mockRequest = createMockRequest();

      expect(mockRequest).toHaveProperty("json");
      expect(mockRequest).toHaveProperty("headers");
      expect(mockRequest).toHaveProperty("method");
      expect(mockRequest).toHaveProperty("url");

      expect(jest.isMockFunction(mockRequest.json)).toBe(true);
      expect(mockRequest.method).toBe("POST");
      expect(mockRequest.url).toBe("http://localhost:3000/api/votes");
    });

    it("should create a request with custom body", async () => {
      const testBody = { test: "data" };
      const mockRequest = createMockRequest(testBody);

      const body = await mockRequest.json();
      expect(body).toEqual(testBody);
    });

    it("should create a request with custom headers", () => {
      const testHeaders = { "Content-Type": "application/json" };
      const mockRequest = createMockRequest({}, testHeaders);

      expect(mockRequest.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Test Data Consistency", () => {
    it("should have consistent user data structure", () => {
      expect(mockUser).toHaveProperty("id");
      expect(mockUser).toHaveProperty("email");
      expect(mockUser).toHaveProperty("user_metadata");

      expect(typeof mockUser.id).toBe("string");
      expect(typeof mockUser.email).toBe("string");
      expect(typeof mockUser.user_metadata).toBe("object");
      expect(mockUser.user_metadata).toHaveProperty("display_name");
    });

    it("should have consistent poll data structure", () => {
      expect(mockPoll).toHaveProperty("id");
      expect(mockPoll).toHaveProperty("title");
      expect(mockPoll).toHaveProperty("description");
      expect(mockPoll).toHaveProperty("creator_id");
      expect(mockPoll).toHaveProperty("is_public");
      expect(mockPoll).toHaveProperty("allow_multiple_votes");
      expect(mockPoll).toHaveProperty("expires_at");
      expect(mockPoll).toHaveProperty("created_at");

      expect(typeof mockPoll.id).toBe("string");
      expect(typeof mockPoll.title).toBe("string");
      expect(typeof mockPoll.is_public).toBe("boolean");
      expect(typeof mockPoll.allow_multiple_votes).toBe("boolean");
    });

    it("should have UUIDs in correct format", () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(mockUser.id).toMatch(uuidRegex);
      expect(mockPoll.id).toMatch(uuidRegex);
      expect(mockPoll.creator_id).toMatch(uuidRegex);
    });
  });

  describe("Mock Reset Behavior", () => {
    it("should properly reset mock call counts", () => {
      const mockClient = createMockSupabaseClient();

      // Make some calls
      mockClient.from("test");
      mockClient.select("*");

      expect(mockClient.from).toHaveBeenCalledTimes(1);
      expect(mockClient.select).toHaveBeenCalledTimes(1);

      // Clear mocks
      jest.clearAllMocks();

      expect(mockClient.from).toHaveBeenCalledTimes(0);
      expect(mockClient.select).toHaveBeenCalledTimes(0);
    });

    it("should maintain mock function identity after reset", () => {
      const mockClient = createMockSupabaseClient();
      const originalFromMock = mockClient.from;

      jest.clearAllMocks();

      expect(mockClient.from).toBe(originalFromMock);
      expect(jest.isMockFunction(mockClient.from)).toBe(true);
    });
  });

  describe("Error Response Helpers", () => {
    it("should provide consistent error response structures", () => {
      const {
        authErrorResponse,
        pollNotFoundResponse,
        alreadyVotedResponse,
        internalErrorResponse,
      } = require("./helpers");

      expect(authErrorResponse).toHaveProperty("error");
      expect(pollNotFoundResponse).toHaveProperty("error");
      expect(alreadyVotedResponse).toHaveProperty("error");
      expect(internalErrorResponse).toHaveProperty("error");

      expect(typeof authErrorResponse.error).toBe("string");
      expect(typeof pollNotFoundResponse.error).toBe("string");
      expect(typeof alreadyVotedResponse.error).toBe("string");
      expect(typeof internalErrorResponse.error).toBe("string");
    });
  });
});
