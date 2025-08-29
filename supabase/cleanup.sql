-- Cleanup script to remove all previously generated tables and functions
-- Run this in Supabase SQL Editor before applying the new simplified schema

-- Drop triggers first
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS polls_updated_at ON polls;
DROP TRIGGER IF EXISTS votes_count_trigger ON votes;
DROP TRIGGER IF EXISTS poll_option_counts_sync_trigger ON poll_option_counts;

-- Drop functions
DROP FUNCTION IF EXISTS create_profile_for_user();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS update_poll_option_counts();
DROP FUNCTION IF EXISTS sync_option_vote_counts();
DROP FUNCTION IF EXISTS generate_poll_slug(TEXT);

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS poll_shares;
DROP TABLE IF EXISTS poll_option_counts;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS poll_options;
DROP TABLE IF EXISTS polls;
DROP TABLE IF EXISTS profiles;

-- Drop custom types
DROP TYPE IF EXISTS poll_visibility;
DROP TYPE IF EXISTS vote_policy;
