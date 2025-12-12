-- ============================================================================
-- COMPREHENSIVE DEBUG AND FIX FOR CHALLENGE PROGRESS
-- ============================================================================
-- This will:
-- 1. Check what's actually happening
-- 2. Fix any issues found
-- 3. Test the entire flow
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK CURRENT STATE
-- ============================================================================

-- Check trigger
SELECT 
    'Trigger Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_update_challenges_on_game_history'
            AND tgrelid = 'public.game_history'::regclass
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Check recent games
SELECT 
    'Recent Games' as check_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_practice = true) as practice,
    COUNT(*) FILTER (WHERE is_practice = false) as competition,
    MAX(created_at) as last_game
FROM public.game_history
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check if challenges exist
SELECT 
    'Challenges Today' as check_type,
    COUNT(*) as total,
    STRING_AGG(challenge_type, ', ') as types
FROM public.daily_challenges
WHERE challenge_date = CURRENT_DATE
AND is_active = true;

-- ============================================================================
-- STEP 2: CREATE SIMPLE TEST FUNCTION TO UPDATE PROGRESS DIRECTLY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.force_update_challenge_progress(
    p_user_id UUID,
    p_challenge_type TEXT DEFAULT 'play_practice',
    p_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_daily_result JSONB;
    v_weekly_result JSONB;
BEGIN
    -- Update daily
    v_daily_result := public.update_daily_challenge_progress(p_user_id, p_challenge_type, p_increment);
    
    -- Update weekly
    v_weekly_result := public.update_weekly_challenge_progress(p_user_id, p_challenge_type, p_increment);
    
    RETURN jsonb_build_object(
        'success', true,
        'daily', v_daily_result,
        'weekly', v_weekly_result,
        'message', 'Progress updated'
    );
END;
$$;

-- ============================================================================
-- STEP 3: ENSURE get_daily_challenges RETURNS CORRECT DATA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_daily_challenges(p_user_id UUID)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name TEXT,
    challenge_description TEXT,
    challenge_type TEXT,
    target_value INTEGER,
    progress INTEGER,
    xp_reward INTEGER,
    reward_points INTEGER,
    is_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Ensure challenges exist
    PERFORM public.generate_daily_challenges();
    
    -- Return challenges with user progress
    RETURN QUERY
    SELECT 
        dc.id,
        dc.challenge_name,
        dc.challenge_description,
        dc.challenge_type,
        dc.target_value,
        COALESCE(udc.progress, 0)::INTEGER as progress,  -- CRITICAL: Cast to INTEGER
        dc.xp_reward,
        dc.reward_points,
        COALESCE(udc.is_completed, false)::BOOLEAN as is_completed  -- CRITICAL: Cast to BOOLEAN
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.is_active = true
    ORDER BY dc.challenge_type;
END;
$$;

-- ============================================================================
-- STEP 4: ENSURE get_weekly_challenges RETURNS CORRECT DATA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_weekly_challenges(p_user_id UUID)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name TEXT,
    challenge_description TEXT,
    challenge_type TEXT,
    target_value INTEGER,
    progress INTEGER,
    xp_reward INTEGER,
    reward_points INTEGER,
    is_completed BOOLEAN,
    week_start_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
BEGIN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    
    -- Ensure challenges exist
    PERFORM public.generate_weekly_challenges(v_week_start);
    
    -- Return challenges with user progress
    RETURN QUERY
    SELECT 
        wc.id,
        wc.challenge_name,
        wc.challenge_description,
        wc.challenge_type,
        wc.target_value,
        COALESCE(uwc.progress, 0)::INTEGER as progress,  -- CRITICAL: Cast to INTEGER
        wc.xp_reward,
        wc.reward_points,
        COALESCE(uwc.is_completed, false)::BOOLEAN as is_completed,  -- CRITICAL: Cast to BOOLEAN
        wc.week_start_date
    FROM public.weekly_challenges wc
    LEFT JOIN public.user_weekly_challenges uwc ON wc.id = uwc.challenge_id AND uwc.user_id = p_user_id
    WHERE wc.week_start_date = v_week_start
    AND wc.is_active = true
    ORDER BY wc.challenge_type;
END;
$$;

-- ============================================================================
-- STEP 5: VERIFY TRIGGER FUNCTION IS CORRECT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_update_challenges_on_game_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_practice BOOLEAN;
    v_is_coin_play BOOLEAN := false;
    v_tournament_type TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- CRITICAL: Get is_practice directly from NEW record
        v_is_practice := COALESCE(NEW.is_practice, false);
        
        -- Get tournament type
        IF NEW.metadata IS NOT NULL THEN
            v_tournament_type := NEW.metadata->>'tournament_type';
        END IF;
        
        -- Detect coin play
        IF NEW.metadata IS NOT NULL AND (NEW.metadata->>'is_coin_play')::BOOLEAN = true THEN
            v_is_coin_play := true;
        ELSIF NEW.listing_id IS NOT NULL AND NEW.listing_id::TEXT LIKE 'cp-%' THEN
            v_is_coin_play := true;
        END IF;
        
        -- Award XP
        BEGIN
            IF v_is_practice THEN
                PERFORM public.award_practice_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
            ELSE
                PERFORM public.award_competition_game_xp(NEW.user_id, NEW.id, COALESCE(NEW.score, 0)::INTEGER);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error awarding XP: %', SQLERRM;
        END;
        
        -- CRITICAL: Update challenges
        BEGIN
            PERFORM public.update_challenges_on_game_complete(
                NEW.user_id,
                COALESCE(NEW.game_type, 'unknown'),
                COALESCE(NEW.score, 0)::INTEGER,
                v_is_practice,
                v_is_coin_play,
                v_tournament_type
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error updating challenges: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_challenges_on_game_history'
        AND tgrelid = 'public.game_history'::regclass
    ) THEN
        CREATE TRIGGER trigger_update_challenges_on_game_history
        AFTER INSERT ON public.game_history
        FOR EACH ROW
        EXECUTE FUNCTION public.trigger_update_challenges_on_game_history();
    END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ COMPREHENSIVE FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - get_daily_challenges casts progress to INTEGER';
    RAISE NOTICE '   - get_weekly_challenges casts progress to INTEGER';
    RAISE NOTICE '   - Trigger function updated with error handling';
    RAISE NOTICE '   - Test function created: force_update_challenge_progress';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TO TEST:';
    RAISE NOTICE '   SELECT public.force_update_challenge_progress(''USER_ID'', ''play_practice'', 1);';
    RAISE NOTICE '';
END $$;

SELECT '✅ Comprehensive fix applied! Check results above and test with force_update_challenge_progress.' as status;

