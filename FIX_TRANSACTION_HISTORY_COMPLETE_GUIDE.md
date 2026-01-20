# 🔧 FIX TRANSACTION HISTORY - COMPLETE GUIDE

## 🚨 THE PROBLEM

Your console logs show:
- ✅ **120 games played** - stored in `game_history` table
- ✅ **3 purchases made** - stored in `user_transactions` table  
- ❌ **0 competition/practice games recognized** - frontend can't categorize them
- ❌ **0 winnings shown** - no entries in `user_transactions` for game wins/losses

**Why?** Your existing game functions (WTA, Hot Sell, 1v1, Coin Play) are NOT saving entries/payouts to the `user_transactions` table. They only save to `game_history`.

---

## ✅ THE SOLUTION

### Step 1: Deploy the Transaction Query Function

Run this SQL in your Supabase SQL Editor:

```sql
-- This allows the frontend to fetch comprehensive transaction history
CREATE OR REPLACE FUNCTION get_user_all_transactions(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    type TEXT,
    amount DECIMAL(10,2),
    description TEXT,
    status TEXT,
    competition_type TEXT,
    competition_id TEXT,
    game_type TEXT,
    tokens_purchased INTEGER,
    tokens_won INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ut.id,
        ut.type,
        ut.amount,
        ut.description,
        ut.status,
        ut.competition_type,
        ut.competition_id,
        ut.game_type,
        ut.tokens_purchased,
        ut.tokens_won,
        ut.metadata,
        ut.created_at
    FROM public.user_transactions ut
    WHERE ut.user_id = user_id_param
    ORDER BY ut.created_at DESC
    LIMIT 200;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_all_transactions(UUID) TO authenticated;
```

**This function already exists in `RUN_THIS_TO_FIX_HISTORY.sql` if you want to use that file.**

---

### Step 2: Update Your Game Functions

**YOU MUST UPDATE EACH GAME'S JOIN AND PAYOUT FUNCTIONS** to call the helper functions that save to `user_transactions`. 

The helper functions already exist (from `COMPLETE_TRANSACTION_HISTORY_FOR_ALL_GAMES.sql`):
- `save_entry_fee_to_user_transactions()` - saves entry fees
- `save_payout_to_user_transactions()` - saves victories

#### Example for WTA Join Function

Find your **current deployed** `wta_join_v2` function and add this **AFTER** the token deduction:

```sql
-- After deducting tokens, add:
PERFORM save_entry_fee_to_user_transactions(
    p_user_id := p_user,
    p_entry_fee := p_fee,
    p_description := format('Winner Takes All Entry - %s', v_game_type),
    p_competition_type := 'winner_takes_all',
    p_competition_id := v_session::TEXT,
    p_game_type := v_game_type,
    p_metadata := jsonb_build_object('session_id', v_session)
);
```

#### Example for WTA Payout Function

Find your **current deployed** WTA payout function (likely `process_wta_payout` or similar) and add this **AFTER** awarding tokens to the winner:

```sql
-- After awarding tokens to winner, add:
PERFORM save_payout_to_user_transactions(
    p_user_id := v_winner_id,
    p_type := 'game_win',
    p_amount := v_prize_amount,
    p_description := format('Winner Takes All Victory - %s', v_game_type),
    p_competition_type := 'winner_takes_all',
    p_competition_id := p_session_id::TEXT,
    p_game_type := v_game_type,
    p_tokens_won := v_prize_amount::INTEGER,
    p_metadata := jsonb_build_object('session_id', p_session_id, 'rank', 1)
);
```

#### Do the same for:
- **Hot Sell** (`hs_join_v2`, Hot Sell payout functions)
- **1v1** (join and payout functions)
- **Coin Play** (join and payout functions)

---

### Step 3: ⚠️ CRITICAL - Where to Find Your Functions

**DO NOT create new functions.** Find the **ACTUAL DEPLOYED FUNCTIONS** in your Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor → Functions
2. Search for:
   - `wta_join_v2`
   - `hs_join_v2`
   - `process_wta_payout` (or whatever your payout function is called)
   - `save_hot_sell_payout`
   - Any 1v1 join/payout functions
   - Any coin_play join/payout functions

3. **Edit those functions** to add the helper function calls as shown above.

---

## 🎯 WHAT THIS FIXES

### ✅ For NEW Games (played after you update the functions):
- Entry fees will show in transaction history
- Victories will show in transaction history
- "Complete Transaction History" tab will show purchases + entries + wins

### ❌ For OLD Games (your existing 120 games):
- **These will NOT appear in transaction history** because they were played before the tracking was added
- They will STILL appear in:
  - Game History table
  - Competition History section
  - Recent Games tab
- **Only the transactions (entry/payout) won't be in the history tab**

---

## 🔍 HOW TO VERIFY IT WORKS

1. Deploy Step 1 (query function)
2. Update your game functions (Step 2)
3. **Play ONE test game** (e.g., join WTA with $1)
4. Check transaction history - you should see:
   - Your 3 old purchases
   - **NEW: 1 entry fee** (type: `entry_fee`, amount: `-1.00`)
5. **Finish the game and win**
6. Check transaction history again - you should see:
   - **NEW: 1 victory payout** (type: `game_win`, amount: `+X.XX`)

---

## 🚨 WHAT NOT TO DO

❌ **DO NOT** run SQL files that recreate your entire WTA/Hot Sell systems  
❌ **DO NOT** try to backfill the 120 old games (not worth the complexity)  
❌ **DO NOT** modify the purchase system (it's working fine)  
❌ **DO NOT** change table schemas  

✅ **DO** only add the helper function calls to existing functions  
✅ **DO** test with ONE game before playing more  
✅ **DO** check the Supabase logs for the `✅ [SaveEntryFee]` and `✅ [SavePayout]` notices  

---

## 📝 QUICK REFERENCE

**Helper Functions (already exist):**
- `save_entry_fee_to_user_transactions(user_id, fee, desc, comp_type, comp_id, game_type, metadata)`
- `save_payout_to_user_transactions(user_id, type, amount, desc, comp_type, comp_id, game_type, tokens_won, metadata)`

**Query Functions (need to deploy):**
- `get_user_all_transactions(user_id)` - Returns all transactions

**Game Functions (need to update):**
- `wta_join_v2` - Add entry fee tracking
- `hs_join_v2` - Add entry fee tracking  
- WTA payout function - Add victory tracking
- Hot Sell payout function - Add victory tracking
- 1v1 functions - Add both
- Coin Play functions - Add both

---

## 🎪 EXPECTED CONSOLE OUTPUT (After Fix)

```
[Log] 💳 [UserService] Fetching user transactions for user: – "52c0b177-..."
[Log] ✅ [UserService] User transactions fetched: – 5  # <-- Should be more than 3!
[Log] ✅ [TokenWallet] Loaded – 5 – "transactions"
[Log] ✅ [TokenWallet] Purchases: – 3 – "Winnings:" – 2  # <-- Should show winnings!
```

---

Good luck! Test with ONE game first. 🎮

