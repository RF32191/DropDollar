'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

/**
 * BLADE BOUNCE 3D - Professional WebGL Sword Defense Game
 * - Full 3D sword with smooth 45° rotation
 * - Red danger zones only on sword HANDLE (hilt)
 * - 3 hearts system with visual feedback
 * - Realistic physics and smooth animations
 * - Multiple enemy types with varied behaviors
 */

interface Enemy3D {
  mesh: THREE.Mesh | THREE.Group;
  glowMesh?: THREE.Mesh; // For fireball glow effect or enemy sword glow
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  type: 'fireball' | 'enemy_sword' | 'laser';
  health: number;
  rotation: number;
  pulsePhase?: number; // For animated pulsing
  trailParticles?: THREE.Mesh[]; // Particle trail for fireballs
  width?: number; // For laser width
  height?: number; // For laser height
  laserWarning?: THREE.Mesh; // Warning indicator before laser fires
  isGreenFireball?: boolean; // Special high-value green fireball
  basePoints?: number; // Base point value before precision multiplier
  laserRotationSpeed?: number; // Rotation speed for laser (radians per frame)
  laserActive?: boolean; // Whether laser is active and can damage
  laserDirection?: THREE.Vector3; // Direction indicator for laser
}

interface Particle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface BladeBounce3DProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

const GAME_DURATION = 60;
const SWORD_ROTATION_SPEED = 0.15; // Much faster rotation for smooth 45° clicks
const ROTATION_STEP = Math.PI / 4; // 45 degrees per click
const FIREBALL_SPAWN_RATE = 1800; // ms between fireball spawns (SLOWER - gradual difficulty)
const ENEMY_SWORD_SPAWN_RATE = 5000; // ms between enemy sword spawns (RARE)
const LASER_SPAWN_RATE = 3500; // ms between laser spawns (RANDOM)
const HANDLE_DANGER_ZONES = 3; // Number of red circles on handle
const DANGER_ZONE_SIZE = 0.8; // VERY LARGE danger zones for easy hit detection
const DANGER_ZONE_HIT_RADIUS = 1.2; // Hit detection radius (larger than visual)
const SWORD_MOVE_SPEED = 1.0; // Direct cursor tracking (was 0.35)
const SWORD_Y_RANGE = 10; // Large vertical range
const ENEMY_SWORD_GAP = 7; // Gap between top and bottom enemy swords
const ENEMY_SWORD_SPEED = 0.06; // Horizontal movement speed (slower for skill)
const LASER_WARNING_TIME = 1000; // ms warning before laser fires
const LASER_ACTIVE_TIME = 800; // ms laser stays active
const LASER_WIDTH = 0.4; // Laser beam width

export default function BladeBounce3D({
  onGameEnd,
  onExit,
}: BladeBounce3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const swordGroupRef = useRef<THREE.Group | null>(null);
  const enemiesRef = useRef<Enemy3D[]>([]);
  const particlesRef = useRef<Particle3D[]>([]);
  const animationIdRef = useRef<number>();
  const clockRef = useRef(new THREE.Clock());
  const lastFireballSpawnRef = useRef<number>(0);
  const lastEnemySwordSpawnRef = useRef<number>(0);
  const lastLaserSpawnRef = useRef<number>(0);
  const dangerZonesRef = useRef<THREE.Mesh[]>([]);
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [enemiesDestroyed, setEnemiesDestroyed] = useState(0);
  const [gameTimer, setGameTimer] = useState(GAME_DURATION);
  const [targetAngle, setTargetAngle] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  
  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 20;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Point light for sword glow
    const swordLight = new THREE.PointLight(0x00ffff, 1.5, 10);
    swordLight.position.set(0, 0, 2);
    scene.add(swordLight);

    // Create sword
    const swordGroup = new THREE.Group();
    
    // Blade (main body)
    const bladeGeometry = new THREE.BoxGeometry(0.3, 4, 0.1);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x4080ff,
      emissiveIntensity: 0.3,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 2;
    swordGroup.add(blade);
    
    // Blade edge glow
    const edgeGeometry = new THREE.BoxGeometry(0.1, 4, 0.05);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x80c0ff,
      transparent: true,
      opacity: 0.6,
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 2;
    edge.position.z = 0.05;
    swordGroup.add(edge);
    
    // Guard (crossguard)
    const guardGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.2);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      metalness: 0.6,
      roughness: 0.4,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.y = 0;
    swordGroup.add(guard);
    
    // Handle (grip) - This is the DANGER ZONE
    const handleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      metalness: 0.3,
      roughness: 0.7,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.7;
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    // Pommel (end cap)
    const pommelGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const pommelMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
    });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.y = -1.3;
    swordGroup.add(pommel);
    
    // Create danger zones ONLY on handle (MUCH LARGER red circles with glow)
    const dangerZones: THREE.Mesh[] = [];
    for (let i = 0; i < HANDLE_DANGER_ZONES; i++) {
      const dangerGeometry = new THREE.SphereGeometry(DANGER_ZONE_SIZE, 32, 32);
      const dangerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.75,
      });
      const danger = new THREE.Mesh(dangerGeometry, dangerMaterial);
      
      // Add outer glow sphere for extra visibility
      const glowGeometry = new THREE.SphereGeometry(DANGER_ZONE_SIZE * 1.3, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      
      // Position along handle length
      const handleStart = -1.2;
      const handleEnd = -0.2;
      const step = (handleEnd - handleStart) / (HANDLE_DANGER_ZONES + 1);
      const yPos = handleStart + step * (i + 1);
      
      danger.position.y = yPos;
      danger.position.z = 0.2; // Slightly in front
      
      glow.position.y = yPos;
      glow.position.z = 0.2;
      
      swordGroup.add(glow); // Add glow first (behind)
      swordGroup.add(danger); // Add main sphere on top
      dangerZones.push(danger);
    }
    dangerZonesRef.current = dangerZones;
    
    swordGroup.position.set(0, 0, 0);
    scene.add(swordGroup);
    swordGroupRef.current = swordGroup;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Create enemy - FIREBALLS, ENEMY SWORDS, and LASERS
  const createEnemy = useCallback((type: 'fireball' | 'enemy_sword' | 'laser') => {
    if (!sceneRef.current) return;

    if (type === 'fireball') {
      // ULTRA-REALISTIC FIRE SPRITE - Multi-layered with smoke and embers
      // 20% chance for GREEN FIREBALL (high value)
      const isGreen = Math.random() < 0.2;
      const fireballSize = 0.45 + Math.random() * 0.2;
      
      // Spawn from edges (needed for both types)
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (10 + Math.random() * 5);
      const y = (Math.random() - 0.5) * 8;
      
      // Create fire sprite group for layering
      const fireGroup = new THREE.Group();
      
      if (isGreen) {
        // REALISTIC GREEN FLAME FIREBALL - Rare, magical appearance
        // Inner white-green core (brightest)
        const coreGeometry = new THREE.SphereGeometry(fireballSize * 0.25, 12, 12);
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1.0,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.scale.set(1, 1.2, 1); // Slightly elongated upward
        fireGroup.add(core);
        
        // Bright cyan inner layer (hot green flame core)
        const cyanGeometry = new THREE.SphereGeometry(fireballSize * 0.45, 16, 16);
        const cyanMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.9,
        });
        const cyan = new THREE.Mesh(cyanGeometry, cyanMaterial);
        cyan.scale.set(1, 1.3, 1); // More elongated
        fireGroup.add(cyan);
        
        // Lime middle layer (main green flame color)
        const limeGeometry = new THREE.SphereGeometry(fireballSize * 0.7, 20, 20);
        const limeMaterial = new THREE.MeshBasicMaterial({
          color: 0x88ff00,
          transparent: true,
          opacity: 0.85,
        });
        const lime = new THREE.Mesh(limeGeometry, limeMaterial);
        lime.scale.set(1, 1.4, 1); // Even more elongated
        fireGroup.add(lime);
        
        // Green outer layer (flame edge)
        const greenGeometry = new THREE.SphereGeometry(fireballSize, 24, 24);
        const greenMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff33,
          transparent: true,
          opacity: 0.7,
        });
        const green = new THREE.Mesh(greenGeometry, greenMaterial);
        green.scale.set(1, 1.5, 1); // Maximum elongation for flame tip
        fireGroup.add(green);
        
        // Outer glow (bright green aura)
        const glowGeometry = new THREE.SphereGeometry(fireballSize * 1.4, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x66ff00,
          transparent: true,
          opacity: 0.25,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.set(1, 1.6, 1); // Match flame elongation
        glowMesh.position.set(x, y, 0);
        sceneRef.current.add(glowMesh);
        
        fireGroup.position.set(x, y, 0);
        sceneRef.current.add(fireGroup);
        
        const speed = 0.06 + Math.random() * 0.04;
        const velocityX = -side * speed;
        const velocityY = (Math.random() - 0.5) * 0.03;
        
        enemiesRef.current.push({
          mesh: fireGroup as any,
          glowMesh,
          x,
          y,
          velocityX,
          velocityY,
          type: 'fireball',
          health: 1,
          rotation: 0,
          pulsePhase: Math.random() * Math.PI * 2,
          trailParticles: [],
          isGreenFireball: true,
          basePoints: 25, // GREEN = 25 base points
        });
        return; // Exit early for green fireball
      }
      
      // REALISTIC FLAME FIREBALL - Layered with elongation for flame shape
      // Inner white-hot core (small, bright)
      const coreGeometry = new THREE.SphereGeometry(fireballSize * 0.25, 12, 12);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.scale.set(1, 1.2, 1); // Slightly elongated upward
      fireGroup.add(core);
      
      // Bright yellow inner layer (hot flame core)
      const yellowGeometry = new THREE.SphereGeometry(fireballSize * 0.45, 16, 16);
      const yellowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.9,
      });
      const yellow = new THREE.Mesh(yellowGeometry, yellowMaterial);
      yellow.scale.set(1, 1.3, 1); // More elongated
      fireGroup.add(yellow);
      
      // Orange middle layer (main flame color)
      const orangeGeometry = new THREE.SphereGeometry(fireballSize * 0.7, 20, 20);
      const orangeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.85,
      });
      const orange = new THREE.Mesh(orangeGeometry, orangeMaterial);
      orange.scale.set(1, 1.4, 1); // Even more elongated
      fireGroup.add(orange);
      
      // Red outer layer (flame edge)
      const redGeometry = new THREE.SphereGeometry(fireballSize, 24, 24);
      const redMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.7,
      });
      const red = new THREE.Mesh(redGeometry, redMaterial);
      red.scale.set(1, 1.5, 1); // Maximum elongation for flame tip
      fireGroup.add(red);
      
      // Outer glow (orange-yellow aura)
      const glowGeometry = new THREE.SphereGeometry(fireballSize * 1.4, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.25,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.scale.set(1, 1.6, 1); // Match flame elongation
      
      // Position using variables already declared at top
      fireGroup.position.set(x, y, 0);
      glowMesh.position.set(x, y, 0);
      sceneRef.current.add(fireGroup);
      sceneRef.current.add(glowMesh);
      
      // Fast velocity towards sword
      const speed = 0.06 + Math.random() * 0.04;
      const velocityX = -side * speed;
      const velocityY = (Math.random() - 0.5) * 0.03;
      
      enemiesRef.current.push({
        mesh: fireGroup as any, // Store the group as mesh
        glowMesh,
        x,
        y,
        velocityX,
        velocityY,
        type: 'fireball',
        health: 1,
        rotation: 0,
        pulsePhase: Math.random() * Math.PI * 2,
        trailParticles: [],
        isGreenFireball: false,
        basePoints: 10, // ORANGE/RED = 10 base points
      });
    } else if (type === 'enemy_sword') {
      // ENEMY SWORDS - Horizontal scrolling with gap (like Flappy Bird)
      // Create BOTH top and bottom enemy swords at once
      
      // Random gap position (where player sword can pass through)
      const gapCenterY = (Math.random() - 0.5) * 3; // Gap from -1.5 to +1.5
      
      // CREATE TOP ENEMY SWORD (pointing down)
      const topSwordGroup = new THREE.Group();
      
      // Blade (dark red, menacing)
      const topBladeGeometry = new THREE.BoxGeometry(0.25, 3.5, 0.1);
      const topBladeMaterial = new THREE.MeshStandardMaterial({
        color: 0x440000,
        emissive: 0xff0000,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.2,
      });
      const topBlade = new THREE.Mesh(topBladeGeometry, topBladeMaterial);
      topBlade.position.y = -1.75;
      topSwordGroup.add(topBlade);
      
      // Guard
      const topGuardGeometry = new THREE.BoxGeometry(1.2, 0.15, 0.15);
      const topGuardMaterial = new THREE.MeshStandardMaterial({
        color: 0x220000,
        metalness: 0.8,
        roughness: 0.3,
      });
      const topGuard = new THREE.Mesh(topGuardGeometry, topGuardMaterial);
      topGuard.position.y = 0;
      topSwordGroup.add(topGuard);
      
      // Handle
      const topHandleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12);
      const topHandleMaterial = new THREE.MeshStandardMaterial({
        color: 0x330000,
        metalness: 0.5,
        roughness: 0.6,
      });
      const topHandle = new THREE.Mesh(topHandleGeometry, topHandleMaterial);
      topHandle.position.y = 0.5;
      topHandle.rotation.z = Math.PI / 2;
      topSwordGroup.add(topHandle);
      
      // CREATE BOTTOM ENEMY SWORD (pointing up)
      const bottomSwordGroup = new THREE.Group();
      
      // Blade
      const bottomBladeGeometry = new THREE.BoxGeometry(0.25, 3.5, 0.1);
      const bottomBladeMaterial = new THREE.MeshStandardMaterial({
        color: 0x440000,
        emissive: 0xff0000,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.2,
      });
      const bottomBlade = new THREE.Mesh(bottomBladeGeometry, bottomBladeMaterial);
      bottomBlade.position.y = 1.75;
      bottomSwordGroup.add(bottomBlade);
      
      // Guard
      const bottomGuardGeometry = new THREE.BoxGeometry(1.2, 0.15, 0.15);
      const bottomGuardMaterial = new THREE.MeshStandardMaterial({
        color: 0x220000,
        metalness: 0.8,
        roughness: 0.3,
      });
      const bottomGuard = new THREE.Mesh(bottomGuardGeometry, bottomGuardMaterial);
      bottomGuard.position.y = 0;
      bottomSwordGroup.add(bottomGuard);
      
      // Handle
      const bottomHandleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12);
      const bottomHandleMaterial = new THREE.MeshStandardMaterial({
        color: 0x330000,
        metalness: 0.5,
        roughness: 0.6,
      });
      const bottomHandle = new THREE.Mesh(bottomHandleGeometry, bottomHandleMaterial);
      bottomHandle.position.y = -0.5;
      bottomHandle.rotation.z = Math.PI / 2;
      bottomSwordGroup.add(bottomHandle);
      
      // Create red glow for top sword
      const topGlowGeometry = new THREE.BoxGeometry(0.35, 3.7, 0.2);
      const topGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
      });
      const topGlowMesh = new THREE.Mesh(topGlowGeometry, topGlowMaterial);
      topGlowMesh.position.y = -1.75;
      
      // Create red glow for bottom sword
      const bottomGlowGeometry = new THREE.BoxGeometry(0.35, 3.7, 0.2);
      const bottomGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
      });
      const bottomGlowMesh = new THREE.Mesh(bottomGlowGeometry, bottomGlowMaterial);
      bottomGlowMesh.position.y = 1.75;
      
      // Position swords - spawn from right side
      const x = 15; // Far right
      const topY = 10 - 2 + gapCenterY; // Top of screen
      const bottomY = -10 + 2 + gapCenterY; // Bottom of screen
      
      topSwordGroup.position.set(x, topY, 0);
      topGlowMesh.position.set(x, topY, 0);
      bottomSwordGroup.position.set(x, bottomY, 0);
      bottomGlowMesh.position.set(x, bottomY, 0);
      
      sceneRef.current.add(topSwordGroup);
      sceneRef.current.add(topGlowMesh);
      sceneRef.current.add(bottomSwordGroup);
      sceneRef.current.add(bottomGlowMesh);
      
      // Move LEFT (horizontal scrolling)
      const velocityX = -ENEMY_SWORD_SPEED;
      
      // Add TOP enemy sword
      enemiesRef.current.push({
        mesh: topSwordGroup,
        glowMesh: topGlowMesh,
        x,
        y: topY,
        velocityX,
        velocityY: 0,
        type: 'enemy_sword',
        health: 4,
        rotation: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
      
      // Add BOTTOM enemy sword
      enemiesRef.current.push({
        mesh: bottomSwordGroup,
        glowMesh: bottomGlowMesh,
        x,
        y: bottomY,
        velocityX,
        velocityY: 0,
        type: 'enemy_sword',
        health: 4,
        rotation: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    } else if (type === 'laser') {
      // SIMPLE NEON RED LASER - Horizontal or Vertical, static with warning
      const isHorizontal = Math.random() < 0.5;
      const position = (Math.random() - 0.5) * 16; // Random position along axis
      
      // CREATE WARNING INDICATOR (flashing line)
      const warningGeometry = isHorizontal 
        ? new THREE.PlaneGeometry(25, 0.15) 
        : new THREE.PlaneGeometry(0.15, 25);
      const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const warning = new THREE.Mesh(warningGeometry, warningMaterial);
      
      if (isHorizontal) {
        warning.position.set(0, position, 0);
      } else {
        warning.position.set(position, 0, 0);
      }
      
      sceneRef.current.add(warning);
      
      // CREATE LASER BEAM (will be activated after warning)
      const laserGeometry = isHorizontal 
        ? new THREE.PlaneGeometry(25, LASER_WIDTH) 
        : new THREE.PlaneGeometry(LASER_WIDTH, 25);
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      
      if (isHorizontal) {
        laser.position.set(0, position, 0.1);
      } else {
        laser.position.set(position, 0, 0.1);
      }
      
      sceneRef.current.add(laser);
      
      // CREATE NEON GLOW EFFECT (outer glow)
      const glowGeometry = isHorizontal 
        ? new THREE.PlaneGeometry(25, LASER_WIDTH * 3) 
        : new THREE.PlaneGeometry(LASER_WIDTH * 3, 25);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      
      if (isHorizontal) {
        glow.position.set(0, position, 0.05);
      } else {
        glow.position.set(position, 0, 0.05);
      }
      
      sceneRef.current.add(glow);
      
      // Add laser to enemies array
      enemiesRef.current.push({
        mesh: laser,
        glowMesh: glow,
        laserWarning: warning,
        x: isHorizontal ? 0 : position,
        y: isHorizontal ? position : 0,
        velocityX: 0,
        velocityY: 0,
        type: 'laser',
        health: 999, // Indestructible
        rotation: 0,
        pulsePhase: 0,
        width: isHorizontal ? 25 : LASER_WIDTH,
        height: isHorizontal ? LASER_WIDTH : 25,
        laserActive: false,
      });
      
      // Schedule laser activation
      setTimeout(() => {
        // Activate laser
        (laser.material as THREE.MeshBasicMaterial).opacity = 0.9;
        (glow.material as THREE.MeshBasicMaterial).opacity = 0.5;
        
        // Update enemy to mark laser as active
        const enemy = enemiesRef.current.find(e => e.mesh === laser);
        if (enemy) {
          enemy.laserActive = true;
        }
        
        // Remove warning
        if (sceneRef.current) {
          sceneRef.current.remove(warning);
        }
        
        playSound(800, 0.2, 'square');
        
        // Deactivate and remove laser after duration
        setTimeout(() => {
          const enemy = enemiesRef.current.find(e => e.mesh === laser);
          if (enemy && sceneRef.current) {
            sceneRef.current.remove(laser);
            sceneRef.current.remove(glow);
            enemiesRef.current = enemiesRef.current.filter(e => e.mesh !== laser);
          }
        }, LASER_ACTIVE_TIME);
      }, LASER_WARNING_TIME);
    }
  }, [playSound]);

  // Create particle effect
  const createParticles = useCallback((x: number, y: number, color: number, count: number) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0);
      
      const angle = (Math.PI * 2 * i) / count;
      const speed = 0.05 + Math.random() * 0.05;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 0.05
      );
      
      sceneRef.current.add(mesh);
      
      particlesRef.current.push({
        mesh,
        velocity,
        life: 30,
        maxLife: 30,
      });
    }
    
    playSound(400 + Math.random() * 200, 0.1, 'square');
  }, [playSound]);

  // Start game
  const startGame = useCallback(() => {
    if (gameState === 'ready') {
      setGameState('countdown');
      let count = 3;
      
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        playSound(600, 0.1);
        
        if (count === 0) {
          clearInterval(interval);
          setGameState('playing');
          playSound(800, 0.2);
          lastFireballSpawnRef.current = Date.now();
          lastEnemySwordSpawnRef.current = Date.now();
          lastLaserSpawnRef.current = Date.now();
        }
      }, 1000);
    }
  }, [gameState, playSound]);

  // Mouse control - VERTICAL MOVEMENT + CLICK ROTATION
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerY = rect.height / 2;
      const mouseY = e.clientY - rect.top;
      
      // Direct cursor tracking - sword Y matches cursor Y exactly
      const normalizedY = (mouseY - centerY) / centerY; // -1 to 1
      const newTargetY = -normalizedY * SWORD_Y_RANGE; // Invert for intuitive control
      
      // Update sword position IMMEDIATELY for direct tracking
      if (swordGroupRef.current) {
        swordGroupRef.current.position.y = newTargetY;
      }
      
      setTargetY(newTargetY);
    };
    
    const handleClick = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      // Rotate 45 degrees per click
      setTargetAngle(prev => prev + ROTATION_STEP);
      setIsRotating(true);
      
      // Visual feedback
      playSound(700, 0.08, 'square');
      
      console.log('🗡️ Click rotation: +45°');
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [gameState, playSound]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const animate = () => {
      const delta = clockRef.current.getDelta();
      const now = Date.now();
      
      // Smooth sword rotation towards target angle + VERTICAL MOVEMENT
      if (swordGroupRef.current) {
        // Rotation (click-based, smooth interpolation)
        const currentAngle = swordGroupRef.current.rotation.z;
        let angleDiff = targetAngle - currentAngle;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Smooth interpolation with faster rotation speed
        const maxRotation = SWORD_ROTATION_SPEED;
        const rotationStep = Math.max(-maxRotation, Math.min(maxRotation, angleDiff * 0.2));
        swordGroupRef.current.rotation.z += rotationStep;
        
        // Note: Vertical movement is now handled directly in handleMouseMove for instant tracking
        
        // Pulse danger zones
        dangerZonesRef.current.forEach((zone, i) => {
          const pulse = Math.sin(now * 0.005 + i) * 0.2 + 0.8;
          zone.scale.set(pulse, pulse, pulse);
        });
      }
      
      // Spawn fireballs gradually (slower for skill-based gameplay)
      if (now - lastFireballSpawnRef.current > FIREBALL_SPAWN_RATE) {
        createEnemy('fireball');
        lastFireballSpawnRef.current = now;
      }
      
      // Spawn enemy sword pairs RARELY (high difficulty challenge)
      if (now - lastEnemySwordSpawnRef.current > ENEMY_SWORD_SPAWN_RATE) {
        createEnemy('enemy_sword');
        lastEnemySwordSpawnRef.current = now;
      }
      
      // Spawn lasers randomly (mixed timing for unpredictability)
      if (now - lastLaserSpawnRef.current > LASER_SPAWN_RATE) {
        createEnemy('laser');
        lastLaserSpawnRef.current = now;
      }
      
      // Update enemies
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        enemy.rotation += 0.05;
        enemy.mesh.position.set(enemy.x, enemy.y, 0);
        enemy.mesh.rotation.z = enemy.rotation;
        
        // Update glow mesh position
        if (enemy.glowMesh) {
          enemy.glowMesh.position.set(enemy.x, enemy.y, 0);
          enemy.glowMesh.rotation.z = enemy.rotation;
        }
        
        // ANIMATED FIRE EFFECTS
        if (enemy.type === 'fireball' && enemy.pulsePhase !== undefined) {
          // Fast flickering effect (like real fire)
          enemy.pulsePhase += 0.25;
          const flicker = Math.sin(enemy.pulsePhase) * 0.5 + 0.5; // 0 to 1
          const microFlicker = Math.sin(enemy.pulsePhase * 3.7) * 0.15; // High-frequency flicker
          const scale = 0.9 + flicker * 0.3 + microFlicker; // 0.75 to 1.35
          
          enemy.mesh.scale.set(scale, scale * 1.1, scale); // Elongate vertically like flame
          
          // Access fire layers for individual animation
          const fireGroup = enemy.mesh as THREE.Group;
          if (fireGroup.children && fireGroup.children.length === 3) {
            const [core, middle, outer] = fireGroup.children as THREE.Mesh[];
            
            // Animate each layer independently
            // Core (white-hot center) - brightest flicker
            (core.material as THREE.MeshBasicMaterial).opacity = 0.8 + flicker * 0.2;
            core.scale.set(1 + microFlicker, 1 + microFlicker * 1.5, 1);
            
            // Middle (orange) - medium flicker
            (middle.material as THREE.MeshBasicMaterial).opacity = 0.7 + flicker * 0.3;
            middle.scale.set(1 + microFlicker * 0.5, 1 + microFlicker, 1);
            
            // Outer (red) - most volatile
            (outer.material as THREE.MeshBasicMaterial).opacity = 0.5 + flicker * 0.4;
            outer.scale.set(1 - microFlicker * 0.3, 1 + microFlicker * 0.7, 1);
          }
          
          // Glow opacity flash (yellow aura)
          if (enemy.glowMesh) {
            (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + flicker * 0.5;
            enemy.glowMesh.scale.set(scale * 1.3, scale * 1.4, scale * 1.3);
          }
          
          // Create fire trail particles (20% chance per frame for denser trail)
          if (Math.random() < 0.2 && sceneRef.current) {
            const trailSize = 0.1 + Math.random() * 0.15;
            const trailGeometry = new THREE.SphereGeometry(trailSize, 6, 6);
            // Randomize colors based on fireball type
            let trailColor;
            if (enemy.isGreenFireball) {
              // Green fireball trail: bright greens
              const greenColors = [0xeeffee, 0x66ff00, 0x00ff22, 0x88ff00];
              trailColor = greenColors[Math.floor(Math.random() * greenColors.length)];
            } else {
              // Orange/red fireball trail: fire colors
              const fireColors = [0xffffee, 0xff6600, 0xff2200, 0xffaa00];
              trailColor = fireColors[Math.floor(Math.random() * fireColors.length)];
            }
            const trailMaterial = new THREE.MeshBasicMaterial({
              color: trailColor,
              transparent: true,
              opacity: 0.7,
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.set(
              enemy.x + (Math.random() - 0.5) * 0.3,
              enemy.y + (Math.random() - 0.5) * 0.3,
              0
            );
            sceneRef.current.add(trail);
            
            // Fade out trail
            let trailLife = 0;
            const fadeTrail = () => {
              trailLife += 0.05;
              if (trailLife < 1) {
                (trail.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - trailLife);
                trail.scale.multiplyScalar(0.95);
                requestAnimationFrame(fadeTrail);
              } else {
                if (sceneRef.current) {
                  sceneRef.current.remove(trail);
                }
              }
            };
            fadeTrail();
          }
        } else if (enemy.type === 'enemy_sword' && enemy.pulsePhase !== undefined) {
          // Enemy sword RED FLASHING effect (menacing)
          enemy.pulsePhase += 0.2; // Fast flash
          const flash = Math.sin(enemy.pulsePhase) * 0.5 + 0.5; // 0 to 1
          
          // Access sword group and flash the blade
          const swordGroup = enemy.mesh as THREE.Group;
          if (swordGroup.children && swordGroup.children.length > 0) {
            // Flash the blade (first child)
            const blade = swordGroup.children[0] as THREE.Mesh;
            if (blade && blade.material) {
              const emissiveIntensity = 0.5 + flash * 0.8; // Bright red flash
              (blade.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;
            }
          }
          
          // Glow flash (bright red warning)
          if (enemy.glowMesh) {
            (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + flash * 0.5;
          }
        } else if (enemy.type === 'laser') {
          // Laser warning animation (flashing before activation)
          if (enemy.laserWarning && sceneRef.current.children.includes(enemy.laserWarning)) {
            enemy.pulsePhase += 0.3; // Fast warning flash
            const warningFlash = Math.sin(enemy.pulsePhase) * 0.5 + 0.5;
            (enemy.laserWarning.material as THREE.MeshBasicMaterial).opacity = 0.2 + warningFlash * 0.6;
          }
          
          // Active laser pulsing (when active)
          if (enemy.laserActive) {
            enemy.pulsePhase += 0.2;
            const laserPulse = Math.sin(enemy.pulsePhase * 2) * 0.5 + 0.5;
            (enemy.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 + laserPulse * 0.15;
            
            // Glow intensity pulse
            if (enemy.glowMesh) {
              (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + laserPulse * 0.3;
            }
          }
        }
        
        // LASER COLLISION - Rectangle hitbox (accurate for horizontal/vertical)
        if (enemy.type === 'laser' && enemy.laserActive && swordGroupRef.current) {
          // Get sword handle position (danger zones) for damage check
          let hitHandle = false;
          
          dangerZonesRef.current.forEach(zone => {
            const zoneWorldPos = new THREE.Vector3();
            zone.getWorldPosition(zoneWorldPos);
            
            // Simple rectangle collision for horizontal/vertical lasers
            const halfWidth = (enemy.width || 0) / 2;
            const halfHeight = (enemy.height || 0) / 2;
            
            const inXRange = Math.abs(zoneWorldPos.x - enemy.x) < halfWidth + DANGER_ZONE_SIZE;
            const inYRange = Math.abs(zoneWorldPos.y - enemy.y) < halfHeight + DANGER_ZONE_SIZE;
            
            if (inXRange && inYRange) {
              hitHandle = true;
            }
          });
          
          if (hitHandle) {
            // Laser hit handle - LOSE HEART
            setHearts(prev => {
              const newHearts = prev - 1;
              console.log('⚡ LASER HIT HANDLE! Hearts remaining:', newHearts);
              if (newHearts <= 0) {
                setGameState('ended');
              }
              return newHearts;
            });
            playSound(150, 0.4, 'sawtooth');
            
            // Flash effect
            if (sceneRef.current && enemy.glowMesh) {
              (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
            }
            
            // Don't remove laser, just register hit
            return true;
          }
        }
        
        // Check collision with danger zones (handle only) - BIGGER HIT RADIUS
        if (swordGroupRef.current && enemy.type !== 'laser') {
          let hitDangerZone = false;
          
          dangerZonesRef.current.forEach(zone => {
            const zoneWorldPos = new THREE.Vector3();
            zone.getWorldPosition(zoneWorldPos);
            
            const distance = Math.sqrt(
              Math.pow(enemy.x - zoneWorldPos.x, 2) +
              Math.pow(enemy.y - zoneWorldPos.y, 2)
            );
            
            // Much larger hit detection radius
            if (distance < DANGER_ZONE_HIT_RADIUS) {
              hitDangerZone = true;
              console.log('💥 DANGER ZONE HIT! Distance:', distance.toFixed(2), 'Type:', enemy.type);
            }
          });
          
          if (hitDangerZone) {
            // Hit danger zone - lose heart
            setHearts(prev => {
              const newHearts = prev - 1;
              console.log('❤️ Heart lost! Remaining:', newHearts);
              if (newHearts <= 0) {
                setGameState('ended');
              }
              return newHearts;
            });
            playSound(200, 0.3, 'sawtooth');
            createParticles(enemy.x, enemy.y, 0xff0000, 20);
            
            // Cleanup enemy and glow
            if (sceneRef.current) {
              sceneRef.current.remove(enemy.mesh);
              if (enemy.glowMesh) {
                sceneRef.current.remove(enemy.glowMesh);
              }
            }
            return false;
          }
          
          // Check collision with blade (rest of sword) - CAN DESTROY ENEMIES
          const swordWorldPos = new THREE.Vector3();
          swordGroupRef.current.getWorldPosition(swordWorldPos);
          
          const toEnemy = new THREE.Vector2(enemy.x - swordWorldPos.x, enemy.y - swordWorldPos.y);
          const swordAngle = swordGroupRef.current.rotation.z;
          const swordDir = new THREE.Vector2(Math.sin(swordAngle), -Math.cos(swordAngle));
          
          const projection = toEnemy.dot(swordDir);
          const perpDist = Math.abs(toEnemy.x * swordDir.y - toEnemy.y * swordDir.x);
          
          // Larger blade hitbox for better gameplay
          if (projection > -2.5 && projection < 2.5 && perpDist < 0.6) {
            // Hit blade - damage enemy
            enemy.health--;
            
            if (enemy.health <= 0) {
              // DESTROYED! Calculate PRECISION DECIMAL SCORING
              let points = 0;
              
              if (enemy.type === 'fireball') {
                // PRECISION SCORING: Closer to blade TIP = more points
                // Get blade tip position (top of blade, ~2 units up from center)
                const bladeTipY = swordWorldPos.y + 2;
                const bladeTipX = swordWorldPos.x;
                
                // Calculate distance from blade TIP to enemy
                const tipDistance = Math.sqrt(
                  Math.pow(enemy.x - bladeTipX, 2) +
                  Math.pow(enemy.y - bladeTipY, 2)
                );
                
                // Precision multiplier: 1.0x at far, up to 3.0x at perfect tip cut
                // Max blade length is ~4 units, so distances 0-4
                const maxDist = 4;
                const normalizedDist = Math.min(tipDistance / maxDist, 1.0);
                const precisionMultiplier = 1.0 + (1.0 - normalizedDist) * 2.0; // 1.0 to 3.0x
                
                // Base points * precision multiplier = decimal score
                const basePoints = enemy.basePoints || 10;
                points = basePoints * precisionMultiplier;
                
                // Particle color based on fireball type
                const particleColor = enemy.isGreenFireball ? 0x00ff88 : 0xff8800;
                createParticles(enemy.x, enemy.y, particleColor, 25);
                
                console.log(`🎯 Fireball destroyed! Base: ${basePoints}, Tip dist: ${tipDistance.toFixed(2)}, Multiplier: ${precisionMultiplier.toFixed(2)}x, Points: ${points.toFixed(2)}`);
              } else if (enemy.type === 'enemy_sword') {
                // Enemy swords: flat 35 points (already high value)
                points = 35;
                createParticles(enemy.x, enemy.y, 0xff0000, 25);
                console.log('⚔️ Enemy sword destroyed: +35 points');
              }
              
              setScore(prev => parseFloat((prev + points).toFixed(2)));
              setEnemiesDestroyed(prev => prev + 1);
              
              playSound(800, 0.15, 'sine');
              
              // Cleanup
              if (sceneRef.current) {
                sceneRef.current.remove(enemy.mesh);
                if (enemy.glowMesh) {
                  sceneRef.current.remove(enemy.glowMesh);
                }
              }
              return false;
            } else {
              // Damaged but not destroyed - flash brightly
              if (enemy.type === 'fireball') {
                // Fireball damage flash
                const fireGroup = enemy.mesh as THREE.Group;
                if (fireGroup.children && fireGroup.children[0]) {
                  const core = fireGroup.children[0] as THREE.Mesh;
                  (core.material as THREE.MeshBasicMaterial).opacity = 1.0;
                }
              } else {
                // Enemy sword damage flash
                const swordGroup = enemy.mesh as THREE.Group;
                if (swordGroup.children && swordGroup.children[0]) {
                  const blade = swordGroup.children[0] as THREE.Mesh;
                  (blade.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
                }
              }
              playSound(700, 0.1, 'square');
            }
          }
        }
        
        // Remove if off screen
        if (Math.abs(enemy.x) > 20 || Math.abs(enemy.y) > 15) {
          if (sceneRef.current) {
            sceneRef.current.remove(enemy.mesh);
            if (enemy.glowMesh) {
              sceneRef.current.remove(enemy.glowMesh);
            }
          }
          return false;
        }
        
        return true;
      });
      
      // Update particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.mesh.position.add(particle.velocity);
        particle.velocity.y -= 0.002; // Gravity
        particle.life--;
        
        const alpha = particle.life / particle.maxLife;
        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        (particle.mesh.material as THREE.MeshBasicMaterial).transparent = true;
        
        if (particle.life <= 0) {
          if (sceneRef.current) {
            sceneRef.current.remove(particle.mesh);
          }
          return false;
        }
        return true;
      });
      
      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState, targetAngle, createEnemy, createParticles, playSound]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      setGameTimer(prev => {
        if (prev <= 1) {
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState]);

  // Handle game end
  useEffect(() => {
    if (gameState === 'ended') {
      playSound(300, 1, 'triangle');
      setTimeout(() => {
        onGameEnd({
          score,
          accuracy: enemiesDestroyed > 0 ? Math.min(100, (enemiesDestroyed / (enemiesDestroyed + (3 - hearts))) * 100) : 0,
        });
      }, 2000);
    }
  }, [gameState, score, enemiesDestroyed, hearts, onGameEnd, playSound]);

  // Keyboard control
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'ready') {
        startGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, startGame]);

  return (
    <div className="relative w-full h-screen bg-[#0a0e1a] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="text-white text-4xl font-bold drop-shadow-lg">
              Score: {score}
            </div>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`text-4xl ${i < hearts ? 'opacity-100' : 'opacity-20'}`}
                >
                  ❤️
                </div>
              ))}
            </div>
            <div className="text-cyan-400 text-2xl font-bold">
              ⚔️ Destroyed: {enemiesDestroyed}
            </div>
          </div>
          
          <div className="text-white text-3xl font-bold drop-shadow-lg">
            ⏱️ {gameTimer}s
          </div>
        </div>
      </div>
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}
      
      {/* Ready screen - SCROLLABLE */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/70 text-white overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-start py-12 px-4">
            <h1 className="text-6xl font-bold mb-8 text-cyan-400 animate-pulse">
              ⚔️ BLADE BOUNCE 3D
            </h1>
            <p className="text-2xl mb-4 text-cyan-300">🖱️ Move mouse to control sword position</p>
            <p className="text-2xl mb-4 text-cyan-300">🖱️ Click anywhere to rotate 45°</p>
            <div className="mb-6 bg-black/40 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-lg mb-2">🔥 <span className="text-orange-400">Orange Fireballs</span> (10-30 pts) - Tip cuts = 3x multiplier!</p>
              <p className="text-lg mb-2">💚 <span className="text-green-400">GREEN Fireballs</span> (25-75 pts!) - RARE! Tip cuts = huge points!</p>
              <p className="text-lg mb-2">⚔️ <span className="text-red-400">Enemy Swords</span> (35 pts) - Rare pairs, flashing red</p>
              <p className="text-lg mb-2">⚡ <span className="text-red-500">Red Lasers</span> - Warning flash, then AVOID! Horizontal/Vertical</p>
              <p className="text-lg mb-2">💔 <span className="text-red-300">Laser hits handle</span> = LOSE HEART!</p>
              <p className="text-lg mb-2">🎯 <span className="text-cyan-400">PRECISION</span> = Decimal scores for fair competition!</p>
              <p className="text-lg mb-2 text-red-400">⚠️ <span className="font-bold">Red circles (handle) = vulnerable spot</span></p>
            </div>
            <p className="text-2xl mb-4">❤️ 3 hearts - protect your handle!</p>
            <p className="text-3xl font-bold text-yellow-400 mb-8 animate-pulse">{GAME_DURATION} seconds - Survive & Score!</p>
            <button
              onClick={startGame}
              className="px-12 py-6 bg-cyan-500 hover:bg-cyan-600 text-white text-3xl font-bold rounded-lg transition-all transform hover:scale-110 pointer-events-auto mb-8"
            >
              START GAME
            </button>
          </div>
        </div>
      )}
      
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-6 right-6 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all pointer-events-auto"
      >
        EXIT
      </button>
    </div>
  );
}

