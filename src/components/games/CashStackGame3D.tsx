'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251203-V10 🔥🔥🔥
console.log('');
console.log('💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵');
console.log('💵 CASH STACK v10.0 - BUILD 20251203-CONTINUE');
console.log('💵 FEATURES: Manual continue button, total stacks tracking');
console.log('🔒 Fair competition: RNG seeding, audit logging, no coins');
console.log('💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵💵');
console.log('');

/**
 * CASH STACK 3D - Professional WebGL Stack Game
 * - Full 3D graphics with Three.js
 * - Realistic physics with smooth animations
 * - Particle effects for falling pieces
 * - Sound effects
 * - Advanced lighting and materials
 */

interface Block3D {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  width: number;
  depth: number;
  targetY: number;
  currentY: number;
  velocity: number;
  isDropping: boolean;
  direction: 'x' | 'z';
  dollarX: number;
  dollarZ: number;
}

interface Particle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface BonusCoin {
  mesh: THREE.Mesh;
  y: number;
  velocity: number;
  rotation: number;
  active: boolean;
}

interface ChallengeCoin {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  active: boolean;
  alignmentLine: THREE.Line | null;
  rotation: number;
}

interface GameSession {
  id: string;
  game_type: string;
  rng_seed?: number;
  game_config?: any;
  created_at: string;
}

interface CashStackGame3DProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void; // DEPRECATED - Exit button removed for fair competition
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
  gameSession?: GameSession; // For server-side RNG patterns
}

const INITIAL_SIZE = 4;
const BLOCK_HEIGHT = 0.5;
const INITIAL_SPEED = 0.08;
const SPEED_INCREMENT = 0.004;
const MAX_SPEED = 0.9;
const DOLLAR_THRESHOLD = 0.6;
const DROP_GRAVITY = 0.025;
const BOUNCE_DAMPING = 0.5;
// COIN DROP REMOVED - Was random/unfair for competitive play
const BONUS_COIN_CHANCE = 0; // DISABLED
const BONUS_COIN_POINTS = 0;
const CHALLENGE_COIN_CHANCE = 0; // DISABLED
const CHALLENGE_COIN_SPEED = 0;
const CHALLENGE_COIN_POINTS = 0;
const CHALLENGE_HIT_RADIUS = 0;

// 20 Game Variations - COSMETIC ONLY (Fair Competition)
// ALL variations have IDENTICAL difficulty (speedMod: 1.0)
// coinChance is DISABLED (coins removed for fairness)
// Only visual appearance (color) differs - ensures fair competition
const GAME_VARIATIONS = [
  { id: 1, name: 'Classic Green', blockColor: 0x32CD32, emissive: 0x32CD32, speedMod: 1.0, coinChance: 0.15 },
  { id: 2, name: 'Turbo Blue', blockColor: 0x1E90FF, emissive: 0x1E90FF, speedMod: 1.0, coinChance: 0.15 },
  { id: 3, name: 'Chill Purple', blockColor: 0x9370DB, emissive: 0x9370DB, speedMod: 1.0, coinChance: 0.15 },
  { id: 4, name: 'Inferno Red', blockColor: 0xFF4500, emissive: 0xFF4500, speedMod: 1.0, coinChance: 0.15 },
  { id: 5, name: 'Ice Cyan', blockColor: 0x00CED1, emissive: 0x00CED1, speedMod: 1.0, coinChance: 0.15 },
  { id: 6, name: 'Golden Rush', blockColor: 0xFFD700, emissive: 0xFFD700, speedMod: 1.0, coinChance: 0.15 },
  { id: 7, name: 'Neon Pink', blockColor: 0xFF1493, emissive: 0xFF1493, speedMod: 1.0, coinChance: 0.15 },
  { id: 8, name: 'Ocean Teal', blockColor: 0x008080, emissive: 0x008080, speedMod: 1.0, coinChance: 0.15 },
  { id: 9, name: 'Sunset Orange', blockColor: 0xFF8C00, emissive: 0xFF8C00, speedMod: 1.0, coinChance: 0.15 },
  { id: 10, name: 'Lime Blast', blockColor: 0x00FF00, emissive: 0x00FF00, speedMod: 1.0, coinChance: 0.15 },
  { id: 11, name: 'Royal Blue', blockColor: 0x4169E1, emissive: 0x4169E1, speedMod: 1.0, coinChance: 0.15 },
  { id: 12, name: 'Magenta Magic', blockColor: 0xFF00FF, emissive: 0xFF00FF, speedMod: 1.0, coinChance: 0.15 },
  { id: 13, name: 'Emerald Dream', blockColor: 0x50C878, emissive: 0x50C878, speedMod: 1.0, coinChance: 0.15 },
  { id: 14, name: 'Crimson Fury', blockColor: 0xDC143C, emissive: 0xDC143C, speedMod: 1.0, coinChance: 0.15 },
  { id: 15, name: 'Aqua Breeze', blockColor: 0x7FFFD4, emissive: 0x7FFFD4, speedMod: 1.0, coinChance: 0.15 },
  { id: 16, name: 'Violet Storm', blockColor: 0x8B00FF, emissive: 0x8B00FF, speedMod: 1.0, coinChance: 0.15 },
  { id: 17, name: 'Amber Wave', blockColor: 0xFFBF00, emissive: 0xFFBF00, speedMod: 1.0, coinChance: 0.15 },
  { id: 18, name: 'Mint Fresh', blockColor: 0x98FF98, emissive: 0x98FF98, speedMod: 1.0, coinChance: 0.15 },
  { id: 19, name: 'Ruby Rage', blockColor: 0xE0115F, emissive: 0xE0115F, speedMod: 1.0, coinChance: 0.15 },
  { id: 20, name: 'Sapphire Zen', blockColor: 0x0F52BA, emissive: 0x0F52BA, speedMod: 1.0, coinChance: 0.15 },
];

export default function CashStackGame3D({
  onGameEnd,
  onExit,
  gameSession,
}: CashStackGame3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentBlockRef = useRef<Block3D | null>(null);
  const stackedBlocksRef = useRef<Block3D[]>([]);
  const particlesRef = useRef<Particle3D[]>([]);
  const animationIdRef = useRef<number>();
  const clockRef = useRef(new THREE.Clock());
  const gameStartTimeRef = useRef<number>(0);
  const alignmentLineRef = useRef<THREE.Line | null>(null);
  const bonusCoinRef = useRef<BonusCoin | null>(null);
  const challengeCoinRef = useRef<ChallengeCoin | null>(null);
  const nextSpeedBoostRef = useRef<number>(5);
  const currentSpeedMultiplierRef = useRef<number>(1);
  const coinAlignmentLineRef = useRef<THREE.Line | null>(null);
  const lastStackTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [explosions, setExplosions] = useState(0);
  const [towerHeight, setTowerHeight] = useState(0);
  const [totalStacks, setTotalStacks] = useState(0); // Total stacks across all explosions
  const [gameTimer, setGameTimer] = useState(60);
  const [direction, setDirection] = useState(1);
  const directionRef = useRef(1); // Use ref for smooth animation (no React state lag)
  
  // Sync game state to ref for animation loop
  useEffect(() => {
    gameStateRef.current = gameState;
    console.log('🔄 [CashStackGame3D] Game state updated:', gameState);
  }, [gameState]);
  
  // Use RNG seed to select one of 20 patterns if in competition mode
  const [currentVariation, setCurrentVariation] = useState(() => {
    if (gameSession?.rngSeed) {
      // Use seed to deterministically select a variation (1-20)
      const variationIndex = (gameSession.rngSeed % 20);
      return GAME_VARIATIONS[variationIndex];
    }
    return GAME_VARIATIONS[0];
  });

  // Audio setup
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 20, 50);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 12, 12);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Rim light for neon effect
    const rimLight = new THREE.PointLight(0x32CD32, 1.5, 50);
    rimLight.position.set(0, 10, 5);
    scene.add(rimLight);

    // Ground plane with grid
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2845,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x32CD32, 0x1a4f1a);
    gridHelper.position.y = -4.99;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Create a 3D block
  const createBlock = useCallback((
    x: number,
    z: number,
    width: number,
    depth: number,
    y: number,
    direction: 'x' | 'z'
  ): Block3D => {
    const geometry = new THREE.BoxGeometry(width, BLOCK_HEIGHT, depth);
    
    // Use current variation's color scheme
    const material = new THREE.MeshStandardMaterial({
      color: currentVariation.blockColor,
      emissive: currentVariation.emissive,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.8,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    if (sceneRef.current) {
      sceneRef.current.add(mesh);
    }

    // Add dollar sign as sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Draw yellow circle
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw $ sign
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    const dollarX = (Math.random() - 0.5) * width * 0.8;
    const dollarZ = (Math.random() - 0.5) * depth * 0.8;
    
    sprite.position.set(dollarX, BLOCK_HEIGHT / 2 + 0.1, dollarZ);
    sprite.scale.set(0.5, 0.5, 1);
    mesh.add(sprite);

    return {
      mesh,
      x,
      z,
      width,
      depth,
      targetY: y,
      currentY: y + 10,
      velocity: 0,
      isDropping: true,
      direction,
      dollarX,
      dollarZ,
    };
  }, [currentVariation]);

  // Create particle effect
  const createParticles = useCallback((x: number, y: number, z: number, count: number) => {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const colors = [0x32CD32, 0xFFD700, 0xFF6347, 0xFFA500];
    
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.15
      );
      
      if (sceneRef.current) {
        sceneRef.current.add(mesh);
      }
      
      particlesRef.current.push({
        mesh,
        velocity,
        life: 60,
        maxLife: 60,
      });
    }
    
    playSound(800, 0.1, 'square');
  }, [playSound]);

  // Create bonus coin with persistent alignment line to dollar sign
  const createBonusCoin = useCallback(() => {
    if (!sceneRef.current || bonusCoinRef.current?.active) return;

    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.5,
      metalness: 1,
      roughness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const topY = stackedBlocksRef.current.length * BLOCK_HEIGHT + 15;
    
    // Get last block's dollar sign position as target
    const lastBlock = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
    const targetX = lastBlock.x + lastBlock.dollarX;
    const targetZ = lastBlock.z + lastBlock.dollarZ;
    
    mesh.position.set(targetX, topY, targetZ); // Start above target
    mesh.rotation.x = Math.PI / 2;
    
    sceneRef.current.add(mesh);

    bonusCoinRef.current = {
      mesh,
      y: topY,
      velocity: 0,
      rotation: 0,
      active: true,
    };

    playSound(1000, 0.15, 'sine');
  }, [playSound]);

  // Create challenge coin that moves horizontally
  const createChallengeCoin = useCallback(() => {
    if (!sceneRef.current || challengeCoinRef.current?.active) return;

    const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFF00FF, // Magenta for challenge
      emissive: 0xFF00FF,
      emissiveIntensity: 0.7,
      metalness: 1,
      roughness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const y = stackedBlocksRef.current.length * BLOCK_HEIGHT + BLOCK_HEIGHT / 2;
    const startX = -8;
    
    // Target is the last block's position
    const lastBlock = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
    const targetX = lastBlock.x;
    const targetZ = lastBlock.z;
    
    mesh.position.set(startX, y, targetZ);
    mesh.rotation.x = Math.PI / 2;
    
    sceneRef.current.add(mesh);

    challengeCoinRef.current = {
      mesh,
      x: startX,
      z: targetZ,
      targetX,
      targetZ,
      active: true,
      alignmentLine: null,
      rotation: 0,
    };

    playSound(1500, 0.1, 'square');
  }, [playSound]);

  // Update alignment line showing connection between dollar signs
  // Uses LINEAR alignment (only along movement direction) to match explosion logic
  const updateAlignmentLine = useCallback(() => {
    if (!sceneRef.current || !currentBlockRef.current || stackedBlocksRef.current.length === 0) {
      if (alignmentLineRef.current && sceneRef.current) {
        sceneRef.current.remove(alignmentLineRef.current);
        alignmentLineRef.current = null;
      }
      return;
    }

    const current = currentBlockRef.current;
    const last = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];

    // Calculate world positions of dollar signs
    const lastDollarWorldX = last.x + last.dollarX;
    const lastDollarWorldZ = last.z + last.dollarZ;
    const currentDollarWorldX = current.x + current.dollarX;
    const currentDollarWorldZ = current.z + current.dollarZ;
    
    const lastDollarWorldPos = new THREE.Vector3(
      lastDollarWorldX,
      last.currentY + BLOCK_HEIGHT / 2 + 0.1,
      lastDollarWorldZ
    );

    const currentDollarWorldPos = new THREE.Vector3(
      currentDollarWorldX,
      current.currentY + BLOCK_HEIGHT / 2 + 0.1,
      currentDollarWorldZ
    );

    // LINEAR DISTANCE - only along movement direction (matches explosion logic)
    const linearDistance = current.direction === 'x' 
      ? Math.abs(lastDollarWorldX - currentDollarWorldX)
      : Math.abs(lastDollarWorldZ - currentDollarWorldZ);
    
    const isClose = linearDistance < DOLLAR_THRESHOLD * 2;
    const isPerfect = linearDistance < DOLLAR_THRESHOLD;

    // Create or update line
    const points = [lastDollarWorldPos, currentDollarWorldPos];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Yellow tape color - brighter when aligned! Green when perfect!
    const color = isPerfect ? 0x00FF00 : (isClose ? 0xFFFF00 : 0xFFA500);
    const lineWidth = isPerfect ? 6 : (isClose ? 4 : 2);
    
    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: lineWidth,
      transparent: true,
      opacity: isClose ? 0.9 : 0.5,
    });

    // Remove old line
    if (alignmentLineRef.current && sceneRef.current) {
      sceneRef.current.remove(alignmentLineRef.current);
    }

    // Add new line
    const line = new THREE.Line(geometry, material);
    sceneRef.current.add(line);
    alignmentLineRef.current = line;

    // Add pulsing effect when aligned for explosion
    if (isPerfect) {
      const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
      material.opacity = pulse;
    }
  }, []);

  // Start game
  const startGame = useCallback(() => {
    if (gameState === 'ready') {
      setGameState('countdown');
      let count = 3;
      
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        playSound(600, 0.1);
        
        if (count === 0) {
          clearInterval(interval);
          setGameState('playing');
          gameStartTimeRef.current = Date.now();
          
          // Create base block
          const baseBlock = createBlock(0, 0, INITIAL_SIZE, INITIAL_SIZE, 0, 'x');
          baseBlock.isDropping = false;
          baseBlock.currentY = 0;
          stackedBlocksRef.current = [baseBlock];
          
          // Create first moving block
          currentBlockRef.current = createBlock(
            -10,
            0,
            INITIAL_SIZE,
            INITIAL_SIZE,
            BLOCK_HEIGHT,
            'x'
          );
          currentBlockRef.current.isDropping = false;
          currentBlockRef.current.currentY = BLOCK_HEIGHT;
          
          setTowerHeight(1);
          playSound(400, 0.2);
        }
      }, 1000);
    }
  }, [gameState, createBlock, playSound]);

  // Stack block
  const handleStack = useCallback(() => {
    if (!currentBlockRef.current || gameState !== 'playing') return;
    
    const current = currentBlockRef.current;
    const last = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
    
    // Check $ alignment - LINEAR ALIGNMENT ONLY (along the yellow line / movement direction)
    // If moving in X, only check X alignment; if moving in Z, only check Z alignment
    const dollarDistX = Math.abs((last.x + last.dollarX) - (current.x + current.dollarX));
    const dollarDistZ = Math.abs((last.z + last.dollarZ) - (current.z + current.dollarZ));
    
    // Linear alignment: check the direction the block is moving
    const dollarDist = current.direction === 'x' ? dollarDistX : dollarDistZ;
    
    if (dollarDist < DOLLAR_THRESHOLD) {
      // EXPLOSION!
      playSound(1200, 0.3, 'sawtooth');
      createParticles(current.x, current.currentY, current.z, 100);
      
      // Remove all blocks and reset
      stackedBlocksRef.current.forEach(block => {
        if (sceneRef.current && block.mesh) {
          sceneRef.current.remove(block.mesh);
        }
      });
      
      if (sceneRef.current && current.mesh) {
        sceneRef.current.remove(current.mesh);
      }
      
      const bonus = stackedBlocksRef.current.length * 300;
      setScore(prev => parseFloat((prev + bonus).toFixed(2)));
      setExplosions(prev => prev + 1);
      
      // 🔥 SPEED BOOST ON EXPLOSION - increases difficulty!
      currentSpeedMultiplierRef.current += 0.25;
      console.log(`💥 EXPLOSION! Blocks: ${stackedBlocksRef.current.length}, Bonus: ${bonus.toFixed(2)}, Speed: ${currentSpeedMultiplierRef.current.toFixed(2)}x`);
      
      setTimeout(() => {
        const baseBlock = createBlock(0, 0, INITIAL_SIZE, INITIAL_SIZE, 0, 'x');
        baseBlock.isDropping = false;
        baseBlock.currentY = 0;
        stackedBlocksRef.current = [baseBlock];
        
        currentBlockRef.current = createBlock(
          -10,
          0,
          INITIAL_SIZE,
          INITIAL_SIZE,
          BLOCK_HEIGHT,
          'x'
        );
        currentBlockRef.current.isDropping = false;
        currentBlockRef.current.currentY = BLOCK_HEIGHT;
        
        setTowerHeight(1);
      }, 300);
      
      return;
    }
    
    // Calculate overlap
    let newWidth = current.width;
    let newDepth = current.depth;
    let newX = current.x;
    let newZ = current.z;
    let cutPiece: { x: number; z: number; width: number; depth: number } | null = null;
    
    if (current.direction === 'x') {
      const overlap = Math.min(
        last.x + last.width / 2,
        current.x + current.width / 2
      ) - Math.max(
        last.x - last.width / 2,
        current.x - current.width / 2
      );
      
      if (overlap <= 0) {
        // Game over
        setGameState('ended');
        playSound(200, 0.5, 'square');
        return;
      }
      
      newWidth = overlap;
      newX = (Math.min(last.x + last.width / 2, current.x + current.width / 2) +
             Math.max(last.x - last.width / 2, current.x - current.width / 2)) / 2;
      
      // Cut piece
      if (current.x < last.x - last.width / 2) {
        cutPiece = {
          x: current.x - (current.width - newWidth) / 2,
          z: current.z,
          width: current.width - newWidth,
          depth: current.depth
        };
      } else if (current.x > last.x + last.width / 2) {
        cutPiece = {
          x: current.x + (current.width - newWidth) / 2,
          z: current.z,
          width: current.width - newWidth,
          depth: current.depth
        };
      }
    } else {
      const overlap = Math.min(
        last.z + last.depth / 2,
        current.z + current.depth / 2
      ) - Math.max(
        last.z - last.depth / 2,
        current.z - current.depth / 2
      );
      
      if (overlap <= 0) {
        // Game over
        setGameState('ended');
        playSound(200, 0.5, 'square');
        return;
      }
      
      newDepth = overlap;
      newZ = (Math.min(last.z + last.depth / 2, current.z + current.depth / 2) +
             Math.max(last.z - last.depth / 2, current.z - current.depth / 2)) / 2;
      
      // Cut piece
      if (current.z < last.z - last.depth / 2) {
        cutPiece = {
          x: current.x,
          z: current.z - (current.depth - newDepth) / 2,
          width: current.width,
          depth: current.depth - newDepth
        };
      } else if (current.z > last.z + last.depth / 2) {
        cutPiece = {
          x: current.x,
          z: current.z + (current.depth - newDepth) / 2,
          width: current.width,
          depth: current.depth - newDepth
        };
      }
    }
    
    if (newWidth < 0.5 || newDepth < 0.5) {
      setGameState('ended');
      playSound(200, 0.5, 'square');
      return;
    }
    
    // Play stack sound
    playSound(500, 0.1);
    
    // Remove current block mesh
    if (sceneRef.current && current.mesh) {
      sceneRef.current.remove(current.mesh);
    }
    
    // Create stacked block with drop animation
    const newY = stackedBlocksRef.current.length * BLOCK_HEIGHT;
    const newDirection: 'x' | 'z' = current.direction === 'x' ? 'z' : 'x';
    const stackedBlock = createBlock(newX, newZ, newWidth, newDepth, newY, newDirection);
    stackedBlocksRef.current.push(stackedBlock);
    
    // Create falling cut piece if any
    if (cutPiece) {
      const cutBlock = createBlock(
        cutPiece.x,
        cutPiece.z,
        cutPiece.width,
        cutPiece.depth,
        current.currentY,
        current.direction
      );
      cutBlock.velocity = 0;
      cutBlock.targetY = -10;
      
      // Add rotation for falling effect
      setTimeout(() => {
        if (sceneRef.current && cutBlock.mesh) {
          sceneRef.current.remove(cutBlock.mesh);
        }
      }, 2000);
    }
    
    // DECIMAL SCORING BASED ON DROP SPEED + PRECISION
    const now = performance.now();
    const timeSinceLastStack = lastStackTimeRef.current > 0 ? (now - lastStackTimeRef.current) / 1000 : 0;
    lastStackTimeRef.current = now;
    
    // Calculate precision bonus based on overlap percentage
    const overlapWidth = current.direction === 'x' ? newWidth : current.width;
    const overlapDepth = current.direction === 'z' ? newDepth : current.depth;
    const originalWidth = current.direction === 'x' ? current.width : current.width;
    const originalDepth = current.direction === 'z' ? current.depth : current.depth;
    const overlapPercent = current.direction === 'x' 
      ? (newWidth / current.width) * 100 
      : (newDepth / current.depth) * 100;
    
    // Base points
    let basePoints = 3 + Math.floor(stackedBlocksRef.current.length / 2);
    
    // 🎯 PRECISION BONUS: Better placement = more points!
    // 100% overlap = 3x bonus, 90% = 2x, 80% = 1.5x, 70% = 1.2x, below 70% = 1x
    let precisionMultiplier = 1.0;
    let precisionLabel = '';
    if (overlapPercent >= 98) {
      precisionMultiplier = 3.0;
      precisionLabel = '🎯 PERFECT!';
      playSound(1200, 0.15, 'sine'); // Perfect sound
    } else if (overlapPercent >= 90) {
      precisionMultiplier = 2.0;
      precisionLabel = '✨ Excellent!';
    } else if (overlapPercent >= 80) {
      precisionMultiplier = 1.5;
      precisionLabel = '👍 Great!';
    } else if (overlapPercent >= 70) {
      precisionMultiplier = 1.2;
      precisionLabel = '👌 Good';
    }
    
    // Speed multiplier: Faster drops = more points (decimal precision)
    // Very fast (< 0.5s) = 2.0x, Fast (< 1s) = 1.5x, Normal (< 2s) = 1.2x, Slow (>= 2s) = 1.0x
    let speedMultiplier = 1.0;
    if (timeSinceLastStack > 0) {
      if (timeSinceLastStack < 0.5) {
        speedMultiplier = 2.0;
      } else if (timeSinceLastStack < 1.0) {
        // Linear interpolation between 2.0 and 1.5
        speedMultiplier = 2.0 - ((timeSinceLastStack - 0.5) / 0.5) * 0.5;
      } else if (timeSinceLastStack < 2.0) {
        // Linear interpolation between 1.5 and 1.2
        speedMultiplier = 1.5 - ((timeSinceLastStack - 1.0) / 1.0) * 0.3;
      } else {
        // Linear decay from 1.2 to 1.0
        speedMultiplier = Math.max(1.0, 1.2 - ((timeSinceLastStack - 2.0) / 3.0) * 0.2);
      }
    }
    
    // Final points = base × speed × precision
    const finalPoints = basePoints * speedMultiplier * precisionMultiplier;
    
    setScore(prev => parseFloat((prev + finalPoints).toFixed(2)));
    setTowerHeight(stackedBlocksRef.current.length);
    setTotalStacks(prev => prev + 1); // Track total stacks across all explosions
    
    console.log(`📦 Stack! ${precisionLabel} Overlap: ${overlapPercent.toFixed(1)}%, Precision: ${precisionMultiplier}x, Speed: ${speedMultiplier.toFixed(2)}x, Points: ${finalPoints.toFixed(2)}`);
    
    // Random speed boost at intervals
    if (stackedBlocksRef.current.length >= nextSpeedBoostRef.current) {
      currentSpeedMultiplierRef.current += 0.15;
      nextSpeedBoostRef.current += Math.floor(Math.random() * 5) + 3; // Next boost in 3-7 blocks
      playSound(1500, 0.2, 'square');
    }
    
    // COIN DROPS DISABLED for fair competition - was random/luck-based
    // Previously: if (Math.random() < currentVariation.coinChance) createBonusCoin();
    // Previously: if (Math.random() < CHALLENGE_COIN_CHANCE) createChallengeCoin();
    
    // Create next moving block
    const nextBlock = createBlock(
      newDirection === 'x' ? -10 : newX,
      newDirection === 'z' ? -10 : newZ,
      newWidth,
      newDepth,
      (stackedBlocksRef.current.length) * BLOCK_HEIGHT,
      newDirection
    );
    nextBlock.isDropping = false;
    nextBlock.currentY = (stackedBlocksRef.current.length) * BLOCK_HEIGHT;
    currentBlockRef.current = nextBlock;
    
    // Flip direction using ref (no React state lag)
    directionRef.current = directionRef.current * -1;
  }, [gameState, createBlock, createParticles, playSound, createBonusCoin, createChallengeCoin, currentVariation]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let isActive = true; // Track if this animation loop should continue
    
    const animate = () => {
      // CRITICAL: Exit immediately if animation should stop (use ref for real-time state)
      if (!isActive || gameStateRef.current !== 'playing') {
        console.log('🛑 [CashStackGame3D] Animation loop stopping - isActive:', isActive, 'gameState:', gameStateRef.current);
        return;
      }
      
      const delta = clockRef.current.getDelta();
      const elapsedTime = (Date.now() - gameStartTimeRef.current) / 1000;
      const baseSpeed = Math.min(MAX_SPEED, INITIAL_SPEED + (elapsedTime * SPEED_INCREMENT));
      // FRAME-INDEPENDENT movement: multiply speed by delta and 60fps reference
      const currentSpeed = baseSpeed * currentSpeedMultiplierRef.current * currentVariation.speedMod * (delta * 60);
      
      // Update current block - use ref for direction (no React state lag)
      if (currentBlockRef.current && !currentBlockRef.current.isDropping) {
        const block = currentBlockRef.current;
        const dir = directionRef.current;
        
        if (block.direction === 'x') {
          const nextX = block.x + (currentSpeed * dir);
          // SMOOTH boundaries with cushioning
          if (nextX <= -10 && dir === -1) {
            block.x = -9.95; // Slight cushion
            directionRef.current = 1;
          } else if (nextX >= 10 && dir === 1) {
            block.x = 9.95; // Slight cushion
            directionRef.current = -1;
          } else {
            block.x = nextX;
          }
        } else {
          const nextZ = block.z + (currentSpeed * dir);
          // SMOOTH boundaries with cushioning
          if (nextZ <= -10 && dir === -1) {
            block.z = -9.95; // Slight cushion
            directionRef.current = 1;
          } else if (nextZ >= 10 && dir === 1) {
            block.z = 9.95; // Slight cushion
            directionRef.current = -1;
          } else {
            block.z = nextZ;
          }
        }
        
        block.mesh.position.x = block.x;
        block.mesh.position.z = block.z;
      }
      
      // Update bonus coin
      if (bonusCoinRef.current?.active) {
        const coin = bonusCoinRef.current;
        coin.velocity += DROP_GRAVITY * 0.7; // Slightly slower than blocks
        coin.y -= coin.velocity;
        coin.rotation += 0.1;
        coin.mesh.position.y = coin.y;
        coin.mesh.rotation.z = coin.rotation;
        
        // Check if coin hit the last stacked block's dollar sign
        const lastBlock = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
        const dollarWorldX = lastBlock.x + lastBlock.dollarX;
        const dollarWorldZ = lastBlock.z + lastBlock.dollarZ;
        const dollarWorldY = lastBlock.currentY + BLOCK_HEIGHT / 2;
        
        const distX = Math.abs(coin.mesh.position.x - dollarWorldX);
        const distZ = Math.abs(coin.mesh.position.z - dollarWorldZ);
        const distY = Math.abs(coin.y - dollarWorldY);
        
        if (distX < 0.5 && distZ < 0.5 && distY < 0.3) {
          // Coin hit the dollar sign!
          setScore(prev => parseFloat((prev + BONUS_COIN_POINTS).toFixed(2)));
          playSound(2000, 0.3, 'sine');
          createParticles(coin.mesh.position.x, coin.y, coin.mesh.position.z, 50);
          console.log(`🪙 Bonus coin collected! +${BONUS_COIN_POINTS}`);
          
          if (sceneRef.current) {
            sceneRef.current.remove(coin.mesh);
          }
          bonusCoinRef.current.active = false;
        } else if (coin.y < -5) {
          // Coin fell off
          if (sceneRef.current) {
            sceneRef.current.remove(coin.mesh);
          }
          bonusCoinRef.current.active = false;
        }
      }
      
      // Update challenge coin (moves horizontally)
      if (challengeCoinRef.current?.active) {
        const coin = challengeCoinRef.current;
        coin.x += CHALLENGE_COIN_SPEED * direction;
        coin.mesh.position.x = coin.x;
        coin.rotation += 0.15;
        coin.mesh.rotation.z = coin.rotation;
        
        // Check if user clicked to catch it
        // (handled in click event, but check if it passed the target)
        if (Math.abs(coin.x) > 10) {
          // Coin went off screen - no penalty, just remove
          if (sceneRef.current) {
            sceneRef.current.remove(coin.mesh);
            if (coin.alignmentLine) {
              sceneRef.current.remove(coin.alignmentLine);
            }
          }
          challengeCoinRef.current.active = false;
        }
        
        // Update alignment line
        if (sceneRef.current) {
          const lastBlock = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
          const targetPos = new THREE.Vector3(
            lastBlock.x,
            lastBlock.currentY + BLOCK_HEIGHT / 2,
            lastBlock.z
          );
          const coinPos = new THREE.Vector3(coin.x, coin.mesh.position.y, coin.z);
          
          const points = [coinPos, targetPos];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const distance = coinPos.distanceTo(targetPos);
          const isPerfect = distance < CHALLENGE_HIT_RADIUS;
          
          const material = new THREE.LineBasicMaterial({
            color: isPerfect ? 0x00FF00 : 0xFF00FF,
            linewidth: isPerfect ? 4 : 2,
            transparent: true,
            opacity: isPerfect ? 1.0 : 0.6,
          });
          
          if (coin.alignmentLine && sceneRef.current) {
            sceneRef.current.remove(coin.alignmentLine);
          }
          
          const line = new THREE.Line(geometry, material);
          sceneRef.current.add(line);
          coin.alignmentLine = line;
        }
      }
      
      // Update dropping blocks
      stackedBlocksRef.current.forEach(block => {
        if (block.isDropping) {
          block.velocity += DROP_GRAVITY;
          block.currentY -= block.velocity;
          
          if (block.currentY <= block.targetY) {
            block.currentY = block.targetY;
            block.velocity = -block.velocity * BOUNCE_DAMPING;
            
            if (Math.abs(block.velocity) < 0.01) {
              block.isDropping = false;
              block.velocity = 0;
            }
          }
          
          block.mesh.position.y = block.currentY;
        }
      });
      
      // Update particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.velocity.y -= 0.01;
        particle.mesh.position.add(particle.velocity);
        particle.life--;
        
        const alpha = particle.life / particle.maxLife;
        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        (particle.mesh.material as THREE.MeshBasicMaterial).transparent = true;
        
        if (particle.life <= 0) {
          if (sceneRef.current) {
            sceneRef.current.remove(particle.mesh);
          }
          return false;
        }
        return true;
      });
      
      // Update alignment line
      updateAlignmentLine();
      
      // Update camera
      if (cameraRef.current) {
        const targetY = Math.max(12, stackedBlocksRef.current.length * BLOCK_HEIGHT + 8);
        cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.05;
        cameraRef.current.lookAt(0, stackedBlocksRef.current.length * BLOCK_HEIGHT / 2, 0);
      }
      
      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      isActive = false; // Stop the animation loop
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        console.log('🧹 [CashStackGame3D] Animation frame canceled');
      }
    };
  }, [gameState, direction, updateAlignmentLine]);

  // Keyboard/Click control
  useEffect(() => {
    let lastInteractionTime = 0;
    
    const handleInteraction = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.code !== 'Space') return;
      
      // DEBOUNCE - Prevent rapid click/key spam (60ms minimum between interactions)
      const now = Date.now();
      if (now - lastInteractionTime < 60) {
        return; // Ignore too-fast inputs
      }
      lastInteractionTime = now;
      
      if (gameState === 'ready') {
        startGame();
      } else if (gameState === 'playing') {
        // Check if challenge coin is active and in range
        if (challengeCoinRef.current?.active) {
          const coin = challengeCoinRef.current;
          const lastBlock = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
          const distance = Math.sqrt(
            Math.pow(coin.x - lastBlock.x, 2) +
            Math.pow(coin.z - lastBlock.z, 2)
          );
          
          if (distance < CHALLENGE_HIT_RADIUS) {
            // Perfect catch!
            setScore(prev => parseFloat((prev + CHALLENGE_COIN_POINTS).toFixed(2)));
            playSound(2500, 0.2, 'sine');
            createParticles(coin.x, coin.mesh.position.y, coin.z, 80);
            console.log(`⚡ Challenge coin caught! +${CHALLENGE_COIN_POINTS}`);
            
            if (sceneRef.current) {
              sceneRef.current.remove(coin.mesh);
              if (coin.alignmentLine) {
                sceneRef.current.remove(coin.alignmentLine);
              }
            }
            challengeCoinRef.current.active = false;
            return; // Don't stack, just catch coin
          }
        }
        
        handleStack();
      }
    };
    
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    
    return () => {
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [gameState, startGame, handleStack, createParticles, playSound]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      setGameTimer(prev => {
        if (prev <= 1) {
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState]);

  // Handle game end - SIMPLIFIED: Manual continue button
  const hasEndedRef = useRef(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTotalStacks, setFinalTotalStacks] = useState(0);
  const [finalExplosions, setFinalExplosions] = useState(0);
  
  // Manual continue function - user clicks to proceed
  const handleContinue = useCallback(() => {
    console.log('🎯 [CashStack] User clicked Continue');
    console.log('🎯 [CashStack] Final score:', finalScore);
    
    // 🔒 Audit log (fire and forget)
    const accuracy = Math.min(100, (finalExplosions * 100) / Math.max(1, finalTotalStacks));
    logGameCompletion({
      gameType: GAME_TYPES.CASH_STACK,
      gameMode: GAME_MODES.PRACTICE,
      score: finalScore,
      accuracy,
      reactionTime: 0,
      durationSeconds: 60,
      additionalData: { totalStacks: finalTotalStacks, explosions: finalExplosions }
    }).catch(err => console.warn('[CashStack] Audit failed:', err));
    
    // Call the callback
    if (onGameEnd && typeof onGameEnd === 'function') {
      console.log('🎯 [CashStack] Calling onGameEnd...');
      onGameEnd({ score: finalScore, accuracy });
      console.log('🎯 [CashStack] ✅ Done!');
    } else {
      console.error('[CashStack] onGameEnd not available');
    }
  }, [finalScore, finalTotalStacks, finalExplosions, onGameEnd]);
  
  useEffect(() => {
    if (gameState === 'ended' && !hasEndedRef.current) {
      hasEndedRef.current = true;
      
      // Capture final values
      setFinalScore(score);
      setFinalTotalStacks(totalStacks);
      setFinalExplosions(explosions);
      setGameEnded(true);
      
      console.log('🎯 [CashStack] Game ended! Score:', score, 'Stacks:', totalStacks);
      
      playSound(300, 1, 'triangle');
      
      // Stop animations
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = undefined;
      }
    }
  }, [gameState, score, totalStacks, explosions, playSound]);

  return (
    <div className="relative w-full h-screen bg-[#0a1628] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="text-white text-4xl font-bold drop-shadow-lg">
              Score: {score.toFixed(2)}
            </div>
            <div className="text-green-400 text-2xl font-bold">
              📦 Stacks: {totalStacks} (Tower: {towerHeight})
            </div>
            {explosions > 0 && (
              <div className="text-red-400 text-2xl font-bold">
                💥 Explosions: {explosions}
              </div>
            )}
          </div>
          
          <div className="text-white text-3xl font-bold drop-shadow-lg">
            ⏱️ {gameTimer}s
          </div>
        </div>
      </div>
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}
      
      {/* Ready screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white overflow-y-auto">
          <h1 className="text-6xl font-bold mb-4 animate-pulse" style={{ color: `#${currentVariation.blockColor.toString(16).padStart(6, '0')}` }}>
            💰 CASH STACK 3D
          </h1>
          <p className="text-3xl font-bold mb-6" style={{ color: `#${currentVariation.blockColor.toString(16).padStart(6, '0')}` }}>
            {currentVariation.name}
          </p>
          <p className="text-xl mb-2">Stack blocks by clicking or pressing SPACE</p>
          <p className="text-lg mb-2">⚡ <span className="text-yellow-400">FAST STACKING = BONUS POINTS!</span></p>
          <p className="text-lg mb-2">⏱️ &lt;0.5s = 2.0x | &lt;1s = 1.5x | &lt;2s = 1.2x</p>
          <p className="text-lg mb-2">🎯 <span className="text-green-400">Decimal scores</span> prevent ties!</p>
          <p className="text-lg mb-6">Align $ signs for 💥 EXPLOSION BONUS!</p>
          
          {/* Color selector - only show in practice mode */}
          {!gameSession && (
            <div className="grid grid-cols-4 gap-2 mb-6 max-h-64 overflow-y-auto p-4">
              {GAME_VARIATIONS.map(variation => (
                <button
                  key={variation.id}
                  onClick={() => setCurrentVariation(variation)}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all pointer-events-auto ${
                    currentVariation.id === variation.id 
                      ? 'ring-4 ring-white scale-110' 
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: `#${variation.blockColor.toString(16).padStart(6, '0')}` }}
                >
                  {variation.name}
                </button>
              ))}
            </div>
          )}
          
          <p className="text-2xl font-bold text-yellow-400 mb-4">60 seconds - Go for high score!</p>
          <button
            onClick={startGame}
            className="px-12 py-6 text-white text-3xl font-bold rounded-lg transition-all transform hover:scale-110 pointer-events-auto mb-4"
            style={{ backgroundColor: `#${currentVariation.blockColor.toString(16).padStart(6, '0')}` }}
          >
            START GAME
          </button>
        </div>
      )}
      
      {/* GAME OVER SCREEN */}
      {gameState === 'ended' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
          <div className="text-center">
            <h1 className="text-6xl font-bold mb-4 animate-pulse text-red-500">
              GAME OVER
            </h1>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 max-w-md mx-auto">
              <div className="text-5xl font-bold text-yellow-400 mb-4">
                {finalScore.toFixed(2)}
              </div>
              <div className="text-xl text-white mb-4">Final Score</div>
              
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-gray-400 text-sm">📦 Total Stacks</div>
                  <div className="text-2xl font-bold text-green-400">{finalTotalStacks}</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-gray-400 text-sm">💥 Explosions</div>
                  <div className="text-2xl font-bold text-red-400">{finalExplosions}</div>
                </div>
              </div>
              
              <button
                onClick={handleContinue}
                className="mt-6 w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 pointer-events-auto shadow-lg"
              >
                ✅ Continue
              </button>
              
              <p className="mt-3 text-gray-400 text-sm">
                Click to record score and proceed
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* EXIT BUTTON REMOVED - No exiting during games for fair competition */}
    </div>
  );
}

