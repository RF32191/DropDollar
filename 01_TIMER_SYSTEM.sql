-- ============================================================================
-- TIMER SYSTEM FOR WINNER TAKES ALL
-- ============================================================================
-- Feature 1: Timer System
-- - Sets timer to 30 seconds for testing
-- - Automatically starts when base price is met
-- - Tracked via timer_started_at column
-- ============================================================================

-- Set timer duration to 30 seconds for all Winner Takes All sessions
UPDATE public.winner_takes_all_sessions 
SET 
    timer_duration = 30, -- 30 seconds for testing
    updated_at = NOW()
WHERE config_id LIKE 'wta-%';

-- Update default timer duration in table
ALTER TABLE public.winner_takes_all_sessions 
ALTER COLUMN timer_duration SET DEFAULT 30;

-- Verify timer update
SELECT 
    'Timer System: 30 seconds configured!' as status,
    COUNT(*) as total_sessions,
    MIN(timer_duration) as min_duration,
    MAX(timer_duration) as max_duration
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

