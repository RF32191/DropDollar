-- ============================================
-- ADD TRACKING NUMBER VALIDATION
-- ============================================
-- Security Feature: Verify tracking number goes to correct address
-- before releasing funds from pending to seller
-- ============================================

-- Step 1: Add validation status columns
ALTER TABLE public.marketplace_sessions 
ADD COLUMN IF NOT EXISTS tracking_validated BOOLEAN DEFAULT false;

ALTER TABLE public.marketplace_sessions 
ADD COLUMN IF NOT EXISTS tracking_validation_status TEXT DEFAULT 'pending';

ALTER TABLE public.marketplace_sessions 
ADD COLUMN IF NOT EXISTS tracking_validation_details JSONB;

ALTER TABLE public.marketplace_sessions 
ADD COLUMN IF NOT EXISTS tracking_validated_at TIMESTAMPTZ;

-- Step 2: Create tracking validation function
CREATE OR REPLACE FUNCTION public.validate_tracking_with_shippo(
    p_session_id UUID,
    p_tracking_number TEXT,
    p_carrier TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_winner_address JSONB;
    v_expected_zip TEXT;
    v_expected_city TEXT;
    v_expected_state TEXT;
    v_shippo_api_key TEXT;
    v_result JSON;
BEGIN
    -- Get winner's expected address
    SELECT 
        winner_shipping_address
    INTO v_winner_address
    FROM marketplace_sessions
    WHERE id = p_session_id;
    
    IF v_winner_address IS NULL THEN
        RAISE EXCEPTION 'Winner address not found for session';
    END IF;
    
    -- Extract expected destination details
    v_expected_zip := v_winner_address->>'postal_code';
    v_expected_city := UPPER(v_winner_address->>'city');
    v_expected_state := UPPER(v_winner_address->>'state');
    
    -- Get Shippo API key (in production, store securely)
    v_shippo_api_key := 'shippo_live_681a4c1a82c58013760d8065fc1b61a6ac680014';
    
    -- Return validation config for frontend to call Shippo API
    -- (We return config because HTTP requests from Postgres are complex)
    v_result := jsonb_build_object(
        'shippo_api_key', v_shippo_api_key,
        'tracking_number', p_tracking_number,
        'carrier', p_carrier,
        'expected_address', jsonb_build_object(
            'zip', v_expected_zip,
            'city', v_expected_city,
            'state', v_expected_state
        ),
        'validation_url', format('https://api.goshippo.com/tracks/%s/%s', p_carrier, p_tracking_number)
    );
    
    RETURN v_result;
END;
$$;

-- Step 3: Save validation results and conditionally release funds
CREATE OR REPLACE FUNCTION public.save_tracking_validation_result(
    p_session_id UUID,
    p_tracking_number TEXT,
    p_validation_status TEXT,  -- 'valid', 'invalid', 'pending'
    p_destination_zip TEXT,
    p_destination_city TEXT,
    p_destination_state TEXT,
    p_tracking_status TEXT,    -- 'pre_transit', 'transit', 'delivered', etc.
    p_validation_details JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_winner_address JSONB;
    v_expected_zip TEXT;
    v_expected_city TEXT;
    v_expected_state TEXT;
    v_address_matches BOOLEAN;
    v_seller_id UUID;
    v_seller_earnings NUMERIC;
    v_shipping_cost NUMERIC;
    v_net_earnings NUMERIC;
    v_result JSON;
BEGIN
    -- Get winner's expected address and calculate earnings
    SELECT 
        winner_shipping_address,
        ml.seller_id,
        COALESCE(ms.seller_earnings, ms.prize_pool * 0.85) as calculated_seller_earnings,
        COALESCE(ms.shipping_cost, 0) as calculated_shipping_cost
    INTO 
        v_winner_address,
        v_seller_id,
        v_seller_earnings,
        v_shipping_cost
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    -- Ensure seller_earnings is set in session (if not already)
    IF v_seller_earnings IS NULL THEN
        SELECT prize_pool * 0.85 INTO v_seller_earnings
        FROM marketplace_sessions
        WHERE id = p_session_id;
        
        -- Update the session with calculated seller_earnings
        UPDATE marketplace_sessions
        SET seller_earnings = v_seller_earnings
        WHERE id = p_session_id;
    END IF;
    
    RAISE NOTICE '💰 Seller earnings for this transaction: $%', v_seller_earnings;
    RAISE NOTICE '📦 Shipping cost: $%', v_shipping_cost;
    
    -- Extract expected destination
    v_expected_zip := v_winner_address->>'postal_code';
    v_expected_city := UPPER(v_winner_address->>'city');
    v_expected_state := UPPER(v_winner_address->>'state');
    
    -- Check if addresses match
    v_address_matches := (
        v_expected_zip = p_destination_zip AND
        v_expected_city = UPPER(p_destination_city) AND
        v_expected_state = UPPER(p_destination_state)
    );
    
    RAISE NOTICE '🔍 Address Validation: Expected: %, %, % | Actual: %, %, % | Match: %',
        v_expected_city, v_expected_state, v_expected_zip,
        p_destination_city, p_destination_state, p_destination_zip,
        v_address_matches;
    
    -- Update session with validation results
    UPDATE marketplace_sessions
    SET 
        tracking_validated = v_address_matches,
        tracking_validation_status = CASE 
            WHEN v_address_matches THEN 'valid'
            ELSE 'invalid'
        END,
        tracking_validation_details = p_validation_details,
        tracking_validated_at = NOW()
    WHERE id = p_session_id;
    
    -- Only release funds if address matches
    IF v_address_matches THEN
        -- Calculate net earnings (gross - shipping cost)
        v_net_earnings := v_seller_earnings - v_shipping_cost;
        
        RAISE NOTICE '====================================';
        RAISE NOTICE '💰 FUND RELEASE CALCULATION:';
        RAISE NOTICE '   Gross Earnings (85%%): $%', v_seller_earnings;
        RAISE NOTICE '   Shipping Cost: $%', v_shipping_cost;
        RAISE NOTICE '   Net Earnings: $%', v_net_earnings;
        RAISE NOTICE '====================================';
        RAISE NOTICE '📊 WALLET UPDATE:';
        RAISE NOTICE '   Deducting from pending: $% (this transaction only)', v_seller_earnings;
        RAISE NOTICE '   Adding to released: $% (net after shipping)', v_net_earnings;
        RAISE NOTICE '====================================';
        
        -- Update seller wallet: Move from pending to released
        -- IMPORTANT: We deduct v_seller_earnings (gross) from pending
        --            because that's what was added when winner claimed
        --            We add v_net_earnings (after shipping) to released
        UPDATE seller_wallets
        SET 
            pending_balance = GREATEST(pending_balance - v_seller_earnings, 0),
            released_balance = released_balance + v_net_earnings,
            total_pending_sales = GREATEST(total_pending_sales - 1, 0),
            total_released_sales = total_released_sales + 1,
            lifetime_earnings = lifetime_earnings + v_net_earnings,
            total_shipping_costs = total_shipping_costs + v_shipping_cost
        WHERE seller_id = v_seller_id;
        
        -- Mark funds as released in session
        UPDATE marketplace_sessions
        SET 
            funds_released = true,
            funds_released_at = NOW()
        WHERE id = p_session_id;
        
        RAISE NOTICE '✅ Tracking validated! Funds released: $%', v_net_earnings;
        
        v_result := jsonb_build_object(
            'success', true,
            'validated', true,
            'address_matches', true,
            'funds_released', true,
            'net_earnings', v_net_earnings,
            'message', 'Tracking validated! Funds released to your wallet.'
        );
    ELSE
        RAISE NOTICE '❌ Tracking validation FAILED! Address mismatch. Funds NOT released.';
        
        -- Create security alert
        INSERT INTO security_alerts (
            alert_type, user_id, severity, message, metadata, created_at
        ) VALUES (
            'tracking_address_mismatch',
            v_seller_id,
            'high',
            format('Tracking address mismatch for session %s', p_session_id),
            jsonb_build_object(
                'session_id', p_session_id,
                'tracking_number', p_tracking_number,
                'expected_address', jsonb_build_object(
                    'city', v_expected_city,
                    'state', v_expected_state,
                    'zip', v_expected_zip
                ),
                'actual_address', jsonb_build_object(
                    'city', p_destination_city,
                    'state', p_destination_state,
                    'zip', p_destination_zip
                )
            ),
            NOW()
        );
        
        v_result := jsonb_build_object(
            'success', false,
            'validated', false,
            'address_matches', false,
            'funds_released', false,
            'message', 'Address mismatch! Package is not going to winner''s address. Funds will NOT be released. Please contact support.',
            'expected_address', format('%s, %s %s', v_expected_city, v_expected_state, v_expected_zip),
            'actual_address', format('%s, %s %s', p_destination_city, p_destination_state, p_destination_zip)
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- Step 4: Create security_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all security alerts" ON security_alerts;
CREATE POLICY "Admins can view all security alerts"
ON security_alerts FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    )
);

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_tracking_validated 
ON marketplace_sessions(tracking_validated, tracking_validation_status);

-- Step 6: Comments
COMMENT ON COLUMN marketplace_sessions.tracking_validated IS 'Whether tracking number destination matches winner address';
COMMENT ON COLUMN marketplace_sessions.tracking_validation_status IS 'Validation status: pending, valid, invalid';
COMMENT ON COLUMN marketplace_sessions.tracking_validation_details IS 'Full tracking info from carrier API';
COMMENT ON FUNCTION validate_tracking_with_shippo IS 'Get config to validate tracking number via Shippo API';
COMMENT ON FUNCTION save_tracking_validation_result IS 'Save validation results and release funds if address matches';

-- ============================================
-- USAGE EXAMPLE
-- ============================================

-- Frontend calls this to get validation config:
-- SELECT validate_tracking_with_shippo('session-uuid', '9400111899223344556677', 'usps');

-- Returns:
-- {
--   "shippo_api_key": "shippo_live_...",
--   "tracking_number": "9400111899223344556677",
--   "carrier": "usps",
--   "expected_address": {
--     "zip": "10001",
--     "city": "NEW YORK",
--     "state": "NY"
--   },
--   "validation_url": "https://api.goshippo.com/tracks/usps/9400111899223344556677"
-- }

-- Frontend then calls Shippo API and returns results:
-- SELECT save_tracking_validation_result(
--   'session-uuid',
--   '9400111899223344556677',
--   'valid',
--   '10001',
--   'NEW YORK',
--   'NY',
--   'in_transit',
--   '{"full_tracking_data": "..."}'::jsonb
-- );

-- If addresses match: Funds released
-- If addresses DON'T match: Security alert created, funds NOT released

