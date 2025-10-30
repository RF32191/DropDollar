'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CASH STACK - Progressive Stacking Game
 * Green ($) → Bronze → Silver → Gold → Platinum progression
 * Coins on sweet spots = EXPLOSIONS + bonus points!
 * Slower, more skill-based gameplay
 */

interface Block {
  x: number;
  y: number;
  width: number;
  depth: number;
  color: string;
  type: 'green' | 'bronze' | 'silver' | 'gold' | 'platinum';
  direction: 'x' | 'z';
  hasCoin: boolean;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  blocks: Block[];
  currentBlock: Block | null;
  score: number;
  perfectCount: number;
  explosionCount: number;
  explosions: Explosion[];
  particles: Particle[];
  gameOver: boolean;
  gameStarted: boolean;
  direction: number;
  speed: number;
  blockLevel: number;
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
const INITIAL_SPEED = 0.6; // VERY SLOW
const SPEED_INCREMENT = 0.03; // Minimal acceleration
const MAX_SPEED = 2; // Much lower max
const PERFECT_THRESHOLD = 3;
const COIN_CHANCE = 0.3; // 30% chance for coin
const GREEN_BAR_CHANCE = 0.25; // 25% chance for green $ bar

// Material colors
const MATERIALS = {
  green: { color: '#32CD32', name: 'Cash', value: 50 },
  bronze: { color: '#CD7F32', name: 'Bronze', value: 25 },
  silver: { color: '#C0C0C0', name: 'Silver', value: 50 },
  gold: { color: '#FFD700', name: 'Gold', value: 100 },
  platinum: { color: '#E5E4E2', name: 'Platinum', value: 200 },
};

type MaterialType = keyof typeof MATERIALS;

export default function CashStackGame({
  onGameEnd,
  onExit,
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
    explosionCount: 0,
    explosions: [],
    particles: [],
    gameOver: false,
    gameStarted: false,
    direction: 1,
    speed: INITIAL_SPEED,
    blockLevel: 0,
  });

  const getBlockType = (level: number): MaterialType => {
    if (level < 5) return 'green';
    if (level < 10) return 'bronze';
    if (level < 15) return 'silver';
    if (level < 20) return 'gold';
    return 'platinum';
  };

  const initGame = useCallback(() => {
    const baseBlock: Block = {
      x: 0,
      y: 0,
      width: INITIAL_WIDTH,
      depth: INITIAL_DEPTH,
      color: MATERIALS.green.color,
      type: 'green',
      direction: 'x',
      hasCoin: false,
    };

    const firstBlock: Block = {
      x: -150,
      y: BLOCK_HEIGHT,
      width: INITIAL_WIDTH,
      depth: INITIAL_DEPTH,
      color: MATERIALS.green.color,
      type: 'green',
      direction: 'x',
      hasCoin: Math.random() < COIN_CHANCE,
    };

    setGame({
      blocks: [baseBlock],
      currentBlock: firstBlock,
      score: 0,
      perfectCount: 0,
      explosionCount: 0,
      explosions: [],
      particles: [],
      gameOver: false,
      gameStarted: true,
      direction: 1,
      speed: INITIAL_SPEED,
      blockLevel: 0,
    });
  }, []);

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

  const createExplosion = (x: number, y: number, type: 'coin' | 'fall') => {
    const explosion: Explosion = {
      x,
      y,
      radius: 0,
      life: 40,
      maxLife: 40,
    };

    const newParticles: Particle[] = [];
    const particleCount = type === 'coin' ? 60 : 30;
    const colors = type === 'coin' 
      ? ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#00CED1']
      : ['#888', '#666', '#999'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = type === 'coin' ? 3 + Math.random() * 4 : 2 + Math.random() * 2;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 30,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setGame(prev => ({
      ...prev,
      explosions: [...prev.explosions, explosion],
      particles: [...prev.particles, ...newParticles],
      explosionCount: type === 'coin' ? prev.explosionCount + 1 : prev.explosionCount,
    }));
  };

  const handleStack = useCallback(() => {
    if (!game.currentBlock || game.gameOver || gameState !== 'playing') return;

    const lastBlock = game.blocks[game.blocks.length - 1];
    const currentBlock = game.currentBlock;

    let newWidth = currentBlock.width;
    let newDepth = currentBlock.depth;
    let newX = currentBlock.x;
    let newZ = currentBlock.y;

    let isPerfect = false;
    let isGood = false;
    let hitCoin = false;

    if (currentBlock.direction === 'x') {
      const overhangLeft = lastBlock.x - currentBlock.x;
      const overhangRight = (currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width);

      if (overhangLeft >= currentBlock.width || overhangRight >= currentBlock.width) {
        setGame(prev => ({ ...prev, gameOver: true }));
        return;
      }

      if (Math.abs(overhangLeft) <= PERFECT_THRESHOLD && Math.abs(overhangRight) <= PERFECT_THRESHOLD) {
        isPerfect = true;
        newX = lastBlock.x;
        newWidth = lastBlock.width;
      } else {
        isGood = true;
        if (overhangLeft > 0) {
          newX = lastBlock.x;
          newWidth = currentBlock.width - overhangLeft;
        }
        if (overhangRight > 0) {
          newWidth = newWidth - overhangRight;
        }
      }
    } else {
      const overhangFront = lastBlock.y - currentBlock.y;
      const overhangBack = (currentBlock.y + currentBlock.depth) - (lastBlock.y + lastBlock.depth);

      if (overhangFront >= currentBlock.depth || overhangBack >= currentBlock.depth) {
        setGame(prev => ({ ...prev, gameOver: true }));
        return;
      }

      if (Math.abs(overhangFront) <= PERFECT_THRESHOLD && Math.abs(overhangBack) <= PERFECT_THRESHOLD) {
        isPerfect = true;
        newZ = lastBlock.y;
        newDepth = lastBlock.depth;
      } else {
        isGood = true;
        if (overhangFront > 0) {
          newZ = lastBlock.y;
          newDepth = currentBlock.depth - overhangFront;
        }
        if (overhangBack > 0) {
          newDepth = newDepth - overhangBack;
        }
      }
    }

    if (newWidth < 10 || newDepth < 10) {
      setGame(prev => ({ ...prev, gameOver: true }));
      return;
    }

    // Calculate score
    let scoreGain = 10;
    const materialValue = MATERIALS[currentBlock.type].value;

    if (isPerfect) {
      scoreGain = 50 + materialValue;
      if (currentBlock.hasCoin) {
        hitCoin = true;
        scoreGain = 200 + materialValue; // HUGE bonus!
      }
    } else if (isGood) {
      scoreGain = 20 + materialValue / 2;
      // Good stacks make bars fall (create falling particle effect)
      createExplosion(0, game.blocks.length * BLOCK_HEIGHT, 'fall');
    }

    const newBlockLevel = game.blockLevel + 1;
    const blockType = getBlockType(newBlockLevel);

    const stackedBlock: Block = {
      x: newX,
      y: newZ,
      width: newWidth,
      depth: newDepth,
      color: MATERIALS[blockType].color,
      type: blockType,
      direction: currentBlock.direction,
      hasCoin: false,
    };

    const nextDirection = currentBlock.direction === 'x' ? 'z' : 'x';
    const nextBlockType = getBlockType(newBlockLevel + 1);
    
    // Chance for green $ bar OR coin
    const hasGreenBar = Math.random() < GREEN_BAR_CHANCE;
    const hasCoin = !hasGreenBar && Math.random() < COIN_CHANCE;

    let nextBlock: Block;
    if (nextDirection === 'x') {
      nextBlock = {
        x: newX - 150,
        y: newZ,
        width: newWidth,
        depth: newDepth,
        color: hasGreenBar ? MATERIALS.green.color : MATERIALS[nextBlockType].color,
        type: hasGreenBar ? 'green' : nextBlockType,
        direction: nextDirection,
        hasCoin: hasCoin,
      };
    } else {
      nextBlock = {
        x: newX,
        y: newZ - 150,
        width: newWidth,
        depth: newDepth,
        color: hasGreenBar ? MATERIALS.green.color : MATERIALS[nextBlockType].color,
        type: hasGreenBar ? 'green' : nextBlockType,
        direction: nextDirection,
        hasCoin: hasCoin,
      };
    }

    setGame(prev => ({
      ...prev,
      blocks: [...prev.blocks, stackedBlock],
      currentBlock: nextBlock,
      score: prev.score + scoreGain,
      perfectCount: isPerfect ? prev.perfectCount + 1 : 0,
      direction: prev.direction * -1,
      speed: Math.min(MAX_SPEED, prev.speed + SPEED_INCREMENT),
      blockLevel: newBlockLevel,
    }));

    if (hitCoin) {
      createExplosion(0, game.blocks.length * BLOCK_HEIGHT, 'coin');
    }
  }, [game, gameState]);

  useEffect(() => {
    if (gameState !== 'playing' || !game.currentBlock) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (game.currentBlock && !game.gameOver) {
        setGame(prev => {
          if (!prev.currentBlock) return prev;

          let newX = prev.currentBlock.x;
          let newY = prev.currentBlock.y;

          if (prev.currentBlock.direction === 'x') {
            newX += prev.speed * prev.direction;
            if (newX < -200 || newX > 200) {
              return { ...prev, direction: prev.direction * -1 };
            }
          } else {
            newY += prev.speed * prev.direction;
            if (newY < -200 || newY > 200) {
              return { ...prev, direction: prev.direction * -1 };
            }
          }

          const updatedExplosions = prev.explosions
            .map(exp => ({ ...exp, radius: exp.radius + 3, life: exp.life - 1 }))
            .filter(exp => exp.life > 0);

          const updatedParticles = prev.particles
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 1 }))
            .filter(p => p.life > 0);

          return {
            ...prev,
            currentBlock: { ...prev.currentBlock, x: newX, y: newY },
            explosions: updatedExplosions,
            particles: updatedParticles,
          };
        });
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(1, '#1a1f3a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.7;
      const scale = 1.5;

      ctx.save();
      ctx.translate(centerX, centerY);

      game.blocks.forEach((block, index) => {
        drawBlock(ctx, block, index * BLOCK_HEIGHT, scale);
      });

      if (game.currentBlock) {
        drawBlock(ctx, game.currentBlock, game.blocks.length * BLOCK_HEIGHT, scale, true);
        
        if (game.currentBlock.hasCoin) {
          drawCoin(ctx, game.currentBlock, game.blocks.length * BLOCK_HEIGHT, scale);
        }
      }

      game.explosions.forEach(exp => {
        const alpha = exp.life / exp.maxLife;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y - game.blocks.length * BLOCK_HEIGHT * scale, exp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(exp.x, exp.y - game.blocks.length * BLOCK_HEIGHT * scale, exp.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 140, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      game.particles.forEach(p => {
        const alpha = p.life / 70;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(p.x, p.y - game.blocks.length * BLOCK_HEIGHT * scale, 4, 4);
      });

      ctx.restore();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${game.score}`, 20, 40);
      
      const currentType = game.currentBlock?.type || 'green';
      ctx.fillStyle = MATERIALS[currentType].color;
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${MATERIALS[currentType].name} Level`, 20, 70);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`Height: ${game.blocks.length}`, 20, 95);

      if (game.perfectCount > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Perfect x${game.perfectCount}! 🔥`, 20, 125);
      }

      if (game.explosionCount > 0) {
        ctx.fillStyle = '#FF6347';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`💥 Explosions: ${game.explosionCount}`, 20, 155);
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

    // Draw $ sign on green bars
    if (block.type === 'green' && !isMoving) {
      ctx.fillStyle = '#000';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', isoX + w / 2 + d / 2, isoY - w * 0.25 + d * 0.25);
    }

    ctx.beginPath();
    ctx.moveTo(isoX, isoY);
    ctx.lineTo(isoX, isoY + h);
    ctx.lineTo(isoX + d, isoY + h + d * 0.5);
    ctx.lineTo(isoX + d, isoY + d * 0.5);
    ctx.closePath();
    ctx.fillStyle = shadeColor(isMoving ? '#FFFFFF' : block.color, -20);
    ctx.fill();
    ctx.stroke();

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

  const drawCoin = (
    ctx: CanvasRenderingContext2D,
    block: Block,
    height: number,
    scale: number
  ) => {
    const isoX = (block.x - block.y) * 0.6 * scale;
    const isoY = (block.x + block.y) * 0.3 * scale - height * scale;

    const centerX = isoX + (block.width * 0.6 * scale) / 2;
    const centerY = isoY - 25;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
    ctx.shadowBlur = 15;
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Inner detail
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF8C00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', centerX, centerY);
    ctx.restore();
  };

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

  useEffect(() => {
    if (game.gameOver && gameState === 'playing') {
      setGameState('ended');
      const accuracy = Math.min(100, (game.score / (game.blocks.length * 50)) * 100);
      setTimeout(() => {
        onGameEnd({
          score: game.score,
          accuracy: Math.round(accuracy),
        });
      }, 1500);
    }
  }, [game.gameOver, gameState, game.score, game.blocks.length, onGameEnd]);

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

        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-pointer"
          onClick={handleStack}
        />

        {gameState === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center p-8 bg-gray-900/90 rounded-2xl border-4 border-yellow-500 max-w-2xl">
              <h1 className="text-5xl font-bold text-yellow-400 mb-4">💰 CASH STACK</h1>
              <p className="text-white text-xl mb-6">Build the perfect tower through material progression!</p>
              <div className="text-left text-white mb-6 space-y-2 text-lg">
                <p>💚 <strong>Green ($) Bars:</strong> Special cash blocks - appear randomly!</p>
                <p>📊 <strong>Progression:</strong> Green → Bronze → Silver → Gold → Platinum</p>
                <p>⭐ <strong>Perfect Stack:</strong> 50+ points (bonus for higher materials)</p>
                <p>💰 <strong>Coin Perfect:</strong> 200+ points + 💥 EXPLOSION!</p>
                <p>📏 <strong>Good Stack:</strong> Bars fall + bonus points</p>
                <p>⏱️ <strong>Goal:</strong> Highest score in 60 seconds!</p>
              </div>
              <button
                onClick={startCountdown}
                className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xl rounded-xl hover:scale-105 transform transition-all shadow-lg"
              >
                START GAME
              </button>
              <p className="text-gray-400 mt-4 text-sm">Click or press SPACE to stack | MUCH SLOWER for precision!</p>
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
                {game.score > 500 ? '🏆 LEGENDARY!' : game.score > 300 ? '🎉 AMAZING!' : '💰 NICE TRY!'}
              </h2>
              <div className="text-white text-2xl space-y-2">
                <p>Final Score: <span className="text-yellow-400 font-bold">{game.score}</span></p>
                <p>Tower Height: <span className="text-green-400 font-bold">{game.blocks.length}</span></p>
                {game.explosionCount > 0 && (
                  <p>💥 Explosions: <span className="text-orange-400 font-bold">{game.explosionCount}</span></p>
                )}
              </div>
              <p className="text-gray-400 mt-4">Submitting your score...</p>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full">
            <p className="text-white font-semibold text-center">
              Click or SPACE to stack | 💚 Green $ bars! | 💰 Coins explode on perfect stacks!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
