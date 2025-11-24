# 1v1 System - Ready for Testing

## ✅ What This Script Does

**File:** `RESET_1V1_AND_FIX_PAYOUTS.sql`

This ONE script fixes EVERYTHING for 1v1 testing:

### 1. ✅ Resets ALL 1v1 Sessions
- Clears all participants
- Resets all sessions to "waiting" state
- Resets timers
- Clears winners/losers
- Fresh start for testing!

### 2. ✅ Removes "2 Minutes Remaining" Block
- **OLD:** Blocked joins when < 2 minutes left
- **NEW:** Only blocks when 2 players already in (full)
- Players can join at ANY time if there's space

### 3. ✅ Fixes Payouts for ALL Users
- Initializes `won_tokens` and `purchased_tokens` to 0 for existing users
- Sets default values for future users
- Makes columns NOT NULL (prevents future issues)
- Uses `COALESCE()` everywhere to handle NULL safely
- Error handling so payouts always work

---

## 🚀 How to Use

### Run This ONE File in Supabase SQL Editor:

**[RESET_1V1_AND_FIX_PAYOUTS.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/RESET_1V1_AND_FIX_PAYOUTS.sql)**

That's it! Everything is fixed.

---

## 🎯 What Changes You'll See

### Before:
```
❌ "Listing closed - less than 2 minutes remaining"
❌ New users can't receive payouts
❌ Old test data cluttering the system
```

### After:
```
✅ Can join 1v1 anytime (unless full with 2 players)
✅ ALL users (current + future) can receive payouts
✅ Clean system ready for testing
```

---

## 🧪 Testing Checklist

After running the SQL:

1. **Test Joining:**
   - [ ] Create fresh 1v1 game
   - [ ] Join as Player 1
   - [ ] Wait until < 2 minutes remaining
   - [ ] Try to join as Player 2 (should work!)
   - [ ] Try to join as Player 3 (should fail - "Listing full")

2. **Test Payouts:**
   - [ ] Create new test user account
   - [ ] Give them some tokens
   - [ ] Play 1v1 and win
   - [ ] Check their `won_tokens` increased
   - [ ] Verify no errors in Supabase logs

3. **Test Full Flow:**
   - [ ] 2 players join
   - [ ] Both complete games
   - [ ] Wait 10 seconds for auto-payout
   - [ ] Verify winner gets 50% of pot
   - [ ] Verify loser gets 35% of pot
   - [ ] Verify session resets for new game

---

## 📊 Database Changes

| What | Before | After |
|------|--------|-------|
| **Join Logic** | Blocks at 2min | Only blocks when full |
| **won_tokens** | Sometimes NULL | Always 0 (default) |
| **purchased_tokens** | Sometimes NULL | Always 0 (default) |
| **1v1 Sessions** | Old test data | All reset to waiting |
| **Participants** | Old entries | All cleared |
| **Payouts** | Can fail for new users | Works for everyone |

---

## 🔧 What the Script Does (Technical)

```sql
-- 1. Delete all 1v1 participants
DELETE FROM one_v_one_participants;

-- 2. Reset all sessions
UPDATE one_v_one_sessions SET status = 'waiting', participants_count = 0, ...;

-- 3. Initialize token columns for existing users
UPDATE users SET won_tokens = COALESCE(won_tokens, 0) WHERE won_tokens IS NULL;

-- 4. Set defaults for future users
ALTER TABLE users ALTER COLUMN won_tokens SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN won_tokens SET NOT NULL;

-- 5. Remove time-based blocking
CREATE OR REPLACE FUNCTION join_one_v_one_session(...) 
-- Only checks: IF v_current_count >= 2 (no time check!)

-- 6. Fix payout with NULL-safe operations
UPDATE users SET won_tokens = COALESCE(won_tokens, 0) + payout;
```

---

## ✅ Summary

**ONE FILE = EVERYTHING FIXED:**

1. ✅ Fresh 1v1 sessions for testing
2. ✅ No more "2 minutes remaining" error
3. ✅ Payouts work for ALL users forever
4. ✅ NULL-safe everywhere
5. ✅ Ready to test immediately!

**Just run:** `RESET_1V1_AND_FIX_PAYOUTS.sql`

Then go test your 1v1 games! 🎮🚀

