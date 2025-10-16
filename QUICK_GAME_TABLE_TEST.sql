-- QUICK TEST: Check if game_history table exists and works
-- Run this in Supabase SQL Editor to test

-- 1. Check if table exists
SELECT 
    table_name, 
    table_schema 
FROM information_schema.tables 
WHERE table_name = 'game_history' 
AND table_schema = 'public';

-- 2. Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'game_history';

-- 4. Test insert (replace with your actual user ID)
-- First get your user ID:
SELECT id, email FROM auth.users LIMIT 1;

-- Then test insert (replace 'YOUR_USER_ID_HERE' with actual user ID):
/*
INSERT INTO public.game_history (
    user_id, 
    game_type, 
    score, 
    accuracy, 
    avg_reaction_time,
    game_duration,
    is_practice,
    created_at
) VALUES (
    'YOUR_USER_ID_HERE',
    'test-game',
    147.1,
    95.5,
    250,
    60,
    true,
    NOW()
) RETURNING *;
*/

-- 5. Check if RPC function exists
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'save_game_history';
