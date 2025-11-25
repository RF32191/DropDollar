# 🎯 Complete Audit System Deployment Guide

## 📋 **Run These 3 Files in Order:**

### **1. COMPLETE_GAME_AUDIT_SYSTEM.sql**
Creates the foundation:
- ✅ `game_audit_log` table
- ✅ `game_security_alerts` table
- ✅ `admin_notifications` table
- ✅ Detection functions
- ✅ RLS policies

### **2. INTEGRATE_GAME_AUDIT_AUTO_LOG.sql**
Enables automatic logging:
- ✅ Database triggers for 1v1 games
- ✅ Database triggers for WTA games
- ✅ High score notifications (> 6/10)
- ✅ Suspicious activity alerts

### **3. AUTO_CLEANUP_LOW_SCORES.sql**
Cleanup system:
- ✅ Deletes low scores (< 7/10) after 24 hours
- ✅ Keeps high scores (≥ 7/10) permanently
- ✅ Keeps suspicious activity forever
- ✅ Auto-cleanup trigger

---

## 🧪 **Test the System:**

After running all 3 files, test with this SQL:

```sql
-- ============================================
-- TEST SCRIPT
-- ============================================

-- 1. Check tables exist
SELECT 
    'game_audit_log' as table_name, 
    COUNT(*) as row_count 
FROM game_audit_log
UNION ALL
SELECT 
    'game_security_alerts', 
    COUNT(*) 
FROM game_security_alerts
UNION ALL
SELECT 
    'admin_notifications', 
    COUNT(*) 
FROM admin_notifications;

-- 2. Check triggers exist
SELECT 
    trigger_name, 
    event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_log_1v1_game', 'trigger_log_wta_game', 'trigger_periodic_cleanup');

-- 3. Get audit statistics
SELECT * FROM get_audit_statistics();

-- 4. Check if you'll get notifications
SELECT 
    email,
    id as user_id
FROM auth.users 
WHERE email = 'rf32191@gmail.com';

-- 5. Test cleanup function (dry run)
SELECT cleanup_low_score_audits();
```

---

## 📊 **View Your Audit Logs:**

### **All Games (Admin View):**
```sql
SELECT 
    username,
    game_type,
    game_mode,
    score,
    score_rating,
    suspicious,
    created_at
FROM game_audit_log
ORDER BY created_at DESC
LIMIT 100;
```

### **High Scores Only (≥ 7/10):**
```sql
SELECT * FROM admin_high_score_audits
LIMIT 100;
```

### **Suspicious Activity:**
```sql
SELECT 
    username,
    game_type,
    score,
    cheat_score,
    suspicious_reasons,
    created_at
FROM game_audit_log
WHERE suspicious = TRUE
ORDER BY cheat_score DESC;
```

### **Your Notifications:**
```sql
SELECT 
    type,
    title,
    message,
    created_at
FROM user_notifications
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com'
)
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎮 **What Gets Logged:**

| Game Type | Auto-Logged? | Kept Forever? |
|-----------|--------------|---------------|
| 1v1 (score ≥ 700) | ✅ Auto | ✅ Yes |
| 1v1 (score < 700) | ✅ Auto | ❌ Deleted after 24h |
| WTA (score ≥ 700) | ✅ Auto | ✅ Yes |
| WTA (score < 700) | ✅ Auto | ❌ Deleted after 24h |
| Suspicious activity | ✅ Auto | ✅ Always kept |

---

## 📧 **Notifications You Get:**

### **1. High Score (> 6/10):**
```
🏆 High Score Alert: 8.5/10
Player: johndoe123
Game: one_v_one
Score: 850 (8.5/10)

Great performance! Review in Admin Dashboard.
```
- Sent to: rf32191@gmail.com (user_notifications)
- Trigger: Any score > 600

### **2. Suspicious Activity:**
```
🚨 Suspicious Activity: HIGH
User: cheater123
Game: winner_takes_all
Cheat Score: 75/100

Reasons:
- Bot-like speed: 12 games in 5 minutes
- Identical scores (possible bot)
```
- Sent to: rf32191@gmail.com (user_notifications)
- Trigger: Cheat score > 40

---

## 🧹 **Cleanup System:**

### **Automatic:**
- Runs on every INSERT (1% chance)
- Deletes scores < 7/10 older than 24 hours
- Never deletes suspicious activity
- Never deletes high scores (≥ 7/10)

### **Manual:**
```sql
-- Run cleanup now
SELECT admin_run_cleanup();

-- Check what will be deleted
SELECT COUNT(*) 
FROM game_audit_log
WHERE created_at < NOW() - INTERVAL '24 hours'
AND score_rating < 7
AND suspicious = FALSE;
```

---

## 📈 **Admin Dashboard Queries:**

### **Today's Summary:**
```sql
SELECT 
    COUNT(*) as games_today,
    COUNT(*) FILTER (WHERE score_rating >= 7) as high_scores,
    COUNT(*) FILTER (WHERE suspicious = TRUE) as suspicious,
    ROUND(AVG(score_rating), 2) as avg_score
FROM game_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### **Top Players:**
```sql
SELECT 
    username,
    COUNT(*) as games_played,
    ROUND(AVG(score_rating), 2) as avg_rating,
    MAX(score) as best_score
FROM game_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY username
ORDER BY avg_rating DESC, games_played DESC
LIMIT 20;
```

### **Leaderboard (High Scores Only):**
```sql
SELECT 
    username,
    game_type,
    score,
    score_rating,
    created_at
FROM game_audit_log
WHERE score_rating >= 7
ORDER BY score DESC, created_at DESC
LIMIT 100;
```

---

## 🔍 **Troubleshooting:**

### **"No audit logs showing (0)"**

**Check if triggers are active:**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_log_1v1_game', 'trigger_log_wta_game');
```

**Manually test logging:**
```sql
-- This simulates a game play
SELECT log_game_play(
    auth.uid(), -- your user ID
    'test_game',
    'test',
    gen_random_uuid(),
    850, -- score (8.5/10)
    95.5, -- accuracy
    0.25, -- reaction time
    60 -- duration
);

-- Check if it was logged
SELECT * FROM game_audit_log WHERE game_type = 'test_game';
```

**Check RLS policies:**
```sql
-- See what you can access
SELECT * FROM game_audit_log LIMIT 10;

-- If empty, check if you're admin
SELECT email FROM auth.users WHERE id = auth.uid();
```

### **"Triggers not firing"**

**Verify they exist:**
```sql
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE 'trigger_log_%';
```

**Test manually:**
```sql
-- Insert a test game score
INSERT INTO one_v_one_participants (session_id, user_id, score, completed_at)
VALUES (
    (SELECT id FROM one_v_one_sessions LIMIT 1),
    auth.uid(),
    850,
    NOW()
);

-- Check if audit log was created
SELECT * FROM game_audit_log ORDER BY created_at DESC LIMIT 1;
```

---

## ✅ **Success Checklist:**

After deployment, verify:

- [ ] Tables exist: `game_audit_log`, `game_security_alerts`, `admin_notifications`
- [ ] Triggers active: `trigger_log_1v1_game`, `trigger_log_wta_game`
- [ ] Functions exist: `log_game_play`, `cleanup_low_score_audits`
- [ ] Can query: `SELECT * FROM game_audit_log;`
- [ ] Statistics work: `SELECT * FROM get_audit_statistics();`
- [ ] Cleanup works: `SELECT admin_run_cleanup();`
- [ ] Play a game and see it in audit log
- [ ] Get notification for score > 6/10

---

## 🚀 **You're Done!**

Your audit system now:
- ✅ **Logs every game automatically**
- ✅ **Backs up all data to Supabase**
- ✅ **Notifies you of high scores (> 6/10)**
- ✅ **Detects suspicious activity**
- ✅ **Keeps high scores forever (≥ 7/10)**
- ✅ **Deletes low scores after 24h (< 7/10)**
- ✅ **Provides admin dashboard queries**

**Play a game and check your audit logs!** 🎯

