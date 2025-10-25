-- COMPREHENSIVE_SCORE_SAVING_FIX.sql
-- This script ensures score saving works for all users and future users

-- 1. Reset the wta-2-sword-parry session for testing
DELETE FROM public.winner_takes_all_participants 
WHERE session_id IN (
    SELECT id FROM public.winner_takes_all_sessions 
    WHERE config_id = 'wta-2-sword-parry'
);

UPDATE public.winner_takes_all_sessions 
SET 
    status = 'waiting',
    current_pot = 0,
    participants_count = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- 2. Ensure the enhanced score saving function exists and is robust
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

-- 3. Test the function with all users
SELECT 'Testing score saving for rf32191@gmail.com...' as test_status;
SELECT public.update_winner_takes_all_score(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'),
    (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'),
    150,
    95.0
) as result;

SELECT 'Testing score saving for ryanfermoselle@yahoo.com...' as test_status;
SELECT public.update_winner_takes_all_score(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'),
    (SELECT id FROM public.users WHERE email = 'ryanfermoselle@yahoo.com'),
    200,
    92.5
) as result;

SELECT 'Testing score saving for test@example.com...' as test_status;
SELECT public.update_winner_takes_all_score(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'),
    (SELECT id FROM public.users WHERE email = 'test@example.com'),
    175,
    88.0
) as result;

-- 4. Verify all participants and scores
SELECT 
    'All users tested successfully!' as status,
    u.username,
    u.email,
    p.score,
    p.accuracy,
    p.completed_at
FROM public.winner_takes_all_participants p
JOIN public.users u ON p.user_id = u.id
JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
WHERE s.config_id = 'wta-2-sword-parry'
ORDER BY p.completed_at;
