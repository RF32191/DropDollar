# 🚀 Run All Fixes Now - Complete Instructions

## 📋 **Two SQL Files to Run:**

### 1️⃣ **Fix Winner Takes All Timer & Payout**
### 2️⃣ **Fix 1v1 Score Saving & Lockout**

---

## 🎯 **STEP 1: Fix Winner Takes All**

### File: `FIX_WTA_TIMER_PERSISTENCE_AND_PAYOUT.sql`

**What it fixes:**
- ✅ Timer persists on page reload
- ✅ Auto-payout triggers when timer expires
- ✅ Sessions don't reset prematurely (30-minute timer respected)

**How to run:**
1. Open Supabase SQL Editor
2. Copy entire contents of `FIX_WTA_TIMER_PERSISTENCE_AND_PAYOUT.sql`
3. Paste and Run
4. Look for success message showing sessions updated

---

## 🎯 **STEP 2: Fix 1v1 Game Issues**

### File: `FIX_1V1_SCORE_AND_LOCKOUT.sql`

**What it fixes:**
- ✅ Score saving function now works (no more "function not found" error)
- ✅ Players cannot join the same game twice
- ✅ Completed games show as locked

**How to run:**
1. Open Supabase SQL Editor (same window or new tab)
2. Copy entire contents of `FIX_1V1_SCORE_AND_LOCKOUT.sql`
3. Paste and Run
4. Look for success message showing functions verified

---

## 🧪 **Testing After Fixes:**

### Winner Takes All:
1. Join a game to start the timer
2. **Reload the page** - Timer should still be there and counting
3. Let timer reach 0:00
4. Auto-payout should trigger after 3 seconds
5. Winner gets tokens, session resets for next game

### 1v1:
1. Join a 1v1 game
2. Complete the game
3. **Try to join the same game again** - Should be locked out
4. Score should save properly without errors
5. When both players complete, payout triggers

---

## ⚠️ **Common Issues:**

### If Winner Takes All still doesn't work:
```sql
-- Run this to check if payout function exists:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'process_payout_by_config';
```

If it returns nothing, also run: `FIX_PAYOUT_SCORING_ERROR.sql`

### If 1v1 still doesn't work:
```sql
-- Run this to verify functions:
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('update_1v1_score', 'join_1v1_session');
```

Should return 2 rows. If not, re-run the SQL file.

---

## 📊 **Verification Queries:**

### Check Winner Takes All Sessions:
```sql
SELECT 
    config_id,
    status,
    timer_started_at,
    timer_duration,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN
            GREATEST(0, timer_duration - EXTRACT(EPOCH FROM (NOW() - timer_started_at))::INTEGER)
        ELSE NULL
    END as seconds_remaining
FROM winner_takes_all_sessions
WHERE config_id LIKE 'wta-%'
ORDER BY config_id;
```

### Check 1v1 Sessions:
```sql
SELECT 
    config_id,
    status,
    participants_count,
    current_pot,
    winner_user_id IS NOT NULL as has_winner
FROM one_v_one_sessions
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🎉 **Expected Results:**

After running both SQL files:

✅ Winner Takes All timer shows and persists on reload  
✅ Payout happens automatically at 0:00  
✅ 1v1 games save scores without errors  
✅ Players can't join the same game twice  
✅ All functions show in schema cache  

---

## 📞 **Need Help?**

If you're still seeing errors:
1. Check browser console for JavaScript errors
2. Check Supabase logs for SQL errors
3. Run the verification queries above
4. Make sure you're signed in to the correct Supabase project

---

**Run both SQL files in order, then test your games!** 🚀

