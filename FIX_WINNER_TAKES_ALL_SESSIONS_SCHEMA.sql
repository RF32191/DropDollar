-- FIX_WINNER_TAKES_ALL_SESSIONS_SCHEMA.sql
-- This script fixes the missing columns in winner_takes_all_sessions table
-- that were causing various "column does not exist" errors

-- Add missing columns to winner_takes_all_sessions table
ALTER TABLE public.winner_takes_all_sessions 
ADD COLUMN IF NOT EXISTS winner_user_id UUID,
ADD COLUMN IF NOT EXISTS prize_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS base_price INTEGER;

-- Update existing sessions with base_price values based on config_id
UPDATE public.winner_takes_all_sessions 
SET base_price = CASE 
    WHEN config_id = 'wta-2-sword-parry' THEN 2
    WHEN config_id = 'wta-5-blade-bounce' THEN 5
    WHEN config_id = 'wta-10-laser-dodge' THEN 10
    WHEN config_id = 'wta-25-multi-target' THEN 25
    WHEN config_id = 'wta-50-sword-parry' THEN 50
    WHEN config_id = 'wta-100-laser-dodge' THEN 100
    WHEN config_id = 'wta-250-multi-target' THEN 250
    WHEN config_id = 'wta-1000-cash-stack' THEN 1000
    WHEN config_id = 'wta-2500-falling-objects' THEN 2500
    WHEN config_id = 'wta-5000-color-sequence' THEN 5000
    WHEN config_id = 'wta-10000-laser-dodge' THEN 10000
    WHEN config_id = 'wta-25000-multi-target' THEN 25000
    ELSE 0
END;

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
