# 🧪 Winner Takes All - Complete Testing Guide

## 📋 Setup Order

Run these SQL files in this exact order:

### 1️⃣ Initial Setup (Run Once)
```bash
# Step 1: Complete WTA setup with timer configurations
COMPLETE_WTA_SETUP_WITH_TIMER.sql
```
**What it does:**
- Adds `max_participants` column
- Adds `game_duration` column  
- Creates/updates all 12 WTA configurations ($1 to $5000)
- Creates initial sessions for testing

### 2️⃣ Apply All Fixes (Run Once)
```bash
# Step 2: Apply all UUID fixes and fair gaming features
FIX_WTA_COMPLETE_ALL_ERRORS.sql
```
**What it does:**
- Converts all ID columns to UUID type
- Fixes `get_all_winner_takes_all_sessions` function
- Fixes `wta_join_v2` function with proper timer logic
- Adds fair gaming features
- Adds payout logic

### 3️⃣ Reset for Testing (Run Anytime)
```bash
# Step 3: Reset all sessions and participants for clean testing
RESET_ALL_WTA_SESSIONS.sql
```
**What it does:**
- Clears all participants
- Resets all sessions to "waiting" status
- Clears all timers
- Resets prize pools to $0
- Ready for fresh testing

---

## 🎮 Testing Workflow

### Phase 1: Initial Join Testing
1. Run `RESET_ALL_WTA_SESSIONS.sql`
2. Join a $1 WTA session
3. Verify:
   - ✅ Entry fee deducted
   - ✅ Participant added
   - ✅ Prize pool increased
   - ✅ Progress bar updates

### Phase 2: Timer Testing
1. Continue joining until `max_participants` reached (10 for $1)
2. Verify:
   - ✅ Timer starts at exactly 100% progress
   - ✅ Session status changes to "active"
   - ✅ Countdown begins (60 seconds)

### Phase 3: Overtime Players
1. Join MORE players after timer starts
2. Verify:
   - ✅ Additional players can join
   - ✅ Prize pool continues to grow
   - ✅ Timer keeps running (doesn't reset)
   - ✅ Progress bar shows > 100%

### Phase 4: Username Display
1. Check scoreboard dropdown
2. Verify:
   - ✅ All usernames displayed
   - ✅ No "Anonymous" players
   - ✅ Real usernames from user profiles

### Phase 5: Payout Testing
1. Submit a winning score before timer expires
2. Verify:
   - ✅ Session marks as "completed"
   - ✅ Winner gets 85% of final prize pool
   - ✅ Payout goes to `won_tokens` wallet
   - ✅ Transaction logged
   - ✅ Platform keeps 15% fee

---

## 🔍 Verification Queries

### Check Session Status
```sql
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at,
    EXTRACT(EPOCH FROM (NOW() - timer_started_at)) as seconds_elapsed,
    winner_user_id,
    winner_prize
FROM winner_takes_all_sessions
ORDER BY config_id;
```

### Check Participants
```sql
SELECT 
    p.session_id,
    p.username,
    p.joined_at,
    u.purchased_tokens,
    u.won_tokens
FROM winner_takes_all_participants p
JOIN users u ON p.user_id = u.id
ORDER BY p.joined_at;
```

### Check User Balances
```sql
SELECT 
    username,
    purchased_tokens,
    won_tokens,
    purchased_tokens + won_tokens as total_tokens
FROM users
WHERE id = 'YOUR_USER_ID';
```

### Check Recent Transactions
```sql
SELECT 
    user_id,
    type,
    transaction_type,
    amount,
    description,
    created_at
FROM token_transactions
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🎯 Test Scenarios

### Scenario 1: Quick Fill ($1 Session)
- **Goal**: Test rapid session fill
- **Steps**: 10 users join quickly
- **Expected**: Timer starts at player 10

### Scenario 2: Overtime Players ($5 Session)
- **Goal**: Test late joiners
- **Steps**: 
  1. 10 users join (timer starts)
  2. 5 more users join after timer
- **Expected**: 
  - Prize pool = $75 (15 x $5)
  - Winner gets 85% of $75 = $63.75

### Scenario 3: High Stakes ($100 Session)
- **Goal**: Test large prizes
- **Steps**: 
  1. 6 users join (timer starts)
  2. 4 more join after timer
- **Expected**:
  - Prize pool = $1000 (10 x $100)
  - Winner gets $850
  - Platform gets $150

---

## ⚠️ Troubleshooting

### Problem: Timer starts too early
**Solution**: Check `max_participants` in configs
```sql
SELECT id, max_participants FROM winner_takes_all_configs;
```

### Problem: No usernames in scoreboard
**Solution**: Check participant records
```sql
SELECT session_id, username FROM winner_takes_all_participants;
```

### Problem: Payout not going through
**Solution**: Check payout function
```sql
-- Manually trigger payout
SELECT process_wta_payout('SESSION_ID_HERE');
```

### Problem: Can't join session
**Solution**: Check session status and user tokens
```sql
-- Check session
SELECT * FROM winner_takes_all_sessions WHERE id = 'SESSION_ID';

-- Check user balance
SELECT purchased_tokens + won_tokens FROM users WHERE id = 'USER_ID';
```

---

## 📊 Expected Behavior

### Progress Bar
- **0-99%**: Session in "waiting" mode, no timer
- **100%**: Timer starts, session becomes "active"
- **100%+**: Overtime players allowed, timer continues

### Timer Logic
```
Players Joined: [====100%====] Timer: 60s
                      ↑
                Timer starts HERE
                
Players Joined: [====125%====] Timer: 45s  ← Still ticking
                      ↑
                More players can join
```

### Payout Distribution
```
Final Prize Pool: $100
├─ Winner: $85 (85%)
└─ Platform: $15 (15%)

Winner receives: $85 → won_tokens wallet
```

---

## 🎲 Fair Gaming Features

All these are automatically checked:

✅ **Rate Limiting**
- 30 games per hour
- 200 games per day

✅ **Anti-Cheat**
- Perfect scores flagged
- Impossible timing detected
- Admin audit notifications

✅ **Dual Wallet System**
- Entry fees from purchased tokens first
- Falls back to won tokens if needed
- Winner payouts to won_tokens only

✅ **RNG Fairness**
- Unique seed per session
- Server-side validation
- Can't manipulate client-side

---

## 🚀 Quick Reset Command

Anytime you want to start fresh testing:

```bash
# Run this one command
RESET_ALL_WTA_SESSIONS.sql
```

Then start testing from scratch! 🎮

---

## 📞 Support

If you encounter issues:

1. Check verification queries above
2. Review troubleshooting section
3. Check `FAIR_GAMING_COMPLETE_GUIDE.md` for fair gaming details
4. Review `FIX_WTA_COMPLETE_ALL_ERRORS.sql` for function logic

