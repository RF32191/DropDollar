'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
}

interface Laser {
  id: number;
  type: 'horizontal' | 'vertical';
  position: number;
  isHarmful: boolean;
  timeToHarmful: number;
  createdAt: number;
}

interface Ship {
  x: number;
  y: number;
}

export default function LaserDodgeGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode }: LaserDodgeGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [ship, setShip] = useState<Ship>({ x: 50, y: 50 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastLaserSpawnRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const currentScoreRef = useRef(0);

  // Spawn laser
  const spawnLaser = useCallback(() => {
    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;
    const level = Math.floor(timeSinceStart / 5000) + 1;
    
    const spawnRate = Math.max(200, 800 - (level * 50));
    
    if (now - lastLaserSpawnRef.current > spawnRate) {
      const isHorizontal = Math.random() < 0.5;
      
      const newLaser: Laser = {
        id: now + Math.random(),
        type: isHorizontal ? 'horizontal' : 'vertical',
        position: Math.random() * 100,
        isHarmful: false,
        timeToHarmful: Math.max(800, 1500 - (level * 100)),
        createdAt: now
      };
      
      setLasers(prev => [...prev, newLaser]);
      lastLaserSpawnRef.current = now;
    }
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;

    // Update score
    const newScore = Number((timeSinceStart / 50).toFixed(2));
    currentScoreRef.current = newScore;
    setScore(newScore);

    // Spawn lasers
    spawnLaser();

    // Update lasers
    setLasers(prevLasers => {
      return prevLasers.map(laser => {
        const updatedLaser = { ...laser };
        
        if (!updatedLaser.isHarmful) {
          const age = now - laser.createdAt;
          if (age > laser.timeToHarmful) {
            updatedLaser.isHarmful = true;
            GameAudio.playCoinSound();
          }
        }
        
        return updatedLaser;
      }).filter(laser => {
        const age = now - laser.createdAt;
        return age < laser.timeToHarmful + 3000;
      });
    });

    // Check collisions
    const harmfulLasers = lasers.filter(l => l.isHarmful);
    let collision = false;
    
    for (const laser of harmfulLasers) {
      if (laser.type === 'horizontal') {
        if (Math.abs(laser.position - ship.y) < 8) {
          collision = true;
          break;
        }
      } else {
        if (Math.abs(laser.position - ship.x) < 8) {
          collision = true;
          break;
        }
      }
    }

    if (collision) {
      console.log('LaserDodge: Collision detected! Game Over!');
      endGame();
      return;
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, ship, lasers, spawnLaser]);

  // End game
  const endGame = useCallback(() => {
    setGameState('ended');
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    GameAudio.playGameEnd();
    
    const gameResult = {
      score: currentScoreRef.current,
      accuracy: 100,
      avgReactionTime: 0
    };
    
    console.log('LaserDodgeGame calling onGameEnd with:', gameResult);
    onGameEnd(gameResult);
  }, [onGameEnd]);

  // Handle mouse movement
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    setShip({ x: boundedX, y: boundedY });
  }, [gameState]);

  // Handle touch movement
  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
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
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('LaserDodge: Starting game...');
    
    // Reset everything
    setScore(0);
    currentScoreRef.current = 0;
    setLasers([]);
    setShip({ x: 50, y: 50 });
    setTimeLeft(60);
    gameStartTimeRef.current = Date.now();
    lastLaserSpawnRef.current = Date.now();
    
    setGameState('playing');
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start game loop
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-orange-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl">
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">🔥</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
              Laser Dodge EXTREME
            </h2>
            <p className="text-orange-200 text-sm mb-6 font-medium">Ultimate Survival Challenge</p>
            
            <div className="text-left text-sm text-white/90 mb-8 space-y-3 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <p className="text-white font-semibold">EXTREME MODE:</p>
              </div>
              
              <div className="space-y-3 pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-semibold">Control:</span> Move mouse/finger to pilot ship</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-blue-300 font-semibold">Blue Lasers:</span> Full-screen beams (safe)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-red-300 font-semibold">Red Lasers:</span> DEADLY when they turn red!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-yellow-300 font-semibold">Horizontal:</span> Avoid being on same row</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-purple-300 font-semibold">Vertical:</span> Avoid being on same column</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-orange-300 font-semibold">Speed:</span> Gets MUCH faster over time!</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl p-4 mt-6">
                <p className="text-xs text-red-200">
                  <span className="text-yellow-300 font-bold">🔥 WARNING:</span> This is the most intense version! 
                  Full-screen lasers will cover the entire map. Find safe spots quickly!
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
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse`}
              >
                🔥 START EXTREME
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <GameCountdown
        onCountdownComplete={handleCountdownComplete}
        gameName="Laser Dodge EXTREME"
        instructions="Avoid full-screen horizontal and vertical lasers! Blue = safe, Red = DEADLY!"
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold text-gray-900">
            🔥 Laser Dodge EXTREME
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">Time: {timeLeft}s</div>
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
              🔥 Avoid the full-screen laser beams! 🚀
            </div>
            
            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl h-96 border-4 border-gray-300 overflow-hidden cursor-none"
              style={{ touchAction: 'none' }}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              {/* Stars background */}
              <div className="absolute inset-0">
                {Array.from({ length: 100 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                    style={{
                      left: `${(i * 137) % 100}%`,
                      top: `${(i * 211) % 100}%`,
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>

              {/* Horizontal Lasers */}
              {lasers.filter(l => l.type === 'horizontal').map((laser) => (
                <div
                  key={laser.id}
                  className={`absolute w-full h-4 transition-all duration-300 ${
                    laser.isHarmful 
                      ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                      : 'bg-blue-400 shadow-lg shadow-blue-400/30'
                  }`}
                  style={{
                    left: '0%',
                    top: `${laser.position}%`,
                    transform: 'translateY(-50%)'
                  }}
                />
              ))}

              {/* Vertical Lasers */}
              {lasers.filter(l => l.type === 'vertical').map((laser) => (
                <div
                  key={laser.id}
                  className={`absolute h-full w-4 transition-all duration-300 ${
                    laser.isHarmful 
                      ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                      : 'bg-blue-400 shadow-lg shadow-blue-400/30'
                  }`}
                  style={{
                    left: `${laser.position}%`,
                    top: '0%',
                    transform: 'translateX(-50%)'
                  }}
                />
              ))}
              
              {/* Ship */}
              <div
                className="absolute w-8 h-8 bg-green-400 rounded-full shadow-lg shadow-green-400/50 animate-pulse flex items-center justify-center text-white text-sm font-bold"
                style={{
                  left: `${ship.x}%`,
                  top: `${ship.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              >
                🚀
              </div>
            </div>

            <div className="text-sm text-gray-600 text-center">
              <strong>Desktop:</strong> Move mouse to control ship • <strong>Mobile:</strong> Touch and drag
            </div>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-600 space-y-2">
          <div>🔥 <strong>EXTREME MODE:</strong> Full-screen horizontal and vertical laser beams!</div>
          <div>🔵 Blue lasers are safe but turn red when deadly</div>
          <div>🚀 Find safe spots between the laser grids to survive</div>
        </div>
      </div>
    </div>
  );
}