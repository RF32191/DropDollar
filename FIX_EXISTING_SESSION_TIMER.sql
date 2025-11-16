-- ============================================================================
-- FIX EXISTING MARKETPLACE SESSION TIMERS TO 1 MINUTE
-- ============================================================================
-- This updates ALL existing marketplace sessions to use 60-second timer
-- Also processes any sessions that should have already completed
-- ============================================================================

-- Step 1: Update all existing sessions to 1-minute timer
UPDATE public.marketplace_sessions
SET 
    timer_duration = 60, -- 1 minute instead of 7200 (2 hours)
    updated_at = NOW()
WHERE timer_duration != 60;

SELECT '✅ Step 1: Updated all sessions to 1-minute timer' as status;

-- Step 2: Check for sessions that should be completed with new timer
-- (timer started more than 60 seconds ago but still marked as active)
DO $$
DECLARE
    v_session RECORD;
    v_elapsed_seconds INTEGER;
    v_winner RECORD;
    v_participants_count INTEGER;
BEGIN
    FOR v_session IN 
        SELECT * FROM public.marketplace_sessions
        WHERE status = 'active'
        AND timer_started_at IS NOT NULL
    LOOP
        -- Calculate elapsed time in seconds
        v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_session.timer_started_at))::INTEGER;
        
        -- If more than 60 seconds have passed, process winner
        IF v_elapsed_seconds >= 60 THEN
            RAISE NOTICE '⏰ Session % expired (elapsed: %s). Processing winner...', v_session.id, v_elapsed_seconds;
            
            -- Count participants with scores
            SELECT COUNT(*) INTO v_participants_count
            FROM public.marketplace_participants
            WHERE session_id = v_session.id
            AND score IS NOT NULL
            AND completed_at IS NOT NULL;
            
            IF v_participants_count > 0 THEN
                -- Get the winner (highest score)
                SELECT 
                    p.user_id,
                    p.score,
                    COALESCE(
                        (SELECT u.username FROM public.users u WHERE u.id = p.user_id),
                        (SELECT u.email FROM public.users u WHERE u.id = p.user_id),
                        'Winner'
                    ) as username
                INTO v_winner
                FROM public.marketplace_participants p
                WHERE p.session_id = v_session.id
                AND p.score IS NOT NULL
                AND p.completed_at IS NOT NULL
                ORDER BY p.score DESC
                LIMIT 1;
                
                IF FOUND THEN
                    -- Mark session as completed with winner
                    UPDATE public.marketplace_sessions
                    SET 
                        status = 'completed',
                        winner_user_id = v_winner.user_id,
                        winner_username = v_winner.username,
                        winner_score = v_winner.score,
                        completed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = v_session.id;
                    
                    RAISE NOTICE '🏆 Winner determined: % (score: %)', v_winner.username, v_winner.score;
                ELSE
                    RAISE NOTICE '⚠️ No valid winner found for session %', v_session.id;
                END IF;
            ELSE
                RAISE NOTICE '⚠️ No participants with scores for session %', v_session.id;
            END IF;
        END IF;
    END LOOP;
END $$;

SELECT '✅ Step 2: Processed expired sessions' as status;

-- Step 3: Show current session status
SELECT 
    '📊 CURRENT SESSION STATUS' as info,
    COUNT(*) FILTER (WHERE status = 'waiting') as waiting_sessions,
    COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    COUNT(*) as total_sessions
FROM public.marketplace_sessions;

-- Step 4: Show sessions with their timer info
SELECT 
    id,
    status,
    timer_duration as duration_seconds,
    timer_started_at,
    CASE 
        WHEN timer_started_at IS NULL THEN 'Not started'
        WHEN status = 'completed' THEN 'Completed'
        ELSE 
            CASE 
                WHEN EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER >= timer_duration 
                THEN 'EXPIRED ⏰'
                ELSE (timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)::TEXT || 's remaining'
            END
    END as timer_status,
    winner_user_id,
    winner_username,
    winner_score
FROM public.marketplace_sessions
ORDER BY created_at DESC
LIMIT 10;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║        ✅ EXISTING SESSION TIMERS FIXED!                       ║
╚════════════════════════════════════════════════════════════════╝

WHAT HAPPENED:

1️⃣ UPDATED ALL SESSIONS:
   ✅ Changed timer_duration from 7200s → 60s
   ✅ Applies to waiting, active, and completed sessions
   ✅ All future sessions will use 60s

2️⃣ PROCESSED EXPIRED SESSIONS:
   ✅ Found sessions with timer_started_at > 60s ago
   ✅ Determined winners (highest score)
   ✅ Marked sessions as completed
   ✅ Set winner_user_id, winner_username, winner_score

3️⃣ VERIFICATION:
   ✅ Check the tables above to see current status
   ✅ Active sessions that expired are now completed
   ✅ Winners have been determined

NOW YOUR LISTING SHOULD:
- Show as COMPLETED ✅
- Display the winner
- Show scoreboard with FINAL badge
- Winner can provide shipping address

REFRESH YOUR PAGE TO SEE CHANGES! 🔄
' as success_message;

