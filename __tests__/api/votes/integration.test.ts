import { POST } from '@/app/api/votes/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createMockSupabaseClient,
  createMockRequest,
  mockUser,
  mockPoll,
  mockPollOptions,
  createMultiVotePoll,
  createExpiredPoll,
  createPrivatePoll,
  validVoteRequest,
  validMultiVoteRequest,
  invalidVoteRequest,
} from '../../utils/test-helpers';

// Mock the Supabase client
jest.mock('@/lib/supabase/server');
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/votes - Integration Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('Complete voting flow', () => {
    it('should handle the complete voting process end-to-end', async () => {
      // Setup: User authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Step 1: Poll lookup and validation
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      // Step 2: Check for existing votes (none found)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Step 3: Validate poll options
      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }],
        error: null,
      });

      // Step 4: Insert vote
      mockSupabase.insert.mockResolvedValue({
        data: [
          {
            id: 'vote-123',
            poll_id: 'poll-123',
            option_id: 'option-1',
            user_id: 'user-123',
          },
        ],
        error: null,
      });

      // Step 5: Fetch updated vote counts
      mockSupabase.eq.mockReturnValueOnce({
        data: [
          { id: 'option-1', vote_count: 1 },
          { id: 'option-2', vote_count: 0 },
        ],
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      // Verify successful response
      expect(response.status).toBe(201);
      expect(responseData).toEqual({
        success: true,
        updated_options: [
          { id: 'option-1', vote_count: 1 },
          { id: 'option-2', vote_count: 0 },
        ],
      });

      // Verify all steps were called in correct order
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('polls');
      expect(mockSupabase.from).toHaveBeenCalledWith('votes');
      expect(mockSupabase.from).toHaveBeenCalledWith('poll_options');
      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
    });

    it('should handle multi-vote polls correctly', async () => {
      const multiVotePoll = createMultiVotePoll();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validMultiVoteRequest);

      // Mock poll lookup
      mockSupabase.single.mockResolvedValueOnce({
        data: multiVotePoll,
        error: null,
      });

      // Mock no existing votes
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock valid options for both selected options
      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }, { id: 'option-2' }],
        error: null,
      });

      // Mock successful vote insertion
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock updated vote counts
      mockSupabase.eq.mockReturnValueOnce({
        data: [
          { id: 'option-1', vote_count: 1 },
          { id: 'option-2', vote_count: 1 },
        ],
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);

      // Verify multiple votes were inserted
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: 'poll-123',
          option_id: 'option-1',
          user_id: 'user-123',
        },
        {
          poll_id: 'poll-123',
          option_id: 'option-2',
          user_id: 'user-123',
        },
      ]);
    });
  });

  describe('Error scenarios integration', () => {
    it('should handle auth failure followed by retry', async () => {
      // First attempt: auth failure
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      const mockRequest = createMockRequest(validVoteRequest);

      const firstResponse = await POST(mockRequest as NextRequest);
      const firstResponseData = await firstResponse.json();

      expect(firstResponse.status).toBe(401);
      expect(firstResponseData.error).toBe('You must be logged in to vote');

      // Reset and retry with valid auth
      jest.clearAllMocks();
      mockSupabase = createMockSupabaseClient();
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const retryRequest = createMockRequest(validVoteRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: 'option-1', vote_count: 1 }],
        error: null,
      });

      const retryResponse = await POST(retryRequest as NextRequest);
      const retryResponseData = await retryResponse.json();

      expect(retryResponse.status).toBe(201);
      expect(retryResponseData.success).toBe(true);
    });

    it('should handle cascade of validation errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Invalid request body
      const mockRequest = createMockRequest(invalidVoteRequest);

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid vote data');
      expect(responseData.details).toBeDefined();

      // Verify no database operations were performed
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle poll not found after auth success', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Mock poll not found
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Poll not found or not accessible');

      // Verify no vote-related operations were performed
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });
  });

  describe('Business logic validation', () => {
    it('should enforce single-choice restriction consistently', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Try to vote for multiple options on single-choice poll
      const multiVoteOnSingleChoiceRequest = {
        poll_id: 'poll-123',
        option_ids: ['option-1', 'option-2', 'option-3'],
      };

      const mockRequest = createMockRequest(multiVoteOnSingleChoiceRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll, // allow_multiple_votes is false
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [
          { id: 'option-1' },
          { id: 'option-2' },
          { id: 'option-3' },
        ],
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('This poll only allows one choice');

      // Verify no votes were inserted
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should validate option ownership by poll', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Try to vote for option that doesn't belong to the poll
      const invalidOptionRequest = {
        poll_id: 'poll-123',
        option_ids: ['option-from-different-poll'],
      };

      const mockRequest = createMockRequest(invalidOptionRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: mockPoll,
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock options check - no matching options found
      mockSupabase.in.mockReturnValueOnce({
        data: [], // No valid options found
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid poll options');

      // Verify the options validation query
      expect(mockSupabase.eq).toHaveBeenCalledWith('poll_id', 'poll-123');
      expect(mockSupabase.in).toHaveBeenCalledWith('id', ['option-from-different-poll']);
    });

    it('should enforce expiration time correctly', async () => {
      const expiredPoll = createExpiredPoll();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: expiredPoll,
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Poll has expired');

      // Verify no further operations were performed
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should respect public poll restriction', async () => {
      const privatePoll = createPrivatePoll();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Mock poll lookup for private poll (should not be found due to is_public filter)
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Poll not found or not accessible');

      // Verify the query includes the public filter
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_public', true);
    });
  });

  describe('Race condition scenarios', () => {
    it('should handle concurrent votes from same user (simulate race condition)', async () => {
      // This test simulates what happens if two requests from the same user
      // reach the server at nearly the same time

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest1 = createMockRequest(validVoteRequest);
      const mockRequest2 = createMockRequest(validVoteRequest);

      // Both requests see the poll as valid
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockPoll, error: null })
        .mockResolvedValueOnce({ data: mockPoll, error: null });

      // Both requests initially see no existing vote
      mockSupabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Both see valid options
      mockSupabase.in
        .mockReturnValueOnce({ data: [{ id: 'option-1' }], error: null })
        .mockReturnValueOnce({ data: [{ id: 'option-1' }], error: null });

      // First insert succeeds, second fails (database constraint)
      mockSupabase.insert
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'duplicate key violation' },
        });

      // Mock updated options fetch for successful request
      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: 'option-1', vote_count: 1 }],
        error: null,
      });

      // Execute both requests
      const response1 = await POST(mockRequest1 as NextRequest);
      const response2 = await POST(mockRequest2 as NextRequest);

      const responseData1 = await response1.json();
      const responseData2 = await response2.json();

      // First request should succeed
      expect(response1.status).toBe(201);
      expect(responseData1.success).toBe(true);

      // Second request should fail due to database constraint
      expect(response2.status).toBe(500);
      expect(responseData2.error).toBe('Failed to record vote');
    });
  });

  describe('Data consistency verification', () => {
    it('should verify vote data structure matches expected format', async () => {
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
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: 'option-1', vote_count: 1 }],
        error: null,
      });

      await POST(mockRequest as NextRequest);

      // Verify the exact structure of vote data being inserted
      const insertedData = mockSupabase.insert.mock.calls[0][0];
      expect(insertedData).toEqual([
        {
          poll_id: validVoteRequest.poll_id,
          option_id: validVoteRequest.option_ids[0],
          user_id: mockUser.id,
        },
      ]);

      // Verify all required fields are present
      expect(insertedData[0]).toHaveProperty('poll_id');
      expect(insertedData[0]).toHaveProperty('option_id');
      expect(insertedData[0]).toHaveProperty('user_id');
    });

    it('should ensure vote count updates are requested after insertion', async () => {
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
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }],
        error: null,
      });

      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.eq.mockReturnValueOnce({
        data: [{ id: 'option-1', vote_count: 1 }],
        error: null,
      });

      await POST(mockRequest as NextRequest);

      // Verify the order of operations
      const calls = mockSupabase.from.mock.calls;
      const insertCall = mockSupabase.insert.mock.calls;
      const finalSelectCall = mockSupabase.eq.mock.calls.slice(-1)[0];

      expect(calls).toContain(['votes']); // For insertion
      expect(calls).toContain(['poll_options']); // For updated counts
      expect(insertCall.length).toBe(1);
      expect(finalSelectCall).toEqual(['poll_id', validVoteRequest.poll_id]);
    });
  });

  describe('Edge cases and error recovery', () => {
    it('should handle partial option validation failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Request with 2 options, but only 1 is valid
      const partialValidRequest = {
        poll_id: 'poll-123',
        option_ids: ['option-1', 'invalid-option'],
      };

      const mockRequest = createMockRequest(partialValidRequest);

      mockSupabase.single.mockResolvedValueOnce({
        data: createMultiVotePoll(),
        error: null,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Only one option returned (partial match)
      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }], // Only 1 out of 2 requested options
        error: null,
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Invalid poll options');
    });

    it('should handle network timeout simulation', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockRequest = createMockRequest(validVoteRequest);

      // Simulate network timeout during poll lookup
      mockSupabase.single.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should maintain data integrity when count fetch fails but vote succeeds', async () => {
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
        data: null,
        error: { code: 'PGRST116' },
      });

      mockSupabase.in.mockReturnValueOnce({
        data: [{ id: 'option-1' }],
        error: null,
      });

      // Vote insertion succeeds
      mockSupabase.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Count fetch fails
      mockSupabase.eq.mockReturnValueOnce({
        data: null,
        error: new Error('Count fetch failed'),
      });

      const response = await POST(mockRequest as NextRequest);
      const responseData = await response.json();

      // Should still return success since vote was recorded
      expect(response.status).toBe(201);
      expect(responseData).toEqual({
        success: true,
        updated_options: undefined,
      });

      // Verify vote was still inserted despite count fetch failure
      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          poll_id: validVoteRequest.poll_id,
          option_id: validVoteRequest.option_ids[0],
          user_id: mockUser.id,
        },
      ]);
    });
  });
});
