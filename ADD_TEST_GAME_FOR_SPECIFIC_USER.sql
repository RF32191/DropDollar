-- ============================================
-- ADD TEST GAME FOR SPECIFIC USER
-- ============================================
-- This bypasses auth.uid() and lets you specify the user
-- ============================================

-- STEP 1: Find your user ID
SELECT '
============================================
👤 STEP 1: Find Your User ID
============================================
Run this query to find your user:
' as step;

SELECT 
    id as user_id,
    email,
    raw_user_meta_data->>'username' as username,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Copy your user_id from above and paste it in the next section

-- ============================================
-- STEP 2: Add test game for that user
-- ============================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from STEP 1
-- ============================================

DO $$
DECLARE
    v_user_id UUID := 'YOUR_USER_ID_HERE'; -- ⚠️ REPLACE THIS!
    v_game_id UUID;
    v_count_before INTEGER;
    v_count_after INTEGER;
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
        RAISE EXCEPTION '❌ User ID % not found! Check STEP 1 and copy the correct ID', v_user_id;
    END IF;
    
    RAISE NOTICE '✅ Found user: %', v_user_id;
    
    -- Count games before
    SELECT COUNT(*) INTO v_count_before
    FROM public.game_history
    WHERE user_id = v_user_id;
    
    RAISE NOTICE '📊 Games before: %', v_count_before;
    
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
    
    -- Count games after
    SELECT COUNT(*) INTO v_count_after
    FROM public.game_history
    WHERE user_id = v_user_id;
    
    RAISE NOTICE '📊 Games after: %', v_count_after;
    RAISE NOTICE '✅ SUCCESS! Added % new game(s)', (v_count_after - v_count_before);
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NOW GO TO YOUR DASHBOARD AND REFRESH!';
    RAISE NOTICE '   The test game should appear in Practice History tab';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RAISE;
END $$;

-- STEP 3: Verify the game was added
SELECT '
============================================
🔍 STEP 3: Verify Game Was Added
============================================
' as step;

-- Show games for the user (replace YOUR_USER_ID_HERE)
SELECT 
    id,
    game_type,
    session_type,
    is_practice,
    score,
    accuracy,
    created_at,
    CASE 
        WHEN is_practice THEN '🎮 Practice'
        ELSE '🏆 Competition'
    END as mode
FROM public.game_history
WHERE user_id = 'YOUR_USER_ID_HERE' -- ⚠️ REPLACE THIS!
ORDER BY created_at DESC
LIMIT 10;

-- STEP 4: Check if user can see it (RLS test)
SELECT '
============================================
🔒 STEP 4: RLS Test
============================================
This checks if the user can see their own data
' as step;

-- This simulates what happens when the user queries
SELECT 
    COUNT(*) as games_visible_to_user,
    COUNT(CASE WHEN is_practice THEN 1 END) as practice_games,
    COUNT(CASE WHEN is_competition THEN 1 END) as competition_games
FROM public.game_history
WHERE user_id = 'YOUR_USER_ID_HERE'; -- ⚠️ REPLACE THIS!

SELECT '
============================================
✅ INSTRUCTIONS
============================================

1. COPY YOUR USER ID from STEP 1 above
   
2. REPLACE ''YOUR_USER_ID_HERE'' in this SQL with your actual user ID
   - Find all 3 places that say YOUR_USER_ID_HERE
   - Replace with your user ID (looks like: a1b2c3d4-e5f6-7890-abcd-ef1234567890)
   
3. RUN THE SQL AGAIN
   
4. You should see:
   ✅ Test game inserted!
   ✅ Games after: 1 (or more)
   
5. GO TO YOUR DASHBOARD and refresh
   - Click "Practice History" tab
   - Test game should appear!

6. IF STILL NOT SHOWING:
   - Open browser console (F12)
   - Look for: "Game history loaded from new table: X games"
   - If it says "0 games" → RLS is blocking
   - If it says "1 games" but tab empty → Frontend not deployed

============================================
' as final_instructions;

