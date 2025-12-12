-- ============================================================================
-- TEST XP AND LEVEL - VERIFY XP IS BEING AWARDED
-- ============================================================================
-- Run this to check if XP is being awarded correctly
-- Replace USER_ID_HERE with your actual user ID
-- ============================================================================

-- 1. Check current XP and level (Replace USER_ID_HERE)
-- SELECT 
--     'Current XP Status' as check_type,
--     total_xp,
--     current_level,
--     xp_to_next_level,
--     reward_points,
--     updated_at
-- FROM public.user_xp
-- WHERE user_id = 'USER_ID_HERE'::UUID;

-- 2. Check recent XP transactions (Replace USER_ID_HERE)
-- SELECT 
--     'Recent XP Transactions' as check_type,
--     xp_amount,
--     transaction_type,
--     description,
--     created_at
-- FROM public.xp_transactions
-- WHERE user_id = 'USER_ID_HERE'::UUID
-- ORDER BY created_at DESC
-- LIMIT 10;

-- 3. Check recent games (Replace USER_ID_HERE)
-- SELECT 
--     'Recent Games' as check_type,
--     game_type,
--     score,
--     is_practice,
--     created_at
-- FROM public.game_history
-- WHERE user_id = 'USER_ID_HERE'::UUID
-- ORDER BY created_at DESC
-- LIMIT 10;

-- 4. Manually award XP to test (Replace USER_ID_HERE)
-- SELECT 
--     'Manual XP Test' as check_type,
--     public.award_xp(
--         'USER_ID_HERE'::UUID,
--         5,
--         'test',
--         NULL,
--         'Manual test'
--     ) as result;

-- 5. Check if trigger is attached
SELECT 
    'Trigger Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_update_challenges_on_game_history'
            AND tgrelid = 'public.game_history'::regclass
        ) THEN '✅ ATTACHED'
        ELSE '❌ NOT ATTACHED'
    END as status;

SELECT '✅ Test queries ready! Uncomment and replace USER_ID_HERE to test.' as status;

