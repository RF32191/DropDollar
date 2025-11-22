'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FairRNGService, LaserDodgeRNGConfig } from '@/lib/fairRNGService';
import { playLaserWarning, playExtremeModeActivation, playCrazyModeActivation, playCollision, playGameEnd, playShootSound, playExplosionSound, playEnemyHitSound } from '@/lib/gameAudio';

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
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [ship, setShip] = useState<Ship>({ x: 50, y: 50 });
  const [enemyShips, setEnemyShips] = useState<EnemyShip[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(5);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number>(0);
  const lastLaserSpawnRef = useRef<number>(0);
  const lastEnemySpawnRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const currentScoreRef = useRef(0);
  const isGameRunningRef = useRef(false);
  const extremeModeTriggeredRef = useRef(false); // Track if extreme mode audio played
  const crazyModeTriggeredRef = useRef(false); // Track if crazy mode audio played
  const lastShotRef = useRef<number>(0);
  
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
    
    // Play shooting sound
    try {
      playShootSound();
    } catch (e) {
      console.error('LaserDodge: Shoot sound error (non-critical):', e);
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
    // PLUS: 50 point immediate bonus when first touching a blue laser!
    let blueBonus = 0;
    let immediateBonus = 0;
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
      
      // Give 50 point immediate bonus on first touch of this laser
      if (isOnLaser && !laser.bonusCollected) {
        immediateBonus += 50;
        laser.bonusCollected = true; // Mark as collected
        console.log('LaserDodge: 💎 Blue laser bonus collected! +50 points');
      }
    }
    
    // Add shooting bonus (enemies destroyed)
    let shootingBonus = 0;
    // This will be calculated when bullets hit enemies
    
    const newScore = Number((baseScore + blueBonus + shootingBonus + immediateBonus).toFixed(2));
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
        enemySpawnRate = seededRng.nextInt(800, 2000);
      } else if (isExtremeMode) {
        enemySpawnRate = seededRng.nextInt(1200, 3000);
      } else {
        enemySpawnRate = seededRng.nextInt(2000, 4000);
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
          // Bottom
          x = seededRng.nextFloat(5, 95);
          y = 100;
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
        enemySpawnRate = Math.max(800, 2000 - (level * 150)); // 0.8-2 seconds in crazy mode
      } else if (isExtremeMode) {
        enemySpawnRate = Math.max(1200, 3000 - (level * 200)); // 1.2-3 seconds in extreme mode
      } else {
        enemySpawnRate = Math.max(2000, 5000 - (level * 300)); // 2-5 seconds in normal mode
      }
      
      if (now - lastEnemySpawnRef.current > enemySpawnRate) {
        const direction = Math.random() < 0.5 ? 'left' : 'right';
        const speed = isCrazyMode ? 0.3 : isExtremeMode ? 0.2 : 0.15; // pixels per frame
        
        const newEnemy: EnemyShip = {
          id: now + Math.random(),
          x: direction === 'left' ? 105 : -5, // Start off-screen
          y: Math.random() * 100,
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
    let collisionPoints = 0;
    
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
            
            // Play explosion sound
            playExplosionSound();
            playEnemyHitSound();
            
            collisionPoints += 10;
            console.log('LaserDodge: Enemy destroyed! +10 points');
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
    
    if (collisionPoints > 0) {
      currentScoreRef.current += collisionPoints;
      setScore(prev => Number((prev + collisionPoints).toFixed(2)));
    }

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
      console.log('LaserDodge: ☠️ Collision detected! Game Over!');
      
      // Create ship explosion animation at exact collision point (using shipRef)
      const shipExplosion: Explosion = {
        id: Date.now() + Math.random(),
        x: currentShipPos.x,
        y: currentShipPos.y,
        createdAt: Date.now(),
        type: 'ship'
      };
      setExplosions(prev => [...prev, shipExplosion]);
      
      // Play collision/death sound
      playCollision();
      playExplosionSound();
      
      endGame();
      return; // Don't continue loop after game over
    }

    // Continue loop - MUST happen even if errors occur above
    if (isGameRunningRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      console.log('LaserDodge: Game loop ending - isGameRunningRef is false');
    }
  };

  // Check collisions - integrated into game loop state (removed separate useEffect to avoid stale closures)

  // End game
  const endGame = () => {
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

  // Handle touch movement
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    
    const gameArea = gameAreaRef.current;
    if (!gameArea) return;
    
    const rect = gameArea.getBoundingClientRect();
    const touch = event.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    const newShipPos = { x: boundedX, y: boundedY };
    shipRef.current = newShipPos; // Update ref immediately for collision detection
    setShip(newShipPos);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (gameState !== 'playing') return;
    
    // Handle shooting on touch
    shoot();
    
    // Also handle movement
    handleTouchMove(event);
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

  // Start game
  const handleStartGame = () => {
    setCountdown(5);
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('LaserDodge: Starting game...');
    
    // Reset everything
    setScore(0);
    currentScoreRef.current = 0;
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
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-orange-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-full overflow-y-auto text-center border border-white/20 shadow-2xl">
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
                  <p><span className="text-red-300 font-semibold">Enemy Ships:</span> Shoot them for +10 points!</p>
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
                  You get <span className="text-cyan-300 font-bold">+50 points instantly</span> when you first touch a blue laser, PLUS 60+ points per second while staying on it! In extreme mode, they take 2.4-4 seconds to turn red, giving you time to rack up huge scores before escaping.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {!isCompetitionMode && onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform text-sm sm:text-base"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse text-sm sm:text-base`}
              >
                🔥 START EXTREME
              </button>
            </div>
          </div>
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
        cursor: 'crosshair'
      }}
      onMouseMove={handleMouseMove}
      onClick={handleMouseClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* HUD Overlay - Always visible at top */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex justify-between items-center">
          <div className="text-xl sm:text-2xl font-bold text-white">
            🔥 Laser Dodge EXTREME
          </div>
          <div className="flex items-center gap-4 text-base sm:text-xl">
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
          </div>
        )}
      </div>

      {gameState === 'playing' && (
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

              {/* Horizontal Lasers */}
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

              {/* Vertical Lasers */}
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
              
              {/* Enemy Ships */}
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
                    filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))' // Red glow effect
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

              {/* Ship - Using SHIP.png */}
              <div
                className="absolute w-8 h-8"
                style={{
                  left: `${ship.x}%`,
                  top: `${ship.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  backgroundImage: 'url("/SHIP.png")',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' // Green glow effect
                }}
              />
          </div>
        </div>
      )}
    </div>
  );
}