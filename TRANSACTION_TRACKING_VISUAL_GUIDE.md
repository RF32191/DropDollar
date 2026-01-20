# 📊 TRANSACTION TRACKING - VISUAL GUIDE

## 🎯 THE PROBLEM (CURRENT STATE)

```
┌─────────────────────────────────────────────┐
│         USER PLAYS 120 GAMES               │
│  (Entries & Victories Happen)               │
└─────────────────────────────────────────────┘
                    │
                    ├─────────────────────────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │   game_history        │         │  user_transactions    │
        │  (120 records)        │         │   (3 records only)    │
        │                       │         │                       │
        │  ✅ All games saved   │         │  ❌ ONLY purchases    │
        │  ✅ Scores saved      │         │  ❌ NO entry fees     │
        │  ✅ Session data      │         │  ❌ NO victories      │
        └───────────────────────┘         └───────────────────────┘
                    │                                     │
                    │                                     │
                    ▼                                     ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │  Dashboard Display     │         │  History Tab Display  │
        │  ✅ Works fine        │         │  ❌ Incomplete        │
        │  ✅ Shows 120 games   │         │  ❌ Only 3 purchases  │
        └───────────────────────┘         └───────────────────────┘
```

**Console Output:**
```
[Log] ✅ [UserService] Game history fetched: – 120
[Log] ✅ [UserService] User transactions fetched: – 3
[Log] ✅ [TokenWallet] Purchases: – 3 – "Winnings:" – 0  ⚠️ PROBLEM!
```

---

## ✅ THE SOLUTION (DESIRED STATE)

```
┌─────────────────────────────────────────────┐
│         USER PLAYS A GAME                   │
│  (Entry Fee: $1.00, Prize: $5.00)          │
└─────────────────────────────────────────────┘
                    │
                    │
                    ▼
        ┌───────────────────────┐
        │  wta_join_v2()        │
        │  Deducts $1.00        │
        └───────────────────────┘
                    │
                    ├─────────────────────────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌───────────────────────┐         ┌───────────────────────────────┐
        │  Add participant to    │         │  save_entry_fee_to_          │
        │  winner_takes_all_     │         │  user_transactions()         │
        │  participants          │         │                              │
        │  ✅ Original flow      │         │  📝 NEW: Saves to            │
        │                        │         │  user_transactions:          │
        └───────────────────────┘         │  - type: 'entry_fee'         │
                                           │  - amount: -1.00             │
                                           │  - description: "WTA Entry"  │
                                           └───────────────────────────────┘
                    │
                    │ (User finishes game, wins)
                    │
                    ▼
        ┌───────────────────────┐
        │  process_wta_payout() │
        │  Awards $5.00         │
        └───────────────────────┘
                    │
                    ├─────────────────────────────────────┐
                    │                                     │
                    ▼                                     ▼
        ┌───────────────────────┐         ┌───────────────────────────────┐
        │  Save to game_history  │         │  save_payout_to_             │
        │  ✅ Original flow      │         │  user_transactions()         │
        │                        │         │                              │
        └───────────────────────┘         │  📝 NEW: Saves to            │
                                           │  user_transactions:          │
                                           │  - type: 'game_win'          │
                                           │  - amount: +5.00             │
                                           │  - description: "WTA Win"    │
                                           └───────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────────────────┐
        │         user_transactions TABLE               │
        │  (Now contains 5 records)                     │
        │  ┌─────────────────────────────────────────┐  │
        │  │ 1. Purchase      | +1 token  | $1.00   │  │
        │  │ 2. Purchase      | +1 token  | $1.00   │  │
        │  │ 3. Purchase      | +1 token  | $1.00   │  │
        │  │ 4. Entry Fee     | -1 token  | WTA     │  │ ← NEW!
        │  │ 5. Game Win      | +5 tokens | WTA     │  │ ← NEW!
        │  └─────────────────────────────────────────┘  │
        └───────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────────────────┐
        │         HISTORY TAB NOW SHOWS                 │
        │  💰 All Purchases (3)                         │
        │     ✅ $1.00 purchase (stripe)                │
        │     ✅ $1.00 purchase (stripe)                │
        │     ✅ $1.00 purchase (stripe)                │
        │                                                │
        │  🎮 Game Entries (1)                           │
        │     ✅ -$1.00 WTA Entry                        │
        │                                                │
        │  🏆 Victories (1)                              │
        │     ✅ +$5.00 WTA Victory                      │
        │                                                │
        │  📋 Complete History (5)                       │
        │     ✅ All transactions combined               │
        └───────────────────────────────────────────────┘
```

**Expected Console Output:**
```
[Log] ✅ [UserService] Game history fetched: – 121
[Log] ✅ [UserService] User transactions fetched: – 5
[Log] ✅ [TokenWallet] Purchases: – 3 – "Winnings:" – 1  ✅ FIXED!
```

---

## 🔧 HOW TO IMPLEMENT

### Current Function Flow (WTA Example)

**BEFORE (Missing Transaction Tracking):**
```sql
CREATE FUNCTION wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB AS $$
DECLARE
  -- variables
BEGIN
  -- Rate limit check
  -- Balance check
  
  -- Deduct tokens
  UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  
  -- ❌ MISSING: No save to user_transactions
  
  -- Add participant
  INSERT INTO winner_takes_all_participants (...)
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

**AFTER (With Transaction Tracking):**
```sql
CREATE FUNCTION wta_join_v2(p_session TEXT, p_user UUID, p_fee NUMERIC)
RETURNS JSONB AS $$
DECLARE
  -- variables
BEGIN
  -- Rate limit check
  -- Balance check
  
  -- Deduct tokens
  UPDATE users SET purchased_tokens = purchased_tokens - p_fee WHERE id = p_user;
  
  -- ✅ NEW: Save to user_transactions
  PERFORM save_entry_fee_to_user_transactions(
      p_user_id := p_user,
      p_entry_fee := p_fee,
      p_description := 'Winner Takes All Entry',
      p_competition_type := 'winner_takes_all',
      p_competition_id := p_session::TEXT,
      p_game_type := 'Competition',
      p_metadata := jsonb_build_object('session_id', p_session)
  );
  
  -- Add participant
  INSERT INTO winner_takes_all_participants (...)
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 WHAT EACH HELPER FUNCTION DOES

### `save_entry_fee_to_user_transactions()`

**Purpose:** Records when a user pays to join a game.

**What it saves:**
- `type`: `'entry_fee'` (so frontend can filter)
- `amount`: Negative number (e.g., `-1.00` for $1 entry)
- `description`: Human-readable text (e.g., "Winner Takes All Entry - Coin Flip")
- `competition_type`: Which game mode (`'winner_takes_all'`, `'hotsell'`, `'coin_play'`, `'1v1'`)
- `competition_id`: The session ID
- `game_type`: The specific game (e.g., "Coin Flip", "Sword Parry")

**Result in database:**
```
| id                | type       | amount | description           | competition_type    | created_at          |
|-------------------|------------|--------|-----------------------|---------------------|---------------------|
| abc-123-def       | entry_fee  | -1.00  | WTA Entry - Coin Flip | winner_takes_all    | 2026-01-20 12:00:00 |
```

---

### `save_payout_to_user_transactions()`

**Purpose:** Records when a user wins a prize.

**What it saves:**
- `type`: `'game_win'` (so frontend can filter)
- `amount`: Positive number (e.g., `5.00` for $5 prize)
- `description`: Human-readable text (e.g., "Winner Takes All Victory - Coin Flip")
- `tokens_won`: Integer amount won
- `competition_type`: Which game mode
- `competition_id`: The session ID
- `game_type`: The specific game

**Result in database:**
```
| id                | type      | amount | tokens_won | description                 | competition_type    | created_at          |
|-------------------|-----------|--------|------------|-----------------------------|---------------------|---------------------|
| xyz-789-ghi       | game_win  | 5.00   | 5          | WTA Victory - Coin Flip     | winner_takes_all    | 2026-01-20 12:05:00 |
```

---

## 🎯 QUICK REFERENCE: WHERE TO ADD THE CODE

| Game Type   | Function Name          | Action     | Helper Function to Add                             |
|-------------|------------------------|------------|----------------------------------------------------|
| WTA         | `wta_join_v2`          | Entry      | `save_entry_fee_to_user_transactions()`            |
| WTA         | `process_wta_payout`   | Victory    | `save_payout_to_user_transactions()`               |
| Hot Sell    | `hs_join_v2`           | Entry      | `save_entry_fee_to_user_transactions()`            |
| Hot Sell    | (payout function)      | Victory    | `save_payout_to_user_transactions()`               |
| Coin Play   | `coin_play_join_v2`    | Entry      | `save_entry_fee_to_user_transactions()`            |
| Coin Play   | (payout function)      | Victory    | `save_payout_to_user_transactions()`               |
| 1v1         | `join_1v1_session`     | Entry      | `save_entry_fee_to_user_transactions()`            |
| 1v1         | (payout function)      | Victory    | `save_payout_to_user_transactions()`               |

---

## ⚠️ CRITICAL: OLD VS NEW GAMES

```
┌─────────────────────────────────────────────────────────────────┐
│  TIMELINE                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Past]                                                          │
│  Your 120 games played                                           │
│  ❌ Not in user_transactions (played before tracking added)     │
│  ✅ Still in game_history (original table)                      │
│  ✅ Still visible in Dashboard                                  │
│                                                                  │
│  ───────────────────────────────────────────────────────────    │
│  [Deploy SQL Update]                                             │
│  ───────────────────────────────────────────────────────────    │
│                                                                  │
│  [Future]                                                        │
│  New games played after update                                   │
│  ✅ Saved to user_transactions                                  │
│  ✅ Saved to game_history                                        │
│  ✅ Visible in Dashboard AND History Tab                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Bottom line:** Your old 120 games won't magically appear in the transaction history. Only new games (played after the update) will show entry fees and victories in the history tab.

---

## 🧪 HOW TO TEST

1. **Deploy the query function:**
   - Run `RUN_THIS_TO_FIX_HISTORY.sql` in Supabase

2. **Update ONE game function:**
   - Start with WTA: Edit `wta_join_v2` in Supabase Dashboard
   - Add the `PERFORM save_entry_fee_to_user_transactions(...)` line

3. **Play ONE test game:**
   - Join a WTA game with $1 entry fee
   - Check console: Should log `✅ [SaveEntryFee] Saved entry fee...`

4. **Check transaction history:**
   - Go to Purchase History page
   - You should now see **4 transactions** (3 old purchases + 1 new entry fee)

5. **Finish the game:**
   - Complete the game and check if you win
   - If you win, check history again: Should show **5 transactions** (+ 1 victory)

6. **Verify console output:**
   ```
   [Log] ✅ [TokenWallet] Purchases: – 3 – "Winnings:" – 1  ✅ SUCCESS!
   ```

---

Good luck! 🎮

