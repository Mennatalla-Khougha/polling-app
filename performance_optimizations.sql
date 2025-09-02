-- Performance optimizations for polling app

-- Create a stored procedure to validate and record votes in a single transaction
CREATE OR REPLACE FUNCTION validate_and_record_vote(
  p_poll_id UUID,
  p_user_id UUID,
  p_option_ids UUID[]
) RETURNS JSONB AS $$
DECLARE
  v_poll RECORD;
  v_option RECORD;
  v_existing_vote RECORD;
  v_result JSONB;
  v_updated_options JSONB[];
  v_option_id UUID;
BEGIN
  -- Check if poll exists and is not expired
  SELECT * INTO v_poll FROM polls WHERE id = p_poll_id;
  
  IF v_poll IS NULL THEN
    RETURN jsonb_build_object('error', 'Poll not found', 'status', 404);
  END IF;
  
  IF v_poll.expires_at IS NOT NULL AND v_poll.expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'This poll has expired', 'status', 400);
  END IF;
  
  -- Check if user has already voted
  SELECT * INTO v_existing_vote FROM votes WHERE poll_id = p_poll_id AND user_id = p_user_id LIMIT 1;
  
  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'You have already voted in this poll', 'status', 400);
  END IF;
  
  -- Validate option IDs
  FOR v_option_id IN SELECT unnest(p_option_ids)
  LOOP
    SELECT * INTO v_option FROM poll_options WHERE id = v_option_id AND poll_id = p_poll_id;
    
    IF v_option IS NULL THEN
      RETURN jsonb_build_object('error', 'Invalid option ID', 'status', 400);
    END IF;
  END LOOP;
  
  -- For single choice polls, ensure only one option is selected
  IF NOT v_poll.is_multiple_choice AND array_length(p_option_ids, 1) > 1 THEN
    RETURN jsonb_build_object('error', 'This poll only allows a single choice', 'status', 400);
  END IF;
  
  -- Insert votes
  INSERT INTO votes (poll_id, user_id, option_id)
  SELECT p_poll_id, p_user_id, unnest(p_option_ids);
  
  -- Get updated options
  SELECT 
    jsonb_agg(jsonb_build_object(
      'id', po.id,
      'vote_count', po.vote_count
    )) INTO v_updated_options
  FROM poll_options po
  WHERE po.poll_id = p_poll_id;
  
  -- Return success with updated options
  RETURN jsonb_build_object(
    'success', true,
    'updated_options', v_updated_options
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'status', 500);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id_user_id ON votes(poll_id, user_id);
CREATE INDEX IF NOT EXISTS idx_polls_creator_id_created_at ON polls(creator_id, created_at DESC);

-- Optimize the update_vote_counts trigger function
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Increment vote count for the option
    UPDATE poll_options
    SET vote_count = vote_count + 1
    WHERE id = NEW.option_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Decrement vote count for the option
    UPDATE poll_options
    SET vote_count = vote_count - 1
    WHERE id = OLD.option_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get poll results efficiently
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
  poll_id UUID,
  poll_title TEXT,
  option_id UUID,
  option_text TEXT,
  vote_count INTEGER,
  percentage NUMERIC
) AS $$
DECLARE
  v_total_votes INTEGER;
BEGIN
  -- Get total votes for the poll
  SELECT SUM(vote_count) INTO v_total_votes FROM poll_options WHERE poll_id = p_poll_id;
  
  -- Return results with percentage
  RETURN QUERY
  SELECT 
    po.poll_id,
    p.title AS poll_title,
    po.id AS option_id,
    po.text AS option_text,
    po.vote_count,
    CASE 
      WHEN v_total_votes > 0 THEN ROUND((po.vote_count::NUMERIC / v_total_votes) * 100, 2)
      ELSE 0
    END AS percentage
  FROM 
    poll_options po
    JOIN polls p ON po.poll_id = p.id
  WHERE 
    po.poll_id = p_poll_id
  ORDER BY 
    po.order_index;
    
END;
$$ LANGUAGE plpgsql;