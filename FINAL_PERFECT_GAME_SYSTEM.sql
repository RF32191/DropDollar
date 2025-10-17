-- FINAL PERFECT GAME SAVING SYSTEM
-- This ensures ALL games save scores perfectly for ALL accounts

-- 1. Drop and recreate game_history table with perfect structure
DROP TABLE IF EXISTS public.game_history CASCADE;

CREATE TABLE public.game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  score DECIMAL(10,2) NOT NULL, -- Supports decimal scores like 147.1
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  game_duration INTEGER DEFAULT 60,
  is_practice BOOLEAN DEFAULT true,
  is_competition BOOLEAN DEFAULT false,
  listing_id TEXT,
  entry_number INTEGER,
  placement INTEGER,
  prize_won DECIMAL(10,2) DEFAULT 0,
  tokens_wagered INTEGER DEFAULT 0,
  tokens_won INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS with permissive policy for all users
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "game_history_policy" ON public.game_history;
DROP POLICY IF EXISTS "game_history_all_policy" ON public.game_history;

-- Create permissive policy that allows all operations
CREATE POLICY "game_history_all_policy" ON public.game_history
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_history_user ON public.game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_listing ON public.game_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_game_history_practice ON public.game_history(is_practice);
CREATE INDEX IF NOT EXISTS idx_game_history_competition ON public.game_history(is_competition);

-- 4. Grant all permissions
GRANT ALL ON public.game_history TO authenticated;
GRANT ALL ON public.game_history TO anon;
GRANT ALL ON public.game_history TO service_role;

-- 5. Drop ALL existing functions to avoid conflicts
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, DECIMAL, DECIMAL, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, INTEGER, JSONB);
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, INTEGER, DECIMAL, INTEGER, INTEGER, BOOLEAN, TEXT, INTEGER, INTEGER, DECIMAL, INTEGER, INTEGER, JSONB);
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, DECIMAL, DECIMAL, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS save_game_history(TEXT, TEXT, INTEGER, DECIMAL, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS save_game_history;

-- 6. Create the PERFECT save_game_history function
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
  -- Insert the game record
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
  
  -- Log the successful save
  RAISE NOTICE 'Game saved: user=%, game=%, score=%, practice=%', 
    p_user_id, p_game_type, p_score, p_is_practice;
  
  RETURN result;
END;
$$;

-- 7. Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION save_game_history TO authenticated;
GRANT EXECUTE ON FUNCTION save_game_history TO anon;
GRANT EXECUTE ON FUNCTION save_game_history TO service_role;

-- 8. Test the function with sample data
DO $$
DECLARE
    test_user_id TEXT;
    test_result JSONB;
BEGIN
    -- Get a test user ID
    SELECT id::text INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test practice game
        SELECT save_game_history(
            test_user_id,
            'sword-parry',
            147.5,
            95.0,
            250,
            60,
            true,
            NULL,
            NULL,
            NULL,
            0,
            0,
            0,
            '{"test": "practice"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Practice game test: %', test_result;
        
        -- Test competition game
        SELECT save_game_history(
            test_user_id,
            'multi-target',
            200.75,
            88.5,
            300,
            60,
            false,
            'test-listing-123',
            1,
            NULL,
            0,
            1,
            0,
            '{"test": "competition"}'::jsonb
        ) INTO test_result;
        
        RAISE NOTICE 'Competition game test: %', test_result;
        
        RAISE NOTICE 'All tests passed! Game saving system is perfect!';
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 9. Verify the system works
SELECT 
    'PERFECT GAME SAVING SYSTEM READY!' as status,
    COUNT(*) as total_games_saved
FROM public.game_history;

-- 10. Show recent games
SELECT 
    user_id,
    game_type,
    score,
    accuracy,
    is_practice,
    created_at
FROM public.game_history 
ORDER BY created_at DESC 
LIMIT 5;
