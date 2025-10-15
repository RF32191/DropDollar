-- FIX RLS POLICIES FOR MATCHMAKING_QUEUE
-- This will fix the "new row violates row-level security policy" error

-- First, check current policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'matchmaking_queue';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can update their own queue entries" ON matchmaking_queue;
DROP POLICY IF EXISTS "Users can delete their own queue entries" ON matchmaking_queue;

-- Create new, more permissive policies
CREATE POLICY "Users can view all queue entries" ON matchmaking_queue
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own queue entries" ON matchmaking_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue entries" ON matchmaking_queue
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue entries" ON matchmaking_queue
    FOR DELETE USING (auth.uid() = user_id);

-- Alternative: Temporarily disable RLS for testing
-- ALTER TABLE matchmaking_queue DISABLE ROW LEVEL SECURITY;

-- Test insert (this should work now)
DO $$
DECLARE
    test_user_id UUID := '9af41f59-7c68-4dc9-ae29-8997f4558efa';
    test_username TEXT := 'test_user';
    test_entry_fee NUMERIC := 1.00;
    test_game_type TEXT := 'test-game';
    test_lot_number TEXT := 'test-lot-123';
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
    
    RAISE NOTICE '✅ Test insert successful - RLS policies working';
    
    -- Clean up test record
    DELETE FROM matchmaking_queue WHERE username = test_username;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;

-- Show updated policies
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'matchmaking_queue';
