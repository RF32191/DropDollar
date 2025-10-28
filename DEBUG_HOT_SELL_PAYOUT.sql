-- ============================================================================
-- DEBUG HOT SELL PAYOUT - Add extensive logging to figure out what's wrong
-- ============================================================================

-- First, let's check the current state
SELECT 
  'Current Hot Sell Sessions' as info,
  s.id,
  s.config_id,
  s.status,
  s.current_pot,
  s.participants_count,
  s.max_participants,
  s.first_place_user_id,
  (SELECT COUNT(*) FROM hot_sell_participants p WHERE p.session_id = s.id) as actual_participant_count,
  (SELECT COUNT(*) FROM hot_sell_participants p WHERE p.session_id = s.id AND p.score IS NOT NULL) as scored_count
FROM hot_sell_sessions s
ORDER BY s.created_at DESC
LIMIT 5;

-- Check participants with scores
SELECT 
  'Participants with Scores' as info,
  p.session_id,
  p.user_id,
  u.email,
  p.score,
  p.completed_at
FROM hot_sell_participants p
JOIN users u ON p.user_id = u.id
WHERE p.score IS NOT NULL
ORDER BY p.session_id, p.score DESC;

-- Now let's create a manual test payout function
CREATE OR REPLACE FUNCTION test_hot_sell_payout(config_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  session_record RECORD;
  participant_count INTEGER;
  scored_count INTEGER;
  result TEXT := '';
BEGIN
  result := '🔍 Testing payout for config: ' || config_id_param || E'\n';
  
  -- Get session
  SELECT * INTO session_record
  FROM hot_sell_sessions
  WHERE config_id = config_id_param
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    result := result || '❌ No session found' || E'\n';
    RETURN result;
  END IF;
  
  result := result || '✅ Found session: ' || session_record.id::TEXT || E'\n';
  result := result || '   Status: ' || session_record.status || E'\n';
  result := result || '   Pot: ' || session_record.current_pot::TEXT || E'\n';
  result := result || '   Participants: ' || session_record.participants_count::TEXT || '/' || session_record.max_participants::TEXT || E'\n';
  
  -- Check if already paid
  IF session_record.first_place_user_id IS NOT NULL THEN
    result := result || '⚠️  Already paid out to: ' || session_record.first_place_user_id::TEXT || E'\n';
    RETURN result;
  END IF;
  
  -- Count participants
  SELECT COUNT(*) INTO participant_count
  FROM hot_sell_participants
  WHERE session_id = session_record.id;
  
  result := result || '   Actual participants in DB: ' || participant_count::TEXT || E'\n';
  
  -- Count scored participants
  SELECT COUNT(*) INTO scored_count
  FROM hot_sell_participants
  WHERE session_id = session_record.id AND score IS NOT NULL;
  
  result := result || '   Participants with scores: ' || scored_count::TEXT || E'\n';
  
  -- Check if ready for payout
  IF scored_count >= session_record.max_participants THEN
    result := result || '✅ READY FOR PAYOUT!' || E'\n';
  ELSE
    result := result || '❌ NOT READY: Need ' || (session_record.max_participants - scored_count)::TEXT || ' more scores' || E'\n';
  END IF;
  
  RETURN result;
END;
$$;

-- Test ALL configs dynamically
DO $$
DECLARE
  config_rec RECORD;
BEGIN
  FOR config_rec IN 
    SELECT id, title FROM hot_sell_configs ORDER BY base_price
  LOOP
    RAISE NOTICE '%', test_hot_sell_payout(config_rec.id);
    RAISE NOTICE '---';
  END LOOP;
END $$;

