'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GameCountdown from './GameCountdown';
import { GameAudio } from '@/utils/gameAudio';

interface LaserDodgeGameProps {
  onGameEnd: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isPractice?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Laser {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  isHarmful: boolean;
  timeToHarmful: number;
  angle: number;
}

const LaserDodgeGame: React.FC<LaserDodgeGameProps> = ({ 
  onGameEnd, 
  onExit,
  listingId, 
  entryNumber,
  isPractice = false 
}) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const shipRef = useRef<Position>({ x: 400, y: 500 });
  const lasersRef = useRef<Laser[]>([]);
  const gameStateRef = useRef({
    isPlaying: false,
    score: 0,
    level: 1,
    lastLaserSpawn: 0,
    gameStartTime: 0,
    isGameOver: false
  });

  const [gameState, setGameState] = useState({
    isPlaying: false,
    score: 0,
    level: 1,
    showCountdown: false,
    showReady: true,
    gameOver: false,
    finalScore: 0
  });

  const [mousePos, setMousePos] = useState<Position>({ x: 400, y: 500 });
  const [isTouching, setIsTouching] = useState(false);

  // Game constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const SHIP_SIZE = 30;
  const LASER_SPAWN_RATE = 1000; // Start with 1 laser per second
  const LEVEL_INCREASE_INTERVAL = 10000; // Increase difficulty every 10 seconds

  // Initialize game
  const initGame = useCallback(() => {
    shipRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 100 };
    lasersRef.current = [];
    gameStateRef.current = {
      isPlaying: true,
      score: 0,
      level: 1,
      lastLaserSpawn: 0,
      gameStartTime: Date.now(),
      isGameOver: false
    };
    setGameState(prev => ({ 
      ...prev, 
      isPlaying: true, 
      score: 0, 
      level: 1, 
      gameOver: false 
    }));
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStateRef.current.isPlaying) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Keep ship within bounds
    const boundedX = Math.max(SHIP_SIZE/2, Math.min(CANVAS_WIDTH - SHIP_SIZE/2, x));
    const boundedY = Math.max(SHIP_SIZE/2, Math.min(CANVAS_HEIGHT - SHIP_SIZE/2, y));
    
    shipRef.current = { x: boundedX, y: boundedY };
    setMousePos({ x: boundedX, y: boundedY });
  }, []);

  // Handle touch movement (iPhone support)
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!gameStateRef.current.isPlaying) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Keep ship within bounds
    const boundedX = Math.max(SHIP_SIZE/2, Math.min(CANVAS_WIDTH - SHIP_SIZE/2, x));
    const boundedY = Math.max(SHIP_SIZE/2, Math.min(CANVAS_HEIGHT - SHIP_SIZE/2, y));
    
    shipRef.current = { x: boundedX, y: boundedY };
    setMousePos({ x: boundedX, y: boundedY });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsTouching(true);
    handleTouchMove(e);
  }, [handleTouchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsTouching(false);
  }, []);

  // Spawn laser
  const spawnLaser = useCallback(() => {
    const now = Date.now();
    const timeSinceStart = now - gameStateRef.current.gameStartTime;
    const currentLevel = Math.floor(timeSinceStart / LEVEL_INCREASE_INTERVAL) + 1;
    
    // Increase spawn rate with level
    const spawnRate = Math.max(300, LASER_SPAWN_RATE - (currentLevel * 100));
    
    if (now - gameStateRef.current.lastLaserSpawn > spawnRate) {
      const laser: Laser = {
        id: now,
        x: Math.random() * (CANVAS_WIDTH - 20),
        y: -50,
        width: 8 + Math.random() * 12, // Random width between 8-20
        height: 40 + Math.random() * 30, // Random height between 40-70
        speed: 2 + (currentLevel * 0.5) + Math.random() * 2,
        isHarmful: false,
        timeToHarmful: 1500 + Math.random() * 1000, // 1.5-2.5 seconds
        angle: Math.random() * Math.PI * 2 // Random rotation
      };
      
      lasersRef.current.push(laser);
      gameStateRef.current.lastLaserSpawn = now;
    }
  }, []);

  // Update lasers
  const updateLasers = useCallback((deltaTime: number) => {
    const now = Date.now();
    
    lasersRef.current = lasersRef.current.filter(laser => {
      // Move laser down
      laser.y += laser.speed;
      
      // Check if laser should become harmful
      if (!laser.isHarmful) {
        const age = now - laser.id;
        if (age > laser.timeToHarmful) {
          laser.isHarmful = true;
          // Play warning sound when laser becomes dangerous
          GameAudio.playCoinSound(); // Use coin sound as warning
        }
      }
      
      // Remove lasers that are off screen
      return laser.y < CANVAS_HEIGHT + 100;
    });
  }, []);

  // Check collision
  const checkCollision = useCallback(() => {
    const ship = shipRef.current;
    
    for (const laser of lasersRef.current) {
      if (!laser.isHarmful) continue;
      
      // Simple rectangular collision detection
      const shipLeft = ship.x - SHIP_SIZE / 2;
      const shipRight = ship.x + SHIP_SIZE / 2;
      const shipTop = ship.y - SHIP_SIZE / 2;
      const shipBottom = ship.y + SHIP_SIZE / 2;
      
      const laserLeft = laser.x;
      const laserRight = laser.x + laser.width;
      const laserTop = laser.y;
      const laserBottom = laser.y + laser.height;
      
      if (shipLeft < laserRight && 
          shipRight > laserLeft && 
          shipTop < laserBottom && 
          shipBottom > laserTop) {
        // Collision detected!
        gameStateRef.current.isGameOver = true;
        return true;
      }
    }
    
    return false;
  }, []);

  // Update score
  const updateScore = useCallback((deltaTime: number) => {
    if (!gameStateRef.current.isPlaying) return;
    
    // Score increases over time (survival)
    const timeAlive = Date.now() - gameStateRef.current.gameStartTime;
    const baseScore = timeAlive / 100; // 1 point per 100ms survived
    
    // Bonus for dodging harmful lasers
    const harmfulLasers = lasersRef.current.filter(l => l.isHarmful).length;
    const difficultyBonus = harmfulLasers * 0.1;
    
    const newScore = Number((baseScore + difficultyBonus).toFixed(2));
    gameStateRef.current.score = newScore;
    
    const currentLevel = Math.floor(timeAlive / LEVEL_INCREASE_INTERVAL) + 1;
    gameStateRef.current.level = currentLevel;
    
    setGameState(prev => ({ 
      ...prev, 
      score: newScore, 
      level: currentLevel 
    }));
  }, []);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (!gameStateRef.current.isPlaying || gameStateRef.current.isGameOver) {
      return;
    }

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Update game logic
    spawnLaser();
    updateLasers(deltaTime);
    updateScore(deltaTime);

    // Check for collisions
    if (checkCollision()) {
      // Game over
      gameStateRef.current.isPlaying = false;
      const finalScore = gameStateRef.current.score;
      
      setGameState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        gameOver: true, 
        finalScore 
      }));
      
      // Play game over sound
      GameAudio.playCoinSound();
      
      // Pass result object with required format
      const gameResult = {
        score: finalScore,
        accuracy: 100, // Survival game - if you're alive, you're 100% accurate
        avgReactionTime: 0 // Not applicable for this game type
      };
      
      onGameEnd(gameResult);
      return;
    }

    // Render
    render();

    // Continue loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [spawnLaser, updateLasers, updateScore, checkCollision, onGameEnd]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw stars background
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % CANVAS_WIDTH;
      const y = (i * 211) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 1, 1);
    }

    // Draw lasers
    lasersRef.current.forEach(laser => {
      ctx.save();
      ctx.translate(laser.x + laser.width/2, laser.y + laser.height/2);
      ctx.rotate(laser.angle);
      
      if (laser.isHarmful) {
        // Dangerous laser - dark red
        ctx.fillStyle = '#cc0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
      } else {
        // Safe laser - light blue
        ctx.fillStyle = '#88ccff';
        ctx.shadowColor = '#aaddff';
        ctx.shadowBlur = 5;
      }
      
      ctx.fillRect(-laser.width/2, -laser.height/2, laser.width, laser.height);
      ctx.restore();
    });

    // Draw ship
    const ship = shipRef.current;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    
    // Ship body (triangle)
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_SIZE/2);
    ctx.lineTo(-SHIP_SIZE/3, SHIP_SIZE/2);
    ctx.lineTo(SHIP_SIZE/3, SHIP_SIZE/2);
    ctx.closePath();
    ctx.fill();
    
    // Ship details
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -5, 4, 10);
    
    ctx.restore();

    // Draw UI
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${gameStateRef.current.score.toFixed(2)}`, 20, 30);
    ctx.fillText(`Level: ${gameStateRef.current.level}`, 20, 60);
    
    // Draw instructions
    ctx.font = '14px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Move mouse/finger to control ship', 20, CANVAS_HEIGHT - 40);
    ctx.fillText('Avoid red lasers! Blue lasers are harmless', 20, CANVAS_HEIGHT - 20);
  }, []);

  // Start countdown from ready state
  const handleStartGame = useCallback(() => {
    setGameState(prev => ({ 
      ...prev, 
      showReady: false, 
      showCountdown: true 
    }));
  }, []);

  // Start game from countdown
  const startGame = useCallback(() => {
    setGameState(prev => ({ ...prev, showCountdown: false }));
    initGame();
    lastTimeRef.current = performance.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [initGame, gameLoop]);

  // Restart game
  const restartGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    setGameState(prev => ({ 
      ...prev, 
      showReady: true,
      showCountdown: false, 
      gameOver: false, 
      finalScore: 0 
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Render component
  if (gameState.showReady) {
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
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse"
              >
                🚀 Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.showCountdown) {
    return (
      <GameCountdown
        onCountdownComplete={startGame}
        gameName="Laser Dodge"
        instructions="Move your mouse or finger to control the ship. Avoid red lasers!"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Laser Dodge</h2>
          <div className="flex justify-center gap-6 text-sm text-gray-300">
            <span>Score: {gameState.score.toFixed(2)}</span>
            <span>Level: {gameState.level}</span>
            <span className="text-yellow-400">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competition Mode'}
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-600 rounded cursor-none"
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        />

        {gameState.gameOver && (
          <div className="mt-4 text-center">
            <div className="bg-red-900 bg-opacity-50 rounded-lg p-4 mb-4">
              <h3 className="text-xl font-bold text-white mb-2">Game Over!</h3>
              <p className="text-lg text-yellow-400">
                Final Score: {gameState.finalScore.toFixed(2)}
              </p>
              <p className="text-sm text-gray-300">
                Survived {gameState.level} levels
              </p>
            </div>
            
            <button
              onClick={restartGame}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400 text-center max-w-lg">
          <p className="mb-1">🎯 <strong>How to Play:</strong></p>
          <p className="mb-1">• Move mouse/finger to control your ship</p>
          <p className="mb-1">• <span className="text-blue-400">Blue lasers</span> are harmless - they turn <span className="text-red-400">red</span> when dangerous</p>
          <p>• Survive as long as possible for higher scores!</p>
        </div>
      </div>
    </div>
  );
};

export default LaserDodgeGame;
