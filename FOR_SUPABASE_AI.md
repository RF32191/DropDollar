# 🤖 Instructions for Supabase AI

## Problem
My games aren't loading because configs don't have 'active' sessions.

## What I Need
Create ONE `'active'` session for EVERY game config in these three game types:
1. **Hot Sell** (`hot_sell_sessions` ← `hot_sell_configs`)
2. **Winner Takes All** (`winner_takes_all_sessions` ← `winner_takes_all_configs`)  
3. **1v1 Tournaments** (`one_v_one_sessions` ← `one_v_one_configs`)

## Game Config IDs

### Hot Sell Config IDs:
- `hs-3-sword-parry`
- `hs-3-blade-bounce`
- `hs-5-laser-dodge`
- `hs-10-laser-dodge`
- `hs-25-multi-target`
- `hs-50-sword-parry`
- `hs-100-laser-dodge`
- `hs-250-multi-target`
- `hs-1000-cash-stack`

### Winner Takes All Config IDs:
- `wta-2-sword-parry`
- `wta-5-blade-bounce`
- `wta-10-laser-dodge`
- `wta-25-multi-target`
- `wta-50-sword-parry`
- `wta-100-laser-dodge`
- `wta-250-multi-target`
- `wta-1000-cash-stack`
- `wta-2500-falling-objects`

### 1v1 Config IDs:
(Load from `one_v_one_configs` table - whatever exists there)

## Client Code Expectations

### Hot Sell Page (`/hot-sell`)
- **Calls RPC:** `get_all_hot_sell_sessions`
- **Expects:** Array of sessions with `status = 'active'`
- **Joins via RPC:** `hs_join_v2` (which checks `status = 'active'`)

### Winner Takes All Page (`/winner-takes-all`)
- **Calls RPC:** `get_winner_takes_all_session`
- **Expects:** Sessions with `status = 'active'`
- **Also calls:** `conditional_wta_reset` before loading

### 1v1 Page (`/tournaments/1v1`)
- **Calls RPC:** `get_all_1v1_sessions`
- **Expects:** Sessions with `status = 'active'`
- **Joins via RPC:** `join_1v1_session`

## The Fix

**Run the SQL script `CREATE_ALL_GAME_SESSIONS.sql` to:**

1. Create `'active'` sessions for all Hot Sell configs
2. Create `'active'` sessions for all Winner Takes All configs
3. Create `'active'` sessions for all 1v1 configs
4. Skip configs that already have active sessions (no duplicates)
5. Verify all configs have sessions at the end

## Critical Requirements

Each session MUST have:
- ✅ `status = 'active'` ← **ABSOLUTELY REQUIRED**
- ✅ `participants_count = 0` (starts empty)
- ✅ Valid `config_id` (foreign key to config table)
- ✅ Random `rng_seed` for fairness
- ✅ `prize_pool` / `current_pool` = config's `base_price`

## How to Run

**Option 1:** Run `CREATE_ALL_GAME_SESSIONS.sql` in Supabase SQL Editor

**Option 2:** Use this quick command:
```sql
-- Create sessions for all configs that don't have active sessions
INSERT INTO hot_sell_sessions (id, config_id, prize_pool, base_price, max_participants, participants_count, status, rng_seed, created_at, updated_at)
SELECT gen_random_uuid(), c.id, c.base_price, c.base_price, c.max_participants, 0, 'active', floor(random() * 1000000)::INTEGER, NOW(), NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (SELECT 1 FROM hot_sell_sessions s WHERE s.config_id = c.id AND s.status = 'active');

-- Repeat for winner_takes_all_sessions and one_v_one_sessions
```

## Verification

After running, check:
```sql
-- Should return matching numbers
SELECT 
  (SELECT COUNT(*) FROM hot_sell_configs) as configs,
  (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') as sessions;
```

---

**Once sessions are created, games will load immediately! 🎮**

