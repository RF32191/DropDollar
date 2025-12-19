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
}

// Fixed coin arrangement - same for everyone
const TARGET_POSITIONS = [
  { x: 0, z: 0 },      // Center
  { x: -3, z: -2 },    // Left back
  { x: 3, z: -2 },     // Right back
  { x: -2, z: 1 },     // Left middle
  { x: 2, z: 1 },      // Right middle
  { x: -4, z: -4 },    // Far left back
  { x: 4, z: -4 },     // Far right back
  { x: 0, z: 3 },      // Center front
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinsRef = useRef<GameCoin[]>([]);
  const coinMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const powerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isShootingRef = useRef(false);

  const { popups, addPopup, removePopup } = useFloatingScores();

  // Constants
  const TABLE_W = 14;
  const TABLE_D = 18;
  const COIN_R = 0.5;
  const FRICTION = 0.98;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  // Create a 3D coin mesh
  const createCoinMesh = useCallback((color: number, emissive: number) => {
    const group = new THREE.Group();
    
    // Main cylinder
    const geo = new THREE.CylinderGeometry(COIN_R, COIN_R, 0.15, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1,
    });
    const coin = new THREE.Mesh(geo, mat);
    coin.castShadow = true;
    group.add(coin);

    // Top ring
    const ringGeo = new THREE.TorusGeometry(COIN_R, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.075;
    group.add(topRing);

    // Bottom ring
    const bottomRing = new THREE.Mesh(ringGeo, ringMat);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = -0.075;
    group.add(bottomRing);

    return group;
  }, []);

  // Initialize the 3D scene
  const initScene = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 22, 16);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0x404060, 0.8));
    
    const spot = new THREE.SpotLight(0xffffff, 1.5);
    spot.position.set(0, 20, 5);
    spot.castShadow = true;
    scene.add(spot);

    const cyan = new THREE.PointLight(0x00ffff, 1, 30);
    cyan.position.set(-8, 6, 0);
    scene.add(cyan);

    const magenta = new THREE.PointLight(0xff00ff, 1, 30);
    magenta.position.set(8, 6, 0);
    scene.add(magenta);

    // Table
    const tableGeo = new THREE.BoxGeometry(TABLE_W, 0.3, TABLE_D);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.7 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.15;
    table.receiveShadow = true;
    scene.add(table);

    // Neon border
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const borders = [
      { w: TABLE_W + 0.3, d: 0.2, x: 0, z: -TABLE_D / 2 },
      { w: TABLE_W + 0.3, d: 0.2, x: 0, z: TABLE_D / 2 },
      { w: 0.2, d: TABLE_D, x: -TABLE_W / 2, z: 0 },
      { w: 0.2, d: TABLE_D, x: TABLE_W / 2, z: 0 },
    ];
    borders.forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, 0.25, b.d);
      const mesh = new THREE.Mesh(geo, borderMat);
      mesh.position.set(b.x, 0.125, b.z);
      scene.add(mesh);
    });

    // Grid
    const grid = new THREE.GridHelper(12, 12, 0x333366, 0x222244);
    grid.position.y = 0.01;
    scene.add(grid);

    // Bumpers (green obstacles)
    const bumperMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      emissive: 0x00ff00, 
      emissiveIntensity: 0.4 
    });
    [{ x: -3.5, z: 0 }, { x: 3.5, z: 0 }].forEach(pos => {
      const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16);
      const mesh = new THREE.Mesh(geo, bumperMat);
      mesh.position.set(pos.x, 0.4, pos.z);
      mesh.castShadow = true;
      scene.add(mesh);
    });

    // Create target coins
    const coins: GameCoin[] = [];
    const meshes = new Map<number, THREE.Mesh>();

    TARGET_POSITIONS.forEach((pos, i) => {
      const coinData: GameCoin = {
        id: i + 1,
        x: pos.x,
        z: pos.z,
        vx: 0,
        vz: 0,
        isStriker: false,
        isKnockedOff: false,
        wasHitByStriker: false,
        wasChainHit: false,
      };
      coins.push(coinData);

      const mesh = createCoinMesh(0xff00ff, 0xff00ff) as unknown as THREE.Mesh;
      mesh.position.set(pos.x, 0.1, pos.z);
      scene.add(mesh);
      meshes.set(coinData.id, mesh);
    });

    // Create striker coin (cyan)
    const strikerId = 0;
    const strikerData: GameCoin = {
      id: strikerId,
      x: 0,
      z: TABLE_D / 2 - 1.5,
      vx: 0,
      vz: 0,
      isStriker: true,
      isKnockedOff: false,
      wasHitByStriker: false,
      wasChainHit: false,
    };
    coins.push(strikerData);

    const strikerMesh = createCoinMesh(0x00ffff, 0x00ffff) as unknown as THREE.Mesh;
    strikerMesh.position.set(strikerData.x, 0.1, strikerData.z);
    scene.add(strikerMesh);
    meshes.set(strikerId, strikerMesh);

    coinsRef.current = coins;
    coinMeshesRef.current = meshes;

    // Aim line
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.2, 0, 0, 0.2, -5], 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const aimLine = new THREE.Line(lineGeo, lineMat);
    aimLine.name = 'aimLine';
    scene.add(aimLine);

    console.log('✅ Scene initialized with', coins.length, 'coins');
  }, [createCoinMesh]);

  // Update aim line position
  const updateAimLine = useCallback(() => {
    if (!sceneRef.current) return;
    const line = sceneRef.current.getObjectByName('aimLine') as THREE.Line;
    if (!line) return;

    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker) return;

    const len = 2 + (power / 100) * 8;
    const endX = striker.x + Math.sin(aimAngle) * len;
    const endZ = striker.z - Math.cos(aimAngle) * len;

    const positions = new Float32Array([striker.x, 0.2, striker.z, endX, 0.2, endZ]);
    line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    line.geometry.attributes.position.needsUpdate = true;

    // Color based on power
    const mat = line.material as THREE.LineBasicMaterial;
    if (power < 30) mat.color.setHex(0x00ffff);
    else if (power < 70) mat.color.setHex(0xffff00);
    else mat.color.setHex(0xff4400);
  }, [power, aimAngle]);

  // Physics update
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
    const meshes = coinMeshesRef.current;

    let anyMoving = false;

    // Update each coin
    coins.forEach(coin => {
      if (coin.isKnockedOff) return;

      // Apply velocity
      coin.x += coin.vx;
      coin.z += coin.vz;

      // Apply friction
      coin.vx *= FRICTION;
      coin.vz *= FRICTION;

      // Stop if slow
      if (Math.abs(coin.vx) < 0.005 && Math.abs(coin.vz) < 0.005) {
        coin.vx = 0;
        coin.vz = 0;
      } else {
        anyMoving = true;
      }

      // Check bounds - did it fall off?
      const halfW = TABLE_W / 2 - COIN_R;
      const halfD = TABLE_D / 2 - COIN_R;
      
      if (Math.abs(coin.x) > halfW || Math.abs(coin.z) > halfD) {
        coin.isKnockedOff = true;
        const mesh = meshes.get(coin.id);
        if (mesh) mesh.visible = false;

        if (coin.isStriker) {
          // Striker fell off - penalty!
          setScore(s => s - 100);
          addPopup(-100, 50, 50, 'kill', 'STRIKER FELL! -100');
        } else {
          // Target coin knocked off
          if (coin.wasChainHit) {
            setScore(s => s - 50);
            addPopup(-50, 50, 50, 'kill', 'CHAIN HIT! -50');
          } else if (coin.wasHitByStriker) {
            setScore(s => s + 100);
            addPopup(100, 50, 40, 'perfect', 'PERFECT! +100');
          }
          setCoinsLeft(c => Math.max(0, c - 1));
        }
      }

      // Bounce off bumpers
      [{ x: -3.5, z: 0, r: 0.6 }, { x: 3.5, z: 0, r: 0.6 }].forEach(bumper => {
        const dx = coin.x - bumper.x;
        const dz = coin.z - bumper.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < COIN_R + bumper.r) {
          const nx = dx / dist;
          const nz = dz / dist;
          const dot = coin.vx * nx + coin.vz * nz;
          coin.vx = (coin.vx - 2 * dot * nx) * 1.1;
          coin.vz = (coin.vz - 2 * dot * nz) * 1.1;
          coin.x = bumper.x + nx * (COIN_R + bumper.r + 0.05);
          coin.z = bumper.z + nz * (COIN_R + bumper.r + 0.05);
          setScore(s => s + 10);
          addPopup(10, 50, 50, 'bonus', 'BUMPER! +10');
        }
      });

      // Update mesh position
      const mesh = meshes.get(coin.id);
      if (mesh) {
        mesh.position.x = coin.x;
        mesh.position.z = coin.z;
      }
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

            // Separate
            const overlap = COIN_R * 2 - dist;
            a.x -= overlap * nx * 0.5;
            a.z -= overlap * nz * 0.5;
            b.x += overlap * nx * 0.5;
            b.z += overlap * nz * 0.5;

            // Track who hit who
            if (a.isStriker && !b.wasHitByStriker) {
              b.wasHitByStriker = true;
            } else if (b.isStriker && !a.wasHitByStriker) {
              a.wasHitByStriker = true;
            } else if (!a.isStriker && !b.isStriker) {
              // Chain hit
              if (a.wasHitByStriker && !b.wasHitByStriker) {
                b.wasChainHit = true;
              } else if (b.wasHitByStriker && !a.wasHitByStriker) {
                a.wasChainHit = true;
              }
            }
          }
        }
      }
    }

    // Check if shooting is done
    if (isShootingRef.current && !anyMoving) {
      isShootingRef.current = false;
      
      // Reset striker if it fell
      const striker = coins.find(c => c.isStriker);
      if (striker && striker.isKnockedOff) {
        striker.isKnockedOff = false;
        striker.x = 0;
        striker.z = TABLE_D / 2 - 1.5;
        striker.vx = 0;
        striker.vz = 0;
        const mesh = coinMeshesRef.current.get(striker.id);
        if (mesh) {
          mesh.visible = true;
          mesh.position.set(striker.x, 0.1, striker.z);
        }
      }

      // Reset hit tracking for remaining coins
      coins.forEach(c => {
        if (!c.isKnockedOff && !c.isStriker) {
          c.wasHitByStriker = false;
          c.wasChainHit = false;
        }
      });

      // Check win condition
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
    const finalScore = Math.max(0, score + timeBonus);

    try {
      logGameCompletion({
        gameType: GAME_TYPES.NEON_STRIKER,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: shotsUsed > 0 ? (TARGET_POSITIONS.length / shotsUsed) * 100 : 0,
        gameData: { shotsUsed, timeElapsed, rngSeed, listingId, entryNumber }
      });
    } catch (e) {
      console.error('Audit failed:', e);
    }

    onGameEnd({ score: finalScore, accuracy: shotsUsed > 0 ? (TARGET_POSITIONS.length / shotsUsed) * 100 : 0 });
  }, [score, timeElapsed, shotsUsed, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'shooting') return;
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      if (isShootingRef.current) {
        updatePhysics();
      }
      updateAimLine();

      // Pulse effect on coins
      const time = Date.now() * 0.003;
      coinMeshesRef.current.forEach((mesh, id) => {
        if (mesh.visible) {
          mesh.position.y = 0.1 + Math.sin(time + id) * 0.02;
        }
      });

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, updatePhysics, updateAimLine]);

  // Start game
  const startGame = useCallback(() => {
    initScene();
    setGameState('playing');
    setScore(0);
    setShotsUsed(0);
    setTimeElapsed(0);
    setCoinsLeft(TARGET_POSITIONS.length);

    timerRef.current = setInterval(() => {
      setTimeElapsed(t => t + 1);
    }, 1000);
  }, [initScene]);

  // Power charging
  const startCharging = useCallback(() => {
    if (gameState !== 'playing' || isShootingRef.current) return;
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

  // Aim handling
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing' || isShootingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setAimAngle(Math.atan2(x, -y));
  }, [gameState]);

  // Camera switching
  const switchCamera = useCallback((mode: 'full' | 'focus') => {
    if (!cameraRef.current) return;
    setViewMode(mode);
    const cam = cameraRef.current;
    const striker = coinsRef.current.find(c => c.isStriker);

    if (mode === 'full') {
      cam.position.set(0, 22, 16);
      cam.lookAt(0, 0, 0);
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
          
          <p className="text-cyan-400 mb-4">Precision Coin Flicking Game</p>

          <div className="bg-black/50 rounded-xl p-4 mb-5 text-left text-sm text-gray-300 max-h-40 overflow-y-auto">
            <p className="mb-2"><span className="text-cyan-400 font-bold">🎯 GOAL:</span> Knock all <span className="text-pink-400">MAGENTA</span> coins off!</p>
            <p className="mb-2"><span className="text-green-400 font-bold">✅ +100</span> Direct hit</p>
            <p className="mb-2"><span className="text-green-400 font-bold">✅ +10</span> Bumper bounce</p>
            <p className="mb-2"><span className="text-red-400 font-bold">❌ -50</span> Chain reaction (coin hits coin)</p>
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
    <div className="fixed inset-0 bg-black z-50" style={{ touchAction: 'none' }}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/70 p-2 flex justify-between items-center">
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
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
      {gameState === 'playing' && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 w-56">
          <div className="bg-black/70 rounded-full p-1.5 border border-cyan-500">
            <div 
              className="h-5 rounded-full transition-all"
              style={{
                width: `${power}%`,
                background: power < 30 ? 'linear-gradient(90deg, #00ffff, #00aaff)' 
                  : power < 70 ? 'linear-gradient(90deg, #ffff00, #ff8800)' 
                  : 'linear-gradient(90deg, #ff4400, #ff0000)'
              }}
            />
          </div>
          <p className="text-center text-cyan-400 text-xs mt-1">
            {isCharging ? `POWER: ${power}%` : 'HOLD TO CHARGE'}
          </p>
        </div>
      )}

      {/* Shoot Button */}
      {gameState === 'playing' && (
        <div 
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
          onPointerDown={startCharging}
          onPointerUp={releaseShot}
          onPointerLeave={() => isCharging && releaseShot()}
        >
          <button
            className={`w-20 h-20 rounded-full font-bold text-white transition-all shadow-lg ${
              isCharging 
                ? 'bg-gradient-to-br from-orange-500 to-red-600 scale-110' 
                : 'bg-gradient-to-br from-cyan-500 to-purple-600'
            }`}
          >
            {isCharging ? '🔥' : '🎯'}
            <div className="text-[10px] mt-1">{isCharging ? 'RELEASE!' : 'SHOOT'}</div>
          </button>
        </div>
      )}

      {/* Shooting indicator */}
      {gameState === 'shooting' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="text-3xl text-cyan-400 animate-pulse font-bold">⚡ STRIKE! ⚡</div>
        </div>
      )}

      {/* Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        onPointerMove={handlePointerMove}
        style={{ transform: isMobile ? 'scale(0.95)' : 'none', transformOrigin: 'center' }}
      />

      <FloatingScore popups={popups} removePopup={removePopup} />
    </div>
  );
}
