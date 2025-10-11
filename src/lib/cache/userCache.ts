/**
 * User Data Caching Layer
 * 
 * Reduces database queries by caching user data in memory
 * Handles millions of users efficiently
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class UserCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 10000; // Max items in cache

  constructor() {
    this.cache = new Map();
    
    // Cleanup expired entries every minute
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Invalidate cached data
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cached data for a user
   */
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 [Cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [Cache] Evicted oldest entry: ${oldestKey}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // Could track hits/misses for better monitoring
    };
  }
}

// Singleton instance
const userCache = new UserCache();

/**
 * Cache Keys Generator
 */
export const CacheKeys = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  userTokens: (userId: string) => `user:tokens:${userId}`,
  userTransactions: (userId: string) => `user:transactions:${userId}`,
  userGameHistory: (userId: string) => `user:games:${userId}`,
  userPurchaseHistory: (userId: string) => `user:purchases:${userId}`,
  userStatistics: (userId: string) => `user:stats:${userId}`,
  leaderboard: (gameType: string) => `leaderboard:${gameType}`,
};

/**
 * Cached User Service Wrapper
 * 
 * Wraps UserService calls with caching
 */
export class CachedUserService {
  /**
   * Get user profile with caching
   */
  static async getUserProfile(userId: string, userService: any) {
    const cacheKey = CacheKeys.userProfile(userId);
    
    // Try cache first
    const cached = userCache.get(cacheKey);
    if (cached) {
      console.log('✅ [Cache] Hit: User profile', userId);
      return cached;
    }
    
    // Cache miss - fetch from database
    console.log('⚠️ [Cache] Miss: User profile', userId);
    const profile = await userService.getUserProfile(userId);
    
    if (profile) {
      // Cache for 5 minutes
      userCache.set(cacheKey, profile, 5 * 60 * 1000);
    }
    
    return profile;
  }

  /**
   * Get user token transactions with caching
   */
  static async getUserTokenTransactions(userId: string, userService: any) {
    const cacheKey = CacheKeys.userTransactions(userId);
    
    const cached = userCache.get(cacheKey);
    if (cached) {
      console.log('✅ [Cache] Hit: Token transactions', userId);
      return cached;
    }
    
    console.log('⚠️ [Cache] Miss: Token transactions', userId);
    const transactions = await userService.getUserTokenTransactions(userId);
    
    // Cache for 2 minutes (transactions change frequently)
    userCache.set(cacheKey, transactions, 2 * 60 * 1000);
    
    return transactions;
  }

  /**
   * Get user game history with caching
   */
  static async getUserGameHistory(userId: string, userService: any) {
    const cacheKey = CacheKeys.userGameHistory(userId);
    
    const cached = userCache.get(cacheKey);
    if (cached) {
      console.log('✅ [Cache] Hit: Game history', userId);
      return cached;
    }
    
    console.log('⚠️ [Cache] Miss: Game history', userId);
    const games = await userService.getUserGameHistory(userId);
    
    // Cache for 5 minutes
    userCache.set(cacheKey, games, 5 * 60 * 1000);
    
    return games;
  }

  /**
   * Get user purchase history with caching
   */
  static async getUserPurchaseHistory(userId: string, userService: any) {
    const cacheKey = CacheKeys.userPurchaseHistory(userId);
    
    const cached = userCache.get(cacheKey);
    if (cached) {
      console.log('✅ [Cache] Hit: Purchase history', userId);
      return cached;
    }
    
    console.log('⚠️ [Cache] Miss: Purchase history', userId);
    const purchases = await userService.getUserPurchaseHistory(userId);
    
    // Cache for 5 minutes
    userCache.set(cacheKey, purchases, 5 * 60 * 1000);
    
    return purchases;
  }

  /**
   * Update user tokens and invalidate cache
   */
  static async updateUserTokens(userId: string, newTokenAmount: number, userService: any) {
    const result = await userService.updateUserTokens(userId, newTokenAmount);
    
    if (result) {
      // Invalidate all user caches since tokens changed
      userCache.invalidateUser(userId);
      console.log('🗑️ [Cache] Invalidated user cache after token update:', userId);
    }
    
    return result;
  }

  /**
   * Add token transaction and invalidate cache
   */
  static async addTokenTransaction(transaction: any, userService: any) {
    const result = await userService.addTokenTransaction(transaction);
    
    if (result) {
      // Invalidate transaction and profile caches
      userCache.invalidate(CacheKeys.userTransactions(transaction.userId));
      userCache.invalidate(CacheKeys.userProfile(transaction.userId));
      console.log('🗑️ [Cache] Invalidated after transaction:', transaction.userId);
    }
    
    return result;
  }

  /**
   * Save game history and invalidate cache
   */
  static async saveGameHistory(gameData: any, userService: any) {
    const result = await userService.saveGameHistory(gameData);
    
    if (result) {
      // Invalidate game history cache
      userCache.invalidate(CacheKeys.userGameHistory(gameData.userId));
      userCache.invalidate(CacheKeys.userProfile(gameData.userId));
      console.log('🗑️ [Cache] Invalidated after game:', gameData.userId);
    }
    
    return result;
  }

  /**
   * Save purchase history and invalidate cache
   */
  static async savePurchaseHistory(purchaseData: any, userService: any) {
    const result = await userService.savePurchaseHistory(purchaseData);
    
    if (result) {
      // Invalidate purchase history cache
      userCache.invalidate(CacheKeys.userPurchaseHistory(purchaseData.userId));
      userCache.invalidate(CacheKeys.userProfile(purchaseData.userId));
      console.log('🗑️ [Cache] Invalidated after purchase:', purchaseData.userId);
    }
    
    return result;
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return userCache.getStats();
  }

  /**
   * Clear all cache (useful for debugging)
   */
  static clearCache() {
    userCache.clear();
    console.log('🗑️ [Cache] All cache cleared');
  }
}

export default userCache;

