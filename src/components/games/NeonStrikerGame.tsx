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

// Fixed coin arrangement - same for everyone
const TARGET_POSITIONS = [
  { x: 0, z: 0 },
  { x: -3, z: -2 },
  { x: 3, z: -2 },
  { x: -2, z: 1 },
  { x: 2, z: 1 },
  { x: -4, z: -4 },
  { x: 4, z: -4 },
  { x: 0, z: 3 },
];

export default function NeonStrikerGame({ 
  onGameEnd, 
  onExit, 
  listingId, 
  entryNumber, 
  isCompetitionMode, 
  rngSeed 
}: NeonStrikerGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'shooting' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [coinsLeft, setCoinsLeft] = useState(TARGET_POSITIONS.length);
  const [viewMode, setViewMode] = useState<'full' | 'focus'>('full');
  const [isMobile, setIsMobile] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinsRef = useRef<GameCoin[]>([]);
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
    
    // Main coin body
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

    // Edge ring top
    const ringGeo = new THREE.TorusGeometry(COIN_R, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.09;
    group.add(topRing);

    // Edge ring bottom
    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = -0.09;
    group.add(bottomRing);

    // Center emblem
    const emblemGeo = new THREE.CircleGeometry(COIN_R * 0.4, 16);
    const emblemMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.rotation.x = -Math.PI / 2;
    emblem.position.y = 0.1;
    group.add(emblem);

    // Glow ring under coin
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

    console.log(`🪙 Created ${isStriker ? 'STRIKER' : 'TARGET'} coin at (${x}, ${z})`);
    return group;
  }, []);

  // Initialize the scene
  const initScene = useCallback(() => {
    console.log('🎮 Initializing scene...');
    
    if (!containerRef.current) {
      console.error('❌ No container ref!');
      return;
    }

    // Clean up old renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    }

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    console.log(`📐 Container size: ${width}x${height}`);

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 22, 18);
    camera.lookAt(0, 0, 2);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    console.log('✅ Renderer created');

    // Lighting
    const ambient = new THREE.AmbientLight(0x555577, 1);
    scene.add(ambient);

    const spot = new THREE.SpotLight(0xffffff, 2);
    spot.position.set(0, 25, 5);
    spot.angle = Math.PI / 4;
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    scene.add(spot);

    const cyanLight = new THREE.PointLight(0x00ffff, 1.5, 40);
    cyanLight.position.set(-10, 8, 0);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00ff, 1.5, 40);
    magentaLight.position.set(10, 8, 0);
    scene.add(magentaLight);

    console.log('💡 Lights added');

    // Table
    const tableGeo = new THREE.BoxGeometry(TABLE_W, 0.4, TABLE_D);
    const tableMat = new THREE.MeshStandardMaterial({ 
      color: 0x151525, 
      roughness: 0.7,
      metalness: 0.3
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // Table surface
    const surfaceGeo = new THREE.PlaneGeometry(TABLE_W - 0.5, TABLE_D - 0.5);
    const surfaceMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e, 
      roughness: 0.8 
    });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.01;
    surface.receiveShadow = true;
    scene.add(surface);

    // Neon borders
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const borderH = 0.3;
    
    // Top border
    const topBorderGeo = new THREE.BoxGeometry(TABLE_W + 0.4, borderH, 0.25);
    const topBorder = new THREE.Mesh(topBorderGeo, borderMat);
    topBorder.position.set(0, borderH / 2, -TABLE_D / 2 - 0.1);
    scene.add(topBorder);
    
    // Bottom border
    const bottomBorder = new THREE.Mesh(topBorderGeo, borderMat);
    bottomBorder.position.set(0, borderH / 2, TABLE_D / 2 + 0.1);
    scene.add(bottomBorder);
    
    // Left border
    const sideBorderGeo = new THREE.BoxGeometry(0.25, borderH, TABLE_D + 0.4);
    const leftBorder = new THREE.Mesh(sideBorderGeo, borderMat);
    leftBorder.position.set(-TABLE_W / 2 - 0.1, borderH / 2, 0);
    scene.add(leftBorder);
    
    // Right border
    const rightBorder = new THREE.Mesh(sideBorderGeo, borderMat);
    rightBorder.position.set(TABLE_W / 2 + 0.1, borderH / 2, 0);
    scene.add(rightBorder);

    // Grid
    const grid = new THREE.GridHelper(12, 12, 0x333366, 0x222244);
    grid.position.y = 0.02;
    scene.add(grid);

    console.log('🏓 Table created');

    // Green bumpers
    const bumperMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      emissive: 0x00ff00, 
      emissiveIntensity: 0.5 
    });
    
    const bumperPositions = [{ x: -4, z: 0 }, { x: 4, z: 0 }];
    bumperPositions.forEach(pos => {
      const bumperGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16);
      const bumper = new THREE.Mesh(bumperGeo, bumperMat);
      bumper.position.set(pos.x, 0.4, pos.z);
      bumper.castShadow = true;
      scene.add(bumper);
      
      // Glow ring
      const glowGeo = new THREE.RingGeometry(0.6, 0.9, 16);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(pos.x, 0.02, pos.z);
      scene.add(glow);
    });

    console.log('🔵 Bumpers created');

    // Create coins
    const coins: GameCoin[] = [];

    // Target coins
    TARGET_POSITIONS.forEach((pos, i) => {
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

    // Striker coin
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
    console.log(`🪙 Created ${coins.length} coins total`);

    // Aim line
    const lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([strikerX, 0.25, strikerZ, strikerX, 0.25, strikerZ - 5]);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const aimLine = new THREE.Line(lineGeo, lineMat);
    scene.add(aimLine);
    aimLineRef.current = aimLine;

    setSceneReady(true);
    setCoinsLeft(TARGET_POSITIONS.length);

    // Initial render
    renderer.render(scene, camera);
    console.log('✅ Scene fully initialized and rendered');

  }, [createCoin]);

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
    mat.color.setHex(power < 30 ? 0x00ffff : power < 70 ? 0xffff00 : 0xff4400);
  }, [power, aimAngle]);

  // Physics
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
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

      // Bounds check
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
      [{ x: -4, z: 0, r: 0.6 }, { x: 4, z: 0, r: 0.6 }].forEach(bumper => {
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

    // Check if done shooting
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
        endGame();
      } else {
        setGameState('playing');
      }
    }
  }, [addPopup]);

  // End game
  const endGame = useCallback(() => {
    setGameState('complete');
    if (timerRef.current) clearInterval(timerRef.current);

    const timeBonus = Math.max(0, 500 - timeElapsed * 5);
    const finalScore = Math.max(0, scoreRef.current + timeBonus);

    try {
      logGameCompletion({
        gameType: GAME_TYPES.NEON_STRIKER,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: shotsUsed > 0 ? Math.min(100, (TARGET_POSITIONS.length / shotsUsed) * 100) : 0,
        gameData: { shotsUsed, timeElapsed, rngSeed, listingId, entryNumber }
      });
    } catch (e) { console.error('Audit failed:', e); }

    onGameEnd({ 
      score: finalScore, 
      accuracy: shotsUsed > 0 ? Math.min(100, (TARGET_POSITIONS.length / shotsUsed) * 100) : 0 
    });
  }, [timeElapsed, shotsUsed, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (!sceneReady || gameState === 'ready' || gameState === 'complete') return;
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      if (isShootingRef.current) {
        updatePhysics();
      }
      
      updateAimLine();

      // Pulse effect
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

  // Start game - just change state, useEffect will init scene
  const startGame = useCallback(() => {
    console.log('🎮 Starting game...');
    scoreRef.current = 0;
    setScore(0);
    setShotsUsed(0);
    setTimeElapsed(0);
    setSceneReady(false);
    setGameState('playing');
  }, []);

  // Initialize scene when game state changes to playing and container exists
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'shooting') return;
    if (sceneReady) return; // Already initialized
    
    // Wait for container to be available
    const checkAndInit = () => {
      if (containerRef.current) {
        console.log('📦 Container found, initializing scene...');
        initScene();
        
        // Start timer
        timerRef.current = setInterval(() => {
          setTimeElapsed(t => t + 1);
        }, 1000);
      } else {
        console.log('⏳ Waiting for container...');
        setTimeout(checkAndInit, 50);
      }
    };
    
    // Small delay to ensure DOM is ready
    setTimeout(checkAndInit, 50);
  }, [gameState, sceneReady, initScene]);

  // Power charging
  const startCharging = useCallback(() => {
    if (gameState !== 'playing' || isShootingRef.current) return;
    console.log('🔋 Start charging');
    setIsCharging(true);
    setPower(0);

    let p = 0;
    powerTimerRef.current = setInterval(() => {
      p += 3;
      if (p > 100) p = 0;
      setPower(p);
    }, 30);
  }, [gameState]);

  const releaseShot = useCallback(() => {
    if (!isCharging) return;
    console.log('🚀 Release shot with power:', power);
    setIsCharging(false);
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
  }, [isCharging, power, aimAngle]);

  // Aim
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing' || isShootingRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setAimAngle(Math.atan2(x, -y));
  }, [gameState]);

  // Camera
  const switchCamera = useCallback((mode: 'full' | 'focus') => {
    if (!cameraRef.current) return;
    setViewMode(mode);
    const cam = cameraRef.current;
    const striker = coinsRef.current.find(c => c.isStriker);

    if (mode === 'full') {
      cam.position.set(0, 22, 18);
      cam.lookAt(0, 0, 2);
    } else if (striker) {
      cam.position.set(striker.x, 6, striker.z + 5);
      cam.lookAt(striker.x, 0, striker.z - 3);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (powerTimerRef.current) clearInterval(powerTimerRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
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
          
          <p className="text-cyan-400 mb-4">Precision Coin Flicking Game</p>

          <div className="bg-black/50 rounded-xl p-4 mb-5 text-left text-sm text-gray-300">
            <p className="mb-2"><span className="text-cyan-400 font-bold">🎯 GOAL:</span> Knock all <span className="text-pink-400">MAGENTA</span> coins off!</p>
            <p className="mb-2"><span className="text-green-400 font-bold">✅ +100</span> Direct hit</p>
            <p className="mb-2"><span className="text-green-400 font-bold">✅ +10</span> Bumper bounce</p>
            <p className="mb-2"><span className="text-red-400 font-bold">❌ -50</span> Chain reaction</p>
            <p><span className="text-red-400 font-bold">❌ -100</span> Striker falls off</p>
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

  // COMPLETE SCREEN
  if (gameState === 'complete') {
    const timeBonus = Math.max(0, 500 - timeElapsed * 5);
    const finalScore = Math.max(0, score + timeBonus);

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full text-center border-2 border-cyan-500">
          <h1 className="text-3xl font-bold mb-4 text-cyan-400">🏆 COMPLETE!</h1>
          
          <div className="space-y-2 mb-4 text-lg">
            <div className="flex justify-between p-2 bg-cyan-500/20 rounded">
              <span>Base Score</span><span className="text-cyan-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between p-2 bg-green-500/20 rounded">
              <span>Time Bonus</span><span className="text-green-400 font-bold">+{timeBonus}</span>
            </div>
            <div className="flex justify-between p-3 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded border border-cyan-400">
              <span className="font-bold">FINAL</span><span className="text-2xl text-cyan-300 font-bold">{finalScore}</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm">Time: {timeElapsed}s • Shots: {shotsUsed}</p>
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
          <span className="text-pink-400 font-bold">🎯 {coinsLeft}</span>
          <span className="text-green-400 font-bold">💰 {score}</span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-yellow-400 font-bold">⏱️ {timeElapsed}s</span>
          <span className="text-purple-400 font-bold">🎱 {shotsUsed}</span>
          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="text-white hover:text-red-400 ml-2">✕</button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      {gameState === 'playing' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          <button
            onClick={() => switchCamera('full')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${viewMode === 'full' ? 'bg-cyan-500 text-black' : 'bg-black/50 text-cyan-400 border border-cyan-500'}`}
          >
            👁️ FULL
          </button>
          <button
            onClick={() => switchCamera('focus')}
            className={`px-3 py-1.5 rounded text-xs font-bold ${viewMode === 'focus' ? 'bg-purple-500 text-white' : 'bg-black/50 text-purple-400 border border-purple-500'}`}
          >
            🎯 FOCUS
          </button>
        </div>
      )}

      {/* Power Bar */}
      {(gameState === 'playing' || gameState === 'shooting') && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-56">
          <div className="bg-black/70 rounded-full p-1.5 border border-cyan-500">
            <div 
              className="h-5 rounded-full transition-all"
              style={{
                width: `${Math.max(5, power)}%`,
                background: power < 30 ? 'linear-gradient(90deg, #00ffff, #00aaff)' 
                  : power < 70 ? 'linear-gradient(90deg, #ffff00, #ff8800)' 
                  : 'linear-gradient(90deg, #ff4400, #ff0000)'
              }}
            />
          </div>
          <p className="text-center text-cyan-400 text-xs mt-1">
            {isCharging ? `POWER: ${power}%` : gameState === 'shooting' ? 'STRIKING...' : 'HOLD TO CHARGE'}
          </p>
        </div>
      )}

      {/* Shoot Button */}
      {gameState === 'playing' && (
        <div 
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
          onPointerDown={startCharging}
          onPointerUp={releaseShot}
          onPointerLeave={() => isCharging && releaseShot()}
        >
          <button
            className={`w-20 h-20 rounded-full font-bold text-white transition-all shadow-lg ${
              isCharging 
                ? 'bg-gradient-to-br from-orange-500 to-red-600 scale-110' 
                : 'bg-gradient-to-br from-cyan-500 to-purple-600 hover:scale-105'
            }`}
          >
            {isCharging ? '🔥' : '🎯'}
            <div className="text-[10px] mt-1">{isCharging ? 'RELEASE!' : 'SHOOT'}</div>
          </button>
        </div>
      )}

      {/* Shooting indicator */}
      {gameState === 'shooting' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="text-3xl text-cyan-400 animate-pulse font-bold">⚡ STRIKE! ⚡</div>
        </div>
      )}

      {/* 3D Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        onPointerMove={handlePointerMove}
        style={{ 
          transform: isMobile ? 'scale(0.95)' : 'none', 
          transformOrigin: 'center' 
        }}
      />

      <FloatingScore popups={popups} removePopup={removePopup} />
    </div>
  );
}
