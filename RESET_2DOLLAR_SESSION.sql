-- RESET_2DOLLAR_SESSION.sql
-- This script resets the wta-2-sword-parry ($2 banner) session for all users

-- Reset the wta-2-sword-parry session for all users
-- First, delete all participants from this session
DELETE FROM public.winner_takes_all_participants 
WHERE session_id IN (
    SELECT id FROM public.winner_takes_all_sessions 
    WHERE config_id = 'wta-2-sword-parry'
);

-- Reset the session status and counters
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
WHERE config_id = 'wta-2-sword-parry';

-- Verify the reset
SELECT 
    'Session reset completed!' as status,
    config_id,
    status,
    participants_count,
    current_pot,
    timer_started_at,
    winner_user_id
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Check that no participants remain
SELECT 
    'Participants cleared!' as status,
    COUNT(*) as participant_count
FROM public.winner_takes_all_participants p
JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
WHERE s.config_id = 'wta-2-sword-parry';
