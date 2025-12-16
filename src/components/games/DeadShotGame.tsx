'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';

interface DeadShotGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  rngSeed?: number;
}

interface Arrow {
  id: number;
  group: THREE.Group;
  vx: number;
  vy: number;
  vz: number;
  createdAt: number;
}

type ShipType = 'common' | 'rare' | 'epic' | 'legendary';

interface VirusLeg {
  mesh: THREE.Mesh;
  destroyed: boolean;
  fallingOff?: boolean;
  fallVelocity?: THREE.Vector3;
  canPickup?: boolean; // Can be picked up as shield
  pickupTime?: number; // When it became available for pickup
}

interface AlienShip {
  id: number;
  group: THREE.Group;
  capsid: THREE.Mesh; // Center capsid for 100 points
  legs: VirusLeg[]; // 4 legs that can be destroyed individually
  speed: number;
  direction: THREE.Vector3;
  createdAt: number;
  lastShotTime: number; // Track when this ship last shot
  center: THREE.Vector3;
  size: number;
  type: ShipType;
  basePoints: number;
  zones: Array<{ mesh: THREE.Mesh; radius: number; multiplier: number; color: number }>;
  legsDestroyed: number; // Track how many legs are destroyed
}

interface SubItem {
  id: number;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  type: 'laser' | 'heart'; // Red = laser shot, Yellow = heart/points
  createdAt: number;
}

interface LaserShot {
  id: number;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  createdAt: number;
}

interface WhiteDot {
  mesh: THREE.Mesh;
  id: number;
}

interface EnemyProjectile {
  id: number;
  mesh: THREE.Group | THREE.Mesh; // Can be group (amoeba) or mesh
  vx: number;
  vy: number;
  vz: number;
  createdAt: number;
  whiteDots?: WhiteDot[]; // White dots inside amoeba projectiles
}

export default function DeadShotGame({ 
  onGameEnd, 
  onExit, 
  listingId, 
  entryNumber, 
  isCompetitionMode, 
  rngSeed 
}: DeadShotGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const gameStateRef = useRef<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [bowPower, setBowPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [laserShotsRemaining, setLaserShotsRemaining] = useState(0);
  
  // Sync gameState and hearts to refs for animation loop
  useEffect(() => {
    gameStateRef.current = gameState;
    heartsRef.current = hearts;
  }, [gameState, hearts]);
  
  // Background is now solid crimson - no flash needed
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const bowRef = useRef<THREE.Group | null>(null);
  const bowStringRef = useRef<THREE.Line | null>(null);
  const arrowsRef = useRef<Arrow[]>([]);
  const shipsRef = useRef<AlienShip[]>([]);
  const subItemsRef = useRef<SubItem[]>([]);
  const enemyProjectilesRef = useRef<EnemyProjectile[]>([]);
  const aimPathRef = useRef<THREE.Line | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const heartsRef = useRef(3);
  const lastHitTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Audio functions
  const playPlayerShotSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Silent fail
    }
  }, []);
  
  const playVirusShotSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Silent fail
    }
  }, []);
  const timerRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const currentScoreRef = useRef(0);
  const totalShotsRef = useRef(0);
  const totalHitsRef = useRef(0);
  const isDrawingRef = useRef(false);
  const bowPowerRef = useRef(0);
  const aimAngleRef = useRef(0);
  const lastArrowIdRef = useRef(0);
  const lastShipIdRef = useRef(0);
  const lastSubItemIdRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const clockRef = useRef(new THREE.Clock());
  const stringCenterRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const bowVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0)); // Recoil velocity
  const bowPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0)); // Current position
  const shieldLegRef = useRef<THREE.Mesh | null>(null); // Currently equipped shield leg
  const fallenLegsRef = useRef<Array<{ leg: VirusLeg; shipId: number }>>([]); // Track fallen legs available for pickup
  const hasShieldRef = useRef(false); // Whether player has shield
  const cellMembraneRef = useRef<THREE.Group | null>(null); // Cell membrane wall border
  const lastHeartPickupRef = useRef<number>(0); // Track last heart pickup time to prevent multiple hearts
  const boundaryXRef = useRef<number>(15); // Dynamic boundary based on camera view
  const boundaryYRef = useRef<number>(15); // Dynamic boundary based on camera view
  const laserShotsRef = useRef<LaserShot[]>([]); // Laser shots from red items
  const laserShotsRemainingRef = useRef(0); // Remaining laser shots
  const lastLaserShotRef = useRef<number>(0); // Track last laser shot time
  
  // Seeded RNG for deterministic gameplay
  const seededRng = useMemo(() => {
    if (!rngSeed) return null;
    
    class Mulberry32 {
      private seed: number;
      constructor(seed: number) { this.seed = seed >>> 0; }
      next(): number {
        let t = (this.seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
      }
      nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
      }
    }
    
    return new Mulberry32(rngSeed);
  }, [rngSeed]);

  // Create realistic virus enemy - spherical capsid with protein spikes (like coronavirus)
  // Returns group, capsid mesh, legs array, and zones
  const createAlienShip = useCallback((x: number, y: number, z: number, size: number, type: ShipType = 'common'): { 
    group: THREE.Group; 
    capsid: THREE.Mesh;
    legs: VirusLeg[];
    zones: Array<{ mesh: THREE.Mesh; radius: number; multiplier: number; color: number }> 
  } => {
    const shipGroup = new THREE.Group();
    
    // Virus colors
    const capsidColor = 0x00ffff; // Cyan/white center capsid - 100 points
    const spikeColor = 0xff4444; // Red protein spikes
    const bodyColor = 0x8844ff; // Purple body
    
    // Main capsid (spherical center) - CYAN/WHITE - 100 points if hit
    const capsidGeometry = new THREE.IcosahedronGeometry(size * 0.4, 1); // More detail
    const capsidMaterial = new THREE.MeshStandardMaterial({
      color: capsidColor,
      emissive: capsidColor,
      emissiveIntensity: 5.0,
      metalness: 0.9,
      roughness: 0.1
    });
    const capsid = new THREE.Mesh(capsidGeometry, capsidMaterial);
    capsid.position.set(0, 0, 0);
    shipGroup.add(capsid);
    
    // Protein spikes around capsid (like coronavirus) - RED
    const spikeCount = 20;
    for (let i = 0; i < spikeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / spikeCount);
      const theta = Math.sqrt(spikeCount * Math.PI) * phi;
      
      const spikeGeometry = new THREE.ConeGeometry(size * 0.05, size * 0.3, 6);
      const spikeMaterial = new THREE.MeshStandardMaterial({
        color: spikeColor,
        emissive: spikeColor,
        emissiveIntensity: 4.0
      });
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      
      const xPos = size * 0.45 * Math.cos(theta) * Math.sin(phi);
      const yPos = size * 0.45 * Math.sin(theta) * Math.sin(phi);
      const zPos = size * 0.45 * Math.cos(phi);
      
      spike.position.set(xPos, yPos, zPos);
      spike.lookAt(xPos * 1.5, yPos * 1.5, zPos * 1.5); // Point outward
      shipGroup.add(spike);
    }
    
    // 4 legs on bottom that can be destroyed individually - RED
    const legCount = 4;
    const legs: VirusLeg[] = [];
    for (let i = 0; i < legCount; i++) {
      const angle = (Math.PI * 2 * i) / legCount;
      const legGeometry = new THREE.CylinderGeometry(size * 0.06, size * 0.08, size * 0.5, 8);
      const legMaterial = new THREE.MeshStandardMaterial({
        color: spikeColor,
        emissive: spikeColor,
        emissiveIntensity: 4.0
      });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(
        Math.cos(angle) * size * 0.3,
        -size * 0.35,
        Math.sin(angle) * size * 0.3
      );
      leg.rotation.z = Math.PI / 2;
      leg.rotation.y = angle;
      shipGroup.add(leg);
      legs.push({ mesh: leg, destroyed: false });
    }
    
    // Body membrane (purple) - surrounds capsid
    const bodyGeometry = new THREE.SphereGeometry(size * 0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      emissive: bodyColor,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.6,
      metalness: 0.5,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    shipGroup.add(body);
    
    // Glow effect around virus
    const glowGeometry = new THREE.SphereGeometry(size * 0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: bodyColor,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    shipGroup.add(glow);
    
    // Add colored scoring zones
    const zones: Array<{ mesh: THREE.Mesh; radius: number; multiplier: number; color: number }> = [];
    
    // Center capsid zone (CYAN) - 100 points
    const capsidZoneGeometry = new THREE.RingGeometry(0, size * 0.2, 16);
    const capsidZoneMaterial = new THREE.MeshBasicMaterial({
      color: capsidColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const capsidZone = new THREE.Mesh(capsidZoneGeometry, capsidZoneMaterial);
    capsidZone.rotation.x = Math.PI / 2;
    shipGroup.add(capsidZone);
    zones.push({ mesh: capsidZone, radius: size * 0.2, multiplier: 1.0, color: capsidColor });
    
    shipGroup.position.set(x, y, z);
    return { group: shipGroup, capsid, legs, zones };
  }, []);

  // Create arrow with proper 3D geometry - more arrow-shaped and neon
  const createArrow = useCallback((): THREE.Group => {
    const arrowGroup = new THREE.Group();
    
    // Arrow shaft (neon cyan cylinder - MUCH brighter and animated)
    const shaftGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 12);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 5.0, // MUCH brighter
      metalness: 0.9,
      roughness: 0.1
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.z = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head (sharp pyramid - VERY bright)
    const headGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 6.0, // VERY bright
      metalness: 0.95,
      roughness: 0.05
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 0.25; // Further forward
    arrowGroup.add(head);
    
    // Arrow tip point (extra sharp tip - BRIGHTEST)
    const tipGeometry = new THREE.ConeGeometry(0.02, 0.05, 6);
    const tipMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 8.0 // BRIGHTEST
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.x = 0.35;
    arrowGroup.add(tip);
    
    // Fletching (feathers at back - brighter)
    const fletchGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.03);
    const fletchMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 4.0 // Brighter
    });
    
    const fletch1 = new THREE.Mesh(fletchGeometry, fletchMaterial);
    fletch1.position.set(-0.2, 0.06, 0);
    fletch1.rotation.z = 0.3;
    arrowGroup.add(fletch1);
    
    const fletch2 = new THREE.Mesh(fletchGeometry, fletchMaterial);
    fletch2.position.set(-0.2, -0.06, 0);
    fletch2.rotation.z = -0.3;
    arrowGroup.add(fletch2);
    
    const fletch3 = new THREE.Mesh(fletchGeometry, fletchMaterial);
    fletch3.position.set(-0.2, 0, 0.06);
    fletch3.rotation.y = Math.PI / 2;
    arrowGroup.add(fletch3);
    
    // Trail effect - MUCH brighter animated glow
    const trailGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1.0 // Fully opaque for brightness
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.x = -0.15;
    arrowGroup.add(trail);
    
    // Multiple glow rings for pulsing effect
    for (let i = 0; i < 3; i++) {
      const glowRingGeometry = new THREE.RingGeometry(0.05 + i * 0.02, 0.08 + i * 0.02, 16);
      const glowRingMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7 - i * 0.2,
        side: THREE.DoubleSide
      });
      const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
      glowRing.position.x = -0.15;
      glowRing.rotation.x = Math.PI / 2;
      arrowGroup.add(glowRing);
    }
    
    return arrowGroup;
  }, []);

  // Create sub-item mesh - Red = laser shot, Yellow = heart/points
  const createSubItem = useCallback((type: 'laser' | 'heart'): THREE.Mesh => {
    const colors = {
      laser: 0xff0000, // Red for laser shots
      heart: 0xffff00  // Yellow for heart/points
    };
    
    const geometry = new THREE.OctahedronGeometry(0.2, 0);
    const material = new THREE.MeshStandardMaterial({
      color: colors[type],
      emissive: colors[type],
      emissiveIntensity: 2.0 // Brighter
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }, []);
  
  // Create laser shot mesh
  const createLaserShot = useCallback((): THREE.Mesh => {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 5.0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  }, []);

  // Initialize Three.js scene - Match working pattern from BladeBounce3D
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    console.log('🎯 [DeadShot] Initializing Three.js scene');

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    console.log('📐 [DeadShot] Container size:', { width, height });

    if (width === 0 || height === 0) {
      console.warn('⚠️ [DeadShot] Container has zero dimensions, retrying...');
      setTimeout(() => {
        if (containerRef.current && !sceneRef.current) {
          const retryWidth = containerRef.current.clientWidth || window.innerWidth;
          const retryHeight = containerRef.current.clientHeight || window.innerHeight;
          if (retryWidth > 0 && retryHeight > 0) {
            // Trigger re-render to retry initialization
            setGameState(prev => prev);
          }
        }
      }, 100);
      return;
    }

    const scene = new THREE.Scene();
    // Solid crimson red background (like instructions screen)
    scene.background = new THREE.Color(0x8B0000); // Dark crimson red
    
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // CRITICAL: Style canvas to ensure visibility (matching BladeBounce3D pattern)
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    
    container.appendChild(renderer.domElement);
    
    // VERIFY: Check if canvas is actually in DOM
    console.log('✅ [DeadShot] Renderer appended to DOM');
    console.log('🔍 [DeadShot] Canvas element:', renderer.domElement);
    console.log('🔍 [DeadShot] Canvas parent:', renderer.domElement.parentElement);
    console.log('🔍 [DeadShot] Canvas dimensions:', {
      width: renderer.domElement.width,
      height: renderer.domElement.height,
      clientWidth: renderer.domElement.clientWidth,
      clientHeight: renderer.domElement.clientHeight,
      offsetWidth: renderer.domElement.offsetWidth,
      offsetHeight: renderer.domElement.offsetHeight
    });
    console.log('🔍 [DeadShot] Container dimensions:', {
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight
    });
    
    // FORCE a render immediately to verify it works
    renderer.render(scene, camera);
    console.log('✅ [DeadShot] Initial render completed');
    
    // Bright lighting to ensure visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x00ffff, 5, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff00ff, 5, 100);
    pointLight2.position.set(-5, 5, -5);
    scene.add(pointLight2);
    
    // Create cell membrane wall border (epidermal-like wall around entire window)
    const membraneGroup = new THREE.Group();
    
    // Calculate visible boundaries based on camera view frustum
    const cameraDistance = camera.position.z;
    const fov = camera.fov * Math.PI / 180;
    const aspect = camera.aspect;
    const vFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const visibleHeight = 2 * Math.tan(fov / 2) * cameraDistance;
    const visibleWidth = visibleHeight * aspect;
    
    // Store boundaries for physics - tighter boundaries to prevent falling through
    const boundaryPadding = 0.8; // Increased padding to ensure collision
    boundaryXRef.current = visibleWidth / 2 - boundaryPadding;
    boundaryYRef.current = visibleHeight / 2 - boundaryPadding;
    
    // Create membrane walls (visible cyan/blue glowing cell membrane)
    const membraneMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // Cyan
      emissive: 0x00ffff, // Bright cyan glow
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 0.7, // More visible
      side: THREE.DoubleSide,
      metalness: 0.3,
      roughness: 0.2
    });
    
    // Thicker walls for better visibility
    const wallThickness = 0.3;
    const wallHeight = visibleHeight + wallThickness * 2;
    const wallWidth = visibleWidth + wallThickness * 2;
    
    // Top wall - positioned at boundary
    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallWidth, wallThickness, 0.3),
      membraneMaterial.clone()
    );
    topWall.position.set(0, boundaryYRef.current + wallThickness / 2, 0);
    membraneGroup.add(topWall);
    
    // Bottom wall - positioned at boundary
    const bottomWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallWidth, wallThickness, 0.3),
      membraneMaterial.clone()
    );
    bottomWall.position.set(0, -boundaryYRef.current - wallThickness / 2, 0);
    membraneGroup.add(bottomWall);
    
    // Left wall - positioned at boundary
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, 0.3),
      membraneMaterial.clone()
    );
    leftWall.position.set(-boundaryXRef.current - wallThickness / 2, 0, 0);
    membraneGroup.add(leftWall);
    
    // Right wall - positioned at boundary
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, 0.3),
      membraneMaterial.clone()
    );
    rightWall.position.set(boundaryXRef.current + wallThickness / 2, 0, 0);
    membraneGroup.add(rightWall);
    
    // Add pulsing glow effect for extra visibility
    const pulseMaterial = membraneMaterial.clone();
    pulseMaterial.emissiveIntensity = 4.0;
    pulseMaterial.opacity = 0.8;
    
    // Add corner highlights for better visibility
    const cornerSize = 0.5;
    const cornerGeometry = new THREE.BoxGeometry(cornerSize, cornerSize, 0.3);
    const corners = [
      { x: boundaryXRef.current, y: boundaryYRef.current }, // Top-right
      { x: -boundaryXRef.current, y: boundaryYRef.current }, // Top-left
      { x: boundaryXRef.current, y: -boundaryYRef.current }, // Bottom-right
      { x: -boundaryXRef.current, y: -boundaryYRef.current } // Bottom-left
    ];
    
    corners.forEach(corner => {
      const cornerMesh = new THREE.Mesh(cornerGeometry, pulseMaterial.clone());
      cornerMesh.position.set(corner.x, corner.y, 0);
      membraneGroup.add(cornerMesh);
    });
    
    scene.add(membraneGroup);
    cellMembraneRef.current = membraneGroup;
    
    // Test cube removed - ships should be visible instead
    
    // Create white blood cell bow - spherical with nucleus and organelles
    const bowGroup = new THREE.Group();
    
    // Main cell body (spherical, white/blue neon)
    const cellBodyGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const cellBodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      emissive: 0x88ccff, // Light blue neon glow
      emissiveIntensity: 3.0,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.9
    });
    const cellBody = new THREE.Mesh(cellBodyGeometry, cellBodyMaterial);
    bowGroup.add(cellBody);
    
    // Nucleus (darker center, blue tint)
    const nucleusGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const nucleusMaterial = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x4488ff,
      emissiveIntensity: 4.0,
      metalness: 0.5,
      roughness: 0.5
    });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    nucleus.position.set(0, 0, 0.3);
    bowGroup.add(nucleus);
    
    // Organelles (smaller spheres floating inside)
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const organelleGeometry = new THREE.SphereGeometry(0.08, 12, 12);
      const organelleMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaccff,
        emissive: 0xaaccff,
        emissiveIntensity: 3.5
      });
      const organelle = new THREE.Mesh(organelleGeometry, organelleMaterial);
      organelle.position.set(
        Math.cos(angle) * 0.35,
        Math.sin(angle) * 0.35,
        Math.sin(angle * 2) * 0.2
      );
      bowGroup.add(organelle);
    }
    
    // Energy wire/string (laser beam) - THIS IS WHERE ARROWS SPAWN
    const stringPoints = [
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0, 0), // Center point - arrow spawn location
      new THREE.Vector3(0.5, 0, 0)
    ];
    const stringGeometry = new THREE.BufferGeometry().setFromPoints(stringPoints);
    const stringMaterial = new THREE.LineBasicMaterial({ 
      color: 0x88ccff, 
      linewidth: 8,
      transparent: true,
      opacity: 1.0
    });
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(bowString);
    bowStringRef.current = bowString;
    
    // Aim path preview (trajectory line like Peggle) - initially hidden
    const aimPathPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
    const aimPathGeometry = new THREE.BufferGeometry().setFromPoints(aimPathPoints);
    const aimPathMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cyan laser color
      linewidth: 4, // Thicker line
      transparent: true,
      opacity: 0.8, // More visible
      emissive: 0x00ffff, // Glowing effect
      emissiveIntensity: 2.0
    });
    const aimPath = new THREE.Line(aimPathGeometry, aimPathMaterial);
    aimPath.visible = false;
    scene.add(aimPath);
    aimPathRef.current = aimPath;
    
    // Energy glow around white blood cell
    const glowGeometry = new THREE.RingGeometry(0.5, 1.0, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, 0);
    glow.rotation.x = Math.PI / 2;
    bowGroup.add(glow);
    
    // Initialize string center position
    stringCenterRef.current.set(0, 0, 0);
    
    // Position bow at center of screen (visible)
    bowGroup.position.set(0, 0, 0);
    bowPositionRef.current.set(0, 0, 0);
    bowVelocityRef.current.set(0, 0, 0);
    scene.add(bowGroup);
    bowRef.current = bowGroup;
    
    console.log('✅ [DeadShot] Bow created and added to scene at (0, 0, 0)');
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    console.log('✅ [DeadShot] Scene initialized, starting animation loop');
    
    // Start animation loop immediately - ALWAYS RENDER
    let frameCount = 0;
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
        console.warn('⚠️ [DeadShot] Scene not ready, stopping animation');
        return;
      }
      
      animationIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      // Increase game speed by 1.5x
      const speedMultiplier = 1.5;
      const adjustedDelta = delta * speedMultiplier;
      frameCount++;
      
      // Log every 60 frames to verify animation is running
      if (frameCount % 60 === 0) {
        console.log(`🔄 [DeadShot] Animation running - Frame ${frameCount}, Scene children: ${sceneRef.current.children.length}, Ships: ${shipsRef.current.length}`);
      }
      
      // ALWAYS render the scene (bow should be visible even when ready)
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Only update game logic when playing
      if (gameStateRef.current !== 'playing') {
        return;
      }
      
      // Update bow position with recoil movement (slow drift back to center)
      if (bowRef.current) {
        // Apply velocity to position
        bowPositionRef.current.x += bowVelocityRef.current.x * adjustedDelta;
        bowPositionRef.current.y += bowVelocityRef.current.y * adjustedDelta;
        
        // Wall bouncing - bounce off cell membrane walls with proper physics
        // Use tighter boundaries to prevent falling through
        const boundaryX = boundaryXRef.current;
        const boundaryY = boundaryYRef.current;
        const bounceDamping = 0.75; // Reduce velocity on bounce
        const minBounceVelocity = 0.15; // Minimum velocity to maintain bounce
        
        // X-axis boundary check and bounce - PREVENT FALLING THROUGH
        if (bowPositionRef.current.x > boundaryX) {
          bowPositionRef.current.x = boundaryX;
          if (bowVelocityRef.current.x > 0) {
            bowVelocityRef.current.x *= -bounceDamping;
          }
          // Ensure minimum bounce velocity
          if (Math.abs(bowVelocityRef.current.x) < minBounceVelocity) {
            bowVelocityRef.current.x = -minBounceVelocity;
          }
        } else if (bowPositionRef.current.x < -boundaryX) {
          bowPositionRef.current.x = -boundaryX;
          if (bowVelocityRef.current.x < 0) {
            bowVelocityRef.current.x *= -bounceDamping;
          }
          // Ensure minimum bounce velocity
          if (Math.abs(bowVelocityRef.current.x) < minBounceVelocity) {
            bowVelocityRef.current.x = minBounceVelocity;
          }
        }
        
        // Y-axis boundary check and bounce - PREVENT FALLING THROUGH (especially bottom)
        if (bowPositionRef.current.y > boundaryY) {
          bowPositionRef.current.y = boundaryY;
          if (bowVelocityRef.current.y > 0) {
            bowVelocityRef.current.y *= -bounceDamping;
          }
          // Ensure minimum bounce velocity
          if (Math.abs(bowVelocityRef.current.y) < minBounceVelocity) {
            bowVelocityRef.current.y = -minBounceVelocity;
          }
        } else if (bowPositionRef.current.y < -boundaryY) {
          // CRITICAL: Prevent falling through bottom
          bowPositionRef.current.y = -boundaryY;
          if (bowVelocityRef.current.y < 0) {
            bowVelocityRef.current.y *= -bounceDamping;
          }
          // Ensure minimum bounce velocity upward
          if (bowVelocityRef.current.y < minBounceVelocity) {
            bowVelocityRef.current.y = minBounceVelocity;
          }
        }
        
        // Apply damping to gradually slow down movement
        const damping = 0.95; // Slow down by 5% each frame
        bowVelocityRef.current.x *= damping;
        bowVelocityRef.current.y *= damping;
        
        // No auto-center - player stays where pushed and can work their way back with shots
        // Removed spring back to center for better gameplay
        
        // Update bow position
        bowRef.current.position.set(bowPositionRef.current.x, bowPositionRef.current.y, 0);
        
        // Update shield position if equipped - connect to player
        if (shieldLegRef.current && bowRef.current) {
          // Position shield slightly in front of white blood cell, always connected
          const shieldOffset = 0.8;
          const aimAngleRad = aimAngleRef.current * Math.PI / 180;
          const shieldX = bowPositionRef.current.x + Math.cos(aimAngleRad) * shieldOffset;
          const shieldY = bowPositionRef.current.y + Math.sin(aimAngleRad) * shieldOffset;
          shieldLegRef.current.position.set(shieldX, shieldY, 0);
          shieldLegRef.current.rotation.z = aimAngleRad;
          
          // Ensure shield stays connected - if too far, teleport it back
          const shieldDx = shieldLegRef.current.position.x - bowPositionRef.current.x;
          const shieldDy = shieldLegRef.current.position.y - bowPositionRef.current.y;
          const shieldDistance = Math.sqrt(shieldDx * shieldDx + shieldDy * shieldDy);
          
          if (shieldDistance > 2.0) {
            // Shield got disconnected - reconnect it
            shieldLegRef.current.position.set(shieldX, shieldY, 0);
          }
        }
      }
      
      // Update bow animation with charge effects
      if (bowRef.current && bowStringRef.current) {
        const drawProgress = bowPowerRef.current / 100;
        bowRef.current.rotation.z = -aimAngleRef.current * Math.PI / 180;
        
        // Animate bow string when drawing (white blood cell wire)
        const stringPoints = [
          new THREE.Vector3(-0.5, 0, 0),
          new THREE.Vector3(0, 0 - drawProgress * 0.4, 0), // Draw back center point
          new THREE.Vector3(0.5, 0, 0)
        ];
        bowStringRef.current.geometry.setFromPoints(stringPoints);
        // Update string center position for arrow spawning
        stringCenterRef.current.set(0, 0 - drawProgress * 0.4, 0);
        
        // Update aim path preview (trajectory like Peggle) - accurately follows mouse
        if (aimPathRef.current && isDrawingRef.current && cameraRef.current) {
          const power = bowPowerRef.current / 100;
          const aimAngleRad = aimAngleRef.current * Math.PI / 180;
          const baseSpeed = 8 + power * 42;
          
          let vx: number, vy: number;
          if (power >= 1.0) {
            vx = Math.cos(aimAngleRad) * baseSpeed;
            vy = Math.sin(aimAngleRad) * baseSpeed;
          } else {
            const upwardAngle = Math.PI / 4 * power;
            const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
            const verticalSpeed = baseSpeed * Math.sin(upwardAngle);
            vx = Math.cos(aimAngleRad) * horizontalSpeed;
            vy = Math.sin(aimAngleRad) * horizontalSpeed + verticalSpeed;
          }
          
          // Simulate trajectory path - GUIDE LASER showing only HALFWAY
          // Start from string center position (where arrow spawns)
          const pathPoints: THREE.Vector3[] = [];
          const localPos = stringCenterRef.current.clone();
          // Convert local position to world position accounting for bow rotation
          const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
          const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
          // Add bow's current world position to ensure preview originates from white blood cell
          let px = bowPositionRef.current.x + worldX;
          let py = bowPositionRef.current.y + worldY;
          let pz = bowPositionRef.current.z + localPos.z;
          let pvx = vx;
          let pvy = vy;
          const gravity = 9.8;
          
          // Calculate total trajectory distance to find halfway point
          let totalDistance = 0;
          let tempPx = px;
          let tempPy = py;
          let tempPvx = pvx;
          let tempPvy = pvy;
          const maxSteps = 100;
          
          // First pass: calculate total distance
          for (let i = 0; i < maxSteps; i++) {
            const stepDist = Math.sqrt(tempPvx * tempPvx + tempPvy * tempPvy) * 0.1;
            totalDistance += stepDist;
            tempPx += tempPvx * 0.1;
            tempPy += tempPvy * 0.1;
            tempPvy -= gravity * 0.1;
            if (tempPy < -10 || Math.abs(tempPx) > 30) break;
          }
          
          // Second pass: only show HALFWAY of trajectory
          const halfwayDistance = totalDistance / 2;
          let currentDistance = 0;
          
          for (let i = 0; i < maxSteps && currentDistance < halfwayDistance; i++) {
            pathPoints.push(new THREE.Vector3(px, py, pz));
            const stepDist = Math.sqrt(pvx * pvx + pvy * pvy) * 0.1;
            currentDistance += stepDist;
            px += pvx * 0.1;
            py += pvy * 0.1;
            pvy -= gravity * 0.1;
            
            if (py < -10 || Math.abs(px) > 30) break;
          }
          
          // Update guide laser appearance - brighter and more visible
          if (aimPathRef.current.material instanceof THREE.LineBasicMaterial) {
            aimPathRef.current.material.color.setHex(0x00ffff); // Cyan laser color
            aimPathRef.current.material.opacity = 0.8; // More visible
            aimPathRef.current.material.linewidth = 4; // Thicker line
          }
          
          aimPathRef.current.geometry.setFromPoints(pathPoints);
          aimPathRef.current.visible = true;
        } else if (aimPathRef.current) {
          aimPathRef.current.visible = false;
        }
        
        // Increase string brightness when charging
        if (bowStringRef.current.material instanceof THREE.LineBasicMaterial) {
          const intensity = 1.0 + drawProgress * 2.0; // 1.0 to 3.0
          bowStringRef.current.material.color.setHex(0x88ccff);
          bowStringRef.current.material.opacity = 0.5 + drawProgress * 0.5;
        }
        
        // Pulse glow when drawing - more intense
        if (bowRef.current) {
          const glowMesh = bowRef.current.children.find(child => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial && child.geometry instanceof THREE.RingGeometry);
          if (isDrawingRef.current && glowMesh) {
            const scale = 1 + drawProgress * 0.8; // Larger scale
            (glowMesh as THREE.Mesh).scale.set(scale, scale, 1);
            if (glowMesh.material instanceof THREE.MeshBasicMaterial) {
              glowMesh.material.opacity = 0.5 + drawProgress * 0.5;
              // Color shift based on charge
              if (drawProgress >= 1.0) {
                glowMesh.material.color.setHex(0xff00ff); // Pink at max
              } else if (drawProgress >= 0.7) {
                glowMesh.material.color.setHex(0x00ffff); // Cyan
              } else {
                glowMesh.material.color.setHex(0x0088ff); // Blue
              }
            }
          }
          
          // Make bow limbs brighter when charging
          bowRef.current.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              const material = child.material;
              if (material.emissive) {
                const baseIntensity = material.emissiveIntensity || 2.0;
                material.emissiveIntensity = baseIntensity + drawProgress * 1.5;
              }
            }
          });
        }
      }
      
      // Update arrows with gravity-based physics and animated brightness
      arrowsRef.current = arrowsRef.current.map(arrow => {
        // Realistic gravity - arrows always affected by gravity
        const gravity = 9.8; // Realistic gravity
        arrow.group.position.x += arrow.vx * adjustedDelta;
        arrow.group.position.y += arrow.vy * adjustedDelta;
        arrow.group.position.z += arrow.vz * adjustedDelta;
        arrow.vy -= gravity * adjustedDelta; // Gravity always pulls down
        
        // Animate arrow brightness (pulsing effect)
        const time = Date.now() * 0.005;
        const pulseIntensity = 1.0 + Math.sin(time + arrow.id) * 0.3; // Pulsing brightness
        
        arrow.group.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material;
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
              if (material.emissiveIntensity !== undefined) {
                const baseIntensity = material.emissiveIntensity || 2.0;
                material.emissiveIntensity = baseIntensity * pulseIntensity;
              }
              // Pulse opacity for glow effects
              if (material.transparent && material.opacity !== undefined) {
                const baseOpacity = material.opacity || 0.8;
                material.opacity = Math.min(1.0, baseOpacity * pulseIntensity);
              }
            }
          }
        });
        
        // Rotate arrow to match velocity direction smoothly
        const velocity = Math.sqrt(arrow.vx * arrow.vx + arrow.vy * arrow.vy + arrow.vz * arrow.vz);
        if (velocity > 0.1) {
          // Calculate pitch (up/down angle) based on velocity
          const pitch = Math.atan2(arrow.vy, Math.sqrt(arrow.vx * arrow.vx + arrow.vz * arrow.vz));
          // Calculate yaw (left/right angle)
          const yaw = Math.atan2(arrow.vx, arrow.vz);
          
          arrow.group.rotation.x = -pitch; // Pitch rotation
          arrow.group.rotation.y = yaw; // Yaw rotation
        }
        
        // Check collisions with ships
        shipsRef.current.forEach((ship, shipIndex) => {
          const dx = arrow.group.position.x - ship.group.position.x;
          const dy = arrow.group.position.y - ship.group.position.y;
          const dz = arrow.group.position.z - ship.group.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Check if arrow hits center capsid (100 points)
          const capsidDx = arrow.group.position.x - ship.capsid.position.x - ship.group.position.x;
          const capsidDy = arrow.group.position.y - ship.capsid.position.y - ship.group.position.y;
          const capsidDz = arrow.group.position.z - ship.capsid.position.z - ship.group.position.z;
          const capsidDistance = Math.sqrt(capsidDx * capsidDx + capsidDy * capsidDy + capsidDz * capsidDz);
          
          if (capsidDistance < ship.size * 0.2) {
            // Hit center capsid - HEADSHOT! 200 points!
            currentScoreRef.current += 200;
            totalHitsRef.current++;
            setScore(currentScoreRef.current);
            setAccuracy((totalHitsRef.current / totalShotsRef.current) * 100);
            
            // Create drops when enemy is killed
            const dropPosition = ship.group.position.clone();
            const dropTypes: Array<'laser' | 'heart'> = ['laser', 'heart'];
            
            // Spawn 2-3 random drops (red = laser, yellow = heart)
            const numDrops = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numDrops; i++) {
              const dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
              const dropMesh = createSubItem(dropType);
              dropMesh.position.set(
                dropPosition.x + (Math.random() - 0.5) * 2,
                dropPosition.y + (Math.random() - 0.5) * 2,
                dropPosition.z
              );
              
              const drop: SubItem = {
                id: ++lastSubItemIdRef.current,
                mesh: dropMesh,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 1 + 0.5, // Slower initial upward velocity (was 2 + 1, now 1 + 0.5)
                vz: (Math.random() - 0.5) * 3,
                type: dropType,
                createdAt: Date.now()
              };
              
              sceneRef.current.add(dropMesh);
              subItemsRef.current.push(drop);
            }
            
            // Remove ship completely
            sceneRef.current.remove(ship.group);
            shipsRef.current.splice(shipIndex, 1);
            
            // Remove arrow
            sceneRef.current.remove(arrow.group);
            return null;
          }
          
          // Check if arrow hits any leg (50 points per leg)
          let legHit = false;
          for (const leg of ship.legs) {
            if (leg.destroyed) continue;
            
            const legDx = arrow.group.position.x - leg.mesh.position.x - ship.group.position.x;
            const legDy = arrow.group.position.y - leg.mesh.position.y - ship.group.position.y;
            const legDz = arrow.group.position.z - leg.mesh.position.z - ship.group.position.z;
            const legDistance = Math.sqrt(legDx * legDx + legDy * legDy + legDz * legDz);
            
            if (legDistance < ship.size * 0.1) {
              // Hit leg - destroy it and give 50 points
              leg.destroyed = true;
              leg.fallingOff = true;
              ship.legsDestroyed++;
              
              // Animate leg falling off - calculate fall direction
              const legWorldPos = new THREE.Vector3();
              leg.mesh.getWorldPosition(legWorldPos);
              const arrowWorldPos = arrow.group.position;
              const hitDirection = legWorldPos.sub(arrowWorldPos).normalize();
              
              // Set fall velocity (leg flies off in hit direction)
              leg.fallVelocity = new THREE.Vector3(
                hitDirection.x * 3,
                hitDirection.y * 3 - 2, // Add downward component
                hitDirection.z * 3
              );
              
              // Detach leg from ship group for independent animation
              ship.group.remove(leg.mesh);
              sceneRef.current.add(leg.mesh);
              
              // Update leg position to world coordinates
              leg.mesh.position.copy(legWorldPos);
              
              // Mark leg as available for pickup after a short delay
              leg.canPickup = false;
              leg.pickupTime = Date.now() + 500; // Available after 500ms
              
              // Add to fallen legs list for pickup detection
              fallenLegsRef.current.push({ leg, shipId: ship.id });
              
              currentScoreRef.current += 50;
              totalHitsRef.current++;
              setScore(currentScoreRef.current);
              setAccuracy((totalHitsRef.current / totalShotsRef.current) * 100);
              
              // Remove arrow
              sceneRef.current.remove(arrow.group);
              legHit = true;
              break;
            }
          }
          
          if (legHit) {
            return null; // Arrow was destroyed by hitting a leg
          }
        });
        
        // Remove arrows that are out of bounds
        if (arrow.group.position.y < -10 || 
            Math.abs(arrow.group.position.x) > 30 || 
            Math.abs(arrow.group.position.z) > 30) {
          sceneRef.current.remove(arrow.group);
          return null;
        }
        
        return arrow;
      }).filter(arrow => arrow !== null) as Arrow[];
      
      // Update ships - move omnidirectionally and shoot projectiles
      shipsRef.current = shipsRef.current.map(ship => {
        // Omnidirectional movement (can change direction slightly)
        // Keep on same plane (z=0)
        // Add slight direction changes for more dynamic omnidirectional movement
        const time = Date.now() * 0.001;
        const directionVariation = Math.sin(time + ship.id) * 0.3; // Vary direction over time
        const currentDirection = ship.direction.clone();
        currentDirection.x += Math.cos(time + ship.id) * directionVariation * adjustedDelta;
        currentDirection.y += Math.sin(time + ship.id) * directionVariation * adjustedDelta;
        currentDirection.normalize();
        
        const movement = currentDirection.clone().multiplyScalar(ship.speed * adjustedDelta);
        ship.group.position.add(movement);
        ship.group.position.z = 0; // Force z=0 to keep on same plane
        
        // Enhanced rotation for visual effect - rotate on all axes
        ship.group.rotation.y += adjustedDelta * 3; // Faster Y rotation
        ship.group.rotation.x += adjustedDelta * 1.5; // Faster X rotation
        ship.group.rotation.z += adjustedDelta * 2; // Add Z rotation for tumbling effect
        
        // Animate legs falling off and check for pickup
        ship.legs.forEach(leg => {
          if (leg.fallingOff && leg.fallVelocity && leg.mesh.parent === sceneRef.current) {
            // Check if leg is now available for pickup
            if (!leg.canPickup && leg.pickupTime && Date.now() >= leg.pickupTime) {
              leg.canPickup = true;
              // Make leg glow to indicate it can be picked up
              if (leg.mesh.material instanceof THREE.MeshStandardMaterial) {
                leg.mesh.material.emissive.setHex(0x00ff00); // Green glow when pickupable
                leg.mesh.material.emissiveIntensity = 3.0;
              }
            }
            
            // Apply physics to falling leg - stop after a short time to stay in place
            const fallDuration = leg.pickupTime ? Date.now() - leg.pickupTime + 500 : 0;
            const shouldStopFalling = fallDuration > 1000; // Stop after 1 second of falling
            
            if (!shouldStopFalling && leg.fallVelocity) {
              leg.mesh.position.add(leg.fallVelocity.clone().multiplyScalar(adjustedDelta));
              leg.fallVelocity.y -= 9.8 * adjustedDelta; // Gravity
              
              // Stop falling when velocity is very low
              if (Math.abs(leg.fallVelocity.y) < 0.1 && Math.abs(leg.fallVelocity.x) < 0.1 && Math.abs(leg.fallVelocity.z) < 0.1) {
                leg.fallVelocity.set(0, 0, 0); // Stop physics - leg stays in place
              }
            } else {
              // Leg has stopped falling - stay in place
              leg.fallVelocity = new THREE.Vector3(0, 0, 0);
            }
            
            // Rotate leg as it falls (or gently rotate when stopped)
            leg.mesh.rotation.x += adjustedDelta * (shouldStopFalling ? 1 : 5);
            leg.mesh.rotation.z += adjustedDelta * (shouldStopFalling ? 0.5 : 3);
            
            // Check for pickup by white blood cell - ONLY if no shield already
            if (leg.canPickup && !hasShieldRef.current && bowRef.current) {
              const dx = leg.mesh.position.x - bowPositionRef.current.x;
              const dy = leg.mesh.position.y - bowPositionRef.current.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance < 1.5) { // Pickup range
                // Pick up leg as shield - ONLY ONE AT A TIME
                hasShieldRef.current = true;
                shieldLegRef.current = leg.mesh;
                
                // Stop leg physics - it's now attached as shield
                leg.fallingOff = false;
                leg.fallVelocity = new THREE.Vector3(0, 0, 0);
                
                // Make shield more visible
                if (leg.mesh.material instanceof THREE.MeshStandardMaterial) {
                  leg.mesh.material.emissive.setHex(0x00ffff); // Cyan glow for shield
                  leg.mesh.material.emissiveIntensity = 5.0;
                  leg.mesh.material.opacity = 1.0;
                }
                
                // Scale up shield slightly
                leg.mesh.scale.set(1.5, 1.5, 1.5);
                
                // Remove from fallen legs list
                fallenLegsRef.current = fallenLegsRef.current.filter(fl => fl.leg !== leg);
              }
            }
            
            // Remove if out of bounds or too far (but not if it's a shield)
            if (leg.mesh !== shieldLegRef.current) {
              if (leg.mesh.position.y < -10 || 
                  Math.abs(leg.mesh.position.x) > 30 || 
                  Math.abs(leg.mesh.position.z) > 30) {
                sceneRef.current.remove(leg.mesh);
                leg.mesh.geometry.dispose();
                if (leg.mesh.material instanceof THREE.Material) {
                  leg.mesh.material.dispose();
                }
                // Remove from fallen legs list
                fallenLegsRef.current = fallenLegsRef.current.filter(fl => fl.leg !== leg);
              } else if (!leg.canPickup) {
                // Fade out over time (only if not pickupable yet)
                if (leg.mesh.material instanceof THREE.MeshStandardMaterial) {
                  leg.mesh.material.opacity = Math.max(0.3, (leg.mesh.material.opacity || 1) - adjustedDelta * 0.3);
                  leg.mesh.material.transparent = true;
                }
              }
            }
          }
        });
        
        // Animate glow pulsing
        const glowMesh = ship.group.children.find(child => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial);
        if (glowMesh) {
          const time = Date.now() * 0.001;
          (glowMesh as THREE.Mesh).scale.setScalar(1 + Math.sin(time * 3) * 0.2);
        }
        
        // Enemy shooting - progressively faster shooting based on game time
        const now = Date.now();
        const elapsedTime = gameStartTimeRef.current > 0 ? (now - gameStartTimeRef.current) / 1000 : 0; // Elapsed time in seconds
        // Progressive shooting: Start at 4 seconds, decrease to 1 second over 60 seconds
        // Fewer shots overall, but faster as game progresses
        const baseShootInterval = 4000; // Start at 4 seconds
        const minShootInterval = 1000; // Minimum 1 second
        const maxElapsedTime = 60; // 60 seconds to reach minimum interval
        const shootInterval = Math.max(minShootInterval, baseShootInterval - (elapsedTime / maxElapsedTime) * (baseShootInterval - minShootInterval));
        
        if (now - ship.lastShotTime > shootInterval && sceneRef.current) {
          ship.lastShotTime = now;
          
          // Play virus shot sound
          playVirusShotSound();
          
          // Calculate direction to player
          const toPlayer = new THREE.Vector3(0, 0, 0).sub(ship.group.position).normalize();
          
          // Create semi-glowing amoeba-like projectile
          // Size: LARGER - 2/3 of mid-sized enemy (mid-size ~1.4, so ~0.93)
          const midSizeEnemy = 1.4; // Average of 0.8-2.0 range
          const blobSize = midSizeEnemy * 0.67; // ~0.93 - about 2/3 of mid-sized enemy (MUCH LARGER)
          
          const amoebaGroup = new THREE.Group();
          
          // Main blob (irregular sphere with noise) - SEMI-GLOWING
          const blobGeometry = new THREE.SphereGeometry(blobSize, 16, 16);
          // Add noise to vertices for irregular amoeba shape
          const positions = blobGeometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const noise = 0.85 + Math.random() * 0.3; // More variation for amoeba look
            positions.setX(i, x * noise);
            positions.setY(i, y * noise);
            positions.setZ(i, z * noise);
          }
          positions.needsUpdate = true;
          
          // VERY BRIGHT and OBVIOUS material - make it impossible to miss
          const blobMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Bright red
            emissive: 0xff0000, // Bright red glow
            emissiveIntensity: 8.0, // VERY STRONG glow - much brighter
            transparent: true,
            opacity: 1.0, // Fully opaque - no transparency
            blending: THREE.AdditiveBlending // Glowing effect
          });
          const blobMesh = new THREE.Mesh(blobGeometry, blobMaterial);
          amoebaGroup.add(blobMesh);
          
          // VERY BRIGHT glow rings - make projectiles extremely obvious
          for (let i = 0; i < 3; i++) { // More rings for visibility
            const glowRingGeometry = new THREE.RingGeometry(blobSize * (0.8 + i * 0.15), blobSize * (1.0 + i * 0.15), 16);
            const glowRingMaterial = new THREE.MeshBasicMaterial({
              color: 0xff0000, // Bright red
              emissive: 0xff0000, // Bright red glow
              emissiveIntensity: 6.0, // Very bright
              transparent: true,
              opacity: 0.8 - i * 0.2, // More visible
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending
            });
            const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
            glowRing.rotation.x = Math.PI / 2;
            amoebaGroup.add(glowRing);
          }
          
          // Add smaller blobs for amoeba-like appearance - BRIGHTER
          for (let i = 0; i < 3; i++) {
            const smallBlobGeometry = new THREE.SphereGeometry(blobSize * 0.4, 8, 8);
            const smallBlobMaterial = new THREE.MeshBasicMaterial({
              color: 0xff0000, // Bright red
              emissive: 0xff0000, // Bright red glow
              emissiveIntensity: 7.0, // Very bright
              transparent: true,
              opacity: 1.0, // Fully opaque
              blending: THREE.AdditiveBlending
            });
            const smallBlob = new THREE.Mesh(smallBlobGeometry, smallBlobMaterial);
            smallBlob.position.set(
              (Math.random() - 0.5) * blobSize * 0.8,
              (Math.random() - 0.5) * blobSize * 0.8,
              (Math.random() - 0.5) * blobSize * 0.8
            );
            amoebaGroup.add(smallBlob);
          }
          
          // Add white dots inside amoeba for bonus points
          const whiteDots: WhiteDot[] = [];
          const numWhiteDots = 2 + Math.floor(Math.random() * 2); // 2-3 white dots
          for (let i = 0; i < numWhiteDots; i++) {
            const whiteDotGeometry = new THREE.SphereGeometry(blobSize * 0.15, 8, 8);
            const whiteDotMaterial = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              emissive: 0xffffff,
              emissiveIntensity: 5.0,
              transparent: true,
              opacity: 0.9,
              blending: THREE.AdditiveBlending
            });
            const whiteDot = new THREE.Mesh(whiteDotGeometry, whiteDotMaterial);
            whiteDot.position.set(
              (Math.random() - 0.5) * blobSize * 0.6,
              (Math.random() - 0.5) * blobSize * 0.6,
              (Math.random() - 0.5) * blobSize * 0.6
            );
            amoebaGroup.add(whiteDot);
            whiteDots.push({
              mesh: whiteDot,
              id: Date.now() + Math.random() + i
            });
          }
          
          amoebaGroup.position.copy(ship.group.position);
          sceneRef.current.add(amoebaGroup);
          
          // MUCH SLOWER speed (0.5 instead of 1) - easier to dodge
          const projectile: EnemyProjectile = {
            id: Date.now() + Math.random(),
            mesh: amoebaGroup, // Store as group
            vx: toPlayer.x * 0.5, // Much slower
            vy: toPlayer.y * 0.5, // Much slower
            vz: toPlayer.z * 0.5, // Much slower
            createdAt: now,
            whiteDots: whiteDots // Store white dots for collision detection
          };
          
          enemyProjectilesRef.current.push(projectile);
        }
        
        // Remove ships that are out of bounds - DEDUCT 50 POINTS if ship escapes
        // Check X and Y only since z is always 0
        if (Math.abs(ship.group.position.x) > 30 || 
            Math.abs(ship.group.position.y) > 30) {
          // Ship escaped - deduct 50 points
          currentScoreRef.current = Math.max(0, currentScoreRef.current - 50);
          setScore(currentScoreRef.current);
          
          sceneRef.current.remove(ship.group);
          return null;
        }
        
        return ship;
      }).filter(ship => ship !== null) as AlienShip[];
      
      // Update enemy projectiles with animation
      enemyProjectilesRef.current = enemyProjectilesRef.current.map(projectile => {
        projectile.mesh.position.x += projectile.vx * adjustedDelta;
        projectile.mesh.position.y += projectile.vy * adjustedDelta;
        projectile.mesh.position.z += projectile.vz * adjustedDelta;
        
        // Animate amoeba rotation for organic movement - MORE OBVIOUS
        if (projectile.mesh instanceof THREE.Group) {
          projectile.mesh.rotation.x += adjustedDelta * 3; // Faster rotation
          projectile.mesh.rotation.y += adjustedDelta * 2.5;
          projectile.mesh.rotation.z += adjustedDelta * 2;
          
          // MORE OBVIOUS pulsing scale for amoeba effect - larger pulse
          const time = Date.now() * 0.005;
          const pulse = 1.0 + Math.sin(time + projectile.id) * 0.25; // Larger pulse, faster
          projectile.mesh.scale.setScalar(pulse);
          
          // Animate glow intensity for VERY OBVIOUS pulsing effect
          projectile.mesh.children.forEach((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
              const material = child.material;
              if (material.emissiveIntensity !== undefined) {
                const baseIntensity = material.emissiveIntensity || 8.0;
                material.emissiveIntensity = baseIntensity + Math.sin(time * 2 + projectile.id) * 3.0; // Much larger pulse
              }
              // Keep opacity high for visibility
              if (material.transparent) {
                material.opacity = Math.max(0.9, material.opacity || 1.0); // Keep high opacity
              }
            }
          });
        }
        
        // Keep projectiles on same plane (z=0)
        projectile.mesh.position.z = 0;
        
        // Check collision with player (at center 0,0,0) - MUCH larger hitbox for larger projectiles
        const dx = projectile.mesh.position.x;
        const dy = projectile.mesh.position.y;
        const dz = projectile.mesh.position.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // MUCH larger hitbox (1.5 instead of 1.2) to match larger projectile size
        if (distanceToPlayer < 1.5 && heartsRef.current > 0 && Date.now() - lastHitTimeRef.current > 1000) {
          // Check if shield protects player
          if (hasShieldRef.current && shieldLegRef.current) {
            // Shield blocks the hit! Destroy shield instead
            hasShieldRef.current = false;
            if (shieldLegRef.current.parent === sceneRef.current) {
              sceneRef.current.remove(shieldLegRef.current);
              shieldLegRef.current.geometry.dispose();
              if (shieldLegRef.current.material instanceof THREE.Material) {
                shieldLegRef.current.material.dispose();
              }
            }
            shieldLegRef.current = null;
            
            // Visual feedback - flash white
            if (bowRef.current) {
              bowRef.current.children.forEach((child: any) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                  const originalEmissive = child.material.emissive.getHex();
                  child.material.emissive.setHex(0xffffff);
                  setTimeout(() => {
                    if (child && child.material instanceof THREE.MeshStandardMaterial) {
                      child.material.emissive.setHex(originalEmissive);
                    }
                  }, 200);
                }
              });
            }
            
            // Remove projectile
            sceneRef.current.remove(projectile.mesh);
            return null;
          }
          
          // No shield - hit player - lose a heart
          lastHitTimeRef.current = Date.now();
          setHearts(prev => {
            const newHearts = Math.max(0, prev - 1);
            heartsRef.current = newHearts;
            
            // Make white blood cell glow red when losing a heart - Enhanced flash
            if (bowRef.current) {
              // Find all parts of the white blood cell to flash red
              bowRef.current.children.forEach((child: any) => {
                if (child instanceof THREE.Mesh && child.material) {
                  if (child.material instanceof THREE.MeshStandardMaterial) {
                    // Flash red glow on all parts
                    const originalEmissive = child.material.emissive.getHex();
                    const originalIntensity = child.material.emissiveIntensity || 3.0;
                    
                    child.material.emissive.setHex(0xff0000);
                    child.material.emissiveIntensity = 8.0; // Very bright red flash
                    
                    // Fade back to normal after 0.6 seconds with smooth transition
                    setTimeout(() => {
                      if (child && child.material instanceof THREE.MeshStandardMaterial) {
                        child.material.emissive.setHex(originalEmissive);
                        child.material.emissiveIntensity = originalIntensity;
                      }
                    }, 600);
                  }
                }
              });
            }
            
            if (newHearts <= 0) {
              endGame();
            }
            return newHearts;
          });
          
          sceneRef.current.remove(projectile.mesh);
          return null;
        }
        
          // Check if arrow hits white dots inside amoeba projectiles (extra points!)
          if (projectile.whiteDots && projectile.whiteDots.length > 0) {
            let whiteDotHit = false;
            let hitWhiteDot: WhiteDot | null = null;
            let hitArrow: Arrow | null = null;
            
            // Find collision between arrows and white dots
            for (const arrow of arrowsRef.current) {
              for (const whiteDot of projectile.whiteDots) {
                // Get world position of white dot (relative to projectile group)
                const whiteDotWorldPos = new THREE.Vector3();
                whiteDot.mesh.getWorldPosition(whiteDotWorldPos);
                
                const dx = arrow.group.position.x - whiteDotWorldPos.x;
                const dy = arrow.group.position.y - whiteDotWorldPos.y;
                const dz = arrow.group.position.z - whiteDotWorldPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < 0.3) { // Hit white dot!
                  whiteDotHit = true;
                  hitWhiteDot = whiteDot;
                  hitArrow = arrow;
                  break;
                }
              }
              if (whiteDotHit) break;
            }
            
            if (whiteDotHit && hitWhiteDot && hitArrow) {
              // Give extra points for hitting white dot
              currentScoreRef.current += 100; // Extra 100 points for white dot!
              totalHitsRef.current++;
              setScore(currentScoreRef.current);
              setAccuracy((totalHitsRef.current / totalShotsRef.current) * 100);
              
              // Remove white dot from amoeba
              if (projectile.mesh instanceof THREE.Group) {
                projectile.mesh.remove(hitWhiteDot.mesh);
                sceneRef.current.remove(hitWhiteDot.mesh);
              }
              
              // Remove white dot from array
              const dotIndex = projectile.whiteDots.indexOf(hitWhiteDot);
              if (dotIndex > -1) {
                projectile.whiteDots.splice(dotIndex, 1);
              }
              
              // Remove arrow (will be filtered out in arrow map function)
              sceneRef.current.remove(hitArrow.group);
              const arrowIndex = arrowsRef.current.indexOf(hitArrow);
              if (arrowIndex > -1) {
                arrowsRef.current.splice(arrowIndex, 1);
              }
              
              // Keep projectile, just removed white dot
              return projectile;
            }
          }
          
          // Check if arrow hits projectile (can destroy it) - MUCH larger hitbox for larger projectiles
          const arrowHit = arrowsRef.current.find(arrow => {
            const dx = arrow.group.position.x - projectile.mesh.position.x;
            const dy = arrow.group.position.y - projectile.mesh.position.y;
            const dz = arrow.group.position.z - projectile.mesh.position.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.8; // Much larger hitbox to match larger projectile
          });
        
        if (arrowHit) {
          // Arrow hit projectile - destroy both
          sceneRef.current.remove(projectile.mesh);
          return null;
        }
        
        // Remove projectiles that are out of bounds
        if (Math.abs(projectile.mesh.position.x) > 30 || 
            Math.abs(projectile.mesh.position.y) > 30 || 
            Math.abs(projectile.mesh.position.z) > 30) {
          sceneRef.current.remove(projectile.mesh);
          return null;
        }
        
        return projectile;
      }).filter(p => p !== null) as EnemyProjectile[];
      
      // Update laser shots - straight vector power shots that one-shot all enemies
      laserShotsRef.current = laserShotsRef.current.map(laser => {
        // Move laser shot forward in straight line
        laser.mesh.position.x += laser.vx * adjustedDelta;
        laser.mesh.position.y += laser.vy * adjustedDelta;
        laser.mesh.position.z += laser.vz * adjustedDelta;
        
        // Check collision with all ships - one-shot kill
        shipsRef.current.forEach((ship, shipIndex) => {
          const dx = laser.mesh.position.x - ship.group.position.x;
          const dy = laser.mesh.position.y - ship.group.position.y;
          const dz = laser.mesh.position.z - ship.group.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < ship.size * 0.5) {
            // Laser one-shots enemy - give points
            currentScoreRef.current += ship.basePoints;
            totalHitsRef.current++;
            setScore(currentScoreRef.current);
            setAccuracy((totalHitsRef.current / totalShotsRef.current) * 100);
            
            // Create drops
            const dropPosition = ship.group.position.clone();
            const dropTypes: Array<'laser' | 'heart'> = ['laser', 'heart'];
            const numDrops = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numDrops; i++) {
              const dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
              const dropMesh = createSubItem(dropType);
              dropMesh.position.set(
                dropPosition.x + (Math.random() - 0.5) * 2,
                dropPosition.y + (Math.random() - 0.5) * 2,
                dropPosition.z
              );
              
              const drop: SubItem = {
                id: ++lastSubItemIdRef.current,
                mesh: dropMesh,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 1 + 0.5,
                vz: (Math.random() - 0.5) * 3,
                type: dropType,
                createdAt: Date.now()
              };
              
              sceneRef.current.add(dropMesh);
              subItemsRef.current.push(drop);
            }
            
            // Remove ship
            sceneRef.current.remove(ship.group);
            shipsRef.current.splice(shipIndex, 1);
            
            // Remove laser
            sceneRef.current.remove(laser.mesh);
            return null;
          }
        });
        
        // Remove laser if out of bounds
        if (Math.abs(laser.mesh.position.x) > 30 || 
            Math.abs(laser.mesh.position.y) > 30 || 
            Math.abs(laser.mesh.position.z) > 30) {
          sceneRef.current.remove(laser.mesh);
          return null;
        }
        
        return laser;
      }).filter(l => l !== null) as LaserShot[];
      
      // Update sub-items with physics - fall with gravity and bounce off walls
      subItemsRef.current = subItemsRef.current.map(item => {
        // Apply velocity
        item.mesh.position.x += item.vx * adjustedDelta;
        item.mesh.position.y += item.vy * adjustedDelta;
        item.mesh.position.z += item.vz * adjustedDelta;
        
        // Apply gravity
        item.vy -= 9.8 * adjustedDelta; // Gravity for falling
        
        // Bounce off cell membrane walls
        const boundaryX = boundaryXRef.current;
        const boundaryY = boundaryYRef.current;
        const bounceDamping = 0.6; // Damping on bounce
        
        if (Math.abs(item.mesh.position.x) > boundaryX) {
          item.mesh.position.x = Math.sign(item.mesh.position.x) * boundaryX;
          item.vx *= -bounceDamping;
        }
        
        if (Math.abs(item.mesh.position.y) > boundaryY) {
          item.mesh.position.y = Math.sign(item.mesh.position.y) * boundaryY;
          item.vy *= -bounceDamping;
        }
        
        // Apply air resistance
        item.vx *= 0.99;
        item.vz *= 0.99;
        
        // Rotate sub-item
        item.mesh.rotation.x += adjustedDelta * 3;
        item.mesh.rotation.y += adjustedDelta * 3;
        
        // Check if arrow hits sub-item
        const arrowHit = arrowsRef.current.find(arrow => {
          const dx = arrow.group.position.x - item.mesh.position.x;
          const dy = arrow.group.position.y - item.mesh.position.y;
          const dz = arrow.group.position.z - item.mesh.position.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.5;
        });
        
        if (arrowHit) {
          // Handle different item types
          if (item.type === 'laser') {
            // Red item: Give 3 laser shots that one-shot all enemies
            laserShotsRemainingRef.current += 3;
            // Visual feedback
            if (bowRef.current) {
              bowRef.current.children.forEach((child: any) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                  const originalEmissive = child.material.emissive.getHex();
                  child.material.emissive.setHex(0xff0000);
                  setTimeout(() => {
                    if (child && child.material instanceof THREE.MeshStandardMaterial) {
                      child.material.emissive.setHex(originalEmissive);
                    }
                  }, 500);
                }
              });
            }
          } else if (item.type === 'heart') {
            // Yellow item: Give heart back if lost one (ONLY ONE PER ITEM), otherwise 200 points
            const now = Date.now();
            const heartCooldown = 100; // 100ms cooldown to prevent multiple hearts from same item
            if (heartsRef.current < 3 && now - lastHeartPickupRef.current > heartCooldown) {
              lastHeartPickupRef.current = now;
              setHearts(prev => {
                const newHearts = Math.min(3, prev + 1);
                heartsRef.current = newHearts;
                return newHearts;
              });
              // Visual feedback
              if (bowRef.current) {
                bowRef.current.children.forEach((child: any) => {
                  if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                    const originalEmissive = child.material.emissive.getHex();
                    child.material.emissive.setHex(0x00ff00);
                    setTimeout(() => {
                      if (child && child.material instanceof THREE.MeshStandardMaterial) {
                        child.material.emissive.setHex(originalEmissive);
                      }
                    }, 500);
                  }
                });
              }
            } else if (heartsRef.current >= 3) {
              // Full hearts - give 200 points instead
              currentScoreRef.current += 200;
              setScore(currentScoreRef.current);
            }
          }
          
          totalHitsRef.current++;
          setAccuracy((totalHitsRef.current / totalShotsRef.current) * 100);
          sceneRef.current.remove(item.mesh);
          return null;
        }
        
        // Check if sub-item is close to player for pickup (not just arrow hit)
        const dx = item.mesh.position.x - bowPositionRef.current.x;
        const dy = item.mesh.position.y - bowPositionRef.current.y;
        const dz = item.mesh.position.z - bowPositionRef.current.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distanceToPlayer < 1.0) {
          // Player picked up item
          if (item.type === 'laser') {
            laserShotsRemainingRef.current += 3;
            setLaserShotsRemaining(laserShotsRemainingRef.current);
            // Visual feedback
            if (bowRef.current) {
              bowRef.current.children.forEach((child: any) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                  const originalEmissive = child.material.emissive.getHex();
                  child.material.emissive.setHex(0xff0000);
                  setTimeout(() => {
                    if (child && child.material instanceof THREE.MeshStandardMaterial) {
                      child.material.emissive.setHex(originalEmissive);
                    }
                  }, 500);
                }
              });
            }
          } else if (item.type === 'heart') {
            // Yellow item: Give heart back if lost one (ONLY ONE PER ITEM), otherwise 200 points
            const now = Date.now();
            const heartCooldown = 100; // 100ms cooldown to prevent multiple hearts from same item
            if (heartsRef.current < 3 && now - lastHeartPickupRef.current > heartCooldown) {
              lastHeartPickupRef.current = now;
              setHearts(prev => {
                const newHearts = Math.min(3, prev + 1);
                heartsRef.current = newHearts;
                return newHearts;
              });
              // Visual feedback
              if (bowRef.current) {
                bowRef.current.children.forEach((child: any) => {
                  if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                    const originalEmissive = child.material.emissive.getHex();
                    child.material.emissive.setHex(0x00ff00);
                    setTimeout(() => {
                      if (child && child.material instanceof THREE.MeshStandardMaterial) {
                        child.material.emissive.setHex(originalEmissive);
                      }
                    }, 500);
                  }
                });
              }
            } else if (heartsRef.current >= 3) {
              currentScoreRef.current += 200;
              setScore(currentScoreRef.current);
            }
          }
          sceneRef.current.remove(item.mesh);
          return null;
        }
        
        // Remove sub-items that are out of bounds
        if (item.mesh.position.y < -10 || 
            Math.abs(item.mesh.position.x) > 30 || 
            Math.abs(item.mesh.position.z) > 30) {
          sceneRef.current.remove(item.mesh);
          return null;
        }
        
        return item;
      }).filter(item => item !== null) as SubItem[];
    };
    
    clockRef.current.start();
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      
      // Recalculate boundaries based on new camera view
      const cameraDistance = cameraRef.current.position.z;
      const fov = cameraRef.current.fov * Math.PI / 180;
      const aspect = cameraRef.current.aspect;
      const visibleHeight = 2 * Math.tan(fov / 2) * cameraDistance;
      const visibleWidth = visibleHeight * aspect;
      const boundaryPadding = 0.8; // Increased padding to ensure collision
      boundaryXRef.current = visibleWidth / 2 - boundaryPadding;
      boundaryYRef.current = visibleHeight / 2 - boundaryPadding;
      
      // Update membrane wall positions
      if (cellMembraneRef.current && sceneRef.current) {
        const membraneGroup = cellMembraneRef.current;
        const wallThickness = 0.3; // Match thicker walls
        const wallHeight = visibleHeight + wallThickness * 2;
        const wallWidth = visibleWidth + wallThickness * 2;
        
        // Update wall positions
        if (membraneGroup.children.length >= 4) {
          membraneGroup.children[0].position.set(0, boundaryYRef.current + wallThickness / 2, 0); // Top
          membraneGroup.children[1].position.set(0, -boundaryYRef.current - wallThickness / 2, 0); // Bottom
          membraneGroup.children[2].position.set(-boundaryXRef.current - wallThickness / 2, 0, 0); // Left
          membraneGroup.children[3].position.set(boundaryXRef.current + wallThickness / 2, 0, 0); // Right
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (containerRef.current && rendererRef.current?.domElement.parentNode) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [createAlienShip, createArrow, createSubItem, playVirusShotSound]);

  // Spawn ships - only when playing - linear directions from different spawn points
  useEffect(() => {
    if (gameState !== 'playing' || !sceneRef.current) {
      return;
    }
    
    // Progressive spawn rate - starts slower, increases every 10 seconds
    const gameStartTime = Date.now();
    let currentSpawnInterval = 3000; // Start at 3 seconds
    
    const spawnShip = () => {
      if (!sceneRef.current) return;
      
      const now = Date.now();
      const elapsedSeconds = (now - gameStartTime) / 1000;
      
      // Increase spawn rate every 10 seconds
      // Start at 3000ms, decrease to 1000ms over 60 seconds
      const intervals = [
        { time: 0, interval: 3000 },    // 0-10s: 3 seconds
        { time: 10, interval: 2500 },   // 10-20s: 2.5 seconds
        { time: 20, interval: 2000 },   // 20-30s: 2 seconds
        { time: 30, interval: 1500 },   // 30-40s: 1.5 seconds
        { time: 40, interval: 1200 },  // 40-50s: 1.2 seconds
        { time: 50, interval: 1000 },   // 50-60s: 1 second
      ];
      
      // Find current interval based on elapsed time
      let targetInterval = intervals[intervals.length - 1].interval;
      for (let i = intervals.length - 1; i >= 0; i--) {
        if (elapsedSeconds >= intervals[i].time) {
          targetInterval = intervals[i].interval;
          break;
        }
      }
      
      currentSpawnInterval = targetInterval;
      
      if (now - lastSpawnRef.current < currentSpawnInterval) return;
      lastSpawnRef.current = now;
      
      const rng = seededRng || {
        nextFloat: (min: number, max: number) => Math.random() * (max - min) + min,
        nextInt: (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min
      };
      
      // Determine ship type (weighted random)
      const typeRoll = rng.nextFloat(0, 1);
      let shipType: ShipType;
      if (typeRoll < 0.5) {
        shipType = 'common'; // 50% - 20 base points
      } else if (typeRoll < 0.8) {
        shipType = 'rare'; // 30% - 50 base points
      } else if (typeRoll < 0.95) {
        shipType = 'epic'; // 15% - 100 base points
      } else {
        shipType = 'legendary'; // 5% - 200 base points
      }
      
      const basePoints = {
        common: 20,
        rare: 50,
        epic: 100,
        legendary: 200
      }[shipType];
      
      // Spawn from random positions around the map - omnidirectional movement
      // ALL ENEMIES ON SAME PLANE (z=0) so they can all be hit
      const angle = rng.nextFloat(0, Math.PI * 2);
      const distance = rng.nextFloat(8, 12);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const z = 0; // All enemies on same plane for consistent hit detection
      
      // Move toward center with some randomness (omnidirectional)
      // Keep movement on same plane (z=0)
      const toCenter = new THREE.Vector3(-x, -y, 0).normalize();
      const randomOffset = new THREE.Vector3(
        rng.nextFloat(-0.5, 0.5),
        rng.nextFloat(-0.5, 0.5),
        0 // No Z variation - keep on same plane
      );
      const direction = toCenter.add(randomOffset).normalize();
      
      // Different sizes - all hittable targets
      const size = rng.nextFloat(0.8, 2.0); // Vary sizes more
      const { group: shipGroup, capsid, legs, zones } = createAlienShip(x, y, z, size, shipType);
      
      // Ensure ship is visible - make it larger and brighter
      shipGroup.scale.set(1.5, 1.5, 1.5); // Scale up for visibility
      
      sceneRef.current.add(shipGroup);
      console.log(`🦠 [DeadShot] Virus ship spawned at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) with size ${size.toFixed(2)}`);
      
      const ship: AlienShip = {
        id: ++lastShipIdRef.current,
        group: shipGroup,
        capsid,
        legs,
        speed: rng.nextFloat(2, 4),
        direction,
        createdAt: now,
        lastShotTime: now - 1000, // Allow first shot after 1 second
        center: new THREE.Vector3(x, y, z),
        size: size * 1.5, // Account for scale
        type: shipType,
        basePoints,
        zones,
        legsDestroyed: 0
      };
      
      shipsRef.current.push(ship);
      console.log(`✅ [DeadShot] Total ships: ${shipsRef.current.length}`);
    };
    
    // Spawn first ship immediately
    spawnShip();
    
    // Progressive spawn rate - check and update interval dynamically
    let spawnIntervalId: NodeJS.Timeout;
    
    const scheduleNextSpawn = () => {
      const now = Date.now();
      const elapsedSeconds = (now - gameStartTime) / 1000;
      
      // Calculate next spawn interval based on elapsed time
      const intervals = [
        { time: 0, interval: 3000 },
        { time: 10, interval: 2500 },
        { time: 20, interval: 2000 },
        { time: 30, interval: 1500 },
        { time: 40, interval: 1200 },
        { time: 50, interval: 1000 },
      ];
      
      let nextInterval = intervals[intervals.length - 1].interval;
      for (let i = intervals.length - 1; i >= 0; i--) {
        if (elapsedSeconds >= intervals[i].time) {
          nextInterval = intervals[i].interval;
          break;
        }
      }
      
      spawnShip();
      spawnIntervalId = setTimeout(scheduleNextSpawn, nextInterval);
    };
    
    // Start progressive spawning
    scheduleNextSpawn();
    
    return () => {
      if (spawnIntervalId) {
        clearTimeout(spawnIntervalId);
      }
    };
  }, [gameState, seededRng, createAlienShip]);

  // Charge up power while holding - FIXED to properly update state and show charge bar
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const chargeInterval = setInterval(() => {
      // Check if drawing and update power - charge faster
      if (isDrawingRef.current && bowPowerRef.current < 100) {
        bowPowerRef.current = Math.min(100, bowPowerRef.current + 3.5); // Increased from 2 to 3.5 for faster charging
        // Force state update to show charge bar moving
        setBowPower(bowPowerRef.current);
        
        // Auto-shoot at max charge
        if (bowPowerRef.current >= 100 && sceneRef.current) {
          isDrawingRef.current = false;
          setIsDrawing(false);
          
          // Shoot arrow - full charge = straight shot
          const power = bowPowerRef.current / 100;
          const aimAngleRad = aimAngleRef.current * Math.PI / 180;
          const baseSpeed = 8 + power * 42;
          
          let vx: number, vy: number;
          
          if (power >= 1.0) {
            // FULL CHARGE = STRAIGHT SHOT
            vx = Math.cos(aimAngleRad) * baseSpeed;
            vy = Math.sin(aimAngleRad) * baseSpeed;
          } else {
            // PARTIAL CHARGE = ARCH SHOT
            // Apply arch angle in the vertical plane while preserving aim direction
            const upwardAngle = Math.PI / 4 * power; // 0 to 45 degrees based on power
            
            // Calculate horizontal speed in aim direction (reduced due to arch)
            const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
            // Calculate upward arch component (always upward, regardless of aim)
            const upwardSpeed = baseSpeed * Math.sin(upwardAngle);
            
            // Apply aim direction to horizontal plane
            vx = Math.cos(aimAngleRad) * horizontalSpeed;
            // Vertical: aim direction component + upward arch component
            // This ensures consistent behavior at all angles including 45 degrees
            vy = Math.sin(aimAngleRad) * horizontalSpeed + upwardSpeed;
          }
          
          const arrowGroup = createArrow();
          // Spawn arrow from white blood cell's current position (not string center)
          const localPos = stringCenterRef.current.clone();
          const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
          const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
          // Add bow's current world position to ensure arrow originates from white blood cell
          arrowGroup.position.set(
            bowPositionRef.current.x + worldX,
            bowPositionRef.current.y + worldY,
            bowPositionRef.current.z + localPos.z
          );
          
          const arrow: Arrow = {
            id: ++lastArrowIdRef.current,
            group: arrowGroup,
            vx,
            vy,
            vz: 0,
            createdAt: Date.now()
          };
          
          sceneRef.current.add(arrowGroup);
          arrowsRef.current.push(arrow);
          totalShotsRef.current++;
          
          // Apply recoil - move white blood cell in opposite direction of shot
          // Power shots move further and faster (scale with power)
          const baseRecoilStrength = 0.15;
          const powerRecoilMultiplier = 1.0 + power * 2.0; // Full power = 3x recoil
          const recoilStrength = baseRecoilStrength * powerRecoilMultiplier;
          const recoilVx = -vx * recoilStrength;
          const recoilVy = -vy * recoilStrength;
          bowVelocityRef.current.x += recoilVx;
          bowVelocityRef.current.y += recoilVy;
          
          // Play player shot sound
          playPlayerShotSound();
          
          // NO POINT DEDUCTION - removed penalty for shooting
          
          bowPowerRef.current = 0;
          setBowPower(0);
        }
      } else if (!isDrawingRef.current && bowPowerRef.current > 0) {
        // Don't reset immediately - allow release to shoot
        // Power will reset after shooting
      }
    }, 50); // Charge every 50ms
    
    return () => clearInterval(chargeInterval);
  }, [gameState, createArrow, playPlayerShotSound]);

  // Handle keyboard for laser shots
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || !sceneRef.current) return;
      
      // Spacebar or 'L' key to fire laser shot
      if ((e.key === ' ' || e.key === 'l' || e.key === 'L') && laserShotsRemainingRef.current > 0 && Date.now() - lastLaserShotRef.current > 200) {
        e.preventDefault();
        lastLaserShotRef.current = Date.now();
        laserShotsRemainingRef.current--;
        setLaserShotsRemaining(laserShotsRemainingRef.current);
        
        // Create laser shot in aim direction
        const aimAngleRad = aimAngleRef.current * Math.PI / 180;
        const laserSpeed = 30; // Fast straight shot
        
        const laserMesh = createLaserShot();
        const localPos = stringCenterRef.current.clone();
        const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
        const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
        
        laserMesh.position.set(
          bowPositionRef.current.x + worldX,
          bowPositionRef.current.y + worldY,
          bowPositionRef.current.z + localPos.z
        );
        laserMesh.rotation.z = aimAngleRad;
        
        const laser: LaserShot = {
          id: Date.now(),
          mesh: laserMesh,
          vx: Math.cos(aimAngleRad) * laserSpeed,
          vy: Math.sin(aimAngleRad) * laserSpeed,
          vz: 0,
          createdAt: Date.now()
        };
        
        sceneRef.current.add(laserMesh);
        laserShotsRef.current.push(laser);
        
        // Play laser sound
        playPlayerShotSound();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, aimAngleRef, createLaserShot, playPlayerShotSound]);

  // Handle mouse/touch for aiming and drawing
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    isDrawingRef.current = true;
    setIsDrawing(true);
    bowPowerRef.current = 0;
    setBowPower(0);
  }, [gameState]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || !isDrawingRef.current) return;
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !cameraRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Convert mouse position to normalized device coordinates (-1 to +1)
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Convert to world coordinates using camera
    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    
    // Get intersection with z=0 plane (where the game is played)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);
    
    // Calculate angle from player position (0,0,0) to intersection point
    const dx = intersectionPoint.x;
    const dy = intersectionPoint.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    mousePosRef.current = { x: dx, y: dy };
    setAimAngle(angle);
    aimAngleRef.current = angle;
  }, [gameState]);

  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || !sceneRef.current) return;
    
    isDrawingRef.current = false;
    setIsDrawing(false);
    
    const power = bowPowerRef.current / 100;
    const aimAngleRad = aimAngleRef.current * Math.PI / 180;
    
    // Velocity scales with power (min 8, max 50)
    const baseSpeed = 8 + power * 42;
    
    let vx: number, vy: number;
    
    if (power >= 1.0) {
      // FULL CHARGE = STRAIGHT SHOT (no arch, just forward)
      vx = Math.cos(aimAngleRad) * baseSpeed;
      vy = Math.sin(aimAngleRad) * baseSpeed; // No upward component
    } else {
      // PARTIAL CHARGE = ARCH SHOT with gravity
      // Low power: goes up then falls down
      // Higher power: higher arch
      // Apply arch angle in the vertical plane while preserving aim direction
      const upwardAngle = Math.PI / 4 * power; // 0 to 45 degrees based on power
      
      // Calculate horizontal speed in aim direction (reduced due to arch)
      const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
      // Calculate upward arch component (always upward, regardless of aim)
      const upwardSpeed = baseSpeed * Math.sin(upwardAngle);
      
      // Apply aim direction to horizontal plane
      vx = Math.cos(aimAngleRad) * horizontalSpeed;
      // Vertical: aim direction component + upward arch component
      // This ensures consistent behavior at all angles including 45 degrees
      vy = Math.sin(aimAngleRad) * horizontalSpeed + upwardSpeed;
    }
    
    const arrowGroup = createArrow();
    // Spawn arrow from white blood cell's current position (not string center)
    const localPos = stringCenterRef.current.clone();
    const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
    const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
    // Add bow's current world position to ensure arrow originates from white blood cell
    arrowGroup.position.set(
      bowPositionRef.current.x + worldX,
      bowPositionRef.current.y + worldY,
      bowPositionRef.current.z + localPos.z
    );
    
    const arrow: Arrow = {
      id: ++lastArrowIdRef.current,
      group: arrowGroup,
      vx,
      vy,
      vz: 0,
      createdAt: Date.now()
    };
    
    sceneRef.current.add(arrowGroup);
    arrowsRef.current.push(arrow);
    totalShotsRef.current++;
    
    // Play player shot sound
    playPlayerShotSound();
    
    // Apply recoil - move white blood cell in opposite direction of shot
    // Power shots move further and faster (scale with power)
    const baseRecoilStrength = 0.15;
    const powerRecoilMultiplier = 1.0 + power * 2.0; // Full power = 3x recoil
    const recoilStrength = baseRecoilStrength * powerRecoilMultiplier;
    const recoilVx = -vx * recoilStrength;
    const recoilVy = -vy * recoilStrength;
    bowVelocityRef.current.x += recoilVx;
    bowVelocityRef.current.y += recoilVy;
    
    // DEDUCT 20 POINTS FOR EVERY ARROW SHOT
    currentScoreRef.current = Math.max(0, currentScoreRef.current - 20);
    setScore(currentScoreRef.current);
    
    // Reset power after shooting
    bowPowerRef.current = 0;
    setBowPower(0);
  }, [gameState, createArrow, playPlayerShotSound]);

  // Start game
  const startGame = () => {
    setGameState('countdown');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setGameState('playing');
          gameStartTimeRef.current = Date.now();
          clockRef.current.start();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    countdownRef.current = countdownInterval;
  };

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const endGame = () => {
    setGameState('ended');
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Clean up all meshes
    if (sceneRef.current) {
      arrowsRef.current.forEach(arrow => sceneRef.current!.remove(arrow.group));
      shipsRef.current.forEach(ship => sceneRef.current!.remove(ship.group));
      subItemsRef.current.forEach(item => sceneRef.current!.remove(item.mesh));
      enemyProjectilesRef.current.forEach(proj => sceneRef.current!.remove(proj.mesh));
      if (aimPathRef.current) sceneRef.current.remove(aimPathRef.current);
    }
    
    onGameEnd({
      score: currentScoreRef.current,
      accuracy: totalShotsRef.current > 0 ? (totalHitsRef.current / totalShotsRef.current) * 100 : 0
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ margin: 0, padding: 0, backgroundColor: '#8B0000' }}>
      {/* 3D Scene Container - MUST be full size and positioned */}
      <div 
        ref={containerRef}
        className="w-full h-full"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          touchAction: 'none',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />
      
      {/* UI Overlay - Only show when playing */}
      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start text-white pointer-events-none">
            <div>
              <div className="text-2xl font-bold">Score: {score.toFixed(2)}</div>
              <div className="text-sm">Accuracy: {accuracy.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Time: {timeLeft}s</div>
              <div className="text-sm">Power: {bowPower.toFixed(0)}%</div>
            </div>
          </div>
          
          {/* Hearts Display */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex gap-2 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`text-3xl ${i < hearts ? 'text-red-500' : 'text-gray-500 opacity-30'}`}
              >
                ❤️
              </div>
            ))}
          </div>
          
          {/* Laser Shots Display */}
          {laserShotsRemaining > 0 && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
              <div className="bg-red-500/80 backdrop-blur-xl rounded-lg px-4 py-2 border-2 border-red-400 shadow-lg animate-pulse">
                <div className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <span>Laser Shots: {laserShotsRemaining}</span>
                  <span className="text-sm text-red-200">(Press Space/L)</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Shield Display */}
          {hasShieldRef.current && (
            <div className="absolute top-20 right-4 z-10 pointer-events-none">
              <div className="bg-cyan-500/80 backdrop-blur-xl rounded-lg px-4 py-2 border-2 border-cyan-400 shadow-lg">
                <div className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <span>Shield Active</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Charge Bar - Always visible when playing */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-80 pointer-events-none">
            <div className="text-white text-sm mb-2 text-center font-bold">CHARGE POWER</div>
            <div className="h-8 bg-black/70 rounded-full border-2 border-cyan-400 overflow-hidden shadow-lg">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-100 ease-linear rounded-full relative"
                style={{ width: `${Math.max(0, Math.min(100, bowPower))}%` }}
              >
                {/* Glow effect when charging */}
                {bowPower > 0 && (
                  <div 
                    className="absolute inset-0 bg-white/40 animate-pulse"
                    style={{ width: '100%' }}
                  />
                )}
                {/* Max charge indicator */}
                {bowPower >= 100 && (
                  <div className="absolute inset-0 bg-white/60 animate-pulse" />
                )}
              </div>
            </div>
            <div className="text-white text-xs mt-1 text-center">
              {bowPower >= 100 ? 'MAX CHARGE - READY!' : isDrawing ? `Charging... ${bowPower.toFixed(0)}%` : 'Hold to charge'}
            </div>
          </div>
        </>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20">
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto text-center border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              🎯 Dead Shot
            </h1>
            <p className="text-white mb-6">
              Control your white blood cell, aim at viruses, and destroy them with precision shots!
            </p>
            <div className="space-y-3 text-left text-white/90 mb-6 text-sm">
              <div className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span><strong>Click and hold</strong> to charge, <strong>release to shoot</strong> - Aim path shows trajectory</span>
              </div>
              <div className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span><strong>Guide laser</strong> shows arrow trajectory halfway - adjust aim based on charge!</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span><strong>Headshot (center capsid):</strong> 200 points! Leg hits: 50 points each</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span><strong>3 Hearts:</strong> Viruses shoot projectiles - if hit, lose a heart. Destroy projectiles with arrows!</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span><strong>Full charge = straight shot</strong>, partial charge = arch shot with gravity</span>
              </div>
              <div className="flex items-start">
                <span className="text-orange-400 mr-2">•</span>
                <span><strong>Ship escapes:</strong> -50 points. Different enemy sizes, all hittable targets</span>
              </div>
              <div className="flex items-start">
                <span className="text-pink-400 mr-2">•</span>
                <span><strong>Fair play:</strong> RNG seeding and RLS enabled for skill-based competition</span>
              </div>
            </div>
            <div className="flex gap-4">
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-2xl transition-all"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={startGame}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-2xl transition-all"
              >
                🎯 Start Shooting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="text-8xl font-bold text-white animate-pulse">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {/* End Screen */}
      {gameState === 'ended' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
            <p className="text-2xl mb-2">Final Score: {score.toFixed(2)}</p>
            <p className="text-xl">Accuracy: {accuracy.toFixed(1)}%</p>
          </div>
        </div>
      )}
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 text-white text-xs bg-black/50 p-2 rounded z-30">
          Ships: {shipsRef.current.length} | Arrows: {arrowsRef.current.length} | SubItems: {subItemsRef.current.length}
        </div>
      )}
    </div>
  );
}
