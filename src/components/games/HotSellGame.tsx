'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TournamentService, HotSellListing, HotSellParticipant } from '@/lib/supabase/tournamentService';
import { UserService } from '@/lib/supabase/userService';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { ScheduledGamesService } from '@/lib/supabase/scheduledGamesService';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import LaserDodgeGame from './LaserDodgeGame';
import MultiTargetGame from './MultiTargetGame';
import SwordParryGameSimple from './SwordParryGameSimple';
import { 
  FireIcon, 
  TrophyIcon, 
  BanknotesIcon, 
  UsersIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MapPinIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface HotSellGameProps {
  listing: HotSellListing;
  onGameComplete: (score: number, accuracy: number) => void;
  onLocationVerified: () => void;
}

export default function HotSellGame({ listing, onGameComplete, onLocationVerified }: HotSellGameProps) {
  const { user, isAuthenticated } = useAuth();
  const [gameState, setGameState] = useState<'location' | 'ready' | 'playing' | 'completed'>('location');
  const [locationVerified, setLocationVerified] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameTime, setGameTime] = useState(60);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [misses, setMisses] = useState(0);
  const [gameType, setGameType] = useState<string>('');
  const [rngSeed, setRngSeed] = useState<number>(0);

  useEffect(() => {
    // Assign random game type and RNG seed for this listing using ScheduledGamesService
    const randomGameType = ScheduledGamesService.getRandomGameType();
    const randomRngSeed = ScheduledGamesService.getRandomRngSeed();
    
    setGameType(randomGameType);
    setRngSeed(randomRngSeed);
    
    console.log(`🎮 [HotSellGame] Assigned game: ${randomGameType}, RNG: ${randomRngSeed}`);
  }, [listing.id]);

  const verifyLocation = async () => {
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 [HotSellGame] Location verified:', position.coords);
          setLocationVerified(true);
          setGameState('ready');
          onLocationVerified();
        },
        (error) => {
          console.error('❌ [HotSellGame] Location error:', error);
          alert('Please enable location services to participate in hot sell tournaments');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error('❌ [HotSellGame] Location verification failed:', error);
      alert('Location verification failed. Please try again.');
    }
  };

  const startGame = () => {
    setGameState('playing');
    setGameStarted(true);
    setScore(0);
    setAccuracy(0);
    setClicks(0);
    setMisses(0);
    
    // Start game timer
    const timer = setInterval(() => {
      setGameTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = () => {
    setGameState('completed');
    const finalAccuracy = clicks > 0 ? ((clicks - misses) / clicks) * 100 : 0;
    setAccuracy(finalAccuracy);
    
    console.log(`🎮 [HotSellGame] Game completed - Score: ${score}, Accuracy: ${finalAccuracy}%`);
    onGameComplete(score, finalAccuracy);
  };

  const handleClick = (hit: boolean) => {
    if (gameState !== 'playing') return;
    
    setClicks(prev => prev + 1);
    if (hit) {
      setScore(prev => prev + 10);
    } else {
      setMisses(prev => prev + 1);
    }
  };

  const renderGameContent = () => {
    switch (gameState) {
      case 'location':
        return (
          <div className="text-center py-12">
            <MapPinIcon className="w-16 h-16 text-blue-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Location Verification Required</h2>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              To participate in hot sell tournaments, we need to verify your location to ensure fair play and prevent fraud.
            </p>
            <button
              onClick={verifyLocation}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2" />
                Verify My Location
              </div>
            </button>
          </div>
        );

      case 'ready':
        return (
          <div className="text-center py-12">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Play!</h2>
            <div className="bg-white/10 rounded-xl p-6 mb-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-3">Game Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Game Type:</span>
                  <span className="text-white font-medium capitalize">{gameType.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">RNG Seed:</span>
                  <span className="text-white font-medium">{rngSeed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-white font-medium">60 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Prize Pool:</span>
                  <span className="text-yellow-400 font-bold">${listing.prize_pool.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <FireIcon className="w-6 h-6 mr-2" />
                START GAME
              </div>
            </button>
          </div>
        );

      case 'playing':
        // Render the actual game based on gameType
        switch (gameType) {
          case 'laser_dodge':
            return (
              <LaserDodgeGame
                onGameEnd={(finalScore, accuracy, avgReactionTime, gameDuration) => {
                  setScore(finalScore);
                  setAccuracy(accuracy);
                  setGameState('completed');
                  onGameComplete(finalScore, accuracy);
                }}
                listingId={listing.id}
                entryNumber={1}
                isCompetitionMode={true}
              />
            );
          case 'multi_target_reaction':
            return (
              <MultiTargetGame
                onGameEnd={(finalScore, accuracy, avgReactionTime, gameDuration) => {
                  setScore(finalScore);
                  setAccuracy(accuracy);
                  setGameState('completed');
                  onGameComplete(finalScore, accuracy);
                }}
                listingId={listing.id}
                entryNumber={1}
                isCompetitionMode={true}
              />
            );
          case 'sword_parry':
            return (
              <SwordParryGameSimple
                onGameEnd={(finalScore, accuracy, avgReactionTime, gameDuration) => {
                  setScore(finalScore);
                  setAccuracy(accuracy);
                  setGameState('completed');
                  onGameComplete(finalScore, accuracy);
                }}
                listingId={listing.id}
                entryNumber={1}
                isCompetitionMode={true}
              />
            );
          default:
            return (
              <div className="text-center py-12">
                <div className="text-red-500 text-xl mb-4">❌ Unknown Game Type</div>
                <div className="text-gray-300">Game type: {gameType}</div>
              </div>
            );
        }

      case 'completed':
        return (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Game Complete!</h2>
            
            <div className="bg-white/10 rounded-xl p-6 mb-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Your Results</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Final Score:</span>
                  <span className="text-white font-bold text-xl">{score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Accuracy:</span>
                  <span className="text-white font-bold text-xl">{Math.round(accuracy)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Clicks:</span>
                  <span className="text-white font-bold text-xl">{clicks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Game Type:</span>
                  <span className="text-white font-medium capitalize">{gameType.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">RNG Seed:</span>
                  <span className="text-white font-medium">{rngSeed}</span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Your score has been recorded! Check the scoreboard to see how you rank against other players.
            </p>
            
            <button
              onClick={() => window.location.href = '/hot-sell'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center">
                <EyeIcon className="w-5 h-5 mr-2" />
                View Scoreboard
              </div>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>
      
      <CleanNavigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <FireIcon className="w-12 h-12 text-red-500 mr-4 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              HOT SELL GAME
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">{listing.title}</p>
          <p className="text-lg text-gray-400">Prize Pool: ${listing.prize_pool.toLocaleString()}</p>
        </div>

        {/* Game Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            {renderGameContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
