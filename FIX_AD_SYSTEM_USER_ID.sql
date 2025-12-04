-- FIX_AD_SYSTEM_USER_ID.sql
-- Check users table structure and fix ad_campaigns foreign key

-- First, let's check what the users table looks like
DO $$
BEGIN
    -- Check if users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE '✅ users table exists';
        
        -- Show the structure
        RAISE NOTICE 'Users table columns:';
        FOR r IN (
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
            ORDER BY ordinal_position
        ) LOOP
            RAISE NOTICE '  - % (%)', r.column_name, r.data_type;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ users table does NOT exist';
    END IF;
END $$;

-- Now create ad_campaigns WITHOUT the foreign key constraint initially
DROP TABLE IF EXISTS public.ad_campaigns CASCADE;

CREATE TABLE public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL, -- Temporarily no FK constraint
    seller_username TEXT NOT NULL,
    
    -- Campaign Details
    campaign_name TEXT NOT NULL,
    campaign_status TEXT NOT NULL DEFAULT 'pending',
    
    -- Ad Content
    headline TEXT NOT NULL,
    description TEXT NOT NULL,
    call_to_action TEXT NOT NULL DEFAULT 'Shop Now',
    destination_url TEXT NOT NULL,
    
    -- Targeting
    target_pages TEXT[] DEFAULT ARRAY['games', 'dashboard', 'tournaments']::TEXT[],
    target_categories TEXT[],
    
    -- Budget & Pricing
    token_budget INTEGER NOT NULL,
    tokens_spent INTEGER DEFAULT 0,
    cost_per_impression INTEGER DEFAULT 1,
    cost_per_click INTEGER DEFAULT 5,
    daily_token_limit INTEGER,
    
    -- Performance Metrics
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    click_through_rate NUMERIC(5,2) DEFAULT 0.00,
    
    -- Scheduling
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_impression_at TIMESTAMPTZ,
    
    -- Approval
    admin_approved BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    
    CONSTRAINT valid_budget CHECK (token_budget > 0),
    CONSTRAINT valid_spent CHECK (tokens_spent >= 0 AND tokens_spent <= token_budget),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date)
);

RAISE NOTICE '✅ Created ad_campaigns table without FK constraint';

-- Try to add foreign key if users table exists with id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'id'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE public.ad_campaigns
        ADD CONSTRAINT ad_campaigns_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key constraint to users(id)';
    ELSE
        RAISE NOTICE '⚠️ Skipping foreign key - users.id column not found';
        RAISE NOTICE '💡 Ad campaigns will still work, but without FK enforcement';
    END IF;
END $$;

-- Create other tables (these don't reference users directly)
CREATE TABLE IF NOT EXISTS public.ad_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'banner',
    dimensions TEXT,
    file_size INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_image_type CHECK (image_type IN ('banner', 'square', 'vertical', 'mobile'))
);

CREATE TABLE IF NOT EXISTS public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    
    page_location TEXT NOT NULL,
    user_id UUID, -- No FK constraint
    session_id TEXT,
    
    clicked BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMPTZ,
    
    converted BOOLEAN DEFAULT FALSE,
    conversion_value NUMERIC(10,2),
    
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    
    user_agent TEXT,
    device_type TEXT,
    
    tokens_charged INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.ad_campaign_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL, -- No FK constraint
    
    transaction_type TEXT NOT NULL,
    token_amount INTEGER NOT NULL,
    description TEXT,
    
    tokens_before INTEGER,
    tokens_after INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('purchase', 'refund', 'charge_impression', 'charge_click', 'bonus'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_seller ON public.ad_campaigns(seller_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(campaign_status) WHERE campaign_status = 'active';
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_pages ON public.ad_campaigns USING GIN(target_pages);
CREATE INDEX IF NOT EXISTS idx_ad_images_campaign ON public.ad_images(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON public.ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_viewed_at ON public.ad_impressions(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_transactions_campaign ON public.ad_campaign_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_transactions_seller ON public.ad_campaign_transactions(seller_id);

SELECT '✅ Ad system tables created successfully!' as result;
SELECT 'Note: Foreign key constraints added where possible' as note;

