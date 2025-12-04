-- SHOW_USER_BALANCES_COLUMNS.sql
-- Show ALL columns in user_balances table so we know what to use

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_balances'
ORDER BY ordinal_position;

-- Also show a sample record (if any exist)
SELECT * FROM public.user_balances LIMIT 1;

