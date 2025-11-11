# Safe Execution Guide - Hot Sell Session Fix

## 🔒 Security Guarantees

✅ **RNG Integrity**: New sessions get `random()` seed, existing sessions NEVER modified  
✅ **No RLS Changes**: Only `hot_sell_sessions` table data affected  
✅ **Audit Logged**: Every action logged to `game_session_audit`  
✅ **Rollback Safe**: All operations can be rolled back if needed  
✅ **Phased Approach**: Read → Diagnose → Write (you control each step)

---

## 📋 Execution Steps

### Step 1: READ-ONLY Diagnosis (Safe Now) ✅

**File**: `PHASE1_READ_ONLY_DIAGNOSIS.sql`

**What it does**:
- Counts sessions by status
- Identifies which configs lack active sessions
- Shows recommendation

**How to run**:
```sql
-- In Supabase SQL Editor
-- Copy/paste contents of PHASE1_READ_ONLY_DIAGNOSIS.sql
-- Click "Run"
```

**Expected output**:
```
❌ NO ACTIVE SESSIONS - Need to create
OR
⚠️ SOME CONFIGS MISSING SESSIONS  
OR
✅ ACTIVE SESSIONS EXIST
```

---

### Step 2: Review & Decide

Based on Phase 1 results, choose your action:

**Scenario A: No active sessions exist**
→ Run `PHASE2_MINIMAL_WRITE_FIX.sql`

**Scenario B: Some configs missing sessions**
→ Run `PHASE2_MINIMAL_WRITE_FIX.sql`

**Scenario C: Active sessions exist but users still get error**
→ Need specific session UUID to debug further

---

### Step 3: WRITE Operations (After Your Approval) 🔐

**File**: `PHASE2_MINIMAL_WRITE_FIX.sql`

**What it does**:
1. Creates active sessions ONLY for configs that lack them
2. Uses `random()` for new RNG seeds
3. Logs every creation to `game_session_audit`
4. Verifies the fix worked
5. Shows what was created

**Safety features**:
- Uses `DO $$` block (atomic transaction)
- Only INSERTs, never UPDATEs existing sessions
- Never modifies RNG seeds of existing sessions
- Wrapped in transaction (auto-rollback on error)

**When you're ready**:
```sql
-- In Supabase SQL Editor
-- Copy/paste contents of PHASE2_MINIMAL_WRITE_FIX.sql
-- Click "Run"
```

**Expected output**:
```
✅ Created active session for config: hs-3-sword-parry
✅ Created active session for config: hs-5-blade-bounce
📊 Total sessions created: 5
✅ SUCCESS - All configs have active sessions
```

---

### Step 4: AUTOMATION (Optional) 🤖

**File**: `PHASE3_AUTOMATION_OPTIONAL.sql`

**What it adds**:
1. **Function**: `ensure_active_hot_sell_sessions()` - manually callable
2. **Indexes**: Performance optimization for session lookups
3. **Trigger** (commented): Auto-create session when one completes
4. **Cron** (commented): Auto-check every 5 minutes

**Choose what you want**:
```sql
-- Option A: Just the function (manual calls)
-- Run lines 1-75 only

-- Option B: Function + Indexes
-- Run lines 1-90

-- Option C: Function + Indexes + Trigger
-- Uncomment lines 144-149, then run

-- Option D: Everything + Cron
-- Uncomment lines 104-117, then run (requires pg_cron)
```

**Test the function**:
```sql
-- Call manually anytime
SELECT * FROM ensure_active_hot_sell_sessions();
```

---

## 🎯 Recommended Path

### For Immediate Fix:
1. ✅ Run `PHASE1_READ_ONLY_DIAGNOSIS.sql` (safe, read-only)
2. ⏸️ Review results
3. ✅ Run `PHASE2_MINIMAL_WRITE_FIX.sql` (minimal writes with audit)
4. ✅ Test: Login and try joining a game

### For Long-term Stability:
5. ✅ Run `PHASE3_AUTOMATION_OPTIONAL.sql` (function + indexes)
6. ⏸️ Decide on trigger vs cron vs manual calls
7. ✅ Set up monitoring/alerts

---

## 📊 Audit Trail

After running Phase 2, check what was logged:

```sql
-- View audit log
SELECT 
  session_id,
  action,
  performed_by,
  details,
  created_at
FROM game_session_audit
WHERE action IN ('session_created', 'auto_session_created')
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔄 Rollback Plan

If something goes wrong:

```sql
-- Option A: Delete newly created sessions
DELETE FROM hot_sell_sessions
WHERE created_at > '2025-11-10 HH:MM:SS'  -- Your run time
  AND participants_count = 0;

-- Option B: Set them to 'waiting' instead
UPDATE hot_sell_sessions
SET status = 'waiting'
WHERE created_at > '2025-11-10 HH:MM:SS'
  AND participants_count = 0;
```

---

## ✅ Tell Me When You're Ready

**Current Status**: Writes disabled, waiting for your approval

**Say "Run Phase 1"** and I'll wait for results  
**Say "Run Phase 2"** after you review Phase 1  
**Say "Run Phase 3"** if you want automation  

OR

**Share Phase 1 results** and I'll provide the exact one-line fix customized to your specific situation.

---

## 🎮 Expected Result

After Phase 2, users should be able to:
1. ✅ Load game page (sees configs)
2. ✅ See "Join Game" button (active session exists)
3. ✅ Click "Join Game" (hs_join_v2 succeeds)
4. ✅ Play the game (no "Session is not active" error)

---

**Created**: November 10, 2025  
**Security**: RNG integrity maintained, audit logged, rollback safe  
**Status**: ⏸️ Awaiting your approval to execute writes

