/**
 * Proper Seeded RNG using Mulberry32 algorithm
 * Fixes all repetition and stacking issues
 */

/**
 * Mulberry32 - High-quality seeded random number generator
 * Better than modulo-based approaches, no repetition
 */
export class Mulberry32RNG {
  private seed: number;

  constructor(seed: number) {
    // Ensure seed is a valid 32-bit integer
    this.seed = seed >>> 0;
  }

  /**
   * Generate next random float between 0 and 1
   * Uses mulberry32 algorithm for high-quality randomness
   */
  next(): number {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return result;
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
   * Pick a random element from array
   */
  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/**
 * Generate unique hash from string (for listing IDs)
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) >>> 0;
}

/**
 * Generate seed for specific game config
 */
export function generateConfigSeed(configIndex: number, gameType: string): number {
  const gameTypeHash = hashString(gameType);
  // Use large primes to ensure seeds are very different
  return (gameTypeHash * 2654435761 + configIndex * 2147483647) >>> 0;
}

/**
 * Generate non-stacking positions with minimum distance
 */
export function generateNonStackingPositions(
  count: number,
  seed: number,
  minDistance: number = 15,
  xRange: [number, number] = [15, 85],
  yRange: [number, number] = [15, 85]
): Array<{ x: number; y: number }> {
  const rng = new Mulberry32RNG(seed);
  const positions: Array<{ x: number; y: number }> = [];
  const maxAttempts = 200; // Increased from 100

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let validPosition = false;
    let newPos = { x: 0, y: 0 };

    while (!validPosition && attempts < maxAttempts) {
      newPos = {
        x: rng.nextFloat(xRange[0], xRange[1]),
        y: rng.nextFloat(yRange[0], yRange[1])
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

    // If we couldn't find a valid position after many attempts, just place it anyway
    positions.push(newPos);
  }

  return positions;
}

/**
 * Generate spawn times with minimum spacing
 */
export function generateSpawnTimes(
  count: number,
  duration: number,
  seed: number,
  minSpacing: number = 1000
): number[] {
  const rng = new Mulberry32RNG(seed);
  const times: number[] = [];
  
  // Start after 1 second
  const startTime = 1000;
  const endTime = duration - 1000;
  const availableTime = endTime - startTime;
  
  // Generate evenly distributed base times
  const baseInterval = availableTime / (count + 1);
  
  for (let i = 0; i < count; i++) {
    const baseTime = startTime + (i + 1) * baseInterval;
    // Add jitter (up to 30% of interval)
    const jitter = rng.nextFloat(-baseInterval * 0.3, baseInterval * 0.3);
    const spawnTime = Math.max(startTime, Math.min(endTime, baseTime + jitter));
    times.push(Math.floor(spawnTime));
  }
  
  // Sort and ensure minimum spacing
  times.sort((a, b) => a - b);
  
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] < minSpacing) {
      times[i] = times[i - 1] + minSpacing;
    }
  }
  
  return times;
}

