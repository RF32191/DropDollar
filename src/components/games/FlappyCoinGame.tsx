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
  
  // Game state refs
  const coinYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const obstaclesRef = useRef<HandObstacle[]>([]);
  const gameSpeedRef = useRef<number>(4);
  const movingForwardRef = useRef<boolean>(true); // Direction: true = forward, false = reverse
  const scoreRef = useRef<number>(0);
  const isAliveRef = useRef<boolean>(true);
  const gameStartTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const highScoreRef = useRef<number>(0);
  const flipRotationRef = useRef<number>(0); // For the flip animation on tap
  const targetFlipRef = useRef<number>(0); // Target flip rotation
  const lastGapTimeRef = useRef<number>(0); // For speed bonus calculation
  const gapAccuracyRef = useRef<number>(0); // Track how centered through gaps
  
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
  const OBSTACLE_GAP = 12.0; // Much larger gap between obstacles for back/forth movement
  const GAP_SIZE = 4.2; // Larger opening to pass through
  
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
  
  // Create realistic procedural hand - fingers pointing towards gap
  const createHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    // Skin material with realistic tones
    const skinMaterial = new THREE.MeshPhongMaterial({
      color: 0xE8B89D,
      emissive: 0x4A2810,
      emissiveIntensity: 0.1,
      shininess: 20,
      specular: 0x553322,
    });
    
    // Palm - positioned to extend towards the gap
    const palmGeometry = new THREE.BoxGeometry(2.2, 2.0, 0.6);
    const palm = new THREE.Mesh(palmGeometry, skinMaterial);
    palm.position.y = isTop ? 1.5 : -1.5; // Palm positioned away from gap
    group.add(palm);
    
    // Knuckle ridge
    const knuckleGeometry = new THREE.BoxGeometry(2.0, 0.35, 0.7);
    const knuckle = new THREE.Mesh(knuckleGeometry, skinMaterial);
    knuckle.position.y = isTop ? 0.3 : -0.3; // Just before fingers
    group.add(knuckle);
    
    // Fingers with proper joints - pointing towards gap (y = 0)
    const fingerXPositions = [-0.7, -0.23, 0.23, 0.7];
    const fingerLengths = [1.2, 1.5, 1.4, 1.1];
    
    fingerXPositions.forEach((xPos, i) => {
      const fingerLength = fingerLengths[i];
      const fingerRadius = i === 0 || i === 3 ? 0.14 : 0.16;
      
      // Create finger segments pointing towards gap
      for (let seg = 0; seg < 3; seg++) {
        const segLength = fingerLength * (seg === 0 ? 0.4 : seg === 1 ? 0.35 : 0.25);
        const segRadius = fingerRadius * (1 - seg * 0.1);
        const segGeometry = new THREE.CapsuleGeometry(segRadius, segLength, 8, 12);
        const segMesh = new THREE.Mesh(segGeometry, skinMaterial);
        
        // Position segments towards the gap (y = 0)
        let segY;
        if (isTop) {
          // Top hand: fingers point down (towards gap at y=0)
          segY = -0.2 - (seg * fingerLength * 0.35);
        } else {
          // Bottom hand: fingers point up (towards gap at y=0)
          segY = 0.2 + (seg * fingerLength * 0.35);
        }
        segMesh.position.set(xPos, segY, 0);
        group.add(segMesh);
      }
      
      // Fingernail
      const nailGeometry = new THREE.BoxGeometry(fingerRadius * 1.5, fingerRadius * 1.8, 0.06);
      const nailMaterial = new THREE.MeshPhongMaterial({ color: 0xFFE4E1, shininess: 80 });
      const nail = new THREE.Mesh(nailGeometry, nailMaterial);
      const nailY = isTop ? -0.2 - fingerLength * 0.9 : 0.2 + fingerLength * 0.9;
      nail.position.set(xPos, nailY, isTop ? -0.18 : 0.18);
      group.add(nail);
    });
    
    // Thumb
    const thumbPositions = [
      { y: isTop ? 0.8 : -0.8, x: isTop ? 1.1 : -1.1, rotZ: isTop ? -0.5 : 0.5 },
      { y: isTop ? 0.2 : -0.2, x: isTop ? 1.4 : -1.4, rotZ: isTop ? -0.3 : 0.3 },
      { y: isTop ? -0.2 : 0.2, x: isTop ? 1.6 : -1.6, rotZ: isTop ? -0.2 : 0.2 },
    ];
    thumbPositions.forEach((pos, i) => {
      const thumbSeg = new THREE.CapsuleGeometry(0.18 - i * 0.02, 0.4, 8, 12);
      const thumbMesh = new THREE.Mesh(thumbSeg, skinMaterial);
      thumbMesh.position.set(pos.x, pos.y, 0);
      thumbMesh.rotation.z = pos.rotZ;
      group.add(thumbMesh);
    });
    
    // Wrist
    const wristGeometry = new THREE.CylinderGeometry(0.9, 1.0, 1.2, 16);
    const wrist = new THREE.Mesh(wristGeometry, skinMaterial);
    wrist.position.y = isTop ? 2.8 : -2.8;
    group.add(wrist);
    
    // Arm (extends away from gap)
    const armGeometry = new THREE.CylinderGeometry(0.85, 0.9, 8, 16);
    const arm = new THREE.Mesh(armGeometry, skinMaterial);
    arm.position.y = isTop ? 7.5 : -7.5;
    group.add(arm);
    
    // Suit sleeve cuff
    const cuffGeometry = new THREE.CylinderGeometry(1.05, 0.95, 0.8, 16);
    const cuffMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      shininess: 40,
      specular: 0x333344,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.y = isTop ? 3.5 : -3.5;
    group.add(cuff);
    
    // White shirt under cuff
    const shirtGeometry = new THREE.CylinderGeometry(0.88, 0.88, 0.25, 16);
    const shirtMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFF0, shininess: 20 });
    const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
    shirt.position.y = isTop ? 3.0 : -3.0;
    group.add(shirt);
    
    // Silver cuff button
    const buttonGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
    const buttonMaterial = new THREE.MeshPhongMaterial({ color: 0xC0C0C0, shininess: 100 });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.rotation.x = Math.PI / 2;
    button.position.set(0.95, isTop ? 3.5 : -3.5, 0);
    group.add(button);
    
    return group;
  }, []);
  
  // Handle jump forward - moves coin up and keeps moving forward
  const handleJumpForward = useCallback(() => {
    console.log('🪙 Jump Forward! State:', gameStateRef.current);
    
    if (gameStateRef.current === 'waiting') {
      console.log('🪙 Starting game from waiting state');
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      lastGapTimeRef.current = Date.now();
      movingForwardRef.current = true;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current += Math.PI * 2;
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      movingForwardRef.current = true;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current += Math.PI * 2;
    }
  }, []);
  
  // Handle reverse - moves coin up but reverses horizontal direction
  const handleReverse = useCallback(() => {
    console.log('🪙 Reverse! State:', gameStateRef.current);
    
    if (gameStateRef.current === 'waiting') {
      console.log('🪙 Starting game from waiting state (reverse)');
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      lastGapTimeRef.current = Date.now();
      movingForwardRef.current = false;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current -= Math.PI * 2; // Reverse flip
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      movingForwardRef.current = false;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current -= Math.PI * 2; // Reverse flip
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
    movingForwardRef.current = true;
    lastGapTimeRef.current = 0;
    gapAccuracyRef.current = 0;
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
  
  // Keyboard controls for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleJumpForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleReverse();
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        // Space or Up arrow also jumps forward
        handleJumpForward();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJumpForward, handleReverse]);
  
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
    
    // Camera - zoom out more on mobile
    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;
    const fov = isMobileDevice ? 65 : 50; // Wider FOV on mobile
    const cameraZ = isMobileDevice ? 20 : 14; // Further back on mobile
    const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, cameraZ);
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
          // More varied gap heights for interesting gameplay
          const gapY = (seededRngRef.current.next() - 0.5) * 6;
          
          const topHand = createHand(true);
          const bottomHand = createHand(false);
          
          // Base positions for hands - position so finger tips are at gap edges
          // Top hand: fingers point down (towards y=0 locally), positioned above gap
          // Bottom hand: fingers point up (towards y=0 locally), positioned below gap
          // Finger tips extend about 1.5 units from the hand group origin
          const fingerExtension = 1.5; // How far fingers extend towards gap
          const topBaseY = gapY + GAP_SIZE/2 + fingerExtension;
          const bottomBaseY = gapY - GAP_SIZE/2 - fingerExtension;
          
          topHand.position.set(newX, topBaseY, 0);
          bottomHand.position.set(newX, bottomBaseY, 0);
          
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
        
        // Move and check obstacles - direction affects movement
        const toRemove: number[] = [];
        const moveDirection = movingForwardRef.current ? -1 : 1; // Forward = obstacles come at you, Reverse = you go back
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obs = obstaclesRef.current[i];
          obs.x += moveDirection * gameSpeedRef.current * deltaTime;
          obs.topMesh.position.x = obs.x;
          obs.bottomMesh.position.x = obs.x;
          
          // Staggered up/down animation for hands
          const animSpeed = 1.5; // Speed of oscillation
          const animAmplitude = 0.4; // How far they move up/down
          const topOffset = Math.sin(time / 1000 * animSpeed + obs.topPhase) * animAmplitude;
          const bottomOffset = Math.sin(time / 1000 * animSpeed + obs.bottomPhase) * animAmplitude;
          
          obs.topMesh.position.y = obs.topBaseY + topOffset;
          obs.bottomMesh.position.y = obs.bottomBaseY + bottomOffset;
          
          // Score - ONLY for crossing gaps, with accuracy and speed bonuses
          if (!obs.passed && obs.x < COIN_X - 0.5) {
            obs.passed = true;
            
            // Calculate accuracy bonus - how centered through the gap
            const gapCenter = obs.gapY;
            const coinY = coinYRef.current;
            const distFromCenter = Math.abs(coinY - gapCenter);
            const maxDist = obs.gapSize / 2;
            const accuracy = Math.max(0, 1 - (distFromCenter / maxDist));
            gapAccuracyRef.current = (gapAccuracyRef.current + accuracy) / 2; // Running average
            
            // Base points: 10 per gap
            let points = 10;
            
            // Accuracy bonus: up to +20 for perfect center
            const accuracyBonus = Math.floor(accuracy * 20);
            points += accuracyBonus;
            
            // Speed bonus: faster time between gaps = more points (up to +15)
            const now = Date.now();
            const timeSinceLastGap = (now - lastGapTimeRef.current) / 1000;
            const speedBonus = Math.max(0, Math.min(15, Math.floor(15 - timeSinceLastGap * 2)));
            points += speedBonus;
            lastGapTimeRef.current = now;
            
            scoreRef.current += points;
            setScore(scoreRef.current);
            
            // CoD-style floating score popup
            const popupType = accuracy > 0.9 ? 'perfect' : accuracy > 0.7 ? 'bonus' : speedBonus > 10 ? 'combo' : 'normal';
            const label = accuracy > 0.9 ? 'PERFECT!' : accuracy > 0.7 ? 'CENTERED!' : speedBonus > 10 ? 'FAST!' : 'GAP';
            addPopupRef.current(points, 50, 40, popupType, label);
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
  
  // Screen tap is disabled - use the two buttons instead
  const handleScreenTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't handle - use dedicated buttons
    if (gameStateRef.current === 'ready' || gameStateRef.current === 'complete') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // Default to forward on screen tap
    handleJumpForward();
  }, [handleJumpForward]);
  
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
              TAP A BUTTON!
            </div>
            <div className="text-white text-lg" style={{ textShadow: '1px 1px 0 #000' }}>
              ⬅️ Reverse • Forward ➡️
            </div>
          </div>
        </div>
      )}
      
      {/* Control Buttons - during waiting and playing */}
      {(gameState === 'waiting' || gameState === 'playing') && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 z-20 px-4">
          {/* Reverse Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleReverse(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleReverse(); }}
            className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl border-4 border-blue-300 active:scale-90 transition-transform"
            style={{ touchAction: 'none' }}
          >
            <div className="text-center">
              <div className="text-4xl sm:text-5xl">⬅️</div>
              <div className="text-white text-sm font-bold mt-1" style={{ textShadow: '1px 1px 0 #000' }}>REVERSE</div>
            </div>
          </button>
          
          {/* Forward Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleJumpForward(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleJumpForward(); }}
            className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-b from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-green-300 active:scale-90 transition-transform"
            style={{ touchAction: 'none' }}
          >
            <div className="text-center">
              <div className="text-4xl sm:text-5xl">➡️</div>
              <div className="text-white text-sm font-bold mt-1" style={{ textShadow: '1px 1px 0 #000' }}>FORWARD</div>
            </div>
          </button>
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
                <p className="flex items-center gap-2"><span className="text-2xl">➡️</span><span><strong>FORWARD</strong> - Jump & move forward</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">⬅️</span><span><strong>REVERSE</strong> - Jump & go back</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">🤚</span><span>Avoid <strong>grabbing hands</strong></span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">🎯</span><span>Points for <strong>crossing gaps</strong> only!</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">⚡</span><span><strong>Speed + Accuracy</strong> = Bonus points!</span></p>
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
