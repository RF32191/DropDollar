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
  const [balls, setBalls] = useState(5);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [gameMode, setGameMode] = useState<'solo' | 'ai' | 'online'>('solo');
  const [aiAlive, setAiAlive] = useState(true);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  
  // Mobile joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickDelta, setJoystickDelta] = useState({ x: 0, y: 0 });
  const joystickStartRef = useRef({ x: 0, y: 0 });
  
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
  
  // AI refs
  const aiPlayerRef = useRef<LocalPlayer | null>(null);
  const aiTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const aiLastActionRef = useRef(0);
  const aiLastShootRef = useRef(0);
  
  // Constants
  const HEX_SIZE = 1.2;
  const ARENA_RADIUS = 5;
  const NUM_LEVELS = 4;
  const LEVEL_HEIGHT = 4;
  const TILE_COLLAPSE_DELAY = 1200; // Time before tile starts falling after being stepped on
const TILE_WARNING_DURATION = 800; // Time tile glows before falling
  const JUMP_FORCE = 0.28;
  const GRAVITY = 0.01;
  const BALL_SPEED = 0.4;
  const PLAYER_SPEED = 0.15;
  const UPDATE_RATE = 50; // ms between network updates
  const DEATH_DEPTH = -25; // Fall below this = death
  const AI_THINK_INTERVAL = 500; // ms between AI decisions
  const AI_SHOOT_COOLDOWN = 2000; // ms between AI shots

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
      hearts: 1,
      score: 0,
      balls: 5,
      isAlive: true,
      username,
      color
    };
    
    setBalls(5);
  }, [createPlayerMesh]);

  // Create AI player
  const createAIPlayer = useCallback(() => {
    if (!sceneRef.current) return;
    
    const color = PLAYER_COLORS[1].main; // Magenta for AI
    const mesh = createPlayerMesh(color, '🤖 AI Bot', false);
    
    // Start opposite side from player
    const startX = -5;
    const startZ = -5;
    
    mesh.position.set(startX, NUM_LEVELS * LEVEL_HEIGHT + 1, startZ);
    sceneRef.current.add(mesh);
    
    aiPlayerRef.current = {
      mesh,
      position: new THREE.Vector3(startX, NUM_LEVELS * LEVEL_HEIGHT + 1, startZ),
      velocity: new THREE.Vector3(0, 0, 0),
      level: NUM_LEVELS - 1,
      isJumping: true,
      jumpVelocity: 0,
      hearts: 1,
      score: 0,
      balls: 99,
      isAlive: true,
      username: 'AI Bot',
      color
    };
    
    setAiAlive(true);
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

  // Update a player (local or AI) physics
  const updatePlayerPhysics = useCallback((player: LocalPlayer, dx: number, dz: number, now: number, isAI: boolean = false) => {
    if (!player.isAlive) return;
    
    // Apply movement
    player.position.x += dx;
    player.position.z += dz;
    
    // Jumping/falling
    if (player.isJumping) {
      player.jumpVelocity -= GRAVITY;
      player.position.y += player.jumpVelocity;
      
      const tile = findTileBelow(player.position.x, player.position.z, NUM_LEVELS - 1);
      const groundLevel = tile ? tile.level * LEVEL_HEIGHT + 0.9 : -100;
      
      if (player.position.y <= groundLevel && player.jumpVelocity < 0) {
        player.position.y = groundLevel;
        player.isJumping = false;
        player.jumpVelocity = 0;
        if (tile) {
          player.level = tile.level;
          if (!isAI) setCurrentLevel(tile.level);
        }
      }
      
      // DEATH BY FALLING
      if (player.position.y < DEATH_DEPTH) {
        player.isAlive = false;
        if (isAI) {
          setAiAlive(false);
          setWinner('player');
          setGameState('gameover');
        } else {
          setWinner(gameMode === 'ai' ? 'ai' : null);
          setGameState('gameover');
        }
        return;
      }
    } else {
      const tile = findTileAtPosition(player.position.x, player.position.z, player.level);
      if (!tile || tile.state === 'falling' || tile.state === 'gone') {
        player.isJumping = true;
        player.jumpVelocity = 0;
      } else {
        player.position.y = player.level * LEVEL_HEIGHT + 0.9;
        
        // TRIGGER TILE COLLAPSE
        if (tile.state === 'solid' && tile.stepTime === null) {
          tile.stepTime = now;
          tile.state = 'warning';
          
          const mat = tile.mesh.material as THREE.MeshStandardMaterial;
          const levelColor = LEVEL_COLORS[tile.level];
          mat.emissive.setHex(levelColor.warning);
          mat.emissiveIntensity = 1.5;
          mat.color.setHex(levelColor.warning);
        }
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
      if (player.mesh.children[4]) {
        player.mesh.children[4].rotation.y = Math.atan2(dx, dz);
      }
    }
  }, [findTileAtPosition, findTileBelow, gameMode]);

  // AI Logic
  const updateAI = useCallback((now: number) => {
    const ai = aiPlayerRef.current;
    const player = localPlayerRef.current;
    if (!ai || !ai.isAlive || !player) return;
    
    // AI thinks every interval
    if (now - aiLastActionRef.current > AI_THINK_INTERVAL) {
      aiLastActionRef.current = now;
      
      // Find safe tiles on current level
      const safeTiles = tilesRef.current.filter(t => 
        t.level === ai.level && 
        (t.state === 'solid' || t.state === 'warning') &&
        t.stepTime === null
      );
      
      if (safeTiles.length > 0) {
        // Move toward a random safe tile
        const targetTile = safeTiles[Math.floor(Math.random() * safeTiles.length)];
        const { x, z } = hexToWorld(targetTile.q, targetTile.r, HEX_SIZE);
        aiTargetRef.current.set(x, ai.position.y, z);
      } else {
        // No safe tiles - try to jump!
        if (!ai.isJumping && Math.random() < 0.3) {
          ai.isJumping = true;
          ai.jumpVelocity = JUMP_FORCE;
        }
      }
      
      // Occasionally jump to dodge or move to higher ground
      if (!ai.isJumping && Math.random() < 0.1) {
        ai.isJumping = true;
        ai.jumpVelocity = JUMP_FORCE;
      }
    }
    
    // Move toward target
    const toTarget = aiTargetRef.current.clone().sub(ai.position);
    toTarget.y = 0;
    const distance = toTarget.length();
    
    let dx = 0, dz = 0;
    if (distance > 0.5) {
      toTarget.normalize();
      dx = toTarget.x * PLAYER_SPEED * 0.8;
      dz = toTarget.z * PLAYER_SPEED * 0.8;
    }
    
    updatePlayerPhysics(ai, dx, dz, now, true);
    
    // AI shoots at player
    if (player.isAlive && now - aiLastShootRef.current > AI_SHOOT_COOLDOWN && ai.balls > 0) {
      const distToPlayer = ai.position.distanceTo(player.position);
      if (distToPlayer < 15 && Math.random() < 0.5) {
        aiLastShootRef.current = now;
        
        // Shoot at player with some inaccuracy
        const inaccuracy = (Math.random() - 0.5) * 3;
        const targetX = player.position.x + inaccuracy;
        const targetZ = player.position.z + inaccuracy;
        
        if (sceneRef.current) {
          const direction = new THREE.Vector3(targetX - ai.position.x, 0, targetZ - ai.position.z).normalize();
          const ballMesh = createBallMesh(ai.color);
          const startPos = ai.position.clone();
          startPos.y += 0.3;
          ballMesh.position.copy(startPos);
          sceneRef.current.add(ballMesh);
          
          ballsRef.current.push({
            id: `ai-ball-${Date.now()}`,
            mesh: ballMesh,
            position: startPos.clone(),
            velocity: direction.multiplyScalar(BALL_SPEED),
            ownerId: 'ai',
            bounces: 0
          });
        }
      }
    }
  }, [updatePlayerPhysics, createBallMesh]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const now = Date.now();
    const player = localPlayerRef.current;
    
    if (player && player.isAlive) {
      // Movement from keyboard
      let dx = 0, dz = 0;
      if (keysRef.current.has('w') || keysRef.current.has('arrowup')) dz -= PLAYER_SPEED;
      if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) dz += PLAYER_SPEED;
      if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) dx -= PLAYER_SPEED;
      if (keysRef.current.has('d') || keysRef.current.has('arrowright')) dx += PLAYER_SPEED;
      
      // Mobile joystick movement
      if (joystickActive) {
        dx += joystickDelta.x * PLAYER_SPEED * 1.5;
        dz += joystickDelta.y * PLAYER_SPEED * 1.5;
      }
      
      updatePlayerPhysics(player, dx, dz, now, false);
      
      // Camera follow
      if (cameraRef.current) {
        const camTarget = new THREE.Vector3(
          player.position.x,
          player.position.y + 18,
          player.position.z + 14
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
    
    // Update AI
    if (gameMode === 'ai') {
      updateAI(now);
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
      
      // Check player collision - ball pushes player!
      if (player && player.isAlive && ball.ownerId !== (user?.id || 'local')) {
        const d = ball.position.distanceTo(player.position);
        if (d < 0.8) {
          // Push player in direction of ball
          const pushDir = ball.velocity.clone().normalize();
          player.position.x += pushDir.x * 2;
          player.position.z += pushDir.z * 2;
          player.isJumping = true;
          player.jumpVelocity = 0.1;
          
          sceneRef.current?.remove(ball.mesh);
          return false;
        }
      }
      
      // Check AI collision
      const ai = aiPlayerRef.current;
      if (ai && ai.isAlive && ball.ownerId !== 'ai') {
        const d = ball.position.distanceTo(ai.position);
        if (d < 0.8) {
          // Push AI
          const pushDir = ball.velocity.clone().normalize();
          ai.position.x += pushDir.x * 2.5;
          ai.position.z += pushDir.z * 2.5;
          ai.isJumping = true;
          ai.jumpVelocity = 0.15;
          
          player && (player.score += 50);
          setScore(player?.score || 0);
          
          sceneRef.current?.remove(ball.mesh);
          return false;
        }
      }
      
      return ball.bounces < 4;
    });
    
    // Update tiles - warning glow and falling
    tilesRef.current.forEach(tile => {
      if (tile.state === 'warning' && tile.stepTime !== null) {
        const timeSinceStep = now - tile.stepTime;
        const mat = tile.mesh.material as THREE.MeshStandardMaterial;
        const levelColor = LEVEL_COLORS[tile.level];
        
        // Pulse glow effect while warning
        const pulseIntensity = 1.0 + Math.sin(timeSinceStep * 0.015) * 0.8;
        mat.emissiveIntensity = pulseIntensity;
        
        // Shake the tile
        tile.mesh.position.x += (Math.random() - 0.5) * 0.02;
        tile.mesh.position.z += (Math.random() - 0.5) * 0.02;
        
        // After delay, start falling
        if (timeSinceStep > TILE_COLLAPSE_DELAY) {
          tile.state = 'falling';
          tile.fallSpeed = 0.02;
          
          // Flash bright before falling
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 3;
          
          // Add score for triggering collapse
          if (localPlayerRef.current) {
            localPlayerRef.current.score += 10;
            setScore(localPlayerRef.current.score);
          }
        }
      } else if (tile.state === 'falling') {
        tile.fallSpeed += 0.008;
        tile.mesh.position.y -= tile.fallSpeed;
        tile.mesh.rotation.x += 0.03;
        tile.mesh.rotation.z += 0.02;
        
        // Fade out as it falls
        const mat = tile.mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, 1 - tile.fallSpeed * 2);
        mat.transparent = true;
        
        if (tile.mesh.position.y < -20) {
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
  }, [updatePlayerPhysics, updateAI, joystickActive, joystickDelta, gameMode, lobby, user?.id]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => setTimeAlive(prev => prev + 0.1), 100);
    return () => clearInterval(timer);
  }, [gameState]);

  // Keyboard controls - ALWAYS active during play
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysRef.current.clear();
    };
  }, [gameState, jump]);

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

  // Start solo game (practice - just you)
  const startSoloGame = useCallback(() => {
    setGameMode('solo');
    setGameState('playing');
    setScore(0);
    setTimeAlive(0);
    setWinner(null);
    
    if (!sceneRef.current) initScene();
    
    createLocalPlayer(0, user?.email?.split('@')[0] || 'Player');
    gameActiveRef.current = true;
    clockRef.current.start();
    gameLoop();
  }, [initScene, createLocalPlayer, gameLoop, user]);

  // Start AI game
  const startAIGame = useCallback(() => {
    setGameMode('ai');
    setGameState('playing');
    setScore(0);
    setTimeAlive(0);
    setWinner(null);
    setAiAlive(true);
    
    if (!sceneRef.current) initScene();
    
    createLocalPlayer(0, user?.email?.split('@')[0] || 'Player');
    createAIPlayer();
    gameActiveRef.current = true;
    clockRef.current.start();
    gameLoop();
  }, [initScene, createLocalPlayer, createAIPlayer, gameLoop, user]);

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
          <div className="absolute top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 flex justify-between items-start pointer-events-none">
            {/* Score & Time */}
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-white/10">
              <div className="text-xl md:text-2xl font-bold text-cyan-400">{score.toLocaleString()}</div>
              <div className="text-[10px] md:text-xs text-gray-400">SCORE</div>
            </div>
            
            <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 md:px-4 py-1 md:py-2 border border-white/10 text-center">
              <div className="text-xl md:text-2xl font-mono font-bold text-white">{timeAlive.toFixed(1)}s</div>
              <div className="text-[10px] md:text-xs text-gray-400">SURVIVE!</div>
            </div>
            
            {/* AI Status (if playing vs AI) */}
            {gameMode === 'ai' && (
              <div className={`bg-black/70 backdrop-blur-sm rounded-xl p-2 md:p-3 border ${aiAlive ? 'border-red-500/50' : 'border-gray-500/50'}`}>
                <div className={`text-lg md:text-xl font-bold ${aiAlive ? 'text-red-400' : 'text-gray-500 line-through'}`}>
                  🤖 AI
                </div>
                <div className="text-[10px] md:text-xs text-gray-400">{aiAlive ? 'ALIVE' : 'DEAD'}</div>
              </div>
            )}
            
            {/* Balls remaining */}
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-white/10">
              <div className="flex gap-0.5 md:gap-1 justify-end flex-wrap max-w-[60px]">
                {[...Array(Math.min(balls, 5))].map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-purple-500" />
                ))}
              </div>
              <div className="text-[10px] md:text-xs text-gray-400 text-right">AMMO</div>
            </div>
          </div>
          
          {/* Level indicator */}
          <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex flex-col gap-1 md:gap-2">
              {LEVEL_COLORS.map((c, i) => (
                <div key={i} className={`w-6 h-6 md:w-8 md:h-8 rounded-lg border-2 flex items-center justify-center font-bold text-xs md:text-sm transition-all ${i === currentLevel ? 'border-white scale-110' : 'border-white/30 opacity-50'}`}
                  style={{ backgroundColor: `#${c.solid.toString(16).padStart(6, '0')}` }}
                >{i + 1}</div>
              ))}
            </div>
          </div>
          
          {/* MOBILE CONTROLS - Joystick + Buttons */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 p-3 pointer-events-auto">
            {/* Virtual Joystick Area */}
            <div 
              className="absolute bottom-4 left-4 w-28 h-28 rounded-full bg-white/10 border-2 border-white/30 touch-none"
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = e.currentTarget.getBoundingClientRect();
                joystickStartRef.current = { 
                  x: rect.left + rect.width / 2, 
                  y: rect.top + rect.height / 2 
                };
                setJoystickActive(true);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (!joystickActive) return;
                const touch = e.touches[0];
                const dx = (touch.clientX - joystickStartRef.current.x) / 50;
                const dy = (touch.clientY - joystickStartRef.current.y) / 50;
                setJoystickDelta({ 
                  x: Math.max(-1, Math.min(1, dx)), 
                  y: Math.max(-1, Math.min(1, dy)) 
                });
              }}
              onTouchEnd={() => {
                setJoystickActive(false);
                setJoystickDelta({ x: 0, y: 0 });
              }}
            >
              {/* Joystick knob */}
              <div 
                className="absolute w-12 h-12 rounded-full bg-cyan-500/80 border-2 border-white"
                style={{
                  left: `calc(50% + ${joystickDelta.x * 30}px - 24px)`,
                  top: `calc(50% + ${joystickDelta.y * 30}px - 24px)`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs font-bold">
                MOVE
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button 
                onTouchStart={(e) => { e.preventDefault(); jump(); }}
                className="w-16 h-16 rounded-full bg-green-600/90 border-2 border-white/50 flex items-center justify-center text-white font-bold text-sm active:scale-90 touch-none"
              >
                ⬆️<br/>JUMP
              </button>
              <button 
                onTouchStart={(e) => {
                  e.preventDefault();
                  const player = localPlayerRef.current;
                  if (player) {
                    // Shoot forward relative to camera
                    shootBall(player.position.x, player.position.z - 10);
                  }
                }}
                className="w-16 h-16 rounded-full bg-purple-600/90 border-2 border-white/50 flex items-center justify-center text-white font-bold text-sm active:scale-90 touch-none"
              >
                🔮<br/>FIRE
              </button>
            </div>
          </div>
          
          {/* Desktop controls hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:block pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10 text-xs text-gray-400">
              WASD: Move • Space: Jump • Click: Shoot • Don't fall off!
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
            
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <button onClick={startSoloGame} className="py-3 md:py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-105">
                <div className="text-lg md:text-xl">🎮</div>
                <div className="text-sm md:text-base">SOLO</div>
                <div className="text-[10px] md:text-xs opacity-75">Practice</div>
              </button>
              <button onClick={startAIGame} className="py-3 md:py-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 transition-all transform hover:scale-105">
                <div className="text-lg md:text-xl">🤖</div>
                <div className="text-sm md:text-base">VS AI</div>
                <div className="text-[10px] md:text-xs opacity-75">1v1 Bot</div>
              </button>
              <button onClick={findMatch} className="py-3 md:py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105">
                <div className="text-lg md:text-xl">🌐</div>
                <div className="text-sm md:text-base">ONLINE</div>
                <div className="text-[10px] md:text-xs opacity-75">2-4 Players</div>
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
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-4 md:p-6 max-w-md w-full text-center">
            {/* Winner announcement */}
            {winner === 'player' ? (
              <>
                <div className="text-4xl md:text-5xl mb-2">🏆</div>
                <h2 className="text-2xl md:text-3xl font-bold text-green-400 mb-2">VICTORY!</h2>
                <p className="text-gray-400 mb-4">You knocked the AI off the arena!</p>
              </>
            ) : winner === 'ai' ? (
              <>
                <div className="text-4xl md:text-5xl mb-2">💀</div>
                <h2 className="text-2xl md:text-3xl font-bold text-red-400 mb-2">DEFEATED</h2>
                <p className="text-gray-400 mb-4">You fell off the arena!</p>
              </>
            ) : (
              <>
                <div className="text-4xl md:text-5xl mb-2">⬡</div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Game Over</h2>
                <p className="text-gray-400 mb-4">You fell into the void!</p>
              </>
            )}
            
            <div className="text-4xl md:text-5xl font-bold text-cyan-400 my-4 md:my-6">{score.toLocaleString()}</div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="bg-white/5 rounded-lg p-2 md:p-3">
                <div className="text-gray-400 text-xs md:text-sm">Time</div>
                <div className="text-xl md:text-2xl font-bold text-white">{timeAlive.toFixed(1)}s</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 md:p-3">
                <div className="text-gray-400 text-xs md:text-sm">Level</div>
                <div className="text-xl md:text-2xl font-bold" style={{ color: `#${LEVEL_COLORS[currentLevel].solid.toString(16)}` }}>{currentLevel + 1}</div>
              </div>
            </div>
            
            <div className="flex gap-2 md:gap-3">
              <button onClick={() => { 
                setGameState('menu'); 
                gameActiveRef.current = false;
                setWinner(null);
                // Clean up AI
                if (aiPlayerRef.current && sceneRef.current) {
                  sceneRef.current.remove(aiPlayerRef.current.mesh);
                  aiPlayerRef.current = null;
                }
              }}
                className="flex-1 py-2 md:py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all text-sm md:text-base">
                Play Again
              </button>
              <button onClick={() => window.location.href = '/games'}
                className="flex-1 py-2 md:py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm md:text-base">
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Spectating mode */}
      {gameState === 'spectating' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20 flex items-center gap-4">
            <span className="text-white font-bold">👀 Spectating</span>
            <button 
              onClick={() => { setGameState('menu'); gameActiveRef.current = false; }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all"
            >
              Exit
            </button>
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
