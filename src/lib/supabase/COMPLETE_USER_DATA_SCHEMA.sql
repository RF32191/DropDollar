-- ============================================
-- COMPLETE USER DATA SCHEMA FOR DROPDOLLAR
-- ============================================
-- This schema stores ALL user data including:
-- - User profiles
-- - Token wallet
-- - Purchase history
-- - Game history
-- - Listings (if seller)
-- - All transactions
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (Main Profile)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Use TEXT for simple localStorage IDs
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  tokens INTEGER DEFAULT 0 CHECK (tokens >= 0),
  balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  total_earned DECIMAL(10,2) DEFAULT 0.00,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- ============================================
-- 2. TOKEN TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'spend', 'earn', 'refund')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  stripe_payment_intent_id TEXT, -- Link to Stripe payment
  related_listing_id TEXT, -- If spent on a listing
  related_game_id TEXT, -- If earned from a game
  metadata JSONB, -- Additional data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast transaction queries
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON public.token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON public.token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_stripe ON public.token_transactions(stripe_payment_intent_id);

-- ============================================
-- 3. GAME HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type VARCHAR(50) NOT NULL,
  game_name VARCHAR(100),
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2), -- Percentage
  avg_reaction_time INTEGER, -- Milliseconds
  game_duration INTEGER, -- Seconds
  is_practice BOOLEAN DEFAULT true,
  is_competition BOOLEAN DEFAULT false,
  listing_id TEXT, -- If part of a competition
  entry_number INTEGER, -- Which entry (1-3)
  placement INTEGER, -- Final placement (1st, 2nd, 3rd, etc.)
  prize_won DECIMAL(10,2), -- If they won
  metadata JSONB, -- Additional game data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for game history queries
CREATE INDEX IF NOT EXISTS idx_game_history_user ON public.game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_listing ON public.game_history(listing_id);

-- ============================================
-- 4. USER LISTINGS TABLE (For Sellers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  game_type VARCHAR(50),
  entry_fee INTEGER, -- In tokens
  prize_value DECIMAL(10,2),
  total_entries INTEGER DEFAULT 0,
  max_entries INTEGER,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  winner_user_id TEXT,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for listing queries
CREATE INDEX IF NOT EXISTS idx_user_listings_user ON public.user_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_listings_status ON public.user_listings(status);
CREATE INDEX IF NOT EXISTS idx_user_listings_category ON public.user_listings(category);

-- ============================================
-- 5. PURCHASE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purchase_type VARCHAR(50) NOT NULL, -- 'tokens', 'listing_entry', 'hot_sell', 'tournament'
  amount DECIMAL(10,2) NOT NULL, -- Dollar amount
  tokens_purchased INTEGER, -- If buying tokens
  tokens_spent INTEGER, -- If spending tokens
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchase history
CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON public.purchase_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_type ON public.purchase_history(purchase_type);
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe ON public.purchase_history(stripe_payment_intent_id);

-- ============================================
-- 6. USER ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'game_played', 'token_purchase', 'prize_won', etc.
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON public.user_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);

-- ============================================
-- 7. USER STATISTICS VIEW (Aggregated Data)
-- ============================================
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT 
  u.id AS user_id,
  u.username,
  u.email,
  u.tokens,
  u.balance,
  u.total_spent,
  u.total_earned,
  u.games_played,
  u.games_won,
  COALESCE(gh.total_games, 0) AS actual_games_played,
  COALESCE(gh.total_wins, 0) AS actual_games_won,
  COALESCE(gh.avg_score, 0) AS average_score,
  COALESCE(gh.best_score, 0) AS best_score,
  COALESCE(tt.total_purchased, 0) AS total_tokens_purchased,
  COALESCE(tt.total_spent, 0) AS total_tokens_spent,
  COALESCE(ph.total_purchases, 0) AS total_purchases,
  COALESCE(ph.total_purchase_amount, 0) AS total_purchase_amount,
  u.created_at,
  u.last_login
FROM public.users u
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) AS total_games,
    SUM(CASE WHEN placement = 1 THEN 1 ELSE 0 END) AS total_wins,
    AVG(score) AS avg_score,
    MAX(score) AS best_score
  FROM public.game_history
  GROUP BY user_id
) gh ON u.id = gh.user_id
LEFT JOIN (
  SELECT 
    user_id,
    SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) AS total_purchased,
    SUM(CASE WHEN type = 'spend' THEN amount ELSE 0 END) AS total_spent
  FROM public.token_transactions
  GROUP BY user_id
) tt ON u.id = tt.user_id
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) AS total_purchases,
    SUM(amount) AS total_purchase_amount
  FROM public.purchase_history
  WHERE status = 'completed'
  GROUP BY user_id
) ph ON u.id = ph.user_id;

-- ============================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_listings_updated_at BEFORE UPDATE ON public.user_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) - Optional
-- ============================================
-- Uncomment if using Supabase Auth

-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_listings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust as needed)
-- CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid()::TEXT = id);
-- CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid()::TEXT = id);

-- ============================================
-- COMPLETE! All user data is now tracked!
-- ============================================

