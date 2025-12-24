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
    blue: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
    orange: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
  }>({ blue: null, orange: null });
  
  // Game state
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [portalMode, setPortalMode] = useState<'blue' | 'orange'>('blue');
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Targets/objectives
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const [targetsCollected, setTargetsCollected] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  
  // Enemies
  interface Enemy {
    mesh: THREE.Group;
    health: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    state: 'idle' | 'chasing' | 'attacking' | 'hit' | 'dead';
    attackCooldown: number;
    hitCooldown: number;
  }
  const enemiesRef = useRef<Enemy[]>([]);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
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
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);
    sceneRef.current = scene;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;
    
    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;
    scene.add(directional);
    
    const point1 = new THREE.PointLight(0x3399ff, 1, 20);
    point1.position.set(-5, 5, -5);
    scene.add(point1);
    
    const point2 = new THREE.PointLight(0xff6600, 1, 20);
    point2.position.set(5, 5, 5);
    scene.add(point2);
    
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
  
  // Create ParryPro-style glowing sword
  const createSword = (camera: THREE.PerspectiveCamera) => {
    const swordGroup = new THREE.Group();
    
    // Main blade (larger, more visible)
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.2, 0.02);
    const bladeMat = new THREE.MeshPhongMaterial({
      color: 0xc0c0c0,
      emissive: 0x404040,
      emissiveIntensity: 0.3,
      shininess: 100,
      specular: 0xffffff,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.6;
    blade.name = 'blade';
    swordGroup.add(blade);
    
    // Glowing edge (changes color with portal mode)
    const edgeGeo = new THREE.BoxGeometry(0.015, 1.2, 0.025);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.8,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(0.045, 0.6, 0);
    edge.name = 'edge';
    swordGroup.add(edge);
    
    // Second edge on other side
    const edge2 = new THREE.Mesh(edgeGeo, edgeMat.clone());
    edge2.position.set(-0.045, 0.6, 0);
    edge2.name = 'edge2';
    swordGroup.add(edge2);
    
    // Blade tip glow
    const tipGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
    const tipMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.6,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 1.25;
    tip.name = 'tip';
    swordGroup.add(tip);
    
    // Cross guard
    const guardGeo = new THREE.BoxGeometry(0.4, 0.06, 0.06);
    const guardMat = new THREE.MeshPhongMaterial({
      color: 0xdaa520,
      emissive: 0x554400,
      shininess: 80,
    });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0;
    swordGroup.add(guard);
    
    // Guard decorations (gems)
    const gemGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    const gem1 = new THREE.Mesh(gemGeo, gemMat);
    gem1.position.set(0.15, 0, 0);
    gem1.name = 'gem1';
    swordGroup.add(gem1);
    const gem2 = new THREE.Mesh(gemGeo, gemMat.clone());
    gem2.position.set(-0.15, 0, 0);
    gem2.name = 'gem2';
    swordGroup.add(gem2);
    
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.35, 8);
    const handleMat = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      emissive: 0x3a1a05,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.2;
    swordGroup.add(handle);
    
    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const pommelMat = new THREE.MeshPhongMaterial({ color: 0xdaa520 });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.4;
    swordGroup.add(pommel);
    
    // Position sword in bottom right of view (larger and more visible)
    swordGroup.position.set(0.4, -0.4, -0.7);
    swordGroup.rotation.set(0.3, -0.4, 0.15);
    swordGroup.scale.set(0.8, 0.8, 0.8);
    
    camera.add(swordGroup);
    swordRef.current = swordGroup;
  };
  
  // Update sword color based on portal mode
  const updateSwordColor = (mode: 'blue' | 'orange') => {
    if (!swordRef.current) return;
    
    const color = mode === 'blue' ? 0x00aaff : 0xff6600;
    
    // Update all glowing parts
    ['edge', 'edge2', 'tip', 'gem1', 'gem2'].forEach(name => {
      const mesh = swordRef.current?.getObjectByName(name) as THREE.Mesh;
      if (mesh && mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
    });
  };
  
  // Sword slash animation (for shooting portals)
  const animateSwordSlash = () => {
    swordSlashRef.current = 1.0;
    swordActionRef.current = 'slash';
    isAttackingRef.current = true;
    setTimeout(() => { 
      isAttackingRef.current = false;
      swordActionRef.current = 'idle';
    }, 300);
  };
  
  // Sword parry animation (X key)
  const animateSwordParry = () => {
    if (swordActionRef.current !== 'idle') return;
    swordSlashRef.current = 1.0;
    swordActionRef.current = 'parry';
    parryActiveRef.current = true;
    setTimeout(() => {
      parryActiveRef.current = false;
      swordActionRef.current = 'idle';
    }, 400);
  };
  
  // Sword strike animation (V key)
  const animateSwordStrike = () => {
    if (swordActionRef.current !== 'idle') return;
    swordSlashRef.current = 1.0;
    swordActionRef.current = 'strike';
    isAttackingRef.current = true;
    setTimeout(() => {
      isAttackingRef.current = false;
      swordActionRef.current = 'idle';
    }, 350);
  };
  
  // Create enemy
  const createEnemy = (scene: THREE.Scene, x: number, z: number): Enemy => {
    const enemyGroup = new THREE.Group();
    
    // Body (dark robot/drone)
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x440000,
      emissive: 0x330000,
      emissiveIntensity: 0.3,
      metalness: 0.7,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.name = 'body';
    enemyGroup.add(body);
    
    // Eye (glowing red)
    const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 1, 0.3);
    eye.name = 'eye';
    enemyGroup.add(eye);
    
    // Spikes (danger indicators)
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x880000, metalness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), spikeMat);
      spike.position.set(
        Math.cos(i * Math.PI / 2) * 0.4,
        0.8,
        Math.sin(i * Math.PI / 2) * 0.4
      );
      spike.rotation.z = Math.PI;
      enemyGroup.add(spike);
    }
    
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

  // Create test chamber
  const createTestChamber = (scene: THREE.Scene) => {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x333344,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Grid on floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x4444ff, 0x222244);
    scene.add(gridHelper);
    
    // Walls (portalable surfaces)
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0x445566,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    
    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    backWall.position.set(0, 5, -15);
    backWall.userData.portalable = true;
    scene.add(backWall);
    
    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    frontWall.position.set(0, 5, 15);
    frontWall.rotation.y = Math.PI;
    frontWall.userData.portalable = true;
    scene.add(frontWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    leftWall.position.set(-15, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.userData.portalable = true;
    scene.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    rightWall.position.set(15, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.userData.portalable = true;
    scene.add(rightWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    ceiling.position.y = 10;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);
    
    // Add platforms (multiple levels)
    const platformMat1 = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6 });
    const platformMat2 = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.5, emissive: 0x111122 });
    const platformMat3 = new THREE.MeshStandardMaterial({ color: 0x778899, roughness: 0.4, emissive: 0x222233 });
    const platformMatTop = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.3, emissive: 0x334455, emissiveIntensity: 0.3 });
    
    // Ground level platforms
    const platformConfigs = [
      // Ground level (darker)
      { x: -8, y: 2, z: -8, w: 5, d: 5, mat: platformMat1 },
      { x: 8, y: 2, z: -8, w: 5, d: 5, mat: platformMat1 },
      { x: 0, y: 2, z: -12, w: 4, d: 4, mat: platformMat1 },
      // Second level (medium)
      { x: -10, y: 4.25, z: 0, w: 4, d: 4, mat: platformMat2 },
      { x: 10, y: 4.25, z: 0, w: 4, d: 4, mat: platformMat2 },
      { x: 0, y: 4.25, z: 8, w: 6, d: 4, mat: platformMat2 },
      // Third level (brighter)
      { x: -6, y: 6.25, z: -6, w: 3, d: 3, mat: platformMat3 },
      { x: 6, y: 6.25, z: -6, w: 3, d: 3, mat: platformMat3 },
      { x: 0, y: 6.25, z: 0, w: 4, d: 4, mat: platformMat3 },
      // Top level (glowing)
      { x: 0, y: 8.25, z: -10, w: 5, d: 3, mat: platformMatTop },
    ];
    
    platformConfigs.forEach(p => {
      const platform = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.5, p.d), p.mat);
      platform.position.set(p.x, p.y, p.z);
      platform.castShadow = true;
      platform.receiveShadow = true;
      scene.add(platform);
      
      // Add edge glow for higher platforms
      if (p.y > 3) {
        const edgeGeo = new THREE.BoxGeometry(p.w + 0.1, 0.1, p.d + 0.1);
        const edgeMat = new THREE.MeshBasicMaterial({ 
          color: p.y > 7 ? 0x00aaff : (p.y > 5 ? 0x6666ff : 0x4444aa),
          transparent: true,
          opacity: 0.5,
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(p.x, p.y - 0.2, p.z);
        scene.add(edge);
      }
    });
    
    // Add ramps/stairs for connectivity
    const rampMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.7 });
    
    // Ramp from ground to second level (left)
    const ramp1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 6), rampMat);
    ramp1.position.set(-10, 3.2, -4);
    ramp1.rotation.x = 0.3;
    scene.add(ramp1);
    
    // Add collectible targets (spread across levels)
    const targetMat = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, 
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    
    const targetPositions = [
      // Ground level
      new THREE.Vector3(-8, 3.5, -8),
      new THREE.Vector3(8, 3.5, -8),
      new THREE.Vector3(0, 3.5, -12),
      // Second level
      new THREE.Vector3(-10, 5.5, 0),
      new THREE.Vector3(10, 5.5, 0),
      new THREE.Vector3(0, 5.5, 8),
      // Third level
      new THREE.Vector3(-6, 7.5, -6),
      new THREE.Vector3(6, 7.5, -6),
      new THREE.Vector3(0, 7.5, 0),
      // Top level (hardest to reach)
      new THREE.Vector3(0, 9.5, -10),
    ];
    
    targetsRef.current = [];
    targetPositions.forEach((pos) => {
      const target = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), targetMat);
      target.position.copy(pos);
      target.userData.isTarget = true;
      scene.add(target);
      targetsRef.current.push(target);
    });
    
    setTotalTargets(targetPositions.length);
    setTargetsCollected(0);
    
    // Spawn enemies
    enemiesRef.current = [];
    const enemyPositions = [
      { x: -5, z: 0 },
      { x: 5, z: -5 },
      { x: 0, z: -10 },
      { x: 10, z: 5 },
    ];
    enemyPositions.forEach(pos => {
      const enemy = createEnemy(scene, pos.x, pos.z);
      enemiesRef.current.push(enemy);
    });
  };
  
  // Shoot portal
  const shootPortal = (color: 'blue' | 'orange') => {
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
        const portalColor = color === 'blue' ? 0x00aaff : 0xff6600;
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
        if (portalsRef.current.blue && portalsRef.current.orange) {
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
    const blue = portalsRef.current.blue;
    const orange = portalsRef.current.orange;
    const now = Date.now();
    
    if (!blue || !orange) return;
    
    // Cooldown to prevent instant re-teleport
    if (now - lastTeleportRef.current < 500) return;
    
    const distToBlue = player.position.distanceTo(blue.position);
    const distToOrange = player.position.distanceTo(orange.position);
    
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
    
    if (distToBlue < teleportDist) {
      teleportTo(orange);
    } else if (distToOrange < teleportDist) {
      teleportTo(blue);
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
      
      // Movement
      const moveSpeed = 8 * delta;
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
      
      // Platform collisions (multiple levels)
      const platforms = [
        // Ground level platforms
        { x: -8, y: 2.25, z: -8, w: 5, d: 5 },
        { x: 8, y: 2.25, z: -8, w: 5, d: 5 },
        { x: 0, y: 2.25, z: -12, w: 4, d: 4 },
        // Second level
        { x: -10, y: 4.5, z: 0, w: 4, d: 4 },
        { x: 10, y: 4.5, z: 0, w: 4, d: 4 },
        { x: 0, y: 4.5, z: 8, w: 6, d: 4 },
        // Third level
        { x: -6, y: 6.5, z: -6, w: 3, d: 3 },
        { x: 6, y: 6.5, z: -6, w: 3, d: 3 },
        { x: 0, y: 6.5, z: 0, w: 4, d: 4 },
        // Top level
        { x: 0, y: 8.5, z: -10, w: 5, d: 3 },
      ];
      
      platforms.forEach(p => {
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
      
      // Jump
      if ((keys['Space'] || keys['KeySpace']) && player.onGround) {
        player.velocity.y = 8;
        player.onGround = false;
      }
      
      // Boundary
      player.position.x = Math.max(-14, Math.min(14, player.position.x));
      player.position.z = Math.max(-14, Math.min(14, player.position.z));
      
      // Check portals
      checkPortalTeleport();
      
      // Check targets
      checkTargets();
      
      // Animate portals
      const elapsed = clockRef.current.getElapsedTime();
      if (portalsRef.current.blue?.mesh) {
        portalsRef.current.blue.mesh.rotation.z = elapsed;
      }
      if (portalsRef.current.orange?.mesh) {
        portalsRef.current.orange.mesh.rotation.z = -elapsed;
      }
      
      // Animate targets
      targetsRef.current.forEach((target, i) => {
        if (target.visible) {
          target.position.y += Math.sin(elapsed * 3 + i) * 0.01;
          target.rotation.y = elapsed;
        }
      });
      
      // Animate sword based on action
      if (swordRef.current && swordSlashRef.current > 0) {
        const progress = swordSlashRef.current;
        const action = swordActionRef.current;
        
        if (action === 'slash') {
          // Diagonal slash for portal shooting
          const slashAngle = Math.sin(progress * Math.PI) * 1.2;
          swordRef.current.rotation.x = 0.3 - slashAngle;
          swordRef.current.rotation.z = 0.15 + slashAngle * 0.6;
          swordRef.current.position.x = 0.4 - Math.sin(progress * Math.PI) * 0.1;
        } else if (action === 'parry') {
          // Horizontal parry stance
          const parryAngle = Math.sin(progress * Math.PI) * 0.5;
          swordRef.current.rotation.x = 0.3;
          swordRef.current.rotation.z = 0.15 + parryAngle;
          swordRef.current.rotation.y = -0.4 + parryAngle * 1.5;
          swordRef.current.position.x = 0.4 + parryAngle * 0.3;
        } else if (action === 'strike') {
          // Forward thrust strike
          const strikeProgress = Math.sin(progress * Math.PI);
          swordRef.current.rotation.x = 0.3 - strikeProgress * 0.8;
          swordRef.current.rotation.z = 0.15;
          swordRef.current.position.z = -0.7 - strikeProgress * 0.3;
          swordRef.current.position.y = -0.4 + strikeProgress * 0.1;
        }
        
        swordSlashRef.current -= delta * 3;
        
        if (swordSlashRef.current <= 0) {
          swordSlashRef.current = 0;
          swordRef.current.rotation.set(0.3, -0.4, 0.15);
          swordRef.current.position.set(0.4, -0.4, -0.7);
        }
      }
      
      // Sword idle animation (gentle sway)
      if (swordRef.current && swordSlashRef.current <= 0) {
        swordRef.current.position.y = -0.4 + Math.sin(elapsed * 2) * 0.015;
        swordRef.current.rotation.z = 0.15 + Math.sin(elapsed * 1.5) * 0.03;
        
        // Pulse glow based on portal mode
        const pulseIntensity = 0.6 + Math.sin(elapsed * 3) * 0.2;
        ['edge', 'edge2', 'tip'].forEach(name => {
          const mesh = swordRef.current?.getObjectByName(name) as THREE.Mesh;
          if (mesh && mesh.material) {
            (mesh.material as THREE.MeshBasicMaterial).opacity = pulseIntensity;
          }
        });
      }
      
      // Update enemies with attack patterns like ParryPro/ClickDraw
      enemiesRef.current.forEach((enemy, index) => {
        if (enemy.state === 'dead') return;
        
        // Update cooldowns
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
        enemy.hitCooldown = Math.max(0, enemy.hitCooldown - delta);
        
        // Distance to player
        const distToPlayer = enemy.position.distanceTo(player.position);
        
        // AI behavior with wind-up patterns
        if (enemy.state === 'winding_up') {
          // Wind-up animation - enemy prepares to attack (blue glow)
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          if (body) {
            const windUpPulse = Math.sin(elapsed * 10) * 0.5 + 0.5;
            (body.material as THREE.MeshStandardMaterial).emissive.setHex(
              windUpPulse > 0.5 ? 0x0044ff : 0x002288
            );
          }
          
          // After 0.8 seconds, execute attack
          if (enemy.attackCooldown <= 1.2) {
            enemy.state = 'attacking';
            // Flash red when attacking!
            if (body) {
              (body.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
            }
            
            // Check if player is parrying at the right moment
            if (parryActiveRef.current) {
              // Perfect parry timing!
              setScore(prev => prev + 200);
              setMessage('⚡ PERFECT PARRY! +200');
              setTimeout(() => setMessage(''), 1000);
              
              enemy.hitCooldown = 1.5;
              enemy.state = 'stunned';
              
              const knockback = new THREE.Vector3()
                .subVectors(enemy.position, player.position)
                .normalize()
                .multiplyScalar(4);
              enemy.position.add(knockback);
            } else if (playerHealth > 0) {
              // Player takes damage
              setPlayerHealth(prev => prev - 1);
              setMessage('💔 Hit by enemy! -1 HP');
              setTimeout(() => setMessage(''), 1500);
            }
            
            enemy.attackCooldown = 2.5; // Full cooldown after attack
          }
        } else if (enemy.state === 'stunned') {
          // Stunned - can't move, yellow glow
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          if (body) {
            (body.material as THREE.MeshStandardMaterial).emissive.setHex(0xffff00);
          }
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
          
          // Reset color when chasing
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          if (body) {
            (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x330000);
          }
        } else {
          enemy.state = 'idle';
          // Reset color when idle
          const body = enemy.mesh.getObjectByName('body') as THREE.Mesh;
          if (body) {
            (body.material as THREE.MeshStandardMaterial).emissive.setHex(0x220000);
          }
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
      
      // Check game over
      if (playerHealth <= 0) {
        setGameState('gameover');
        if (onGameEnd) onGameEnd(score);
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
        if (onGameEnd) onGameEnd(score + 500);
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
        setPortalMode('blue');
        updateSwordColor('blue');
      }
      if (e.code === 'KeyE') {
        setPortalMode('orange');
        updateSwordColor('orange');
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
    if (portalsRef.current.blue?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.blue.mesh);
    }
    if (portalsRef.current.orange?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.orange.mesh);
    }
    portalsRef.current = { blue: null, orange: null };
    
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
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400 mb-6">
              🌀 WORMHOLE
            </h1>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">🗡️ Controls</h2>
              <div className="space-y-2 text-gray-300">
                <p>• <span className="text-blue-400">Left-click</span> - Sword slash (shoot portal)</p>
                <p>• <span className="text-red-400">V</span> - Strike (attack enemies!)</p>
                <p>• <span className="text-yellow-400">X</span> - Parry (block enemy attacks!)</p>
                <p>• <span className="text-orange-400">Right-click + drag</span> - Look around</p>
                <p>• <span className="text-blue-400">WASD</span> - Move • <span className="text-blue-400">Space</span> - Jump</p>
                <p>• <span className="text-blue-400">Q</span> - Blue portal 🔵 • <span className="text-orange-400">E</span> - Orange portal 🟠</p>
              </div>
            </div>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">🎯 Objective</h2>
              <div className="space-y-2 text-gray-300">
                <p>• Collect all <span className="text-yellow-400">golden orbs</span> using portals</p>
                <p>• Fight <span className="text-red-400">red enemies</span> with your sword (3 hits to kill)</p>
                <p>• Walk through portals - exit facing the <span className="text-blue-400">opposite direction</span></p>
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
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-500 hover:to-orange-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105"
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
          
          {/* Portal Mode */}
          <div className="absolute top-4 right-4 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold ${
              portalMode === 'blue' ? 'bg-blue-600' : 'bg-orange-600'
            }`}>
              {portalMode === 'blue' ? '🔵 BLUE' : '🟠 ORANGE'} PORTAL
            </div>
          </div>
          
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`w-8 h-8 border-2 rounded-full ${
              portalMode === 'blue' ? 'border-blue-400' : 'border-orange-400'
            }`}>
              <div className={`absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                portalMode === 'blue' ? 'bg-blue-400' : 'bg-orange-400'
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
                <span>WASD move • Click shoot • <span className="text-red-400">V</span>=Strike • <span className="text-yellow-400">X</span>=Parry • Q🔵/E🟠</span>
              ) : (
                <span>Right-drag look • Click shoot • <span className="text-red-400">V</span>=Strike • <span className="text-yellow-400">X</span>=Parry • Q🔵/E🟠</span>
              )}
            </div>
          </div>
          
          {/* Sword POV Indicator */}
          <div className="absolute bottom-32 right-4 z-30 pointer-events-none">
            <div className={`text-6xl transform -rotate-45 transition-all ${
              swordSlashRef.current > 0 ? 'scale-125 rotate-0' : ''
            }`}>
              <span className="drop-shadow-lg" style={{
                textShadow: portalMode === 'blue' 
                  ? '0 0 20px #00aaff, 0 0 40px #00aaff, 0 0 60px #00aaff'
                  : '0 0 20px #ff6600, 0 0 40px #ff6600, 0 0 60px #ff6600',
                filter: `drop-shadow(0 0 10px ${portalMode === 'blue' ? '#00aaff' : '#ff6600'})`
              }}>🗡️</span>
            </div>
            <div className={`text-xs text-center mt-1 font-bold ${
              portalMode === 'blue' ? 'text-blue-400' : 'text-orange-400'
            }`}>
              {portalMode.toUpperCase()}
            </div>
          </div>
          
          {/* Mobile controls */}
          {isMobile && (
            <div className="absolute bottom-16 left-4 right-4 z-40 flex justify-between items-end">
              {/* Left: D-pad for movement */}
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
                    portalMode === 'blue' ? 'bg-blue-500/50' : 'bg-orange-500/50'
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
                    className="w-14 h-14 bg-blue-600/50 rounded-full text-white text-xl active:bg-blue-600"
                    onClick={() => { setPortalMode('blue'); shootPortal('blue'); }}
                  >🔵</button>
                  <button 
                    className="w-14 h-14 bg-orange-600/50 rounded-full text-white text-xl active:bg-orange-600"
                    onClick={() => { setPortalMode('orange'); shootPortal('orange'); }}
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
          <div className="text-center p-8 bg-gradient-to-br from-blue-900/80 to-orange-900/80 rounded-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">Test Complete!</h2>
            <p className="text-4xl font-bold text-green-400 mb-6">{score} points</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-orange-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
