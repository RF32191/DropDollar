-- QUICK DATABASE CONNECTION TEST
-- Run this to verify the database is accessible and tables exist

-- Test 1: Check if we can connect to the database
SELECT 'Database connection successful' as status;

-- Test 2: Check if matchmaking_queue table exists and is accessible
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matchmaking_queue') 
        THEN '✅ matchmaking_queue table exists'
        ELSE '❌ matchmaking_queue table missing'
    END as table_status;

-- Test 3: Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'matchmaking_queue' 
ORDER BY ordinal_position;

-- Test 4: Test insert (this will fail if RLS is blocking)
DO $$
BEGIN
    -- Try to insert a test record
    INSERT INTO matchmaking_queue (
        user_id, 
        username, 
        entry_fee, 
        status, 
        game_type, 
        lot_number
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- Test UUID
        'test_user',
        1.00,
        'waiting',
        'test-game',
        'test-lot-123'
    );
    
    RAISE NOTICE '✅ Insert test successful - RLS policies working';
    
    -- Clean up test record
    DELETE FROM matchmaking_queue WHERE username = 'test_user';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Insert test failed: %', SQLERRM;
END $$;

-- Test 5: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'matchmaking_queue';

-- Test 6: Check if find_or_create_lot function exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'find_or_create_lot') 
        THEN '✅ find_or_create_lot function exists'
        ELSE '❌ find_or_create_lot function missing'
    END as function_status;
