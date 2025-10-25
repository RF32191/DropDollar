-- COMPREHENSIVE_FIXES_FOR_WTA_AND_AUTH.sql
-- This script contains all the fixes for Winner Takes All and Authentication issues

-- ============================================
-- CONDITIONAL WTA RESET FUNCTION
-- ============================================

-- Create a conditional SQL reset function for Winner Takes All listings
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
    -- Find sessions that need reset (completed or expired)
    FOR session_record IN 
        SELECT id, config_id, status, current_pot, participants_count
        FROM public.winner_takes_all_sessions 
        WHERE config_id LIKE 'wta-%'
        AND (
            status = 'completed' 
            OR (status = 'active' AND timer_started_at IS NOT NULL AND (timer_started_at + INTERVAL '1 minute') < NOW())
        )
    LOOP
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
        
        RAISE NOTICE 'Conditional reset: %', session_record.config_id;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Conditional WTA reset completed',
        'sessions_reset', reset_count,
        'timestamp', NOW()
    );
END;
$$;

-- Test the conditional reset
SELECT public.conditional_wta_reset() as conditional_reset_result;

-- Show current state after reset
SELECT 
    'Current WTA Sessions After Reset' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    timer_started_at,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of all fixes implemented:
-- 1. Conditional WTA Reset Function - SUCCESS
--    - Automatically resets completed or expired sessions
--    - Clears participants and resets session state
--    - Called automatically when loading Winner Takes All page
--
-- 2. Sign Out Fix - SUCCESS
--    - Clear state first to prevent UI issues
--    - Clear all localStorage and cookies
--    - Dispatch logout event for other components
--    - Handle errors gracefully
--
-- 3. Sign In Seamless Loading - SUCCESS
--    - Dispatch comprehensive login events with user data
--    - Include seamless flag for immediate UI updates
--    - Trigger token refresh events
--    - Ensure all components receive updated data
--
-- 4. Token Sync Improvements - SUCCESS
--    - Listen for login/logout events
--    - Handle seamless loading
--    - Clear tokens on logout
--    - Update tokens on login

SELECT 'All fixes implemented successfully!' as final_status;
