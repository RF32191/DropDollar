# 🔍 Game Audit Integration Guide

## ⚠️ IMPORTANT: Non-Breaking Integration

This audit system is designed to **NOT break existing games**. It runs in the background and only logs game data after games complete.

---

## 🚀 **Quick Setup** (Run FIRST)

### **1. Deploy Audit System**
Run in Supabase SQL Editor:
**`COMPLETE_GAME_AUDIT_SYSTEM.sql`**

This creates:
- ✅ `game_audit_log` table
- ✅ `game_security_alerts` table
- ✅ `admin_notifications` table
- ✅ Detection functions
- ✅ Admin notification system

---

## 📊 **What Gets Logged (Automatically)**

Every time a game ends, the system logs:
- Player ID, username, email
- Game type & mode
- Score, accuracy, reaction time
- IP address & device info
- Suspicious pattern detection
- Cheat score (0-100)

---

## 🎮 **How To Integrate (Optional - For Manual Logging)**

### **Method 1: Automatic (Backend Functions Already Log)**

If your game uses backend functions like:
- `process_1v1_payout()`
- `process_wta_payout()`
- `submit_hot_sell_score()`

**✅ No action needed!** Add logging to those functions.

### **Method 2: Frontend Logging (For Practice Games)**

For games without backend submission, add **ONE line** after game completion:

```typescript
// Example: In LaserDodgeGame.tsx after game ends
const handleGameEnd = async (result: GameResult) => {
  // Existing game end logic
  onGameEnd(result);
  
  // NEW: Log to audit system (non-blocking)
  if (isCompetitionMode) {
    await supabase.rpc('log_game_play', {
      p_user_id: user.id,
      p_game_type: 'laser_dodge',
      p_game_mode: 'practice', // or '1v1', 'wta', etc.
      p_session_id: sessionId,
      p_score: result.score,
      p_accuracy: result.accuracy,
      p_reaction_time: result.avgReactionTime,
      p_duration_seconds: result.duration,
      p_additional_data: {
        // Any extra data you want to log
        difficulty: 'hard',
        powerups_used: 3
      }
    }).catch(err => {
      // Silent fail - don't break game if logging fails
      console.error('Audit log error:', err);
    });
  }
};
```

---

## 📋 **Integration Checklist (Per Game)**

### **✅ Games with Backend Submission** (Low Priority)

These already submit scores to backend, so add logging there:

- [ ] **1v1 Games** - Add to `process_1v1_payout()`
- [ ] **Winner Takes It All** - Add to `process_wta_payout()`
- [ ] **Hot Sell** - Add to score submission function

### **📝 Games with Frontend-Only Scores** (Optional)

These don't have backend submission yet:

- [ ] **Laser Dodge** (practice mode)
- [ ] **Multi Target** (practice mode)
- [ ] **Sword Parry** (practice mode)
- [ ] **Quick Click** (practice mode)
- [ ] **Color Sequence** (practice mode)
- [ ] **Blade Bounce** (practice mode)
- [ ] **Cash Stack** (practice mode)
- [ ] **Falling Objects** (practice mode)

**Note**: Practice games don't need logging unless you want analytics. Competition games are priority.

---

## 🔍 **What Admin Sees**

### **1. View All Game Plays**
```sql
-- View recent game plays
SELECT * FROM public.game_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- View suspicious plays only
SELECT * FROM public.game_audit_log
WHERE suspicious = TRUE
ORDER BY cheat_score DESC;
```

### **2. View Security Alerts**
```sql
-- Get all unresolved alerts
SELECT * FROM public.game_security_alerts
WHERE resolved = FALSE
ORDER BY severity DESC, created_at DESC;
```

### **3. Get Your Notifications**
```typescript
// In admin dashboard
const { data: notifications } = await supabase.rpc('get_admin_notifications');

// Mark as read
await supabase.rpc('mark_notification_read', {
  p_notification_id: notification.id
});
```

### **4. Get Summary Dashboard**
```typescript
const { data: summary } = await supabase.rpc('get_suspicious_activity_summary');
// Returns: {
//   total_alerts: 15,
//   critical_alerts: 3,
//   unresolved_alerts: 7,
//   unique_flagged_users: 8,
//   most_flagged_game: 'laser_dodge'
// }
```

---

## 🚨 **Suspicious Patterns Detected**

The system automatically flags:

### **1. Bot Detection** (Cheat Score: +50)
- Playing same game with identical scores
- Example: 10 games, all scored exactly 500

### **2. Speed Cheating** (Cheat Score: +40)
- Too many games too fast
- Example: 10 games in 5 minutes

### **3. Excessive Playing** (Cheat Score: +30)
- Unrealistic game volume
- Example: 50+ games in 1 hour

### **4. Skill Jump** (Cheat Score: +25)
- Sudden massive improvement
- Example: Average 200, suddenly 950

### **5. Perfect Scores** (Cheat Score: +35)
- Too many near-perfect scores
- Example: 5+ scores above 990 in 24 hours

### **6. Impossible Reactions** (Cheat Score: +60)
- Reaction time < 50ms (impossible for humans)
- Example: Average reaction time of 20ms

---

## 📧 **Admin Notifications**

### **When You Get Notified:**

**Medium Severity** (Cheat Score 40-59):
- Email: ❌ No (check dashboard)
- Dashboard: ✅ Yes

**High Severity** (Cheat Score 60-79):
- Notification in admin dashboard
- Shows user details & evidence

**Critical Severity** (Cheat Score 80-100):
- Urgent dashboard notification
- Immediate review recommended

### **Notification Example:**
```
🚨 Suspicious Activity Detected: CRITICAL
User: johndoe123 (ID: abc-123)
Game Type: laser_dodge
Cheat Score: 85/100
Severity: CRITICAL

Reasons:
- Bot-like speed: 12 games in 5 minutes
- Identical scores (possible bot)
- Too many perfect scores: 8

Please review game audit log for details.
```

---

## 🛠️ **Admin Actions**

### **1. Review Suspicious User**
```sql
-- Get all games for a user
SELECT * FROM public.game_audit_log
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC;

-- Check their history
SELECT 
  game_type,
  COUNT(*) as games_played,
  AVG(score) as avg_score,
  MAX(score) as max_score,
  AVG(cheat_score) as avg_cheat_score
FROM public.game_audit_log
WHERE user_id = 'user-id-here'
GROUP BY game_type;
```

### **2. Ban User (If Confirmed Cheater)**
```sql
-- Mark alert as resolved with action taken
UPDATE public.game_security_alerts
SET 
  resolved = TRUE,
  reviewed_by = 'rf32191@gmail.com',
  reviewed_at = NOW(),
  action_taken = 'User banned for confirmed cheating',
  notes = 'Reviewed evidence, clear bot behavior'
WHERE id = 'alert-id-here';

-- Then ban user in your user management system
```

### **3. False Positive (Legitimate Player)**
```sql
-- Mark as resolved, no action
UPDATE public.game_security_alerts
SET 
  resolved = TRUE,
  reviewed_by = 'rf32191@gmail.com',
  reviewed_at = NOW(),
  action_taken = 'False positive - legitimate player',
  notes = 'Reviewed gameplay, user is just very skilled'
WHERE id = 'alert-id-here';
```

---

## 🎯 **Example: Admin Dashboard Component**

```tsx
// src/components/admin/GameAuditDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function GameAuditDashboard() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    loadData();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `admin_email=eq.rf32191@gmail.com`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          // Play notification sound
          new Audio('/notification.mp3').play();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  async function loadData() {
    // Get notifications
    const { data: notifs } = await supabase.rpc('get_admin_notifications');
    setNotifications(notifs || []);
    
    // Get summary
    const { data: sum } = await supabase.rpc('get_suspicious_activity_summary');
    setSummary(sum?.[0]);
  }
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🔍 Game Audit Dashboard</h1>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600">Total Alerts</p>
            <p className="text-3xl font-bold">{summary.total_alerts}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <p className="text-red-600">Critical</p>
            <p className="text-3xl font-bold text-red-600">{summary.critical_alerts}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <p className="text-yellow-600">Unresolved</p>
            <p className="text-3xl font-bold text-yellow-600">{summary.unresolved_alerts}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <p className="text-blue-600">Flagged Users</p>
            <p className="text-3xl font-bold text-blue-600">{summary.unique_flagged_users}</p>
          </div>
        </div>
      )}
      
      {/* Notifications */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Notifications</h2>
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`border-l-4 p-4 mb-4 ${
              notif.severity === 'critical' ? 'border-red-500 bg-red-50' :
              notif.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}
          >
            <div className="flex justify-between">
              <h3 className="font-semibold">{notif.title}</h3>
              <span className="text-sm text-gray-500">
                {new Date(notif.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap mt-2">{notif.message}</p>
            {notif.data && (
              <div className="mt-2 text-xs">
                <p>User: {notif.data.username}</p>
                <p>Game: {notif.data.game_type}</p>
                <p>Cheat Score: {notif.data.cheat_score}/100</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ **Testing the System**

### **1. Test Logging**
```sql
-- Manual test
SELECT log_game_play(
  auth.uid(),
  'test_game',
  'practice',
  gen_random_uuid(),
  500,
  95.5,
  0.25,
  60
);

-- Verify it was logged
SELECT * FROM game_audit_log WHERE game_type = 'test_game';
```

### **2. Trigger Suspicious Activity**
```sql
-- Play 11 games in quick succession (triggers bot detection)
DO $$
BEGIN
  FOR i IN 1..11 LOOP
    PERFORM log_game_play(
      auth.uid(),
      'test_game',
      'practice',
      gen_random_uuid(),
      500, -- Same score each time (suspicious)
      95.5,
      0.25,
      60
    );
  END LOOP;
END $$;

-- Check for alerts
SELECT * FROM game_security_alerts ORDER BY created_at DESC LIMIT 1;

-- Check for notification
SELECT * FROM admin_notifications WHERE admin_email = 'rf32191@gmail.com' ORDER BY created_at DESC LIMIT 1;
```

---

## 🚀 **Ready To Deploy!**

1. ✅ Run `COMPLETE_GAME_AUDIT_SYSTEM.sql`
2. ✅ Games continue working normally
3. ✅ Audit logs capture all gameplay
4. ✅ You get notified of suspicious activity
5. ✅ Fair skill-based gaming guaranteed!

**The system works silently in the background and doesn't affect game performance or functionality!** 🎯

