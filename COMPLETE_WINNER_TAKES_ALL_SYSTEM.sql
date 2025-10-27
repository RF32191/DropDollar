-- ============================================================================
-- COMPLETE WINNER TAKES ALL SYSTEM - RUN ONCE AND DONE!
-- ============================================================================
-- This one SQL file creates all functions needed for the autonomous system
-- Run this ONCE in Supabase SQL Editor and everything will work
-- ============================================================================

-- ============================================================================
-- FEATURE 1: TIMER SYSTEM (30 seconds for testing)
-- ============================================================================

UPDATE public.winner_takes_all_sessions 
SET timer_duration = 30, updated_at = NOW()
WHERE config_id LIKE 'wta-%';

ALTER TABLE public.winner_takes_all_sessions 
ALTER COLUMN timer_duration SET DEFAULT 30;

-- ============================================================================
-- FEATURE 2: PAYOUT SYSTEM
-- ============================================================================

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
        'tokens_before', old_tokens,
        'tokens_after', new_tokens
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_tokens_to_user(UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- FEATURE 3: JOIN FUNCTION (with timer auto-start)
-- ============================================================================

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
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object('success', true, 'message', 'Joined successfully', 'new_pot', new_pot);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- FEATURE 4: SCORE UPDATE
-- ============================================================================

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
    SET score = score_param, accuracy = accuracy_param, completed_at = NOW(), updated_at = NOW()
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_winner_takes_all_score(UUID, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- FEATURE 5: RESET FUNCTION (for manual reset if needed)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_winner_session(session_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.winner_takes_all_participants WHERE session_id = session_id_param;
    
    UPDATE public.winner_takes_all_sessions
    SET status = 'waiting', current_pot = 0, participants_count = 0,
        timer_started_at = NULL, winner_user_id = NULL, prize_amount = NULL, updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_winner_session(UUID) TO authenticated, anon;

-- ============================================================================
-- DONE! System is now autonomous
-- ============================================================================

SELECT '✅ Winner Takes All system is now autonomous and ready!' as status;
