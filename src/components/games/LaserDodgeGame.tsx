'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FairRNGService, LaserDodgeRNGConfig } from '@/lib/fairRNGService';
import { playLaserWarning, playExtremeModeActivation, playCrazyModeActivation, playCollision, playGameEnd, playShootSound, playExplosionSound, playEnemyHitSound } from '@/lib/gameAudio';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
console.log('');
console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
console.log('🚀 LASER DODGE v8.0 - BUILD 20251127-1900');
console.log('🚀 If you see this, NEW CODE IS RUNNING!');
console.log('🔒 Audit logs WILL be sent to admin dashboard');
console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
console.log('');

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface LaserDodgeGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  rngSeed?: number; // RNG seed (1-20) for deterministic spawns
}

interface Laser {
  id: number;
  type: 'horizontal' | 'vertical';
  position: number;
  isHarmful: boolean;
  timeToHarmful: number;
  createdAt: number;
  bonusCollected: boolean; // Track if player collected the 50pt bonus from this laser
}

interface Ship {
  x: number;
  y: number;
}

interface EnemyShip {
  id: number;
  x: number;
  y: number;
  direction: 'left' | 'right';
  speed: number;
  createdAt: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  type: 'enemy' | 'ship';
}

export default function LaserDodgeGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, rngSeed }: LaserDodgeGameProps) {
  // DON'T use pre-generated configs - causes gameplay issues (stacking, repetition)
  // Instead, use rngSeed to initialize engine for runtime generation
  const rngConfig = null; // Disabled - using runtime RNG instead
  
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'countdown' | 'playing' | 'ended'>('ready');
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [ship, setShip] = useState<Ship>({ x: 50, y: 50 });
  const [enemyShips, setEnemyShips] = useState<EnemyShip[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(5);
  const [hearts, setHearts] = useState(3); // Player has 3 hearts
  const [hasControl, setHasControl] = useState(false); // Track if player clicked on ship
  
  // CoD-style floating score indicators
  const { popups, addPopup, removePopup } = useFloatingScores();
  const addPopupRef = useRef(addPopup);
  addPopupRef.current = addPopup;
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastLaserSpawnRef = useRef<number>(0);
  const lastEnemySpawnRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const currentScoreRef = useRef(0);
  const instantBonusRef = useRef(0); // Track accumulated instant bonuses from blue lasers
  const enemyDestroyedPointsRef = useRef(0); // Track accumulated points from destroyed enemy ships
  const isGameRunningRef = useRef(false);
  const gameStateRef = useRef<'ready' | 'waiting' | 'countdown' | 'playing' | 'ended'>('ready');
  const extremeModeTriggeredRef = useRef(false); // Track if extreme mode audio played
  const crazyModeTriggeredRef = useRef(false); // Track if crazy mode audio played
  const lastShotRef = useRef<number>(0);
  const heartsRef = useRef(3); // Track hearts for collision detection
  const lastCollisionTimeRef = useRef<number>(0); // Track last collision time for invincibility
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null); // Background music during gameplay
  const audioContextRef = useRef<AudioContext | null>(null); // For victory sound
  const audioUnlockedRef = useRef(false); // Track if audio is unlocked
  
  // Mobile/Gyroscope state
  const [isMobile, setIsMobile] = useState(false);
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false);
  const [gyroPermissionNeeded, setGyroPermissionNeeded] = useState(false);
  const [showGyroNotification, setShowGyroNotification] = useState(false);
  const [gyroConfirmStep, setGyroConfirmStep] = useState(0); // 0 = not clicked, 1 = first tap, 2 = confirmed
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null);
  const lastGyroUpdateRef = useRef<number>(0);
  const gyroListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  
  // Refs for game entities (needed for collision detection in game loop)
  const bulletsRef = useRef<Bullet[]>([]);
  const enemyShipsRef = useRef<EnemyShip[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const shipRef = useRef<Ship>({ x: 50, y: 50 }); // Ref for real-time ship position
  
  // Seeded RNG for deterministic gameplay
  const seededRng = useMemo(() => {
    if (!rngSeed) return null;
    
    class Mulberry32 {
      private seed: number;
      constructor(seed: number) { this.seed = seed >>> 0; }
      next(): number {
        let t = (this.seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
      nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
      }
      nextFloat(min: number, max: number): number {
        return this.next() * (max - min) + min;
      }
    }
    
    return new Mulberry32(rngSeed);
  }, [rngSeed]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobile);
      console.log('📱 [LaserDodge] Mobile detected:', mobile);
      
      // All mobile devices should have explicit gyro enable button for better UX
      // iOS requires permission, but we show button on all devices for consistency
      if (mobile) {
        setGyroPermissionNeeded(true);
        console.log('📱 [LaserDodge] Mobile gyro - showing enable button');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Keep gameStateRef in sync with gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  // Gyroscope handler function - works during waiting, countdown, and playing states
  const handleOrientation = (event: DeviceOrientationEvent) => {
    // Allow gyroscope during waiting/countdown for testing, and during gameplay
    const gameStateNow = gameStateRef.current;
    if (gameStateNow !== 'waiting' && gameStateNow !== 'countdown' && gameStateNow !== 'playing') return;
    
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;
    
    // Set initial position on first reading
    if (!gyroBaseRef.current) {
      gyroBaseRef.current = { beta, gamma };
      console.log('📱 [LaserDodge] Gyro base set:', gyroBaseRef.current);
      return;
    }
    
    // Calculate delta from neutral position
    const deltaBeta = beta - gyroBaseRef.current.beta;
    const deltaGamma = gamma - gyroBaseRef.current.gamma;
    
    // Moderate sensitivity for responsive but smooth movement
    const sensitivity = 0.8;
    
    // Calculate new position
    // Tilt right (positive gamma) = move right
    // Tilt forward (positive beta) = move DOWN (forward on screen)
    let newX = 50 + (deltaGamma * sensitivity);
    let newY = 50 + (deltaBeta * sensitivity);
    
    // Clamp to game bounds
    newX = Math.max(5, Math.min(95, newX));
    newY = Math.max(5, Math.min(95, newY));
    
    const newShipPos = { x: newX, y: newY };
    shipRef.current = newShipPos;
    setShip(newShipPos);
  };
  
  // Enable gyroscope - works for all mobile devices (iOS, Android, etc.)
  const requestGyroPermission = async () => {
    console.log('📱 [LaserDodge] Enabling gyroscope for all devices...');
    
    // Reset gyro base for fresh calibration when user explicitly enables
    gyroBaseRef.current = null;
    
    // iOS 13+ requires permission request
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        console.log('📱 [LaserDodge] iOS gyro permission result:', permission);
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
          gyroListenerRef.current = handleOrientation;
          setGyroscopeEnabled(true);
          setShowGyroNotification(true);
          setTimeout(() => setShowGyroNotification(false), 3000);
          console.log('✅ [LaserDodge] iOS gyroscope enabled!');
        }
      } catch (error) {
        console.warn('⚠️ [LaserDodge] iOS gyro permission error:', error);
        // Try enabling anyway - some browsers don't need permission
        window.addEventListener('deviceorientation', handleOrientation);
        gyroListenerRef.current = handleOrientation;
        setGyroscopeEnabled(true);
        setShowGyroNotification(true);
        setTimeout(() => setShowGyroNotification(false), 3000);
      }
    } else {
      // Android, Chrome, Firefox, Samsung, etc. - no permission needed
      console.log('📱 [LaserDodge] Non-iOS device - enabling gyro directly');
      window.addEventListener('deviceorientation', handleOrientation);
      gyroListenerRef.current = handleOrientation;
      setGyroscopeEnabled(true);
      setShowGyroNotification(true);
      setTimeout(() => setShowGyroNotification(false), 3000);
      console.log('✅ [LaserDodge] Gyroscope enabled!');
    }
  };
  
  // Cleanup gyroscope listener when component unmounts
  useEffect(() => {
    return () => {
      if (gyroListenerRef.current) {
        window.removeEventListener('deviceorientation', gyroListenerRef.current);
        console.log('📱 [LaserDodge] Gyroscope listener cleaned up');
      }
    };
  }, []);
  
  // Reset gyro base when game starts
  useEffect(() => {
    if (gameState === 'playing') {
      gyroBaseRef.current = null;
    }
  }, [gameState]);
  
  // Cleanup gyro listener
  useEffect(() => {
    return () => {
      if (gyroListenerRef.current) {
        window.removeEventListener('deviceorientation', gyroListenerRef.current);
      }
    };
  }, []);
  
  // Audio unlock mechanism for browser autoplay restrictions
  const unlockAudio = () => {
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
          console.log('✅ [LaserDodgeGame] Audio unlocked');
        }).catch(() => {
          // Ignore - will try again on game start
        });
      }
    } catch (e) {
      // Ignore errors
    }
  };

  // Setup background music for gameplay
  useEffect(() => {
    // Create audio element for laser-dodge.mp3
    const audio = new Audio('/laser-dodge.mp3');
    audio.loop = true;
    audio.volume = 0.7; // Set volume to 70% for better audibility
    audio.preload = 'auto'; // Preload the audio
    
    // Add error handling and logging
    audio.addEventListener('error', (e) => {
      console.warn('⚠️ [LaserDodgeGame] Audio file error (non-critical):', e);
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('✅ [LaserDodgeGame] Background music loaded successfully');
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ [LaserDodgeGame] Background music ready to play');
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
              console.log('✅ [LaserDodgeGame] Background music started playing on game start');
              audioUnlockedRef.current = true;
            })
            .catch((err) => {
              console.warn('⚠️ [LaserDodgeGame] Audio play failed, will retry:', err);
              // Try again after a short delay
              setTimeout(() => {
                if (backgroundMusicRef.current && gameState === 'playing') {
                  backgroundMusicRef.current.play()
                    .then(() => {
                      audioUnlockedRef.current = true;
                      console.log('✅ [LaserDodgeGame] Background music started on retry');
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
        console.warn('⚠️ [LaserDodgeGame] Audio play failed (non-critical)');
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
  }, [gameState]);
  
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
        
        console.log('🎉 [LaserDodgeGame] Victory sound played');
      } catch (err) {
        // Victory sound failed - game continues normally
        console.warn('⚠️ [LaserDodgeGame] Victory sound failed (non-critical)');
      }
    }
  }, [gameState]);

  // Simple countdown without GameCountdown component
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        countdownRef.current = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        // Start game
        handleCountdownComplete();
      }
    }
    
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [gameState, countdown]);

  // Shooting function
  const shoot = () => {
    const now = Date.now();
    if (now - lastShotRef.current < 200) {
      console.log('LaserDodge: Shot rate limited');
      return; // Rate limit shooting (5 shots per second)
    }
    
    lastShotRef.current = now;
    
    const currentShip = shipRef.current; // Use ref for accurate position
    console.log('LaserDodge: SHOOTING bullet at', currentShip.x, currentShip.y);
    
    // Play shooting sound - ensure it plays
    try {
      playShootSound();
      console.log('LaserDodge: 🔫 Shooting sound played');
    } catch (e) {
      console.error('LaserDodge: Shoot sound error (non-critical):', e);
      // Fallback: create a simple shooting sound using Web Audio API
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime); // Increased from 0.2 to 0.5 for louder sound
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
      } catch (fallbackError) {
        console.error('LaserDodge: Fallback shoot sound also failed:', fallbackError);
      }
    }
    
    const newBullet: Bullet = {
      id: now + Math.random(),
      x: currentShip.x,
      y: currentShip.y - 2, // Start slightly above the ship
      createdAt: now
    };
    
    console.log('LaserDodge: Created bullet:', newBullet.id);
    
    setBullets(prev => {
      const updated = [...prev, newBullet];
      bulletsRef.current = updated;
      console.log(`LaserDodge: Total bullets now: ${updated.length}`);
      return updated;
    });
  };

  // Game loop - simplified without useCallback
  const gameLoop = () => {
    if (!isGameRunningRef.current) {
      console.log('LaserDodge: Game loop stopped - isGameRunningRef is false');
      return;
    }

    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;
    
    console.log(`LaserDodge: Game loop running - time: ${timeSinceStart}ms`);

    // Update score with bonus for staying on blue lasers - decimal scoring
    const baseScore = Number((timeSinceStart / 50).toFixed(2));
    
    // Calculate blue laser bonus with decimal precision (using shipRef for real-time position)
    // MASSIVELY INCREASED BONUS - 1.0 points per frame per laser!
    // PLUS: 200 point immediate bonus when first touching a blue laser!
    let blueBonus = 0;
    const blueLasers = lasersRef.current.filter(l => !l.isHarmful);
    const currentShip = shipRef.current; // Use ref for accurate position
    for (const laser of blueLasers) {
      let isOnLaser = false;
      
      if (laser.type === 'horizontal') {
        // Ship is on blue horizontal laser
        if (Math.abs(laser.position - currentShip.y) < 2) {
          isOnLaser = true;
          blueBonus += 1.0; // 1.0 points per frame on blue laser (100x increase!)
        }
      } else {
        // Ship is on blue vertical laser
        if (Math.abs(laser.position - currentShip.x) < 2) {
          isOnLaser = true;
          blueBonus += 1.0; // 1.0 points per frame on blue laser (100x increase!)
        }
      }
      
      // Give 200 point immediate bonus on first touch of this laser
      // Add to instantBonusRef so it persists across frames!
      if (isOnLaser && !laser.bonusCollected) {
        instantBonusRef.current += 200; // Add 200 points IMMEDIATELY and PERMANENTLY
        laser.bonusCollected = true; // Mark as collected on the object
        
        // Also update the ref array so the flag persists
        lasersRef.current = lasersRef.current.map(l => 
          l.id === laser.id ? { ...l, bonusCollected: true } : l
        );
        
        console.log('LaserDodge: 💎 Blue laser bonus collected! +200 points! Total instant bonuses:', instantBonusRef.current);
        
        // CoD-style floating score popup
        addPopupRef.current(200, currentShip.x, currentShip.y, 'bonus', 'LASER BONUS');
      }
    }
    
    // Add shooting bonus (enemies destroyed) - use ref for immediate persistent points
    const shootingBonus = enemyDestroyedPointsRef.current;
    
    // Calculate total score: base + instant bonuses + frame bonuses + enemy points
    const newScore = Number((baseScore + instantBonusRef.current + blueBonus + shootingBonus).toFixed(2));
    currentScoreRef.current = newScore;
    setScore(newScore);

    // Spawn lasers - use seeded RNG if available (competition mode) or Math.random() (practice mode)
    if (seededRng) {
      // COMPETITION MODE: Use seeded RNG for deterministic but varied gameplay
      // Progressive difficulty similar to practice mode
      const level = Math.floor(timeSinceStart / 5000) + 1;
      const isExtremeMode = timeSinceStart > 30000;
      const isCrazyMode = timeSinceStart > 52000;
      
      // Play mode transition audio
      if (isCrazyMode && !crazyModeTriggeredRef.current) {
        crazyModeTriggeredRef.current = true;
        playCrazyModeActivation();
      } else if (isExtremeMode && !extremeModeTriggeredRef.current) {
        extremeModeTriggeredRef.current = true;
        playExtremeModeActivation();
      }
      
      let spawnRate;
      let laserCount = 1;
      
      if (isCrazyMode) {
        spawnRate = seededRng.nextInt(25, 75);
        laserCount = seededRng.nextInt(2, 4);
      } else if (isExtremeMode) {
        spawnRate = seededRng.nextInt(100, 200);
        laserCount = seededRng.nextInt(1, 3);
      } else {
        spawnRate = seededRng.nextInt(400, 800);
      }
      
      if (now - lastLaserSpawnRef.current > spawnRate) {
        console.log(`LaserDodge: Spawning ${laserCount} lasers (competition mode)`);
        lastLaserSpawnRef.current = now;
        
        for (let i = 0; i < laserCount; i++) {
          const newLaser: Laser = {
            id: now + seededRng.next(),
            type: seededRng.next() > 0.5 ? 'horizontal' : 'vertical',
            position: seededRng.nextFloat(10, 90),
            isHarmful: false,
            timeToHarmful: seededRng.nextInt(800, 1500),
            createdAt: now,
            bonusCollected: false
          };
          
          console.log(`LaserDodge: Created laser #${i}:`, newLaser.type, 'at', newLaser.position);
          
          setLasers(prev => {
            const updated = [...prev, newLaser];
            lasersRef.current = updated;
            console.log(`LaserDodge: Total lasers now: ${updated.length}`);
            return updated;
          });
        }
        
        try {
          playLaserWarn();
        } catch (e) {
          console.error('LaserDodge: Audio error (non-critical):', e);
        }
      } else {
        // Debug: Show time until next spawn
        const timeUntilSpawn = spawnRate - (now - lastLaserSpawnRef.current);
        if (timeSinceStart < 5000 && timeSinceStart % 1000 < 20) { // Log every second for first 5 seconds
          console.log(`LaserDodge: Next laser in ${timeUntilSpawn}ms (spawnRate: ${spawnRate}ms)`);
        }
      }
    } else {
      // PRACTICE MODE: Original progressive difficulty system
      const level = Math.floor(timeSinceStart / 5000) + 1;
      const isExtremeMode = timeSinceStart > 30000; // Extreme mode after 30 seconds
      const isCrazyMode = timeSinceStart > 52000; // CRAZY mode after 52 seconds
      
      // Play mode transition audio
      if (isCrazyMode && !crazyModeTriggeredRef.current) {
        crazyModeTriggeredRef.current = true;
        playCrazyModeActivation();
      } else if (isExtremeMode && !extremeModeTriggeredRef.current) {
        extremeModeTriggeredRef.current = true;
        playExtremeModeActivation();
      }
      
      let spawnRate;
      let laserCount = 1;
      
      if (isCrazyMode) {
        // CRAZY MODE: Absolute laser apocalypse (25-75ms)
        spawnRate = Math.max(25, 75 - (level * 5));
        laserCount = Math.random() < 0.7 ? 3 : 2; // 70% chance for 3 lasers, 30% for 2
      } else if (isExtremeMode) {
        // EXTREME MODE: Gradual buildup from 30s to 52s
        const extremeProgress = (timeSinceStart - 30000) / 22000; // 0 to 1 over 22 seconds
        const baseRate = 800 - (extremeProgress * 600); // 800ms down to 200ms
        spawnRate = Math.max(200, baseRate - (level * 20));
        
        // Gradually increase laser count as we approach 52 seconds
        if (extremeProgress > 0.8) {
          laserCount = Math.random() < 0.4 ? 2 : 1; // 40% chance for 2 lasers
        } else if (extremeProgress > 0.5) {
          laserCount = Math.random() < 0.2 ? 2 : 1; // 20% chance for 2 lasers
        }
      } else {
        // Normal mode: 200-800ms
        spawnRate = Math.max(200, 800 - (level * 50));
      }
      
      if (now - lastLaserSpawnRef.current > spawnRate) {
        console.log(`LaserDodge: Spawning ${laserCount} lasers (practice mode, spawnRate: ${spawnRate}ms)`);
        const isHorizontal = Math.random() < 0.5;
        
        for (let i = 0; i < laserCount; i++) {
          const newLaser: Laser = {
            id: now + Math.random() + i,
            type: isHorizontal ? 'horizontal' : 'vertical',
            position: Math.random() * 100,
            isHarmful: false,
            timeToHarmful: isCrazyMode 
              ? Math.max(600, 1200 - (level * 50)) // Very fast transition in crazy mode
              : isExtremeMode 
              ? Math.max(2400, 4000 - (level * 100)) // MUCH SLOWER transition in extreme mode (2.4-4s)
              : Math.max(800, 1500 - (level * 100)), // Normal mode timing
            createdAt: now,
            bonusCollected: false
          };
          
          console.log(`LaserDodge: Created laser #${i}:`, newLaser.type, 'at position', newLaser.position);
          setLasers(prev => {
            const updated = [...prev, newLaser];
            lasersRef.current = updated;
            console.log(`LaserDodge: Total lasers now: ${updated.length}`);
            return updated;
          });
        }
        
        lastLaserSpawnRef.current = now;
      } else {
        // Debug: Show time until next spawn
        const timeUntilSpawn = spawnRate - (now - lastLaserSpawnRef.current);
        if (timeSinceStart < 5000 && timeSinceStart % 1000 < 20) { // Log every second for first 5 seconds
          console.log(`LaserDodge: Next laser in ${timeUntilSpawn}ms (spawnRate: ${spawnRate}ms)`);
        }
      }
    }

    // Spawn enemy ships - use seeded RNG if available (competition mode)
    if (seededRng) {
      // COMPETITION MODE: Use seeded RNG for deterministic enemy spawning
      const level = Math.floor(timeSinceStart / 5000) + 1;
      const isExtremeMode = timeSinceStart > 30000;
      const isCrazyMode = timeSinceStart > 52000;
      
      let enemySpawnRate;
      if (isCrazyMode) {
        enemySpawnRate = seededRng.nextInt(300, 800); // Even more frequent: was 500-1200, now 300-800
      } else if (isExtremeMode) {
        enemySpawnRate = seededRng.nextInt(500, 1200); // Even more frequent: was 800-2000, now 500-1200
      } else {
        enemySpawnRate = seededRng.nextInt(800, 1800); // Even more frequent: was 1200-2500, now 800-1800
      }
      
      if (now - lastEnemySpawnRef.current > enemySpawnRate) {
        lastEnemySpawnRef.current = now;
        
        const spawnSide = seededRng.next();
        let x, y, direction;
        
        if (spawnSide < 0.25) {
          // Top
          x = seededRng.nextFloat(5, 95);
          y = 0;
          direction = seededRng.next() > 0.5 ? 'down' : (seededRng.next() > 0.5 ? 'left' : 'right');
        } else if (spawnSide < 0.5) {
          // Right
          x = 100;
          y = seededRng.nextFloat(5, 95);
          direction = seededRng.next() > 0.5 ? 'left' : (seededRng.next() > 0.5 ? 'up' : 'down');
        } else if (spawnSide < 0.75) {
          // Bottom (but not at the very bottom - keep it visible)
          x = seededRng.nextFloat(5, 95);
          y = seededRng.nextFloat(75, 90); // Spawn between 75-90% instead of exactly 100%
          direction = seededRng.next() > 0.5 ? 'up' : (seededRng.next() > 0.5 ? 'left' : 'right');
        } else {
          // Left
          x = 0;
          y = seededRng.nextFloat(5, 95);
          direction = seededRng.next() > 0.5 ? 'right' : (seededRng.next() > 0.5 ? 'up' : 'down');
        }
        
        const speedMultiplier = isCrazyMode ? 1.8 : isExtremeMode ? 1.4 : 1.0;
        
        const newEnemy: EnemyShip = {
          id: now + seededRng.next(),
          x,
          y,
          direction: direction as any,
          speed: seededRng.nextFloat(0.08, 0.15) * speedMultiplier,
          createdAt: now,
          type: 'enemy'
        };
        
        setEnemyShips(prev => {
          const updated = [...prev, newEnemy];
          enemyShipsRef.current = updated;
          return updated;
        });
      }
    } else {
      // PRACTICE MODE: Progressive enemy spawning
      const level = Math.floor(timeSinceStart / 5000) + 1;
      const isExtremeMode = timeSinceStart > 30000;
      const isCrazyMode = timeSinceStart > 52000;
      
      let enemySpawnRate;
      if (isCrazyMode) {
        enemySpawnRate = Math.max(300, 800 - (level * 80)); // Even more frequent: was 500-1200, now 300-800
      } else if (isExtremeMode) {
        enemySpawnRate = Math.max(500, 1200 - (level * 100)); // Even more frequent: was 800-2000, now 500-1200
      } else {
        enemySpawnRate = Math.max(800, 2000 - (level * 150)); // Even more frequent: was 1200-3000, now 800-2000
      }
      
      if (now - lastEnemySpawnRef.current > enemySpawnRate) {
        const direction = Math.random() < 0.5 ? 'left' : 'right';
        const speed = isCrazyMode ? 0.3 : isExtremeMode ? 0.2 : 0.15; // pixels per frame
        
        const newEnemy: EnemyShip = {
          id: now + Math.random(),
          x: direction === 'left' ? 105 : -5, // Start off-screen
          y: 15 + Math.random() * 60, // Constrain Y to 15-75% to keep ships well within screen (not at very bottom)
          direction,
          speed,
          createdAt: now
        };
        
        console.log(`LaserDodge: Spawning ${isCrazyMode ? 'CRAZY' : isExtremeMode ? 'EXTREME' : 'normal'} enemy:`, newEnemy.direction);
        setEnemyShips(prev => {
          const updated = [...prev, newEnemy];
          enemyShipsRef.current = updated;
          return updated;
        });
        lastEnemySpawnRef.current = now;
      }
    }

    // Update existing lasers
    if (lasersRef.current.length > 0 && timeSinceStart % 1000 < 20) {
      console.log(`LaserDodge: Updating ${lasersRef.current.length} lasers`);
    }
    
    setLasers(prevLasers => {
      const currentTime = Date.now();
      const currentTimeSinceStart = currentTime - gameStartTimeRef.current;
      const currentIsExtremeMode = currentTimeSinceStart > 30000;
      
      let transitionCount = 0;
      
      const updated = prevLasers.map(laser => {
        const updatedLaser = { ...laser };
        
        if (!updatedLaser.isHarmful) {
          const age = currentTime - laser.createdAt;
          if (age > laser.timeToHarmful) {
            updatedLaser.isHarmful = true;
            transitionCount++;
            // Play laser warning sound
            try {
              playLaserWarning();
            } catch (e) {
              console.error('LaserDodge: Laser warning sound error (non-critical):', e);
            }
          }
        }
        
        return updatedLaser;
      }).filter(laser => {
        const age = currentTime - laser.createdAt;
        const totalLifetime = currentIsExtremeMode 
          ? laser.timeToHarmful + 1500  // Red lasers disappear after 1.5s in extreme mode
          : laser.timeToHarmful + 3000; // Red lasers disappear after 3s in normal mode
        return age < totalLifetime;
      });
      
      if (transitionCount > 0) {
        console.log(`LaserDodge: ${transitionCount} lasers turned red!`);
      }
      
      if (updated.length !== prevLasers.length) {
        console.log(`LaserDodge: Lasers changed from ${prevLasers.length} to ${updated.length}`);
      }
      
      lasersRef.current = updated;
      return updated;
    });

    // Update enemy ships
    setEnemyShips(prevEnemies => {
      const updated = prevEnemies.map(enemy => {
        const updatedEnemy = { ...enemy };
        
        if (enemy.direction === 'left') {
          updatedEnemy.x -= enemy.speed;
        } else {
          updatedEnemy.x += enemy.speed;
        }
        
        return updatedEnemy;
      }).filter(enemy => {
        // Remove enemies that are off-screen
        return enemy.x > -10 && enemy.x < 110;
      });
      
      enemyShipsRef.current = updated;
      return updated;
    });

    // Update bullets
    if (bulletsRef.current.length > 0 && timeSinceStart % 1000 < 20) {
      console.log(`LaserDodge: Updating ${bulletsRef.current.length} bullets`);
    }
    
    setBullets(prevBullets => {
      const updated = prevBullets.map(bullet => {
        const updatedBullet = { ...bullet };
        updatedBullet.y -= 0.5; // Bullets move upward
        return updatedBullet;
      }).filter(bullet => {
        // Remove bullets that are off-screen
        return bullet.y > -5;
      });
      
      if (updated.length !== prevBullets.length) {
        console.log(`LaserDodge: Bullets changed from ${prevBullets.length} to ${updated.length}`);
      }
      
      bulletsRef.current = updated;
      return updated;
    });

    // Check bullet-enemy collisions - Use refs for current values
    const bulletsHitEnemies: Set<string> = new Set();
    const enemiesToRemove: Set<string> = new Set();
    const newExplosions: Explosion[] = [];
    // Detect all bullet-enemy collisions using current ref values
    bulletsRef.current.forEach(bullet => {
      enemyShipsRef.current.forEach(enemy => {
        if (Math.abs(bullet.x - enemy.x) < 4 && Math.abs(bullet.y - enemy.y) < 4) {
          bulletsHitEnemies.add(bullet.id.toString());
          enemiesToRemove.add(enemy.id.toString());
          
          // Create explosion for this enemy (only once)
          if (!newExplosions.some(e => e.x === enemy.x && e.y === enemy.y)) {
            newExplosions.push({
              id: Date.now() + Math.random(),
              x: enemy.x,
              y: enemy.y,
              createdAt: Date.now(),
              type: 'enemy'
            });
            
            // Play explosion sound - always create using Web Audio API for reliability
            try {
              playExplosionSound();
              playEnemyHitSound();
              console.log('LaserDodge: 💥 Explosion sound played for enemy ship');
            } catch (e) {
              console.error('LaserDodge: Explosion sound error, using Web Audio fallback:', e);
            }
            
            // Always create explosion sound using Web Audio API
            try {
              if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              const ctx = audioContextRef.current;
              // Create explosion sound with multiple frequencies
              const frequencies = [200, 150, 100];
              frequencies.forEach((freq, i) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.frequency.value = freq;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.6, ctx.currentTime + i * 0.05); // Increased from 0.3 to 0.6 for louder explosion
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.05 + 0.3);
                oscillator.start(ctx.currentTime + i * 0.05);
                oscillator.stop(ctx.currentTime + i * 0.05 + 0.3);
              });
              console.log('LaserDodge: 💥 Web Audio explosion sound created');
            } catch (fallbackError) {
              console.error('LaserDodge: Web Audio explosion sound failed:', fallbackError);
            }
            
            // Award points immediately - add to ref that persists across frames (like blue laser bonus)
            enemyDestroyedPointsRef.current += 100; // Add 100 points IMMEDIATELY and PERMANENTLY
            console.log('LaserDodge: 💥 Enemy destroyed! +100 points! Total enemy points:', enemyDestroyedPointsRef.current);
            
            // CoD-style floating score popup
            addPopupRef.current(100, enemy.x, enemy.y, 'critical', 'KILL');
            
            // Force immediate score update
            const currentBaseScore = Number((timeSinceStart / 50).toFixed(2));
            const immediateScore = Number((currentBaseScore + instantBonusRef.current + enemyDestroyedPointsRef.current).toFixed(2));
            currentScoreRef.current = immediateScore;
            setScore(immediateScore);
          }
        }
      });
    });
    
    // Apply all updates at once (React will batch these)
    if (bulletsHitEnemies.size > 0) {
      setBullets(prev => {
        const updated = prev.filter(b => !bulletsHitEnemies.has(b.id.toString()));
        bulletsRef.current = updated; // Update ref
        return updated;
      });
    }
    
    if (enemiesToRemove.size > 0) {
      setEnemyShips(prev => {
        const updated = prev.filter(e => !enemiesToRemove.has(e.id.toString()));
        enemyShipsRef.current = updated; // Update ref
        return updated;
      });
    }
    
    if (newExplosions.length > 0) {
      setExplosions(prev => [...prev, ...newExplosions]);
    }
    
    // Points are already awarded immediately when enemy is destroyed above
    // This section is kept for any other collision points that might be added

    // Update explosions - remove old ones
    setExplosions(prev => prev.filter(explosion => {
      const age = now - explosion.createdAt;
      return age < 1000; // Explosions last 1 second
    }));

    // Check collisions (using refs for current values - shipRef is critical for real-time detection)
    // ONLY RED LASERS (isHarmful === true) and ENEMY SHIPS cause death
    const harmfulLasers = lasersRef.current.filter(l => l.isHarmful);
    const currentShipPos = shipRef.current; // Use ref for accurate real-time position
    let collision = false;
    
      // Check RED laser collisions - CONSISTENT hitbox matching laser beam width
      // The laser visual is 16px (h-4) = ~4 units, ship is 32px (w-8 h-8) = ~8 units
      // Center of ship must be within 2.5 units of laser center line for collision
      for (const laser of harmfulLasers) {
        if (laser.type === 'horizontal') {
          // Ship dies when center is within 2.5 units of horizontal laser center line
          if (Math.abs(laser.position - currentShipPos.y) < 2.5) {
            collision = true;
            console.log('LaserDodge: 💀 Hit by horizontal RED laser at', laser.position, 'ship at', currentShipPos.y);
            break;
          }
        } else {
          // Ship dies when center is within 2.5 units of vertical laser center line
          if (Math.abs(laser.position - currentShipPos.x) < 2.5) {
            collision = true;
            console.log('LaserDodge: 💀 Hit by vertical RED laser at', laser.position, 'ship at', currentShipPos.x);
            break;
          }
        }
      }

    // Check enemy ship collisions - CONSISTENT hitbox
    // Both player ship and enemy ship are 32px (w-8 h-8 and w-6 h-6 respectively)
    // Player ship = ~8 units, Enemy ship = ~6 units
    // Collision when centers are within 4 units (half of 8)
    if (!collision) {
      for (const enemy of enemyShipsRef.current) {
        // PRECISE hitbox: 4 units for realistic ship-to-ship collision
        if (Math.abs(enemy.x - currentShipPos.x) < 4 && Math.abs(enemy.y - currentShipPos.y) < 4) {
          collision = true;
          console.log('LaserDodge: 💥 Collision with enemy ship at', enemy.x, enemy.y, 'ship at', currentShipPos.x, currentShipPos.y);
          break;
        }
      }
    }

    if (collision) {
      // Add invincibility period (1 second) to prevent multiple hits
      const timeSinceLastCollision = now - lastCollisionTimeRef.current;
      if (timeSinceLastCollision < 1000) {
        // Still in invincibility period, ignore collision - but continue game loop
        // Don't return here, let the game continue
      } else {
        // Lose a heart instead of immediate game over
        const currentHearts = heartsRef.current;
        if (currentHearts > 0) {
          const newHearts = currentHearts - 1;
          heartsRef.current = newHearts;
          lastCollisionTimeRef.current = now; // Set collision time for invincibility
          
          console.log(`LaserDodge: 💔 Hit! Lost a heart. Remaining: ${newHearts}`);
          
          // Create ship explosion animation at exact collision point (using shipRef)
          const shipExplosion: Explosion = {
            id: Date.now() + Math.random(),
            x: currentShipPos.x,
            y: currentShipPos.y,
            createdAt: Date.now(),
            type: 'ship'
          };
          setExplosions(prev => [...prev, shipExplosion]);
          
          // Play collision/hit sound - create audio using Web Audio API
          try {
            playCollision();
            playExplosionSound();
          } catch (e) {
            console.error('LaserDodge: Sound error, using fallback:', e);
          }
          
          // Fallback: create collision sound using Web Audio API
          try {
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.value = 300;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
          } catch (fallbackError) {
            console.error('LaserDodge: Fallback collision sound failed:', fallbackError);
          }
          
          // Update hearts state
          setHearts(newHearts);
          
          // Game over only when hearts reach 0
          if (newHearts <= 0) {
            console.log('LaserDodge: ☠️ All hearts lost! Game Over!');
            // Stop the game loop immediately
            isGameRunningRef.current = false;
            
            // Cancel any pending animation frames
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
              animationRef.current = undefined;
            }
            
            // Play final death sound
            try {
              playGameEnd();
            } catch (e) {
              console.error('LaserDodge: Game end sound error (non-critical):', e);
            }
            
            // End game immediately (don't use setTimeout to avoid freezing)
            endGame().catch(err => {
              console.error('LaserDodge: Error ending game:', err);
            });
            
            // Exit early to prevent further loop execution
            return;
          }
        }
      }
    }

    // Continue loop - MUST happen even if errors occur above
    // Only continue if game is still running and hearts > 0
    if (isGameRunningRef.current && heartsRef.current > 0) {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (heartsRef.current <= 0) {
        console.log('LaserDodge: Game loop stopping - all hearts lost');
      } else {
        console.log('LaserDodge: Game loop ending - isGameRunningRef is false');
      }
    }
  };

  // Check collisions - integrated into game loop state (removed separate useEffect to avoid stale closures)

  // End game
  const endGame = async () => {
    console.log('LaserDodge: Ending game...');
    isGameRunningRef.current = false;
    setGameState('ended');
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Play game end sound based on score
    const performance = currentScoreRef.current > 1000 ? 'great' : currentScoreRef.current < 300 ? 'poor' : 'good';
    playGameEnd(performance);
    
    const gameResult = {
      score: currentScoreRef.current,
      accuracy: 100,
      avgReactionTime: 0
    };
    
    // 🔒 AUTO-AUDIT: Log to admin audit system (required for fair skill-based gaming)
    console.log('🎯 [LaserDodge] Game ended, preparing to log audit...');
    console.log('🎯 [LaserDodge] Final score:', currentScoreRef.current);
    
    const gameDuration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    
    try {
      const auditResult = await logGameCompletion({
        gameType: GAME_TYPES.LASER_DODGE,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: currentScoreRef.current,
        accuracy: 100,
        reactionTime: 0,
        durationSeconds: gameDuration,
        additionalData: {
          rngSeed,
          listingId,
          entryNumber
        }
      });
      console.log('🎯 [LaserDodge] Audit result:', auditResult);
    } catch (error) {
      console.error('🎯 [LaserDodge] Audit logging failed:', error);
    }
    
    console.log('LaserDodgeGame calling onGameEnd with:', gameResult);
    onGameEnd(gameResult);
  };

  // Handle mouse movement
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    const newShipPos = { x: boundedX, y: boundedY };
    shipRef.current = newShipPos; // Update ref immediately for collision detection
    setShip(newShipPos);
  };

  // Handle mouse click for shooting
  const handleMouseClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    event.preventDefault();
    shoot();
  };

  // Handle touch movement (for non-gyroscope or as fallback)
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    
    // Skip if gyroscope is handling movement
    if (gyroscopeEnabled && isMobile) return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    const newShipPos = { x: boundedX, y: boundedY };
    shipRef.current = newShipPos;
    setShip(newShipPos);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Unlock audio on touch interaction (critical for mobile)
    if (!audioUnlockedRef.current) {
      unlockAudio();
    }
    
    if (gameState !== 'playing') return;
    
    // Always shoot on tap (mobile)
    console.log('📱 [LaserDodge] Touch detected - shooting!');
    shoot();
    
    // Only move by touch if gyroscope is not enabled
    if (!gyroscopeEnabled) {
      handleTouchMove(event);
    }
  };
  
  // Handle touch end for additional tap detection
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  // Keyboard event handling for shooting
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState === 'playing' && (event.code === 'Space' || event.code === 'KeyX')) {
        event.preventDefault();
        shoot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Start game - go to waiting state first
  const handleStartGame = () => {
    // Unlock audio on user interaction (clicking start)
    unlockAudio();
    
    // Reset ship to center
    setShip({ x: 50, y: 50 });
    setHasControl(false);
    setGameState('waiting');
  };
  
  // Handle clicking on ship to take control
  const handleShipClick = () => {
    if (gameState === 'waiting' && !hasControl) {
      // Unlock audio on user gesture (critical for mobile)
      unlockAudio();
      
      // Start music immediately on user gesture - this is critical for mobile!
      // We play it now because this is a user gesture context
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.volume = 0.7;
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.play()
          .then(() => {
            console.log('✅ [LaserDodge] Music started on ship click (mobile)');
            audioUnlockedRef.current = true;
          })
          .catch(e => {
            console.log('Music start blocked:', e);
            // Mark as unlocked anyway so we can retry
            audioUnlockedRef.current = true;
          });
      }
      
      setHasControl(true);
      setCountdown(5);
      setGameState('countdown');
    }
  };

  const handleCountdownComplete = () => {
    console.log('LaserDodge: Starting game...');
    
    // Reset everything
    setScore(0);
    currentScoreRef.current = 0;
    instantBonusRef.current = 0; // Reset instant bonuses
    enemyDestroyedPointsRef.current = 0; // Reset enemy destroyed points
    setLasers([]);
    setEnemyShips([]);
    setBullets([]);
    setExplosions([]);
    lasersRef.current = [];
    enemyShipsRef.current = [];
    bulletsRef.current = [];
    const initialShip = { x: 50, y: 50 };
    setShip(initialShip);
    shipRef.current = initialShip; // Reset ship ref for collision detection
    setTimeLeft(60);
    setHearts(3); // Reset hearts to 3
    heartsRef.current = 3; // Reset hearts ref
    lastCollisionTimeRef.current = 0; // Reset collision cooldown
    gameStartTimeRef.current = Date.now();
    lastLaserSpawnRef.current = Date.now();
    lastEnemySpawnRef.current = Date.now() - 10000; // Allow immediate enemy spawning
    lastShotRef.current = Date.now();
    isGameRunningRef.current = true;
    extremeModeTriggeredRef.current = false; // Reset mode triggers
    crazyModeTriggeredRef.current = false;
    
    setGameState('playing');
    
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
    
    // Start game loop
    console.log('LaserDodge: Starting game loop...');
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      isGameRunningRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-red-900 via-orange-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4"
      >
        <div 
          className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto text-center border border-white/20 shadow-2xl z-10"
        >
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">🔥</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
              Laser Dodge EXTREME
            </h2>
            <p className="text-orange-200 text-sm mb-4 sm:mb-6 font-medium">Ultimate Survival Challenge</p>
            
            {/* Gameplay Video */}
            <div className="mb-6 w-full max-w-2xl mx-auto">
              <div 
                className="relative w-full cursor-pointer group" 
                style={{ aspectRatio: '16/9' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedVideo('/laser-dodge-gameplay.mp4');
                }}
              >
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full rounded-lg border-2 border-orange-400 shadow-2xl transition-transform group-hover:scale-105"
                  style={{ objectFit: 'contain' }}
                >
                  <source src="/laser-dodge-gameplay.mp4" type="video/mp4" />
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
            
            <div className="text-left text-xs sm:text-sm text-white/90 mb-6 sm:mb-8 space-y-3 bg-black/20 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border border-white/10 max-h-64 sm:max-h-none overflow-y-auto">
              {/* Epilepsy Warning */}
              <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-400/50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white text-xs sm:text-sm font-bold">⚠️</span>
                  </div>
                  <p className="text-red-200 font-bold text-sm sm:text-base">EPILEPSY WARNING</p>
                </div>
                <p className="text-xs sm:text-sm text-red-100">
                  This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                  If you are sensitive to flashing lights, please do not play this game.
                </p>
              </div>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-bold">!</span>
                </div>
                <p className="text-white font-semibold">EXTREME MODE:</p>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-semibold">Desktop:</span> Move mouse to pilot ship</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-semibold">Mobile:</span> Touch and drag to pilot ship</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-semibold">Shoot:</span> Click anywhere or Spacebar/X key</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Enemy Ships:</span> Shoot them for +100 points!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-orange-300 font-semibold">Enemies Start:</span> They spawn immediately!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-semibold">Blue Lasers:</span> Full-screen beams (safe + bonus points!)</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-cyan-300 font-semibold">Risk/Reward:</span> Stay ON blue lasers for bonus points!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Red Lasers:</span> DEADLY when they turn red!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-semibold">Horizontal:</span> Avoid being on same row</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-purple-300 font-semibold">Vertical:</span> Avoid being on same column</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-orange-300 font-semibold">30 Seconds:</span> EXTREME MODE activates!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-red-300 font-semibold">Extreme:</span> More lasers, MUCH slower transitions, bonus hunting!</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl p-3 sm:p-4 mt-4 sm:mt-6">
                <p className="text-xs text-red-200">
                  <span className="text-yellow-300 font-bold">🎯 RISK/REWARD:</span> Stay ON blue lasers for MASSIVE bonus points! 
                  You get <span className="text-cyan-300 font-bold">+200 points instantly</span> when you first touch a blue laser, PLUS 60+ points per second while staying on it! In extreme mode, they take 2.4-4 seconds to turn red, giving you time to rack up huge scores before escaping.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartGame();
                }}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:scale-105 transform text-lg sm:text-xl pointer-events-auto"
              >
                🚀 START GAME
              </button>
              {!isCompetitionMode && onExit && (
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

        {/* Expanded Video Modal */}
        {expandedVideo && (
          <div 
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => setExpandedVideo(null)}
          >
            <div className="relative w-full max-w-6xl" style={{ aspectRatio: '16/9' }}>
              <button
                onClick={() => setExpandedVideo(null)}
                className="absolute -top-12 right-0 text-white text-4xl font-bold hover:text-orange-400 transition-colors z-10"
              >
                ✕ Close
              </button>
              <video
                autoPlay
                loop
                controls
                className="w-full h-full rounded-lg border-4 border-orange-400 shadow-2xl"
                style={{ objectFit: 'contain' }}
                onClick={(e) => e.stopPropagation()}
              >
                <source src={expandedVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Waiting state - player must click on ship to start
  if (gameState === 'waiting') {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 z-50 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* Stars background */}
        <div className="absolute inset-0">
          {Array.from({ length: 60 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${(i * 137) % 100}%`,
                top: `${(i * 211) % 100}%`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
        
        {/* Instruction overlay - simplified since gyro is in the circle */}
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30 px-4 w-full max-w-md">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-4 border-2 border-green-500 animate-pulse">
            <p className="text-green-400 text-xl sm:text-2xl font-bold text-center">
              🎯 TAP THE SHIP TO START! 🎯
            </p>
            <p className="text-gray-300 text-sm text-center mt-2">
              {isMobile 
                ? gyroscopeEnabled 
                  ? '✅ Tilt to move • Tap to shoot' 
                  : '📱 Tap ship to enable tilt & start'
                : 'Click ship to start • Move mouse to move • Click to shoot'}
            </p>
          </div>
        </div>
        
        {/* Ship in center - clickable with gyroscope button inside green circle */}
        <div
          className="absolute cursor-pointer transition-transform hover:scale-110"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
          }}
          onClick={handleShipClick}
          onTouchStart={(e) => {
            e.preventDefault();
            // Unlock audio on touch gesture (critical for mobile)
            unlockAudio();
            
            // First enable gyro if needed, then start game
            if (isMobile && !gyroscopeEnabled) {
              requestGyroPermission().then(() => {
                setTimeout(handleShipClick, 100);
              });
            } else {
              handleShipClick();
            }
          }}
        >
          {/* LARGE green circle containing ship and gyro controls */}
          <div
            className="absolute rounded-full border-4 border-green-400 animate-ping"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '180px' : '120px',
              height: isMobile ? '180px' : '120px',
            }}
          />
          <div
            className="absolute rounded-full border-2 border-green-400 bg-green-500/20 flex flex-col items-center justify-center"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '220px' : '120px',
              height: isMobile ? '220px' : '120px',
            }}
          >
            {/* Gyroscope enable button - LARGE and covering the circle - mobile only */}
            {/* Two-tap confirmation: first tap shows "TAP AGAIN", second tap enables */}
            {isMobile && !gyroscopeEnabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (gyroConfirmStep === 0) {
                    // First tap - show confirmation
                    setGyroConfirmStep(1);
                    // Reset after 3 seconds if no second tap
                    setTimeout(() => setGyroConfirmStep(0), 3000);
                  } else {
                    // Second tap - actually enable gyroscope
                    setGyroConfirmStep(2);
                    requestGyroPermission();
                    unlockAudio();
                  }
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (gyroConfirmStep === 0) {
                    setGyroConfirmStep(1);
                    setTimeout(() => setGyroConfirmStep(0), 3000);
                  } else {
                    setGyroConfirmStep(2);
                    requestGyroPermission();
                    unlockAudio();
                  }
                }}
                className={`absolute inset-0 flex items-center justify-center font-bold rounded-full shadow-2xl border-4 ${
                  gyroConfirmStep === 1 
                    ? 'bg-green-500/95 hover:bg-green-400 text-white border-green-300 animate-bounce' 
                    : 'bg-yellow-500/90 hover:bg-yellow-400 text-black border-yellow-300 animate-pulse'
                }`}
                style={{ 
                  fontSize: '18px',
                  zIndex: 100,
                  touchAction: 'manipulation'
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-1">{gyroConfirmStep === 1 ? '👆' : '📱'}</span>
                  <span>{gyroConfirmStep === 1 ? 'TAP AGAIN' : 'TAP TO'}</span>
                  <span>{gyroConfirmStep === 1 ? 'TO CONFIRM' : 'ENABLE TILT'}</span>
                </div>
              </button>
            )}
            {isMobile && gyroscopeEnabled && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-green-600/80 rounded-full border-4 border-green-400"
              >
                <div className="flex flex-col items-center text-white font-bold">
                  <span className="text-3xl mb-1">✅</span>
                  <span className="text-lg">TILT READY</span>
                </div>
              </div>
            )}
          </div>
          <div
            className="absolute rounded-full border-2 border-green-400"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '48px',
              height: '48px',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(34, 197, 94, 0.3)',
            }}
          />
          {/* Ship sprite - same size as gameplay */}
          <div
            className="w-8 h-8"
            style={{
              backgroundImage: 'url("/SHIP.png")',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              filter: 'drop-shadow(0 0 15px rgba(34, 197, 94, 0.8))',
            }}
          />
        </div>
        
        {/* Title */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-orange-400 mb-2">🔥 LASER DODGE 🔥</h1>
          <p className="text-gray-400 text-sm sm:text-base">Dodge lasers, destroy enemies, survive!</p>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Laser Dodge EXTREME</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8">Avoid full-screen horizontal and vertical lasers! Blue = safe, Red = DEADLY!</p>
          <div className="text-6xl sm:text-8xl font-bold text-red-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4">Get ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={gameAreaRef}
      className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 z-50 overflow-hidden"
      style={{ 
        touchAction: 'none',
        cursor: 'crosshair',
        WebkitTouchCallout: 'none', // Prevent iOS callout
        WebkitUserSelect: 'none', // Prevent text selection
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent' // Remove tap highlight on mobile
      }}
      onMouseMove={handleMouseMove}
      onClick={handleMouseClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* HUD Overlay - Always visible at top */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex justify-between items-center">
          <div className="text-xl sm:text-2xl font-bold text-white">
            🔥 Laser Dodge EXTREME
          </div>
          <div className="flex items-center gap-4 text-base sm:text-xl">
            <div className="flex items-center gap-1">
              {[...Array(hearts)].map((_, i) => (
                <span key={i} className="text-red-400 text-xl sm:text-2xl">❤️</span>
              ))}
              {[...Array(3 - hearts)].map((_, i) => (
                <span key={i} className="text-gray-600 text-xl sm:text-2xl">🤍</span>
              ))}
            </div>
            <div className="text-yellow-300 font-bold">⏱️ {timeLeft}s</div>
            <div className="text-green-300 font-bold">🎯 {score.toFixed(0)}</div>
            {!isCompetitionMode && onExit && (
              <button 
                onClick={onExit}
                className="text-white hover:text-red-500 text-2xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {gameState === 'playing' && (
          <div className="text-center mt-2">
            {timeLeft <= 30 && timeLeft > 8 && (
              <div className="text-lg sm:text-2xl text-red-400 font-bold animate-pulse">
                ⚡ EXTREME MODE ACTIVATED! ⚡
              </div>
            )}
            {timeLeft <= 8 && (
              <div className="text-xl sm:text-3xl text-red-500 font-bold animate-bounce bg-red-900/50 px-4 py-2 rounded-lg inline-block">
                🔥 CRAZY MODE! LASER APOCALYPSE! 🔥
              </div>
            )}
            {(() => {
              const blueLasers = lasers.filter(l => !l.isHarmful);
              let onBlue = false;
              for (const laser of blueLasers) {
                if (laser.type === 'horizontal' && Math.abs(laser.position - ship.y) < 2) {
                  onBlue = true;
                  break;
                }
                if (laser.type === 'vertical' && Math.abs(laser.position - ship.x) < 2) {
                  onBlue = true;
                  break;
                }
              }
              return onBlue ? (
                <div className="text-lg sm:text-2xl text-blue-400 font-bold animate-bounce">
                  💎 BONUS POINTS! 💎
                </div>
              ) : null;
            })()}
            {/* Mobile control hint */}
            {isMobile && gyroscopeEnabled && (
              <div className="text-xs text-green-400 opacity-70 mt-1">
                📱 Tilt to move • Tap to shoot
              </div>
            )}
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <>
        {/* CoD-style floating score popups */}
        <FloatingScore popups={popups} onRemove={removePopup} />
        
        <div className="absolute inset-0">
          {/* Game Area - Full Screen */}
          <div className="w-full h-full relative">
              {/* Stars background */}
              <div className="absolute inset-0">
                {Array.from({ length: 100 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                    style={{
                      left: `${(i * 137) % 100}%`,
                      top: `${(i * 211) % 100}%`,
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </div>

              {/* Horizontal Lasers - Same size on all devices */}
              {lasers.filter(l => l.type === 'horizontal').map((laser) => (
                <div key={laser.id} className="absolute w-full h-4" style={{
                  left: '0%',
                  top: `${laser.position}%`,
                  transform: 'translateY(-50%)'
                }}>
                  {/* Main laser beam with neon effects */}
                  <div
                    className={`absolute w-full h-full transition-all duration-300 ${
                      laser.isHarmful 
                        ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                        : 'bg-blue-400 shadow-lg shadow-blue-400/30'
                    }`}
                    style={{
                      boxShadow: laser.isHarmful 
                        ? '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.3)'
                        : '0 0 15px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.2)'
                    }}
                  />
                  {/* Neon center line */}
                  <div 
                    className="absolute w-full h-0.5 top-1/2 transform -translate-y-1/2"
                    style={{
                      background: laser.isHarmful 
                        ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent)',
                      boxShadow: laser.isHarmful 
                        ? '0 0 8px rgba(255, 255, 255, 0.8)'
                        : '0 0 6px rgba(255, 255, 255, 0.6)'
                    }}
                  />
                </div>
              ))}

              {/* Vertical Lasers - Same size on all devices */}
              {lasers.filter(l => l.type === 'vertical').map((laser) => (
                <div key={laser.id} className="absolute h-full w-4" style={{
                  left: `${laser.position}%`,
                  top: '0%',
                  transform: 'translateX(-50%)'
                }}>
                  {/* Main laser beam with neon effects */}
                  <div
                    className={`absolute h-full w-full transition-all duration-300 ${
                      laser.isHarmful 
                        ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                        : 'bg-blue-400 shadow-lg shadow-blue-400/30'
                    }`}
                    style={{
                      boxShadow: laser.isHarmful 
                        ? '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.3)'
                        : '0 0 15px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.2)'
                    }}
                  />
                  {/* Neon center line */}
                  <div 
                    className="absolute h-full w-0.5 left-1/2 transform -translate-x-1/2"
                    style={{
                      background: laser.isHarmful 
                        ? 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.9), transparent)'
                        : 'linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.7), transparent)',
                      boxShadow: laser.isHarmful 
                        ? '0 0 8px rgba(255, 255, 255, 0.8)'
                        : '0 0 6px rgba(255, 255, 255, 0.6)'
                    }}
                  />
                </div>
              ))}
              
              {/* Enemy Ships - Same size on all devices */}
              {enemyShips.map((enemy) => (
                <div
                  key={enemy.id}
                  className="absolute w-6 h-6"
                  style={{
                    left: `${enemy.x}%`,
                    top: `${enemy.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5,
                    backgroundImage: 'url("/SHIP.png")',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))'
                  }}
                />
              ))}

              {/* Bullets */}
              {bullets.map((bullet) => (
                <div
                  key={bullet.id}
                  className="absolute w-2 h-4 rounded-full"
                  style={{
                    left: `${bullet.x}%`,
                    top: `${bullet.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 8,
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(251, 191, 36, 0.8), rgba(251, 191, 36, 0.6))',
                    boxShadow: '0 0 12px rgba(251, 191, 36, 0.8), 0 0 24px rgba(251, 191, 36, 0.4), inset 0 0 4px rgba(255, 255, 255, 0.3)',
                    animation: 'pulse 0.5s ease-in-out infinite alternate'
                  }}
                />
              ))}

              {/* Explosions */}
              {explosions.map((explosion) => {
                const age = Date.now() - explosion.createdAt;
                const progress = Math.min(age / 1000, 1); // 1 second duration
                const scale = progress < 0.5 ? progress * 2 : 2 - (progress - 0.5) * 2; // Scale up then down
                const opacity = 1 - progress;
                
                return (
                  <div
                    key={explosion.id}
                    className="absolute rounded-full"
                    style={{
                      left: `${explosion.x}%`,
                      top: `${explosion.y}%`,
                      transform: `translate(-50%, -50%) scale(${scale})`,
                      zIndex: 20,
                      width: explosion.type === 'ship' ? '40px' : '30px',
                      height: explosion.type === 'ship' ? '40px' : '30px',
                      background: explosion.type === 'ship' 
                        ? 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(255, 100, 100, 0.8), rgba(255, 0, 0, 0.6), rgba(255, 0, 0, 0.3))'
                        : 'radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(255, 200, 0, 0.7), rgba(255, 100, 0, 0.5), rgba(255, 0, 0, 0.3))',
                      boxShadow: explosion.type === 'ship'
                        ? '0 0 30px rgba(255, 0, 0, 0.8), 0 0 60px rgba(255, 0, 0, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.3)'
                        : '0 0 20px rgba(255, 100, 0, 0.8), 0 0 40px rgba(255, 100, 0, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.3)',
                      opacity: opacity,
                      animation: 'pulse 0.1s ease-in-out infinite'
                    }}
                  />
                );
              })}

              {/* Ship - Using SHIP.png - Same size on all devices */}
              <div
                className="absolute"
                style={{
                  left: `${ship.x}%`,
                  top: `${ship.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}
              >
                {/* Light blue shield/hitbox indicator */}
                <div
                  className="absolute rounded-full border-2"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '32px',
                    height: '32px',
                    borderColor: 'rgba(173, 216, 230, 0.6)',
                    backgroundColor: 'rgba(173, 216, 230, 0.15)',
                    boxShadow: '0 0 8px rgba(173, 216, 230, 0.5), inset 0 0 8px rgba(173, 216, 230, 0.3)',
                    pointerEvents: 'none',
                    zIndex: 9,
                  }}
                />
                {/* Ship sprite - same size on all devices */}
                <div
                  className="absolute w-8 h-8"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundImage: 'url("/SHIP.png")',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))',
                    zIndex: 10,
                  }}
                />
              </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}