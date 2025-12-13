'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameInput, GameSession } from '@/types/gameSession';
import SuspiciousActivityWarning from '@/components/warnings/SuspiciousActivityWarning';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
console.log('');
console.log('🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️');
console.log('🗡️ BLADE BOUNCE v8.0 - BUILD 20251127-1900');
console.log('🗡️ If you see this, NEW CODE IS RUNNING!');
console.log('🔒 Audit logs WILL be sent to admin dashboard');
console.log('🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️');
console.log('');

/**
 * BLADE BOUNCE 3D - Professional WebGL Sword Defense Game
 * - Full 3D sword with smooth 45° rotation
 * - Red danger zones only on sword HANDLE (hilt)
 * - 3 hearts system with visual feedback
 * - Realistic physics and smooth animations
 * - Multiple enemy types with varied behaviors
 * - SERVER-SIDE VALIDATION with input recording for anti-cheat
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
  isGreenFireball?: boolean; // Special high-value green fireball
  basePoints?: number; // Base point value before precision multiplier
  isVertical?: boolean; // For laser orientation
  spawnTime?: number; // When laser was created
  isDangerous?: boolean; // True when laser is red (active)
  hasDealtDamage?: boolean; // True if enemy sword has already dealt damage (prevents multiple hits)
}

interface Particle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface BladeBounce3DProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void; // Make optional to match other games
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
  gameSession?: GameSession; // For server-side validation
}

const GAME_DURATION = 60;
const SWORD_ROTATION_SPEED = 0.15; // Much faster rotation for smooth 45° clicks
const ROTATION_STEP = Math.PI / 4; // 45 degrees per click
const FIREBALL_SPAWN_RATE_START = 1200; // ms between fireballs at start (was 1800)
const ENEMY_SWORD_SPAWN_RATE_START = 5000; // ms between swords at start (was 8000)
const DIFFICULTY_RAMP_INTERVAL = 10; // Increase difficulty every 10 seconds
const EXTREME_MODE_START = 50; // Last 10 seconds = EXTREME MODE
const HANDLE_DANGER_ZONES = 4; // Number of red circles on handle + pommel
const DANGER_ZONE_SIZE = 0.8; // VERY LARGE danger zones for easy hit detection
const DANGER_ZONE_HIT_RADIUS = 1.2; // Hit detection radius (larger than visual)
const ENEMY_SWORD_ROTATION_BASE = 0.08; // Base rotation speed for enemy swords (faster)
const ENEMY_SWORD_ROTATION_INCREASE = 0.03; // Rotation speed increase per difficulty tier (more aggressive)
const SWORD_MOVE_SPEED = 1.0; // Full mouse tracking speed
const SWORD_X_RANGE = 25; // Horizontal movement range - MAXIMUM for ENTIRE window edge-to-edge
const SWORD_Y_RANGE = 20; // Vertical movement range - MAXIMUM for ENTIRE window edge-to-edge
const ENEMY_SWORD_GAP = 7; // Gap between top and bottom enemy swords
const ENEMY_SWORD_SPEED_BASE = 0.08; // Base movement speed (faster)
const ENEMY_SWORD_BLADE_DAMAGE = true; // Sword blades hurt player's handle
const HEART_BONUS_POINTS = 100; // Points per heart remaining at end
const BLADE_TIP_THRESHOLD = 1.5; // Projection distance for "tip" hits
const BLADE_TIP_MULTIPLIER = 5.0; // Max multiplier for perfect tip hits (was 3.0)
const LASER_SPAWN_RATE = 2500; // ms between laser spawns (was 4000 - much faster!)
const LASER_WARNING_TIME = 1500; // ms laser stays blue (warning - shorter!)
const LASER_ACTIVE_TIME = 1200; // ms laser stays red (dangerous - shorter!)
const LASER_LENGTH = 22; // Length of laser beam (longer)
const LASER_WIDTH = 0.4; // Width of laser beam (thicker - more visible)
const LASER_POINTS = 20; // Points for destroying a laser (increased reward)

export default function BladeBounce3D({
  onGameEnd,
  onExit,
  listingId,
  entryNumber,
  isCompetitionMode = false,
  gameId,
  gameSession,
}: BladeBounce3DProps) {
  console.log('🎯 [BladeBounce3D] Component initialized', {
    isCompetitionMode,
    hasOnGameEnd: !!onGameEnd,
    hasOnExit: !!onExit,
    hasGameSession: !!gameSession,
    listingId,
    entryNumber,
    gameId
  });

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
  const extremeModeTriggeredRef = useRef<boolean>(false);
  
  // Input recording for server-side validation
  const inputsRef = useRef<GameInput[]>([]);
  const gameStartTimeRef = useRef<number>(0);
  const isValidatingRef = useRef<boolean>(false);
  const gameStateRef = useRef<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const lastClickTimeRef = useRef<number>(0); // For click debouncing
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null); // Background music during gameplay
  const audioContextRef = useRef<AudioContext | null>(null); // For victory sound
  const audioUnlockedRef = useRef(false); // Track if audio is unlocked
  
  // In competition mode, skip ready screen and countdown - start playing immediately
  const initialGameState = isCompetitionMode ? 'playing' : 'ready';
  console.log('🎯 [BladeBounce3D] Initial game state:', initialGameState);
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>(initialGameState);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [enemiesDestroyed, setEnemiesDestroyed] = useState(0);
  const [gameTimer, setGameTimer] = useState(GAME_DURATION);
  const [targetAngle, setTargetAngle] = useState(0);
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [showSuspicionWarning, setShowSuspicionWarning] = useState(false);
  const [suspicionScore, setSuspicionScore] = useState(0);
  
  // Audio unlock mechanism for browser autoplay restrictions
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Create a silent buffer and play it to unlock audio context
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Also try to unlock HTMLAudioElement
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.play().then(() => {
          backgroundMusicRef.current?.pause();
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.currentTime = 0;
          }
          audioUnlockedRef.current = true;
          console.log('✅ [BladeBounce3D] Audio unlocked');
        }).catch(() => {
          // Ignore - will try again on game start
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }, []);

  // Setup background music for gameplay
  useEffect(() => {
    // Create audio element for mouseblade.mp3
    const audio = new Audio('/mouseblade.mp3');
    audio.loop = true;
    audio.volume = 0.7; // Set volume to 70% for better audibility
    audio.preload = 'auto'; // Preload the audio
    
    // Add error handling and logging
    audio.addEventListener('error', (e) => {
      console.warn('⚠️ [BladeBounce3D] Audio file error (non-critical):', e);
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('✅ [BladeBounce3D] Background music loaded successfully');
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ [BladeBounce3D] Background music ready to play');
    });
    
    backgroundMusicRef.current = audio;
    
    // Cleanup on unmount
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = '';
        backgroundMusicRef.current = null;
      }
    };
  }, []);
  
  // Play background music when game starts (during gameplay)
  useEffect(() => {
    if (gameState === 'playing' && backgroundMusicRef.current) {
      // Unlock audio first if needed
      if (!audioUnlockedRef.current) {
        unlockAudio();
      }
      
      // Play music on loop when game starts
      try {
        const audio = backgroundMusicRef.current;
        
        // Ensure audio is loaded
        if (audio.readyState < 2) {
          try {
            audio.load();
          } catch (e) {
            // Ignore load errors
          }
        }
        
        // Play music on loop when game starts
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ [BladeBounce3D] Background music started playing on game start');
              audioUnlockedRef.current = true;
            })
            .catch((err) => {
              console.warn('⚠️ [BladeBounce3D] Audio play failed, will retry:', err);
              // Try again after a short delay
              setTimeout(() => {
                if (backgroundMusicRef.current && gameState === 'playing') {
                  backgroundMusicRef.current.play()
                    .then(() => {
                      audioUnlockedRef.current = true;
                      console.log('✅ [BladeBounce3D] Background music started on retry');
                    })
                    .catch(() => {
                      // Final attempt failed - that's okay
                    });
                }
              }, 500);
            });
        }
      } catch (err) {
        // Audio failed - game continues normally
        console.warn('⚠️ [BladeBounce3D] Audio play failed (non-critical)');
      }
    } else if (gameState !== 'playing' && backgroundMusicRef.current) {
      // Stop music when game is not playing
      try {
        backgroundMusicRef.current.pause();
        if (gameState === 'ended') {
          // Reset to beginning for next game
          backgroundMusicRef.current.currentTime = 0;
        }
      } catch (e) {
        // Ignore pause errors
      }
    }
  }, [gameState, unlockAudio]);
  
  // Play victory sound when game ends
  useEffect(() => {
    if (gameState === 'ended') {
      // Play victory sound effect when game ends
      try {
        // Create a victory sound using Web Audio API (copyright-free)
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        
        // Victory fanfare: ascending notes
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (C major chord)
        
        const playNote = (frequency: number, time: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, ctx.currentTime + time);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 0.3);
        };
        
        // Play victory fanfare
        notes.forEach((freq, i) => {
          playNote(freq, i * 0.15);
        });
        
        console.log('🎉 [BladeBounce3D] Victory sound played');
      } catch (err) {
        // Victory sound failed - game continues normally
        console.warn('⚠️ [BladeBounce3D] Victory sound failed (non-critical)');
      }
    }
  }, [gameState]);

  // Sync game state to ref for animation loop (MUST be after all state declarations)
  useEffect(() => {
    gameStateRef.current = gameState;
    console.log('🔄 [BladeBounce3D] Game state updated:', gameState);
    
    // CRITICAL: Immediately stop everything when game ends
    if (gameState === 'ended') {
      console.log('🛑 [BladeBounce3D] EMERGENCY SHUTDOWN INITIATED');
      
      // 1. Cancel animation frame IMMEDIATELY
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = undefined;
        console.log('⚠️ [BladeBounce3D] ✓ Animation frame canceled');
      }
      
      // 2. Clear all enemies immediately
      if (enemiesRef.current.length > 0) {
        console.log('🧹 [BladeBounce3D] Cleaning up', enemiesRef.current.length, 'enemies');
        enemiesRef.current.forEach(enemy => {
          if (sceneRef.current) {
            try {
              sceneRef.current.remove(enemy.mesh);
              if (enemy.glowMesh) {
                sceneRef.current.remove(enemy.glowMesh);
              }
            } catch (e) {
              // Ignore errors during cleanup
            }
          }
        });
        enemiesRef.current = [];
        console.log('⚠️ [BladeBounce3D] ✓ All enemies removed');
      }
      
      // 3. Clear danger zones
      if (dangerZonesRef.current.length > 0 && sceneRef.current) {
        dangerZonesRef.current.forEach(zone => {
          try {
            sceneRef.current?.remove(zone);
          } catch (e) {
            // Ignore errors
          }
        });
        dangerZonesRef.current = [];
        console.log('⚠️ [BladeBounce3D] ✓ Danger zones cleared');
      }
      
      // 4. Stop any pending renders
      if (rendererRef.current) {
        try {
          rendererRef.current.setAnimationLoop(null);
          console.log('⚠️ [BladeBounce3D] ✓ Renderer stopped');
        } catch (e) {
          // Ignore errors
        }
      }
      
      console.log('✅ [BladeBounce3D] EMERGENCY SHUTDOWN COMPLETE');
    }
  }, [gameState]);
  
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

    console.log('🎨 [BladeBounce3D] Initializing Three.js scene');

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    console.log('📐 [BladeBounce3D] Container size:', { width, height });

    // Scene with ANIMATED GRADIENT BACKGROUND
    const scene = new THREE.Scene();
    
    // Create animated gradient background using a large plane
    const bgGeometry = new THREE.PlaneGeometry(50, 50);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0a0520) }, // Deep purple
        color2: { value: new THREE.Color(0x1a0a30) }, // Dark purple
        color3: { value: new THREE.Color(0x0a1030) }, // Deep blue
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          float wave1 = sin(uv.x * 3.0 + time * 0.5) * 0.5 + 0.5;
          float wave2 = cos(uv.y * 4.0 - time * 0.3) * 0.5 + 0.5;
          float wave3 = sin((uv.x + uv.y) * 2.0 + time * 0.7) * 0.5 + 0.5;
          
          vec3 color = mix(color1, color2, wave1);
          color = mix(color, color3, wave2 * wave3);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -10;
    scene.add(bgMesh);
    
    // Store background material for animation
    const bgMaterialRef = bgMaterial;

    // Camera - use container dimensions
    const camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    camera.position.z = 20;

    // Renderer - use container dimensions
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Style canvas to prevent overflow and ensure proper fit
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    
    container.appendChild(renderer.domElement);

    console.log('✅ [BladeBounce3D] Renderer initialized');

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
      
      // Position along handle length AND pommel (extend to bottom)
      const handleStart = -1.4; // Extended to cover pommel at -1.3
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
    
    // Store background material reference for animation
    (scene as any).bgMaterial = bgMaterialRef;

    // Handle resize - use container dimensions
    const handleResize = () => {
      if (!camera || !renderer || !container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      console.log('📐 [BladeBounce3D] Resized to:', { newWidth, newHeight });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      console.log('🧹 [BladeBounce3D] Cleaned up Three.js scene');
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
        // NEON GREEN FLAME FIREBALL - Ultra bright magical appearance!
        // Inner BLAZING white core
        const coreGeometry = new THREE.SphereGeometry(fireballSize * 0.25, 12, 12);
        const coreMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1.0,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.scale.set(1, 1.2, 1);
        fireGroup.add(core);
        
        // NEON CYAN inner layer (electric!)
        const cyanGeometry = new THREE.SphereGeometry(fireballSize * 0.45, 16, 16);
        const cyanMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 1.0, // FULLY OPAQUE for max brightness
        });
        const cyan = new THREE.Mesh(cyanGeometry, cyanMaterial);
        cyan.scale.set(1, 1.3, 1);
        fireGroup.add(cyan);
        
        // NEON LIME layer (super vivid!)
        const limeGeometry = new THREE.SphereGeometry(fireballSize * 0.7, 20, 20);
        const limeMaterial = new THREE.MeshBasicMaterial({
          color: 0xaaff00, // Brighter lime
          transparent: true,
          opacity: 1.0, // FULLY OPAQUE
        });
        const lime = new THREE.Mesh(limeGeometry, limeMaterial);
        lime.scale.set(1, 1.4, 1);
        fireGroup.add(lime);
        
        // NEON GREEN outer layer (glowing!)
        const greenGeometry = new THREE.SphereGeometry(fireballSize, 24, 24);
        const greenMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00, // Pure bright green
          transparent: true,
          opacity: 0.95, // Almost fully opaque
        });
        const green = new THREE.Mesh(greenGeometry, greenMaterial);
        green.scale.set(1, 1.5, 1);
        fireGroup.add(green);
        
        // BRIGHT outer glow (neon green aura)
        const glowGeometry = new THREE.SphereGeometry(fireballSize * 1.6, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x66ff00,
          transparent: true,
          opacity: 0.5, // Brighter glow!
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.set(1, 1.6, 1);
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
      
      // NEON BRIGHT FLAME FIREBALL - Ultra bright with flashing!
      // Inner NEON white core (blazing bright!)
      const coreGeometry = new THREE.SphereGeometry(fireballSize * 0.25, 12, 12);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.scale.set(1, 1.2, 1);
      fireGroup.add(core);
      
      // NEON BRIGHT yellow layer (intense!)
      const yellowGeometry = new THREE.SphereGeometry(fireballSize * 0.45, 16, 16);
      const yellowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 1.0, // FULLY OPAQUE for brightness
      });
      const yellow = new THREE.Mesh(yellowGeometry, yellowMaterial);
      yellow.scale.set(1, 1.3, 1);
      fireGroup.add(yellow);
      
      // NEON BRIGHT orange layer (super vivid!)
      const orangeGeometry = new THREE.SphereGeometry(fireballSize * 0.7, 20, 20);
      const orangeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600, // Brighter orange
        transparent: true,
        opacity: 1.0, // FULLY OPAQUE
      });
      const orange = new THREE.Mesh(orangeGeometry, orangeMaterial);
      orange.scale.set(1, 1.4, 1);
      fireGroup.add(orange);
      
      // NEON BRIGHT red outer layer (electric!)
      const redGeometry = new THREE.SphereGeometry(fireballSize, 24, 24);
      const redMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Pure bright red
        transparent: true,
        opacity: 0.95, // Almost fully opaque
      });
      const red = new THREE.Mesh(redGeometry, redMaterial);
      red.scale.set(1, 1.5, 1);
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
      
      // RANDOM SPAWN POSITIONS - anywhere around the edges
      const spawnSide = Math.floor(Math.random() * 4); // 0=right, 1=left, 2=top, 3=bottom
      let x, topY, bottomY, velocityX, velocityY;
      
      if (spawnSide === 0) {
        // Spawn from RIGHT
        x = 15;
        topY = (Math.random() - 0.5) * 16; // Random Y
        bottomY = topY + ENEMY_SWORD_GAP;
        velocityX = -ENEMY_SWORD_SPEED_BASE;
        velocityY = (Math.random() - 0.5) * ENEMY_SWORD_SPEED_BASE * 0.5; // Diagonal movement
      } else if (spawnSide === 1) {
        // Spawn from LEFT
        x = -15;
        topY = (Math.random() - 0.5) * 16;
        bottomY = topY + ENEMY_SWORD_GAP;
        velocityX = ENEMY_SWORD_SPEED_BASE;
        velocityY = (Math.random() - 0.5) * ENEMY_SWORD_SPEED_BASE * 0.5;
      } else if (spawnSide === 2) {
        // Spawn from TOP
        x = (Math.random() - 0.5) * 20;
        topY = 12;
        bottomY = topY + ENEMY_SWORD_GAP;
        velocityX = (Math.random() - 0.5) * ENEMY_SWORD_SPEED_BASE * 0.5;
        velocityY = -ENEMY_SWORD_SPEED_BASE;
      } else {
        // Spawn from BOTTOM
        x = (Math.random() - 0.5) * 20;
        topY = -12 - ENEMY_SWORD_GAP;
        bottomY = -12;
        velocityX = (Math.random() - 0.5) * ENEMY_SWORD_SPEED_BASE * 0.5;
        velocityY = ENEMY_SWORD_SPEED_BASE;
      }
      
      topSwordGroup.position.set(x, topY, 0);
      topGlowMesh.position.set(x, topY, 0);
      bottomSwordGroup.position.set(x, bottomY, 0);
      bottomGlowMesh.position.set(x, bottomY, 0);
      
      sceneRef.current.add(topSwordGroup);
      sceneRef.current.add(topGlowMesh);
      sceneRef.current.add(bottomSwordGroup);
      sceneRef.current.add(bottomGlowMesh);
      
      // Add TOP enemy sword
      enemiesRef.current.push({
        mesh: topSwordGroup,
        glowMesh: topGlowMesh,
        x,
        y: topY,
        velocityX,
        velocityY, // Now can move vertically!
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
        velocityY, // Now can move vertically!
        type: 'enemy_sword',
        health: 4,
        rotation: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    } else if (type === 'laser') {
      // LASER DODGE STYLE LASERS - Blue warning, then red danger
      const isVertical = Math.random() > 0.5; // 50% chance vertical or horizontal
      
      // Random position
      const x = (Math.random() - 0.5) * (SWORD_X_RANGE * 1.5); // Spread across play area
      const y = (Math.random() - 0.5) * (SWORD_Y_RANGE * 1.5);
      
      // Create laser beam
      const laserGeometry = isVertical 
        ? new THREE.BoxGeometry(LASER_WIDTH, LASER_LENGTH, 0.1)
        : new THREE.BoxGeometry(LASER_LENGTH, LASER_WIDTH, 0.1);
      
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Start BRIGHT CYAN (more visible!)
        transparent: true,
        opacity: 0.9, // Much brighter!
      });
      
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      laser.position.set(x, y, 0);
      
      // Create BRIGHTER glow effect
      const glowGeometry = isVertical
        ? new THREE.BoxGeometry(LASER_WIDTH * 3, LASER_LENGTH * 1.1, 0.2)
        : new THREE.BoxGeometry(LASER_LENGTH * 1.1, LASER_WIDTH * 3, 0.2);
      
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6, // Brighter glow!
      });
      
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.set(x, y, -0.1);
      
      sceneRef.current.add(laser);
      sceneRef.current.add(glowMesh);
      
      // Add laser to enemies
      enemiesRef.current.push({
        mesh: laser,
        glowMesh: glowMesh,
        x,
        y,
        velocityX: 0, // Lasers don't move
        velocityY: 0,
        type: 'laser',
        health: 1, // One hit to destroy
        rotation: 0,
        isVertical,
        spawnTime: Date.now(),
        isDangerous: false, // Starts as blue (safe)
      });
      
      // Laser spawned (log removed for performance)
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

  // Initialize spawn timers when starting in 'playing' state (competition mode)
  useEffect(() => {
    if (gameState === 'playing' && lastFireballSpawnRef.current === 0) {
      // Initialize spawn timers for competition mode auto-start
      lastFireballSpawnRef.current = Date.now();
      lastEnemySwordSpawnRef.current = Date.now();
      lastLaserSpawnRef.current = Date.now();
      extremeModeTriggeredRef.current = false;
      console.log('🎮 [BladeBounce] Initialized for competition mode');
    }
  }, [gameState]);

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
          const now = Date.now();
          lastFireballSpawnRef.current = now;
          lastEnemySwordSpawnRef.current = now;
          lastLaserSpawnRef.current = now;
          gameStartTimeRef.current = now; // Start input recording
          inputsRef.current = []; // Clear inputs
          extremeModeTriggeredRef.current = false; // Reset for new game
          console.log('🎯 [BladeBounce3D] Started input recording at', now);
        }
      }, 1000);
    }
  }, [gameState, playSound]);

  // Initialize game start time for competition mode (starts immediately in 'playing' state)
  useEffect(() => {
    if (gameState === 'playing' && gameStartTimeRef.current === 0) {
      const now = Date.now();
      gameStartTimeRef.current = now;
      inputsRef.current = [];
      lastFireballSpawnRef.current = now;
      lastEnemySwordSpawnRef.current = now;
      lastLaserSpawnRef.current = now;
      console.log('🎯 [BladeBounce3D] Competition mode: Started input recording at', now);
    }
  }, [gameState]);

  // Mouse control - BLADE FOLLOWS CURSOR EVERYWHERE (window-level tracking)
  useEffect(() => {
    const container = containerRef.current;
    const canvas = rendererRef.current?.domElement;
    if (!container || !canvas) return;

    console.log('🖱️ [BladeBounce3D] Attaching mouse events to WINDOW for full tracking');
    
    let lastMoveRecordTime = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      const rect = canvas.getBoundingClientRect();
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Get mouse position relative to canvas (works even when cursor is outside!)
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // BLADE FOLLOWS CURSOR EXACTLY - Clamp to playable area but track anywhere
      const normalizedX = Math.max(-1, Math.min(1, (mouseX - centerX) / centerX));
      const normalizedY = Math.max(-1, Math.min(1, (mouseY - centerY) / centerY));
      const newTargetX = normalizedX * SWORD_X_RANGE;
      const newTargetY = -normalizedY * SWORD_Y_RANGE;
      
      // THROTTLE input recording (every 16ms = ~60fps) to reduce data overhead
      const now = Date.now();
      if (gameSession && gameStartTimeRef.current > 0 && now - lastMoveRecordTime > 16) {
        lastMoveRecordTime = now;
        inputsRef.current.push({
          timestamp: now - gameStartTimeRef.current,
          type: 'move',
          data: {
            x: normalizedX * 100,
            y: normalizedY * 100
          }
        });
      }
      
      // Update sword position with SMOOTH interpolation
      if (swordGroupRef.current) {
        const lerpFactor = 0.25; // Smooth following
        swordGroupRef.current.position.x += (newTargetX - swordGroupRef.current.position.x) * lerpFactor;
        swordGroupRef.current.position.y += (newTargetY - swordGroupRef.current.position.y) * lerpFactor;
      }
      
      setTargetX(newTargetX);
      setTargetY(newTargetY);
    };
    
    const handleClick = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      
      // DEBOUNCE - Prevent rapid click glitches (50ms minimum between rotations)
      const now = Date.now();
      if (now - lastClickTimeRef.current < 50) {
        console.log('🚫 Click ignored - too fast (debounced)');
        return;
      }
      lastClickTimeRef.current = now;
      
      // Record input for server-side validation
      if (gameSession && gameStartTimeRef.current > 0) {
        inputsRef.current.push({
          timestamp: Date.now() - gameStartTimeRef.current,
          type: 'rotate',
          data: {
            angle: targetAngle + ROTATION_STEP
          }
        });
      }
      
      // Rotate 45 degrees per click
      setTargetAngle(prev => prev + ROTATION_STEP);
      setIsRotating(true);
      
      // Visual feedback
      playSound(700, 0.08, 'square');
      
      console.log('🗡️ Click rotation: +45°');
    };
    
    // TOUCH SUPPORT for mobile devices
    const handleTouchMove = (e: TouchEvent) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      // Same logic as mouse
      const normalizedX = (touchX - centerX) / centerX;
      const normalizedY = (touchY - centerY) / centerY;
      const newTargetX = normalizedX * SWORD_X_RANGE;
      const newTargetY = -normalizedY * SWORD_Y_RANGE;
      
      // Record input for server-side validation
      if (gameSession && gameStartTimeRef.current > 0) {
        inputsRef.current.push({
          timestamp: Date.now() - gameStartTimeRef.current,
          type: 'move',
          data: {
            x: normalizedX * 100,
            y: normalizedY * 100
          }
        });
      }
      
      if (swordGroupRef.current) {
        swordGroupRef.current.position.x = newTargetX;
        swordGroupRef.current.position.y = newTargetY;
      }
      
      setTargetX(newTargetX);
      setTargetY(newTargetY);
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (gameState !== 'playing') return;
      e.preventDefault();
      
      // Record input for server-side validation
      if (gameSession && gameStartTimeRef.current > 0) {
        inputsRef.current.push({
          timestamp: Date.now() - gameStartTimeRef.current,
          type: 'rotate',
          data: {
            angle: targetAngle + ROTATION_STEP
          }
        });
      }
      
      // Rotate on tap
      setTargetAngle(prev => prev + ROTATION_STEP);
      setIsRotating(true);
      playSound(700, 0.08, 'square');
      console.log('📱 Touch rotation: +45°');
    };
    
    // Attach mouse events to WINDOW (tracks everywhere!) and touch to canvas
    window.addEventListener('mousemove', handleMouseMove); // Window-level tracking!
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    // Make canvas focusable
    canvas.tabIndex = 0;
    
    // Hide cursor ONLY during gameplay - the BLADE IS the cursor!
    if (gameState === 'playing') {
      document.body.style.cursor = 'none';
      container.style.cursor = 'none';
      console.log('🖱️ [BladeBounce3D] Cursor hidden - blade is now your cursor!');
    } else {
      document.body.style.cursor = 'default'; // Show cursor on menus
      container.style.cursor = 'default';
      console.log('🖱️ [BladeBounce3D] Cursor visible on menu');
    }
    
    console.log('📱 [BladeBounce3D] WINDOW-LEVEL mouse tracking enabled! Sword follows cursor anywhere!');
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove); // Clean up window listener
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      document.body.style.cursor = ''; // Always restore cursor when unmounting
      
      console.log('🧹 [BladeBounce3D] Removed mouse and touch events');
    };
  }, [gameState, playSound]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let isActive = true; // Track if this animation loop should continue
    
    const animate = () => {
      // CRITICAL: Exit immediately if animation should stop (use ref for real-time state)
      if (!isActive || gameStateRef.current !== 'playing') {
        console.log('🛑 [BladeBounce3D] Animation loop stopping - isActive:', isActive, 'gameState:', gameStateRef.current);
        // Clean up animation frame reference
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = undefined;
        }
        return;
      }
      
      const delta = clockRef.current.getDelta();
      const now = Date.now();
      
      // ANIMATE BACKGROUND GRADIENT
      if (sceneRef.current && (sceneRef.current as any).bgMaterial) {
        (sceneRef.current as any).bgMaterial.uniforms.time.value = now * 0.001;
      }
      
      // Calculate time elapsed from timer (GAME_DURATION - gameTimer)
      const timeElapsed = GAME_DURATION - gameTimer;
      
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
      
      // PROGRESSIVE DIFFICULTY - Spawn rates increase every 10 seconds (MORE AGGRESSIVE)
      const difficultyTier = Math.floor(timeElapsed / DIFFICULTY_RAMP_INTERVAL);
      const shouldBeExtreme = timeElapsed >= EXTREME_MODE_START;
      
      // Calculate current spawn rates (INSANELY fast as game progresses)
      // Tier 0: 1200ms, Tier 1: 800ms, Tier 2: 400ms (min) - MUCH FASTER!
      const fireballRate = Math.max(400, FIREBALL_SPAWN_RATE_START - (difficultyTier * 400));
      // Tier 0: 5000ms, Tier 1: 3500ms, Tier 2: 2000ms, Tier 3: 1500ms (min) - MUCH MORE AGGRESSIVE!
      const swordRate = Math.max(1500, ENEMY_SWORD_SPAWN_RATE_START - (difficultyTier * 1500));
      
      // EXTREME MODE: Last 10 seconds - spawn rate DOUBLES!
      const extremeMultiplier = shouldBeExtreme ? 0.5 : 1.0;
      const currentFireballRate = fireballRate * extremeMultiplier;
      const currentSwordRate = swordRate * extremeMultiplier;
      
      // CAP MAX ENEMIES for performance (prevent spawn spam)
      const maxEnemies = 15; // Max enemies on screen at once
      
      // Spawn fireballs with progressive difficulty
      if (enemiesRef.current.length < maxEnemies && now - lastFireballSpawnRef.current > currentFireballRate) {
        createEnemy('fireball');
        lastFireballSpawnRef.current = now;
      }
      
      // Spawn enemy swords with progressive difficulty
      if (enemiesRef.current.length < maxEnemies && now - lastEnemySwordSpawnRef.current > currentSwordRate) {
        createEnemy('enemy_sword');
        lastEnemySwordSpawnRef.current = now;
      }
      
      // Play sound when extreme mode activates (once)
      if (shouldBeExtreme && !extremeModeTriggeredRef.current) {
        extremeModeTriggeredRef.current = true;
        playSound(1000, 0.3, 'sawtooth');
        console.log('🔥 EXTREME MODE ACTIVATED!');
      }
      
      // Spawn lasers
      if (now - lastLaserSpawnRef.current > LASER_SPAWN_RATE) {
        createEnemy('laser');
        lastLaserSpawnRef.current = now;
      }
      
      // Update enemies (skip if game ended to prevent freeze)
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        // If game ended, clean up and remove all enemies immediately (use ref for real-time state)
        if (!isActive || gameStateRef.current !== 'playing') {
          if (sceneRef.current) {
            sceneRef.current.remove(enemy.mesh);
            if (enemy.glowMesh) {
              sceneRef.current.remove(enemy.glowMesh);
            }
          }
          return false;
        }
        
        // FRAME-INDEPENDENT movement for smooth gameplay
        enemy.x += enemy.velocityX * (delta * 60);
        enemy.y += enemy.velocityY * (delta * 60);
        
        // Rotate enemy swords faster as difficulty increases (FRAME-INDEPENDENT)
        if (enemy.type === 'enemy_sword') {
          const rotationSpeed = ENEMY_SWORD_ROTATION_BASE + (difficultyTier * ENEMY_SWORD_ROTATION_INCREASE);
          enemy.rotation += rotationSpeed * (delta * 60);
        } else {
          enemy.rotation += 0.05 * (delta * 60);
        }
        
        enemy.mesh.position.set(enemy.x, enemy.y, 0);
        
        // Lasers don't rotate
        if (enemy.type !== 'laser') {
          enemy.mesh.rotation.z = enemy.rotation;
        }
        
        // Update glow mesh position
        if (enemy.glowMesh) {
          enemy.glowMesh.position.set(enemy.x, enemy.y, 0);
          if (enemy.type !== 'laser') {
            enemy.glowMesh.rotation.z = enemy.rotation;
          }
        }
        
        // NEON BRIGHT FLASHING FIRE EFFECTS!
        if (enemy.type === 'fireball' && enemy.pulsePhase !== undefined) {
          // INTENSE flashing effect + fast flickering (FRAME-INDEPENDENT)
          enemy.pulsePhase += 0.35 * (delta * 60);
          const flash = Math.sin(enemy.pulsePhase * 2.0) * 0.3 + 0.7; // BRIGHT flashing 0.7 to 1.0
          const flicker = Math.sin(enemy.pulsePhase) * 0.5 + 0.5; // 0 to 1
          const microFlicker = Math.sin(enemy.pulsePhase * 4.0) * 0.2; // Faster micro-flicker
          const scale = 0.95 + flicker * 0.4 + microFlicker; // Bigger variation
          
          enemy.mesh.scale.set(scale, scale * 1.1, scale);
          
          // Access fire layers for BRIGHT individual animation
          const fireGroup = enemy.mesh as THREE.Group;
          if (fireGroup.children && fireGroup.children.length === 3) {
            const [core, middle, outer] = fireGroup.children as THREE.Mesh[];
            
            // BRIGHT flashing on all layers!
            // Core - BLAZING flashing
            (core.material as THREE.MeshBasicMaterial).opacity = 0.95 + flash * 0.05; // Always bright!
            core.scale.set(1 + microFlicker * 1.5, 1 + microFlicker * 2.0, 1);
            
            // Middle layer - BRIGHT flashing!
            (middle.material as THREE.MeshBasicMaterial).opacity = 0.9 + flash * 0.1; // Brighter!
            middle.scale.set(1 + microFlicker * 0.8, 1 + microFlicker * 1.2, 1);
            
            // Outer layer - INTENSE flashing!
            (outer.material as THREE.MeshBasicMaterial).opacity = 0.85 + flash * 0.15; // Much brighter!
            outer.scale.set(1 + microFlicker * 0.5, 1 + microFlicker * 1.0, 1);
          }
          
          // Glow BRIGHT flashing (neon aura)!
          if (enemy.glowMesh) {
            (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + flash * 0.4; // Brighter glow!
            enemy.glowMesh.scale.set(scale * 1.3, scale * 1.4, scale * 1.3);
          }
          
          // Create fire trail particles (5% chance per frame - OPTIMIZED for performance)
          if (Math.random() < 0.05 && sceneRef.current) {
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
          // Enemy sword RED FLASHING effect (menacing, FRAME-INDEPENDENT)
          enemy.pulsePhase += 0.2 * (delta * 60);
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
        } else if (enemy.type === 'laser' && enemy.spawnTime) {
          // LASER STATE: Blue warning -> Red danger -> Disappear
          const timeAlive = now - enemy.spawnTime;
          
          if (timeAlive < LASER_WARNING_TIME) {
            // BLUE PHASE (Warning - harmless) - VERY BRIGHT!
            enemy.isDangerous = false;
            const pulse = Math.sin(now * 0.015) * 0.15 + 0.85; // Stronger pulsing effect
            (enemy.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * pulse; // Much brighter!
            if (enemy.glowMesh) {
              (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * pulse; // Brighter glow!
            }
          } else if (timeAlive < LASER_WARNING_TIME + LASER_ACTIVE_TIME) {
            // RED PHASE (Dangerous!) - VERY BRIGHT!
            if (!enemy.isDangerous) {
              enemy.isDangerous = true;
              // Change to BRIGHT RED
              (enemy.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
              if (enemy.glowMesh) {
                (enemy.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
              }
              playSound(900, 0.15, 'square'); // Louder warning sound
              console.log('⚡ ⚠️ LASER TURNED RED (DANGEROUS!) ⚠️');
            }
            
            // Flash rapidly when red - VERY VISIBLE!
            const flash = Math.sin(now * 0.03) * 0.25 + 0.75; // Faster flashing
            (enemy.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * flash; // Bright!
            if (enemy.glowMesh) {
              (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * flash; // Bright glow!
            }
          } else {
            // EXPIRED - Remove laser
            if (sceneRef.current) {
              sceneRef.current.remove(enemy.mesh);
              if (enemy.glowMesh) {
                sceneRef.current.remove(enemy.glowMesh);
              }
            }
            return false; // Remove from array
          }
        }
        
        // Check if ENEMY SWORD BLADE hits ANYWHERE along player's ENTIRE BLADE!
        if (ENEMY_SWORD_BLADE_DAMAGE && enemy.type === 'enemy_sword' && swordGroupRef.current && !enemy.hasDealtDamage) {
          const swordWorldPos = new THREE.Vector3();
          swordGroupRef.current.getWorldPosition(swordWorldPos);
          
          // Check if enemy sword blade intersects ENTIRE player blade (-1.5 to +4.0)
          // This covers: Pommel (-1.3), Handle (-1.2 to -0.2), Guard (0), Blade (+0 to +4)
          const isNearBlade = Math.abs(enemy.x - swordWorldPos.x) < 2.5 && // Wider hit area
                              (enemy.y - swordWorldPos.y) > -1.6 && // Bottom (pommel)
                              (enemy.y - swordWorldPos.y) < 4.2;   // Top (blade tip)
          
          if (isNearBlade) {
            // Enemy sword blade hit player's blade! Lose 1 heart only!
            const hitArea = (enemy.y - swordWorldPos.y) > 1.0 ? 'BLADE' : 
                          (enemy.y - swordWorldPos.y) > -0.2 ? 'GUARD/HANDLE' : 'POMMEL';
            
            setHearts(prev => {
              const newHearts = prev - 1;
              console.log(`⚔️ ENEMY SWORD HIT ${hitArea}! Heart lost! Remaining:`, newHearts);
              if (newHearts <= 0) {
                setGameState('ended');
              }
              return newHearts;
            });
            playSound(200, 0.3, 'sawtooth');
            createParticles(enemy.x, enemy.y, 0xff0000, 40); // More particles!
            
            // Mark that this sword has dealt damage so it can't hit again
            enemy.hasDealtDamage = true;
            
            // Remove enemy sword after hitting (prevents multiple hits)
            if (sceneRef.current) {
              sceneRef.current.remove(enemy.mesh);
              if (enemy.glowMesh) {
                sceneRef.current.remove(enemy.glowMesh);
              }
            }
            
            console.log('⚔️ Enemy sword removed after dealing 1 heart damage!');
            return false; // Remove from array
          }
        }
        
        // Check collision with danger zones (handle only) - BIGGER HIT RADIUS
        if (swordGroupRef.current) {
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
          
          // Check collision with blade (ENTIRE SWORD - tip to hilt) - CAN DESTROY ENEMIES
          const swordWorldPos = new THREE.Vector3();
          swordGroupRef.current.getWorldPosition(swordWorldPos);
          
          const toEnemy = new THREE.Vector2(enemy.x - swordWorldPos.x, enemy.y - swordWorldPos.y);
          const swordAngle = swordGroupRef.current.rotation.z;
          const swordDir = new THREE.Vector2(Math.sin(swordAngle), -Math.cos(swordAngle));
          
          const projection = toEnemy.dot(swordDir);
          const perpDist = Math.abs(toEnemy.x * swordDir.y - toEnemy.y * swordDir.x);
          
          // Check for TIP HIT first (more precise, instant kill)
          const isTipHit = projection >= BLADE_TIP_THRESHOLD && projection <= 3 && perpDist < 0.6;
          
          // FULL SWORD HITBOX - from tip to hilt (entire 4+ unit blade length)
          // Projection: -3 (hilt) to +3 (tip), perpDist: 1.0 (wide enough for entire blade)
          if (projection > -3 && projection < 3 && perpDist < 1.0) {
            // TIP HITS = Instant kill! Blade hits = normal damage
            const damageAmount = isTipHit ? 999 : 1;
            enemy.health -= damageAmount;
            
            // Visual feedback for tip hits
            if (isTipHit && enemy.health > 0) {
              playSound(1200, 0.1, 'sine'); // High-pitched "ting" sound
            }
            
            if (enemy.health <= 0) {
              // DESTROYED! Calculate PRECISION DECIMAL SCORING
              let points = 0;
              
              if (enemy.type === 'fireball') {
                // PRECISION SCORING: Closer to blade TIP = MUCH more points
                // Get blade tip position (top of blade, ~2 units up from center)
                const bladeTipY = swordWorldPos.y + 2;
                const bladeTipX = swordWorldPos.x;
                
                // Calculate distance from blade TIP to enemy
                const tipDistance = Math.sqrt(
                  Math.pow(enemy.x - bladeTipX, 2) +
                  Math.pow(enemy.y - bladeTipY, 2)
                );
                
                // ENHANCED Precision multiplier: 1.0x at far, up to 5.0x at perfect tip cut!
                // Max blade length is ~4 units, so distances 0-4
                const maxDist = 4;
                const normalizedDist = Math.min(tipDistance / maxDist, 1.0);
                
                // Exponential scaling for better rewards at tip
                // Perfect tip (0.0 dist) = 5.0x, Mid blade (0.5 dist) = 2.5x, Base (1.0 dist) = 1.0x
                const precisionMultiplier = 1.0 + (1.0 - normalizedDist) * (BLADE_TIP_MULTIPLIER - 1.0);
                
                // Base points * precision multiplier = decimal score
                const basePoints = enemy.basePoints || 10;
                points = basePoints * precisionMultiplier;
                
                // Particle color and count based on fireball type and precision
                const particleColor = enemy.isGreenFireball ? 0x00ff88 : 0xff8800;
                const particleCount = isTipHit ? 40 : 25; // More particles for tip hits
                createParticles(enemy.x, enemy.y, particleColor, particleCount);
                
                // Special sound for perfect tip hits
                if (isTipHit) {
                  playSound(1400, 0.15, 'sine'); // Extra high-pitched success sound
                }
                
                const hitType = isTipHit ? '🎯 TIP HIT!' : 'Blade hit';
                console.log(`${hitType} Fireball destroyed! Base: ${basePoints}, Tip dist: ${tipDistance.toFixed(2)}, Multiplier: ${precisionMultiplier.toFixed(2)}x, Points: ${points.toFixed(2)}`);
              } else if (enemy.type === 'enemy_sword') {
                // Enemy swords: More points for tip hits
                const basePoints = 35;
                points = isTipHit ? basePoints * 1.5 : basePoints; // 52.5 pts for tip hits!
                createParticles(enemy.x, enemy.y, 0xff0000, isTipHit ? 40 : 25);
                
                const hitType = isTipHit ? '🎯 TIP HIT!' : '';
                console.log(`⚔️ ${hitType} Enemy sword destroyed: +${points.toFixed(2)} points`);
              } else if (enemy.type === 'laser') {
                // Lasers: Give points only if blue (safe), lose heart if red (dangerous)
                if (!enemy.isDangerous) {
                  // BLUE laser - give points!
                  points = LASER_POINTS;
                  createParticles(enemy.x, enemy.y, 0x00aaff, 30);
                  playSound(1100, 0.1, 'sine');
                  console.log(`⚡ Blue laser destroyed: +${LASER_POINTS} points!`);
                } else {
                  // RED laser - hitting it hurts you!
                  setHearts(prev => {
                    const newHearts = prev - 1;
                    console.log('💥 Hit RED laser! Heart lost! Remaining:', newHearts);
                    if (newHearts <= 0) {
                      console.log('💀 All hearts lost! Ending game...');
                      setGameState('ended');
                    }
                    return newHearts;
                  });
                  playSound(300, 0.3, 'sawtooth');
                  points = 0; // No points for hitting red laser
                  createParticles(enemy.x, enemy.y, 0xff0000, 30);
                  console.log('⚡ RED laser hit - lost a heart!');
                }
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
      isActive = false; // Stop the animation loop
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        console.log('🧹 [BladeBounce3D] Animation frame canceled');
      }
    };
  }, [gameState, targetAngle, gameTimer, createEnemy, createParticles, playSound]);

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

  // Handle game end with HEART BONUS and server-side validation
  useEffect(() => {
    if (gameState === 'ended' && !isValidatingRef.current) {
      console.log('🏁 [BladeBounce3D] Game ended - processing results...');
      isValidatingRef.current = true; // Prevent double submission
      
      try {
        playSound(300, 1, 'triangle');
      } catch (e) {
        console.error('Sound error:', e);
      }
      
      // Calculate heart bonus
      const heartBonus = hearts * HEART_BONUS_POINTS;
      const finalScore = parseFloat((score + heartBonus).toFixed(2));
      const finalAccuracy = enemiesDestroyed > 0 ? Math.min(100, (enemiesDestroyed / (enemiesDestroyed + (3 - hearts))) * 100) : 0;
      
      // Update score with heart bonus
      if (heartBonus > 0) {
        setScore(finalScore);
        console.log(`💚 HEART BONUS: +${heartBonus} points (${hearts} hearts × ${HEART_BONUS_POINTS})`);
      }
      
      // Process immediately (no delay - audit must complete!)
      (async () => {
        try {
          // Helper function to log game and call onGameEnd
          const logAndEndGame = async (finalScoreValue: number, finalAccuracyValue: number) => {
            // 🔒 AUTO-AUDIT: Log to admin audit system (required for fair skill-based gaming)
            console.log('');
            console.log('🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️');
            console.log('🗡️ BLADE BOUNCE: LOGGING TO AUDIT SYSTEM');
            console.log('🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️🗡️');
            console.log('🎯 [BladeBounce] Game ended, preparing to log audit...');
            console.log('🎯 [BladeBounce] Final score:', finalScoreValue, 'Accuracy:', finalAccuracyValue);
          
          const gameDuration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
          
          try {
            const auditResult = await logGameCompletion({
              gameType: GAME_TYPES.BLADE_BOUNCE,
              gameMode: gameSession ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
              score: finalScoreValue,
              accuracy: finalAccuracyValue,
              reactionTime: 0,
              durationSeconds: gameDuration,
              additionalData: {
                hearts,
                enemiesDestroyed,
                listingId,
                entryNumber,
                isCompetitionMode,
                gameId,
                sessionId: gameSession?.sessionId
              }
            });
            console.log('🎯 [BladeBounce] Audit result:', auditResult);
          } catch (error) {
            console.error('🎯 [BladeBounce] Audit logging failed:', error);
          }
          
          onGameEnd({
            score: finalScoreValue,
            accuracy: finalAccuracyValue,
          });
        };
        
        // If gameSession is provided, validate server-side
        if (gameSession) {
          console.log('🔒 [BladeBounce3D] Submitting game for server-side validation...', {
            sessionId: gameSession.sessionId,
            inputCount: inputsRef.current.length,
            clientScore: finalScore,
            duration: Date.now() - gameStartTimeRef.current
          });
          
          try {
            const response = await fetch('/api/game-session/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: gameSession.sessionId,
                token: gameSession.token,
                inputs: inputsRef.current,
                clientScore: finalScore,
                clientAccuracy: finalAccuracy,
                duration: Date.now() - gameStartTimeRef.current
              })
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.valid) {
              console.error('❌ [BladeBounce3D] Validation failed:', result.reason);
              console.warn('⚠️ [BladeBounce3D] Using client score despite validation failure');
              // Don't fail the game - use client score as fallback
              await logAndEndGame(finalScore, finalAccuracy);
            } else {
              console.log('✅ [BladeBounce3D] Game validated successfully:', {
                serverScore: result.serverScore,
                clientScore: finalScore,
                scoreDiff: Math.abs(result.serverScore - finalScore),
                suspicionScore: result.suspicionScore,
                showWarning: result.showWarning
              });
              
              // Show warning if gameplay was suspicious
              if (result.showWarning && result.suspicionScore) {
                setSuspicionScore(result.suspicionScore);
                setShowSuspicionWarning(true);
                console.warn('⚠️ [BladeBounce3D] Showing suspicion warning to user');
              }
              
              // Use server-validated score
              await logAndEndGame(result.serverScore, result.accuracy || finalAccuracy);
            }
          } catch (error) {
            console.error('❌ [BladeBounce3D] Validation error:', error);
            console.warn('⚠️ [BladeBounce3D] Continuing with client score despite validation error');
            // Don't fail the game - use client score as fallback
            await logAndEndGame(finalScore, finalAccuracy);
          }
        } else {
          // No validation required (practice mode)
          console.log('🎮 [BladeBounce3D] Practice mode - no validation required');
          await logAndEndGame(finalScore, finalAccuracy);
        }
          } catch (error) {
            console.error('❌ [BladeBounce3D] Error in game end processing:', error);
            // Still try to end the game even if there's an error
            try {
              onGameEnd({
                score: finalScore,
                accuracy: finalAccuracy,
              });
            } catch (e) {
              console.error('❌ [BladeBounce3D] Fatal error calling onGameEnd:', e);
            }
          }
        })(); // Immediately invoke async function
    }
  }, [gameState, score, enemiesDestroyed, hearts, onGameEnd, playSound, gameSession, onExit, listingId, entryNumber, isCompetitionMode, gameId]);

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
    <div className="fixed inset-0 w-full h-full bg-[#0a0e1a] overflow-hidden" style={{ margin: 0, padding: 0 }}>
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          touchAction: 'none', // Prevent touch scrolling
          userSelect: 'none' // Prevent text selection
        }}
      />
      
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
        
        {/* EXTREME MODE INDICATOR */}
        {gameState === 'playing' && gameTimer <= 10 && (
          <div className="mt-4 text-center animate-pulse">
            <div className="text-red-500 text-5xl font-black drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
              🔥 EXTREME MODE 🔥
            </div>
            <div className="text-orange-400 text-xl font-bold mt-2">
              DOUBLE SPAWN RATE!
            </div>
          </div>
        )}
      </div>
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}
      
      {/* Ready screen - SCROLLABLE + CLICK TO START */}
      {gameState === 'ready' && (
        <div 
          className="absolute inset-0 bg-black/70 text-white overflow-y-auto"
        >
          {/* Clickable background overlay */}
          <div 
            className="fixed inset-0 cursor-pointer z-0"
            onClick={startGame}
          />
          
          <div className="absolute top-8 left-0 right-0 z-50 pointer-events-none">
            <div className="text-center bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-3xl sm:text-4xl font-black py-4 px-8 rounded-full inline-block animate-pulse shadow-2xl">
              🖱️ CLICK ANYWHERE TO START 🖱️
            </div>
          </div>
          <div 
            className="min-h-full flex flex-col items-center justify-start py-12 px-4 relative z-10 cursor-pointer"
            onClick={startGame}
          >
            <h1 className="text-6xl font-bold mb-8 text-cyan-400 animate-pulse pt-20">
              ⚔️ BLADE BOUNCE 3D
            </h1>
            <p className="text-3xl mb-4 text-cyan-300 font-bold">🖱️ MOUSE: Sword follows cursor EVERYWHERE across entire window!</p>
            <p className="text-2xl mb-4 text-cyan-300">🖱️ Full screen range - move to all edges! Click to rotate 45°</p>
            <p className="text-3xl mb-4 text-pink-400 font-bold">📱 MOBILE: Touch & drag to move sword!</p>
            <p className="text-2xl mb-4 text-pink-400">📱 Tap anywhere to rotate 45°</p>
            <div className="mb-6 bg-black/40 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-lg mb-2">🔥 <span className="text-orange-400 font-bold animate-pulse">NEON BRIGHT Orange Fireballs</span> (10-50 pts) - FLASHING! Tip cuts = 5x!</p>
              <p className="text-lg mb-2">💚 <span className="text-green-400 font-bold animate-pulse">NEON BRIGHT Green Fireballs</span> (25-125 pts!) - RARE! GLOWING!</p>
              <p className="text-lg mb-2">⚔️ <span className="text-red-400 font-bold">Enemy Swords</span> (35-52.5 pts) - MOVE EVERYWHERE! Blades hit ENTIRE sword!</p>
              <p className="text-lg mb-2">⚡ <span className="text-cyan-400 font-bold animate-pulse">BRIGHT CYAN Lasers</span> ({LASER_POINTS} pts) - Harmless! Hit for points!</p>
              <p className="text-lg mb-2">⚡ <span className="text-red-600 font-bold animate-pulse">BRIGHT RED Lasers</span> = AVOID! LOSE HEART!</p>
              <p className="text-lg mb-2">🎯 <span className="text-cyan-400 font-bold">TIP HITS = INSTANT KILL + MAX POINTS!</span></p>
              <p className="text-lg mb-2">🎯 <span className="text-cyan-400">PRECISION</span> = Decimal scores for fair competition!</p>
              <p className="text-lg mb-2 text-red-400">⚠️ <span className="font-bold">Red circles (handle + pommel) = vulnerable!</span></p>
              <p className="text-lg mb-2 text-purple-400">💚 <span className="font-bold">HEART BONUS</span> = +{HEART_BONUS_POINTS} pts per heart!</p>
              <p className="text-lg mb-2 text-purple-400">✨ <span className="font-bold">Animated gradient background + particle effects!</span></p>
            </div>
            <div className="mb-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-xl font-bold text-orange-300 mb-2">📈 PROGRESSIVE DIFFICULTY</p>
              <p className="text-lg text-orange-200">Spawn rates increase every {DIFFICULTY_RAMP_INTERVAL} seconds!</p>
            </div>
            <div className="mb-6 bg-gradient-to-r from-red-600/30 to-orange-600/30 border-2 border-red-600 rounded-lg p-4 max-w-2xl mx-auto animate-pulse">
              <p className="text-2xl font-black text-red-400 mb-2">🔥 EXTREME MODE 🔥</p>
              <p className="text-lg text-orange-300">Last 10 seconds = DOUBLE SPAWN RATE!</p>
            </div>
            <p className="text-2xl mb-4">❤️ 3 hearts - protect your handle!</p>
            <p className="text-3xl font-bold text-yellow-400 mb-8 animate-pulse">{GAME_DURATION} seconds - Survive & Score!</p>
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
      
      {/* Suspicious Activity Warning Modal */}
      {showSuspicionWarning && (
        <SuspiciousActivityWarning
          suspicionScore={suspicionScore}
          onClose={() => setShowSuspicionWarning(false)}
          onContactSupport={() => {
            setShowSuspicionWarning(false);
            // TODO: Open support modal or navigate to support page
            window.location.href = '/support';
          }}
        />
      )}
    </div>
  );
}

