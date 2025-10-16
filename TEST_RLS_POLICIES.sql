-- TEST RLS POLICIES FOR GAME_HISTORY
-- Run this in Supabase SQL Editor to check if RLS is blocking inserts

-- 1. Check current RLS policies
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

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'game_history';

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

-- 4. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'game_history';

-- 5. Check if the table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;
