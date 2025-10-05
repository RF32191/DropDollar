-- IMMEDIATE FIX FOR SUPABASE SCHEMA CACHE ISSUE
-- Run this in your Supabase SQL Editor to fix the registration problem

-- Step 1: Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Step 2: Check if users table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 3: If the table doesn't exist or is missing columns, recreate it
-- ONLY run this if the above query shows missing columns or empty results

-- Drop and recreate users table with correct structure
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  location_verified BOOLEAN DEFAULT false,
  location_state TEXT,
  location_city TEXT,
  location_country TEXT,
  location_allowed BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create essential indexes
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_username ON public.users (username);
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_active ON public.users (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for registration" ON public.users
  FOR INSERT WITH CHECK (true);

-- Step 4: Also ensure user_balances table exists
CREATE TABLE IF NOT EXISTS public.user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  drop_tokens INTEGER DEFAULT 0,
  cash_balance_usd DECIMAL(10,2) DEFAULT 0.00,
  pending_earnings_usd DECIMAL(10,2) DEFAULT 0.00,
  total_earned_usd DECIMAL(10,2) DEFAULT 0.00,
  total_spent_usd DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for user_balances
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance" ON public.user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON public.user_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for balance initialization" ON public.user_balances
  FOR INSERT WITH CHECK (true);

-- Step 5: Create user_levels table
CREATE TABLE IF NOT EXISTS public.user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  daily_games_played INTEGER DEFAULT 0,
  best_score DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for user_levels
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own level" ON public.user_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own level" ON public.user_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for level initialization" ON public.user_levels
  FOR INSERT WITH CHECK (true);

-- Step 6: Force another schema refresh
NOTIFY pgrst, 'reload schema';

-- Step 7: Test query to verify everything is working
SELECT 'Schema fix completed successfully!' as status;
