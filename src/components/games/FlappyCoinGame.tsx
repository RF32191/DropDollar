'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
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
  // Animation properties for staggered movement
  topPhase: number;
  bottomPhase: number;
  topBaseY: number;
  bottomBaseY: number;
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
  const handModelRef = useRef<THREE.Group | null>(null);
  const handLoadedRef = useRef(false);
  
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
  const flipRotationRef = useRef<number>(0); // For the flip animation on tap
  const targetFlipRef = useRef<number>(0); // Target flip rotation
  
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
  
  // Create beautiful 3D SILVER coin with detailed features
  const createCoin = useCallback(() => {
    const group = new THREE.Group();
    
    // Main coin body - SILVER with high metallic shine
    const coinGeometry = new THREE.CylinderGeometry(0.65, 0.65, 0.12, 64);
    const coinMaterial = new THREE.MeshPhongMaterial({
      color: 0xC0C0C0, // Silver base
      emissive: 0x404040,
      emissiveIntensity: 0.2,
      shininess: 200, // Very shiny
      specular: 0xFFFFFF,
      reflectivity: 1,
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    coin.name = 'coinBody';
    group.add(coin);
    
    // Outer rim - darker silver edge
    const rimGeometry = new THREE.TorusGeometry(0.65, 0.05, 16, 64);
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0x808080,
      emissive: 0x303030,
      emissiveIntensity: 0.2,
      shininess: 150,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
    
    // Inner decorative ring
    const innerRimGeometry = new THREE.TorusGeometry(0.5, 0.02, 16, 64);
    const innerRimMaterial = new THREE.MeshPhongMaterial({
      color: 0xA0A0A0,
      shininess: 180,
    });
    const innerRim = new THREE.Mesh(innerRimGeometry, innerRimMaterial);
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.z = 0.065;
    group.add(innerRim);
    
    // Dollar sign - etched look (front)
    const dollarGroup = new THREE.Group();
    dollarGroup.name = 'dollarSign';
    
    // S curve of dollar sign
    const sCurve = new THREE.Shape();
    sCurve.moveTo(0.12, 0.15);
    sCurve.bezierCurveTo(0.2, 0.15, 0.2, 0.05, 0.1, 0);
    sCurve.bezierCurveTo(0, -0.05, -0.2, -0.05, -0.12, 0);
    sCurve.bezierCurveTo(-0.2, 0.05, -0.2, 0.15, -0.1, 0.15);
    
    const sGeometry = new THREE.ExtrudeGeometry(sCurve, { depth: 0.02, bevelEnabled: false });
    const dollarMaterial = new THREE.MeshPhongMaterial({
      color: 0x606060,
      shininess: 100,
    });
    const sMesh = new THREE.Mesh(sGeometry, dollarMaterial);
    sMesh.position.z = 0.05;
    sMesh.rotation.z = Math.PI;
    dollarGroup.add(sMesh);
    
    // Vertical lines through S
    const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12);
    const line = new THREE.Mesh(lineGeometry, dollarMaterial);
    line.position.z = 0.07;
    dollarGroup.add(line);
    
    group.add(dollarGroup);
    
    // Back side dollar sign (mirrored)
    const backDollar = dollarGroup.clone();
    backDollar.rotation.y = Math.PI;
    backDollar.position.z = -0.14;
    group.add(backDollar);
    
    // Sparkle/shine effect glow
    const glowGeometry = new THREE.SphereGeometry(0.85, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.1,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    // Secondary glow ring
    const glowRingGeometry = new THREE.TorusGeometry(0.75, 0.1, 8, 32);
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xC0C0C0,
      transparent: true,
      opacity: 0.15,
    });
    const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.name = 'glowRing';
    group.add(glowRing);
    
    return group;
  }, []);
  
  // Create hand from loaded OBJ model
  const createHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    if (handModelRef.current) {
      // Clone the loaded hand model
      const handClone = handModelRef.current.clone();
      
      // Apply nice skin-toned material to all meshes
      const skinMaterial = new THREE.MeshPhongMaterial({
        color: 0xE8C4A0, // Natural skin tone
        emissive: 0x4A3020,
        emissiveIntensity: 0.15,
        shininess: 25,
        specular: 0x886655,
      });
      
      handClone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = skinMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Scale and position the hand appropriately
      handClone.scale.setScalar(0.015); // Adjust scale for game
      
      if (isTop) {
        // Top hand - fingers pointing down
        handClone.rotation.x = Math.PI; // Flip upside down
        handClone.rotation.z = Math.PI; // Rotate to face player
      } else {
        // Bottom hand - fingers pointing up
        handClone.rotation.z = Math.PI;
      }
      
      group.add(handClone);
    } else {
      // Fallback: simple placeholder if model not loaded
      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(2, 4, 0.5),
        new THREE.MeshPhongMaterial({ color: 0xE8C4A0 })
      );
      group.add(placeholder);
    }
    
    // Add arm extension behind the hand
    const armGeometry = new THREE.CylinderGeometry(0.8, 0.8, 8, 16);
    const armMaterial = new THREE.MeshPhongMaterial({
      color: 0xD4A574,
      emissive: 0x3A2718,
      emissiveIntensity: 0.1,
      shininess: 12,
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.y = isTop ? 6 : -6;
    group.add(arm);
    
    // Sleeve cuff
    const cuffGeometry = new THREE.CylinderGeometry(1.0, 0.9, 0.8, 16);
    const cuffMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      shininess: 40,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.y = isTop ? 2 : -2;
    group.add(cuff);
    
    return group;
  }, []);
  
  // Handle jump with dramatic flip animation
  const handleJump = useCallback(() => {
    console.log('🪙 Jump! State:', gameStateRef.current);
    
    if (gameStateRef.current === 'waiting') {
      console.log('🪙 Starting game from waiting state');
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      velocityRef.current = JUMP_VELOCITY;
      // Trigger flip animation - full 360° rotation
      targetFlipRef.current += Math.PI * 2;
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      velocityRef.current = JUMP_VELOCITY;
      // Trigger flip animation on each tap - 360° flip
      targetFlipRef.current += Math.PI * 2;
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
      coinRef.current.rotation.x = Math.PI / 2;
      coinRef.current.rotation.y = 0;
    }
    // Reset flip animation
    flipRotationRef.current = 0;
    targetFlipRef.current = 0;
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
    
    // Add fill light for hands
    const fillLight = new THREE.DirectionalLight(0xFFE4C4, 0.5);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);
    
    // Load hand OBJ model
    const objLoader = new OBJLoader();
    objLoader.load(
      '/hand.obj',
      (object) => {
        console.log('🖐️ [FlippyCoin] Hand model loaded successfully!');
        handModelRef.current = object;
        handLoadedRef.current = true;
      },
      (progress) => {
        console.log('🖐️ [FlippyCoin] Loading hand model...', Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.warn('🖐️ [FlippyCoin] Error loading hand model:', error);
        // Game will use fallback procedural hands
      }
    );
    
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
      
      // Smooth flip animation towards target
      const flipDiff = targetFlipRef.current - flipRotationRef.current;
      if (Math.abs(flipDiff) > 0.01) {
        // Smooth interpolation for flip - faster for snappy feel
        flipRotationRef.current += flipDiff * Math.min(1, deltaTime * 12);
      } else {
        flipRotationRef.current = targetFlipRef.current;
      }
      
      // Apply flip rotation (around X axis for proper coin flip)
      coinRef.current.rotation.x = Math.PI / 2 + flipRotationRef.current;
      
      // Also add continuous slow spin for shimmer effect
      coinRef.current.rotation.y += deltaTime * 0.5;
      
      // Glow pulse - more dynamic based on flip
      const glow = coinRef.current.getObjectByName('glow') as THREE.Mesh;
      if (glow && glow.material) {
        const flipSpeed = Math.abs(flipDiff);
        const baseOpacity = 0.1 + Math.sin(time / 200) * 0.05;
        const flipBoost = Math.min(0.3, flipSpeed * 0.1); // Brighter glow during flip
        (glow.material as THREE.MeshBasicMaterial).opacity = baseOpacity + flipBoost;
      }
      
      // Glow ring pulse
      const glowRing = coinRef.current.getObjectByName('glowRing') as THREE.Mesh;
      if (glowRing && glowRing.material) {
        const flipSpeed = Math.abs(flipDiff);
        (glowRing.material as THREE.MeshBasicMaterial).opacity = 0.1 + flipSpeed * 0.15;
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
          
          // Base positions for hands
          const topBaseY = gapY + GAP_SIZE/2 + 4.5;
          const bottomBaseY = gapY - GAP_SIZE/2 - 4.5;
          
          topHand.position.set(newX, topBaseY, 0);
          bottomHand.position.set(newX, bottomBaseY, 0);
          
          // Top hand rotated (fingers pointing down)
          topHand.rotation.z = Math.PI;
          
          scene.add(topHand);
          scene.add(bottomHand);
          
          // Random phase offset for staggered movement
          const topPhase = seededRngRef.current.next() * Math.PI * 2;
          const bottomPhase = topPhase + Math.PI; // Opposite phase for staggered effect
          
          obstaclesRef.current.push({
            id: Date.now() + Math.random(),
            x: newX,
            gapY,
            gapSize: GAP_SIZE,
            passed: false,
            topMesh: topHand,
            bottomMesh: bottomHand,
            topPhase,
            bottomPhase,
            topBaseY,
            bottomBaseY,
          });
        }
        
        // Move and check obstacles
        const toRemove: number[] = [];
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obs = obstaclesRef.current[i];
          obs.x -= gameSpeedRef.current * deltaTime;
          obs.topMesh.position.x = obs.x;
          obs.bottomMesh.position.x = obs.x;
          
          // Staggered up/down animation for hands
          const animSpeed = 1.5; // Speed of oscillation
          const animAmplitude = 0.4; // How far they move up/down
          const topOffset = Math.sin(time / 1000 * animSpeed + obs.topPhase) * animAmplitude;
          const bottomOffset = Math.sin(time / 1000 * animSpeed + obs.bottomPhase) * animAmplitude;
          
          obs.topMesh.position.y = obs.topBaseY + topOffset;
          obs.bottomMesh.position.y = obs.bottomBaseY + bottomOffset;
          
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
