-- SIMPLE USER ACCOUNT VERIFICATION
-- This script checks all user accounts to ensure proper isolation

-- 1. Check all user accounts
SELECT 
    'ALL USER ACCOUNTS' as info,
    id,
    email,
    username,
    tokens,
    balance,
    total_earned,
    games_played,
    games_won,
    is_active,
    last_login,
    created_at
FROM public.users 
ORDER BY email;

-- 2. Check auth.users table
SELECT 
    'AUTH USERS' as info,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
ORDER BY email;

-- 3. Check for duplicate emails
SELECT 
    'DUPLICATE EMAILS' as info,
    email,
    COUNT(*) as account_count,
    STRING_AGG(id::text, ', ') as user_ids
FROM public.users 
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. Check Winner Takes It All participation
SELECT 
    'WINNER TAKES IT ALL PARTICIPATION' as info,
    u.email,
    COUNT(s.id) as sessions_participated,
    MAX(s.created_at) as last_participation
FROM public.users u
LEFT JOIN public.winner_takes_all_shared_sessions s ON s.participants::text LIKE '%' || u.id || '%'
GROUP BY u.email
ORDER BY sessions_participated DESC;

-- 5. Check dashboard scores
SELECT 
    'DASHBOARD SCORES' as info,
    u.email,
    gh.game_type,
    gh.score,
    gh.tournament_type,
    gh.created_at
FROM public.users u
JOIN public.game_history gh ON u.id::text = gh.user_id
ORDER BY gh.created_at DESC
LIMIT 20;

-- 6. Check competitions table
SELECT 
    'COMPETITIONS' as info,
    u.email,
    c.game_type,
    c.score,
    c.tournament_type,
    c.created_at
FROM public.users u
JOIN public.competitions c ON u.id::text = c.user_id
ORDER BY c.created_at DESC
LIMIT 20;

-- 7. Check recent token transactions
SELECT 
    'TOKEN TRANSACTIONS' as info,
    u.email,
    tt.amount,
    tt.type,
    tt.balance_before,
    tt.balance_after,
    tt.description,
    tt.created_at
FROM public.users u
JOIN public.token_transactions tt ON u.id::text = tt.user_id::text
ORDER BY tt.created_at DESC
LIMIT 20;

-- 8. Account summary
SELECT 
    'ACCOUNT SUMMARY' as info,
    u.email,
    u.tokens as current_tokens,
    u.total_earned as lifetime_earned,
    COUNT(gh.id) as dashboard_games,
    COUNT(c.id) as competition_games,
    COUNT(tt.id) as token_transactions,
    u.last_login,
    CASE WHEN a.id IS NOT NULL THEN 'Auth exists' ELSE 'No auth' END as auth_status
FROM public.users u
LEFT JOIN auth.users a ON u.email = a.email
LEFT JOIN public.game_history gh ON u.id::text = gh.user_id
LEFT JOIN public.competitions c ON u.id::text = c.user_id
LEFT JOIN public.token_transactions tt ON u.id::text = tt.user_id::text
GROUP BY u.id, u.email, u.tokens, u.total_earned, u.last_login, a.id
ORDER BY u.email;
