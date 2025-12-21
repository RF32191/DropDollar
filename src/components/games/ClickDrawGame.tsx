'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';

interface ClickDrawGameProps {
  onGameComplete: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
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
const MAX_BULLETS = 6;

interface Outlaw {
  id: number;
  side: 'left' | 'right' | 'center' | 'far-left' | 'far-right';
  phase: 'idle' | 'windup' | 'drawing' | 'recovery' | 'stunned' | 'dying';
  attackTimer: number;
  gunAngle: number;
  mesh: THREE.Group | null;
  nextAttackIn: number;
  health: number; // 3 hits to kill normally
  hitFlashTime: number;
}

interface Bullet {
  id: number;
  mesh: THREE.Mesh;
  targetOutlaw: Outlaw;
  progress: number; // 0 to 1
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
}

export default function ClickDrawGame({ onGameComplete, onExit, gameMode = 'practice', rngSeed }: ClickDrawGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerGunRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const initializedRef = useRef(false);
  
  // Music ref
  const musicRef = useRef<HTMLAudioElement | null>(null);
  
  // Game state refs
  const outlawsRef = useRef<Outlaw[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const scoreRef = useRef<number>(0);
  const heartsRef = useRef<number>(3);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const perfectDrawsRef = useRef<number>(0);
  const totalDrawsRef = useRef<number>(0);
  const totalShotsRef = useRef<number>(0);
  const outlawsKilledRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const isDrawingRef = useRef<boolean>(false);
  const isDodgingRef = useRef<boolean>(false);
  const totalDodgesRef = useRef<number>(0);
  const drawWindowRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'playing' | 'complete'>('ready');
  const gameStartTimeRef = useRef<number>(0);
  const nextOutlawIdRef = useRef<number>(1);
  const spawnCooldownRef = useRef<number>(0);
  const endGameRef = useRef<() => void>(() => {});
  const bulletsRemainingRef = useRef<number>(MAX_BULLETS);
  const nextBulletIdRef = useRef<number>(1);
  
  // Callbacks ref
  const onGameCompleteRef = useRef(onGameComplete);
  const gameModeRef = useRef(gameMode);
  const rngSeedRef = useRef(rngSeed);
  
  // Floating scores - CoD style popups
  const { popups, addPopup: addScorePopup, removePopup } = useFloatingScores();
  
  // State
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [endReason, setEndReason] = useState<'timeout' | 'dead' | null>(null);
  const [bullets, setBullets] = useState(MAX_BULLETS);
  
  useEffect(() => {
    onGameCompleteRef.current = onGameComplete;
    gameModeRef.current = gameMode;
    rngSeedRef.current = rngSeed;
  }, [onGameComplete, gameMode, rngSeed]);
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('🤠 [ClickDraw] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const seededRngRef = useRef(seededRng);
  useEffect(() => {
    seededRngRef.current = seededRng;
  }, [seededRng]);
  
  // Get outlaw position based on side
  const getOutlawPosition = useCallback((side: Outlaw['side']): { x: number; z: number } => {
    switch (side) {
      case 'far-left': return { x: -5, z: -5 };
      case 'left': return { x: -3, z: -4 };
      case 'center': return { x: 0, z: -5 };
      case 'right': return { x: 3, z: -4 };
      case 'far-right': return { x: 5, z: -5 };
      default: return { x: 0, z: -4 };
    }
  }, []);
  
  // Create revolver gun
  const createGun = useCallback((isEnemy: boolean = false) => {
    const group = new THREE.Group();
    
    // Gun barrel
    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 12);
    const barrelMat = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x333333 : 0x444444,
      metalness: 0.9,
      shininess: 100,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.4;
    barrel.name = 'barrel';
    group.add(barrel);
    
    // Cylinder (revolver chamber)
    const cylinderGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 12);
    const cylinderMat = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x222222 : 0x555555,
      metalness: 0.9,
    });
    const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    cylinder.rotation.x = Math.PI / 2;
    cylinder.position.z = 0.1;
    group.add(cylinder);
    
    // Handle
    const handleGeo = new THREE.BoxGeometry(0.08, 0.25, 0.12);
    const handleMat = new THREE.MeshPhongMaterial({
      color: 0x8B4513, // Brown wood
      emissive: 0x3A1A05,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.15;
    handle.rotation.x = -0.3;
    group.add(handle);
    
    // Trigger guard
    const guardGeo = new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI);
    const guardMat = new THREE.MeshPhongMaterial({ color: 0x333333, metalness: 0.9 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0, -0.05, 0.05);
    guard.rotation.x = Math.PI / 2;
    group.add(guard);
    
    return group;
  }, []);
  
  // Create cowboy outlaw
  const createOutlaw = useCallback((side: Outlaw['side']) => {
    const group = new THREE.Group();
    
    // Body (western clothing)
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x4a3728, // Brown leather
      emissive: 0x1a1008,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.name = 'body';
    group.add(body);
    
    // Vest
    const vestGeo = new THREE.BoxGeometry(0.7, 0.8, 0.4);
    const vestMat = new THREE.MeshPhongMaterial({
      color: 0x2a2a2a, // Dark vest
      emissive: 0x0a0a0a,
    });
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.y = 0.7;
    group.add(vest);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshPhongMaterial({
      color: 0xd4a574, // Skin tone
      emissive: 0x3a2a1a,
      emissiveIntensity: 0.2,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.name = 'head';
    group.add(head);
    
    // COWBOY HAT
    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.06, 24);
    const hatMat = new THREE.MeshPhongMaterial({
      color: 0x3d2817, // Brown hat
      emissive: 0x1a0a05,
      shininess: 30,
    });
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 1.75;
    group.add(brim);
    
    // Hat crown (curved top)
    const crownGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.3, 16);
    const crown = new THREE.Mesh(crownGeo, hatMat);
    crown.position.y = 1.9;
    group.add(crown);
    
    // Hat top indent
    const indentGeo = new THREE.BoxGeometry(0.35, 0.05, 0.15);
    const indent = new THREE.Mesh(indentGeo, hatMat);
    indent.position.y = 2.05;
    group.add(indent);
    
    // Hat band
    const bandGeo = new THREE.TorusGeometry(0.24, 0.02, 8, 24);
    const bandMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 }); // Red band
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 1.78;
    band.rotation.x = Math.PI / 2;
    group.add(band);
    
    // Bandana/scarf
    const scarfGeo = new THREE.BoxGeometry(0.5, 0.15, 0.3);
    const scarfMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 }); // Red bandana
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.position.y = 1.2;
    scarf.position.z = 0.1;
    group.add(scarf);
    
    // Eyes (menacing)
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 1.55, 0.2);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 1.55, 0.2);
    group.add(rightEye);
    
    // Mustache
    const stacheGeo = new THREE.BoxGeometry(0.2, 0.04, 0.05);
    const stacheMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
    const stache = new THREE.Mesh(stacheGeo, stacheMat);
    stache.position.set(0, 1.42, 0.22);
    group.add(stache);
    
    // Gun in holster (will be raised when attacking)
    const gun = createGun(true);
    gun.position.set(0.5, 0.3, 0);
    gun.rotation.z = -Math.PI / 4;
    gun.name = 'gun';
    group.add(gun);
    
    // Position based on side
    const pos = getOutlawPosition(side);
    group.position.set(pos.x, 0, pos.z);
    group.lookAt(0, 1, 5);
    
    return group;
  }, [createGun, getOutlawPosition]);
  
  // Spawn new outlaw
  const spawnOutlaw = useCallback(() => {
    if (!sceneRef.current) return;
    
    const rng = seededRngRef.current;
    const sides: Outlaw['side'][] = ['left', 'right', 'center', 'far-left', 'far-right'];
    
    // Filter out sides with existing outlaws
    const occupiedSides = outlawsRef.current.filter(o => o.phase !== 'dying').map(o => o.side);
    const availableSides = sides.filter(s => !occupiedSides.includes(s));
    
    if (availableSides.length === 0) return;
    
    const side = availableSides[Math.floor(rng.next() * availableSides.length)];
    const mesh = createOutlaw(side);
    sceneRef.current.add(mesh);
    
    const outlaw: Outlaw = {
      id: nextOutlawIdRef.current++,
      side,
      phase: 'idle',
      attackTimer: 0,
      gunAngle: 0,
      mesh,
      nextAttackIn: 1.5 + rng.next() * 2,
      health: 3,
      hitFlashTime: 0,
    };
    
    outlawsRef.current.push(outlaw);
  }, [createOutlaw]);
  
  // Add popup score - wrapper for CoD style floating scores
  const addPopup = useCallback((points: number, x: number, y: number, type: 'perfect' | 'bonus' | 'kill' | 'critical' | 'normal' | 'combo', label?: string) => {
    addScorePopup(points, x, y, type as 'normal' | 'bonus' | 'perfect' | 'combo' | 'critical', label);
  }, [addScorePopup]);
  
  // Create bullet animation - must be defined before handleDraw
  const createBulletAnimation = useCallback((targetOutlaw: Outlaw) => {
    if (!sceneRef.current || !playerGunRef.current) return;
    
    const bulletGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ 
      color: 0xffcc00,
    });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    
    // Start from player gun
    const startPos = new THREE.Vector3(0, 0.8, 3);
    
    // End at outlaw
    const outlawPos = getOutlawPosition(targetOutlaw.side);
    const endPos = new THREE.Vector3(outlawPos.x, 1.2, outlawPos.z);
    
    bulletMesh.position.copy(startPos);
    sceneRef.current.add(bulletMesh);
    
    const bullet: Bullet = {
      id: nextBulletIdRef.current++,
      mesh: bulletMesh,
      targetOutlaw,
      progress: 0,
      startPos,
      endPos,
    };
    
    bulletsRef.current.push(bullet);
  }, [getOutlawPosition]);
  
  // Handle DRAW action
  const handleDraw = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isDrawingRef.current) return;
    if (bulletsRemainingRef.current <= 0) return;
    
    isDrawingRef.current = true;
    drawWindowRef.current = 0.3; // 300ms draw window
    lastActionTimeRef.current = gameTimeRef.current;
    
    // Find an enemy in the "drawing" phase (about to shoot)
    const drawingOutlaw = outlawsRef.current.find(o => o.phase === 'drawing' && o.health > 0);
    
    if (drawingOutlaw) {
      totalDrawsRef.current++;
      totalShotsRef.current++;
      bulletsRemainingRef.current--;
      setBullets(bulletsRemainingRef.current);
      
      // Check timing for perfect draw
      const isPerfect = drawingOutlaw.attackTimer < 0.15;
      
      if (isPerfect) {
        // PERFECT DRAW - one-shot kill!
        perfectDrawsRef.current++;
        comboRef.current++;
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        
        const points = 750 + (comboRef.current * 50);
        scoreRef.current += points;
        setScore(scoreRef.current);
        addPopup(points, 50, 30, 'perfect', `⚡ PERFECT DRAW! +${points}`);
        
        // Instant kill
        drawingOutlaw.phase = 'dying';
        drawingOutlaw.health = 0;
        outlawsKilledRef.current++;
        
        // Give heart back for perfect draw (max 3)
        if (heartsRef.current < 3) {
          heartsRef.current++;
          setHearts(heartsRef.current);
          addPopup(0, 50, 45, 'bonus', '❤️ +1 HEART!');
        }
        
        // Create bullet animation
        createBulletAnimation(drawingOutlaw);
        
      } else {
        // Normal DRAW - one-shot kill but less points
        comboRef.current++;
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        
        const points = 500;
        scoreRef.current += points;
        setScore(scoreRef.current);
        addPopup(points, 50, 30, 'bonus', `🔫 DRAW! +${points}`);
        
        drawingOutlaw.phase = 'dying';
        drawingOutlaw.health = 0;
        outlawsKilledRef.current++;
        
        createBulletAnimation(drawingOutlaw);
      }
    } else {
      // Missed draw timing - shoot at random enemy
      const targetOutlaw = outlawsRef.current.find(o => o.phase !== 'dying' && o.health > 0);
      if (targetOutlaw) {
        totalShotsRef.current++;
        bulletsRemainingRef.current--;
        setBullets(bulletsRemainingRef.current);
        
        targetOutlaw.health--;
        targetOutlaw.hitFlashTime = 0.2;
        targetOutlaw.phase = 'stunned';
        targetOutlaw.attackTimer = 0;
        
        const points = 50;
        scoreRef.current += points;
        setScore(scoreRef.current);
        addPopup(points, 50, 35, 'kill', `💥 HIT! +${points}`);
        
        createBulletAnimation(targetOutlaw);
        
        if (targetOutlaw.health <= 0) {
          targetOutlaw.phase = 'dying';
          outlawsKilledRef.current++;
          const killPoints = 50;
          scoreRef.current += killPoints;
          setScore(scoreRef.current);
          addPopup(killPoints, 50, 40, 'kill', `☠️ KILLED! +${killPoints}`);
        }
      }
    }
    
    setTimeout(() => {
      isDrawingRef.current = false;
    }, 100);
  }, [addPopup, createBulletAnimation]);
  
  // Handle SHOOT action (regular shot without draw timing)
  const handleShoot = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (bulletsRemainingRef.current <= 0) return;
    
    // Find closest non-dying enemy
    const targetOutlaw = outlawsRef.current.find(o => o.phase !== 'dying' && o.health > 0);
    if (!targetOutlaw) return;
    
    totalShotsRef.current++;
    bulletsRemainingRef.current--;
    setBullets(bulletsRemainingRef.current);
    
    targetOutlaw.health--;
    targetOutlaw.hitFlashTime = 0.2;
    
    if (targetOutlaw.phase !== 'drawing') {
      targetOutlaw.phase = 'stunned';
      targetOutlaw.attackTimer = 0;
    }
    
    const points = 50;
    scoreRef.current += points;
    setScore(scoreRef.current);
    addPopup(points, 50, 35, 'kill', `💥 SHOT! +${points}`);
    
    createBulletAnimation(targetOutlaw);
    
    if (targetOutlaw.health <= 0) {
      targetOutlaw.phase = 'dying';
      outlawsKilledRef.current++;
      const killPoints = 50;
      scoreRef.current += killPoints;
      setScore(scoreRef.current);
      addPopup(killPoints, 50, 40, 'kill', `☠️ KILLED! +${killPoints}`);
      
      // Heart for kills (max 3)
      if (heartsRef.current < 3) {
        heartsRef.current++;
        setHearts(heartsRef.current);
      }
    }
  }, [addPopup, createBulletAnimation]);
  
  // Handle RELOAD
  const handleReload = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    bulletsRemainingRef.current = MAX_BULLETS;
    setBullets(MAX_BULLETS);
    addPopup(0, 50, 25, 'bonus', '🔄 RELOADED!');
  }, [addPopup]);
  
  // Handle DODGE action - dodge incoming attacks
  const handleDodge = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isDodgingRef.current) return;
    
    isDodgingRef.current = true;
    
    // Check if any outlaw is currently attacking (in drawing phase)
    const attackingOutlaws = outlawsRef.current.filter(o => o.phase === 'drawing');
    
    if (attackingOutlaws.length > 0) {
      // Successfully dodged attacks!
      totalDodgesRef.current++;
      const dodgePoints = 200 * attackingOutlaws.length;
      scoreRef.current += dodgePoints;
      setScore(scoreRef.current);
      addPopup(dodgePoints, 50, 35, 'bonus', `🏃 DODGE! +${dodgePoints}`);
      
      // Reset attacking outlaws
      attackingOutlaws.forEach(outlaw => {
        outlaw.phase = 'recovery';
        outlaw.attackTimer = 0;
      });
      
      comboRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      setCombo(comboRef.current);
    } else {
      // Dodged when no attack - small penalty
      addPopup(0, 50, 35, 'kill', '🏃 DODGE (no attack)');
    }
    
    // Dodge cooldown
    setTimeout(() => {
      isDodgingRef.current = false;
    }, 300);
  }, [addPopup]);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // If scene exists, dispose it first (for theme changes)
    if (sceneRef.current && rendererRef.current) {
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      playerGunRef.current = null;
      outlawsRef.current = [];
      initializedRef.current = false;
    }
    
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene - Western desert theme
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd4a574); // Dusty desert
    scene.fog = new THREE.Fog(0xc4a070, 10, 40);
    sceneRef.current = scene;
    
    // Camera - zoom out more for mobile
    const isMobileDevice = window.innerWidth < 768;
    const fov = isMobileDevice ? 90 : 60;
    const camZ = isMobileDevice ? 12 : 5;
    const camY = isMobileDevice ? 4 : 2;
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
    
    // Lighting - Western sunset
    const ambientLight = new THREE.AmbientLight(0xffa366, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xff8844, 1.5);
    sunLight.position.set(5, 10, 5);
    sunLight.castShadow = true;
    scene.add(sunLight);
    
    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);
    
    // Desert ground
    const groundGeo = new THREE.CircleGeometry(20, 32);
    const groundMat = new THREE.MeshPhongMaterial({
      color: 0xc4a060,
      emissive: 0x3a2a10,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Western town buildings silhouette (background)
    const buildingMat = new THREE.MeshPhongMaterial({
      color: 0x4a3020,
      emissive: 0x1a0a00,
    });
    
    // Saloon
    const saloonGeo = new THREE.BoxGeometry(4, 4, 2);
    const saloon = new THREE.Mesh(saloonGeo, buildingMat);
    saloon.position.set(-6, 2, -12);
    scene.add(saloon);
    
    // Saloon sign
    const signGeo = new THREE.BoxGeometry(3, 0.8, 0.1);
    const signMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-6, 4.5, -11);
    scene.add(sign);
    
    // Bank
    const bankGeo = new THREE.BoxGeometry(3, 3.5, 2);
    const bank = new THREE.Mesh(bankGeo, buildingMat);
    bank.position.set(6, 1.75, -12);
    scene.add(bank);
    
    // Water tower
    const towerBaseGeo = new THREE.CylinderGeometry(0.2, 0.3, 4, 8);
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(towerBaseGeo, buildingMat);
      const angle = (i / 4) * Math.PI * 2;
      leg.position.set(Math.cos(angle) * 0.8, 2, -10 + Math.sin(angle) * 0.8);
      scene.add(leg);
    }
    const tankGeo = new THREE.CylinderGeometry(1.2, 1, 1.5, 12);
    const tank = new THREE.Mesh(tankGeo, buildingMat);
    tank.position.set(0, 4.5, -10);
    scene.add(tank);
    
    // Cacti
    const cactusMat = new THREE.MeshPhongMaterial({ color: 0x228B22, emissive: 0x0a3a0a });
    for (let i = 0; i < 5; i++) {
      const cactusGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5 + Math.random(), 8);
      const cactus = new THREE.Mesh(cactusGeo, cactusMat);
      cactus.position.set(-8 + i * 4, 0.75, -8 + (Math.random() - 0.5) * 3);
      scene.add(cactus);
      
      // Arms
      const armGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8);
      const arm = new THREE.Mesh(armGeo, cactusMat);
      arm.position.set(0.2, 0.3, 0);
      arm.rotation.z = -Math.PI / 4;
      cactus.add(arm);
    }
    
    // Tumbleweed (static decoration)
    const tweedGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const tweedMat = new THREE.MeshPhongMaterial({ color: 0x8B7355, wireframe: true });
    const tweed = new THREE.Mesh(tweedGeo, tweedMat);
    tweed.position.set(4, 0.4, -3);
    scene.add(tweed);
    
    // Player gun (always visible at bottom)
    const playerGun = createGun(false);
    playerGun.position.set(0, 0.5, 3);
    playerGun.rotation.x = -0.3;
    playerGun.scale.set(2, 2, 2);
    scene.add(playerGun);
    playerGunRef.current = playerGun;
    
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
        
        // Spawn outlaws
        spawnCooldownRef.current -= deltaTime;
        
        const aliveOutlaws = outlawsRef.current.filter(o => o.phase !== 'dying').length;
        
        if (spawnCooldownRef.current <= 0) {
          if (gameTimeRef.current >= 2 && aliveOutlaws < 2) {
            spawnOutlaw();
            spawnCooldownRef.current = 2;
          } else if (gameTimeRef.current >= 15 && aliveOutlaws < 3) {
            spawnOutlaw();
            spawnCooldownRef.current = 2.5;
          } else if (gameTimeRef.current >= 30 && aliveOutlaws < 4) {
            spawnOutlaw();
            spawnCooldownRef.current = 1.5;
          } else if (gameTimeRef.current >= 45 && aliveOutlaws < 5) {
            spawnOutlaw();
            spawnCooldownRef.current = 1.2;
          }
        }
        
        // Update outlaws
        outlawsRef.current.forEach(outlaw => {
          if (outlaw.phase === 'dying') {
            // Fade out and remove
            if (outlaw.mesh) {
              outlaw.mesh.position.y -= deltaTime * 2;
              outlaw.mesh.traverse(child => {
                if (child instanceof THREE.Mesh && child.material) {
                  const mat = child.material as THREE.MeshPhongMaterial;
                  if (mat.opacity !== undefined) {
                    mat.transparent = true;
                    mat.opacity = Math.max(0, (mat.opacity ?? 1) - deltaTime * 2);
                  }
                }
              });
              
              if (outlaw.mesh.position.y < -2) {
                scene.remove(outlaw.mesh);
                outlaw.mesh = null;
              }
            }
            return;
          }
          
          // Hit flash
          if (outlaw.hitFlashTime > 0) {
            outlaw.hitFlashTime -= deltaTime;
            if (outlaw.mesh) {
              const body = outlaw.mesh.getObjectByName('body') as THREE.Mesh;
              if (body?.material) {
                (body.material as THREE.MeshPhongMaterial).emissive.setHex(
                  outlaw.hitFlashTime > 0 ? 0xff0000 : 0x1a1008
                );
              }
            }
          }
          
          // Stunned recovery
          if (outlaw.phase === 'stunned') {
            outlaw.attackTimer += deltaTime;
            if (outlaw.attackTimer > 0.5) {
              outlaw.phase = 'idle';
              outlaw.nextAttackIn = 1 + seededRngRef.current.next();
            }
            return;
          }
          
          // Attack pattern
          if (outlaw.phase === 'idle') {
            outlaw.nextAttackIn -= deltaTime;
            if (outlaw.nextAttackIn <= 0) {
              outlaw.phase = 'windup';
              outlaw.attackTimer = 0;
            }
          } else if (outlaw.phase === 'windup') {
            outlaw.attackTimer += deltaTime;
            
            // Raise gun - BLUE glow when winding up
            if (outlaw.mesh) {
              const gun = outlaw.mesh.getObjectByName('gun') as THREE.Group;
              if (gun) {
                const progress = Math.min(outlaw.attackTimer / 0.8, 1);
                gun.rotation.z = -Math.PI / 4 + progress * (Math.PI / 2);
                gun.position.y = 0.3 + progress * 0.5;
                
                // Blue glow on barrel
                const barrel = gun.getObjectByName('barrel') as THREE.Mesh;
                if (barrel?.material) {
                  (barrel.material as THREE.MeshPhongMaterial).emissive.setHex(0x0044ff);
                  (barrel.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
                }
              }
            }
            
            if (outlaw.attackTimer >= 0.8) {
              outlaw.phase = 'drawing';
              outlaw.attackTimer = 0;
            }
          } else if (outlaw.phase === 'drawing') {
            outlaw.attackTimer += deltaTime;
            
            // RED glow when drawing (about to shoot)
            if (outlaw.mesh) {
              const gun = outlaw.mesh.getObjectByName('gun') as THREE.Group;
              if (gun) {
                const barrel = gun.getObjectByName('barrel') as THREE.Mesh;
                if (barrel?.material) {
                  (barrel.material as THREE.MeshPhongMaterial).emissive.setHex(0xff0000);
                  (barrel.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.0 + Math.sin(time / 50) * 0.3;
                }
              }
            }
            
            // Outlaw shoots!
            if (outlaw.attackTimer >= 0.4) {
              // Player gets hit
              heartsRef.current--;
              setHearts(heartsRef.current);
              comboRef.current = 0;
              setCombo(0);
              addPopup(-100, 50, 50, 'kill', '💔 HIT! -100');
              scoreRef.current -= 100;
              setScore(Math.max(0, scoreRef.current));
              
              if (heartsRef.current <= 0) {
                setEndReason('dead');
                endGameRef.current();
                return;
              }
              
              outlaw.phase = 'recovery';
              outlaw.attackTimer = 0;
            }
          } else if (outlaw.phase === 'recovery') {
            outlaw.attackTimer += deltaTime;
            
            // Lower gun
            if (outlaw.mesh) {
              const gun = outlaw.mesh.getObjectByName('gun') as THREE.Group;
              if (gun) {
                const progress = Math.min(outlaw.attackTimer / 0.5, 1);
                gun.rotation.z = Math.PI / 4 - progress * (Math.PI / 2);
                gun.position.y = 0.8 - progress * 0.5;
                
                // Remove glow
                const barrel = gun.getObjectByName('barrel') as THREE.Mesh;
                if (barrel?.material) {
                  (barrel.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
                  (barrel.material as THREE.MeshPhongMaterial).emissiveIntensity = 0;
                }
              }
            }
            
            if (outlaw.attackTimer >= 0.5) {
              outlaw.phase = 'idle';
              outlaw.nextAttackIn = 1.5 + seededRngRef.current.next() * 1.5;
            }
          }
        });
        
        // Update bullets
        bulletsRef.current.forEach((bullet, index) => {
          bullet.progress += deltaTime * 8; // Fast bullet
          
          if (bullet.progress >= 1) {
            // Bullet hit
            scene.remove(bullet.mesh);
            bulletsRef.current.splice(index, 1);
          } else {
            // Interpolate position
            bullet.mesh.position.lerpVectors(bullet.startPos, bullet.endPos, bullet.progress);
            
            // Trail effect
            bullet.mesh.scale.setScalar(1 + Math.sin(bullet.progress * Math.PI) * 0.5);
          }
        });
        
        // Remove dead outlaws from array
        outlawsRef.current = outlawsRef.current.filter(o => o.mesh !== null || o.phase !== 'dying');
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
      
      const finalScore = scoreRef.current;
      const accuracy = totalShotsRef.current > 0 
        ? Math.round((outlawsKilledRef.current / totalShotsRef.current) * 100) 
        : 0;
      
      try {
        logGameCompletion({
          gameType: GAME_TYPES.CLICK_DRAW || 'click_draw',
          gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
          score: finalScore,
          accuracy,
          gameData: {
            perfectDraws: perfectDrawsRef.current,
            totalDraws: totalDrawsRef.current,
            totalDodges: totalDodgesRef.current,
            totalShots: totalShotsRef.current,
            outlawsKilled: outlawsKilledRef.current,
            maxCombo: maxComboRef.current,
            rngSeed: rngSeedRef.current,
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
      
      onGameCompleteRef.current({
        score: finalScore,
        accuracy,
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
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    };
  }, [createGun, createOutlaw, spawnOutlaw, addPopup, getOutlawPosition]);
  
  // Keyboard handler
  // Arrow keys: Left=Dodge, Up=Draw, Right=Shoot, Down=Reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleDraw();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyR') {
        e.preventDefault();
        handleReload();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyS') {
        e.preventDefault();
        handleShoot();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyD') {
        e.preventDefault();
        handleDodge();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDraw, handleReload, handleShoot, handleDodge]);
  
  // Start game
  const startGame = useCallback(() => {
    gameStateRef.current = 'playing';
    setGameState('playing');
    gameTimeRef.current = 0;
    gameStartTimeRef.current = Date.now();
    scoreRef.current = 0;
    setScore(0);
    heartsRef.current = 3;
    setHearts(3);
    comboRef.current = 0;
    setCombo(0);
    bulletsRemainingRef.current = MAX_BULLETS;
    setBullets(MAX_BULLETS);
    perfectDrawsRef.current = 0;
    totalDrawsRef.current = 0;
    totalShotsRef.current = 0;
    totalDodgesRef.current = 0;
    outlawsKilledRef.current = 0;
    maxComboRef.current = 0;
    setEndReason(null);
    
    // Spawn initial outlaw after a delay
    setTimeout(() => {
      spawnOutlaw();
    }, 1500);
  }, [spawnOutlaw]);
  
  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-b from-amber-900 via-orange-800 to-yellow-700 overflow-hidden">
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      />
      
      {/* Floating Scores - CoD style */}
      <FloatingScore popups={popups} onRemove={removePopup} />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 pointer-events-none">
            {/* Hearts */}
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-2xl">
                  {i < hearts ? '❤️' : '🖤'}
                </div>
              ))}
            </div>
            
            {/* Score & Timer */}
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 drop-shadow-lg">
                {score.toLocaleString()}
              </div>
              <div className="text-xl font-bold text-white drop-shadow">
                ⏱️ {timeRemaining}s
              </div>
            </div>
            
            {/* Combo */}
            <div className="text-right">
              {combo > 0 && (
                <div className="text-2xl font-bold text-orange-400 animate-pulse">
                  🔥 {combo}x
                </div>
              )}
            </div>
          </div>
          
          {/* Bullets Display */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
            {[...Array(MAX_BULLETS)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-8 rounded-t-full ${
                  i < bullets 
                    ? 'bg-gradient-to-b from-yellow-400 to-amber-600 border-2 border-yellow-300' 
                    : 'bg-gray-600 border-2 border-gray-500'
                }`}
                style={{
                  boxShadow: i < bullets ? '0 0 8px rgba(255, 200, 0, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
          
          {/* Control Buttons - Mobile Optimized */}
          <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 z-10 px-2">
            {/* Top row - DRAW (main action) */}
            <div className="flex justify-center mb-2">
              <button
                onClick={handleDraw}
                className="px-10 sm:px-12 py-4 sm:py-5 bg-gradient-to-b from-red-600 to-red-800 text-white font-bold text-xl sm:text-2xl rounded-xl border-4 border-red-400 shadow-lg active:scale-95 transition-transform animate-pulse"
                style={{ boxShadow: '0 4px 0 #8B0000, 0 6px 10px rgba(0,0,0,0.3)' }}
              >
                ⚡ DRAW! (↑)
              </button>
            </div>
            
            {/* Bottom row - DODGE, SHOOT, RELOAD */}
            <div className="flex justify-center gap-2 sm:gap-3">
              <button
                onClick={handleDodge}
                className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-blue-500 to-blue-700 text-white font-bold text-sm sm:text-lg rounded-lg border-3 border-blue-400 shadow-lg active:scale-95 transition-transform"
                style={{ boxShadow: '0 3px 0 #1e40af, 0 5px 8px rgba(0,0,0,0.3)' }}
              >
                🏃 DODGE
                <span className="block text-xs opacity-75">(←)</span>
              </button>
              
              <button
                onClick={handleShoot}
                className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-gray-600 to-gray-800 text-white font-bold text-sm sm:text-lg rounded-lg border-3 border-gray-500 shadow-lg active:scale-95 transition-transform"
                style={{ boxShadow: '0 3px 0 #333, 0 5px 8px rgba(0,0,0,0.3)' }}
              >
                🔫 SHOOT
                <span className="block text-xs opacity-75">(→)</span>
              </button>
              
              <button
                onClick={handleReload}
                disabled={bullets === MAX_BULLETS}
                className={`px-3 sm:px-5 py-3 sm:py-4 font-bold text-sm sm:text-lg rounded-lg border-3 shadow-lg transition-transform ${
                  bullets === MAX_BULLETS
                    ? 'bg-gray-500 text-gray-300 border-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-b from-amber-500 to-amber-700 text-white border-amber-400 active:scale-95'
                }`}
                style={{ boxShadow: bullets < MAX_BULLETS ? '0 3px 0 #8B4513, 0 5px 8px rgba(0,0,0,0.3)' : 'none' }}
              >
                🔄 RELOAD
                <span className="block text-xs opacity-75">(↓)</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
          <div className="text-center p-6 max-w-md">
            <h1 className="text-5xl font-bold text-yellow-400 mb-4 drop-shadow-lg">
              🤠 CLICK DRAW
            </h1>
            <p className="text-amber-200 mb-6 text-lg">
              A Western Quick Draw Showdown!
            </p>
            
            <div className="bg-amber-900/80 rounded-xl p-4 mb-6 text-left border-2 border-amber-600">
              <h3 className="text-yellow-300 font-bold mb-2 text-center">🎯 HOW TO PLAY</h3>
              <ul className="text-amber-100 text-sm space-y-2">
                <li>⚡ <strong>DRAW</strong> when enemy gun glows <span className="text-red-400 font-bold">RED</span> for one-shot kill!</li>
                <li>🎯 <strong>Perfect Draw</strong> = 750+ points + combo bonus!</li>
                <li>🏃 <strong>DODGE</strong> to avoid attacks = 200 points per attack!</li>
                <li>🔫 <strong>SHOOT</strong> anytime = 50 points (3 hits to kill)</li>
                <li>🔄 <strong>RELOAD</strong> when out of bullets (6 max)</li>
                <li>💙 Gun glows <span className="text-blue-400 font-bold">BLUE</span> = Enemy is preparing</li>
              </ul>
              
              <div className="mt-3 pt-3 border-t border-amber-600">
                <p className="text-yellow-200 text-xs text-center">
                  ⌨️ ↑/Space = Draw | ← = Dodge | → = Shoot | ↓ = Reload
                </p>
              </div>
            </div>
            
            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-b from-yellow-500 to-amber-600 text-amber-900 font-bold text-2xl rounded-xl border-4 border-yellow-400 shadow-xl hover:from-yellow-400 hover:to-amber-500 transition-all active:scale-95"
              style={{ boxShadow: '0 6px 0 #8B4513, 0 8px 15px rgba(0,0,0,0.4)' }}
            >
              🤠 DRAW!
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <div className="text-center p-6 max-w-md bg-amber-900/90 rounded-2xl border-4 border-amber-600">
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">
              {endReason === 'timeout' ? '⏱️ TIME\'S UP!' : '💀 GAME OVER'}
            </h2>
            
            <div className="text-6xl font-bold text-white my-4">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-amber-200 mb-6 text-center">
              <div>
                <div className="text-xl sm:text-2xl">⚡ {perfectDrawsRef.current}</div>
                <div className="text-xs">Perfect Draws</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🏃 {totalDodgesRef.current}</div>
                <div className="text-xs">Dodges</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">☠️ {outlawsKilledRef.current}</div>
                <div className="text-xs">Outlaws Killed</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🔥 {maxComboRef.current}x</div>
                <div className="text-xs">Max Combo</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🔫 {totalShotsRef.current}</div>
                <div className="text-xs">Total Shots</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🎯 {totalShotsRef.current > 0 ? Math.round((outlawsKilledRef.current / totalShotsRef.current) * 100) : 0}%</div>
                <div className="text-xs">Accuracy</div>
              </div>
            </div>
            
            {onExit && (
              <button
                onClick={onExit}
                className="px-8 py-3 bg-gradient-to-b from-amber-500 to-amber-700 text-white font-bold text-xl rounded-lg border-2 border-amber-400 hover:from-amber-400 hover:to-amber-600 transition-all"
              >
                🚪 EXIT
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

