-- Performance optimizations for the polling app
-- Run this in your Supabase SQL Editor to add performance enhancements

-- 1. Create a stored procedure to validate and record votes in a single transaction
-- This reduces multiple round-trips to the database and improves performance
CREATE OR REPLACE FUNCTION validate_and_record_vote(
    p_poll_id UUID,
    p_user_id UUID,
    p_option_ids UUID[],
    p_allow_multiple BOOLEAN
) RETURNS JSONB AS $$
DECLARE
    v_existing_vote UUID;
    v_valid_options UUID[];
    v_result JSONB;
BEGIN
    -- Check if user has already voted on this poll
    SELECT id INTO v_existing_vote
    FROM votes
    WHERE poll_id = p_poll_id AND user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_vote IS NOT NULL THEN
        RAISE EXCEPTION 'User has already voted on this poll' USING HINT = 'already voted';
    END IF;
    
    -- Validate option IDs belong to this poll
    SELECT array_agg(id) INTO v_valid_options
    FROM poll_options
    WHERE poll_id = p_poll_id AND id = ANY(p_option_ids);
    
    IF v_valid_options IS NULL OR array_length(v_valid_options, 1) != array_length(p_option_ids, 1) THEN
        RAISE EXCEPTION 'Invalid poll options' USING HINT = 'invalid options';
    END IF;
    
    -- For single-choice polls, ensure only one option is selected
    IF NOT p_allow_multiple AND array_length(p_option_ids, 1) > 1 THEN
        RAISE EXCEPTION 'This poll only allows one choice' USING HINT = 'single choice';
    END IF;
    
    -- Insert votes in a single transaction
    INSERT INTO votes (poll_id, option_id, user_id)
    SELECT p_poll_id, option_id, p_user_id
    FROM unnest(p_option_ids) AS option_id;
    
    -- Return success result
    v_result := jsonb_build_object('success', true);
    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Return error information
    v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'hint', SQLSTATE
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add index for faster poll option retrieval by order
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON poll_options(poll_id, order_index);

-- 3. Add index for faster expiration date filtering
CREATE INDEX IF NOT EXISTS idx_polls_expiry ON polls(expires_at) WHERE expires_at IS NOT NULL;

-- 4. Add index for faster public poll filtering
CREATE INDEX IF NOT EXISTS idx_polls_public_expiry ON polls(is_public, expires_at) WHERE is_public = true;

-- 5. Optimize the vote count trigger for better performance
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Use a more efficient update that processes multiple options at once
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

-- 6. Create a function to efficiently get poll results
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
    option_id UUID,
    option_text TEXT,
    vote_count INTEGER,
    percentage NUMERIC
) AS $$
DECLARE
    total_votes INTEGER;
BEGIN
    -- Get total votes for the poll
    SELECT SUM(vote_count) INTO total_votes FROM poll_options WHERE poll_id = p_poll_id;
    
    -- Return results with calculated percentages
    RETURN QUERY
    SELECT 
        po.id AS option_id,
        po.text AS option_text,
        po.vote_count,
        CASE 
            WHEN total_votes > 0 THEN ROUND((po.vote_count::NUMERIC / total_votes) * 100, 1)
            ELSE 0
        END AS percentage
    FROM poll_options po
    WHERE po.poll_id = p_poll_id
    ORDER BY po.order_index;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;