'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  
  // Player state
  const playerRef = useRef({
    position: new THREE.Vector3(0, 2, 5),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: true,
  });
  
  // Controls
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const isPointerLockedRef = useRef(false);
  const isRightMouseDownRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  
  // Sword
  const swordRef = useRef<THREE.Group | null>(null);
  const swordSlashRef = useRef(0); // Animation progress
  
  // Portals
  const portalsRef = useRef<{
    green: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
    cyan: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
  }>({ green: null, cyan: null });
  
  // Game state
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [portalMode, setPortalMode] = useState<'green' | 'cyan'>('green');
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Targets/objectives
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const [targetsCollected, setTargetsCollected] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Multi-room system
  const [currentRoom, setCurrentRoom] = useState(1);
  const disappearingPlatformsRef = useRef<THREE.Mesh[]>([]);
  const portalWallsRef = useRef<THREE.Mesh[]>([]);
  const rampsRef = useRef<{ mesh: THREE.Mesh; angle: number; axis: 'x' | 'z'; y: number; length: number }[]>([]);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(90); // 90 second game
  const gameStartTimeRef = useRef<number>(0);
  
  // Enemies
  interface Enemy {
    mesh: THREE.Group;
    health: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    state: 'idle' | 'chasing' | 'winding_up' | 'attacking' | 'hit' | 'stunned' | 'dead';
    attackCooldown: number;
    hitCooldown: number;
  }
  const enemiesRef = useRef<Enemy[]>([]);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  
  // Score ref for game end (to get latest value)
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  const [playerHealth, setPlayerHealth] = useState(3);
  const lastTeleportRef = useRef(0); // Cooldown for teleportation
  const isAttackingRef = useRef(false);

  // Check for mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return;
    
    console.log('🎮 Initializing Wormhole...');
    
    // Scene with brighter background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 30, 150); // Extended fog for 2 rooms
    sceneRef.current = scene;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;
    
    // ENHANCED LIGHTING for 2-room visibility
    const ambient = new THREE.AmbientLight(0x6666aa, 0.8); // Brighter ambient
    scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1.5);
    directional.position.set(10, 30, 10);
    directional.castShadow = true;
    scene.add(directional);
    
    // Room 1 lighting
    const point1 = new THREE.PointLight(0x3399ff, 2, 40);
    point1.position.set(-5, 10, -5);
    scene.add(point1);
    
    const point2 = new THREE.PointLight(0x00ffff, 2, 40);
    point2.position.set(5, 10, 5);
    scene.add(point2);
    
    const point3 = new THREE.PointLight(0x00ff88, 1.5, 30);
    point3.position.set(0, 20, 0);
    scene.add(point3);
    
    // Room 2 lighting
    const point4 = new THREE.PointLight(0xff6688, 2, 40);
    point4.position.set(35, 10, -5);
    scene.add(point4);
    
    const point5 = new THREE.PointLight(0xffaa00, 2, 40);
    point5.position.set(40, 10, 5);
    scene.add(point5);
    
    const point6 = new THREE.PointLight(0xff00ff, 1.5, 30);
    point6.position.set(35, 20, 0);
    scene.add(point6);
    
    // Bridge lighting
    const bridgeLight = new THREE.PointLight(0xffff00, 2, 30);
    bridgeLight.position.set(20, 25, 0);
    scene.add(bridgeLight);
    
    // Create test chamber
    createTestChamber(scene);
    
    // Create sword (attached to camera)
    createSword(camera);
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    setGameState('instructions');
    console.log('✅ Wormhole initialized');
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);
  
  // Sword action state
  const swordActionRef = useRef<'idle' | 'slash' | 'parry' | 'strike'>('idle');
  const parryActiveRef = useRef(false);
  
  // Arm ref for animations
  const armRef = useRef<THREE.Group | null>(null);
  
  // Create detailed 3D sword WITH ARM in first-person view
  const createSword = (camera: THREE.PerspectiveCamera) => {
    // Main arm+sword group for unified animation
    const armSwordGroup = new THREE.Group();
    armSwordGroup.name = 'armSword';
    
    // === CREATE 3D ARM ===
    const armMat = new THREE.MeshPhongMaterial({
      color: 0xc9a07c, // Skin tone
      emissive: 0x301a0a,
      emissiveIntensity: 0.1,
      shininess: 20,
    });
    
    // Upper arm (partially visible)
    const upperArmGeo = new THREE.CapsuleGeometry(0.06, 0.25, 8, 16);
    const upperArm = new THREE.Mesh(upperArmGeo, armMat);
    upperArm.position.set(0, -0.35, 0);
    upperArm.rotation.z = -0.3;
    armSwordGroup.add(upperArm);
    
    // Forearm
    const forearmGeo = new THREE.CapsuleGeometry(0.055, 0.35, 8, 16);
    const forearm = new THREE.Mesh(forearmGeo, armMat);
    forearm.position.set(0.08, -0.12, 0);
    forearm.rotation.z = 0.6;
    armSwordGroup.add(forearm);
    
    // Wrist
    const wristGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const wrist = new THREE.Mesh(wristGeo, armMat);
    wrist.position.set(0.18, 0.08, 0);
    armSwordGroup.add(wrist);
    
    // Hand (fist holding sword)
    const handGeo = new THREE.BoxGeometry(0.08, 0.12, 0.06);
    const hand = new THREE.Mesh(handGeo, armMat);
    hand.position.set(0.22, 0.15, 0);
    hand.rotation.z = 0.2;
    armSwordGroup.add(hand);
    
    // Fingers wrapped around handle
    const fingerMat = armMat.clone();
    for (let i = 0; i < 4; i++) {
      const fingerGeo = new THREE.CapsuleGeometry(0.015, 0.05, 4, 8);
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.set(0.24, 0.12 + i * 0.025, 0.025 - i * 0.015);
      finger.rotation.x = 0.4;
      finger.rotation.z = 0.3 + i * 0.1;
      armSwordGroup.add(finger);
    }
    
    // Thumb
    const thumbGeo = new THREE.CapsuleGeometry(0.018, 0.04, 4, 8);
    const thumb = new THREE.Mesh(thumbGeo, fingerMat);
    thumb.position.set(0.19, 0.18, -0.04);
    thumb.rotation.x = -0.4;
    thumb.rotation.y = 0.5;
    armSwordGroup.add(thumb);
    
    // === CREATE SWORD ===
    const swordGroup = new THREE.Group();
    swordGroup.name = 'sword';
    
    // Main blade shape using ExtrudeGeometry for proper 3D sword shape
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(0.06, 0.1);
    bladeShape.lineTo(0.05, 1.4);
    bladeShape.lineTo(0, 1.7); // Point
    bladeShape.lineTo(-0.05, 1.4);
    bladeShape.lineTo(-0.06, 0.1);
    bladeShape.closePath();
    
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { 
      depth: 0.02, 
      bevelEnabled: true, 
      bevelThickness: 0.005, 
      bevelSize: 0.005 
    });
    bladeGeo.center();
    bladeGeo.rotateX(Math.PI / 2);
    
    const bladeMat = new THREE.MeshPhongMaterial({
      color: 0xe0e0f0,
      emissive: 0x404060,
      emissiveIntensity: 0.3,
      shininess: 150,
      specular: 0xffffff,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.85;
    blade.name = 'blade';
    swordGroup.add(blade);
    
    // Fuller (groove in blade center)
    const fullerGeo = new THREE.BoxGeometry(0.02, 1.2, 0.025);
    const fullerMat = new THREE.MeshPhongMaterial({ color: 0x505060, shininess: 80 });
    const fuller = new THREE.Mesh(fullerGeo, fullerMat);
    fuller.position.set(0, 0.85, 0.015);
    swordGroup.add(fuller);
    
    // Glowing edges (change color with portal mode)
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, // Default green
      transparent: true,
      opacity: 0.95,
    });
    
    const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.5, 0.025), edgeMat);
    leftEdge.position.set(0.055, 0.85, 0);
    leftEdge.name = 'edge';
    swordGroup.add(leftEdge);
    
    const rightEdge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 1.5, 0.025), edgeMat.clone());
    rightEdge.position.set(-0.055, 0.85, 0);
    rightEdge.name = 'edge2';
    swordGroup.add(rightEdge);
    
    // Glowing blade tip
    const tipGeo = new THREE.ConeGeometry(0.08, 0.3, 6);
    const tipMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.98,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 1.75;
    tip.rotation.x = Math.PI;
    tip.name = 'tip';
    swordGroup.add(tip);
    
    // Ornate cross guard with curved ends
    const guardGeo = new THREE.BoxGeometry(0.45, 0.06, 0.06);
    const guardMat = new THREE.MeshPhongMaterial({
      color: 0xdaa520,
      emissive: 0x664400,
      shininess: 100,
    });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.08;
    swordGroup.add(guard);
    
    // Guard end caps (curves)
    const guardCapGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const leftCap = new THREE.Mesh(guardCapGeo, guardMat.clone());
    leftCap.position.set(-0.225, 0.08, 0);
    swordGroup.add(leftCap);
    const rightCap = new THREE.Mesh(guardCapGeo, guardMat.clone());
    rightCap.position.set(0.225, 0.08, 0);
    swordGroup.add(rightCap);
    
    // Glowing gems on guard
    const gemGeo = new THREE.OctahedronGeometry(0.035, 0);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    
    const gem1 = new THREE.Mesh(gemGeo, gemMat);
    gem1.position.set(0.15, 0.08, 0.04);
    gem1.rotation.y = Math.PI / 4;
    gem1.name = 'gem1';
    swordGroup.add(gem1);
    
    const gem2 = new THREE.Mesh(gemGeo, gemMat.clone());
    gem2.position.set(-0.15, 0.08, 0.04);
    gem2.rotation.y = Math.PI / 4;
    gem2.name = 'gem2';
    swordGroup.add(gem2);
    
    // Leather handle with wrap detail
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.35, 12);
    const handleMat = new THREE.MeshPhongMaterial({
      color: 0x5a3015,
      emissive: 0x1a0a05,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.12;
    swordGroup.add(handle);
    
    // Handle wrapping rings
    for (let i = 0; i < 5; i++) {
      const ringGeo = new THREE.TorusGeometry(0.04, 0.005, 6, 12);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshPhongMaterial({ color: 0x996633, shininess: 40 }));
      ring.position.y = -0.28 + i * 0.08;
      ring.rotation.x = Math.PI / 2;
      swordGroup.add(ring);
    }
    
    // Ornate pommel
    const pommelGeo = new THREE.DodecahedronGeometry(0.055, 0);
    const pommelMat = new THREE.MeshPhongMaterial({ color: 0xdaa520, emissive: 0x442200, shininess: 80 });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.38;
    swordGroup.add(pommel);
    
    // Pommel center gem
    const pommelGem = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), gemMat.clone());
    pommelGem.position.y = -0.38;
    pommelGem.name = 'gem3';
    swordGroup.add(pommelGem);
    
    // Position sword relative to hand
    swordGroup.position.set(0.22, 0.2, 0);
    swordGroup.rotation.set(0.1, 0.1, 0.15);
    
    armSwordGroup.add(swordGroup);
    
    // Position arm+sword combo in first-person view (bottom right, angled)
    armSwordGroup.position.set(0.55, -0.45, -0.8);
    armSwordGroup.rotation.set(0.1, -0.4, 0.05);
    armSwordGroup.scale.set(1.1, 1.1, 1.1);
    
    camera.add(armSwordGroup);
    armRef.current = armSwordGroup;
    swordRef.current = swordGroup;
  };
  
  // Update sword color based on portal mode
  const updateSwordColor = (mode: 'green' | 'cyan') => {
    if (!swordRef.current) return;
    
    const color = mode === 'green' ? 0x00ff88 : 0x00ffff;
    
    // Update all glowing parts
    ['edge', 'edge2', 'tip', 'gem1', 'gem2'].forEach(name => {
      const mesh = swordRef.current?.getObjectByName(name) as THREE.Mesh;
      if (mesh && mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
    });
  };
  
  // Sword slash animation (for shooting portals) - wide horizontal swing
  const animateSwordSlash = () => {
    swordSlashRef.current = 1.0;
    swordActionRef.current = 'slash';
    isAttackingRef.current = true;
    setTimeout(() => { 
      isAttackingRef.current = false;
      swordActionRef.current = 'idle';
    }, 350);
  };
  
  // Sword parry animation (X key) - bring sword up to block
  const animateSwordParry = () => {
    if (swordActionRef.current !== 'idle') return;
    swordSlashRef.current = 1.0;
    swordActionRef.current = 'parry';
    parryActiveRef.current = true;
    setTimeout(() => {
      parryActiveRef.current = false;
      swordActionRef.current = 'idle';
    }, 450);
  };
  
  // Sword strike animation (V key) - thrust forward
  const animateSwordStrike = () => {
    if (swordActionRef.current !== 'idle') return;
    swordSlashRef.current = 1.0;
    swordActionRef.current = 'strike';
    isAttackingRef.current = true;
    setTimeout(() => {
      isAttackingRef.current = false;
      swordActionRef.current = 'idle';
    }, 400);
  };
  
  // Update arm+sword animation each frame
  const updateArmAnimation = (delta: number) => {
    if (!armRef.current || !swordRef.current) return;
    
    const arm = armRef.current;
    const sword = swordRef.current;
    const action = swordActionRef.current;
    const progress = swordSlashRef.current;
    
    // Base position
    const basePos = { x: 0.55, y: -0.45, z: -0.8 };
    const baseRot = { x: 0.1, y: -0.4, z: 0.05 };
    
    if (action === 'idle') {
      // Subtle breathing/idle motion
      const breathe = Math.sin(Date.now() * 0.003) * 0.015;
      const sway = Math.sin(Date.now() * 0.002) * 0.01;
      arm.position.set(basePos.x + sway, basePos.y + breathe, basePos.z);
      arm.rotation.set(baseRot.x, baseRot.y + sway * 0.5, baseRot.z);
      sword.rotation.set(0.1, 0.1, 0.15);
    } else if (action === 'slash') {
      // Wide horizontal slash for portal shooting
      const t = 1 - progress;
      const swingAngle = Math.sin(t * Math.PI) * 1.2; // Swing arc
      arm.rotation.set(
        baseRot.x - t * 0.3,
        baseRot.y + swingAngle,
        baseRot.z + t * 0.4
      );
      sword.rotation.set(0.1 - t * 0.5, 0.1 + swingAngle * 0.5, 0.15 + t * 0.6);
      arm.position.set(basePos.x + t * 0.1, basePos.y + t * 0.15, basePos.z - t * 0.15);
      swordSlashRef.current = Math.max(0, progress - delta * 3.5);
    } else if (action === 'parry') {
      // Bring sword up to block position
      const t = 1 - progress;
      const blockHeight = Math.sin(t * Math.PI * 0.5) * 0.5;
      arm.position.set(basePos.x - t * 0.15, basePos.y + blockHeight, basePos.z + t * 0.1);
      arm.rotation.set(baseRot.x + t * 0.5, baseRot.y + t * 0.3, baseRot.z - t * 0.4);
      sword.rotation.set(0.1 + t * 0.8, 0.1, 0.15 - t * 0.5);
      swordSlashRef.current = Math.max(0, progress - delta * 2.5);
    } else if (action === 'strike') {
      // Forward thrust
      const t = 1 - progress;
      const thrust = Math.sin(t * Math.PI) * 0.4;
      arm.position.set(basePos.x - t * 0.1, basePos.y + t * 0.1, basePos.z - thrust);
      arm.rotation.set(baseRot.x - t * 0.3, baseRot.y, baseRot.z);
      sword.rotation.set(0.1 - t * 0.4, 0.1, 0.15);
      swordSlashRef.current = Math.max(0, progress - delta * 3.0);
    }
  };
  
  // Create demon enemy with sword
  const createEnemy = (scene: THREE.Scene, x: number, z: number): Enemy => {
    const enemyGroup = new THREE.Group();
    
    // Demonic body (humanoid shape)
    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.9, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a0808,
      emissive: 0x220000,
      emissiveIntensity: 0.4,
      metalness: 0.4,
      roughness: 0.6,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.name = 'body';
    enemyGroup.add(body);
    
    // Demon head (larger, more menacing)
    const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x3a0a0a,
      emissive: 0x110000,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.3;
    head.scale.set(1, 1.1, 0.9);
    enemyGroup.add(head);
    
    // Horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x1a0505, metalness: 0.5, roughness: 0.3 });
    const hornGeo = new THREE.ConeGeometry(0.06, 0.35, 6);
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.2, 1.5, 0);
    leftHorn.rotation.z = -0.4;
    enemyGroup.add(leftHorn);
    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(0.2, 1.5, 0);
    rightHorn.rotation.z = 0.4;
    enemyGroup.add(rightHorn);
    
    // Glowing eyes (2 eyes)
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.35, 0.25);
    leftEye.name = 'eye';
    enemyGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.1, 1.35, 0.25);
    rightEye.name = 'eye2';
    enemyGroup.add(rightEye);
    
    // Enemy Sword (held in right "arm" position)
    const swordGroup = new THREE.Group();
    swordGroup.name = 'enemySword';
    
    // Sword blade
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x555566,
      metalness: 0.9,
      roughness: 0.1,
    });
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.8, 0.015);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.4;
    swordGroup.add(blade);
    
    // Sword glow edge (changes with attack state)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0044ff, // Blue default (wind-up color)
      transparent: true,
      opacity: 0.8,
    });
    const glowGeo = new THREE.BoxGeometry(0.01, 0.8, 0.02);
    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.set(0.025, 0.4, 0);
    leftGlow.name = 'swordGlow';
    swordGroup.add(leftGlow);
    const rightGlow = new THREE.Mesh(glowGeo, glowMat.clone());
    rightGlow.position.set(-0.025, 0.4, 0);
    rightGlow.name = 'swordGlow2';
    swordGroup.add(rightGlow);
    
    // Sword tip
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.9 });
    const tipGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.85;
    tip.rotation.x = Math.PI;
    tip.name = 'swordTip';
    swordGroup.add(tip);
    
    // Sword guard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x442200, metalness: 0.7 });
    const guardGeo = new THREE.BoxGeometry(0.15, 0.03, 0.03);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    swordGroup.add(guard);
    
    // Sword handle
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x331100 });
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.1;
    swordGroup.add(handle);
    
    // Position sword at "arm" position
    swordGroup.position.set(0.5, 0.6, 0.2);
    swordGroup.rotation.z = -0.3;
    enemyGroup.add(swordGroup);
    
    enemyGroup.position.set(x, 0, z);
    scene.add(enemyGroup);
    
    return {
      mesh: enemyGroup,
      health: 3,
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      state: 'idle',
      attackCooldown: 0,
      hitCooldown: 0,
    };
  };

  // Create multi-room test chamber with advanced features
  const createTestChamber = (scene: THREE.Scene) => {
    // === ROOM 1 (Main Chamber) ===
    const room1OffsetX = 0;
    const room1OffsetZ = 0;
    
    // === ROOM 2 (Connected via bridge at top) ===
    const room2OffsetX = 35; // Next room to the right
    const room2OffsetZ = 0;
    
    // Floor for Room 1
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const floor1 = new THREE.Mesh(floorGeo, floorMat);
    floor1.rotation.x = -Math.PI / 2;
    floor1.position.set(room1OffsetX, 0, room1OffsetZ);
    floor1.receiveShadow = true;
    scene.add(floor1);
    
    // Floor for Room 2
    const floor2 = new THREE.Mesh(floorGeo, floorMat.clone());
    floor2.rotation.x = -Math.PI / 2;
    floor2.position.set(room2OffsetX, 0, room2OffsetZ);
    floor2.receiveShadow = true;
    scene.add(floor2);
    
    // Grids
    const gridHelper1 = new THREE.GridHelper(30, 30, 0x4444ff, 0x222244);
    gridHelper1.position.set(room1OffsetX, 0, room1OffsetZ);
    scene.add(gridHelper1);
    const gridHelper2 = new THREE.GridHelper(30, 30, 0xff4444, 0x442222);
    gridHelper2.position.set(room2OffsetX, 0, room2OffsetZ);
    scene.add(gridHelper2);
    
    // Wall height and materials
    const wallHeight = 28;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, side: THREE.DoubleSide });
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x664455, roughness: 0.5, side: THREE.DoubleSide });
    
    // === ROOM 1 WALLS ===
    // Back wall
    const backWall1 = new THREE.Mesh(new THREE.PlaneGeometry(30, wallHeight), wallMat);
    backWall1.position.set(room1OffsetX, wallHeight/2, room1OffsetZ - 15);
    backWall1.userData.portalable = true;
    scene.add(backWall1);
    
    // Front wall (with opening to bridge at top)
    const frontWall1 = new THREE.Mesh(new THREE.PlaneGeometry(30, wallHeight), wallMat.clone());
    frontWall1.position.set(room1OffsetX, wallHeight/2, room1OffsetZ + 15);
    frontWall1.rotation.y = Math.PI;
    frontWall1.userData.portalable = true;
    scene.add(frontWall1);
    
    // Left wall
    const leftWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallHeight, 30), wallMat.clone());
    leftWall1.position.set(room1OffsetX - 15, wallHeight/2, room1OffsetZ);
    leftWall1.userData.portalable = true;
    scene.add(leftWall1);
    
    // Right wall (partial - has bridge opening at top)
    const rightWall1Bottom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 30), wallMat.clone());
    rightWall1Bottom.position.set(room1OffsetX + 15, 10, room1OffsetZ);
    rightWall1Bottom.userData.portalable = true;
    scene.add(rightWall1Bottom);
    
    // Ceiling Room 1
    const ceiling1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    ceiling1.position.set(room1OffsetX, wallHeight, room1OffsetZ);
    ceiling1.rotation.x = Math.PI / 2;
    scene.add(ceiling1);
    
    // === ROOM 2 WALLS ===
    const backWall2 = new THREE.Mesh(new THREE.PlaneGeometry(30, wallHeight), wallMat2);
    backWall2.position.set(room2OffsetX, wallHeight/2, room2OffsetZ - 15);
    backWall2.userData.portalable = true;
    scene.add(backWall2);
    
    const frontWall2 = new THREE.Mesh(new THREE.PlaneGeometry(30, wallHeight), wallMat2.clone());
    frontWall2.position.set(room2OffsetX, wallHeight/2, room2OffsetZ + 15);
    frontWall2.rotation.y = Math.PI;
    frontWall2.userData.portalable = true;
    scene.add(frontWall2);
    
    // Left wall Room 2 (partial - has bridge opening)
    const leftWall2Bottom = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 30), wallMat2.clone());
    leftWall2Bottom.position.set(room2OffsetX - 15, 10, room2OffsetZ);
    leftWall2Bottom.userData.portalable = true;
    scene.add(leftWall2Bottom);
    
    const rightWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wallHeight, 30), wallMat2.clone());
    rightWall2.position.set(room2OffsetX + 15, wallHeight/2, room2OffsetZ);
    rightWall2.userData.portalable = true;
    scene.add(rightWall2);
    
    const ceiling2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x332233 }));
    ceiling2.position.set(room2OffsetX, wallHeight, room2OffsetZ);
    ceiling2.rotation.x = Math.PI / 2;
    scene.add(ceiling2);
    
    // === BRIDGE CONNECTING ROOMS at y=22 ===
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200, roughness: 0.3 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 6), bridgeMat);
    bridge.position.set(room1OffsetX + 20, 22, 0);
    scene.add(bridge);
    
    // Bridge railings (visual)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 0.2), railMat);
    leftRail.position.set(room1OffsetX + 20, 22.75, -2.9);
    scene.add(leftRail);
    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 0.2), railMat);
    rightRail.position.set(room1OffsetX + 20, 22.75, 2.9);
    scene.add(rightRail);
    
    // Platform materials
    const platformMat1 = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6 });
    const platformMat2 = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.5, emissive: 0x111122 });
    const platformMat3 = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.4, emissive: 0x222233 });
    const platformMat4 = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.3, emissive: 0x334455 });
    const platformMatDisappear = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x441100, roughness: 0.3 });
    const platformMatTop = new THREE.MeshStandardMaterial({ color: 0xbbddff, roughness: 0.15, emissive: 0x668899, emissiveIntensity: 0.6 });
    
    // Clear refs
    disappearingPlatformsRef.current = [];
    portalWallsRef.current = [];
    rampsRef.current = [];
    
    // === ROOM 1 PLATFORMS ===
    const room1Platforms = [
      // Story 1 (y=2)
      { x: -8, y: 2, z: -8, w: 5, d: 5, mat: platformMat1, disappearing: false },
      { x: 8, y: 2, z: -8, w: 5, d: 5, mat: platformMat1, disappearing: false },
      { x: 0, y: 2, z: -12, w: 4, d: 4, mat: platformMat1, disappearing: false },
      { x: -10, y: 2, z: 8, w: 4, d: 4, mat: platformMat1, disappearing: false },
      { x: 10, y: 2, z: 8, w: 4, d: 4, mat: platformMat1, disappearing: false },
      // Story 2 (y=5)
      { x: -10, y: 5, z: 0, w: 4, d: 4, mat: platformMat2, disappearing: false, hasWall: true },
      { x: 10, y: 5, z: 0, w: 4, d: 4, mat: platformMat2, disappearing: false, hasWall: true },
      { x: 0, y: 5, z: 8, w: 6, d: 4, mat: platformMat2, disappearing: false },
      { x: 0, y: 5, z: -8, w: 5, d: 4, mat: platformMat2, disappearing: false },
      // Story 3 (y=8) - Some disappearing!
      { x: -6, y: 8, z: -6, w: 4, d: 4, mat: platformMatDisappear, disappearing: true },
      { x: 6, y: 8, z: -6, w: 4, d: 4, mat: platformMat3, disappearing: false },
      { x: 0, y: 8, z: 0, w: 5, d: 5, mat: platformMat3, disappearing: false, hasWall: true },
      { x: -8, y: 8, z: 6, w: 3, d: 3, mat: platformMatDisappear, disappearing: true },
      { x: 8, y: 8, z: 6, w: 3, d: 3, mat: platformMat3, disappearing: false },
      // Story 4 (y=11)
      { x: -5, y: 11, z: 0, w: 4, d: 4, mat: platformMat4, disappearing: false },
      { x: 5, y: 11, z: 0, w: 4, d: 4, mat: platformMatDisappear, disappearing: true },
      { x: 0, y: 11, z: -10, w: 5, d: 3, mat: platformMat4, disappearing: false, hasWall: true },
      { x: 0, y: 11, z: 10, w: 5, d: 3, mat: platformMat4, disappearing: false },
      // Story 5 (y=14)
      { x: -8, y: 14, z: -4, w: 3, d: 3, mat: platformMatDisappear, disappearing: true },
      { x: 8, y: 14, z: 4, w: 3, d: 3, mat: platformMat4, disappearing: false },
      { x: 0, y: 14, z: 0, w: 4, d: 4, mat: platformMat4, disappearing: false, hasWall: true },
      // Story 6 (y=17)
      { x: -4, y: 17, z: 4, w: 3, d: 3, mat: platformMat4, disappearing: false },
      { x: 4, y: 17, z: -4, w: 3, d: 3, mat: platformMatDisappear, disappearing: true },
      { x: 0, y: 17, z: 8, w: 4, d: 3, mat: platformMat4, disappearing: false },
      // Story 7 (y=20) - Bridge level!
      { x: 0, y: 20, z: 0, w: 8, d: 8, mat: platformMatTop, disappearing: false },
      { x: 12, y: 22, z: 0, w: 4, d: 4, mat: platformMatTop, disappearing: false }, // Bridge entry
    ];
    
    // === ROOM 2 PLATFORMS ===
    const room2Platforms = [
      // Lower platforms
      { x: room2OffsetX - 8, y: 2, z: -8, w: 5, d: 5, mat: platformMat1, disappearing: false },
      { x: room2OffsetX + 8, y: 2, z: -8, w: 5, d: 5, mat: platformMat1, disappearing: false },
      { x: room2OffsetX, y: 2, z: 8, w: 6, d: 6, mat: platformMat1, disappearing: false },
      // Mid platforms
      { x: room2OffsetX - 10, y: 6, z: 0, w: 4, d: 4, mat: platformMat2, disappearing: false, hasWall: true },
      { x: room2OffsetX + 10, y: 6, z: 0, w: 4, d: 4, mat: platformMat2, disappearing: false },
      { x: room2OffsetX, y: 6, z: -10, w: 5, d: 4, mat: platformMatDisappear, disappearing: true },
      // Upper platforms
      { x: room2OffsetX - 6, y: 10, z: -6, w: 4, d: 4, mat: platformMat3, disappearing: false, hasWall: true },
      { x: room2OffsetX + 6, y: 10, z: 6, w: 4, d: 4, mat: platformMatDisappear, disappearing: true },
      { x: room2OffsetX, y: 10, z: 0, w: 5, d: 5, mat: platformMat3, disappearing: false },
      // Higher platforms
      { x: room2OffsetX - 4, y: 14, z: 4, w: 3, d: 3, mat: platformMat4, disappearing: false },
      { x: room2OffsetX + 4, y: 14, z: -4, w: 3, d: 3, mat: platformMat4, disappearing: false, hasWall: true },
      { x: room2OffsetX, y: 14, z: 8, w: 4, d: 3, mat: platformMatDisappear, disappearing: true },
      // Top platforms
      { x: room2OffsetX, y: 18, z: 0, w: 6, d: 6, mat: platformMatTop, disappearing: false },
      { x: room2OffsetX - 8, y: 22, z: 0, w: 4, d: 4, mat: platformMatTop, disappearing: false }, // Bridge entry
    ];
    
    const allPlatforms = [...room1Platforms, ...room2Platforms];
    
    allPlatforms.forEach(p => {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.5, p.d), p.mat.clone());
      platform.position.set(p.x, p.y, p.z);
      platform.castShadow = true;
      platform.receiveShadow = true;
      platform.userData.isPlatform = true;
      platform.userData.disappearing = p.disappearing;
      scene.add(platform);
      
      // Track disappearing platforms
      if (p.disappearing) {
        disappearingPlatformsRef.current.push(platform);
      }
      
      // Add edge glow
      if (p.y > 3) {
        const edgeGeo = new THREE.BoxGeometry(p.w + 0.1, 0.1, p.d + 0.1);
        const glowColor = p.disappearing ? 0xff4400 : (p.y > 15 ? 0x00ffff : (p.y > 10 ? 0x00ff88 : 0x6666ff));
        const edgeMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.6 });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(p.x, p.y - 0.2, p.z);
        edge.userData.isGlow = true;
        edge.userData.parentPlatform = platform;
        scene.add(edge);
      }
      
      // Add portal wall on platform (requires portal to cross!)
      if (p.hasWall) {
        const portalWallMat = new THREE.MeshStandardMaterial({ 
          color: 0x00ff88, 
          emissive: 0x004422,
          transparent: true,
          opacity: 0.8,
        });
        const portalWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, p.d - 0.5), portalWallMat);
        portalWall.position.set(p.x, p.y + 1.75, p.z);
        portalWall.userData.portalable = true;
        portalWall.userData.isPortalWall = true;
        scene.add(portalWall);
        portalWallsRef.current.push(portalWall);
      }
    });
    
    // === RAMPS (with collision data) ===
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5 });
    
    // Helper function to add ramp with collision data
    const addRamp = (x: number, y: number, z: number, w: number, l: number, angle: number, axis: 'x' | 'z' = 'x') => {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, l), rampMat);
      ramp.position.set(x, y, z);
      if (axis === 'x') {
        ramp.rotation.x = angle;
      } else {
        ramp.rotation.z = angle;
      }
      ramp.userData.isRamp = true;
      scene.add(ramp);
      rampsRef.current.push({ mesh: ramp, angle, axis, y, length: l });
    };
    
    // Room 1 ramps
    addRamp(-10, 3.5, -4, 2.5, 8, 0.25, 'x');
    addRamp(10, 3.5, 4, 2.5, 8, -0.25, 'x');
    addRamp(0, 6.5, 4, 2, 6, 0.3, 'x');
    addRamp(-3, 9.5, 0, 2, 6, 0.28, 'x');
    addRamp(3, 12.5, -2, 2, 5, 0.35, 'x');
    addRamp(-2, 15.5, 2, 2, 5, 0.35, 'x');
    addRamp(0, 18.5, 4, 3, 6, 0.3, 'x');
    
    // Room 2 ramps
    addRamp(room2OffsetX - 8, 4, 4, 2, 6, 0.3, 'x');
    addRamp(room2OffsetX + 8, 4, -4, 2, 6, -0.3, 'x');
    addRamp(room2OffsetX, 8, 4, 2, 5, 0.35, 'x');
    addRamp(room2OffsetX - 4, 12, 0, 2, 5, 0.35, 'x');
    addRamp(room2OffsetX + 4, 16, -2, 2, 5, 0.3, 'x');
    addRamp(room2OffsetX, 20, 3, 3, 5, 0.25, 'x');
    
    // Add collectible NEON CRYSTALS (spread across BOTH rooms)
    const neonColors = [
      0x00ffff, // Cyan
      0xff00ff, // Magenta
      0x00ff88, // Green
      0xff6600, // Orange
      0x6666ff, // Purple
      0xffff00, // Yellow
    ];
    
    // Room 2 X offset for targets
    const r2x = 35;
    
    const targetPositions = [
      // ROOM 1 targets
      { x: -8, y: 3.5, z: -8 },
      { x: 8, y: 3.5, z: -8 },
      { x: -10, y: 6.5, z: 0 },
      { x: 10, y: 6.5, z: 0 },
      { x: 0, y: 9.5, z: 0 },
      { x: -5, y: 12.5, z: 0 },
      { x: 0, y: 15.5, z: 0 },
      { x: 0, y: 21.5, z: 0 },
      // ROOM 2 targets (after crossing bridge!)
      { x: r2x - 8, y: 3.5, z: -8 },
      { x: r2x + 8, y: 3.5, z: -8 },
      { x: r2x - 10, y: 7.5, z: 0 },
      { x: r2x, y: 11.5, z: 0 },
      { x: r2x - 4, y: 15.5, z: 4 },
      { x: r2x, y: 19.5, z: 0 },
    ];
    
    targetsRef.current = [];
    targetPositions.forEach((pos, index) => {
      const neonColor = neonColors[index % neonColors.length];
      
      // Main crystal mesh (octahedron with glow)
      const crystalGeo = new THREE.OctahedronGeometry(0.6, 1);
      const crystalMat = new THREE.MeshStandardMaterial({ 
        color: neonColor, 
        emissive: neonColor,
        emissiveIntensity: 2,
        metalness: 0.9,
        roughness: 0.1,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(pos.x, pos.y, pos.z);
      crystal.userData.isTarget = true;
      crystal.userData.baseY = pos.y;
      crystal.userData.neonColor = neonColor;
      scene.add(crystal);
      
      // Add glow sphere around crystal
      const glowGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: neonColor,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(crystal.position);
      glow.userData.parentCrystal = crystal;
      scene.add(glow);
      
      // Add point light
      const light = new THREE.PointLight(neonColor, 1.5, 8);
      light.position.copy(crystal.position);
      scene.add(light);
      
      targetsRef.current.push(crystal);
    });
    
    setTotalTargets(targetPositions.length);
    setTargetsCollected(0);
    
    // Spawn enemies in BOTH rooms
    enemiesRef.current = [];
    const enemyPositions = [
      // Room 1 enemies
      { x: -5, z: 0 },
      { x: 5, z: -5 },
      { x: 0, z: -10 },
      { x: 10, z: 5 },
      { x: -8, z: 8 },
      // Room 2 enemies
      { x: room2OffsetX - 5, z: 0 },
      { x: room2OffsetX + 5, z: -5 },
      { x: room2OffsetX, z: 8 },
    ];
    enemyPositions.forEach(pos => {
      const enemy = createEnemy(scene, pos.x, pos.z);
      enemiesRef.current.push(enemy);
    });
  };
  
  // Shoot portal
  const shootPortal = (color: 'green' | 'cyan') => {
    if (!cameraRef.current || !sceneRef.current) return;
    
    // Trigger sword slash animation
    animateSwordSlash();
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    
    for (const hit of intersects) {
      if (hit.object.userData.portalable && hit.face) {
        // Remove old portal of this color
        const oldPortal = portalsRef.current[color];
        if (oldPortal?.mesh) {
          sceneRef.current.remove(oldPortal.mesh);
        }
        
        // Create new portal
        const portalColor = color === 'green' ? 0x00ff88 : 0x00ffff;
        const portalGeo = new THREE.TorusGeometry(1.2, 0.15, 16, 32);
        const portalMat = new THREE.MeshStandardMaterial({
          color: portalColor,
          emissive: portalColor,
          emissiveIntensity: 1,
        });
        const portalMesh = new THREE.Mesh(portalGeo, portalMat);
        
        // Position portal on wall
        portalMesh.position.copy(hit.point);
        portalMesh.position.add(hit.face.normal.clone().multiplyScalar(0.1));
        
        // Orient portal to face outward from wall
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(up, hit.face.normal).normalize();
        const adjustedUp = new THREE.Vector3().crossVectors(hit.face.normal, right).normalize();
        portalMesh.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(right, adjustedUp, hit.face.normal)
        );
        
        // Add inner glow
        const innerGeo = new THREE.CircleGeometry(1, 32);
        const innerMat = new THREE.MeshBasicMaterial({
          color: portalColor,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        portalMesh.add(inner);
        
        sceneRef.current.add(portalMesh);
        
        portalsRef.current[color] = {
          mesh: portalMesh,
          position: hit.point.clone(),
          normal: hit.face.normal.clone(),
        };
        
        setMessage(`${color.toUpperCase()} portal placed!`);
        setTimeout(() => setMessage(''), 1500);
        
        // Check if both portals exist
        if (portalsRef.current.green && portalsRef.current.cyan) {
          setScore(prev => prev + 50);
          setMessage('Portals linked! +50');
          setTimeout(() => setMessage(''), 1500);
        }
        
        break;
      }
    }
  };
  
  // Check portal teleportation
  const checkPortalTeleport = () => {
    const player = playerRef.current;
    const green = portalsRef.current.green;
    const cyan = portalsRef.current.cyan;
    const now = Date.now();
    
    if (!green || !cyan) return;
    
    // Cooldown to prevent instant re-teleport
    if (now - lastTeleportRef.current < 500) return;
    
    const distToGreen = player.position.distanceTo(green.position);
    const distToCyan = player.position.distanceTo(cyan.position);
    
    const teleportDist = 1.5;
    
    const teleportTo = (exitPortal: { position: THREE.Vector3; normal: THREE.Vector3 }) => {
      // Position player at exit portal
      player.position.copy(exitPortal.position);
      player.position.add(exitPortal.normal.clone().multiplyScalar(2.5));
      
      // Calculate exit velocity - momentum in the direction of exit portal normal
      const entrySpeed = Math.max(player.velocity.length(), 5); // Minimum exit speed
      player.velocity.copy(exitPortal.normal.clone().multiplyScalar(entrySpeed));
      
      // Also add a bit of upward momentum if exiting from a wall
      if (Math.abs(exitPortal.normal.y) < 0.5) {
        player.velocity.y = Math.max(player.velocity.y, 3);
      }
      
      // Rotate player to face AWAY from the exit portal (opposite direction)
      // Calculate the yaw angle from the exit portal normal
      const exitYaw = Math.atan2(-exitPortal.normal.x, -exitPortal.normal.z);
      player.yaw = exitYaw;
      player.pitch = 0; // Reset pitch to level
      
      // Player is now in the air
      player.onGround = false;
      
      lastTeleportRef.current = now;
      setScore(prev => prev + 100);
      setMessage('Teleported! +100');
      setTimeout(() => setMessage(''), 1500);
    };
    
    if (distToGreen < teleportDist) {
      teleportTo(cyan);
    } else if (distToCyan < teleportDist) {
      teleportTo(green);
    }
  };
  
  // Check target collection
  const checkTargets = () => {
    const player = playerRef.current;
    
    targetsRef.current.forEach((target, index) => {
      if (!target.visible) return;
      
      const dist = player.position.distanceTo(target.position);
      if (dist < 1.5) {
        target.visible = false;
        setScore(prev => prev + 200);
        setTargetsCollected(prev => prev + 1);
        setMessage('Target collected! +200');
        setTimeout(() => setMessage(''), 1500);
      }
    });
  };
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let running = true;
    
    const gameLoop = () => {
      if (!running) return;
      
      const delta = Math.min(clockRef.current.getDelta(), 0.1);
      const player = playerRef.current;
      const keys = keysRef.current;
      
      // Movement with Sprint (Shift key)
      const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
      const moveSpeed = (isSprinting ? 16 : 8) * delta; // 2x speed when sprinting
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      
      if (keys['KeyW'] || keys['ArrowUp']) {
        player.position.add(forward.clone().multiplyScalar(moveSpeed));
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        player.position.add(forward.clone().multiplyScalar(-moveSpeed));
      }
      if (keys['KeyA'] || keys['ArrowLeft']) {
        player.position.add(right.clone().multiplyScalar(-moveSpeed));
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        player.position.add(right.clone().multiplyScalar(moveSpeed));
      }
      
      // Gravity
      player.velocity.y -= 20 * delta;
      
      // Horizontal velocity decay (momentum slows down)
      const horizontalSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
      if (horizontalSpeed > 0.1) {
        const decayRate = player.onGround ? 8 : 3; // Faster decay on ground
        const decay = Math.min(decayRate * delta, horizontalSpeed);
        const factor = (horizontalSpeed - decay) / horizontalSpeed;
        player.velocity.x *= factor;
        player.velocity.z *= factor;
      } else {
        player.velocity.x = 0;
        player.velocity.z = 0;
      }
      
      player.position.add(player.velocity.clone().multiplyScalar(delta));
      
      // Floor collision
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
      
      // Toggle disappearing platforms every 5 seconds
      const disappearPhase = Math.floor(elapsed / 5) % 2 === 0;
      disappearingPlatformsRef.current.forEach(platform => {
        platform.visible = disappearPhase;
        // Also hide the glow
        if (sceneRef.current) {
          sceneRef.current.children.forEach(child => {
            if (child.userData.isGlow && child.userData.parentPlatform === platform) {
              child.visible = disappearPhase;
            }
          });
        }
      });
      
      // Room 2 offset for collision
      const room2X = 35;
      
      // Platform collisions (BOTH ROOMS + BRIDGE)
      const platforms = [
        // ROOM 1 platforms
        { x: -8, y: 2.25, z: -8, w: 5, d: 5, disappearing: false },
        { x: 8, y: 2.25, z: -8, w: 5, d: 5, disappearing: false },
        { x: 0, y: 2.25, z: -12, w: 4, d: 4, disappearing: false },
        { x: -10, y: 2.25, z: 8, w: 4, d: 4, disappearing: false },
        { x: 10, y: 2.25, z: 8, w: 4, d: 4, disappearing: false },
        { x: -10, y: 5.25, z: 0, w: 4, d: 4, disappearing: false },
        { x: 10, y: 5.25, z: 0, w: 4, d: 4, disappearing: false },
        { x: 0, y: 5.25, z: 8, w: 6, d: 4, disappearing: false },
        { x: 0, y: 5.25, z: -8, w: 5, d: 4, disappearing: false },
        { x: -6, y: 8.25, z: -6, w: 4, d: 4, disappearing: true },
        { x: 6, y: 8.25, z: -6, w: 4, d: 4, disappearing: false },
        { x: 0, y: 8.25, z: 0, w: 5, d: 5, disappearing: false },
        { x: -8, y: 8.25, z: 6, w: 3, d: 3, disappearing: true },
        { x: 8, y: 8.25, z: 6, w: 3, d: 3, disappearing: false },
        { x: -5, y: 11.25, z: 0, w: 4, d: 4, disappearing: false },
        { x: 5, y: 11.25, z: 0, w: 4, d: 4, disappearing: true },
        { x: 0, y: 11.25, z: -10, w: 5, d: 3, disappearing: false },
        { x: 0, y: 11.25, z: 10, w: 5, d: 3, disappearing: false },
        { x: -8, y: 14.25, z: -4, w: 3, d: 3, disappearing: true },
        { x: 8, y: 14.25, z: 4, w: 3, d: 3, disappearing: false },
        { x: 0, y: 14.25, z: 0, w: 4, d: 4, disappearing: false },
        { x: -4, y: 17.25, z: 4, w: 3, d: 3, disappearing: false },
        { x: 4, y: 17.25, z: -4, w: 3, d: 3, disappearing: true },
        { x: 0, y: 17.25, z: 8, w: 4, d: 3, disappearing: false },
        { x: 0, y: 20.25, z: 0, w: 8, d: 8, disappearing: false },
        { x: 12, y: 22.25, z: 0, w: 4, d: 4, disappearing: false },
        // BRIDGE
        { x: 20, y: 22.25, z: 0, w: 10, d: 6, disappearing: false },
        // ROOM 2 platforms
        { x: room2X - 8, y: 2.25, z: -8, w: 5, d: 5, disappearing: false },
        { x: room2X + 8, y: 2.25, z: -8, w: 5, d: 5, disappearing: false },
        { x: room2X, y: 2.25, z: 8, w: 6, d: 6, disappearing: false },
        { x: room2X - 10, y: 6.25, z: 0, w: 4, d: 4, disappearing: false },
        { x: room2X + 10, y: 6.25, z: 0, w: 4, d: 4, disappearing: false },
        { x: room2X, y: 6.25, z: -10, w: 5, d: 4, disappearing: true },
        { x: room2X - 6, y: 10.25, z: -6, w: 4, d: 4, disappearing: false },
        { x: room2X + 6, y: 10.25, z: 6, w: 4, d: 4, disappearing: true },
        { x: room2X, y: 10.25, z: 0, w: 5, d: 5, disappearing: false },
        { x: room2X - 4, y: 14.25, z: 4, w: 3, d: 3, disappearing: false },
        { x: room2X + 4, y: 14.25, z: -4, w: 3, d: 3, disappearing: false },
        { x: room2X, y: 14.25, z: 8, w: 4, d: 3, disappearing: true },
        { x: room2X, y: 18.25, z: 0, w: 6, d: 6, disappearing: false },
        { x: room2X - 8, y: 22.25, z: 0, w: 4, d: 4, disappearing: false },
      ];
      
      platforms.forEach(p => {
        // Skip disappearing platforms when they're invisible
        if (p.disappearing && !disappearPhase) return;
        
        if (
          player.position.x > p.x - p.w/2 && player.position.x < p.x + p.w/2 &&
          player.position.z > p.z - p.d/2 && player.position.z < p.z + p.d/2 &&
          player.position.y > p.y && player.position.y < p.y + 2 &&
          player.velocity.y <= 0
        ) {
          player.position.y = p.y + 2;
          player.velocity.y = 0;
          player.onGround = true;
        }
      });
      
      // RAMP COLLISIONS - walk up angled surfaces
      const rampCollisions = [
        // Room 1 ramps
        { x: -10, y: 3.5, z: -4, w: 2.5, l: 8, angle: 0.25, minY: 1.5, maxY: 5.5 },
        { x: 10, y: 3.5, z: 4, w: 2.5, l: 8, angle: -0.25, minY: 1.5, maxY: 5.5 },
        { x: 0, y: 6.5, z: 4, w: 2, l: 6, angle: 0.3, minY: 5, maxY: 8.5 },
        { x: -3, y: 9.5, z: 0, w: 2, l: 6, angle: 0.28, minY: 8, maxY: 11.5 },
        { x: 3, y: 12.5, z: -2, w: 2, l: 5, angle: 0.35, minY: 11, maxY: 14.5 },
        { x: -2, y: 15.5, z: 2, w: 2, l: 5, angle: 0.35, minY: 14, maxY: 17.5 },
        { x: 0, y: 18.5, z: 4, w: 3, l: 6, angle: 0.3, minY: 17, maxY: 20.5 },
        // Room 2 ramps
        { x: room2X - 8, y: 4, z: 4, w: 2, l: 6, angle: 0.3, minY: 2, maxY: 6.5 },
        { x: room2X + 8, y: 4, z: -4, w: 2, l: 6, angle: -0.3, minY: 2, maxY: 6.5 },
        { x: room2X, y: 8, z: 4, w: 2, l: 5, angle: 0.35, minY: 6, maxY: 10.5 },
        { x: room2X - 4, y: 12, z: 0, w: 2, l: 5, angle: 0.35, minY: 10, maxY: 14.5 },
        { x: room2X + 4, y: 16, z: -2, w: 2, l: 5, angle: 0.3, minY: 14, maxY: 18.5 },
        { x: room2X, y: 20, z: 3, w: 3, l: 5, angle: 0.25, minY: 18, maxY: 22.5 },
      ];
      
      rampCollisions.forEach(r => {
        const inX = player.position.x > r.x - r.w/2 && player.position.x < r.x + r.w/2;
        const inZ = player.position.z > r.z - r.l/2 && player.position.z < r.z + r.l/2;
        const inY = player.position.y >= r.minY && player.position.y <= r.maxY + 2;
        
        if (inX && inZ && inY) {
          // Calculate height based on position along ramp
          const rampProgress = (player.position.z - (r.z - r.l/2)) / r.l;
          const rampHeight = r.minY + (r.maxY - r.minY) * (r.angle > 0 ? rampProgress : (1 - rampProgress));
          
          if (player.position.y <= rampHeight + 2 && player.velocity.y <= 0) {
            player.position.y = rampHeight + 2;
            player.velocity.y = 0;
            player.onGround = true;
          }
        }
      });
      
      // Portal wall collision (blocks movement, requires portal to cross)
      portalWallsRef.current.forEach(wall => {
        const wx = wall.position.x;
        const wy = wall.position.y;
        const wz = wall.position.z;
        const wallWidth = 0.3;
        const wallHeight = 3;
        const wallDepth = 3; // Approximate from platform size
        
        // Check if player is trying to walk through the wall
        if (
          player.position.x > wx - wallWidth - 0.5 && player.position.x < wx + wallWidth + 0.5 &&
          player.position.y > wy - wallHeight/2 && player.position.y < wy + wallHeight/2 + 2 &&
          player.position.z > wz - wallDepth/2 && player.position.z < wz + wallDepth/2
        ) {
          // Push player back
          if (player.position.x < wx) {
            player.position.x = wx - wallWidth - 0.6;
          } else {
            player.position.x = wx + wallWidth + 0.6;
          }
        }
      });
      
      // Jump
      if ((keys['Space'] || keys['KeySpace']) && player.onGround) {
        player.velocity.y = 8;
        player.onGround = false;
      }
      
      // Boundary (spans both rooms)
      player.position.x = Math.max(-14, Math.min(50, player.position.x));
      player.position.z = Math.max(-14, Math.min(14, player.position.z));
      
      // Check portals
      checkPortalTeleport();
      
      // Check targets
      checkTargets();
      
      // Animate portals
      const elapsed = clockRef.current.getElapsedTime();
      if (portalsRef.current.green?.mesh) {
        portalsRef.current.green.mesh.rotation.z = elapsed;
      }
      if (portalsRef.current.cyan?.mesh) {
        portalsRef.current.cyan.mesh.rotation.z = -elapsed;
      }
      
      // Animate targets
      targetsRef.current.forEach((target, i) => {
        if (target.visible) {
          target.position.y += Math.sin(elapsed * 3 + i) * 0.01;
          target.rotation.y = elapsed;
        }
      });
      
      // Animate arm + sword with smooth animations
      updateArmAnimation(delta);
      
      // Pulse sword glow based on portal mode
      if (swordRef.current) {
        const pulseIntensity = 0.7 + Math.sin(elapsed * 3) * 0.25;
        ['edge', 'edge2', 'tip', 'gem1', 'gem2', 'gem3'].forEach(name => {
          const mesh = swordRef.current?.getObjectByName(name) as THREE.Mesh;
          if (mesh && mesh.material) {
            (mesh.material as THREE.MeshBasicMaterial).opacity = pulseIntensity;
          }
        });
      }
      
      // Animate neon crystals (spin, bob, pulse)
      targetsRef.current.forEach((target, i) => {
        if (target && target.visible) {
          // Spin the crystal
          target.rotation.y = elapsed * 2 + i * 0.5;
          target.rotation.x = Math.sin(elapsed * 1.5 + i) * 0.3;
          
          // Bob up and down
          const baseY = target.userData?.baseY ?? target.position.y;
          target.position.y = baseY + Math.sin(elapsed * 2 + i * 0.7) * 0.3;
          
          // Pulse scale
          const pulseScale = 1 + Math.sin(elapsed * 3 + i) * 0.15;
          target.scale.set(pulseScale, pulseScale, pulseScale);
        }
      });
      
      // Update enemies with attack patterns like ParryPro/ClickDraw
      enemiesRef.current.forEach((enemy, index) => {
        if (enemy.state === 'dead') return;
        
        // Update cooldowns
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
        enemy.hitCooldown = Math.max(0, enemy.hitCooldown - delta);
        
        // Distance to player
        const distToPlayer = enemy.position.distanceTo(player.position);
        
        // AI behavior with wind-up patterns (like ParryPro)
        if (enemy.state === 'winding_up') {
          // Wind-up animation - enemy prepares to attack (BLUE GLOW on sword)
          const swordGlow = enemy.mesh.getObjectByName('swordGlow') as THREE.Mesh;
          const swordGlow2 = enemy.mesh.getObjectByName('swordGlow2') as THREE.Mesh;
          const swordTip = enemy.mesh.getObjectByName('swordTip') as THREE.Mesh;
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          
          // Pulsing blue glow during wind-up
          const windUpPulse = Math.sin(elapsed * 12) * 0.5 + 0.5;
          const blueColor = windUpPulse > 0.5 ? 0x0066ff : 0x0033aa;
          
          if (swordGlow) (swordGlow.material as THREE.MeshBasicMaterial).color.setHex(blueColor);
          if (swordGlow2) (swordGlow2.material as THREE.MeshBasicMaterial).color.setHex(blueColor);
          if (swordTip) (swordTip.material as THREE.MeshBasicMaterial).color.setHex(blueColor);
          if (body) (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x001144);
          
          // Raise sword during wind-up
          const sword = enemy.mesh.getObjectByName('enemySword') as THREE.Group;
          if (sword) {
            sword.rotation.z = -0.3 - (2 - enemy.attackCooldown) * 0.8; // Raise sword
          }
          
          // After 0.8 seconds, execute attack
          if (enemy.attackCooldown <= 1.2) {
            enemy.state = 'attacking';
            
            // Flash RED when attacking!
            if (swordGlow) (swordGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
            if (swordGlow2) (swordGlow2.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
            if (swordTip) (swordTip.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
            if (body) (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x440000);
            
            // Swing sword down
            if (sword) {
              sword.rotation.z = 0.5; // Swing down
            }
            
            // CLOSE RANGE CHECK - Only hit player if within 3 units
            if (distToPlayer <= 3) {
              // Check if player is parrying at the right moment
              if (parryActiveRef.current) {
                // PERFECT PARRY timing!
                setScore(prev => prev + 300);
                setMessage('⚡ PERFECT PARRY! +300');
                setTimeout(() => setMessage(''), 1000);
                
                enemy.hitCooldown = 2;
                enemy.state = 'stunned';
                
                const knockback = new THREE.Vector3()
                  .subVectors(enemy.position, player.position)
                  .normalize()
                  .multiplyScalar(5);
                enemy.position.add(knockback);
              } else if (playerHealth > 0) {
                // Player takes damage (ONLY AT CLOSE RANGE)
                setPlayerHealth(prev => prev - 1);
                setMessage('💔 Hit by enemy! -1 HP');
                setTimeout(() => setMessage(''), 1500);
              }
            } else {
              // Enemy attack missed - player too far away
              setMessage('💨 Enemy missed! (out of range)');
              setTimeout(() => setMessage(''), 800);
            }
            
            enemy.attackCooldown = 2.5; // Full cooldown after attack
          }
        } else if (enemy.state === 'stunned') {
          // Stunned - can't move, yellow glow on sword
          const swordGlow = enemy.mesh.getObjectByName('swordGlow') as THREE.Mesh;
          const swordGlow2 = enemy.mesh.getObjectByName('swordGlow2') as THREE.Mesh;
          const swordTip = enemy.mesh.getObjectByName('swordTip') as THREE.Mesh;
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          
          if (swordGlow) (swordGlow.material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
          if (swordGlow2) (swordGlow2.material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
          if (swordTip) (swordTip.material as THREE.MeshBasicMaterial).color.setHex(0xffff00);
          if (body) (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x444400);
          
          if (enemy.hitCooldown <= 0) {
            enemy.state = 'idle';
          }
        } else if (distToPlayer < 2.5 && enemy.attackCooldown <= 0) {
          // Start wind-up phase (like ParryPro)
          enemy.state = 'winding_up';
          enemy.attackCooldown = 2; // 0.8s wind-up, then attack at 1.2
        } else if (distToPlayer < 10) {
          // Chase player
          enemy.state = 'chasing';
          const dirToPlayer = new THREE.Vector3()
            .subVectors(player.position, enemy.position)
            .normalize();
          dirToPlayer.y = 0; // Stay on ground
          enemy.velocity.copy(dirToPlayer.multiplyScalar(3 * delta));
          enemy.position.add(enemy.velocity);
          
          // Reset sword and body color when chasing
          const swordGlow = enemy.mesh.getObjectByName('swordGlow') as THREE.Mesh;
          const swordGlow2 = enemy.mesh.getObjectByName('swordGlow2') as THREE.Mesh;
          const swordTip = enemy.mesh.getObjectByName('swordTip') as THREE.Mesh;
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          const sword = enemy.mesh.getObjectByName('enemySword') as THREE.Group;
          
          if (swordGlow) (swordGlow.material as THREE.MeshBasicMaterial).color.setHex(0x444444);
          if (swordGlow2) (swordGlow2.material as THREE.MeshBasicMaterial).color.setHex(0x444444);
          if (swordTip) (swordTip.material as THREE.MeshBasicMaterial).color.setHex(0x444444);
          if (body) (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x220000);
          if (sword) sword.rotation.z = -0.3; // Reset sword position
        } else {
          enemy.state = 'idle';
          // Reset color and sword when idle
          const swordGlow = enemy.mesh.getObjectByName('swordGlow') as THREE.Mesh;
          const swordGlow2 = enemy.mesh.getObjectByName('swordGlow2') as THREE.Mesh;
          const swordTip = enemy.mesh.getObjectByName('swordTip') as THREE.Mesh;
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          const sword = enemy.mesh.getObjectByName('enemySword') as THREE.Group;
          
          if (swordGlow) (swordGlow.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
          if (swordGlow2) (swordGlow2.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
          if (swordTip) (swordTip.material as THREE.MeshBasicMaterial).color.setHex(0x333333);
          if (body) (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x110000);
          if (sword) sword.rotation.z = -0.3; // Reset sword position
        }
        
        // Check if player is attacking this enemy with sword
        if (isAttackingRef.current && distToPlayer < 3 && enemy.hitCooldown <= 0) {
          // Check if facing the enemy
          const toEnemy = new THREE.Vector3()
            .subVectors(enemy.position, player.position)
            .normalize();
          const playerForward = new THREE.Vector3(0, 0, -1)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
          
          const dot = toEnemy.dot(playerForward);
          if (dot > 0.3) { // Facing enemy
            enemy.health -= 1;
            enemy.hitCooldown = 0.5;
            enemy.state = 'hit';
            
            // Flash enemy red
            const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
            if (body) {
              (body.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
              setTimeout(() => {
                if (enemy.state !== 'dead') {
                  (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x330000);
                }
              }, 200);
            }
            
            setScore(prev => prev + 50);
            setMessage(`⚔️ Hit! ${enemy.health > 0 ? enemy.health + ' HP left' : 'KILL!'} +50`);
            setTimeout(() => setMessage(''), 1000);
            
            // Knockback
            const knockback = new THREE.Vector3()
              .subVectors(enemy.position, player.position)
              .normalize()
              .multiplyScalar(2);
            enemy.position.add(knockback);
            
            if (enemy.health <= 0) {
              enemy.state = 'dead';
              setEnemiesKilled(prev => prev + 1);
              setScore(prev => prev + 200);
              setMessage('💀 Enemy killed! +200');
              
              // Hide enemy
              enemy.mesh.visible = false;
              
              // Respawn after delay
              setTimeout(() => {
                if (sceneRef.current) {
                  enemy.mesh.visible = true;
                  enemy.health = 3;
                  enemy.state = 'idle';
                  enemy.position.set(
                    (Math.random() - 0.5) * 20,
                    0,
                    (Math.random() - 0.5) * 20
                  );
                }
              }, 5000);
            }
          }
        }
        
        // Update mesh position
        enemy.mesh.position.copy(enemy.position);
        enemy.mesh.position.y = 0;
        
        // Face player when chasing
        if (enemy.state === 'chasing') {
          const angle = Math.atan2(
            player.position.x - enemy.position.x,
            player.position.z - enemy.position.z
          );
          enemy.mesh.rotation.y = angle;
        }
        
        // Bob animation
        enemy.mesh.position.y = 0.5 + Math.sin(elapsed * 3 + index) * 0.1;
        
        // Eye pulsing
        const eye = enemy.mesh.getObjectByName('eye') as THREE.Mesh;
        if (eye) {
          const intensity = enemy.state === 'attacking' ? 2 : 1;
          (eye.material as THREE.MeshBasicMaterial).color.setHex(
            enemy.state === 'hit' ? 0xffff00 : 0xff0000
          );
        }
      });
      
      // Update timer
      const timerElapsed = (Date.now() - gameStartTimeRef.current) / 1000;
      const remaining = Math.max(0, 90 - timerElapsed);
      setTimeLeft(Math.ceil(remaining));
      
      // Check game over (time or health)
      if (playerHealth <= 0 || remaining <= 0) {
        setGameState('gameover');
        try {
          if (onGameEnd) onGameEnd(scoreRef.current);
        } catch (e) {
          console.error('Error calling onGameEnd:', e);
        }
        return;
      }
      
      // Update camera
      if (cameraRef.current) {
        cameraRef.current.position.copy(player.position);
        cameraRef.current.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      }
      
      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      // Check win condition
      if (targetsCollected >= totalTargets && totalTargets > 0) {
        setScore(prev => prev + 500);
        setMessage('Level Complete! +500');
        setGameState('gameover');
        try {
          if (onGameEnd) onGameEnd(scoreRef.current + 500);
        } catch (e) {
          console.error('Error calling onGameEnd:', e);
        }
        return;
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    clockRef.current.start();
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, targetsCollected, totalTargets, onGameEnd, score]);
  
  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      if (e.code === 'KeyQ') {
        setPortalMode('green');
        updateSwordColor('green');
      }
      if (e.code === 'KeyE') {
        setPortalMode('cyan');
        updateSwordColor('cyan');
      }
      if (e.code === 'KeyX' && gameState === 'playing') {
        // Parry with X key
        animateSwordParry();
      }
      if (e.code === 'KeyV' && gameState === 'playing') {
        // Strike with V key
        animateSwordStrike();
      }
      if (e.code === 'Escape' && isPointerLockedRef.current) {
        document.exitPointerLock();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      if (e.button === 2) {
        // Right click - enable drag-to-look
        isRightMouseDownRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      
      if (e.button === 0) {
        // Left click - try pointer lock first, or just shoot
        if (!isPointerLockedRef.current && containerRef.current) {
          containerRef.current.requestPointerLock().catch(() => {
            // Pointer lock not supported, just shoot
            shootPortal(portalMode);
          });
        } else {
          shootPortal(portalMode);
        }
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDownRef.current = false;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      const sensitivity = 0.003;
      
      // Pointer lock mode - use movementX/Y
      if (isPointerLockedRef.current) {
        playerRef.current.yaw -= e.movementX * sensitivity;
        playerRef.current.pitch -= e.movementY * sensitivity;
        playerRef.current.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, playerRef.current.pitch));
        return;
      }
      
      // Fallback: Right-click drag mode
      if (isRightMouseDownRef.current) {
        const dx = e.clientX - lastMousePosRef.current.x;
        const dy = e.clientY - lastMousePosRef.current.y;
        
        playerRef.current.yaw -= dx * sensitivity;
        playerRef.current.pitch -= dy * sensitivity;
        playerRef.current.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, playerRef.current.pitch));
        
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === containerRef.current;
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
    };
    
    const handleContextMenu = (e: Event) => e.preventDefault();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [gameState, portalMode]);
  
  // Start game
  const startGame = () => {
    console.log('🎮 Starting game...');
    playerRef.current.position.set(0, 2, 5);
    playerRef.current.velocity.set(0, 0, 0);
    playerRef.current.yaw = 0;
    playerRef.current.pitch = 0;
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(90);
    gameStartTimeRef.current = Date.now();
    setTargetsCollected(0);
    setPlayerHealth(3);
    setEnemiesKilled(0);
    
    // Reset targets
    targetsRef.current.forEach(t => t.visible = true);
    
    // Reset enemies
    enemiesRef.current.forEach((enemy, i) => {
      enemy.health = 3;
      enemy.state = 'idle';
      enemy.mesh.visible = true;
      enemy.position.set(
        [-5, 5, 0, 10][i] || (Math.random() - 0.5) * 20,
        0,
        [0, -5, -10, 5][i] || (Math.random() - 0.5) * 20
      );
    });
    
    // Clear portals
    if (portalsRef.current.green?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.green.mesh);
    }
    if (portalsRef.current.cyan?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.cyan.mesh);
    }
    portalsRef.current = { green: null, cyan: null };
    
    setGameState('playing');
    console.log('✅ Game started');
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* 3D Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Loading */}
      {gameState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🌀</div>
            <div className="text-white text-2xl">Loading Wormhole...</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 overflow-y-auto">
          <div className="max-w-lg mx-auto p-6 text-center">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-6">
              🌀 WORMHOLE
            </h1>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">🗡️ Controls</h2>
              <div className="space-y-2 text-gray-300">
                <p>• <span className="text-green-400">Left-click</span> - Sword slash (shoot portal)</p>
                <p>• <span className="text-red-400">V</span> - Strike (attack enemies!)</p>
                <p>• <span className="text-yellow-400">X</span> - Parry (block enemy attacks!)</p>
                <p>• <span className="text-cyan-400">Right-click + drag</span> - Look around</p>
                <p>• <span className="text-green-400">WASD</span> - Move • <span className="text-green-400">Space</span> - Jump</p>
                <p>• <span className="text-green-400">Q</span> - Blue portal 🔵 • <span className="text-cyan-400">E</span> - Orange portal 🟠</p>
              </div>
            </div>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">🎯 Objective</h2>
              <div className="space-y-2 text-gray-300">
                <p>• Collect all <span className="text-yellow-400">golden orbs</span> using portals</p>
                <p>• Fight <span className="text-red-400">red enemies</span> with your sword (3 hits to kill)</p>
                <p>• Walk through portals - exit facing the <span className="text-green-400">opposite direction</span></p>
                <p>• Survive! You have <span className="text-red-400">3 hearts</span></p>
              </div>
            </div>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">⭐ Scoring</h2>
              <div className="space-y-1 text-gray-300">
                <p>• <span className="text-yellow-400">Parry (X)</span>: <span className="text-green-400">+150</span></p>
                <p>• <span className="text-red-400">Strike (V)</span>: <span className="text-green-400">+50</span> per hit</p>
                <p>• Kill enemy: <span className="text-green-400">+200</span></p>
                <p>• Teleport: <span className="text-green-400">+100</span></p>
                <p>• Collect orb: <span className="text-green-400">+200</span></p>
                <p>• Link portals: <span className="text-green-400">+50</span></p>
              </div>
            </div>
            
            {isMobile && (
              <p className="text-yellow-400 text-sm mb-4">
                ⚠️ Best played on desktop with mouse & keyboard
              </p>
            )}
            
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105"
            >
              🚀 BEGIN TEST
            </button>
          </div>
        </div>
      )}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Score & Stats */}
          <div className="absolute top-4 left-4 z-40">
            <div className="bg-black/70 rounded-lg px-4 py-2 space-y-1">
              <div className="text-white text-xl font-bold">Score: {score}</div>
              <div className="text-gray-300 text-sm">
                🎯 Targets: {targetsCollected}/{totalTargets}
              </div>
              <div className="text-gray-300 text-sm">
                💀 Enemies: {enemiesKilled}
              </div>
            </div>
          </div>
          
          {/* Health */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className={`text-3xl transition-all ${i < playerHealth ? 'animate-pulse' : 'opacity-30'}`}
                >
                  {i < playerHealth ? '❤️' : '🖤'}
                </div>
              ))}
            </div>
          </div>
          
          {/* Timer */}
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-2xl ${
              timeLeft <= 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-800'
            }`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          {/* Portal Mode */}
          <div className="absolute top-4 right-4 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold ${
              portalMode === 'green' ? 'bg-green-600' : 'bg-cyan-600'
            }`}>
              {portalMode === 'green' ? '🟢 GREEN' : '🔵 CYAN'} PORTAL
            </div>
          </div>
          
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`w-8 h-8 border-2 rounded-full ${
              portalMode === 'green' ? 'border-green-400' : 'border-cyan-400'
            }`}>
              <div className={`absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                portalMode === 'green' ? 'bg-green-400' : 'bg-cyan-400'
              }`} />
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
              <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-xl font-bold animate-pulse">
                {message}
              </div>
            </div>
          )}
          
          {/* Controls hint */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-black/50 text-gray-400 px-4 py-2 rounded-lg text-sm text-center">
              {isPointerLocked ? (
                <span>WASD move • <span className="text-yellow-300">SHIFT</span>=Sprint • Click shoot • <span className="text-red-400">V</span>=Strike • <span className="text-yellow-400">X</span>=Parry • Q🟢/E🔵</span>
              ) : (
                <span>WASD move • <span className="text-yellow-300">SHIFT</span>=Sprint • Click shoot • <span className="text-red-400">V</span>=Strike • <span className="text-yellow-400">X</span>=Parry • Q🟢/E🔵</span>
              )}
            </div>
          </div>
          
          {/* Sword POV Indicator */}
          <div className="absolute bottom-32 right-4 z-30 pointer-events-none">
            <div className={`text-6xl transform -rotate-45 transition-all ${
              swordSlashRef.current > 0 ? 'scale-125 rotate-0' : ''
            }`}>
              <span className="drop-shadow-lg" style={{
                textShadow: portalMode === 'green' 
                  ? '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 60px #00ff88'
                  : '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff',
                filter: `drop-shadow(0 0 10px ${portalMode === 'green' ? '#00ff88' : '#00ffff'})`
              }}>🗡️</span>
            </div>
            <div className={`text-xs text-center mt-1 font-bold ${
              portalMode === 'green' ? 'text-green-400' : 'text-cyan-400'
            }`}>
              {portalMode.toUpperCase()}
            </div>
          </div>
          
          {/* Mobile controls */}
          {isMobile && (
            <div className="absolute bottom-16 left-4 right-4 z-40 flex justify-between items-end">
              {/* Left: D-pad for movement + Sprint */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <button 
                    className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                    onTouchStart={() => keysRef.current['KeyW'] = true}
                    onTouchEnd={() => keysRef.current['KeyW'] = false}
                  >↑</button>
                  <div />
                  <button 
                    className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                    onTouchStart={() => keysRef.current['KeyA'] = true}
                    onTouchEnd={() => keysRef.current['KeyA'] = false}
                  >←</button>
                  <button 
                    className="w-12 h-12 bg-green-600/50 rounded-lg text-white text-xl active:bg-green-600"
                    onTouchStart={() => keysRef.current['Space'] = true}
                    onTouchEnd={() => keysRef.current['Space'] = false}
                  >⬆</button>
                  <button 
                    className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                    onTouchStart={() => keysRef.current['KeyD'] = true}
                    onTouchEnd={() => keysRef.current['KeyD'] = false}
                  >→</button>
                  <div />
                  <button 
                    className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                    onTouchStart={() => keysRef.current['KeyS'] = true}
                    onTouchEnd={() => keysRef.current['KeyS'] = false}
                  >↓</button>
                </div>
                {/* Sprint button */}
                <button 
                  className="w-full h-10 bg-yellow-600/50 rounded-lg text-white text-sm font-bold active:bg-yellow-600"
                  onTouchStart={() => keysRef.current['ShiftLeft'] = true}
                  onTouchEnd={() => keysRef.current['ShiftLeft'] = false}
                >🏃 SPRINT</button>
              </div>
              
              {/* Center: Analog stick for looking */}
              <div 
                className="relative w-24 h-24 rounded-full border-2 border-white/30 bg-black/30"
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const lookStickStart = { x: touch.clientX, y: touch.clientY, centerX, centerY };
                  (window as any).lookStickStart = lookStickStart;
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  const start = (window as any).lookStickStart;
                  if (start) {
                    const dx = (touch.clientX - start.centerX) * 0.003;
                    const dy = (touch.clientY - start.centerY) * 0.003;
                    playerRef.current.yaw -= dx;
                    playerRef.current.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, playerRef.current.pitch - dy));
                  }
                }}
                onTouchEnd={() => {
                  (window as any).lookStickStart = null;
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-10 h-10 rounded-full ${
                    portalMode === 'green' ? 'bg-green-500/50' : 'bg-cyan-500/50'
                  }`} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
                  LOOK
                </div>
              </div>
              
              {/* Right: Action buttons */}
              <div className="flex flex-col gap-2">
                {/* Portal buttons */}
                <div className="flex gap-2">
                  <button 
                    className="w-14 h-14 bg-green-600/50 rounded-full text-white text-xl active:bg-green-600"
                    onClick={() => { setPortalMode('green'); shootPortal('green'); }}
                  >🔵</button>
                  <button 
                    className="w-14 h-14 bg-cyan-600/50 rounded-full text-white text-xl active:bg-cyan-600"
                    onClick={() => { setPortalMode('cyan'); shootPortal('cyan'); }}
                  >🟠</button>
                </div>
                {/* Combat buttons */}
                <div className="flex gap-2">
                  <button 
                    className="w-14 h-14 bg-red-600/50 rounded-lg text-white text-xs font-bold active:bg-red-600"
                    onClick={animateSwordStrike}
                  >⚔️<br/>STRIKE</button>
                  <button 
                    className="w-14 h-14 bg-yellow-600/50 rounded-lg text-white text-xs font-bold active:bg-yellow-600"
                    onClick={animateSwordParry}
                  >🛡️<br/>PARRY</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center p-8 bg-gradient-to-br from-green-900/80 to-cyan-900/80 rounded-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">Test Complete!</h2>
            <p className="text-4xl font-bold text-green-400 mb-6">{score} points</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-cyan-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
