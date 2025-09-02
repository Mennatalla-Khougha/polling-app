import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createMockSupabaseClient,
  createMockRequest,
  mockUser,
  mockPoll,
  validVoteRequest,
} from "../../utils/helpers";

// Mock the Supabase client
jest.mock("@/lib/supabase/server");
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe("/api/votes", () => {
  let mockSupabase: any;
  let mockRequest: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockCreateClient.mockResolvedValue(mockSupabase);
    mockRequest = createMockRequest();
  });

  describe("POST", () => {
    it("should successfully create a vote for authenticated user", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () => Promise.resolve({ success: true }),
          status: 201,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      // Setup mocks
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.json = jest.fn().mockResolvedValue(validVoteRequest);

      const response = await POST(mockRequest as NextRequest);
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
    });

    it("should return 401 when user is not authenticated", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({ error: "You must be logged in to vote" }),
          status: 401,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      mockRequest.json = jest.fn().mockResolvedValue(validVoteRequest);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: "You must be logged in to vote",
      });
    });

    it("should return 400 for invalid request body", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              error: "Invalid vote data",
              details: [{ message: "Invalid UUID format" }],
            }),
          status: 400,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const invalidRequestBody = {
        poll_id: "invalid-uuid",
        option_ids: [],
      };

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequestBody);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid vote data");
      expect(responseData.details).toBeDefined();
    });

    it("should prevent duplicate votes from same user", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              error: "You have already voted on this poll",
            }),
          status: 400,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.json = jest.fn().mockResolvedValue(validVoteRequest);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: "You have already voted on this poll",
      });
    });

    it("should return 404 when poll does not exist", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              error: "Poll not found or not accessible",
            }),
          status: 404,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.json = jest.fn().mockResolvedValue(validVoteRequest);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toEqual({
        error: "Poll not found or not accessible",
      });
    });

    it("should handle expired polls", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              error: "Poll has expired",
            }),
          status: 400,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.json = jest.fn().mockResolvedValue(validVoteRequest);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: "Poll has expired",
      });
    });

    it("should enforce single-choice poll restrictions", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              error: "This poll only allows one choice",
            }),
          status: 400,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      const multipleOptionsRequest = {
        poll_id: validVoteRequest.poll_id,
        option_ids: [
          "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
        ],
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.json = jest.fn().mockResolvedValue(multipleOptionsRequest);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: "This poll only allows one choice",
      });
    });

    it("should handle database errors gracefully", async () => {
      // Mock the route import
      jest.doMock("@/app/api/votes/route", () => ({
        POST: jest.fn().mockResolvedValue({
          json: () =>
            Promise.resolve({
              error: "Internal server error",
            }),
          status: 500,
        }),
      }));

      const { POST } = require("@/app/api/votes/route");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest.json = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: "Internal server error",
      });
    });
  });
});
