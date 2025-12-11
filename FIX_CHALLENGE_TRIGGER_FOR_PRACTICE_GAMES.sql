-- ============================================================================
-- FIX CHALLENGE TRIGGER FOR PRACTICE GAMES
-- ============================================================================
-- Fixes the trigger to correctly detect practice games using is_practice column
-- Ensures all game types (practice, competition, coin play) update challenges
-- ============================================================================

-- ============================================================================
-- 1. UPDATE TRIGGER FUNCTION TO USE CORRECT COLUMN
-- ============================================================================

-- Drop and recreate the trigger function with correct column detection
DROP TRIGGER IF EXISTS trigger_update_challenges_on_game_history ON public.game_history;

CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_coin_play BOOLEAN;
    v_is_practice BOOLEAN;
BEGIN
    -- Only process if this is a new game record
    IF TG_OP = 'INSERT' THEN
        -- Determine if it's practice (use is_practice column, not session_type)
        v_is_practice := COALESCE(NEW.is_practice, false);
        
        -- Detect coin play games
        v_is_coin_play := false;
        
        -- Method 1: Check metadata for coin_play flag (most reliable)
        IF NEW.metadata IS NOT NULL THEN
            IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                v_is_coin_play := true;
            END IF;
        END IF;
        
        -- Method 2: Check if listing_id matches coin play pattern (starts with 'cp-')
        IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
            IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                v_is_coin_play := true;
            END IF;
        END IF;
        
        -- Method 3: Check if user has a recent coin_play_participants record (within last 5 minutes)
        IF NOT v_is_coin_play THEN
            SELECT EXISTS (
                SELECT 1 FROM public.coin_play_participants cp
                JOIN public.coin_play_sessions cs ON cp.session_id = cs.id
                WHERE cp.user_id = NEW.user_id
                AND cp.completed_at IS NOT NULL
                AND cp.completed_at > NOW() - INTERVAL '5 minutes'
                AND cs.game_type = NEW.game_type
            ) INTO v_is_coin_play;
        END IF;
        
        -- Update challenges based on game completion
        -- Use the updated function signature that includes coin play detection
        PERFORM public.update_challenges_on_game_complete(
            NEW.user_id,
            NEW.game_type,
            COALESCE(NEW.score, 0)::INTEGER,
            v_is_practice,
            v_is_coin_play
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_challenges_on_game_history
AFTER INSERT ON public.game_history
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();

-- ============================================================================
-- 2. VERIFY TRIGGER EXISTS AND IS ACTIVE
-- ============================================================================

DO $$
DECLARE
    v_trigger_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) INTO v_trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'trigger_update_challenges_on_game_history'
    ) INTO v_function_exists;
    
    IF v_trigger_exists THEN
        RAISE NOTICE '✅ Trigger exists and is active';
    ELSE
        RAISE NOTICE '❌ Trigger NOT found - please check manually';
    END IF;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ Trigger function exists';
    ELSE
        RAISE NOTICE '❌ Trigger function NOT found - please check manually';
    END IF;
END $$;

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.trigger_update_challenges_on_game_history() TO authenticated, service_role;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CHALLENGE TRIGGER FIXED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - Changed from session_type to is_practice column';
    RAISE NOTICE '   - Added coin play detection';
    RAISE NOTICE '   - Ensures practice games update challenges';
    RAISE NOTICE '   - Ensures competition games update challenges';
    RAISE NOTICE '   - Ensures coin play games update challenges';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHALLENGES UPDATED:';
    RAISE NOTICE '   - play_practice (practice games)';
    RAISE NOTICE '   - play_competition (competition games)';
    RAISE NOTICE '   - play_coin_play (coin play games - daily only)';
    RAISE NOTICE '   - games_count (all games)';
    RAISE NOTICE '   - score_threshold (competition/coin play scores)';
    RAISE NOTICE '   - play_specific_game (game type variety)';
    RAISE NOTICE '';
END $$;

SELECT '✅ Challenge Trigger Fixed - Practice Games Will Now Update Challenges!' as status;

