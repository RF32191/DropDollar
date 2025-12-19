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
  vx: number;
  vz: number;
  isTarget: boolean; // Target coins to hit off
  isPlayer: boolean; // Player's striker coin
  hitBy: number | null; // ID of coin that hit this one
  chainHit: boolean; // Was this a chain reaction hit?
  fallen: boolean; // Has fallen off the table
  glowMesh: THREE.Mesh;
}

interface Obstacle {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  type: 'bumper' | 'rail';
}

// Seeded RNG (Mulberry32)
function createSeededRNG(seed: number) {
  let state = seed;
  return {
    next: () => {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    nextFloat: (min: number, max: number) => {
      const next = () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      return min + next() * (max - min);
    },
    nextInt: (min: number, max: number) => {
      const next = () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      return Math.floor(min + next() * (max - min + 1));
    }
  };
}

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

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinsRef = useRef<Coin[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const strikerRef = useRef<Coin | null>(null);
  const animationRef = useRef<number>();
  const seededRngRef = useRef<ReturnType<typeof createSeededRNG>>();
  const gameStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const powerIntervalRef = useRef<NodeJS.Timeout>();
  const scoreRef = useRef(0);
  const errorsRef = useRef(0);
  const perfectHitsRef = useRef(0);
  const shotsUsedRef = useRef(0);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const { popups, addPopup, removePopup } = useFloatingScores();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Table dimensions
  const TABLE_WIDTH = 16;
  const TABLE_DEPTH = 20;
  const COIN_RADIUS = 0.5;
  const COIN_HEIGHT = 0.15;
  const FRICTION = 0.985;
  const BOUNCE_FACTOR = 0.7;

  // Initialize seeded RNG
  useEffect(() => {
    const seed = rngSeed || Date.now();
    seededRngRef.current = createSeededRNG(seed);
    console.log('🎲 [NeonStriker] Initialized with seed:', seed);
  }, [rngSeed]);

  // Create coin mesh with neon glow
  const createCoin = useCallback((
    x: number, 
    z: number, 
    isTarget: boolean, 
    isPlayer: boolean,
    scene: THREE.Scene,
    id: number
  ): Coin => {
    const geometry = new THREE.CylinderGeometry(COIN_RADIUS, COIN_RADIUS, COIN_HEIGHT, 32);
    
    // Neon colors
    const color = isPlayer 
      ? 0x00ffff // Cyan for player
      : 0xff00ff; // Magenta for targets
    
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, COIN_HEIGHT / 2, z);
    mesh.rotation.x = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Add glow ring
    const glowGeometry = new THREE.RingGeometry(COIN_RADIUS, COIN_RADIUS + 0.15, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, 0.01, z);
    glowMesh.rotation.x = -Math.PI / 2;
    scene.add(glowMesh);

    return {
      id,
      mesh,
      vx: 0,
      vz: 0,
      isTarget,
      isPlayer,
      hitBy: null,
      chainHit: false,
      fallen: false,
      glowMesh,
    };
  }, []);

  // Create obstacle with neon glow
  const createObstacle = useCallback((
    x: number, 
    z: number, 
    type: 'bumper' | 'rail',
    scene: THREE.Scene,
    rotation: number = 0
  ): Obstacle => {
    let geometry: THREE.BufferGeometry;
    let width = 0;
    let height = 0;

    if (type === 'bumper') {
      geometry = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16);
      width = 0.6;
      height = 0.8;
    } else {
      geometry = new THREE.BoxGeometry(3, 0.5, 0.3);
      width = 3;
      height = 0.5;
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // Green for obstacles
      emissive: 0x00ff00,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, type === 'bumper' ? 0.4 : 0.25, z);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    scene.add(mesh);

    // Glow effect
    const glowGeometry = type === 'bumper'
      ? new THREE.RingGeometry(0.6, 0.8, 16)
      : new THREE.PlaneGeometry(width + 0.2, 0.5);
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

    return { mesh, glowMesh, type };
  }, []);

  // Initialize the game scene
  const initScene = useCallback(() => {
    if (!containerRef.current || !seededRngRef.current) return;

    // Clean up existing scene
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 20, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 18, 14);
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
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 20, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    // Neon accent lights
    const cyanLight = new THREE.PointLight(0x00ffff, 0.5, 30);
    cyanLight.position.set(-8, 5, 0);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00ff, 0.5, 30);
    magentaLight.position.set(8, 5, 0);
    scene.add(magentaLight);

    // Create table
    const tableGeometry = new THREE.BoxGeometry(TABLE_WIDTH, 0.5, TABLE_DEPTH);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.3,
      roughness: 0.7,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -0.25, 0);
    table.receiveShadow = true;
    scene.add(table);

    // Table border glow
    const borderGeometry = new THREE.EdgesGeometry(tableGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff,
      linewidth: 2 
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.position.copy(table.position);
    scene.add(border);

    // Grid lines on table
    const gridHelper = new THREE.GridHelper(TABLE_WIDTH - 1, 16, 0x333355, 0x222244);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    const rng = seededRngRef.current;

    // Create target coins (seeded positions for consistency)
    const targetCoins: Coin[] = [];
    const numCoins = 8;
    const positions: Array<{x: number, z: number}> = [];

    // Generate non-overlapping positions
    for (let i = 0; i < numCoins; i++) {
      let attempts = 0;
      let validPos = false;
      let x = 0, z = 0;

      while (!validPos && attempts < 100) {
        x = rng.nextFloat(-TABLE_WIDTH / 2 + 2, TABLE_WIDTH / 2 - 2);
        z = rng.nextFloat(-TABLE_DEPTH / 2 + 3, TABLE_DEPTH / 2 - 5);
        
        validPos = true;
        for (const pos of positions) {
          const dist = Math.sqrt((pos.x - x) ** 2 + (pos.z - z) ** 2);
          if (dist < COIN_RADIUS * 3) {
            validPos = false;
            break;
          }
        }
        attempts++;
      }

      positions.push({ x, z });
      const coin = createCoin(x, z, true, false, scene, i + 1);
      targetCoins.push(coin);
    }

    coinsRef.current = targetCoins;
    setCoinsRemaining(numCoins);

    // Create obstacles (seeded)
    const obstacles: Obstacle[] = [];
    
    // Bumpers
    obstacles.push(createObstacle(rng.nextFloat(-4, -2), rng.nextFloat(-3, 3), 'bumper', scene));
    obstacles.push(createObstacle(rng.nextFloat(2, 4), rng.nextFloat(-3, 3), 'bumper', scene));
    
    // Rails
    obstacles.push(createObstacle(0, rng.nextFloat(-5, -3), 'rail', scene, rng.nextFloat(-0.3, 0.3)));
    obstacles.push(createObstacle(rng.nextFloat(-3, 3), rng.nextFloat(2, 4), 'rail', scene, rng.nextFloat(-0.5, 0.5)));

    obstaclesRef.current = obstacles;

    // Create striker coin (player's launching coin)
    const striker = createCoin(0, TABLE_DEPTH / 2 - 1, false, true, scene, 0);
    strikerRef.current = striker;
    coinsRef.current.push(striker);

    // Aim indicator line
    const aimGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0, 0.1, -5)
    ]);
    const aimMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      transparent: true, 
      opacity: 0.8 
    });
    const aimLine = new THREE.Line(aimGeometry, aimMaterial);
    aimLine.name = 'aimLine';
    scene.add(aimLine);

    console.log('🎮 [NeonStriker] Scene initialized with', numCoins, 'coins and', obstacles.length, 'obstacles');
  }, [createCoin, createObstacle]);

  // Update aim line
  const updateAimLine = useCallback((angle: number, powerLevel: number) => {
    if (!sceneRef.current || !strikerRef.current) return;

    const aimLine = sceneRef.current.getObjectByName('aimLine') as THREE.Line;
    if (!aimLine) return;

    const striker = strikerRef.current.mesh.position;
    const length = 2 + (powerLevel / 100) * 8; // Length based on power
    
    const endX = striker.x + Math.sin(angle) * length;
    const endZ = striker.z - Math.cos(angle) * length;

    const positions = new Float32Array([
      striker.x, 0.1, striker.z,
      endX, 0.1, endZ
    ]);
    aimLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    aimLine.geometry.attributes.position.needsUpdate = true;
    
    // Color based on power
    const mat = aimLine.material as THREE.LineBasicMaterial;
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
    if (!sceneRef.current) return;

    const coins = coinsRef.current;
    const obstacles = obstaclesRef.current;

    // Update coin positions
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
      if (Math.abs(coin.vx) < 0.001 && Math.abs(coin.vz) < 0.001) {
        coin.vx = 0;
        coin.vz = 0;
      }

      // Check table bounds
      const halfWidth = TABLE_WIDTH / 2;
      const halfDepth = TABLE_DEPTH / 2;

      if (coin.mesh.position.x < -halfWidth + COIN_RADIUS ||
          coin.mesh.position.x > halfWidth - COIN_RADIUS) {
        // Coin fell off sides
        if (!coin.isPlayer) {
          coin.fallen = true;
          coin.mesh.visible = false;
          coin.glowMesh.visible = false;
          
          if (coin.isTarget) {
            if (coin.chainHit) {
              // Chain reaction - error!
              errorsRef.current++;
              setErrors(errorsRef.current);
              scoreRef.current -= 50;
              setScore(scoreRef.current);
              addPopup(-50, 50, 50, 'kill', 'CHAIN REACTION! -50');
            } else if (coin.hitBy === 0) {
              // Direct hit from player - good!
              perfectHitsRef.current++;
              setPerfectHits(perfectHitsRef.current);
              scoreRef.current += 100;
              setScore(scoreRef.current);
              addPopup(100, 50, 40, 'perfect', 'PERFECT! +100');
            }
            setCoinsRemaining(prev => prev - 1);
          }
        } else {
          // Player coin fell - big penalty
          coin.fallen = true;
          errorsRef.current++;
          setErrors(errorsRef.current);
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 50, 'kill', 'STRIKER FELL! -100');
        }
      }

      if (coin.mesh.position.z < -halfDepth + COIN_RADIUS ||
          coin.mesh.position.z > halfDepth - COIN_RADIUS) {
        // Fell off front/back
        if (!coin.isPlayer) {
          coin.fallen = true;
          coin.mesh.visible = false;
          coin.glowMesh.visible = false;
          
          if (coin.isTarget) {
            if (coin.chainHit) {
              errorsRef.current++;
              setErrors(errorsRef.current);
              scoreRef.current -= 50;
              setScore(scoreRef.current);
              addPopup(-50, 50, 50, 'kill', 'CHAIN REACTION! -50');
            } else if (coin.hitBy === 0) {
              perfectHitsRef.current++;
              setPerfectHits(perfectHitsRef.current);
              scoreRef.current += 100;
              setScore(scoreRef.current);
              addPopup(100, 50, 40, 'perfect', 'PERFECT! +100');
            }
            setCoinsRemaining(prev => prev - 1);
          }
        } else {
          coin.fallen = true;
          errorsRef.current++;
          setErrors(errorsRef.current);
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 50, 'kill', 'STRIKER FELL! -100');
        }
      }

      // Bounce off obstacles
      for (const obstacle of obstacles) {
        const obstaclePos = obstacle.mesh.position;
        const dist = Math.sqrt(
          (coin.mesh.position.x - obstaclePos.x) ** 2 +
          (coin.mesh.position.z - obstaclePos.z) ** 2
        );

        if (obstacle.type === 'bumper' && dist < COIN_RADIUS + 0.6) {
          // Bounce off bumper
          const nx = (coin.mesh.position.x - obstaclePos.x) / dist;
          const nz = (coin.mesh.position.z - obstaclePos.z) / dist;
          
          const dot = coin.vx * nx + coin.vz * nz;
          coin.vx = (coin.vx - 2 * dot * nx) * BOUNCE_FACTOR * 1.2; // Bumpers add energy
          coin.vz = (coin.vz - 2 * dot * nz) * BOUNCE_FACTOR * 1.2;
          
          // Push out of collision
          coin.mesh.position.x = obstaclePos.x + nx * (COIN_RADIUS + 0.65);
          coin.mesh.position.z = obstaclePos.z + nz * (COIN_RADIUS + 0.65);
          
          addPopup(10, 50, 50, 'bonus', 'BOUNCE! +10');
          scoreRef.current += 10;
          setScore(scoreRef.current);
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

        if (dist < COIN_RADIUS * 2 && dist > 0) {
          // Collision!
          const nx = dx / dist;
          const nz = dz / dist;

          // Relative velocity
          const dvx = c1.vx - c2.vx;
          const dvz = c1.vz - c2.vz;
          const dvn = dvx * nx + dvz * nz;

          // Don't resolve if separating
          if (dvn > 0) {
            // Update velocities (elastic collision)
            c1.vx -= dvn * nx * BOUNCE_FACTOR;
            c1.vz -= dvn * nz * BOUNCE_FACTOR;
            c2.vx += dvn * nx * BOUNCE_FACTOR;
            c2.vz += dvn * nz * BOUNCE_FACTOR;

            // Separate coins
            const overlap = COIN_RADIUS * 2 - dist;
            c1.mesh.position.x -= overlap * nx * 0.5;
            c1.mesh.position.z -= overlap * nz * 0.5;
            c2.mesh.position.x += overlap * nx * 0.5;
            c2.mesh.position.z += overlap * nz * 0.5;

            // Track who hit who for scoring
            if (c1.isPlayer && !c2.hitBy) {
              c2.hitBy = c1.id;
              c2.chainHit = false;
            } else if (c2.isPlayer && !c1.hitBy) {
              c1.hitBy = c2.id;
              c1.chainHit = false;
            } else if (!c1.isPlayer && !c2.isPlayer) {
              // Coin hit by another target coin = chain reaction
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

    // Check if all coins stopped moving
    const allStopped = coins.every(c => 
      c.fallen || (Math.abs(c.vx) < 0.001 && Math.abs(c.vz) < 0.001)
    );

    if (allStopped && gameState === 'shooting') {
      // Reset striker for next shot if not fallen
      if (strikerRef.current && !strikerRef.current.fallen) {
        strikerRef.current.mesh.position.set(0, COIN_HEIGHT / 2, TABLE_DEPTH / 2 - 1);
        strikerRef.current.glowMesh.position.set(0, 0.01, TABLE_DEPTH / 2 - 1);
        strikerRef.current.vx = 0;
        strikerRef.current.vz = 0;
      }

      // Check win/lose condition
      const remainingTargets = coins.filter(c => c.isTarget && !c.fallen).length;
      setCoinsRemaining(remainingTargets);

      if (remainingTargets === 0) {
        // All coins cleared!
        endGame();
      } else if (strikerRef.current?.fallen) {
        // Striker fell, respawn it with penalty
        strikerRef.current.fallen = false;
        strikerRef.current.mesh.visible = true;
        strikerRef.current.glowMesh.visible = true;
        strikerRef.current.mesh.position.set(0, COIN_HEIGHT / 2, TABLE_DEPTH / 2 - 1);
        strikerRef.current.glowMesh.position.set(0, 0.01, TABLE_DEPTH / 2 - 1);
        setGameState('aiming');
      } else {
        setGameState('aiming');
      }

      // Reset hit tracking for remaining coins
      for (const coin of coins) {
        if (!coin.fallen && coin.isTarget) {
          coin.hitBy = null;
          coin.chainHit = false;
        }
      }
    }
  }, [gameState, addPopup]);

  // End game
  const endGame = useCallback(() => {
    setGameState('complete');

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Calculate final score
    const timeBonus = Math.max(0, 1000 - timeElapsed * 10);
    const accuracyBonus = perfectHitsRef.current * 50;
    const errorPenalty = errorsRef.current * 25;
    const finalScore = Math.max(0, scoreRef.current + timeBonus + accuracyBonus - errorPenalty);

    // Calculate accuracy
    const totalShots = shotsUsedRef.current || 1;
    const accuracy = Math.min(100, (perfectHitsRef.current / totalShots) * 100);

    // Log to audit
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
      console.error('🎯 [NeonStriker] Audit logging failed:', error);
    }

    // Stop music
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
    }

    onGameEnd(gameResult);
  }, [timeElapsed, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      if (gameState === 'shooting') {
        updatePhysics();
      }

      // Pulse glow effect
      const time = Date.now() * 0.003;
      for (const coin of coinsRef.current) {
        if (!coin.fallen) {
          const mat = coin.glowMesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.4 + Math.sin(time + coin.id) * 0.2;
        }
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, updatePhysics]);

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

    gameStartTimeRef.current = Date.now();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    initScene();

    // Start music
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
        if (newPower >= 100) {
          return 0; // Loop back
        }
        return newPower;
      });
    }, 30);
  }, [gameState]);

  const releaseShot = useCallback(() => {
    if (!isPowerCharging || !strikerRef.current) return;
    
    setIsPowerCharging(false);
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
    }

    // Launch striker
    const launchPower = power / 100 * 0.8; // Max speed 0.8
    strikerRef.current.vx = Math.sin(aimAngle) * launchPower;
    strikerRef.current.vz = -Math.cos(aimAngle) * launchPower;

    shotsUsedRef.current++;
    setShotsUsed(shotsUsedRef.current);
    setGameState('shooting');
    setPower(0);
  }, [isPowerCharging, power, aimAngle]);

  // Handle aim
  const handleAim = useCallback((clientX: number, clientY: number) => {
    if (gameState !== 'aiming' || !containerRef.current || !strikerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Calculate angle from striker to mouse position
    const angle = Math.atan2(x - 0.5, 0.5 - y);
    setAimAngle(angle);
    updateAimLine(angle, power);
  }, [gameState, power, updateAimLine]);

  // Mouse/touch handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleAim(e.clientX, e.clientY);
  }, [handleAim]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleAim(touch.clientX, touch.clientY);
  }, [handleAim]);

  // Update aim line when power changes
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
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
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
            Precision Coin Flicking Game
          </div>

          <div className="bg-black/50 rounded-xl p-4 mb-6 text-left text-sm text-gray-300 max-h-48 overflow-y-auto">
            <p className="mb-3">
              <span className="text-cyan-400 font-bold">🎯 OBJECTIVE:</span> Knock all magenta coins off the table!
            </p>
            <p className="mb-3">
              <span className="text-green-400 font-bold">✅ SCORING:</span>
              <br/>• <span className="text-cyan-300">+100</span> Direct hit (your coin pushes target off)
              <br/>• <span className="text-green-300">+10</span> Bumper bounce
            </p>
            <p className="mb-3">
              <span className="text-red-400 font-bold">❌ PENALTIES:</span>
              <br/>• <span className="text-red-300">-50</span> Chain reaction (coin hits coin that pushes another off)
              <br/>• <span className="text-red-300">-100</span> Your striker falls off
            </p>
            <p>
              <span className="text-yellow-400 font-bold">💡 CONTROLS:</span>
              <br/>• Move mouse/touch to aim
              <br/>• Hold to charge power, release to shoot
            </p>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg transition-all hover:scale-105"
          >
            🚀 START GAME
          </button>

          {!isCompetitionMode && onExit && (
            <button
              onClick={onExit}
              className="mt-4 text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Games
            </button>
          )}
        </div>
      </div>
    );
  }

  // Game complete screen
  if (gameState === 'complete') {
    const timeBonus = Math.max(0, 1000 - timeElapsed * 10);
    const finalScore = Math.max(0, score + timeBonus + perfectHits * 50 - errors * 25);
    const accuracy = shotsUsed > 0 ? Math.min(100, (perfectHits / shotsUsed) * 100) : 0;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center border-2 border-cyan-500 shadow-[0_0_50px_rgba(0,255,255,0.3)]">
          <h1 className="text-4xl font-bold mb-4 text-cyan-400">
            🏆 GAME COMPLETE!
          </h1>
          
          <div className="space-y-3 text-lg mb-6">
            <div className="flex justify-between p-3 bg-cyan-500/20 rounded-lg">
              <span className="text-gray-300">Base Score</span>
              <span className="text-cyan-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-500/20 rounded-lg">
              <span className="text-gray-300">Time Bonus</span>
              <span className="text-green-400 font-bold">+{timeBonus}</span>
            </div>
            <div className="flex justify-between p-3 bg-purple-500/20 rounded-lg">
              <span className="text-gray-300">Perfect Hits</span>
              <span className="text-purple-400 font-bold">{perfectHits} (+{perfectHits * 50})</span>
            </div>
            <div className="flex justify-between p-3 bg-red-500/20 rounded-lg">
              <span className="text-gray-300">Errors</span>
              <span className="text-red-400 font-bold">{errors} (-{errors * 25})</span>
            </div>
            <div className="flex justify-between p-4 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-lg border border-cyan-400">
              <span className="text-white font-bold">FINAL SCORE</span>
              <span className="text-2xl text-cyan-300 font-bold">{finalScore}</span>
            </div>
            <div className="flex justify-between p-3 bg-yellow-500/20 rounded-lg">
              <span className="text-gray-300">Accuracy</span>
              <span className="text-yellow-400 font-bold">{accuracy.toFixed(1)}%</span>
            </div>
          </div>

          <div className="text-gray-400 text-sm">
            Time: {timeElapsed}s • Shots: {shotsUsed}
          </div>
        </div>
      </div>
    );
  }

  // Main game view
  return (
    <div 
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="text-cyan-400 font-bold">
              🎯 {coinsRemaining} left
            </div>
            <div className="text-green-400 font-bold">
              💰 {score}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-yellow-400 font-bold">
              ⏱️ {timeElapsed}s
            </div>
            <div className="text-purple-400 font-bold">
              🎱 {shotsUsed} shots
            </div>
            {!isCompetitionMode && onExit && (
              <button onClick={onExit} className="text-white hover:text-red-400 text-2xl">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Power bar */}
      {gameState === 'aiming' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-64">
          <div className="bg-black/70 rounded-full p-2 border border-cyan-500">
            <div 
              className="h-4 rounded-full transition-all duration-75"
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
            {isPowerCharging ? 'CHARGING...' : 'HOLD TO CHARGE'}
          </div>
        </div>
      )}

      {/* Shoot button / area */}
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
        >
          {isPowerCharging ? '🔥' : '🎯'}
          <div className="text-xs mt-1">
            {isPowerCharging ? 'RELEASE!' : 'SHOOT'}
          </div>
        </button>
      </div>

      {/* Three.js canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        style={{ 
          transform: isMobile ? 'scale(0.9)' : 'scale(1)',
          transformOrigin: 'center center'
        }}
      />

      {/* Floating scores */}
      <FloatingScore popups={popups} removePopup={removePopup} />

      {/* Shooting overlay */}
      {gameState === 'shooting' && (
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="text-4xl text-cyan-400 animate-pulse font-bold">
            ⚡ STRIKING! ⚡
          </div>
        </div>
      )}
    </div>
  );
}

