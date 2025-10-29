-- Check the actual Hot Sell table structure
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'hot_sell_sessions'
AND column_name IN ('current_pot', 'base_price', 'max_participants')
ORDER BY ordinal_position;

SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'winner_takes_all_sessions'
AND column_name IN ('current_pot', 'base_price', 'participants_count')
ORDER BY ordinal_position;
