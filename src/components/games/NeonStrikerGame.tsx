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
  baseVx: number; // Base movement velocity
  baseVz: number;
  isStriker: boolean;
  isRemoved: boolean;
  wasHitByStriker: boolean;
  wasChainHit: boolean;
  mesh: THREE.Group | null;
}

// Level configurations with speed multipliers
const LEVELS = [
  { name: 'Triangle', coins: [{ x: 0, z: -2 }, { x: -2, z: 1 }, { x: 2, z: 1 }], bumpers: [{ x: -4, z: 0 }, { x: 4, z: 0 }], speed: 0.02, timeLimit: 30 },
  { name: 'Diamond', coins: [{ x: 0, z: -4 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 2 }], bumpers: [{ x: -5, z: -2 }, { x: 5, z: -2 }], speed: 0.025, timeLimit: 35 },
  { name: 'The Line', coins: [{ x: -4, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }], bumpers: [{ x: 0, z: -3 }, { x: 0, z: 3 }], speed: 0.03, timeLimit: 40 },
  { name: 'Circle', coins: [{ x: 0, z: -3 }, { x: 2.6, z: -1.5 }, { x: 2.6, z: 1.5 }, { x: 0, z: 3 }, { x: -2.6, z: 1.5 }, { x: -2.6, z: -1.5 }], bumpers: [{ x: 0, z: 0 }], speed: 0.035, timeLimit: 45 },
  { name: 'Fortress', coins: [{ x: -4, z: -4 }, { x: 4, z: -4 }, { x: -4, z: 2 }, { x: 4, z: 2 }, { x: -2, z: -1 }, { x: 2, z: -1 }, { x: 0, z: 0 }], bumpers: [{ x: -2, z: 3 }, { x: 2, z: 3 }, { x: 0, z: -3 }], speed: 0.04, timeLimit: 50 },
  { name: 'Chaos', coins: [{ x: -5, z: -5 }, { x: 5, z: -5 }, { x: -3, z: -2 }, { x: 3, z: -2 }, { x: 0, z: 0 }, { x: -4, z: 3 }, { x: 4, z: 3 }, { x: 0, z: 5 }], bumpers: [{ x: -2, z: 0 }, { x: 2, z: 0 }, { x: 0, z: -4 }, { x: 0, z: 2 }], speed: 0.045, timeLimit: 60 },
];

export default function NeonStrikerGame({ 
  onGameEnd, 
  onExit, 
  listingId, 
  entryNumber, 
  isCompetitionMode, 
  rngSeed 
}: NeonStrikerGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'charging' | 'shooting' | 'levelComplete' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [hitsThisShot, setHitsThisShot] = useState(0);
  const [power, setPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [levelTime, setLevelTime] = useState(0);
  const [coinsLeft, setCoinsLeft] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [aimLocked, setAimLocked] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'focus'>('full');

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinsRef = useRef<GameCoin[]>([]);
  const bumpersRef = useRef<{ x: number; z: number; r: number }[]>([]);
  const aimLineRef = useRef<THREE.Mesh | null>(null);
  const aimArrowRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const levelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const powerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isShootingRef = useRef(false);
  const scoreRef = useRef(0);
  const hitsThisShotRef = useRef(0);

  const { popups, addPopup, removePopup } = useFloatingScores();

  const TABLE_W = 14;
  const TABLE_D = 18;
  const COIN_R = 0.5;
  const FRICTION = 0.98;
  const BOUNCE = 0.9;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  // Create coin
  const createCoin = useCallback((scene: THREE.Scene, x: number, z: number, isStriker: boolean): THREE.Group => {
    const group = new THREE.Group();
    const color = isStriker ? 0x00ffff : 0xff00ff;
    
    const geo = new THREE.CylinderGeometry(COIN_R, COIN_R, 0.18, 32);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });
    const coin = new THREE.Mesh(geo, mat);
    coin.castShadow = true;
    group.add(coin);

    const ringGeo = new THREE.TorusGeometry(COIN_R, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [0.09, -0.09].forEach(y => {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    });

    const glowGeo = new THREE.RingGeometry(COIN_R + 0.1, COIN_R + 0.3, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
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
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.4, z);
    mesh.castShadow = true;
    scene.add(mesh);
    
    const glowGeo = new THREE.RingGeometry(0.6, 0.9, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, 0.02, z);
    scene.add(glow);
  }, []);

  // Init scene
  const initScene = useCallback((levelIndex: number) => {
    if (!containerRef.current) return;

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

    const surfaceGeo = new THREE.PlaneGeometry(TABLE_W - 0.5, TABLE_D - 0.5);
    const surfaceMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.01;
    scene.add(surface);

    // Borders
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    [
      { w: TABLE_W + 0.4, d: 0.25, x: 0, z: -TABLE_D / 2 - 0.1 },
      { w: TABLE_W + 0.4, d: 0.25, x: 0, z: TABLE_D / 2 + 0.1 },
      { w: 0.25, d: TABLE_D + 0.4, x: -TABLE_W / 2 - 0.1, z: 0 },
      { w: 0.25, d: TABLE_D + 0.4, x: TABLE_W / 2 + 0.1, z: 0 },
    ].forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, 0.3, b.d);
      const mesh = new THREE.Mesh(geo, borderMat);
      mesh.position.set(b.x, 0.15, b.z);
      scene.add(mesh);
    });

    const grid = new THREE.GridHelper(12, 12, 0x333366, 0x222244);
    grid.position.y = 0.02;
    scene.add(grid);

    const level = LEVELS[levelIndex];
    
    // Bumpers
    const bumperData: { x: number; z: number; r: number }[] = [];
    level.bumpers.forEach(pos => {
      createBumper(scene, pos.x, pos.z);
      bumperData.push({ x: pos.x, z: pos.z, r: 0.6 });
    });
    bumpersRef.current = bumperData;

    // Coins with RANDOM MOVEMENT
    const coins: GameCoin[] = [];
    level.coins.forEach((pos, i) => {
      const mesh = createCoin(scene, pos.x, pos.z, false);
      // Random direction for each coin
      const angle = Math.random() * Math.PI * 2;
      const speed = level.speed;
      coins.push({ 
        id: i + 1, 
        x: pos.x, 
        z: pos.z, 
        vx: 0, 
        vz: 0, 
        baseVx: Math.cos(angle) * speed, // Base movement velocity
        baseVz: Math.sin(angle) * speed,
        isStriker: false, 
        isRemoved: false, 
        wasHitByStriker: false, 
        wasChainHit: false, 
        mesh 
      });
    });

    // Striker
    const strikerZ = TABLE_D / 2 - 2;
    const strikerMesh = createCoin(scene, 0, strikerZ, true);
    coins.push({ 
      id: 0, 
      x: 0, 
      z: strikerZ, 
      vx: 0, 
      vz: 0, 
      baseVx: 0, 
      baseVz: 0, 
      isStriker: true, 
      isRemoved: false, 
      wasHitByStriker: false, 
      wasChainHit: false, 
      mesh: strikerMesh 
    });

    coinsRef.current = coins;
    setCoinsLeft(level.coins.length);

    // Aim line
    const lineGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const aimLine = new THREE.Mesh(lineGeo, lineMat);
    aimLine.rotation.x = Math.PI / 2;
    scene.add(aimLine);
    aimLineRef.current = aimLine;

    const arrowGeo = new THREE.ConeGeometry(0.2, 0.5, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI / 2;
    scene.add(arrow);
    aimArrowRef.current = arrow;

    setSceneReady(true);
    setAimLocked(false);
    setViewMode('full');
    setLevelTime(0);
    
    // Start level timer
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = setInterval(() => setLevelTime(t => t + 1), 1000);
    
    renderer.render(scene, camera);
    console.log('✅ Level', levelIndex + 1, 'ready with MOVING targets');
  }, [createCoin, createBumper]);

  // Update aim line
  const updateAimLine = useCallback(() => {
    if (!aimLineRef.current || !aimArrowRef.current) return;
    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker) return;

    const len = 3 + (power / 100) * 10;
    const midX = striker.x + Math.sin(aimAngle) * (len / 2);
    const midZ = striker.z - Math.cos(aimAngle) * (len / 2);
    const endX = striker.x + Math.sin(aimAngle) * len;
    const endZ = striker.z - Math.cos(aimAngle) * len;

    aimLineRef.current.position.set(midX, 0.2, midZ);
    aimLineRef.current.scale.y = len;
    aimLineRef.current.rotation.z = -aimAngle;

    aimArrowRef.current.position.set(endX, 0.2, endZ);
    aimArrowRef.current.rotation.z = -aimAngle;

    const lineMat = aimLineRef.current.material as THREE.MeshBasicMaterial;
    const arrowMat = aimArrowRef.current.material as THREE.MeshBasicMaterial;
    
    if (aimLocked) {
      const col = power < 30 ? 0xffff00 : power < 70 ? 0xff8800 : 0xff0000;
      lineMat.color.setHex(col);
      arrowMat.color.setHex(col);
      lineMat.opacity = 1;
      arrowMat.opacity = 1;
    } else {
      lineMat.color.setHex(0x00ffff);
      arrowMat.color.setHex(0x00ffff);
      lineMat.opacity = 0.8;
      arrowMat.opacity = 0.8;
    }
  }, [power, aimAngle, aimLocked]);

  // Switch camera view
  const switchView = useCallback((mode: 'full' | 'focus') => {
    if (!cameraRef.current) return;
    setViewMode(mode);
    const cam = cameraRef.current;
    const striker = coinsRef.current.find(c => c.isStriker);

    if (mode === 'full') {
      cam.position.set(0, 22, 18);
      cam.lookAt(0, 0, 2);
    } else if (striker) {
      cam.position.set(striker.x, 8, striker.z + 6);
      cam.lookAt(striker.x, 0, striker.z - 4);
    }
  }, []);

  // Physics with MOVING TARGETS
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
    const bumpers = bumpersRef.current;
    let anyMoving = false;
    const halfW = TABLE_W / 2 - COIN_R;
    const halfD = TABLE_D / 2 - COIN_R;

    coins.forEach(coin => {
      if (coin.isRemoved || !coin.mesh) return;

      // Apply base movement for target coins (they keep moving!)
      if (!coin.isStriker && !isShootingRef.current) {
        coin.vx = coin.baseVx;
        coin.vz = coin.baseVz;
      }

      // Apply velocity
      coin.x += coin.vx;
      coin.z += coin.vz;

      // Friction only when shooting (targets keep moving otherwise)
      if (isShootingRef.current || coin.isStriker) {
        coin.vx *= FRICTION;
        coin.vz *= FRICTION;
        if (Math.abs(coin.vx) < 0.005 && Math.abs(coin.vz) < 0.005 && coin.isStriker) {
          coin.vx = 0;
          coin.vz = 0;
        } else if (coin.isStriker && (Math.abs(coin.vx) > 0.005 || Math.abs(coin.vz) > 0.005)) {
          anyMoving = true;
        }
      }

      // Bounce off walls for target coins
      if (!coin.isStriker) {
        if (Math.abs(coin.x) > halfW) {
          coin.x = Math.sign(coin.x) * halfW;
          coin.vx *= -BOUNCE;
          coin.baseVx *= -1;
        }
        if (Math.abs(coin.z) > halfD) {
          coin.z = Math.sign(coin.z) * halfD;
          coin.vz *= -BOUNCE;
          coin.baseVz *= -1;
        }
      }

      // Striker falls off = penalty
      if (coin.isStriker && (Math.abs(coin.x) > halfW || Math.abs(coin.z) > halfD)) {
        coin.isRemoved = true;
        coin.mesh.visible = false;
        scoreRef.current -= 100;
        setScore(scoreRef.current);
        addPopup(-100, 50, 50, 'kill', 'STRIKER FELL! -100');
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
          coin.vx = (coin.vx - 2 * dot * nx) * BOUNCE;
          coin.vz = (coin.vz - 2 * dot * nz) * BOUNCE;
          if (!coin.isStriker) {
            coin.baseVx = coin.vx;
            coin.baseVz = coin.vz;
          }
          coin.x = bumper.x + nx * (COIN_R + bumper.r + 0.1);
          coin.z = bumper.z + nz * (COIN_R + bumper.r + 0.1);
        }
      });

      coin.mesh.position.set(coin.x, 0.12, coin.z);
    });

    // Coin-coin collisions
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const a = coins[i];
        const b = coins[j];
        if (a.isRemoved || b.isRemoved) continue;

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
            a.vx -= dvn * nx * BOUNCE;
            a.vz -= dvn * nz * BOUNCE;
            b.vx += dvn * nx * BOUNCE;
            b.vz += dvn * nz * BOUNCE;

            const overlap = COIN_R * 2 - dist;
            a.x -= overlap * nx * 0.5;
            a.z -= overlap * nz * 0.5;
            b.x += overlap * nx * 0.5;
            b.z += overlap * nz * 0.5;

            // SCORING LOGIC
            if (a.isStriker && !b.isStriker && !b.isRemoved && !b.wasHitByStriker) {
              // Striker hit target = +100
              b.wasHitByStriker = true;
              b.isRemoved = true;
              if (b.mesh) b.mesh.visible = false;
              scoreRef.current += 100;
              hitsThisShotRef.current++;
              setHitsThisShot(hitsThisShotRef.current);
              setScore(scoreRef.current);
              addPopup(100, 50, 40, 'perfect', 'HIT! +100');
              setCoinsLeft(c => Math.max(0, c - 1));
            } else if (b.isStriker && !a.isStriker && !a.isRemoved && !a.wasHitByStriker) {
              // Striker hit target = +100
              a.wasHitByStriker = true;
              a.isRemoved = true;
              if (a.mesh) a.mesh.visible = false;
              scoreRef.current += 100;
              hitsThisShotRef.current++;
              setHitsThisShot(hitsThisShotRef.current);
              setScore(scoreRef.current);
              addPopup(100, 50, 40, 'perfect', 'HIT! +100');
              setCoinsLeft(c => Math.max(0, c - 1));
            } else if (!a.isStriker && !b.isStriker) {
              // Two targets colliding = -25 each time!
              scoreRef.current -= 25;
              setScore(scoreRef.current);
              addPopup(-25, 50, 50, 'kill', 'ENEMY COLLISION! -25');
            }
          }
        }
      }
    }

    // Check if shooting done
    if (isShootingRef.current && !anyMoving) {
      isShootingRef.current = false;
      
      // -10 for missing (no hits this shot)
      if (hitsThisShotRef.current === 0) {
        scoreRef.current -= 10;
        setScore(scoreRef.current);
        addPopup(-10, 50, 50, 'kill', 'MISS! -10');
      }
      hitsThisShotRef.current = 0;
      setHitsThisShot(0);
      
      const striker = coins.find(c => c.isStriker);
      if (striker && striker.isRemoved && striker.mesh) {
        striker.isRemoved = false;
        striker.x = 0;
        striker.z = TABLE_D / 2 - 2;
        striker.vx = 0;
        striker.vz = 0;
        striker.mesh.visible = true;
        striker.mesh.position.set(striker.x, 0.12, striker.z);
      }

      // Reset hit tracking
      coins.forEach(c => {
        c.wasChainHit = false;
        if (!c.isRemoved && !c.isStriker) {
          c.wasHitByStriker = false;
        }
      });

      const remaining = coins.filter(c => !c.isStriker && !c.isRemoved).length;
      if (remaining === 0) {
        // SPEED BONUS based on time
        const level = LEVELS[currentLevel];
        const timeBonus = Math.max(0, (level.timeLimit - levelTime) * 10);
        scoreRef.current += 200 + timeBonus;
        setScore(scoreRef.current);
        
        if (levelTimerRef.current) clearInterval(levelTimerRef.current);
        
        if (timeBonus > 0) {
          addPopup(200 + timeBonus, 50, 30, 'critical', `LEVEL DONE! +${200 + timeBonus}`);
        } else {
          addPopup(200, 50, 30, 'critical', 'LEVEL COMPLETE! +200');
        }
        
        if (currentLevel < LEVELS.length - 1) {
          setGameState('levelComplete');
        } else {
          endGame();
        }
      } else {
        setGameState('playing');
        setAimLocked(false);
      }
    }
  }, [addPopup, currentLevel, levelTime]);

  // End game
  const endGame = useCallback(() => {
    setGameState('complete');
    if (timerRef.current) clearInterval(timerRef.current);
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);

    const finalScore = scoreRef.current;

    try {
      logGameCompletion({
        gameType: GAME_TYPES.NEON_STRIKER,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: shotsUsed > 0 ? Math.min(100, ((currentLevel + 1) * 3 / shotsUsed) * 100) : 0,
        gameData: { shotsUsed, timeElapsed, levelsCompleted: currentLevel + 1, rngSeed, listingId, entryNumber }
      });
    } catch (e) { console.error('Audit failed:', e); }

    onGameEnd({ score: finalScore, accuracy: shotsUsed > 0 ? Math.min(100, ((currentLevel + 1) * 3 / shotsUsed) * 100) : 0 });
  }, [shotsUsed, timeElapsed, currentLevel, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation
  useEffect(() => {
    if (!sceneReady || gameState === 'ready' || gameState === 'complete' || gameState === 'levelComplete') return;
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      updatePhysics();
      updateAimLine();

      const time = Date.now() * 0.003;
      coinsRef.current.forEach(coin => {
        if (coin.mesh && !coin.isRemoved) {
          coin.mesh.position.y = 0.12 + Math.sin(time + coin.id) * 0.015;
        }
      });

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [sceneReady, gameState, updatePhysics, updateAimLine]);

  // Start game
  const startGame = useCallback(() => {
    scoreRef.current = 0;
    hitsThisShotRef.current = 0;
    setScore(0);
    setShotsUsed(0);
    setHitsThisShot(0);
    setTimeElapsed(0);
    setLevelTime(0);
    setCurrentLevel(0);
    setSceneReady(false);
    setGameState('playing');
    
    timerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000);
  }, []);

  // Next level
  const nextLevel = useCallback(() => {
    setCurrentLevel(prev => prev + 1);
    setSceneReady(false);
    setGameState('playing');
  }, []);

  // Init scene effect
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'charging' && gameState !== 'shooting') return;
    if (sceneReady) return;
    
    const checkAndInit = () => {
      if (containerRef.current) {
        initScene(currentLevel);
      } else {
        setTimeout(checkAndInit, 50);
      }
    };
    setTimeout(checkAndInit, 50);
  }, [gameState, sceneReady, currentLevel, initScene]);

  // Pointer handlers
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const newAngle = Math.atan2(x * 2, -y * 1.5);
    
    if (!aimLocked) {
      setAimAngle(newAngle);
    }
  }, [gameState, aimLocked]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const newAngle = Math.atan2(x * 2, -y * 1.5);

    if (!aimLocked) {
      setAimAngle(newAngle);
      setAimLocked(true);
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

    hitsThisShotRef.current = 0;
    setHitsThisShot(0);
    isShootingRef.current = true;
    setGameState('shooting');
    setShotsUsed(s => s + 1);
    setPower(0);
    setAimLocked(false);
  }, [gameState, power, aimAngle]);

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
      if (levelTimerRef.current) clearInterval(levelTimerRef.current);
      if (powerTimerRef.current) clearInterval(powerTimerRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // READY SCREEN
  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-lg w-full text-center border-2 border-cyan-500 shadow-[0_0_40px_rgba(0,255,255,0.3)]">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">⚡ NEON STRIKER</h1>
          <p className="text-cyan-400 mb-4">Moving Targets • Speed Bonus</p>

          <div className="bg-black/50 rounded-xl p-4 mb-5 text-left text-sm text-gray-300">
            <p className="mb-2 text-cyan-400 font-bold">🎯 Hit MOVING coins to remove them!</p>
            <p className="mb-1">• <span className="text-yellow-400">TAP & HOLD</span> to aim and charge</p>
            <p className="mb-3">• <span className="text-red-400">RELEASE</span> to shoot!</p>
            <p className="mb-1"><span className="text-green-400 font-bold">+100</span> Hit a coin</p>
            <p className="mb-1"><span className="text-yellow-400 font-bold">+SPEED BONUS</span> Complete level fast!</p>
            <p className="mb-1"><span className="text-red-400 font-bold">-25</span> Enemy coins collide</p>
            <p className="mb-1"><span className="text-red-400 font-bold">-10</span> Miss a shot</p>
            <p><span className="text-red-400 font-bold">-100</span> Striker falls off</p>
          </div>

          <button onClick={startGame} className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 transition-all">
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
    const level = LEVELS[currentLevel];
    const timeBonus = Math.max(0, (level.timeLimit - levelTime) * 10);
    
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full text-center border-2 border-green-500 shadow-[0_0_40px_rgba(0,255,0,0.3)]">
          <h1 className="text-3xl font-bold mb-2 text-green-400">✨ LEVEL {currentLevel + 1} COMPLETE!</h1>
          <p className="text-gray-400 mb-2">{LEVELS[currentLevel].name}</p>
          <p className="text-yellow-400 mb-4">⏱️ Time: {levelTime}s {timeBonus > 0 && <span className="text-green-400">(+{timeBonus} speed bonus!)</span>}</p>
          <div className="text-2xl text-cyan-400 font-bold mb-4">Score: {score}</div>
          <p className="text-gray-300 mb-4">Next: Level {currentLevel + 2} - {LEVELS[currentLevel + 1]?.name}</p>
          <button onClick={nextLevel} className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white hover:scale-105 transition-all">
            ▶️ NEXT LEVEL
          </button>
        </div>
      </div>
    );
  }

  // COMPLETE
  if (gameState === 'complete') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full text-center border-2 border-cyan-500">
          <h1 className="text-3xl font-bold mb-4 text-cyan-400">🏆 ALL LEVELS COMPLETE!</h1>
          <div className="text-3xl text-cyan-300 font-bold mb-4">{score} pts</div>
          <p className="text-gray-400 text-sm">Levels: {currentLevel + 1}/{LEVELS.length} • Time: {timeElapsed}s • Shots: {shotsUsed}</p>
        </div>
      </div>
    );
  }

  // GAME
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
          <span className="text-yellow-400 font-bold">⏱️ {levelTime}s</span>
          <span className="text-cyan-400 font-bold">🎱 {shotsUsed}</span>
          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="text-white hover:text-red-400 ml-2">✕</button>
          )}
        </div>
      </div>

      {/* View buttons */}
      <div className="absolute top-12 left-4 z-30 flex gap-2">
        <button
          onClick={() => switchView('full')}
          className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'full' ? 'bg-cyan-500 text-black' : 'bg-black/60 text-cyan-400 border border-cyan-500'}`}
        >
          👁️ FULL
        </button>
        <button
          onClick={() => switchView('focus')}
          className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'focus' ? 'bg-purple-500 text-white' : 'bg-black/60 text-purple-400 border border-purple-500'}`}
        >
          🎯 FOCUS
        </button>
      </div>

      {/* Status */}
      <div className="absolute top-12 right-4 z-30 text-right">
        {gameState === 'playing' && <div className="text-cyan-400 text-xs animate-pulse">Targets MOVING! TAP to shoot</div>}
        {gameState === 'charging' && <div className="text-orange-400 text-sm font-bold animate-pulse">🔥 CHARGING!</div>}
        {gameState === 'shooting' && <div className="text-cyan-400 text-lg font-bold animate-pulse">⚡ STRIKE!</div>}
      </div>

      {/* Cancel */}
      {aimLocked && gameState !== 'shooting' && (
        <button onClick={cancelAim} className="absolute top-24 right-4 z-30 px-3 py-1 bg-red-500/50 text-white rounded text-xs">✕ Cancel</button>
      )}

      {/* Power bar */}
      {gameState === 'charging' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-64">
          <div className="bg-black/70 rounded-full p-2 border-2 border-orange-500">
            <div 
              className="h-6 rounded-full transition-all"
              style={{
                width: `${Math.max(5, power)}%`,
                background: power < 30 ? 'linear-gradient(90deg, #ffff00, #ffaa00)' : power < 70 ? 'linear-gradient(90deg, #ff8800, #ff4400)' : 'linear-gradient(90deg, #ff0000, #cc0000)'
              }}
            />
          </div>
          <p className="text-center text-orange-400 text-sm mt-1 font-bold">POWER: {power}%</p>
        </div>
      )}

      {/* Level info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center">
        <div className="text-gray-500 text-xs">{LEVELS[currentLevel]?.name}</div>
        <div className="text-gray-600 text-[10px]">Time Limit: {LEVELS[currentLevel]?.timeLimit}s for speed bonus</div>
      </div>

      {/* 3D Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        style={{ transform: isMobile ? 'scale(0.95)' : 'none', transformOrigin: 'center', cursor: aimLocked ? 'grabbing' : 'crosshair' }}
      />

      <FloatingScore popups={popups} removePopup={removePopup} />
    </div>
  );
}
