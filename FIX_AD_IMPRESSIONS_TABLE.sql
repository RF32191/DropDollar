-- FIX_AD_IMPRESSIONS_TABLE.sql
-- Creates or fixes the ad_impressions table with all required columns

-- ========================================
-- STEP 1: Create ad_impressions table if it doesn't exist
-- ========================================
CREATE TABLE IF NOT EXISTS public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    page_location TEXT NOT NULL,
    session_id TEXT NOT NULL,
    device_type TEXT,
    user_agent TEXT,
    is_click BOOLEAN DEFAULT FALSE,
    tokens_charged NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STEP 2: Add missing columns if table exists but columns don't
-- ========================================
DO $$
BEGIN
    -- Add is_click column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'is_click'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN is_click BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_click column to ad_impressions';
    END IF;

    -- Add tokens_charged column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'tokens_charged'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN tokens_charged NUMERIC(10, 4) DEFAULT 0;
        RAISE NOTICE '✅ Added tokens_charged column to ad_impressions';
    END IF;

    -- Add page_location column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'page_location'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN page_location TEXT NOT NULL DEFAULT 'unknown';
        RAISE NOTICE '✅ Added page_location column to ad_impressions';
    END IF;

    -- Add session_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN session_id TEXT NOT NULL DEFAULT 'unknown';
        RAISE NOTICE '✅ Added session_id column to ad_impressions';
    END IF;

    -- Add device_type column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'device_type'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN device_type TEXT;
        RAISE NOTICE '✅ Added device_type column to ad_impressions';
    END IF;

    -- Add user_agent column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN user_agent TEXT;
        RAISE NOTICE '✅ Added user_agent column to ad_impressions';
    END IF;

    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added created_at column to ad_impressions';
    END IF;

    -- Add campaign_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'campaign_id'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN campaign_id UUID;
        RAISE NOTICE '✅ Added campaign_id column to ad_impressions';
    END IF;

    -- Add user_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_impressions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.ad_impressions ADD COLUMN user_id UUID;
        RAISE NOTICE '✅ Added user_id column to ad_impressions';
    END IF;

    RAISE NOTICE '✅ All required columns exist in ad_impressions table';
END $$;

-- ========================================
-- STEP 3: Create indexes for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_id 
ON public.ad_impressions(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_at 
ON public.ad_impressions(created_at);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_is_click 
ON public.ad_impressions(is_click);

-- ========================================
-- STEP 4: Set up RLS policies
-- ========================================
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon to insert impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Allow all to read impressions" ON public.ad_impressions;

-- Create new policies
CREATE POLICY "Allow anon to insert impressions"
ON public.ad_impressions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow all to read impressions"
ON public.ad_impressions
FOR SELECT
TO anon, authenticated
USING (true);

-- ========================================
-- STEP 5: Verify table structure
-- ========================================
SELECT 
    '✅ VERIFICATION' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'ad_impressions'
ORDER BY ordinal_position;

SELECT '✅ ad_impressions table is ready! Now run FIX_TRACKING_AND_CHARGING.sql' as next_step;

