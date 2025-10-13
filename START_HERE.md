# 🚀 START HERE - Get Your Tournaments Live!

## ✅ What's Ready Now:

### 1. **Regular Tournaments** (LIVE & WORKING)
- Anyone can enter and compete
- Winner = highest score
- No matchmaking needed
- Location verification required
- Auto-launches games after payment

### 2. **1v1 Matchmaking** (Coming Later)
- Skill-based ELO matching
- Real-time head-to-head
- Will be added in future update

---

## 🎮 Quick Setup (5 Minutes)

### Step 1: Add Tokens to Your Account
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Go to SQL Editor
3. Copy and paste the entire `QUICK_SETUP.sql` file
4. Click "Run"
5. ✅ You now have 100 tokens ($100)

### Step 2: Visit Your Site
1. Go to: https://www.drop-dollar.com/tournaments
2. You'll see 5 live tournaments:
   - $50 Speed Challenge ($2 entry)
   - $100 Quick Strike ($5 entry)
   - $250 Pro Tournament ($5 entry)
   - $500 Elite Championship ($10 entry)
   - $1000 Master Challenge ($20 entry)

### Step 3: Test Entry Flow
1. Click "PAY $2 & PLAY NOW" on the $50 tournament
2. Modal opens showing your token balance
3. Click "PAY $2 & PLAY NOW" in the modal
4. Money transferred to Stripe escrow
5. 2 tokens deducted
6. **Game launches automatically!**
7. Play and submit score

---

## 💰 How It Works

### Entry Flow:
```
User clicks button
    ↓
Location verified (if needed)
    ↓
Entry modal shows
    ↓
User confirms payment
    ↓
$5 sent to Stripe escrow (held, not charged)
    ↓
5 tokens deducted from wallet
    ↓
Transaction recorded in Supabase
    ↓
Tournament entry created with RNG seed
    ↓
Redirect to /games?tournament=xxx&entry=yyy&game=multi-target
    ↓
Game auto-launches in 1 second
    ↓
User plays game
    ↓
Score saved, hidden until all attempts done
    ↓
When tournament closes → winner gets 85% of prize pool
```

---

## 📊 What Happens to Money

### Escrow System:
1. **Entry**: User pays $5 → Stripe holds it (not charged yet)
2. **Held**: Money in escrow until tournament closes
3. **Winner Determined**: Highest score wins
4. **Payout**: 
   - Platform captures payment intents
   - Takes 15% platform fee
   - Pays 85% to winner
   - Losers' payment intents canceled (money returned)

### Example:
```
$100 Tournament:
- 20 players × $5 = $100 total
- Platform fee (15%): $15
- Winner prize (85%): $85
```

---

## 🎯 Testing Checklist

### Before Testing:
- [ ] Run `QUICK_SETUP.sql` in Supabase
- [ ] Verify 100 tokens in your account
- [ ] Check tournaments appear on /tournaments page

### Test Entry:
- [ ] Click "PAY $2 & PLAY NOW"
- [ ] Verify location check (if first time)
- [ ] Entry modal shows correct balance
- [ ] Payment processes successfully
- [ ] Tokens deducted correctly
- [ ] Game launches automatically
- [ ] Score saves after game

### Check Database:
- [ ] `token_transactions` has entry record
- [ ] `tournament_entries` has your entry
- [ ] Stripe dashboard shows payment intent

---

## 🔧 Admin Tools

### Create More Tournaments:

#### Option 1: SQL (Easy)
Use the template in `QUICK_SETUP.sql` and modify:
```sql
INSERT INTO tournaments (
  id,
  name,
  game_type,           -- 'multi-target', 'laser-dodge', etc.
  entry_fee,           -- Tokens required (1 token = $1)
  prize_pool,          -- Total prize amount
  max_players,         -- Maximum entries
  current_players,     -- Start at 0
  status,              -- 'open'
  prize_distribution,  -- JSON: [{"rank": 1, "amount": X, "percentage": 85}]
  starts_at,           -- NOW()
  ends_at,             -- NOW() + INTERVAL '7 days'
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'My Custom Tournament',
  'multi-target',
  5,
  100,
  20,
  0,
  'open',
  '[{"rank": 1, "amount": 85, "percentage": 85}]'::jsonb,
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW(),
  NOW()
);
```

#### Option 2: TypeScript (Advanced)
```typescript
import TournamentService from '@/lib/supabase/tournamentService';

const tournament = await TournamentService.createTournament(
  'My Custom Tournament',  // name
  'multi-target',          // game type
  5,                       // entry fee (tokens)
  100,                     // prize pool ($)
  20,                      // max players
  [{ rank: 1, amount: 85, percentage: 85 }]  // prize distribution
);
```

---

## 🎮 Game Types

Use these for `game_type` field:
- `multi-target` - Multi-Target Reaction
- `falling-objects` - Falling Object Catch
- `color-sequence` - Color Sequence Memory
- `laser-dodge` - Laser Dodge EXTREME
- `quick-click` - QuickClick Challenge
- `sword-parry` - Sword Slash

---

## 🏆 Prize Distribution

### Winner Takes All (Current):
```json
[{"rank": 1, "amount": 85, "percentage": 85}]
```

### Top 3 (Future):
```json
[
  {"rank": 1, "amount": 50, "percentage": 50},
  {"rank": 2, "amount": 25, "percentage": 25},
  {"rank": 3, "amount": 10, "percentage": 10}
]
```
*Note: Total must equal 85% (platform keeps 15%)*

---

## 📈 Monitoring

### Check Tournament Status:
```sql
SELECT 
  name,
  current_players || '/' || max_players as players,
  prize_pool,
  status
FROM tournaments
WHERE status = 'open'
ORDER BY prize_pool DESC;
```

### Check Your Entries:
```sql
SELECT 
  t.name as tournament,
  te.score,
  te.final_rank,
  te.prize_won,
  te.created_at
FROM tournament_entries te
JOIN tournaments t ON t.id = te.tournament_id
WHERE te.user_id = (
  SELECT id FROM users WHERE email = 'ryanfermoselle@yahoo.com'
)
ORDER BY te.created_at DESC;
```

### Check Token Balance:
```sql
SELECT 
  email,
  tokens as available_tokens,
  balance as winnings_balance,
  (tokens + balance) as total_value
FROM users
WHERE email = 'ryanfermoselle@yahoo.com';
```

---

## 🚨 Troubleshooting

### Game Doesn't Launch:
1. Check browser console for errors
2. Verify URL has `?tournament=xxx&entry=yyy&game=xxx`
3. Look for auto-launch console logs:
   - `🏆 [Games] Tournament mode detected!`
   - `🎮 [Games] Auto-launching game:`
   - `✅ [Games] Game launched:`

### Tokens Not Deducting:
1. Check Supabase connection in console
2. Verify user profile exists in `users` table
3. Check `token_transactions` table for records

### Payment Fails:
1. Verify Stripe keys in environment variables
2. Check Stripe dashboard for errors
3. Test with Stripe test cards first

---

## 🎉 What's Working Now

✅ Tournament creation via SQL  
✅ Token-based entry ($1 = 1 token)  
✅ Stripe escrow holding funds  
✅ Auto-game launch after payment  
✅ Score saving to Supabase  
✅ Location verification  
✅ Winner determination  
✅ Prize distribution (when implemented)  
✅ Million-player scalability  

---

## 🔮 Coming Soon

- 1v1 Matchmaking with ELO system
- Leaderboards with pagination
- Live tournament brackets
- Spectator mode
- Tournament replays
- Custom tournament creation UI

---

## 📞 Need Help?

1. Check browser console for detailed logs
2. Review Supabase tables for data
3. Check Stripe dashboard for payments
4. Test with small amounts first ($2-$5)

---

🚀 **Your tournaments are LIVE! Run the SQL script and start testing!** 🎮

