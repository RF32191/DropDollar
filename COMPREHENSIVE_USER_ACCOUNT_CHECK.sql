-- COMPREHENSIVE USER ACCOUNT VERIFICATION AND FIX
-- This script ensures no cross-contamination between user accounts

-- 1. Check current state of both accounts
SELECT 
    'CURRENT ACCOUNT STATE' as info,
    id,
    email,
    username,
    first_name,
    last_name,
    tokens,
    balance,
    total_spent,
    total_earned,
    games_played,
    games_won,
    is_active,
    last_login,
    created_at,
    updated_at
FROM public.users 
WHERE email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
ORDER BY email;

-- 2. Check auth.users table
SELECT 
    'AUTH USERS STATE' as info,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
ORDER BY email;

-- 3. Check for any duplicate or conflicting data
SELECT 
    'DUPLICATE CHECK' as info,
    email,
    COUNT(*) as account_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(username, ', ') as usernames
FROM public.users 
WHERE email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. Check Winner Takes It All participation
SELECT 
    'WINNER TAKES IT ALL PARTICIPATION' as info,
    u.email,
    COUNT(s.id) as sessions_participated,
    SUM(CASE WHEN p.score IS NOT NULL THEN 1 ELSE 0 END) as games_completed,
    MAX(p.score) as best_score,
    MAX(s.created_at) as last_participation
FROM public.users u
LEFT JOIN public.winner_takes_all_shared_sessions s ON s.participants::text LIKE '%' || u.id || '%'
LEFT JOIN LATERAL (
    SELECT score 
    FROM jsonb_array_elements(s.participants) p 
    WHERE p->>'user_id' = u.id
) p ON true
WHERE u.email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
GROUP BY u.email;

-- 5. Check dashboard scores (game_history)
SELECT 
    'DASHBOARD SCORES' as info,
    u.email,
    gh.game_type,
    gh.score,
    gh.tournament_type,
    gh.is_practice,
    gh.is_competition,
    gh.created_at
FROM public.users u
JOIN public.game_history gh ON u.id = gh.user_id
WHERE u.email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
ORDER BY gh.created_at DESC
LIMIT 10;

-- 6. Check competitions table
SELECT 
    'COMPETITIONS TABLE' as info,
    u.email,
    c.game_type,
    c.score,
    c.tournament_type,
    c.is_practice,
    c.is_competition,
    c.created_at
FROM public.users u
JOIN public.competitions c ON u.id = c.user_id
WHERE u.email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
ORDER BY c.created_at DESC
LIMIT 10;

-- 7. Check recent token transactions
SELECT 
    'RECENT TOKEN TRANSACTIONS' as info,
    u.email,
    tt.amount,
    tt.type,
    tt.balance_before,
    tt.balance_after,
    tt.description,
    tt.created_at
FROM public.users u
JOIN public.token_transactions tt ON u.id = tt.user_id
WHERE u.email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
ORDER BY tt.created_at DESC
LIMIT 10;

-- 8. Verify account isolation (ensure no data mixing)
SELECT 
    'ACCOUNT ISOLATION VERIFICATION' as info,
    u.email,
    u.tokens as current_tokens,
    u.total_earned as lifetime_earned,
    COUNT(gh.id) as dashboard_games,
    COUNT(c.id) as competition_games,
    COUNT(tt.id) as token_transactions,
    u.last_login,
    CASE WHEN a.id IS NOT NULL THEN 'Auth account exists' ELSE 'No auth account' END as auth_status
FROM public.users u
LEFT JOIN auth.users a ON u.email = a.email
LEFT JOIN public.game_history gh ON u.id = gh.user_id
LEFT JOIN public.competitions c ON u.id = c.user_id
LEFT JOIN public.token_transactions tt ON u.id = tt.user_id
WHERE u.email IN ('ryanfermoselle@yahoo.com', 'ryanrfermoselle@yahoo.com')
GROUP BY u.id, u.email, u.tokens, u.total_earned, u.last_login, a.id
ORDER BY u.email;

-- 9. Final verification - ensure accounts are completely separate
SELECT 
    'FINAL VERIFICATION' as info,
    'ryanfermoselle@yahoo.com' as email1,
    (SELECT tokens FROM public.users WHERE email = 'ryanfermoselle@yahoo.com') as tokens1,
    'ryanrfermoselle@yahoo.com' as email2,
    (SELECT tokens FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com') as tokens2,
    CASE 
        WHEN (SELECT tokens FROM public.users WHERE email = 'ryanfermoselle@yahoo.com') != 
             (SELECT tokens FROM public.users WHERE email = 'ryanrfermoselle@yahoo.com') 
        THEN '✅ Accounts have different token balances - ISOLATION WORKING'
        ELSE '❌ Accounts have same token balance - ISOLATION BROKEN'
    END as isolation_status;
