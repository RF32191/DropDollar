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
  position: THREE.Vector3;
  hit: boolean;
  points: number;
  size: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  trail: THREE.Points;
  ricochets: number;
  active: boolean;
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
  const [power, setPower] = useState(50);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [roundScore, setRoundScore] = useState(0);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetsRef = useRef<Target[]>([]);
  const projectileRef = useRef<Projectile | null>(null);
  const launcherRef = useRef<THREE.Group | null>(null);
  const aimLineRef = useRef<THREE.Line | null>(null);
  const animationRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const roundRef = useRef(1);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const arenaRef = useRef<THREE.Group | null>(null);
  
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

  // Create target
  const createTarget = useCallback((position: THREE.Vector3, size: number, points: number, scene: THREE.Scene): Target => {
    const colors = getThemeColors();
    
    // Target ring
    const geometry = new THREE.TorusGeometry(size, size * 0.15, 16, 32);
    const material = new THREE.MeshStandardMaterial({
      color: colors.target,
      emissive: colors.target,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(0, position.y, 0); // Face the launcher
    scene.add(mesh);
    
    // Center bullseye
    const centerGeometry = new THREE.SphereGeometry(size * 0.3, 16, 16);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.copy(position);
    scene.add(center);
    
    // Glow
    const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.targetGlow,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);
    scene.add(glow);
    
    return {
      mesh,
      glow,
      position,
      hit: false,
      points,
      size
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

  // Generate targets for round
  const generateTargets = useCallback((scene: THREE.Scene, rng: SeededRandom, roundNum: number) => {
    // Clear old targets
    targetsRef.current.forEach(t => {
      scene.remove(t.mesh);
      scene.remove(t.glow);
    });
    targetsRef.current = [];
    
    // Number of targets increases with rounds
    const numTargets = Math.min(3 + Math.floor(roundNum / 3), 7);
    
    for (let i = 0; i < numTargets; i++) {
      // Random position in arena (away from launcher)
      const x = (rng.next() - 0.5) * (ARENA_WIDTH - 4);
      const y = 2 + rng.next() * (ARENA_HEIGHT - 4);
      const z = -rng.next() * (ARENA_DEPTH - 8) - 4;
      
      const position = new THREE.Vector3(x, y, z);
      
      // Size and points - smaller = more points
      const size = 0.5 + rng.next() * 0.8;
      const points = Math.floor(200 / size);
      
      const target = createTarget(position, size, points, scene);
      targetsRef.current.push(target);
    }
  }, [createTarget]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
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
    
    return { scene, camera, renderer };
  }, [getThemeColors, createArena, createLauncher, createAimLine, generateTargets]);

  // Fire projectile
  const fireProjectile = useCallback(() => {
    if (!sceneRef.current || !launcherRef.current) return;
    
    const colors = getThemeColors();
    
    // Create projectile
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: colors.projectile,
      emissive: colors.projectileGlow,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Start position at launcher
    mesh.position.copy(launcherRef.current.position);
    mesh.position.y += 1;
    
    // Calculate velocity from aim
    const speed = power * 0.003;
    const velocity = new THREE.Vector3(
      Math.sin(aimAngle.x) * Math.cos(aimAngle.y) * speed,
      Math.sin(aimAngle.y) * speed,
      -Math.cos(aimAngle.x) * Math.cos(aimAngle.y) * speed
    );
    
    sceneRef.current.add(mesh);
    
    // Trail effect
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(30 * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMaterial = new THREE.PointsMaterial({
      color: colors.projectileGlow,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    sceneRef.current.add(trail);
    
    projectileRef.current = {
      mesh,
      velocity,
      trail,
      ricochets: 0,
      active: true
    };
    
    setGameState('flying');
  }, [aimAngle, power, getThemeColors]);

  // Update projectile physics
  const updateProjectile = useCallback(() => {
    if (!projectileRef.current || !projectileRef.current.active) return false;
    
    const proj = projectileRef.current;
    const pos = proj.mesh.position;
    
    // Apply gravity
    proj.velocity.y -= 0.003;
    
    // Move projectile
    pos.add(proj.velocity);
    
    // Check wall collisions (ricochet)
    let bounced = false;
    
    // Left/Right walls
    if (pos.x < -ARENA_WIDTH / 2 + 0.3 || pos.x > ARENA_WIDTH / 2 - 0.3) {
      proj.velocity.x *= -0.8;
      pos.x = Math.max(-ARENA_WIDTH / 2 + 0.3, Math.min(ARENA_WIDTH / 2 - 0.3, pos.x));
      bounced = true;
    }
    
    // Floor/Ceiling
    if (pos.y < 0.3 || pos.y > ARENA_HEIGHT - 0.3) {
      proj.velocity.y *= -0.7;
      pos.y = Math.max(0.3, Math.min(ARENA_HEIGHT - 0.3, pos.y));
      bounced = true;
    }
    
    // Back wall
    if (pos.z < -ARENA_DEPTH / 2 + 0.3) {
      proj.velocity.z *= -0.8;
      pos.z = -ARENA_DEPTH / 2 + 0.3;
      bounced = true;
    }
    
    if (bounced) {
      proj.ricochets++;
      setTotalRicochets(prev => prev + 1);
    }
    
    // Check target collisions
    let hitTarget = false;
    for (const target of targetsRef.current) {
      if (target.hit) continue;
      
      const dist = pos.distanceTo(target.position);
      if (dist < target.size + 0.2) {
        target.hit = true;
        hitTarget = true;
        
        setTargetsHit(prev => prev + 1);
        
        // Calculate points
        let points = target.points;
        const isPerfect = dist < target.size * 0.3;
        
        if (isPerfect) {
          points *= 2;
          setPerfectShots(prev => prev + 1);
        }
        
        // Ricochet bonus
        const ricochetBonus = proj.ricochets * 50;
        points += ricochetBonus;
        
        scoreRef.current += points;
        setScore(scoreRef.current);
        setRoundScore(prev => prev + points);
        
        // Visual feedback
        const material = target.mesh.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x00ff00);
        material.emissiveIntensity = 1;
        
        // Floating score
        if (cameraRef.current) {
          const screenPos = target.position.clone().project(cameraRef.current);
          const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
          
          const text = isPerfect 
            ? `PERFECT! +${points}` 
            : proj.ricochets > 0 
              ? `RICOCHET x${proj.ricochets}! +${points}`
              : `+${points}`;
          
          addFloatingScore(text, x, y, isPerfect ? '#ffd700' : '#00ff88');
        }
      }
    }
    
    // Check if projectile is out of bounds or stopped
    if (pos.z > ARENA_DEPTH / 2 + 5 || proj.velocity.length() < 0.01) {
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
  }, [addFloatingScore]);

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
    
    // Reset aim
    setAimAngle({ x: 0, y: 0.3 });
    setPower(50);
    
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

  // Game loop
  const gameLoop = useCallback(() => {
    // Update aim line position
    if (launcherRef.current && aimLineRef.current && gameState === 'aiming') {
      const start = launcherRef.current.position.clone();
      start.y += 1;
      
      const direction = new THREE.Vector3(
        Math.sin(aimAngle.x) * Math.cos(aimAngle.y),
        Math.sin(aimAngle.y),
        -Math.cos(aimAngle.x) * Math.cos(aimAngle.y)
      ).multiplyScalar(power * 0.1);
      
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
    
    // Animate targets
    targetsRef.current.forEach(target => {
      if (!target.hit) {
        target.mesh.rotation.z += 0.02;
        const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1;
        target.glow.scale.setScalar(pulse);
      }
    });
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, aimAngle, power, updateProjectile, endRound]);

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
      fireProjectile();
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setPower(prev => Math.max(20, Math.min(100, prev - e.deltaY * 0.1)));
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        fireProjectile();
      }
      if (e.code === 'ArrowUp') setPower(prev => Math.min(100, prev + 5));
      if (e.code === 'ArrowDown') setPower(prev => Math.max(20, prev - 5));
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current?.addEventListener('click', handleClick);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
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
      fireProjectile();
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

  // Continuous render loop
  useEffect(() => {
    if (gameState === 'instructions') return;
    
    const render = () => {
      gameLoop();
    };
    animationRef.current = requestAnimationFrame(render);
    
    return () => cancelAnimationFrame(animationRef.current);
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
      
      {/* Power Meter */}
      {gameState === 'aiming' && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-400 mb-2">POWER</div>
            <div className="w-4 h-32 bg-gray-700 rounded-full overflow-hidden relative">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500 via-yellow-500 to-green-500 transition-all"
                style={{ height: `${power}%` }}
              />
            </div>
            <div className="text-sm font-bold text-white mt-2 text-center">{power}%</div>
          </div>
        </div>
      )}
      
      {/* Aiming hint */}
      {gameState === 'aiming' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden sm:inline">Move mouse to aim • Scroll to adjust power • Click or SPACE to fire</span>
              <span className="sm:hidden">Drag to aim • Release to fire!</span>
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

