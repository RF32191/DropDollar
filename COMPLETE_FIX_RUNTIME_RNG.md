# COMPLETE FIX - Runtime RNG Instead of Pre-Generated Configs

## The Real Problem

Pre-generated configs in `fairRNGService.ts` are causing issues because:
1. Games play differently than practice mode
2. RNG variations aren't good enough
3. It's overly complex

## The Solution

**Make competition games work EXACTLY like practice games:**
- Use `Math.random()` seeded with session's `rng_seed`
- Generate spawns at runtime (not pre-generated)
- Simple, predictable, fair

## How It Should Work

### Practice Mode (Works Perfect):
```typescript
// No listing, use Math.random()
const x = 15 + Math.random() * 70;
const y = 15 + Math.random() * 70;
```

### Competition Mode (Make It Work The Same):
```typescript
// Use session's rng_seed to initialize Math.random
// Then generate spawns the SAME WAY as practice
const rng = new SeededRandom(session.rng_seed);
const x = 15 + rng.next() * 70;
const y = 15 + rng.next() * 70;
```

## Implementation Plan

### Step 1: Remove fairRNGService dependency from games

Games should NOT fetch configs. Instead:
```typescript
// OLD (Complex):
const rngConfig = FairRNGService.getMultiTargetConfig(listingId, entryNumber);
if (rngConfig) {
  const targets = rngConfig.rounds[0].targets; // Pre-generated
}

// NEW (Simple):
const rng = new SeededRandom(rngSeed); // From session
const x = 15 + rng.next() * 70; // Generate at runtime
const y = 15 + rng.next() * 70;
```

### Step 2: All games use same pattern

Multi-Target, Laser Dodge, Sword Slash, Quick Click:
- Accept `rngSeed` prop (1-20 from session)
- Use SeededRandom with that seed
- Generate spawns at runtime
- Works EXACTLY like practice mode

### Step 3: Progress bar & scoreboard

After score submission:
```typescript
// Server returns updated stats
const { data } = await updateScore(...);
// data.stats contains:
// - participants_count
// - prize_pool
// - progress_percent

// Update UI immediately
setProgressPercent(data.stats.progress_percent);
setPrizePool(data.stats.prize_pool);

// Show scoreboard (already have logic)
if (hasPlayed) {
  // Scoreboard visible
}
```

## Files To Modify

### 1. Remove RNG Config Fetching
```typescript
// src/components/games/MultiTargetGame.tsx
// src/components/games/LaserDodgeGame.tsx
// src/components/games/SwordParryGameSimple.tsx
// src/components/games/QuickClickGame.tsx

// REMOVE:
const rngConfig = FairRNGService.getMultiTargetConfig(listingId, entryNumber);

// ADD:
const rng = rngSeed ? new SeededRandom(rngSeed) : null;
```

### 2. Generate Spawns At Runtime
```typescript
// Multi-Target example:
if (rng) {
  // Competition: use seeded RNG
  const x = 15 + rng.next() * 70;
  const y = 15 + rng.next() * 70;
} else {
  // Practice: use Math.random()
  const x = 15 + Math.random() * 70;
  const y = 15 + Math.random() * 70;
}
```

### 3. Update Progress Bar
```typescript
// src/app/hot-sell/page.tsx
const handleGameComplete = async (score: number, accuracy: number) => {
  const { data } = await executeRpcWithSession('update_hot_sell_score', {
    session_id_param: selectedGameFlow.sessionId,
    user_id_param: user.id,
    score_param: score,
    accuracy_param: accuracy
  });
  
  if (data?.stats) {
    // Update UI with returned stats
    console.log('Progress:', data.stats.progress_percent);
    console.log('Pool:', data.stats.prize_pool);
    
    // Reload sessions to show changes
    await loadSessions();
  }
};
```

## Why This Will Work

1. **Simplicity**: Same code path as practice games
2. **Fairness**: Same seed = same spawns for all players
3. **Variety**: 20 different seeds = 20 different experiences
4. **Proven**: Practice games already work this way

## What To Do

1. Run `REVERT_TO_SIMPLE_RNG_AND_FIX_UPDATES.sql` (if not done)
2. I'll modify game components to use runtime RNG
3. Test and verify everything works

Ready to implement?

