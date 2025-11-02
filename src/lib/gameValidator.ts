import { GameInput, GameSubmission, ValidationResult } from '@/types/gameSession';
import { FairRNGService } from './fairRNGService';
import { AntiCheat } from './antiCheat';

export class GameValidator {
  /**
   * Main validation entry point - routes to game-specific validators
   */
  static async validate(
    submission: GameSubmission,
    gameType: string,
    rngSeed: number,
    listingId?: string,
    entryNumber?: number
  ): Promise<ValidationResult> {
    // Run anti-cheat analysis first
    const antiCheatResult = AntiCheat.analyze(
      submission.inputs,
      gameType,
      submission.duration,
      submission.clientScore
    );
    
    // If high suspicion, reject immediately
    if (antiCheatResult.isBot) {
      return {
        valid: false,
        serverScore: 0,
        reason: `Bot detected: ${antiCheatResult.reasons.join(', ')}`,
        suspicionScore: antiCheatResult.score,
        suspicionReasons: antiCheatResult.reasons
      };
    }
    
    // Route to game-specific validator
    let result: ValidationResult;
    
    switch (gameType) {
      case 'blade_bounce':
        result = this.validateBladeBounce(submission, rngSeed);
        break;
      
      case 'multi_target':
        result = this.validateMultiTarget(submission, rngSeed);
        break;
      
      case 'quick_click':
        result = this.validateQuickClick(submission, listingId || '', entryNumber || 1);
        break;
      
      case 'laser_dodge':
        result = this.validateLaserDodge(submission, rngSeed);
        break;
      
      case 'cash_stack':
        result = this.validateCashStack(submission, rngSeed);
        break;
      
      case 'sword_parry':
        result = this.validateSwordParry(submission, listingId || '', entryNumber || 1);
        break;
      
      case 'color_sequence':
        result = this.validateColorSequence(submission, rngSeed);
        break;
      
      case 'falling_objects':
        result = this.validateFallingObjects(submission, rngSeed);
        break;
      
      default:
        return {
          valid: false,
          serverScore: 0,
          reason: `Unknown game type: ${gameType}`
        };
    }
    
    // Add suspicion data to result
    if (antiCheatResult.isSuspicious) {
      result.suspicionScore = antiCheatResult.score;
      result.suspicionReasons = antiCheatResult.reasons;
    }
    
    return result;
  }
  
  /**
   * Validate Blade Bounce game
   */
  static validateBladeBounce(
    submission: GameSubmission,
    rngSeed: number
  ): ValidationResult {
    // For now, accept client score with tolerance
    // TODO: Full replay with enemy spawning and collision detection
    
    const tolerance = 0.15; // 15% tolerance
    const minScore = submission.clientScore * (1 - tolerance);
    const maxScore = submission.clientScore * (1 + tolerance);
    
    // Basic validation: inputs should exist and make sense
    if (submission.inputs.length < 10) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Insufficient inputs for game duration'
      };
    }
    
    // Check duration is reasonable (should be around 60 seconds)
    if (submission.duration < 30000 || submission.duration > 90000) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Invalid game duration'
      };
    }
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: submission.clientAccuracy || 0
    };
  }
  
  /**
   * Validate Multi Target game
   */
  static validateMultiTarget(
    submission: GameSubmission,
    rngSeed: number
  ): ValidationResult {
    // Count click inputs
    const clicks = submission.inputs.filter(i => i.type === 'click');
    
    // Score should be roughly number of successful clicks * points per target
    const expectedScore = clicks.length * 100; // Assuming 100 points per target
    
    // Allow tolerance
    const tolerance = 0.2; // 20%
    if (submission.clientScore > expectedScore * (1 + tolerance)) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Score too high for number of clicks'
      };
    }
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: submission.clientAccuracy || 0
    };
  }
  
  /**
   * Validate Quick Click game
   */
  static validateQuickClick(
    submission: GameSubmission,
    listingId: string,
    entryNumber: number
  ): ValidationResult {
    // Get deterministic config
    const config = FairRNGService.getQuickClickConfig(listingId, entryNumber);
    
    if (!config || !config.rounds) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Missing RNG configuration'
      };
    }
    
    // Should have exactly 10 click inputs
    const clicks = submission.inputs.filter(i => i.type === 'click');
    
    if (clicks.length !== 10) {
      return {
        valid: false,
        serverScore: 0,
        reason: `Expected 10 clicks, got ${clicks.length}`
      };
    }
    
    // Validate each round
    let totalScore = 0;
    
    for (let i = 0; i < config.rounds.length; i++) {
      const round = config.rounds[i];
      const click = clicks[i];
      
      if (!click || !click.data) {
        continue;
      }
      
      const reactionTime = click.data.reactionTime || 0;
      
      // Check reaction time is reasonable
      if (reactionTime < 50) {
        return {
          valid: false,
          serverScore: 0,
          reason: `Impossible reaction time: ${reactionTime}ms`
        };
      }
      
      // Calculate score for this round (faster = more points)
      const roundScore = Math.max(0, 50 - Math.floor(reactionTime / 10));
      totalScore += roundScore;
      
      // Check for bonus target
      if (round.bonusTarget && click.data.hitBonus) {
        totalScore += 10;
      }
    }
    
    // Allow small tolerance
    const tolerance = 50; // ±50 points
    if (Math.abs(submission.clientScore - totalScore) > tolerance) {
      return {
        valid: false,
        serverScore: 0,
        reason: `Score mismatch: client ${submission.clientScore}, server ${totalScore}`
      };
    }
    
    return {
      valid: true,
      serverScore: totalScore,
      accuracy: 100
    };
  }
  
  /**
   * Validate Laser Dodge game
   */
  static validateLaserDodge(
    submission: GameSubmission,
    rngSeed: number
  ): ValidationResult {
    // Check duration (survival time = score)
    const survivalTime = submission.duration / 1000; // Convert to seconds
    
    // Score should be based on survival time
    const expectedScore = Math.floor(survivalTime * 10); // 10 points per second
    
    const tolerance = 0.15;
    if (Math.abs(submission.clientScore - expectedScore) > expectedScore * tolerance) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Score does not match survival time'
      };
    }
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: 100
    };
  }
  
  /**
   * Validate Cash Stack game
   */
  static validateCashStack(
    submission: GameSubmission,
    rngSeed: number
  ): ValidationResult {
    // Check inputs exist
    if (submission.inputs.length < 50) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Insufficient inputs'
      };
    }
    
    // For now, accept with tolerance
    // TODO: Full replay with falling object physics
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: submission.clientAccuracy || 0
    };
  }
  
  /**
   * Validate Sword Parry game
   */
  static validateSwordParry(
    submission: GameSubmission,
    listingId: string,
    entryNumber: number
  ): ValidationResult {
    // Get deterministic config
    const config = FairRNGService.getSwordSlashConfig(listingId, entryNumber);
    
    if (!config || !config.attackSpawns) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Missing RNG configuration'
      };
    }
    
    // Count successful parries
    const clicks = submission.inputs.filter(i => i.type === 'click');
    
    // Each successful parry = 100 points
    const maxPossibleScore = config.attackSpawns.length * 100;
    
    if (submission.clientScore > maxPossibleScore) {
      return {
        valid: false,
        serverScore: 0,
        reason: `Score exceeds maximum: ${submission.clientScore} > ${maxPossibleScore}`
      };
    }
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: submission.clientAccuracy || 0
    };
  }
  
  /**
   * Validate Color Sequence game
   */
  static validateColorSequence(
    submission: GameSubmission,
    rngSeed: number
  ): ValidationResult {
    // Check for reasonable number of inputs
    const clicks = submission.inputs.filter(i => i.type === 'click');
    
    // Color sequence has levels, each with increasing length
    // Score is based on level reached
    const expectedClicks = Math.floor(submission.clientScore / 10);
    
    const tolerance = 0.3; // 30% tolerance
    if (clicks.length < expectedClicks * (1 - tolerance)) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Too few clicks for reported score'
      };
    }
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: 100
    };
  }
  
  /**
   * Validate Falling Objects game
   */
  static validateFallingObjects(
    submission: GameSubmission,
    rngSeed: number
  ): ValidationResult {
    // Check for movement inputs
    const moves = submission.inputs.filter(i => i.type === 'move');
    
    if (moves.length < 50) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Insufficient movement inputs'
      };
    }
    
    // Validate duration
    if (submission.duration < 30000 || submission.duration > 90000) {
      return {
        valid: false,
        serverScore: 0,
        reason: 'Invalid game duration'
      };
    }
    
    return {
      valid: true,
      serverScore: Math.round(submission.clientScore),
      accuracy: submission.clientAccuracy || 0
    };
  }
}

