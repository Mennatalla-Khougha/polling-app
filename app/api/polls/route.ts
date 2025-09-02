import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPollSchema } from "@/lib/validations/polls";
import { CreatePollResponse, PollWithOptions } from "@/lib/types";

// Cache poll listings for 30 seconds to reduce database load
const CACHE_TTL = 30; // seconds
const userPollsCache = new Map();

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
    
    // Check cache first
    const cacheKey = `user-polls-${user.id}`;
    const now = Date.now();
    const cachedData = userPollsCache.get(cacheKey);
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL * 1000) {
      return NextResponse.json({ polls: cachedData.data });
    }

    // Performance optimization: Use a more efficient query with specific column selection
    const { data: polls, error } = await supabase
      .from("polls")
      .select(
        `
        id, title, description, created_at, expires_at, creator_id, is_public, allow_multiple_votes,
        poll_options (id, text, order_index)
      `,
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Process polls to include total votes and sort options
    const processedPolls = polls.map(poll => {
      // Sort options by order_index
      const sortedOptions = [...poll.poll_options].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );
      
      return {
        ...poll,
        poll_options: sortedOptions,
        total_votes: 0 // Initialize with 0 as we don't have vote counts yet
      };
    });
    
    // Cache the result
    userPollsCache.set(cacheKey, {
      timestamp: now,
      data: processedPolls
    });
    
    // Clean up old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up on each request
      const expiryTime = now - (CACHE_TTL * 2 * 1000); // Double TTL for safety
      for (const [key, value] of userPollsCache.entries()) {
        if (value.timestamp < expiryTime) {
          userPollsCache.delete(key);
        }
      }
    }

    return NextResponse.json({ polls: processedPolls });
  } catch (error) {
    console.error("Error fetching polls:", error);
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
