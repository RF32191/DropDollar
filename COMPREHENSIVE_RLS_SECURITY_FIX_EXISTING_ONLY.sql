-- ========================================
-- COMPREHENSIVE RLS SECURITY FIX (ONLY EXISTING TABLES)
-- ========================================
-- This script enables RLS on all public tables and creates proper security policies
-- Run this in Supabase SQL Editor to fix all security issues
-- ONLY processes tables that actually exist in your database

-- ========================================
-- 1. ENABLE RLS ON ALL EXISTING PUBLIC TABLES
-- ========================================

DO $$
BEGIN
    -- Enable RLS on core tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_bank_accounts') THEN
        ALTER TABLE public.stripe_bank_accounts ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
        ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_history') THEN
        ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'high_scores') THEN
        ALTER TABLE public.high_scores ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_transactions') THEN
        ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_balances') THEN
        ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_levels') THEN
        ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
        ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_sessions') THEN
        ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_transactions') THEN
        ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_bank_accounts') THEN
        ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seller_payouts') THEN
        ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_locations') THEN
        ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_compliance_log') THEN
        ALTER TABLE public.location_compliance_log ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on tournament and matchmaking tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournaments') THEN
        ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_participants') THEN
        ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_matches') THEN
        ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matches') THEN
        ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matchmaking_queue') THEN
        ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skill_ratings') THEN
        ALTER TABLE public.skill_ratings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on listing and marketplace tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
        ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_images') THEN
        ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_entries') THEN
        ALTER TABLE public.listing_entries ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on fixed games tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_games_config') THEN
        ALTER TABLE public.fixed_games_config ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'active_fixed_games') THEN
        ALTER TABLE public.active_fixed_games ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_game_participants') THEN
        ALTER TABLE public.fixed_game_participants ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_listings') THEN
        ALTER TABLE public.hot_sell_listings ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_participants') THEN
        ALTER TABLE public.hot_sell_participants ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_sessions') THEN
        ALTER TABLE public.hot_sell_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    RAISE NOTICE 'RLS enabled on all existing tables';
END $$;

-- ========================================
-- 2. DROP EXISTING POLICIES (SAFE)
-- ========================================

-- Drop all existing policies to avoid conflicts (only if they exist)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for registration" ON public.users;
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can update own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can view own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can insert own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can update own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Public can view high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can view own token transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can insert own token transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can view own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update own level" ON public.user_levels;
DROP POLICY IF EXISTS "Public can view user levels" ON public.user_levels;
DROP POLICY IF EXISTS "Users can view own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can insert own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can view own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can insert own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can view own escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can insert own escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can view own seller payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Users can insert own seller payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Users can view own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can view own compliance log" ON public.location_compliance_log;
DROP POLICY IF EXISTS "Users can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can view tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can insert tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can update tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can view matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update matches" ON public.matches;
DROP POLICY IF EXISTS "Users can view own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can update own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can delete own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can view own skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Users can insert own skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Users can update own skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Public can view skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Public can view listings" ON public.listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can view own listing entries" ON public.listing_entries;
DROP POLICY IF EXISTS "Users can insert own listing entries" ON public.listing_entries;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view fixed games config" ON public.fixed_games_config;
DROP POLICY IF EXISTS "Public can view active fixed games" ON public.active_fixed_games;
DROP POLICY IF EXISTS "Users can view own fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Users can insert own fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Users can update own fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Public can view fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Public can view hot sell listings" ON public.hot_sell_listings;
DROP POLICY IF EXISTS "Users can view own hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can insert own hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can update own hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view hot sell sessions" ON public.hot_sell_sessions;

-- ========================================
-- 3. CREATE COMPREHENSIVE RLS POLICIES (ONLY FOR EXISTING TABLES)
-- ========================================

DO $$
BEGIN
    -- Users policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Enable insert for registration" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    -- Stripe bank accounts policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_bank_accounts') THEN
        CREATE POLICY "Users can view own bank accounts" ON public.stripe_bank_accounts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own bank accounts" ON public.stripe_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own bank accounts" ON public.stripe_bank_accounts FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own bank accounts" ON public.stripe_bank_accounts FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Withdrawal requests policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
        CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own withdrawal requests" ON public.withdrawal_requests FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Game history policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_history') THEN
        CREATE POLICY "Users can view own game history" ON public.game_history FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own game history" ON public.game_history FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- High scores policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'high_scores') THEN
        CREATE POLICY "Users can view own high scores" ON public.high_scores FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own high scores" ON public.high_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own high scores" ON public.high_scores FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Public can view high scores" ON public.high_scores FOR SELECT USING (true); -- For leaderboards
    END IF;

    -- Token transactions policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_transactions') THEN
        CREATE POLICY "Users can view own token transactions" ON public.token_transactions FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own token transactions" ON public.token_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- User balances policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_balances') THEN
        CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update own balance" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- User levels policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_levels') THEN
        CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can update own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Public can view user levels" ON public.user_levels FOR SELECT USING (true); -- For skill-based matchmaking
    END IF;

    -- Payment transactions policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
        CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own payment transactions" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Game sessions policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_sessions') THEN
        CREATE POLICY "Users can view own game sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own game sessions" ON public.game_sessions FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Escrow transactions policies (handle buyer_id vs user_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_transactions') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'buyer_id') THEN
            CREATE POLICY "Users can view own escrow transactions" ON public.escrow_transactions FOR SELECT USING (auth.uid() = buyer_id);
            CREATE POLICY "Users can insert own escrow transactions" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'escrow_transactions' AND column_name = 'user_id') THEN
            CREATE POLICY "Users can view own escrow transactions" ON public.escrow_transactions FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "Users can insert own escrow transactions" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;

    -- User bank accounts policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_bank_accounts') THEN
        CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Seller payouts policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seller_payouts') THEN
        CREATE POLICY "Users can view own seller payouts" ON public.seller_payouts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own seller payouts" ON public.seller_payouts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- User locations policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_locations') THEN
        CREATE POLICY "Users can view own locations" ON public.user_locations FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own locations" ON public.user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own locations" ON public.user_locations FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Location compliance log policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_compliance_log') THEN
        CREATE POLICY "Users can view own compliance log" ON public.location_compliance_log FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Tournament policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournaments') THEN
        CREATE POLICY "Users can view tournaments" ON public.tournaments FOR SELECT USING (true); -- Public tournaments
        CREATE POLICY "Users can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = creator_id);
        CREATE POLICY "Users can update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = creator_id);
    END IF;

    -- Tournament participants policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_participants') THEN
        CREATE POLICY "Users can view tournament participants" ON public.tournament_participants FOR SELECT USING (true); -- Public for leaderboards
        CREATE POLICY "Users can insert tournament participants" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update tournament participants" ON public.tournament_participants FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Matches policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matches') THEN
        CREATE POLICY "Users can view matches" ON public.matches FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
        CREATE POLICY "Users can insert matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
        CREATE POLICY "Users can update matches" ON public.matches FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);
    END IF;

    -- Matchmaking queue policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matchmaking_queue') THEN
        CREATE POLICY "Users can view own matchmaking queue" ON public.matchmaking_queue FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own matchmaking queue" ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own matchmaking queue" ON public.matchmaking_queue FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own matchmaking queue" ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- Skill ratings policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skill_ratings') THEN
        CREATE POLICY "Users can view own skill ratings" ON public.skill_ratings FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own skill ratings" ON public.skill_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own skill ratings" ON public.skill_ratings FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Public can view skill ratings" ON public.skill_ratings FOR SELECT USING (true); -- For matchmaking
    END IF;

    -- Listings policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
        CREATE POLICY "Public can view listings" ON public.listings FOR SELECT USING (true); -- Public marketplace
        CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
        CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
        CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);
    END IF;

    -- Listing entries policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_entries') THEN
        CREATE POLICY "Users can view own listing entries" ON public.listing_entries FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own listing entries" ON public.listing_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Categories policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true); -- Public categories
    END IF;

    -- Fixed games policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_games_config') THEN
        CREATE POLICY "Public can view fixed games config" ON public.fixed_games_config FOR SELECT USING (true); -- Public game configs
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'active_fixed_games') THEN
        CREATE POLICY "Public can view active fixed games" ON public.active_fixed_games FOR SELECT USING (true); -- Public active games
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_game_participants') THEN
        CREATE POLICY "Users can view own fixed game participants" ON public.fixed_game_participants FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own fixed game participants" ON public.fixed_game_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own fixed game participants" ON public.fixed_game_participants FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Public can view fixed game participants" ON public.fixed_game_participants FOR SELECT USING (true); -- For leaderboards
    END IF;

    -- Hot sell policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_listings') THEN
        CREATE POLICY "Public can view hot sell listings" ON public.hot_sell_listings FOR SELECT USING (true); -- Public hot sell
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_participants') THEN
        CREATE POLICY "Users can view own hot sell participants" ON public.hot_sell_participants FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own hot sell participants" ON public.hot_sell_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own hot sell participants" ON public.hot_sell_participants FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Public can view hot sell participants" ON public.hot_sell_participants FOR SELECT USING (true); -- For leaderboards
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_sessions') THEN
        CREATE POLICY "Public can view hot sell sessions" ON public.hot_sell_sessions FOR SELECT USING (true); -- Public sessions
    END IF;

    RAISE NOTICE 'RLS policies created for all existing tables';
END $$;

-- ========================================
-- 4. GRANT PERMISSIONS (ONLY FOR EXISTING TABLES)
-- ========================================

DO $$
BEGIN
    -- Grant permissions to authenticated users (only if tables exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stripe_bank_accounts') THEN
        GRANT ALL ON public.stripe_bank_accounts TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
        GRANT ALL ON public.withdrawal_requests TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_history') THEN
        GRANT ALL ON public.game_history TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'high_scores') THEN
        GRANT ALL ON public.high_scores TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_transactions') THEN
        GRANT ALL ON public.token_transactions TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        GRANT ALL ON public.users TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_balances') THEN
        GRANT ALL ON public.user_balances TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_levels') THEN
        GRANT ALL ON public.user_levels TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
        GRANT ALL ON public.payment_transactions TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_sessions') THEN
        GRANT ALL ON public.game_sessions TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_transactions') THEN
        GRANT ALL ON public.escrow_transactions TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_bank_accounts') THEN
        GRANT ALL ON public.user_bank_accounts TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'seller_payouts') THEN
        GRANT ALL ON public.seller_payouts TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_locations') THEN
        GRANT ALL ON public.user_locations TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_compliance_log') THEN
        GRANT ALL ON public.location_compliance_log TO authenticated;
    END IF;
    
    -- Grant permissions for tournament tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournaments') THEN
        GRANT ALL ON public.tournaments TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_participants') THEN
        GRANT ALL ON public.tournament_participants TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_matches') THEN
        GRANT ALL ON public.tournament_matches TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matches') THEN
        GRANT ALL ON public.matches TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matchmaking_queue') THEN
        GRANT ALL ON public.matchmaking_queue TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skill_ratings') THEN
        GRANT ALL ON public.skill_ratings TO authenticated;
    END IF;
    
    -- Grant permissions for listing tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
        GRANT ALL ON public.listings TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_images') THEN
        GRANT ALL ON public.listing_images TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_entries') THEN
        GRANT ALL ON public.listing_entries TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        GRANT ALL ON public.categories TO authenticated;
    END IF;
    
    -- Grant permissions for fixed games tables (only if they exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_games_config') THEN
        GRANT ALL ON public.fixed_games_config TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'active_fixed_games') THEN
        GRANT ALL ON public.active_fixed_games TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_game_participants') THEN
        GRANT ALL ON public.fixed_game_participants TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_listings') THEN
        GRANT ALL ON public.hot_sell_listings TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_participants') THEN
        GRANT ALL ON public.hot_sell_participants TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_sessions') THEN
        GRANT ALL ON public.hot_sell_sessions TO authenticated;
    END IF;
    
    RAISE NOTICE 'Permissions granted to authenticated users for existing tables';
END $$;

-- Grant read permissions to anonymous users for public data (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'high_scores') THEN
        GRANT SELECT ON public.high_scores TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_levels') THEN
        GRANT SELECT ON public.user_levels TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skill_ratings') THEN
        GRANT SELECT ON public.skill_ratings TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournaments') THEN
        GRANT SELECT ON public.tournaments TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tournament_participants') THEN
        GRANT SELECT ON public.tournament_participants TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listings') THEN
        GRANT SELECT ON public.listings TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        GRANT SELECT ON public.categories TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_games_config') THEN
        GRANT SELECT ON public.fixed_games_config TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'active_fixed_games') THEN
        GRANT SELECT ON public.active_fixed_games TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_game_participants') THEN
        GRANT SELECT ON public.fixed_game_participants TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_listings') THEN
        GRANT SELECT ON public.hot_sell_listings TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_participants') THEN
        GRANT SELECT ON public.hot_sell_participants TO anon;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hot_sell_sessions') THEN
        GRANT SELECT ON public.hot_sell_sessions TO anon;
    END IF;
    
    RAISE NOTICE 'Read permissions granted to anonymous users for existing tables';
END $$;

-- ========================================
-- 5. VERIFY RLS IS ENABLED
-- ========================================

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ========================================
-- 6. SUMMARY
-- ========================================

SELECT 'RLS Security Fix Complete!' as status,
       'All existing public tables now have RLS enabled with proper security policies' as message;
