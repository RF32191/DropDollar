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

export interface LaserDodgeRNGConfig {
  id: number;
  name: string;
  laserSpawns: {
    time: number; // when laser spawns (ms from start)
    type: 'horizontal' | 'vertical';
    position: number; // position percentage (0-100)
    timeToHarmful: number; // how long until laser turns red (ms)
    duration: number; // how long laser stays active (ms)
  }[];
  enemySpawns: {
    time: number; // when enemy spawns (ms from start)
    x: number; // starting x position (percentage 0-100)
    y: number; // starting y position (percentage 0-100)
    direction: 'left' | 'right'; // which direction enemy moves
    speed: number; // movement speed multiplier (0.1-0.5)
  }[];
  duration: number; // total game duration (60000ms)
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SwordSlashRNGConfig {
  id: number;
  name: string;
  attackSpawns: {
    time: number; // when attack spawns (ms from start)
    x: number; // position percentage (0-100)
    y: number; // position percentage (0-100)
    lifetime: number; // how long attack stays active (ms)
    size: number; // attack size multiplier (0.8-1.2)
  }[];
  duration: number; // total game duration (60000ms)
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

// 20 Laser Dodge RNG Configurations
export const LASER_DODGE_RNG_CONFIGS: LaserDodgeRNGConfig[] = [
  {
    id: 1,
    name: "Balanced Pattern",
    laserSpawns: [
      { time: 1000, type: 'horizontal', position: 25, timeToHarmful: 2000, duration: 4000 },
      { time: 2500, type: 'vertical', position: 75, timeToHarmful: 2200, duration: 4200 },
      { time: 4000, type: 'horizontal', position: 60, timeToHarmful: 1800, duration: 3800 },
      { time: 6000, type: 'vertical', position: 30, timeToHarmful: 2100, duration: 4100 },
      { time: 8500, type: 'horizontal', position: 80, timeToHarmful: 1900, duration: 3900 },
      { time: 11000, type: 'vertical', position: 50, timeToHarmful: 2000, duration: 4000 },
      { time: 14000, type: 'horizontal', position: 15, timeToHarmful: 1700, duration: 3700 },
      { time: 17000, type: 'vertical', position: 85, timeToHarmful: 1800, duration: 3800 }
    ],
    enemySpawns: [
      { time: 3000, x: 105, y: 30, direction: 'left', speed: 0.2 },
      { time: 7000, x: -5, y: 70, direction: 'right', speed: 0.18 },
      { time: 12000, x: 105, y: 50, direction: 'left', speed: 0.22 },
      { time: 18000, x: -5, y: 20, direction: 'right', speed: 0.19 },
      { time: 25000, x: 105, y: 80, direction: 'left', speed: 0.21 }
    ],
    duration: 60000,
    difficulty: 'medium'
  },
  {
    id: 2,
    name: "Edge Focus",
    laserSpawns: [
      { time: 800, type: 'horizontal', position: 10, timeToHarmful: 2500, duration: 4500 },
      { time: 2000, type: 'vertical', position: 90, timeToHarmful: 2300, duration: 4300 },
      { time: 3500, type: 'horizontal', position: 90, timeToHarmful: 2100, duration: 4100 },
      { time: 5500, type: 'vertical', position: 10, timeToHarmful: 2400, duration: 4400 },
      { time: 8000, type: 'horizontal', position: 20, timeToHarmful: 1900, duration: 3900 },
      { time: 10500, type: 'vertical', position: 80, timeToHarmful: 2000, duration: 4000 },
      { time: 13500, type: 'horizontal', position: 85, timeToHarmful: 1800, duration: 3800 },
      { time: 16000, type: 'vertical', position: 15, timeToHarmful: 1700, duration: 3700 }
    ],
    enemySpawns: [
      { time: 4000, x: -5, y: 40, direction: 'right', speed: 0.17 },
      { time: 9000, x: 105, y: 60, direction: 'left', speed: 0.19 },
      { time: 15000, x: -5, y: 25, direction: 'right', speed: 0.18 },
      { time: 22000, x: 105, y: 75, direction: 'left', speed: 0.20 }
    ],
    duration: 60000,
    difficulty: 'easy'
  },
  {
    id: 3,
    name: "Speed Challenge",
    laserSpawns: [
      { time: 500, type: 'horizontal', position: 40, timeToHarmful: 1500, duration: 3000 },
      { time: 1200, type: 'vertical', position: 60, timeToHarmful: 1400, duration: 2900 },
      { time: 2000, type: 'horizontal', position: 70, timeToHarmful: 1300, duration: 2800 },
      { time: 3000, type: 'vertical', position: 35, timeToHarmful: 1600, duration: 3100 },
      { time: 4200, type: 'horizontal', position: 55, timeToHarmful: 1200, duration: 2700 },
      { time: 5800, type: 'vertical', position: 25, timeToHarmful: 1400, duration: 2900 },
      { time: 7500, type: 'horizontal', position: 75, timeToHarmful: 1100, duration: 2600 },
      { time: 9200, type: 'vertical', position: 45, timeToHarmful: 1300, duration: 2800 }
    ],
    enemySpawns: [
      { time: 2000, x: 105, y: 50, direction: 'left', speed: 0.25 },
      { time: 5000, x: -5, y: 30, direction: 'right', speed: 0.23 },
      { time: 10000, x: 105, y: 70, direction: 'left', speed: 0.27 },
      { time: 15000, x: -5, y: 40, direction: 'right', speed: 0.24 },
      { time: 20000, x: 105, y: 60, direction: 'left', speed: 0.26 }
    ],
    duration: 60000,
    difficulty: 'hard'
  }
];

// Generate remaining 17 laser dodge configurations
for (let i = 4; i <= 20; i++) {
  const laserSpawns = [];
  const enemySpawns = [];
  const numLasers = 6 + (i % 4); // 6-9 lasers per game
  const numEnemies = 3 + (i % 3); // 3-5 enemies per game
  
  for (let j = 0; j < numLasers; j++) {
    const time = 1000 + (j * 2000) + ((i * j * 150) % 800);
    const type: 'horizontal' | 'vertical' = (i + j) % 2 === 0 ? 'horizontal' : 'vertical';
    const position = 15 + ((i * 11 + j * 13) % 70);
    const timeToHarmful = 1200 + ((i + j) % 8) * 200;
    const duration = 3000 + ((i * j) % 1500);
    
    laserSpawns.push({ time, type, position, timeToHarmful, duration });
  }
  
  for (let k = 0; k < numEnemies; k++) {
    const time = 2000 + (k * 8000) + ((i * k * 200) % 2000);
    const direction: 'left' | 'right' = (i + k) % 2 === 0 ? 'left' : 'right';
    const x = direction === 'left' ? 105 : -5;
    const y = 20 + ((i * 7 + k * 11) % 60);
    const speed = 0.15 + ((i + k) % 5) * 0.02; // 0.15-0.23
    
    enemySpawns.push({ time, x, y, direction, speed });
  }
  
  LASER_DODGE_RNG_CONFIGS.push({
    id: i,
    name: `Pattern ${i}`,
    laserSpawns,
    enemySpawns,
    duration: 60000,
    difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard'
  });
}

// 20 Sword Slash RNG Configurations
export const SWORD_SLASH_RNG_CONFIGS: SwordSlashRNGConfig[] = [
  {
    id: 1,
    name: "Balanced Assault",
    attackSpawns: [
      { time: 1000, x: 30, y: 40, lifetime: 4000, size: 1.0 },
      { time: 2500, x: 70, y: 60, lifetime: 3800, size: 1.1 },
      { time: 4200, x: 50, y: 25, lifetime: 4200, size: 0.9 },
      { time: 6000, x: 25, y: 75, lifetime: 3600, size: 1.0 },
      { time: 8500, x: 80, y: 30, lifetime: 4000, size: 1.0 },
      { time: 11000, x: 40, y: 80, lifetime: 3400, size: 1.1 },
      { time: 14000, x: 65, y: 45, lifetime: 3800, size: 0.9 },
      { time: 17000, x: 15, y: 55, lifetime: 3200, size: 1.0 }
    ],
    duration: 60000,
    difficulty: 'medium'
  },
  {
    id: 2,
    name: "Corner Strikes",
    attackSpawns: [
      { time: 800, x: 15, y: 15, lifetime: 4500, size: 1.0 },
      { time: 2200, x: 85, y: 15, lifetime: 4300, size: 1.0 },
      { time: 4000, x: 15, y: 85, lifetime: 4100, size: 1.0 },
      { time: 6200, x: 85, y: 85, lifetime: 4400, size: 1.0 },
      { time: 9000, x: 20, y: 20, lifetime: 3800, size: 0.9 },
      { time: 11800, x: 80, y: 20, lifetime: 3600, size: 0.9 },
      { time: 14500, x: 20, y: 80, lifetime: 3400, size: 0.9 },
      { time: 17200, x: 80, y: 80, lifetime: 3200, size: 0.9 }
    ],
    duration: 60000,
    difficulty: 'easy'
  },
  {
    id: 3,
    name: "Rapid Fire",
    attackSpawns: [
      { time: 500, x: 45, y: 35, lifetime: 2800, size: 0.8 },
      { time: 1200, x: 55, y: 65, lifetime: 2600, size: 0.8 },
      { time: 2000, x: 35, y: 55, lifetime: 2400, size: 0.9 },
      { time: 2900, x: 65, y: 45, lifetime: 2700, size: 0.8 },
      { time: 4000, x: 25, y: 35, lifetime: 2500, size: 0.8 },
      { time: 5200, x: 75, y: 65, lifetime: 2300, size: 0.9 },
      { time: 6500, x: 50, y: 50, lifetime: 2200, size: 0.8 },
      { time: 8000, x: 40, y: 70, lifetime: 2100, size: 0.8 }
    ],
    duration: 60000,
    difficulty: 'hard'
  }
];

// Generate remaining 17 sword slash configurations
for (let i = 4; i <= 20; i++) {
  const attackSpawns = [];
  const numAttacks = 7 + (i % 3); // 7-9 attacks per game
  
  for (let j = 0; j < numAttacks; j++) {
    const time = 1000 + (j * 2500) + ((i * j * 200) % 1000);
    const x = 20 + ((i * 7 + j * 11) % 60);
    const y = 25 + ((i * 13 + j * 17) % 50);
    const lifetime = 3000 + ((i + j) % 10) * 200;
    const size = 0.8 + ((i + j) % 5) * 0.1;
    
    attackSpawns.push({ time, x, y, lifetime, size });
  }
  
  SWORD_SLASH_RNG_CONFIGS.push({
    id: i,
    name: `Pattern ${i}`,
    attackSpawns,
    duration: 60000,
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
   * Get Laser Dodge RNG config based on listing ID and attempt number
   */
  static getLaserDodgeConfig(listingId: string, attemptNumber: number): LaserDodgeRNGConfig {
    const listingHash = this.hashString(listingId);
    const baseIndex = listingHash % 20;
    
    // Use different prime offset for laser dodge to ensure variety
    const attemptOffset = (attemptNumber - 1) * 13;
    const configIndex = (baseIndex + attemptOffset) % 20;
    
    return LASER_DODGE_RNG_CONFIGS[configIndex];
  }
  
  /**
   * Get Sword Slash RNG config based on listing ID and attempt number
   */
  static getSwordSlashConfig(listingId: string, attemptNumber: number): SwordSlashRNGConfig {
    const listingHash = this.hashString(listingId);
    const baseIndex = listingHash % 20;
    
    // Use different prime offset for sword slash to ensure variety
    const attemptOffset = (attemptNumber - 1) * 17;
    const configIndex = (baseIndex + attemptOffset) % 20;
    
    return SWORD_SLASH_RNG_CONFIGS[configIndex];
  }
  
  /**
   * Get all 3 RNG configs that will be used for a listing/match
   * Useful for preview or admin purposes
   */
  static getListingRNGPreview(listingId: string): {
    multiTarget: { attempt: number; config: MultiTargetRNGConfig }[];
    fallingObject: { attempt: number; config: FallingObjectRNGConfig }[];
    laserDodge: { attempt: number; config: LaserDodgeRNGConfig }[];
    swordSlash: { attempt: number; config: SwordSlashRNGConfig }[];
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
      ],
      laserDodge: [
        { attempt: 1, config: this.getLaserDodgeConfig(listingId, 1) },
        { attempt: 2, config: this.getLaserDodgeConfig(listingId, 2) },
        { attempt: 3, config: this.getLaserDodgeConfig(listingId, 3) }
      ],
      swordSlash: [
        { attempt: 1, config: this.getSwordSlashConfig(listingId, 1) },
        { attempt: 2, config: this.getSwordSlashConfig(listingId, 2) },
        { attempt: 3, config: this.getSwordSlashConfig(listingId, 3) }
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
      fallingObject: FALLING_OBJECT_RNG_CONFIGS,
      laserDodge: LASER_DODGE_RNG_CONFIGS,
      swordSlash: SWORD_SLASH_RNG_CONFIGS
    };
  }
}
