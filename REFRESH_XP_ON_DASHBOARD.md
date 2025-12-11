# Fix for XP and Challenge Progress Not Updating

## Problem
- Level progress bar not updating when games complete
- Daily tasks not updating progress
- Weekly tasks not updating progress

## Solution

### 1. Run SQL File
Run `COMPLETE_FIX_TRIGGER_AND_XP.sql` in Supabase SQL Editor. This will:
- Ensure the trigger is properly attached to `game_history` table
- Award XP automatically (5 XP for practice, 10 XP for competition)
- Update challenge progress automatically

### 2. How It Works
When a game completes:
1. Game is saved to `game_history` table
2. Trigger fires automatically
3. XP is awarded based on game type:
   - Practice games: 5 XP
   - Competition games (1v1, WTA, Hot Sell): 10 XP
4. Challenge progress is updated:
   - Practice games → `play_practice` challenge
   - Competition games → specific challenge (`play_1v1`, `play_winner_takes_all`, `play_hot_sell`)
   - Score → `score_threshold` challenge (cumulative)
   - Games count → `games_count` challenge
5. Level progress bar updates (frontend refreshes XP data)

### 3. Frontend Updates
- DailyChallenges component now checks localStorage every 2 seconds for new games
- Dashboard refreshes XP data when new game score is detected
- Challenges refresh every 10 seconds (reduced from 15s for better updates)

### 4. Testing
After running the SQL:
1. Play a practice game → Should see:
   - +5 XP awarded
   - Practice challenge progress increases
   - Level progress bar updates
2. Play a competition game → Should see:
   - +10 XP awarded
   - Specific challenge progress increases (1v1/WTA/Hot Sell)
   - Level progress bar updates

### 5. Troubleshooting
If progress still doesn't update:
1. Check Supabase logs for trigger errors
2. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_challenges_on_game_history';`
3. Check if XP is being awarded: `SELECT * FROM xp_transactions ORDER BY created_at DESC LIMIT 10;`
4. Check challenge progress: `SELECT * FROM user_daily_challenges WHERE user_id = 'YOUR_USER_ID';`

