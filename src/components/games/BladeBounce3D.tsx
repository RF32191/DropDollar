'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GameInput, GameSession } from '@/types/gameSession';
import SuspiciousActivityWarning from '@/components/warnings/SuspiciousActivityWarning';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';
import GameThemeSelector from './GameThemeSelector';
import { GameTheme, getSavedTheme } from '@/lib/gameThemes';
import { useMultiplayerLobby } from '@/hooks/useMultiplayerLobby';
import { useAuth } from '@/contexts/AuthContext';

// Player colors for multiplayer
const PLAYER_SWORD_COLORS = [
  { blade: 0x00ffff, glow: 0x00ccff, name: 'Cyan' },    // Player 1
  { blade: 0xff00ff, glow: 0xff44ff, name: 'Magenta' }, // Player 2
  { blade: 0x00ff00, glow: 0x44ff44, name: 'Green' },   // Player 3
  { blade: 0xffd700, glow: 0xffec8b, name: 'Gold' },    // Player 4
];

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251220-XMAS-HALLOWEEN-THEMES 🔥🔥🔥
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
  theme?: GameTheme;
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
  theme: initialTheme,
}: BladeBounce3DProps) {
  const [currentTheme, setCurrentTheme] = useState<GameTheme>(() => initialTheme || getSavedTheme());
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
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
  const gameStateRef = useRef<'menu' | 'matchmaking' | 'lobby' | 'ready' | 'waiting' | 'countdown' | 'playing' | 'ended'>('menu');
  const lastClickTimeRef = useRef<number>(0); // For click debouncing
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null); // Background music during gameplay
  const audioUnlockedRef = useRef(false); // Track if audio is unlocked
  const gyroEnabledRef = useRef<boolean>(false); // Gyroscope control enabled
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null); // Base gyro position
  
  // Auth and multiplayer
  const { user } = useAuth();
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo');
  
  // Multiplayer hook
  const lobby = useMultiplayerLobby(
    'blade-bounce',
    user?.id,
    user?.email?.split('@')[0] || 'Player'
  );
  
  // Other players' swords for multiplayer
  const [otherPlayers, setOtherPlayers] = useState<Map<string, { x: number; y: number; angle: number; score: number; hearts: number; isAlive: boolean }>>(new Map());
  const myPlayerIndexRef = useRef(0);
  const lastPositionSentRef = useRef(0);
  
  // Synchronized start for multiplayer
  const [waitingForPlayers, setWaitingForPlayers] = useState(false);
  const [playersReady, setPlayersReady] = useState<Set<string>>(new Set());
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState<number | null>(null);
  
  // In competition mode, skip ready screen and countdown - start playing immediately
  const initialGameState = isCompetitionMode ? 'playing' : 'menu';
  console.log('🎯 [BladeBounce3D] Initial game state:', initialGameState);
  
  const [gameState, setGameState] = useState<'menu' | 'matchmaking' | 'lobby' | 'ready' | 'waiting' | 'countdown' | 'playing' | 'ended'>(initialGameState);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [showGyroNotification, setShowGyroNotification] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [gyroConfirmStep, setGyroConfirmStep] = useState(0); // 0 = not clicked, 1 = first tap, 2 = confirmed
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [enemiesDestroyed, setEnemiesDestroyed] = useState(0);
  
  // CoD-style floating score indicators
  const { popups, addPopup, removePopup } = useFloatingScores();
  const addPopupRef = useRef(addPopup);
  addPopupRef.current = addPopup;
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

  // Setup background music for gameplay - theme-aware
  useEffect(() => {
    // Choose audio file based on theme
    const audioFile = currentTheme === 'halloween' 
      ? '/halloween-blade-bounce.mp3'
      : currentTheme === 'christmas'
      ? '/blade-bounce-christmas-song.mp3'
      : '/mouseblade.mp3';
    
    console.log(`🎵 [BladeBounce3D] Loading ${currentTheme} theme music: ${audioFile}`);
    
    const audio = new Audio(audioFile);
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
    
    // Cleanup on unmount or theme change
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = '';
        backgroundMusicRef.current = null;
      }
    };
  }, [currentTheme]);
  
  // Play background music when game starts (during countdown AND gameplay) - also re-trigger on theme change
  useEffect(() => {
    // Start music during countdown OR playing - don't wait for gameplay to begin
    if ((gameState === 'countdown' || gameState === 'playing') && backgroundMusicRef.current) {
      // Unlock audio first if needed
      if (!audioUnlockedRef.current) {
        unlockAudio();
      }
      
      // Only play if not already playing
      const audio = backgroundMusicRef.current;
      
      if (audio.paused) {
        try {
          // Reset to beginning only on countdown start (not countdown->playing transition)
          if (gameState === 'countdown') {
            audio.currentTime = 0;
          }
          
          // Ensure audio is loaded
          if (audio.readyState < 2) {
            try {
              audio.load();
            } catch (e) {
              // Ignore load errors
            }
          }
          
          // Play music immediately
          console.log(`🎵 [BladeBounce3D] Starting ${currentTheme} theme music during ${gameState}...`);
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log(`✅ [BladeBounce3D] ${currentTheme} background music playing!`);
                audioUnlockedRef.current = true;
              })
              .catch((err) => {
                console.warn('⚠️ [BladeBounce3D] Audio play failed, will retry:', err);
                // Try again after a short delay
                setTimeout(() => {
                  if (backgroundMusicRef.current && (gameState === 'countdown' || gameState === 'playing')) {
                    backgroundMusicRef.current.play()
                      .then(() => {
                        audioUnlockedRef.current = true;
                        console.log(`✅ [BladeBounce3D] ${currentTheme} background music started on retry`);
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
      }
    } else if (gameState !== 'countdown' && gameState !== 'playing' && backgroundMusicRef.current) {
      // Stop music only when game is ended or in ready/waiting states
      try {
        backgroundMusicRef.current.pause();
        if (gameState === 'ended' || gameState === 'ready') {
          // Reset to beginning for next game
          backgroundMusicRef.current.currentTime = 0;
        }
      } catch (e) {
        // Ignore pause errors
      }
    }
  }, [gameState, currentTheme, unlockAudio]);
  
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

  // Initialize Three.js scene - recreate when theme changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    // If scene already exists, dispose it first (for theme changes)
    if (sceneRef.current && rendererRef.current) {
      console.log('🔄 [BladeBounce3D] Theme changed, recreating scene...');
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      swordGroupRef.current = null;
      enemiesRef.current = [];
      dangerZonesRef.current = [];
    }

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

    // Camera - use container dimensions, zoomed out further for better view
    const isMobileDevice = width < 768;
    const camera = new THREE.PerspectiveCamera(
      isMobileDevice ? 70 : 65, // Wider FOV for mobile
      width / height,
      0.1,
      1000
    );
    camera.position.z = isMobileDevice ? 32 : 28; // Zoomed out more, even more on mobile

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

    // Create sword - THEMED based on currentTheme
    const swordGroup = new THREE.Group();
    
    if (currentTheme === 'christmas') {
      // CANDY CANE sword!
      // Main candy cane body (curved J shape simulated with cylinder)
      const caneGeometry = new THREE.CylinderGeometry(0.2, 0.2, 4, 16);
      const caneMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.3,
        emissive: 0xffdddd,
        emissiveIntensity: 0.2,
      });
      const cane = new THREE.Mesh(caneGeometry, caneMaterial);
      cane.position.y = 2;
      swordGroup.add(cane);
      
      // Red spiral stripes on candy cane
      for (let i = 0; i < 8; i++) {
        const stripeGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.08);
        const stripeMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = 0.3 + i * 0.5;
        stripe.position.z = 0.15;
        stripe.rotation.z = i * 0.2; // Slight spiral effect
        swordGroup.add(stripe);
      }
      
      // Curved hook at top
      const hookGeometry = new THREE.TorusGeometry(0.4, 0.15, 12, 16, Math.PI);
      const hookMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.3,
      });
      const hook = new THREE.Mesh(hookGeometry, hookMaterial);
      hook.position.y = 4.0;
      hook.position.x = 0.4;
      hook.rotation.z = Math.PI / 2;
      swordGroup.add(hook);
      
      // Red stripe on hook
      const hookStripe = new THREE.TorusGeometry(0.42, 0.08, 8, 12, Math.PI * 0.6);
      const hookStripeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const hookStripeMesh = new THREE.Mesh(hookStripe, hookStripeMat);
      hookStripeMesh.position.y = 4.0;
      hookStripeMesh.position.x = 0.4;
      hookStripeMesh.position.z = 0.1;
      hookStripeMesh.rotation.z = Math.PI / 2;
      swordGroup.add(hookStripeMesh);
      
      // Festive bow at bottom
      const bowMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00, roughness: 0.5 });
      const bowLoop1 = new THREE.TorusGeometry(0.25, 0.08, 8, 16, Math.PI * 1.5);
      const bow1 = new THREE.Mesh(bowLoop1, bowMaterial);
      bow1.position.y = -0.2;
      bow1.position.x = 0.2;
      bow1.rotation.z = Math.PI / 4;
      swordGroup.add(bow1);
      
      const bow2 = new THREE.Mesh(bowLoop1.clone(), bowMaterial);
      bow2.position.y = -0.2;
      bow2.position.x = -0.2;
      bow2.rotation.z = -Math.PI / 4;
      swordGroup.add(bow2);
      
    } else if (currentTheme === 'halloween') {
      // SCYTHE weapon!
      // Long handle (staff)
      const staffGeometry = new THREE.CylinderGeometry(0.1, 0.12, 4.5, 12);
      const staffMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        metalness: 0.2,
        roughness: 0.8,
      });
      const staff = new THREE.Mesh(staffGeometry, staffMaterial);
      staff.position.y = 1.5;
      swordGroup.add(staff);
      
      // Metal collar at top of staff
      const collarGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.2, 12);
      const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.2,
      });
      const collar = new THREE.Mesh(collarGeometry, metalMaterial);
      collar.position.y = 3.8;
      swordGroup.add(collar);
      
      // Curved scythe blade
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0);
      bladeShape.quadraticCurveTo(1.5, 0.5, 2.5, -0.5);
      bladeShape.quadraticCurveTo(2.8, -0.8, 2.5, -1.0);
      bladeShape.quadraticCurveTo(1.5, -0.2, 0, -0.1);
      bladeShape.lineTo(0, 0);
      
      const bladeExtrudeSettings = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 };
      const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, bladeExtrudeSettings);
      const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x660066,
        emissiveIntensity: 0.3,
      });
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.position.y = 3.9;
      blade.position.x = -0.1;
      blade.rotation.z = Math.PI;
      swordGroup.add(blade);
      
      // Purple glowing edge
      const edgeShape = new THREE.Shape();
      edgeShape.moveTo(0.1, -0.05);
      edgeShape.quadraticCurveTo(1.5, 0.4, 2.4, -0.5);
      edgeShape.quadraticCurveTo(1.5, 0.2, 0.1, -0.08);
      const edgeGeometry = new THREE.ExtrudeGeometry(edgeShape, { depth: 0.02, bevelEnabled: false });
      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.7,
      });
      const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edge.position.y = 3.9;
      edge.position.x = -0.1;
      edge.position.z = 0.06;
      edge.rotation.z = Math.PI;
      swordGroup.add(edge);
      
      // Skull decoration at bottom
      const skullGeometry = new THREE.SphereGeometry(0.2, 12, 12);
      const skullMaterial = new THREE.MeshStandardMaterial({
        color: 0xddddcc,
        roughness: 0.6,
      });
      const skull = new THREE.Mesh(skullGeometry, skullMaterial);
      skull.position.y = -0.8;
      skull.scale.set(1, 1.2, 0.8);
      swordGroup.add(skull);
      
      // Eye sockets
      const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.08, -0.75, 0.15);
      swordGroup.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.08, -0.75, 0.15);
      swordGroup.add(rightEye);
      
    } else {
      // STANDARD sword
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
    }
    
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
  }, [currentTheme]); // Recreate scene when theme changes

  // Create enemy - FIREBALLS, ENEMY SWORDS, and LASERS
  const createEnemy = useCallback((type: 'fireball' | 'enemy_sword' | 'laser') => {
    if (!sceneRef.current) return;

    if (type === 'fireball') {
      // THEMED PROJECTILES based on currentTheme
      // 20% chance for special variant
      const isSpecial = Math.random() < 0.2;
      const projectileSize = 0.45 + Math.random() * 0.2;
      
      // Spawn from edges
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (10 + Math.random() * 5);
      const y = (Math.random() - 0.5) * 8;
      
      const fireGroup = new THREE.Group();
      
      if (currentTheme === 'christmas') {
        // REALISTIC SNOWBALLS for Christmas
        if (isSpecial) {
          // GOLDEN SNOWBALL (high value) - sparkly and magical
          // Core packed snow
          const coreGeo = new THREE.SphereGeometry(projectileSize * 0.55, 24, 24);
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffd0,
            roughness: 0.85,
            metalness: 0.1,
            emissive: 0xffcc00,
            emissiveIntensity: 0.4,
          });
          const core = new THREE.Mesh(coreGeo, coreMat);
          fireGroup.add(core);
          
          // Bumpy snow texture - random small bumps
          for (let i = 0; i < 12; i++) {
            const bumpGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8);
            const bumpMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, roughness: 0.9 });
            const bump = new THREE.Mesh(bumpGeo, bumpMat);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = projectileSize * 0.5;
            bump.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
            fireGroup.add(bump);
          }
          
          // Golden sparkle particles
          for (let i = 0; i < 8; i++) {
            const sparkGeo = new THREE.OctahedronGeometry(0.04, 0);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
            const spark = new THREE.Mesh(sparkGeo, sparkMat);
            const angle = (i / 8) * Math.PI * 2;
            spark.position.set(Math.cos(angle) * projectileSize * 0.7, Math.sin(angle) * projectileSize * 0.7, 0.1);
            fireGroup.add(spark);
          }
          
          const glowGeo = new THREE.SphereGeometry(projectileSize * 1.3, 24, 24);
          const glowMat = new THREE.MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.25 });
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          glowMesh.position.set(x, y, 0);
          sceneRef.current.add(glowMesh);
          
          fireGroup.position.set(x, y, 0);
          sceneRef.current.add(fireGroup);
          
          const speed = 0.06 + Math.random() * 0.04;
          enemiesRef.current.push({
            mesh: fireGroup as any, glowMesh, x, y,
            velocityX: -side * speed, velocityY: (Math.random() - 0.5) * 0.03,
            type: 'fireball', health: 1, rotation: 0,
            pulsePhase: Math.random() * Math.PI * 2, trailParticles: [],
            isGreenFireball: true, basePoints: 25,
          });
          return;
        }
        
        // WHITE SNOWBALL (regular) - realistic packed snow
        // Main snowball - slightly imperfect sphere
        const snowGeo = new THREE.SphereGeometry(projectileSize * 0.6, 20, 20);
        const snowMat = new THREE.MeshStandardMaterial({ 
          color: 0xffffff, 
          roughness: 0.95,
          metalness: 0.0,
        });
        const snowball = new THREE.Mesh(snowGeo, snowMat);
        snowball.scale.set(1, 0.95, 0.9); // Slightly squished like real snowball
        fireGroup.add(snowball);
        
        // Bumpy snow texture - packed snow lumps
        for (let i = 0; i < 15; i++) {
          const bumpSize = 0.06 + Math.random() * 0.08;
          const bumpGeo = new THREE.SphereGeometry(bumpSize, 6, 6);
          const bumpMat = new THREE.MeshStandardMaterial({ 
            color: 0xf8f8ff, 
            roughness: 0.9 
          });
          const bump = new THREE.Mesh(bumpGeo, bumpMat);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = projectileSize * 0.55;
          bump.position.set(
            r * Math.sin(phi) * Math.cos(theta), 
            r * Math.sin(phi) * Math.sin(theta) * 0.95, 
            r * Math.cos(phi) * 0.9
          );
          fireGroup.add(bump);
        }
        
        // Icy sparkles on surface
        for (let i = 0; i < 6; i++) {
          const iceGeo = new THREE.OctahedronGeometry(0.03, 0);
          const iceMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.8 });
          const ice = new THREE.Mesh(iceGeo, iceMat);
          const angle = (i / 6) * Math.PI * 2;
          ice.position.set(Math.cos(angle) * projectileSize * 0.5, Math.sin(angle) * projectileSize * 0.45, projectileSize * 0.3);
          fireGroup.add(ice);
        }
        
        // Cold mist glow
        const glowGeo = new THREE.SphereGeometry(projectileSize * 1.1, 24, 24);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.15 });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.set(x, y, 0);
        
        fireGroup.position.set(x, y, 0);
        sceneRef.current.add(fireGroup);
        sceneRef.current.add(glowMesh);
        
        const speed = 0.06 + Math.random() * 0.04;
        enemiesRef.current.push({
          mesh: fireGroup as any, glowMesh, x, y,
          velocityX: -side * speed, velocityY: (Math.random() - 0.5) * 0.03,
          type: 'fireball', health: 1, rotation: 0,
          pulsePhase: Math.random() * Math.PI * 2, trailParticles: [],
          isGreenFireball: false, basePoints: 10,
        });
        
      } else if (currentTheme === 'halloween') {
        // REALISTIC FLAMING PUMPKINS for Halloween
        if (isSpecial) {
          // GREEN FLAMING PUMPKIN (special - high value)
          // Pumpkin body with ridges
          const pumpkinGeo = new THREE.SphereGeometry(projectileSize * 0.55, 16, 12);
          const pumpkinMat = new THREE.MeshStandardMaterial({ 
            color: 0xff6600, 
            roughness: 0.7,
            emissive: 0x331100,
            emissiveIntensity: 0.2,
          });
          const pumpkinBody = new THREE.Mesh(pumpkinGeo, pumpkinMat);
          pumpkinBody.scale.set(1.2, 0.9, 1.2); // Pumpkin shape - wide and short
          fireGroup.add(pumpkinBody);
          
          // Pumpkin ridges (vertical segments)
          for (let i = 0; i < 8; i++) {
            const ridgeGeo = new THREE.CapsuleGeometry(0.03, projectileSize * 0.7, 4, 8);
            const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xdd5500, roughness: 0.8 });
            const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
            const angle = (i / 8) * Math.PI * 2;
            ridge.position.set(Math.cos(angle) * projectileSize * 0.5, 0, Math.sin(angle) * projectileSize * 0.5);
            ridge.rotation.z = Math.PI / 2;
            fireGroup.add(ridge);
          }
          
          // Carved glowing face
          const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.9 });
          // Triangle eyes
          const eyeShape = new THREE.Shape();
          eyeShape.moveTo(0, 0.08);
          eyeShape.lineTo(-0.06, -0.04);
          eyeShape.lineTo(0.06, -0.04);
          eyeShape.lineTo(0, 0.08);
          const eyeGeo = new THREE.ExtrudeGeometry(eyeShape, { depth: 0.05, bevelEnabled: false });
          const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
          leftEye.position.set(-0.15, 0.08, projectileSize * 0.5);
          fireGroup.add(leftEye);
          const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
          rightEye.position.set(0.15, 0.08, projectileSize * 0.5);
          fireGroup.add(rightEye);
          
          // Jagged mouth
          const mouthMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.9 });
          const mouthGeo = new THREE.BoxGeometry(0.25, 0.06, 0.05);
          const mouth = new THREE.Mesh(mouthGeo, mouthMat);
          mouth.position.set(0, -0.1, projectileSize * 0.5);
          fireGroup.add(mouth);
          
          // Green stem
          const stemGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.18, 8);
          const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.9 });
          const stem = new THREE.Mesh(stemGeo, stemMat);
          stem.position.y = projectileSize * 0.5;
          stem.rotation.z = 0.2;
          fireGroup.add(stem);
          
          // GREEN flames erupting from top
          for (let i = 0; i < 6; i++) {
            const flameGeo = new THREE.ConeGeometry(0.08 + Math.random() * 0.04, 0.25 + Math.random() * 0.15, 8);
            const flameMat = new THREE.MeshBasicMaterial({ 
              color: i % 2 === 0 ? 0x00ff00 : 0x44ff44, 
              transparent: true, 
              opacity: 0.85 
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(
              (Math.random() - 0.5) * 0.25, 
              projectileSize * 0.6 + Math.random() * 0.15, 
              (Math.random() - 0.5) * 0.1
            );
            flame.rotation.z = (Math.random() - 0.5) * 0.4;
            fireGroup.add(flame);
          }
          
          const glowGeo = new THREE.SphereGeometry(projectileSize * 1.4, 24, 24);
          const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.25 });
          const glowMesh = new THREE.Mesh(glowGeo, glowMat);
          glowMesh.position.set(x, y, 0);
          sceneRef.current.add(glowMesh);
          
          fireGroup.position.set(x, y, 0);
          sceneRef.current.add(fireGroup);
          
          const speed = 0.06 + Math.random() * 0.04;
          enemiesRef.current.push({
            mesh: fireGroup as any, glowMesh, x, y,
            velocityX: -side * speed, velocityY: (Math.random() - 0.5) * 0.03,
            type: 'fireball', health: 1, rotation: 0,
            pulsePhase: Math.random() * Math.PI * 2, trailParticles: [],
            isGreenFireball: true, basePoints: 25,
          });
          return;
        }
        
        // ORANGE/RED FLAMING PUMPKIN (regular)
        // Pumpkin body with ridges
        const pumpkinGeo = new THREE.SphereGeometry(projectileSize * 0.55, 16, 12);
        const pumpkinMat = new THREE.MeshStandardMaterial({ 
          color: 0xff6600, 
          roughness: 0.7,
          emissive: 0x331100,
          emissiveIntensity: 0.3,
        });
        const pumpkinBody = new THREE.Mesh(pumpkinGeo, pumpkinMat);
        pumpkinBody.scale.set(1.2, 0.9, 1.2);
        fireGroup.add(pumpkinBody);
        
        // Pumpkin ridges
        for (let i = 0; i < 8; i++) {
          const ridgeGeo = new THREE.CapsuleGeometry(0.03, projectileSize * 0.7, 4, 8);
          const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xdd5500, roughness: 0.8 });
          const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
          const angle = (i / 8) * Math.PI * 2;
          ridge.position.set(Math.cos(angle) * projectileSize * 0.5, 0, Math.sin(angle) * projectileSize * 0.5);
          ridge.rotation.z = Math.PI / 2;
          fireGroup.add(ridge);
        }
        
        // Carved glowing face - YELLOW/ORANGE glow
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.95 });
        const eyeShape = new THREE.Shape();
        eyeShape.moveTo(0, 0.08);
        eyeShape.lineTo(-0.06, -0.04);
        eyeShape.lineTo(0.06, -0.04);
        eyeShape.lineTo(0, 0.08);
        const eyeGeo = new THREE.ExtrudeGeometry(eyeShape, { depth: 0.05, bevelEnabled: false });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.15, 0.08, projectileSize * 0.5);
        fireGroup.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.15, 0.08, projectileSize * 0.5);
        fireGroup.add(rightEye);
        
        // Jagged mouth
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.95 });
        const mouthGeo = new THREE.BoxGeometry(0.25, 0.06, 0.05);
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, -0.1, projectileSize * 0.5);
        fireGroup.add(mouth);
        
        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.07, 0.18, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.9 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = projectileSize * 0.5;
        stem.rotation.z = 0.2;
        fireGroup.add(stem);
        
        // ORANGE/RED flames erupting from top
        for (let i = 0; i < 6; i++) {
          const flameGeo = new THREE.ConeGeometry(0.08 + Math.random() * 0.04, 0.25 + Math.random() * 0.15, 8);
          const flameMat = new THREE.MeshBasicMaterial({ 
            color: i % 2 === 0 ? 0xff3300 : 0xff6600, 
            transparent: true, 
            opacity: 0.85 
          });
          const flame = new THREE.Mesh(flameGeo, flameMat);
          flame.position.set(
            (Math.random() - 0.5) * 0.25, 
            projectileSize * 0.6 + Math.random() * 0.15, 
            (Math.random() - 0.5) * 0.1
          );
          flame.rotation.z = (Math.random() - 0.5) * 0.4;
          fireGroup.add(flame);
        }
        
        const glowGeo = new THREE.SphereGeometry(projectileSize * 1.4, 24, 24);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.25 });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.set(x, y, 0);
        
        fireGroup.position.set(x, y, 0);
        sceneRef.current.add(fireGroup);
        sceneRef.current.add(glowMesh);
        
        const speed = 0.06 + Math.random() * 0.04;
        enemiesRef.current.push({
          mesh: fireGroup as any, glowMesh, x, y,
          velocityX: -side * speed, velocityY: (Math.random() - 0.5) * 0.03,
          type: 'fireball', health: 1, rotation: 0,
          pulsePhase: Math.random() * Math.PI * 2, trailParticles: [],
          isGreenFireball: false, basePoints: 10,
        });
        
      } else {
        // STANDARD fireballs
        if (isSpecial) {
          // GREEN fireball
          const coreGeometry = new THREE.SphereGeometry(projectileSize * 0.25, 12, 12);
          const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.scale.set(1, 1.2, 1);
        fireGroup.add(core);
        
          const cyanGeometry = new THREE.SphereGeometry(projectileSize * 0.45, 16, 16);
          const cyanMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 1.0 });
        const cyan = new THREE.Mesh(cyanGeometry, cyanMaterial);
        cyan.scale.set(1, 1.3, 1);
        fireGroup.add(cyan);
        
          const limeGeometry = new THREE.SphereGeometry(projectileSize * 0.7, 20, 20);
          const limeMaterial = new THREE.MeshBasicMaterial({ color: 0xaaff00, transparent: true, opacity: 1.0 });
        const lime = new THREE.Mesh(limeGeometry, limeMaterial);
        lime.scale.set(1, 1.4, 1);
        fireGroup.add(lime);
        
          const greenGeometry = new THREE.SphereGeometry(projectileSize, 24, 24);
          const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.95 });
        const green = new THREE.Mesh(greenGeometry, greenMaterial);
        green.scale.set(1, 1.5, 1);
        fireGroup.add(green);
        
          const glowGeometry = new THREE.SphereGeometry(projectileSize * 1.6, 32, 32);
          const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x66ff00, transparent: true, opacity: 0.5 });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.set(1, 1.6, 1);
        glowMesh.position.set(x, y, 0);
        sceneRef.current.add(glowMesh);
        
        fireGroup.position.set(x, y, 0);
        sceneRef.current.add(fireGroup);
        
        const speed = 0.06 + Math.random() * 0.04;
        enemiesRef.current.push({
            mesh: fireGroup as any, glowMesh, x, y,
            velocityX: -side * speed, velocityY: (Math.random() - 0.5) * 0.03,
            type: 'fireball', health: 1, rotation: 0,
            pulsePhase: Math.random() * Math.PI * 2, trailParticles: [],
            isGreenFireball: true, basePoints: 25,
          });
          return;
        }
        
        // ORANGE/RED fireball
        const coreGeometry = new THREE.SphereGeometry(projectileSize * 0.25, 12, 12);
        const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.scale.set(1, 1.2, 1);
      fireGroup.add(core);
      
        const yellowGeometry = new THREE.SphereGeometry(projectileSize * 0.45, 16, 16);
        const yellowMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 1.0 });
      const yellow = new THREE.Mesh(yellowGeometry, yellowMaterial);
      yellow.scale.set(1, 1.3, 1);
      fireGroup.add(yellow);
      
        const orangeGeometry = new THREE.SphereGeometry(projectileSize * 0.7, 20, 20);
        const orangeMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 1.0 });
      const orange = new THREE.Mesh(orangeGeometry, orangeMaterial);
      orange.scale.set(1, 1.4, 1);
      fireGroup.add(orange);
      
        const redGeometry = new THREE.SphereGeometry(projectileSize, 24, 24);
        const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.95 });
      const red = new THREE.Mesh(redGeometry, redMaterial);
      red.scale.set(1, 1.5, 1);
      fireGroup.add(red);
      
        const glowGeometry = new THREE.SphereGeometry(projectileSize * 1.4, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.25 });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.set(1, 1.6, 1);
      
      fireGroup.position.set(x, y, 0);
      glowMesh.position.set(x, y, 0);
      sceneRef.current.add(fireGroup);
      sceneRef.current.add(glowMesh);
      
      const speed = 0.06 + Math.random() * 0.04;
      enemiesRef.current.push({
          mesh: fireGroup as any, glowMesh, x, y,
          velocityX: -side * speed, velocityY: (Math.random() - 0.5) * 0.03,
          type: 'fireball', health: 1, rotation: 0,
          pulsePhase: Math.random() * Math.PI * 2, trailParticles: [],
          isGreenFireball: false, basePoints: 10,
        });
      }
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
      // THEMED LASERS - Warning then danger phase
      const isVertical = Math.random() > 0.5;
      
      // Random position
      const x = (Math.random() - 0.5) * (SWORD_X_RANGE * 1.5);
      const y = (Math.random() - 0.5) * (SWORD_Y_RANGE * 1.5);
      
      // Create laser beam
      const laserGeometry = isVertical 
        ? new THREE.BoxGeometry(LASER_WIDTH, LASER_LENGTH, 0.1)
        : new THREE.BoxGeometry(LASER_LENGTH, LASER_WIDTH, 0.1);
      
      // Themed laser colors - warning phase
      let warningColor = 0x00ffff; // Default cyan
      if (currentTheme === 'christmas') {
        warningColor = 0x00ff00; // Green for Christmas
      } else if (currentTheme === 'halloween') {
        warningColor = 0xaa00ff; // Purple for Halloween
      }
      
      const laserMaterial = new THREE.MeshBasicMaterial({
        color: warningColor,
        transparent: true,
        opacity: 0.9,
      });
      
      const laser = new THREE.Mesh(laserGeometry, laserMaterial);
      laser.position.set(x, y, 0);
      
      // Create glow effect
      const glowGeometry = isVertical
        ? new THREE.BoxGeometry(LASER_WIDTH * 3, LASER_LENGTH * 1.1, 0.2)
        : new THREE.BoxGeometry(LASER_LENGTH * 1.1, LASER_WIDTH * 3, 0.2);
      
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: warningColor,
        transparent: true,
        opacity: 0.6,
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
        velocityX: 0,
        velocityY: 0,
        type: 'laser',
        health: 1,
        rotation: 0,
        isVertical,
        spawnTime: Date.now(),
        isDangerous: false,
      });
    }
  }, [playSound, currentTheme]);

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

  // Go to waiting state (show sword with green circle)
  const startGame = useCallback(() => {
    // Unlock audio on user interaction (clicking start)
    unlockAudio();
    
    if (gameState === 'ready') {
      setGameState('waiting');
      gameStateRef.current = 'waiting';
    }
  }, [gameState, unlockAudio]);

  // Start countdown when sword is clicked in waiting state
  const startCountdown = useCallback(() => {
    if (gameState === 'waiting') {
      // Unlock audio on user gesture (critical for mobile)
      unlockAudio();
      
      // Start music immediately on user gesture - critical for mobile!
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.volume = 0.7;
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.play()
          .then(() => {
            console.log('✅ [BladeBounce] Music started on countdown click (mobile)');
            audioUnlockedRef.current = true;
          })
          .catch(e => {
            console.log('Music start blocked:', e);
            audioUnlockedRef.current = true;
          });
      }
      
      setGameState('countdown');
      gameStateRef.current = 'countdown';
      let count = 3;
      
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        playSound(600, 0.1);
        
        if (count === 0) {
          clearInterval(interval);
          setGameState('playing');
          gameStateRef.current = 'playing';
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

  // Enable gyroscope controls
  const enableGyroscope = useCallback(() => {
    console.log('📱 [BladeBounce3D] enableGyroscope called');
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      // Check if we need to request permission (iOS 13+)
      const requestPermission = (DeviceOrientationEvent as any).requestPermission;
      if (typeof requestPermission === 'function') {
        console.log('📱 [BladeBounce3D] Requesting iOS permission...');
        requestPermission()
          .then((response: string) => {
            console.log('📱 [BladeBounce3D] iOS permission response:', response);
            if (response === 'granted') {
              gyroEnabledRef.current = true;
              gyroBaseRef.current = null; // Reset base
              setGyroEnabled(true);
              setShowGyroNotification(true);
              setTimeout(() => setShowGyroNotification(false), 3000);
            }
          })
          .catch((err) => {
            console.error('📱 [BladeBounce3D] iOS permission error:', err);
          });
      } else {
        // Non-iOS or older iOS - enable directly
        console.log('📱 [BladeBounce3D] Enabling gyroscope (non-iOS)');
        gyroEnabledRef.current = true;
        gyroBaseRef.current = null; // Reset base
        setGyroEnabled(true);
        setShowGyroNotification(true);
        setTimeout(() => setShowGyroNotification(false), 3000);
      }
    } else {
      console.log('📱 [BladeBounce3D] DeviceOrientationEvent not supported');
    }
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle multiplayer game start and player sync
  useEffect(() => {
    if (gameMode !== 'online') return;
    
    // Find my player index for color assignment
    const myIndex = lobby.players.findIndex(p => p.id === user?.id);
    if (myIndex >= 0) {
      myPlayerIndexRef.current = myIndex;
    }
    
    lobby.onGameStart(() => {
      // Don't start immediately - wait for all players to tap their sword
      setWaitingForPlayers(true);
      setPlayersReady(new Set());
      setAllPlayersReady(false);
      setGameState('waiting'); // Show "tap sword to start" screen
    });
    
    // Listen for other players' position updates
    lobby.onPlayerUpdate((updates) => {
      const newOtherPlayers = new Map<string, { x: number; y: number; angle: number; score: number; hearts: number; isAlive: boolean }>();
      updates.forEach((update, id) => {
        if (id !== user?.id) {
          newOtherPlayers.set(id, {
            x: update.x,
            y: update.y,
            angle: update.rotationY,
            score: update.score,
            hearts: update.hearts,
            isAlive: update.isAlive
          });
        }
      });
      setOtherPlayers(newOtherPlayers);
    });
    
    // Listen for player ready actions (tapped their sword)
    lobby.onPlayerAction((playerId, action) => {
      if (action === 'ready_to_start') {
        setPlayersReady(prev => {
          const newSet = new Set(prev);
          newSet.add(playerId);
          return newSet;
        });
      } else if (action === 'sync_countdown') {
        // All players ready - start synchronized countdown
        setSyncCountdown(3);
      } else if (action === 'game_go') {
        // Everyone start NOW
        setAllPlayersReady(true);
        setWaitingForPlayers(false);
        setSyncCountdown(null);
        setGameState('countdown');
        setCountdown(3);
      }
    });
  }, [gameMode, lobby, user?.id]);
  
  // Check if all players are ready and start sync countdown
  useEffect(() => {
    if (!waitingForPlayers || gameMode !== 'online') return;
    
    const totalPlayers = lobby.players.length;
    const readyCount = playersReady.size;
    
    // If all players are ready, host starts the synchronized countdown
    if (readyCount >= totalPlayers && totalPlayers >= 2 && lobby.isHost) {
      lobby.sendPlayerAction('sync_countdown');
      setSyncCountdown(3);
    }
  }, [playersReady, waitingForPlayers, gameMode, lobby]);
  
  // Synchronized countdown for all players
  useEffect(() => {
    if (syncCountdown === null || gameMode !== 'online') return;
    
    if (syncCountdown > 0) {
      const timer = setTimeout(() => {
        setSyncCountdown(syncCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (syncCountdown === 0 && lobby.isHost) {
      // Host broadcasts GO signal
      lobby.sendPlayerAction('game_go');
    }
  }, [syncCountdown, gameMode, lobby]);
  
  // Handle player tapping their sword to signal ready
  const handleTapToStart = useCallback(() => {
    if (gameMode !== 'online' || !waitingForPlayers) return;
    
    // Signal that this player is ready
    lobby.sendPlayerAction('ready_to_start');
    setPlayersReady(prev => {
      const newSet = new Set(prev);
      newSet.add(user?.id || '');
      return newSet;
    });
  }, [gameMode, waitingForPlayers, lobby, user?.id]);
  
  // Send position updates in multiplayer
  useEffect(() => {
    if (gameMode !== 'online' || gameState !== 'playing') return;
    
    const sendUpdate = () => {
      const now = Date.now();
      if (now - lastPositionSentRef.current < 50) return; // Send 20 times per second
      lastPositionSentRef.current = now;
      
      lobby.sendPlayerUpdate({
        id: user?.id || '',
        x: swordGroupRef.current?.position.x || 0,
        y: swordGroupRef.current?.position.y || 0,
        z: 0,
        rotationY: targetAngle,
        hearts,
        score,
        isAlive: hearts > 0
      });
    };
    
    const interval = setInterval(sendUpdate, 50);
    return () => clearInterval(interval);
  }, [gameMode, gameState, lobby, user?.id, hearts, score, targetAngle]);

  // Gyroscope control handler - works during waiting and playing states
  useEffect(() => {
    // Only run if gyroscope is enabled and we're in a state where movement matters
    if (!gyroEnabled) return;
    if (gameState !== 'waiting' && gameState !== 'playing') return;

    console.log('📱 [BladeBounce3D] Gyroscope handler active for state:', gameState);

    let lastUpdate = 0;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastUpdate < 16) return; // Throttle to ~60fps
      lastUpdate = now;

      const beta = event.beta ?? 0; // Front-back tilt (-180 to 180)
      const gamma = event.gamma ?? 0; // Left-right tilt (-90 to 90)

      // Set base position on first reading
      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta, gamma };
        console.log('📱 [BladeBounce3D] Gyro base set:', gyroBaseRef.current);
        return;
      }

      // Calculate delta from base position
      const deltaBeta = beta - gyroBaseRef.current.beta;
      const deltaGamma = gamma - gyroBaseRef.current.gamma;

      // Convert to sword position - moderate sensitivity for responsive movement
      const sensitivity = 0.35; // Increased for better responsiveness
      const newX = Math.max(-SWORD_X_RANGE, Math.min(SWORD_X_RANGE, deltaGamma * sensitivity));
      const newY = Math.max(-SWORD_Y_RANGE, Math.min(SWORD_Y_RANGE, -deltaBeta * sensitivity));

      setTargetX(newX);
      setTargetY(newY);
      
      // Also directly update sword position for immediate feedback
      if (swordGroupRef.current) {
        const lerpFactor = 0.3;
        swordGroupRef.current.position.x += (newX - swordGroupRef.current.position.x) * lerpFactor;
        swordGroupRef.current.position.y += (newY - swordGroupRef.current.position.y) * lerpFactor;
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    console.log('📱 [BladeBounce3D] Gyroscope listener attached');
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      console.log('📱 [BladeBounce3D] Gyroscope listener removed');
    };
  }, [gyroEnabled, gameState]);

  // Reset gyro base when transitioning to playing state
  useEffect(() => {
    if (gameState === 'playing' && gyroEnabled) {
      gyroBaseRef.current = null; // Reset base so next reading becomes the new base
      console.log('📱 [BladeBounce3D] Gyro base reset for game start');
    }
  }, [gameState, gyroEnabled]);

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
      e.preventDefault();
      
      // Unlock audio on touch interaction (critical for mobile)
      if (!audioUnlockedRef.current) {
        unlockAudio();
      }
      
      if (gameState !== 'playing') return;
      
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
            // DANGER PHASE - THEMED COLORS
            if (!enemy.isDangerous) {
              enemy.isDangerous = true;
              // Themed danger color
              let dangerColor = 0xff0000; // Default red
              if (currentTheme === 'christmas') {
                dangerColor = 0xff0000; // Red for Christmas
              } else if (currentTheme === 'halloween') {
                dangerColor = 0xff6600; // Orange for Halloween
              }
              (enemy.mesh.material as THREE.MeshBasicMaterial).color.setHex(dangerColor);
              if (enemy.glowMesh) {
                (enemy.glowMesh.material as THREE.MeshBasicMaterial).color.setHex(dangerColor);
              }
              playSound(900, 0.15, 'square');
              console.log('⚡ ⚠️ LASER TURNED DANGEROUS! ⚠️');
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
                
                // CoD-style floating score popup - convert 3D position to screen %
                const screenX = 50 + (enemy.x / SWORD_X_RANGE) * 30; // Roughly center with offset
                const screenY = 50 - (enemy.y / SWORD_Y_RANGE) * 30; // Invert Y for screen coords
                const popupType = isTipHit ? 'perfect' : enemy.isGreenFireball ? 'bonus' : 'normal';
                const label = isTipHit ? 'TIP!' : enemy.isGreenFireball ? 'GREEN!' : 'HIT';
                addPopupRef.current(Math.round(points), screenX, screenY, popupType, label);
              } else if (enemy.type === 'enemy_sword') {
                // Enemy swords: More points for tip hits
                const basePoints = 35;
                points = isTipHit ? basePoints * 1.5 : basePoints; // 52.5 pts for tip hits!
                createParticles(enemy.x, enemy.y, 0xff0000, isTipHit ? 40 : 25);
                
                const hitType = isTipHit ? '🎯 TIP HIT!' : '';
                console.log(`⚔️ ${hitType} Enemy sword destroyed: +${points.toFixed(2)} points`);
                
                // CoD-style floating score popup for sword destruction
                const screenX = 50 + (enemy.x / SWORD_X_RANGE) * 30;
                const screenY = 50 - (enemy.y / SWORD_Y_RANGE) * 30;
                const popupType = isTipHit ? 'perfect' : 'kill';
                const label = isTipHit ? 'PARRY!' : 'SLASH';
                addPopupRef.current(Math.round(points), screenX, screenY, popupType, label);
              } else if (enemy.type === 'laser') {
                // Lasers: Give points only if blue (safe), lose heart if red (dangerous)
                if (!enemy.isDangerous) {
                  // BLUE laser - give points!
                  points = LASER_POINTS;
                  createParticles(enemy.x, enemy.y, 0x00aaff, 30);
                  playSound(1100, 0.1, 'sine');
                  console.log(`⚡ Blue laser destroyed: +${LASER_POINTS} points!`);
                  
                  // CoD-style floating score popup for blue laser
                  const screenX = 50 + (enemy.x / SWORD_X_RANGE) * 30;
                  const screenY = 50 - (enemy.y / SWORD_Y_RANGE) * 30;
                  addPopupRef.current(LASER_POINTS, screenX, screenY, 'bonus', 'LASER');
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
      if (e.code === 'Space') {
        if (gameState === 'ready') {
        startGame();
        } else if (gameState === 'waiting') {
          startCountdown();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, startGame, startCountdown]);

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
      
      {/* CoD-style floating score popups */}
      {gameState === 'playing' && (
        <FloatingScore popups={popups} onRemove={removePopup} />
      )}
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}
      
      {/* Waiting screen - Green circle around sword, click to start countdown */}
      {gameState === 'waiting' && (() => {
        const isMultiplayerWaiting = gameMode === 'online' && waitingForPlayers;
        const myReady = playersReady.has(user?.id || '');
        const totalPlayers = lobby.players.length;
        const readyCount = playersReady.size;
        
        return (
        <div className="absolute inset-0 pointer-events-none">
          {/* Multiplayer sync countdown overlay */}
          {syncCountdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 pointer-events-none">
              <div className="text-center">
                <div className="text-8xl font-bold text-yellow-400 animate-pulse">
                  {syncCountdown > 0 ? syncCountdown : 'GO!'}
                </div>
                <div className="text-2xl text-white mt-4">
                  {syncCountdown > 0 ? 'Get Ready...' : 'Starting!'}
                </div>
              </div>
            </div>
          )}
          
          {/* Multiplayer player status bar */}
          {isMultiplayerWaiting && syncCountdown === null && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 px-4 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
                <div className="text-white text-center font-bold mb-2">
                  Waiting for all players... ({readyCount}/{totalPlayers})
                </div>
                <div className="flex justify-center gap-3">
                  {lobby.players.map((player, index) => {
                    const isPlayerReady = playersReady.has(player.id);
                    const swordColor = PLAYER_SWORD_COLORS[index % PLAYER_SWORD_COLORS.length];
                    const colorHex = swordColor.blade === 0x00ffff ? '#00ffff' : swordColor.blade === 0xff00ff ? '#ff00ff' : swordColor.blade === 0x00ff00 ? '#00ff00' : '#ffd700';
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${isPlayerReady ? 'animate-pulse' : 'opacity-50'}`}
                        style={{
                          backgroundColor: colorHex + (isPlayerReady ? '44' : '22'),
                          border: `2px solid ${colorHex}`,
                        }}
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: isPlayerReady ? colorHex : '#666' }}
                        />
                        <span style={{ color: isPlayerReady ? colorHex : '#666' }}>
                          {player.username}
                        </span>
                        {isPlayerReady && <span>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Green pulsing circle around sword - with LARGE gyro button on mobile */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer flex flex-col items-center justify-center"
            onClick={() => {
              unlockAudio();
              if (isMobile && !gyroEnabledRef.current) {
                enableGyroscope();
              }
              // For multiplayer - signal ready and wait for all players
              if (gameMode === 'online' && waitingForPlayers) {
                handleTapToStart();
                return;
              }
              startCountdown();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              unlockAudio();
              if (isMobile && !gyroEnabledRef.current) {
                enableGyroscope();
              }
              // For multiplayer - signal ready and wait for all players
              if (gameMode === 'online' && waitingForPlayers) {
                handleTapToStart();
                return;
              }
              startCountdown();
            }}
            style={{
              width: isMobile ? '240px' : '200px',
              height: isMobile ? '240px' : '200px',
              borderRadius: '50%',
              border: `6px solid ${myReady ? '#00ff00' : '#ffff00'}`,
              boxShadow: myReady 
                ? '0 0 30px #00ff00, 0 0 60px #00ff00, inset 0 0 30px rgba(0,255,0,0.3)'
                : '0 0 30px #ffff00, 0 0 60px #ffff00, inset 0 0 30px rgba(255,255,0,0.3)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            {/* Gyroscope enable button - LARGE and filling the circle - mobile only */}
            {/* Two-tap confirmation: first tap shows "TAP AGAIN", second tap enables */}
            {isMobile && !gyroEnabledRef.current && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (gyroConfirmStep === 0) {
                    setGyroConfirmStep(1);
                    setTimeout(() => setGyroConfirmStep(0), 3000);
                  } else {
                    setGyroConfirmStep(2);
                    enableGyroscope();
                  }
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (gyroConfirmStep === 0) {
                    setGyroConfirmStep(1);
                    setTimeout(() => setGyroConfirmStep(0), 3000);
                  } else {
                    setGyroConfirmStep(2);
                    enableGyroscope();
                  }
                }}
                className={`absolute inset-4 flex items-center justify-center font-bold rounded-full shadow-2xl border-4 cursor-pointer ${
                  gyroConfirmStep === 1 
                    ? 'bg-green-500/95 text-white border-green-300 animate-bounce' 
                    : 'bg-yellow-500/95 text-black border-yellow-300 animate-pulse'
                }`}
                style={{ fontSize: '16px', touchAction: 'manipulation' }}
              >
                <div className="flex flex-col items-center text-center px-2">
                  <span className="text-4xl mb-2">{gyroConfirmStep === 1 ? '👆' : '📱'}</span>
                  <span className="text-lg">{gyroConfirmStep === 1 ? 'TAP AGAIN' : 'TAP TO'}</span>
                  <span className="text-lg">{gyroConfirmStep === 1 ? 'TO CONFIRM' : 'ENABLE TILT'}</span>
                </div>
              </div>
            )}
            {isMobile && gyroEnabledRef.current && !myReady && (
              <div 
                className="absolute inset-4 flex items-center justify-center bg-green-600/90 rounded-full border-4 border-green-400"
              >
                <div className="flex flex-col items-center text-white font-bold">
                  <span className="text-4xl mb-2">✅</span>
                  <span className="text-xl">TILT READY</span>
                </div>
              </div>
            )}
            {myReady && (
              <div 
                className="absolute inset-4 flex items-center justify-center bg-green-600/90 rounded-full border-4 border-green-400"
              >
                <div className="flex flex-col items-center text-white font-bold">
                  <span className="text-4xl mb-2">✓</span>
                  <span className="text-xl">READY!</span>
                  <span className="text-sm opacity-80">Waiting...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Instruction text */}
          <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/80 px-8 py-4 rounded-xl border-2 ${myReady ? 'border-green-500' : 'border-yellow-500'} pointer-events-none`}>
            {myReady ? (
              <>
                <p className="text-green-400 text-2xl font-bold text-center">
                  ✅ YOU'RE READY!
                </p>
                <p className="text-gray-300 text-lg text-center mt-2">
                  Waiting for other players to tap their swords...
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-400 text-2xl font-bold text-center animate-pulse">
                  ⚔️ TAP THE SWORD TO START! ⚔️
                </p>
                <p className="text-gray-300 text-lg text-center mt-2">
                  {isMobile ? 'Tap inside the green circle' : 'Click inside the green circle'}
                </p>
              </>
            )}
          </div>
          
          {/* Gyroscope notification */}
          {showGyroNotification && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-green-600 px-6 py-3 rounded-xl pointer-events-none">
              <p className="text-white text-xl font-bold">📱 Tilt Controls Active!</p>
            </div>
          )}
          
          {/* Gyroscope toggle in waiting state */}
          {isMobile && !gyroEnabled && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enableGyroscope();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold text-lg animate-pulse"
              >
                📱 TAP TO ENABLE TILT CONTROLS
              </button>
            </div>
          )}
          
          {gyroEnabled && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-green-600/80 px-4 py-2 rounded-lg pointer-events-none">
              <p className="text-white text-sm font-bold">✅ Gyroscope Enabled</p>
            </div>
          )}
        </div>
        );
      })()}
      
      {/* Menu screen - Select Solo or Multiplayer */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center z-50">
          <div className="text-center px-4">
            <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ⚔️ BLADE BOUNCE 3D
            </h1>
            <p className="text-gray-400 text-lg mb-8">Choose your game mode</p>
            
            <div className="flex flex-col gap-4 max-w-md mx-auto">
              {/* Solo Practice */}
              <button
                onClick={() => {
                  setGameMode('solo');
                  setGameState('ready');
                }}
                className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-xl text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50"
              >
                <span className="flex items-center justify-center gap-3">
                  <span>🗡️</span>
                  <span>Solo Practice</span>
                </span>
                <span className="block text-sm font-normal opacity-80 mt-1">
                  Play alone to practice
                </span>
              </button>
              
              {/* Online Multiplayer */}
              <button
                onClick={() => {
                  setGameMode('online');
                  setGameState('matchmaking');
                  lobby.findLobby();
                }}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-xl text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
              >
                <span className="flex items-center justify-center gap-3">
                  <span>⚔️</span>
                  <span>Online Multiplayer</span>
                  <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">2-4 Players</span>
                </span>
                <span className="block text-sm font-normal opacity-80 mt-1">
                  Compete with others online
                </span>
              </button>
            </div>
            
            {/* Theme Selector */}
            <div className="mt-8 max-w-md mx-auto">
              <GameThemeSelector
                gameId="blade-bounce"
                gameName="Blade Bounce"
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Matchmaking screen */}
      {gameState === 'matchmaking' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center z-50">
          <div className="text-center px-4">
            <div className="animate-spin text-6xl mb-6">⚔️</div>
            <h2 className="text-3xl font-bold text-white mb-4">Finding Players...</h2>
            <p className="text-gray-400 mb-6">Looking for a match</p>
            
            {lobby.error && (
              <p className="text-red-400 mb-4">{lobby.error}</p>
            )}
            
            {lobby.lobbyId && (
              <div className="text-green-400 mb-4">
                Connected! Waiting for players...
                {setTimeout(() => setGameState('lobby'), 500) && null}
              </div>
            )}
            
            <button
              onClick={() => {
                lobby.leaveLobby();
                setGameState('menu');
              }}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Lobby screen */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center z-50">
          <div className="text-center px-4 max-w-lg w-full">
            <h2 className="text-4xl font-bold text-white mb-6">⚔️ Blade Bounce Lobby</h2>
            
            {/* Players list */}
            <div className="bg-black/40 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold text-gray-300 mb-3">
                Players ({lobby.players.length}/4)
              </h3>
              <div className="space-y-2">
                {lobby.players.map((player, index) => {
                  const swordColor = PLAYER_SWORD_COLORS[index % PLAYER_SWORD_COLORS.length];
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${player.isReady ? 'bg-green-900/40' : 'bg-gray-800/40'}`}
                      style={{ borderLeft: `4px solid ${swordColor.blade === 0x00ffff ? '#00ffff' : swordColor.blade === 0xff00ff ? '#ff00ff' : swordColor.blade === 0x00ff00 ? '#00ff00' : '#ffd700'}` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⚔️</span>
                        <div className="text-left">
                          <span className="text-white font-medium">{player.username}</span>
                          {player.isHost && <span className="ml-2 text-yellow-400 text-xs">👑 HOST</span>}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${player.isReady ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300'}`}>
                        {player.isReady ? '✓ Ready' : 'Waiting'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Countdown */}
            {lobby.countdown !== null && (
              <div className="text-6xl font-black text-yellow-400 mb-6 animate-pulse">
                {lobby.countdown}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {!lobby.isHost && (
                <button
                  onClick={() => lobby.toggleReady()}
                  className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                    lobby.isReady
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                  }`}
                >
                  {lobby.isReady ? '✓ Ready!' : 'Ready Up'}
                </button>
              )}
              
              {lobby.isHost && (
                <button
                  onClick={() => lobby.startGame()}
                  disabled={lobby.players.length < 2}
                  className={`px-8 py-3 rounded-xl font-bold text-lg transition-all ${
                    lobby.players.length >= 2
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {lobby.players.length >= 2 ? '🚀 Start Game' : 'Waiting for players...'}
                </button>
              )}
              
              <button
                onClick={() => {
                  lobby.leaveLobby();
                  setGameState('menu');
                }}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
              >
                Leave Lobby
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Ready screen - SCROLLABLE + CLICK TO START */}
      {gameState === 'ready' && (
        <div 
          className="absolute inset-0 bg-black/70 text-white overflow-y-auto"
        >
          <div 
            className="min-h-full flex flex-col items-center justify-start py-12 px-4 relative z-10 overflow-y-auto"
            style={{ maxHeight: '100vh' }}
          >
            <h1 className="text-6xl font-bold mb-8 text-cyan-400 animate-pulse pt-20">
              ⚔️ BLADE BOUNCE 3D
            </h1>
            <p className="text-3xl mb-4 text-cyan-300 font-bold">🖱️ MOUSE: Sword follows cursor EVERYWHERE across entire window!</p>
            <p className="text-2xl mb-4 text-cyan-300">🖱️ Full screen range - move to all edges! Click to rotate 45°</p>
            <p className="text-3xl mb-4 text-pink-400 font-bold">📱 MOBILE: Touch & drag to move sword!</p>
            <p className="text-2xl mb-4 text-pink-400">📱 Tap anywhere to rotate 45°</p>
            
            {/* Gyroscope Toggle */}
            {isMobile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enableGyroscope();
                }}
                className={`mb-4 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                  gyroEnabled 
                    ? 'bg-green-500 text-white' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse'
                }`}
              >
                {gyroEnabled ? '✅ GYROSCOPE ENABLED' : '📱 TAP TO ENABLE TILT CONTROLS'}
              </button>
            )}
            
            {/* Gameplay Video */}
            <div className="mb-6 w-full max-w-2xl mx-auto">
              <div 
                className="relative w-full cursor-pointer group" 
                style={{ aspectRatio: '16/9' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedVideo('/mouseblade-gameplay.mp4');
                }}
              >
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full rounded-lg border-2 border-cyan-400 shadow-2xl transition-transform group-hover:scale-105"
                  style={{ objectFit: 'contain' }}
                >
                  <source src="/mouseblade-gameplay.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all rounded-lg">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl font-bold bg-black/50 px-4 py-2 rounded-lg">
                    Click to expand
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-2 text-center">Watch how to play - Click video to expand</p>
            </div>
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
            
            {/* Theme Selector - Premium themes locked until purchased with RP */}
            <div className="mb-6 w-full max-w-2xl mx-auto">
              <GameThemeSelector
                gameId="blade-bounce"
                gameName="Blade Bounce"
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
              />
            </div>
            
            {/* Start Game Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:scale-105 transform text-lg sm:text-xl pointer-events-auto"
              >
                🚀 START GAME
              </button>
              {onExit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform text-lg sm:text-xl pointer-events-auto"
                >
                  ← Back to Menu
                </button>
              )}
            </div>
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

