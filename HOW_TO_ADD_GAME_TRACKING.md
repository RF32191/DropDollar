# ✅ HOW TO ADD TRANSACTION TRACKING TO 1V1, WTA, HOT SELL

## 🎯 Goal
Make **1v1**, **Hot Sell (HS)**, and **Winner Takes All (WTA)** show spent tokens in history, just like Coin Play does.

## 📋 OPTION 1: Run the Complete SQL File (EASIEST)

**Just run this ONE file in Supabase:**
`DEPLOY_THIS_COMPLETE_TRANSACTION_TRACKING.sql`

This file already has:
- ✅ Coin Play tracking (working)
- ✅ WTA tracking 
- ✅ Hot Sell tracking
- ❌ 1v1 tracking (MISSING - we need to add it)

## 📋 OPTION 2: Manual Steps (if Option 1 doesn't work)

### Step 1: Run Helper Functions
Run `FIX_PURCHASE_HISTORY_NOW.sql` first (you already did this ✅)

### Step 2: Add Tracking to Each Game

For **EACH** game function, you need to add ONE LINE of code right after it deducts tokens.

#### 🎮 1v1 Games (`join_1v1_session`)

1. Go to Supabase → Database → Functions
2. Find `join_1v1_session` 
3. Look for the line that says: `UPDATE users SET tokens = tokens - [entry_fee]`
4. RIGHT AFTER that UPDATE, add:

```sql
-- CRITICAL: Save to user_transactions (for history tab)
v_transaction_id := save_entry_fee_to_user_transactions(
    p_user_id := p_user,
    p_entry_fee := p_entry_fee_param,
    p_description := format('1v1 Competition Entry'),
    p_competition_type := '1v1',
    p_competition_id := v_session_uuid::TEXT,
    p_game_type := v_game_type,
    p_metadata := jsonb_build_object(
        'session_id', v_session_uuid,
        'config_id', v_config_id,
        'entry_fee', p_entry_fee_param
    )
);
```

5. At the TOP of the function, add: `v_transaction_id UUID;`
6. Click "Confirm" to save

#### 🔥 Hot Sell (`hs_join_v2`)

If you ran `DEPLOY_THIS_COMPLETE_TRANSACTION_TRACKING.sql`, this is ALREADY DONE ✅

If not, add the same code after token deduction, but use:
- `p_competition_type := 'hotsell'`
- `p_description := format('Hot Sell Entry Fee')`

#### 👑 Winner Takes All (`wta_join_v2`)

If you ran `DEPLOY_THIS_COMPLETE_TRANSACTION_TRACKING.sql`, this is ALREADY DONE ✅

If not, add the same code after token deduction, but use:
- `p_competition_type := 'winner_takes_all'`
- `p_description := format('Winner Takes All Entry Fee')`

## 🔍 How to Verify It's Working

1. Play a game (1v1, WTA, or Hot Sell)
2. Go to your Token Wallet or Purchase History
3. You should see an entry like:
   - "1v1 Competition Entry - -0.25 Tokens"
   - "Hot Sell Entry Fee - -1.00 Tokens"
   - "Winner Takes All Entry Fee - -1.00 Tokens"

## ❓ Which Option Should You Use?

**RECOMMENDED:** Run `DEPLOY_THIS_COMPLETE_TRANSACTION_TRACKING.sql` in Supabase SQL Editor

This will:
- ✅ Create helper functions
- ✅ Update Coin Play (already working, won't break it)
- ✅ Update WTA to track entries
- ✅ Update Hot Sell to track entries
- ❌ MISSING 1v1 (you'll need to add manually using Option 2)

Then for 1v1, follow the manual steps above.

## 🚨 Important Notes

- Don't worry about breaking anything - the tracking code just ADDS to history, it doesn't change game logic
- If a game function doesn't have a variable like `v_game_type`, just pass `NULL` or the game name as a string
- If variable names are different, adjust them (e.g., `p_fee` instead of `p_entry_fee_param`)

## 📞 Need Help?

If you get errors, send me:
1. The error message
2. Which game function you're modifying
3. A screenshot of the function code

I'll give you the exact code to paste!

