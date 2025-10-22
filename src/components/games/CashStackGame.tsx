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
  baseSpeed: number;
  tilt: number;
  isExploding: boolean;
  explosionTime: number;
  stackedCoins: Coin[]; // Coins stacked on this cash sprite
}

interface Coin {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  speed: number;
  isStacked: boolean;
  stackTime: number;
  targetX?: number; // Target position for stacking
  targetY?: number;
  isFalling: boolean;
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
  averageStackTime: number;
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
    averageStackTime: 0,
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
      baseSpeed: baseSpeed,
      tilt: 0,
      isExploding: false,
      explosionTime: 0,
      stackedCoins: [] // Initialize empty stack
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
      isStacked: false,
      stackTime: 0,
      isFalling: true
    };
  }, []);

  // Check if coin is in stack zone
  const isInStackZone = (coin: Coin, cash: CashSprite): boolean => {
    const stackZoneX = cash.x + (CASH_SIZE * cash.scale) / 2 - STACK_ZONE_WIDTH / 2;
    const stackZoneY = cash.y + (CASH_SIZE * cash.scale) - STACK_ZONE_HEIGHT;
    
    return (
      coin.x >= stackZoneX &&
      coin.x <= stackZoneX + STACK_ZONE_WIDTH &&
      coin.y >= stackZoneY &&
      coin.y <= stackZoneY + STACK_ZONE_HEIGHT
    );
  };

  // Check for perfect stack
  const isPerfectStack = (coin: Coin, cash: CashSprite): boolean => {
    const centerX = cash.x + (CASH_SIZE * cash.scale) / 2;
    const centerY = cash.y + (CASH_SIZE * cash.scale);
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(coin.x + COIN_SIZE/2 - centerX, 2) + 
      Math.pow(coin.y + COIN_SIZE/2 - centerY, 2)
    );
    
    return distanceFromCenter < 15; // Perfect stack within 15 pixels of center
  };

  // Handle coin stacking - actually stack coins on top of each other
  const handleCoinStack = useCallback((coin: Coin, cash: CashSprite, stackTime: number) => {
    const isPerfect = isPerfectStack(coin, cash);
    const stackSpeed = 1 / (stackTime / 1000); // Convert to stacks per second
    
    let points = 10; // Base points
    
    // Calculate stack position
    const stackHeight = cash.stackedCoins.length * (COIN_SIZE * 0.8); // Each coin takes up 80% of its size
    const targetX = cash.x + (CASH_SIZE * cash.scale) / 2 - COIN_SIZE / 2;
    const targetY = cash.y + (CASH_SIZE * cash.scale) - stackHeight - COIN_SIZE;
    
    // Create stacked coin
    const stackedCoin: Coin = {
      ...coin,
      isStacked: true,
      stackTime: stackTime,
      targetX: targetX,
      targetY: targetY,
      isFalling: false
    };
    
    if (isPerfect) {
      points += 20; // Bonus for perfect stack
      playSuccessChime();
      
      // Explode cash sprite
      setGameData(prev => ({
        ...prev,
        cashSprites: prev.cashSprites.map(c => 
          c.id === cash.id 
            ? { ...c, isExploding: true, explosionTime: Date.now(), stackedCoins: [...c.stackedCoins, stackedCoin] }
            : c
        ),
        perfectStacks: prev.perfectStacks + 1
      }));
    } else {
      playCoinsFalling();
      
      // Tilt cash sprite based on how off-center the coin is
      const centerX = cash.x + (CASH_SIZE * cash.scale) / 2;
      const tiltAmount = (coin.x + COIN_SIZE/2 - centerX) / 50; // Normalize tilt
      
      setGameData(prev => ({
        ...prev,
        cashSprites: prev.cashSprites.map(c => 
          c.id === cash.id 
            ? { ...c, tilt: Math.max(-0.5, Math.min(0.5, tiltAmount)), stackedCoins: [...c.stackedCoins, stackedCoin] }
            : c
        )
      }));
    }
    
    // Calculate decimal points based on stacking speed
    const speedBonus = Math.min(stackSpeed * 0.5, 5); // Max 5 bonus points
    const finalPoints = points + speedBonus;
    
    setGameData(prev => ({
      ...prev,
      score: prev.score + finalPoints,
      totalStacks: prev.totalStacks + 1,
      averageStackTime: prev.averageStackTime === 0 
        ? stackTime 
        : (prev.averageStackTime + stackTime) / 2
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
          newCash.speed = newCash.baseSpeed + (Math.random() - 0.5) * 2;
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
            newCash.tilt = 0; // Reset tilt after explosion
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
              newCoin.stackTime = currentTime;
              handleCoinStack(newCoin, cash, currentTime);
              break;
            }
          }
        }
        
        // Remove coin if off screen
        if (newCoin.y > CANVAS_HEIGHT) {
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
  const handleEndGame = () => {
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
      ctx.rotate(cash.rotation + cash.tilt);
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
      cash.stackedCoins.forEach((stackedCoin, index) => {
        ctx.save();
        ctx.translate(stackedCoin.targetX! + COIN_SIZE/2, stackedCoin.targetY! + COIN_SIZE/2);
        ctx.rotate(stackedCoin.rotation);
        ctx.scale(stackedCoin.scale, stackedCoin.scale);
        
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
        ctx.fillText(`${index + 1}`, 1, 1); // Shadow
        
        ctx.fillStyle = 'white';
        ctx.fillText(`${index + 1}`, 0, 0); // Main text
        
        ctx.restore();
      });
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
    
    if (gameData.averageStackTime > 0) {
      ctx.fillText(`Avg Stack Time: ${(gameData.averageStackTime / 1000).toFixed(2)}s`, 20, 160);
    }
  };

  // Render loop
  useEffect(() => {
    if (gameState === 'playing') {
      const renderLoop = () => {
        render();
        if (gameState === 'playing' && !gameData.gameOver) {
          requestAnimationFrame(renderLoop);
        }
      };
      renderLoop();
    }
  }, [gameState, gameData.gameOver]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  if (gameState === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 via-emerald-800 to-green-900 text-white flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h2 className="text-4xl font-bold mb-6">💰 Cash Stack Challenge</h2>
          <p className="text-xl mb-8">Stack coins on falling cash sprites for points!</p>
          
          {/* Epilepsy Warning */}
          <div className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-600 rounded-xl p-6 mb-8 shadow-2xl">
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
          
          {/* Instructions */}
          <div className="bg-gradient-to-r from-green-800 to-green-900 border-2 border-green-600 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg font-black">💰</span>
              </div>
              <h3 className="text-white font-black text-xl">How to Play:</h3>
            </div>
            
            <div className="space-y-3 text-white">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-green-300 font-bold">Cash Sprites:</span> 3D cash sprites fall at random speeds</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-green-300 font-bold">Stack Coins:</span> Coins appear - stack them on cash sprites</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-green-300 font-bold">Perfect Stack:</span> Center coins for bonus points and explosions</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-green-300 font-bold">Speed Bonus:</span> Faster stacking = more decimal points</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                <p><span className="text-green-300 font-bold">Random Speed:</span> Cash speeds up with higher scores</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-600/30 to-green-500/30 border border-green-400/50 rounded-lg p-3 mt-4">
              <p className="text-sm text-green-200">
                <span className="text-green-300 font-bold">💡 Pro Tip:</span> Perfect stacks explode the cash and reset its tilt!
              </p>
            </div>
          </div>
          
          <button
            onClick={handleStartGame}
            className="mt-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🚀 Start Cash Stack Challenge
          </button>
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 via-emerald-800 to-green-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-bold mb-4 animate-pulse">{countdown}</div>
          <p className="text-2xl">Get ready to stack cash!</p>
        </div>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 via-emerald-800 to-green-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-6">🎉 Game Over!</h2>
          <div className="text-2xl space-y-2">
            <p>Final Score: <span className="text-green-400 font-bold">{gameData.score.toFixed(1)}</span></p>
            <p>Perfect Stacks: <span className="text-yellow-400 font-bold">{gameData.perfectStacks}</span></p>
            <p>Total Stacks: <span className="text-blue-400 font-bold">{gameData.totalStacks}</span></p>
            <p>Level Reached: <span className="text-purple-400 font-bold">{gameData.level}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 via-emerald-800 to-green-900 text-white flex items-center justify-center">
      <div className="text-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-green-400 rounded-xl shadow-2xl"
        />
        <div className="mt-4">
          <button
            onClick={handleEndGame}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition-colors"
          >
            End Game
          </button>
        </div>
      </div>
    </div>
  );
}
