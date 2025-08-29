'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { PollWithOptions } from '@/lib/types';

interface PollDetailsProps {
  pollId: string;
}

export function PollDetails({ pollId }: PollDetailsProps) {
  const [poll, setPoll] = useState<PollWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchPollDetails();
  }, [pollId]);

  const fetchPollDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to view poll details');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('polls')
        .select(`
          *,
          poll_options (*),
          profiles!polls_creator_id_fkey (
            display_name,
            email
          )
        `)
        .eq('id', pollId)
        .eq('creator_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Poll not found or you do not have permission to view it');
        } else {
          setError(fetchError.message);
        }
        return;
      }

      // Calculate total votes
      const totalVotes = data.poll_options.reduce((sum, option) => sum + option.vote_count, 0);
      
      setPoll({
        ...data,
        total_votes: totalVotes,
        poll_options: data.poll_options.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      });
    } catch (err) {
      console.error('Error fetching poll:', err);
      setError('Failed to load poll details');
    } finally {
      setLoading(false);
    }
  };

  const getVotingUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/polls/${pollId}`;
    }
    return '';
  };

  const copyToClipboard = async () => {
    try {
      const url = getVotingUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = () => {
    if (!poll) return null;
    
    const now = new Date();
    const expiry = poll.expires_at ? new Date(poll.expires_at) : null;
    
    if (expiry && expiry < now) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md">Expired</span>;
    }
    
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">Active</span>;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => window.history.back()}>Go Back</Button>
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{poll.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge()}
              <span className="text-sm text-gray-500">
                Created {formatDate(poll.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Poll Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Poll Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Poll Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {poll.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-gray-600 mt-1">{poll.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Visibility</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {poll.is_public ? 'Public' : 'Private'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Voting Type</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {poll.allow_multiple_votes ? 'Multiple Choice' : 'Single Choice'}
                    </p>
                  </div>
                </div>

                {poll.expires_at && (
                  <div>
                    <Label className="text-sm font-medium">Expires</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(poll.expires_at)}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Total Votes</Label>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{poll.total_votes}</p>
                </div>
              </CardContent>
            </Card>

            {/* Share Poll */}
            <Card>
              <CardHeader>
                <CardTitle>Share Your Poll</CardTitle>
                <CardDescription>
                  Share this link with others so they can vote on your poll
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="voting-url">Voting URL</Label>
                  <div className="flex mt-1">
                    <Input
                      id="voting-url"
                      value={getVotingUrl()}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={copyToClipboard}
                      className="ml-2"
                      variant="outline"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Anyone with this link can vote on your poll
                  {poll.is_public ? ' (publicly accessible)' : ' (private poll)'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Current Results</CardTitle>
                <CardDescription>
                  Live vote counts for each option
                </CardDescription>
              </CardHeader>
              <CardContent>
                {poll.poll_options.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No options available</p>
                ) : (
                  <div className="space-y-4">
                    {poll.poll_options.map((option) => {
                      const percentage = poll.total_votes > 0 
                        ? Math.round((option.vote_count / poll.total_votes) * 100)
                        : 0;
                      
                      return (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button 
                onClick={() => window.open(getVotingUrl(), '_blank')}
                className="flex-1"
              >
                Preview Voting Page
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Back to Polls
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
