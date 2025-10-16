-- SIMPLE WORKING GAME SYSTEM - LIKE TRANSACTIONS
-- This creates a simple game_history table that actually works

-- 1. Drop problematic tables first
DROP TABLE IF EXISTS public.high_scores CASCADE;
DROP TABLE IF EXISTS public.user_game_stats CASCADE;
DROP TRIGGER IF EXISTS trigger_update_game_stats ON public.game_history;
DROP FUNCTION IF EXISTS update_game_stats();

-- 2. Create simple game_history table (like token_transactions)
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
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

-- 3. Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy
DROP POLICY IF EXISTS "game_history_policy" ON public.game_history;
CREATE POLICY "game_history_policy" ON public.game_history
  FOR ALL USING (auth.uid()::text = user_id);

-- 5. Create indexes (like token_transactions)
CREATE INDEX IF NOT EXISTS idx_game_history_user ON public.game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_listing ON public.game_history(listing_id);

-- 6. Grant permissions
GRANT ALL ON public.game_history TO authenticated;

-- 7. Test with sample data
DO $$
DECLARE
    test_user_id TEXT;
BEGIN
    -- Get a test user ID
    SELECT id::text INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert test practice game
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time, 
            is_practice, created_at
        ) VALUES (
            test_user_id, 'sword-parry', 1500, 88.5, 250, 
            true, NOW()
        );
        
        -- Insert test competition game
        INSERT INTO public.game_history (
            user_id, game_type, score, accuracy, avg_reaction_time,
            is_practice, created_at
        ) VALUES (
            test_user_id, 'quick-click', 2000, 92.0, 180,
            false, NOW()
        );
        
        RAISE NOTICE 'Test data inserted successfully for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found to test with';
    END IF;
END $$;

-- 8. Verify everything works
SELECT 'Simple Game System Setup Complete!' as status;

-- Show table structure
SELECT 'game_history structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

-- Show table count
SELECT 
    'game_history' as table_name, 
    count(*) as row_count 
FROM public.game_history;
