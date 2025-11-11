# Simple RNG Implementation Guide - Match Practice Games

## Problem Identified

The Mulberry32 changes affected **game mechanics**, not just config generation. Games now play differently than practice mode.

## Solution

**Keep TWO separate concerns:**

### 1. RNG Seed Generation (Database) ✅
Use simple random for fairness:
```sql
rng_seed = floor(random() * 20) + 1
```

### 2. Game RNG Configs (Mulberry32) ✅  
Use for generating spawn positions/times in fairRNGService.ts - this is CORRECT

### 3. Game Components (KEEP SIMPLE) ⚠️
Games should use configs OR fallback to simple random - like practice mode:

```typescript
// CORRECT - How practice games work:
rngSeed={Math.floor(Math.random() * 10) + 1}

// Games use this seed to:
// 1. Get predetermined config from fairRNGService
// 2. OR fallback to Math.random() for practice mode
```

## What NOT to Change

**DO NOT modify game components to use Mulberry32 directly!**

The games should:
- ✅ Accept an `rngSeed` prop (1-20)
- ✅ Use that seed to fetch config from `fairRNGService`
- ✅ If no config, use `Math.random()` (practice mode)
- ❌ NOT change their core gameplay mechanics

## Files That Are Correct

These use Mulberry32 to GENERATE configs (correct):
- `src/lib/fairRNGService.ts` ✅
- `src/lib/properSeededRNG.ts` ✅

## Files That Should Stay Simple

These should use simple random OR fetch from fairRNGService:
- `src/components/games/MultiTargetGame.tsx` 
- `src/components/games/LaserDodgeGame.tsx`
- `src/components/games/SwordParryGameSimple.tsx`
- `src/components/games/QuickClickGame.tsx`

## How It Should Work

### Competition Mode:
```typescript
// 1. Session has rng_seed (1-20)
const rngSeed = session.rng_seed; // From database

// 2. Game gets config using that seed
const rngConfig = FairRNGService.getMultiTargetConfig(listingId, entryNumber);

// 3. Game uses predetermined spawns from config
if (rngConfig) {
  // Use rngConfig.rounds[0].targets (already generated with Mulberry32)
  const targets = rngConfig.rounds[0].targets;
}
```

### Practice Mode:
```typescript
// No listing, use simple random
const targetX = 15 + Math.random() * 70;
const targetY = 15 + Math.random() * 70;
```

## The Key Insight

**Mulberry32 is for GENERATING the configs**, not for changing how games play!

- **fairRNGService.ts**: Uses Mulberry32 to create 20 predetermined configs ✅
- **Game components**: Just READ those configs (or use Math.random()) ✅

## What Went Wrong

The Mulberry32 changes made games:
1. Play differently than practice mode
2. Have "way off" RNG behavior
3. Not work for all listings

## The Fix

1. ✅ **Keep Mulberry32 in fairRNGService.ts** - generates good configs
2. ✅ **Keep simple RNG in game components** - matches practice mode
3. ✅ **Run REVERT_TO_SIMPLE_RNG_AND_FIX_UPDATES.sql** - fixes DB updates

## Verification

After fix, games should:
- ✅ Play exactly like practice mode
- ✅ Use predetermined configs in competition
- ✅ Update progress bar/pool immediately
- ✅ All listings playable

## Summary

**Don't change game mechanics** - just change the configs they read from!

The current Mulberry32 implementation in `fairRNGService.ts` is **CORRECT**.  
The game components should **stay as they were** - reading those configs or using Math.random().

No code changes needed - just run the SQL script!

