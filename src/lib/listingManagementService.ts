// Listing Management Service
// Handles seller listing creation, management, and quantity tracking

export interface ListingImage {
  imageId: string;
  url: string;
  filename: string;
  size: number;
  isPrimary: boolean;
  uploadedAt: Date;
}

export interface SellerListing {
  listingId: string;
  sellerId: string;
  sellerName: string;
  
  // Product Information
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  images: ListingImage[];
  
  // Pricing & Game
  basePrice: number;
  gameType: string;
  gameName: string;
  
  // Inventory Management
  totalQuantity: number;
  availableQuantity: number;
  soldQuantity: number;
  
  // Listing Status
  status: 'draft' | 'active' | 'paused' | 'sold_out' | 'ended';
  isSponsored: boolean;
  sponsorshipEndDate?: Date;
  
  // Competition Status
  currentBaseAmount: number; // Amount collected towards base price
  participantCount: number;
  isBaseMetForCurrent: boolean;
  currentCompetitionId?: string;
  
  // Timing
  createdAt: Date;
  updatedAt: Date;
  lastSoldAt?: Date;
  
  // Performance
  views: number;
  clicks: number;
  conversions: number;
  
  // Seller Settings
  processingTime: string; // "1-2 business days"
  shippingProfile: string;
  returnPolicy: string;
  
  // Platform Fees
  platformFeePercentage: number; // 12%
  listingMaintenanceFee: number; // $0.50 every 4 months
  nextMaintenanceDue: Date; // When next maintenance fee is due
}

export interface Competition {
  competitionId: string;
  listingId: string;
  instanceNumber: number; // 1st, 2nd, 3rd instance of same listing
  
  basePrice: number;
  currentAmount: number;
  participantCount: number;
  
  status: 'collecting' | 'active' | 'completed' | 'cancelled';
  startedAt?: Date;
  endsAt?: Date;
  
  winnerId?: string;
  winnerUsername?: string;
  winningScore?: number;
  
  participants: CompetitionParticipant[];
}

export interface CompetitionParticipant {
  userId: string;
  username: string;
  entryAmount: number; // $1, $2, or $3
  entryCount: number; // Number of entries made
  bestScore?: number;
  participatedAt: Date;
}

export class ListingManagementService {
  private static listings: Map<string, SellerListing> = new Map();
  private static competitions: Map<string, Competition> = new Map();
  
  // Platform settings
  private static readonly PLATFORM_FEE_PERCENTAGE = 0.12; // 12%
  private static readonly LISTING_MAINTENANCE_FEE = 0.50; // $0.50 every 4 months
  
  // Create new listing
  static createListing(
    sellerId: string,
    sellerName: string,
    listingData: {
      title: string;
      description: string;
      category: string;
      subcategory?: string;
      tags: string[];
      basePrice: number;
      gameType: string;
      totalQuantity: number;
      processingTime: string;
      shippingProfile: string;
      returnPolicy: string;
    }
  ): SellerListing {
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const listing: SellerListing = {
      listingId,
      sellerId,
      sellerName,
      title: listingData.title,
      description: listingData.description,
      category: listingData.category,
      subcategory: listingData.subcategory,
      tags: listingData.tags,
      images: [],
      basePrice: listingData.basePrice,
      gameType: listingData.gameType,
      gameName: this.getGameDisplayName(listingData.gameType),
      totalQuantity: listingData.totalQuantity,
      availableQuantity: listingData.totalQuantity,
      soldQuantity: 0,
      status: 'draft',
      isSponsored: false,
      currentBaseAmount: 0,
      participantCount: 0,
      isBaseMetForCurrent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      clicks: 0,
      conversions: 0,
      processingTime: listingData.processingTime,
      shippingProfile: listingData.shippingProfile,
      returnPolicy: listingData.returnPolicy,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE,
      listingMaintenanceFee: this.LISTING_MAINTENANCE_FEE,
      nextMaintenanceDue: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000) // 4 months from now
    };

    this.listings.set(listingId, listing);
    
    console.log(`📝 Listing created: ${listingData.title} by ${sellerName}`);
    return listing;
  }

  // Add images to listing
  static addImages(listingId: string, imageFiles: File[]): Promise<ListingImage[]> {
    return new Promise((resolve) => {
      const listing = this.listings.get(listingId);
      if (!listing) {
        resolve([]);
        return;
      }

      const newImages: ListingImage[] = imageFiles.map((file, index) => ({
        imageId: `img_${Date.now()}_${index}`,
        url: URL.createObjectURL(file), // In real app, upload to cloud storage
        filename: file.name,
        size: file.size,
        isPrimary: listing.images.length === 0 && index === 0,
        uploadedAt: new Date()
      }));

      listing.images.push(...newImages);
      listing.updatedAt = new Date();
      
      console.log(`📸 Added ${newImages.length} images to ${listing.title}`);
      resolve(newImages);
    });
  }

  // Set primary image
  static setPrimaryImage(listingId: string, imageId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;

    // Remove primary flag from all images
    listing.images.forEach(img => img.isPrimary = false);
    
    // Set new primary image
    const targetImage = listing.images.find(img => img.imageId === imageId);
    if (targetImage) {
      targetImage.isPrimary = true;
      listing.updatedAt = new Date();
      return true;
    }
    
    return false;
  }

  // Remove image
  static removeImage(listingId: string, imageId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;

    const imageIndex = listing.images.findIndex(img => img.imageId === imageId);
    if (imageIndex === -1) return false;

    const wasRemoved = listing.images.splice(imageIndex, 1);
    
    // If removed image was primary, set first remaining image as primary
    if (wasRemoved[0].isPrimary && listing.images.length > 0) {
      listing.images[0].isPrimary = true;
    }
    
    listing.updatedAt = new Date();
    return true;
  }

  // Publish listing
  static publishListing(listingId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;

    // Validation
    if (!listing.title.trim()) return false;
    if (!listing.description.trim()) return false;
    if (listing.images.length === 0) return false;
    if (listing.basePrice <= 0) return false;
    if (listing.totalQuantity <= 0) return false;

    listing.status = 'active';
    listing.updatedAt = new Date();
    
    // Create first competition instance
    this.createCompetitionInstance(listingId);
    
    console.log(`🚀 Listing published: ${listing.title}`);
    return true;
  }

  // Create competition instance for a listing
  static createCompetitionInstance(listingId: string): Competition | null {
    const listing = this.listings.get(listingId);
    if (!listing || listing.availableQuantity <= 0) return null;

    const competitionId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instanceNumber = listing.soldQuantity + 1;
    
    const competition: Competition = {
      competitionId,
      listingId,
      instanceNumber,
      basePrice: listing.basePrice,
      currentAmount: 0,
      participantCount: 0,
      status: 'collecting',
      participants: []
    };

    this.competitions.set(competitionId, competition);
    listing.currentCompetitionId = competitionId;
    listing.currentBaseAmount = 0;
    listing.participantCount = 0;
    listing.isBaseMetForCurrent = false;
    
    console.log(`🎮 Competition instance ${instanceNumber} created for ${listing.title}`);
    return competition;
  }

  // Add participant to competition
  static addParticipant(
    listingId: string, 
    userId: string, 
    username: string, 
    entryAmount: number
  ): boolean {
    const listing = this.listings.get(listingId);
    if (!listing || !listing.currentCompetitionId) return false;

    const competition = this.competitions.get(listing.currentCompetitionId);
    if (!competition || competition.status !== 'collecting') return false;

    // Check if user already participated
    let participant = competition.participants.find(p => p.userId === userId);
    
    if (participant) {
      // Update existing participant
      participant.entryAmount += entryAmount;
      participant.entryCount += 1;
    } else {
      // Add new participant
      participant = {
        userId,
        username,
        entryAmount,
        entryCount: 1,
        participatedAt: new Date()
      };
      competition.participants.push(participant);
    }

    // Update competition totals
    competition.currentAmount += entryAmount;
    competition.participantCount = competition.participants.length;
    
    // Update listing totals
    listing.currentBaseAmount = competition.currentAmount;
    listing.participantCount = competition.participantCount;
    listing.conversions += 1;
    
    // Check if base price is met
    if (competition.currentAmount >= competition.basePrice && !listing.isBaseMetForCurrent) {
      listing.isBaseMetForCurrent = true;
      competition.status = 'active';
      competition.startedAt = new Date();
      
      // Set end time (24 hours from now)
      competition.endsAt = new Date();
      competition.endsAt.setHours(competition.endsAt.getHours() + 24);
      
      console.log(`🎯 Base price met for ${listing.title} - Competition is now active!`);
    }
    
    listing.updatedAt = new Date();
    return true;
  }

  // Complete competition (when someone wins)
  static completeCompetition(
    competitionId: string, 
    winnerId: string, 
    winnerUsername: string, 
    winningScore: number
  ): boolean {
    const competition = this.competitions.get(competitionId);
    if (!competition) return false;

    const listing = this.listings.get(competition.listingId);
    if (!listing) return false;

    // Update competition
    competition.status = 'completed';
    competition.winnerId = winnerId;
    competition.winnerUsername = winnerUsername;
    competition.winningScore = winningScore;

    // Update listing
    listing.soldQuantity += 1;
    listing.availableQuantity -= 1;
    listing.lastSoldAt = new Date();
    listing.updatedAt = new Date();

    // Check if more quantity available
    if (listing.availableQuantity > 0) {
      // Create new competition instance
      this.createCompetitionInstance(competition.listingId);
      console.log(`🔄 New competition instance created for ${listing.title} (${listing.availableQuantity} remaining)`);
    } else {
      // Mark listing as sold out
      listing.status = 'sold_out';
      console.log(`🏁 Listing sold out: ${listing.title}`);
    }

    console.log(`🏆 Competition completed: ${winnerUsername} won ${listing.title} with score ${winningScore}`);
    return true;
  }

  // Get listing by ID
  static getListing(listingId: string): SellerListing | null {
    return this.listings.get(listingId) || null;
  }

  // Get seller's listings
  static getSellerListings(sellerId: string): SellerListing[] {
    return Array.from(this.listings.values())
      .filter(listing => listing.sellerId === sellerId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get active listings
  static getActiveListings(category?: string): SellerListing[] {
    return Array.from(this.listings.values())
      .filter(listing => {
        if (listing.status !== 'active') return false;
        if (category && listing.category !== category) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Get competition by ID
  static getCompetition(competitionId: string): Competition | null {
    return this.competitions.get(competitionId) || null;
  }

  // Track listing view
  static trackView(listingId: string): void {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.views += 1;
      listing.updatedAt = new Date();
    }
  }

  // Track listing click
  static trackClick(listingId: string): void {
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.clicks += 1;
      listing.updatedAt = new Date();
    }
  }

  // Calculate seller earnings
  static calculateSellerEarnings(listingId: string): {
    grossRevenue: number;
    platformFee: number;
    maintenanceFees: number;
    netEarnings: number;
    nextMaintenanceDue: Date | null;
  } {
    const listing = this.listings.get(listingId);
    if (!listing) {
      return { grossRevenue: 0, platformFee: 0, maintenanceFees: 0, netEarnings: 0, nextMaintenanceDue: null };
    }

    const grossRevenue = listing.soldQuantity * listing.basePrice;
    const platformFee = grossRevenue * listing.platformFeePercentage;
    
    // Calculate maintenance fees based on listing age (every 4 months)
    const listingAge = Date.now() - listing.createdAt.getTime();
    const monthsActive = Math.floor(listingAge / (30 * 24 * 60 * 60 * 1000));
    const maintenanceCycles = Math.floor(monthsActive / 4);
    const maintenanceFees = maintenanceCycles * listing.listingMaintenanceFee;
    
    const netEarnings = grossRevenue - platformFee - maintenanceFees;

    return {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      maintenanceFees: Math.round(maintenanceFees * 100) / 100,
      netEarnings: Math.round(netEarnings * 100) / 100,
      nextMaintenanceDue: listing.nextMaintenanceDue
    };
  }

  // Update listing
  static updateListing(listingId: string, updates: Partial<SellerListing>): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;

    // Prevent updating certain fields
    const allowedUpdates = { ...updates };
    delete allowedUpdates.listingId;
    delete allowedUpdates.sellerId;
    delete allowedUpdates.createdAt;
    delete allowedUpdates.soldQuantity;

    Object.assign(listing, allowedUpdates);
    listing.updatedAt = new Date();
    
    return true;
  }

  // Pause/Resume listing
  static toggleListingStatus(listingId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;

    if (listing.status === 'active') {
      listing.status = 'paused';
    } else if (listing.status === 'paused') {
      listing.status = 'active';
    }
    
    listing.updatedAt = new Date();
    return true;
  }

  // Delete listing
  static deleteListing(listingId: string, sellerId: string): boolean {
    const listing = this.listings.get(listingId);
    if (!listing || listing.sellerId !== sellerId) return false;

    // Can only delete draft listings or listings with no participants
    if (listing.status !== 'draft' && listing.participantCount > 0) {
      return false;
    }

    this.listings.delete(listingId);
    
    // Clean up associated competitions
    if (listing.currentCompetitionId) {
      this.competitions.delete(listing.currentCompetitionId);
    }
    
    console.log(`🗑️ Listing deleted: ${listing.title}`);
    return true;
  }

  // Get game display name
  private static getGameDisplayName(gameType: string): string {
    const gameNames: { [key: string]: string } = {
      'multi-target': 'Multi-Target Reaction',
      'falling-objects': 'Falling Object Catch',
      'color-sequence': 'Color Sequence Memory'
    };
    return gameNames[gameType] || 'Skill Game';
  }

  // Get available categories
  static getCategories(): { [key: string]: string[] } {
    return {
      'Electronics': ['Smartphones', 'Laptops', 'Gaming', 'Audio', 'Cameras', 'Smart Home'],
      'Fashion': ['Clothing', 'Shoes', 'Accessories', 'Jewelry', 'Bags', 'Watches'],
      'Home & Garden': ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Tools', 'Outdoor'],
      'Sports & Outdoors': ['Fitness', 'Outdoor Gear', 'Sports Equipment', 'Athletic Wear'],
      'Automotive': ['Parts', 'Accessories', 'Tools', 'Electronics', 'Care Products'],
      'Collectibles': ['Trading Cards', 'Coins', 'Art', 'Vintage', 'Memorabilia'],
      'Books & Media': ['Books', 'Movies', 'Music', 'Games', 'Educational'],
      'Health & Beauty': ['Skincare', 'Makeup', 'Health', 'Personal Care', 'Supplements']
    };
  }

  // Create sample listings
  static createSampleListings(): void {
    const sampleListings = [
      {
        sellerId: 'seller_001',
        sellerName: 'TechGear Pro',
        title: 'iPhone 15 Pro Max - 1TB Titanium',
        description: 'Brand new iPhone 15 Pro Max with 1TB storage in Natural Titanium. Includes original box, charger, and documentation. Perfect for gaming and professional photography.',
        category: 'Electronics',
        subcategory: 'Smartphones',
        tags: ['iPhone', 'Apple', 'Smartphone', 'Titanium', '1TB'],
        basePrice: 1199,
        gameType: 'multi-target',
        totalQuantity: 3,
        processingTime: '1-2 business days',
        shippingProfile: 'Standard Electronics',
        returnPolicy: '30-day return policy'
      },
      {
        sellerId: 'seller_002',
        sellerName: 'Gaming Central',
        title: 'PlayStation 5 Pro Console Bundle',
        description: 'Latest PlayStation 5 Pro console with 2TB SSD, includes 2 DualSense controllers and 3 AAA games. Perfect for next-gen gaming experience.',
        category: 'Electronics',
        subcategory: 'Gaming',
        tags: ['PlayStation', 'PS5', 'Gaming', 'Console', 'Bundle'],
        basePrice: 799,
        gameType: 'multi-target',
        totalQuantity: 2,
        processingTime: '1-3 business days',
        shippingProfile: 'Gaming Equipment',
        returnPolicy: '14-day return policy'
      }
    ];

    sampleListings.forEach(data => {
      this.createListing(data.sellerId, data.sellerName, data);
    });

    console.log('✅ Sample listings created');
  }
}

export default ListingManagementService;
