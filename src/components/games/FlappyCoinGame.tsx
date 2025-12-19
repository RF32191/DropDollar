'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';

interface FlappyCoinGameProps {
  onGameComplete: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
}

// Seeded random number generator
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

interface HandObstacle {
  id: number;
  x: number;
  gapY: number;
  gapSize: number;
  passed: boolean;
  topMesh: THREE.Group;
  bottomMesh: THREE.Group;
}

export default function FlappyCoinGame({ onGameComplete, onExit, gameMode = 'practice', rngSeed }: FlappyCoinGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const cloudsRef = useRef<THREE.Group[]>([]);
  const initializedRef = useRef(false);
  
  // Game state refs
  const coinYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const obstaclesRef = useRef<HandObstacle[]>([]);
  const gameSpeedRef = useRef<number>(4);
  const scoreRef = useRef<number>(0);
  const isAliveRef = useRef<boolean>(true);
  const gameStartTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const highScoreRef = useRef<number>(0);
  
  // Store callbacks in refs to avoid stale closures
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
    console.log('🪙 [FlippyCoin] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const seededRngRef = useRef(seededRng);
  useEffect(() => {
    seededRngRef.current = seededRng;
  }, [seededRng]);
  
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // CoD-style floating score indicators
  const { popups, addPopup, removePopup } = useFloatingScores();
  const addPopupRef = useRef(addPopup);
  addPopupRef.current = addPopup;
  
  // Flappy Bird style physics constants
  const GRAVITY = -40;
  const JUMP_VELOCITY = 10;
  const COIN_X = -4;
  const FLOOR_Y = -4.5;
  const CEILING_Y = 4.5;
  const OBSTACLE_GAP = 5.5;
  const GAP_SIZE = 3.0;
  
  // Create 3D coin
  const createCoin = useCallback(() => {
    const group = new THREE.Group();
    
    const coinGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.12, 32);
    const coinMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFD700,
      emissive: 0xCC9900,
      emissiveIntensity: 0.4,
      shininess: 150,
      specular: 0xFFFFFF,
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    group.add(coin);
    
    const rimGeometry = new THREE.TorusGeometry(0.6, 0.04, 16, 32);
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0xB8860B,
      emissive: 0x8B6914,
      emissiveIntensity: 0.3,
      shininess: 100,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
    
    // Dollar sign
    const lineGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    const dollarMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,
      emissive: 0x4A2500,
    });
    const line = new THREE.Mesh(lineGeometry, dollarMaterial);
    line.position.z = 0.07;
    group.add(line);
    
    // Glow
    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    return group;
  }, []);
  
  // Create 3D hand
  const createHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    const skinMaterial = new THREE.MeshPhongMaterial({
      color: 0xE8C4A0,
      emissive: 0x6B4423,
      emissiveIntensity: 0.15,
      shininess: 20,
    });
    
    // Palm
    const palmGeometry = new THREE.BoxGeometry(1.8, 2.2, 0.6);
    const palm = new THREE.Mesh(palmGeometry, skinMaterial);
    palm.position.y = isTop ? -1.2 : 1.2;
    group.add(palm);
    
    // Fingers
    const fingerXPositions = [-0.6, -0.2, 0.2, 0.6];
    fingerXPositions.forEach((xPos, i) => {
      const fingerLength = 1.2 + (i === 1 || i === 2 ? 0.25 : 0);
      const fingerGeometry = new THREE.CapsuleGeometry(0.18, fingerLength, 8, 16);
      const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
      finger.position.x = xPos;
      finger.position.y = isTop ? -2.8 - fingerLength/2 : 2.8 + fingerLength/2;
      group.add(finger);
    });
    
    // Thumb
    const thumbGeometry = new THREE.CapsuleGeometry(0.22, 0.9, 8, 16);
    const thumb = new THREE.Mesh(thumbGeometry, skinMaterial);
    thumb.position.x = isTop ? 1.1 : -1.1;
    thumb.position.y = isTop ? -1 : 1;
    thumb.rotation.z = isTop ? -0.8 : 0.8;
    group.add(thumb);
    
    // Wrist/Arm extension
    const armGeometry = new THREE.BoxGeometry(1.6, 12, 0.5);
    const armMaterial = new THREE.MeshPhongMaterial({
      color: 0xD4A574,
      emissive: 0x5B3413,
      emissiveIntensity: 0.1,
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.y = isTop ? 6.5 : -6.5;
    group.add(arm);
    
    // Sleeve
    const cuffGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.7);
    const cuffMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      shininess: 30,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.y = isTop ? 1.0 : -1.0;
    group.add(cuff);
    
    return group;
  }, []);
  
  // Handle jump
  const handleJump = useCallback(() => {
    console.log('🪙 Jump! State:', gameStateRef.current);
    
    if (gameStateRef.current === 'waiting') {
      console.log('🪙 Starting game from waiting state');
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      velocityRef.current = JUMP_VELOCITY;
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      velocityRef.current = JUMP_VELOCITY;
    }
  }, []);
  
  // Start game (from ready to waiting)
  const startGame = useCallback(() => {
    console.log('🪙 Starting game - going to waiting state');
    gameStateRef.current = 'waiting';
    setGameState('waiting');
    scoreRef.current = 0;
    setScore(0);
    coinYRef.current = 0;
    velocityRef.current = 0;
    gameSpeedRef.current = 4;
    isAliveRef.current = true;
    
    // Clear obstacles
    obstaclesRef.current.forEach(obs => {
      if (sceneRef.current) {
        sceneRef.current.remove(obs.topMesh);
        sceneRef.current.remove(obs.bottomMesh);
      }
    });
    obstaclesRef.current = [];
    
    // Reset coin
    if (coinRef.current) {
      coinRef.current.position.y = 0;
      coinRef.current.rotation.z = 0;
    }
  }, []);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Sky gradient
    const skyGeometry = new THREE.PlaneGeometry(100, 100);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1e90ff) },
        bottomColor: { value: new THREE.Color(0x87CEEB) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.z = -15;
    scene.add(sky);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xFFFFCC, 1);
    sunLight.position.set(10, 15, 10);
    scene.add(sunLight);
    
    // Coin
    const coin = createCoin();
    coin.position.x = COIN_X;
    coin.position.y = 0;
    scene.add(coin);
    coinRef.current = coin;
    
    // Clouds
    for (let i = 0; i < 5; i++) {
      const cloudGroup = new THREE.Group();
      const cloudMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.85,
      });
      
      for (let j = 0; j < 4; j++) {
        const sphereGeometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 12, 12);
        const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
        sphere.position.set((j - 1.5) * 0.4, Math.random() * 0.2, 0);
        cloudGroup.add(sphere);
      }
      
      cloudGroup.position.set(-10 + i * 5, 3 + Math.random() * 2, -5);
      cloudGroup.scale.setScalar(0.8 + Math.random() * 0.5);
      scene.add(cloudGroup);
      cloudsRef.current.push(cloudGroup);
    }
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 2);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = FLOOR_Y - 0.5;
    scene.add(ground);
    
    // Dirt layer
    const dirtGeometry = new THREE.PlaneGeometry(50, 1);
    const dirtMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const dirt = new THREE.Mesh(dirtGeometry, dirtMaterial);
    dirt.position.y = FLOOR_Y - 1.2;
    scene.add(dirt);
    
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
      
      if (!coinRef.current || !sceneRef.current) return;
      
      // Coin spinning
      coinRef.current.rotation.y += deltaTime * 4;
      
      // Glow pulse
      const glow = coinRef.current.getObjectByName('glow') as THREE.Mesh;
      if (glow && glow.material) {
        (glow.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(time / 200) * 0.08;
      }
      
      // Move clouds
      cloudsRef.current.forEach((cloud) => {
        cloud.position.x -= deltaTime * 0.5;
        if (cloud.position.x < -15) {
          cloud.position.x = 15;
        }
      });
      
      // Game physics when playing
      if (gameStateRef.current === 'playing' && isAliveRef.current) {
        // Gravity
        velocityRef.current += GRAVITY * deltaTime;
        coinYRef.current += velocityRef.current * deltaTime;
        
        // Floor collision
        if (coinYRef.current <= FLOOR_Y) {
          coinYRef.current = FLOOR_Y;
          isAliveRef.current = false;
          
          // End game
          gameStateRef.current = 'complete';
          setGameState('complete');
          
          const duration = (Date.now() - gameStartTimeRef.current) / 1000;
          const finalScore = scoreRef.current;
          const accuracy = Math.min(100, finalScore * 10);
          
          if (finalScore > highScoreRef.current) {
            highScoreRef.current = finalScore;
            setHighScore(finalScore);
          }
          
          logGameCompletion({
            gameType: 'flippy_coin',
            gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
            score: finalScore,
            accuracy: accuracy,
            durationSeconds: Math.round(duration),
            additionalData: { obstaclesPassed: finalScore, rngSeed: rngSeedRef.current }
          }).catch(err => console.error('Audit log failed:', err));
          
          onGameCompleteRef.current({
            score: finalScore,
            accuracy: accuracy,
            avgReactionTime: Math.round(duration * 1000 / Math.max(1, finalScore))
          });
          
          return;
        }
        
        // Ceiling
        if (coinYRef.current >= CEILING_Y) {
          coinYRef.current = CEILING_Y;
          velocityRef.current = -2;
        }
        
        coinRef.current.position.y = coinYRef.current;
        
        // Tilt based on velocity
        coinRef.current.rotation.z = Math.max(-0.8, Math.min(0.5, velocityRef.current * 0.06));
        
        // Spawn obstacles
        const rightmostX = obstaclesRef.current.length > 0 
          ? Math.max(...obstaclesRef.current.map(o => o.x))
          : COIN_X + 6;
          
        if (rightmostX < 14) {
          const newX = rightmostX + OBSTACLE_GAP;
          const gapY = (seededRngRef.current.next() - 0.5) * 4;
          
          const topHand = createHand(true);
          const bottomHand = createHand(false);
          
          topHand.position.set(newX, gapY + GAP_SIZE/2 + 4.5, 0);
          bottomHand.position.set(newX, gapY - GAP_SIZE/2 - 4.5, 0);
          topHand.rotation.z = Math.PI;
          
          scene.add(topHand);
          scene.add(bottomHand);
          
          obstaclesRef.current.push({
            id: Date.now() + Math.random(),
            x: newX,
            gapY,
            gapSize: GAP_SIZE,
            passed: false,
            topMesh: topHand,
            bottomMesh: bottomHand,
          });
        }
        
        // Move and check obstacles
        const toRemove: number[] = [];
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obs = obstaclesRef.current[i];
          obs.x -= gameSpeedRef.current * deltaTime;
          obs.topMesh.position.x = obs.x;
          obs.bottomMesh.position.x = obs.x;
          
          // Score
          if (!obs.passed && obs.x < COIN_X - 0.5) {
            obs.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            
            // CoD-style floating score popup
            const popupType = scoreRef.current >= 20 ? 'perfect' : scoreRef.current >= 10 ? 'combo' : scoreRef.current >= 5 ? 'bonus' : 'normal';
            const label = scoreRef.current % 10 === 0 ? 'MILESTONE!' : scoreRef.current % 5 === 0 ? 'STREAK!' : 'PASS';
            addPopupRef.current(1, 50, 40, popupType, label);
          }
          
          // Collision
          if (Math.abs(obs.x - COIN_X) < 1.0) {
            const coinY = coinYRef.current;
            const topEdge = obs.gapY + obs.gapSize / 2;
            const bottomEdge = obs.gapY - obs.gapSize / 2;
            
            if (coinY + 0.5 > topEdge || coinY - 0.5 < bottomEdge) {
              isAliveRef.current = false;
              
              gameStateRef.current = 'complete';
              setGameState('complete');
              
              const duration = (Date.now() - gameStartTimeRef.current) / 1000;
              const finalScore = scoreRef.current;
              const accuracy = Math.min(100, finalScore * 10);
              
              if (finalScore > highScoreRef.current) {
                highScoreRef.current = finalScore;
                setHighScore(finalScore);
              }
              
              logGameCompletion({
                gameType: 'flippy_coin',
                gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
                score: finalScore,
                accuracy: accuracy,
                durationSeconds: Math.round(duration),
                additionalData: { obstaclesPassed: finalScore, rngSeed: rngSeedRef.current }
              }).catch(err => console.error('Audit log failed:', err));
              
              onGameCompleteRef.current({
                score: finalScore,
                accuracy: accuracy,
                avgReactionTime: Math.round(duration * 1000 / Math.max(1, finalScore))
              });
              
              return;
            }
          }
          
          // Remove off-screen
          if (obs.x < -12) {
            toRemove.push(i);
            scene.remove(obs.topMesh);
            scene.remove(obs.bottomMesh);
          }
        }
        
        toRemove.reverse().forEach(i => {
          obstaclesRef.current.splice(i, 1);
        });
      }
      
      renderer.render(scene, camera);
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
  }, [createCoin, createHand]);
  
  // Click/touch handler for the whole screen
  const handleScreenTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't handle if ready state (buttons will handle)
    if (gameStateRef.current === 'ready' || gameStateRef.current === 'complete') {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    handleJump();
  }, [handleJump]);
  
  return (
    <div 
      className="fixed inset-0 w-full h-full bg-sky-400 overflow-hidden"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* CoD-style floating score popups */}
      {gameState === 'playing' && <FloatingScore popups={popups} onRemove={removePopup} />}
      
      {/* Game canvas - clickable during gameplay */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onClick={handleScreenTap}
        onTouchStart={handleScreenTap}
      />
      
      {/* Score Display */}
      {(gameState === 'playing' || gameState === 'waiting') && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="text-white text-6xl sm:text-8xl font-bold" 
               style={{ textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
            {score}
          </div>
        </div>
      )}
      
      {/* Tap to Start */}
      {gameState === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-white text-3xl sm:text-4xl font-bold mb-4" style={{ textShadow: '2px 2px 0 #000' }}>
              TAP TO FLY!
            </div>
            <div className="text-6xl">👆</div>
          </div>
        </div>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-600 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full">
            <div className="mb-6">
              <div className="text-7xl sm:text-8xl mb-2">🪙</div>
              <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2" style={{ textShadow: '3px 3px 0 #000' }}>
                FLIPPY COIN
              </h1>
              <p className="text-white/90 text-lg" style={{ textShadow: '1px 1px 0 #000' }}>
                Tap to flip through the hands!
              </p>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/30">
              <div className="space-y-2 text-left text-white">
                <p className="flex items-center gap-2"><span className="text-2xl">👆</span><span><strong>TAP</strong> to fly up</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">🤚</span><span>Avoid <strong>grabbing hands</strong></span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">🎯</span><span>Pass through gaps to <strong>score</strong></span></p>
              </div>
            </div>
            
            {highScore > 0 && (
              <div className="mb-4 text-yellow-300 text-xl font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                🏆 Best: {highScore}
              </div>
            )}
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-5 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold text-2xl sm:text-3xl rounded-2xl shadow-lg border-b-4 border-green-700 active:scale-95 transition-transform"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              PLAY
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full mt-3 px-6 py-3 bg-white/20 text-white font-bold rounded-xl border border-white/30"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full bg-gradient-to-b from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 border-4 border-amber-300">
            <div className="text-5xl mb-2">💀</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ textShadow: '2px 2px 0 #000' }}>
              GAME OVER
            </h1>
            
            <div className="mb-4">
              {score >= 40 && <div className="text-6xl">🏆</div>}
              {score >= 20 && score < 40 && <div className="text-6xl">🥇</div>}
              {score >= 10 && score < 20 && <div className="text-6xl">🥈</div>}
              {score >= 5 && score < 10 && <div className="text-6xl">🥉</div>}
              {score < 5 && <div className="text-6xl">🪙</div>}
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <div className="text-5xl sm:text-6xl font-bold text-white mb-1" style={{ textShadow: '2px 2px 0 #000' }}>
                {score}
              </div>
              <div className="text-amber-200 text-lg">SCORE</div>
              
              {score >= highScore && score > 0 && (
                <div className="mt-3 text-yellow-300 font-bold text-lg animate-pulse">⭐ NEW BEST! ⭐</div>
              )}
              
              <div className="mt-3 text-amber-200">Best: <span className="text-white font-bold">{Math.max(score, highScore)}</span></div>
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-4 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold text-xl rounded-xl border-b-4 border-green-700 active:scale-95 transition-transform mb-3"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              🔄 PLAY AGAIN
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full px-6 py-3 bg-white/20 text-white font-bold rounded-xl border border-white/30"
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
