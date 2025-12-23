'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/**
 * WORMHOLE - A Portal-Style Puzzle Game
 * PS3-Quality Graphics with Three.js
 * 
 * Features:
 * - True portal mechanics (see through, walk through)
 * - Momentum preservation
 * - Physics-based puzzles
 * - Aperture Science-inspired test chambers
 * - Companion Cube mechanics
 * - Multiple levels with increasing difficulty
 */

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

// Portal class for handling portal rendering and teleportation
class Portal {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  color: string;
  mesh: THREE.Mesh | null = null;
  linkedPortal: Portal | null = null;
  renderTarget: THREE.WebGLRenderTarget | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  
  constructor(position: THREE.Vector3, normal: THREE.Vector3, color: string) {
    this.position = position.clone();
    this.normal = normal.clone().normalize();
    this.color = color;
  }
}

// Physics object class
class PhysicsObject {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  mass: number;
  isHeld: boolean = false;
  type: 'cube' | 'button' | 'pellet';
  
  constructor(mesh: THREE.Mesh, mass: number, type: 'cube' | 'button' | 'pellet') {
    this.mesh = mesh;
    this.velocity = new THREE.Vector3();
    this.mass = mass;
    this.type = type;
  }
}

// Test chamber structure
interface TestChamber {
  walls: THREE.Mesh[];
  floor: THREE.Mesh;
  ceiling: THREE.Mesh;
  portalableWalls: THREE.Mesh[];
  buttons: THREE.Mesh[];
  doors: { mesh: THREE.Mesh; open: boolean; buttonRequired: number }[];
  cubes: PhysicsObject[];
  exitPortal: THREE.Mesh | null;
  spawnPoint: THREE.Vector3;
  exitPoint: THREE.Vector3;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'paused' | 'levelComplete' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [message, setMessage] = useState('');
  const [portalMode, setPortalMode] = useState<'blue' | 'orange'>('blue');
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fps, setFps] = useState(60);
  const [isMobile, setIsMobile] = useState(false);
  
  // Game state refs
  const playerRef = useRef({
    position: new THREE.Vector3(0, 2, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: true,
    canJump: true,
    speed: 8,
    jumpForce: 12,
    height: 1.8,
    crouching: false,
    holdingObject: null as PhysicsObject | null,
  });
  
  const portalsRef = useRef<{ blue: Portal | null; orange: Portal | null }>({
    blue: null,
    orange: null
  });
  
  const chamberRef = useRef<TestChamber | null>(null);
  const physicsObjectsRef = useRef<PhysicsObject[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const mouseRef = useRef({ x: 0, y: 0, buttons: 0 });
  const lastTeleportRef = useRef(0);
  const portalGunRef = useRef<THREE.Group | null>(null);
  const crosshairRef = useRef<THREE.Sprite | null>(null);
  
  // Textures and materials
  const materialsRef = useRef<{
    wall: THREE.MeshStandardMaterial;
    floor: THREE.MeshStandardMaterial;
    ceiling: THREE.MeshStandardMaterial;
    portalable: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    emissiveBlue: THREE.MeshStandardMaterial;
    emissiveOrange: THREE.MeshStandardMaterial;
    companionCube: THREE.MeshStandardMaterial;
    glass: THREE.MeshPhysicalMaterial;
    button: THREE.MeshStandardMaterial;
    door: THREE.MeshStandardMaterial;
    exit: THREE.MeshStandardMaterial;
  } | null>(null);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Initialize Three.js
  const initThreeJS = useCallback(() => {
    if (!containerRef.current) return;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 5, 80);
    sceneRef.current = scene;
    
    // Renderer with high quality settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 0);
    cameraRef.current = camera;
    
    // Create materials
    createMaterials();
    
    // Lighting
    setupLighting(scene);
    
    // Create portal gun
    createPortalGun(scene, camera);
    
    // Create crosshair
    createCrosshair(scene, camera);
    
    setLoadingProgress(100);
    setGameState('instructions');
  }, []);

  const createMaterials = useCallback(() => {
    // Aperture Science style materials
    const textureLoader = new THREE.TextureLoader();
    
    // Create procedural textures for test chamber look
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 512;
    wallCanvas.height = 512;
    const wallCtx = wallCanvas.getContext('2d')!;
    
    // White tile pattern
    wallCtx.fillStyle = '#e8e8e8';
    wallCtx.fillRect(0, 0, 512, 512);
    wallCtx.strokeStyle = '#cccccc';
    wallCtx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      wallCtx.beginPath();
      wallCtx.moveTo(i * 128, 0);
      wallCtx.lineTo(i * 128, 512);
      wallCtx.stroke();
      wallCtx.beginPath();
      wallCtx.moveTo(0, i * 128);
      wallCtx.lineTo(512, i * 128);
      wallCtx.stroke();
    }
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 2);
    
    // Portalable wall (darker panels)
    const portalableCanvas = document.createElement('canvas');
    portalableCanvas.width = 512;
    portalableCanvas.height = 512;
    const portalableCtx = portalableCanvas.getContext('2d')!;
    portalableCtx.fillStyle = '#3a3a4a';
    portalableCtx.fillRect(0, 0, 512, 512);
    portalableCtx.strokeStyle = '#2a2a3a';
    portalableCtx.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      portalableCtx.beginPath();
      portalableCtx.moveTo(i * 128, 0);
      portalableCtx.lineTo(i * 128, 512);
      portalableCtx.stroke();
      portalableCtx.beginPath();
      portalableCtx.moveTo(0, i * 128);
      portalableCtx.lineTo(512, i * 128);
      portalableCtx.stroke();
    }
    // Add portal-able indicator
    portalableCtx.fillStyle = '#5a5a6a';
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        portalableCtx.fillRect(x * 128 + 20, y * 128 + 20, 88, 88);
      }
    }
    const portalableTexture = new THREE.CanvasTexture(portalableCanvas);
    portalableTexture.wrapS = THREE.RepeatWrapping;
    portalableTexture.wrapT = THREE.RepeatWrapping;
    portalableTexture.repeat.set(2, 2);
    
    // Floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const floorCtx = floorCanvas.getContext('2d')!;
    floorCtx.fillStyle = '#2a2a3a';
    floorCtx.fillRect(0, 0, 512, 512);
    floorCtx.strokeStyle = '#3a3a4a';
    floorCtx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      floorCtx.beginPath();
      floorCtx.moveTo(i * 64, 0);
      floorCtx.lineTo(i * 64, 512);
      floorCtx.stroke();
      floorCtx.beginPath();
      floorCtx.moveTo(0, i * 64);
      floorCtx.lineTo(512, i * 64);
      floorCtx.stroke();
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);

    // Companion Cube texture
    const cubeCanvas = document.createElement('canvas');
    cubeCanvas.width = 256;
    cubeCanvas.height = 256;
    const cubeCtx = cubeCanvas.getContext('2d')!;
    cubeCtx.fillStyle = '#888899';
    cubeCtx.fillRect(0, 0, 256, 256);
    cubeCtx.strokeStyle = '#666677';
    cubeCtx.lineWidth = 8;
    cubeCtx.strokeRect(16, 16, 224, 224);
    // Heart in center
    cubeCtx.fillStyle = '#ff69b4';
    cubeCtx.beginPath();
    cubeCtx.moveTo(128, 180);
    cubeCtx.bezierCurveTo(128, 160, 90, 100, 60, 100);
    cubeCtx.bezierCurveTo(30, 100, 30, 140, 30, 140);
    cubeCtx.bezierCurveTo(30, 170, 60, 200, 128, 230);
    cubeCtx.bezierCurveTo(196, 200, 226, 170, 226, 140);
    cubeCtx.bezierCurveTo(226, 140, 226, 100, 196, 100);
    cubeCtx.bezierCurveTo(166, 100, 128, 160, 128, 180);
    cubeCtx.fill();
    const cubeTexture = new THREE.CanvasTexture(cubeCanvas);
    
    materialsRef.current = {
      wall: new THREE.MeshStandardMaterial({
        map: wallTexture,
        roughness: 0.8,
        metalness: 0.1,
      }),
      floor: new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.9,
        metalness: 0.2,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0,
        emissive: 0xffffff,
        emissiveIntensity: 0.3,
      }),
      portalable: new THREE.MeshStandardMaterial({
        map: portalableTexture,
        roughness: 0.6,
        metalness: 0.3,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: 0x666688,
        roughness: 0.3,
        metalness: 0.9,
      }),
      emissiveBlue: new THREE.MeshStandardMaterial({
        color: 0x0088ff,
        emissive: 0x0088ff,
        emissiveIntensity: 2,
        roughness: 0.2,
        metalness: 0.8,
      }),
      emissiveOrange: new THREE.MeshStandardMaterial({
        color: 0xff8800,
        emissive: 0xff8800,
        emissiveIntensity: 2,
        roughness: 0.2,
        metalness: 0.8,
      }),
      companionCube: new THREE.MeshStandardMaterial({
        map: cubeTexture,
        roughness: 0.5,
        metalness: 0.4,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.9,
        roughness: 0.1,
        metalness: 0,
        ior: 1.5,
        thickness: 0.5,
      }),
      button: new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.3,
        metalness: 0.7,
      }),
      door: new THREE.MeshStandardMaterial({
        color: 0x444466,
        roughness: 0.4,
        metalness: 0.6,
      }),
      exit: new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 1,
        roughness: 0.2,
        metalness: 0.5,
      }),
    };
  }, []);

  const setupLighting = useCallback((scene: THREE.Scene) => {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    
    // Main directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);
    
    // Hemisphere light for sky/ground color
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.6);
    scene.add(hemiLight);
  }, []);

  const createPortalGun = useCallback((scene: THREE.Scene, camera: THREE.Camera) => {
    const gunGroup = new THREE.Group();
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    gunGroup.add(body);
    
    // Front ring (glowing)
    const ringGeometry = new THREE.TorusGeometry(0.1, 0.02, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      emissive: 0x0088ff,
      emissiveIntensity: 2,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.z = -0.3;
    ring.name = 'portalRing';
    gunGroup.add(ring);
    
    // Prongs
    for (let i = 0; i < 3; i++) {
      const prongGeometry = new THREE.CylinderGeometry(0.015, 0.025, 0.2, 8);
      const prong = new THREE.Mesh(prongGeometry, bodyMaterial);
      const angle = (i / 3) * Math.PI * 2;
      prong.position.set(Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, -0.35);
      prong.rotation.x = Math.PI / 2;
      gunGroup.add(prong);
    }
    
    // Handle
    const handleGeometry = new THREE.BoxGeometry(0.04, 0.15, 0.08);
    const handle = new THREE.Mesh(handleGeometry, bodyMaterial);
    handle.position.set(0, -0.12, 0.1);
    gunGroup.add(handle);
    
    // Position gun in view
    gunGroup.position.set(0.3, -0.25, -0.5);
    gunGroup.rotation.y = -0.1;
    camera.add(gunGroup);
    scene.add(camera);
    
    portalGunRef.current = gunGroup;
  }, []);

  const createCrosshair = useCallback((scene: THREE.Scene, camera: THREE.Camera) => {
    const crosshairCanvas = document.createElement('canvas');
    crosshairCanvas.width = 64;
    crosshairCanvas.height = 64;
    const ctx = crosshairCanvas.getContext('2d')!;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    // Outer circle
    ctx.beginPath();
    ctx.arc(32, 32, 12, 0, Math.PI * 2);
    ctx.stroke();
    // Cross
    ctx.beginPath();
    ctx.moveTo(32, 20);
    ctx.lineTo(32, 26);
    ctx.moveTo(32, 38);
    ctx.lineTo(32, 44);
    ctx.moveTo(20, 32);
    ctx.lineTo(26, 32);
    ctx.moveTo(38, 32);
    ctx.lineTo(44, 32);
    ctx.stroke();
    
    const crosshairTexture = new THREE.CanvasTexture(crosshairCanvas);
    const crosshairMaterial = new THREE.SpriteMaterial({
      map: crosshairTexture,
      transparent: true,
      depthTest: false,
    });
    const crosshair = new THREE.Sprite(crosshairMaterial);
    crosshair.scale.set(0.05, 0.05, 1);
    crosshair.position.set(0, 0, -1);
    camera.add(crosshair);
    crosshairRef.current = crosshair;
  }, []);

  const createTestChamber = useCallback((level: number) => {
    if (!sceneRef.current || !materialsRef.current) return;
    const scene = sceneRef.current;
    const mats = materialsRef.current;
    
    // Clear existing chamber
    if (chamberRef.current) {
      chamberRef.current.walls.forEach(w => scene.remove(w));
      chamberRef.current.portalableWalls.forEach(w => scene.remove(w));
      chamberRef.current.buttons.forEach(b => scene.remove(b));
      chamberRef.current.doors.forEach(d => scene.remove(d.mesh));
      chamberRef.current.cubes.forEach(c => scene.remove(c.mesh));
      if (chamberRef.current.floor) scene.remove(chamberRef.current.floor);
      if (chamberRef.current.ceiling) scene.remove(chamberRef.current.ceiling);
      if (chamberRef.current.exitPortal) scene.remove(chamberRef.current.exitPortal);
    }
    
    // Clear portals
    if (portalsRef.current.blue?.mesh) {
      scene.remove(portalsRef.current.blue.mesh);
    }
    if (portalsRef.current.orange?.mesh) {
      scene.remove(portalsRef.current.orange.mesh);
    }
    portalsRef.current = { blue: null, orange: null };
    
    physicsObjectsRef.current = [];
    
    // Chamber dimensions based on level
    const chamberConfigs = [
      // Level 1: Simple introduction
      { width: 20, height: 8, depth: 20, platforms: 0, cubes: 1, buttons: 1, doors: 1 },
      // Level 2: Two-platform puzzle
      { width: 25, height: 10, depth: 25, platforms: 2, cubes: 1, buttons: 2, doors: 1 },
      // Level 3: Multi-level with momentum
      { width: 30, height: 15, depth: 30, platforms: 4, cubes: 2, buttons: 2, doors: 2 },
      // Level 4: Complex puzzle
      { width: 35, height: 18, depth: 35, platforms: 6, cubes: 3, buttons: 3, doors: 2 },
      // Level 5: Final chamber
      { width: 40, height: 20, depth: 40, platforms: 8, cubes: 4, buttons: 4, doors: 3 },
    ];
    
    const config = chamberConfigs[Math.min(level - 1, chamberConfigs.length - 1)];
    const { width, height, depth, platforms, cubes, buttons, doors } = config;
    
    const chamber: TestChamber = {
      walls: [],
      floor: null as any,
      ceiling: null as any,
      portalableWalls: [],
      buttons: [],
      doors: [],
      cubes: [],
      exitPortal: null,
      spawnPoint: new THREE.Vector3(-width / 2 + 3, 2, -depth / 2 + 3),
      exitPoint: new THREE.Vector3(width / 2 - 3, 2, depth / 2 - 3),
    };
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeo, mats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.type = 'floor';
    scene.add(floor);
    chamber.floor = floor;
    
    // Ceiling (with lights)
    const ceilingGeo = new THREE.PlaneGeometry(width, depth);
    const ceiling = new THREE.Mesh(ceilingGeo, mats.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.userData.type = 'ceiling';
    scene.add(ceiling);
    chamber.ceiling = ceiling;
    
    // Add ceiling lights
    for (let x = -width / 2 + 5; x < width / 2; x += 10) {
      for (let z = -depth / 2 + 5; z < depth / 2; z += 10) {
        const lightGeo = new THREE.BoxGeometry(4, 0.3, 1.5);
        const lightMesh = new THREE.Mesh(lightGeo, mats.ceiling);
        lightMesh.position.set(x, height - 0.2, z);
        scene.add(lightMesh);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.8, 15);
        pointLight.position.set(x, height - 1, z);
        scene.add(pointLight);
      }
    }
    
    // Walls (some portalable, some not)
    const wallPositions = [
      { pos: [0, height / 2, -depth / 2], rot: [0, 0, 0], size: [width, height], portalable: true },
      { pos: [0, height / 2, depth / 2], rot: [0, Math.PI, 0], size: [width, height], portalable: true },
      { pos: [-width / 2, height / 2, 0], rot: [0, Math.PI / 2, 0], size: [depth, height], portalable: true },
      { pos: [width / 2, height / 2, 0], rot: [0, -Math.PI / 2, 0], size: [depth, height], portalable: true },
    ];
    
    wallPositions.forEach(({ pos, rot, size, portalable }) => {
      const wallGeo = new THREE.PlaneGeometry(size[0], size[1]);
      const wallMat = portalable ? mats.portalable : mats.wall;
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(pos[0], pos[1], pos[2]);
      wall.rotation.set(rot[0], rot[1], rot[2]);
      wall.receiveShadow = true;
      wall.castShadow = true;
      wall.userData.type = portalable ? 'portalable' : 'wall';
      scene.add(wall);
      
      if (portalable) {
        chamber.portalableWalls.push(wall);
      } else {
        chamber.walls.push(wall);
      }
    });
    
    // Create platforms for upper levels
    for (let i = 0; i < platforms; i++) {
      const platWidth = 5 + Math.random() * 5;
      const platDepth = 5 + Math.random() * 5;
      const platHeight = 3 + (i * 2) + Math.random() * 2;
      const platX = (Math.random() - 0.5) * (width - platWidth - 4);
      const platZ = (Math.random() - 0.5) * (depth - platDepth - 4);
      
      const platGeo = new THREE.BoxGeometry(platWidth, 0.5, platDepth);
      const platform = new THREE.Mesh(platGeo, mats.metal);
      platform.position.set(platX, platHeight, platZ);
      platform.receiveShadow = true;
      platform.castShadow = true;
      platform.userData.type = 'platform';
      scene.add(platform);
      chamber.walls.push(platform);
      
      // Portalable surface on top of platform
      const surfaceGeo = new THREE.PlaneGeometry(platWidth, platDepth);
      const surface = new THREE.Mesh(surfaceGeo, mats.portalable);
      surface.rotation.x = -Math.PI / 2;
      surface.position.set(platX, platHeight + 0.26, platZ);
      surface.userData.type = 'portalable';
      scene.add(surface);
      chamber.portalableWalls.push(surface);
    }
    
    // Create buttons
    for (let i = 0; i < buttons; i++) {
      const buttonGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.2, 32);
      const buttonBase = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 32);
      
      const buttonX = (Math.random() - 0.5) * (width - 4);
      const buttonZ = (Math.random() - 0.5) * (depth - 4);
      
      const base = new THREE.Mesh(buttonBase, mats.metal);
      base.position.set(buttonX, 0.05, buttonZ);
      scene.add(base);
      
      const button = new THREE.Mesh(buttonGeo, mats.button);
      button.position.set(buttonX, 0.2, buttonZ);
      button.userData.type = 'button';
      button.userData.buttonIndex = i;
      button.userData.pressed = false;
      scene.add(button);
      chamber.buttons.push(button);
    }
    
    // Create doors
    for (let i = 0; i < doors; i++) {
      const doorGeo = new THREE.BoxGeometry(3, 4, 0.3);
      const doorX = (Math.random() - 0.5) * (width - 6);
      const doorZ = (i % 2 === 0 ? 1 : -1) * (depth / 2 - 0.15);
      
      const door = new THREE.Mesh(doorGeo, mats.door);
      door.position.set(doorX, 2, doorZ);
      door.userData.type = 'door';
      door.castShadow = true;
      scene.add(door);
      
      chamber.doors.push({
        mesh: door,
        open: false,
        buttonRequired: i % buttons,
      });
    }
    
    // Create companion cubes
    for (let i = 0; i < cubes; i++) {
      const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
      const cubeX = (Math.random() - 0.5) * (width - 4);
      const cubeZ = (Math.random() - 0.5) * (depth - 4);
      
      const cube = new THREE.Mesh(cubeGeo, mats.companionCube);
      cube.position.set(cubeX, 0.5, cubeZ);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.userData.type = 'cube';
      scene.add(cube);
      
      const physObj = new PhysicsObject(cube, 5, 'cube');
      physicsObjectsRef.current.push(physObj);
      chamber.cubes.push(physObj);
    }
    
    // Exit portal (elevator)
    const exitGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
    const exit = new THREE.Mesh(exitGeo, mats.exit);
    exit.position.set(chamber.exitPoint.x, 0.1, chamber.exitPoint.z);
    exit.userData.type = 'exit';
    scene.add(exit);
    chamber.exitPortal = exit;
    
    // Exit pillar of light
    const lightPillarGeo = new THREE.CylinderGeometry(0.5, 1.5, 4, 32);
    const lightPillarMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.3,
    });
    const lightPillar = new THREE.Mesh(lightPillarGeo, lightPillarMat);
    lightPillar.position.set(chamber.exitPoint.x, 2, chamber.exitPoint.z);
    scene.add(lightPillar);
    
    chamberRef.current = chamber;
    
    // Set player spawn
    playerRef.current.position.copy(chamber.spawnPoint);
    if (cameraRef.current) {
      cameraRef.current.position.copy(chamber.spawnPoint);
    }
    
  }, []);

  const shootPortal = useCallback((color: 'blue' | 'orange') => {
    if (!cameraRef.current || !sceneRef.current || !chamberRef.current) return;
    
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const chamber = chamberRef.current;
    
    // Raycast from camera center
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Check all portalable surfaces
    const intersects = raycaster.intersectObjects([...chamber.portalableWalls, ...chamber.walls]);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      
      // Only place on portalable surfaces
      if (hit.object.userData.type !== 'portalable') {
        setMessage('Surface not portal-able!');
        return;
      }
      
      // Get the normal of the surface
      const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
      normal.transformDirection(hit.object.matrixWorld);
      
      // Create portal at hit point
      const portalPosition = hit.point.clone().add(normal.clone().multiplyScalar(0.05));
      
      // Remove existing portal of same color
      const existingPortal = portalsRef.current[color];
      if (existingPortal?.mesh) {
        scene.remove(existingPortal.mesh);
      }
      
      // Create portal mesh
      const portalGeo = new THREE.TorusGeometry(1, 0.1, 16, 32);
      const portalMat = materialsRef.current?.[color === 'blue' ? 'emissiveBlue' : 'emissiveOrange'];
      const portalMesh = new THREE.Mesh(portalGeo, portalMat);
      
      // Position and orient portal
      portalMesh.position.copy(portalPosition);
      portalMesh.lookAt(portalPosition.clone().add(normal));
      
      // Add inner surface
      const innerGeo = new THREE.CircleGeometry(0.9, 32);
      const innerMat = new THREE.MeshBasicMaterial({
        color: color === 'blue' ? 0x001133 : 0x331100,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      portalMesh.add(inner);
      
      // Add glow effect
      const glowGeo = new THREE.TorusGeometry(1.2, 0.3, 16, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color === 'blue' ? 0x0088ff : 0xff8800,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      portalMesh.add(glow);
      
      scene.add(portalMesh);
      
      // Store portal data
      const newPortal = new Portal(portalPosition, normal, color);
      newPortal.mesh = portalMesh;
      portalsRef.current[color] = newPortal;
      
      // Link portals
      if (portalsRef.current.blue && portalsRef.current.orange) {
        portalsRef.current.blue.linkedPortal = portalsRef.current.orange;
        portalsRef.current.orange.linkedPortal = portalsRef.current.blue;
      }
      
      // Update portal gun color
      if (portalGunRef.current) {
        const ring = portalGunRef.current.getObjectByName('portalRing') as THREE.Mesh;
        if (ring) {
          (ring.material as THREE.MeshStandardMaterial).color.set(
            color === 'blue' ? 0x0088ff : 0xff8800
          );
          (ring.material as THREE.MeshStandardMaterial).emissive.set(
            color === 'blue' ? 0x0088ff : 0xff8800
          );
        }
      }
      
      setMessage(`${color.charAt(0).toUpperCase() + color.slice(1)} portal placed!`);
    }
  }, []);

  const checkPortalTeleport = useCallback(() => {
    const now = Date.now();
    if (now - lastTeleportRef.current < 500) return; // Cooldown
    
    const player = playerRef.current;
    const blue = portalsRef.current.blue;
    const orange = portalsRef.current.orange;
    
    if (!blue || !orange || !blue.linkedPortal || !orange.linkedPortal) return;
    
    // Check distance to each portal
    const distToBlue = player.position.distanceTo(blue.position);
    const distToOrange = player.position.distanceTo(orange.position);
    
    let entryPortal: Portal | null = null;
    let exitPortal: Portal | null = null;
    
    if (distToBlue < 1.5) {
      entryPortal = blue;
      exitPortal = orange;
    } else if (distToOrange < 1.5) {
      entryPortal = orange;
      exitPortal = blue;
    }
    
    if (entryPortal && exitPortal) {
      // Calculate relative velocity in portal's local space
      const entryNormal = entryPortal.normal.clone();
      const exitNormal = exitPortal.normal.clone();
      
      // Preserve momentum - "Speedy thing goes in, speedy thing comes out"
      const speed = player.velocity.length();
      
      // Position player at exit portal
      player.position.copy(exitPortal.position.clone().add(
        exitNormal.clone().multiplyScalar(1.5)
      ));
      
      // Redirect velocity through exit portal
      player.velocity.copy(exitNormal.clone().multiplyScalar(Math.max(speed, 5)));
      
      // Update camera position
      if (cameraRef.current) {
        cameraRef.current.position.copy(player.position);
      }
      
      lastTeleportRef.current = now;
      setScore(prev => prev + 50);
      setMessage('Teleported! +50');
    }
  }, []);

  const updatePhysics = useCallback((deltaTime: number) => {
    const player = playerRef.current;
    const chamber = chamberRef.current;
    if (!chamber) return;
    
    // Apply gravity
    if (!player.onGround) {
      player.velocity.y -= 25 * deltaTime;
    }
    
    // Apply movement based on input
    const moveSpeed = player.speed * (player.crouching ? 0.5 : 1);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, player.yaw, 0))
    );
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, player.yaw, 0))
    );
    
    const moveDir = new THREE.Vector3();
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveDir.add(forward);
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveDir.sub(forward);
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveDir.add(right);
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveDir.sub(right);
    
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(moveSpeed);
      player.velocity.x = moveDir.x;
      player.velocity.z = moveDir.z;
    } else {
      // Apply friction
      player.velocity.x *= 0.9;
      player.velocity.z *= 0.9;
    }
    
    // Jump
    if ((keysRef.current['Space']) && player.onGround && player.canJump) {
      player.velocity.y = player.jumpForce;
      player.onGround = false;
      player.canJump = false;
    }
    if (!keysRef.current['Space']) {
      player.canJump = true;
    }
    
    // Update position
    player.position.add(player.velocity.clone().multiplyScalar(deltaTime));
    
    // Collision with floor
    if (player.position.y < player.height) {
      player.position.y = player.height;
      player.velocity.y = 0;
      player.onGround = true;
    }
    
    // Collision with chamber walls
    const chamberWidth = chamber.walls.length > 0 ? 15 : 10;
    const chamberDepth = chamber.walls.length > 0 ? 15 : 10;
    
    player.position.x = Math.max(-chamberWidth + 1, Math.min(chamberWidth - 1, player.position.x));
    player.position.z = Math.max(-chamberDepth + 1, Math.min(chamberDepth - 1, player.position.z));
    
    // Check portal teleportation
    checkPortalTeleport();
    
    // Update camera
    if (cameraRef.current) {
      cameraRef.current.position.copy(player.position);
      cameraRef.current.rotation.order = 'YXZ';
      cameraRef.current.rotation.y = player.yaw;
      cameraRef.current.rotation.x = player.pitch;
    }
    
    // Update physics objects
    physicsObjectsRef.current.forEach(obj => {
      if (!obj.isHeld) {
        // Apply gravity
        obj.velocity.y -= 15 * deltaTime;
        obj.mesh.position.add(obj.velocity.clone().multiplyScalar(deltaTime));
        
        // Floor collision
        if (obj.mesh.position.y < 0.5) {
          obj.mesh.position.y = 0.5;
          obj.velocity.y = 0;
          obj.velocity.x *= 0.9;
          obj.velocity.z *= 0.9;
        }
      }
    });
    
    // Check button presses
    chamber.buttons.forEach((button, index) => {
      let pressed = false;
      
      // Check if player is on button
      const playerDist = new THREE.Vector2(
        player.position.x - button.position.x,
        player.position.z - button.position.z
      ).length();
      if (playerDist < 1 && player.position.y < 2.5) {
        pressed = true;
      }
      
      // Check if cube is on button
      physicsObjectsRef.current.forEach(obj => {
        const cubeDist = new THREE.Vector2(
          obj.mesh.position.x - button.position.x,
          obj.mesh.position.z - button.position.z
        ).length();
        if (cubeDist < 1 && obj.mesh.position.y < 2) {
          pressed = true;
        }
      });
      
      if (pressed !== button.userData.pressed) {
        button.userData.pressed = pressed;
        button.position.y = pressed ? 0.1 : 0.2;
        (button.material as THREE.MeshStandardMaterial).color.set(pressed ? 0x00ff00 : 0xff0000);
        
        // Open/close doors
        chamber.doors.forEach(door => {
          if (door.buttonRequired === index) {
            door.open = pressed;
            door.mesh.position.y = pressed ? 6 : 2;
          }
        });
        
        if (pressed) {
          setScore(prev => prev + 100);
          setMessage('Button pressed! +100');
        }
      }
    });
    
    // Check exit
    if (chamber.exitPortal) {
      const exitDist = new THREE.Vector2(
        player.position.x - chamber.exitPortal.position.x,
        player.position.z - chamber.exitPortal.position.z
      ).length();
      
      if (exitDist < 1.5 && player.position.y < 2) {
        // Check if all buttons are pressed
        const allButtonsPressed = chamber.buttons.every(b => b.userData.pressed);
        if (allButtonsPressed) {
          setGameState('levelComplete');
        } else {
          setMessage('Press all buttons to exit!');
        }
      }
    }
  }, [checkPortalTeleport]);

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;
    
    const delta = clockRef.current.getDelta();
    const elapsed = clockRef.current.getElapsedTime();
    
    // Update FPS counter
    setFps(Math.round(1 / delta));
    
    // Update physics
    updatePhysics(delta);
    
    // Animate portals
    if (portalsRef.current.blue?.mesh) {
      portalsRef.current.blue.mesh.rotation.z = elapsed * 0.5;
    }
    if (portalsRef.current.orange?.mesh) {
      portalsRef.current.orange.mesh.rotation.z = -elapsed * 0.5;
    }
    
    // Animate exit portal
    if (chamberRef.current?.exitPortal) {
      chamberRef.current.exitPortal.rotation.y = elapsed;
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, updatePhysics]);

  // Handle mouse movement for look
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPointerLocked || gameState !== 'playing') return;
    
    const sensitivity = 0.002;
    playerRef.current.yaw -= e.movementX * sensitivity;
    playerRef.current.pitch -= e.movementY * sensitivity;
    playerRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, playerRef.current.pitch));
  }, [isPointerLocked, gameState]);

  // Handle mouse click for portals
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (gameState !== 'playing') return;
    
    if (e.button === 0) {
      shootPortal(portalMode);
    } else if (e.button === 2) {
      setPortalMode(prev => prev === 'blue' ? 'orange' : 'blue');
    }
  }, [gameState, portalMode, shootPortal]);

  // Handle keyboard
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.code] = true;
    
    if (e.code === 'KeyQ') {
      setPortalMode('blue');
    } else if (e.code === 'KeyE') {
      setPortalMode('orange');
    } else if (e.code === 'KeyF' && gameState === 'playing') {
      // Pick up/drop cube
      const player = playerRef.current;
      if (player.holdingObject) {
        player.holdingObject.isHeld = false;
        player.holdingObject.velocity.copy(
          new THREE.Vector3(0, 0, -5).applyQuaternion(
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, player.yaw, 0))
          )
        );
        player.holdingObject = null;
        setMessage('Dropped cube');
      } else {
        // Find nearest cube
        let nearestCube: PhysicsObject | null = null;
        let nearestDist = 3;
        
        physicsObjectsRef.current.forEach(obj => {
          if (obj.type === 'cube') {
            const dist = obj.mesh.position.distanceTo(player.position);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestCube = obj;
            }
          }
        });
        
        if (nearestCube) {
          nearestCube.isHeld = true;
          player.holdingObject = nearestCube;
          setMessage('Picked up Companion Cube');
        }
      }
    } else if (e.code === 'Escape') {
      if (isPointerLocked && document.exitPointerLock) {
        document.exitPointerLock();
      }
    }
  }, [gameState, isPointerLocked]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.code] = false;
  }, []);

  // Initialize game
  useEffect(() => {
    initThreeJS();
    
    // Event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('contextmenu', e => e.preventDefault());
    
    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === containerRef.current);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [initThreeJS, handleMouseMove, handleMouseDown, handleKeyDown, handleKeyUp]);

  // Start game loop when playing
  useEffect(() => {
    if (gameState === 'playing') {
      clockRef.current.start();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Update held object position
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const updateHeldObject = () => {
      const player = playerRef.current;
      if (player.holdingObject) {
        const forward = new THREE.Vector3(0, 0, -2.5).applyQuaternion(
          new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch, player.yaw, 0))
        );
        player.holdingObject.mesh.position.copy(player.position.clone().add(forward));
      }
      if (gameState === 'playing') {
        requestAnimationFrame(updateHeldObject);
      }
    };
    updateHeldObject();
  }, [gameState]);

  const startGame = useCallback(() => {
    createTestChamber(currentLevel);
    setScore(0);
    setGameState('playing');
    
    // Request pointer lock
    if (containerRef.current) {
      containerRef.current.requestPointerLock();
    }
  }, [currentLevel, createTestChamber]);

  const nextLevel = useCallback(() => {
    setCurrentLevel(prev => prev + 1);
    createTestChamber(currentLevel + 1);
    setGameState('playing');
    
    if (containerRef.current) {
      containerRef.current.requestPointerLock();
    }
  }, [currentLevel, createTestChamber]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 cursor-crosshair"
        onClick={() => {
          if (gameState === 'playing' && !isPointerLocked && containerRef.current) {
            containerRef.current.requestPointerLock();
          }
        }}
      />
      
      {/* Loading Screen */}
      {gameState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="text-6xl mb-4">🌀</div>
            <div className="text-white text-2xl font-bold mb-4">WORMHOLE</div>
            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-orange-500 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="text-gray-400 mt-2">{loadingProgress}%</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-black text-center mb-6 bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
              🌀 WORMHOLE
            </h1>
            <p className="text-gray-300 text-center mb-6">
              A Portal-inspired puzzle game. Use your portal gun to solve test chambers!
            </p>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-black/30 p-4 rounded-xl">
                <h3 className="text-blue-400 font-bold mb-3">🎮 Controls</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li><span className="text-white font-mono">WASD</span> - Move</li>
                  <li><span className="text-white font-mono">Mouse</span> - Look</li>
                  <li><span className="text-white font-mono">Space</span> - Jump</li>
                  <li><span className="text-white font-mono">Left Click</span> - Shoot Portal</li>
                  <li><span className="text-white font-mono">Right Click</span> - Switch Portal Color</li>
                  <li><span className="text-white font-mono">Q/E</span> - Blue/Orange Portal</li>
                  <li><span className="text-white font-mono">F</span> - Pick up/Drop Cube</li>
                </ul>
              </div>
              
              <div className="bg-black/30 p-4 rounded-xl">
                <h3 className="text-orange-400 font-bold mb-3">🎯 Objectives</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>🔵 Blue Portal → 🟠 Orange Portal</li>
                  <li>📦 Use Companion Cubes on buttons</li>
                  <li>🚪 Open doors to progress</li>
                  <li>🌟 Reach the exit elevator</li>
                  <li>⚡ Momentum is preserved through portals!</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600/20 to-orange-600/20 p-4 rounded-xl mb-6 border border-white/10">
              <p className="text-center text-white font-medium">
                "Speedy thing goes in, speedy thing comes out!"
              </p>
              <p className="text-center text-gray-400 text-sm mt-1">- Cave Johnson (probably)</p>
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-500 hover:to-orange-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              🚀 Begin Testing
            </button>
            
            {isMobile && (
              <p className="text-center text-yellow-400 text-sm mt-4">
                ⚠️ Best experienced on desktop with mouse & keyboard
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <div className="text-white font-bold">Test Chamber {currentLevel}</div>
              <div className="text-yellow-400 text-sm">Score: {score}</div>
            </div>
            
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <div className="text-gray-400 text-sm">{fps} FPS</div>
            </div>
          </div>
          
          {/* Portal indicator */}
          <div className="absolute bottom-8 right-8 pointer-events-none">
            <div className={`w-16 h-16 rounded-full border-4 ${
              portalMode === 'blue' ? 'border-blue-500 bg-blue-500/30' : 'border-orange-500 bg-orange-500/30'
            } flex items-center justify-center`}>
              <span className="text-white font-bold">{portalMode === 'blue' ? 'Q' : 'E'}</span>
            </div>
            <div className="flex gap-2 mt-2 justify-center">
              <div className={`w-4 h-4 rounded-full ${portalsRef.current.blue ? 'bg-blue-500' : 'bg-blue-500/30'}`} />
              <div className={`w-4 h-4 rounded-full ${portalsRef.current.orange ? 'bg-orange-500' : 'bg-orange-500/30'}`} />
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <div className="bg-black/80 px-6 py-3 rounded-lg text-white font-bold text-xl">
                {message}
              </div>
            </div>
          )}
          
          {/* Pointer lock message */}
          {!isPointerLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 cursor-pointer"
                 onClick={() => containerRef.current?.requestPointerLock()}>
              <div className="text-white text-xl font-bold">
                Click to resume
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Level Complete */}
      {gameState === 'levelComplete' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center p-8 bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-2xl border border-green-500/50">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-white mb-2">Test Chamber Complete!</h2>
            <p className="text-green-400 text-xl mb-4">Score: {score}</p>
            
            {currentLevel < 5 ? (
              <button
                onClick={nextLevel}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-orange-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
              >
                Next Chamber →
              </button>
            ) : (
              <div>
                <p className="text-yellow-400 text-lg mb-4">All test chambers complete!</p>
                <button
                  onClick={() => {
                    setCurrentLevel(1);
                    setGameState('instructions');
                  }}
                  className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile Controls */}
      {isMobile && gameState === 'playing' && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-auto">
          {/* D-Pad */}
          <div className="relative w-32 h-32">
            <button 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/20 rounded-lg active:bg-white/40"
              onTouchStart={() => keysRef.current['KeyW'] = true}
              onTouchEnd={() => keysRef.current['KeyW'] = false}
            >↑</button>
            <button 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white/20 rounded-lg active:bg-white/40"
              onTouchStart={() => keysRef.current['KeyS'] = true}
              onTouchEnd={() => keysRef.current['KeyS'] = false}
            >↓</button>
            <button 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-lg active:bg-white/40"
              onTouchStart={() => keysRef.current['KeyA'] = true}
              onTouchEnd={() => keysRef.current['KeyA'] = false}
            >←</button>
            <button 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-lg active:bg-white/40"
              onTouchStart={() => keysRef.current['KeyD'] = true}
              onTouchEnd={() => keysRef.current['KeyD'] = false}
            >→</button>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button 
              className="w-14 h-14 bg-blue-500/50 rounded-full text-white font-bold active:bg-blue-500"
              onClick={() => shootPortal('blue')}
            >🔵</button>
            <button 
              className="w-14 h-14 bg-orange-500/50 rounded-full text-white font-bold active:bg-orange-500"
              onClick={() => shootPortal('orange')}
            >🟠</button>
            <button 
              className="w-14 h-14 bg-white/20 rounded-full text-white font-bold active:bg-white/40"
              onTouchStart={() => keysRef.current['Space'] = true}
              onTouchEnd={() => keysRef.current['Space'] = false}
            >⬆️</button>
          </div>
        </div>
      )}
    </div>
  );
}
