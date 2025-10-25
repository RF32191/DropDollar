-- FIXED_PAYOUT_AND_RESET_SYSTEM.sql
-- This script fixes the payout system and ensures proper game reset

-- ============================================
-- SIMPLE AND RELIABLE PAYOUT FUNCTION
-- ============================================

-- Create a simpler, more reliable payout function
CREATE OR REPLACE FUNCTION public.simple_winner_payout_and_reset(
    session_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    payout_amount DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Find the winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_param
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No winner found');
    END IF;
    
    -- Calculate payout (winner gets full pot)
    payout_amount := session_record.current_pot;
    
    -- Add tokens to winner's wallet
    UPDATE public.users
    SET tokens = tokens + payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Mark session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = 0,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Wait a moment
    PERFORM pg_sleep(1);
    
    -- Reset everything for new game
    DELETE FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param;
    
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
    WHERE id = session_id_param;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout processed and session reset',
        'winner_username', winner_record.username,
        'winner_email', winner_record.email,
        'winner_score', winner_record.score,
        'payout_amount', payout_amount,
        'session_reset', true
    );
END;
$$;

-- ============================================
-- COMPLETE RESET FOR TESTING
-- ============================================

-- Complete reset of all Winner Takes All listings for fresh testing
DELETE FROM public.winner_takes_all_participants;

UPDATE public.winner_takes_all_sessions 
SET 
    status = 'waiting',
    current_pot = 0,
    participants_count = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    updated_at = NOW();

-- Verify complete reset
SELECT 
    'Complete Reset for Testing!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot,
    COUNT(CASE WHEN winner_user_id IS NOT NULL THEN 1 END) as sessions_with_winners
FROM public.winner_takes_all_sessions;

-- ============================================
-- TEST THE FIXED SYSTEM
-- ============================================

-- Create test scenario
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     2500.50, 95.5, NOW(), NOW()),
    ((SELECT id FROM public.users WHERE email = 'ryanfermoselle@yahoo.com'), 
     1800.25, 88.0, NOW(), NOW());

-- Update session to have a pot
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 5,
    participants_count = 2,
    status = 'active',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Test the payout system
SELECT public.simple_winner_payout_and_reset(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry')
) as payout_result;

-- ============================================
-- VERIFY THE FIX
-- ============================================

-- Verify the winner got paid
SELECT 
    'Winner Payment Verification' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Verify the session was reset
SELECT 
    'Session Reset Verification' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount,
    platform_fee
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Verify no participants remain
SELECT 
    'Participants After Reset' as status,
    COUNT(*) as participant_count
FROM public.winner_takes_all_participants 
WHERE session_id = (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry');

-- ============================================
-- FINAL RESET FOR USER TESTING
-- ============================================

-- Final reset for user testing
DELETE FROM public.winner_takes_all_participants;

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

-- Show ready status
SELECT 
    'Ready for User Testing!' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of fixes:
-- 1. Created simple_winner_payout_and_reset function
-- 2. Function finds winner by highest score
-- 3. Adds full pot amount to winner's wallet
-- 4. Marks session as completed
-- 5. Deletes all participants
-- 6. Resets session to waiting status
-- 7. Clears all pot and winner data
-- 8. Session ready for new tournament

SELECT 'Fixed Payout and Reset System Ready!' as final_status;
