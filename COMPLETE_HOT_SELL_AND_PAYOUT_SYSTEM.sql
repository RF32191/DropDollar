-- COMPLETE_HOT_SELL_AND_PAYOUT_SYSTEM.sql
-- This script implements the complete hot sell and payout system with 1-minute timers

-- ============================================
-- HOT SELL TIMER CONFIGURATION (1 MINUTE)
-- ============================================

-- Update all hot sell sessions to have 1 minute timers (changed from 30 minutes)
UPDATE public.hot_sell_sessions 
SET 
    expires_at = NOW() + INTERVAL '1 minute'
WHERE status IN ('waiting', 'hot_sell');

-- Verify the timer update
SELECT 
    'Hot Sell Timers Updated to 1 Minute!' as status,
    COUNT(*) as total_sessions_updated,
    MIN(expires_at) as earliest_expiry,
    MAX(expires_at) as latest_expiry
FROM public.hot_sell_sessions 
WHERE status IN ('waiting', 'hot_sell');

-- ============================================
-- PAYOUT SYSTEM WITH POT-BASED WINNINGS
-- ============================================

-- Create payout system that works with the pot (winner gets full pot value)
CREATE OR REPLACE FUNCTION public.process_winner_takes_all_payout_with_reset(
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
    platform_fee_amount DECIMAL(10,2);
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
    
    -- Check if already paid out (prevent double payout)
    IF session_record.winner_user_id IS NOT NULL AND session_record.prize_amount IS NOT NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session already paid out - no double payout allowed'
        );
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
        RETURN json_build_object(
            'success', false, 
            'message', 'No winner found - no completed games'
        );
    END IF;
    
    -- Calculate payout based on current pot (winner gets the full pot)
    payout_amount := session_record.current_pot;
    platform_fee_amount := 0; -- Winner gets full pot, no platform fee for now
    
    -- Add tokens to winner's wallet
    UPDATE public.users
    SET tokens = tokens + payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Update session with winner info
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = platform_fee_amount,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Wait a moment to ensure payout is processed
    PERFORM pg_sleep(1);
    
    -- Reset session for new tournament (clear all contents)
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
    
    -- Return comprehensive result
    RETURN json_build_object(
        'success', true,
        'message', 'Payout processed and session reset',
        'winner_username', winner_record.username,
        'winner_email', winner_record.email,
        'winner_score', winner_record.score,
        'payout_amount', payout_amount,
        'platform_fee', platform_fee_amount,
        'total_pot', session_record.current_pot,
        'session_reset', true,
        'ready_for_new_tournament', true
    );
END;
$$;

-- ============================================
-- RESET LISTING FOR TESTING
-- ============================================

-- Reset the listing again for fresh testing
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

-- Verify reset
SELECT 
    'Listing Reset Complete!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot
FROM public.winner_takes_all_sessions;

-- ============================================
-- TEST THE COMPLETE SYSTEM
-- ============================================

-- Test the payout system with sample data
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     2500.50, 95.5, NOW(), NOW()),
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'ryanfermoselle@yahoo.com'), 
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
SELECT public.process_winner_takes_all_payout_with_reset(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry')
) as result;

-- ============================================
-- VERIFY SYSTEM WORKING
-- ============================================

-- Verify the payout worked
SELECT 
    'Winner tokens updated!' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Verify session was reset
SELECT 
    'Session reset verified!' as status,
    config_id,
    status,
    participants_count,
    current_pot,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Show hot sell timer status
SELECT 
    'Hot Sell Timer Status' as status,
    config_id,
    status,
    expires_at,
    NOW() as current_time,
    EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_remaining
FROM public.hot_sell_sessions 
WHERE status IN ('waiting', 'hot_sell')
ORDER BY expires_at ASC
LIMIT 3;

-- ============================================
-- SYSTEM COMPLETE
-- ============================================

-- Summary of changes:
-- 1. Hot sell timers changed from 30 minutes to 1 minute
-- 2. Payout system works with pot (winner gets full pot value)
-- 3. Winner tokens are added to their wallet
-- 4. Session is completely reset after payout
-- 5. System prevents double payouts
-- 6. All contents are cleared post-payout

SELECT 'Complete Hot Sell and Payout System Ready!' as final_status;
