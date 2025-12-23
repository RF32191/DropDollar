-- FIX_AD_BUDGET_CONSTRAINT.sql
-- Fix the valid_spent constraint violation when logging ad impressions/clicks
-- The issue: tokens_spent was incrementing beyond token_budget

-- ========================================
-- STEP 1: Drop existing functions
-- ========================================
DROP FUNCTION IF EXISTS log_ad_impression CASCADE;
DROP FUNCTION IF EXISTS log_ad_click CASCADE;

-- ========================================
-- STEP 2: Create improved impression function
-- Checks budget before charging to avoid constraint violation
-- ========================================
CREATE OR REPLACE FUNCTION log_ad_impression(
    p_campaign_id UUID,
    p_page_location TEXT,
    p_session_id TEXT,
    p_user_agent TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_impression_id UUID;
    v_user_id UUID;
    v_is_platform_ad BOOLEAN;
    v_seller_username TEXT;
    v_cost_per_impression NUMERIC(10, 4);
    v_token_budget NUMERIC(10, 2);
    v_tokens_spent NUMERIC(10, 4);
    v_remaining_budget NUMERIC(10, 4);
    v_actual_charge NUMERIC(10, 4);
BEGIN
    v_user_id := auth.uid();
    
    -- Get campaign details including budget info
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_impression, 0.001),
        token_budget,
        tokens_spent
    INTO v_is_platform_ad, v_seller_username, v_cost_per_impression, v_token_budget, v_tokens_spent
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Calculate remaining budget
    v_remaining_budget := v_token_budget - COALESCE(v_tokens_spent, 0);
    
    -- If no budget remaining, still log impression but don't charge
    IF v_remaining_budget <= 0 AND NOT v_is_platform_ad THEN
        v_actual_charge := 0;
        RAISE NOTICE '⚠️ Campaign % has no remaining budget - impression logged but not charged', p_campaign_id;
    ELSIF NOT v_is_platform_ad THEN
        -- Charge only what's available (don't exceed budget)
        v_actual_charge := LEAST(v_cost_per_impression, v_remaining_budget);
    ELSE
        v_actual_charge := 0;
    END IF;
    
    -- Log the impression
    INSERT INTO public.ad_impressions (
        campaign_id,
        user_id,
        page_location,
        session_id,
        device_type,
        user_agent,
        is_click,
        tokens_charged,
        created_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        p_page_location,
        p_session_id,
        p_device_type,
        p_user_agent,
        FALSE,
        v_actual_charge,
        NOW()
    )
    RETURNING id INTO v_impression_id;
    
    -- Update campaign stats (only charge if within budget)
    IF NOT v_is_platform_ad AND v_actual_charge > 0 THEN
        UPDATE public.ad_campaigns
        SET impressions_count = impressions_count + 1,
            tokens_spent = LEAST(tokens_spent + v_actual_charge, token_budget), -- Never exceed budget
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        -- Log transaction
        INSERT INTO public.ad_campaign_transactions (
            campaign_id,
            user_id,
            transaction_type,
            amount,
            description,
            created_at
        ) VALUES (
            p_campaign_id,
            (SELECT seller_id FROM public.ad_campaigns WHERE id = p_campaign_id),
            'impression_charge',
            v_actual_charge,
            'Impression on ' || p_page_location,
            NOW()
        );
        
        RAISE NOTICE '💰 PAID AD: Charged % tokens for impression (seller: %)', v_actual_charge, v_seller_username;
    ELSE
        -- Just increment impressions count (no charge)
        UPDATE public.ad_campaigns
        SET impressions_count = impressions_count + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        IF v_is_platform_ad THEN
            RAISE NOTICE '🆓 PLATFORM AD: Free impression (no charge)';
        ELSE
            RAISE NOTICE '⚠️ PAID AD: No charge (budget exhausted)';
        END IF;
    END IF;
    
    RETURN v_impression_id;
END;
$$;

-- ========================================
-- STEP 3: Create improved click function
-- ========================================
CREATE OR REPLACE FUNCTION log_ad_click(
    p_campaign_id UUID,
    p_impression_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_click_id UUID;
    v_user_id UUID;
    v_is_platform_ad BOOLEAN;
    v_seller_username TEXT;
    v_cost_per_click NUMERIC(10, 2);
    v_token_budget NUMERIC(10, 2);
    v_tokens_spent NUMERIC(10, 4);
    v_remaining_budget NUMERIC(10, 4);
    v_actual_charge NUMERIC(10, 4);
    v_session_id TEXT;
    v_page_location TEXT;
    v_user_agent TEXT;
    v_device_type TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Get campaign details including budget info
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_click, 5.0),
        token_budget,
        tokens_spent
    INTO v_is_platform_ad, v_seller_username, v_cost_per_click, v_token_budget, v_tokens_spent
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- Calculate remaining budget
    v_remaining_budget := v_token_budget - COALESCE(v_tokens_spent, 0);
    
    -- If no budget remaining, still log click but don't charge
    IF v_remaining_budget <= 0 AND NOT v_is_platform_ad THEN
        v_actual_charge := 0;
        RAISE NOTICE '⚠️ Campaign % has no remaining budget - click logged but not charged', p_campaign_id;
    ELSIF NOT v_is_platform_ad THEN
        -- Charge only what's available (don't exceed budget)
        v_actual_charge := LEAST(v_cost_per_click, v_remaining_budget);
    ELSE
        v_actual_charge := 0;
    END IF;
    
    -- Get details from impression if provided
    IF p_impression_id IS NOT NULL THEN
        SELECT session_id, page_location, user_agent, device_type
        INTO v_session_id, v_page_location, v_user_agent, v_device_type
        FROM public.ad_impressions
        WHERE id = p_impression_id;
    END IF;
    
    -- Log the click
    INSERT INTO public.ad_impressions (
        campaign_id,
        user_id,
        page_location,
        session_id,
        device_type,
        user_agent,
        is_click,
        tokens_charged,
        created_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        COALESCE(v_page_location, 'unknown'),
        COALESCE(v_session_id, 'unknown'),
        v_device_type,
        v_user_agent,
        TRUE,
        v_actual_charge,
        NOW()
    )
    RETURNING id INTO v_click_id;
    
    -- Update campaign stats (only charge if within budget)
    IF NOT v_is_platform_ad AND v_actual_charge > 0 THEN
        UPDATE public.ad_campaigns
        SET clicks_count = clicks_count + 1,
            tokens_spent = LEAST(tokens_spent + v_actual_charge, token_budget), -- Never exceed budget
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        -- Log transaction
        INSERT INTO public.ad_campaign_transactions (
            campaign_id,
            user_id,
            transaction_type,
            amount,
            description,
            created_at
        ) VALUES (
            p_campaign_id,
            (SELECT seller_id FROM public.ad_campaigns WHERE id = p_campaign_id),
            'click_charge',
            v_actual_charge,
            'Click on ' || COALESCE(v_page_location, 'unknown page'),
            NOW()
        );
        
        RAISE NOTICE '💰 PAID AD: Charged % tokens for click (seller: %)', v_actual_charge, v_seller_username;
    ELSE
        -- Just increment clicks count (no charge)
        UPDATE public.ad_campaigns
        SET clicks_count = clicks_count + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
        
        IF v_is_platform_ad THEN
            RAISE NOTICE '🆓 PLATFORM AD: Free click (no charge)';
        ELSE
            RAISE NOTICE '⚠️ PAID AD: No charge (budget exhausted)';
        END IF;
    END IF;
    
    RETURN v_click_id;
END;
$$;

-- ========================================
-- STEP 4: Grant permissions
-- ========================================
GRANT EXECUTE ON FUNCTION log_ad_impression TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_ad_click TO anon, authenticated;

-- ========================================
-- STEP 5: Fix any campaigns that exceeded budget
-- Reset tokens_spent to not exceed token_budget
-- ========================================
UPDATE public.ad_campaigns
SET tokens_spent = token_budget
WHERE tokens_spent > token_budget;

-- ========================================
-- VERIFICATION
-- ========================================
SELECT '✅ Ad budget constraint fix applied!' as result;
SELECT 'Now: Impressions/clicks will not exceed campaign budget' as info;
SELECT 'Campaigns that exceeded budget have been reset to max budget' as fix;

