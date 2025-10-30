'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CASH STACK - Stack Game (Like Triumph/Stack/Ketchapp)
 * Stack moving platforms perfectly to build a tower
 * Misaligned parts fall off and reduce the platform size
 * Perfect stacks earn bonus points
 * Game ends when platform becomes too small or 60 seconds expire
 */

interface Block {
  x: number;
  y: number;
  width: number;
  depth: number;
  color: string;
  direction: 'x' | 'z'; // Alternates between horizontal and depth directions
}

interface GameState {
  blocks: Block[];
  currentBlock: Block | null;
  score: number;
  perfectCount: number;
  gameOver: boolean;
  gameStarted: boolean;
  direction: number; // 1 or -1
  speed: number;
  initialWidth: number;
}

interface CashStackGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

const INITIAL_WIDTH = 80;
const INITIAL_DEPTH = 80;
const BLOCK_HEIGHT = 15;
const INITIAL_SPEED = 2;
const SPEED_INCREMENT = 0.15;
const MAX_SPEED = 8;
const PERFECT_THRESHOLD = 3; // Pixels tolerance for "perfect" alignment

// Color palette (cash/gold theme)
const COLORS = [
  '#FFD700', // Gold
  '#FFA500', // Orange
  '#32CD32', // Lime
  '#00CED1', // Turquoise
  '#FF69B4', // Pink
  '#9370DB', // Purple
  '#FF6347', // Tomato
  '#4169E1', // Royal Blue
];

export default function CashStackGame({
  onGameEnd,
  onExit,
  listingId,
  entryNumber,
  isCompetitionMode,
  gameId
}: CashStackGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [gameTimer, setGameTimer] = useState(60);
  const lastTimerUpdateRef = useRef<number>(0);

  const [game, setGame] = useState<GameState>({
    blocks: [],
    currentBlock: null,
    score: 0,
    perfectCount: 0,
    gameOver: false,
    gameStarted: false,
    direction: 1,
    speed: INITIAL_SPEED,
    initialWidth: INITIAL_WIDTH,
  });

  // Initialize game
  const initGame = useCallback(() => {
    const baseBlock: Block = {
      x: 0,
      y: 0,
      width: INITIAL_WIDTH,
      depth: INITIAL_DEPTH,
      color: COLORS[0],
      direction: 'x',
    };

    const firstBlock: Block = {
      x: -150,
      y: BLOCK_HEIGHT,
      width: INITIAL_WIDTH,
      depth: INITIAL_DEPTH,
      color: COLORS[1],
      direction: 'x',
    };

    setGame({
      blocks: [baseBlock],
      currentBlock: firstBlock,
      score: 0,
      perfectCount: 0,
      gameOver: false,
      gameStarted: true,
      direction: 1,
      speed: INITIAL_SPEED,
      initialWidth: INITIAL_WIDTH,
    });
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    setGameState('countdown');
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setGameState('playing');
          initGame();
          lastTimerUpdateRef.current = Date.now();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initGame]);

  // Handle stack placement
  const handleStack = useCallback(() => {
    if (!game.currentBlock || game.gameOver || gameState !== 'playing') return;

    const lastBlock = game.blocks[game.blocks.length - 1];
    const currentBlock = game.currentBlock;

    let newWidth = currentBlock.width;
    let newDepth = currentBlock.depth;
    let newX = currentBlock.x;
    let newZ = currentBlock.y; // Using y for z-axis in 2D projection

    let cutOffSize = 0;
    let isPerfect = false;

    if (currentBlock.direction === 'x') {
      // Moving horizontally
      const overhangLeft = lastBlock.x - currentBlock.x;
      const overhangRight = (currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width);

      if (overhangLeft >= currentBlock.width || overhangRight >= currentBlock.width) {
        // Complete miss - game over
        setGame(prev => ({ ...prev, gameOver: true }));
        return;
      }

      // Check for perfect alignment
      if (Math.abs(overhangLeft) <= PERFECT_THRESHOLD && Math.abs(overhangRight) <= PERFECT_THRESHOLD) {
        isPerfect = true;
        newX = lastBlock.x;
        newWidth = lastBlock.width;
      } else {
        // Calculate new block dimensions
        if (overhangLeft > 0) {
          newX = lastBlock.x;
          newWidth = currentBlock.width - overhangLeft;
          cutOffSize = overhangLeft;
        }
        if (overhangRight > 0) {
          newWidth = newWidth - overhangRight;
          cutOffSize += overhangRight;
        }
      }
    } else {
      // Moving in depth (z-axis, using y in 2D)
      const overhangFront = lastBlock.y - currentBlock.y;
      const overhangBack = (currentBlock.y + currentBlock.depth) - (lastBlock.y + lastBlock.depth);

      if (overhangFront >= currentBlock.depth || overhangBack >= currentBlock.depth) {
        // Complete miss - game over
        setGame(prev => ({ ...prev, gameOver: true }));
        return;
      }

      // Check for perfect alignment
      if (Math.abs(overhangFront) <= PERFECT_THRESHOLD && Math.abs(overhangBack) <= PERFECT_THRESHOLD) {
        isPerfect = true;
        newZ = lastBlock.y;
        newDepth = lastBlock.depth;
      } else {
        // Calculate new block dimensions
        if (overhangFront > 0) {
          newZ = lastBlock.y;
          newDepth = currentBlock.depth - overhangFront;
          cutOffSize = overhangFront;
        }
        if (overhangBack > 0) {
          newDepth = newDepth - overhangBack;
          cutOffSize += overhangBack;
        }
      }
    }

    // Game over if block becomes too small
    if (newWidth < 10 || newDepth < 10) {
      setGame(prev => ({ ...prev, gameOver: true }));
      return;
    }

    // Calculate score
    let scoreGain = 10;
    if (isPerfect) {
      scoreGain = 25; // Bonus for perfect stack
    }

    // Create new block on the stack
    const stackedBlock: Block = {
      x: newX,
      y: newZ,
      width: newWidth,
      depth: newDepth,
      color: COLORS[game.blocks.length % COLORS.length],
      direction: currentBlock.direction,
    };

    // Create next moving block
    const nextDirection = currentBlock.direction === 'x' ? 'z' : 'x';
    const nextY = lastBlock.y + BLOCK_HEIGHT;

    let nextBlock: Block;
    if (nextDirection === 'x') {
      nextBlock = {
        x: newX - 150,
        y: newZ,
        width: newWidth,
        depth: newDepth,
        color: COLORS[(game.blocks.length + 1) % COLORS.length],
        direction: nextDirection,
      };
    } else {
      nextBlock = {
        x: newX,
        y: newZ - 150,
        width: newWidth,
        depth: newDepth,
        color: COLORS[(game.blocks.length + 1) % COLORS.length],
        direction: nextDirection,
      };
    }

    // Update game state
    setGame(prev => ({
      ...prev,
      blocks: [...prev.blocks, stackedBlock],
      currentBlock: nextBlock,
      score: prev.score + scoreGain,
      perfectCount: isPerfect ? prev.perfectCount + 1 : 0,
      direction: prev.direction * -1,
      speed: Math.min(MAX_SPEED, prev.speed + SPEED_INCREMENT),
    }));
  }, [game, gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' || !game.currentBlock) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Update current block position
      if (game.currentBlock && !game.gameOver) {
        setGame(prev => {
          if (!prev.currentBlock) return prev;

          let newX = prev.currentBlock.x;
          let newY = prev.currentBlock.y;

          if (prev.currentBlock.direction === 'x') {
            newX += prev.speed * prev.direction;
            // Bounce at edges
            if (newX < -200 || newX > 200) {
              return { ...prev, direction: prev.direction * -1 };
            }
          } else {
            newY += prev.speed * prev.direction;
            // Bounce at edges
            if (newY < -200 || newY > 200) {
              return { ...prev, direction: prev.direction * -1 };
            }
          }

          return {
            ...prev,
            currentBlock: { ...prev.currentBlock, x: newX, y: newY },
          };
        });
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(1, '#1a1f3a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set up isometric view
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.7;
      const scale = 1.5;

      // Draw blocks from bottom to top
      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw stacked blocks
      game.blocks.forEach((block, index) => {
        drawBlock(ctx, block, index * BLOCK_HEIGHT, scale);
      });

      // Draw current moving block
      if (game.currentBlock) {
        drawBlock(ctx, game.currentBlock, game.blocks.length * BLOCK_HEIGHT, scale, true);
      }

      ctx.restore();

      // Draw UI
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${game.score}`, 20, 40);
      ctx.fillText(`Height: ${game.blocks.length}`, 20, 70);

      if (game.perfectCount > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`Perfect x${game.perfectCount}! 🔥`, 20, 100);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [game, gameState]);

  // Draw isometric block
  const drawBlock = (
    ctx: CanvasRenderingContext2D,
    block: Block,
    height: number,
    scale: number,
    isMoving = false
  ) => {
    const isoX = (block.x - block.y) * 0.6 * scale;
    const isoY = (block.x + block.y) * 0.3 * scale - height * scale;

    const w = block.width * 0.6 * scale;
    const d = block.depth * 0.6 * scale;
    const h = BLOCK_HEIGHT * scale;

    // Top face
    ctx.beginPath();
    ctx.moveTo(isoX, isoY);
    ctx.lineTo(isoX + w, isoY - w * 0.5);
    ctx.lineTo(isoX + w + d, isoY - w * 0.5 + d * 0.5);
    ctx.lineTo(isoX + d, isoY + d * 0.5);
    ctx.closePath();
    ctx.fillStyle = isMoving ? '#FFFFFF' : block.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Left face
    ctx.beginPath();
    ctx.moveTo(isoX, isoY);
    ctx.lineTo(isoX, isoY + h);
    ctx.lineTo(isoX + d, isoY + h + d * 0.5);
    ctx.lineTo(isoX + d, isoY + d * 0.5);
    ctx.closePath();
    ctx.fillStyle = shadeColor(isMoving ? '#FFFFFF' : block.color, -20);
    ctx.fill();
    ctx.stroke();

    // Right face
    ctx.beginPath();
    ctx.moveTo(isoX + w, isoY - w * 0.5);
    ctx.lineTo(isoX + w, isoY - w * 0.5 + h);
    ctx.lineTo(isoX + w + d, isoY - w * 0.5 + h + d * 0.5);
    ctx.lineTo(isoX + w + d, isoY - w * 0.5 + d * 0.5);
    ctx.closePath();
    ctx.fillStyle = shadeColor(isMoving ? '#FFFFFF' : block.color, -40);
    ctx.fill();
    ctx.stroke();
  };

  // Shade color helper
  const shadeColor = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  };

  // Timer update
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTimerUpdateRef.current) / 1000;

      if (elapsed >= 1) {
        setGameTimer(prev => {
          const newTime = Math.max(0, prev - Math.floor(elapsed));
          if (newTime === 0) {
            setGame(g => ({ ...g, gameOver: true }));
          }
          return newTime;
        });
        lastTimerUpdateRef.current = now;
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [gameState]);

  // Handle game over
  useEffect(() => {
    if (game.gameOver && gameState === 'playing') {
      setGameState('ended');
      const accuracy = Math.min(100, (game.score / (game.blocks.length * 25)) * 100);
      setTimeout(() => {
        onGameEnd({
          score: game.score,
          accuracy: Math.round(accuracy),
        });
      }, 1500);
    }
  }, [game.gameOver, gameState, game.score, game.blocks.length, onGameEnd]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'ready') {
          startCountdown();
        } else if (gameState === 'playing') {
          handleStack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, handleStack, startCountdown]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-yellow-400">💰 CASH STACK</h2>
            <button
              onClick={onExit}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
            >
              Exit
            </button>
          </div>
          {gameState === 'playing' && (
            <div className="mt-2 text-white text-xl font-bold text-center">
              ⏱️ {Math.floor(gameTimer / 60)}:{(gameTimer % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-pointer"
          onClick={handleStack}
        />

        {/* Overlays */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center p-8 bg-gray-900/90 rounded-2xl border-4 border-yellow-500">
              <h1 className="text-5xl font-bold text-yellow-400 mb-4">💰 CASH STACK</h1>
              <p className="text-white text-xl mb-6">Stack blocks perfectly to build the tallest tower!</p>
              <div className="text-left text-white mb-6 space-y-2">
                <p>🎯 <strong>Perfect Stack:</strong> 25 points bonus</p>
                <p>📏 <strong>Good Stack:</strong> 10 points</p>
                <p>❌ <strong>Miss:</strong> Game Over!</p>
                <p>⏱️ <strong>Time Limit:</strong> 60 seconds</p>
              </div>
              <button
                onClick={startCountdown}
                className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xl rounded-xl hover:scale-105 transform transition-all shadow-lg"
              >
                START GAME
              </button>
              <p className="text-gray-400 mt-4 text-sm">Click or press SPACE to stack</p>
            </div>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-9xl font-bold text-yellow-400 animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {gameState === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-8 bg-gray-900/95 rounded-2xl border-4 border-yellow-500">
              <h2 className="text-4xl font-bold text-yellow-400 mb-4">
                {game.score > 200 ? '🏆 AMAZING!' : game.score > 100 ? '🎉 GREAT JOB!' : '💰 NICE TRY!'}
              </h2>
              <div className="text-white text-2xl space-y-2">
                <p>Final Score: <span className="text-yellow-400 font-bold">{game.score}</span></p>
                <p>Tower Height: <span className="text-green-400 font-bold">{game.blocks.length}</span></p>
              </div>
              <p className="text-gray-400 mt-4">Submitting your score...</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full">
            <p className="text-white font-semibold text-center">
              Click or Press SPACE to stack blocks
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
