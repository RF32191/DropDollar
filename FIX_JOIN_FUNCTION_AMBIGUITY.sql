-- Fix ambiguous join function error
-- Drop all versions of the function

DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session CASCADE;

-- Create ONE version with NUMERIC (not INTEGER)
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
    result JSONB;
BEGIN
    -- Get session info
    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Get user info
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Check if user has enough tokens
    IF user_record.tokens < entry_fee_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens from user
    UPDATE public.users 
    SET tokens = tokens - entry_fee_param, updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Add participant (avoid duplicate)
    INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at)
    VALUES (session_id_param, user_id_param, NOW())
    ON CONFLICT (session_id, user_id) DO NOTHING;
    
    -- Update session pot and participant count
    new_pot := COALESCE(session_record.current_pot, 0) + entry_fee_param;
    new_participants_count := COALESCE(session_record.participants_count, 0) + 1;
    
    -- Update session with proper status and timer logic
    UPDATE public.winner_takes_all_sessions
    SET 
        current_pot = new_pot,
        participants_count = new_participants_count,
        status = CASE 
            WHEN new_pot >= session_record.base_price THEN 'active'
            ELSE 'waiting'
        END,
        timer_started_at = CASE 
            WHEN new_pot >= session_record.base_price AND timer_started_at IS NULL THEN NOW()
            ELSE timer_started_at
        END,
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

SELECT 'Join function fixed - using NUMERIC only' as status;

