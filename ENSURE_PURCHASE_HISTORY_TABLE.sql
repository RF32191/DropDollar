-- ============================================
-- ENSURE PURCHASE HISTORY TABLE EXISTS
-- ============================================
-- This script ensures the purchase_history table exists with all necessary
-- fields, indexes, and RLS policies for tracking token purchases
-- ============================================

-- Step 1: Create purchase_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Purchase Details
    purchase_type TEXT NOT NULL DEFAULT 'tokens' CHECK (purchase_type IN ('tokens', 'listing', 'tournament', 'match', 'hot_sell', 'ad_campaign')),
    tokens_purchased INTEGER NOT NULL DEFAULT 0,
    tokens_spent INTEGER DEFAULT 0,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    
    -- Stripe Integration
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    stripe_customer_id TEXT,
    stripe_payment_method_id TEXT,
    payment_method_type TEXT,
    payment_method_last4 TEXT,
    payment_method_brand TEXT,
    
    -- Status Tracking
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- Recovery Tracking (for failed token credits)
    auto_recovery_attempted BOOLEAN DEFAULT false,
    auto_recovery_successful BOOLEAN DEFAULT false,
    manual_credit_applied BOOLEAN DEFAULT false,
    
    -- Description and Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create basic indexes (for columns that always exist)
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON public.purchase_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_status ON public.purchase_history(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON public.purchase_history(created_at DESC);

-- Step 3: Add any missing columns (if table already exists)
DO $$ 
BEGIN
    -- Add purchase_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'purchase_history' 
                   AND column_name = 'purchase_type') THEN
        ALTER TABLE public.purchase_history ADD COLUMN purchase_type TEXT DEFAULT 'tokens';
        ALTER TABLE public.purchase_history ADD CONSTRAINT purchase_history_purchase_type_check 
            CHECK (purchase_type IN ('tokens', 'listing', 'tournament', 'match', 'hot_sell', 'ad_campaign'));
    END IF;

    -- Add tokens_spent if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'purchase_history' 
                   AND column_name = 'tokens_spent') THEN
        ALTER TABLE public.purchase_history ADD COLUMN tokens_spent INTEGER DEFAULT 0;
    END IF;

    -- Add stripe_charge_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'purchase_history' 
                   AND column_name = 'stripe_charge_id') THEN
        ALTER TABLE public.purchase_history ADD COLUMN stripe_charge_id TEXT;
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'purchase_history' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.purchase_history ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Step 2b: Create conditional indexes (only if columns exist)
DO $$ 
BEGIN
    -- Create stripe_payment_intent_id index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'purchase_history' 
               AND column_name = 'stripe_payment_intent_id') THEN
        CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_payment_intent ON public.purchase_history(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
    END IF;
    
    -- Create stripe_charge_id index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'purchase_history' 
               AND column_name = 'stripe_charge_id') THEN
        CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_charge ON public.purchase_history(stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;
    END IF;
    
    -- Create purchase_type index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'purchase_history' 
               AND column_name = 'purchase_type') THEN
        CREATE INDEX IF NOT EXISTS idx_purchase_history_type ON public.purchase_history(purchase_type, created_at DESC);
    END IF;
END $$;

-- Step 4: Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchase_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_purchase_history_updated_at ON public.purchase_history;
CREATE TRIGGER trigger_update_purchase_history_updated_at
    BEFORE UPDATE ON public.purchase_history
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_history_updated_at();

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
-- Policy: Users can view their own purchase history
-- Handle both TEXT and UUID user_id types
DROP POLICY IF EXISTS "Users can view own purchase history" ON public.purchase_history;
CREATE POLICY "Users can view own purchase history"
    ON public.purchase_history
    FOR SELECT
    USING (
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'purchase_history' 
                AND column_name = 'user_id' 
                AND data_type = 'uuid'
            ) THEN auth.uid()::TEXT = user_id::TEXT
            ELSE auth.uid()::TEXT = user_id
        END
    );

-- Policy: Users can insert their own purchases (via server-side API)
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchase_history;
CREATE POLICY "Users can insert own purchases"
    ON public.purchase_history
    FOR INSERT
    WITH CHECK (
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'purchase_history' 
                AND column_name = 'user_id' 
                AND data_type = 'uuid'
            ) THEN auth.uid()::TEXT = user_id::TEXT
            ELSE auth.uid()::TEXT = user_id
        END
    );

-- Policy: Service role can do everything (for server-side operations)
DROP POLICY IF EXISTS "Service role full access" ON public.purchase_history;
CREATE POLICY "Service role full access"
    ON public.purchase_history
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 8: Create function to get recent purchases for a user
CREATE OR REPLACE FUNCTION get_user_recent_purchases(
    user_id_param TEXT,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id TEXT,
    purchase_type TEXT,
    tokens_purchased INTEGER,
    tokens_spent INTEGER,
    amount DECIMAL(10, 2),
    currency TEXT,
    stripe_payment_intent_id TEXT,
    status TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.id,
        ph.purchase_type,
        ph.tokens_purchased,
        ph.tokens_spent,
        ph.amount,
        ph.currency,
        ph.stripe_payment_intent_id,
        ph.status,
        ph.description,
        ph.created_at
    FROM public.purchase_history ph
    WHERE ph.user_id = user_id_param
    ORDER BY ph.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create function to get purchase statistics for a user
CREATE OR REPLACE FUNCTION get_user_purchase_stats(
    user_id_param TEXT
)
RETURNS TABLE (
    total_purchases BIGINT,
    total_amount DECIMAL(10, 2),
    total_tokens_purchased BIGINT,
    total_tokens_spent BIGINT,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    successful_purchases BIGINT,
    failed_purchases BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_purchases,
        COALESCE(SUM(ph.amount), 0)::DECIMAL(10, 2) as total_amount,
        COALESCE(SUM(ph.tokens_purchased), 0)::BIGINT as total_tokens_purchased,
        COALESCE(SUM(ph.tokens_spent), 0)::BIGINT as total_tokens_spent,
        MAX(ph.created_at) as last_purchase_date,
        COUNT(*) FILTER (WHERE ph.status = 'completed')::BIGINT as successful_purchases,
        COUNT(*) FILTER (WHERE ph.status = 'failed')::BIGINT as failed_purchases
    FROM public.purchase_history ph
    WHERE ph.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Grant necessary permissions
GRANT SELECT, INSERT ON public.purchase_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recent_purchases(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_purchase_stats(TEXT) TO authenticated;

-- Step 11: Add comments for documentation
COMMENT ON TABLE public.purchase_history IS 'Complete record of all token purchases and transactions from Stripe and other payment methods';
COMMENT ON COLUMN public.purchase_history.stripe_payment_intent_id IS 'Unique Stripe payment intent ID for tracking payments';
COMMENT ON COLUMN public.purchase_history.auto_recovery_attempted IS 'Whether automatic token credit recovery was attempted';
COMMENT ON COLUMN public.purchase_history.auto_recovery_successful IS 'Whether automatic token credit recovery succeeded';
COMMENT ON COLUMN public.purchase_history.manual_credit_applied IS 'Whether manual credit was applied via support';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the table was created correctly:

-- Check table exists
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_history';

-- Check columns
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_history' ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'purchase_history';

-- Check RLS policies
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'purchase_history';

