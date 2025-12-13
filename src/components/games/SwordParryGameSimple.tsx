'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FairRNGService, SwordSlashRNGConfig } from '@/lib/fairRNGService';
import { playSwordHit, playSwordMiss, playGameEnd } from '@/lib/gameAudio';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
console.log('');
console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
console.log('⚔️ SWORD SLASH SIMPLE v8.0 - BUILD 20251127-1900');
console.log('⚔️ If you see this, NEW CODE IS RUNNING!');
console.log('🔒 Audit logs WILL be sent to admin dashboard');
console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
console.log('');

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface SwordParryGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  rngSeed?: number; // RNG seed (1-20) for deterministic spawns
}

interface Attack {
  id: number;
  x: number;
  y: number;
  destroyed: boolean;
  hitType?: string; // Track the type of hit for visual feedback
}

export default function SwordParryGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, rngSeed }: SwordParryGameProps) {
  // DON'T use pre-generated configs - causes gameplay issues (stacking swords)
  // Instead, use rngSeed to initialize engine for runtime generation
  const rngConfig = null; // Disabled - using runtime RNG instead
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [isClicking, setIsClicking] = useState(false);
  const [destroyedCount, setDestroyedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameRunning = useRef(false);
  const lastSpawn = useRef(0);
  const currentScoreRef = useRef(0); // Track current score for endGame
  const gameStartTimeRef = useRef(0); // Track game start time for speed scoring
  const gameEndedRef = useRef(false); // Prevent multiple endGame calls
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null); // Background music during gameplay
  const audioContextRef = useRef<AudioContext | null>(null); // For victory sound
  const audioUnlockedRef = useRef(false); // Track if audio is unlocked
  
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

  // Simple countdown
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) {
      startGame();
    }
  }, [gameState, countdown]);

  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  // Simple game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      if (!gameRunning.current) return;

      const now = Date.now();
      const timeSinceStart = now - gameStartTimeRef.current;
      
      // Use seeded RNG if available (competition mode)
      if (seededRng) {
        // COMPETITION MODE: Match practice mode behavior but with seeded RNG
        const gameTime = Math.floor(timeSinceStart / 10000) + 1; // Level 1-6 based on 10-second intervals
        
        const attacksPerSpawn = Math.min(gameTime, 5); // Max 5 attacks at once (SAME as practice)
        const spawnRate = Math.max(1500, 2500 - (gameTime * 200)); // Faster spawning (SAME as practice)
        
        // Spawn multiple attacks based on difficulty level (SAME as practice)
        if (now - lastSpawn.current > spawnRate) {
          const newAttacks: Attack[] = [];
          
          for (let i = 0; i < attacksPerSpawn; i++) {
            // Generate position with seeded RNG
            let x = seededRng.nextFloat(10, 90);
            let y = seededRng.nextFloat(10, 90);
            
            // Simple anti-stacking: check against attacks spawned THIS frame only
            let attempts = 0;
            while (attempts < 10) {
              const tooClose = newAttacks.some(a => {
                const dx = a.x - x;
                const dy = a.y - y;
                return Math.sqrt(dx * dx + dy * dy) < 20; // Min 20% apart
              });
              
              if (!tooClose) break;
              
              x = seededRng.nextFloat(10, 90);
              y = seededRng.nextFloat(10, 90);
              attempts++;
            }
            
            const newAttack: Attack = {
              id: now + i + seededRng.next() * 1000,
              x,
              y,
              destroyed: false
            };
            
            newAttacks.push(newAttack);
          }
          
          // Add all attacks at once
          setAttacks(prev => [...prev, ...newAttacks]);
          setTotalCount(prev => prev + newAttacks.length);
          lastSpawn.current = now;
        }
      } else {
        // PRACTICE MODE: Progressive difficulty
        const gameTime = Math.floor((60 - timeLeft) / 10) + 1; // Level 1-6 based on 10-second intervals
        
        const attacksPerSpawn = Math.min(gameTime, 5); // Max 5 attacks at once
        const spawnRate = Math.max(1500, 2500 - (gameTime * 200)); // Faster spawning too
        
        // Spawn multiple attacks based on difficulty level
        if (now - lastSpawn.current > spawnRate) {
          for (let i = 0; i < attacksPerSpawn; i++) {
            const newAttack: Attack = {
              id: now + i, // Unique ID for each attack
              x: Math.random() * 80 + 10, // 10-90% of screen
              y: Math.random() * 80 + 10,
              destroyed: false
            };
            setAttacks(prev => [...prev, newAttack]);
            setTotalCount(prev => prev + 1);
          }
          lastSpawn.current = now;
        }
      }

      // Remove old attacks after 5 seconds
      setAttacks(prev => prev.filter(attack => {
        const age = now - attack.id;
        if (age > 5000 && !attack.destroyed) {
          // Attack expired - game over
          endGame();
          return false;
        }
        return age < 6000; // Keep for 1 extra second after destruction
      }));

      requestAnimationFrame(gameLoop);
    };

    gameRunning.current = true;
    gameLoop();

    return () => {
      gameRunning.current = false;
    };
  }, [gameState, timeLeft]); // Add timeLeft dependency to track difficulty changes

  // Mouse and Touch handling
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    // Unlock audio on first mouse interaction
    if (!audioUnlockedRef.current) {
      unlockAudio();
    }
    
    if (gameState !== 'playing') return;
    
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setMousePos({ 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    });
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    
    event.preventDefault(); // Prevent scrolling
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touch = event.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    setMousePos({ 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    });
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsClicking(true);
    
    // Get click position for accuracy calculation
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = ((event.clientX - rect.left) / rect.width) * 100;
    const clickY = ((event.clientY - rect.top) / rect.height) * 100;
    
    performAttack(clickX, clickY);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setIsClicking(true);
    
    event.preventDefault(); // Prevent default touch behavior
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const touch = event.touches[0];
    const clickX = ((touch.clientX - rect.left) / rect.width) * 100;
    const clickY = ((touch.clientY - rect.top) / rect.height) * 100;
    
    performAttack(clickX, clickY);
  };

  // Unified attack logic for both mouse and touch
  const performAttack = (clickX: number, clickY: number) => {
    // Check for hits with accuracy-based bonus points
    let hitDetected = false;
    setAttacks(prev => prev.map(attack => {
      if (attack.destroyed || hitDetected) return attack;
      
      const distance = Math.sqrt(
        Math.pow(attack.x - clickX, 2) + Math.pow(attack.y - clickY, 2)
      );
      
      if (distance < 15) { // Hit!
        hitDetected = true;
        let basePoints = 100;
        let bonusPoints = 0;
        let hitType = 'Hit';
        
        // Calculate accuracy bonus based on distance from center
        if (distance < 3) {
          // PERFECT HIT - very close to center
          bonusPoints = 100;
          hitType = 'PERFECT HIT';
        } else if (distance < 6) {
          // EXCELLENT HIT - close to center
          bonusPoints = 50;
          hitType = 'EXCELLENT';
        } else if (distance < 10) {
          // GOOD HIT - moderate accuracy
          bonusPoints = 25;
          hitType = 'GOOD HIT';
        }
        // else: Regular hit, no bonus
        
        const totalPoints = basePoints + bonusPoints;
        
        // Add speed bonus - faster destruction = more points
        const timeSinceStart = Date.now() - gameStartTimeRef.current;
        const speedMultiplier = Math.max(0.5, (60000 - timeSinceStart) / 60000); // 1.0 at start, 0.5 at end
        const speedBonus = totalPoints * speedMultiplier * 0.2; // Up to 20% speed bonus
        
        const finalPoints = Number((totalPoints + speedBonus).toFixed(2)); // Decimal scoring
        
        // Play hit sound based on hit type
        playSwordHit(hitType);
        
        // Update score immediately
        setScore(currentScore => {
          const newScore = Number((currentScore + finalPoints).toFixed(2));
          currentScoreRef.current = newScore; // Keep ref in sync
          console.log(`SwordParry: ${hitType}! Score: ${currentScore} + ${finalPoints.toFixed(2)} = ${newScore} (speed bonus: ${speedBonus.toFixed(2)})`);
          return newScore;
        });
        
        setDestroyedCount(d => d + 1);
        
        return { ...attack, destroyed: true, hitType };
      }
      
      return attack;
    }));
    
    // Play miss sound if no hit was detected
    if (!hitDetected) {
      playSwordMiss();
    }
  };

  const handleMouseUp = () => {
    setIsClicking(false);
  };

  const handleTouchEnd = () => {
    setIsClicking(false);
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    currentScoreRef.current = 0; // Reset score ref
    gameStartTimeRef.current = Date.now(); // Track start time for speed scoring
    setAttacks([]);
    setDestroyedCount(0);
    setTotalCount(0);
    setTimeLeft(60);
    lastSpawn.current = Date.now();
  };

  const endGame = async () => {
    // Prevent multiple calls
    if (gameEndedRef.current) {
      console.log('⚠️ SwordParry: endGame already called, ignoring duplicate');
      return;
    }
    
    gameEndedRef.current = true;
    gameRunning.current = false;
    setGameState('ended');
    
    const accuracy = totalCount > 0 ? (destroyedCount / totalCount) * 100 : 0;
    const finalScore = currentScoreRef.current; // Use ref for most current score
    
    // Play game end sound based on performance
    const performance = accuracy > 80 ? 'great' : accuracy < 50 ? 'poor' : 'good';
    playGameEnd(performance);
    
    console.log(`SwordParry: Game ended. Final score: ${finalScore}, Accuracy: ${accuracy.toFixed(1)}%`);
    
    // 🔒 AUDIT LOGGING - Required for fair skill-based gaming
    console.log('');
    console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
    console.log('⚔️ SWORD SLASH: LOGGING TO AUDIT SYSTEM');
    console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
    console.log('');
    
    const gameDuration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    
    try {
      const auditResult = await logGameCompletion({
        gameType: GAME_TYPES.SWORD_PARRY,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy,
        reactionTime: 250,
        durationSeconds: gameDuration,
        additionalData: {
          listingId,
          entryNumber,
          destroyedCount,
          totalCount
        }
      });
      console.log('⚔️ Audit result:', auditResult);
    } catch (error) {
      console.error('⚔️ Audit logging failed:', error);
    }
    
    onGameEnd({
      score: finalScore,
      accuracy,
      avgReactionTime: 250
    });
  };

  const handleStartGame = () => {
    // Unlock audio on user interaction (clicking start)
    unlockAudio();
    
    setCountdown(3);
    setGameState('countdown');
  };

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-red-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-full overflow-y-auto text-center border border-white/20 shadow-2xl">
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">⚔️</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
              Sword Slash
            </h2>
            <p className="text-red-200 text-sm mb-4 sm:mb-6 font-medium">Click to Destroy Attacks</p>
            
            {/* Epilepsy Warning */}
            <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-400/50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xs sm:text-sm font-bold">⚠️</span>
                </div>
                <p className="text-red-200 font-bold text-sm sm:text-base">EPILEPSY WARNING</p>
              </div>
              <p className="text-xs sm:text-sm text-red-100">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>
            
            <div className="text-left text-xs sm:text-sm text-white/90 mb-6 sm:mb-8 space-y-3 bg-black/20 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-white/10 max-h-64 sm:max-h-none overflow-y-auto">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">⚔️</span>
                </div>
                <p className="text-white font-semibold">How to Play:</p>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Desktop:</span> Move mouse to control sword position</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Mobile:</span> Touch and drag to move sword</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-orange-300 font-semibold">Attack:</span> Click/tap to slash and destroy red attacks</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-semibold">Accuracy Bonus:</span> Direct hits give bonus points!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-semibold">Perfect (🎯):</span> +100 bonus • Excellent (✨): +50 • Good (👍): +25</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Survive:</span> Don't let attacks expire without destroying them</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-semibold">Difficulty:</span> More attacks spawn every 10 seconds (1→5 per wave)</p>
                </div>
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
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse text-sm sm:text-base`}
              >
                ⚔️ Start Slashing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Sword Slash</h2>
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">Click/tap to destroy the red attacks!</p>
          <div className="text-6xl sm:text-8xl font-bold text-red-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4">Get ready...</p>
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
            ⚔️ Sword Slash {timeLeft <= 10 && <span className="text-red-400 animate-pulse">FINAL!</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-base sm:text-lg">
            <div className="text-yellow-300 font-bold">⏱️ {timeLeft}s</div>
            <div className="text-green-300 font-bold">🎯 {score.toFixed(0)}</div>
            <div className="text-blue-300 font-bold">{destroyedCount}/{totalCount}</div>
            <div className="text-purple-300 font-bold">Lv {Math.floor((60 - timeLeft) / 10) + 1}/6</div>
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

        <div 
          ref={gameAreaRef}
          className="flex-1 relative bg-gradient-to-br from-gray-800 via-gray-900 to-black overflow-hidden touch-none select-none"
          style={{
            cursor: 'url("/SWORD.png") 32 32, crosshair', // Bigger cursor with larger hotspot
            touchAction: 'none', // Prevent default touch behaviors
            background: `
              radial-gradient(circle at 20% 20%, rgba(255, 0, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(255, 165, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(255, 255, 0, 0.05) 0%, transparent 50%),
              linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 25%, #1a1a2e 50%, #16213e 75%, #0f0f23 100%)
            `,
            animation: 'backgroundShift 8s ease-in-out infinite'
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Attacks */}
          {attacks.map((attack) => (
            <div
              key={attack.id}
              className={`absolute w-8 h-8 rounded-full transition-all duration-200 ${
                attack.destroyed 
                  ? attack.hitType === 'PERFECT HIT' 
                    ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 animate-ping border-4 border-yellow-200' // Perfect hit - gold gradient
                    : attack.hitType === 'EXCELLENT'
                    ? 'bg-gradient-to-br from-green-300 to-green-600 animate-ping border-2 border-green-200' // Excellent - green gradient
                    : attack.hitType === 'GOOD HIT'
                    ? 'bg-gradient-to-br from-blue-300 to-blue-600 animate-ping border-2 border-blue-200' // Good - blue gradient
                    : 'bg-gradient-to-br from-green-400 to-green-600 animate-ping' // Regular hit - green gradient
                  : 'bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-300 animate-pulse'
              }`}
              style={{
                left: `${attack.x}%`,
                top: `${attack.y}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: attack.destroyed 
                  ? attack.hitType === 'PERFECT HIT'
                    ? '0 0 40px rgba(251, 191, 36, 1), 0 0 80px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.3)' // Enhanced gold glow
                    : attack.hitType === 'EXCELLENT'
                    ? '0 0 35px rgba(34, 197, 94, 1), 0 0 70px rgba(34, 197, 94, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.2)' // Enhanced green glow
                    : attack.hitType === 'GOOD HIT'
                    ? '0 0 30px rgba(59, 130, 246, 1), 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.2)' // Enhanced blue glow
                    : '0 0 25px rgba(34, 197, 94, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.1)' // Standard green glow
                  : '0 0 25px rgba(239, 68, 68, 1), 0 0 50px rgba(239, 68, 68, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.1)', // Enhanced red glow
                zIndex: 10,
                filter: attack.destroyed ? 'brightness(1.2) contrast(1.1)' : 'brightness(1.1)'
              }}
            >
              {!attack.destroyed && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                  ⚔️
                </div>
              )}
              {/* Show hit type text briefly */}
              {attack.destroyed && attack.hitType && attack.hitType !== 'Hit' && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-black/50 px-2 py-1 rounded animate-bounce">
                  {attack.hitType === 'PERFECT HIT' ? '🎯 PERFECT!' : 
                   attack.hitType === 'EXCELLENT' ? '✨ EXCELLENT!' : 
                   attack.hitType === 'GOOD HIT' ? '👍 GOOD!' : ''}
                </div>
              )}
            </div>
          ))}
          
          {/* Visual Sword - Using SWORD.png */}
          <div
            className={`absolute w-12 h-12 transition-all duration-100 ${
              isClicking ? 'scale-125' : 'scale-100'
            }`}
            style={{
              left: `${mousePos.x}%`,
              top: `${mousePos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 15,
              backgroundImage: 'url("/SWORD.png")',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              filter: isClicking 
                ? 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.8)) brightness(1.2)' 
                : 'drop-shadow(0 0 6px rgba(156, 163, 175, 0.6))'
            }}
          />
          
          {/* Slash zone when clicking */}
          {isClicking && (
            <div
              className="absolute w-8 h-8 border-2 border-yellow-400 rounded-full animate-ping"
              style={{
                left: `${mousePos.x}%`,
                top: `${mousePos.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 12
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
