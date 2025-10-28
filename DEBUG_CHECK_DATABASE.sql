-- Check what configs actually exist in the database
SELECT 'WINNER TAKES ALL CONFIGS' as type, id, base_price, game_type FROM winner_takes_all_configs ORDER BY base_price;
SELECT 'HOT SELL CONFIGS' as type, id, base_price, game_type FROM hot_sell_configs ORDER BY base_price;

-- Check what sessions exist
SELECT 'WINNER TAKES ALL SESSIONS' as type, id, config_id, status FROM winner_takes_all_sessions;
SELECT 'HOT SELL SESSIONS' as type, id, config_id, status FROM hot_sell_sessions;

-- Check if functions exist
SELECT 'FUNCTIONS' as type, proname as function_name FROM pg_proc WHERE proname IN ('get_all_winner_takes_all_sessions', 'get_all_hot_sell_sessions');

