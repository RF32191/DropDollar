// Game Session Service
// Handles individual game sessions after token payment

export interface GameSession {
  sessionId: string;
  listingId: string;
  tournamentId?: string;
  userId: string;
  username: string;
  gameType: string;
  entryNumber: number; // 1, 2, or 3 for multi-entry
  tokensPaid: number;
  gameConfiguration: any;
  status: 'waiting_to_start' | 'in_progress' | 'completed' | 'abandoned';
  score?: number;
  accuracy?: number;
  reactionTime?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface GameLeaderboard {
  listingId: string;
  tournamentId?: string;
  gameType: string;
  entries: Array<{
    username: string;
    score: number;
    accuracy?: number;
    reactionTime?: number;
    completedAt: Date;
    rank: number;
  }>;
  totalPlayers: number;
  isComplete: boolean;
}

export class GameSessionService {
  private static gameSessions: Map<string, GameSession> = new Map();
  private static userSessions: Map<string, string[]> = new Map(); // userId -> sessionIds

  // Create a new game session after token payment
  static createGameSession(
    listingId: string,
    userId: string,
    username: string,
    gameType: string,
    entryNumber: number,
    tokensPaid: number,
    tournamentId?: string
  ): GameSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get the deterministic game configuration for this listing/entry
    const DeterministicGameRNG = require('./deterministicGameRNG').default;
    const gameConfiguration = DeterministicGameRNG.getGameConfiguration(
      listingId, 
      gameType, 
      entryNumber
    );

    const session: GameSession = {
      sessionId,
      listingId,
      tournamentId,
      userId,
      username,
      gameType,
      entryNumber,
      tokensPaid,
      gameConfiguration,
      status: 'waiting_to_start',
      createdAt: new Date()
    };

    // Store the session
    this.gameSessions.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, []);
    }
    this.userSessions.get(userId)!.push(sessionId);

    console.log(`🎮 Game session created: ${sessionId} - ${username} - ${gameType} - Entry ${entryNumber}`);
    console.log(`💰 Tokens paid: ${tokensPaid} - Listing: ${listingId}`);
    
    return session;
  }

  // Start a game session (when user clicks "Start Game")
  static startGameSession(sessionId: string): boolean {
    const session = this.gameSessions.get(sessionId);
    if (!session || session.status !== 'waiting_to_start') {
      return false;
    }

    session.status = 'in_progress';
    session.startedAt = new Date();
    
    console.log(`🚀 Game session started: ${sessionId} - ${session.username}`);
    return true;
  }

  // Complete a game session with results
  static completeGameSession(
    sessionId: string,
    score: number,
    accuracy?: number,
    reactionTime?: number
  ): boolean {
    const session = this.gameSessions.get(sessionId);
    if (!session || session.status !== 'in_progress') {
      return false;
    }

    session.status = 'completed';
    session.score = score;
    session.accuracy = accuracy;
    session.reactionTime = reactionTime;
    session.completedAt = new Date();

    console.log(`✅ Game session completed: ${sessionId} - ${session.username} - Score: ${score}`);
    
    // Log to competition service for tracking
    const GameCompetitionService = require('./gameCompetitionService').default;
    GameCompetitionService.submitGameEntry(
      session.userId,
      session.listingId,
      session.entryNumber,
      session.gameType,
      score
    );

    return true;
  }

  // Abandon a game session (user leaves without completing)
  static abandonGameSession(sessionId: string): boolean {
    const session = this.gameSessions.get(sessionId);
    if (!session || session.status === 'completed') {
      return false;
    }

    session.status = 'abandoned';
    console.log(`❌ Game session abandoned: ${sessionId} - ${session.username}`);
    return true;
  }

  // Get game session by ID
  static getGameSession(sessionId: string): GameSession | null {
    return this.gameSessions.get(sessionId) || null;
  }

  // Get all sessions for a user
  static getUserSessions(userId: string): GameSession[] {
    const sessionIds = this.userSessions.get(userId) || [];
    return sessionIds
      .map(id => this.gameSessions.get(id))
      .filter(session => session !== undefined) as GameSession[];
  }

  // Get all sessions for a listing
  static getListingSessions(listingId: string): GameSession[] {
    return Array.from(this.gameSessions.values())
      .filter(session => session.listingId === listingId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get all sessions for a tournament
  static getTournamentSessions(tournamentId: string): GameSession[] {
    return Array.from(this.gameSessions.values())
      .filter(session => session.tournamentId === tournamentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Check if user has already played this listing/entry
  static hasUserPlayedEntry(userId: string, listingId: string, entryNumber: number): boolean {
    const userSessions = this.getUserSessions(userId);
    return userSessions.some(session => 
      session.listingId === listingId && 
      session.entryNumber === entryNumber &&
      session.status === 'completed'
    );
  }

  // Get user's remaining entries for a listing (max 3)
  static getUserRemainingEntries(userId: string, listingId: string): number {
    const userSessions = this.getUserSessions(userId);
    const completedEntries = userSessions.filter(session => 
      session.listingId === listingId && 
      session.status === 'completed'
    ).length;
    
    return Math.max(0, 3 - completedEntries);
  }

  // Generate leaderboard for a listing
  static generateLeaderboard(listingId: string, gameType: string): GameLeaderboard {
    const sessions = this.getListingSessions(listingId)
      .filter(session => 
        session.gameType === gameType && 
        session.status === 'completed' &&
        session.score !== undefined
      );

    // Get best score per user
    const userBestScores: Map<string, GameSession> = new Map();
    sessions.forEach(session => {
      const existing = userBestScores.get(session.userId);
      if (!existing || (session.score! > existing.score!)) {
        userBestScores.set(session.userId, session);
      }
    });

    // Create leaderboard entries
    const entries = Array.from(userBestScores.values())
      .sort((a, b) => b.score! - a.score!)
      .map((session, index) => ({
        username: session.username,
        score: session.score!,
        accuracy: session.accuracy,
        reactionTime: session.reactionTime,
        completedAt: session.completedAt!,
        rank: index + 1
      }));

    return {
      listingId,
      gameType,
      entries,
      totalPlayers: userBestScores.size,
      isComplete: false // Will be true when listing closes
    };
  }

  // Generate tournament leaderboard
  static generateTournamentLeaderboard(tournamentId: string, gameType: string): GameLeaderboard {
    const sessions = this.getTournamentSessions(tournamentId)
      .filter(session => 
        session.gameType === gameType && 
        session.status === 'completed' &&
        session.score !== undefined
      );

    // Get best score per user
    const userBestScores: Map<string, GameSession> = new Map();
    sessions.forEach(session => {
      const existing = userBestScores.get(session.userId);
      if (!existing || (session.score! > existing.score!)) {
        userBestScores.set(session.userId, session);
      }
    });

    // Create leaderboard entries
    const entries = Array.from(userBestScores.values())
      .sort((a, b) => b.score! - a.score!)
      .map((session, index) => ({
        username: session.username,
        score: session.score!,
        accuracy: session.accuracy,
        reactionTime: session.reactionTime,
        completedAt: session.completedAt!,
        rank: index + 1
      }));

    return {
      tournamentId,
      gameType,
      entries,
      totalPlayers: userBestScores.size,
      isComplete: false
    };
  }

  // Get session statistics
  static getSessionStatistics(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    abandonedSessions: number;
    averageScore: number;
    topScores: Array<{username: string, score: number, gameType: string}>;
  } {
    const allSessions = Array.from(this.gameSessions.values());
    const totalSessions = allSessions.length;
    const activeSessions = allSessions.filter(s => s.status === 'in_progress').length;
    const completedSessions = allSessions.filter(s => s.status === 'completed').length;
    const abandonedSessions = allSessions.filter(s => s.status === 'abandoned').length;

    const completedWithScores = allSessions.filter(s => s.status === 'completed' && s.score !== undefined);
    const averageScore = completedWithScores.length > 0 
      ? completedWithScores.reduce((sum, s) => sum + s.score!, 0) / completedWithScores.length 
      : 0;

    const topScores = completedWithScores
      .sort((a, b) => b.score! - a.score!)
      .slice(0, 10)
      .map(s => ({
        username: s.username,
        score: s.score!,
        gameType: s.gameType
      }));

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      abandonedSessions,
      averageScore: Math.round(averageScore * 100) / 100,
      topScores
    };
  }

  // Simulate token payment and session creation
  static simulateTokenPayment(
    listingId: string,
    userId: string,
    username: string,
    gameType: string,
    tokenAmount: number = 1,
    tournamentId?: string
  ): GameSession {
    // Determine entry number (1, 2, or 3)
    const remainingEntries = this.getUserRemainingEntries(userId, listingId);
    const entryNumber = 4 - remainingEntries; // Next entry number

    if (remainingEntries <= 0) {
      throw new Error('User has already made maximum entries (3) for this listing');
    }

    console.log(`💳 Token payment processed: ${username} paid ${tokenAmount} tokens for ${gameType}${tournamentId ? ` (Tournament: ${tournamentId})` : ''}`);
    
    return this.createGameSession(
      listingId,
      userId,
      username,
      gameType,
      entryNumber,
      tokenAmount,
      tournamentId
    );
  }

  // Clear all data (for testing)
  static clearAllData(): void {
    this.gameSessions.clear();
    this.userSessions.clear();
  }

  // Get waiting sessions (sessions ready to start)
  static getWaitingSessions(): GameSession[] {
    return Array.from(this.gameSessions.values())
      .filter(session => session.status === 'waiting_to_start')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Check if user can make another entry
  static canUserMakeEntry(userId: string, listingId: string): {
    canEnter: boolean;
    reason: string;
    remainingEntries: number;
  } {
    const remainingEntries = this.getUserRemainingEntries(userId, listingId);
    
    if (remainingEntries <= 0) {
      return {
        canEnter: false,
        reason: 'Maximum entries (3) already made for this listing',
        remainingEntries: 0
      };
    }

    return {
      canEnter: true,
      reason: 'Can make entry',
      remainingEntries
    };
  }

  // Check if user can view leaderboard (must have used all entries or explicitly allowed)
  static canUserViewLeaderboard(userId: string, listingId: string): {
    canView: boolean;
    reason: string;
    remainingEntries: number;
    hasPlayed: boolean;
  } {
    const userSessions = this.getUserSessions(userId);
    const listingSessions = userSessions.filter(session => 
      session.listingId === listingId && 
      session.status === 'completed'
    );
    
    const hasPlayed = listingSessions.length > 0;
    const remainingEntries = this.getUserRemainingEntries(userId, listingId);
    
    if (!hasPlayed) {
      return {
        canView: false,
        reason: 'Must play at least one game to view results',
        remainingEntries,
        hasPlayed: false
      };
    }
    
    if (remainingEntries > 0) {
      return {
        canView: false,
        reason: `You have ${remainingEntries} entries remaining. Use all entries to see the leaderboard.`,
        remainingEntries,
        hasPlayed: true
      };
    }
    
    return {
      canView: true,
      reason: 'All entries used - can view leaderboard',
      remainingEntries: 0,
      hasPlayed: true
    };
  }

  // Get user's best score for a listing
  static getUserBestScoreForListing(userId: string, listingId: string): {
    bestScore: number;
    totalEntries: number;
    scores: number[];
  } {
    const userSessions = this.getUserSessions(userId);
    const listingSessions = userSessions.filter(session => 
      session.listingId === listingId && 
      session.status === 'completed' &&
      session.score !== undefined
    );
    
    const scores = listingSessions.map(session => session.score!);
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    return {
      bestScore,
      totalEntries: listingSessions.length,
      scores
    };
  }
}

export default GameSessionService;
