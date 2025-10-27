-- ============================================================================
-- COMPLETE WINNER SYSTEM - ALL FEATURES PRESERVED
-- ============================================================================
-- This keeps ALL features and separates each into its own SQL function
-- - Timer (30 seconds for testing, can be changed)
-- - Join function
-- - Payout function  
-- - Score update function
-- - Reset function
-- ============================================================================

-- 1. FIX JOIN FUNCTION (remove ambiguity)
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session CASCADE;

CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
    session_id_param UUID,
    user_id_param UUID,
    entry_fee_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    new_pot NUMERIC;
    new_participants_count INTEGER;
BEGIN
    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF user_record.tokens < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    UPDATE public.users SET tokens = tokens - entry_fee_param, updated_at = NOW() WHERE id = user_id_param;
    
    INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at)
    VALUES (session_id_param, user_id_param, NOW())
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    new_pot := COALESCE(session_record.current_pot, 0) + entry_fee_param;
    new_participants_count := COALESCE(session_record.participants_count, 0) + 1;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        current_pot = new_pot,
        participants_count = new_participants_count,
        status = CASE WHEN new_pot >= session_record.base_price THEN 'active' ELSE 'waiting' END,
        timer_started_at = CASE WHEN new_pot >= session_record.base_price AND timer_started_at IS NULL THEN NOW() ELSE timer_started_at END,
        timer_duration = 30, -- 30 seconds for testing
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined session',
        'new_pot', new_pot,
        'participants_count', new_participants_count,
        'status', CASE WHEN new_pot >= session_record.base_price THEN 'active' ELSE 'waiting' END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, NUMERIC) TO authenticated, anon;


-- 2. PAYOUT FUNCTION (for button)
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(
    user_id_param UUID,
    token_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_tokens NUMERIC;
    new_tokens NUMERIC;
BEGIN
    SELECT tokens INTO old_tokens FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    new_tokens := COALESCE(old_tokens, 0) + token_amount;
    
    UPDATE public.users SET tokens = new_tokens, updated_at = NOW() WHERE id = user_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tokens added successfully',
        'tokens_before', old_tokens,
        'tokens_after', new_tokens
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_tokens_to_user(UUID, NUMERIC) TO authenticated, anon;


-- 3. SCORE UPDATE FUNCTION
CREATE OR REPLACE FUNCTION public.update_winner_takes_all_score(
    session_id_param UUID,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.winner_takes_all_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Score updated successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated, anon;


-- 4. SESSION RESET FUNCTION
CREATE OR REPLACE FUNCTION public.reset_winner_session(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.winner_takes_all_participants WHERE session_id = session_id_param;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        current_pot = 0,
        participants_count = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        prize_amount = NULL,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Session reset successfully'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_winner_session(UUID) TO authenticated, anon;


-- All done!
SELECT 'All Winner Takes All functions created successfully!' as status;

