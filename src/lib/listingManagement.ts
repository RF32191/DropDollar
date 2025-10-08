// Listing Management System - Handles base price thresholds and countdown transitions

export interface ListingEntry {
  userId: string;
  listingId: string;
  coinsUsed: number; // 1-3 coins per entry
  entryTime: Date;
  hasPlayedGame: boolean;
  gameScore?: number;
}

export interface ListingStatus {
  id: string;
  basePrice: number;
  totalCoinsCollected: number;
  participantCount: number;
  basePriceMet: boolean;
  status: 'waiting_for_base_price' | 'timer_active' | 'ended';
  timerStartTime?: Date;
  timerDuration: number; // in minutes
  entries: ListingEntry[];
}

export class ListingManagementService {
  // Mock storage - in production, this would be a database
  private static listings: Map<string, ListingStatus> = new Map();
  
  /**
   * Initialize a listing with base price threshold
   */
  static initializeListing(
    listingId: string, 
    basePrice: number, 
    timerDuration: number = 1440 // 24 hours default
  ): void {
    const listingStatus: ListingStatus = {
      id: listingId,
      basePrice,
      totalCoinsCollected: 0,
      participantCount: 0,
      basePriceMet: false,
      status: 'waiting_for_base_price',
      timerDuration,
      entries: []
    };
    
    this.listings.set(listingId, listingStatus);
    console.log(`📋 Listing ${listingId} initialized - needs ${basePrice} coins to start timer`);
  }

  /**
   * Process entry for a regular listing
   */
  static async processListingEntry(
    userId: string,
    listingId: string,
    coinsUsed: number // 1-3 coins
  ): Promise<{ 
    success: boolean; 
    error?: string; 
    basePriceMet?: boolean; 
    timerStarted?: boolean;
    totalCollected?: number;
  }> {
    
    const listing = this.listings.get(listingId);
    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    // Check if user already has entries for this listing
    const userEntries = listing.entries.filter(entry => entry.userId === userId);
    if (userEntries.length >= 3) {
      return { success: false, error: 'Maximum 3 entries per listing reached' };
    }

    // Validate coin amount
    if (coinsUsed < 1 || coinsUsed > 3) {
      return { success: false, error: 'Must use 1-3 coins per entry' };
    }

    // Check if adding this entry would exceed 3 total entries for user
    if (userEntries.length + 1 > 3) {
      return { success: false, error: 'This entry would exceed your 3-entry limit' };
    }

    try {
      // Create new entry
      const newEntry: ListingEntry = {
        userId,
        listingId,
        coinsUsed,
        entryTime: new Date(),
        hasPlayedGame: false
      };

      // Add entry to listing
      listing.entries.push(newEntry);
      listing.totalCoinsCollected += coinsUsed;
      listing.participantCount = new Set(listing.entries.map(e => e.userId)).size;

      // Check if base price is now met
      const wasBasePriceMet = listing.basePriceMet;
      listing.basePriceMet = listing.totalCoinsCollected >= listing.basePrice;

      let timerStarted = false;

      // Start timer if base price just got met
      if (!wasBasePriceMet && listing.basePriceMet) {
        listing.status = 'timer_active';
        listing.timerStartTime = new Date();
        timerStarted = true;
        
        console.log(`⏰ TIMER STARTED for listing ${listingId}!`);
        console.log(`💰 Base price met: ${listing.totalCoinsCollected}/${listing.basePrice} coins`);
        console.log(`👥 ${listing.participantCount} participants can now compete`);
        
        // In production, you'd trigger notifications to all participants here
        this.notifyParticipants(listingId, 'timer_started');
      }

      // Update storage
      this.listings.set(listingId, listing);

      return {
        success: true,
        basePriceMet: listing.basePriceMet,
        timerStarted,
        totalCollected: listing.totalCoinsCollected
      };

    } catch (error) {
      console.error('Listing entry error:', error);
      return { success: false, error: 'Entry processing failed' };
    }
  }

  /**
   * Get listing status and progress
   */
  static getListingStatus(listingId: string): {
    exists: boolean;
    basePrice: number;
    totalCoinsCollected: number;
    basePriceMet: boolean;
    participantCount: number;
    status: string;
    timeRemaining?: number; // minutes
    canEnter: boolean;
    progressPercentage: number;
  } {
    const listing = this.listings.get(listingId);
    
    if (!listing) {
      return {
        exists: false,
        basePrice: 0,
        totalCoinsCollected: 0,
        basePriceMet: false,
        participantCount: 0,
        status: 'not_found',
        canEnter: false,
        progressPercentage: 0
      };
    }

    let timeRemaining: number | undefined;
    let canEnter = listing.status !== 'ended';

    // Calculate time remaining if timer is active
    if (listing.status === 'timer_active' && listing.timerStartTime) {
      const now = new Date();
      const elapsed = now.getTime() - listing.timerStartTime.getTime();
      const elapsedMinutes = Math.floor(elapsed / (1000 * 60));
      timeRemaining = Math.max(0, listing.timerDuration - elapsedMinutes);
      
      // Check if timer has expired
      if (timeRemaining <= 0) {
        listing.status = 'ended';
        canEnter = false;
        this.listings.set(listingId, listing);
      }
    }

    const progressPercentage = Math.min(100, (listing.totalCoinsCollected / listing.basePrice) * 100);

    return {
      exists: true,
      basePrice: listing.basePrice,
      totalCoinsCollected: listing.totalCoinsCollected,
      basePriceMet: listing.basePriceMet,
      participantCount: listing.participantCount,
      status: listing.status,
      timeRemaining,
      canEnter,
      progressPercentage
    };
  }

  /**
   * Get user's entries for a specific listing
   */
  static getUserListingEntries(userId: string, listingId: string): {
    entries: ListingEntry[];
    totalCoinsUsed: number;
    canEnterMore: boolean;
    remainingEntries: number;
  } {
    const listing = this.listings.get(listingId);
    
    if (!listing) {
      return {
        entries: [],
        totalCoinsUsed: 0,
        canEnterMore: false,
        remainingEntries: 0
      };
    }

    const userEntries = listing.entries.filter(entry => entry.userId === userId);
    const totalCoinsUsed = userEntries.reduce((sum, entry) => sum + entry.coinsUsed, 0);
    const remainingEntries = Math.max(0, 3 - userEntries.length);
    const canEnterMore = remainingEntries > 0 && listing.status !== 'ended';

    return {
      entries: userEntries,
      totalCoinsUsed,
      canEnterMore,
      remainingEntries
    };
  }

  /**
   * Record game score for user (hidden until they complete)
   */
  static recordGameScore(
    userId: string, 
    listingId: string, 
    score: number
  ): { success: boolean; error?: string } {
    const listing = this.listings.get(listingId);
    
    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    // Find user's best entry (they might have multiple entries)
    const userEntries = listing.entries.filter(entry => entry.userId === userId);
    
    if (userEntries.length === 0) {
      return { success: false, error: 'No entries found for this user' };
    }

    // Record score on their best entry or first unplayed entry
    let entryToUpdate = userEntries.find(entry => !entry.hasPlayedGame);
    
    if (!entryToUpdate) {
      // All entries have been played, update the one with lowest score
      entryToUpdate = userEntries.reduce((lowest, current) => 
        (current.gameScore || 0) < (lowest.gameScore || 0) ? current : lowest
      );
    }

    entryToUpdate.gameScore = score;
    entryToUpdate.hasPlayedGame = true;

    // Update storage
    this.listings.set(listingId, listing);

    console.log(`🎮 Score recorded for user ${userId} in listing ${listingId}: ${score} (hidden)`);
    
    return { success: true };
  }

  /**
   * Notify participants about listing events
   */
  private static notifyParticipants(listingId: string, event: string): void {
    const listing = this.listings.get(listingId);
    if (!listing) return;

    const participantIds = [...new Set(listing.entries.map(e => e.userId))];
    
    // In production, this would send real notifications
    console.log(`📢 Notifying ${participantIds.length} participants about ${event} for listing ${listingId}`);
    
    switch (event) {
      case 'timer_started':
        console.log(`🎮 Game competition can now begin! Timer: ${listing.timerDuration} minutes`);
        break;
      case 'timer_ending':
        console.log(`⏰ Competition ending soon!`);
        break;
      case 'competition_ended':
        console.log(`🏁 Competition ended - determining winner...`);
        break;
    }
  }

  /**
   * Get all active listings summary
   */
  static getActiveListingsSummary(): {
    waitingForBasePrice: number;
    timerActive: number;
    totalParticipants: number;
    totalCoinsCollected: number;
  } {
    let waitingForBasePrice = 0;
    let timerActive = 0;
    let totalParticipants = 0;
    let totalCoinsCollected = 0;

    for (const listing of this.listings.values()) {
      if (listing.status === 'waiting_for_base_price') {
        waitingForBasePrice++;
      } else if (listing.status === 'timer_active') {
        timerActive++;
      }
      
      totalParticipants += listing.participantCount;
      totalCoinsCollected += listing.totalCoinsCollected;
    }

    return {
      waitingForBasePrice,
      timerActive,
      totalParticipants,
      totalCoinsCollected
    };
  }

  /**
   * Initialize sample listings for testing
   */
  static initializeSampleListings(): void {
    // Sample listings with different base prices
    this.initializeListing('iphone-15-pro', 1099, 1440); // $1099 base, 24h timer
    this.initializeListing('macbook-pro', 2499, 2880); // $2499 base, 48h timer  
    this.initializeListing('airpods-pro', 249, 720); // $249 base, 12h timer
    this.initializeListing('ipad-pro', 1099, 1440); // $1099 base, 24h timer
    this.initializeListing('apple-watch', 399, 720); // $399 base, 12h timer
    
    console.log('📋 Sample listings initialized with base price thresholds');
  }
}

// Initialize sample listings
ListingManagementService.initializeSampleListings();

export default ListingManagementService;
