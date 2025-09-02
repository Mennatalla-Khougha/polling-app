import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPollSchema } from "@/lib/validations/polls";
import { PollWithOptions, PollOption } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Type for raw poll data from Supabase with poll_options
interface RawPollData {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  is_public: boolean;
  allow_multiple_votes: boolean;
  expires_at: string | null;
  created_at: string;
  poll_options: PollOption[];
}

// Cache poll data for 10 seconds to reduce database load
const CACHE_TTL = 10; // seconds
const pollCache = new Map();

export async function GET(request: NextRequest, { params }: PageProps) {
  try {
    const { id: pollId } = await params;
    const supabase = await createClient();
    const cacheKey = `poll-${pollId}`;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Check cache first (only for authenticated users)
    const now = Date.now();
    const cachedData = pollCache.get(cacheKey);
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL * 1000) {
      // Verify user can access this poll
      if (user && cachedData.data.creator_id === user.id) {
        return NextResponse.json({ poll: cachedData.data });
      }
    }
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Performance optimization: Use a more efficient query
    const { data: poll, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (*)
      `)
      .eq('id', pollId)
      .eq('creator_id', user.id)
      .single();

    if (error || !poll) {
      return NextResponse.json({ error: "Poll not found or you don't have permission to access it" }, { status: 404 });
    }

    const typedPoll = poll as RawPollData;

    // Calculate total votes
    const totalVotes = typedPoll.poll_options.reduce((sum: number, option: PollOption) => sum + option.vote_count, 0);

    // Pre-sort options to avoid re-sorting on each request
    const sortedOptions = [...typedPoll.poll_options].sort(
      (a: PollOption, b: PollOption) => (a.order_index || 0) - (b.order_index || 0)
    );

    const pollWithOptions: PollWithOptions = {
      ...typedPoll,
      total_votes: totalVotes,
      poll_options: sortedOptions
    };
    
    // Cache the result
    pollCache.set(cacheKey, {
      timestamp: now,
      data: pollWithOptions
    });
    
    // Clean up old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up on each request
      const expiryTime = now - (CACHE_TTL * 2 * 1000); // Double TTL for safety
      for (const [key, value] of pollCache.entries()) {
        if (value.timestamp < expiryTime) {
          pollCache.delete(key);
        }
      }
    }

    return NextResponse.json({ poll: pollWithOptions });
  } catch (error) {
    console.error('Poll fetch error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: PageProps) {
  try {
    const { id: pollId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createPollSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { title, description, is_public, allow_multiple_votes, expires_at, options } = validationResult.data;

    // Check if poll exists and user owns it
    const { data: existingPoll, error: pollCheckError } = await supabase
      .from('polls')
      .select('id, creator_id')
      .eq('id', pollId)
      .eq('creator_id', user.id)
      .single();

    if (pollCheckError || !existingPoll) {
      return NextResponse.json({ error: "Poll not found or you don't have permission to edit it" }, { status: 404 });
    }

    // Update poll
    const { data: updatedPoll, error: updateError } = await supabase
      .from('polls')
      .update({
        title,
        description,
        is_public,
        allow_multiple_votes,
        expires_at,
      })
      .eq('id', pollId)
      .eq('creator_id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Delete existing options
    const { error: deleteOptionsError } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', pollId);

    if (deleteOptionsError) {
      return NextResponse.json({ error: "Failed to update poll options" }, { status: 500 });
    }

    // Create new options
    const optionsToInsert = options.map((text, index) => ({
      poll_id: pollId,
      text,
      order_index: index,
    }));

    const { data: newOptions, error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsToInsert)
      .select();

    if (optionsError) {
      return NextResponse.json({ error: optionsError.message }, { status: 500 });
    }

    // Return updated poll with options
    const pollWithOptions: PollWithOptions = {
      ...updatedPoll,
      poll_options: newOptions,
      total_votes: 0, // Reset since we deleted all options
    };

    return NextResponse.json({ poll: pollWithOptions, success: true });
  } catch (error) {
    console.error('Poll update error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: PageProps) {
  try {
    const { id: pollId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if poll exists and user owns it
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, creator_id')
      .eq('id', pollId)
      .eq('creator_id', user.id)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({ error: "Poll not found or you don't have permission to delete it" }, { status: 404 });
    }

    // Delete the poll (cascade will handle options and votes)
    const { error: deleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)
      .eq('creator_id', user.id);

    if (deleteError) {
      console.error('Poll deletion error:', deleteError);
      return NextResponse.json({ error: "Failed to delete poll" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete poll error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
