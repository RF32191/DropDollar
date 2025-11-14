# Winner Takes All - Complete Setup Instructions

## 🚨 IMPORTANT: Run in This Order!

### Problem Solved
✅ Fixed: `column c.max_participants does not exist`  
✅ Fixed: Missing configs/listings  
✅ Fixed: Timer logic now starts at 100% progress  

---

## 📋 Step-by-Step Instructions

### Step 1: Setup Tables & Configs (Run First!)
```sql
File: COMPLETE_WTA_SETUP_WITH_TIMER.sql
```

**What this does:**
- Adds `max_participants` column to `winner_takes_all_configs` table
- Creates all 12 Winner Takes All configurations ($1 to $5000)
- Creates sessions for each config
- Sets max_participants based on entry fee tier

**Run this in Supabase SQL Editor:**
1. Copy entire file
2. Paste in SQL Editor
3. Click "Run"
4. Wait for success message

---

### Step 2: Apply Timer Logic & Functions (Run Second!)
```sql
File: FIX_WTA_COMPLETE_ALL_ERRORS.sql
```

**What this does:**
- Fixes UUID type issues
- Updates `wta_join_v2` function with new timer logic
- Adds username capture
- Sets up payout system
- Implements all fair gaming features

**Run this in Supabase SQL Editor:**
1. Copy entire file
2. Paste in SQL Editor  
3. Click "Run"
4. Wait for success message

---

### Step 3: Reset for Testing (Optional)
```sql
File: RESET_ALL_WTA_SESSIONS.sql
```

**What this does:**
- Clears all participants
- Resets all sessions to "waiting"
- Clears timers
- Resets prize pools

**Only run this if you want to start fresh!**

---

## ✅ Verification After Setup

### Check Configs Exist
```sql
SELECT 
    id,
    title,
    entry_fee,
    max_participants,
    timer_duration
FROM winner_takes_all_configs
ORDER BY entry_fee;
```

**Expected:** 12 rows showing $1, $3, $5, $10, $25, $50, $100, $250, $500, $1000, $2500, $5000

### Check Sessions Exist
```sql
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at
FROM winner_takes_all_sessions
ORDER BY config_id;
```

**Expected:** 12 rows, all with `status = 'waiting'` and `participants_count = 0`

### Check max_participants Column
```sql
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'winner_takes_all_configs' 
AND column_name = 'max_participants';
```

**Expected:** 1 row showing `max_participants | integer`

---

## 🎮 How the Timer Works Now

### Progress Bar Based Timer

**Example: $5 Entry (10 max players)**

```
Player 1-9 join:
├── Status: "waiting"
├── Timer: NOT started
├── Progress: 10%, 20%, 30%...90%
└── Prize Pool: $5, $10, $15...$45

Player 10 joins (100% reached!):
├── Status: "active"
├── Timer: STARTS! (60 seconds)
├── Progress: 100%
└── Prize Pool: $50

Players 11, 12, 13+ join (overtime):
├── Status: Still "active"
├── Timer: Counting down
├── Progress: 110%, 120%, 130%+
└── Prize Pool: $55, $60, $65+ (growing!)

Timer expires (0:00):
├── Winner: Highest score
├── Prize: 85% of total pool
└── Platform fee: 15%
```

---

## 🔢 Max Participants by Tier

| Entry Fee | Max Participants | Timer Starts At |
|-----------|------------------|-----------------|
| $1 - $5   | 10 players      | 10th join       |
| $10 - $25 | 8 players       | 8th join        |
| $50 - $100| 6 players       | 6th join        |
| $250 - $500| 5 players      | 5th join        |
| $1000+    | 3 players       | 3rd join        |

**Why different tiers?**
- Lower stakes = more players needed for excitement
- Higher stakes = fewer players needed for full prize pool

---

## 🧪 Testing Procedure

### Test 1: Verify Configs Loaded
```
1. Navigate to Winner Takes All page
2. Should see 12 different entry options
3. Each should show entry fee and max participants
```

### Test 2: Join Before Threshold
```
1. Join a $5 session
2. Check: Status = "waiting"
3. Check: Timer NOT visible yet
4. Check: Progress bar shows 1/10 (10%)
```

### Test 3: Reach Threshold (Timer Starts)
```
1. Join with 9 more users (or same user with different accounts)
2. On 10th join: Timer should START
3. Check: Status = "active"
4. Check: Countdown visible (60 seconds)
5. Check: Progress bar at 100%
```

### Test 4: Join After Timer Started
```
1. Timer is running (e.g., 40 seconds left)
2. Join with another user
3. Check: Join successful!
4. Check: Prize pool increased
5. Check: Progress bar > 100%
6. Check: Timer still counting down
```

### Test 5: Payout
```
1. Let timer count to 0:00
2. Wait 3 seconds
3. Check: Winner receives 85% of prize pool
4. Check: Balance updated in won_tokens
5. Check: Session marked 'completed'
```

---

## 🐛 Troubleshooting

### Error: "column c.max_participants does not exist"
**Solution:** Run `COMPLETE_WTA_SETUP_WITH_TIMER.sql` first!

### Error: No configs/listings found
**Solution:** Run `COMPLETE_WTA_SETUP_WITH_TIMER.sql` - it creates all configs

### Timer starts too early
**Solution:** 
1. Run `RESET_ALL_WTA_SESSIONS.sql`
2. Then run `FIX_WTA_COMPLETE_ALL_ERRORS.sql`
3. Verify `max_participants` values are set correctly

### Timer doesn't start at all
**Check:**
```sql
SELECT participants_count, c.max_participants
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.config_id = 'wta-$5';
```
**Expected:** Timer starts when `participants_count >= max_participants`

---

## 📊 Monitoring Queries

### Real-Time Dashboard
```sql
SELECT 
    s.config_id,
    s.status,
    s.participants_count as players,
    c.max_participants as threshold,
    ROUND((s.participants_count::NUMERIC / c.max_participants) * 100, 2) as progress_percent,
    s.prize_pool,
    s.timer_started_at,
    CASE 
        WHEN s.timer_started_at IS NULL THEN 'Waiting'
        WHEN EXTRACT(EPOCH FROM (NOW() - s.timer_started_at)) > s.timer_duration THEN 'Expired'
        ELSE CONCAT(
            FLOOR((s.timer_duration - EXTRACT(EPOCH FROM (NOW() - s.timer_started_at))) / 60), ':',
            LPAD(FLOOR((s.timer_duration - EXTRACT(EPOCH FROM (NOW() - s.timer_started_at))) % 60)::TEXT, 2, '0')
        )
    END as timer
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY s.config_id;
```

---

## 📝 Complete File List

### Required Files (Run in Order):
1. ✅ `COMPLETE_WTA_SETUP_WITH_TIMER.sql` - **RUN FIRST!**
2. ✅ `FIX_WTA_COMPLETE_ALL_ERRORS.sql` - **RUN SECOND!**
3. ⭕ `RESET_ALL_WTA_SESSIONS.sql` - Optional (for testing)

### Documentation Files:
- `NEW_TIMER_BEHAVIOR_GUIDE.md` - Full timer explanation
- `FAIR_GAMING_COMPLETE_GUIDE.md` - All fair gaming features
- `TIMER_PAYOUT_FIX.md` - Timer and payout details
- `RUN_IN_THIS_ORDER.md` - This file!

---

## ✅ Success Checklist

After running both SQL files, verify:

- [ ] 12 configs exist with different entry fees
- [ ] All configs have `max_participants` set
- [ ] 12 sessions exist, all in "waiting" status
- [ ] `winner_takes_all_configs` has `max_participants` column
- [ ] Can join sessions successfully
- [ ] Timer starts when progress bar hits 100%
- [ ] Extra players can join after timer starts
- [ ] Payout works when timer expires
- [ ] Winner receives 85% to won_tokens wallet

---

## 🎉 Summary

**The Fix:**
1. Added `max_participants` column
2. Created all configs/listings
3. Updated timer logic to start at 100% progress
4. Added fallback (defaults to 10 if not set)

**The Flow:**
1. Players join → Progress bar fills
2. Reaches 100% → Timer starts
3. More players join → Pool grows
4. Timer expires → Winner gets 85%

**Ready to Launch!** 🚀

---

**Last Updated**: 2025-11-13  
**Version**: 2.1.0  
**Status**: Complete Setup Ready ✅

