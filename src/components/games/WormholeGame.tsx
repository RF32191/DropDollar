'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

interface Portal {
  position: THREE.Vector3;
  color: 'orange' | 'blue';
  normal: THREE.Vector3;
  mesh: THREE.Mesh;
  active: boolean;
}

interface Enemy {
  mesh: THREE.Group;
  health: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  type: 'drone' | 'turret';
  lastShot: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  isPortal: boolean;
  portalColor?: 'orange' | 'blue';
}

interface FloatingScore {
  id: number;
  text: string;
  position: THREE.Vector3;
  opacity: number;
  color: string;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [ammo, setAmmo] = useState(30);
  const [portalMode, setPortalMode] = useState<'orange' | 'blue'>('orange');
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Game state refs
  const playerRef = useRef({
    position: new THREE.Vector3(0, 2, 5),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Euler(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: true,
  });
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef({ x: 0, y: 0, clicked: false, rightClicked: false });
  const portalsRef = useRef<Portal[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const platformsRef = useRef<THREE.Mesh[]>([]);
  const gunRef = useRef<THREE.Group | null>(null);
  const scoreIdRef = useRef(0);
  const lastTouchRef = useRef({ x: 0, y: 0 });

  // Detect mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Add floating score
  const addFloatingScore = useCallback((text: string, position: THREE.Vector3, color: string) => {
    const id = scoreIdRef.current++;
    setFloatingScores(prev => [...prev, {
      id,
      text,
      position: position.clone(),
      opacity: 1,
      color
    }]);
    
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  // Create portal gun
  const createGun = useCallback((scene: THREE.Scene) => {
    const gun = new THREE.Group();
    
    // Main body (black)
    const bodyGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    gun.add(body);
    
    // Barrel (black with orange glow ring)
    const barrelGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.3, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0a0a0a,
      metalness: 0.9,
      roughness: 0.1
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.35;
    gun.add(barrel);
    
    // Orange energy ring
    const ringGeometry = new THREE.TorusGeometry(0.06, 0.015, 8, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 2
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.z = -0.5;
    gun.add(ring);
    
    // Blue energy ring (inner)
    const ring2Geometry = new THREE.TorusGeometry(0.035, 0.01, 8, 16);
    const ring2Material = new THREE.MeshStandardMaterial({ 
      color: 0x00aaff,
      emissive: 0x00aaff,
      emissiveIntensity: 2
    });
    const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
    ring2.position.z = -0.52;
    gun.add(ring2);
    
    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.1);
    const handle = new THREE.Mesh(handleGeometry, bodyMaterial);
    handle.position.set(0, -0.1, 0.1);
    handle.rotation.x = 0.3;
    gun.add(handle);
    
    // Position gun in view
    gun.position.set(0.3, -0.25, -0.5);
    gun.rotation.y = 0.1;
    
    gunRef.current = gun;
    return gun;
  }, []);

  // Create enemy
  const createEnemy = useCallback((scene: THREE.Scene, position: THREE.Vector3, type: 'drone' | 'turret'): Enemy => {
    const group = new THREE.Group();
    
    if (type === 'drone') {
      // Floating drone enemy
      const bodyGeometry = new THREE.SphereGeometry(0.4, 16, 16);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0xff0000,
        emissiveIntensity: 0.3,
        metalness: 0.7,
        roughness: 0.3
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      group.add(body);
      
      // Eye
      const eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
      });
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.z = 0.3;
      group.add(eye);
      
      // Propellers
      for (let i = 0; i < 4; i++) {
        const propGeometry = new THREE.BoxGeometry(0.5, 0.02, 0.1);
        const propMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const prop = new THREE.Mesh(propGeometry, propMaterial);
        prop.position.y = 0.3;
        prop.rotation.y = (i * Math.PI) / 2;
        group.add(prop);
      }
    } else {
      // Turret enemy
      const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      group.add(base);
      
      // Gun barrel
      const barrelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
      const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.9,
        roughness: 0.1
      });
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.2, 0.3);
      group.add(barrel);
      
      // Red light
      const lightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2
      });
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(0, 0.3, 0);
      group.add(light);
    }
    
    group.position.copy(position);
    scene.add(group);
    
    return {
      mesh: group,
      health: type === 'drone' ? 30 : 50,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      type,
      lastShot: 0
    };
  }, []);

  // Create level
  const createLevel = useCallback((scene: THREE.Scene, level: number) => {
    // Clear old objects
    platformsRef.current.forEach(p => scene.remove(p));
    platformsRef.current = [];
    enemiesRef.current.forEach(e => scene.remove(e.mesh));
    enemiesRef.current = [];
    portalsRef.current.forEach(p => scene.remove(p.mesh));
    portalsRef.current = [];
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.3,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    platformsRef.current.push(floor);
    
    // Walls with portal-able surfaces
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x333344,
      metalness: 0.2,
      roughness: 0.6
    });
    
    // Create walls
    const walls: THREE.Mesh[] = [];
    
    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 0.5), wallMaterial);
    backWall.position.set(0, 5, -15);
    scene.add(backWall);
    walls.push(backWall);
    
    // Front wall with opening
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 0.5), wallMaterial);
    frontWallLeft.position.set(-9, 5, 15);
    scene.add(frontWallLeft);
    walls.push(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 0.5), wallMaterial);
    frontWallRight.position.set(9, 5, 15);
    scene.add(frontWallRight);
    walls.push(frontWallRight);
    
    // Side walls
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 30), wallMaterial);
    leftWall.position.set(-15, 5, 0);
    scene.add(leftWall);
    walls.push(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 30), wallMaterial);
    rightWall.position.set(15, 5, 0);
    scene.add(rightWall);
    walls.push(rightWall);
    
    platformsRef.current.push(...walls);
    
    // Add platforms based on level
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x445566,
      metalness: 0.4,
      roughness: 0.5
    });
    
    // Platforms
    const platformConfigs = [
      { pos: new THREE.Vector3(-8, 3, -8), size: new THREE.Vector3(4, 0.5, 4) },
      { pos: new THREE.Vector3(8, 5, -8), size: new THREE.Vector3(4, 0.5, 4) },
      { pos: new THREE.Vector3(0, 7, -12), size: new THREE.Vector3(6, 0.5, 4) },
      { pos: new THREE.Vector3(-10, 4, 0), size: new THREE.Vector3(3, 0.5, 6) },
      { pos: new THREE.Vector3(10, 6, 0), size: new THREE.Vector3(3, 0.5, 6) },
    ];
    
    platformConfigs.forEach((config, i) => {
      if (i < level + 2) {
        const platform = new THREE.Mesh(
          new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z),
          platformMaterial
        );
        platform.position.copy(config.pos);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        platformsRef.current.push(platform);
      }
    });
    
    // Add enemies based on level
    const enemyCount = Math.min(3 + level * 2, 10);
    for (let i = 0; i < enemyCount; i++) {
      const type = Math.random() > 0.5 ? 'drone' : 'turret';
      const x = (Math.random() - 0.5) * 20;
      const y = type === 'drone' ? 3 + Math.random() * 4 : 0.15;
      const z = (Math.random() - 0.5) * 20;
      
      const enemy = createEnemy(scene, new THREE.Vector3(x, y, z), type);
      enemiesRef.current.push(enemy);
    }
    
    // Add puzzle elements - buttons and doors
    const buttonMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5
    });
    
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      buttonMaterial
    );
    button.position.set(8, 0.05, -12);
    button.rotation.x = 0;
    scene.add(button);
    
    // Goal portal (exit)
    const goalGeometry = new THREE.TorusGeometry(1.5, 0.2, 8, 32);
    const goalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    const goal = new THREE.Mesh(goalGeometry, goalMaterial);
    goal.position.set(0, 8.5, -14);
    scene.add(goal);
    
    // Goal inner glow
    const goalInner = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 32),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      })
    );
    goalInner.position.set(0, 8.5, -14);
    scene.add(goalInner);
  }, [createEnemy]);

  // Shoot projectile
  const shoot = useCallback((isPortalShot: boolean, portalColor?: 'orange' | 'blue') => {
    if (!sceneRef.current || !cameraRef.current) return;
    if (!isPortalShot && ammo <= 0) return;
    
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const projectileGeometry = new THREE.SphereGeometry(isPortalShot ? 0.15 : 0.08, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({
      color: isPortalShot ? (portalColor === 'orange' ? 0xff6600 : 0x00aaff) : 0xffff00,
      emissive: isPortalShot ? (portalColor === 'orange' ? 0xff6600 : 0x00aaff) : 0xffff00,
      emissiveIntensity: 2
    });
    
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(camera.position);
    projectile.position.add(direction.clone().multiplyScalar(0.5));
    scene.add(projectile);
    
    projectilesRef.current.push({
      mesh: projectile,
      velocity: direction.multiplyScalar(isPortalShot ? 40 : 60),
      isPortal: isPortalShot,
      portalColor
    });
    
    if (!isPortalShot) {
      setAmmo(prev => prev - 1);
    }
  }, [ammo]);

  // Create portal on surface
  const createPortal = useCallback((position: THREE.Vector3, normal: THREE.Vector3, color: 'orange' | 'blue') => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    // Remove existing portal of same color
    const existingIndex = portalsRef.current.findIndex(p => p.color === color);
    if (existingIndex !== -1) {
      scene.remove(portalsRef.current[existingIndex].mesh);
      portalsRef.current.splice(existingIndex, 1);
    }
    
    // Create new portal
    const portalGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 32);
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: color === 'orange' ? 0xff6600 : 0x00aaff,
      emissive: color === 'orange' ? 0xff6600 : 0x00aaff,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.9
    });
    
    const portalMesh = new THREE.Mesh(portalGeometry, portalMaterial);
    portalMesh.position.copy(position);
    portalMesh.position.add(normal.clone().multiplyScalar(0.1));
    
    // Orient portal to face outward from wall
    portalMesh.lookAt(position.clone().add(normal));
    
    // Add inner swirl
    const innerGeometry = new THREE.CircleGeometry(0.7, 32);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: color === 'orange' ? 0xff6600 : 0x00aaff,
      emissive: color === 'orange' ? 0xff3300 : 0x0066ff,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    portalMesh.add(inner);
    
    scene.add(portalMesh);
    
    portalsRef.current.push({
      position: position.clone(),
      color,
      normal: normal.clone(),
      mesh: portalMesh,
      active: true
    });
    
    // Check if both portals exist
    if (portalsRef.current.length === 2) {
      addFloatingScore('PORTALS LINKED!', position, '#00ffff');
    }
  }, [addFloatingScore]);

  // Initialize game
  useEffect(() => {
    if (!containerRef.current || gameState !== 'playing') return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 10, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add some colored point lights for atmosphere
    const orangeLight = new THREE.PointLight(0xff6600, 1, 20);
    orangeLight.position.set(-10, 5, -10);
    scene.add(orangeLight);

    const blueLight = new THREE.PointLight(0x00aaff, 1, 20);
    blueLight.position.set(10, 5, 10);
    scene.add(blueLight);

    // Create gun and attach to camera
    const gun = createGun(scene);
    camera.add(gun);
    scene.add(camera);

    // Create level
    createLevel(scene, currentLevel);

    // Reset player position
    playerRef.current.position.set(0, 2, 10);
    playerRef.current.velocity.set(0, 0, 0);
    playerRef.current.yaw = 0;
    playerRef.current.pitch = 0;

    // Event handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      // Switch portal mode with Q
      if (e.code === 'KeyQ') {
        setPortalMode(prev => prev === 'orange' ? 'blue' : 'orange');
      }
      
      // Shoot with space (regular shot)
      if (e.code === 'Space') {
        shoot(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        playerRef.current.yaw -= e.movementX * 0.002;
        playerRef.current.pitch -= e.movementY * 0.002;
        playerRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, playerRef.current.pitch));
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
        return;
      }
      
      if (e.button === 0) {
        // Left click - shoot regular
        shoot(false);
      } else if (e.button === 2) {
        // Right click - shoot portal
        shoot(true, portalMode);
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    // Touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
        const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
        
        playerRef.current.yaw -= deltaX * 0.005;
        playerRef.current.pitch -= deltaY * 0.005;
        playerRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, playerRef.current.pitch));
        
        lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      const delta = Math.min(clockRef.current.getDelta(), 0.1);
      const player = playerRef.current;
      const keys = keysRef.current;
      
      // Player movement
      const moveSpeed = 8;
      const moveDirection = new THREE.Vector3();
      
      if (keys['KeyW']) moveDirection.z -= 1;
      if (keys['KeyS']) moveDirection.z += 1;
      if (keys['KeyA']) moveDirection.x -= 1;
      if (keys['KeyD']) moveDirection.x += 1;
      
      if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
        player.velocity.x = moveDirection.x * moveSpeed;
        player.velocity.z = moveDirection.z * moveSpeed;
      } else {
        player.velocity.x *= 0.9;
        player.velocity.z *= 0.9;
      }
      
      // Jump
      if (keys['Space'] && player.onGround) {
        player.velocity.y = 8;
        player.onGround = false;
      }
      
      // Gravity
      player.velocity.y -= 20 * delta;
      
      // Update position
      player.position.add(player.velocity.clone().multiplyScalar(delta));
      
      // Ground collision
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
      
      // Boundary collision
      player.position.x = Math.max(-14, Math.min(14, player.position.x));
      player.position.z = Math.max(-14, Math.min(14, player.position.z));
      
      // Check portal teleportation
      if (portalsRef.current.length === 2) {
        portalsRef.current.forEach((portal, index) => {
          const otherPortal = portalsRef.current[1 - index];
          const distance = player.position.distanceTo(portal.position);
          
          if (distance < 1) {
            // Teleport to other portal
            player.position.copy(otherPortal.position);
            player.position.add(otherPortal.normal.clone().multiplyScalar(1.5));
            
            addFloatingScore('+50 TELEPORT', player.position.clone(), '#00ffff');
            setScore(prev => prev + 50);
          }
        });
      }
      
      // Update camera
      camera.position.copy(player.position);
      camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      
      // Gun bob animation
      if (gunRef.current) {
        const bobAmount = Math.sin(Date.now() * 0.005) * 0.01;
        gunRef.current.position.y = -0.25 + bobAmount;
        
        // Update gun ring color based on portal mode
        const ring = gunRef.current.children[2] as THREE.Mesh;
        if (ring && ring.material) {
          const ringMat = ring.material as THREE.MeshStandardMaterial;
          ringMat.color.setHex(portalMode === 'orange' ? 0xff6600 : 0x00aaff);
          ringMat.emissive.setHex(portalMode === 'orange' ? 0xff6600 : 0x00aaff);
        }
      }
      
      // Update projectiles
      projectilesRef.current = projectilesRef.current.filter(proj => {
        proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));
        
        // Check wall collision for portals
        if (proj.isPortal) {
          for (const platform of platformsRef.current) {
            const box = new THREE.Box3().setFromObject(platform);
            if (box.containsPoint(proj.mesh.position)) {
              // Calculate hit normal based on platform orientation
              const normal = new THREE.Vector3();
              const center = new THREE.Vector3();
              box.getCenter(center);
              
              // Simple normal calculation
              const diff = proj.mesh.position.clone().sub(center);
              if (Math.abs(diff.x) > Math.abs(diff.y) && Math.abs(diff.x) > Math.abs(diff.z)) {
                normal.x = Math.sign(diff.x);
              } else if (Math.abs(diff.y) > Math.abs(diff.z)) {
                normal.y = Math.sign(diff.y);
              } else {
                normal.z = Math.sign(diff.z);
              }
              
              createPortal(proj.mesh.position.clone(), normal, proj.portalColor!);
              scene.remove(proj.mesh);
              return false;
            }
          }
        } else {
          // Check enemy hits
          for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            const enemy = enemiesRef.current[i];
            const distance = proj.mesh.position.distanceTo(enemy.position);
            
            if (distance < 0.6) {
              enemy.health -= 25;
              
              // Flash enemy red
              enemy.mesh.traverse(child => {
                if (child instanceof THREE.Mesh) {
                  const mat = child.material as THREE.MeshStandardMaterial;
                  if (mat.emissive) {
                    mat.emissive.setHex(0xff0000);
                    mat.emissiveIntensity = 3;
                  }
                }
              });
              
              setTimeout(() => {
                enemy.mesh.traverse(child => {
                  if (child instanceof THREE.Mesh) {
                    const mat = child.material as THREE.MeshStandardMaterial;
                    if (mat.emissive) {
                      mat.emissiveIntensity = 0.3;
                    }
                  }
                });
              }, 100);
              
              if (enemy.health <= 0) {
                scene.remove(enemy.mesh);
                enemiesRef.current.splice(i, 1);
                
                const points = enemy.type === 'drone' ? 100 : 150;
                setScore(prev => prev + points);
                setEnemiesKilled(prev => prev + 1);
                addFloatingScore(`+${points}`, enemy.position.clone(), '#00ff00');
                
                // Drop ammo
                setAmmo(prev => Math.min(prev + 5, 50));
              } else {
                addFloatingScore('-25 HP', enemy.position.clone(), '#ff6600');
              }
              
              scene.remove(proj.mesh);
              return false;
            }
          }
        }
        
        // Remove if too far
        if (proj.mesh.position.length() > 50) {
          scene.remove(proj.mesh);
          return false;
        }
        
        return true;
      });
      
      // Update enemies
      enemiesRef.current.forEach(enemy => {
        if (enemy.type === 'drone') {
          // Move toward player
          const toPlayer = player.position.clone().sub(enemy.position);
          toPlayer.y = 0;
          toPlayer.normalize();
          
          enemy.velocity.x = toPlayer.x * 2;
          enemy.velocity.z = toPlayer.z * 2;
          enemy.position.add(enemy.velocity.clone().multiplyScalar(delta));
          
          // Bob up and down
          enemy.position.y = 3 + Math.sin(Date.now() * 0.003 + enemy.position.x) * 0.5;
          
          // Rotate propellers
          enemy.mesh.children.forEach((child, i) => {
            if (i > 1) {
              child.rotation.y += delta * 20;
            }
          });
        }
        
        // Look at player
        const lookTarget = player.position.clone();
        lookTarget.y = enemy.position.y;
        enemy.mesh.lookAt(lookTarget);
        enemy.mesh.position.copy(enemy.position);
        
        // Shoot at player
        const now = Date.now();
        if (now - enemy.lastShot > 2000) {
          const distance = player.position.distanceTo(enemy.position);
          if (distance < 15) {
            enemy.lastShot = now;
            
            // Create enemy projectile
            const direction = player.position.clone().sub(enemy.position).normalize();
            const projGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const projMaterial = new THREE.MeshStandardMaterial({
              color: 0xff0000,
              emissive: 0xff0000,
              emissiveIntensity: 2
            });
            const proj = new THREE.Mesh(projGeometry, projMaterial);
            proj.position.copy(enemy.position);
            scene.add(proj);
            
            // Track as enemy projectile (negative damage to player)
            const enemyProj = {
              mesh: proj,
              velocity: direction.multiplyScalar(15),
              isPortal: false
            };
            
            // Check player hit after short delay
            setTimeout(() => {
              const dist = proj.position.distanceTo(player.position);
              if (dist < 1) {
                setHealth(prev => {
                  const newHealth = prev - 10;
                  if (newHealth <= 0) {
                    setGameState('gameover');
                  }
                  return Math.max(0, newHealth);
                });
                addFloatingScore('-10 HP', player.position.clone(), '#ff0000');
              }
              scene.remove(proj);
            }, 1000);
          }
        }
      });
      
      // Rotate portals
      portalsRef.current.forEach(portal => {
        portal.mesh.rotation.z += delta * 0.5;
      });
      
      // Check level complete
      const goalDistance = player.position.distanceTo(new THREE.Vector3(0, 8.5, -14));
      if (goalDistance < 2 && enemiesRef.current.length === 0) {
        setScore(prev => prev + 500);
        addFloatingScore('+500 LEVEL COMPLETE!', player.position.clone(), '#00ffff');
        setCurrentLevel(prev => prev + 1);
        createLevel(scene, currentLevel + 1);
        player.position.set(0, 2, 10);
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearInterval(timerInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState, createGun, createLevel, createPortal, shoot, addFloatingScore, currentLevel, portalMode]);

  // Mobile controls
  const handleMobileShoot = () => {
    shoot(false);
  };

  const handleMobilePortal = () => {
    shoot(true, portalMode);
  };

  const handleMobileJump = () => {
    if (playerRef.current.onGround) {
      playerRef.current.velocity.y = 8;
      playerRef.current.onGround = false;
    }
  };

  const handleMobileMove = (direction: 'forward' | 'back' | 'left' | 'right') => {
    const keys = keysRef.current;
    keys['KeyW'] = direction === 'forward';
    keys['KeyS'] = direction === 'back';
    keys['KeyA'] = direction === 'left';
    keys['KeyD'] = direction === 'right';
  };

  const handleMobileStop = () => {
    keysRef.current = {};
  };

  // Instructions screen
  if (gameState === 'instructions') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated wormhole effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2"
                style={{
                  width: `${150 + i * 80}px`,
                  height: `${150 + i * 80}px`,
                  borderColor: i % 2 === 0 ? '#ff6600' : '#00aaff',
                  animation: `spin ${3 + i}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
                  opacity: 0.3 + i * 0.1
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="relative z-10 bg-black/80 rounded-2xl p-8 max-w-lg mx-4 border border-orange-500/50">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
            WORMHOLE
          </h1>
          <p className="text-gray-400 text-center mb-6">Portal Gun Adventure</p>
          
          <div className="space-y-4 text-gray-300 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-orange-400 font-semibold mb-2">🎮 Controls</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-blue-400">WASD</span> - Move</div>
                <div><span className="text-blue-400">Mouse</span> - Look</div>
                <div><span className="text-blue-400">Left Click</span> - Shoot</div>
                <div><span className="text-blue-400">Right Click</span> - Portal</div>
                <div><span className="text-blue-400">Space</span> - Jump</div>
                <div><span className="text-blue-400">Q</span> - Switch Portal</div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-2">🎯 Objectives</h3>
              <ul className="text-sm space-y-1">
                <li>• Destroy all enemies to unlock the exit</li>
                <li>• Use portals to reach high platforms</li>
                <li>• Collect ammo from defeated enemies</li>
                <li>• Reach the cyan exit portal</li>
              </ul>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold mb-2">📊 Scoring</h3>
              <div className="text-sm space-y-1">
                <div>Drone Kill: <span className="text-green-400">+100</span></div>
                <div>Turret Kill: <span className="text-green-400">+150</span></div>
                <div>Teleport: <span className="text-cyan-400">+50</span></div>
                <div>Level Complete: <span className="text-yellow-400">+500</span></div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setGameState('playing')}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 text-white font-bold rounded-xl text-xl transition-all transform hover:scale-105"
          >
            ENTER THE WORMHOLE
          </button>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Game over screen
  if (gameState === 'gameover') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center">
        <div className="bg-black/80 rounded-2xl p-8 max-w-md mx-4 border border-red-500/50 text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h1>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-400">{score.toLocaleString()}</div>
              <div className="text-gray-400">Final Score</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{enemiesKilled}</div>
                <div className="text-gray-400 text-sm">Enemies Killed</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">{currentLevel}</div>
                <div className="text-gray-400 text-sm">Level Reached</div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => {
                setScore(0);
                setHealth(100);
                setAmmo(30);
                setTimeLeft(120);
                setCurrentLevel(1);
                setEnemiesKilled(0);
                setGameState('playing');
              }}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
            >
              TRY AGAIN
            </button>
            <button
              onClick={() => onGameEnd?.(score)}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="relative w-full h-full min-h-[600px]">
      <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* Left HUD */}
        <div className="space-y-2">
          {/* Health */}
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-red-400 text-xs font-bold mb-1">HEALTH</div>
            <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
          
          {/* Ammo */}
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-yellow-400 text-xs font-bold">AMMO: {ammo}</div>
          </div>
        </div>
        
        {/* Center - Score & Time */}
        <div className="text-center">
          <div className="bg-black/70 rounded-lg px-6 py-2 backdrop-blur-sm">
            <div className="text-yellow-400 text-2xl font-bold">{score.toLocaleString()}</div>
            <div className="text-gray-400 text-xs">SCORE</div>
          </div>
          <div className="bg-black/70 rounded-lg px-4 py-1 mt-2 backdrop-blur-sm">
            <div className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        
        {/* Right HUD */}
        <div className="space-y-2">
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-cyan-400 text-xs font-bold">LEVEL {currentLevel}</div>
          </div>
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-gray-400 text-xs">ENEMIES</div>
            <div className="text-red-400 font-bold">{enemiesRef.current.length}</div>
          </div>
          <button
            onClick={() => setPortalMode(prev => prev === 'orange' ? 'blue' : 'orange')}
            className={`pointer-events-auto px-4 py-2 rounded-lg font-bold text-sm ${
              portalMode === 'orange' ? 'bg-orange-600' : 'bg-blue-600'
            }`}
          >
            {portalMode.toUpperCase()} PORTAL
          </button>
        </div>
      </div>
      
      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div className="w-1 h-6 bg-white/80 absolute -top-3 left-1/2 -translate-x-1/2" />
          <div className="w-1 h-6 bg-white/80 absolute top-3 left-1/2 -translate-x-1/2" />
          <div className="w-6 h-1 bg-white/80 absolute top-1/2 -left-3 -translate-y-1/2" />
          <div className="w-6 h-1 bg-white/80 absolute top-1/2 left-3 -translate-y-1/2" />
          <div className={`w-2 h-2 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
            portalMode === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
          }`} />
        </div>
      </div>
      
      {/* Floating scores */}
      {floatingScores.map(fs => (
        <div
          key={fs.id}
          className="absolute pointer-events-none font-bold text-xl animate-bounce"
          style={{
            left: '50%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
            color: fs.color,
            textShadow: `0 0 10px ${fs.color}`,
            animation: 'floatUp 1.5s ease-out forwards'
          }}
        >
          {fs.text}
        </div>
      ))}
      
      {/* Mobile controls */}
      {isMobile && (
        <>
          {/* Movement joystick area */}
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1">
            <div />
            <button
              className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl active:bg-white/40"
              onTouchStart={() => handleMobileMove('forward')}
              onTouchEnd={handleMobileStop}
            >
              ▲
            </button>
            <div />
            <button
              className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl active:bg-white/40"
              onTouchStart={() => handleMobileMove('left')}
              onTouchEnd={handleMobileStop}
            >
              ◀
            </button>
            <button
              className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-xl active:bg-white/40"
              onTouchStart={handleMobileJump}
            >
              ⬆
            </button>
            <button
              className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl active:bg-white/40"
              onTouchStart={() => handleMobileMove('right')}
              onTouchEnd={handleMobileStop}
            >
              ▶
            </button>
            <div />
            <button
              className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl active:bg-white/40"
              onTouchStart={() => handleMobileMove('back')}
              onTouchEnd={handleMobileStop}
            >
              ▼
            </button>
            <div />
          </div>
          
          {/* Action buttons */}
          <div className="absolute bottom-4 right-4 flex gap-3">
            <button
              className="w-16 h-16 bg-yellow-500/50 rounded-full flex items-center justify-center text-2xl active:bg-yellow-500/80"
              onTouchStart={handleMobileShoot}
            >
              🔫
            </button>
            <button
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl active:opacity-80 ${
                portalMode === 'orange' ? 'bg-orange-500/50' : 'bg-blue-500/50'
              }`}
              onTouchStart={handleMobilePortal}
            >
              🌀
            </button>
          </div>
        </>
      )}
      
      {/* Click to lock message */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none">
        {!isMobile && 'Click to lock mouse • Right-click for portal'}
      </div>
      
      <style jsx>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -150%); }
        }
      `}</style>
    </div>
  );
}

