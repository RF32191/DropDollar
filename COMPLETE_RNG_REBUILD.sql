-- COMPLETE RNG SYSTEM REBUILD
-- Regenerates all RNG seeds with proper randomness
-- Fixes: Multi-Target repetition, Sword Slash stacking, Laser Dodge stopping

-- This script doesn't change database structure, just documents the fix
-- The actual fix is in the TypeScript code that generates RNG configs

/*
PROBLEM IDENTIFIED:
==================
1. Multi-Target: First two rounds had identical positions due to poor seed generation
   - OLD: baseSeed = i * 12345 (creates similar seeds for consecutive configs)
   - OLD: x = 15 + ((seed * 73 + j * 127) % 70) (modulo creates patterns)

2. Sword Slash: Targets stacked because anti-stacking check was ineffective
   - Small seed increments led to similar positions
   - Modulo operations caused clustering

3. Laser Dodge: Spawning stopped or stacked
   - Similar RNG issues
   - Not enough variation in spawn positions

4. Quick Click: Didn't start
   - Game type mismatch (quick_click vs number_tap)
   - Missing fallback logic

SOLUTION IMPLEMENTED:
====================
Created new seeded RNG system using Mulberry32 algorithm:

1. Mulberry32RNG class:
   - High-quality seeded random number generator
   - No modulo operations that cause patterns
   - Proper bit-shifting for true randomness
   - Deterministic (same seed = same results)

2. Improved seed generation:
   - Uses large primes (2654435761, 2147483647)
   - Hash function for strings (listing IDs)
   - Each config gets unique, distant seed

3. Anti-stacking algorithm:
   - Generates positions with minimum distance enforcement
   - Checks ALL existing positions (not just last 3)
   - Increased max attempts from 100 to 200
   - Falls back gracefully if can't find space

4. Spawn time distribution:
   - Evenly distributed base times
   - Random jitter for variation
   - Minimum spacing enforcement
   - Sorted and validated

FILES MODIFIED:
===============
1. src/lib/properSeededRNG.ts (NEW)
   - Mulberry32RNG class
   - generateNonStackingPositions()
   - generateSpawnTimes()
   - hashString() for listing IDs

2. src/lib/fairRNGService.ts (TO BE UPDATED)
   - Replace modulo-based generation
   - Use Mulberry32RNG for all configs
   - Generate 20 unique configs per game type

3. Game components (TO BE VERIFIED)
   - QuickClickGame.tsx - Add game type mapping
   - LaserDodgeGame.tsx - Verify spawn logic
   - MultiTargetGame.tsx - Verify RNG usage
   - SwordParryGameSimple.tsx - Verify RNG usage

TESTING CHECKLIST:
==================
After code deployment, verify:

Multi-Target Game:
[ ] Round 1: 2 targets in different positions
[ ] Round 2: 3 targets in different positions (NOT same as Round 1)
[ ] Round 3: 4 targets in different positions
[ ] No targets stacked on each other
[ ] Each attempt gets different target positions

Sword Slash Game:
[ ] Enemies spawn in varied positions
[ ] No enemies stacked on same spot
[ ] Good distribution across screen
[ ] Spawns throughout entire game duration

Laser Dodge Game:
[ ] Lasers spawn continuously
[ ] Enemy ships spawn continuously
[ ] No stacking of ships or lasers
[ ] Spawns for full 60 seconds

Quick Click Game:
[ ] Game starts when clicked
[ ] Countdown works
[ ] Flash appears after random wait
[ ] 4 rounds complete successfully

Progress Bar & Scoreboard:
[ ] Progress bar updates immediately after playing
[ ] Pool value increases
[ ] Scoreboard appears after submitting score
[ ] Shows all players with scores

DEPLOYMENT STEPS:
=================
1. Update src/lib/fairRNGService.ts to use Mulberry32RNG
2. Fix Quick Click game type mapping
3. Verify Laser Dodge spawn logic
4. Deploy to Vercel
5. Test all games
6. Run this SQL (no-op, just for documentation)

EXPECTED RESULTS:
=================
✅ Multi-Target: Varied positions every round, no repetition
✅ Sword Slash: Well-distributed enemies, no stacking
✅ Laser Dodge: Continuous spawns, no stopping
✅ Quick Click: Starts and completes successfully
✅ All games: Fair, varied, engaging gameplay
✅ Progress bars update immediately
✅ Scoreboards appear after playing
*/

-- Verification queries to check current game sessions
SELECT 'Multi-Target RNG Check' as check_type,
       id, config_id, rng_seed, status, participants_count
FROM hot_sell_sessions
WHERE config_id IN (
  SELECT id FROM hot_sell_configs WHERE game_type = 'multi_target_reaction'
)
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Sword Slash RNG Check' as check_type,
       id, config_id, rng_seed, status, participants_count
FROM hot_sell_sessions
WHERE config_id IN (
  SELECT id FROM hot_sell_configs WHERE game_type = 'sword_parry'
)
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Quick Click RNG Check' as check_type,
       id, config_id, rng_seed, status, participants_count
FROM hot_sell_sessions
WHERE config_id IN (
  SELECT id FROM hot_sell_configs WHERE game_type IN ('quick_click', 'number_tap')
)
ORDER BY created_at DESC
LIMIT 5;

SELECT 'All Game Types' as check_type,
       game_type, COUNT(*) as config_count
FROM hot_sell_configs
GROUP BY game_type
ORDER BY game_type;

