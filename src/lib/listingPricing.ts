/**
 * Service for calculating listing pricing based on game entries
 */

import { userEntryTrackingService } from './userEntryTracking';
import type { StoredListing } from './listingStorage';

export interface ListingPriceInfo {
  basePrice: number;           // The target price to activate timer (e.g., $575)
  currentPrice: number;        // Current accumulated price from entries (starts at $0)
  totalEntries: number;        // Total number of $1 entries across all users
  totalRevenue: number;        // Total money collected ($1 per entry)
  remainingToActivate: number; // How much more needed to reach base price
  progressPercentage: number;  // Percentage toward base price (0-100%)
  isTimerActive: boolean;      // Whether timer should be active
}

class ListingPricingService {
  /**
   * Calculate comprehensive pricing information for a listing
   */
  calculatePricing(listing: StoredListing): ListingPriceInfo {
    const basePrice = listing.basePrice || 0;
    const totalRevenue = userEntryTrackingService.getListingRevenue(listing.id);
    const allEntries = userEntryTrackingService.getListingAllEntries(listing.id);
    const totalEntries = allEntries.length;
    
    // Current price is the total revenue from game entries
    const currentPrice = totalRevenue;
    
    // Calculate remaining amount needed to activate timer
    const remainingToActivate = Math.max(0, basePrice - currentPrice);
    
    // Calculate progress percentage (0-100%)
    const progressPercentage = basePrice > 0 
      ? Math.min(100, (currentPrice / basePrice) * 100)
      : 0;
    
    // Timer should be active if we've reached or exceeded the base price
    const isTimerActive = currentPrice >= basePrice;
    
    return {
      basePrice,
      currentPrice,
      totalEntries,
      totalRevenue,
      remainingToActivate,
      progressPercentage,
      isTimerActive
    };
  }

  /**
   * Get formatted price display for a listing
   */
  getFormattedPricing(listing: StoredListing) {
    const pricing = this.calculatePricing(listing);
    
    return {
      ...pricing,
      currentPriceFormatted: `$${pricing.currentPrice.toLocaleString()}`,
      basePriceFormatted: `$${pricing.basePrice.toLocaleString()}`,
      remainingFormatted: `$${pricing.remainingToActivate.toLocaleString()}`,
      progressText: `${pricing.progressPercentage.toFixed(1)}% to timer activation`
    };
  }

  /**
   * Check if a listing should have its timer activated
   */
  shouldActivateTimer(listing: StoredListing): boolean {
    const pricing = this.calculatePricing(listing);
    return pricing.isTimerActive && listing.status !== 'timer_active';
  }

  /**
   * Get the next price milestone for display
   */
  getNextMilestone(listing: StoredListing): {
    amount: number;
    description: string;
  } | null {
    const pricing = this.calculatePricing(listing);
    
    if (pricing.remainingToActivate > 0) {
      return {
        amount: pricing.remainingToActivate,
        description: 'to activate timer'
      };
    }
    
    return null;
  }

  /**
   * Calculate what the price would be with additional entries
   */
  calculatePriceWithEntries(listing: StoredListing, additionalEntries: number): ListingPriceInfo {
    const currentPricing = this.calculatePricing(listing);
    const additionalRevenue = additionalEntries * 1; // $1 per entry
    
    return {
      ...currentPricing,
      currentPrice: currentPricing.currentPrice + additionalRevenue,
      totalEntries: currentPricing.totalEntries + additionalEntries,
      totalRevenue: currentPricing.totalRevenue + additionalRevenue,
      remainingToActivate: Math.max(0, currentPricing.basePrice - (currentPricing.currentPrice + additionalRevenue)),
      progressPercentage: currentPricing.basePrice > 0 
        ? Math.min(100, ((currentPricing.currentPrice + additionalRevenue) / currentPricing.basePrice) * 100)
        : 0,
      isTimerActive: (currentPricing.currentPrice + additionalRevenue) >= currentPricing.basePrice
    };
  }
}

export const listingPricingService = new ListingPricingService();
export default listingPricingService;
