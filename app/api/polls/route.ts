import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPollSchema } from "@/lib/validations/polls";
import { CreatePollResponse, PollWithOptions } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's polls
    const { data: polls, error } = await supabase
      .from("polls")
      .select(
        `
        *,
        poll_options (*)
      `,
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ polls });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email!,
        display_name:
          user.user_metadata?.display_name || user.email!.split("@")[0],
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 },
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    console.log("Received poll data:", JSON.stringify(body, null, 2));

    const validationResult = createPollSchema.safeParse(body);

    if (!validationResult.success) {
      console.log(
        "Validation errors:",
        JSON.stringify(validationResult.error.issues, null, 2),
      );
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      is_public,
      allow_multiple_votes,
      expires_at,
      options,
    } = validationResult.data;

    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        title,
        description,
        creator_id: user.id,
        is_public,
        allow_multiple_votes,
        expires_at,
      })
      .select()
      .single();

    if (pollError) {
      return NextResponse.json({ error: pollError.message }, { status: 500 });
    }

    // Create poll options
    const optionsToInsert = options.map((text, index) => ({
      poll_id: poll.id,
      text,
      order_index: index, // Add proper order_index
    }));

    const { data: pollOptions, error: optionsError } = await supabase
      .from("poll_options")
      .insert(optionsToInsert)
      .select();

    if (optionsError) {
      // Clean up the poll if options creation failed
      await supabase.from("polls").delete().eq("id", poll.id);
      return NextResponse.json(
        { error: optionsError.message },
        { status: 500 },
      );
    }

    // Return complete poll with options
    const pollWithOptions: PollWithOptions = {
      ...poll,
      poll_options: pollOptions,
      total_votes: 0,
    };

    const response: CreatePollResponse = {
      poll: pollWithOptions,
      success: true,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Poll creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
