import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { voteSchema } from "@/lib/validations/polls";
import { VoteResponse } from "@/lib/types";

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

    // Check if poll exists and is accessible
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

    // Get updated vote counts
    const { data: updatedOptions, error: countError } = await supabase
      .from("poll_options")
      .select("id, vote_count")
      .eq("poll_id", poll_id);

    if (countError) {
      console.error("Count fetch error:", countError);
    }

    const response: VoteResponse = {
      success: true,
      updated_options: updatedOptions || undefined,
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
