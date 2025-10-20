-- Verify User Accounts and Fix Login Issues
-- This script helps identify and verify user accounts to prevent login mismatches

-- 1. Check all users with similar email patterns
SELECT 
    'USER ACCOUNTS VERIFICATION' as info,
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
WHERE email ILIKE '%ryan%fermoselle%'
ORDER BY email, created_at DESC;

-- 2. Check auth.users table for these emails
SELECT 
    'AUTH USERS VERIFICATION' as info,
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email ILIKE '%ryan%fermoselle%'
ORDER BY email, created_at DESC;

-- 3. Check for any duplicate accounts
SELECT 
    'DUPLICATE CHECK' as info,
    email,
    COUNT(*) as account_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(username, ', ') as usernames
FROM public.users 
WHERE email ILIKE '%ryan%fermoselle%'
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. Show detailed comparison of both accounts
SELECT 
    'DETAILED COMPARISON' as info,
    u.id as users_id,
    u.email as users_email,
    u.username as users_username,
    u.tokens as users_tokens,
    u.balance as users_balance,
    u.is_active as users_active,
    u.last_login as users_last_login,
    u.created_at as users_created,
    a.id as auth_id,
    a.email as auth_email,
    a.last_sign_in_at as auth_last_signin,
    a.created_at as auth_created
FROM public.users u
LEFT JOIN auth.users a ON u.email = a.email
WHERE u.email ILIKE '%ryan%fermoselle%'
ORDER BY u.email;

-- 5. Check recent token transactions for both accounts
SELECT 
    'RECENT TOKEN TRANSACTIONS' as info,
    tt.id,
    tt.user_id,
    u.email,
    tt.amount,
    tt.type,
    tt.balance_before,
    tt.balance_after,
    tt.description,
    tt.created_at
FROM public.token_transactions tt
JOIN public.users u ON tt.user_id = u.id
WHERE u.email ILIKE '%ryan%fermoselle%'
ORDER BY tt.created_at DESC
LIMIT 20;

-- 6. Check Winner Takes It All participation for both accounts
SELECT 
    'WINNER TAKES IT ALL PARTICIPATION' as info,
    u.email,
    COUNT(*) as sessions_participated,
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
WHERE u.email ILIKE '%ryan%fermoselle%'
GROUP BY u.email;

-- 7. Summary of account status
SELECT 
    'ACCOUNT SUMMARY' as info,
    u.email,
    u.tokens as current_tokens,
    u.total_earned as lifetime_earned,
    u.games_played,
    u.games_won,
    CASE WHEN a.id IS NOT NULL THEN 'Auth account exists' ELSE 'No auth account' END as auth_status,
    u.is_active as account_active,
    u.last_login
FROM public.users u
LEFT JOIN auth.users a ON u.email = a.email
WHERE u.email ILIKE '%ryan%fermoselle%'
ORDER BY u.email;
