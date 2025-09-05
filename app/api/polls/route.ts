import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPollSchema } from "@/lib/validations/polls";
import { CreatePollResponse, PollWithOptions } from "@/lib/types";

/**
 * Poll Management API Routes
 * 
 * This module provides the core API endpoints for managing polls, including:
 * - Retrieving a user's polls with efficient caching
 * - Creating new polls with validation
 * 
 * These endpoints are critical for the application as they handle the primary
 * data operations that enable users to create and manage their polls. The implementation
 * includes performance optimizations like caching and efficient database queries
 * to ensure the application remains responsive even with many polls.
 */

// Cache poll listings for 30 seconds to reduce database load
const CACHE_TTL = 30; // seconds
const userPollsCache = new Map();

/**
 * GET /api/polls
 * 
 * Retrieves all polls created by the authenticated user with optimized caching.
 * 
 * This function is essential for the poll management dashboard, allowing users to view
 * and manage their created polls. It implements several performance optimizations:
 * 
 * 1. In-memory caching with TTL to reduce database load
 * 2. Selective column fetching to minimize data transfer
 * 3. Periodic cache cleanup to prevent memory leaks
 * 4. Pre-sorting of poll options to avoid client-side sorting
 * 
 * The caching mechanism is particularly important for users with many polls,
 * as it significantly reduces database load and improves response times.
 * 
 * @returns {Promise<NextResponse>} JSON response with user's polls or error
 */
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

/**
 * POST /api/polls
 * 
 * Creates a new poll with the provided details and options.
 * 
 * This function is critical to the core functionality of the application as it handles
 * the creation of new polls. It performs several important tasks:
 * 
 * 1. Validates user authentication and creates a profile if needed
 * 2. Validates the poll data against a schema to ensure data integrity
 * 3. Creates the poll record in the database
 * 4. Creates associated poll options with proper ordering
 * 5. Handles error cases with appropriate cleanup
 * 
 * The function includes a transaction-like pattern where if option creation fails,
 * the poll is deleted to maintain data consistency. This prevents orphaned polls
 * without options.
 * 
 * @param {NextRequest} request - The incoming request with poll data
 * @returns {Promise<NextResponse>} JSON response with created poll or error
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
