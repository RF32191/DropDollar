-- ============================================
-- AUTO ADD TEST GAMES FOR ALL RECENT USERS
-- ============================================
-- This automatically adds test games for your most recent users
-- ============================================

-- Show which users will get test games
SELECT '
============================================
👥 Users who will get test games:
============================================
' as info;

SELECT 
    id,
    email,
    raw_user_meta_data->>'username' as username,
    created_at,
    (SELECT COUNT(*) FROM game_history WHERE user_id = auth.users.id) as current_games
FROM auth.users
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 5;

-- Add test games
DO $$
DECLARE
    v_user RECORD;
    v_games_added INTEGER := 0;
BEGIN
    -- Loop through recent users
    FOR v_user IN 
        SELECT id, email
        FROM auth.users
        WHERE created_at > NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 5
    LOOP
        BEGIN
            -- Add a practice game
            INSERT INTO public.game_history (
                user_id,
                game_type,
                session_type,
                session_id,
                score,
                accuracy,
                avg_reaction_time,
                tokens_won,
                tokens_spent,
                result,
                created_at
            ) VALUES (
                v_user.id,
                'crypto_match',
                'practice',
                gen_random_uuid(),
                FLOOR(RANDOM() * 200 + 50)::NUMERIC, -- Random score 50-250
                FLOOR(RANDOM() * 30 + 70)::NUMERIC,   -- Random accuracy 70-100
                FLOOR(RANDOM() * 300 + 100)::INTEGER,  -- Random reaction time
                0,
                0,
                'participated',
                NOW()
            );
            
            v_games_added := v_games_added + 1;
            RAISE NOTICE '✅ Added test game for: %', v_user.email;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Failed for %: %', v_user.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ COMPLETE! Added % test games', v_games_added;
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NOW:';
    RAISE NOTICE '1. Go to your dashboard';
    RAISE NOTICE '2. Refresh the page (Cmd+R or Ctrl+R)';
    RAISE NOTICE '3. Click "Practice History" tab';
    RAISE NOTICE '4. You should see the test game!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 If still empty:';
    RAISE NOTICE '- Open browser console (F12)';
    RAISE NOTICE '- Look for: "Game history loaded from new table: X games"';
    RAISE NOTICE '- If 0 games → RLS is blocking (run COMPLETE_DASHBOARD_FIX.sql)';
    RAISE NOTICE '- If X games but empty tabs → Frontend not deployed yet';
    
END $$;

-- Verify games were added
SELECT '
============================================
📊 Verification: Games added per user
============================================
' as verification;

SELECT 
    u.email,
    u.raw_user_meta_data->>'username' as username,
    COUNT(gh.id) as total_games,
    COUNT(CASE WHEN gh.is_practice THEN 1 END) as practice_games,
    COUNT(CASE WHEN gh.is_competition THEN 1 END) as competition_games,
    MAX(gh.created_at) as latest_game
FROM auth.users u
LEFT JOIN public.game_history gh ON gh.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.raw_user_meta_data
ORDER BY u.created_at DESC
LIMIT 10;

-- Show sample games
SELECT '
============================================
📋 Sample games added (last 10):
============================================
' as sample;

SELECT 
    gh.id,
    u.email as user_email,
    gh.game_type,
    gh.session_type,
    gh.is_practice,
    gh.score,
    gh.created_at
FROM public.game_history gh
JOIN auth.users u ON u.id = gh.user_id
ORDER BY gh.created_at DESC
LIMIT 10;

