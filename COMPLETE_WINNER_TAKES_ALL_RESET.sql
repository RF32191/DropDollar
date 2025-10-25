-- COMPLETE_WINNER_TAKES_ALL_RESET.sql
-- This script completely resets ALL Winner Takes All sessions and clears all scores
-- Use this for full testing from scratch

-- ============================================
-- COMPLETE SYSTEM RESET
-- ============================================

-- 1. Delete ALL participants from ALL sessions
DELETE FROM public.winner_takes_all_participants;

-- 2. Reset ALL sessions to clean state
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

-- 3. Verify complete reset
SELECT 
    'Complete reset successful!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot
FROM public.winner_takes_all_sessions;

-- 4. Verify no participants remain
SELECT 
    'No participants found!' as verification,
    COUNT(*) as participant_count
FROM public.winner_takes_all_participants;

-- 5. Show all sessions in clean state
SELECT 
    config_id,
    status,
    participants_count,
    current_pot,
    base_price,
    timer_started_at,
    winner_user_id
FROM public.winner_takes_all_sessions 
ORDER BY base_price;

-- ============================================
-- RESET COMPLETE - READY FOR TESTING
-- ============================================
