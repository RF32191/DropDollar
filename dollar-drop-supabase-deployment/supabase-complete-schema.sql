-- DropDollar Complete Database Schema for Supabase
-- This schema includes users, sellers, game scores, wallets, and all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  date_of_birth DATE,
  address JSONB, -- Store address as JSON: {street, city, state, zip, country}
  verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  account_type VARCHAR(20) DEFAULT 'buyer' CHECK (account_type IN ('buyer', 'seller', 'admin')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
  tokens DECIMAL(15,2) DEFAULT 0.00 NOT NULL CHECK (tokens >= 0),
  total_spent DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
  total_earned DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES public.user_wallets(id) ON DELETE CASCADE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'purchase', 'earning', 'refund', 'fee')),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
  description TEXT,
  reference_id UUID, -- Reference to listing, game, etc.
  reference_type VARCHAR(50), -- 'listing', 'game_entry', 'tournament', etc.
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50), -- 'stripe', 'paypal', 'internal', etc.
  external_transaction_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game scores table
CREATE TABLE IF NOT EXISTS public.game_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'color-sequence', 'falling-objects')),
  score DECIMAL(10,3) NOT NULL CHECK (score >= 0),
  accuracy DECIMAL(5,2) CHECK (accuracy >= 0 AND accuracy <= 100),
  avg_reaction_time INTEGER, -- in milliseconds
  game_duration INTEGER, -- in seconds
  is_practice BOOLEAN DEFAULT true,
  listing_id UUID, -- Reference to listing if this was a paid game
  entry_number INTEGER,
  game_session_id UUID,
  metadata JSONB, -- Store additional game-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User best scores (for quick lookup)
CREATE TABLE IF NOT EXISTS public.user_best_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'color-sequence', 'falling-objects')),
  best_score DECIMAL(10,3) NOT NULL CHECK (best_score >= 0),
  best_accuracy DECIMAL(5,2),
  best_reaction_time INTEGER,
  total_games_played INTEGER DEFAULT 1,
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_type)
);

-- Seller profiles table
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  tax_id VARCHAR(50),
  business_address JSONB,
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  website_url TEXT,
  description TEXT,
  verification_documents JSONB, -- Store document URLs and types
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
  approval_date TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0.00,
  commission_rate DECIMAL(5,4) DEFAULT 0.12, -- 12% default commission
  payout_method JSONB, -- Store payout preferences
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  current_price DECIMAL(10,2) NOT NULL CHECK (current_price >= 0),
  target_price DECIMAL(10,2) NOT NULL CHECK (target_price > 0),
  game_type VARCHAR(50) NOT NULL CHECK (game_type IN ('multi-target', 'color-sequence', 'falling-objects')),
  entry_fee DECIMAL(10,2) DEFAULT 0.20 NOT NULL CHECK (entry_fee >= 0),
  total_entries INTEGER DEFAULT 0,
  total_collected DECIMAL(10,2) DEFAULT 0.00,
  timer_started BOOLEAN DEFAULT false,
  timer_start_time TIMESTAMPTZ,
  timer_duration INTEGER DEFAULT 86400, -- 24 hours in seconds
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'timer_active', 'sold', 'expired', 'cancelled')),
  images JSONB, -- Array of image URLs
  shipping_info JSONB,
  condition VARCHAR(50),
  brand VARCHAR(100),
  model VARCHAR(100),
  winner_id UUID REFERENCES public.users(id),
  winning_score DECIMAL(10,3),
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing entries (game attempts)
CREATE TABLE IF NOT EXISTS public.listing_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  entry_number INTEGER NOT NULL,
  score DECIMAL(10,3) NOT NULL CHECK (score >= 0),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  game_duration INTEGER,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, user_id, entry_number)
);

-- Tournament entries
CREATE TABLE IF NOT EXISTS public.tournament_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  tournament_type VARCHAR(20) NOT NULL CHECK (tournament_type IN ('hot_sell_10', 'hot_sell_100', 'hot_sell_500')),
  entry_fee DECIMAL(10,2) NOT NULL,
  score DECIMAL(10,3) NOT NULL CHECK (score >= 0),
  accuracy DECIMAL(5,2),
  avg_reaction_time INTEGER,
  game_type VARCHAR(50) NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  prize_amount DECIMAL(10,2),
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions for tracking activity
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON public.game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_type ON public.game_scores(game_type);
CREATE INDEX IF NOT EXISTS idx_game_scores_listing_id ON public.game_scores(listing_id);
CREATE INDEX IF NOT EXISTS idx_user_best_scores_user_game ON public.user_best_scores(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON public.seller_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_game_type ON public.listings(game_type);
CREATE INDEX IF NOT EXISTS idx_listing_entries_listing_id ON public.listing_entries(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_entries_user_id ON public.listing_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user_id ON public.tournament_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_type ON public.tournament_entries(tournament_type);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_best_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User wallets policies
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- Wallet transactions policies
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Game scores policies
CREATE POLICY "Users can view their own game scores" ON public.game_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game scores" ON public.game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User best scores policies
CREATE POLICY "Users can view their own best scores" ON public.user_best_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own best scores" ON public.user_best_scores
  FOR ALL USING (auth.uid() = user_id);

-- Seller profiles policies
CREATE POLICY "Users can view seller profiles" ON public.seller_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own seller profile" ON public.seller_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Listings policies
CREATE POLICY "Anyone can view active listings" ON public.listings
  FOR SELECT USING (status IN ('active', 'timer_active'));

CREATE POLICY "Sellers can manage their own listings" ON public.listings
  FOR ALL USING (auth.uid() = seller_id);

-- Listing entries policies
CREATE POLICY "Users can view listing entries" ON public.listing_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own listing entries" ON public.listing_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tournament entries policies
CREATE POLICY "Users can view their own tournament entries" ON public.tournament_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tournament entries" ON public.tournament_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic wallet creation
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet when user is created
CREATE OR REPLACE TRIGGER create_wallet_on_user_creation
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_wallet();

-- Function to update best scores
CREATE OR REPLACE FUNCTION public.update_best_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_best_scores (user_id, game_type, best_score, best_accuracy, best_reaction_time, total_games_played, last_played_at)
  VALUES (NEW.user_id, NEW.game_type, NEW.score, NEW.accuracy, NEW.avg_reaction_time, 1, NEW.created_at)
  ON CONFLICT (user_id, game_type)
  DO UPDATE SET
    best_score = CASE 
      WHEN NEW.score > user_best_scores.best_score THEN NEW.score 
      ELSE user_best_scores.best_score 
    END,
    best_accuracy = CASE 
      WHEN NEW.score > user_best_scores.best_score THEN NEW.accuracy 
      ELSE user_best_scores.best_accuracy 
    END,
    best_reaction_time = CASE 
      WHEN NEW.score > user_best_scores.best_score THEN NEW.avg_reaction_time 
      ELSE user_best_scores.best_reaction_time 
    END,
    total_games_played = user_best_scores.total_games_played + 1,
    last_played_at = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update best scores when new game score is inserted
CREATE OR REPLACE TRIGGER update_best_score_on_game_score
  AFTER INSERT ON public.game_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_best_score();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_wallets
  SET 
    balance = CASE 
      WHEN NEW.transaction_type IN ('deposit', 'earning', 'refund') THEN balance + NEW.amount
      WHEN NEW.transaction_type IN ('withdrawal', 'purchase', 'fee') THEN balance - NEW.amount
      ELSE balance
    END,
    total_spent = CASE 
      WHEN NEW.transaction_type IN ('withdrawal', 'purchase', 'fee') THEN total_spent + NEW.amount
      ELSE total_spent
    END,
    total_earned = CASE 
      WHEN NEW.transaction_type IN ('deposit', 'earning', 'refund') THEN total_earned + NEW.amount
      ELSE total_earned
    END,
    last_transaction_at = NEW.created_at,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update wallet balance when transaction is inserted
CREATE OR REPLACE TRIGGER update_wallet_on_transaction
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.create_user_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_best_score() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_wallet_balance() TO authenticated;
