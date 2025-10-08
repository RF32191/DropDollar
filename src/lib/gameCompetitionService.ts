// Game Competition Service
// Handles multi-entry games, tiebreakers, and competition logic

import DeterministicGameRNG, { GameConfiguration } from './deterministicGameRNG';

export interface GameEntry {
  userId: string;
  listingId: string;
  entryNumber: number; // 1, 2, or 3
  gameType: string;
  score: number;
  completedAt: Date;
  gameConfiguration: GameConfiguration;
}

export interface CompetitionResult {
  listingId: string;
  gameType: string;
  winner: string;
  winningScore: number;
  totalEntries: number;
  tiebreakersUsed: boolean;
  completedAt: Date;
}

export interface TiebreakGame {
  listingId: string;
  tiedUsers: string[];
  gameType: string;
  suddenDeathConfig: GameConfiguration;
  results: { [userId: string]: number };
  winner?: string;
}

export class GameCompetitionService {
  private static gameEntries: Map<string, GameEntry[]> = new Map();
  private static competitionResults: Map<string, CompetitionResult> = new Map();
  private static tiebreakGames: Map<string, TiebreakGame> = new Map();

  // Submit a game entry for a user
  static submitGameEntry(
    userId: string, 
    listingId: string, 
    entryNumber: number, 
    gameType: string, 
    score: number
  ): GameEntry {
    // Get deterministic game configuration
    const gameConfiguration = DeterministicGameRNG.getGameConfiguration(listingId, gameType, entryNumber);
    
    const entry: GameEntry = {
      userId,
      listingId,
      entryNumber,
      gameType,
      score,
      completedAt: new Date(),
      gameConfiguration
    };

    // Store the entry
    const listingKey = `${listingId}-${gameType}`;
    if (!this.gameEntries.has(listingKey)) {
      this.gameEntries.set(listingKey, []);
    }
    
    const entries = this.gameEntries.get(listingKey)!;
    entries.push(entry);
    
    console.log(`📊 Game entry submitted: ${userId} - ${gameType} - Entry ${entryNumber} - Score: ${score}`);
    
    return entry;
  }

  // Get best score for a user in a specific listing
  static getUserBestScore(userId: string, listingId: string, gameType: string): number {
    const listingKey = `${listingId}-${gameType}`;
    const entries = this.gameEntries.get(listingKey) || [];
    
    const userEntries = entries.filter(entry => entry.userId === userId);
    if (userEntries.length === 0) return 0;
    
    return Math.max(...userEntries.map(entry => entry.score));
  }

  // Get all entries for a user in a specific listing
  static getUserEntries(userId: string, listingId: string, gameType: string): GameEntry[] {
    const listingKey = `${listingId}-${gameType}`;
    const entries = this.gameEntries.get(listingKey) || [];
    
    return entries.filter(entry => entry.userId === userId);
  }

  // Ensure user gets different game variations for multiple entries
  static getGameVariationForEntry(listingId: string, gameType: string, entryNumber: number): GameConfiguration {
    // Each entry number gets a different seed, ensuring different game variations
    return DeterministicGameRNG.getGameConfiguration(listingId, gameType, entryNumber);
  }

  // Check if competition is complete and determine winner
  static checkCompetitionComplete(listingId: string, gameType: string): CompetitionResult | null {
    const listingKey = `${listingId}-${gameType}`;
    
    // Check if we already have a result
    if (this.competitionResults.has(listingKey)) {
      return this.competitionResults.get(listingKey)!;
    }

    const entries = this.gameEntries.get(listingKey) || [];
    if (entries.length === 0) return null;

    // Get best score for each user
    const userBestScores: { [userId: string]: number } = {};
    entries.forEach(entry => {
      const currentBest = userBestScores[entry.userId] || 0;
      userBestScores[entry.userId] = Math.max(currentBest, entry.score);
    });

    // Find the highest score
    const scores = Object.values(userBestScores);
    const highestScore = Math.max(...scores);
    
    // Find all users with the highest score
    const winners = Object.keys(userBestScores).filter(
      userId => userBestScores[userId] === highestScore
    );

    let finalWinner: string;
    let tiebreakersUsed = false;

    if (winners.length === 1) {
      // Single winner
      finalWinner = winners[0];
    } else {
      // Tie - initiate sudden death
      console.log(`🏆 Tie detected in ${listingId} - ${gameType}: ${winners.length} users with score ${highestScore}`);
      finalWinner = this.initiateSuddenDeath(listingId, gameType, winners);
      tiebreakersUsed = true;
    }

    const result: CompetitionResult = {
      listingId,
      gameType,
      winner: finalWinner,
      winningScore: highestScore,
      totalEntries: entries.length,
      tiebreakersUsed,
      completedAt: new Date()
    };

    this.competitionResults.set(listingKey, result);
    console.log(`🎉 Competition complete: ${listingId} - Winner: ${finalWinner} - Score: ${highestScore}`);
    
    return result;
  }

  // Initiate sudden death tiebreaker
  private static initiateSuddenDeath(listingId: string, gameType: string, tiedUsers: string[]): string {
    const tiebreakKey = `${listingId}-${gameType}-tiebreak`;
    
    // Generate a special sudden death configuration with higher difficulty
    const suddenDeathConfig = DeterministicGameRNG.getGameConfiguration(
      `${listingId}-SUDDEN-DEATH`, 
      gameType, 
      999 // Special entry number for sudden death
    );

    const tiebreakGame: TiebreakGame = {
      listingId,
      tiedUsers,
      gameType,
      suddenDeathConfig,
      results: {}
    };

    this.tiebreakGames.set(tiebreakKey, tiebreakGame);
    
    console.log(`⚔️ Sudden death initiated for ${listingId} - ${gameType}: ${tiedUsers.join(', ')}`);
    
    // For now, simulate sudden death results (in real implementation, users would play)
    return this.simulateSuddenDeath(tiebreakKey, tiedUsers);
  }

  // Simulate sudden death results (replace with actual game play in production)
  private static simulateSuddenDeath(tiebreakKey: string, tiedUsers: string[]): string {
    const tiebreakGame = this.tiebreakGames.get(tiebreakKey)!;
    
    // Simulate each user playing the sudden death game
    tiedUsers.forEach(userId => {
      // Use deterministic scoring based on user ID to ensure consistency
      const userSeed = this.hashString(userId);
      const score = 50 + (userSeed % 50); // Score between 50-99
      tiebreakGame.results[userId] = score;
    });

    // Find the winner
    const bestScore = Math.max(...Object.values(tiebreakGame.results));
    const winner = Object.keys(tiebreakGame.results).find(
      userId => tiebreakGame.results[userId] === bestScore
    )!;

    tiebreakGame.winner = winner;
    
    console.log(`⚔️ Sudden death results:`, tiebreakGame.results);
    console.log(`🏆 Sudden death winner: ${winner} with score ${bestScore}`);
    
    return winner;
  }

  // Submit sudden death game result
  static submitSuddenDeathResult(listingId: string, gameType: string, userId: string, score: number): boolean {
    const tiebreakKey = `${listingId}-${gameType}-tiebreak`;
    const tiebreakGame = this.tiebreakGames.get(tiebreakKey);
    
    if (!tiebreakGame || !tiebreakGame.tiedUsers.includes(userId)) {
      return false;
    }

    tiebreakGame.results[userId] = score;
    
    // Check if all tied users have submitted their scores
    const allSubmitted = tiebreakGame.tiedUsers.every(user => 
      tiebreakGame.results.hasOwnProperty(user)
    );

    if (allSubmitted) {
      // Determine winner
      const bestScore = Math.max(...Object.values(tiebreakGame.results));
      const winner = Object.keys(tiebreakGame.results).find(
        user => tiebreakGame.results[user] === bestScore
      )!;
      
      tiebreakGame.winner = winner;
      console.log(`⚔️ Sudden death complete: ${winner} wins with score ${bestScore}`);
    }

    return true;
  }

  // Get tiebreak game info
  static getTiebreakGame(listingId: string, gameType: string): TiebreakGame | null {
    const tiebreakKey = `${listingId}-${gameType}-tiebreak`;
    return this.tiebreakGames.get(tiebreakKey) || null;
  }

  // Validate that user entries use different game variations
  static validateEntryVariations(userId: string, listingId: string, gameType: string): boolean {
    const userEntries = this.getUserEntries(userId, listingId, gameType);
    
    if (userEntries.length <= 1) return true;

    // Check that each entry has a different configuration
    const entryNumbers = userEntries.map(entry => entry.entryNumber);
    const uniqueEntryNumbers = new Set(entryNumbers);
    
    return uniqueEntryNumbers.size === entryNumbers.length;
  }

  // Get competition statistics
  static getCompetitionStats(listingId: string, gameType: string): {
    totalEntries: number;
    uniqueUsers: number;
    averageScore: number;
    highestScore: number;
    isComplete: boolean;
    hasTiebreaker: boolean;
  } {
    const listingKey = `${listingId}-${gameType}`;
    const entries = this.gameEntries.get(listingKey) || [];
    const tiebreakKey = `${listingId}-${gameType}-tiebreak`;
    
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        uniqueUsers: 0,
        averageScore: 0,
        highestScore: 0,
        isComplete: false,
        hasTiebreaker: false
      };
    }

    const uniqueUsers = new Set(entries.map(entry => entry.userId)).size;
    const scores = entries.map(entry => entry.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const isComplete = this.competitionResults.has(listingKey);
    const hasTiebreaker = this.tiebreakGames.has(tiebreakKey);

    return {
      totalEntries: entries.length,
      uniqueUsers,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      isComplete,
      hasTiebreaker
    };
  }

  // Utility function to hash string to number
  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Clear all data (for testing)
  static clearAllData(): void {
    this.gameEntries.clear();
    this.competitionResults.clear();
    this.tiebreakGames.clear();
    DeterministicGameRNG.clearConfigurations();
  }

  // Get all entries for a listing (for admin/debugging)
  static getListingEntries(listingId: string, gameType: string): GameEntry[] {
    const listingKey = `${listingId}-${gameType}`;
    return this.gameEntries.get(listingKey) || [];
  }
}

export default GameCompetitionService;
