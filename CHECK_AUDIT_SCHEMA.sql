-- Quick check to see what columns game_session_audit actually has
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'game_session_audit'
ORDER BY ordinal_position;

