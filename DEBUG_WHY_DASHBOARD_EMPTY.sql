-- ============================================
-- DEBUG: WHY IS MY DASHBOARD EMPTY?
-- ============================================
-- Run this to find out exactly what's wrong
-- ============================================

-- Step 1: Check if game_history table exists
SELECT '
============================================
🔍 STEP 1: Does game_history table exist?
============================================
' as step;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'game_history'
        ) THEN '✅ YES - game_history table exists'
        ELSE '❌ NO - game_history table MISSING! Run CREATE_GAME_HISTORY_SYSTEM.sql'
    END as table_status;

-- Step 2: Check what columns exist
SELECT '
============================================
🔍 STEP 2: What columns does it have?
============================================
' as step;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('id', 'user_id', 'game_type', 'score', 'created_at') THEN '✅ Required'
        WHEN column_name = 'session_type' THEN '✅ New schema'
        WHEN column_name = 'is_practice' THEN '✅ Compatibility'
        ELSE '📋 Optional'
    END as importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

-- Step 3: Check if there's ANY data at all
SELECT '
============================================
🔍 STEP 3: Is there ANY data in the table?
============================================
' as step;

SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as oldest_game,
    MAX(created_at) as newest_game
FROM public.game_history;

-- Step 4: Check if RLS is blocking you
SELECT '
============================================
🔍 STEP 4: Is RLS blocking data access?
============================================
' as step;

SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'game_history') as policy_count
FROM pg_tables 
WHERE tablename = 'game_history';

-- Show all policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression
FROM pg_policies 
WHERE tablename = 'game_history';

-- Step 5: Try to query as current user
SELECT '
============================================
🔍 STEP 5: Can YOU see data as current user?
============================================
' as step;

-- This will show data if you can see it
DO $$
DECLARE
    v_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO v_user_id;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ NOT AUTHENTICATED - You must be logged in!';
        RAISE NOTICE 'auth.uid() returned NULL';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Current user ID: %', v_user_id;
    
    -- Try to count your games
    SELECT COUNT(*) INTO v_count
    FROM public.game_history
    WHERE user_id = v_user_id;
    
    RAISE NOTICE '📊 Your games in database: %', v_count;
    
    IF v_count = 0 THEN
        RAISE NOTICE '⚠️ NO GAMES FOUND FOR YOUR USER!';
        RAISE NOTICE 'Either you haven''t played any games, or they didn''t save.';
    ELSE
        RAISE NOTICE '✅ GAMES EXIST! Dashboard should show them.';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;

-- Step 6: Show sample of YOUR data (if any)
SELECT '
============================================
🔍 STEP 6: Show YOUR games (last 5)
============================================
' as step;

SELECT 
    id,
    game_type,
    session_type,
    score,
    accuracy,
    created_at,
    CASE 
        WHEN session_type = 'practice' THEN '🎮 Practice'
        WHEN session_type = 'competition' THEN '🏆 Competition'
        WHEN session_type IN ('wta', '1v1', 'marketplace') THEN '🎯 ' || session_type
        ELSE '❓ Unknown'
    END as game_mode
FROM public.game_history
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Step 7: Test INSERT permission
SELECT '
============================================
🔍 STEP 7: Can you INSERT data?
============================================
' as step;

DO $$
DECLARE
    v_test_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Cannot test INSERT - not authenticated';
        RETURN;
    END IF;
    
    -- Try to insert a test record
    BEGIN
        INSERT INTO public.game_history (
            user_id,
            game_type,
            session_type,
            score,
            accuracy,
            tokens_won,
            tokens_spent,
            created_at
        ) VALUES (
            v_user_id,
            'test_game',
            'practice',
            999,
            100,
            0,
            0,
            NOW()
        ) RETURNING id INTO v_test_id;
        
        RAISE NOTICE '✅ INSERT SUCCESSFUL! Test record ID: %', v_test_id;
        
        -- Clean up
        DELETE FROM public.game_history WHERE id = v_test_id;
        RAISE NOTICE '✅ Test record cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
        RAISE NOTICE 'This means games cannot save!';
    END;
END $$;

-- Step 8: Check if columns match what dashboard expects
SELECT '
============================================
🔍 STEP 8: Column compatibility check
============================================
' as step;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'game_history' 
            AND column_name = 'session_type'
        ) THEN '✅ session_type exists'
        ELSE '❌ session_type MISSING'
    END as session_type_check,
    
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'game_history' 
            AND column_name = 'is_practice'
        ) THEN '✅ is_practice exists (compatibility)'
        ELSE '⚠️ is_practice MISSING (run ENSURE_GAME_HISTORY_COMPATIBILITY.sql)'
    END as is_practice_check,
    
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'game_history' 
            AND column_name = 'is_competition'
        ) THEN '✅ is_competition exists (compatibility)'
        ELSE '⚠️ is_competition MISSING (run ENSURE_GAME_HISTORY_COMPATIBILITY.sql)'
    END as is_competition_check;

-- Step 9: Final diagnosis
SELECT '
============================================
📊 FINAL DIAGNOSIS
============================================

Based on the checks above:

✅ IF ALL CHECKS PASSED:
   - Table exists ✅
   - You can see data ✅
   - You can insert data ✅
   - But dashboard is still empty ❌
   
   → SOLUTION: Frontend code not deployed yet!
   → Go to Vercel and wait for deployment
   → Clear browser cache (Cmd+Shift+R)

⚠️ IF "NO GAMES FOUND FOR YOUR USER":
   - You need to play a game first!
   - Or run: SELECT * FROM test_add_practice_game();
   - Then refresh dashboard

❌ IF "NOT AUTHENTICATED":
   - You are not logged in to Supabase
   - This SQL must run while YOU are logged in
   - Try running in browser console instead

❌ IF "INSERT FAILED":
   - RLS policies are blocking you
   - Run: COMPLETE_DASHBOARD_FIX.sql again
   - Check that RLS policies exist

❌ IF "session_type MISSING":
   - Wrong table schema
   - Run: CREATE_GAME_HISTORY_SYSTEM.sql
   - Then run: ENSURE_GAME_HISTORY_COMPATIBILITY.sql

❌ IF "is_practice MISSING":
   - Compatibility columns not added
   - Run: ENSURE_GAME_HISTORY_COMPATIBILITY.sql

============================================
' as final_diagnosis;

-- Step 10: Show exact query dashboard uses
SELECT '
============================================
📋 DASHBOARD QUERY (what frontend runs)
============================================

The dashboard runs this query:

SELECT * FROM game_history 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 100;

Then it filters in JavaScript:
- Practice tab: filter(g => g.is_practice)
- Competition tab: filter(g => !g.is_practice)

If is_practice column exists, it should work.
If not, dashboard will be empty.

Run this manually:
' as query_info;

-- Run the actual query
SELECT 
    id,
    user_id,
    game_type,
    session_type,
    CASE WHEN session_type = 'practice' THEN true ELSE false END as calculated_is_practice,
    score,
    created_at
FROM public.game_history
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Show computed column check
SELECT '
Check if is_practice is a computed column:
' as computed_check;

SELECT 
    column_name,
    is_generated,
    generation_expression
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
AND column_name IN ('is_practice', 'is_competition', 'session_type');

