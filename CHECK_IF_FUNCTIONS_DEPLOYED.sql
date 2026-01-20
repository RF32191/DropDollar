-- Check if the transaction tracking functions exist in your database
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'save_entry_fee_to_user_transactions',
    'save_payout_to_user_transactions',
    'join_1v1_session',
    'wta_join_v2',
    'hs_join_v2',
    'coin_play_join_v2'
)
ORDER BY routine_name;

