# Winner Takes All - SQL Scripts Summary

## 🎯 All SQL Scripts Ready to Use

### 1. ✅ Main Setup (Already Run Successfully!)
**File:** `COMPLETE_WINNER_TAKES_ALL_SYSTEM_LIKE_HOT_SELL.sql`

**What it does:**
- Creates/updates all tables with correct schema
- Renames `current_pool` to `prize_pool`
- Adds `timer_duration` to configs and sessions
- Enables RLS with security policies
- Creates all RPC functions (join, score update, payout, get sessions)
- Resets all sessions with 1 minute timer
- Creates fresh waiting sessions for all configs

**Status:** ✅ Already run and working!

---

### 2. 🔄 Quick Reset for Testing
**File:** `QUICK_RESET_WTA_LISTINGS.sql`

**When to use:** Anytime you want to reset all Winner Takes All listings between tests

**What it does:**
- Clears all participants
- Deletes all sessions
- Creates fresh waiting sessions with new RNG seeds
- Uses 1 minute timer (for testing)
- Keeps configs intact

**Run this:** Whenever you need to clear scores and start fresh

---

### 3. ⏱️ Change Timer to 2 Hours (Production)
**File:** `CHANGE_WTA_TIMER_TO_2_HOURS.sql`

**When to use:** After confirming 1 minute timer works correctly

**What it does:**
- Updates all configs to 7200 seconds (2 hours)
- Updates all active/waiting sessions to 2 hours
- Updates the payout function to use 2 hour default
- Updates the join function to use 2 hour default

**⚠️ Important:** Only run this AFTER testing with 1 minute timer is complete!

---

## 📋 Testing Workflow

### Phase 1: Testing with 1 Minute Timer

1. ✅ **Main setup** - Already done!
   ```
   Run: COMPLETE_WINNER_TAKES_ALL_SYSTEM_LIKE_HOT_SELL.sql
   ```

2. **Test the game flow:**
   - Join a Winner Takes All listing (1 token)
   - Play the game and submit score
   - Wait 1 minute for timer to expire
   - Frontend should auto-trigger payout
   - Verify winner received 85% of prize pool
   - Verify platform got 15%
   - Verify new session was created

3. **Reset between tests:**
   ```
   Run: QUICK_RESET_WTA_LISTINGS.sql
   ```

4. **Test with multiple players:**
   - Multiple users join same listing
   - All play games and submit scores
   - Wait 1 minute
   - Highest score wins 85%
   - Verify listing resets

### Phase 2: Switch to Production (2 Hours)

1. **Confirm 1 minute timer works perfectly**

2. **Change to 2 hours:**
   ```
   Run: CHANGE_WTA_TIMER_TO_2_HOURS.sql
   ```

3. **Verify timer shows 2 hours in UI**

4. **Optional: Test one full 2-hour cycle**

---

## 🎮 How Winner Takes All Works

### Game Flow
1. **User joins** → Pays entry fee (1 token from gameplay wallet)
2. **Timer starts** → On first player join (switches to 'active')
3. **Players compete** → Multiple players can join before timer expires
4. **Play anytime** → Players can play their game anytime during the timer
5. **Timer expires** → Automatic payout triggered by frontend
6. **Winner gets paid** → Highest score wins 85% of prize pool
7. **Auto reset** → New session created immediately

### Key Differences from Hot Sell
| Feature | Hot Sell | Winner Takes All |
|---------|----------|------------------|
| **Winners** | Top 3 (50%, 20%, 15%) | Only 1 (85%) |
| **Trigger** | Session full + all played | Timer expires |
| **Timer** | None | 1 min → 2 hours |
| **Min Players** | Must fill max_participants | Any players who joined |
| **Prize Split** | 3-way | Winner takes (almost) all |

---

## 🔧 RPC Functions Available

### 1. `wta_join_v2(config_id, user_id)`
- Join a Winner Takes All session
- Deducts entry fee from gameplay tokens
- Starts timer on first join

### 2. `update_winner_takes_all_score(session_id, user_id, score, accuracy)`
- Update player's score after game completion
- Records completion time for tie-breaking

### 3. `process_winner_takes_all_payout_complete(config_id)`
- Process payout when timer expires
- Finds winner (highest score, earliest completion)
- Pays 85% to winner, 15% platform fee
- Creates new waiting session

### 4. `get_all_winner_takes_all_sessions()`
- Get all active/waiting sessions with participants
- Used by frontend to display listings

---

## 🛡️ Security & Fair Gaming

All security features from Hot Sell are preserved:

✅ **RLS (Row Level Security)** - All tables protected  
✅ **RNG Seeding** - Each session has unique seed  
✅ **Dual Wallet** - Uses gameplay tokens only  
✅ **Transaction Logging** - All entries and payouts recorded  
✅ **Anti-Cheat** - Server-side validation via game_sessions  
✅ **No Double Payout** - Checks prevent duplicate payouts  
✅ **Tie-Breaking** - Earliest completion wins on score ties

---

## 📊 Database Schema

### winner_takes_all_configs
```
id, game_type, title, description, entry_fee, base_price, 
game_duration, rng_seed, platform_fee_percent, timer_duration
```

### winner_takes_all_sessions
```
id, config_id, prize_pool, participants_count, status, 
timer_started_at, timer_duration, winner_user_id, winner_prize, 
platform_fee_amount, completed_at, rng_seed, base_price
```

### winner_takes_all_participants
```
id, session_id, user_id, username, score, accuracy, 
joined_at, completed_at, updated_at
```

---

## 🚨 Troubleshooting

### Issue: No sessions showing
**Solution:** Run `QUICK_RESET_WTA_LISTINGS.sql`

### Issue: Timer not expiring
**Solution:** Wait full duration (1 minute for testing, 2 hours for production)

### Issue: "Already joined" error
**Solution:** Each user can only join once per session. Wait for payout/reset.

### Issue: Payout not triggering
**Solution:** Frontend should auto-trigger. Check timer has actually expired and at least 1 score is submitted.

### Issue: Wrong timer duration
**Solution:** Run appropriate script:
- Testing: `QUICK_RESET_WTA_LISTINGS.sql` (resets to 1 min)
- Production: `CHANGE_WTA_TIMER_TO_2_HOURS.sql` (changes to 2 hours)

---

## ✅ Quick Reference

| Action | SQL File to Run |
|--------|----------------|
| Initial setup | `COMPLETE_WINNER_TAKES_ALL_SYSTEM_LIKE_HOT_SELL.sql` ✅ Done |
| Reset for testing | `QUICK_RESET_WTA_LISTINGS.sql` |
| Change to 2 hours | `CHANGE_WTA_TIMER_TO_2_HOURS.sql` |

---

## 🎉 You're Ready!

All Winner Takes All SQL scripts are in place and the system is set up! 

**Next steps:**
1. Test with 1 minute timer
2. Use quick reset between tests
3. When ready, switch to 2 hours
4. Enjoy! 🚀

