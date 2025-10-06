'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MultiTargetGame from '@/components/games/MultiTargetGame';
import FallingObjectGame from '@/components/games/FallingObjectGame';
import ColorSequenceGame from '@/components/games/ColorSequenceGame';
import LaserDodgeGame from '@/components/games/LaserDodgeGame';
import AdOverlay from '@/components/ads/AdOverlay';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAdSystem } from '@/hooks/useAdSystem';
import { useGameLocationGuard } from '@/hooks/useLocationGuard';
import { GameScoreService, type GameScore } from '@/lib/supabase/gameScores';
import { LocationService, type LocationData } from '@/lib/locationService';
import { 
  PuzzlePieceIcon, 
  CursorArrowRaysIcon, 
  MusicalNoteIcon, 
  DevicePhoneMobileIcon,
  ClockIcon,
  TrophyIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const GAMES = [
  {
    id: 'multi-target',
    name: 'Multi-Target Reaction',
    description: 'Click the correct highlighted target among multiple shapes',
    icon: CursorArrowRaysIcon,
    difficulty: 'Easy',
    avgTime: '60s',
    skills: ['Visual Processing', 'Speed', 'Accuracy'],
    component: MultiTargetGame
  },
  {
    id: 'falling-objects',
    name: 'Falling Object Catch',
    description: 'Catch coins and dollars with your cash case using realistic physics',
    icon: DevicePhoneMobileIcon,
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Coordination', 'Physics', 'Prediction'],
    component: FallingObjectGame
  },
  {
    id: 'color-sequence',
    name: 'Color Sequence Memory',
    description: 'Remember color sequences with unique audio cues',
    icon: PuzzlePieceIcon,
    difficulty: 'Medium',
    avgTime: '90s',
    skills: ['Audio-Visual Memory', 'Sequential Processing', 'Multi-Sensory'],
    component: ColorSequenceGame
  },
  {
    id: 'laser-dodge',
    name: 'Laser Dodge',
    description: 'Pilot your ship to dodge dangerous red lasers in this survival game',
    icon: BoltIcon,
    difficulty: 'Hard',
    avgTime: '∞',
    skills: ['Reflexes', 'Survival', 'Mobile-Friendly'],
    component: LaserDodgeGame
  }
];

// Debug: Log games array to ensure Laser Dodge is included
console.log('🎮 Available games for deployment:', GAMES.map(g => `${g.name} (${g.id})`));
console.log('🚀 Laser Dodge game included:', GAMES.find(g => g.id === 'laser-dodge') ? '✅ YES' : '❌ NO');

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime?: number;
  avgTiming?: number;
}

interface GamePopularity {
  gameId: string;
  timesPlayed: number;
  timesUsedInListings: number;
  avgScore: number;
  popularityScore: number;
}

export default function GamesPage() {
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId');
  const entryNumber = parseInt(searchParams.get('entryNumber') || '1');
  const isCompetitionMode = !!listingId;
  const { user } = useAuth();
  const locationGuard = useGameLocationGuard();
  
  // Ad System Integration
  const { 
    showAd, 
    adSettings, 
    startPracticeGame, 
    handleAdComplete, 
    handleAdSkip, 
    resetAd 
  } = useAdSystem();

  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [gameResults, setGameResults] = useState<GameResult | null>(null);
  const [practiceAttempts, setPracticeAttempts] = useState<{[key: string]: number}>({});
  const [bestScores, setBestScores] = useState<{[key: string]: number}>({});
  const [gamePopularity, setGamePopularity] = useState<{[key: string]: GamePopularity}>({});
  const [showPopularityStats, setShowPopularityStats] = useState(false);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const [showSponsoredListings, setShowSponsoredListings] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [pendingGameStart, setPendingGameStart] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Check location permission before allowing game access
  const checkLocationBeforeGame = (gameId: string) => {
    if (locationGuard.needsLocationModal()) {
      setShowLocationModal(true);
      setPendingGameStart(gameId);
      return false;
    }
    
    if (!locationGuard.canAccessGames()) {
      // Location is restricted
      return false;
    }
    
    // Location is verified and allowed, proceed with game
    return true;
  };

  const handleLocationVerified = (location: LocationData) => {
    console.log('📍 Location verified:', location);
    setShowLocationModal(false);
    if (pendingGameStart) {
      console.log('🎮 Continuing with pending game after location verification');
      // Now proceed with the normal game flow (including ads)
      proceedWithGameStart(pendingGameStart);
      setPendingGameStart(null);
    }
  };

  const handleLocationDenied = (reason: string) => {
    setShowLocationModal(false);
    setPendingGameStart(null);
    // User will see the restriction message in the UI
  };

  // Load practice data and scores
  useEffect(() => {
    // Remove practice attempt limitations - allow unlimited practice
    const unlimitedAttempts: {[key: string]: number} = {};
    GAMES.forEach(game => {
      unlimitedAttempts[game.id] = 999; // Effectively unlimited
    });
    setPracticeAttempts(unlimitedAttempts);

    // Load scores from Supabase if user is logged in, otherwise from localStorage
    const loadScores = async () => {
      if (user?.id) {
        setIsLoadingScores(true);
        try {
          const userBestScores = await GameScoreService.getUserBestScores(user.id);
          const scoresMap: {[key: string]: number} = {};
          
          userBestScores.forEach(score => {
            scoresMap[score.game_type] = score.best_score;
          });
          
          setBestScores(scoresMap);
          
          // Sync any local scores to Supabase if they exist
          const savedScores = localStorage.getItem('bestScores');
          if (savedScores) {
            try {
              const localScores = JSON.parse(savedScores);
              await GameScoreService.syncLocalScores(user.id, localScores);
              // Clear local storage after sync
              localStorage.removeItem('bestScores');
            } catch (error) {
              console.error('Error syncing local scores:', error);
            }
          }
        } catch (error) {
          console.error('Error loading scores from Supabase:', error);
          // Fallback to localStorage
          const savedScores = localStorage.getItem('bestScores');
          if (savedScores) {
            try {
              const parsedScores = JSON.parse(savedScores);
              setBestScores(parsedScores);
            } catch (error) {
              console.error('Error parsing saved scores:', error);
              setBestScores({});
            }
          }
        } finally {
          setIsLoadingScores(false);
        }
      } else {
        // Load from localStorage for non-logged-in users
        const savedScores = localStorage.getItem('bestScores');
        if (savedScores) {
          try {
            const parsedScores = JSON.parse(savedScores);
            setBestScores(parsedScores);
          } catch (error) {
            console.error('Error parsing saved scores:', error);
            setBestScores({});
          }
        }
      }
    };

    loadScores();

    // Load popularity data - always reinitialize to ensure only 3 games
    const savedPopularity = localStorage.getItem('gamePopularity');
    let currentPopularity: {[key: string]: GamePopularity} = {};
    
    if (savedPopularity) {
      const parsed = JSON.parse(savedPopularity);
      // Only keep data for games that actually exist
      GAMES.forEach(game => {
        if (parsed[game.id]) {
          currentPopularity[game.id] = parsed[game.id];
        } else {
          // Initialize missing games
          currentPopularity[game.id] = {
            gameId: game.id,
            timesPlayed: 0,
            timesUsedInListings: 0,
            avgScore: 0,
            popularityScore: 0
          };
        }
      });
    } else {
      // Initialize popularity data with minimal values (you're the only user)
      GAMES.forEach(game => {
        currentPopularity[game.id] = {
          gameId: game.id,
          timesPlayed: 0, // No plays yet
          timesUsedInListings: 0, // No listings yet
          avgScore: 0, // No scores yet
          popularityScore: 0 // Will be calculated
        };
      });
    }
    
    // Calculate popularity scores for all games
    Object.values(currentPopularity).forEach(pop => {
      pop.popularityScore = (pop.timesPlayed * 0.4) + (pop.timesUsedInListings * 0.6);
    });
    
    setGamePopularity(currentPopularity);
    localStorage.setItem('gamePopularity', JSON.stringify(currentPopularity));
    
    // Calculate total games played and check if sponsored listings should show
    const totalPlayed = Object.values(currentPopularity).reduce((sum, pop) => sum + pop.timesPlayed, 0);
    setTotalGamesPlayed(totalPlayed);
    setShowSponsoredListings(totalPlayed >= 3);
  }, [user]);

  const handleGameStart = (gameId: string) => {
    console.log('🎮 Game start requested:', gameId);
    
    // First check location permission for all game modes
    if (!checkLocationBeforeGame(gameId)) {
      console.log('📍 Location check required, showing modal');
      return; // Location check failed, modal will be shown or user is restricted
    }

    // Location is verified, now proceed with normal flow
    proceedWithGameStart(gameId);
  };

  // Proceed with game start after location is verified
  const proceedWithGameStart = (gameId: string) => {
    console.log('✅ Location verified, proceeding with game start:', gameId);
    
    // For competition mode, start immediately without ads
    if (isCompetitionMode) {
      console.log('🏆 Competition mode - starting game immediately');
      setCurrentGame(gameId);
      setGameResults(null);
      return;
    }

    // For practice mode, check if ad should be shown
    console.log('🎮 Practice mode - checking ad system');
    const shouldShowAd = startPracticeGame(gameId);
    
    if (shouldShowAd) {
      console.log('📺 Ad should be shown, storing pending game');
      // Ad will be shown, store the pending game
      setPendingGameStart(gameId);
    } else {
      console.log('🚀 No ad needed, starting game immediately');
      // No ad, start game immediately
      setCurrentGame(gameId);
      setGameResults(null);
    }
  };

  // New function to start game after location verification
  const startGame = (gameId: string) => {
    setCurrentGame(gameId);
    setGameResults(null);
  };

  // Handle ad completion and start the pending game
  const handleAdCompleteAndStartGame = () => {
    handleAdComplete();
    if (pendingGameStart) {
      setCurrentGame(pendingGameStart);
      setPendingGameStart(null);
      setGameResults(null);
    }
  };

  // Handle ad skip and start the pending game
  const handleAdSkipAndStartGame = () => {
    handleAdSkip();
    if (pendingGameStart) {
      setCurrentGame(pendingGameStart);
      setPendingGameStart(null);
      setGameResults(null);
    }
  };

  const handleGameEnd = async (result: GameResult) => {
    if (!currentGame) return;

    setGameResults(result);
    
    // Save score to Supabase if user is logged in
    if (user?.id) {
      try {
        await GameScoreService.saveGameScore({
          user_id: user.id,
          game_type: currentGame as GameScore['game_type'],
          score: result.score,
          accuracy: result.accuracy,
          avg_reaction_time: result.avgReactionTime,
          game_duration: 60, // Default game duration
          is_practice: !isCompetitionMode,
          listing_id: listingId || undefined,
          entry_number: isCompetitionMode ? entryNumber : undefined,
          metadata: {
            timestamp: new Date().toISOString(),
            game_version: '1.0'
          }
        });

        // Reload best scores from Supabase to get updated data
        const userBestScores = await GameScoreService.getUserBestScores(user.id);
        const scoresMap: {[key: string]: number} = {};
        
        userBestScores.forEach(score => {
          scoresMap[score.game_type] = score.best_score;
        });
        
        setBestScores(scoresMap);
      } catch (error) {
        console.error('Error saving score to Supabase:', error);
        // Fallback to localStorage
        const currentBest = bestScores[currentGame] || 0;
        if (result.score > currentBest) {
          const newBestScores = {
            ...bestScores,
            [currentGame]: result.score
          };
          setBestScores(newBestScores);
          try {
            localStorage.setItem('bestScores', JSON.stringify(newBestScores));
          } catch (error) {
            console.error('Error saving best scores to localStorage:', error);
          }
        }
      }
    } else {
      // Save to localStorage for non-logged-in users
      const currentBest = bestScores[currentGame] || 0;
      if (result.score > currentBest) {
        const newBestScores = {
          ...bestScores,
          [currentGame]: result.score
        };
        setBestScores(newBestScores);
        try {
          localStorage.setItem('bestScores', JSON.stringify(newBestScores));
        } catch (error) {
          console.error('Error saving best scores to localStorage:', error);
        }
      }
    }

    // Update game popularity stats (increment play count and update average score)
    const updatedPopularity = { ...gamePopularity };
    if (updatedPopularity[currentGame]) {
      const currentStats = updatedPopularity[currentGame];
      const newTimesPlayed = currentStats.timesPlayed + 1;
      const newAvgScore = ((currentStats.avgScore * currentStats.timesPlayed) + result.score) / newTimesPlayed;
      
      updatedPopularity[currentGame] = {
        ...currentStats,
        timesPlayed: newTimesPlayed,
        avgScore: newAvgScore,
        popularityScore: (newTimesPlayed * 0.4) + (currentStats.timesUsedInListings * 0.6)
      };
      
      setGamePopularity(updatedPopularity);
      localStorage.setItem('gamePopularity', JSON.stringify(updatedPopularity));
      
      // Update total games played counter
      const newTotalPlayed = Object.values(updatedPopularity).reduce((sum, pop) => sum + pop.timesPlayed, 0);
      setTotalGamesPlayed(newTotalPlayed);
      setShowSponsoredListings(newTotalPlayed >= 3);
    }

  };

  const handleGameExit = () => {
    setCurrentGame(null);
    setGameResults(null);
  };

  const getCurrentGameComponent = () => {
    if (!currentGame) return null;
    
    const game = GAMES.find(g => g.id === currentGame);
    if (!game) return null;

    const GameComponent = game.component;
    console.log('Rendering game:', currentGame, 'Component:', GameComponent);
    
    try {
      return (
        <GameComponent
          onGameEnd={handleGameEnd}
          onExit={handleGameExit}
          listingId={listingId || undefined}
          entryNumber={entryNumber}
        />
      );
    } catch (error) {
      console.error('Error rendering game component:', error);
      return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-red-600 text-xl font-bold mb-4">Game Error</div>
            <div className="text-gray-600 mb-4">Failed to load {game.name}</div>
            <button 
              onClick={handleGameExit}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Games
            </button>
          </div>
        </div>
      );
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <>
      {/* Game Components */}
      {getCurrentGameComponent()}
      
      {/* Results Modal */}
      {gameResults && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center transition-colors">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
              🎮 Game Complete!
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between">
                <span className="text-gray-600">Score:</span>
                <span className="font-bold text-green-600">{gameResults.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accuracy:</span>
                <span className="font-bold text-blue-600">{gameResults.accuracy.toFixed(1)}%</span>
              </div>
              {gameResults.avgReactionTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Reaction:</span>
                  <span className="font-bold text-purple-600">{gameResults.avgReactionTime.toFixed(0)}ms</span>
                </div>
              )}
              {gameResults.avgTiming && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Timing:</span>
                  <span className="font-bold text-yellow-600">{gameResults.avgTiming.toFixed(0)}ms</span>
                </div>
              )}
            </div>

            {bestScores[currentGame!] === gameResults.score && gameResults.score > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <div className="text-yellow-800 font-bold">🏆 New Best Score!</div>
              </div>
            )}

            <div className="text-sm text-gray-600 mb-6">
              Practice Mode: Unlimited attempts available
            </div>

            <button
              onClick={handleGameExit}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Continue Practicing
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Location Restriction Banner */}
      {locationGuard.hasChecked && !locationGuard.canAccessGames() && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b-4 border-red-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">
                  Games Not Available in Your Location
                </h3>
                <p className="text-red-700 dark:text-red-400 mb-4">
                  {locationGuard.getBlockingReason() || 'Skill-based gaming competitions are not available in your current location due to legal regulations.'}
                </p>
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">What you can still do:</h4>
                  <ul className="text-red-700 dark:text-red-400 text-sm space-y-1">
                    <li>• Browse our marketplace and view product listings</li>
                    <li>• Learn about our platform and how it works</li>
                    <li>• Contact customer support for assistance</li>
                    <li>• Sign up for updates about expanded availability</li>
                  </ul>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link 
                    href="/listings" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Browse Marketplace
                  </Link>
                  <Link 
                    href="/how-it-works" 
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Verification Status */}
      {locationGuard.hasChecked && locationGuard.location && locationGuard.canAccessGames() && (
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-300 font-medium">
                  Location verified: {locationGuard.getComplianceMessage()}
                </span>
              </div>
              <button
                onClick={() => locationGuard.clearLocation()}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                Update Location
              </button>
            </div>
          </div>
        </div>
      )}
      {/* GAMING Header */}
      <header className="bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 dark:from-purple-950 dark:via-indigo-900 dark:to-purple-950 shadow-2xl border-b-4 border-purple-500/50 transition-all duration-300 relative overflow-hidden">
        {/* Animated Gaming Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-10 right-1/3 w-24 h-24 bg-pink-500/40 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        </div>
        <div className="max-w-8xl mx-auto px-3 lg:px-4 relative z-10">
          <div className="flex justify-between items-center py-3">
            {/* Logo Section */}
            <Link href="/" className="flex items-center space-x-4 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 via-pink-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-purple-500/25 transition-all duration-300 group-hover:scale-105">
                  <img 
                    src="/DropCoin.png" 
                    alt="DropDollar Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  DropDollar
                </span>
                <span className="text-xs text-gray-400 font-medium tracking-wide">PRACTICE GAMES</span>
              </div>
            </Link>

            {/* GAMING Navigation - Accessible Layout */}
            <div className="flex items-center justify-center flex-1 mx-4">
              <nav className="hidden lg:flex items-center space-x-4">
                {/* Primary Navigation */}
                <div className="flex items-center space-x-2">
                  <Link href="/listings" className="relative group px-2 py-2 text-purple-200 hover:text-white font-medium transition-all duration-300 text-sm">
                    <span className="relative z-10">Browse</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                  <Link href="/categories" className="relative group px-2 py-2 text-purple-200 hover:text-white font-medium transition-all duration-300 text-sm">
                    <span className="relative z-10">Categories</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                  <Link href="/how-it-works" className="relative group px-2 py-2 text-purple-200 hover:text-white font-medium transition-all duration-300 text-sm">
                    <span className="relative z-10">How It Works</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                </div>

                {/* GAMES - Center Focus */}
                <div className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-purple-600/60 to-pink-600/60 rounded-xl border-2 border-purple-400/50 backdrop-blur-sm shadow-lg shadow-purple-500/25">
                  <Link href="/games" className="relative group px-3 py-1 text-purple-100 hover:text-white font-bold transition-all duration-300 flex items-center space-x-1 bg-gradient-to-r from-purple-500/40 to-pink-500/40 rounded-lg border border-purple-300/30 text-xs">
                    <span className="animate-pulse">🎮</span>
                    <span className="relative z-10">GAMES</span>
                  </Link>
                  <Link href="/tournaments" className="relative group px-2 py-1 text-yellow-200 hover:text-white font-bold transition-all duration-300 flex items-center space-x-1 text-xs">
                    <span>🏆</span>
                    <span className="relative z-10">Tournaments</span>
                  </Link>
                  <Link href="/hot-sell" className="relative group px-2 py-1 text-red-200 hover:text-white font-bold transition-all duration-300 flex items-center space-x-1 text-xs">
                    <span>🔥</span>
                    <span className="relative z-10">Hot Sell</span>
                  </Link>
                </div>

                {/* Secondary Navigation */}
                <div className="flex items-center space-x-2">
                  <Link href="/tournament-results" className="relative group px-2 py-2 text-cyan-200 hover:text-white font-medium transition-all duration-300 flex items-center space-x-1 text-sm">
                    <span>📊</span>
                    <span className="relative z-10">Results</span>
                  </Link>
                  <Link href="/buy-tokens" className="relative group px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold rounded-lg transition-all duration-300 flex items-center space-x-1 shadow-lg hover:shadow-green-500/30 hover:scale-105 text-sm">
                    <span>💰</span>
                    <span>Tokens</span>
                  </Link>
                </div>
              </nav>
            </div>

            {/* User Actions - Always Visible */}
            <div className="flex items-center space-x-2">
              <Link href="/settings" className="hidden md:flex items-center space-x-1 px-2 py-2 text-gray-400 hover:text-white transition-colors duration-300 text-sm">
                <span>⚙️</span>
                <span>Settings</span>
              </Link>
              
              <Link href="/auth/login" className="px-3 py-2 text-purple-200 hover:text-white font-medium transition-colors duration-300 text-sm">
                Sign In
              </Link>
              <Link href="/auth/register" className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                Sign Up
              </Link>
              <Link href="/seller/apply" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm">
                Sell
              </Link>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden pb-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Link href="/games" className="px-3 py-1.5 bg-purple-600/30 text-purple-300 rounded-lg text-sm font-medium border border-purple-500/30">🎮 Games</Link>
              <Link href="/tournaments" className="px-3 py-1.5 bg-yellow-600/20 text-yellow-300 rounded-lg text-sm font-medium">🏆 Tournaments</Link>
              <Link href="/hot-sell" className="px-3 py-1.5 bg-red-600/20 text-red-300 rounded-lg text-sm font-medium">🔥 Hot Sell</Link>
              <Link href="/listings" className="px-3 py-1.5 bg-gray-600/20 text-gray-300 rounded-lg text-sm font-medium">Browse</Link>
              <Link href="/buy-tokens" className="px-3 py-1.5 bg-green-600/20 text-green-300 rounded-lg text-sm font-medium">💰 Tokens</Link>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isCompetitionMode ? '🏆 Competition Mode' : '🎮 Practice Gaming Arena'}
          </h1>
          <p className="text-lg font-bold text-green-600 mb-4 italic">
            "Don't drop out, drop a dollar."
          </p>
          {isCompetitionMode ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-3xl mx-auto">
              <p className="text-lg text-red-800 font-bold">
                🏆 COMPETITION MODE ACTIVE
              </p>
              <p className="text-red-700">
                Listing ID: <code className="bg-red-100 px-2 py-1 rounded">{listingId}</code> | 
                Entry #{entryNumber}
              </p>
              <p className="text-sm text-red-600 mt-2">
                All players get the same game sequence for fair competition!
              </p>
            </div>
          ) : (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
              Master all 3 skill-based games before entering real competitions. 
              Practice <strong className="text-green-600">unlimited times</strong> to perfect your skills!
            </p>
          )}
          <button
            onClick={() => setShowPopularityStats(!showPopularityStats)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {showPopularityStats ? 'Hide' : 'Show'} Game Popularity Trends 📊
          </button>
        </div>

        {/* Sponsor Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-8 text-white text-center shadow-lg">
          <div className="flex items-center justify-center space-x-4">
            <div className="text-2xl">🚀</div>
            <div>
              <h3 className="text-xl font-bold mb-1">Sponsored by Your Brand Here</h3>
              <p className="text-purple-100 text-sm">
                Reach thousands of skilled gamers • Premium placement • High engagement
              </p>
            </div>
            <div className="text-2xl">💎</div>
          </div>
          <div className="mt-4">
            <a 
              href="#sponsor-contact" 
              className="bg-white text-purple-600 hover:bg-purple-50 font-bold py-2 px-6 rounded-lg transition-colors inline-block"
            >
              Become a Sponsor
            </a>
          </div>
        </div>

        {/* Popularity Stats */}
        {showPopularityStats && (
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              📊 Game Popularity Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Most Popular Games */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Most Popular Games</h3>
                <div className="space-y-3">
                  {Object.values(gamePopularity)
                    .sort((a, b) => b.popularityScore - a.popularityScore)
                    .slice(0, 3)
                    .map((pop, index) => {
                      const game = GAMES.find(g => g.id === pop.gameId);
                      return (
                        <div key={pop.gameId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                            </span>
                            <span className="font-medium">{game?.name}</span>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>{pop.timesPlayed.toLocaleString()} plays</div>
                            <div>{pop.timesUsedInListings.toLocaleString()} listings</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Highest Scoring Games */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">⭐ Highest Avg Scores</h3>
                <div className="space-y-3">
                  {Object.values(gamePopularity)
                    .sort((a, b) => b.avgScore - a.avgScore)
                    .slice(0, 3)
                    .map((pop, index) => {
                      const game = GAMES.find(g => g.id === pop.gameId);
                      return (
                        <div key={pop.gameId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">
                              {index === 0 ? '🌟' : index === 1 ? '⭐' : index === 2 ? '✨' : `${index + 1}.`}
                            </span>
                            <span className="font-medium">{game?.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-green-600">{pop.avgScore.toFixed(1)}</span>
                            <span className="text-sm text-gray-500 ml-1">avg</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Popularity Insights */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📈 Popularity Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <strong>Most Practiced:</strong> {Object.values(gamePopularity)
                    .sort((a, b) => b.timesPlayed - a.timesPlayed)[0] ? 
                    GAMES.find(g => g.id === Object.values(gamePopularity)
                      .sort((a, b) => b.timesPlayed - a.timesPlayed)[0].gameId)?.name : 'N/A'}
                </div>
                <div>
                  <strong>Most Used in Listings:</strong> {Object.values(gamePopularity)
                    .sort((a, b) => b.timesUsedInListings - a.timesUsedInListings)[0] ? 
                    GAMES.find(g => g.id === Object.values(gamePopularity)
                      .sort((a, b) => b.timesUsedInListings - a.timesUsedInListings)[0].gameId)?.name : 'N/A'}
                </div>
                <div>
                  <strong>Highest Skill Ceiling:</strong> {Object.values(gamePopularity)
                    .sort((a, b) => b.avgScore - a.avgScore)[0] ? 
                    GAMES.find(g => g.id === Object.values(gamePopularity)
                      .sort((a, b) => b.avgScore - a.avgScore)[0].gameId)?.name : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode Notice */}
        <div className={`${isCompetitionMode ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'} border-l-4 p-6 mb-8 rounded-r-lg`}>
          <div className="flex">
            <InformationCircleIcon className={`h-6 w-6 ${isCompetitionMode ? 'text-red-400' : 'text-blue-400'} mr-3 flex-shrink-0 mt-0.5`} />
            <div>
              {isCompetitionMode ? (
                <>
                  <h3 className="text-lg font-medium text-red-900 mb-2">🏆 Competition Mode Active</h3>
                  <p className="text-red-700">
                    You're playing in competition mode! All players get the same game sequence for fair play.
                    Your score will be compared against other competitors for this listing.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Unlimited Practice Mode</h3>
                  <p className="text-blue-700">
                    Practice as much as you want! Perfect your skills before entering $1-$3 competitions.
                    Your practice scores help you understand each game's mechanics and improve your strategy.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {GAMES.map((game) => {
            const IconComponent = game.icon;
            
            return (
              <div key={game.id} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-200">
                {/* Game Icon */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                
                {/* Game Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{game.name}</h3>
                <p className="text-gray-600 mb-4 text-sm text-center">{game.description}</p>
                
                {/* Game Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Difficulty:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(game.difficulty)}`}>
                      {game.difficulty}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Duration:</span>
                    <span className="text-gray-700 font-medium text-sm flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {game.avgTime}
                    </span>
                  </div>
                </div>
                
                {/* Skills */}
                <div className="mb-6">
                  <p className="text-gray-500 text-sm mb-2">Skills Tested:</p>
                  <div className="flex flex-wrap gap-2">
                    {game.skills.map((skill, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Practice Status */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Best Score:</span>
                    <span className="text-purple-600 font-bold">
                      {bestScores[game.id] || '-'}
                    </span>
                  </div>
                </div>
                
                {/* Play Button */}
                <button 
                  onClick={() => handleGameStart(game.id)}
                  className="w-full font-bold py-3 px-4 rounded-xl transition-all shadow-lg transform bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                >
                  🎮 Practice Game
                </button>
              </div>
            );
          })}
        </div>

        {/* Competition Info */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center">
          <TrophyIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Compete?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Once you've practiced these games, head to the live competitions where you can win real prizes for just $1 entry!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/listings" 
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              🏆 Browse Competitions
            </Link>
            <Link 
              href="/hot-sell" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              🔥 Hot Sell Games
            </Link>
          </div>
        </div>

        {/* Sponsored Listings - Show after 3 games */}
        {showSponsoredListings && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-8 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎯 Sponsored Competition Listings
              </h2>
              <p className="text-gray-600">
                You've played {totalGamesPlayed} practice games! Ready for real competitions? Check out these featured listings.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sponsored Listing 1 */}
              <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-yellow-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                    SPONSORED
                  </span>
                  <span className="text-green-600 font-bold">$10/day</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Gaming Challenge</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Compete in Multi-Target Reaction for daily cash prizes. New challenge every 24 hours!
                </p>
                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span>Entry Fee:</span>
                    <span className="font-bold">$2.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prize Pool:</span>
                    <span className="font-bold text-green-600">$10.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span>5/10</span>
                  </div>
                </div>
                <Link href="/listings" className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded-lg font-bold transition-colors">
                  Join Competition
                </Link>
              </div>

              {/* Sponsored Listing 2 */}
              <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-yellow-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                    SPONSORED
                  </span>
                  <span className="text-green-600 font-bold">$10/day</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Falling Objects Master</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Show your skills in the briefcase catching challenge. Highest score wins!
                </p>
                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span>Entry Fee:</span>
                    <span className="font-bold">$1.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prize Pool:</span>
                    <span className="font-bold text-green-600">$10.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span>7/12</span>
                  </div>
                </div>
                <Link href="/listings" className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded-lg font-bold transition-colors">
                  Join Competition
                </Link>
              </div>

              {/* Sponsored Listing 3 */}
              <div className="bg-white rounded-lg p-6 shadow-lg border-2 border-yellow-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                    SPONSORED
                  </span>
                  <span className="text-green-600 font-bold">$10/day</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Memory Championship</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Test your memory in Color Sequence challenges. Perfect recall required!
                </p>
                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span>Entry Fee:</span>
                    <span className="font-bold">$3.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prize Pool:</span>
                    <span className="font-bold text-green-600">$10.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span>3/8</span>
                  </div>
                </div>
                <Link href="/listings" className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-2 rounded-lg font-bold transition-colors">
                  Join Competition
                </Link>
              </div>
            </div>
            
            <div className="text-center mt-6">
              <Link href="/listings" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors inline-block">
                View All Competitions
              </Link>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mt-8 rounded-r-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-yellow-900 mb-2">Anti-Bot Protection</h3>
              <p className="text-yellow-700">
                All games include randomization, memory tests, and physics to prevent automated play. 
                Only human skill and reflexes can master these challenges!
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2024 DropDollar - Revolutionary Skill-Based Gaming Marketplace</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link>
            <Link href="/games" className="text-gray-400 hover:text-white">🚀 UPDATED Practice Games 🎮</Link>
            <Link href="/listings" className="text-gray-400 hover:text-white">Competitions</Link>
          </div>
        </div>
      </footer>
      </div>
      
      {/* Ad Overlay - Shows before practice games */}
      {showAd && (
        <AdOverlay
          onAdComplete={handleAdCompleteAndStartGame}
          onSkip={adSettings.allowSkip ? handleAdSkipAndStartGame : undefined}
          duration={adSettings.duration}
          allowSkip={adSettings.allowSkip}
          skipAfter={adSettings.skipAfter}
        />
      )}

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setPendingGameStart(null);
        }}
        onLocationVerified={handleLocationVerified}
        onLocationDenied={handleLocationDenied}
      />
    </>
  );
}
