# ⚔️ 1v1 Battles System Setup Guide

## Overview
Complete 1v1 head-to-head battle system with all games at 5 price tiers each.

---

## 📋 What's Included

### 8 Game Types - ALL with 5 Price Tiers!
1. **⚔️ Sword Slash** (5 tiers: $1, $2, $5, $10, $25)
2. **🛡️ Blade Bounce** (5 tiers: $1, $2, $5, $10, $25)
3. **🚀 Laser Dodge** (5 tiers: $1, $2, $5, $10, $25)
4. **🎯 Multi-Target** (5 tiers: $1, $2, $5, $10, $25)
5. **💰 Coin Catch** (5 tiers: $1, $2, $5, $10, $25)
6. **🎨 Color Memory** (5 tiers: $1, $2, $5, $10, $25)
7. **💵 Cash Stack** (5 tiers: $1, $2, $5, $10, $25)
8. **⚡ Quick Click** (5 tiers: $1, $2, $5, $10, $25)

### Total: 40 Unique Listings! 🎉

**Price Range:** $1 to $25
**Every game** has low ($1), medium, and high-stakes options!

---

## 🚀 Installation Steps

### Step 1: Create 1v1 System in Database
Run `COMPLETE_1V1_SYSTEM.sql` in Supabase SQL Editor

This will:
- Drop and recreate `one_v_one_configs`, `one_v_one_sessions`, `one_v_one_participants` tables
- Insert **40 game configurations** (8 games × 5 price tiers)
- Create initial waiting sessions for all configs
- Set up RLS policies
- Create SQL functions for join, score update, and payout

You should see:
```
✅ 1v1 system created successfully!
🎮 Total game types: 8
📊 Total configurations: 40
👥 Max participants: 2 players per session
🏆 Winner takes: 85% of pot
💰 Platform fee: 15% of pot
💵 Price tiers: $1, $2, $5, $10, $25
⏱️  No timers - game ends when both players complete

🎯 All 8 games have 5 price tiers each = 40 total listings
```

### Step 2: Deploy Client Changes
The client-side code has been updated to:
- **Dynamically load** game configs from the database
- **Organize listings by game type** with headers and visual sections
- Show a loading state while fetching configs
- **Beautiful purple-blue gradient** UI theme
- **Winner Takes All-style** layout and flow

Push to Vercel:
```bash
git add -A
git commit -m "Complete 1v1 system with all games"
git push origin main
```

### Step 3: Verify
1. Navigate to `https://www.drop-dollar.com/tournaments/1v1/`
2. You should see games grouped by type with headers like:
   - **⚔️ Sword Slash (5 Tiers)**
   - **🚀 Laser Dodge (5 Tiers)**
   - etc.
3. Each game type should display its 5 price tier listings in ascending order

---

## 🎮 How It Works

### Game Flow:
1. **Player 1 joins** → Pays 1 token, adds to pot
2. **Player 2 joins** → Pays 1 token, adds to pot → Session becomes "active"
3. **Both players play** → Scores recorded
4. **Auto-payout** when both complete → Highest score wins 85% of pot
5. **New session created** automatically for next players

### Features:
- ✅ **No timers** - game ends when both players complete
- ✅ **2 players max** per session
- ✅ **Auto-payout** to winner (highest score)
- ✅ **Real-time status** - see when opponent is playing
- ✅ **Location verification** - locked buttons if not in legal state
- ✅ **Token synchronization** - wallet updates in real-time
- ✅ **Score display** - see your score after playing
- ✅ **Opponent tracking** - know when opponent finishes

---

## 🎨 UI Features

### Page Layout
- **Purple-blue gradient** background (from-purple-900 via-blue-900 to-indigo-900)
- **Animated title** with trophy icon and sword emoji
- **Wallet display** at top showing current token balance
- **Location banner** if not verified

### Game Type Sections
- **Large emoji icon** for each game type
- **Game name** with tier count
- **Horizontal gradient divider**
- **Grid layout** for all tiers of that game

### Individual Listing Cards
- **Gradient card** (blue to purple)
- **Prize breakdown** (Winner: 85%, Platform: 15%)
- **Current pot display**
- **Progress bar** (2 player slots)
- **Opponent status** (waiting/playing/completed)
- **User's score** (after playing)
- **Smart join/play buttons** with state management

---

## 📊 Prize Structure
**All games use the same structure:**
- 🏆 Winner: **85%** of pot (highest score)
- 🏛️ Platform Fee: **15%** of pot

**Examples:**
- $1 battle → Winner gets $0.85
- $2 battle → Winner gets $1.70
- $5 battle → Winner gets $4.25
- $10 battle → Winner gets $8.50
- $25 battle → Winner gets $21.25

---

## 🔧 SQL Functions

### `get_all_1v1_sessions()`
Returns all active 1v1 sessions with participants

### `join_1v1_session(session_id, user_id, entry_fee)`
- Deducts token from user
- Adds user to session
- Updates pot
- Returns JSON response

### `update_1v1_score(session_id, user_id, score, accuracy)`
- Saves player's score
- Marks completion time
- Returns JSON response

### `process_1v1_payout(config_id)`
- Checks both players completed
- Finds winner (highest score)
- Pays winner 85% of pot
- Marks session completed
- Creates new waiting session
- Returns JSON response with winner info

---

## 🔄 Maintenance

### Reset All Listings
```sql
-- Clear all sessions and participants
DELETE FROM one_v_one_participants;
DELETE FROM one_v_one_sessions;

-- Recreate waiting sessions
INSERT INTO one_v_one_sessions (config_id, current_pot, prize_pool, status)
SELECT id, 0, prize_pool, 'waiting'
FROM one_v_one_configs;
```

### View Active Battles
```sql
SELECT 
  c.title,
  s.status,
  s.current_pot,
  s.participants_count,
  s.winner_user_id
FROM one_v_one_sessions s
JOIN one_v_one_configs c ON s.config_id = c.id
WHERE s.status IN ('waiting', 'active')
ORDER BY c.prize_pool;
```

### Check Specific Battle
```sql
SELECT 
  s.*,
  json_agg(json_build_object(
    'user_id', p.user_id,
    'score', p.score,
    'completed_at', p.completed_at
  )) as participants
FROM one_v_one_sessions s
LEFT JOIN one_v_one_participants p ON s.id = p.session_id
WHERE s.config_id = '1v1-5-laser-dodge'
GROUP BY s.id;
```

---

## 🎯 Key Differences from Winner Takes All

| Feature | Winner Takes All | 1v1 Battles |
|---------|-----------------|-------------|
| **Players** | Unlimited (fills to base_price) | 2 max |
| **Timer** | 30 minutes after base_price | None |
| **Payout** | After timer expires | After both complete |
| **Prize** | 85% of pot | 85% of pot |
| **Join** | Can join during timer | 2 slots only |
| **Theme** | Gold/Yellow | Purple/Blue |

---

## ⚠️ Notes
- Both players must complete the game for payout to trigger
- Winner is determined by highest score
- If player joins but doesn't play, opponent must wait (no timeout yet)
- Location verification required (same as other pages)
- Analytics integration: Winners save to dashboard/analytics

---

## 🎉 Next Steps
1. Run `COMPLETE_1V1_SYSTEM.SQL` in Supabase
2. Refresh page at `/tournaments/1v1/`
3. Test joining and playing
4. Verify auto-payout works
5. Check analytics page for winners

**Enjoy your new 1v1 battle system!** ⚔️

