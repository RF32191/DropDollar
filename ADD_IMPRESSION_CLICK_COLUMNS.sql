-- ADD_IMPRESSION_CLICK_COLUMNS.sql
-- Add impression and click tracking columns if they don't exist

DO $$
BEGIN
    -- Add total_impressions column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_campaigns' 
        AND column_name = 'total_impressions'
    ) THEN
        ALTER TABLE public.ad_campaigns 
        ADD COLUMN total_impressions BIGINT DEFAULT 0;
        RAISE NOTICE '✅ Added total_impressions column';
    ELSE
        RAISE NOTICE '⚠️ total_impressions column already exists';
    END IF;

    -- Add total_clicks column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_campaigns' 
        AND column_name = 'total_clicks'
    ) THEN
        ALTER TABLE public.ad_campaigns 
        ADD COLUMN total_clicks BIGINT DEFAULT 0;
        RAISE NOTICE '✅ Added total_clicks column';
    ELSE
        RAISE NOTICE '⚠️ total_clicks column already exists';
    END IF;

    -- Add click_through_rate column (computed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ad_campaigns' 
        AND column_name = 'click_through_rate'
    ) THEN
        ALTER TABLE public.ad_campaigns 
        ADD COLUMN click_through_rate NUMERIC(5, 2) DEFAULT 0.00;
        RAISE NOTICE '✅ Added click_through_rate column';
    ELSE
        RAISE NOTICE '⚠️ click_through_rate column already exists';
    END IF;
END $$;

-- Update existing campaigns to calculate CTR
UPDATE public.ad_campaigns
SET click_through_rate = CASE 
    WHEN COALESCE(total_impressions, 0) > 0 
    THEN (COALESCE(total_clicks, 0)::NUMERIC / total_impressions::NUMERIC) * 100
    ELSE 0
END
WHERE total_impressions > 0;

-- Create a function to auto-update CTR when impressions/clicks change
CREATE OR REPLACE FUNCTION update_campaign_ctr()
RETURNS TRIGGER AS $$
BEGIN
    NEW.click_through_rate := CASE 
        WHEN COALESCE(NEW.total_impressions, 0) > 0 
        THEN (COALESCE(NEW.total_clicks, 0)::NUMERIC / NEW.total_impressions::NUMERIC) * 100
        ELSE 0
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_campaign_ctr ON public.ad_campaigns;

-- Create trigger
CREATE TRIGGER trigger_update_campaign_ctr
    BEFORE UPDATE ON public.ad_campaigns
    FOR EACH ROW
    WHEN (OLD.total_impressions IS DISTINCT FROM NEW.total_impressions 
          OR OLD.total_clicks IS DISTINCT FROM NEW.total_clicks)
    EXECUTE FUNCTION update_campaign_ctr();

SELECT '✅ Impression and click tracking columns ready!' as result;

