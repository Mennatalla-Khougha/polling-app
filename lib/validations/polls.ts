import { z } from 'zod';

// Poll creation validation schema
export const createPollSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable(),
  is_public: z.boolean().default(true),
  allow_multiple_votes: z.boolean().default(false),
  expires_at: z.string()
    .refine((val) => {
      if (!val) return true; // Allow empty string
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    }, 'Expiry date must be in the future')
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      return new Date(val).toISOString();
    }),
  options: z.array(z.string()
    .min(1, 'Option cannot be empty')
    .max(200, 'Option must be less than 200 characters'))
    .min(2, 'Poll must have at least 2 options')
    .max(10, 'Poll cannot have more than 10 options')
});

// Vote validation schema
export const voteSchema = z.object({
  poll_id: z.string().uuid('Invalid poll ID'),
  option_ids: z.array(z.string().uuid('Invalid option ID'))
    .min(1, 'Must select at least one option')
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
