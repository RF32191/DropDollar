// Game Engine with Timer Management and RNG Systems
// Handles both practice mode (random) and competition mode (deterministic)

export interface GameTimer {
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface GameRNG {
  seed?: number;
  isPractice: boolean;
  listingId?: string;
  entryNumber?: number;
}

export interface GameEngineConfig {
  gameType: string;
  totalTime: number;
  rng: GameRNG;
  onTimerUpdate?: (timer: GameTimer) => void;
  onGameEnd?: () => void;
}

export class GameEngine {
  private timer: GameTimer;
  private timerInterval: NodeJS.Timeout | null = null;
  private rng: () => number;
  private config: GameEngineConfig;
  private lastTickTime: number = 0;

  constructor(config: GameEngineConfig) {
    this.config = config;
    this.timer = {
      timeLeft: config.totalTime,
      totalTime: config.totalTime,
      isRunning: false,
      isPaused: false
    };

    // Initialize RNG based on mode
    if (config.rng.isPractice) {
      // Practice mode: truly random
      this.rng = () => Math.random();
    } else if (config.rng.seed) {
      // Competition mode with direct seed (1-20 from session)
      console.log(`🎲 [GameEngine] Using direct seed: ${config.rng.seed}`);
      this.rng = this.seededRandom(config.rng.seed);
    } else {
      // Competition mode: deterministic based on listing (fallback)
      const seed = this.generateSeed(config.rng.listingId!, config.rng.entryNumber || 1);
      console.log(`🎲 [GameEngine] Generated seed from listing: ${seed}`);
      this.rng = this.seededRandom(seed);
    }
  }

  // Start the game timer
  startTimer(): void {
    if (this.timer.isRunning) return;

    this.timer.isRunning = true;
    this.timer.isPaused = false;
    this.lastTickTime = Date.now();

    // Use setInterval for reliable 1-second countdown
    this.timerInterval = setInterval(() => {
      if (!this.timer.isRunning || this.timer.isPaused) {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        return;
      }

      this.timer.timeLeft = Math.max(0, this.timer.timeLeft - 1);

      // Notify listeners
      if (this.config.onTimerUpdate) {
        this.config.onTimerUpdate({ ...this.timer });
      }

      // Check if time is up
      if (this.timer.timeLeft <= 0) {
        this.stopTimer();
        if (this.config.onGameEnd) {
          this.config.onGameEnd();
        }
      }
    }, 1000);
  }

  // Stop the timer
  stopTimer(): void {
    this.timer.isRunning = false;
    this.timer.isPaused = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Pause the timer
  pauseTimer(): void {
    this.timer.isPaused = true;
  }

  // Resume the timer
  resumeTimer(): void {
    if (this.timer.isRunning) {
      this.timer.isPaused = false;
      this.lastTickTime = Date.now();
      this.startTimer(); // Restart the tick loop
    }
  }

  // Get current timer state
  getTimer(): GameTimer {
    return { ...this.timer };
  }

  // Get random number (0-1)
  random(): number {
    return this.rng();
  }

  // Get random integer between min and max (inclusive)
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Get random float between min and max
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  // Get random element from array
  randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  // Shuffle array (Fisher-Yates)
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Generate deterministic seed from listing info
  private generateSeed(listingId: string, entryNumber: number): number {
    let hash = 0;
    const str = `${listingId}-${entryNumber}-${this.config.gameType}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  // Seeded random number generator (Linear Congruential Generator)
  private seededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 1664525 + 1013904223) % 4294967296;
      return current / 4294967296;
    };
  }

  // Reset the game engine
  reset(): void {
    this.stopTimer();
    this.timer = {
      timeLeft: this.config.totalTime,
      totalTime: this.config.totalTime,
      isRunning: false,
      isPaused: false
    };
  }

  // Cleanup
  destroy(): void {
    this.stopTimer();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

// Hook for React components
export function useGameEngine(config: GameEngineConfig) {
  const [timer, setTimer] = React.useState<GameTimer>({
    timeLeft: config.totalTime,
    totalTime: config.totalTime,
    isRunning: false,
    isPaused: false
  });

  const engineRef = React.useRef<GameEngine | null>(null);

  React.useEffect(() => {
    // Create engine with timer update callback
    const engineConfig = {
      ...config,
      onTimerUpdate: (newTimer: GameTimer) => {
        setTimer({ ...newTimer });
        if (config.onTimerUpdate) {
          config.onTimerUpdate(newTimer);
        }
      }
    };

    engineRef.current = new GameEngine(engineConfig);

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []); // Only create once

  return {
    engine: engineRef.current!,
    timer,
    startGame: () => engineRef.current?.startTimer(),
    stopGame: () => engineRef.current?.stopTimer(),
    pauseGame: () => engineRef.current?.pauseTimer(),
    resumeGame: () => engineRef.current?.resumeTimer(),
    resetGame: () => {
      if (engineRef.current) {
        engineRef.current.reset();
        setTimer(engineRef.current.getTimer());
      }
    }
  };
}

// Import React for the hook
import React from 'react';
