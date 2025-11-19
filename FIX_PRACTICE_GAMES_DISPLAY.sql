-- ============================================
-- FIX PRACTICE GAMES DISPLAY & MESSAGING
-- ============================================
-- Ensure all practice games save correctly and display in dashboard
-- ============================================

-- Step 1: Verify game_history table has data
SELECT 
    '📊 Current Game History Data' as info,
    session_type,
    COUNT(*) as total_games,
    COUNT(DISTINCT user_id) as unique_users
FROM public.game_history
GROUP BY session_type
ORDER BY session_type;

-- Step 2: Check if save_game_history function exists and works
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'save_game_history' 
        AND pg_catalog.pg_function_is_visible(oid)
    ) THEN
        RAISE NOTICE '✅ save_game_history function exists';
    ELSE
        RAISE NOTICE '❌ save_game_history function MISSING - practice games will not save!';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'record_game_history' 
        AND pg_catalog.pg_function_is_visible(oid)
    ) THEN
        RAISE NOTICE '✅ record_game_history function exists';
    ELSE
        RAISE NOTICE '❌ record_game_history function MISSING';
    END IF;
END $$;

-- Step 3: Show sample practice games for verification
SELECT 
    '🎮 Sample Practice Games' as info,
    gh.user_id,
    u.username,
    gh.game_type,
    gh.score,
    gh.session_type,
    gh.created_at
FROM public.game_history gh
LEFT JOIN public.users u ON u.id = gh.user_id
WHERE gh.session_type = 'practice'
ORDER BY gh.created_at DESC
LIMIT 10;

-- Step 4: Create function to manually log a test practice game (for debugging)
CREATE OR REPLACE FUNCTION public.test_practice_game_logging(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_history_id UUID;
BEGIN
    -- Try to save a test practice game
    BEGIN
        v_history_id := public.save_game_history(
            p_user_id := p_user_id,
            p_game_type := 'quick-click',
            p_score := 999.99,
            p_accuracy := 100.0,
            p_avg_reaction_time := 150.0,
            p_game_duration := 60,
            p_is_practice := true
        );
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Test practice game saved successfully',
            'history_id', v_history_id
        );
    EXCEPTION WHEN OTHERS THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to save test practice game'
        );
    END;
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_practice_game_logging TO authenticated;

-- Step 5: Create function to get user's practice games (for dashboard debugging)
CREATE OR REPLACE FUNCTION public.get_user_practice_games_debug(p_user_id UUID)
RETURNS TABLE (
    game_id UUID,
    game_type TEXT,
    score NUMERIC,
    accuracy NUMERIC,
    session_type TEXT,
    created_at TIMESTAMPTZ,
    age_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gh.id::UUID,
        gh.game_type::TEXT,
        gh.score::NUMERIC,
        gh.accuracy::NUMERIC,
        gh.session_type::TEXT,
        gh.created_at::TIMESTAMPTZ,
        EXTRACT(EPOCH FROM (NOW() - gh.created_at))::INTEGER / 60 as age_minutes
    FROM public.game_history gh
    WHERE gh.user_id = p_user_id
      AND gh.session_type = 'practice'
    ORDER BY gh.created_at DESC
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_practice_games_debug TO authenticated;

-- Step 6: Verify RLS policies allow reading practice games
DO $$
BEGIN
    -- Check if RLS is enabled
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'game_history'
          AND n.nspname = 'public'
          AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS is enabled on game_history';
        
        -- Check if there's a policy for users to view their own games
        IF EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = 'game_history'
              AND policyname LIKE '%own%'
        ) THEN
            RAISE NOTICE '✅ RLS policy exists for users to view own games';
        ELSE
            RAISE NOTICE '⚠️  No obvious RLS policy for users to view own games';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  RLS is NOT enabled on game_history';
    END IF;
END $$;

-- Step 7: Test query that dashboard uses
-- This simulates what the frontend does
DO $$
DECLARE
    v_test_user_id UUID;
    v_count INTEGER;
BEGIN
    -- Get a user who has practice games
    SELECT DISTINCT user_id INTO v_test_user_id
    FROM public.game_history
    WHERE session_type = 'practice'
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        -- Count their practice games
        SELECT COUNT(*) INTO v_count
        FROM public.game_history
        WHERE user_id = v_test_user_id
          AND session_type = 'practice';
        
        RAISE NOTICE '👤 Test user % has % practice games', 
            v_test_user_id, v_count;
        
        -- Show their recent games
        RAISE NOTICE '📋 Recent practice games:';
        PERFORM * FROM public.get_user_practice_games_debug(v_test_user_id);
    ELSE
        RAISE NOTICE '⚠️  No practice games found in database yet';
    END IF;
END $$;

-- Success message with instructions
SELECT '✅ Practice games diagnostic complete!

🔍 TO DEBUG:
1. Play a practice game
2. Check browser console for "Saving game history" message
3. Run: SELECT * FROM public.get_user_practice_games_debug(''YOUR_USER_ID'');
4. Run: SELECT * FROM public.test_practice_game_logging(''YOUR_USER_ID'');

📊 TO FIX MISSING GAMES:
- If save_game_history is missing, run: ADD_SAVE_GAME_HISTORY_RPC.sql
- If games show in SQL but not dashboard, check RLS policies
- If games don''t save at all, check browser console for errors

🎯 DASHBOARD LOADS:
1. Calls loadGameHistory(user.id)
2. Tries: SELECT * FROM game_history WHERE user_id = ?
3. Filters: WHERE session_type = ''practice''
4. Maps: is_practice = (session_type === ''practice'')
5. Displays in Practice History tab' as status;

