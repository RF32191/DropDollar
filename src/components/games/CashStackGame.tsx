'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CASH STACK - Explosive Alignment Game
 * ALL blocks are green with $ signs
 * Align $ signs perfectly = EXPLOSION + RESET + BONUS
 * Colors are just visual variety
 * Goal: Get highest score in 60 seconds by exploding stacks!
 */

interface Block {
  x: number;
  y: number;
  width: number;
  depth: number;
  color: string;
  direction: 'x' | 'z';
  dollarX: number; // Dollar sign X offset
  dollarZ: number; // Dollar sign Z offset
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
  explosions: number;
  explosionEffects: Explosion[];
  particles: Particle[];
  gameOver: boolean;
  gameStarted: boolean;
  direction: number;
  speed: number;
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
const INITIAL_SPEED = 0.05; // EXTREMELY SLOW - like Stack game
const SPEED_INCREMENT = 0.003; // Very minimal acceleration
const MAX_SPEED = 0.5; // Very low max
const DOLLAR_ALIGN_THRESHOLD = 12; // Forgiving alignment
const STACK_EXPLOSION_BONUS = 300; // HUGE BONUS for explosions!
const NORMAL_STACK_POINTS = 3; // Small points for normal stacks
const EXPLOSION_ANIMATION_TIME = 400; // Very fast reset (ms)

// All blocks are green (single color)
const BLOCK_COLOR = '#32CD32'; // Bright green

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
    explosions: 0,
    explosionEffects: [],
    particles: [],
    gameOver: false,
    gameStarted: false,
    direction: 1,
    speed: INITIAL_SPEED,
  });

  const gameStartTimeRef = useRef<number>(0);

  const createBlock = (index: number, lastBlock?: Block): Block => {
    const width = lastBlock ? lastBlock.width : INITIAL_WIDTH;
    const depth = lastBlock ? lastBlock.depth : INITIAL_DEPTH;
    const direction = lastBlock ? (lastBlock.direction === 'x' ? 'z' : 'x') : 'x';
    
    // Random dollar sign position ANYWHERE on the block (full 80% area)
    // This makes each block unique and creates alignment challenge
    const dollarX = (Math.random() - 0.5) * width * 0.8;
    const dollarZ = (Math.random() - 0.5) * depth * 0.8;

    return {
      x: direction === 'x' ? -150 : (lastBlock?.x || 0),
      y: direction === 'z' ? -150 : (lastBlock?.y || 0),
      width,
      depth,
      color: BLOCK_COLOR, // All blocks are green
      direction,
      dollarX,
      dollarZ,
    };
  };

  const initGame = useCallback(() => {
    const baseBlock: Block = {
      x: 0,
      y: 0,
      width: INITIAL_WIDTH,
      depth: INITIAL_DEPTH,
      color: BLOCK_COLOR,
      direction: 'x',
      dollarX: (Math.random() - 0.5) * INITIAL_WIDTH * 0.8, // Random $ position on base too
      dollarZ: (Math.random() - 0.5) * INITIAL_DEPTH * 0.8,
    };

    setGame({
      blocks: [baseBlock],
      currentBlock: createBlock(1, baseBlock),
      score: 0,
      explosions: 0,
      explosionEffects: [],
      particles: [],
      gameOver: false,
      gameStarted: true,
      direction: 1,
      speed: INITIAL_SPEED,
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
          gameStartTimeRef.current = Date.now(); // Initialize speed timer
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initGame]);

  const createExplosion = (x: number, y: number, blockCount: number) => {
    const explosion: Explosion = {
      x,
      y,
      radius: 0,
      life: 50,
      maxLife: 50,
    };

    // Massive particle explosion
    const newParticles: Particle[] = [];
    const particleCount = 80 + (blockCount * 10);
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#00CED1', '#FF69B4'];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 4 + Math.random() * 6;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 50 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setGame(prev => ({
      ...prev,
      explosionEffects: [...prev.explosionEffects, explosion],
      particles: [...prev.particles, ...newParticles],
    }));
  };

  const explodeStack = (blockCount: number) => {
    const explosionBonus = blockCount * STACK_EXPLOSION_BONUS;
    
    createExplosion(0, 0, blockCount);

    // Quick reset after short animation delay
    setTimeout(() => {
      const baseBlock: Block = {
        x: 0,
        y: 0,
        width: INITIAL_WIDTH,
        depth: INITIAL_DEPTH,
        color: BLOCK_COLOR,
        direction: 'x',
        dollarX: (Math.random() - 0.5) * INITIAL_WIDTH * 0.8, // New random $ position
        dollarZ: (Math.random() - 0.5) * INITIAL_DEPTH * 0.8,
      };

      setGame(prev => ({
        ...prev,
        blocks: [baseBlock],
        currentBlock: createBlock(1, baseBlock),
        score: prev.score + explosionBonus,
        explosions: prev.explosions + 1,
        direction: 1,
      }));
    }, EXPLOSION_ANIMATION_TIME);
  };

  const handleStack = useCallback(() => {
    if (!game.currentBlock || game.gameOver || gameState !== 'playing') return;

    const lastBlock = game.blocks[game.blocks.length - 1];
    const currentBlock = game.currentBlock;

    let newWidth = currentBlock.width;
    let newDepth = currentBlock.depth;
    let newX = currentBlock.x;
    let newZ = currentBlock.y;

    // Check dollar sign alignment
    const dollarAlignX = Math.abs(lastBlock.dollarX - currentBlock.dollarX);
    const dollarAlignZ = Math.abs(lastBlock.dollarZ - currentBlock.dollarZ);
    const isDollarAligned = dollarAlignX < DOLLAR_ALIGN_THRESHOLD && dollarAlignZ < DOLLAR_ALIGN_THRESHOLD;

    if (isDollarAligned) {
      // 💥 EXPLOSION! $ signs aligned!
      explodeStack(game.blocks.length);
      return;
    }

    // Calculate overlap for normal stacking
    if (currentBlock.direction === 'x') {
      const overhangLeft = lastBlock.x - currentBlock.x;
      const overhangRight = (currentBlock.x + currentBlock.width) - (lastBlock.x + lastBlock.width);

      if (overhangLeft >= currentBlock.width || overhangRight >= currentBlock.width) {
        setGame(prev => ({ ...prev, gameOver: true }));
        return;
      }

      newX = Math.max(lastBlock.x, currentBlock.x);
      const rightEdge = Math.min(lastBlock.x + lastBlock.width, currentBlock.x + currentBlock.width);
      newWidth = rightEdge - newX;
    } else {
      const overhangFront = lastBlock.y - currentBlock.y;
      const overhangBack = (currentBlock.y + currentBlock.depth) - (lastBlock.y + lastBlock.depth);

      if (overhangFront >= currentBlock.depth || overhangBack >= currentBlock.depth) {
        setGame(prev => ({ ...prev, gameOver: true }));
        return;
      }

      newZ = Math.max(lastBlock.y, currentBlock.y);
      const backEdge = Math.min(lastBlock.y + lastBlock.depth, currentBlock.y + currentBlock.depth);
      newDepth = backEdge - newZ;
    }

    if (newWidth < 10 || newDepth < 10) {
      setGame(prev => ({ ...prev, gameOver: true }));
      return;
    }

    // Small points for normal stacking (explosion gives much more!)
    const scoreGain = NORMAL_STACK_POINTS + Math.floor(game.blocks.length / 2);

    const stackedBlock: Block = {
      x: newX,
      y: newZ,
      width: newWidth,
      depth: newDepth,
      color: BLOCK_COLOR, // All blocks are green
      direction: currentBlock.direction,
      dollarX: currentBlock.dollarX,
      dollarZ: currentBlock.dollarZ,
    };

    const nextBlock = createBlock(game.blocks.length + 1, stackedBlock);

    setGame(prev => ({
      ...prev,
      blocks: [...prev.blocks, stackedBlock],
      currentBlock: nextBlock,
      score: prev.score + scoreGain,
      direction: prev.direction * -1,
      speed: prev.speed, // Speed increases with time, not stacks
    }));
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

          // Calculate time-based speed increase
          const elapsedTime = (Date.now() - gameStartTimeRef.current) / 1000; // seconds
          const currentSpeed = Math.min(MAX_SPEED, INITIAL_SPEED + (elapsedTime * SPEED_INCREMENT));

          let newX = prev.currentBlock.x;
          let newY = prev.currentBlock.y;

          if (prev.currentBlock.direction === 'x') {
            newX += currentSpeed * prev.direction;
            // Smoother boundaries
            if (newX < -180 || newX > 180) {
              return { ...prev, direction: prev.direction * -1 };
            }
          } else {
            newY += currentSpeed * prev.direction;
            // Smoother boundaries
            if (newY < -180 || newY > 180) {
              return { ...prev, direction: prev.direction * -1 };
            }
          }

          const updatedExplosions = prev.explosionEffects
            .map(exp => ({ ...exp, radius: exp.radius + 4, life: exp.life - 1 }))
            .filter(exp => exp.life > 0);

          const updatedParticles = prev.particles
            .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.2, life: p.life - 1 }))
            .filter(p => p.life > 0);

          return {
            ...prev,
            currentBlock: { ...prev.currentBlock, x: newX, y: newY },
            explosionEffects: updatedExplosions,
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

      // Draw stacked blocks
      game.blocks.forEach((block, index) => {
        drawBlock(ctx, block, index * BLOCK_HEIGHT, scale, false);
      });

      // Draw current moving block
      if (game.currentBlock) {
        drawBlock(ctx, game.currentBlock, game.blocks.length * BLOCK_HEIGHT, scale, true);
      }

      // Draw explosions
      game.explosionEffects.forEach(exp => {
        const alpha = exp.life / exp.maxLife;
        
        // Outer ring
        ctx.beginPath();
        ctx.arc(exp.x, exp.y - game.blocks.length * BLOCK_HEIGHT * scale, exp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.lineWidth = 5;
        ctx.stroke();
        
        // Middle ring
        ctx.beginPath();
        ctx.arc(exp.x, exp.y - game.blocks.length * BLOCK_HEIGHT * scale, exp.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 140, 0, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Inner ring
        ctx.beginPath();
        ctx.arc(exp.x, exp.y - game.blocks.length * BLOCK_HEIGHT * scale, exp.radius * 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 69, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // Draw particles
      game.particles.forEach(p => {
        const alpha = p.life / 90;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(p.x, p.y - game.blocks.length * BLOCK_HEIGHT * scale, 5, 5);
      });

      ctx.restore();

      // HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${game.score}`, 20, 45);
      
      ctx.fillStyle = '#32CD32';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Tower: ${game.blocks.length}`, 20, 80);
      
      if (game.explosions > 0) {
        ctx.fillStyle = '#FF6347';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(`💥 Explosions: ${game.explosions}`, 20, 115);
      }

      // Dollar alignment hint
      if (game.currentBlock) {
        const lastBlock = game.blocks[game.blocks.length - 1];
        const dollarAlignX = Math.abs(lastBlock.dollarX - game.currentBlock.dollarX);
        const dollarAlignZ = Math.abs(lastBlock.dollarZ - game.currentBlock.dollarZ);
        const alignment = Math.max(dollarAlignX, dollarAlignZ);
        
        if (alignment < 15) {
          const color = alignment < DOLLAR_ALIGN_THRESHOLD ? '#FFD700' : '#FFA500';
          ctx.fillStyle = color;
          ctx.font = 'bold 22px Arial';
          ctx.fillText(`$ Align: ${alignment.toFixed(1)}px`, 20, 150);
          
          if (alignment < DOLLAR_ALIGN_THRESHOLD) {
            ctx.font = 'bold 26px Arial';
            ctx.fillText(`💥 READY TO EXPLODE!`, 20, 180);
          }
        }
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
    isMoving: boolean
  ) => {
    const isoX = (block.x - block.y) * 0.6 * scale;
    const isoY = (block.x + block.y) * 0.3 * scale - height * scale;

    const w = block.width * 0.6 * scale;
    const d = block.depth * 0.6 * scale;
    const h = BLOCK_HEIGHT * scale;

    // Top face (stack of bills appearance)
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

    // Draw horizontal lines to simulate stacked bills
    if (!isMoving) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      const lineCount = 5;
      for (let i = 1; i < lineCount; i++) {
        const ratio = i / lineCount;
        ctx.beginPath();
        ctx.moveTo(isoX + w * ratio, isoY - w * ratio * 0.5);
        ctx.lineTo(isoX + w * ratio + d, isoY - w * ratio * 0.5 + d * 0.5);
        ctx.stroke();
      }

      // Draw $ sign with yellow circle around it
      const dollarIsoX = (block.dollarX - block.dollarZ) * 0.6 * scale;
      const dollarIsoY = (block.dollarX + block.dollarZ) * 0.3 * scale;
      const dollarCenterX = isoX + w / 2 + d / 2 + dollarIsoX;
      const dollarCenterY = isoY - w * 0.25 + d * 0.25 + dollarIsoY;
      
      ctx.save();
      
      // Draw yellow circle background
      ctx.beginPath();
      ctx.arc(dollarCenterX, dollarCenterY, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw inner glow
      ctx.beginPath();
      ctx.arc(dollarCenterX, dollarCenterY, 13, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFED4E';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw $ sign
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 26px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', dollarCenterX, dollarCenterY);
      
      ctx.restore();
    }

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
      const accuracy = Math.min(100, (game.explosions / Math.max(1, game.blocks.length / 10)) * 100);
      setTimeout(() => {
        onGameEnd({
          score: game.score,
          accuracy: Math.round(accuracy),
        });
      }, 1500);
    }
  }, [game.gameOver, gameState, game.score, game.explosions, game.blocks.length, onGameEnd]);

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
            <h2 className="text-2xl font-bold text-green-400">💰 CASH STACK</h2>
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
            <div className="text-center p-8 bg-gray-900/90 rounded-2xl border-4 border-green-500 max-w-2xl">
              <h1 className="text-5xl font-bold text-green-400 mb-4">💰 CASH STACK</h1>
              <p className="text-white text-2xl mb-6 font-bold">EXPLOSIVE ALIGNMENT GAME!</p>
              <div className="text-left text-white mb-6 space-y-3 text-lg">
                <p>💚 <strong>All blocks are green</strong> with $ signs</p>
                <p>💲 <strong>Each $ sign</strong> appears at a random position</p>
                <p>💥 <strong>ALIGN $ SIGNS PERFECTLY</strong> = EXPLOSION + RESET!</p>
                <p>🎯 <strong>Explosion Bonus:</strong> 100 points × tower height</p>
                <p>📊 <strong>Stack Bonus:</strong> 10 + (2 × height) per block</p>
                <p>🐌 <strong>SUPER SLOW</strong> for precision alignment!</p>
                <p>🎨 <strong>Colors are cosmetic</strong> - no score difference</p>
                <p>⏱️ <strong>Goal:</strong> Max explosions in 60 seconds!</p>
              </div>
              <button
                onClick={startCountdown}
                className="px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-black font-bold text-xl rounded-xl hover:scale-105 transform transition-all shadow-lg"
              >
                START GAME
              </button>
              <p className="text-gray-400 mt-4 text-sm">Click or SPACE to stack | Watch the $ alignment indicator!</p>
            </div>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-9xl font-bold text-green-400 animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {gameState === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-8 bg-gray-900/95 rounded-2xl border-4 border-green-500">
              <h2 className="text-4xl font-bold text-green-400 mb-4">
                {game.explosions > 5 ? '🏆 EXPLOSIVE MASTER!' : game.explosions > 2 ? '🎉 GREAT EXPLOSIONS!' : '💰 NICE TRY!'}
              </h2>
              <div className="text-white text-2xl space-y-2">
                <p>Final Score: <span className="text-green-400 font-bold">{game.score}</span></p>
                <p>💥 Explosions: <span className="text-orange-400 font-bold">{game.explosions}</span></p>
                <p>Max Tower: <span className="text-blue-400 font-bold">{game.blocks.length}</span></p>
              </div>
              <p className="text-gray-400 mt-4">Submitting your score...</p>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full">
            <p className="text-white font-semibold text-center">
              💲 Align the $ signs to EXPLODE the stack! | Watch the alignment indicator!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
