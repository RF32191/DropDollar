# Quick Fix Guide - Run These Now

## 🚨 Two Issues Fixed

### Issue 1: Seller Registration Status Error ✅ FIXED
**Error:** `"seller_profiles_status_check" constraint violated`

**Fix:** Added `'draft'` to allowed status values

### Issue 2: 1v1 Payout Not Working ✅ FIXED  
**Problem:** Payouts and resets not happening after games complete

**Fix:** Updated payout function to require both players complete

---

## 🚀 Run These 2 Files IN ORDER:

### 1️⃣ FIRST: Fix Seller Profiles
**[FIX_SELLER_PROFILES_PERMANENT.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/FIX_SELLER_PROFILES_PERMANENT.sql)**

This will:
- ✅ Delete all incomplete registrations
- ✅ Fix status constraint (allow 'draft')
- ✅ Standardize to `user_id` column
- ✅ Update all registration functions
- ✅ New registrations start as 'draft'
- ✅ Only go to 'pending' when completed

### 2️⃣ SECOND: Fix 1v1 Payouts
**[FIX_1V1_PAYOUT_TRIGGER.sql](/Users/ryanjoshuafermoselle/CryptoMarket%20AutoBroker/FIX_1V1_PAYOUT_TRIGGER.sql)**

This will:
- ✅ Update payout function with better logic
- ✅ Ensure both players must complete before payout
- ✅ Fix session reset after payout
- ✅ NULL-safe token operations

---

## 📋 Expected Results

### After Running File #1:
```sql
🗑️ Deleting 3 incomplete seller registrations...
✅ Deleted 3 incomplete registrations
✅ Updated status constraint to allow draft
✅ Column standardized to: user_id
✅ All functions updated
```

**Test it:**
- Start seller registration
- Should work without status error
- Status = 'draft' until you complete all steps

### After Running File #2:
```sql
✅ Payout function: process_1v1_payout(config_id)
✅ Reset function: reset_1v1_session(config_id)
✅ Both players must complete before payout
✅ Automatic session reset after payout
```

**Test it:**
- Join 1v1 game as 2 players
- Both complete their games
- Wait 10 seconds
- Payouts should happen automatically
- Session should reset for next game

---

## 🧪 Testing Steps

### Test Seller Registration:
1. ✅ Run `FIX_SELLER_PROFILES_PERMANENT.sql`
2. Go to seller registration page
3. Start registration (should work!)
4. Check status: `SELECT status FROM seller_profiles WHERE user_id = auth.uid();`
5. Should show: `'draft'`
6. Complete all 7 steps
7. Check status again: Should show `'pending'`
8. Now shows in admin for approval ✅

### Test 1v1 Payouts:
1. ✅ Run `FIX_1V1_PAYOUT_TRIGGER.sql`
2. Create a 1v1 game
3. Join as Player 1
4. Join as Player 2 (different account)
5. Both players play and complete
6. Wait 10 seconds
7. Check won_tokens: `SELECT won_tokens FROM users WHERE id = auth.uid();`
8. Winner should have 50% of pot
9. Loser should have 35% of pot
10. Session should reset to 'waiting' ✅

---

## ⚠️ Important Notes

### For Seller Registration:
- Status values now: `'draft'`, `'pending'`, `'approved'`, `'rejected'`
- `'draft'` = incomplete (user is still filling out form)
- `'pending'` = complete (waiting for admin approval)
- Only `'pending'` and `'approved'` show in admin

### For 1v1 Payouts:
- Frontend must call `process_1v1_payout(config_id)` when both players complete
- Payout only happens when BOTH players have finished
- Automatic session reset after payout
- Safe for NULL tokens (won't crash)

---

## 🔍 Troubleshooting

### Seller Registration Still Fails?
```sql
-- Check current constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'seller_profiles_status_check';

-- Should include 'draft' in the constraint
```

### 1v1 Payouts Still Not Working?
```sql
-- Check if payout function exists
SELECT proname FROM pg_proc WHERE proname = 'process_1v1_payout';

-- Manually trigger payout for testing
SELECT process_1v1_payout('your-config-id-here');

-- Check session status
SELECT status, participants_count, winner_user_id 
FROM one_v_one_sessions 
WHERE config_id = 'your-config-id';
```

---

## ✅ Summary

**Two files to run:**
1. `FIX_SELLER_PROFILES_PERMANENT.sql` - Fixes seller registration
2. `FIX_1V1_PAYOUT_TRIGGER.sql` - Fixes 1v1 payouts

**Both are ready to run right now!** 🚀

Just copy, paste into Supabase SQL Editor, and run them in order.
