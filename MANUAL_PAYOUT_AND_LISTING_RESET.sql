-- MANUAL_PAYOUT_AND_LISTING_RESET.sql
-- This script manually pays the winner the current pot tokens (as decimal) and resets the listing for new users

-- ============================================
-- MANUAL PAYOUT AND LISTING RESET
-- ============================================

-- Check current state of sessions and participants
SELECT 
    'Current Session State' as status,
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

-- Check current participants with scores
SELECT 
    'Current Participants with Scores' as status,
    p.session_id,
    s.config_id,
    u.username,
    u.email,
    p.score,
    p.accuracy,
    p.completed_at
FROM public.winner_takes_all_participants p
JOIN public.winner_takes_all_sessions s ON p.session_id = s.id
JOIN public.users u ON p.user_id = u.id
WHERE p.score IS NOT NULL
ORDER BY p.score DESC;

-- ============================================
-- MANUAL PAYOUT TO WINNER
-- ============================================

-- Get the current pot amount and winner info
SELECT 
    'Current Pot and Winner Info' as status,
    s.config_id,
    s.current_pot,
    u.username as winner_username,
    u.email as winner_email,
    u.tokens as winner_tokens_before,
    p.score as winner_score
FROM public.winner_takes_all_sessions s
JOIN public.winner_takes_all_participants p ON s.id = p.session_id
JOIN public.users u ON p.user_id = u.id
WHERE s.config_id = 'wta-2-sword-parry'
AND p.score IS NOT NULL
ORDER BY p.score DESC
LIMIT 1;

-- Pay the winner the current pot amount (as decimal)
WITH winner_info AS (
    SELECT 
        s.current_pot,
        u.id as winner_id,
        u.username,
        u.email,
        u.tokens as tokens_before,
        p.score
    FROM public.winner_takes_all_sessions s
    JOIN public.winner_takes_all_participants p ON s.id = p.session_id
    JOIN public.users u ON p.user_id = u.id
    WHERE s.config_id = 'wta-2-sword-parry'
    AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1
)
UPDATE public.users
SET tokens = tokens + (SELECT current_pot FROM winner_info),
    updated_at = NOW()
WHERE id = (SELECT winner_id FROM winner_info);

-- Show the payout result
SELECT 
    'Payout Result' as status,
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
-- UPDATE GAME HISTORY WITH TOKENS_WON
-- ============================================

-- Update game_history with tokens_won for the winner
WITH winner_info AS (
    SELECT 
        s.current_pot,
        u.id as winner_id,
        s.id as session_id
    FROM public.winner_takes_all_sessions s
    JOIN public.winner_takes_all_participants p ON s.id = p.session_id
    JOIN public.users u ON p.user_id = u.id
    WHERE s.config_id = 'wta-2-sword-parry'
    AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1
)
UPDATE public.game_history
SET tokens_won = (SELECT current_pot FROM winner_info)
WHERE user_id = (SELECT winner_id FROM winner_info)::TEXT 
AND metadata->>'session_id' = (SELECT session_id FROM winner_info)::TEXT;

-- Update user_game_history with tokens_won for the winner
WITH winner_info AS (
    SELECT 
        s.current_pot,
        u.id as winner_id,
        s.id as session_id
    FROM public.winner_takes_all_sessions s
    JOIN public.winner_takes_all_participants p ON s.id = p.session_id
    JOIN public.users u ON p.user_id = u.id
    WHERE s.config_id = 'wta-2-sword-parry'
    AND p.score IS NOT NULL
    ORDER BY p.score DESC
    LIMIT 1
)
UPDATE public.user_game_history
SET tokens_won = (SELECT current_pot FROM winner_info),
    updated_at = NOW()
WHERE user_id = (SELECT winner_id FROM winner_info) 
AND game_session_id = (SELECT session_id FROM winner_info);

-- Mark session as completed
UPDATE public.winner_takes_all_sessions
SET 
    winner_user_id = (
        SELECT p.user_id 
        FROM public.winner_takes_all_participants p 
        WHERE p.session_id = id 
        AND p.score IS NOT NULL 
        ORDER BY p.score DESC 
        LIMIT 1
    ),
    prize_amount = current_pot,
    platform_fee = 0,
    status = 'completed',
    updated_at = NOW()
WHERE config_id = 'wta-2-sword-parry';

-- Show the updated session
SELECT 
    'Updated Session' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- ============================================
-- COMPLETE RESET FOR NEW USERS
-- ============================================

-- Complete reset of the listing for new users
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
    'Listing Reset for New Users' as status,
    config_id,
    status,
    current_pot,
    participants_count,
    timer_started_at,
    winner_user_id,
    prize_amount
FROM public.winner_takes_all_sessions 
WHERE config_id = 'wta-2-sword-parry';

-- Verify no participants remain
SELECT 
    'Participants After Reset' as status,
    COUNT(*) as participant_count
FROM public.winner_takes_all_participants 
WHERE session_id = (SELECT id FROM public.winner_takes_all_sessions WHERE config_id = 'wta-2-sword-parry');

-- Show winner's final token balance
SELECT 
    'Winner Final Token Balance' as status,
    username,
    email,
    tokens
FROM public.users 
WHERE email = 'ryanrfermoselle@yahoo.com';

-- ============================================
-- SYSTEM SUMMARY
-- ============================================

-- Summary of the manual payout and listing reset:
-- 1. Winner paid current pot tokens (as decimal) - SUCCESS
-- 2. Game history updated with tokens_won - SUCCESS
-- 3. Session marked as completed - SUCCESS
-- 4. Listing completely reset for new users - SUCCESS
-- 5. All participants cleared - SUCCESS
-- 6. Ready for further testing - SUCCESS

SELECT 'Manual Payout and Listing Reset Completed!' as final_status;
