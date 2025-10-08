// Daily Tournament Game Assignment Service
// Assigns specific games to tournament slots that change daily

export interface TournamentGameAssignment {
  tournamentId: string;
  slotNumber: number;
  gameType: string;
  gameName: string;
  assignedDate: string; // YYYY-MM-DD format
  isActive: boolean;
}

export interface DailyTournamentSchedule {
  date: string;
  assignments: TournamentGameAssignment[];
  generatedAt: Date;
}

export class DailyTournamentGameService {
  private static readonly AVAILABLE_GAMES = [
    { id: 'multi-target', name: 'Multi-Target Reaction', emoji: '🎪' },
    { id: 'falling-objects', name: 'Falling Object Catch', emoji: '🏀' },
    { id: 'color-sequence', name: 'Color Sequence', emoji: '🌈' }
  ];

  private static readonly TOURNAMENT_CONFIGS = [
    { id: 'micro-10', name: '$10 Micro Tournament', maxSlots: 10 },
    { id: 'starter-100', name: 'Starter Tournament', maxSlots: 10 },
    { id: 'intermediate-500', name: 'Intermediate Tournament', maxSlots: 5 },
    { id: 'advanced-2500', name: 'Advanced Tournament', maxSlots: 5 },
    { id: 'elite-25000', name: 'Elite Championship', maxSlots: 2 }
  ];

  private static dailySchedules: Map<string, DailyTournamentSchedule> = new Map();

  // Generate daily game assignments for all tournaments
  static generateDailyAssignments(date?: Date): DailyTournamentSchedule {
    const targetDate = date || new Date();
    const dateString = this.formatDate(targetDate);

    // Check if we already have assignments for this date
    if (this.dailySchedules.has(dateString)) {
      return this.dailySchedules.get(dateString)!;
    }

    console.log(`🎮 Generating daily tournament games for ${dateString}`);

    const assignments: TournamentGameAssignment[] = [];
    
    // Create seeded random generator for this date
    const seed = this.generateDateSeed(dateString);
    const rng = this.seededRandom(seed);

    // Assign games to each tournament slot
    this.TOURNAMENT_CONFIGS.forEach(tournament => {
      for (let slot = 1; slot <= tournament.maxSlots; slot++) {
        // Randomly select a game for this slot
        const gameIndex = Math.floor(rng() * this.AVAILABLE_GAMES.length);
        const selectedGame = this.AVAILABLE_GAMES[gameIndex];

        assignments.push({
          tournamentId: tournament.id,
          slotNumber: slot,
          gameType: selectedGame.id,
          gameName: selectedGame.name,
          assignedDate: dateString,
          isActive: true
        });
      }
    });

    const schedule: DailyTournamentSchedule = {
      date: dateString,
      assignments,
      generatedAt: new Date()
    };

    this.dailySchedules.set(dateString, schedule);
    
    console.log(`✅ Generated ${assignments.length} tournament game assignments for ${dateString}`);
    return schedule;
  }

  // Get game assignment for specific tournament slot
  static getGameForTournamentSlot(tournamentId: string, slotNumber: number, date?: Date): TournamentGameAssignment | null {
    const targetDate = date || new Date();
    const dateString = this.formatDate(targetDate);
    
    // Ensure we have assignments for this date
    const schedule = this.generateDailyAssignments(targetDate);
    
    return schedule.assignments.find(
      assignment => 
        assignment.tournamentId === tournamentId && 
        assignment.slotNumber === slotNumber &&
        assignment.assignedDate === dateString
    ) || null;
  }

  // Get all games for a tournament on a specific date
  static getGamesForTournament(tournamentId: string, date?: Date): TournamentGameAssignment[] {
    const targetDate = date || new Date();
    const dateString = this.formatDate(targetDate);
    
    const schedule = this.generateDailyAssignments(targetDate);
    
    return schedule.assignments.filter(
      assignment => 
        assignment.tournamentId === tournamentId &&
        assignment.assignedDate === dateString
    );
  }

  // Get current available slot for a tournament
  static getNextAvailableSlot(tournamentId: string, date?: Date): TournamentGameAssignment | null {
    const games = this.getGamesForTournament(tournamentId, date);
    
    // Mock: Return first available slot (in real app, check against actual entries)
    return games.find(game => game.isActive) || null;
  }

  // Get tournament configuration
  static getTournamentConfig(tournamentId: string) {
    return this.TOURNAMENT_CONFIGS.find(config => config.id === tournamentId);
  }

  // Get game info by ID
  static getGameInfo(gameId: string) {
    return this.AVAILABLE_GAMES.find(game => game.id === gameId);
  }

  // Get all tournament assignments for today
  static getTodaysAssignments(): DailyTournamentSchedule {
    return this.generateDailyAssignments();
  }

  // Get assignments for multiple days (for preview)
  static getAssignmentsForDateRange(startDate: Date, days: number): DailyTournamentSchedule[] {
    const schedules: DailyTournamentSchedule[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      schedules.push(this.generateDailyAssignments(date));
    }
    
    return schedules;
  }

  // Mark a slot as won (no longer available)
  static markSlotAsWon(tournamentId: string, slotNumber: number, date?: Date): boolean {
    const targetDate = date || new Date();
    const dateString = this.formatDate(targetDate);
    
    const schedule = this.dailySchedules.get(dateString);
    if (!schedule) return false;

    const assignment = schedule.assignments.find(
      a => a.tournamentId === tournamentId && a.slotNumber === slotNumber
    );

    if (assignment) {
      assignment.isActive = false;
      console.log(`🏆 Slot ${slotNumber} won in ${tournamentId} - ${assignment.gameName}`);
      return true;
    }

    return false;
  }

  // Get tournament statistics
  static getTournamentStats(tournamentId: string, date?: Date): {
    totalSlots: number;
    availableSlots: number;
    wonSlots: number;
    gameBreakdown: { [gameType: string]: number };
  } {
    const games = this.getGamesForTournament(tournamentId, date);
    const totalSlots = games.length;
    const availableSlots = games.filter(g => g.isActive).length;
    const wonSlots = totalSlots - availableSlots;

    const gameBreakdown: { [gameType: string]: number } = {};
    games.forEach(game => {
      gameBreakdown[game.gameType] = (gameBreakdown[game.gameType] || 0) + 1;
    });

    return {
      totalSlots,
      availableSlots,
      wonSlots,
      gameBreakdown
    };
  }

  // Utility functions
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private static generateDateSeed(dateString: string): number {
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      const char = dateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static seededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 1664525 + 1013904223) % 4294967296;
      return current / 4294967296;
    };
  }

  // Clear all data (for testing)
  static clearAllData(): void {
    this.dailySchedules.clear();
  }

  // Preview tomorrow's assignments
  static previewTomorrowsGames(): DailyTournamentSchedule {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.generateDailyAssignments(tomorrow);
  }
}

export default DailyTournamentGameService;
