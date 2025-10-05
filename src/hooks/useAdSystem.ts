import { useState, useCallback } from 'react';
import { AdService } from '@/lib/services/adService';
import { useAuth } from '@/contexts/AuthContext';

export interface UseAdSystemReturn {
  showAd: boolean;
  adSettings: {
    duration: number;
    allowSkip: boolean;
    skipAfter: number;
  };
  startPracticeGame: (gameType: string) => boolean;
  handleAdComplete: () => void;
  handleAdSkip: () => void;
  resetAd: () => void;
}

export function useAdSystem(): UseAdSystemReturn {
  const { user } = useAuth();
  const [showAd, setShowAd] = useState(false);
  const [currentGameType, setCurrentGameType] = useState<string>('');
  const [adStartTime, setAdStartTime] = useState<number>(0);

  const adSettings = AdService.getPracticeAdSettings();

  const startPracticeGame = useCallback((gameType: string): boolean => {
    const userId = user?.id || 'anonymous';
    
    // Check if user should see an ad
    const shouldShow = AdService.shouldShowPracticeAd(userId, gameType);
    
    if (shouldShow) {
      setCurrentGameType(gameType);
      setShowAd(true);
      setAdStartTime(Date.now());
      console.log(`AdSystem: Showing ad for ${gameType} practice game`);
      return true; // Ad will be shown
    } else {
      // Increment count but don't show ad
      AdService.incrementPracticeCount(userId, gameType);
      return false; // No ad, proceed directly to game
    }
  }, [user]);

  const handleAdComplete = useCallback(async () => {
    const userId = user?.id || 'anonymous';
    const durationWatched = (Date.now() - adStartTime) / 1000;
    
    // Record the ad impression
    await AdService.recordAdImpression(
      'practice_game',
      durationWatched,
      true, // completed
      false, // not skipped
      userId,
      currentGameType
    );

    // Increment practice game count
    AdService.incrementPracticeCount(userId, currentGameType);

    // Hide ad and proceed to game
    setShowAd(false);
    setCurrentGameType('');
    setAdStartTime(0);
    
    console.log('AdSystem: Ad completed, starting game');
  }, [user, currentGameType, adStartTime]);

  const handleAdSkip = useCallback(async () => {
    const userId = user?.id || 'anonymous';
    const durationWatched = (Date.now() - adStartTime) / 1000;
    
    // Record the ad impression as skipped
    await AdService.recordAdImpression(
      'practice_game',
      durationWatched,
      false, // not completed
      true, // skipped
      userId,
      currentGameType
    );

    // Increment practice game count
    AdService.incrementPracticeCount(userId, currentGameType);

    // Hide ad and proceed to game
    setShowAd(false);
    setCurrentGameType('');
    setAdStartTime(0);
    
    console.log('AdSystem: Ad skipped, starting game');
  }, [user, currentGameType, adStartTime]);

  const resetAd = useCallback(() => {
    setShowAd(false);
    setCurrentGameType('');
    setAdStartTime(0);
  }, []);

  return {
    showAd,
    adSettings,
    startPracticeGame,
    handleAdComplete,
    handleAdSkip,
    resetAd
  };
}
