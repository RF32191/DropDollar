// Sponsored Listings Service
// Handles $10/day sponsored listings for premium placement

export interface SponsoredListing {
  listingId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  productDescription: string;
  productImage: string;
  basePrice: number;
  gameType: string;
  gameName: string;
  sponsorshipStartDate: Date;
  sponsorshipEndDate: Date;
  dailyRate: number; // $10/day
  totalPaid: number;
  isActive: boolean;
  priority: number; // Higher priority = better placement
  clicks: number;
  views: number;
  conversions: number;
  createdAt: Date;
}

export interface SponsorshipPayment {
  paymentId: string;
  listingId: string;
  sellerId: string;
  amount: number;
  days: number;
  startDate: Date;
  endDate: Date;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedAt: Date;
}

export interface SponsorshipStats {
  totalRevenue: number;
  activeSponsors: number;
  totalClicks: number;
  totalViews: number;
  averageCTR: number;
  topPerformingListings: SponsoredListing[];
}

export class SponsoredListingsService {
  private static sponsoredListings: Map<string, SponsoredListing> = new Map();
  private static sponsorshipPayments: Map<string, SponsorshipPayment> = new Map();
  
  // Daily rate for sponsored listings
  private static readonly DAILY_SPONSORSHIP_RATE = 10; // $10 per day
  private static readonly PLATFORM_FEE_PERCENTAGE = 0; // No additional fee on sponsorship

  // Create a new sponsored listing
  static createSponsoredListing(
    sellerId: string,
    sellerName: string,
    productName: string,
    productDescription: string,
    productImage: string,
    basePrice: number,
    gameType: string,
    days: number
  ): { listing: SponsoredListing; payment: SponsorshipPayment } {
    const listingId = `sponsored_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);
    
    const totalAmount = days * this.DAILY_SPONSORSHIP_RATE;
    
    const listing: SponsoredListing = {
      listingId,
      sellerId,
      sellerName,
      productName,
      productDescription,
      productImage,
      basePrice,
      gameType,
      gameName: this.getGameDisplayName(gameType),
      sponsorshipStartDate: startDate,
      sponsorshipEndDate: endDate,
      dailyRate: this.DAILY_SPONSORSHIP_RATE,
      totalPaid: totalAmount,
      isActive: true,
      priority: this.calculatePriority(totalAmount, startDate),
      clicks: 0,
      views: 0,
      conversions: 0,
      createdAt: new Date()
    };

    const payment: SponsorshipPayment = {
      paymentId,
      listingId,
      sellerId,
      amount: totalAmount,
      days,
      startDate,
      endDate,
      paymentMethod: 'credit_card', // Mock payment method
      status: 'completed',
      processedAt: new Date()
    };

    this.sponsoredListings.set(listingId, listing);
    this.sponsorshipPayments.set(paymentId, payment);

    console.log(`💰 Sponsored listing created: ${productName} - $${totalAmount} for ${days} days`);
    
    return { listing, payment };
  }

  // Get all active sponsored listings sorted by priority
  static getActiveSponsoredListings(): SponsoredListing[] {
    const now = new Date();
    
    return Array.from(this.sponsoredListings.values())
      .filter(listing => 
        listing.isActive && 
        listing.sponsorshipStartDate <= now && 
        listing.sponsorshipEndDate > now
      )
      .sort((a, b) => b.priority - a.priority); // Higher priority first
  }

  // Get sponsored listing by ID
  static getSponsoredListing(listingId: string): SponsoredListing | null {
    return this.sponsoredListings.get(listingId) || null;
  }

  // Track listing view
  static trackView(listingId: string): void {
    const listing = this.sponsoredListings.get(listingId);
    if (listing) {
      listing.views++;
      console.log(`👁️ View tracked for ${listing.productName}: ${listing.views} total views`);
    }
  }

  // Track listing click
  static trackClick(listingId: string): void {
    const listing = this.sponsoredListings.get(listingId);
    if (listing) {
      listing.clicks++;
      console.log(`🖱️ Click tracked for ${listing.productName}: ${listing.clicks} total clicks`);
    }
  }

  // Track conversion (user enters competition)
  static trackConversion(listingId: string): void {
    const listing = this.sponsoredListings.get(listingId);
    if (listing) {
      listing.conversions++;
      console.log(`🎯 Conversion tracked for ${listing.productName}: ${listing.conversions} total conversions`);
    }
  }

  // Calculate priority based on payment and recency
  private static calculatePriority(totalPaid: number, startDate: Date): number {
    const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const recencyBonus = Math.max(0, 30 - daysSinceStart); // Newer listings get bonus
    const paymentBonus = totalPaid / 10; // $10 = 1 point
    
    return paymentBonus + recencyBonus;
  }

  // Extend sponsorship
  static extendSponsorship(listingId: string, additionalDays: number): SponsorshipPayment | null {
    const listing = this.sponsoredListings.get(listingId);
    if (!listing) return null;

    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const additionalAmount = additionalDays * this.DAILY_SPONSORSHIP_RATE;
    
    // Extend the end date
    listing.sponsorshipEndDate.setDate(listing.sponsorshipEndDate.getDate() + additionalDays);
    listing.totalPaid += additionalAmount;
    listing.priority = this.calculatePriority(listing.totalPaid, listing.sponsorshipStartDate);

    const payment: SponsorshipPayment = {
      paymentId,
      listingId,
      sellerId: listing.sellerId,
      amount: additionalAmount,
      days: additionalDays,
      startDate: new Date(),
      endDate: listing.sponsorshipEndDate,
      paymentMethod: 'credit_card',
      status: 'completed',
      processedAt: new Date()
    };

    this.sponsorshipPayments.set(paymentId, payment);
    
    console.log(`📈 Sponsorship extended: ${listing.productName} - $${additionalAmount} for ${additionalDays} more days`);
    
    return payment;
  }

  // Deactivate sponsorship
  static deactivateSponsorship(listingId: string): boolean {
    const listing = this.sponsoredListings.get(listingId);
    if (!listing) return false;

    listing.isActive = false;
    console.log(`❌ Sponsorship deactivated: ${listing.productName}`);
    
    return true;
  }

  // Get sponsorship statistics
  static getSponsorshipStats(): SponsorshipStats {
    const activeListings = this.getActiveSponsoredListings();
    const allPayments = Array.from(this.sponsorshipPayments.values());
    
    const totalRevenue = allPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalClicks = activeListings.reduce((sum, l) => sum + l.clicks, 0);
    const totalViews = activeListings.reduce((sum, l) => sum + l.views, 0);
    const averageCTR = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    
    const topPerformingListings = activeListings
      .sort((a, b) => (b.clicks + b.conversions * 2) - (a.clicks + a.conversions * 2))
      .slice(0, 5);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeSponsors: activeListings.length,
      totalClicks,
      totalViews,
      averageCTR: Math.round(averageCTR * 100) / 100,
      topPerformingListings
    };
  }

  // Get seller's sponsored listings
  static getSellerSponsoredListings(sellerId: string): SponsoredListing[] {
    return Array.from(this.sponsoredListings.values())
      .filter(listing => listing.sellerId === sellerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get seller's sponsorship payments
  static getSellerPayments(sellerId: string): SponsorshipPayment[] {
    return Array.from(this.sponsorshipPayments.values())
      .filter(payment => payment.sellerId === sellerId)
      .sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());
  }

  // Calculate sponsorship cost
  static calculateSponsorshipCost(days: number): {
    dailyRate: number;
    totalDays: number;
    subtotal: number;
    platformFee: number;
    total: number;
  } {
    const subtotal = days * this.DAILY_SPONSORSHIP_RATE;
    const platformFee = subtotal * this.PLATFORM_FEE_PERCENTAGE;
    const total = subtotal + platformFee;

    return {
      dailyRate: this.DAILY_SPONSORSHIP_RATE,
      totalDays: days,
      subtotal,
      platformFee,
      total
    };
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

  // Simulate creating sample sponsored listings
  static createSampleSponsoredListings(): void {
    const sampleListings = [
      {
        sellerId: 'seller_001',
        sellerName: 'TechGear Pro',
        productName: 'iPhone 15 Pro Max - 1TB',
        productDescription: 'Latest iPhone with titanium design, advanced camera system, and massive storage',
        productImage: '/products/iphone15pro.jpg',
        basePrice: 1199,
        gameType: 'multi-target',
        days: 7
      },
      {
        sellerId: 'seller_002',
        sellerName: 'Gaming Central',
        productName: 'PlayStation 5 Pro Bundle',
        productDescription: 'Next-gen gaming console with 2 controllers and 3 AAA games included',
        productImage: '/products/ps5pro.jpg',
        basePrice: 799,
        gameType: 'multi-target',
        days: 5
      },
      {
        sellerId: 'seller_003',
        sellerName: 'Apple Authorized',
        productName: 'MacBook Pro M3 Max - 16"',
        productDescription: 'Professional laptop with M3 Max chip, 32GB RAM, and 1TB SSD',
        productImage: '/products/macbookpro.jpg',
        basePrice: 2499,
        gameType: 'falling-objects',
        days: 10
      },
      {
        sellerId: 'seller_004',
        sellerName: 'Audio Excellence',
        productName: 'Sony WH-1000XM5 Headphones',
        productDescription: 'Premium noise-canceling headphones with 30-hour battery life',
        productImage: '/products/sony-headphones.jpg',
        basePrice: 399,
        gameType: 'rhythm-game',
        days: 3
      },
      {
        sellerId: 'seller_005',
        sellerName: 'Smart Home Hub',
        productName: 'Tesla Model Y Performance Upgrade',
        productDescription: 'Performance upgrade package for Tesla Model Y - enhanced acceleration and handling',
        productImage: '/products/tesla-upgrade.jpg',
        basePrice: 15000,
        gameType: 'falling-objects',
        days: 14
      }
    ];

    sampleListings.forEach(listing => {
      this.createSponsoredListing(
        listing.sellerId,
        listing.sellerName,
        listing.productName,
        listing.productDescription,
        listing.productImage,
        listing.basePrice,
        listing.gameType,
        listing.days
      );
    });

    console.log(`✅ Created ${sampleListings.length} sample sponsored listings`);
  }

  // Clear all data (for testing)
  static clearAllData(): void {
    this.sponsoredListings.clear();
    this.sponsorshipPayments.clear();
  }
}

export default SponsoredListingsService;
