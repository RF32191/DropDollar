-- ============================================================================
-- TEST JOIN SESSION - See the ACTUAL error
-- ============================================================================
-- Replace these values with real ones from your database

DO $$
DECLARE
  v_result RECORD;
  v_session_id TEXT := 'PASTE_ACTUAL_SESSION_ID_HERE'; -- Get this from hot_sell_sessions table
  v_user_id UUID := 'PASTE_YOUR_USER_ID_HERE'; -- Get this from users table
  v_entry_fee NUMERIC := 1.0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 TESTING JOIN HOT SELL SESSION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Session ID: %', v_session_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Entry Fee: %', v_entry_fee;
  RAISE NOTICE '';
  
  -- Call the function and see what happens
  SELECT * INTO v_result
  FROM join_hot_sell_session(v_session_id, v_user_id, v_entry_fee);
  
  RAISE NOTICE 'Result: success=%, message=%, session_id=%, participant_id=%', 
    v_result.success, v_result.message, v_result.session_id, v_result.participant_id;
  RAISE NOTICE '========================================';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '';
  RAISE NOTICE '❌ ERROR OCCURRED:';
  RAISE NOTICE 'Error Code: %', SQLSTATE;
  RAISE NOTICE 'Error Message: %', SQLERRM;
  RAISE NOTICE 'Error Detail: %', DETAIL;
  RAISE NOTICE 'Error Hint: %', HINT;
  RAISE NOTICE '========================================';
END $$;

-- Also show what sessions exist
SELECT 
  '📊 AVAILABLE SESSIONS' as info,
  id::TEXT as session_id,
  config_id::TEXT,
  participants_count,
  max_participants,
  status
FROM hot_sell_sessions
ORDER BY created_at DESC
LIMIT 5;

-- Show your user info
-- SELECT 
--   '👤 YOUR USER' as info,
--   id::TEXT as user_id,
--   email,
--   purchased_tokens,
--   won_tokens
-- FROM users
-- WHERE email = 'YOUR_EMAIL_HERE'; -- Replace with your email

