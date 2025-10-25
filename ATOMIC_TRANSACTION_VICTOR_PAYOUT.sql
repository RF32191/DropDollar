-- ATOMIC_TRANSACTION_VICTOR_PAYOUT.sql
-- This script implements an atomic transaction payout system based on gaming platform best practices

-- ============================================
-- ATOMIC TRANSACTION VICTOR PAYOUT SYSTEM
-- ============================================

-- Create a robust atomic transaction payout system
CREATE OR REPLACE FUNCTION public.atomic_victor_payout(
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
    winner_tokens_before INTEGER;
    winner_tokens_after INTEGER;
    transaction_success BOOLEAN := FALSE;
BEGIN
    -- Start atomic transaction
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
        SELECT p.*, u.username, u.email, u.tokens
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
        winner_tokens_before := winner_record.tokens;
        
        -- Ensure payout amount is valid
        IF payout_amount <= 0 THEN
            RETURN json_build_object('success', false, 'message', 'Invalid pot amount: ' || payout_amount);
        END IF;
        
        -- ATOMIC UPDATE: Add tokens to winner's wallet
        UPDATE public.users
        SET tokens = tokens + payout_amount,
            updated_at = NOW()
        WHERE id = winner_record.user_id;
        
        -- Verify the update was successful
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update winner tokens';
        END IF;
        
        -- Get updated token balance
        SELECT tokens INTO winner_tokens_after
        FROM public.users
        WHERE id = winner_record.user_id;
        
        -- Verify tokens were actually added
        IF winner_tokens_after != (winner_tokens_before + payout_amount) THEN
            RAISE EXCEPTION 'Token update verification failed';
        END IF;
        
        -- Mark this specific session as completed
        UPDATE public.winner_takes_all_sessions
        SET 
            winner_user_id = winner_record.user_id,
            prize_amount = payout_amount,
            platform_fee = 0,
            status = 'completed',
            updated_at = NOW()
        WHERE id = session_id_to_process;
        
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
        
        transaction_success := TRUE;
        
        RETURN json_build_object(
            'success', true,
            'message', 'ATOMIC PAYOUT SUCCESS! Winner paid and session reset',
            'winner_username', winner_record.username,
            'winner_email', winner_record.email,
            'winner_score', winner_record.score,
            'pot_amount', payout_amount,
            'tokens_before', winner_tokens_before,
            'tokens_after', winner_tokens_after,
            'tokens_added', payout_amount,
            'transaction_success', transaction_success,
            'session_reset', true,
            'config_id', target_config_id
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction on any error
            RETURN json_build_object(
                'success', false,
                'message', 'Transaction failed: ' || SQLERRM,
                'error_code', SQLSTATE,
                'transaction_rolled_back', true
            );
    END;
END;
$$;

-- ============================================
-- TEST THE ATOMIC TRANSACTION PAYOUT SYSTEM
-- ============================================

-- Reset everything first
DELETE FROM public.winner_takes_all_participants;

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

-- Create test scenario
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     6000.50, 95.5, NOW(), NOW());

-- Update session to have a pot
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 15,
    participants_count = 1,
    status = 'active',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Show before atomic payout
SELECT 
    'Before Atomic Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Show winner's tokens before payout
SELECT 
    'Winner Tokens Before Atomic Payout' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Execute the atomic payout
SELECT public.atomic_victor_payout('wta-2-sword-parry') as atomic_payout_result;

-- ============================================
-- VERIFY THE ATOMIC PAYOUT WORKED
-- ============================================

-- Verify the atomic payout worked
SELECT 
    'Winner Tokens After Atomic Payout' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Verify the session was reset
SELECT 
    'Session After Atomic Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Verify no participants remain
SELECT 
    'Participants After Atomic Payout' as status,
    COUNT(*) as participant_count
FROM public.winner_takes_all_participants 
WHERE session_id = (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry');

-- ============================================
-- FINAL RESET FOR USER TESTING
-- ============================================

-- Final reset for user testing
DELETE FROM public.winner_takes_all_participants;

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

-- Show ready status
SELECT 
    'System Ready for User Testing!' as status,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    SUM(current_pot) as total_pot,
    SUM(participants_count) as total_participants
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of the atomic transaction payout system:
-- 1. Uses atomic transactions for data integrity
-- 2. All operations succeed or fail together
-- 3. Comprehensive error handling and rollback
-- 4. Verifies token updates before committing
-- 5. Resets session after successful payout
-- 6. Works for any user (existing and future)
-- 7. Based on gaming platform best practices

SELECT 'Atomic Transaction Victor Payout System Ready!' as final_status;
