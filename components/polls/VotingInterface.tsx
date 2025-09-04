'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { PollWithOptions, UpdatedOption } from '@/lib/types';
import { RealtimeChannel, User } from '@supabase/supabase-js';
import { fetchWithCsrf } from '@/lib/csrf';

interface VotingInterfaceProps {
  pollId: string;
}

export function VotingInterface({ pollId }: VotingInterfaceProps) {
  const [poll, setPoll] = useState<PollWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    checkAuthAndFetchPoll();

    // Setup realtime subscription for vote updates
    setupRealtimeSubscription();

    // Cleanup subscription when component unmounts
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [pollId]);

  // Setup realtime subscription to poll_options changes
  const setupRealtimeSubscription = useCallback(() => {
    if (!pollId) return;

    // Remove existing subscription if any
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    // Create a new subscription
    const channel = supabase
      .channel(`poll-${pollId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'poll_options',
        filter: `poll_id=eq.${pollId}`
      }, (payload) => {
        // Update the poll option with new vote count
        const updatedOption = payload.new as UpdatedOption;

        setPoll(prevPoll => {
          if (!prevPoll) return null;

          // Find and update the specific option
          const updatedOptions = prevPoll.poll_options.map(option =>
            option.id === updatedOption.id
              ? { ...option, vote_count: updatedOption.vote_count }
              : option
          );

          // Recalculate total votes
          const newTotalVotes = updatedOptions.reduce(
            (sum, opt) => sum + opt.vote_count, 0
          );

          return {
            ...prevPoll,
            poll_options: updatedOptions,
            total_votes: newTotalVotes
          };
        });
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
        console.log('Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;
  }, [pollId, supabase]);

  const checkAuthAndFetchPoll = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Get poll data
      const { data, error: fetchError } = await supabase
        .from('polls')
        .select(`
          id, title, description, expires_at, allow_multiple_votes, creator_id,
          poll_options (id, text, vote_count, order_index)
        `)
        .eq('id', pollId)
        .eq('is_public', true)
        .single();

      // If user is authenticated, check vote status
      if (authUser) {
        const { data: existingVote } = await supabase
          .from('votes')
          .select('id')
          .eq('poll_id', pollId)
          .eq('user_id', authUser.id)
          .single();
        setHasVoted(!!existingVote);
      }

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Poll not found or is not publicly accessible');
        } else {
          setError(fetchError.message);
        }
        return;
      }

      // Check if poll is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This poll has expired and is no longer accepting votes');
        return;
      }

      // Performance optimization: Use memoized calculation for total votes
      // and pre-sorted options to avoid re-sorting on each render
      const sortedOptions = [...data.poll_options].sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0)
      );

      const totalVotes = sortedOptions.reduce(
        (sum, option) => sum + option.vote_count, 0
      );

      const pollData = {
        ...data,
        total_votes: totalVotes,
        poll_options: sortedOptions
      };

      setPoll(pollData as PollWithOptions);

    } catch (err) {
      console.error('Error fetching poll:', err);
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (optionId: string) => {
    if (!poll) return;

    if (poll.allow_multiple_votes) {
      // Multiple choice - toggle option
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      // Single choice - replace selection
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmitVote = async () => {
    if (!poll || selectedOptions.length === 0) return;

    if (!user) {
      setError('You must be logged in to vote on this poll');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Performance optimization: Use AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetchWithCsrf('/api/votes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            poll_id: pollId,
            option_ids: selectedOptions,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to submit vote');
        }

        // With realtime subscription in place, we can do an optimistic UI update
        // The subscription will correct any discrepancies automatically
        setPoll(prev => {
          if (!prev) return null;

          // Optimistically update the options that were voted for
          const updatedOptions = prev.poll_options.map(option => {
            const wasVotedFor = selectedOptions.includes(option.id);
            return wasVotedFor
              ? { ...option, vote_count: option.vote_count + 1 }
              : option;
          });

          // Recalculate total votes
          const newTotalVotes = updatedOptions.reduce(
            (sum, opt) => sum + opt.vote_count, 0
          );

          return {
            ...prev,
            poll_options: updatedOptions,
            total_votes: newTotalVotes
          };
        });

        setHasVoted(true);
        setSelectedOptions([]);
      } catch (fetchErr: unknown) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => router.push('/')}>Go Home</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Poll Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{poll.title}</CardTitle>
            <CardDescription>
              {poll.description && <p className="mb-2">{poll.description}</p>}
              <div className="flex items-center gap-4 text-sm">
                <span>By Anonymous</span>
                <span>•</span>
                <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
                {poll.expires_at && (
                  <>
                    <span>•</span>
                    <span>Expires {formatDate(poll.expires_at)}</span>
                  </>
                )}
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Voting Interface */}
        {!hasVoted ? (
          <Card>
            <CardHeader>
              <CardTitle>Cast Your Vote</CardTitle>
              <CardDescription>
                {poll.allow_multiple_votes
                  ? 'Select one or more options'
                  : 'Select one option'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    You need to be logged in to vote.
                    <Button
                      variant="link"
                      className="p-0 h-auto ml-1"
                      onClick={() => router.push('/login')}
                    >
                      Sign in here
                    </Button>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {poll.poll_options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3">
                    <input
                      type={poll.allow_multiple_votes ? 'checkbox' : 'radio'}
                      id={`option-${option.id}`}
                      name="poll-option"
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => handleOptionChange(option.id)}
                      disabled={!user || submitting}
                      className="w-4 h-4"
                    />
                    <Label
                      htmlFor={`option-${option.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {option.text}
                    </Label>
                  </div>
                ))}
              </div>

              {user && (
                <Button
                  onClick={handleSubmitVote}
                  disabled={selectedOptions.length === 0 || submitting}
                  className="w-full"
                >
                  {submitting ? 'Submitting...' : 'Submit Vote'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Thanks for voting!</h3>
                <p className="text-gray-600">Your vote has been recorded successfully.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Current Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {poll.poll_options.map((option) => {
                const percentage = (poll.total_votes && poll.total_votes > 0)
                  ? Math.round((option.vote_count / poll.total_votes) * 100)
                  : 0; return (
                    <div key={option.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{option.text}</span>
                        <span className="text-sm text-gray-500">
                          {option.vote_count} vote{option.vote_count !== 1 ? 's' : ''} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
