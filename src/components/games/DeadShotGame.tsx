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
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  createdAt: number;
}

interface AlienShip {
  id: number;
  mesh: THREE.Group;
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
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [bowPower, setBowPower] = useState(0);
  const [aimAngle, setAimAngle] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  
  const mountRef = useRef<HTMLDivElement>(null);
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

  // Create neon alien ship
  const createAlienShip = useCallback((x: number, y: number, z: number, size: number): THREE.Group => {
    const shipGroup = new THREE.Group();
    
    // Main body (futuristic triangular shape)
    const bodyGeometry = new THREE.ConeGeometry(size * 0.8, size * 1.2, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI;
    shipGroup.add(body);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(size * 0.3, size * 0.1, size * 0.8);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.6
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-size * 0.6, 0, 0);
    shipGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(size * 0.6, 0, 0);
    shipGroup.add(rightWing);
    
    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(size * 0.4, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = size * 0.3;
    shipGroup.add(glow);
    
    shipGroup.position.set(x, y, z);
    return shipGroup;
  }, []);

  // Create arrow mesh
  const createArrow = useCallback((): THREE.Mesh => {
    const arrowGroup = new THREE.Group();
    
    // Arrow shaft (neon cyan)
    const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.z = Math.PI / 2;
    arrowGroup.add(shaft);
    
    // Arrow head (pyramid)
    const headGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.x = 0.15;
    arrowGroup.add(head);
    
    // Trail effect
    const trailGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.x = -0.1;
    arrowGroup.add(trail);
    
    // Convert group to single mesh for easier handling
    const arrowMesh = new THREE.Mesh();
    arrowMesh.add(arrowGroup);
    return arrowMesh;
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

  // Initialize Three.js scene - Initialize immediately, not just when playing
  useEffect(() => {
    if (!mountRef.current || sceneRef.current) return;

    console.log('🎯 [DeadShot] Initializing Three.js scene');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    scene.fog = new THREE.FogExp2(0x000011, 0.002);
    
    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;
    
    console.log('📐 [DeadShot] Container size:', { width, height });
    
    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountRef.current.appendChild(renderer.domElement);
    
    console.log('✅ [DeadShot] Renderer appended to DOM');
    
    // Neon lighting
    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x00ffff, 3, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff00ff, 3, 50);
    pointLight2.position.set(-5, 5, -5);
    scene.add(pointLight2);
    
    const pointLight3 = new THREE.PointLight(0xffffff, 2, 30);
    pointLight3.position.set(0, 5, 0);
    scene.add(pointLight3);
    
    // Create laser bow
    const bowGroup = new THREE.Group();
    
    // Bow limbs (neon cyan)
    const limbGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.05);
    const limbMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1.0,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const leftLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    leftLimb.position.set(-0.2, -1, 0);
    leftLimb.rotation.z = 0.3;
    bowGroup.add(leftLimb);
    
    const rightLimb = new THREE.Mesh(limbGeometry, limbMaterial);
    rightLimb.position.set(0.2, -1, 0);
    rightLimb.rotation.z = -0.3;
    bowGroup.add(rightLimb);
    
    // Bow grip
    const gripGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.5
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -1, 0);
    bowGroup.add(grip);
    
    // Bow string (glowing line)
    const stringPoints = [
      new THREE.Vector3(-0.2, -0.8, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0.2, -0.8, 0)
    ];
    const stringGeometry = new THREE.BufferGeometry().setFromPoints(stringPoints);
    const stringMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff, 
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(bowString);
    bowStringRef.current = bowString;
    
    // Energy glow around bow
    const glowGeometry = new THREE.RingGeometry(0.15, 0.25, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, -1, 0);
    glow.rotation.x = Math.PI / 2;
    bowGroup.add(glow);
    
    scene.add(bowGroup);
    bowRef.current = bowGroup;
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      animationIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      
      // Update bow animation
      if (bowRef.current && bowStringRef.current) {
        const drawProgress = bowPowerRef.current / 100;
        bowRef.current.rotation.z = -aimAngleRef.current * Math.PI / 180;
        
        // Animate bow string when drawing
        const stringPoints = [
          new THREE.Vector3(-0.2, -0.8, 0),
          new THREE.Vector3(0, -1 - drawProgress * 0.3, 0),
          new THREE.Vector3(0.2, -0.8, 0)
        ];
        bowStringRef.current.geometry.setFromPoints(stringPoints);
        
        // Pulse glow when drawing
        if (isDrawingRef.current && glow) {
          glow.scale.set(1 + drawProgress * 0.5, 1 + drawProgress * 0.5, 1);
        }
      }
      
      // Update arrows with physics
      arrowsRef.current = arrowsRef.current.map(arrow => {
        arrow.mesh.position.x += arrow.vx * delta;
        arrow.mesh.position.y += arrow.vy * delta;
        arrow.mesh.position.z += arrow.vz * delta;
        arrow.vy -= 9.8 * delta; // Gravity
        
        // Rotate arrow to match velocity
        const angle = Math.atan2(arrow.vy, Math.sqrt(arrow.vx * arrow.vx + arrow.vz * arrow.vz));
        arrow.mesh.rotation.z = angle;
        arrow.mesh.rotation.y = Math.atan2(arrow.vx, arrow.vz);
        
        // Check collisions with ships
        shipsRef.current.forEach((ship, shipIndex) => {
          const dx = arrow.mesh.position.x - ship.mesh.position.x;
          const dy = arrow.mesh.position.y - ship.mesh.position.y;
          const dz = arrow.mesh.position.z - ship.mesh.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < ship.size) {
            // Hit!
            const centerDx = arrow.mesh.position.x - ship.center.x;
            const centerDy = arrow.mesh.position.y - ship.center.y;
            const centerDz = arrow.mesh.position.z - ship.center.z;
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
              subItemMesh.position.copy(ship.mesh.position);
              
              const subItem: SubItem = {
                id: ++lastSubItemIdRef.current,
                mesh: subItemMesh,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2 + 1,
                vz: Math.sin(angle) * 2,
                type: ['bonus', 'multiplier', 'time'][i] as 'bonus' | 'multiplier' | 'time',
                createdAt: Date.now()
              };
              
              scene.add(subItemMesh);
              subItemsRef.current.push(subItem);
            }
            
            // Remove ship
            scene.remove(ship.mesh);
            shipsRef.current.splice(shipIndex, 1);
            
            // Remove arrow
            scene.remove(arrow.mesh);
            return null;
          }
        });
        
        // Remove arrows that are out of bounds
        if (arrow.mesh.position.y < -10 || 
            Math.abs(arrow.mesh.position.x) > 30 || 
            Math.abs(arrow.mesh.position.z) > 30) {
          scene.remove(arrow.mesh);
          return null;
        }
        
        return arrow;
      }).filter(arrow => arrow !== null) as Arrow[];
      
      // Update ships
      shipsRef.current = shipsRef.current.map(ship => {
        ship.mesh.position.add(ship.direction.clone().multiplyScalar(ship.speed * delta));
        
        // Rotate ship for visual effect
        ship.mesh.rotation.y += delta * 2;
        ship.mesh.rotation.x += delta * 0.5;
        
        // Remove ships that are out of bounds
        if (Math.abs(ship.mesh.position.x) > 30 || 
            Math.abs(ship.mesh.position.y) > 30 || 
            Math.abs(ship.mesh.position.z) > 30) {
          scene.remove(ship.mesh);
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
          const dx = arrow.mesh.position.x - item.mesh.position.x;
          const dy = arrow.mesh.position.y - item.mesh.position.y;
          const dz = arrow.mesh.position.z - item.mesh.position.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.5;
        });
        
        if (arrowHit) {
          // Bonus points for hitting sub-item
          const bonusPoints = item.type === 'bonus' ? 25 : item.type === 'multiplier' ? 50 : 10;
          currentScoreRef.current += bonusPoints;
          setScore(currentScoreRef.current);
          scene.remove(item.mesh);
          return null;
        }
        
        // Remove sub-items that are out of bounds
        if (item.mesh.position.y < -10 || 
            Math.abs(item.mesh.position.x) > 30 || 
            Math.abs(item.mesh.position.z) > 30) {
          scene.remove(item.mesh);
          return null;
        }
        
        return item;
      }).filter(item => item !== null) as SubItem[];
      
      renderer.render(scene, camera);
    };
    
    clockRef.current.start();
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
      const width = mountRef.current.clientWidth || window.innerWidth;
      const height = mountRef.current.clientHeight || window.innerHeight;
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
      if (mountRef.current && renderer.domElement.parentNode) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, [createAlienShip, createArrow, createSubItem]); // Remove gameState dependency

  // Spawn ships
  useEffect(() => {
    if (gameState !== 'playing' || !sceneRef.current) return;
    
    const spawnShip = () => {
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
          x = -15;
          y = rng.nextFloat(-3, 5);
          z = rng.nextFloat(-8, 8);
          break;
        case 1: // Right
          x = 15;
          y = rng.nextFloat(-3, 5);
          z = rng.nextFloat(-8, 8);
          break;
        case 2: // Top
          x = rng.nextFloat(-8, 8);
          y = 10;
          z = rng.nextFloat(-8, 8);
          break;
        default: // Bottom
          x = rng.nextFloat(-8, 8);
          y = -5;
          z = rng.nextFloat(-8, 8);
      }
      
      const size = rng.nextFloat(0.8, 1.5);
      const shipMesh = createAlienShip(x, y, z, size);
      const direction = new THREE.Vector3(
        rng.nextFloat(-1, 1),
        rng.nextFloat(-0.5, 0.5),
        rng.nextFloat(-1, 1)
      ).normalize();
      
      sceneRef.current.add(shipMesh);
      
      const ship: AlienShip = {
        id: ++lastShipIdRef.current,
        mesh: shipMesh,
        speed: rng.nextFloat(2, 4),
        direction,
        createdAt: now,
        center: new THREE.Vector3(x, y, z),
        size
      };
      
      shipsRef.current.push(ship);
      console.log('👾 [DeadShot] Spawned ship #' + ship.id, { x, y, z, size });
    };
    
    // Spawn first ship immediately
    spawnShip();
    
    const spawnInterval = setInterval(spawnShip, 2000);
    return () => {
      clearInterval(spawnInterval);
      console.log('🛑 [DeadShot] Stopped ship spawner');
    };
  }, [gameState, seededRng, createAlienShip]);

  // Handle mouse/touch for aiming and drawing
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    setIsDrawing(true);
    isDrawingRef.current = true;
    bowPowerRef.current = 0;
    setBowPower(0);
  }, [gameState]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || !isDrawingRef.current) return;
    e.preventDefault();
    
    const rect = mountRef.current?.getBoundingClientRect();
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
    
    setIsDrawing(false);
    isDrawingRef.current = false;
    
    // Shoot arrow
    const power = bowPowerRef.current / 100;
    const angle = aimAngleRef.current * Math.PI / 180;
    const speed = 20 + power * 25;
    
    const arrowMesh = createArrow();
    arrowMesh.position.set(0, -1, 0);
    
    const arrow: Arrow = {
      id: ++lastArrowIdRef.current,
      mesh: arrowMesh,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: 0,
      createdAt: Date.now()
    };
    
    sceneRef.current.add(arrowMesh);
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
      arrowsRef.current.forEach(arrow => sceneRef.current!.remove(arrow.mesh));
      shipsRef.current.forEach(ship => sceneRef.current!.remove(ship.mesh));
      subItemsRef.current.forEach(item => sceneRef.current!.remove(item.mesh));
    }
    
    onGameEnd({
      score: currentScoreRef.current,
      accuracy: totalShotsRef.current > 0 ? (totalHitsRef.current / totalShotsRef.current) * 100 : 0
    });
  };

  if (gameState === 'ready') {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto text-center border border-white/20 shadow-2xl z-10">
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
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900">
        <div className="text-8xl font-bold text-white animate-pulse">
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
          <p className="text-2xl mb-2">Final Score: {score.toFixed(2)}</p>
          <p className="text-xl">Accuracy: {accuracy.toFixed(1)}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900">
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start text-white">
        <div>
          <div className="text-2xl font-bold">Score: {score.toFixed(2)}</div>
          <div className="text-sm">Accuracy: {accuracy.toFixed(1)}%</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">Time: {timeLeft}s</div>
          <div className="text-sm">Power: {bowPower.toFixed(0)}%</div>
        </div>
      </div>
      
      {/* 3D Game Area */}
      <div 
        ref={mountRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
