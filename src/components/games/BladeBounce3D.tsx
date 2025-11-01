'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

/**
 * BLADE BOUNCE 3D - Professional WebGL Sword Defense Game
 * - Full 3D sword with smooth 45° rotation
 * - Red danger zones only on sword HANDLE (hilt)
 * - 3 hearts system with visual feedback
 * - Realistic physics and smooth animations
 * - Multiple enemy types with varied behaviors
 */

interface Enemy3D {
  mesh: THREE.Mesh;
  glowMesh?: THREE.Mesh; // For fireball glow effect
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  type: 'fireball' | 'pillar';
  health: number;
  rotation: number;
  pulsePhase?: number; // For animated pulsing
  trailParticles?: THREE.Mesh[]; // Particle trail for fireballs
}

interface Particle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface BladeBounce3DProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

const GAME_DURATION = 60;
const SWORD_ROTATION_SPEED = 0.15; // Much faster rotation for smooth 45° clicks
const ROTATION_STEP = Math.PI / 4; // 45 degrees per click
const ENEMY_SPAWN_RATE = 800; // ms between spawns
const HANDLE_DANGER_ZONES = 3; // Number of red circles on handle
const DANGER_ZONE_SIZE = 0.8; // VERY LARGE danger zones for easy hit detection
const DANGER_ZONE_HIT_RADIUS = 1.2; // Hit detection radius (larger than visual)
const SWORD_MOVE_SPEED = 0.35; // Fast, smooth vertical movement
const SWORD_Y_RANGE = 10; // Large vertical range

export default function BladeBounce3D({
  onGameEnd,
  onExit,
}: BladeBounce3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const swordGroupRef = useRef<THREE.Group | null>(null);
  const enemiesRef = useRef<Enemy3D[]>([]);
  const particlesRef = useRef<Particle3D[]>([]);
  const animationIdRef = useRef<number>();
  const clockRef = useRef(new THREE.Clock());
  const lastSpawnRef = useRef<number>(0);
  const dangerZonesRef = useRef<THREE.Mesh[]>([]);
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [enemiesDestroyed, setEnemiesDestroyed] = useState(0);
  const [gameTimer, setGameTimer] = useState(GAME_DURATION);
  const [targetAngle, setTargetAngle] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  
  // Audio
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
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 20;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Point light for sword glow
    const swordLight = new THREE.PointLight(0x00ffff, 1.5, 10);
    swordLight.position.set(0, 0, 2);
    scene.add(swordLight);

    // Create sword
    const swordGroup = new THREE.Group();
    
    // Blade (main body)
    const bladeGeometry = new THREE.BoxGeometry(0.3, 4, 0.1);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x4080ff,
      emissiveIntensity: 0.3,
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 2;
    swordGroup.add(blade);
    
    // Blade edge glow
    const edgeGeometry = new THREE.BoxGeometry(0.1, 4, 0.05);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x80c0ff,
      transparent: true,
      opacity: 0.6,
    });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = 2;
    edge.position.z = 0.05;
    swordGroup.add(edge);
    
    // Guard (crossguard)
    const guardGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.2);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      metalness: 0.6,
      roughness: 0.4,
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.y = 0;
    swordGroup.add(guard);
    
    // Handle (grip) - This is the DANGER ZONE
    const handleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      metalness: 0.3,
      roughness: 0.7,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.7;
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    // Pommel (end cap)
    const pommelGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const pommelMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
    });
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.y = -1.3;
    swordGroup.add(pommel);
    
    // Create danger zones ONLY on handle (MUCH LARGER red circles with glow)
    const dangerZones: THREE.Mesh[] = [];
    for (let i = 0; i < HANDLE_DANGER_ZONES; i++) {
      const dangerGeometry = new THREE.SphereGeometry(DANGER_ZONE_SIZE, 32, 32);
      const dangerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.75,
      });
      const danger = new THREE.Mesh(dangerGeometry, dangerMaterial);
      
      // Add outer glow sphere for extra visibility
      const glowGeometry = new THREE.SphereGeometry(DANGER_ZONE_SIZE * 1.3, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      
      // Position along handle length
      const handleStart = -1.2;
      const handleEnd = -0.2;
      const step = (handleEnd - handleStart) / (HANDLE_DANGER_ZONES + 1);
      const yPos = handleStart + step * (i + 1);
      
      danger.position.y = yPos;
      danger.position.z = 0.2; // Slightly in front
      
      glow.position.y = yPos;
      glow.position.z = 0.2;
      
      swordGroup.add(glow); // Add glow first (behind)
      swordGroup.add(danger); // Add main sphere on top
      dangerZones.push(danger);
    }
    dangerZonesRef.current = dangerZones;
    
    swordGroup.position.set(0, 0, 0);
    scene.add(swordGroup);
    swordGroupRef.current = swordGroup;

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

  // Create enemy - FIREBALLS and PILLARS
  const createEnemy = useCallback((type: 'fireball' | 'pillar') => {
    if (!sceneRef.current) return;

    if (type === 'fireball') {
      // ANIMATED FIREBALL - realistic fire effect
      const fireballSize = 0.4 + Math.random() * 0.3;
      
      // Core fireball
      const geometry = new THREE.SphereGeometry(fireballSize, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff6600,
        emissiveIntensity: 1.5,
        metalness: 0,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Glowing outer layer
      const glowGeometry = new THREE.SphereGeometry(fireballSize * 1.4, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.5,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      
      // Spawn from edges
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (10 + Math.random() * 5);
      const y = (Math.random() - 0.5) * 8;
      
      mesh.position.set(x, y, 0);
      glowMesh.position.set(x, y, 0);
      sceneRef.current.add(mesh);
      sceneRef.current.add(glowMesh);
      
      // Fast velocity towards sword
      const speed = 0.05 + Math.random() * 0.03;
      const velocityX = -side * speed;
      const velocityY = (Math.random() - 0.5) * 0.02;
      
      enemiesRef.current.push({
        mesh,
        glowMesh,
        x,
        y,
        velocityX,
        velocityY,
        type: 'fireball',
        health: 1,
        rotation: 0,
        pulsePhase: Math.random() * Math.PI * 2,
        trailParticles: [],
      });
    } else if (type === 'pillar') {
      // DEADLY PILLARS - spawn from top or bottom
      const fromTop = Math.random() < 0.5;
      const pillarLength = 3 + Math.random() * 2;
      
      // Pillar geometry (cylinder)
      const geometry = new THREE.CylinderGeometry(0.4, 0.4, pillarLength, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0x8b00ff,
        emissive: 0x4400ff,
        emissiveIntensity: 0.8,
        metalness: 0.7,
        roughness: 0.3,
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Glow effect
      const glowGeometry = new THREE.CylinderGeometry(0.5, 0.5, pillarLength, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xaa44ff,
        transparent: true,
        opacity: 0.4,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      
      // Position at top or bottom
      const x = (Math.random() - 0.5) * 15;
      const y = fromTop ? 12 : -12;
      
      mesh.position.set(x, y, 0);
      glowMesh.position.set(x, y, 0);
      sceneRef.current.add(mesh);
      sceneRef.current.add(glowMesh);
      
      // Move towards center (extend inward)
      const velocityY = fromTop ? -0.06 : 0.06;
      
      enemiesRef.current.push({
        mesh,
        glowMesh,
        x,
        y,
        velocityX: 0,
        velocityY,
        type: 'pillar',
        health: 2,
        rotation: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }, []);

  // Create particle effect
  const createParticles = useCallback((x: number, y: number, color: number, count: number) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0);
      
      const angle = (Math.PI * 2 * i) / count;
      const speed = 0.05 + Math.random() * 0.05;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 0.05
      );
      
      sceneRef.current.add(mesh);
      
      particlesRef.current.push({
        mesh,
        velocity,
        life: 30,
        maxLife: 30,
      });
    }
    
    playSound(400 + Math.random() * 200, 0.1, 'square');
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
          playSound(800, 0.2);
          lastSpawnRef.current = Date.now();
        }
      }, 1000);
    }
  }, [gameState, playSound]);

  // Mouse control - VERTICAL MOVEMENT + CLICK ROTATION
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const centerY = rect.height / 2;
      const mouseY = e.clientY - rect.top;
      
      // Calculate target Y position based on mouse Y (vertical movement)
      const normalizedY = (mouseY - centerY) / centerY; // -1 to 1
      const newTargetY = -normalizedY * SWORD_Y_RANGE; // Invert for intuitive control
      setTargetY(newTargetY);
      
      // Debug logging (remove after testing)
      if (Math.random() < 0.01) { // Log 1% of movements to avoid spam
        console.log('🗡️ Vertical Movement:', { mouseY, normalizedY, targetY: newTargetY });
      }
    };
    
    const handleClick = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      // Rotate 45 degrees per click
      setTargetAngle(prev => prev + ROTATION_STEP);
      setIsRotating(true);
      
      // Visual feedback
      playSound(700, 0.08, 'square');
      
      console.log('🗡️ Click rotation: +45°');
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [gameState, playSound]);

  // Animation loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const animate = () => {
      const delta = clockRef.current.getDelta();
      const now = Date.now();
      
      // Smooth sword rotation towards target angle + VERTICAL MOVEMENT
      if (swordGroupRef.current) {
        // Rotation (click-based, smooth interpolation)
        const currentAngle = swordGroupRef.current.rotation.z;
        let angleDiff = targetAngle - currentAngle;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Smooth interpolation with faster rotation speed
        const maxRotation = SWORD_ROTATION_SPEED;
        const rotationStep = Math.max(-maxRotation, Math.min(maxRotation, angleDiff * 0.2));
        swordGroupRef.current.rotation.z += rotationStep;
        
        // Vertical movement (mouse Y position)
        const currentY = swordGroupRef.current.position.y;
        const yDiff = targetY - currentY;
        const yStep = yDiff * SWORD_MOVE_SPEED;
        swordGroupRef.current.position.y += yStep;
        
        // Debug logging (remove after testing)
        if (Math.abs(yStep) > 0.01 && Math.random() < 0.01) {
          console.log('⬆️⬇️ Sword Y:', { currentY: currentY.toFixed(2), targetY: targetY.toFixed(2), yStep: yStep.toFixed(3) });
        }
        
        // Pulse danger zones
        dangerZonesRef.current.forEach((zone, i) => {
          const pulse = Math.sin(now * 0.005 + i) * 0.2 + 0.8;
          zone.scale.set(pulse, pulse, pulse);
        });
      }
      
      // Spawn enemies - 70% fireballs, 30% pillars
      if (now - lastSpawnRef.current > ENEMY_SPAWN_RATE) {
        const type: 'fireball' | 'pillar' = Math.random() < 0.7 ? 'fireball' : 'pillar';
        createEnemy(type);
        lastSpawnRef.current = now;
      }
      
      // Update enemies
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;
        enemy.rotation += 0.05;
        enemy.mesh.position.set(enemy.x, enemy.y, 0);
        enemy.mesh.rotation.z = enemy.rotation;
        
        // Update glow mesh position
        if (enemy.glowMesh) {
          enemy.glowMesh.position.set(enemy.x, enemy.y, 0);
          enemy.glowMesh.rotation.z = enemy.rotation;
        }
        
        // ANIMATED EFFECTS
        if (enemy.type === 'fireball' && enemy.pulsePhase !== undefined) {
          // Pulsing/flashing effect
          enemy.pulsePhase += 0.15;
          const pulse = Math.sin(enemy.pulsePhase) * 0.5 + 0.5; // 0 to 1
          const scale = 0.8 + pulse * 0.4; // 0.8 to 1.2
          enemy.mesh.scale.set(scale, scale, scale);
          
          // Flash between orange and yellow
          const emissiveIntensity = 1.0 + pulse * 0.8;
          (enemy.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;
          
          // Glow opacity flash
          if (enemy.glowMesh) {
            (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.4;
            enemy.glowMesh.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);
          }
          
          // Create fire trail particles (10% chance per frame)
          if (Math.random() < 0.1 && sceneRef.current) {
            const trailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const trailMaterial = new THREE.MeshBasicMaterial({
              color: Math.random() < 0.5 ? 0xff4400 : 0xffaa00,
              transparent: true,
              opacity: 0.8,
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.position.set(enemy.x, enemy.y, 0);
            sceneRef.current.add(trail);
            
            // Add to trail array for cleanup
            if (!enemy.trailParticles) enemy.trailParticles = [];
            enemy.trailParticles.push(trail);
            
            // Remove trail after short time
            setTimeout(() => {
              if (sceneRef.current) {
                sceneRef.current.remove(trail);
              }
            }, 300);
          }
        } else if (enemy.type === 'pillar' && enemy.pulsePhase !== undefined) {
          // Pillar pulsing effect
          enemy.pulsePhase += 0.1;
          const pulse = Math.sin(enemy.pulsePhase) * 0.5 + 0.5;
          const emissiveIntensity = 0.6 + pulse * 0.4;
          (enemy.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = emissiveIntensity;
          
          // Glow flash
          if (enemy.glowMesh) {
            (enemy.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.3;
          }
        }
        
        // Check collision with danger zones (handle only) - BIGGER HIT RADIUS
        if (swordGroupRef.current) {
          let hitDangerZone = false;
          
          dangerZonesRef.current.forEach(zone => {
            const zoneWorldPos = new THREE.Vector3();
            zone.getWorldPosition(zoneWorldPos);
            
            const distance = Math.sqrt(
              Math.pow(enemy.x - zoneWorldPos.x, 2) +
              Math.pow(enemy.y - zoneWorldPos.y, 2)
            );
            
            // Much larger hit detection radius
            if (distance < DANGER_ZONE_HIT_RADIUS) {
              hitDangerZone = true;
              console.log('💥 DANGER ZONE HIT! Distance:', distance.toFixed(2), 'Type:', enemy.type);
            }
          });
          
          if (hitDangerZone) {
            // Hit danger zone - lose heart
            setHearts(prev => {
              const newHearts = prev - 1;
              console.log('❤️ Heart lost! Remaining:', newHearts);
              if (newHearts <= 0) {
                setGameState('ended');
              }
              return newHearts;
            });
            playSound(200, 0.3, 'sawtooth');
            createParticles(enemy.x, enemy.y, 0xff0000, 20);
            
            // Cleanup enemy and glow
            if (sceneRef.current) {
              sceneRef.current.remove(enemy.mesh);
              if (enemy.glowMesh) {
                sceneRef.current.remove(enemy.glowMesh);
              }
            }
            return false;
          }
          
          // Check collision with blade (rest of sword) - CAN DESTROY ENEMIES
          const swordWorldPos = new THREE.Vector3();
          swordGroupRef.current.getWorldPosition(swordWorldPos);
          
          const toEnemy = new THREE.Vector2(enemy.x - swordWorldPos.x, enemy.y - swordWorldPos.y);
          const swordAngle = swordGroupRef.current.rotation.z;
          const swordDir = new THREE.Vector2(Math.sin(swordAngle), -Math.cos(swordAngle));
          
          const projection = toEnemy.dot(swordDir);
          const perpDist = Math.abs(toEnemy.x * swordDir.y - toEnemy.y * swordDir.x);
          
          // Larger blade hitbox for better gameplay
          if (projection > -2.5 && projection < 2.5 && perpDist < 0.6) {
            // Hit blade - damage enemy
            enemy.health--;
            
            if (enemy.health <= 0) {
              // DESTROYED!
              const points = enemy.type === 'fireball' ? 15 : 25; // Pillars worth more
              setScore(prev => prev + points);
              setEnemiesDestroyed(prev => prev + 1);
              
              playSound(800, 0.15, 'sine');
              const particleColor = enemy.type === 'fireball' ? 0xff8800 : 0xaa44ff;
              createParticles(enemy.x, enemy.y, particleColor, 20);
              
              console.log('⚔️ Enemy destroyed:', enemy.type, '+' + points + ' points');
              
              // Cleanup
              if (sceneRef.current) {
                sceneRef.current.remove(enemy.mesh);
                if (enemy.glowMesh) {
                  sceneRef.current.remove(enemy.glowMesh);
                }
              }
              return false;
            } else {
              // Damaged but not destroyed - flash
              (enemy.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
              playSound(700, 0.1, 'square');
            }
          }
        }
        
        // Remove if off screen
        if (Math.abs(enemy.x) > 20 || Math.abs(enemy.y) > 15) {
          if (sceneRef.current) {
            sceneRef.current.remove(enemy.mesh);
            if (enemy.glowMesh) {
              sceneRef.current.remove(enemy.glowMesh);
            }
          }
          return false;
        }
        
        return true;
      });
      
      // Update particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.mesh.position.add(particle.velocity);
        particle.velocity.y -= 0.002; // Gravity
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
  }, [gameState, targetAngle, createEnemy, createParticles, playSound]);

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
          accuracy: enemiesDestroyed > 0 ? Math.min(100, (enemiesDestroyed / (enemiesDestroyed + (3 - hearts))) * 100) : 0,
        });
      }, 2000);
    }
  }, [gameState, score, enemiesDestroyed, hearts, onGameEnd, playSound]);

  // Keyboard control
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'ready') {
        startGame();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, startGame]);

  return (
    <div className="relative w-full h-screen bg-[#0a0e1a] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="text-white text-4xl font-bold drop-shadow-lg">
              Score: {score}
            </div>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`text-4xl ${i < hearts ? 'opacity-100' : 'opacity-20'}`}
                >
                  ❤️
                </div>
              ))}
            </div>
            <div className="text-cyan-400 text-2xl font-bold">
              ⚔️ Destroyed: {enemiesDestroyed}
            </div>
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
          <h1 className="text-6xl font-bold mb-8 text-cyan-400 animate-pulse">
            ⚔️ BLADE BOUNCE 3D
          </h1>
          <p className="text-2xl mb-4">🖱️ Move mouse vertically to move sword up/down</p>
          <p className="text-2xl mb-4">🖱️ Click anywhere to rotate 45°</p>
          <p className="text-xl mb-4">🔥 Fireballs (15 pts) - fast and flashing!</p>
          <p className="text-xl mb-4">⚡ Pillars (25 pts) - from top/bottom</p>
          <p className="text-xl mb-4">🛡️ Blade destroys enemies</p>
          <p className="text-xl mb-4 text-red-400">⚠️ Red circles (handle) = LOSE HEART ❤️</p>
          <p className="text-xl mb-4">❤️ 3 hearts - protect the handle!</p>
          <p className="text-3xl font-bold text-yellow-400 mb-8">{GAME_DURATION} seconds - Survive!</p>
          <button
            onClick={startGame}
            className="px-12 py-6 bg-cyan-500 hover:bg-cyan-600 text-white text-3xl font-bold rounded-lg transition-all transform hover:scale-110 pointer-events-auto"
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

