-- ============================================================================
-- FIX WINNER TAKES ALL SESSION NOT FOUND
-- ============================================================================
-- This ensures sessions always exist for all Winner Takes All configs
-- ============================================================================

-- ============================================================================
-- STEP 1: Check Current State
-- ============================================================================

DO $$
DECLARE
  config_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM winner_takes_all_configs;
  SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 Current State:';
  RAISE NOTICE '   Configs: %', config_count;
  RAISE NOTICE '   Sessions: %', session_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- STEP 2: Ensure All Configs Have Sessions
-- ============================================================================

-- Create sessions for any configs that don't have one
INSERT INTO winner_takes_all_sessions (
  config_id,
  current_pot,
  base_price,
  participants_count,
  status,
  timer_duration,
  created_at,
  updated_at
)
SELECT 
  c.id,
  0 as current_pot,
  c.base_price,
  0 as participants_count,
  'waiting' as status,
  1800 as timer_duration, -- 30 minutes
  NOW() as created_at,
  NOW() as updated_at
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM winner_takes_all_sessions s 
  WHERE s.config_id = c.id
);

-- ============================================================================
-- STEP 3: Update conditional_wta_reset to NOT Delete Sessions
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
        
        -- Delete participants (but keep the session)
        DELETE FROM public.winner_takes_all_participants 
        WHERE session_id = session_record.id;
        
        -- Reset the session (DON'T DELETE IT, just reset values)
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
-- STEP 4: Update get_all_winner_takes_all_sessions to Auto-Create Missing Sessions
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
    -- First, ensure all configs have sessions
    INSERT INTO winner_takes_all_sessions (
        config_id,
        current_pot,
        base_price,
        participants_count,
        status,
        timer_duration,
        created_at,
        updated_at
    )
    SELECT 
        c.id,
        0,
        c.base_price,
        0,
        'waiting',
        1800, -- 30 minutes
        NOW(),
        NOW()
    FROM winner_takes_all_configs c
    WHERE NOT EXISTS (
        SELECT 1 FROM winner_takes_all_sessions s 
        WHERE s.config_id = c.id
    )
    ON CONFLICT DO NOTHING;

    -- Then return all sessions
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
-- STEP 5: Verify All Sessions Exist Now
-- ============================================================================

DO $$
DECLARE
  config_count INTEGER;
  session_count INTEGER;
  missing_sessions INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM winner_takes_all_configs;
  SELECT COUNT(*) INTO session_count FROM winner_takes_all_sessions;
  missing_sessions := config_count - session_count;
  
  IF missing_sessions <= 0 THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ All Winner Takes All Sessions Verified!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 Configs: %', config_count;
    RAISE NOTICE '📊 Sessions: %', session_count;
    RAISE NOTICE '✅ All configs have sessions!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Functions Updated:';
    RAISE NOTICE '   ✓ conditional_wta_reset() - Never deletes sessions';
    RAISE NOTICE '   ✓ get_all_winner_takes_all_sessions() - Auto-creates missing sessions';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 What This Fixes:';
    RAISE NOTICE '   1. "Session not found" errors eliminated';
    RAISE NOTICE '   2. Sessions always exist for all configs';
    RAISE NOTICE '   3. Resets clear data but keep the session';
    RAISE NOTICE '   4. Auto-recovery if sessions get deleted';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
  ELSE
    RAISE EXCEPTION 'Missing % sessions! Something is wrong.', missing_sessions;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Show All Sessions
-- ============================================================================

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
FROM winner_takes_all_sessions
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

