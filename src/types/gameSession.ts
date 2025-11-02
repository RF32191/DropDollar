// Game Session Types for Anti-Cheat System

export interface GameToken {
  sessionId: string;
  userId: string;
  gameType: string;
  rngSeed: number;
  listingId?: string;
  entryNumber?: number;
  timestamp: number;
  expiresAt: number;
}

export interface GameInput {
  timestamp: number;  // Milliseconds from game start
  type: string;       // 'click', 'move', 'rotate', etc.
  data: any;          // Input-specific data
}

// Blade Bounce specific inputs
export interface BladeBounceInput extends GameInput {
  type: 'move' | 'rotate';
  data: {
    x?: number;       // Sword X position (0-100)
    y?: number;       // Sword Y position (0-100)
    angle?: number;   // Sword rotation angle
  };
}

// Multi Target specific inputs
export interface MultiTargetInput extends GameInput {
  type: 'click';
  data: {
    x: number;
    y: number;
    targetId?: string;
  };
}

// Quick Click specific inputs
export interface QuickClickInput extends GameInput {
  type: 'click';
  data: {
    round: number;
    reactionTime: number;
  };
}

// Laser Dodge specific inputs
export interface LaserDodgeInput extends GameInput {
  type: 'move';
  data: {
    x: number;
    y: number;
  };
}

// Cash Stack specific inputs
export interface CashStackInput extends GameInput {
  type: 'move';
  data: {
    x: number;
    y: number;
  };
}

// Sword Parry specific inputs
export interface SwordParryInput extends GameInput {
  type: 'click' | 'miss';
  data: {
    x?: number;
    y?: number;
    targetId?: string;
    reactionTime?: number;
  };
}

export interface GameSubmission {
  sessionId: string;
  token: string;
  inputs: GameInput[];
  clientScore: number;    // For comparison only
  clientAccuracy?: number; // For comparison only
  duration: number;       // Game duration in ms
  gameSpecificData?: any; // Any additional game-specific data
}

export interface ValidationResult {
  valid: boolean;
  serverScore: number;
  accuracy?: number;
  avgReactionTime?: number;
  reason?: string;
  suspicionScore?: number;
  suspicionReasons?: string[];
}

export interface GameSession {
  sessionId: string;
  token: string;
  rngSeed: number;
  expiresAt: number;
  gameType: string;
  listingId?: string;
  entryNumber?: number;
}

export interface AntiCheatAnalysis {
  score: number;        // 0-100, higher = more suspicious
  reasons: string[];
  isBot: boolean;
  isSuspicious: boolean;
}

