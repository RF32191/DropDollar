'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// ORBITAL DODGE
// ============================================================================
// Core Mechanic: Player controls a sphere orbiting a core
// Hazards appear in layered 3D rings, speed ramps aggressively
// Advanced: Gravity flips, orbital radius changes mid-run
// One-hand play, high skill ceiling, very watchable replays
// ============================================================================

interface OrbitalDodgeGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface Hazard {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  speed: number;
  type: 'block' | 'laser' | 'pulse';
  active: boolean;
}

interface PowerUp {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  type: 'shield' | 'slow' | 'points';
  collected: boolean;
}

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  color: string;
}

// Seeded RNG for fair competition
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

export default function OrbitalDodgeGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: OrbitalDodgeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [timeAlive, setTimeAlive] = useState(0);
  const [hazardsDodged, setHazardsDodged] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(1);
  const [orbitsCompleted, setOrbitsCompleted] = useState(0);
  const [hasShield, setHasShield] = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [gravityFlipped, setGravityFlipped] = useState(false);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Mesh | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const hazardsRef = useRef<Hazard[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const playerAngleRef = useRef(0);
  const playerRadiusRef = useRef(5);
  const targetRadiusRef = useRef(5);
  const speedRef = useRef(1);
  const hazardsDodgedRef = useRef(0);
  const orbitsRef = useRef(0);
  const lastOrbitAngleRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shieldActiveRef = useRef(false);
  const slowActiveRef = useRef(false);
  const gravityRef = useRef(1); // 1 = normal, -1 = flipped
  const lastClickTimeRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isJumpingRef = useRef(false);
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          core: 0xff6600,
          coreGlow: 0xff9900,
          player: 0x9b59b6,
          playerGlow: 0xbb79d6,
          hazard: 0xff4444,
          hazardGlow: 0xff6666,
          ring: 0x4a1a6b,
          powerUp: 0x00ff88,
          trail: 0x9b59b6,
          ambient: 0x6b3fa0
        };
      case 'christmas':
        return {
          background: 0x001122,
          core: 0xffd700,
          coreGlow: 0xffec8b,
          player: 0x00ff00,
          playerGlow: 0x44ff44,
          hazard: 0xff0000,
          hazardGlow: 0xff4444,
          ring: 0x1e5631,
          powerUp: 0xffd700,
          trail: 0x00ff00,
          ambient: 0x87ceeb
        };
      default:
        return {
          background: 0x050510,
          core: 0x00ffff,
          coreGlow: 0x00ccff,
          player: 0xff00ff,
          playerGlow: 0xff44ff,
          hazard: 0xff3333,
          hazardGlow: 0xff6666,
          ring: 0x1a1a3a,
          powerUp: 0xffff00,
          trail: 0xff00ff,
          ambient: 0x6c5ce7
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((points: number, screenX: number, screenY: number, special: boolean = false) => {
    const id = floatingScoreIdRef.current++;
    const color = special ? '#ffd700' : points > 0 ? '#00ff88' : '#ff4444';
    const text = points > 0 ? `+${points}` : `${points}`;
    
    setFloatingScores(prev => [...prev, { id, text, x: screenX, y: screenY, opacity: 1, color }]);
    
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    sceneRef.current = scene;
    
    // Camera - top-down view
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 15, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.4);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(colors.coreGlow, 2, 30);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);
    
    // Create core (center)
    const coreGeometry = new THREE.SphereGeometry(1, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: colors.core,
      emissive: colors.coreGlow,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);
    coreRef.current = core;
    
    // Core glow effect
    const coreGlowGeometry = new THREE.SphereGeometry(1.3, 32, 32);
    const coreGlowMaterial = new THREE.MeshBasicMaterial({
      color: colors.coreGlow,
      transparent: true,
      opacity: 0.3
    });
    const coreGlow = new THREE.Mesh(coreGlowGeometry, coreGlowMaterial);
    scene.add(coreGlow);
    
    // Orbital rings (visual guides)
    for (let r = 3; r <= 8; r += 1) {
      const ringGeometry = new THREE.RingGeometry(r - 0.02, r + 0.02, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: colors.ring,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      scene.add(ring);
    }
    
    // Create player sphere
    const playerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(5, 0.3, 0);
    scene.add(player);
    playerRef.current = player;
    
    // Player trail effect
    const trailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: colors.trail,
      transparent: true,
      opacity: 0.5
    });
    for (let i = 0; i < 5; i++) {
      const trail = new THREE.Mesh(trailGeometry, trailMaterial.clone());
      trail.userData = { trailIndex: i };
      scene.add(trail);
    }
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    return { scene, camera, renderer };
  }, [getThemeColors]);

  // Spawn hazard
  const spawnHazard = useCallback(() => {
    if (!sceneRef.current || !rngRef.current) return;
    
    const colors = getThemeColors();
    const rng = rngRef.current;
    
    // Random hazard type
    const types: ('block' | 'laser' | 'pulse')[] = ['block', 'block', 'laser', 'pulse'];
    const type = types[rng.nextInt(0, types.length - 1)];
    
    // Random position on orbit
    const angle = rng.next() * Math.PI * 2;
    const radius = 3 + rng.next() * 5; // Between radius 3 and 8
    
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;
    
    switch (type) {
      case 'laser':
        geometry = new THREE.BoxGeometry(0.1, 0.3, 2);
        material = new THREE.MeshStandardMaterial({
          color: colors.hazard,
          emissive: colors.hazardGlow,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.9
        });
        break;
      case 'pulse':
        geometry = new THREE.TorusGeometry(0.5, 0.1, 8, 16);
        material = new THREE.MeshStandardMaterial({
          color: colors.hazard,
          emissive: colors.hazardGlow,
          emissiveIntensity: 0.6
        });
        break;
      default: // block
        geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        material = new THREE.MeshStandardMaterial({
          color: colors.hazard,
          emissive: colors.hazardGlow,
          emissiveIntensity: 0.4
        });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      Math.cos(angle) * radius,
      0.3,
      Math.sin(angle) * radius
    );
    
    if (type === 'laser') {
      // Point laser towards center
      mesh.lookAt(0, 0.3, 0);
    }
    
    sceneRef.current.add(mesh);
    
    // Speed increases over time
    const baseSpeed = 0.01 + speedRef.current * 0.005;
    const hazardSpeed = baseSpeed * (0.8 + rng.next() * 0.4);
    
    hazardsRef.current.push({
      mesh,
      angle,
      radius,
      speed: hazardSpeed * (rng.next() > 0.5 ? 1 : -1), // Random direction
      type,
      active: true
    });
  }, [getThemeColors]);

  // Spawn power-up
  const spawnPowerUp = useCallback(() => {
    if (!sceneRef.current || !rngRef.current) return;
    
    const colors = getThemeColors();
    const rng = rngRef.current;
    
    const types: ('shield' | 'slow' | 'points')[] = ['shield', 'slow', 'points'];
    const type = types[rng.nextInt(0, types.length - 1)];
    
    const angle = rng.next() * Math.PI * 2;
    const radius = 4 + rng.next() * 3;
    
    const geometry = new THREE.OctahedronGeometry(0.25);
    const material = new THREE.MeshStandardMaterial({
      color: type === 'shield' ? 0x00ffff : type === 'slow' ? 0x00ff00 : colors.powerUp,
      emissive: type === 'shield' ? 0x00cccc : type === 'slow' ? 0x00cc00 : colors.powerUp,
      emissiveIntensity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      Math.cos(angle) * radius,
      0.3,
      Math.sin(angle) * radius
    );
    
    sceneRef.current.add(mesh);
    
    powerUpsRef.current.push({
      mesh,
      angle,
      radius,
      type,
      collected: false
    });
  }, [getThemeColors]);

  // Jump to another orbit
  const jumpToOrbit = useCallback(() => {
    if (!gameActiveRef.current || isJumpingRef.current) return;
    
    isJumpingRef.current = true;
    
    // Available orbit radii: 3, 4, 5, 6, 7, 8
    const availableOrbits = [3, 4, 5, 6, 7, 8];
    const currentRadius = Math.round(playerRadiusRef.current);
    
    // Find current orbit index
    let currentIndex = availableOrbits.findIndex(r => Math.abs(r - currentRadius) < 0.5);
    if (currentIndex === -1) {
      // If not exactly on an orbit, find closest
      currentIndex = availableOrbits.reduce((closest, orbit, index) => {
        return Math.abs(orbit - currentRadius) < Math.abs(availableOrbits[closest] - currentRadius) 
          ? index 
          : closest;
      }, 0);
    }
    
    // Jump to next orbit (wrap around)
    const nextIndex = (currentIndex + 1) % availableOrbits.length;
    const targetOrbit = availableOrbits[nextIndex];
    
    // Smoothly jump to new orbit
    targetRadiusRef.current = targetOrbit;
    
    // Visual feedback - player flashes and scales up briefly
    if (playerRef.current) {
      const material = playerRef.current.material as THREE.MeshStandardMaterial;
      const originalColor = material.color.getHex();
      material.color.setHex(0xffff00); // Yellow flash
      material.emissiveIntensity = 1.5;
      
      // Scale animation
      const originalScale = playerRef.current.scale.x;
      playerRef.current.scale.setScalar(originalScale * 1.5);
      
      setTimeout(() => {
        if (playerRef.current) {
          material.color.setHex(originalColor);
          material.emissiveIntensity = 0.5;
          playerRef.current.scale.setScalar(originalScale);
        }
        isJumpingRef.current = false;
      }, 300);
    }
    
    // Add floating score for successful jump
    addFloatingScore(25, window.innerWidth / 2, window.innerHeight / 2, false);
  }, [addFloatingScore]);

  // Handle player input (single tap = flip direction, double tap = jump orbit)
  const handleInput = useCallback((event: MouseEvent | TouchEvent) => {
    if (!gameActiveRef.current) return;
    
    event.preventDefault();
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Clear any pending single-click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Check if this is a double-click/tap (within 300ms)
    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      // Double-click/tap detected - jump to another orbit
      jumpToOrbit();
      lastClickTimeRef.current = 0; // Reset to prevent triple-click
    } else {
      // Single-click/tap - set timeout to execute after delay
      lastClickTimeRef.current = now;
      
      clickTimeoutRef.current = setTimeout(() => {
        // Single tap - toggle gravity direction
        gravityRef.current *= -1;
        setGravityFlipped(gravityRef.current === -1);
        
        // Visual feedback
        if (playerRef.current) {
          const material = playerRef.current.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = 1;
          setTimeout(() => {
            if (playerRef.current) {
              material.emissiveIntensity = 0.5;
            }
          }, 100);
        }
        
        clickTimeoutRef.current = null;
      }, 300); // Wait 300ms to see if there's a second click
    }
  }, [jumpToOrbit]);

  // Check collisions
  const checkCollisions = useCallback(() => {
    if (!playerRef.current) return;
    
    const playerPos = playerRef.current.position;
    const playerRadius = 0.3;
    
    // Check hazard collisions
    for (const hazard of hazardsRef.current) {
      if (!hazard.active) continue;
      
      const dist = playerPos.distanceTo(hazard.mesh.position);
      const hitRadius = hazard.type === 'laser' ? 0.8 : hazard.type === 'pulse' ? 0.6 : 0.5;
      
      if (dist < playerRadius + hitRadius) {
        if (shieldActiveRef.current) {
          // Shield absorbs hit
          shieldActiveRef.current = false;
          setHasShield(false);
          hazard.active = false;
          if (sceneRef.current) {
            sceneRef.current.remove(hazard.mesh);
          }
          
          const points = 50;
          scoreRef.current += points;
          setScore(scoreRef.current);
          addFloatingScore(points, window.innerWidth / 2, window.innerHeight / 2, true);
        } else {
          // Game over!
          endGame();
          return;
        }
      }
    }
    
    // Check power-up collisions
    for (const powerUp of powerUpsRef.current) {
      if (powerUp.collected) continue;
      
      const dist = playerPos.distanceTo(powerUp.mesh.position);
      
      if (dist < playerRadius + 0.3) {
        powerUp.collected = true;
        if (sceneRef.current) {
          sceneRef.current.remove(powerUp.mesh);
        }
        
        let points = 100;
        
        switch (powerUp.type) {
          case 'shield':
            shieldActiveRef.current = true;
            setHasShield(true);
            points = 200;
            break;
          case 'slow':
            slowActiveRef.current = true;
            setTimeout(() => {
              slowActiveRef.current = false;
            }, 5000);
            points = 150;
            break;
          case 'points':
            points = 500;
            break;
        }
        
        scoreRef.current += points;
        setScore(scoreRef.current);
        addFloatingScore(points, window.innerWidth / 2, window.innerHeight / 2, true);
      }
    }
  }, [addFloatingScore]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Calculate bonuses
    const survivalBonus = Math.floor(timeAlive) * 10;
    const speedBonus = Math.floor(maxSpeed * 100);
    const orbitBonus = orbitsCompleted * 50;
    
    const finalScore = scoreRef.current + survivalBonus + speedBonus + orbitBonus;
    setScore(finalScore);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'orbital-dodge',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            timeAlive,
            hazardsDodged: hazardsDodgedRef.current,
            orbitsCompleted,
            maxSpeed,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'orbital-dodge',
            action: 'game_complete',
            score: finalScore,
            metadata: {
              timeAlive,
              hazardsDodged: hazardsDodgedRef.current,
              orbitsCompleted,
              maxSpeed,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, timeAlive, hazardsDodged, orbitsCompleted, maxSpeed, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const colors = getThemeColors();
    
    // Update player position (orbiting)
    const orbitSpeed = slowActiveRef.current ? 0.02 : 0.03 + speedRef.current * 0.005;
    playerAngleRef.current += orbitSpeed * gravityRef.current;
    
    // Track orbits completed
    if (gravityRef.current > 0) {
      if (playerAngleRef.current > lastOrbitAngleRef.current + Math.PI * 2) {
        lastOrbitAngleRef.current = playerAngleRef.current;
        orbitsRef.current++;
        setOrbitsCompleted(orbitsRef.current);
        
        const orbitPoints = 100 * orbitsRef.current;
        scoreRef.current += orbitPoints;
        setScore(scoreRef.current);
        addFloatingScore(orbitPoints, window.innerWidth / 2, 100, true);
      }
    }
    
    // Smoothly adjust orbital radius (gravity effect or jump)
    if (!isJumpingRef.current) {
      const radiusChange = gravityRef.current * 0.05;
      targetRadiusRef.current = Math.max(3, Math.min(8, targetRadiusRef.current + radiusChange * 0.1));
    }
    // Smooth interpolation to target radius (faster when jumping)
    const lerpSpeed = isJumpingRef.current ? 0.3 : 0.1;
    playerRadiusRef.current += (targetRadiusRef.current - playerRadiusRef.current) * lerpSpeed;
    
    if (playerRef.current) {
      playerRef.current.position.x = Math.cos(playerAngleRef.current) * playerRadiusRef.current;
      playerRef.current.position.z = Math.sin(playerAngleRef.current) * playerRadiusRef.current;
      
      // Shield visual
      if (shieldActiveRef.current) {
        const material = playerRef.current.material as THREE.MeshStandardMaterial;
        material.color.setHex(0x00ffff);
      } else {
        const material = playerRef.current.material as THREE.MeshStandardMaterial;
        material.color.setHex(colors.player);
      }
    }
    
    // Update trail
    if (sceneRef.current) {
      sceneRef.current.children.forEach(child => {
        if (child.userData.trailIndex !== undefined) {
          const i = child.userData.trailIndex;
          const trailAngle = playerAngleRef.current - (i + 1) * 0.15;
          const trailRadius = playerRadiusRef.current - i * 0.05;
          child.position.x = Math.cos(trailAngle) * trailRadius;
          child.position.z = Math.sin(trailAngle) * trailRadius;
          child.position.y = 0.3;
          (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            color: colors.trail,
            transparent: true,
            opacity: 0.5 - i * 0.1
          });
        }
      });
    }
    
    // Update hazards
    hazardsRef.current.forEach(hazard => {
      if (!hazard.active) return;
      
      hazard.angle += hazard.speed;
      hazard.mesh.position.x = Math.cos(hazard.angle) * hazard.radius;
      hazard.mesh.position.z = Math.sin(hazard.angle) * hazard.radius;
      
      // Rotate for visual effect
      hazard.mesh.rotation.y += 0.05;
      if (hazard.type === 'pulse') {
        hazard.mesh.rotation.x += 0.02;
      }
    });
    
    // Update power-ups (bob up and down)
    powerUpsRef.current.forEach(powerUp => {
      if (!powerUp.collected) {
        powerUp.mesh.position.y = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
        powerUp.mesh.rotation.y += 0.03;
      }
    });
    
    // Animate core
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.01;
      const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 1;
      coreRef.current.scale.setScalar(pulse);
    }
    
    // Check collisions
    checkCollisions();
    
    // Gradually increase speed
    speedRef.current += 0.0005;
    if (speedRef.current > maxSpeed) {
      setMaxSpeed(speedRef.current);
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getThemeColors, checkCollisions, addFloatingScore]);

  // Timer and hazard spawning
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    // Time alive counter
    const timeInterval = setInterval(() => {
      setTimeAlive(prev => prev + 0.1);
      
      // Points for surviving
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }, 100);
    
    // Hazard spawning (gets faster over time)
    const hazardInterval = setInterval(() => {
      if (gameActiveRef.current) {
        spawnHazard();
        
        // More hazards as speed increases
        if (speedRef.current > 2) {
          spawnHazard();
        }
        if (speedRef.current > 3) {
          spawnHazard();
        }
      }
    }, 1500);
    
    // Power-up spawning
    const powerUpInterval = setInterval(() => {
      if (gameActiveRef.current && rngRef.current && rngRef.current.next() < 0.3) {
        spawnPowerUp();
      }
    }, 5000);
    
    // Gravity flip events (random)
    const gravityFlipInterval = setInterval(() => {
      if (gameActiveRef.current && rngRef.current && rngRef.current.next() < 0.1) {
        // Random gravity disturbance
        targetRadiusRef.current = 3 + rngRef.current.next() * 5;
      }
    }, 3000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(hazardInterval);
      clearInterval(powerUpInterval);
      clearInterval(gravityFlipInterval);
    };
  }, [gameState, spawnHazard, spawnPowerUp]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeAlive(0);
    setHazardsDodged(0);
    setMaxSpeed(1);
    setOrbitsCompleted(0);
    setHasShield(false);
    setGravityFlipped(false);
    
    scoreRef.current = 0;
    playerAngleRef.current = 0;
    playerRadiusRef.current = 5;
    targetRadiusRef.current = 5;
    speedRef.current = 1;
    hazardsDodgedRef.current = 0;
    orbitsRef.current = 0;
    lastOrbitAngleRef.current = 0;
    gravityRef.current = 1;
    shieldActiveRef.current = false;
    slowActiveRef.current = false;
    lastClickTimeRef.current = 0;
    isJumpingRef.current = false;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    // Clear existing hazards and power-ups
    hazardsRef.current.forEach(h => {
      if (sceneRef.current) sceneRef.current.remove(h.mesh);
    });
    hazardsRef.current = [];
    
    powerUpsRef.current.forEach(p => {
      if (sceneRef.current) sceneRef.current.remove(p.mesh);
    });
    powerUpsRef.current = [];
    
    gameActiveRef.current = true;
    
    // Initialize scene if needed
    if (!sceneRef.current) {
      initScene();
    }
    
    // Reinitialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Start game loop
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/orbital-dodge-halloween.mp3' 
      : theme === 'christmas' 
        ? '/orbital-dodge-christmas.mp3' 
        : '/orbital-dodge.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [initScene, gameLoop, theme]);

  // Event listeners
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    
    // Handle mouse clicks
    const handleMouseClick = (e: MouseEvent) => {
      handleInput(e as any);
    };
    
    // Handle touch events
    const handleTouchStart = (e: TouchEvent) => {
      handleInput(e);
    };
    
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      canvas.removeEventListener('click', handleMouseClick);
      canvas.removeEventListener('touchstart', handleTouchStart);
      // Clean up any pending timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, [gameState, handleInput]);

  // Initialize on mount
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
            {/* Left: Score */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
            </div>
            
            {/* Center: Time & Speed */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-3xl font-mono font-bold text-white">
                {timeAlive.toFixed(1)}s
              </div>
              <div className="text-sm text-yellow-400">
                Speed: {speedRef.current.toFixed(1)}x
              </div>
              {gravityFlipped && (
                <div className="text-xs text-purple-400 animate-pulse">⟳ REVERSED</div>
              )}
            </div>
            
            {/* Right: Stats */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{orbitsCompleted} 🔄</div>
              <div className="text-xs text-gray-400">Orbits</div>
              {hasShield && (
                <div className="text-cyan-400 text-sm mt-1">🛡️ Shield</div>
              )}
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
              🌀 Orbital Dodge
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👆</span>
                <div>
                  <div className="font-bold text-white">Tap to Flip</div>
                  <div className="text-sm">Single tap to reverse orbit direction</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">👆👆</span>
                <div>
                  <div className="font-bold text-white">Double Tap to Jump</div>
                  <div className="text-sm">Double tap/click to jump to the next orbit ring!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-bold text-white">Dodge Hazards</div>
                  <div className="text-sm">Avoid red blocks, lasers, and pulses!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">💎</span>
                <div>
                  <div className="font-bold text-white">Collect Power-Ups</div>
                  <div className="text-sm">Shield 🛡️, Slow-Mo 🐢, Bonus Points 💰</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <div className="font-bold text-white">Speed Ramps Up!</div>
                  <div className="text-sm">Survive as long as you can - it gets faster!</div>
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
              START ORBITING
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Orbit Lost!</h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Time Alive</div>
                <div className="text-2xl font-bold text-white">{timeAlive.toFixed(1)}s</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Orbits</div>
                <div className="text-2xl font-bold text-white">{orbitsCompleted}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Max Speed</div>
                <div className="text-2xl font-bold text-yellow-400">{maxSpeed.toFixed(1)}x</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Hazards</div>
                <div className="text-2xl font-bold text-red-400">{hazardsRef.current.length}</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
              >
                Try Again
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

