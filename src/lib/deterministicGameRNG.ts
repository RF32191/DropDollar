// Deterministic Game RNG System
// Ensures all users get identical game experiences per listing for legal compliance

export interface GameSeed {
  listingId: string;
  gameType: string;
  entryNumber: number; // 1, 2, or 3 for multi-entry
  seed: number;
  generatedAt: Date;
}

export interface GameConfiguration {
  listingId: string;
  gameType: string;
  entryNumber: number;
  // Multi-Target specific
  targetSequence?: Array<{
    correctTarget: number;
    positions: number[];
    timing: number;
  }>;
  // Falling Objects specific
  objectSequence?: Array<{
    x: number;
    speed: number;
    bounce: number;
    timing: number;
  }>;
  // Color Sequence specific
  colorSequence?: Array<{
    color: string;
    sound: string;
    timing: number;
  }>;
}

export class DeterministicGameRNG {
  private static gameConfigurations: Map<string, GameConfiguration> = new Map();

  // Simple seeded random number generator (Linear Congruential Generator)
  private static seededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 1664525 + 1013904223) % 4294967296;
      return current / 4294967296;
    };
  }

  // Generate a deterministic seed based on listing ID and entry number
  private static generateSeed(listingId: string, entryNumber: number): number {
    let hash = 0;
    const str = `${listingId}-${entryNumber}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get or create game configuration for a specific listing and entry
  static getGameConfiguration(listingId: string, gameType: string, entryNumber: number): GameConfiguration {
    const configKey = `${listingId}-${gameType}-${entryNumber}`;
    
    if (this.gameConfigurations.has(configKey)) {
      return this.gameConfigurations.get(configKey)!;
    }

    const seed = this.generateSeed(listingId, entryNumber);
    const rng = this.seededRandom(seed);
    
    const config: GameConfiguration = {
      listingId,
      gameType,
      entryNumber,
    };

    // Generate deterministic game configuration based on game type
    switch (gameType) {
      case 'multi-target':
        config.targetSequence = this.generateTargetSequence(rng);
        break;
      case 'falling-objects':
        config.objectSequence = this.generateObjectSequence(rng);
        break;
      case 'color-sequence':
        config.colorSequence = this.generateColorSequence(rng);
        break;
    }

    this.gameConfigurations.set(configKey, config);
    return config;
  }


  // Multi-Target sequence generation
  private static generateTargetSequence(rng: () => number): Array<{
    correctTarget: number;
    positions: number[];
    timing: number;
  }> {
    const sequence = [];
    
    for (let i = 0; i < 40; i++) {
      const numTargets = 3 + Math.floor(rng() * 3); // 3-5 targets
      const positions = Array.from({length: numTargets}, (_, i) => i);
      const correctTarget = Math.floor(rng() * numTargets);
      const timing = 800 + rng() * 1200; // 800-2000ms
      
      sequence.push({ correctTarget, positions, timing });
    }
    
    return sequence;
  }


  // Falling objects sequence generation
  private static generateObjectSequence(rng: () => number): Array<{
    x: number;
    speed: number;
    bounce: number;
    timing: number;
  }> {
    const sequence = [];
    let currentTime = 0;
    
    for (let i = 0; i < 80; i++) {
      const x = rng() * 0.8 + 0.1; // 10%-90% of screen width
      const speed = 50 + rng() * 100; // 50-150 pixels per second
      const bounce = 0.3 + rng() * 0.4; // 0.3-0.7 bounce factor
      const timing = currentTime + 200 + rng() * 800; // 200-1000ms intervals
      
      sequence.push({ x, speed, bounce, timing });
      currentTime = timing;
    }
    
    return sequence;
  }


  // Color sequence generation
  private static generateColorSequence(rng: () => number): Array<{
    color: string;
    sound: string;
    timing: number;
  }> {
    const sequence = [];
    const colors = ['red', 'blue', 'green', 'yellow'];
    const sounds = ['beep1', 'beep2', 'beep3', 'beep4'];
    const sequenceLength = 8 + Math.floor(rng() * 8); // 8-15 colors
    
    for (let i = 0; i < sequenceLength; i++) {
      const colorIndex = Math.floor(rng() * colors.length);
      const color = colors[colorIndex];
      const sound = sounds[colorIndex];
      const timing = 600 + rng() * 400; // 600-1000ms
      
      sequence.push({ color, sound, timing });
    }
    
    return sequence;
  }


  // Clear configurations (for testing or reset)
  static clearConfigurations(): void {
    this.gameConfigurations.clear();
  }

  // Get all configurations for a listing (for debugging)
  static getListingConfigurations(listingId: string): GameConfiguration[] {
    const configs: GameConfiguration[] = [];
    for (const [key, config] of this.gameConfigurations.entries()) {
      if (config.listingId === listingId) {
        configs.push(config);
      }
    }
    return configs;
  }
}

export default DeterministicGameRNG;
