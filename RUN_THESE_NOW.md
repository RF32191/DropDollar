# 🚨 RUN THESE SQL FILES NOW IN THIS ORDER

## Step 1: Update the Payout Function
**File:** `SIMPLE_HOT_SELL_PAYOUT.sql`

This fixes the "record not assigned" error for 2-player games.

**In Supabase:**
1. Go to SQL Editor
2. Click "New query"
3. Copy ALL contents of `SIMPLE_HOT_SELL_PAYOUT.sql`
4. Paste and click "Run"

You should see:
```
✅ Simple Hot Sell payout function created!
📝 Mimics Winner Takes All pattern
🏆 Handles 1st, 2nd, 3rd place dynamically
🔄 Auto-resets session after payout
```

---

## Step 2: Reset All Listings
**File:** `RESET_HOT_SELL_NOW.sql`

This clears all current games and creates fresh sessions.

**In Supabase:**
1. Go to SQL Editor
2. Click "New query"
3. Copy ALL contents of `RESET_HOT_SELL_NOW.sql`
4. Paste and click "Run"

You should see:
```
All Hot Sell sessions reset!
waiting_sessions: 13
```

---

## Step 3: Test
1. Refresh Hot Sell page
2. Play $2 game with 2 players
3. After both complete, payout should trigger automatically
4. Listing should reset

---

## If You Still Get Errors

Check browser console for:
- `📊 [Hot Sell] Payout readiness check`
- `✅ [Hot Sell] ALL CONDITIONS MET!`
- `📊 [Hot Sell] Payout response`

Copy any error messages you see!

