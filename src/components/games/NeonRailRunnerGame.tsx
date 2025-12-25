'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// NEON RAIL RUNNER
// ============================================================================
// Core Mechanic: Player grinds on floating neon rails in 3D space
// Must jump rails, flip direction, and avoid energy bursts
// Scoring: Style points (flips, perfect transitions) + Speed bonus
// ============================================================================

interface NeonRailRunnerGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface Rail {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  length: number;
  active: boolean;
}

interface Obstacle {
  mesh: THREE.Mesh;
  position: number; // Position along current rail (0-1)
  rail: Rail;
  type: 'burst' | 'gap' | 'barrier';
}

interface Collectible {
  mesh: THREE.Mesh;
  position: number;
  rail: Rail;
  collected: boolean;
  type: 'star' | 'boost' | 'multiplier';
}

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

// Seeded RNG
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export default function NeonRailRunnerGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: NeonRailRunnerGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [stylePoints, setStylePoints] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [railsCompleted, setRailsCompleted] = useState(0);
  const [flipsPerformed, setFlipsPerformed] = useState(0);
  const [perfectJumps, setPerfectJumps] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const railsRef = useRef<Rail[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const collectiblesRef = useRef<Collectible[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const styleRef = useRef(0);
  const speedRef = useRef(1);
  const multiplierRef = useRef(1);
  const currentRailRef = useRef<Rail | null>(null);
  const railProgressRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isJumpingRef = useRef(false);
  const jumpHeightRef = useRef(0);
  const flipRotationRef = useRef(0);
  const railIndexRef = useRef(0);
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          rail: 0xff6600,
          railGlow: 0xff9900,
          player: 0x9b59b6,
          playerGlow: 0xbb79d6,
          obstacle: 0xff0000,
          collectible: 0x00ff00,
          ambient: 0x4a1a6b
        };
      case 'christmas':
        return {
          background: 0x001122,
          rail: 0x00ff00,
          railGlow: 0x44ff44,
          player: 0xff0000,
          playerGlow: 0xff4444,
          obstacle: 0xffffff,
          collectible: 0xffd700,
          ambient: 0x1e5631
        };
      default:
        return {
          background: 0x050510,
          rail: 0x00ffff,
          railGlow: 0x00ccff,
          player: 0xff00ff,
          playerGlow: 0xff44ff,
          obstacle: 0xff3333,
          collectible: 0xffff00,
          ambient: 0x1a1a3a
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((text: string, x: number, y: number, color: string) => {
    const id = floatingScoreIdRef.current++;
    setFloatingScores(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  // Create rail
  const createRail = useCallback((startPos: THREE.Vector3, endPos: THREE.Vector3, scene: THREE.Scene): Rail => {
    const colors = getThemeColors();
    
    const direction = endPos.clone().sub(startPos);
    const length = direction.length();
    
    // Rail geometry - tube shape
    const curve = new THREE.LineCurve3(startPos, endPos);
    const geometry = new THREE.TubeGeometry(curve, 20, 0.15, 8, false);
    
    const material = new THREE.MeshStandardMaterial({
      color: colors.rail,
      emissive: colors.rail,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Glow effect
    const glowGeometry = new THREE.TubeGeometry(curve, 20, 0.25, 8, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.railGlow,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);
    
    return {
      mesh,
      glow,
      startPos,
      endPos,
      length,
      active: true
    };
  }, [getThemeColors]);

  // Generate rails procedurally
  const generateRails = useCallback((scene: THREE.Scene, rng: SeededRandom, startFrom?: THREE.Vector3) => {
    const rails: Rail[] = [];
    let currentPos = startFrom || new THREE.Vector3(0, 0, 0);
    
    for (let i = 0; i < 10; i++) {
      // Random rail direction and length
      const length = 8 + rng.next() * 12;
      const angleXZ = (rng.next() - 0.5) * Math.PI * 0.5; // -45 to 45 degrees
      const angleY = (rng.next() - 0.5) * 0.3; // Slight elevation changes
      
      const direction = new THREE.Vector3(
        Math.sin(angleXZ),
        angleY,
        -Math.cos(angleXZ)
      ).normalize().multiplyScalar(length);
      
      const endPos = currentPos.clone().add(direction);
      
      const rail = createRail(currentPos, endPos, scene);
      rails.push(rail);
      
      currentPos = endPos;
    }
    
    return rails;
  }, [createRail]);

  // Spawn obstacle on rail
  const spawnObstacle = useCallback((rail: Rail, position: number, scene: THREE.Scene) => {
    const colors = getThemeColors();
    
    const types: ('burst' | 'gap' | 'barrier')[] = ['burst', 'burst', 'barrier'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let geometry: THREE.BufferGeometry;
    
    switch (type) {
      case 'barrier':
        geometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
        break;
      default: // burst
        geometry = new THREE.SphereGeometry(0.4, 16, 16);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: colors.obstacle,
      emissive: colors.obstacle,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position along rail
    const railPoint = rail.startPos.clone().lerp(rail.endPos, position);
    mesh.position.copy(railPoint);
    mesh.position.y += 0.5;
    
    scene.add(mesh);
    
    obstaclesRef.current.push({
      mesh,
      position,
      rail,
      type
    });
  }, [getThemeColors]);

  // Spawn collectible
  const spawnCollectible = useCallback((rail: Rail, position: number, scene: THREE.Scene) => {
    const colors = getThemeColors();
    
    const types: ('star' | 'boost' | 'multiplier')[] = ['star', 'star', 'star', 'boost', 'multiplier'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const geometry = type === 'star' 
      ? new THREE.OctahedronGeometry(0.3)
      : type === 'boost'
        ? new THREE.ConeGeometry(0.25, 0.5, 4)
        : new THREE.TorusGeometry(0.25, 0.1, 8, 16);
    
    const color = type === 'star' ? colors.collectible 
      : type === 'boost' ? 0x00ffff 
      : 0xff00ff;
    
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    const railPoint = rail.startPos.clone().lerp(rail.endPos, position);
    mesh.position.copy(railPoint);
    mesh.position.y += 1;
    
    scene.add(mesh);
    
    collectiblesRef.current.push({
      mesh,
      position,
      rail,
      collected: false,
      type
    });
  }, [getThemeColors]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 20, 80);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      70,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, -5);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);
    
    // Point lights for atmosphere
    for (let i = 0; i < 5; i++) {
      const light = new THREE.PointLight(colors.railGlow, 0.5, 30);
      light.position.set(
        (Math.random() - 0.5) * 40,
        5 + Math.random() * 10,
        -20 - Math.random() * 40
      );
      scene.add(light);
    }
    
    // Create player (board/skater)
    const playerGroup = new THREE.Group();
    
    // Board
    const boardGeometry = new THREE.BoxGeometry(0.6, 0.1, 1.5);
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    playerGroup.add(board);
    
    // Player figure
    const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.6, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    playerGroup.add(body);
    
    // Trail
    const trailGeometry = new THREE.ConeGeometry(0.2, 1.5, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: colors.playerGlow,
      transparent: true,
      opacity: 0.4
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 1;
    trail.position.y = 0.3;
    playerGroup.add(trail);
    
    playerGroup.position.set(0, 0.5, 0);
    scene.add(playerGroup);
    playerRef.current = playerGroup;
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Generate initial rails
    railsRef.current = generateRails(scene, rngRef.current);
    currentRailRef.current = railsRef.current[0];
    
    // Add obstacles and collectibles
    railsRef.current.forEach((rail, index) => {
      if (index > 0 && rngRef.current) {
        // Obstacles
        const numObstacles = rngRef.current.nextInt(0, 2);
        for (let i = 0; i < numObstacles; i++) {
          const pos = 0.2 + rngRef.current.next() * 0.6;
          spawnObstacle(rail, pos, scene);
        }
        
        // Collectibles
        const numCollectibles = rngRef.current.nextInt(1, 3);
        for (let i = 0; i < numCollectibles; i++) {
          const pos = 0.1 + rngRef.current.next() * 0.8;
          spawnCollectible(rail, pos, scene);
        }
      }
    });
    
    return { scene, camera, renderer };
  }, [getThemeColors, generateRails, spawnObstacle, spawnCollectible]);

  // Handle jump
  const handleJump = useCallback(() => {
    if (!gameActiveRef.current || isJumpingRef.current) return;
    
    isJumpingRef.current = true;
    jumpHeightRef.current = 0;
    
    // Award style points for jump
    const points = 25 * multiplierRef.current;
    styleRef.current += points;
    setStylePoints(styleRef.current);
    
    if (rendererRef.current && playerRef.current && cameraRef.current) {
      const vector = playerRef.current.position.clone();
      vector.project(cameraRef.current);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
      addFloatingScore(`+${points} JUMP!`, x, y, '#00ffff');
    }
  }, [addFloatingScore]);

  // Handle flip (while jumping)
  const handleFlip = useCallback(() => {
    if (!gameActiveRef.current || !isJumpingRef.current || isFlipping) return;
    
    setIsFlipping(true);
    setFlipsPerformed(prev => prev + 1);
    
    // Big style points for flip!
    const points = 100 * multiplierRef.current;
    styleRef.current += points;
    setStylePoints(styleRef.current);
    scoreRef.current += points;
    setScore(scoreRef.current);
    
    if (rendererRef.current && playerRef.current && cameraRef.current) {
      const vector = playerRef.current.position.clone();
      vector.project(cameraRef.current);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
      addFloatingScore(`+${points} FLIP! 🔥`, x, y, '#ff00ff');
    }
  }, [isFlipping, addFloatingScore]);

  // End game
  const endGame = useCallback(async (reason?: string) => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Calculate final score
    const speedBonus = Math.floor(speedRef.current * 100);
    const styleBonus = styleRef.current;
    const railBonus = railsCompleted * 50;
    
    const finalScore = scoreRef.current + speedBonus + railBonus;
    setScore(finalScore);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'neon-rail-runner',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            railsCompleted,
            flipsPerformed,
            perfectJumps,
            maxSpeed: speedRef.current,
            stylePoints: styleRef.current,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'neon-rail-runner',
            action: 'game_complete',
            score: finalScore,
            metadata: {
              railsCompleted,
              flipsPerformed,
              perfectJumps,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, railsCompleted, flipsPerformed, perfectJumps, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const colors = getThemeColors();
    
    if (!currentRailRef.current || !playerRef.current) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    // Move along rail
    const moveSpeed = 0.008 * speedRef.current;
    railProgressRef.current += moveSpeed;
    
    // Handle jumping physics
    if (isJumpingRef.current) {
      const jumpPhase = Math.sin(jumpHeightRef.current * Math.PI);
      playerRef.current.position.y = 0.5 + jumpPhase * 3;
      jumpHeightRef.current += 0.05;
      
      // Handle flip rotation
      if (isFlipping) {
        flipRotationRef.current += 0.3;
        playerRef.current.rotation.x = flipRotationRef.current;
      }
      
      if (jumpHeightRef.current >= 1) {
        isJumpingRef.current = false;
        setIsFlipping(false);
        playerRef.current.position.y = 0.5;
        playerRef.current.rotation.x = 0;
        flipRotationRef.current = 0;
        
        // Perfect landing bonus
        if (railProgressRef.current > 0.95) {
          setPerfectJumps(prev => prev + 1);
          const bonus = 200 * multiplierRef.current;
          scoreRef.current += bonus;
          setScore(scoreRef.current);
          
          if (cameraRef.current) {
            const vector = playerRef.current.position.clone();
            vector.project(cameraRef.current);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
            addFloatingScore(`+${bonus} PERFECT! ⭐`, x, y, '#ffd700');
          }
        }
      }
    }
    
    // Position player on rail
    const currentRail = currentRailRef.current;
    const railPoint = currentRail.startPos.clone().lerp(
      currentRail.endPos, 
      Math.min(railProgressRef.current, 1)
    );
    
    if (!isJumpingRef.current) {
      playerRef.current.position.copy(railPoint);
      playerRef.current.position.y += 0.5;
    } else {
      playerRef.current.position.x = railPoint.x;
      playerRef.current.position.z = railPoint.z;
    }
    
    // Face direction of travel
    const direction = currentRail.endPos.clone().sub(currentRail.startPos).normalize();
    playerRef.current.rotation.y = Math.atan2(direction.x, direction.z);
    
    // Check for rail end - transition to next rail
    if (railProgressRef.current >= 1) {
      railIndexRef.current++;
      setRailsCompleted(railIndexRef.current);
      
      // Points for completing rail
      const railPoints = 100 * multiplierRef.current;
      scoreRef.current += railPoints;
      setScore(scoreRef.current);
      
      // Speed up slightly
      speedRef.current = Math.min(3, speedRef.current + 0.05);
      setSpeed(speedRef.current);
      
      if (railIndexRef.current >= railsRef.current.length) {
        // Generate more rails
        if (sceneRef.current && rngRef.current) {
          const lastRail = railsRef.current[railsRef.current.length - 1];
          const newRails = generateRails(sceneRef.current, rngRef.current, lastRail.endPos);
          
          // Add obstacles and collectibles to new rails
          newRails.forEach(rail => {
            if (rngRef.current) {
              const numObstacles = rngRef.current.nextInt(0, 2);
              for (let i = 0; i < numObstacles; i++) {
                const pos = 0.2 + rngRef.current.next() * 0.6;
                spawnObstacle(rail, pos, sceneRef.current!);
              }
              
              const numCollectibles = rngRef.current.nextInt(1, 3);
              for (let i = 0; i < numCollectibles; i++) {
                const pos = 0.1 + rngRef.current.next() * 0.8;
                spawnCollectible(rail, pos, sceneRef.current!);
              }
            }
          });
          
          railsRef.current = [...railsRef.current, ...newRails];
        }
      }
      
      currentRailRef.current = railsRef.current[railIndexRef.current];
      railProgressRef.current = 0;
    }
    
    // Check obstacle collisions
    if (!isJumpingRef.current) {
      for (const obstacle of obstaclesRef.current) {
        if (obstacle.rail === currentRailRef.current) {
          const distToObstacle = Math.abs(railProgressRef.current - obstacle.position);
          if (distToObstacle < 0.05) {
            // Hit obstacle!
            endGame('Hit an obstacle!');
            return;
          }
        }
      }
    }
    
    // Check collectible collisions
    for (const collectible of collectiblesRef.current) {
      if (collectible.collected) continue;
      if (collectible.rail === currentRailRef.current) {
        const distToCollectible = Math.abs(railProgressRef.current - collectible.position);
        if (distToCollectible < 0.1) {
          collectible.collected = true;
          if (sceneRef.current) {
            sceneRef.current.remove(collectible.mesh);
          }
          
          let points = 0;
          let text = '';
          
          switch (collectible.type) {
            case 'star':
              points = 50 * multiplierRef.current;
              text = `+${points} ⭐`;
              break;
            case 'boost':
              speedRef.current = Math.min(3, speedRef.current + 0.2);
              setSpeed(speedRef.current);
              points = 75;
              text = `+${points} BOOST! 🚀`;
              break;
            case 'multiplier':
              multiplierRef.current = Math.min(5, multiplierRef.current + 0.5);
              setMultiplier(multiplierRef.current);
              points = 100;
              text = `${multiplierRef.current}x MULTIPLIER! 🔥`;
              break;
          }
          
          scoreRef.current += points;
          setScore(scoreRef.current);
          
          if (cameraRef.current && playerRef.current) {
            const vector = playerRef.current.position.clone();
            vector.project(cameraRef.current);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
            addFloatingScore(text, x, y, '#ffff00');
          }
        }
      }
    }
    
    // Animate collectibles
    collectiblesRef.current.forEach(c => {
      if (!c.collected) {
        c.mesh.rotation.y += 0.05;
        c.mesh.position.y += Math.sin(Date.now() * 0.005) * 0.01;
      }
    });
    
    // Animate obstacles
    obstaclesRef.current.forEach(o => {
      o.mesh.rotation.y += 0.02;
      const pulse = Math.sin(Date.now() * 0.008) * 0.1 + 1;
      o.mesh.scale.setScalar(pulse);
    });
    
    // Update camera to follow player
    if (cameraRef.current && playerRef.current) {
      const targetCamPos = playerRef.current.position.clone();
      targetCamPos.y += 5;
      targetCamPos.z += 10;
      
      cameraRef.current.position.lerp(targetCamPos, 0.05);
      cameraRef.current.lookAt(
        playerRef.current.position.x,
        playerRef.current.position.y + 1,
        playerRef.current.position.z - 5
      );
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getThemeColors, generateRails, spawnObstacle, spawnCollectible, isFlipping, addFloatingScore, endGame]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame('Time\'s up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState, endGame]);

  // Input handlers
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }
      if ((e.code === 'KeyF' || e.code === 'ArrowDown') && isJumpingRef.current) {
        e.preventDefault();
        handleFlip();
      }
    };
    
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (!isJumpingRef.current) {
        handleJump();
      } else {
        handleFlip();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    containerRef.current?.addEventListener('touchstart', handleTouch, { passive: false });
    containerRef.current?.addEventListener('click', () => {
      if (!isJumpingRef.current) handleJump();
      else handleFlip();
    });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, handleJump, handleFlip]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setStylePoints(0);
    setSpeed(1);
    setRailsCompleted(0);
    setFlipsPerformed(0);
    setPerfectJumps(0);
    setMultiplier(1);
    setTimeLeft(60);
    
    scoreRef.current = 0;
    styleRef.current = 0;
    speedRef.current = 1;
    multiplierRef.current = 1;
    railProgressRef.current = 0;
    railIndexRef.current = 0;
    isJumpingRef.current = false;
    
    gameActiveRef.current = true;
    
    // Reset player position
    if (playerRef.current && railsRef.current[0]) {
      playerRef.current.position.copy(railsRef.current[0].startPos);
      playerRef.current.position.y += 0.5;
    }
    currentRailRef.current = railsRef.current[0];
    
    // Start game loop
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/neon-rail-halloween.mp3' 
      : theme === 'christmas' 
        ? '/neon-rail-christmas.mp3' 
        : '/neon-rail.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [gameLoop, theme]);

  // Initialize
  useEffect(() => {
    if (gameState === 'instructions') {
      initScene();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = getThemeColors();

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Game Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score & Style */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
              <div className="text-sm text-purple-400 mt-1">
                Style: {stylePoints}
              </div>
              {multiplier > 1 && (
                <div className="text-yellow-400 font-bold animate-pulse">
                  {multiplier.toFixed(1)}x
                </div>
              )}
            </div>
            
            {/* Center: Timer */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </div>
              <div className="text-sm text-green-400">
                Speed: {speed.toFixed(1)}x
              </div>
            </div>
            
            {/* Right: Stats */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{railsCompleted} rails</div>
              <div className="text-sm text-purple-400">{flipsPerformed} flips</div>
              <div className="text-xs text-yellow-400">{perfectJumps} perfect</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls hint */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden sm:inline">SPACE to Jump • F to Flip while jumping</span>
              <span className="sm:hidden">Tap to Jump • Tap again to Flip!</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Scores */}
      {floatingScores.map(fs => (
        <div
          key={fs.id}
          className="absolute pointer-events-none font-bold text-xl"
          style={{
            left: fs.x,
            top: fs.y,
            color: fs.color,
            transform: 'translate(-50%, -50%)',
            textShadow: '0 0 10px currentColor',
            animation: 'floatUp 1.5s ease-out forwards'
          }}
        >
          {fs.text}
        </div>
      ))}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h1 className="text-3xl font-bold text-cyan-400 mb-4">
              🛹 Neon Rail Runner
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏃</span>
                <div>
                  <div className="font-bold text-white">Grind the Rails</div>
                  <div className="text-sm">You auto-grind on neon rails through 3D space!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⬆️</span>
                <div>
                  <div className="font-bold text-white">Jump Obstacles</div>
                  <div className="text-sm">Press SPACE or tap to jump over hazards!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <div className="font-bold text-white">Do Flips for Style!</div>
                  <div className="text-sm">While jumping, press F or tap again to flip!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⭐</span>
                <div>
                  <div className="font-bold text-white">Collect Power-Ups</div>
                  <div className="text-sm">Stars, Speed Boosts, and Multipliers!</div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-xl text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              START GRINDING
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Run Complete!</h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Rails</div>
                <div className="text-2xl font-bold text-white">{railsCompleted}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Style Points</div>
                <div className="text-2xl font-bold text-purple-400">{stylePoints}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Flips</div>
                <div className="text-2xl font-bold text-pink-400">{flipsPerformed}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Perfect Jumps</div>
                <div className="text-2xl font-bold text-yellow-400">{perfectJumps}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Reset and reinitialize
                  if (sceneRef.current) {
                    // Clear old rails, obstacles, collectibles
                    railsRef.current.forEach(r => {
                      sceneRef.current?.remove(r.mesh);
                      sceneRef.current?.remove(r.glow);
                    });
                    obstaclesRef.current.forEach(o => sceneRef.current?.remove(o.mesh));
                    collectiblesRef.current.forEach(c => sceneRef.current?.remove(c.mesh));
                    
                    railsRef.current = [];
                    obstaclesRef.current = [];
                    collectiblesRef.current = [];
                    
                    // Regenerate
                    const today = new Date();
                    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
                    rngRef.current = new SeededRandom(seed);
                    
                    railsRef.current = generateRails(sceneRef.current, rngRef.current);
                    
                    railsRef.current.forEach((rail, index) => {
                      if (index > 0 && rngRef.current && sceneRef.current) {
                        const numObstacles = rngRef.current.nextInt(0, 2);
                        for (let i = 0; i < numObstacles; i++) {
                          const pos = 0.2 + rngRef.current.next() * 0.6;
                          spawnObstacle(rail, pos, sceneRef.current);
                        }
                        
                        const numCollectibles = rngRef.current.nextInt(1, 3);
                        for (let i = 0; i < numCollectibles; i++) {
                          const pos = 0.1 + rngRef.current.next() * 0.8;
                          spawnCollectible(rail, pos, sceneRef.current);
                        }
                      }
                    });
                  }
                  
                  startGame();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
              >
                Play Again
              </button>
              <button
                onClick={() => window.location.href = '/games'}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
      `}</style>
    </div>
  );
}

