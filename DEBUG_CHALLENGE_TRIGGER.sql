-- ============================================================================
-- DEBUG CHALLENGE TRIGGER
-- ============================================================================
-- This script helps debug why challenge progress isn't updating
-- ============================================================================

-- 1. Check if trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_update_challenges_on_game_history'
AND tgrelid = 'public.game_history'::regclass;

-- 2. Check if function exists and its signature
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'trigger_update_challenges_on_game_history';

-- 3. Check if update_challenges_on_game_complete function exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'update_challenges_on_game_complete';

-- 4. Check recent game_history entries
SELECT 
    id,
    user_id,
    game_type,
    score,
    is_practice,
    is_competition,
    created_at
FROM public.game_history
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if challenges exist for today
SELECT 
    id,
    challenge_date,
    challenge_type,
    challenge_name,
    target_value,
    reward_points,
    is_active
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true
ORDER BY challenge_type;

-- 6. Check user challenge progress for a specific user (replace with your user_id)
-- First, get a user_id from recent games
DO $$
DECLARE
    v_user_id UUID;
    v_challenge_id UUID;
    v_progress INTEGER;
BEGIN
    -- Get a user_id from recent games
    SELECT user_id INTO v_user_id
    FROM public.game_history
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'Checking progress for user: %', v_user_id;
        
        -- Check daily challenge progress
        FOR v_challenge_id, v_progress IN
            SELECT dc.id, COALESCE(udc.progress, 0)
            FROM public.daily_challenges dc
            LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = v_user_id
            WHERE dc.challenge_date = CURRENT_DATE
            AND dc.is_active = true
        LOOP
            RAISE NOTICE 'Challenge ID: %, Progress: %', v_challenge_id, v_progress;
        END LOOP;
    ELSE
        RAISE NOTICE 'No games found to check progress';
    END IF;
END $$;

-- 7. Test the trigger function manually (replace with actual values)
-- This simulates what happens when a game is inserted
DO $$
DECLARE
    v_test_user_id UUID;
    v_test_game_type TEXT := 'multi_target';
    v_test_score INTEGER := 1000;
    v_test_is_practice BOOLEAN := true;
BEGIN
    -- Get a test user
    SELECT user_id INTO v_test_user_id
    FROM public.game_history
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing trigger function for user: %', v_test_user_id;
        
        -- Call the function directly
        PERFORM public.update_challenges_on_game_complete(
            v_test_user_id,
            v_test_game_type,
            v_test_score,
            v_test_is_practice,
            false -- not coin play
        );
        
        RAISE NOTICE 'Function executed successfully';
    ELSE
        RAISE NOTICE 'No users found to test';
    END IF;
END $$;

-- 8. Check if there are any errors in the function execution
-- Look for any constraint violations or missing columns
SELECT 
    'Check game_history table structure' as check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'game_history'
AND column_name IN ('is_practice', 'is_competition', 'session_type', 'user_id', 'game_type', 'score')
ORDER BY column_name;

-- 9. Verify challenge progress functions exist
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('update_daily_challenge_progress', 'update_weekly_challenge_progress');

SELECT '✅ Debug checks complete! Review the output above to identify issues.' as status;





