-- CREATE_AD_TABLES_FROM_SCRATCH.sql
-- Completely recreates ad_impressions table with all required columns

-- ========================================
-- STEP 1: Drop and recreate ad_impressions table
-- ========================================
DROP TABLE IF EXISTS public.ad_impressions CASCADE;

CREATE TABLE public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    user_id UUID,
    page_location TEXT NOT NULL,
    session_id TEXT NOT NULL,
    device_type TEXT,
    user_agent TEXT,
    is_click BOOLEAN DEFAULT FALSE,
    tokens_charged NUMERIC(10, 4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys AFTER table creation
DO $$
BEGIN
    -- Try to add foreign key to ad_campaigns
    BEGIN
        ALTER TABLE public.ad_impressions
        ADD CONSTRAINT fk_ad_impressions_campaign
        FOREIGN KEY (campaign_id) REFERENCES public.ad_campaigns(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added foreign key to ad_campaigns';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not add FK to ad_campaigns (table may not exist)';
    END;

    -- Try to add foreign key to auth.users
    BEGIN
        ALTER TABLE public.ad_impressions
        ADD CONSTRAINT fk_ad_impressions_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added foreign key to auth.users';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not add FK to auth.users';
    END;

    RAISE NOTICE '✅ Created ad_impressions table';
END $$;

-- ========================================
-- STEP 2: Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_id ON public.ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_at ON public.ad_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_is_click ON public.ad_impressions(is_click);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_session_id ON public.ad_impressions(session_id);

-- ========================================
-- STEP 3: Enable RLS
-- ========================================
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon to insert impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Allow all to read impressions" ON public.ad_impressions;

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
-- STEP 4: Verify table structure
-- ========================================
SELECT 
    'TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'ad_impressions'
ORDER BY ordinal_position;

SELECT '✅ ad_impressions table created successfully! Now run FIX_TRACKING_AND_CHARGING.sql' as next_step;

