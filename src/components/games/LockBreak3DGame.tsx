'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// LOCK BREAK 3D
// ============================================================================
// Core Mechanic: Rotate 3D lock cylinder to find the right combination
// Visual + Audio + Haptic cues guide the player
// 3 numbers per lock, faster levels, decoys in later rounds
// Satisfying 3D experience with vibration feedback
// ============================================================================

interface LockBreak3DGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface LockNumber {
  value: number;
  found: boolean;
  decoys: number[]; // Fake positions that give false feedback
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

export default function LockBreak3DGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: LockBreak3DGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'unlocking' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentNumberIndex, setCurrentNumberIndex] = useState(0);
  const [lockNumbers, setLockNumbers] = useState<LockNumber[]>([]);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [locksOpened, setLocksOpened] = useState(0);
  const [perfectUnlocks, setPerfectUnlocks] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'cold' | 'warm' | 'hot' | 'decoy'>('none');
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lockRef = useRef<THREE.Group | null>(null);
  const dialRef = useRef<THREE.Group | null>(null);
  const indicatorRef = useRef<THREE.Mesh | null>(null);
  const glowRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const currentRotationRef = useRef(0);
  const lockNumbersRef = useRef<LockNumber[]>([]);
  const currentNumberIndexRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastClickTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);
  const perfectStartRef = useRef(0);
  
  // Constants
  const TOTAL_POSITIONS = 40; // 40 positions on the dial (like a real lock)
  const POSITION_ANGLE = (Math.PI * 2) / TOTAL_POSITIONS;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          lock: 0x1a0a2e,
          dial: 0x4a1a6b,
          dialMarks: 0xff6600,
          indicator: 0x00ff88,
          cold: 0x6666ff,
          warm: 0xffaa00,
          hot: 0xff0000,
          decoy: 0x9b59b6,
          ambient: 0x2d1b4e
        };
      case 'christmas':
        return {
          background: 0x001122,
          lock: 0x0a2818,
          dial: 0x1e5631,
          dialMarks: 0xffd700,
          indicator: 0xff0000,
          cold: 0x87ceeb,
          warm: 0xffd700,
          hot: 0xff0000,
          decoy: 0x00ff00,
          ambient: 0x1e5631
        };
      default:
        return {
          background: 0x0a0a1a,
          lock: 0x1a1a2e,
          dial: 0x2a2a4a,
          dialMarks: 0x00ffff,
          indicator: 0xff3366,
          cold: 0x3366ff,
          warm: 0xffaa00,
          hot: 0xff0000,
          decoy: 0x9b59b6,
          ambient: 0x1a1a3a
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

  // Play click sound
  const playClickSound = useCallback((intensity: number, isDecoy: boolean = false) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sounds for different feedback
    if (isDecoy) {
      oscillator.frequency.value = 200 + Math.random() * 100;
      oscillator.type = 'sawtooth';
    } else if (intensity > 0.9) {
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
    } else if (intensity > 0.7) {
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
    } else if (intensity > 0.4) {
      oscillator.frequency.value = 400;
      oscillator.type = 'triangle';
    } else {
      oscillator.frequency.value = 200;
      oscillator.type = 'triangle';
    }
    
    gainNode.gain.setValueAtTime(0.15 * intensity, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  // Play unlock sound
  const playUnlockSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    
    // Satisfying unlock sequence
    [0, 100, 200].forEach((delay, i) => {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 400 + i * 200;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }, delay);
    });
  }, []);

  // Trigger vibration
  const triggerVibration = useCallback((intensity: number, isDecoy: boolean = false) => {
    // Mobile vibration
    if ('vibrate' in navigator) {
      if (isDecoy) {
        navigator.vibrate([20, 10, 20]); // Double pulse for decoy
      } else if (intensity > 0.9) {
        navigator.vibrate(100); // Strong for hot
      } else if (intensity > 0.7) {
        navigator.vibrate(50); // Medium for warm
      } else if (intensity > 0.4) {
        navigator.vibrate(20); // Light for cold
      }
    }
    
    // For desktop, audio feedback is the equalizer
    // Play louder/more distinct sounds on desktop
    playClickSound(intensity, isDecoy);
  }, [playClickSound]);

  // Generate lock combination
  const generateLockCombination = useCallback((level: number, rng: SeededRandom): LockNumber[] => {
    const numbers: LockNumber[] = [];
    const usedPositions = new Set<number>();
    
    // Generate 3 unique target numbers
    for (let i = 0; i < 3; i++) {
      let value: number;
      do {
        value = rng.nextInt(0, TOTAL_POSITIONS - 1);
      } while (usedPositions.has(value));
      usedPositions.add(value);
      
      // Generate decoys based on level (more decoys at higher levels)
      const numDecoys = Math.min(Math.floor(level / 2), 5);
      const decoys: number[] = [];
      
      for (let j = 0; j < numDecoys; j++) {
        let decoy: number;
        do {
          // Decoys are close to the real value to be tricky
          const offset = rng.nextInt(2, 5) * (rng.next() > 0.5 ? 1 : -1);
          decoy = (value + offset + TOTAL_POSITIONS) % TOTAL_POSITIONS;
        } while (usedPositions.has(decoy) || decoys.includes(decoy));
        decoys.push(decoy);
      }
      
      numbers.push({ value, found: false, decoys });
    }
    
    return numbers;
  }, []);

  // Create lock mesh
  const createLock = useCallback((scene: THREE.Scene) => {
    const colors = getThemeColors();
    const lock = new THREE.Group();
    
    // Lock body
    const bodyGeometry = new THREE.BoxGeometry(4, 5, 2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colors.lock,
      metalness: 0.8,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2;
    lock.add(body);
    
    // Lock shackle
    const shacklePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.8, 4, 0),
      new THREE.Vector3(-0.8, 6, 0),
      new THREE.Vector3(0, 7, 0),
      new THREE.Vector3(0.8, 6, 0),
      new THREE.Vector3(0.8, 4, 0)
    ]);
    const shackleGeometry = new THREE.TubeGeometry(shacklePath, 20, 0.3, 16, false);
    const shackleMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.2
    });
    const shackle = new THREE.Mesh(shackleGeometry, shackleMaterial);
    lock.add(shackle);
    
    // Dial container
    const dialContainer = new THREE.Group();
    
    // Dial base
    const dialBaseGeometry = new THREE.CylinderGeometry(1.8, 1.8, 0.5, 32);
    const dialBaseMaterial = new THREE.MeshStandardMaterial({
      color: colors.dial,
      metalness: 0.6,
      roughness: 0.4
    });
    const dialBase = new THREE.Mesh(dialBaseGeometry, dialBaseMaterial);
    dialBase.rotation.x = Math.PI / 2;
    dialContainer.add(dialBase);
    
    // Dial with numbers
    const dialGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 64);
    const dialMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.3
    });
    const dial = new THREE.Mesh(dialGeometry, dialMaterial);
    dial.rotation.x = Math.PI / 2;
    dial.position.z = 0.2;
    dialContainer.add(dial);
    
    // Dial markings and numbers
    for (let i = 0; i < TOTAL_POSITIONS; i++) {
      const angle = (i / TOTAL_POSITIONS) * Math.PI * 2;
      const isMajor = i % 5 === 0;
      
      // Tick marks
      const tickLength = isMajor ? 0.25 : 0.15;
      const tickGeometry = new THREE.BoxGeometry(0.03, tickLength, 0.05);
      const tickMaterial = new THREE.MeshBasicMaterial({
        color: colors.dialMarks
      });
      const tick = new THREE.Mesh(tickGeometry, tickMaterial);
      tick.position.set(
        Math.sin(angle) * (1.3 - tickLength / 2),
        Math.cos(angle) * (1.3 - tickLength / 2),
        0.35
      );
      tick.rotation.z = -angle;
      dialContainer.add(tick);
    }
    
    // Center knob
    const knobGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 32);
    const knobMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.1
    });
    const knob = new THREE.Mesh(knobGeometry, knobMaterial);
    knob.rotation.x = Math.PI / 2;
    knob.position.z = 0.5;
    dialContainer.add(knob);
    
    // Grip lines on knob
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const gripGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.35);
      const gripMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const grip = new THREE.Mesh(gripGeometry, gripMaterial);
      grip.position.set(
        Math.sin(angle) * 0.35,
        Math.cos(angle) * 0.35,
        0.5
      );
      grip.rotation.z = -angle;
      dialContainer.add(grip);
    }
    
    dialContainer.position.set(0, 1.5, 1.1);
    lock.add(dialContainer);
    dialRef.current = dialContainer;
    
    // Indicator arrow
    const indicatorGeometry = new THREE.ConeGeometry(0.15, 0.4, 3);
    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: colors.indicator,
      emissive: colors.indicator,
      emissiveIntensity: 0.5
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.rotation.z = Math.PI;
    indicator.position.set(0, 3.2, 1.3);
    lock.add(indicator);
    indicatorRef.current = indicator;
    
    // Glow effect (for feedback)
    const glowGeometry = new THREE.RingGeometry(1.6, 2.2, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 1.5, 1.5);
    lock.add(glow);
    glowRef.current = glow;
    
    scene.add(lock);
    return lock;
  }, [getThemeColors]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 20);
    pointLight.position.set(0, 5, 5);
    scene.add(pointLight);
    
    // Create lock
    lockRef.current = createLock(scene);
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    return { scene, camera, renderer };
  }, [getThemeColors, createLock]);

  // Calculate feedback based on current position
  const calculateFeedback = useCallback((rotation: number): { type: 'none' | 'cold' | 'warm' | 'hot' | 'decoy'; intensity: number } => {
    const currentNumbers = lockNumbersRef.current;
    const index = currentNumberIndexRef.current;
    
    if (index >= currentNumbers.length) {
      return { type: 'none', intensity: 0 };
    }
    
    const target = currentNumbers[index];
    const currentPos = Math.round(((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / POSITION_ANGLE) % TOTAL_POSITIONS;
    
    // Check for decoy
    for (const decoy of target.decoys) {
      const diff = Math.abs(currentPos - decoy);
      const wrappedDiff = Math.min(diff, TOTAL_POSITIONS - diff);
      if (wrappedDiff <= 1) {
        return { type: 'decoy', intensity: 0.8 };
      }
    }
    
    // Check distance to target
    const diff = Math.abs(currentPos - target.value);
    const wrappedDiff = Math.min(diff, TOTAL_POSITIONS - diff);
    
    if (wrappedDiff === 0) {
      return { type: 'hot', intensity: 1.0 };
    } else if (wrappedDiff <= 2) {
      return { type: 'hot', intensity: 0.9 };
    } else if (wrappedDiff <= 5) {
      return { type: 'warm', intensity: 0.7 };
    } else if (wrappedDiff <= 10) {
      return { type: 'cold', intensity: 0.4 };
    }
    
    return { type: 'none', intensity: 0 };
  }, []);

  // Lock in current number
  const lockInNumber = useCallback(() => {
    const currentNumbers = lockNumbersRef.current;
    const index = currentNumberIndexRef.current;
    
    if (index >= currentNumbers.length) return;
    
    const target = currentNumbers[index];
    const currentPos = Math.round(((currentRotationRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / POSITION_ANGLE) % TOTAL_POSITIONS;
    
    // Check if on target
    const diff = Math.abs(currentPos - target.value);
    const wrappedDiff = Math.min(diff, TOTAL_POSITIONS - diff);
    
    if (wrappedDiff <= 1) {
      // Success!
      target.found = true;
      currentNumbers[index] = target;
      lockNumbersRef.current = currentNumbers;
      setLockNumbers([...currentNumbers]);
      
      // Calculate points based on precision
      const precision = wrappedDiff === 0 ? 1 : 0.8;
      const timeTaken = (Date.now() - perfectStartRef.current) / 1000;
      const speedBonus = Math.max(0, 100 - timeTaken * 10);
      const points = Math.floor(100 * precision + speedBonus);
      
      scoreRef.current += points;
      setScore(scoreRef.current);
      
      addFloatingScore(`+${points}`, window.innerWidth / 2, window.innerHeight / 2 - 50, '#00ff88');
      
      playUnlockSound();
      triggerVibration(1.0);
      
      // Move to next number
      currentNumberIndexRef.current++;
      setCurrentNumberIndex(currentNumberIndexRef.current);
      perfectStartRef.current = Date.now();
      
      // Check if lock is complete
      if (currentNumberIndexRef.current >= 3) {
        completeLock();
      }
    } else {
      // Wrong position - penalty
      const penalty = 25;
      scoreRef.current = Math.max(0, scoreRef.current - penalty);
      setScore(scoreRef.current);
      addFloatingScore(`-${penalty}`, window.innerWidth / 2, window.innerHeight / 2, '#ff4444');
      triggerVibration(0.3);
    }
  }, [addFloatingScore, playUnlockSound, triggerVibration]);

  // Complete lock
  const completeLock = useCallback(() => {
    setGameState('unlocking');
    
    // Calculate bonus
    const lockBonus = 500;
    const levelBonus = levelRef.current * 50;
    const totalBonus = lockBonus + levelBonus;
    
    scoreRef.current += totalBonus;
    setScore(scoreRef.current);
    setLocksOpened(prev => prev + 1);
    
    // Check if all 3 were perfect (first try each)
    const isPerfect = lockNumbersRef.current.every(n => n.found);
    if (isPerfect) {
      setPerfectUnlocks(prev => prev + 1);
      scoreRef.current += 200;
      setScore(scoreRef.current);
    }
    
    addFloatingScore(`UNLOCKED! +${totalBonus}`, window.innerWidth / 2, window.innerHeight / 2, '#ffd700');
    
    // Animate lock opening
    if (lockRef.current) {
      // Shackle pops up animation
      const shackle = lockRef.current.children[1];
      if (shackle) {
        const startY = shackle.position.y;
        let animProgress = 0;
        const animatePop = () => {
          animProgress += 0.05;
          shackle.position.y = startY + Math.sin(animProgress * Math.PI) * 1;
          shackle.rotation.z = Math.sin(animProgress * Math.PI) * 0.3;
          
          if (animProgress < 1) {
            requestAnimationFrame(animatePop);
          } else {
            // Reset and go to next level
            setTimeout(() => {
              shackle.position.y = startY;
              shackle.rotation.z = 0;
              nextLevel();
            }, 500);
          }
        };
        animatePop();
      }
    }
  }, [addFloatingScore]);

  // Next level
  const nextLevel = useCallback(() => {
    levelRef.current++;
    setLevel(levelRef.current);
    
    // Generate new combination
    if (rngRef.current) {
      lockNumbersRef.current = generateLockCombination(levelRef.current, rngRef.current);
      setLockNumbers(lockNumbersRef.current);
    }
    
    // Reset state
    currentNumberIndexRef.current = 0;
    setCurrentNumberIndex(0);
    currentRotationRef.current = 0;
    setCurrentRotation(0);
    perfectStartRef.current = Date.now();
    
    if (dialRef.current) {
      dialRef.current.rotation.z = 0;
    }
    
    setGameState('playing');
  }, [generateLockCombination]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'lock-break-3d',
          score: scoreRef.current,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            locksOpened,
            perfectUnlocks,
            finalLevel: levelRef.current,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'lock-break-3d',
            action: 'game_complete',
            score: scoreRef.current,
            metadata: {
              locksOpened,
              perfectUnlocks,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, locksOpened, perfectUnlocks, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    // Update glow based on feedback
    if (glowRef.current && dialRef.current) {
      const colors = getThemeColors();
      const { type, intensity } = calculateFeedback(currentRotationRef.current);
      
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      
      switch (type) {
        case 'hot':
          material.color.setHex(colors.hot);
          material.opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
          break;
        case 'warm':
          material.color.setHex(colors.warm);
          material.opacity = 0.2 + Math.sin(Date.now() * 0.008) * 0.1;
          break;
        case 'cold':
          material.color.setHex(colors.cold);
          material.opacity = 0.1;
          break;
        case 'decoy':
          material.color.setHex(colors.decoy);
          material.opacity = 0.25 + Math.sin(Date.now() * 0.015) * 0.15;
          break;
        default:
          material.opacity = 0;
      }
      
      setFeedback(type);
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [calculateFeedback, getThemeColors]);

  // Handle rotation input
  const handleRotation = useCallback((delta: number) => {
    if (!gameActiveRef.current || gameState !== 'playing') return;
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Apply rotation
    currentRotationRef.current += delta;
    setCurrentRotation(currentRotationRef.current);
    
    if (dialRef.current) {
      dialRef.current.rotation.z = -currentRotationRef.current;
    }
    
    // Feedback on each "click" (position change)
    const positionChanged = Math.abs(delta) >= POSITION_ANGLE * 0.5;
    
    if (positionChanged && timeSinceLastClick > 50) {
      lastClickTimeRef.current = now;
      const { type, intensity } = calculateFeedback(currentRotationRef.current);
      triggerVibration(intensity, type === 'decoy');
    }
  }, [calculateFeedback, triggerVibration, gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          handleRotation(POSITION_ANGLE);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          handleRotation(-POSITION_ANGLE);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          lockInNumber();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRotation, lockInNumber, gameState]);

  // Mouse/touch controls
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let lastX = 0;
    let isDragging = false;
    
    const handleStart = (clientX: number) => {
      isDragging = true;
      lastX = clientX;
    };
    
    const handleMove = (clientX: number) => {
      if (!isDragging) return;
      
      const delta = (clientX - lastX) * 0.01;
      handleRotation(-delta);
      lastX = clientX;
    };
    
    const handleEnd = () => {
      isDragging = false;
    };
    
    const handleMouseDown = (e: MouseEvent) => handleStart(e.clientX);
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => handleEnd();
    
    const handleTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };
    const handleTouchEnd = () => handleEnd();
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleRotation(e.deltaY * 0.002);
    };
    
    containerRef.current?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    containerRef.current?.addEventListener('touchstart', handleTouchStart);
    containerRef.current?.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current?.addEventListener('touchend', handleTouchEnd);
    containerRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      containerRef.current?.removeEventListener('touchstart', handleTouchStart);
      containerRef.current?.removeEventListener('touchmove', handleTouchMove);
      containerRef.current?.removeEventListener('touchend', handleTouchEnd);
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [handleRotation, gameState]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setCurrentNumberIndex(0);
    setLocksOpened(0);
    setPerfectUnlocks(0);
    setTimeLeft(90);
    
    scoreRef.current = 0;
    levelRef.current = 1;
    currentNumberIndexRef.current = 0;
    currentRotationRef.current = 0;
    
    // Reinitialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate first combination
    lockNumbersRef.current = generateLockCombination(1, rngRef.current);
    setLockNumbers(lockNumbersRef.current);
    
    if (dialRef.current) {
      dialRef.current.rotation.z = 0;
    }
    
    gameActiveRef.current = true;
    startTimeRef.current = Date.now();
    perfectStartRef.current = Date.now();
    
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
    
    gameLoop();
  }, [generateLockCombination, gameLoop, endGame]);

  // Initialize
  useEffect(() => {
    if (gameState === 'instructions') {
      initScene();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
      {(gameState === 'playing' || gameState === 'unlocking') && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
            </div>
            
            {/* Center: Timer & Level */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-6 py-2 border border-white/10 text-center">
              <div className={`text-4xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </div>
              <div className="text-sm text-purple-400">Level {level}</div>
            </div>
            
            {/* Right: Progress */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{locksOpened} locks</div>
              <div className="text-sm text-yellow-400">{perfectUnlocks} perfect</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lock Progress */}
      {(gameState === 'playing' || gameState === 'unlocking') && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex gap-4 justify-center mb-2">
              {lockNumbers.map((num, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold border-2 transition-all ${
                    num.found
                      ? 'bg-green-500/30 border-green-500 text-green-400'
                      : i === currentNumberIndex
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 animate-pulse'
                        : 'bg-gray-700/50 border-gray-600 text-gray-500'
                  }`}
                >
                  {num.found ? '✓' : i === currentNumberIndex ? '?' : '•'}
                </div>
              ))}
            </div>
            
            {/* Feedback indicator */}
            <div className="flex justify-center">
              <div className={`px-4 py-1 rounded-full text-sm font-bold transition-all ${
                feedback === 'hot' 
                  ? 'bg-red-500/30 text-red-400 animate-pulse' 
                  : feedback === 'warm'
                    ? 'bg-orange-500/30 text-orange-400'
                    : feedback === 'cold'
                      ? 'bg-blue-500/30 text-blue-400'
                      : feedback === 'decoy'
                        ? 'bg-purple-500/30 text-purple-400'
                        : 'bg-gray-700/30 text-gray-500'
              }`}>
                {feedback === 'hot' ? '🔥 HOT!' : 
                 feedback === 'warm' ? '♨️ Warm' : 
                 feedback === 'cold' ? '❄️ Cold' :
                 feedback === 'decoy' ? '⚠️ Decoy!' :
                 '○ Searching...'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex gap-3">
            <button
              onClick={() => handleRotation(POSITION_ANGLE)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              ← Left
            </button>
            <button
              onClick={lockInNumber}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              LOCK IN
            </button>
            <button
              onClick={() => handleRotation(-POSITION_ANGLE)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              Right →
            </button>
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Drag dial, use arrow keys, or scroll wheel
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
              🔓 Lock Break 3D
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-white">Find 3 Numbers</div>
                  <div className="text-sm">Each lock has 3 secret positions!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">📳</span>
                <div>
                  <div className="font-bold text-white">Feel the Feedback</div>
                  <div className="text-sm">Hot = close! Vibration + sound guide you.</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-white">Watch for Decoys!</div>
                  <div className="text-sm">Purple = fake positions. Don't be fooled!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="font-bold text-white">90 Seconds</div>
                  <div className="text-sm">Crack as many locks as possible!</div>
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
              START CRACKING
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Time's Up!</h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Locks Opened</div>
                <div className="text-2xl font-bold text-white">{locksOpened}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Perfect Unlocks</div>
                <div className="text-2xl font-bold text-yellow-400">{perfectUnlocks}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Highest Level</div>
                <div className="text-2xl font-bold text-purple-400">{level}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Avg Points/Lock</div>
                <div className="text-2xl font-bold text-green-400">
                  {locksOpened > 0 ? Math.floor(score / locksOpened) : 0}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={startGame}
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
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
      `}</style>
    </div>
  );
}

