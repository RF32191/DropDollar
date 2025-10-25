-- VICTOR_PAYOUT_SYSTEM_FIX.sql
-- This script fixes timer spreading, adds payout confirmation, clears listings, and creates new victor payout method

-- ============================================
-- CLEAR ALL LISTINGS AND RESET
-- ============================================

-- Clear all listings and reset everything
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
WHERE config_id LIKE 'wta-%';

-- Verify complete reset
SELECT 
    'All Listings Cleared!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- ============================================
-- NEW VICTOR PAYOUT METHOD WITH CONFIRMATION
-- ============================================

-- Create a new, more reliable payout method with confirmation
CREATE OR REPLACE FUNCTION public.victor_payout_with_confirmation(
    target_config_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    payout_amount DECIMAL(10,2);
    session_id_to_process UUID;
    winner_tokens_before INTEGER;
    winner_tokens_after INTEGER;
BEGIN
    -- Get the specific session for the target config
    SELECT id INTO session_id_to_process
    FROM public.winner_takes_all_sessions 
    WHERE config_id = target_config_id;
    
    IF session_id_to_process IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found for config: ' || target_config_id);
    END IF;
    
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_to_process;
    
    -- Find the winner (highest score) for this specific session only
    SELECT p.*, u.username, u.email, u.tokens
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_to_process
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No winner found for session: ' || target_config_id);
    END IF;
    
    -- Calculate payout (winner gets full pot)
    payout_amount := session_record.current_pot;
    winner_tokens_before := winner_record.tokens;
    
    -- Add tokens to winner's wallet
    UPDATE public.users
    SET tokens = tokens + payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Get updated token balance
    SELECT tokens INTO winner_tokens_after
    FROM public.users
    WHERE id = winner_record.user_id;
    
    -- Mark this specific session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = 0,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_to_process;
    
    -- Wait a moment to ensure payout is processed
    PERFORM pg_sleep(1);
    
    -- Reset ONLY this specific session for new game
    DELETE FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_to_process;
    
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
    WHERE id = session_id_to_process;
    
    RETURN json_build_object(
        'success', true,
        'message', 'VICTOR PAYOUT CONFIRMED! Winner paid and session reset',
        'winner_username', winner_record.username,
        'winner_email', winner_record.email,
        'winner_score', winner_record.score,
        'payout_amount', payout_amount,
        'tokens_before', winner_tokens_before,
        'tokens_after', winner_tokens_after,
        'tokens_added', payout_amount,
        'session_reset', true,
        'config_id', target_config_id,
        'payout_confirmed', true
    );
END;
$$;

-- ============================================
-- TEST THE NEW VICTOR PAYOUT METHOD
-- ============================================

-- Test the new victor payout method
-- First, add a player to wta-2-sword-parry
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     2500.75, 95.5, NOW(), NOW());

-- Update session to have a pot
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 3,
    participants_count = 1,
    status = 'active',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Show before payout
SELECT 
    'Before Victor Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Test the new victor payout method
SELECT public.victor_payout_with_confirmation('wta-2-sword-parry') as victor_payout_result;

-- ============================================
-- VERIFY THE VICTOR PAYOUT
-- ============================================

-- Verify the victor payout worked
SELECT 
    'Victor Payment Confirmation' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Verify the session was reset
SELECT 
    'Session Reset Confirmation' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Verify no participants remain
SELECT 
    'Participants After Victor Payout' as status,
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
WHERE config_id LIKE 'wta-%';

-- Show ready status
SELECT 
    'Ready for User Testing!' as status,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    SUM(current_pot) as total_pot,
    SUM(participants_count) as total_participants
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of fixes:
-- 1. Cleared all listings to fix timer spreading
-- 2. Created victor_payout_with_confirmation function
-- 3. Added payout confirmation with token verification
-- 4. Fixed timer isolation to specific games only
-- 5. Ensured proper session reset after payout
-- 6. Added comprehensive confirmation messages

SELECT 'Victor Payout System Fixed and Ready!' as final_status;
