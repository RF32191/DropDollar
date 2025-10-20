'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface BladeBounceGameProps {
  onGameEnd: (score: number, accuracy: number) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

interface GameState {
  score: number;
  bestScore: number;
  gameOver: boolean;
  gameStarted: boolean;
  swordAngle: number;
  swordX: number;
  swordY: number;
  mouseX: number;
  mouseY: number;
  obstacles: Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    gapY: number;
    gapHeight: number;
  }>;
  enemies: Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
  }>;
  particles: Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
  }>;
}

export default function BladeBounceGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, gameId }: BladeBounceGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    bestScore: parseInt(localStorage.getItem('bladeBounceBestScore') || '0'),
    gameOver: false,
    gameStarted: false,
    swordAngle: 0,
    swordX: 0,
    swordY: 0,
    mouseX: 0,
    mouseY: 0,
    obstacles: [],
    enemies: [],
    particles: []
  });

  const [showInstructions, setShowInstructions] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // Audio context for sound effects
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Sound effect functions
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, []);

  const playSpinSound = useCallback(() => playSound(800, 0.2, 'square'), [playSound]);
  const playClinkSound = useCallback(() => playSound(1200, 0.1, 'sawtooth'), [playSound]);
  const playScoreSound = useCallback(() => playSound(600, 0.15, 'triangle'), [playSound]);
  const playGameOverSound = useCallback(() => playSound(200, 0.5, 'sawtooth'), [playSound]);

  // Game constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const SWORD_LENGTH = 60;
  const SWORD_WIDTH = 8;
  const SWORD_HILT_LENGTH = 20;
  const SWORD_HILT_WIDTH = 12;
  const OBSTACLE_SPEED = 2;
  const ENEMY_SPEED = 1.5;
  const PARTICLE_LIFE = 30;

  // Initialize game
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Initialize game state
    setGameState(prev => ({
      ...prev,
      score: 0,
      gameOver: false,
      gameStarted: true,
      swordX: CANVAS_WIDTH / 2,
      swordY: CANVAS_HEIGHT / 2,
      mouseX: CANVAS_WIDTH / 2,
      mouseY: CANVAS_HEIGHT / 2,
      obstacles: [],
      enemies: [],
      particles: []
    }));

    initAudio();
  }, [initAudio]);

  // Generate obstacles
  const generateObstacle = useCallback(() => {
    const gapY = Math.random() * (CANVAS_HEIGHT - 100) + 50;
    const gapHeight = 80;
    
    return {
      id: Date.now() + Math.random(),
      x: CANVAS_WIDTH,
      y: 0,
      width: 40,
      height: gapY,
      gapY: gapY,
      gapHeight: gapHeight
    };
  }, []);

  // Generate enemies
  const generateEnemy = useCallback(() => {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -20 : CANVAS_WIDTH + 20;
    const y = Math.random() * CANVAS_HEIGHT;
    
    return {
      id: Date.now() + Math.random(),
      x: x,
      y: y,
      vx: side === 'left' ? ENEMY_SPEED : -ENEMY_SPEED,
      vy: (Math.random() - 0.5) * 2,
      angle: Math.random() * Math.PI * 2
    };
  }, []);

  // Create particles
  const createParticles = useCallback((x: number, y: number, count: number = 5) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + Math.random() + i,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE
    }));
    
    setGameState(prev => ({
      ...prev,
      particles: [...prev.particles, ...newParticles]
    }));
  }, []);

  // Check collisions
  const checkCollisions = useCallback((gameState: GameState) => {
    const swordTipX = gameState.swordX + Math.cos(gameState.swordAngle) * SWORD_LENGTH;
    const swordTipY = gameState.swordY + Math.sin(gameState.swordAngle) * SWORD_LENGTH;
    const swordHiltX = gameState.swordX + Math.cos(gameState.swordAngle) * SWORD_HILT_LENGTH;
    const swordHiltY = gameState.swordY + Math.sin(gameState.swordAngle) * SWORD_HILT_LENGTH;

    // Check obstacle collisions
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
      const obstacle = gameState.obstacles[i];
      
      // Check if sword tip (blade) hits obstacle
      if (swordTipX >= obstacle.x && swordTipX <= obstacle.x + obstacle.width &&
          ((swordTipY >= obstacle.y && swordTipY <= obstacle.y + obstacle.height) ||
           (swordTipY >= obstacle.gapY + obstacle.gapHeight && swordTipY <= CANVAS_HEIGHT))) {
        
        // Blade hit - successful block
        playClinkSound();
        playScoreSound();
        createParticles(swordTipX, swordTipY);
        
        setGameState(prev => ({
          ...prev,
          score: prev.score + 1,
          obstacles: prev.obstacles.filter((_, index) => index !== i)
        }));
        
        continue;
      }
      
      // Check if sword hilt hits obstacle
      if (swordHiltX >= obstacle.x && swordHiltX <= obstacle.x + obstacle.width &&
          ((swordHiltY >= obstacle.y && swordHiltY <= obstacle.y + obstacle.height) ||
           (swordHiltY >= obstacle.gapY + obstacle.gapHeight && swordHiltY <= CANVAS_HEIGHT))) {
        
        // Hilt hit - game over
        playGameOverSound();
        setGameState(prev => ({ ...prev, gameOver: true }));
        return;
      }
    }

    // Check enemy collisions
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      const enemy = gameState.enemies[i];
      const distance = Math.sqrt((swordTipX - enemy.x) ** 2 + (swordTipY - enemy.y) ** 2);
      
      if (distance < 15) {
        // Blade hit enemy - successful block
        playClinkSound();
        playScoreSound();
        createParticles(enemy.x, enemy.y);
        
        setGameState(prev => ({
          ...prev,
          score: prev.score + 1,
          enemies: prev.enemies.filter((_, index) => index !== i)
        }));
      }
    }
  }, [playClinkSound, playScoreSound, playGameOverSound, createParticles]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    setGameState(prev => {
      if (prev.gameOver) return prev;

      let newState = { ...prev };

      // Update sword position (follow mouse with smoothing)
      const smoothing = 0.1;
      newState.swordX += (newState.mouseX - newState.swordX) * smoothing;
      newState.swordY += (newState.mouseY - newState.swordY) * smoothing;

      // Update obstacles
      newState.obstacles = newState.obstacles.map(obstacle => ({
        ...obstacle,
        x: obstacle.x - OBSTACLE_SPEED
      })).filter(obstacle => obstacle.x > -obstacle.width);

      // Update enemies
      newState.enemies = newState.enemies.map(enemy => ({
        ...enemy,
        x: enemy.x + enemy.vx,
        y: enemy.y + enemy.vy,
        angle: enemy.angle + 0.1
      })).filter(enemy => enemy.x > -50 && enemy.x < CANVAS_WIDTH + 50);

      // Update particles
      newState.particles = newState.particles.map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        life: particle.life - 1
      })).filter(particle => particle.life > 0);

      // Generate new obstacles
      if (Math.random() < 0.02) {
        newState.obstacles.push(generateObstacle());
      }

      // Generate new enemies
      if (Math.random() < 0.01) {
        newState.enemies.push(generateEnemy());
      }

      // Check collisions
      checkCollisions(newState);

      return newState;
    });

    if (!gameState.gameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState.gameOver, generateObstacle, generateEnemy, checkCollisions]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background gradient (darkens with score)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    const darkness = Math.min(gameState.score / 100, 0.8);
    gradient.addColorStop(0, `rgba(20, 20, 40, ${darkness})`);
    gradient.addColorStop(1, `rgba(10, 10, 20, ${darkness + 0.2})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!gameState.gameStarted || gameState.gameOver) return;

    // Draw obstacles
    ctx.fillStyle = '#666';
    gameState.obstacles.forEach(obstacle => {
      // Top part
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      // Bottom part
      ctx.fillRect(obstacle.x, obstacle.gapY + obstacle.gapHeight, obstacle.width, CANVAS_HEIGHT - obstacle.gapY - obstacle.gapHeight);
    });

    // Draw enemies
    gameState.enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-10, -5, 20, 10);
      ctx.restore();
    });

    // Draw sword
    ctx.save();
    ctx.translate(gameState.swordX, gameState.swordY);
    ctx.rotate(gameState.swordAngle);
    
    // Sword blade
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, -SWORD_WIDTH/2, SWORD_LENGTH, SWORD_WIDTH);
    
    // Sword hilt
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, -SWORD_HILT_WIDTH/2, SWORD_HILT_LENGTH, SWORD_HILT_WIDTH);
    
    ctx.restore();

    // Draw particles
    gameState.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });

    // Draw HUD
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 20, 40);
    ctx.fillText(`Best: ${gameState.bestScore}`, 20, 70);
  }, [gameState]);

  // Mouse/touch handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setGameState(prev => ({
      ...prev,
      mouseX: x,
      mouseY: y
    }));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.detail === 2) {
      // Double click - 360° spin
      playSpinSound();
      setGameState(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI * 2
      }));
    } else {
      // Single click - add 30° clockwise
      setGameState(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI / 6 // 30 degrees
      }));
    }
  }, [playSpinSound]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setGameState(prev => ({
      ...prev,
      mouseX: x,
      mouseY: y
    }));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Simple tap detection for mobile
    const now = Date.now();
    const lastTap = (handleTouchStart as any).lastTap || 0;
    
    if (now - lastTap < 300) {
      // Double tap - 360° spin
      playSpinSound();
      setGameState(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI * 2
      }));
    } else {
      // Single tap - add 30° clockwise
      setGameState(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI / 6
      }));
    }
    
    (handleTouchStart as any).lastTap = now;
  }, [playSpinSound]);

  // Start countdown
  const startCountdown = useCallback(() => {
    setShowInstructions(false);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          initGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initGame]);

  // Start game loop when game starts
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.gameStarted, gameState.gameOver, gameLoop]);

  // Render when game state changes
  useEffect(() => {
    render();
  }, [render]);

  // Handle game over
  useEffect(() => {
    if (gameState.gameOver) {
      const newBestScore = Math.max(gameState.score, gameState.bestScore);
      localStorage.setItem('bladeBounceBestScore', newBestScore.toString());
      
      setTimeout(() => {
        onGameEnd(gameState.score, 100); // Assuming 100% accuracy for this game
      }, 2000);
    }
  }, [gameState.gameOver, gameState.score, onGameEnd]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Blade Bounce: Mouseblade</h1>
          <button
            onClick={onExit}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Exit Game
          </button>
        </div>

        {showInstructions && (
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-4">How to Play</h2>
            <div className="text-left max-w-2xl mx-auto space-y-2">
              <p>• <strong>Mouse/Touch:</strong> Move your sword to follow the cursor</p>
              <p>• <strong>Single Click/Tap:</strong> Rotate sword +30° clockwise</p>
              <p>• <strong>Double Click/Tap:</strong> Perform 360° spin</p>
              <p>• <strong>Blade hits:</strong> Block obstacles and enemies for points</p>
              <p>• <strong>Hilt hits:</strong> Game over!</p>
              <p>• <strong>Goal:</strong> Survive as long as possible and score points</p>
            </div>
            <button
              onClick={startCountdown}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors mt-4"
            >
              Start Game
            </button>
          </div>
        )}

        {countdown > 0 && (
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-blue-400">{countdown}</div>
            <p className="text-xl">Get Ready!</p>
          </div>
        )}

        {gameState.gameOver && (
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-red-400 mb-2">Game Over!</h2>
            <p className="text-xl">Final Score: {gameState.score}</p>
            <p className="text-lg">Best Score: {Math.max(gameState.score, gameState.bestScore)}</p>
          </div>
        )}

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-gray-600 rounded-lg bg-gray-900"
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            style={{ touchAction: 'none', userSelect: 'none' }}
          />
        </div>

        <div className="mt-4 text-center text-sm text-gray-400">
          <p>Use mouse to move sword, click to rotate, double-click to spin!</p>
          <p>Block obstacles with your blade, avoid hitting with the hilt!</p>
        </div>
      </div>
    </div>
  );
}
