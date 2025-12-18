'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface ParryProGameProps {
  onGameComplete: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
}

// Seeded RNG
class Mulberry32 {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

interface Enemy {
  id: number;
  side: 'left' | 'right' | 'center';
  attackPhase: 'idle' | 'windup' | 'strike' | 'recovery';
  attackTimer: number;
  swordAngle: number;
  mesh: THREE.Group | null;
  nextAttackIn: number;
}

export default function ParryProGame({ onGameComplete, onExit, gameMode = 'practice', rngSeed }: ParryProGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerSwordRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const initializedRef = useRef(false);
  
  // Game state refs
  const enemiesRef = useRef<Enemy[]>([]);
  const scoreRef = useRef<number>(0);
  const heartsRef = useRef<number>(3);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const perfectParriesRef = useRef<number>(0);
  const totalParriesRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const isParryingRef = useRef<boolean>(false);
  const parryWindowRef = useRef<number>(0);
  const lastParryTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'playing' | 'complete'>('ready');
  const gameStartTimeRef = useRef<number>(0);
  const secondEnemySpawnedRef = useRef<boolean>(false);
  
  // Callbacks ref
  const onGameCompleteRef = useRef(onGameComplete);
  const gameModeRef = useRef(gameMode);
  const rngSeedRef = useRef(rngSeed);
  
  useEffect(() => {
    onGameCompleteRef.current = onGameComplete;
    gameModeRef.current = gameMode;
    rngSeedRef.current = rngSeed;
  }, [onGameComplete, gameMode, rngSeed]);
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('⚔️ [ParryPro] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const seededRngRef = useRef(seededRng);
  useEffect(() => {
    seededRngRef.current = seededRng;
  }, [seededRng]);
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [parryFeedback, setParryFeedback] = useState<'none' | 'perfect' | 'good' | 'miss'>('none');
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Create sword mesh
  const createSword = useCallback((isEnemy: boolean = false) => {
    const group = new THREE.Group();
    
    // Blade
    const bladeGeometry = new THREE.BoxGeometry(0.15, 2.5, 0.05);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x8B0000 : 0xC0C0C0,
      emissive: isEnemy ? 0x400000 : 0x404040,
      emissiveIntensity: 0.3,
      shininess: 100,
      specular: 0xFFFFFF,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 1.25;
    group.add(blade);
    
    // Blade edge glow
    const edgeGeometry = new THREE.BoxGeometry(0.02, 2.5, 0.06);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: isEnemy ? 0xFF4444 : 0x88CCFF,
      transparent: true,
      opacity: 0.6,
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 1.25;
    edge.position.x = 0.08;
    group.add(edge);
    
    // Guard (crossguard)
    const guardGeometry = new THREE.BoxGeometry(0.8, 0.15, 0.1);
    const guardMaterial = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x4A0000 : 0xDAA520,
      emissive: isEnemy ? 0x200000 : 0x554400,
      shininess: 80,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    group.add(guard);
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: isEnemy ? 0x2A0000 : 0x8B4513,
      emissive: isEnemy ? 0x100000 : 0x3A1A05,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.3;
    group.add(handle);
    
    // Pommel
    const pommelGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const pommel = new THREE.Mesh(pommelGeometry, guardMaterial);
    pommel.position.y = -0.65;
    group.add(pommel);
    
    return group;
  }, []);
  
  // Create enemy figure
  const createEnemy = useCallback((side: 'left' | 'right' | 'center') => {
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C2C2C,
      emissive: 0x100000,
      emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: 0x1A1A1A,
      emissive: 0x0A0000,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    group.add(head);
    
    // Glowing red eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.08, 1.5, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.08, 1.5, 0.2);
    group.add(rightEye);
    
    // Sword arm
    const sword = createSword(true);
    sword.position.set(side === 'left' ? -0.5 : 0.5, 0.8, 0);
    sword.name = 'sword';
    group.add(sword);
    
    // Position based on side
    if (side === 'left') {
      group.position.x = -3;
      group.rotation.y = 0.3;
    } else if (side === 'right') {
      group.position.x = 3;
      group.rotation.y = -0.3;
    } else {
      group.position.x = 0;
    }
    group.position.z = -3;
    group.position.y = 0;
    
    return group;
  }, [createSword]);
  
  // Handle parry input
  const handleParry = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    
    const now = Date.now();
    // Prevent spam - minimum 200ms between parries
    if (now - lastParryTimeRef.current < 200) return;
    lastParryTimeRef.current = now;
    
    isParryingRef.current = true;
    parryWindowRef.current = 0.3; // 300ms parry window
    
    // Animate player sword
    if (playerSwordRef.current) {
      playerSwordRef.current.rotation.z = -0.8;
      setTimeout(() => {
        if (playerSwordRef.current) {
          playerSwordRef.current.rotation.z = 0;
        }
      }, 200);
    }
    
    // Check if any enemy is in strike phase
    let parried = false;
    enemiesRef.current.forEach(enemy => {
      if (enemy.attackPhase === 'strike') {
        parried = true;
        totalParriesRef.current++;
        
        // Calculate timing score - perfect if parried at peak of strike
        const strikeProgress = enemy.attackTimer;
        const isPerfect = strikeProgress > 0.3 && strikeProgress < 0.7;
        
        if (isPerfect) {
          perfectParriesRef.current++;
          comboRef.current++;
          if (comboRef.current > maxComboRef.current) {
            maxComboRef.current = comboRef.current;
          }
          
          const points = 100 + (comboRef.current * 25);
          scoreRef.current += points;
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setParryFeedback('perfect');
        } else {
          comboRef.current = Math.max(0, comboRef.current - 1);
          const points = 50;
          scoreRef.current += points;
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setParryFeedback('good');
        }
        
        // Reset enemy attack
        enemy.attackPhase = 'recovery';
        enemy.attackTimer = 0;
        
        setTimeout(() => setParryFeedback('none'), 500);
      }
    });
    
    if (!parried) {
      // Missed parry (no enemy attacking)
      setParryFeedback('miss');
      setTimeout(() => setParryFeedback('none'), 300);
    }
    
    setTimeout(() => {
      isParryingRef.current = false;
    }, 300);
  }, []);
  
  // Start game
  const startGame = useCallback(() => {
    gameStateRef.current = 'playing';
    setGameState('playing');
    scoreRef.current = 0;
    setScore(0);
    heartsRef.current = 3;
    setHearts(3);
    comboRef.current = 0;
    setCombo(0);
    gameTimeRef.current = 0;
    setTimeElapsed(0);
    perfectParriesRef.current = 0;
    totalParriesRef.current = 0;
    maxComboRef.current = 0;
    secondEnemySpawnedRef.current = false;
    gameStartTimeRef.current = Date.now();
    
    // Clear old enemies
    enemiesRef.current.forEach(e => {
      if (e.mesh && sceneRef.current) {
        sceneRef.current.remove(e.mesh);
      }
    });
    enemiesRef.current = [];
    
    // Spawn first enemy (center)
    if (sceneRef.current) {
      const enemyMesh = createEnemy('center');
      sceneRef.current.add(enemyMesh);
      
      enemiesRef.current.push({
        id: 1,
        side: 'center',
        attackPhase: 'idle',
        attackTimer: 0,
        swordAngle: 0,
        mesh: enemyMesh,
        nextAttackIn: 1.5 + seededRngRef.current.next() * 1.0,
      });
    }
  }, [createEnemy]);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a0a);
    scene.fog = new THREE.Fog(0x1a0a0a, 5, 20);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, -3);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x442222, 0.5);
    scene.add(ambientLight);
    
    const spotlight = new THREE.SpotLight(0xFF4444, 1.5);
    spotlight.position.set(0, 8, 2);
    spotlight.angle = Math.PI / 4;
    spotlight.castShadow = true;
    scene.add(spotlight);
    
    const backLight = new THREE.DirectionalLight(0x4444FF, 0.3);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);
    
    // Floor (arena)
    const floorGeometry = new THREE.CircleGeometry(8, 32);
    const floorMaterial = new THREE.MeshPhongMaterial({
      color: 0x2a1a1a,
      emissive: 0x100505,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Arena ring
    const ringGeometry = new THREE.TorusGeometry(7.5, 0.1, 8, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4444,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    scene.add(ring);
    
    // Player sword (always visible at bottom)
    const playerSword = createSword(false);
    playerSword.position.set(0, 0.5, 3);
    playerSword.rotation.x = -0.3;
    scene.add(playerSword);
    playerSwordRef.current = playerSword;
    
    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      
      // Update game time
      if (gameStateRef.current === 'playing') {
        gameTimeRef.current += deltaTime;
        setTimeElapsed(Math.floor(gameTimeRef.current));
        
        // Spawn second enemy after 10 seconds
        if (!secondEnemySpawnedRef.current && gameTimeRef.current >= 10) {
          secondEnemySpawnedRef.current = true;
          const side = seededRngRef.current.next() > 0.5 ? 'left' : 'right';
          const enemyMesh = createEnemy(side);
          scene.add(enemyMesh);
          
          enemiesRef.current.push({
            id: 2,
            side: side,
            attackPhase: 'idle',
            attackTimer: 0,
            swordAngle: 0,
            mesh: enemyMesh,
            nextAttackIn: 2.0 + seededRngRef.current.next() * 1.5,
          });
          
          console.log('⚔️ [ParryPro] Second enemy spawned on', side);
        }
        
        // Update enemies
        enemiesRef.current.forEach(enemy => {
          if (!enemy.mesh) return;
          
          const sword = enemy.mesh.getObjectByName('sword') as THREE.Group;
          if (!sword) return;
          
          switch (enemy.attackPhase) {
            case 'idle':
              // Count down to next attack
              enemy.nextAttackIn -= deltaTime;
              if (enemy.nextAttackIn <= 0) {
                enemy.attackPhase = 'windup';
                enemy.attackTimer = 0;
              }
              // Idle sword animation
              sword.rotation.z = Math.sin(time / 500) * 0.1;
              break;
              
            case 'windup':
              // Pull sword back
              enemy.attackTimer += deltaTime * 1.5;
              sword.rotation.z = -1.5 * Math.min(1, enemy.attackTimer);
              sword.rotation.x = 0.3 * Math.min(1, enemy.attackTimer);
              
              if (enemy.attackTimer >= 0.8) {
                enemy.attackPhase = 'strike';
                enemy.attackTimer = 0;
              }
              break;
              
            case 'strike':
              // Fast strike forward
              enemy.attackTimer += deltaTime * 3;
              sword.rotation.z = -1.5 + (2.5 * Math.min(1, enemy.attackTimer));
              sword.rotation.x = 0.3 - (0.5 * Math.min(1, enemy.attackTimer));
              
              // Check if strike completed (hit player)
              if (enemy.attackTimer >= 1) {
                // Player takes damage if not parried
                heartsRef.current--;
                setHearts(heartsRef.current);
                comboRef.current = 0;
                setCombo(0);
                
                setParryFeedback('miss');
                setTimeout(() => setParryFeedback('none'), 500);
                
                if (heartsRef.current <= 0) {
                  // Game over
                  endGame();
                  return;
                }
                
                enemy.attackPhase = 'recovery';
                enemy.attackTimer = 0;
              }
              break;
              
            case 'recovery':
              // Return to idle
              enemy.attackTimer += deltaTime * 2;
              sword.rotation.z = 1.0 - (1.0 * Math.min(1, enemy.attackTimer));
              sword.rotation.x = -0.2 + (0.2 * Math.min(1, enemy.attackTimer));
              
              if (enemy.attackTimer >= 1) {
                enemy.attackPhase = 'idle';
                enemy.attackTimer = 0;
                // Random delay until next attack (shorter over time)
                const minDelay = Math.max(0.8, 2.0 - gameTimeRef.current * 0.02);
                const maxDelay = Math.max(1.5, 3.0 - gameTimeRef.current * 0.02);
                enemy.nextAttackIn = minDelay + seededRngRef.current.next() * (maxDelay - minDelay);
              }
              break;
          }
          
          // Enemy body sway
          enemy.mesh.rotation.z = Math.sin(time / 800 + enemy.id) * 0.05;
        });
      }
      
      // Player sword idle animation
      if (playerSwordRef.current && !isParryingRef.current) {
        playerSwordRef.current.rotation.z = Math.sin(time / 600) * 0.05;
      }
      
      renderer.render(scene, camera);
    };
    
    const endGame = () => {
      gameStateRef.current = 'complete';
      setGameState('complete');
      
      const duration = (Date.now() - gameStartTimeRef.current) / 1000;
      const accuracy = totalParriesRef.current > 0 
        ? Math.round((perfectParriesRef.current / totalParriesRef.current) * 100)
        : 0;
      
      // Bonus points
      const survivalBonus = Math.floor(gameTimeRef.current * 5);
      const comboBonus = maxComboRef.current * 50;
      const heartBonus = heartsRef.current * 100;
      const finalScore = scoreRef.current + survivalBonus + comboBonus + heartBonus;
      
      scoreRef.current = finalScore;
      setScore(finalScore);
      
      logGameCompletion({
        gameType: 'parry_pro',
        gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: finalScore,
        accuracy: accuracy,
        durationSeconds: Math.round(duration),
        additionalData: {
          perfectParries: perfectParriesRef.current,
          totalParries: totalParriesRef.current,
          maxCombo: maxComboRef.current,
          survivalTime: Math.floor(gameTimeRef.current),
          rngSeed: rngSeedRef.current
        }
      }).catch(err => console.error('Audit log failed:', err));
      
      onGameCompleteRef.current({
        score: finalScore,
        accuracy: accuracy,
        avgReactionTime: totalParriesRef.current > 0 
          ? Math.round(duration * 1000 / totalParriesRef.current)
          : 0
      });
    };
    
    animate(0);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      initializedRef.current = false;
    };
  }, [createSword, createEnemy]);
  
  // Input handlers
  const handleInput = useCallback((e: React.MouseEvent | React.TouchEvent | React.KeyboardEvent) => {
    e.preventDefault();
    handleParry();
  }, [handleParry]);
  
  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyP' || e.code === 'KeyX') {
        e.preventDefault();
        handleParry();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleParry]);
  
  return (
    <div 
      className="fixed inset-0 w-full h-full bg-black overflow-hidden"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* Game canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onClick={handleInput}
        onTouchStart={handleInput}
      />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-3xl ${i < hearts ? 'text-red-500' : 'text-gray-700'}`}>
                  ❤️
                </span>
              ))}
            </div>
            <div className="text-center">
              <div className="text-yellow-400 text-4xl font-bold" style={{ textShadow: '0 0 10px rgba(255, 200, 0, 0.5)' }}>
                {score}
              </div>
              <div className="text-gray-400 text-sm">⏱️ {timeElapsed}s</div>
            </div>
            <div className="text-right">
              {combo > 0 && (
                <div className="text-orange-400 text-2xl font-bold animate-pulse">
                  {combo}x COMBO
                </div>
              )}
            </div>
          </div>
          
          {/* Parry feedback */}
          {parryFeedback !== 'none' && (
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
              <div className={`text-4xl sm:text-6xl font-black animate-bounce ${
                parryFeedback === 'perfect' ? 'text-yellow-400' :
                parryFeedback === 'good' ? 'text-green-400' :
                'text-red-500'
              }`} style={{ textShadow: '0 0 20px currentColor' }}>
                {parryFeedback === 'perfect' ? '⚔️ PERFECT!' :
                 parryFeedback === 'good' ? '✓ PARRIED!' :
                 '💔 HIT!'}
              </div>
            </div>
          )}
          
          {/* Bottom parry button area */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
            <div className="text-center">
              <div className="text-white text-xl font-bold mb-2 opacity-50">
                {isMobile ? '👆 TAP TO PARRY' : '⎵ SPACE TO PARRY'}
              </div>
              <div className="w-32 h-32 rounded-full border-4 border-white/30 flex items-center justify-center">
                <div className="text-5xl">⚔️</div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full">
            <div className="text-7xl mb-4">⚔️</div>
            <h1 className="text-4xl sm:text-5xl font-bold text-red-500 mb-4" style={{ textShadow: '0 0 20px rgba(255, 0, 0, 0.5)' }}>
              PARRY PRO
            </h1>
            <p className="text-gray-400 mb-6">Master the art of the perfect parry!</p>
            
            <div className="bg-gray-900/80 rounded-xl p-4 mb-6 text-left border border-red-500/30">
              <p className="text-red-400 font-bold mb-2">⚔️ HOW TO PLAY:</p>
              <p className="text-gray-300 text-sm mb-2">• Watch the enemy's sword wind up</p>
              <p className="text-gray-300 text-sm mb-2">• {isMobile ? 'TAP' : 'Press SPACE'} at the right moment to parry</p>
              <p className="text-gray-300 text-sm mb-2">• Perfect timing = PERFECT parry (more points!)</p>
              <p className="text-gray-300 text-sm mb-2">• After 10 seconds, a 2nd enemy appears!</p>
              <p className="text-gray-300 text-sm">• Survive as long as possible!</p>
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-5 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold text-2xl rounded-xl shadow-lg border-b-4 border-red-900 active:scale-95 transition-transform"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              ⚔️ FIGHT!
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full mt-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl p-6 border-2 border-red-500/50">
            <div className="text-5xl mb-2">💀</div>
            <h1 className="text-3xl font-bold text-red-500 mb-4">DEFEATED</h1>
            
            <div className="bg-black/50 rounded-xl p-4 mb-4">
              <div className="text-4xl font-bold text-yellow-400 mb-2">{score}</div>
              <div className="text-gray-400">FINAL SCORE</div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <div className="text-gray-500">Survival Time</div>
                  <div className="text-white font-bold">{timeElapsed}s</div>
                </div>
                <div>
                  <div className="text-gray-500">Max Combo</div>
                  <div className="text-orange-400 font-bold">{maxComboRef.current}x</div>
                </div>
                <div>
                  <div className="text-gray-500">Perfect Parries</div>
                  <div className="text-yellow-400 font-bold">{perfectParriesRef.current}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Parries</div>
                  <div className="text-white font-bold">{totalParriesRef.current}</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-4 bg-gradient-to-b from-green-600 to-green-800 text-white font-bold text-xl rounded-xl border-b-4 border-green-900 active:scale-95 transition-transform mb-3"
            >
              🔄 TRY AGAIN
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl"
              >
                ← Back to Games
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

