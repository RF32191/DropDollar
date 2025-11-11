/**
 * Improved RNG with better distribution and no repetition
 * Fixes issues with stacking targets and repetitive patterns
 */

/**
 * Seeded random number generator for deterministic but varied results
 * Uses a better algorithm than simple modulo
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generate next random number between 0 and 1
   * Uses mulberry32 algorithm for better distribution
   */
  next(): number {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Pick N unique elements from array
   */
  pickUnique<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, Math.min(count, array.length));
  }
}

/**
 * Generate improved Multi-Target positions with no stacking
 */
export function generateNonStackingPositions(
  count: number,
  seed: number,
  minDistance: number = 15
): Array<{ x: number; y: number }> {
  const rng = new SeededRandom(seed);
  const positions: Array<{ x: number; y: number }> = [];
  const maxAttempts = 100;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let validPosition = false;
    let newPos = { x: 0, y: 0 };

    while (!validPosition && attempts < maxAttempts) {
      newPos = {
        x: rng.nextInt(15, 85), // 15-85% to avoid edges
        y: rng.nextInt(15, 85)
      };

      // Check distance from all existing positions
      validPosition = positions.every(pos => {
        const dx = pos.x - newPos.x;
        const dy = pos.y - newPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance >= minDistance;
      });

      attempts++;
    }

    positions.push(newPos);
  }

  return positions;
}

/**
 * Generate improved Sword Slash spawn times with variation
 */
export function generateNonStackingSpawns(
  duration: number,
  count: number,
  seed: number,
  minDistance: number = 15
): Array<{ time: number; x: number; y: number; lifetime: number; size: number }> {
  const rng = new SeededRandom(seed);
  const spawns: Array<{ time: number; x: number; y: number; lifetime: number; size: number }> = [];

  // Generate well-distributed spawn times
  const timeStep = duration / (count + 1);
  
  for (let i = 0; i < count; i++) {
    const baseTime = (i + 1) * timeStep;
    const jitter = rng.nextFloat(-timeStep * 0.3, timeStep * 0.3);
    const time = Math.max(500, Math.min(duration - 1000, baseTime + jitter));

    // Find non-stacking position
    let attempts = 0;
    let validPosition = false;
    let newPos = { x: 0, y: 0 };

    while (!validPosition && attempts < 100) {
      newPos = {
        x: rng.nextInt(20, 80),
        y: rng.nextInt(25, 75)
      };

      // Check distance from recent spawns (last 3)
      const recentSpawns = spawns.slice(-3);
      validPosition = recentSpawns.every(spawn => {
        const dx = spawn.x - newPos.x;
        const dy = spawn.y - newPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance >= minDistance;
      });

      attempts++;
    }

    spawns.push({
      time: Math.floor(time),
      x: newPos.x,
      y: newPos.y,
      lifetime: rng.nextInt(2200, 3200),
      size: rng.nextFloat(0.8, 1.1)
    });
  }

  return spawns.sort((a, b) => a.time - b.time);
}

/**
 * Generate improved Quick Click wait times with variation
 */
export function generateVariedWaitTimes(
  rounds: number,
  seed: number
): number[] {
  const rng = new SeededRandom(seed);
  const waitTimes: number[] = [];

  for (let i = 0; i < rounds; i++) {
    // More variation in wait times: 2-6 seconds
    const baseWait = rng.nextFloat(2000, 6000);
    
    // Add round-based difficulty scaling
    const difficultyScale = 1 - (i * 0.1); // Later rounds can be slightly faster
    const waitTime = Math.max(1500, baseWait * difficultyScale);
    
    waitTimes.push(Math.floor(waitTime));
  }

  return waitTimes;
}

/**
 * Hash string to seed (for consistent but unique seeds per listing)
 */
export function hashStringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate complete Multi-Target round config with improved RNG
 */
export function generateMultiTargetRound(
  roundNumber: number,
  targetCount: number,
  seed: number
) {
  const positions = generateNonStackingPositions(targetCount, seed);
  const rng = new SeededRandom(seed + roundNumber);

  return {
    round: roundNumber,
    targets: positions.map((pos, index) => ({
      x: pos.x,
      y: pos.y,
      size: rng.nextFloat(0.8, 1.1),
      timing: rng.nextInt(1500, 2500) // Varied timing
    })),
    timeLimit: 5000 + roundNumber * 500, // Increasing difficulty
    difficulty: roundNumber === 1 ? 'easy' : roundNumber === 2 ? 'medium' : 'hard'
  };
}

/**
 * Generate complete Sword Slash config with improved RNG
 */
export function generateSwordSlashRound(
  duration: number,
  attackCount: number,
  seed: number
) {
  return {
    attackSpawns: generateNonStackingSpawns(duration, attackCount, seed),
    duration,
    difficulty: attackCount < 8 ? 'easy' : attackCount < 12 ? 'medium' : 'hard'
  };
}

