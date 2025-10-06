'use client';

import React, { useState, useEffect, useRef } from 'react';

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
}

interface Attack {
  id: number;
  x: number;
  y: number;
  destroyed: boolean;
}

export default function SwordParryGame({ onGameEnd, onExit, isCompetitionMode }: SwordParryGameProps) {
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
      const gameTime = Math.floor((60 - timeLeft) / 10) + 1; // Level 1-6 based on 10-second intervals
      
      // Progressive difficulty: more attacks every 10 seconds
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

  // Mouse handling
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
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

  const handleMouseDown = () => {
    setIsClicking(true);
    
    // Check for hits
    setAttacks(prev => prev.map(attack => {
      if (attack.destroyed) return attack;
      
      const distance = Math.sqrt(
        Math.pow(attack.x - mousePos.x, 2) + Math.pow(attack.y - mousePos.y, 2)
      );
      
      if (distance < 15) { // Hit!
        setScore(s => s + 100);
        setDestroyedCount(d => d + 1);
        return { ...attack, destroyed: true };
      }
      
      return attack;
    }));
  };

  const handleMouseUp = () => {
    setIsClicking(false);
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setAttacks([]);
    setDestroyedCount(0);
    setTotalCount(0);
    setTimeLeft(60);
    lastSpawn.current = Date.now();
  };

  const endGame = () => {
    gameRunning.current = false;
    setGameState('ended');
    
    const accuracy = totalCount > 0 ? (destroyedCount / totalCount) * 100 : 0;
    
    onGameEnd({
      score,
      accuracy,
      avgReactionTime: 250
    });
  };

  const handleStartGame = () => {
    setCountdown(3);
    setGameState('countdown');
  };

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-red-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
            <span className="text-3xl">⚔️</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
            Sword Slash
          </h2>
          <p className="text-red-200 text-sm mb-6 font-medium">Click to Destroy Attacks</p>
          
          <div className="text-left text-sm text-white/90 mb-8 space-y-3 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⚔️</span>
              </div>
              <p className="text-white font-semibold">How to Play:</p>
            </div>
            
            <div className="space-y-3 pl-11">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-red-300 font-semibold">Move:</span> Move mouse to control sword position</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-orange-300 font-semibold">Click:</span> Click to slash and destroy red attacks</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-yellow-300 font-semibold">Survive:</span> Don't let attacks expire without destroying them</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-blue-300 font-semibold">Difficulty:</span> More attacks spawn every 10 seconds (1→5 per wave)</p>
              </div>
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
              ⚔️ Start Slashing
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Sword Slash</h2>
          <p className="text-lg text-gray-600 mb-8">Click to destroy the red attacks!</p>
          <div className="text-8xl font-bold text-red-500 animate-pulse">
            {countdown}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold text-gray-900">
            ⚔️ Sword Slash
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">Time: {timeLeft}s</div>
            <div className="text-sm text-gray-600">Score: {score}</div>
            <div className="text-sm text-gray-600">
              Hits: {destroyedCount}/{totalCount}
            </div>
            <div className="text-sm text-gray-600">
              Level: {Math.floor((60 - timeLeft) / 10) + 1}/6
              {timeLeft <= 10 && (
                <span className="text-red-500 font-bold animate-pulse ml-1">FINAL!</span>
              )}
            </div>
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

        {/* Game Area */}
        <div className="mb-4">
          <div className="text-xl font-bold text-gray-900 text-center">
            🗡️ Slash the red attacks! Level {Math.floor((60 - timeLeft) / 10) + 1} - {Math.min(Math.floor((60 - timeLeft) / 10) + 1, 5)} attacks per wave!
            {timeLeft <= 10 && (
              <div className="text-lg text-red-600 font-bold animate-pulse mt-2">
                🔥 FINAL LEVEL - MAXIMUM CHAOS! 🔥
              </div>
            )}
          </div>
        </div>

        <div 
          ref={gameAreaRef}
          className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-xl h-96 border-4 border-gray-300 overflow-hidden cursor-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {/* Attacks */}
          {attacks.map((attack) => (
            <div
              key={attack.id}
              className={`absolute w-8 h-8 rounded-full transition-all duration-200 ${
                attack.destroyed 
                  ? 'bg-green-500 animate-ping' 
                  : 'bg-red-500 border-2 border-red-300 animate-pulse'
              }`}
              style={{
                left: `${attack.x}%`,
                top: `${attack.y}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: attack.destroyed ? 'none' : '0 0 20px rgba(239, 68, 68, 0.8)',
                zIndex: 10
              }}
            >
              {!attack.destroyed && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                  ⚔️
                </div>
              )}
            </div>
          ))}
          
          {/* Sword cursor */}
          <div
            className={`absolute w-2 h-8 transition-all duration-100 ${
              isClicking ? 'bg-yellow-400' : 'bg-gray-300'
            }`}
            style={{
              left: `${mousePos.x}%`,
              top: `${mousePos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 15
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

        <div className="mt-4 text-sm text-gray-600 text-center">
          Move mouse to position sword • Click to slash red attacks • Don't let them expire! • More attacks every 10 seconds!
        </div>
      </div>
    </div>
  );
}
