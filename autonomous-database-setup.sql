-- ========================================
-- AUTONOMOUS DROPDOLLAR DATABASE SCHEMA
-- Run this once in Supabase SQL Editor for full autonomy
-- ========================================

-- Force schema refresh
NOTIFY pgrst, 'reload schema';

-- ========================================
-- STEP 1: DROP EXISTING TABLES (Clean Slate)
-- ========================================
DROP TABLE IF EXISTS public.location_compliance_log CASCADE;
DROP TABLE IF EXISTS public.user_locations CASCADE;
DROP TABLE IF EXISTS public.game_scores CASCADE;
DROP TABLE IF EXISTS public.user_levels CASCADE;
DROP TABLE IF EXISTS public.user_transactions CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.user_bank_accounts CASCADE;
DROP TABLE IF EXISTS public.escrow_transactions CASCADE;
DROP TABLE IF EXISTS public.seller_payouts CASCADE;
DROP TABLE IF EXISTS public.user_balances CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ========================================
-- STEP 2: CREATE CORE USERS TABLE
-- ========================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  location_verified BOOLEAN DEFAULT false,
  location_state TEXT,
  location_city TEXT,
  location_country TEXT DEFAULT 'US',
  location_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 3: CREATE USER BALANCES TABLE
-- ========================================
CREATE TABLE public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  drop_tokens DECIMAL(10,2) DEFAULT 0.00,
  cash_balance_usd DECIMAL(10,2) DEFAULT 0.00,
  pending_earnings DECIMAL(10,2) DEFAULT 0.00,
  lifetime_earnings DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ========================================
-- STEP 4: CREATE USER LEVELS TABLE
-- ========================================
CREATE TABLE public.user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 100),
  total_points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  daily_games_played INTEGER DEFAULT 0,
  last_game_date DATE DEFAULT CURRENT_DATE,
  level_up_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ========================================
-- STEP 5: CREATE GAME SCORES TABLE
-- ========================================
CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL, -- 'multi_target', 'falling_object', 'color_sequence'
  score DECIMAL(10,2) NOT NULL,
  listing_id UUID, -- If part of a listing
  tournament_id UUID, -- If part of a tournament
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 6: CREATE LOCATION TRACKING TABLES
-- ========================================
CREATE TABLE public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  state_code TEXT,
  state_name TEXT,
  city TEXT,
  country TEXT DEFAULT 'US',
  is_allowed BOOLEAN DEFAULT true,
  restriction_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.location_compliance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'registration', 'game_access', 'location_check'
  location_data JSONB,
  is_allowed BOOLEAN NOT NULL,
  restriction_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 7: CREATE PAYMENT TABLES
-- ========================================
CREATE TABLE public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'inactive')),
  onboarding_completed BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  requirements_due TEXT[], -- Array of required fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.user_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('token_purchase', 'game_entry', 'prize_win', 'withdrawal', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID, -- Reference to listing if applicable
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id TEXT,
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL, -- Reference to listing
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released_to_seller', 'refunded_to_buyer')),
  stripe_payment_intent_id TEXT,
  release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Users table indexes
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_username ON public.users (username);
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_location_allowed ON public.users (location_allowed);
CREATE INDEX idx_users_location_state ON public.users (location_state);
CREATE INDEX idx_users_created_at ON public.users (created_at);

-- User balances indexes
CREATE INDEX idx_user_balances_user_id ON public.user_balances (user_id);
CREATE INDEX idx_user_balances_drop_tokens ON public.user_balances (drop_tokens);
CREATE INDEX idx_user_balances_cash_balance ON public.user_balances (cash_balance_usd);

-- User levels indexes
CREATE INDEX idx_user_levels_user_id ON public.user_levels (user_id);
CREATE INDEX idx_user_levels_current_level ON public.user_levels (current_level);
CREATE INDEX idx_user_levels_total_points ON public.user_levels (total_points);
CREATE INDEX idx_user_levels_last_game_date ON public.user_levels (last_game_date);

-- Game scores indexes
CREATE INDEX idx_game_scores_user_id ON public.game_scores (user_id);
CREATE INDEX idx_game_scores_game_type ON public.game_scores (game_type);
CREATE INDEX idx_game_scores_score ON public.game_scores (score DESC);
CREATE INDEX idx_game_scores_created_at ON public.game_scores (created_at DESC);
CREATE INDEX idx_game_scores_listing_id ON public.game_scores (listing_id);
CREATE INDEX idx_game_scores_tournament_id ON public.game_scores (tournament_id);

-- Location tables indexes
CREATE INDEX idx_user_locations_user_id ON public.user_locations (user_id);
CREATE INDEX idx_user_locations_state_code ON public.user_locations (state_code);
CREATE INDEX idx_user_locations_is_allowed ON public.user_locations (is_allowed);
CREATE INDEX idx_user_locations_verified_at ON public.user_locations (verified_at);
CREATE INDEX idx_user_locations_expires_at ON public.user_locations (expires_at);

CREATE INDEX idx_location_compliance_user_id ON public.location_compliance_log (user_id);
CREATE INDEX idx_location_compliance_action ON public.location_compliance_log (action);
CREATE INDEX idx_location_compliance_is_allowed ON public.location_compliance_log (is_allowed);
CREATE INDEX idx_location_compliance_created_at ON public.location_compliance_log (created_at);

-- Payment tables indexes
CREATE INDEX idx_user_bank_accounts_user_id ON public.user_bank_accounts (user_id);
CREATE INDEX idx_user_bank_accounts_stripe_id ON public.user_bank_accounts (stripe_account_id);
CREATE INDEX idx_user_bank_accounts_status ON public.user_bank_accounts (account_status);

CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests (user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests (status);
CREATE INDEX idx_withdrawal_requests_requested_at ON public.withdrawal_requests (requested_at);

CREATE INDEX idx_user_transactions_user_id ON public.user_transactions (user_id);
CREATE INDEX idx_user_transactions_type ON public.user_transactions (transaction_type);
CREATE INDEX idx_user_transactions_status ON public.user_transactions (status);
CREATE INDEX idx_user_transactions_created_at ON public.user_transactions (created_at DESC);

CREATE INDEX idx_seller_payouts_seller_id ON public.seller_payouts (seller_id);
CREATE INDEX idx_seller_payouts_listing_id ON public.seller_payouts (listing_id);
CREATE INDEX idx_seller_payouts_status ON public.seller_payouts (status);

CREATE INDEX idx_escrow_transactions_listing_id ON public.escrow_transactions (listing_id);
CREATE INDEX idx_escrow_transactions_buyer_id ON public.escrow_transactions (buyer_id);
CREATE INDEX idx_escrow_transactions_seller_id ON public.escrow_transactions (seller_id);
CREATE INDEX idx_escrow_transactions_status ON public.escrow_transactions (status);

-- ========================================
-- STEP 9: ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_compliance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 10: CREATE RLS POLICIES
-- ========================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- User balances policies
DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON public.user_balances;
CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);

-- User levels policies
DROP POLICY IF EXISTS "Users can view own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update own level" ON public.user_levels;
CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);

-- Game scores policies
DROP POLICY IF EXISTS "Users can view own game scores" ON public.game_scores;
DROP POLICY IF EXISTS "Users can insert own game scores" ON public.game_scores;
CREATE POLICY "Users can view own game scores" ON public.game_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game scores" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Location policies
DROP POLICY IF EXISTS "Users can view own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.user_locations;
CREATE POLICY "Users can view own locations" ON public.user_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON public.user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON public.user_locations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own compliance log" ON public.location_compliance_log;
CREATE POLICY "Users can view own compliance log" ON public.location_compliance_log FOR SELECT USING (auth.uid() = user_id);

-- Payment policies
DROP POLICY IF EXISTS "Users can view own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can update own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can view own bank accounts" ON public.user_bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.user_bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.user_bank_accounts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.user_transactions;
CREATE POLICY "Users can view own transactions" ON public.user_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can view own payouts" ON public.seller_payouts;
CREATE POLICY "Sellers can view own payouts" ON public.seller_payouts FOR SELECT USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can view own escrow" ON public.escrow_transactions;
CREATE POLICY "Users can view own escrow" ON public.escrow_transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ========================================
-- STEP 11: CREATE AUTONOMOUS TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_balances_updated_at ON public.user_balances;
CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON public.user_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_levels_updated_at ON public.user_levels;
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON public.user_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_bank_accounts_updated_at ON public.user_bank_accounts;
CREATE TRIGGER update_user_bank_accounts_updated_at BEFORE UPDATE ON public.user_bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user balance and level on user creation
CREATE OR REPLACE FUNCTION create_user_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user balance
    INSERT INTO public.user_balances (user_id, drop_tokens, cash_balance_usd, pending_earnings, lifetime_earnings)
    VALUES (NEW.id, 0.00, 0.00, 0.00, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user level
    INSERT INTO public.user_levels (user_id, current_level, total_points, games_played, daily_games_played, last_game_date)
    VALUES (NEW.id, 1, 0, 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply user profile creation trigger
DROP TRIGGER IF EXISTS create_user_profile_data_trigger ON public.users;
CREATE TRIGGER create_user_profile_data_trigger
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile_data();

-- ========================================
-- STEP 12: FINAL SCHEMA REFRESH
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 'AUTONOMOUS DROPDOLLAR DATABASE SETUP COMPLETE! 🚀' as status,
       'All tables, indexes, RLS policies, and triggers created successfully' as message,
       NOW() as completed_at;
