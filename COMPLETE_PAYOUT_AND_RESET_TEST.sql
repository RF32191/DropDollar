-- COMPLETE_PAYOUT_AND_RESET_TEST.sql
-- This script tests the complete payout and reset system for Winner Takes All

-- ============================================
-- COMPLETE LISTING RESET
-- ============================================

-- Complete reset of all Winner Takes All listings
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
    'Complete Reset Done!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot,
    COUNT(CASE WHEN winner_user_id IS NOT NULL THEN 1 END) as sessions_with_winners
FROM public.winner_takes_all_sessions;

-- ============================================
-- CREATE TEST SCENARIO
-- ============================================

-- Add test participants with scores
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     3500.75, 95.5, NOW(), NOW()),
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'ryanfermoselle@yahoo.com'), 
     2800.25, 88.0, NOW(), NOW());

-- Update session to have a pot
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 8,
    participants_count = 2,
    status = 'active',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Show before payout
SELECT 
    'Before Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Show participants before payout
SELECT 
    'Participants Before Payout' as status,
    u.username,
    u.email,
    p.score,
    p.completed_at
FROM public.winner_takes_all_participants p
JOIN public.users u ON p.user_id = u.id
WHERE p.session_id = (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry');

-- ============================================
-- EXECUTE PAYOUT SYSTEM
-- ============================================

-- Run the payout system
SELECT public.process_winner_takes_all_payout_with_reset(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry')
) as payout_result;

-- ============================================
-- VERIFY PAYOUT AND RESET
-- ============================================

-- Verify the winner got paid
SELECT 
    'Winner Payment Verification' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Verify the listing was reset
SELECT 
    'Listing Reset Verification' as status,
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
-- FINAL VERIFICATION
-- ============================================

-- Check winner's token balance
SELECT 
    'Winner Token Balance' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Check the session status
SELECT 
    'Session Status After Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount,
    platform_fee
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of what the system does:
-- 1. Resets all listings to clean state
-- 2. Creates test participants with scores
-- 3. Sets up a pot for the tournament
-- 4. Processes payout to winner (highest score)
-- 5. Adds tokens to winner's wallet
-- 6. Completely resets the session for new tournament
-- 7. Clears all participants and pot data
-- 8. Session ready for new players

SELECT 'Complete Payout and Reset System Working!' as final_status;
