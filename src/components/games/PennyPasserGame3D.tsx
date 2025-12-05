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

// 20 pre-defined fair patterns (RNG-seeded)
const PATTERN_CONFIGS = [
  { numCars: 2, spacing: 10, speed: 0.03, direction: 1 },
  { numCars: 3, spacing: 7, speed: 0.04, direction: -1 },
  { numCars: 2, spacing: 12, speed: 0.05, direction: 1 },
  { numCars: 4, spacing: 5, speed: 0.03, direction: -1 },
  { numCars: 3, spacing: 8, speed: 0.06, direction: 1 },
  { numCars: 2, spacing: 15, speed: 0.04, direction: -1 },
  { numCars: 3, spacing: 6, speed: 0.05, direction: 1 },
  { numCars: 4, spacing: 6, speed: 0.04, direction: -1 },
  { numCars: 2, spacing: 11, speed: 0.07, direction: 1 },
  { numCars: 3, spacing: 9, speed: 0.05, direction: -1 },
  { numCars: 4, spacing: 7, speed: 0.03, direction: 1 },
  { numCars: 2, spacing: 14, speed: 0.06, direction: -1 },
  { numCars: 3, spacing: 7, speed: 0.04, direction: 1 },
  { numCars: 4, spacing: 5, speed: 0.05, direction: -1 },
  { numCars: 2, spacing: 13, speed: 0.04, direction: 1 },
  { numCars: 3, spacing: 10, speed: 0.06, direction: -1 },
  { numCars: 4, spacing: 6, speed: 0.04, direction: 1 },
  { numCars: 2, spacing: 16, speed: 0.05, direction: -1 },
  { numCars: 3, spacing: 8, speed: 0.07, direction: 1 },
  { numCars: 4, spacing: 8, speed: 0.04, direction: -1 }
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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground/Road
    const roadGeometry = new THREE.PlaneGeometry(20, 50);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    scene.add(road);

    // Lane dividers
    for (let i = -2; i <= 2; i++) {
      const dividerGeometry = new THREE.BoxGeometry(0.1, 0.1, 50);
      const dividerMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
      const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
      divider.position.set(i * 4, 0.05, 0);
      scene.add(divider);
    }

    // Create GOLDEN PENNY (player) - BIGGER and PROMINENT
    const pennyGroup = new THREE.Group();
    
    const pennyGeometry = new THREE.CylinderGeometry(1, 1, 0.3, 32);
    const pennyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.3
    });
    const penny = new THREE.Mesh(pennyGeometry, pennyMaterial);
    penny.rotation.x = Math.PI / 2;
    penny.castShadow = true;
    pennyGroup.add(penny);
    
    // Add shiny ring around penny for extra visibility
    const ringGeometry = new THREE.TorusGeometry(1.1, 0.1, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFAA,
      metalness: 1,
      roughness: 0,
      emissive: 0xFFFFAA,
      emissiveIntensity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    pennyGroup.add(ring);
    
    pennyGroup.position.set(0, 0.8, -20);
    scene.add(pennyGroup);
    pennyRef.current = pennyGroup;

    // Create lanes with CARS using 20 RNG patterns
    const lanes: Lane[] = [];
    const numLanes = 15;
    const rng = rngRef.current;

    for (let i = 0; i < numLanes; i++) {
      const yPos = -15 + (i * 2.5);
      
      // Select pattern from 20 predefined patterns using RNG
      const patternIndex = rng.integer(0, 19);
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

      // Animate hopping penny
      hopAnimationRef.current += 0.15;
      const hopHeight = Math.abs(Math.sin(hopAnimationRef.current)) * 0.3;
      pennyRef.current.position.y = 0.8 + hopHeight;
      pennyRef.current.rotation.y += 0.08;

      // Move cars in lanes
      lanesRef.current.forEach(lane => {
        lane.cars.forEach(car => {
          car.x += lane.speed * lane.direction;
          
          // Wrap around
          if (car.x > 12) car.x = -12;
          if (car.x < -12) car.x = 12;
          
          car.mesh.position.x = car.x;
        });
      });

      // Check collisions
      if (pennyRef.current) {
        const pennyZ = pennyRef.current.position.z;
        const pennyX = pennyRef.current.position.x;
        const tolerance = 1.8; // Bigger penny = bigger hitbox

        lanesRef.current.forEach(lane => {
          if (Math.abs(pennyZ - lane.y) < tolerance) {
            lane.cars.forEach(car => {
              const distanceX = Math.abs(pennyX - car.x);
              const distanceZ = Math.abs(pennyZ - lane.y);
              if (distanceX < 2 && distanceZ < 1.5) {
                handleCollision();
              }
            });
          }
        });
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

  // Mouse move handler - Show directional arrows
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

    // Show arrow at cursor position
    setShowArrow({
      direction,
      x: event.clientX,
      y: event.clientY
    });
  }, [gameState]);

  // Click-to-move handler - STEP-BASED with DOUBLE-CLICK JUMP
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || isMoving || hearts <= 0 || !pennyRef.current || !cameraRef.current || !mountRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) return;

    const now = Date.now();
    const timeSinceLastMove = now - lastMoveTime;
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // DOUBLE-CLICK DETECTION (< 300ms = jump!)
    const isDoubleClick = timeSinceLastClick < 300;
    const jumpMultiplier = isDoubleClick ? 2 : 1;
    
    lastClickTimeRef.current = now;
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
    const duration = isDoubleClick ? 400 : 300; // Longer for jumps
    const startTime = Date.now();

    // Play jump sound if double-click
    if (isDoubleClick) {
      playSound(700, 0.2, 'sine');
    }

    const animateMove = () => {
      if (!pennyRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      pennyRef.current.position.x = startX + (targetX - startX) * easeProgress;
      pennyRef.current.position.z = startZ + (targetZ - startZ) * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animateMove);
      } else {
        setIsMoving(false);
        
        if (distanceMoved > 0) {
          setPennyPosition(prev => prev + distanceMoved);
          const speedBonus = Math.max(0, 1 - (timeSinceLastMove / 2000));
          const basePoints = 10 * (distanceMoved / 2.5);
          const points = basePoints * (1 + speedBonus) * (isDoubleClick ? 1.5 : 1); // Bonus for jumping!
          setScore(prev => prev + points);
          playSound(500 + (progress * 200), 0.15);
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
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setShowArrow(null)}
        style={{ minHeight: '600px' }}
      />

      {gameState === 'playing' && (
        <>
          {/* HUD - Left side: Hearts, Right side: Score & Timer */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            {/* Left: Hearts */}
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`text-2xl ${i < hearts ? 'opacity-100' : 'opacity-20'}`}>
                    ❤️
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Score and Timer stacked */}
            <div className="flex flex-col gap-2">
              {/* Timer - TOP RIGHT */}
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <div className="text-2xl font-bold text-white text-center">
                  ⏱️ {timeRemaining}s
                </div>
              </div>
              
              {/* Score */}
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-right">
                <div className="text-sm text-gray-300">Score</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {score.toFixed(1)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Distance: {pennyPosition.toFixed(0)}
                </div>
              </div>
            </div>
          </div>

          {/* Directional Arrow Indicator */}
          {showArrow && (
            <div 
              className="absolute pointer-events-none"
              style={{
                left: showArrow.x - 30,
                top: showArrow.y - 30,
                width: '60px',
                height: '60px',
                zIndex: 100
              }}
            >
              <div className="relative w-full h-full">
                {showArrow.direction === 'forward' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-5xl animate-pulse text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,1)]">
                      ⬆️
                    </div>
                  </div>
                )}
                {showArrow.direction === 'left' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-5xl animate-pulse text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,1)]">
                      ⬅️
                    </div>
                  </div>
                )}
                {showArrow.direction === 'right' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-5xl animate-pulse text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,1)]">
                      ➡️
                    </div>
                  </div>
                )}
                {/* Jump indicator for double-click */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <div className="text-xs font-bold text-yellow-300 bg-black/80 px-2 py-1 rounded-full">
                    Double-click = JUMP!
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {gameState === 'playing' && timeRemaining > 55 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/50 animate-pulse pointer-events-none">
          <div className="text-white text-center">
            <div className="text-xl font-bold mb-2">🪙 Click to hop • Double-click to JUMP!</div>
            <div className="text-sm text-gray-300">Avoid cars 🚗 • Follow arrows ➡️ • Keep your hearts ❤️</div>
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
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Final Score</div>
                  <div className="text-3xl font-bold text-yellow-400">{score.toFixed(1)}</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Distance Traveled</div>
                  <div className="text-2xl font-bold text-white">{pennyPosition.toFixed(0)}</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Hearts Remaining</div>
                  <div className="text-2xl font-bold text-red-400">{hearts} ❤️</div>
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

      <div className="absolute bottom-2 right-2 text-xs text-gray-500 pointer-events-none">
        v3.1 - BUILD 20251205 - Penny Passer (Jump + Arrows)
      </div>
    </div>
  );
}
