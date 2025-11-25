# 🚀 Deploy All Games Audit System

## Quick Deploy (3 Steps)

### Step 1: Deploy Core Audit System
Run this first if you haven't already:

**[COMPLETE_GAME_AUDIT_SYSTEM.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/COMPLETE_GAME_AUDIT_SYSTEM.sql)**

### Step 2: Fix & Complete Integration
Run this to fix the `score_rating` error and enable all features:

**[FIX_ALL_GAMES_AUDIT_COMPLETE.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/FIX_ALL_GAMES_AUDIT_COMPLETE.sql)**

### Step 3: Add Game-Specific Detection
Run this to add custom cheat detection for each game:

**[INTEGRATE_ALL_GAMES_AUDIT.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/INTEGRATE_ALL_GAMES_AUDIT.sql)**

---

## What This Does

### ✅ Auto-Logged Games (Already Working)
- **1v1 Games** - Automatically logged when players complete
- **Winner Takes It All** - Automatically logged when players complete

### ✅ Practice Games (Need Frontend Integration)
- **Laser Dodge**
- **Multi Target**
- **Sword Parry**
- **Quick Click**
- **Color Sequence**
- **Blade Bounce 3D**
- **Cash Stack**
- **Falling Objects**

---

## What Gets Tracked

For every game completion:
- ✅ **Username** - Player name
- ✅ **Score** - Final score
- ✅ **Rating** - 1-10 scale (e.g., 700 score = 7/10)
- ✅ **Cheat Score** - 0-100 (higher = more suspicious)
- ✅ **Threat Level** - CLEAN/LOW/MEDIUM/HIGH/CRITICAL
- ✅ **Duration** - Game length in seconds
- ✅ **Accuracy** - Hit rate (if applicable)
- ✅ **Reaction Time** - Average reaction speed (if applicable)
- ✅ **IP Address** - Player IP
- ✅ **Timestamp** - When played

---

## 24-Hour Cleanup

**Automatic deletion of low scores:**
- Scores rated **below 7/10** are deleted after 24 hours
- Scores rated **7/10 or higher** are kept forever
- Runs automatically daily at 3 AM UTC

**Manual cleanup:**
```sql
SELECT cleanup_low_score_audit_logs();
```

**Test cleanup:**
```sql
SELECT * FROM manual_cleanup_test();
```

---

## Admin Dashboard Queries

### View All Game Stats
```sql
SELECT * FROM admin_all_games_stats;
```

Shows per-game statistics for the last 7 days:
- Total plays
- Unique players
- Average score & rating
- High scores count (≥7/10)
- Suspicious plays
- Average cheat score

### View Detailed Audit Log
```sql
SELECT * FROM admin_detailed_audit_view 
ORDER BY created_at DESC 
LIMIT 50;
```

Shows every game with full details:
- Username, email
- Game type & mode
- Score & rating
- Cheat score & threat level
- Suspicious reasons
- Timestamp

### View Only High Scores
```sql
SELECT * FROM admin_detailed_audit_view 
WHERE score_rating >= 7.0
ORDER BY score_rating DESC, created_at DESC;
```

### View Only Suspicious Games
```sql
SELECT * FROM admin_detailed_audit_view 
WHERE cheat_score >= 60
ORDER BY cheat_score DESC, created_at DESC;
```

### View Specific Game Type
```sql
SELECT * FROM admin_detailed_audit_view 
WHERE game_type = 'laser_dodge'
ORDER BY created_at DESC
LIMIT 50;
```

---

## Admin Notifications

Admin RF32191 receives user messages for:

1. **High Scores** - Any game rated 7/10 or higher
2. **Suspicious Activity** - Cheat score ≥ 60
3. **Critical Threats** - Cheat score ≥ 80

Check notifications:
```sql
SELECT * FROM get_admin_notifications(50);
```

Mark as read:
```sql
SELECT mark_notification_read('notification-uuid-here');
```

---

## Practice Games Integration

For practice games to show in the audit log, add this to each game component:

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const logGameToAudit = async (score: number, accuracy?: number, reactionTime?: number, duration?: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'laser_dodge', // Change per game
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy || null,
      p_reaction_time: reactionTime || null,
      p_duration_seconds: duration || null,
      p_additional_data: null
    });

    if (error) {
      console.error('Audit log error:', error);
    } else {
      console.log('✅ Game logged', data);
    }
  } catch (err) {
    console.error('Failed to log game:', err);
  }
};

// Call when game ends
await logGameToAudit(finalScore, accuracy, avgReactionTime, durationSeconds);
```

See **[FRONTEND_GAME_INTEGRATION_GUIDE.md](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/FRONTEND_GAME_INTEGRATION_GUIDE.md)** for complete examples.

---

## Testing

### 1. Test Auto-Logging (1v1 & WTA)
1. Play a 1v1 or WTA game
2. Complete the game
3. Check audit log:
```sql
SELECT * FROM admin_detailed_audit_view 
WHERE game_type IN ('one_v_one', 'winner_takes_all')
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Test Manual Logging (Practice Games)
After adding the frontend integration:
1. Play a practice game
2. Complete the game
3. Check browser console for "✅ Game logged" message
4. Check audit log:
```sql
SELECT * FROM admin_detailed_audit_view 
WHERE game_mode = 'practice'
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Test Cleanup
```sql
-- See what would be cleaned
SELECT COUNT(*) FROM public.game_audit_log
WHERE score_rating < 7.0
AND created_at < NOW() - INTERVAL '24 hours';

-- Run cleanup test (detailed breakdown)
SELECT * FROM manual_cleanup_test();

-- Actually clean (run automatically daily)
SELECT cleanup_low_score_audit_logs();
```

### 4. Test High Score Notification
1. Play a game and score 700+ (7/10 or higher)
2. Check admin notifications:
```sql
SELECT * FROM get_admin_notifications(10);
```
3. Should see notification for RF32191

---

## Verification Checklist

After deployment, verify:

- [ ] `game_audit_log` table has `score_rating` column
- [ ] `game_audit_log` table has `max_score` column
- [ ] Existing records have `score_rating` calculated
- [ ] `admin_all_games_stats` view works (no column errors)
- [ ] `admin_detailed_audit_view` view works
- [ ] `frontend_log_game_completion` function exists
- [ ] `cleanup_low_score_audit_logs` function exists
- [ ] `manual_cleanup_test` function exists
- [ ] 1v1 trigger works (play a game to test)
- [ ] WTA trigger works (play a game to test)
- [ ] Cleanup job scheduled (if pg_cron available)

---

## Troubleshooting

### "Column score_rating does not exist"
Run: **FIX_ALL_GAMES_AUDIT_COMPLETE.sql**

### "No data in audit log"
- For 1v1/WTA: Play a complete game (both players finish)
- For practice: Add frontend integration (see guide)

### "Cleanup not running"
```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If not available, run manually daily:
SELECT cleanup_low_score_audit_logs();
```

### "Not receiving notifications"
```sql
-- Check if notifications exist
SELECT COUNT(*) FROM public.admin_notifications 
WHERE admin_email = 'rf32191@gmail.com';

-- Check if function works
SELECT notify_admin_high_score(
    auth.uid(), 
    'TestUser', 
    'test_game', 
    800, 
    1000
);
```

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Admin dashboard shows game statistics  
✅ Every 1v1/WTA game appears in audit log automatically  
✅ Practice games appear when frontend integration added  
✅ High scores (≥7/10) trigger notifications to RF32191  
✅ Low scores (<7/10) auto-delete after 24 hours  
✅ Cheat scores calculated for every game  
✅ Threat levels assigned (CLEAN → CRITICAL)  
✅ All queries run without errors  

---

**🚀 Deploy in order: Core → Fix → Integration → Test!**

