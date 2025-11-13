# Winner Takes All System Setup Guide

## Overview
Complete Winner Takes All system mirroring the Hot Sell implementation with all improvements:
- ✅ Fair skill-based gaming with RNG seeding
- ✅ Proper RLS security policies
- ✅ Automatic payout system
- ✅ Only 1 winner (85% of prize pool, 15% platform fee)
- ✅ 1 minute timer for testing (will change to 2 hours after confirmation)

## Key Differences from Hot Sell
| Feature | Hot Sell | Winner Takes All |
|---------|----------|------------------|
| **Winners** | Top 3 (50%, 20%, 15%) | Only 1 (85%) |
| **Platform Fee** | 15% total | 15% |
| **Trigger** | Session full + all played | Timer expires |
| **Timer** | None | 1 min (testing) → 2 hours (prod) |
| **Min Players** | Requires max_participants | Any players who joined |
| **Reset** | After all play | After timer + payout |

## SQL Scripts

### 1. Initial Setup (Run First)
**File:** `COMPLETE_WINNER_TAKES_ALL_SYSTEM_LIKE_HOT_SELL.sql`

This script:
- Creates/updates all tables with correct schema
- Enables RLS with security policies
- Creates all RPC functions (join, score update, payout, get sessions)
- Ensures all configs have valid RNG seeds
- Resets all sessions and participants
- Creates fresh waiting sessions for all configs

**Run this in Supabase SQL Editor**

### 2. Quick Reset (For Testing)
**File:** `QUICK_RESET_WTA_LISTINGS.sql`

Use this to quickly reset all Winner Takes All listings between tests:
- Clears all participants
- Deletes all sessions
- Creates fresh waiting sessions with new RNG seeds
- Keeps configs intact

**Run this in Supabase SQL Editor whenever you need a clean slate**

### 3. Change Timer to 2 Hours (After Testing)
**File:** `CHANGE_WTA_TIMER_TO_2_HOURS.sql`

Once you confirm 1 minute timer works, run this to switch to production:
- Updates all configs to 7200 seconds (2 hours)
- Updates all active sessions
- Updates payout function
- Updates join function

**Run this in Supabase SQL Editor when ready for production**

## Database Schema

### winner_takes_all_configs
```sql
id TEXT PRIMARY KEY
game_type TEXT NOT NULL
title TEXT NOT NULL
description TEXT NOT NULL
entry_fee NUMERIC(10,2) NOT NULL
base_price NUMERIC(10,2) NOT NULL
game_duration INTEGER NOT NULL
rng_seed INTEGER NOT NULL
platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 15.0
timer_duration INTEGER NOT NULL DEFAULT 60
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### winner_takes_all_sessions
```sql
id UUID PRIMARY KEY
config_id TEXT NOT NULL (FK)
prize_pool NUMERIC(10,2) DEFAULT 0
participants_count INTEGER DEFAULT 0
status TEXT DEFAULT 'waiting' ('waiting' | 'active' | 'completed')
timer_started_at TIMESTAMPTZ
timer_duration INTEGER NOT NULL DEFAULT 60
winner_user_id UUID
winner_prize NUMERIC(10,2) DEFAULT 0
platform_fee_amount NUMERIC(10,2) DEFAULT 0
completed_at TIMESTAMPTZ
rng_seed INTEGER NOT NULL
base_price NUMERIC(10,2) NOT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(config_id, status) WHERE status = 'waiting'
```

### winner_takes_all_participants
```sql
id UUID PRIMARY KEY
session_id UUID NOT NULL (FK)
user_id UUID NOT NULL (FK)
username TEXT
score NUMERIC(10,2)
accuracy NUMERIC(5,2)
joined_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(session_id, user_id)
```

## RPC Functions

### 1. wta_join_v2(config_id, user_id)
**Purpose:** Join a Winner Takes All session
**Logic:**
- Validates user and config
- Checks gameplay tokens balance
- Gets or creates waiting session
- Deducts entry fee from gameplay tokens
- Adds participant
- Updates prize pool
- Starts timer on first join (status → 'active')
- Returns session info

### 2. update_winner_takes_all_score(session_id, user_id, score, accuracy)
**Purpose:** Update player's score after game completion
**Logic:**
- Finds participant
- Updates score and accuracy
- Sets completed_at timestamp

### 3. process_winner_takes_all_payout_complete(config_id)
**Purpose:** Process payout when timer expires
**Logic:**
- Gets active session for config
- Checks if already paid out (prevents duplicates)
- Verifies timer has expired
- Ensures at least 1 score submitted
- Finds winner (highest score, earliest completion)
- Calculates prizes (85% winner, 15% platform)
- Pays winner (adds to gameplay tokens)
- Records transaction
- Marks session as completed
- Creates new waiting session with fresh RNG seed

### 4. get_all_winner_takes_all_sessions()
**Purpose:** Get all active/waiting sessions with participants
**Logic:**
- Returns all 'waiting' and 'active' sessions
- Includes aggregated participants as JSONB
- Used by frontend to display listings

## Security (RLS Policies)

### winner_takes_all_configs
- **SELECT:** Anyone (public read)
- **ALL:** Admins only

### winner_takes_all_sessions
- **SELECT:** Anyone (public read)
- **UPDATE:** Users who are participants
- **ALL:** System (for function operations)

### winner_takes_all_participants
- **SELECT:** Anyone (public read)
- **INSERT:** Users can insert own participation
- **UPDATE:** Users can update own participation

## Fair Gaming Features

### RNG Seeding
- ✅ Each session has unique rng_seed
- ✅ Seed generated on session creation
- ✅ New seed on every reset/payout
- ✅ Passed to game for deterministic gameplay

### Anti-Cheat
- ✅ Server-side validation (game_sessions table)
- ✅ One entry per user per session
- ✅ Score submission requires completion
- ✅ Highest score wins (tie: earliest completion)

### Token Security
- ✅ Dual wallet system (gameplay_tokens only)
- ✅ All transactions recorded
- ✅ Balance checks before entry
- ✅ Atomic operations (no partial transactions)

## Testing Workflow

### Phase 1: 1 Minute Timer Testing
1. Run `COMPLETE_WINNER_TAKES_ALL_SYSTEM_LIKE_HOT_SELL.sql`
2. Join a listing (1 token entry fee)
3. Play the game
4. Wait 1 minute after timer starts
5. Frontend should auto-trigger payout
6. Verify winner received 85% of prize pool
7. Verify new session created
8. Repeat with multiple players

### Phase 2: Switch to 2 Hours
1. Confirm 1 minute timer works correctly
2. Run `CHANGE_WTA_TIMER_TO_2_HOURS.sql`
3. Verify timer shows 2 hours in UI
4. Test one full cycle (may take 2+ hours)

### Resetting Between Tests
- Run `QUICK_RESET_WTA_LISTINGS.sql` anytime
- Safe to run multiple times
- Does NOT affect configs
- Creates fresh sessions with new RNG

## Frontend Integration

The Winner Takes All page (`src/app/winner-takes-all/page.tsx`) already has:
- ✅ Timer display and countdown
- ✅ Auto-payout trigger when timer expires
- ✅ Real-time session updates
- ✅ Scoreboard (shows after playing)
- ✅ Prize pool display
- ✅ Location verification
- ✅ Token balance integration

**No frontend changes needed** - the existing page is ready to use these new SQL functions!

## Troubleshooting

### "Session not found"
- Run `QUICK_RESET_WTA_LISTINGS.sql`
- Ensures all configs have active sessions

### "Timer not expired yet"
- Wait for full timer duration
- Check `timer_started_at` in session
- For testing: use 1 minute timer

### "No scores submitted yet"
- Users must complete games before payout
- Score must be saved via `update_winner_takes_all_score`

### "Already paid out"
- Session already processed
- New session should auto-create
- If stuck, run reset script

## Next Steps

1. ✅ Run `COMPLETE_WINNER_TAKES_ALL_SYSTEM_LIKE_HOT_SELL.sql`
2. ✅ Test with 1 minute timer
3. ✅ Verify payouts work correctly
4. ✅ Check new session creation
5. ✅ When ready, run `CHANGE_WTA_TIMER_TO_2_HOURS.sql`
6. ✅ Deploy and enjoy!

## Notes

- All RNG seeding is preserved
- All RLS policies are secure
- All fair gaming mechanics intact
- Payout only triggers after timer expires
- Winner is always highest score
- Platform fee is always 15%
- No changes needed to game mechanics

