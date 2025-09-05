/**
 * Application Type Definitions
 * 
 * This module defines the core data structures used throughout the application,
 * providing type safety and documentation for the poll management system.
 * 
 * The types are organized into several categories:
 * - Database entity types (Poll, PollOption, Vote, Profile)
 * - Extended types with relations (PollWithOptions)
 * - API request/response types
 * - Validation error types
 * 
 * These type definitions are critical for maintaining consistency across
 * the application and ensuring that data is properly structured at all levels,
 * from database to UI components.
 */

/**
 * Database entity types
 * 
 * These types directly correspond to database tables and are used for
 * type-safe database operations. They represent the core data model
 * of the application.
/**
 * User profile information
 * 
 * Represents a user in the system with their basic identity information.
 * This type is used for displaying creator information and managing
 * user-specific features.
 */
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

/**
 * Poll entity
 * 
 * Represents the core poll object with its configuration settings.
 * This is the central data structure of the application, containing
 * all the metadata about a poll but not its options or votes.
 */
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

/**
 * Poll option entity
 * 
 * Represents a single voting option within a poll.
 * Each poll contains multiple options that users can vote on.
 * The order_index field is used for consistent display ordering.
 */
export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  vote_count: number;
  order_index?: number;
  created_at: string;
}

/**
 * Vote entity
 * 
 * Represents a single vote cast by a user for a specific option.
 * This is the record of user participation in polls and is used
 * for vote counting and preventing duplicate votes.
 */
export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  created_at: string;
}

/**
 * Extended types with relations
 * 
 * These types extend the base database types with related entities
 * and computed fields for easier consumption in the UI.
 */

/**
 * Poll with its options and related data
 * 
 * This is the primary data structure used throughout the UI for displaying
 * polls with their voting options. It includes the poll metadata, options,
 * creator information, and aggregated vote count for efficient rendering.
 * 
 * This type is critical for the poll management and voting interfaces,
 * providing all the necessary data in a single structure.
 */
export interface PollWithOptions extends Poll {
  poll_options: PollOption[];
  creator?: Profile;
  total_votes?: number;
}

/**
 * Form/API types
 * 
 * These types define the structure of data exchanged between the client
 * and server during API requests and responses. They ensure consistent
 * data formatting and validation.
 */

/**
 * Request body for creating or updating a poll
 * 
 * This structure is used when submitting the poll creation/edit form.
 * It contains all the configurable aspects of a poll, including its
 * options as simple strings (which will be converted to PollOption
 * entities on the server).
 */
export interface CreatePollRequest {
  title: string;
  description?: string | null;
  is_public?: boolean;
  allow_multiple_votes?: boolean;
  expires_at?: string | null;
  options: string[];
}

/**
 * Response from poll creation/update API
 * 
 * This structure is returned after attempting to create or update a poll.
 * It includes the created/updated poll data on success, or error information
 * if the operation failed. The detailed validation errors help provide
 * specific feedback to users about form issues.
 */
export interface CreatePollResponse {
  poll: PollWithOptions;
  success: boolean;
  error?: string;
  details?: ValidationError[];
}

/**
 * Request body for submitting votes
 * 
 * This structure is used when a user casts votes on a poll.
 * It supports both single-choice and multiple-choice polls through
 * the option_ids array, which contains one or more selected options.
 */
export interface VoteRequest {
  poll_id: string;
  option_ids: string[];
}

/**
 * Response from vote submission API
 * 
 * This structure is returned after attempting to record votes.
 * On success, it includes the updated vote counts for affected options,
 * allowing the UI to update immediately without refetching the entire poll.
 * On failure, it provides error information to display to the user.
 */
export interface VoteResponse {
  success: boolean;
  error?: string;
  updated_options?: UpdatedOption[];
}

/**
 * Validation error types
 * 
 * These types provide structured information about validation failures,
 * allowing the UI to display specific error messages to users.
 */

/**
 * Detailed validation error information
 * 
 * This structure follows the Zod validation error format and provides
 * specific information about what validation rule failed and why.
 * It's used to give users precise feedback about form errors.
 */
export interface ValidationError {
  code: string;
  expected?: string;
  received?: string;
  path: (string | number)[];
  message: string;
}

/**
 * Authentication and integration types
 * 
 * These types facilitate integration with external services and libraries.
 */

/**
 * Supabase user structure
 * 
 * This type represents the user object returned by Supabase authentication.
 * It's used to extract user information for profile creation and authentication
 * checks throughout the application.
 */
export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Updated option vote count
 * 
 * This structure represents the updated state of a poll option after
 * votes have been cast. It's used to efficiently update the UI without
 * requiring a full poll refetch after voting.
 */
export interface UpdatedOption {
  id: string;
  poll_id: string;
  vote_count: number;
}
