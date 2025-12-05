'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface PennyPasserGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
  competitionId?: string;
}

interface Lane {
  y: number;
  direction: 1 | -1; // 1 = right, -1 = left
  speed: number;
  wallets: Wallet[];
}

interface Wallet {
  x: number;
  mesh: THREE.Mesh;
}

// Seeded RNG for deterministic patterns in competition mode
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export default function PennyPasserGame3D({
  onGameEnd,
  gameMode = 'practice',
  rngSeed,
  competitionId
}: PennyPasserGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | undefined>(undefined);
  const pennyRef = useRef<THREE.Mesh | null>(null);
  const lanesRef = useRef<Lane[]>([]);
  const rngRef = useRef<SeededRandom>(new SeededRandom(rngSeed || Date.now()));
  const hasEndedRef = useRef(false);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [gameState, setGameState] = useState<'playing' | 'ended'>('playing');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [pennyPosition, setPennyPosition] = useState(0); // Distance traveled
  const [isMoving, setIsMoving] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-cheat tracking
  const moveTimingsRef = useRef<number[]>([]);
  const collisionCountRef = useRef(0);

  // Audio feedback
  const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground/Road
    const roadGeometry = new THREE.PlaneGeometry(20, 50);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    scene.add(road);

    // Lane dividers
    for (let i = -2; i <= 2; i++) {
      const dividerGeometry = new THREE.BoxGeometry(0.1, 0.1, 50);
      const dividerMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
      const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
      divider.position.set(i * 4, 0.05, 0);
      scene.add(divider);
    }

    // Create penny (player)
    const pennyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
    const pennyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xb87333, // Copper color
      metalness: 0.7,
      roughness: 0.3
    });
    const penny = new THREE.Mesh(pennyGeometry, pennyMaterial);
    penny.position.set(0, 0.5, -20); // Start at bottom center
    penny.rotation.x = Math.PI / 2;
    penny.castShadow = true;
    scene.add(penny);
    pennyRef.current = penny;

    // Create lanes with wallets
    const lanes: Lane[] = [];
    const numLanes = 15;
    const rng = rngRef.current;

    for (let i = 0; i < numLanes; i++) {
      const yPos = -15 + (i * 2.5);
      const direction = rng.next() > 0.5 ? 1 : -1;
      const speed = rng.range(0.02, 0.08);
      const numWallets = Math.floor(rng.range(2, 5));
      const wallets: Wallet[] = [];

      for (let j = 0; j < numWallets; j++) {
        // Create wallet (rectangular box with texture-like appearance)
        const walletGroup = new THREE.Group();
        
        // Main wallet body
        const walletGeometry = new THREE.BoxGeometry(1.5, 0.2, 1);
        const walletMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x8B4513, // Brown leather color
          metalness: 0.2,
          roughness: 0.8
        });
        const walletMesh = new THREE.Mesh(walletGeometry, walletMaterial);
        walletGroup.add(walletMesh);
        
        // Wallet clasp (gold accent)
        const claspGeometry = new THREE.BoxGeometry(0.3, 0.25, 1.05);
        const claspMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xFFD700, // Gold
          metalness: 0.9,
          roughness: 0.1
        });
        const clasp = new THREE.Mesh(claspGeometry, claspMaterial);
        clasp.position.y = 0.1;
        walletGroup.add(clasp);
        
        // Add stitching details (small lines)
        const stitchMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
        for (let s = 0; s < 4; s++) {
          const stitchGeometry = new THREE.BoxGeometry(0.05, 0.25, 0.05);
          const stitch = new THREE.Mesh(stitchGeometry, stitchMaterial);
          stitch.position.set(-0.5 + (s * 0.33), 0.1, 0.4);
          walletGroup.add(stitch);
        }
        
        const spacing = 20 / numWallets;
        const xPos = -10 + (j * spacing) + rng.range(-2, 2);
        walletGroup.position.set(xPos, 0.6, yPos);
        walletGroup.castShadow = true;
        scene.add(walletGroup);

        wallets.push({ x: xPos, mesh: walletGroup });
      }

      lanes.push({ y: yPos, direction, speed, wallets });
    }
    lanesRef.current = lanes;

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !pennyRef.current) return;

      // Move wallets in lanes
      lanesRef.current.forEach(lane => {
        lane.wallets.forEach(wallet => {
          wallet.x += lane.speed * lane.direction;
          
          // Wrap around
          if (wallet.x > 12) wallet.x = -12;
          if (wallet.x < -12) wallet.x = 12;
          
          wallet.mesh.position.x = wallet.x;
          
          // Animate wallet rotation
          wallet.mesh.rotation.y += 0.01;
        });
      });

      // Rotate penny
      pennyRef.current.rotation.y += 0.05;

      // Check collisions
      if (pennyRef.current) {
        const pennyZ = pennyRef.current.position.z;
        const pennyX = pennyRef.current.position.x;
        const tolerance = 1.5;

        lanesRef.current.forEach(lane => {
          if (Math.abs(pennyZ - lane.y) < tolerance) {
            lane.wallets.forEach(wallet => {
              const distanceX = Math.abs(pennyX - wallet.x);
              const distanceZ = Math.abs(pennyZ - lane.y);
              if (distanceX < 1.2 && distanceZ < 1.2) {
                // Collision!
                handleCollision();
              }
            });
          }
        });
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  // Collision handler
  const handleCollision = useCallback(() => {
    collisionCountRef.current++;
    setHearts(prev => {
      const newHearts = prev - 1;
      if (newHearts <= 0) {
        endGame();
      }
      return Math.max(0, newHearts);
    });
    playSound(200, 0.2, 'sawtooth');

    // Flash penny red
    if (pennyRef.current) {
      const originalColor = (pennyRef.current.material as THREE.MeshStandardMaterial).color.getHex();
      (pennyRef.current.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
      setTimeout(() => {
        if (pennyRef.current) {
          (pennyRef.current.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
        }
      }, 200);
    }
  }, []);

  // Click-to-move handler
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || isMoving || hearts <= 0 || !pennyRef.current || !cameraRef.current || !mountRef.current) return;

    // Calculate mouse position in normalized device coordinates
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find click position on the road plane
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Create a plane at y=0 (the road level)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) return;

    const now = Date.now();
    const timeSinceLastMove = now - lastMoveTime;
    moveTimingsRef.current.push(timeSinceLastMove);

    setIsMoving(true);
    setMoveCount(prev => prev + 1);
    setLastMoveTime(now);

    // Calculate target position (snap to lanes)
    const targetX = Math.round(intersectPoint.x / 4) * 4; // Snap to lane centers
    const targetZ = Math.max(intersectPoint.z, pennyRef.current.position.z + 1); // Can only move forward or stay

    const startX = pennyRef.current.position.x;
    const startZ = pennyRef.current.position.z;
    const distanceMoved = Math.abs(targetZ - startZ) + Math.abs(targetX - startX);

    // Smooth animation
    const duration = 200; // ms
    const startTime = Date.now();

    const animateMove = () => {
      if (!pennyRef.current) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      pennyRef.current.position.x = startX + (targetX - startX) * easeProgress;
      pennyRef.current.position.z = startZ + (targetZ - startZ) * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animateMove);
      } else {
        setIsMoving(false);
        
        // Update position and score
        if (distanceMoved > 0) {
          setPennyPosition(prev => prev + distanceMoved);
          
          // Speed bonus: faster moves = more points
          const speedBonus = Math.max(0, 1 - (timeSinceLastMove / 2000));
          const basePoints = 10 * distanceMoved;
          const points = basePoints * (1 + speedBonus);
          setScore(prev => prev + points);
          
          playSound(400 + (progress * 200), 0.1);
        }
      }
    };
    
    animateMove();
  }, [gameState, isMoving, hearts, lastMoveTime]);

  // End game
  const endGame = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setGameState('ended');
    setIsSubmitting(true);

    // Calculate final score
    let finalScore = score;
    
    // Heart bonus: 50 points per remaining heart
    const heartBonus = hearts * 50;
    finalScore += heartBonus;

    // Time bonus: points for time efficiency
    const timeUsed = 60 - timeRemaining;
    const timeEfficiency = pennyPosition / Math.max(1, timeUsed);
    const timeBonus = Math.floor(timeEfficiency * 10);
    finalScore += timeBonus;

    // Calculate accuracy (avoiding collisions)
    const totalPossibleCollisions = pennyPosition * 3; // Rough estimate
    const accuracy = Math.min(100, Math.max(0, 100 - (collisionCountRef.current / Math.max(1, totalPossibleCollisions)) * 100));

    // Anti-cheat: Check for suspicious patterns
    const avgMoveTime = moveTimingsRef.current.reduce((a, b) => a + b, 0) / Math.max(1, moveTimingsRef.current.length);
    const isSuspicious = avgMoveTime < 50 || moveCount > 100; // Too fast or too many moves

    if (isSuspicious) {
      console.warn('⚠️ Suspicious game pattern detected');
      finalScore = Math.floor(finalScore * 0.5); // Penalty
    }

    playSound(600, 0.5, 'sine');

    // Log to audit system
    logGameCompletion({
      gameType: GAME_TYPES.PENNY_PASSER,
      gameMode: gameMode === 'competition' ? GAME_MODES.COMPETITION : GAME_MODES.PRACTICE,
      score: finalScore,
      accuracy: accuracy,
      reactionTime: avgMoveTime,
      durationSeconds: 60 - timeRemaining,
      additionalData: {
        moveCount,
        pennyPosition,
        heartsRemaining: hearts,
        collisions: collisionCountRef.current,
        heartBonus,
        timeBonus,
        rngSeed: rngSeed || 0,
        competitionId: competitionId || null
      }
    }).catch(err => console.warn('[PennyPasser] Audit log failed:', err));

    // Stop animation
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    console.log('🎯 [PennyPasser] Game ended:', {
      finalScore,
      accuracy: accuracy.toFixed(2),
      moves: moveCount,
      position: pennyPosition,
      heartsLeft: hearts
    });

    setTimeout(() => {
      onGameEnd({
        score: finalScore,
        accuracy: accuracy
      });
      setIsSubmitting(false);
    }, 1500);
  }, [score, hearts, timeRemaining, pennyPosition, moveCount, gameMode, rngSeed, competitionId, onGameEnd]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      {/* Game Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
        style={{ minHeight: '600px' }}
      />

      {/* HUD Overlay */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
          {/* Left: Hearts */}
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`text-2xl ${i < hearts ? 'opacity-100' : 'opacity-20'}`}>
                  ❤️
                </div>
              ))}
            </div>
          </div>

          {/* Center: Timer */}
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="text-2xl font-bold text-white">
              ⏱️ {timeRemaining}s
            </div>
          </div>

          {/* Right: Score */}
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-right">
            <div className="text-sm text-gray-300">Score</div>
            <div className="text-2xl font-bold text-yellow-400">
              {score.toFixed(1)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Distance: {pennyPosition.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {gameState === 'playing' && timeRemaining > 55 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/50 animate-pulse pointer-events-none">
          <div className="text-white text-center">
            <div className="text-xl font-bold mb-2">🪙 Click anywhere to move the penny!</div>
            <div className="text-sm text-gray-300">Avoid wallets 💰 • Keep your hearts • Move smart!</div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'ended' && !isSubmitting && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md border-2 border-yellow-400/50 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🪙</div>
              <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
              
              <div className="space-y-3 mb-6">
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Final Score</div>
                  <div className="text-3xl font-bold text-yellow-400">{score.toFixed(1)}</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Distance Traveled</div>
                  <div className="text-2xl font-bold text-white">{pennyPosition.toFixed(0)}</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Hearts Remaining</div>
                  <div className="text-2xl font-bold text-red-400">{hearts} ❤️</div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-sm text-gray-400">Total Moves</div>
                  <div className="text-2xl font-bold text-blue-400">{moveCount}</div>
                </div>
              </div>
              
              <div className="text-sm text-gray-400">
                {hearts > 0 ? '✨ Great job! You survived!' : '💔 Better luck next time!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4"></div>
            <div className="text-white text-xl">Recording Score...</div>
          </div>
        </div>
      )}

      {/* Version Tag */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 pointer-events-none">
        v2.0 - BUILD 20251204 - Penny Passer (Click-to-Move)
      </div>
    </div>
  );
}
