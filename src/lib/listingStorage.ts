// Enhanced Listing Storage Service - Optimized for thousands of listings
import type { Listing, Category } from '@/types';

export interface StoredListing {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string; // Cache category name for performance
  basePrice: number;
  currentPrice: number;
  targetPrice: number; // Add target price for timer activation
  timerDuration: number;
  gameType: string; // Game type for competition
  quantity: number; // Number of items available
  quantitySold: number; // Number of items sold
  images: string[]; // Base64 encoded images for demo
  sellerId: string;
  sellerName: string;
  sellerRating: number; // Cache seller rating
  sellerTotalSales: number; // Cache seller sales count
  status: 'active' | 'timer_active' | 'ended' | 'sold';
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  createdAt: string;
  updatedAt: string;
  endTime?: string; // When timer ends
  totalEntries: number;
  totalBids: number;
  uniqueBidders: number;
  viewCount: number; // Track views for analytics
  isHot: boolean; // Hot listing indicator
  tags: string[]; // Search tags for better discovery
  shippingInfo?: {
    weight: number;
    dimensions: { length: number; width: number; height: number; };
    shippingCost: number;
    freeShipping: boolean;
  };
}

export class ListingStorageService {
  private static readonly STORAGE_KEY = 'stored_listings';
  private static readonly INDEX_KEY = 'listings_index';
  private static readonly CACHE_KEY = 'listings_cache';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Cache for frequently accessed data
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();

  // Get all listings with optional pagination
  static getAllListings(page?: number, limit?: number): StoredListing[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const cacheKey = `all_listings_${page || 0}_${limit || 'all'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const stored = localStorage.getItem(this.STORAGE_KEY);
      let listings: StoredListing[] = stored ? JSON.parse(stored) : [];
      
      // Sort by creation date (newest first) for better UX
      listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination if specified
      if (page !== undefined && limit !== undefined) {
        const startIndex = page * limit;
        listings = listings.slice(startIndex, startIndex + limit);
      }
      
      this.setCache(cacheKey, listings);
      return listings;
    } catch (error) {
      console.error('Error loading listings:', error);
      return [];
    }
  }

  // Cache management methods
  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private static clearCache(): void {
    this.cache.clear();
  }

  // Get listings by category with pagination and filtering
  static getListingsByCategory(
    categoryId: string, 
    page: number = 0, 
    limit: number = 20,
    filters?: {
      status?: StoredListing['status'][];
      priceRange?: { min: number; max: number };
      condition?: StoredListing['condition'][];
      sortBy?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'popular';
    }
  ): { listings: StoredListing[]; total: number; hasMore: boolean } {
    const cacheKey = `category_${categoryId}_${page}_${limit}_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let allListings = this.getAllListings();
    
    // Filter by category
    if (categoryId !== 'all') {
      allListings = allListings.filter(listing => listing.categoryId === categoryId);
    }
    
    // Apply filters
    if (filters) {
      if (filters.status) {
        allListings = allListings.filter(listing => filters.status!.includes(listing.status));
      }
      if (filters.priceRange) {
        allListings = allListings.filter(listing => 
          listing.currentPrice >= filters.priceRange!.min && 
          listing.currentPrice <= filters.priceRange!.max
        );
      }
      if (filters.condition) {
        allListings = allListings.filter(listing => filters.condition!.includes(listing.condition));
      }
      
      // Apply sorting
      switch (filters.sortBy) {
        case 'oldest':
          allListings.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'price_low':
          allListings.sort((a, b) => a.currentPrice - b.currentPrice);
          break;
        case 'price_high':
          allListings.sort((a, b) => b.currentPrice - a.currentPrice);
          break;
        case 'popular':
          allListings.sort((a, b) => (b.viewCount + b.totalBids) - (a.viewCount + a.totalBids));
          break;
        case 'newest':
        default:
          allListings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }
    }
    
    const total = allListings.length;
    const startIndex = page * limit;
    const listings = allListings.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;
    
    const result = { listings, total, hasMore };
    this.setCache(cacheKey, result);
    return result;
  }

  // Create new listing with enhanced fields
  static createListing(listingData: {
    title: string;
    description: string;
    categoryId: string;
    categoryName: string;
    basePrice: number;
    timerDuration: number;
    gameType: string;
    quantity: number;
    images: File[];
    sellerId: string;
    sellerName: string;
    sellerRating?: number;
    sellerTotalSales?: number;
    condition?: StoredListing['condition'];
    tags?: string[];
  }): Promise<StoredListing> {
    return new Promise(async (resolve, reject) => {
      try {
        // Convert images to base64 for demo storage
        const imagePromises = listingData.images.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        const imageBase64Array = await Promise.all(imagePromises);

        // Calculate target price (80% of base price for timer activation)
        const targetPrice = Math.floor(listingData.basePrice * 0.8);

        const newListing: StoredListing = {
          id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: listingData.title,
          description: listingData.description,
          categoryId: listingData.categoryId,
          categoryName: listingData.categoryName,
          basePrice: listingData.basePrice,
          currentPrice: listingData.basePrice,
          targetPrice: targetPrice,
          timerDuration: listingData.timerDuration,
          gameType: listingData.gameType,
          quantity: listingData.quantity,
          quantitySold: 0,
          images: imageBase64Array,
          sellerId: listingData.sellerId,
          sellerName: listingData.sellerName,
          sellerRating: listingData.sellerRating || 4.5,
          sellerTotalSales: listingData.sellerTotalSales || 0,
          status: 'active',
          condition: listingData.condition || 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalEntries: 0,
          totalBids: 0,
          uniqueBidders: 0,
          viewCount: 0,
          isHot: false,
          tags: listingData.tags || []
        };

        // Save to localStorage and clear cache
        const allListings = this.getAllListings();
        allListings.push(newListing);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allListings));
        this.clearCache();

        console.log('✅ Listing created successfully:', newListing.id);
        resolve(newListing);
      } catch (error) {
        console.error('Error creating listing:', error);
        reject(error);
      }
    });
  }

  // Get listing by ID with view tracking
  static getListingById(id: string, trackView: boolean = true): StoredListing | null {
    const cacheKey = `listing_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached && !trackView) return cached;

    const allListings = this.getAllListings();
    const listing = allListings.find(listing => listing.id === id) || null;
    
    if (listing && trackView) {
      // Increment view count
      listing.viewCount = (listing.viewCount || 0) + 1;
      listing.updatedAt = new Date().toISOString();
      this.updateListing(listing);
    }
    
    if (listing) {
      this.setCache(cacheKey, listing);
    }
    
    return listing;
  }

  // Update entire listing
  static updateListing(updatedListing: StoredListing): boolean {
    try {
      const allListings = this.getAllListings();
      const listingIndex = allListings.findIndex(listing => listing.id === updatedListing.id);
      
      if (listingIndex !== -1) {
        updatedListing.updatedAt = new Date().toISOString();
        allListings[listingIndex] = updatedListing;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allListings));
        this.clearCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating listing:', error);
      return false;
    }
  }

  // Update listing status
  static updateListingStatus(id: string, status: StoredListing['status']): boolean {
    try {
      const allListings = this.getAllListings();
      const listingIndex = allListings.findIndex(listing => listing.id === id);
      
      if (listingIndex !== -1) {
        allListings[listingIndex].status = status;
        allListings[listingIndex].updatedAt = new Date().toISOString();
        
        // Set end time if timer is activated
        if (status === 'timer_active') {
          const endTime = new Date();
          endTime.setMinutes(endTime.getMinutes() + allListings[listingIndex].timerDuration);
          allListings[listingIndex].endTime = endTime.toISOString();
          allListings[listingIndex].isHot = true;
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allListings));
        this.clearCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating listing status:', error);
      return false;
    }
  }

  // Delete listing
  static deleteListing(id: string): boolean {
    try {
      const allListings = this.getAllListings();
      const filteredListings = allListings.filter(listing => listing.id !== id);
      
      if (filteredListings.length !== allListings.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredListings));
        this.clearCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting listing:', error);
      return false;
    }
  }

  // Get seller's listings with pagination
  static getSellerListings(sellerId: string, page: number = 0, limit: number = 20): { listings: StoredListing[]; total: number; hasMore: boolean } {
    const cacheKey = `seller_${sellerId}_${page}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const allListings = this.getAllListings();
    const sellerListings = allListings.filter(listing => listing.sellerId === sellerId);
    
    const total = sellerListings.length;
    const startIndex = page * limit;
    const listings = sellerListings.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;
    
    const result = { listings, total, hasMore };
    this.setCache(cacheKey, result);
    return result;
  }

  // Search listings
  static searchListings(
    query: string, 
    categoryId?: string, 
    page: number = 0, 
    limit: number = 20
  ): { listings: StoredListing[]; total: number; hasMore: boolean } {
    const cacheKey = `search_${query}_${categoryId || 'all'}_${page}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let allListings = this.getAllListings();
    
    // Filter by category if specified
    if (categoryId && categoryId !== 'all') {
      allListings = allListings.filter(listing => listing.categoryId === categoryId);
    }
    
    // Search in title, description, and tags
    const searchTerm = query.toLowerCase();
    const searchResults = allListings.filter(listing => 
      listing.title.toLowerCase().includes(searchTerm) ||
      listing.description.toLowerCase().includes(searchTerm) ||
      listing.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      listing.categoryName.toLowerCase().includes(searchTerm)
    );
    
    // Sort by relevance (title matches first, then description, then tags)
    searchResults.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(searchTerm) ? 3 : 0;
      const aDesc = a.description.toLowerCase().includes(searchTerm) ? 2 : 0;
      const aTags = a.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ? 1 : 0;
      const aRelevance = aTitle + aDesc + aTags;
      
      const bTitle = b.title.toLowerCase().includes(searchTerm) ? 3 : 0;
      const bDesc = b.description.toLowerCase().includes(searchTerm) ? 2 : 0;
      const bTags = b.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ? 1 : 0;
      const bRelevance = bTitle + bDesc + bTags;
      
      return bRelevance - aRelevance;
    });
    
    const total = searchResults.length;
    const startIndex = page * limit;
    const listings = searchResults.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;
    
    const result = { listings, total, hasMore };
    this.setCache(cacheKey, result);
    return result;
  }

  // Get hot listings (timer active with less than 2 hours remaining)
  static getHotListings(limit: number = 10): StoredListing[] {
    const cacheKey = `hot_listings_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const allListings = this.getAllListings();
    const now = new Date();
    
    const hotListings = allListings
      .filter(listing => {
        if (listing.status !== 'timer_active' || !listing.endTime) return false;
        const endTime = new Date(listing.endTime);
        const timeRemaining = endTime.getTime() - now.getTime();
        return timeRemaining > 0 && timeRemaining <= 2 * 60 * 60 * 1000; // 2 hours
      })
      .sort((a, b) => {
        const aEndTime = new Date(a.endTime!).getTime();
        const bEndTime = new Date(b.endTime!).getTime();
        return aEndTime - bEndTime; // Ending soonest first
      })
      .slice(0, limit);
    
    this.setCache(cacheKey, hotListings);
    return hotListings;
  }

  // Get statistics
  static getStatistics(): {
    totalListings: number;
    activeListings: number;
    timerActiveListings: number;
    totalViews: number;
    totalBids: number;
    averagePrice: number;
  } {
    const cacheKey = 'listing_statistics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const allListings = this.getAllListings();
    
    const stats = {
      totalListings: allListings.length,
      activeListings: allListings.filter(l => l.status === 'active').length,
      timerActiveListings: allListings.filter(l => l.status === 'timer_active').length,
      totalViews: allListings.reduce((sum, l) => sum + (l.viewCount || 0), 0),
      totalBids: allListings.reduce((sum, l) => sum + (l.totalBids || 0), 0),
      averagePrice: allListings.length > 0 
        ? allListings.reduce((sum, l) => sum + l.currentPrice, 0) / allListings.length 
        : 0
    };
    
    this.setCache(cacheKey, stats);
    return stats;
  }

  // Batch operations for better performance
  static batchUpdateListings(updates: { id: string; updates: Partial<StoredListing> }[]): boolean {
    try {
      const allListings = this.getAllListings();
      let hasChanges = false;
      
      updates.forEach(({ id, updates: listingUpdates }) => {
        const listingIndex = allListings.findIndex(listing => listing.id === id);
        if (listingIndex !== -1) {
          allListings[listingIndex] = { 
            ...allListings[listingIndex], 
            ...listingUpdates, 
            updatedAt: new Date().toISOString() 
          };
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allListings));
        this.clearCache();
      }
      
      return hasChanges;
    } catch (error) {
      console.error('Error batch updating listings:', error);
      return false;
    }
  }
}
