-- ============================================================================
-- RESET ALL WINNER TAKES ALL LISTINGS FOR TESTING
-- ============================================================================
-- This script completely resets all WTA sessions to clean state
-- Clears all participants including Immersioproduciton
-- Run this in Supabase SQL Editor to reset all listings for testing
-- ============================================================================

DO $$
DECLARE
    participant_count INTEGER;
    session_count INTEGER;
    deleted_participants INTEGER;
    immersion_user_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 RESETTING ALL WTA LISTINGS FOR TESTING';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Find Immersioproduciton user if exists
    SELECT id INTO immersion_user_id
    FROM public.users
    WHERE username ILIKE '%immersio%' OR email ILIKE '%immersio%'
    LIMIT 1;
    
    IF immersion_user_id IS NOT NULL THEN
        RAISE NOTICE '👤 Found user: Immersioproduciton (ID: %)', immersion_user_id;
    END IF;
    
    -- Count before deletion
    SELECT COUNT(*) INTO participant_count FROM public.winner_takes_all_participants;
    SELECT COUNT(*) INTO session_count FROM public.winner_takes_all_sessions;
    
    RAISE NOTICE '📊 Current State:';
    RAISE NOTICE '  - Participants: %', participant_count;
    RAISE NOTICE '  - Sessions: %', session_count;
    RAISE NOTICE '';
    
    -- Delete ALL participants (including Immersioproduciton)
    DELETE FROM public.winner_takes_all_participants;
    GET DIAGNOSTICS deleted_participants = ROW_COUNT;
    RAISE NOTICE '✅ Cleared % participants (including all users)', deleted_participants;
    
    -- Reset ALL sessions to waiting state
    UPDATE public.winner_takes_all_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        current_pot = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_prize = NULL,
        winner_username = NULL,
        prize_amount = NULL,
        platform_fee = NULL,
        platform_fee_amount = NULL,
        completed_at = NULL,
        rng_seed = floor(random() * 99999 + 1)::integer,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Reset % sessions to "waiting" state', session_count;
    
    -- Show reset results
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RESET COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '  - All participants removed (including Immersioproduciton)';
    RAISE NOTICE '  - All sessions reset to "waiting"';
    RAISE NOTICE '  - Timers cleared';
    RAISE NOTICE '  - Prize pools reset to $0';
    RAISE NOTICE '  - Participant counts reset to 0';
    RAISE NOTICE '  - Winners cleared';
    RAISE NOTICE '  - New RNG seeds generated';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 READY FOR TESTING!';
    RAISE NOTICE '';
END $$;

-- Verify reset - show all sessions
SELECT 
    config_id,
    status,
    participants_count,
    COALESCE(current_pot, 0) + COALESCE(prize_pool, 0) as total_pot,
    timer_started_at,
    winner_user_id,
    winner_username,
    rng_seed
FROM public.winner_takes_all_sessions
ORDER BY config_id;

-- Verify no participants remain
SELECT 
    COUNT(*) as remaining_participants
FROM public.winner_takes_all_participants;

-- Confirm
SELECT '✅ All Winner Takes All listings reset to waiting state! Ready for testing!' as status;
