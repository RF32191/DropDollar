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
  lightCurves: Array<{
    id: number;
    x: number;
    y: number;
    angle: number;
    life: number;
    maxLife: number;
    intensity: number;
  }>;
}

export default function BladeBounceGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, gameId }: BladeBounceGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [gameData, setGameData] = useState<GameState>({
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
    particles: [],
    lightCurves: []
  });

  const [countdown, setCountdown] = useState(3);
  const [swordImage, setSwordImage] = useState<HTMLImageElement | null>(null);

  // Audio context for sound effects
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load sword image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSwordImage(img);
    };
    img.src = '/SWORD.png';
  }, []);

  // Initialize canvas when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Draw initial background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    console.log('🎮 Canvas initialized:', { width: canvas.width, height: canvas.height });
  }, []);

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
  const playClickSound = useCallback(() => playSound(400, 0.1, 'sine'), [playSound]);

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

    // Initialize game data
    setGameData(prev => ({
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
      particles: [],
      lightCurves: []
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
    
    setGameData(prev => ({
      ...prev,
      particles: [...prev.particles, ...newParticles]
    }));
  }, []);

  // Create light curves
  const createLightCurve = useCallback((x: number, y: number, angle: number) => {
    const lightCurve = {
      id: Date.now() + Math.random(),
      x: x,
      y: y,
      angle: angle,
      life: 60, // 1 second at 60fps
      maxLife: 60,
      intensity: 1.0
    };
    
    setGameData(prev => ({
      ...prev,
      lightCurves: [...prev.lightCurves, lightCurve]
    }));
  }, []);

  // Check collisions
  const checkCollisions = useCallback((gameData: GameState) => {
    const swordTipX = gameData.swordX + Math.cos(gameData.swordAngle) * SWORD_LENGTH;
    const swordTipY = gameData.swordY + Math.sin(gameData.swordAngle) * SWORD_LENGTH;
    const swordHiltX = gameData.swordX + Math.cos(gameData.swordAngle) * SWORD_HILT_LENGTH;
    const swordHiltY = gameData.swordY + Math.sin(gameData.swordAngle) * SWORD_HILT_LENGTH;

    // Check obstacle collisions
    for (let i = gameData.obstacles.length - 1; i >= 0; i--) {
      const obstacle = gameData.obstacles[i];
      
      // Check if sword tip (blade) hits obstacle
      if (swordTipX >= obstacle.x && swordTipX <= obstacle.x + obstacle.width &&
          ((swordTipY >= obstacle.y && swordTipY <= obstacle.y + obstacle.height) ||
           (swordTipY >= obstacle.gapY + obstacle.gapHeight && swordTipY <= CANVAS_HEIGHT))) {
        
        // Blade hit - successful block
        playClinkSound();
        playScoreSound();
        createParticles(swordTipX, swordTipY);
        
        setGameData(prev => ({
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
        setGameData(prev => ({ ...prev, gameOver: true }));
        return;
      }
    }

    // Check enemy collisions
    for (let i = gameData.enemies.length - 1; i >= 0; i--) {
      const enemy = gameData.enemies[i];
      const distance = Math.sqrt((swordTipX - enemy.x) ** 2 + (swordTipY - enemy.y) ** 2);
      
      if (distance < 15) {
        // Blade hit enemy - successful block
        playClinkSound();
        playScoreSound();
        createParticles(enemy.x, enemy.y);
        
        setGameData(prev => ({
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

    setGameData(prev => {
      if (prev.gameOver) {
        // Stop game loop when game over
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        return prev;
      }

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

      // Update light curves
      newState.lightCurves = newState.lightCurves.map(curve => ({
        ...curve,
        life: curve.life - 1,
        intensity: curve.life / curve.maxLife
      })).filter(curve => curve.life > 0);

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

    // Continue game loop if not over
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [generateObstacle, generateEnemy, checkCollisions]);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ Canvas context not found');
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Simple test background to verify canvas is working
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background gradient (darkens with score)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    const darkness = Math.min(gameData.score / 100, 0.8);
    gradient.addColorStop(0, `rgba(20, 20, 40, ${darkness})`);
    gradient.addColorStop(1, `rgba(10, 10, 20, ${darkness + 0.2})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Show game content even if not started yet (for debugging)
    if (!gameData.gameStarted) {
      // Draw a simple sword in center when not started
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, -20, 60, 40);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, -10, 20, 20);
      ctx.restore();
      
      return;
    }

    if (gameData.gameOver) return;

    // Draw obstacles
    ctx.fillStyle = '#666';
    gameData.obstacles.forEach(obstacle => {
      // Top part
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      // Bottom part
      ctx.fillRect(obstacle.x, obstacle.gapY + obstacle.gapHeight, obstacle.width, CANVAS_HEIGHT - obstacle.gapY - obstacle.gapHeight);
    });

    // Draw enemies
    gameData.enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);
      
      if (swordImage) {
        // Draw enemy sword image (smaller and red-tinted)
        const enemySwordWidth = 20;
        const enemySwordHeight = 40;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-enemySwordWidth/2, -enemySwordHeight/2, enemySwordWidth, enemySwordHeight);
        ctx.globalAlpha = 1;
      } else {
        // Fallback to basic shape
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-10, -5, 20, 10);
      }
      
      ctx.restore();
    });

    // Draw sword
    ctx.save();
    ctx.translate(gameData.swordX, gameData.swordY);
    ctx.rotate(gameData.swordAngle);
    
    if (swordImage) {
      // Draw sword image
      const swordWidth = 40;
      const swordHeight = 80;
      ctx.drawImage(swordImage, -swordWidth/2, -swordHeight/2, swordWidth, swordHeight);
    } else {
      // Fallback to basic shapes if image not loaded
      // Sword blade
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, -SWORD_WIDTH/2, SWORD_LENGTH, SWORD_WIDTH);
      
      // Sword hilt
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, -SWORD_HILT_WIDTH/2, SWORD_HILT_LENGTH, SWORD_HILT_WIDTH);
    }
    
    ctx.restore();

    // Draw light curves
    gameData.lightCurves.forEach(curve => {
      ctx.save();
      ctx.translate(curve.x, curve.y);
      ctx.rotate(curve.angle);
      
      // Create gradient for light effect
      const gradient = ctx.createLinearGradient(-50, 0, 50, 0);
      gradient.addColorStop(0, `rgba(255, 255, 0, 0)`);
      gradient.addColorStop(0.5, `rgba(255, 255, 0, ${curve.intensity * 0.8})`);
      gradient.addColorStop(1, `rgba(255, 255, 0, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(-50, -2, 100, 4);
      
      // Add glow effect
      ctx.shadowColor = 'rgba(255, 255, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillRect(-50, -1, 100, 2);
      
      ctx.restore();
    });

    // Draw particles
    gameData.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });

    // Draw HUD
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameData.score}`, 20, 40);
    ctx.fillText(`Best: ${gameData.bestScore}`, 20, 70);
  }, [gameData, swordImage]);

  // Mouse/touch handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setGameData(prev => ({
      ...prev,
      mouseX: x,
      mouseY: y
    }));
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (gameState !== 'playing') return;
    
    if (e.detail === 2) {
      // Double click - 360° spin
      playSpinSound();
      createLightCurve(gameData.swordX, gameData.swordY, gameData.swordAngle);
      setGameData(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI * 2
      }));
    } else {
      // Single click - add 30° clockwise
      playClickSound();
      createLightCurve(gameData.swordX, gameData.swordY, gameData.swordAngle);
      setGameData(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI / 6 // 30 degrees
      }));
    }
  }, [playSpinSound, playClickSound, gameState, createLightCurve]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setGameData(prev => ({
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
      setGameData(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI * 2
      }));
    } else {
      // Single tap - add 30° clockwise
      setGameData(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI / 6
      }));
    }
    
    (handleTouchStart as any).lastTap = now;
  }, [playSpinSound]);

  // Start game handler
  const handleStartGame = useCallback(() => {
    console.log('🎮 [BladeBounce] Start game button clicked!');
    setGameState('countdown');
    setCountdown(3);
  }, []);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // Start game
        setGameState('playing');
        initGame();
        // Force initial render
        setTimeout(() => render(), 100);
      }
    }
  }, [gameState, countdown, initGame]);

  // Single game loop effect
  useEffect(() => {
    if (gameState === 'playing') {
      lastTimeRef.current = performance.now();
      
      const gameLoop = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;

        // Update game state
        setGameData(prev => {
          const newState = { ...prev };

          // Move obstacles
          newState.obstacles = newState.obstacles.map(obstacle => ({
            ...obstacle,
            x: obstacle.x - obstacle.speed
          })).filter(obstacle => obstacle.x > -100);

          // Move enemies
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

          // Update light curves
          newState.lightCurves = newState.lightCurves.map(curve => ({
            ...curve,
            life: curve.life - 1,
            intensity: curve.life / curve.maxLife
          })).filter(curve => curve.life > 0);

          // Generate new obstacles
          if (Math.random() < 0.02) {
            newState.obstacles.push(generateObstacle());
          }

          // Generate new enemies
          if (Math.random() < 0.01) {
            newState.enemies.push(generateEnemy());
          }

          // Check collisions
          const collisionResult = checkCollisions(newState);
          if (collisionResult) {
            newState.score = collisionResult.score;
            newState.gameOver = collisionResult.gameOver;
            
            if (collisionResult.particles) {
              newState.particles = [...newState.particles, ...collisionResult.particles];
            }
          }

          return newState;
        });

        // Render
        render();

        // Continue loop
        if (gameState === 'playing') {
          animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
      };

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, render, generateObstacle, generateEnemy, checkCollisions]);

  // Handle game over
  useEffect(() => {
    if (gameData.gameOver) {
      const newBestScore = Math.max(gameData.score, gameData.bestScore);
      localStorage.setItem('bladeBounceBestScore', newBestScore.toString());
      
      // Set game state to ended
      setGameState('ended');
      
      setTimeout(() => {
        onGameEnd(gameData.score, 100); // Assuming 100% accuracy for this game
      }, 2000);
    }
  }, [gameData.gameOver, gameData.score, onGameEnd]);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-900 via-red-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-full overflow-y-auto text-center border border-white/20 shadow-2xl">
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-red-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">⚔️</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-orange-300 to-red-300 bg-clip-text text-transparent">
              Blade Bounce: Mouseblade
            </h2>
            <p className="text-orange-200 text-sm mb-4 sm:mb-6 font-medium">Ultimate Sword Control Challenge</p>
            
            <div className="text-left text-xs sm:text-sm text-white/90 mb-6 sm:mb-8 space-y-3 bg-black/20 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-white/10 max-h-64 sm:max-h-none overflow-y-auto">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">!</span>
                </div>
                <p className="text-white font-semibold">SWORD CONTROL:</p>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-semibold">Mouse/Touch:</span> Move sword to follow cursor</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-semibold">Single Click:</span> Rotate sword +30° clockwise</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-orange-300 font-semibold">Double Click:</span> Perform 360° spin attack</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-semibold">Blade Hits:</span> Block obstacles and enemies for points</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Hilt Hits:</span> Game over! Avoid hitting with handle</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-purple-300 font-semibold">Goal:</span> Survive as long as possible and score points</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-xl p-3 sm:p-4 mt-4 sm:mt-6">
                <p className="text-xs text-orange-200">
                  <span className="text-yellow-300 font-bold">🎯 PRECISION:</span> Only the blade edge can block attacks safely. 
                  The hilt (handle) will cause instant game over if it hits anything!
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {!isCompetitionMode && onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform text-sm sm:text-base"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform text-lg sm:text-xl border-2 border-orange-400 hover:border-orange-300 relative z-20`}
              >
                ⚔️ START BATTLE ⚔️
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Blade Bounce: Mouseblade</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8">Control your sword with precision! Blade hits = points, Hilt hits = game over!</p>
          <div className="text-6xl sm:text-8xl font-bold text-orange-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4">Get ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl p-3 sm:p-6 max-w-6xl w-full max-h-full overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
          <div className="text-lg font-bold text-gray-900">
            ⚔️ Blade Bounce: Mouseblade
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="text-gray-600">Score: {gameData.score}</div>
            <div className="text-gray-600">Best: {gameData.bestScore}</div>
            {!isCompetitionMode && onExit && (
              <button 
                onClick={onExit}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="space-y-6">
            <div className="text-xl font-bold text-gray-900">
              ⚔️ Control your sword with precision! 🗡️
              {gameData.gameOver && (
                <div className="text-xl text-red-600 font-bold animate-bounce mt-2 bg-red-200 px-4 py-2 rounded-lg">
                  💀 GAME OVER! 💀
                </div>
              )}
            </div>
            
            {/* Game Area */}
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

            <div className="text-xs sm:text-sm text-gray-600 text-center">
              <div className="hidden sm:block">
                <strong>Desktop:</strong> Move mouse to control sword | <strong>Click:</strong> Rotate sword | <strong>Double-click:</strong> Spin attack
              </div>
              <div className="block sm:hidden">
                <strong>Mobile:</strong> Touch and drag to move sword | <strong>Tap:</strong> Rotate sword | <strong>Double-tap:</strong> Spin attack
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 space-y-2">
          <div>⚔️ <strong>BLADE CONTROL:</strong> Sword follows mouse/touch with smooth movement!</div>
          <div>🗡️ <strong>BLADE HITS:</strong> Only the sharp edge can block obstacles safely</div>
          <div>🛡️ <strong>HILT HITS:</strong> Handle hits cause instant game over</div>
          <div>🎯 <strong>ENEMY SWORDS:</strong> Block flying enemy swords for bonus points!</div>
          <div>⚡ <strong>SPIN ATTACK:</strong> Double-click for powerful 360° spin</div>
          <div>💎 <strong>PRECISION:</strong> Master sword control for high scores!</div>
        </div>
      </div>
    </div>
  );
}
// Deployment trigger - Mon Oct 20 00:20:15 PDT 2025
