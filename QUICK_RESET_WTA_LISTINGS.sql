-- ============================================================================
-- QUICK RESET ALL WINNER TAKES ALL LISTINGS FOR TESTING
-- This script clears all participants and sessions, then creates fresh
-- waiting sessions for all existing winner_takes_all_configs.
-- ============================================================================

-- Disable triggers for faster deletion and to avoid RLS issues during reset
ALTER TABLE public.winner_takes_all_participants DISABLE TRIGGER USER;
ALTER TABLE public.winner_takes_all_sessions DISABLE TRIGGER USER;

-- Clear all winner_takes_all_participants
DELETE FROM public.winner_takes_all_participants;
SELECT '🗑️ All winner_takes_all_participants cleared.' as result;

-- Delete all existing winner_takes_all_sessions
DELETE FROM public.winner_takes_all_sessions;
SELECT '🗑️ All existing winner_takes_all_sessions deleted.' as result;

-- Re-enable triggers
ALTER TABLE public.winner_takes_all_participants ENABLE TRIGGER USER;
ALTER TABLE public.winner_takes_all_sessions ENABLE TRIGGER USER;

-- Create new waiting winner_takes_all_sessions for each config
INSERT INTO public.winner_takes_all_sessions (
    id, config_id, prize_pool, participants_count, status, rng_seed, base_price, timer_duration
)
SELECT
    uuid_generate_v4(),
    c.id,
    0, -- New session starts with 0 prize pool
    0, -- New session starts with 0 participants
    'waiting',
    floor(random() * 1000000) + 1, -- Generate new RNG seed for new session
    c.base_price,
    60 -- 1 minute timer for testing
FROM public.winner_takes_all_configs c
ON CONFLICT (config_id, status) WHERE status = 'waiting' DO UPDATE SET
    prize_pool = 0,
    participants_count = 0,
    winner_user_id = NULL,
    winner_prize = 0,
    platform_fee_amount = 0,
    completed_at = NULL,
    timer_started_at = NULL,
    rng_seed = floor(random() * 1000000) + 1,
    created_at = NOW(),
    updated_at = NOW();

SELECT '➕ New waiting winner_takes_all_sessions created for all configs.' as result;

-- Verification
SELECT '✅ ALL WINNER TAKES ALL LISTINGS RESET!' as status;
SELECT '📊 Waiting Sessions:' as info, COUNT(*) FROM public.winner_takes_all_sessions WHERE status = 'waiting';
SELECT '👥 Participants:' as info, COUNT(*) FROM public.winner_takes_all_participants;
SELECT id, config_id, prize_pool, participants_count, status, timer_duration, rng_seed FROM public.winner_takes_all_sessions WHERE status = 'waiting' ORDER BY created_at DESC;

