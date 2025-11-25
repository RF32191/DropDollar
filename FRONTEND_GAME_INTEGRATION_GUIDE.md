# 🎮 Frontend Game Integration Guide

## Overview
This guide shows you how to integrate audit logging into **every game** on your site. After following this guide, all games will automatically log scores, detect cheating, and notify admin RF32191 of suspicious activity.

---

## 📋 Integration Steps for Each Game

### Step 1: Add the Supabase Client Call

Add this to **every game component** when the game ends:

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

// Call this when game ends
const logGameToAudit = async (score: number, accuracy?: number, reactionTime?: number, duration?: number) => {
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'YOUR_GAME_TYPE', // See game types below
      p_game_mode: 'practice', // or '1v1', 'wta', etc.
      p_score: score,
      p_accuracy: accuracy || null,
      p_reaction_time: reactionTime || null,
      p_duration_seconds: duration || null,
      p_additional_data: null
    });

    if (error) {
      console.error('Audit log error:', error);
    } else {
      console.log('✅ Game logged to audit', data);
    }
  } catch (err) {
    console.error('Failed to log game:', err);
  }
};
```

---

## 🎯 Game Types Reference

Use these exact strings for `p_game_type`:

| Game Name | Game Type String | Tracks |
|-----------|-----------------|--------|
| Laser Dodge | `'laser_dodge'` | Score, duration, reactions |
| Multi Target | `'multi_target_reaction'` | Score, accuracy, reactions |
| Sword Parry | `'sword_parry'` | Score, duration, reactions |
| Quick Click | `'quick_click'` | Score, reactions |
| Color Sequence | `'color_sequence'` | Score, duration |
| Blade Bounce 3D | `'blade_bounce'` | Score, duration |
| Cash Stack | `'cash_stack'` | Score, accuracy |
| Falling Objects | `'falling_object'` | Score, accuracy |
| 1v1 Games | `'one_v_one'` | Auto-logged via trigger |
| Winner Takes It All | `'winner_takes_all'` | Auto-logged via trigger |

---

## 🔧 Specific Integration Examples

### Example 1: LaserDodgeGame.tsx

```typescript
// In LaserDodgeGame.tsx
const handleGameOver = async () => {
  const finalScore = score;
  const duration = Math.floor((Date.now() - gameStartTime) / 1000);
  
  setGameState('gameOver');
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(finalScore, null, averageReactionTime, duration);
  
  // ... rest of game over logic
};

const logGameToAudit = async (score: number, accuracy: number | null, reactionTime: number | null, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'laser_dodge',
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Laser Dodge logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

### Example 2: MultiTargetGame.tsx

```typescript
// In MultiTargetGame.tsx
const endGame = async () => {
  const accuracy = (hits / totalTargets) * 100;
  const avgReaction = totalReactionTime / hits;
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  setGameOver(true);
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(score, accuracy, avgReaction, duration);
};

const logGameToAudit = async (score: number, accuracy: number, reactionTime: number, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'multi_target_reaction',
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Multi Target logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

### Example 3: SwordParryGame.tsx

```typescript
// In SwordParryGame.tsx
const handleGameEnd = async () => {
  const duration = Math.floor((Date.now() - gameStartTime) / 1000);
  const avgReaction = totalParryTime / successfulParries;
  
  setGameState('gameOver');
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(score, null, avgReaction, duration);
};

const logGameToAudit = async (score: number, accuracy: number | null, reactionTime: number | null, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'sword_parry',
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Sword Parry logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

### Example 4: QuickClickGame.tsx

```typescript
// In QuickClickGame.tsx
const finishGame = async () => {
  const avgClickTime = totalClickTime / clicks;
  const duration = 60; // Fixed 60 second game
  
  setGameActive(false);
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(score, null, avgClickTime, duration);
};

const logGameToAudit = async (score: number, accuracy: number | null, reactionTime: number | null, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'quick_click',
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Quick Click logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

### Example 5: ColorSequenceGame.tsx

```typescript
// In ColorSequenceGame.tsx
const gameOver = async () => {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  setGameActive(false);
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(score, null, null, duration);
};

const logGameToAudit = async (score: number, accuracy: number | null, reactionTime: number | null, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'color_sequence',
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Color Sequence logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

### Example 6: BladeBounce3D.tsx

```typescript
// In BladeBounce3D.tsx
const onGameOver = async () => {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  setGameState('gameOver');
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(score, null, averageReaction, duration);
};

const logGameToAudit = async (score: number, accuracy: number | null, reactionTime: number | null, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'blade_bounce',
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Blade Bounce logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

### Example 7: CashStackGame.tsx & FallingObjectGame.tsx

```typescript
// In CashStackGame.tsx or FallingObjectGame.tsx
const endGame = async () => {
  const accuracy = (caughtItems / totalItems) * 100;
  const duration = Math.floor((Date.now() - startTime) / 1000);
  
  setGameActive(false);
  
  // 🔥 LOG TO AUDIT
  await logGameToAudit(score, accuracy, null, duration);
};

const logGameToAudit = async (score: number, accuracy: number | null, reactionTime: number | null, duration: number) => {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase.rpc('frontend_log_game_completion', {
      p_game_type: 'cash_stack', // or 'falling_object'
      p_game_mode: 'practice',
      p_score: score,
      p_accuracy: accuracy,
      p_reaction_time: reactionTime,
      p_duration_seconds: duration,
      p_additional_data: null
    });
    
    if (!error) {
      console.log('✅ Cash Stack logged', data);
    }
  } catch (err) {
    console.error('Audit error:', err);
  }
};
```

---

## 🔍 What Gets Tracked

For each game, the system automatically tracks:

1. **Username** - Player's username
2. **Score** - Final score
3. **Rating** - Score out of 10 (1-10 scale)
4. **Cheat Score** - 0-100 (higher = more suspicious)
5. **Suspicious Flags** - Specific cheat detection reasons
6. **Accuracy** - Hit rate (if applicable)
7. **Reaction Time** - Average reaction time (if applicable)
8. **Duration** - How long the game lasted
9. **IP Address** - Player's IP
10. **Timestamp** - When the game was played

---

## 🚨 Automatic Alerts

Admin RF32191 will receive user messages when:

1. **High Score** - Any score rated 7/10 or higher
2. **Suspicious Activity** - Cheat score > 60
3. **Impossible Patterns** - Bot-like behavior detected
4. **Perfect Scores** - Suspiciously perfect gameplay

---

## 🗑️ Auto-Cleanup

Low scores (below 7/10) are automatically deleted after 24 hours to save space.

High scores (7/10+) are kept permanently for leaderboards and analysis.

---

## ✅ Testing Each Game

After integration, test each game:

1. Play the game to completion
2. Check browser console for "✅ [Game] logged" message
3. Go to Admin Dashboard → Audit Logs tab
4. Verify your game appears with correct data
5. Check score rating (1-10)
6. Check cheat score (should be low for normal play)

---

## 📊 Admin Dashboard Features

RF32191 can view in the admin dashboard:

### Overall Stats
```sql
SELECT * FROM admin_all_games_stats;
```
Shows per-game statistics: plays, players, scores, suspicious activity

### Detailed Audit
```sql
SELECT * FROM admin_detailed_audit_view;
```
Shows every game with full details, threat levels, reasons

### Suspicious Activity
```sql
SELECT * FROM get_suspicious_activity_summary(7);
```
Shows all suspicious games in the last 7 days

---

## 🔒 Security Features

Each game has custom cheat detection:

- **Laser Dodge**: Detects impossible dodging, too-fast high scores
- **Multi Target**: Detects perfect accuracy, superhuman reactions
- **Sword Parry**: Detects impossible timing, too-fast completion
- **Quick Click**: Detects bot-like clicking, perfect scores
- **Color Sequence**: Detects impossible memory recall
- **Blade Bounce**: Detects impossible survival times
- **Cash Stack**: Detects perfect catching patterns

---

## 🚀 Deployment Checklist

- [ ] Run `INTEGRATE_ALL_GAMES_AUDIT.sql` in Supabase
- [ ] Add `logGameToAudit` to each game component
- [ ] Test each game individually
- [ ] Verify admin dashboard shows data
- [ ] Confirm notifications to RF32191 work
- [ ] Verify 24-hour cleanup is scheduled

---

## ⚙️ Technical Notes

- **1v1 and WTA games** auto-log via database triggers
- **Practice games** require frontend integration
- All games use the same `frontend_log_game_completion` function
- Cheat detection runs automatically server-side
- No game logic is affected - logging happens after game ends
- Failed audit logs don't break gameplay

---

## 🎯 Success Criteria

After full integration, you should have:

✅ All games logging to `game_audit_log` table  
✅ Cheat scores calculated for every play  
✅ High scores (7/10+) trigger admin notifications  
✅ Low scores auto-delete after 24 hours  
✅ Admin dashboard shows real-time stats  
✅ Suspicious patterns flagged automatically  
✅ No impact on game performance or UX  

---

## 📞 Support

If a game doesn't log:
1. Check browser console for errors
2. Verify user is authenticated
3. Check Supabase logs for SQL errors
4. Ensure `frontend_log_game_completion` function exists
5. Verify game_type string matches table above

---

**🎮 Ready to integrate? Start with one game, test it, then roll out to all games!**

