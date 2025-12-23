'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import FloatingScore, { useFloatingScores } from './FloatingScore';
import GameThemeSelector from './GameThemeSelector';
import { GameTheme, getSavedTheme } from '@/lib/gameThemes';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface NeonStrikerGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  rngSeed?: number;
  theme?: GameTheme;
}

// Seeded RNG for fair skill-based gaming
class Mulberry32 {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

interface GameCoin {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  baseVx: number; // For level 3+ moving coins
  baseVz: number;
  isStriker: boolean;
  isKnockedOff: boolean;
  wasHitByStriker: boolean;
  isSettled: boolean;
  hitAnotherCoin: boolean;
  mesh: THREE.Group | null;
  bonusAngle: number; // Angle where the green bonus section is located
  bonusHit: boolean; // Whether the bonus was already claimed
}

// Level configurations - coins start MOVING from level 3
const LEVELS = [
  // EASY - Static targets
  { name: 'Triangle', coins: [{ x: 0, z: -2 }, { x: -2, z: 1 }, { x: 2, z: 1 }], bumpers: [{ x: -4, z: 0 }, { x: 4, z: 0 }], moving: false },
  { name: 'Diamond', coins: [{ x: 0, z: -4 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 2 }], bumpers: [{ x: -5, z: -2 }, { x: 5, z: -2 }], moving: false },
  
  // MEDIUM - Moving targets begin
  { name: 'The Line', coins: [{ x: -4, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }], bumpers: [{ x: 0, z: -3 }, { x: 0, z: 3 }], moving: true },
  { name: 'Circle', coins: [{ x: 0, z: -3 }, { x: 2.6, z: -1.5 }, { x: 2.6, z: 1.5 }, { x: 0, z: 3 }, { x: -2.6, z: 1.5 }, { x: -2.6, z: -1.5 }], bumpers: [{ x: 0, z: 0 }], moving: true },
  { name: 'X-Factor', coins: [{ x: -3, z: -3 }, { x: 3, z: -3 }, { x: 0, z: 0 }, { x: -3, z: 3 }, { x: 3, z: 3 }], bumpers: [{ x: -5, z: 0 }, { x: 5, z: 0 }], moving: true },
  
  // HARD - More coins, more bumpers
  { name: 'Fortress', coins: [{ x: -4, z: -4 }, { x: 4, z: -4 }, { x: -4, z: 2 }, { x: 4, z: 2 }, { x: -2, z: -1 }, { x: 2, z: -1 }, { x: 0, z: 0 }], bumpers: [{ x: -2, z: 3 }, { x: 2, z: 3 }, { x: 0, z: -3 }], moving: true },
  { name: 'Scatter', coins: [{ x: -5, z: -4 }, { x: -2, z: -5 }, { x: 2, z: -3 }, { x: 5, z: -4 }, { x: -4, z: 1 }, { x: 4, z: 2 }], bumpers: [{ x: 0, z: -2 }, { x: -3, z: 4 }, { x: 3, z: 4 }], moving: true },
  { name: 'The Grid', coins: [{ x: -3, z: -3 }, { x: 0, z: -3 }, { x: 3, z: -3 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: -3, z: 3 }, { x: 0, z: 3 }, { x: 3, z: 3 }], bumpers: [{ x: 0, z: 0 }], moving: true },
  
  // EXPERT - Complex patterns
  { name: 'Orbit', coins: [{ x: 0, z: -5 }, { x: 3.5, z: -3.5 }, { x: 5, z: 0 }, { x: 3.5, z: 3.5 }, { x: 0, z: 5 }, { x: -3.5, z: 3.5 }, { x: -5, z: 0 }, { x: -3.5, z: -3.5 }], bumpers: [{ x: 0, z: 0 }, { x: 2, z: 2 }, { x: -2, z: -2 }], moving: true },
  { name: 'Chaos', coins: [{ x: -5, z: -5 }, { x: 5, z: -5 }, { x: -3, z: -2 }, { x: 3, z: -2 }, { x: 0, z: 0 }, { x: -4, z: 3 }, { x: 4, z: 3 }, { x: 0, z: 5 }], bumpers: [{ x: -2, z: 0 }, { x: 2, z: 0 }, { x: 0, z: -4 }, { x: 0, z: 2 }], moving: true },
  { name: 'Spiral', coins: [{ x: 0, z: -4 }, { x: 2, z: -2 }, { x: 3, z: 1 }, { x: 1, z: 3 }, { x: -2, z: 2 }, { x: -3, z: -1 }, { x: -1, z: -3 }], bumpers: [{ x: 0, z: 0 }, { x: 4, z: -3 }, { x: -4, z: 3 }], moving: true },
  
  // MASTER - Maximum difficulty
  { name: 'Gauntlet', coins: [{ x: -5, z: -6 }, { x: 0, z: -6 }, { x: 5, z: -6 }, { x: -4, z: -3 }, { x: 4, z: -3 }, { x: -3, z: 0 }, { x: 3, z: 0 }, { x: -2, z: 3 }, { x: 2, z: 3 }, { x: 0, z: 5 }], bumpers: [{ x: 0, z: -4 }, { x: 0, z: 1 }, { x: -5, z: 0 }, { x: 5, z: 0 }], moving: true },
];

const GAME_DURATION = 90; // 1 minute 30 seconds

export default function NeonStrikerGame({ 
  onGameEnd, 
  onExit, 
  listingId, 
  entryNumber, 
  isCompetitionMode, 
  rngSeed,
  theme: initialTheme
}: NeonStrikerGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'charging' | 'shooting' | 'complete'>('ready');
  const [currentTheme, setCurrentTheme] = useState<GameTheme>(() => initialTheme || getSavedTheme());
  const [score, setScore] = useState(0);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [power, setPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [coinsLeft, setCoinsLeft] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [aimLocked, setAimLocked] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'focus'>('full');
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [comboCount, setComboCount] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);

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
  const powerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isShootingRef = useRef(false);
  const levelTransitionRef = useRef(false);
  const scoreRef = useRef(0);
  const comboCountRef = useRef(0);
  const joystickStartRef = useRef<{ x: number; y: number } | null>(null);
  const currentLevelRef = useRef(0);
  const hitsThisShotRef = useRef(0);

  const { popups, addPopup, removePopup } = useFloatingScores();

  // Seeded RNG for deterministic coin movement patterns
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Date.now() / 1000); // Use timestamp if no seed
    console.log('🎮 [NeonStriker] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  const rngRef = useRef(seededRng);

  const TABLE_W = 14;
  const TABLE_D = 18;
  const COIN_R = 0.55;
  const FRICTION = 0.985;
  const BOUNCE = 0.85;
  const COLLISION_DAMPING = 0.95;
  const MASS_TRANSFER = 0.9;
  const COIN_SPEED = 0.025; // Base speed for moving coins

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
  }, []);

  // Create 3D coin with glow effects and green bonus section
  const createCoin = useCallback((scene: THREE.Scene, x: number, z: number, isStriker: boolean, bonusAngle: number = 0): THREE.Group => {
    const group = new THREE.Group();
    const color = isStriker ? 0x00ffff : 0xff00ff;
    
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

    const ringGeo = new THREE.TorusGeometry(COIN_R, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [0.1, -0.1].forEach(y => {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    });

    const glowGeo = new THREE.RingGeometry(COIN_R + 0.15, COIN_R + 0.4, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    group.add(glow);

    const emblemGeo = new THREE.CircleGeometry(COIN_R * 0.4, 16);
    const emblemMat = new THREE.MeshBasicMaterial({ color: isStriker ? 0x00aaaa : 0xaa00aa, side: THREE.DoubleSide });
    const topEmblem = new THREE.Mesh(emblemGeo, emblemMat);
    topEmblem.rotation.x = -Math.PI / 2;
    topEmblem.position.y = 0.11;
    group.add(topEmblem);

    // Add GREEN BONUS SECTION on the side of enemy coins (not striker)
    if (!isStriker) {
      // Create a larger, more visible green bonus section on the edge
      const bonusGeo = new THREE.CylinderGeometry(COIN_R * 0.35, COIN_R * 0.35, 0.25, 12);
      const bonusMat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 1.2,
        metalness: 0.5,
        roughness: 0.2
      });
      const bonusSection = new THREE.Mesh(bonusGeo, bonusMat);
      bonusSection.name = 'bonusSection';
      
      // Position it on the edge of the coin based on the angle
      bonusSection.position.x = Math.cos(bonusAngle) * (COIN_R * 0.7);
      bonusSection.position.z = Math.sin(bonusAngle) * (COIN_R * 0.7);
      bonusSection.position.y = 0.05;
      group.add(bonusSection);
      
      // Add a bright glow ring around the bonus section
      const bonusGlowGeo = new THREE.RingGeometry(COIN_R * 0.35, COIN_R * 0.55, 16);
      const bonusGlowMat = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const bonusGlow = new THREE.Mesh(bonusGlowGeo, bonusGlowMat);
      bonusGlow.rotation.x = -Math.PI / 2;
      bonusGlow.position.x = Math.cos(bonusAngle) * (COIN_R * 0.7);
      bonusGlow.position.z = Math.sin(bonusAngle) * (COIN_R * 0.7);
      bonusGlow.position.y = 0.18;
      group.add(bonusGlow);
      
      // Add a second glow above for visibility
      const topGlowGeo = new THREE.CircleGeometry(COIN_R * 0.25, 16);
      const topGlowMat = new THREE.MeshBasicMaterial({
        color: 0x44ff44,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const topGlow = new THREE.Mesh(topGlowGeo, topGlowMat);
      topGlow.rotation.x = -Math.PI / 2;
      topGlow.position.x = Math.cos(bonusAngle) * (COIN_R * 0.7);
      topGlow.position.z = Math.sin(bonusAngle) * (COIN_R * 0.7);
      topGlow.position.y = 0.2;
      group.add(topGlow);
    }

    group.position.set(x, 0.15, z);
    scene.add(group);
    return group;
  }, []);

  const createBumper = useCallback((scene: THREE.Scene, x: number, z: number) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.6 });
    const geo = new THREE.CylinderGeometry(0.7, 0.7, 0.9, 16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.45, z);
    mesh.castShadow = true;
    scene.add(mesh);
    
    const glowGeo = new THREE.RingGeometry(0.7, 1.0, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(x, 0.02, z);
    scene.add(glow);
  }, []);

  // Initialize scene with deterministic movement for level 3+
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
    scene.background = new THREE.Color(0x080818);
    scene.fog = new THREE.Fog(0x080818, 30, 60);
    sceneRef.current = scene;

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

    scene.add(new THREE.AmbientLight(0x666688, 1.2));
    const spot = new THREE.SpotLight(0xffffff, 2.5);
    spot.position.set(0, 30, 5);
    spot.castShadow = true;
    scene.add(spot);
    
    scene.add(new THREE.PointLight(0x00ffff, 2, 50).translateX(-12).translateY(10));
    scene.add(new THREE.PointLight(0xff00ff, 2, 50).translateX(12).translateY(10));

    // Table
    const tableGeo = new THREE.BoxGeometry(TABLE_W + 1, 0.4, TABLE_D + 1);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.8 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    const surfaceGeo = new THREE.PlaneGeometry(TABLE_W - 0.4, TABLE_D - 0.4);
    const surfaceMat = new THREE.MeshStandardMaterial({ color: 0x151528, roughness: 0.7 });
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.01;
    scene.add(surface);

    // Borders
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
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
    });

    const grid = new THREE.GridHelper(14, 14, 0x333366, 0x222244);
    grid.position.y = 0.02;
    scene.add(grid);

    const level = LEVELS[levelIndex];
    
    // Bumpers
    const bumperData: { x: number; z: number; r: number }[] = [];
    level.bumpers.forEach(pos => {
      createBumper(scene, pos.x, pos.z);
      bumperData.push({ x: pos.x, z: pos.z, r: 0.7 });
    });
    bumpersRef.current = bumperData;

    // Create coins with DETERMINISTIC movement patterns using seeded RNG
    const coins: GameCoin[] = [];
    level.coins.forEach((pos, i) => {
      // Deterministic movement direction based on seeded RNG
      // Uses consistent pattern based on coin index and level
      const angleBase = (i / level.coins.length) * Math.PI * 2; // Evenly distributed
      const angleOffset = (rngRef.current.next() - 0.5) * 0.5; // Small random offset
      const angle = angleBase + angleOffset;
      
      // Generate a random bonus angle for the green section (deterministic)
      const bonusAngle = rngRef.current.next() * Math.PI * 2;
      
      const mesh = createCoin(scene, pos.x, pos.z, false, bonusAngle);
      
      const hasMovement = level.moving;
      const speed = hasMovement ? COIN_SPEED : 0;
      
      coins.push({ 
        id: i + 1, 
        x: pos.x, 
        z: pos.z, 
        vx: 0, 
        vz: 0, 
        baseVx: hasMovement ? Math.cos(angle) * speed : 0,
        baseVz: hasMovement ? Math.sin(angle) * speed : 0,
        isStriker: false, 
        isKnockedOff: false,
        wasHitByStriker: false,
        isSettled: false,
        hitAnotherCoin: false,
        mesh,
        bonusAngle,
        bonusHit: false
      });
    });

    // Striker
    const strikerZ = TABLE_D / 2 - 2;
    const strikerMesh = createCoin(scene, 0, strikerZ, true, 0);
    coins.push({ 
      id: 0, 
      x: 0, 
      z: strikerZ, 
      vx: 0, 
      vz: 0, 
      baseVx: 0,
      baseVz: 0,
      isStriker: true, 
      isKnockedOff: false,
      wasHitByStriker: false,
      isSettled: false,
      hitAnotherCoin: false,
      mesh: strikerMesh,
      bonusAngle: 0,
      bonusHit: false
    });

    coinsRef.current = coins;
    setCoinsLeft(level.coins.length);
    comboCountRef.current = 0;
    setComboCount(0);
    setComboMultiplier(1);

    // Aim line
    const lineGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 12);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const aimLine = new THREE.Mesh(lineGeo, lineMat);
    aimLine.rotation.x = Math.PI / 2;
    scene.add(aimLine);
    aimLineRef.current = aimLine;

    const arrowGeo = new THREE.ConeGeometry(0.3, 0.7, 12);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI / 2;
    scene.add(arrow);
    aimArrowRef.current = arrow;

    setSceneReady(true);
    setAimLocked(false);
    setViewMode('full');
    
    renderer.render(scene, camera);
    console.log('✅ Level', levelIndex + 1, 'initialized', level.moving ? '(MOVING TARGETS)' : '(STATIC)');
  }, [createCoin, createBumper, isMobile]);

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
      aimArrowRef.current.scale.set(1 + power / 100, 1 + power / 100, 1 + power / 100);
    } else {
      lineMat.color.setHex(0x00ffff);
      arrowMat.color.setHex(0x00ffff);
      lineMat.opacity = 0.8;
      arrowMat.opacity = 0.8;
      aimArrowRef.current.scale.set(1, 1, 1);
    }
  }, [power, aimAngle, aimLocked]);

  const switchView = useCallback((mode: 'full' | 'focus') => {
    console.log('👁️ [NeonStriker] Switching view to:', mode);
    if (!cameraRef.current) {
      console.warn('⚠️ [NeonStriker] Camera not available for view switch');
      return;
    }
    setViewMode(mode);
    const cam = cameraRef.current;
    const striker = coinsRef.current.find(c => c.isStriker);

    if (mode === 'full') {
      cam.position.set(0, isMobile ? 28 : 24, isMobile ? 22 : 18);
      cam.lookAt(0, 0, 0);
      console.log('✅ [NeonStriker] Switched to FULL view');
    } else if (mode === 'focus') {
      if (striker && !striker.isKnockedOff) {
        cam.position.set(striker.x, 10, striker.z + 8);
        cam.lookAt(striker.x, 0, striker.z - 6);
        console.log('✅ [NeonStriker] Switched to FOCUS view on striker at:', striker.x, striker.z);
      } else {
        // If no striker, focus on center
        cam.position.set(0, 10, 8);
        cam.lookAt(0, 0, -2);
        console.log('⚠️ [NeonStriker] No striker found, focusing on center');
      }
    }
  }, [isMobile]);

  // Physics with combo system and moving targets
  const updatePhysics = useCallback(() => {
    const coins = coinsRef.current;
    const bumpers = bumpersRef.current;
    let anyMoving = false;
    const halfW = TABLE_W / 2 - COIN_R;
    const halfD = TABLE_D / 2 - COIN_R;
    const level = LEVELS[currentLevelRef.current];

    coins.forEach(coin => {
      if (coin.isKnockedOff || !coin.mesh) return;

      // Apply base movement for moving levels (deterministic pattern)
      if (!coin.isStriker && level.moving && !coin.wasHitByStriker) {
        coin.vx = coin.baseVx;
        coin.vz = coin.baseVz;
      }

      coin.x += coin.vx;
      coin.z += coin.vz;

      // Apply friction only to striker and hit coins
      if (coin.isStriker || coin.wasHitByStriker) {
        coin.vx *= FRICTION;
        coin.vz *= FRICTION;
        
        if (Math.abs(coin.vx) < 0.003 && Math.abs(coin.vz) < 0.003) {
          coin.vx = 0;
          coin.vz = 0;
        }
      }
      
      if (coin.isStriker && (Math.abs(coin.vx) > 0.003 || Math.abs(coin.vz) > 0.003)) {
        anyMoving = true;
      }

      // Falling off
      if (Math.abs(coin.x) > halfW + 0.5 || Math.abs(coin.z) > halfD + 0.5) {
        coin.isKnockedOff = true;
        coin.mesh.visible = false;
        
        if (coin.isStriker) {
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 50, 'kill', '💀 STRIKER FELL! -100');
        } else {
          scoreRef.current -= 100;
          setScore(scoreRef.current);
          addPopup(-100, 50, 40, 'kill', '💀 COIN FELL! -100');
          setCoinsLeft(c => Math.max(0, c - 1));
        }
        return;
      }

      // Bounce off walls
      if (Math.abs(coin.x) > halfW) {
        coin.x = Math.sign(coin.x) * halfW;
        coin.vx *= -BOUNCE;
        if (!coin.isStriker && !coin.wasHitByStriker) coin.baseVx *= -1;
      }
      if (Math.abs(coin.z) > halfD) {
        coin.z = Math.sign(coin.z) * halfD;
        coin.vz *= -BOUNCE;
        if (!coin.isStriker && !coin.wasHitByStriker) coin.baseVz *= -1;
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
          coin.vx = (coin.vx - 2 * dot * nx) * BOUNCE * 1.2;
          coin.vz = (coin.vz - 2 * dot * nz) * BOUNCE * 1.2;
          if (!coin.isStriker && !coin.wasHitByStriker) {
            coin.baseVx = coin.vx / 2;
            coin.baseVz = coin.vz / 2;
          }
          coin.x = bumper.x + nx * (COIN_R + bumper.r + 0.05);
          coin.z = bumper.z + nz * (COIN_R + bumper.r + 0.05);
        }
      });

      coin.mesh.position.set(coin.x, 0.15, coin.z);
    });

    // Coin-coin collisions with COMBO SYSTEM
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
          
          const nx = dx / dist;
          const nz = dz / dist;
          const dvx = a.vx - b.vx;
          const dvz = a.vz - b.vz;
          const dvn = dvx * nx + dvz * nz;

          if (dvn > 0) {
            const impulse = dvn * MASS_TRANSFER * COLLISION_DAMPING;
            a.vx -= impulse * nx;
            a.vz -= impulse * nz;
            b.vx += impulse * nx;
            b.vz += impulse * nz;

            const overlap = minDist - dist;
            a.x -= overlap * nx * 0.5;
            a.z -= overlap * nz * 0.5;
            b.x += overlap * nx * 0.5;
            b.z += overlap * nz * 0.5;

            // STRIKER hits a coin - COMBO SYSTEM!
            if (a.isStriker && !b.isStriker && !b.wasHitByStriker) {
              b.wasHitByStriker = true;
              comboCountRef.current++;
              const newCombo = comboCountRef.current;
              setComboCount(newCombo);
              setComboMultiplier(newCombo);
              
              // Check if striker hit the GREEN BONUS SECTION! (+100 bonus)
              // Calculate the angle of impact from the striker to the target coin
              const hitAngle = Math.atan2(-nz, -nx); // Direction from b to a (striker)
              const angleDiff = Math.abs(((hitAngle - b.bonusAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
              if (angleDiff < 0.5 && !b.bonusHit) { // Within ~30 degrees of bonus section
                b.bonusHit = true;
                scoreRef.current += 100;
                setScore(scoreRef.current);
                addPopup(100, 50, 20, 'perfect', '💚 BONUS ZONE! +100');
              }
              
              // Flash effect
              if (b.mesh) {
                const coinMesh = b.mesh.children[0] as THREE.Mesh;
                if (coinMesh?.material) {
                  (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
                  setTimeout(() => {
                    if (coinMesh.material) {
                      (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
                    }
                  }, 200);
                }
              }
              
              // Show combo indicator
              if (newCombo >= 2) {
                addPopup(0, 50, 25, 'bonus', `🔥 ${newCombo}X COMBO!`);
              }
            } else if (b.isStriker && !a.isStriker && !a.wasHitByStriker) {
              a.wasHitByStriker = true;
              comboCountRef.current++;
              const newCombo = comboCountRef.current;
              setComboCount(newCombo);
              setComboMultiplier(newCombo);
              
              // Check if striker hit the GREEN BONUS SECTION! (+100 bonus)
              const hitAngle = Math.atan2(nz, nx); // Direction from a to b (striker)
              const angleDiff = Math.abs(((hitAngle - a.bonusAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
              if (angleDiff < 0.5 && !a.bonusHit) { // Within ~30 degrees of bonus section
                a.bonusHit = true;
                scoreRef.current += 100;
                setScore(scoreRef.current);
                addPopup(100, 50, 20, 'perfect', '💚 BONUS ZONE! +100');
              }
              
              if (a.mesh) {
                const coinMesh = a.mesh.children[0] as THREE.Mesh;
                if (coinMesh?.material) {
                  (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
                  setTimeout(() => {
                    if (coinMesh.material) {
                      (coinMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
                    }
                  }, 200);
                }
              }
              
              if (newCombo >= 2) {
                addPopup(0, 50, 25, 'bonus', `🔥 ${newCombo}X COMBO!`);
              }
            }
            // Hit coins hitting other coins = penalty
            else if (!a.isStriker && !b.isStriker) {
              const speed = Math.sqrt(dvx * dvx + dvz * dvz);
              if (speed > 0.05) {
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

    // Check settled coins - award points with MULTIPLIER!
    coins.forEach(coin => {
      if (!coin.isStriker && coin.wasHitByStriker && !coin.isKnockedOff && !coin.isSettled) {
        if (Math.abs(coin.vx) < 0.01 && Math.abs(coin.vz) < 0.01) {
          coin.isSettled = true;
          
          // Apply combo multiplier! 100 * multiplier
          const multiplier = comboCountRef.current >= 1 ? comboCountRef.current : 1;
          const points = 100 * multiplier;
          scoreRef.current += points;
          setScore(scoreRef.current);
          
          const label = multiplier > 1 
            ? `🎯 CLEARED! +${points} (${multiplier}X!)` 
            : '🎯 CLEARED! +100';
          const popupType = multiplier >= 3 ? 'critical' : multiplier >= 2 ? 'bonus' : 'perfect';
          
          addPopup(points, 50, 35, popupType, label);
          setCoinsLeft(c => Math.max(0, c - 1));
          
          setTimeout(() => {
            coin.isKnockedOff = true;
            if (coin.mesh) coin.mesh.visible = false;
          }, 300);
        }
      }
    });

    // Check if shot complete
    if (isShootingRef.current && !anyMoving) {
      isShootingRef.current = false;
      
      // Reset combo for next shot
      comboCountRef.current = 0;
      setComboCount(0);
      setComboMultiplier(1);
      
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

      // Check level complete
      const remaining = coins.filter(c => !c.isStriker && !c.isKnockedOff).length;
      setCoinsLeft(remaining);
      
      if (remaining === 0) {
        console.log('🏆 [NeonStriker] Level', currentLevelRef.current + 1, 'complete! Moving to next level...');
        
        const levelBonus = 200 + (currentLevelRef.current * 50);
        scoreRef.current += levelBonus;
        setScore(scoreRef.current);
        addPopup(levelBonus, 50, 30, 'critical', `🏆 LEVEL ${currentLevelRef.current + 1} DONE! +${levelBonus}`);
        
        // Store next level index
        let nextLevelIndex: number;
        
        // Move to next level
        if (currentLevelRef.current < LEVELS.length - 1) {
          nextLevelIndex = currentLevelRef.current + 1;
          console.log('⏭️ [NeonStriker] Advancing to level', nextLevelIndex + 1);
        } else {
          // Loop back to first level with bonus
          nextLevelIndex = 0;
          scoreRef.current += 500;
          setScore(scoreRef.current);
          addPopup(500, 50, 25, 'critical', '🌟 ALL LEVELS CLEARED! +500');
          console.log('🔄 [NeonStriker] All levels cleared! Restarting from level 1');
        }
        
        // Reset for next level
        isShootingRef.current = false;
        hitsThisShotRef.current = 0;
        setAimLocked(false);
        
        // Mark that we're transitioning levels
        levelTransitionRef.current = true;
        
        // Use a single timeout to handle the level transition
        setTimeout(() => {
          console.log('🔧 [NeonStriker] Reinitializing for level', nextLevelIndex + 1);
          
          // Update level refs and state
          currentLevelRef.current = nextLevelIndex;
          setCurrentLevel(nextLevelIndex);
          
          // Cancel any pending animation
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
          
          // Dispose current scene
          if (rendererRef.current && containerRef.current) {
            if (containerRef.current.contains(rendererRef.current.domElement)) {
              containerRef.current.removeChild(rendererRef.current.domElement);
            }
            rendererRef.current.dispose();
            rendererRef.current = null;
          }
          sceneRef.current = null;
          coinsRef.current = [];
          bumpersRef.current = [];
          aimLineRef.current = null;
          aimArrowRef.current = null;
          
          // Directly initialize the new level after a small delay
          setTimeout(() => {
            console.log('🎮 [NeonStriker] Direct init for level', nextLevelIndex + 1);
            if (containerRef.current) {
              initScene(nextLevelIndex);
              levelTransitionRef.current = false;
              setGameState('playing');
            }
          }, 100);
        }, 500);
        
        return; // Exit early - don't reset game state
      } else {
        setGameState('playing');
        setAimLocked(false);
      }
    }
  }, [addPopup, initScene]);

  const endGame = useCallback(() => {
    setGameState('complete');
    if (timerRef.current) clearInterval(timerRef.current);

    const finalScore = scoreRef.current;

    try {
      logGameCompletion({
        gameType: GAME_TYPES.NEON_STRIKER,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: shotsUsed > 0 ? Math.min(100, ((currentLevelRef.current + 1) * 3 / shotsUsed) * 100) : 0,
        gameData: { 
          shotsUsed, 
          levelsCompleted: currentLevelRef.current + 1, 
          rngSeed: rngSeed ?? 'timestamp', 
          listingId, 
          entryNumber,
          gameDuration: GAME_DURATION
        }
      });
    } catch (e) { console.error('Audit failed:', e); }

    onGameEnd({ score: finalScore, accuracy: shotsUsed > 0 ? Math.min(100, ((currentLevelRef.current + 1) * 3 / shotsUsed) * 100) : 0 });
  }, [shotsUsed, isCompetitionMode, rngSeed, listingId, entryNumber, onGameEnd]);

  // Animation loop
  useEffect(() => {
    if (!sceneReady || gameState === 'ready' || gameState === 'complete') {
      console.log('🎬 [NeonStriker] Animation loop skipped - sceneReady:', sceneReady, 'gameState:', gameState);
      return;
    }
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
      console.log('🎬 [NeonStriker] Animation loop skipped - refs not ready');
      return;
    }

    console.log('🎬 [NeonStriker] Animation loop STARTING for level', currentLevelRef.current + 1);
    let isAnimating = true;
    let frameCount = 0;
    
    const animate = () => {
      if (!isAnimating || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;
      
      // Skip physics during level transition
      if (levelTransitionRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      frameCount++;
      if (frameCount === 1 || frameCount % 300 === 0) {
        console.log('🎬 [NeonStriker] Animation frame', frameCount, 'level', currentLevelRef.current + 1);
      }
      
      updatePhysics();
      updateAimLine();

      const time = Date.now() * 0.003;
      coinsRef.current.forEach(coin => {
        if (coin.mesh && !coin.isKnockedOff) {
          coin.mesh.position.y = 0.15 + Math.sin(time + coin.id) * 0.02;
          coin.mesh.rotation.y += 0.002;
          
          // Pulse the green bonus section for visibility
          if (!coin.isStriker && !coin.bonusHit) {
            const bonusSection = coin.mesh.getObjectByName('bonusSection') as THREE.Mesh;
            if (bonusSection && bonusSection.material) {
              const mat = bonusSection.material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity = 1.0 + Math.sin(time * 4) * 0.5; // Pulse effect
            }
          }
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { 
      console.log('🎬 [NeonStriker] Animation loop STOPPING');
      isAnimating = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current); 
    };
  }, [sceneReady, gameState, updatePhysics, updateAimLine]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'charging' && gameState !== 'shooting') return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, endGame]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    comboCountRef.current = 0;
    currentLevelRef.current = 0;
    setScore(0);
    setShotsUsed(0);
    setTimeRemaining(GAME_DURATION);
    setCurrentLevel(0);
    setComboCount(0);
    setComboMultiplier(1);
    setSceneReady(false);
    setGameState('playing');
  }, []);

  useEffect(() => {
    // Only initialize when playing and scene is not ready
    if (gameState !== 'playing' && gameState !== 'charging' && gameState !== 'shooting') {
      console.log('🔄 [NeonStriker] Scene init skipped - gameState:', gameState);
      return;
    }
    if (sceneReady) {
      console.log('🔄 [NeonStriker] Scene init skipped - already ready');
      return;
    }
    
    console.log('🎮 [NeonStriker] Starting scene initialization for level', currentLevelRef.current + 1);
    
    let initAttempts = 0;
    const maxAttempts = 20;
    
    const checkAndInit = () => {
      initAttempts++;
      console.log('🔍 [NeonStriker] Init attempt', initAttempts, 'container:', !!containerRef.current);
      
      if (containerRef.current) {
        try {
          initScene(currentLevelRef.current);
          console.log('✅ [NeonStriker] Scene initialized successfully');
        } catch (error) {
          console.error('❌ [NeonStriker] Scene init error:', error);
        }
      } else if (initAttempts < maxAttempts) {
        setTimeout(checkAndInit, 100);
      } else {
        console.error('❌ [NeonStriker] Failed to initialize - container not found after', maxAttempts, 'attempts');
      }
    };
    
    // Small delay to ensure React has rendered the container
    setTimeout(checkAndInit, 100);
  }, [gameState, sceneReady, initScene]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting' || aimLocked) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = (e.clientX - rect.left) / rect.width;
    const screenY = (e.clientY - rect.top) / rect.height;
    const relX = (screenX - 0.5) * 3;
    const relY = (screenY - 0.5) * 2;
    
    setAimAngle(Math.atan2(relX, -relY));
  }, [gameState, aimLocked]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState === 'shooting') return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = (e.clientX - rect.left) / rect.width;
    const screenY = (e.clientY - rect.top) / rect.height;
    
    if (isMobile && screenX < 0.35 && screenY > 0.6) {
      setJoystickActive(true);
      joystickStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    const relX = (screenX - 0.5) * 3;
    const relY = (screenY - 0.5) * 2;

    if (!aimLocked) {
      setAimAngle(Math.atan2(relX, -relY));
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

    const launchPower = 0.3 + (power / 100) * 0.9;
    striker.vx = Math.sin(aimAngle) * launchPower;
    striker.vz = -Math.cos(aimAngle) * launchPower;

    // Reset combo tracking for this shot
    coinsRef.current.forEach(c => {
      if (!c.isStriker) {
        c.wasHitByStriker = false;
        c.hitAnotherCoin = false;
        c.isSettled = false;
      }
    });
    comboCountRef.current = 0;

    isShootingRef.current = true;
    setGameState('shooting');
    setShotsUsed(s => s + 1);
    setPower(0);
    setAimLocked(false);
  }, [gameState, power, aimAngle, joystickActive]);

  const handleJoystickMove = useCallback((e: React.PointerEvent) => {
    if (!joystickActive || !joystickStartRef.current) return;
    
    const dx = e.clientX - joystickStartRef.current.x;
    const dy = e.clientY - joystickStartRef.current.y;
    const maxR = 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    
    setJoystickPos({ x: Math.cos(angle) * clampedDist / maxR, y: Math.sin(angle) * clampedDist / maxR });
    setAimAngle(Math.atan2(-Math.cos(angle) * clampedDist, Math.sin(angle) * clampedDist));
  }, [joystickActive]);

  const cancelAim = useCallback(() => {
    if (powerTimerRef.current) clearInterval(powerTimerRef.current);
    setAimLocked(false);
    setPower(0);
    setGameState('playing');
  }, []);

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

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (powerTimerRef.current) clearInterval(powerTimerRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // READY SCREEN
  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex flex-col items-center justify-start z-50 p-4 overflow-y-auto py-8">
        {/* Mobile scroll indicator */}
        <div className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-cyan-500/90 text-black px-4 py-2 rounded-full shadow-lg animate-bounce flex items-center gap-2 pointer-events-none">
          <span>👆</span>
          <span className="text-sm font-bold">Scroll for more</span>
          <span>👇</span>
        </div>
        
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-lg w-full text-center border-2 border-cyan-500 shadow-[0_0_40px_rgba(0,255,255,0.3)]">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent">⚡ NEON STRIKER</h1>
          <p className="text-cyan-400 mb-2">Physics-Based Pool • {GAME_DURATION} Seconds!</p>
          <p className="text-yellow-400 text-sm mb-4">Hit multiple coins in one shot for COMBO multipliers!</p>

          <div className="bg-black/50 rounded-xl p-4 mb-5 text-left text-sm text-gray-300 max-h-60 overflow-y-auto">
            <p className="mb-2 text-cyan-400 font-bold text-center">🎯 CLEAR AS MANY LEVELS AS POSSIBLE!</p>
            
            <div className="mb-3 p-2 bg-cyan-900/30 rounded-lg">
              <p className="text-cyan-300 font-bold mb-1">📱 CONTROLS:</p>
              <p className="mb-1">• <span className="text-yellow-400">MOVE</span> to aim</p>
              <p className="mb-1">• <span className="text-orange-400">TAP & HOLD</span> to charge</p>
              <p>• <span className="text-red-400">RELEASE</span> to shoot!</p>
            </div>
            
            <div className="mb-3 p-2 bg-green-900/30 rounded-lg">
              <p className="text-green-300 font-bold mb-1">💰 SCORING + COMBOS:</p>
              <p className="mb-1"><span className="text-green-400 font-bold">+100</span> Hit coin (stays on board)</p>
              <p className="mb-1"><span className="text-yellow-400 font-bold">2X, 3X, 4X...</span> Hit multiple coins in ONE shot!</p>
              <p className="mb-1"><span className="text-purple-400 font-bold">+200+</span> Level complete bonus</p>
              <p className="mb-1"><span className="text-red-400 font-bold">-50</span> Chain reaction</p>
              <p><span className="text-red-400 font-bold">-100</span> Coin falls off</p>
            </div>
            
            <p className="text-center text-gray-400 text-xs">Level 3+ has MOVING targets! Patterns are consistent for fair play.</p>
          </div>

          {/* Theme Selector */}
          <div className="mb-4 bg-black/30 rounded-xl p-3">
            <GameThemeSelector
              currentTheme={currentTheme}
              onThemeChange={setCurrentTheme}
              compact={true}
            />
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

  // COMPLETE
  if (gameState === 'complete') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 flex items-center justify-center z-50 p-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-3xl p-6 max-w-md w-full text-center border-2 border-cyan-500">
          <h1 className="text-3xl font-bold mb-2 text-cyan-400">⏱️ TIME&apos;S UP!</h1>
          <div className="text-5xl text-cyan-300 font-bold my-4">{score} pts</div>
          <div className="text-gray-400 text-sm mb-4">
            <p>Levels Completed: {currentLevel + 1}</p>
            <p>Shots Used: {shotsUsed}</p>
            <p>RNG Seed: {rngSeed ?? 'Auto'}</p>
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm p-2 flex justify-between items-center border-b border-cyan-500/30">
        <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
          <span className="text-purple-400 font-bold px-2 py-1 bg-purple-500/20 rounded">LV{currentLevel + 1}</span>
          <span className="text-pink-400 font-bold px-2 py-1 bg-pink-500/20 rounded">🎯 {coinsLeft}</span>
          <span className="text-green-400 font-bold px-2 py-1 bg-green-500/20 rounded">💰 {score}</span>
        </div>
        <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm items-center">
          <span className={`font-bold px-3 py-1 rounded ${timeRemaining <= 10 ? 'bg-red-500/50 text-red-300 animate-pulse' : 'bg-yellow-500/20 text-yellow-400'}`}>
            ⏱️ {formatTime(timeRemaining)}
          </span>
          {comboCount >= 2 && (
            <span className="text-orange-400 font-bold px-2 py-1 bg-orange-500/30 rounded animate-pulse">
              🔥 {comboCount}X
            </span>
          )}
          {!isCompetitionMode && onExit && (
            <button onClick={onExit} className="text-white hover:text-red-400 ml-1 text-lg">✕</button>
          )}
        </div>
      </div>

      {/* View buttons */}
      <div className="absolute top-14 left-2 z-30 flex flex-col gap-2">
        <button
          onClick={() => switchView('full')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'full' ? 'bg-cyan-500 text-black' : 'bg-black/60 text-cyan-400 border border-cyan-500'}`}
        >
          👁️ FULL
        </button>
        <button
          onClick={() => switchView('focus')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'focus' ? 'bg-purple-500 text-white' : 'bg-black/60 text-purple-400 border border-purple-500'}`}
        >
          🎯 FOCUS
        </button>
      </div>

      {/* Status */}
      <div className="absolute top-14 right-2 z-30 text-right">
        {gameState === 'playing' && (
          <div className="text-cyan-400 text-xs bg-black/60 px-3 py-2 rounded-lg">
            {LEVELS[currentLevel]?.moving ? '🌀 MOVING TARGETS' : '📌 STATIC TARGETS'}
          </div>
        )}
        {gameState === 'charging' && (
          <div className="text-orange-400 text-sm font-bold bg-orange-500/20 px-3 py-2 rounded-lg animate-pulse">
            🔥 CHARGING!
          </div>
        )}
        {gameState === 'shooting' && (
          <div className="text-cyan-400 text-lg font-bold bg-cyan-500/20 px-3 py-2 rounded-lg animate-pulse">
            ⚡ STRIKE!
          </div>
        )}
      </div>

      {/* Cancel */}
      {aimLocked && gameState !== 'shooting' && (
        <button onClick={cancelAim} className="absolute top-28 right-2 z-30 px-4 py-2 bg-red-500/70 text-white rounded-lg text-sm font-bold">
          ✕ Cancel
        </button>
      )}

      {/* Power bar */}
      {gameState === 'charging' && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-64 sm:w-80">
          <div className="bg-black/80 rounded-full p-2 border-2 border-orange-500">
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

      {/* Mobile joystick */}
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
              className="w-10 h-10 rounded-full bg-cyan-500 shadow-lg"
              style={{ transform: `translate(${joystickPos.x * 25}px, ${joystickPos.y * 25}px)` }}
            />
          </div>
          <p className="text-center text-cyan-400 text-xs mt-1">AIM</p>
        </div>
      )}

      {/* Mobile shoot */}
      {isMobile && gameState === 'playing' && !aimLocked && (
        <div className="absolute bottom-20 right-8 z-40">
          <button
            onClick={shootNow}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-sm shadow-lg active:scale-95"
          >
            🎯<br/>SHOOT
          </button>
        </div>
      )}

      {/* Level info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center bg-black/60 px-4 py-2 rounded-lg">
        <div className="text-gray-400 text-sm font-bold">{LEVELS[currentLevel]?.name}</div>
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
