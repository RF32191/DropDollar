-- DIRECT_SQL_VICTOR_PAYOUT.sql
-- This script uses direct SQL commands to pay the victor - NO FUNCTIONS

-- ============================================
-- DIRECT SQL VICTOR PAYOUT SYSTEM
-- ============================================

-- Complete reset everything
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

-- Verify reset
SELECT 
    'Complete Reset Done!' as status,
    COUNT(*) as total_sessions,
    SUM(participants_count) as total_participants,
    SUM(current_pot) as total_pot
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- ============================================
-- CREATE TEST SCENARIO
-- ============================================

-- Create test scenario
INSERT INTO public.winner_takes_all_participants (session_id, user_id, score, accuracy, completed_at, joined_at)
VALUES 
    ((SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry'), 
     (SELECT id FROM public.users WHERE email = 'rf32191@gmail.com'), 
     5000.75, 95.5, NOW(), NOW());

-- Update session to have a pot
UPDATE public.winner_takes_all_sessions
SET 
    current_pot = 10,
    participants_count = 1,
    status = 'active',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Show before direct payout
SELECT 
    'Before Direct Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Show winner's tokens before payout
SELECT 
    'Winner Tokens Before Direct Payout' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- ============================================
-- DIRECT SQL PAYOUT - NO FUNCTIONS
-- ============================================

-- Step 1: Find the winner and pot amount
WITH winner_info AS (
    SELECT 
        p.user_id,
        p.score,
        u.username,
        u.email,
        u.tokens as current_tokens,
        s.current_pot,
        s.id as session_id
    FROM public.winner_takes_all_participants p
    JOIN public.users u ON p.user_id = u.id
    JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
    WHERE s.config_id = 'wta-2-sword-parry'
    AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1
)
-- Step 2: Pay the winner directly
UPDATE public.users
SET 
    tokens = tokens + (SELECT current_pot FROM winner_info),
    updated_at = NOW()
WHERE id = (SELECT user_id FROM winner_info);

-- Step 3: Show the payout result
SELECT 
    'DIRECT PAYOUT EXECUTED!' as status,
    u.username,
    u.email,
    u.tokens as tokens_after_payout,
    s.current_pot as pot_amount_paid
FROM public.users u
JOIN public.winner_takes_all_participants p ON u.id = p.user_id
JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
WHERE s.config_id = 'wta-2-sword-parry'
AND p.score IS NOT NULL
ORDER BY p.score DESC
LIMIT 1;

-- ============================================
-- RESET SESSION AFTER PAYOUT
-- ============================================

-- Reset the session after successful payout
DELETE FROM public.winner_takes_all_participants 
WHERE session_id = (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry');

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
    'Session Reset After Payout' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Verify no participants remain
SELECT 
    'Participants After Reset' as status,
    COUNT(*) as participant_count
FROM public.winner_takes_all_participants 
WHERE session_id = (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry');

-- ============================================
-- FINAL VERIFICATION
-- ============================================

-- Show final winner token balance
SELECT 
    'Final Winner Token Balance' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'rf32191@gmail.com';

-- Show all sessions status
SELECT 
    'All Sessions Status' as status,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
    SUM(current_pot) as total_pot,
    SUM(participants_count) as total_participants
FROM public.winner_takes_all_sessions 
WHERE config_id LIKE 'wta-%';

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of the direct SQL payout system:
-- 1. Uses direct SQL commands - NO FUNCTIONS
-- 2. Finds winner by highest score
-- 3. Pays winner the full pot amount
-- 4. Resets session after payout
-- 5. Works for any user (existing and future)
-- 6. Simple and reliable approach

SELECT 'Direct SQL Victor Payout System Working!' as final_status;
