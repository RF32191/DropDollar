# ✅ TRANSACTION HISTORY FIX - SIMPLE CHECKLIST

## 🎯 WHAT YOU NEED TO DO

Follow these steps **in order**. Each step is simple and takes ~2 minutes.

---

## ☑️ STEP 1: Deploy the Query Function

**What:** Add the function that lets frontend fetch comprehensive transaction history.

**How:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `RUN_THIS_TO_FIX_HISTORY.sql`
4. Click "Run"
5. Wait for "Success" message

**Expected result:** Function `get_user_all_transactions()` now exists in your database.

**Time:** ~1 minute

---

## ☑️ STEP 2: Update WTA Join Function

**What:** Make WTA games save entry fees to transaction history.

**How:**
1. In Supabase Dashboard → Database → Functions
2. Search for `wta_join_v2` and click it
3. Find the line that says `UPDATE users SET purchased_tokens = purchased_tokens - p_fee`
4. **Right after that line**, add:
   ```sql
   PERFORM save_entry_fee_to_user_transactions(
       p_user_id := p_user,
       p_entry_fee := p_fee,
       p_description := 'Winner Takes All Entry',
       p_competition_type := 'winner_takes_all',
       p_competition_id := p_session::TEXT,
       p_game_type := 'Competition Game',
       p_metadata := jsonb_build_object('session_id', p_session)
   );
   ```
5. Click "Confirm" to save

**Expected result:** When users join WTA, entry fee is saved to `user_transactions`.

**Time:** ~2 minutes

---

## ☑️ STEP 3: Update WTA Payout Function

**What:** Make WTA victories save to transaction history.

**How:**
1. Search for `process_wta_payout` in Functions
2. Find where it awards tokens (likely `UPDATE users SET won_tokens = won_tokens + ...`)
3. **Right after awarding tokens**, add:
   ```sql
   PERFORM save_payout_to_user_transactions(
       p_user_id := v_winner_id,
       p_type := 'game_win',
       p_amount := v_prize_amount,
       p_description := 'Winner Takes All Victory',
       p_competition_type := 'winner_takes_all',
       p_competition_id := config_id_param::TEXT,
       p_game_type := 'Competition Game',
       p_tokens_won := v_prize_amount::INTEGER,
       p_metadata := jsonb_build_object('prize', v_prize_amount)
   );
   ```
4. Click "Confirm"

**Expected result:** When users win WTA, victory is saved to `user_transactions`.

**Time:** ~2 minutes

---

## ☑️ STEP 4: Test WTA (Most Important!)

**What:** Verify WTA tracking works before touching other games.

**How:**
1. Go to Winner Takes All page
2. Join a $1 game
3. Check browser console for: `✅ [SaveEntryFee] Saved entry fee...`
4. Play the game
5. After game ends, go to Purchase History
6. You should see:
   - Old 3 purchases
   - **NEW: 1 entry fee** (red, -$1.00)
   - **NEW: 1 victory** (green, +X.XX) if you won

**Expected console output:**
```
[Log] ✅ [TokenWallet] Purchases: – 3 – "Winnings:" – 1
```

**Time:** ~5 minutes

**⚠️ IF THIS FAILS:** Stop here and debug. Don't proceed to other games until WTA works.

---

## ☑️ STEP 5: Update Hot Sell Join Function

**What:** Make Hot Sell games save entry fees.

**How:**
1. Find `hs_join_v2` in Functions
2. After `UPDATE users SET purchased_tokens...`, add:
   ```sql
   PERFORM save_entry_fee_to_user_transactions(
       p_user_id := p_user,
       p_entry_fee := p_fee,
       p_description := 'Hot Sell Entry',
       p_competition_type := 'hotsell',
       p_competition_id := p_session::TEXT,
       p_game_type := 'Competition Game',
       p_metadata := jsonb_build_object('session_id', p_session)
   );
   ```
3. Click "Confirm"

**Time:** ~2 minutes

---

## ☑️ STEP 6: Update Hot Sell Payout Function

**What:** Make Hot Sell victories save to history.

**How:**
1. Find the Hot Sell payout function (name may vary)
2. After awarding tokens, add:
   ```sql
   PERFORM save_payout_to_user_transactions(
       p_user_id := v_winner_id,
       p_type := 'game_win',
       p_amount := v_prize_amount,
       p_description := 'Hot Sell Victory',
       p_competition_type := 'hotsell',
       p_competition_id := p_session_id::TEXT,
       p_game_type := 'Competition Game',
       p_tokens_won := v_prize_amount::INTEGER,
       p_metadata := jsonb_build_object('prize', v_prize_amount)
   );
   ```
3. Click "Confirm"

**Time:** ~2 minutes

---

## ☑️ STEP 7: Update Coin Play Join Function

**What:** Make Coin Play games save entry fees.

**How:**
1. Find `coin_play_join_v2` in Functions
2. After token deduction, add:
   ```sql
   PERFORM save_entry_fee_to_user_transactions(
       p_user_id := p_user,
       p_entry_fee := p_fee,
       p_description := 'Coin Play Entry',
       p_competition_type := 'coin_play',
       p_competition_id := p_session::TEXT,
       p_game_type := 'Competition Game',
       p_metadata := jsonb_build_object('session_id', p_session)
   );
   ```
3. Click "Confirm"

**Time:** ~2 minutes

---

## ☑️ STEP 8: Update Coin Play Payout Function

**What:** Make Coin Play victories save to history.

**How:**
1. Find the Coin Play payout function
2. After awarding tokens, add:
   ```sql
   PERFORM save_payout_to_user_transactions(
       p_user_id := v_winner_id,
       p_type := 'game_win',
       p_amount := v_prize_amount,
       p_description := 'Coin Play Victory',
       p_competition_type := 'coin_play',
       p_competition_id := p_session_id::TEXT,
       p_game_type := 'Competition Game',
       p_tokens_won := v_prize_amount::INTEGER,
       p_metadata := jsonb_build_object('prize', v_prize_amount)
   );
   ```
3. Click "Confirm"

**Time:** ~2 minutes

---

## ☑️ STEP 9: Update 1v1 Join Function

**What:** Make 1v1 games save entry fees.

**How:**
1. Find `join_1v1_session` in Functions
2. After token deduction, add:
   ```sql
   PERFORM save_entry_fee_to_user_transactions(
       p_user_id := user_id_param,
       p_entry_fee := entry_fee_param,
       p_description := '1v1 Tournament Entry',
       p_competition_type := '1v1',
       p_competition_id := session_id_param::TEXT,
       p_game_type := 'Competition Game',
       p_metadata := jsonb_build_object('session_id', session_id_param)
   );
   ```
3. Click "Confirm"

**Time:** ~2 minutes

---

## ☑️ STEP 10: Update 1v1 Payout Function

**What:** Make 1v1 victories save to history.

**How:**
1. Find the 1v1 payout function
2. After awarding tokens, add:
   ```sql
   PERFORM save_payout_to_user_transactions(
       p_user_id := v_winner_id,
       p_type := 'game_win',
       p_amount := v_prize_amount,
       p_description := '1v1 Tournament Victory',
       p_competition_type := '1v1',
       p_competition_id := p_session_id::TEXT,
       p_game_type := 'Competition Game',
       p_tokens_won := v_prize_amount::INTEGER,
       p_metadata := jsonb_build_object('prize', v_prize_amount)
   );
   ```
3. Click "Confirm"

**Time:** ~2 minutes

---

## ☑️ STEP 11: Final Test

**What:** Verify everything works.

**How:**
1. Play ONE game from each mode (WTA, Hot Sell, Coin Play, 1v1)
2. After each game, check Purchase History
3. Verify you see entry fees and victories

**Expected result:** Transaction history shows all entries and wins from new games.

**Time:** ~10 minutes

---

## 📊 TOTAL TIME: ~30 minutes

---

## ⚠️ IMPORTANT REMINDERS

❌ **DO NOT** run any SQL scripts that recreate entire game systems  
❌ **DO NOT** try to backfill your 120 old games  
❌ **DO NOT** modify table schemas  

✅ **DO** test after each change  
✅ **DO** check Supabase logs for errors  
✅ **DO** stop and debug if anything fails  

---

## 🆘 IF SOMETHING BREAKS

1. **Check Supabase logs** (Database → Logs)
2. **Look for error messages** in browser console
3. **Revert the function** to its previous state
4. **Ask for help** with specific error message

---

## 📁 FILES YOU NEED

- `RUN_THIS_TO_FIX_HISTORY.sql` - Deploy this first (Step 1)
- `COMPLETE_TRANSACTION_HISTORY_FOR_ALL_GAMES.sql` - Reference for helper functions
- `PATCH_SPECIFIC_FUNCTIONS_FOR_TRACKING.sql` - Copy-paste guide for Steps 2-10
- `TRANSACTION_TRACKING_VISUAL_GUIDE.md` - Visual explanation of how it works
- `FIX_TRANSACTION_HISTORY_COMPLETE_GUIDE.md` - Detailed technical guide

---

## ✅ YOU'RE DONE WHEN...

- [ ] Console shows `"Winnings:" – X` (where X > 0)
- [ ] Purchase History shows entry fees (red transactions)
- [ ] Purchase History shows victories (green transactions)
- [ ] All 4 game modes (WTA, Hot Sell, Coin Play, 1v1) track correctly

---

Good luck! Start with Step 1 and work through sequentially. 🚀

