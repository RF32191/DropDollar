'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import FloatingScore, { useFloatingScores } from './FloatingScore';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface NeonStrikerGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  rngSeed?: number;
}

interface Coin {
  id: number;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  vx: number;
  vz: number;
  isTarget: boolean;
  isPlayer: boolean;
  hitBy: number | null;
  chainHit: boolean;
  fallen: boolean;
}

interface Obstacle {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  type: 'bumper' | 'rail';
  radius?: number;
}

// Fixed coin positions - SAME FOR EVERYONE
const FIXED_COIN_POSITIONS = [
  { x: -4, z: -4 },
  { x: 4, z: -4 },
  { x: -2, z: -2 },
  { x: 2, z: -2 },
  { x: 0, z: 0 },
  { x: -5, z: 2 },
  { x: 5, z: 2 },
  { x: -3, z: 4 },
  { x: 3, z: 4 },
  { x: 0, z: 5 },
];

// Fixed obstacle positions
const FIXED_OBSTACLES = [
  { x: -3, z: 0, type: 'bumper' as const },
  { x: 3, z: 0, type: 'bumper' as const },
  { x: 0, z: -3, type: 'rail' as const, rotation: 0.3 },
  { x: 0, z: 3, type: 'rail' as const, rotation: -0.3 },
];

export default function NeonStrikerGame({ 
  onGameEnd, 
  onExit, 
  listingId, 
  entryNumber, 
  isCompetitionMode, 
  rngSeed 
}: NeonStrikerGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'aiming' | 'shooting' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [coinsRemaining, setCoinsRemaining] = useState(0);
  const [power, setPower] = useState(0);
  const [isPowerCharging, setIsPowerCharging] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'focus'>('full');
  const [isInitialized, setIsInitialized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinsRef = useRef<Coin[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const strikerRef = useRef<Coin | null>(null);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const powerIntervalRef = useRef<NodeJS.Timeout>();
  const scoreRef = useRef(0);
  const errorsRef = useRef(0);
  const perfectHitsRef = useRef(0);
  const shotsUsedRef = useRef(0);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const aimLineRef = useRef<THREE.Line | null>(null);

  const { popups, addPopup, removePopup } = useFloatingScores();

  // Table dimensions
  const TABLE_WIDTH = 16;
  const TABLE_DEPTH = 24;
  const COIN_RADIUS = 0.6;
  const COIN_HEIGHT = 0.2;
  const FRICTION = 0.982;
  const BOUNCE_FACTOR = 0.75;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Create 3D coin mesh with realistic appearance
  const createCoin = useCallback((
    x: number, 
    z: number, 
    isTarget: boolean, 
    isPlayer: boolean,
    scene: THREE.Scene,
    id: number
  ): Coin => {
    // Create coin group
    const coinGroup = new THREE.Group();
    
    // Main coin body - cylinder
    const geometry = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 32);
    
    // Neon colors
    const color = isPlayer ? 0x00ffff : 0xff00ff;
    
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add edge ring for 3D depth
    const edgeGeometry = new THREE.TorusGeometry(COIN_RADIUS, 0.05, 8, 32);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 1,
      roughness: 0,
    });
    const topEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    topEdge.rotation.x = Math.PI / 2;
    topEdge.position.y = COIN_HEIGHT / 2;
    mesh.add(topEdge);
    
    const bottomEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    bottomEdge.rotation.x = Math.PI / 2;
    bottomEdge.position.y = -COIN_HEIGHT / 2;
    mesh.add(bottomEdge);

    // Add center emblem
    const emblemGeometry = new THREE.CircleGeometry(COIN_RADIUS * 0.5, 16);
    const emblemMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const topEmblem = new THREE.Mesh(emblemGeometry, emblemMaterial);
    topEmblem.rotation.x = -Math.PI / 2;
    topEmblem.position.y = COIN_HEIGHT / 2 + 0.01;
    mesh.add(topEmblem);

    mesh.position.set(x, COIN_HEIGHT / 2 + 0.01, z);
    scene.add(mesh);

    // Add glow ring on table
    const glowGeometry = new THREE.RingGeometry(COIN_RADIUS + 0.1, COIN_RADIUS + 0.3, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, 0.02, z);
    glowMesh.rotation.x = -Math.PI / 2;
    scene.add(glowMesh);

    console.log(`🪙 Created coin ${id} at (${x.toFixed(1)}, ${z.toFixed(1)}) - ${isPlayer ? 'STRIKER' : 'TARGET'}`);

    return {
      id,
      mesh,
      glowMesh,
      vx: 0,
      vz: 0,
      isTarget,
      isPlayer,
      hitBy: null,
      chainHit: false,
      fallen: false,
    };
  }, []);

  // Create obstacle
  const createObstacle = useCallback((
    x: number, 
    z: number, 
    type: 'bumper' | 'rail',
    scene: THREE.Scene,
    rotation: number = 0
  ): Obstacle => {
    let geometry: THREE.BufferGeometry;
    let radius = 0;

    if (type === 'bumper') {
      geometry = new THREE.CylinderGeometry(0.7, 0.7, 1, 16);
      radius = 0.7;
    } else {
      geometry = new THREE.BoxGeometry(4, 0.6, 0.4);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, type === 'bumper' ? 0.5 : 0.3, z);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    scene.add(mesh);

    // Glow effect
    const glowGeometry = type === 'bumper'
      ? new THREE.RingGeometry(0.7, 1.0, 16)
      : new THREE.PlaneGeometry(4.5, 0.8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, 0.02, z);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.rotation.z = rotation;
    scene.add(glowMesh);

    return { mesh, glowMesh, type, radius };
  }, []);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) {
      console.error('❌ Container not found');
      return;
    }

    console.log('🎮 Initializing Neon Striker scene...');

    // Clean up existing
    if (rendererRef.current && containerRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.Fog(0x050510, 30, 60);
    sceneRef.current = scene;

    // Camera - start with full view
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 25, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x333344, 0.6);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 25, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.angle = Math.PI / 4;
    scene.add(spotLight);

    // Neon accent lights
    const cyanLight = new THREE.PointLight(0x00ffff, 1, 40);
    cyanLight.position.set(-10, 8, 10);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00ff, 1, 40);
    magentaLight.position.set(10, 8, -10);
    scene.add(magentaLight);

    const greenLight = new THREE.PointLight(0x00ff00, 0.5, 30);
    greenLight.position.set(0, 5, 0);
    scene.add(greenLight);

    // Create table with neon edges
    const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_DEPTH);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      metalness: 0.4,
      roughness: 0.6,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -0.25, 0);
    table.receiveShadow = true;
    scene.add(table);

    // Table surface pattern
    const surfaceGeometry = new THREE.PlaneGeometry(TABLE_WIDTH - 0.5, TABLE_DEPTH - 0.5);
    const surfaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.2,
      roughness: 0.8,
    });
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.01;
    surface.receiveShadow = true;
    scene.add(surface);

    // Neon border edges
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    
    // Top edge
    const topBorderGeom = new THREE.BoxGeometry(TABLE_WIDTH + 0.2, 0.3, 0.2);
    const topBorder = new THREE.Mesh(topBorderGeom, borderMaterial);
    topBorder.position.set(0, 0.15, -TABLE_DEPTH / 2);
    scene.add(topBorder);
    
    // Bottom edge
    const bottomBorder = new THREE.Mesh(topBorderGeom, borderMaterial);
    bottomBorder.position.set(0, 0.15, TABLE_DEPTH / 2);
    scene.add(bottomBorder);
    
    // Left edge
    const sideBorderGeom = new THREE.BoxGeometry(0.2, 0.3, TABLE_DEPTH);
    const leftBorder = new THREE.Mesh(sideBorderGeom, borderMaterial);
    leftBorder.position.set(-TABLE_WIDTH / 2, 0.15, 0);
    scene.add(leftBorder);
    
    // Right edge
    const rightBorder = new THREE.Mesh(sideBorderGeom, borderMaterial);
    rightBorder.position.set(TABLE_WIDTH / 2, 0.15, 0);
    scene.add(rightBorder);

    // Grid lines
    const gridHelper = new THREE.GridHelper(Math.min(TABLE_WIDTH, TABLE_DEPTH) - 2, 12, 0x222244, 0x151530);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Create target coins at FIXED positions
    const targetCoins: Coin[] = [];
    console.log('🎯 Creating', FIXED_COIN_POSITIONS.length, 'target coins...');
    
    FIXED_COIN_POSITIONS.forEach((pos, i) => {
      const coin = createCoin(pos.x, pos.z, true, false, scene, i + 1);
      targetCoins.push(coin);
    });

    coinsRef.current = targetCoins;
    setCoinsRemaining(FIXED_COIN_POSITIONS.length);

    // Create obstacles at FIXED positions
    const obstacles: Obstacle[] = [];
    FIXED_OBSTACLES.forEach((obs) => {
      const obstacle = createObstacle(obs.x, obs.z, obs.type, scene, obs.rotation || 0);
      obstacles.push(obstacle);
    });
    obstaclesRef.current = obstacles;

    // Create striker coin
    const striker = createCoin(0, TABLE_DEPTH / 2 - 2, false, true, scene, 0);
    strikerRef.current = striker;
    coinsRef.current.push(striker);

    // Create aim line
    const aimGeometry = new THREE.BufferGeometry();
    const aimPositions = new Float32Array([0, 0.2, 0, 0, 0.2, -6]);
    aimGeometry.setAttribute('position', new THREE.BufferAttribute(aimPositions, 3));
    const aimMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.9,
      linewidth: 3
    });
    const aimLine = new THREE.Line(aimGeometry, aimMaterial);
    aimLine.visible = true;
    scene.add(aimLine);
    aimLineRef.current = aimLine;

    setIsInitialized(true);
    console.log('✅ Scene initialized with', targetCoins.length, 'coins and', obstacles.length, 'obstacles');

  }, [createCoin, createObstacle]);

  // Switch camera view
  const switchView = useCallback((mode: 'full' | 'focus') => {
    if (!cameraRef.current || !strikerRef.current) return;
    
    setViewMode(mode);
    const camera = cameraRef.current;
    
    if (mode === 'full') {
      // Full table view
      camera.position.set(0, 25, 20);
      camera.lookAt(0, 0, 0);
    } else {
      // Focus on striker for aiming
      const striker = strikerRef.current.mesh.position;
      camera.position.set(striker.x, 8, striker.z + 6);
      camera.lookAt(striker.x, 0, striker.z - 5);
    }
  }, []);

  // Update aim line
  const updateAimLine = useCallback((angle: number, powerLevel: number) => {
    if (!aimLineRef.current || !strikerRef.current) return;

    const striker = strikerRef.current.mesh.position;
    const length = 2 + (powerLevel / 100) * 10;
    
    const endX = striker.x + Math.sin(angle) * length;
    const endZ = striker.z - Math.cos(angle) * length;

    const positions = new Float32Array([
      striker.x, 0.3, striker.z,
      endX, 0.3, endZ
    ]);
    aimLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    aimLineRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Color based on power
    const mat = aimLineRef.current.material as THREE.LineBasicMaterial;
    if (powerLevel < 30) {
      mat.color.setHex(0x00ffff);
    } else if (powerLevel < 70) {
      mat.color.setHex(0xffff00);
    } else {
      mat.color.setHex(0xff4400);
    }
  }, []);

  // Physics update
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
    const obstacles = obstaclesRef.current;

    for (const coin of coins) {
      if (coin.fallen) continue;

      // Apply velocity
      coin.mesh.position.x += coin.vx;
      coin.mesh.position.z += coin.vz;
      coin.glowMesh.position.x = coin.mesh.position.x;
      coin.glowMesh.position.z = coin.mesh.position.z;

      // Apply friction
      coin.vx *= FRICTION;
      coin.vz *= FRICTION;

      // Stop if very slow
      if (Math.abs(coin.vx) < 0.002 && Math.abs(coin.vz) < 0.002) {
        coin.vx = 0;
        coin.vz = 0;
      }

      // Check table bounds
      const halfWidth = TABLE_WIDTH / 2 - 0.1;
      const halfDepth = TABLE_DEPTH / 2 - 0.1;

      // Check if coin fell off
      if (Math.abs(coin.mesh.position.x) > halfWidth || Math.abs(coin.mesh.position.z) > halfDepth) {
        if (!coin.fallen) {
          coin.fallen = true;
          coin.mesh.visible = false;
          coin.glowMesh.visible = false;

          if (coin.isTarget) {
            if (coin.chainHit) {
              errorsRef.current++;
              setErrors(errorsRef.current);
              scoreRef.current -= 50;
              setScore(scoreRef.current);
              addPopup(-50, 50, 50, 'kill', 'CHAIN! -50');
            } else if (coin.hitBy === 0) {
              perfectHitsRef.current++;
              setPerfectHits(perfectHitsRef.current);
              scoreRef.current += 100;
              setScore(scoreRef.current);
              addPopup(100, 50, 40, 'perfect', 'PERFECT! +100');
            }
            setCoinsRemaining(prev => Math.max(0, prev - 1));
          } else if (coin.isPlayer) {
            errorsRef.current++;
            setErrors(errorsRef.current);
            scoreRef.current -= 100;
            setScore(scoreRef.current);
            addPopup(-100, 50, 50, 'kill', 'STRIKER FELL! -100');
          }
        }
      }

      // Bounce off obstacles
      for (const obstacle of obstacles) {
        const obstaclePos = obstacle.mesh.position;
        
        if (obstacle.type === 'bumper' && obstacle.radius) {
          const dist = Math.sqrt(
            (coin.mesh.position.x - obstaclePos.x) ** 2 +
            (coin.mesh.position.z - obstaclePos.z) ** 2
          );

          if (dist < COIN_RADIUS + obstacle.radius) {
            const nx = (coin.mesh.position.x - obstaclePos.x) / dist;
            const nz = (coin.mesh.position.z - obstaclePos.z) / dist;
            
            const dot = coin.vx * nx + coin.vz * nz;
            coin.vx = (coin.vx - 2 * dot * nx) * BOUNCE_FACTOR * 1.3;
            coin.vz = (coin.vz - 2 * dot * nz) * BOUNCE_FACTOR * 1.3;
            
            coin.mesh.position.x = obstaclePos.x + nx * (COIN_RADIUS + obstacle.radius + 0.05);
            coin.mesh.position.z = obstaclePos.z + nz * (COIN_RADIUS + obstacle.radius + 0.05);
            
            addPopup(15, 50, 50, 'bonus', 'BUMPER! +15');
            scoreRef.current += 15;
            setScore(scoreRef.current);
          }
        }
      }
    }

    // Coin-to-coin collisions
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const c1 = coins[i];
        const c2 = coins[j];
        
        if (c1.fallen || c2.fallen) continue;

        const dx = c2.mesh.position.x - c1.mesh.position.x;
        const dz = c2.mesh.position.z - c1.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < COIN_RADIUS * 2 && dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;

          const dvx = c1.vx - c2.vx;
          const dvz = c1.vz - c2.vz;
          const dvn = dvx * nx + dvz * nz;

          if (dvn > 0) {
            c1.vx -= dvn * nx * BOUNCE_FACTOR;
            c1.vz -= dvn * nz * BOUNCE_FACTOR;
            c2.vx += dvn * nx * BOUNCE_FACTOR;
            c2.vz += dvn * nz * BOUNCE_FACTOR;

            const overlap = COIN_RADIUS * 2 - dist;
            c1.mesh.position.x -= overlap * nx * 0.5;
            c1.mesh.position.z -= overlap * nz * 0.5;
            c2.mesh.position.x += overlap * nx * 0.5;
            c2.mesh.position.z += overlap * nz * 0.5;

            // Track hit source
            if (c1.isPlayer && !c2.hitBy) {
              c2.hitBy = c1.id;
              c2.chainHit = false;
            } else if (c2.isPlayer && !c1.hitBy) {
              c1.hitBy = c2.id;
              c1.chainHit = false;
            } else if (!c1.isPlayer && !c2.isPlayer) {
              if (c1.hitBy && !c2.hitBy) {
                c2.hitBy = c1.id;
                c2.chainHit = true;
              } else if (c2.hitBy && !c1.hitBy) {
                c1.hitBy = c2.id;
                c1.chainHit = true;
              }
            }
          }
        }
      }
    }

    // Check if all coins stopped
    const allStopped = coins.every(c => 
      c.fallen || (Math.abs(c.vx) < 0.002 && Math.abs(c.vz) < 0.002)
    );

    if (allStopped && gameState === 'shooting') {
      // Reset striker
      if (strikerRef.current && !strikerRef.current.fallen) {
        strikerRef.current.mesh.position.set(0, COIN_HEIGHT / 2 + 0.01, TABLE_DEPTH / 2 - 2);
        strikerRef.current.glowMesh.position.set(0, 0.02, TABLE_DEPTH / 2 - 2);
        strikerRef.current.vx = 0;
        strikerRef.current.vz = 0;
      }

      const remainingTargets = coins.filter(c => c.isTarget && !c.fallen).length;
      setCoinsRemaining(remainingTargets);

      if (remainingTargets === 0) {
        endGame();
      } else if (strikerRef.current?.fallen) {
        strikerRef.current.fallen = false;
        strikerRef.current.mesh.visible = true;
        strikerRef.current.glowMesh.visible = true;
        strikerRef.current.mesh.position.set(0, COIN_HEIGHT / 2 + 0.01, TABLE_DEPTH / 2 - 2);
        strikerRef.current.glowMesh.position.set(0, 0.02, TABLE_DEPTH / 2 - 2);
        setGameState('aiming');
        switchView('full');
      } else {
        setGameState('aiming');
      }

      // Reset hit tracking
      for (const coin of coins) {
        if (!coin.fallen && coin.isTarget) {
          coin.hitBy = null;
          coin.chainHit = false;
        }
      }
    }
  }, [gameState, addPopup, switchView]);

  // End game
  const endGame = useCallback(() => {
    setGameState('complete');

    if (timerRef.current) clearInterval(timerRef.current);

    const timeBonus = Math.max(0, 1000 - timeElapsed * 10);
    const accuracyBonus = perfectHitsRef.current * 50;
    const errorPenalty = errorsRef.current * 25;
    const finalScore = Math.max(0, scoreRef.current + timeBonus + accuracyBonus - errorPenalty);

    const totalShots = shotsUsedRef.current || 1;
    const accuracy = Math.min(100, (perfectHitsRef.current / totalShots) * 100);

    const gameResult = { score: finalScore, accuracy };
    
    try {
      logGameCompletion({
        gameType: GAME_TYPES.NEON_STRIKER,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy,
        gameData: {
          shotsUsed: shotsUsedRef.current,
          perfectHits: perfectHitsRef.current,
          errors: errorsRef.current,
          timeElapsed,
          rngSeed,
          listingId,
          entryNumber
        }
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }

    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
    }

    onGameEnd(gameResult);
  }, [timeElapsed, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (!isInitialized || !sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      if (gameState === 'shooting') {
        updatePhysics();
      }

      // Pulse glow effect
      const time = Date.now() * 0.003;
      for (const coin of coinsRef.current) {
        if (!coin.fallen) {
          const mat = coin.glowMesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.3 + Math.sin(time + coin.id) * 0.2;
        }
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isInitialized, gameState, updatePhysics]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('aiming');
    setScore(0);
    setShotsUsed(0);
    setErrors(0);
    setPerfectHits(0);
    setTimeElapsed(0);
    scoreRef.current = 0;
    errorsRef.current = 0;
    perfectHitsRef.current = 0;
    shotsUsedRef.current = 0;

    initScene();
    
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    try {
      musicRef.current = new Audio('/neon-striker.mp3');
      musicRef.current.loop = true;
      musicRef.current.volume = 0.3;
      musicRef.current.play().catch(() => {});
    } catch (e) {
      console.log('Music not available');
    }
  }, [initScene]);

  // Power charging
  const startCharging = useCallback(() => {
    if (gameState !== 'aiming') return;
    setIsPowerCharging(true);
    setPower(0);

    powerIntervalRef.current = setInterval(() => {
      setPower(prev => {
        const newPower = prev + 2;
        return newPower >= 100 ? 0 : newPower;
      });
    }, 25);
  }, [gameState]);

  const releaseShot = useCallback(() => {
    if (!isPowerCharging || !strikerRef.current) return;
    
    setIsPowerCharging(false);
    if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);

    const launchPower = (power / 100) * 0.9;
    strikerRef.current.vx = Math.sin(aimAngle) * launchPower;
    strikerRef.current.vz = -Math.cos(aimAngle) * launchPower;

    shotsUsedRef.current++;
    setShotsUsed(shotsUsedRef.current);
    setGameState('shooting');
    setPower(0);
    switchView('full');
  }, [isPowerCharging, power, aimAngle, switchView]);

  // Handle aim
  const handleAim = useCallback((clientX: number, clientY: number) => {
    if (gameState !== 'aiming' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const angle = Math.atan2(x - 0.5, 0.5 - y);
    setAimAngle(angle);
    updateAimLine(angle, power);
  }, [gameState, power, updateAimLine]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleAim(e.clientX, e.clientY);
  }, [handleAim]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleAim(touch.clientX, touch.clientY);
  }, [handleAim]);

  useEffect(() => {
    if (gameState === 'aiming') {
      updateAimLine(aimAngle, power);
    }
  }, [power, aimAngle, gameState, updateAimLine]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (powerIntervalRef.current) clearInterval(powerIntervalRef.current);
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // Ready screen
  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center border-2 border-cyan-500 shadow-[0_0_50px_rgba(0,255,255,0.3)]">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            ⚡ NEON STRIKER
          </h1>
          
          <div className="text-cyan-400 text-lg mb-6">
            Precision Coin Flicking
          </div>

          <div className="bg-black/50 rounded-xl p-4 mb-6 text-left text-sm text-gray-300 max-h-48 overflow-y-auto">
            <p className="mb-3">
              <span className="text-cyan-400 font-bold">🎯 OBJECTIVE:</span> Knock all <span className="text-pink-400">MAGENTA</span> coins off the table!
            </p>
            <p className="mb-3">
              <span className="text-green-400 font-bold">✅ SCORING:</span>
              <br/>• <span className="text-cyan-300">+100</span> Direct hit (knock coin off)
              <br/>• <span className="text-green-300">+15</span> Bumper bounce
            </p>
            <p className="mb-3">
              <span className="text-red-400 font-bold">❌ PENALTIES:</span>
              <br/>• <span className="text-red-300">-50</span> Chain reaction hit
              <br/>• <span className="text-red-300">-100</span> Striker falls off
            </p>
            <p>
              <span className="text-yellow-400 font-bold">💡 CONTROLS:</span>
              <br/>• Aim with mouse/touch
              <br/>• Hold button to charge power
              <br/>• Release to shoot!
            </p>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg transition-all hover:scale-105"
          >
            🚀 START GAME
          </button>

          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="mt-4 text-gray-400 hover:text-white transition-colors">
              ← Back to Games
            </button>
          )}
        </div>
      </div>
    );
  }

  // Complete screen
  if (gameState === 'complete') {
    const timeBonus = Math.max(0, 1000 - timeElapsed * 10);
    const finalScore = Math.max(0, score + timeBonus + perfectHits * 50 - errors * 25);
    const accuracy = shotsUsed > 0 ? Math.min(100, (perfectHits / shotsUsed) * 100) : 0;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border-2 border-cyan-500 shadow-[0_0_50px_rgba(0,255,255,0.3)]">
          <h1 className="text-4xl font-bold mb-4 text-cyan-400">🏆 COMPLETE!</h1>
          
          <div className="space-y-3 text-lg mb-6">
            <div className="flex justify-between p-3 bg-cyan-500/20 rounded-lg">
              <span>Base Score</span>
              <span className="text-cyan-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-500/20 rounded-lg">
              <span>Time Bonus</span>
              <span className="text-green-400 font-bold">+{timeBonus}</span>
            </div>
            <div className="flex justify-between p-3 bg-purple-500/20 rounded-lg">
              <span>Perfect Hits</span>
              <span className="text-purple-400 font-bold">{perfectHits} (+{perfectHits * 50})</span>
            </div>
            <div className="flex justify-between p-3 bg-red-500/20 rounded-lg">
              <span>Errors</span>
              <span className="text-red-400 font-bold">{errors} (-{errors * 25})</span>
            </div>
            <div className="flex justify-between p-4 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-lg border border-cyan-400">
              <span className="font-bold">FINAL SCORE</span>
              <span className="text-2xl text-cyan-300 font-bold">{finalScore}</span>
            </div>
          </div>

          <div className="text-gray-400 text-sm">
            Time: {timeElapsed}s • Shots: {shotsUsed} • Accuracy: {accuracy.toFixed(1)}%
          </div>
        </div>
      </div>
    );
  }

  // Main game
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-pink-400 font-bold text-sm sm:text-base">🎯 {coinsRemaining}</div>
            <div className="text-green-400 font-bold text-sm sm:text-base">💰 {score}</div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-yellow-400 font-bold text-sm sm:text-base">⏱️ {timeElapsed}s</div>
            <div className="text-purple-400 font-bold text-sm sm:text-base">🎱 {shotsUsed}</div>
            {!isCompetitionMode && onExit && (
              <button onClick={onExit} className="text-white hover:text-red-400 text-xl sm:text-2xl">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* View toggle buttons */}
      {gameState === 'aiming' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          <button
            onClick={() => switchView('full')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              viewMode === 'full' 
                ? 'bg-cyan-500 text-black' 
                : 'bg-black/50 text-cyan-400 border border-cyan-500'
            }`}
          >
            👁️ FULL VIEW
          </button>
          <button
            onClick={() => switchView('focus')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              viewMode === 'focus' 
                ? 'bg-purple-500 text-white' 
                : 'bg-black/50 text-purple-400 border border-purple-500'
            }`}
          >
            🎯 FOCUS SHOT
          </button>
        </div>
      )}

      {/* Power bar */}
      {gameState === 'aiming' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-64">
          <div className="bg-black/70 rounded-full p-2 border border-cyan-500">
            <div 
              className="h-4 rounded-full transition-all duration-50"
              style={{
                width: `${power}%`,
                background: power < 30 
                  ? 'linear-gradient(90deg, #00ffff, #00aaff)'
                  : power < 70
                  ? 'linear-gradient(90deg, #ffff00, #ff8800)'
                  : 'linear-gradient(90deg, #ff4400, #ff0000)'
              }}
            />
          </div>
          <div className="text-center text-cyan-400 text-sm mt-1">
            {isPowerCharging ? `POWER: ${power}%` : 'HOLD TO CHARGE'}
          </div>
        </div>
      )}

      {/* Shoot button */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
        onMouseDown={startCharging}
        onMouseUp={releaseShot}
        onMouseLeave={() => isPowerCharging && releaseShot()}
        onTouchStart={startCharging}
        onTouchEnd={releaseShot}
      >
        <button
          className={`w-20 h-20 rounded-full font-bold text-white transition-all ${
            isPowerCharging 
              ? 'bg-gradient-to-br from-orange-500 to-red-600 scale-110' 
              : 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:scale-105'
          } shadow-lg`}
          disabled={gameState !== 'aiming'}
        >
          {isPowerCharging ? '🔥' : '🎯'}
          <div className="text-xs mt-1">{isPowerCharging ? 'RELEASE!' : 'SHOOT'}</div>
        </button>
      </div>

      {/* Three.js canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={{ 
          transform: isMobile ? 'scale(0.95)' : 'scale(1)',
          transformOrigin: 'center center'
        }}
      />

      {/* Floating scores */}
      <FloatingScore popups={popups} removePopup={removePopup} />

      {/* Shooting indicator */}
      {gameState === 'shooting' && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="text-4xl text-cyan-400 animate-pulse font-bold drop-shadow-lg">
            ⚡ STRIKE! ⚡
          </div>
        </div>
      )}
    </div>
  );
}
