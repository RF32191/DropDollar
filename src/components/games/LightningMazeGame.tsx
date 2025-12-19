'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface LightningMazeGameProps {
  onGameComplete: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
}

// Seeded random number generator for fair gameplay
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

// Maze cell types
type CellType = 'wall' | 'path' | 'checkpoint' | 'start' | 'end' | 'changing';

interface Checkpoint {
  x: number;
  z: number;
  reached: boolean;
  reachTime?: number;
  mesh?: THREE.Group;
}

interface MovingObstacle {
  mesh: THREE.Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  pathCells: { x: number; z: number }[];
  pathIndex: number;
  speed: number;
}

// Generate a maze using recursive backtracking with seeded RNG
function generateMaze(width: number, height: number, rng: Mulberry32): CellType[][] {
  const maze: CellType[][] = Array(height).fill(null).map(() => Array(width).fill('wall'));
  
  const carve = (x: number, z: number) => {
    maze[z][x] = 'path';
    const directions = [
      [0, -2], [0, 2], [-2, 0], [2, 0]
    ].sort(() => rng.next() - 0.5);
    
    for (const [dx, dz] of directions) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx > 0 && nx < width - 1 && nz > 0 && nz < height - 1 && maze[nz][nx] === 'wall') {
        maze[z + dz / 2][x + dx / 2] = 'path';
        carve(nx, nz);
      }
    }
  };
  
  carve(1, 1);
  
  // Add extra passages for more interesting paths
  for (let i = 0; i < width * height / 12; i++) {
    const x = Math.floor(rng.next() * (width - 2)) + 1;
    const z = Math.floor(rng.next() * (height - 2)) + 1;
    if (maze[z][x] === 'wall') {
      const hasPath = 
        (z > 0 && maze[z - 1][x] === 'path') ||
        (z < height - 1 && maze[z + 1][x] === 'path') ||
        (x > 0 && maze[z][x - 1] === 'path') ||
        (x < width - 1 && maze[z][x + 1] === 'path');
      if (hasPath) {
        maze[z][x] = 'path';
      }
    }
  }
  
  return maze;
}

export default function LightningMazeGame({ onGameComplete, onExit, gameMode = 'practice', rngSeed }: LightningMazeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lightningRef = useRef<THREE.Group | null>(null);
  const lightningPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const targetPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const lastDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1)); // Track direction for rotation
  const targetRotationRef = useRef<number>(0); // Target Y rotation
  const currentRotationRef = useRef<number>(0); // Current Y rotation (smoothed)
  const mazeRef = useRef<CellType[][]>([]);
  const mazeMeshesRef = useRef<THREE.Object3D[]>([]);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const obstaclesRef = useRef<MovingObstacle[]>([]);
  const resistorsRef = useRef<{ mesh: THREE.Group; x: number; z: number }[]>([]);
  const diodesRef = useRef<{ mesh: THREE.Group; x: number; z: number; direction: number }[]>([]);
  const startMarkerRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lightningTimeRef = useRef<number>(0);
  const hasControlRef = useRef<boolean>(false);
  const wallHitCooldownRef = useRef<number>(0);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  
  // Seeded RNG for deterministic/fair gameplay
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('⚡ [LightningMaze] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const getRandom = useCallback(() => {
    return seededRng.next();
  }, [seededRng]);
  
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [currentMaze, setCurrentMaze] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [mazesCompleted, setMazesCompleted] = useState(0);
  const [wallHits, setWallHits] = useState(0);
  const [is2DMode, setIs2DMode] = useState(false); // Alternating 2D/3D modes
  const [isMobile, setIsMobile] = useState(false); // Detect mobile for responsive layout
  const [gyroEnabled, setGyroEnabled] = useState(false); // Gyroscope control for mobile
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null);
  const gyroEnabledRef = useRef(false);
  
  const scoreRef = useRef(0);
  const gameStateRef = useRef<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const startTimeRef = useRef<number>(0);
  const currentMazeRef = useRef(1);
  const mazesCompletedRef = useRef(0);
  const is2DModeRef = useRef(false);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);

  const MAZE_WIDTH = 17;
  const MAZE_HEIGHT = 17;
  const CELL_SIZE = 2.5;
  const TOTAL_MAZES = 5;
  const GAME_DURATION = 90; // seconds
  const CHECKPOINTS_PER_MAZE = 5;

  // Create IC Chip checkpoint (circuit board theme) - TALL and PROMINENT
  const createTeslaCoil = useCallback((color: number = 0x222222) => {
    const group = new THREE.Group();
    
    // Base plate (PCB substrate)
    const baseGeometry = new THREE.BoxGeometry(2.2, 0.15, 1.6);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x0a3d0a }); // PCB green
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.08;
    group.add(base);
    
    // IC Chip body (black rectangle) - TALLER
    const chipGeometry = new THREE.BoxGeometry(1.8, 0.8, 1.3);
    const chipMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const chip = new THREE.Mesh(chipGeometry, chipMaterial);
    chip.position.y = 0.55;
    group.add(chip);
    
    // Chip top bevel
    const topBevelGeometry = new THREE.BoxGeometry(1.7, 0.1, 1.2);
    const topBevelMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const topBevel = new THREE.Mesh(topBevelGeometry, topBevelMaterial);
    topBevel.position.y = 1.0;
    group.add(topBevel);
    
    // Chip label (silver/white marking)
    const labelGeometry = new THREE.PlaneGeometry(1.2, 0.6);
    const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.9 });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.rotation.x = -Math.PI / 2;
    label.position.y = 1.06;
    group.add(label);
    
    // IC Chip pins (legs) - left side - BIGGER & BENT
    for (let i = 0; i < 6; i++) {
      // Horizontal part
      const pinHGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.12);
      const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 }); // Silver pins
      const pinH = new THREE.Mesh(pinHGeometry, pinMaterial);
      pinH.position.set(-1.15, 0.3, -0.5 + i * 0.2);
      group.add(pinH);
      // Vertical part (bent down)
      const pinVGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.12);
      const pinV = new THREE.Mesh(pinVGeometry, pinMaterial.clone());
      pinV.position.set(-1.35, 0.15, -0.5 + i * 0.2);
      group.add(pinV);
    }
    
    // IC Chip pins - right side
    for (let i = 0; i < 6; i++) {
      const pinHGeometry = new THREE.BoxGeometry(0.5, 0.08, 0.12);
      const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 });
      const pinH = new THREE.Mesh(pinHGeometry, pinMaterial);
      pinH.position.set(1.15, 0.3, -0.5 + i * 0.2);
      group.add(pinH);
      const pinVGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.12);
      const pinV = new THREE.Mesh(pinVGeometry, pinMaterial.clone());
      pinV.position.set(1.35, 0.15, -0.5 + i * 0.2);
      group.add(pinV);
    }
    
    // Glowing indicator LED on chip - BIGGER
    const ledGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const ledMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 1.0 
    });
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.position.set(0.5, 1.2, 0.3);
    led.name = 'led';
    group.add(led);
    
    // LED dome (glass cover)
    const domeGeometry = new THREE.SphereGeometry(0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x88ff88, 
      transparent: true, 
      opacity: 0.3 
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.set(0.5, 1.15, 0.3);
    group.add(dome);
    
    // LED glow rings - BIGGER and more visible
    for (let i = 0; i < 4; i++) {
      const ringGeometry = new THREE.TorusGeometry(0.3 + i * 0.15, 0.04, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.6 - i * 0.12 
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0.5, 1.3 + i * 0.15, 0.3);
      ring.name = `ring${i}`;
      group.add(ring);
    }
    
    // Spark particles for checkpoint effect - BIGGER
    for (let i = 0; i < 8; i++) {
      const sparkGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const sparkMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.9 
      });
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
      spark.position.y = 1.5;
      spark.name = `spark${i}`;
      group.add(spark);
    }
    
    // Point light (green glow) - BRIGHTER
    const light = new THREE.PointLight(0x00ff00, 4, 8);
    light.position.y = 1.5;
    group.add(light);
    
    return group;
  }, []);

  // Animate Tesla coil
  const animateTeslaCoil = useCallback((coil: THREE.Group, time: number) => {
    // Animate rings
    for (let i = 0; i < 5; i++) {
      const ring = coil.getObjectByName(`ring${i}`) as THREE.Mesh;
      if (ring) {
        ring.rotation.z = time * (2 + i * 0.5);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(time * 5 + i) * 0.3;
      }
    }
    
    // Animate sparks
    for (let i = 0; i < 6; i++) {
      const spark = coil.getObjectByName(`spark${i}`) as THREE.Mesh;
      if (spark) {
        const angle = (i / 6) * Math.PI * 2 + time * 3;
        const radius = 0.4 + Math.sin(time * 10 + i) * 0.2;
        spark.position.x = Math.cos(angle) * radius;
        spark.position.z = Math.sin(angle) * radius;
        spark.position.y = 2 + Math.sin(time * 8 + i * 2) * 0.3;
        (spark.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time * 15 + i * 3) * 0.5;
      }
    }
  }, []);

  // Create animated electrical current (circuit board theme - golden/yellow signal)
  const createLightningBolt = useCallback(() => {
    const group = new THREE.Group();
    
    // Main electrical signal - smooth wave shape
    const points: THREE.Vector3[] = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const y = (i / segments) * 3.5 - 1.75; // taller
      const wave = Math.sin(i * 0.8) * 0.15; // gentle wave
      points.push(new THREE.Vector3(wave, y, 0));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.18, 12, false);
    const boltMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00, // Golden yellow (electrical current color)
      transparent: true,
      opacity: 1.0,
    });
    const bolt = new THREE.Mesh(tubeGeometry, boltMaterial);
    bolt.name = 'mainBolt';
    group.add(bolt);
    
    // Bright white hot core
    const coreGeometry = new THREE.TubeGeometry(curve, 32, 0.07, 12, false);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'core';
    group.add(core);
    
    // Outer glow (electric orange/yellow)
    const glowGeometry = new THREE.TubeGeometry(curve, 32, 0.35, 12, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00, // Orange glow
      transparent: true,
      opacity: 0.35,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    // Electric spark branches (more subtle for circuit theme)
    for (let i = 0; i < 6; i++) {
      const branchPoints: THREE.Vector3[] = [];
      const startY = (Math.random() * 2.5) - 1.25;
      const startX = Math.sin(startY) * 0.15;
      branchPoints.push(new THREE.Vector3(startX, startY, 0));
      
      const direction = Math.random() > 0.5 ? 1 : -1;
      const length = 0.3 + Math.random() * 0.5;
      branchPoints.push(new THREE.Vector3(
        startX + direction * length * 0.5,
        startY + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.15
      ));
      branchPoints.push(new THREE.Vector3(
        startX + direction * length,
        startY + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2
      ));
      
      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchGeometry = new THREE.TubeGeometry(branchCurve, 12, 0.04, 6, false);
      const branchMaterial = new THREE.MeshBasicMaterial({
        color: 0xffee00, // Yellow sparks
        transparent: true,
        opacity: 0.7,
      });
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.name = `branch${i}`;
      group.add(branch);
    }
    
    // Point light (warm electrical glow)
    const pointLight = new THREE.PointLight(0xffcc00, 4, 10);
    pointLight.position.set(0, 0, 0);
    group.add(pointLight);
    
    // Secondary glow light
    const glowLight = new THREE.PointLight(0x0088ff, 2, 8);
    glowLight.position.set(0, 1, 0);
    group.add(glowLight);
    
    group.scale.set(1.2, 1.2, 1.2); // Scaled up
    group.rotation.x = -Math.PI / 2;
    
    return group;
  }, []);

  // Update lightning animation
  const updateLightningAnimation = useCallback((group: THREE.Group, time: number) => {
    const mainBolt = group.getObjectByName('mainBolt') as THREE.Mesh;
    const core = group.getObjectByName('core') as THREE.Mesh;
    const glow = group.getObjectByName('glow') as THREE.Mesh;
    
    if (mainBolt && core && glow) {
      const points: THREE.Vector3[] = [];
      const segments = 12;
      for (let i = 0; i <= segments; i++) {
        const y = (i / segments) * 4 - 2;
        const wiggle = i > 0 && i < segments ? 
          Math.sin(time * 25 + i * 2) * 0.3 + Math.sin(time * 40 + i * 3) * 0.2 : 0;
        points.push(new THREE.Vector3(wiggle, y, Math.sin(time * 30 + i) * 0.1));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      
      mainBolt.geometry.dispose();
      mainBolt.geometry = new THREE.TubeGeometry(curve, 32, 0.2, 12, false);
      
      core.geometry.dispose();
      core.geometry = new THREE.TubeGeometry(curve, 32, 0.08, 12, false);
      
      glow.geometry.dispose();
      glow.geometry = new THREE.TubeGeometry(curve, 32, 0.4 + Math.sin(time * 12) * 0.1, 12, false);
      
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 18) * 0.15;
    }
    
    // Update branches
    for (let i = 0; i < 8; i++) {
      const branch = group.getObjectByName(`branch${i}`) as THREE.Mesh;
      if (branch) {
        (branch.material as THREE.MeshBasicMaterial).opacity = 
          0.4 + Math.sin(time * 25 + i * Math.PI) * 0.4;
      }
    }
    
    group.rotation.z = Math.sin(time * 10) * 0.15;
  }, []);

  // Create moving obstacle (capacitor - circuit board theme) - TALL and PROMINENT
  const createObstacle = useCallback(() => {
    const group = new THREE.Group();
    
    // Capacitor body (cylindrical, metallic blue) - MUCH TALLER
    const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.6, 2.0, 20);
    const bodyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x1a1a6a, // Dark blue capacitor
      transparent: true, 
      opacity: 0.95 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    group.add(body);
    
    // Capacitor top cap (silver)
    const topCapGeometry = new THREE.CylinderGeometry(0.55, 0.6, 0.15, 20);
    const topCapMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    const topCap = new THREE.Mesh(topCapGeometry, topCapMaterial);
    topCap.position.y = 2.08;
    group.add(topCap);
    
    // Capacitor top vent (K pattern)
    const ventGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.08);
    const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
    const vent1 = new THREE.Mesh(ventGeometry, ventMaterial);
    vent1.position.y = 2.17;
    vent1.rotation.y = Math.PI / 4;
    group.add(vent1);
    const vent2 = new THREE.Mesh(ventGeometry, ventMaterial.clone());
    vent2.position.y = 2.17;
    vent2.rotation.y = -Math.PI / 4;
    group.add(vent2);
    
    // Capacitor marking stripes (multiple)
    for (let i = 0; i < 3; i++) {
      const stripeGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.08, 20);
      const stripeMaterial = new THREE.MeshBasicMaterial({ 
        color: i === 0 ? 0xcccccc : 0x333333, 
        transparent: true, 
        opacity: 0.9 
      });
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.y = 1.7 + i * 0.12;
      group.add(stripe);
    }
    
    // Capacitor minus stripe (big white band)
    const minusStripeGeometry = new THREE.CylinderGeometry(0.63, 0.63, 0.25, 20);
    const minusStripeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xeeeeee, 
      transparent: true, 
      opacity: 0.95 
    });
    const minusStripe = new THREE.Mesh(minusStripeGeometry, minusStripeMaterial);
    minusStripe.position.y = 1.85;
    group.add(minusStripe);
    
    // Capacitor legs (wires going down)
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 });
    const leg1 = new THREE.Mesh(legGeometry, legMaterial);
    leg1.position.set(0.25, -0.2, 0);
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeometry, legMaterial.clone());
    leg2.position.set(-0.25, -0.2, 0);
    group.add(leg2);
    
    // Danger glow - BIGGER
    const glowGeometry = new THREE.CylinderGeometry(0.9, 0.9, 2.4, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff4444, 
      transparent: true, 
      opacity: 0.2 
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 1.0;
    glow.name = 'obstacleGlow';
    group.add(glow);
    
    // Danger spark rings - MORE and BIGGER
    for (let i = 0; i < 5; i++) {
      const ringGeometry = new THREE.TorusGeometry(0.7 + i * 0.15, 0.04, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6666, 
        transparent: true, 
        opacity: 0.6 - i * 0.1 
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4 + i * 0.4;
      ring.name = `dangerRing${i}`;
      group.add(ring);
    }
    
    // Point light (red warning) - BRIGHTER
    const light = new THREE.PointLight(0xff4444, 3, 6);
    light.position.y = 1.5;
    group.add(light);
    
    return group;
  }, []);

  // Create start marker
  const createStartMarker = useCallback(() => {
    const group = new THREE.Group();
    
    // Pulsing ring
    const ringGeometry = new THREE.TorusGeometry(1.5, 0.15, 16, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.8 
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.name = 'startRing';
    group.add(ring);
    
    // Inner glow
    const glowGeometry = new THREE.CircleGeometry(1.3, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const glowDisc = new THREE.Mesh(glowGeometry, glowMaterial);
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = 0.05;
    glowDisc.name = 'startGlow';
    group.add(glowDisc);
    
    // "TAP TO START" indicator arrows
    for (let i = 0; i < 4; i++) {
      const arrowGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
      const arrowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true, 
        opacity: 0.9 
      });
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      const angle = (i / 4) * Math.PI * 2;
      arrow.position.x = Math.cos(angle) * 2;
      arrow.position.z = Math.sin(angle) * 2;
      arrow.position.y = 0.5;
      arrow.rotation.z = -Math.PI / 2;
      arrow.rotation.y = -angle;
      arrow.name = `startArrow${i}`;
      group.add(arrow);
    }
    
    // Light
    const light = new THREE.PointLight(0x00ff00, 3, 8);
    light.position.y = 1;
    group.add(light);
    
    return group;
  }, []);

  // Create resistor path segment (slows player down) - TALL and PROMINENT 3D
  const createResistor = useCallback(() => {
    const group = new THREE.Group();
    
    // Resistor path base (covers the full path cell - copper colored)
    const pathGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
    const pathMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x8b6914, // Darker copper for resistor path
      transparent: true,
      opacity: 0.9
    });
    const pathBase = new THREE.Mesh(pathGeometry, pathMaterial);
    pathBase.rotation.x = -Math.PI / 2;
    pathBase.position.y = 0.02;
    group.add(pathBase);
    
    // Mounting posts (ceramic standoffs)
    const postGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 12);
    const postMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f5dc }); // Beige ceramic
    const post1 = new THREE.Mesh(postGeometry, postMaterial);
    post1.position.set(-CELL_SIZE * 0.35, 0.2, 0);
    group.add(post1);
    const post2 = new THREE.Mesh(postGeometry, postMaterial.clone());
    post2.position.set(CELL_SIZE * 0.35, 0.2, 0);
    group.add(post2);
    
    // Main resistor body (tan/beige - MUCH BIGGER and TALLER)
    const bodyGeometry = new THREE.CylinderGeometry(0.55, 0.55, CELL_SIZE * 0.8, 20);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xd4a574 }); // Tan color
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2; // Lay flat across path
    body.position.y = 0.8;
    body.name = 'resistorBody';
    group.add(body);
    
    // Color bands (4-band resistor - MUCH BIGGER and raised)
    const bandColors = [0x8b4513, 0x000000, 0xff0000, 0xffd700]; // Brown, Black, Red, Gold
    for (let i = 0; i < 4; i++) {
      const bandGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 20);
      const bandMaterial = new THREE.MeshBasicMaterial({ color: bandColors[i] });
      const band = new THREE.Mesh(bandGeometry, bandMaterial);
      band.rotation.z = Math.PI / 2;
      band.position.set(-0.5 + i * 0.35, 0.8, 0);
      group.add(band);
    }
    
    // Wire leads (thick copper wires) - bent down to posts
    const wireHGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xb87333 }); // Copper
    const wireH1 = new THREE.Mesh(wireHGeometry, wireMaterial);
    wireH1.rotation.z = Math.PI / 2;
    wireH1.position.set(-CELL_SIZE * 0.55, 0.8, 0);
    group.add(wireH1);
    const wireH2 = new THREE.Mesh(wireHGeometry, wireMaterial.clone());
    wireH2.rotation.z = Math.PI / 2;
    wireH2.position.set(CELL_SIZE * 0.55, 0.8, 0);
    group.add(wireH2);
    
    // Vertical wire parts (going down to posts)
    const wireVGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const wireV1 = new THREE.Mesh(wireVGeometry, wireMaterial.clone());
    wireV1.position.set(-CELL_SIZE * 0.35, 0.5, 0);
    group.add(wireV1);
    const wireV2 = new THREE.Mesh(wireVGeometry, wireMaterial.clone());
    wireV2.position.set(CELL_SIZE * 0.35, 0.5, 0);
    group.add(wireV2);
    
    // Spiral path indicators (show the slowdown effect) - TALLER
    for (let i = 0; i < 6; i++) {
      const spiralGeometry = new THREE.TorusGeometry(0.25 + i * 0.12, 0.04, 8, 32);
      const spiralMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff8800, 
        transparent: true, 
        opacity: 0.5 - i * 0.07
      });
      const spiral = new THREE.Mesh(spiralGeometry, spiralMaterial);
      spiral.rotation.x = Math.PI / 2;
      spiral.position.y = 0.15 + i * 0.1;
      spiral.name = `spiral${i}`;
      group.add(spiral);
    }
    
    // Warning glow (orange - indicates slowdown zone) - TALLER
    const glowGeometry = new THREE.CylinderGeometry(CELL_SIZE * 0.55, CELL_SIZE * 0.55, 1.5, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6600, 
      transparent: true, 
      opacity: 0.18 
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.6;
    glow.name = 'resistorGlow';
    group.add(glow);
    
    // Point light for visibility - BRIGHTER
    const light = new THREE.PointLight(0xff8800, 2, 6);
    light.position.y = 1.2;
    group.add(light);
    
    return group;
  }, []);

  // Create diode (one-way path indicator) - circuit board theme - TALL and PROMINENT
  const createDiode = useCallback(() => {
    const group = new THREE.Group();
    
    // PCB mounting base
    const baseGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.6);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x0a3d0a }); // PCB green
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;
    group.add(base);
    
    // Diode body (black cylinder with stripe) - BIGGER
    const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.5;
    group.add(body);
    
    // Cathode stripe (white band) - BIGGER
    const stripeGeometry = new THREE.CylinderGeometry(0.27, 0.27, 0.12, 16);
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.rotation.z = Math.PI / 2;
    stripe.position.set(0.35, 0.5, 0);
    group.add(stripe);
    
    // Glass lens end (anode side)
    const lensGeometry = new THREE.SphereGeometry(0.15, 12, 12, 0, Math.PI);
    const lensMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333, 
      transparent: true, 
      opacity: 0.8 
    });
    const lens = new THREE.Mesh(lensGeometry, lensMaterial);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(-0.5, 0.5, 0);
    group.add(lens);
    
    // Wire leads - THICKER with bent legs
    const wireHGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8);
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 });
    const wireH1 = new THREE.Mesh(wireHGeometry, wireMaterial);
    wireH1.rotation.z = Math.PI / 2;
    wireH1.position.set(-0.75, 0.5, 0);
    group.add(wireH1);
    const wireH2 = new THREE.Mesh(wireHGeometry, wireMaterial.clone());
    wireH2.rotation.z = Math.PI / 2;
    wireH2.position.set(0.75, 0.5, 0);
    group.add(wireH2);
    
    // Vertical wire parts
    const wireVGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    const wireV1 = new THREE.Mesh(wireVGeometry, wireMaterial.clone());
    wireV1.position.set(-0.5, 0.25, 0);
    group.add(wireV1);
    const wireV2 = new THREE.Mesh(wireVGeometry, wireMaterial.clone());
    wireV2.position.set(0.5, 0.25, 0);
    group.add(wireV2);
    
    // Arrow indicator (shows direction) - BIGGER and FLOATING
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.9 
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(0.2, 1.0, 0);
    arrow.name = 'diodeArrow';
    group.add(arrow);
    
    // Direction glow trail
    const trailGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.1);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.4 
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.set(-0.1, 1.0, 0);
    group.add(trail);
    
    // Point light
    const light = new THREE.PointLight(0x00ff00, 1, 3);
    light.position.y = 1.0;
    group.add(light);
    
    return group;
  }, []);

  // Check if position is valid
  const isValidPosition = useCallback((x: number, z: number): boolean => {
    const maze = mazeRef.current;
    if (maze.length === 0) return false;
    
    const cellX = Math.floor((x + MAZE_WIDTH * CELL_SIZE / 2) / CELL_SIZE);
    const cellZ = Math.floor((z + MAZE_HEIGHT * CELL_SIZE / 2) / CELL_SIZE);
    
    if (cellX < 0 || cellX >= MAZE_WIDTH || cellZ < 0 || cellZ >= MAZE_HEIGHT) {
      return false;
    }
    
    const cell = maze[cellZ]?.[cellX];
    return cell === 'path' || cell === 'checkpoint' || cell === 'start';
  }, []);

  // Find closest valid position
  const findClosestValidPosition = useCallback((targetX: number, targetZ: number, currentPos: THREE.Vector3): THREE.Vector3 => {
    if (isValidPosition(targetX, targetZ)) {
      return new THREE.Vector3(targetX, 0.5, targetZ);
    }
    
    const maze = mazeRef.current;
    let closestDist = Infinity;
    let closestPos = currentPos.clone();
    
    const searchRadius = 4;
    const currentCellX = Math.floor((currentPos.x + MAZE_WIDTH * CELL_SIZE / 2) / CELL_SIZE);
    const currentCellZ = Math.floor((currentPos.z + MAZE_HEIGHT * CELL_SIZE / 2) / CELL_SIZE);
    
    for (let dz = -searchRadius; dz <= searchRadius; dz++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const cx = currentCellX + dx;
        const cz = currentCellZ + dz;
        
        if (cx < 0 || cx >= MAZE_WIDTH || cz < 0 || cz >= MAZE_HEIGHT) continue;
        
        const cell = maze[cz]?.[cx];
        if (cell === 'path' || cell === 'checkpoint' || cell === 'start') {
          const worldX = (cx - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
          const worldZ = (cz - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
          const dist = Math.sqrt((targetX - worldX) ** 2 + (targetZ - worldZ) ** 2);
          
          if (dist < closestDist) {
            closestDist = dist;
            closestPos = new THREE.Vector3(worldX, 0.5, worldZ);
          }
        }
      }
    }
    
    return closestPos;
  }, [isValidPosition]);

  // Clear current maze
  const clearMaze = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    // Remove maze meshes
    mazeMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    });
    mazeMeshesRef.current = [];
    
    // Remove checkpoint meshes
    checkpointsRef.current.forEach(cp => {
      if (cp.mesh) {
        scene.remove(cp.mesh);
      }
    });
    checkpointsRef.current = [];
    
    // Remove obstacles
    obstaclesRef.current.forEach(obs => {
      scene.remove(obs.mesh);
    });
    obstaclesRef.current = [];
    
    // Remove resistors
    resistorsRef.current.forEach(res => {
      scene.remove(res.mesh);
    });
    resistorsRef.current = [];
    
    // Remove diodes
    diodesRef.current.forEach(diode => {
      scene.remove(diode.mesh);
    });
    diodesRef.current = [];
    
    // Remove start marker
    if (startMarkerRef.current) {
      scene.remove(startMarkerRef.current);
      startMarkerRef.current = null;
    }
  }, []);

  // Build maze visuals
  const buildMaze = useCallback((mazeNumber: number) => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    clearMaze();
    
    // Generate new maze using seeded RNG for fairness
    // Create a new RNG with deterministic seed based on maze number
    const mazeRng = new Mulberry32((rngSeed ?? Date.now()) + mazeNumber * 12345);
    const maze = generateMaze(MAZE_WIDTH, MAZE_HEIGHT, mazeRng);
    mazeRef.current = maze;
    
    // PCB Green for walls (circuit board substrate)
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a3d0a, // Dark PCB green
      transparent: true,
      opacity: 0.95,
    });
    
    // Create maze geometry - CIRCUIT BOARD THEME
    for (let z = 0; z < MAZE_HEIGHT; z++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        const worldX = (x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
        const worldZ = (z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
        
        if (maze[z][x] === 'wall') {
          // Main PCB wall block (dark green)
          const wallGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.92, 1.5, CELL_SIZE * 0.92);
          const wall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
          wall.position.set(worldX, 0.75, worldZ);
          scene.add(wall);
          mazeMeshesRef.current.push(wall);
          
          // PCB edge - lighter green border
          const edgeGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.98, 1.55, CELL_SIZE * 0.98);
          const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a5a1a, // Lighter PCB green edge
            transparent: true,
            opacity: 0.3,
          });
          const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
          edge.position.set(worldX, 0.75, worldZ);
          scene.add(edge);
          mazeMeshesRef.current.push(edge);
          
          // Silkscreen markings (white lines on top)
          const silkscreenGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.7, 0.05, CELL_SIZE * 0.7);
          const silkscreenMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffee,
            transparent: true,
            opacity: 0.25,
          });
          const silkscreen = new THREE.Mesh(silkscreenGeometry, silkscreenMaterial);
          silkscreen.position.set(worldX, 1.53, worldZ);
          scene.add(silkscreen);
          mazeMeshesRef.current.push(silkscreen);
        } else {
          // COPPER TRACE PATH
          const copperGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.85, CELL_SIZE * 0.85);
          const copperMaterial = new THREE.MeshBasicMaterial({
            color: 0xb87333, // Copper color
            transparent: true,
            opacity: 0.9,
          });
          const copper = new THREE.Mesh(copperGeometry, copperMaterial);
          copper.rotation.x = -Math.PI / 2;
          copper.position.set(worldX, 0.02, worldZ);
          scene.add(copper);
          mazeMeshesRef.current.push(copper);
          
          // Copper shine effect
          const shineGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.6, CELL_SIZE * 0.6);
          const shineMaterial = new THREE.MeshBasicMaterial({
            color: 0xdaa06d, // Lighter copper shine
            transparent: true,
            opacity: 0.4,
          });
          const shine = new THREE.Mesh(shineGeometry, shineMaterial);
          shine.rotation.x = -Math.PI / 2;
          shine.position.set(worldX, 0.03, worldZ);
          scene.add(shine);
          mazeMeshesRef.current.push(shine);
          
          // PCB base under copper
          const baseGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
          const baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x0d2d0d, // Darker PCB green base
            transparent: true,
            opacity: 0.8,
          });
          const base = new THREE.Mesh(baseGeometry, baseMaterial);
          base.rotation.x = -Math.PI / 2;
          base.position.set(worldX, 0.01, worldZ);
          scene.add(base);
          mazeMeshesRef.current.push(base);
        }
      }
    }
    
    // Find path cells for obstacles and checkpoints
    const pathCells: { x: number; z: number }[] = [];
    for (let z = 0; z < MAZE_HEIGHT; z++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        if (maze[z][x] === 'path') {
          pathCells.push({ x, z });
        }
      }
    }
    
    // Set start position
    const startCell = pathCells[0];
    maze[startCell.z][startCell.x] = 'start';
    const startX = (startCell.x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
    const startZ = (startCell.z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
    lightningPositionRef.current.set(startX, 0.5, startZ);
    targetPositionRef.current.set(startX, 0.5, startZ);
    
    // Create start marker
    const startMarker = createStartMarker();
    startMarker.position.set(startX, 0.1, startZ);
    scene.add(startMarker);
    startMarkerRef.current = startMarker;
    
    // Place checkpoints (Tesla coils)
    const checkpoints: Checkpoint[] = [];
    const usedCells = new Set<string>();
    usedCells.add(`${startCell.x},${startCell.z}`);
    
    for (let i = 0; i < CHECKPOINTS_PER_MAZE; i++) {
      let bestCell = null;
      let bestDist = -1;
      const targetDist = (i + 1) * (pathCells.length / (CHECKPOINTS_PER_MAZE + 1));
      
      for (const cell of pathCells) {
        const key = `${cell.x},${cell.z}`;
        if (usedCells.has(key)) continue;
        
        const idx = pathCells.indexOf(cell);
        const distFromTarget = Math.abs(idx - targetDist);
        
        if (bestCell === null || distFromTarget < bestDist) {
          bestDist = distFromTarget;
          bestCell = cell;
        }
      }
      
      if (bestCell) {
        usedCells.add(`${bestCell.x},${bestCell.z}`);
        const worldX = (bestCell.x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
        const worldZ = (bestCell.z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
        
        const teslaCoil = createTeslaCoil();
        teslaCoil.position.set(worldX, 0, worldZ);
        scene.add(teslaCoil);
        
        checkpoints.push({ 
          x: worldX, 
          z: worldZ, 
          reached: false,
          mesh: teslaCoil
        });
        maze[bestCell.z][bestCell.x] = 'checkpoint';
      }
    }
    checkpointsRef.current = checkpoints;
    setCurrentCheckpoint(0);
    
    // Create moving obstacles (more as mazes progress)
    const numObstacles = 2 + mazeNumber;
    for (let i = 0; i < numObstacles; i++) {
      // Find a path for the obstacle
      const startIdx = Math.floor(Math.random() * pathCells.length);
      const obstaclePath: { x: number; z: number }[] = [];
      
      // Create a simple patrol path
      let currentCell = pathCells[startIdx];
      obstaclePath.push(currentCell);
      
      for (let j = 0; j < 5; j++) {
        const neighbors = pathCells.filter(cell => {
          const dx = Math.abs(cell.x - currentCell.x);
          const dz = Math.abs(cell.z - currentCell.z);
          return (dx === 1 && dz === 0) || (dx === 0 && dz === 1);
        });
        
        if (neighbors.length > 0) {
          currentCell = neighbors[Math.floor(Math.random() * neighbors.length)];
          if (!obstaclePath.some(c => c.x === currentCell.x && c.z === currentCell.z)) {
            obstaclePath.push(currentCell);
          }
        }
      }
      
      if (obstaclePath.length >= 2) {
        const worldX = (obstaclePath[0].x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
        const worldZ = (obstaclePath[0].z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
        
        const obstacleMesh = createObstacle();
        obstacleMesh.position.set(worldX, 0.8, worldZ);
        scene.add(obstacleMesh);
        
        obstaclesRef.current.push({
          mesh: obstacleMesh,
          x: worldX,
          z: worldZ,
          vx: 0,
          vz: 0,
          pathCells: obstaclePath,
          pathIndex: 0,
          speed: 2 + mazeNumber * 0.5 + Math.random()
        });
      }
    }
    
    // Place resistors on random path cells (slow down areas)
    const numResistors = 3 + mazeNumber;
    const resistorCells = new Set<string>();
    for (let i = 0; i < numResistors; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const cell = pathCells[Math.floor(mazeRng.next() * pathCells.length)];
        const key = `${cell.x},${cell.z}`;
        if (!usedCells.has(key) && !resistorCells.has(key)) {
          resistorCells.add(key);
          const worldX = (cell.x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
          const worldZ = (cell.z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
          
          const resistorMesh = createResistor();
          resistorMesh.position.set(worldX, 0, worldZ);
          resistorMesh.rotation.y = mazeRng.next() * Math.PI; // Random rotation
          scene.add(resistorMesh);
          
          resistorsRef.current.push({ mesh: resistorMesh, x: worldX, z: worldZ });
          break;
        }
        attempts++;
      }
    }
    
    // Place diodes on some narrow paths (just decorative for now)
    const numDiodes = 2 + Math.floor(mazeNumber / 2);
    for (let i = 0; i < numDiodes; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const cell = pathCells[Math.floor(mazeRng.next() * pathCells.length)];
        const key = `${cell.x},${cell.z}`;
        if (!usedCells.has(key) && !resistorCells.has(key)) {
          const worldX = (cell.x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
          const worldZ = (cell.z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
          
          const diodeMesh = createDiode();
          const direction = mazeRng.next() * Math.PI * 2;
          diodeMesh.position.set(worldX, 0, worldZ);
          diodeMesh.rotation.y = direction;
          scene.add(diodeMesh);
          
          diodesRef.current.push({ mesh: diodeMesh, x: worldX, z: worldZ, direction });
          break;
        }
        attempts++;
      }
    }
    
    // Update lightning position
    if (lightningRef.current) {
      lightningRef.current.position.copy(lightningPositionRef.current);
    }
  }, [clearMaze, createStartMarker, createTeslaCoil, createObstacle, createResistor, createDiode]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    
    // Detect mobile for brightness adjustments
    const isMobileDevice = window.innerWidth < 768;
    setIsMobile(isMobileDevice);
    
    // Brighter background and less fog on mobile for better visibility
    const bgColor = isMobileDevice ? 0x0a2a0a : 0x051505; // Brighter on mobile
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, isMobileDevice ? 40 : 25, isMobileDevice ? 100 : 70); // Less fog on mobile
    sceneRef.current = scene;

    // Create perspective camera for 3D mode - zoom out more on mobile
    const camera = new THREE.PerspectiveCamera(
      isMobileDevice ? 70 : 55, // Wider FOV on mobile to see more
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      150
    );
    camera.position.set(0, isMobileDevice ? 55 : 40, isMobileDevice ? 35 : 25);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create orthographic camera for 2D mode (top-down view) - larger on mobile
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const frustumSize = isMobileDevice ? 40 : 30; // Zoom out more on mobile
    const orthoCamera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      200
    );
    orthoCamera.position.set(0, 50, 0);
    orthoCamera.lookAt(0, 0, 0);
    orthoCameraRef.current = orthoCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light (brighter on mobile for better visibility)
    const ambientLight = new THREE.AmbientLight(isMobileDevice ? 0x444444 : 0x222222);
    scene.add(ambientLight);
    
    // Add extra directional light on mobile for 3D depth
    if (isMobileDevice) {
      const mobileLight = new THREE.DirectionalLight(0xffffff, 0.3);
      mobileLight.position.set(10, 30, 10);
      scene.add(mobileLight);
    }

    // Create lightning bolt
    const lightning = createLightningBolt();
    scene.add(lightning);
    lightningRef.current = lightning;

    // Build initial maze (maze 1 is 3D)
    is2DModeRef.current = false;
    setIs2DMode(false);
    buildMaze(1);

    // Handle resize - update both cameras
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Update perspective camera
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      // Update orthographic camera
      if (orthoCameraRef.current) {
        const aspect = width / height;
        const frustumSize = 30;
        orthoCameraRef.current.left = frustumSize * aspect / -2;
        orthoCameraRef.current.right = frustumSize * aspect / 2;
        orthoCameraRef.current.top = frustumSize / 2;
        orthoCameraRef.current.bottom = frustumSize / -2;
        orthoCameraRef.current.updateProjectionMatrix();
      }
      
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Click handler for taking control
    const handleClick = (event: MouseEvent) => {
      if (gameStateRef.current === 'waiting' && !hasControlRef.current) {
        // Check if clicked on lightning bolt area
        const rect = containerRef.current!.getBoundingClientRect();
        const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        if (intersectPoint) {
          const dist = intersectPoint.distanceTo(lightningPositionRef.current);
          if (dist < 4) {
            hasControlRef.current = true;
            gameStateRef.current = 'playing';
            setGameState('playing');
            startTimeRef.current = Date.now();
            
            // Start background music
            if (!backgroundMusicRef.current) {
              backgroundMusicRef.current = new Audio('/lightning-maze.mp3');
              backgroundMusicRef.current.loop = true;
              backgroundMusicRef.current.volume = 0.4;
            }
            backgroundMusicRef.current.play().catch(e => console.log('Music autoplay blocked:', e));
            
            // Hide start marker
            if (startMarkerRef.current) {
              startMarkerRef.current.visible = false;
            }
          }
        }
      }
    };
    containerRef.current.addEventListener('click', handleClick);

    // Touch handler for mobile - tap to start
    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      if (event.touches.length === 0) return;
      
      const touch = event.touches[0];
      if (gameStateRef.current === 'waiting' && !hasControlRef.current) {
        const rect = containerRef.current!.getBoundingClientRect();
        const touchX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const touchY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(touchX, touchY), camera);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        if (intersectPoint) {
          const dist = intersectPoint.distanceTo(lightningPositionRef.current);
          if (dist < 6) { // Larger tap area for mobile
            hasControlRef.current = true;
            gameStateRef.current = 'playing';
            setGameState('playing');
            startTimeRef.current = Date.now();
            
            // Start background music
            if (!backgroundMusicRef.current) {
              backgroundMusicRef.current = new Audio('/lightning-maze.mp3');
              backgroundMusicRef.current.loop = true;
              backgroundMusicRef.current.volume = 0.4;
            }
            backgroundMusicRef.current.play().catch(e => console.log('Music autoplay blocked:', e));
            
            if (startMarkerRef.current) {
              startMarkerRef.current.visible = false;
            }
          }
        }
      }
    };
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });

    // Mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !hasControlRef.current || gameStateRef.current !== 'playing') return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      
      if (intersectPoint) {
        targetPositionRef.current = findClosestValidPosition(
          intersectPoint.x,
          intersectPoint.z,
          lightningPositionRef.current
        );
      }
    };
    containerRef.current.addEventListener('mousemove', handleMouseMove);

    // Touch movement for mobile
    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      if (!containerRef.current || !hasControlRef.current || gameStateRef.current !== 'playing') return;
      if (event.touches.length === 0) return;
      
      const touch = event.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const touchX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const touchY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(touchX, touchY), camera);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      
      if (intersectPoint) {
        targetPositionRef.current = findClosestValidPosition(
          intersectPoint.x,
          intersectPoint.z,
          lightningPositionRef.current
        );
      }
    };
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Gyroscope handler for mobile - tilt to move lightning bolt
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!hasControlRef.current || gameStateRef.current !== 'playing') return;
      if (!gyroEnabledRef.current) return;
      
      const beta = event.beta ?? 0; // Front-back tilt
      const gamma = event.gamma ?? 0; // Left-right tilt
      
      // Set base position on first reading
      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta, gamma };
        return;
      }
      
      // Calculate delta from base
      const deltaBeta = beta - gyroBaseRef.current.beta;
      const deltaGamma = gamma - gyroBaseRef.current.gamma;
      
      // Very low sensitivity for smooth control
      const sensitivity = 0.15;
      
      // Convert tilt to movement direction in maze
      const moveX = deltaGamma * sensitivity;
      const moveZ = deltaBeta * sensitivity;
      
      // Update target position
      const newTarget = new THREE.Vector3(
        lightningPositionRef.current.x + moveX,
        0.5,
        lightningPositionRef.current.z + moveZ
      );
      
      targetPositionRef.current = findClosestValidPosition(
        newTarget.x,
        newTarget.z,
        lightningPositionRef.current
      );
    };
    
    // Enable gyroscope function
    const enableGyroscope = async () => {
      console.log('⚡ [LightningMaze] Enabling gyroscope...');
      gyroBaseRef.current = null; // Reset base
      
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
            gyroEnabledRef.current = true;
            setGyroEnabled(true);
          }
        } catch (error) {
          console.warn('Gyro permission error:', error);
          window.addEventListener('deviceorientation', handleOrientation);
          gyroEnabledRef.current = true;
          setGyroEnabled(true);
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
        gyroEnabledRef.current = true;
        setGyroEnabled(true);
      }
    };
    
    // Auto-enable gyro on mobile when game starts
    if (isMobileDevice) {
      enableGyroscope();
    }

    // Animation loop
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;
      lightningTimeRef.current = time / 1000;
      
      // Animate start marker
      if (startMarkerRef.current && startMarkerRef.current.visible) {
        const ring = startMarkerRef.current.getObjectByName('startRing') as THREE.Mesh;
        const glow = startMarkerRef.current.getObjectByName('startGlow') as THREE.Mesh;
        if (ring) {
          ring.scale.setScalar(1 + Math.sin(time / 300) * 0.1);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(time / 200) * 0.3;
        }
        if (glow) {
          (glow.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time / 250) * 0.1;
        }
        for (let i = 0; i < 4; i++) {
          const arrow = startMarkerRef.current.getObjectByName(`startArrow${i}`) as THREE.Mesh;
          if (arrow) {
            const angle = (i / 4) * Math.PI * 2 + time / 1000;
            arrow.position.x = Math.cos(angle) * (1.8 + Math.sin(time / 300) * 0.3);
            arrow.position.z = Math.sin(angle) * (1.8 + Math.sin(time / 300) * 0.3);
            arrow.rotation.y = -angle;
          }
        }
      }
      
      // Animate Tesla coils
      checkpointsRef.current.forEach(cp => {
        if (cp.mesh && !cp.reached) {
          animateTeslaCoil(cp.mesh, lightningTimeRef.current);
        }
      });
      
      // Animate obstacles
      obstaclesRef.current.forEach(obs => {
        // Move along path
        const targetCell = obs.pathCells[obs.pathIndex];
        const targetX = (targetCell.x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
        const targetZ = (targetCell.z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
        
        const dx = targetX - obs.x;
        const dz = targetZ - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.3) {
          obs.pathIndex = (obs.pathIndex + 1) % obs.pathCells.length;
        } else {
          obs.x += (dx / dist) * obs.speed * deltaTime;
          obs.z += (dz / dist) * obs.speed * deltaTime;
        }
        
        obs.mesh.position.x = obs.x;
        obs.mesh.position.z = obs.z;
        
        // Animate glow
        const glow = obs.mesh.getObjectByName('obstacleGlow') as THREE.Mesh;
        if (glow) {
          glow.scale.setScalar(1 + Math.sin(time / 100) * 0.15);
        }
        
        // Animate rings
        for (let i = 0; i < 3; i++) {
          const ring = obs.mesh.getObjectByName(`dangerRing${i}`) as THREE.Mesh;
          if (ring) {
            ring.rotation.x += deltaTime * (2 + i);
            ring.rotation.y += deltaTime * (1.5 + i * 0.5);
          }
        }
      });
      
      // Animate resistors - idle spiral animation
      resistorsRef.current.forEach(res => {
        // Subtle idle spinning animation for spirals
        for (let i = 0; i < 8; i++) {
          const spiral = res.mesh.getObjectByName(`spiral${i}`) as THREE.Mesh;
          if (spiral) {
            // Slow idle rotation
            spiral.rotation.z += deltaTime * (i % 2 === 0 ? 0.5 : -0.5);
          }
        }
      });
      
      if (gameStateRef.current === 'playing') {
        // Update timer
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, GAME_DURATION - elapsed);
        setTimeRemaining(Math.ceil(remaining));
        
        if (remaining <= 0) {
          // Game over - time's up
          gameStateRef.current = 'complete';
          setGameState('complete');
          
          // Stop background music
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.pause();
            backgroundMusicRef.current.currentTime = 0;
          }
          
          const accuracy = Math.min(100, Math.max(0, 100 - wallHits * 2));
          const avgReactionTime = Math.round(elapsed * 1000 / Math.max(1, mazesCompletedRef.current));
          
          // Log to audit system for fair gameplay tracking
          logGameCompletion({
            gameType: GAME_TYPES.LIGHTNING_MAZE || 'lightning_maze',
            gameMode: gameMode === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
            score: scoreRef.current,
            accuracy: accuracy,
            reactionTime: avgReactionTime,
            durationSeconds: Math.round(elapsed),
            additionalData: {
              mazesCompleted: mazesCompletedRef.current,
              wallHits: wallHits,
              checkpointsReached: currentCheckpoint,
              rngSeed: rngSeed
            }
          }).catch(err => console.error('❌ [LightningMaze] Audit log failed:', err));
          
          onGameComplete({
            score: scoreRef.current,
            accuracy: accuracy,
            avgReactionTime: avgReactionTime
          });
          return;
        }
        
        // Update wall hit cooldown
        if (wallHitCooldownRef.current > 0) {
          wallHitCooldownRef.current -= deltaTime;
        }
        
        // Move lightning
        const currentPos = lightningPositionRef.current;
        const targetPos = targetPositionRef.current;
        
        const direction = new THREE.Vector3().subVectors(targetPos, currentPos);
        const distance = direction.length();
        
        if (distance > 0.1) {
          direction.normalize();
          
          // Check if near a resistor - slow down with spiral animation!
          let speedMultiplier = 1.0;
          let isInResistor = false;
          for (const res of resistorsRef.current) {
            const dx = currentPos.x - res.x;
            const dz = currentPos.z - res.z;
            const distToResistor = Math.sqrt(dx * dx + dz * dz);
            if (distToResistor < CELL_SIZE * 0.8) {
              speedMultiplier = 0.35; // Slow down to 35% speed when on resistor
              isInResistor = true;
              
              // Animate resistor glow pulsing
              const glow = res.mesh.getObjectByName('resistorGlow') as THREE.Mesh;
              if (glow) {
                (glow.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(lightningTimeRef.current * 12) * 0.25;
              }
              
              // Animate spiral rings - spin and pulse when player is inside
              for (let i = 0; i < 8; i++) {
                const spiral = res.mesh.getObjectByName(`spiral${i}`) as THREE.Mesh;
                if (spiral) {
                  // Rotate spirals in alternating directions
                  spiral.rotation.z = lightningTimeRef.current * (i % 2 === 0 ? 5 : -5);
                  // Pulse size
                  const pulseScale = 1 + Math.sin(lightningTimeRef.current * 8 + i * 0.5) * 0.15;
                  spiral.scale.set(pulseScale, pulseScale, 1);
                  // Increase opacity when player is inside
                  (spiral.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(lightningTimeRef.current * 10 + i) * 0.3;
                }
              }
              
              // Make the resistor body glow
              const resistorBody = res.mesh.getObjectByName('resistorBody') as THREE.Mesh;
              if (resistorBody) {
                const glowIntensity = 0.8 + Math.sin(lightningTimeRef.current * 15) * 0.2;
                (resistorBody.material as THREE.MeshBasicMaterial).color.setRGB(
                  0.83 * glowIntensity + 0.17, 
                  0.65 * glowIntensity, 
                  0.46 * glowIntensity
                );
              }
              break;
            }
          }
          
          // Apply spiral rotation to lightning when in resistor
          if (isInResistor && lightningRef.current) {
            // Add spinning effect to the lightning bolt
            lightningRef.current.rotation.z = Math.sin(lightningTimeRef.current * 6) * 0.3;
            // Slightly compress and stretch for spiral feeling
            const stretchFactor = 1 + Math.sin(lightningTimeRef.current * 10) * 0.1;
            lightningRef.current.scale.set(1, stretchFactor, 1);
          } else if (lightningRef.current) {
            // Reset rotation and scale when not in resistor
            lightningRef.current.rotation.z *= 0.9; // Smooth return
            lightningRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
          }
          
          const moveSpeed = 10 * deltaTime * speedMultiplier;
          const moveAmount = Math.min(moveSpeed, distance);
          
          // Track direction for rotation - calculate target angle from movement direction
          if (direction.x !== 0 || direction.z !== 0) {
            // Calculate angle from direction vector (atan2 gives angle in radians)
            const newTargetRotation = Math.atan2(direction.x, direction.z);
            
            // Only update target rotation if direction changed significantly
            const directionChange = Math.abs(newTargetRotation - targetRotationRef.current);
            if (directionChange > 0.1) {
              targetRotationRef.current = newTargetRotation;
              lastDirectionRef.current.copy(direction);
            }
          }
          
          // Smoothly interpolate rotation for turning animation
          const rotationDiff = targetRotationRef.current - currentRotationRef.current;
          // Handle wrapping around -PI to PI
          let shortestRotation = rotationDiff;
          if (Math.abs(rotationDiff) > Math.PI) {
            shortestRotation = rotationDiff > 0 ? rotationDiff - Math.PI * 2 : rotationDiff + Math.PI * 2;
          }
          currentRotationRef.current += shortestRotation * Math.min(1, deltaTime * 8); // Smooth rotation
          
          // Apply rotation to lightning bolt
          if (lightningRef.current) {
            lightningRef.current.rotation.y = currentRotationRef.current;
            
            // Tilt bolt based on movement direction (horizontal vs vertical)
            // When moving along X axis (left/right), lay flat; when moving along Z axis (up/down), stand upright
            const horizontalAmount = Math.abs(direction.x);
            const verticalAmount = Math.abs(direction.z);
            
            // Calculate target X tilt - 0 when moving in Z, PI/2 when moving in X
            let targetXTilt = 0;
            if (horizontalAmount > 0.1 || verticalAmount > 0.1) {
              // Blend between upright (0) and flat (PI/2) based on X vs Z movement
              targetXTilt = (horizontalAmount / (horizontalAmount + verticalAmount + 0.001)) * (Math.PI / 2);
            }
            
            // Smoothly interpolate X rotation
            const currentXTilt = lightningRef.current.rotation.x;
            const xTiltDiff = targetXTilt - currentXTilt;
            lightningRef.current.rotation.x += xTiltDiff * Math.min(1, deltaTime * 6);
          }
          
          const newPos = currentPos.clone().addScaledVector(direction, moveAmount);
          
          if (isValidPosition(newPos.x, newPos.z)) {
            lightningPositionRef.current.copy(newPos);
          } else {
            // Hit wall - penalty!
            if (wallHitCooldownRef.current <= 0) {
              scoreRef.current = Math.max(0, scoreRef.current - 10);
              setScore(scoreRef.current);
              setWallHits(prev => prev + 1);
              wallHitCooldownRef.current = 0.5; // Cooldown to prevent rapid hits
              
              // Flash effect on lightning
              if (lightningRef.current) {
                const mainBolt = lightningRef.current.getObjectByName('mainBolt') as THREE.Mesh;
                if (mainBolt) {
                  (mainBolt.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
                  setTimeout(() => {
                    (mainBolt.material as THREE.MeshBasicMaterial).color.setHex(0xffcc00); // Golden yellow
                  }, 150);
                }
              }
            }
            
            const validPos = findClosestValidPosition(newPos.x, newPos.z, currentPos);
            const validDirection = new THREE.Vector3().subVectors(validPos, currentPos);
            if (validDirection.length() > 0.05) {
              validDirection.normalize();
              lightningPositionRef.current.addScaledVector(validDirection, moveAmount * 0.3);
            }
          }
          
          lightningPositionRef.current.y = 0.5;
        }
        
        // Update lightning mesh
        if (lightningRef.current) {
          lightningRef.current.position.copy(lightningPositionRef.current);
          updateLightningAnimation(lightningRef.current, lightningTimeRef.current);
        }
        
        // Check obstacle collision
        for (const obs of obstaclesRef.current) {
          const dx = lightningPositionRef.current.x - obs.x;
          const dz = lightningPositionRef.current.z - obs.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < 1.2) {
            // Hit obstacle!
            scoreRef.current = Math.max(0, scoreRef.current - 25);
            setScore(scoreRef.current);
            setWallHits(prev => prev + 1);
            
            // Push back
            const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
            lightningPositionRef.current.addScaledVector(pushDir, 1.5);
            
            // Clamp to valid position
            const validPos = findClosestValidPosition(
              lightningPositionRef.current.x,
              lightningPositionRef.current.z,
              lightningPositionRef.current
            );
            lightningPositionRef.current.copy(validPos);
            
            // Flash red
            if (lightningRef.current) {
              const mainBolt = lightningRef.current.getObjectByName('mainBolt') as THREE.Mesh;
              if (mainBolt) {
                (mainBolt.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
                setTimeout(() => {
                  (mainBolt.material as THREE.MeshBasicMaterial).color.setHex(0xffcc00); // Golden yellow
                }, 200);
              }
            }
            
            break;
          }
        }
        
        // Check checkpoint collisions
        let allReached = true;
        for (let i = 0; i < checkpointsRef.current.length; i++) {
          const cp = checkpointsRef.current[i];
          if (!cp.reached) {
            allReached = false;
            const dx = lightningPositionRef.current.x - cp.x;
            const dz = lightningPositionRef.current.z - cp.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < CELL_SIZE * 0.8) {
              cp.reached = true;
              
              // 500 points per checkpoint
              scoreRef.current += 500;
              setScore(scoreRef.current);
              setCurrentCheckpoint(i + 1);
              
              // Visual feedback - change Tesla coil color
              if (cp.mesh) {
                cp.mesh.traverse(child => {
                  if (child instanceof THREE.Mesh) {
                    (child.material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
                  }
                });
              }
            }
          }
        }
        
        // All checkpoints reached - next maze!
        if (allReached) {
          mazesCompletedRef.current++;
          setMazesCompleted(mazesCompletedRef.current);
          
          if (currentMazeRef.current < TOTAL_MAZES) {
            currentMazeRef.current++;
            setCurrentMaze(currentMazeRef.current);
            
            // Bonus points for completing maze
            scoreRef.current += 1000;
            setScore(scoreRef.current);
            
            // Alternate between 3D (odd mazes) and 2D (even mazes)
            const new2DMode = currentMazeRef.current % 2 === 0;
            is2DModeRef.current = new2DMode;
            setIs2DMode(new2DMode);
            
            // Build next maze
            buildMaze(currentMazeRef.current);
            hasControlRef.current = true; // Keep control for subsequent mazes
          } else {
            // All mazes complete!
            gameStateRef.current = 'complete';
            setGameState('complete');
            
            // Stop background music
            if (backgroundMusicRef.current) {
              backgroundMusicRef.current.pause();
              backgroundMusicRef.current.currentTime = 0;
            }
            
            // Big bonus for finishing all mazes
            scoreRef.current += 5000;
            setScore(scoreRef.current);
            
            const totalTime = (Date.now() - startTimeRef.current) / 1000;
            const accuracy = Math.min(100, Math.max(0, 100 - wallHits * 2));
            const avgReactionTime = Math.round(totalTime * 1000 / TOTAL_MAZES);
            
            // Log to audit system for fair gameplay tracking
            logGameCompletion({
              gameType: GAME_TYPES.LIGHTNING_MAZE || 'lightning_maze',
              gameMode: gameMode === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
              score: scoreRef.current,
              accuracy: accuracy,
              reactionTime: avgReactionTime,
              durationSeconds: Math.round(totalTime),
              additionalData: {
                mazesCompleted: TOTAL_MAZES,
                wallHits: wallHits,
                allMazesComplete: true,
                rngSeed: rngSeed
              }
            }).catch(err => console.error('❌ [LightningMaze] Audit log failed:', err));
            
            onGameComplete({
              score: scoreRef.current,
              accuracy: accuracy,
              avgReactionTime: avgReactionTime
            });
          }
        }
        
        // Camera follow - different behavior for 2D vs 3D
        if (is2DModeRef.current && orthoCameraRef.current) {
          // 2D mode: Top-down orthographic camera follows player smoothly
          const targetX = lightningPositionRef.current.x * 0.6;
          const targetZ = lightningPositionRef.current.z * 0.6;
          orthoCameraRef.current.position.x += (targetX - orthoCameraRef.current.position.x) * 0.05;
          orthoCameraRef.current.position.z += (targetZ - orthoCameraRef.current.position.z) * 0.05;
          orthoCameraRef.current.lookAt(
            orthoCameraRef.current.position.x, 
            0, 
            orthoCameraRef.current.position.z
          );
        } else if (cameraRef.current) {
          // 3D mode: Angled perspective camera
          const targetCamX = lightningPositionRef.current.x * 0.4;
          const targetCamZ = lightningPositionRef.current.z * 0.4 + 20;
          cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.03;
          cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.03;
          cameraRef.current.lookAt(
            lightningPositionRef.current.x * 0.5, 
            0, 
            lightningPositionRef.current.z * 0.5
          );
        }
      }
      
      // Render with appropriate camera
      const activeCamera = is2DModeRef.current && orthoCameraRef.current ? orthoCameraRef.current : camera;
      renderer.render(scene, activeCamera);
    };
    
    animate(0);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick);
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('touchstart', handleTouchStart);
        containerRef.current.removeEventListener('touchmove', handleTouchMove);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createLightningBolt, updateLightningAnimation, createTeslaCoil, animateTeslaCoil, createObstacle, createStartMarker, buildMaze, isValidPosition, findClosestValidPosition, onGameComplete]);

  const startGame = () => {
    setGameState('waiting');
    gameStateRef.current = 'waiting';
    hasControlRef.current = false;
    setScore(0);
    scoreRef.current = 0;
    setCurrentMaze(1);
    currentMazeRef.current = 1;
    setMazesCompleted(0);
    mazesCompletedRef.current = 0;
    setWallHits(0);
    setTimeRemaining(GAME_DURATION);
    
    buildMaze(1);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden touch-none">
      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      
      {/* 2D/3D Mode Indicator */}
      {gameState === 'playing' && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className={`px-4 py-1 rounded-full text-sm font-bold ${is2DMode ? 'bg-green-500/80 text-white' : 'bg-purple-500/80 text-white'}`}>
            {is2DMode ? '2D MODE' : '3D MODE'}
          </div>
        </div>
      )}
      
      {/* HUD - Responsive for mobile */}
      <div className="absolute top-8 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 flex flex-wrap sm:flex-nowrap justify-between items-start gap-2 pointer-events-none z-10">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 border border-amber-500/50 flex-1 min-w-[70px]">
          <div className="text-amber-400 text-xs sm:text-sm font-bold">SCORE</div>
          <div className="text-white text-lg sm:text-3xl font-bold">{score.toLocaleString()}</div>
        </div>
        
        <div className="bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 border border-purple-500/50 flex-1 min-w-[60px]">
          <div className="text-purple-400 text-xs sm:text-sm font-bold">MAZE</div>
          <div className="text-white text-lg sm:text-3xl font-bold">{currentMaze}/{TOTAL_MAZES}</div>
        </div>
        
        <div className="bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 border border-green-500/50 flex-1 min-w-[60px]">
          <div className="text-green-400 text-xs sm:text-sm font-bold">CHECK</div>
          <div className="text-white text-lg sm:text-3xl font-bold">{currentCheckpoint}/{CHECKPOINTS_PER_MAZE}</div>
        </div>
        
        <div className={`bg-black/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-4 border flex-1 min-w-[60px] ${timeRemaining <= 10 ? 'border-red-500 animate-pulse' : 'border-yellow-500/50'}`}>
          <div className={`text-xs sm:text-sm font-bold ${timeRemaining <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>TIME</div>
          <div className={`text-lg sm:text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>{timeRemaining}s</div>
        </div>
      </div>

      {/* Ready Screen - Mobile Responsive */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10 p-4 overflow-y-auto">
          <div className="text-center max-w-xl w-full">
            <div className="text-5xl sm:text-7xl mb-2 sm:mb-4">🔌</div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
              CIRCUIT RUNNER
            </h1>
            <div className="space-y-2 sm:space-y-3 text-left bg-green-950/60 rounded-xl p-4 sm:p-6 border border-green-500/40 mb-4 sm:mb-6">
              <p className="text-amber-300 font-bold text-base sm:text-xl">⚡ HOW TO PLAY:</p>
              <p className="text-gray-300 text-sm sm:text-lg">• <span className="text-green-400 font-bold">TAP</span> the electrical current to start</p>
              <p className="text-gray-300 text-sm sm:text-lg">• {isMobile ? 'Drag your finger' : 'Move your mouse'} to guide the signal</p>
              <p className="text-gray-300 text-sm sm:text-lg">• Reach all <span className="text-gray-200 font-bold">IC Chips</span> (+500 pts)</p>
              <p className="text-gray-300 text-sm sm:text-lg">• Avoid <span className="text-blue-400 font-bold">capacitors</span> (-25 pts)</p>
              <p className="text-gray-300 text-sm sm:text-lg">• <span className="text-orange-400 font-bold">Resistors</span> slow you down!</p>
              <p className="text-gray-300 text-sm sm:text-lg">• Don't hit <span className="text-green-600 font-bold">PCB walls</span> (-10 pts)</p>
              <p className="text-gray-300 text-sm sm:text-lg">• <span className="text-purple-400 font-bold">Odd mazes = 3D</span>, <span className="text-green-400 font-bold">Even mazes = 2D</span></p>
              <p className="text-yellow-300 font-bold text-sm sm:text-lg mt-2 sm:mt-4">⏱️ {GAME_DURATION} SECONDS FOR ALL 5 MAZES!</p>
            </div>
            <button
              onClick={startGame}
              className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xl sm:text-2xl rounded-xl transform hover:scale-105 transition-all shadow-lg shadow-amber-500/50"
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* Waiting for tap - Mobile Friendly */}
      {gameState === 'waiting' && (
        <div className="absolute bottom-16 sm:bottom-20 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-green-950/80 backdrop-blur-sm rounded-xl px-4 sm:px-8 py-3 sm:py-4 border border-amber-500 animate-pulse">
            <p className="text-amber-400 text-lg sm:text-2xl font-bold text-center">
              ⚡ TAP THE SIGNAL! ⚡
            </p>
          </div>
        </div>
      )}

      {/* Complete Screen - Mobile Friendly */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10 p-4">
          <div className="text-center max-w-lg w-full">
            <div className="text-5xl sm:text-7xl mb-2 sm:mb-4">{mazesCompleted >= TOTAL_MAZES ? '🏆' : '⏱️'}</div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-yellow-400">
              {mazesCompleted >= TOTAL_MAZES ? 'ALL MAZES COMPLETE!' : 'TIME\'S UP!'}
            </h1>
            <div className="bg-black/60 rounded-xl p-4 sm:p-6 border border-yellow-500/30 mb-4 sm:mb-6">
              <div className="text-4xl sm:text-6xl font-bold text-white mb-2">{score.toLocaleString()}</div>
              <div className="text-yellow-400 text-lg sm:text-xl">POINTS</div>
              <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-3 sm:gap-4 text-gray-300">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-400">{mazesCompleted}</div>
                  <div className="text-xs sm:text-sm">Mazes Done</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-400">{wallHits}</div>
                  <div className="text-xs sm:text-sm">Wall Hits</div>
                </div>
              </div>
            </div>
            {onExit && (
              <button
                onClick={onExit}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-bold text-lg rounded-xl"
              >
                Back to Games
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
