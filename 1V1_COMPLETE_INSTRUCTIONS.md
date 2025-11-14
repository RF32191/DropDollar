# 🎮 1v1 Complete Setup Instructions

## ✅ What's Been Fixed

### 1. **Database Functions** (SQL)
- ✅ Added `username` to participants in `get_all_1v1_sessions()`
- ✅ Fixed all type casting issues (TEXT vs UUID)
- ✅ 10-second auto-payout timer logic
- ✅ 50% winner / 35% loser / 15% platform payout
- ✅ Automatic session reset after payout

### 2. **Frontend Features** (React)
- ✅ Dropdown scoreboard with expand/collapse
- ✅ Shows usernames instead of "Player 1", "Player 2"
- ✅ Displays winner 👑 and loser 🥈
- ✅ Shows scores and accuracy
- ✅ 10-second countdown timer (auto-expands when both players done)
- ✅ Automatic payout when timer reaches 0
- ✅ Debug logging for troubleshooting

## 🚀 Steps to Test

### Step 1: Run the SQL Setup
```sql
-- In Supabase SQL Editor, run:
1V1_CHECK_AND_FIX_TYPES.sql
```

### Step 2: Verify Setup
```sql
-- Then run verification:
1V1_FINAL_TEST.sql
```

### Step 3: Hard Refresh Browser
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + F5`
- Or: Clear cache and refresh

### Step 4: Test with 2 Accounts

1. **Account 1**: Join a $1 game
2. **Account 2**: Join the same $1 game
3. **Account 1**: Complete the game (get a score)
4. **Account 2**: Complete the game (get a score)

### Step 5: Watch the Magic! ✨

After both players complete:
1. ⚡ **Scoreboard auto-expands** (no click needed)
2. ⏱️ **10-second countdown starts** (visible in scoreboard)
3. 💰 **Payout processes automatically** when countdown hits 0
4. 🎉 **Success message** shows winner and payouts
5. 🔄 **Session resets** for next players

## 🏆 Scoreboard Features

### When to See It
- Appears after **any player completes** a game
- Shows to **everyone** (not just participants)
- Click to **expand/collapse**

### What It Shows
```
🏆 Live Scoreboard (X/2 completed)
  ▼
  
  [10-second countdown if both done]
  
  👑 Winner Name         Score: 95.50
                         88.5% accuracy
  
  🥈 Loser Name          Score: 85.20
                         82.3% accuracy
```

### Payout Display
```
Timer: 10...9...8...7...6...5...4...3...2...1...0

Success Message:
🎉 Winner: JohnDoe won $1.00! Loser gets $0.70
```

## 🔍 Debugging

### If Scoreboard Not Showing

1. **Open Browser Console** (F12)
2. **Look for**: `[1v1 DEBUG]` messages
3. **Check**:
   ```javascript
   {
     playersWithScores: 2,  // Should be > 0
     totalParticipants: 2,
     participants: [...],    // Should have score values
     hasScoreboard: true,
     payoutTimer: 10        // Countdown value
   }
   ```

### If Timer Not Starting

**Console should show**:
```
✅ [1v1] BOTH PLAYERS DONE! Starting 10-second payout timer...
```

**Check**:
- Both players have `score !== null`
- Session status is `'active'`
- No payout yet (`winner_user_id` is null)

### Common Issues

| Issue | Solution |
|-------|----------|
| "No Active Session" | Run `1V1_CHECK_AND_FIX_TYPES.sql` again |
| Scoreboard not appearing | Hard refresh browser |
| Timer not starting | Check both players finished in console |
| Username shows "Player 1" | SQL query missing username - re-run SQL |

## 📊 Testing Checklist

- [ ] SQL setup complete (`1V1_CHECK_AND_FIX_TYPES.sql`)
- [ ] Verification passed (`1V1_FINAL_TEST.sql`)
- [ ] Browser hard refreshed
- [ ] 2 players can join
- [ ] Both players can complete game
- [ ] Scoreboard appears with usernames
- [ ] 10-second timer starts automatically
- [ ] Payout processes at 0 seconds
- [ ] Winner gets 50%, loser gets 35%
- [ ] Session resets for new players

## 🎯 Expected Flow

```
1. 👥 Player 1 joins ($1)
   └─ Progress: 50%
   
2. 👥 Player 2 joins ($1)
   └─ Progress: 100%
   └─ Timer starts: 2 hours
   
3. 🎮 Player 1 completes game
   └─ Scoreboard appears (collapsed)
   └─ Shows: (1/2 completed)
   
4. 🎮 Player 2 completes game
   └─ Scoreboard AUTO-EXPANDS
   └─ 10-second countdown starts
   └─ Shows both scores with 👑 and 🥈
   
5. ⏱️ Countdown: 10...9...8...7...6...5...4...3...2...1...
   
6. 💰 Payout processes:
   └─ Winner: $1.00 (50%)
   └─ Loser: $0.70 (35%)
   └─ Platform: $0.30 (15%)
   
7. ✅ Success message displayed
   
8. 🔄 Session resets to 'waiting'
   └─ Ready for new players
```

## 🎨 Visual Guide

### Scoreboard (Collapsed)
```
┌─────────────────────────────────────┐
│ 🏆 Live Scoreboard (1/2 completed) ▼│
└─────────────────────────────────────┘
```

### Scoreboard (Expanded - 1 Player Done)
```
┌─────────────────────────────────────┐
│ 🏆 Live Scoreboard (1/2 completed) ▲│
├─────────────────────────────────────┤
│ 👑 You              Score: 95.50    │
│                     88.5% accuracy  │
│                                     │
│ ⏳ Waiting for opponent...          │
└─────────────────────────────────────┘
```

### Scoreboard (Expanded - Both Done, Timer Running)
```
┌─────────────────────────────────────┐
│ 🏆 Live Scoreboard (2/2 completed) ▲│
├─────────────────────────────────────┤
│         💰 Processing payout...     │
│                 7                    │
├─────────────────────────────────────┤
│ 👑 JohnDoe          Score: 95.50    │
│                     88.5% accuracy  │
│ 🥈 JaneDoe          Score: 85.20    │
│                     82.3% accuracy  │
└─────────────────────────────────────┘
```

## 🎉 Success!

When everything works:
- ✅ Scoreboard shows real usernames
- ✅ Winner gets crown 👑
- ✅ Loser gets silver medal 🥈
- ✅ 10-second timer is visible
- ✅ Payout happens automatically
- ✅ Tokens update immediately
- ✅ Session resets for next match

---

**Need Help?**
- Check browser console for errors
- Run `1V1_FINAL_TEST.sql` to verify database
- Look for `[1v1 DEBUG]` logs in console

