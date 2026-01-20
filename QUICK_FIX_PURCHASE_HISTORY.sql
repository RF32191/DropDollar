-- ============================================
-- QUICK FIX FOR PURCHASE HISTORY
-- ============================================
-- Run this to ensure purchase_history table exists
-- and RLS policies are set correctly
-- ============================================

-- Step 1: Ensure purchase_history table exists
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
    
    -- Recovery Tracking
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

-- Step 2: Add missing columns if table already exists
DO $$ 
BEGIN
    -- Add purchase_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'purchase_history' 
                   AND column_name = 'purchase_type') THEN
        ALTER TABLE public.purchase_history ADD COLUMN purchase_type TEXT DEFAULT 'tokens';
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON public.purchase_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_status ON public.purchase_history(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created_at ON public.purchase_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_payment_intent ON public.purchase_history(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Step 4: Fix RLS Policies
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own purchase history" ON public.purchase_history;
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchase_history;
DROP POLICY IF EXISTS "Service role full access" ON public.purchase_history;

-- Create correct policies
CREATE POLICY "Users can view own purchase history"
    ON public.purchase_history FOR SELECT
    USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can insert own purchases"
    ON public.purchase_history FOR INSERT
    WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Service role full access"
    ON public.purchase_history FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 5: Grant permissions
GRANT SELECT, INSERT ON public.purchase_history TO authenticated;

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_purchase_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_purchase_history_updated_at ON public.purchase_history;
CREATE TRIGGER trigger_update_purchase_history_updated_at
    BEFORE UPDATE ON public.purchase_history
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_history_updated_at();

-- ============================================
-- DONE!
-- ============================================
-- The purchase_history table is now ready
-- API endpoints will bypass RLS using service role
-- Direct queries will work with proper RLS policies

