'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * BLADE BOUNCE - Protect the sword with 3 hearts
 * Red dots around sword are DEATH ZONES - if hit, lose 1 heart
 * Rest of sword DESTROYS enemies
 * Survive and rack up points!
 */

interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: 'small' | 'medium' | 'large';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface DeathZone {
  x: number;
  y: number;
  radius: number;
}

interface BladeBounceGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SWORD_X = CANVAS_WIDTH / 3;
const SWORD_WIDTH = 80;
const SWORD_HEIGHT = 160;
const DEATH_ZONE_RADIUS = 8;

export default function BladeBounceGame({ onGameEnd, onExit }: BladeBounceGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [gameTimer, setGameTimer] = useState(60);
  const lastTimerUpdateRef = useRef<number>(0);
  const [swordImage, setSwordImage] = useState<HTMLImageElement | null>(null);
  const nextEnemyIdRef = useRef(1);

  const [game, setGame] = useState({
    score: 0,
    hearts: 3,
    swordY: CANVAS_HEIGHT / 2,
    swordAngle: 0,
    mouseY: CANVAS_HEIGHT / 2,
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    lastSpawn: 0,
    spawnInterval: 1500,
    gameOver: false,
  });

  // Load sword image
  useEffect(() => {
    const img = new Image();
    img.src = '/SWORD.png';
    img.onload = () => setSwordImage(img);
  }, []);

  const initGame = useCallback(() => {
    setGame({
      score: 0,
      hearts: 3,
      swordY: CANVAS_HEIGHT / 2,
      swordAngle: 0,
      mouseY: CANVAS_HEIGHT / 2,
      enemies: [],
      particles: [],
      lastSpawn: Date.now(),
      spawnInterval: 1500,
      gameOver: false,
    });
    nextEnemyIdRef.current = 1;
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

  // Spawn enemies
  const spawnEnemy = useCallback(() => {
    const types: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    const type = types[Math.floor(Math.random() * types.length)];
    const size = type === 'small' ? 20 : type === 'medium' ? 35 : 50;

    const enemy: Enemy = {
      id: nextEnemyIdRef.current++,
      x: CANVAS_WIDTH + size,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
      vx: -(2 + Math.random() * 3),
      vy: (Math.random() - 0.5) * 2,
      size,
      type,
    };

    setGame(prev => ({
      ...prev,
      enemies: [...prev.enemies, enemy],
    }));
  }, []);

  // Death zones around sword (red dots)
  const getDeathZones = (swordX: number, swordY: number): DeathZone[] => {
    return [
      // Top death zones
      { x: swordX - SWORD_WIDTH / 4, y: swordY - SWORD_HEIGHT / 2 - 5, radius: DEATH_ZONE_RADIUS },
      { x: swordX + SWORD_WIDTH / 4, y: swordY - SWORD_HEIGHT / 2 - 5, radius: DEATH_ZONE_RADIUS },
      
      // Bottom death zones
      { x: swordX - SWORD_WIDTH / 4, y: swordY + SWORD_HEIGHT / 2 + 5, radius: DEATH_ZONE_RADIUS },
      { x: swordX + SWORD_WIDTH / 4, y: swordY + SWORD_HEIGHT / 2 + 5, radius: DEATH_ZONE_RADIUS },
      
      // Left side death zones
      { x: swordX - SWORD_WIDTH / 2 - 5, y: swordY - SWORD_HEIGHT / 4, radius: DEATH_ZONE_RADIUS },
      { x: swordX - SWORD_WIDTH / 2 - 5, y: swordY + SWORD_HEIGHT / 4, radius: DEATH_ZONE_RADIUS },
      
      // Right side death zones
      { x: swordX + SWORD_WIDTH / 2 + 5, y: swordY - SWORD_HEIGHT / 4, radius: DEATH_ZONE_RADIUS },
      { x: swordX + SWORD_WIDTH / 2 + 5, y: swordY + SWORD_HEIGHT / 4, radius: DEATH_ZONE_RADIUS },
    ];
  };

  // Check if point is inside sword body (not death zones)
  const isInsideSwordBody = (x: number, y: number, swordX: number, swordY: number): boolean => {
    return (
      x > swordX - SWORD_WIDTH / 2 &&
      x < swordX + SWORD_WIDTH / 2 &&
      y > swordY - SWORD_HEIGHT / 2 &&
      y < swordY + SWORD_HEIGHT / 2
    );
  };

  // Check if point hits death zone
  const hitsDeathZone = (x: number, y: number, swordX: number, swordY: number): boolean => {
    const deathZones = getDeathZones(swordX, swordY);
    return deathZones.some(zone => {
      const dx = x - zone.x;
      const dy = y - zone.y;
      return Math.sqrt(dx * dx + dy * dy) < zone.radius + 10;
    });
  };

  // Create explosion particles
  const createExplosion = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        color,
      });
    }
    setGame(prev => ({
      ...prev,
      particles: [...prev.particles, ...newParticles],
    }));
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      // Spawn enemies
      if (now - game.lastSpawn > game.spawnInterval) {
        spawnEnemy();
        setGame(prev => ({
          ...prev,
          lastSpawn: now,
          spawnInterval: Math.max(800, prev.spawnInterval - 50),
        }));
      }

      // Update game state
      setGame(prev => {
        // Move sword towards mouse
        const targetY = prev.mouseY;
        const newY = prev.swordY + (targetY - prev.swordY) * 0.1;

        // Update enemies
        const updatedEnemies = prev.enemies
          .map(enemy => ({
            ...enemy,
            x: enemy.x + enemy.vx,
            y: enemy.y + enemy.vy,
          }))
          .filter(enemy => enemy.x > -100);

        // Check collisions
        let newHearts = prev.hearts;
        let newScore = prev.score;
        let enemiesToRemove: number[] = [];

        updatedEnemies.forEach(enemy => {
          const enemyCenterX = enemy.x;
          const enemyCenterY = enemy.y;

          // Check death zone collision
          if (hitsDeathZone(enemyCenterX, enemyCenterY, SWORD_X, newY)) {
            newHearts--;
            enemiesToRemove.push(enemy.id);
            createExplosion(enemyCenterX, enemyCenterY, '#FF0000');
          }
          // Check sword body collision (destroys enemy)
          else if (isInsideSwordBody(enemyCenterX, enemyCenterY, SWORD_X, newY)) {
            newScore += enemy.type === 'small' ? 10 : enemy.type === 'medium' ? 20 : 30;
            enemiesToRemove.push(enemy.id);
            createExplosion(enemyCenterX, enemyCenterY, '#FFD700');
          }
        });

        // Remove destroyed enemies
        const finalEnemies = updatedEnemies.filter(e => !enemiesToRemove.includes(e.id));

        // Update particles
        const updatedParticles = prev.particles
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1,
            life: p.life - 1,
          }))
          .filter(p => p.life > 0);

        if (newHearts <= 0) {
          return { ...prev, gameOver: true };
        }

        return {
          ...prev,
          swordY: newY,
          hearts: newHearts,
          score: newScore,
          enemies: finalEnemies,
          particles: updatedParticles,
        };
      });

      // Render
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(1, '#1a1f3a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw enemies
      game.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.type === 'small' ? '#FF6B6B' : enemy.type === 'medium' ? '#FFA500' : '#9B2C2C';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw sword
      if (swordImage) {
        ctx.save();
        ctx.translate(SWORD_X, game.swordY);
        ctx.drawImage(swordImage, -SWORD_WIDTH / 2, -SWORD_HEIGHT / 2, SWORD_WIDTH, SWORD_HEIGHT);
        ctx.restore();

        // Draw death zones (red dots)
        const deathZones = getDeathZones(SWORD_X, game.swordY);
        deathZones.forEach(zone => {
          ctx.beginPath();
          ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#FF0000';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }

      // Draw particles
      game.particles.forEach(p => {
        const alpha = p.life / 50;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });

      // Draw HUD
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${game.score}`, 20, 40);

      // Draw hearts
      ctx.font = '30px Arial';
      for (let i = 0; i < 3; i++) {
        ctx.fillText(i < game.hearts ? '❤️' : '🖤', 20 + i * 40, 80);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [game, gameState, swordImage, spawnEnemy]);

  // Mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

      setGame(prev => ({ ...prev, mouseY: Math.max(80, Math.min(CANVAS_HEIGHT - 80, y)) }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gameState]);

  // Timer
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

  // Game over
  useEffect(() => {
    if (game.gameOver && gameState === 'playing') {
      setGameState('ended');
      const accuracy = Math.min(100, (game.score / 500) * 100);
      setTimeout(() => {
        onGameEnd({
          score: game.score,
          accuracy: Math.round(accuracy),
        });
      }, 1500);
    }
  }, [game.gameOver, gameState, game.score, onGameEnd]);

  // Keyboard
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (gameState === 'ready') {
          startCountdown();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, startCountdown]);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-blue-400">⚔️ BLADE BOUNCE</h2>
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full"
        />

        {gameState === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center p-8 bg-gray-900/90 rounded-2xl border-4 border-blue-500 max-w-2xl">
              <h1 className="text-5xl font-bold text-blue-400 mb-4">⚔️ BLADE BOUNCE</h1>
              <p className="text-white text-xl mb-6">Protect the sword with 3 hearts!</p>
              <div className="text-left text-white mb-6 space-y-2">
                <p>🔴 <strong>Red Dots:</strong> DEATH ZONES - If hit, lose 1 heart ❤️</p>
                <p>⚔️ <strong>Sword Body:</strong> DESTROYS enemies and earns points</p>
                <p>🎯 <strong>Small Enemy:</strong> 10 points</p>
                <p>🎯 <strong>Medium Enemy:</strong> 20 points</p>
                <p>🎯 <strong>Large Enemy:</strong> 30 points</p>
                <p>❤️ <strong>3 Hearts:</strong> Game over when hearts = 0</p>
                <p>⏱️ <strong>Time Limit:</strong> 60 seconds</p>
              </div>
              <button
                onClick={startCountdown}
                className="px-8 py-4 bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold text-xl rounded-xl hover:scale-105 transform transition-all shadow-lg"
              >
                START GAME
              </button>
              <p className="text-gray-400 mt-4 text-sm">Move your mouse to control the sword</p>
            </div>
          </div>
        )}

        {gameState === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-9xl font-bold text-blue-400 animate-pulse">
              {countdown}
            </div>
          </div>
        )}

        {gameState === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-8 bg-gray-900/95 rounded-2xl border-4 border-blue-500">
              <h2 className="text-4xl font-bold text-blue-400 mb-4">
                {game.score > 400 ? '🏆 LEGENDARY!' : game.score > 200 ? '🎉 AMAZING!' : '⚔️ GOOD TRY!'}
              </h2>
              <div className="text-white text-2xl space-y-2">
                <p>Final Score: <span className="text-blue-400 font-bold">{game.score}</span></p>
                <p>Hearts Left: <span className="text-red-400 font-bold">{game.hearts}</span></p>
              </div>
              <p className="text-gray-400 mt-4">Submitting your score...</p>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-full">
            <p className="text-white font-semibold text-center">
              Move mouse to control sword | 🔴 Avoid red dots! | ⚔️ Destroy enemies!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
