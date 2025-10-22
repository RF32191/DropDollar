'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { playCoinsFalling, playSuccessChime, playErrorBuzz } from '@/lib/gameAudio';

interface Block {
  id: number;
  x: number;
  y: number;
  color: 'gold' | 'silver' | 'bronze' | 'cash';
  isFalling: boolean;
  isGrabbed: boolean;
}

interface GameState {
  score: number;
  level: number;
  blocks: Block[];
  gameOver: boolean;
  gameStarted: boolean;
  perfectStacks: number;
  totalStacks: number;
  gameStartTime: number;
  difficultyLevel: number;
  grabbedBlock: Block | null;
}

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const BLOCK_SIZE = 40;
const GRID_WIDTH = Math.floor(CANVAS_WIDTH / BLOCK_SIZE);
const GRID_HEIGHT = Math.floor(CANVAS_HEIGHT / BLOCK_SIZE);
const GROUND_Y = CANVAS_HEIGHT - BLOCK_SIZE;

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
    blocks: [],
    gameOver: false,
    gameStarted: false,
    perfectStacks: 0,
    totalStacks: 0,
    gameStartTime: 0,
    difficultyLevel: 1,
    grabbedBlock: null
  });
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);

  console.log('🎮 CashStackGame: Component mounted, gameState:', gameState);

  // Generate falling block
  const generateBlock = useCallback((): Block => {
    const colors: ('gold' | 'silver' | 'bronze' | 'cash')[] = ['gold', 'silver', 'bronze', 'cash'];
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - BLOCK_SIZE),
      y: -BLOCK_SIZE,
      color: colors[Math.floor(Math.random() * colors.length)],
      isFalling: true,
      isGrabbed: false
    };
  }, []);

  // Check collision between blocks
  const checkCollision = (block1: Block, block2: Block): boolean => {
    return Math.abs(block1.x - block2.x) < BLOCK_SIZE && 
           Math.abs(block1.y - block2.y) < BLOCK_SIZE;
  };

  // Handle block stacking
  const handleDropBlock = useCallback((block: Block) => {
    setGameData(prev => {
      const newState = { ...prev };
      
      // Find blocks to stack on
      const stackableBlocks = newState.blocks.filter(b => 
        !b.isFalling && 
        checkCollision(block, b) && 
        block.color === b.color
      );
      
      if (stackableBlocks.length > 0) {
        // Stack on existing block
        const targetBlock = stackableBlocks[0];
        const stackedBlock = {
          ...block,
          x: targetBlock.x,
          y: targetBlock.y - BLOCK_SIZE,
          isFalling: false
        };
        
        newState.blocks.push(stackedBlock);
        newState.score += 10;
        newState.totalStacks += 1;
        
        // Perfect alignment bonus
        if (Math.abs(block.x - targetBlock.x) < 5) {
          newState.score += 20;
          newState.perfectStacks += 1;
          playSuccessChime();
        } else {
          playCoinsFalling();
        }
        
        // Check for cash explosions
        checkCashExplosions(newState, stackedBlock);
        
      } else {
        // Drop to ground
        const groundBlock = {
          ...block,
          y: GROUND_Y,
          isFalling: false
        };
        newState.blocks.push(groundBlock);
        playErrorBuzz();
      }
      
      return newState;
    });
  }, []);

  // Check for cash explosions and color matches
  const checkCashExplosions = (state: GameState, newBlock: Block) => {
    if (newBlock.color === 'cash') {
      // Cash explodes when it touches other cash
      const nearbyCash = state.blocks.filter(block => 
        block.color === 'cash' && 
        checkCollision(newBlock, block) &&
        block.id !== newBlock.id
      );
      
      if (nearbyCash.length > 0) {
        // Explosion! Remove nearby blocks
        const explosionRadius = BLOCK_SIZE * 3;
        state.blocks = state.blocks.filter(block => {
          const distance = Math.sqrt(
            Math.pow(block.x - newBlock.x, 2) + 
            Math.pow(block.y - newBlock.y, 2)
          );
          return distance > explosionRadius;
        });
        
        state.score += 100; // Explosion bonus
        playSuccessChime();
      }
    } else {
      // Check for color matches (gold+gold, silver+silver, bronze+bronze)
      const sameColorBlocks = state.blocks.filter(block => 
        block.color === newBlock.color && 
        checkCollision(newBlock, block) &&
        block.id !== newBlock.id
      );
      
      if (sameColorBlocks.length >= 2) {
        // Remove matched blocks
        state.blocks = state.blocks.filter(block => 
          !sameColorBlocks.includes(block) && block.id !== newBlock.id
        );
        
        state.score += 50; // Match bonus
        playSuccessChime();
      }
    }
  };

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
      
      // Update difficulty
      const gameTime = (currentTime - newState.gameStartTime) / 1000;
      const newDifficulty = Math.max(1, Math.floor(gameTime / 20) + 1);
      if (newDifficulty !== newState.difficultyLevel) {
        newState.difficultyLevel = newDifficulty;
      }
      
      // Move falling blocks
      newState.blocks = newState.blocks.map(block => {
        if (block.isFalling && !block.isGrabbed) {
          const newBlock = { ...block };
          newBlock.y += 3 + newState.difficultyLevel; // Speed increases with difficulty
          
          // Check collision with ground or other blocks
          if (newBlock.y >= GROUND_Y) {
            newBlock.y = GROUND_Y;
            newBlock.isFalling = false;
          } else {
            const collidingBlock = newState.blocks.find(b => 
              !b.isFalling && 
              checkCollision(newBlock, b)
            );
            if (collidingBlock) {
              newBlock.y = collidingBlock.y - BLOCK_SIZE;
              newBlock.isFalling = false;
            }
          }
          
          return newBlock;
        }
        return block;
      });
      
      // Spawn new blocks
      if (Math.random() < 0.02 + (newState.difficultyLevel * 0.01)) {
        newState.blocks.push(generateBlock());
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
  }, [gameState, gameData.gameOver, generateBlock]);

  // End game
  const endGame = useCallback(() => {
    setGameState('ended');
    setGameData(prev => ({ ...prev, gameOver: true }));
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
    
    const accuracy = gameData.totalStacks > 0 ? 
      (gameData.perfectStacks / gameData.totalStacks) * 100 : 100;
    
    onGameEnd({ score: gameData.score, accuracy });
  }, [gameData.totalStacks, gameData.perfectStacks, gameData.score, onGameEnd]);

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
            blocks: [generateBlock()]
          }));
          lastTimeRef.current = performance.now();
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Mouse handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (gameState !== 'playing' || !gameData.grabbedBlock) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setGameData(prev => ({
      ...prev,
      grabbedBlock: prev.grabbedBlock ? {
        ...prev.grabbedBlock,
        x: mouseX - BLOCK_SIZE/2,
        y: mouseY - BLOCK_SIZE/2
      } : null
    }));
  }, [gameState, gameData.grabbedBlock]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if clicking on a block
    const clickedBlock = gameData.blocks.find(block => 
      mouseX >= block.x && mouseX <= block.x + BLOCK_SIZE &&
      mouseY >= block.y && mouseY <= block.y + BLOCK_SIZE &&
      !block.isFalling
    );
    
    if (clickedBlock) {
      setGameData(prev => ({
        ...prev,
        grabbedBlock: { ...clickedBlock, isGrabbed: true },
        blocks: prev.blocks.filter(b => b.id !== clickedBlock.id)
      }));
    }
  }, [gameState, gameData.blocks]);

  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || !gameData.grabbedBlock) return;
    
    // Drop the grabbed block
    const droppedBlock = { ...gameData.grabbedBlock, isGrabbed: false, isFalling: true };
    handleDropBlock(droppedBlock);
    
    setGameData(prev => ({ ...prev, grabbedBlock: null }));
  }, [gameState, gameData.grabbedBlock, handleDropBlock]);

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, BLOCK_SIZE);
    
    // Draw blocks
    gameData.blocks.forEach(block => {
      ctx.save();
      
      // Set shiny chrome colors based on block type
      let blockGradient: CanvasGradient;
      switch (block.color) {
        case 'gold':
          blockGradient = ctx.createLinearGradient(block.x, block.y, block.x + BLOCK_SIZE, block.y + BLOCK_SIZE);
          blockGradient.addColorStop(0, '#FFD700');
          blockGradient.addColorStop(0.2, '#FFA500');
          blockGradient.addColorStop(0.4, '#FFD700');
          blockGradient.addColorStop(0.6, '#FFA500');
          blockGradient.addColorStop(0.8, '#FFD700');
          blockGradient.addColorStop(1, '#B8860B');
          break;
        case 'silver':
          blockGradient = ctx.createLinearGradient(block.x, block.y, block.x + BLOCK_SIZE, block.y + BLOCK_SIZE);
          blockGradient.addColorStop(0, '#E6E6FA');
          blockGradient.addColorStop(0.2, '#C0C0C0');
          blockGradient.addColorStop(0.4, '#E6E6FA');
          blockGradient.addColorStop(0.6, '#C0C0C0');
          blockGradient.addColorStop(0.8, '#E6E6FA');
          blockGradient.addColorStop(1, '#A0A0A0');
          break;
        case 'bronze':
          blockGradient = ctx.createLinearGradient(block.x, block.y, block.x + BLOCK_SIZE, block.y + BLOCK_SIZE);
          blockGradient.addColorStop(0, '#CD7F32');
          blockGradient.addColorStop(0.2, '#B8860B');
          blockGradient.addColorStop(0.4, '#CD7F32');
          blockGradient.addColorStop(0.6, '#B8860B');
          blockGradient.addColorStop(0.8, '#CD7F32');
          blockGradient.addColorStop(1, '#8B4513');
          break;
        case 'cash':
          blockGradient = ctx.createLinearGradient(block.x, block.y, block.x + BLOCK_SIZE, block.y + BLOCK_SIZE);
          blockGradient.addColorStop(0, '#00FF00');
          blockGradient.addColorStop(0.2, '#32CD32');
          blockGradient.addColorStop(0.4, '#00FF00');
          blockGradient.addColorStop(0.6, '#32CD32');
          blockGradient.addColorStop(0.8, '#00FF00');
          blockGradient.addColorStop(1, '#228B22');
          break;
      }
      
      // Draw block with shiny chrome effect
      ctx.fillStyle = blockGradient;
      ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
      
      // Add reflective highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(block.x + 2, block.y + 2, BLOCK_SIZE/3, BLOCK_SIZE/3);
      ctx.fillRect(block.x + BLOCK_SIZE/2, block.y + BLOCK_SIZE/2, BLOCK_SIZE/4, BLOCK_SIZE/4);
      
      // Add block border
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.strokeRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
      
      // Add color indicator
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(block.color[0].toUpperCase(), block.x + BLOCK_SIZE/2, block.y + BLOCK_SIZE/2);
      
      ctx.restore();
    });
    
    // Draw grabbed block
    if (gameData.grabbedBlock) {
      ctx.save();
      
      let blockColor: string;
      switch (gameData.grabbedBlock.color) {
        case 'gold':
          blockColor = '#FFD700';
          break;
        case 'silver':
          blockColor = '#C0C0C0';
          break;
        case 'bronze':
          blockColor = '#CD7F32';
          break;
        case 'cash':
          blockColor = '#00FF00';
          break;
      }
      
      ctx.shadowColor = blockColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = blockColor;
      ctx.fillRect(gameData.grabbedBlock.x, gameData.grabbedBlock.y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(gameData.grabbedBlock.x, gameData.grabbedBlock.y, BLOCK_SIZE, BLOCK_SIZE);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gameData.grabbedBlock.color[0].toUpperCase(), 
                   gameData.grabbedBlock.x + BLOCK_SIZE/2, 
                   gameData.grabbedBlock.y + BLOCK_SIZE/2);
      
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
    
    // Draw instructions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Drag blocks to stack same colors!', CANVAS_WIDTH - 300, 40);
    ctx.fillText('Cash explodes when touching other cash!', CANVAS_WIDTH - 300, 70);
  }, [gameData]);

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
  }, [gameState, gameData, render]);

  // Lock screen during gameplay
  useEffect(() => {
    if (gameState === 'playing') {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [gameState]);

  // Game timer
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setTimeout(() => {
        endGame();
      }, 60000); // 60 seconds
      
      return () => clearTimeout(timer);
    }
  }, [gameState, endGame]);

  // Cleanup effect to stop game loop on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (showCountdown) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-8xl font-bold text-yellow-400 mb-8">{countdown}</div>
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
              This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. If you are sensitive to flashing lights, please do not play this game.
            </p>
          </div>

          {/* Instructions */}
          <div className="text-left text-sm sm:text-base text-white mb-6 sm:mb-8 space-y-4 bg-gradient-to-r from-green-800 to-green-900 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border-2 border-green-600 shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-green-300 mb-4 flex items-center">
              <span className="mr-2">🎮</span>
              Tetris Cash Stack Instructions
            </h3>
            <div className="space-y-3 text-green-100">
              <p><span className="font-bold text-green-300">🎯 Objective:</span> Stack blocks by color and create cash explosions!</p>
              <p><span className="font-bold text-green-300">🎮 How to Play:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Drag blocks to stack same colors (Gold with Gold, Silver with Silver, Bronze with Bronze)</li>
                <li>Cash blocks explode when they touch other cash blocks!</li>
                <li>Explosions remove nearby blocks and give bonus points</li>
                <li>Perfect alignment gives bonus points</li>
                <li>Build the highest stacks possible!</li>
              </ul>
              <p><span className="font-bold text-green-300">🏆 Scoring:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Stacking same colors: 10 points</li>
                <li>Perfect alignment: +20 bonus</li>
                <li>Cash explosions: 100 points</li>
                <li>Color matches: 50 points</li>
                <li>Level up every 100 points</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartGame}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              🚀 Start Tetris Cash Stack
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-screen h-screen cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
}