'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Game loading skeleton component
const GameLoadingSkeleton = ({ name, color = 'purple' }: { name: string; color?: string }) => (
  <div className={`w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black`}>
    <div className="text-center">
      <div className={`text-${color}-400 text-3xl sm:text-4xl font-bold animate-pulse mb-4`}>
        🎮 Loading {name}...
      </div>
      <div className="flex justify-center gap-1">
        <div className={`w-3 h-3 bg-${color}-500 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
        <div className={`w-3 h-3 bg-${color}-500 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
        <div className={`w-3 h-3 bg-${color}-500 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// Dynamically import ALL game components to improve initial load time
const MultiTargetGame = dynamic(() => import('@/components/games/MultiTargetGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Multi-Target" color="blue" />
});

const FallingObjectGame = dynamic(() => import('@/components/games/FallingObjectGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Falling Objects" color="green" />
});

const ColorSequenceGame = dynamic(() => import('@/components/games/ColorSequenceGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Color Sequence" color="pink" />
});

const LaserDodgeGame = dynamic(() => import('@/components/games/LaserDodgeGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Laser Dodge" color="orange" />
});

const QuickClickGame = dynamic(() => import('@/components/games/QuickClickGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Quick Click" color="green" />
});

const SwordParryGame = dynamic(() => import('@/components/games/SwordParryGameSimple'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Sword Parry" color="red" />
});

const BladeBounceGame = dynamic(() => import('@/components/games/BladeBounceGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Blade Bounce" color="cyan" />
});

const CashStackGame = dynamic(() => import('@/components/games/CashStackGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Cash Stack" color="yellow" />
});

const PennyPasserGame = dynamic(() => import('@/components/games/PennyPasserGame'), {
  ssr: false,
  loading: () => <GameLoadingSkeleton name="Penny Passer" color="amber" />
});

const DeadShotGame = dynamic(() => import('@/components/games/DeadShotGame'), { 
  ssr: false, 
  loading: () => <GameLoadingSkeleton name="DeadShot" color="red" />
});

const LightningMazeGame = dynamic(() => import('@/components/games/LightningMazeGame'), { 
  ssr: false, 
  loading: () => <GameLoadingSkeleton name="Lightning Maze" color="cyan" />
});

const FlappyCoinGame = dynamic(() => import('@/components/games/FlappyCoinGame'), { 
  ssr: false, 
  loading: () => <GameLoadingSkeleton name="Flippy Coin" color="yellow" />
});

const ParryProGame = dynamic(() => import('@/components/games/ParryProGame'), { 
  ssr: false, 
  loading: () => <GameLoadingSkeleton name="Parry Pro" color="red" />
});

const ClickDrawGame = dynamic(() => import('@/components/games/ClickDrawGame'), { 
  ssr: false, 
  loading: () => <GameLoadingSkeleton name="Click Draw" color="yellow" />
});

const NeonStrikerGame = dynamic(() => import('@/components/games/NeonStrikerGame'), { 
  ssr: false, 
  loading: () => <GameLoadingSkeleton name="Neon Striker" color="cyan" />
});
import AdOverlay from '@/components/ads/AdOverlay';
import AdBanner from '@/components/ads/AdBanner';
import CelebrationEffect from '@/components/CelebrationEffect';
import GameVictoryAnimation from '@/components/GameVictoryAnimation';
import AudioInitializer from '@/components/AudioInitializer';
import { ResponsiveLayout, ResponsiveGrid, ResponsiveText } from '@/components/ResponsiveLayout';
import useDeviceDetection, { getResponsiveClasses } from '@/hooks/useDeviceDetection';
import { useGlobalLocation } from '@/hooks/useGlobalLocation';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';
import { usePreventBackNavigation } from '@/hooks/usePreventBackNavigation';
import { useFullscreenGame } from '@/hooks/useFullscreenGame';
import CleanNavigation from '@/components/navigation/CleanNavigation';
import LocationPermissionModal from '@/components/modals/LocationPermissionModal';
import LocationBanner from '@/components/location/LocationBanner';
import { useLocationVerification } from '@/hooks/useLocationVerification';
import LazyVideo from '@/components/video/LazyVideo';
import { GameScoreService, type GameScore } from '@/lib/supabase/gameScores';
import { SimpleGameService } from '@/lib/supabase/simpleGameService';
import { XPService } from '@/lib/supabase/xpService';
import { LocationService, type LocationData } from '@/lib/locationService';
import SoundEffects from '@/lib/SoundEffects';
import { useAuth } from '@/contexts/AuthContext';
import { playClassicGameSound } from '@/lib/gameAudio';
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
  BoltIcon,
  ShieldExclamationIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline';

const GAMES = [
  {
    id: 'multi-target',
    name: 'Multi-Target Reaction',
    description: 'Click all highlighted targets as quickly as possible - speed and accuracy matter!',
    icon: CursorArrowRaysIcon,
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Visual Processing', 'Speed', 'Accuracy'],
    component: MultiTargetGame
  },
  {
    id: 'falling-objects',
    name: 'Falling Object Catch',
    description: 'Catch coins and dollars with your cash case - now with mouse movement for mobile!',
    icon: DevicePhoneMobileIcon,
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Coordination', 'Physics', 'Prediction'],
    component: FallingObjectGame
  },
  {
    id: 'color-sequence',
    name: 'Color Sequence Memory',
    description: 'Remember and repeat color sequences with unique audio cues for each color',
    icon: PuzzlePieceIcon,
    difficulty: 'Hard',
    avgTime: '90s',
    skills: ['Audio-Visual Memory', 'Sequential Processing', 'Multi-Sensory'],
    component: ColorSequenceGame
  },
  {
    id: 'laser-dodge',
    name: 'Laser Dodge EXTREME',
    description: 'Pilot your ship through full-screen laser grids - stay on blue lasers for bonus points!',
    icon: BoltIcon,
    difficulty: 'Extreme',
    avgTime: '60s',
    skills: ['Reflexes', 'Strategy', 'Risk Assessment'],
    component: LaserDodgeGame
  },
  {
    id: 'quick-click',
    name: 'QuickClick Challenge',
    description: 'Lightning-fast reaction test with 4 rounds including a bonus accuracy challenge!',
    icon: ClockIcon,
    difficulty: 'Easy',
    avgTime: '30s',
    skills: ['Reaction Time', 'Focus', 'Precision'],
    component: QuickClickGame
  },
  {
    id: 'sword-parry',
    name: 'Sword Slash',
    description: 'Destroy red attacks with precise sword slashes - progressive difficulty with accuracy bonuses!',
    icon: ShieldExclamationIcon,
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Clicking', 'Timing', 'Reflexes'],
    component: SwordParryGame
  },
  {
    id: 'blade-bounce',
    name: 'Blade Bounce: Mouseblade',
    description: 'Control your sword with mouse movement and precise clicks to block obstacles and enemies',
    icon: ShieldCheckIcon,
    difficulty: 'Extreme',
    avgTime: '60s',
    skills: ['Mouse Control', 'Reaction Time', 'Precision', 'Strategy'],
    component: BladeBounceGame
  },
  {
    id: 'cash-stack',
    name: 'Cash Stack Challenge',
    description: 'Stack coins on falling 3D cash sprites with random speeds and perfect stacking bonuses',
    icon: BanknotesIcon,
    difficulty: 'Hard',
    avgTime: '90s',
    skills: ['Timing', 'Precision', 'Strategy', 'Speed'],
    component: CashStackGame
  },
  {
    id: 'penny-passer',
    name: 'Penny Passer',
    description: 'Sort 3D coins into their matching colored quadrants! Match shapes & colors for bonus points in this fast-paced sorting challenge!',
    icon: BanknotesIcon,
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Pattern Recognition', 'Speed', 'Color Matching', 'Precision'],
    component: PennyPasserGame
  },
  {
    id: 'dead-shot',
    name: 'Dead Shot',
    description: 'Draw your laser bow and hit 3D alien ships with precision! Center shots earn massive bonuses!',
    icon: BoltIcon,
    difficulty: 'Hard',
    avgTime: '60s',
    skills: ['Aiming', 'Physics', 'Precision', 'Timing'],
    component: DeadShotGame
  },
  {
    id: 'lightning-maze',
    name: 'Lightning Maze',
    description: 'Guide a neon lightning bolt through a 3D maze with changing walls! Speed is everything!',
    icon: BoltIcon,
    difficulty: 'Medium',
    avgTime: '90s',
    skills: ['Navigation', 'Speed', 'Awareness', 'Precision'],
    component: LightningMazeGame
  },
  {
    id: 'flappy-coin',
    name: 'Flippy Coin',
    description: 'Tap to flip the spinning coin through grabbing hands! Classic arcade action in 3D!',
    icon: CurrencyDollarIcon,
    difficulty: 'Medium',
    avgTime: '60s',
    skills: ['Timing', 'Reflexes', 'Precision', 'Focus'],
    component: FlappyCoinGame
  },
  {
    id: 'parry-pro',
    name: 'Parry Pro',
    description: 'Master the art of the perfect parry! Time your blocks against sword strikes in this 3D combat game!',
    icon: ShieldExclamationIcon,
    difficulty: 'Hard',
    avgTime: '60s',
    skills: ['Timing', 'Reflexes', 'Focus', 'Pattern Recognition'],
    component: ParryProGame
  },
  {
    id: 'click-draw',
    name: 'Click Draw',
    description: 'Western quick draw showdown! Draw your revolver at the perfect moment when outlaws draw on you!',
    icon: FireIcon,
    difficulty: 'Hard',
    avgTime: '60s',
    skills: ['Timing', 'Reflexes', 'Accuracy', 'Quick Thinking'],
    component: ClickDrawGame
  },
  {
    id: 'neon-striker',
    name: 'Neon Striker',
    description: 'Precision coin flicking! Strike neon coins off the table with physics-based gameplay. Avoid chain reactions!',
    icon: SparklesIcon,
    difficulty: 'Medium',
    avgTime: '90s',
    skills: ['Precision', 'Strategy', 'Physics', 'Timing'],
    component: NeonStrikerGame
  }
];

// Debug: Log games array to ensure all games are included
console.log('🎮 Available games for deployment:', GAMES.map(g => `${g.name} (${g.id})`));
console.log('🚀 Laser Dodge game included:', GAMES.find(g => g.id === 'laser-dodge') ? '✅ YES' : '❌ NO');
console.log('🪙 Penny Passer game included:', GAMES.find(g => g.id === 'penny-passer') ? '✅ YES' : '❌ NO');
console.log('⚡ Lightning Maze game included:', GAMES.find(g => g.id === 'lightning-maze') ? '✅ YES' : '❌ NO');
console.log('📊 Total games available:', GAMES.length);

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
  const router = useRouter();
  const { user, isAuthenticated } = useAuth(); // Use useAuth context instead of localStorage
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Location verification hook
  const {
    locationVerified,
    improvedLocation,
    locationLoading,
    showLocationModal,
    handleLocationGranted,
    handleLocationDenied
  } = useLocationVerification(isAuthenticated);
  const listingId = searchParams.get('listingId');
  const tournamentId = searchParams.get('tournament');
  const entryId = searchParams.get('entry');
  const gameType = searchParams.get('game');
  const entryNumber = parseInt(searchParams.get('entryNumber') || '1');
  const isCompetitionMode = !!listingId || !!tournamentId;
  const isTournamentMode = !!tournamentId;
  const globalLocation = useGlobalLocation();
  const deviceInfo = useDeviceDetection();
  const responsiveClasses = getResponsiveClasses(deviceInfo);
  
  // Generate Star Wars scrolling stars - Optimized for smooth loading
  useEffect(() => {
    const starsContainer = document.getElementById('stars-container');
    if (!starsContainer) return;
    
    // Clear existing stars
    starsContainer.innerHTML = '';
    
    // Use requestIdleCallback or setTimeout for non-blocking star generation
    const generateStars = () => {
      // Reduced initial star count for faster load
      const starCount = 60;
      const fragment = document.createDocumentFragment(); // Batch DOM operations
      
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        const size = Math.random() < 0.6 ? 'small' : Math.random() < 0.9 ? 'medium' : 'large';
        const left = Math.random() * 100;
        const duration = 6 + Math.random() * 8; // Slower animation = smoother
        const delay = Math.random() * 5; // Staggered start
        const xOffset = (Math.random() - 0.5) * 200;
        
        star.className = `star-wars-star ${size}`;
        star.style.cssText = `--star-left:${left}%;--star-duration:${duration}s;--star-x:${xOffset}px;animation-delay:${delay}s;will-change:transform,opacity;`;
        
        fragment.appendChild(star);
      }
      
      starsContainer.appendChild(fragment);
    };
    
    // Defer star generation to after initial paint
    const timeoutId = setTimeout(generateStars, 100);
    
    // Regenerate fewer stars less frequently
    const regenerateInterval = setInterval(() => {
      if (!starsContainer) return;
      
      // Limit max stars to prevent memory issues
      const maxStars = 80;
      if (starsContainer.children.length > maxStars) {
        // Remove oldest stars
        while (starsContainer.children.length > maxStars - 5) {
          starsContainer.removeChild(starsContainer.firstChild!);
        }
      }
      
      // Add fewer new stars
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        const size = Math.random() < 0.6 ? 'small' : Math.random() < 0.9 ? 'medium' : 'large';
        const left = Math.random() * 100;
        const duration = 6 + Math.random() * 8;
        const xOffset = (Math.random() - 0.5) * 200;
        
        star.className = `star-wars-star ${size}`;
        star.style.cssText = `--star-left:${left}%;--star-duration:${duration}s;--star-x:${xOffset}px;will-change:transform,opacity;`;
        
        fragment.appendChild(star);
      }
      starsContainer.appendChild(fragment);
    }, 4000); // Less frequent regeneration
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(regenerateInterval);
      if (starsContainer) starsContainer.innerHTML = '';
    };
  }, []);

  // Play audio when page loads
  useEffect(() => {
    const audioFile = '/GamesPage.mp3';
    let hasPlayed = false;
    let audio: HTMLAudioElement | null = null;
    let fileCheckComplete = false;
    
    // Check if file exists BEFORE creating audio element
    const checkAndPlayAudio = async () => {
      try {
        // Try HEAD request to check if file exists - catch errors silently
        const response = await fetch(audioFile, { 
          method: 'HEAD',
          cache: 'no-cache'
        }).catch(() => null); // Silently catch network errors
        
        // If fetch failed or file doesn't exist, don't create audio
        if (!response || !response.ok || response.status === 404) {
          // File doesn't exist - silently skip (no console errors)
          fileCheckComplete = true;
          return; // Exit early - don't create Audio element
        }
        
        // Double check - only proceed if status is 200
        if (response.status !== 200) {
          fileCheckComplete = true;
          return;
        }
        
        fileCheckComplete = true;
        console.log('✅ Audio file found:', audioFile);
        
        // Only create audio element if file exists and check is complete
        if (!fileCheckComplete) return;
        
        audio = new Audio(audioFile);
        audioRef.current = audio;
        audio.volume = 0.7;
        audio.loop = false;
        
        // Error handler as backup - if audio fails to load, clean up immediately
        audio.addEventListener('error', (e) => {
          console.log('ℹ️ Audio failed to load - cleaning up');
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = ''; // Clear src to stop loading
            audioRef.current = null;
          }
          audio = null;
        }, { once: true });
        
        audio.addEventListener('loadstart', () => {
          console.log('📥 Audio loading started');
        });
        
        audio.addEventListener('loadeddata', () => {
          console.log('📦 Audio data loaded');
        });
        
        audio.addEventListener('canplay', () => {
          console.log('▶️ Audio can play');
        });
        
        const playAudio = async () => {
          if (hasPlayed || !audio) return;
          
          try {
            console.log('🎯 Attempting to play audio...');
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
              await playPromise;
              hasPlayed = true;
              console.log('✅ GamesPage audio is now playing!');
            }
          } catch (error: any) {
            console.warn('⚠️ Autoplay blocked:', error.name);
            console.log('💡 Audio will play on first user interaction');
            
            // Play on first user interaction
            const playOnInteraction = async () => {
              if (!hasPlayed && audio) {
                try {
                  await audio.play();
                  hasPlayed = true;
                  console.log('✅ GamesPage audio playing after user interaction');
                } catch (err) {
                  console.error('❌ Error playing audio:', err);
                }
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
              }
            };
            
            document.addEventListener('click', playOnInteraction, { once: true });
            document.addEventListener('touchstart', playOnInteraction, { once: true });
            document.addEventListener('keydown', playOnInteraction, { once: true });
          }
        };
        
        // Try multiple approaches to play
        audio.addEventListener('canplaythrough', () => {
          console.log('✅ Audio ready to play');
          playAudio();
        }, { once: true });
        
        // Immediate attempt after load
        audio.addEventListener('loadeddata', () => {
          setTimeout(() => playAudio(), 100);
        }, { once: true });
        
        // Fallback timer
        const fallbackTimer = setTimeout(() => {
          if (!hasPlayed && audio) {
            console.log('⏰ Fallback: attempting to play audio');
            playAudio();
          }
        }, 1000);
        
        // Start loading only if file exists
        audio.load();
        console.log('🚀 Audio load() called');

        return () => {
          clearTimeout(fallbackTimer);
          if (audio) {
            audio.pause();
            audio = null;
          }
          audioRef.current = null;
        };
      } catch (error: any) {
        // If fetch fails, file doesn't exist - don't create audio element
        if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
          console.log('ℹ️ Audio file not found:', audioFile, '- Audio playback disabled');
        } else {
          console.log('ℹ️ Could not check audio file:', error);
        }
      }
    };
    
    checkAndPlayAudio();
  }, []);
  
  // 10-minute inactivity timeout
  useInactivityTimeout({
    timeout: 10 * 60 * 1000, // 10 minutes
    onTimeout: () => {
      console.log('🕐 Games page timeout - reloading for fresh content');
      window.location.reload();
    },
    enabled: true
  });

  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [gameResults, setGameResults] = useState<GameResult | null>(null);
  const [practiceAttempts, setPracticeAttempts] = useState<{[key: string]: number}>({});
  const [bestScores, setBestScores] = useState<{[key: string]: number}>({});
  const [lastScores, setLastScores] = useState<{[key: string]: number}>({});
  // Theme is now saved per-user in localStorage and selected in game instructions
  const [selectedTheme, setSelectedTheme] = useState<'standard' | 'halloween' | 'christmas'>(() => {
    if (typeof window === 'undefined') return 'standard';
    const saved = localStorage.getItem('dropDollarGameTheme');
    if (saved === 'halloween' || saved === 'christmas') return saved;
    return 'standard';
  });
  const [gamePopularity, setGamePopularity] = useState<{[key: string]: GamePopularity}>({});
  const [showPopularityStats, setShowPopularityStats] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false); // For smooth page load animation
  
  // Enable fullscreen mode when game is active
  const fullscreenRef = useFullscreenGame(isGameActive);
  
  // Trigger smooth page load animation
  useEffect(() => {
    // Small delay to allow critical content to render first
    const timer = setTimeout(() => setPageLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Prevent back button navigation during active game
  usePreventBackNavigation(isGameActive, '/games');
  
  // Prevent back navigation after game completion
  useEffect(() => {
    if (gameResults) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Your game has been completed and saved. Are you sure you want to leave?';
        return 'Your game has been completed and saved. Are you sure you want to leave?';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [gameResults]);
  const [showAd, setShowAd] = useState(false);
  const [pendingGameStart, setPendingGameStart] = useState<string | null>(null);
  const [adTimeoutId, setAdTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check if user is a seller
  useEffect(() => {
    const checkSellerStatus = async () => {
      if (user && isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('seller_profiles')
            .select('status')
            .eq('user_id', user.id)
            .single();
          
          if (!error && data && data.status === 'approved') {
            setIsSeller(true);
          } else {
            setIsSeller(false);
          }
        } catch (err) {
          console.error('Error checking seller status:', err);
          setIsSeller(false);
        }
      }
    };
    
    checkSellerStatus();
  }, [user, isAuthenticated]);

  // Auto-launch game if tournament/competition entry
  useEffect(() => {
    if (isTournamentMode && gameType) {
      console.log('🏆 [Games] Tournament mode detected!');
      console.log('🎮 [Games] Auto-launching game:', gameType);
      console.log('📋 [Games] Tournament ID:', tournamentId);
      console.log('📋 [Games] Entry ID:', entryId);
      
      // Find the game
      const game = GAMES.find(g => g.id === gameType);
      if (game) {
        // Start game after 1 second delay
        setTimeout(() => {
          setCurrentGame(gameType);
          console.log('✅ [Games] Game launched:', game.name);
        }, 1000);
      } else {
        console.error('❌ [Games] Game not found:', gameType);
      }
    }
  }, [isTournamentMode, gameType, tournamentId, entryId]);

  // Check if gaming is allowed in the user's state
  const isGamingAllowed = (state: string): { allowed: boolean; message: string } => {
    const stateLower = state.toLowerCase();
    
    // States where skill-based gaming is generally allowed
    const allowedStates = [
      'california', 'texas', 'florida', 'new york', 'illinois', 'pennsylvania',
      'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
      'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri',
      'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama',
      'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah',
      'iowa', 'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico',
      'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire', 'maine',
      'montana', 'rhode island', 'delaware', 'south dakota', 'north dakota',
      'alaska', 'vermont', 'wyoming'
    ];

    if (allowedStates.includes(stateLower)) {
      return {
        allowed: true,
        message: `✅ Gaming allowed in ${state}! You can participate in skill-based competitions.`
      };
    } else {
      return {
        allowed: false,
        message: `⚠️ Gaming restrictions may apply in ${state}. Please check local regulations.`
      };
    }
  };

  // Check location permission before allowing game access
  const checkLocationBeforeGame = (gameId: string) => {
    console.log('🔍 Location check for game:', gameId);
    console.log('🔍 Global location status:', globalLocation.status);
    console.log('🔍 Global location data:', globalLocation.data);
    console.log('🔍 Global location loading:', globalLocation.isLoading);
    console.log('🔍 Gaming allowed:', globalLocation.isGamingAllowed);
    
    // AUTO-UNLOCK FOR APPROVED STATES - Allow games if location is granted and gaming is allowed
    if (globalLocation.status === 'granted' && globalLocation.isGamingAllowed) {
      console.log('✅ Location verified and gaming allowed - allowing game:', gameId);
      return true;
    } else if (globalLocation.status === 'restricted') {
      console.log('❌ Location restricted - blocking game:', gameId, 'State not allowed');
      return false;
    } else {
      console.log('❌ Location not verified - blocking game:', gameId, 'Status:', globalLocation.status);
      return false;
    }
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
      
      // Load last scores from localStorage (works for all users)
      try {
        const savedLastScores = localStorage.getItem('lastScores');
        if (savedLastScores) {
          const parsedLastScores = JSON.parse(savedLastScores);
          setLastScores(parsedLastScores);
          console.log('📊 [Games] Last scores loaded:', parsedLastScores);
        }
      } catch (error) {
        console.error('Error loading last scores from localStorage:', error);
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
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (adTimeoutId) {
        clearTimeout(adTimeoutId);
      }
    };
  }, [adTimeoutId]);

  // Add classic game sound effect on page load
  useEffect(() => {
    // Play classic game sound when page loads
    playClassicGameSound();
    
    // Play classic game sound every 20 seconds for ambient effect
    const gameSoundInterval = setInterval(() => {
      playClassicGameSound();
    }, 20000);

    return () => clearInterval(gameSoundInterval);
  }, []);

  // Start game - theme is now selected in game instructions
  const handleGameStart = (gameId: string) => {
    console.log('🎮 Game start requested:', gameId);
    console.log('🎮 Competition mode:', isCompetitionMode);
    console.log('🎮 Global location status:', globalLocation.status);
    
    // First check location permission for all game modes
    const locationCheckResult = checkLocationBeforeGame(gameId);
    console.log('🎮 Location check result:', locationCheckResult);
    
    if (!locationCheckResult) {
      console.log('❌ Location check failed - not starting game');
      return; // Location check failed, modal will be shown or user is restricted
    }
    
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('dropDollarGameTheme') || 'standard';
    setSelectedTheme(savedTheme as 'standard' | 'halloween' | 'christmas');
    
    // For competition mode, start immediately without ads
    if (isCompetitionMode) {
      console.log('🏆 Competition mode - starting game immediately');
      setCurrentGame(gameId);
      setGameResults(null);
      return;
    }

    // For practice mode, show ad for 10 seconds
    console.log('🎮 Practice mode - showing ad for 10 seconds');
    setPendingGameStart(gameId);
    setShowAd(true);
    
    // Auto-hide ad after 10 seconds
    const timeoutId = setTimeout(() => {
      console.log('⏰ Ad timeout reached, starting game');
      // Use the gameId directly instead of pendingGameStart to avoid stale closure
      startGameAfterAd(gameId);
    }, 10000);
    
    setAdTimeoutId(timeoutId);
  };

  // New function to start game after location verification
  const startGame = (gameId: string) => {
    setCurrentGame(gameId);
    setGameResults(null);
  };

  // Unified function to start game after ad completion
  const startGameAfterAd = (gameId: string) => {
    console.log('🎮 Starting game after ad completion:', gameId);
    
    // Clear any existing timeout
    if (adTimeoutId) {
      clearTimeout(adTimeoutId);
      setAdTimeoutId(null);
    }
    
    // Hide ad and start game
    setShowAd(false);
    setPendingGameStart(null);
    setCurrentGame(gameId);
    setGameResults(null);
    setIsGameActive(true);
    
    console.log('✅ Game started successfully after ad');
  };

  // Handle ad completion and start the pending game
  const handleAdCompleteAndStartGame = () => {
    console.log('📺 Ad completed, starting game');
    console.log('📺 Pending game:', pendingGameStart);
    if (pendingGameStart) {
      startGameAfterAd(pendingGameStart);
    } else {
      console.log('❌ No pending game to start');
    }
  };

  // Handle ad skip and start the pending game
  const handleAdSkipAndStartGame = () => {
    console.log('⏭️ Ad skipped, starting game');
    console.log('⏭️ Pending game:', pendingGameStart);
    if (pendingGameStart) {
      startGameAfterAd(pendingGameStart);
    } else {
      console.log('❌ No pending game to start');
    }
  };

  const handleGameEnd = async (result: GameResult) => {
    if (!currentGame) return;
    
    // Prevent multiple calls
    if (!isGameActive) {
      console.log('🎮 Game already ended, ignoring duplicate call');
      return;
    }

    setIsGameActive(false);
    setGameResults(result);
    
    // Show celebration effect and play sound for practice mode
    if (!isCompetitionMode) {
      console.log('🎉 Practice game completed! Showing celebration...');
      
      // Prevent multiple celebrations
      if (showCelebration) {
        console.log('🎉 Celebration already showing, skipping...');
        return;
      }
      
      // Reset any existing celebration first
      setShowCelebration(false);
      
      // Small delay to ensure clean reset
      setTimeout(() => {
        setShowCelebration(true);
        
        // Play celebration sounds
        try {
          SoundEffects.playGameWin();
          setTimeout(() => SoundEffects.playPracticeComplete(), 200);
        } catch (error) {
          console.error('Error playing game completion sound:', error);
        }
      }, 50);
    }
    
    // Save score to Supabase if user is logged in
    if (user?.id) {
      try {
        console.log('💾 [Games] Saving game result to Supabase...', {
          userId: user.id,
          userEmail: user.email,
          gameType: currentGame,
          score: result.score,
          isPractice: !isCompetitionMode
        });

        // Determine tournament type for competition games
        let tournamentType: string | undefined = undefined;
        if (isCompetitionMode) {
          // Map game types to tournament types
          if (currentGame === '1v1' || currentGame === 'one_v_one') {
            tournamentType = '1v1';
          } else if (currentGame === 'winner_takes_all' || currentGame === 'wta') {
            tournamentType = 'winner_takes_all';
          } else if (currentGame === 'hot_sell') {
            tournamentType = 'hot_sell';
          }
        }
        
        // Save complete game history with SimpleGameService
        const gameHistory = await SimpleGameService.saveGameHistory({
          user_id: user.id,
          game_type: currentGame,
          score: result.score,
          accuracy: result.accuracy,
          avg_reaction_time: result.avgReactionTime,
          is_practice: !isCompetitionMode,
          listing_id: listingId || undefined,
          entry_number: isCompetitionMode ? entryNumber : undefined,
          game_duration: 60,
          metadata: {
            tournament_type: tournamentType,
            is_coin_play: listingId?.startsWith('cp-') || false
          }
        });
        console.log('✅ [Games] Game history saved to game_history table:', gameHistory);
        
        // Award XP for the game (this also updates XP-based challenges via database trigger)
        if (gameHistory?.id) {
          try {
            if (!isCompetitionMode) {
              const xpResult = await XPService.awardPracticeGameXP(user.id, gameHistory.id, result.score);
              console.log('📊 [Games] Practice XP awarded:', xpResult);
            } else {
              const xpResult = await XPService.awardCompetitionGameXP(user.id, gameHistory.id, result.score);
              console.log('📊 [Games] Competition XP awarded:', xpResult);
            }
          } catch (xpError) {
            console.error('❌ [Games] XP award failed:', xpError);
          }
        }
        
        // CRITICAL: Immediately update challenges (don't wait for trigger)
        // This ensures progress updates even if trigger doesn't fire
        try {
          console.log('🔄 [Games] Updating challenge progress immediately...');
          if (!isCompetitionMode) {
            // Practice game - update practice challenges
            const results = await Promise.allSettled([
              XPService.updateDailyChallengeProgress(user.id, 'play_practice', 1),
              XPService.updateDailyChallengeProgress(user.id, 'games_count', 1),
              XPService.updateDailyChallengeProgress(user.id, 'play_specific_game', 1),
              XPService.updateDailyChallengeProgress(user.id, 'total_xp', 5), // Practice games award 5 XP
              XPService.updateWeeklyChallengeProgress(user.id, 'play_practice', 1),
              XPService.updateWeeklyChallengeProgress(user.id, 'games_count', 1),
              XPService.updateWeeklyChallengeProgress(user.id, 'play_specific_game', 1),
              XPService.updateWeeklyChallengeProgress(user.id, 'total_xp', 5)
            ]);
            
            const successes = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ [Games] Challenge updates: ${successes}/${results.length} succeeded`);
            
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                console.error(`❌ [Games] Challenge update ${index} failed:`, result.reason);
              } else if (result.status === 'fulfilled' && result.value) {
                console.log(`✅ [Games] Challenge update ${index} success:`, result.value);
              }
            });
          } else {
            // Competition game - update competition challenges based on tournament type
            const challengeUpdates: Promise<any>[] = [
              XPService.updateDailyChallengeProgress(user.id, 'games_count', 1),
              XPService.updateDailyChallengeProgress(user.id, 'score_threshold', result.score),
              XPService.updateDailyChallengeProgress(user.id, 'play_specific_game', 1),
              XPService.updateDailyChallengeProgress(user.id, 'play_competition', 1),
              XPService.updateDailyChallengeProgress(user.id, 'total_xp', 10), // Competition games award more XP
              XPService.updateWeeklyChallengeProgress(user.id, 'games_count', 1),
              XPService.updateWeeklyChallengeProgress(user.id, 'score_threshold', result.score),
              XPService.updateWeeklyChallengeProgress(user.id, 'play_specific_game', 1),
              XPService.updateWeeklyChallengeProgress(user.id, 'play_competition', 1),
              XPService.updateWeeklyChallengeProgress(user.id, 'total_xp', 10)
            ];
            
            // Add specific tournament type challenges
            if (tournamentType === '1v1') {
              challengeUpdates.push(XPService.updateDailyChallengeProgress(user.id, 'play_1v1', 1));
            } else if (tournamentType === 'winner_takes_all') {
              challengeUpdates.push(XPService.updateDailyChallengeProgress(user.id, 'play_winner_takes_all', 1));
            } else if (tournamentType === 'hot_sell') {
              challengeUpdates.push(XPService.updateDailyChallengeProgress(user.id, 'play_hot_sell', 1));
            }
            
            const results = await Promise.allSettled(challengeUpdates);
            
            const successes = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ [Games] Challenge updates: ${successes}/${results.length} succeeded`);
            
            results.forEach((result, index) => {
              if (result.status === 'rejected') {
                console.error(`❌ [Games] Challenge update ${index} failed:`, result.reason);
              } else if (result.status === 'fulfilled' && result.value) {
                console.log(`✅ [Games] Challenge update ${index} success:`, result.value);
              }
            });
          }
          
          // Trigger frontend refresh
          localStorage.setItem('hasNewGameScore', 'true');
        } catch (error) {
          console.error('❌ [Games] Error updating challenges:', error);
        }

        // Update best score if this is a new high
        const currentBest = bestScores[currentGame] || 0;
        const newBestScores = {...bestScores};
        if (result.score > currentBest) {
          newBestScores[currentGame] = result.score;
          console.log('🏆 [Games] NEW BEST SCORE!', currentGame, result.score);
        }
        setBestScores(newBestScores);
        localStorage.setItem('bestScores', JSON.stringify(newBestScores));
        console.log('✅ [Games] Best scores updated:', newBestScores);
        
        // Update last scores
        const newLastScores = {
          ...lastScores,
          [currentGame]: result.score
        };
        setLastScores(newLastScores);
        localStorage.setItem('lastScores', JSON.stringify(newLastScores));
        console.log('✅ [Games] Last score updated:', currentGame, result.score);
        
        // Show success message
        console.log('🎉 [Games] ✅✅✅ SCORE SAVED SUCCESSFULLY TO YOUR DASHBOARD! ✅✅✅');
        console.log('🔄 [Games] Go to /dashboard to see your updated scores!');
        
        // Store a flag so dashboard knows to refresh
        localStorage.setItem('hasNewGameScore', 'true');
      } catch (error) {
        console.error('❌ [Games] Error saving score to Supabase:', error);
        console.error('❌ [Games] Full error details:', JSON.stringify(error, null, 2));
        alert('⚠️ Score could not be saved to your account. Please check your connection and try again.');
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
      console.warn('⚠️ [Games] No user logged in - score will NOT be saved to dashboard');
      console.warn('⚠️ [Games] Please sign in to save your high scores permanently!');
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
    }

  };

  const handleGameExit = () => {
    setIsGameActive(false);
    setCurrentGame(null);
    setGameResults(null);
  };

  const getCurrentGameComponent = () => {
    if (!currentGame) return null;
    
    const game = GAMES.find(g => g.id === currentGame);
    if (!game) return null;

    const GameComponent = game.component;
    console.log('Rendering game:', currentGame, 'Component:', GameComponent, 'Theme:', selectedTheme);
    
    try {
      return (
        <GameComponent
          onGameEnd={handleGameEnd}
          onExit={handleGameExit}
          listingId={listingId || undefined}
          entryNumber={entryNumber}
          rngSeed={Math.floor(Math.random() * 10) + 1} // Random seed 1-10 for fairness
          theme={selectedTheme} // Pass theme to game
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
      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onLocationGranted={handleLocationGranted}
        onLocationDenied={handleLocationDenied}
      />

      {/* Audio Initializer - Enables audio on first user interaction */}
      <AudioInitializer />
      
      {/* Game Victory Animation for Practice Mode */}
      <GameVictoryAnimation
        show={showCelebration}
        gameName={currentGame ? GAMES.find(g => g.id === currentGame)?.name || 'Game' : 'Game'}
        score={gameResults?.score || 0}
        duration={3000}
        onComplete={() => {
          setShowCelebration(false);
          // Reload page for Mouseblade and Cash Stack games
          if (currentGame === 'blade-bounce' || currentGame === 'cash-stack') {
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return;
          }
          // Force dashboard reload with game data
          setTimeout(() => {
            // Store game result in localStorage for dashboard to show
            localStorage.setItem('lastGameResult', JSON.stringify({
              score: gameResults?.score || 0,
              gameType: currentGame,
              entryFee: 0,
              mode: isCompetitionMode ? 'competition' : 'practice',
              timestamp: new Date().toISOString(),
              accuracy: gameResults?.accuracy || 100
            }));
            
            // Reload games page to play again
            window.location.href = '/games';
          }, 500);
        }}
      />
      
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

      {/* Main page content - only show when no game is active */}
      {!currentGame && (
        <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden transition-opacity duration-500 ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Star Wars Scrolling Stars Background - Optimized with will-change */}
      <div className="fixed inset-0 overflow-visible pointer-events-none" id="stars-container" style={{ zIndex: 0, contain: 'layout style paint' }}>
        {/* Stars will be generated by useEffect after initial paint */}
      </div>
      
      {/* Clean Navigation */}
      <CleanNavigation variant="gradient" currentPage="games" />
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 transition-all duration-700 ${pageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Location Verification Banner */}
        {isAuthenticated && (
          <LocationBanner
            isLoading={locationLoading}
            location={improvedLocation}
            isVerified={locationVerified}
          />
        )}
        {/* Header with light reflection */}
        <div className="text-center mb-12 light-reflection relative">
          <h1 className="text-6xl font-extrabold mb-6 relative z-10">
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent animate-pulse">
            {isCompetitionMode ? '🏆 Competition Mode' : '🎮 Practice Gaming Arena'}
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-500 mx-auto rounded-full animate-pulse mb-6 relative z-10"></div>
          <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text mb-4 italic animate-pulse relative z-10">
            "Don't drop out, drop a dollar."
          </p>
        </div>
        
        <div className="text-center mb-8">
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
              Master all 9 skill-based games before entering real competitions. 
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

        {/* Ad Banner */}
        <AdBanner pageLocation="games" position="top" />

        {/* Become a Seller CTA with light reflection */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 mb-8 text-white shadow-2xl border border-green-400/30 light-reflection relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <BanknotesIcon className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black mb-1">Sell Your Products & Earn!</h3>
                <p className="text-green-100 text-sm">List items, run competitions, reach thousands of gamers</p>
              </div>
            </div>
            <Link
              href="/seller/apply"
              className="bg-white hover:bg-green-50 text-green-700 font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 whitespace-nowrap"
            >
              🏪 Become a Seller →
            </Link>
          </div>
        </div>

        {/* Sponsor Banner with light reflection */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-8 text-white text-center shadow-lg light-reflection relative">
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
          <div className="mt-4 flex justify-center gap-4">
            <Link 
              href="/seller/apply" 
              className="bg-white text-purple-600 hover:bg-purple-50 font-bold py-2 px-6 rounded-lg transition-colors inline-block"
            >
              🏪 Become a Seller
            </Link>
            <Link 
              href={isSeller ? "/advertising/register" : "/seller/apply"}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold py-2 px-6 rounded-lg transition-all inline-block shadow-lg"
              title={isSeller ? "Create your ad campaign" : "Become a seller first to create ads"}
            >
              {isSeller ? "📢 Create Ad Campaign" : "📢 Advertise Here"}
            </Link>
          </div>
          {!isSeller && isAuthenticated && (
            <p className="text-xs text-purple-200 mt-2">
              💡 Become a seller to create ad campaigns
            </p>
          )}
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
              <div key={game.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-gray-200 light-reflection group">
                {/* Animated Game Preview */}
                <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 relative overflow-hidden">
                  {/* Background emoji */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <IconComponent className="h-24 w-24 text-white" />
                  </div>
                  
                  {/* Game-specific animations */}
                  {game.id === 'quick-click' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/quick-click-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'color-sequence' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/color-sequence-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'laser-dodge' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/laser-dodge-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'falling-objects' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/falling-object-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'multi-target' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/multi-touch-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'sword-parry' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/sword-parry-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'blade-bounce' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/mouseblade-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'cash-stack' && (
                    <div className="absolute inset-0">
                      <LazyVideo src="/cash-stack-gameplay.mp4" className="w-full h-full" preload="none" />
                    </div>
                  )}
                  
                  {game.id === 'dead-shot' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center">
                      <div className="text-white text-6xl font-bold animate-pulse">🎯</div>
                    </div>
                  )}
                </div>
                
                <div className="p-8">
                  {/* Game Icon - smaller now since we have preview */}
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="h-6 w-6 text-white" />
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
                <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm flex items-center">
                      <TrophyIcon className="h-4 w-4 mr-1 text-yellow-500" />
                      Best Score:
                    </span>
                    <span className="text-purple-600 font-bold text-lg">
                      {bestScores[game.id]?.toLocaleString() || '-'}
                    </span>
                  </div>
                  {lastScores[game.id] && (
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-blue-600 text-sm font-semibold">
                        📊 Last Score:
                      </span>
                      <span className="text-blue-600 font-bold text-lg">
                        {lastScores[game.id].toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Play Button */}
                {globalLocation.status === 'granted' && globalLocation.isGamingAllowed ? (
                <button 
                  onClick={() => handleGameStart(game.id)}
                  className="w-full font-bold py-3 px-4 rounded-xl transition-all shadow-lg transform bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                >
                  🎮 Practice Game
                </button>
                ) : globalLocation.status === 'restricted' ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-red-700 border border-red-600 text-center">
                    <div className="text-red-300 text-sm mb-2">
                      <MapPinIcon className="h-5 w-5 inline mr-2" />
                      Gaming Not Allowed in Your Location
                    </div>
                    <div className="text-red-200 text-xs">
                      Skill-based gaming is restricted in your state
                    </div>
                  </div>
                ) : (
                  <div className="w-full py-3 px-4 rounded-xl bg-gray-700 border border-gray-600 text-center">
                    <div className="text-gray-400 text-sm mb-2">
                      <MapPinIcon className="h-5 w-5 inline mr-2" />
                      Location Required
                    </div>
                    <button 
                      onClick={() => globalLocation.requestLocation()}
                      className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                    >
                      Enable Location to Play
                    </button>
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>


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
      )}
      
      {/* Ad Overlay - Shows before practice games */}
      {showAd && (
        <AdOverlay
          onAdComplete={handleAdCompleteAndStartGame}
          onSkip={handleAdSkipAndStartGame}
          duration={10}
          allowSkip={true}
          skipAfter={5}
        />
      )}
    </>
  );
}
