'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

/**
 * CASH STACK 3D - Professional WebGL Stack Game
 * - Full 3D graphics with Three.js
 * - Realistic physics with smooth animations
 * - Particle effects for falling pieces
 * - Sound effects
 * - Advanced lighting and materials
 */

interface Block3D {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  width: number;
  depth: number;
  targetY: number;
  currentY: number;
  velocity: number;
  isDropping: boolean;
  direction: 'x' | 'z';
  dollarX: number;
  dollarZ: number;
}

interface Particle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface CashStackGame3DProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

const INITIAL_SIZE = 4;
const BLOCK_HEIGHT = 0.5;
const INITIAL_SPEED = 0.02;
const SPEED_INCREMENT = 0.0015;
const MAX_SPEED = 0.35;
const DOLLAR_THRESHOLD = 0.6;
const DROP_GRAVITY = 0.003;
const BOUNCE_DAMPING = 0.7;

export default function CashStackGame3D({
  onGameEnd,
  onExit,
}: CashStackGame3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const currentBlockRef = useRef<Block3D | null>(null);
  const stackedBlocksRef = useRef<Block3D[]>([]);
  const particlesRef = useRef<Particle3D[]>([]);
  const animationIdRef = useRef<number>();
  const clockRef = useRef(new THREE.Clock());
  const gameStartTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [explosions, setExplosions] = useState(0);
  const [towerHeight, setTowerHeight] = useState(0);
  const [gameTimer, setGameTimer] = useState(60);
  const [direction, setDirection] = useState(1);

  // Audio setup
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 20, 50);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 12, 12);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Rim light for neon effect
    const rimLight = new THREE.PointLight(0x32CD32, 1.5, 50);
    rimLight.position.set(0, 10, 5);
    scene.add(rimLight);

    // Ground plane with grid
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2845,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, 0x32CD32, 0x1a4f1a);
    gridHelper.position.y = -4.99;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Create a 3D block
  const createBlock = useCallback((
    x: number,
    z: number,
    width: number,
    depth: number,
    y: number,
    direction: 'x' | 'z'
  ): Block3D => {
    const geometry = new THREE.BoxGeometry(width, BLOCK_HEIGHT, depth);
    
    // Neon green material with glow
    const material = new THREE.MeshStandardMaterial({
      color: 0x32CD32,
      emissive: 0x32CD32,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.8,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    if (sceneRef.current) {
      sceneRef.current.add(mesh);
    }

    // Add dollar sign as sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Draw yellow circle
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw $ sign
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    
    const dollarX = (Math.random() - 0.5) * width * 0.8;
    const dollarZ = (Math.random() - 0.5) * depth * 0.8;
    
    sprite.position.set(dollarX, BLOCK_HEIGHT / 2 + 0.1, dollarZ);
    sprite.scale.set(0.5, 0.5, 1);
    mesh.add(sprite);

    return {
      mesh,
      x,
      z,
      width,
      depth,
      targetY: y,
      currentY: y + 10,
      velocity: 0,
      isDropping: true,
      direction,
      dollarX,
      dollarZ,
    };
  }, []);

  // Create particle effect
  const createParticles = useCallback((x: number, y: number, z: number, count: number) => {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const colors = [0x32CD32, 0xFFD700, 0xFF6347, 0xFFA500];
    
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.15
      );
      
      if (sceneRef.current) {
        sceneRef.current.add(mesh);
      }
      
      particlesRef.current.push({
        mesh,
        velocity,
        life: 60,
        maxLife: 60,
      });
    }
    
    playSound(800, 0.1, 'square');
  }, [playSound]);

  // Start game
  const startGame = useCallback(() => {
    if (gameState === 'ready') {
      setGameState('countdown');
      let count = 3;
      
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        playSound(600, 0.1);
        
        if (count === 0) {
          clearInterval(interval);
          setGameState('playing');
          gameStartTimeRef.current = Date.now();
          
          // Create base block
          const baseBlock = createBlock(0, 0, INITIAL_SIZE, INITIAL_SIZE, 0, 'x');
          baseBlock.isDropping = false;
          baseBlock.currentY = 0;
          stackedBlocksRef.current = [baseBlock];
          
          // Create first moving block
          currentBlockRef.current = createBlock(
            -10,
            0,
            INITIAL_SIZE,
            INITIAL_SIZE,
            BLOCK_HEIGHT,
            'x'
          );
          currentBlockRef.current.isDropping = false;
          currentBlockRef.current.currentY = BLOCK_HEIGHT;
          
          setTowerHeight(1);
          playSound(400, 0.2);
        }
      }, 1000);
    }
  }, [gameState, createBlock, playSound]);

  // Stack block
  const handleStack = useCallback(() => {
    if (!currentBlockRef.current || gameState !== 'playing') return;
    
    const current = currentBlockRef.current;
    const last = stackedBlocksRef.current[stackedBlocksRef.current.length - 1];
    
    // Check $ alignment
    const dollarDistX = Math.abs(last.dollarX - current.dollarX);
    const dollarDistZ = Math.abs(last.dollarZ - current.dollarZ);
    const dollarDist = Math.max(dollarDistX, dollarDistZ);
    
    if (dollarDist < DOLLAR_THRESHOLD) {
      // EXPLOSION!
      playSound(1200, 0.3, 'sawtooth');
      createParticles(current.x, current.currentY, current.z, 100);
      
      // Remove all blocks and reset
      stackedBlocksRef.current.forEach(block => {
        if (sceneRef.current && block.mesh) {
          sceneRef.current.remove(block.mesh);
        }
      });
      
      if (sceneRef.current && current.mesh) {
        sceneRef.current.remove(current.mesh);
      }
      
      const bonus = stackedBlocksRef.current.length * 300;
      setScore(prev => prev + bonus);
      setExplosions(prev => prev + 1);
      
      setTimeout(() => {
        const baseBlock = createBlock(0, 0, INITIAL_SIZE, INITIAL_SIZE, 0, 'x');
        baseBlock.isDropping = false;
        baseBlock.currentY = 0;
        stackedBlocksRef.current = [baseBlock];
        
        currentBlockRef.current = createBlock(
          -10,
          0,
          INITIAL_SIZE,
          INITIAL_SIZE,
          BLOCK_HEIGHT,
          'x'
        );
        currentBlockRef.current.isDropping = false;
        currentBlockRef.current.currentY = BLOCK_HEIGHT;
        
        setTowerHeight(1);
      }, 300);
      
      return;
    }
    
    // Calculate overlap
    let newWidth = current.width;
    let newDepth = current.depth;
    let newX = current.x;
    let newZ = current.z;
    let cutPiece: { x: number; z: number; width: number; depth: number } | null = null;
    
    if (current.direction === 'x') {
      const overlap = Math.min(
        last.x + last.width / 2,
        current.x + current.width / 2
      ) - Math.max(
        last.x - last.width / 2,
        current.x - current.width / 2
      );
      
      if (overlap <= 0) {
        // Game over
        setGameState('ended');
        playSound(200, 0.5, 'square');
        return;
      }
      
      newWidth = overlap;
      newX = (Math.min(last.x + last.width / 2, current.x + current.width / 2) +
             Math.max(last.x - last.width / 2, current.x - current.width / 2)) / 2;
      
      // Cut piece
      if (current.x < last.x - last.width / 2) {
        cutPiece = {
          x: current.x - (current.width - newWidth) / 2,
          z: current.z,
          width: current.width - newWidth,
          depth: current.depth
        };
      } else if (current.x > last.x + last.width / 2) {
        cutPiece = {
          x: current.x + (current.width - newWidth) / 2,
          z: current.z,
          width: current.width - newWidth,
          depth: current.depth
        };
      }
    } else {
      const overlap = Math.min(
        last.z + last.depth / 2,
        current.z + current.depth / 2
      ) - Math.max(
        last.z - last.depth / 2,
        current.z - current.depth / 2
      );
      
      if (overlap <= 0) {
        // Game over
        setGameState('ended');
        playSound(200, 0.5, 'square');
        return;
      }
      
      newDepth = overlap;
      newZ = (Math.min(last.z + last.depth / 2, current.z + current.depth / 2) +
             Math.max(last.z - last.depth / 2, current.z - current.depth / 2)) / 2;
      
      // Cut piece
      if (current.z < last.z - last.depth / 2) {
        cutPiece = {
          x: current.x,
          z: current.z - (current.depth - newDepth) / 2,
          width: current.width,
          depth: current.depth - newDepth
        };
      } else if (current.z > last.z + last.depth / 2) {
        cutPiece = {
          x: current.x,
          z: current.z + (current.depth - newDepth) / 2,
          width: current.width,
          depth: current.depth - newDepth
        };
      }
    }
    
    if (newWidth < 0.5 || newDepth < 0.5) {
      setGameState('ended');
      playSound(200, 0.5, 'square');
      return;
    }
    
    // Play stack sound
    playSound(500, 0.1);
    
    // Remove current block mesh
    if (sceneRef.current && current.mesh) {
      sceneRef.current.remove(current.mesh);
    }
    
    // Create stacked block with drop animation
    const newY = stackedBlocksRef.current.length * BLOCK_HEIGHT;
    const newDirection: 'x' | 'z' = current.direction === 'x' ? 'z' : 'x';
    const stackedBlock = createBlock(newX, newZ, newWidth, newDepth, newY, newDirection);
    stackedBlocksRef.current.push(stackedBlock);
    
    // Create falling cut piece if any
    if (cutPiece) {
      const cutBlock = createBlock(
        cutPiece.x,
        cutPiece.z,
        cutPiece.width,
        cutPiece.depth,
        current.currentY,
        current.direction
      );
      cutBlock.velocity = 0;
      cutBlock.targetY = -10;
      
      // Add rotation for falling effect
      setTimeout(() => {
        if (sceneRef.current && cutBlock.mesh) {
          sceneRef.current.remove(cutBlock.mesh);
        }
      }, 2000);
    }
    
    // Update score
    setScore(prev => prev + 3 + Math.floor(stackedBlocksRef.current.length / 2));
    setTowerHeight(stackedBlocksRef.current.length);
    
    // Create next moving block
    const nextBlock = createBlock(
      newDirection === 'x' ? -10 : newX,
      newDirection === 'z' ? -10 : newZ,
      newWidth,
      newDepth,
      (stackedBlocksRef.current.length) * BLOCK_HEIGHT,
      newDirection
    );
    nextBlock.isDropping = false;
    nextBlock.currentY = (stackedBlocksRef.current.length) * BLOCK_HEIGHT;
    currentBlockRef.current = nextBlock;
    
    setDirection(prev => prev * -1);
  }, [gameState, createBlock, createParticles, playSound]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const animate = () => {
      const delta = clockRef.current.getDelta();
      const elapsedTime = (Date.now() - gameStartTimeRef.current) / 1000;
      const currentSpeed = Math.min(MAX_SPEED, INITIAL_SPEED + (elapsedTime * SPEED_INCREMENT));
      
      // Update current block
      if (currentBlockRef.current && !currentBlockRef.current.isDropping) {
        const block = currentBlockRef.current;
        
        if (block.direction === 'x') {
          block.x += currentSpeed * direction;
          if (block.x < -10 || block.x > 10) {
            setDirection(prev => prev * -1);
          }
        } else {
          block.z += currentSpeed * direction;
          if (block.z < -10 || block.z > 10) {
            setDirection(prev => prev * -1);
          }
        }
        
        block.mesh.position.x = block.x;
        block.mesh.position.z = block.z;
      }
      
      // Update dropping blocks
      stackedBlocksRef.current.forEach(block => {
        if (block.isDropping) {
          block.velocity += DROP_GRAVITY;
          block.currentY -= block.velocity;
          
          if (block.currentY <= block.targetY) {
            block.currentY = block.targetY;
            block.velocity = -block.velocity * BOUNCE_DAMPING;
            
            if (Math.abs(block.velocity) < 0.01) {
              block.isDropping = false;
              block.velocity = 0;
            }
          }
          
          block.mesh.position.y = block.currentY;
        }
      });
      
      // Update particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.velocity.y -= 0.01;
        particle.mesh.position.add(particle.velocity);
        particle.life--;
        
        const alpha = particle.life / particle.maxLife;
        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        (particle.mesh.material as THREE.MeshBasicMaterial).transparent = true;
        
        if (particle.life <= 0) {
          if (sceneRef.current) {
            sceneRef.current.remove(particle.mesh);
          }
          return false;
        }
        return true;
      });
      
      // Update camera
      if (cameraRef.current) {
        const targetY = Math.max(12, stackedBlocksRef.current.length * BLOCK_HEIGHT + 8);
        cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.05;
        cameraRef.current.lookAt(0, stackedBlocksRef.current.length * BLOCK_HEIGHT / 2, 0);
      }
      
      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState, direction]);

  // Keyboard/Click control
  useEffect(() => {
    const handleInteraction = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.code !== 'Space') return;
      
      if (gameState === 'ready') {
        startGame();
      } else if (gameState === 'playing') {
        handleStack();
      }
    };
    
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('click', handleInteraction);
    
    return () => {
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [gameState, startGame, handleStack]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      setGameTimer(prev => {
        if (prev <= 1) {
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState]);

  // Handle game end
  useEffect(() => {
    if (gameState === 'ended') {
      playSound(300, 1, 'triangle');
      setTimeout(() => {
        onGameEnd({
          score,
          accuracy: Math.min(100, (explosions * 100) / Math.max(1, towerHeight)),
        });
      }, 2000);
    }
  }, [gameState, score, explosions, towerHeight, onGameEnd, playSound]);

  return (
    <div className="relative w-full h-screen bg-[#0a1628] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="text-white text-4xl font-bold drop-shadow-lg">
              Score: {score}
            </div>
            <div className="text-green-400 text-2xl font-bold">
              🏗️ Tower: {towerHeight}
            </div>
            {explosions > 0 && (
              <div className="text-red-400 text-2xl font-bold">
                💥 Explosions: {explosions}
              </div>
            )}
          </div>
          
          <div className="text-white text-3xl font-bold drop-shadow-lg">
            ⏱️ {gameTimer}s
          </div>
        </div>
      </div>
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-9xl font-bold animate-pulse">
            {countdown}
          </div>
        </div>
      )}
      
      {/* Ready screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
          <h1 className="text-6xl font-bold mb-8 text-green-400 animate-pulse">
            💰 CASH STACK 3D
          </h1>
          <p className="text-2xl mb-4">Stack blocks by clicking or pressing SPACE</p>
          <p className="text-xl mb-4">Align $ signs for 💥 EXPLOSION BONUS!</p>
          <p className="text-3xl font-bold text-yellow-400 mb-8">60 seconds - Go for high score!</p>
          <button
            onClick={startGame}
            className="px-12 py-6 bg-green-500 hover:bg-green-600 text-white text-3xl font-bold rounded-lg transition-all transform hover:scale-110 pointer-events-auto"
          >
            START GAME
          </button>
        </div>
      )}
      
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-6 right-6 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all pointer-events-auto"
      >
        EXIT
      </button>
    </div>
  );
}

