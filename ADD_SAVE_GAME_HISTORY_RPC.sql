-- ============================================
-- ADD SAVE_GAME_HISTORY RPC FOR PRACTICE GAMES
-- ============================================
-- Frontend calls save_game_history, but we created record_game_history
-- This creates a wrapper function to bridge the gap
-- ============================================

-- Create save_game_history RPC that frontend expects
CREATE OR REPLACE FUNCTION public.save_game_history(
    p_user_id UUID,
    p_game_type TEXT,
    p_score NUMERIC,
    p_accuracy NUMERIC,
    p_avg_reaction_time NUMERIC DEFAULT 0,
    p_game_duration NUMERIC DEFAULT 60,
    p_is_practice BOOLEAN DEFAULT true,
    p_listing_id UUID DEFAULT NULL,
    p_entry_number INTEGER DEFAULT NULL,
    p_placement INTEGER DEFAULT NULL,
    p_prize_won NUMERIC DEFAULT 0,
    p_tokens_wagered NUMERIC DEFAULT 0,
    p_tokens_won NUMERIC DEFAULT 0,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history_id UUID;
    v_session_type TEXT;
BEGIN
    -- Determine session type
    v_session_type := CASE 
        WHEN p_is_practice THEN 'practice'
        ELSE 'competition'
    END;
    
    -- Call the record_game_history function
    v_history_id := public.record_game_history(
        p_user_id := p_user_id,
        p_game_type := p_game_type,
        p_session_type := v_session_type,
        p_session_id := NULL, -- Practice games don't have session IDs
        p_score := p_score,
        p_accuracy := p_accuracy,
        p_avg_reaction_time := p_avg_reaction_time,
        p_tokens_won := COALESCE(p_tokens_won, p_prize_won, 0),
        p_tokens_spent := p_tokens_wagered,
        p_result := 'participated',
        p_listing_title := NULL
    );
    
    RETURN v_history_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.save_game_history TO authenticated;

-- Test the function
SELECT 
    '✅ Testing save_game_history function' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'save_game_history' 
            AND pg_catalog.pg_function_is_visible(oid)
        ) THEN 'Function created successfully'
        ELSE 'Function not found'
    END as status;

-- Success message
SELECT '✅ save_game_history RPC created! Practice games will now save to game_history table and appear in dashboard.' as status;

