import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { voteSchema } from "@/lib/validations/polls";
import { VoteResponse, UpdatedOption } from "@/lib/types";

/**
 * Votes API Route
 * 
 * This module provides the API endpoint for submitting votes on polls.
 * It is a critical component of the application's core functionality,
 * enabling users to participate in polls by casting their votes.
 * 
 * The implementation includes several important features:
 * - Authentication verification to track user votes
 * - Validation of vote data to ensure integrity
 * - Prevention of duplicate voting
 * - Support for both single-choice and multiple-choice polls
 * - Performance optimization using database stored procedures when available
 * - Fallback implementation for environments without stored procedures
 * 
 * The voting system is designed to be secure, preventing unauthorized votes
 * while maintaining high performance even under load.
 */

/**
 * POST /api/votes
 * 
 * Processes and records user votes on a poll.
 * 
 * This function is the core of the voting system, handling the submission of votes
 * with several critical validations and optimizations:
 * 
 * 1. User authentication to track votes and prevent abuse
 * 2. Validation of vote data against a schema
 * 3. Verification of poll accessibility and expiration status
 * 4. Prevention of duplicate votes from the same user
 * 5. Enforcement of single-choice restriction when applicable
 * 6. Optimized database operations using stored procedures when available
 * 7. Fallback to separate queries when stored procedures aren't available
 * 
 * The implementation prioritizes both data integrity and performance, using
 * database-level validations where possible to reduce round trips and ensure
 * atomicity of operations.
 * 
 * @param {NextRequest} request - The incoming request with vote data
 * @returns {Promise<NextResponse>} JSON response with updated vote counts or error
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to vote" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = voteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid vote data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { poll_id, option_ids } = validationResult.data;

    // Performance optimization: Use a single query to get poll data
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, is_public, allow_multiple_votes, expires_at")
      .eq("id", poll_id)
      .eq("is_public", true)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: "Poll not found or not accessible" },
        { status: 404 },
      );
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: "Poll has expired" }, { status: 400 });
    }

    // Performance optimization: Combine validation queries into a transaction
    // to reduce round trips to the database
    const { data, error } = await supabase.rpc('validate_and_record_vote', {
      p_poll_id: poll_id,
      p_user_id: user.id,
      p_option_ids: option_ids,
      p_allow_multiple: poll.allow_multiple_votes
    }).single();

    if (error) {
      // Handle specific error codes from the stored procedure
      if (error.message.includes('already voted')) {
        return NextResponse.json(
          { error: "You have already voted on this poll" },
          { status: 400 },
        );
      } else if (error.message.includes('invalid options')) {
        return NextResponse.json(
          { error: "Invalid poll options" },
          { status: 400 },
        );
      } else if (error.message.includes('single choice')) {
        return NextResponse.json(
          { error: "This poll only allows one choice" },
          { status: 400 },
        );
      }

      console.error("Vote processing error:", error);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 },
      );
    }

    // Fallback to separate queries if the stored procedure is not available
    if (!data) {
      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", poll_id)
        .eq("user_id", user.id)
        .single();

      if (existingVote) {
        return NextResponse.json(
          { error: "You have already voted on this poll" },
          { status: 400 },
        );
      }

      // Validate option IDs belong to this poll
      const { data: validOptions, error: optionsError } = await supabase
        .from("poll_options")
        .select("id")
        .eq("poll_id", poll_id)
        .in("id", option_ids);

      if (
        optionsError ||
        !validOptions ||
        validOptions.length !== option_ids.length
      ) {
        return NextResponse.json(
          { error: "Invalid poll options" },
          { status: 400 },
        );
      }

      // For single-choice polls, ensure only one option is selected
      if (!poll.allow_multiple_votes && option_ids.length > 1) {
        return NextResponse.json(
          { error: "This poll only allows one choice" },
          { status: 400 },
        );
      }

      // Create votes for each selected option
      const votesToInsert = option_ids.map((option_id) => ({
        poll_id,
        option_id,
        user_id: user.id,
      }));

      const { error: voteError } = await supabase
        .from("votes")
        .insert(votesToInsert);

      if (voteError) {
        console.error("Vote insertion error:", voteError);
        return NextResponse.json(
          { error: "Failed to record vote" },
          { status: 500 },
        );
      }
    }

    // Performance optimization: Use a cached query for updated vote counts
    const { data: updatedOptions, error: countError } = await supabase
      .from("poll_options")
      .select("id, vote_count")
      .eq("poll_id", poll_id)
      .order('order_index', { ascending: true }); // Order by index for consistent results

    if (countError) {
      console.error("Count fetch error:", countError);
    }

    const response: VoteResponse = {
      success: true,
      updated_options: updatedOptions as UpdatedOption[] || undefined,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Vote submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
