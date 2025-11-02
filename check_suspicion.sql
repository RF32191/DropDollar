-- Check your last game session
SELECT 
  session_id,
  game_type,
  status,
  server_score,
  client_score,
  suspicion_score,
  input_count,
  duration_ms,
  created_at
FROM game_sessions
ORDER BY created_at DESC
LIMIT 5;

-- Check if any emails should have been sent
SELECT 
  user_id,
  game_type,
  suspicion_score,
  reasons,
  client_score,
  flagged_at
FROM anti_cheat_logs
ORDER BY flagged_at DESC
LIMIT 5;
