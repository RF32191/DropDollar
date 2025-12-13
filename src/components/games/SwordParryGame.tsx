'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FairRNGService, SwordSlashRNGConfig } from '@/lib/fairRNGService';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

// 🔥🔥🔥 CACHE BUSTER - BUILD 20251127-V8 🔥🔥🔥
console.log('');
console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
console.log('⚔️ SWORD PARRY v8.0 - BUILD 20251127-1900');
console.log('⚔️ If you see this, NEW CODE IS RUNNING!');
console.log('🔒 Audit logs WILL be sent to admin dashboard');
console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
console.log('');

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface SwordParryGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
}

interface Attack {
  id: number;
  type: 'slash' | 'thrust' | 'overhead';
  angle: number; // Visual angle for attack direction
  x: number;
  y: number;
  speed: number;
  createdAt: number;
  destroyed: boolean; // Changed from 'parried' to 'destroyed'
  perfectTiming: boolean;
  health: number; // Attacks need to be slashed to be destroyed
}

interface OptionalTarget {
  id: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
  cut: boolean;
  points: number;
}

interface MousePosition {
  x: number;
  y: number;
  angle: number;
}

export default function SwordParryGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode }: SwordParryGameProps) {
  // Get fair RNG configuration for deterministic gameplay
  const rngConfig = (listingId && entryNumber) 
    ? FairRNGService.getSwordSlashConfig(listingId, entryNumber)
    : null;
    
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [optionalTargets, setOptionalTargets] = useState<OptionalTarget[]>([]);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 50, y: 50, angle: 0 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [destroyedAttacks, setDestroyedAttacks] = useState(0);
  const [totalAttacks, setTotalAttacks] = useState(0);
  const [perfectDestroys, setPerfectDestroys] = useState(0);
  const [isSlashing, setIsSlashing] = useState(false); // Track if user is actively slashing
  const [hearts, setHearts] = useState(3); // Player has 3 hearts
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastAttackSpawnRef = useRef<number>(0);
  const lastTargetSpawnRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const currentScoreRef = useRef(0);
  const isGameRunningRef = useRef(false);
  const lastMouseAngleRef = useRef<number>(0);
  const timeLeftRef = useRef(60); // Add timeLeft ref to avoid dependency issues
  const attackSpawnIndexRef = useRef<number>(0); // Track which attack to spawn next from RNG config
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null); // Background music during gameplay
  const audioContextRef = useRef<AudioContext | null>(null); // For victory sound
  const audioUnlockedRef = useRef(false); // Track if audio is unlocked

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
          console.log('✅ [SwordParryGame] Audio unlocked');
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
    // Create audio element for sword-slash.mp3
    const audio = new Audio('/sword-slash.mp3');
    audio.loop = true;
    audio.volume = 0.7; // Set volume to 70% for better audibility
    audio.preload = 'auto'; // Preload the audio
    
    // Add error handling and logging
    audio.addEventListener('error', (e) => {
      console.warn('⚠️ [SwordParryGame] Audio file error (non-critical):', e);
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('✅ [SwordParryGame] Background music loaded successfully');
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ [SwordParryGame] Background music ready to play');
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
        if (!audio) return;
        
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
              console.log('✅ [SwordParryGame] Background music started playing on game start');
              audioUnlockedRef.current = true;
            })
            .catch((err) => {
              console.warn('⚠️ [SwordParryGame] Audio play failed, will retry:', err);
              // Try again after a short delay
              setTimeout(() => {
                if (backgroundMusicRef.current && gameState === 'playing') {
                  backgroundMusicRef.current.play()
                    .then(() => {
                      audioUnlockedRef.current = true;
                      console.log('✅ [SwordParryGame] Background music started on retry');
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
        console.warn('⚠️ [SwordParryGame] Audio play failed (non-critical)');
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
        
        console.log('🎉 [SwordParryGame] Victory sound played');
      } catch (err) {
        // Victory sound failed - game continues normally
        console.warn('⚠️ [SwordParryGame] Victory sound failed (non-critical)');
      }
    }
  }, [gameState]);

  // Update timeLeft ref when state changes
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        // Simple countdown beep
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
          audio.volume = 0.1;
          audio.play().catch(() => {});
        } catch (e) {
          // Audio failed, continue silently
        }
        countdownRef.current = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        handleCountdownComplete();
      }
    }
    
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [gameState, countdown]);

  // Calculate mouse angle from center
  const calculateAngle = useCallback((clientX: number, clientY: number) => {
    if (!gameAreaRef.current) return 0;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  }, []);

  // Handle mouse movement and clicking
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Unlock audio on first mouse interaction
    if (!audioUnlockedRef.current) {
      unlockAudio();
    }
    
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const angle = calculateAngle(event.clientX, event.clientY);
    
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    setMousePos({ x: boundedX, y: boundedY, angle });
    lastMouseAngleRef.current = angle;
  }, [gameState, calculateAngle, unlockAudio]);

  // Handle mouse clicks for slashing
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Unlock audio on click interaction
    if (!audioUnlockedRef.current) {
      unlockAudio();
    }
    
    if (gameState !== 'playing') return;
    setIsSlashing(true);
    
    // Update position on click too
    handleMouseMove(event);
  }, [gameState, handleMouseMove, unlockAudio]);

  const handleMouseUp = useCallback(() => {
    setIsSlashing(false);
  }, []);

  // Handle touch movement and tapping
  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const angle = calculateAngle(touch.clientX, touch.clientY);
    
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    setMousePos({ x: boundedX, y: boundedY, angle });
    lastMouseAngleRef.current = angle;
  }, [gameState, calculateAngle]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Unlock audio on touch interaction
    if (!audioUnlockedRef.current) {
      unlockAudio();
    }
    setIsSlashing(true);
    handleTouchMove(event);
  }, [handleTouchMove, unlockAudio]);

  const handleTouchEnd = useCallback(() => {
    setIsSlashing(false);
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isGameRunningRef.current) return;

    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;

    // Update score from ref (no need to set state in game loop)
    // Score updates happen in collision detection

    // Spawn attacks - DETERMINISTIC (competition) or RANDOM (practice)
    if (rngConfig && isCompetitionMode) {
      // COMPETITION MODE: Use predetermined attack spawns from RNG config
      const timeElapsed = now - gameStartTimeRef.current;
      const nextAttackIndex = attackSpawnIndexRef.current;
      
      if (nextAttackIndex < rngConfig.attackSpawns.length) {
        const nextAttack = rngConfig.attackSpawns[nextAttackIndex];
        
        // Check if it's time to spawn this attack
        if (timeElapsed >= nextAttack.time) {
          const attackTypes = ['slash', 'thrust', 'overhead'];
          const attackType = attackTypes[nextAttackIndex % 3] as Attack['type'];
          const targetX = 50, targetY = 50;
          const angle = Math.atan2(targetY - nextAttack.y, targetX - nextAttack.x) * (180 / Math.PI);
          
          const newAttack: Attack = {
            id: now + nextAttackIndex,
            type: attackType,
            angle: angle,
            x: nextAttack.x,
            y: nextAttack.y,
            speed: 0.3 + (nextAttack.size * 0.2), // Speed based on size config
            createdAt: now,
            destroyed: false,
            perfectTiming: false,
            health: 1
          };
          
          setAttacks(prev => [...prev, newAttack]);
          setTotalAttacks(prev => prev + 1);
          attackSpawnIndexRef.current = nextAttackIndex + 1;
          
          console.log(`⚔️ [SwordSlash] Spawned attack #${nextAttackIndex} at (${nextAttack.x}, ${nextAttack.y}) - DETERMINISTIC`);
        }
      }
    } else {
      // PRACTICE MODE: Random spawning for variety
      const difficultyLevel = Math.max(1, Math.floor((61 - timeLeftRef.current) / 10));
      const baseSpawnRate = Math.max(1500, 3500 - (difficultyLevel * 300));
      const attackSpawnRate = baseSpawnRate;
      
      if (now - lastAttackSpawnRef.current > attackSpawnRate) {
        const attackTypes = ['slash', 'thrust', 'overhead'];
        const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)] as Attack['type'];
        
        // Random spawn position from edges
        const side = Math.floor(Math.random() * 4);
        let startX, startY, targetX = 50, targetY = 50;
        
        switch (side) {
          case 0: // Top
            startX = Math.random() * 100;
            startY = 0;
            break;
          case 1: // Right
            startX = 100;
            startY = Math.random() * 100;
            break;
          case 2: // Bottom
            startX = Math.random() * 100;
            startY = 100;
            break;
          default: // Left
            startX = 0;
            startY = Math.random() * 100;
        }
        
        const angle = Math.atan2(targetY - startY, targetX - startX) * (180 / Math.PI);
        
        const newAttack: Attack = {
          id: now + Math.random(),
          type: attackType,
          angle: angle,
          x: startX,
          y: startY,
          speed: Math.min(0.8, 0.2 + (difficultyLevel * 0.1)),
          createdAt: now,
          destroyed: false,
          perfectTiming: false,
          health: 1
        };
        
        setAttacks(prev => [...prev, newAttack]);
        setTotalAttacks(prev => prev + 1);
        lastAttackSpawnRef.current = now;
      }
    }

    // Spawn optional targets - ONLY in practice mode
    // In competition mode, optional targets are disabled to ensure fair scoring
    if (!isCompetitionMode) {
      const targetSpawnRate = 3000;
      if (now - lastTargetSpawnRef.current > targetSpawnRate) {
        const newTarget: OptionalTarget = {
          id: now + Math.random(),
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          size: 15 + Math.random() * 10,
          createdAt: now,
          cut: false,
          points: 50 + Math.floor(Math.random() * 100)
        };
        
        setOptionalTargets(prev => [...prev, newTarget]);
        lastTargetSpawnRef.current = now;
      }
    }

    // Update attacks
    setAttacks(prevAttacks => {
      return prevAttacks.map(attack => {
        const updatedAttack = { ...attack };
        
        // Move attack towards center
        const deltaX = 50 - attack.x;
        const deltaY = 50 - attack.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > 1) {
          updatedAttack.x += (deltaX / distance) * attack.speed;
          updatedAttack.y += (deltaY / distance) * attack.speed;
        }
        
        return updatedAttack;
      }).filter(attack => {
        // Remove attacks that reached center without being destroyed
        const distanceToCenter = Math.sqrt(
          Math.pow(attack.x - 50, 2) + Math.pow(attack.y - 50, 2)
        );
        
        // MUCH larger protection zone - attacks must get within 12 units to hit center
        if (distanceToCenter < 12 && !attack.destroyed) {
          // Attack hit player - DEDUCT 1 HEART instead of instant death
          console.log('SwordParry: Attack hit center! Losing 1 heart!');
          setHearts(prev => {
            const newHearts = prev - 1;
            console.log(`❤️ Heart lost! Remaining: ${newHearts}`);
            if (newHearts <= 0) {
              console.log('💀 All hearts lost! Game Over!');
              endGame();
            }
            return newHearts;
          });
          return false; // Remove this attack
        }
        
        // Keep attacks that are still moving toward center or have been destroyed
        return distanceToCenter > 12 || attack.destroyed;
      });
    });

    // Remove old optional targets
    setOptionalTargets(prev => prev.filter(target => {
      const age = now - target.createdAt;
      return age < 5000; // Remove after 5 seconds
    }));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]); // Only depend on endGame

  // Check for slashing attacks and cuts
  useEffect(() => {
    if (gameState !== 'playing' || !isSlashing || !attacks || !mousePos) return;

    // Check for slashing attacks - when user is actively clicking/touching
    const nearbyAttacks = attacks.filter(attack => {
      if (!attack || typeof attack.x !== 'number' || typeof attack.y !== 'number') return false;
      
      const distance = Math.sqrt(
        Math.pow(attack.x - mousePos.x, 2) + Math.pow(attack.y - mousePos.y, 2)
      );
      // HUGE slash zone - very easy to hit attacks
      return distance < 30 && !attack.destroyed && attack.health > 0;
    });

    for (const attack of nearbyAttacks) {
      // Successful slash! No angle matching required
      const isPerfect = Math.random() < 0.3; // 30% chance for perfect slash
      
      setAttacks(prev => prev.map(a => 
        a.id === attack.id ? { ...a, destroyed: true, health: 0, perfectTiming: isPerfect } : a
      ));
      
      setDestroyedAttacks(prev => prev + 1);
      if (isPerfect) setPerfectDestroys(prev => prev + 1);
      
      // Award points
      const basePoints = 100;
      const perfectBonus = isPerfect ? 50 : 0;
      const totalPoints = basePoints + perfectBonus;
      
      setScore(prev => prev + totalPoints);
      currentScoreRef.current += totalPoints;
      
      // Play success sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
        audio.volume = isPerfect ? 0.3 : 0.2;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio failed, continue silently
      }
      
      console.log(`SwordParry: ${isPerfect ? 'Perfect' : 'Good'} slash! +${totalPoints} points`);
    }

    // Check for optional target cuts (same as before)
    const nearbyCuttableTargets = optionalTargets.filter(target => {
      if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') return false;
      
      const distance = Math.sqrt(
        Math.pow(target.x - mousePos.x, 2) + Math.pow(target.y - mousePos.y, 2)
      );
      return distance < target.size / 2 && !target.cut;
    });

    for (const target of nearbyCuttableTargets) {
      setOptionalTargets(prev => prev.map(t => 
        t.id === target.id ? { ...t, cut: true } : t
      ));
      
      setScore(prev => prev + target.points);
      currentScoreRef.current += target.points;
      
      // Play cut sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
        audio.volume = 0.15;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio failed, continue silently
      }
      
      console.log(`SwordParry: Cut target! +${target.points} points`);
    }
  }, [gameState, attacks, optionalTargets, mousePos, isSlashing]);

  // End game
  const endGame = useCallback(async () => {
    console.log('');
    console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
    console.log('⚔️ SWORD PARRY: ENDING GAME - AUDIT WILL BE LOGGED');
    console.log('⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️⚔️');
    console.log('');
    isGameRunningRef.current = false;
    setGameState('ended');
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Simple game end sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (e) {
      // Audio failed, continue silently
    }
    
    const accuracy = totalAttacks > 0 ? (destroyedAttacks / totalAttacks) * 100 : 0;
    const avgReactionTime = 250; // Estimate based on parry timing
    
    const gameResult = {
      score: currentScoreRef.current,
      accuracy,
      avgReactionTime
    };
    
    // 🔒 AUTO-AUDIT: Log to admin audit system (required for fair skill-based gaming)
    console.log('🎯 [SwordParry] Game ended, preparing to log audit...');
    console.log('🎯 [SwordParry] Final score:', currentScoreRef.current, 'Accuracy:', accuracy);
    
    const gameDuration = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
    
    try {
      const auditResult = await logGameCompletion({
        gameType: GAME_TYPES.SWORD_PARRY,
        gameMode: isCompetitionMode ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: currentScoreRef.current,
        accuracy,
        reactionTime: avgReactionTime,
        durationSeconds: gameDuration,
        additionalData: {
          listingId,
          entryNumber,
          totalAttacks,
          destroyedAttacks
        }
      });
      console.log('🎯 [SwordParry] Audit result:', auditResult);
    } catch (error) {
      console.error('🎯 [SwordParry] Audit logging failed:', error);
    }
    
    console.log('SwordParryGame calling onGameEnd with:', gameResult);
    onGameEnd(gameResult);
  }, [totalAttacks, destroyedAttacks, listingId, entryNumber, isCompetitionMode, onGameEnd]);

  // Start game
  const handleStartGame = () => {
    // Unlock audio on user interaction (clicking start)
    unlockAudio();
    setCountdown(3);
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('SwordParry: Starting game...');
    
    // Reset everything
    setScore(0);
    currentScoreRef.current = 0;
    setAttacks([]);
    setOptionalTargets([]);
    setDestroyedAttacks(0);
    setTotalAttacks(0);
    setPerfectDestroys(0);
    setHearts(3); // Reset hearts to 3
    setTimeLeft(60);
    timeLeftRef.current = 60; // Reset the ref too
    gameStartTimeRef.current = Date.now();
    lastAttackSpawnRef.current = Date.now();
    lastTargetSpawnRef.current = Date.now();
    isGameRunningRef.current = true;
    
    setGameState('playing');
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        timeLeftRef.current = newTime; // Update ref immediately
        if (newTime <= 0) {
          endGame();
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    // Start game loop
    animationRef.current = requestAnimationFrame(gameLoop);
  };

  // Cleanup and global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSlashing(false);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);

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
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-red-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm"
      >
        {/* Clickable background overlay */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onClick={handleStartGame}
        />
        
        <div className="absolute top-8 left-0 right-0 z-50 pointer-events-none">
          <div className="text-center bg-gradient-to-r from-red-400 to-orange-500 text-white text-3xl font-black py-4 px-8 rounded-full inline-block animate-pulse shadow-2xl">
            🖱️ CLICK ANYWHERE TO START 🖱️
          </div>
        </div>
        <div 
          className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl z-10 cursor-pointer"
          onClick={handleStartGame}
        >
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">⚔️</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent">
              Sword Parry
            </h2>
            <p className="text-red-200 text-sm mb-6 font-medium">Master of Blade Defense</p>
            
            <div className="text-left text-sm text-white/90 mb-8 space-y-3 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10 max-h-96 overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}>
              {/* Epilepsy Warning */}
              <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-400/50 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white text-sm font-bold">⚠️</span>
                  </div>
                  <p className="text-red-200 font-bold">EPILEPSY WARNING</p>
                </div>
                <p className="text-sm text-red-100">
                  This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                  If you are sensitive to flashing lights, please do not play this game.
                </p>
              </div>
              
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⚔️</span>
                </div>
                <p className="text-white font-semibold">How to Play:</p>
              </div>
              
              <div className="space-y-3 pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-red-300 font-semibold">Mouse = Sword:</span> Move mouse to control your blade position</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-orange-300 font-semibold">Click to Slash:</span> Click/tap to destroy bright red attacks!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-yellow-300 font-semibold">Perfect Slashes:</span> Random chance for bonus points!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-pink-300 font-semibold">3 Hearts:</span> You have 3 hearts! Attacks that reach center remove 1 heart</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-semibold">Optional Targets:</span> Cut floating objects for bonus points</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-blue-300 font-semibold">Protect Center:</span> Don't let attacks reach the blue circle!</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-xl p-4 mt-6">
                <p className="text-xs text-red-200">
                  <span className="text-yellow-300 font-bold">⚔️ Slash Mode:</span> Bright red attacks with glowing effects! 
                  Just click/tap when your sword is near them to destroy them instantly!
                </p>
              </div>
            </div>
            
            {!isCompetitionMode && onExit && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform pointer-events-auto"
                >
                  ← Back
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartGame();
                  }}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform pointer-events-auto"
                >
                  Start Game →
                </button>
              </div>
            )}
            {isCompetitionMode && (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartGame();
                  }}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 px-12 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform pointer-events-auto animate-pulse"
                >
                  Start Game →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Sword Parry Training</h2>
          <p className="text-lg text-gray-600 mb-8">Prepare your blade! Match attack angles to parry successfully.</p>
          <div className="text-8xl font-bold text-red-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-sm text-gray-500 mt-4">Focus on the incoming attacks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold text-gray-900">
            ⚔️ Sword Parry Training
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              ❤️ Hearts: {hearts}/3
            </div>
            <div className="text-sm text-gray-600">Time: {timeLeft}s</div>
            <div className="text-sm text-gray-600">Score: {score}</div>
            <div className="text-sm text-gray-600">
              Slashes: {destroyedAttacks}/{totalAttacks}
            </div>
            <div className="text-sm text-gray-600">
              Perfect: {perfectDestroys}
            </div>
            <div className="text-sm text-gray-600">
              Difficulty: {Math.max(1, Math.floor((61 - timeLeft) / 10))}/6
              {timeLeft <= 10 && (
                <span className="text-red-500 font-bold animate-pulse ml-1">FINAL WAVE!</span>
              )}
            </div>
            {!isCompetitionMode && onExit && (
              <button 
                onClick={onExit}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="space-y-6">
            <div className="text-xl font-bold text-gray-900">
              ⚔️ SLASH the bright red attacks before they reach the center! 🔥
              {isSlashing && (
                <div className="text-lg text-green-600 font-bold animate-pulse mt-2">
                  ⚡ SLASHING! ⚡
                </div>
              )}
            </div>
            
            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative rounded-xl h-96 border-4 border-gray-300 overflow-hidden cursor-none"
              style={{ 
                touchAction: 'none',
                background: `
                  radial-gradient(circle at 20% 20%, rgba(255, 0, 100, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(0, 100, 255, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 40% 60%, rgba(255, 200, 0, 0.2) 0%, transparent 50%),
                  linear-gradient(45deg, rgba(20, 20, 40, 0.8), rgba(40, 20, 60, 0.8), rgba(20, 40, 60, 0.8))
                `,
                animation: 'backgroundShift 8s ease-in-out infinite'
              }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Center target (player position) - MUCH larger protection zone */}
              <div className="absolute w-8 h-8 bg-blue-400 rounded-full border-2 border-blue-200 animate-pulse"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 5
                }}
              />
              
              {/* HUGE protection zone indicator */}
              <div className="absolute w-24 h-24 border-2 border-blue-300 border-dashed rounded-full opacity-40"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 4
                }}
              />

              {/* Attacks - BRIGHT RED and highly visible with neon effects */}
              {attacks.map((attack) => (
                <div
                  key={attack.id}
                  className={`absolute transition-all duration-100 ${
                    attack.destroyed 
                      ? 'bg-green-500 animate-ping' // Green flash when destroyed
                      : 'bg-red-500 border-2 border-red-300 shadow-lg animate-pulse' // BRIGHT RED with border and shadow
                  } rounded-lg`}
                  style={{
                    left: `${attack.x}%`,
                    top: `${attack.y}%`,
                    width: attack.type === 'thrust' ? '12px' : '20px', // Larger for visibility
                    height: attack.type === 'overhead' ? '24px' : '16px', // Larger for visibility
                    transform: `translate(-50%, -50%) rotate(${attack.angle}deg)`,
                    zIndex: 10,
                    // Enhanced neon glow effect
                    boxShadow: attack.destroyed 
                      ? 'none' 
                      : '0 0 20px rgba(239, 68, 68, 0.9), 0 0 40px rgba(239, 68, 68, 0.5), 0 0 60px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(255, 255, 255, 0.3)',
                    background: attack.destroyed 
                      ? 'radial-gradient(circle, rgba(34, 197, 94, 0.9), rgba(34, 197, 94, 0.6))'
                      : 'radial-gradient(circle, rgba(239, 68, 68, 0.9), rgba(185, 28, 28, 0.8), rgba(127, 29, 29, 0.6))'
                  }}
                >
                  {/* Attack type indicator with enhanced glow */}
                  {!attack.destroyed && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        textShadow: '0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.4)',
                        filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))'
                      }}
                    >
                      {attack.type === 'slash' ? '⚔️' : attack.type === 'thrust' ? '🗡️' : '🔨'}
                    </div>
                  )}
                </div>
              ))}

              {/* Optional targets */}
              {optionalTargets.map((target) => (
                <div
                  key={target.id}
                  className={`absolute rounded-full border-2 transition-all duration-200 ${
                    target.cut 
                      ? 'bg-green-400 border-green-200 animate-ping' 
                      : 'bg-purple-400 border-purple-200 animate-bounce'
                  }`}
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    width: `${target.size}px`,
                    height: `${target.size}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 8
                  }}
                >
                  {!target.cut && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                      {target.points}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Mouse sword with neon effects */}
              <div
                className="absolute w-1 h-12 border border-gray-300 shadow-lg"
                style={{
                  left: `${mousePos.x}%`,
                  top: `${mousePos.y}%`,
                  transform: `translate(-50%, -50%) rotate(${mousePos.angle}deg)`,
                  background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(200, 200, 200, 0.8), rgba(150, 150, 150, 0.7))',
                  boxShadow: '0 0 12px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.3), inset 0 0 4px rgba(255, 255, 255, 0.4)',
                  zIndex: 15
                }}
              />
              
              {/* Sword handle with enhanced glow */}
              <div
                className="absolute w-2 h-4 bg-amber-600 rounded-sm"
                style={{
                  left: `${mousePos.x}%`,
                  top: `${mousePos.y}%`,
                  transform: `translate(-50%, -50%) rotate(${mousePos.angle}deg) translateY(8px)`,
                  boxShadow: '0 0 8px rgba(217, 119, 6, 0.6), inset 0 0 2px rgba(255, 255, 255, 0.3)',
                  zIndex: 14
                }}
              />
              
              {/* Enhanced parry zone indicator around sword */}
              <div
                className="absolute w-16 h-16 border border-green-400 border-dashed rounded-full opacity-20"
                style={{
                  left: `${mousePos.x}%`,
                  top: `${mousePos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 13,
                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.4), inset 0 0 10px rgba(34, 197, 94, 0.2)'
                }}
              />
            </div>

            <div className="text-sm text-gray-600 text-center">
              <strong>Desktop:</strong> Move mouse to control sword, CLICK to slash attacks • <strong>Mobile:</strong> Touch and drag, TAP to slash
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-600 space-y-2">
          <div>⚔️ <strong>Slash:</strong> Click/tap to destroy bright red glowing attacks when your sword is near them!</div>
          <div>❤️ <strong>Hearts:</strong> You have 3 hearts! Lose 1 heart each time an attack reaches the center</div>
          <div>🎯 <strong>Perfect:</strong> Random chance for perfect slash bonus points</div>
          <div>💎 <strong>Targets:</strong> Cut optional purple targets for bonus points</div>
          <div>🛡️ <strong>Protect:</strong> Don't let red attacks reach the large blue center circle!</div>
          <div>⏰ <strong>Difficulty:</strong> 6 levels total - increases every 10 seconds (much more gradual!)</div>
          <div>🔍 <strong>Visual Aids:</strong> Green circle = slash zone, Blue circle = protection zone</div>
          <div>🔥 <strong>Attacks:</strong> Bright red with glow effects and emoji indicators - very easy to see!</div>
        </div>
      </div>
    </div>
  );
}
