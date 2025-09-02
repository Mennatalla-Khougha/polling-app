// Test utilities for mocking and common test data

import type { MockSupabaseClient, MockNextRequest } from "../../jest.types";

export const mockUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "test@example.com",
  user_metadata: {
    display_name: "Test User",
  },
};

export const mockPoll = {
  id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  title: "Test Poll",
  description: "A test poll",
  creator_id: "550e8400-e29b-41d4-a716-446655440000",
  is_public: true,
  allow_multiple_votes: false,
  expires_at: null,
  created_at: new Date().toISOString(),
};

export const mockPollOptions = [
  {
    id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    poll_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    text: "Option 1",
    vote_count: 0,
    order_index: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    poll_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    text: "Option 2",
    vote_count: 0,
    order_index: 1,
    created_at: new Date().toISOString(),
  },
];

export const mockVote = {
  id: "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
  poll_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  option_id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  created_at: new Date().toISOString(),
};

// Utility to create a mock Supabase client
export const createMockSupabaseClient = (): MockSupabaseClient => {
  const mockClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => mockClient),
    select: jest.fn(() => mockClient),
    eq: jest.fn(() => mockClient),
    in: jest.fn(() => mockClient),
    single: jest.fn(() => mockClient),
    insert: jest.fn(() => mockClient),
    update: jest.fn(() => mockClient),
    delete: jest.fn(() => mockClient),
  } as MockSupabaseClient;

  return mockClient;
};

// Utility to create a mock NextRequest
export const createMockRequest = (
  body?: any,
  headers?: Record<string, string>,
): MockNextRequest => {
  return {
    json: jest.fn().mockResolvedValue(body || {}),
    headers: new Headers(headers || {}),
    method: "POST",
    url: "http://localhost:3000/api/votes",
  };
};

// Common error responses
export const authErrorResponse = {
  error: "You must be logged in to vote",
};

export const pollNotFoundResponse = {
  error: "Poll not found or not accessible",
};

export const pollExpiredResponse = {
  error: "Poll has expired",
};

export const alreadyVotedResponse = {
  error: "You have already voted on this poll",
};

export const invalidOptionsResponse = {
  error: "Invalid poll options",
};

export const singleChoiceErrorResponse = {
  error: "This poll only allows one choice",
};

export const voteFailedResponse = {
  error: "Failed to record vote",
};

export const internalErrorResponse = {
  error: "Internal server error",
};

// Utility to create expired poll
export const createExpiredPoll = () => ({
  ...mockPoll,
  expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
});

// Utility to create future poll
export const createFuturePoll = () => ({
  ...mockPoll,
  expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
});

// Utility to create multi-vote poll
export const createMultiVotePoll = () => ({
  ...mockPoll,
  allow_multiple_votes: true,
});

// Utility to create private poll
export const createPrivatePoll = () => ({
  ...mockPoll,
  is_public: false,
});

// Valid request bodies for testing
export const validVoteRequest = {
  poll_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  option_ids: ["6ba7b811-9dad-11d1-80b4-00c04fd430c8"],
};

export const validMultiVoteRequest = {
  poll_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  option_ids: [
    "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  ],
};

// Invalid request bodies for testing
export const invalidVoteRequest = {
  poll_id: "invalid-uuid",
  option_ids: [],
};

export const emptyVoteRequest = {};

export const missingPollIdRequest = {
  option_ids: ["6ba7b811-9dad-11d1-80b4-00c04fd430c8"],
};

export const missingOptionIdsRequest = {
  poll_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
};

// UUID validation helpers
export const generateValidUUID = () => "550e8400-e29b-41d4-a716-446655440000";
export const generateInvalidUUID = () => "invalid-uuid";

// Date helpers
export const getDateInPast = (daysAgo: number = 1) =>
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

export const getDateInFuture = (daysAhead: number = 1) =>
  new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

// Mock response builder
export const buildSuccessResponse = (data: any, status: number = 200) => ({
  json: () => Promise.resolve(data),
  status,
});

export const buildErrorResponse = (error: any, status: number = 400) => ({
  json: () => Promise.resolve(error),
  status,
});
