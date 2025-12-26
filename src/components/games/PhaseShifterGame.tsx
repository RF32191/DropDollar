'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// PHASE SHIFTER
// ============================================================================
// A rhythm-based platformer where platforms appear/disappear with the beat
// Jump when the platform disappears, land when it reappears
// Dodge horizontal music note projectiles with low/mid/high jumps
// 3D astronaut character in a neon universe
// ============================================================================

interface PhaseShifterGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface MusicNote {
  mesh: THREE.Group;
  x: number;
  y: number; // 0 = low, 1 = mid, 2 = high
  speed: number;
  hit: boolean;
}

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

// Seeded RNG for projectile patterns
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

// Multiple beat patterns/songs - fixed for all players
// 1 = beat (platform disappears), 0 = silence (platform appears)

// Song 1: "Neon Pulse" - 120 BPM, steady electronic
const SONG_NEON_PULSE = {
  name: "Neon Pulse",
  bpm: 120,
  pattern: [
    1, 0, 1, 0, 1, 1, 0, 0, // Bar 1 - Intro
    1, 0, 1, 0, 1, 0, 1, 0, // Bar 2 - Build
    1, 1, 0, 0, 1, 1, 0, 0, // Bar 3 - Drop
    1, 0, 1, 1, 0, 0, 1, 0, // Bar 4 - Groove
    1, 0, 0, 1, 1, 0, 0, 1, // Bar 5 - Variation
    0, 1, 1, 0, 1, 0, 1, 0, // Bar 6 - Bridge
    1, 1, 1, 0, 0, 0, 1, 1, // Bar 7 - Climax
    0, 0, 1, 1, 1, 0, 0, 1, // Bar 8 - Outro
  ]
};

// Song 2: "Space Funk" - 110 BPM, funky groove
const SONG_SPACE_FUNK = {
  name: "Space Funk",
  bpm: 110,
  pattern: [
    1, 0, 0, 1, 0, 1, 0, 0, // Bar 1 - Funky start
    1, 0, 0, 1, 0, 0, 1, 0, // Bar 2 - Groove
    0, 1, 0, 1, 1, 0, 0, 1, // Bar 3 - Syncopation
    1, 0, 1, 0, 0, 1, 0, 1, // Bar 4 - Walk
    0, 0, 1, 1, 0, 0, 1, 1, // Bar 5 - Double hits
    1, 0, 0, 0, 1, 1, 0, 0, // Bar 6 - Pause groove
    0, 1, 1, 0, 0, 1, 1, 0, // Bar 7 - Offbeat
    1, 0, 1, 0, 1, 0, 1, 1, // Bar 8 - Finale
  ]
};

// Song 3: "Cosmic Rush" - 140 BPM, fast and intense
const SONG_COSMIC_RUSH = {
  name: "Cosmic Rush",
  bpm: 140,
  pattern: [
    1, 1, 0, 1, 1, 0, 1, 0, // Bar 1 - Fast start
    1, 0, 1, 1, 0, 1, 0, 1, // Bar 2 - Intense
    0, 1, 1, 1, 0, 0, 1, 1, // Bar 3 - Rush
    1, 1, 0, 0, 1, 1, 1, 0, // Bar 4 - Builds
    1, 0, 1, 0, 1, 1, 0, 1, // Bar 5 - Peak
    0, 1, 0, 1, 1, 0, 1, 1, // Bar 6 - Sustain
    1, 1, 1, 0, 1, 0, 0, 1, // Bar 7 - Chaos
    0, 0, 1, 1, 0, 1, 1, 1, // Bar 8 - Grand finale
  ]
};

// Song 4: "Lunar Chill" - 90 BPM, relaxed but tricky
const SONG_LUNAR_CHILL = {
  name: "Lunar Chill",
  bpm: 90,
  pattern: [
    1, 0, 0, 0, 1, 0, 0, 0, // Bar 1 - Slow intro
    0, 0, 1, 0, 0, 0, 1, 0, // Bar 2 - Minimal
    1, 0, 0, 1, 0, 0, 0, 1, // Bar 3 - Sparse
    0, 1, 0, 0, 1, 0, 1, 0, // Bar 4 - Building
    1, 0, 1, 0, 0, 1, 0, 0, // Bar 5 - Groove
    0, 0, 0, 1, 1, 0, 0, 1, // Bar 6 - Surprise
    1, 0, 0, 0, 0, 1, 1, 0, // Bar 7 - Chill peak
    0, 1, 0, 1, 0, 0, 0, 1, // Bar 8 - Fade
  ]
};

// Song 5: "Asteroid Storm" - 130 BPM, chaotic
const SONG_ASTEROID_STORM = {
  name: "Asteroid Storm",
  bpm: 130,
  pattern: [
    1, 1, 1, 0, 1, 0, 1, 1, // Bar 1 - Storm begins
    0, 1, 1, 1, 0, 1, 0, 1, // Bar 2 - Chaos
    1, 0, 1, 1, 1, 0, 1, 0, // Bar 3 - Dodge frenzy
    1, 1, 0, 1, 0, 1, 1, 0, // Bar 4 - Intense
    0, 1, 1, 0, 1, 1, 0, 1, // Bar 5 - Storm peak
    1, 0, 0, 1, 1, 0, 1, 1, // Bar 6 - Relentless
    0, 1, 1, 1, 0, 0, 1, 1, // Bar 7 - Almost over
    1, 1, 0, 0, 1, 1, 1, 0, // Bar 8 - Storm ends
  ]
};

// All songs array
const ALL_SONGS = [SONG_NEON_PULSE, SONG_SPACE_FUNK, SONG_COSMIC_RUSH, SONG_LUNAR_CHILL, SONG_ASTEROID_STORM];

// Note colors for different heights
const NOTE_COLORS = {
  low: { main: 0x00ff00, glow: 0x44ff44 },    // Green for low
  mid: { main: 0xffff00, glow: 0xffff88 },    // Yellow for mid
  high: { main: 0xff00ff, glow: 0xff88ff }    // Magenta for high
};

// Platform color palette for cycling
const PLATFORM_COLORS = [
  0x00ffff, // Cyan
  0xff00ff, // Magenta
  0x00ff00, // Green
  0xff6600, // Orange
  0xff0088, // Pink
  0x00ff88, // Mint
  0xffff00, // Yellow
  0x8800ff, // Purple
];

export default function PhaseShifterGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: PhaseShifterGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [beatsHit, setBeatsHit] = useState(0);
  const [notesAvoided, setNotesAvoided] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [platformVisible, setPlatformVisible] = useState(true);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [currentSong, setCurrentSong] = useState(ALL_SONGS[0]);
  const [landings, setLandings] = useState(0);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const astronautRef = useRef<THREE.Group | null>(null);
  const platformRef = useRef<THREE.Group | null>(null);
  const notesRef = useRef<MusicNote[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(3);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beatIndexRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const platformVisibleRef = useRef(true);
  const playerYRef = useRef(0); // 0 = on platform, 1 = jumping
  const playerTargetYRef = useRef(0);
  const jumpHeightRef = useRef(0); // 0 = low, 1 = mid, 2 = high
  const isJumpingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const beatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasOnPlatformRef = useRef(false);
  const platformColorIndexRef = useRef(0);
  const currentSongRef = useRef(ALL_SONGS[0]);
  const landingsRef = useRef(0);
  
  // Constants
  const PLATFORM_Y = -2;
  const JUMP_HEIGHTS = [1.5, 3, 5]; // Low, mid, high
  const NOTE_HEIGHTS = [PLATFORM_Y + 1, PLATFORM_Y + 2.5, PLATFORM_Y + 4.5]; // Where notes fly
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          platform: 0xff6600,
          platformGlow: 0xff9900,
          astronaut: 0x9b59b6,
          astronautGlow: 0xbb79d6,
          note: 0x00ff88,
          noteGlow: 0x00ffaa,
          ambient: 0x2d1b4e,
          beat: 0xff3300
        };
      case 'christmas':
        return {
          background: 0x001122,
          platform: 0x00ff00,
          platformGlow: 0x44ff44,
          astronaut: 0xff0000,
          astronautGlow: 0xff4444,
          note: 0xffd700,
          noteGlow: 0xffec8b,
          ambient: 0x1e5631,
          beat: 0xff0000
        };
      default:
        return {
          background: 0x050510,
          platform: 0x00ffff,
          platformGlow: 0x00ccff,
          astronaut: 0xff00ff,
          astronautGlow: 0xff66ff,
          note: 0xffff00,
          noteGlow: 0xffff88,
          ambient: 0x1a1a3a,
          beat: 0xff00ff
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

  // Play beat sound
  const playBeatSound = useCallback((isBeat: boolean) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (isBeat) {
      oscillator.frequency.value = 200;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    } else {
      oscillator.frequency.value = 400;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    }
    
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  // Play hit sound
  const playHitSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 150;
    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
    
    // Vibrate on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  // Create 3D astronaut - ALL BLACK with WHITE GLASS HELMET
  const createAstronaut = useCallback((scene: THREE.Scene) => {
    const astronaut = new THREE.Group();
    
    // Helmet (white glass sphere)
    const helmetGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const helmetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 0.8;
    astronaut.add(helmet);
    
    // Visor (reflective glass front)
    const visorGeometry = new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaccff,
      emissive: 0x88aaff,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.7
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 0.85, 0.15);
    visor.rotation.x = -0.3;
    astronaut.add(visor);
    
    // Helmet ring (white rim)
    const ringGeometry = new THREE.TorusGeometry(0.45, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.2
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0.5;
    ring.rotation.x = Math.PI / 2;
    astronaut.add(ring);
    
    // Body (ALL BLACK capsule)
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 0.6, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: 0x000000,
      metalness: 0.3,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    astronaut.add(body);
    
    // Backpack (black)
    const backpackGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.3);
    const backpackMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.4,
      roughness: 0.6
    });
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    backpack.position.set(0, 0.1, -0.35);
    astronaut.add(backpack);
    
    // Backpack lights (small colored dots)
    const lightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const redLight = new THREE.Mesh(lightGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    redLight.position.set(-0.15, 0.3, -0.5);
    astronaut.add(redLight);
    const greenLight = new THREE.Mesh(lightGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    greenLight.position.set(0.15, 0.3, -0.5);
    astronaut.add(greenLight);
    
    // Arms (black)
    const armGeometry = new THREE.CapsuleGeometry(0.12, 0.4, 4, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.3,
      roughness: 0.7
    });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.55, 0.1, 0);
    leftArm.rotation.z = 0.3;
    astronaut.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.55, 0.1, 0);
    rightArm.rotation.z = -0.3;
    astronaut.add(rightArm);
    
    // Gloves (white)
    const gloveGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const gloveMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
    leftGlove.position.set(-0.7, -0.15, 0);
    astronaut.add(leftGlove);
    const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
    rightGlove.position.set(0.7, -0.15, 0);
    astronaut.add(rightGlove);
    
    // Legs (black)
    const legGeometry = new THREE.CapsuleGeometry(0.15, 0.5, 4, 8);
    
    const leftLeg = new THREE.Mesh(legGeometry, armMaterial);
    leftLeg.position.set(-0.2, -0.7, 0);
    astronaut.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, armMaterial);
    rightLeg.position.set(0.2, -0.7, 0);
    astronaut.add(rightLeg);
    
    // Boots (white)
    const bootGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.25);
    const bootMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    leftBoot.position.set(-0.2, -1.1, 0.05);
    astronaut.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
    rightBoot.position.set(0.2, -1.1, 0.05);
    astronaut.add(rightBoot);
    
    // Subtle white glow around helmet
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.8;
    astronaut.add(glow);
    
    astronaut.position.set(0, PLATFORM_Y + 1.5, 0);
    scene.add(astronaut);
    
    return astronaut;
  }, []);

  // Create platform (hexagonal neon shape)
  const createPlatform = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const platform = new THREE.Group();
    
    // Main hexagonal platform
    const hexShape = new THREE.Shape();
    const sides = 6;
    const radius = 3;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }
    hexShape.closePath();
    
    const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
    const platformGeometry = new THREE.ExtrudeGeometry(hexShape, extrudeSettings);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: colors.platform,
      emissive: colors.platform,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9
    });
    const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
    platformMesh.rotation.x = -Math.PI / 2;
    platform.add(platformMesh);
    
    // Neon edge glow
    const edgeGeometry = new THREE.TorusGeometry(radius, 0.08, 8, 6);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: colors.platformGlow,
      transparent: true,
      opacity: 0.8
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.2;
    platform.add(edge);
    
    // Inner glow ring
    const innerGlowGeometry = new THREE.RingGeometry(0.5, radius - 0.5, 6);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: colors.platformGlow,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.y = 0.35;
    platform.add(innerGlow);
    
    // Grid pattern on platform
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.RingGeometry(0.8 + i * 0.8, 0.85 + i * 0.8, 6);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: colors.platform,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.32;
      platform.add(ring);
    }
    
    platform.position.y = PLATFORM_Y;
    scene.add(platform);
    
    return platform;
  }, [getThemeColors]);

  // Create music note projectile - DIFFERENT COLORS FOR EACH HEIGHT
  const createMusicNote = useCallback((height: number, scene: THREE.Scene): MusicNote => {
    const note = new THREE.Group();
    
    // Get colors based on height: 0=low(green), 1=mid(yellow), 2=high(magenta)
    const noteColor = height === 0 ? NOTE_COLORS.low : height === 1 ? NOTE_COLORS.mid : NOTE_COLORS.high;
    
    // Note head (oval)
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    headGeometry.scale(1.3, 1, 0.8);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: noteColor.main,
      emissive: noteColor.glow,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.rotation.z = -0.3;
    note.add(head);
    
    // Note stem
    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: noteColor.main,
      emissive: noteColor.glow,
      emissiveIntensity: 0.5
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.set(0.25, 0.5, 0);
    note.add(stem);
    
    // Note flag
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.quadraticCurveTo(0.4, -0.2, 0.3, -0.5);
    flagShape.lineTo(0, -0.3);
    flagShape.lineTo(0, 0);
    
    const flagGeometry = new THREE.ShapeGeometry(flagShape);
    const flagMaterial = new THREE.MeshBasicMaterial({
      color: noteColor.glow,
      side: THREE.DoubleSide
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0.25, 1, 0);
    note.add(flag);
    
    // Glow
    const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: noteColor.glow,
      transparent: true,
      opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    note.add(glow);
    
    // Height indicator ring
    const ringGeometry = new THREE.TorusGeometry(0.5, 0.03, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: noteColor.main,
      transparent: true,
      opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    note.add(ring);
    
    // Position from right side
    note.position.set(12, NOTE_HEIGHTS[height], 0);
    note.scale.setScalar(0.8);
    scene.add(note);
    
    return {
      mesh: note,
      x: 12,
      y: height,
      speed: 0.1 + currentSongRef.current.bpm * 0.0005, // Speed scales with BPM
      hit: false
    };
  }, []);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.FogExp2(colors.background, 0.03);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    // Neon point lights
    const pointLight1 = new THREE.PointLight(colors.platform, 1, 20);
    pointLight1.position.set(-5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(colors.astronautGlow, 1, 20);
    pointLight2.position.set(5, 5, -5);
    scene.add(pointLight2);
    
    // Create platform
    platformRef.current = createPlatform(scene);
    
    // Create astronaut
    astronautRef.current = createAstronaut(scene);
    
    // Starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    for (let i = 0; i < 500; i++) {
      starPositions.push(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    return { scene, camera, renderer };
  }, [getThemeColors, createPlatform, createAstronaut]);

  // Process beat
  const processBeat = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const song = currentSongRef.current;
    const beatIndex = beatIndexRef.current % song.pattern.length;
    const isBeat = song.pattern[beatIndex] === 1;
    const beatDuration = 60000 / song.bpm;
    
    // Update platform visibility
    platformVisibleRef.current = !isBeat;
    setPlatformVisible(!isBeat);
    
    // Visual feedback
    if (platformRef.current) {
      platformRef.current.visible = !isBeat;
      
      // Flash effect on beat
      if (isBeat && sceneRef.current) {
        const colors = getThemeColors();
        const flash = new THREE.PointLight(colors.beat, 2, 10);
        flash.position.set(0, 2, 0);
        sceneRef.current.add(flash);
        setTimeout(() => {
          if (sceneRef.current) sceneRef.current.remove(flash);
        }, 100);
      }
    }
    
    // Play beat sound
    playBeatSound(isBeat);
    
    // Check if player should take damage
    if (!isBeat && isJumpingRef.current) {
      // Player is in the air when platform appears - good!
    } else if (isBeat && !isJumpingRef.current && playerYRef.current <= PLATFORM_Y + 1.6) {
      // Player is on platform when it disappears - they need to be jumping!
      // Give a small grace window
    }
    
    // Spawn music notes (RNG-based for variety)
    if (rngRef.current && rngRef.current.next() > 0.6) {
      const height = rngRef.current.nextInt(0, 2);
      if (sceneRef.current) {
        const note = createMusicNote(height, sceneRef.current);
        notesRef.current.push(note);
      }
    }
    
    beatIndexRef.current++;
    setCurrentBeat(beatIndexRef.current);
    
    // Schedule next beat using song's BPM
    beatTimerRef.current = setTimeout(processBeat, beatDuration);
  }, [playBeatSound, createMusicNote, getThemeColors]);

  // Handle jump
  const handleJump = useCallback((height: 0 | 1 | 2) => {
    if (!gameActiveRef.current || isJumpingRef.current) return;
    
    isJumpingRef.current = true;
    jumpHeightRef.current = height;
    playerTargetYRef.current = PLATFORM_Y + 1.5 + JUMP_HEIGHTS[height];
    
    // Award points for jumping at right time
    if (!platformVisibleRef.current) {
      // Platform is gone, good time to jump!
      const points = 50 + comboRef.current * 10;
      scoreRef.current += points;
      setScore(scoreRef.current);
      setBeatsHit(prev => prev + 1);
      
      comboRef.current++;
      setCombo(comboRef.current);
      if (comboRef.current > maxCombo) setMaxCombo(comboRef.current);
      
      addFloatingScore(`+${points}`, window.innerWidth / 2, window.innerHeight / 2 - 100, '#00ff88');
    }
  }, [addFloatingScore, maxCombo]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (beatTimerRef.current) clearTimeout(beatTimerRef.current);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'phase-shifter',
          score: scoreRef.current,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            beatsHit,
            notesAvoided,
            maxCombo,
            landings: landingsRef.current,
            song: currentSongRef.current.name,
            livesRemaining: livesRef.current,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'phase-shifter',
            action: 'game_complete',
            score: scoreRef.current,
            metadata: {
              beatsHit,
              notesAvoided,
              maxCombo,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, beatsHit, notesAvoided, maxCombo, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    // Update astronaut position (jumping)
    if (astronautRef.current) {
      const currentY = astronautRef.current.position.y;
      const targetY = playerTargetYRef.current;
      
      if (isJumpingRef.current) {
        // Moving up
        if (currentY < targetY - 0.1) {
          astronautRef.current.position.y += 0.15;
        } else {
          // Start falling
          isJumpingRef.current = false;
        }
      } else {
        // Falling back down
        const groundY = platformVisibleRef.current ? PLATFORM_Y + 1.5 : PLATFORM_Y - 5;
        
        if (currentY > groundY + 0.1) {
          astronautRef.current.position.y -= 0.12;
          wasOnPlatformRef.current = false;
        } else {
          astronautRef.current.position.y = Math.max(currentY, groundY);
          
          // Check if fell off (platform was gone and player hit the void)
          if (!platformVisibleRef.current && currentY < PLATFORM_Y) {
            // Player fell!
            livesRef.current--;
            setLives(livesRef.current);
            playHitSound();
            comboRef.current = 0;
            setCombo(0);
            wasOnPlatformRef.current = false;
            
            // Reset position
            astronautRef.current.position.y = PLATFORM_Y + 1.5;
            
            if (livesRef.current <= 0) {
              endGame();
              return;
            }
          } else if (platformVisibleRef.current && !wasOnPlatformRef.current) {
            // LANDED ON PLATFORM! Award 100 points and change color
            wasOnPlatformRef.current = true;
            landingsRef.current++;
            setLandings(landingsRef.current);
            
            // Award 100 points for landing
            const landingPoints = 100;
            scoreRef.current += landingPoints;
            setScore(scoreRef.current);
            
            addFloatingScore(`LAND! +${landingPoints}`, window.innerWidth / 2, window.innerHeight / 2, '#00ffff');
            
            // Change platform color
            platformColorIndexRef.current = (platformColorIndexRef.current + 1) % PLATFORM_COLORS.length;
            const newColor = PLATFORM_COLORS[platformColorIndexRef.current];
            
            if (platformRef.current) {
              platformRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
                  if (material.color) {
                    material.color.setHex(newColor);
                    if ('emissive' in material) {
                      material.emissive.setHex(newColor);
                    }
                  }
                }
              });
            }
            
            // Play landing sound
            if (audioContextRef.current) {
              const ctx = audioContextRef.current;
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 600;
              osc.type = 'sine';
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.15);
            }
            
            // Vibrate on landing
            if ('vibrate' in navigator) {
              navigator.vibrate(30);
            }
          }
        }
      }
      
      playerYRef.current = astronautRef.current.position.y;
      
      // Astronaut wobble animation
      astronautRef.current.rotation.z = Math.sin(Date.now() * 0.005) * 0.1;
    }
    
    // Update music notes
    const playerY = playerYRef.current;
    notesRef.current.forEach((note, index) => {
      if (note.hit) return;
      
      // Move note left
      note.x -= note.speed;
      note.mesh.position.x = note.x;
      
      // Rotate note
      note.mesh.rotation.y += 0.05;
      note.mesh.rotation.z = Math.sin(Date.now() * 0.01 + index) * 0.2;
      
      // Check collision with player
      if (note.x < 1 && note.x > -1) {
        const noteY = NOTE_HEIGHTS[note.y];
        const playerHitboxTop = playerY + 0.8;
        const playerHitboxBottom = playerY - 0.8;
        
        if (noteY >= playerHitboxBottom && noteY <= playerHitboxTop) {
          // Hit by note!
          note.hit = true;
          livesRef.current--;
          setLives(livesRef.current);
          playHitSound();
          comboRef.current = 0;
          setCombo(0);
          
          addFloatingScore('OUCH!', window.innerWidth / 2, window.innerHeight / 2, '#ff4444');
          
          if (livesRef.current <= 0) {
            endGame();
            return;
          }
        }
      }
      
      // Remove if passed
      if (note.x < -12) {
        if (!note.hit) {
          // Successfully dodged!
          setNotesAvoided(prev => prev + 1);
          const points = 25;
          scoreRef.current += points;
          setScore(scoreRef.current);
        }
        if (sceneRef.current) {
          sceneRef.current.remove(note.mesh);
        }
      }
    });
    
    // Clean up passed notes
    notesRef.current = notesRef.current.filter(n => n.x > -12);
    
    // Platform pulse effect
    if (platformRef.current && platformVisibleRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.02;
      platformRef.current.scale.setScalar(scale);
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [playHitSound, addFloatingScore, endGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === '1') {
        e.preventDefault();
        handleJump(0); // Low jump
      } else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === '2') {
        e.preventDefault();
        handleJump(1); // Mid jump
      } else if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E' || e.key === '3') {
        e.preventDefault();
        handleJump(2); // High jump
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump, gameState]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setBeatsHit(0);
    setNotesAvoided(0);
    setLives(3);
    setTimeLeft(60);
    setPlatformVisible(true);
    setCurrentBeat(0);
    setLandings(0);
    
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = 3;
    beatIndexRef.current = 0;
    platformVisibleRef.current = true;
    playerYRef.current = PLATFORM_Y + 1.5;
    playerTargetYRef.current = PLATFORM_Y + 1.5;
    isJumpingRef.current = false;
    wasOnPlatformRef.current = true; // Start on platform
    platformColorIndexRef.current = 0;
    landingsRef.current = 0;
    
    // Pick a random song based on day (same song for everyone on same day)
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const songIndex = seed % ALL_SONGS.length;
    currentSongRef.current = ALL_SONGS[songIndex];
    setCurrentSong(ALL_SONGS[songIndex]);
    
    // Reset astronaut position
    if (astronautRef.current) {
      astronautRef.current.position.y = PLATFORM_Y + 1.5;
    }
    
    // Reset platform color to first color
    if (platformRef.current) {
      const initialColor = PLATFORM_COLORS[0];
      platformRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
          if (material.color) {
            material.color.setHex(initialColor);
            if ('emissive' in material) {
              material.emissive.setHex(initialColor);
            }
          }
        }
      });
    }
    
    // Clear notes
    notesRef.current.forEach(note => {
      if (sceneRef.current) sceneRef.current.remove(note.mesh);
    });
    notesRef.current = [];
    
    // Reinitialize RNG for projectiles
    rngRef.current = new SeededRandom(seed);
    
    gameActiveRef.current = true;
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start beat processing after a short delay
    setTimeout(() => {
      processBeat();
    }, 1000);
    
    gameLoop();
  }, [processBeat, gameLoop, endGame]);

  // Initialize
  useEffect(() => {
    if (gameState === 'instructions') {
      initScene();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (beatTimerRef.current) clearTimeout(beatTimerRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
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
            
            {/* Center: Timer & Beat & Song */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-6 py-2 border border-white/10 text-center">
              <div className="text-xs text-purple-400 mb-1">🎵 {currentSong.name} ({currentSong.bpm} BPM)</div>
              <div className={`text-4xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </div>
              <div className={`text-sm font-bold mt-1 ${platformVisible ? 'text-cyan-400' : 'text-pink-400'}`}>
                {platformVisible ? '🟢 PLATFORM' : '🔴 JUMP!'}
              </div>
            </div>
            
            {/* Right: Lives & Landings */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-2xl">
                {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
              </div>
              <div className="text-xs text-gray-400">LIVES</div>
              <div className="text-sm text-cyan-400 mt-1">{landings} lands</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Jump Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex gap-3">
            <button
              onClick={() => handleJump(0)}
              className="px-6 py-4 bg-gradient-to-t from-green-700 to-green-500 hover:from-green-600 hover:to-green-400 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
            >
              <div className="text-xl">⬇️</div>
              <div className="text-xs">LOW</div>
            </button>
            <button
              onClick={() => handleJump(1)}
              className="px-6 py-4 bg-gradient-to-t from-yellow-700 to-yellow-500 hover:from-yellow-600 hover:to-yellow-400 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
            >
              <div className="text-xl">⬆️</div>
              <div className="text-xs">MID</div>
            </button>
            <button
              onClick={() => handleJump(2)}
              className="px-6 py-4 bg-gradient-to-t from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
            >
              <div className="text-xl">🚀</div>
              <div className="text-xs">HIGH</div>
            </button>
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Keys: 1/↓ Low • 2/↑/Space Mid • 3/→ High
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
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 mb-4">
              🎵 Phase Shifter
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌟</span>
                <div>
                  <div className="font-bold text-white">Feel the Beat</div>
                  <div className="text-sm">Platform disappears on beats - jump to survive!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎹</span>
                <div>
                  <div className="font-bold text-white">3 Jump Heights</div>
                  <div className="text-sm">LOW to dodge low notes, MID for middle, HIGH for top!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎵</span>
                <div>
                  <div className="font-bold text-white">Dodge the Notes</div>
                  <div className="text-sm">Music notes fly at different heights - pick your jump wisely!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <div className="font-bold text-white">Build Combos</div>
                  <div className="text-sm">Jump at the right time for combo multipliers!</div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-xl text-white bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:via-purple-500 hover:to-pink-500 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              START SHIFTING
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {lives > 0 ? '🎵 Time Up!' : '💔 Game Over!'}
            </h2>
            
            <div className="text-sm text-purple-400 mb-2">🎵 {currentSong.name}</div>
            
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Landings</div>
                <div className="text-xl font-bold text-cyan-400">{landings}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Beats Hit</div>
                <div className="text-xl font-bold text-purple-400">{beatsHit}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Notes Dodged</div>
                <div className="text-xl font-bold text-green-400">{notesAvoided}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Max Combo</div>
                <div className="text-xl font-bold text-yellow-400">{maxCombo}x</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Lives Left</div>
                <div className="text-xl font-bold text-red-400">{lives}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Song BPM</div>
                <div className="text-xl font-bold text-pink-400">{currentSong.bpm}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white rounded-xl font-bold transition-all"
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
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
      `}</style>
    </div>
  );
}

