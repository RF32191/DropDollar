'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine } from '@/lib/gameEngine';
import { GameAudio } from '@/utils/gameAudio';
import GameCountdown from './GameCountdown';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface LaserDodgeGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string; // For competition mode
  entryNumber?: number; // For competition mode
  isCompetitionMode?: boolean;
}

interface Laser {
  id: number;
  x: number;
  y: number;
  isHarmful: boolean;
  timeToHarmful: number;
  speed: number;
}

interface Ship {
  x: number;
  y: number;
}

export default function LaserDodgeGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode }: LaserDodgeGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [ship, setShip] = useState<Ship>({ x: 50, y: 80 }); // Percentage positions
  const [score, setScore] = useState(0);
  const currentScoreRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastLaserSpawnRef = useRef<number>(0);
  const animationRef = useRef<number>();

  // Game engine with proper timer
  const { engine, timer, startGame, stopGame, resetGame } = useGameEngine({
    gameType: 'laser-dodge',
    totalTime: 60,
    rng: {
      isPractice: !isCompetitionMode,
      listingId,
      entryNumber
    },
    onGameEnd: () => {
      console.log('LaserDodge: Game engine onGameEnd callback triggered');
      GameAudio.playGameEnd();
      
      setGameState('ended');
      const gameResult = {
        score: currentScoreRef.current,
        accuracy: 100, // Survival game - if you're alive, you're 100% accurate
        avgReactionTime: 0 // Not applicable for this game type
      };
      
      console.log('LaserDodgeGame calling onGameEnd with:', gameResult);
      onGameEnd(gameResult);
    }
  });

  // Spawn laser
  const spawnLaser = useCallback(() => {
    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;
    const level = Math.floor(timeSinceStart / 10000) + 1; // Level up every 10 seconds
    
    // Increase spawn rate with level
    const spawnRate = Math.max(800, 2000 - (level * 200));
    
    if (now - lastLaserSpawnRef.current > spawnRate) {
      const newLaser: Laser = {
        id: now,
        x: Math.random() * 90 + 5, // Random X position (5% to 95%)
        y: -5, // Start above the screen
        isHarmful: false,
        timeToHarmful: 2000 + Math.random() * 1000, // 2-3 seconds
        speed: 0.5 + (level * 0.1) + Math.random() * 0.3 // Increase speed with level
      };
      
      setLasers(prev => [...prev, newLaser]);
      lastLaserSpawnRef.current = now;
    }
  }, []);

  // Update game
  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;

    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;
    const level = Math.floor(timeSinceStart / 10000) + 1;

    // Update score (survival time based)
    const newScore = Number((timeSinceStart / 100).toFixed(2));
    currentScoreRef.current = newScore;
    setScore(newScore);

    // Spawn new lasers
    spawnLaser();

    // Update lasers
    setLasers(prevLasers => {
      return prevLasers.map(laser => {
        const updatedLaser = { ...laser };
        
        // Move laser down
        updatedLaser.y += updatedLaser.speed;
        
        // Check if laser should become harmful
        if (!updatedLaser.isHarmful) {
          const age = now - laser.id;
          if (age > laser.timeToHarmful) {
            updatedLaser.isHarmful = true;
            GameAudio.playCoinSound(); // Warning sound
          }
        }
        
        return updatedLaser;
      }).filter(laser => laser.y < 105); // Remove lasers that went off screen
    });

    // Check collisions
    const harmfulLasers = lasers.filter(l => l.isHarmful);
    for (const laser of harmfulLasers) {
      // Simple collision detection (laser and ship overlap)
      if (Math.abs(laser.x - ship.x) < 8 && Math.abs(laser.y - ship.y) < 8) {
        // Game Over!
        console.log('LaserDodge: Collision detected! Game Over!');
        stopGame();
        return;
      }
    }

    animationRef.current = requestAnimationFrame(updateGame);
  }, [gameState, ship, lasers, spawnLaser, stopGame]);

  // Handle mouse movement
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    // Keep ship within bounds
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    setShip({ x: boundedX, y: boundedY });
  }, [gameState]);

  // Handle touch movement (iPhone support)
  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    // Keep ship within bounds
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    setShip({ x: boundedX, y: boundedY });
  }, [gameState]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleTouchMove(event);
  }, [handleTouchMove]);

  // Start game
  const handleStartGame = () => {
    console.log('LaserDodge: Starting countdown...');
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('LaserDodge: Countdown complete, starting game...');
    
    // Reset game state
    setScore(0);
    currentScoreRef.current = 0;
    setLasers([]);
    setShip({ x: 50, y: 80 });
    gameStartTimeRef.current = Date.now();
    lastLaserSpawnRef.current = Date.now();
    
    setGameState('playing');
    startGame();
    
    // Start game loop
    animationRef.current = requestAnimationFrame(updateGame);
  };

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

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null; // Parent handles the results
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-cyan-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">⚡</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
              Laser Dodge
            </h2>
            <p className="text-purple-200 text-sm mb-6 font-medium">Survival Space Challenge</p>
            
            <div className="text-left text-sm text-white/90 mb-8 space-y-3 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">?</span>
                </div>
                <p className="text-white font-semibold">How to Play:</p>
              </div>
              
              <div className="space-y-3 pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-semibold">Control:</span> Move mouse or finger to pilot your ship</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-red-300 font-semibold">Avoid:</span> Dodge the dangerous red lasers</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-blue-300 font-semibold">Warning:</span> Blue lasers turn red when deadly</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-yellow-300 font-semibold">Survive:</span> Stay alive for higher scores</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-purple-300 font-semibold">Difficulty:</span> Gets harder over time</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 rounded-xl p-4 mt-6">
                <p className="text-xs text-purple-200">
                  <span className="text-cyan-300 font-bold">🚀 Pro Tip:</span> Watch for the color change - blue means safe, red means deadly! 
                  Move smoothly to avoid getting trapped by multiple lasers.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              {!isCompetitionMode && onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse`}
              >
                ⚡ {isCompetitionMode ? 'Start Competition' : 'Start Game'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show countdown overlay
  if (gameState === 'countdown') {
    return (
      <GameCountdown
        onCountdownComplete={handleCountdownComplete}
        gameName="Laser Dodge"
        instructions="Move your mouse or finger to control the ship. Avoid red lasers!"
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold text-gray-900">
            ⚡ Laser Dodge
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">Time: {timer.timeLeft}s</div>
            <div className="text-sm text-gray-600">Score: {score.toFixed(2)}</div>
            {!isCompetitionMode && onExit && (
              <button 
                onClick={onExit}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="space-y-6">
            <div className="text-xl font-bold text-gray-900">
              ⚡ Dodge the red lasers with your ship! 🚀
            </div>
            
            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative bg-gradient-to-b from-indigo-900 via-purple-900 to-black rounded-xl h-96 border-4 border-gray-300 overflow-hidden cursor-none"
              style={{ touchAction: 'none' }}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              {/* Stars background */}
              <div className="absolute inset-0">
                {Array.from({ length: 50 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                    style={{
                      left: `${(i * 137) % 100}%`,
                      top: `${(i * 211) % 100}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>

              {/* Lasers */}
              {lasers.map((laser) => (
                <div
                  key={laser.id}
                  className={`absolute w-2 h-8 rounded-full transition-colors duration-300 ${
                    laser.isHarmful 
                      ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                      : 'bg-blue-400 shadow-lg shadow-blue-400/50'
                  }`}
                  style={{
                    left: `${laser.x}%`,
                    top: `${laser.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
              
              {/* Ship */}
              <div
                className="absolute w-6 h-6 bg-green-400 rounded-full shadow-lg shadow-green-400/50 animate-pulse"
                style={{
                  left: `${ship.x}%`,
                  top: `${ship.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                  🚀
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 text-center">
              <strong>Desktop:</strong> Move mouse to control ship • <strong>Mobile:</strong> Touch and drag
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-600 space-y-2">
          <div>⚡ Move your ship to avoid red lasers</div>
          <div>🔵 Blue lasers are harmless but turn red when dangerous</div>
          <div>🚀 Survive as long as possible for higher scores</div>
        </div>
      </div>
    </div>
  );
}