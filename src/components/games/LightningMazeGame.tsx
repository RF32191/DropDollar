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
  const startMarkerRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lightningTimeRef = useRef<number>(0);
  const hasControlRef = useRef<boolean>(false);
  const wallHitCooldownRef = useRef<number>(0);
  
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
  
  const scoreRef = useRef(0);
  const gameStateRef = useRef<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const startTimeRef = useRef<number>(0);
  const currentMazeRef = useRef(1);
  const mazesCompletedRef = useRef(0);

  const MAZE_WIDTH = 17;
  const MAZE_HEIGHT = 17;
  const CELL_SIZE = 2.5;
  const TOTAL_MAZES = 5;
  const GAME_DURATION = 90; // seconds
  const CHECKPOINTS_PER_MAZE = 5;

  // Create Tesla coil checkpoint
  const createTeslaCoil = useCallback((color: number = 0xc0c0c0) => {
    const group = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.3, 16);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    group.add(base);
    
    // Main coil body
    const coilGeometry = new THREE.CylinderGeometry(0.15, 0.4, 1.5, 16);
    const coilMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
    const coil = new THREE.Mesh(coilGeometry, coilMaterial);
    coil.position.y = 1.05;
    group.add(coil);
    
    // Top sphere
    const sphereGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.95 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 2;
    group.add(sphere);
    
    // Electric rings around coil
    for (let i = 0; i < 5; i++) {
      const ringGeometry = new THREE.TorusGeometry(0.25 + i * 0.05, 0.02, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x88ccff, 
        transparent: true, 
        opacity: 0.6 - i * 0.1 
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.6 + i * 0.3;
      ring.name = `ring${i}`;
      group.add(ring);
    }
    
    // Spark particles at top
    for (let i = 0; i < 6; i++) {
      const sparkGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const sparkMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.8 
      });
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
      spark.position.y = 2;
      spark.name = `spark${i}`;
      group.add(spark);
    }
    
    // Point light
    const light = new THREE.PointLight(0x88ccff, 2, 6);
    light.position.y = 2;
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

  // Create animated lightning bolt (BIGGER)
  const createLightningBolt = useCallback(() => {
    const group = new THREE.Group();
    
    // Main bolt - jagged shape (MUCH BIGGER)
    const points: THREE.Vector3[] = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const y = (i / segments) * 4 - 2; // -2 to 2 (taller)
      const wiggle = i > 0 && i < segments ? (Math.random() - 0.5) * 0.6 : 0;
      points.push(new THREE.Vector3(wiggle, y, 0));
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.2, 12, false);
    const boltMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1.0,
    });
    const bolt = new THREE.Mesh(tubeGeometry, boltMaterial);
    bolt.name = 'mainBolt';
    group.add(bolt);
    
    // Bright white core
    const coreGeometry = new THREE.TubeGeometry(curve, 32, 0.08, 12, false);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'core';
    group.add(core);
    
    // Outer glow (bigger)
    const glowGeometry = new THREE.TubeGeometry(curve, 32, 0.4, 12, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    // Electric crackling branches (more and bigger)
    for (let i = 0; i < 8; i++) {
      const branchPoints: THREE.Vector3[] = [];
      const startY = (Math.random() * 3) - 1.5;
      const startX = Math.sin(startY) * 0.3;
      branchPoints.push(new THREE.Vector3(startX, startY, 0));
      
      const direction = Math.random() > 0.5 ? 1 : -1;
      const length = 0.5 + Math.random() * 0.7;
      branchPoints.push(new THREE.Vector3(
        startX + direction * length * 0.5,
        startY + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.2
      ));
      branchPoints.push(new THREE.Vector3(
        startX + direction * length,
        startY + (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.3
      ));
      
      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchGeometry = new THREE.TubeGeometry(branchCurve, 12, 0.05, 6, false);
      const branchMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
      });
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.name = `branch${i}`;
      group.add(branch);
    }
    
    // Point light (brighter)
    const pointLight = new THREE.PointLight(0x00ffff, 4, 10);
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

  // Create moving obstacle (electric orb)
  const createObstacle = useCallback(() => {
    const group = new THREE.Group();
    
    // Core sphere
    const coreGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0066, 
      transparent: true, 
      opacity: 0.9 
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0066, 
      transparent: true, 
      opacity: 0.3 
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'obstacleGlow';
    group.add(glow);
    
    // Danger rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(0.5 + i * 0.15, 0.03, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff3388, 
        transparent: true, 
        opacity: 0.6 
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + i * 0.3;
      ring.name = `dangerRing${i}`;
      group.add(ring);
    }
    
    // Point light
    const light = new THREE.PointLight(0xff0066, 2, 5);
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
    
    // Wall materials - better looking neon red
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0xcc0000,
      transparent: true,
      opacity: 0.85,
    });
    
    // Create maze geometry with better visuals
    for (let z = 0; z < MAZE_HEIGHT; z++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        const worldX = (x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
        const worldZ = (z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
        
        if (maze[z][x] === 'wall') {
          // Main wall block
          const wallGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.92, 2, CELL_SIZE * 0.92);
          const wall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
          wall.position.set(worldX, 1, worldZ);
          scene.add(wall);
          mazeMeshesRef.current.push(wall);
          
          // Neon edge glow
          const edgeGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.98, 2.1, CELL_SIZE * 0.98);
          const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.25,
          });
          const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
          edge.position.set(worldX, 1, worldZ);
          scene.add(edge);
          mazeMeshesRef.current.push(edge);
          
          // Top neon line
          const topGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, 0.1, CELL_SIZE * 0.9);
          const topMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6666,
            transparent: true,
            opacity: 0.9,
          });
          const top = new THREE.Mesh(topGeometry, topMaterial);
          top.position.set(worldX, 2.05, worldZ);
          scene.add(top);
          mazeMeshesRef.current.push(top);
        } else {
          // Path floor with subtle glow
          const floorGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
          const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a0505,
            transparent: true,
            opacity: 0.6,
          });
          const floor = new THREE.Mesh(floorGeometry, floorMaterial);
          floor.rotation.x = -Math.PI / 2;
          floor.position.set(worldX, 0.01, worldZ);
          scene.add(floor);
          mazeMeshesRef.current.push(floor);
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
    
    // Update lightning position
    if (lightningRef.current) {
      lightningRef.current.position.copy(lightningPositionRef.current);
    }
  }, [clearMaze, createStartMarker, createTeslaCoil, createObstacle]);

  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 25, 70);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      55, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      150
    );
    camera.position.set(0, 40, 25);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);

    // Create lightning bolt
    const lightning = createLightningBolt();
    scene.add(lightning);
    lightningRef.current = lightning;

    // Build initial maze
    buildMaze(1);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
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
            
            // Hide start marker
            if (startMarkerRef.current) {
              startMarkerRef.current.visible = false;
            }
          }
        }
      }
    };
    containerRef.current.addEventListener('click', handleClick);

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
      
      if (gameStateRef.current === 'playing') {
        // Update timer
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, GAME_DURATION - elapsed);
        setTimeRemaining(Math.ceil(remaining));
        
        if (remaining <= 0) {
          // Game over - time's up
          gameStateRef.current = 'complete';
          setGameState('complete');
          
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
          const moveSpeed = 10 * deltaTime;
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
                    (mainBolt.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
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
                  (mainBolt.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
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
            
            // Build next maze
            buildMaze(currentMazeRef.current);
            hasControlRef.current = true; // Keep control for subsequent mazes
          } else {
            // All mazes complete!
            gameStateRef.current = 'complete';
            setGameState('complete');
            
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
        
        // Camera follow
        if (cameraRef.current) {
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
      
      renderer.render(scene, camera);
    };
    
    animate(0);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick);
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
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
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/50">
          <div className="text-cyan-400 text-sm font-bold mb-1">SCORE</div>
          <div className="text-white text-3xl font-bold">{score.toLocaleString()}</div>
        </div>
        
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-purple-500/50">
          <div className="text-purple-400 text-sm font-bold mb-1">MAZE</div>
          <div className="text-white text-3xl font-bold">{currentMaze} / {TOTAL_MAZES}</div>
        </div>
        
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-green-500/50">
          <div className="text-green-400 text-sm font-bold mb-1">CHECKPOINTS</div>
          <div className="text-white text-3xl font-bold">{currentCheckpoint} / {CHECKPOINTS_PER_MAZE}</div>
        </div>
        
        <div className={`bg-black/80 backdrop-blur-sm rounded-xl p-4 border ${timeRemaining <= 10 ? 'border-red-500 animate-pulse' : 'border-yellow-500/50'}`}>
          <div className={`text-sm font-bold mb-1 ${timeRemaining <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>TIME</div>
          <div className={`text-3xl font-bold ${timeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>{timeRemaining}s</div>
        </div>
      </div>

      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center max-w-xl p-8">
            <div className="text-7xl mb-4">⚡</div>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              LIGHTNING MAZE
            </h1>
            <div className="space-y-3 text-left bg-black/60 rounded-xl p-6 border border-cyan-500/30 mb-6">
              <p className="text-cyan-300 font-bold text-xl">⚡ HOW TO PLAY:</p>
              <p className="text-gray-300 text-lg">• <span className="text-green-400 font-bold">TAP</span> the lightning bolt at the start to take control</p>
              <p className="text-gray-300 text-lg">• Move your <span className="text-cyan-400 font-bold">mouse</span> to guide the lightning</p>
              <p className="text-gray-300 text-lg">• Reach all <span className="text-gray-200 font-bold">silver Tesla coils</span> (+500 pts each)</p>
              <p className="text-gray-300 text-lg">• Avoid <span className="text-pink-400 font-bold">moving obstacles</span> (-25 pts)</p>
              <p className="text-gray-300 text-lg">• Don't hit <span className="text-red-400 font-bold">walls</span> (-10 pts)</p>
              <p className="text-gray-300 text-lg">• Complete <span className="text-purple-400 font-bold">5 mazes</span> before time runs out!</p>
              <p className="text-yellow-300 font-bold text-lg mt-4">⏱️ {GAME_DURATION} SECONDS TO COMPLETE ALL MAZES!</p>
            </div>
            <button
              onClick={startGame}
              className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-2xl rounded-xl transform hover:scale-105 transition-all shadow-lg shadow-cyan-500/50"
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* Waiting for tap */}
      {gameState === 'waiting' && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-8 py-4 border border-green-500 animate-pulse">
            <p className="text-green-400 text-2xl font-bold text-center">
              ⚡ TAP THE LIGHTNING BOLT TO START! ⚡
            </p>
          </div>
        </div>
      )}

      {/* Complete Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center max-w-lg p-8">
            <div className="text-7xl mb-4">{mazesCompleted >= TOTAL_MAZES ? '🏆' : '⏱️'}</div>
            <h1 className="text-4xl font-bold mb-4 text-yellow-400">
              {mazesCompleted >= TOTAL_MAZES ? 'ALL MAZES COMPLETE!' : 'TIME\'S UP!'}
            </h1>
            <div className="bg-black/60 rounded-xl p-6 border border-yellow-500/30 mb-6">
              <div className="text-6xl font-bold text-white mb-2">{score.toLocaleString()}</div>
              <div className="text-yellow-400 text-xl">POINTS</div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-gray-300">
                <div>
                  <div className="text-2xl font-bold text-purple-400">{mazesCompleted}</div>
                  <div className="text-sm">Mazes Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{wallHits}</div>
                  <div className="text-sm">Wall Hits</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
