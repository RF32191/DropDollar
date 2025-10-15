-- Check current matchmaking_queue table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'matchmaking_queue' 
ORDER BY ordinal_position;
