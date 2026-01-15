'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useMultiplayerLobby, PlayerUpdate, LobbyPlayer } from '@/hooks/useMultiplayerLobby';

// ============================================================================
// LASER BATTLE - 4-Player Online Competitive Laser Dodge
// ============================================================================
// Online multiplayer with matchmaking (2-4 players)
// Dodge lasers and shoot opponents
// Last player standing wins!
// Rolling ball characters with usernames
// ============================================================================

interface LaserBattleGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface LocalPlayer {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
  hearts: number;
  score: number;
  lastShot: number;
  invincibleUntil: number;
  isAlive: boolean;
  username: string;
}

interface RemotePlayer {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  color: number;
  hearts: number;
  score: number;
  isAlive: boolean;
  username: string;
}

interface Player {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: number;
  hearts: number;
  isLocal: boolean;
  isAlive: boolean;
  score: number;
  lastShot: number;
  invincibleUntil: number;
}

interface Laser {
  id: string;
  mesh: THREE.Mesh;
  type: 'horizontal' | 'vertical';
  position: number;
  isHarmful: boolean;
  harmfulAt: number;
  createdAt: number;
}

interface Bullet {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ownerId: string;
  createdAt: number;
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

// Player colors
const PLAYER_COLORS = [
  { main: 0x00ffff, glow: 0x00ccff, name: 'CYAN' },
  { main: 0xff00ff, glow: 0xff66ff, name: 'MAGENTA' },
  { main: 0x00ff00, glow: 0x66ff66, name: 'GREEN' },
  { main: 0xffff00, glow: 0xffcc00, name: 'YELLOW' }
];

export default function LaserBattleGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: LaserBattleGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'menu' | 'matchmaking' | 'lobby' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [hearts, setHearts] = useState(3);
  const [playersAlive, setPlayersAlive] = useState(4);
  const [playerCount, setPlayerCount] = useState(4);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [kills, setKills] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo');
  
  // Multiplayer hook
  const lobby = useMultiplayerLobby(
    'laser-battle',
    user?.id,
    user?.email?.split('@')[0] || 'Player'
  );
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playersRef = useRef<Player[]>([]);
  const localPlayerRef = useRef<Player | null>(null);
  const lasersRef = useRef<Laser[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const killsRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const lastLaserSpawnRef = useRef(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  // Constants
  const ARENA_SIZE = 20;
  const PLAYER_SPEED = 0.18;
  const BULLET_SPEED = 0.6;
  const LASER_WARNING_TIME = 2000;
  const LASER_ACTIVE_TIME = 3000;
  const LASER_SPAWN_INTERVAL = 1500;
  const SHOT_COOLDOWN = 400;
  const INVINCIBILITY_TIME = 1500;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          floor: 0x1a0a2e,
          laser: { warning: 0x8844ff, harmful: 0xff6600 },
          ambient: 0x6b3fa0
        };
      case 'christmas':
        return {
          background: 0x001122,
          floor: 0x0a1a2a,
          laser: { warning: 0x00ff00, harmful: 0xff0000 },
          ambient: 0x87ceeb
        };
      default:
        return {
          background: 0x050510,
          floor: 0x0a0a1a,
          laser: { warning: 0x0088ff, harmful: 0xff0044 },
          ambient: 0x4444aa
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((points: number, x: number, y: number, special: boolean = false) => {
    const id = floatingScoreIdRef.current++;
    const color = special ? '#ffd700' : points > 0 ? '#00ff88' : '#ff4444';
    const text = points > 0 ? `+${points}` : `${points}`;
    
    setFloatingScores(prev => [...prev, { id, text, x, y, color }]);
    
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  // Create player mesh
  const createPlayerMesh = useCallback((playerIndex: number, isLocal: boolean, themeType: string): THREE.Group => {
    const group = new THREE.Group();
    const playerColor = PLAYER_COLORS[playerIndex];
    
    if (themeType === 'halloween') {
      // Pumpkin ship
      const bodyGeom = new THREE.SphereGeometry(0.5, 16, 16);
      bodyGeom.scale(1, 0.8, 1);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff4400,
        emissiveIntensity: 0.3
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      group.add(body);
      
      // Stem
      const stemGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.25, 8);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
      const stem = new THREE.Mesh(stemGeom, stemMat);
      stem.position.y = 0.5;
      group.add(stem);
      
      // Glowing eyes
      const eyeGeom = new THREE.ConeGeometry(0.1, 0.15, 3);
      const eyeMat = new THREE.MeshBasicMaterial({
        color: playerColor.main,
        transparent: true,
        opacity: 0.9
      });
      const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
      leftEye.position.set(-0.2, 0.1, 0.4);
      leftEye.rotation.x = Math.PI;
      group.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeom, eyeMat.clone());
      rightEye.position.set(0.2, 0.1, 0.4);
      rightEye.rotation.x = Math.PI;
      group.add(rightEye);
      
    } else if (themeType === 'christmas') {
      // Christmas tree ship
      const treeGeom = new THREE.ConeGeometry(0.4, 0.8, 8);
      const treeMat = new THREE.MeshStandardMaterial({
        color: 0x228b22,
        emissive: 0x114411,
        emissiveIntensity: 0.2
      });
      const tree = new THREE.Mesh(treeGeom, treeMat);
      group.add(tree);
      
      // Star on top
      const starGeom = new THREE.OctahedronGeometry(0.15);
      const starMat = new THREE.MeshBasicMaterial({
        color: playerColor.main
      });
      const star = new THREE.Mesh(starGeom, starMat);
      star.position.y = 0.5;
      group.add(star);
      
      // Ornaments
      const ornamentColors = [0xff0000, 0xffd700, 0x0088ff];
      ornamentColors.forEach((color, i) => {
        const ornGeom = new THREE.SphereGeometry(0.06, 8, 8);
        const ornMat = new THREE.MeshBasicMaterial({ color });
        const ornament = new THREE.Mesh(ornGeom, ornMat);
        ornament.position.set(
          Math.cos(i * 2) * 0.25,
          -0.1 + i * 0.15,
          Math.sin(i * 2) * 0.25
        );
        group.add(ornament);
      });
      
    } else {
      // Standard ship
      const bodyGeom = new THREE.ConeGeometry(0.3, 0.8, 8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: playerColor.main,
        emissive: playerColor.glow,
        emissiveIntensity: isLocal ? 0.5 : 0.3,
        metalness: 0.7,
        roughness: 0.3
      });
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.rotation.x = -Math.PI / 2;
      group.add(body);
      
      // Wings
      const wingGeom = new THREE.BoxGeometry(1.2, 0.05, 0.3);
      const wingMat = new THREE.MeshStandardMaterial({
        color: playerColor.main,
        emissive: playerColor.glow,
        emissiveIntensity: 0.2
      });
      const wings = new THREE.Mesh(wingGeom, wingMat);
      wings.position.z = 0.2;
      group.add(wings);
      
      // Engine glow
      const engineGeom = new THREE.SphereGeometry(0.15, 8, 8);
      const engineMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.8
      });
      const engine = new THREE.Mesh(engineGeom, engineMat);
      engine.position.z = 0.4;
      group.add(engine);
    }
    
    // Player number ring
    const ringGeom = new THREE.TorusGeometry(0.6, 0.03, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: playerColor.main,
      transparent: true,
      opacity: isLocal ? 0.6 : 0.3
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.3;
    group.add(ring);
    
    return group;
  }, []);

  // Create bullet mesh
  const createBulletMesh = useCallback((ownerId: string): THREE.Mesh => {
    const player = playersRef.current.find(p => p.id === ownerId);
    const color = player ? PLAYER_COLORS[playersRef.current.indexOf(player)]?.main || 0xffffff : 0xffffff;
    
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Add glow
    const glowGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    mesh.add(glow);
    
    return mesh;
  }, []);

  // Create laser mesh
  const createLaserMesh = useCallback((type: 'horizontal' | 'vertical', position: number, isHarmful: boolean): THREE.Mesh => {
    const colors = getThemeColors();
    const color = isHarmful ? colors.laser.harmful : colors.laser.warning;
    
    const length = ARENA_SIZE * 2;
    const geometry = type === 'horizontal'
      ? new THREE.BoxGeometry(length, 0.15, 0.15)
      : new THREE.BoxGeometry(0.15, 0.15, length);
    
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: isHarmful ? 0.9 : 0.4
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    if (type === 'horizontal') {
      mesh.position.set(0, 0.5, position);
    } else {
      mesh.position.set(position, 0.5, 0);
    }
    
    return mesh;
  }, [getThemeColors]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 15, 40);
    sceneRef.current = scene;
    
    // Camera - top-down view
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 25, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Floor (arena)
    const floorGeom = new THREE.PlaneGeometry(ARENA_SIZE * 2, ARENA_SIZE * 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: colors.floor,
      metalness: 0.3,
      roughness: 0.7
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Grid lines
    const gridHelper = new THREE.GridHelper(ARENA_SIZE * 2, 20, 0x333355, 0x222244);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    
    // Arena borders
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.5
    });
    
    const borderThickness = 0.3;
    const borders = [
      { pos: [0, 0.5, -ARENA_SIZE], size: [ARENA_SIZE * 2, 1, borderThickness] },
      { pos: [0, 0.5, ARENA_SIZE], size: [ARENA_SIZE * 2, 1, borderThickness] },
      { pos: [-ARENA_SIZE, 0.5, 0], size: [borderThickness, 1, ARENA_SIZE * 2] },
      { pos: [ARENA_SIZE, 0.5, 0], size: [borderThickness, 1, ARENA_SIZE * 2] }
    ];
    
    borders.forEach(b => {
      const geom = new THREE.BoxGeometry(b.size[0], b.size[1], b.size[2]);
      const mesh = new THREE.Mesh(geom, borderMat);
      mesh.position.set(b.pos[0], b.pos[1], b.pos[2]);
      scene.add(mesh);
    });
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    return { scene, camera, renderer };
  }, [getThemeColors]);

  // Create players
  const createPlayers = useCallback((numPlayers: number) => {
    if (!sceneRef.current) return;
    
    const players: Player[] = [];
    const startPositions = [
      { x: -ARENA_SIZE * 0.6, z: -ARENA_SIZE * 0.6 },
      { x: ARENA_SIZE * 0.6, z: -ARENA_SIZE * 0.6 },
      { x: -ARENA_SIZE * 0.6, z: ARENA_SIZE * 0.6 },
      { x: ARENA_SIZE * 0.6, z: ARENA_SIZE * 0.6 }
    ];
    
    for (let i = 0; i < numPlayers; i++) {
      const isLocal = i === 0;
      const mesh = createPlayerMesh(i, isLocal, theme);
      const startPos = startPositions[i];
      
      mesh.position.set(startPos.x, 0.5, startPos.z);
      mesh.rotation.y = Math.atan2(-startPos.x, -startPos.z);
      sceneRef.current.add(mesh);
      
      const player: Player = {
        id: isLocal ? (user?.id || 'local') : `bot-${i}`,
        mesh,
        position: new THREE.Vector3(startPos.x, 0.5, startPos.z),
        velocity: new THREE.Vector3(0, 0, 0),
        color: PLAYER_COLORS[i].main,
        hearts: 3,
        isLocal,
        isAlive: true,
        score: 0,
        lastShot: 0,
        invincibleUntil: 0
      };
      
      players.push(player);
      
      if (isLocal) {
        localPlayerRef.current = player;
        setHearts(3);
      }
    }
    
    playersRef.current = players;
    setPlayersAlive(numPlayers);
  }, [createPlayerMesh, theme, user]);

  // Spawn laser
  const spawnLaser = useCallback(() => {
    if (!sceneRef.current || !rngRef.current) return;
    
    const isHorizontal = rngRef.current.next() > 0.5;
    const position = (rngRef.current.next() - 0.5) * ARENA_SIZE * 1.6;
    
    const mesh = createLaserMesh(
      isHorizontal ? 'horizontal' : 'vertical',
      position,
      false
    );
    sceneRef.current.add(mesh);
    
    const laser: Laser = {
      id: `laser-${Date.now()}-${Math.random()}`,
      mesh,
      type: isHorizontal ? 'horizontal' : 'vertical',
      position,
      isHarmful: false,
      harmfulAt: Date.now() + LASER_WARNING_TIME,
      createdAt: Date.now()
    };
    
    lasersRef.current.push(laser);
  }, [createLaserMesh]);

  // Shoot bullet
  const shootBullet = useCallback((player: Player, targetX: number, targetZ: number) => {
    if (!sceneRef.current) return;
    
    const now = Date.now();
    if (now - player.lastShot < SHOT_COOLDOWN) return;
    player.lastShot = now;
    
    const direction = new THREE.Vector3(targetX, 0, targetZ);
    direction.sub(player.position);
    direction.y = 0;
    direction.normalize();
    
    const bulletMesh = createBulletMesh(player.id);
    const startPos = player.position.clone();
    startPos.y = 0.5;
    bulletMesh.position.copy(startPos);
    sceneRef.current.add(bulletMesh);
    
    const bullet: Bullet = {
      id: `bullet-${Date.now()}-${Math.random()}`,
      mesh: bulletMesh,
      position: startPos.clone(),
      velocity: direction.multiplyScalar(BULLET_SPEED),
      ownerId: player.id,
      createdAt: now
    };
    
    bulletsRef.current.push(bullet);
    
    // Face shooting direction
    player.mesh.rotation.y = Math.atan2(direction.x, direction.z);
  }, [createBulletMesh]);

  // Handle player death
  const handlePlayerDeath = useCallback((player: Player, killer?: Player) => {
    player.isAlive = false;
    sceneRef.current?.remove(player.mesh);
    
    const aliveCount = playersRef.current.filter(p => p.isAlive).length;
    setPlayersAlive(aliveCount);
    
    if (killer && killer.isLocal) {
      killsRef.current++;
      setKills(killsRef.current);
      
      const killPoints = 200;
      scoreRef.current += killPoints;
      killer.score += killPoints;
      setScore(scoreRef.current);
      
      if (cameraRef.current) {
        const vector = player.mesh.position.clone();
        vector.project(cameraRef.current);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
        addFloatingScore(killPoints, x, y, true);
      }
    }
    
    if (player.isLocal) {
      // Game over for local player
      endGame(false);
    } else if (aliveCount === 1 && localPlayerRef.current?.isAlive) {
      // Local player wins!
      endGame(true);
    }
  }, [addFloatingScore]);

  // End game
  const endGame = useCallback(async (isWinner: boolean) => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (isWinner) {
      setWinner('YOU WIN!');
      scoreRef.current += 500; // Victory bonus
      setScore(scoreRef.current);
    } else {
      const winningPlayer = playersRef.current.find(p => p.isAlive);
      if (winningPlayer) {
        const winnerIndex = playersRef.current.indexOf(winningPlayer);
        setWinner(`${PLAYER_COLORS[winnerIndex].name} WINS!`);
      }
    }
    
    // Survival bonus
    const survivalBonus = (90 - timeLeft) * 2;
    scoreRef.current += survivalBonus;
    setScore(scoreRef.current);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'laser-battle',
          score: scoreRef.current,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            kills: killsRef.current,
            timeAlive: 90 - timeLeft,
            isWinner,
            playerCount,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'laser-battle',
            action: 'game_complete',
            score: scoreRef.current,
            metadata: {
              kills: killsRef.current,
              isWinner,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, timeLeft, playerCount, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const now = Date.now();
    const colors = getThemeColors();
    
    // Update local player
    const player = localPlayerRef.current;
    if (player && player.isAlive) {
      let dx = 0, dz = 0;
      
      if (keysRef.current.has('ArrowUp') || keysRef.current.has('w') || keysRef.current.has('W')) {
        dz -= PLAYER_SPEED;
      }
      if (keysRef.current.has('ArrowDown') || keysRef.current.has('s') || keysRef.current.has('S')) {
        dz += PLAYER_SPEED;
      }
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a') || keysRef.current.has('A')) {
        dx -= PLAYER_SPEED;
      }
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('d') || keysRef.current.has('D')) {
        dx += PLAYER_SPEED;
      }
      
      // Apply movement
      player.position.x += dx;
      player.position.z += dz;
      
      // Boundary check
      player.position.x = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, player.position.x));
      player.position.z = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, player.position.z));
      
      player.mesh.position.copy(player.position);
      
      // Face movement direction
      if (dx !== 0 || dz !== 0) {
        player.mesh.rotation.y = Math.atan2(dx, dz);
      }
      
      // Invincibility flash
      if (now < player.invincibleUntil) {
        player.mesh.visible = Math.floor(now / 100) % 2 === 0;
      } else {
        player.mesh.visible = true;
      }
    }
    
    // Update AI players
    playersRef.current.forEach(p => {
      if (p.isLocal || !p.isAlive) return;
      
      // Simple AI: dodge lasers and shoot at players
      const rng = rngRef.current;
      if (!rng) {
        // Initialize RNG if missing
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        rngRef.current = new SeededRandom(seed);
        return;
      }
      
      // Random movement with laser avoidance
      if (rng.next() < 0.03) {
        p.velocity.x = (rng.next() - 0.5) * PLAYER_SPEED * 2;
        p.velocity.z = (rng.next() - 0.5) * PLAYER_SPEED * 2;
      }
      
      // Avoid harmful lasers
      lasersRef.current.forEach(laser => {
        if (!laser.isHarmful) return;
        
        if (laser.type === 'horizontal') {
          const dist = Math.abs(p.position.z - laser.position);
          if (dist < 2) {
            p.velocity.z += (p.position.z > laser.position ? 0.1 : -0.1);
          }
        } else {
          const dist = Math.abs(p.position.x - laser.position);
          if (dist < 2) {
            p.velocity.x += (p.position.x > laser.position ? 0.1 : -0.1);
          }
        }
      });
      
      // Apply velocity
      p.position.x += p.velocity.x;
      p.position.z += p.velocity.z;
      
      // Boundary
      p.position.x = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, p.position.x));
      p.position.z = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, p.position.z));
      
      p.mesh.position.copy(p.position);
      
      // Face movement direction
      if (p.velocity.x !== 0 || p.velocity.z !== 0) {
        p.mesh.rotation.y = Math.atan2(p.velocity.x, p.velocity.z);
      }
      
      // Shoot at nearby players
      if (rng.next() < 0.02) {
        const targets = playersRef.current.filter(t => t.id !== p.id && t.isAlive);
        if (targets.length > 0) {
          const target = targets[Math.floor(rng.next() * targets.length)];
          shootBullet(p, target.position.x, target.position.z);
        }
      }
      
      // Dampen velocity
      p.velocity.multiplyScalar(0.95);
    });
    
    // Spawn lasers
    if (now - lastLaserSpawnRef.current > LASER_SPAWN_INTERVAL) {
      lastLaserSpawnRef.current = now;
      spawnLaser();
    }
    
    // Update lasers
    lasersRef.current = lasersRef.current.filter(laser => {
      // Check if should become harmful
      if (!laser.isHarmful && now >= laser.harmfulAt) {
        laser.isHarmful = true;
        const mat = laser.mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(colors.laser.harmful);
        mat.opacity = 0.9;
      }
      
      // Remove old lasers
      if (now - laser.createdAt > LASER_WARNING_TIME + LASER_ACTIVE_TIME) {
        sceneRef.current?.remove(laser.mesh);
        return false;
      }
      
      // Check collision with players
      if (laser.isHarmful) {
        playersRef.current.forEach(p => {
          if (!p.isAlive || now < p.invincibleUntil) return;
          
          let hit = false;
          if (laser.type === 'horizontal') {
            hit = Math.abs(p.position.z - laser.position) < 0.5;
          } else {
            hit = Math.abs(p.position.x - laser.position) < 0.5;
          }
          
          if (hit) {
            p.hearts--;
            p.invincibleUntil = now + INVINCIBILITY_TIME;
            
            if (p.isLocal) {
              setHearts(p.hearts);
              
              if (cameraRef.current) {
                const vector = p.mesh.position.clone();
                vector.project(cameraRef.current);
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
                addFloatingScore(-50, x, y, false);
              }
              
              scoreRef.current -= 50;
              setScore(Math.max(0, scoreRef.current));
            }
            
            if (p.hearts <= 0) {
              handlePlayerDeath(p);
            }
          }
        });
      }
      
      // Pulse animation
      const pulse = Math.sin(now * 0.01) * 0.3 + 0.7;
      (laser.mesh.material as THREE.MeshBasicMaterial).opacity = laser.isHarmful ? pulse : 0.4;
      
      return true;
    });
    
    // Update bullets
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      bullet.position.add(bullet.velocity);
      bullet.mesh.position.copy(bullet.position);
      
      // Remove if out of bounds
      if (Math.abs(bullet.position.x) > ARENA_SIZE + 2 || Math.abs(bullet.position.z) > ARENA_SIZE + 2) {
        sceneRef.current?.remove(bullet.mesh);
        return false;
      }
      
      // Check collision with players
      for (const p of playersRef.current) {
        if (p.id === bullet.ownerId || !p.isAlive || now < p.invincibleUntil) continue;
        
        const dist = bullet.position.distanceTo(p.position);
        if (dist < 0.6) {
          p.hearts--;
          p.invincibleUntil = now + INVINCIBILITY_TIME;
          
          if (p.isLocal) {
            setHearts(p.hearts);
          }
          
          // Find shooter for kill credit
          const shooter = playersRef.current.find(pl => pl.id === bullet.ownerId);
          
          if (p.hearts <= 0) {
            handlePlayerDeath(p, shooter);
          } else if (shooter && shooter.isLocal) {
            const hitPoints = 50;
            scoreRef.current += hitPoints;
            setScore(scoreRef.current);
            
            if (cameraRef.current) {
              const vector = p.mesh.position.clone();
              vector.project(cameraRef.current);
              const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
              const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
              addFloatingScore(hitPoints, x, y, false);
            }
          }
          
          sceneRef.current?.remove(bullet.mesh);
          return false;
        }
      }
      
      return true;
    });
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getThemeColors, spawnLaser, shootBullet, handlePlayerDeath, addFloatingScore]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - whoever has most points wins
          endGame(localPlayerRef.current?.isAlive || false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState, endGame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse controls
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      
      if (target) {
        mouseRef.current = { x: target.x, y: target.z, down: mouseRef.current.down };
      }
    };
    
    const handleMouseDown = () => {
      mouseRef.current.down = true;
      
      if (gameActiveRef.current && localPlayerRef.current && localPlayerRef.current.isAlive) {
        shootBullet(localPlayerRef.current, mouseRef.current.x, mouseRef.current.y);
      }
    };
    
    const handleMouseUp = () => {
      mouseRef.current.down = false;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [shootBullet]);

  // Touch controls
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const container = containerRef.current;
    if (!container) return;
    
    let touchStartPos = { x: 0, y: 0 };
    
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      
      if (!localPlayerRef.current) return;
      
      const touch = e.touches[0];
      const dx = (touch.clientX - touchStartPos.x) * 0.02;
      const dz = (touch.clientY - touchStartPos.y) * 0.02;
      
      localPlayerRef.current.position.x += dx;
      localPlayerRef.current.position.z += dz;
      
      // Boundary
      localPlayerRef.current.position.x = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, localPlayerRef.current.position.x));
      localPlayerRef.current.position.z = Math.max(-ARENA_SIZE + 0.5, Math.min(ARENA_SIZE - 0.5, localPlayerRef.current.position.z));
      
      touchStartPos = { x: touch.clientX, y: touch.clientY };
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      // Tap to shoot at location
      if (localPlayerRef.current && localPlayerRef.current.isAlive && cameraRef.current) {
        const touch = e.changedTouches[0];
        const rect = container.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, target);
        
        if (target) {
          shootBullet(localPlayerRef.current, target.x, target.z);
        }
      }
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, shootBullet]);

  // Start game
  const startGame = useCallback((numPlayers: number = 4) => {
    setPlayerCount(numPlayers);
    setGameState('playing');
    setScore(0);
    setTimeLeft(90);
    setHearts(3);
    setKills(0);
    setWinner(null);
    
    scoreRef.current = 0;
    killsRef.current = 0;
    lastLaserSpawnRef.current = 0;
    
    // Reset lasers and bullets
    if (sceneRef.current) {
      lasersRef.current.forEach(l => sceneRef.current?.remove(l.mesh));
      bulletsRef.current.forEach(b => sceneRef.current?.remove(b.mesh));
      playersRef.current.forEach(p => sceneRef.current?.remove(p.mesh));
    }
    lasersRef.current = [];
    bulletsRef.current = [];
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Create players
    createPlayers(numPlayers);
    
    clockRef.current.start();
    gameActiveRef.current = true;
    
    // Start game loop
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/laser-dodge-(halloween-version).mp3' 
      : theme === 'christmas' 
        ? '/laser-doge-christmas.mp3' 
        : '/laser-dodge.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [createPlayers, gameLoop, theme]);

  // Find online match
  const findMatch = useCallback(async () => {
    setGameMode('online');
    setGameState('matchmaking');
    await lobby.findLobby();
    setGameState('lobby');
  }, [lobby]);

  // Start solo game
  const startSoloGame = useCallback((numPlayers: number) => {
    setGameMode('solo');
    startGame(numPlayers);
  }, [startGame]);

  // Initialize on mount
  useEffect(() => {
    if (gameState === 'menu') {
      initScene();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        try { containerRef.current.removeChild(rendererRef.current.domElement); } catch {}
        rendererRef.current.dispose();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle multiplayer game start
  useEffect(() => {
    if (gameMode !== 'online') return;
    
    lobby.onGameStart(() => {
      setGameState('playing');
      gameActiveRef.current = true;
      createPlayers(lobby.players.length);
      gameLoop();
    });
  }, [gameMode, lobby, createPlayers, gameLoop]);

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

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Game Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score & Kills */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
              <div className="mt-1 text-sm text-red-400">
                💀 {kills} kills
              </div>
            </div>
            
            {/* Center: Time */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </div>
              <div className="text-xs text-gray-400">TIME LEFT</div>
            </div>
            
            {/* Right: Hearts & Players */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="flex gap-1 justify-end">
                {[...Array(3)].map((_, i) => (
                  <span 
                    key={i}
                    className={`text-xl ${i < hearts ? 'text-red-500' : 'text-gray-600'}`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
              <div className="text-sm text-green-400 mt-1">
                {playersAlive} players left
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Player indicators */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-4 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10">
            <div className="text-xs text-gray-400 mb-1">PLAYERS</div>
            <div className="flex gap-2">
              {playersRef.current.map((p, i) => (
                <div
                  key={p.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    p.isAlive ? '' : 'opacity-30'
                  } ${p.isLocal ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: `#${PLAYER_COLORS[i].main.toString(16).padStart(6, '0')}` }}
                >
                  {p.isLocal ? 'U' : i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden sm:inline">WASD: Move • Click: Shoot</span>
              <span className="sm:hidden">Drag: Move • Tap: Shoot</span>
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
      
      {/* Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-lg w-full">
            <h1 className="text-3xl font-bold text-center mb-2">
              <span className="text-red-500">⚡</span> LASER BATTLE <span className="text-red-500">⚡</span>
            </h1>
            <div className="text-sm text-gray-400 text-center mb-4">
              Multiplayer Arena Combat
            </div>
            
            <div className="space-y-3 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <div className="font-bold text-white">Shoot Opponents</div>
                  <div className="text-sm">Click/Tap to fire at other players!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <div className="font-bold text-white">Dodge Lasers</div>
                  <div className="text-sm">Blue = Warning • Red = DEADLY!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">👑</span>
                <div>
                  <div className="font-bold text-white">Last One Standing</div>
                  <div className="text-sm">3 hearts each - be the survivor!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">🎮</span>
                <div>
                  <div className="font-bold text-white">Controls</div>
                  <div className="text-sm">WASD/Arrows: Move • Click: Shoot</div>
                </div>
              </div>
            </div>
            
            {/* Scoring Info */}
            <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm">
              <div className="font-bold text-white mb-1">SCORING</div>
              <div className="grid grid-cols-2 gap-1 text-gray-400">
                <div>Hit Player: +50</div>
                <div>Kill: +200</div>
                <div>Laser Hit: -50</div>
                <div>Victory: +500</div>
              </div>
            </div>
            
            {/* Game Mode Selection */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => startSoloGame(2)}
                className="py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-105"
              >
                <div className="text-xl">🎮</div>
                <div>SOLO 1v1</div>
                <div className="text-xs opacity-75">vs AI Bot</div>
              </button>
              
              <button
                onClick={() => startSoloGame(4)}
                className="py-4 rounded-xl font-bold text-white bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 transition-all transform hover:scale-105"
              >
                <div className="text-xl">🤖</div>
                <div>SOLO 4P</div>
                <div className="text-xs opacity-75">vs 3 AI Bots</div>
              </button>
            </div>
            
            {/* Online Multiplayer Button */}
            <button
              onClick={findMatch}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105"
            >
              <div className="text-xl">🌐</div>
              <div>ONLINE MULTIPLAYER</div>
              <div className="text-xs opacity-75">2-4 Real Players</div>
            </button>
            
            <div className="text-xs text-center text-gray-500 mt-3">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
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
            <h2 className="text-2xl font-bold text-white text-center mb-4">⚡ LASER BATTLE LOBBY</h2>
            
            {lobby.countdown !== null && (
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-yellow-400 animate-pulse">{lobby.countdown}</div>
                <div className="text-gray-400">Game starting...</div>
              </div>
            )}
            
            <div className="space-y-2 mb-6">
              {lobby.players.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg ${p.id === user?.id ? 'bg-red-900/30 border border-red-500/50' : 'bg-white/5'}`}>
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
                  START ({lobby.players.filter(p => p.isReady || p.isHost).length}/2 ready)
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
            <h2 className={`text-4xl font-bold mb-2 ${winner?.includes('YOU') ? 'text-yellow-400' : 'text-red-400'}`}>
              {winner || 'GAME OVER'}
            </h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Kills</div>
                <div className="text-2xl font-bold text-red-400">💀 {kills}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Time Survived</div>
                <div className="text-2xl font-bold text-white">{90 - timeLeft}s</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Hearts Left</div>
                <div className="text-2xl font-bold text-red-500">
                  {hearts > 0 ? '❤️'.repeat(hearts) : '💔'}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Result</div>
                <div className="text-2xl font-bold text-white">
                  {winner?.includes('YOU') ? '🏆' : `#${playersAlive + 1}`}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => startGame(playerCount)}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold transition-all"
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

