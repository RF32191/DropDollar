'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playSuccessChime, playErrorBuzz, playCoinsFalling, playButtonHover } from '@/lib/gameAudio';

interface Block {
  id: number;
  x: number;
  y: number;
  color: 'gold' | 'silver' | 'bronze';
  isFalling: boolean;
  isGrabbed: boolean;
}

interface Pillar {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  number: number;
  isDestroyed: boolean;
}

interface SpawnCircle {
  id: number;
  x: number;
  y: number;
  number: number;
  isActive: boolean;
  clickOrder: number;
}

interface GameState {
  score: number;
  level: number;
  blocks: Block[];
  pillars: Pillar[];
  spawnCircles: SpawnCircle[];
  gameOver: boolean;
  gameStarted: boolean;
  perfectStacks: number;
  totalStacks: number;
  gameStartTime: number;
  difficultyLevel: number;
  grabbedBlock: Block | null;
  nextClickOrder: number;
}

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const BLOCK_SIZE = 40;
const PILLAR_WIDTH = 60;
const PILLAR_HEIGHT = 200;
const SPAWN_CIRCLE_SIZE = 50;

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
    pillars: [],
    spawnCircles: [],
    gameOver: false,
    gameStarted: false,
    perfectStacks: 0,
    totalStacks: 0,
    gameStartTime: 0,
    difficultyLevel: 1,
    grabbedBlock: null,
    nextClickOrder: 1
  });
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);

  console.log('🎮 CashStackGame: Component mounted, gameState:', gameState);

  // Generate random block
  const generateBlock = useCallback((): Block => {
    const colors: ('gold' | 'silver' | 'bronze')[] = ['gold', 'silver', 'bronze'];
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - BLOCK_SIZE),
      y: -BLOCK_SIZE,
      color: colors[Math.floor(Math.random() * colors.length)],
      isFalling: true,
      isGrabbed: false
    };
  }, []);

  // Generate pillar
  const generatePillar = useCallback((): Pillar => {
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - PILLAR_WIDTH),
      y: CANVAS_HEIGHT - PILLAR_HEIGHT,
      width: PILLAR_WIDTH,
      height: PILLAR_HEIGHT,
      number: Math.floor(Math.random() * 5) + 1,
      isDestroyed: false
    };
  }, []);

  // Generate spawn circle
  const generateSpawnCircle = useCallback((): SpawnCircle => {
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - SPAWN_CIRCLE_SIZE),
      y: Math.random() * (CANVAS_HEIGHT - SPAWN_CIRCLE_SIZE),
      number: Math.floor(Math.random() * 5) + 1,
      isActive: true,
      clickOrder: 0
    };
  }, []);

  // Check if block can stack on another block of same color
  const canStack = (block1: Block, block2: Block): boolean => {
    return block1.color === block2.color && 
           Math.abs(block1.x - block2.x) < BLOCK_SIZE && 
           Math.abs(block1.y - block2.y) < BLOCK_SIZE;
  };

  // Handle block stacking
  const handleBlockStack = useCallback((fallingBlock: Block) => {
    setGameData(prev => {
      const newState = { ...prev };
      
      // Find blocks to stack on
      const stackableBlocks = newState.blocks.filter(block => 
        !block.isFalling && canStack(fallingBlock, block)
      );
      
      if (stackableBlocks.length > 0) {
        // Stack the block
        const targetBlock = stackableBlocks[0];
        const newBlock = {
          ...fallingBlock,
          x: targetBlock.x,
          y: targetBlock.y - BLOCK_SIZE,
          isFalling: false
        };
        
        newState.blocks.push(newBlock);
        newState.score += 10;
        newState.totalStacks += 1;
        
        // Check for perfect stack (exact alignment)
        if (Math.abs(fallingBlock.x - targetBlock.x) < 5) {
          newState.score += 20;
          newState.perfectStacks += 1;
          playSuccessChime();
        } else {
          playCoinsFalling();
        }
      } else {
        // Block falls to ground
        const groundBlock = {
          ...fallingBlock,
          y: CANVAS_HEIGHT - BLOCK_SIZE,
          isFalling: false
        };
        newState.blocks.push(groundBlock);
        playErrorBuzz();
      }
      
      return newState;
    });
  }, []);

  // Handle spawn circle click
  const handleSpawnCircleClick = useCallback((circle: SpawnCircle) => {
    setGameData(prev => {
      const newState = { ...prev };
      
      if (circle.number === newState.nextClickOrder) {
        // Correct order - destroy pillar
        newState.pillars = newState.pillars.map(pillar => 
          pillar.number === circle.number 
            ? { ...pillar, isDestroyed: true }
            : pillar
        );
        
        newState.spawnCircles = newState.spawnCircles.map(c => 
          c.id === circle.id 
            ? { ...c, isActive: false }
            : c
        );
        
        newState.nextClickOrder += 1;
        newState.score += 50;
        playSuccessChime();
      } else {
        // Wrong order - penalty
        newState.score = Math.max(0, newState.score - 25);
        playErrorBuzz();
      }
      
      return newState;
    });
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
      
      // Calculate difficulty progression
      const timeElapsed = (currentTime - newState.gameStartTime) / 1000;
      const newDifficultyLevel = Math.max(1, Math.floor(timeElapsed / 20) + 1);
      
      if (newDifficultyLevel !== newState.difficultyLevel) {
        newState.difficultyLevel = newDifficultyLevel;
      }
      
      // Update falling blocks
      newState.blocks = newState.blocks.map(block => {
        if (block.isFalling && !block.isGrabbed) {
          const newBlock = { ...block };
          newBlock.y += 3; // Fall speed
          
          // Check if block hits ground or another block
          if (newBlock.y >= CANVAS_HEIGHT - BLOCK_SIZE) {
            newBlock.y = CANVAS_HEIGHT - BLOCK_SIZE;
            newBlock.isFalling = false;
          } else {
            // Check for stacking
            const stackableBlock = newState.blocks.find(b => 
              !b.isFalling && canStack(newBlock, b) && 
              Math.abs(newBlock.y - b.y) < BLOCK_SIZE
            );
            
            if (stackableBlock) {
              newBlock.y = stackableBlock.y - BLOCK_SIZE;
              newBlock.isFalling = false;
            }
          }
          
          return newBlock;
        }
        return block;
      });
      
      // Spawn new blocks
      if (Math.random() < 0.02) {
        newState.blocks.push(generateBlock());
      }
      
      // Spawn new pillars
      if (Math.random() < 0.01) {
        newState.pillars.push(generatePillar());
      }
      
      // Spawn new spawn circles
      if (Math.random() < 0.005) {
        newState.spawnCircles.push(generateSpawnCircle());
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
  }, [gameState, gameData.gameOver, generateBlock, generatePillar, generateSpawnCircle]);

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
            blocks: [generateBlock()],
            pillars: [generatePillar()],
            spawnCircles: [generateSpawnCircle()],
            nextClickOrder: 1
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

  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
        x: mouseX - BLOCK_SIZE / 2,
        y: mouseY - BLOCK_SIZE / 2
      } : null
    }));
  }, [gameState, gameData.grabbedBlock]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
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
    
    // Check if clicking on a spawn circle
    const clickedCircle = gameData.spawnCircles.find(circle => 
      circle.isActive &&
      mouseX >= circle.x && mouseX <= circle.x + SPAWN_CIRCLE_SIZE &&
      mouseY >= circle.y && mouseY <= circle.y + SPAWN_CIRCLE_SIZE
    );
    
    if (clickedCircle) {
      handleSpawnCircleClick(clickedCircle);
    }
  }, [gameState, gameData.blocks, gameData.spawnCircles, handleSpawnCircleClick]);

  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || !gameData.grabbedBlock) return;
    
    // Drop the grabbed block
    const droppedBlock = { ...gameData.grabbedBlock, isGrabbed: false, isFalling: true };
    handleBlockStack(droppedBlock);
    
    setGameData(prev => ({
      ...prev,
      grabbedBlock: null
    }));
  }, [gameState, gameData.grabbedBlock, handleBlockStack]);

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
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
    
    // Draw blocks
    gameData.blocks.forEach(block => {
      ctx.save();
      
      // Set color based on block type
      let blockColor: string;
      switch (block.color) {
        case 'gold':
          blockColor = '#FFD700';
          break;
        case 'silver':
          blockColor = '#C0C0C0';
          break;
        case 'bronze':
          blockColor = '#CD7F32';
          break;
      }
      
      // Draw block with 3D effect
      const blockGradient = ctx.createLinearGradient(block.x, block.y, block.x + BLOCK_SIZE, block.y + BLOCK_SIZE);
      blockGradient.addColorStop(0, blockColor);
      blockGradient.addColorStop(0.5, blockColor);
      blockGradient.addColorStop(1, '#8B4513');
      
      ctx.fillStyle = blockGradient;
      ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
      
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
      }
      
      // Draw grabbed block with glow effect
      ctx.shadowColor = blockColor;
      ctx.shadowBlur = 20;
      ctx.fillStyle = blockColor;
      ctx.fillRect(gameData.grabbedBlock.x, gameData.grabbedBlock.y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.shadowBlur = 0;
      
      // Add border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.strokeRect(gameData.grabbedBlock.x, gameData.grabbedBlock.y, BLOCK_SIZE, BLOCK_SIZE);
      
      // Add color indicator
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gameData.grabbedBlock.color[0].toUpperCase(), 
                   gameData.grabbedBlock.x + BLOCK_SIZE/2, 
                   gameData.grabbedBlock.y + BLOCK_SIZE/2);
      
      ctx.restore();
    }
    
    // Draw pillars
    gameData.pillars.forEach(pillar => {
      if (!pillar.isDestroyed) {
        ctx.save();
        
        // Draw pillar
        ctx.fillStyle = '#654321';
        ctx.fillRect(pillar.x, pillar.y, pillar.width, pillar.height);
        
        // Add pillar border
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(pillar.x, pillar.y, pillar.width, pillar.height);
        
        // Add number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pillar.number.toString(), 
                     pillar.x + pillar.width/2, 
                     pillar.y + pillar.height/2);
        
        ctx.restore();
      }
    });
    
    // Draw spawn circles
    gameData.spawnCircles.forEach(circle => {
      if (circle.isActive) {
        ctx.save();
        
        // Draw circle
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(circle.x + SPAWN_CIRCLE_SIZE/2, circle.y + SPAWN_CIRCLE_SIZE/2, 
                SPAWN_CIRCLE_SIZE/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Add circle border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Add number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(circle.number.toString(), 
                     circle.x + SPAWN_CIRCLE_SIZE/2, 
                     circle.y + SPAWN_CIRCLE_SIZE/2);
        
        ctx.restore();
      }
    });
    
    // Draw UI
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameData.score}`, 20, 40);
    ctx.fillText(`Level: ${gameData.level}`, 20, 70);
    ctx.fillText(`Perfect Stacks: ${gameData.perfectStacks}`, 20, 100);
    ctx.fillText(`Total Stacks: ${gameData.totalStacks}`, 20, 130);
    ctx.fillText(`Next Click: ${gameData.nextClickOrder}`, 20, 160);
    
    // Draw instructions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Drag blocks to stack same colors!', CANVAS_WIDTH - 300, 40);
    ctx.fillText('Click spawn circles in order!', CANVAS_WIDTH - 300, 70);
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

  // End game after 60 seconds
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setTimeout(() => {
        endGame();
      }, 60000);
      
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
              <span className="mr-2">🎮</span>
              Tetris Cash Stack Instructions
            </h3>
            <div className="space-y-3 text-green-100">
              <p><span className="font-bold text-green-300">🎯 Objective:</span> Stack blocks by color and destroy pillars in order!</p>
              <p><span className="font-bold text-green-300">🎮 How to Play:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>Drag blocks to stack same colors (Gold with Gold, Silver with Silver, Bronze with Bronze)</li>
                <li>Click spawn circles in numerical order (1, 2, 3, 4, 5) to destroy pillars</li>
                <li>Perfect alignment gives bonus points</li>
                <li>Wrong order clicking gives penalties</li>
                <li>Build the highest stacks possible!</li>
              </ul>
              <p><span className="font-bold text-green-300">🏆 Scoring:</span></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Stacking same colors: 10 points</li>
                <li>Perfect alignment: +20 bonus</li>
                <li>Destroying pillars in order: 50 points</li>
                <li>Wrong order: -25 penalty</li>
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
        style={{ 
          imageRendering: 'pixelated',
          display: 'block',
          margin: 0,
          padding: 0
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}