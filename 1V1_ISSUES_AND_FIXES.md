# 1v1 Game Issues & Fixes

## 🚨 Issues Reported

### Issue 1: "Listing closed - less than 2 minutes remaining"
**Status:** ✅ This is actually working as designed!

**What's Happening:**
- When a 1v1 game timer has less than 2 minutes (120 seconds) remaining, new players are blocked from joining
- This prevents unfair last-second entries where players wouldn't have enough time to compete

**Why It Exists:**
```sql
-- From join_one_v_one_session function
IF v_time_remaining <= 120 THEN
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Listing closed - less than 2 minutes remaining'
    );
END IF;
```

**Solution:**
This is intentional! If you want to change this behavior:
- Reduce the cutoff time (currently 120 seconds)
- Or remove the check entirely (not recommended for fair play)

---

### Issue 2: Payout Failing for New Users
**Status:** ⚠️ NEEDS FIX

**What's Happening:**
- New users who win 1v1 games aren't receiving their payouts
- The issue is that new users have `won_tokens = NULL` instead of `0`
- The payout tries to do `NULL + prize_amount` which can cause issues
- Transaction logging might also fail for new users

**Root Cause:**
```sql
-- New users don't have won_tokens initialized
UPDATE users
SET won_tokens = won_tokens + prize_amount  -- NULL + 100 = NULL (WRONG!)
WHERE id = winner_id;
```

**The Fix:**
```sql
-- Use COALESCE to handle NULL
UPDATE users
SET won_tokens = COALESCE(won_tokens, 0) + prize_amount  -- COALESCE(NULL, 0) + 100 = 100 (CORRECT!)
WHERE id = winner_id;
```

---

## 🔧 How to Fix

### Run This SQL File:

**[FIX_1V1_PAYOUT_NEW_USERS.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/FIX_1V1_PAYOUT_NEW_USERS.sql)**

This will:
1. ✅ Initialize all existing users' `won_tokens` and `purchased_tokens` to `0` if NULL
2. ✅ Set default values for these columns to prevent future NULL issues
3. ✅ Update the `process_1v1_payout` function with:
   - Better error handling
   - NULL-safe token updates
   - Transaction logging that won't block payouts if it fails
   - Detailed logging for debugging

---

## 🎯 What the Fix Does

### Before Fix:
```
User wins 1v1 game
  ↓
Payout tries: NULL + 500 tokens
  ↓
❌ ERROR: Payout fails
  ↓
User gets nothing 😢
```

### After Fix:
```
User wins 1v1 game
  ↓
Payout does: COALESCE(NULL, 0) + 500 = 500 tokens
  ↓
✅ SUCCESS: User gets 500 tokens
  ↓
User is happy! 🎉
```

---

## 🧪 Testing After Fix

1. Create a fresh test account (new user with no tokens)
2. Buy some tokens to enter a 1v1 game
3. Play and win the game
4. Check that tokens are credited to `won_tokens`
5. Verify you can see them in your wallet

---

## 📋 Quick Checklist

- [ ] Run `FIX_1V1_PAYOUT_NEW_USERS.sql` in Supabase SQL Editor
- [ ] Test with a new user account
- [ ] Verify payouts work correctly
- [ ] Check the Supabase logs for any remaining errors

---

## ⚠️ About the "2 Minutes Remaining" Block

This is intentional game design:
- **Fair Play:** Prevents players from joining at the last second
- **Time to Compete:** Ensures all players have adequate time to play
- **Prevents Sniping:** Stops players from waiting until the last moment to enter

**If you want to change it:**
1. Find the `join_one_v_one_session` function in your database
2. Change `IF v_time_remaining <= 120` to a different value (in seconds)
3. Or remove the check entirely (not recommended)

**Recommended values:**
- 120 seconds (2 minutes) - Current, good for fair play ✅
- 60 seconds (1 minute) - More flexible, but risky ⚠️
- 0 seconds - No restriction (NOT recommended) ❌

---

## 💡 Summary

| Issue | Severity | Fix Required |
|-------|----------|--------------|
| "2 minutes remaining" block | 🟢 None | This is intentional! |
| New user payout failing | 🔴 High | Run `FIX_1V1_PAYOUT_NEW_USERS.sql` |

Run the SQL fix now to ensure all users (especially new ones) can receive their 1v1 game winnings! 🎮💰

