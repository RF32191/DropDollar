# Client-Side Timer Persistence Fix

## 🔍 Problem Identified:

The Winner Takes All timer and auto-payout system has these issues:

1. **Timer Not Persisting**: When you reload the page, `autoPayoutTriggered` state is lost
2. **Auto-Payout Not Triggering**: The client-side check relies on `autoPayoutTriggered` Set which resets on page reload
3. **Duplicate Payouts**: Without persistent tracking, the same session could trigger multiple payouts

## ✅ Solution:

### Current Implementation (Lines 338-381 in page.tsx):
```typescript
// CONDITIONAL AUTO-PAYOUT: If payout button not clicked within 3 seconds, auto-activate
useEffect(() => {
  const checkInterval = setInterval(() => {
    sessions.forEach((session) => {
      if (session.status === 'active' && session.timer_started_at) {
        const timeRemaining = calculateTimeRemaining(session);
        
        // Check if timer has expired and payout hasn't been triggered yet
        if (timeRemaining && timeRemaining.total <= 0) {
          const sessionKey = session.config_id;
          
          // Only trigger if not already triggered for this session
          if (!autoPayoutTriggered.has(sessionKey)) {
            // ... auto-payout logic ...
          }
        }
      }
    });
  }, 1000); // Check every second

  return () => clearInterval(checkInterval);
}, [sessions, autoPayoutTriggered]);
```

### Issue:
- `autoPayoutTriggered` is a React state that resets on page reload
- This means if a timer expires and you reload before payout completes, it could trigger again

## 🔧 Recommended Fix:

The SQL function `check_and_payout_expired_sessions()` I just created will handle this better server-side.

However, the **client-side logic is actually fine** for immediate feedback because:

1. ✅ The SQL function `process_payout_by_config` already checks if payout was done:
   ```sql
   IF session_record.status = 'completed' AND session_record.winner_user_id IS NOT NULL THEN
       RETURN jsonb_build_object('success', true, 'message', 'Session already paid out');
   ```

2. ✅ The timer data persists in the database (`timer_started_at`, `timer_duration`)

3. ✅ The `calculateTimeRemaining` function correctly calculates remaining time from the database value

## 🎯 What Actually Needs to Change:

### Nothing in the Client! The issue is the `conditional_wta_reset` function:

The old version in `COMPREHENSIVE_FIXES_FOR_WTA_AND_AUTH.sql` line 26:
```sql
OR (status = 'active' AND timer_started_at IS NOT NULL 
    AND (timer_started_at + INTERVAL '1 minute') < NOW())  -- ❌ WRONG! Should be 30 minutes
```

This was resetting active sessions after just 1 minute, which is why:
- Timer would disappear on reload (session was reset)
- Payout couldn't happen (session was reset before timer expired)

### The Fix (Already Applied in FIX_WTA_TIMER_PERSISTENCE_AND_PAYOUT.sql):
```sql
OR (status = 'active' AND timer_started_at IS NOT NULL 
    AND (timer_started_at + INTERVAL '30 minutes') < NOW())  -- ✅ CORRECT!
```

## 📝 Summary:

**You don't need to change the client-side code!** 

The fix is entirely in the SQL:
1. ✅ Updated `conditional_wta_reset()` to respect 30-minute timer
2. ✅ Ensured `get_all_winner_takes_all_sessions()` returns timer data
3. ✅ Created `check_and_payout_expired_sessions()` for optional backend automation
4. ✅ Verified all sessions have `timer_duration = 1800` (30 minutes)

## 🚀 To Apply the Fix:

```bash
# Run the SQL file in Supabase SQL Editor
cat FIX_WTA_TIMER_PERSISTENCE_AND_PAYOUT.sql
```

Or copy/paste the entire contents into Supabase SQL Editor and run it.

## 🧪 Testing After Fix:

1. Join a Winner Takes All game to start the timer
2. Reload the page - timer should still be counting down
3. Wait for timer to reach 0:00
4. Payout should trigger automatically after 3 seconds
5. Session should show winner and eventually reset for new game

## ⚠️ Important Notes:

- The 3-second delay in auto-payout is intentional (gives users a chance to manually trigger if needed)
- The `autoPayoutTriggered` state prevents duplicate client-side triggers within a single page session
- The SQL function `process_payout_by_config` prevents duplicate payouts even if called multiple times
- The timer persists because it's stored in `timer_started_at` column in the database

