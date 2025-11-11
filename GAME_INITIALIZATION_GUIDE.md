# 🎮 Game Initialization Guide for Supabase

This document contains all game configurations and initialization code for creating sessions in the database.

---

## 📊 Database Tables Structure

### 1. **Hot Sell Configs** (`hot_sell_configs`)
```sql
TABLE: public.hot_sell_configs
COLUMNS:
  - id (text, primary key) - Config identifier (e.g., 'hs-3-sword-parry')
  - game_type (text) - Game type (e.g., 'sword_parry', 'laser_dodge', 'multi_target_reaction')
  - title (text) - Display name
  - description (text) - Prize distribution description
  - entry_fee (numeric) - Token cost to join (usually 1)
  - base_price (numeric) - Prize pool value in dollars
  - max_participants (integer) - Maximum players
  - game_duration (integer) - Game duration in seconds
  - rng_seed (integer) - Random number generator seed
  - first_place_percent (numeric) - % for 1st place (50)
  - second_place_percent (numeric) - % for 2nd place (20)
  - third_place_percent (numeric) - % for 3rd place (15)
  - platform_fee_percent (numeric) - Platform fee % (15)
```

### 2. **Hot Sell Sessions** (`hot_sell_sessions`)
```sql
TABLE: public.hot_sell_sessions
COLUMNS:
  - id (uuid, primary key) - Session ID
  - config_id (text, foreign key → hot_sell_configs.id)
  - prize_pool (numeric) - Current accumulated prize pool
  - base_price (numeric) - Starting prize pool
  - max_participants (integer) - Max players
  - participants_count (integer) - Current player count
  - status (text) - 'waiting' | 'active' | 'completed'
  - rng_seed (integer) - RNG seed for fairness
  - created_at (timestamp)
  - updated_at (timestamp)
  - completed_at (timestamp, nullable)
  - first_place_user_id (uuid, nullable)
  - second_place_user_id (uuid, nullable)
  - third_place_user_id (uuid, nullable)
  - first_place_prize (numeric, nullable)
  - second_place_prize (numeric, nullable)
  - third_place_prize (numeric, nullable)
  - platform_fee (numeric, nullable)
```

### 3. **Winner Takes All Configs** (`winner_takes_all_configs`)
```sql
TABLE: public.winner_takes_all_configs
COLUMNS:
  - id (text, primary key) - Config identifier (e.g., 'wta-2-sword-parry')
  - game_type (text) - Game type
  - title (text) - Display name
  - description (text) - "Winner takes entire prize pool!"
  - entry_fee (numeric) - Token cost to join (usually 1)
  - prize_pool (numeric) - Total prize pool value
  - base_price (numeric) - Base prize value
  - game_duration (integer) - Timer duration in seconds
  - rng_seed (integer) - RNG seed
  - winner_prize (numeric) - Prize after platform fee
  - platform_fee (numeric) - Platform fee amount
```

### 4. **Winner Takes All Sessions** (`winner_takes_all_sessions`)
```sql
TABLE: public.winner_takes_all_sessions
COLUMNS:
  - id (uuid, primary key)
  - config_id (text, foreign key → winner_takes_all_configs.id)
  - current_pool (numeric) - Current prize pool
  - base_price (numeric) - Starting base price
  - participants_count (integer) - Player count
  - status (text) - 'waiting' | 'active' | 'completed'
  - timer_started_at (timestamp, nullable) - When countdown started
  - timer_duration (integer) - Countdown duration
  - winner_user_id (uuid, nullable)
  - prize_amount (numeric, nullable)
  - platform_fee (numeric, nullable)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### 5. **1v1 Configs** (`one_v_one_configs`)
```sql
TABLE: public.one_v_one_configs
COLUMNS:
  - id (text, primary key) - Config identifier (e.g., '1v1-5-laser-dodge')
  - game_type (text) - Game type
  - title (text) - Display name
  - description (text) - "Best of 1 head-to-head"
  - entry_fee (numeric) - Token cost per player (usually 1)
  - prize_pool (numeric) - Total prize pool
  - game_duration (integer) - Game time in seconds
  - rng_seed (integer) - RNG seed
  - winner_prize (numeric) - Winner's prize after fee
  - platform_fee (numeric) - Platform fee amount
```

### 6. **1v1 Sessions** (`one_v_one_sessions`)
```sql
TABLE: public.one_v_one_sessions
COLUMNS:
  - id (uuid, primary key)
  - config_id (text, foreign key → one_v_one_configs.id)
  - current_pool (numeric) - Current prize pool
  - prize_pool (numeric) - Starting prize pool
  - participants_count (integer) - Player count (max 2)
  - max_participants (integer) - Always 2
  - status (text) - 'waiting' | 'active' | 'completed'
  - winner_user_id (uuid, nullable)
  - prize_amount (numeric, nullable)
  - platform_fee (numeric, nullable)
  - created_at (timestamp)
  - updated_at (timestamp)
  - completed_at (timestamp, nullable)
```

---

## 🎯 Game Configurations (From Client Code)

### Hot Sell Game Configs

```javascript
// HOT SELL CONFIGS - All game configurations
const hotSellConfigs = [
  {
    id: 'hs-3-sword-parry',
    game_type: 'sword_parry',
    title: '$3 Hot Sell - Sword Parry',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 3,
    max_participants: 3,
    game_duration: 30,
    rng_seed: 5,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-3-blade-bounce',
    game_type: 'blade_bounce',
    title: '$3 Hot Sell - Blade Bounce',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 3,
    max_participants: 3,
    game_duration: 30,
    rng_seed: 6,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-5-laser-dodge',
    game_type: 'laser_dodge',
    title: '$5 Hot Sell - Laser Dodge',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 5,
    max_participants: 5,
    game_duration: 30,
    rng_seed: 7,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-10-laser-dodge',
    game_type: 'laser_dodge',
    title: '$10 Hot Sell - Laser Dodge',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 10,
    max_participants: 10,
    game_duration: 30,
    rng_seed: 9,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-25-multi-target',
    game_type: 'multi_target_reaction',
    title: '$25 Hot Sell - Multi Target',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 25,
    max_participants: 25,
    game_duration: 30,
    rng_seed: 11,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-50-sword-parry',
    game_type: 'sword_parry',
    title: '$50 Hot Sell - Sword Parry',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 50,
    max_participants: 50,
    game_duration: 30,
    rng_seed: 13,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-100-laser-dodge',
    game_type: 'laser_dodge',
    title: '$100 Hot Sell - Laser Dodge',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 100,
    max_participants: 100,
    game_duration: 30,
    rng_seed: 15,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-250-multi-target',
    game_type: 'multi_target_reaction',
    title: '$250 Hot Sell - Multi Target',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 250,
    max_participants: 250,
    game_duration: 30,
    rng_seed: 17,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  },
  {
    id: 'hs-1000-cash-stack',
    game_type: 'cash_stack',
    title: '$1000 Hot Sell - Cash Stack',
    description: '1st: 50%, 2nd: 20%, 3rd: 15%',
    entry_fee: 1,
    base_price: 1000,
    max_participants: 1000,
    game_duration: 30,
    rng_seed: 19,
    first_place_percent: 50,
    second_place_percent: 20,
    third_place_percent: 15,
    platform_fee_percent: 15
  }
];
```

### Winner Takes All Game Configs

```javascript
// WINNER TAKES ALL CONFIGS - All game configurations
const winnerTakesAllConfigs = [
  {
    id: 'wta-2-sword-parry',
    game_type: 'sword_parry',
    title: '$2 Winner Takes It All - Sword Parry',
    description: 'Winner takes the entire $2 prize pool!',
    entry_fee: 1,
    prize_pool: 2,
    base_price: 2,
    game_duration: 30,
    rng_seed: 5,
    winner_prize: 1.70,
    platform_fee: 0.30
  },
  {
    id: 'wta-5-blade-bounce',
    game_type: 'blade_bounce',
    title: '$5 Winner Takes It All - Blade Bounce',
    description: 'Winner takes the entire $5 prize pool!',
    entry_fee: 1,
    prize_pool: 5,
    base_price: 5,
    game_duration: 45,
    rng_seed: 6,
    winner_prize: 4.25,
    platform_fee: 0.75
  },
  {
    id: 'wta-10-laser-dodge',
    game_type: 'laser_dodge',
    title: '$10 Winner Takes It All - Laser Dodge',
    description: 'Winner takes the entire $10 prize pool!',
    entry_fee: 1,
    prize_pool: 10,
    base_price: 10,
    game_duration: 60,
    rng_seed: 7,
    winner_prize: 8.50,
    platform_fee: 1.50
  },
  {
    id: 'wta-25-multi-target',
    game_type: 'multi_target_reaction',
    title: '$25 Winner Takes It All - Multi Target',
    description: 'Winner takes the entire $25 prize pool!',
    entry_fee: 1,
    prize_pool: 25,
    base_price: 25,
    game_duration: 90,
    rng_seed: 8,
    winner_prize: 21.25,
    platform_fee: 3.75
  },
  {
    id: 'wta-50-sword-parry',
    game_type: 'sword_parry',
    title: '$50 Winner Takes It All - Sword Parry',
    description: 'Winner takes the entire $50 prize pool!',
    entry_fee: 1,
    prize_pool: 50,
    base_price: 50,
    game_duration: 120,
    rng_seed: 9,
    winner_prize: 42.50,
    platform_fee: 7.50
  },
  {
    id: 'wta-100-laser-dodge',
    game_type: 'laser_dodge',
    title: '$100 Winner Takes It All - Laser Dodge',
    description: 'Winner takes the entire $100 prize pool!',
    entry_fee: 1,
    prize_pool: 100,
    base_price: 100,
    game_duration: 150,
    rng_seed: 10,
    winner_prize: 85.00,
    platform_fee: 15.00
  },
  {
    id: 'wta-250-multi-target',
    game_type: 'multi_target_reaction',
    title: '$250 Winner Takes It All - Multi Target',
    description: 'Winner takes the entire $250 prize pool!',
    entry_fee: 1,
    prize_pool: 250,
    base_price: 250,
    game_duration: 180,
    rng_seed: 11,
    winner_prize: 212.50,
    platform_fee: 37.50
  },
  {
    id: 'wta-1000-cash-stack',
    game_type: 'cash_stack',
    title: '$1000 Winner Takes It All - Cash Stack',
    description: 'Winner takes the entire $1000 prize pool!',
    entry_fee: 1,
    prize_pool: 1000,
    base_price: 1000,
    game_duration: 240,
    rng_seed: 12,
    winner_prize: 850.00,
    platform_fee: 150.00
  },
  {
    id: 'wta-2500-falling-objects',
    game_type: 'falling_object',
    title: '$2500 Winner Takes It All - Falling Objects',
    description: 'Winner takes the entire $2500 prize pool!',
    entry_fee: 1,
    prize_pool: 2500,
    base_price: 2500,
    game_duration: 300,
    rng_seed: 13,
    winner_prize: 2125.00,
    platform_fee: 375.00
  }
];
```

---

## 🔌 Client-Side Initialization Code

### How the Client Loads Sessions

```typescript
// HOT SELL PAGE - /hot-sell/page.tsx
const loadSessions = useCallback(async () => {
  try {
    console.log('🔥 [Hot Sell] Loading sessions...');
    
    // Check auth is ready
    const authCheck = await ensureAuthReady(isAuthenticated, authLoading);
    if (!authCheck.ready) {
      console.warn('⚠️ [Hot Sell] Auth not ready:', authCheck.message);
      setIsLoading(false);
      return;
    }
    
    // Call RPC with session guard
    const { data, error, isSessionValid } = await executeRpcWithSession('get_all_hot_sell_sessions');
    
    if (!isSessionValid) {
      console.error('❌ [Hot Sell] Session is not active');
      setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
      setSessions([]);
      setIsLoading(false);
      return;
    }
    
    if (error) {
      console.error('❌ [Hot Sell] Error loading sessions:', error);
      // Handle error...
    } else {
      console.log('✅ [Hot Sell] Sessions loaded:', data?.length || 0);
      setSessions(data || []);
    }
  } catch (error) {
    console.error('❌ [Hot Sell] Error loading sessions:', error);
  } finally {
    setIsLoading(false);
  }
}, [isAuthenticated, authLoading]);
```

```typescript
// WINNER TAKES ALL PAGE - /winner-takes-all/page.tsx
const loadSessions = useCallback(async () => {
  try {
    console.log('🔄 [Winner Takes All] Loading sessions from database...');
    
    const authCheck = await ensureAuthReady(isAuthenticated, authLoading);
    if (!authCheck.ready) {
      console.warn('⚠️ [Winner Takes All] Auth not ready:', authCheck.message);
      setIsLoading(false);
      return;
    }
    
    // First, run conditional reset (if timer expired, reset session)
    const { error: resetError } = await executeRpcWithSession('conditional_wta_reset');
    if (resetError) {
      console.error('❌ [Winner Takes All] Conditional reset error:', resetError);
    }
    
    // Then load sessions
    const { data, error, isSessionValid } = await executeRpcWithSession('get_winner_takes_all_session');
    
    if (!isSessionValid) {
      console.error('❌ [Winner Takes All] Session is not active');
      setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
      setSessions([]);
      return;
    }
    
    if (error) {
      console.error('❌ [Winner Takes All] Error loading sessions:', error);
    } else {
      console.log('📊 [Winner Takes All] Sessions data:', data);
      setSessions(data || []);
    }
  } catch (error) {
    console.error('❌ [Winner Takes All] Error:', error);
  }
}, [isAuthenticated, authLoading]);
```

```typescript
// 1V1 TOURNAMENTS PAGE - /tournaments/1v1/page.tsx
const loadSessions = useCallback(async () => {
  try {
    console.log('🔄 [1v1] Loading sessions from database...');
    
    const authCheck = await ensureAuthReady(isAuthenticated, authLoading);
    if (!authCheck.ready) {
      console.warn('⚠️ [1v1] Auth not ready:', authCheck.message);
      setIsLoading(false);
      return;
    }
    
    const { data, error, isSessionValid } = await executeRpcWithSession('get_all_1v1_sessions');
    
    if (!isSessionValid) {
      console.error('❌ [1v1] Session is not active');
      setMessage({ type: 'error', text: 'Your session has expired. Please log in again.' });
      setSessions([]);
      setIsLoading(false);
      return;
    }
    
    if (error) {
      console.error('❌ [1v1] Error loading sessions:', error);
    } else {
      console.log('✅ [1v1] Sessions loaded:', data?.length || 0);
      setSessions(data || []);
    }
  } catch (error) {
    console.error('❌ [1v1] Error loading sessions:', error);
  } finally {
    setIsLoading(false);
  }
}, [isAuthenticated, authLoading]);
```

---

## 🚀 RPC Functions Called by Client

### Hot Sell RPCs
- `get_all_hot_sell_sessions` - Load all Hot Sell sessions with participants
- `hs_join_v2` - Join a Hot Sell session
- `update_hot_sell_score` - Submit player score
- `process_hot_sell_payout_complete` - Trigger payout when session completes

### Winner Takes All RPCs
- `get_winner_takes_all_session` - Load Winner Takes All sessions
- `conditional_wta_reset` - Reset sessions where timer expired
- `join_winner_takes_all_session` - Join a WTA session
- `update_winner_takes_all_score` - Submit player score

### 1v1 Tournament RPCs
- `get_all_1v1_sessions` - Load all 1v1 sessions
- `join_1v1_session` - Join a 1v1 match
- `update_1v1_score` - Submit player score
- `process_1v1_payout` - Trigger payout when both players finish

---

## ✅ Requirements for Session Creation

### Each config MUST have an active session with:

```sql
-- Hot Sell Session Creation Template
INSERT INTO hot_sell_sessions (
  id,                     -- gen_random_uuid()
  config_id,              -- From hot_sell_configs (e.g., 'hs-3-sword-parry')
  prize_pool,             -- = config.base_price
  base_price,             -- = config.base_price
  max_participants,       -- = config.max_participants
  participants_count,     -- Start at 0
  status,                 -- 'active' (CRITICAL!)
  rng_seed,               -- floor(random() * 1000000)::INTEGER
  created_at,             -- NOW()
  updated_at              -- NOW()
) VALUES (...);
```

### Session Status Rules:
- **'active'** = Ready for players to join (this is what client needs!)
- **'waiting'** = Session created but not yet active
- **'completed'** = Game finished, winners determined

---

## 🎯 For Supabase AI: Session Creation Request

**To create sessions for all games, use this pattern:**

```sql
-- Create active sessions for all Hot Sell configs
INSERT INTO hot_sell_sessions (id, config_id, prize_pool, base_price, max_participants, participants_count, status, rng_seed, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  c.id,
  c.base_price,
  c.base_price,
  c.max_participants,
  0,
  'active',
  floor(random() * 1000000)::INTEGER,
  NOW(),
  NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
);
```

Repeat this pattern for:
- `winner_takes_all_sessions` (using `winner_takes_all_configs`)
- `one_v_one_sessions` (using `one_v_one_configs`)

---

## 📝 Summary for Supabase AI

**What you need to do:**
1. Ensure all configs exist in their respective `_configs` tables
2. Create ONE `'active'` session per config in the corresponding `_sessions` table
3. Each session must have:
   - Unique UUID `id`
   - Valid `config_id` (foreign key)
   - `status = 'active'` ← **THIS IS CRITICAL!**
   - `participants_count = 0`
   - Random `rng_seed`
   - Current timestamps

**Games won't load until every config has at least one 'active' session!**

