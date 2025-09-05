import { z } from 'zod';

/**
 * Poll Validation Schemas
 * 
 * This module provides validation schemas for poll-related operations,
 * ensuring data integrity and consistency throughout the application.
 * 
 * These schemas are critical for maintaining data quality and preventing
 * invalid or malicious data from entering the system. They enforce
 * business rules such as minimum option counts, title length requirements,
 * and proper date formatting.
 */

/**
 * Schema for validating poll creation and update requests
 * 
 * This schema enforces several important business rules:
 * - Titles must be between 3-200 characters (balancing brevity and descriptiveness)
 * - Descriptions are optional but limited to 1000 characters
 * - Polls must have at least 2 options (for meaningful voting)
 * - Each option must have text between 1-200 characters
 * - Expiry dates must be in the future
 * 
 * These validations are essential for ensuring polls are usable and
 * maintain a consistent user experience across the application.
 */
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

/**
 * Schema for validating vote submissions
 * 
 * This schema ensures that votes contain the necessary data and follow the
 * correct format before being processed by the system. It enforces:
 * - Valid UUID format for poll and option identifiers
 * - At least one option must be selected
 * 
 * This validation is critical for preventing malformed vote data and
 * ensuring that all votes can be properly recorded and counted.
 * It serves as the first line of defense against invalid or
 * potentially malicious vote submissions.
 */
export const voteSchema = z.object({
  poll_id: z.string().uuid('Invalid poll ID'),
  option_ids: z.array(z.string().uuid('Invalid option ID'))
    .min(1, 'Must select at least one option')
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
