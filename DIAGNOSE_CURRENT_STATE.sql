-- Check current state of database
SELECT '=== WINNER TAKES ALL CONFIGS ===' as info;
SELECT id, base_price, game_type FROM winner_takes_all_configs LIMIT 5;

SELECT '=== WINNER TAKES ALL SESSIONS ===' as info;
SELECT id, config_id, status, current_pot FROM winner_takes_all_sessions LIMIT 5;

SELECT '=== HOT SELL CONFIGS ===' as info;
SELECT id, base_price, game_type FROM hot_sell_configs LIMIT 5;

SELECT '=== HOT SELL SESSIONS ===' as info;
SELECT id, config_id, status, current_pot FROM hot_sell_sessions LIMIT 5;

SELECT '=== FUNCTIONS ===' as info;
SELECT proname FROM pg_proc WHERE proname IN ('get_all_winner_takes_all_sessions', 'get_all_hot_sell_sessions', 'join_hot_sell_session');

-- Test the functions
SELECT '=== TEST WINNER TAKES ALL FUNCTION ===' as info;
SELECT COUNT(*) as session_count FROM get_all_winner_takes_all_sessions();

SELECT '=== TEST HOT SELL FUNCTION ===' as info;
SELECT COUNT(*) as session_count FROM get_all_hot_sell_sessions();

