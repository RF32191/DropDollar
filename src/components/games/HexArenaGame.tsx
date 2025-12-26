'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMultiplayerLobby, PlayerUpdate, LobbyPlayer } from '@/hooks/useMultiplayerLobby';

// ============================================================================
// HEXARENA - 3D Multiplayer Arena with Rolling Balls
// ============================================================================
// Online multiplayer with matchmaking (2-4 players)
// Rolling ball characters with usernames
// Multi-level platforms - jump and shoot to survive!
// ============================================================================

interface HexArenaGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface HexTile {
  mesh: THREE.Mesh;
  q: number;
  r: number;
  level: number;
  state: 'solid' | 'warning' | 'falling' | 'gone' | 'rebuilding';
  stepTime: number | null;
  fallSpeed: number;
}

interface LocalPlayer {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  level: number;
  isJumping: boolean;
  jumpVelocity: number;
  hearts: number;
  score: number;
  balls: number;
  isAlive: boolean;
  username: string;
  color: number;
}

interface RemotePlayer {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  hearts: number;
  score: number;
  isAlive: boolean;
  username: string;
  color: number;
  label: THREE.Sprite;
}

interface Ball {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ownerId: string;
  bounces: number;
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
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// Hex helpers
function createHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function hexToWorld(q: number, r: number, size: number): { x: number; z: number } {
  return {
    x: size * (3/2 * q),
    z: size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
  };
}

// Level colors
const LEVEL_COLORS = [
  { solid: 0x2a5a8a, warning: 0xffaa00, glow: 0x00aaff },
  { solid: 0x5a2a8a, warning: 0xff66ff, glow: 0xaa00ff },
  { solid: 0x2a8a5a, warning: 0x66ff66, glow: 0x00ff66 },
  { solid: 0x8a5a2a, warning: 0xffcc00, glow: 0xffaa00 }
];

const PLAYER_COLORS = [
  { main: 0x00ffff, glow: 0x00ccff, name: 'Cyan' },
  { main: 0xff00ff, glow: 0xff66ff, name: 'Magenta' },
  { main: 0x00ff00, glow: 0x66ff66, name: 'Green' },
  { main: 0xffff00, glow: 0xffcc00, name: 'Yellow' }
];

export default function HexArenaGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: HexArenaGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'matchmaking' | 'lobby' | 'playing' | 'spectating' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [timeAlive, setTimeAlive] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [balls, setBalls] = useState(3);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo');
  
  // Multiplayer hook
  const lobby = useMultiplayerLobby(
    'hex-arena',
    user?.id,
    user?.email?.split('@')[0] || 'Player'
  );
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const localPlayerRef = useRef<LocalPlayer | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
  const tilesRef = useRef<HexTile[]>([]);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const lastUpdateRef = useRef(0);
  
  // Constants
  const HEX_SIZE = 1.2;
  const ARENA_RADIUS = 5;
  const NUM_LEVELS = 4;
  const LEVEL_HEIGHT = 4;
  const TILE_COLLAPSE_DELAY = 1500;
  const JUMP_FORCE = 0.28;
  const GRAVITY = 0.01;
  const BALL_SPEED = 0.4;
  const PLAYER_SPEED = 0.12;
  const UPDATE_RATE = 50; // ms between network updates

  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween': return { background: 0x0a0015, ambient: 0x6b3fa0 };
      case 'christmas': return { background: 0x001122, ambient: 0x87ceeb };
      default: return { background: 0x050515, ambient: 0x6c5ce7 };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((points: number, x: number, y: number, special = false) => {
    const id = floatingScoreIdRef.current++;
    const color = special ? '#ffd700' : points > 0 ? '#00ff88' : '#ff4444';
    setFloatingScores(prev => [...prev, { id, text: points > 0 ? `+${points}` : `${points}`, x, y, color }]);
    setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== id)), 1500);
  }, []);

  // Create username label
  const createUsernameLabel = useCallback((username: string, color: number): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.substring(0, 12), 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }, []);

  // Create rolling ball player
  const createPlayerMesh = useCallback((color: number, username: string, isLocal: boolean): THREE.Group => {
    const group = new THREE.Group();
    const playerColor = PLAYER_COLORS.find(p => p.main === color) || PLAYER_COLORS[0];
    
    // Main ball
    const ballGeom = new THREE.SphereGeometry(0.45, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: playerColor.main,
      emissive: playerColor.glow,
      emissiveIntensity: isLocal ? 0.5 : 0.3,
      metalness: 0.6,
      roughness: 0.3
    });
    const ball = new THREE.Mesh(ballGeom, ballMat);
    ball.castShadow = true;
    group.add(ball);
    
    // Inner glow
    const glowGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: playerColor.glow,
      transparent: true,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    group.add(glow);
    
    // Ring around ball
    const ringGeom = new THREE.TorusGeometry(0.55, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: playerColor.main,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    // Username label (above ball)
    const label = createUsernameLabel(username, playerColor.main);
    label.position.y = 1.2;
    group.add(label);
    
    // Direction indicator
    const arrowGeom = new THREE.ConeGeometry(0.12, 0.3, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.z = 0.6;
    group.add(arrow);
    
    return group;
  }, [createUsernameLabel]);

  // Create hex tile
  const createHexTile = useCallback((q: number, r: number, level: number, scene: THREE.Scene): HexTile => {
    const levelColor = LEVEL_COLORS[level];
    const shape = createHexShape(HEX_SIZE * 0.92);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 });
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({
      color: levelColor.solid,
      metalness: 0.4,
      roughness: 0.5,
      emissive: levelColor.solid,
      emissiveIntensity: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const { x, z } = hexToWorld(q, r, HEX_SIZE);
    mesh.position.set(x, level * LEVEL_HEIGHT, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    return { mesh, q, r, level, state: 'solid', stepTime: null, fallSpeed: 0 };
  }, []);

  // Build full arena (all platforms)
  const buildArena = useCallback((scene: THREE.Scene) => {
    const tiles: HexTile[] = [];
    
    for (let level = 0; level < NUM_LEVELS; level++) {
      // Full hex grid for each level
      for (let q = -ARENA_RADIUS; q <= ARENA_RADIUS; q++) {
        for (let r = -ARENA_RADIUS; r <= ARENA_RADIUS; r++) {
          if (Math.abs(q + r) > ARENA_RADIUS) continue;
          tiles.push(createHexTile(q, r, level, scene));
        }
      }
    }
    
    return tiles;
  }, [createHexTile]);

  // Create ball projectile
  const createBallMesh = useCallback((color: number): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Trail
    const trailGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const trailMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3 });
    const trail = new THREE.Mesh(trailGeom, trailMat);
    mesh.add(trail);
    
    return mesh;
  }, []);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 20, 80);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(55, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 200);
    camera.position.set(0, 30, 25);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    scene.add(new THREE.AmbientLight(colors.ambient, 0.5));
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 30, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    
    // Level lights
    for (let i = 0; i < NUM_LEVELS; i++) {
      const light = new THREE.PointLight(LEVEL_COLORS[i].glow, 0.5, 30);
      light.position.set(Math.cos(i * Math.PI / 2) * 8, i * LEVEL_HEIGHT + 2, Math.sin(i * Math.PI / 2) * 8);
      scene.add(light);
    }
    
    // Initialize RNG
    const seed = Date.now();
    rngRef.current = new SeededRandom(seed);
    
    // Build arena
    tilesRef.current = buildArena(scene);
    
    return { scene, camera, renderer };
  }, [getThemeColors, buildArena]);

  // Create local player
  const createLocalPlayer = useCallback((playerIndex: number, username: string) => {
    if (!sceneRef.current) return;
    
    const color = PLAYER_COLORS[playerIndex].main;
    const mesh = createPlayerMesh(color, username, true);
    
    // Start position based on player index
    const angle = (playerIndex / 4) * Math.PI * 2;
    const startX = Math.cos(angle) * 5;
    const startZ = Math.sin(angle) * 5;
    
    mesh.position.set(startX, NUM_LEVELS * LEVEL_HEIGHT + 1, startZ);
    sceneRef.current.add(mesh);
    
    localPlayerRef.current = {
      mesh,
      position: new THREE.Vector3(startX, NUM_LEVELS * LEVEL_HEIGHT + 1, startZ),
      velocity: new THREE.Vector3(0, 0, 0),
      level: NUM_LEVELS - 1,
      isJumping: true,
      jumpVelocity: 0,
      hearts: 3,
      score: 0,
      balls: 3,
      isAlive: true,
      username,
      color
    };
    
    setHearts(3);
    setBalls(3);
  }, [createPlayerMesh]);

  // Create remote player
  const createRemotePlayer = useCallback((id: string, username: string, color: number) => {
    if (!sceneRef.current || remotePlayersRef.current.has(id)) return;
    
    const mesh = createPlayerMesh(color, username, false);
    const label = createUsernameLabel(username, color);
    
    sceneRef.current.add(mesh);
    
    remotePlayersRef.current.set(id, {
      id,
      mesh,
      position: new THREE.Vector3(0, NUM_LEVELS * LEVEL_HEIGHT + 1, 0),
      targetPosition: new THREE.Vector3(0, NUM_LEVELS * LEVEL_HEIGHT + 1, 0),
      hearts: 3,
      score: 0,
      isAlive: true,
      username,
      color,
      label
    });
  }, [createPlayerMesh, createUsernameLabel]);

  // Shoot ball
  const shootBall = useCallback((targetX: number, targetZ: number) => {
    const player = localPlayerRef.current;
    if (!player || !sceneRef.current || player.balls <= 0) return;
    
    player.balls--;
    setBalls(player.balls);
    
    const direction = new THREE.Vector3(targetX - player.position.x, 0, targetZ - player.position.z).normalize();
    const ballMesh = createBallMesh(player.color);
    const startPos = player.position.clone();
    startPos.y += 0.3;
    ballMesh.position.copy(startPos);
    sceneRef.current.add(ballMesh);
    
    ballsRef.current.push({
      id: `ball-${Date.now()}`,
      mesh: ballMesh,
      position: startPos.clone(),
      velocity: direction.multiplyScalar(BALL_SPEED),
      ownerId: user?.id || 'local',
      bounces: 0
    });
    
    // Send to other players
    if (gameMode === 'online') {
      lobby.sendPlayerAction('shoot', { targetX, targetZ });
    }
  }, [createBallMesh, user?.id, gameMode, lobby]);

  // Jump
  const jump = useCallback(() => {
    const player = localPlayerRef.current;
    if (!player || player.isJumping) return;
    
    player.isJumping = true;
    player.jumpVelocity = JUMP_FORCE;
    
    if (gameMode === 'online') {
      lobby.sendPlayerAction('jump', {});
    }
  }, [gameMode, lobby]);

  // Find tile at position
  const findTileAtPosition = useCallback((x: number, z: number, level: number): HexTile | undefined => {
    const q = Math.round((2/3 * x) / HEX_SIZE);
    const r = Math.round((-1/3 * x + Math.sqrt(3)/3 * z) / HEX_SIZE);
    return tilesRef.current.find(t => t.q === q && t.r === r && t.level === level && (t.state === 'solid' || t.state === 'warning'));
  }, []);

  const findTileBelow = useCallback((x: number, z: number, level: number): HexTile | undefined => {
    for (let l = level; l >= 0; l--) {
      const tile = findTileAtPosition(x, z, l);
      if (tile) return tile;
    }
    return undefined;
  }, [findTileAtPosition]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const now = Date.now();
    const player = localPlayerRef.current;
    
    if (player && player.isAlive) {
      // Movement
      let dx = 0, dz = 0;
      if (keysRef.current.has('w') || keysRef.current.has('ArrowUp')) dz -= PLAYER_SPEED;
      if (keysRef.current.has('s') || keysRef.current.has('ArrowDown')) dz += PLAYER_SPEED;
      if (keysRef.current.has('a') || keysRef.current.has('ArrowLeft')) dx -= PLAYER_SPEED;
      if (keysRef.current.has('d') || keysRef.current.has('ArrowRight')) dx += PLAYER_SPEED;
      
      player.position.x += dx;
      player.position.z += dz;
      
      // Jumping/falling
      if (player.isJumping) {
        player.jumpVelocity -= GRAVITY;
        player.position.y += player.jumpVelocity;
        
        const tile = findTileBelow(player.position.x, player.position.z, NUM_LEVELS - 1);
        const groundLevel = tile ? tile.level * LEVEL_HEIGHT + 0.9 : -10;
        
        if (player.position.y <= groundLevel && player.jumpVelocity < 0) {
          player.position.y = groundLevel;
          player.isJumping = false;
          player.jumpVelocity = 0;
          if (tile) {
            player.level = tile.level;
            setCurrentLevel(tile.level);
          }
        }
        
        if (player.position.y < -20) {
          player.isAlive = false;
          setGameState('gameover');
          return;
        }
      } else {
        const tile = findTileAtPosition(player.position.x, player.position.z, player.level);
        if (!tile || tile.state === 'falling' || tile.state === 'gone') {
          player.isJumping = true;
          player.jumpVelocity = 0;
        } else {
          player.position.y = player.level * LEVEL_HEIGHT + 0.9;
        }
      }
      
      // Boundary
      const maxDist = (ARENA_RADIUS + 1) * HEX_SIZE * 1.5;
      const dist = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
      if (dist > maxDist) {
        const angle = Math.atan2(player.position.z, player.position.x);
        player.position.x = Math.cos(angle) * maxDist;
        player.position.z = Math.sin(angle) * maxDist;
      }
      
      // Update mesh with rolling animation
      player.mesh.position.copy(player.position);
      if (dx !== 0 || dz !== 0) {
        player.mesh.rotation.x += dz * 0.2;
        player.mesh.rotation.z -= dx * 0.2;
        player.mesh.children[4].rotation.y = Math.atan2(dx, dz); // Direction arrow
      }
      
      // Camera follow
      if (cameraRef.current) {
        const camTarget = new THREE.Vector3(
          player.position.x,
          player.position.y + 15,
          player.position.z + 12
        );
        cameraRef.current.position.lerp(camTarget, 0.05);
        cameraRef.current.lookAt(player.position);
      }
      
      // Send network update
      if (gameMode === 'online' && now - lastUpdateRef.current > UPDATE_RATE) {
        lastUpdateRef.current = now;
        lobby.sendPlayerUpdate({
          id: user?.id || 'local',
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          rotationY: player.mesh.rotation.y,
          hearts: player.hearts,
          score: player.score,
          isAlive: player.isAlive
        });
      }
    }
    
    // Update remote players
    remotePlayersRef.current.forEach(remote => {
      if (!remote.isAlive) return;
      remote.mesh.position.lerp(remote.targetPosition, 0.15);
    });
    
    // Update balls
    ballsRef.current = ballsRef.current.filter(ball => {
      ball.position.add(ball.velocity);
      ball.mesh.position.copy(ball.position);
      
      // Bounce off walls
      const dist = Math.sqrt(ball.position.x ** 2 + ball.position.z ** 2);
      if (dist > ARENA_RADIUS * HEX_SIZE * 1.5) {
        const normal = new THREE.Vector3(-ball.position.x, 0, -ball.position.z).normalize();
        ball.velocity.reflect(normal);
        ball.velocity.multiplyScalar(0.8);
        ball.bounces++;
        if (ball.bounces > 3) {
          sceneRef.current?.remove(ball.mesh);
          return false;
        }
      }
      
      // Check player collision
      if (player && player.isAlive && ball.ownerId !== (user?.id || 'local')) {
        const d = ball.position.distanceTo(player.position);
        if (d < 0.7) {
          player.hearts--;
          setHearts(player.hearts);
          if (player.hearts <= 0) {
            player.isAlive = false;
            setGameState('gameover');
          }
          sceneRef.current?.remove(ball.mesh);
          return false;
        }
      }
      
      return ball.bounces < 4;
    });
    
    // Update falling tiles
    tilesRef.current.forEach(tile => {
      if (tile.state === 'falling') {
        tile.fallSpeed += 0.004;
        tile.mesh.position.y -= tile.fallSpeed;
        tile.mesh.rotation.x += 0.01;
        if (tile.mesh.position.y < -15) {
          tile.state = 'gone';
          sceneRef.current?.remove(tile.mesh);
        }
      }
    });
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [findTileAtPosition, findTileBelow, gameMode, lobby, user?.id]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => setTimeAlive(prev => prev + 0.1), 100);
    return () => clearInterval(timer);
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === ' ') jump();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump]);

  // Mouse/touch for shooting
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const handleClick = (e: MouseEvent) => {
      if (!cameraRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      if (target) shootBall(target.x, target.z);
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [gameState, shootBall]);

  // Handle multiplayer updates
  useEffect(() => {
    if (gameMode !== 'online') return;
    
    lobby.onPlayerUpdate((updates) => {
      updates.forEach((update, id) => {
        if (id === user?.id) return;
        
        const remote = remotePlayersRef.current.get(id);
        if (remote) {
          remote.targetPosition.set(update.x, update.y, update.z);
          remote.hearts = update.hearts;
          remote.score = update.score;
          remote.isAlive = update.isAlive;
        }
      });
    });
    
    lobby.onPlayerAction((playerId, action, data) => {
      if (playerId === user?.id) return;
      
      if (action === 'shoot' && data) {
        const remote = remotePlayersRef.current.get(playerId);
        if (remote && sceneRef.current) {
          const dir = new THREE.Vector3(data.targetX - remote.position.x, 0, data.targetZ - remote.position.z).normalize();
          const ballMesh = createBallMesh(remote.color);
          ballMesh.position.copy(remote.position);
          sceneRef.current.add(ballMesh);
          ballsRef.current.push({
            id: `ball-${Date.now()}-${playerId}`,
            mesh: ballMesh,
            position: remote.position.clone(),
            velocity: dir.multiplyScalar(BALL_SPEED),
            ownerId: playerId,
            bounces: 0
          });
        }
      }
    });
    
    lobby.onGameStart(() => {
      setGameState('playing');
      gameActiveRef.current = true;
      
      // Create all players
      lobby.players.forEach((p, i) => {
        if (p.id === user?.id) {
          createLocalPlayer(i, p.username);
        } else {
          createRemotePlayer(p.id, p.username, PLAYER_COLORS[i].main);
        }
      });
      
      gameLoop();
    });
  }, [gameMode, lobby, user?.id, createLocalPlayer, createRemotePlayer, createBallMesh, gameLoop]);

  // Start solo game
  const startSoloGame = useCallback(() => {
    setGameMode('solo');
    setGameState('playing');
    setScore(0);
    setTimeAlive(0);
    
    if (!sceneRef.current) initScene();
    
    createLocalPlayer(0, user?.email?.split('@')[0] || 'Player');
    gameActiveRef.current = true;
    clockRef.current.start();
    gameLoop();
    
    // Music
    const musicFile = theme === 'halloween' ? '/hex-arena-halloween.mp3' : theme === 'christmas' ? '/hex-arena-christmas.mp3' : '/hex-arena.mp3';
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [initScene, createLocalPlayer, gameLoop, theme, user]);

  // Find online match
  const findMatch = useCallback(async () => {
    setGameMode('online');
    setGameState('matchmaking');
    await lobby.findLobby();
    setGameState('lobby');
  }, [lobby]);

  // Init scene on mount
  useEffect(() => {
    if (gameState === 'menu') initScene();
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        try { containerRef.current.removeChild(rendererRef.current.domElement); } catch {}
        rendererRef.current.dispose();
      }
      audioRef.current?.pause();
    };
  }, []);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">{score.toLocaleString()}</div>
              <div className="text-xs text-gray-400">SCORE</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-2xl font-mono font-bold text-white">{timeAlive.toFixed(1)}s</div>
              <div className="text-xs text-gray-400">TIME</div>
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="flex gap-1 justify-end">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-xl ${i < hearts ? 'text-red-500' : 'text-gray-600'}`}>❤️</span>
                ))}
              </div>
              <div className="flex gap-1 mt-1 justify-end">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < balls ? 'bg-purple-500' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
          </div>
          
          {/* Level indicator */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex flex-col gap-2">
              {LEVEL_COLORS.map((c, i) => (
                <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all ${i === currentLevel ? 'border-white scale-110' : 'border-white/30 opacity-50'}`}
                  style={{ backgroundColor: `#${c.solid.toString(16).padStart(6, '0')}` }}
                >{i + 1}</div>
              ))}
            </div>
          </div>
          
          {/* Mobile controls */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between sm:hidden pointer-events-auto">
            <button onClick={jump} className="w-20 h-20 rounded-full bg-green-600/80 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-lg active:scale-95">
              JUMP
            </button>
            <button onClick={() => shootBall(localPlayerRef.current?.position.x || 0, (localPlayerRef.current?.position.z || 0) - 5)}
              className="w-20 h-20 rounded-full bg-purple-600/80 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-lg active:scale-95">
              SHOOT
            </button>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:block pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 text-xs text-gray-400">
              WASD: Move • Space: Jump • Click: Shoot
            </div>
          </div>
        </>
      )}
      
      {/* Floating Scores */}
      {floatingScores.map(fs => (
        <div key={fs.id} className="absolute pointer-events-none font-bold text-xl"
          style={{ left: fs.x, top: fs.y, color: fs.color, transform: 'translate(-50%, -50%)', textShadow: '0 0 10px currentColor', animation: 'floatUp 1.5s ease-out forwards' }}>
          {fs.text}
        </div>
      ))}
      
      {/* Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-lg w-full text-center">
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">⬡ HexArena</h1>
            <p className="text-gray-400 mb-6">Multi-Level Ball Battle</p>
            
            <div className="space-y-3 text-left text-gray-300 mb-6">
              <div className="flex items-center gap-3"><span className="text-xl">🎱</span><div><b className="text-white">Rolling Balls</b> - Each player is a colored ball!</div></div>
              <div className="flex items-center gap-3"><span className="text-xl">⬆️</span><div><b className="text-white">4 Levels</b> - Jump between platforms!</div></div>
              <div className="flex items-center gap-3"><span className="text-xl">🔮</span><div><b className="text-white">Shoot Balls</b> - 3 shots to knock others off!</div></div>
              <div className="flex items-center gap-3"><span className="text-xl">👑</span><div><b className="text-white">Survive</b> - Last ball standing wins!</div></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={startSoloGame} className="py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-105">
                <div className="text-xl">🎮</div>
                <div>SOLO</div>
                <div className="text-xs opacity-75">Practice Mode</div>
              </button>
              <button onClick={findMatch} className="py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105">
                <div className="text-xl">🌐</div>
                <div>ONLINE</div>
                <div className="text-xs opacity-75">2-4 Players</div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Matchmaking */}
      {gameState === 'matchmaking' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">🔍</div>
            <div className="text-xl text-white font-bold">Finding Match...</div>
            <div className="text-gray-400 mt-2">Looking for other players</div>
          </div>
        </div>
      )}
      
      {/* Lobby */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white text-center mb-4">⬡ LOBBY</h2>
            
            {lobby.countdown !== null && (
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-yellow-400 animate-pulse">{lobby.countdown}</div>
                <div className="text-gray-400">Game starting...</div>
              </div>
            )}
            
            <div className="space-y-2 mb-6">
              {lobby.players.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${p.id === user?.id ? 'bg-cyan-900/30 border border-cyan-500/50' : 'bg-white/5'}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: `#${PLAYER_COLORS[i].main.toString(16).padStart(6, '0')}` }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{p.username}</div>
                    <div className="text-xs text-gray-400">{p.isHost ? '👑 Host' : ''}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${p.isReady || p.isHost ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {p.isReady || p.isHost ? 'READY' : 'WAITING'}
                  </div>
                </div>
              ))}
              
              {lobby.players.length < 4 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-dashed border-white/20">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">?</div>
                  <div className="text-gray-500">Waiting for player...</div>
                </div>
              )}
            </div>
            
            {lobby.error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
                {lobby.error}
              </div>
            )}
            
            <div className="flex gap-3">
              {lobby.isHost ? (
                <button onClick={lobby.startGame} disabled={lobby.players.filter(p => p.isReady || p.isHost).length < 2}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  START GAME ({lobby.players.filter(p => p.isReady || p.isHost).length}/2 ready)
                </button>
              ) : (
                <button onClick={lobby.toggleReady}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${lobby.isReady ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                  {lobby.isReady ? '✓ READY' : 'READY UP'}
                </button>
              )}
              <button onClick={() => { lobby.leaveLobby(); setGameState('menu'); }}
                className="px-4 py-3 rounded-xl font-bold text-white bg-red-600/50 hover:bg-red-500/50 transition-all">
                LEAVE
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
            <div className="text-5xl font-bold text-cyan-400 my-6">{score.toLocaleString()}</div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-400 text-sm">Time</div><div className="text-2xl font-bold text-white">{timeAlive.toFixed(1)}s</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-400 text-sm">Level</div><div className="text-2xl font-bold" style={{ color: `#${LEVEL_COLORS[currentLevel].solid.toString(16)}` }}>{currentLevel + 1}</div></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setGameState('menu'); gameActiveRef.current = false; }}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all">
                Play Again
              </button>
              <button onClick={() => window.location.href = '/games'}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
      `}</style>
    </div>
  );
}
