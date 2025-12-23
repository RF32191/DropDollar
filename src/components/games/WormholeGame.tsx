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

// Turret class for Portal-style enemies
class Turret {
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotation: number = 0;
  state: 'idle' | 'searching' | 'targeting' | 'firing' | 'disabled' = 'idle';
  health: number = 100;
  lastFireTime: number = 0;
  fireRate: number = 500; // ms between shots
  detectionRange: number = 15;
  laserBeam: THREE.Line | null = null;
  searchAngle: number = 0;
  
  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.mesh = new THREE.Group();
  }
}

// Energy Pellet class
class EnergyPellet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  bounces: number = 0;
  maxBounces: number = 10;
  isActive: boolean = true;
  light: THREE.PointLight;
  
  constructor(mesh: THREE.Mesh, velocity: THREE.Vector3) {
    this.mesh = mesh;
    this.velocity = velocity.clone();
    this.light = new THREE.PointLight(0xffaa00, 2, 5);
  }
}

// Aerial Faith Plate (launch pad)
interface FaithPlate {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  launchVelocity: THREE.Vector3;
  isActive: boolean;
}

// Fizzler (portal/object destroyer)
interface Fizzler {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  width: number;
  height: number;
  particles: THREE.Points;
}

// Light Bridge
interface LightBridge {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  isActive: boolean;
  emitter: THREE.Mesh;
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
  turrets: Turret[];
  pellets: EnergyPellet[];
  faithPlates: FaithPlate[];
  fizzlers: Fizzler[];
  lightBridges: LightBridge[];
  pelletCatchers: { mesh: THREE.Mesh; activated: boolean }[];
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
  const [health, setHealth] = useState(100);
  const [glados, setGlados] = useState('');
  
  // GLaDOS-style quotes
  const gladosQuotes = useRef([
    "The Enrichment Center reminds you that the Weighted Companion Cube will never threaten to stab you.",
    "Speedy thing goes in, speedy thing comes out.",
    "The cake is a lie. Just kidding. There's definitely cake.",
    "Please note that we have added a concern for your safety.",
    "This next test involves turrets. You remember them, right?",
    "Momentum, a function of mass and velocity, is conserved between portals.",
    "The Enrichment Center promises to always provide a safe testing environment.",
    "Unbelievable. You, [Subject Name Here], must be the pride of [Subject Hometown Here].",
    "Did you know you can donate one or all of your vital organs to the Aperture Science Self-Esteem Fund?",
    "Remember, the Aperture Science Bring Your Daughter to Work Day is the perfect time to have her tested.",
  ]);
  
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
    turretBody: THREE.MeshStandardMaterial;
    turretLaser: THREE.MeshBasicMaterial;
    energyPellet: THREE.MeshStandardMaterial;
    faithPlate: THREE.MeshStandardMaterial;
    fizzler: THREE.MeshBasicMaterial;
    lightBridge: THREE.MeshBasicMaterial;
    pelletCatcher: THREE.MeshStandardMaterial;
  } | null>(null);
  
  const turretsRef = useRef<Turret[]>([]);
  const pelletsRef = useRef<EnergyPellet[]>([]);
  const faithPlatesRef = useRef<FaithPlate[]>([]);
  const fizzlersRef = useRef<Fizzler[]>([]);
  const lightBridgesRef = useRef<LightBridge[]>([]);
  const pelletCatchersRef = useRef<{ mesh: THREE.Mesh; activated: boolean }[]>([]);

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
      turretBody: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.7,
      }),
      turretLaser: new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8,
      }),
      energyPellet: new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 3,
        roughness: 0.1,
        metalness: 0.5,
      }),
      faithPlate: new THREE.MeshStandardMaterial({
        color: 0x3366ff,
        emissive: 0x3366ff,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      }),
      fizzler: new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
      lightBridge: new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
      pelletCatcher: new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.5,
        metalness: 0.8,
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

  // Create a Portal-style turret
  const createTurret = useCallback((position: THREE.Vector3): Turret => {
    const turret = new Turret(position);
    const mats = materialsRef.current;
    if (!mats) return turret;
    
    // Turret body (egg-shaped)
    const bodyGeo = new THREE.SphereGeometry(0.4, 16, 16);
    bodyGeo.scale(1, 1.5, 1);
    const body = new THREE.Mesh(bodyGeo, mats.turretBody);
    body.position.y = 0.6;
    body.castShadow = true;
    turret.mesh.add(body);
    
    // Eye (red when active)
    const eyeGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
    });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.8, 0.35);
    eye.name = 'turretEye';
    turret.mesh.add(eye);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8);
    const legPositions = [
      { x: -0.3, z: 0.2, rot: 0.3 },
      { x: 0.3, z: 0.2, rot: -0.3 },
      { x: 0, z: -0.3, rot: 0 },
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, mats.metal);
      leg.position.set(pos.x, 0.3, pos.z);
      leg.rotation.z = pos.rot;
      turret.mesh.add(leg);
    });
    
    // Gun barrel
    const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const barrel = new THREE.Mesh(barrelGeo, mats.metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.7, 0.5);
    barrel.name = 'turretBarrel';
    turret.mesh.add(barrel);
    
    turret.mesh.position.copy(position);
    turret.mesh.userData.type = 'turret';
    
    return turret;
  }, []);
  
  // Spawn energy pellet
  const spawnEnergyPellet = useCallback((position: THREE.Vector3, velocity: THREE.Vector3) => {
    if (!sceneRef.current || !materialsRef.current) return;
    
    const pelletGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const pellet = new THREE.Mesh(pelletGeo, materialsRef.current.energyPellet);
    pellet.position.copy(position);
    pellet.castShadow = true;
    pellet.userData.type = 'energyPellet';
    sceneRef.current.add(pellet);
    
    const energyPellet = new EnergyPellet(pellet, velocity);
    energyPellet.light.position.copy(position);
    sceneRef.current.add(energyPellet.light);
    
    pelletsRef.current.push(energyPellet);
    chamberRef.current?.pellets.push(energyPellet);
  }, []);
  
  // Show GLaDOS message
  const showGladosMessage = useCallback(() => {
    const quotes = gladosQuotes.current;
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setGlados(randomQuote);
    setTimeout(() => setGlados(''), 5000);
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
      turrets: [],
      pellets: [],
      faithPlates: [],
      fizzlers: [],
      lightBridges: [],
      pelletCatchers: [],
      exitPortal: null,
      spawnPoint: new THREE.Vector3(-width / 2 + 3, 2, -depth / 2 + 3),
      exitPoint: new THREE.Vector3(width / 2 - 3, 2, depth / 2 - 3),
    };
    
    // Clear previous refs
    turretsRef.current = [];
    pelletsRef.current = [];
    faithPlatesRef.current = [];
    fizzlersRef.current = [];
    lightBridgesRef.current = [];
    pelletCatchersRef.current = [];
    
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
    
    // Create turrets (from level 2+)
    if (level >= 2) {
      const numTurrets = Math.min(level - 1, 4);
      for (let i = 0; i < numTurrets; i++) {
        const turretX = (Math.random() - 0.5) * (width - 6);
        const turretZ = (Math.random() - 0.5) * (depth - 6);
        
        const turret = createTurret(new THREE.Vector3(turretX, 0, turretZ));
        scene.add(turret.mesh);
        turretsRef.current.push(turret);
        chamber.turrets.push(turret);
      }
    }
    
    // Create aerial faith plates (from level 2+)
    if (level >= 2) {
      const numPlates = Math.min(level, 3);
      for (let i = 0; i < numPlates; i++) {
        const plateX = (Math.random() - 0.5) * (width - 4);
        const plateZ = (Math.random() - 0.5) * (depth - 4);
        
        const plateGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 32);
        const plate = new THREE.Mesh(plateGeo, mats.faithPlate);
        plate.position.set(plateX, 0.15, plateZ);
        plate.userData.type = 'faithPlate';
        scene.add(plate);
        
        // Add arrow indicator
        const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 8);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.y = 0.5;
        plate.add(arrow);
        
        const faithPlate: FaithPlate = {
          mesh: plate,
          position: new THREE.Vector3(plateX, 0.15, plateZ),
          launchVelocity: new THREE.Vector3(0, 20, 0),
          isActive: true,
        };
        faithPlatesRef.current.push(faithPlate);
        chamber.faithPlates.push(faithPlate);
      }
    }
    
    // Create fizzlers (portal destroyers) from level 3+
    if (level >= 3) {
      const fizzlerX = 0;
      const fizzlerZ = (Math.random() - 0.5) * (depth - 10);
      
      const fizzlerGeo = new THREE.PlaneGeometry(4, height - 2);
      const fizzler = new THREE.Mesh(fizzlerGeo, mats.fizzler);
      fizzler.position.set(fizzlerX, height / 2, fizzlerZ);
      fizzler.userData.type = 'fizzler';
      scene.add(fizzler);
      
      // Fizzler particle effect
      const particleCount = 200;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let j = 0; j < particleCount; j++) {
        positions[j * 3] = (Math.random() - 0.5) * 4;
        positions[j * 3 + 1] = Math.random() * (height - 2);
        positions[j * 3 + 2] = (Math.random() - 0.5) * 0.2;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xff00ff,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      particles.position.copy(fizzler.position);
      scene.add(particles);
      
      const fizzlerObj: Fizzler = {
        mesh: fizzler,
        position: fizzler.position.clone(),
        width: 4,
        height: height - 2,
        particles,
      };
      fizzlersRef.current.push(fizzlerObj);
      chamber.fizzlers.push(fizzlerObj);
    }
    
    // Create light bridge emitter (level 4+)
    if (level >= 4) {
      const bridgeStart = new THREE.Vector3(-width / 2 + 1, 3, 0);
      const bridgeEnd = new THREE.Vector3(width / 2 - 1, 3, 0);
      
      // Emitter
      const emitterGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const emitter = new THREE.Mesh(emitterGeo, mats.emissiveBlue);
      emitter.position.copy(bridgeStart);
      scene.add(emitter);
      
      // Bridge beam
      const bridgeLength = bridgeStart.distanceTo(bridgeEnd);
      const bridgeGeo = new THREE.PlaneGeometry(bridgeLength, 2);
      const bridge = new THREE.Mesh(bridgeGeo, mats.lightBridge);
      bridge.position.set(0, 3, 0);
      bridge.rotation.x = -Math.PI / 2;
      bridge.userData.type = 'lightBridge';
      scene.add(bridge);
      
      const lightBridge: LightBridge = {
        mesh: bridge,
        start: bridgeStart,
        end: bridgeEnd,
        isActive: true,
        emitter,
      };
      lightBridgesRef.current.push(lightBridge);
      chamber.lightBridges.push(lightBridge);
    }
    
    // Create energy pellet launcher and catcher (level 3+)
    if (level >= 3) {
      // Pellet launcher
      const launcherX = -width / 2 + 2;
      const launcherZ = 0;
      
      const launcherGeo = new THREE.BoxGeometry(1, 1, 1);
      const launcherMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff6600,
        emissiveIntensity: 0.5,
      });
      const launcher = new THREE.Mesh(launcherGeo, launcherMat);
      launcher.position.set(launcherX, 2, launcherZ);
      scene.add(launcher);
      
      // Pellet catcher (door opener)
      const catcherGeo = new THREE.BoxGeometry(1.5, 1.5, 0.3);
      const catcher = new THREE.Mesh(catcherGeo, mats.pelletCatcher);
      catcher.position.set(width / 2 - 1, 2, 0);
      catcher.userData.type = 'pelletCatcher';
      scene.add(catcher);
      
      // Target ring on catcher
      const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 16, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = 0.16;
      catcher.add(ring);
      
      pelletCatchersRef.current.push({ mesh: catcher, activated: false });
      chamber.pelletCatchers.push({ mesh: catcher, activated: false });
      
      // Create initial pellet
      setTimeout(() => {
        if (gameState === 'playing') {
          spawnEnergyPellet(new THREE.Vector3(launcherX + 1, 2, launcherZ), new THREE.Vector3(8, 0, 0));
        }
      }, 2000);
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
    
    // Update turret AI
    const now = Date.now();
    turretsRef.current.forEach(turret => {
      if (turret.state === 'disabled') return;
      
      const distToPlayer = turret.position.distanceTo(player.position);
      
      if (distToPlayer < turret.detectionRange) {
        // Look at player
        const dirToPlayer = player.position.clone().sub(turret.position).normalize();
        turret.rotation = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        turret.mesh.rotation.y = turret.rotation;
        
        turret.state = 'targeting';
        
        // Fire at player
        if (now - turret.lastFireTime > turret.fireRate) {
          turret.state = 'firing';
          turret.lastFireTime = now;
          
          // Create bullet/laser
          const barrel = turret.mesh.getObjectByName('turretBarrel');
          if (barrel && sceneRef.current) {
            const bulletStart = turret.position.clone();
            bulletStart.y = 0.7;
            
            // Raycast to check hit
            const raycaster = new THREE.Raycaster(bulletStart, dirToPlayer);
            
            // Check if hits player
            const playerDist = bulletStart.distanceTo(player.position);
            if (playerDist < 0.8) {
              setHealth(prev => Math.max(0, prev - 10));
              setMessage('Turret hit! -10 HP');
              if (health <= 10) {
                setGameState('gameover');
              }
            }
            
            // Visual laser effect
            const laserGeo = new THREE.BufferGeometry().setFromPoints([
              bulletStart,
              bulletStart.clone().add(dirToPlayer.multiplyScalar(20))
            ]);
            const laser = new THREE.Line(laserGeo, materialsRef.current?.turretLaser);
            sceneRef.current.add(laser);
            setTimeout(() => {
              if (sceneRef.current) sceneRef.current.remove(laser);
            }, 100);
          }
        }
      } else {
        turret.state = 'searching';
        turret.searchAngle += deltaTime * 2;
        turret.mesh.rotation.y = Math.sin(turret.searchAngle) * 0.5;
      }
    });
    
    // Update energy pellets
    pelletsRef.current.forEach((pellet, index) => {
      if (!pellet.isActive) return;
      
      // Move pellet
      pellet.mesh.position.add(pellet.velocity.clone().multiplyScalar(deltaTime));
      pellet.light.position.copy(pellet.mesh.position);
      
      // Bounce off walls
      const halfWidth = 15;
      const halfDepth = 15;
      
      if (Math.abs(pellet.mesh.position.x) > halfWidth) {
        pellet.velocity.x *= -1;
        pellet.mesh.position.x = Math.sign(pellet.mesh.position.x) * halfWidth;
        pellet.bounces++;
      }
      if (Math.abs(pellet.mesh.position.z) > halfDepth) {
        pellet.velocity.z *= -1;
        pellet.mesh.position.z = Math.sign(pellet.mesh.position.z) * halfDepth;
        pellet.bounces++;
      }
      
      // Check pellet catcher collision
      pelletCatchersRef.current.forEach(catcher => {
        if (!catcher.activated) {
          const dist = pellet.mesh.position.distanceTo(catcher.mesh.position);
          if (dist < 1) {
            catcher.activated = true;
            pellet.isActive = false;
            (catcher.mesh.material as THREE.MeshStandardMaterial).emissive.set(0x00ff00);
            (catcher.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1;
            setScore(prev => prev + 200);
            setMessage('Pellet caught! +200');
            
            if (sceneRef.current) {
              sceneRef.current.remove(pellet.mesh);
              sceneRef.current.remove(pellet.light);
            }
          }
        }
      });
      
      // Expire pellet after too many bounces
      if (pellet.bounces > pellet.maxBounces) {
        pellet.isActive = false;
        if (sceneRef.current) {
          sceneRef.current.remove(pellet.mesh);
          sceneRef.current.remove(pellet.light);
        }
      }
      
      // Check player collision (damage)
      const distToPlayer = pellet.mesh.position.distanceTo(player.position);
      if (distToPlayer < 1) {
        setHealth(prev => Math.max(0, prev - 20));
        setMessage('Energy pellet hit! -20 HP');
        pellet.isActive = false;
        if (sceneRef.current) {
          sceneRef.current.remove(pellet.mesh);
          sceneRef.current.remove(pellet.light);
        }
        if (health <= 20) {
          setGameState('gameover');
        }
      }
    });
    
    // Check faith plate launches
    faithPlatesRef.current.forEach(plate => {
      if (!plate.isActive) return;
      
      const distToPlayer = new THREE.Vector2(
        player.position.x - plate.position.x,
        player.position.z - plate.position.z
      ).length();
      
      if (distToPlayer < 1.2 && player.position.y < 2 && player.onGround) {
        player.velocity.copy(plate.launchVelocity);
        player.onGround = false;
        setMessage('Wheeee!');
        setScore(prev => prev + 25);
      }
    });
    
    // Check fizzler collisions
    fizzlersRef.current.forEach(fizzler => {
      const distToPlayer = Math.abs(player.position.x - fizzler.position.x);
      const withinZ = Math.abs(player.position.z - fizzler.position.z) < fizzler.width / 2;
      const withinY = player.position.y > 0 && player.position.y < fizzler.height;
      
      if (distToPlayer < 0.5 && withinZ && withinY) {
        // Destroy portals when passing through fizzler
        if (portalsRef.current.blue?.mesh && sceneRef.current) {
          sceneRef.current.remove(portalsRef.current.blue.mesh);
          portalsRef.current.blue = null;
        }
        if (portalsRef.current.orange?.mesh && sceneRef.current) {
          sceneRef.current.remove(portalsRef.current.orange.mesh);
          portalsRef.current.orange = null;
        }
        setMessage('Portals fizzled!');
        
        // Also destroy held object
        if (player.holdingObject) {
          if (sceneRef.current) sceneRef.current.remove(player.holdingObject.mesh);
          player.holdingObject = null;
        }
      }
    });
    
    // Check light bridge walking
    lightBridgesRef.current.forEach(bridge => {
      if (!bridge.isActive) return;
      
      const onBridge = 
        Math.abs(player.position.y - 3) < 0.5 &&
        Math.abs(player.position.z) < 1 &&
        player.position.x > bridge.start.x && player.position.x < bridge.end.x;
      
      if (onBridge) {
        player.position.y = 3.2;
        player.velocity.y = 0;
        player.onGround = true;
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
          showGladosMessage();
        } else {
          setMessage('Press all buttons to exit!');
        }
      }
    }
  }, [checkPortalTeleport, showGladosMessage, health, gameState]);

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
    
    // Animate turret eyes
    turretsRef.current.forEach(turret => {
      const eye = turret.mesh.getObjectByName('turretEye') as THREE.Mesh;
      if (eye) {
        const mat = eye.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.5 + Math.sin(elapsed * 5) * 0.5;
      }
    });
    
    // Animate energy pellets (glow pulse)
    pelletsRef.current.forEach(pellet => {
      if (pellet.isActive) {
        const scale = 1 + Math.sin(elapsed * 10) * 0.1;
        pellet.mesh.scale.set(scale, scale, scale);
        pellet.light.intensity = 2 + Math.sin(elapsed * 10) * 0.5;
      }
    });
    
    // Animate faith plates (pulse)
    faithPlatesRef.current.forEach(plate => {
      const glow = 0.5 + Math.sin(elapsed * 3) * 0.3;
      (plate.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
    });
    
    // Animate fizzler particles
    fizzlersRef.current.forEach(fizzler => {
      const positions = fizzler.particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.02;
        if (positions[i + 1] > fizzler.height) {
          positions[i + 1] = 0;
        }
      }
      fizzler.particles.geometry.attributes.position.needsUpdate = true;
    });
    
    // Animate light bridges (shimmer)
    lightBridgesRef.current.forEach(bridge => {
      (bridge.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(elapsed * 5) * 0.1;
    });
    
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

  // Handle mouse click for portals and turret attacks
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (gameState !== 'playing') return;
    
    if (e.button === 0) {
      // Check for turret hit first
      if (cameraRef.current && sceneRef.current) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
        
        const turretMeshes = turretsRef.current.map(t => t.mesh);
        const intersects = raycaster.intersectObjects(turretMeshes, true);
        
        if (intersects.length > 0) {
          // Find which turret was hit
          const hitObject = intersects[0].object;
          const turretMesh = hitObject.parent;
          
          turretsRef.current.forEach(turret => {
            if (turret.mesh === turretMesh && turret.state !== 'disabled') {
              turret.health -= 50;
              
              // Visual feedback
              const eye = turret.mesh.getObjectByName('turretEye') as THREE.Mesh;
              if (eye) {
                (eye.material as THREE.MeshStandardMaterial).color.set(0xffff00);
                setTimeout(() => {
                  if (turret.state !== 'disabled') {
                    (eye.material as THREE.MeshStandardMaterial).color.set(0xff0000);
                  }
                }, 200);
              }
              
              if (turret.health <= 0) {
                turret.state = 'disabled';
                // Turret falls over
                turret.mesh.rotation.x = Math.PI / 2;
                turret.mesh.position.y = 0.3;
                
                const eye = turret.mesh.getObjectByName('turretEye') as THREE.Mesh;
                if (eye) {
                  (eye.material as THREE.MeshStandardMaterial).color.set(0x333333);
                  (eye.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
                }
                
                setScore(prev => prev + 150);
                setMessage('Turret disabled! +150');
              } else {
                setMessage(`Turret hit! (${turret.health}% remaining)`);
              }
              return;
            }
          });
          return; // Don't shoot portal if we hit a turret
        }
      }
      
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
    setHealth(100);
    setGameState('playing');
    
    // Show GLaDOS intro
    showGladosMessage();
    
    // DON'T auto-lock pointer - let user click inside game to start
    // This prevents the button click from being consumed by pointer lock
  }, [currentLevel, createTestChamber, showGladosMessage]);

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
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm overflow-y-auto py-4">
          <div className="max-w-3xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-black text-center mb-4 bg-gradient-to-r from-blue-400 to-orange-400 bg-clip-text text-transparent">
              🌀 WORMHOLE
            </h1>
            <p className="text-gray-300 text-center mb-4 text-sm">
              A Portal-inspired puzzle game. Use your portal gun to solve test chambers!
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-black/30 p-3 rounded-xl">
                <h3 className="text-blue-400 font-bold mb-2 text-sm">🎮 Controls</h3>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li><span className="text-white font-mono">WASD</span> - Move</li>
                  <li><span className="text-white font-mono">Mouse</span> - Look</li>
                  <li><span className="text-white font-mono">Space</span> - Jump</li>
                  <li><span className="text-white font-mono">Left Click</span> - Shoot Portal / Attack Turret</li>
                  <li><span className="text-white font-mono">Right Click</span> - Switch Portal Color</li>
                  <li><span className="text-white font-mono">Q/E</span> - Blue/Orange Portal</li>
                  <li><span className="text-white font-mono">F</span> - Pick up/Drop Cube</li>
                </ul>
              </div>
              
              <div className="bg-black/30 p-3 rounded-xl">
                <h3 className="text-orange-400 font-bold mb-2 text-sm">🎯 Objectives</h3>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>🔵 Blue Portal → 🟠 Orange Portal</li>
                  <li>📦 Use Companion Cubes on buttons</li>
                  <li>🚪 Open doors to progress</li>
                  <li>🌟 Reach the exit elevator</li>
                  <li>⚡ Momentum preserved through portals!</li>
                  <li>💯 Complete all 5 test chambers</li>
                </ul>
              </div>
            </div>
            
            {/* Test Chamber Elements */}
            <div className="bg-black/30 p-3 rounded-xl mb-4">
              <h3 className="text-purple-400 font-bold mb-2 text-sm">🔬 Test Chamber Elements</h3>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                  <span className="text-red-400">🔫</span>
                  <span>Turrets (Lvl 2+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-orange-400">⚡</span>
                  <span>Energy Pellets (Lvl 3+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-400">🚀</span>
                  <span>Faith Plates (Lvl 2+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400">✨</span>
                  <span>Fizzlers (Lvl 3+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400">🌉</span>
                  <span>Light Bridges (Lvl 4+)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-pink-400">💕</span>
                  <span>Companion Cubes</span>
                </div>
              </div>
            </div>
            
            {/* Scoring */}
            <div className="bg-black/30 p-3 rounded-xl mb-4">
              <h3 className="text-yellow-400 font-bold mb-2 text-sm">🏆 Scoring</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <div>Portal teleport: <span className="text-green-400">+50</span></div>
                <div>Button press: <span className="text-green-400">+100</span></div>
                <div>Turret disabled: <span className="text-green-400">+150</span></div>
                <div>Pellet caught: <span className="text-green-400">+200</span></div>
                <div>Faith plate: <span className="text-green-400">+25</span></div>
                <div>Chamber complete: <span className="text-green-400">+500</span></div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600/20 to-orange-600/20 p-3 rounded-xl mb-4 border border-white/10">
              <p className="text-center text-white font-medium text-sm">
                &ldquo;Speedy thing goes in, speedy thing comes out!&rdquo;
              </p>
              <p className="text-center text-gray-400 text-xs mt-1">- Cave Johnson</p>
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-500 hover:to-orange-500 text-white text-lg font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              🚀 Begin Testing
            </button>
            
            {isMobile && (
              <p className="text-center text-yellow-400 text-xs mt-3">
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
            
            {/* Health Bar */}
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <div className="flex items-center gap-2">
                <span className="text-red-400">❤️</span>
                <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      health > 60 ? 'bg-green-500' : health > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${health}%` }}
                  />
                </div>
                <span className="text-white text-sm">{health}%</span>
              </div>
            </div>
            
            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <div className="text-gray-400 text-sm">{fps} FPS</div>
            </div>
          </div>
          
          {/* GLaDOS Message */}
          {glados && (
            <div className="absolute top-20 left-4 right-4 pointer-events-none">
              <div className="max-w-2xl mx-auto bg-black/80 border border-yellow-500/50 px-6 py-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <div className="text-yellow-400 text-xs font-bold mb-1">GLaDOS:</div>
                    <div className="text-white text-sm italic">&ldquo;{glados}&rdquo;</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
          
          {/* Level Features Indicator */}
          <div className="absolute bottom-8 left-8 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20 text-sm">
              <div className="text-gray-400 mb-1">Active Elements:</div>
              <div className="flex flex-wrap gap-2">
                {turretsRef.current.length > 0 && (
                  <span className="bg-red-500/30 text-red-400 px-2 py-0.5 rounded text-xs">
                    🔫 Turrets ({turretsRef.current.length})
                  </span>
                )}
                {pelletsRef.current.filter(p => p.isActive).length > 0 && (
                  <span className="bg-orange-500/30 text-orange-400 px-2 py-0.5 rounded text-xs">
                    ⚡ Pellets
                  </span>
                )}
                {faithPlatesRef.current.length > 0 && (
                  <span className="bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded text-xs">
                    🚀 Faith Plates
                  </span>
                )}
                {fizzlersRef.current.length > 0 && (
                  <span className="bg-purple-500/30 text-purple-400 px-2 py-0.5 rounded text-xs">
                    ✨ Fizzler
                  </span>
                )}
                {lightBridgesRef.current.length > 0 && (
                  <span className="bg-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded text-xs">
                    🌉 Light Bridge
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <div className="bg-black/80 px-6 py-3 rounded-lg text-white font-bold text-xl animate-pulse">
                {message}
              </div>
            </div>
          )}
          
          {/* Pointer lock message - Click to start/resume */}
          {!isPointerLocked && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/70 cursor-pointer"
              onClick={() => containerRef.current?.requestPointerLock()}
            >
              <div className="text-center p-8 bg-gradient-to-br from-blue-900/50 to-orange-900/50 rounded-2xl border border-white/30">
                <div className="text-6xl mb-4">🎮</div>
                <div className="text-white text-2xl font-bold mb-2">
                  Click Here to Start
                </div>
                <p className="text-gray-300 text-sm">
                  Click anywhere in this area to begin playing
                </p>
                <div className="mt-4 text-gray-400 text-xs">
                  ESC to pause | WASD to move | Mouse to look
                </div>
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
            <p className="text-green-400 text-xl mb-2">Score: {score}</p>
            <p className="text-gray-400 text-sm mb-4">Health Remaining: {health}%</p>
            
            {glados && (
              <div className="bg-black/50 p-3 rounded-lg mb-4 max-w-md mx-auto">
                <p className="text-yellow-400 text-sm italic">&ldquo;{glados}&rdquo;</p>
                <p className="text-gray-500 text-xs mt-1">- GLaDOS</p>
              </div>
            )}
            
            {currentLevel < 5 ? (
              <button
                onClick={nextLevel}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-orange-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
              >
                Next Chamber →
              </button>
            ) : (
              <div>
                <p className="text-yellow-400 text-lg mb-4">🎉 All test chambers complete!</p>
                <p className="text-gray-400 mb-4">The cake was not a lie after all!</p>
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
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95">
          <div className="text-center p-8 bg-gradient-to-br from-red-900/50 to-gray-900/50 rounded-2xl border border-red-500/50">
            <div className="text-6xl mb-4">💀</div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">Test Failed</h2>
            <p className="text-gray-400 mb-4">Chamber {currentLevel} - Score: {score}</p>
            
            <div className="bg-black/50 p-3 rounded-lg mb-6 max-w-md mx-auto">
              <p className="text-yellow-400 text-sm italic">
                &ldquo;Oh dear. It seems you&apos;ve failed. Again. Don&apos;t worry, there&apos;s always next time. Well, for most people.&rdquo;
              </p>
              <p className="text-gray-500 text-xs mt-1">- GLaDOS</p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setHealth(100);
                  createTestChamber(currentLevel);
                  setGameState('playing');
                  if (containerRef.current) {
                    containerRef.current.requestPointerLock();
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:scale-105 transition-transform"
              >
                🔄 Retry Chamber
              </button>
              <button
                onClick={() => {
                  setCurrentLevel(1);
                  setScore(0);
                  setGameState('instructions');
                }}
                className="px-6 py-3 bg-gray-700 text-white font-bold rounded-xl hover:scale-105 transition-transform"
              >
                🏠 Main Menu
              </button>
            </div>
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
              className="w-14 h-14 bg-blue-500/50 rounded-full text-white font-bold active:bg-blue-500 text-2xl"
              onClick={() => shootPortal('blue')}
            >🔵</button>
            <button 
              className="w-14 h-14 bg-orange-500/50 rounded-full text-white font-bold active:bg-orange-500 text-2xl"
              onClick={() => shootPortal('orange')}
            >🟠</button>
            <button 
              className="w-14 h-14 bg-green-500/50 rounded-full text-white font-bold active:bg-green-500 text-2xl"
              onTouchStart={() => keysRef.current['Space'] = true}
              onTouchEnd={() => keysRef.current['Space'] = false}
            >🦘</button>
            <button 
              className="w-14 h-14 bg-pink-500/50 rounded-full text-white font-bold active:bg-pink-500 text-2xl"
              onClick={() => keysRef.current['KeyF'] = true}
            >📦</button>
          </div>
        </div>
      )}
    </div>
  );
}
