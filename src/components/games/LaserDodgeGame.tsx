'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FairRNGService, LaserDodgeRNGConfig } from '@/lib/fairRNGService';
import { playLaserWarning, playExtremeModeActivation, playCrazyModeActivation, playCollision, playGameEnd } from '@/lib/gameAudio';

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
}

interface Laser {
  id: number;
  type: 'horizontal' | 'vertical';
  position: number;
  isHarmful: boolean;
  timeToHarmful: number;
  createdAt: number;
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

export default function LaserDodgeGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode }: LaserDodgeGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [ship, setShip] = useState<Ship>({ x: 50, y: 50 });
  const [enemyShips, setEnemyShips] = useState<EnemyShip[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
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
  
  // Get fair RNG configuration based on listing and attempt number
  const rngConfig = (listingId && entryNumber) 
    ? FairRNGService.getLaserDodgeConfig(listingId, entryNumber)
    : null;

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
    if (now - lastShotRef.current < 200) return; // Rate limit shooting (5 shots per second)
    
    lastShotRef.current = now;
    
    const newBullet: Bullet = {
      id: now + Math.random(),
      x: ship.x,
      y: ship.y - 2, // Start slightly above the ship
      createdAt: now
    };
    
    setBullets(prev => [...prev, newBullet]);
  };

  // Game loop - simplified without useCallback
  const gameLoop = () => {
    if (!isGameRunningRef.current) return;

    const now = Date.now();
    const timeSinceStart = now - gameStartTimeRef.current;

    // Update score with bonus for staying on blue lasers - decimal scoring
    const baseScore = Number((timeSinceStart / 50).toFixed(2));
    
    // Calculate blue laser bonus with decimal precision
    let blueBonus = 0;
    const blueLasers = lasers.filter(l => !l.isHarmful);
    for (const laser of blueLasers) {
      if (laser.type === 'horizontal') {
        // Ship is on blue horizontal laser
        if (Math.abs(laser.position - ship.y) < 2) {
          blueBonus += 0.01; // 0.01 points per frame on blue laser (decimal precision)
        }
      } else {
        // Ship is on blue vertical laser
        if (Math.abs(laser.position - ship.x) < 2) {
          blueBonus += 0.01; // 0.01 points per frame on blue laser (decimal precision)
        }
      }
    }
    
    // Add shooting bonus (enemies destroyed)
    let shootingBonus = 0;
    // This will be calculated when bullets hit enemies
    
    const newScore = Number((baseScore + blueBonus + shootingBonus).toFixed(2));
    currentScoreRef.current = newScore;
    setScore(newScore);

    // Spawn lasers - use RNG config if available (competition mode)
    if (rngConfig && isCompetitionMode) {
      // Spawn lasers based on RNG configuration
      const upcomingLasers = rngConfig.laserSpawns.filter(spawn => 
        spawn.time <= timeSinceStart && spawn.time > timeSinceStart - 100
      );
      
      for (const spawnConfig of upcomingLasers) {
        const newLaser: Laser = {
          id: now + Math.random(),
          type: spawnConfig.type,
          position: spawnConfig.position,
          isHarmful: false,
          timeToHarmful: spawnConfig.timeToHarmful,
          createdAt: now
        };
        
        console.log(`LaserDodge: Spawned RNG laser at ${timeSinceStart}ms:`, spawnConfig);
        setLasers(prev => [...prev, newLaser]);
      }
    } else {
      // Practice mode: Original progressive difficulty system
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
            createdAt: now
          };
          
          console.log(`LaserDodge: Spawning ${isCrazyMode ? 'CRAZY' : isExtremeMode ? 'EXTREME' : 'normal'} laser:`, newLaser.type, 'at position', newLaser.position);
          setLasers(prev => [...prev, newLaser]);
        }
        
        lastLaserSpawnRef.current = now;
      }
    }

    // Spawn enemy ships - use RNG config if available (competition mode)
    if (rngConfig && isCompetitionMode) {
      // Spawn enemies based on RNG configuration
      const upcomingEnemies = rngConfig.enemySpawns?.filter(spawn => 
        spawn.time <= timeSinceStart && spawn.time > timeSinceStart - 100
      ) || [];
      
      for (const spawnConfig of upcomingEnemies) {
        const newEnemy: EnemyShip = {
          id: now + Math.random(),
          x: spawnConfig.x,
          y: spawnConfig.y,
          direction: spawnConfig.direction,
          speed: spawnConfig.speed,
          createdAt: now
        };
        
        console.log(`LaserDodge: Spawned RNG enemy at ${timeSinceStart}ms:`, spawnConfig);
        setEnemyShips(prev => [...prev, newEnemy]);
      }
    } else {
      // Practice mode: Progressive enemy spawning
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
        setEnemyShips(prev => [...prev, newEnemy]);
        lastEnemySpawnRef.current = now;
      }
    }

    // Update existing lasers
    setLasers(prevLasers => {
      const currentTime = Date.now();
      const currentTimeSinceStart = currentTime - gameStartTimeRef.current;
      const currentIsExtremeMode = currentTimeSinceStart > 30000;
      
      return prevLasers.map(laser => {
        const updatedLaser = { ...laser };
        
        if (!updatedLaser.isHarmful) {
          const age = currentTime - laser.createdAt;
          if (age > laser.timeToHarmful) {
            updatedLaser.isHarmful = true;
            // Play laser warning sound
            playLaserWarning();
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
    });

    // Update enemy ships
    setEnemyShips(prevEnemies => {
      return prevEnemies.map(enemy => {
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
    });

    // Update bullets
    setBullets(prevBullets => {
      return prevBullets.map(bullet => {
        const updatedBullet = { ...bullet };
        updatedBullet.y -= 0.5; // Bullets move upward
        return updatedBullet;
      }).filter(bullet => {
        // Remove bullets that are off-screen
        return bullet.y > -5;
      });
    });

    // Check bullet-enemy collisions
    setBullets(prevBullets => {
      setEnemyShips(prevEnemies => {
        const remainingBullets: Bullet[] = [];
        const remainingEnemies: EnemyShip[] = [];
        
        for (const bullet of prevBullets) {
          let hit = false;
          
          for (const enemy of prevEnemies) {
            // Check collision (within 8% distance)
            if (Math.abs(bullet.x - enemy.x) < 4 && Math.abs(bullet.y - enemy.y) < 4) {
              hit = true;
              // Add points for destroying enemy
              currentScoreRef.current += 10;
              setScore(prev => Number((prev + 10).toFixed(2)));
              console.log('LaserDodge: Enemy destroyed! +10 points');
              break;
            }
          }
          
          if (!hit) {
            remainingBullets.push(bullet);
          }
        }
        
        // Keep enemies that weren't hit
        for (const enemy of prevEnemies) {
          let destroyed = false;
          
          for (const bullet of prevBullets) {
            if (Math.abs(bullet.x - enemy.x) < 4 && Math.abs(bullet.y - enemy.y) < 4) {
              destroyed = true;
              break;
            }
          }
          
          if (!destroyed) {
            remainingEnemies.push(enemy);
          }
        }
        
        return remainingEnemies;
      });
      
      return prevBullets.filter(bullet => {
        // Keep bullets that didn't hit anything
        for (const enemy of enemyShips) {
          if (Math.abs(bullet.x - enemy.x) < 4 && Math.abs(bullet.y - enemy.y) < 4) {
            return false; // Remove this bullet
          }
        }
        return true; // Keep this bullet
      });
    });

    // Continue loop
    if (isGameRunningRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  };

  // Check collisions - separate from game loop to avoid dependency issues
  useEffect(() => {
    if (gameState !== 'playing') return;

    const harmfulLasers = lasers.filter(l => l.isHarmful);
    let collision = false;
    
    // Check laser collisions
    for (const laser of harmfulLasers) {
      if (laser.type === 'horizontal') {
        // More precise collision: ship must be directly on the laser beam (height 4)
        // Laser is at laser.position%, ship is at ship.y%
        // Allow for 2% tolerance (half the laser height)
        if (Math.abs(laser.position - ship.y) < 2) {
          collision = true;
          console.log('LaserDodge: Hit by horizontal red laser at Y:', laser.position, 'Ship Y:', ship.y);
          break;
        }
      } else {
        // More precise collision: ship must be directly on the laser beam (width 4)
        // Laser is at laser.position%, ship is at ship.x%
        // Allow for 2% tolerance (half the laser width)
        if (Math.abs(laser.position - ship.x) < 2) {
          collision = true;
          console.log('LaserDodge: Hit by vertical red laser at X:', laser.position, 'Ship X:', ship.x);
          break;
        }
      }
    }

    // Check enemy ship collisions
    if (!collision) {
      for (const enemy of enemyShips) {
        if (Math.abs(enemy.x - ship.x) < 6 && Math.abs(enemy.y - ship.y) < 6) {
          collision = true;
          console.log('LaserDodge: Collision with enemy ship!');
          break;
        }
      }
    }

    if (collision) {
      console.log('LaserDodge: Collision detected! Game Over!');
      
      // Play collision/death sound
      playCollision();
      
      endGame();
    }
  }, [lasers, ship, enemyShips, gameState]);

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
    
    setShip({ x: boundedX, y: boundedY });
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
    
    setShip({ x: boundedX, y: boundedY });
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
    setShip({ x: 50, y: 50 });
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
                  <span className="text-yellow-300 font-bold">🎯 RISK/REWARD:</span> After 30 seconds, stay ON blue lasers for bonus points! 
                  They take 2.4-4 seconds to turn red, giving you time to earn big bonuses before escaping.
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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl p-3 sm:p-6 max-w-6xl w-full max-h-full overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
          <div className="text-lg font-bold text-gray-900">
            🔥 Laser Dodge EXTREME
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="text-gray-600">Time: {timeLeft}s</div>
            <div className="text-gray-600">Score: {score.toFixed(2)}</div>
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
              🔥 Avoid the full-screen laser beams! 🚀
              {timeLeft <= 30 && timeLeft > 8 && (
                <div className="text-lg text-red-600 font-bold animate-pulse mt-2">
                  ⚡ EXTREME MODE ACTIVATED! ⚡
                </div>
              )}
              {timeLeft <= 8 && (
                <div className="text-xl text-red-800 font-bold animate-bounce mt-2 bg-red-200 px-4 py-2 rounded-lg">
                  🔥 CRAZY MODE! LASER APOCALYPSE! 🔥
                </div>
              )}
              {/* Show bonus indicator */}
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
                  <div className="text-lg text-blue-500 font-bold animate-bounce mt-2">
                    💎 BONUS POINTS! 💎
                  </div>
                ) : null;
              })()}
            </div>
            
            {/* Game Area */}
            <div 
              ref={gameAreaRef}
              className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl h-64 sm:h-96 border-4 border-gray-300 overflow-hidden"
              style={{ 
                touchAction: 'none',
                cursor: 'crosshair'
              }}
              onMouseMove={handleMouseMove}
              onClick={handleMouseClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
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
                  {/* Main laser beam */}
                  <div
                    className={`absolute w-full h-full transition-all duration-300 ${
                      laser.isHarmful 
                        ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                        : 'bg-blue-400 shadow-lg shadow-blue-400/30'
                    }`}
                  />
                  {/* White center line for realism */}
                  <div className="absolute w-full h-0.5 bg-white/80 top-1/2 transform -translate-y-1/2 shadow-sm" />
                </div>
              ))}

              {/* Vertical Lasers */}
              {lasers.filter(l => l.type === 'vertical').map((laser) => (
                <div key={laser.id} className="absolute h-full w-4" style={{
                  left: `${laser.position}%`,
                  top: '0%',
                  transform: 'translateX(-50%)'
                }}>
                  {/* Main laser beam */}
                  <div
                    className={`absolute h-full w-full transition-all duration-300 ${
                      laser.isHarmful 
                        ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse' 
                        : 'bg-blue-400 shadow-lg shadow-blue-400/30'
                    }`}
                  />
                  {/* White center line for realism */}
                  <div className="absolute h-full w-0.5 bg-white/80 left-1/2 transform -translate-x-1/2 shadow-sm" />
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
                  className="absolute w-2 h-4 bg-yellow-400 rounded-full"
                  style={{
                    left: `${bullet.x}%`,
                    top: `${bullet.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 8,
                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)' // Yellow glow effect
                  }}
                />
              ))}

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

            <div className="text-xs sm:text-sm text-gray-600 text-center">
              <div className="hidden sm:block">
                <strong>Desktop:</strong> Move mouse to control ship | <strong>Shoot:</strong> Click anywhere or Spacebar/X key
              </div>
              <div className="block sm:hidden">
                <strong>Mobile:</strong> Touch and drag to move ship | <strong>Shoot:</strong> Tap anywhere
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 space-y-2">
          <div>🔥 <strong>EXTREME MODE:</strong> Full-screen horizontal and vertical laser beams!</div>
          <div>🔵 Blue lasers are safe but turn red when deadly</div>
          <div>🚀 Find safe spots between the laser grids to survive</div>
          <div>🔫 <strong>SHOOTING:</strong> Click/tap anywhere to shoot bullets from your ship!</div>
          <div>🎯 <strong>ENEMY SHIPS:</strong> Shoot red ships for +10 points each!</div>
          <div>⚡ <strong>ENEMIES START:</strong> They spawn immediately when game begins!</div>
          <div>⚠️ Avoid collision with enemy ships!</div>
        </div>
      </div>
    </div>
  );
}