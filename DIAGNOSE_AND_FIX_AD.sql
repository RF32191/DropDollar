-- DIAGNOSE_AND_FIX_AD.sql
-- Complete diagnostic and fix for ad impression errors
-- Run this ENTIRE script in Supabase SQL Editor

-- ========================================
-- STEP 1: Check what columns actually exist
-- ========================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE '📊 CURRENT AD_CAMPAIGNS TABLE COLUMNS:';
    RAISE NOTICE '=========================================';
    
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ad_campaigns' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % (Type: %)', col_record.column_name, col_record.data_type;
    END LOOP;
END $$;

-- ========================================
-- STEP 2: Check what functions exist
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 EXISTING AD FUNCTIONS:';
    RAISE NOTICE '=========================================';
END $$;

SELECT proname as function_name, pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('log_ad_impression', 'log_ad_click')
AND pronamespace = 'public'::regnamespace;

-- ========================================
-- STEP 3: Force drop ALL versions of these functions
-- ========================================
DROP FUNCTION IF EXISTS public.log_ad_impression(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_ad_impression(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_ad_click(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_ad_click(UUID, TEXT, TEXT) CASCADE;

-- Also try without schema prefix
DROP FUNCTION IF EXISTS log_ad_impression(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_ad_impression(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_ad_click(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_ad_click(UUID, TEXT, TEXT) CASCADE;

-- ========================================
-- STEP 4: Make sure columns exist on ad_campaigns
-- ========================================
ALTER TABLE public.ad_campaigns 
ADD COLUMN IF NOT EXISTS total_impressions INTEGER DEFAULT 0;

ALTER TABLE public.ad_campaigns 
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0;

ALTER TABLE public.ad_campaigns 
ADD COLUMN IF NOT EXISTS tokens_spent NUMERIC(10, 4) DEFAULT 0;

-- ========================================
-- STEP 5: Create SIMPLE working functions
-- ========================================
CREATE OR REPLACE FUNCTION public.log_ad_impression(
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
BEGIN
    v_user_id := auth.uid();
    
    -- Log the impression
    INSERT INTO public.ad_impressions (
        campaign_id,
        user_id,
        page_location,
        session_id,
        device_type,
        user_agent,
        is_click,
        created_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        p_page_location,
        p_session_id,
        p_device_type,
        p_user_agent,
        FALSE,
        NOW()
    )
    RETURNING id INTO v_impression_id;
    
    -- Update campaign stats - uses total_impressions column
    UPDATE public.ad_campaigns
    SET total_impressions = COALESCE(total_impressions, 0) + 1,
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    RETURN v_impression_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error logging impression: %', SQLERRM;
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ad_click(
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
BEGIN
    v_user_id := auth.uid();
    
    -- Log the click
    INSERT INTO public.ad_impressions (
        campaign_id,
        user_id,
        page_location,
        session_id,
        device_type,
        user_agent,
        is_click,
        created_at
    ) VALUES (
        p_campaign_id,
        v_user_id,
        p_page_location,
        p_session_id,
        p_device_type,
        p_user_agent,
        TRUE,
        NOW()
    )
    RETURNING id INTO v_click_id;
    
    -- Update campaign stats - uses total_clicks column
    UPDATE public.ad_campaigns
    SET total_clicks = COALESCE(total_clicks, 0) + 1,
        updated_at = NOW()
    WHERE id = p_campaign_id;
    
    RETURN v_click_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error logging click: %', SQLERRM;
        RETURN NULL;
END;
$$;

-- ========================================
-- STEP 6: Grant permissions
-- ========================================
GRANT EXECUTE ON FUNCTION public.log_ad_impression(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_ad_impression(UUID, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_ad_click(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_ad_click(UUID, TEXT, TEXT, TEXT, TEXT) TO anon;

-- ========================================
-- STEP 7: Verify fix worked
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ AD FUNCTIONS RECREATED SUCCESSFULLY!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Functions now use: total_impressions, total_clicks';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test by refreshing your page - the error should be gone.';
END $$;

-- Show final function definitions to confirm
SELECT proname as function_name
FROM pg_proc
WHERE proname IN ('log_ad_impression', 'log_ad_click')
AND pronamespace = 'public'::regnamespace;

