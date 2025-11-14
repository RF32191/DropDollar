# Timer, Username, & Payout Fix - Quick Guide

## ✅ What Was Fixed

### 1. **Timer Not Starting** ✅ FIXED
**Problem**: Timer wasn't starting when first player joined  
**Solution**: Added timer logic to `wta_join_v2` function

**Changes:**
```sql
-- When first player joins (participants_count = 0):
status = 'active'  -- Activates session
timer_started_at = NOW()  -- Starts countdown
```

### 2. **Usernames Missing from Scoreboard** ✅ FIXED
**Problem**: Participant usernames not showing in dropdown  
**Solution**: Added username capture and storage

**Changes:**
```sql
-- Get username from users table
SELECT username INTO v_username FROM users WHERE id = p_user;

-- Store in participants table
INSERT INTO winner_takes_all_participants (id, session_id, user_id, username, joined_at)
VALUES (v_participant_id, v_session_uuid, p_user, COALESCE(v_username, 'Anonymous'), NOW());
```

### 3. **Payout Verification** ✅ CONFIRMED
**Status**: Payout function already correct  
**Pays to**: `won_tokens` wallet (fair gaming compliance)  
**Amount**: 85% of prize pool to winner, 15% platform fee

---

## 🚀 How to Apply the Fix

### Step 1: Re-run the SQL File
```
1. Open Supabase SQL Editor
2. Copy/paste entire: FIX_WTA_COMPLETE_ALL_ERRORS.sql
3. Click "Run"
```

### Step 2: Verify Timer Logic
```sql
-- Check that sessions are being activated
SELECT 
    config_id,
    status,
    participants_count,
    timer_started_at,
    CASE 
        WHEN timer_started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - timer_started_at))
        ELSE NULL
    END as seconds_elapsed
FROM winner_takes_all_sessions
WHERE status IN ('waiting', 'active')
ORDER BY timer_started_at DESC;
```

**Expected Results:**
- When first player joins: `status='active'` and `timer_started_at` is set
- `seconds_elapsed` should show time since timer started

### Step 3: Verify Usernames
```sql
-- Check usernames are being captured
SELECT 
    p.id,
    p.session_id,
    p.user_id,
    p.username,
    p.joined_at
FROM winner_takes_all_participants p
ORDER BY p.joined_at DESC
LIMIT 10;
```

**Expected Results:**
- `username` column should show actual usernames (not NULL)
- If username is missing from users table, shows 'Anonymous'

### Step 4: Verify Payouts
```sql
-- Check recent payouts
SELECT 
    s.config_id,
    u.username as winner,
    u.won_tokens as winner_won_balance,
    s.winner_prize,
    s.platform_fee_amount,
    s.prize_pool as total_pot,
    t.amount as transaction_amount,
    t.transaction_type,
    s.completed_at
FROM winner_takes_all_sessions s
JOIN users u ON s.winner_user_id = u.id
LEFT JOIN token_transactions t ON t.user_id = s.winner_user_id 
    AND t.transaction_type = 'game_win'
    AND t.created_at >= s.completed_at - INTERVAL '1 minute'
WHERE s.status = 'completed'
ORDER BY s.completed_at DESC
LIMIT 5;
```

**Expected Results:**
- `winner_won_balance` should include the prize
- `transaction_amount` should match `winner_prize`
- `transaction_type` should be 'game_win'

---

## 🧪 Testing Procedure

### Test 1: Timer Starts on First Join
```
1. Create a new session (or ensure session has 0 participants)
2. Join the session
3. Check: timer_started_at should be set
4. Check: status should change to 'active'
5. Frontend should show countdown timer
```

**Verify:**
```sql
SELECT config_id, status, participants_count, timer_started_at 
FROM winner_takes_all_sessions 
WHERE config_id = 'your-config-id';
```

### Test 2: Username Shows in Scoreboard
```
1. Join a session
2. Open scoreboard dropdown
3. Check: Your username should be visible
4. Check: Other players' usernames should be visible
```

**Verify:**
```sql
SELECT username FROM winner_takes_all_participants 
WHERE session_id = 'your-session-id';
```

### Test 3: Payout Goes to Won Wallet
```
1. Join a session
2. Play and submit score
3. Wait for timer to expire
4. After 3 seconds, payout triggers
5. Check your won_tokens balance increased
```

**Verify:**
```sql
-- Before payout
SELECT 
    id, 
    username, 
    purchased_tokens, 
    won_tokens 
FROM users 
WHERE id = 'your-user-id';

-- After payout (won_tokens should increase by prize amount)
```

---

## 🐛 Troubleshooting

### Timer Not Starting

**Symptom**: Timer stays NULL after joining  
**Check:**
```sql
SELECT status, participants_count, timer_started_at 
FROM winner_takes_all_sessions 
WHERE config_id = 'your-config-id';
```

**Possible Issues:**
1. **participants_count not 0**: Timer only starts on FIRST join
   - **Fix**: Reset session or wait for it to complete
   
2. **Status not changing to 'active'**:
   - **Check**: Ensure logic is `WHEN participants_count = 0 THEN 'active'`
   - **Re-run**: FIX_WTA_COMPLETE_ALL_ERRORS.sql

### Usernames Not Showing

**Symptom**: Scoreboard shows NULL or blank usernames  
**Check:**
```sql
-- Check if usernames exist in users table
SELECT id, username FROM users WHERE id = 'your-user-id';

-- Check if username was stored in participants
SELECT username FROM winner_takes_all_participants WHERE user_id = 'your-user-id';
```

**Possible Issues:**
1. **Username NULL in users table**:
   - Users should have usernames set during registration
   - Fallback shows 'Anonymous'

2. **Column doesn't exist**:
   ```sql
   -- Add column if missing
   ALTER TABLE winner_takes_all_participants 
   ADD COLUMN IF NOT EXISTS username TEXT;
   ```

### Payout Not Received

**Symptom**: Winner doesn't receive tokens  
**Check:**
```sql
-- Check if payout ran
SELECT winner_user_id, winner_prize, platform_fee_amount, completed_at
FROM winner_takes_all_sessions
WHERE config_id = 'your-config-id' AND status = 'completed';

-- Check user balance before/after
SELECT won_tokens FROM users WHERE id = 'winner-user-id';

-- Check transaction log
SELECT * FROM token_transactions 
WHERE user_id = 'winner-user-id' 
AND transaction_type = 'game_win' 
ORDER BY created_at DESC LIMIT 5;
```

**Possible Issues:**
1. **Payout didn't run**:
   - Timer may not have expired
   - No scores submitted
   - Manual trigger: `SELECT process_wta_payout('config-id');`

2. **Wrong wallet**:
   - Should go to `won_tokens`, not `purchased_tokens`
   - Check `process_wta_payout` function uses `won_tokens`

---

## 📊 Debug Queries

### Full Session Status
```sql
SELECT 
    s.config_id,
    s.status,
    s.participants_count,
    s.prize_pool,
    s.timer_started_at,
    s.timer_duration,
    s.winner_user_id,
    s.winner_prize,
    s.completed_at,
    -- Calculate remaining time
    CASE 
        WHEN s.timer_started_at IS NOT NULL AND s.status = 'active' THEN
            GREATEST(0, s.timer_duration - EXTRACT(EPOCH FROM (NOW() - s.timer_started_at)))
        ELSE NULL
    END as seconds_remaining,
    -- Get participant count with usernames
    (SELECT COUNT(*) FROM winner_takes_all_participants 
     WHERE session_id = s.id AND username IS NOT NULL) as participants_with_usernames
FROM winner_takes_all_sessions s
WHERE s.config_id = 'your-config-id';
```

### Participant Details
```sql
SELECT 
    p.username,
    p.user_id,
    p.score,
    p.accuracy,
    p.joined_at,
    p.completed_at,
    u.won_tokens as current_won_balance
FROM winner_takes_all_participants p
JOIN users u ON p.user_id = u.id
WHERE p.session_id = 'your-session-id'
ORDER BY p.score DESC NULLS LAST, p.completed_at ASC;
```

### Payout Audit Trail
```sql
SELECT 
    'Session' as source,
    s.config_id as identifier,
    s.winner_user_id,
    s.winner_prize as amount,
    s.completed_at as timestamp
FROM winner_takes_all_sessions s
WHERE s.winner_user_id = 'user-id'

UNION ALL

SELECT 
    'Transaction' as source,
    t.description as identifier,
    t.user_id,
    t.amount,
    t.created_at as timestamp
FROM token_transactions t
WHERE t.user_id = 'user-id' AND t.transaction_type = 'game_win'

ORDER BY timestamp DESC;
```

---

## ✅ Success Indicators

After applying the fix, you should see:

1. **Timer Status**
   - ✅ First join sets `timer_started_at`
   - ✅ Status changes to 'active'
   - ✅ Frontend countdown displays
   - ✅ Timer expires after 60 seconds

2. **Username Display**
   - ✅ Usernames visible in participants table
   - ✅ Scoreboard dropdown shows names
   - ✅ 'Anonymous' appears if username NULL

3. **Payout Process**
   - ✅ Winner identified (highest score)
   - ✅ 85% goes to `won_tokens`
   - ✅ 15% recorded as platform fee
   - ✅ Transaction logged
   - ✅ Session marked 'completed'

---

## 🔧 Quick Fixes

### Reset a Stuck Session
```sql
UPDATE winner_takes_all_sessions
SET 
    status = 'waiting',
    participants_count = 0,
    prize_pool = 0,
    timer_started_at = NULL,
    winner_user_id = NULL,
    winner_prize = NULL,
    completed_at = NULL
WHERE config_id = 'your-config-id';

DELETE FROM winner_takes_all_participants 
WHERE session_id = (
    SELECT id FROM winner_takes_all_sessions 
    WHERE config_id = 'your-config-id'
);
```

### Manually Trigger Payout
```sql
SELECT process_wta_payout('your-config-id');
```

### Check Auto-Payout System
```sql
SELECT check_expired_wta_sessions();
```

---

## 📞 Support

If issues persist after applying fixes:

1. **Check SQL ran successfully**: Look for error messages
2. **Verify schema**: Ensure all columns exist
3. **Check RLS policies**: Ensure they're not blocking operations
4. **Review logs**: Check Supabase logs for errors

**Files to re-run if needed:**
- `FIX_WTA_COMPLETE_ALL_ERRORS.sql` - Complete fix

---

**Version**: 1.1.0  
**Last Updated**: 2025-11-13  
**Status**: Timer, Username, Payout - All Fixed ✅

