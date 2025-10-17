-- DEBUG: Test if games are saving properly
-- Run this after playing a game to see if it was saved

-- 1. Check recent game_history entries
SELECT 
    user_id,
    game_type,
    score,
    accuracy,
    is_practice,
    created_at
FROM public.game_history 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check if specific games are being saved
SELECT 
    game_type,
    COUNT(*) as count,
    AVG(score) as avg_score,
    MAX(score) as max_score
FROM public.game_history 
GROUP BY game_type
ORDER BY count DESC;

-- 3. Check if practice vs competition games are being saved
SELECT 
    is_practice,
    COUNT(*) as count,
    AVG(score) as avg_score
FROM public.game_history 
GROUP BY is_practice;

-- 4. Check if the save_game_history function works
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
/*
SELECT save_game_history(
    'YOUR_USER_ID_HERE',
    'debug-test',
    999.99,
    100.0,
    200,
    60,
    true,
    NULL,
    NULL,
    NULL,
    0,
    0,
    0,
    '{"debug": true}'::jsonb
);
*/