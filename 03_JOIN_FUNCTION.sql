-- ============================================================================
-- JOIN FUNCTION FOR WINNER TAKES ALL
-- ============================================================================
-- Feature 3: Join Function
-- - Users join with entry fee
-- - Deducts tokens from user wallet
-- - Adds tokens to pot
-- - Starts timer when base price met
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
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined session',
        'new_pot', new_pot,
        'participants_count', new_participants_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_winner_takes_all_session(UUID, UUID, NUMERIC) TO authenticated, anon;

SELECT 'Join Function: Fixed and ready!' as status;

