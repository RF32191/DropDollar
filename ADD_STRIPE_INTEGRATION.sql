-- ============================================================================
-- STRIPE INTEGRATION FOR SELLER PAYOUTS
-- Enables bank account linking and automated payouts
-- ============================================================================

-- ============================================================================
-- 1. ADD STRIPE COLUMNS TO seller_profiles
-- ============================================================================
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected' 
    CHECK (stripe_account_status IN ('not_connected', 'pending', 'connected', 'restricted', 'rejected')),
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_updated_at TIMESTAMPTZ;

-- ============================================================================
-- 2. UPDATE seller_payout_requests TO SUPPORT STRIPE
-- ============================================================================
ALTER TABLE public.seller_payout_requests
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT,
ADD COLUMN IF NOT EXISTS estimated_arrival TIMESTAMPTZ;

-- Update payout_method check to include stripe
ALTER TABLE public.seller_payout_requests 
DROP CONSTRAINT IF EXISTS seller_payout_requests_payout_method_check;

ALTER TABLE public.seller_payout_requests
ADD CONSTRAINT seller_payout_requests_payout_method_check 
CHECK (payout_method IN ('stripe', 'bank_transfer', 'paypal', 'crypto'));

-- ============================================================================
-- 3. CREATE STRIPE EVENTS LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
    account_id TEXT,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON public.stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_seller ON public.stripe_events(seller_id);

-- ============================================================================
-- 4. RLS POLICIES FOR STRIPE TABLES
-- ============================================================================
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view stripe events
DROP POLICY IF EXISTS "Only admins can view stripe events" ON public.stripe_events;
CREATE POLICY "Only admins can view stripe events"
    ON public.stripe_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- 5. FUNCTION: Get Seller Stripe Status
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_seller_stripe_status();
CREATE OR REPLACE FUNCTION public.get_seller_stripe_status()
RETURNS TABLE (
    seller_id UUID,
    stripe_account_id TEXT,
    stripe_account_status TEXT,
    stripe_onboarding_completed BOOLEAN,
    stripe_payouts_enabled BOOLEAN,
    wallet_balance NUMERIC,
    can_request_payout BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id AS seller_id,
        sp.stripe_account_id,
        sp.stripe_account_status,
        sp.stripe_onboarding_completed,
        sp.stripe_payouts_enabled,
        sp.wallet_balance,
        (sp.stripe_payouts_enabled = true AND sp.wallet_balance >= 25) AS can_request_payout
    FROM public.seller_profiles sp
    WHERE sp.user_id = auth.uid()
    LIMIT 1;
END;
$$;

-- ============================================================================
-- 6. FUNCTION: Save Stripe Account Info
-- ============================================================================
DROP FUNCTION IF EXISTS public.save_stripe_account_info(TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
CREATE OR REPLACE FUNCTION public.save_stripe_account_info(
    p_stripe_account_id TEXT,
    p_account_status TEXT DEFAULT 'pending',
    p_details_submitted BOOLEAN DEFAULT false,
    p_payouts_enabled BOOLEAN DEFAULT false,
    p_charges_enabled BOOLEAN DEFAULT false,
    p_onboarding_completed BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_result JSONB;
BEGIN
    -- Get seller profile
    SELECT id INTO v_seller_id
    FROM public.seller_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No seller profile found'
        );
    END IF;

    -- Update stripe info
    UPDATE public.seller_profiles
    SET 
        stripe_account_id = p_stripe_account_id,
        stripe_account_status = p_account_status,
        stripe_details_submitted = p_details_submitted,
        stripe_payouts_enabled = p_payouts_enabled,
        stripe_charges_enabled = p_charges_enabled,
        stripe_onboarding_completed = p_onboarding_completed,
        stripe_connected_at = CASE 
            WHEN stripe_connected_at IS NULL AND p_payouts_enabled = true 
            THEN NOW() 
            ELSE stripe_connected_at 
        END,
        stripe_updated_at = NOW()
    WHERE id = v_seller_id;

    RETURN jsonb_build_object(
        'success', true,
        'seller_id', v_seller_id,
        'stripe_account_id', p_stripe_account_id
    );
END;
$$;

-- ============================================================================
-- 7. FUNCTION: Request Stripe Payout
-- ============================================================================
DROP FUNCTION IF EXISTS public.request_stripe_payout(NUMERIC);
CREATE OR REPLACE FUNCTION public.request_stripe_payout(
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_profile RECORD;
    v_payout_id UUID;
BEGIN
    -- Get seller profile
    SELECT * INTO v_seller_profile
    FROM public.seller_profiles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_seller_profile IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No seller profile found'
        );
    END IF;

    v_seller_id := v_seller_profile.id;

    -- Validate amount
    IF p_amount < 25 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Minimum payout amount is $25'
        );
    END IF;

    -- Check wallet balance
    IF v_seller_profile.wallet_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient wallet balance'
        );
    END IF;

    -- Check Stripe connection
    IF v_seller_profile.stripe_payouts_enabled = false THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Stripe account not connected or payouts not enabled'
        );
    END IF;

    -- Check for pending payouts
    IF EXISTS (
        SELECT 1 FROM public.seller_payout_requests
        WHERE seller_id = v_seller_id 
        AND status IN ('pending', 'processing')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You already have a pending payout request'
        );
    END IF;

    -- Create payout request
    INSERT INTO public.seller_payout_requests (
        seller_id,
        amount,
        payout_method,
        destination_details,
        status,
        requested_at
    ) VALUES (
        v_seller_id,
        p_amount,
        'stripe',
        jsonb_build_object(
            'stripe_account_id', v_seller_profile.stripe_account_id
        ),
        'pending',
        NOW()
    )
    RETURNING id INTO v_payout_id;

    -- Deduct from wallet (held until payout completes)
    UPDATE public.seller_profiles
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = v_seller_id;

    -- Log transaction
    INSERT INTO public.seller_transactions (
        seller_id,
        transaction_type,
        amount,
        balance_after,
        description,
        status
    ) VALUES (
        v_seller_id,
        'payout',
        -p_amount,
        v_seller_profile.wallet_balance - p_amount,
        'Payout request to Stripe',
        'pending'
    );

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'amount', p_amount,
        'message', 'Payout request created. Processing via Stripe.'
    );
END;
$$;

-- ============================================================================
-- 8. FUNCTION: Update Payout Status (Called by backend after Stripe processes)
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_payout_status(UUID, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_payout_status(
    p_payout_request_id UUID,
    p_status TEXT,
    p_stripe_transfer_id TEXT DEFAULT NULL,
    p_stripe_payout_id TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payout RECORD;
BEGIN
    -- Get payout request
    SELECT * INTO v_payout
    FROM public.seller_payout_requests
    WHERE id = p_payout_request_id;

    IF v_payout IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payout request not found'
        );
    END IF;

    -- Update payout request
    UPDATE public.seller_payout_requests
    SET 
        status = p_status,
        stripe_transfer_id = COALESCE(p_stripe_transfer_id, stripe_transfer_id),
        stripe_payout_id = COALESCE(p_stripe_payout_id, stripe_payout_id),
        failure_reason = p_failure_reason,
        processed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE processed_at END,
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END,
        estimated_arrival = CASE 
            WHEN p_status = 'processing' THEN NOW() + INTERVAL '7 days'
            ELSE estimated_arrival 
        END
    WHERE id = p_payout_request_id;

    -- If failed, refund to wallet
    IF p_status = 'failed' OR p_status = 'cancelled' THEN
        UPDATE public.seller_profiles
        SET wallet_balance = wallet_balance + v_payout.amount
        WHERE id = v_payout.seller_id;

        -- Log refund
        INSERT INTO public.seller_transactions (
            seller_id,
            transaction_type,
            amount,
            balance_after,
            description,
            status
        )
        SELECT 
            v_payout.seller_id,
            'refund',
            v_payout.amount,
            wallet_balance,
            'Payout ' || p_status || ': ' || COALESCE(p_failure_reason, 'Refunded to wallet'),
            'completed'
        FROM public.seller_profiles
        WHERE id = v_payout.seller_id;
    END IF;

    -- If completed, mark transaction as completed
    IF p_status = 'completed' THEN
        UPDATE public.seller_transactions
        SET status = 'completed'
        WHERE seller_id = v_payout.seller_id
        AND transaction_type = 'payout'
        AND amount = -v_payout.amount
        AND status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', p_payout_request_id,
        'status', p_status
    );
END;
$$;

-- ============================================================================
-- 9. FUNCTION: Get Payout History
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_seller_payout_history();
CREATE OR REPLACE FUNCTION public.get_seller_payout_history()
RETURNS TABLE (
    id UUID,
    amount NUMERIC,
    payout_method TEXT,
    status TEXT,
    stripe_payout_id TEXT,
    requested_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_arrival TIMESTAMPTZ,
    failure_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spr.id,
        spr.amount,
        spr.payout_method,
        spr.status,
        spr.stripe_payout_id,
        spr.requested_at,
        spr.completed_at,
        spr.estimated_arrival,
        spr.failure_reason
    FROM public.seller_payout_requests spr
    WHERE spr.seller_id IN (
        SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()
    )
    ORDER BY spr.requested_at DESC;
END;
$$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Stripe integration added successfully!';
    RAISE NOTICE '✅ seller_profiles updated with Stripe columns';
    RAISE NOTICE '✅ seller_payout_requests updated for Stripe';
    RAISE NOTICE '✅ stripe_events table created';
    RAISE NOTICE '✅ Stripe functions created';
    RAISE NOTICE '📝 Next: Add Stripe API keys to environment variables';
    RAISE NOTICE '📝 Next: Deploy Stripe Connect API routes';
END $$;

