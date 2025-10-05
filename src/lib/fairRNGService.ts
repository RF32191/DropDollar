// Fair RNG System - Assigns specific RNG configs per attempt number
// 1st attempt: All players get same RNG config
// 2nd attempt: All players get different same RNG config  
// 3rd attempt: All players get another different same RNG config

export interface MultiTargetRNGConfig {
  id: number;
  name: string;
  rounds: {
    round: number;
    targets: {
      x: number; // percentage of screen width (0-100)
      y: number; // percentage of screen height (0-100)
      size: number; // target size multiplier (0.5-1.5)
      timing: number; // how long target stays active (ms)
    }[];
    timeLimit: number; // total time for round (ms)
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
}

export interface FallingObjectRNGConfig {
  id: number;
  name: string;
  sequence: {
    time: number; // when object appears (ms from start)
    type: 'coin' | 'cash' | 'trophy';
    x: number; // horizontal position (percentage 0-100)
    speed: number; // fall speed multiplier (0.5-2.0)
    value: number; // point value
  }[];
  duration: number; // total game duration (ms)
  difficulty: 'easy' | 'medium' | 'hard';
}

// 20 Multi-Target RNG Configurations
export const MULTI_TARGET_RNG_CONFIGS: MultiTargetRNGConfig[] = [
  {
    id: 1,
    name: "Balanced Cross",
    rounds: [
      {
        round: 1,
        targets: [
          { x: 25, y: 25, size: 1.0, timing: 2000 },
          { x: 75, y: 75, size: 1.0, timing: 2000 }
        ],
        timeLimit: 5000,
        difficulty: 'easy'
      },
      {
        round: 2,
        targets: [
          { x: 50, y: 20, size: 0.9, timing: 1800 },
          { x: 20, y: 60, size: 0.9, timing: 1800 },
          { x: 80, y: 60, size: 0.9, timing: 1800 }
        ],
        timeLimit: 6000,
        difficulty: 'medium'
      },
      {
        round: 3,
        targets: [
          { x: 15, y: 15, size: 0.8, timing: 1500 },
          { x: 85, y: 15, size: 0.8, timing: 1500 },
          { x: 15, y: 85, size: 0.8, timing: 1500 },
          { x: 85, y: 85, size: 0.8, timing: 1500 }
        ],
        timeLimit: 7000,
        difficulty: 'hard'
      }
    ]
  },
  {
    id: 2,
    name: "Center Focus",
    rounds: [
      {
        round: 1,
        targets: [
          { x: 50, y: 50, size: 1.1, timing: 2200 }
        ],
        timeLimit: 4000,
        difficulty: 'easy'
      },
      {
        round: 2,
        targets: [
          { x: 40, y: 40, size: 1.0, timing: 1900 },
          { x: 60, y: 60, size: 1.0, timing: 1900 }
        ],
        timeLimit: 5500,
        difficulty: 'medium'
      },
      {
        round: 3,
        targets: [
          { x: 30, y: 50, size: 0.8, timing: 1400 },
          { x: 50, y: 30, size: 0.8, timing: 1400 },
          { x: 70, y: 50, size: 0.8, timing: 1400 },
          { x: 50, y: 70, size: 0.8, timing: 1400 }
        ],
        timeLimit: 7500,
        difficulty: 'hard'
      }
    ]
  },
  {
    id: 3,
    name: "Edge Challenge",
    rounds: [
      {
        round: 1,
        targets: [
          { x: 10, y: 50, size: 1.0, timing: 2100 },
          { x: 90, y: 50, size: 1.0, timing: 2100 }
        ],
        timeLimit: 5200,
        difficulty: 'easy'
      },
      {
        round: 2,
        targets: [
          { x: 50, y: 10, size: 0.9, timing: 1700 },
          { x: 10, y: 90, size: 0.9, timing: 1700 },
          { x: 90, y: 90, size: 0.9, timing: 1700 }
        ],
        timeLimit: 6200,
        difficulty: 'medium'
      },
      {
        round: 3,
        targets: [
          { x: 5, y: 25, size: 0.7, timing: 1300 },
          { x: 95, y: 25, size: 0.7, timing: 1300 },
          { x: 5, y: 75, size: 0.7, timing: 1300 },
          { x: 95, y: 75, size: 0.7, timing: 1300 },
          { x: 50, y: 5, size: 0.7, timing: 1300 }
        ],
        timeLimit: 8000,
        difficulty: 'hard'
      }
    ]
  }
];

// Generate remaining 17 configurations programmatically
for (let i = 4; i <= 20; i++) {
  const config: MultiTargetRNGConfig = {
    id: i,
    name: `Pattern ${i}`,
    rounds: [
      {
        round: 1,
        targets: [
          { 
            x: 15 + (i * 3) % 70, 
            y: 20 + (i * 5) % 60, 
            size: 1.0, 
            timing: 2000 + (i * 50) % 400 
          },
          { 
            x: 25 + (i * 7) % 60, 
            y: 30 + (i * 4) % 50, 
            size: 1.0, 
            timing: 2000 + (i * 50) % 400 
          }
        ],
        timeLimit: 5000 + (i * 100) % 500,
        difficulty: 'easy'
      },
      {
        round: 2,
        targets: [
          { 
            x: 20 + (i * 4) % 60, 
            y: 25 + (i * 6) % 50, 
            size: 0.9, 
            timing: 1800 + (i * 40) % 300 
          },
          { 
            x: 40 + (i * 8) % 40, 
            y: 45 + (i * 3) % 40, 
            size: 0.9, 
            timing: 1800 + (i * 40) % 300 
          },
          { 
            x: 60 + (i * 5) % 30, 
            y: 35 + (i * 7) % 50, 
            size: 0.9, 
            timing: 1800 + (i * 40) % 300 
          }
        ],
        timeLimit: 6000 + (i * 80) % 400,
        difficulty: 'medium'
      },
      {
        round: 3,
        targets: [
          { 
            x: 10 + (i * 6) % 80, 
            y: 15 + (i * 4) % 70, 
            size: 0.8, 
            timing: 1500 + (i * 30) % 200 
          },
          { 
            x: 30 + (i * 9) % 50, 
            y: 35 + (i * 5) % 50, 
            size: 0.8, 
            timing: 1500 + (i * 30) % 200 
          },
          { 
            x: 50 + (i * 7) % 40, 
            y: 55 + (i * 8) % 30, 
            size: 0.8, 
            timing: 1500 + (i * 30) % 200 
          },
          { 
            x: 70 + (i * 4) % 25, 
            y: 75 + (i * 6) % 20, 
            size: 0.8, 
            timing: 1500 + (i * 30) % 200 
          }
        ],
        timeLimit: 7000 + (i * 60) % 300,
        difficulty: 'hard'
      }
    ]
  };
  MULTI_TARGET_RNG_CONFIGS.push(config);
}

// 20 Falling Object RNG Configurations
export const FALLING_OBJECT_RNG_CONFIGS: FallingObjectRNGConfig[] = [
  {
    id: 1,
    name: "Balanced Mix",
    sequence: [
      { time: 1000, type: 'coin', x: 25, speed: 1.0, value: 10 },
      { time: 2000, type: 'cash', x: 75, speed: 1.2, value: 50 },
      { time: 3500, type: 'coin', x: 50, speed: 0.8, value: 10 },
      { time: 5000, type: 'trophy', x: 30, speed: 1.5, value: 100 },
      { time: 6500, type: 'coin', x: 80, speed: 1.1, value: 10 },
      { time: 8000, type: 'cash', x: 20, speed: 1.3, value: 50 },
      { time: 9500, type: 'coin', x: 60, speed: 0.9, value: 10 },
      { time: 11000, type: 'trophy', x: 70, speed: 1.4, value: 100 }
    ],
    duration: 15000,
    difficulty: 'medium'
  },
  {
    id: 2,
    name: "Coin Focus",
    sequence: [
      { time: 800, type: 'coin', x: 40, speed: 1.0, value: 10 },
      { time: 1600, type: 'coin', x: 60, speed: 1.1, value: 10 },
      { time: 2800, type: 'cash', x: 30, speed: 1.2, value: 50 },
      { time: 4200, type: 'coin', x: 70, speed: 0.9, value: 10 },
      { time: 5600, type: 'coin', x: 20, speed: 1.0, value: 10 },
      { time: 7200, type: 'trophy', x: 80, speed: 1.6, value: 100 },
      { time: 8800, type: 'coin', x: 45, speed: 1.1, value: 10 },
      { time: 10400, type: 'cash', x: 65, speed: 1.3, value: 50 },
      { time: 12000, type: 'coin', x: 35, speed: 0.8, value: 10 }
    ],
    duration: 15000,
    difficulty: 'easy'
  },
  {
    id: 3,
    name: "Speed Challenge",
    sequence: [
      { time: 500, type: 'coin', x: 15, speed: 1.8, value: 10 },
      { time: 1200, type: 'cash', x: 85, speed: 2.0, value: 50 },
      { time: 2000, type: 'coin', x: 45, speed: 1.6, value: 10 },
      { time: 3000, type: 'trophy', x: 25, speed: 2.2, value: 100 },
      { time: 4200, type: 'coin', x: 75, speed: 1.9, value: 10 },
      { time: 5500, type: 'cash', x: 55, speed: 2.1, value: 50 },
      { time: 7000, type: 'coin', x: 35, speed: 1.7, value: 10 },
      { time: 8800, type: 'trophy', x: 65, speed: 2.3, value: 100 }
    ],
    duration: 15000,
    difficulty: 'hard'
  }
];

// Generate remaining 17 falling object configurations
for (let i = 4; i <= 20; i++) {
  const sequence = [];
  const numObjects = 7 + (i % 3); // 7-9 objects per game
  
  for (let j = 0; j < numObjects; j++) {
    const time = 1000 + (j * 1500) + ((i * j * 100) % 500);
    const types: ('coin' | 'cash' | 'trophy')[] = ['coin', 'cash', 'trophy'];
    const type = types[(i + j) % 3];
    const x = 15 + ((i * 13 + j * 17) % 70);
    const speed = 0.8 + ((i + j) % 15) * 0.1;
    const value = type === 'coin' ? 10 : type === 'cash' ? 50 : 100;
    
    sequence.push({ time, type, x, speed, value });
  }
  
  FALLING_OBJECT_RNG_CONFIGS.push({
    id: i,
    name: `Pattern ${i}`,
    sequence,
    duration: 15000,
    difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard'
  });
}

// Fair RNG Assignment System
export class FairRNGService {
  /**
   * Get Multi-Target RNG config based on listing ID and attempt number
   * All players on attempt 1 get same RNG, attempt 2 get different same RNG, etc.
   * 
   * @param listingId - Unique identifier for the listing/match
   * @param attemptNumber - Which attempt this is (1, 2, 3, etc.)
   * @returns Consistent RNG configuration for all players on this attempt
   */
  static getMultiTargetConfig(listingId: string, attemptNumber: number): MultiTargetRNGConfig {
    // Create deterministic hash from listing ID
    const listingHash = this.hashString(listingId);
    
    // Calculate base index from listing (0-19)
    const baseIndex = listingHash % 20;
    
    // Offset by attempt number to get different RNG per attempt
    // Use prime number to ensure good distribution
    const attemptOffset = (attemptNumber - 1) * 7;
    const configIndex = (baseIndex + attemptOffset) % 20;
    
    return MULTI_TARGET_RNG_CONFIGS[configIndex];
  }
  
  /**
   * Get Falling Object RNG config based on listing ID and attempt number
   */
  static getFallingObjectConfig(listingId: string, attemptNumber: number): FallingObjectRNGConfig {
    const listingHash = this.hashString(listingId);
    const baseIndex = listingHash % 20;
    
    // Use different prime offset for falling objects to ensure variety
    const attemptOffset = (attemptNumber - 1) * 11;
    const configIndex = (baseIndex + attemptOffset) % 20;
    
    return FALLING_OBJECT_RNG_CONFIGS[configIndex];
  }
  
  /**
   * Get all 3 RNG configs that will be used for a listing/match
   * Useful for preview or admin purposes
   */
  static getListingRNGPreview(listingId: string): {
    multiTarget: { attempt: number; config: MultiTargetRNGConfig }[];
    fallingObject: { attempt: number; config: FallingObjectRNGConfig }[];
  } {
    return {
      multiTarget: [
        { attempt: 1, config: this.getMultiTargetConfig(listingId, 1) },
        { attempt: 2, config: this.getMultiTargetConfig(listingId, 2) },
        { attempt: 3, config: this.getMultiTargetConfig(listingId, 3) }
      ],
      fallingObject: [
        { attempt: 1, config: this.getFallingObjectConfig(listingId, 1) },
        { attempt: 2, config: this.getFallingObjectConfig(listingId, 2) },
        { attempt: 3, config: this.getFallingObjectConfig(listingId, 3) }
      ]
    };
  }
  
  /**
   * Simple hash function for consistent RNG assignment
   * Same input always produces same output
   */
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Validate RNG assignment consistency
   * Ensures same listing + attempt always returns same config
   */
  static validateConsistency(listingId: string, attemptNumber: number): boolean {
    const config1 = this.getMultiTargetConfig(listingId, attemptNumber);
    const config2 = this.getMultiTargetConfig(listingId, attemptNumber);
    const config3 = this.getFallingObjectConfig(listingId, attemptNumber);
    const config4 = this.getFallingObjectConfig(listingId, attemptNumber);
    
    return config1.id === config2.id && config3.id === config4.id;
  }
  
  /**
   * Get configuration summary for debugging
   */
  static getConfigSummary(listingId: string): string {
    const preview = this.getListingRNGPreview(listingId);
    
    return `Listing ${listingId}:
Multi-Target: Attempt 1=${preview.multiTarget[0].config.id}, Attempt 2=${preview.multiTarget[1].config.id}, Attempt 3=${preview.multiTarget[2].config.id}
Falling Object: Attempt 1=${preview.fallingObject[0].config.id}, Attempt 2=${preview.fallingObject[1].config.id}, Attempt 3=${preview.fallingObject[2].config.id}`;
  }
  
  /**
   * Get all available configurations (for admin/testing)
   */
  static getAllConfigs() {
    return {
      multiTarget: MULTI_TARGET_RNG_CONFIGS,
      fallingObject: FALLING_OBJECT_RNG_CONFIGS
    };
  }
}
