-- Check if configs exist
SELECT 'WINNER TAKES ALL CONFIGS EXIST?' as check;
SELECT COUNT(*) as count FROM winner_takes_all_configs;
SELECT id, base_price FROM winner_takes_all_configs ORDER BY base_price LIMIT 10;

SELECT 'HOT SELL CONFIGS EXIST?' as check;
SELECT COUNT(*) as count FROM hot_sell_configs;
SELECT id, base_price FROM hot_sell_configs ORDER BY base_price LIMIT 10;

-- Check if tables exist
SELECT 'TABLES EXIST?' as check;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('winner_takes_all_configs', 'winner_takes_all_sessions', 'hot_sell_configs', 'hot_sell_sessions');

