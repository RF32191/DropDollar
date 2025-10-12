/**
 * RNG Seed System for Fair Competition
 * 
 * Each competition listing gets 20 pre-generated RNG seeds per game.
 * All players in the same competition use the same seed for fairness.
 * 
 * Exception: Color Sequence doesn't use RNG (memory-based)
 */

export interface RNGSeed {
  seed: number;
  gameType: string;
  listingId: string;
  seedIndex: number; // 1-20
  createdAt: string;
}

/**
 * Generate a seeded random number generator
 * Using mulberry32 algorithm for consistent, deterministic randomness
 */
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Generate next random number (0 to 1)
  next(): number {
    this.seed |= 0;
    this.seed = (this.seed + 0x9e3779b9) | 0;
    let t = this.seed ^ (this.seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  }

  // Generate random integer between min and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Generate random float between min and max
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Shuffle array using Fisher-Yates with this RNG
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Generate 20 unique RNG seeds for a game type
 */
export function generate20Seeds(gameType: string, listingId: string): RNGSeed[] {
  const seeds: RNGSeed[] = [];
  const baseTime = Date.now();
  
  for (let i = 1; i <= 20; i++) {
    // Create unique but reproducible seed
    const seed = Math.floor(Math.random() * 2147483647);
    
    seeds.push({
      seed,
      gameType,
      listingId,
      seedIndex: i,
      createdAt: new Date(baseTime + i).toISOString()
    });
  }
  
  return seeds;
}

/**
 * Get the appropriate seed for a competition entry
 * Players are assigned seeds 1-20 based on their entry number
 */
export function getSeedForEntry(
  seeds: RNGSeed[], 
  entryNumber: number
): RNGSeed | null {
  // Cycle through seeds 1-20
  const seedIndex = ((entryNumber - 1) % 20) + 1;
  return seeds.find(s => s.seedIndex === seedIndex) || null;
}

/**
 * Initialize seeded random for a game
 */
export function initGameRNG(seed: number): SeededRandom {
  return new SeededRandom(seed);
}

/**
 * Check if a game type uses RNG
 * Color Sequence is memory-based and doesn't use RNG
 */
export function gameUsesRNG(gameType: string): boolean {
  return gameType !== 'color-sequence';
}

/**
 * Game-specific RNG configurations
 */
export const GAME_RNG_CONFIG = {
  'multi-target': {
    usesRNG: true,
    rngFor: ['target positions', 'timing', 'appearance order']
  },
  'falling-object': {
    usesRNG: true,
    rngFor: ['fall speed', 'spawn positions', 'object types']
  },
  'color-sequence': {
    usesRNG: false,
    rngFor: [] // Memory-based, player determines pattern
  },
  'laser-dodge': {
    usesRNG: true,
    rngFor: ['laser patterns', 'timing', 'movement paths']
  },
  'quick-click': {
    usesRNG: true,
    rngFor: ['wait times', 'bonus target position']
  },
  'sword-parry': {
    usesRNG: true,
    rngFor: ['attack timing', 'attack patterns', 'speed variations']
  }
};

export default {
  SeededRandom,
  generate20Seeds,
  getSeedForEntry,
  initGameRNG,
  gameUsesRNG,
  GAME_RNG_CONFIG
};

