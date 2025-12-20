'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';

interface ParryProGameProps {
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

export default function ParryProGame({ onGameComplete, onExit, gameMode = 'practice', rngSeed }: ParryProGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerSwordRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const initializedRef = useRef(false);
  
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
  const onGameCompleteRef = useRef(onGameComplete);
  const gameModeRef = useRef(gameMode);
  const rngSeedRef = useRef(rngSeed);
  
  useEffect(() => {
    onGameCompleteRef.current = onGameComplete;
    gameModeRef.current = gameMode;
    rngSeedRef.current = rngSeed;
  }, [onGameComplete, gameMode, rngSeed]);
  
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
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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
    
    // Blade
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
    group.add(blade);
    
    // Blade edge glow
    const edgeGeometry = new THREE.BoxGeometry(0.02, 2.5, 0.06);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: isEnemy ? 0xFF4444 : 0x88CCFF,
      transparent: true,
      opacity: 0.6,
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 1.25;
    edge.position.x = 0.08;
    group.add(edge);
    
    // Guard (crossguard)
    const guardGeometry = new THREE.BoxGeometry(0.8, 0.15, 0.1);
    const guardMaterial = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x4A0000 : 0xDAA520,
      emissive: isEnemy ? 0x200000 : 0x554400,
      shininess: 80,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    group.add(guard);
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x2A0000 : 0x8B4513,
      emissive: isEnemy ? 0x100000 : 0x3A1A05,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.3;
    group.add(handle);
    
    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const pommel = new THREE.Mesh(pommelGeometry, guardMaterial);
    pommel.position.y = -0.65;
    group.add(pommel);
    
    return group;
  }, []);
  
  // Create enemy figure
  const createEnemy = useCallback((side: Enemy['side']) => {
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C2C2C,
      emissive: 0x100000,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.name = 'body';
    group.add(body);
    
    // Head
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
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 1.5, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 1.5, 0.2);
    group.add(rightEye);
    
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
  }, [createSword, getSidePosition]);
  
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
        // STRIKE = 200 points per hit!
        const strikePoints = 200;
        scoreRef.current += strikePoints;
        setScore(scoreRef.current);
        
        // Color based on hits - more hits = better precision
        const hitsLanded = 3 - targetEnemy.health;
        const popupType = hitsLanded === 2 ? 'critical' : comboRef.current >= 2 ? 'bonus' : 'normal';
        const hitLabel = hitsLanded === 1 ? '⚔️ STRIKE!' : hitsLanded === 2 ? '⚔️ CRITICAL!' : '⚔️ HIT!';
        addPopup(strikePoints, 50, 45, popupType, `${hitLabel} +200`);
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
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a0a);
    scene.fog = new THREE.Fog(0x1a0a0a, 5, 20);
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
    
    // Lighting
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
    
    // Floor (arena)
    const floorGeometry = new THREE.CircleGeometry(10, 32);
    const floorMaterial = new THREE.MeshPhongMaterial({
      color: 0x2a1a1a,
      emissive: 0x100505,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Arena ring
    const ringGeometry = new THREE.TorusGeometry(9.5, 0.1, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4444,
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
            spawnCooldownRef.current = 3;
          } else if (gameTimeRef.current >= 30 && aliveEnemies < 4) {
            spawnEnemy();
            spawnCooldownRef.current = 4;
          } else if (gameTimeRef.current >= 45 && aliveEnemies < 5) {
            spawnEnemy();
            spawnCooldownRef.current = 5;
          }
        }
        
        // Update enemies
        enemiesRef.current.forEach(enemy => {
          if (!enemy.mesh) return;
          
          const sword = enemy.mesh.getObjectByName('sword') as THREE.Group;
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          if (!sword) return;
          
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
  }, [createSword, createEnemy, spawnEnemy]);
  
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
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full">
            <div className="text-7xl mb-4">⚔️</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-red-500 mb-4" style={{ textShadow: '0 0 20px rgba(255, 0, 0, 0.5)' }}>
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
                  <div className="text-green-400 text-right font-bold">+200</div>
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
