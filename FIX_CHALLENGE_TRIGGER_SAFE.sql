-- ============================================================================
-- SAFE CHALLENGE TRIGGER FIX (NO DEADLOCKS)
-- ============================================================================
-- Updates trigger without dropping/recreating to avoid deadlocks
-- Uses CREATE OR REPLACE instead of DROP + CREATE
-- ============================================================================

-- ============================================================================
-- 1. UPDATE TRIGGER FUNCTION (CREATE OR REPLACE - NO DROP NEEDED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_coin_play BOOLEAN;
    v_is_practice BOOLEAN;
    v_error_message TEXT;
BEGIN
    -- Only process if this is a new game record
    IF TG_OP = 'INSERT' THEN
        BEGIN
            -- Determine if it's practice (use is_practice column)
            v_is_practice := COALESCE(NEW.is_practice, false);
            
            -- Detect coin play games
            v_is_coin_play := false;
            
            -- Method 1: Check metadata for coin_play flag (most reliable)
            IF NEW.metadata IS NOT NULL THEN
                BEGIN
                    IF (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
                        v_is_coin_play := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- If metadata parsing fails, continue
                    NULL;
                END;
            END IF;
            
            -- Method 2: Check if listing_id matches coin play pattern (starts with 'cp-')
            IF NOT v_is_coin_play AND NEW.listing_id IS NOT NULL THEN
                BEGIN
                    IF NEW.listing_id::TEXT LIKE 'cp-%' THEN
                        v_is_coin_play := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
            
            -- Method 3: Check if user has a recent coin_play_participants record (within last 5 minutes)
            IF NOT v_is_coin_play THEN
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 FROM public.coin_play_participants cp
                        JOIN public.coin_play_sessions cs ON cp.session_id = cs.id
                        WHERE cp.user_id = NEW.user_id
                        AND cp.completed_at IS NOT NULL
                        AND cp.completed_at > NOW() - INTERVAL '5 minutes'
                        AND cs.game_type = NEW.game_type
                    ) INTO v_is_coin_play;
                EXCEPTION WHEN OTHERS THEN
                    -- If coin_play tables don't exist, continue
                    NULL;
                END;
            END IF;
            
            -- Update challenges based on game completion
            -- Use the updated function signature that includes coin play detection
            PERFORM public.update_challenges_on_game_complete(
                NEW.user_id,
                COALESCE(NEW.game_type, 'unknown'),
                COALESCE(NEW.score, 0)::INTEGER,
                v_is_practice,
                v_is_coin_play
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the insert
            v_error_message := SQLERRM;
            RAISE WARNING 'Error updating challenges for game_history id %: %', NEW.id, v_error_message;
            -- Continue - don't fail the game_history insert
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. ENSURE TRIGGER EXISTS (ONLY CREATE IF IT DOESN'T EXIST)
-- ============================================================================

-- Check if trigger exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) THEN
        -- Trigger doesn't exist, create it
        CREATE TRIGGER trigger_update_challenges_on_game_history
        AFTER INSERT ON public.game_history
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
        
        RAISE NOTICE '✅ Trigger created';
    ELSE
        RAISE NOTICE '✅ Trigger already exists - function updated';
    END IF;
END $$;

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.trigger_update_challenges_on_game_history() TO authenticated, service_role, anon;

-- ============================================================================
-- 4. VERIFY TRIGGER IS ACTIVE
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
        AND tgenabled = 'O' -- 'O' means enabled
    ) INTO v_trigger_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'trigger_update_challenges_on_game_history'
    ) INTO v_function_exists;
    
    IF v_trigger_exists AND v_function_exists THEN
        RAISE NOTICE '✅ Trigger and function exist and are active';
    ELSE
        RAISE NOTICE '⚠️ Trigger exists: %, Function exists: %', v_trigger_exists, v_function_exists;
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SAFE CHALLENGE TRIGGER FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 WHAT WAS UPDATED:';
    RAISE NOTICE '   - Trigger function uses is_practice column';
    RAISE NOTICE '   - Added error handling to prevent trigger failures';
    RAISE NOTICE '   - Added coin play detection';
    RAISE NOTICE '   - Used CREATE OR REPLACE (no DROP needed)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHALLENGES TRACKED:';
    RAISE NOTICE '   - play_practice (practice games)';
    RAISE NOTICE '   - play_competition (competition games)';
    RAISE NOTICE '   - play_coin_play (coin play games - daily only)';
    RAISE NOTICE '   - games_count (all games)';
    RAISE NOTICE '   - score_threshold (competition/coin play scores)';
    RAISE NOTICE '   - play_specific_game (game type variety)';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 NEXT STEPS:';
    RAISE NOTICE '   1. Play a practice game';
    RAISE NOTICE '   2. Check dashboard - progress bars should update within 5 seconds';
    RAISE NOTICE '';
END $$;

SELECT '✅ Safe Challenge Trigger Fix Complete! No deadlocks - trigger function updated.' as status;

