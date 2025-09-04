'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { PollWithOptions } from '@/lib/types';
import { fetchWithCsrf } from '@/lib/csrf';

export function PollsList() {
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to view your polls');
        return;
      }

      const response = await fetchWithCsrf('/api/polls');
      if (!response.ok) {
        throw new Error('Failed to fetch polls');
      }

      const result = await response.json();
      setPolls(result.polls || []);
    } catch (err) {
      console.error('Error fetching polls:', err);
      setError('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    try {
      const response = await fetchWithCsrf(`/api/polls/${pollId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete poll');
      }

      // Remove poll from local state
      setPolls(prev => prev.filter(poll => poll.id !== pollId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete poll');
    }
  };

  const copyVotingUrl = async (pollId: string) => {
    try {
      const url = `${window.location.origin}/polls/${pollId}`;
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (poll: PollWithOptions) => {
    const now = new Date();
    const expiry = poll.expires_at ? new Date(poll.expires_at) : null;
    
    if (expiry && expiry < now) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md">Expired</span>;
    }
    
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">Active</span>;
  };

  const filteredPolls = polls.filter(poll =>
    poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (poll.description && poll.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Polls</h1>
          <p className="text-gray-600 mt-1">Manage and share your polling campaigns</p>
        </div>
        <Button onClick={() => router.push('/polls/create')}>
          Create New Poll
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="max-w-md">
        <Label htmlFor="search">Search polls</Label>
        <Input
          id="search"
          type="text"
          placeholder="Search by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{polls.length}</div>
            <p className="text-xs text-muted-foreground">Total Polls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {polls.reduce((sum, poll) => sum + (poll.total_votes || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Votes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {polls.filter(poll => {
                const expiry = poll.expires_at ? new Date(poll.expires_at) : null;
                return !expiry || expiry > new Date();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Polls</p>
          </CardContent>
        </Card>
      </div>

      {/* Polls List */}
      {filteredPolls.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              {polls.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No polls yet</h3>
                  <p className="text-gray-600 mb-4">Create your first poll to get started</p>
                  <Button onClick={() => router.push('/polls/create')}>
                    Create Your First Poll
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No polls match your search</h3>
                  <p className="text-gray-600">Try adjusting your search terms</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPolls.map((poll) => (
            <Card key={poll.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{poll.title}</CardTitle>
                      {getStatusBadge(poll)}
                    </div>
                    <CardDescription className="mt-2">
                      {poll.description && <p className="mb-2">{poll.description}</p>}
                      <div className="flex items-center gap-4 text-sm">
                        <span>Created {formatDate(poll.created_at)}</span>
                        <span>•</span>
                        <span>{poll.total_votes || 0} vote{poll.total_votes !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{poll.poll_options.length} option{poll.poll_options.length !== 1 ? 's' : ''}</span>
                        {poll.expires_at && (
                          <>
                            <span>•</span>
                            <span>Expires {formatDate(poll.expires_at)}</span>
                          </>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Poll Options Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Options:</h4>
                    <div className="space-y-1">
                      {poll.poll_options.slice(0, 3).map((option) => {
                        const percentage = poll.total_votes ? 
                          Math.round((option.vote_count / poll.total_votes) * 100) : 0;
                        
                        return (
                          <div key={option.id} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{option.text}</span>
                            <span className="text-gray-500 ml-2">
                              {option.vote_count} ({percentage}%)
                            </span>
                          </div>
                        );
                      })}
                      {poll.poll_options.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{poll.poll_options.length - 3} more option{poll.poll_options.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => router.push(`/polls/${poll.id}/manage`)}
                    >
                      Manage
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/polls/${poll.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyVotingUrl(poll.id)}
                    >
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/polls/${poll.id}`, '_blank')}
                    >
                      Preview
                    </Button>
                    {deleteConfirm === poll.id ? (
                      <div className="flex gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePoll(poll.id)}
                        >
                          Confirm Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(poll.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
