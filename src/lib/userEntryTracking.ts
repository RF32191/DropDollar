/**
 * Service for tracking user entries (game attempts) per listing
 */

export interface UserEntry {
  userId: string;
  listingId: string;
  entryNumber: number; // 1, 2, or 3
  score: number; // PRIVATE: Only visible to the user who earned it
  timestamp: string;
  gameType: string;
  amountPaid: number; // Always $1
}

export interface UserListingStats {
  userId: string;
  listingId: string;
  totalEntries: number; // How many times they've paid
  totalAmountPaid: number; // Total dollars spent
  bestScore: number;
  entries: UserEntry[];
  remainingAttempts: number; // 3 - totalEntries
}

class UserEntryTrackingService {
  private readonly STORAGE_KEY = 'user_listing_entries';
  private readonly MAX_ENTRIES_PER_LISTING = 3;

  /**
   * Get all user entries from localStorage
   */
  private getUserEntries(): UserEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading user entries:', error);
      return [];
    }
  }

  /**
   * Save user entries to localStorage
   */
  private saveUserEntries(entries: UserEntry[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving user entries:', error);
    }
  }

  /**
   * Record a new user entry (game attempt)
   */
  recordEntry(
    userId: string,
    listingId: string,
    score: number,
    gameType: string
  ): UserEntry | null {
    const entries = this.getUserEntries();
    
    // Check how many entries this user already has for this listing
    const userListingEntries = entries.filter(
      entry => entry.userId === userId && entry.listingId === listingId
    );

    if (userListingEntries.length >= this.MAX_ENTRIES_PER_LISTING) {
      console.warn(`User ${userId} has already made maximum entries for listing ${listingId}`);
      return null;
    }

    const newEntry: UserEntry = {
      userId,
      listingId,
      entryNumber: userListingEntries.length + 1,
      score,
      timestamp: new Date().toISOString(),
      gameType,
      amountPaid: 1 // Always $1 per entry
    };

    entries.push(newEntry);
    this.saveUserEntries(entries);

    return newEntry;
  }

  /**
   * Get user's stats for a specific listing
   */
  getUserListingStats(userId: string, listingId: string): UserListingStats {
    const entries = this.getUserEntries();
    const userListingEntries = entries.filter(
      entry => entry.userId === userId && entry.listingId === listingId
    );

    const totalEntries = userListingEntries.length;
    const totalAmountPaid = totalEntries * 1; // $1 per entry
    const bestScore = userListingEntries.length > 0 
      ? Math.max(...userListingEntries.map(e => e.score))
      : 0;
    const remainingAttempts = Math.max(0, this.MAX_ENTRIES_PER_LISTING - totalEntries);

    return {
      userId,
      listingId,
      totalEntries,
      totalAmountPaid,
      bestScore,
      entries: userListingEntries.sort((a, b) => a.entryNumber - b.entryNumber),
      remainingAttempts
    };
  }

  /**
   * Check if user can make another entry for a listing
   */
  canUserMakeEntry(userId: string, listingId: string): boolean {
    const stats = this.getUserListingStats(userId, listingId);
    return stats.remainingAttempts > 0;
  }

  /**
   * Get all user's entries across all listings
   */
  getUserAllEntries(userId: string): UserEntry[] {
    const entries = this.getUserEntries();
    return entries.filter(entry => entry.userId === userId);
  }

  /**
   * Get all entries for a specific listing (all users) - PRIVATE METHOD
   * Only used internally for revenue calculation, never exposes individual scores
   */
  private getListingAllEntries(listingId: string): UserEntry[] {
    const entries = this.getUserEntries();
    return entries.filter(entry => entry.listingId === listingId);
  }

  /**
   * Get user's total spending across all listings
   */
  getUserTotalSpending(userId: string): number {
    const userEntries = this.getUserAllEntries(userId);
    return userEntries.reduce((total, entry) => total + entry.amountPaid, 0);
  }

  /**
   * Get listing's total revenue from all users
   */
  getListingRevenue(listingId: string): number {
    const listingEntries = this.getListingAllEntries(listingId);
    return listingEntries.reduce((total, entry) => total + entry.amountPaid, 0);
  }

  /**
   * Clear all entries (for testing/reset)
   */
  clearAllEntries(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get safe aggregate statistics for a listing (no individual scores exposed)
   */
  getListingAggregateStats(listingId: string): {
    totalParticipants: number;
    totalEntries: number;
    totalRevenue: number;
    averageEntriesPerUser: number;
  } {
    const entries = this.getListingAllEntries(listingId);
    const uniqueUsers = new Set(entries.map(entry => entry.userId));
    
    return {
      totalParticipants: uniqueUsers.size,
      totalEntries: entries.length,
      totalRevenue: entries.reduce((sum, entry) => sum + entry.amountPaid, 0),
      averageEntriesPerUser: uniqueUsers.size > 0 ? entries.length / uniqueUsers.size : 0
    };
  }

  /**
   * Check if a specific user has participated in a listing (for UI purposes only)
   * Does NOT expose their scores or performance
   */
  hasUserParticipated(userId: string, listingId: string): boolean {
    const userStats = this.getUserListingStats(userId, listingId);
    return userStats.totalEntries > 0;
  }
}

export const userEntryTrackingService = new UserEntryTrackingService();
export default userEntryTrackingService;
