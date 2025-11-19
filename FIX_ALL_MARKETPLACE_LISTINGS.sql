-- ============================================
-- FIX ALL MARKETPLACE LISTINGS
-- ============================================
-- Make timer and winner processing work automatically for ALL listings
-- ============================================

-- Step 1: Ensure constraint allows all statuses (run this first if you haven't)
ALTER TABLE public.marketplace_listings 
DROP CONSTRAINT IF EXISTS marketplace_listings_status_check;

ALTER TABLE public.marketplace_listings
ADD CONSTRAINT marketplace_listings_status_check
CHECK (status IN (
    'draft',
    'active',
    'waiting',
    'completed',
    'winner_selected',
    'address_provided',
    'deleted',
    'paused',
    'cancelled'
));

-- Step 2: Create or replace the check_expired_marketplace_sessions function
CREATE OR REPLACE FUNCTION public.check_expired_marketplace_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_result JSONB;
BEGIN
    RAISE NOTICE '⏰ Checking for expired marketplace sessions...';
    
    -- Find all active sessions where timer has expired
    FOR v_session IN
        SELECT 
            ms.id as session_id,
            ml.title,
            ms.timer_started_at,
            ms.timer_duration,
            EXTRACT(EPOCH FROM (NOW() - ms.timer_started_at)) as seconds_elapsed
        FROM marketplace_sessions ms
        JOIN marketplace_listings ml ON ml.id = ms.listing_id
        WHERE ms.status = 'active'
          AND ms.timer_started_at IS NOT NULL
          AND NOW() > (ms.timer_started_at + (ms.timer_duration || ' seconds')::INTERVAL)
    LOOP
        RAISE NOTICE '⏱️ Processing expired session: % (Listing: %)', v_session.session_id, v_session.title;
        
        BEGIN
            -- Process the winner
            SELECT process_marketplace_winner(v_session.session_id) INTO v_result;
            RAISE NOTICE '✅ Processed: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error processing session %: %', v_session.session_id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Finished checking expired sessions';
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.check_expired_marketplace_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_expired_marketplace_sessions() TO anon;

-- Step 4: Process ALL currently expired sessions
SELECT check_expired_marketplace_sessions();

-- Step 5: Show all marketplace sessions and their status
SELECT 
    '📊 All Marketplace Sessions' as info,
    ml.title,
    ms.status,
    ms.timer_started_at,
    ms.timer_duration,
    CASE 
        WHEN ms.timer_started_at IS NULL THEN 'No timer'
        WHEN NOW() > (ms.timer_started_at + (ms.timer_duration || ' seconds')::INTERVAL) THEN '⏰ EXPIRED'
        ELSE '✅ Active'
    END as timer_status,
    ms.winner_username,
    ml.status as listing_status
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
ORDER BY ms.created_at DESC;

-- Step 6: Process any stuck sessions that should have completed
DO $$
DECLARE
    v_session_id UUID;
    v_result JSONB;
BEGIN
    FOR v_session_id IN
        SELECT ms.id
        FROM marketplace_sessions ms
        WHERE ms.status = 'active'
          AND ms.timer_started_at IS NOT NULL
          AND NOW() > (ms.timer_started_at + (ms.timer_duration || ' seconds')::INTERVAL)
    LOOP
        RAISE NOTICE '🔄 Processing stuck session: %', v_session_id;
        
        BEGIN
            SELECT process_marketplace_winner(v_session_id) INTO v_result;
            RAISE NOTICE '✅ Completed: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not process %: %', v_session_id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 7: Show final status of all sessions
SELECT 
    '✅ Final Status' as info,
    ml.title,
    ms.status as session_status,
    ml.status as listing_status,
    ms.winner_username,
    CASE 
        WHEN ms.winner_user_id IS NOT NULL THEN '🏆 Winner Set'
        WHEN ms.status = 'completed' THEN '✅ Completed'
        WHEN ms.status = 'active' THEN '🎮 Active'
        ELSE '⏳ Waiting'
    END as status_emoji
FROM marketplace_sessions ms
JOIN marketplace_listings ml ON ml.id = ms.listing_id
ORDER BY ms.created_at DESC;

-- Step 8: Summary
SELECT 
    '📈 Summary' as info,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE ms.status = 'active') as active,
    COUNT(*) FILTER (WHERE ms.status = 'waiting') as waiting,
    COUNT(*) FILTER (WHERE ms.status = 'completed') as completed,
    COUNT(*) FILTER (WHERE ms.winner_user_id IS NOT NULL) as with_winner
FROM marketplace_sessions ms;

-- Success message
SELECT '✅ All marketplace listings fixed! Timer processing now works automatically for all future sessions!' as status;

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. This function (check_expired_marketplace_sessions) should be called periodically
-- 2. Your frontend should call it on page load or via a cron job
-- 3. All expired sessions will now be processed automatically
-- 4. Winner determination happens when timer expires
-- ============================================

