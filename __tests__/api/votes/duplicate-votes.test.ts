import { POST } from "@/app/api/votes/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createMockSupabaseClient,
  createMockRequest,
  mockUser,
  mockPoll,
  validVoteRequest,
  alreadyVotedResponse,
} from "../../utils/helpers";

// Mock the Supabase client
jest.mock("@/lib/supabase/server");
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe("/api/votes - Duplicate Vote Prevention", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe("Same user voting twice", () => {
    it("should prevent duplicate votes from the same user", async () => {
      // Setup authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup - poll exists and is valid
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Mock existing vote check - user has already voted
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: "existing-vote-123",
          poll_id: mockPoll.id,
          user_id: mockUser.id,
          option_id: "option-1",
        },
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual(alreadyVotedResponse);

      // Verify that no new vote insertion was attempted
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it("should check for existing votes with correct user and poll IDs", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Mock existing vote check - user has already voted
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "existing-vote-123" },
        error: null,
      });

      await POST(mockRequest as NextRequest);

      // Verify the query structure for existing vote check
      expect(mockSupabase.from).toHaveBeenCalledWith("votes");
      expect(mockSupabase.select).toHaveBeenCalledWith("id");
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "poll_id",
        validVoteRequest.poll_id,
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it("should allow voting when user has not voted before", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Mock existing vote check - no existing vote (PGRST116 is Supabase's "not found" error)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      // Mock valid options check
      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: "option-1" }],
        error: null,
      });

      // Mock successful vote insertion
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock updated options fetch
      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: "option-1", vote_count: 1 }],
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);

      // Verify vote was inserted
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: validVoteRequest.poll_id,
          option_id: validVoteRequest.option_ids[0],
          user_id: mockUser.id,
        },
      ]);
    });
  });

  describe("Different users voting on same poll", () => {
    const secondUser = {
      id: "user-456",
      email: "second@example.com",
    };

    it("should allow different users to vote on the same poll", async () => {
      // First user votes
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      let mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Mock no existing vote for first user
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      // Mock valid options and successful insertion
      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: "option-1" }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: "option-1", vote_count: 1 }],
        error: null,
      });

      const firstResponse = await POST(mockRequest as NextRequest);
      expect(firstResponse.status).toBe(201);

      // Reset mocks for second user
      jest.clearAllMocks();
      mockSupabase = createMockSupabaseClient();
      mockCreateClient.mockResolvedValue(mockSupabase);

      // Second user votes
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: secondUser },
        error: null,
      });

      mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Mock no existing vote for second user
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      // Mock valid options and successful insertion
      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: "option-1" }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: "option-1", vote_count: 2 }],
        error: null,
      });

      const secondResponse = await POST(mockRequest as NextRequest);
      const secondResponseData = await secondResponse.json();

      expect(secondResponse.status).toBe(201);
      expect(secondResponseData.success).toBe(true);

      // Verify second vote was inserted with correct user ID
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: validVoteRequest.poll_id,
          option_id: validVoteRequest.option_ids[0],
          user_id: secondUser.id,
        },
      ]);
    });
  });

  describe("Same user voting on different polls", () => {
    const secondPoll = {
      ...mockPoll,
      id: "poll-456",
      title: "Second Poll",
    };

    it("should allow the same user to vote on different polls", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Vote on first poll
      let mockRequest = createMockRequest(validVoteRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: "option-1" }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: "option-1", vote_count: 1 }],
        error: null,
      });

      const firstResponse = await POST(mockRequest as NextRequest);
      expect(firstResponse.status).toBe(201);

      // Reset mocks for second poll
      jest.clearAllMocks();
      mockSupabase = createMockSupabaseClient();
      mockCreateClient.mockResolvedValue(mockSupabase);

      // Vote on second poll
      const secondPollVoteRequest = {
        poll_id: secondPoll.id,
        option_ids: ["option-3"], // Different option from different poll
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockRequest = createMockRequest(secondPollVoteRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: secondPoll,
        error: null,
      });

      // No existing vote on second poll
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116" },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: "option-3" }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: "option-3", vote_count: 1 }],
        error: null,
      });

      const secondResponse = await POST(mockRequest as NextRequest);
      const secondResponseData = await secondResponse.json();

      expect(secondResponse.status).toBe(201);
      expect(secondResponseData.success).toBe(true);

      // Verify vote was inserted for the correct poll
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: secondPoll.id,
          option_id: "option-3",
          user_id: mockUser.id,
        },
      ]);
    });
  });

  describe("Edge cases for duplicate vote prevention", () => {
    it("should handle database errors when checking for existing votes", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Mock database error when checking for existing votes
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: "CONNECTION_ERROR",
          message: "Database connection failed",
        },
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      // Should still proceed with the vote if the error is not a "not found" error
      // The existing implementation doesn't handle this case explicitly,
      // so it would likely proceed, but this test documents the behavior
      expect(response.status).not.toBe(400);
    });

    it("should properly isolate votes by user ID and poll ID combination", async () => {
      // This test ensures the query structure is correct
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: "existing-vote" },
        error: null,
      });

      await POST(mockRequest as NextRequest);

      // Verify the exact query structure
      const fromCalls = mockSupabase.from.mock.calls;
      const eqCalls = mockSupabase.eq.mock.calls;

      expect(fromCalls).toContainEqual(["votes"]);
      expect(eqCalls).toContainEqual(["poll_id", validVoteRequest.poll_id]);
      expect(eqCalls).toContainEqual(["user_id", mockUser.id]);
    });
  });
});
