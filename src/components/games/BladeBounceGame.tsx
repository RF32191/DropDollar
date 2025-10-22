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
  accuracy: number;
  totalHits: number;
  successfulHits: number;
  obstacles: Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    gapY: number;
    gapHeight: number;
    speed: number;
    isTopPillar?: boolean;
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
    accuracy: 100,
    totalHits: 0,
    successfulHits: 0,
    obstacles: [],
    enemies: [],
    particles: [],
    lightCurves: []
  });

  const [countdown, setCountdown] = useState(3);
  const [gameTimer, setGameTimer] = useState(60); // 60-second timer
  const [swordImage, setSwordImage] = useState<HTMLImageElement | null>(null);
  const lastTimerUpdateRef = useRef<number>(0);

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

  // Generate staggered obstacles (Flappy Bird style) + pillars at top
  const generateObstacle = useCallback(() => {
    // Create staggered pillars - not directly top/bottom
    const pillarCount = Math.floor(Math.random() * 3) + 2; // 2-4 pillars
    const pillars = [];
    
    for (let i = 0; i < pillarCount; i++) {
      const gapY = Math.random() * (CANVAS_HEIGHT - 120) + 60;
      const gapHeight = Math.max(60, 100 - gameData.score * 0.5); // Gap gets smaller as score increases
      
      pillars.push({
        id: Date.now() + Math.random() + i,
        x: CANVAS_WIDTH + (i * 60), // Stagger horizontally
        y: gapY,
        width: Math.max(20, 50 - gameData.score * 0.3), // Pillars get narrower
        height: CANVAS_HEIGHT - gapY,
        gapY: gapY,
        gapHeight: gapHeight,
        speed: 2 + gameData.score * 0.05 // Speed increases more dramatically with score
      });
    }
    
    // Add top pillars that destroy the sword
    const topPillarCount = Math.floor(Math.random() * 2) + 1; // 1-2 top pillars
    for (let i = 0; i < topPillarCount; i++) {
      pillars.push({
        id: Date.now() + Math.random() + i + 1000, // Different ID range
        x: CANVAS_WIDTH + (i * 80),
        y: 0, // Start at top
        width: Math.max(15, 40 - gameData.score * 0.2),
        height: Math.random() * 100 + 50, // Random height 50-150
        gapY: 0,
        gapHeight: 0,
        speed: 1.5 + gameData.score * 0.03,
        isTopPillar: true // Mark as top pillar
      });
    }
    
    return pillars;
  }, [gameData.score]);

  // Generate enemies (fireballs with increasing spawn rate and speed)
  const generateEnemy = useCallback(() => {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? -20 : CANVAS_WIDTH + 20;
    const y = Math.random() * CANVAS_HEIGHT;
    
    // Increase fireball speed every 2 seconds (based on game timer)
    const timeElapsed = 60 - gameTimer; // Time elapsed in seconds
    const speedMultiplier = Math.floor(timeElapsed / 2) + 1; // Increases every 2 seconds
    const baseSpeed = 1.5;
    const speedIncrease = gameData.score * 0.02;
    const fireballSpeed = (baseSpeed + speedIncrease) * speedMultiplier;
    
    return {
      id: Date.now() + Math.random(),
      x: x,
      y: y,
      vx: side === 'left' ? fireballSpeed : -fireballSpeed,
      vy: (Math.random() - 0.5) * 2,
      angle: Math.random() * Math.PI * 2
    };
  }, [gameData.score, gameTimer]);

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

  // Check collisions - returns collision results without updating state
  const checkCollisions = useCallback((gameData: GameState): { 
    score: number; 
    gameOver: boolean; 
    particles?: any[]; 
    obstaclesToRemove: number[]; 
    enemiesToRemove: number[];
    totalHits: number;
    successfulHits: number;
  } | null => {
    // Sword position is now fixed at CANVAS_WIDTH / 3
    const swordX = CANVAS_WIDTH / 3;
    const swordY = gameData.swordY;
    
    // Calculate blade tip positions (sharp end - gives points) - symmetrical top and bottom
    const bladeTipX = swordX + Math.cos(gameData.swordAngle) * SWORD_LENGTH;
    const bladeTipY = swordY + Math.sin(gameData.swordAngle) * SWORD_LENGTH;
    
    // Calculate opposite blade tip (symmetrical hit box) - opposite side of blade
    const bladeTipOppositeX = swordX + Math.cos(gameData.swordAngle + Math.PI) * SWORD_LENGTH;
    const bladeTipOppositeY = swordY + Math.sin(gameData.swordAngle + Math.PI) * SWORD_LENGTH;
    
    // Calculate blade edge positions (sides of the blade) - more forgiving hit detection
    const bladeEdge1X = swordX + Math.cos(gameData.swordAngle + Math.PI/2) * (SWORD_LENGTH * 0.7);
    const bladeEdge1Y = swordY + Math.sin(gameData.swordAngle + Math.PI/2) * (SWORD_LENGTH * 0.7);
    const bladeEdge2X = swordX + Math.cos(gameData.swordAngle - Math.PI/2) * (SWORD_LENGTH * 0.7);
    const bladeEdge2Y = swordY + Math.sin(gameData.swordAngle - Math.PI/2) * (SWORD_LENGTH * 0.7);
    
    // Calculate hilt position (handle - causes game over) - make it bigger and more precise
    const hiltX = swordX + Math.cos(gameData.swordAngle) * (SWORD_HILT_LENGTH * 0.8);
    const hiltY = swordY + Math.sin(gameData.swordAngle) * (SWORD_HILT_LENGTH * 0.8);
    
    // Calculate sword bottom area (larger kill zone)
    const swordBottomX = swordX + Math.cos(gameData.swordAngle) * (SWORD_HILT_LENGTH * 1.2);
    const swordBottomY = swordY + Math.sin(gameData.swordAngle) * (SWORD_HILT_LENGTH * 1.2);

    let score = gameData.score;
    let gameOver = gameData.gameOver;
    let totalHits = gameData.totalHits;
    let successfulHits = gameData.successfulHits;
    const obstaclesToRemove: number[] = [];
    const enemiesToRemove: number[] = [];
    const particles: any[] = [];

    // Check obstacle collisions
    for (let i = gameData.obstacles.length - 1; i >= 0; i--) {
      const obstacle = gameData.obstacles[i];
      
      // DEBUG: Log collision detection
      if (gameData.obstacles.length > 0 && i === gameData.obstacles.length - 1) {
        console.log('🎯 Collision Check:', {
          bladeTip: { x: bladeTipX, y: bladeTipY },
          bladeEdge1: { x: bladeEdge1X, y: bladeEdge1Y },
          bladeEdge2: { x: bladeEdge2X, y: bladeEdge2Y },
          hilt: { x: hiltX, y: hiltY },
          obstacle: { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height },
          swordAngle: gameData.swordAngle,
          swordY: gameData.swordY
        });
      }
      
      // Check if blade tip hits obstacle (successful block) - most effective
      const bladeTipHit = bladeTipX >= obstacle.x && bladeTipX <= obstacle.x + obstacle.width &&
          ((bladeTipY >= obstacle.y && bladeTipY <= obstacle.y + obstacle.height) ||
           (bladeTipY >= obstacle.gapY + obstacle.gapHeight && bladeTipY <= CANVAS_HEIGHT));
      
      // Check if opposite blade tip hits obstacle (successful block)
      const bladeTipOppositeHit = bladeTipOppositeX >= obstacle.x && bladeTipOppositeX <= obstacle.x + obstacle.width &&
          ((bladeTipOppositeY >= obstacle.y && bladeTipOppositeY <= obstacle.y + obstacle.height) ||
           (bladeTipOppositeY >= obstacle.gapY + obstacle.gapHeight && bladeTipOppositeY <= CANVAS_HEIGHT));
      
      // Check if blade edges hit obstacle (successful block) - more forgiving
      const bladeEdge1Hit = bladeEdge1X >= obstacle.x && bladeEdge1X <= obstacle.x + obstacle.width &&
          ((bladeEdge1Y >= obstacle.y && bladeEdge1Y <= obstacle.y + obstacle.height) ||
           (bladeEdge1Y >= obstacle.gapY + obstacle.gapHeight && bladeEdge1Y <= CANVAS_HEIGHT));
      
      const bladeEdge2Hit = bladeEdge2X >= obstacle.x && bladeEdge2X <= obstacle.x + obstacle.width &&
          ((bladeEdge2Y >= obstacle.y && bladeEdge2Y <= obstacle.y + obstacle.height) ||
           (bladeEdge2Y >= obstacle.gapY + obstacle.gapHeight && bladeEdge2Y <= CANVAS_HEIGHT));
      
      if (bladeTipHit || bladeTipOppositeHit || bladeEdge1Hit || bladeEdge2Hit) {
        
        console.log('✅ BLADE HIT! Score +1');
        // Blade hit - successful block
        playClinkSound();
        playScoreSound();
        
        // Create particles
        for (let j = 0; j < 5; j++) {
          particles.push({
            id: Date.now() + Math.random() + j,
            x: bladeTipX,
            y: bladeTipY,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            maxLife: 30
          });
        }
        
        score += 1;
        totalHits += 1;
        successfulHits += 1;
        obstaclesToRemove.push(i);
        
        continue;
      }
      
      // Check if hilt hits obstacle (game over) - more forgiving hit detection with buffer zone
      const hiltBuffer = 15; // Buffer zone around hilt to make it more forgiving
      if (hiltX >= obstacle.x - hiltBuffer && hiltX <= obstacle.x + obstacle.width + hiltBuffer &&
          ((hiltY >= obstacle.y - hiltBuffer && hiltY <= obstacle.y + obstacle.height + hiltBuffer) ||
           (hiltY >= obstacle.gapY + obstacle.gapHeight - hiltBuffer && hiltY <= CANVAS_HEIGHT + hiltBuffer))) {
        
        console.log('💀 HILT HIT! Game Over!');
        // Hilt hit - game over
        playGameOverSound();
        gameOver = true;
        return { score, gameOver, particles, obstaclesToRemove, enemiesToRemove, totalHits, successfulHits };
      }
      
      // Check if sword bottom hits obstacle (game over) - bigger kill zone
      if (swordBottomX >= obstacle.x && swordBottomX <= obstacle.x + obstacle.width &&
          ((swordBottomY >= obstacle.y && swordBottomY <= obstacle.y + obstacle.height) ||
           (swordBottomY >= obstacle.gapY + obstacle.gapHeight && swordBottomY <= CANVAS_HEIGHT))) {
        
        console.log('💀 SWORD BOTTOM HIT! Game Over!');
        // Sword bottom hit - game over
        playGameOverSound();
        gameOver = true;
        return { score, gameOver, particles, obstaclesToRemove, enemiesToRemove, totalHits, successfulHits };
      }
      
      // Check if top pillar hits sword (game over)
      if (obstacle.isTopPillar) {
        const swordHit = swordX >= obstacle.x && swordX <= obstacle.x + obstacle.width &&
                        swordY >= obstacle.y && swordY <= obstacle.y + obstacle.height;
        
        if (swordHit) {
          console.log('💀 TOP PILLAR HIT! Game Over!');
          // Top pillar hit - game over
          playGameOverSound();
          gameOver = true;
          return { score, gameOver, particles, obstaclesToRemove, enemiesToRemove, totalHits, successfulHits };
        }
      }
    }

    // Check enemy collisions
    for (let i = gameData.enemies.length - 1; i >= 0; i--) {
      const enemy = gameData.enemies[i];
      
      // Check if blade tip hits enemy (successful block)
      const bladeTipHit = Math.sqrt((bladeTipX - enemy.x) ** 2 + (bladeTipY - enemy.y) ** 2) < 20;
      
      // Check if opposite blade tip hits enemy (successful block)
      const bladeTipOppositeHit = Math.sqrt((bladeTipOppositeX - enemy.x) ** 2 + (bladeTipOppositeY - enemy.y) ** 2) < 20;
      
      // Check if blade edges hit enemy (successful block) - more forgiving
      const bladeEdge1Hit = Math.sqrt((bladeEdge1X - enemy.x) ** 2 + (bladeEdge1Y - enemy.y) ** 2) < 25;
      const bladeEdge2Hit = Math.sqrt((bladeEdge2X - enemy.x) ** 2 + (bladeEdge2Y - enemy.y) ** 2) < 25;
      
      if (bladeTipHit || bladeTipOppositeHit || bladeEdge1Hit || bladeEdge2Hit) {
        // Blade hit enemy - successful block
        playClinkSound();
        playScoreSound();
        
        // Create particles
        for (let j = 0; j < 5; j++) {
          particles.push({
            id: Date.now() + Math.random() + j,
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            maxLife: 30
          });
        }
        
        score += 1;
        totalHits += 1;
        successfulHits += 1;
        enemiesToRemove.push(i);
      } else {
        // Check if fireball hits sword bottom (game over)
        const swordBottomHit = Math.sqrt((swordBottomX - enemy.x) ** 2 + (swordBottomY - enemy.y) ** 2) < 30;
        
        if (swordBottomHit) {
          console.log('💀 FIREBALL HIT SWORD BOTTOM! Game Over!');
          // Fireball hit sword bottom - game over
          playGameOverSound();
          gameOver = true;
          return { score, gameOver, particles, obstaclesToRemove, enemiesToRemove, totalHits, successfulHits };
        }
      }
    }
    
    // Only return collision data if there were actual collisions
    if (obstaclesToRemove.length > 0 || enemiesToRemove.length > 0 || gameOver) {
      return { score, gameOver, particles, obstaclesToRemove, enemiesToRemove, totalHits, successfulHits };
    }
    
    return null; // No collision detected
  }, [playClinkSound, playScoreSound, playGameOverSound]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    setGameData(prev => {
      if (prev.gameOver) {
        // Stop game loop when game over
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
          gameLoopRef.current = undefined;
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
        const newObstacles = generateObstacle();
        newState.obstacles.push(...newObstacles);
      }

      // Generate new enemies - increased spawn rate
      if (Math.random() < 0.03) { // Increased from 0.01 to 0.03
        newState.enemies.push(generateEnemy());
      }

      // Check collisions
      checkCollisions(newState);

      return newState;
    });

    // Continue game loop if not over
    gameLoopRef.current = requestAnimationFrame(gameLoop);
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

    console.log('🎨 [BladeBounce] Rendering, gameStarted:', gameData.gameStarted, 'gameState:', gameState);

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Simple test background to verify canvas is working
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Enhanced background with dynamic effects
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    const darkness = Math.min(gameData.score / 100, 0.8);
    gradient.addColorStop(0, `rgba(15, 15, 35, ${darkness})`);
    gradient.addColorStop(0.3, `rgba(25, 25, 50, ${darkness + 0.1})`);
    gradient.addColorStop(0.7, `rgba(10, 10, 25, ${darkness + 0.2})`);
    gradient.addColorStop(1, `rgba(5, 5, 15, ${darkness + 0.3})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Add subtle animated stars
    const time = Date.now() * 0.001;
    for (let i = 0; i < 20; i++) {
      const x = (i * 40) % CANVAS_WIDTH;
      const y = (i * 30) % CANVAS_HEIGHT;
      const twinkle = Math.sin(time + i) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.3})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Show game content even if not started yet (for debugging)
    if (!gameData.gameStarted) {
      // Draw a simple sword in left position when not started
      ctx.save();
      ctx.translate(CANVAS_WIDTH / 3, CANVAS_HEIGHT / 2);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, -20, 60, 40);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, -10, 20, 20);
      ctx.restore();
      
      return;
    }

    if (gameData.gameOver) return;

    // Draw modern silver pillars with gradient and shine effects
    gameData.obstacles.forEach(obstacle => {
      ctx.save();
      
      // Different styling for top pillars
      if (obstacle.isTopPillar) {
        // Create red gradient for top pillars (dangerous)
        const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y);
        gradient.addColorStop(0, '#FF6B6B'); // Light red
        gradient.addColorStop(0.3, '#E53E3E'); // Medium red
        gradient.addColorStop(0.7, '#C53030'); // Darker red
        gradient.addColorStop(1, '#9B2C2C'); // Dark red
        
        ctx.fillStyle = gradient;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add red shine effect
        const shineGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width/3, obstacle.y);
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = shineGradient;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width/3, obstacle.height);
        
        // Add red border
        ctx.strokeStyle = '#7F1D1D';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add warning symbol
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️', obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2 + 4);
      } else {
        // Create modern gradient for regular pillars
        const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y);
        gradient.addColorStop(0, '#E8E8E8'); // Light silver
        gradient.addColorStop(0.3, '#C0C0C0'); // Medium silver
        gradient.addColorStop(0.7, '#A0A0A0'); // Darker silver
        gradient.addColorStop(1, '#808080'); // Dark silver
        
        ctx.fillStyle = gradient;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add metallic shine effect
        const shineGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width/3, obstacle.y);
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = shineGradient;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width/3, obstacle.height);
        
        // Add subtle border
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 1;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Add corner highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(obstacle.x, obstacle.y, 2, 2);
        ctx.fillRect(obstacle.x + obstacle.width - 2, obstacle.y, 2, 2);
      }
      
      ctx.restore();
      
      // DEBUG: Draw obstacle hit box outline
      if (gameData.gameStarted) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }
    });

    // Draw enemies (flashing fireballs with enhanced effects)
    gameData.enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      
      // Calculate flashing effect based on time
      const flashIntensity = Math.sin(Date.now() * 0.01 + enemy.id) * 0.3 + 0.7;
      
      // Create dynamic fireball gradient with flashing
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      gradient.addColorStop(0, `rgba(255, ${Math.floor(69 * flashIntensity)}, 0, 1)`); // Flashing orange center
      gradient.addColorStop(0.3, `rgba(255, ${Math.floor(99 * flashIntensity)}, 71, 1)`); // Flashing tomato
      gradient.addColorStop(0.7, `rgba(220, ${Math.floor(20 * flashIntensity)}, 60, 1)`); // Flashing crimson
      gradient.addColorStop(1, `rgba(139, ${Math.floor(0 * flashIntensity)}, 0, 1)`); // Dark red edge
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      
      // Add pulsing inner core
      const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
      innerGradient.addColorStop(0, `rgba(255, 255, ${Math.floor(100 * flashIntensity)}, 0.8)`);
      innerGradient.addColorStop(1, `rgba(255, 200, 0, 0)`);
      
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Add flame trails
      ctx.fillStyle = `rgba(255, ${Math.floor(165 * flashIntensity)}, 0, 0.6)`;
      ctx.beginPath();
      ctx.ellipse(-8, -3, 6, 3, enemy.angle, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `rgba(255, ${Math.floor(140 * flashIntensity)}, 0, 0.4)`;
      ctx.beginPath();
      ctx.ellipse(-12, 2, 4, 2, enemy.angle, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect
      ctx.shadowColor = `rgba(255, ${Math.floor(100 * flashIntensity)}, 0, 0.8)`;
      ctx.shadowBlur = 15;
      ctx.fillStyle = `rgba(255, ${Math.floor(69 * flashIntensity)}, 0, 0.3)`;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // DEBUG: Draw fireball hit box outline
      if (gameData.gameStarted) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.restore();
    });

    // Draw sword (fixed X position more to the left, Y follows mouse)
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 3, gameData.swordY); // Fixed X at 1/3 from left, Y follows mouse
    ctx.rotate(gameData.swordAngle);
    
    if (swordImage) {
      // Draw sword image with glow effect
      ctx.shadowColor = 'rgba(200, 200, 255, 0.5)';
      ctx.shadowBlur = 10;
      const swordWidth = 40;
      const swordHeight = 80;
      ctx.drawImage(swordImage, -swordWidth/2, -swordHeight/2, swordWidth, swordHeight);
      ctx.shadowBlur = 0;
    } else {
      // Enhanced fallback sword with metallic effects
      // Sword blade with gradient
      const bladeGradient = ctx.createLinearGradient(0, -SWORD_WIDTH/2, SWORD_LENGTH, -SWORD_WIDTH/2);
      bladeGradient.addColorStop(0, '#E8E8E8');
      bladeGradient.addColorStop(0.5, '#C0C0C0');
      bladeGradient.addColorStop(1, '#A0A0A0');
      
      ctx.fillStyle = bladeGradient;
      ctx.fillRect(0, -SWORD_WIDTH/2, SWORD_LENGTH, SWORD_WIDTH);
      
      // Blade edge highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(0, -SWORD_WIDTH/2, SWORD_LENGTH, 1);
      
      // Sword hilt - entire handle is red death section
      const hiltGradient = ctx.createLinearGradient(0, -SWORD_HILT_WIDTH/2, SWORD_HILT_LENGTH, -SWORD_HILT_WIDTH/2);
      hiltGradient.addColorStop(0, '#DC2626'); // Red
      hiltGradient.addColorStop(0.5, '#B91C1C'); // Darker red
      hiltGradient.addColorStop(1, '#991B1B'); // Darkest red
      
      ctx.fillStyle = hiltGradient;
      ctx.fillRect(0, -SWORD_HILT_WIDTH/2, SWORD_HILT_LENGTH, SWORD_HILT_WIDTH);
      
      // Red grip lines for death section
      ctx.fillStyle = '#7F1D1D';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(2 + i * 4, -SWORD_HILT_WIDTH/2, 1, SWORD_HILT_WIDTH);
      }
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
    // Draw enhanced HUD with timer
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Score: ${gameData.score}`, 20, 40);
    ctx.fillText(`Best: ${gameData.bestScore}`, 20, 70);
    
    // Draw timer
    ctx.fillStyle = gameTimer <= 10 ? '#ff4444' : '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText(`Time: ${gameTimer}s`, CANVAS_WIDTH - 150, 40);
    
    // Draw accuracy
    ctx.fillStyle = '#4CAF50';
    ctx.font = '20px Arial';
    const accuracy = gameData.accuracy ?? 100; // Default to 100 if undefined
    ctx.fillText(`Accuracy: ${accuracy.toFixed(1)}%`, CANVAS_WIDTH - 200, 70);
  }, [gameData, swordImage, gameTimer]);

  // Mouse/touch handlers - Only Y axis movement for Flappy Bird style
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Clamp Y position to canvas bounds (keep sword within playable area)
    const clampedY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, mouseY));
    
    setGameData(prev => ({
      ...prev,
      swordY: clampedY,
      mouseY: clampedY
    }));
  }, [gameState]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (gameState !== 'playing') return;
    
    if (e.detail === 2) {
      // Double click - 180° spin
      playSpinSound();
      createLightCurve(gameData.swordX, gameData.swordY, gameData.swordAngle);
      setGameData(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI
      }));
    } else {
      // Single click - add 45° clockwise
      playClickSound();
      createLightCurve(gameData.swordX, gameData.swordY, gameData.swordAngle);
      setGameData(prev => ({
        ...prev,
        swordAngle: prev.swordAngle + Math.PI / 4 // 45 degrees
      }));
    }
  }, [playSpinSound, playClickSound, gameState, createLightCurve]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const mouseY = touch.clientY - rect.top;
    
    // Clamp Y position to canvas bounds (keep sword within playable area)
    const clampedY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, mouseY));

    setGameData(prev => ({
      ...prev,
      swordY: clampedY,
      mouseY: clampedY
    }));
  }, [gameState]);

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
        console.log('🎮 [BladeBounce] Starting game after countdown');
        setGameState('playing');
        // Reset timer and initialize game data
        setGameTimer(60);
        lastTimerUpdateRef.current = Date.now();
        setGameData(prev => ({
          ...prev,
          score: 0,
          gameOver: false,
          gameStarted: true,
          swordX: CANVAS_WIDTH / 3, // Updated to match new position
          swordY: CANVAS_HEIGHT / 2,
          mouseX: CANVAS_WIDTH / 3,
          mouseY: CANVAS_HEIGHT / 2,
          swordAngle: 0,
          accuracy: 100,
          totalHits: 0,
          successfulHits: 0,
          obstacles: [],
          enemies: [],
          particles: [],
          lightCurves: []
        }));
        // Force initial render
        setTimeout(() => render(), 100);
      }
    }
  }, [gameState, countdown, render]);

  // Single game loop effect
  useEffect(() => {
    if (gameState === 'playing') {
      console.log('🎮 [BladeBounce] Game loop starting');
      lastTimeRef.current = performance.now();
      
      // Clear any existing game loop
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      
      const gameLoop = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;

        // Update game state
        setGameData(prev => {
          const newState = { ...prev };

          // Move obstacles (staggered pillars)
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

          // Generate new obstacles (staggered pillars)
          if (Math.random() < 0.015) { // Slightly less frequent for staggered pillars
            const newPillars = generateObstacle();
            newState.obstacles.push(...newPillars);
          }

          // Generate new enemies with increasing spawn rate and time-based scaling
          const timeElapsed = 60 - gameTimer;
          const baseSpawnRate = 0.03; // Increased base spawn rate
          const spawnRateIncrease = gameData.score * 0.002; // Increased spawn rate increase
          const timeMultiplier = Math.floor(timeElapsed / 2) + 1; // Increases every 2 seconds
          const currentSpawnRate = Math.min((baseSpawnRate + spawnRateIncrease) * timeMultiplier, 0.1); // Cap at 10%
          
          if (Math.random() < currentSpawnRate) {
            newState.enemies.push(generateEnemy());
          }

          // Check collisions
          const collisionResult = checkCollisions(newState);
          if (collisionResult) {
            // Update score and accuracy
            newState.score = collisionResult.score;
            newState.gameOver = collisionResult.gameOver;
            newState.totalHits = collisionResult.totalHits;
            newState.successfulHits = collisionResult.successfulHits;
            newState.accuracy = collisionResult.totalHits > 0 ? 
              (collisionResult.successfulHits / collisionResult.totalHits) * 100 : 100;
            
            // Ensure accuracy is always a valid number
            if (isNaN(newState.accuracy) || newState.accuracy === undefined) {
              newState.accuracy = 100;
            }
            
            // Remove hit obstacles
            newState.obstacles = newState.obstacles.filter((_, index) => 
              !collisionResult.obstaclesToRemove.includes(index)
            );
            
            // Remove hit enemies
            newState.enemies = newState.enemies.filter((_, index) => 
              !collisionResult.enemiesToRemove.includes(index)
            );
            
          // Add collision particles
          if (collisionResult.particles) {
            newState.particles = [...newState.particles, ...collisionResult.particles];
          }
        }

        // Countdown timer - update every second, not every frame
        const currentTime = Date.now();
        if (currentTime - lastTimerUpdateRef.current >= 1000) {
          lastTimerUpdateRef.current = currentTime;
          if (gameTimer > 0) {
            setGameTimer(prev => prev - 1);
          } else {
            // Time's up - end game
            newState.gameOver = true;
          }
        }

        return newState;
        });

        // Render
        render();

        // Continue loop
        if (gameState === 'playing' && !gameData.gameOver) {
          gameLoopRef.current = requestAnimationFrame(gameLoop);
        } else {
          console.log('🎮 [BladeBounce] Game loop stopping, gameState:', gameState, 'gameOver:', gameData.gameOver);
        }
      };

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, render, generateObstacle, generateEnemy, checkCollisions]);

  // Handle game over
  useEffect(() => {
    if (gameData.gameOver) {
      console.log('🎮 [BladeBounce] Game over detected:', {
        score: gameData.score,
        accuracy: gameData.accuracy,
        totalHits: gameData.totalHits,
        successfulHits: gameData.successfulHits
      });
      
      // Stop any running game loop
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      
      const newBestScore = Math.max(gameData.score, gameData.bestScore);
      localStorage.setItem('bladeBounceBestScore', newBestScore.toString());
      
      // Calculate final accuracy
      const finalAccuracy = gameData.totalHits > 0 ? 
        (gameData.successfulHits / gameData.totalHits) * 100 : 100;
      
      console.log('🎮 [BladeBounce] Final accuracy calculated:', finalAccuracy);
      
      // Set game state to ended
      setGameState('ended');
      
      setTimeout(() => {
        try {
          console.log('🎮 [BladeBounce] Calling onGameEnd with:', gameData.score, finalAccuracy);
          onGameEnd(gameData.score, finalAccuracy);
        } catch (error) {
          console.error('🎮 [BladeBounce] Error calling onGameEnd:', error);
        }
      }, 2000);
    }
  }, [gameData.gameOver, gameData.score, gameData.accuracy, gameData.totalHits, gameData.successfulHits, onGameEnd]);

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
    console.log('🎮 [BladeBounce] Rendering ended state');
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
            
            {/* Epilepsy Warning */}
            {/* Epilepsy Warning - Enhanced Visibility */}
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
            
            {/* Instructions - Dark Money Green Theme */}
            <div className="text-left text-sm sm:text-base text-white mb-6 sm:mb-8 space-y-4 bg-gradient-to-r from-green-800 to-green-900 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border-2 border-green-600 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-lg font-black">!</span>
                </div>
                <h3 className="text-white font-black text-lg sm:text-xl">SWORD CONTROL:</h3>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Mouse/Touch:</span> Move sword to follow cursor</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Single Click:</span> Rotate sword +45° clockwise</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Double Click:</span> Perform 360° spin attack</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Blade Hits:</span> Block obstacles and enemies for points</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Hilt Hits:</span> Game over! Avoid hitting with handle</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Goal:</span> Survive as long as possible and score points</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-600/30 to-green-500/30 border border-green-400/50 rounded-lg p-3 mt-4">
                <p className="text-xs sm:text-sm text-green-200">
                  <span className="text-green-300 font-bold">💡 Pro Tip:</span> Only the blade edge can block attacks safely. 
                  The hilt (handle) will cause instant game over if it hits anything! (Hit detection is more forgiving now)
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
                className={`${!isCompetitionMode ? 'flex-1' : 'w-full'} bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform text-lg sm:text-xl border-2 border-orange-400 hover:border-orange-300 relative z-20`}
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
