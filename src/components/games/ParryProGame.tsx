'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';
import GameThemeSelector from './GameThemeSelector';
import { GameTheme, getSavedTheme } from '@/lib/gameThemes';

interface ParryProGameProps {
  onGameEnd?: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onGameComplete?: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  isCompetitionMode?: boolean;
  rngSeed?: number;
  theme?: GameTheme;
  listingId?: string;
  entryNumber?: number;
}

// Seeded RNG
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

// Game duration in seconds
const GAME_DURATION = 60;

interface Enemy {
  id: number;
  side: 'left' | 'right' | 'center' | 'far-left' | 'far-right';
  attackPhase: 'idle' | 'windup' | 'strike' | 'recovery' | 'stunned' | 'dying';
  attackTimer: number;
  swordAngle: number;
  mesh: THREE.Group | null;
  nextAttackIn: number;
  health: number; // 3 hits to kill
  hitFlashTime: number;
}

export default function ParryProGame({ onGameEnd, onGameComplete, onExit, gameMode = 'practice', isCompetitionMode, rngSeed, theme: initialTheme, listingId, entryNumber }: ParryProGameProps) {
  // Support both onGameEnd (from games page) and onGameComplete (legacy)
  const handleGameComplete = onGameEnd || onGameComplete || (() => {});
  const [currentTheme, setCurrentTheme] = useState<GameTheme>(() => initialTheme || getSavedTheme());
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerSwordRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const teslaLightningRef = useRef<THREE.Line[]>([]); // For animated lightning
  
  // Music ref
  const musicRef = useRef<HTMLAudioElement | null>(null);
  
  // Game state refs
  const enemiesRef = useRef<Enemy[]>([]);
  const scoreRef = useRef<number>(0);
  const heartsRef = useRef<number>(3);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const perfectParriesRef = useRef<number>(0);
  const totalParriesRef = useRef<number>(0);
  const totalStrikesRef = useRef<number>(0);
  const enemiesKilledRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const isParryingRef = useRef<boolean>(false);
  const isDodgingRef = useRef<boolean>(false);
  const isStrikingRef = useRef<boolean>(false);
  const parryWindowRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'playing' | 'complete'>('ready');
  const gameStartTimeRef = useRef<number>(0);
  const nextEnemyIdRef = useRef<number>(1);
  const spawnCooldownRef = useRef<number>(0);
  const endGameRef = useRef<() => void>(() => {});
  
  // Callbacks ref
  const onGameCompleteRef = useRef(handleGameComplete);
  const gameModeRef = useRef(isCompetitionMode ? 'competition' : gameMode);
  const rngSeedRef = useRef(rngSeed);
  
  useEffect(() => {
    onGameCompleteRef.current = handleGameComplete;
    gameModeRef.current = isCompetitionMode ? 'competition' : gameMode;
    rngSeedRef.current = rngSeed;
  }, [handleGameComplete, gameMode, isCompetitionMode, rngSeed]);
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('⚔️ [ParryPro] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const seededRngRef = useRef(seededRng);
  useEffect(() => {
    seededRngRef.current = seededRng;
  }, [seededRng]);
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [actionFeedback, setActionFeedback] = useState<'none' | 'perfect' | 'good' | 'miss' | 'dodge' | 'strike' | 'kill'>('none');
  const [isMobile, setIsMobile] = useState(false);
  const [enemyCount, setEnemyCount] = useState(0);
  const [screenFlash, setScreenFlash] = useState<'none' | 'red' | 'white'>('none');
  const [endReason, setEndReason] = useState<'timeout' | 'defeated'>('defeated');
  
  // CoD-style floating score indicators
  const { popups, addPopup, removePopup } = useFloatingScores();
  
  // Snow particles for Christmas perfect parry
  const snowParticlesRef = useRef<THREE.Points | null>(null);
  const snowParticlePositionsRef = useRef<Float32Array | null>(null);
  const snowActiveRef = useRef<boolean>(false);
  const snowTimerRef = useRef<number>(0);
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Spawn snow particles for Christmas perfect parry
  const spawnSnowParticles = useCallback(() => {
    if (!sceneRef.current || currentTheme !== 'christmas') return;
    
    // Remove existing snow if any
    if (snowParticlesRef.current) {
      sceneRef.current.remove(snowParticlesRef.current);
    }
    
    // Create new snow particles (light, doesn't ruin view)
    const particleCount = 50; // Light amount
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12; // X spread
      positions[i * 3 + 1] = 5 + Math.random() * 3; // Y (start above)
      positions[i * 3 + 2] = -5 + Math.random() * 8; // Z spread
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    
    const snow = new THREE.Points(geometry, material);
    snow.name = 'perfectParrySnow';
    sceneRef.current.add(snow);
    snowParticlesRef.current = snow;
    snowParticlePositionsRef.current = positions;
    snowActiveRef.current = true;
    snowTimerRef.current = 0;
  }, [currentTheme]);
  
  // Get side positions for enemies
  const getSidePosition = useCallback((side: Enemy['side']) => {
    switch (side) {
      case 'far-left': return { x: -5, rotation: 0.5 };
      case 'left': return { x: -2.5, rotation: 0.3 };
      case 'center': return { x: 0, rotation: 0 };
      case 'right': return { x: 2.5, rotation: -0.3 };
      case 'far-right': return { x: 5, rotation: -0.5 };
    }
  }, []);
  
  // Create sword mesh
  const createSword = useCallback((isEnemy: boolean = false) => {
    const group = new THREE.Group();
    
    if (currentTheme === 'halloween' && isEnemy) {
      // HALLOWEEN: Scythe weapon for enemies
      // Long curved blade
      const bladePoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const curve = Math.sin(t * Math.PI) * 0.8;
        bladePoints.push(new THREE.Vector3(curve, t * 2.5, 0));
      }
      const bladeCurve = new THREE.CatmullRomCurve3(bladePoints);
      const bladeGeometry = new THREE.TubeGeometry(bladeCurve, 20, 0.06, 8, false);
      const bladeMaterial = new THREE.MeshPhongMaterial({
        color: 0x2a2a2a,
        emissive: 0x1a0000,
        emissiveIntensity: 0.4,
        shininess: 120,
        specular: 0x888888,
      });
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.name = 'blade';
      group.add(blade);
      
      // Blade edge (sharp glowing edge)
      const edgeGeometry = new THREE.TubeGeometry(bladeCurve, 20, 0.02, 4, false);
      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4400, // Orange glow
        transparent: true,
        opacity: 0.8,
      });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.x = 0.04;
      edge.name = 'edge';
      group.add(edge);
      
      // Long wooden handle
      const handleGeometry = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 8);
      const handleMaterial = new THREE.MeshPhongMaterial({
        color: 0x3a2a1a,
        emissive: 0x1a0a00,
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.y = -1.5;
      group.add(handle);
      
      // Metal cap
      const capGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
      const capMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.y = -3.3;
      cap.rotation.x = Math.PI;
      group.add(cap);
      
    } else if (currentTheme === 'christmas' && isEnemy) {
      // CHRISTMAS: CANDY CANE SWORD for enemies
      // Main candy cane blade (straight sword shape with candy cane texture)
      const bladeLength = 2.8;
      const bladeWidth = 0.2;
      
      // Red candy base
      const bladeGeo = new THREE.CylinderGeometry(bladeWidth, bladeWidth, bladeLength, 16);
      const bladeMat = new THREE.MeshPhongMaterial({
        color: 0xee0000,
        emissive: 0x440000,
        shininess: 90,
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = bladeLength / 2;
      blade.name = 'blade';
      group.add(blade);
      
      // White spiral stripes - thick and visible
      for (let stripe = 0; stripe < 12; stripe++) {
        const stripeGeo = new THREE.TorusGeometry(bladeWidth + 0.02, 0.06, 8, 16, Math.PI * 0.6);
        const stripeMat = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          emissive: 0x888888,
          shininess: 80,
        });
        const stripeRing = new THREE.Mesh(stripeGeo, stripeMat);
        stripeRing.position.y = 0.2 + stripe * 0.22;
        stripeRing.rotation.x = Math.PI / 2;
        stripeRing.rotation.z = stripe * 0.6; // Spiral effect
        group.add(stripeRing);
      }
      
      // Curved hook at the top (candy cane style)
      const hookPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const angle = t * Math.PI * 0.8;
        hookPoints.push(new THREE.Vector3(
          -Math.sin(angle) * 0.5,
          bladeLength + Math.cos(angle) * 0.5 - 0.3,
          0
        ));
      }
      const hookCurve = new THREE.CatmullRomCurve3(hookPoints);
      const hookGeo = new THREE.TubeGeometry(hookCurve, 16, bladeWidth * 0.9, 12, false);
      const hookMesh = new THREE.Mesh(hookGeo, bladeMat);
      group.add(hookMesh);
      
      // White stripes on hook
      for (let s = 0; s < 4; s++) {
        const stripeGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        const t = (s + 0.5) / 4;
        const angle = t * Math.PI * 0.8;
        stripe.position.set(-Math.sin(angle) * 0.5, bladeLength + Math.cos(angle) * 0.5 - 0.3, 0.15);
        group.add(stripe);
      }
      
      // Handle/Guard with festive ribbon
      const guardGeo = new THREE.BoxGeometry(0.8, 0.15, 0.15);
      const guardMat = new THREE.MeshStandardMaterial({ color: 0x00aa00, metalness: 0.3 });
      const guard = new THREE.Mesh(guardGeo, guardMat);
      guard.position.y = 0;
      group.add(guard);
      
      // Handle with ribbon wrap
      const handleGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 12);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.y = -0.35;
      group.add(handle);
      
      // Gold ribbon on handle
      for (let r = 0; r < 3; r++) {
        const ribbonGeo = new THREE.TorusGeometry(0.14, 0.02, 8, 16, Math.PI);
        const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.y = -0.2 - r * 0.15;
        ribbon.rotation.x = Math.PI / 2;
        ribbon.rotation.z = r * 0.8;
        group.add(ribbon);
      }
      
      // Festive bow on guard
      const bowMat = new THREE.MeshBasicMaterial({ color: 0x00cc00 });
      const bowLoop1 = new THREE.TorusGeometry(0.12, 0.03, 8, 16, Math.PI * 1.5);
      const bow1 = new THREE.Mesh(bowLoop1, bowMat);
      bow1.position.set(0.3, 0, 0.1);
      bow1.rotation.z = Math.PI / 4;
      group.add(bow1);
      const bow2 = new THREE.Mesh(bowLoop1.clone(), bowMat);
      bow2.position.set(-0.3, 0, 0.1);
      bow2.rotation.z = -Math.PI / 4;
      group.add(bow2);
      
      // Glowing tip
      const tipGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(-0.45, bladeLength + 0.1, 0);
      tip.name = 'edge';
      group.add(tip);
      
    } else {
      // STANDARD: Regular sword
      const bladeGeometry = new THREE.BoxGeometry(0.15, 2.5, 0.05);
      const bladeMaterial = new THREE.MeshPhongMaterial({
        color: isEnemy ? 0x8B0000 : 0xC0C0C0,
        emissive: isEnemy ? 0x400000 : 0x404040,
        emissiveIntensity: 0.3,
        shininess: 100,
        specular: 0xFFFFFF,
      });
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.position.y = 1.25;
      blade.name = 'blade';
      group.add(blade);
      
      const edgeGeometry = new THREE.BoxGeometry(0.02, 2.5, 0.06);
      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: isEnemy ? 0xFF4444 : 0x88CCFF,
        transparent: true,
        opacity: 0.6,
      });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.y = 1.25;
      edge.position.x = 0.08;
      edge.name = 'edge';
      group.add(edge);
      
      const guardGeometry = new THREE.BoxGeometry(0.8, 0.15, 0.1);
      const guardMaterial = new THREE.MeshPhongMaterial({
        color: isEnemy ? 0x4A0000 : 0xDAA520,
        emissive: isEnemy ? 0x200000 : 0x554400,
        shininess: 80,
      });
      const guard = new THREE.Mesh(guardGeometry, guardMaterial);
      group.add(guard);
      
      const handleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
      const handleMaterial = new THREE.MeshPhongMaterial({
        color: isEnemy ? 0x2A0000 : 0x8B4513,
        emissive: isEnemy ? 0x100000 : 0x3A1A05,
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.y = -0.3;
      group.add(handle);
      
      const pommelGeometry = new THREE.SphereGeometry(0.12, 16, 16);
      const pommel = new THREE.Mesh(pommelGeometry, guardMaterial);
      pommel.position.y = -0.65;
      group.add(pommel);
    }
    
    return group;
  }, [currentTheme]);
  
  // Create enemy figure
  const createEnemy = useCallback((side: Enemy['side']) => {
    const group = new THREE.Group();
    
    // Body - themed
    let bodyColor = 0x2C2C2C;
    let bodyEmissive = 0x100000;
    if (currentTheme === 'halloween') {
      bodyColor = 0x1a1a2a; // Darker purple tint
      bodyEmissive = 0x1a0a2a;
    } else if (currentTheme === 'christmas') {
      bodyColor = 0x1a3a1a; // Dark green (elf-like)
      bodyEmissive = 0x0a1a0a;
    }
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: bodyColor,
      emissive: bodyEmissive,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.name = 'body';
    group.add(body);
    
    if (currentTheme === 'halloween') {
      // HALLOWEEN: 3D Flaming Pumpkin Head
      // Main pumpkin shape
      const pumpkinGeometry = new THREE.SphereGeometry(0.35, 16, 12);
      pumpkinGeometry.scale(1, 0.85, 0.9);
      const pumpkinMaterial = new THREE.MeshPhongMaterial({
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 0.4,
        shininess: 30,
      });
      const pumpkin = new THREE.Mesh(pumpkinGeometry, pumpkinMaterial);
      pumpkin.position.y = 1.5;
      pumpkin.name = 'head';
      group.add(pumpkin);
      
      // Pumpkin ridges
      for (let i = 0; i < 8; i++) {
        const ridgeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4);
        const ridgeMaterial = new THREE.MeshPhongMaterial({ color: 0xcc5500 });
        const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
        const angle = (i / 8) * Math.PI * 2;
        ridge.position.set(Math.cos(angle) * 0.32, 1.5, Math.sin(angle) * 0.28);
        ridge.rotation.z = Math.PI / 2;
        ridge.rotation.y = angle;
        group.add(ridge);
      }
      
      // Stem
      const stemGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8);
      const stemMaterial = new THREE.MeshPhongMaterial({ color: 0x3a5a2a });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 1.9;
      group.add(stem);
      
      // Glowing carved eyes (triangles)
      const eyeShape = new THREE.Shape();
      eyeShape.moveTo(0, 0.08);
      eyeShape.lineTo(-0.06, -0.04);
      eyeShape.lineTo(0.06, -0.04);
      eyeShape.closePath();
      const eyeGeometry = new THREE.ShapeGeometry(eyeShape);
      const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.95,
      });
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.12, 1.55, 0.32);
      group.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.12, 1.55, 0.32);
      group.add(rightEye);
      
      // Carved mouth (jagged)
      const mouthShape = new THREE.Shape();
      mouthShape.moveTo(-0.15, 0);
      mouthShape.lineTo(-0.1, 0.06);
      mouthShape.lineTo(-0.05, 0);
      mouthShape.lineTo(0, 0.06);
      mouthShape.lineTo(0.05, 0);
      mouthShape.lineTo(0.1, 0.06);
      mouthShape.lineTo(0.15, 0);
      mouthShape.lineTo(0.1, -0.06);
      mouthShape.lineTo(-0.1, -0.06);
      mouthShape.closePath();
      const mouthGeometry = new THREE.ShapeGeometry(mouthShape);
      const mouth = new THREE.Mesh(mouthGeometry, eyeMaterial.clone());
      mouth.position.set(0, 1.4, 0.32);
      group.add(mouth);
      
      // Fire/flames on top
      for (let i = 0; i < 5; i++) {
        const flameGeometry = new THREE.ConeGeometry(0.08, 0.25, 6);
        const flameMaterial = new THREE.MeshBasicMaterial({
          color: i < 2 ? 0xff4400 : (i < 4 ? 0xff8800 : 0xffcc00),
          transparent: true,
          opacity: 0.8,
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        const offsetX = (Math.random() - 0.5) * 0.2;
        const offsetZ = (Math.random() - 0.5) * 0.15;
        flame.position.set(offsetX, 2.0 + Math.random() * 0.1, offsetZ);
        flame.name = `flame${i}`;
        group.add(flame);
      }
      
      // Inner fire glow light
      const fireLight = new THREE.PointLight(0xff6600, 1.5, 3);
      fireLight.position.set(0, 1.5, 0);
      group.add(fireLight);
      
    } else if (currentTheme === 'christmas') {
      // CHRISTMAS: Regular head with Santa hat
      const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
      const headMaterial = new THREE.MeshPhongMaterial({
        color: 0x2a4a2a, // Green-ish for elf
        emissive: 0x0a1a0a,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.5;
      head.name = 'head';
      group.add(head);
      
      // Santa Hat - cone shape
      const hatGeometry = new THREE.ConeGeometry(0.28, 0.5, 12);
      const hatMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0x440000,
        shininess: 40,
      });
      const hat = new THREE.Mesh(hatGeometry, hatMaterial);
      hat.position.set(0, 1.85, 0);
      hat.rotation.x = 0.15; // Slight tilt
      hat.rotation.z = 0.1;
      group.add(hat);
      
      // White fur trim at base
      const trimGeometry = new THREE.TorusGeometry(0.26, 0.06, 8, 24);
      const trimMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x444444,
        shininess: 20,
      });
      const trim = new THREE.Mesh(trimGeometry, trimMaterial);
      trim.position.y = 1.68;
      trim.rotation.x = Math.PI / 2;
      group.add(trim);
      
      // White pompom on top
      const pompomGeometry = new THREE.SphereGeometry(0.1, 12, 12);
      const pompom = new THREE.Mesh(pompomGeometry, trimMaterial.clone());
      pompom.position.set(0.08, 2.1, 0.05);
      group.add(pompom);
      
      // Glowing green eyes (festive)
      const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.08, 1.52, 0.2);
      group.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.08, 1.52, 0.2);
      group.add(rightEye);
      
    } else {
      // STANDARD: Regular head
      const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
      const headMaterial = new THREE.MeshPhongMaterial({
        color: 0x1A1A1A,
        emissive: 0x0A0000,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.5;
      head.name = 'head';
      group.add(head);
      
      // Glowing red eyes
      const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.08, 1.5, 0.2);
      group.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
      rightEye.position.set(0.08, 1.5, 0.2);
      group.add(rightEye);
    }
    
    // Health bar background
    const healthBgGeometry = new THREE.PlaneGeometry(0.8, 0.12);
    const healthBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBg = new THREE.Mesh(healthBgGeometry, healthBgMaterial);
    healthBg.position.set(0, 2, 0);
    healthBg.name = 'healthBg';
    group.add(healthBg);
    
    // Health bar
    const healthGeometry = new THREE.PlaneGeometry(0.75, 0.08);
    const healthMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
    healthBar.position.set(0, 2, 0.01);
    healthBar.name = 'healthBar';
    group.add(healthBar);
    
    // Sword arm
    const sword = createSword(true);
    sword.position.set(side === 'left' || side === 'far-left' ? -0.5 : 0.5, 0.8, 0);
    sword.name = 'sword';
    group.add(sword);
    
    // Position based on side
    const pos = getSidePosition(side);
    group.position.x = pos.x;
    group.rotation.y = pos.rotation;
    group.position.z = -3;
    group.position.y = 0;
    
    return group;
  }, [createSword, getSidePosition, currentTheme]);
  
  // Spawn new enemy
  const spawnEnemy = useCallback(() => {
    if (!sceneRef.current) return;
    
    const currentEnemies = enemiesRef.current.filter(e => e.attackPhase !== 'dying');
    if (currentEnemies.length >= 5) return; // Max 5 enemies
    
    // Find available sides
    const usedSides = currentEnemies.map(e => e.side);
    const allSides: Enemy['side'][] = ['far-left', 'left', 'center', 'right', 'far-right'];
    const availableSides = allSides.filter(s => !usedSides.includes(s));
    
    if (availableSides.length === 0) return;
    
    const side = availableSides[Math.floor(seededRngRef.current.next() * availableSides.length)];
    const enemyMesh = createEnemy(side);
    sceneRef.current.add(enemyMesh);
    
    const newEnemy: Enemy = {
      id: nextEnemyIdRef.current++,
      side: side,
      attackPhase: 'idle',
      attackTimer: 0,
      swordAngle: 0,
      mesh: enemyMesh,
      nextAttackIn: 1.5 + seededRngRef.current.next() * 1.5,
      health: 3,
      hitFlashTime: 0,
    };
    
    enemiesRef.current.push(newEnemy);
    setEnemyCount(enemiesRef.current.filter(e => e.attackPhase !== 'dying').length);
    
    console.log('⚔️ [ParryPro] Enemy spawned on', side, '- Total:', enemiesRef.current.length);
  }, [createEnemy]);
  
  // Handle parry input
  const handleParry = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isDodgingRef.current || isStrikingRef.current) return;
    
    const now = Date.now();
    if (now - lastActionTimeRef.current < 150) return;
    lastActionTimeRef.current = now;
    
    isParryingRef.current = true;
    parryWindowRef.current = 0.3;
    
    // Animate player sword - parry swing
    if (playerSwordRef.current) {
      playerSwordRef.current.rotation.z = -0.8;
      setTimeout(() => {
        if (playerSwordRef.current) {
          playerSwordRef.current.rotation.z = 0;
        }
      }, 200);
    }
    
    // Check if any enemy is in strike phase
    let parried = false;
    enemiesRef.current.forEach(enemy => {
      if (enemy.attackPhase === 'strike') {
        parried = true;
        totalParriesRef.current++;
        
        const strikeProgress = enemy.attackTimer;
        const isPerfect = strikeProgress > 0.3 && strikeProgress < 0.7;
        
        if (isPerfect) {
          perfectParriesRef.current++;
          comboRef.current++;
          if (comboRef.current > maxComboRef.current) {
            maxComboRef.current = comboRef.current;
          }
          
          // PERFECT PARRY = 750 points + combo bonus!
          const points = 750 + (comboRef.current * 50);
          scoreRef.current += points;
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setActionFeedback('perfect');
          
          addPopup(points, 50, 30, 'perfect', `⚡ PERFECT! +${points}`);
          
          // Spawn snow effect for Christmas theme
          spawnSnowParticles();
          
          // Give heart back on perfect parry (max 3)
          if (heartsRef.current < 3) {
            heartsRef.current++;
            setHearts(heartsRef.current);
            addPopup(0, 50, 45, 'bonus', '❤️ +1 HEART!');
          }
        } else {
          comboRef.current = Math.max(0, comboRef.current - 1);
          // Normal PARRY = 500 points
          const points = 500;
          scoreRef.current += points;
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setActionFeedback('good');
          
          addPopup(points, 50, 30, 'bonus', '🛡️ PARRY! +500');
        }
        
        enemy.attackPhase = 'recovery';
        enemy.attackTimer = 0;
        
        setTimeout(() => setActionFeedback('none'), 500);
      }
    });
    
    if (!parried) {
      setActionFeedback('miss');
      setTimeout(() => setActionFeedback('none'), 300);
    }
    
    setTimeout(() => {
      isParryingRef.current = false;
    }, 300);
  }, [addPopup]);
  
  // Handle dodge input - dodges ALL incoming attacks
  const handleDodge = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isParryingRef.current || isStrikingRef.current || isDodgingRef.current) return;
    
    const now = Date.now();
    if (now - lastActionTimeRef.current < 300) return;
    lastActionTimeRef.current = now;
    
    isDodgingRef.current = true;
    
    // Animate player - dodge roll
    if (playerSwordRef.current) {
      const originalZ = playerSwordRef.current.position.z;
      playerSwordRef.current.position.z = originalZ + 1;
      playerSwordRef.current.rotation.x = -1;
      
      setTimeout(() => {
        if (playerSwordRef.current) {
          playerSwordRef.current.position.z = originalZ;
          playerSwordRef.current.rotation.x = -0.3;
        }
      }, 400);
    }
    
    // Cancel ALL enemy strikes
    let dodgedCount = 0;
    enemiesRef.current.forEach(enemy => {
      if (enemy.attackPhase === 'strike' || enemy.attackPhase === 'windup') {
        dodgedCount++;
        enemy.attackPhase = 'recovery';
        enemy.attackTimer = 0;
      }
    });
    
    if (dodgedCount > 0) {
      setActionFeedback('dodge');
      // DODGE = 200 points per dodge!
      const points = 200 * dodgedCount;
      scoreRef.current += points;
      setScore(scoreRef.current);
      
      addPopup(points, 50, 40, 'bonus', `🏃 DODGE! +${points}`);
      
      setTimeout(() => setActionFeedback('none'), 500);
    }
    
    setTimeout(() => {
      isDodgingRef.current = false;
    }, 500);
  }, [addPopup]);
  
  // Handle strike input - attack enemies
  const handleStrike = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isParryingRef.current || isDodgingRef.current || isStrikingRef.current) return;
    
    const now = Date.now();
    if (now - lastActionTimeRef.current < 200) return;
    lastActionTimeRef.current = now;
    
    isStrikingRef.current = true;
    totalStrikesRef.current++;
    
    // Animate player sword - attack swing
    if (playerSwordRef.current) {
      playerSwordRef.current.rotation.z = 0.8;
      playerSwordRef.current.rotation.x = 0.3;
      
      setTimeout(() => {
        if (playerSwordRef.current) {
          playerSwordRef.current.rotation.z = 0;
          playerSwordRef.current.rotation.x = -0.3;
        }
      }, 250);
    }
    
    // Find closest enemy that's not attacking (idle or recovery)
    let targetEnemy: Enemy | null = null;
    let closestDistance = Infinity;
    
    enemiesRef.current.forEach(enemy => {
      if (enemy.attackPhase === 'idle' || enemy.attackPhase === 'recovery' || enemy.attackPhase === 'stunned') {
        const pos = getSidePosition(enemy.side);
        const distance = Math.abs(pos.x);
        if (distance < closestDistance) {
          closestDistance = distance;
          targetEnemy = enemy;
        }
      }
    });
    
    if (targetEnemy) {
      targetEnemy.health--;
      targetEnemy.hitFlashTime = 0.3;
      targetEnemy.attackPhase = 'stunned';
      targetEnemy.attackTimer = 0;
      
      // Update health bar
      if (targetEnemy.mesh) {
        const healthBar = targetEnemy.mesh.getObjectByName('healthBar') as THREE.Mesh;
        if (healthBar) {
          healthBar.scale.x = targetEnemy.health / 3;
          healthBar.position.x = -0.375 * (1 - targetEnemy.health / 3);
        }
      }
      
      // Show strike hit popup with colored precision rating (if not a kill)
      if (targetEnemy.health > 0) {
        // STRIKE = 50 points per hit
        const strikePoints = 50;
        scoreRef.current += strikePoints;
        setScore(scoreRef.current);
        
        // Color based on hits - more hits = better precision
        const hitsLanded = 3 - targetEnemy.health;
        const popupType = hitsLanded === 2 ? 'critical' : comboRef.current >= 2 ? 'bonus' : 'normal';
        const hitLabel = hitsLanded === 1 ? '⚔️ STRIKE!' : hitsLanded === 2 ? '⚔️ CRITICAL!' : '⚔️ HIT!';
        addPopup(strikePoints, 50, 45, popupType, `${hitLabel} +50`);
      }
      
      if (targetEnemy.health <= 0) {
        // Enemy killed! 50 points for the kill
        targetEnemy.attackPhase = 'dying';
        enemiesKilledRef.current++;
        
        const killPoints = 50; // Kill bonus
        scoreRef.current += killPoints;
        setScore(scoreRef.current);
        setActionFeedback('kill');
        
        // Give heart back on kill (max 3)
        if (heartsRef.current < 3) {
          heartsRef.current++;
          setHearts(heartsRef.current);
          addPopup(0, 50, 50, 'bonus', '❤️ +1 HEART!');
        }
        
        // Flash screen white
        setScreenFlash('white');
        setTimeout(() => setScreenFlash('none'), 100);
        
        addPopup(killPoints, 50, 35, 'critical', '💀 KILL! +50');
        
        // Remove enemy mesh after animation
        const enemyToRemove = targetEnemy;
        setTimeout(() => {
          if (enemyToRemove.mesh && sceneRef.current) {
            sceneRef.current.remove(enemyToRemove.mesh);
          }
          enemiesRef.current = enemiesRef.current.filter(e => e.id !== enemyToRemove.id);
          setEnemyCount(enemiesRef.current.filter(e => e.attackPhase !== 'dying').length);
        }, 500);
        
        // Spawn replacement enemy quickly
        spawnCooldownRef.current = 0.5;
        
        setTimeout(() => setActionFeedback('none'), 600);
      } else {
        setActionFeedback('strike');
        
        // Already awarded 200 points above, this is just visual feedback
        addPopup(0, 50, 35, 'normal', `⚔️ ${3 - targetEnemy.health}/3 HITS`);
        
        setTimeout(() => setActionFeedback('none'), 300);
      }
    }
    
    setTimeout(() => {
      isStrikingRef.current = false;
    }, 300);
  }, [addPopup, getSidePosition]);
  
  // Start game
  const startGame = useCallback(() => {
    gameStateRef.current = 'playing';
    setGameState('playing');
    scoreRef.current = 0;
    setScore(0);
    heartsRef.current = 3;
    setHearts(3);
    comboRef.current = 0;
    setCombo(0);
    gameTimeRef.current = 0;
    setTimeRemaining(GAME_DURATION);
    setEndReason('defeated');
    perfectParriesRef.current = 0;
    totalParriesRef.current = 0;
    totalStrikesRef.current = 0;
    enemiesKilledRef.current = 0;
    maxComboRef.current = 0;
    gameStartTimeRef.current = Date.now();
    nextEnemyIdRef.current = 1;
    spawnCooldownRef.current = 0;
    
    // Start background music
    try {
      if (!musicRef.current) {
        musicRef.current = new Audio('/ParryPro.mp3');
        musicRef.current.loop = true;
        musicRef.current.volume = 0.4;
      }
      musicRef.current.currentTime = 0;
      musicRef.current.play().catch(err => console.log('Music autoplay blocked:', err));
    } catch (err) {
      console.log('Music error:', err);
    }
    
    // Clear old enemies
    enemiesRef.current.forEach(e => {
      if (e.mesh && sceneRef.current) {
        sceneRef.current.remove(e.mesh);
      }
    });
    enemiesRef.current = [];
    
    // Spawn initial enemies (start with 2)
    if (sceneRef.current) {
      // First enemy (center)
      const centerMesh = createEnemy('center');
      sceneRef.current.add(centerMesh);
      enemiesRef.current.push({
        id: nextEnemyIdRef.current++,
        side: 'center',
        attackPhase: 'idle',
        attackTimer: 0,
        swordAngle: 0,
        mesh: centerMesh,
        nextAttackIn: 2.0 + seededRngRef.current.next() * 1.0,
        health: 3,
        hitFlashTime: 0,
      });
      
      // Second enemy (random side)
      const side = seededRngRef.current.next() > 0.5 ? 'left' : 'right';
      const sideMesh = createEnemy(side);
      sceneRef.current.add(sideMesh);
      enemiesRef.current.push({
        id: nextEnemyIdRef.current++,
        side: side,
        attackPhase: 'idle',
        attackTimer: 0,
        swordAngle: 0,
        mesh: sideMesh,
        nextAttackIn: 3.0 + seededRngRef.current.next() * 1.5,
        health: 3,
        hitFlashTime: 0,
      });
      
      setEnemyCount(2);
    }
  }, [createEnemy]);
  
  // Initialize scene - recreate when theme changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    // If scene exists, dispose it first (for theme changes)
    if (sceneRef.current && rendererRef.current) {
      console.log('🔄 [ParryPro] Theme changed, recreating scene...');
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      playerSwordRef.current = null;
      enemiesRef.current = [];
      initializedRef.current = false;
    }
    
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene - THEMED backgrounds
    const scene = new THREE.Scene();
    
    // Theme-based background colors
    if (currentTheme === 'halloween') {
      scene.background = new THREE.Color(0x0a0015); // Dark purple night
      scene.fog = new THREE.Fog(0x0a0015, 8, 25);
    } else if (currentTheme === 'christmas') {
      scene.background = new THREE.Color(0x0a1a2a); // Dark winter night
      scene.fog = new THREE.Fog(0x0a1a2a, 10, 30);
    } else {
      scene.background = new THREE.Color(0x1a0a0a);
      scene.fog = new THREE.Fog(0x1a0a0a, 5, 20);
    }
    sceneRef.current = scene;
    
    // Camera - wider FOV and further back on mobile to see all enemies
    const isMobileDevice = window.innerWidth < 768;
    const fov = isMobileDevice ? 85 : 60; // Wider FOV on mobile
    const camZ = isMobileDevice ? 8 : 5; // Further back on mobile
    const camY = isMobileDevice ? 3 : 2; // Higher up on mobile
    const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, 1, -3);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting - themed
    if (currentTheme === 'halloween') {
      const ambientLight = new THREE.AmbientLight(0x2211aa, 0.4);
      scene.add(ambientLight);
      const spotlight = new THREE.SpotLight(0x8844FF, 1.5);
      spotlight.position.set(0, 8, 2);
      spotlight.angle = Math.PI / 4;
      spotlight.castShadow = true;
      scene.add(spotlight);
      const backLight = new THREE.DirectionalLight(0x6622FF, 0.4);
      backLight.position.set(-5, 3, -5);
      scene.add(backLight);
    } else if (currentTheme === 'christmas') {
      const ambientLight = new THREE.AmbientLight(0x334466, 0.5);
      scene.add(ambientLight);
      const spotlight = new THREE.SpotLight(0xFFFFDD, 1.2);
      spotlight.position.set(0, 8, 2);
      spotlight.angle = Math.PI / 4;
      spotlight.castShadow = true;
      scene.add(spotlight);
      const backLight = new THREE.DirectionalLight(0x4488FF, 0.3);
      backLight.position.set(-5, 3, -5);
      scene.add(backLight);
    } else {
      const ambientLight = new THREE.AmbientLight(0x442222, 0.5);
      scene.add(ambientLight);
      const spotlight = new THREE.SpotLight(0xFF4444, 1.5);
      spotlight.position.set(0, 8, 2);
      spotlight.angle = Math.PI / 4;
      spotlight.castShadow = true;
      scene.add(spotlight);
      const backLight = new THREE.DirectionalLight(0x4444FF, 0.3);
      backLight.position.set(-5, 3, -5);
      scene.add(backLight);
    }
    
    // === HALLOWEEN THEMED BACKGROUND ===
    if (currentTheme === 'halloween') {
      // FULL MOON
      const moonGeo = new THREE.CircleGeometry(3, 32);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(8, 10, -20);
      scene.add(moon);
      // Moon glow
      const moonGlowGeo = new THREE.CircleGeometry(4, 32);
      const moonGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.3 });
      const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
      moonGlow.position.set(8, 10, -20.1);
      scene.add(moonGlow);
      
      // FRANKENSTEIN'S CASTLE silhouette
      const castleMat = new THREE.MeshBasicMaterial({ color: 0x0a0010 });
      // Main tower
      const towerGeo = new THREE.BoxGeometry(4, 12, 2);
      const tower = new THREE.Mesh(towerGeo, castleMat);
      tower.position.set(-8, 4, -18);
      scene.add(tower);
      // Tower top
      const towerTopGeo = new THREE.ConeGeometry(2.5, 3, 4);
      const towerTop = new THREE.Mesh(towerTopGeo, castleMat);
      towerTop.position.set(-8, 11.5, -18);
      scene.add(towerTop);
      // Second tower
      const tower2 = new THREE.Mesh(towerGeo.clone(), castleMat);
      tower2.scale.set(0.8, 0.7, 1);
      tower2.position.set(-4, 2.5, -16);
      scene.add(tower2);
      // Castle wall
      const wallGeo = new THREE.BoxGeometry(8, 5, 1);
      const wall = new THREE.Mesh(wallGeo, castleMat);
      wall.position.set(-6, 1.5, -15);
      scene.add(wall);
      
      // TESLA COILS
      const teslaTopPositions: THREE.Vector3[] = [];
      for (let i = 0; i < 2; i++) {
        const coilX = i === 0 ? -12 : 12;
        // Base
        const baseGeo = new THREE.CylinderGeometry(0.8, 1, 1, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(coilX, 0.5, -12);
        scene.add(base);
        // Tower
        const towerCoilGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const towerCoil = new THREE.Mesh(towerCoilGeo, baseMat);
        towerCoil.position.set(coilX, 3, -12);
        scene.add(towerCoil);
        // Copper coil rings
        for (let r = 0; r < 6; r++) {
          const ringGeo = new THREE.TorusGeometry(0.45 - r * 0.02, 0.05, 8, 16);
          const ringMat = new THREE.MeshStandardMaterial({ color: 0xcc6600, metalness: 0.9 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(coilX, 1.5 + r * 0.4, -12);
          ring.rotation.x = Math.PI / 2;
          scene.add(ring);
        }
        // Top sphere (glowing)
        const topGeo = new THREE.SphereGeometry(0.6, 16, 16);
        const topMat = new THREE.MeshStandardMaterial({ 
          color: 0x4488ff, 
          emissive: 0x2244ff, 
          emissiveIntensity: 0.8,
          metalness: 0.3,
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.set(coilX, 5.3, -12);
        scene.add(top);
        teslaTopPositions.push(new THREE.Vector3(coilX, 5.3, -12));
        
        // Glow around sphere
        const glowGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ 
          color: 0x4488ff, 
          transparent: true, 
          opacity: 0.3 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(coilX, 5.3, -12);
        scene.add(glow);
      }
      
      // ANIMATED LIGHTNING BOLTS between Tesla coils
      teslaLightningRef.current = [];
      const createLightningBolt = () => {
        const points: THREE.Vector3[] = [];
        const startPos = teslaTopPositions[0];
        const endPos = teslaTopPositions[1];
        const segments = 12;
        
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const x = startPos.x + (endPos.x - startPos.x) * t;
          const y = startPos.y + (Math.random() - 0.5) * 1.5; // Random vertical offset
          const z = startPos.z + (Math.random() - 0.5) * 0.5;
          points.push(new THREE.Vector3(x, y, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
          color: 0x44aaff,
          transparent: true,
          opacity: 0.9,
          linewidth: 2,
        });
        const lightning = new THREE.Line(geometry, material);
        scene.add(lightning);
        return lightning;
      };
      
      // Create 3 lightning bolts
      for (let b = 0; b < 3; b++) {
        teslaLightningRef.current.push(createLightningBolt());
      }
      
      // Add lightning glow line (thicker, more transparent)
      const glowPoints = [teslaTopPositions[0], teslaTopPositions[1]];
      const glowGeometry = new THREE.BufferGeometry().setFromPoints(glowPoints);
      const glowLineMat = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.2,
      });
      const glowLine = new THREE.Line(glowGeometry, glowLineMat);
      scene.add(glowLine);
      
      // TOMBSTONES
      const tombMat = new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.9 });
      const tombPositions = [[-6, -10], [-3, -11], [3, -10], [6, -11], [0, -12]];
      tombPositions.forEach(([x, z]) => {
        const tombGeo = new THREE.BoxGeometry(0.8, 1.2, 0.2);
        const tomb = new THREE.Mesh(tombGeo, tombMat);
        tomb.position.set(x, 0.6, z);
        tomb.rotation.y = (Math.random() - 0.5) * 0.3;
        scene.add(tomb);
        // Top curve
        const topCurveGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16, 1, false, 0, Math.PI);
        const topCurve = new THREE.Mesh(topCurveGeo, tombMat);
        topCurve.rotation.x = Math.PI / 2;
        topCurve.rotation.z = Math.PI / 2;
        topCurve.position.set(x, 1.2, z);
        scene.add(topCurve);
      });
    }
    
    // === CHRISTMAS THEMED BACKGROUND ===
    if (currentTheme === 'christmas') {
      // Gentle snowfall particles
      const snowCount = 100;
      const snowGeometry = new THREE.BufferGeometry();
      const snowPositions = new Float32Array(snowCount * 3);
      for (let i = 0; i < snowCount * 3; i += 3) {
        snowPositions[i] = (Math.random() - 0.5) * 40;
        snowPositions[i + 1] = Math.random() * 15;
        snowPositions[i + 2] = (Math.random() - 0.5) * 30 - 5;
      }
      snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
      const snowMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 });
      const snow = new THREE.Points(snowGeometry, snowMaterial);
      scene.add(snow);
      
      // CHRISTMAS TREES
      const treePositions = [[-10, -12], [-6, -14], [6, -14], [10, -12], [0, -16]];
      treePositions.forEach(([x, z]) => {
        const treeGroup = new THREE.Group();
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.5;
        treeGroup.add(trunk);
        // Tree layers
        for (let i = 0; i < 3; i++) {
          const coneGeo = new THREE.ConeGeometry(1.5 - i * 0.3, 2, 8);
          const coneMat = new THREE.MeshStandardMaterial({ color: 0x1a5a1a, emissive: 0x0a2a0a, emissiveIntensity: 0.2 });
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.y = 1.5 + i * 1.2;
          treeGroup.add(cone);
        }
        // Star on top
        const starGeo = new THREE.OctahedronGeometry(0.3, 0);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.y = 5;
        treeGroup.add(star);
        // Ornaments
        const ornamentColors = [0xff0000, 0x0000ff, 0xffff00, 0xff00ff];
        for (let o = 0; o < 6; o++) {
          const ornGeo = new THREE.SphereGeometry(0.12, 8, 8);
          const ornMat = new THREE.MeshBasicMaterial({ color: ornamentColors[o % 4] });
          const orn = new THREE.Mesh(ornGeo, ornMat);
          const angle = (o / 6) * Math.PI * 2;
          const height = 1.5 + (o % 3) * 1.2;
          orn.position.set(Math.cos(angle) * (1.3 - (o % 3) * 0.2), height, Math.sin(angle) * (1.3 - (o % 3) * 0.2));
          treeGroup.add(orn);
        }
        treeGroup.position.set(x, 0, z);
        scene.add(treeGroup);
      });
      
      // GIFT BOXES
      const giftPositions = [[-4, -10], [4, -10], [-2, -11], [2, -11]];
      const giftColors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff];
      giftPositions.forEach(([x, z], i) => {
        const giftGroup = new THREE.Group();
        // Box
        const boxGeo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({ color: giftColors[i] });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = 0.3;
        giftGroup.add(box);
        // Ribbon
        const ribbonMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
        const ribbon1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.85), ribbonMat);
        ribbon1.position.y = 0.3;
        giftGroup.add(ribbon1);
        const ribbon2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.1), ribbonMat);
        ribbon2.position.y = 0.3;
        giftGroup.add(ribbon2);
        // Bow
        const bowGeo = new THREE.TorusGeometry(0.15, 0.05, 8, 16, Math.PI);
        const bow1 = new THREE.Mesh(bowGeo, ribbonMat);
        bow1.position.set(0.1, 0.65, 0);
        bow1.rotation.z = Math.PI / 4;
        giftGroup.add(bow1);
        const bow2 = new THREE.Mesh(bowGeo, ribbonMat);
        bow2.position.set(-0.1, 0.65, 0);
        bow2.rotation.z = -Math.PI / 4;
        giftGroup.add(bow2);
        giftGroup.position.set(x, 0, z);
        giftGroup.rotation.y = Math.random() * 0.5;
        scene.add(giftGroup);
      });
      
      // CHRISTMAS LIGHTS string
      const lightsColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
      for (let i = 0; i < 20; i++) {
        const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ color: lightsColors[i % 5] });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        const angle = (i / 20) * Math.PI + Math.PI;
        bulb.position.set(Math.cos(angle) * 12, 6 + Math.sin(i * 0.5) * 0.5, -10);
        scene.add(bulb);
      }
    }
    
    // Floor (arena) - themed
    const floorGeometry = new THREE.CircleGeometry(10, 32);
    let floorColor = 0x2a1a1a;
    let floorEmissive = 0x100505;
    if (currentTheme === 'halloween') {
      floorColor = 0x1a1020;
      floorEmissive = 0x0a0510;
    } else if (currentTheme === 'christmas') {
      floorColor = 0xddddee; // Snowy ground
      floorEmissive = 0x222233;
    }
    const floorMaterial = new THREE.MeshPhongMaterial({
      color: floorColor,
      emissive: floorEmissive,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Arena ring - themed
    const ringGeometry = new THREE.TorusGeometry(9.5, 0.1, 8, 64);
    let ringColor = 0xFF4444;
    if (currentTheme === 'halloween') {
      ringColor = 0x8844FF; // Purple
    } else if (currentTheme === 'christmas') {
      ringColor = 0x00FF00; // Green
    }
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: ringColor,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    scene.add(ring);
    
    // Player sword (always visible at bottom)
    const playerSword = createSword(false);
    playerSword.position.set(0, 0.5, 3);
    playerSword.rotation.x = -0.3;
    scene.add(playerSword);
    playerSwordRef.current = playerSword;
    
    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      
      // Update game time
      if (gameStateRef.current === 'playing') {
        gameTimeRef.current += deltaTime;
        const remaining = Math.max(0, GAME_DURATION - Math.floor(gameTimeRef.current));
        setTimeRemaining(remaining);
        
        // Check if time ran out
        if (remaining <= 0) {
          setEndReason('timeout');
          endGameRef.current();
          return;
        }
        
        // Spawn more enemies over time
        spawnCooldownRef.current -= deltaTime;
        
        const aliveEnemies = enemiesRef.current.filter(e => e.attackPhase !== 'dying').length;
        
        // Spawn schedule based on time
        if (spawnCooldownRef.current <= 0) {
          if (gameTimeRef.current >= 5 && aliveEnemies < 2) {
            spawnEnemy();
            spawnCooldownRef.current = 2;
          } else if (gameTimeRef.current >= 15 && aliveEnemies < 3) {
            spawnEnemy();
            spawnCooldownRef.current = 2.5;
          } else if (gameTimeRef.current >= 30 && aliveEnemies < 5) {
            // After 30 seconds: spawn up to 5 enemies, faster spawns
            spawnEnemy();
            spawnCooldownRef.current = 1.5;
          } else if (gameTimeRef.current >= 45 && aliveEnemies < 6) {
            // After 45 seconds: spawn up to 6 enemies, even faster
            spawnEnemy();
            spawnCooldownRef.current = 1.2;
          } else if (gameTimeRef.current >= 50 && aliveEnemies < 7) {
            // After 50 seconds: spawn up to 7 enemies, very fast
            spawnEnemy();
            spawnCooldownRef.current = 1.0;
          }
        }
        
        // Update enemies
        enemiesRef.current.forEach(enemy => {
          if (!enemy.mesh) return;
          
          const sword = enemy.mesh.getObjectByName('sword') as THREE.Group;
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          if (!sword) return;
          
          // Sword glow based on attack phase
          const blade = sword.getObjectByName('blade') as THREE.Mesh;
          const edge = sword.getObjectByName('edge') as THREE.Mesh;
          if (blade && blade.material instanceof THREE.MeshPhongMaterial) {
            if (enemy.attackPhase === 'strike') {
              // RED GLOW when attacking/hitting - small but visible
              blade.material.emissive.setHex(0xFF2200);
              blade.material.emissiveIntensity = 0.6;
              if (edge && edge.material instanceof THREE.MeshBasicMaterial) {
                edge.material.color.setHex(0xFF4444);
                edge.material.opacity = 0.9;
              }
            } else if (enemy.attackPhase === 'windup') {
              // BLUE GLOW when about to attack - small warning
              blade.material.emissive.setHex(0x2244FF);
              blade.material.emissiveIntensity = 0.4;
              if (edge && edge.material instanceof THREE.MeshBasicMaterial) {
                edge.material.color.setHex(0x4488FF);
                edge.material.opacity = 0.7;
              }
            } else {
              // Default - subtle dark red
              blade.material.emissive.setHex(0x400000);
              blade.material.emissiveIntensity = 0.3;
              if (edge && edge.material instanceof THREE.MeshBasicMaterial) {
                edge.material.color.setHex(0xFF4444);
                edge.material.opacity = 0.6;
              }
            }
          }
          
          // Hit flash effect
          if (enemy.hitFlashTime > 0) {
            enemy.hitFlashTime -= deltaTime;
            if (body && body.material instanceof THREE.MeshPhongMaterial) {
              body.material.emissive.setHex(enemy.hitFlashTime > 0 ? 0xFFFFFF : 0x100000);
            }
          }
          
          switch (enemy.attackPhase) {
            case 'idle':
              enemy.nextAttackIn -= deltaTime;
              if (enemy.nextAttackIn <= 0) {
                enemy.attackPhase = 'windup';
                enemy.attackTimer = 0;
              }
              sword.rotation.z = Math.sin(time / 500) * 0.1;
              break;
              
            case 'windup':
              enemy.attackTimer += deltaTime * (1.5 + gameTimeRef.current * 0.01); // Speed up over time
              sword.rotation.z = -1.5 * Math.min(1, enemy.attackTimer);
              sword.rotation.x = 0.3 * Math.min(1, enemy.attackTimer);
              
              if (enemy.attackTimer >= 0.8) {
                enemy.attackPhase = 'strike';
                enemy.attackTimer = 0;
              }
              break;
              
            case 'strike':
              enemy.attackTimer += deltaTime * (3 + gameTimeRef.current * 0.02);
              sword.rotation.z = -1.5 + (2.5 * Math.min(1, enemy.attackTimer));
              sword.rotation.x = 0.3 - (0.5 * Math.min(1, enemy.attackTimer));
              
              // Check if strike completed (hit player)
              if (enemy.attackTimer >= 1) {
                // Check if dodging
                if (isDodgingRef.current) {
                  enemy.attackPhase = 'recovery';
                  enemy.attackTimer = 0;
                } else {
                  // Player takes damage!
                  heartsRef.current--;
                  setHearts(heartsRef.current);
                  comboRef.current = 0;
                  setCombo(0);
                  
                  setActionFeedback('miss');
                  setScreenFlash('red');
                  setTimeout(() => setScreenFlash('none'), 200);
                  setTimeout(() => setActionFeedback('none'), 500);
                  
                  // Show heart loss popup
                  addPopup(0, 50, 35, 'kill', `💔 -1 HEART! (${heartsRef.current} left)`);
                  
                  if (heartsRef.current <= 0) {
                    setEndReason('defeated');
                    endGameRef.current();
                    return;
                  }
                  
                  enemy.attackPhase = 'recovery';
                  enemy.attackTimer = 0;
                }
              }
              break;
              
            case 'stunned':
              enemy.attackTimer += deltaTime * 2;
              sword.rotation.z = 0.3 * Math.sin(time / 50); // Wobble
              
              if (enemy.attackTimer >= 0.5) {
                enemy.attackPhase = 'recovery';
                enemy.attackTimer = 0;
              }
              break;
              
            case 'recovery':
              enemy.attackTimer += deltaTime * 2;
              sword.rotation.z = 1.0 - (1.0 * Math.min(1, enemy.attackTimer));
              sword.rotation.x = -0.2 + (0.2 * Math.min(1, enemy.attackTimer));
              
              if (enemy.attackTimer >= 1) {
                enemy.attackPhase = 'idle';
                enemy.attackTimer = 0;
                const minDelay = Math.max(0.5, 1.5 - gameTimeRef.current * 0.015);
                const maxDelay = Math.max(1.0, 2.5 - gameTimeRef.current * 0.02);
                enemy.nextAttackIn = minDelay + seededRngRef.current.next() * (maxDelay - minDelay);
              }
              break;
              
            case 'dying':
              // Death animation
              enemy.mesh.position.y -= deltaTime * 2;
              enemy.mesh.rotation.x += deltaTime * 3;
              if (body && body.material instanceof THREE.MeshPhongMaterial) {
                body.material.opacity = Math.max(0, body.material.opacity - deltaTime * 2);
              }
              break;
          }
          
          // Enemy body sway
          if (enemy.attackPhase !== 'dying') {
            enemy.mesh.rotation.z = Math.sin(time / 800 + enemy.id) * 0.05;
          }
        });
      }
      
      // Player sword idle animation
      if (playerSwordRef.current && !isParryingRef.current && !isDodgingRef.current && !isStrikingRef.current) {
        playerSwordRef.current.rotation.z = Math.sin(time / 600) * 0.05;
      }
      
      // Animate snow particles (Christmas perfect parry effect)
      if (snowActiveRef.current && snowParticlesRef.current && snowParticlePositionsRef.current) {
        const positions = snowParticlePositionsRef.current;
        snowTimerRef.current += deltaTime;
        
        for (let i = 0; i < positions.length / 3; i++) {
          // Fall down gently
          positions[i * 3 + 1] -= deltaTime * 2; // Fall speed
          // Slight drift
          positions[i * 3] += Math.sin(time / 500 + i) * 0.003;
          
          // Reset if below ground
          if (positions[i * 3 + 1] < -1) {
            positions[i * 3 + 1] = 5 + Math.random() * 2;
          }
        }
        
        snowParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        
        // Fade out after 2 seconds
        if (snowTimerRef.current > 2) {
          const material = snowParticlesRef.current.material as THREE.PointsMaterial;
          material.opacity -= deltaTime * 0.5;
          
          if (material.opacity <= 0) {
            scene.remove(snowParticlesRef.current);
            snowParticlesRef.current = null;
            snowActiveRef.current = false;
          }
        }
      }
      
      // Animate pumpkin flames (Halloween theme)
      if (gameStateRef.current === 'playing') {
        enemiesRef.current.forEach(enemy => {
          if (!enemy.mesh) return;
          for (let i = 0; i < 5; i++) {
            const flame = enemy.mesh.getObjectByName(`flame${i}`) as THREE.Mesh;
            if (flame) {
              flame.position.y = 2.0 + Math.sin(time / 100 + i * 1.2) * 0.15;
              flame.scale.y = 0.8 + Math.sin(time / 80 + i) * 0.3;
              flame.rotation.z = Math.sin(time / 120 + i * 0.5) * 0.2;
            }
          }
        });
      }
      
      // Animate Tesla coil lightning bolts (Halloween theme)
      if (currentTheme === 'halloween' && teslaLightningRef.current.length > 0) {
        // Regenerate lightning paths every 100ms for crackling effect
        if (Math.floor(time / 100) % 2 === 0) {
          teslaLightningRef.current.forEach((lightning, idx) => {
            const points: THREE.Vector3[] = [];
            const startX = -12;
            const endX = 12;
            const baseY = 5.3;
            const segments = 12;
            
            for (let i = 0; i <= segments; i++) {
              const t = i / segments;
              const x = startX + (endX - startX) * t;
              // Add jagged random offsets for lightning effect
              const yOffset = (Math.random() - 0.5) * 1.8;
              const zOffset = (Math.random() - 0.5) * 0.6;
              const y = baseY + yOffset + Math.sin(t * Math.PI) * 0.5 * (idx - 1); // Slight arc
              const z = -12 + zOffset;
              points.push(new THREE.Vector3(x, y, z));
            }
            
            lightning.geometry.setFromPoints(points);
            lightning.geometry.attributes.position.needsUpdate = true;
            
            // Flicker opacity
            (lightning.material as THREE.LineBasicMaterial).opacity = 0.6 + Math.random() * 0.4;
          });
        }
      }
      
      renderer.render(scene, camera);
    };
    
    const endGame = () => {
      gameStateRef.current = 'complete';
      setGameState('complete');
      
      // Stop music
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
      
      const duration = (Date.now() - gameStartTimeRef.current) / 1000;
      const accuracy = totalParriesRef.current > 0 
        ? Math.round((perfectParriesRef.current / totalParriesRef.current) * 100)
        : 0;
      
      // Bonus points
      const survivalBonus = Math.floor(gameTimeRef.current * 5);
      const comboBonus = maxComboRef.current * 50;
      const heartBonus = heartsRef.current * 100;
      const killBonus = enemiesKilledRef.current * 150;
      const finalScore = scoreRef.current + survivalBonus + comboBonus + heartBonus + killBonus;
      
      scoreRef.current = finalScore;
      setScore(finalScore);
      
      logGameCompletion({
        gameType: 'parry_pro',
        gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: accuracy,
        durationSeconds: Math.round(duration),
        additionalData: {
          perfectParries: perfectParriesRef.current,
          totalParries: totalParriesRef.current,
          totalStrikes: totalStrikesRef.current,
          enemiesKilled: enemiesKilledRef.current,
          maxCombo: maxComboRef.current,
          survivalTime: Math.floor(gameTimeRef.current),
          rngSeed: rngSeedRef.current
        }
      }).catch(err => console.error('Audit log failed:', err));
      
      onGameCompleteRef.current({
        score: finalScore,
        accuracy: accuracy,
        avgReactionTime: totalParriesRef.current > 0 
          ? Math.round(duration * 1000 / totalParriesRef.current)
          : 0
      });
    };
    
    endGameRef.current = endGame;
    
    animate(0);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      initializedRef.current = false;
      // Stop music on cleanup
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    };
  }, [createSword, createEnemy, spawnEnemy, currentTheme]);
  
  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Parry: Space, P, or Up Arrow
      if (e.code === 'Space' || e.code === 'KeyP' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleParry();
      // Dodge: D, Shift, or Left Arrow
      } else if (e.code === 'KeyD' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowLeft') {
        e.preventDefault();
        handleDodge();
      // Strike: S, X, Enter, or Right Arrow
      } else if (e.code === 'KeyS' || e.code === 'KeyX' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleStrike();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleParry, handleDodge, handleStrike]);
  
  return (
    <div 
      className="fixed inset-0 w-full h-full bg-black overflow-hidden"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Screen flash effect */}
      {screenFlash !== 'none' && (
        <div 
          className="absolute inset-0 z-40 pointer-events-none"
          style={{ 
            backgroundColor: screenFlash === 'red' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.8)',
          }}
        />
      )}
      
      {/* Floating score popups */}
      {gameState === 'playing' && <FloatingScore popups={popups} onRemove={removePopup} />}
      
      {/* Game canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-2xl sm:text-3xl ${i < hearts ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                    ❤️
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-400">Enemies: {enemyCount}</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 text-3xl sm:text-4xl font-bold" style={{ textShadow: '0 0 10px rgba(255, 200, 0, 0.5)' }}>
                {score}
              </div>
              <div className={`text-sm font-bold ${timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                ⏱️ {timeRemaining}s
              </div>
            </div>
            <div className="text-right">
              {combo > 0 && (
                <div className="text-orange-400 text-xl sm:text-2xl font-bold animate-pulse">
                  {combo}x COMBO
                </div>
              )}
              <div className="text-xs text-gray-400">Kills: {enemiesKilledRef.current}</div>
            </div>
          </div>
          
          {/* Action feedback */}
          {actionFeedback !== 'none' && (
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
              <div className={`text-3xl sm:text-5xl font-black animate-bounce ${
                actionFeedback === 'perfect' ? 'text-yellow-400' :
                actionFeedback === 'good' ? 'text-green-400' :
                actionFeedback === 'dodge' ? 'text-cyan-400' :
                actionFeedback === 'strike' ? 'text-orange-400' :
                actionFeedback === 'kill' ? 'text-red-500' :
                'text-red-500'
              }`} style={{ textShadow: '0 0 20px currentColor' }}>
                {actionFeedback === 'perfect' ? '⚔️ PERFECT!' :
                 actionFeedback === 'good' ? '✓ PARRIED!' :
                 actionFeedback === 'dodge' ? '💨 DODGED!' :
                 actionFeedback === 'strike' ? '⚔️ HIT!' :
                 actionFeedback === 'kill' ? '💀 KILLED!' :
                 '💔 HIT!'}
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="flex justify-center gap-3 sm:gap-6">
              {/* Dodge button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDodge(); }}
                onTouchStart={(e) => { e.stopPropagation(); handleDodge(); }}
                disabled={isDodgingRef.current}
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 ${
                  isDodgingRef.current 
                    ? 'bg-gray-700 opacity-50' 
                    : 'bg-gradient-to-b from-cyan-500 to-cyan-700 shadow-lg shadow-cyan-500/50 hover:from-cyan-400 hover:to-cyan-600'
                }`}
              >
                <span className="text-3xl sm:text-4xl">💨</span>
                <span className="text-white font-bold text-xs sm:text-sm">DODGE</span>
                <span className="text-white/60 text-[10px] hidden sm:block">← / D / Shift</span>
              </button>
              
              {/* Parry button (center, larger) */}
              <button
                onClick={(e) => { e.stopPropagation(); handleParry(); }}
                onTouchStart={(e) => { e.stopPropagation(); handleParry(); }}
                disabled={isParryingRef.current}
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 ${
                  isParryingRef.current 
                    ? 'bg-gray-700 opacity-50' 
                    : 'bg-gradient-to-b from-amber-500 to-amber-700 shadow-lg shadow-amber-500/50 hover:from-amber-400 hover:to-amber-600 border-4 border-yellow-400'
                }`}
              >
                <span className="text-4xl sm:text-5xl">⚔️</span>
                <span className="text-white font-bold text-sm">PARRY</span>
                <span className="text-white/60 text-xs hidden sm:block">↑ / Space / P</span>
              </button>
              
              {/* Strike button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleStrike(); }}
                onTouchStart={(e) => { e.stopPropagation(); handleStrike(); }}
                disabled={isStrikingRef.current}
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 ${
                  isStrikingRef.current 
                    ? 'bg-gray-700 opacity-50' 
                    : 'bg-gradient-to-b from-red-500 to-red-700 shadow-lg shadow-red-500/50 hover:from-red-400 hover:to-red-600'
                }`}
              >
                <span className="text-3xl sm:text-4xl">🗡️</span>
                <span className="text-white font-bold text-xs sm:text-sm">STRIKE</span>
                <span className="text-white/60 text-[10px] hidden sm:block">→ / S / X</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-start z-30 p-4 overflow-y-auto py-8">
          {/* Mobile scroll indicator */}
          <div className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-full shadow-lg animate-bounce flex items-center gap-2 pointer-events-none">
            <span>👆</span>
            <span className="text-sm font-bold">Scroll for more</span>
            <span>👇</span>
          </div>
          
          <div className="text-center max-w-md w-full">
            <div className="text-6xl sm:text-7xl mb-4">⚔️</div>
            <h1 className="text-3xl sm:text-5xl font-bold text-red-500 mb-4" style={{ textShadow: '0 0 20px rgba(255, 0, 0, 0.5)' }}>
              PARRY PRO
            </h1>
            <p className="text-gray-400 mb-4">Master combat against multiple enemies!</p>
            
            {/* Preview of action buttons */}
            <div className="flex justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-700 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/50">
                <span className="text-2xl">💨</span>
                <span className="text-white font-bold text-[10px]">DODGE</span>
              </div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 flex flex-col items-center justify-center shadow-lg shadow-amber-500/50 border-2 border-yellow-400">
                <span className="text-3xl">⚔️</span>
                <span className="text-white font-bold text-xs">PARRY</span>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-red-500 to-red-700 flex flex-col items-center justify-center shadow-lg shadow-red-500/50">
                <span className="text-2xl">🗡️</span>
                <span className="text-white font-bold text-[10px]">STRIKE</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-4">↑ These buttons appear during gameplay!</p>
            
            <div className="bg-gray-900/80 rounded-xl p-4 mb-6 text-left border border-red-500/30 max-h-64 overflow-y-auto">
              <p className="text-red-400 font-bold mb-3">⚔️ CONTROLS:</p>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center bg-cyan-900/50 rounded-lg p-2">
                  <div className="text-2xl">💨</div>
                  <div className="text-cyan-400 text-xs font-bold">DODGE</div>
                  <div className="text-gray-400 text-[10px]">←/Shift</div>
                </div>
                <div className="text-center bg-amber-900/50 rounded-lg p-2 border border-yellow-500">
                  <div className="text-2xl">🛡️</div>
                  <div className="text-amber-400 text-xs font-bold">PARRY</div>
                  <div className="text-gray-400 text-[10px]">↑/Space</div>
                </div>
                <div className="text-center bg-red-900/50 rounded-lg p-2">
                  <div className="text-2xl">⚔️</div>
                  <div className="text-red-400 text-xs font-bold">STRIKE</div>
                  <div className="text-gray-400 text-[10px]">→/Enter</div>
                </div>
              </div>
              
              <p className="text-yellow-400 font-bold mb-2 text-center">💰 SCORING:</p>
              <div className="bg-black/40 rounded-lg p-2 mb-3">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="text-red-400">⚔️ Strike Hit</div>
                  <div className="text-green-400 text-right font-bold">+50</div>
                  <div className="text-cyan-400">🏃 Dodge</div>
                  <div className="text-green-400 text-right font-bold">+200</div>
                  <div className="text-purple-400">🛡️ Parry</div>
                  <div className="text-green-400 text-right font-bold">+500</div>
                  <div className="text-yellow-400">⚡ Perfect Parry</div>
                  <div className="text-green-400 text-right font-bold">+750</div>
                  <div className="text-orange-400">💀 Kill Enemy</div>
                  <div className="text-green-400 text-right font-bold">+50</div>
                </div>
              </div>
              
              <p className="text-gray-400 text-xs text-center">Perfect timing on parry = more points + combo bonus!</p>
              <p className="text-gray-400 text-xs text-center">Kill enemies for heart recovery!</p>
            </div>
            
            {/* Theme Selector */}
            <div className="mb-4 bg-black/30 rounded-xl p-3">
              <GameThemeSelector
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
                compact={true}
              />
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold text-2xl rounded-xl shadow-lg border-b-4 border-red-900 active:scale-95 transition-transform"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              ⚔️ FIGHT!
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full mt-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30 p-4">
          <div className={`text-center max-w-md w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl p-6 border-2 ${endReason === 'timeout' ? 'border-yellow-500/50' : 'border-red-500/50'}`}>
            <div className="text-5xl mb-2">{endReason === 'timeout' ? '⏱️' : '💀'}</div>
            <h1 className={`text-3xl font-bold mb-4 ${endReason === 'timeout' ? 'text-yellow-400' : 'text-red-500'}`}>
              {endReason === 'timeout' ? "TIME'S UP!" : 'DEFEATED'}
            </h1>
            
            <div className="bg-black/50 rounded-xl p-4 mb-4">
              <div className="text-4xl font-bold text-yellow-400 mb-2">{score}</div>
              <div className="text-gray-400">FINAL SCORE</div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <div className="text-gray-500">Survival Time</div>
                  <div className="text-white font-bold">{GAME_DURATION - timeRemaining}s</div>
                </div>
                <div>
                  <div className="text-gray-500">Enemies Killed</div>
                  <div className="text-red-400 font-bold">{enemiesKilledRef.current}</div>
                </div>
                <div>
                  <div className="text-gray-500">Max Combo</div>
                  <div className="text-orange-400 font-bold">{maxComboRef.current}x</div>
                </div>
                <div>
                  <div className="text-gray-500">Perfect Parries</div>
                  <div className="text-yellow-400 font-bold">{perfectParriesRef.current}</div>
                </div>
              </div>
            </div>
            
            {/* No retry button - users watch ads to play again */}
            <p className="text-gray-500 text-sm mb-4">
              Play again from the Games menu
            </p>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full px-6 py-4 bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold text-lg rounded-xl border-b-4 border-purple-900 active:scale-95 transition-transform"
              >
                ← Back to Games
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
