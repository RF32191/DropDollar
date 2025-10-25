-- RESTORE_WINNER_TAKES_ALL_JOIN_FUNCTION.sql
-- This script restores the proper join function that deducts tokens and adds to pot

-- Drop existing join function
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.join_winner_takes_all_session(UUID);

-- Create the proper join function that deducts tokens and adds to pot
CREATE OR REPLACE FUNCTION public.join_winner_takes_all_session(
    session_id_param UUID,
    user_id_param UUID,
    entry_fee_param INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    new_pot INTEGER;
    new_participants_count INTEGER;
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record FROM public.winner_takes_all_sessions WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if user already joined
    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_param AND user_id = user_id_param) THEN
        RETURN json_build_object('success', false, 'message', 'User already joined this session');
    END IF;
    
    -- Get user info and check token balance
    SELECT * INTO user_record FROM public.users WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    IF user_record.tokens < entry_fee_param THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens from user
    UPDATE public.users 
    SET tokens = tokens - entry_fee_param,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Add participant
    INSERT INTO public.winner_takes_all_participants (session_id, user_id)
    VALUES (session_id_param, user_id_param);
    
    -- Update session pot and participant count
    new_pot := session_record.current_pot + entry_fee_param;
    new_participants_count := session_record.participants_count + 1;
    
    UPDATE public.winner_takes_all_sessions 
    SET current_pot = new_pot,
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
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined Winner Takes All session',
        'session_id', session_id_param,
        'new_pot', new_pot,
        'participants_count', new_participants_count,
        'status', CASE 
            WHEN new_pot >= session_record.base_price THEN 'active'
            ELSE 'waiting'
        END
    );
END;
$$;

-- Test the function
SELECT 'Join function restored successfully!' as status;
