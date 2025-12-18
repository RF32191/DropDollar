'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

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
  gapY: number; // Center of the gap
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
  
  // Game state refs
  const coinYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const rotationSpeedRef = useRef<number>(0);
  const flipRotationRef = useRef<number>(0);
  const obstaclesRef = useRef<HandObstacle[]>([]);
  const gameSpeedRef = useRef<number>(3);
  const lastObstacleTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const isAliveRef = useRef<boolean>(true);
  const gameStartTimeRef = useRef<number>(0);
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('🪙 [FlappyCoin] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Physics constants
  const GRAVITY = -25;
  const JUMP_FORCE = 10;
  const COIN_X = -3; // Coin's fixed X position
  const FLOOR_Y = -5;
  const CEILING_Y = 5;
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Create 3D coin
  const createCoin = useCallback(() => {
    const group = new THREE.Group();
    
    // Coin body - gold cylinder
    const coinGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.15, 32);
    const coinMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFD700,
      emissive: 0x996600,
      emissiveIntensity: 0.3,
      shininess: 100,
      specular: 0xFFFFFF,
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    group.add(coin);
    
    // Coin edge rim
    const rimGeometry = new THREE.TorusGeometry(0.8, 0.05, 16, 32);
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0xDAA520,
      emissive: 0x8B6914,
      emissiveIntensity: 0.2,
      shininess: 80,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
    
    // Dollar sign on front
    const dollarShape = new THREE.Shape();
    // S curve of dollar sign
    dollarShape.moveTo(0.15, 0.3);
    dollarShape.bezierCurveTo(0.3, 0.3, 0.3, 0.15, 0.15, 0.1);
    dollarShape.bezierCurveTo(0, 0.05, -0.15, 0, -0.15, -0.1);
    dollarShape.bezierCurveTo(-0.15, -0.2, 0, -0.3, 0.15, -0.3);
    
    const dollarGeometry = new THREE.ExtrudeGeometry(dollarShape, {
      depth: 0.02,
      bevelEnabled: false,
    });
    const dollarMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,
      emissive: 0x4A2500,
    });
    const dollarSign = new THREE.Mesh(dollarGeometry, dollarMaterial);
    dollarSign.position.z = 0.09;
    dollarSign.scale.set(1.2, 1.2, 1);
    group.add(dollarSign);
    
    // Vertical line through dollar sign
    const lineGeometry = new THREE.BoxGeometry(0.05, 0.7, 0.02);
    const line = new THREE.Mesh(lineGeometry, dollarMaterial);
    line.position.z = 0.09;
    group.add(line);
    
    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(1.0, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    // Point light for coin
    const coinLight = new THREE.PointLight(0xFFD700, 1, 5);
    coinLight.position.set(0, 0, 1);
    group.add(coinLight);
    
    return group;
  }, []);
  
  // Create 3D hand obstacle
  const createHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    // Hand palm
    const palmGeometry = new THREE.BoxGeometry(1.5, 2, 0.4);
    const skinMaterial = new THREE.MeshPhongMaterial({
      color: 0xE0B090,
      emissive: 0x6B4423,
      emissiveIntensity: 0.1,
      shininess: 30,
    });
    const palm = new THREE.Mesh(palmGeometry, skinMaterial);
    palm.position.y = isTop ? -1 : 1;
    group.add(palm);
    
    // Fingers - 4 fingers
    const fingerPositions = [-0.5, -0.17, 0.17, 0.5];
    fingerPositions.forEach((xPos, i) => {
      const fingerLength = 1.0 + (i === 1 || i === 2 ? 0.3 : 0); // Middle fingers longer
      const fingerGeometry = new THREE.CapsuleGeometry(0.15, fingerLength, 8, 16);
      const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
      finger.position.x = xPos;
      finger.position.y = isTop ? -2.5 - fingerLength/2 : 2.5 + fingerLength/2;
      finger.position.z = 0;
      
      // Slight curve for fingers
      finger.rotation.z = (isTop ? 1 : -1) * (xPos * 0.15);
      
      group.add(finger);
      
      // Finger segments (knuckles)
      for (let j = 0; j < 2; j++) {
        const knuckleGeometry = new THREE.TorusGeometry(0.16, 0.02, 8, 16);
        const knuckleMaterial = new THREE.MeshPhongMaterial({
          color: 0xD0A080,
          emissive: 0x5B3413,
        });
        const knuckle = new THREE.Mesh(knuckleGeometry, knuckleMaterial);
        knuckle.position.x = xPos;
        knuckle.position.y = isTop 
          ? -2.3 - j * 0.4 - fingerLength/3
          : 2.3 + j * 0.4 + fingerLength/3;
        knuckle.rotation.x = Math.PI / 2;
        group.add(knuckle);
      }
    });
    
    // Thumb
    const thumbGeometry = new THREE.CapsuleGeometry(0.18, 0.8, 8, 16);
    const thumb = new THREE.Mesh(thumbGeometry, skinMaterial);
    thumb.position.x = isTop ? 0.9 : -0.9;
    thumb.position.y = isTop ? -0.8 : 0.8;
    thumb.rotation.z = isTop ? -0.7 : 0.7;
    group.add(thumb);
    
    // Wrist/arm extension
    const wristGeometry = new THREE.BoxGeometry(1.4, 3, 0.35);
    const wristMaterial = new THREE.MeshPhongMaterial({
      color: 0xC09070,
      emissive: 0x5B3413,
      emissiveIntensity: 0.1,
    });
    const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
    wrist.position.y = isTop ? 1 : -1;
    group.add(wrist);
    
    // Sleeve cuff
    const cuffGeometry = new THREE.BoxGeometry(1.6, 0.5, 0.5);
    const cuffMaterial = new THREE.MeshPhongMaterial({
      color: 0x2C3E50,
      emissive: 0x1A252F,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.y = isTop ? 2.3 : -2.3;
    group.add(cuff);
    
    // Extended arm (pipe part)
    const armExtGeometry = new THREE.BoxGeometry(1.5, 8, 0.4);
    const arm = new THREE.Mesh(armExtGeometry, wristMaterial);
    arm.position.y = isTop ? 6.5 : -6.5;
    group.add(arm);
    
    return group;
  }, []);
  
  // Handle jump/tap
  const handleJump = useCallback(() => {
    if (gameState === 'waiting') {
      // Start game on first tap
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      velocityRef.current = JUMP_FORCE;
      rotationSpeedRef.current = 8;
      flipRotationRef.current += Math.PI;
    } else if (gameState === 'playing' && isAliveRef.current) {
      velocityRef.current = JUMP_FORCE;
      rotationSpeedRef.current = 8;
      flipRotationRef.current += Math.PI; // Flip coin
    }
  }, [gameState]);
  
  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    sceneRef.current = scene;
    
    // Add gradient sky
    const skyGeometry = new THREE.PlaneGeometry(100, 100);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077FF) },
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
    sky.position.z = -20;
    scene.add(sky);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0xFFD700, 0.3);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);
    
    // Create coin
    const coin = createCoin();
    coin.position.x = COIN_X;
    coin.position.y = 0;
    scene.add(coin);
    coinRef.current = coin;
    coinYRef.current = 0;
    
    // Ground (green grass)
    const groundGeometry = new THREE.PlaneGeometry(50, 3);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x228B22,
      emissive: 0x0A3A0A,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = FLOOR_Y - 1;
    ground.position.z = -1;
    scene.add(ground);
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      
      if (!coinRef.current || !sceneRef.current) return;
      
      // Coin spinning animation (constant)
      coinRef.current.rotation.y += deltaTime * 3;
      
      // Coin glow pulsing
      const glow = coinRef.current.getObjectByName('glow') as THREE.Mesh;
      if (glow) {
        (glow.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(time / 200) * 0.1;
        glow.scale.setScalar(1 + Math.sin(time / 300) * 0.1);
      }
      
      if (gameState === 'playing' && isAliveRef.current) {
        // Apply gravity
        velocityRef.current += GRAVITY * deltaTime;
        coinYRef.current += velocityRef.current * deltaTime;
        
        // Flip rotation
        if (rotationSpeedRef.current > 0) {
          coinRef.current.rotation.x += rotationSpeedRef.current * deltaTime;
          rotationSpeedRef.current -= deltaTime * 10;
          if (rotationSpeedRef.current < 0) rotationSpeedRef.current = 0;
        }
        
        // Clamp position
        if (coinYRef.current <= FLOOR_Y) {
          coinYRef.current = FLOOR_Y;
          isAliveRef.current = false;
          endGame();
        }
        if (coinYRef.current >= CEILING_Y) {
          coinYRef.current = CEILING_Y;
          velocityRef.current = 0;
        }
        
        coinRef.current.position.y = coinYRef.current;
        
        // Tilt based on velocity
        coinRef.current.rotation.z = velocityRef.current * 0.03;
        
        // Spawn obstacles
        const now = Date.now();
        if (now - lastObstacleTimeRef.current > 2000) {
          lastObstacleTimeRef.current = now;
          
          const gapY = (seededRng.next() - 0.5) * 5;
          const gapSize = 3.5 - Math.min(scoreRef.current * 0.05, 1.5); // Gap shrinks with score
          
          const topHand = createHand(true);
          const bottomHand = createHand(false);
          
          const obstacleX = 15;
          
          topHand.position.set(obstacleX, gapY + gapSize/2 + 5, 0);
          bottomHand.position.set(obstacleX, gapY - gapSize/2 - 5, 0);
          
          scene.add(topHand);
          scene.add(bottomHand);
          
          obstaclesRef.current.push({
            id: now,
            x: obstacleX,
            gapY,
            gapSize,
            passed: false,
            topMesh: topHand,
            bottomMesh: bottomHand,
          });
        }
        
        // Move and check obstacles
        const toRemove: number[] = [];
        obstaclesRef.current.forEach((obs, index) => {
          obs.x -= gameSpeedRef.current * deltaTime;
          obs.topMesh.position.x = obs.x;
          obs.bottomMesh.position.x = obs.x;
          
          // Check if passed
          if (!obs.passed && obs.x < COIN_X) {
            obs.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            
            // Increase speed slightly
            gameSpeedRef.current = Math.min(8, 3 + scoreRef.current * 0.1);
          }
          
          // Check collision
          if (Math.abs(obs.x - COIN_X) < 1.2) {
            const coinY = coinYRef.current;
            const topEdge = obs.gapY + obs.gapSize / 2;
            const bottomEdge = obs.gapY - obs.gapSize / 2;
            
            if (coinY + 0.7 > topEdge || coinY - 0.7 < bottomEdge) {
              isAliveRef.current = false;
              endGame();
            }
          }
          
          // Remove off-screen obstacles
          if (obs.x < -15) {
            toRemove.push(index);
            scene.remove(obs.topMesh);
            scene.remove(obs.bottomMesh);
          }
        });
        
        // Remove old obstacles
        toRemove.reverse().forEach(i => {
          obstaclesRef.current.splice(i, 1);
        });
      }
      
      renderer.render(scene, camera);
    };
    
    const endGame = () => {
      setGameState('complete');
      
      const duration = (Date.now() - gameStartTimeRef.current) / 1000;
      const accuracy = Math.min(100, scoreRef.current * 10);
      
      if (scoreRef.current > highScore) {
        setHighScore(scoreRef.current);
      }
      
      // Log to audit
      logGameCompletion({
        gameType: 'flappy_coin',
        gameMode: gameMode === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: scoreRef.current,
        accuracy: accuracy,
        durationSeconds: Math.round(duration),
        additionalData: {
          obstaclesPassed: scoreRef.current,
          rngSeed: rngSeed
        }
      }).catch(err => console.error('❌ [FlappyCoin] Audit log failed:', err));
      
      onGameComplete({
        score: scoreRef.current,
        accuracy: accuracy,
        avgReactionTime: Math.round(duration * 1000 / Math.max(1, scoreRef.current))
      });
    };
    
    animate(0);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createCoin, createHand, gameState, seededRng, highScore, gameMode, rngSeed, onGameComplete]);
  
  // Start game
  const startGame = () => {
    setGameState('waiting');
    scoreRef.current = 0;
    setScore(0);
    coinYRef.current = 0;
    velocityRef.current = 0;
    rotationSpeedRef.current = 0;
    gameSpeedRef.current = 3;
    isAliveRef.current = true;
    lastObstacleTimeRef.current = Date.now();
    
    // Clear old obstacles
    obstaclesRef.current.forEach(obs => {
      if (sceneRef.current) {
        sceneRef.current.remove(obs.topMesh);
        sceneRef.current.remove(obs.bottomMesh);
      }
    });
    obstaclesRef.current = [];
    
    // Reset coin position
    if (coinRef.current) {
      coinRef.current.position.y = 0;
    }
  };
  
  return (
    <div 
      className="fixed inset-0 w-full h-full bg-black overflow-hidden touch-none select-none"
      onClick={handleJump}
      onTouchStart={(e) => {
        e.preventDefault();
        handleJump();
      }}
    >
      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      
      {/* HUD */}
      {(gameState === 'playing' || gameState === 'waiting') && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-4 border border-yellow-500/50">
            <div className="text-yellow-400 text-5xl sm:text-7xl font-bold text-center" style={{ textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}>
              {score}
            </div>
          </div>
        </div>
      )}
      
      {/* Tap instruction */}
      {gameState === 'waiting' && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-6 py-4 border-2 border-green-400 animate-pulse">
            <p className="text-green-400 text-xl sm:text-2xl font-bold text-center">
              👆 TAP TO FLY! 👆
            </p>
          </div>
        </div>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-lg w-full bg-gradient-to-br from-yellow-900/90 to-orange-900/90 rounded-3xl p-6 sm:p-8 border-2 border-yellow-500/50">
            <div className="text-6xl sm:text-7xl mb-4">🪙</div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              FLAPPY COIN
            </h1>
            
            <div className="space-y-3 text-left bg-black/40 rounded-xl p-4 mb-6 border border-yellow-500/30">
              <p className="text-yellow-300 font-bold text-lg">🎮 HOW TO PLAY:</p>
              <p className="text-gray-300 text-sm sm:text-base">• <span className="text-green-400 font-bold">TAP</span> anywhere to make the coin fly up</p>
              <p className="text-gray-300 text-sm sm:text-base">• Avoid the <span className="text-orange-400 font-bold">grabbing hands</span>! 🤚</p>
              <p className="text-gray-300 text-sm sm:text-base">• Pass through gaps to <span className="text-yellow-400 font-bold">score points</span></p>
              <p className="text-gray-300 text-sm sm:text-base">• Game speeds up as you progress!</p>
            </div>
            
            {highScore > 0 && (
              <div className="mb-4 text-yellow-400 text-lg">
                🏆 Best: <span className="font-bold">{highScore}</span>
              </div>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="w-full px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-xl sm:text-2xl rounded-xl transform hover:scale-105 transition-all shadow-lg"
            >
              🚀 START GAME
            </button>
            
            {onExit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
                className="w-full mt-3 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-lg w-full bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-3xl p-6 sm:p-8 border-2 border-yellow-500/50">
            <div className="text-6xl mb-4">{score > highScore ? '🏆' : '💀'}</div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-red-400">
              GAME OVER
            </h1>
            
            <div className="bg-black/40 rounded-xl p-6 mb-6">
              <div className="text-5xl sm:text-6xl font-bold text-yellow-400 mb-2">{score}</div>
              <div className="text-gray-400 text-lg">SCORE</div>
              
              {score >= highScore && score > 0 && (
                <div className="mt-4 text-green-400 font-bold animate-pulse">
                  🎉 NEW HIGH SCORE! 🎉
                </div>
              )}
              
              <div className="mt-4 text-gray-400">
                Best: <span className="text-yellow-400 font-bold">{Math.max(score, highScore)}</span>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold text-xl rounded-xl transform hover:scale-105 transition-all mb-3"
            >
              🔄 TRY AGAIN
            </button>
            
            {onExit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl"
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

