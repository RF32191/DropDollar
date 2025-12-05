'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface PennyPasserGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
  competitionId?: string;
}

interface Lane {
  y: number;
  direction: 1 | -1;
  speed: number;
  cars: Car[];
  pattern: number; // Pattern ID (0-19)
}

interface Car {
  x: number;
  mesh: THREE.Group;
  color: number;
}

interface CollectibleCoin {
  x: number;
  y: number;
  mesh: THREE.Group;
  collected: boolean;
}

// Car colors (varied palette)
const CAR_COLORS = [
  0xFF0000, // Red
  0x0000FF, // Blue
  0x00FF00, // Green
  0xFFFF00, // Yellow
  0xFF00FF, // Magenta
  0x00FFFF, // Cyan
  0xFF8800, // Orange
  0x8800FF, // Purple
  0xFFFFFF, // White
  0x808080  // Gray
];

// 20 pre-defined fair patterns - PROGRESSIVE DIFFICULTY (fewer cars at start, more later)
const PATTERN_CONFIGS = [
  // EASY patterns (0-4): 1-2 cars, slow, wide spacing
  { numCars: 1, spacing: 15, speed: 0.02, direction: 1 },
  { numCars: 1, spacing: 18, speed: 0.015, direction: -1 },
  { numCars: 2, spacing: 12, speed: 0.02, direction: 1 },
  { numCars: 2, spacing: 14, speed: 0.025, direction: -1 },
  { numCars: 1, spacing: 20, speed: 0.02, direction: 1 },
  
  // MEDIUM patterns (5-9): 2-3 cars, moderate speed
  { numCars: 2, spacing: 10, speed: 0.03, direction: -1 },
  { numCars: 2, spacing: 11, speed: 0.035, direction: 1 },
  { numCars: 3, spacing: 9, speed: 0.03, direction: -1 },
  { numCars: 2, spacing: 12, speed: 0.04, direction: 1 },
  { numCars: 3, spacing: 8, speed: 0.035, direction: -1 },
  
  // HARD patterns (10-14): 3-4 cars, faster
  { numCars: 3, spacing: 7, speed: 0.04, direction: 1 },
  { numCars: 3, spacing: 8, speed: 0.045, direction: -1 },
  { numCars: 4, spacing: 6, speed: 0.04, direction: 1 },
  { numCars: 3, spacing: 9, speed: 0.05, direction: -1 },
  { numCars: 4, spacing: 7, speed: 0.045, direction: 1 },
  
  // EXPERT patterns (15-19): 4-5 cars, fast, tight spacing
  { numCars: 4, spacing: 5, speed: 0.05, direction: -1 },
  { numCars: 4, spacing: 6, speed: 0.055, direction: 1 },
  { numCars: 5, spacing: 5, speed: 0.05, direction: -1 },
  { numCars: 4, spacing: 7, speed: 0.06, direction: 1 },
  { numCars: 5, spacing: 6, speed: 0.055, direction: -1 }
];

// Seeded RNG for deterministic patterns in competition mode
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  integer(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

export default function PennyPasserGame3D({
  onGameEnd,
  gameMode = 'practice',
  rngSeed,
  competitionId
}: PennyPasserGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const pennyRef = useRef<THREE.Group | null>(null);
  const lanesRef = useRef<Lane[]>([]);
  const collectibleCoinsRef = useRef<CollectibleCoin[]>([]);
  const rngRef = useRef<SeededRandom>(new SeededRandom(rngSeed || Date.now()));
  const hasEndedRef = useRef(false);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hopAnimationRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const clickDirectionRef = useRef<{ x: number; z: number } | null>(null);

  const [gameState, setGameState] = useState<'playing' | 'ended'>('playing');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [pennyPosition, setPennyPosition] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [showArrow, setShowArrow] = useState<{ direction: string; x: number; y: number } | null>(null);
  const [showJumpIndicator, setShowJumpIndicator] = useState(false);

  // Anti-cheat tracking
  const moveTimingsRef = useRef<number[]>([]);
  const collisionCountRef = useRef(0);

  // Audio feedback
  const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene - BEAUTIFUL gradient background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f1e);
    scene.fog = new THREE.Fog(0x0f0f1e, 30, 60); // Atmospheric depth
    sceneRef.current = scene;

    // Camera - CLEAR TOP-DOWN VIEW
    const camera = new THREE.PerspectiveCamera(
      55,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 28, -5); // Clear view of starting area
    camera.lookAt(0, 0, 5); // Look slightly ahead
    cameraRef.current = camera;

    // Renderer - OPTIMIZED for performance
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.shadowMap.enabled = false; // Disable shadows for performance
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights - ATMOSPHERIC
    const ambientLight = new THREE.AmbientLight(0x6666ff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(0, 25, 0);
    scene.add(directionalLight);
    
    // Add colored accent lights for atmosphere
    const leftAccent = new THREE.PointLight(0xff3366, 0.8, 20);
    leftAccent.position.set(-13, 2, 0);
    scene.add(leftAccent);
    
    const rightAccent = new THREE.PointLight(0x00ffff, 0.8, 20);
    rightAccent.position.set(13, 2, 0);
    scene.add(rightAccent);

    // Ground/Road - BETTER VISUALS (extended for new lane layout)
    const roadGeometry = new THREE.PlaneGeometry(24, 80);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.02,
      emissive: 0x0a0a0a,
      emissiveIntensity: 0.1
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = 10; // Centered for new lane positions (2.5 to 37.5)
    scene.add(road);
    
    // Side barriers (neon glow effect) - adjusted
    for (let side of [-13, 13]) {
      const barrierGeo = new THREE.BoxGeometry(0.3, 1.2, 80);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: side < 0 ? 0xff3366 : 0x00ffff,
        emissive: side < 0 ? 0xff3366 : 0x00ffff,
        emissiveIntensity: 0.6
      });
      const barrier = new THREE.Mesh(barrierGeo, barrierMat);
      barrier.position.set(side, 0.6, 10);
      scene.add(barrier);
    }

    // Lane dividers - GLOWING (adjusted for new layout)
    for (let i = -2; i <= 2; i++) {
      for (let j = -25; j < 45; j += 4) {
        const dividerGeometry = new THREE.BoxGeometry(0.2, 0.12, 2);
        const dividerMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xffff00,
          emissive: 0xffff00,
          emissiveIntensity: 0.5
        });
        const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
        divider.position.set(i * 4, 0.06, j);
        scene.add(divider);
      }
    }

    // Road edge lines - BRIGHT WHITE (adjusted)
    for (let side of [-12, 12]) {
      const edgeGeometry = new THREE.BoxGeometry(0.4, 0.12, 80);
      const edgeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
      });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.set(side, 0.06, 10);
      scene.add(edge);
    }

    // Create GOLDEN PENNY (player) - OPTIMIZED and PROFESSIONAL
    const pennyGroup = new THREE.Group();
    
    // Main penny body - Optimized geometry (32 segments instead of 64)
    const pennyGeometry = new THREE.CylinderGeometry(1.3, 1.3, 0.4, 32);
    const pennyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.5
    });
    const penny = new THREE.Mesh(pennyGeometry, pennyMaterial);
    penny.rotation.x = Math.PI / 2;
    pennyGroup.add(penny);
    
    // Inner circle detail - Optimized
    const innerCircleGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.41, 32);
    const innerCircleMat = new THREE.MeshStandardMaterial({
      color: 0xCC9900,
      metalness: 0.9,
      roughness: 0.1
    });
    const innerCircle = new THREE.Mesh(innerCircleGeo, innerCircleMat);
    innerCircle.rotation.x = Math.PI / 2;
    pennyGroup.add(innerCircle);
    
    // Single glowing ring - Simplified for performance
    const ringGeometry = new THREE.TorusGeometry(1.4, 0.15, 8, 24);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFF00,
      metalness: 1,
      roughness: 0,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.9
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    pennyGroup.add(ring);
    
    pennyGroup.position.set(0, 0.8, -8); // START VISIBLE - close to camera
    scene.add(pennyGroup);
    pennyRef.current = pennyGroup;

    // Create lanes with CARS using 20 RNG patterns
    const lanes: Lane[] = [];
    const numLanes = 15;
    const rng = rngRef.current;

    for (let i = 0; i < numLanes; i++) {
      // START LANES AT +2.5 (coin is at -8, LARGE safe zone from -8 to +2.5 = 10.5 units / 4 lane moves)
      const yPos = 2.5 + (i * 2.5);
      
      // PROGRESSIVE DIFFICULTY: Use easier patterns at start, harder patterns later
      const progressRatio = i / numLanes; // 0.0 to 1.0
      let patternIndex;
      
      if (progressRatio < 0.25) {
        // First 25%: Easy patterns (0-4)
        patternIndex = rng.integer(0, 4);
      } else if (progressRatio < 0.5) {
        // 25-50%: Medium patterns (5-9)
        patternIndex = rng.integer(5, 9);
      } else if (progressRatio < 0.75) {
        // 50-75%: Hard patterns (10-14)
        patternIndex = rng.integer(10, 14);
      } else {
        // Last 25%: Expert patterns (15-19)
        patternIndex = rng.integer(15, 19);
      }
      
      const pattern = PATTERN_CONFIGS[patternIndex];
      
      const cars: Car[] = [];
      const numCars = pattern.numCars;
      const spacing = pattern.spacing;

      for (let j = 0; j < numCars; j++) {
        // Create 3D car
        const carGroup = new THREE.Group();
        
        // Car body (main box)
        const carColor = CAR_COLORS[rng.integer(0, CAR_COLORS.length - 1)];
        const bodyGeometry = new THREE.BoxGeometry(2, 0.6, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
          color: carColor,
          metalness: 0.7,
          roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        carGroup.add(body);
        
        // Car cabin (smaller box on top)
        const cabinGeometry = new THREE.BoxGeometry(1, 0.5, 0.8);
        const cabinMaterial = new THREE.MeshStandardMaterial({
          color: carColor,
          metalness: 0.6,
          roughness: 0.4
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 0.8, 0);
        carGroup.add(cabin);
        
        // Windows (dark blue transparent)
        const windowMaterial = new THREE.MeshStandardMaterial({
          color: 0x2222AA,
          transparent: true,
          opacity: 0.6,
          metalness: 0.9,
          roughness: 0.1
        });
        
        const frontWindowGeo = new THREE.PlaneGeometry(0.8, 0.4);
        const frontWindow = new THREE.Mesh(frontWindowGeo, windowMaterial);
        frontWindow.position.set(0, 0.8, 0.41);
        carGroup.add(frontWindow);
        
        const backWindowGeo = new THREE.PlaneGeometry(0.8, 0.4);
        const backWindow = new THREE.Mesh(backWindowGeo, windowMaterial);
        backWindow.position.set(0, 0.8, -0.41);
        backWindow.rotation.y = Math.PI;
        carGroup.add(backWindow);
        
        // Wheels (black cylinders)
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
        
        for (let w = 0; w < 4; w++) {
          const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
          wheel.rotation.z = Math.PI / 2;
          const xPos = w < 2 ? 0.6 : -0.6;
          const zPos = w % 2 === 0 ? 0.4 : -0.4;
          wheel.position.set(xPos, 0.25, zPos);
          carGroup.add(wheel);
        }
        
        // Headlights (yellow emissive)
        const headlightMaterial = new THREE.MeshStandardMaterial({
          color: 0xFFFFAA,
          emissive: 0xFFFF00,
          emissiveIntensity: 0.8
        });
        const headlightGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
        
        const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
        leftHeadlight.position.set(0.5, 0.3, 0.51);
        carGroup.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeo, headlightMaterial);
        rightHeadlight.position.set(-0.5, 0.3, 0.51);
        carGroup.add(rightHeadlight);
        
        const xPos = -10 + (j * spacing) + rng.range(-1, 1);
        carGroup.position.set(xPos, 0, yPos);
        carGroup.castShadow = true;
        
        // Rotate car based on direction
        if (pattern.direction === -1) {
          carGroup.rotation.y = Math.PI;
        }
        
        scene.add(carGroup);

        cars.push({ x: xPos, mesh: carGroup, color: carColor });
      }

      lanes.push({ 
        y: yPos, 
        direction: pattern.direction as 1 | -1,
        speed: pattern.speed,
        cars,
        pattern: patternIndex
      });
    }
    lanesRef.current = lanes;

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !pennyRef.current) return;

      // SMOOTH hopping animation
      hopAnimationRef.current += 0.1;
      const hopHeight = Math.abs(Math.sin(hopAnimationRef.current)) * 0.3;
      pennyRef.current.position.y = 0.8 + hopHeight;
      pennyRef.current.rotation.y += 0.05; // Slower spin

      // Smooth pulse on ring
      const pulseFactor = Math.sin(hopAnimationRef.current * 1.5) * 0.15 + 1;
      if (pennyRef.current.children[2]) {
        pennyRef.current.children[2].scale.set(pulseFactor, pulseFactor, pulseFactor);
      }

      // Move cars - OPTIMIZED (no bounce, no material recreation)
      lanesRef.current.forEach(lane => {
        lane.cars.forEach(car => {
          car.x += lane.speed * lane.direction;
          
          // Wrap around
          if (car.x > 12) car.x = -12;
          if (car.x < -12) car.x = 12;
          
          car.mesh.position.x = car.x;
          car.mesh.position.y = 0.3; // Fixed height for performance
        });
      });

      // Check collisions - DOUBLE JUMP AVOIDS CARS!
      if (pennyRef.current) {
        const pennyZ = pennyRef.current.position.z;
        const pennyX = pennyRef.current.position.x;
        const pennyY = pennyRef.current.position.y; // Check height for jump
        const tolerance = 1.5; // Tighter tolerance

        // If penny is jumping high (Y > 2.0), avoid collision!
        const isJumpingHigh = pennyY > 2.0;

        if (!isJumpingHigh) {
          lanesRef.current.forEach(lane => {
            // Only check lanes that have cars AND are close to penny
            if (Math.abs(pennyZ - lane.y) < tolerance) {
              lane.cars.forEach(car => {
                const distanceX = Math.abs(pennyX - car.x);
                const distanceZ = Math.abs(pennyZ - lane.y);
                // Tighter hitbox - must be really close
                if (distanceX < 1.8 && distanceZ < 1.3) {
                  handleCollision();
                }
              });
            }
          });
        }
      }
      
      // CAMERA FOLLOWS PLAYER - Adjust forward when halfway
      if (pennyRef.current && cameraRef.current) {
        const pennyProgress = pennyRef.current.position.z;
        if (pennyProgress > 10) {
          // Smoothly move camera forward as player advances
          const cameraOffset = (pennyProgress - 10) * 0.4;
          cameraRef.current.position.z = -5 + cameraOffset;
          cameraRef.current.lookAt(0, 0, 5 + pennyProgress * 0.5);
        }
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Collision handler
  const handleCollision = useCallback(() => {
    if (collisionCountRef.current === 0 || Date.now() - lastMoveTime > 500) {
      collisionCountRef.current++;
      setHearts(prev => {
        const newHearts = prev - 1;
        if (newHearts <= 0) {
          endGame();
        }
        return Math.max(0, newHearts);
      });
      playSound(200, 0.2, 'sawtooth');

      // Flash penny red
      if (pennyRef.current) {
        const pennyMesh = pennyRef.current.children[0] as THREE.Mesh;
        const originalColor = (pennyMesh.material as THREE.MeshStandardMaterial).color.getHex();
        (pennyMesh.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
        setTimeout(() => {
          if (pennyRef.current) {
            (pennyMesh.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
          }
        }, 200);
      }
    }
  }, [lastMoveTime]);

  // Mouse move handler - Show directional arrows AROUND THE COIN
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !pennyRef.current || !cameraRef.current || !mountRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) return;

    const currentX = pennyRef.current.position.x;
    const currentZ = pennyRef.current.position.z;
    const deltaX = intersectPoint.x - currentX;
    const deltaZ = intersectPoint.z - currentZ;

    // Determine direction for arrow
    let direction = '';
    if (Math.abs(deltaZ) > Math.abs(deltaX)) {
      direction = deltaZ > 0.5 ? 'forward' : 'forward'; // Always forward
    } else {
      if (Math.abs(deltaX) > 0.5) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = 'forward';
      }
    }

    // Project penny position to screen coordinates to show arrow AROUND THE COIN
    const pennyScreenPos = pennyRef.current.position.clone();
    pennyScreenPos.project(cameraRef.current);
    
    const screenX = (pennyScreenPos.x * 0.5 + 0.5) * rect.width;
    const screenY = (-pennyScreenPos.y * 0.5 + 0.5) * rect.height;

    // Show arrow around the penny position
    setShowArrow({
      direction,
      x: screenX,
      y: screenY
    });
  }, [gameState]);

  // Click-to-move handler - STEP-BASED with DOUBLE-CLICK JUMP
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || hearts <= 0 || !pennyRef.current || !cameraRef.current || !mountRef.current) return;

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // DOUBLE-CLICK DETECTION (< 300ms = jump!) - Check BEFORE isMoving
    const isDoubleClick = timeSinceLastClick < 300 && timeSinceLastClick > 10;
    
    // If already moving and NOT a double-click, ignore
    if (isMoving && !isDoubleClick) return;
    
    // Debug log for double-click
    if (isDoubleClick) {
      console.log('🦘 JUMP DETECTED! Time between clicks:', timeSinceLastClick, 'ms');
    }
    
    lastClickTimeRef.current = now;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) return;

    const timeSinceLastMove = now - lastMoveTime;
    const jumpMultiplier = isDoubleClick ? 2 : 1;
    
    moveTimingsRef.current.push(timeSinceLastMove);

    setIsMoving(true);
    setMoveCount(prev => prev + 1);
    setLastMoveTime(now);

    const currentX = pennyRef.current.position.x;
    const currentZ = pennyRef.current.position.z;
    const deltaX = intersectPoint.x - currentX;
    const deltaZ = intersectPoint.z - currentZ;

    let targetX = currentX;
    let targetZ = currentZ;

    // Determine movement direction (with jump multiplier)
    if (Math.abs(deltaZ) > Math.abs(deltaX)) {
      if (deltaZ > 0.5) {
        targetZ = currentZ + (2.5 * jumpMultiplier);
      }
    } else {
      if (Math.abs(deltaX) > 0.5) {
        if (deltaX > 0) {
          targetX = Math.min(currentX + (4 * jumpMultiplier), 8);
        } else {
          targetX = Math.max(currentX - (4 * jumpMultiplier), -8);
        }
      } else {
        targetZ = currentZ + (2.5 * jumpMultiplier);
      }
    }

    if (targetZ < currentZ) {
      targetZ = currentZ + (2.5 * jumpMultiplier);
    }

    const startX = currentX;
    const startZ = currentZ;
    const distanceMoved = Math.abs(targetZ - startZ) + Math.abs(targetX - startX);
    const duration = isDoubleClick ? 350 : 250; // FASTER, smoother
    const startTime = Date.now();

    // GORGEOUS JUMP ANIMATION - Super obvious visual feedback!
    if (isDoubleClick) {
      console.log('✅ DOUBLE-CLICK JUMP ACTIVATED!', {
        jumpDistance: `${jumpMultiplier}x`,
        duration: `${duration}ms`,
        scoreBonus: '50%'
      });
      
      // Show jump indicator on screen - BRIEF flash
      setShowJumpIndicator(true);
      setTimeout(() => setShowJumpIndicator(false), 200); // Only 200ms!
      
      playSound(700, 0.2, 'sine'); // Jump sound (reduced volume)
      
      // Flash penny bright for jump - OPTIMIZED
      if (pennyRef.current && pennyRef.current.children[0]) {
        const pennyMesh = pennyRef.current.children[0] as THREE.Mesh;
        const mat = pennyMesh.material as THREE.MeshStandardMaterial;
        const originalIntensity = mat.emissiveIntensity || 0.5;
        mat.emissiveIntensity = 2.0;
        setTimeout(() => {
          if (pennyRef.current && pennyRef.current.children[0]) {
            ((pennyRef.current.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = originalIntensity;
          }
        }, 200);
      }
    }

    const animateMove = () => {
      if (!pennyRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smoother easing for movement
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      pennyRef.current.position.x = startX + (targetX - startX) * easeProgress;
      pennyRef.current.position.z = startZ + (targetZ - startZ) * easeProgress;
      
      // SMOOTH JUMP ARC
      if (isDoubleClick) {
        const jumpArc = Math.sin(progress * Math.PI) * 2.0; // Smooth arc
        pennyRef.current.position.y = 0.8 + jumpArc;
        pennyRef.current.rotation.z = progress * Math.PI * 0.3; // Less rotation
      } else {
        pennyRef.current.rotation.z = 0;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateMove);
      } else {
        setIsMoving(false);
        
        if (distanceMoved > 0) {
          setPennyPosition(prev => prev + distanceMoved);
          
          // ADVANCED DECIMAL SCORING based on precise timing
          const basePoints = 10 * (distanceMoved / 2.5);
          
          // Speed bonus (more precise decimal calculation)
          const perfectMoveTime = 500; // 500ms = perfect
          const speedRatio = Math.min(1, perfectMoveTime / Math.max(timeSinceLastMove, 100));
          const speedBonus = speedRatio * speedRatio; // Squared for exponential reward
          
          // Jump bonus
          const jumpBonus = isDoubleClick ? 1.5 : 1.0;
          
          // Risk bonus (closer to cars = more points)
          const riskBonus = 1.0; // TODO: Could add proximity detection
          
          // Final calculation with decimals
          const points = basePoints * (1 + speedBonus) * jumpBonus * riskBonus;
          
          setScore(prev => prev + points);
          
          // Visual feedback for good timing
          if (speedBonus > 0.8) {
            playSound(600 + (progress * 300), 0.15, 'sine');
          } else {
            playSound(500 + (progress * 200), 0.15, 'sine');
          }
          
          // Simplified console log
          if (isDoubleClick) {
            console.log(`💰 JUMP! +${points.toFixed(1)} pts`);
          }
        }
      }
    };
    
    animateMove();
  }, [gameState, isMoving, hearts, lastMoveTime]);

  // End game
  const endGame = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setGameState('ended');
    setIsSubmitting(true);

    let finalScore = score;
    const heartBonus = hearts * 50;
    finalScore += heartBonus;

    const timeUsed = 60 - timeRemaining;
    const timeEfficiency = pennyPosition / Math.max(1, timeUsed);
    const timeBonus = Math.floor(timeEfficiency * 10);
    finalScore += timeBonus;

    const totalPossibleCollisions = pennyPosition * 3;
    const accuracy = Math.min(100, Math.max(0, 100 - (collisionCountRef.current / Math.max(1, totalPossibleCollisions)) * 100));

    const avgMoveTime = moveTimingsRef.current.reduce((a, b) => a + b, 0) / Math.max(1, moveTimingsRef.current.length);
    const isSuspicious = avgMoveTime < 50 || moveCount > 100;

    if (isSuspicious) {
      finalScore = Math.floor(finalScore * 0.5);
    }

    playSound(600, 0.5, 'sine');

    logGameCompletion({
      gameType: GAME_TYPES.PENNY_PASSER,
      gameMode: gameMode === 'competition' ? GAME_MODES.COMPETITION : GAME_MODES.PRACTICE,
      score: finalScore,
      accuracy: accuracy,
      reactionTime: avgMoveTime,
      durationSeconds: 60 - timeRemaining,
      additionalData: {
        moveCount,
        pennyPosition,
        heartsRemaining: hearts,
        collisions: collisionCountRef.current,
        heartBonus,
        timeBonus,
        rngSeed: rngSeed || 0,
        competitionId: competitionId || null
      }
    }).catch(err => console.warn('[PennyPasser] Audit log failed:', err));

    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    setTimeout(() => {
      onGameEnd({ score: finalScore, accuracy: accuracy });
      setIsSubmitting(false);
    }, 1500);
  }, [score, hearts, timeRemaining, pennyPosition, moveCount, gameMode, rngSeed, competitionId, onGameEnd]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-50">
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowArrow(null)}
      />

      {gameState === 'playing' && (
        <>
          {/* HUD - Hearts on LEFT, Timer/Score on RIGHT */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-50">
            {/* Left: Hearts */}
            <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-xl">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`text-3xl ${i < hearts ? 'opacity-100' : 'opacity-20'}`}>
                    ❤️
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Timer and Score - SEPARATE, NON-OVERLAPPING */}
            <div className="flex flex-col gap-3 items-end">
              {/* Timer - TOP RIGHT CORNER */}
              <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-yellow-400/50 shadow-xl">
                <div className="text-3xl font-black text-yellow-400 text-center min-w-[100px]">
                  ⏱️ {timeRemaining}s
                </div>
              </div>
              
              {/* Score - Below timer with precise decimals */}
              <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-xl">
                <div className="text-sm text-gray-300 text-right">Score</div>
                <div className="text-2xl font-bold text-green-400 text-right">
                  {score.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1 text-right">
                  Dist: {pennyPosition.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Directional Arrows AROUND THE COIN */}
          {showArrow && (
            <div 
              className="absolute pointer-events-none"
              style={{
                left: showArrow.x,
                top: showArrow.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 60
              }}
            >
              {/* Forward Arrow - Above coin */}
              {showArrow.direction === 'forward' && (
                <div className="absolute" style={{ top: '-80px', left: '50%', transform: 'translateX(-50%)' }}>
                  <div className="text-6xl animate-bounce text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]">
                    ⬆️
                  </div>
                  <div className="text-xs font-bold text-yellow-300 bg-black/90 px-2 py-1 rounded-full text-center mt-2 whitespace-nowrap">
                    Double-click = JUMP!
                  </div>
                </div>
              )}
              
              {/* Left Arrow - Left of coin */}
              {showArrow.direction === 'left' && (
                <div className="absolute" style={{ left: '-100px', top: '50%', transform: 'translateY(-50%)' }}>
                  <div className="text-6xl animate-bounce text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]">
                    ⬅️
                  </div>
                  <div className="text-xs font-bold text-yellow-300 bg-black/90 px-2 py-1 rounded-full text-center mt-2 whitespace-nowrap">
                    Double-click = JUMP!
                  </div>
                </div>
              )}
              
              {/* Right Arrow - Right of coin */}
              {showArrow.direction === 'right' && (
                <div className="absolute" style={{ left: '100px', top: '50%', transform: 'translateY(-50%)' }}>
                  <div className="text-6xl animate-bounce text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,1)]">
                    ➡️
                  </div>
                  <div className="text-xs font-bold text-yellow-300 bg-black/90 px-2 py-1 rounded-full text-center mt-2 whitespace-nowrap">
                    Double-click = JUMP!
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* JUMP INDICATOR - TOP of screen, brief flash */}
          {showJumpIndicator && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none z-50 animate-pulse">
              <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white text-3xl font-black px-6 py-2 rounded-xl border-2 border-white shadow-2xl">
                🦘 JUMP! +50% 🦘
              </div>
            </div>
          )}
        </>
      )}

      {gameState === 'playing' && timeRemaining > 55 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-black/90 via-purple-900/50 to-black/90 backdrop-blur-md rounded-xl p-4 border-2 border-yellow-400/70 shadow-2xl pointer-events-none z-40">
          <div className="text-white text-center">
            <div className="text-xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              🪙 Click = Hop • Double-Click = JUMP! 🦘
            </div>
            <div className="text-xs text-gray-200">
              <div>⬆️⬅️➡️ Arrows show direction • Faster moves = More points 💰</div>
              <div>🚗 Avoid cars • 🦘 Jump over obstacles • ❤️ Keep your hearts</div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'ended' && !isSubmitting && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md border-2 border-yellow-400/50 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🪙</div>
              <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
              
              <div className="space-y-3 mb-6">
                <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 rounded-lg p-4 border border-yellow-500/30">
                  <div className="text-sm text-yellow-300">Final Score</div>
                  <div className="text-4xl font-black text-yellow-400">{score.toFixed(2)}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Distance</div>
                    <div className="text-xl font-bold text-white">{pennyPosition.toFixed(1)}</div>
                  </div>
                  
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Hearts</div>
                    <div className="text-xl font-bold text-red-400">{hearts} ❤️</div>
                  </div>
                  
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Moves</div>
                    <div className="text-xl font-bold text-blue-400">{moveCount}</div>
                  </div>
                  
                  <div className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-gray-400">Time</div>
                    <div className="text-xl font-bold text-purple-400">{60 - timeRemaining}s</div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-400">
                {hearts > 0 ? '✨ Great job! You survived!' : '💔 Better luck next time!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
            <div className="text-white text-xl">Recording Score...</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full pointer-events-none backdrop-blur-sm">
        v3.6.2 - LARGE SAFE ZONE - 4+ Lane Moves
      </div>
    </div>
  );
}
