# 🎮 Hot Sell - All Games Setup Guide

## Overview
This creates **individual listings for each game at multiple price tiers**, organized by game type for easy browsing.

---

## 📋 What's Included

### 8 Game Types
1. **⚔️ Sword Slash** (5 tiers: $3, $10, $50, $250, $1K)
2. **🛡️ Blade Bounce** (4 tiers: $5, $25, $100, $500)
3. **🚀 Laser Dodge** (5 tiers: $3, $10, $100, $1K, $10K)
4. **🎯 Multi-Target** (4 tiers: $5, $25, $250, $2.5K)
5. **💰 Coin Catch** (4 tiers: $3, $10, $100, $2.5K)
6. **🎨 Color Memory** (4 tiers: $5, $50, $500, $5K)
7. **💵 Cash Stack** (4 tiers: $10, $100, $1K, $10K)
8. **⚡ Quick Click** (4 tiers: $3, $25, $250, $5K)

### Total: 39 Unique Listings

---

## 🚀 Installation Steps

### Step 1: Create All Game Configs & Sessions
Run `COMPLETE_HOT_SELL_ALL_GAMES.sql` in Supabase SQL Editor

This will:
- Drop and recreate `hot_sell_configs`, `hot_sell_sessions`, `hot_sell_participants` tables
- Insert 39 game configurations across 8 game types
- Create initial waiting sessions for all configs
- Set up RLS policies

You should see:
```
✅ Hot Sell system created successfully!
🎮 Total game types: 8
📊 Total configurations: 39
🏆 All games: 3-place prizes (1st: 50%, 2nd: 20%, 3rd: 15%)
💰 Platform fee: 15% across all games
💵 Price range: $3 to $10,000
⏱️ No timers - games complete when max participants reached

🎯 Games included:
  • Sword Slash (5 tiers)
  • Blade Bounce (4 tiers)
  • Laser Dodge (5 tiers)
  • Multi-Target (4 tiers)
  • Coin Catch (4 tiers)
  • Color Memory (4 tiers)
  • Cash Stack (4 tiers)
  • Quick Click (4 tiers)
```

### Step 2: Deploy Client Changes
The client-side code has been updated to:
- **Dynamically load** game configs from the database
- **Organize listings by game type** with headers and visual sections
- Show a loading state while fetching configs
- Fall back to hardcoded configs if database is unavailable

Push to Vercel:
```bash
git add -A
git commit -m "Add all games to Hot Sell with organized display"
git push origin main
```

### Step 3: Verify
1. Refresh Hot Sell page
2. You should see games grouped by type with headers like:
   - **⚔️ Sword Slash (5 Tiers)**
   - **🚀 Laser Dodge (5 Tiers)**
   - etc.
3. Each game type should display its listings in ascending price order

---

## 🎨 UI Features

### Game Type Sections
- **Large emoji icon** for each game type
- **Game name** with tier count
- **Horizontal gradient divider**
- **Grid layout** for all tiers of that game

### Individual Listing Cards
- Prize breakdown (1st/2nd/3rd)
- Current pot display
- Progress bar with participant count
- Top 3 scoreboard (visible after joining)
- User's score (after playing)
- Smart join/play buttons with state management

---

## 📊 Prize Structure
**All games use the same structure:**
- 🥇 1st Place: **50%** of pot
- 🥈 2nd Place: **20%** of pot
- 🥉 3rd Place: **15%** of pot
- 🏛️ Platform Fee: **15%** of pot

---

## 🔧 Customization

### Add More Price Tiers
Edit `COMPLETE_HOT_SELL_ALL_GAMES.sql` and add new configs:
```sql
INSERT INTO hot_sell_configs VALUES
('hs-15-sword-parry', 'sword_parry', '$15 Sword Slash', '...', 1, 15, 15, 30, 106, 50, 20, 15, 15);
```

### Add New Game Types
1. Add config in SQL file with new `game_type`
2. Add case in `getGameInfo()` function in `page.tsx`:
```typescript
case 'new_game_type': return { name: '🎯 New Game', emoji: '🎯' };
```

### Change Prize Percentages
Update the percentages in `hot_sell_configs` table and adjust display in UI.

---

## 🔄 Maintenance

### Reset All Listings
```sql
-- Use RESET_HOT_SELL_NOW.sql
DELETE FROM hot_sell_participants;
DELETE FROM hot_sell_sessions;
INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
SELECT id, 0, base_price, max_participants, 'waiting' FROM hot_sell_configs;
```

### View All Active Games
```sql
SELECT 
  c.title,
  s.status,
  s.current_pot,
  s.participants_count,
  c.max_participants
FROM hot_sell_sessions s
JOIN hot_sell_configs c ON s.config_id = c.id
WHERE s.status != 'completed'
ORDER BY c.base_price;
```

---

## 🎯 Next Steps
1. Run `COMPLETE_HOT_SELL_ALL_GAMES.sql` in Supabase
2. Push code to Vercel
3. Test joining different game tiers
4. Monitor payout system with `SIMPLE_HOT_SELL_PAYOUT.sql`
5. Check analytics page for winners

---

## ⚠️ Notes
- The client will fall back to hardcoded configs if DB is unavailable
- All games complete when `max_participants` is reached (no timers)
- Auto-payout triggers 3 seconds after last player completes their game
- Sessions automatically reset after payout

🎉 **Enjoy your expanded Hot Sell system!**

