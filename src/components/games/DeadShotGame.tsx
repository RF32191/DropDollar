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
  type: 'bonus' | 'multiplier' | 'time';
  createdAt: number;
}

interface EnemyProjectile {
  id: number;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
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
  const [hearts, setHearts] = useState(3);
  const [backgroundFlash, setBackgroundFlash] = useState(0);
  
  // Sync gameState and hearts to refs for animation loop
  useEffect(() => {
    gameStateRef.current = gameState;
    heartsRef.current = hearts;
  }, [gameState, hearts]);
  
  // Background flash animation
  useEffect(() => {
    if (gameState !== 'playing') return;
    const flashInterval = setInterval(() => {
      setBackgroundFlash(prev => (prev + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(flashInterval);
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
  const enemyProjectilesRef = useRef<EnemyProjectile[]>([]);
  const aimPathRef = useRef<THREE.Line | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const heartsRef = useRef(3);
  const lastHitTimeRef = useRef<number>(0);
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
    // Dark crimson background (will flash)
    scene.background = new THREE.Color(0x4a0000);
    
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
      color: 0x88ccff,
      linewidth: 3,
      transparent: true,
      opacity: 0.6,
      dashed: true
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
        console.log(`🔄 [DeadShot] Animation running - Frame ${frameCount}, Scene children: ${sceneRef.current.children.length}, Ships: ${shipsRef.current.length}`);
      }
      
      // Update background flash (dark crimson pulsing)
      if (gameStateRef.current === 'playing' && sceneRef.current) {
        const flashIntensity = 0.4 + Math.sin(backgroundFlash) * 0.1;
        sceneRef.current.background = new THREE.Color(
          0x4a0000 + Math.floor(flashIntensity * 0x100000)
        );
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
        
        // Animate bow string when drawing (white blood cell wire)
        const stringPoints = [
          new THREE.Vector3(-0.5, 0, 0),
          new THREE.Vector3(0, 0 - drawProgress * 0.4, 0), // Draw back center point
          new THREE.Vector3(0.5, 0, 0)
        ];
        bowStringRef.current.geometry.setFromPoints(stringPoints);
        // Update string center position for arrow spawning
        stringCenterRef.current.set(0, 0 - drawProgress * 0.4, 0);
        
        // Update aim path preview (trajectory like Peggle)
        if (aimPathRef.current && isDrawingRef.current) {
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
          
          // Simulate trajectory path
          const pathPoints: THREE.Vector3[] = [];
          const localPos = stringCenterRef.current.clone();
          let px = localPos.x;
          let py = localPos.y;
          let pz = localPos.z;
          let pvx = vx;
          let pvy = vy;
          const gravity = 9.8;
          
          for (let i = 0; i < 30; i++) {
            pathPoints.push(new THREE.Vector3(px, py, pz));
            px += pvx * 0.1;
            py += pvy * 0.1;
            pvy -= gravity * 0.1;
            
            if (py < -10 || Math.abs(px) > 30) break;
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
        arrow.group.position.x += arrow.vx * delta;
        arrow.group.position.y += arrow.vy * delta;
        arrow.group.position.z += arrow.vz * delta;
        arrow.vy -= gravity * delta; // Gravity always pulls down
        
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
              ship.legsDestroyed++;
              
              // Hide leg visually
              leg.mesh.visible = false;
              
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
        
        // Enemy shooting - each ship shoots independently at player (center 0,0,0)
        const now = Date.now();
        if (now - ship.lastShotTime > 2000 && sceneRef.current) { // Each ship shoots every 2 seconds
          ship.lastShotTime = now;
          
          // Calculate direction to player
          const toPlayer = new THREE.Vector3(0, 0, 0).sub(ship.group.position).normalize();
          
          // Create projectile
          const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
          const projectileMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 3.0
          });
          const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
          projectileMesh.position.copy(ship.group.position);
          sceneRef.current.add(projectileMesh);
          
          const projectile: EnemyProjectile = {
            id: Date.now() + Math.random(),
            mesh: projectileMesh,
            vx: toPlayer.x * 5,
            vy: toPlayer.y * 5,
            vz: toPlayer.z * 5,
            createdAt: now
          };
          
          enemyProjectilesRef.current.push(projectile);
        }
        
        // Remove ships that are out of bounds - DEDUCT 50 POINTS if ship escapes
        if (Math.abs(ship.group.position.x) > 30 || 
            Math.abs(ship.group.position.y) > 30 || 
            Math.abs(ship.group.position.z) > 30) {
          // Ship escaped - deduct 50 points
          currentScoreRef.current = Math.max(0, currentScoreRef.current - 50);
          setScore(currentScoreRef.current);
          
          sceneRef.current.remove(ship.group);
          return null;
        }
        
        return ship;
      }).filter(ship => ship !== null) as AlienShip[];
      
      // Update enemy projectiles
      enemyProjectilesRef.current = enemyProjectilesRef.current.map(projectile => {
        projectile.mesh.position.x += projectile.vx * delta;
        projectile.mesh.position.y += projectile.vy * delta;
        projectile.mesh.position.z += projectile.vz * delta;
        
        // Check collision with player (at center 0,0,0)
        const dx = projectile.mesh.position.x;
        const dy = projectile.mesh.position.y;
        const dz = projectile.mesh.position.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distanceToPlayer < 0.8 && heartsRef.current > 0 && Date.now() - lastHitTimeRef.current > 1000) {
          // Hit player - lose a heart
          lastHitTimeRef.current = Date.now();
          setHearts(prev => {
            const newHearts = Math.max(0, prev - 1);
            heartsRef.current = newHearts;
            if (newHearts <= 0) {
              endGame();
            }
            return newHearts;
          });
          
          sceneRef.current.remove(projectile.mesh);
          return null;
        }
        
        // Check if arrow hits projectile (can destroy it)
        const arrowHit = arrowsRef.current.find(arrow => {
          const dx = arrow.group.position.x - projectile.mesh.position.x;
          const dy = arrow.group.position.y - projectile.mesh.position.y;
          const dz = arrow.group.position.z - projectile.mesh.position.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.3;
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
      
      // Spawn from random positions around the map - omnidirectional movement
      const angle = rng.nextFloat(0, Math.PI * 2);
      const distance = rng.nextFloat(8, 12);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const z = rng.nextFloat(-2, 2); // Some Z variation but still hittable
      
      // Move toward center with some randomness (omnidirectional)
      const toCenter = new THREE.Vector3(-x, -y, -z).normalize();
      const randomOffset = new THREE.Vector3(
        rng.nextFloat(-0.5, 0.5),
        rng.nextFloat(-0.5, 0.5),
        rng.nextFloat(-0.3, 0.3)
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
    
    // More enemies spawn - faster spawn rate (every 1 second instead of 2)
    const spawnInterval = setInterval(spawnShip, 1000);
    return () => {
      clearInterval(spawnInterval);
    };
  }, [gameState, seededRng, createAlienShip]);

  // Charge up power while holding - FIXED to properly update state and show charge bar
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const chargeInterval = setInterval(() => {
      // Check if drawing and update power
      if (isDrawingRef.current && bowPowerRef.current < 100) {
        bowPowerRef.current = Math.min(100, bowPowerRef.current + 2);
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
            const upwardAngle = Math.PI / 4 * power;
            const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
            const verticalSpeed = baseSpeed * Math.sin(upwardAngle);
            vx = Math.cos(aimAngleRad) * horizontalSpeed;
            vy = Math.sin(aimAngleRad) * horizontalSpeed + verticalSpeed;
          }
          
          const arrowGroup = createArrow();
          const localPos = stringCenterRef.current.clone();
          const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
          const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
          arrowGroup.position.set(worldX, worldY, localPos.z);
          
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
          
          // DEDUCT 20 POINTS FOR EVERY ARROW SHOT
          currentScoreRef.current = Math.max(0, currentScoreRef.current - 20);
          setScore(currentScoreRef.current);
          
          bowPowerRef.current = 0;
          setBowPower(0);
        }
      } else if (!isDrawingRef.current && bowPowerRef.current > 0) {
        // Don't reset immediately - allow release to shoot
        // Power will reset after shooting
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
      const upwardAngle = Math.PI / 4 * power; // 0 to 45 degrees based on power
      const horizontalSpeed = baseSpeed * Math.cos(upwardAngle);
      const verticalSpeed = baseSpeed * Math.sin(upwardAngle);
      
      vx = Math.cos(aimAngleRad) * horizontalSpeed;
      vy = Math.sin(aimAngleRad) * horizontalSpeed + verticalSpeed; // Add upward component
    }
    
    const arrowGroup = createArrow();
    // Spawn arrow at string center position (on the wire)
    const localPos = stringCenterRef.current.clone();
    const worldX = localPos.x * Math.cos(aimAngleRad) - localPos.y * Math.sin(aimAngleRad);
    const worldY = localPos.x * Math.sin(aimAngleRad) + localPos.y * Math.cos(aimAngleRad);
    arrowGroup.position.set(worldX, worldY, localPos.z);
    
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
    
    // DEDUCT 20 POINTS FOR EVERY ARROW SHOT
    currentScoreRef.current = Math.max(0, currentScoreRef.current - 20);
    setScore(currentScoreRef.current);
    
    // Reset power after shooting
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
      enemyProjectilesRef.current.forEach(proj => sceneRef.current!.remove(proj.mesh));
      if (aimPathRef.current) sceneRef.current.remove(aimPathRef.current);
    }
    
    onGameEnd({
      score: currentScoreRef.current,
      accuracy: totalShotsRef.current > 0 ? (totalHitsRef.current / totalShotsRef.current) * 100 : 0
    });
  };

  // Calculate background color with flash
  const bgFlash = Math.sin(backgroundFlash) * 0.1;
  const bgColor = `rgb(${74 + bgFlash * 50}, 0, 0)`;
  
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{ margin: 0, padding: 0, backgroundColor: bgColor }}>
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
                <span className="text-red-400 mr-2">•</span>
                <span><strong>-20 points</strong> for every arrow shot - Plan your shots carefully!</span>
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
