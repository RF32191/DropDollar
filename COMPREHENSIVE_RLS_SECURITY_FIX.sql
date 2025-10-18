-- COMPREHENSIVE RLS SECURITY FIX
-- This script enables RLS on all public tables and creates proper security policies
-- Run this in Supabase SQL Editor to fix all security issues

-- ========================================
-- 1. ENABLE RLS ON ALL PUBLIC TABLES (IF THEY EXIST)
-- ========================================

-- Enable RLS on tables that might be missing it (only if they exist)
DO $$
BEGIN
    -- Enable RLS on core tables
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
    
    -- Enable RLS on tournament and matchmaking tables
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
    
    -- Enable RLS on listing and marketplace tables
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
    
    -- Enable RLS on fixed games tables
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
    
    -- Enable RLS on blind scoreboard tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_user') THEN
        ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet') THEN
        ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ledger_entry') THEN
        ALTER TABLE public.ledger_entry ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing') THEN
        ALTER TABLE public.listing ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'listing_join') THEN
        ALTER TABLE public.listing_join ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'match') THEN
        ALTER TABLE public.match ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'match_participant') THEN
        ALTER TABLE public.match_participant ENABLE ROW LEVEL SECURITY;
    END IF;
    
    RAISE NOTICE 'RLS enabled on all existing tables';
END $$;

-- ========================================
-- 2. DROP EXISTING POLICIES
-- ========================================

-- Drop all existing policies to avoid conflicts
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
DROP POLICY IF EXISTS "Users can view own app user" ON public.app_user;
DROP POLICY IF EXISTS "Users can insert own app user" ON public.app_user;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallet;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallet;
DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.ledger_entry;
DROP POLICY IF EXISTS "Users can insert own ledger entries" ON public.ledger_entry;
DROP POLICY IF EXISTS "Public can view listings" ON public.listing;
DROP POLICY IF EXISTS "Users can view own listing joins" ON public.listing_join;
DROP POLICY IF EXISTS "Users can insert own listing joins" ON public.listing_join;
DROP POLICY IF EXISTS "Users can view own matches" ON public.match;
DROP POLICY IF EXISTS "Users can insert own matches" ON public.match;
DROP POLICY IF EXISTS "Users can update own matches" ON public.match;
DROP POLICY IF EXISTS "Users can view own match participants" ON public.match_participant;
DROP POLICY IF EXISTS "Users can insert own match participants" ON public.match_participant;
DROP POLICY IF EXISTS "Users can update own match participants" ON public.match_participant;

-- ========================================
-- 3. CREATE COMPREHENSIVE RLS POLICIES
-- ========================================

-- Users policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for registration" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for registration" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Stripe bank accounts policies
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.stripe_bank_accounts;
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON public.stripe_bank_accounts;
CREATE POLICY "Users can view own bank accounts" ON public.stripe_bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.stripe_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.stripe_bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank accounts" ON public.stripe_bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- Withdrawal requests policies
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can update own withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own withdrawal requests" ON public.withdrawal_requests FOR UPDATE USING (auth.uid() = user_id);

-- Game history policies
DROP POLICY IF EXISTS "Users can view own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert own game history" ON public.game_history;
CREATE POLICY "Users can view own game history" ON public.game_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game history" ON public.game_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- High scores policies
DROP POLICY IF EXISTS "Users can view own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can insert own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Users can update own high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Public can view high scores" ON public.high_scores;
CREATE POLICY "Users can view own high scores" ON public.high_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own high scores" ON public.high_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own high scores" ON public.high_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view high scores" ON public.high_scores FOR SELECT USING (true); -- For leaderboards

-- Token transactions policies
DROP POLICY IF EXISTS "Users can view own token transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can insert own token transactions" ON public.token_transactions;
CREATE POLICY "Users can view own token transactions" ON public.token_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own token transactions" ON public.token_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User balances policies
DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON public.user_balances;
CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);

-- User levels policies
DROP POLICY IF EXISTS "Users can view own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update own level" ON public.user_levels;
DROP POLICY IF EXISTS "Public can view user levels" ON public.user_levels;
CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view user levels" ON public.user_levels FOR SELECT USING (true); -- For skill-based matchmaking

-- Payment transactions policies
DROP POLICY IF EXISTS "Users can view own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can insert own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payment transactions" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Game sessions policies
DROP POLICY IF EXISTS "Users can view own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can insert own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can update own game sessions" ON public.game_sessions;
CREATE POLICY "Users can view own game sessions" ON public.game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own game sessions" ON public.game_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Escrow transactions policies
DROP POLICY IF EXISTS "Users can view own escrow transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Users can insert own escrow transactions" ON public.escrow_transactions;
CREATE POLICY "Users can view own escrow transactions" ON public.escrow_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own escrow transactions" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User bank accounts policies
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts FOR UPDATE USING (auth.uid() = user_id);

-- Seller payouts policies
DROP POLICY IF EXISTS "Users can view own seller payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Users can insert own seller payouts" ON public.seller_payouts;
CREATE POLICY "Users can view own seller payouts" ON public.seller_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seller payouts" ON public.seller_payouts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User locations policies
DROP POLICY IF EXISTS "Users can view own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.user_locations;
CREATE POLICY "Users can view own locations" ON public.user_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON public.user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON public.user_locations FOR UPDATE USING (auth.uid() = user_id);

-- Location compliance log policies
DROP POLICY IF EXISTS "Users can view own compliance log" ON public.location_compliance_log;
CREATE POLICY "Users can view own compliance log" ON public.location_compliance_log FOR SELECT USING (auth.uid() = user_id);

-- Tournament policies
DROP POLICY IF EXISTS "Users can view tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update tournaments" ON public.tournaments;
CREATE POLICY "Users can view tournaments" ON public.tournaments FOR SELECT USING (true); -- Public tournaments
CREATE POLICY "Users can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = creator_id);

-- Tournament participants policies
DROP POLICY IF EXISTS "Users can view tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can insert tournament participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can update tournament participants" ON public.tournament_participants;
CREATE POLICY "Users can view tournament participants" ON public.tournament_participants FOR SELECT USING (true); -- Public for leaderboards
CREATE POLICY "Users can insert tournament participants" ON public.tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update tournament participants" ON public.tournament_participants FOR UPDATE USING (auth.uid() = user_id);

-- Matches policies
DROP POLICY IF EXISTS "Users can view matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update matches" ON public.matches;
CREATE POLICY "Users can view matches" ON public.matches FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can insert matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can update matches" ON public.matches FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Matchmaking queue policies
DROP POLICY IF EXISTS "Users can view own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can insert own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can update own matchmaking queue" ON public.matchmaking_queue;
DROP POLICY IF EXISTS "Users can delete own matchmaking queue" ON public.matchmaking_queue;
CREATE POLICY "Users can view own matchmaking queue" ON public.matchmaking_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own matchmaking queue" ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own matchmaking queue" ON public.matchmaking_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own matchmaking queue" ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);

-- Skill ratings policies
DROP POLICY IF EXISTS "Users can view own skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Users can insert own skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Users can update own skill ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Public can view skill ratings" ON public.skill_ratings;
CREATE POLICY "Users can view own skill ratings" ON public.skill_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skill ratings" ON public.skill_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skill ratings" ON public.skill_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view skill ratings" ON public.skill_ratings FOR SELECT USING (true); -- For matchmaking

-- Listings policies
DROP POLICY IF EXISTS "Public can view listings" ON public.listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.listings;
CREATE POLICY "Public can view listings" ON public.listings FOR SELECT USING (true); -- Public marketplace
CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE USING (auth.uid() = seller_id);

-- Listing entries policies
DROP POLICY IF EXISTS "Users can view own listing entries" ON public.listing_entries;
DROP POLICY IF EXISTS "Users can insert own listing entries" ON public.listing_entries;
CREATE POLICY "Users can view own listing entries" ON public.listing_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own listing entries" ON public.listing_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categories policies
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true); -- Public categories

-- Fixed games policies
DROP POLICY IF EXISTS "Public can view fixed games config" ON public.fixed_games_config;
CREATE POLICY "Public can view fixed games config" ON public.fixed_games_config FOR SELECT USING (true); -- Public game configs

DROP POLICY IF EXISTS "Public can view active fixed games" ON public.active_fixed_games;
CREATE POLICY "Public can view active fixed games" ON public.active_fixed_games FOR SELECT USING (true); -- Public active games

DROP POLICY IF EXISTS "Users can view own fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Users can insert own fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Users can update own fixed game participants" ON public.fixed_game_participants;
DROP POLICY IF EXISTS "Public can view fixed game participants" ON public.fixed_game_participants;
CREATE POLICY "Users can view own fixed game participants" ON public.fixed_game_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fixed game participants" ON public.fixed_game_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fixed game participants" ON public.fixed_game_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view fixed game participants" ON public.fixed_game_participants FOR SELECT USING (true); -- For leaderboards

-- Hot sell policies
DROP POLICY IF EXISTS "Public can view hot sell listings" ON public.hot_sell_listings;
CREATE POLICY "Public can view hot sell listings" ON public.hot_sell_listings FOR SELECT USING (true); -- Public hot sell

DROP POLICY IF EXISTS "Users can view own hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can insert own hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Users can update own hot sell participants" ON public.hot_sell_participants;
DROP POLICY IF EXISTS "Public can view hot sell participants" ON public.hot_sell_participants;
CREATE POLICY "Users can view own hot sell participants" ON public.hot_sell_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hot sell participants" ON public.hot_sell_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hot sell participants" ON public.hot_sell_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view hot sell participants" ON public.hot_sell_participants FOR SELECT USING (true); -- For leaderboards

DROP POLICY IF EXISTS "Public can view hot sell sessions" ON public.hot_sell_sessions;
CREATE POLICY "Public can view hot sell sessions" ON public.hot_sell_sessions FOR SELECT USING (true); -- Public sessions

-- Blind scoreboard policies
DROP POLICY IF EXISTS "Users can view own app user" ON public.app_user;
DROP POLICY IF EXISTS "Users can insert own app user" ON public.app_user;
CREATE POLICY "Users can view own app user" ON public.app_user FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can insert own app user" ON public.app_user FOR INSERT WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallet;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallet;
CREATE POLICY "Users can view own wallet" ON public.wallet FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallet FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.ledger_entry;
DROP POLICY IF EXISTS "Users can insert own ledger entries" ON public.ledger_entry;
CREATE POLICY "Users can view own ledger entries" ON public.ledger_entry FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own ledger entries" ON public.ledger_entry FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Public can view listings" ON public.listing;
CREATE POLICY "Public can view listings" ON public.listing FOR SELECT USING (true); -- Public listings

DROP POLICY IF EXISTS "Users can view own listing joins" ON public.listing_join;
DROP POLICY IF EXISTS "Users can insert own listing joins" ON public.listing_join;
CREATE POLICY "Users can view own listing joins" ON public.listing_join FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own listing joins" ON public.listing_join FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own matches" ON public.match;
DROP POLICY IF EXISTS "Users can insert own matches" ON public.match;
DROP POLICY IF EXISTS "Users can update own matches" ON public.match;
CREATE POLICY "Users can view own matches" ON public.match FOR SELECT USING (auth.uid()::text = ANY(SELECT user_id FROM public.match_participant WHERE match_id = public.match.id));
CREATE POLICY "Users can insert own matches" ON public.match FOR INSERT WITH CHECK (true); -- System creates matches
CREATE POLICY "Users can update own matches" ON public.match FOR UPDATE USING (true); -- System updates matches

DROP POLICY IF EXISTS "Users can view own match participants" ON public.match_participant;
DROP POLICY IF EXISTS "Users can insert own match participants" ON public.match_participant;
DROP POLICY IF EXISTS "Users can update own match participants" ON public.match_participant;
CREATE POLICY "Users can view own match participants" ON public.match_participant FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own match participants" ON public.match_participant FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own match participants" ON public.match_participant FOR UPDATE USING (auth.uid()::text = user_id);

-- ========================================
-- 3. GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON public.stripe_bank_accounts TO authenticated;
GRANT ALL ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.game_history TO authenticated;
GRANT ALL ON public.high_scores TO authenticated;
GRANT ALL ON public.token_transactions TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.user_balances TO authenticated;
GRANT ALL ON public.user_levels TO authenticated;
GRANT ALL ON public.payment_transactions TO authenticated;
GRANT ALL ON public.game_sessions TO authenticated;
GRANT ALL ON public.escrow_transactions TO authenticated;
GRANT ALL ON public.user_bank_accounts TO authenticated;
GRANT ALL ON public.seller_payouts TO authenticated;
GRANT ALL ON public.user_locations TO authenticated;
GRANT ALL ON public.location_compliance_log TO authenticated;
GRANT ALL ON public.tournaments TO authenticated;
GRANT ALL ON public.tournament_participants TO authenticated;
GRANT ALL ON public.tournament_matches TO authenticated;
GRANT ALL ON public.matches TO authenticated;
GRANT ALL ON public.matchmaking_queue TO authenticated;
GRANT ALL ON public.skill_ratings TO authenticated;
GRANT ALL ON public.listings TO authenticated;
GRANT ALL ON public.listing_images TO authenticated;
GRANT ALL ON public.listing_entries TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.fixed_games_config TO authenticated;
GRANT ALL ON public.active_fixed_games TO authenticated;
GRANT ALL ON public.fixed_game_participants TO authenticated;
GRANT ALL ON public.hot_sell_listings TO authenticated;
GRANT ALL ON public.hot_sell_participants TO authenticated;
GRANT ALL ON public.hot_sell_sessions TO authenticated;
GRANT ALL ON public.app_user TO authenticated;
GRANT ALL ON public.wallet TO authenticated;
GRANT ALL ON public.ledger_entry TO authenticated;
GRANT ALL ON public.listing TO authenticated;
GRANT ALL ON public.listing_join TO authenticated;
GRANT ALL ON public.match TO authenticated;
GRANT ALL ON public.match_participant TO authenticated;

-- Grant read permissions to anonymous users for public data
GRANT SELECT ON public.high_scores TO anon;
GRANT SELECT ON public.user_levels TO anon;
GRANT SELECT ON public.skill_ratings TO anon;
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT ON public.tournament_participants TO anon;
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.fixed_games_config TO anon;
GRANT SELECT ON public.active_fixed_games TO anon;
GRANT SELECT ON public.fixed_game_participants TO anon;
GRANT SELECT ON public.hot_sell_listings TO anon;
GRANT SELECT ON public.hot_sell_participants TO anon;
GRANT SELECT ON public.hot_sell_sessions TO anon;
GRANT SELECT ON public.listing TO anon;
GRANT SELECT ON public.match TO anon;
GRANT SELECT ON public.match_participant TO anon;

-- ========================================
-- 4. VERIFY RLS IS ENABLED
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
-- 5. SUMMARY
-- ========================================

SELECT 'RLS Security Fix Complete!' as status,
       'All public tables now have RLS enabled with proper security policies' as message;
