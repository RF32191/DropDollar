-- ============================================================================
-- TEST HOT SELL BACKUP SYSTEM
-- ============================================================================
-- This script shows sample queries to verify the backup system is working
-- ============================================================================

-- ============================================================================
-- 1. Check Recent Token Transactions
-- ============================================================================
SELECT 
    tt.user_id,
    u.email,
    u.username,
    tt.amount,
    tt.transaction_type,
    tt.description,
    tt.balance_after,
    tt.created_at
FROM token_transactions tt
LEFT JOIN users u ON tt.user_id::text = u.id::text
WHERE tt.transaction_type = 'tournament_prize'
ORDER BY tt.created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. Check Recent Purchase History (Earnings)
-- ============================================================================
SELECT 
    ph.user_id,
    u.email,
    u.username,
    ph.amount,
    ph.transaction_type,
    ph.description,
    ph.created_at
FROM purchase_history ph
LEFT JOIN users u ON ph.user_id::text = u.id::text
WHERE ph.transaction_type = 'earnings'
ORDER BY ph.created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. Check Recent Hot Sell Game History
-- ============================================================================
SELECT 
    gh.user_id,
    u.email,
    u.username,
    gh.game_type,
    gh.score,
    gh.tokens_won,
    gh.tournament_type,
    gh.played_at
FROM game_history gh
LEFT JOIN users u ON gh.user_id::text = u.id::text
WHERE gh.tournament_type = 'hot_sell'
ORDER BY gh.played_at DESC
LIMIT 10;

-- ============================================================================
-- 4. Check Recent User Game History
-- ============================================================================
SELECT 
    ugh.user_id,
    u.email,
    u.username,
    ugh.game_type,
    ugh.score,
    ugh.tokens_earned,
    ugh.competition_type,
    ugh.played_at
FROM user_game_history ugh
LEFT JOIN users u ON ugh.user_id::text = u.id::text
WHERE ugh.competition_type = 'hot_sell'
ORDER BY ugh.played_at DESC
LIMIT 10;

-- ============================================================================
-- 5. Check User Balances and Stats
-- ============================================================================
SELECT 
    id,
    email,
    username,
    tokens,
    total_earned,
    games_played,
    games_won,
    updated_at
FROM users
WHERE tokens > 0 OR total_earned > 0
ORDER BY total_earned DESC
LIMIT 10;

-- ============================================================================
-- 6. Summary Statistics
-- ============================================================================
-- Total tokens paid out in Hot Sell tournaments
SELECT 
    COUNT(*) as total_payouts,
    SUM(amount) as total_tokens_paid,
    AVG(amount) as avg_payout
FROM token_transactions
WHERE transaction_type = 'tournament_prize';

-- Total Hot Sell games played
SELECT 
    COUNT(*) as total_hot_sell_games,
    COUNT(DISTINCT user_id) as unique_players,
    SUM(tokens_won) as total_prizes_awarded,
    AVG(score) as avg_score
FROM game_history
WHERE tournament_type = 'hot_sell';

-- Top Hot Sell players by total earnings
SELECT 
    u.email,
    u.username,
    COUNT(gh.id) as games_played,
    SUM(gh.tokens_won) as total_earned,
    AVG(gh.score) as avg_score,
    MAX(gh.score) as best_score
FROM game_history gh
LEFT JOIN users u ON gh.user_id::text = u.id::text
WHERE gh.tournament_type = 'hot_sell'
GROUP BY u.id, u.email, u.username
ORDER BY total_earned DESC
LIMIT 10;

-- ============================================================================
-- 7. Verify Data Consistency
-- ============================================================================
-- Check if user token balances match transaction history
SELECT 
    u.id,
    u.email,
    u.tokens as current_balance,
    u.total_earned,
    COALESCE(SUM(tt.amount), 0) as transaction_total
FROM users u
LEFT JOIN token_transactions tt ON u.id::text = tt.user_id::text
WHERE u.tokens > 0 OR u.total_earned > 0
GROUP BY u.id, u.email, u.tokens, u.total_earned
HAVING u.total_earned != COALESCE(SUM(tt.amount), 0)
LIMIT 10;
-- If this returns rows, there's a discrepancy between user.total_earned and transaction history

