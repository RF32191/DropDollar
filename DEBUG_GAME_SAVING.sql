-- QUICK DEBUG TEST FOR GAME SAVING
-- Run this in your Supabase SQL Editor to test if the game_history table exists and works

-- 1. Check if game_history table exists
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

-- 2. Check if save_game_history function exists
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'save_game_history';

-- 3. Test direct insert (replace with your actual user ID)
-- Get your user ID first:
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
    1000,
    95.5,
    250,
    60,
    true,
    NOW()
) RETURNING *;
*/

-- 4. Test RPC function (replace 'YOUR_USER_ID_HERE' with actual user ID):
/*
SELECT save_game_history(
    'YOUR_USER_ID_HERE',
    'test-game',
    1000,
    95.5,
    250,
    60,
    true,
    NULL,
    NULL,
    NULL,
    0,
    0,
    0,
    NULL
);
*/

-- 5. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'game_history';

-- 6. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'game_history';
