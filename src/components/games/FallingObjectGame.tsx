'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine } from '@/lib/gameEngine';
import { GameAudio } from '@/utils/gameAudio';
import GameCountdown from './GameCountdown';
import { FairRNGService, FallingObjectRNGConfig } from '@/lib/fairRNGService';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
console.log('');
console.log('💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰');
console.log('💰 FALLING OBJECT v8.0 - BUILD 20251127-1900');
console.log('💰 If you see this, NEW CODE IS RUNNING!');
console.log('🔒 Audit logs WILL be sent to admin dashboard');
console.log('💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰💰');
console.log('');

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface FallingObjectGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string; // For competition mode
  entryNumber?: number; // For competition mode
  isCompetitionMode?: boolean;
  gameId?: string; // For deterministic gameplay
}

interface FallingObject {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  size: number;
  type: 'coin' | 'dollar' | 'bonus-coin';
  value: number; // Points value
  bounces: number;
}

const OBJECT_TYPES = [
  { type: 'coin' as const, value: 10, weight: 0.6, emoji: '🪙', size: [30, 40] },
  { type: 'dollar' as const, value: 25, weight: 0.3, emoji: '💵', size: [35, 45] },
  { type: 'bonus-coin' as const, value: 50, weight: 0.1, emoji: '🏆', size: [40, 50] }
];

export default function FallingObjectGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, gameId }: FallingObjectGameProps) {
  // Get fair RNG configuration based on listing and attempt number
  const rngConfig = listingId && entryNumber 
    ? FairRNGService.getFallingObjectConfig(listingId, entryNumber)
    : null;
    
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [score, setScore] = useState(0);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [paddleX, setPaddleX] = useState(50); // Percentage position
  const [totalObjects, setTotalObjects] = useState(0);
  const [caughtObjects, setCaughtObjects] = useState(0);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [suitcaseGlow, setSuitcaseGlow] = useState<'none' | 'blue' | 'gold'>('none'); // Removed 'green' for performance
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const currentScoreRef = useRef(0); // Track current score for accurate game end reporting
  const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track glow timeout
  const lastFrameTimeRef = useRef<number>(Date.now()); // Track frame timing for smoothness
  const paddleXRef = useRef<number>(50); // Track paddle position for animation loop (avoid re-renders)
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null); // Background music during gameplay
  const audioContextRef = useRef<AudioContext | null>(null); // For victory sound

  // Audio feedback for catches
  const playPerfectCatchSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Perfect = high pitched "ding"
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      // Harmonic
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1600;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  const playGoodCatchSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 900;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  const playEdgeCatchSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  // Audio unlock mechanism for browser autoplay restrictions
  const audioUnlockedRef = useRef(false);
  
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
          console.log('✅ [FallingObjectGame] Audio unlocked');
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
    // Create audio element for catch-the-money.mp3
    const audio = new Audio('/catch-the-money.mp3');
    audio.loop = true;
    audio.volume = 0.7; // Set volume to 70% for better audibility
    audio.preload = 'auto'; // Preload the audio
    
    // Add error handling and logging
    audio.addEventListener('error', (e) => {
      console.warn('⚠️ [FallingObjectGame] Audio file error (non-critical):', e);
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('✅ [FallingObjectGame] Background music loaded successfully');
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ [FallingObjectGame] Background music ready to play');
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
              console.log('✅ [FallingObjectGame] Background music started playing on game start');
              audioUnlockedRef.current = true;
            })
            .catch((err) => {
              console.warn('⚠️ [FallingObjectGame] Audio play failed, will retry:', err);
              // Try again after a short delay
              setTimeout(() => {
                if (backgroundMusicRef.current && gameState === 'playing') {
                  backgroundMusicRef.current.play()
                    .then(() => {
                      audioUnlockedRef.current = true;
                      console.log('✅ [FallingObjectGame] Background music started on retry');
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
        console.warn('⚠️ [FallingObjectGame] Audio play failed (non-critical)');
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
        
        console.log('🎉 [FallingObjectGame] Victory sound played');
      } catch (err) {
        // Victory sound failed - game continues normally
        console.warn('⚠️ [FallingObjectGame] Victory sound failed (non-critical)');
      }
    }
  }, [gameState]);

  // Game engine with proper timer and RNG
  const { engine, timer, startGame, stopGame, resetGame } = useGameEngine({
    gameType: 'falling-objects',
    totalTime: 60,
    rng: {
      isPractice: !isCompetitionMode, // Practice mode if not competition
      listingId,
      entryNumber
    },
    onGameEnd: async () => {
      setGameState('ended');
      const accuracy = totalObjects > 0 ? (caughtObjects / totalObjects) * 100 : 0;
      
      // Always pass the full result object (both competition and practice modes)
      const gameResult = {
        score: currentScoreRef.current, // Use ref for most up-to-date score
        accuracy,
        avgReactionTime: 0 // Not applicable for this game
      };
      
      // 🔒 AUTO-AUDIT: Log to admin audit system (required for fair skill-based gaming)
      
      try {
        await logGameCompletion({
          gameType: GAME_TYPES.FALLING_OBJECT,
          gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
          score: currentScoreRef.current,
          accuracy,
          reactionTime: 0,
          durationSeconds: 60,
          additionalData: {
            listingId,
            entryNumber,
            caughtObjects,
            totalObjects
          }
        });
      } catch (error) {
        console.error('🎯 [FallingObject] Audit logging failed:', error);
      }
      
      onGameEnd(gameResult);
    }
  });

  const createRandomObject = useCallback(() => {
    // Weighted random selection for object types
    const rand = engine.random();
    let selectedType = OBJECT_TYPES[0]; // Default to coin
    let cumulativeWeight = 0;
    
    for (const objType of OBJECT_TYPES) {
      cumulativeWeight += objType.weight;
      if (rand <= cumulativeWeight) {
        selectedType = objType;
        break;
      }
    }
    
    const id = Date.now() + engine.random();
    const x = engine.randomFloat(5, 95); // Wider spawn area for larger view
    const baseVelocityY = engine.randomFloat(0.5, 1.2); // Even slower for better control
    const velocityY = baseVelocityY + engine.randomFloat(0, 0.5);
    const velocityX = engine.randomFloat(-0.3, 0.3); // Very slow horizontal drift
    const size = engine.randomFloat(selectedType.size[0], selectedType.size[1]);
    
    return {
      id,
      x,
      y: -15, // Start higher for taller view
      velocityX,
      velocityY,
      size,
      type: selectedType.type,
      value: selectedType.value,
      bounces: 0
    };
  }, [engine]);

  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;

    // FRAME-INDEPENDENT MOVEMENT for smooth gameplay on all devices
    const now = Date.now();
    const delta = Math.min((now - lastFrameTimeRef.current) / 1000, 0.1); // Cap delta to prevent huge jumps
    lastFrameTimeRef.current = now;
    const frameMultiplier = delta * 60; // Normalize to 60 FPS

    setObjects(prevObjects => {
      let caughtThisFrame = 0;
      
      const updatedObjects = prevObjects.map(obj => {
        let newX = obj.x + obj.velocityX * 0.3 * frameMultiplier; // SMOOTH horizontal movement
        let newY = obj.y + obj.velocityY * 0.6 * frameMultiplier; // SMOOTH vertical movement
        let newVelocityX = obj.velocityX;
        let newVelocityY = obj.velocityY;
        let newBounces = obj.bounces;

        // Bounce off walls
        if (newX <= 0 || newX >= 95) {
          newVelocityX = -newVelocityX * 0.8; // Energy loss on bounce
          newX = Math.max(0, Math.min(95, newX));
          newBounces++;
        }

        // Check briefcase paddle collision - EXACT SUITCASE SIZE ONLY!
        // Use ref for instant collision detection (no render lag)
        const currentPaddleX = paddleXRef.current;
        const paddleHalfWidth = 6; // ±6% (12% total = tight catch area)
        const paddleLeft = currentPaddleX - paddleHalfWidth;
        const paddleRight = currentPaddleX + paddleHalfWidth;
        const paddleTop = 82; // Adjusted for taller view
        const paddleBottom = 95;

        if (newY >= paddleTop && 
            newY <= paddleBottom &&
            newX >= paddleLeft && 
            newX <= paddleRight &&
            obj.velocityY > 0) { // Only catch if falling
          
          // Calculate distance from center of suitcase
          const paddleCenter = currentPaddleX;
          const catchPosition = newX;
          const distanceFromCenter = Math.abs(catchPosition - paddleCenter);
          
          // SIMPLIFIED: Gold for perfect center, Blue for edges
          let locationMultiplier = 0;
          let zoneDescription = '';
          
          if (distanceFromCenter <= 0.5) {
            // PERFECT CENTER - GOLD GLOW (≤0.5% = super tight!)
            locationMultiplier = 1.0; // 100% bonus
            zoneDescription = 'perfect-center';
            setSuitcaseGlow('gold');
            // GOLD sound - perfect catch
            playPerfectCatchSound();
          } else {
            // EDGES OF SUITCASE - BLUE GLOW (0.5% to 6% from center)
            // Scale bonus based on distance (closer to center = better)
            const distanceRatio = distanceFromCenter / paddleHalfWidth; // 0 to 1
            locationMultiplier = Math.max(0.1, 0.5 - (distanceRatio * 0.4)); // 50% to 10% bonus
            zoneDescription = 'edge';
            setSuitcaseGlow('blue');
            // Edge catch sound
            playEdgeCatchSound();
          }
          
          // Clear glow after animation (prevent memory leaks)
          if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
          glowTimeoutRef.current = setTimeout(() => setSuitcaseGlow('none'), 300);
          
          const locationBonus = Math.floor(obj.value * locationMultiplier * 0.6); // Up to 60% bonus
          
          // Precision timing bonus for high variability
          const timingBonus = (Date.now() % 100) / 10; // 0-9.9 points
          
          // Random variability to prevent ties
          const randomBonus = engine.randomFloat(0.1, 4.9);
          
          // Calculate total score for this catch
          const totalPoints = obj.value + locationBonus + timingBonus + randomBonus;
          
          caughtThisFrame += totalPoints;
          
          return null; // Will be filtered out
        }

        // Gravity and air resistance (FRAME-INDEPENDENT for smooth gameplay)
        newVelocityY += 0.1 * frameMultiplier; // Smooth gravity acceleration
        newVelocityX *= Math.pow(0.998, frameMultiplier); // Frame-independent air resistance

        return {
          ...obj,
          x: newX,
          y: newY,
          velocityX: newVelocityX,
          velocityY: newVelocityY,
          bounces: newBounces
        };
      }).filter((obj): obj is FallingObject => {
        if (obj === null) return false; // Caught objects
        if (obj.y >= 100) {
          // Object fell off screen - play miss sound
          GameAudio.playObjectMiss();
          return false;
        }
        return true;
      });

      // Update score ref immediately (visual update batched with React)
      if (caughtThisFrame > 0) {
        currentScoreRef.current += caughtThisFrame;
        setScore(currentScoreRef.current);
        setCaughtObjects(prev => prev + caughtThisFrame);
      }

      return updatedObjects;
    });

    // Object spawning logic - use RNG config if available
    if (rngConfig) {
      // Competition mode: spawn objects based on RNG configuration
      const gameTime = 60 - timer.timeLeft; // Time elapsed in seconds
      const gameTimeMs = gameTime * 1000; // Convert to milliseconds
      
      // Check if any objects should spawn at this time
      const objectsToSpawn = rngConfig.sequence.filter(item => {
        const spawnTime = item.time;
        const timeDiff = Math.abs(gameTimeMs - spawnTime);
        return timeDiff <= 50; // Spawn within 50ms window (3 frames at 60fps)
      });
      
      objectsToSpawn.forEach(spawnConfig => {
        // Check if we already spawned this object (prevent duplicates)
        const alreadySpawned = objects.some(obj => 
          Math.abs(obj.x - spawnConfig.x) < 5 && 
          obj.type === spawnConfig.type
        );
        
        if (!alreadySpawned) {
          const newObject: FallingObject = {
            id: Date.now() + Math.random(),
            x: spawnConfig.x,
            y: -15,
            velocityX: engine.randomFloat(-0.2, 0.2), // Small random drift
            velocityY: spawnConfig.speed * 0.8, // Use configured speed
            size: spawnConfig.type === 'coin' ? 35 : spawnConfig.type === 'cash' ? 40 : 45,
            type: spawnConfig.type === 'coin' ? 'coin' : 
                  spawnConfig.type === 'cash' ? 'dollar' : 'bonus-coin',
            value: spawnConfig.value,
            bounces: 0
          };
          
          setObjects(prev => [...prev, newObject]);
          setTotalObjects(prev => prev + 1);
        }
      });
    } else {
      // Practice mode: use original random spawning (CAP MAX OBJECTS for performance)
      const MAX_OBJECTS = 12; // Cap max objects on screen at once
      const timeElapsed = 60 - timer.timeLeft;
      const spawnMultiplier = 1 + (timeElapsed * 0.06); // Increases 6% every second
      const spawnRate = Math.min(0.1, 0.025 * spawnMultiplier); // Max 10% spawn rate, starts at 2.5%
      if (objects.length < MAX_OBJECTS && engine.random() < spawnRate) {
        setObjects(prev => [...prev, createRandomObject()]);
        setTotalObjects(prev => prev + 1);
      }
    }

    animationRef.current = requestAnimationFrame(updateGame);
  }, [gameState, timer.timeLeft, createRandomObject, engine, rngConfig, objects]);

  const handleKeyPress = useCallback((key: string, pressed: boolean) => {
    setKeysPressed(prev => {
      const newSet = new Set(prev);
      if (pressed) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });
  }, []);

  // Handle mouse/touch movement - INSTANT, SMOOTH, EXACT - NO LAG!
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    // Keep paddle within bounds (wider boundaries for 5X width)
    const boundedX = Math.max(2, Math.min(98, percentage));
    
    // INSTANT UPDATE - update both state and ref
    paddleXRef.current = boundedX;
    setPaddleX(boundedX);
  }, [gameState]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent scrolling
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    // Keep paddle within bounds (wider boundaries for 5X width)
    const boundedX = Math.max(2, Math.min(98, percentage));
    
    // INSTANT UPDATE - update both state and ref
    paddleXRef.current = boundedX;
    setPaddleX(boundedX);
  }, [gameState]);

  // Handle paddle movement (keyboard) - SUPER FAST for 5X width
  useEffect(() => {
    let moveSpeed = 0;
    if (keysPressed.has('ArrowLeft') || keysPressed.has('a')) {
      moveSpeed -= 3.5; // Super fast movement for huge paddle
    }
    if (keysPressed.has('ArrowRight') || keysPressed.has('d')) {
      moveSpeed += 3.5;
    }

    if (moveSpeed !== 0) {
      const interval = setInterval(() => {
        setPaddleX(prev => {
          const newVal = Math.max(2, Math.min(98, prev + moveSpeed));
          paddleXRef.current = newVal; // Update ref too
          return newVal;
        });
      }, 16); // ~60fps

      return () => clearInterval(interval);
    }
  }, [keysPressed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) {
        event.preventDefault();
        handleKeyPress(event.key, true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(event.key)) {
        event.preventDefault();
        handleKeyPress(event.key, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(updateGame);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, updateGame]);

  const handleStartGame = () => {
    // Unlock audio on user interaction (clicking start)
    unlockAudio();
    
    // Reset game state
    setScore(0);
    currentScoreRef.current = 0; // Reset score ref
    setObjects([]);
    setPaddleX(50);
    setTotalObjects(0);
    setCaughtObjects(0);
    
    // Start countdown
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    // Unlock audio again when countdown completes (user interaction)
    unlockAudio();
    
    // Request pointer lock for fullscreen mouse control
    if (gameAreaRef.current) {
      gameAreaRef.current.requestPointerLock = gameAreaRef.current.requestPointerLock ||
                                                (gameAreaRef.current as any).mozRequestPointerLock ||
                                                (gameAreaRef.current as any).webkitRequestPointerLock;
      if (gameAreaRef.current.requestPointerLock) {
        gameAreaRef.current.requestPointerLock();
      }
    }
    
    // Generate initial objects BEFORE starting timer
    const initialObjects: FallingObject[] = [];
    for (let i = 0; i < 3; i++) { // Start with 3 objects
      const obj = createRandomObject();
      if (obj) {
        // Spread them out vertically so they don't all fall at once
        obj.y = -15 - (i * 25); // Adjusted for taller view
        initialObjects.push(obj);
      }
    }
    setObjects(initialObjects);
    setTotalObjects(initialObjects.length);
    
    // Now start the game and timer
    setGameState('playing');
    startGame(); // Start the engine timer
  };

  const handleCountdownCancel = () => {
    setGameState('ready');
  };

  const getObjectStyle = (obj: FallingObject) => {
    const objType = OBJECT_TYPES.find(t => t.type === obj.type);
    
    return {
      position: 'absolute' as const,
      left: `${obj.x}%`,
      top: `${obj.y}%`,
      width: `${obj.size}px`,
      height: `${obj.size}px`,
      transform: 'translate(-50%, -50%)',
      transition: 'none',
      fontSize: `${obj.size * 0.8}px`, // Scale emoji with size
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)', // Add shadow for visibility
      filter: 'brightness(1.2) contrast(1.1) drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))', // Enhanced glow
      animation: 'bounce 0.5s ease-in-out infinite alternate', // Subtle bounce animation
      zIndex: 10
    };
  };

  if (gameState === 'ended') {
    return null; // Parent handles the results
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black bg-opacity-95 flex flex-col z-50 overflow-hidden">
      {/* Header - Always Visible */}
      <div className="flex justify-between items-center px-6 py-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="text-2xl font-bold text-white">
          💰 Falling Object Catch
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-lg text-white font-semibold">⏱️ {timer.timeLeft}s</div>
          <div className="text-lg text-yellow-400 font-bold">💰 {score.toFixed(1)}</div>
          <div className="text-lg text-green-400">✅ {caughtObjects}/{totalObjects}</div>
          {onExit && (
            <button 
              onClick={onExit}
              className="text-white hover:text-red-400 text-2xl font-bold bg-white/10 hover:bg-red-500/20 rounded-full w-10 h-10 flex items-center justify-center transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-4 py-6">

        {gameState === 'countdown' && (
          <GameCountdown
            onCountdownComplete={handleCountdownComplete}
            onCancel={handleCountdownCancel}
            showTitle="💰 Falling Object Catch"
          />
        )}

        {gameState === 'ready' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-4xl font-bold text-white text-center mb-6">
              💰 Falling Object Catch
            </div>
            
            {/* Epilepsy Warning */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-600 rounded-xl p-6 shadow-2xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-white text-lg font-black">⚠️</span>
                </div>
                <p className="text-white font-black text-xl tracking-wide">EPILEPSY WARNING</p>
              </div>
              <p className="text-base text-white font-semibold leading-relaxed">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>
            
            {/* Instructions - Dark Money Green Theme */}
            <div className="bg-gradient-to-r from-green-800 to-green-900 border-2 border-green-600 rounded-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-black">💰</span>
                </div>
                <p className="text-white font-black text-xl">How to Play:</p>
              </div>
              
              <div className="space-y-3 text-white text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Catch:</span> Use your cash case to catch falling money!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Move:</span> Use <strong>Arrow Keys</strong> or <strong>A/D</strong> to move your cash case</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Physics:</span> Objects bounce and drift unpredictably - be ready!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Scoring:</span> 🎯 Each caught object = 1 point</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-600/30 to-green-500/30 border border-green-400/50 rounded-lg p-3 mt-4">
                <p className="text-sm text-green-200">
                  <span className="text-green-300 font-bold">💡 Pro Tip:</span> Keep your cash case moving and watch for bouncing patterns!
                </p>
              </div>
            </div>
            <button
              onClick={handleStartGame}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
            >
              🚀 Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="fixed inset-0 w-screen h-screen">
            {/* HUD Overlay - Top of screen */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl text-white text-sm">
              <div className="flex gap-8 items-center">
                <div className="flex gap-4">
                  <span>🪙 10pts</span>
                  <span>💵 25pts</span>
                  <span>🏆 50pts</span>
                </div>
                <div className="w-px h-6 bg-white/30"></div>
                <div className="flex gap-4">
                  <span>🟡 <span className="text-yellow-400 font-bold">CENTER +60%</span></span>
                  <span>🔵 <span className="text-blue-400">OFF-CENTER +10-50%</span></span>
                </div>
              </div>
            </div>
            
            {/* FULLSCREEN Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative w-full h-full overflow-hidden cursor-none"
              style={{ 
                touchAction: 'none',
                background: `
                  radial-gradient(circle at 30% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, rgba(255, 255, 0, 0.05) 0%, transparent 50%),
                  linear-gradient(180deg, #87CEEB 0%, #98FB98 25%, #90EE90 50%, #32CD32 75%, #228B22 100%)
                `,
                animation: 'backgroundShift 10s ease-in-out infinite'
              }}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onTouchStart={handleTouchMove}
            >
              {/* Falling Objects - Coins and Dollars */}
              {objects.map((obj) => {
                const objType = OBJECT_TYPES.find(t => t.type === obj.type);
                return (
                  <div
                    key={obj.id}
                    style={getObjectStyle(obj)}
                  >
                    {objType?.emoji || '🪙'}
                  </div>
                );
              })}
              
              {/* Cash Case Paddle - LARGER - INSTANT MOVEMENT - GLOWING (Gold center, Blue off-center) */}
              <div
                className={`absolute flex items-center justify-center ${
                  suitcaseGlow === 'gold' ? 'scale-110' : ''
                }`}
                style={{
                  left: `${paddleX}%`,
                  top: '85%',
                  width: '1100px', // Slightly bigger container
                  height: '90px',
                  transform: 'translateX(-50%)',
                  transition: 'transform 0.15s, filter 0.15s', // ONLY animate glow, NOT position!
                  filter: suitcaseGlow === 'gold' 
                    ? 'drop-shadow(0 0 40px rgba(255,215,0,1)) drop-shadow(0 0 20px rgba(255,215,0,1))' 
                    : suitcaseGlow === 'blue'
                    ? 'drop-shadow(0 0 20px rgba(59,130,246,1)) drop-shadow(0 0 10px rgba(59,130,246,1))'
                    : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  zIndex: 20
                }}
              >
                <img 
                  src="/CashCase.PNG" 
                  alt="Cash Case" 
                  style={{
                    width: '480px', // Slightly bigger suitcase (400px → 480px)
                    height: '90px',
                    objectFit: 'contain',
                    filter: suitcaseGlow === 'gold'
                      ? 'brightness(1.6) saturate(1.6) drop-shadow(2px 2px 10px rgba(255,215,0,0.9))'
                      : suitcaseGlow === 'blue'
                      ? 'brightness(1.2) saturate(1.2) drop-shadow(2px 2px 4px rgba(59,130,246,0.6))'
                      : 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))'
                  }}
                />
              </div>
              
              {/* CATCH RADIUS LINE - OPTIMIZED FOR PERFORMANCE */}
              <div
                className="absolute"
                style={{
                  left: `${paddleX}%`,
                  top: '81%',
                  width: '12%',
                  height: '12px',
                  transform: 'translateX(-50%)',
                  zIndex: 30,
                  pointerEvents: 'none',
                  background: 'linear-gradient(to right, #3B82F6 0%, #3B82F6 40%, #FFD700 50%, #3B82F6 60%, #3B82F6 100%)',
                  borderRadius: '6px',
                  border: '2px solid white',
                  willChange: 'left'
                }}
              />
            </div>
            
            {/* Score & Timer Overlay - Top Right */}
            <div className="absolute top-20 right-4 z-50 bg-black/70 backdrop-blur-sm px-6 py-4 rounded-xl text-white">
              <div className="text-3xl font-bold text-yellow-400 mb-2">💰 {score.toFixed(0)}</div>
              <div className="text-lg">⏱️ {timer.timeLeft}s</div>
              <div className="text-sm text-gray-300 mt-2">
                Caught: {caughtObjects}/{totalObjects}
              </div>
            </div>
            
            {/* Instructions Overlay - Bottom */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm">
              ⌨️ Arrow Keys or A/D to move • 🟡 GOLD = Perfect Center • 🔵 BLUE = Off-Center
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-white/60 space-y-2 text-center">
          <div>💰 Catch coins and dollars with your briefcase</div>
          <div>📍 Center catches earn bonus points</div>
          <div>💵 Dollars worth more than coins</div>
          <div>⌨️ Arrow Keys or A/D to move briefcase</div>
        </div>
      </div>
    </div>
  );
}