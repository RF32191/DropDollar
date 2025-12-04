-- FIX_DIAGNOSE_COLUMN_NAMES.sql
-- Check actual column names in ad_campaigns table

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'ad_campaigns'
ORDER BY ordinal_position;

-- Show sample data with actual columns
SELECT *
FROM public.ad_campaigns
LIMIT 1;

