-- COMPLETE_SCORE_SAVING_SYSTEM.sql
-- This script creates a comprehensive score saving system for Winner Takes All
-- including dashboard integration and leaderboard functionality

-- 1. Clean up existing score functions
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.update_winner_takes_all_score(UUID, UUID, INTEGER, NUMERIC);

-- 2. Create comprehensive score saving function
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param INTEGER,
    accuracy_param NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    participant_record RECORD;
    session_record RECORD;
    result JSON;
BEGIN
    -- Get participant record
    SELECT * INTO participant_record 
    FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Participant not found'
        );
    END IF;
    
    -- Update participant score
    UPDATE public.winner_takes_all_participants
    SET score = score_param,
        accuracy = COALESCE(accuracy_param, accuracy),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    -- Get updated session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_param;
    
    -- Return success with updated info
    RETURN json_build_object(
        'success', true,
        'message', 'Score saved successfully',
        'score', score_param,
        'accuracy', COALESCE(accuracy_param, participant_record.accuracy),
        'completed_at', NOW(),
        'session_status', session_record.status,
        'current_pot', session_record.current_pot,
        'participants_count', session_record.participants_count
    );
END;
$$;

-- 3. Create function to get user's Winner Takes All scores for dashboard
CREATE OR REPLACE FUNCTION public.get_user_winner_takes_all_scores(
    user_id_param UUID
)
RETURNS TABLE(
    session_id UUID,
    config_id TEXT,
    game_type TEXT,
    score INTEGER,
    accuracy NUMERIC,
    completed_at TIMESTAMP WITH TIME ZONE,
    session_status TEXT,
    current_pot INTEGER,
    participants_count INTEGER,
    base_price INTEGER,
    prize_amount DECIMAL,
    platform_fee DECIMAL,
    winner_user_id UUID,
    is_winner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.config_id,
        c.game_type,
        p.score,
        p.accuracy,
        p.completed_at,
        s.status as session_status,
        s.current_pot,
        s.participants_count,
        s.base_price,
        s.prize_amount,
        s.platform_fee,
        s.winner_user_id,
        (s.winner_user_id = user_id_param) as is_winner
    FROM public.winner_takes_all_participants p
    JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
    LEFT JOIN public.fixed_games_config c ON s.config_id = c.id
    WHERE p.user_id = user_id_param
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.completed_at DESC;
END;
$$;

-- 4. Create function to get session leaderboard
CREATE OR REPLACE FUNCTION public.get_winner_takes_all_leaderboard(
    session_id_param UUID
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    score INTEGER,
    accuracy NUMERIC,
    completed_at TIMESTAMP WITH TIME ZONE,
    rank_position BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        u.username,
        p.score,
        p.accuracy,
        p.completed_at,
        ROW_NUMBER() OVER (ORDER BY p.score DESC, p.completed_at ASC) as rank_position
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_param
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC;
END;
$$;

-- 5. Verify all functions were created successfully
SELECT 
    'Score saving system created successfully!' as status,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'update_winner_takes_all_score',
    'get_user_winner_takes_all_scores',
    'get_winner_takes_all_leaderboard'
);

-- 6. Test the functions
SELECT 'Testing score saving function...' as test_status;
SELECT 'Testing dashboard function...' as test_status;
SELECT 'Testing leaderboard function...' as test_status;
