import { GameInput, AntiCheatAnalysis } from '@/types/gameSession';

export class AntiCheat {
  // Thresholds for detection
  private static readonly MAX_INPUT_RATE = 50; // Inputs per second
  private static readonly MIN_REACTION_TIME = 80; // Milliseconds
  private static readonly MAX_ACCURACY = 99.5; // Percentage
  private static readonly MIN_TIMING_VARIANCE = 10; // Standard deviation in ms
  private static readonly SUSPICION_THRESHOLD = 60; // 0-100 score
  private static readonly BOT_THRESHOLD = 80; // 0-100 score
  
  /**
   * Analyze game inputs for suspicious patterns
   * Returns suspicion score and specific reasons
   */
  static analyze(
    inputs: GameInput[],
    gameType: string,
    duration: number,
    clientScore: number
  ): AntiCheatAnalysis {
    const reasons: string[] = [];
    let suspicionScore = 0;
    
    // Basic validation
    if (inputs.length === 0) {
      return {
        score: 100,
        reasons: ['No inputs provided'],
        isBot: true,
        isSuspicious: true
      };
    }
    
    if (duration <= 0) {
      return {
        score: 100,
        reasons: ['Invalid game duration'],
        isBot: true,
        isSuspicious: true
      };
    }
    
    // Check 1: Input rate (too many inputs = bot)
    const inputRate = (inputs.length / duration) * 1000; // Inputs per second
    if (inputRate > this.MAX_INPUT_RATE) {
      reasons.push(`Excessive input rate: ${inputRate.toFixed(1)}/s (max ${this.MAX_INPUT_RATE}/s)`);
      suspicionScore += 30;
    }
    
    // Check 2: Timing consistency (too consistent = bot)
    const timingAnalysis = this.analyzeTimings(inputs);
    if (timingAnalysis.stdDev < this.MIN_TIMING_VARIANCE && inputs.length > 100) {
      reasons.push(`Suspiciously consistent timing: ${timingAnalysis.stdDev.toFixed(2)}ms std dev`);
      suspicionScore += 25;
    }
    
    // Check 3: Superhuman reaction times
    const avgInterval = timingAnalysis.mean;
    if (avgInterval < this.MIN_REACTION_TIME && avgInterval > 0) {
      reasons.push(`Superhuman reaction time: ${avgInterval.toFixed(0)}ms average`);
      suspicionScore += 40;
    }
    
    // Check 4: Perfect patterns (no human variance)
    const variance = this.calculatePositionalVariance(inputs);
    if (variance < 0.05 && inputs.length > 50) {
      reasons.push('No human variance detected in movements');
      suspicionScore += 25;
    }
    
    // Check 5: Impossible score
    const maxPossibleScore = this.calculateMaxPossibleScore(gameType, duration);
    if (clientScore > maxPossibleScore) {
      reasons.push(`Score exceeds maximum possible: ${clientScore} > ${maxPossibleScore}`);
      suspicionScore += 50;
    }
    
    // Check 6: Too few inputs for score
    const expectedInputs = this.calculateExpectedInputs(gameType, clientScore);
    if (inputs.length < expectedInputs * 0.5) {
      reasons.push(`Too few inputs for score: ${inputs.length} (expected ~${expectedInputs})`);
      suspicionScore += 20;
    }
    
    // Check 7: Identical timing patterns (replay attack)
    if (this.detectReplayAttack(inputs)) {
      reasons.push('Replay attack detected - identical timing pattern');
      suspicionScore += 80;
    }
    
    // Check 8: Impossible physics (teleportation)
    if (this.detectTeleportation(inputs)) {
      reasons.push('Impossible movement detected - teleportation');
      suspicionScore += 60;
    }
    
    return {
      score: Math.min(suspicionScore, 100),
      reasons,
      isBot: suspicionScore >= this.BOT_THRESHOLD,
      isSuspicious: suspicionScore >= this.SUSPICION_THRESHOLD
    };
  }
  
  /**
   * Analyze timing intervals between inputs
   */
  private static analyzeTimings(inputs: GameInput[]): {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    if (inputs.length < 2) {
      return { mean: 0, stdDev: 0, min: 0, max: 0 };
    }
    
    const intervals: number[] = [];
    
    for (let i = 1; i < inputs.length; i++) {
      const interval = inputs[i].timestamp - inputs[i - 1].timestamp;
      if (interval > 0) {
        intervals.push(interval);
      }
    }
    
    if (intervals.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0 };
    }
    
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...intervals);
    const max = Math.max(...intervals);
    
    return { mean, stdDev, min, max };
  }
  
  /**
   * Calculate variance in input positions (movement variance)
   */
  private static calculatePositionalVariance(inputs: GameInput[]): number {
    const positions: Array<{x: number, y: number}> = [];
    
    for (const input of inputs) {
      if (input.data && typeof input.data.x === 'number' && typeof input.data.y === 'number') {
        positions.push({ x: input.data.x, y: input.data.y });
      }
    }
    
    if (positions.length < 2) {
      return 1; // Assume high variance if not enough data
    }
    
    // Calculate movement distances
    const distances: number[] = [];
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      distances.push(distance);
    }
    
    // Calculate coefficient of variation (std dev / mean)
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    if (mean === 0) return 0;
    
    const variance = distances.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / mean; // Coefficient of variation
  }
  
  /**
   * Calculate maximum possible score for a game
   */
  private static calculateMaxPossibleScore(gameType: string, duration: number): number {
    const durationSec = duration / 1000;
    
    switch (gameType) {
      case 'blade_bounce':
        // Max ~150 points per enemy, spawning every 0.3 seconds at peak
        return Math.ceil(durationSec / 0.3) * 150;
      
      case 'multi_target':
        // Max 10 targets visible, respawn instantly, 100ms per click
        return Math.ceil(durationSec / 0.1) * 100;
      
      case 'quick_click':
        // 10 rounds, max 50 points per round
        return 10 * 50;
      
      case 'laser_dodge':
        // Points based on survival time, max ~100 per second
        return durationSec * 100;
      
      case 'cash_stack':
        // Max ~500 items caught
        return 500 * 100;
      
      case 'sword_parry':
        // Max 50 attacks, 100 points each
        return 50 * 100;
      
      default:
        return durationSec * 100; // Default conservative estimate
    }
  }
  
  /**
   * Calculate expected number of inputs for a given score
   */
  private static calculateExpectedInputs(gameType: string, score: number): number {
    switch (gameType) {
      case 'blade_bounce':
        // Need movement + rotation inputs
        return Math.max(score / 10, 50); // At least 50, more for higher scores
      
      case 'multi_target':
        // One click per target
        return score / 100;
      
      case 'quick_click':
        // One click per round
        return 10;
      
      case 'laser_dodge':
        // Constant movement
        return 100;
      
      case 'cash_stack':
        // Constant movement
        return 100;
      
      case 'sword_parry':
        // One click per attack
        return Math.max(score / 100, 10);
      
      default:
        return 50;
    }
  }
  
  /**
   * Detect replay attack (identical timing pattern as previous game)
   */
  private static detectReplayAttack(inputs: GameInput[]): boolean {
    if (inputs.length < 10) return false;
    
    // Check if all timestamps are exact multiples of some value (recorded and replayed)
    const timestamps = inputs.map(i => i.timestamp);
    const gcd = this.calculateGCD(timestamps);
    
    // If all timestamps are exact multiples of a small value, likely replayed
    if (gcd > 1 && gcd < 100) {
      const allMultiples = timestamps.every(t => t % gcd === 0);
      if (allMultiples) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Detect impossible movements (teleportation)
   */
  private static detectTeleportation(inputs: GameInput[]): boolean {
    const moveInputs = inputs.filter(i => 
      i.type === 'move' && 
      typeof i.data?.x === 'number' && 
      typeof i.data?.y === 'number'
    );
    
    if (moveInputs.length < 2) return false;
    
    for (let i = 1; i < moveInputs.length; i++) {
      const prev = moveInputs[i - 1];
      const curr = moveInputs[i];
      
      const timeDiff = curr.timestamp - prev.timestamp;
      if (timeDiff <= 0) continue;
      
      const dx = curr.data.x - prev.data.x;
      const dy = curr.data.y - prev.data.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate speed (units per millisecond)
      const speed = distance / timeDiff;
      
      // If speed is impossibly high (more than screen width in 10ms)
      if (speed > 10) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate greatest common divisor of array of numbers
   */
  private static calculateGCD(numbers: number[]): number {
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };
    
    let result = numbers[0];
    for (let i = 1; i < numbers.length; i++) {
      result = gcd(result, numbers[i]);
      if (result === 1) break;
    }
    
    return result;
  }
}

