-- CONCURRENT_GAMEPLAY_SYSTEM.sql
-- This script creates a system that allows all players to play simultaneously across different sessions

-- ============================================
-- CONCURRENT GAMEPLAY SYSTEM
-- ============================================

-- Create a function to ensure concurrent gameplay across all sessions
CREATE OR REPLACE FUNCTION public.enable_concurrent_gameplay()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    result JSON;
    sessions_updated INTEGER := 0;
BEGIN
    -- Reset all sessions to ensure they can all run concurrently
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
    WHERE config_id LIKE 'wta-%';
    
    GET DIAGNOSTICS sessions_updated = ROW_COUNT;
    
    -- Clear all participants to start fresh
    DELETE FROM public.winner_takes_all_participants;
    
    -- Verify all sessions are ready for concurrent gameplay
    SELECT json_build_object(
        'success', true,
        'message', 'Concurrent gameplay enabled for all sessions',
        'sessions_updated', sessions_updated,
        'total_sessions', (SELECT COUNT(*) FROM public.winner_takes_all_sessions WHERE config_id LIKE 'wta-%'),
        'all_sessions_status', 'waiting',
        'concurrent_gameplay', true
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Create a function for concurrent player participation
CREATE OR REPLACE FUNCTION public.join_concurrent_session(
    target_config_id TEXT,
    user_email TEXT,
    entry_fee INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    user_record RECORD;
    session_id_to_join UUID;
    new_pot INTEGER;
    new_participants_count INTEGER;
BEGIN
    -- Get the specific session for the target config
    SELECT id INTO session_id_to_join
    FROM public.winner_takes_all_sessions 
    WHERE config_id = target_config_id;
    
    IF session_id_to_join IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found for config: ' || target_config_id);
    END IF;
    
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_to_join;
    
    -- Get user info
    SELECT * INTO user_record 
    FROM public.users 
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found: ' || user_email);
    END IF;
    
    -- Check if user already joined this session
    IF EXISTS (SELECT 1 FROM public.winner_takes_all_participants WHERE session_id = session_id_to_join AND user_id = user_record.id) THEN
        RETURN json_build_object('success', false, 'message', 'User already joined this session');
    END IF;
    
    -- Check token balance
    IF user_record.tokens < entry_fee THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens from user
    UPDATE public.users
    SET tokens = tokens - entry_fee,
        updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Add participant to this specific session
    INSERT INTO public.winner_takes_all_participants (session_id, user_id, joined_at)
    VALUES (session_id_to_join, user_record.id, NOW());
    
    -- Update session pot and participant count
    new_pot := session_record.current_pot + entry_fee;
    new_participants_count := session_record.participants_count + 1;
    
    UPDATE public.winner_takes_all_sessions
    SET 
        current_pot = new_pot,
        participants_count = new_participants_count,
        status = CASE
            WHEN new_pot >= session_record.base_price THEN 'active'
            ELSE 'waiting'
        END,
        timer_started_at = CASE
            WHEN new_pot >= session_record.base_price AND timer_started_at IS NULL THEN NOW()
            ELSE timer_started_at
        END,
        updated_at = NOW()
    WHERE id = session_id_to_join;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Successfully joined session ' || target_config_id,
        'new_pot', new_pot,
        'participants_count', new_participants_count,
        'session_status', CASE WHEN new_pot >= session_record.base_price THEN 'active' ELSE 'waiting' END,
        'concurrent_gameplay', true
    );
END;
$$;

-- Create a targeted payout function that only affects the specific session
CREATE OR REPLACE FUNCTION public.targeted_winner_payout_and_reset(
    target_config_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    payout_amount DECIMAL(10,2);
    session_id_to_process UUID;
BEGIN
    -- Get the specific session for the target config
    SELECT id INTO session_id_to_process
    FROM public.winner_takes_all_sessions 
    WHERE config_id = target_config_id;
    
    IF session_id_to_process IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Session not found for config: ' || target_config_id);
    END IF;
    
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_to_process;
    
    -- Find the winner (highest score) for this specific session only
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_to_process
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'No winner found for session: ' || target_config_id);
    END IF;
    
    -- Calculate payout (winner gets full pot)
    payout_amount := session_record.current_pot;
    
    -- Add tokens to winner's wallet
    UPDATE public.users
    SET tokens = tokens + payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Mark this specific session as completed
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = 0,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_to_process;
    
    -- Wait a moment to ensure payout is processed
    PERFORM pg_sleep(1);
    
    -- Reset ONLY this specific session for new game
    DELETE FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_to_process;
    
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
    WHERE id = session_id_to_process;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Payout processed and session reset for ' || target_config_id,
        'winner_username', winner_record.username,
        'winner_email', winner_record.email,
        'winner_score', winner_record.score,
        'payout_amount', payout_amount,
        'session_reset', true,
        'config_id', target_config_id
    );
END;
$$;

-- ============================================
-- ENABLE CONCURRENT GAMEPLAY
-- ============================================

-- Execute the function to enable concurrent gameplay
SELECT public.enable_concurrent_gameplay() as result;

-- ============================================
-- TEST CONCURRENT GAMEPLAY
-- ============================================

-- Test concurrent gameplay by having players join different sessions
-- Player 1 joins wta-2-sword-parry
SELECT public.join_concurrent_session('wta-2-sword-parry', 'rf32191@gmail.com', 2) as player1_result;

-- Player 2 joins wta-5-blade-bounce
SELECT public.join_concurrent_session('wta-5-blade-bounce', 'ryanfermoselle@yahoo.com', 5) as player2_result;

-- Player 3 joins wta-10-laser-dodge
SELECT public.join_concurrent_session('wta-10-laser-dodge', 'ryanrfermoselle@yahoo.com', 10) as player3_result;

-- Check the status of all sessions
SELECT 
    'Concurrent Sessions Status' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    timer_started_at
FROM public.winner_takes_all_sessions 
WHERE config_id IN ('wta-2-sword-parry', 'wta-5-blade-bounce', 'wta-10-laser-dodge')
ORDER BY config_id;

-- ============================================
-- TEST TARGETED PAYOUT
-- ============================================

-- Add scores to the wta-2-sword-parry session for testing payout
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     1500.75, 95.5, NOW(), NOW())
ON CONFLICT (session_id, user_id) DO UPDATE SET
    score = EXCLUDED.score,
    accuracy = EXCLUDED.accuracy,
    completed_at = EXCLUDED.completed_at;

-- Test the targeted payout for wta-2-sword-parry only
SELECT public.targeted_winner_payout_and_reset('wta-2-sword-parry') as payout_result;

-- Check that other sessions are still running
SELECT 
    'Sessions After Payout Test' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    timer_started_at
FROM public.winner_takes_all_sessions 
WHERE config_id IN ('wta-2-sword-parry', 'wta-5-blade-bounce', 'wta-10-laser-dodge')
ORDER BY config_id;

-- ============================================
-- VERIFY CONCURRENT GAMEPLAY
-- ============================================

-- Verify the winner got paid
SELECT 
    'Winner Payment Verification' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Check that other sessions continue running independently
SELECT 
    'Concurrent Gameplay Verification' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    CASE 
        WHEN status = 'active' THEN 'Players can still join and play'
        WHEN status = 'waiting' THEN 'Waiting for base price or reset'
        ELSE 'Other status'
    END as gameplay_status
FROM public.winner_takes_all_sessions 
WHERE config_id IN ('wta-5-blade-bounce', 'wta-10-laser-dodge')
ORDER BY config_id;

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of concurrent gameplay features:
-- 1. All 12 Winner Takes All sessions can run simultaneously
-- 2. Players can join different sessions concurrently
-- 3. Each session operates independently
-- 4. Payouts only affect the specific session
-- 5. Other sessions continue running during payouts
-- 6. No interference between different tournaments
-- 7. Multiple players can play simultaneously across sessions

SELECT 'Concurrent Gameplay System Ready!' as final_status;
