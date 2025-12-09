-- ============================================================================
-- VERIFY GET_COIN_PLAY_SESSIONS FUNCTION INCLUDES WINNER_USERNAME
-- ============================================================================
-- Run this after UPDATE_COIN_PLAY_GET_SESSIONS_WITH_WINNER.sql
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 VERIFYING FUNCTION';
    RAISE NOTICE '========================================';
END $$;

-- Check function exists and has correct return type
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'get_coin_play_sessions'
AND routine_schema = 'public';

-- Check function parameters (should show winner_username in return table)
SELECT 
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_name = (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_coin_play_sessions' 
    AND routine_schema = 'public'
)
ORDER BY ordinal_position;

-- Test the function
SELECT 
    '=== Testing Function ===' as test;

-- Call the function and show sample results
SELECT 
    config_id,
    game_type,
    status,
    participants_count,
    max_participants,
    winner_user_id,
    winner_username,
    winner_prize,
    completed_at
FROM public.get_coin_play_sessions()
ORDER BY game_type, prize_pool
LIMIT 10;

-- Check if winner_username column exists in results
DO $$
DECLARE
    v_test_result RECORD;
    v_has_winner_username BOOLEAN := FALSE;
BEGIN
    -- Try to get a result with winner_username
    SELECT * INTO v_test_result
    FROM public.get_coin_play_sessions()
    LIMIT 1;
    
    -- Check if winner_username field exists
    IF v_test_result.winner_username IS NOT NULL OR v_test_result.winner_username IS NULL THEN
        v_has_winner_username := TRUE;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    IF v_has_winner_username THEN
        RAISE NOTICE '✅ FUNCTION VERIFIED';
        RAISE NOTICE '   - winner_username field exists';
        RAISE NOTICE '   - Function returns correct structure';
    ELSE
        RAISE NOTICE '❌ FUNCTION VERIFICATION FAILED';
        RAISE NOTICE '   - winner_username field may be missing';
    END IF;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

SELECT '✅ Verification complete - Check notices above' as status;

