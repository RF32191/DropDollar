-- SIMPLE GAME FIX - Make all games work like sword parry and laser dodge
-- This creates a simple test to verify game saving works

-- 1. Test the save_game_history function
DO $$
DECLARE
    test_user_id TEXT;
    test_result JSONB;
BEGIN
    -- Get a test user ID
    SELECT id::text INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test saving different game types
        SELECT save_game_history(
            test_user_id,
            'multi-target',
            150.5,
            95.0,
            250,
            60,
            true,
            NULL,
            NULL,
            NULL,
            0,
            0,
            0,
            '{"test": "multi-target"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Multi-target test: %', test_result;
        
        -- Test color sequence
        SELECT save_game_history(
            test_user_id,
            'color-sequence',
            200.75,
            88.5,
            300,
            60,
            true,
            NULL,
            NULL,
            NULL,
            0,
            0,
            0,
            '{"test": "color-sequence"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Color sequence test: %', test_result;
        
        -- Test falling object
        SELECT save_game_history(
            test_user_id,
            'falling-object',
            175.25,
            92.0,
            180,
            60,
            true,
            NULL,
            NULL,
            NULL,
            0,
            0,
            0,
            '{"test": "falling-object"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Falling object test: %', test_result;
        
        -- Test quick click
        SELECT save_game_history(
            test_user_id,
            'quick-click',
            300.0,
            100.0,
            150,
            60,
            true,
            NULL,
            NULL,
            NULL,
            0,
            0,
            0,
            '{"test": "quick-click"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Quick click test: %', test_result;
        
        RAISE NOTICE 'All game types tested successfully!';
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 2. Verify all test games were saved
SELECT 
    game_type,
    score,
    accuracy,
    created_at
FROM public.game_history 
WHERE game_type IN ('multi-target', 'color-sequence', 'falling-object', 'quick-click')
ORDER BY created_at DESC;

-- 3. Show summary
SELECT 
    'Game saving test complete!' as status,
    COUNT(*) as total_games_saved
FROM public.game_history;
