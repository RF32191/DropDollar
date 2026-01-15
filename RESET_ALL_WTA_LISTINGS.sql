-- ============================================================================
-- RESET ALL WINNER TAKES ALL LISTINGS
-- ============================================================================
-- This script completely resets all WTA sessions to clean state
-- ============================================================================

-- ============================================================================
-- STEP 1: Delete all participants
-- ============================================================================
DELETE FROM public.winner_takes_all_participants;

-- ============================================================================
-- STEP 2: Reset all WTA sessions (clear all fields)
-- ============================================================================
UPDATE public.winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    current_pot = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    timer_duration = NULL,
    winner_user_id = NULL,
    winner_prize = NULL,
    prize_amount = NULL,
    platform_fee = NULL,
    platform_fee_amount = NULL,
    completed_at = NULL,
    rng_seed = floor(random() * 99999 + 1)::integer,
    updated_at = NOW();

-- ============================================================================
-- STEP 3: Verify reset
-- ============================================================================
DO $$
DECLARE
    v_session_count INTEGER;
    v_participant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_session_count
    FROM public.winner_takes_all_sessions;
    
    SELECT COUNT(*) INTO v_participant_count
    FROM public.winner_takes_all_participants;
    
    RAISE NOTICE '✅ Reset complete!';
    RAISE NOTICE '✅ Sessions: % (all reset to waiting)', v_session_count;
    RAISE NOTICE '✅ Participants: % (all deleted)', v_participant_count;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ ALL WTA LISTINGS RESET!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All participants deleted';
    RAISE NOTICE '✅ All sessions reset to waiting state';
    RAISE NOTICE '✅ Prize pools cleared';
    RAISE NOTICE '✅ Winners cleared';
    RAISE NOTICE '✅ ============================================================';
END $$;
