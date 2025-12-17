'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { playCountdownBeep, playCountdownFinalBeep, playQuickClickSuccess, playQuickClickBonusHit, playRoundTransition, playGameEnd, playSwordMiss } from '@/lib/gameAudio';
import { FairRNGService, QuickClickRNGConfig } from '@/lib/fairRNGService';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface QuickClickGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  rngSeed?: number; // RNG seed (1-20) for deterministic spawns
}

interface Round {
  roundNumber: number;
  reactionTime: number | null;
  clicked: boolean;
  isBonus?: boolean;
  targetX?: number;
  targetY?: number;
  accuracy?: number;
}

export default function QuickClickGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, rngSeed }: QuickClickGameProps) {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  
  // 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
  console.log('');
  console.log('🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮');
  console.log('🎮 QUICK CLICK v8.0 - BUILD 20251127-1900');
  console.log('🎮 If you see this, NEW CODE IS RUNNING!');
  console.log('🔒 Audit logs WILL be sent to admin dashboard');
  console.log('🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮🎮');
  console.log('');
  
  // DON'T use pre-generated configs - causes gameplay issues
  // Instead, use rngSeed to initialize engine for runtime generation
  const rngConfig = null; // Disabled - using runtime RNG instead
  
  // Seeded RNG for deterministic gameplay
  const seededRng = useMemo(() => {
    if (!rngSeed) return null;
    
    class Mulberry32 {
      private seed: number;
      constructor(seed: number) { this.seed = seed >>> 0; }
      next(): number {
        let t = (this.seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
      }
      nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
      }
    }
    
    return new Mulberry32(rngSeed);
  }, [rngSeed]);
  
  // Fallback wait times if no RNG seed (practice mode)
  const fallbackWaitTimes = [3000, 2500, 3500, 2000];
    
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'waiting' | 'flash' | 'clicked' | 'ended'>('ready');
  const [currentRound, setCurrentRound] = useState(1);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [flashStartTime, setFlashStartTime] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<{x: number, y: number} | null>(null);
  const [clickPosition, setClickPosition] = useState<{x: number, y: number} | null>(null);
  
  const flashTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Simple audio initialization (no complex GameAudio)
  useEffect(() => {
    // No complex audio initialization needed
  }, []);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        // Simple countdown beep
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
          audio.volume = 0.1;
          audio.play().catch(() => {});
        } catch (e) {
          // Audio failed, continue silently
        }
        countdownRef.current = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        startRound();
      }
    }
    
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [gameState, countdown]);

  // Start a round
  const startRound = useCallback(() => {
    console.log(`QuickClick: Starting round ${currentRound}`);
    const isBonus = currentRound === 4;
    
    // Get wait time and target position - DETERMINISTIC (competition with seed) or RANDOM (practice)
    let waitTime: number;
    let targetX: number;
    let targetY: number;
    
    if (seededRng) {
      // COMPETITION MODE: Use seeded RNG for deterministic but varied gameplay
      waitTime = seededRng.nextInt(2000, 4000); // 2-4 seconds
      
      if (isBonus) {
        targetX = seededRng.nextFloat(20, 80);
        targetY = seededRng.nextFloat(20, 80);
        setTargetPosition({ x: targetX, y: targetY });
        console.log(`⚡ [QuickClick] Round ${currentRound} (BONUS) - Wait: ${waitTime}ms, Target: (${targetX.toFixed(1)}, ${targetY.toFixed(1)}) - SEEDED`);
      } else {
        setTargetPosition(null);
        console.log(`⚡ [QuickClick] Round ${currentRound} - Wait: ${waitTime}ms - SEEDED`);
      }
    } else {
      // PRACTICE MODE: Use Math.random()
      waitTime = 2000 + Math.random() * 2000;
      
      if (isBonus) {
        targetX = 20 + Math.random() * 60;
        targetY = 20 + Math.random() * 60;
        setTargetPosition({ x: targetX, y: targetY });
        console.log(`QuickClick: Bonus round - target at ${targetX}%, ${targetY}%`);
      } else {
        setTargetPosition(null);
      }
    }
    
    setGameState('waiting');
    
    flashTimeoutRef.current = setTimeout(() => {
      console.log('QuickClick: FLASH!');
      setGameState('flash');
      setFlashStartTime(Date.now());
      playCountdownBeep();
    }, waitTime);
  }, [currentRound, seededRng]);

  // End game - moved here so it can be used by handleClick and useEffect
  const endGame = useCallback(async (finalRounds: Round[]) => {
    console.log('QuickClick: Game ended', finalRounds);
    setGameState('ended');
    
    // Calculate results
    const validRounds = finalRounds.filter(r => r.reactionTime !== null);
    const avgReactionTime = validRounds.length > 0 
      ? validRounds.reduce((sum, r) => sum + r.reactionTime!, 0) / validRounds.length 
      : 0;
    
    const accuracy = (validRounds.length / 4) * 100; // Now 4 rounds total
    
    // Play game end sound based on performance
    const performance = accuracy > 75 ? 'great' : accuracy < 50 ? 'poor' : 'good';
    playGameEnd(performance);
    
    // Score based on speed and accuracy
    const speedScore = avgReactionTime > 0 ? Math.max(0, 1000 - avgReactionTime) : 0;
    const accuracyBonus = accuracy * 10;
    
    // Bonus round scoring
    const bonusRound = finalRounds.find(r => r.isBonus);
    let bonusScore = 0;
    if (bonusRound && bonusRound.reactionTime && bonusRound.accuracy) {
      // Bonus: reaction time + accuracy bonus
      const bonusSpeed = Math.max(0, 500 - bonusRound.reactionTime); // Up to 500 points for speed
      const bonusAccuracy = bonusRound.accuracy * 5; // Up to 500 points for accuracy
      bonusScore = bonusSpeed + bonusAccuracy;
      console.log(`Bonus scoring: Speed=${bonusSpeed}, Accuracy=${bonusAccuracy}, Total=${bonusScore}`);
    }
    
    const finalScore = Number((speedScore + accuracyBonus + bonusScore).toFixed(2));
    
    console.log('');
    console.log('========================================');
    console.log('🏁 [QuickClick] GAME END HANDLER CALLED');
    console.log('========================================');
    
    const gameResult = {
      score: finalScore,
      accuracy,
      avgReactionTime
    };
    
    // 🔒 AUTO-AUDIT: Log to admin audit system (required for fair skill-based gaming)
    console.log('🎯 [QuickClick] Game ended, preparing to log audit...');
    console.log('🎯 [QuickClick] Final score:', finalScore, 'Accuracy:', accuracy);
    console.log('🎯 [QuickClick] Calling logGameCompletion from @/lib/gameAudit...');
    
    try {
      const auditResult = await logGameCompletion({
        gameType: GAME_TYPES.QUICK_CLICK,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy,
        reactionTime: avgReactionTime,
        durationSeconds: 60,
        additionalData: {
          rngSeed,
          listingId,
          entryNumber,
          rounds: finalRounds.length,
          bonusScore
        }
      });
      console.log('🎯 [QuickClick] Audit result:', auditResult);
    } catch (error) {
      console.error('🎯 [QuickClick] Audit logging failed:', error);
    }
    
    console.log('QuickClickGame calling onGameEnd with:', gameResult);
    onGameEnd(gameResult);
  }, [rngSeed, listingId, entryNumber, isCompetitionMode, onGameEnd]);

  // Handle click
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState === 'waiting') {
      // Clicked too early - PUNISH by immediately ending this phase!
      console.log(`QuickClick: Clicked too early! Round ${currentRound} - PUNISHED!`);
      
      // Clear the flash timeout since we're ending early
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      
      const newRound: Round = {
        roundNumber: currentRound,
        reactionTime: 0, // Zero score for early click
        clicked: true,
        isBonus: currentRound === 4,
        targetX: targetPosition?.x,
        targetY: targetPosition?.y,
        accuracy: 0 // Zero accuracy for premature click
      };
      
      const updatedRounds = [...rounds, newRound];
      setRounds(updatedRounds);
      
      // Play failure sound
      playSwordMiss();
      
      // IMMEDIATE punishment - skip directly to next round countdown (no delay!)
      if (currentRound < 4) {
        setCurrentRound(prev => prev + 1);
        setCountdown(3);
        setGameState('countdown'); // Go straight to countdown for next round
      } else {
        // End game immediately for bonus round
        endGame(updatedRounds);
      }
      
      return;
    }
    
    if (gameState === 'flash') {
      const reactionTime = Date.now() - flashStartTime;
      console.log(`QuickClick: Clicked! Reaction time: ${reactionTime}ms`);
      
      const isBonus = currentRound === 4;
      let accuracy = 100;
      
      if (isBonus && targetPosition && gameAreaRef.current) {
        // Calculate click accuracy for bonus round - FIXED positioning
        const rect = gameAreaRef.current.getBoundingClientRect();
        
        // Calculate click position as percentage of game area
        const clickX = ((event.clientX - rect.left) / rect.width) * 100;
        const clickY = ((event.clientY - rect.top) / rect.height) * 100;
        setClickPosition({ x: clickX, y: clickY });
        
        // Log for debugging
        console.log(`🎯 Click position: (${clickX.toFixed(1)}%, ${clickY.toFixed(1)}%)`);
        console.log(`🎯 Target position: (${targetPosition.x.toFixed(1)}%, ${targetPosition.y.toFixed(1)}%)`);
        
        // Calculate distance from target center (in percentage points)
        const distance = Math.sqrt(
          Math.pow(clickX - targetPosition.x, 2) + Math.pow(clickY - targetPosition.y, 2)
        );
        
        // Convert distance to accuracy (closer = higher accuracy)
        // Target is ~8% wide (w-16 = 64px on ~800px = 8%), so clicking within target = ~100%
        // Max meaningful distance is ~50% (half the screen), so 2% penalty per % distance
        accuracy = Math.max(0, 100 - (distance * 2));
        console.log(`🎯 Bonus accuracy: ${accuracy.toFixed(1)}% (distance: ${distance.toFixed(1)}%)`);
      }
      
      // Play success sound based on performance
      if (isBonus) {
        playQuickClickBonusHit(accuracy);
      } else {
        playQuickClickSuccess(reactionTime);
      }
      
      // Record the round
      const newRound: Round = {
        roundNumber: currentRound,
        reactionTime,
        clicked: true,
        isBonus,
        targetX: targetPosition?.x,
        targetY: targetPosition?.y,
        accuracy: isBonus ? accuracy : undefined
      };
      
      setRounds(prev => [...prev, newRound]);
      setGameState('clicked');
      
      // Move to next round or end game
      setTimeout(() => {
        if (currentRound < 4) {
          setCurrentRound(prev => prev + 1);
          setCountdown(3);
          setGameState('countdown');
        } else {
          endGame([...rounds, newRound]);
        }
      }, 2000); // Longer delay for bonus round to show results
    }
    // Note: 'waiting' state is already handled at the start of this function (early click case)
  }, [gameState, flashStartTime, currentRound, rounds, targetPosition, endGame]);

  // Auto-fail if no click during flash (Too Late)
  useEffect(() => {
    if (gameState === 'flash') {
      const timeout = setTimeout(() => {
        console.log('QuickClick: No click - too late');
        // Play error sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
          audio.volume = 0.1;
          audio.play().catch(() => {});
        } catch (e) {
          // Audio failed, continue silently
        }
        
        // Give a penalty score (999ms = very slow reaction)
        const newRound: Round = {
          roundNumber: currentRound,
          reactionTime: 999, // Penalty score for missing
          clicked: false,
          isBonus: currentRound === 4
        };
        
        setRounds(prev => [...prev, newRound]);
        setGameState('clicked');
        
        setTimeout(() => {
          if (currentRound < 4) {
            setCurrentRound(prev => prev + 1);
            setCountdown(3);
            setGameState('countdown');
          } else {
            endGame([...rounds, newRound]);
          }
        }, 1500);
      }, 2000); // 2 seconds to click after flash (more generous)
      
      return () => clearTimeout(timeout);
    }
  }, [gameState, currentRound, rounds, endGame]);

  // Start game
  const handleStartGame = () => {
    console.log('');
    console.log('========================================');
    console.log('🎮 QUICK CLICK GAME STARTED');
    console.log('========================================');
    console.log('🎮 Audit logging is ENABLED');
    console.log('🎮 Game will be logged on completion');
    console.log('========================================');
    setCountdown(3);
    setGameState('countdown');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4"
      >
        <div 
          className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto text-center border border-white/20 shadow-2xl z-10"
        >
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">⚡</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent">
              QuickClick
            </h2>
            <p className="text-green-200 text-sm mb-4 sm:mb-6 font-medium">Lightning Reaction Challenge</p>
            
            {/* Gameplay Video */}
            <div className="mb-6 w-full max-w-2xl mx-auto">
              <div 
                className="relative w-full cursor-pointer group" 
                style={{ aspectRatio: '16/9' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedVideo('/quick-click-gameplay.mp4');
                }}
              >
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full rounded-lg border-2 border-green-400 shadow-2xl transition-transform group-hover:scale-105"
                  style={{ objectFit: 'contain' }}
                >
                  <source src="/quick-click-gameplay.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all rounded-lg">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl font-bold bg-black/50 px-4 py-2 rounded-lg">
                    Click to expand
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-2 text-center">Watch how to play - Click video to expand</p>
            </div>
            
            {/* Epilepsy Warning */}
            {/* Epilepsy Warning - Enhanced Visibility */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-600 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-white text-sm sm:text-lg font-black">⚠️</span>
                </div>
                <p className="text-white font-black text-lg sm:text-xl tracking-wide">EPILEPSY WARNING</p>
              </div>
              <p className="text-sm sm:text-base text-white font-semibold leading-relaxed">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>
            
            <div className="text-left text-xs sm:text-sm text-white/90 mb-6 sm:mb-8 space-y-3 bg-black/20 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-white/10 max-h-64 sm:max-h-none overflow-y-auto">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">⚡</span>
                </div>
                <p className="text-white font-semibold">How to Play:</p>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-semibold">3 Rounds:</span> Test your reflexes 3 times</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Wait:</span> Screen will be red - don't click!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-semibold">Flash:</span> Click instantly when screen turns green!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-semibold">Desktop:</span> Click anywhere when green</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-semibold">Mobile:</span> Tap anywhere when green</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-purple-300 font-semibold">Bonus:</span> 4th round - click the target circle!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-orange-300 font-semibold">Accuracy:</span> Closer to center = more bonus points!</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-xl p-3 sm:p-4 mt-4 sm:mt-6">
                <p className="text-xs text-green-200">
                  <span className="text-yellow-300 font-bold">⚡ Pro Tip:</span> Stay focused and click the moment you see green! 
                  Average human reaction time is ~250ms. Can you beat it?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {!isCompetitionMode && onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform text-sm sm:text-base"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse text-sm sm:text-base`}
              >
                ⚡ Start Challenge
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Video Modal */}
        {expandedVideo && (
          <div 
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => setExpandedVideo(null)}
          >
            <div className="relative w-full max-w-6xl" style={{ aspectRatio: '16/9' }}>
              <button
                onClick={() => setExpandedVideo(null)}
                className="absolute -top-12 right-0 text-white text-4xl font-bold hover:text-green-400 transition-colors z-10"
              >
                ✕ Close
              </button>
              <video
                autoPlay
                loop
                controls
                className="w-full h-full rounded-lg border-4 border-green-400 shadow-2xl"
                style={{ objectFit: 'contain' }}
                onClick={(e) => e.stopPropagation()}
              >
                <source src={expandedVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {currentRound === 4 ? 'BONUS ROUND!' : `Round ${currentRound} of 3`}
          </h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8">
            {currentRound === 4 
              ? 'Click the target circle when it appears!' 
              : 'Get ready to click when the screen flashes green!'
            }
          </p>
          <div className="text-6xl sm:text-8xl font-bold text-blue-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4">
            {currentRound === 4 ? 'Accuracy + Speed = Bonus Points!' : 'Prepare yourself...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-0">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-none p-3 sm:p-6 w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2 flex-shrink-0">
          <div className="text-xl sm:text-2xl font-bold text-white">
            ⚡ QuickClick - {currentRound === 4 ? 'BONUS ROUND' : `Round ${currentRound}/3`}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-base sm:text-lg">
            <div className="text-yellow-300 font-bold">
              Completed: {rounds.length}/{currentRound === 4 ? '3+Bonus' : '3'}
            </div>
            {!isCompetitionMode && onExit && (
              <button 
                onClick={onExit}
                className="text-white hover:text-red-500 text-2xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Game Area - MUST have relative positioning for target accuracy! */}
        <div 
          ref={gameAreaRef}
          className={`flex-1 cursor-pointer transition-all duration-100 select-none relative ${
            gameState === 'waiting' ? 'bg-red-500 border-red-600' :
            gameState === 'flash' ? 'bg-green-500 border-green-600 animate-pulse' :
            gameState === 'clicked' ? 'bg-blue-500 border-blue-600' :
            'bg-gray-800 border-gray-600'
          }`}
          onClick={handleClick}
          style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
            {gameState === 'waiting' && (
              <div className="text-center">
                <div className="text-4xl sm:text-6xl font-bold mb-4">WAIT...</div>
                <div className="text-lg sm:text-xl">
                  {currentRound === 4 ? "Don't click until you see the target!" : "Don't click yet!"}
                </div>
              </div>
            )}
            {gameState === 'flash' && (
              <div className="text-center">
                <div className="text-6xl sm:text-8xl font-bold mb-4 animate-bounce">
                  {currentRound === 4 ? 'TARGET!' : 'CLICK!'}
                </div>
                <div className="text-xl sm:text-2xl">
                  {currentRound === 4 ? 'Click the circle!' : 'Click NOW!'}
                </div>
              </div>
            )}
            {gameState === 'clicked' && (
              <div className="text-center">
                {rounds.length > 0 && rounds[rounds.length - 1].reactionTime ? (
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold mb-4">
                      {rounds[rounds.length - 1].reactionTime}ms
                    </div>
                    {rounds[rounds.length - 1].isBonus && rounds[rounds.length - 1].accuracy && (
                      <div className="text-xl sm:text-2xl font-bold mb-2 text-yellow-300">
                        Accuracy: {rounds[rounds.length - 1].accuracy!.toFixed(1)}%
                      </div>
                    )}
                    <div className="text-lg sm:text-xl">
                      {rounds[rounds.length - 1].isBonus ? 'Bonus Complete! 🎯' :
                       rounds[rounds.length - 1].reactionTime! < 200 ? 'Lightning Fast! ⚡' :
                       rounds[rounds.length - 1].reactionTime! < 300 ? 'Excellent! 🎯' :
                       rounds[rounds.length - 1].reactionTime! < 400 ? 'Good! 👍' :
                       'Keep practicing! 💪'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl sm:text-4xl font-bold mb-4">
                      {rounds[rounds.length - 1]?.clicked === false && rounds[rounds.length - 1]?.reactionTime === 999 
                        ? 'Too Late!' 
                        : 'Too Early!'}
                    </div>
                    <div className="text-lg sm:text-xl">
                      {rounds[rounds.length - 1]?.clicked === false && rounds[rounds.length - 1]?.reactionTime === 999
                        ? 'Click faster when it turns green!'
                        : currentRound === 4 ? 'Wait for the target circle!' : 'Wait for green next time!'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Target circle for bonus round */}
          {gameState === 'flash' && currentRound === 4 && targetPosition && (
            <>
              <div
                className="absolute w-16 h-16 bg-yellow-400 rounded-full border-4 border-yellow-200 animate-pulse shadow-lg"
                style={{
                  left: `${targetPosition.x}%`,
                  top: `${targetPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              />
              <div
                className="absolute w-8 h-8 bg-red-500 rounded-full border-2 border-red-300"
                style={{
                  left: `${targetPosition.x}%`,
                  top: `${targetPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 11
                }}
              />
            </>
          )}

          {/* Show click position for bonus round */}
          {gameState === 'clicked' && currentRound === 4 && clickPosition && (
            <div
              className="absolute w-4 h-4 bg-blue-400 rounded-full border-2 border-blue-200"
              style={{
                left: `${clickPosition.x}%`,
                top: `${clickPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 12
              }}
            />
          )}
        </div>

        {/* Round Results */}
        {rounds.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Round Results:</h3>
            <div className="grid grid-cols-4 gap-4">
              {rounds.map((round) => (
                <div key={round.roundNumber} className={`rounded-lg p-4 text-center ${
                  round.isBonus ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'
                }`}>
                  <div className="text-sm text-gray-600">
                    {round.isBonus ? 'Bonus' : `Round ${round.roundNumber}`}
                  </div>
                  <div className="text-lg font-bold">
                    {round.reactionTime ? `${round.reactionTime}ms` : 'Failed'}
                  </div>
                  {round.isBonus && round.accuracy && (
                    <div className="text-sm text-yellow-600 font-semibold">
                      {round.accuracy.toFixed(1)}% accuracy
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
