'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playSuccessChime, playErrorBuzz, playCoinsFalling, playButtonHover } from '@/lib/gameAudio';

interface CashSprite {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  speed: number;
  stackedCoins: number; // Number of coins stacked
  isExploding: boolean;
  explosionTime: number;
}

interface Coin {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  speed: number;
  isStacked: boolean;
  targetCashId?: number;
}

interface GameState {
  score: number;
  level: number;
  cashSprites: CashSprite[];
  coins: Coin[];
  gameOver: boolean;
  gameStarted: boolean;
  perfectStacks: number;
  totalStacks: number;
  gameStartTime: number;
  difficultyLevel: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CASH_SIZE = 80;
const COIN_SIZE = 30;
const STACK_ZONE_WIDTH = 100;
const STACK_ZONE_HEIGHT = 20;

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
    coins: [],
    gameOver: false,
    gameStarted: false,
    perfectStacks: 0,
    totalStacks: 0,
    gameStartTime: 0,
    difficultyLevel: 1
  });
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);

  console.log('🎮 CashStackGame: Component mounted, gameState:', gameState);

  // Generate random cash sprite
  const generateCashSprite = useCallback((difficultyLevel: number = 1): CashSprite => {
    const baseSpeed = 1 + Math.random() * 2; // Random base speed 1-3
    const speedVariation = difficultyLevel * 0.5; // Speed increases with difficulty
    
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - CASH_SIZE),
      y: -CASH_SIZE,
      rotation: Math.random() * Math.PI * 2,
      scale: 0.8 + Math.random() * 0.4, // Random scale 0.8-1.2
      speed: baseSpeed + speedVariation,
      stackedCoins: 0,
      isExploding: false,
      explosionTime: 0
    };
  }, []);

  // Generate coin
  const generateCoin = useCallback((): Coin => {
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - COIN_SIZE),
      y: -COIN_SIZE,
      rotation: Math.random() * Math.PI * 2,
      scale: 0.9 + Math.random() * 0.2,
      speed: 2 + Math.random() * 3, // Faster than cash
      isStacked: false
    };
  }, []);

  // Check if coin is in stack zone
  const isInStackZone = (coin: Coin, cash: CashSprite): boolean => {
    const stackZoneX = cash.x + (CASH_SIZE * cash.scale) / 2 - STACK_ZONE_WIDTH / 2;
    const stackZoneY = cash.y + (CASH_SIZE * cash.scale) - STACK_ZONE_HEIGHT;
    
    return coin.x + COIN_SIZE > stackZoneX &&
           coin.x < stackZoneX + STACK_ZONE_WIDTH &&
           coin.y + COIN_SIZE > stackZoneY &&
           coin.y < stackZoneY + STACK_ZONE_HEIGHT;
  };

  // Check if coin is perfectly stacked
  const isPerfectStack = (coin: Coin, cash: CashSprite): boolean => {
    const centerX = cash.x + (CASH_SIZE * cash.scale) / 2;
    const centerY = cash.y + (CASH_SIZE * cash.scale);
    const coinCenterX = coin.x + COIN_SIZE / 2;
    const coinCenterY = coin.y + COIN_SIZE / 2;
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(coinCenterX - centerX, 2) + Math.pow(coinCenterY - centerY, 2)
    );
    
    return distanceFromCenter < 15; // Perfect stack within 15 pixels of center
  };

  // Handle coin stacking
  const handleCoinStack = useCallback((coin: Coin, cash: CashSprite) => {
    const isPerfect = isPerfectStack(coin, cash);
    
    let points = 10; // Base points
    
    if (isPerfect) {
      points += 20; // Bonus for perfect stack
      playSuccessChime();
      
      // Explode cash sprite
      setGameData(prev => ({
        ...prev,
        cashSprites: prev.cashSprites.map(c => 
          c.id === cash.id 
            ? { ...c, isExploding: true, explosionTime: Date.now(), stackedCoins: c.stackedCoins + 1 }
            : c
        ),
        perfectStacks: prev.perfectStacks + 1
      }));
    } else {
      playCoinsFalling();
      
      // Add coin to stack
      setGameData(prev => ({
        ...prev,
        cashSprites: prev.cashSprites.map(c => 
          c.id === cash.id 
            ? { ...c, stackedCoins: c.stackedCoins + 1 }
            : c
        )
      }));
    }
    
    setGameData(prev => ({
      ...prev,
      score: prev.score + points,
      totalStacks: prev.totalStacks + 1
    }));
  }, []);

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
      
      // Update cash sprites
      newState.cashSprites = newState.cashSprites.map(cash => {
        let newCash = { ...cash };
        
        // Random speed variation
        if (Math.random() < 0.01) { // 1% chance per frame
          newCash.speed = Math.max(0.5, newCash.speed + (Math.random() - 0.5) * 2);
        }
        
        // Random slowdown
        if (Math.random() < 0.005) { // 0.5% chance per frame
          newCash.speed = Math.max(0.5, newCash.speed * 0.7);
        }
        
        // Move cash sprite
        newCash.y += newCash.speed;
        newCash.rotation += 0.02;
        
        // Reset if off screen
        if (newCash.y > CANVAS_HEIGHT) {
          newCash = generateCashSprite(newState.difficultyLevel);
        }
        
        // Update explosion
        if (newCash.isExploding) {
          const explosionDuration = currentTime - newCash.explosionTime;
          if (explosionDuration > 1000) { // 1 second explosion
            newCash.isExploding = false;
            newCash.explosionTime = 0;
            newCash.stackedCoins = 0; // Reset stack after explosion
          }
        }
        
        return newCash;
      });
      
      // Update coins
      newState.coins = newState.coins.map(coin => {
        const newCoin = { ...coin };
        newCoin.y += newCoin.speed;
        newCoin.rotation += 0.05;
        
        // Check for stacking
        if (!newCoin.isStacked) {
          for (const cash of newState.cashSprites) {
            if (isInStackZone(newCoin, cash)) {
              newCoin.isStacked = true;
              newCoin.targetCashId = cash.id;
              handleCoinStack(newCoin, cash);
              break;
            }
          }
        }
        
        // Remove coins that are off screen or stacked
        if (newCoin.y > CANVAS_HEIGHT || newCoin.isStacked) {
          return null;
        }
        
        return newCoin;
      }).filter(coin => coin !== null) as Coin[];
      
      // Spawn new cash sprites
      if (Math.random() < 0.02) { // 2% chance per frame
        newState.cashSprites.push(generateCashSprite(newState.difficultyLevel));
      }
      
      // Spawn new coins
      if (Math.random() < 0.03) { // 3% chance per frame
        newState.coins.push(generateCoin());
      }
      
      // Level up based on score
      const newLevel = Math.floor(newState.score / 100) + 1;
      if (newLevel > newState.level) {
        newState.level = newLevel;
        playSuccessChime();
      }
      
      return newState;
    });
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameData.gameOver, generateCashSprite, generateCoin, handleCoinStack]);

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
            cashSprites: [generateCashSprite(1)],
            coins: []
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
    
    // Draw cash sprites
    gameData.cashSprites.forEach(cash => {
      ctx.save();
      ctx.translate(cash.x + CASH_SIZE/2, cash.y + CASH_SIZE/2);
      ctx.rotate(cash.rotation);
      ctx.scale(cash.scale, cash.scale);
      
      // Draw 3D cash effect
      if (cash.isExploding) {
        // Explosion effect
        const explosionGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
        explosionGradient.addColorStop(0, '#FFD700');
        explosionGradient.addColorStop(0.5, '#FFA500');
        explosionGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = explosionGradient;
        ctx.fillRect(-50, -50, 100, 100);
      }
      
      // Draw cash sprite (enhanced 3D effect)
      const cashGradient = ctx.createLinearGradient(-CASH_SIZE/2, -CASH_SIZE/2, CASH_SIZE/2, CASH_SIZE/2);
      cashGradient.addColorStop(0, '#FFD700');
      cashGradient.addColorStop(0.3, '#FFA500');
      cashGradient.addColorStop(0.7, '#FF8C00');
      cashGradient.addColorStop(1, '#FF6B00');
      
      // Draw 3D cash stack base with depth
      ctx.fillStyle = cashGradient;
      ctx.fillRect(-CASH_SIZE/2, -CASH_SIZE/2, CASH_SIZE, CASH_SIZE);
      
      // Add 3D depth effect
      const depthGradient = ctx.createLinearGradient(-CASH_SIZE/2, -CASH_SIZE/2, CASH_SIZE/2, CASH_SIZE/2);
      depthGradient.addColorStop(0, '#FFA500');
      depthGradient.addColorStop(0.5, '#FF8C00');
      depthGradient.addColorStop(1, '#B8860B');
      
      ctx.fillStyle = depthGradient;
      ctx.fillRect(-CASH_SIZE/2 + 2, -CASH_SIZE/2 + 2, CASH_SIZE - 4, CASH_SIZE - 4);
      
      // Add cash texture with 3D effect
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(-CASH_SIZE/2 + 8, -CASH_SIZE/2 + 8, CASH_SIZE - 16, CASH_SIZE - 16);
      
      // Add inner highlight
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(-CASH_SIZE/2 + 12, -CASH_SIZE/2 + 12, CASH_SIZE - 24, CASH_SIZE - 24);
      
      // Add dollar sign with 3D effect
      ctx.fillStyle = '#FF8C00';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 2, 2); // Shadow
      
      ctx.fillStyle = '#FFD700';
      ctx.fillText('$', 0, 0); // Main text
      
      ctx.restore();
      
      // Draw stacked coins on this cash sprite
      for (let i = 0; i < cash.stackedCoins; i++) {
        ctx.save();
        const stackHeight = i * (COIN_SIZE * 0.8); // Each coin takes up 80% of its size
        const targetX = cash.x + (CASH_SIZE * cash.scale) / 2 - COIN_SIZE / 2;
        const targetY = cash.y + (CASH_SIZE * cash.scale) - stackHeight - COIN_SIZE;
        
        ctx.translate(targetX + COIN_SIZE/2, targetY + COIN_SIZE/2);
        ctx.rotate(cash.rotation);
        ctx.scale(0.9, 0.9);
        
        // Draw stacked coin with enhanced 3D effect
        const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, COIN_SIZE/2);
        coinGradient.addColorStop(0, '#FFD700');
        coinGradient.addColorStop(0.4, '#FFA500');
        coinGradient.addColorStop(0.8, '#FF8C00');
        coinGradient.addColorStop(1, '#B8860B');
        
        // Draw coin shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(2, 2, COIN_SIZE/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw main coin
        ctx.fillStyle = coinGradient;
        ctx.beginPath();
        ctx.arc(0, 0, COIN_SIZE/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add coin edge with 3D effect
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add inner coin edge
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, COIN_SIZE/2 - 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add coin center with 3D effect
        const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, COIN_SIZE/4);
        centerGradient.addColorStop(0, '#FFD700');
        centerGradient.addColorStop(1, '#FFA500');
        
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, COIN_SIZE/4, 0, Math.PI * 2);
        ctx.fill();
        
        // Add stack number indicator with 3D effect
        ctx.fillStyle = '#B8860B';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, 1, 1); // Shadow
        
        ctx.fillStyle = 'white';
        ctx.fillText(`${i + 1}`, 0, 0); // Main text
        
        ctx.restore();
      }
    });
    
    // Draw coins
    gameData.coins.forEach(coin => {
      ctx.save();
      ctx.translate(coin.x + COIN_SIZE/2, coin.y + COIN_SIZE/2);
      ctx.rotate(coin.rotation);
      ctx.scale(coin.scale, coin.scale);
      
      // Draw coin with enhanced 3D effect
      const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, COIN_SIZE/2);
      coinGradient.addColorStop(0, '#FFD700');
      coinGradient.addColorStop(0.4, '#FFA500');
      coinGradient.addColorStop(0.8, '#FF8C00');
      coinGradient.addColorStop(1, '#B8860B');
      
      // Draw coin shadow for depth
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(2, 2, COIN_SIZE/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw main coin
      ctx.fillStyle = coinGradient;
      ctx.beginPath();
      ctx.arc(0, 0, COIN_SIZE/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Add coin edge with 3D effect
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Add inner coin edge
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, COIN_SIZE/2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add coin center with 3D effect
      const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, COIN_SIZE/4);
      centerGradient.addColorStop(0, '#FFD700');
      centerGradient.addColorStop(1, '#FFA500');
      
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(0, 0, COIN_SIZE/4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
    
    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameData.score.toFixed(1)}`, 20, 40);
    ctx.fillText(`Level: ${gameData.level}`, 20, 70);
    ctx.fillText(`Perfect Stacks: ${gameData.perfectStacks}`, 20, 100);
    ctx.fillText(`Total Stacks: ${gameData.totalStacks}`, 20, 130);
    ctx.fillText(`Difficulty: Level ${gameData.difficultyLevel}`, 20, 160);
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
              <p><span className="font-bold text-green-300">🎯 Objective:</span> Stack coins on falling cash sprites to build towers!</p>
              <p><span className="font-bold text-green-300">🎮 How to Play:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Cash sprites fall from the top at random speeds</li>
                <li>Coins fall faster and stack on the cash sprites</li>
                <li>Perfect stacks (center alignment) give bonus points and explosions</li>
                <li>Speed increases every 20 seconds for more challenge</li>
                <li>Build the highest stacks possible!</li>
              </ul>
              <p><span className="font-bold text-green-300">🏆 Scoring:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Base stacking: 10 points per coin</li>
                <li>Perfect stack bonus: +20 points</li>
                <li>Explosion bonus: Cash sprite explodes on perfect stacks</li>
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
    <div className="fixed inset-0 bg-black z-50">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}