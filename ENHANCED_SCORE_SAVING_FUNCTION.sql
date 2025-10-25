-- ENHANCED_SCORE_SAVING_FUNCTION.sql
-- This script creates an enhanced score saving function that handles all users
-- including those who haven't joined the session yet

-- Enhanced score saving function that handles non-participants
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
    user_record RECORD;
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session not found'
        );
    END IF;
    
    -- Get user info
    SELECT * INTO user_record 
    FROM public.users 
    WHERE id = user_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'User not found'
        );
    END IF;
    
    -- Check if user is already a participant
    SELECT * INTO participant_record 
    FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param AND user_id = user_id_param;
    
    -- If not a participant, add them as one (this handles the case where user plays without joining)
    IF NOT FOUND THEN
        INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at)
        VALUES (session_id_param, user_id_param, NOW())
        RETURNING * INTO participant_record;
        
        -- Update session participant count
        UPDATE public.winner_takes_all_sessions
        SET participants_count = participants_count + 1,
            updated_at = NOW()
        WHERE id = session_id_param;
    END IF;
    
    -- Update participant score
    UPDATE public.winner_takes_all_participants
    SET score = score_param,
        accuracy = COALESCE(accuracy_param, accuracy),
        completed_at = NOW()
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
        'participants_count', session_record.participants_count,
        'was_new_participant', NOT FOUND
    );
END;
$$;

-- Test the enhanced function
SELECT 'Enhanced score saving function created successfully!' as status;

-- Verify function exists
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'update_winner_takes_all_score' 
AND routine_schema = 'public';
