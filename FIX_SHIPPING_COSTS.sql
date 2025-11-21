-- ============================================
-- FIX SHIPPING COSTS - Deduct from Seller Earnings
-- ============================================
-- Issue: Labels cost money but we're not accounting for it
-- Solution: Deduct actual shipping cost from seller earnings
-- ============================================

-- Step 1: Add shipping cost tracking columns
ALTER TABLE public.marketplace_sessions 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE public.seller_wallets 
ADD COLUMN IF NOT EXISTS total_shipping_costs NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE public.seller_wallets 
ADD COLUMN IF NOT EXISTS total_platform_fees NUMERIC(10,2) DEFAULT 0.00;

-- Step 2: Update save_shippo_label_and_submit_tracking to deduct shipping cost
DROP FUNCTION IF EXISTS public.save_shippo_label_and_submit_tracking(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.save_shippo_label_and_submit_tracking(
    p_session_id UUID,
    p_tracking_number TEXT,
    p_tracking_provider TEXT,
    p_tracking_url TEXT,
    p_label_url TEXT,
    p_shipping_cost NUMERIC,  -- Actual cost from Shippo
    p_estimated_delivery TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_earnings NUMERIC;
    v_net_earnings NUMERIC;  -- After shipping cost
    v_listing_id UUID;
    v_listing_title TEXT;
    v_winner_id UUID;
    v_winner_username TEXT;
    v_result JSON;
BEGIN
    RAISE NOTICE '📦 Saving Shippo label and submitting tracking...';
    
    -- Get session and listing details
    SELECT 
        ml.seller_id,
        ml.id,
        ml.title,
        ms.seller_earnings,
        ms.winner_user_id
    INTO 
        v_seller_id,
        v_listing_id,
        v_listing_title,
        v_seller_earnings,
        v_winner_id
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Calculate net earnings after shipping cost
    v_net_earnings := v_seller_earnings - p_shipping_cost;
    
    IF v_net_earnings < 0 THEN
        RAISE EXCEPTION 'Shipping cost (%) exceeds seller earnings (%)', p_shipping_cost, v_seller_earnings;
    END IF;
    
    RAISE NOTICE '💰 Seller earnings: %, Shipping cost: %, Net: %', 
                 v_seller_earnings, p_shipping_cost, v_net_earnings;
    
    -- Update session with tracking info and shipping cost
    UPDATE marketplace_sessions
    SET 
        tracking_number = p_tracking_number,
        tracking_provider = p_tracking_provider,
        tracking_url = p_tracking_url,
        tracking_submitted_at = NOW(),
        estimated_delivery = p_estimated_delivery,
        shipping_cost = p_shipping_cost,
        funds_released = true,
        funds_released_at = NOW()
    WHERE id = p_session_id;
    
    -- Update seller wallet: Move from pending to released (with shipping cost deducted)
    UPDATE seller_wallets
    SET 
        pending_balance = GREATEST(pending_balance - v_seller_earnings, 0),
        released_balance = released_balance + v_net_earnings,
        total_pending_sales = GREATEST(total_pending_sales - 1, 0),
        total_released_sales = total_released_sales + 1,
        lifetime_earnings = lifetime_earnings + v_net_earnings,
        total_shipping_costs = total_shipping_costs + p_shipping_cost
    WHERE seller_id = v_seller_id;
    
    -- Insert if seller wallet doesn't exist
    INSERT INTO seller_wallets (
        seller_id,
        pending_balance,
        released_balance,
        total_pending_sales,
        total_released_sales,
        lifetime_earnings,
        total_shipping_costs
    )
    SELECT 
        v_seller_id,
        0,
        v_net_earnings,
        0,
        1,
        v_net_earnings,
        p_shipping_cost
    WHERE NOT EXISTS (
        SELECT 1 FROM seller_wallets WHERE seller_id = v_seller_id
    );
    
    -- Get winner username
    SELECT username INTO v_winner_username
    FROM users
    WHERE id = v_winner_id;
    
    RAISE NOTICE '✅ Funds released: % (after % shipping cost)', v_net_earnings, p_shipping_cost;
    
    -- Call the notification function
    PERFORM submit_tracking_number_with_notifications(
        p_session_id,
        p_tracking_number,
        p_tracking_provider,
        p_tracking_url
    );
    
    -- Return success with breakdown
    v_result := jsonb_build_object(
        'success', true,
        'gross_earnings', v_seller_earnings,
        'shipping_cost', p_shipping_cost,
        'net_earnings', v_net_earnings,
        'tracking_number', p_tracking_number,
        'tracking_provider', p_tracking_provider,
        'message', format('Label created! Net earnings: $%s (after $%s shipping)', 
                         v_net_earnings, p_shipping_cost)
    );
    
    RETURN v_result;
END;
$$;

-- Step 3: Update the Shippo config function to show shipping will be deducted
DROP FUNCTION IF EXISTS public.generate_shipping_label_shippo(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.generate_shipping_label_shippo(
    p_session_id UUID,
    p_package_weight NUMERIC,
    p_package_length NUMERIC,
    p_package_width NUMERIC,
    p_package_height NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_address JSONB;
    v_winner_address JSONB;
    v_listing_title TEXT;
    v_shippo_api_key TEXT;
    v_seller_earnings NUMERIC;
    v_result JSON;
BEGIN
    -- Get seller and winner addresses
    SELECT 
        ml.seller_id,
        ml.title,
        ml.shipping_address,
        ms.winner_shipping_address,
        ms.seller_earnings
    INTO 
        v_seller_id,
        v_listing_title,
        v_seller_address,
        v_winner_address,
        v_seller_earnings
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    IF v_seller_address IS NULL THEN
        RAISE EXCEPTION 'Seller shipping address not configured';
    END IF;
    
    IF v_winner_address IS NULL THEN
        RAISE EXCEPTION 'Winner has not provided shipping address';
    END IF;
    
    -- Get Shippo API key from environment/config
    -- In production, this should come from a secure config table or environment variable
    v_shippo_api_key := 'shippo_live_681a4c1a82c58013760d8065fc1b61a6ac680014';
    
    -- Build response
    v_result := jsonb_build_object(
        'shippo_api_key', v_shippo_api_key,
        'from_address', jsonb_build_object(
            'name', v_seller_address->>'name',
            'street1', v_seller_address->>'address_line1',
            'street2', COALESCE(v_seller_address->>'address_line2', ''),
            'city', v_seller_address->>'city',
            'state', v_seller_address->>'state',
            'zip', v_seller_address->>'postal_code',
            'country', COALESCE(v_seller_address->>'country', 'US'),
            'phone', COALESCE(v_seller_address->>'phone', '')
        ),
        'to_address', jsonb_build_object(
            'name', v_winner_address->>'name',
            'street1', v_winner_address->>'address_line1',
            'street2', COALESCE(v_winner_address->>'address_line2', ''),
            'city', v_winner_address->>'city',
            'state', v_winner_address->>'state',
            'zip', v_winner_address->>'postal_code',
            'country', COALESCE(v_winner_address->>'country', 'US'),
            'phone', COALESCE(v_winner_address->>'phone', '')
        ),
        'parcel', jsonb_build_object(
            'length', p_package_length::TEXT,
            'width', p_package_width::TEXT,
            'height', p_package_height::TEXT,
            'distance_unit', 'in',
            'weight', p_package_weight::TEXT,
            'mass_unit', 'oz'
        ),
        'seller_earnings', v_seller_earnings,
        'warning', 'Shipping cost will be deducted from your earnings'
    );
    
    RETURN v_result;
END;
$$;

-- Step 4: Add view to see shipping cost breakdown
CREATE OR REPLACE VIEW seller_earnings_breakdown AS
SELECT 
    sw.seller_id,
    u.username AS seller_username,
    sw.pending_balance,
    sw.released_balance,
    sw.lifetime_earnings,
    sw.total_shipping_costs,
    sw.total_platform_fees,
    (sw.lifetime_earnings + sw.total_shipping_costs + sw.total_platform_fees) AS gross_before_deductions,
    sw.total_released_sales,
    CASE 
        WHEN sw.total_released_sales > 0 
        THEN ROUND(sw.total_shipping_costs / sw.total_released_sales, 2)
        ELSE 0 
    END AS avg_shipping_cost_per_sale
FROM seller_wallets sw
JOIN users u ON u.id = sw.seller_id;

-- Step 5: Add function to get detailed earnings for seller
CREATE OR REPLACE FUNCTION public.get_seller_earnings_breakdown(p_seller_id UUID DEFAULT NULL)
RETURNS TABLE (
    seller_id UUID,
    seller_username TEXT,
    pending_balance NUMERIC,
    released_balance NUMERIC,
    lifetime_earnings NUMERIC,
    total_shipping_costs NUMERIC,
    total_platform_fees NUMERIC,
    gross_before_deductions NUMERIC,
    total_sales INTEGER,
    avg_shipping_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sw.seller_id,
        u.username,
        sw.pending_balance,
        sw.released_balance,
        sw.lifetime_earnings,
        sw.total_shipping_costs,
        sw.total_platform_fees,
        (sw.lifetime_earnings + sw.total_shipping_costs + sw.total_platform_fees)::NUMERIC,
        sw.total_released_sales,
        CASE 
            WHEN sw.total_released_sales > 0 
            THEN ROUND(sw.total_shipping_costs / sw.total_released_sales, 2)
            ELSE 0::NUMERIC 
        END
    FROM seller_wallets sw
    JOIN users u ON u.id = sw.seller_id
    WHERE p_seller_id IS NULL OR sw.seller_id = p_seller_id;
END;
$$;

-- Step 6: Add comments explaining the cost structure
COMMENT ON COLUMN marketplace_sessions.seller_earnings IS 'Seller share (85% of prize pool) BEFORE shipping costs';
COMMENT ON COLUMN marketplace_sessions.shipping_cost IS 'Actual shipping label cost (deducted from seller earnings)';
COMMENT ON COLUMN seller_wallets.total_shipping_costs IS 'Cumulative shipping costs paid across all sales';
COMMENT ON COLUMN seller_wallets.lifetime_earnings IS 'Net earnings AFTER shipping costs and platform fees';

-- Step 7: Create function to estimate shipping cost before listing
CREATE OR REPLACE FUNCTION public.estimate_seller_net_earnings(
    p_prize_pool NUMERIC,
    p_estimated_shipping_cost NUMERIC DEFAULT 12.50  -- Average USPS Priority Mail cost
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_platform_fee NUMERIC;
    v_seller_gross NUMERIC;
    v_seller_net NUMERIC;
    v_result JSON;
BEGIN
    -- Calculate breakdown
    v_platform_fee := p_prize_pool * 0.15;
    v_seller_gross := p_prize_pool * 0.85;
    v_seller_net := v_seller_gross - p_estimated_shipping_cost;
    
    v_result := jsonb_build_object(
        'prize_pool', p_prize_pool,
        'platform_fee', ROUND(v_platform_fee, 2),
        'platform_fee_percent', '15%',
        'seller_gross', ROUND(v_seller_gross, 2),
        'estimated_shipping_cost', p_estimated_shipping_cost,
        'seller_net', ROUND(v_seller_net, 2),
        'seller_net_percent', ROUND((v_seller_net / p_prize_pool) * 100, 1) || '%'
    );
    
    RETURN v_result;
END;
$$;

-- ============================================
-- EXAMPLES OF USAGE
-- ============================================

-- Example 1: Estimate earnings for a $150 prize pool
-- SELECT estimate_seller_net_earnings(150.00);
-- Returns:
-- {
--   "prize_pool": 150.00,
--   "platform_fee": 22.50,
--   "platform_fee_percent": "15%",
--   "seller_gross": 127.50,
--   "estimated_shipping_cost": 12.50,
--   "seller_net": 115.00,
--   "seller_net_percent": "76.7%"
-- }

-- Example 2: View seller earnings breakdown
-- SELECT * FROM get_seller_earnings_breakdown('seller-uuid-here');

-- Example 3: View all sellers' shipping costs
-- SELECT * FROM seller_earnings_breakdown;

-- ============================================
-- DEPLOYMENT NOTES
-- ============================================
-- 1. This deducts shipping costs from seller earnings
-- 2. Sellers receive 85% of prize pool MINUS actual shipping cost
-- 3. All shipping costs are tracked in seller_wallets
-- 4. You can view average shipping cost per seller
-- 5. estimate_seller_net_earnings() helps sellers understand costs upfront

COMMENT ON FUNCTION estimate_seller_net_earnings IS 'Calculate seller net earnings after platform fee (15%) and estimated shipping cost';

