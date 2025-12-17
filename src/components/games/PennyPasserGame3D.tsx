'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface CoinSorterGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
  competitionId?: string;
}

type CoinType = 'penny' | 'nickel' | 'dime' | 'quarter';
type QuadrantColor = 'cyan' | 'green' | 'purple' | 'red';

interface Coin {
  id: number;
  type: CoinType;
  mesh: THREE.Group;
  x: number;
  y: number;
  isColorCoin: boolean; // Special colored coins match by color
  colorMatch?: QuadrantColor; // If color coin, which quadrant color to match
  isDragging: boolean;
  sorted: boolean;
}

interface Quadrant {
  color: QuadrantColor;
  coinType: CoinType;
  mesh: THREE.Mesh;
  targetMesh: THREE.Mesh; // Bonus zone
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  hexColor: number;
  bonusShapes: THREE.Mesh[];
  matchCount: number;
}

// Coin appearance configurations
const COIN_CONFIGS = {
  penny: { color: 0xB87333, radius: 0.4, thickness: 0.08, value: 1 },
  nickel: { color: 0xC0C0C0, radius: 0.5, thickness: 0.1, value: 5 },
  dime: { color: 0xE8E8E8, radius: 0.35, thickness: 0.06, value: 10 },
  quarter: { color: 0xD4D4D4, radius: 0.6, thickness: 0.12, value: 25 }
};

// Quadrant configurations - neon colors
const QUADRANT_COLORS = {
  cyan: 0x00FFFF,
  green: 0x00FF00,
  purple: 0xFF00FF,
  red: 0xFF0000
};

// Seeded random number generator
class Mulberry32 {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export default function PennyPasserGame3D({ 
  onGameEnd, 
  gameMode = 'practice',
  rngSeed,
  competitionId 
}: CoinSorterGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  
  const scoreRef = useRef(0);
  const coinsRef = useRef<Coin[]>([]);
  const quadrantsRef = useRef<Quadrant[]>([]);
  const draggedCoinRef = useRef<Coin | null>(null);
  const lastCoinIdRef = useRef(0);
  const totalCoinsRef = useRef(0);
  const correctSortsRef = useRef(0);
  const comboRef = useRef(0);
  const gameStartTimeRef = useRef(0);
  const rngRef = useRef<Mulberry32 | null>(null);
  
  // Initialize seeded RNG
  useEffect(() => {
    if (rngSeed !== undefined) {
      rngRef.current = new Mulberry32(rngSeed);
    }
  }, [rngSeed]);
  
  const getRandom = useCallback(() => {
    return rngRef.current ? rngRef.current.next() : Math.random();
  }, []);

  // Create realistic 3D coin mesh
  const createCoinMesh = useCallback((type: CoinType, isColorCoin: boolean, colorMatch?: QuadrantColor): THREE.Group => {
    const config = COIN_CONFIGS[type];
    const group = new THREE.Group();
    
    // Determine coin color
    let coinColor = config.color;
    if (isColorCoin && colorMatch) {
      coinColor = QUADRANT_COLORS[colorMatch];
    }
    
    // Main coin body (cylinder)
    const coinGeometry = new THREE.CylinderGeometry(config.radius, config.radius, config.thickness, 32);
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: coinColor,
      metalness: 0.8,
      roughness: 0.2,
      emissive: isColorCoin ? coinColor : 0x000000,
      emissiveIntensity: isColorCoin ? 0.3 : 0
    });
    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    coinMesh.rotation.x = Math.PI / 2; // Lay flat
    group.add(coinMesh);
    
    // Coin rim (torus for edge detail)
    const rimGeometry = new THREE.TorusGeometry(config.radius, config.thickness / 4, 8, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: isColorCoin ? coinColor : (coinColor * 0.8),
      metalness: 0.9,
      roughness: 0.1
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.rotation.x = Math.PI / 2;
    group.add(rimMesh);
    
    // Face detail - coin symbol/text
    const faceGeometry = new THREE.CircleGeometry(config.radius * 0.7, 32);
    const faceMaterial = new THREE.MeshStandardMaterial({
      color: isColorCoin ? 0xFFFFFF : (coinColor * 1.2),
      metalness: 0.6,
      roughness: 0.4
    });
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    faceMesh.position.z = config.thickness / 2 + 0.01;
    group.add(faceMesh);
    
    // Add coin letter/symbol
    const letterGeometry = new THREE.RingGeometry(config.radius * 0.2, config.radius * 0.35, 16);
    const letterMaterial = new THREE.MeshBasicMaterial({
      color: isColorCoin ? coinColor : 0x333333,
      side: THREE.DoubleSide
    });
    const letterMesh = new THREE.Mesh(letterGeometry, letterMaterial);
    letterMesh.position.z = config.thickness / 2 + 0.02;
    group.add(letterMesh);
    
    // Glow effect for color coins
    if (isColorCoin) {
      const glowGeometry = new THREE.CircleGeometry(config.radius * 1.3, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: coinColor,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.z = -0.1;
      group.add(glowMesh);
    }
    
    return group;
  }, []);

  // Create quadrant with neon glow
  const createQuadrant = useCallback((
    color: QuadrantColor,
    coinType: CoinType,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): Quadrant => {
    const hexColor = QUADRANT_COLORS[color];
    
    // Main quadrant plane
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(centerX, centerY, -0.5);
    
    // Border glow
    const borderGeometry = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: hexColor,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.position.set(centerX, centerY, -0.4);
    sceneRef.current?.add(border);
    
    // Target zone (bonus area) - center of quadrant
    const targetGeometry = new THREE.CircleGeometry(1.2, 32);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
    targetMesh.position.set(centerX, centerY, -0.3);
    
    // Add pulsing ring around target
    const ringGeometry = new THREE.RingGeometry(1.0, 1.3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.set(centerX, centerY, -0.2);
    sceneRef.current?.add(ringMesh);
    
    // Create bonus shapes (10 per quadrant)
    const bonusShapes: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const shapeType = Math.floor(Math.random() * 4);
      let shapeGeometry: THREE.BufferGeometry;
      
      switch (shapeType) {
        case 0: // Triangle
          shapeGeometry = new THREE.CircleGeometry(0.15, 3);
          break;
        case 1: // Square
          shapeGeometry = new THREE.PlaneGeometry(0.25, 0.25);
          break;
        case 2: // Pentagon
          shapeGeometry = new THREE.CircleGeometry(0.15, 5);
          break;
        default: // Circle
          shapeGeometry = new THREE.CircleGeometry(0.12, 16);
      }
      
      const shapeMaterial = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.5
      });
      const shapeMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
      
      // Random position within quadrant
      const offsetX = (Math.random() - 0.5) * (width * 0.8);
      const offsetY = (Math.random() - 0.5) * (height * 0.8);
      shapeMesh.position.set(centerX + offsetX, centerY + offsetY, -0.1);
      shapeMesh.visible = false; // Hidden until activated
      
      sceneRef.current?.add(shapeMesh);
      bonusShapes.push(shapeMesh);
    }
    
    return {
      color,
      coinType,
      mesh,
      targetMesh,
      bounds: {
        minX: centerX - width / 2,
        maxX: centerX + width / 2,
        minY: centerY - height / 2,
        maxY: centerY + height / 2
      },
      hexColor,
      bonusShapes,
      matchCount: 0
    };
  }, []);

  // Spawn a new coin
  const spawnCoin = useCallback(() => {
    if (!sceneRef.current) return;
    
    const coinTypes: CoinType[] = ['penny', 'nickel', 'dime', 'quarter'];
    const quadrantColors: QuadrantColor[] = ['cyan', 'green', 'purple', 'red'];
    
    // 15% chance for color coin
    const isColorCoin = getRandom() < 0.15;
    const coinType = coinTypes[Math.floor(getRandom() * coinTypes.length)];
    const colorMatch = isColorCoin ? quadrantColors[Math.floor(getRandom() * quadrantColors.length)] : undefined;
    
    const coinMesh = createCoinMesh(coinType, isColorCoin, colorMatch);
    
    // Spawn in center area with some randomness
    const x = (getRandom() - 0.5) * 3;
    const y = (getRandom() - 0.5) * 3;
    coinMesh.position.set(x, y, 0);
    
    const coin: Coin = {
      id: ++lastCoinIdRef.current,
      type: coinType,
      mesh: coinMesh,
      x,
      y,
      isColorCoin,
      colorMatch,
      isDragging: false,
      sorted: false
    };
    
    sceneRef.current.add(coinMesh);
    coinsRef.current.push(coin);
    totalCoinsRef.current++;
    
    return coin;
  }, [createCoinMesh, getRandom]);

  // Check if coin is in correct quadrant
  const checkCoinPlacement = useCallback((coin: Coin, x: number, y: number): { correct: boolean; bonus: boolean; quadrant: Quadrant | null } => {
    for (const quadrant of quadrantsRef.current) {
      if (x >= quadrant.bounds.minX && x <= quadrant.bounds.maxX &&
          y >= quadrant.bounds.minY && y <= quadrant.bounds.maxY) {
        
        let isCorrect = false;
        
        if (coin.isColorCoin && coin.colorMatch) {
          // Color coins match by color
          isCorrect = coin.colorMatch === quadrant.color;
        } else {
          // Regular coins match by type
          isCorrect = coin.type === quadrant.coinType;
        }
        
        // Check if in bonus zone (center target)
        const targetX = (quadrant.bounds.minX + quadrant.bounds.maxX) / 2;
        const targetY = (quadrant.bounds.minY + quadrant.bounds.maxY) / 2;
        const distanceToTarget = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
        const isBonus = distanceToTarget < 1.2;
        
        return { correct: isCorrect, bonus: isBonus && isCorrect, quadrant };
      }
    }
    
    return { correct: false, bonus: false, quadrant: null };
  }, []);

  // Handle coin drop
  const handleCoinDrop = useCallback((coin: Coin) => {
    const result = checkCoinPlacement(coin, coin.x, coin.y);
    
    if (result.correct) {
      correctSortsRef.current++;
      comboRef.current++;
      setCombo(comboRef.current);
      
      // Base points based on coin value
      const coinValue = COIN_CONFIGS[coin.type].value;
      let points = coinValue * 10;
      
      // Combo multiplier
      const comboMultiplier = Math.min(5, 1 + comboRef.current * 0.2);
      points = Math.floor(points * comboMultiplier);
      
      // Bonus for exact placement
      if (result.bonus) {
        points += 100;
        
        // Show bonus shape
        if (result.quadrant && result.quadrant.matchCount < 10) {
          const shapeIndex = result.quadrant.matchCount;
          if (result.quadrant.bonusShapes[shapeIndex]) {
            result.quadrant.bonusShapes[shapeIndex].visible = true;
          }
          result.quadrant.matchCount++;
        }
      }
      
      // Color coin bonus
      if (coin.isColorCoin) {
        points += 50;
      }
      
      // Speed bonus (faster = more points)
      const gameTime = (Date.now() - gameStartTimeRef.current) / 1000;
      const speedBonus = Math.max(0, Math.floor(20 - gameTime / 3));
      points += speedBonus;
      
      scoreRef.current += points;
      setScore(scoreRef.current);
      
      // Visual feedback - coin disappears with effect
      if (coin.mesh) {
        const originalScale = coin.mesh.scale.clone();
        
        // Animate scale up then remove
        let frame = 0;
        const animateDisappear = () => {
          frame++;
          if (frame < 10) {
            coin.mesh.scale.multiplyScalar(1.1);
            coin.mesh.rotation.z += 0.3;
            requestAnimationFrame(animateDisappear);
          } else {
            sceneRef.current?.remove(coin.mesh);
          }
        };
        animateDisappear();
      }
      
      coin.sorted = true;
    } else {
      // Wrong placement - reset combo
      comboRef.current = 0;
      setCombo(0);
      
      // Return coin to center
      coin.x = (getRandom() - 0.5) * 3;
      coin.y = (getRandom() - 0.5) * 3;
      coin.mesh.position.set(coin.x, coin.y, 0);
      
      // Penalty
      scoreRef.current = Math.max(0, scoreRef.current - 10);
      setScore(scoreRef.current);
    }
    
    // Update accuracy
    if (totalCoinsRef.current > 0) {
      const newAccuracy = (correctSortsRef.current / totalCoinsRef.current) * 100;
      setAccuracy(newAccuracy);
    }
    
    coin.isDragging = false;
    draggedCoinRef.current = null;
  }, [checkCoinPlacement, getRandom]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;
    
    // Camera (orthographic for 2D-like view)
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const frustumSize = 15;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    camera.position.z = 10;
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);
    
    // Create 4 quadrants
    const quadrantWidth = 6;
    const quadrantHeight = 5;
    const offset = 4;
    
    // Top-Left: CYAN (Penny)
    const cyanQuadrant = createQuadrant('cyan', 'penny', -offset, offset, quadrantWidth, quadrantHeight);
    scene.add(cyanQuadrant.mesh);
    scene.add(cyanQuadrant.targetMesh);
    
    // Top-Right: GREEN (Nickel)
    const greenQuadrant = createQuadrant('green', 'nickel', offset, offset, quadrantWidth, quadrantHeight);
    scene.add(greenQuadrant.mesh);
    scene.add(greenQuadrant.targetMesh);
    
    // Bottom-Left: PURPLE (Dime)
    const purpleQuadrant = createQuadrant('purple', 'dime', -offset, -offset, quadrantWidth, quadrantHeight);
    scene.add(purpleQuadrant.mesh);
    scene.add(purpleQuadrant.targetMesh);
    
    // Bottom-Right: RED (Quarter)
    const redQuadrant = createQuadrant('red', 'quarter', offset, -offset, quadrantWidth, quadrantHeight);
    scene.add(redQuadrant.mesh);
    scene.add(redQuadrant.targetMesh);
    
    quadrantsRef.current = [cyanQuadrant, greenQuadrant, purpleQuadrant, redQuadrant];
    
    // Add labels for each quadrant
    const createLabel = (text: string, x: number, y: number, color: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 40);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(x, y, 0.5);
      sprite.scale.set(3, 0.75, 1);
      scene.add(sprite);
    };
    
    createLabel('PENNY', -offset, offset + 2, QUADRANT_COLORS.cyan);
    createLabel('NICKEL', offset, offset + 2, QUADRANT_COLORS.green);
    createLabel('DIME', -offset, -offset - 2.5, QUADRANT_COLORS.purple);
    createLabel('QUARTER', offset, -offset - 2.5, QUADRANT_COLORS.red);
    
    // Center zone
    const centerGeometry = new THREE.CircleGeometry(2, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0x333366,
      transparent: true,
      opacity: 0.3
    });
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMesh.position.z = -0.6;
    scene.add(centerMesh);
    
    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Rotate coins slightly for visual effect
      coinsRef.current.forEach(coin => {
        if (!coin.isDragging && !coin.sorted) {
          coin.mesh.rotation.z += 0.01;
        }
      });
      
      // Pulse quadrant targets
      const time = Date.now() * 0.003;
      quadrantsRef.current.forEach((quad, i) => {
        const pulse = 0.3 + Math.sin(time + i) * 0.1;
        if (quad.targetMesh.material instanceof THREE.MeshBasicMaterial) {
          quad.targetMesh.material.opacity = pulse;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const newAspect = width / height;
      
      camera.left = -frustumSize * newAspect / 2;
      camera.right = frustumSize * newAspect / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createQuadrant]);

  // Mouse/touch handlers
  const getWorldPosition = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!containerRef.current || !cameraRef.current) return { x: 0, y: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Convert to world coordinates
    const camera = cameraRef.current;
    const worldX = x * (camera.right - camera.left) / 2;
    const worldY = y * (camera.top - camera.bottom) / 2;
    
    return { x: worldX, y: worldY };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    
    const { x, y } = getWorldPosition(e.clientX, e.clientY);
    
    // Find coin under pointer
    for (const coin of coinsRef.current) {
      if (coin.sorted) continue;
      
      const dx = x - coin.x;
      const dy = y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const coinRadius = COIN_CONFIGS[coin.type].radius;
      
      if (distance < coinRadius + 0.3) {
        coin.isDragging = true;
        draggedCoinRef.current = coin;
        break;
      }
    }
  }, [gameState, getWorldPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedCoinRef.current) return;
    
    const { x, y } = getWorldPosition(e.clientX, e.clientY);
    const coin = draggedCoinRef.current;
    
    coin.x = x;
    coin.y = y;
    coin.mesh.position.set(x, y, 0.5); // Lift while dragging
  }, [getWorldPosition]);

  const handlePointerUp = useCallback(() => {
    if (draggedCoinRef.current) {
      handleCoinDrop(draggedCoinRef.current);
    }
  }, [handleCoinDrop]);

  // Spawn coins periodically during gameplay
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    // Initial coins
    for (let i = 0; i < 3; i++) {
      spawnCoin();
    }
    
    // Spawn new coins periodically
    const spawnInterval = setInterval(() => {
      // Keep around 4-6 coins on screen
      const activeCoins = coinsRef.current.filter(c => !c.sorted).length;
      if (activeCoins < 5) {
        spawnCoin();
      }
    }, 1500);
    
    return () => clearInterval(spawnInterval);
  }, [gameState, spawnCoin]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState]);

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setGameState('playing');
          gameStartTimeRef.current = Date.now();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [gameState]);

  const startGame = () => {
    setGameState('countdown');
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setAccuracy(100);
    scoreRef.current = 0;
    comboRef.current = 0;
    correctSortsRef.current = 0;
    totalCoinsRef.current = 0;
    coinsRef.current = [];
    
    // Reset quadrant match counts
    quadrantsRef.current.forEach(quad => {
      quad.matchCount = 0;
      quad.bonusShapes.forEach(shape => shape.visible = false);
    });
  };

  const endGame = async () => {
    setGameState('ended');
    
    const finalScore = scoreRef.current;
    const finalAccuracy = totalCoinsRef.current > 0 
      ? (correctSortsRef.current / totalCoinsRef.current) * 100 
      : 0;
    
    // Add accuracy decimal to score
    const accuracyDecimal = (finalAccuracy % 100) / 100;
    const adjustedScore = finalScore + accuracyDecimal;
    
    // Log to audit
    try {
      await logGameCompletion({
        gameType: GAME_TYPES.PENNY_PASSERS || 'Coin Sorter',
        gameMode: gameMode === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: adjustedScore,
        accuracy: finalAccuracy,
        reactionTime: 0,
        durationSeconds: 60 - timeLeft,
        additionalData: {
          rngSeed,
          competitionId,
          correctSorts: correctSortsRef.current,
          totalCoins: totalCoinsRef.current,
          maxCombo: comboRef.current
        }
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
    
    onGameEnd({
      score: adjustedScore,
      accuracy: finalAccuracy
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-gray-900">
      <div 
        ref={containerRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
      
      {/* UI Overlay */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start text-white pointer-events-none">
          <div className="bg-black/50 rounded-lg p-3">
            <div className="text-2xl font-bold">Score: {score.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Accuracy: {accuracy.toFixed(1)}%</div>
            {combo > 1 && (
              <div className="text-lg font-bold text-yellow-400 animate-pulse">
                🔥 {combo}x Combo!
              </div>
            )}
          </div>
          <div className="bg-black/50 rounded-lg p-3 text-right">
            <div className="text-2xl font-bold">Time: {timeLeft}s</div>
            <div className="text-sm text-gray-300">Sorted: {correctSortsRef.current}</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 text-white text-center pointer-events-none">
          <div className="bg-black/50 rounded-lg px-4 py-2">
            <p className="text-sm">Drag coins to matching quadrants • Bonus for center placement</p>
            <p className="text-xs text-cyan-400 mt-1">🟦 Cyan = Penny • 🟩 Green = Nickel • 🟪 Purple = Dime • 🟥 Red = Quarter</p>
          </div>
        </div>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-red-500 bg-clip-text text-transparent">
              COIN SORTER
            </h1>
            <p className="text-xl mb-6 text-gray-300">
              Match coins to their quadrants!
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8 text-lg">
              <div className="text-cyan-400">🪙 Penny → Cyan</div>
              <div className="text-green-400">🪙 Nickel → Green</div>
              <div className="text-purple-400">🪙 Dime → Purple</div>
              <div className="text-red-400">🪙 Quarter → Red</div>
            </div>
            <p className="text-sm text-yellow-400 mb-4">
              ⚡ Color coins match by COLOR, not type!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
            >
              START GAME
            </button>
          </div>
        </div>
      )}
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="text-9xl font-bold text-white animate-ping">
            {countdown}
          </div>
        </div>
      )}
      
      {/* End Screen */}
      {gameState === 'ended' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center text-white bg-gray-800/80 rounded-2xl p-8">
            <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              Game Over!
            </h2>
            <p className="text-3xl mb-2">Score: <span className="text-yellow-400">{score.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            <p className="text-xl mb-4">Accuracy: <span className="text-cyan-400">{accuracy.toFixed(1)}%</span></p>
            <p className="text-lg text-gray-400">Coins Sorted: {correctSortsRef.current} / {totalCoinsRef.current}</p>
          </div>
        </div>
      )}
    </div>
  );
}
