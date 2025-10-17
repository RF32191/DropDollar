-- COMPLETE TOURNAMENT SYSTEM SETUP
-- 1v1 Tournaments, Group Battles, Hot Sell, and Prize Distribution

-- 1. Drop all existing tournament-related tables and functions
DROP FUNCTION IF EXISTS matchmaking_join_queue(TEXT, TEXT);
DROP FUNCTION IF EXISTS matchmaking_find_opponent(TEXT, TEXT);
DROP FUNCTION IF EXISTS matchmaking_update_rating(TEXT, TEXT, DECIMAL, BOOLEAN);
DROP FUNCTION IF EXISTS create_tournament(TEXT, TEXT, INTEGER, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS join_tournament(TEXT, TEXT);
DROP FUNCTION IF EXISTS start_tournament(TEXT);
DROP FUNCTION IF EXISTS complete_tournament_match(TEXT, TEXT, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS distribute_tournament_prizes(TEXT);

DROP TABLE IF EXISTS public.tournaments CASCADE;
DROP TABLE IF EXISTS public.tournament_participants CASCADE;
DROP TABLE IF EXISTS public.tournament_matches CASCADE;
DROP TABLE IF EXISTS public.tournament_results CASCADE;
DROP TABLE IF EXISTS public.hot_sell_listings CASCADE;
DROP TABLE IF EXISTS public.group_battles CASCADE;
DROP TABLE IF EXISTS public.group_battle_participants CASCADE;
DROP TABLE IF EXISTS public.physical_listings CASCADE;
DROP TABLE IF EXISTS public.listing_participants CASCADE;
DROP TABLE IF EXISTS public.skill_ratings CASCADE;
DROP TABLE IF EXISTS public.matchmaking_queue CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;

-- 2. Create skill ratings table for matchmaking
CREATE TABLE public.skill_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  skill_rating INTEGER DEFAULT 1000,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  avg_score DECIMAL(10,2) DEFAULT 0,
  best_score DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- 3. Create matchmaking queue for 1v1 tournaments
CREATE TABLE public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  skill_rating INTEGER NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  queue_joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create 1v1 tournaments table
CREATE TABLE public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  max_participants INTEGER DEFAULT 2,
  prize_pool INTEGER DEFAULT 2,
  status TEXT DEFAULT 'waiting', -- waiting, active, completed, cancelled
  created_by TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create tournament participants table
CREATE TABLE public.tournament_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  skill_rating INTEGER NOT NULL,
  entry_fee_paid INTEGER NOT NULL,
  status TEXT DEFAULT 'active', -- active, eliminated, winner
  placement INTEGER,
  prize_won INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create tournament matches table
CREATE TABLE public.tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player1_id TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  player1_score DECIMAL(10,2),
  player2_score DECIMAL(10,2),
  winner_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 7. Create group battles table (for multiple players)
CREATE TABLE public.group_battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  max_participants INTEGER DEFAULT 10,
  prize_pool INTEGER DEFAULT 10,
  prize_distribution JSONB DEFAULT '{"1st": 0.5, "2nd": 0.3, "3rd": 0.2}',
  status TEXT DEFAULT 'waiting',
  created_by TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create group battle participants table
CREATE TABLE public.group_battle_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.group_battles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  entry_fee_paid INTEGER NOT NULL,
  score DECIMAL(10,2),
  placement INTEGER,
  prize_won INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create hot sell listings table (big cash prizes)
CREATE TABLE public.hot_sell_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  prize_pool DECIMAL(10,2) NOT NULL,
  prize_distribution JSONB DEFAULT '{"1st": 0.5, "2nd": 0.3, "3rd": 0.2}',
  max_participants INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  created_by TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create hot sell participants table
CREATE TABLE public.hot_sell_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.hot_sell_listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  entry_fee_paid INTEGER NOT NULL,
  score DECIMAL(10,2),
  placement INTEGER,
  prize_won DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create physical listings table (for physical prizes)
CREATE TABLE public.physical_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 1,
  item_value DECIMAL(10,2) NOT NULL,
  seller_id TEXT NOT NULL,
  seller_address TEXT,
  item_condition TEXT,
  images JSONB,
  max_participants INTEGER DEFAULT 50,
  status TEXT DEFAULT 'active',
  winner_id TEXT,
  winner_address TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create physical listing participants table
CREATE TABLE public.physical_listing_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.physical_listings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  entry_fee_paid INTEGER NOT NULL,
  score DECIMAL(10,2),
  placement INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Enable RLS on all tables
ALTER TABLE public.skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_sell_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hot_sell_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_listing_participants ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies (allow all for now)
CREATE POLICY "skill_ratings_all_policy" ON public.skill_ratings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "matchmaking_queue_all_policy" ON public.matchmaking_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tournaments_all_policy" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tournament_participants_all_policy" ON public.tournament_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tournament_matches_all_policy" ON public.tournament_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_battles_all_policy" ON public.group_battles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "group_battle_participants_all_policy" ON public.group_battle_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hot_sell_listings_all_policy" ON public.hot_sell_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "hot_sell_participants_all_policy" ON public.hot_sell_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "physical_listings_all_policy" ON public.physical_listings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "physical_listing_participants_all_policy" ON public.physical_listing_participants FOR ALL USING (true) WITH CHECK (true);

-- 15. Grant permissions
GRANT ALL ON public.skill_ratings TO authenticated;
GRANT ALL ON public.skill_ratings TO anon;
GRANT ALL ON public.matchmaking_queue TO authenticated;
GRANT ALL ON public.matchmaking_queue TO anon;
GRANT ALL ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO anon;
GRANT ALL ON public.tournament_participants TO authenticated;
GRANT ALL ON public.tournament_participants TO anon;
GRANT ALL ON public.tournament_matches TO authenticated;
GRANT ALL ON public.tournament_matches TO anon;
GRANT ALL ON public.group_battles TO authenticated;
GRANT ALL ON public.group_battles TO anon;
GRANT ALL ON public.group_battle_participants TO authenticated;
GRANT ALL ON public.group_battle_participants TO anon;
GRANT ALL ON public.hot_sell_listings TO authenticated;
GRANT ALL ON public.hot_sell_listings TO anon;
GRANT ALL ON public.hot_sell_participants TO authenticated;
GRANT ALL ON public.hot_sell_participants TO anon;
GRANT ALL ON public.physical_listings TO authenticated;
GRANT ALL ON public.physical_listings TO anon;
GRANT ALL ON public.physical_listing_participants TO authenticated;
GRANT ALL ON public.physical_listing_participants TO anon;

-- 16. Create indexes for performance
CREATE INDEX idx_skill_ratings_user_game ON public.skill_ratings(user_id, game_type);
CREATE INDEX idx_matchmaking_queue_game_status ON public.matchmaking_queue(game_type, status);
CREATE INDEX idx_tournaments_status ON public.tournaments(status);
CREATE INDEX idx_tournament_participants_tournament ON public.tournament_participants(tournament_id);
CREATE INDEX idx_group_battles_status ON public.group_battles(status);
CREATE INDEX idx_hot_sell_listings_status ON public.hot_sell_listings(status);
CREATE INDEX idx_physical_listings_status ON public.physical_listings(status);

-- 17. Create tournament functions
CREATE OR REPLACE FUNCTION create_1v1_tournament(
  p_name TEXT,
  p_game_type TEXT,
  p_entry_fee INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.tournaments (name, game_type, entry_fee, max_participants, prize_pool, created_by)
  VALUES (p_name, p_game_type, p_entry_fee, 2, p_entry_fee * 2, p_name)
  RETURNING to_jsonb(tournaments.*) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION join_1v1_tournament(
  p_tournament_id UUID,
  p_user_id TEXT,
  p_entry_fee INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tournament_record RECORD;
  user_skill_rating INTEGER;
  result JSONB;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record FROM public.tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Tournament not found"}'::jsonb;
  END IF;
  
  -- Get user skill rating
  SELECT skill_rating INTO user_skill_rating
  FROM public.skill_ratings
  WHERE user_id = p_user_id AND game_type = tournament_record.game_type;
  
  IF user_skill_rating IS NULL THEN
    user_skill_rating := 1000;
  END IF;
  
  -- Add participant
  INSERT INTO public.tournament_participants (tournament_id, user_id, skill_rating, entry_fee_paid)
  VALUES (p_tournament_id, p_user_id, user_skill_rating, p_entry_fee)
  RETURNING to_jsonb(tournament_participants.*) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION create_hot_sell_listing(
  p_title TEXT,
  p_description TEXT,
  p_game_type TEXT,
  p_entry_fee INTEGER,
  p_prize_pool DECIMAL(10,2),
  p_max_participants INTEGER DEFAULT 100,
  p_created_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.hot_sell_listings (
    title, description, game_type, entry_fee, prize_pool, 
    max_participants, created_by
  )
  VALUES (
    p_title, p_description, p_game_type, p_entry_fee, p_prize_pool,
    p_max_participants, p_created_by
  )
  RETURNING to_jsonb(hot_sell_listings.*) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION join_hot_sell_listing(
  p_listing_id UUID,
  p_user_id TEXT,
  p_entry_fee INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.hot_sell_participants (listing_id, user_id, entry_fee_paid)
  VALUES (p_listing_id, p_user_id, p_entry_fee)
  RETURNING to_jsonb(hot_sell_participants.*) INTO result;
  
  RETURN result;
END;
$$;

-- 18. Grant execute permissions
GRANT EXECUTE ON FUNCTION create_1v1_tournament TO authenticated;
GRANT EXECUTE ON FUNCTION create_1v1_tournament TO anon;
GRANT EXECUTE ON FUNCTION join_1v1_tournament TO authenticated;
GRANT EXECUTE ON FUNCTION join_1v1_tournament TO anon;
GRANT EXECUTE ON FUNCTION create_hot_sell_listing TO authenticated;
GRANT EXECUTE ON FUNCTION create_hot_sell_listing TO anon;
GRANT EXECUTE ON FUNCTION join_hot_sell_listing TO authenticated;
GRANT EXECUTE ON FUNCTION join_hot_sell_listing TO anon;

-- 19. Create the $50,000 hot sell listing
INSERT INTO public.hot_sell_listings (
  title,
  description,
  game_type,
  entry_fee,
  prize_pool,
  max_participants,
  created_by
) VALUES (
  'MEGA CASH TOURNAMENT - $50,000 PRIZE POOL',
  'The biggest tournament on DropDollar! Compete for massive cash prizes. 1st place gets $25,000 (minus 15% fee), 2nd place gets $15,000 (minus 15% fee), 3rd place gets $10,000 (minus 15% fee).',
  'sword-parry',
  10,
  50000.00,
  1000,
  'system'
);

-- 20. Test the system
SELECT 'COMPLETE TOURNAMENT SYSTEM READY!' as status;
