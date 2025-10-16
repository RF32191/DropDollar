-- FIX SCORE DATA TYPE FOR DECIMAL VALUES
-- Change score from INTEGER to DECIMAL to handle decimal scores like 147.1

-- 1. Alter the score column to accept decimal values
ALTER TABLE public.game_history 
ALTER COLUMN score TYPE DECIMAL(10,2);

-- 2. Update the RPC function to handle decimal scores
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

-- 4. Test with decimal score
DO $$
DECLARE
    test_user_id TEXT;
BEGIN
    -- Get a test user ID
    SELECT id::text INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test with decimal score
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time, 
            is_practice, created_at
        ) VALUES (
            test_user_id, 'decimal-test', 147.1, 95.5, 250, 
            true, NOW()
        );
        
        RAISE NOTICE 'Decimal score test successful for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 5. Verify the change
SELECT 'Score column updated to DECIMAL(10,2)' as status;

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
AND column_name = 'score';
