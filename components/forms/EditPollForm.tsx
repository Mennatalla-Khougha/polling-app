'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { CreatePollRequest, PollWithOptions } from '@/lib/types';

interface EditPollFormProps {
  pollId: string;
}

export function EditPollForm({ pollId }: EditPollFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [options, setOptions] = useState(['', '']);

  const supabase = createClient();

  useEffect(() => {
    fetchPollData();
  }, [pollId]);

  const fetchPollData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to edit polls');
        return;
      }

      const response = await fetch(`/api/polls/${pollId}`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to fetch poll data');
      }

      const { poll }: { poll: PollWithOptions } = await response.json();
      
      // Populate form with existing data
      setTitle(poll.title);
      setDescription(poll.description || '');
      setIsPublic(poll.is_public);
      setAllowMultipleVotes(poll.allow_multiple_votes);
      setExpiresAt(poll.expires_at ? new Date(poll.expires_at).toISOString().slice(0, 16) : '');
      setOptions(poll.poll_options.map(option => option.text));

    } catch (err) {
      console.error('Error fetching poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to load poll data');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validateForm = () => {
    if (!title.trim()) return 'Title is required';
    if (title.length < 3) return 'Title must be at least 3 characters';
    if (title.length > 200) return 'Title must be less than 200 characters';
    
    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) return 'At least 2 options are required';
    
    for (const option of validOptions) {
      if (option.length > 200) return 'Options must be less than 200 characters';
    }

    if (description && description.length > 1000) {
      return 'Description must be less than 1000 characters';
    }

    if (expiresAt) {
      const expiry = new Date(expiresAt);
      if (expiry <= new Date()) {
        return 'Expiry date must be in the future';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const pollData: CreatePollRequest = {
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        allow_multiple_votes: allowMultipleVotes,
        expires_at: expiresAt || null,
        options: options.filter(opt => opt.trim()).map(opt => opt.trim()),
      };

      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pollData),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details.map((err: any) => 
            `${err.path?.join?.('.') || 'Field'}: ${err.message}`
          ).join(', ');
          throw new Error(errorMessages);
        }
        throw new Error(result.error || 'Failed to update poll');
      }

      // Redirect back to poll management page
      router.push(`/polls/${pollId}/manage`);
    } catch (err) {
      console.error('Error updating poll:', err);
      setError(err instanceof Error ? err.message : 'Failed to update poll');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !title) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => router.back()}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Poll</CardTitle>
          <CardDescription>
            Update your poll details and options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your poll about?"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about your poll..."
                maxLength={1000}
              />
            </div>

            <div className="space-y-4">
              <Label>Poll Options *</Label>
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={200}
                    required
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              
              {options.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  className="w-full"
                >
                  Add Option
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isPublic">Make poll public</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowMultipleVotes"
                  checked={allowMultipleVotes}
                  onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="allowMultipleVotes">Allow multiple choices</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Updating...' : 'Update Poll'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
