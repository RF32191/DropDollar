'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine } from '@/lib/gameEngine';
import { GameAudio } from '@/utils/gameAudio';
import GameCountdown from './GameCountdown';
import { FairRNGService, FallingObjectRNGConfig } from '@/lib/fairRNGService';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface FallingObjectGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string; // For competition mode
  entryNumber?: number; // For competition mode
  isCompetitionMode?: boolean;
  gameId?: string; // For deterministic gameplay
}

interface FallingObject {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  type: 'coin' | 'dollar' | 'bonus-coin';
  value: number; // Points value
  bounces: number;
}

const OBJECT_TYPES = [
  { type: 'coin' as const, value: 10, weight: 0.6, emoji: '🪙', size: [30, 40] },
  { type: 'dollar' as const, value: 25, weight: 0.3, emoji: '💵', size: [35, 45] },
  { type: 'bonus-coin' as const, value: 50, weight: 0.1, emoji: '🏆', size: [40, 50] }
];

export default function FallingObjectGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, gameId }: FallingObjectGameProps) {
  // Get fair RNG configuration based on listing and attempt number
  const rngConfig = listingId && entryNumber 
    ? FairRNGService.getFallingObjectConfig(listingId, entryNumber)
    : null;
    
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [score, setScore] = useState(0);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [paddleX, setPaddleX] = useState(50); // Percentage position
  const [totalObjects, setTotalObjects] = useState(0);
  const [caughtObjects, setCaughtObjects] = useState(0);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const currentScoreRef = useRef(0); // Track current score for accurate game end reporting

  // Game engine with proper timer and RNG
  const { engine, timer, startGame, stopGame, resetGame } = useGameEngine({
    gameType: 'falling-objects',
    totalTime: 60,
    rng: {
      isPractice: !isCompetitionMode, // Practice mode if not competition
      listingId,
      entryNumber
    },
    onGameEnd: () => {
      setGameState('ended');
      const accuracy = totalObjects > 0 ? (caughtObjects / totalObjects) * 100 : 0;
      
      console.log('Game ending! Final score:', currentScoreRef.current, 'State score:', score);
      
      // Always pass the full result object (both competition and practice modes)
      const gameResult = {
        score: currentScoreRef.current, // Use ref for most up-to-date score
        accuracy,
        avgReactionTime: 0 // Not applicable for this game
      };
      
      console.log('FallingObjectGame calling onGameEnd with:', gameResult);
      onGameEnd(gameResult);
    }
  });

  const createRandomObject = useCallback(() => {
    // Weighted random selection for object types
    const rand = engine.random();
    let selectedType = OBJECT_TYPES[0]; // Default to coin
    let cumulativeWeight = 0;
    
    for (const objType of OBJECT_TYPES) {
      cumulativeWeight += objType.weight;
      if (rand <= cumulativeWeight) {
        selectedType = objType;
        break;
      }
    }
    
    const id = Date.now() + engine.random();
    const x = engine.randomFloat(5, 95); // Wider spawn area for larger view
    const baseVelocityY = engine.randomFloat(0.5, 1.2); // Even slower for better control
    const velocityY = baseVelocityY + engine.randomFloat(0, 0.5);
    const velocityX = engine.randomFloat(-0.3, 0.3); // Very slow horizontal drift
    const size = engine.randomFloat(selectedType.size[0], selectedType.size[1]);
    
    return {
      id,
      x,
      y: -15, // Start higher for taller view
      velocityX,
      velocityY,
      size,
      type: selectedType.type,
      value: selectedType.value,
      bounces: 0
    };
  }, [engine]);

  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;

    setObjects(prevObjects => {
      let caughtThisFrame = 0;
      
      const updatedObjects = prevObjects.map(obj => {
        let newX = obj.x + obj.velocityX * 0.3; // Even slower horizontal movement
        let newY = obj.y + obj.velocityY * 0.6; // Much slower vertical movement
        let newVelocityX = obj.velocityX;
        let newVelocityY = obj.velocityY;
        let newBounces = obj.bounces;

        // Bounce off walls
        if (newX <= 0 || newX >= 95) {
          newVelocityX = -newVelocityX * 0.8; // Energy loss on bounce
          newX = Math.max(0, Math.min(95, newX));
          newBounces++;
        }

        // Check briefcase paddle collision (extra wide paddle for more diverse scoring)
        const paddleLeft = paddleX - 20; // Extra wide briefcase paddle for better scoring zones
        const paddleRight = paddleX + 20;
        const paddleTop = 82; // Adjusted for taller view
        const paddleBottom = 95;

        if (newY >= paddleTop && 
            newY <= paddleBottom &&
            newX >= paddleLeft && 
            newX <= paddleRight &&
            obj.velocityY > 0) { // Only catch if falling
          
          // Calculate location-based bonus with wider paddle for more scoring diversity
          const paddleCenter = paddleX;
          const catchPosition = newX;
          const distanceFromCenter = Math.abs(catchPosition - paddleCenter);
          const maxDistance = 20; // Paddle half-width (extra wide)
          
          // More granular location scoring zones
          let locationMultiplier = 0;
          let zoneDescription = '';
          
          if (distanceFromCenter <= 4) {
            // Perfect center zone (within 4 units)
            locationMultiplier = 1.0; // 100% bonus
            zoneDescription = 'perfect-center';
          } else if (distanceFromCenter <= 9) {
            // Good center zone (4-9 units)
            locationMultiplier = 0.7; // 70% bonus
            zoneDescription = 'good-center';
          } else if (distanceFromCenter <= 15) {
            // Decent catch zone (9-15 units)
            locationMultiplier = 0.4; // 40% bonus
            zoneDescription = 'decent';
          } else {
            // Edge catch zone (15-20 units)
            locationMultiplier = 0.1; // 10% bonus
            zoneDescription = 'edge';
          }
          
          const locationBonus = Math.floor(obj.value * locationMultiplier * 0.6); // Up to 60% bonus
          
          // Precision timing bonus for high variability
          const timingBonus = (Date.now() % 100) / 10; // 0-9.9 points
          
          // Random variability to prevent ties
          const randomBonus = engine.randomFloat(0.1, 4.9);
          
          // Play catch sound based on object type
          if (obj.type === 'coin') {
            GameAudio.playCoinCatch();
          } else if (obj.type === 'dollar') {
            GameAudio.playDollarCatch();
          }
          
          // Calculate total score for this catch
          const totalPoints = obj.value + locationBonus + timingBonus + randomBonus;
          
          caughtThisFrame += totalPoints;
          
          console.log('Object caught!', {
            type: obj.type,
            baseValue: obj.value,
            locationBonus,
            timingBonus: timingBonus.toFixed(1),
            randomBonus: randomBonus.toFixed(1),
            totalPoints: totalPoints.toFixed(1),
            zone: zoneDescription,
            distanceFromCenter: distanceFromCenter.toFixed(1),
            multiplier: `${(locationMultiplier * 100).toFixed(0)}%`
          });
          
          return null; // Will be filtered out
        }

        // Gravity and air resistance (much slower)
        newVelocityY += 0.1; // Very reduced gravity for slower acceleration
        newVelocityX *= 0.998; // Minimal air resistance

        return {
          ...obj,
          x: newX,
          y: newY,
          velocityX: newVelocityX,
          velocityY: newVelocityY,
          bounces: newBounces
        };
      }).filter((obj): obj is FallingObject => {
        if (obj === null) return false; // Caught objects
        if (obj.y >= 100) {
          // Object fell off screen - play miss sound
          GameAudio.playObjectMiss();
          return false;
        }
        return true;
      });

      // Update score immediately after processing objects
      if (caughtThisFrame > 0) {
        console.log('Updating score! Adding', caughtThisFrame, 'points');
        setScore(prev => {
          const newScore = prev + caughtThisFrame;
          currentScoreRef.current = newScore; // Update ref for accurate game end reporting
          console.log('Score before:', prev, 'Score after:', newScore);
          return newScore;
        });
        setCaughtObjects(prev => prev + caughtThisFrame);
      }

      return updatedObjects;
    });

    // Object spawning logic - use RNG config if available
    if (rngConfig) {
      // Competition mode: spawn objects based on RNG configuration
      const gameTime = 60 - timer.timeLeft; // Time elapsed in seconds
      const gameTimeMs = gameTime * 1000; // Convert to milliseconds
      
      // Check if any objects should spawn at this time
      const objectsToSpawn = rngConfig.sequence.filter(item => {
        const spawnTime = item.time;
        const timeDiff = Math.abs(gameTimeMs - spawnTime);
        return timeDiff <= 50; // Spawn within 50ms window (3 frames at 60fps)
      });
      
      objectsToSpawn.forEach(spawnConfig => {
        // Check if we already spawned this object (prevent duplicates)
        const alreadySpawned = objects.some(obj => 
          Math.abs(obj.x - spawnConfig.x) < 5 && 
          obj.type === spawnConfig.type
        );
        
        if (!alreadySpawned) {
          const newObject: FallingObject = {
            id: Date.now() + Math.random(),
            x: spawnConfig.x,
            y: -15,
            velocityX: engine.randomFloat(-0.2, 0.2), // Small random drift
            velocityY: spawnConfig.speed * 0.8, // Use configured speed
            size: spawnConfig.type === 'coin' ? 35 : spawnConfig.type === 'cash' ? 40 : 45,
            type: spawnConfig.type === 'coin' ? 'coin' : 
                  spawnConfig.type === 'cash' ? 'dollar' : 'bonus-coin',
            value: spawnConfig.value,
            bounces: 0
          };
          
          setObjects(prev => [...prev, newObject]);
          setTotalObjects(prev => prev + 1);
          
          console.log(`Spawned RNG object at ${gameTime}s:`, spawnConfig);
        }
      });
    } else {
      // Practice mode: use original random spawning
      const timeElapsed = 60 - timer.timeLeft;
      const spawnMultiplier = 1 + (timeElapsed * 0.06); // Increases 6% every second
      const spawnRate = Math.min(0.1, 0.025 * spawnMultiplier); // Max 10% spawn rate, starts at 2.5%
      if (engine.random() < spawnRate) {
        setObjects(prev => [...prev, createRandomObject()]);
        setTotalObjects(prev => prev + 1);
      }
    }

    animationRef.current = requestAnimationFrame(updateGame);
  }, [gameState, paddleX, timer.timeLeft, createRandomObject, engine, rngConfig, objects]);

  const handleKeyPress = useCallback((key: string, pressed: boolean) => {
    setKeysPressed(prev => {
      const newSet = new Set(prev);
      if (pressed) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  }, []);

  // Handle mouse/touch movement for iPhone support
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    // Keep paddle within bounds
    const boundedX = Math.max(10, Math.min(90, percentage));
    setPaddleX(boundedX);
  }, [gameState]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent scrolling
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    // Keep paddle within bounds
    const boundedX = Math.max(10, Math.min(90, percentage));
    setPaddleX(boundedX);
  }, [gameState]);

  // Handle paddle movement (keyboard)
  useEffect(() => {
    let moveSpeed = 0;
    if (keysPressed.has('ArrowLeft') || keysPressed.has('a')) {
      moveSpeed -= 1.5; // Slightly slower movement
    }
    if (keysPressed.has('ArrowRight') || keysPressed.has('d')) {
      moveSpeed += 1.5;
    }

    if (moveSpeed !== 0) {
      const interval = setInterval(() => {
        setPaddleX(prev => Math.max(10, Math.min(90, prev + moveSpeed))); // Adjusted bounds
      }, 16); // ~60fps

      return () => clearInterval(interval);
    }
  }, [keysPressed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) {
        event.preventDefault();
        handleKeyPress(event.key, true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) {
        event.preventDefault();
        handleKeyPress(event.key, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(updateGame);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, updateGame]);

  const handleStartGame = () => {
    console.log('Starting FallingObjectGame countdown...');
    
    // Reset game state
    setScore(0);
    currentScoreRef.current = 0; // Reset score ref
    setObjects([]);
    setPaddleX(50);
    setTotalObjects(0);
    setCaughtObjects(0);
    
    // Start countdown
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('Countdown complete, starting game...');
    
    // Generate initial objects BEFORE starting timer
    const initialObjects: FallingObject[] = [];
    for (let i = 0; i < 3; i++) { // Start with 3 objects
      const obj = createRandomObject();
      if (obj) {
        // Spread them out vertically so they don't all fall at once
        obj.y = -15 - (i * 25); // Adjusted for taller view
        initialObjects.push(obj);
      }
    }
    setObjects(initialObjects);
    setTotalObjects(initialObjects.length);
    
    // Now start the game and timer
    setGameState('playing');
    startGame(); // Start the engine timer
  };

  const handleCountdownCancel = () => {
    console.log('Countdown cancelled');
    setGameState('ready');
  };

  const getObjectStyle = (obj: FallingObject) => {
    const objType = OBJECT_TYPES.find(t => t.type === obj.type);
    
    return {
      position: 'absolute' as const,
      left: `${obj.x}%`,
      top: `${obj.y}%`,
      width: `${obj.size}px`,
      height: `${obj.size}px`,
      transform: 'translate(-50%, -50%)',
      transition: 'none',
      fontSize: `${obj.size * 0.8}px`, // Scale emoji with size
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)', // Add shadow for visibility
      filter: 'brightness(1.2) contrast(1.1) drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))', // Enhanced glow
      animation: 'bounce 0.5s ease-in-out infinite alternate', // Subtle bounce animation
      zIndex: 10
    };
  };

  if (gameState === 'ended') {
    return null; // Parent handles the results
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black bg-opacity-95 flex flex-col z-50 overflow-hidden">
      {/* Header - Always Visible */}
      <div className="flex justify-between items-center px-6 py-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="text-2xl font-bold text-white">
          💰 Falling Object Catch
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-lg text-white font-semibold">⏱️ {timer.timeLeft}s</div>
          <div className="text-lg text-yellow-400 font-bold">💰 {score.toFixed(1)}</div>
          <div className="text-lg text-green-400">✅ {caughtObjects}/{totalObjects}</div>
          {onExit && (
            <button 
              onClick={onExit}
              className="text-white hover:text-red-400 text-2xl font-bold bg-white/10 hover:bg-red-500/20 rounded-full w-10 h-10 flex items-center justify-center transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-4 py-6">
        <div className="w-full max-w-6xl mx-auto">

        {gameState === 'countdown' && (
          <GameCountdown
            onCountdownComplete={handleCountdownComplete}
            onCancel={handleCountdownCancel}
            showTitle="💰 Falling Object Catch"
          />
        )}

        {gameState === 'ready' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-4xl font-bold text-white text-center mb-6">
              💰 Falling Object Catch
            </div>
            
            {/* Epilepsy Warning */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-600 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-white text-lg font-black">⚠️</span>
                </div>
                <p className="text-white font-black text-xl tracking-wide">EPILEPSY WARNING</p>
              </div>
              <p className="text-base text-white font-semibold leading-relaxed">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>
            
            {/* Instructions - Dark Money Green Theme */}
            <div className="bg-gradient-to-r from-green-800 to-green-900 border-2 border-green-600 rounded-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-black">💰</span>
                </div>
                <p className="text-white font-black text-xl">How to Play:</p>
              </div>
              
              <div className="space-y-3 text-white text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Catch:</span> Use your cash case to catch falling money!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Move:</span> Use <strong>Arrow Keys</strong> or <strong>A/D</strong> to move your cash case</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Physics:</span> Objects bounce and drift unpredictably - be ready!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Scoring:</span> 🎯 Each caught object = 1 point</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-600/30 to-green-500/30 border border-green-400/50 rounded-lg p-3 mt-4">
                <p className="text-sm text-green-200">
                  <span className="text-green-300 font-bold">💡 Pro Tip:</span> Keep your cash case moving and watch for bouncing patterns!
                </p>
              </div>
            </div>
            <button
              onClick={handleStartGame}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
            >
              🚀 Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            <div className="text-xl font-bold text-gray-900">
              💰 Catch the coins and dollars with your cash case!
            </div>
            
            {/* Score Info */}
            <div className="bg-green-50 p-3 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>🪙 Coins:</span>
                  <span className="font-bold">10pts</span>
                </div>
                <div className="flex justify-between">
                  <span>💵 Dollars:</span>
                  <span className="font-bold">25pts</span>
                </div>
                <div className="flex justify-between">
                  <span>🏆 Bonus:</span>
                  <span className="font-bold">50pts</span>
                </div>
                <div className="flex justify-between">
                  <span>🎯 Perfect Center:</span>
                  <span className="font-bold text-green-600">+60%</span>
                </div>
                <div className="flex justify-between">
                  <span>🟡 Good Zone:</span>
                  <span className="font-bold text-yellow-600">+42%</span>
                </div>
                <div className="flex justify-between">
                  <span>🔵 Decent Zone:</span>
                  <span className="font-bold text-blue-600">+24%</span>
                </div>
              </div>
            </div>
            
            {/* Game Area - Much Larger and Taller */}
            <div 
              ref={gameAreaRef}
              className="relative rounded-xl border-4 border-gray-300 overflow-hidden mx-auto cursor-none"
              style={{ 
                height: '450px', 
                width: '800px', 
                maxWidth: '90vw', 
                touchAction: 'none',
                background: `
                  radial-gradient(circle at 30% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, rgba(255, 255, 0, 0.05) 0%, transparent 50%),
                  linear-gradient(180deg, #87CEEB 0%, #98FB98 25%, #90EE90 50%, #32CD32 75%, #228B22 100%)
                `,
                animation: 'backgroundShift 10s ease-in-out infinite'
              }}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onTouchStart={handleTouchMove}
            >
              {/* Falling Objects - Coins and Dollars */}
              {objects.map((obj) => {
                const objType = OBJECT_TYPES.find(t => t.type === obj.type);
                return (
                  <div
                    key={obj.id}
                    style={getObjectStyle(obj)}
                  >
                    {objType?.emoji || '🪙'}
                  </div>
                );
              })}
              
              {/* Cash Case Paddle - Extra Wide for better scoring zones */}
              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `${paddleX}%`,
                  top: '85%',
                  width: '200px', // Extra wide to match collision detection
                  height: '45px',
                  transform: 'translateX(-50%)',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  zIndex: 20
                }}
              >
                <img 
                  src="/CashCase.PNG" 
                  alt="Cash Case" 
                  style={{
                    width: '80px',
                    height: '45px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))'
                  }}
                />
              </div>
              
              {/* Scoring Zone Indicators (subtle visual guides) */}
              <div
                className="absolute opacity-20"
                style={{
                  left: `${paddleX}%`,
                  top: '83%',
                  width: '40px', // Perfect center zone (wider)
                  height: '2px',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#10B981', // Green for perfect center
                  zIndex: 15
                }}
              />
              <div
                className="absolute opacity-15"
                style={{
                  left: `${paddleX}%`,
                  top: '83%',
                  width: '90px', // Good center zone (wider)
                  height: '1px',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#F59E0B', // Yellow for good zone
                  zIndex: 14
                }}
              />
              <div
                className="absolute opacity-10"
                style={{
                  left: `${paddleX}%`,
                  top: '83%',
                  width: '150px', // Decent zone indicator
                  height: '1px',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#3B82F6', // Blue for decent zone
                  zIndex: 13
                }}
              />
            </div>

            <div className="text-sm text-gray-600">
              Use Arrow Keys or A/D to move your briefcase • Catch in the center for bonus points!
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-white/60 space-y-2 text-center">
          <div>💰 Catch coins and dollars with your briefcase</div>
          <div>📍 Center catches earn bonus points</div>
          <div>💵 Dollars worth more than coins</div>
          <div>⌨️ Arrow Keys or A/D to move briefcase</div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}