-- FIX_WINNER_TAKES_ALL_TIMER_TO_1_MINUTE.sql
-- This script fixes the Winner Takes All timer to 1 minute after base price is met

-- ============================================
-- WINNER TAKES ALL TIMER FIX (1 MINUTE)
-- ============================================

-- Update all Winner Takes All sessions to have 1-minute timers
UPDATE public.winner_takes_all_sessions 
SET 
    timer_duration = 60, -- 1 minute in seconds (changed from 1800 = 30 minutes)
    updated_at = NOW()
WHERE config_id LIKE 'wta-%';

-- Update the default timer duration in the table schema
ALTER TABLE public.winner_takes_all_sessions 
ALTER COLUMN timer_duration SET DEFAULT 60; -- 1 minute default

-- ============================================
-- VERIFY THE TIMER FIX
-- ============================================

-- Verify the update
SELECT 
    'Winner Takes All Timers Updated to 1 Minute!' as status,
    COUNT(*) as total_sessions_updated,
    MIN(timer_duration) as min_duration,
    MAX(timer_duration) as max_duration
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- Show timer status for all Winner Takes All sessions
SELECT 
    config_id,
    timer_duration,
    timer_duration/60 as duration_minutes,
    status,
    timer_started_at,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER
        ELSE NULL 
    END as elapsed_seconds,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN 
            GREATEST(0, timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)
        ELSE timer_duration 
    END as seconds_remaining
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

-- ============================================
-- TEST ACTIVE TIMER
-- ============================================

-- Test the timer for any active session
SELECT 
    'Active Session Timer Test' as status,
    config_id,
    timer_duration,
    timer_duration/60 as duration_minutes,
    status,
    timer_started_at,
    NOW() as current_time,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN 
            GREATEST(0, timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)
        ELSE timer_duration 
    END as seconds_remaining,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN 
            GREATEST(0, timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)/60
        ELSE timer_duration/60 
    END as minutes_remaining
FROM public.winner_takes_all_sessions 
WHERE status = 'active'
ORDER BY timer_started_at DESC
LIMIT 1;

-- ============================================
-- SCHEMA VERIFICATION
-- ============================================

-- Verify the schema change
SELECT 
    'Schema Updated!' as status,
    column_name,
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_sessions' 
AND column_name = 'timer_duration';

-- ============================================
-- SUMMARY
-- ============================================

-- Summary of changes:
-- 1. Updated all Winner Takes All sessions timer_duration from 1800 seconds (30 minutes) to 60 seconds (1 minute)
-- 2. Updated the table schema default timer_duration to 60 seconds
-- 3. All new Winner Takes All sessions will now default to 1-minute timers
-- 4. Existing active sessions will use the new 1-minute timer duration
-- 5. Timer countdown now shows 1 minute instead of 30 minutes after base price is met

SELECT 'Winner Takes All Timer Fixed to 1 Minute!' as final_status;
