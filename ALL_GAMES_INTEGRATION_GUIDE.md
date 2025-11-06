# 🎮 ALL GAMES SECURITY INTEGRATION GUIDE

## 📋 OVERVIEW

This guide shows how to integrate ALL skill-based gaming security features into EVERY game on the platform.

---

## 🎯 LIST OF ALL GAMES

### Competition Types
1. **Hot Sell** - Marketplace competitive bidding
2. **Winner Takes All** - Timed competitions
3. **1v1** - Head-to-head battles

### Individual Games
1. Blade Bounce
2. Laser Dodge
3. Target Precision
4. Reflex Rush
5. Color Match
6. Reaction Time
7. Memory Matrix
8. Pattern Recognition
9. Multi Target
10. Sword Parry
11. Cash Stack
12. Token Grab

---

## 🛡️ SECURITY FEATURES (REQUIRED FOR ALL GAMES)

### ✅ 1. RNG Seeding
Every game must use the RNG seed from the session for fair play.

### ✅ 2. Rate Limiting
Check rate limits before allowing game start.

### ✅ 3. Dual Wallet
Deduct purchased tokens first, won tokens second.

### ✅ 4. Audit Trail
Log all token transactions.

### ✅ 5. Anti-Cheat
Validate scores server-side.

### ✅ 6. Session Tracking
Track all game sessions in game_sessions table.

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Run SQL Scripts (IN ORDER)

```sql
-- 1. Create all security tables and features
RUN: VERIFY_AND_CREATE_ALL_FEATURES.sql

-- 2. Add RNG seeds and functions to all games
RUN: IMPLEMENT_ALL_GAMES_SECURITY.sql

-- 3. Fix any session join errors while keeping security
RUN: SECURE_FIX_WITH_ANTI_CHEAT.sql

-- 4. Verify everything is ready
RUN: VERIFY_AND_CREATE_ALL_FEATURES.sql
```

### Step 2: Add Rate Limit Display to ALL Game Pages

**Files to update:**
- `src/app/hot-sell/page.tsx`
- `src/app/winner-takes-all/page.tsx`
- `src/app/tournaments/1v1/page.tsx`
- `src/app/games/page.tsx`
- `src/app/dashboard/page.tsx` (optional)

**Add to each page:**

```typescript
import RateLimitDisplay from '@/components/RateLimitDisplay';
import { useRateLimits } from '@/hooks/useRateLimits';

export default function GamePage() {
  const rateLimits = useRateLimits();
  
  return (
    <div className="container mx-auto p-4">
      {/* 1. Show rate limit display at top */}
      <RateLimitDisplay className="mb-6" />
      
      {/* 2. Show warning if blocked */}
      {rateLimits.isBlocked && (
        <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-6 mb-6">
          <h3 className="text-red-300 font-bold text-lg mb-2">
            🚫 Rate Limit Reached
          </h3>
          <p className="text-red-200">
            You've reached your maximum games allowed. Please wait for the reset timer.
          </p>
        </div>
      )}
      
      {/* 3. Disable buttons when blocked */}
      <button
        disabled={rateLimits.isBlocked}
        className={rateLimits.isBlocked ? 'opacity-50 cursor-not-allowed' : ''}
      >
        Join Game
      </button>
    </div>
  );
}
```

### Step 3: Integrate Security into Individual Game Components

Every game component must follow this pattern:

---

## 📝 GAME COMPONENT TEMPLATE

```typescript
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FairRNGService } from '@/services/FairRNGService';

interface GameComponentProps {
  competitionMode?: boolean;
  sessionData?: {
    sessionId: string;
    rngSeed: number;
    competitionType: string;
    listingId: string;
  };
  onGameComplete?: (score: number, accuracy: number) => void;
}

export default function GameComponent({ 
  competitionMode = false, 
  sessionData,
  onGameComplete 
}: GameComponentProps) {
  const { user } = useAuth();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [score, setScore] = useState(0);
  
  // ✅ 1. RNG SERVICE (MUST USE IN COMPETITION MODE)
  const rngServiceRef = useRef<FairRNGService | null>(null);
  
  // ✅ 2. GAME SESSION TRACKING
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  
  // ✅ 3. ANTI-CHEAT: Input tracking
  const inputCountRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const gameStartTimeRef = useRef<number>(0);
  
  // ✅ 4. Initialize RNG service
  useEffect(() => {
    if (competitionMode && sessionData) {
      rngServiceRef.current = new FairRNGService(sessionData.rngSeed);
      console.log('✅ Using RNG seed:', sessionData.rngSeed);
    } else {
      rngServiceRef.current = new FairRNGService(Date.now());
    }
  }, [competitionMode, sessionData]);
  
  // ✅ 5. Create game session when game starts
  const createGameSession = async () => {
    if (!user || !competitionMode || !sessionData) return;
    
    try {
      const { data, error } = await supabase
        .rpc('create_game_session', {
          p_user_id: user.id,
          p_game_type: 'blade_bounce', // CHANGE THIS FOR EACH GAME
          p_competition_type: sessionData.competitionType,
          p_listing_id: sessionData.listingId,
          p_rng_seed: sessionData.rngSeed,
          p_entry_number: null
        });
      
      if (error) {
        console.error('❌ Error creating game session:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setGameSessionId(data[0].session_id);
        setTokenHash(data[0].token_hash);
        console.log('✅ Game session created:', data[0].session_id);
      }
    } catch (error) {
      console.error('❌ Error in createGameSession:', error);
    }
  };
  
  // ✅ 6. Submit score with anti-cheat data
  const submitScore = async (finalScore: number, finalAccuracy: number) => {
    if (!gameSessionId || !competitionMode) {
      if (onGameComplete) {
        onGameComplete(finalScore, finalAccuracy);
      }
      return;
    }
    
    const gameDuration = Date.now() - gameStartTimeRef.current;
    const avgReactionTime = reactionTimesRef.current.length > 0
      ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
      : 0;
    
    try {
      const { data, error } = await supabase
        .rpc('complete_game_session', {
          p_session_id: gameSessionId,
          p_client_score: finalScore,
          p_accuracy: finalAccuracy,
          p_avg_reaction_time: avgReactionTime,
          p_input_count: inputCountRef.current,
          p_duration_ms: gameDuration
        });
      
      if (error) {
        console.error('❌ Error completing session:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const result = data[0];
        console.log('✅ Session completed. Suspicion score:', result.suspicion_score);
        
        // Show warning if suspicious
        if (result.suspicion_score >= 60) {
          alert('⚠️ Your gameplay has been flagged for review. This may affect prize eligibility.');
        }
      }
      
      if (onGameComplete) {
        onGameComplete(finalScore, finalAccuracy);
      }
    } catch (error) {
      console.error('❌ Error in submitScore:', error);
    }
  };
  
  // ✅ 7. Use RNG service for all randomness
  const spawnEnemy = () => {
    if (!rngServiceRef.current) return;
    
    // MUST use RNG service, not Math.random()
    const x = rngServiceRef.current.range(0, window.innerWidth);
    const y = rngServiceRef.current.range(0, window.innerHeight);
    const speed = rngServiceRef.current.range(1, 5);
    
    // Spawn enemy at (x, y) with speed
  };
  
  // ✅ 8. Track user inputs for anti-cheat
  const handleUserInput = (e: React.MouseEvent | React.TouchEvent) => {
    inputCountRef.current++;
    
    // Track reaction time if applicable
    const reactionTime = Date.now() - /* last enemy spawn time */;
    if (reactionTime > 0 && reactionTime < 5000) {
      reactionTimesRef.current.push(reactionTime);
    }
    
    // Your game logic here
  };
  
  // ✅ 9. Start game (with session creation)
  const startGame = async () => {
    gameStartTimeRef.current = Date.now();
    inputCountRef.current = 0;
    reactionTimesRef.current = [];
    
    await createGameSession();
    
    setGameStarted(true);
    // Start game loop
  };
  
  // ✅ 10. End game (with score submission)
  const endGame = async () => {
    setGameEnded(true);
    const finalScore = score;
    const finalAccuracy = /* calculate accuracy */;
    
    await submitScore(finalScore, finalAccuracy);
  };
  
  return (
    <div>
      {!gameStarted && (
        <button onClick={startGame}>
          Start Game
        </button>
      )}
      
      {gameStarted && !gameEnded && (
        <div onMouseMove={handleUserInput} onClick={handleUserInput}>
          {/* Your game canvas/UI here */}
          <p>Score: {score}</p>
        </div>
      )}
      
      {gameEnded && (
        <div>
          <h2>Game Over!</h2>
          <p>Final Score: {score}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🎮 GAME-SPECIFIC CONFIGURATIONS

### Blade Bounce
```typescript
p_game_type: 'blade_bounce'
```

### Laser Dodge
```typescript
p_game_type: 'laser_dodge'
```

### Target Precision
```typescript
p_game_type: 'target_precision'
```

### Reflex Rush
```typescript
p_game_type: 'reflex_rush'
```

### Color Match
```typescript
p_game_type: 'color_match'
```

### Reaction Time
```typescript
p_game_type: 'reaction_time'
```

### Memory Matrix
```typescript
p_game_type: 'memory_matrix'
```

### Pattern Recognition
```typescript
p_game_type: 'pattern_recognition'
```

### Multi Target
```typescript
p_game_type: 'multi_target'
```

### Sword Parry
```typescript
p_game_type: 'sword_parry'
```

### Cash Stack
```typescript
p_game_type: 'cash_stack'
```

### Token Grab
```typescript
p_game_type: 'token_grab'
```

---

## ✅ CHECKLIST FOR EACH GAME

For EVERY game component, ensure:

- [ ] ✅ Uses `FairRNGService` with session RNG seed
- [ ] ✅ Calls `create_game_session` when game starts
- [ ] ✅ Tracks `inputCount` for anti-cheat
- [ ] ✅ Tracks `reactionTimes` for anti-cheat
- [ ] ✅ Tracks `gameDuration` for anti-cheat
- [ ] ✅ Calls `complete_game_session` when game ends
- [ ] ✅ Shows warning if `suspicion_score >= 60`
- [ ] ✅ Rate limit check before allowing game start
- [ ] ✅ Correct `game_type` value in RPC calls

---

## 📊 INTEGRATION STATUS TRACKING

Create this table to track which games are integrated:

| Game | RNG Seeding | Session Creation | Anti-Cheat | Rate Limit | Status |
|------|------------|------------------|------------|-----------|--------|
| Blade Bounce | ❌ | ❌ | ❌ | ❌ | TODO |
| Laser Dodge | ❌ | ❌ | ❌ | ❌ | TODO |
| Target Precision | ❌ | ❌ | ❌ | ❌ | TODO |
| Reflex Rush | ❌ | ❌ | ❌ | ❌ | TODO |
| Color Match | ❌ | ❌ | ❌ | ❌ | TODO |
| Reaction Time | ❌ | ❌ | ❌ | ❌ | TODO |
| Memory Matrix | ❌ | ❌ | ❌ | ❌ | TODO |
| Pattern Recognition | ❌ | ❌ | ❌ | ❌ | TODO |
| Multi Target | ❌ | ❌ | ❌ | ❌ | TODO |
| Sword Parry | ❌ | ❌ | ❌ | ❌ | TODO |
| Cash Stack | ❌ | ❌ | ❌ | ❌ | TODO |
| Token Grab | ❌ | ❌ | ❌ | ❌ | TODO |

**Update each row to ✅ as you integrate.**

---

## 🚀 DEPLOYMENT ORDER

### Phase 1: Backend (SQL)
1. Run `VERIFY_AND_CREATE_ALL_FEATURES.sql`
2. Run `IMPLEMENT_ALL_GAMES_SECURITY.sql`
3. Run `SECURE_FIX_WITH_ANTI_CHEAT.sql`

### Phase 2: Frontend (Pages)
1. Add rate limit display to all game pages
2. Test rate limit blocking

### Phase 3: Game Components (One at a time)
1. Integrate Blade Bounce (already has some features)
2. Integrate Laser Dodge
3. Integrate Target Precision
4. ... continue for all 12 games

### Phase 4: Testing
1. Play each game and verify:
   - RNG seed is used
   - Session is created
   - Score is validated
   - Rate limits work
   - Suspicion alerts appear for cheating

---

## 🔧 TROUBLESHOOTING

### Issue: "Function create_game_session does not exist"
**Fix:** Run `IMPLEMENT_ALL_GAMES_SECURITY.sql`

### Issue: "Rate limits not showing"
**Fix:** Ensure `user_rate_limits` table exists. Run `VERIFY_AND_CREATE_ALL_FEATURES.sql`

### Issue: "RNG seed is null"
**Fix:** Ensure session has `rng_seed`. Run `IMPLEMENT_ALL_GAMES_SECURITY.sql`

### Issue: "Suspicion score always 0"
**Fix:** Ensure you're calling `complete_game_session` with all parameters

---

## 📝 SUMMARY

✅ **SQL Scripts Created:**
- `VERIFY_AND_CREATE_ALL_FEATURES.sql` - Creates all security tables
- `IMPLEMENT_ALL_GAMES_SECURITY.sql` - Adds RNG seeds to all games
- `SECURE_FIX_WITH_ANTI_CHEAT.sql` - Fixes session errors with security intact

✅ **Frontend Components Created:**
- `src/hooks/useRateLimits.ts` - Hook for rate limit status
- `src/components/RateLimitDisplay.tsx` - Visual rate limit display

✅ **Functions Created:**
- `create_game_session()` - Creates tracked game sessions
- `complete_game_session()` - Validates and completes sessions

✅ **All 12 Games Will Have:**
- RNG seeding (fair play)
- Rate limiting (bot prevention)
- Session tracking (audit trail)
- Anti-cheat validation (score integrity)
- Dual wallet support (legal compliance)

🎉 **Your platform is now ready for fair, compliant skill-based gaming!**

