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

interface AlienShip {
  id: number;
  group: THREE.Group;
  speed: number;
  direction: THREE.Vector3;
  createdAt: number;
  center: THREE.Vector3;
  size: number;
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

  // Create neon alien ship with proper 3D geometry
  const createAlienShip = useCallback((x: number, y: number, z: number, size: number): THREE.Group => {
    const shipGroup = new THREE.Group();
    
    // Main body - triangular ship (cone rotated)
    const bodyGeometry = new THREE.ConeGeometry(size * 0.6, size * 1.2, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI;
    body.position.y = size * 0.3;
    shipGroup.add(body);
    
    // Wings - left and right
    const wingGeometry = new THREE.BoxGeometry(size * 0.4, size * 0.1, size * 0.8);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.6
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-size * 0.5, size * 0.2, 0);
    shipGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(size * 0.5, size * 0.2, 0);
    shipGroup.add(rightWing);
    
    // Glow effect - pulsing sphere
    const glowGeometry = new THREE.SphereGeometry(size * 0.4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = size * 0.5;
    shipGroup.add(glow);
    
    // Engine trails
    const trailGeometry = new THREE.ConeGeometry(size * 0.15, size * 0.3, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6
    });
    const trail1 = new THREE.Mesh(trailGeometry, trailMaterial);
    trail1.position.set(-size * 0.3, -size * 0.2, 0);
    trail1.rotation.z = Math.PI;
    shipGroup.add(trail1);
    
    const trail2 = new THREE.Mesh(trailGeometry, trailMaterial);
    trail2.position.set(size * 0.3, -size * 0.2, 0);
    trail2.rotation.z = Math.PI;
    shipGroup.add(trail2);
    
    shipGroup.position.set(x, y, z);
    return shipGroup;
  }, []);

  // Create arrow with proper 3D geometry
  const createArrow = useCallback((): THREE.Group => {
    const arrowGroup = new THREE.Group();
    
    // Arrow shaft (neon cyan cylinder)
    const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.0
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.z = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head (pyramid/cone)
    const headGeometry = new THREE.ConeGeometry(0.06, 0.15, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.2
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 0.2;
    arrowGroup.add(head);
    
    // Fletching (feathers at back)
    const fletchGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.02);
    const fletchMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff
    });
    
    const fletch1 = new THREE.Mesh(fletchGeometry, fletchMaterial);
    fletch1.position.set(-0.15, 0.05, 0);
    arrowGroup.add(fletch1);
    
    const fletch2 = new THREE.Mesh(fletchGeometry, fletchMaterial);
    fletch2.position.set(-0.15, -0.05, 0);
    arrowGroup.add(fletch2);
    
    // Trail effect
    const trailGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.x = -0.1;
    arrowGroup.add(trail);
    
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
    
    // Create laser bow - MAKE IT HUGE AND BRIGHT
    const bowGroup = new THREE.Group();
    
    // Bow limbs (neon cyan) - MUCH BIGGER
    const limbGeometry = new THREE.BoxGeometry(0.3, 2.0, 0.3);
    const limbMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.0,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const leftLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    leftLimb.position.set(-0.8, 0, 0);
    leftLimb.rotation.z = 0.3;
    bowGroup.add(leftLimb);
    
    const rightLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    rightLimb.position.set(0.8, 0, 0);
    rightLimb.rotation.z = -0.3;
    bowGroup.add(rightLimb);
    
    // Bow grip - MUCH BIGGER
    const gripGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.4);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0088ff,
      emissiveIntensity: 1.5
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, 0, 0);
    bowGroup.add(grip);
    
    // Bow string (glowing line) - THICKER
    const stringPoints = [
      new THREE.Vector3(-0.8, 0.5, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.8, 0.5, 0)
    ];
    const stringGeometry = new THREE.BufferGeometry().setFromPoints(stringPoints);
    const stringMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      linewidth: 10,
      transparent: true,
      opacity: 1.0
    });
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(bowString);
    bowStringRef.current = bowString;
    
    // Energy glow around bow - HUGE AND BRIGHT
    const glowGeometry = new THREE.RingGeometry(0.5, 1.0, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 0, 0);
    glow.rotation.x = Math.PI / 2;
    bowGroup.add(glow);
    
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
      
      // Update bow animation
      if (bowRef.current && bowStringRef.current) {
        const drawProgress = bowPowerRef.current / 100;
        bowRef.current.rotation.z = -aimAngleRef.current * Math.PI / 180;
        
        // Animate bow string when drawing
        const stringPoints = [
          new THREE.Vector3(-0.8, 0.5, 0),
          new THREE.Vector3(0, 0 - drawProgress * 0.5, 0),
          new THREE.Vector3(0.8, 0.5, 0)
        ];
        bowStringRef.current.geometry.setFromPoints(stringPoints);
        
        // Pulse glow when drawing
        if (bowRef.current) {
          const glowMesh = bowRef.current.children.find(child => child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial && child.geometry instanceof THREE.RingGeometry);
          if (isDrawingRef.current && glowMesh) {
            (glowMesh as THREE.Mesh).scale.set(1 + drawProgress * 0.5, 1 + drawProgress * 0.5, 1);
          }
        }
      }
      
      // Update arrows with physics
      arrowsRef.current = arrowsRef.current.map(arrow => {
        arrow.group.position.x += arrow.vx * delta;
        arrow.group.position.y += arrow.vy * delta;
        arrow.group.position.z += arrow.vz * delta;
        arrow.vy -= 9.8 * delta; // Gravity
        
        // Rotate arrow to match velocity
        const velocity = Math.sqrt(arrow.vx * arrow.vx + arrow.vy * arrow.vy + arrow.vz * arrow.vz);
        if (velocity > 0) {
          const angleY = Math.atan2(arrow.vx, arrow.vz);
          const angleZ = Math.atan2(arrow.vy, Math.sqrt(arrow.vx * arrow.vx + arrow.vz * arrow.vz));
          arrow.group.rotation.y = angleY;
          arrow.group.rotation.z = angleZ;
        }
        
        // Check collisions with ships
        shipsRef.current.forEach((ship, shipIndex) => {
          const dx = arrow.group.position.x - ship.group.position.x;
          const dy = arrow.group.position.y - ship.group.position.y;
          const dz = arrow.group.position.z - ship.group.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < ship.size) {
            // Hit!
            const centerDx = arrow.group.position.x - ship.center.x;
            const centerDy = arrow.group.position.y - ship.center.y;
            const centerDz = arrow.group.position.z - ship.center.z;
            const distanceFromCenter = Math.sqrt(centerDx * centerDx + centerDy * centerDy + centerDz * centerDz);
            const isCenterShot = distanceFromCenter < ship.size * 0.2;
            
            // Calculate points (decimal accuracy)
            let points = 10;
            if (isCenterShot) {
              points = 50 + (1 - distanceFromCenter / (ship.size * 0.2)) * 50; // 50-100 for center shots
            } else {
              points = 10 + (1 - distanceFromCenter / ship.size) * 40; // 10-50 for regular hits
            }
            
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

  // Spawn ships - only when playing
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
      
      const side = rng.nextInt(0, 4);
      let x, y, z;
      
      switch (side) {
        case 0: // Left
          x = -8;
          y = rng.nextFloat(-3, 3);
          z = rng.nextFloat(-3, 3);
          break;
        case 1: // Right
          x = 8;
          y = rng.nextFloat(-3, 3);
          z = rng.nextFloat(-3, 3);
          break;
        case 2: // Top
          x = rng.nextFloat(-5, 5);
          y = 5;
          z = rng.nextFloat(-3, 3);
          break;
        default: // Bottom
          x = rng.nextFloat(-5, 5);
          y = -5;
          z = rng.nextFloat(-3, 3);
      }
      
      const size = rng.nextFloat(0.8, 1.5);
      const shipGroup = createAlienShip(x, y, z, size);
      const direction = new THREE.Vector3(
        rng.nextFloat(-1, 1),
        rng.nextFloat(-0.5, 0.5),
        rng.nextFloat(-1, 1)
      ).normalize();
      
      sceneRef.current.add(shipGroup);
      
      const ship: AlienShip = {
        id: ++lastShipIdRef.current,
        group: shipGroup,
        speed: rng.nextFloat(2, 4),
        direction,
        createdAt: now,
        center: new THREE.Vector3(x, y, z),
        size
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

  // Handle mouse/touch for aiming and drawing
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    isDrawingRef.current = true;
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
    
    // Increase bow power while drawing
    if (isDrawingRef.current && bowPowerRef.current < 100) {
      bowPowerRef.current = Math.min(100, bowPowerRef.current + 3);
      setBowPower(bowPowerRef.current);
    }
  }, [gameState]);

  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || !isDrawingRef.current || !sceneRef.current) return;
    
    isDrawingRef.current = false;
    
    // Shoot arrow
    const power = bowPowerRef.current / 100;
    const angle = aimAngleRef.current * Math.PI / 180;
    const speed = 20 + power * 25;
    
    const arrowGroup = createArrow();
    arrowGroup.position.set(0, 0, 0); // Match bow position
    
    const arrow: Arrow = {
      id: ++lastArrowIdRef.current,
      group: arrowGroup,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
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
