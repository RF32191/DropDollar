-- SIMPLE FUNCTION FIX - Just fix the function conflict
-- Run this if you get "function name save_game_history is not unique" error

-- 1. Drop all existing save_game_history functions
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, DECIMAL, DECIMAL, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, INTEGER, JSONB);
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, INTEGER, DECIMAL, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, INTEGER, JSONB);
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, DECIMAL, DECIMAL, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS save_game_history;
DROP FUNCTION IF EXISTS public.save_game_history;

-- 2. Create the correct function
CREATE OR REPLACE FUNCTION save_game_history(
  p_user_id TEXT,
  p_game_type TEXT,
  p_score DECIMAL(10,2),
  p_accuracy DECIMAL(5,2),
  p_avg_reaction_time INTEGER,
  p_game_duration INTEGER,
  p_is_practice BOOLEAN,
  p_listing_id TEXT DEFAULT NULL,
  p_entry_number INTEGER DEFAULT NULL,
  p_placement INTEGER DEFAULT NULL,
  p_prize_won DECIMAL(10,2) DEFAULT 0,
  p_tokens_wagered INTEGER DEFAULT 0,
  p_tokens_won INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.game_history (
    user_id, game_type, score, accuracy, avg_reaction_time,
    game_duration, is_practice, is_competition, listing_id,
    entry_number, placement, prize_won, tokens_wagered,
    tokens_won, metadata, created_at
  ) VALUES (
    p_user_id, p_game_type, p_score, p_accuracy, p_avg_reaction_time,
    p_game_duration, p_is_practice, NOT p_is_practice, p_listing_id,
    p_entry_number, p_placement, p_prize_won, p_tokens_wagered,
    p_tokens_won, p_metadata, NOW()
  ) RETURNING to_jsonb(game_history.*) INTO result;
  
  RETURN result;
END;
$$;

-- 3. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION save_game_history TO authenticated;
GRANT EXECUTE ON FUNCTION save_game_history TO anon;

-- 4. Test the function
DO $$
DECLARE
    test_user_id TEXT;
    test_result JSONB;
BEGIN
    -- Get a test user ID
    SELECT id::text INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT save_game_history(
            test_user_id,
            'test-function',
            123.45,
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
            '{"test": true}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Function test successful! Result: %', test_result;
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 5. Verify function exists
SELECT 
    routine_name, 
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'save_game_history';

SELECT 'Function fix complete!' as status;
