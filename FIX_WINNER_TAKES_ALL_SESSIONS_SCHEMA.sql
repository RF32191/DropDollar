-- FIX_WINNER_TAKES_ALL_SESSIONS_SCHEMA.sql
-- This script fixes the missing columns in winner_takes_all_sessions table
-- that were causing the "column s.winner_user_id does not exist" error

-- Add missing columns to winner_takes_all_sessions table
ALTER TABLE public.winner_takes_all_sessions 
ADD COLUMN IF NOT EXISTS winner_user_id UUID,
ADD COLUMN IF NOT EXISTS prize_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2);

-- Verify the columns were added
SELECT 
    'Schema fix applied successfully!' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_sessions' 
AND table_schema = 'public';

-- Test the SQL function to ensure it works
SELECT 
    'SQL function test:' as test_type,
    COUNT(*) as session_count
FROM public.get_all_winner_takes_all_sessions();
