-- ============================================
-- RESET ALL WINNER TAKES ALL SESSIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- Clear all participants
DELETE FROM public.winner_takes_all_participants;

-- Reset all sessions to waiting state
UPDATE public.winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- Show reset results
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at,
    winner_user_id,
    rng_seed
FROM public.winner_takes_all_sessions
ORDER BY config_id;

-- Confirm
SELECT 'All Winner Takes All sessions reset to waiting!' as status;

