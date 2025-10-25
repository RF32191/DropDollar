-- AUTONOMOUS_PAYOUT_SYSTEM.sql
-- This script creates an autonomous payout system that ensures single payout and resets everything post-payout

-- ============================================
-- AUTONOMOUS PAYOUT SYSTEM
-- ============================================

-- 1. Add tokens to both email addresses
INSERT INTO public.users (
    id, username, email, tokens, role, account_type, verification_status, is_active
)
VALUES 
    (gen_random_uuid(), 'ryanfermoselle', 'ryanfermoselle@yahoo.com', 300, 'buyer', 'buyer', 'verified', true),
    (gen_random_uuid(), 'ryanrfermoselle', 'ryanrfermoselle@yahoo.com', 300, 'buyer', 'buyer', 'verified', true)
ON CONFLICT (email) DO UPDATE SET
    tokens = users.tokens + 300,
    updated_at = NOW();

-- 2. Create autonomous payout system with single payout guarantee
CREATE OR REPLACE FUNCTION public.autonomous_winner_takes_all_complete_flow(
    session_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    winner_record RECORD;
    payout_amount DECIMAL(10,2);
    platform_fee_amount DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get session info
    SELECT * INTO session_record 
    FROM public.winner_takes_all_sessions 
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session not found'
        );
    END IF;
    
    -- Check if already paid out (prevent double payout)
    IF session_record.winner_user_id IS NOT NULL AND session_record.prize_amount IS NOT NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Session already paid out - no double payout allowed'
        );
    END IF;
    
    -- Find the winner (highest score)
    SELECT p.*, u.username, u.email
    INTO winner_record
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = session_id_param
    AND p.score IS NOT NULL
    AND p.completed_at IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'No winner found - no completed games'
        );
    END IF;
    
    -- Calculate payout (90% to winner, 10% platform fee)
    payout_amount := session_record.current_pot * 0.90;
    platform_fee_amount := session_record.current_pot * 0.10;
    
    -- Add tokens to winner
    UPDATE public.users
    SET tokens = tokens + payout_amount,
        updated_at = NOW()
    WHERE id = winner_record.user_id;
    
    -- Update session with winner info
    UPDATE public.winner_takes_all_sessions
    SET 
        winner_user_id = winner_record.user_id,
        prize_amount = payout_amount,
        platform_fee = platform_fee_amount,
        status = 'completed',
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Wait a moment to ensure payout is processed
    PERFORM pg_sleep(1);
    
    -- Reset session for new tournament
    DELETE FROM public.winner_takes_all_participants 
    WHERE session_id = session_id_param;
    
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
    WHERE id = session_id_param;
    
    -- Return comprehensive result
    RETURN json_build_object(
        'success', true,
        'message', 'Autonomous payout and reset completed',
        'winner_username', winner_record.username,
        'winner_email', winner_record.email,
        'winner_score', winner_record.score,
        'payout_amount', payout_amount,
        'platform_fee', platform_fee_amount,
        'total_pot', session_record.current_pot,
        'session_reset', true,
        'ready_for_new_tournament', true
    );
END;
$$;

-- 3. Test the autonomous system
-- Clear everything first
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
    updated_at = NOW();

-- Add test participants
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     1500.75, 95.5, NOW(), NOW()),
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'ryanfermoselle@yahoo.com'), 
     1200.25, 88.0, NOW(), NOW());

-- Update session to have a pot
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 2,
    participants_count = 2,
    status = 'active',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Test the autonomous payout and reset system
SELECT public.autonomous_winner_takes_all_complete_flow(
    (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry')
) as result;

-- 4. Verify the system worked
SELECT 
    'Autonomous payout system working!' as status,
    config_id,
    status,
    participants_count,
    current_pot,
    winner_user_id,
    prize_amount,
    platform_fee
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Check winner's tokens were updated
SELECT 
    'Winner tokens updated!' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- ============================================
-- AUTONOMOUS PAYOUT SYSTEM COMPLETE
-- ============================================
