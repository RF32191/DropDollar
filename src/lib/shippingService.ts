// Shipping and Fulfillment Service
// Handles winner address collection, shipping label generation, and seller fulfillment

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface ShippingOption {
  carrier: 'UPS' | 'FedEx';
  service: string;
  estimatedDays: string;
  cost: number;
  trackingIncluded: boolean;
  insuranceIncluded: boolean;
}

export interface ShippingLabel {
  labelId: string;
  listingId: string;
  winnerId: string;
  sellerId: string;
  carrier: 'UPS' | 'FedEx';
  service: string;
  trackingNumber: string;
  labelUrl: string; // URL to download printable label
  cost: number;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  createdAt: Date;
  status: 'pending' | 'generated' | 'printed' | 'shipped' | 'delivered' | 'exception';
  estimatedDelivery: Date;
}

export interface WinnerFulfillment {
  fulfillmentId: string;
  listingId: string;
  winnerId: string;
  winnerUsername: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  winningScore: number;
  prizeType: 'physical_item' | 'cash_prize';
  prizeValue: number;
  
  // For physical items
  shippingAddress?: ShippingAddress;
  shippingLabel?: ShippingLabel;
  sellerVerified: boolean;
  addressVerified: boolean;
  
  // For cash prizes
  cashAmount?: number;
  platformFee?: number; // 15%
  netAmount?: number;
  paidToWallet: boolean;
  
  status: 'pending_address' | 'address_submitted' | 'seller_review' | 'address_verified' | 
          'label_generated' | 'shipped' | 'delivered' | 'cash_paid' | 'completed' | 'disputed';
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Communication
  messages: FulfillmentMessage[];
  
  // Dispute handling
  disputeReason?: string;
  disputeStatus?: 'none' | 'buyer_dispute' | 'seller_dispute' | 'platform_review' | 'resolved';
}

export interface FulfillmentMessage {
  messageId: string;
  fromUserId: string;
  fromUserType: 'winner' | 'seller' | 'platform';
  message: string;
  timestamp: Date;
  attachments?: string[];
}

export class ShippingService {
  private static fulfillments: Map<string, WinnerFulfillment> = new Map();
  private static shippingLabels: Map<string, ShippingLabel> = new Map();
  
  // Shipping rates (mock - in real app would integrate with UPS/FedEx APIs)
  private static readonly SHIPPING_RATES = {
    UPS: {
      'Ground': { baseCost: 8.50, perPound: 0.75, days: '1-5 business days' },
      '3 Day Select': { baseCost: 12.50, perPound: 1.25, days: '3 business days' },
      '2nd Day Air': { baseCost: 18.50, perPound: 2.00, days: '2 business days' },
      'Next Day Air': { baseCost: 35.00, perPound: 4.50, days: '1 business day' }
    },
    FedEx: {
      'Ground': { baseCost: 9.00, perPound: 0.80, days: '1-5 business days' },
      'Express Saver': { baseCost: 15.00, perPound: 1.50, days: '3 business days' },
      '2Day': { baseCost: 20.00, perPound: 2.25, days: '2 business days' },
      'Priority Overnight': { baseCost: 38.00, perPound: 5.00, days: '1 business day' }
    }
  };

  // Platform shipping fee (added to seller fees)
  private static readonly PLATFORM_SHIPPING_FEE_PERCENTAGE = 0.03; // 3% of shipping cost

  // Create fulfillment record when someone wins
  static createWinnerFulfillment(
    listingId: string,
    winnerId: string,
    winnerUsername: string,
    sellerId: string,
    sellerName: string,
    productName: string,
    winningScore: number,
    prizeType: 'physical_item' | 'cash_prize',
    prizeValue: number
  ): WinnerFulfillment {
    const fulfillmentId = `fulfill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fulfillment: WinnerFulfillment = {
      fulfillmentId,
      listingId,
      winnerId,
      winnerUsername,
      sellerId,
      sellerName,
      productName,
      winningScore,
      prizeType,
      prizeValue,
      sellerVerified: false,
      addressVerified: false,
      paidToWallet: false,
      status: prizeType === 'cash_prize' ? 'cash_paid' : 'pending_address',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };

    // Handle cash prizes immediately
    if (prizeType === 'cash_prize') {
      const platformFee = prizeValue * 0.15; // 15% platform fee
      const netAmount = prizeValue - platformFee;
      
      fulfillment.cashAmount = prizeValue;
      fulfillment.platformFee = platformFee;
      fulfillment.netAmount = netAmount;
      fulfillment.paidToWallet = true;
      fulfillment.status = 'cash_paid';
      fulfillment.completedAt = new Date();
      
      // In real app, would credit winner's wallet here
      console.log(`💰 Cash prize paid: $${netAmount} to ${winnerUsername} (after $${platformFee} platform fee)`);
    }

    this.fulfillments.set(fulfillmentId, fulfillment);
    
    console.log(`🏆 Winner fulfillment created: ${winnerUsername} won ${productName} (${prizeType})`);
    return fulfillment;
  }

  // Winner submits shipping address
  static submitShippingAddress(fulfillmentId: string, shippingAddress: ShippingAddress): boolean {
    const fulfillment = this.fulfillments.get(fulfillmentId);
    if (!fulfillment || fulfillment.prizeType !== 'physical_item') return false;

    fulfillment.shippingAddress = shippingAddress;
    fulfillment.status = 'address_submitted';
    fulfillment.updatedAt = new Date();
    
    // Add system message
    fulfillment.messages.push({
      messageId: `msg_${Date.now()}`,
      fromUserId: 'system',
      fromUserType: 'platform',
      message: `Shipping address submitted by ${fulfillment.winnerUsername}. Awaiting seller verification.`,
      timestamp: new Date()
    });

    console.log(`📍 Shipping address submitted for ${fulfillment.productName} by ${fulfillment.winnerUsername}`);
    return true;
  }

  // Seller verifies winner and address
  static sellerVerifyWinner(
    fulfillmentId: string, 
    sellerId: string, 
    verified: boolean, 
    notes?: string
  ): boolean {
    const fulfillment = this.fulfillments.get(fulfillmentId);
    if (!fulfillment || fulfillment.sellerId !== sellerId) return false;

    fulfillment.sellerVerified = verified;
    fulfillment.addressVerified = verified;
    fulfillment.status = verified ? 'address_verified' : 'seller_review';
    fulfillment.updatedAt = new Date();
    
    // Add seller message
    fulfillment.messages.push({
      messageId: `msg_${Date.now()}`,
      fromUserId: sellerId,
      fromUserType: 'seller',
      message: verified ? 
        `Winner and address verified. ${notes || 'Ready to generate shipping label.'}` :
        `Verification failed. ${notes || 'Please review winner details.'}`,
      timestamp: new Date()
    });

    console.log(`✅ Seller ${verified ? 'verified' : 'rejected'} winner for ${fulfillment.productName}`);
    return true;
  }

  // Calculate shipping options
  static calculateShippingOptions(
    weight: number, // in pounds
    dimensions: { length: number; width: number; height: number }, // in inches
    fromZip: string,
    toZip: string
  ): ShippingOption[] {
    const options: ShippingOption[] = [];
    
    // Calculate for both carriers
    Object.entries(this.SHIPPING_RATES).forEach(([carrier, services]) => {
      Object.entries(services).forEach(([service, rate]) => {
        const baseCost = rate.baseCost + (weight * rate.perPound);
        
        // Add dimensional weight pricing for large packages
        const dimensionalWeight = (dimensions.length * dimensions.width * dimensions.height) / 166;
        const billableWeight = Math.max(weight, dimensionalWeight);
        const finalCost = rate.baseCost + (billableWeight * rate.perPound);
        
        options.push({
          carrier: carrier as 'UPS' | 'FedEx',
          service: service,
          estimatedDays: rate.days,
          cost: Math.round(finalCost * 100) / 100,
          trackingIncluded: true,
          insuranceIncluded: finalCost > 100 // Auto-include insurance for expensive items
        });
      });
    });

    return options.sort((a, b) => a.cost - b.cost); // Sort by cost
  }

  // Generate shipping label (seller action)
  static generateShippingLabel(
    fulfillmentId: string,
    sellerId: string,
    carrier: 'UPS' | 'FedEx',
    service: string,
    weight: number,
    dimensions: { length: number; width: number; height: number },
    sellerAddress: ShippingAddress
  ): ShippingLabel | null {
    const fulfillment = this.fulfillments.get(fulfillmentId);
    if (!fulfillment || fulfillment.sellerId !== sellerId || !fulfillment.shippingAddress) {
      return null;
    }

    const labelId = `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trackingNumber = this.generateTrackingNumber(carrier);
    
    // Calculate shipping cost
    const shippingOptions = this.calculateShippingOptions(
      weight, 
      dimensions, 
      sellerAddress.postalCode, 
      fulfillment.shippingAddress.postalCode
    );
    const selectedOption = shippingOptions.find(opt => 
      opt.carrier === carrier && opt.service === service
    );
    
    if (!selectedOption) return null;

    // Calculate platform shipping fee
    const platformShippingFee = selectedOption.cost * this.PLATFORM_SHIPPING_FEE_PERCENTAGE;
    const totalSellerCost = selectedOption.cost + platformShippingFee;

    const label: ShippingLabel = {
      labelId,
      listingId: fulfillment.listingId,
      winnerId: fulfillment.winnerId,
      sellerId,
      carrier,
      service,
      trackingNumber,
      labelUrl: `https://shipping.dropdollar.com/labels/${labelId}.pdf`, // Mock URL
      cost: totalSellerCost,
      weight,
      dimensions,
      fromAddress: sellerAddress,
      toAddress: fulfillment.shippingAddress,
      createdAt: new Date(),
      status: 'generated',
      estimatedDelivery: this.calculateEstimatedDelivery(service)
    };

    this.shippingLabels.set(labelId, label);
    
    // Update fulfillment
    fulfillment.shippingLabel = label;
    fulfillment.status = 'label_generated';
    fulfillment.updatedAt = new Date();
    
    // Add system message
    fulfillment.messages.push({
      messageId: `msg_${Date.now()}`,
      fromUserId: 'system',
      fromUserType: 'platform',
      message: `Shipping label generated: ${carrier} ${service} - Tracking: ${trackingNumber}. Cost: $${totalSellerCost.toFixed(2)} (includes $${platformShippingFee.toFixed(2)} platform fee)`,
      timestamp: new Date()
    });

    console.log(`📦 Shipping label generated: ${trackingNumber} for ${fulfillment.productName}`);
    return label;
  }

  // Mark item as shipped
  static markAsShipped(fulfillmentId: string, sellerId: string): boolean {
    const fulfillment = this.fulfillments.get(fulfillmentId);
    if (!fulfillment || fulfillment.sellerId !== sellerId || !fulfillment.shippingLabel) {
      return false;
    }

    fulfillment.status = 'shipped';
    fulfillment.updatedAt = new Date();
    
    if (fulfillment.shippingLabel) {
      fulfillment.shippingLabel.status = 'shipped';
    }
    
    // Add seller message
    fulfillment.messages.push({
      messageId: `msg_${Date.now()}`,
      fromUserId: sellerId,
      fromUserType: 'seller',
      message: `Item shipped! Tracking number: ${fulfillment.shippingLabel.trackingNumber}`,
      timestamp: new Date()
    });

    console.log(`🚚 Item shipped: ${fulfillment.productName} - Tracking: ${fulfillment.shippingLabel.trackingNumber}`);
    return true;
  }

  // Get fulfillment by ID
  static getFulfillment(fulfillmentId: string): WinnerFulfillment | null {
    return this.fulfillments.get(fulfillmentId) || null;
  }

  // Get fulfillments for winner
  static getWinnerFulfillments(winnerId: string): WinnerFulfillment[] {
    return Array.from(this.fulfillments.values())
      .filter(f => f.winnerId === winnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get fulfillments for seller
  static getSellerFulfillments(sellerId: string): WinnerFulfillment[] {
    return Array.from(this.fulfillments.values())
      .filter(f => f.sellerId === sellerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get shipping label
  static getShippingLabel(labelId: string): ShippingLabel | null {
    return this.shippingLabels.get(labelId) || null;
  }

  // Helper: Generate tracking number
  private static generateTrackingNumber(carrier: 'UPS' | 'FedEx'): string {
    const prefix = carrier === 'UPS' ? '1Z' : '7712';
    const suffix = Math.random().toString(36).substr(2, 12).toUpperCase();
    return `${prefix}${suffix}`;
  }

  // Helper: Calculate estimated delivery
  private static calculateEstimatedDelivery(service: string): Date {
    const days = service.includes('Next Day') || service.includes('Overnight') ? 1 :
                 service.includes('2') ? 2 :
                 service.includes('3') ? 3 : 5;
    
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + days);
    return delivery;
  }

  // Get shipping cost breakdown for seller
  static getShippingCostBreakdown(shippingCost: number): {
    shippingCost: number;
    platformFee: number;
    totalCost: number;
    feePercentage: number;
  } {
    const platformFee = shippingCost * this.PLATFORM_SHIPPING_FEE_PERCENTAGE;
    return {
      shippingCost,
      platformFee: Math.round(platformFee * 100) / 100,
      totalCost: Math.round((shippingCost + platformFee) * 100) / 100,
      feePercentage: this.PLATFORM_SHIPPING_FEE_PERCENTAGE * 100
    };
  }

  // Create sample fulfillments for testing
  static createSampleFulfillments(): void {
    // Physical item fulfillment
    this.createWinnerFulfillment(
      'listing_001',
      'winner_001',
      'GameMaster2024',
      'seller_001',
      'TechGear Pro',
      'iPhone 15 Pro Max - 1TB',
      95.7,
      'physical_item',
      1199
    );

    // Cash prize fulfillment
    this.createWinnerFulfillment(
      'tournament_100',
      'winner_002',
      'SkillPlayer99',
      'platform',
      'DropDollar',
      '$100 Cash Prize',
      87.3,
      'cash_prize',
      100
    );

    console.log('✅ Sample fulfillments created');
  }
}

export default ShippingService;
