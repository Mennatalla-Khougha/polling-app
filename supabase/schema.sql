-- Simplified Polling App Database Schema for Supabase
-- MVP version focusing on core functionality: polls, options, and votes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Polls table
CREATE TABLE polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL CHECK (LENGTH(title) >= 3 AND LENGTH(title) <= 200),
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    is_public BOOLEAN DEFAULT true,
    allow_multiple_votes BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Poll options table
CREATE TABLE poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL CHECK (LENGTH(text) >= 1 AND LENGTH(text) <= 200),
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate votes per user per poll (for single-vote polls)
    UNIQUE(poll_id, user_id)
);

-- Basic indexes for performance
CREATE INDEX idx_polls_creator ON polls(creator_id);
CREATE INDEX idx_polls_public ON polls(is_public);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX idx_votes_poll ON votes(poll_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- Simple function to update vote counts
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE poll_options
        SET vote_count = vote_count + 1
        WHERE id = NEW.option_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE poll_options
        SET vote_count = GREATEST(vote_count - 1, 0)
        WHERE id = OLD.option_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain vote counts
CREATE TRIGGER vote_count_trigger
    AFTER INSERT OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_counts();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Anyone can view, users can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Polls: Public polls viewable by all, private polls only by creator
CREATE POLICY "Public polls are viewable by everyone" ON polls
    FOR SELECT USING (is_public = true OR creator_id = auth.uid());
CREATE POLICY "Users can create polls" ON polls
    FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own polls" ON polls
    FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Users can delete own polls" ON polls
    FOR DELETE USING (auth.uid() = creator_id);

-- Poll options: Viewable if poll is accessible, manageable by poll creator
CREATE POLICY "Poll options viewable if poll accessible" ON poll_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = poll_options.poll_id
            AND (polls.is_public = true OR polls.creator_id = auth.uid())
        )
    );
CREATE POLICY "Poll creators can manage options" ON poll_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = poll_options.poll_id
            AND polls.creator_id = auth.uid()
        )
    );

-- Votes: Viewable if poll accessible, users can vote on accessible polls
CREATE POLICY "Votes viewable if poll accessible" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = votes.poll_id
            AND (polls.is_public = true OR polls.creator_id = auth.uid())
        )
    );
CREATE POLICY "Users can vote on accessible polls" ON votes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM polls
            WHERE polls.id = votes.poll_id
            AND polls.is_public = true
            AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
        )
    );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
