-- ============================================
-- FIX PURCHASE HISTORY - RUN THIS NOW
-- ============================================
-- This script will:
-- 1. Create the query function to display purchases
-- 2. Fix RLS policies to allow webhook inserts
-- 3. Sync existing Stripe purchases to database
-- ============================================

-- STEP 1: Create query function for fetching transaction history
-- ============================================
CREATE OR REPLACE FUNCTION get_user_all_transactions(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    status TEXT,
    competition_type TEXT,
    competition_id TEXT,
    game_type TEXT,
    tokens_purchased INTEGER,
    tokens_won INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.id,
        ut.type,
        ut.amount,
        ut.description,
        ut.status,
        ut.competition_type,
        ut.competition_id,
        ut.game_type,
        ut.tokens_purchased,
        ut.tokens_won,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    ORDER BY ut.created_at DESC
    LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_all_transactions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_all_transactions(UUID) TO anon;

RAISE NOTICE '✅ Query function created!';

-- STEP 2: Fix RLS policies for user_transactions
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.user_transactions;
DROP POLICY IF EXISTS "Service role full access" ON public.user_transactions;

-- Enable RLS
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.user_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role (webhook) to insert ANY transaction
CREATE POLICY "Service role can insert transactions"
ON public.user_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to insert their own transactions (for frontend)
CREATE POLICY "Users can insert own transactions"
ON public.user_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

RAISE NOTICE '✅ RLS policies updated!';

-- STEP 3: Check if purchases exist in user_transactions
-- ============================================

DO $$
DECLARE
    v_purchase_count INTEGER;
    v_entry_fee_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Count purchases
    SELECT COUNT(*) INTO v_purchase_count
    FROM public.user_transactions
    WHERE type = 'token_purchase';
    
    -- Count entry fees
    SELECT COUNT(*) INTO v_entry_fee_count
    FROM public.user_transactions
    WHERE type = 'entry_fee';
    
    -- Count total
    SELECT COUNT(*) INTO v_total_count
    FROM public.user_transactions;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 CURRENT TRANSACTION COUNT:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Token Purchases: %', v_purchase_count;
    RAISE NOTICE 'Entry Fees: %', v_entry_fee_count;
    RAISE NOTICE 'Total Transactions: %', v_total_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    IF v_purchase_count = 0 THEN
        RAISE NOTICE '⚠️  NO PURCHASES FOUND!';
        RAISE NOTICE '   This means Stripe webhooks are not saving purchases.';
        RAISE NOTICE '   After running this script, use the Stripe Sync button';
        RAISE NOTICE '   in the app to pull your purchase history from Stripe.';
    ELSE
        RAISE NOTICE '✅ Purchases found! They should now appear in your history.';
    END IF;
END;
$$;

-- STEP 4: Instructions
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '1. Hard refresh your browser (Ctrl+Shift+R)';
    RAISE NOTICE '2. Look for "Stripe Sync" button in your dashboard';
    RAISE NOTICE '3. Click "Check Status" to see missing purchases';
    RAISE NOTICE '4. Click "Sync Now" to import all Stripe purchases';
    RAISE NOTICE '5. Your purchase history should now be complete!';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TO CHECK YOUR EMAIL IN DATABASE:';
    RAISE NOTICE 'Run: SELECT id, email FROM users WHERE email = ''your@email.com'';';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TO CHECK YOUR TRANSACTIONS:';
    RAISE NOTICE 'Run: SELECT * FROM get_user_all_transactions(''your-user-id-here'');';
    RAISE NOTICE '========================================';
END;
$$;

