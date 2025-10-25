-- RESET_ALL_LISTINGS.sql
-- This script resets all Winner Takes All listings to clean state

-- ============================================
-- RESET ALL LISTINGS
-- ============================================

-- Clear all participants
DELETE FROM public.winner_takes_all_participants;

-- Reset all sessions to waiting status
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
    'All Listings Reset!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- Show reset status
SELECT 
    'Reset Complete - Ready for Testing!' as final_status;
