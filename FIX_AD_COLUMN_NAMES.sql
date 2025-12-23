-- FIX_AD_COLUMN_NAMES.sql
-- Fix the column name mismatch: impressions_count → total_impressions
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Drop existing functions
-- ========================================
DROP FUNCTION IF EXISTS log_ad_impression CASCADE;
DROP FUNCTION IF EXISTS log_ad_click CASCADE;

-- ========================================
-- STEP 2: Create FIXED impression function
-- Uses correct column name: total_impressions (not impressions_count)
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
    
    -- If campaign not found, return null
    IF v_seller_username IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate remaining budget
    v_remaining_budget := v_token_budget - COALESCE(v_tokens_spent, 0);
    
    -- If no budget remaining, still log impression but don't charge
    IF v_remaining_budget <= 0 AND NOT v_is_platform_ad THEN
        v_actual_charge := 0;
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
    
    -- Update campaign stats using CORRECT column name: total_impressions
    IF NOT v_is_platform_ad AND v_actual_charge > 0 THEN
        UPDATE public.ad_campaigns
        SET total_impressions = COALESCE(total_impressions, 0) + 1,
            tokens_spent = LEAST(COALESCE(tokens_spent, 0) + v_actual_charge, token_budget),
            updated_at = NOW()
        WHERE id = p_campaign_id;
    ELSE
        -- Still increment impression count even if not charging
        UPDATE public.ad_campaigns
        SET total_impressions = COALESCE(total_impressions, 0) + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN v_impression_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't crash - impressions are non-critical
        RAISE WARNING 'Error logging impression: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- ========================================
-- STEP 3: Create FIXED click function
-- Uses correct column name: total_clicks (not clicks_count)
-- ========================================
CREATE OR REPLACE FUNCTION log_ad_click(
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
    v_click_id UUID;
    v_user_id UUID;
    v_is_platform_ad BOOLEAN;
    v_seller_username TEXT;
    v_cost_per_click NUMERIC(10, 4);
    v_token_budget NUMERIC(10, 2);
    v_tokens_spent NUMERIC(10, 4);
    v_remaining_budget NUMERIC(10, 4);
    v_actual_charge NUMERIC(10, 4);
BEGIN
    v_user_id := auth.uid();
    
    -- Get campaign details
    SELECT 
        seller_username = 'DropDollar' OR token_budget >= 999999999,
        seller_username,
        COALESCE(cost_per_click, 0.01),
        token_budget,
        tokens_spent
    INTO v_is_platform_ad, v_seller_username, v_cost_per_click, v_token_budget, v_tokens_spent
    FROM public.ad_campaigns
    WHERE id = p_campaign_id;
    
    -- If campaign not found, return null
    IF v_seller_username IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate remaining budget
    v_remaining_budget := v_token_budget - COALESCE(v_tokens_spent, 0);
    
    -- If no budget remaining, still log click but don't charge
    IF v_remaining_budget <= 0 AND NOT v_is_platform_ad THEN
        v_actual_charge := 0;
    ELSIF NOT v_is_platform_ad THEN
        v_actual_charge := LEAST(v_cost_per_click, v_remaining_budget);
    ELSE
        v_actual_charge := 0;
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
        p_page_location,
        p_session_id,
        p_device_type,
        p_user_agent,
        TRUE,
        v_actual_charge,
        NOW()
    )
    RETURNING id INTO v_click_id;
    
    -- Update campaign stats using CORRECT column name: total_clicks
    IF NOT v_is_platform_ad AND v_actual_charge > 0 THEN
        UPDATE public.ad_campaigns
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            tokens_spent = LEAST(COALESCE(tokens_spent, 0) + v_actual_charge, token_budget),
            updated_at = NOW()
        WHERE id = p_campaign_id;
    ELSE
        UPDATE public.ad_campaigns
        SET total_clicks = COALESCE(total_clicks, 0) + 1,
            updated_at = NOW()
        WHERE id = p_campaign_id;
    END IF;
    
    RETURN v_click_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error logging click: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- ========================================
-- STEP 4: Grant permissions
-- ========================================
GRANT EXECUTE ON FUNCTION log_ad_impression TO authenticated;
GRANT EXECUTE ON FUNCTION log_ad_impression TO anon;
GRANT EXECUTE ON FUNCTION log_ad_click TO authenticated;
GRANT EXECUTE ON FUNCTION log_ad_click TO anon;

-- ========================================
-- STEP 5: Verify the fix
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Ad functions updated with correct column names!';
    RAISE NOTICE '   - total_impressions (was: impressions_count)';
    RAISE NOTICE '   - total_clicks (was: clicks_count)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Run this SQL in Supabase to apply the fix.';
END $$;

