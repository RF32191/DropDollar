# Winner Takes All - Final Type Casting Fix

## Problem
`operator does not exist: text = uuid` error occurs when comparing columns that have mismatched types (TEXT vs UUID).

## Root Cause
The `winner_takes_all_sessions.id` and `winner_takes_all_participants.session_id` columns may have inconsistent types across deployments.

## Solution Applied - TRUE HOT SELL METHOD

### 1. `wta_join_v2` Function (Lines 174-319)

**Pattern: Convert TEXT to UUID immediately, use UUID everywhere**

```sql
DECLARE
    v_session_uuid UUID;  -- UUID variable only
BEGIN
    -- Convert TEXT input to UUID at start
    BEGIN
        v_session_uuid := p_session::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid session ID format');
    END;
    
    -- All comparisons use direct UUID (NO casting)
    WHERE id = v_session_uuid
    WHERE session_id = v_session_uuid
    
    -- INSERT uses direct UUID
    VALUES (v_participant_id, v_session_uuid, p_user, NOW())
```

**Key Points:**
- ✅ Accept TEXT parameter for API flexibility
- ✅ Convert to UUID with error handling
- ✅ Use UUID variable directly in ALL comparisons (no ::TEXT casting)
- ✅ Only cast to TEXT for JSON response

### 2. `get_all_winner_takes_all_sessions` Function (Lines 89-172)

**Pattern: LEFT JOIN with explicit TEXT casting**

```sql
LEFT JOIN public.winner_takes_all_participants part 
    ON part.session_id::TEXT = sess.id::TEXT
```

**Why TEXT casting here?**
- JOIN operations need explicit type matching
- Casting both sides to TEXT handles all scenarios:
  - UUID = UUID → cast to TEXT
  - TEXT = UUID → cast to TEXT
  - TEXT = TEXT → no-op cast

### 3. All Other Functions

Search performed to verify no other type mismatches exist:
- ✅ All `WHERE id =` comparisons use UUID variables
- ✅ No uncast JOIN conditions found
- ✅ All user_id comparisons use UUID types

## Verification Checklist

Before running the SQL, verify these column types:

```sql
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('winner_takes_all_sessions', 'winner_takes_all_participants')
AND column_name IN ('id', 'session_id')
ORDER BY table_name, column_name;
```

**Expected:**
- `winner_takes_all_sessions.id` → UUID
- `winner_takes_all_participants.session_id` → UUID (FK reference)

## Fair Skill-Based Gaming Features Preserved

All the following features remain intact and functional:

### ⚖️ Fair Gameplay
- **RNG Seeding**: Each session has a deterministic seed from config
- **Client-Side RNG**: Game logic runs on client using session seed
- **Score Validation**: Server validates scores against expected ranges

### 🛡️ Anti-Cheat System
- **Perfect Score Detection**: Flags 100% accuracy or max scores
- **Timing Analysis**: Detects impossibly fast game completion
- **Pattern Recognition**: Identifies suspicious score patterns
- **Audit Logging**: All suspicious games logged to `game_audit_logs`

### 📊 Rate Limiting
- **Hourly Limit**: 30 games per hour per user
- **Daily Limit**: 200 games per day per user
- **Tracked in**: `user_rate_limits` table

### 💰 Dual Wallet System
- **Purchased Tokens**: Bought with real money
- **Won Tokens**: Earned from gameplay
- **Spend Priority**: Purchased tokens used first, then won tokens
- **Transaction History**: All tracked in `token_transactions`

### 🔔 Admin Notifications
- **Master Admin**: Special role for oversight
- **Audit Alerts**: Notified of potential cheating
- **Review System**: Admins can review flagged games
- **Admin Dashboard**: `admin_notifications` table

### 📋 Complete Function List

1. **wta_join_v2** - Join game session with validation
2. **get_all_winner_takes_all_sessions** - Fetch active sessions
3. **log_suspicious_game_activity** - Log potential cheating
4. **check_game_session_for_cheating** - Automated cheat detection
5. **get_unreviewed_audit_logs** - Admin review queue
6. **create_master_admin** - Setup admin accounts

## Testing After Deployment

1. **Join a Session**:
   ```sql
   SELECT * FROM wta_join_v2(
       'your-session-id-here',
       'your-user-id-here'::UUID,
       10.00
   );
   ```

2. **Get Active Sessions**:
   ```sql
   SELECT * FROM get_all_winner_takes_all_sessions();
   ```

3. **Check Audit Logs**:
   ```sql
   SELECT * FROM get_unreviewed_audit_logs();
   ```

## Common Errors and Solutions

### Error: "column does not exist: prize_pool"
**Solution**: Part 1 of the SQL standardizes to `prize_pool` column

### Error: "foreign key constraint failed"
**Solution**: Ensure user exists in `auth.users` before creating admin

### Error: "session not found"
**Solution**: Check that `winner_takes_all_sessions` table has active sessions

## File to Run

**Single file contains everything:**
```
FIX_WTA_COMPLETE_ALL_ERRORS.sql
```

This file includes:
1. Column standardization (prize_pool)
2. Fixed get_all_winner_takes_all_sessions (LEFT JOIN with TEXT casting)
3. Fixed wta_join_v2 (TRUE hot sell method - UUID only)
4. Admin profile system
5. Audit logging system
6. Anti-cheat triggers
7. All supporting tables and RLS policies

## Success Indicators

After running, you should see:
- ✅ No "operator does not exist" errors
- ✅ No "column is ambiguous" errors
- ✅ Sessions can be joined successfully
- ✅ Sessions display with participant lists
- ✅ Token deductions work correctly
- ✅ Audit logs capture suspicious activity
- ✅ Rate limits enforce properly

---

**Last Updated**: This fix resolves all known type mismatch issues while maintaining complete fair gaming integrity.

