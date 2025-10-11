-- ============================================
-- DROPDOLLAR SUPABASE DATABASE CHECK & SETUP
-- ============================================
-- Run this in Supabase SQL Editor to check and create all required tables
-- https://supabase.com/dashboard/project/xqkjdmgfcpjwqpjzgmhz/editor/sql

-- 1. CHECK IF USERS TABLE EXISTS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        RAISE NOTICE '❌ USERS TABLE DOES NOT EXIST - CREATING IT NOW...';
    ELSE
        RAISE NOTICE '✅ USERS TABLE EXISTS';
    END IF;
END $$;

-- 2. CREATE USERS TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'buyer',
    tokens INTEGER DEFAULT 0,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    stripe_customer_id TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE TOKEN TRANSACTIONS TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS token_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'game_entry', 'game_win', 'refund', 'adjustment')),
    balance_after INTEGER NOT NULL,
    description TEXT,
    stripe_payment_intent_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE GAME HISTORY TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS game_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('practice', 'competition')),
    score INTEGER NOT NULL,
    accuracy DECIMAL(5, 2),
    reaction_time INTEGER,
    tokens_wagered INTEGER DEFAULT 0,
    tokens_won INTEGER DEFAULT 0,
    result TEXT CHECK (result IN ('won', 'lost', 'completed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CREATE PURCHASE HISTORY TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS purchase_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tokens_purchased INTEGER NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    payment_method_last4 TEXT,
    status TEXT DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_payment_intent_id ON purchase_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;

-- 8. CREATE RLS POLICIES (Allow all operations for now - tighten in production)
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow all users operations" ON users;
    DROP POLICY IF EXISTS "Allow all token_transactions operations" ON token_transactions;
    DROP POLICY IF EXISTS "Allow all game_history operations" ON game_history;
    DROP POLICY IF EXISTS "Allow all purchase_history operations" ON purchase_history;
    
    -- Create permissive policies for testing
    CREATE POLICY "Allow all users operations" ON users FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all token_transactions operations" ON token_transactions FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all game_history operations" ON game_history FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Allow all purchase_history operations" ON purchase_history FOR ALL USING (true) WITH CHECK (true);
    
    RAISE NOTICE '✅ RLS POLICIES CREATED';
END $$;

-- 9. CHECK TABLE COUNTS
DO $$ 
DECLARE
    user_count INTEGER;
    transaction_count INTEGER;
    game_count INTEGER;
    purchase_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO transaction_count FROM token_transactions;
    SELECT COUNT(*) INTO game_count FROM game_history;
    SELECT COUNT(*) INTO purchase_count FROM purchase_history;
    
    RAISE NOTICE '📊 DATABASE STATS:';
    RAISE NOTICE '   Users: %', user_count;
    RAISE NOTICE '   Token Transactions: %', transaction_count;
    RAISE NOTICE '   Games Played: %', game_count;
    RAISE NOTICE '   Purchases: %', purchase_count;
END $$;

-- 10. SUCCESS MESSAGE
DO $$ 
BEGIN
    RAISE NOTICE '✅ ✅ ✅ SUPABASE DATABASE SETUP COMPLETE! ✅ ✅ ✅';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '1. Your database is ready';
    RAISE NOTICE '2. Try logging in again on your site';
    RAISE NOTICE '3. When you log in, a user profile will be created automatically';
    RAISE NOTICE '4. Then you can purchase tokens!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 TIP: If you want to manually create a test user, run:';
    RAISE NOTICE 'INSERT INTO users (id, username, email) VALUES (''test-user-123'', ''TestUser'', ''test@example.com'');';
END $$;

