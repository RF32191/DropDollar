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
  const cloudsRef = useRef<THREE.Mesh[]>([]);
  const groundTilesRef = useRef<THREE.Mesh[]>([]);
  
  // Game state refs - Flappy Bird style physics
  const coinYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const obstaclesRef = useRef<HandObstacle[]>([]);
  const gameSpeedRef = useRef<number>(4); // Horizontal scroll speed
  const lastObstacleXRef = useRef<number>(8);
  const scoreRef = useRef<number>(0);
  const isAliveRef = useRef<boolean>(true);
  const gameStartTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('🪙 [FlippyCoin] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Flappy Bird style physics constants
  const GRAVITY = -35; // Stronger gravity for snappier feel
  const JUMP_VELOCITY = 9; // Instant upward velocity on tap
  const COIN_X = -4; // Coin's fixed X position (left side)
  const FLOOR_Y = -4.5;
  const CEILING_Y = 4.5;
  const OBSTACLE_GAP = 6; // Distance between obstacles
  const GAP_SIZE = 3.2; // Gap between hands
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Create 3D coin with better visuals
  const createCoin = useCallback(() => {
    const group = new THREE.Group();
    
    // Coin body - shiny gold
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
    
    // Coin rim - darker gold edge
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
    
    // Dollar sign embossed on coin
    const dollarGroup = new THREE.Group();
    
    // S curve
    const curvePoints = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = Math.sin(t * Math.PI * 2) * 0.15;
      const y = (t - 0.5) * 0.5;
      curvePoints.push(new THREE.Vector3(x, y, 0.07));
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
    const dollarMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,
      emissive: 0x4A2500,
      emissiveIntensity: 0.3,
    });
    const sCurve = new THREE.Mesh(tubeGeometry, dollarMaterial);
    dollarGroup.add(sCurve);
    
    // Vertical lines through dollar sign
    const lineGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8);
    const line = new THREE.Mesh(lineGeometry, dollarMaterial);
    line.position.z = 0.07;
    dollarGroup.add(line);
    
    group.add(dollarGroup);
    
    // Glow effect
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
  
  // Create 3D hand obstacle (improved visuals)
  const createHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    // Skin material
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
    palm.castShadow = true;
    group.add(palm);
    
    // Fingers - 4 fingers reaching out
    const fingerXPositions = [-0.6, -0.2, 0.2, 0.6];
    fingerXPositions.forEach((xPos, i) => {
      const fingerLength = 1.2 + (i === 1 || i === 2 ? 0.25 : 0);
      
      // Main finger segment
      const fingerGeometry = new THREE.CapsuleGeometry(0.18, fingerLength, 8, 16);
      const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
      finger.position.x = xPos;
      finger.position.y = isTop ? -2.8 - fingerLength/2 : 2.8 + fingerLength/2;
      finger.castShadow = true;
      group.add(finger);
      
      // Fingernail
      const nailGeometry = new THREE.BoxGeometry(0.12, 0.15, 0.08);
      const nailMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFE4E1,
        shininess: 80,
      });
      const nail = new THREE.Mesh(nailGeometry, nailMaterial);
      nail.position.x = xPos;
      nail.position.y = isTop ? -2.8 - fingerLength - 0.1 : 2.8 + fingerLength + 0.1;
      nail.position.z = 0.25;
      group.add(nail);
    });
    
    // Thumb sticking out
    const thumbGeometry = new THREE.CapsuleGeometry(0.22, 0.9, 8, 16);
    const thumb = new THREE.Mesh(thumbGeometry, skinMaterial);
    thumb.position.x = isTop ? 1.1 : -1.1;
    thumb.position.y = isTop ? -1 : 1;
    thumb.rotation.z = isTop ? -0.8 : 0.8;
    thumb.castShadow = true;
    group.add(thumb);
    
    // Wrist
    const wristGeometry = new THREE.BoxGeometry(1.6, 1.5, 0.5);
    const wrist = new THREE.Mesh(wristGeometry, skinMaterial);
    wrist.position.y = isTop ? 0.5 : -0.5;
    group.add(wrist);
    
    // Sleeve cuff
    const cuffGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.7);
    const cuffMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      emissive: 0x0a0a15,
      shininess: 30,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.y = isTop ? 1.4 : -1.4;
    group.add(cuff);
    
    // Extended arm/pipe
    const armGeometry = new THREE.BoxGeometry(1.6, 10, 0.5);
    const armMaterial = new THREE.MeshPhongMaterial({
      color: 0xD4A574,
      emissive: 0x5B3413,
      emissiveIntensity: 0.1,
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.y = isTop ? 7 : -7;
    arm.castShadow = true;
    group.add(arm);
    
    return group;
  }, []);
  
  // Create cloud
  const createCloud = useCallback(() => {
    const group = new THREE.Group();
    const cloudMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      emissive: 0xDDDDFF,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    
    // Multiple spheres for fluffy cloud
    const positions = [
      { x: 0, y: 0, z: 0, r: 0.6 },
      { x: 0.5, y: 0.1, z: 0, r: 0.5 },
      { x: -0.5, y: 0.1, z: 0, r: 0.5 },
      { x: 0.3, y: 0.3, z: 0, r: 0.4 },
      { x: -0.3, y: 0.3, z: 0, r: 0.4 },
    ];
    
    positions.forEach(pos => {
      const sphereGeometry = new THREE.SphereGeometry(pos.r, 16, 16);
      const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
      sphere.position.set(pos.x, pos.y, pos.z);
      group.add(sphere);
    });
    
    return group;
  }, []);
  
  // Handle jump/tap - Flappy Bird style instant velocity
  const handleJump = useCallback(() => {
    if (gameStateRef.current === 'waiting') {
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      velocityRef.current = JUMP_VELOCITY;
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      // Instant velocity set (not additive) - like Flappy Bird
      velocityRef.current = JUMP_VELOCITY;
    }
  }, []);
  
  // End game function
  const endGame = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    
    gameStateRef.current = 'complete';
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
    }).catch(err => console.error('❌ [FlippyCoin] Audit log failed:', err));
    
    onGameComplete({
      score: scoreRef.current,
      accuracy: accuracy,
      avgReactionTime: Math.round(duration * 1000 / Math.max(1, scoreRef.current))
    });
  }, [highScore, gameMode, rngSeed, onGameComplete]);
  
  // Initialize game
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Beautiful gradient sky background
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
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y * 0.8 + 0.2), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.z = -15;
    scene.add(sky);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xFFFFCC, 1);
    sunLight.position.set(10, 15, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);
    
    // Create coin
    const coin = createCoin();
    coin.position.x = COIN_X;
    coin.position.y = 0;
    scene.add(coin);
    coinRef.current = coin;
    coinYRef.current = 0;
    
    // Create clouds in background
    for (let i = 0; i < 6; i++) {
      const cloud = createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 20,
        2 + Math.random() * 3,
        -5 - Math.random() * 5
      );
      cloud.scale.setScalar(0.8 + Math.random() * 0.6);
      scene.add(cloud);
      cloudsRef.current.push(cloud as unknown as THREE.Mesh);
    }
    
    // Ground with grass texture look
    const groundGeometry = new THREE.PlaneGeometry(50, 2);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x228B22,
      emissive: 0x0A4A0A,
      emissiveIntensity: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = FLOOR_Y - 0.5;
    ground.position.z = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Ground detail layer (dirt)
    const dirtGeometry = new THREE.PlaneGeometry(50, 1);
    const dirtMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513,
      emissive: 0x3A1A05,
    });
    const dirt = new THREE.Mesh(dirtGeometry, dirtMaterial);
    dirt.position.y = FLOOR_Y - 1.2;
    dirt.position.z = 0;
    scene.add(dirt);
    
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
      
      const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      
      if (!coinRef.current || !sceneRef.current) return;
      
      // Coin always spinning
      coinRef.current.rotation.y += deltaTime * 4;
      
      // Glow pulsing
      const glow = coinRef.current.getObjectByName('glow') as THREE.Mesh;
      if (glow) {
        (glow.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(time / 200) * 0.08;
      }
      
      // Move clouds slowly
      cloudsRef.current.forEach((cloud, i) => {
        cloud.position.x -= deltaTime * 0.3;
        if (cloud.position.x < -15) {
          cloud.position.x = 15;
          cloud.position.y = 2 + Math.random() * 3;
        }
      });
      
      if (gameStateRef.current === 'playing' && isAliveRef.current) {
        // Apply gravity - Flappy Bird style
        velocityRef.current += GRAVITY * deltaTime;
        coinYRef.current += velocityRef.current * deltaTime;
        
        // Clamp and check floor/ceiling
        if (coinYRef.current <= FLOOR_Y) {
          coinYRef.current = FLOOR_Y;
          isAliveRef.current = false;
          endGame();
          return;
        }
        if (coinYRef.current >= CEILING_Y) {
          coinYRef.current = CEILING_Y;
          velocityRef.current = -1; // Bounce off ceiling slightly
        }
        
        coinRef.current.position.y = coinYRef.current;
        
        // Tilt coin based on velocity (like Flappy Bird's bird rotation)
        const targetRotation = Math.max(-0.8, Math.min(0.5, velocityRef.current * 0.08));
        coinRef.current.rotation.z = targetRotation;
        
        // Spawn obstacles
        const rightmostX = obstaclesRef.current.length > 0 
          ? Math.max(...obstaclesRef.current.map(o => o.x))
          : COIN_X;
          
        if (rightmostX < 12) {
          const newX = rightmostX + OBSTACLE_GAP;
          const gapY = (seededRng.next() - 0.5) * 4; // Random gap position
          
          const topHand = createHand(true);
          const bottomHand = createHand(false);
          
          // Position hands with gap between them
          topHand.position.set(newX, gapY + GAP_SIZE/2 + 4, 0);
          bottomHand.position.set(newX, gapY - GAP_SIZE/2 - 4, 0);
          
          // Rotate hands to face inward (grabbing)
          topHand.rotation.z = Math.PI;
          bottomHand.rotation.z = 0;
          
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
        
        // Move obstacles and check collisions
        const toRemove: number[] = [];
        obstaclesRef.current.forEach((obs, index) => {
          obs.x -= gameSpeedRef.current * deltaTime;
          obs.topMesh.position.x = obs.x;
          obs.bottomMesh.position.x = obs.x;
          
          // Score when passing obstacle
          if (!obs.passed && obs.x < COIN_X - 0.5) {
            obs.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
          
          // Collision detection - check if coin is within obstacle X range
          if (Math.abs(obs.x - COIN_X) < 1.0) {
            const coinY = coinYRef.current;
            const topEdge = obs.gapY + obs.gapSize / 2;
            const bottomEdge = obs.gapY - obs.gapSize / 2;
            
            // Hit top hand or bottom hand
            if (coinY + 0.5 > topEdge || coinY - 0.5 < bottomEdge) {
              isAliveRef.current = false;
              endGame();
              return;
            }
          }
          
          // Remove off-screen obstacles
          if (obs.x < -12) {
            toRemove.push(index);
            scene.remove(obs.topMesh);
            scene.remove(obs.bottomMesh);
          }
        });
        
        // Clean up old obstacles
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
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createCoin, createHand, createCloud, seededRng, endGame]);
  
  // Start game
  const startGame = useCallback(() => {
    gameStateRef.current = 'waiting';
    setGameState('waiting');
    scoreRef.current = 0;
    setScore(0);
    coinYRef.current = 0;
    velocityRef.current = 0;
    gameSpeedRef.current = 4;
    isAliveRef.current = true;
    lastObstacleXRef.current = 8;
    
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
      coinRef.current.rotation.z = 0;
    }
  }, []);
  
  return (
    <div 
      className="fixed inset-0 w-full h-full bg-black overflow-hidden touch-none select-none"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      onClick={handleJump}
      onTouchStart={(e) => {
        e.preventDefault();
        handleJump();
      }}
    >
      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      
      {/* Score Display */}
      {(gameState === 'playing' || gameState === 'waiting') && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="text-white text-6xl sm:text-8xl font-bold" 
               style={{ 
                 textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
                 fontFamily: 'system-ui, -apple-system, sans-serif'
               }}>
            {score}
          </div>
        </div>
      )}
      
      {/* Tap to Start instruction */}
      {gameState === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-white text-3xl sm:text-4xl font-bold mb-4"
                 style={{ textShadow: '2px 2px 0 #000' }}>
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
            {/* Title */}
            <div className="mb-6">
              <div className="text-7xl sm:text-8xl mb-2">🪙</div>
              <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2"
                  style={{ textShadow: '3px 3px 0 #000, -1px -1px 0 #000' }}>
                FLIPPY COIN
              </h1>
              <p className="text-white/90 text-lg" style={{ textShadow: '1px 1px 0 #000' }}>
                Tap to flip through the hands!
              </p>
            </div>
            
            {/* Instructions */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/30">
              <div className="space-y-2 text-left text-white">
                <p className="flex items-center gap-2">
                  <span className="text-2xl">👆</span>
                  <span><strong>TAP</strong> to fly up</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-2xl">🤚</span>
                  <span>Avoid the <strong>grabbing hands</strong></span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span>Pass through gaps to <strong>score</strong></span>
                </p>
              </div>
            </div>
            
            {highScore > 0 && (
              <div className="mb-4 text-yellow-300 text-xl font-bold"
                   style={{ textShadow: '1px 1px 0 #000' }}>
                🏆 Best: {highScore}
              </div>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="w-full px-8 py-5 bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-white font-bold text-2xl sm:text-3xl rounded-2xl transform hover:scale-105 transition-all shadow-lg border-b-4 border-green-700"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              PLAY
            </button>
            
            {onExit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExit();
                }}
                className="w-full mt-3 px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl border border-white/30"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full bg-gradient-to-b from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 border-4 border-amber-300 shadow-2xl">
            <div className="text-5xl mb-2">💀</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4"
                style={{ textShadow: '2px 2px 0 #000' }}>
              GAME OVER
            </h1>
            
            {/* Medal based on score */}
            <div className="mb-4">
              {score >= 40 && <div className="text-6xl">🏆</div>}
              {score >= 20 && score < 40 && <div className="text-6xl">🥇</div>}
              {score >= 10 && score < 20 && <div className="text-6xl">🥈</div>}
              {score >= 5 && score < 10 && <div className="text-6xl">🥉</div>}
              {score < 5 && <div className="text-6xl">🪙</div>}
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <div className="text-5xl sm:text-6xl font-bold text-white mb-1"
                   style={{ textShadow: '2px 2px 0 #000' }}>
                {score}
              </div>
              <div className="text-amber-200 text-lg">SCORE</div>
              
              {score >= highScore && score > 0 && (
                <div className="mt-3 text-yellow-300 font-bold text-lg animate-pulse">
                  ⭐ NEW BEST! ⭐
                </div>
              )}
              
              <div className="mt-3 text-amber-200">
                Best: <span className="text-white font-bold">{Math.max(score, highScore)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="w-full px-8 py-4 bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-white font-bold text-xl rounded-xl transform hover:scale-105 transition-all border-b-4 border-green-700"
                style={{ textShadow: '1px 1px 0 #000' }}
              >
                🔄 PLAY AGAIN
              </button>
              
              {onExit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExit();
                  }}
                  className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl border border-white/30"
                >
                  ← Back to Games
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
