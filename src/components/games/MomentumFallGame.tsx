'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// MISSILE DROP - Free-Falling Missile Game
// ============================================================================
// You ARE the missile! Dive through a neon shaft, dodge obstacles,
// collect boost pickups, and survive as long as possible!
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
  type: 'ring' | 'spinner' | 'laser' | 'debris';
  rotation: number;
  rotationSpeed: number;
  passed: boolean;
}

interface Collectible {
  mesh: THREE.Group;
  y: number;
  collected: boolean;
  points: number;
  type: 'fuel' | 'shield' | 'boost';
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
  const [fuelCollected, setFuelCollected] = useState(0);
  const [perfectPasses, setPerfectPasses] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [combo, setCombo] = useState(0);
  const [shield, setShield] = useState(0);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const missileRef = useRef<THREE.Group | null>(null);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const shaftRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const depthRef = useRef(0);
  const comboRef = useRef(0);
  const speedRef = useRef(1);
  const shieldRef = useRef(0);
  const missileVelocityRef = useRef({ x: 0, z: 0 });
  const targetTiltRef = useRef({ x: 0, z: 0 });
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextObstacleYRef = useRef(-20);
  const keysRef = useRef<Set<string>>(new Set());
  const clockRef = useRef(new THREE.Clock());
  const trailRef = useRef<THREE.Points | null>(null);
  const trailPositionsRef = useRef<Float32Array | null>(null);
  const cameraShakeRef = useRef(0);
  
  // Constants
  const SHAFT_RADIUS = 10;
  const MISSILE_RADIUS = 0.6;
  const FALL_SPEED_BASE = 0.18;
  const TILT_SPEED = 0.12;
  const FRICTION = 0.94;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          shaft: 0x2d1b4e,
          shaftGlow: 0xff6600,
          missile: 0xff6600,
          missileGlow: 0xff9900,
          flame: 0xff3300,
          obstacle: 0x9b59b6,
          obstacleGlow: 0xbb79d6,
          collectible: 0x00ff88,
          ambient: 0x4a1a6b
        };
      case 'christmas':
        return {
          background: 0x001122,
          shaft: 0x1e5631,
          shaftGlow: 0xff0000,
          missile: 0xff0000,
          missileGlow: 0xff4444,
          flame: 0xffd700,
          obstacle: 0xffffff,
          obstacleGlow: 0x87ceeb,
          collectible: 0x00ff00,
          ambient: 0x1e5631
        };
      default:
        return {
          background: 0x020208,
          shaft: 0x0a0a2a,
          shaftGlow: 0x00ffff,
          missile: 0xff3366,
          missileGlow: 0xff6699,
          flame: 0xff6600,
          obstacle: 0x6633ff,
          obstacleGlow: 0x9966ff,
          collectible: 0x00ff88,
          ambient: 0x1a1a4a
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((text: string, x: number, y: number, color: string) => {
    const id = floatingScoreIdRef.current++;
    setFloatingScores(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== id)), 1500);
  }, []);

  // Create obstacle
  const createObstacle = useCallback((y: number, rng: SeededRandom, scene: THREE.Scene): Obstacle => {
    const colors = getThemeColors();
    const types: ('ring' | 'spinner' | 'laser' | 'debris')[] = ['ring', 'spinner', 'laser', 'debris'];
    const type = types[rng.nextInt(0, types.length - 1)];
    
    const group = new THREE.Group();
    
    switch (type) {
      case 'ring': {
        // Ring with gap - player must fly through the gap
        const gapAngle = rng.next() * Math.PI * 2;
        const gapSize = 1.2 + rng.next() * 0.6;
        
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
          
          if (angleDiff > gapSize / 2) {
            const segGeom = new THREE.BoxGeometry(2, 0.6, 0.6);
            const segMat = new THREE.MeshStandardMaterial({
              color: colors.obstacle,
              emissive: colors.obstacleGlow,
              emissiveIntensity: 0.4,
              metalness: 0.7,
              roughness: 0.3
            });
            const seg = new THREE.Mesh(segGeom, segMat);
            seg.position.set(
              Math.cos(angle) * (SHAFT_RADIUS - 2),
              0,
              Math.sin(angle) * (SHAFT_RADIUS - 2)
            );
            seg.rotation.y = -angle;
            seg.castShadow = true;
            group.add(seg);
          }
        }
        break;
      }
      
      case 'spinner': {
        // Fast rotating bars
        const numBars = 2 + rng.nextInt(0, 2);
        for (let i = 0; i < numBars; i++) {
          const barGeom = new THREE.BoxGeometry(SHAFT_RADIUS * 1.6, 0.5, 0.8);
          const barMat = new THREE.MeshStandardMaterial({
            color: colors.obstacle,
            emissive: colors.obstacleGlow,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
          });
          const bar = new THREE.Mesh(barGeom, barMat);
          bar.rotation.y = (i / numBars) * Math.PI;
          bar.castShadow = true;
          group.add(bar);
          
          // Glowing tips
          const tipGeom = new THREE.SphereGeometry(0.4, 12, 12);
          const tipMat = new THREE.MeshBasicMaterial({ color: colors.obstacleGlow });
          const tip1 = new THREE.Mesh(tipGeom, tipMat);
          tip1.position.set(SHAFT_RADIUS * 0.8, 0, 0);
          bar.add(tip1);
          const tip2 = tip1.clone();
          tip2.position.set(-SHAFT_RADIUS * 0.8, 0, 0);
          bar.add(tip2);
        }
        break;
      }
      
      case 'laser': {
        // Laser grid
        const gridSize = 3;
        for (let i = 0; i < gridSize; i++) {
          // Horizontal laser
          const hLaserGeom = new THREE.CylinderGeometry(0.08, 0.08, SHAFT_RADIUS * 1.8, 8);
          const hLaserMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.8 
          });
          const hLaser = new THREE.Mesh(hLaserGeom, hLaserMat);
          hLaser.rotation.z = Math.PI / 2;
          hLaser.position.x = (i - 1) * 3;
          group.add(hLaser);
          
          // Glow around laser
          const glowGeom = new THREE.CylinderGeometry(0.2, 0.2, SHAFT_RADIUS * 1.8, 8);
          const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.2 
          });
          const glow = new THREE.Mesh(glowGeom, glowMat);
          glow.rotation.z = Math.PI / 2;
          glow.position.x = (i - 1) * 3;
          group.add(glow);
        }
        break;
      }
      
      case 'debris': {
        // Floating debris field
        for (let i = 0; i < 8; i++) {
          const size = 0.5 + rng.next() * 1;
          const debrisGeom = new THREE.DodecahedronGeometry(size, 0);
          const debrisMat = new THREE.MeshStandardMaterial({
            color: colors.obstacle,
            emissive: colors.obstacleGlow,
            emissiveIntensity: 0.3,
            metalness: 0.6,
            roughness: 0.4
          });
          const debris = new THREE.Mesh(debrisGeom, debrisMat);
          const angle = rng.next() * Math.PI * 2;
          const radius = 2 + rng.next() * (SHAFT_RADIUS - 4);
          debris.position.set(
            Math.cos(angle) * radius,
            (rng.next() - 0.5) * 2,
            Math.sin(angle) * radius
          );
          debris.rotation.set(rng.next() * Math.PI, rng.next() * Math.PI, rng.next() * Math.PI);
          debris.castShadow = true;
          group.add(debris);
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
      rotationSpeed: (rng.next() - 0.5) * 0.03 * (type === 'spinner' ? 4 : type === 'debris' ? 2 : 1),
      passed: false
    };
  }, [getThemeColors]);

  // Create collectible
  const createCollectible = useCallback((y: number, rng: SeededRandom, scene: THREE.Scene): Collectible => {
    const colors = getThemeColors();
    const types: ('fuel' | 'shield' | 'boost')[] = ['fuel', 'fuel', 'fuel', 'shield', 'boost'];
    const type = types[rng.nextInt(0, types.length - 1)];
    
    const group = new THREE.Group();
    let points = 0;
    
    switch (type) {
      case 'fuel':
        // Fuel canister
        const canisterGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 12);
        const canisterMat = new THREE.MeshStandardMaterial({
          color: colors.collectible,
          emissive: colors.collectible,
          emissiveIntensity: 0.8,
          metalness: 0.8,
          roughness: 0.2
        });
        const canister = new THREE.Mesh(canisterGeom, canisterMat);
        group.add(canister);
        
        // Glow ring
        const ringGeom = new THREE.TorusGeometry(0.5, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: colors.collectible, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        points = 50;
        break;
        
      case 'shield':
        // Shield orb
        const shieldGeom = new THREE.IcosahedronGeometry(0.5, 1);
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0x00aaff,
          emissive: 0x0066ff,
          emissiveIntensity: 0.9,
          metalness: 0.3,
          roughness: 0.1,
          transparent: true,
          opacity: 0.8
        });
        const shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
        group.add(shieldMesh);
        
        // Outer glow
        const outerGeom = new THREE.IcosahedronGeometry(0.7, 0);
        const outerMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, wireframe: true });
        const outer = new THREE.Mesh(outerGeom, outerMat);
        group.add(outer);
        points = 0;
        break;
        
      case 'boost':
        // Speed boost arrow
        const boostGeom = new THREE.ConeGeometry(0.4, 1, 8);
        const boostMat = new THREE.MeshStandardMaterial({
          color: 0xff6600,
          emissive: 0xff3300,
          emissiveIntensity: 1,
          metalness: 0.5,
          roughness: 0.3
        });
        const boost = new THREE.Mesh(boostGeom, boostMat);
        boost.rotation.x = Math.PI; // Point down
        group.add(boost);
        
        // Flame particles
        const flameGeom = new THREE.ConeGeometry(0.3, 0.6, 8);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 });
        const flame = new THREE.Mesh(flameGeom, flameMat);
        flame.position.y = 0.6;
        group.add(flame);
        points = 25;
        break;
    }
    
    // Position randomly in shaft
    const angle = rng.next() * Math.PI * 2;
    const radius = 1 + rng.next() * (SHAFT_RADIUS - 3);
    group.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    
    scene.add(group);
    
    return { mesh: group, y, collected: false, points, type };
  }, [getThemeColors]);

  // Create shaft walls
  const createShaft = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const shaft = new THREE.Group();
    
    // Hexagonal shaft with glowing edges
    const numSides = 8;
    for (let i = 0; i < numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2;
      const nextAngle = ((i + 1) / numSides) * Math.PI * 2;
      
      // Wall panel
      const wallGeom = new THREE.PlaneGeometry(
        2 * SHAFT_RADIUS * Math.sin(Math.PI / numSides),
        150
      );
      const wallMat = new THREE.MeshStandardMaterial({
        color: colors.shaft,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.15,
        metalness: 0.5,
        roughness: 0.5
      });
      const wall = new THREE.Mesh(wallGeom, wallMat);
      wall.position.set(
        Math.cos(angle + Math.PI / numSides) * SHAFT_RADIUS,
        0,
        Math.sin(angle + Math.PI / numSides) * SHAFT_RADIUS
      );
      wall.rotation.y = -(angle + Math.PI / numSides);
      shaft.add(wall);
      
      // Edge glow lines
      const edgeGeom = new THREE.CylinderGeometry(0.08, 0.08, 150, 8);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: colors.shaftGlow,
        transparent: true,
        opacity: 0.6
      });
      const edge = new THREE.Mesh(edgeGeom, edgeMat);
      edge.position.set(
        Math.cos(angle) * SHAFT_RADIUS,
        0,
        Math.sin(angle) * SHAFT_RADIUS
      );
      shaft.add(edge);
    }
    
    // Glowing rings at intervals
    for (let y = 0; y > -150; y -= 8) {
      const ringGeom = new THREE.TorusGeometry(SHAFT_RADIUS, 0.12, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colors.shaftGlow,
        transparent: true,
        opacity: 0.4 + Math.sin(y * 0.1) * 0.2
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      shaft.add(ring);
    }
    
    scene.add(shaft);
    return shaft;
  }, [getThemeColors]);

  // Create missile
  const createMissile = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const missile = new THREE.Group();
    
    // Main body - sleek missile shape
    const bodyGeom = new THREE.CylinderGeometry(0.2, MISSILE_RADIUS, 2.5, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colors.missile,
      emissive: colors.missileGlow,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.1
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    missile.add(body);
    
    // Nose cone
    const noseGeom = new THREE.ConeGeometry(0.2, 0.8, 16);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colors.missileGlow,
      emissiveIntensity: 0.3,
      metalness: 0.95,
      roughness: 0.05
    });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.y = -1.6;
    missile.add(nose);
    
    // Fins (4 stabilizers)
    for (let i = 0; i < 4; i++) {
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(0.6, 0);
      finShape.lineTo(0.3, 0.8);
      finShape.lineTo(0, 0.8);
      
      const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: false });
      const finMat = new THREE.MeshStandardMaterial({
        color: colors.missile,
        emissive: colors.missileGlow,
        emissiveIntensity: 0.4,
        metalness: 0.8,
        roughness: 0.2
      });
      const fin = new THREE.Mesh(finGeom, finMat);
      fin.rotation.y = (i / 4) * Math.PI * 2;
      fin.position.y = 0.8;
      fin.rotation.x = Math.PI / 2;
      missile.add(fin);
    }
    
    // Engine exhaust glow
    const exhaustGeom = new THREE.CylinderGeometry(MISSILE_RADIUS * 0.6, MISSILE_RADIUS * 0.3, 0.4, 16);
    const exhaustMat = new THREE.MeshBasicMaterial({
      color: colors.flame,
      transparent: true,
      opacity: 0.9
    });
    const exhaust = new THREE.Mesh(exhaustGeom, exhaustMat);
    exhaust.position.y = 1.35;
    missile.add(exhaust);
    
    // Flame trail (dynamic)
    const flameGeom = new THREE.ConeGeometry(MISSILE_RADIUS * 0.5, 2, 12);
    const flameMat = new THREE.MeshBasicMaterial({
      color: colors.flame,
      transparent: true,
      opacity: 0.7
    });
    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.y = 2.5;
    flame.name = 'flame';
    missile.add(flame);
    
    // Inner flame
    const innerFlameGeom = new THREE.ConeGeometry(MISSILE_RADIUS * 0.3, 1.5, 12);
    const innerFlameMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9
    });
    const innerFlame = new THREE.Mesh(innerFlameGeom, innerFlameMat);
    innerFlame.position.y = 2;
    innerFlame.name = 'innerFlame';
    missile.add(innerFlame);
    
    // Shield bubble (invisible until shield is active)
    const shieldBubbleGeom = new THREE.SphereGeometry(1.2, 24, 24);
    const shieldBubbleMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const shieldBubble = new THREE.Mesh(shieldBubbleGeom, shieldBubbleMat);
    shieldBubble.name = 'shieldBubble';
    missile.add(shieldBubble);
    
    missile.position.set(0, 0, 0);
    missile.rotation.x = Math.PI; // Point downward
    scene.add(missile);
    
    return missile;
  }, [getThemeColors]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.FogExp2(colors.background, 0.015);
    sceneRef.current = scene;
    
    // Camera - dynamic chase cam behind missile
    const camera = new THREE.PerspectiveCamera(
      80,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      300
    );
    camera.position.set(0, 12, 18);
    camera.lookAt(0, -5, 0);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    scene.add(new THREE.AmbientLight(colors.ambient, 0.4));
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(10, 30, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);
    
    // Dynamic point lights
    const missileLight = new THREE.PointLight(colors.missileGlow, 2, 15);
    missileLight.position.set(0, 3, 0);
    missileLight.name = 'missileLight';
    scene.add(missileLight);
    
    // Ambient shaft lights
    for (let i = 0; i < 6; i++) {
      const light = new THREE.PointLight(colors.shaftGlow, 0.4, 25);
      const angle = (i / 6) * Math.PI * 2;
      light.position.set(
        Math.cos(angle) * (SHAFT_RADIUS - 2),
        -20 - i * 20,
        Math.sin(angle) * (SHAFT_RADIUS - 2)
      );
      scene.add(light);
    }
    
    // Create shaft
    shaftRef.current = createShaft(scene);
    
    // Create missile
    missileRef.current = createMissile(scene);
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate initial obstacles
    for (let y = -20; y > -120; y -= 10 + Math.random() * 8) {
      if (rngRef.current) {
        obstaclesRef.current.push(createObstacle(y, rngRef.current, scene));
        if (rngRef.current.next() > 0.4) {
          collectiblesRef.current.push(createCollectible(y + 4, rngRef.current, scene));
        }
      }
    }
    nextObstacleYRef.current = -120;
    
    return { scene, camera, renderer };
  }, [getThemeColors, createShaft, createMissile, createObstacle, createCollectible]);

  // Check collisions
  const checkCollisions = useCallback(() => {
    if (!missileRef.current) return true;
    
    const missilePos = missileRef.current.position;
    
    // Wall collision
    const distFromCenter = Math.sqrt(missilePos.x ** 2 + missilePos.z ** 2);
    if (distFromCenter > SHAFT_RADIUS - MISSILE_RADIUS - 0.5) {
      // Bounce off wall
      const angle = Math.atan2(missilePos.z, missilePos.x);
      missileVelocityRef.current.x = -Math.cos(angle) * 0.15;
      missileVelocityRef.current.z = -Math.sin(angle) * 0.15;
      
      missilePos.x = Math.cos(angle) * (SHAFT_RADIUS - MISSILE_RADIUS - 0.6);
      missilePos.z = Math.sin(angle) * (SHAFT_RADIUS - MISSILE_RADIUS - 0.6);
      
      // Camera shake
      cameraShakeRef.current = 0.3;
      
      comboRef.current = 0;
      setCombo(0);
    }
    
    // Obstacle collisions
    for (const obstacle of obstaclesRef.current) {
      if (obstacle.passed) continue;
      
      const obstacleY = obstacle.mesh.position.y;
      
      if (Math.abs(obstacleY) < 2) {
        for (const child of obstacle.mesh.children) {
          if (child instanceof THREE.Mesh) {
            const childWorldPos = new THREE.Vector3();
            child.getWorldPosition(childWorldPos);
            
            const dx = missilePos.x - childWorldPos.x;
            const dz = missilePos.z - childWorldPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < MISSILE_RADIUS + 0.6) {
              if (shieldRef.current > 0) {
                // Shield absorbs hit
                shieldRef.current--;
                setShield(shieldRef.current);
                cameraShakeRef.current = 0.5;
                addFloatingScore('SHIELD! 🛡️', window.innerWidth / 2, window.innerHeight / 3, '#00aaff');
                return true;
              }
              return false;
            }
          }
        }
      }
      
      // Mark as passed
      if (obstacleY > 3) {
        obstacle.passed = true;
        setObstaclesPassed(prev => prev + 1);
        
        comboRef.current++;
        setCombo(comboRef.current);
        
        const points = 50 + Math.min(comboRef.current * 15, 150);
        scoreRef.current += points;
        setScore(scoreRef.current);
        
        // Perfect pass bonus
        if (distFromCenter < 2.5) {
          setPerfectPasses(prev => prev + 1);
          const bonus = 100;
          scoreRef.current += bonus;
          setScore(scoreRef.current);
          addFloatingScore(`PERFECT +${bonus}`, window.innerWidth / 2, window.innerHeight / 3, '#ffd700');
        }
      }
    }
    
    // Collectible collisions
    for (const collectible of collectiblesRef.current) {
      if (collectible.collected) continue;
      
      const cY = collectible.mesh.position.y;
      if (Math.abs(cY) < 1.5) {
        const dx = missilePos.x - collectible.mesh.position.x;
        const dz = missilePos.z - collectible.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < MISSILE_RADIUS + 0.7) {
          collectible.collected = true;
          sceneRef.current?.remove(collectible.mesh);
          
          setFuelCollected(prev => prev + 1);
          
          if (collectible.type === 'shield') {
            shieldRef.current = Math.min(3, shieldRef.current + 1);
            setShield(shieldRef.current);
            addFloatingScore('SHIELD +1 🛡️', window.innerWidth / 2, window.innerHeight / 2, '#00aaff');
          } else if (collectible.type === 'boost') {
            speedRef.current = Math.min(4, speedRef.current + 0.4);
            setCurrentSpeed(speedRef.current);
            addFloatingScore('BOOST! 🚀', window.innerWidth / 2, window.innerHeight / 2, '#ff6600');
          } else {
            const points = collectible.points * (1 + comboRef.current * 0.15);
            scoreRef.current += Math.floor(points);
            setScore(scoreRef.current);
            addFloatingScore(`+${Math.floor(points)}`, window.innerWidth / 2, window.innerHeight / 2, '#00ff88');
          }
        }
      }
    }
    
    return true;
  }, [addFloatingScore]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    audioRef.current?.pause();
    
    const finalScore = scoreRef.current + Math.floor(depthRef.current * 2) + perfectPasses * 50;
    setScore(finalScore);
    
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'momentum-fall',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: { depth: depthRef.current, obstaclesPassed, fuelCollected, perfectPasses, maxSpeed: speedRef.current, theme }
        });
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, obstaclesPassed, fuelCollected, perfectPasses, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const delta = clockRef.current.getDelta();
    
    // Handle input
    let tiltX = 0, tiltZ = 0;
    
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) tiltX = -TILT_SPEED;
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) tiltX = TILT_SPEED;
    if (keysRef.current.has('ArrowUp') || keysRef.current.has('w')) tiltZ = -TILT_SPEED;
    if (keysRef.current.has('ArrowDown') || keysRef.current.has('s')) tiltZ = TILT_SPEED;
    
    // Touch/mouse
    tiltX += targetTiltRef.current.x * TILT_SPEED;
    tiltZ += targetTiltRef.current.z * TILT_SPEED;
    
    // Apply velocity
    missileVelocityRef.current.x += tiltX;
    missileVelocityRef.current.z += tiltZ;
    missileVelocityRef.current.x *= FRICTION;
    missileVelocityRef.current.z *= FRICTION;
    
    // Update missile
    if (missileRef.current) {
      missileRef.current.position.x += missileVelocityRef.current.x;
      missileRef.current.position.z += missileVelocityRef.current.z;
      
      // Tilt based on movement
      missileRef.current.rotation.z = -missileVelocityRef.current.x * 1.5;
      missileRef.current.rotation.x = Math.PI + missileVelocityRef.current.z * 1.5;
      
      // Animate flame
      const flame = missileRef.current.getObjectByName('flame') as THREE.Mesh;
      const innerFlame = missileRef.current.getObjectByName('innerFlame') as THREE.Mesh;
      if (flame && innerFlame) {
        const flameScale = 0.8 + speedRef.current * 0.3 + Math.sin(Date.now() * 0.02) * 0.2;
        flame.scale.y = flameScale;
        innerFlame.scale.y = flameScale * 0.8;
        (flame.material as THREE.MeshBasicMaterial).opacity = 0.5 + speedRef.current * 0.15;
      }
      
      // Shield bubble visibility
      const shieldBubble = missileRef.current.getObjectByName('shieldBubble') as THREE.Mesh;
      if (shieldBubble) {
        (shieldBubble.material as THREE.MeshBasicMaterial).opacity = shieldRef.current > 0 ? 0.2 + Math.sin(Date.now() * 0.01) * 0.1 : 0;
      }
    }
    
    // Move everything up (missile falling)
    const fallSpeed = FALL_SPEED_BASE * speedRef.current;
    
    obstaclesRef.current.forEach(obstacle => {
      obstacle.mesh.position.y += fallSpeed;
      obstacle.rotation += obstacle.rotationSpeed;
      obstacle.mesh.rotation.y = obstacle.rotation;
      
      // Debris individual rotation
      if (obstacle.type === 'debris') {
        obstacle.mesh.children.forEach((child, i) => {
          child.rotation.x += 0.01 * (i + 1);
          child.rotation.z += 0.008 * (i + 1);
        });
      }
      
      if (obstacle.mesh.position.y > 25) {
        sceneRef.current?.remove(obstacle.mesh);
      }
    });
    
    obstaclesRef.current = obstaclesRef.current.filter(o => o.mesh.position.y <= 25);
    
    collectiblesRef.current.forEach(c => {
      if (!c.collected) {
        c.mesh.position.y += fallSpeed;
        c.mesh.rotation.y += 0.04;
        c.mesh.children.forEach(child => {
          if (child.name === '') child.rotation.z += 0.02;
        });
      }
    });
    
    collectiblesRef.current = collectiblesRef.current.filter(c => !c.collected && c.mesh.position.y <= 25);
    
    // Move shaft rings
    if (shaftRef.current) {
      shaftRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) {
          child.position.y += fallSpeed;
          if (child.position.y > 25) child.position.y -= 160;
        }
      });
    }
    
    // Update depth/speed
    depthRef.current += fallSpeed;
    setDepth(Math.floor(depthRef.current));
    
    speedRef.current = Math.min(4, 1 + depthRef.current * 0.0015);
    setCurrentSpeed(speedRef.current);
    
    // Generate new obstacles
    if (depthRef.current > -nextObstacleYRef.current - 60) {
      if (rngRef.current && sceneRef.current) {
        const newY = nextObstacleYRef.current - 10 - rngRef.current.next() * 8;
        obstaclesRef.current.push(createObstacle(newY - depthRef.current, rngRef.current, sceneRef.current));
        if (rngRef.current.next() > 0.35) {
          collectiblesRef.current.push(createCollectible(newY - depthRef.current + 4, rngRef.current, sceneRef.current));
        }
        nextObstacleYRef.current = newY;
      }
    }
    
    // Check collisions
    if (!checkCollisions()) {
      endGame();
      return;
    }
    
    // Update camera with dynamic follow
    if (cameraRef.current && missileRef.current) {
      const speedFactor = speedRef.current / 4;
      const targetCamPos = new THREE.Vector3(
        missileRef.current.position.x * 0.4,
        10 + speedFactor * 5,
        15 + speedFactor * 5
      );
      
      cameraRef.current.position.lerp(targetCamPos, 0.03);
      
      // Camera shake
      if (cameraShakeRef.current > 0) {
        cameraRef.current.position.x += (Math.random() - 0.5) * cameraShakeRef.current;
        cameraRef.current.position.y += (Math.random() - 0.5) * cameraShakeRef.current * 0.5;
        cameraShakeRef.current *= 0.9;
      }
      
      cameraRef.current.lookAt(
        missileRef.current.position.x * 0.5,
        missileRef.current.position.y - 8,
        missileRef.current.position.z * 0.5
      );
      
      // Update missile light
      const missileLight = sceneRef.current?.getObjectByName('missileLight') as THREE.PointLight;
      if (missileLight) {
        missileLight.position.copy(missileRef.current.position);
        missileLight.position.y += 2;
        missileLight.intensity = 2 + speedRef.current;
      }
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [checkCollisions, createObstacle, createCollectible, endGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
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
    
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
    const handleEnd = () => { targetTiltRef.current = { x: 0, z: 0 }; };
    
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
    setFuelCollected(0);
    setPerfectPasses(0);
    setCurrentSpeed(1);
    setCombo(0);
    setShield(0);
    
    scoreRef.current = 0;
    depthRef.current = 0;
    comboRef.current = 0;
    speedRef.current = 1;
    shieldRef.current = 0;
    missileVelocityRef.current = { x: 0, z: 0 };
    targetTiltRef.current = { x: 0, z: 0 };
    cameraShakeRef.current = 0;
    
    if (missileRef.current) {
      missileRef.current.position.set(0, 0, 0);
      missileRef.current.rotation.set(Math.PI, 0, 0);
    }
    
    // Clear and regenerate
    if (sceneRef.current) {
      obstaclesRef.current.forEach(o => sceneRef.current?.remove(o.mesh));
      collectiblesRef.current.forEach(c => sceneRef.current?.remove(c.mesh));
      obstaclesRef.current = [];
      collectiblesRef.current = [];
      
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      rngRef.current = new SeededRandom(seed);
      
      for (let y = -20; y > -120; y -= 10 + Math.random() * 8) {
        if (rngRef.current) {
          obstaclesRef.current.push(createObstacle(y, rngRef.current, sceneRef.current));
          if (rngRef.current.next() > 0.4) {
            collectiblesRef.current.push(createCollectible(y + 4, rngRef.current, sceneRef.current));
          }
        }
      }
      nextObstacleYRef.current = -120;
    }
    
    clockRef.current.start();
    gameActiveRef.current = true;
    gameLoop();
  }, [createObstacle, createCollectible, gameLoop]);

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
        <div className="absolute top-0 left-0 right-0 p-2 md:p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-white/10">
              <div className="text-xl md:text-2xl font-bold text-cyan-400">{score.toLocaleString()}</div>
              <div className="text-[10px] md:text-xs text-gray-400">SCORE</div>
              {combo > 0 && (
                <div className={`mt-1 font-bold text-sm ${combo >= 10 ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                  {combo}x COMBO
                </div>
              )}
            </div>
            
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 md:px-4 py-1 md:py-2 border border-white/10 text-center">
              <div className="text-2xl md:text-3xl font-mono font-bold text-white">{depth}m</div>
              <div className="text-xs md:text-sm text-purple-400">Speed: {currentSpeed.toFixed(1)}x</div>
            </div>
            
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-white/10 text-right">
              <div className="text-base md:text-lg font-bold text-white">{obstaclesPassed} dodged</div>
              <div className="text-xs md:text-sm text-yellow-400">{perfectPasses} perfect</div>
              {/* Shield indicator */}
              <div className="flex gap-1 justify-end mt-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${i < shield ? 'bg-blue-400' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls hint */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden md:inline">WASD or Arrow Keys to steer • Mouse to aim</span>
              <span className="md:hidden">Touch & drag to steer the missile</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Scores */}
      {floatingScores.map(fs => (
        <div key={fs.id} className="absolute pointer-events-none font-bold text-xl md:text-2xl"
          style={{ left: fs.x, top: fs.y, color: fs.color, transform: 'translate(-50%, -50%)', textShadow: '0 0 15px currentColor', animation: 'floatUp 1.5s ease-out forwards' }}>
          {fs.text}
        </div>
      ))}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-4 md:p-6 max-w-md w-full text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 mb-4">🚀 Missile Drop</h1>
            
            <div className="space-y-3 text-left text-gray-300 mb-6 text-sm md:text-base">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div><div className="font-bold text-white">Steer Your Missile</div><div className="text-xs md:text-sm">WASD/Arrows or touch to dodge obstacles!</div></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div><div className="font-bold text-white">Free Fall</div><div className="text-xs md:text-sm">Navigate through the neon shaft at high speed!</div></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🛡️</span>
                <div><div className="font-bold text-cyan-400">Collect Shields</div><div className="text-xs md:text-sm">Blue orbs give you 1 free hit protection!</div></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🔥</span>
                <div><div className="font-bold text-orange-400">Boost Pickups</div><div className="text-xs md:text-sm">Orange arrows increase your falling speed!</div></div>
              </div>
            </div>
            
            <button onClick={startGame}
              className="w-full py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 transition-all transform hover:scale-105 shadow-lg shadow-red-500/25">
              LAUNCH MISSILE 🚀
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-4 md:p-6 max-w-md w-full text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">💥 IMPACT!</h2>
            <div className="text-4xl md:text-5xl font-bold text-cyan-400 my-4 md:my-6">{score.toLocaleString()}</div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-left mb-4 md:mb-6">
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Depth</div><div className="text-xl md:text-2xl font-bold text-white">{depth}m</div></div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Dodged</div><div className="text-xl md:text-2xl font-bold text-white">{obstaclesPassed}</div></div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Perfect</div><div className="text-xl md:text-2xl font-bold text-yellow-400">{perfectPasses}</div></div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3"><div className="text-gray-400 text-xs md:text-sm">Collected</div><div className="text-xl md:text-2xl font-bold text-green-400">{fuelCollected}</div></div>
            </div>
            
            <div className="flex gap-2 md:gap-3">
              <button onClick={startGame} className="flex-1 py-2 md:py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold transition-all">Launch Again</button>
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
