'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// ONE SHOT ARENA
// ============================================================================
// Core Mechanic: Player gets ONE projectile per round
// Must bank, ricochet, or curve it to hit targets in a 3D room
// Identical arena for all players - perfect fairness
// Scoring: Distance, precision, speed, ricochet bonuses
// ============================================================================

interface OneShotArenaGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface Target {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  center: THREE.Mesh;
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  hit: boolean;
  points: number;
  size: number;
  // Movement patterns
  moveType: 'static' | 'horizontal' | 'vertical' | 'circular' | 'zigzag';
  moveSpeed: number;
  movePhase: number;
  moveRadius: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  trail: THREE.Points;
  ricochets: number;
  active: boolean;
  sparks: THREE.Points[];
  tracerLine: THREE.Line;
}

interface RicochetSpark {
  mesh: THREE.Points;
  life: number;
  velocity: THREE.Vector3;
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

export default function OneShotArenaGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: OneShotArenaGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'aiming' | 'flying' | 'result' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(10);
  const [targetsHit, setTargetsHit] = useState(0);
  const [totalRicochets, setTotalRicochets] = useState(0);
  const [perfectShots, setPerfectShots] = useState(0);
  const [aimAngle, setAimAngle] = useState({ x: 0, y: 0 });
  const [power, setPower] = useState(80);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [roundScore, setRoundScore] = useState(0);
  
  // Sniper mechanics
  const [isScoped, setIsScoped] = useState(false);
  const [breathHold, setBreathHold] = useState(100); // Stamina for steady aim
  const [holdingBreath, setHoldingBreath] = useState(false);
  const [precision, setPrecision] = useState(100);
  const [wind, setWind] = useState({ x: 0, z: 0, strength: 0 });
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetsRef = useRef<Target[]>([]);
  const projectileRef = useRef<Projectile | null>(null);
  const launcherRef = useRef<THREE.Group | null>(null);
  const aimLineRef = useRef<THREE.Line | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const flagRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const arenaRef = useRef<THREE.Group | null>(null);
  const sparksRef = useRef<RicochetSpark[]>([]);
  const swayRef = useRef({ x: 0, y: 0 });
  const swayTimeRef = useRef(0);
  const breathRef = useRef(100);
  const scopeZoomRef = useRef(1);
  
  // Arena dimensions
  const ARENA_WIDTH = 20;
  const ARENA_HEIGHT = 12;
  const ARENA_DEPTH = 25;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          wall: 0x2d1b4e,
          floor: 0x1a0a2e,
          target: 0xff6600,
          targetGlow: 0xff9900,
          projectile: 0x00ff88,
          projectileGlow: 0x00ffaa,
          launcher: 0x9b59b6,
          aimLine: 0xff6600,
          ambient: 0x4a1a6b
        };
      case 'christmas':
        return {
          background: 0x001122,
          wall: 0x1e5631,
          floor: 0x0a2818,
          target: 0xff0000,
          targetGlow: 0xff4444,
          projectile: 0xffd700,
          projectileGlow: 0xffec8b,
          launcher: 0x00ff00,
          aimLine: 0xffd700,
          ambient: 0x1e5631
        };
      default:
        return {
          background: 0x050515,
          wall: 0x1a1a3a,
          floor: 0x0a0a1a,
          target: 0xff3366,
          targetGlow: 0xff6699,
          projectile: 0x00ffff,
          projectileGlow: 0x00ccff,
          launcher: 0x6c5ce7,
          aimLine: 0x00ffff,
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
    }, 2000);
  }, []);

  // Create ricochet sparks
  const createRicochetSparks = useCallback((position: THREE.Vector3, normal: THREE.Vector3, scene: THREE.Scene) => {
    const colors = getThemeColors();
    const numParticles = 20;
    const positions = new Float32Array(numParticles * 3);
    const velocities: THREE.Vector3[] = [];
    
    for (let i = 0; i < numParticles; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      
      // Spread sparks in reflection direction
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5 + normal.x * 0.3,
        (Math.random() - 0.5) * 0.5 + normal.y * 0.3,
        (Math.random() - 0.5) * 0.5 + normal.z * 0.3
      );
      velocities.push(spread);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: colors.projectileGlow,
      size: 0.15,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    
    const sparks = new THREE.Points(geometry, material);
    scene.add(sparks);
    
    sparksRef.current.push({
      mesh: sparks,
      life: 1,
      velocity: velocities[0]
    });
    
    // Auto-remove after animation
    setTimeout(() => {
      scene.remove(sparks);
      sparksRef.current = sparksRef.current.filter(s => s.mesh !== sparks);
    }, 500);
  }, [getThemeColors]);

  // Create target with movement
  const createTarget = useCallback((position: THREE.Vector3, size: number, points: number, scene: THREE.Scene, roundNum: number): Target => {
    const colors = getThemeColors();
    
    // Target group for easier movement
    const targetGroup = new THREE.Group();
    
    // Outer ring
    const outerRingGeo = new THREE.TorusGeometry(size, size * 0.08, 16, 32);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: colors.target,
      emissive: colors.target,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.3
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    targetGroup.add(outerRing);
    
    // Middle ring
    const midRingGeo = new THREE.TorusGeometry(size * 0.65, size * 0.06, 16, 32);
    const midRingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.2
    });
    const midRing = new THREE.Mesh(midRingGeo, midRingMat);
    targetGroup.add(midRing);
    
    // Inner ring
    const innerRingGeo = new THREE.TorusGeometry(size * 0.35, size * 0.05, 16, 32);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: colors.target,
      emissive: colors.target,
      emissiveIntensity: 0.5
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    targetGroup.add(innerRing);
    
    // Center bullseye (perfect hit zone)
    const centerGeometry = new THREE.SphereGeometry(size * 0.15, 16, 16);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    targetGroup.add(center);
    
    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.targetGlow,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    targetGroup.position.copy(position);
    targetGroup.lookAt(0, position.y, ARENA_DEPTH / 2);
    scene.add(targetGroup);
    scene.add(glow);
    glow.position.copy(position);
    
    // Determine movement pattern based on round
    const moveTypes: Array<'static' | 'horizontal' | 'vertical' | 'circular' | 'zigzag'> = 
      ['static', 'horizontal', 'vertical', 'circular', 'zigzag'];
    const moveChance = Math.min(0.7, roundNum * 0.1); // More moving targets in later rounds
    const moveType = Math.random() < moveChance ? moveTypes[Math.floor(Math.random() * moveTypes.length)] : 'static';
    const moveSpeed = 0.5 + Math.random() * 1.5;
    
    return {
      mesh: targetGroup as unknown as THREE.Mesh,
      glow,
      center,
      position: position.clone(),
      basePosition: position.clone(),
      hit: false,
      points,
      size,
      moveType,
      moveSpeed,
      movePhase: Math.random() * Math.PI * 2,
      moveRadius: 1.5 + Math.random() * 2
    };
  }, [getThemeColors]);

  // Create arena
  const createArena = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const arena = new THREE.Group();
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_DEPTH);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: colors.floor,
      metalness: 0.3,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    arena.add(floor);
    
    // Ceiling
    const ceiling = floor.clone();
    ceiling.position.y = ARENA_HEIGHT;
    ceiling.rotation.x = Math.PI / 2;
    arena.add(ceiling);
    
    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: colors.wall,
      metalness: 0.2,
      roughness: 0.7
    });
    
    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(ARENA_DEPTH, ARENA_HEIGHT);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 0);
    arena.add(leftWall);
    
    // Right wall
    const rightWall = leftWall.clone();
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 0);
    arena.add(rightWall);
    
    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_HEIGHT);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, ARENA_HEIGHT / 2, -ARENA_DEPTH / 2);
    arena.add(backWall);
    
    // Grid lines on floor
    const gridHelper = new THREE.GridHelper(Math.max(ARENA_WIDTH, ARENA_DEPTH), 20, 0x333366, 0x222244);
    arena.add(gridHelper);
    
    scene.add(arena);
    return arena;
  }, [getThemeColors]);

  // Create launcher
  const createLauncher = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const launcher = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.5, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: colors.launcher,
      metalness: 0.6,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    launcher.add(base);
    
    // Cannon barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: colors.launcher,
      emissive: colors.projectileGlow,
      emissiveIntensity: 0.2,
      metalness: 0.8,
      roughness: 0.2
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.y = 0.5;
    barrel.rotation.x = -Math.PI / 4; // Default angle
    launcher.add(barrel);
    
    // Glow ring
    const glowGeometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.projectileGlow,
      transparent: true,
      opacity: 0.5
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 1;
    glow.rotation.x = Math.PI / 2;
    launcher.add(glow);
    
    launcher.position.set(0, 0.5, ARENA_DEPTH / 2 - 2);
    scene.add(launcher);
    
    return launcher;
  }, [getThemeColors]);

  // Create aim line
  const createAimLine = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -10)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: colors.aimLine,
      transparent: true,
      opacity: 0.7
    });
    
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    
    return line;
  }, [getThemeColors]);

  // Create wind flag
  const createWindFlag = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const flagGroup = new THREE.Group();
    
    // Flag pole
    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.5,
      roughness: 0.5
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 1.5;
    flagGroup.add(pole);
    
    // Flag cloth (plane with subdivisions for animation)
    const flagGeometry = new THREE.PlaneGeometry(1.5, 1, 10, 6);
    const flagMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0.75, 2.5, 0);
    flagGroup.add(flag);
    
    // Position flag at top of arena
    flagGroup.position.set(0, ARENA_HEIGHT - 1, -ARENA_DEPTH / 2 + 1);
    scene.add(flagGroup);
    
    return flagGroup;
  }, []);

  // Create trajectory prediction line
  const createTrajectoryLine = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: colors.projectileGlow,
      transparent: true,
      opacity: 0.5,
      linewidth: 2,
      dashed: true
    });
    
    const line = new THREE.Line(geometry, material);
    line.visible = false;
    scene.add(line);
    
    return line;
  }, [getThemeColors]);

  // Generate targets for round
  const generateTargets = useCallback((scene: THREE.Scene, rng: SeededRandom, roundNum: number) => {
    // Clear old targets
    targetsRef.current.forEach(t => {
      scene.remove(t.mesh);
      scene.remove(t.glow);
    });
    targetsRef.current = [];
    
    // Number of targets increases with rounds
    const numTargets = Math.min(2 + Math.floor(roundNum / 2), 6);
    
    for (let i = 0; i < numTargets; i++) {
      // Random position in arena (away from launcher)
      const x = (rng.next() - 0.5) * (ARENA_WIDTH - 6);
      const y = 2 + rng.next() * (ARENA_HEIGHT - 5);
      const z = -rng.next() * (ARENA_DEPTH - 10) - 5;
      
      const position = new THREE.Vector3(x, y, z);
      
      // Size and points - smaller = more points, further = more points
      const size = 0.4 + rng.next() * 0.6;
      const distanceBonus = Math.abs(z) / 5;
      const points = Math.floor((250 / size) + distanceBonus * 50);
      
      const target = createTarget(position, size, points, scene, roundNum);
      targetsRef.current.push(target);
    }
    
    // Generate wind for this round
    const windAngle = rng.next() * Math.PI * 2;
    const windStrength = roundNum > 3 ? rng.next() * 0.003 * Math.min(roundNum / 3, 2) : 0;
    setWind({
      x: Math.cos(windAngle) * windStrength,
      z: Math.sin(windAngle) * windStrength,
      strength: windStrength * 1000
    });
  }, [createTarget]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) {
      console.warn('Container ref not available for initScene');
      return;
    }
    
    // Clean up existing scene if it exists
    if (rendererRef.current && containerRef.current) {
      try {
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (sceneRef.current) {
      // Clean up existing scene objects
      while (sceneRef.current.children.length > 0) {
        const child = sceneRef.current.children[0];
        sceneRef.current.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      }
    }
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 20, 60);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 8, ARENA_DEPTH / 2 + 5);
    camera.lookAt(0, 4, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Point lights for atmosphere
    const pointLight1 = new THREE.PointLight(colors.targetGlow, 0.5, 30);
    pointLight1.position.set(-5, 8, -10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(colors.projectileGlow, 0.5, 30);
    pointLight2.position.set(5, 8, -10);
    scene.add(pointLight2);
    
    // Create arena
    arenaRef.current = createArena(scene);
    
    // Create launcher
    launcherRef.current = createLauncher(scene);
    
    // Create aim line
    aimLineRef.current = createAimLine(scene);
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate initial targets
    generateTargets(scene, rngRef.current, 1);
    
    // Create wind flag
    flagRef.current = createWindFlag(scene);
    
    // Create trajectory prediction line
    trajectoryLineRef.current = createTrajectoryLine(scene);
    
    return { scene, camera, renderer };
  }, [getThemeColors, createArena, createLauncher, createAimLine, generateTargets, createWindFlag, createTrajectoryLine]);

  // Fire projectile - Sniper bullet with precision
  const fireProjectile = useCallback(() => {
    if (!sceneRef.current || !launcherRef.current) return;
    
    // ENSURE ONLY ONE SHOT - prevent multiple projectiles
    if (projectileRef.current && projectileRef.current.active) {
      return; // Already have an active projectile
    }
    
    const colors = getThemeColors();
    
    // Create bullet (elongated for sniper feel)
    const geometry = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 8);
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      emissive: colors.projectileGlow,
      emissiveIntensity: 1,
      metalness: 0.9,
      roughness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Start position at launcher
    mesh.position.copy(launcherRef.current.position);
    mesh.position.y += 1.5;
    
    // Apply current sway to aim (precision penalty if not holding breath)
    const finalAimX = aimAngle.x + (holdingBreath ? swayRef.current.x * 0.1 : swayRef.current.x);
    const finalAimY = aimAngle.y + (holdingBreath ? swayRef.current.y * 0.1 : swayRef.current.y);
    
    // Calculate velocity - power bar directly controls speed (20-100 power = 0.12-0.6 speed)
    // Power bar range: 20-100, so speed range: 0.12-0.6
    const minSpeed = 0.12;
    const maxSpeed = 0.6;
    const speed = minSpeed + (power - 20) / 80 * (maxSpeed - minSpeed);
    const velocity = new THREE.Vector3(
      Math.sin(finalAimX) * Math.cos(finalAimY) * speed,
      Math.sin(finalAimY) * speed,
      -Math.cos(finalAimX) * Math.cos(finalAimY) * speed
    );
    
    // Orient bullet in direction of travel
    mesh.lookAt(mesh.position.clone().add(velocity));
    
    sceneRef.current.add(mesh);
    
    // Tracer trail effect
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(50 * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = new THREE.PointsMaterial({
      color: colors.projectileGlow,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    sceneRef.current.add(trail);
    
    // Tracer line (sniper bullet streak)
    const tracerPoints = [new THREE.Vector3(), new THREE.Vector3()];
    const tracerGeometry = new THREE.BufferGeometry().setFromPoints(tracerPoints);
    const tracerMaterial = new THREE.LineBasicMaterial({
      color: colors.projectileGlow,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });
    const tracerLine = new THREE.Line(tracerGeometry, tracerMaterial);
    sceneRef.current.add(tracerLine);
    
    projectileRef.current = {
      mesh,
      velocity,
      trail,
      ricochets: 0,
      active: true,
      sparks: [],
      tracerLine
    };
    
    // Calculate precision score based on sway at time of shot
    const swayAmount = Math.sqrt(swayRef.current.x ** 2 + swayRef.current.y ** 2);
    const precisionScore = Math.max(0, 100 - swayAmount * 500);
    setPrecision(Math.round(precisionScore));
    
    setIsScoped(false);
    setGameState('flying');
  }, [aimAngle, power, holdingBreath, getThemeColors]);

  // Update projectile physics - Enhanced sniper bullet physics
  const updateProjectile = useCallback(() => {
    if (!projectileRef.current || !projectileRef.current.active || !sceneRef.current) return false;
    
    const proj = projectileRef.current;
    const pos = proj.mesh.position;
    const prevPos = pos.clone();
    
    // Apply gravity (bullet drop)
    proj.velocity.y -= 0.004;
    
    // Apply wind force (wind affects bullet physics continuously)
    const windForce = new THREE.Vector3(wind.x, 0, wind.z);
    proj.velocity.add(windForce.multiplyScalar(0.016)); // Apply wind per frame
    
    // Air resistance (slight drag)
    proj.velocity.multiplyScalar(0.998);
    
    // Move projectile
    pos.add(proj.velocity);
    
    // Orient bullet in direction of travel
    proj.mesh.lookAt(pos.clone().add(proj.velocity));
    
    // Check wall collisions (ricochet with sparks)
    let bounced = false;
    let bounceNormal = new THREE.Vector3();
    const bounceThreshold = 0.15; // Bullet radius
    
    // Left/Right walls - proper ricochet physics
    if (pos.x < -ARENA_WIDTH / 2 + bounceThreshold) {
      // Reflect velocity component perpendicular to wall
      const normal = new THREE.Vector3(1, 0, 0);
      const reflect = proj.velocity.clone().reflect(normal);
      proj.velocity.copy(reflect);
      proj.velocity.multiplyScalar(0.75); // Energy loss on bounce
      pos.x = -ARENA_WIDTH / 2 + bounceThreshold;
      bounceNormal.set(1, 0, 0);
      bounced = true;
    } else if (pos.x > ARENA_WIDTH / 2 - bounceThreshold) {
      const normal = new THREE.Vector3(-1, 0, 0);
      const reflect = proj.velocity.clone().reflect(normal);
      proj.velocity.copy(reflect);
      proj.velocity.multiplyScalar(0.75);
      pos.x = ARENA_WIDTH / 2 - bounceThreshold;
      bounceNormal.set(-1, 0, 0);
      bounced = true;
    }
    
    // Floor bounce - realistic physics with energy loss
    if (pos.y < bounceThreshold) {
      const normal = new THREE.Vector3(0, 1, 0);
      const reflect = proj.velocity.clone().reflect(normal);
      proj.velocity.copy(reflect);
      proj.velocity.multiplyScalar(0.65); // More energy loss on floor bounce
      pos.y = bounceThreshold;
      bounceNormal.set(0, 1, 0);
      bounced = true;
    } else if (pos.y > ARENA_HEIGHT - bounceThreshold) {
      const normal = new THREE.Vector3(0, -1, 0);
      const reflect = proj.velocity.clone().reflect(normal);
      proj.velocity.copy(reflect);
      proj.velocity.multiplyScalar(0.65);
      pos.y = ARENA_HEIGHT - bounceThreshold;
      bounceNormal.set(0, -1, 0);
      bounced = true;
    }
    
    // Back wall ricochet
    if (pos.z < -ARENA_DEPTH / 2 + bounceThreshold) {
      const normal = new THREE.Vector3(0, 0, 1);
      const reflect = proj.velocity.clone().reflect(normal);
      proj.velocity.copy(reflect);
      proj.velocity.multiplyScalar(0.7);
      pos.z = -ARENA_DEPTH / 2 + bounceThreshold;
      bounceNormal.set(0, 0, 1);
      bounced = true;
    }
    
    if (bounced) {
      proj.ricochets++;
      setTotalRicochets(prev => prev + 1);
      
      // Create ricochet sparks!
      createRicochetSparks(pos.clone(), bounceNormal, sceneRef.current);
    }
    
    // Update tracer line
    const tracerPositions = proj.tracerLine.geometry.attributes.position.array as Float32Array;
    tracerPositions[0] = prevPos.x;
    tracerPositions[1] = prevPos.y;
    tracerPositions[2] = prevPos.z;
    tracerPositions[3] = pos.x;
    tracerPositions[4] = pos.y;
    tracerPositions[5] = pos.z;
    proj.tracerLine.geometry.attributes.position.needsUpdate = true;
    
    // Check target collisions
    for (const target of targetsRef.current) {
      if (target.hit) continue;
      
      const dist = pos.distanceTo(target.position);
      if (dist < target.size + 0.15) {
        target.hit = true;
        
        setTargetsHit(prev => prev + 1);
        
        // Calculate points based on precision
        let points = target.points;
        const hitAccuracy = 1 - (dist / target.size);
        const isPerfect = dist < target.size * 0.2;
        const isGreat = dist < target.size * 0.5;
        
        // Precision multiplier
        const precisionMult = 1 + (precision / 100) * 0.5;
        points = Math.floor(points * precisionMult);
        
        if (isPerfect) {
          points *= 3;
          setPerfectShots(prev => prev + 1);
        } else if (isGreat) {
          points *= 1.5;
        }
        
        // Ricochet bonus (cumulative)
        const ricochetBonus = proj.ricochets * 100 * (proj.ricochets > 1 ? 1.5 : 1);
        points += Math.floor(ricochetBonus);
        
        // Distance bonus
        const distanceBonus = Math.floor(Math.abs(target.basePosition.z) * 5);
        points += distanceBonus;
        
        // Moving target bonus
        if (target.moveType !== 'static') {
          points = Math.floor(points * 1.3);
        }
        
        scoreRef.current += points;
        setScore(scoreRef.current);
        setRoundScore(prev => prev + points);
        
        // Visual feedback - target explodes
        target.glow.scale.setScalar(3);
        (target.glow.material as THREE.MeshBasicMaterial).opacity = 0.8;
        
        // Floating score
        if (cameraRef.current) {
          const screenPos = target.position.clone().project(cameraRef.current);
          const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
          
          let text = '';
          let color = '#00ff88';
          
          if (isPerfect) {
            text = `💥 BULLSEYE! +${points}`;
            color = '#ffd700';
          } else if (proj.ricochets > 1) {
            text = `🔄 MULTI-RICOCHET x${proj.ricochets}! +${points}`;
            color = '#ff66ff';
          } else if (proj.ricochets > 0) {
            text = `↗️ BANK SHOT! +${points}`;
            color = '#66ffff';
          } else if (target.moveType !== 'static') {
            text = `🎯 MOVING TARGET! +${points}`;
            color = '#ff9966';
          } else {
            text = `+${points}`;
          }
          
          addFloatingScore(text, x, y, color);
        }
      }
    }
    
    // Check if projectile is out of bounds or stopped
    if (pos.z > ARENA_DEPTH / 2 + 5 || proj.velocity.length() < 0.008 || proj.ricochets > 5) {
      proj.active = false;
      return false;
    }
    
    // Update trail
    const trailPositions = proj.trail.geometry.attributes.position.array as Float32Array;
    for (let i = trailPositions.length - 3; i >= 3; i -= 3) {
      trailPositions[i] = trailPositions[i - 3];
      trailPositions[i + 1] = trailPositions[i - 2];
      trailPositions[i + 2] = trailPositions[i - 1];
    }
    trailPositions[0] = pos.x;
    trailPositions[1] = pos.y;
    trailPositions[2] = pos.z;
    proj.trail.geometry.attributes.position.needsUpdate = true;
    
    return true;
  }, [addFloatingScore, createRicochetSparks, precision, wind]);

  // End round
  const endRound = useCallback(() => {
    setGameState('result');
    
    // Check if all targets hit
    const allHit = targetsRef.current.every(t => t.hit);
    if (allHit) {
      const clearBonus = 500;
      scoreRef.current += clearBonus;
      setScore(scoreRef.current);
      setRoundScore(prev => prev + clearBonus);
    }
    
    // Auto-advance after delay
    setTimeout(() => {
      if (roundRef.current >= totalRounds) {
        endGame();
      } else {
        nextRound();
      }
    }, 2000);
  }, [totalRounds]);

  // Next round
  const nextRound = useCallback(() => {
    roundRef.current++;
    setRound(roundRef.current);
    setRoundScore(0);
    
    // Clean up projectile
    if (projectileRef.current && sceneRef.current) {
      sceneRef.current.remove(projectileRef.current.mesh);
      sceneRef.current.remove(projectileRef.current.trail);
      projectileRef.current = null;
    }
    
    // Generate new targets
    if (sceneRef.current && rngRef.current) {
      generateTargets(sceneRef.current, rngRef.current, roundRef.current);
    }
    
    // Reset aim and allow new shot
    setAimAngle({ x: 0, y: 0.3 });
    setPower(50);
    
    // Clear projectile ref to allow new shot
    projectileRef.current = null;
    
    setGameState('aiming');
  }, [generateTargets]);

  // End game
  const endGame = useCallback(async () => {
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Calculate bonuses
    const accuracyBonus = Math.floor((targetsHit / (targetsRef.current.length * totalRounds)) * 500);
    const perfectBonus = perfectShots * 100;
    const ricochetBonus = totalRicochets * 25;
    
    const finalScore = scoreRef.current + accuracyBonus + perfectBonus + ricochetBonus;
    setScore(finalScore);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'one-shot-arena',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            rounds: totalRounds,
            targetsHit,
            perfectShots,
            totalRicochets,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'one-shot-arena',
            action: 'game_complete',
            score: finalScore,
            metadata: {
              rounds: totalRounds,
              targetsHit,
              perfectShots,
              totalRicochets,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, totalRounds, targetsHit, perfectShots, totalRicochets, theme]);

  // Game loop - Enhanced with sniper mechanics
  const gameLoop = useCallback(() => {
    const time = Date.now() * 0.001;
    
    // SNIPER SWAY MECHANICS
    if (gameState === 'aiming') {
      swayTimeRef.current += 0.016;
      
      // Natural sway (breathing)
      const baseSwayX = Math.sin(swayTimeRef.current * 1.2) * 0.015 + Math.sin(swayTimeRef.current * 2.7) * 0.008;
      const baseSwayY = Math.cos(swayTimeRef.current * 0.9) * 0.012 + Math.cos(swayTimeRef.current * 2.1) * 0.006;
      
      // Reduce sway when holding breath
      const swayMult = holdingBreath ? 0.15 : 1;
      swayRef.current.x = baseSwayX * swayMult;
      swayRef.current.y = baseSwayY * swayMult;
      
      // Breath stamina
      if (holdingBreath) {
        breathRef.current = Math.max(0, breathRef.current - 0.8);
        setBreathHold(Math.round(breathRef.current));
        
        if (breathRef.current <= 0) {
          setHoldingBreath(false);
        }
      } else {
        breathRef.current = Math.min(100, breathRef.current + 0.3);
        setBreathHold(Math.round(breathRef.current));
      }
      
      // Scope zoom effect
      if (cameraRef.current) {
        const targetZoom = isScoped ? 1.8 : 1;
        scopeZoomRef.current += (targetZoom - scopeZoomRef.current) * 0.1;
        cameraRef.current.zoom = scopeZoomRef.current;
        cameraRef.current.updateProjectionMatrix();
      }
    }
    
    // Update aim line position with sway
    if (launcherRef.current && aimLineRef.current && gameState === 'aiming') {
      const start = launcherRef.current.position.clone();
      start.y += 1.5;
      
      // Apply sway to aim
      const swayedAimX = aimAngle.x + swayRef.current.x;
      const swayedAimY = aimAngle.y + swayRef.current.y;
      
      // Use same power-to-speed calculation as fireProjectile
      const minSpeed = 0.12;
      const maxSpeed = 0.6;
      const speed = minSpeed + (power - 20) / 80 * (maxSpeed - minSpeed);
      
      const direction = new THREE.Vector3(
        Math.sin(swayedAimX) * Math.cos(swayedAimY),
        Math.sin(swayedAimY),
        -Math.cos(swayedAimX) * Math.cos(swayedAimY)
      ).multiplyScalar(speed * 10); // Scale for visual line length
      
      const end = start.clone().add(direction);
      
      const positions = aimLineRef.current.geometry.attributes.position.array as Float32Array;
      positions[0] = start.x;
      positions[1] = start.y;
      positions[2] = start.z;
      positions[3] = end.x;
      positions[4] = end.y;
      positions[5] = end.z;
      aimLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update projectile
    if (gameState === 'flying') {
      const stillActive = updateProjectile();
      if (!stillActive) {
        endRound();
      }
    }
    
    // Animate targets with MOVEMENT PATTERNS
    targetsRef.current.forEach(target => {
      if (!target.hit) {
        // Rotate target ring
        target.mesh.rotation.z += 0.015;
        
        // Pulse glow
        const pulse = Math.sin(time * 3) * 0.2 + 1.2;
        target.glow.scale.setScalar(pulse);
        
        // MOVING TARGETS
        const t = time * target.moveSpeed + target.movePhase;
        let offsetX = 0, offsetY = 0, offsetZ = 0;
        
        switch (target.moveType) {
          case 'horizontal':
            offsetX = Math.sin(t) * target.moveRadius;
            break;
          case 'vertical':
            offsetY = Math.sin(t) * target.moveRadius * 0.7;
            break;
          case 'circular':
            offsetX = Math.sin(t) * target.moveRadius;
            offsetY = Math.cos(t) * target.moveRadius * 0.5;
            break;
          case 'zigzag':
            offsetX = Math.sin(t * 2) * target.moveRadius;
            offsetZ = Math.sin(t) * target.moveRadius * 0.3;
            break;
        }
        
        target.position.set(
          target.basePosition.x + offsetX,
          Math.max(1.5, Math.min(ARENA_HEIGHT - 1.5, target.basePosition.y + offsetY)),
          target.basePosition.z + offsetZ
        );
        
        target.mesh.position.copy(target.position);
        target.glow.position.copy(target.position);
        target.mesh.lookAt(0, target.position.y, ARENA_DEPTH / 2);
      } else {
        // Fade out hit targets
        const mat = target.glow.material as THREE.MeshBasicMaterial;
        mat.opacity *= 0.95;
        target.glow.scale.multiplyScalar(1.02);
      }
    });
    
    // Update ricochet sparks
    sparksRef.current.forEach(spark => {
      spark.life -= 0.05;
      const mat = spark.mesh.material as THREE.PointsMaterial;
      mat.opacity = spark.life;
    });
    
    // Animate wind flag - shows wind direction and strength
    if (flagRef.current) {
      const flag = flagRef.current.children[1] as THREE.Mesh; // Flag cloth
      if (flag && flag.geometry instanceof THREE.PlaneGeometry) {
        const windAngle = Math.atan2(wind.z, wind.x);
        flag.rotation.z = windAngle + Math.PI / 2;
        
        // Animate flag cloth with realistic wind wave effect
        const positionAttribute = flag.geometry.attributes.position;
        const count = positionAttribute.count;
        const windStrength = Math.max(0.01, wind.strength * 0.15);
        
        // Get base positions (PlaneGeometry has vertices in X-Y plane, Z=0)
        for (let i = 0; i < count; i++) {
          const x = positionAttribute.getX(i);
          const y = positionAttribute.getY(i);
          
          // Create wave effect based on wind strength and direction
          // Wave propagates along the flag based on wind direction
          const wavePhase = time * 3 + (wind.x * x + wind.z * y) * 5;
          const waveX = Math.sin(wavePhase) * windStrength * (1 - Math.abs(y) * 0.5);
          const waveY = Math.cos(wavePhase * 1.3) * windStrength * 0.2;
          
          // Apply wave offset in Z direction (perpendicular to flag plane)
          positionAttribute.setZ(i, waveX + waveY);
        }
        positionAttribute.needsUpdate = true;
        
        // Rotate flag to face wind direction
        if (wind.strength > 0) {
          const windDir = new THREE.Vector3(wind.x, 0, wind.z).normalize();
          flagRef.current.lookAt(
            flagRef.current.position.clone().add(windDir.multiplyScalar(5))
          );
        }
      }
    }
    
    // Update trajectory prediction line when aiming
    if (trajectoryLineRef.current && launcherRef.current && gameState === 'aiming') {
      const start = launcherRef.current.position.clone();
      start.y += 1.5;
      
      const finalAimX = aimAngle.x + swayRef.current.x;
      const finalAimY = aimAngle.y + swayRef.current.y;
      
      // Use same power-to-speed calculation as fireProjectile
      const minSpeed = 0.12;
      const maxSpeed = 0.6;
      const speed = minSpeed + (power - 20) / 80 * (maxSpeed - minSpeed);
      
      let velocity = new THREE.Vector3(
        Math.sin(finalAimX) * Math.cos(finalAimY) * speed,
        Math.sin(finalAimY) * speed,
        -Math.cos(finalAimX) * Math.cos(finalAimY) * speed
      );
      
      // Simulate trajectory with wind and ricochets
      const trajectoryPoints: THREE.Vector3[] = [];
      let pos = start.clone();
      let vel = velocity.clone();
      let ricochetCount = 0;
      const maxRicochets = 5;
      
      for (let i = 0; i < 200; i++) {
        trajectoryPoints.push(pos.clone());
        
        // Apply gravity
        vel.y -= 0.004;
        
        // Apply wind force (same as projectile physics)
        const windForce = new THREE.Vector3(wind.x, 0, wind.z);
        vel.add(windForce.multiplyScalar(0.016));
        
        // Air resistance
        vel.multiplyScalar(0.998);
        
        // Move
        pos.add(vel);
        
        // Check wall/floor collisions and simulate ricochets
        const bounceThreshold = 0.15;
        if (pos.x < -ARENA_WIDTH / 2 + bounceThreshold) {
          const normal = new THREE.Vector3(1, 0, 0);
          vel.reflect(normal).multiplyScalar(0.75);
          pos.x = -ARENA_WIDTH / 2 + bounceThreshold;
          ricochetCount++;
        } else if (pos.x > ARENA_WIDTH / 2 - bounceThreshold) {
          const normal = new THREE.Vector3(-1, 0, 0);
          vel.reflect(normal).multiplyScalar(0.75);
          pos.x = ARENA_WIDTH / 2 - bounceThreshold;
          ricochetCount++;
        }
        
        if (pos.y < bounceThreshold) {
          const normal = new THREE.Vector3(0, 1, 0);
          vel.reflect(normal).multiplyScalar(0.65);
          pos.y = bounceThreshold;
          ricochetCount++;
        } else if (pos.y > ARENA_HEIGHT - bounceThreshold) {
          const normal = new THREE.Vector3(0, -1, 0);
          vel.reflect(normal).multiplyScalar(0.65);
          pos.y = ARENA_HEIGHT - bounceThreshold;
          ricochetCount++;
        }
        
        if (pos.z < -ARENA_DEPTH / 2 + bounceThreshold) {
          const normal = new THREE.Vector3(0, 0, 1);
          vel.reflect(normal).multiplyScalar(0.7);
          pos.z = -ARENA_DEPTH / 2 + bounceThreshold;
          ricochetCount++;
        }
        
        // Check bounds or stop conditions
        if (pos.x < -ARENA_WIDTH / 2 || pos.x > ARENA_WIDTH / 2 ||
            pos.y < 0 || pos.y > ARENA_HEIGHT ||
            pos.z < -ARENA_DEPTH / 2 || pos.z > ARENA_DEPTH / 2 ||
            vel.length() < 0.008 || ricochetCount > maxRicochets) {
          break;
        }
      }
      
      trajectoryLineRef.current.geometry.setFromPoints(trajectoryPoints);
      trajectoryLineRef.current.visible = true;
    } else if (trajectoryLineRef.current) {
      trajectoryLineRef.current.visible = false;
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, aimAngle, power, holdingBreath, isScoped, updateProjectile, endRound, wind]);

  // Input handlers
  useEffect(() => {
    if (gameState !== 'aiming') return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((rect.bottom - e.clientY) / rect.height) * 1.5;
      
      setAimAngle({
        x: x * 0.8,
        y: Math.max(0.1, Math.min(1.2, y))
      });
    };
    
    const handleClick = () => {
      // Only fire if no active projectile exists
      if (!projectileRef.current || !projectileRef.current.active) {
        fireProjectile();
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // More responsive power changes - 2 units per scroll step
      setPower(prev => Math.max(20, Math.min(100, prev - e.deltaY * 0.2)));
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        // Only fire if no active projectile exists
        if (!projectileRef.current || !projectileRef.current.active) {
          fireProjectile();
        }
      }
      if (e.code === 'ArrowUp') setPower(prev => Math.min(100, prev + 2));
      if (e.code === 'ArrowDown') setPower(prev => Math.max(20, prev - 2));
      // Hold breath for steady aim
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (breathRef.current > 10) {
          setHoldingBreath(true);
        }
      }
      // Toggle scope
      if (e.code === 'KeyZ' || e.code === 'KeyX') {
        setIsScoped(prev => !prev);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setHoldingBreath(false);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current?.addEventListener('click', handleClick);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, fireProjectile]);

  // Touch controls
  useEffect(() => {
    if (gameState !== 'aiming') return;
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((rect.bottom - touch.clientY) / rect.height) * 1.5;
      
      setAimAngle({
        x: x * 0.8,
        y: Math.max(0.1, Math.min(1.2, y))
      });
    };
    
    const handleTouchEnd = () => {
      // Only fire if no active projectile exists
      if (!projectileRef.current || !projectileRef.current.active) {
        fireProjectile();
      }
    };
    
    containerRef.current?.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current?.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      containerRef.current?.removeEventListener('touchmove', handleTouchMove);
      containerRef.current?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, fireProjectile]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('aiming');
    setScore(0);
    setRound(1);
    setTargetsHit(0);
    setTotalRicochets(0);
    setPerfectShots(0);
    setRoundScore(0);
    setAimAngle({ x: 0, y: 0.3 });
    setPower(50);
    
    scoreRef.current = 0;
    roundRef.current = 1;
    
    // Reinitialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate targets
    if (sceneRef.current && rngRef.current) {
      generateTargets(sceneRef.current, rngRef.current, 1);
    }
    
    // Start game loop
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/one-shot-halloween.mp3' 
      : theme === 'christmas' 
        ? '/one-shot-christmas.mp3' 
        : '/one-shot.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [generateTargets, gameLoop, theme]);

  // Initialize
  useEffect(() => {
    if (gameState === 'instructions' && containerRef.current) {
      try {
        initScene();
      } catch (error) {
        console.error('Error initializing scene:', error);
      }
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          // Element may have already been removed
        }
        rendererRef.current.dispose();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [gameState, initScene]);

  // Continuous render loop
  useEffect(() => {
    if (gameState === 'instructions' || !sceneRef.current || !rendererRef.current || !cameraRef.current) {
      return;
    }
    
    let isActive = true;
    const render = () => {
      if (!isActive || !sceneRef.current || !rendererRef.current || !cameraRef.current) {
        return;
      }
      try {
        gameLoop();
        if (isActive) {
          animationRef.current = requestAnimationFrame(render);
        }
      } catch (error) {
        console.error('Error in game loop:', error);
      }
    };
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      isActive = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, gameLoop]);

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
      {(gameState === 'aiming' || gameState === 'flying' || gameState === 'result') && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
              {roundScore > 0 && (
                <div className="text-sm text-green-400 mt-1">+{roundScore}</div>
              )}
            </div>
            
            {/* Center: Round */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-3xl font-mono font-bold text-white">
                Round {round}/{totalRounds}
              </div>
              <div className="text-sm text-purple-400">
                {targetsRef.current.filter(t => !t.hit).length} targets left
              </div>
            </div>
            
            {/* Right: Stats */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{targetsHit} hits</div>
              <div className="text-sm text-yellow-400">{perfectShots} perfect</div>
              <div className="text-xs text-purple-400">{totalRicochets} ricochets</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sniper UI Panel */}
      {gameState === 'aiming' && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none space-y-3">
          {/* Power Meter */}
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-400 mb-2 text-center">POWER</div>
            <div className="w-5 h-28 bg-gray-800 rounded-full overflow-hidden relative mx-auto">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-600 via-yellow-500 to-green-400 transition-all duration-100"
                style={{ height: `${((power - 20) / 80) * 100}%` }}
              />
              {/* Power level markers */}
              <div className="absolute top-0 left-0 right-0 h-full flex flex-col justify-between py-1">
                <div className="w-full h-px bg-white/20"></div>
                <div className="w-full h-px bg-white/20"></div>
                <div className="w-full h-px bg-white/20"></div>
                <div className="w-full h-px bg-white/20"></div>
              </div>
            </div>
            <div className="text-sm font-bold text-white mt-2 text-center">{Math.round(power)}%</div>
          </div>
          
          {/* Breath/Stamina */}
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-400 mb-2 text-center">BREATH</div>
            <div className="w-5 h-20 bg-gray-800 rounded-full overflow-hidden relative mx-auto">
              <div 
                className={`absolute bottom-0 left-0 right-0 transition-all ${
                  holdingBreath ? 'bg-cyan-400' : 'bg-blue-500'
                } ${breathHold < 30 ? 'animate-pulse' : ''}`}
                style={{ height: `${breathHold}%` }}
              />
            </div>
            <div className={`text-xs font-bold mt-2 text-center ${holdingBreath ? 'text-cyan-400' : 'text-gray-400'}`}>
              {holdingBreath ? 'HOLD' : 'SHIFT'}
            </div>
          </div>
        </div>
      )}
      
      {/* Right Side Info */}
      {gameState === 'aiming' && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none space-y-3">
          {/* Wind Indicator */}
          {wind.strength > 0 && (
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-xs text-gray-400 mb-2 text-center">WIND</div>
              <div className="text-2xl text-center">
                {wind.x > 0 ? '→' : wind.x < 0 ? '←' : wind.z > 0 ? '↓' : '↑'}
              </div>
              <div className="text-sm font-bold text-yellow-400 text-center">
                {(wind.strength * 100).toFixed(1)}
              </div>
            </div>
          )}
          
          {/* Scope Toggle */}
          <div className={`bg-black/70 backdrop-blur-sm rounded-xl p-3 border transition-all ${
            isScoped ? 'border-cyan-500 bg-cyan-900/30' : 'border-white/10'
          }`}>
            <div className="text-xs text-gray-400 mb-1 text-center">SCOPE</div>
            <div className={`text-lg font-bold text-center ${isScoped ? 'text-cyan-400' : 'text-gray-500'}`}>
              {isScoped ? '🔭 ON' : 'Z KEY'}
            </div>
          </div>
        </div>
      )}
      
      {/* Crosshair / Scope Overlay */}
      {gameState === 'aiming' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`transition-all duration-200 ${isScoped ? 'scale-150' : 'scale-100'}`}>
            {/* Crosshair */}
            <div className="relative w-20 h-20">
              {/* Horizontal line */}
              <div className={`absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 transition-all ${
                holdingBreath ? 'bg-cyan-400' : 'bg-white/50'
              }`} style={{ 
                transform: `translateY(-50%) translateX(${(aimAngle.x + swayRef.current.x) * 100}px)` 
              }} />
              {/* Vertical line */}
              <div className={`absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 transition-all ${
                holdingBreath ? 'bg-cyan-400' : 'bg-white/50'
              }`} style={{ 
                transform: `translateX(-50%) translateY(${-(aimAngle.y + swayRef.current.y) * 100}px)` 
              }} />
              {/* Center dot */}
              <div className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                holdingBreath ? 'bg-cyan-400' : 'bg-red-500'
              }`} />
              {/* Scope rings when scoped */}
              {isScoped && (
                <>
                  <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full" />
                  <div className="absolute inset-4 border border-cyan-500/20 rounded-full" />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Aiming hint */}
      {gameState === 'aiming' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center space-x-3">
              <span className="hidden sm:inline">🖱️ Aim • ⚙️ Scroll=Power • ⇧ Hold Breath • Z Scope • Click/Space to Fire</span>
              <span className="sm:hidden">Drag to aim • Tap to fire!</span>
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
            animation: 'floatUp 2s ease-out forwards'
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
              🎯 One Shot Arena
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎱</span>
                <div>
                  <div className="font-bold text-white">One Shot Per Round</div>
                  <div className="text-sm">You only get ONE projectile - make it count!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">↗️</span>
                <div>
                  <div className="font-bold text-white">Bank Shots Welcome</div>
                  <div className="text-sm">Ricochet off walls for bonus points!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-white">Hit the Bullseye</div>
                  <div className="text-sm">Perfect center hits = 2x points!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-bold text-white">10 Rounds</div>
                  <div className="text-sm">Same arena layout for everyone - pure skill!</div>
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
              TAKE AIM
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Arena Complete!</h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Targets Hit</div>
                <div className="text-2xl font-bold text-white">{targetsHit}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Perfect Shots</div>
                <div className="text-2xl font-bold text-yellow-400">{perfectShots}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Ricochets</div>
                <div className="text-2xl font-bold text-purple-400">{totalRicochets}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Rounds</div>
                <div className="text-2xl font-bold text-white">{totalRounds}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Clean up and restart
                  if (projectileRef.current && sceneRef.current) {
                    sceneRef.current.remove(projectileRef.current.mesh);
                    sceneRef.current.remove(projectileRef.current.trail);
                    projectileRef.current = null;
                  }
                  startGame();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
              >
                Play Again
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
          100% { opacity: 0; transform: translate(-50%, -200%) scale(1.5); }
        }
      `}</style>
    </div>
  );
}

