# Exact Client Flow - What Gets Passed to hs_join_v2

## 📋 Complete Flow

### 1. Page Load
```typescript
// Frontend calls: get_all_hot_sell_sessions()
// This returns array of sessions with status='active'
const sessions = await executeRpcWithSession('get_all_hot_sell_sessions');

// Example response:
[
  {
    id: "abc-123-def-456",           // UUID as string
    config_id: "hs-3-sword-parry",   // Text ID
    prize_pool: 3,
    base_price: 3,
    participants_count: 0,
    max_participants: 3,
    status: "active",                // ✅ Must be 'active' to be returned
    rng_seed: 5,
    created_at: "2025-11-10...",
    participants: []
  }
]
```

### 2. User Clicks "Join Game"
```typescript
// src/app/hot-sell/page.tsx (line 465-480)

const handleJoinSession = async (config: HotSellConfig) => {
  // config.id = "hs-3-sword-parry" (the config, not session!)
  
  // ⚠️ CRITICAL STEP: Find matching session
  const session = sessions.find(
    s => s.config_id === config.id && s.status !== 'completed'
  );
  
  if (!session) {
    setMessage({ type: 'error', text: 'No active session found' });
    return;
  }
  
  // ✅ Call RPC with SESSION UUID (not config ID!)
  const { data, error, isSessionValid } = await executeRpcWithSession('hs_join_v2', {
    p_session: session.id,        // ← UUID string: "abc-123-def-456"
    p_user: user.id,              // ← User UUID
    p_fee: config.entry_fee       // ← Number: 1
  });
};
```

### 3. Database Function Receives
```sql
-- hs_join_v2 receives:
p_session = 'abc-123-def-456'  -- Session UUID (not config!)
p_user = '9b69e5a8-ae5e-4531-8576-8f29648c6fb1'
p_fee = 1

-- Function does:
v_session_id := p_session::uuid;  -- Convert to UUID

SELECT * INTO v_session
FROM hot_sell_sessions
WHERE id = v_session_id FOR UPDATE;

IF NOT FOUND THEN
  RETURN 'Session not found';
END IF;

IF v_session.status <> 'active' THEN
  RETURN 'Session is not active';  -- ❌ YOUR ERROR
END IF;
```

---

## 🎯 The Problem

**Client expects**: `get_all_hot_sell_sessions()` returns sessions with `status='active'`

**Client passes**: `session.id` (UUID) from that list

**Database checks**: Does that session UUID exist AND have `status='active'`?

**Result**: ❌ Either:
1. The session doesn't exist in `hot_sell_sessions` table
2. The session exists but `status != 'active'`

---

## 🔍 Diagnostic Query for YOU to Run

```sql
-- Check what sessions exist for a specific config
SELECT 
  id,
  config_id,
  status,
  participants_count,
  max_participants,
  created_at
FROM hot_sell_sessions
WHERE config_id = 'hs-3-sword-parry'  -- Replace with actual config ID
ORDER BY created_at DESC
LIMIT 5;
```

**Expected result for working system:**
```
id                  | config_id          | status | participants | max
abc-123-def-456     | hs-3-sword-parry   | active | 0            | 3
```

**If you see:**
- **No rows**: Need to create sessions
- **status = 'waiting'**: Need to change to 'active'
- **status = 'completed'**: Need to create new active session

---

## 📝 What I Need From You

Please run this in Supabase SQL Editor and share the results:

```sql
-- 1. Check all Hot Sell sessions
SELECT 
  id,
  config_id,
  status,
  participants_count || '/' || max_participants as capacity,
  created_at::date
FROM hot_sell_sessions
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check all Hot Sell configs
SELECT id, title, entry_fee, max_participants
FROM hot_sell_configs
ORDER BY base_price;

-- 3. Count sessions by status
SELECT 
  status,
  COUNT(*) as count
FROM hot_sell_sessions
GROUP BY status;
```

---

## ✅ Confirmation

**Q: Should client pass session ID or config ID?**
**A: Client passes SESSION ID** ✅

Flow:
1. User selects a config (e.g., "hs-3-sword-parry")
2. Frontend finds active session for that config
3. Frontend passes that **session's UUID** to `hs_join_v2`

This is correct!

---

## 🔧 Most Likely Fix

Based on your setup, you need to **ensure sessions exist and are active**:

```sql
-- Check if sessions exist
SELECT COUNT(*) as active_sessions
FROM hot_sell_sessions
WHERE status = 'active';

-- If count = 0, run this:
INSERT INTO hot_sell_sessions (
  id, config_id, prize_pool, base_price,
  max_participants, participants_count, status
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.base_price,
  c.base_price,
  c.max_participants,
  0,
  'active'
FROM hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
);
```

---

## 🎯 Summary

| What Client Does | Value Passed | Type |
|-----------------|--------------|------|
| Loads sessions | `get_all_hot_sell_sessions()` | RPC call |
| Finds matching session | `sessions.find(s => s.config_id === config.id)` | Filter |
| Passes to join | `session.id` | UUID string |
| Database receives | `p_session = 'abc-123...'` | TEXT/UUID |
| Database converts | `v_session_id := p_session::uuid` | UUID |
| Database checks | `SELECT * FROM hot_sell_sessions WHERE id = v_session_id` | Lookup |

**The issue is**: That session row either doesn't exist or doesn't have `status='active'`

---

Please share the results of those 3 SQL queries above, and I can give you the exact one-line fix! 🎯

