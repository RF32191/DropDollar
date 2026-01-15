-- ============================================================================
-- CALCULATE HOT SELL PRIZES FROM BASE PRICE (LISTING PRICE)
-- ============================================================================
-- This script creates functions and triggers to automatically calculate
-- prize amounts based on the base_price (listing price) instead of prize_pool
-- 
-- Prize Distribution:
--   - 1st Place: 50% of base_price
--   - 2nd Place: 20% of base_price  
--   - 3rd Place: 15% of base_price
--   - Platform Fee: 15% of base_price
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: Calculate prizes from base_price
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_hot_sell_prizes_from_base_price(
    base_price_param NUMERIC
)
RETURNS TABLE (
    first_place_prize NUMERIC,
    second_place_prize NUMERIC,
    third_place_prize NUMERIC,
    platform_fee NUMERIC
) 
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN QUERY SELECT
        base_price_param * 0.50 AS first_place_prize,   -- 50%
        base_price_param * 0.20 AS second_place_prize,  -- 20%
        base_price_param * 0.15 AS third_place_prize,   -- 15%
        base_price_param * 0.15 AS platform_fee;        -- 15%
END;
$$;

-- ============================================================================
-- FUNCTION 2: Update all hot sell sessions with calculated prizes
-- ============================================================================
CREATE OR REPLACE FUNCTION update_all_hot_sell_prizes_from_base_price()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_prizes RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Updating all hot sell session prizes from base_price...';
    
    -- Loop through all active sessions
    FOR v_session IN 
        SELECT id, base_price 
        FROM public.hot_sell_sessions
        WHERE status != 'completed'
    LOOP
        -- Calculate prizes based on base_price
        SELECT * INTO v_prizes
        FROM calculate_hot_sell_prizes_from_base_price(v_session.base_price);
        
        -- Update session with calculated prizes
        UPDATE public.hot_sell_sessions
        SET 
            first_place_prize = v_prizes.first_place_prize,
            second_place_prize = v_prizes.second_place_prize,
            third_place_prize = v_prizes.third_place_prize,
            platform_fee = v_prizes.platform_fee,
            updated_at = NOW()
        WHERE id = v_session.id;
        
        v_updated_count := v_updated_count + 1;
        
        RAISE NOTICE '✅ Updated session %: 1st=%, 2nd=%, 3rd=%, fee=%', 
            v_session.id, 
            v_prizes.first_place_prize,
            v_prizes.second_place_prize,
            v_prizes.third_place_prize,
            v_prizes.platform_fee;
    END LOOP;
    
    RAISE NOTICE '✅ Updated % sessions', v_updated_count;
    RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- FUNCTION 3: Trigger function to auto-update prizes when base_price changes
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_calculate_hot_sell_prizes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_prizes RECORD;
BEGIN
    -- Only update if base_price changed or prizes are NULL
    IF (TG_OP = 'INSERT' OR OLD.base_price IS DISTINCT FROM NEW.base_price OR 
        NEW.first_place_prize IS NULL OR NEW.second_place_prize IS NULL OR 
        NEW.third_place_prize IS NULL OR NEW.platform_fee IS NULL) THEN
        
        -- Calculate prizes from base_price
        SELECT * INTO v_prizes
        FROM calculate_hot_sell_prizes_from_base_price(NEW.base_price);
        
        -- Update the new record with calculated prizes
        NEW.first_place_prize := v_prizes.first_place_prize;
        NEW.second_place_prize := v_prizes.second_place_prize;
        NEW.third_place_prize := v_prizes.third_place_prize;
        NEW.platform_fee := v_prizes.platform_fee;
        
        RAISE NOTICE '💰 Auto-calculated prizes for session %: 1st=%, 2nd=%, 3rd=%, fee=%', 
            NEW.id,
            NEW.first_place_prize,
            NEW.second_place_prize,
            NEW.third_place_prize,
            NEW.platform_fee;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: Auto-calculate prizes on INSERT/UPDATE
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_auto_calculate_hot_sell_prizes ON public.hot_sell_sessions;

CREATE TRIGGER trigger_auto_calculate_hot_sell_prizes
    BEFORE INSERT OR UPDATE OF base_price ON public.hot_sell_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_hot_sell_prizes();

-- ============================================================================
-- FUNCTION 4: Get calculated prizes for a specific session
-- ============================================================================
CREATE OR REPLACE FUNCTION get_hot_sell_prizes(session_id_param UUID)
RETURNS TABLE (
    first_place_prize NUMERIC,
    second_place_prize NUMERIC,
    third_place_prize NUMERIC,
    platform_fee NUMERIC,
    base_price NUMERIC,
    prize_pool NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_prizes RECORD;
BEGIN
    -- Get session
    SELECT base_price, prize_pool INTO v_session
    FROM public.hot_sell_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', session_id_param;
    END IF;
    
    -- Calculate prizes from base_price
    SELECT * INTO v_prizes
    FROM calculate_hot_sell_prizes_from_base_price(v_session.base_price);
    
    RETURN QUERY SELECT
        v_prizes.first_place_prize,
        v_prizes.second_place_prize,
        v_prizes.third_place_prize,
        v_prizes.platform_fee,
        v_session.base_price,
        v_session.prize_pool;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION calculate_hot_sell_prizes_from_base_price(NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_all_hot_sell_prizes_from_base_price() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_hot_sell_prizes(UUID) TO authenticated, anon, service_role;

-- ============================================================================
-- UPDATE EXISTING SESSIONS
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '🔄 Updating all existing hot sell sessions...';
    SELECT update_all_hot_sell_prizes_from_base_price() INTO v_count;
    RAISE NOTICE '✅ Updated % sessions', v_count;
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ HOT SELL PRIZE CALCULATION SYSTEM CREATED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Functions created:';
    RAISE NOTICE '✅   - calculate_hot_sell_prizes_from_base_price(base_price)';
    RAISE NOTICE '✅   - update_all_hot_sell_prizes_from_base_price()';
    RAISE NOTICE '✅   - get_hot_sell_prizes(session_id)';
    RAISE NOTICE '✅ Trigger created:';
    RAISE NOTICE '✅   - trigger_auto_calculate_hot_sell_prizes (auto-updates on INSERT/UPDATE)';
    RAISE NOTICE '✅ Prize Distribution:';
    RAISE NOTICE '✅   - 1st Place: 50%% of base_price';
    RAISE NOTICE '✅   - 2nd Place: 20%% of base_price';
    RAISE NOTICE '✅   - 3rd Place: 15%% of base_price';
    RAISE NOTICE '✅   - Platform Fee: 15%% of base_price';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ All existing sessions have been updated!';
    RAISE NOTICE '✅ New sessions will auto-calculate prizes on creation!';
    RAISE NOTICE '✅ ============================================================';
END $$;

