-- Check Winner Takes It All Payout System
-- This script helps verify that payouts are working correctly

-- 1. Check current user balances
SELECT 
    'CURRENT USER BALANCES' as info,
    id,
    email,
    username,
    tokens,
    total_earned,
    balance,
    is_active,
    last_login,
    updated_at
FROM public.users 
WHERE email IN (
    'ryanfermoselle@yahoo.com',
    'ryanrfermoselle@yahoo.com'
)
ORDER BY email;

-- 2. Check Winner Takes It All sessions and their payout status
SELECT 
    'WINNER TAKES IT ALL SESSIONS' as info,
    id,
    config_id,
    current_pot,
    base_price,
    participants_count,
    status,
    winner_user_id,
    prize_awarded,
    winner_paid,
    timer_started_at,
    completed_at,
    created_at,
    updated_at
FROM public.winner_takes_all_shared_sessions
ORDER BY created_at DESC;

-- 3. Check recent token transactions for payout verification
SELECT 
    'RECENT TOKEN TRANSACTIONS' as info,
    id,
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    description,
    created_at
FROM public.token_transactions 
WHERE user_id IN (
    SELECT id FROM public.users 
    WHERE email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
)
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check Winner Takes It All game history
SELECT 
    'WINNER TAKES IT ALL GAME HISTORY' as info,
    id,
    user_id,
    game_type,
    score,
    accuracy,
    tournament_type,
    is_practice,
    is_competition,
    created_at
FROM public.game_history 
WHERE tournament_type = 'winner_takes_all'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check Winner Takes It All competitions
SELECT 
    'WINNER TAKES IT ALL COMPETITIONS' as info,
    id,
    user_id,
    game_type,
    score,
    accuracy,
    tournament_type,
    session_id,
    is_practice,
    is_competition,
    created_at
FROM public.competitions 
WHERE tournament_type = 'winner_takes_all'
ORDER BY created_at DESC
LIMIT 10;

-- 6. Summary of Winner Takes It All activity
SELECT 
    'SUMMARY' as info,
    'Total Winner Takes It All sessions' as metric,
    COUNT(*) as count
FROM public.winner_takes_all_shared_sessions

UNION ALL

SELECT 
    'SUMMARY' as info,
    'Completed sessions' as metric,
    COUNT(*) as count
FROM public.winner_takes_all_shared_sessions
WHERE status = 'completed' OR completed_at IS NOT NULL

UNION ALL

SELECT 
    'SUMMARY' as info,
    'Sessions with payouts' as metric,
    COUNT(*) as count
FROM public.winner_takes_all_shared_sessions
WHERE winner_paid = true

UNION ALL

SELECT 
    'SUMMARY' as info,
    'Total Winner Takes It All games played' as metric,
    COUNT(*) as count
FROM public.game_history
WHERE tournament_type = 'winner_takes_all';
