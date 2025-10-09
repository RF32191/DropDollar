// Ad Service - Manages advertisement display and tracking
// Integrates with Supabase for ad impression tracking

import { supabase } from '@/lib/supabase/client';

export interface AdImpression {
  id: string;
  user_id?: string;
  ad_type: 'practice_game' | 'banner' | 'interstitial';
  game_type?: string;
  viewed_at: string;
  duration_watched: number;
  completed: boolean;
  skipped: boolean;
  ip_address?: string;
  user_agent?: string;
}

export interface AdConfig {
  enabled: boolean;
  practiceGameAds: {
    enabled: boolean;
    duration: number;
    allowSkip: boolean;
    skipAfter: number;
    frequency: 'every_game' | 'every_3_games' | 'every_5_games';
  };
  bannerAds: {
    enabled: boolean;
    positions: string[];
  };
  tokenRewards: {
    enabled: boolean;
    tokensPerAd: number;
    adsPerToken: number;
  };
}

export class AdService {
  private static config: AdConfig = {
    enabled: true,
    practiceGameAds: {
      enabled: true,
      duration: 10,
      allowSkip: true,
      skipAfter: 3,
      frequency: 'every_game' // Reverted to original
    },
    bannerAds: {
      enabled: true,
      positions: ['header', 'sidebar', 'footer']
    },
    tokenRewards: {
      enabled: true,
      tokensPerAd: 0.1, // 1 token per 10 ads
      adsPerToken: 10
    }
  };

  private static practiceGameCount: Map<string, number> = new Map();

  // Initialize ad service
  static init() {
    console.log('AdService: Initialized');
    this.loadConfig();
  }

  // Load ad configuration (could be from Supabase in the future)
  private static async loadConfig() {
    try {
      // For now, use default config
      // In the future, this could load from Supabase settings
      console.log('AdService: Config loaded');
    } catch (error) {
      console.error('AdService: Failed to load config:', error);
    }
  }

  // Check if user should see an ad before practice game
  static shouldShowPracticeAd(userId: string, gameType: string): boolean {
    if (!this.config.enabled || !this.config.practiceGameAds.enabled) {
      return false;
    }

    const userKey = `${userId}_${gameType}`;
    const currentCount = this.practiceGameCount.get(userKey) || 0;

    switch (this.config.practiceGameAds.frequency) {
      case 'every_game':
        return true;
      case 'every_3_games':
        return currentCount % 3 === 0;
      case 'every_5_games':
        return currentCount % 5 === 0;
      default:
        return true;
    }
  }

  // Increment practice game count for user
  static incrementPracticeCount(userId: string, gameType: string) {
    const userKey = `${userId}_${gameType}`;
    const currentCount = this.practiceGameCount.get(userKey) || 0;
    this.practiceGameCount.set(userKey, currentCount + 1);
  }

  // Record ad impression
  static async recordAdImpression(
    adType: 'practice_game' | 'banner' | 'interstitial',
    durationWatched: number,
    completed: boolean,
    skipped: boolean,
    userId?: string,
    gameType?: string
  ): Promise<void> {
    try {
      const impression: Partial<AdImpression> = {
        user_id: userId,
        ad_type: adType,
        game_type: gameType,
        viewed_at: new Date().toISOString(),
        duration_watched: durationWatched,
        completed: completed,
        skipped: skipped,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent
      };

      const { error } = await supabase
        .from('ad_impressions')
        .insert(impression);

      if (error) {
        console.error('AdService: Failed to record impression:', error);
      } else {
        console.log('AdService: Recorded ad impression:', adType);
        
        // Award tokens if applicable
        if (completed && this.config.tokenRewards.enabled) {
          await this.awardTokens(userId, adType);
        }
      }
    } catch (error) {
      console.error('AdService: Error recording ad impression:', error);
    }
  }

  // Award tokens for watching ads
  private static async awardTokens(userId?: string, adType?: string) {
    if (!userId) return;

    try {
      // Get user's current ad count for token calculation
      const { data: impressions, error } = await supabase
        .from('ad_impressions')
        .select('id')
        .eq('user_id', userId)
        .eq('completed', true);

      if (error) {
        console.error('AdService: Failed to get user impressions:', error);
        return;
      }

      const totalAdsWatched = impressions?.length || 0;
      const tokensEarned = Math.floor(totalAdsWatched / this.config.tokenRewards.adsPerToken);
      
      if (totalAdsWatched % this.config.tokenRewards.adsPerToken === 0 && tokensEarned > 0) {
        // Award token (this would integrate with your token system)
        console.log(`AdService: User ${userId} earned ${this.config.tokenRewards.tokensPerAd} tokens!`);
        
        // You could emit an event or call a token service here
        // TokenService.awardTokens(userId, this.config.tokenRewards.tokensPerAd, 'ad_reward');
      }
    } catch (error) {
      console.error('AdService: Error awarding tokens:', error);
    }
  }

  // Get client IP address (for analytics)
  private static async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('AdService: Could not get client IP:', error);
      return undefined;
    }
  }

  // Get ad configuration
  static getConfig(): AdConfig {
    return { ...this.config };
  }

  // Update ad configuration
  static updateConfig(newConfig: Partial<AdConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('AdService: Config updated');
  }

  // Get practice game ad settings
  static getPracticeAdSettings() {
    return {
      duration: this.config.practiceGameAds.duration,
      allowSkip: this.config.practiceGameAds.allowSkip,
      skipAfter: this.config.practiceGameAds.skipAfter
    };
  }

  // Check if banner ads should be shown
  static shouldShowBannerAd(position: string): boolean {
    return (
      this.config.enabled &&
      this.config.bannerAds.enabled &&
      this.config.bannerAds.positions.includes(position)
    );
  }

  // Get user's ad statistics
  static async getUserAdStats(userId: string) {
    try {
      const { data: impressions, error } = await supabase
        .from('ad_impressions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('AdService: Failed to get user ad stats:', error);
        return null;
      }

      const totalAds = impressions?.length || 0;
      const completedAds = impressions?.filter(imp => imp.completed).length || 0;
      const skippedAds = impressions?.filter(imp => imp.skipped).length || 0;
      const tokensEarned = Math.floor(completedAds / this.config.tokenRewards.adsPerToken) * this.config.tokenRewards.tokensPerAd;

      return {
        totalAds,
        completedAds,
        skippedAds,
        tokensEarned,
        completionRate: totalAds > 0 ? (completedAds / totalAds) * 100 : 0
      };
    } catch (error) {
      console.error('AdService: Error getting user ad stats:', error);
      return null;
    }
  }

  // Enable/disable ads
  static setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    console.log(`AdService: Ads ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Set practice game ad frequency
  static setPracticeAdFrequency(frequency: 'every_game' | 'every_3_games' | 'every_5_games') {
    this.config.practiceGameAds.frequency = frequency;
    console.log(`AdService: Practice ad frequency set to ${frequency}`);
  }
}

// Initialize ad service
if (typeof window !== 'undefined') {
  AdService.init();
}
