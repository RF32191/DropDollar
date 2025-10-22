'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playSuccessChime, playErrorBuzz, playCoinsFalling, playButtonHover } from '@/lib/gameAudio';

interface CashSprite {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  stackedCash: CashSprite[]; // Cash stacked on this cash sprite
  isFalling: boolean;
  isCut: boolean;
  cutAmount: number; // How much was cut off (0-1)
}

interface GameState {
  score: number;
  level: number;
  cashSprites: CashSprite[];
  gameOver: boolean;
  gameStarted: boolean;
  perfectStacks: number;
  totalStacks: number;
  gameStartTime: number;
  difficultyLevel: number;
  currentCash: CashSprite | null;
  dropTimer: number;
  maxDropTimer: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CASH_WIDTH = 100;
const CASH_HEIGHT = 20;
const GROUND_Y = CANVAS_HEIGHT - 50;
const DROP_ZONE_HEIGHT = 50;

export default function CashStackGame({ 
  onGameEnd, 
  isCompetitionMode = false 
}: { 
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  isCompetitionMode?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [gameData, setGameData] = useState<GameState>({
    score: 0,
    level: 1,
    cashSprites: [],
    gameOver: false,
    gameStarted: false,
    perfectStacks: 0,
    totalStacks: 0,
    gameStartTime: 0,
    difficultyLevel: 1,
    currentCash: null,
    dropTimer: 0,
    maxDropTimer: 100
  });
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);

  console.log('🎮 CashStackGame: Component mounted, gameState:', gameState);

  // Generate new cash sprite
  const generateCashSprite = useCallback((): CashSprite => {
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - CASH_WIDTH),
      y: GROUND_Y - CASH_HEIGHT,
      width: CASH_WIDTH,
      height: CASH_HEIGHT,
      speed: 1 + Math.random() * 2, // Random speed 1-3
      stackedCash: [],
      isFalling: false,
      isCut: false,
      cutAmount: 0
    };
  }, []);

  // Generate falling cash
  const generateFallingCash = useCallback((): CashSprite => {
    return {
      id: Date.now() + Math.random(),
      x: CANVAS_WIDTH / 2 - CASH_WIDTH / 2, // Start in center
      y: 0,
      width: CASH_WIDTH,
      height: CASH_HEIGHT,
      speed: 0, // No horizontal movement when falling
      stackedCash: [],
      isFalling: true,
      isCut: false,
      cutAmount: 0
    };
  }, []);

  // Check alignment between falling cash and target cash
  const checkAlignment = (fallingCash: CashSprite, targetCash: CashSprite): number => {
    const fallingCenter = fallingCash.x + fallingCash.width / 2;
    const targetCenter = targetCash.x + targetCash.width / 2;
    const distance = Math.abs(fallingCenter - targetCenter);
    const maxDistance = targetCash.width / 2;
    
    // Return alignment percentage (0-1, where 1 is perfect)
    return Math.max(0, 1 - (distance / maxDistance));
  };

  // Handle cash drop
  const handleCashDrop = useCallback(() => {
    if (!gameData.currentCash) return;
    
    const fallingCash = gameData.currentCash;
    let bestAlignment = 0;
    let targetCash: CashSprite | null = null;
    
    // Find the best target cash sprite to stack on
    for (const cash of gameData.cashSprites) {
      if (cash.y >= GROUND_Y - CASH_HEIGHT - 20) { // Only consider cash near ground
        const alignment = checkAlignment(fallingCash, cash);
        if (alignment > bestAlignment) {
          bestAlignment = alignment;
          targetCash = cash;
        }
      }
    }
    
    if (targetCash && bestAlignment > 0.3) { // Minimum 30% alignment to stack
      // Stack the cash
      const points = Math.floor(bestAlignment * 50); // Up to 50 points for perfect alignment
      
      if (bestAlignment > 0.8) { // Perfect stack
        playSuccessChime();
        setGameData(prev => ({
          ...prev,
          score: prev.score + points + 25, // Bonus for perfect
          perfectStacks: prev.perfectStacks + 1,
          totalStacks: prev.totalStacks + 1,
          cashSprites: prev.cashSprites.map(c => 
            c.id === targetCash!.id 
              ? { ...c, stackedCash: [...c.stackedCash, fallingCash] }
              : c
          )
        }));
      } else {
        playCoinsFalling();
        setGameData(prev => ({
          ...prev,
          score: prev.score + points,
          totalStacks: prev.totalStacks + 1,
          cashSprites: prev.cashSprites.map(c => 
            c.id === targetCash!.id 
              ? { ...c, stackedCash: [...c.stackedCash, fallingCash] }
              : c
          )
        }));
      }
    } else {
      // Miss - cut the cash and make it smaller
      playErrorBuzz();
      const cutAmount = 0.2 + Math.random() * 0.3; // Cut 20-50%
      const newCash = {
        ...fallingCash,
        isCut: true,
        cutAmount: cutAmount,
        width: fallingCash.width * (1 - cutAmount),
        isFalling: false
      };
      
      setGameData(prev => ({
        ...prev,
        cashSprites: [...prev.cashSprites, newCash]
      }));
    }
    
    // Generate new falling cash
    setGameData(prev => ({
      ...prev,
      currentCash: generateFallingCash(),
      dropTimer: 0,
      maxDropTimer: Math.max(50, 100 - prev.difficultyLevel * 10) // Faster drops with difficulty
    }));
  }, [gameData.currentCash, gameData.cashSprites, generateFallingCash]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameState !== 'playing' || gameData.gameOver) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      return;
    }
    
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    setGameData(prev => {
      const newState = { ...prev };
      
      // Calculate difficulty progression based on time elapsed
      const timeElapsed = (currentTime - newState.gameStartTime) / 1000; // Convert to seconds
      const newDifficultyLevel = Math.max(1, Math.floor(timeElapsed / 20) + 1); // Increase every 20 seconds
      
      // Update difficulty level
      if (newDifficultyLevel !== newState.difficultyLevel) {
        newState.difficultyLevel = newDifficultyLevel;
        console.log(`🎮 [CashStack] Difficulty increased to level ${newDifficultyLevel}`);
      }
      
      // Update falling cash position
      if (newState.currentCash) {
        newState.currentCash.y += 3; // Fall speed
        
        // Auto-drop if it reaches the ground
        if (newState.currentCash.y >= GROUND_Y - CASH_HEIGHT) {
          handleCashDrop();
        }
      }
      
      // Update cash sprites (move horizontally)
      newState.cashSprites = newState.cashSprites.map(cash => {
        const newCash = { ...cash };
        
        if (!newCash.isFalling) {
          // Move horizontally
          newCash.x += newCash.speed;
          
          // Bounce off walls
          if (newCash.x <= 0 || newCash.x + newCash.width >= CANVAS_WIDTH) {
            newCash.speed = -newCash.speed;
            newCash.x = Math.max(0, Math.min(CANVAS_WIDTH - newCash.width, newCash.x));
          }
        }
        
        return newCash;
      });
      
      // Update drop timer
      newState.dropTimer++;
      
      // Level up based on score
      const newLevel = Math.floor(newState.score / 100) + 1;
      if (newLevel > newState.level) {
        newState.level = newLevel;
        playSuccessChime();
      }
      
      return newState;
    });
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameData.gameOver, handleCashDrop]);

  // Start game
  const handleStartGame = () => {
    setShowCountdown(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          setGameState('playing');
          setGameData(prev => ({
            ...prev,
            gameStarted: true,
            gameStartTime: Date.now(),
            difficultyLevel: 1,
            cashSprites: [generateCashSprite()],
            currentCash: generateFallingCash(),
            dropTimer: 0,
            maxDropTimer: 100
          }));
          lastTimeRef.current = performance.now();
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End game
  const endGame = () => {
    setGameState('ended');
    setGameData(prev => ({ ...prev, gameOver: true }));
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    const accuracy = gameData.totalStacks > 0 
      ? (gameData.perfectStacks / gameData.totalStacks) * 100 
      : 100;
    
    onGameEnd({ score: gameData.score, accuracy });
  };

  // Handle click/tap to drop cash
  const handleClick = useCallback(() => {
    if (gameState === 'playing' && gameData.currentCash) {
      handleCashDrop();
    }
  }, [gameState, gameData.currentCash, handleCashDrop]);

  // Render game
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // Draw drop zone indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, GROUND_Y - DROP_ZONE_HEIGHT, CANVAS_WIDTH, DROP_ZONE_HEIGHT);
    
    // Draw cash sprites
    gameData.cashSprites.forEach(cash => {
      ctx.save();
      
      // Draw main cash sprite
      const cashGradient = ctx.createLinearGradient(cash.x, cash.y, cash.x + cash.width, cash.y + cash.height);
      cashGradient.addColorStop(0, '#FFD700');
      cashGradient.addColorStop(0.5, '#FFA500');
      cashGradient.addColorStop(1, '#FF8C00');
      
      ctx.fillStyle = cashGradient;
      ctx.fillRect(cash.x, cash.y, cash.width, cash.height);
      
      // Add cash texture
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(cash.x + 2, cash.y + 2, cash.width - 4, cash.height - 4);
      
      // Add dollar sign
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', cash.x + cash.width / 2, cash.y + cash.height / 2);
      
      // Draw stacked cash
      cash.stackedCash.forEach((stackedCash, index) => {
        const stackY = cash.y - (index + 1) * CASH_HEIGHT;
        
        const stackGradient = ctx.createLinearGradient(stackedCash.x, stackY, stackedCash.x + stackedCash.width, stackY + stackedCash.height);
        stackGradient.addColorStop(0, '#FFD700');
        stackGradient.addColorStop(0.5, '#FFA500');
        stackGradient.addColorStop(1, '#FF8C00');
        
        ctx.fillStyle = stackGradient;
        ctx.fillRect(stackedCash.x, stackY, stackedCash.width, stackedCash.height);
        
        // Add cash texture
        ctx.fillStyle = '#B8860B';
        ctx.fillRect(stackedCash.x + 2, stackY + 2, stackedCash.width - 4, stackedCash.height - 4);
        
        // Add dollar sign
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', stackedCash.x + stackedCash.width / 2, stackY + stackedCash.height / 2);
        
        // Add stack number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${index + 1}`, stackedCash.x + stackedCash.width / 2, stackY + stackedCash.height / 2 - 8);
      });
      
      ctx.restore();
    });
    
    // Draw falling cash
    if (gameData.currentCash) {
      ctx.save();
      
      const fallingGradient = ctx.createLinearGradient(gameData.currentCash.x, gameData.currentCash.y, gameData.currentCash.x + gameData.currentCash.width, gameData.currentCash.y + gameData.currentCash.height);
      fallingGradient.addColorStop(0, '#FFD700');
      fallingGradient.addColorStop(0.5, '#FFA500');
      fallingGradient.addColorStop(1, '#FF8C00');
      
      ctx.fillStyle = fallingGradient;
      ctx.fillRect(gameData.currentCash.x, gameData.currentCash.y, gameData.currentCash.width, gameData.currentCash.height);
      
      // Add cash texture
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(gameData.currentCash.x + 2, gameData.currentCash.y + 2, gameData.currentCash.width - 4, gameData.currentCash.height - 4);
      
      // Add dollar sign
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', gameData.currentCash.x + gameData.currentCash.width / 2, gameData.currentCash.y + gameData.currentCash.height / 2);
      
      // Add drop indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('DROP!', gameData.currentCash.x + gameData.currentCash.width / 2, gameData.currentCash.y - 10);
      
      ctx.restore();
    }
    
    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameData.score}`, 20, 40);
    ctx.fillText(`Level: ${gameData.level}`, 20, 70);
    ctx.fillText(`Perfect Stacks: ${gameData.perfectStacks}`, 20, 100);
    ctx.fillText(`Total Stacks: ${gameData.totalStacks}`, 20, 130);
    ctx.fillText(`Difficulty: Level ${gameData.difficultyLevel}`, 20, 160);
    
    // Draw drop timer
    if (gameData.currentCash) {
      const timerWidth = 200;
      const timerHeight = 20;
      const timerX = CANVAS_WIDTH - timerWidth - 20;
      const timerY = 20;
      
      // Timer background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(timerX, timerY, timerWidth, timerHeight);
      
      // Timer fill
      const fillWidth = (gameData.dropTimer / gameData.maxDropTimer) * timerWidth;
      ctx.fillStyle = gameData.dropTimer > gameData.maxDropTimer * 0.8 ? '#ff4444' : '#4CAF50';
      ctx.fillRect(timerX, timerY, fillWidth, timerHeight);
      
      // Timer text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('DROP TIMER', timerX + timerWidth / 2, timerY + timerHeight / 2 + 5);
    }
  };

  // Start render loop
  useEffect(() => {
    if (gameState === 'playing') {
      const renderLoop = () => {
        render();
        if (gameState === 'playing') {
          requestAnimationFrame(renderLoop);
        }
      };
      renderLoop();
    }
  }, [gameState, gameData]);

  // Lock screen during gameplay
  useEffect(() => {
    if (gameState === 'playing') {
      // Lock screen scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      // Unlock screen
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [gameState]);

  // End game after 60 seconds
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setTimeout(() => {
        endGame();
      }, 60000); // 60 seconds
      
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  if (gameState === 'ended') {
    return null;
  }

  if (showCountdown) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-8xl font-bold text-yellow-400 mb-8">
            {countdown}
          </div>
          <p className="text-xl text-gray-300">Game starting in {countdown} seconds...</p>
        </div>
      </div>
    );
  }

  if (gameState === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Epilepsy Warning */}
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
          
          {/* Instructions */}
          <div className="text-left text-sm sm:text-base text-white mb-6 sm:mb-8 space-y-4 bg-gradient-to-r from-green-800 to-green-900 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border-2 border-green-600 shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-green-300 mb-4 flex items-center">
              <span className="mr-2">💰</span>
              Cash Stack Challenge Instructions
            </h3>
            <div className="space-y-3 text-green-100">
              <p><span className="font-bold text-green-300">🎯 Objective:</span> Stack cash pieces by timing your drops perfectly!</p>
              <p><span className="font-bold text-green-300">🎮 How to Play:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Cash pieces move horizontally on the ground</li>
                <li>New cash falls from the top - click/tap to drop it</li>
                <li>Perfect alignment gives maximum points and stacks the cash</li>
                <li>Poor alignment cuts the cash and makes it smaller</li>
                <li>Build the highest cash towers possible!</li>
              </ul>
              <p><span className="font-bold text-green-300">🏆 Scoring:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Perfect alignment (80%+): 50+ points + stack bonus</li>
                <li>Good alignment (30-80%): 15-50 points + stack</li>
                <li>Poor alignment (&lt;30%): Cash gets cut and shrinks</li>
                <li>Level up every 100 points</li>
              </ul>
            </div>
          </div>
          
          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={handleStartGame}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              🚀 Start Cash Stack Challenge
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}