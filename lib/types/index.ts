// TypeScript types placeholder

// Database types based on the simplified schema
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  is_public: boolean;
  allow_multiple_votes: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  vote_count: number;
  order_index?: number;
  created_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  created_at: string;
}

// Extended types with relations
export interface PollWithOptions extends Poll {
  poll_options: PollOption[];
  creator?: Profile;
  total_votes?: number;
}

// Form/API types
export interface CreatePollRequest {
  title: string;
  description?: string | null;
  is_public?: boolean;
  allow_multiple_votes?: boolean;
  expires_at?: string | null;
  options: string[];
}

export interface CreatePollResponse {
  poll: PollWithOptions;
  success: boolean;
  error?: string;
  details?: ValidationError[];
}

export interface VoteRequest {
  poll_id: string;
  option_ids: string[];
}

export interface VoteResponse {
  success: boolean;
  error?: string;
  updated_options?: UpdatedOption[];
}

// Validation error types
export interface ValidationError {
  code: string;
  expected?: string;
  received?: string;
  path: (string | number)[];
  message: string;
}

// Add proper types for Supabase user and updated options to lib/types/index.ts
export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UpdatedOption {
  id: string;
  poll_id: string;
  vote_count: number;
}
