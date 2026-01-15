'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// NEON RAIL RUNNER - ENHANCED
// ============================================================================
// Core Mechanic: Player grinds on floating neon rails in 3D space
// Double jump, destroy breakable obstacles, epic camera work!
// ============================================================================

interface NeonRailRunnerGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface Rail {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  length: number;
  active: boolean;
}

interface Obstacle {
  mesh: THREE.Group;
  position: number;
  rail: Rail;
  type: 'burst' | 'barrier' | 'breakable';
  health: number;
}

interface Collectible {
  mesh: THREE.Mesh;
  position: number;
  rail: Rail;
  collected: boolean;
  type: 'star' | 'boost' | 'multiplier';
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
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export default function NeonRailRunnerGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: NeonRailRunnerGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [stylePoints, setStylePoints] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [railsCompleted, setRailsCompleted] = useState(0);
  const [flipsPerformed, setFlipsPerformed] = useState(0);
  const [perfectJumps, setPerfectJumps] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [timeLeft, setTimeLeft] = useState(90);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const [jumpsRemaining, setJumpsRemaining] = useState(2);
  const [destroyReady, setDestroyReady] = useState(true);
  const [obstaclesDestroyed, setObstaclesDestroyed] = useState(0);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const railsRef = useRef<Rail[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const styleRef = useRef(0);
  const speedRef = useRef(1);
  const multiplierRef = useRef(1);
  const currentRailRef = useRef<Rail | null>(null);
  const railProgressRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isJumpingRef = useRef(false);
  const jumpHeightRef = useRef(0);
  const flipRotationRef = useRef(0);
  const railIndexRef = useRef(0);
  const jumpsRemainingRef = useRef(2);
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraLookAtRef = useRef(new THREE.Vector3());
  const destroyReadyRef = useRef(true);
  const destroyCooldownRef = useRef(0);
  const trailParticlesRef = useRef<THREE.Points | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  // Constants
  const JUMP_DURATION = 0.8;
  const DESTROY_COOLDOWN = 2000;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          rail: 0xff6600,
          railGlow: 0xff9900,
          player: 0x9b59b6,
          playerGlow: 0xbb79d6,
          obstacle: 0xff0000,
          breakable: 0x00ff88,
          collectible: 0x00ff00,
          ambient: 0x4a1a6b
        };
      case 'christmas':
        return {
          background: 0x001122,
          rail: 0x00ff00,
          railGlow: 0x44ff44,
          player: 0xff0000,
          playerGlow: 0xff4444,
          obstacle: 0xffffff,
          breakable: 0xffd700,
          collectible: 0xffd700,
          ambient: 0x1e5631
        };
      default:
        return {
          background: 0x050510,
          rail: 0x00ffff,
          railGlow: 0x00ccff,
          player: 0xff00ff,
          playerGlow: 0xff44ff,
          obstacle: 0xff3333,
          breakable: 0x00ff88,
          collectible: 0xffff00,
          ambient: 0x1a1a3a
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((text: string, x: number, y: number, color: string) => {
    const id = floatingScoreIdRef.current++;
    setFloatingScores(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== id)), 1500);
  }, []);

  // Create enhanced rail with better visuals
  const createRail = useCallback((startPos: THREE.Vector3, endPos: THREE.Vector3, scene: THREE.Scene): Rail => {
    const colors = getThemeColors();
    const direction = endPos.clone().sub(startPos);
    const length = direction.length();
    
    // Main rail - thicker tube with glow
    const curve = new THREE.LineCurve3(startPos, endPos);
    const geometry = new THREE.TubeGeometry(curve, 32, 0.2, 12, false);
    
    const material = new THREE.MeshStandardMaterial({
      color: colors.rail,
      emissive: colors.rail,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Outer glow
    const glowGeometry = new THREE.TubeGeometry(curve, 32, 0.35, 12, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.railGlow,
      transparent: true,
      opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);
    
    // Add sparkling particles along rail
    const particleCount = Math.floor(length * 3);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const point = startPos.clone().lerp(endPos, t);
      const offset = (Math.random() - 0.5) * 0.3;
      positions[i * 3] = point.x + offset;
      positions[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = point.z + offset;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: colors.railGlow,
      size: 0.08,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    return { mesh, glow, startPos, endPos, length, active: true };
  }, [getThemeColors]);

  // Generate rails procedurally
  const generateRails = useCallback((scene: THREE.Scene, rng: SeededRandom, startFrom?: THREE.Vector3) => {
    const rails: Rail[] = [];
    let currentPos = startFrom || new THREE.Vector3(0, 0, 0);
    
    for (let i = 0; i < 12; i++) {
      const length = 10 + rng.next() * 15;
      const angleXZ = (rng.next() - 0.5) * Math.PI * 0.4;
      const angleY = (rng.next() - 0.5) * 0.25;
      
      const direction = new THREE.Vector3(
        Math.sin(angleXZ),
        angleY,
        -Math.cos(angleXZ)
      ).normalize().multiplyScalar(length);
      
      const endPos = currentPos.clone().add(direction);
      const rail = createRail(currentPos, endPos, scene);
      rails.push(rail);
      currentPos = endPos;
    }
    
    return rails;
  }, [createRail]);

  // Create enhanced obstacle
  const spawnObstacle = useCallback((rail: Rail, position: number, scene: THREE.Scene) => {
    const colors = getThemeColors();
    const rng = rngRef.current;
    
    // More breakable obstacles for gameplay
    const types: ('burst' | 'barrier' | 'breakable')[] = ['burst', 'barrier', 'breakable', 'breakable'];
    const type = rng ? types[rng.nextInt(0, types.length - 1)] : 'burst';
    
    const group = new THREE.Group();
    
    if (type === 'breakable') {
      // Glowing crystal that can be destroyed
      const crystalGeom = new THREE.OctahedronGeometry(0.5, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: colors.breakable,
        emissive: colors.breakable,
        emissiveIntensity: 0.8,
        metalness: 0.2,
        roughness: 0.3,
        transparent: true,
        opacity: 0.9
      });
      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      group.add(crystal);
      
      // Rotating rings around crystal
      const ringGeom = new THREE.TorusGeometry(0.7, 0.05, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: colors.breakable, transparent: true, opacity: 0.5 });
      const ring1 = new THREE.Mesh(ringGeom, ringMat);
      ring1.rotation.x = Math.PI / 2;
      group.add(ring1);
      
      const ring2 = new THREE.Mesh(ringGeom, ringMat);
      ring2.rotation.y = Math.PI / 2;
      group.add(ring2);
      
    } else if (type === 'barrier') {
      // Wall barrier
      const barrierGeom = new THREE.BoxGeometry(0.4, 2, 0.4);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: colors.obstacle,
        emissive: colors.obstacle,
        emissiveIntensity: 0.5,
        metalness: 0.7,
        roughness: 0.3
      });
      const barrier = new THREE.Mesh(barrierGeom, barrierMat);
      group.add(barrier);
      
      // Warning stripes
      const stripeGeom = new THREE.BoxGeometry(0.5, 0.15, 0.5);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.y = -0.6 + i * 0.6;
        group.add(stripe);
      }
    } else {
      // Energy burst sphere
      const burstGeom = new THREE.SphereGeometry(0.45, 24, 24);
      const burstMat = new THREE.MeshStandardMaterial({
        color: colors.obstacle,
        emissive: colors.obstacle,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.85
      });
      const burst = new THREE.Mesh(burstGeom, burstMat);
      group.add(burst);
      
      // Electric arcs
      for (let i = 0; i < 4; i++) {
        const arcGeom = new THREE.TorusGeometry(0.6, 0.03, 6, 16);
        const arcMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.6 });
        const arc = new THREE.Mesh(arcGeom, arcMat);
        arc.rotation.x = Math.random() * Math.PI;
        arc.rotation.y = Math.random() * Math.PI;
        group.add(arc);
      }
    }
    
    const railPoint = rail.startPos.clone().lerp(rail.endPos, position);
    group.position.copy(railPoint);
    group.position.y += type === 'barrier' ? 1 : 0.6;
    
    scene.add(group);
    
    obstaclesRef.current.push({
      mesh: group,
      position,
      rail,
      type,
      health: type === 'breakable' ? 1 : -1
    });
  }, [getThemeColors]);

  // Spawn collectible
  const spawnCollectible = useCallback((rail: Rail, position: number, scene: THREE.Scene) => {
    const colors = getThemeColors();
    const rng = rngRef.current;
    
    const types: ('star' | 'boost' | 'multiplier')[] = ['star', 'star', 'star', 'boost', 'multiplier'];
    const type = rng ? types[rng.nextInt(0, types.length - 1)] : 'star';
    
    const geometry = type === 'star' 
      ? new THREE.OctahedronGeometry(0.35)
      : type === 'boost'
        ? new THREE.ConeGeometry(0.3, 0.6, 6)
        : new THREE.TorusGeometry(0.3, 0.12, 8, 24);
    
    const color = type === 'star' ? colors.collectible 
      : type === 'boost' ? 0x00ffff : 0xff00ff;
    
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      metalness: 0.8,
      roughness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const railPoint = rail.startPos.clone().lerp(rail.endPos, position);
    mesh.position.copy(railPoint);
    mesh.position.y += 1.2;
    
    scene.add(mesh);
    collectiblesRef.current.push({ mesh, position, rail, collected: false, type });
  }, [getThemeColors]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 30, 100);
    sceneRef.current = scene;
    
    // Camera with improved FOV and resolution
    const camera = new THREE.PerspectiveCamera(
      70, // Slightly narrower FOV for better resolution
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      300 // Increased far plane for better view distance
    );
    camera.position.set(0, 7, 12); // Slightly higher and further back for better view
    camera.lookAt(0, 0, -5);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    // Higher pixel ratio for better resolution
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better color rendering
    renderer.toneMappingExposure = 1.2; // Slightly brighter
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Enhanced lighting
    scene.add(new THREE.AmbientLight(colors.ambient, 0.5));
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);
    
    // Colored point lights for atmosphere
    const lightColors = [colors.railGlow, colors.playerGlow, 0xff00ff, 0x00ffff];
    for (let i = 0; i < 8; i++) {
      const light = new THREE.PointLight(lightColors[i % lightColors.length], 0.6, 40);
      light.position.set(
        (Math.random() - 0.5) * 50,
        5 + Math.random() * 15,
        -30 - Math.random() * 60
      );
      scene.add(light);
    }
    
    // Create enhanced player (hoverboard rider)
    const playerGroup = new THREE.Group();
    
    // Hoverboard - sleek design
    const boardShape = new THREE.Shape();
    boardShape.moveTo(-0.4, 0);
    boardShape.bezierCurveTo(-0.4, 0.1, 0.4, 0.1, 0.4, 0);
    boardShape.bezierCurveTo(0.4, -0.1, -0.4, -0.1, -0.4, 0);
    
    const boardGeometry = new THREE.ExtrudeGeometry(boardShape, { 
      depth: 1.8, 
      bevelEnabled: true, 
      bevelThickness: 0.08, 
      bevelSize: 0.08,
      curveSegments: 32 // Higher quality curves for better graphics
    });
    boardGeometry.rotateX(Math.PI / 2);
    boardGeometry.translate(0, 0, -0.8);
    
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.castShadow = true;
    playerGroup.add(board);
    
    // Rider body - stylized
    const bodyGeom = new THREE.CapsuleGeometry(0.22, 0.55, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.15,
      metalness: 0.5,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    playerGroup.add(body);
    
    // Helmet/head
    const headGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.1;
    playerGroup.add(head);
    
    // Visor
    const visorGeom = new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 1.08, 0.1);
    visor.rotation.x = Math.PI / 4;
    playerGroup.add(visor);
    
    // Engine glow underneath board
    const engineGeom = new THREE.CylinderGeometry(0.15, 0.25, 0.1, 16);
    const engineMat = new THREE.MeshBasicMaterial({ color: colors.playerGlow, transparent: true, opacity: 0.8 });
    const engine1 = new THREE.Mesh(engineGeom, engineMat);
    engine1.position.set(-0.2, -0.1, -0.4);
    playerGroup.add(engine1);
    const engine2 = engine1.clone();
    engine2.position.set(0.2, -0.1, -0.4);
    playerGroup.add(engine2);
    const engine3 = engine1.clone();
    engine3.position.set(0, -0.1, 0.4);
    playerGroup.add(engine3);
    
    // Trail effect
    const trailGeom = new THREE.ConeGeometry(0.25, 2, 12);
    const trailMat = new THREE.MeshBasicMaterial({ color: colors.playerGlow, transparent: true, opacity: 0.35 });
    const trail = new THREE.Mesh(trailGeom, trailMat);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 1.5;
    trail.position.y = 0;
    playerGroup.add(trail);
    
    playerGroup.position.set(0, 0.5, 0);
    scene.add(playerGroup);
    playerRef.current = playerGroup;
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate initial rails
    railsRef.current = generateRails(scene, rngRef.current);
    currentRailRef.current = railsRef.current[0];
    
    // Add obstacles and collectibles
    railsRef.current.forEach((rail, index) => {
      if (index > 0 && rngRef.current) {
        const numObstacles = rngRef.current.nextInt(1, 2);
        for (let i = 0; i < numObstacles; i++) {
          const pos = 0.25 + rngRef.current.next() * 0.5;
          spawnObstacle(rail, pos, scene);
        }
        const numCollectibles = rngRef.current.nextInt(2, 4);
        for (let i = 0; i < numCollectibles; i++) {
          const pos = 0.1 + rngRef.current.next() * 0.8;
          spawnCollectible(rail, pos, scene);
        }
      }
    });
    
    return { scene, camera, renderer };
  }, [getThemeColors, generateRails, spawnObstacle, spawnCollectible]);

    // Handle jump (now with double jump!) - Improved jumping mechanics
  const handleJump = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    // Check if we can jump
    if (jumpsRemainingRef.current <= 0) return;
    
    // Use a jump
    jumpsRemainingRef.current--;
    setJumpsRemaining(jumpsRemainingRef.current);
    
    // Start or boost jump - improved jump mechanics
    if (!isJumpingRef.current) {
      isJumpingRef.current = true;
      jumpHeightRef.current = 0;
    } else {
      // Double jump - reset jump progress for extra height (more responsive)
      jumpHeightRef.current = Math.max(0.1, jumpHeightRef.current - 0.4); // More responsive double jump
    }
    
    const points = jumpsRemainingRef.current === 0 ? 50 : 25;
    styleRef.current += points * multiplierRef.current;
    setStylePoints(styleRef.current);
    
    if (rendererRef.current && playerRef.current && cameraRef.current) {
      const vector = playerRef.current.position.clone();
      vector.project(cameraRef.current);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
      addFloatingScore(
        jumpsRemainingRef.current === 0 ? `+${points * multiplierRef.current} DOUBLE JUMP! 🔥` : `+${points * multiplierRef.current} JUMP!`, 
        x, y, 
        jumpsRemainingRef.current === 0 ? '#ff00ff' : '#00ffff'
      );
    }
  }, [addFloatingScore]);

  // Handle flip
  const handleFlip = useCallback(() => {
    if (!gameActiveRef.current || !isJumpingRef.current || isFlipping) return;
    
    setIsFlipping(true);
    setFlipsPerformed(prev => prev + 1);
    
    const points = 100 * multiplierRef.current;
    styleRef.current += points;
    setStylePoints(styleRef.current);
    scoreRef.current += points;
    setScore(scoreRef.current);
    
    if (rendererRef.current && playerRef.current && cameraRef.current) {
      const vector = playerRef.current.position.clone();
      vector.project(cameraRef.current);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
      addFloatingScore(`+${points} FLIP! 🔄`, x, y, '#ff00ff');
    }
  }, [isFlipping, addFloatingScore]);

  // Handle destroy ability
  const handleDestroy = useCallback(() => {
    if (!gameActiveRef.current || !destroyReadyRef.current || !currentRailRef.current) return;
    
    // Find nearby breakable obstacles
    let destroyed = false;
    obstaclesRef.current = obstaclesRef.current.filter(obstacle => {
      if (obstacle.type !== 'breakable' || obstacle.rail !== currentRailRef.current) return true;
      
      const distToObstacle = Math.abs(railProgressRef.current - obstacle.position);
      if (distToObstacle < 0.2) {
        // Destroy it!
        if (sceneRef.current) {
          // Explosion effect
          const explosionGeom = new THREE.SphereGeometry(1.5, 16, 16);
          const explosionMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff88, 
            transparent: true, 
            opacity: 0.8 
          });
          const explosion = new THREE.Mesh(explosionGeom, explosionMat);
          explosion.position.copy(obstacle.mesh.position);
          sceneRef.current.add(explosion);
          
          // Animate explosion
          let scale = 1;
          const explodeInterval = setInterval(() => {
            scale += 0.15;
            explosion.scale.setScalar(scale);
            (explosion.material as THREE.MeshBasicMaterial).opacity -= 0.1;
            if (scale > 2.5) {
              clearInterval(explodeInterval);
              sceneRef.current?.remove(explosion);
            }
          }, 30);
          
          sceneRef.current.remove(obstacle.mesh);
        }
        
        destroyed = true;
        setObstaclesDestroyed(prev => prev + 1);
        
        const points = 150 * multiplierRef.current;
        scoreRef.current += points;
        setScore(scoreRef.current);
        
        if (cameraRef.current && playerRef.current) {
          const vector = playerRef.current.position.clone();
          vector.project(cameraRef.current);
          const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
          addFloatingScore(`+${points} DESTROYED! 💥`, x, y, '#00ff88');
        }
        
        return false;
      }
      return true;
    });
    
    if (destroyed) {
      // Start cooldown
      destroyReadyRef.current = false;
      setDestroyReady(false);
      destroyCooldownRef.current = DESTROY_COOLDOWN;
    }
  }, [addFloatingScore]);

  // End game
  const endGame = useCallback(async (reason?: string) => {
    gameActiveRef.current = false;
    setGameState('gameover');
    audioRef.current?.pause();
    
    const finalScore = scoreRef.current + Math.floor(speedRef.current * 100) + railsCompleted * 50;
    setScore(finalScore);
    
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'neon-rail-runner',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: { railsCompleted, flipsPerformed, perfectJumps, obstaclesDestroyed, maxSpeed: speedRef.current, stylePoints: styleRef.current, theme }
        });
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, railsCompleted, flipsPerformed, perfectJumps, obstaclesDestroyed, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const delta = clockRef.current.getDelta();
    
    if (!currentRailRef.current || !playerRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    // Update destroy cooldown
    if (!destroyReadyRef.current) {
      destroyCooldownRef.current -= delta * 1000;
      if (destroyCooldownRef.current <= 0) {
        destroyReadyRef.current = true;
        setDestroyReady(true);
      }
    }
    
    // Move along rail
    const moveSpeed = 0.006 * speedRef.current;
    railProgressRef.current += moveSpeed;
    
    // Handle jumping physics with smooth arc - improved jump height and responsiveness
    if (isJumpingRef.current) {
      const jumpPhase = Math.sin(jumpHeightRef.current * Math.PI);
      const maxHeight = jumpsRemainingRef.current === 0 ? 5.5 : 4.0; // Higher for double jump, more noticeable
      playerRef.current.position.y = 0.5 + jumpPhase * maxHeight;
      jumpHeightRef.current += 0.04; // Slightly faster jump animation for better responsiveness
      
      // Smooth flip rotation
      if (isFlipping) {
        flipRotationRef.current += 0.2;
        playerRef.current.rotation.x = flipRotationRef.current;
      }
      
      if (jumpHeightRef.current >= 1) {
        isJumpingRef.current = false;
        setIsFlipping(false);
        playerRef.current.position.y = 0.5;
        playerRef.current.rotation.x = 0;
        flipRotationRef.current = 0;
        jumpsRemainingRef.current = 2; // Reset jumps on landing
        setJumpsRemaining(2);
        
        if (railProgressRef.current > 0.9) {
          setPerfectJumps(prev => prev + 1);
          const bonus = 200 * multiplierRef.current;
          scoreRef.current += bonus;
          setScore(scoreRef.current);
          
          if (cameraRef.current) {
            const vector = playerRef.current.position.clone();
            vector.project(cameraRef.current);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
            addFloatingScore(`+${bonus} PERFECT LANDING! ⭐`, x, y, '#ffd700');
          }
        }
      }
    }
    
    // Position player on rail
    const currentRail = currentRailRef.current;
    const railPoint = currentRail.startPos.clone().lerp(currentRail.endPos, Math.min(railProgressRef.current, 1));
    
    if (!isJumpingRef.current) {
      playerRef.current.position.copy(railPoint);
      playerRef.current.position.y += 0.5;
      
      // Smooth tilt based on rail direction
      const direction = currentRail.endPos.clone().sub(currentRail.startPos).normalize();
      playerRef.current.rotation.z = -direction.x * 0.3;
    } else {
      playerRef.current.position.x = railPoint.x;
      playerRef.current.position.z = railPoint.z;
    }
    
    // Face direction of travel
    const direction = currentRail.endPos.clone().sub(currentRail.startPos).normalize();
    const targetRotY = Math.atan2(direction.x, direction.z);
    playerRef.current.rotation.y += (targetRotY - playerRef.current.rotation.y) * 0.1;
    
    // Rail end - transition
    if (railProgressRef.current >= 1) {
      railIndexRef.current++;
      setRailsCompleted(railIndexRef.current);
      
      const railPoints = 100 * multiplierRef.current;
      scoreRef.current += railPoints;
      setScore(scoreRef.current);
      
      speedRef.current = Math.min(3, speedRef.current + 0.04);
      setSpeed(speedRef.current);
      
      if (railIndexRef.current >= railsRef.current.length) {
        if (sceneRef.current && rngRef.current) {
          const lastRail = railsRef.current[railsRef.current.length - 1];
          const newRails = generateRails(sceneRef.current, rngRef.current, lastRail.endPos);
          
          newRails.forEach(rail => {
            if (rngRef.current && sceneRef.current) {
              const numObstacles = rngRef.current.nextInt(1, 2);
              for (let i = 0; i < numObstacles; i++) {
                spawnObstacle(rail, 0.25 + rngRef.current.next() * 0.5, sceneRef.current);
              }
              const numCollectibles = rngRef.current.nextInt(2, 4);
              for (let i = 0; i < numCollectibles; i++) {
                spawnCollectible(rail, 0.1 + rngRef.current.next() * 0.8, sceneRef.current);
              }
            }
          });
          
          railsRef.current = [...railsRef.current, ...newRails];
        }
      }
      
      currentRailRef.current = railsRef.current[railIndexRef.current];
      railProgressRef.current = 0;
    }
    
    // Check obstacle collisions (skip if jumping high enough or breakable)
    if (!isJumpingRef.current || jumpHeightRef.current < 0.2 || jumpHeightRef.current > 0.8) {
      for (const obstacle of obstaclesRef.current) {
        if (obstacle.rail === currentRailRef.current && obstacle.type !== 'breakable') {
          const distToObstacle = Math.abs(railProgressRef.current - obstacle.position);
          if (distToObstacle < 0.04 && !isJumpingRef.current) {
            endGame('Hit an obstacle!');
            return;
          }
        }
      }
    }
    
    // Check collectible collisions
    for (const collectible of collectiblesRef.current) {
      if (collectible.collected) continue;
      if (collectible.rail === currentRailRef.current) {
        const distToCollectible = Math.abs(railProgressRef.current - collectible.position);
        if (distToCollectible < 0.12) {
          collectible.collected = true;
          sceneRef.current?.remove(collectible.mesh);
          
          let points = 0;
          let text = '';
          
          switch (collectible.type) {
            case 'star':
              points = 50 * multiplierRef.current;
              text = `+${points} ⭐`;
              break;
            case 'boost':
              speedRef.current = Math.min(3, speedRef.current + 0.25);
              setSpeed(speedRef.current);
              points = 75;
              text = `+${points} BOOST! 🚀`;
              break;
            case 'multiplier':
              multiplierRef.current = Math.min(5, multiplierRef.current + 0.5);
              setMultiplier(multiplierRef.current);
              points = 100;
              text = `${multiplierRef.current}x MULTI! 🔥`;
              break;
          }
          
          scoreRef.current += points;
          setScore(scoreRef.current);
          
          if (cameraRef.current && playerRef.current) {
            const vector = playerRef.current.position.clone();
            vector.project(cameraRef.current);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
            addFloatingScore(text, x, y, '#ffff00');
          }
        }
      }
    }
    
    // Animate collectibles
    collectiblesRef.current.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.y += 0.04;
        c.mesh.position.y += Math.sin(Date.now() * 0.004) * 0.008;
      }
    });
    
    // Animate obstacles
    obstaclesRef.current.forEach(o => {
      o.mesh.rotation.y += o.type === 'breakable' ? 0.03 : 0.015;
      if (o.type === 'breakable') {
        const pulse = Math.sin(Date.now() * 0.006) * 0.15 + 1;
        o.mesh.scale.setScalar(pulse);
      }
    });
    
    // ENHANCED CAMERA - smooth cinematic follow
    if (cameraRef.current && playerRef.current) {
      // Dynamic camera offset based on speed and jumping
      const speedFactor = speedRef.current / 3;
      const jumpOffset = isJumpingRef.current ? jumpHeightRef.current * 3 : 0;
      
      // Camera position: behind and above player, more dynamic
      const cameraDistance = 8 + speedFactor * 3;
      const cameraHeight = 4 + speedFactor * 2 + jumpOffset;
      
      cameraTargetRef.current.set(
        playerRef.current.position.x - direction.x * cameraDistance * 0.3,
        playerRef.current.position.y + cameraHeight,
        playerRef.current.position.z + cameraDistance * 0.8
      );
      
      // Smooth camera movement
      cameraRef.current.position.lerp(cameraTargetRef.current, 0.04);
      
      // Look ahead of player
      cameraLookAtRef.current.set(
        playerRef.current.position.x + direction.x * 8,
        playerRef.current.position.y + 1,
        playerRef.current.position.z + direction.z * 8 - 10
      );
      
      cameraRef.current.lookAt(cameraLookAtRef.current);
      
      // Slight camera shake at high speed
      if (speedRef.current > 2) {
        const shake = (speedRef.current - 2) * 0.02;
        cameraRef.current.position.x += (Math.random() - 0.5) * shake;
        cameraRef.current.position.y += (Math.random() - 0.5) * shake * 0.5;
      }
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [generateRails, spawnObstacle, spawnCollectible, isFlipping, addFloatingScore, endGame]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame('Time\'s up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, endGame]);

  // Input handlers
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }
      if ((e.code === 'KeyF' || e.code === 'ArrowDown') && isJumpingRef.current) {
        e.preventDefault();
        handleFlip();
      }
      if (e.code === 'KeyE' || e.code === 'ShiftLeft') {
        e.preventDefault();
        handleDestroy();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleJump, handleFlip, handleDestroy]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setStylePoints(0);
    setSpeed(1);
    setRailsCompleted(0);
    setFlipsPerformed(0);
    setPerfectJumps(0);
    setObstaclesDestroyed(0);
    setMultiplier(1);
    setTimeLeft(90);
    setJumpsRemaining(2);
    setDestroyReady(true);
    
    scoreRef.current = 0;
    styleRef.current = 0;
    speedRef.current = 1;
    multiplierRef.current = 1;
    railProgressRef.current = 0;
    railIndexRef.current = 0;
    isJumpingRef.current = false;
    jumpsRemainingRef.current = 2;
    destroyReadyRef.current = true;
    destroyCooldownRef.current = 0;
    
    clockRef.current.start();
    gameActiveRef.current = true;
    
    if (playerRef.current && railsRef.current[0]) {
      playerRef.current.position.copy(railsRef.current[0].startPos);
      playerRef.current.position.y += 0.5;
    }
    currentRailRef.current = railsRef.current[0];
    
    gameLoop();
  }, [gameLoop]);

  // Initialize
  useEffect(() => {
    if (gameState === 'instructions') initScene();
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        try { containerRef.current.removeChild(rendererRef.current.domElement); } catch {}
        rendererRef.current.dispose();
      }
      audioRef.current?.pause();
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          <div className="absolute top-0 left-0 right-0 p-2 md:p-4 pointer-events-none">
            <div className="flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-white/10">
                <div className="text-xl md:text-2xl font-bold text-cyan-400">{score.toLocaleString()}</div>
                <div className="text-[10px] md:text-xs text-gray-400">SCORE</div>
                <div className="text-xs md:text-sm text-purple-400 mt-1">Style: {stylePoints}</div>
                {multiplier > 1 && (
                  <div className="text-yellow-400 font-bold animate-pulse">{multiplier.toFixed(1)}x</div>
                )}
              </div>
              
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 md:px-4 py-1 md:py-2 border border-white/10 text-center">
                <div className={`text-2xl md:text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {timeLeft}s
                </div>
                <div className="text-xs md:text-sm text-green-400">Speed: {speed.toFixed(1)}x</div>
              </div>
              
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-white/10 text-right">
                <div className="text-base md:text-lg font-bold text-white">{railsCompleted} rails</div>
                <div className="text-xs md:text-sm text-purple-400">{flipsPerformed} flips</div>
                <div className="text-[10px] md:text-xs text-green-400">{obstaclesDestroyed} destroyed</div>
              </div>
            </div>
          </div>
          
          {/* Jump & Ability indicators */}
          <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 flex gap-3 md:gap-4 pointer-events-none">
            {/* Jump charges */}
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-cyan-500/50 flex gap-2">
              {[0, 1].map(i => (
                <div key={i} className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 ${i < jumpsRemaining ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-700 border-gray-600'}`} />
              ))}
              <span className="text-[10px] md:text-xs text-cyan-400 ml-1">JUMPS</span>
            </div>
            
            {/* Destroy ability */}
            <div className={`bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border ${destroyReady ? 'border-green-500/50' : 'border-gray-500/50'}`}>
              <span className={`text-sm md:text-base font-bold ${destroyReady ? 'text-green-400' : 'text-gray-500'}`}>
                💥 {destroyReady ? 'READY' : 'COOLDOWN'}
              </span>
            </div>
          </div>
          
          {/* Mobile controls */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-around md:hidden pointer-events-auto">
            <button 
              onTouchStart={(e) => { e.preventDefault(); handleJump(); }}
              className="w-16 h-16 rounded-full bg-cyan-600/80 border-2 border-white/40 flex items-center justify-center text-white font-bold active:scale-90 touch-none"
            >
              ⬆️<br/><span className="text-[10px]">{jumpsRemaining}</span>
            </button>
            <button 
              onTouchStart={(e) => { e.preventDefault(); handleFlip(); }}
              className="w-16 h-16 rounded-full bg-purple-600/80 border-2 border-white/40 flex items-center justify-center text-white font-bold active:scale-90 touch-none"
            >
              🔄
            </button>
            <button 
              onTouchStart={(e) => { e.preventDefault(); handleDestroy(); }}
              disabled={!destroyReady}
              className={`w-16 h-16 rounded-full border-2 border-white/40 flex items-center justify-center text-white font-bold active:scale-90 touch-none ${destroyReady ? 'bg-green-600/80' : 'bg-gray-600/50'}`}
            >
              💥
            </button>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block pointer-events-none">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
              <div className="text-xs text-gray-400 text-center">
                SPACE: Jump (x2) • F: Flip • E: Destroy breakable crystals 💎
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Floating Scores */}
      {floatingScores.map(fs => (
        <div key={fs.id} className="absolute pointer-events-none font-bold text-lg md:text-xl"
          style={{ left: fs.x, top: fs.y, color: fs.color, transform: 'translate(-50%, -50%)', textShadow: '0 0 10px currentColor', animation: 'floatUp 1.5s ease-out forwards' }}>
          {fs.text}
        </div>
      ))}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-4 md:p-6 max-w-md w-full text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 mb-4">🛹 Neon Rail Runner</h1>
            
            <div className="space-y-3 text-left text-gray-300 mb-6 text-sm md:text-base">
              <div className="flex items-start gap-3">
                <span className="text-xl">🏃</span>
                <div><div className="font-bold text-white">Grind Rails</div><div className="text-xs md:text-sm">Auto-grind through neon rails!</div></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⬆️</span>
                <div><div className="font-bold text-cyan-400">DOUBLE JUMP!</div><div className="text-xs md:text-sm">Press SPACE twice for extra height!</div></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🔄</span>
                <div><div className="font-bold text-white">Flip for Style</div><div className="text-xs md:text-sm">Press F while jumping!</div></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">💥</span>
                <div><div className="font-bold text-green-400">DESTROY Crystals!</div><div className="text-xs md:text-sm">Press E near green crystals to destroy them!</div></div>
              </div>
            </div>
            
            <button onClick={startGame}
              className="w-full py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25">
              START GRINDING
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-4 md:p-6 max-w-md w-full text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Run Complete!</h2>
            <div className="text-4xl md:text-5xl font-bold text-cyan-400 my-4 md:my-6">{score.toLocaleString()}</div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-left mb-4 md:mb-6">
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Rails</div><div className="text-xl md:text-2xl font-bold text-white">{railsCompleted}</div></div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Style</div><div className="text-xl md:text-2xl font-bold text-purple-400">{stylePoints}</div></div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Flips</div><div className="text-xl md:text-2xl font-bold text-pink-400">{flipsPerformed}</div></div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Destroyed</div><div className="text-xl md:text-2xl font-bold text-green-400">{obstaclesDestroyed}</div></div>
            </div>
            
            <div className="flex gap-2 md:gap-3">
              <button onClick={startGame} className="flex-1 py-2 md:py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all">Play Again</button>
              <button onClick={() => window.location.href = '/games'} className="flex-1 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">Exit</button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes floatUp { 0% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); } }
      `}</style>
    </div>
  );
}
