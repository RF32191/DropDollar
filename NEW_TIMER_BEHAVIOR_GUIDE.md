# Winner Takes All - New Timer Behavior Guide

## 🎮 Timer Behavior Changed!

### Old Behavior ❌
- Timer started when **first player** joined
- Session immediately became "active"
- 60 seconds to play

### New Behavior ✅
- Timer starts when **progress bar hits 100%** (max_participants reached)
- Session stays "waiting" until threshold reached
- **Extra players can STILL join** after timer starts
- Additional joins add more to the prize pool
- Timer continues counting down regardless

---

## 📊 How It Works Now

### Phase 1: Filling Up (Waiting)
```
Players: 0 → max_participants
Status: "waiting"
Timer: Not started
Progress Bar: 0% → 100%
```

**What happens:**
- Players join one by one
- Each join adds to prize pool
- Progress bar fills up
- Session stays in "waiting" status

### Phase 2: Timer Starts (Active)
```
Players: Reached max_participants
Status: "active"
Timer: Starts at 60 seconds (or configured duration)
Progress Bar: 100%
```

**What happens:**
- When `participants_count >= max_participants`
- Timer starts: `timer_started_at = NOW()`
- Status changes to: `active`
- Countdown begins

### Phase 3: Overtime (Still Active)
```
Players: Can STILL join! (> max_participants)
Status: "active"
Timer: Counting down
Prize Pool: Keeps growing!
```

**What happens:**
- **MORE players can join** even after timer starts
- Each join adds to prize pool
- Progress bar can go over 100%
- Timer keeps counting down
- All players compete for the growing pot

### Phase 4: Payout (Completed)
```
Timer: Expires (0:00)
Status: "completed"
Winner: Highest score
Prize: 85% of total prize pool
```

**What happens:**
- Timer hits 0:00
- Payout triggers (3 second grace period)
- Winner = Highest score
- Prize = 85% of accumulated prize pool
- Platform fee = 15%

---

## 🔢 Example Scenario

### Scenario: 10 Player Max, $5 Entry

**Step 1-9: Players Joining (Waiting Phase)**
```
Player 1 joins → Prize Pool: $5, Progress: 10%, Timer: Not started
Player 2 joins → Prize Pool: $10, Progress: 20%, Timer: Not started
Player 3 joins → Prize Pool: $15, Progress: 30%, Timer: Not started
...
Player 9 joins → Prize Pool: $45, Progress: 90%, Timer: Not started
```

**Step 10: Threshold Reached (Timer Starts!)**
```
Player 10 joins → Prize Pool: $50, Progress: 100%, Timer: STARTS! (60 sec)
Status: "waiting" → "active"
```

**Step 11-15: Overtime Players (Timer Running)**
```
Player 11 joins → Prize Pool: $55, Progress: 110%, Timer: 45 sec remaining
Player 12 joins → Prize Pool: $60, Progress: 120%, Timer: 38 sec remaining
Player 13 joins → Prize Pool: $65, Progress: 130%, Timer: 25 sec remaining
Player 14 joins → Prize Pool: $70, Progress: 140%, Timer: 15 sec remaining
Player 15 joins → Prize Pool: $75, Progress: 150%, Timer: 8 sec remaining
```

**Step 16: Timer Expires**
```
Timer: 0:00
All 15 players competed
Final Prize Pool: $75
Winner Prize (85%): $63.75
Platform Fee (15%): $11.25
Winner: Player with highest score
```

---

## 🚀 Testing Instructions

### Step 1: Reset All Sessions
```sql
-- Run this SQL file first
File: RESET_ALL_WTA_SESSIONS.sql
```

**What it does:**
- Clears all participants
- Resets all sessions to "waiting"
- Clears timers
- Resets prize pools to $0

### Step 2: Check Max Participants
```sql
-- See what the threshold is for each config
SELECT 
    id,
    title,
    entry_fee,
    max_participants,
    timer_duration
FROM winner_takes_all_configs
ORDER BY entry_fee;
```

**Example output:**
```
id: wta-$5
title: $5 Winner Takes All
entry_fee: 5
max_participants: 10
timer_duration: 60
```

### Step 3: Join Session (Before Threshold)
```
1. Join a session
2. Check: Status should be "waiting"
3. Check: Timer should NOT be started
4. Check: Progress bar should show X / max_participants
```

**Verify in SQL:**
```sql
SELECT 
    config_id,
    status,
    participants_count,
    prize_pool,
    timer_started_at,
    -- Calculate progress percentage
    ROUND((participants_count::NUMERIC / 
        (SELECT max_participants FROM winner_takes_all_configs 
         WHERE id = winner_takes_all_sessions.config_id)) * 100, 2) as progress_percent
FROM winner_takes_all_sessions
WHERE config_id = 'wta-$5';
```

### Step 4: Reach Threshold (Timer Starts)
```
1. Continue joining until participants_count = max_participants
2. Check: Timer should START
3. Check: Status should change to "active"
4. Check: Progress bar should be at 100%
5. Check: Countdown should be visible
```

**Verify in SQL:**
```sql
SELECT 
    config_id,
    status,  -- Should be 'active'
    participants_count,  -- Should be >= max_participants
    timer_started_at,  -- Should NOT be NULL
    EXTRACT(EPOCH FROM (NOW() - timer_started_at)) as seconds_elapsed
FROM winner_takes_all_sessions
WHERE config_id = 'wta-$5';
```

### Step 5: Join After Timer Started
```
1. Timer is running (e.g., 45 seconds left)
2. Join the session again (with different user)
3. Check: Should be allowed!
4. Check: Prize pool should increase
5. Check: Timer should keep counting down
6. Check: Progress bar can go over 100%
```

**Verify in SQL:**
```sql
SELECT 
    s.config_id,
    s.participants_count,
    c.max_participants,
    s.participants_count - c.max_participants as overtime_players,
    s.prize_pool,
    GREATEST(0, s.timer_duration - EXTRACT(EPOCH FROM (NOW() - s.timer_started_at))) as seconds_remaining
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.config_id = 'wta-$5';
```

### Step 6: Wait for Timer to Expire
```
1. Let timer count down to 0:00
2. Wait 3 seconds
3. Check: Payout should trigger
4. Check: Winner receives 85% of prize pool
5. Check: Prize goes to won_tokens wallet
```

**Verify in SQL:**
```sql
-- Check payout
SELECT 
    s.config_id,
    s.status,  -- Should be 'completed'
    u.username as winner,
    s.winner_prize,
    s.platform_fee_amount,
    s.prize_pool as total_pot,
    s.participants_count as total_players,
    p.score as winning_score
FROM winner_takes_all_sessions s
JOIN users u ON s.winner_user_id = u.id
LEFT JOIN winner_takes_all_participants p ON p.session_id = s.id AND p.user_id = s.winner_user_id
WHERE s.config_id = 'wta-$5' AND s.status = 'completed'
ORDER BY s.completed_at DESC
LIMIT 1;
```

---

## 📐 Key Logic Changes

### In `wta_join_v2` Function

**Old Logic:**
```sql
-- Started timer on FIRST join (participants_count = 0)
WHEN COALESCE(participants_count, 0) = 0 THEN 'active'
```

**New Logic:**
```sql
-- Starts timer when THRESHOLD reached (participants_count >= max_participants)
WHEN COALESCE(participants_count, 0) + 1 >= v_max_participants AND timer_started_at IS NULL THEN 'active'
```

**Key Points:**
1. Gets `max_participants` from config
2. Compares `(current + 1) >= max_participants`
3. Only starts timer once (`AND timer_started_at IS NULL`)
4. Doesn't block joins after timer starts

---

## 🎯 Benefits of New Behavior

### 1. **Builds Excitement**
- Players wait for threshold
- Progress bar fills up
- Countdown creates urgency

### 2. **Bigger Prize Pools**
- Late joiners add to pot
- More competition
- Larger payouts

### 3. **Fair Competition**
- Everyone has full timer duration
- No rush to join first
- Skill-based, not timing-based

### 4. **Flexible Participation**
- Can join anytime before timer expires
- Late joiners still have time to play
- More inclusive

---

## 🐛 Troubleshooting

### Timer Started Too Early

**Check 1: Verify max_participants**
```sql
SELECT max_participants FROM winner_takes_all_configs 
WHERE id = 'your-config-id';
```

**Check 2: Verify participant count**
```sql
SELECT participants_count FROM winner_takes_all_sessions 
WHERE config_id = 'your-config-id';
```

**Expected**: Timer should start when `participants_count >= max_participants`

### Timer Not Starting

**Issue**: Reached max_participants but timer not started

**Check:**
```sql
SELECT 
    s.participants_count,
    c.max_participants,
    s.timer_started_at,
    s.status
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.config_id = 'your-config-id';
```

**Fix**: Re-run `FIX_WTA_COMPLETE_ALL_ERRORS.sql`

### Can't Join After Timer Started

**Issue**: Joins are blocked after timer starts

**This shouldn't happen** - the new logic allows joins after timer starts.

**Check:**
```sql
-- See if there's a blocking condition
SELECT status FROM winner_takes_all_sessions 
WHERE config_id = 'your-config-id';
```

**Status should be**: `active` (not `completed`)

---

## 📊 Monitoring Progress

### Real-Time Dashboard Query
```sql
SELECT 
    s.config_id,
    s.status,
    s.participants_count as current_players,
    c.max_participants as threshold,
    ROUND((s.participants_count::NUMERIC / c.max_participants) * 100, 2) as progress_percent,
    s.prize_pool,
    s.timer_started_at,
    CASE 
        WHEN s.timer_started_at IS NULL THEN 'Waiting for players'
        WHEN EXTRACT(EPOCH FROM (NOW() - s.timer_started_at)) > s.timer_duration THEN 'Timer expired'
        ELSE CONCAT(
            FLOOR((s.timer_duration - EXTRACT(EPOCH FROM (NOW() - s.timer_started_at))) / 60), ':',
            LPAD(FLOOR((s.timer_duration - EXTRACT(EPOCH FROM (NOW() - s.timer_started_at))) % 60)::TEXT, 2, '0')
        )
    END as timer_display,
    (s.participants_count - c.max_participants) as overtime_players
FROM winner_takes_all_sessions s
JOIN winner_takes_all_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY s.config_id;
```

---

## 📝 Summary

### Timer Behavior
✅ Starts when progress bar hits 100% (max_participants reached)  
✅ Extra players can join after timer starts  
✅ Prize pool keeps growing with late joins  
✅ Single winner gets 85% of final prize pool  
✅ Highest score wins  

### Files to Run
1. **`RESET_ALL_WTA_SESSIONS.sql`** - Reset for testing
2. **`FIX_WTA_COMPLETE_ALL_ERRORS.sql`** - Updated timer logic

### Next Steps
1. Run reset script
2. Test with multiple users
3. Verify timer starts at correct threshold
4. Verify late joins work
5. Verify payout is correct

---

**Status**: Timer Logic Updated ✅  
**Version**: 2.0.0  
**Last Updated**: 2025-11-13

