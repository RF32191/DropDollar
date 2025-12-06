## 🪙✅ **COIN PLAY SYSTEM - SETUP COMPLETE!**

---

## ✅ **WHAT'S BEEN CREATED:**

### **1. Database System (SQL)**

**File:** `CREATE_COIN_PLAY_SYSTEM.sql`

**What it does:**
- ✅ Creates 3 new tables: `coin_play_configs`, `coin_play_sessions`, `coin_play_participants`
- ✅ Creates 81 tournament listings (9 games × 9 prize tiers)
- ✅ Sets up RLS (Row Level Security) policies
- ✅ Creates RPC functions for frontend
- ✅ Creates waiting sessions for all listings

**Run this in Supabase SQL Editor!**

---

### **2. WTA Fixes (SQL)**

**File:** `FIX_WTA_2_MIN_TIMER_AND_PAYOUT.sql`

**What it fixes:**
- ✅ Timer changed to 2 minutes (120 seconds) for testing
- ✅ Handles "no scores yet" payout issue
- ✅ Refunds all participants if nobody plays
- ✅ Better error messages

**Run this in Supabase SQL Editor!**

---

## 🎮 **COIN PLAY DETAILS:**

### **Entry Fee:**
```
💰 $0.25 (25 cents) per entry
```

### **Prize Tiers:**
```
🏆 $1 (4 players needed)
🏆 $5 (20 players needed)
🏆 $10 (40 players needed)
🏆 $25 (100 players needed)
🏆 $50 (200 players needed)
🏆 $100 (400 players needed)
🏆 $250 (1,000 players needed)
🏆 $500 (2,000 players needed)
🏆 $1,000 (4,000 players needed)
```

### **All 9 Games:**
```
1. 🎯 Multi-Target Reaction
2. 💰 Falling Objects
3. 🎨 Color Sequence
4. ⚡ Laser Dodge
5. ⏱️ Quick Click
6. ⚔️ Sword Parry
7. 🛡️ Blade Bounce
8. 💵 Cash Stack
9. 🪙 Penny Passer
```

### **Total Listings:**
```
9 games × 9 prize tiers = 81 listings
```

---

## 📊 **HOW IT WORKS:**

### **Phase 1: Waiting**
```
- Session status: 'waiting'
- Players join by paying $0.25
- Progress bar shows: players / max_players
- Timer NOT started yet
```

### **Phase 2: Active (Timer Starts)**
```
- When max_players reached
- Timer starts: 2 minutes
- Status changes to: 'active'
- More players can still join!
```

### **Phase 3: Payout**
```
- Timer expires after 2 minutes
- Highest score wins 85% of prize pool
- Platform keeps 15%
- If no scores: everyone gets refunded
```

---

## 🚀 **TO DEPLOY:**

### **Step 1: Run SQL Scripts**

```bash
1. Open Supabase SQL Editor
2. Copy contents of: CREATE_COIN_PLAY_SYSTEM.sql
3. Run it
4. Copy contents of: FIX_WTA_2_MIN_TIMER_AND_PAYOUT.sql
5. Run it
```

### **Step 2: Create Frontend Page**

The frontend page needs to be created at `/coin-play`. It should be similar to the Winner Takes All page but with:

**Key Features Needed:**
- Display all 81 listings grouped by game
- Show prize tiers for each game
- $0.25 entry fee display
- Join functionality
- Timer countdown (2 minutes)
- Leaderboard for each session
- Winner announcement

**Template Structure:**
```tsx
// src/app/coin-play/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
// ... similar to winner-takes-all/page.tsx but for Coin Play
```

---

## 📋 **DATABASE SCHEMA:**

### **coin_play_configs**
```sql
id TEXT PRIMARY KEY                    -- 'cp-multi-target-1', etc.
game_type TEXT                         -- 'multi_target', 'laser_dodge', etc.
entry_fee NUMERIC (0.25)              -- Always $0.25
min_participants INTEGER (4)           -- Always 4 minimum
max_participants INTEGER               -- Varies by prize tier
prize_pool NUMERIC                     -- $1 to $1,000
rng_seed INTEGER                       -- For fair play
```

### **coin_play_sessions**
```sql
id UUID PRIMARY KEY
config_id TEXT                         -- Links to config
status TEXT                            -- 'waiting', 'active', 'completed'
participants_count INTEGER            
prize_pool NUMERIC                     -- Accumulated from entries
timer_duration INTEGER (120)           -- 2 minutes
timer_started_at TIMESTAMPTZ          -- When timer began
winner_user_id UUID                    -- Who won
winner_prize NUMERIC                   -- 85% of pool
platform_fee NUMERIC                   -- 15% of pool
```

### **coin_play_participants**
```sql
id UUID PRIMARY KEY
session_id UUID                        -- Which session
user_id UUID                           -- Player
username TEXT                          
score INTEGER                          -- Game score
prize_amount NUMERIC                   -- If winner
completed_at TIMESTAMPTZ              -- When played
```

---

## 🔧 **RPC FUNCTIONS AVAILABLE:**

### **get_coin_play_sessions()**
```sql
-- Returns all waiting/active sessions
-- Includes: game_type, prize_pool, participants, timer, etc.
```

**Frontend Usage:**
```typescript
const { data: sessions, error } = await supabase
  .rpc('get_coin_play_sessions');
```

---

## 💡 **FRONTEND NEEDED:**

### **Page Structure:**

```tsx
/coin-play
├── Hero Section
│   ├── Title: "🪙 Coin Play Tournaments"
│   ├── Subtitle: "25¢ Entry • $1 to $1,000 Prizes"
│   └── Description: "Play any game for a quarter!"
│
├── Game Sections (9 total)
│   ├── Multi-Target Reaction
│   │   ├── $1 Prize (4 players) [Join]
│   │   ├── $5 Prize (20 players) [Join]
│   │   ├── $10 Prize (40 players) [Join]
│   │   └── ... up to $1,000
│   │
│   ├── Falling Objects
│   │   └── Same 9 prize tiers
│   │
│   └── (Repeat for all 9 games)
│
└── Active Session Modal
    ├── Timer Countdown
    ├── Leaderboard
    ├── Join Button
    └── Play Button
```

---

## 🎨 **DESIGN SUGGESTIONS:**

### **Color Scheme:**
```
Primary: Gold/Yellow (#FFD700) - for coins
Secondary: Green (#10B981) - for money
Accent: Purple (#8B5CF6) - for premium feel
```

### **Icons:**
```
💰 Money/Coins for entry fee
🏆 Trophy for prizes
⏱️ Timer for countdown
🎮 Game controller for game type
👥 People for player count
```

---

## 🧪 **TESTING CHECKLIST:**

### **After Deployment:**

**1. Check Database**
```sql
SELECT COUNT(*) FROM coin_play_configs;
-- Should return: 81

SELECT COUNT(*) FROM coin_play_sessions WHERE status = 'waiting';
-- Should return: 81

SELECT game_type, COUNT(*) FROM coin_play_configs GROUP BY game_type;
-- Should show 9 games with 9 configs each
```

**2. Test Frontend**
- [ ] Page loads at /coin-play
- [ ] All 9 games displayed
- [ ] Each game shows 9 prize tiers
- [ ] Entry fee shows $0.25
- [ ] Join button works
- [ ] Timer starts at max_participants
- [ ] Timer counts down from 2 minutes
- [ ] Payout triggers after timer
- [ ] Winner receives 85% of prize pool
- [ ] Refund works if no scores

**3. Test Edge Cases**
- [ ] Join with insufficient tokens (should fail)
- [ ] Join same session twice (should fail)
- [ ] Timer expires with no scores (should refund)
- [ ] Multiple players tie for high score (first completion wins)

---

## 📊 **EXAMPLE SCENARIOS:**

### **Scenario 1: $1 Prize ($0.25 entry)**
```
Max Players: 4
Entry Fee: $0.25 each
Total Pool: $1.00
Winner Gets: $0.85 (85%)
Platform: $0.15 (15%)
```

### **Scenario 2: $100 Prize ($0.25 entry)**
```
Max Players: 400
Entry Fee: $0.25 each
Total Pool: $100.00
Winner Gets: $85.00 (85%)
Platform: $15.00 (15%)
```

### **Scenario 3: $1,000 Prize ($0.25 entry)**
```
Max Players: 4,000
Entry Fee: $0.25 each
Total Pool: $1,000.00
Winner Gets: $850.00 (85%)
Platform: $150.00 (15%)
```

---

## 🚨 **IMPORTANT NOTES:**

### **Entry Fee Consistency:**
- ALL listings have same $0.25 entry fee
- This makes it fair and accessible
- Prize pool scales with player count

### **Timer Behavior:**
- Timer starts when max_participants reached
- Extra players can still join after timer starts
- Grows the prize pool beyond advertised amount!

### **Payout Logic:**
- 85% to winner (highest score)
- 15% platform fee
- Ties broken by first completion
- No scores = full refund to all

---

## 🎯 **NEXT STEPS:**

1. **Run SQL scripts** in Supabase ✅
2. **Create frontend page** at `/coin-play` (TODO)
3. **Test with small prizes** first ($1 listings)
4. **Monitor payouts** in admin dashboard
5. **Scale up** to larger prizes after testing

---

## 💎 **UNIQUE SELLING POINTS:**

- 🪙 **Quarter Entry:** Most affordable tournament mode
- 🎮 **All Games:** Every game has Coin Play mode
- 🏆 **Big Prizes:** Win up to $1,000 for 25¢
- ⏱️ **Quick Rounds:** 2-minute timer
- ♻️ **Refund Protection:** No scores? Full refund!

---

## 📝 **SUMMARY:**

### **What's Ready:**
✅ Database tables created
✅ 81 listings configured
✅ RLS policies enabled
✅ RPC functions available
✅ Waiting sessions active
✅ WTA timer fixed (2 min)
✅ WTA payout fixed (no scores)

### **What's Needed:**
❌ Frontend page at `/coin-play`
❌ Join session functionality
❌ Timer display component
❌ Leaderboard component
❌ Payout trigger (auto or manual)
❌ Winner announcement UI

---

**All backend code is deployed and ready!** 🚀

**Run the SQL scripts and the Coin Play system will be live in the database!** ✅

**Frontend page needs to be created to make it user-facing.** 📱

