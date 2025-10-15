-- QUICK DATABASE TEST
-- Run this to verify the database is working correctly

-- Test 1: Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('matchmaking_queue', 'matches', 'game_history', 'users', 'token_transactions') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('matchmaking_queue', 'matches', 'game_history', 'users', 'token_transactions')
ORDER BY table_name;

-- Test 2: Check game_history table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'game_history' 
ORDER BY ordinal_position;

-- Test 3: Check if test user exists
SELECT id, username, email, tokens 
FROM users 
WHERE email = 'ryanfermoselle@yahoo.com';

-- Test 4: Insert a test game history record
INSERT INTO game_history (
    user_id, 
    game_type, 
    score, 
    accuracy, 
    mode, 
    is_practice, 
    is_competition,
    tokens_won,
    result
) VALUES (
    '9af41f59-7c68-4dc9-ae29-8997f4558efa',
    'test-game',
    1000.00,
    100.00,
    'practice',
    true,
    false,
    0.00,
    'completed'
) ON CONFLICT DO NOTHING;

-- Test 5: Verify the test record was inserted
SELECT id, game_type, score, mode, created_at 
FROM game_history 
WHERE user_id = '9af41f59-7c68-4dc9-ae29-8997f4558efa' 
ORDER BY created_at DESC 
LIMIT 5;

-- Test 6: Test the get_user_high_scores function
SELECT * FROM get_user_high_scores('9af41f59-7c68-4dc9-ae29-8997f4558efa');
