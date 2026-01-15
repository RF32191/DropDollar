-- ============================================================================
-- FIX HOT SELL PRIZE CALCULATION - IMMEDIATE UPDATE
-- ============================================================================
-- This script ensures prize columns exist and calculates prizes from base_price
-- Prize Distribution: 1st (50%), 2nd (20%), 3rd (15%), Platform Fee (15%)
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure prize columns exist in hot_sell_sessions table
-- ============================================================================
DO $$
BEGIN
    -- Add first_place_prize if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hot_sell_sessions' 
        AND column_name = 'first_place_prize'
    ) THEN
        ALTER TABLE public.hot_sell_sessions 
        ADD COLUMN first_place_prize NUMERIC(18,2) DEFAULT 0;
        RAISE NOTICE '✅ Added first_place_prize column';
    END IF;
    
    -- Add second_place_prize if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hot_sell_sessions' 
        AND column_name = 'second_place_prize'
    ) THEN
        ALTER TABLE public.hot_sell_sessions 
        ADD COLUMN second_place_prize NUMERIC(18,2) DEFAULT 0;
        RAISE NOTICE '✅ Added second_place_prize column';
    END IF;
    
    -- Add third_place_prize if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hot_sell_sessions' 
        AND column_name = 'third_place_prize'
    ) THEN
        ALTER TABLE public.hot_sell_sessions 
        ADD COLUMN third_place_prize NUMERIC(18,2) DEFAULT 0;
        RAISE NOTICE '✅ Added third_place_prize column';
    END IF;
    
    -- Add platform_fee if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'hot_sell_sessions' 
        AND column_name = 'platform_fee'
    ) THEN
        ALTER TABLE public.hot_sell_sessions 
        ADD COLUMN platform_fee NUMERIC(18,2) DEFAULT 0;
        RAISE NOTICE '✅ Added platform_fee column';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update ALL sessions with calculated prizes from base_price
-- ============================================================================
UPDATE public.hot_sell_sessions
SET 
    first_place_prize = COALESCE(base_price, 0) * 0.50,   -- 50%
    second_place_prize = COALESCE(base_price, 0) * 0.20, -- 20%
    third_place_prize = COALESCE(base_price, 0) * 0.15,   -- 15%
    platform_fee = COALESCE(base_price, 0) * 0.15,       -- 15%
    updated_at = NOW()
WHERE base_price IS NOT NULL AND base_price > 0;

-- ============================================================================
-- STEP 3: Create trigger function to auto-calculate prizes
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_calculate_hot_sell_prizes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate prizes from base_price whenever base_price is set/changed
    IF NEW.base_price IS NOT NULL AND NEW.base_price > 0 THEN
        NEW.first_place_prize := NEW.base_price * 0.50;   -- 50%
        NEW.second_place_prize := NEW.base_price * 0.20;  -- 20%
        NEW.third_place_prize := NEW.base_price * 0.15;  -- 15%
        NEW.platform_fee := NEW.base_price * 0.15;        -- 15%
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 4: Create trigger (drop old one first)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_auto_calculate_hot_sell_prizes ON public.hot_sell_sessions;

CREATE TRIGGER trigger_auto_calculate_hot_sell_prizes
    BEFORE INSERT OR UPDATE OF base_price ON public.hot_sell_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_hot_sell_prizes();

-- ============================================================================
-- STEP 5: Verify updates
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
    v_sample RECORD;
BEGIN
    -- Count updated sessions
    SELECT COUNT(*) INTO v_count
    FROM public.hot_sell_sessions
    WHERE base_price > 0 
    AND first_place_prize > 0;
    
    RAISE NOTICE '✅ Updated % sessions with calculated prizes', v_count;
    
    -- Show sample of updated sessions
    FOR v_sample IN 
        SELECT id, base_price, first_place_prize, second_place_prize, third_place_prize, platform_fee
        FROM public.hot_sell_sessions
        WHERE base_price > 0
        ORDER BY base_price DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '💰 Session %: base_price=%, 1st=%, 2nd=%, 3rd=%, fee=%', 
            v_sample.id,
            v_sample.base_price,
            v_sample.first_place_prize,
            v_sample.second_place_prize,
            v_sample.third_place_prize,
            v_sample.platform_fee;
    END LOOP;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ HOT SELL PRIZE CALCULATION FIXED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All sessions updated with prizes calculated from base_price';
    RAISE NOTICE '✅ Trigger created to auto-calculate for new sessions';
    RAISE NOTICE '✅ Prize Distribution:';
    RAISE NOTICE '✅   - 1st Place: 50%% of base_price';
    RAISE NOTICE '✅   - 2nd Place: 20%% of base_price';
    RAISE NOTICE '✅   - 3rd Place: 15%% of base_price';
    RAISE NOTICE '✅   - Platform Fee: 15%% of base_price';
    RAISE NOTICE '✅ ============================================================';
END $$;

