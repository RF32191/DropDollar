-- EMERGENCY RLS BYPASS FOR MATCHMAKING_QUEUE
-- This completely disables RLS for the matchmaking_queue table to allow inserts

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'matchmaking_queue';

-- Disable RLS temporarily
ALTER TABLE matchmaking_queue DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'matchmaking_queue';

-- Test insert to verify it works
DO $$
DECLARE
    test_user_id UUID := '9af41f59-7c68-4dc9-ae29-8997f4558efa';
    test_username TEXT := 'test_user_rls_bypass';
    test_entry_fee NUMERIC := 1.00;
    test_game_type TEXT := 'test-game';
    test_lot_number TEXT := 'test-lot-rls-bypass-123';
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
        test_user_id,
        test_username,
        test_entry_fee,
        'waiting',
        test_game_type,
        test_lot_number
    );
    
    RAISE NOTICE '✅ RLS BYPASS SUCCESSFUL - Insert worked!';
    
    -- Clean up test record
    DELETE FROM matchmaking_queue WHERE username = test_username;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ RLS BYPASS FAILED: %', SQLERRM;
END $$;

-- Show current policies (should be empty or inactive)
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'matchmaking_queue';
