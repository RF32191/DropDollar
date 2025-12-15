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

interface AlienShip {
  id: number;
  group: THREE.Group;
  speed: number;
  direction: THREE.Vector3;
  createdAt: number;
  center: THREE.Vector3;
  size: number;
  type: ShipType;
  basePoints: number;
  zones: Array<{ mesh: THREE.Mesh; radius: number; multiplier: number; color: number }>; // Colored zones for scoring
}

interface SubItem {
  id: number;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  type: 'bonus' | 'multiplier' | 'time';
  createdAt: number;
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
  
  // Sync gameState to ref for animation loop
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
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
  const lastSpawnRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
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

  // Create neon alien ship with proper 3D geometry - improved design with types
  // Returns both the group and zones array
  const createAlienShip = useCallback((x: number, y: number, z: number, size: number, type: ShipType = 'common'): { group: THREE.Group; zones: Array<{ mesh: THREE.Mesh; radius: number; multiplier: number; color: number }> } => {
    const shipGroup = new THREE.Group();
    
    // Ship colors based on type
    const shipColors = {
      common: { body: 0x00ffff, wing: 0x0088ff, glow: 0x00ffff }, // Cyan
      rare: { body: 0xff00ff, wing: 0xff0088, glow: 0xff00ff }, // Magenta
      epic: { body: 0xffff00, wing: 0xff8800, glow: 0xffff00 }, // Yellow
      legendary: { body: 0xff0088, wing: 0xff00ff, glow: 0xff0088 } // Hot Pink
    };
    
    const colors = shipColors[type];
    
    // Main body - sleek futuristic ship design
    const bodyGeometry = new THREE.OctahedronGeometry(size * 0.6, 0);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colors.body,
      emissive: colors.body,
      emissiveIntensity: 3.0, // Much brighter neon
      metalness: 0.95,
      roughness: 0.05
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 4;
    body.position.y = size * 0.2;
    shipGroup.add(body);
    
    // Forward hull section
    const frontGeometry = new THREE.ConeGeometry(size * 0.3, size * 0.8, 8);
    const frontMaterial = new THREE.MeshStandardMaterial({
      color: colors.body,
      emissive: colors.body,
      emissiveIntensity: 3.5
    });
    const front = new THREE.Mesh(frontGeometry, frontMaterial);
    front.rotation.z = Math.PI;
    front.position.y = size * 0.8;
    shipGroup.add(front);
    
    // Wings - more detailed swept-back design
    const wingGeometry = new THREE.BoxGeometry(size * 0.6, size * 0.2, size * 1.2);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: colors.wing,
      emissive: colors.wing,
      emissiveIntensity: 2.5
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-size * 0.7, size * 0.3, 0);
    leftWing.rotation.z = -0.3;
    leftWing.rotation.x = 0.1;
    shipGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(size * 0.7, size * 0.3, 0);
    rightWing.rotation.z = 0.3;
    rightWing.rotation.x = 0.1;
    shipGroup.add(rightWing);
    
    // Wing tips (smaller details)
    const tipGeometry = new THREE.ConeGeometry(size * 0.15, size * 0.4, 6);
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: colors.wing,
      emissive: colors.wing,
      emissiveIntensity: 3.0
    });
    
    const leftTip = new THREE.Mesh(tipGeometry, tipMaterial);
    leftTip.position.set(-size * 0.7, size * 0.5, size * 0.6);
    leftTip.rotation.z = -0.3;
    shipGroup.add(leftTip);
    
    const rightTip = new THREE.Mesh(tipGeometry, tipMaterial);
    rightTip.position.set(size * 0.7, size * 0.5, size * 0.6);
    rightTip.rotation.z = 0.3;
    shipGroup.add(rightTip);
    
    // Cockpit/canopy - more detailed
    const canopyGeometry = new THREE.SphereGeometry(size * 0.3, 16, 16);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.8
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.y = size * 0.7;
    shipGroup.add(canopy);
    
    // Canopy frame
    const frameGeometry = new THREE.RingGeometry(size * 0.25, size * 0.3, 16);
    const frameMaterial = new THREE.MeshBasicMaterial({
      color: colors.body,
      emissive: colors.body,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = size * 0.7;
    frame.rotation.x = Math.PI / 2;
    shipGroup.add(frame);
    
    // Glow effect - pulsing sphere (brighter)
    const glowGeometry = new THREE.SphereGeometry(size * 0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: 0.6
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = size * 0.5;
    shipGroup.add(glow);
    
    // Engine trails - brighter and more visible
    const trailGeometry = new THREE.ConeGeometry(size * 0.2, size * 0.4, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: 0.8
    });
    const trail1 = new THREE.Mesh(trailGeometry, trailMaterial);
    trail1.position.set(-size * 0.35, -size * 0.3, 0);
    trail1.rotation.z = Math.PI;
    shipGroup.add(trail1);
    
    const trail2 = new THREE.Mesh(trailGeometry, trailMaterial);
    trail2.position.set(size * 0.35, -size * 0.3, 0);
    trail2.rotation.z = Math.PI;
    shipGroup.add(trail2);
    
    // Add colored scoring zones (rings) - center is highest value
    const zones: Array<{ mesh: THREE.Mesh; radius: number; multiplier: number; color: number }> = [];
    
    // Center zone (gold/yellow) - 3x multiplier
    const centerZoneGeometry = new THREE.RingGeometry(0, size * 0.15, 16);
    const centerZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const centerZone = new THREE.Mesh(centerZoneGeometry, centerZoneMaterial);
    centerZone.position.y = size * 0.5;
    centerZone.rotation.x = Math.PI / 2;
    shipGroup.add(centerZone);
    zones.push({ mesh: centerZone, radius: size * 0.15, multiplier: 3.0, color: 0xffff00 });
    
    // Middle zone (green) - 2x multiplier
    const middleZoneGeometry = new THREE.RingGeometry(size * 0.15, size * 0.35, 16);
    const middleZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const middleZone = new THREE.Mesh(middleZoneGeometry, middleZoneMaterial);
    middleZone.position.y = size * 0.5;
    middleZone.rotation.x = Math.PI / 2;
    shipGroup.add(middleZone);
    zones.push({ mesh: middleZone, radius: size * 0.35, multiplier: 2.0, color: 0x00ff00 });
    
    // Outer zone (blue) - 1.5x multiplier
    const outerZoneGeometry = new THREE.RingGeometry(size * 0.35, size * 0.6, 16);
    const outerZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const outerZone = new THREE.Mesh(outerZoneGeometry, outerZoneMaterial);
    outerZone.position.y = size * 0.5;
    outerZone.rotation.x = Math.PI / 2;
    shipGroup.add(outerZone);
    zones.push({ mesh: outerZone, radius: size * 0.6, multiplier: 1.5, color: 0x0088ff });
    
    shipGroup.position.set(x, y, z);
    return { group: shipGroup, zones };
  }, []);

  // Create arrow with proper 3D geometry - more arrow-shaped and neon
  const createArrow = useCallback((): THREE.Group => {
    const arrowGroup = new THREE.Group();
    
    // Arrow shaft (neon cyan cylinder - longer and thinner)
    const shaftGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 12);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.5, // Much brighter
      metalness: 0.9,
      roughness: 0.1
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.z = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head (sharp pyramid - more arrow-like)
    const headGeometry = new THREE.ConeGeometry(0.08, 0.2, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.0, // Very bright
      metalness: 0.95,
      roughness: 0.05
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 0.25; // Further forward
    arrowGroup.add(head);
    
    // Arrow tip point (extra sharp tip)
    const tipGeometry = new THREE.ConeGeometry(0.02, 0.05, 6);
    const tipMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 4.0
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.x = 0.35;
    arrowGroup.add(tip);
    
    // Fletching (feathers at back - more visible)
    const fletchGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.03);
    const fletchMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.0
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
    
    // Trail effect - brighter glow
    const trailGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.x = -0.15;
    arrowGroup.add(trail);
    
    // Outer glow ring
    const glowRingGeometry = new THREE.RingGeometry(0.05, 0.08, 16);
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
    glowRing.position.x = -0.15;
    glowRing.rotation.x = Math.PI / 2;
    arrowGroup.add(glowRing);
    
    return arrowGroup;
  }, []);

  // Create sub-item mesh
  const createSubItem = useCallback((type: 'bonus' | 'multiplier' | 'time'): THREE.Mesh => {
    const colors = {
      bonus: 0x00ff00,
      multiplier: 0xffff00,
      time: 0xff00ff
    };
    
    const geometry = new THREE.OctahedronGeometry(0.2, 0);
    const material = new THREE.MeshStandardMaterial({
      color: colors[type],
      emissive: colors[type],
      emissiveIntensity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
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
    scene.background = new THREE.Color(0x000011);
    
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
    
    // TEST CUBE - Verify rendering works
    const testCubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const testCubeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.0
    });
    const testCube = new THREE.Mesh(testCubeGeometry, testCubeMaterial);
    testCube.position.set(3, 0, 0);
    scene.add(testCube);
    console.log('🧪 [DeadShot] Test cube added at (3, 0, 0)');
    
    // Create spaceship bow - futuristic design
    const bowGroup = new THREE.Group();
    
    // Main hull (central body) - sleek spaceship design
    const hullGeometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const hullMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 3.0,
      metalness: 0.95,
      roughness: 0.05
    });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    hull.rotation.z = Math.PI;
    hull.position.y = 0.3;
    bowGroup.add(hull);
    
    // Left wing/engine pod
    const leftWingGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.4);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.5,
      metalness: 0.9,
      roughness: 0.1
    });
    const leftWing = new THREE.Mesh(leftWingGeometry, wingMaterial);
    leftWing.position.set(-0.6, 0.2, 0);
    leftWing.rotation.z = 0.2;
    bowGroup.add(leftWing);
    
    // Right wing/engine pod
    const rightWing = new THREE.Mesh(leftWingGeometry, wingMaterial);
    rightWing.position.set(0.6, 0.2, 0);
    rightWing.rotation.z = -0.2;
    bowGroup.add(rightWing);
    
    // Engine glow (left)
    const leftEngineGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, emissive: 0x00ffff, transparent: true, opacity: 0.8 })
    );
    leftEngineGlow.position.set(-0.6, -0.2, 0);
    bowGroup.add(leftEngineGlow);
    
    // Engine glow (right)
    const rightEngineGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, emissive: 0x00ffff, transparent: true, opacity: 0.8 })
    );
    rightEngineGlow.position.set(0.6, -0.2, 0);
    bowGroup.add(rightEngineGlow);
    
    // Cockpit/canopy
    const cockpitGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.7
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.6, 0.1);
    bowGroup.add(cockpit);
    
    // Energy wire/string (laser beam between wings) - THIS IS WHERE ARROWS SPAWN
    const stringPoints = [
      new THREE.Vector3(-0.6, 0.2, 0),
      new THREE.Vector3(0, 0, 0), // Center point - arrow spawn location
      new THREE.Vector3(0.6, 0.2, 0)
    ];
    const stringGeometry = new THREE.BufferGeometry().setFromPoints(stringPoints);
    const stringMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      linewidth: 8,
      transparent: true,
      opacity: 1.0
    });
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(bowString);
    bowStringRef.current = bowString;
    
    // Energy glow around ship
    const glowGeometry = new THREE.RingGeometry(0.6, 1.2, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
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
      frameCount++;
      
      // Log every 60 frames to verify animation is running
      if (frameCount % 60 === 0) {
        console.log(`🔄 [DeadShot] Animation running - Frame ${frameCount}, Scene children: ${sceneRef.current.children.length}`);
      }
      
      // ALWAYS render the scene (bow should be visible even when ready)
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Only update game logic when playing
      if (gameStateRef.current !== 'playing') {
        return;
      }
      
      // Update bow animation with charge effects
      if (bowRef.current && bowStringRef.current) {
        const drawProgress = bowPowerRef.current / 100;
        bowRef.current.rotation.z = -aimAngleRef.current * Math.PI / 180;
        
        // Animate bow string when drawing (spaceship wire)
        const stringPoints = [
          new THREE.Vector3(-0.6, 0.2, 0),
          new THREE.Vector3(0, 0 - drawProgress * 0.4, 0), // Draw back center point
          new THREE.Vector3(0.6, 0.2, 0)
        ];
        bowStringRef.current.geometry.setFromPoints(stringPoints);
        // Update string center position for arrow spawning
        stringCenterRef.current.set(0, 0 - drawProgress * 0.4, 0);
        
        // Increase string brightness when charging
        if (bowStringRef.current.material instanceof THREE.LineBasicMaterial) {
          const intensity = 1.0 + drawProgress * 2.0; // 1.0 to 3.0
          bowStringRef.current.material.color.setHex(0x00ffff);
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
      
      // Update arrows with smooth arch physics
      arrowsRef.current = arrowsRef.current.map(arrow => {
        // Smooth physics with reduced gravity for better arch
        const gravity = 5.0; // Reduced gravity for smoother arch
        arrow.group.position.x += arrow.vx * delta;
        arrow.group.position.y += arrow.vy * delta;
        arrow.group.position.z += arrow.vz * delta;
        arrow.vy -= gravity * delta; // Smoother gravity
        
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
          
          if (distance < ship.size) {
            // Hit! Check which colored zone was hit
            const centerDx = arrow.group.position.x - ship.group.position.x;
            const centerDy = arrow.group.position.y - ship.group.position.y;
            const centerDz = arrow.group.position.z - ship.group.position.z;
            const distanceFromCenter = Math.sqrt(centerDx * centerDx + centerDy * centerDy + centerDz * centerDz);
            
            // Find which zone was hit (check from smallest to largest)
            let zoneMultiplier = 1.0; // Default multiplier
            for (let i = ship.zones.length - 1; i >= 0; i--) {
              if (distanceFromCenter <= ship.zones[i].radius) {
                zoneMultiplier = ship.zones[i].multiplier;
                break;
              }
            }
            
            // Calculate points based on ship type and zone hit
            const basePoints = ship.basePoints;
            const points = basePoints * zoneMultiplier;
            
            currentScoreRef.current += points;
            totalHitsRef.current++;
            setScore(currentScoreRef.current);
            setAccuracy((totalHitsRef.current / totalShotsRef.current) * 100);
            
            // Spawn sub-items
            for (let i = 0; i < 3; i++) {
              const angle = (Math.PI * 2 * i) / 3;
              const subItemMesh = createSubItem(['bonus', 'multiplier', 'time'][i] as 'bonus' | 'multiplier' | 'time');
              subItemMesh.position.copy(ship.group.position);
              
              const subItem: SubItem = {
                id: ++lastSubItemIdRef.current,
                mesh: subItemMesh,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 + 1,
                vz: Math.sin(angle) * 2,
                type: ['bonus', 'multiplier', 'time'][i] as 'bonus' | 'multiplier' | 'time',
                createdAt: Date.now()
              };
              
              sceneRef.current.add(subItemMesh);
              subItemsRef.current.push(subItem);
            }
            
            // Remove ship
            sceneRef.current.remove(ship.group);
            shipsRef.current.splice(shipIndex, 1);
            
            // Remove arrow
            sceneRef.current.remove(arrow.group);
            return null;
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
      
      // Update ships
      shipsRef.current = shipsRef.current.map(ship => {
        ship.group.position.add(ship.direction.clone().multiplyScalar(ship.speed * delta));
        
        // Rotate ship for visual effect
        ship.group.rotation.y += delta * 2;
        ship.group.rotation.x += delta * 0.5;
        
        // Animate glow pulsing
        const glowMesh = ship.group.children.find(child => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial);
        if (glowMesh) {
          const time = Date.now() * 0.001;
          (glowMesh as THREE.Mesh).scale.setScalar(1 + Math.sin(time * 3) * 0.2);
        }
        
        // Remove ships that are out of bounds
        if (Math.abs(ship.group.position.x) > 30 || 
            Math.abs(ship.group.position.y) > 30 || 
            Math.abs(ship.group.position.z) > 30) {
          sceneRef.current.remove(ship.group);
          return null;
        }
        
        return ship;
      }).filter(ship => ship !== null) as AlienShip[];
      
      // Update sub-items with physics
      subItemsRef.current = subItemsRef.current.map(item => {
        item.mesh.position.x += item.vx * delta;
        item.mesh.position.y += item.vy * delta;
        item.mesh.position.z += item.vz * delta;
        item.vy -= 9.8 * delta; // Gravity
        
        // Rotate sub-item
        item.mesh.rotation.x += delta * 3;
        item.mesh.rotation.y += delta * 3;
        
        // Check if arrow hits sub-item
        const arrowHit = arrowsRef.current.find(arrow => {
          const dx = arrow.group.position.x - item.mesh.position.x;
          const dy = arrow.group.position.y - item.mesh.position.y;
          const dz = arrow.group.position.z - item.mesh.position.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.5;
        });
        
        if (arrowHit) {
          // Bonus points for hitting sub-item
          const bonusPoints = item.type === 'bonus' ? 25 : item.type === 'multiplier' ? 50 : 10;
          currentScoreRef.current += bonusPoints;
          setScore(currentScoreRef.current);
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
  }, [createAlienShip, createArrow, createSubItem]);

  // Spawn ships - only when playing - linear directions from different spawn points
  useEffect(() => {
    if (gameState !== 'playing' || !sceneRef.current) {
      return;
    }
    
    const spawnShip = () => {
      if (!sceneRef.current) return;
      
      const now = Date.now();
      if (now - lastSpawnRef.current < 2000) return;
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
      
      // Spawn from different sides but move linearly toward center
      const side = rng.nextInt(0, 4);
      let x, y, z;
      let direction: THREE.Vector3;
      
      switch (side) {
        case 0: // Left - move right toward center
          x = -8;
          y = rng.nextFloat(-4, 4);
          z = rng.nextFloat(-2, 2);
          direction = new THREE.Vector3(1, rng.nextFloat(-0.2, 0.2), rng.nextFloat(-0.1, 0.1)).normalize();
          break;
        case 1: // Right - move left toward center
          x = 8;
          y = rng.nextFloat(-4, 4);
          z = rng.nextFloat(-2, 2);
          direction = new THREE.Vector3(-1, rng.nextFloat(-0.2, 0.2), rng.nextFloat(-0.1, 0.1)).normalize();
          break;
        case 2: // Top - move down toward center
          x = rng.nextFloat(-4, 4);
          y = 6;
          z = rng.nextFloat(-2, 2);
          direction = new THREE.Vector3(rng.nextFloat(-0.2, 0.2), -1, rng.nextFloat(-0.1, 0.1)).normalize();
          break;
        default: // Bottom - move up toward center
          x = rng.nextFloat(-4, 4);
          y = -6;
          z = rng.nextFloat(-2, 2);
          direction = new THREE.Vector3(rng.nextFloat(-0.2, 0.2), 1, rng.nextFloat(-0.1, 0.1)).normalize();
          break;
      }
      
      const size = rng.nextFloat(0.8, 1.5);
      const { group: shipGroup, zones } = createAlienShip(x, y, z, size, shipType);
      
      sceneRef.current.add(shipGroup);
      
      const ship: AlienShip = {
        id: ++lastShipIdRef.current,
        group: shipGroup,
        speed: rng.nextFloat(2, 4),
        direction,
        createdAt: now,
        center: new THREE.Vector3(x, y, z),
        size,
        type: shipType,
        basePoints,
        zones
      };
      
      shipsRef.current.push(ship);
    };
    
    // Spawn first ship immediately
    spawnShip();
    
    const spawnInterval = setInterval(spawnShip, 2000);
    return () => {
      clearInterval(spawnInterval);
    };
  }, [gameState, seededRng, createAlienShip]);

  // Charge up power while holding
  useEffect(() => {
    if (gameState !== 'playing' || !isDrawingRef.current) return;
    
    const chargeInterval = setInterval(() => {
      if (isDrawingRef.current && bowPowerRef.current < 100) {
        bowPowerRef.current = Math.min(100, bowPowerRef.current + 2);
        setBowPower(bowPowerRef.current);
        
        // Auto-shoot at max charge
        if (bowPowerRef.current >= 100 && sceneRef.current) {
          isDrawingRef.current = false;
          setIsDrawing(false);
          
          // Shoot arrow with smooth arch trajectory based on power
          const power = bowPowerRef.current / 100;
          const aimAngleRad = aimAngleRef.current * Math.PI / 180;
          const baseSpeed = 18 + power * 28; // Speed increases with power
          // Add upward component for arch - more power = higher arch (smoother curve)
          const upwardAngle = Math.PI / 6 * power; // 0 to 30 degrees for smoother arch
          const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
          const verticalSpeed = baseSpeed * Math.sin(upwardAngle);
          
          const arrowGroup = createArrow();
          // Spawn arrow at string center position (on the wire)
          // Calculate world position based on bow rotation
          const localPos = stringCenterRef.current.clone();
          const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
          const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
          arrowGroup.position.set(worldX, worldY, localPos.z);
          
          const arrow: Arrow = {
            id: ++lastArrowIdRef.current,
            group: arrowGroup,
            vx: Math.cos(aimAngleRad) * horizontalSpeed,
            vy: Math.sin(aimAngleRad) * horizontalSpeed + verticalSpeed, // Add upward component
            vz: 0,
            createdAt: Date.now()
          };
          
          sceneRef.current.add(arrowGroup);
          arrowsRef.current.push(arrow);
          totalShotsRef.current++;
          
          bowPowerRef.current = 0;
          setBowPower(0);
        }
      }
    }, 50); // Charge every 50ms
    
    return () => clearInterval(chargeInterval);
  }, [gameState, createArrow]);

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
    if (!rect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    mousePosRef.current = { x, y };
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    setAimAngle(angle);
    aimAngleRef.current = angle;
  }, [gameState]);

  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || !isDrawingRef.current || !sceneRef.current) return;
    
    isDrawingRef.current = false;
    setIsDrawing(false);
    
    // Shoot arrow with smooth arch trajectory based on power
    const power = bowPowerRef.current / 100;
    const aimAngleRad = aimAngleRef.current * Math.PI / 180;
    const baseSpeed = 18 + power * 28; // Speed increases with power
    // Add upward component for arch - more power = higher arch (smoother curve)
    const upwardAngle = Math.PI / 6 * power; // 0 to 30 degrees for smoother arch
    const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
    const verticalSpeed = baseSpeed * Math.sin(upwardAngle);
    
    const arrowGroup = createArrow();
    // Spawn arrow at string center position (on the wire)
    // Calculate world position based on bow rotation
    const localPos = stringCenterRef.current.clone();
    const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
    const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
    arrowGroup.position.set(worldX, worldY, localPos.z);
    
    const arrow: Arrow = {
      id: ++lastArrowIdRef.current,
      group: arrowGroup,
      vx: Math.cos(aimAngleRad) * horizontalSpeed,
      vy: Math.sin(aimAngleRad) * horizontalSpeed + verticalSpeed, // Add upward component
      vz: 0,
      createdAt: Date.now()
    };
    
    sceneRef.current.add(arrowGroup);
    arrowsRef.current.push(arrow);
    totalShotsRef.current++;
    
    bowPowerRef.current = 0;
    setBowPower(0);
  }, [gameState, createArrow]);

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
    }
    
    onGameEnd({
      score: currentScoreRef.current,
      accuracy: totalShotsRef.current > 0 ? (totalHitsRef.current / totalShotsRef.current) * 100 : 0
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 overflow-hidden" style={{ margin: 0, padding: 0 }}>
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
          
          {/* Charge Bar - Show when holding */}
          {(isDrawing || bowPower > 0) && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-64 pointer-events-none">
              <div className="text-white text-sm mb-2 text-center font-bold">CHARGE POWER</div>
              <div className="h-6 bg-black/50 rounded-full border-2 border-cyan-400 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-75 ease-linear rounded-full relative"
                  style={{ width: `${bowPower}%` }}
                >
                  {/* Glow effect when charging */}
                  {bowPower > 0 && (
                    <div 
                      className="absolute inset-0 bg-white/30 animate-pulse"
                      style={{ width: '100%' }}
                    />
                  )}
                  {/* Max charge indicator */}
                  {bowPower >= 100 && (
                    <div className="absolute inset-0 bg-white/50 animate-pulse" />
                  )}
                </div>
              </div>
              <div className="text-white text-xs mt-1 text-center">
                {bowPower >= 100 ? 'MAX CHARGE - READY!' : isDrawing ? 'Charging...' : 'Hold to charge'}
              </div>
            </div>
          )}
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
              Draw your laser bow, aim at alien ships, and hit center shots for maximum points!
            </p>
            <div className="space-y-4 text-left text-white/90 mb-6">
              <div className="flex items-start">
                <span className="text-cyan-400 mr-2">•</span>
                <span>Click and hold to draw bow, release to shoot</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-400 mr-2">•</span>
                <span>Hit alien ships for 10-50 points</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                <span>Center shots give 50-100 points!</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                <span>Hit sub-items for bonus points</span>
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
