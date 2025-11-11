-- REVERT TO SIMPLE RNG + FIX SCORE UPDATES FOR PROGRESS BAR AND POOL
-- Based on working practice games implementation

/*
ISSUE: Games have "different RNG now but still way off"
ROOT CAUSE: Mulberry32 changed game mechanics, not just spawn positions
SOLUTION: Keep simple Math.random() approach from practice games
*/

-- =================================================================
-- PART 1: CREATE FUNCTIONS TO UPDATE PROGRESS BAR AND POOL
-- =================================================================

-- Function to update Hot Sell session after score submission
CREATE OR REPLACE FUNCTION update_hot_sell_session_stats(
  p_session_id uuid,
  p_score numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session hot_sell_sessions%ROWTYPE;
  v_config hot_sell_configs%ROWTYPE;
  v_new_pool numeric;
  v_participants_count integer;
  v_all_played boolean;
BEGIN
  -- Get session and config
  SELECT * INTO v_session
  FROM hot_sell_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  SELECT * INTO v_config
  FROM hot_sell_configs
  WHERE id = v_session.config_id;
  
  -- Count participants with scores (those who played)
  SELECT COUNT(*) INTO v_participants_count
  FROM hot_sell_participants
  WHERE session_id = p_session_id
    AND score IS NOT NULL;
  
  -- Calculate new pool (base_price * participants_count)
  v_new_pool := v_config.base_price * v_participants_count;
  
  -- Check if all participants have played
  SELECT 
    COUNT(*) FILTER (WHERE score IS NULL) = 0
  INTO v_all_played
  FROM hot_sell_participants
  WHERE session_id = p_session_id;
  
  -- Update session
  UPDATE hot_sell_sessions
  SET 
    participants_count = v_participants_count,
    prize_pool = v_new_pool,
    updated_at = now()
  WHERE id = p_session_id;
  
  -- Return updated stats
  RETURN jsonb_build_object(
    'participants_count', v_participants_count,
    'prize_pool', v_new_pool,
    'all_played', v_all_played,
    'max_participants', v_config.max_participants,
    'progress_percent', ROUND((v_participants_count::numeric / v_config.max_participants) * 100, 2)
  );
END;
$$;

-- Function to update Winner Takes All session stats
CREATE OR REPLACE FUNCTION update_wta_session_stats(
  p_session_id uuid,
  p_score numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session winner_takes_all_sessions%ROWTYPE;
  v_config winner_takes_all_configs%ROWTYPE;
  v_new_pool numeric;
  v_participants_count integer;
  v_all_played boolean;
BEGIN
  -- Get session and config
  SELECT * INTO v_session
  FROM winner_takes_all_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  SELECT * INTO v_config
  FROM winner_takes_all_configs
  WHERE id = v_session.config_id;
  
  -- Count participants with scores
  SELECT COUNT(*) INTO v_participants_count
  FROM winner_takes_all_participants
  WHERE session_id = p_session_id
    AND score IS NOT NULL;
  
  -- Calculate new pool
  v_new_pool := v_config.entry_fee * v_participants_count;
  
  -- Check if all participants have played
  SELECT 
    COUNT(*) FILTER (WHERE score IS NULL) = 0
  INTO v_all_played
  FROM winner_takes_all_participants
  WHERE session_id = p_session_id;
  
  -- Update session
  UPDATE winner_takes_all_sessions
  SET 
    participants_count = v_participants_count,
    current_pot = v_new_pool,
    updated_at = now()
  WHERE id = p_session_id;
  
  -- Return updated stats
  RETURN jsonb_build_object(
    'participants_count', v_participants_count,
    'current_pot', v_new_pool,
    'all_played', v_all_played,
    'max_participants', v_config.max_participants,
    'progress_percent', ROUND((v_participants_count::numeric / v_config.max_participants) * 100, 2)
  );
END;
$$;

-- Function to update 1v1 session stats
CREATE OR REPLACE FUNCTION update_1v1_session_stats(
  p_session_id uuid,
  p_score numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session one_v_one_sessions%ROWTYPE;
  v_config one_v_one_configs%ROWTYPE;
  v_new_pool numeric;
  v_participants_count integer;
  v_all_played boolean;
BEGIN
  -- Get session and config
  SELECT * INTO v_session
  FROM one_v_one_sessions
  WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  SELECT * INTO v_config
  FROM one_v_one_configs
  WHERE id = v_session.config_id;
  
  -- Count participants with scores
  SELECT COUNT(*) INTO v_participants_count
  FROM one_v_one_participants
  WHERE session_id = p_session_id
    AND score IS NOT NULL;
  
  -- Calculate new pool (2 players * entry fee)
  v_new_pool := v_config.entry_fee * v_participants_count;
  
  -- Check if both players have played
  SELECT 
    COUNT(*) = 2 AND COUNT(*) FILTER (WHERE score IS NULL) = 0
  INTO v_all_played
  FROM one_v_one_participants
  WHERE session_id = p_session_id;
  
  -- Update session
  UPDATE one_v_one_sessions
  SET 
    participants_count = v_participants_count,
    prize_pool = v_new_pool,
    updated_at = now()
  WHERE id = p_session_id;
  
  -- Return updated stats
  RETURN jsonb_build_object(
    'participants_count', v_participants_count,
    'prize_pool', v_new_pool,
    'all_played', v_all_played,
    'max_participants', 2,
    'progress_percent', ROUND((v_participants_count::numeric / 2) * 100, 2)
  );
END;
$$;

-- =================================================================
-- PART 2: UPDATE EXISTING SCORE FUNCTIONS TO CALL STATS UPDATES
-- =================================================================

-- Drop existing functions first (they have different return types)
DROP FUNCTION IF EXISTS update_hot_sell_score(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS update_winner_takes_all_score(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS update_1v1_score(uuid, uuid, numeric, numeric);

-- Update Hot Sell score function to refresh stats
CREATE OR REPLACE FUNCTION update_hot_sell_score(
  session_id_param uuid,
  user_id_param uuid,
  score_param numeric,
  accuracy_param numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_stats jsonb;
BEGIN
  -- Update participant score
  UPDATE hot_sell_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = now(),
    updated_at = now()
  WHERE session_id = session_id_param
    AND user_id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in session';
  END IF;
  
  -- Update session stats (progress bar, pool, etc.)
  SELECT update_hot_sell_session_stats(session_id_param, score_param)
  INTO v_stats;
  
  -- Return success with updated stats
  RETURN jsonb_build_object(
    'success', true,
    'score', score_param,
    'accuracy', accuracy_param,
    'stats', v_stats
  );
END;
$$;

-- Update Winner Takes All score function
CREATE OR REPLACE FUNCTION update_winner_takes_all_score(
  session_id_param uuid,
  user_id_param uuid,
  score_param numeric,
  accuracy_param numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_stats jsonb;
BEGIN
  -- Update participant score
  UPDATE winner_takes_all_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = now(),
    updated_at = now()
  WHERE session_id = session_id_param
    AND user_id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in session';
  END IF;
  
  -- Update session stats
  SELECT update_wta_session_stats(session_id_param, score_param)
  INTO v_stats;
  
  -- Return success with updated stats
  RETURN jsonb_build_object(
    'success', true,
    'score', score_param,
    'accuracy', accuracy_param,
    'stats', v_stats
  );
END;
$$;

-- Update 1v1 score function
CREATE OR REPLACE FUNCTION update_1v1_score(
  session_id_param uuid,
  user_id_param uuid,
  score_param numeric,
  accuracy_param numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_stats jsonb;
BEGIN
  -- Update participant score
  UPDATE one_v_one_participants
  SET 
    score = score_param,
    accuracy = accuracy_param,
    completed_at = now(),
    updated_at = now()
  WHERE session_id = session_id_param
    AND user_id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in session';
  END IF;
  
  -- Update session stats
  SELECT update_1v1_session_stats(session_id_param, score_param)
  INTO v_stats;
  
  -- Return success with updated stats
  RETURN jsonb_build_object(
    'success', true,
    'score', score_param,
    'accuracy', accuracy_param,
    'stats', v_stats
  );
END;
$$;

-- =================================================================
-- PART 3: FIX "NOT ALL LISTINGS PLAYABLE" ISSUE
-- =================================================================

-- Ensure all active configs have active sessions
DO $$
DECLARE
  v_config RECORD;
  v_session_id uuid;
BEGIN
  -- Hot Sell configs
  FOR v_config IN 
    SELECT id, title, base_price, max_participants, game_type
    FROM hot_sell_configs
  LOOP
    -- Check if active session exists
    IF NOT EXISTS (
      SELECT 1 FROM hot_sell_sessions
      WHERE config_id = v_config.id
        AND status = 'active'
    ) THEN
      -- Create active session
      INSERT INTO hot_sell_sessions (
        config_id,
        status,
        participants_count,
        prize_pool,
        rng_seed,
        starts_at,
        created_at,
        updated_at
      )
      VALUES (
        v_config.id,
        'active',
        0,
        0,
        floor(random() * 20) + 1,
        now(),
        now(),
        now()
      );
      
      RAISE NOTICE 'Created active session for Hot Sell config: %', v_config.title;
    END IF;
  END LOOP;
  
  -- Winner Takes All configs
  FOR v_config IN 
    SELECT id, title, entry_fee, max_participants, game_type
    FROM winner_takes_all_configs
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM winner_takes_all_sessions
      WHERE config_id = v_config.id
        AND status = 'active'
    ) THEN
      INSERT INTO winner_takes_all_sessions (
        config_id,
        status,
        participants_count,
        current_pot,
        rng_seed,
        starts_at,
        created_at,
        updated_at
      )
      VALUES (
        v_config.id,
        'active',
        0,
        0,
        floor(random() * 20) + 1,
        now(),
        now(),
        now()
      );
      
      RAISE NOTICE 'Created active session for Winner Takes All config: %', v_config.title;
    END IF;
  END LOOP;
  
  -- 1v1 configs
  FOR v_config IN 
    SELECT id, title, entry_fee, game_type
    FROM one_v_one_configs
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM one_v_one_sessions
      WHERE config_id = v_config.id
        AND status = 'active'
    ) THEN
      INSERT INTO one_v_one_sessions (
        config_id,
        status,
        participants_count,
        prize_pool,
        rng_seed,
        starts_at,
        created_at,
        updated_at
      )
      VALUES (
        v_config.id,
        'active',
        0,
        0,
        floor(random() * 20) + 1,
        now(),
        now(),
        now()
      );
      
      RAISE NOTICE 'Created active session for 1v1 config: %', v_config.title;
    END IF;
  END LOOP;
END $$;

-- =================================================================
-- VERIFICATION QUERIES
-- =================================================================

-- Check Hot Sell sessions and stats
SELECT 
  'Hot Sell' as game_type,
  c.title,
  c.game_type as specific_game,
  s.id as session_id,
  s.status,
  s.participants_count,
  s.prize_pool,
  c.max_participants,
  ROUND((s.participants_count::numeric / c.max_participants) * 100, 2) as progress_percent
FROM hot_sell_configs c
LEFT JOIN hot_sell_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.base_price;

-- Check Winner Takes All sessions
SELECT 
  'Winner Takes All' as game_type,
  c.title,
  c.game_type as specific_game,
  s.id as session_id,
  s.status,
  s.participants_count,
  s.current_pot,
  c.max_participants,
  ROUND((s.participants_count::numeric / c.max_participants) * 100, 2) as progress_percent
FROM winner_takes_all_configs c
LEFT JOIN winner_takes_all_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.entry_fee;

-- Check 1v1 sessions
SELECT 
  '1v1' as game_type,
  c.title,
  c.game_type as specific_game,
  s.id as session_id,
  s.status,
  s.participants_count,
  s.prize_pool,
  2 as max_participants,
  ROUND((s.participants_count::numeric / 2) * 100, 2) as progress_percent
FROM one_v_one_configs c
LEFT JOIN one_v_one_sessions s ON c.id = s.config_id AND s.status = 'active'
ORDER BY c.entry_fee;

/*
SUMMARY OF FIXES:
=================

1. ✅ Created update_*_session_stats() functions
   - Updates participants_count after each score
   - Recalculates prize_pool/current_pot
   - Returns progress_percent for UI

2. ✅ Modified update_*_score() functions
   - Now call session_stats updates
   - Return stats in response
   - Client can immediately update UI

3. ✅ Created missing active sessions
   - All configs now have playable sessions
   - Uses simple random()*20+1 for RNG seeds
   - Status = 'active' and ready to join

4. ✅ Verification queries
   - Check all game types
   - Show progress percentages
   - Identify any missing sessions

CLIENT-SIDE CHANGES NEEDED:
===========================

After running this SQL, update hot-sell/page.tsx:

const handleGameComplete = async (score: number, accuracy: number) => {
  // ... existing code ...
  
  const { data, error } = await executeRpcWithSession('update_hot_sell_score', {
    session_id_param: selectedGameFlow.sessionId,
    user_id_param: user.id,
    score_param: score,
    accuracy_param: accuracy
  });
  
  if (data && data.stats) {
    // Update UI immediately with returned stats
    console.log('Updated stats:', data.stats);
    // Progress bar: data.stats.progress_percent
    // Pool value: data.stats.prize_pool
    // Participants: data.stats.participants_count
  }
  
  // Refresh sessions to show changes
  await loadSessions();
};

RNG APPROACH:
=============

Keep simple RNG like practice games:
- rngSeed = Math.floor(Math.random() * 20) + 1
- Games use this seed for fairness
- No complex Mulberry32 affecting gameplay
- Matches working practice game behavior
*/

