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
  wasHitByStriker: boolean; // Track if hit by striker
  isSettled: boolean; // Track if coin has stopped moving after being hit
  hitAnotherCoin: boolean; // Track if this coin hit another coin after being hit
  mesh: THREE.Group | null;
}

// Level configurations with coin positions
const LEVELS = [
  { name: 'Triangle', coins: [{ x: 0, z: -2 }, { x: -2, z: 1 }, { x: 2, z: 1 }], bumpers: [{ x: -4, z: 0 }, { x: 4, z: 0 }], timeLimit: 45 },
  { name: 'Diamond', coins: [{ x: 0, z: -4 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 2 }], bumpers: [{ x: -5, z: -2 }, { x: 5, z: -2 }], timeLimit: 50 },
  { name: 'The Line', coins: [{ x: -4, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }], bumpers: [{ x: 0, z: -3 }, { x: 0, z: 3 }], timeLimit: 55 },
  { name: 'Circle', coins: [{ x: 0, z: -3 }, { x: 2.6, z: -1.5 }, { x: 2.6, z: 1.5 }, { x: 0, z: 3 }, { x: -2.6, z: 1.5 }, { x: -2.6, z: -1.5 }], bumpers: [{ x: 0, z: 0 }], timeLimit: 60 },
  { name: 'Fortress', coins: [{ x: -4, z: -4 }, { x: 4, z: -4 }, { x: -4, z: 2 }, { x: 4, z: 2 }, { x: -2, z: -1 }, { x: 2, z: -1 }, { x: 0, z: 0 }], bumpers: [{ x: -2, z: 3 }, { x: 2, z: 3 }, { x: 0, z: -3 }], timeLimit: 70 },
  { name: 'Chaos', coins: [{ x: -5, z: -5 }, { x: 5, z: -5 }, { x: -3, z: -2 }, { x: 3, z: -2 }, { x: 0, z: 0 }, { x: -4, z: 3 }, { x: 4, z: 3 }, { x: 0, z: 5 }], bumpers: [{ x: -2, z: 0 }, { x: 2, z: 0 }, { x: 0, z: -4 }, { x: 0, z: 2 }], timeLimit: 80 },
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
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

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
  const joystickStartRef = useRef<{ x: number; y: number } | null>(null);

  const { popups, addPopup, removePopup } = useFloatingScores();

  const TABLE_W = 14;
  const TABLE_D = 18;
  const COIN_R = 0.55;
  const FRICTION = 0.985;
  const BOUNCE = 0.85;
  const COLLISION_DAMPING = 0.95;
  const MASS_TRANSFER = 0.9;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  // Create 3D coin with glow effects
  const createCoin = useCallback((scene: THREE.Scene, x: number, z: number, isStriker: boolean): THREE.Group => {
    const group = new THREE.Group();
    const color = isStriker ? 0x00ffff : 0xff00ff;
    
    // Main coin body
    const geo = new THREE.CylinderGeometry(COIN_R, COIN_R, 0.2, 32);
    const mat = new THREE.MeshStandardMaterial({ 
      color, 
      emissive: color, 
      emissiveIntensity: 0.7, 
      metalness: 0.95, 
      roughness: 0.1 
    });
    const coin = new THREE.Mesh(geo, mat);
    coin.castShadow = true;
    group.add(coin);

    // Edge rings
    const ringGeo = new THREE.TorusGeometry(COIN_R, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [0.1, -0.1].forEach(y => {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    });

    // Glow effect
    const glowGeo = new THREE.RingGeometry(COIN_R + 0.15, COIN_R + 0.4, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    group.add(glow);

    // Center emblem
    const emblemGeo = new THREE.CircleGeometry(COIN_R * 0.4, 16);
    const emblemMat = new THREE.MeshBasicMaterial({ color: isStriker ? 0x00aaaa : 0xaa00aa, side: THREE.DoubleSide });
    const topEmblem = new THREE.Mesh(emblemGeo, emblemMat);
    topEmblem.rotation.x = -Math.PI / 2;
    topEmblem.position.y = 0.11;
    group.add(topEmblem);

    group.position.set(x, 0.15, z);
    scene.add(group);
    return group;
  }, []);

  // Create bumper obstacle
  const createBumper = useCallback((scene: THREE.Scene, x: number, z: number) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.6 });
    const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.9, 16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.45, z);
    mesh.castShadow = true;
    scene.add(mesh);
    
    // Bumper glow
    const glowGeo = new THREE.RingGeometry(0.7, 1.0, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, 0.02, z);
    scene.add(glow);
  }, []);

  // Initialize scene
  const initScene = useCallback((levelIndex: number) => {
    if (!containerRef.current) return;

    // Cleanup previous renderer
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
    scene.background = new THREE.Color(0x080818);
    scene.fog = new THREE.Fog(0x080818, 30, 60);
    sceneRef.current = scene;

    // Camera - zoom out more on mobile
    const fov = isMobile ? 65 : 50;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 100);
    camera.position.set(0, isMobile ? 28 : 24, isMobile ? 22 : 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0x666688, 1.2));
    const spot = new THREE.SpotLight(0xffffff, 2.5);
    spot.position.set(0, 30, 5);
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    scene.add(spot);
    
    const cyanLight = new THREE.PointLight(0x00ffff, 2, 50);
    cyanLight.position.set(-12, 10, -8);
    scene.add(cyanLight);
    
    const pinkLight = new THREE.PointLight(0xff00ff, 2, 50);
    pinkLight.position.set(12, 10, 8);
    scene.add(pinkLight);

    // Table base
    const tableGeo = new THREE.BoxGeometry(TABLE_W + 1, 0.4, TABLE_D + 1);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.8 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // Playing surface
    const surfaceGeo = new THREE.PlaneGeometry(TABLE_W - 0.4, TABLE_D - 0.4);
    const surfaceMat = new THREE.MeshStandardMaterial({ color: 0x151528, roughness: 0.7 });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.01;
    surface.receiveShadow = true;
    scene.add(surface);

    // Neon borders with pockets (edges where coins fall off)
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const borderGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    
    // Create borders
    [
      { w: TABLE_W + 0.6, d: 0.3, x: 0, z: -TABLE_D / 2 - 0.1 },
      { w: TABLE_W + 0.6, d: 0.3, x: 0, z: TABLE_D / 2 + 0.1 },
      { w: 0.3, d: TABLE_D + 0.6, x: -TABLE_W / 2 - 0.1, z: 0 },
      { w: 0.3, d: TABLE_D + 0.6, x: TABLE_W / 2 + 0.1, z: 0 },
    ].forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, 0.35, b.d);
      const mesh = new THREE.Mesh(geo, borderMat);
      mesh.position.set(b.x, 0.18, b.z);
      scene.add(mesh);
      
      // Border glow
      const glowGeo = new THREE.BoxGeometry(b.w + 0.3, 0.1, b.d + 0.3);
      const glow = new THREE.Mesh(glowGeo, borderGlowMat);
      glow.position.set(b.x, 0.02, b.z);
      scene.add(glow);
    });

    // Grid overlay
    const grid = new THREE.GridHelper(14, 14, 0x333366, 0x222244);
    grid.position.y = 0.02;
    scene.add(grid);

    const level = LEVELS[levelIndex];
    
    // Create bumpers
    const bumperData: { x: number; z: number; r: number }[] = [];
    level.bumpers.forEach(pos => {
      createBumper(scene, pos.x, pos.z);
      bumperData.push({ x: pos.x, z: pos.z, r: 0.7 });
    });
    bumpersRef.current = bumperData;

    // Create target coins - now they have physics and can be knocked around
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
        isSettled: false,
        hitAnotherCoin: false,
        mesh 
      });
    });

    // Create striker coin
    const strikerZ = TABLE_D / 2 - 2;
    const strikerMesh = createCoin(scene, 0, strikerZ, true);
    coins.push({ 
      id: 0, 
      x: 0, 
      z: strikerZ, 
      vx: 0, 
      vz: 0, 
      isStriker: true, 
      isKnockedOff: false,
      wasHitByStriker: false,
      isSettled: false,
      hitAnotherCoin: false,
      mesh: strikerMesh 
    });

    coinsRef.current = coins;
    setCoinsLeft(level.coins.length);

    // Create thick aim line (cylinder)
    const lineGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 12);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const aimLine = new THREE.Mesh(lineGeo, lineMat);
    aimLine.rotation.x = Math.PI / 2;
    scene.add(aimLine);
    aimLineRef.current = aimLine;

    // Arrow head
    const arrowGeo = new THREE.ConeGeometry(0.3, 0.7, 12);
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
    console.log('✅ Level', levelIndex + 1, 'initialized - Coins have PHYSICS!');
  }, [createCoin, createBumper, isMobile]);

  // Update aim line visualization
  const updateAimLine = useCallback(() => {
    if (!aimLineRef.current || !aimArrowRef.current) return;
    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker || striker.isKnockedOff) return;

    const len = 4 + (power / 100) * 12;
    const midX = striker.x + Math.sin(aimAngle) * (len / 2);
    const midZ = striker.z - Math.cos(aimAngle) * (len / 2);
    const endX = striker.x + Math.sin(aimAngle) * len;
    const endZ = striker.z - Math.cos(aimAngle) * len;

    aimLineRef.current.position.set(midX, 0.25, midZ);
    aimLineRef.current.scale.y = len;
    aimLineRef.current.rotation.z = -aimAngle;

    aimArrowRef.current.position.set(endX, 0.25, endZ);
    aimArrowRef.current.rotation.z = -aimAngle;

    const lineMat = aimLineRef.current.material as THREE.MeshBasicMaterial;
    const arrowMat = aimArrowRef.current.material as THREE.MeshBasicMaterial;
    
    if (aimLocked) {
      const col = power < 30 ? 0xffff00 : power < 70 ? 0xff8800 : 0xff0000;
      lineMat.color.setHex(col);
      arrowMat.color.setHex(col);
      lineMat.opacity = 1;
      arrowMat.opacity = 1;
      
      // Scale arrow based on power
      aimArrowRef.current.scale.set(1 + power / 100, 1 + power / 100, 1 + power / 100);
    } else {
      lineMat.color.setHex(0x00ffff);
      arrowMat.color.setHex(0x00ffff);
      lineMat.opacity = 0.8;
      arrowMat.opacity = 0.8;
      aimArrowRef.current.scale.set(1, 1, 1);
    }
  }, [power, aimAngle, aimLocked]);

  // Camera view switch
  const switchView = useCallback((mode: 'full' | 'focus') => {
    if (!cameraRef.current) return;
    setViewMode(mode);
    const cam = cameraRef.current;
    const striker = coinsRef.current.find(c => c.isStriker);

    if (mode === 'full') {
      cam.position.set(0, isMobile ? 28 : 24, isMobile ? 22 : 18);
      cam.lookAt(0, 0, 0);
    } else if (striker && !striker.isKnockedOff) {
      cam.position.set(striker.x, 10, striker.z + 8);
      cam.lookAt(striker.x, 0, striker.z - 6);
    }
  }, [isMobile]);

  // Physics update - coins move when hit!
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
    const bumpers = bumpersRef.current;
    let anyMoving = false;
    const halfW = TABLE_W / 2 - COIN_R;
    const halfD = TABLE_D / 2 - COIN_R;

    // Update each coin
    coins.forEach(coin => {
      if (coin.isKnockedOff || !coin.mesh) return;

      // Apply velocity
      coin.x += coin.vx;
      coin.z += coin.vz;

      // Apply friction
      coin.vx *= FRICTION;
      coin.vz *= FRICTION;
      
      // Stop if moving very slowly
      if (Math.abs(coin.vx) < 0.003 && Math.abs(coin.vz) < 0.003) {
        coin.vx = 0;
        coin.vz = 0;
      } else {
        anyMoving = true;
      }

      // Coin falls off table edge = knocked off!
      if (Math.abs(coin.x) > halfW + 0.5 || Math.abs(coin.z) > halfD + 0.5) {
        coin.isKnockedOff = true;
        coin.mesh.visible = false;
        
        if (coin.isStriker) {
          // Striker fell off - penalty!
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 50, 'kill', '💀 STRIKER FELL! -100');
        } else {
          // Enemy coin fell off - PENALTY! (you want to hit them, not knock them off)
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 40, 'kill', '💀 COIN FELL OFF! -100');
          setCoinsLeft(c => Math.max(0, c - 1));
        }
        return;
      }

      // Bounce off walls (but can fall off if going fast enough at edges)
      if (Math.abs(coin.x) > halfW) {
        coin.x = Math.sign(coin.x) * halfW;
        coin.vx *= -BOUNCE;
      }
      if (Math.abs(coin.z) > halfD) {
        coin.z = Math.sign(coin.z) * halfD;
        coin.vz *= -BOUNCE;
      }

      // Bumper collisions - bounce with extra force
      bumpers.forEach(bumper => {
        const dx = coin.x - bumper.x;
        const dz = coin.z - bumper.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < COIN_R + bumper.r) {
          const nx = dx / dist;
          const nz = dz / dist;
          const dot = coin.vx * nx + coin.vz * nz;
          coin.vx = (coin.vx - 2 * dot * nx) * BOUNCE * 1.2; // Extra bounce from bumper
          coin.vz = (coin.vz - 2 * dot * nz) * BOUNCE * 1.2;
          coin.x = bumper.x + nx * (COIN_R + bumper.r + 0.05);
          coin.z = bumper.z + nz * (COIN_R + bumper.r + 0.05);
        }
      });

      coin.mesh.position.set(coin.x, 0.15, coin.z);
    });

    // Coin-coin collisions with PROPER PHYSICS transfer
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const a = coins[i];
        const b = coins[j];
        if (a.isKnockedOff || b.isKnockedOff || a.isSettled || b.isSettled) continue;

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = COIN_R * 2;

        if (dist < minDist && dist > 0.01) {
          anyMoving = true;
          
          // Collision normal
          const nx = dx / dist;
          const nz = dz / dist;
          
          // Relative velocity
          const dvx = a.vx - b.vx;
          const dvz = a.vz - b.vz;
          const dvn = dvx * nx + dvz * nz;

          // Only resolve if coins are moving toward each other
          if (dvn > 0) {
            // Calculate collision impulse with mass transfer
            const impulse = dvn * MASS_TRANSFER * COLLISION_DAMPING;
            
            // Apply impulse to both coins
            a.vx -= impulse * nx;
            a.vz -= impulse * nz;
            b.vx += impulse * nx;
            b.vz += impulse * nz;

            // Separate overlapping coins
            const overlap = minDist - dist;
            a.x -= overlap * nx * 0.5;
            a.z -= overlap * nz * 0.5;
            b.x += overlap * nx * 0.5;
            b.z += overlap * nz * 0.5;

            // STRIKER hits an enemy coin - mark it as hit and give it momentum!
            if (a.isStriker && !b.isStriker && !b.wasHitByStriker) {
              b.wasHitByStriker = true;
              // Flash the coin to show it was hit
              if (b.mesh) {
                const coinMesh = b.mesh.children[0] as THREE.Mesh;
                if (coinMesh && coinMesh.material) {
                  (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
                  setTimeout(() => {
                    if (coinMesh.material) {
                      (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
                    }
                  }, 200);
                }
              }
            } else if (b.isStriker && !a.isStriker && !a.wasHitByStriker) {
              a.wasHitByStriker = true;
              // Flash the coin to show it was hit
              if (a.mesh) {
                const coinMesh = a.mesh.children[0] as THREE.Mesh;
                if (coinMesh && coinMesh.material) {
                  (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
                  setTimeout(() => {
                    if (coinMesh.material) {
                      (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
                    }
                  }, 200);
                }
              }
            }
            // A coin that was hit by striker now hits another coin = -50 penalty
            else if (!a.isStriker && !b.isStriker) {
              const speed = Math.sqrt(dvx * dvx + dvz * dvz);
              if (speed > 0.05) {
                // If a hit coin hits another coin
                if (a.wasHitByStriker && !a.hitAnotherCoin) {
                  a.hitAnotherCoin = true;
                  scoreRef.current -= 50;
                  setScore(scoreRef.current);
                  addPopup(-50, 50, 50, 'kill', '💥 CHAIN HIT! -50');
                }
                if (b.wasHitByStriker && !b.hitAnotherCoin) {
                  b.hitAnotherCoin = true;
                  scoreRef.current -= 50;
                  setScore(scoreRef.current);
                  addPopup(-50, 50, 50, 'kill', '💥 CHAIN HIT! -50');
                }
              }
            }
          }
        }
      }
    }

    // Check if hit coins have stopped moving - award points if they stayed on board!
    coins.forEach(coin => {
      if (!coin.isStriker && coin.wasHitByStriker && !coin.isKnockedOff && !coin.isSettled) {
        // Check if this coin has stopped moving
        if (Math.abs(coin.vx) < 0.01 && Math.abs(coin.vz) < 0.01) {
          coin.isSettled = true;
          // Coin stayed on board after being hit = +100 points!
          scoreRef.current += 100;
          setScore(scoreRef.current);
          addPopup(100, 50, 35, 'perfect', '🎯 CLEARED! +100');
          setCoinsLeft(c => Math.max(0, c - 1));
          // Remove the coin after a short delay
          setTimeout(() => {
            coin.isKnockedOff = true;
            if (coin.mesh) coin.mesh.visible = false;
          }, 300);
        }
      }
    });

    // Check if shooting is complete (everything stopped)
    if (isShootingRef.current && !anyMoving) {
      isShootingRef.current = false;
      
      // Reset striker if it fell off
      const striker = coins.find(c => c.isStriker);
      if (striker && striker.isKnockedOff && striker.mesh) {
        striker.isKnockedOff = false;
        striker.x = 0;
        striker.z = TABLE_D / 2 - 2;
        striker.vx = 0;
        striker.vz = 0;
        striker.mesh.visible = true;
        striker.mesh.position.set(striker.x, 0.15, striker.z);
      }

      // Check if level is complete
      const remaining = coins.filter(c => !c.isStriker && !c.isKnockedOff).length;
      if (remaining === 0) {
        // Level complete - add speed bonus!
        const level = LEVELS[currentLevel];
        const timeBonus = Math.max(0, (level.timeLimit - levelTime) * 10);
        scoreRef.current += 200 + timeBonus;
        setScore(scoreRef.current);
        
        if (levelTimerRef.current) clearInterval(levelTimerRef.current);
        
        addPopup(200 + timeBonus, 50, 30, 'critical', `🏆 LEVEL DONE! +${200 + timeBonus}`);
        
        if (currentLevel < LEVELS.length - 1) {
          setGameState('levelComplete');
        } else {
          endGame();
        }
      } else {
        // Check for miss penalty
        if (shotsUsed > 0) {
          // We'll track hits in the shooting phase
        }
        setGameState('playing');
        setAimLocked(false);
      }
    }
  }, [addPopup, currentLevel, levelTime, shotsUsed]);

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

  // Animation loop
  useEffect(() => {
    if (!sceneReady || gameState === 'ready' || gameState === 'complete' || gameState === 'levelComplete') return;
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const animate = () => {
      updatePhysics();
      updateAimLine();

      // Coin hover animation
      const time = Date.now() * 0.003;
      coinsRef.current.forEach(coin => {
        if (coin.mesh && !coin.isKnockedOff) {
          coin.mesh.position.y = 0.15 + Math.sin(time + coin.id) * 0.02;
          coin.mesh.rotation.y += 0.002; // Slow rotation
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
    setScore(0);
    setShotsUsed(0);
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

  // Scene init effect
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

  // Improved mouse/touch aiming
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting' || aimLocked) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker || striker.isKnockedOff) return;

    // Calculate aim angle based on pointer position relative to striker
    // Map screen coordinates to world coordinates
    const screenX = (e.clientX - rect.left) / rect.width;
    const screenY = (e.clientY - rect.top) / rect.height;
    
    // More direct aiming - wider range
    const relX = (screenX - 0.5) * 3;
    const relY = (screenY - 0.5) * 2;
    
    const newAngle = Math.atan2(relX, -relY);
    setAimAngle(newAngle);
  }, [gameState, aimLocked]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = (e.clientX - rect.left) / rect.width;
    const screenY = (e.clientY - rect.top) / rect.height;
    
    // Check if tapping on joystick area (bottom left for mobile)
    if (isMobile && screenX < 0.35 && screenY > 0.6) {
      setJoystickActive(true);
      joystickStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    // Lock aim and start charging
    const relX = (screenX - 0.5) * 3;
    const relY = (screenY - 0.5) * 2;
    const newAngle = Math.atan2(relX, -relY);

    if (!aimLocked) {
      setAimAngle(newAngle);
      setAimLocked(true);
      setGameState('charging');
      setPower(0);
      
      let p = 0;
      powerTimerRef.current = setInterval(() => {
        p += 3;
        if (p > 100) p = 0;
        setPower(p);
      }, 25);
    }
  }, [gameState, aimLocked, isMobile]);

  const handlePointerUp = useCallback(() => {
    // Handle joystick release
    if (joystickActive) {
      setJoystickActive(false);
      joystickStartRef.current = null;
      setJoystickPos({ x: 0, y: 0 });
      return;
    }
    
    if (gameState !== 'charging') return;
    
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);

    const striker = coinsRef.current.find(c => c.isStriker);
    if (!striker || striker.isKnockedOff) return;

    // Launch striker with physics
    const launchPower = 0.3 + (power / 100) * 0.9; // Min 0.3, max 1.2
    striker.vx = Math.sin(aimAngle) * launchPower;
    striker.vz = -Math.cos(aimAngle) * launchPower;

    isShootingRef.current = true;
    setGameState('shooting');
    setShotsUsed(s => s + 1);
    setPower(0);
    setAimLocked(false);
  }, [gameState, power, aimAngle, joystickActive]);

  // Joystick handling for mobile
  const handleJoystickMove = useCallback((e: React.PointerEvent) => {
    if (!joystickActive || !joystickStartRef.current) return;
    
    const dx = e.clientX - joystickStartRef.current.x;
    const dy = e.clientY - joystickStartRef.current.y;
    
    // Clamp to joystick radius
    const maxR = 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    
    const jx = Math.cos(angle) * clampedDist;
    const jy = Math.sin(angle) * clampedDist;
    
    setJoystickPos({ x: jx / maxR, y: jy / maxR });
    
    // Update aim angle based on joystick
    const newAngle = Math.atan2(-jx, jy);
    setAimAngle(newAngle);
  }, [joystickActive]);

  const cancelAim = useCallback(() => {
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);
    setAimLocked(false);
    setPower(0);
    setGameState('playing');
  }, []);

  // Shoot button for mobile
  const shootNow = useCallback(() => {
    if (gameState !== 'playing' || aimLocked) return;
    
    setAimLocked(true);
    setGameState('charging');
    setPower(0);
    
    let p = 0;
    powerTimerRef.current = setInterval(() => {
      p += 3;
      if (p > 100) p = 0;
      setPower(p);
    }, 25);
  }, [gameState, aimLocked]);

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
          <p className="text-cyan-400 mb-4">Physics-Based Pool • Hit All Coins!</p>

          <div className="bg-black/50 rounded-xl p-4 mb-5 text-left text-sm text-gray-300 max-h-64 overflow-y-auto">
            <p className="mb-2 text-cyan-400 font-bold text-center">🎯 HIT ALL COINS TO CLEAR THE LEVEL!</p>
            
            <div className="mb-3 p-2 bg-cyan-900/30 rounded-lg">
              <p className="text-cyan-300 font-bold mb-1">📱 CONTROLS:</p>
              <p className="mb-1">• <span className="text-yellow-400">MOVE</span> to aim (or use joystick on mobile)</p>
              <p className="mb-1">• <span className="text-orange-400">TAP & HOLD</span> to charge power</p>
              <p className="mb-1">• <span className="text-red-400">RELEASE</span> to shoot!</p>
            </div>
            
            <div className="mb-3 p-2 bg-green-900/30 rounded-lg">
              <p className="text-green-300 font-bold mb-1">💰 SCORING:</p>
              <p className="mb-1"><span className="text-green-400 font-bold">+100</span> Hit coin & it stays on board!</p>
              <p className="mb-1"><span className="text-yellow-400 font-bold">+BONUS</span> Complete level fast!</p>
              <p className="mb-1"><span className="text-red-400 font-bold">-50</span> Hit coin hits another coin</p>
              <p className="mb-1"><span className="text-red-400 font-bold">-100</span> Coin falls off table</p>
              <p><span className="text-red-400 font-bold">-100</span> Striker falls off</p>
            </div>
            
            <p className="text-center text-gray-400 text-xs">Hit coins to make them move - if they stay on the board, you score!</p>
            
            <p className="text-center text-gray-400 text-xs">Coins have REAL PHYSICS - aim carefully!</p>
          </div>

          <button onClick={startGame} className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 transition-all shadow-lg shadow-cyan-500/30">
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
          <p className="text-yellow-400 mb-4">
            ⏱️ Time: {levelTime}s 
            {timeBonus > 0 && <span className="text-green-400 ml-2">(+{timeBonus} speed bonus!)</span>}
          </p>
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
          <div className="text-4xl text-cyan-300 font-bold mb-4">{score} pts</div>
          <p className="text-gray-400 text-sm">Levels: {currentLevel + 1}/{LEVELS.length} • Time: {timeElapsed}s • Shots: {shotsUsed}</p>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* HUD - Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm p-2 flex justify-between items-center border-b border-cyan-500/30">
        <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-purple-400 font-bold px-2 py-1 bg-purple-500/20 rounded">LV{currentLevel + 1}</span>
          <span className="text-pink-400 font-bold px-2 py-1 bg-pink-500/20 rounded">🎯 {coinsLeft}</span>
          <span className="text-green-400 font-bold px-2 py-1 bg-green-500/20 rounded">💰 {score}</span>
        </div>
        <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm items-center">
          <span className="text-yellow-400 font-bold">⏱️ {levelTime}s</span>
          <span className="text-cyan-400 font-bold">🎱 {shotsUsed}</span>
          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="text-white hover:text-red-400 ml-2 text-lg">✕</button>
          )}
        </div>
      </div>

      {/* View buttons */}
      <div className="absolute top-14 left-2 z-30 flex flex-col gap-2">
        <button
          onClick={() => switchView('full')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'full' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50' : 'bg-black/60 text-cyan-400 border border-cyan-500'}`}
        >
          👁️ FULL
        </button>
        <button
          onClick={() => switchView('focus')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'focus' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50' : 'bg-black/60 text-purple-400 border border-purple-500'}`}
        >
          🎯 FOCUS
        </button>
      </div>

      {/* Status indicator */}
      <div className="absolute top-14 right-2 z-30 text-right">
        {gameState === 'playing' && (
          <div className="text-cyan-400 text-xs sm:text-sm bg-black/60 px-3 py-2 rounded-lg animate-pulse">
            {isMobile ? '📱 Tap to aim & charge' : '🖱️ Move to aim, Click & hold to charge'}
          </div>
        )}
        {gameState === 'charging' && (
          <div className="text-orange-400 text-sm font-bold bg-orange-500/20 px-3 py-2 rounded-lg animate-pulse">
            🔥 CHARGING - RELEASE TO SHOOT!
          </div>
        )}
        {gameState === 'shooting' && (
          <div className="text-cyan-400 text-lg font-bold bg-cyan-500/20 px-3 py-2 rounded-lg animate-pulse">
            ⚡ STRIKE!
          </div>
        )}
      </div>

      {/* Cancel button */}
      {aimLocked && gameState !== 'shooting' && (
        <button onClick={cancelAim} className="absolute top-28 right-2 z-30 px-4 py-2 bg-red-500/70 text-white rounded-lg text-sm font-bold hover:bg-red-500">
          ✕ Cancel
        </button>
      )}

      {/* Power bar */}
      {gameState === 'charging' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-64 sm:w-80">
          <div className="bg-black/80 rounded-full p-2 border-2 border-orange-500 shadow-lg shadow-orange-500/30">
            <div 
              className="h-7 rounded-full transition-all"
              style={{
                width: `${Math.max(5, power)}%`,
                background: power < 30 ? 'linear-gradient(90deg, #ffff00, #ffaa00)' : power < 70 ? 'linear-gradient(90deg, #ff8800, #ff4400)' : 'linear-gradient(90deg, #ff0000, #990000)'
              }}
            />
          </div>
          <p className="text-center text-orange-400 text-sm mt-1 font-bold">⚡ POWER: {power}%</p>
        </div>
      )}

      {/* Mobile controls: Virtual joystick */}
      {isMobile && gameState === 'playing' && !aimLocked && (
        <div className="absolute bottom-20 left-8 z-40">
          <div 
            className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center"
            onPointerDown={(e) => {
              setJoystickActive(true);
              joystickStartRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={handleJoystickMove}
            onPointerUp={() => {
              setJoystickActive(false);
              joystickStartRef.current = null;
              setJoystickPos({ x: 0, y: 0 });
            }}
          >
            <div 
              className="w-10 h-10 rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/50 transition-transform"
              style={{ transform: `translate(${joystickPos.x * 25}px, ${joystickPos.y * 25}px)` }}
            />
          </div>
          <p className="text-center text-cyan-400 text-xs mt-1">AIM</p>
        </div>
      )}

      {/* Mobile shoot button */}
      {isMobile && gameState === 'playing' && !aimLocked && (
        <div className="absolute bottom-20 right-8 z-40">
          <button
            onClick={shootNow}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-sm shadow-lg shadow-orange-500/50 active:scale-95"
          >
            🎯<br/>SHOOT
          </button>
        </div>
      )}

      {/* Level info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center bg-black/60 px-4 py-2 rounded-lg">
        <div className="text-gray-400 text-sm font-bold">{LEVELS[currentLevel]?.name}</div>
        <div className="text-gray-500 text-xs">Time Limit: {LEVELS[currentLevel]?.timeLimit}s</div>
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
          transform: isMobile ? 'scale(0.92)' : 'none', 
          transformOrigin: 'center', 
          cursor: aimLocked ? 'grabbing' : 'crosshair' 
        }}
      />

      <FloatingScore popups={popups} removePopup={removePopup} />
    </div>
  );
}
