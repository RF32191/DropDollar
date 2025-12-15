'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FairRNGService } from '@/lib/fairRNGService';
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
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  createdAt: number;
}

interface AlienShip {
  id: number;
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  direction: { x: number; y: number; z: number };
  createdAt: number;
  hitPoints: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

interface SubItem {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  type: 'bonus' | 'multiplier' | 'time';
  createdAt: number;
  parentShipId: number;
}

interface HitResult {
  shipId: number;
  distanceFromCenter: number;
  points: number;
  isCenterShot: boolean;
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
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [ships, setShips] = useState<AlienShip[]>([]);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [bowPower, setBowPower] = useState(0); // 0-100
  const [isDrawing, setIsDrawing] = useState(false);
  const [aimAngle, setAimAngle] = useState(0); // -45 to 45 degrees
  const [hits, setHits] = useState<HitResult[]>([]);
  const [accuracy, setAccuracy] = useState(0);
  
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const bowRef = useRef<THREE.Group | null>(null);
  const arrowRef = useRef<THREE.Group | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const currentScoreRef = useRef(0);
  const totalShotsRef = useRef(0);
  const totalHitsRef = useRef(0);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const bowPowerRef = useRef(0);
  const aimAngleRef = useRef(0);
  const lastArrowIdRef = useRef(0);
  const lastShipIdRef = useRef(0);
  const lastSubItemIdRef = useRef(0);
  
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

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || gameState !== 'playing') return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    scene.fog = new THREE.FogExp2(0x000011, 0.002);
    
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    // Neon lighting
    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x00ffff, 2, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xff00ff, 2, 50);
    pointLight2.position.set(-5, 5, -5);
    scene.add(pointLight2);
    
    // Create laser bow
    const bowGroup = new THREE.Group();
    
    // Bow frame (neon cyan)
    const bowGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const bowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5
    });
    const bowFrame = new THREE.Mesh(bowGeometry, bowMaterial);
    bowFrame.position.set(0, -1, 0);
    bowGroup.add(bowFrame);
    
    // Bow string (glowing line)
    const stringGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.15, -0.85, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0.15, -0.85, 0)
    ]);
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const bowString = new THREE.Line(stringGeometry, stringMaterial);
    bowGroup.add(bowString);
    
    scene.add(bowGroup);
    bowRef.current = bowGroup;
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Update bow animation
      if (bowRef.current && isDrawingRef.current) {
        const drawProgress = bowPowerRef.current / 100;
        bowRef.current.rotation.z = -aimAngleRef.current * Math.PI / 180;
        
        // Animate bow string
        const string = bowRef.current.children[1] as THREE.Line;
        if (string) {
          const points = [
            new THREE.Vector3(-0.15, -0.85, 0),
            new THREE.Vector3(0, -1 - drawProgress * 0.2, 0),
            new THREE.Vector3(0.15, -0.85, 0)
          ];
          string.geometry.setFromPoints(points);
        }
      }
      
      // Update arrows
      setArrows(prev => {
        const updated = prev.map(arrow => {
          const newX = arrow.x + arrow.vx * 0.016;
          const newY = arrow.y + arrow.vy * 0.016;
          const newVy = arrow.vy - 9.8 * 0.016; // Gravity
          return {
            ...arrow,
            x: newX,
            y: newY,
            vy: newVy,
            rotation: Math.atan2(arrow.vy, arrow.vx)
          };
        }).filter(arrow => {
          // Remove arrows that are out of bounds
          return arrow.y > -10 && arrow.x > -20 && arrow.x < 20 && arrow.z > -20 && arrow.z < 20;
        });
        
        // Check collisions with ships
        updated.forEach(arrow => {
          ships.forEach(ship => {
            const dx = arrow.x - ship.x;
            const dy = arrow.y - ship.y;
            const dz = arrow.z - ship.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance < ship.size) {
              // Hit!
              const centerDx = arrow.x - ship.centerX;
              const centerDy = arrow.y - ship.centerY;
              const centerDz = arrow.z - ship.centerZ;
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
              
              setHits(prev => [...prev, {
                shipId: ship.id,
                distanceFromCenter,
                points,
                isCenterShot
              }]);
              
              // Spawn sub-items
              for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 * i) / 3;
                const subItem: SubItem = {
                  id: ++lastSubItemIdRef.current,
                  x: ship.x,
                  y: ship.y,
                  z: ship.z,
                  vx: Math.cos(angle) * 2,
                  vy: Math.sin(angle) * 2 + 1,
                  vz: Math.sin(angle) * 2,
                  type: ['bonus', 'multiplier', 'time'][i] as 'bonus' | 'multiplier' | 'time',
                  createdAt: Date.now(),
                  parentShipId: ship.id
                };
                setSubItems(prev => [...prev, subItem]);
              }
              
              // Remove ship
              setShips(prev => prev.filter(s => s.id !== ship.id));
            }
          });
        });
        
        return updated;
      });
      
      // Update ships
      setShips(prev => prev.map(ship => ({
        ...ship,
        x: ship.x + ship.direction.x * ship.speed * 0.016,
        y: ship.y + ship.direction.y * ship.speed * 0.016,
        z: ship.z + ship.direction.z * ship.speed * 0.016
      })).filter(ship => {
        // Remove ships that are out of bounds
        return ship.x > -30 && ship.x < 30 && ship.y > -30 && ship.y < 30 && ship.z > -30 && ship.z < 30;
      }));
      
      // Update sub-items
      setSubItems(prev => prev.map(item => ({
        ...item,
        x: item.x + item.vx * 0.016,
        y: item.y + item.vy * 0.016 - 9.8 * 0.016 * 0.016, // Gravity
        z: item.z + item.vz * 0.016,
        vy: item.vy - 9.8 * 0.016
      })).filter(item => {
        // Check if arrow hits sub-item
        const arrowHit = arrows.find(arrow => {
          const dx = arrow.x - item.x;
          const dy = arrow.y - item.y;
          const dz = arrow.z - item.z;
          return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.5;
        });
        
        if (arrowHit) {
          // Bonus points for hitting sub-item
          const bonusPoints = item.type === 'bonus' ? 25 : item.type === 'multiplier' ? 50 : 10;
          currentScoreRef.current += bonusPoints;
          return false; // Remove item
        }
        
        return item.y > -10 && item.x > -20 && item.x < 20 && item.z > -20 && item.z < 20;
      }));
      
      setScore(currentScoreRef.current);
      setAccuracy(totalShotsRef.current > 0 ? (totalHitsRef.current / totalShotsRef.current) * 100 : 0);
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement.parentNode) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState, ships, arrows, subItems]);

  // Spawn ships
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const spawnShip = () => {
      const now = Date.now();
      if (now - lastSpawnRef.current < 2000) return; // Spawn every 2 seconds
      lastSpawnRef.current = now;
      
      const rng = seededRng || {
        nextFloat: (min: number, max: number) => Math.random() * (max - min) + min,
        nextInt: (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min
      };
      
      const side = rng.nextInt(0, 4); // 0=left, 1=right, 2=top, 3=bottom
      let x, y, z;
      
      switch (side) {
        case 0: // Left
          x = -15;
          y = rng.nextFloat(-5, 5);
          z = rng.nextFloat(-10, 10);
          break;
        case 1: // Right
          x = 15;
          y = rng.nextFloat(-5, 5);
          z = rng.nextFloat(-10, 10);
          break;
        case 2: // Top
          x = rng.nextFloat(-10, 10);
          y = 10;
          z = rng.nextFloat(-10, 10);
          break;
        default: // Bottom
          x = rng.nextFloat(-10, 10);
          y = -5;
          z = rng.nextFloat(-10, 10);
      }
      
      const ship: AlienShip = {
        id: ++lastShipIdRef.current,
        x,
        y,
        z,
        size: rng.nextFloat(0.5, 1.5),
        speed: rng.nextFloat(1, 3),
        direction: {
          x: rng.nextFloat(-1, 1),
          y: rng.nextFloat(-0.5, 0.5),
          z: rng.nextFloat(-1, 1)
        },
        createdAt: now,
        hitPoints: 1,
        centerX: x,
        centerY: y,
        centerZ: z
      };
      
      setShips(prev => [...prev, ship]);
    };
    
    const spawnInterval = setInterval(spawnShip, 2000);
    return () => clearInterval(spawnInterval);
  }, [gameState, seededRng]);

  // Handle mouse/touch for aiming and drawing
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    setIsDrawing(true);
    isDrawingRef.current = true;
    bowPowerRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || !isDrawingRef.current) return;
    
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
      bowPowerRef.current = Math.min(100, bowPowerRef.current + 2);
      setBowPower(bowPowerRef.current);
    }
  };

  const handleMouseUp = () => {
    if (gameState !== 'playing' || !isDrawingRef.current) return;
    
    setIsDrawing(false);
    isDrawingRef.current = false;
    
    // Shoot arrow
    const power = bowPowerRef.current / 100;
    const angle = aimAngleRef.current * Math.PI / 180;
    const speed = 15 + power * 20; // Base speed + power multiplier
    
    const arrow: Arrow = {
      id: ++lastArrowIdRef.current,
      x: 0,
      y: -1,
      z: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: angle,
      createdAt: Date.now()
    };
    
    setArrows(prev => [...prev, arrow]);
    totalShotsRef.current++;
    bowPowerRef.current = 0;
    setBowPower(0);
  };

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
      />
    </div>
  );
}

