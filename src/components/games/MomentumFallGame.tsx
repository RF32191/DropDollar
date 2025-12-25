'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// MOMENTUM FALL
// ============================================================================
// Core Mechanic: Falling through a vertical 3D shaft
// Player controls only rotation and tilt
// Obstacles move dynamically - understanding momentum is key
// Skill: Micro-adjustments, anticipation, flow state
// ============================================================================

interface MomentumFallGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface Obstacle {
  mesh: THREE.Group;
  y: number;
  type: 'ring' | 'spinner' | 'gates' | 'maze';
  rotation: number;
  rotationSpeed: number;
  passed: boolean;
}

interface Collectible {
  mesh: THREE.Mesh;
  y: number;
  collected: boolean;
  points: number;
  type: 'gem' | 'star' | 'boost';
}

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

// Seeded RNG
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export default function MomentumFallGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: MomentumFallGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [depth, setDepth] = useState(0);
  const [obstaclesPassed, setObstaclesPassed] = useState(0);
  const [gemsCollected, setGemsCollected] = useState(0);
  const [perfectPasses, setPerfectPasses] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [combo, setCombo] = useState(0);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const shaftRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const depthRef = useRef(0);
  const comboRef = useRef(0);
  const speedRef = useRef(1);
  const playerVelocityRef = useRef({ x: 0, z: 0 });
  const targetTiltRef = useRef({ x: 0, z: 0 });
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextObstacleYRef = useRef(-20);
  const keysRef = useRef<Set<string>>(new Set());
  
  // Constants
  const SHAFT_RADIUS = 8;
  const PLAYER_RADIUS = 0.5;
  const FALL_SPEED_BASE = 0.15;
  const TILT_SPEED = 0.08;
  const FRICTION = 0.95;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          shaft: 0x2d1b4e,
          shaftGlow: 0x6b3fa0,
          player: 0xff6600,
          playerGlow: 0xff9900,
          obstacle: 0x9b59b6,
          obstacleGlow: 0xbb79d6,
          gem: 0x00ff88,
          ambient: 0x4a1a6b
        };
      case 'christmas':
        return {
          background: 0x001122,
          shaft: 0x1e5631,
          shaftGlow: 0x2ecc71,
          player: 0xff0000,
          playerGlow: 0xff4444,
          obstacle: 0xffffff,
          obstacleGlow: 0x87ceeb,
          gem: 0xffd700,
          ambient: 0x1e5631
        };
      default:
        return {
          background: 0x050510,
          shaft: 0x1a1a3a,
          shaftGlow: 0x6c5ce7,
          player: 0x00ffff,
          playerGlow: 0x00ccff,
          obstacle: 0xff3366,
          obstacleGlow: 0xff6699,
          gem: 0xffff00,
          ambient: 0x2a2a5a
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((text: string, x: number, y: number, color: string) => {
    const id = floatingScoreIdRef.current++;
    setFloatingScores(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  // Create obstacle
  const createObstacle = useCallback((y: number, rng: SeededRandom, scene: THREE.Scene): Obstacle => {
    const colors = getThemeColors();
    const types: ('ring' | 'spinner' | 'gates' | 'maze')[] = ['ring', 'spinner', 'gates', 'maze'];
    const type = types[rng.nextInt(0, types.length - 1)];
    
    const group = new THREE.Group();
    
    switch (type) {
      case 'ring': {
        // Ring with gap
        const gapAngle = rng.next() * Math.PI * 2;
        const gapSize = 0.8 + rng.next() * 0.4; // Gap size in radians
        
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
          
          if (angleDiff > gapSize / 2) {
            const segmentGeometry = new THREE.BoxGeometry(1.5, 0.5, 0.5);
            const segmentMaterial = new THREE.MeshStandardMaterial({
              color: colors.obstacle,
              emissive: colors.obstacleGlow,
              emissiveIntensity: 0.3
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.set(
              Math.cos(angle) * (SHAFT_RADIUS - 1.5),
              0,
              Math.sin(angle) * (SHAFT_RADIUS - 1.5)
            );
            segment.rotation.y = -angle;
            group.add(segment);
          }
        }
        break;
      }
      
      case 'spinner': {
        // Rotating bars
        const numBars = 2 + rng.nextInt(0, 2);
        for (let i = 0; i < numBars; i++) {
          const barGeometry = new THREE.BoxGeometry(SHAFT_RADIUS * 1.5, 0.4, 0.6);
          const barMaterial = new THREE.MeshStandardMaterial({
            color: colors.obstacle,
            emissive: colors.obstacleGlow,
            emissiveIntensity: 0.4
          });
          const bar = new THREE.Mesh(barGeometry, barMaterial);
          bar.rotation.y = (i / numBars) * Math.PI;
          group.add(bar);
        }
        break;
      }
      
      case 'gates': {
        // Multiple gates to navigate through
        const numGates = 2 + rng.nextInt(0, 2);
        for (let i = 0; i < numGates; i++) {
          const gateAngle = (i / numGates) * Math.PI * 2 + rng.next() * 0.5;
          const gateWidth = 2 + rng.next();
          
          // Gate frame
          const frameGeometry = new THREE.TorusGeometry(1.5, 0.2, 8, 16, Math.PI);
          const frameMaterial = new THREE.MeshStandardMaterial({
            color: colors.obstacle,
            emissive: colors.obstacleGlow,
            emissiveIntensity: 0.5
          });
          const frame = new THREE.Mesh(frameGeometry, frameMaterial);
          frame.position.set(
            Math.cos(gateAngle) * (SHAFT_RADIUS - 3),
            0,
            Math.sin(gateAngle) * (SHAFT_RADIUS - 3)
          );
          frame.rotation.y = -gateAngle + Math.PI / 2;
          frame.rotation.x = Math.PI / 2;
          group.add(frame);
        }
        break;
      }
      
      case 'maze': {
        // Maze-like pattern
        const pattern = rng.nextInt(0, 3);
        for (let i = 0; i < 6; i++) {
          if ((pattern >> (i % 4)) & 1) continue; // Skip based on pattern
          
          const wallGeometry = new THREE.BoxGeometry(3, 0.4, 0.4);
          const wallMaterial = new THREE.MeshStandardMaterial({
            color: colors.obstacle,
            emissive: colors.obstacleGlow,
            emissiveIntensity: 0.3
          });
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          const angle = (i / 6) * Math.PI * 2;
          wall.position.set(
            Math.cos(angle) * (SHAFT_RADIUS - 3),
            0,
            Math.sin(angle) * (SHAFT_RADIUS - 3)
          );
          wall.rotation.y = angle + Math.PI / 2;
          group.add(wall);
        }
        break;
      }
    }
    
    group.position.y = y;
    scene.add(group);
    
    return {
      mesh: group,
      y,
      type,
      rotation: 0,
      rotationSpeed: (rng.next() - 0.5) * 0.02 * (type === 'spinner' ? 3 : 1),
      passed: false
    };
  }, [getThemeColors]);

  // Create collectible
  const createCollectible = useCallback((y: number, rng: SeededRandom, scene: THREE.Scene): Collectible => {
    const colors = getThemeColors();
    const types: ('gem' | 'star' | 'boost')[] = ['gem', 'gem', 'star', 'boost'];
    const type = types[rng.nextInt(0, types.length - 1)];
    
    let geometry: THREE.BufferGeometry;
    let points: number;
    
    switch (type) {
      case 'star':
        geometry = new THREE.OctahedronGeometry(0.4);
        points = 100;
        break;
      case 'boost':
        geometry = new THREE.ConeGeometry(0.3, 0.6, 4);
        points = 50;
        break;
      default: // gem
        geometry = new THREE.DodecahedronGeometry(0.3);
        points = 25;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: type === 'boost' ? 0x00ffff : colors.gem,
      emissive: type === 'boost' ? 0x00cccc : colors.gem,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Random position within shaft
    const angle = rng.next() * Math.PI * 2;
    const radius = rng.next() * (SHAFT_RADIUS - 2);
    mesh.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
    
    scene.add(mesh);
    
    return {
      mesh,
      y,
      collected: false,
      points,
      type
    };
  }, [getThemeColors]);

  // Create shaft walls
  const createShaft = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const shaft = new THREE.Group();
    
    // Cylindrical walls (using segments)
    const numSegments = 24;
    for (let i = 0; i < numSegments; i++) {
      const angle = (i / numSegments) * Math.PI * 2;
      const nextAngle = ((i + 1) / numSegments) * Math.PI * 2;
      
      const wallGeometry = new THREE.PlaneGeometry(
        2 * SHAFT_RADIUS * Math.sin(Math.PI / numSegments),
        100
      );
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: colors.shaft,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(
        Math.cos(angle + Math.PI / numSegments) * SHAFT_RADIUS,
        0,
        Math.sin(angle + Math.PI / numSegments) * SHAFT_RADIUS
      );
      wall.rotation.y = -(angle + Math.PI / numSegments);
      shaft.add(wall);
    }
    
    // Glowing rings along shaft
    for (let y = 0; y > -100; y -= 10) {
      const ringGeometry = new THREE.TorusGeometry(SHAFT_RADIUS, 0.1, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: colors.shaftGlow,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      shaft.add(ring);
    }
    
    scene.add(shaft);
    return shaft;
  }, [getThemeColors]);

  // Create player
  const createPlayer = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const player = new THREE.Group();
    
    // Main body - streamlined capsule
    const bodyGeometry = new THREE.CapsuleGeometry(PLAYER_RADIUS, PLAYER_RADIUS * 2, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    player.add(body);
    
    // Wings/fins
    const wingGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.3
    });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.y = -0.3;
    player.add(wing);
    
    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(PLAYER_RADIUS * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.playerGlow,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    player.add(glow);
    
    // Trail
    const trailGeometry = new THREE.ConeGeometry(0.2, 1.5, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: colors.playerGlow,
      transparent: true,
      opacity: 0.4
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.y = 1.5;
    trail.rotation.x = Math.PI;
    player.add(trail);
    
    player.position.set(0, 0, 0);
    scene.add(player);
    
    return player;
  }, [getThemeColors]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.FogExp2(colors.background, 0.02);
    sceneRef.current = scene;
    
    // Camera - following player from above
    const camera = new THREE.PerspectiveCamera(
      70,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    // Point lights
    const pointLight1 = new THREE.PointLight(colors.playerGlow, 1, 30);
    pointLight1.position.set(0, 5, 0);
    scene.add(pointLight1);
    
    // Create shaft
    shaftRef.current = createShaft(scene);
    
    // Create player
    playerRef.current = createPlayer(scene);
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate initial obstacles
    for (let y = -15; y > -100; y -= 8 + Math.random() * 5) {
      if (rngRef.current) {
        obstaclesRef.current.push(createObstacle(y, rngRef.current, scene));
        
        // Add collectibles between obstacles
        if (rngRef.current.next() > 0.5) {
          collectiblesRef.current.push(createCollectible(y + 3, rngRef.current, scene));
        }
      }
    }
    nextObstacleYRef.current = -100;
    
    return { scene, camera, renderer };
  }, [getThemeColors, createShaft, createPlayer, createObstacle, createCollectible]);

  // Check collisions
  const checkCollisions = useCallback(() => {
    if (!playerRef.current) return true;
    
    const playerPos = playerRef.current.position;
    
    // Check shaft wall collision
    const distFromCenter = Math.sqrt(playerPos.x ** 2 + playerPos.z ** 2);
    if (distFromCenter > SHAFT_RADIUS - PLAYER_RADIUS) {
      // Bounce off wall
      const angle = Math.atan2(playerPos.z, playerPos.x);
      playerVelocityRef.current.x = -Math.cos(angle) * 0.1;
      playerVelocityRef.current.z = -Math.sin(angle) * 0.1;
      
      // Push back inside
      playerPos.x = Math.cos(angle) * (SHAFT_RADIUS - PLAYER_RADIUS - 0.1);
      playerPos.z = Math.sin(angle) * (SHAFT_RADIUS - PLAYER_RADIUS - 0.1);
      
      // Break combo
      comboRef.current = 0;
      setCombo(0);
    }
    
    // Check obstacle collisions
    for (const obstacle of obstaclesRef.current) {
      if (obstacle.passed) continue;
      
      const obstacleY = obstacle.mesh.position.y;
      
      // Check if player is at obstacle level
      if (Math.abs(obstacleY) < 1.5) {
        // Check collision with each child mesh
        for (const child of obstacle.mesh.children) {
          if (child instanceof THREE.Mesh) {
            const childWorldPos = new THREE.Vector3();
            child.getWorldPosition(childWorldPos);
            
            const dx = playerPos.x - childWorldPos.x;
            const dz = playerPos.z - childWorldPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < PLAYER_RADIUS + 0.5) {
              // Collision!
              return false;
            }
          }
        }
      }
      
      // Mark as passed if below player
      if (obstacleY > 2) {
        obstacle.passed = true;
        setObstaclesPassed(prev => prev + 1);
        
        // Score for passing
        const basePoints = 50;
        comboRef.current++;
        setCombo(comboRef.current);
        
        const comboBonus = Math.min(comboRef.current * 10, 100);
        const points = basePoints + comboBonus;
        
        scoreRef.current += points;
        setScore(scoreRef.current);
        
        // Perfect pass (center of shaft)
        if (distFromCenter < 2) {
          setPerfectPasses(prev => prev + 1);
          const perfectBonus = 100;
          scoreRef.current += perfectBonus;
          setScore(scoreRef.current);
          
          if (cameraRef.current) {
            addFloatingScore(`PERFECT +${perfectBonus}`, window.innerWidth / 2, window.innerHeight / 3, '#ffd700');
          }
        }
      }
    }
    
    // Check collectible collisions
    for (const collectible of collectiblesRef.current) {
      if (collectible.collected) continue;
      
      const collectibleWorldY = collectible.mesh.position.y;
      
      if (Math.abs(collectibleWorldY) < 1) {
        const dx = playerPos.x - collectible.mesh.position.x;
        const dz = playerPos.z - collectible.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < PLAYER_RADIUS + 0.5) {
          collectible.collected = true;
          if (sceneRef.current) {
            sceneRef.current.remove(collectible.mesh);
          }
          
          setGemsCollected(prev => prev + 1);
          
          const points = collectible.points * (1 + comboRef.current * 0.1);
          scoreRef.current += Math.floor(points);
          setScore(scoreRef.current);
          
          // Boost effect
          if (collectible.type === 'boost') {
            speedRef.current = Math.min(3, speedRef.current + 0.3);
            setCurrentSpeed(speedRef.current);
          }
          
          addFloatingScore(`+${Math.floor(points)}`, window.innerWidth / 2, window.innerHeight / 2, '#00ff88');
        }
      }
    }
    
    return true;
  }, [addFloatingScore]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Calculate bonuses
    const depthBonus = Math.floor(depthRef.current * 2);
    const perfectBonus = perfectPasses * 50;
    const speedBonus = Math.floor(speedRef.current * 100);
    
    const finalScore = scoreRef.current + depthBonus + perfectBonus + speedBonus;
    setScore(finalScore);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'momentum-fall',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            depth: depthRef.current,
            obstaclesPassed,
            gemsCollected,
            perfectPasses,
            maxSpeed: speedRef.current,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'momentum-fall',
            action: 'game_complete',
            score: finalScore,
            metadata: {
              depth: depthRef.current,
              obstaclesPassed,
              perfectPasses,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, obstaclesPassed, gemsCollected, perfectPasses, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    // Handle input
    let tiltX = 0, tiltZ = 0;
    
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a') || keysRef.current.has('A')) {
      tiltX = -TILT_SPEED;
    }
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d') || keysRef.current.has('D')) {
      tiltX = TILT_SPEED;
    }
    if (keysRef.current.has('ArrowUp') || keysRef.current.has('w') || keysRef.current.has('W')) {
      tiltZ = -TILT_SPEED;
    }
    if (keysRef.current.has('ArrowDown') || keysRef.current.has('s') || keysRef.current.has('S')) {
      tiltZ = TILT_SPEED;
    }
    
    // Apply touch/mouse tilt
    tiltX += targetTiltRef.current.x * TILT_SPEED;
    tiltZ += targetTiltRef.current.z * TILT_SPEED;
    
    // Apply velocity
    playerVelocityRef.current.x += tiltX;
    playerVelocityRef.current.z += tiltZ;
    
    // Apply friction
    playerVelocityRef.current.x *= FRICTION;
    playerVelocityRef.current.z *= FRICTION;
    
    // Update player position
    if (playerRef.current) {
      playerRef.current.position.x += playerVelocityRef.current.x;
      playerRef.current.position.z += playerVelocityRef.current.z;
      
      // Tilt player based on movement
      playerRef.current.rotation.z = -playerVelocityRef.current.x * 2;
      playerRef.current.rotation.x = playerVelocityRef.current.z * 2;
    }
    
    // Move everything up (player falling)
    const fallSpeed = FALL_SPEED_BASE * speedRef.current;
    
    // Move obstacles up
    obstaclesRef.current.forEach(obstacle => {
      obstacle.mesh.position.y += fallSpeed;
      obstacle.rotation += obstacle.rotationSpeed;
      obstacle.mesh.rotation.y = obstacle.rotation;
      
      // Remove if passed
      if (obstacle.mesh.position.y > 20) {
        if (sceneRef.current) {
          sceneRef.current.remove(obstacle.mesh);
        }
      }
    });
    
    // Remove passed obstacles
    obstaclesRef.current = obstaclesRef.current.filter(o => o.mesh.position.y <= 20);
    
    // Move collectibles up
    collectiblesRef.current.forEach(collectible => {
      if (!collectible.collected) {
        collectible.mesh.position.y += fallSpeed;
        collectible.mesh.rotation.y += 0.05;
        collectible.mesh.rotation.x += 0.02;
      }
    });
    
    // Remove collected/passed collectibles
    collectiblesRef.current = collectiblesRef.current.filter(c => !c.collected && c.mesh.position.y <= 20);
    
    // Move shaft rings
    if (shaftRef.current) {
      shaftRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) {
          child.position.y += fallSpeed;
          if (child.position.y > 20) {
            child.position.y -= 120;
          }
        }
      });
    }
    
    // Update depth
    depthRef.current += fallSpeed;
    setDepth(Math.floor(depthRef.current));
    
    // Gradually increase speed
    speedRef.current = Math.min(3, 1 + depthRef.current * 0.002);
    setCurrentSpeed(speedRef.current);
    
    // Generate new obstacles
    if (depthRef.current > -nextObstacleYRef.current - 50) {
      if (rngRef.current && sceneRef.current) {
        const newY = nextObstacleYRef.current - 8 - rngRef.current.next() * 5;
        obstaclesRef.current.push(createObstacle(newY - depthRef.current, rngRef.current, sceneRef.current));
        
        if (rngRef.current.next() > 0.4) {
          collectiblesRef.current.push(createCollectible(newY - depthRef.current + 3, rngRef.current, sceneRef.current));
        }
        
        nextObstacleYRef.current = newY;
      }
    }
    
    // Check collisions
    if (!checkCollisions()) {
      endGame();
      return;
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [checkCollisions, createObstacle, createCollectible, endGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch/mouse controls
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const handleMove = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
      
      targetTiltRef.current = { x, z: y };
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    
    const handleEnd = () => {
      targetTiltRef.current = { x: 0, z: 0 };
    };
    
    containerRef.current?.addEventListener('mousemove', handleMouseMove);
    containerRef.current?.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current?.addEventListener('mouseleave', handleEnd);
    containerRef.current?.addEventListener('touchend', handleEnd);
    
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('touchmove', handleTouchMove);
      containerRef.current?.removeEventListener('mouseleave', handleEnd);
      containerRef.current?.removeEventListener('touchend', handleEnd);
    };
  }, [gameState]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setDepth(0);
    setObstaclesPassed(0);
    setGemsCollected(0);
    setPerfectPasses(0);
    setCurrentSpeed(1);
    setCombo(0);
    
    scoreRef.current = 0;
    depthRef.current = 0;
    comboRef.current = 0;
    speedRef.current = 1;
    playerVelocityRef.current = { x: 0, z: 0 };
    targetTiltRef.current = { x: 0, z: 0 };
    
    // Reset player position
    if (playerRef.current) {
      playerRef.current.position.set(0, 0, 0);
      playerRef.current.rotation.set(0, 0, 0);
    }
    
    // Clear and regenerate obstacles
    if (sceneRef.current) {
      obstaclesRef.current.forEach(o => sceneRef.current?.remove(o.mesh));
      collectiblesRef.current.forEach(c => sceneRef.current?.remove(c.mesh));
      obstaclesRef.current = [];
      collectiblesRef.current = [];
      
      // Reinitialize RNG
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      rngRef.current = new SeededRandom(seed);
      
      // Generate obstacles
      for (let y = -15; y > -100; y -= 8 + Math.random() * 5) {
        if (rngRef.current) {
          obstaclesRef.current.push(createObstacle(y, rngRef.current, sceneRef.current));
          if (rngRef.current.next() > 0.5) {
            collectiblesRef.current.push(createCollectible(y + 3, rngRef.current, sceneRef.current));
          }
        }
      }
      nextObstacleYRef.current = -100;
    }
    
    gameActiveRef.current = true;
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/momentum-fall-halloween.mp3' 
      : theme === 'christmas' 
        ? '/momentum-fall-christmas.mp3' 
        : '/momentum-fall.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [createObstacle, createCollectible, gameLoop, theme]);

  // Initialize
  useEffect(() => {
    if (gameState === 'instructions') {
      initScene();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = getThemeColors();

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Game Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score & Combo */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
              {combo > 0 && (
                <div className={`mt-1 font-bold ${combo >= 10 ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                  {combo}x COMBO
                </div>
              )}
            </div>
            
            {/* Center: Depth & Speed */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-3xl font-mono font-bold text-white">
                {depth}m
              </div>
              <div className="text-sm text-purple-400">
                Speed: {currentSpeed.toFixed(1)}x
              </div>
            </div>
            
            {/* Right: Stats */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{obstaclesPassed} passed</div>
              <div className="text-sm text-yellow-400">{perfectPasses} perfect</div>
              <div className="text-xs text-green-400">{gemsCollected} gems</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls hint */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden sm:inline">WASD or Arrow Keys to tilt</span>
              <span className="sm:hidden">Tilt device or touch to move</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Scores */}
      {floatingScores.map(fs => (
        <div
          key={fs.id}
          className="absolute pointer-events-none font-bold text-2xl"
          style={{
            left: fs.x,
            top: fs.y,
            color: fs.color,
            transform: 'translate(-50%, -50%)',
            textShadow: '0 0 15px currentColor',
            animation: 'floatUp 1.5s ease-out forwards'
          }}
        >
          {fs.text}
        </div>
      ))}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h1 className="text-3xl font-bold text-cyan-400 mb-4">
              ⬇️ Momentum Fall
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <div className="font-bold text-white">Tilt to Move</div>
                  <div className="text-sm">Use WASD/Arrows or tilt your device to navigate!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-bold text-white">Fall Forever</div>
                  <div className="text-sm">Dodge obstacles, collect gems, build momentum!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-white">Stay Centered</div>
                  <div className="text-sm">Perfect passes through the center = bonus points!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <div className="font-bold text-white">Speed Increases</div>
                  <div className="text-sm">The deeper you go, the faster you fall!</div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-xl text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              START FALLING
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Impact!</h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Depth</div>
                <div className="text-2xl font-bold text-white">{depth}m</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Obstacles</div>
                <div className="text-2xl font-bold text-white">{obstaclesPassed}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Perfect Passes</div>
                <div className="text-2xl font-bold text-yellow-400">{perfectPasses}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Gems</div>
                <div className="text-2xl font-bold text-green-400">{gemsCollected}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
              >
                Fall Again
              </button>
              <button
                onClick={() => window.location.href = '/games'}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
      `}</style>
    </div>
  );
}

