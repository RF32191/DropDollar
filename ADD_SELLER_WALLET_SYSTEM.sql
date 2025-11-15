-- ============================================================================
-- SELLER WALLET SYSTEM
-- Separate wallet for seller earnings (85% of prize pools)
-- ============================================================================

-- ============================================================================
-- ADD: Wallet balance to seller_profiles
-- ============================================================================
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0 CHECK (wallet_balance >= 0);

-- ============================================================================
-- TABLE: seller_transactions
-- Track all seller wallet transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'payout', 'refund', 'fee', 'bonus')),
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    
    -- Related Entities
    listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
    session_id UUID,
    winner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Description
    description TEXT NOT NULL,
    reference_id TEXT, -- For external payment processor reference
    
    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_transactions_seller ON public.seller_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_type ON public.seller_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_status ON public.seller_transactions(status);
CREATE INDEX IF NOT EXISTS idx_seller_transactions_created ON public.seller_transactions(created_at);

-- ============================================================================
-- TABLE: seller_payout_requests
-- Track payout requests from sellers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.seller_payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    
    -- Payout Details
    amount NUMERIC NOT NULL CHECK (amount >= 25), -- $25 minimum
    payout_method TEXT NOT NULL CHECK (payout_method IN ('bank_transfer', 'paypal', 'crypto')),
    
    -- Destination Details
    destination_details JSONB, -- Bank info, PayPal email, crypto address
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_by UUID REFERENCES public.admin_profiles(id),
    processed_at TIMESTAMPTZ,
    
    -- External Reference
    transaction_reference TEXT, -- From payment processor
    failure_reason TEXT,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_payout_requests_seller ON public.seller_payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payout_requests_status ON public.seller_payout_requests(status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.seller_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_requests ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own transactions
DROP POLICY IF EXISTS "Sellers can view their own transactions" ON public.seller_transactions;
CREATE POLICY "Sellers can view their own transactions"
    ON public.seller_transactions FOR SELECT
    USING (
        seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
    );

-- Sellers can view their own payout requests
DROP POLICY IF EXISTS "Sellers can view their own payout requests" ON public.seller_payout_requests;
CREATE POLICY "Sellers can view their own payout requests"
    ON public.seller_payout_requests FOR SELECT
    USING (
        seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
    );

-- Sellers can create payout requests
DROP POLICY IF EXISTS "Sellers can create payout requests" ON public.seller_payout_requests;
CREATE POLICY "Sellers can create payout requests"
    ON public.seller_payout_requests FOR INSERT
    WITH CHECK (
        seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
    );

-- ============================================================================
-- FUNCTION: credit_seller_wallet
-- Add funds to seller wallet after winner confirms delivery
-- ============================================================================
CREATE OR REPLACE FUNCTION public.credit_seller_wallet(
    listing_id_param UUID,
    session_id_param TEXT,
    winner_user_id_param UUID,
    total_prize_pool NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_user_id UUID;
    v_seller_earnings NUMERIC;
    v_platform_fee NUMERIC;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Get seller ID from listing
    SELECT seller_id INTO v_seller_id
    FROM public.marketplace_listings
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;
    
    -- Calculate earnings (85% to seller, 15% to platform)
    v_seller_earnings := total_prize_pool * 0.85;
    v_platform_fee := total_prize_pool * 0.15;
    
    -- Update seller wallet balance
    UPDATE public.seller_profiles
    SET 
        wallet_balance = wallet_balance + v_seller_earnings,
        total_sales = total_sales + total_prize_pool,
        updated_at = NOW()
    WHERE id = v_seller_id
    RETURNING wallet_balance, user_id INTO v_new_balance, v_seller_user_id;
    
    -- Create transaction record
    INSERT INTO public.seller_transactions (
        seller_id,
        transaction_type,
        amount,
        balance_after,
        listing_id,
        session_id,
        winner_user_id,
        description,
        status
    ) VALUES (
        v_seller_id,
        'earning',
        v_seller_earnings,
        v_new_balance,
        listing_id_param,
        session_id_param,
        winner_user_id_param,
        'Prize pool earnings (85%) - ' || (SELECT title FROM public.marketplace_listings WHERE id = listing_id_param),
        'completed'
    ) RETURNING id INTO v_transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'seller_id', v_seller_id,
        'seller_earnings', v_seller_earnings,
        'platform_fee', v_platform_fee,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: get_seller_wallet_balance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_seller_wallet_balance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    SELECT 
        id,
        wallet_balance,
        total_sales,
        total_listings,
        shop_name
    INTO v_seller
    FROM public.seller_profiles
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not a seller');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'seller_id', v_seller.id,
        'wallet_balance', v_seller.wallet_balance,
        'total_sales', v_seller.total_sales,
        'total_listings', v_seller.total_listings,
        'shop_name', v_seller.shop_name
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- FUNCTION: get_seller_transactions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_seller_transactions(
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    transaction_type TEXT,
    amount NUMERIC,
    balance_after NUMERIC,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_seller_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    SELECT id INTO v_seller_id
    FROM public.seller_profiles
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Not a seller';
    END IF;
    
    RETURN QUERY
    SELECT 
        st.id,
        st.transaction_type,
        st.amount,
        st.balance_after,
        st.description,
        st.status,
        st.created_at
    FROM public.seller_transactions st
    WHERE st.seller_id = v_seller_id
    ORDER BY st.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$;

-- ============================================================================
-- FUNCTION: request_seller_payout
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_seller_payout(
    amount_param NUMERIC,
    payout_method_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_seller RECORD;
    v_request_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get seller info
    SELECT id, wallet_balance INTO v_seller
    FROM public.seller_profiles
    WHERE user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not a seller');
    END IF;
    
    -- Validate amount
    IF amount_param < 25 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Minimum payout is $25');
    END IF;
    
    IF amount_param > v_seller.wallet_balance THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
    END IF;
    
    -- Check for pending requests
    IF EXISTS(
        SELECT 1 FROM public.seller_payout_requests 
        WHERE seller_id = v_seller.id AND status IN ('pending', 'processing')
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have a pending payout request');
    END IF;
    
    -- Create payout request
    INSERT INTO public.seller_payout_requests (
        seller_id,
        amount,
        payout_method,
        status
    ) VALUES (
        v_seller.id,
        amount_param,
        payout_method_param,
        'pending'
    ) RETURNING id INTO v_request_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'message', 'Payout request submitted. Processing within 3-5 business days.'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.credit_seller_wallet(UUID, TEXT, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_wallet_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_transactions(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_seller_payout(NUMERIC, TEXT) TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
✅ SELLER WALLET SYSTEM SETUP COMPLETE!

Tables Created/Updated:
- seller_profiles (added wallet_balance column)
- seller_transactions (track all wallet activity)
- seller_payout_requests (track payout requests)

Functions Created:
- credit_seller_wallet() - Add earnings after delivery
- get_seller_wallet_balance() - Check balance
- get_seller_transactions() - View transaction history
- request_seller_payout() - Request withdrawal

Features:
✅ 85/15 split (seller/platform)
✅ Separate seller wallet
✅ Transaction history
✅ $25 minimum payout
✅ Multiple payout methods
✅ Pending payout tracking
✅ RLS security policies

Payment Flow:
1. Winner wins competition
2. Seller ships prize
3. Winner confirms delivery
4. credit_seller_wallet() called
5. 85% added to seller wallet
6. Seller requests payout
7. Admin processes payout
8. Funds transferred to seller

Ready! 🚀
' as status;

