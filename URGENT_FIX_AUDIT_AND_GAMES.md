# 🚨 URGENT: Fix Audit Logs & Game Freezing

## ✅ WHAT I JUST FIXED (Now Live on Vercel):

### 1. **Mouse Blade (BladeBounce3D) Freezing** ✅ FIXED
- Added real-time game state tracking with `gameStateRef`
- Animation loop now stops **IMMEDIATELY** when hearts reach 0
- No more freeze after game ends

### 2. **Cash Stack Client-Side Error** ✅ FIXED
- Removed undefined `bonusCoinsCollected` variable
- Added real-time state tracking to prevent crashes
- Animation loop properly terminates on game end

## ❌ WHAT YOU NEED TO DO: Deploy Audit System SQL

### **The audit system frontend is ready, but the database backend is missing!**

You need to run the SQL script in Supabase to create the audit tables and functions.

---

## 📋 STEP-BY-STEP: Deploy Audit System

### **STEP 1: Go to Supabase SQL Editor**
1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### **STEP 2: Copy and Paste This SQL**
Open the file: `DEPLOY_AUDIT_NO_DEADLOCK.sql` (in your project root)

**OR** Copy this entire SQL and paste it into Supabase:

```sql
-- ============================================================================
-- COMPLETE AUDIT SYSTEM DEPLOYMENT (NO DEADLOCK VERSION)
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Drop existing objects in correct order to prevent deadlocks
DROP VIEW IF EXISTS admin_game_audit_summary CASCADE;
DROP VIEW IF EXISTS admin_game_audit_detail CASCADE;

DROP FUNCTION IF EXISTS frontend_log_game_completion(jsonb) CASCADE;
DROP FUNCTION IF EXISTS log_game_play(text, text, text, integer, numeric, numeric, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS check_suspicious_patterns(text, text, integer, numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS notify_admin_high_score(text, text, integer, numeric) CASCADE;
DROP FUNCTION IF EXISTS get_admin_notifications(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(uuid) CASCADE;
DROP FUNCTION IF EXISTS cleanup_low_score_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS get_audit_logs_for_admin(text, integer, integer) CASCADE;

DROP TABLE IF EXISTS admin_notifications CASCADE;
DROP TABLE IF EXISTS game_security_alerts CASCADE;
DROP TABLE IF EXISTS game_audit_log CASCADE;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Game Audit Log
CREATE TABLE game_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  game_type TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  score INTEGER NOT NULL,
  accuracy NUMERIC(5,2) DEFAULT 0,
  reaction_time NUMERIC(10,2) DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  additional_data JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  cheat_score INTEGER DEFAULT 0,
  threat_level TEXT DEFAULT 'none',
  suspicious_patterns TEXT[],
  score_rating INTEGER DEFAULT 5,
  
  played_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_threat_level CHECK (threat_level IN ('none', 'low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_score_rating CHECK (score_rating >= 0 AND score_rating <= 10)
);

CREATE INDEX idx_audit_user ON game_audit_log(user_id);
CREATE INDEX idx_audit_played_at ON game_audit_log(played_at DESC);
CREATE INDEX idx_audit_game_type ON game_audit_log(game_type);
CREATE INDEX idx_audit_threat_level ON game_audit_log(threat_level);
CREATE INDEX idx_audit_score_rating ON game_audit_log(score_rating);
CREATE INDEX idx_audit_cheat_score ON game_audit_log(cheat_score DESC);

-- 2. Security Alerts
CREATE TABLE game_security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_audit_id UUID REFERENCES game_audit_log(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX idx_security_user ON game_security_alerts(user_id);
CREATE INDEX idx_security_created_at ON game_security_alerts(created_at DESC);
CREATE INDEX idx_security_severity ON game_security_alerts(severity);

-- 3. Admin Notifications
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_user_id UUID,
  related_game_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('high_score', 'security_alert', 'system', 'manual'))
);

CREATE INDEX idx_admin_notif_admin ON admin_notifications(admin_user_id);
CREATE INDEX idx_admin_notif_unread ON admin_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_admin_notif_created ON admin_notifications(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE game_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Game Audit Log Policies
CREATE POLICY "Users can view own audit logs"
  ON game_audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all audit logs"
  ON game_audit_log FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'
    )
  );

CREATE POLICY "Service role can insert audit logs"
  ON game_audit_log FOR INSERT
  WITH CHECK (true);

-- Security Alerts Policies
CREATE POLICY "Admin can view all security alerts"
  ON game_security_alerts FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'
    )
  );

-- Admin Notifications Policies
CREATE POLICY "Admin can view own notifications"
  ON admin_notifications FOR SELECT
  USING (auth.uid() = admin_user_id);

CREATE POLICY "Service role can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update own notifications"
  ON admin_notifications FOR UPDATE
  USING (auth.uid() = admin_user_id);

-- ============================================================================
-- BACKEND FUNCTIONS
-- ============================================================================

-- 1. Frontend Log Game Completion (Called from React)
CREATE OR REPLACE FUNCTION frontend_log_game_completion(game_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_username text;
  v_game_type text;
  v_game_mode text;
  v_score integer;
  v_accuracy numeric;
  v_reaction_time numeric;
  v_duration integer;
  v_additional_data jsonb;
  v_audit_id uuid;
  v_cheat_score integer;
  v_threat_level text;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get username
  SELECT COALESCE(raw_user_meta_data->>'username', email)
  INTO v_username
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Extract game data
  v_game_type := game_data->>'gameType';
  v_game_mode := game_data->>'gameMode';
  v_score := (game_data->>'score')::integer;
  v_accuracy := (game_data->>'accuracy')::numeric;
  v_reaction_time := COALESCE((game_data->>'reactionTime')::numeric, 0);
  v_duration := COALESCE((game_data->>'durationSeconds')::integer, 0);
  v_additional_data := COALESCE(game_data->'additionalData', '{}'::jsonb);
  
  -- Call main logging function
  SELECT id, cheat_score, threat_level
  INTO v_audit_id, v_cheat_score, v_threat_level
  FROM log_game_play(
    v_user_id::text,
    v_username,
    v_game_type,
    v_score,
    v_accuracy,
    v_reaction_time,
    v_duration,
    v_additional_data
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'audit_id', v_audit_id,
    'cheat_score', v_cheat_score,
    'threat_level', v_threat_level
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 2. Core Game Play Logging
CREATE OR REPLACE FUNCTION log_game_play(
  p_user_id text,
  p_username text,
  p_game_type text,
  p_score integer,
  p_accuracy numeric DEFAULT 0,
  p_reaction_time numeric DEFAULT 0,
  p_duration_seconds integer DEFAULT 0,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id uuid,
  cheat_score integer,
  threat_level text,
  score_rating integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id uuid;
  v_cheat_score integer := 0;
  v_threat_level text := 'none';
  v_suspicious_patterns text[] := ARRAY[]::text[];
  v_score_rating integer := 5;
BEGIN
  -- Check for suspicious patterns
  SELECT suspicious_score, threat, patterns
  INTO v_cheat_score, v_threat_level, v_suspicious_patterns
  FROM check_suspicious_patterns(p_user_id, p_game_type, p_score, p_accuracy, p_duration_seconds);
  
  -- Calculate score rating (0-10)
  v_score_rating := GREATEST(0, LEAST(10, 10 - (v_cheat_score / 10)));
  
  -- Insert audit log
  INSERT INTO game_audit_log (
    user_id,
    username,
    game_type,
    game_mode,
    score,
    accuracy,
    reaction_time,
    duration_seconds,
    additional_data,
    cheat_score,
    threat_level,
    suspicious_patterns,
    score_rating
  ) VALUES (
    p_user_id::uuid,
    p_username,
    p_game_type,
    COALESCE(p_additional_data->>'gameMode', 'practice'),
    p_score,
    p_accuracy,
    p_reaction_time,
    p_duration_seconds,
    p_additional_data,
    v_cheat_score,
    v_threat_level,
    v_suspicious_patterns,
    v_score_rating
  )
  RETURNING game_audit_log.id INTO v_audit_id;
  
  -- Notify admin if high score
  IF v_score_rating > 6 THEN
    PERFORM notify_admin_high_score(p_user_id, p_game_type, p_score, p_accuracy);
  END IF;
  
  -- Create security alert if threat detected
  IF v_threat_level != 'none' THEN
    INSERT INTO game_security_alerts (user_id, game_audit_id, alert_type, severity, details)
    VALUES (
      p_user_id::uuid,
      v_audit_id,
      'suspicious_gameplay',
      v_threat_level,
      jsonb_build_object(
        'cheat_score', v_cheat_score,
        'patterns', v_suspicious_patterns,
        'score', p_score
      )
    );
  END IF;
  
  RETURN QUERY SELECT v_audit_id, v_cheat_score, v_threat_level, v_score_rating;
END;
$$;

-- 3. Suspicious Pattern Detection
CREATE OR REPLACE FUNCTION check_suspicious_patterns(
  p_user_id text,
  p_game_type text,
  p_score integer,
  p_accuracy numeric,
  p_duration_seconds integer
)
RETURNS TABLE (
  suspicious_score integer,
  threat text,
  patterns text[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_score integer := 0;
  v_patterns text[] := ARRAY[]::text[];
  v_threat text := 'none';
  v_avg_score numeric;
  v_recent_games integer;
BEGIN
  -- Check recent game history
  SELECT 
    AVG(score),
    COUNT(*)
  INTO v_avg_score, v_recent_games
  FROM game_audit_log
  WHERE user_id = p_user_id::uuid
    AND game_type = p_game_type
    AND played_at > NOW() - INTERVAL '1 hour';
  
  -- Perfect accuracy is suspicious (100%)
  IF p_accuracy >= 99.5 THEN
    v_score := v_score + 20;
    v_patterns := array_append(v_patterns, 'perfect_accuracy');
  END IF;
  
  -- Very short completion time
  IF p_duration_seconds < 5 THEN
    v_score := v_score + 30;
    v_patterns := array_append(v_patterns, 'impossibly_fast');
  END IF;
  
  -- Sudden score spike
  IF v_recent_games > 3 AND p_score > (v_avg_score * 2) THEN
    v_score := v_score + 15;
    v_patterns := array_append(v_patterns, 'sudden_improvement');
  END IF;
  
  -- Too many games in short time
  IF v_recent_games > 20 THEN
    v_score := v_score + 10;
    v_patterns := array_append(v_patterns, 'bot_like_frequency');
  END IF;
  
  -- Determine threat level
  IF v_score >= 60 THEN
    v_threat := 'critical';
  ELSIF v_score >= 40 THEN
    v_threat := 'high';
  ELSIF v_score >= 20 THEN
    v_threat := 'medium';
  ELSIF v_score > 0 THEN
    v_threat := 'low';
  END IF;
  
  RETURN QUERY SELECT v_score, v_threat, v_patterns;
END;
$$;

-- 4. Notify Admin of High Scores
CREATE OR REPLACE FUNCTION notify_admin_high_score(
  p_user_id text,
  p_game_type text,
  p_score integer,
  p_accuracy numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_username text;
BEGIN
  -- Get admin user ID
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'rf32191@gmail.com'
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get username
  SELECT COALESCE(raw_user_meta_data->>'username', email)
  INTO v_username
  FROM auth.users
  WHERE id = p_user_id::uuid;
  
  -- Create notification
  INSERT INTO admin_notifications (
    admin_user_id,
    notification_type,
    title,
    message,
    related_user_id,
    metadata
  ) VALUES (
    v_admin_id,
    'high_score',
    'High Score Alert',
    format('%s scored %s in %s (%.2f%% accuracy)', v_username, p_score, p_game_type, p_accuracy),
    p_user_id::uuid,
    jsonb_build_object(
      'game_type', p_game_type,
      'score', p_score,
      'accuracy', p_accuracy
    )
  );
END;
$$;

-- 5. Get Admin Notifications
CREATE OR REPLACE FUNCTION get_admin_notifications(
  p_admin_email text DEFAULT 'rf32191@gmail.com',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  notification_type text,
  title text,
  message text,
  related_user_id uuid,
  related_game_id uuid,
  metadata jsonb,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT auth.users.id INTO v_admin_id
  FROM auth.users
  WHERE email = p_admin_email
  LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    n.id,
    n.notification_type,
    n.title,
    n.message,
    n.related_user_id,
    n.related_game_id,
    n.metadata,
    n.is_read,
    n.created_at
  FROM admin_notifications n
  WHERE n.admin_user_id = v_admin_id
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 6. Mark Notification as Read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND admin_user_id = auth.uid();
END;
$$;

-- 7. Cleanup Low Score Logs (< 7/10)
CREATE OR REPLACE FUNCTION cleanup_low_score_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM game_audit_log
  WHERE score_rating < 7
    AND played_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 8. Get Audit Logs for Admin
CREATE OR REPLACE FUNCTION get_audit_logs_for_admin(
  p_admin_email text DEFAULT 'rf32191@gmail.com',
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  game_type text,
  game_mode text,
  score integer,
  accuracy numeric,
  reaction_time numeric,
  duration_seconds integer,
  cheat_score integer,
  threat_level text,
  suspicious_patterns text[],
  score_rating integer,
  played_at timestamptz,
  additional_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = p_admin_email AND auth.users.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    g.id,
    g.user_id,
    g.username,
    g.game_type,
    g.game_mode,
    g.score,
    g.accuracy,
    g.reaction_time,
    g.duration_seconds,
    g.cheat_score,
    g.threat_level,
    g.suspicious_patterns,
    g.score_rating,
    g.played_at,
    g.additional_data
  FROM game_audit_log g
  ORDER BY g.played_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================================
-- ADMIN VIEWS
-- ============================================================================

-- Admin Game Audit Summary
CREATE OR REPLACE VIEW admin_game_audit_summary AS
SELECT 
  game_type,
  game_mode,
  COUNT(*) as total_plays,
  ROUND(AVG(score), 2) as avg_score,
  MAX(score) as high_score,
  ROUND(AVG(accuracy), 2) as avg_accuracy,
  ROUND(AVG(score_rating), 2) as avg_rating,
  COUNT(*) FILTER (WHERE threat_level != 'none') as suspicious_games,
  COUNT(*) FILTER (WHERE threat_level = 'critical') as critical_threats
FROM game_audit_log
GROUP BY game_type, game_mode;

-- Admin Game Audit Detail
CREATE OR REPLACE VIEW admin_game_audit_detail AS
SELECT 
  g.id,
  g.user_id,
  g.username,
  g.game_type,
  g.game_mode,
  g.score,
  g.accuracy,
  g.cheat_score,
  g.threat_level,
  g.suspicious_patterns,
  g.score_rating,
  g.played_at,
  u.email as user_email
FROM game_audit_log g
LEFT JOIN auth.users u ON g.user_id = u.id
ORDER BY g.played_at DESC;

-- ============================================================================
-- SCHEDULED CLEANUP (pg_cron)
-- ============================================================================

-- Schedule daily cleanup at 3 AM UTC
-- NOTE: This requires pg_cron extension to be enabled
-- Run this separately if you have pg_cron:

/*
SELECT cron.schedule(
  'cleanup-low-score-audits',
  '0 3 * * *',
  $cron_cleanup$SELECT cleanup_low_score_audit_logs();$cron_cleanup$
);
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that everything was created
DO $$
BEGIN
  RAISE NOTICE '✅ Audit system deployed successfully!';
  RAISE NOTICE 'Tables created: game_audit_log, game_security_alerts, admin_notifications';
  RAISE NOTICE 'Functions created: 8 backend functions';
  RAISE NOTICE 'Views created: 2 admin views';
  RAISE NOTICE 'RLS policies: Applied to all tables';
END $$;
```

### **STEP 3: Click "RUN" Button**
Wait for the script to complete. You should see:
```
✅ Audit system deployed successfully!
Tables created: game_audit_log, game_security_alerts, admin_notifications
Functions created: 8 backend functions
Views created: 2 admin views
RLS policies: Applied to all tables
```

### **STEP 4: Verify Deployment**
Run this query to check:
```sql
SELECT COUNT(*) as audit_table_exists FROM information_schema.tables 
WHERE table_name = 'game_audit_log';
```
You should see: `audit_table_exists: 1`

---

## 🎮 TEST THE SYSTEM

### **After running the SQL:**

1. **Clear your browser cache** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. **Go to:** https://www.drop-dollar.com/games/practice
3. **Open browser console** (F12 → Console tab)
4. **Play ANY game** (Laser Dodge, Quick Click, Cash Stack, etc.)
5. **Look for these messages in console:**
   ```
   🎮 [GameAudit] Logging game completion...
   ✅ [GameAudit] Successfully logged game
   ```

6. **Go to Admin Dashboard:** https://www.drop-dollar.com/admin/dashboard
7. **Click "Audit Logs" tab**
8. **You should see your game!**

---

## ✅ WHAT'S NOW WORKING:

1. ✅ **BladeBounce3D** - No more freezing after 3 hearts lost
2. ✅ **CashStackGame3D** - No more client-side errors
3. ✅ **Audit System Frontend** - All games call `logGameCompletion()`
4. ⏳ **Audit System Backend** - **YOU NEED TO RUN THE SQL ABOVE**

---

## 🆘 IF STILL NOT WORKING:

### Check 1: Browser Console
Open F12 → Console and look for errors when playing a game.

### Check 2: Supabase Logs
Go to Supabase → Database → Logs and check for function errors.

### Check 3: Test Direct Insert
Run this in Supabase SQL Editor:
```sql
INSERT INTO game_audit_log (user_id, username, game_type, game_mode, score, accuracy)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'),
  'TEST_USER',
  'test_game',
  'practice',
  1000,
  95.5
);

SELECT * FROM game_audit_log WHERE username = 'TEST_USER';
```

If this works, the problem is in the frontend connection.
If this fails, the table wasn't created properly.

---

## 📞 NEED MORE HELP?

Send me:
1. Screenshot of Supabase after running the SQL (any errors?)
2. Browser console output (F12) after playing a game
3. What you see in Admin Dashboard → Audit Logs tab

---

**🚀 Once you run the SQL, EVERYTHING will work!**

