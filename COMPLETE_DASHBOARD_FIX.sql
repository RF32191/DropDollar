-- ============================================
-- COMPLETE DASHBOARD PRACTICE GAMES FIX
-- ============================================
-- This will make practice games appear in dashboard
-- ============================================

-- Step 1: Check current state
SELECT '
============================================
🔍 DIAGNOSTIC: Checking Current State
============================================
' as status;

-- Show current game_history table structure
SELECT 
    '📊 Current game_history columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

-- Check if there's any data
SELECT 
    '📊 Total records in game_history:' as info,
    COUNT(*) as total_records,
    COUNT(CASE WHEN session_type = 'practice' THEN 1 END) as practice_games,
    COUNT(CASE WHEN session_type != 'practice' THEN 1 END) as competition_games
FROM public.game_history;

-- Check RLS policies
SELECT 
    '🔒 RLS Policies on game_history:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'game_history';

-- Step 2: Ensure RLS is properly configured
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled on game_history';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ RLS already enabled or error: %', SQLERRM;
END $$;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
DROP POLICY IF EXISTS "users_view_own_games" ON public.game_history;
DROP POLICY IF EXISTS "users_insert_own_games" ON public.game_history;

-- Create simple, working policies
CREATE POLICY "users_view_own_games"
    ON public.game_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_games"
    ON public.game_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON public.game_history TO authenticated;

SELECT '✅ RLS policies recreated' as status;

-- Step 3: Create a view for easier querying (optional but helpful)
DROP VIEW IF EXISTS public.user_practice_games CASCADE;
CREATE OR REPLACE VIEW public.user_practice_games AS
SELECT 
    gh.id,
    gh.user_id,
    gh.game_type,
    gh.session_type,
    gh.score,
    gh.accuracy,
    gh.avg_reaction_time,
    gh.tokens_won,
    gh.tokens_spent,
    gh.created_at,
    u.username,
    u.email
FROM public.game_history gh
LEFT JOIN public.users u ON u.id = gh.user_id
WHERE gh.session_type = 'practice'
ORDER BY gh.created_at DESC;

GRANT SELECT ON public.user_practice_games TO authenticated;

SELECT '✅ Practice games view created' as status;

-- Step 4: Test direct query (simulates what dashboard does)
SELECT '
============================================
🧪 TEST: Simulating Dashboard Query
============================================
' as status;

-- Get first authenticated user for testing
DO $$
DECLARE
    v_test_user_id UUID;
    v_game_count INTEGER;
BEGIN
    -- Get first user
    SELECT id INTO v_test_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF v_test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No users found in auth.users for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing with user: %', v_test_user_id;
    
    -- Simulate dashboard query
    SELECT COUNT(*) INTO v_game_count
    FROM public.game_history
    WHERE user_id = v_test_user_id;
    
    RAISE NOTICE '📊 Games found for user: %', v_game_count;
    
    IF v_game_count = 0 THEN
        RAISE NOTICE '⚠️ No games found. User needs to play a practice game first!';
    ELSE
        RAISE NOTICE '✅ Games exist! Dashboard should display them.';
    END IF;
    
END $$;

-- Step 5: Create debug function for users
CREATE OR REPLACE FUNCTION public.check_my_game_history()
RETURNS TABLE (
    total_games BIGINT,
    practice_games BIGINT,
    competition_games BIGINT,
    latest_game_date TIMESTAMPTZ,
    sample_games JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN session_type = 'practice' THEN 1 END) as practice_games,
        COUNT(CASE WHEN session_type IN ('competition', 'wta', '1v1', 'marketplace') THEN 1 END) as competition_games,
        MAX(created_at) as latest_game_date,
        jsonb_agg(
            jsonb_build_object(
                'game_type', game_type,
                'session_type', session_type,
                'score', score,
                'created_at', created_at
            )
            ORDER BY created_at DESC
        ) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as sample_games
    FROM public.game_history
    WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_my_game_history() TO authenticated;

SELECT '✅ Debug function created: check_my_game_history()' as status;

-- Step 6: Create function to manually add a test practice game
CREATE OR REPLACE FUNCTION public.test_add_practice_game(
    p_game_type TEXT DEFAULT 'crypto_match',
    p_score NUMERIC DEFAULT 100
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    game_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_game_id UUID;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, 'Not authenticated', NULL::UUID;
        RETURN;
    END IF;
    
    -- Insert test game
    INSERT INTO public.game_history (
        user_id,
        game_type,
        session_type,
        score,
        accuracy,
        avg_reaction_time,
        tokens_won,
        tokens_spent,
        result,
        created_at
    ) VALUES (
        v_user_id,
        p_game_type,
        'practice',
        p_score,
        95.0,
        250,
        0,
        0,
        'participated',
        NOW()
    ) RETURNING id INTO v_game_id;
    
    RETURN QUERY SELECT 
        true, 
        'Test practice game added! Check your dashboard.', 
        v_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_add_practice_game(TEXT, NUMERIC) TO authenticated;

SELECT '✅ Test function created: test_add_practice_game()' as status;

-- Step 7: Show final status
SELECT '
============================================
✅ DASHBOARD FIX COMPLETE!
============================================

🎯 WHAT WAS FIXED:
1. RLS policies recreated (simple and working)
2. Permissions granted to authenticated users
3. View created for easy practice game queries
4. Debug functions added

🧪 TEST IT NOW:

Option A - Add a test game (while signed in):
SELECT * FROM test_add_practice_game(''crypto_match'', 150);

Option B - Check your current games:
SELECT * FROM check_my_game_history();

Option C - Play a real practice game:
1. Go to /games
2. Play any game in practice mode
3. Go to /dashboard
4. Click "Practice History" tab

🔍 IF STILL NOT WORKING:

Run this to see if games are saving:
SELECT * FROM public.game_history 
WHERE user_id = auth.uid()
ORDER BY created_at DESC 
LIMIT 10;

If this returns games but dashboard is empty:
- Clear browser cache
- Check browser console for errors
- Make sure Vercel deployment is complete

If this returns NO games:
- Games are not saving
- Check browser console during game play
- Look for "Game history saved" message

============================================
' as final_instructions;

-- Show sample query that dashboard uses
SELECT '
📋 DASHBOARD QUERY (what the frontend runs):

SELECT * FROM game_history 
WHERE user_id = ''YOUR_USER_ID''
ORDER BY created_at DESC 
LIMIT 100;

This should return all your games.
Practice History tab filters: WHERE session_type = ''practice''
Competition History tab filters: WHERE session_type IN (''competition'', ''wta'', ''1v1'', ''marketplace'')

' as dashboard_query_info;
