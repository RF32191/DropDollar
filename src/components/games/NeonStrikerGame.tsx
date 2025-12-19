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

interface GameCoin {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  isStriker: boolean;
  isKnockedOff: boolean;
  wasHitByStriker: boolean;
  wasChainHit: boolean;
  mesh: THREE.Group | null;
}

// Level configurations - Level 1 is always the same for everyone
const LEVELS = [
  // Level 1 - Easy triangle
  {
    name: 'Triangle',
    coins: [
      { x: 0, z: -2 },
      { x: -2, z: 1 },
      { x: 2, z: 1 },
    ],
    bumpers: [{ x: -4, z: 0 }, { x: 4, z: 0 }],
  },
  // Level 2 - Diamond
  {
    name: 'Diamond',
    coins: [
      { x: 0, z: -4 },
      { x: -3, z: 0 },
      { x: 3, z: 0 },
      { x: 0, z: 2 },
    ],
    bumpers: [{ x: -5, z: -2 }, { x: 5, z: -2 }],
  },
  // Level 3 - Line
  {
    name: 'The Line',
    coins: [
      { x: -4, z: 0 },
      { x: -2, z: 0 },
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 4, z: 0 },
    ],
    bumpers: [{ x: 0, z: -3 }, { x: 0, z: 3 }],
  },
  // Level 4 - Circle
  {
    name: 'Circle',
    coins: [
      { x: 0, z: -3 },
      { x: 2.6, z: -1.5 },
      { x: 2.6, z: 1.5 },
      { x: 0, z: 3 },
      { x: -2.6, z: 1.5 },
      { x: -2.6, z: -1.5 },
    ],
    bumpers: [{ x: 0, z: 0 }],
  },
  // Level 5 - Fortress
  {
    name: 'Fortress',
    coins: [
      { x: -4, z: -4 },
      { x: 4, z: -4 },
      { x: -4, z: 2 },
      { x: 4, z: 2 },
      { x: -2, z: -1 },
      { x: 2, z: -1 },
      { x: 0, z: 0 },
    ],
    bumpers: [{ x: -2, z: 3 }, { x: 2, z: 3 }, { x: 0, z: -3 }],
  },
  // Level 6 - Chaos
  {
    name: 'Chaos',
    coins: [
      { x: -5, z: -5 },
      { x: 5, z: -5 },
      { x: -3, z: -2 },
      { x: 3, z: -2 },
      { x: 0, z: 0 },
      { x: -4, z: 3 },
      { x: 4, z: 3 },
      { x: 0, z: 5 },
    ],
    bumpers: [{ x: -2, z: 0 }, { x: 2, z: 0 }, { x: 0, z: -4 }, { x: 0, z: 2 }],
  },
];

export default function NeonStrikerGame({ 
  onGameEnd, 
  onExit, 
  listingId, 
  entryNumber, 
  isCompetitionMode, 
  rngSeed 
}: NeonStrikerGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'aiming' | 'charging' | 'shooting' | 'levelComplete' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [power, setPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [coinsLeft, setCoinsLeft] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [aimLocked, setAimLocked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinsRef = useRef<GameCoin[]>([]);
  const bumpersRef = useRef<{ x: number; z: number; r: number }[]>([]);
  const aimLineRef = useRef<THREE.Line | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const powerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isShootingRef = useRef(false);
  const scoreRef = useRef(0);

  const { popups, addPopup, removePopup } = useFloatingScores();

  // Constants
  const TABLE_W = 14;
  const TABLE_D = 18;
  const COIN_R = 0.5;
  const FRICTION = 0.98;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  // Create a 3D coin
  const createCoin = useCallback((scene: THREE.Scene, x: number, z: number, isStriker: boolean): THREE.Group => {
    const group = new THREE.Group();
    
    const geometry = new THREE.CylinderGeometry(COIN_R, COIN_R, 0.18, 32);
    const color = isStriker ? 0x00ffff : 0xff00ff;
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1,
    });
    const coinMesh = new THREE.Mesh(geometry, material);
    coinMesh.castShadow = true;
    coinMesh.receiveShadow = true;
    group.add(coinMesh);

    // Rings
    const ringGeo = new THREE.TorusGeometry(COIN_R, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.09;
    group.add(topRing);
    
    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = -0.09;
    group.add(bottomRing);

    // Glow
    const glowGeo = new THREE.RingGeometry(COIN_R + 0.1, COIN_R + 0.3, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.5,
      side: THREE.DoubleSide 
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    group.add(glow);

    group.position.set(x, 0.12, z);
    scene.add(group);
    return group;
  }, []);

  // Create bumper
  const createBumper = useCallback((scene: THREE.Scene, x: number, z: number) => {
    const bumperMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      emissive: 0x00ff00, 
      emissiveIntensity: 0.5 
    });
    const bumperGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16);
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(x, 0.4, z);
    bumper.castShadow = true;
    scene.add(bumper);
    
    const glowGeo = new THREE.RingGeometry(0.6, 0.9, 16);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, 0.02, z);
    scene.add(glow);
  }, []);

  // Initialize scene for a level
  const initScene = useCallback((levelIndex: number) => {
    console.log('🎮 Initializing level', levelIndex + 1);
    
    if (!containerRef.current) {
      console.error('❌ No container ref!');
      return;
    }

    // Clean up
    if (rendererRef.current) {
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    }

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0x555577, 1));
    const spot = new THREE.SpotLight(0xffffff, 2);
    spot.position.set(0, 25, 5);
    spot.castShadow = true;
    scene.add(spot);
    scene.add(new THREE.PointLight(0x00ffff, 1.5, 40).translateX(-10).translateY(8));
    scene.add(new THREE.PointLight(0xff00ff, 1.5, 40).translateX(10).translateY(8));

    // Table
    const tableGeo = new THREE.BoxGeometry(TABLE_W, 0.3, TABLE_D);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x151525, roughness: 0.7 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.15;
    table.receiveShadow = true;
    scene.add(table);

    // Surface
    const surfaceGeo = new THREE.PlaneGeometry(TABLE_W - 0.5, TABLE_D - 0.5);
    const surfaceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.01;
    scene.add(surface);

    // Borders
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const borders = [
      { w: TABLE_W + 0.4, d: 0.25, x: 0, z: -TABLE_D / 2 - 0.1 },
      { w: TABLE_W + 0.4, d: 0.25, x: 0, z: TABLE_D / 2 + 0.1 },
      { w: 0.25, d: TABLE_D + 0.4, x: -TABLE_W / 2 - 0.1, z: 0 },
      { w: 0.25, d: TABLE_D + 0.4, x: TABLE_W / 2 + 0.1, z: 0 },
    ];
    borders.forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, 0.3, b.d);
      const mesh = new THREE.Mesh(geo, borderMat);
      mesh.position.set(b.x, 0.15, b.z);
      scene.add(mesh);
    });

    // Grid
    const grid = new THREE.GridHelper(12, 12, 0x333366, 0x222244);
    grid.position.y = 0.02;
    scene.add(grid);

    // Get level config
    const level = LEVELS[levelIndex];
    
    // Create bumpers
    const bumperData: { x: number; z: number; r: number }[] = [];
    level.bumpers.forEach(pos => {
      createBumper(scene, pos.x, pos.z);
      bumperData.push({ x: pos.x, z: pos.z, r: 0.6 });
    });
    bumpersRef.current = bumperData;

    // Create coins
    const coins: GameCoin[] = [];
    level.coins.forEach((pos, i) => {
      const mesh = createCoin(scene, pos.x, pos.z, false);
      coins.push({
        id: i + 1,
        x: pos.x,
        z: pos.z,
        vx: 0,
        vz: 0,
        isStriker: false,
        isKnockedOff: false,
        wasHitByStriker: false,
        wasChainHit: false,
        mesh,
      });
    });

    // Striker
    const strikerX = 0;
    const strikerZ = TABLE_D / 2 - 2;
    const strikerMesh = createCoin(scene, strikerX, strikerZ, true);
    coins.push({
      id: 0,
      x: strikerX,
      z: strikerZ,
      vx: 0,
      vz: 0,
      isStriker: true,
      isKnockedOff: false,
      wasHitByStriker: false,
      wasChainHit: false,
      mesh: strikerMesh,
    });

    coinsRef.current = coins;
    setCoinsLeft(level.coins.length);

    // Aim line
    const lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([strikerX, 0.25, strikerZ, strikerX, 0.25, strikerZ - 5]);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const aimLine = new THREE.Line(lineGeo, lineMat);
    scene.add(aimLine);
    aimLineRef.current = aimLine;

    setSceneReady(true);
    setAimLocked(false);
    renderer.render(scene, camera);
    console.log('✅ Level', levelIndex + 1, 'ready with', level.coins.length, 'coins');
  }, [createCoin, createBumper]);

  // Update aim line
  const updateAimLine = useCallback(() => {
    if (!aimLineRef.current) return;
    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker) return;

    const len = 2 + (power / 100) * 8;
    const endX = striker.x + Math.sin(aimAngle) * len;
    const endZ = striker.z - Math.cos(aimAngle) * len;

    const positions = new Float32Array([striker.x, 0.25, striker.z, endX, 0.25, endZ]);
    aimLineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    aimLineRef.current.geometry.attributes.position.needsUpdate = true;

    const mat = aimLineRef.current.material as THREE.LineBasicMaterial;
    if (aimLocked) {
      mat.color.setHex(power < 30 ? 0xffff00 : power < 70 ? 0xff8800 : 0xff0000);
      mat.opacity = 1;
    } else {
      mat.color.setHex(0x00ffff);
      mat.opacity = 0.6;
    }
  }, [power, aimAngle, aimLocked]);

  // Physics
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
    const bumpers = bumpersRef.current;
    let anyMoving = false;

    coins.forEach(coin => {
      if (coin.isKnockedOff || !coin.mesh) return;

      coin.x += coin.vx;
      coin.z += coin.vz;
      coin.vx *= FRICTION;
      coin.vz *= FRICTION;

      if (Math.abs(coin.vx) < 0.005 && Math.abs(coin.vz) < 0.005) {
        coin.vx = 0;
        coin.vz = 0;
      } else {
        anyMoving = true;
      }

      const halfW = TABLE_W / 2 - COIN_R;
      const halfD = TABLE_D / 2 - COIN_R;

      if (Math.abs(coin.x) > halfW || Math.abs(coin.z) > halfD) {
        coin.isKnockedOff = true;
        coin.mesh.visible = false;

        if (coin.isStriker) {
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 50, 'kill', 'STRIKER FELL! -100');
        } else {
          if (coin.wasChainHit) {
            scoreRef.current -= 50;
            setScore(scoreRef.current);
            addPopup(-50, 50, 50, 'kill', 'CHAIN! -50');
          } else if (coin.wasHitByStriker) {
            scoreRef.current += 100;
            setScore(scoreRef.current);
            addPopup(100, 50, 40, 'perfect', 'PERFECT! +100');
          }
          setCoinsLeft(c => Math.max(0, c - 1));
        }
        return;
      }

      // Bumper collisions
      bumpers.forEach(bumper => {
        const dx = coin.x - bumper.x;
        const dz = coin.z - bumper.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < COIN_R + bumper.r) {
          const nx = dx / dist;
          const nz = dz / dist;
          const dot = coin.vx * nx + coin.vz * nz;
          coin.vx = (coin.vx - 2 * dot * nx) * 1.1;
          coin.vz = (coin.vz - 2 * dot * nz) * 1.1;
          coin.x = bumper.x + nx * (COIN_R + bumper.r + 0.1);
          coin.z = bumper.z + nz * (COIN_R + bumper.r + 0.1);
          scoreRef.current += 10;
          setScore(scoreRef.current);
          addPopup(10, 50, 50, 'bonus', 'BUMPER! +10');
        }
      });

      coin.mesh.position.set(coin.x, 0.12, coin.z);
    });

    // Coin-coin collisions
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const a = coins[i];
        const b = coins[j];
        if (a.isKnockedOff || b.isKnockedOff) continue;

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < COIN_R * 2 && dist > 0.01) {
          anyMoving = true;
          const nx = dx / dist;
          const nz = dz / dist;
          const dvx = a.vx - b.vx;
          const dvz = a.vz - b.vz;
          const dvn = dvx * nx + dvz * nz;

          if (dvn > 0) {
            a.vx -= dvn * nx * 0.8;
            a.vz -= dvn * nz * 0.8;
            b.vx += dvn * nx * 0.8;
            b.vz += dvn * nz * 0.8;

            const overlap = COIN_R * 2 - dist;
            a.x -= overlap * nx * 0.5;
            a.z -= overlap * nz * 0.5;
            b.x += overlap * nx * 0.5;
            b.z += overlap * nz * 0.5;

            if (a.isStriker && !b.wasHitByStriker) b.wasHitByStriker = true;
            else if (b.isStriker && !a.wasHitByStriker) a.wasHitByStriker = true;
            else if (!a.isStriker && !b.isStriker) {
              if (a.wasHitByStriker && !b.wasHitByStriker) b.wasChainHit = true;
              else if (b.wasHitByStriker && !a.wasHitByStriker) a.wasChainHit = true;
            }
          }
        }
      }
    }

    // Check if done
    if (isShootingRef.current && !anyMoving) {
      isShootingRef.current = false;
      
      const striker = coins.find(c => c.isStriker);
      if (striker && striker.isKnockedOff && striker.mesh) {
        striker.isKnockedOff = false;
        striker.x = 0;
        striker.z = TABLE_D / 2 - 2;
        striker.vx = 0;
        striker.vz = 0;
        striker.mesh.visible = true;
        striker.mesh.position.set(striker.x, 0.12, striker.z);
      }

      coins.forEach(c => {
        if (!c.isKnockedOff && !c.isStriker) {
          c.wasHitByStriker = false;
          c.wasChainHit = false;
        }
      });

      const remaining = coins.filter(c => !c.isStriker && !c.isKnockedOff).length;
      if (remaining === 0) {
        // Level complete!
        if (currentLevel < LEVELS.length - 1) {
          // More levels
          scoreRef.current += 200;
          setScore(scoreRef.current);
          addPopup(200, 50, 30, 'critical', 'LEVEL COMPLETE! +200');
          setGameState('levelComplete');
        } else {
          // All levels done!
          endGame();
        }
      } else {
        setGameState('playing');
        setAimLocked(false);
      }
    }
  }, [addPopup, currentLevel]);

  // End game
  const endGame = useCallback(() => {
    setGameState('complete');
    if (timerRef.current) clearInterval(timerRef.current);

    const timeBonus = Math.max(0, 1000 - timeElapsed * 5);
    const levelBonus = (currentLevel + 1) * 100;
    const finalScore = Math.max(0, scoreRef.current + timeBonus + levelBonus);

    try {
      logGameCompletion({
        gameType: GAME_TYPES.NEON_STRIKER,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: shotsUsed > 0 ? Math.min(100, ((currentLevel + 1) * 3 / shotsUsed) * 100) : 0,
        gameData: { shotsUsed, timeElapsed, levelsCompleted: currentLevel + 1, rngSeed, listingId, entryNumber }
      });
    } catch (e) { console.error('Audit failed:', e); }

    onGameEnd({ 
      score: finalScore, 
      accuracy: shotsUsed > 0 ? Math.min(100, ((currentLevel + 1) * 3 / shotsUsed) * 100) : 0 
    });
  }, [timeElapsed, shotsUsed, currentLevel, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (!sceneReady || gameState === 'ready' || gameState === 'complete' || gameState === 'levelComplete') return;
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      if (isShootingRef.current) {
        updatePhysics();
      }
      updateAimLine();

      const time = Date.now() * 0.003;
      coinsRef.current.forEach(coin => {
        if (coin.mesh && !coin.isKnockedOff) {
          coin.mesh.position.y = 0.12 + Math.sin(time + coin.id) * 0.015;
        }
      });

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [sceneReady, gameState, updatePhysics, updateAimLine]);

  // Start game
  const startGame = useCallback(() => {
    console.log('🎮 Starting game...');
    scoreRef.current = 0;
    setScore(0);
    setShotsUsed(0);
    setTimeElapsed(0);
    setCurrentLevel(0);
    setSceneReady(false);
    setGameState('playing');
  }, []);

  // Next level
  const nextLevel = useCallback(() => {
    setCurrentLevel(prev => prev + 1);
    setSceneReady(false);
    setGameState('playing');
  }, []);

  // Init scene when ready
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'aiming' && gameState !== 'charging' && gameState !== 'shooting') return;
    if (sceneReady) return;
    
    const checkAndInit = () => {
      if (containerRef.current) {
        initScene(currentLevel);
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000);
        }
      } else {
        setTimeout(checkAndInit, 50);
      }
    };
    setTimeout(checkAndInit, 50);
  }, [gameState, sceneReady, currentLevel, initScene]);

  // Handle tap/click - aim or shoot
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const newAngle = Math.atan2(x, -y);

    if (!aimLocked) {
      // First tap - lock aim
      setAimAngle(newAngle);
      setAimLocked(true);
      setGameState('aiming');
    } else {
      // Second tap - start charging
      setGameState('charging');
      setPower(0);
      
      let p = 0;
      powerTimerRef.current = setInterval(() => {
        p += 4;
        if (p > 100) p = 0;
        setPower(p);
      }, 30);
    }
  }, [gameState, aimLocked]);

  const handlePointerUp = useCallback(() => {
    if (gameState !== 'charging') return;
    
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);

    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker) return;

    const launchPower = (power / 100) * 0.8;
    striker.vx = Math.sin(aimAngle) * launchPower;
    striker.vz = -Math.cos(aimAngle) * launchPower;

    isShootingRef.current = true;
    setGameState('shooting');
    setShotsUsed(s => s + 1);
    setPower(0);
    setAimLocked(false);
  }, [gameState, power, aimAngle]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (aimLocked || gameState === 'shooting') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setAimAngle(Math.atan2(x, -y));
  }, [aimLocked, gameState]);

  // Cancel aim
  const cancelAim = useCallback(() => {
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);
    setAimLocked(false);
    setPower(0);
    setGameState('playing');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (powerTimerRef.current) clearInterval(powerTimerRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // READY SCREEN
  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-lg w-full text-center border-2 border-cyan-500 shadow-[0_0_40px_rgba(0,255,255,0.3)]">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">
            ⚡ NEON STRIKER
          </h1>
          
          <p className="text-cyan-400 mb-4">{LEVELS.length} Levels • Tap to Aim & Shoot</p>

          <div className="bg-black/50 rounded-xl p-4 mb-5 text-left text-sm text-gray-300">
            <p className="mb-2 text-cyan-400 font-bold">🎯 HOW TO PLAY:</p>
            <p className="mb-1">1️⃣ Move finger/mouse to aim</p>
            <p className="mb-1">2️⃣ <span className="text-yellow-400">TAP</span> to lock your aim</p>
            <p className="mb-1">3️⃣ <span className="text-orange-400">HOLD</span> to charge power</p>
            <p className="mb-3">4️⃣ <span className="text-red-400">RELEASE</span> to shoot!</p>
            <p className="mb-2"><span className="text-green-400 font-bold">✅ +100</span> Direct hit</p>
            <p className="mb-2"><span className="text-red-400 font-bold">❌ -50</span> Chain reaction</p>
            <p><span className="text-red-400 font-bold">❌ -100</span> Striker falls</p>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 transition-all"
          >
            🚀 START GAME
          </button>

          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="mt-3 text-gray-400 hover:text-white">← Back</button>
          )}
        </div>
      </div>
    );
  }

  // LEVEL COMPLETE
  if (gameState === 'levelComplete') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full text-center border-2 border-green-500 shadow-[0_0_40px_rgba(0,255,0,0.3)]">
          <h1 className="text-3xl font-bold mb-2 text-green-400">✨ LEVEL {currentLevel + 1} COMPLETE!</h1>
          <p className="text-gray-400 mb-4">{LEVELS[currentLevel].name}</p>
          
          <div className="text-2xl text-cyan-400 font-bold mb-4">Score: {score}</div>
          
          <p className="text-gray-300 mb-4">Next: Level {currentLevel + 2} - {LEVELS[currentLevel + 1]?.name}</p>

          <button
            onClick={nextLevel}
            className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white hover:scale-105 transition-all"
          >
            ▶️ NEXT LEVEL
          </button>
        </div>
      </div>
    );
  }

  // COMPLETE SCREEN
  if (gameState === 'complete') {
    const timeBonus = Math.max(0, 1000 - timeElapsed * 5);
    const levelBonus = (currentLevel + 1) * 100;
    const finalScore = Math.max(0, score + timeBonus + levelBonus);

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full text-center border-2 border-cyan-500">
          <h1 className="text-3xl font-bold mb-4 text-cyan-400">🏆 ALL LEVELS COMPLETE!</h1>
          
          <div className="space-y-2 mb-4 text-lg">
            <div className="flex justify-between p-2 bg-cyan-500/20 rounded">
              <span>Base Score</span><span className="text-cyan-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between p-2 bg-green-500/20 rounded">
              <span>Time Bonus</span><span className="text-green-400 font-bold">+{timeBonus}</span>
            </div>
            <div className="flex justify-between p-2 bg-purple-500/20 rounded">
              <span>Level Bonus</span><span className="text-purple-400 font-bold">+{levelBonus}</span>
            </div>
            <div className="flex justify-between p-3 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded border border-cyan-400">
              <span className="font-bold">FINAL</span><span className="text-2xl text-cyan-300 font-bold">{finalScore}</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm">
            Levels: {currentLevel + 1}/{LEVELS.length} • Time: {timeElapsed}s • Shots: {shotsUsed}
          </p>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/70 p-2 flex justify-between items-center">
        <div className="flex gap-3 text-sm">
          <span className="text-purple-400 font-bold">LV{currentLevel + 1}</span>
          <span className="text-pink-400 font-bold">🎯 {coinsLeft}</span>
          <span className="text-green-400 font-bold">💰 {score}</span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-400 font-bold">⏱️ {timeElapsed}s</span>
          <span className="text-cyan-400 font-bold">🎱 {shotsUsed}</span>
          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="text-white hover:text-red-400 ml-2">✕</button>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 text-center">
        {gameState === 'playing' && !aimLocked && (
          <div className="text-cyan-400 text-sm animate-pulse">👆 Move to aim, TAP to lock</div>
        )}
        {aimLocked && gameState === 'aiming' && (
          <div className="text-yellow-400 text-sm animate-pulse">🎯 Aim locked! TAP & HOLD to charge</div>
        )}
        {gameState === 'charging' && (
          <div className="text-orange-400 text-sm font-bold">🔥 CHARGING... RELEASE TO SHOOT!</div>
        )}
        {gameState === 'shooting' && (
          <div className="text-cyan-400 text-lg animate-pulse font-bold">⚡ STRIKE! ⚡</div>
        )}
      </div>

      {/* Cancel button when aiming */}
      {aimLocked && gameState !== 'shooting' && (
        <button
          onClick={cancelAim}
          className="absolute top-12 right-4 z-30 px-3 py-1 bg-red-500/50 text-white rounded text-xs"
        >
          ✕ Cancel
        </button>
      )}

      {/* Power bar */}
      {(gameState === 'charging' || (aimLocked && power > 0)) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-56">
          <div className="bg-black/70 rounded-full p-1.5 border-2 border-orange-500">
            <div 
              className="h-6 rounded-full transition-all"
              style={{
                width: `${Math.max(5, power)}%`,
                background: power < 30 ? 'linear-gradient(90deg, #ffff00, #ffaa00)' 
                  : power < 70 ? 'linear-gradient(90deg, #ff8800, #ff4400)' 
                  : 'linear-gradient(90deg, #ff0000, #cc0000)'
              }}
            />
          </div>
          <p className="text-center text-orange-400 text-sm mt-1 font-bold">
            POWER: {power}%
          </p>
        </div>
      )}

      {/* Level name */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-gray-500 text-xs">
        {LEVELS[currentLevel]?.name}
      </div>

      {/* 3D Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        style={{ 
          transform: isMobile ? 'scale(0.95)' : 'none', 
          transformOrigin: 'center',
          cursor: aimLocked ? (gameState === 'charging' ? 'grabbing' : 'pointer') : 'crosshair'
        }}
      />

      <FloatingScore popups={popups} removePopup={removePopup} />
    </div>
  );
}
