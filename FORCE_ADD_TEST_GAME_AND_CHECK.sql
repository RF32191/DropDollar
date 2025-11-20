-- ============================================
-- FORCE ADD TEST GAME AND VERIFY
-- ============================================
-- This will add a test game and check if it shows up
-- ============================================

-- Step 1: Show who you are
SELECT '
============================================
👤 STEP 1: Who are you?
============================================
' as step;

SELECT 
    auth.uid() as your_user_id,
    auth.email() as your_email,
    CASE 
        WHEN auth.uid() IS NULL THEN '❌ NOT LOGGED IN - This SQL must run while you are logged in!'
        ELSE '✅ Logged in'
    END as auth_status;

-- Step 2: Check if you have any games already
SELECT '
============================================
📊 STEP 2: Your current games
============================================
' as step;

SELECT 
    COUNT(*) as total_games,
    COUNT(CASE WHEN session_type = 'practice' THEN 1 END) as practice_games,
    COUNT(CASE WHEN session_type != 'practice' THEN 1 END) as competition_games,
    MAX(created_at) as last_game_played
FROM public.game_history
WHERE user_id = auth.uid();

-- Step 3: Add a test practice game
SELECT '
============================================
🎮 STEP 3: Adding TEST practice game...
============================================
' as step;

DO $$
DECLARE
    v_user_id UUID;
    v_game_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '❌ You must be logged in to add a test game!';
    END IF;
    
    -- Insert test game
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
        v_user_id,
        'crypto_match',
        'practice',
        gen_random_uuid(),
        150.5,
        95.0,
        250,
        0,
        0,
        'participated',
        NOW()
    ) RETURNING id INTO v_game_id;
    
    RAISE NOTICE '✅ Test game inserted! ID: %', v_game_id;
    RAISE NOTICE '✅ Game should now appear in your dashboard!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to insert: %', SQLERRM;
    RAISE EXCEPTION 'Cannot insert game: %', SQLERRM;
END $$;

-- Step 4: Verify it was added
SELECT '
============================================
🔍 STEP 4: Verify game was added
============================================
' as step;

SELECT 
    COUNT(*) as total_games_now,
    COUNT(CASE WHEN session_type = 'practice' THEN 1 END) as practice_games_now
FROM public.game_history
WHERE user_id = auth.uid();

-- Step 5: Show the actual games (what dashboard queries)
SELECT '
============================================
📋 STEP 5: Your games (EXACTLY what dashboard sees)
============================================
' as step;

SELECT 
    id,
    game_type,
    session_type,
    is_practice,
    is_competition,
    score,
    accuracy,
    tokens_won,
    created_at,
    CASE 
        WHEN is_practice THEN '🎮 PRACTICE'
        ELSE '🏆 COMPETITION'
    END as game_mode
FROM public.game_history
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Test the exact query dashboard runs
SELECT '
============================================
🖥️ STEP 6: Simulating EXACT dashboard query
============================================
' as step;

DO $$
DECLARE
    v_game_record RECORD;
    v_count INTEGER := 0;
BEGIN
    -- This is EXACTLY what the dashboard does
    FOR v_game_record IN 
        SELECT * 
        FROM public.game_history 
        WHERE user_id = auth.uid()
        ORDER BY created_at DESC 
        LIMIT 100
    LOOP
        v_count := v_count + 1;
        RAISE NOTICE 'Game %: type=%, is_practice=%, score=%', 
            v_count, 
            v_game_record.game_type, 
            v_game_record.is_practice,
            v_game_record.score;
    END LOOP;
    
    IF v_count = 0 THEN
        RAISE NOTICE '❌ NO GAMES RETURNED! Something is wrong with RLS!';
    ELSE
        RAISE NOTICE '✅ % games returned! Dashboard should show these!', v_count;
    END IF;
END $$;

-- Step 7: Check RLS policies in detail
SELECT '
============================================
🔒 STEP 7: RLS Policy Check
============================================
' as step;

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid() - correct!'
        ELSE '⚠️ Check policy expression'
    END as policy_check,
    qual as policy_expression
FROM pg_policies 
WHERE tablename = 'game_history';

-- Step 8: Test if RLS is actually enabled
SELECT '
============================================
🔒 STEP 8: RLS Enabled Check
============================================
' as step;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS is ON'
        ELSE '⚠️ RLS is OFF (everyone can see everything!)'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'game_history';

-- Step 9: Direct query bypass RLS (admin check)
SELECT '
============================================
🔓 STEP 9: Admin view (bypass RLS)
============================================
' as step;

SELECT 
    user_id,
    game_type,
    session_type,
    is_practice,
    score,
    created_at
FROM public.game_history
ORDER BY created_at DESC
LIMIT 5;

-- Step 10: Final instructions
SELECT '
============================================
✅ WHAT TO DO NOW
============================================

1. CHECK THE OUTPUT ABOVE:
   - Did "STEP 3" succeed? Look for "✅ Test game inserted"
   - Did "STEP 4" show games increased?
   - Did "STEP 5" show your games?
   - Did "STEP 6" print game details in NOTICES?

2. IF ALL PASSED:
   ✅ Database is working correctly!
   ✅ Test game was added!
   ✅ RLS is working!
   
   → NOW GO TO YOUR DASHBOARD and refresh
   → You should see games in Practice History tab
   
   → IF STILL EMPTY:
   - Open browser console (F12)
   - Look for: "✅ Game history loaded from new table: X games"
   - Look for: "🎮 Game mapped: {...}"
   - If you see "X games" but tabs are empty:
     → Frontend not deployed yet! Push to Vercel!
     → Clear browser cache (Cmd+Shift+R)

3. IF "STEP 3" FAILED:
   ❌ RLS is blocking INSERT
   → Run: COMPLETE_DASHBOARD_FIX.sql again
   → Make sure you are logged in when running this

4. IF "STEP 5" SHOWS GAMES BUT "STEP 6" SHOWS NOTHING:
   ❌ RLS SELECT policy is broken
   → Run: COMPLETE_DASHBOARD_FIX.sql again
   → Check that policies use auth.uid() = user_id

5. AFTER FIXING:
   Play a REAL practice game:
   - Go to /games
   - Pick any game
   - Play in practice mode
   - Check browser console for "Game history saved"
   - Go to /dashboard
   - Should appear in Practice History tab!

============================================
' as final_instructions;

-- Summary of what we found
SELECT '
📊 SUMMARY OF YOUR DATA
' as summary;

SELECT 
    'Total Games' as metric,
    COUNT(*)::TEXT as value
FROM public.game_history
WHERE user_id = auth.uid()

UNION ALL

SELECT 
    'Practice Games' as metric,
    COUNT(*)::TEXT as value
FROM public.game_history
WHERE user_id = auth.uid()
AND is_practice = true

UNION ALL

SELECT 
    'Competition Games' as metric,
    COUNT(*)::TEXT as value
FROM public.game_history
WHERE user_id = auth.uid()
AND is_competition = true

UNION ALL

SELECT 
    'Last Played' as metric,
    COALESCE(MAX(created_at)::TEXT, 'Never') as value
FROM public.game_history
WHERE user_id = auth.uid();

