'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface LightningMazeGameProps {
  onGameComplete: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
}

// Maze cell types
type CellType = 'wall' | 'path' | 'checkpoint' | 'start' | 'end' | 'changing';

interface MazeCell {
  x: number;
  z: number;
  type: CellType;
  checkpointIndex?: number;
}

interface Checkpoint {
  x: number;
  z: number;
  reached: boolean;
  reachTime?: number;
}

// Generate a maze using recursive backtracking
function generateMaze(width: number, height: number): CellType[][] {
  const maze: CellType[][] = Array(height).fill(null).map(() => Array(width).fill('wall'));
  
  const carve = (x: number, z: number) => {
    maze[z][x] = 'path';
    const directions = [
      [0, -2], [0, 2], [-2, 0], [2, 0]
    ].sort(() => Math.random() - 0.5);
    
    for (const [dx, dz] of directions) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx > 0 && nx < width - 1 && nz > 0 && nz < height - 1 && maze[nz][nx] === 'wall') {
        maze[z + dz / 2][x + dx / 2] = 'path';
        carve(nx, nz);
      }
    }
  };
  
  // Start from center-ish
  carve(1, 1);
  
  // Add some extra passages for more interesting paths
  for (let i = 0; i < width * height / 15; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const z = Math.floor(Math.random() * (height - 2)) + 1;
    if (maze[z][x] === 'wall') {
      // Check if adjacent to a path
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

export default function LightningMazeGame({ onGameComplete }: LightningMazeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lightningRef = useRef<THREE.Group | null>(null);
  const lightningPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const targetPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.5, 0));
  const mazeRef = useRef<CellType[][]>([]);
  const mazeMeshesRef = useRef<THREE.Mesh[]>([]);
  const changingWallsRef = useRef<{ mesh: THREE.Mesh; isWall: boolean; timer: number }[]>([]);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const checkpointMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lightningTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [checkpointTimes, setCheckpointTimes] = useState<number[]>([]);
  
  const scoreRef = useRef(0);
  const gameStateRef = useRef<'ready' | 'playing' | 'complete'>('ready');
  const startTimeRef = useRef<number>(0);
  const lastCheckpointTimeRef = useRef<number>(0);

  const MAZE_WIDTH = 21;
  const MAZE_HEIGHT = 21;
  const CELL_SIZE = 2;

  // Create animated lightning bolt geometry
  const createLightningBolt = useCallback(() => {
    const group = new THREE.Group();
    
    // Main bolt - jagged shape
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const y = (i / segments) * 2 - 1; // -1 to 1
      const wiggle = i > 0 && i < segments ? (Math.random() - 0.5) * 0.3 : 0;
      points.push(new THREE.Vector3(wiggle, y, 0));
    }
    
    // Create tube geometry for main bolt
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
    const boltMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1.0,
    });
    const bolt = new THREE.Mesh(tubeGeometry, boltMaterial);
    bolt.name = 'mainBolt';
    group.add(bolt);
    
    // Core glow (brighter inner)
    const coreGeometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.name = 'core';
    group.add(core);
    
    // Outer glow
    const glowGeometry = new THREE.TubeGeometry(curve, 20, 0.15, 8, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    // Electric crackling branches
    for (let i = 0; i < 4; i++) {
      const branchPoints: THREE.Vector3[] = [];
      const startY = (Math.random() * 1.2) - 0.6;
      const startX = points[Math.floor((startY + 1) / 2 * segments)]?.x || 0;
      branchPoints.push(new THREE.Vector3(startX, startY, 0));
      
      const direction = Math.random() > 0.5 ? 1 : -1;
      const length = 0.3 + Math.random() * 0.3;
      branchPoints.push(new THREE.Vector3(
        startX + direction * length * 0.5,
        startY + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.1
      ));
      branchPoints.push(new THREE.Vector3(
        startX + direction * length,
        startY + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.15
      ));
      
      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchGeometry = new THREE.TubeGeometry(branchCurve, 8, 0.02, 4, false);
      const branchMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
      });
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.name = `branch${i}`;
      group.add(branch);
    }
    
    // Point light for glow effect
    const pointLight = new THREE.PointLight(0x00ffff, 2, 5);
    pointLight.position.set(0, 0, 0);
    group.add(pointLight);
    
    group.scale.set(0.5, 0.5, 0.5);
    group.rotation.x = -Math.PI / 2; // Lay flat
    
    return group;
  }, []);

  // Update lightning bolt animation (squiggly movement)
  const updateLightningAnimation = useCallback((group: THREE.Group, time: number) => {
    // Regenerate the main bolt with new wiggle
    const mainBolt = group.getObjectByName('mainBolt') as THREE.Mesh;
    const core = group.getObjectByName('core') as THREE.Mesh;
    const glow = group.getObjectByName('glow') as THREE.Mesh;
    
    if (mainBolt && core && glow) {
      const points: THREE.Vector3[] = [];
      const segments = 8;
      for (let i = 0; i <= segments; i++) {
        const y = (i / segments) * 2 - 1;
        const wiggle = i > 0 && i < segments ? 
          Math.sin(time * 20 + i * 2) * 0.15 + Math.sin(time * 35 + i * 3) * 0.1 : 0;
        points.push(new THREE.Vector3(wiggle, y, Math.sin(time * 25 + i) * 0.05));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      
      // Update geometries
      mainBolt.geometry.dispose();
      mainBolt.geometry = new THREE.TubeGeometry(curve, 20, 0.08, 8, false);
      
      core.geometry.dispose();
      core.geometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
      
      glow.geometry.dispose();
      glow.geometry = new THREE.TubeGeometry(curve, 20, 0.15 + Math.sin(time * 10) * 0.03, 8, false);
      
      // Pulsing opacity
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 15) * 0.1;
    }
    
    // Update branches
    for (let i = 0; i < 4; i++) {
      const branch = group.getObjectByName(`branch${i}`) as THREE.Mesh;
      if (branch) {
        (branch.material as THREE.MeshBasicMaterial).opacity = 
          0.5 + Math.sin(time * 20 + i * Math.PI) * 0.3;
      }
    }
    
    // Slight rotation wobble
    group.rotation.z = Math.sin(time * 8) * 0.1;
  }, []);

  // Check if position is valid (on a path)
  const isValidPosition = useCallback((x: number, z: number): boolean => {
    const maze = mazeRef.current;
    if (maze.length === 0) return false;
    
    const cellX = Math.floor((x + MAZE_WIDTH * CELL_SIZE / 2) / CELL_SIZE);
    const cellZ = Math.floor((z + MAZE_HEIGHT * CELL_SIZE / 2) / CELL_SIZE);
    
    if (cellX < 0 || cellX >= MAZE_WIDTH || cellZ < 0 || cellZ >= MAZE_HEIGHT) {
      return false;
    }
    
    const cell = maze[cellZ]?.[cellX];
    return cell === 'path' || cell === 'checkpoint' || cell === 'start' || cell === 'end' || cell === 'changing';
  }, []);

  // Find closest valid position on maze
  const findClosestValidPosition = useCallback((targetX: number, targetZ: number, currentPos: THREE.Vector3): THREE.Vector3 => {
    // If target is valid, move towards it
    if (isValidPosition(targetX, targetZ)) {
      return new THREE.Vector3(targetX, 0.5, targetZ);
    }
    
    // Otherwise, find the closest valid cell
    const maze = mazeRef.current;
    let closestDist = Infinity;
    let closestPos = currentPos.clone();
    
    const searchRadius = 3;
    const currentCellX = Math.floor((currentPos.x + MAZE_WIDTH * CELL_SIZE / 2) / CELL_SIZE);
    const currentCellZ = Math.floor((currentPos.z + MAZE_HEIGHT * CELL_SIZE / 2) / CELL_SIZE);
    
    for (let dz = -searchRadius; dz <= searchRadius; dz++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const cx = currentCellX + dx;
        const cz = currentCellZ + dz;
        
        if (cx < 0 || cx >= MAZE_WIDTH || cz < 0 || cz >= MAZE_HEIGHT) continue;
        
        const cell = maze[cz]?.[cx];
        if (cell === 'path' || cell === 'checkpoint' || cell === 'start' || cell === 'end' || cell === 'changing') {
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

  // Initialize the game
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 20, 60);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    camera.position.set(0, 35, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    // Generate maze
    const maze = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);
    mazeRef.current = maze;

    // Create maze meshes
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
    });
    
    const wallGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.3,
    });

    const pathMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a0000,
      transparent: true,
      opacity: 0.5,
    });

    // Create maze geometry
    for (let z = 0; z < MAZE_HEIGHT; z++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        const worldX = (x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
        const worldZ = (z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
        
        if (maze[z][x] === 'wall') {
          // Wall block
          const wallGeometry = new THREE.BoxGeometry(CELL_SIZE * 0.95, 1.5, CELL_SIZE * 0.95);
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          wall.position.set(worldX, 0.75, worldZ);
          scene.add(wall);
          mazeMeshesRef.current.push(wall);
          
          // Wall glow
          const glowGeometry = new THREE.BoxGeometry(CELL_SIZE * 1.05, 1.7, CELL_SIZE * 1.05);
          const wallGlow = new THREE.Mesh(glowGeometry, wallGlowMaterial);
          wallGlow.position.set(worldX, 0.75, worldZ);
          scene.add(wallGlow);
          
          // Add neon edge lines
          const edges = new THREE.EdgesGeometry(wallGeometry);
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          wireframe.position.copy(wall.position);
          scene.add(wireframe);
        } else {
          // Path floor
          const floorGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
          const floor = new THREE.Mesh(floorGeometry, pathMaterial);
          floor.rotation.x = -Math.PI / 2;
          floor.position.set(worldX, 0.01, worldZ);
          scene.add(floor);
        }
      }
    }

    // Add changing walls (walls that appear/disappear)
    const changingWallPositions: { x: number; z: number }[] = [];
    for (let i = 0; i < 8; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const x = Math.floor(Math.random() * (MAZE_WIDTH - 4)) + 2;
        const z = Math.floor(Math.random() * (MAZE_HEIGHT - 4)) + 2;
        if (maze[z][x] === 'path') {
          // Check if not blocking critical path
          const adjPaths = [
            maze[z - 1]?.[x] === 'path' ? 1 : 0,
            maze[z + 1]?.[x] === 'path' ? 1 : 0,
            maze[z]?.[x - 1] === 'path' ? 1 : 0,
            maze[z]?.[x + 1] === 'path' ? 1 : 0,
          ].reduce((a, b) => a + b, 0);
          
          if (adjPaths >= 3) {
            changingWallPositions.push({ x, z });
            maze[z][x] = 'changing';
            break;
          }
        }
        attempts++;
      }
    }

    // Create changing wall meshes
    const changingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.7,
    });
    
    changingWallPositions.forEach(({ x, z }) => {
      const worldX = (x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
      const worldZ = (z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
      
      const geometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, 1.2, CELL_SIZE * 0.9);
      const mesh = new THREE.Mesh(geometry, changingMaterial.clone());
      mesh.position.set(worldX, 0.6, worldZ);
      mesh.visible = false; // Start invisible
      scene.add(mesh);
      
      changingWallsRef.current.push({
        mesh,
        isWall: false,
        timer: Math.random() * 3 // Stagger initial timers
      });
    });

    // Place checkpoints along paths
    const pathCells: { x: number; z: number }[] = [];
    for (let z = 0; z < MAZE_HEIGHT; z++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        if (maze[z][x] === 'path') {
          pathCells.push({ x, z });
        }
      }
    }
    
    // Select checkpoint positions spread across the maze
    const numCheckpoints = 5;
    const checkpoints: Checkpoint[] = [];
    const usedCells = new Set<string>();
    
    // Start position (first path cell)
    const startCell = pathCells[0];
    const startX = (startCell.x - MAZE_WIDTH / 2 + 0.5) * CELL_SIZE;
    const startZ = (startCell.z - MAZE_HEIGHT / 2 + 0.5) * CELL_SIZE;
    lightningPositionRef.current.set(startX, 0.5, startZ);
    
    // Place checkpoints at varying distances
    for (let i = 0; i < numCheckpoints; i++) {
      let bestCell = null;
      let bestDist = -1;
      
      const targetDist = (i + 1) * (pathCells.length / (numCheckpoints + 1));
      
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
        checkpoints.push({ x: worldX, z: worldZ, reached: false });
        maze[bestCell.z][bestCell.x] = 'checkpoint';
      }
    }
    
    checkpointsRef.current = checkpoints;
    setTotalCheckpoints(checkpoints.length);

    // Create checkpoint visuals
    const checkpointMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
    });
    
    checkpoints.forEach((cp, index) => {
      // Ring indicator
      const ringGeometry = new THREE.TorusGeometry(CELL_SIZE * 0.4, 0.1, 8, 32);
      const ring = new THREE.Mesh(ringGeometry, checkpointMaterial.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cp.x, 0.2, cp.z);
      scene.add(ring);
      checkpointMeshesRef.current.push(ring);
      
      // Number indicator
      const numberGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const numberMesh = new THREE.Mesh(numberGeometry, checkpointMaterial.clone());
      numberMesh.position.set(cp.x, 1, cp.z);
      scene.add(numberMesh);
      
      // Glow light
      const cpLight = new THREE.PointLight(0x00ff00, 1, 4);
      cpLight.position.set(cp.x, 1, cp.z);
      scene.add(cpLight);
    });

    // Create lightning bolt
    const lightning = createLightningBolt();
    lightning.position.copy(lightningPositionRef.current);
    scene.add(lightning);
    lightningRef.current = lightning;

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse movement handler
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || gameStateRef.current !== 'playing') return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycaster to get world position
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      
      // Create a plane at y=0.5 to intersect with
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
      
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      lightningTimeRef.current = time / 1000;
      
      if (gameStateRef.current === 'playing') {
        // Update time elapsed
        setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        
        // Move lightning towards target
        const currentPos = lightningPositionRef.current;
        const targetPos = targetPositionRef.current;
        
        const direction = new THREE.Vector3().subVectors(targetPos, currentPos);
        const distance = direction.length();
        
        if (distance > 0.1) {
          direction.normalize();
          const moveSpeed = 8 * deltaTime;
          const moveAmount = Math.min(moveSpeed, distance);
          
          // Move incrementally, checking path validity
          const newPos = currentPos.clone().addScaledVector(direction, moveAmount);
          
          // Snap to valid path
          if (isValidPosition(newPos.x, newPos.z)) {
            lightningPositionRef.current.copy(newPos);
          } else {
            // Try to move along valid path
            const validPos = findClosestValidPosition(newPos.x, newPos.z, currentPos);
            const validDirection = new THREE.Vector3().subVectors(validPos, currentPos);
            if (validDirection.length() > 0.05) {
              validDirection.normalize();
              lightningPositionRef.current.addScaledVector(validDirection, moveAmount * 0.5);
            }
          }
          
          lightningPositionRef.current.y = 0.5;
        }
        
        // Update lightning mesh position
        if (lightningRef.current) {
          lightningRef.current.position.copy(lightningPositionRef.current);
          updateLightningAnimation(lightningRef.current, lightningTimeRef.current);
        }
        
        // Check checkpoint collisions
        const checkpoints = checkpointsRef.current;
        for (let i = 0; i < checkpoints.length; i++) {
          if (!checkpoints[i].reached) {
            const dx = lightningPositionRef.current.x - checkpoints[i].x;
            const dz = lightningPositionRef.current.z - checkpoints[i].z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < CELL_SIZE * 0.6) {
              checkpoints[i].reached = true;
              checkpoints[i].reachTime = Date.now();
              
              // Calculate speed bonus
              const timeSinceLastCheckpoint = (Date.now() - lastCheckpointTimeRef.current) / 1000;
              lastCheckpointTimeRef.current = Date.now();
              
              // Faster = more points (max 500 per checkpoint)
              const speedBonus = Math.max(50, Math.floor(500 / (timeSinceLastCheckpoint + 0.5)));
              const basePoints = 100;
              const totalPoints = basePoints + speedBonus;
              
              scoreRef.current += totalPoints;
              setScore(scoreRef.current);
              setCurrentCheckpoint(i + 1);
              setCheckpointTimes(prev => [...prev, timeSinceLastCheckpoint]);
              
              // Visual feedback - change checkpoint color
              if (checkpointMeshesRef.current[i]) {
                (checkpointMeshesRef.current[i].material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
              }
              
              // Check if all checkpoints reached
              if (checkpoints.every(cp => cp.reached)) {
                gameStateRef.current = 'complete';
                setGameState('complete');
                
                // Final time bonus
                const totalTime = (Date.now() - startTimeRef.current) / 1000;
                const timeBonus = Math.max(0, Math.floor(2000 - totalTime * 20));
                scoreRef.current += timeBonus;
                setScore(scoreRef.current);
                
                // Calculate average checkpoint time for accuracy equivalent
                const avgTime = checkpointTimes.reduce((a, b) => a + b, 0) / checkpointTimes.length || 1;
                const accuracy = Math.min(100, Math.floor(100 / avgTime * 2));
                
                onGameComplete({
                  score: scoreRef.current,
                  accuracy: accuracy,
                  avgReactionTime: Math.round(avgTime * 1000)
                });
              }
            }
          }
        }
        
        // Update changing walls
        changingWallsRef.current.forEach(wall => {
          wall.timer -= deltaTime;
          if (wall.timer <= 0) {
            wall.isWall = !wall.isWall;
            wall.mesh.visible = wall.isWall;
            wall.timer = 2 + Math.random() * 3; // 2-5 seconds
            
            // Update maze data
            const cellX = Math.floor((wall.mesh.position.x + MAZE_WIDTH * CELL_SIZE / 2) / CELL_SIZE);
            const cellZ = Math.floor((wall.mesh.position.z + MAZE_HEIGHT * CELL_SIZE / 2) / CELL_SIZE);
            if (mazeRef.current[cellZ]) {
              mazeRef.current[cellZ][cellX] = wall.isWall ? 'wall' : 'changing';
            }
          }
          
          // Pulsing animation for changing walls
          if (wall.mesh.visible) {
            (wall.mesh.material as THREE.MeshBasicMaterial).opacity = 
              0.5 + Math.sin(lightningTimeRef.current * 5) * 0.2;
          }
        });
        
        // Camera follow (smooth)
        if (cameraRef.current) {
          const targetCamX = lightningPositionRef.current.x * 0.3;
          const targetCamZ = lightningPositionRef.current.z * 0.3 + 15;
          cameraRef.current.position.x += (targetCamX - cameraRef.current.position.x) * 0.02;
          cameraRef.current.position.z += (targetCamZ - cameraRef.current.position.z) * 0.02;
          cameraRef.current.lookAt(lightningPositionRef.current.x * 0.5, 0, lightningPositionRef.current.z * 0.5);
        }
      }
      
      renderer.render(scene, camera);
    };
    
    animate(0);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createLightningBolt, updateLightningAnimation, isValidPosition, findClosestValidPosition, onGameComplete]);

  const startGame = () => {
    setGameState('playing');
    gameStateRef.current = 'playing';
    startTimeRef.current = Date.now();
    lastCheckpointTimeRef.current = Date.now();
    setScore(0);
    scoreRef.current = 0;
    setCurrentCheckpoint(0);
    setCheckpointTimes([]);
    
    // Reset checkpoints
    checkpointsRef.current.forEach((cp, i) => {
      cp.reached = false;
      cp.reachTime = undefined;
      if (checkpointMeshesRef.current[i]) {
        (checkpointMeshesRef.current[i].material as THREE.MeshBasicMaterial).color.setHex(0x00ff00);
      }
    });
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/50">
          <div className="text-cyan-400 text-sm font-bold mb-1">SCORE</div>
          <div className="text-white text-3xl font-bold">{score.toLocaleString()}</div>
        </div>
        
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-green-500/50">
          <div className="text-green-400 text-sm font-bold mb-1">CHECKPOINTS</div>
          <div className="text-white text-3xl font-bold">{currentCheckpoint} / {totalCheckpoints}</div>
        </div>
        
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-red-500/50">
          <div className="text-red-400 text-sm font-bold mb-1">TIME</div>
          <div className="text-white text-3xl font-bold">{timeElapsed}s</div>
        </div>
      </div>

      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center max-w-lg p-8">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              LIGHTNING MAZE
            </h1>
            <div className="space-y-3 text-left bg-black/50 rounded-xl p-6 border border-cyan-500/30 mb-6">
              <p className="text-cyan-300 font-bold text-lg">⚡ HOW TO PLAY:</p>
              <p className="text-gray-300">• Move your <span className="text-cyan-400 font-bold">mouse</span> to guide the lightning bolt</p>
              <p className="text-gray-300">• Navigate through the <span className="text-red-400 font-bold">neon maze</span></p>
              <p className="text-gray-300">• Reach all <span className="text-green-400 font-bold">green checkpoints</span></p>
              <p className="text-gray-300">• Watch out for <span className="text-orange-400 font-bold">changing walls!</span></p>
              <p className="text-yellow-300 font-bold mt-4">💨 FASTER = MORE POINTS!</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xl rounded-xl transform hover:scale-105 transition-all shadow-lg shadow-cyan-500/50"
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* Complete Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center max-w-lg p-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold mb-4 text-yellow-400">
              MAZE COMPLETE!
            </h1>
            <div className="bg-black/50 rounded-xl p-6 border border-yellow-500/30 mb-6">
              <div className="text-5xl font-bold text-white mb-2">{score.toLocaleString()}</div>
              <div className="text-yellow-400 text-lg">POINTS</div>
              <div className="mt-4 text-gray-400">
                Completed in {timeElapsed} seconds
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

