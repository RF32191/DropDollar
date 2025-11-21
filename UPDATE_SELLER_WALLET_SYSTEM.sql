-- ============================================
-- SELLER WALLET SYSTEM: Pending Balance Calculation
-- ============================================
-- When winner claims prize and provides address:
-- 1. Calculate listing value (prize_pool or base_price)
-- 2. Subtract 15% platform fee
-- 3. Subtract estimated shipping cost
-- 4. Add to seller's pending_balance
-- 
-- When seller submits tracking:
-- 5. Transfer from pending_balance to released_balance
-- ============================================

-- ==========================================
-- STEP 1: Ensure seller_wallets columns exist
-- ==========================================
DO $$
BEGIN
    -- Add pending_balance if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'pending_balance'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN pending_balance NUMERIC(10,2) DEFAULT 0.00;
    END IF;

    -- Add released_balance if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'released_balance'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN released_balance NUMERIC(10,2) DEFAULT 0.00;
    END IF;

    -- Add lifetime_earnings if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'lifetime_earnings'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN lifetime_earnings NUMERIC(10,2) DEFAULT 0.00;
    END IF;

    -- Add total_platform_fees if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'total_platform_fees'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN total_platform_fees NUMERIC(10,2) DEFAULT 0.00;
    END IF;

    -- Add total_shipping_costs if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_wallets' 
        AND column_name = 'total_shipping_costs'
    ) THEN
        ALTER TABLE public.seller_wallets 
        ADD COLUMN total_shipping_costs NUMERIC(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- ==========================================
-- STEP 2: Update claim prize function to add to pending wallet
-- ==========================================
CREATE OR REPLACE FUNCTION public.claim_marketplace_prize(
    p_session_id UUID,
    p_address_line1 TEXT,
    p_city TEXT,
    p_state TEXT,
    p_postal_code TEXT,
    p_address_line2 TEXT DEFAULT NULL,
    p_country TEXT DEFAULT 'USA',
    p_phone TEXT DEFAULT NULL,
    p_save_address BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_listing_id UUID;
    v_seller_id UUID;
    v_listing_title TEXT;
    v_prize_pool NUMERIC;
    v_base_price NUMERIC;
    v_listing_value NUMERIC;
    v_platform_fee NUMERIC;
    v_estimated_shipping NUMERIC;
    v_seller_pending_amount NUMERIC;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get session and listing details
    SELECT 
        ms.listing_id,
        ml.seller_id,
        ml.title,
        COALESCE(ms.prize_pool, 0),
        ml.base_price
    INTO v_listing_id, v_seller_id, v_listing_title, v_prize_pool, v_base_price
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id
    AND ms.winner_user_id = v_user_id
    AND ms.status = 'completed';

    IF v_listing_id IS NULL THEN
        RAISE EXCEPTION 'Session not found or you are not the winner';
    END IF;

    -- Calculate listing value (use prize_pool if available, otherwise base_price)
    v_listing_value := COALESCE(NULLIF(v_prize_pool, 0), v_base_price, 0);
    
    -- Calculate 15% platform fee
    v_platform_fee := ROUND(v_listing_value * 0.15, 2);
    
    -- Estimate shipping cost based on typical USPS rates
    -- Small packages: $5-15, Medium: $15-30, Large: $30-50
    -- Using $15 as default estimate
    v_estimated_shipping := 15.00;
    
    -- Calculate seller's pending amount
    v_seller_pending_amount := v_listing_value - v_platform_fee - v_estimated_shipping;
    
    -- Ensure seller wallet exists
    INSERT INTO public.seller_wallets (seller_id, pending_balance, released_balance, created_at, updated_at)
    VALUES (v_seller_id, 0, 0, NOW(), NOW())
    ON CONFLICT (seller_id) DO NOTHING;
    
    -- Add to seller's pending balance
    UPDATE public.seller_wallets
    SET 
        pending_balance = pending_balance + v_seller_pending_amount,
        lifetime_earnings = lifetime_earnings + v_listing_value,
        total_platform_fees = total_platform_fees + v_platform_fee,
        total_shipping_costs = total_shipping_costs + v_estimated_shipping,
        updated_at = NOW()
    WHERE seller_id = v_seller_id;

    -- Update session with shipping address
    UPDATE marketplace_sessions
    SET 
        shipping_address = jsonb_build_object(
            'address_line1', p_address_line1,
            'address_line2', p_address_line2,
            'city', p_city,
            'state', p_state,
            'postal_code', p_postal_code,
            'country', p_country,
            'phone', p_phone
        ),
        shipping_status = 'address_provided',
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Save address to user profile if requested
    IF p_save_address THEN
        UPDATE public.users
        SET 
            saved_address = jsonb_build_object(
                'address_line1', p_address_line1,
                'address_line2', p_address_line2,
                'city', p_city,
                'state', p_state,
                'postal_code', p_postal_code,
                'country', p_country,
                'phone', p_phone
            ),
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    v_result := json_build_object(
        'success', true,
        'message', 'Prize claimed successfully',
        'listing_value', v_listing_value,
        'platform_fee', v_platform_fee,
        'estimated_shipping', v_estimated_shipping,
        'seller_pending_amount', v_seller_pending_amount,
        'address_saved', p_save_address
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_marketplace_prize TO authenticated;

-- ==========================================
-- STEP 3: Update tracking submission to release funds
-- ==========================================
CREATE OR REPLACE FUNCTION public.submit_tracking_number_with_notifications(
    p_session_id UUID,
    p_tracking_number TEXT,
    p_tracking_provider TEXT DEFAULT 'USPS',
    p_estimated_delivery DATE DEFAULT NULL,
    p_actual_shipping_cost NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_winner_id UUID;
    v_listing_title TEXT;
    v_pending_amount NUMERIC;
    v_shipping_adjustment NUMERIC DEFAULT 0;
    v_amount_to_release NUMERIC;
    v_result JSON;
BEGIN
    -- Get session details
    SELECT 
        ml.seller_id,
        ms.winner_user_id,
        ml.title
    INTO v_seller_id, v_winner_id, v_listing_title
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id
    AND ml.seller_id = auth.uid();

    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Session not found or you are not the seller';
    END IF;

    -- Get current pending balance
    SELECT pending_balance INTO v_pending_amount
    FROM seller_wallets
    WHERE seller_id = v_seller_id;

    v_amount_to_release := v_pending_amount;

    -- If actual shipping cost provided, adjust the release amount
    IF p_actual_shipping_cost IS NOT NULL THEN
        -- Calculate difference from estimated $15
        v_shipping_adjustment := 15.00 - p_actual_shipping_cost;
        v_amount_to_release := v_pending_amount + v_shipping_adjustment;
        
        -- Update shipping costs tracking
        UPDATE seller_wallets
        SET total_shipping_costs = total_shipping_costs + v_shipping_adjustment
        WHERE seller_id = v_seller_id;
    END IF;

    -- Transfer from pending to released
    UPDATE seller_wallets
    SET 
        pending_balance = pending_balance - v_pending_amount,
        released_balance = released_balance + v_amount_to_release,
        updated_at = NOW()
    WHERE seller_id = v_seller_id;

    -- Update session with tracking info
    UPDATE marketplace_sessions
    SET 
        tracking_number = p_tracking_number,
        tracking_provider = p_tracking_provider,
        tracking_url = CASE 
            WHEN p_tracking_provider = 'USPS' THEN 
                'https://tools.usps.com/go/TrackConfirmAction?tLabels=' || p_tracking_number
            WHEN p_tracking_provider = 'UPS' THEN 
                'https://www.ups.com/track?tracknum=' || p_tracking_number
            WHEN p_tracking_provider = 'FedEx' THEN 
                'https://www.fedex.com/fedextrack/?trknbr=' || p_tracking_number
            ELSE NULL
        END,
        shipping_status = 'shipped',
        funds_released = true,
        estimated_delivery = p_actual_shipping_cost,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    v_result := json_build_object(
        'success', true,
        'message', 'Tracking submitted and funds released',
        'tracking_number', p_tracking_number,
        'amount_released', v_amount_to_release,
        'shipping_adjustment', v_shipping_adjustment
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_tracking_number_with_notifications TO authenticated;

-- ==========================================
-- STEP 4: Create seller terms documentation
-- ==========================================
CREATE TABLE IF NOT EXISTS public.seller_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL DEFAULT '1.0',
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert seller terms
INSERT INTO public.seller_terms (version, content, is_active)
VALUES (
    '1.0',
    '# Seller Terms & Fee Structure

## 💰 **IMPORTANT: PRICING YOUR ITEMS**

**⚠️ SET YOUR LISTING PRICE TO COVER:**
- **Your desired profit**
- **+ 15% platform fee**
- **+ Estimated shipping costs ($15+ depending on size/weight)**

### **Example Pricing:**
If you want to make **$50 profit** on an item:
- Desired Profit: $50.00
- Platform Fee (15%): Calculate based on total
- Shipping Estimate: $15.00
- **Recommended Listing Price: $75-80**

---

## 💳 Payment Structure

### **When Winner Claims:**
1. **15% Platform Fee** is deducted
2. **Estimated Shipping ($15)** is held
3. Remaining amount goes to **Pending Wallet**

### **When You Submit Tracking:**
1. Funds transfer from **Pending** → **Released Wallet**
2. If actual shipping < $15, you keep the difference!
3. If actual shipping > $15, the difference is deducted
4. You can withdraw from **Released Wallet** via Stripe

---

## 📦 Shipping Requirements

- Must provide tracking number within 3 business days
- Use reputable carriers (USPS, UPS, FedEx)
- Pack items securely
- Ship to winner''s provided address

---

## 🚫 Prohibited Items

- Illegal items
- Counterfeit goods
- Hazardous materials
- Items violating platform guidelines

---

## ⚖️ Seller Responsibilities

- Accurate item descriptions
- Honest condition assessment
- Prompt shipping
- Professional communication
- Fair pricing

---

**By creating a listing, you agree to these terms.**',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Make terms viewable by authenticated users
ALTER TABLE public.seller_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active seller terms" ON public.seller_terms;
CREATE POLICY "Anyone can view active seller terms"
ON public.seller_terms
FOR SELECT
USING (is_active = true);

GRANT SELECT ON public.seller_terms TO authenticated;

-- ==========================================
-- VERIFICATION
-- ==========================================
SELECT '✅ Seller wallet columns added/verified' as status;
SELECT '✅ Claim prize function updated with wallet calculation' as " ";
SELECT '✅ Tracking submission releases funds to seller' as "  ";
SELECT '✅ Seller terms created with fee structure' as "   ";
SELECT '' as "    ";
SELECT '💰 FEE BREAKDOWN:' as "     ";
SELECT '- Listing Value: 100%' as "      ";
SELECT '- Platform Fee: -15%' as "       ";
SELECT '- Shipping Hold: -$15 (refunded if less)' as "        ";
SELECT '- Seller Gets: ~70-75% after fees' as "         ";

