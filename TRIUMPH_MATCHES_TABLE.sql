-- TRIUMPH-STYLE MATCHES TABLE
-- This creates the exact same table structure as Triumph uses for 1v1 matchmaking

-- Drop existing matches table if it exists
DROP TABLE IF EXISTS public.matches CASCADE;

-- Create matches table (Triumph-style)
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player1_username TEXT NOT NULL,
  player1_score INTEGER,
  player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player2_username TEXT,
  player2_score INTEGER,
  entry_fee INTEGER NOT NULL CHECK (entry_fee IN (1, 5, 10, 25)),
  prize_pool DECIMAL(10,2) NOT NULL,
  game_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting_for_game', 'in_progress', 'completed', 'expired')) DEFAULT 'waiting_for_game',
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_payment_intent_p1 TEXT,
  stripe_payment_intent_p2 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for fast lookups
CREATE INDEX idx_matches_game_type ON public.matches(game_type);
CREATE INDEX idx_matches_entry_fee ON public.matches(entry_fee);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_player1_id ON public.matches(player1_id);
CREATE INDEX idx_matches_player2_id ON public.matches(player2_id);
CREATE INDEX idx_matches_waiting ON public.matches(game_type, entry_fee, status) WHERE status = 'waiting_for_game';

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all matches" ON public.matches
    FOR SELECT USING (true);

CREATE POLICY "Users can insert matches" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Users can update their matches" ON public.matches
    FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Test the table
DO $$
DECLARE
    test_user1_id UUID := '9af41f59-7c68-4dc9-ae29-8997f4558efa';
    test_user2_id UUID := gen_random_uuid();
BEGIN
    -- Test insert
    INSERT INTO public.matches (
        player1_id, 
        player1_username, 
        entry_fee, 
        prize_pool, 
        game_type, 
        status
    ) VALUES (
        test_user1_id,
        'test_player1',
        1,
        2.00,
        'quick-click',
        'waiting_for_game'
    );
    
    RAISE NOTICE '✅ Matches table created and tested successfully!';
    
    -- Clean up test data
    DELETE FROM public.matches WHERE player1_username = 'test_player1';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating matches table: %', SQLERRM;
END $$;

-- Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matches' AND table_schema = 'public';
