-- Comprehensive fix for poll creation issues
-- Run this in your Supabase SQL Editor to fix the foreign key and order_index issues

-- 1. Add missing order_index column to poll_options table
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 2. Add the unique constraint for order_index (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_poll_option_order'
    ) THEN
        ALTER TABLE poll_options ADD CONSTRAINT unique_poll_option_order UNIQUE(poll_id, order_index);
    END IF;
END $$;

-- 3. Create any missing profiles for existing users
-- This ensures all auth.users have corresponding profiles
INSERT INTO profiles (id, email, display_name, created_at)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
    u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Fix the profile creation trigger to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.created_at
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Drop and recreate the trigger to ensure it's working
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
