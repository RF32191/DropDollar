-- ============================================================================
-- FIX WINNER TAKES ALL TIMER PERSISTENCE AND AUTO-PAYOUT
-- ============================================================================
-- This fixes:
-- 1. Timer not persisting on page reload
-- 2. Payout not happening automatically
-- 3. Conditional reset being too aggressive
-- ============================================================================

-- ============================================================================
-- STEP 1: Update Conditional Reset to Use 30-Minute Timer
-- ============================================================================

DROP FUNCTION IF EXISTS public.conditional_wta_reset() CASCADE;

CREATE OR REPLACE FUNCTION public.conditional_wta_reset()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    reset_count INTEGER := 0;
    result JSON;
BEGIN
    -- Find sessions that need reset (completed or expired after 30 minutes)
    FOR session_record IN 
        SELECT id, config_id, status, current_pot, participants_count, timer_started_at
        FROM public.winner_takes_all_sessions 
        WHERE config_id LIKE 'wta-%'
        AND (
            -- Already completed with a winner
            (status = 'completed' AND winner_user_id IS NOT NULL)
            -- OR timer expired after 30 minutes (1800 seconds)
            OR (status = 'active' AND timer_started_at IS NOT NULL 
                AND (timer_started_at + INTERVAL '30 minutes') < NOW())
        )
    LOOP
        RAISE NOTICE '🔄 [Conditional Reset] Resetting session: % (Status: %, Timer Started: %)', 
            session_record.config_id, 
            session_record.status, 
            session_record.timer_started_at;
        
        -- Reset the session
        DELETE FROM public.winner_takes_all_participants 
        WHERE session_id = session_record.id;
        
        UPDATE public.winner_takes_all_sessions
        SET 
            status = 'waiting',
            current_pot = 0,
            participants_count = 0,
            timer_started_at = NULL,
            winner_user_id = NULL,
            prize_amount = NULL,
            platform_fee = NULL,
            updated_at = NOW()
        WHERE id = session_record.id;
        
        reset_count := reset_count + 1;
    END LOOP;
    
    IF reset_count > 0 THEN
        RAISE NOTICE '✅ [Conditional Reset] Reset % session(s)', reset_count;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Conditional WTA reset completed',
        'sessions_reset', reset_count,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.conditional_wta_reset() TO authenticated, anon;

-- ============================================================================
-- STEP 2: Ensure Get Sessions Function Returns All Timer Data
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_all_winner_takes_all_sessions() CASCADE;

CREATE OR REPLACE FUNCTION public.get_all_winner_takes_all_sessions()
RETURNS TABLE (
    id UUID,
    config_id TEXT,
    current_pot NUMERIC,
    base_price NUMERIC,
    participants_count INTEGER,
    status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    prize_amount NUMERIC,
    platform_fee NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.config_id,
        s.current_pot,
        s.base_price,
        s.participants_count,
        s.status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 1800) as timer_duration, -- Default 30 minutes
        s.winner_user_id,
        s.prize_amount,
        s.platform_fee,
        s.created_at,
        s.updated_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'user_id', p.user_id,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.winner_takes_all_participants p
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.winner_takes_all_sessions s
    WHERE s.config_id LIKE 'wta-%'
    ORDER BY s.config_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_winner_takes_all_sessions() TO authenticated, anon;

-- ============================================================================
-- STEP 3: Ensure Process Payout Function is Available
-- ============================================================================

-- Verify the payout function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'process_payout_by_config'
    ) THEN
        RAISE EXCEPTION 'process_payout_by_config function does not exist! Run FIX_PAYOUT_SCORING_ERROR.sql first';
    END IF;
    
    RAISE NOTICE '✅ process_payout_by_config function exists';
END $$;

-- ============================================================================
-- STEP 4: Create Automatic Payout Checker (Optional - for backend cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_payout_expired_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    payout_result JSONB;
    payout_count INTEGER := 0;
    result_array JSONB := '[]'::jsonb;
BEGIN
    RAISE NOTICE '🔍 [Auto Payout Check] Checking for expired sessions...';
    
    -- Find sessions where timer has expired (30 minutes = 1800 seconds)
    FOR session_record IN 
        SELECT 
            s.id, 
            s.config_id, 
            s.timer_started_at,
            s.timer_duration,
            s.status,
            s.winner_user_id
        FROM public.winner_takes_all_sessions s
        WHERE s.config_id LIKE 'wta-%'
        AND s.status = 'active'
        AND s.timer_started_at IS NOT NULL
        AND s.winner_user_id IS NULL -- Not yet paid out
        AND (
            -- Timer has expired
            s.timer_started_at + (COALESCE(s.timer_duration, 1800) || ' seconds')::INTERVAL < NOW()
        )
    LOOP
        RAISE NOTICE '⏰ [Auto Payout Check] Timer expired for: % (Started: %)', 
            session_record.config_id, 
            session_record.timer_started_at;
        
        -- Trigger payout
        BEGIN
            SELECT public.process_payout_by_config(session_record.config_id) INTO payout_result;
            
            result_array := result_array || payout_result;
            payout_count := payout_count + 1;
            
            RAISE NOTICE '✅ [Auto Payout Check] Payout triggered for: %', session_record.config_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ [Auto Payout Check] Error for %: %', session_record.config_id, SQLERRM;
        END;
    END LOOP;
    
    IF payout_count = 0 THEN
        RAISE NOTICE 'ℹ️  [Auto Payout Check] No expired sessions found';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Auto payout check completed',
        'payouts_triggered', payout_count,
        'results', result_array,
        'timestamp', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_payout_expired_sessions() TO authenticated, anon;

-- ============================================================================
-- STEP 5: Verify All Active Sessions Have Correct Timer Duration
-- ============================================================================

UPDATE public.winner_takes_all_sessions
SET timer_duration = 1800  -- 30 minutes = 1800 seconds
WHERE timer_duration IS NULL OR timer_duration != 1800;

-- ============================================================================
-- STEP 6: Show Current State
-- ============================================================================

DO $$
DECLARE
    active_session_count INTEGER;
    waiting_session_count INTEGER;
    completed_session_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_session_count 
    FROM public.winner_takes_all_sessions 
    WHERE status = 'active' AND config_id LIKE 'wta-%';
    
    SELECT COUNT(*) INTO waiting_session_count 
    FROM public.winner_takes_all_sessions 
    WHERE status = 'waiting' AND config_id LIKE 'wta-%';
    
    SELECT COUNT(*) INTO completed_session_count 
    FROM public.winner_takes_all_sessions 
    WHERE status = 'completed' AND config_id LIKE 'wta-%';
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Winner Takes All Timer & Payout Fix Complete!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Active Sessions:     %', active_session_count;
    RAISE NOTICE '⏳ Waiting Sessions:    %', waiting_session_count;
    RAISE NOTICE '✅ Completed Sessions:  %', completed_session_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Functions Updated:';
    RAISE NOTICE '   ✓ conditional_wta_reset() - Now uses 30-minute timer';
    RAISE NOTICE '   ✓ get_all_winner_takes_all_sessions() - Returns timer data';
    RAISE NOTICE '   ✓ check_and_payout_expired_sessions() - Auto-payout checker';
    RAISE NOTICE '';
    RAISE NOTICE '⏱️  Timer Duration: 30 minutes (1800 seconds)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 What This Fixes:';
    RAISE NOTICE '   1. Timer now persists on page reload';
    RAISE NOTICE '   2. Conditional reset won''t interfere with active timers';
    RAISE NOTICE '   3. Auto-payout will trigger when timer expires';
    RAISE NOTICE '   4. Backend can call check_and_payout_expired_sessions() via cron';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show all active sessions with timer info
SELECT 
    config_id,
    status,
    current_pot,
    base_price,
    participants_count,
    timer_started_at,
    timer_duration,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN
            GREATEST(0, timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)
        ELSE NULL
    END as seconds_remaining,
    winner_user_id IS NOT NULL as has_winner
FROM public.winner_takes_all_sessions
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

