'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// HEXARENA - 3D Tactical Skill Game with Multiplayer
// ============================================================================
// Core Mechanic: Multi-level 3D arena made of hex tiles
// Tiles collapse after stepping on them
// Shoot balls to knock opponents off - 3 balls per player
// Paths randomly rebuild - jump to survive!
// Multiplayer: Up to 4 players live
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
  level: number; // Floor level (0-3)
  state: 'solid' | 'warning' | 'falling' | 'gone' | 'rebuilding';
  stepTime: number | null;
  fallSpeed: number;
  rebuildTime?: number;
}

interface Player {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  level: number;
  isJumping: boolean;
  jumpVelocity: number;
  color: number;
  balls: number;
  isLocal: boolean;
  isAlive: boolean;
  score: number;
}

interface Ball {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ownerId: string;
  bounces: number;
  lifetime: number;
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

// Hex geometry helper
function createHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

// Hex to world coordinates
function hexToWorld(q: number, r: number, size: number): { x: number; z: number } {
  const x = size * (3/2 * q);
  const z = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x, z };
}

// Level colors for each floor
const LEVEL_COLORS = [
  { solid: 0x2a5a8a, warning: 0xffaa00, name: 'CYAN' },    // Level 0 - Blue
  { solid: 0x5a2a8a, warning: 0xff66ff, name: 'PURPLE' },  // Level 1 - Purple
  { solid: 0x2a8a5a, warning: 0x66ff66, name: 'GREEN' },   // Level 2 - Green
  { solid: 0x8a5a2a, warning: 0xffcc00, name: 'GOLD' }     // Level 3 - Gold
];

// Player colors
const PLAYER_COLORS = [0x00ffff, 0xff00ff, 0x00ff00, 0xffff00];

export default function HexArenaGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: HexArenaGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'waiting' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [timeAlive, setTimeAlive] = useState(0);
  const [tilesVisited, setTilesVisited] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [tilesRemaining, setTilesRemaining] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [playerCount, setPlayerCount] = useState(1);
  const [gameMode, setGameMode] = useState<'solo' | 'multiplayer'>('solo');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [playersAlive, setPlayersAlive] = useState(1);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playersRef = useRef<Player[]>([]);
  const localPlayerRef = useRef<Player | null>(null);
  const tilesRef = useRef<HexTile[]>([]);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const tilesVisitedRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const moveSpeedRef = useRef(0.12);
  const rebuildTimerRef = useRef(0);
  const lastRebuildRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const aimLineRef = useRef<THREE.Line | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
  // Constants
  const HEX_SIZE = 1.2;
  const ARENA_RADIUS = 4;
  const NUM_LEVELS = 4;
  const LEVEL_HEIGHT = 4;
  const TILE_COLLAPSE_DELAY = 1200;
  const TILE_WARNING_TIME = 500;
  const TILE_REBUILD_INTERVAL = 3000;
  const JUMP_FORCE = 0.25;
  const GRAVITY = 0.012;
  const BALL_SPEED = 0.5;
  const BALL_LIFETIME = 5000;
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          player: 0x00ff88,
          playerGlow: 0x00ffaa,
          ambient: 0x6b3fa0,
          accent: 0xff6600,
          ball: 0xff6600
        };
      case 'christmas':
        return {
          background: 0x001122,
          player: 0xffffff,
          playerGlow: 0x87ceeb,
          ambient: 0x87ceeb,
          accent: 0xff0000,
          ball: 0x00ff00
        };
      default:
        return {
          background: 0x050515,
          player: 0x00ffff,
          playerGlow: 0x00ccff,
          ambient: 0x6c5ce7,
          accent: 0xff00ff,
          ball: 0xff00ff
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

  // Create hex tile for a specific level
  const createHexTile = useCallback((q: number, r: number, level: number, scene: THREE.Scene): HexTile => {
    const levelColor = LEVEL_COLORS[level] || LEVEL_COLORS[0];
    
    const shape = createHexShape(HEX_SIZE * 0.92);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 3
    });
    
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({
      color: levelColor.solid,
      metalness: 0.4,
      roughness: 0.5,
      emissive: levelColor.solid,
      emissiveIntensity: 0.15
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const { x, z } = hexToWorld(q, r, HEX_SIZE);
    mesh.position.set(x, level * LEVEL_HEIGHT, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { q, r, level };
    
    scene.add(mesh);
    
    return {
      mesh,
      q,
      r,
      level,
      state: 'solid',
      stepTime: null,
      fallSpeed: 0
    };
  }, []);

  // Build multi-level arena
  const buildArena = useCallback((scene: THREE.Scene) => {
    const tiles: HexTile[] = [];
    
    for (let level = 0; level < NUM_LEVELS; level++) {
      // Each level has smaller radius for pyramid effect
      const levelRadius = ARENA_RADIUS - Math.floor(level * 0.5);
      
      for (let q = -levelRadius; q <= levelRadius; q++) {
        for (let r = -levelRadius; r <= levelRadius; r++) {
          if (Math.abs(q + r) > levelRadius) continue;
          
          // Skip some tiles for higher levels to create platforms
          if (level > 0) {
            const rng = rngRef.current;
            if (rng && rng.next() > 0.7) continue;
          }
          
          const tile = createHexTile(q, r, level, scene);
          tiles.push(tile);
        }
      }
    }
    
    return tiles;
  }, [createHexTile]);

  // Create player mesh
  const createPlayerMesh = useCallback((playerIndex: number, isLocal: boolean): THREE.Group => {
    const colors = getThemeColors();
    const playerColor = PLAYER_COLORS[playerIndex] || colors.player;
    
    const group = new THREE.Group();
    
    // Main body - sphere with glow
    const bodyGeometry = new THREE.SphereGeometry(0.35, 24, 24);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: playerColor,
      emissive: playerColor,
      emissiveIntensity: isLocal ? 0.5 : 0.3,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);
    
    // Glow ring
    const ringGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: playerColor,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.2;
    group.add(ring);
    
    // Player number indicator
    const indicatorGeometry = new THREE.ConeGeometry(0.15, 0.3, 4);
    const indicatorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.y = 0.5;
    indicator.rotation.z = Math.PI;
    group.add(indicator);
    
    return group;
  }, [getThemeColors]);

  // Create ball mesh
  const createBallMesh = useCallback((ownerId: string): THREE.Mesh => {
    const colors = getThemeColors();
    
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: colors.ball,
      emissive: colors.ball,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    
    return mesh;
  }, [getThemeColors]);

  // Find tile at position
  const findTileAtPosition = useCallback((x: number, z: number, level: number): HexTile | undefined => {
    const q = Math.round((2/3 * x) / HEX_SIZE);
    const r = Math.round((-1/3 * x + Math.sqrt(3)/3 * z) / HEX_SIZE);
    
    return tilesRef.current.find(t => 
      t.q === q && 
      t.r === r && 
      t.level === level && 
      (t.state === 'solid' || t.state === 'warning')
    );
  }, []);

  // Find any tile below position
  const findTileBelow = useCallback((x: number, z: number, currentLevel: number): HexTile | undefined => {
    for (let level = currentLevel; level >= 0; level--) {
      const tile = findTileAtPosition(x, z, level);
      if (tile) return tile;
    }
    return undefined;
  }, [findTileAtPosition]);

  // World to hex conversion
  const worldToHex = useCallback((x: number, z: number): { q: number; r: number } => {
    const q = (2/3 * x) / HEX_SIZE;
    const r = (-1/3 * x + Math.sqrt(3)/3 * z) / HEX_SIZE;
    
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(-q - r);
    
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - (-q - r));
    
    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    
    return { q: rq, r: rr };
  }, []);

  // Step on tile
  const stepOnTile = useCallback((tile: HexTile, player: Player) => {
    if (tile.state !== 'solid' || !player.isLocal) return;
    
    const levelColor = LEVEL_COLORS[tile.level];
    
    tile.stepTime = Date.now();
    
    tilesVisitedRef.current++;
    setTilesVisited(tilesVisitedRef.current);
    
    // Score based on level height
    const basePoints = 10 + tile.level * 15;
    comboRef.current++;
    setCurrentCombo(comboRef.current);
    
    if (comboRef.current > maxCombo) {
      setMaxCombo(comboRef.current);
    }
    
    const comboBonus = Math.floor(comboRef.current / 5) * 25;
    const points = basePoints + comboBonus;
    
    scoreRef.current += points;
    player.score += points;
    setScore(scoreRef.current);
    
    // Floating score
    if (rendererRef.current && cameraRef.current && player.mesh) {
      const vector = player.mesh.position.clone();
      vector.project(cameraRef.current);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
      addFloatingScore(points, x, y, comboRef.current >= 10);
    }
    
    // Warning
    setTimeout(() => {
      if (tile.state === 'solid') {
        tile.state = 'warning';
        const material = tile.mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(levelColor.warning);
        material.emissive.setHex(levelColor.warning);
        material.emissiveIntensity = 0.5;
      }
    }, TILE_COLLAPSE_DELAY - TILE_WARNING_TIME);
    
    // Collapse
    setTimeout(() => {
      if (tile.state !== 'gone') {
        tile.state = 'falling';
        tile.fallSpeed = 0.01;
        const material = tile.mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(0xff3333);
        material.emissive.setHex(0xff3333);
        material.emissiveIntensity = 0.7;
      }
    }, TILE_COLLAPSE_DELAY);
  }, [maxCombo, addFloatingScore]);

  // Rebuild random tiles
  const rebuildRandomTiles = useCallback(() => {
    if (!sceneRef.current || !rngRef.current) return;
    
    const goneTiles = tilesRef.current.filter(t => t.state === 'gone');
    if (goneTiles.length === 0) return;
    
    // Rebuild 1-3 random tiles
    const numToRebuild = rngRef.current.nextInt(1, Math.min(3, goneTiles.length));
    
    for (let i = 0; i < numToRebuild; i++) {
      const index = rngRef.current.nextInt(0, goneTiles.length - 1);
      const tile = goneTiles[index];
      
      if (!tile) continue;
      
      // Rebuild animation
      tile.state = 'rebuilding';
      tile.rebuildTime = Date.now();
      
      const levelColor = LEVEL_COLORS[tile.level];
      const material = tile.mesh.material as THREE.MeshStandardMaterial;
      
      // Flash green for rebuilding
      material.color.setHex(0x00ff00);
      material.emissive.setHex(0x00ff00);
      material.emissiveIntensity = 0.8;
      material.transparent = true;
      material.opacity = 0;
      
      // Reset position
      const { x, z } = hexToWorld(tile.q, tile.r, HEX_SIZE);
      tile.mesh.position.set(x, tile.level * LEVEL_HEIGHT, z);
      tile.mesh.rotation.set(0, 0, 0);
      
      sceneRef.current?.add(tile.mesh);
      
      // Animate rebuild
      const startTime = Date.now();
      const animateRebuild = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 500, 1);
        
        material.opacity = progress;
        
        if (progress < 1) {
          requestAnimationFrame(animateRebuild);
        } else {
          tile.state = 'solid';
          tile.stepTime = null;
          material.transparent = false;
          material.opacity = 1;
          material.color.setHex(levelColor.solid);
          material.emissive.setHex(levelColor.solid);
          material.emissiveIntensity = 0.15;
          
          // Add floating indicator
          if (cameraRef.current) {
            const vector = tile.mesh.position.clone();
            vector.project(cameraRef.current);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
            addFloatingScore(0, x, y, true);
          }
        }
      };
      
      animateRebuild();
      
      // Remove from gone list
      goneTiles.splice(index, 1);
    }
    
    // Update tiles remaining
    const remaining = tilesRef.current.filter(t => t.state !== 'gone').length;
    setTilesRemaining(remaining);
  }, [addFloatingScore]);

  // Shoot ball
  const shootBall = useCallback(() => {
    const player = localPlayerRef.current;
    if (!player || !sceneRef.current || player.balls <= 0) return;
    
    player.balls--;
    setBallsLeft(player.balls);
    
    // Calculate direction from player to mouse
    const direction = new THREE.Vector3(mouseRef.current.x, 0, mouseRef.current.y);
    direction.sub(player.position);
    direction.y = 0;
    direction.normalize();
    
    // Create ball
    const ballMesh = createBallMesh(player.id);
    const startPos = player.position.clone();
    startPos.y += 0.3;
    ballMesh.position.copy(startPos);
    sceneRef.current.add(ballMesh);
    
    const ball: Ball = {
      id: `ball-${Date.now()}-${Math.random()}`,
      mesh: ballMesh,
      position: startPos.clone(),
      velocity: direction.multiplyScalar(BALL_SPEED),
      ownerId: player.id,
      bounces: 0,
      lifetime: BALL_LIFETIME
    };
    
    ballsRef.current.push(ball);
    
    // Score for shooting
    scoreRef.current += 5;
    setScore(scoreRef.current);
  }, [createBallMesh]);

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 20, 60);
    sceneRef.current = scene;
    
    // Camera - angled view for multi-level
    const camera = new THREE.PerspectiveCamera(
      55,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      150
    );
    camera.position.set(0, 25, 20);
    camera.lookAt(0, NUM_LEVELS * LEVEL_HEIGHT / 2, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(15, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 80;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);
    
    // Point lights for each level
    for (let i = 0; i < NUM_LEVELS; i++) {
      const levelColor = LEVEL_COLORS[i];
      const pointLight = new THREE.PointLight(levelColor.solid, 0.5, 25);
      pointLight.position.set(
        Math.cos(i * Math.PI / 2) * 8,
        i * LEVEL_HEIGHT + 3,
        Math.sin(i * Math.PI / 2) * 8
      );
      scene.add(pointLight);
    }
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Build arena
    tilesRef.current = buildArena(scene);
    setTilesRemaining(tilesRef.current.length);
    
    // Aim line
    const aimGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -5)
    ]);
    const aimMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.5 
    });
    const aimLine = new THREE.Line(aimGeometry, aimMaterial);
    aimLine.visible = false;
    scene.add(aimLine);
    aimLineRef.current = aimLine;
    
    return { scene, camera, renderer };
  }, [getThemeColors, buildArena]);

  // Create players
  const createPlayers = useCallback((numPlayers: number) => {
    if (!sceneRef.current) return;
    
    const players: Player[] = [];
    const startPositions = [
      { x: 0, z: -3 },
      { x: 0, z: 3 },
      { x: -3, z: 0 },
      { x: 3, z: 0 }
    ];
    
    for (let i = 0; i < numPlayers; i++) {
      const isLocal = i === 0;
      const mesh = createPlayerMesh(i, isLocal);
      const startPos = startPositions[i];
      
      mesh.position.set(startPos.x, 0.7, startPos.z);
      sceneRef.current.add(mesh);
      
      const player: Player = {
        id: isLocal ? (user?.id || 'local') : `bot-${i}`,
        mesh,
        position: new THREE.Vector3(startPos.x, 0.7, startPos.z),
        velocity: new THREE.Vector3(0, 0, 0),
        level: 0,
        isJumping: false,
        jumpVelocity: 0,
        color: PLAYER_COLORS[i],
        balls: 3,
        isLocal,
        isAlive: true,
        score: 0
      };
      
      players.push(player);
      
      if (isLocal) {
        localPlayerRef.current = player;
      }
    }
    
    playersRef.current = players;
    setPlayersAlive(numPlayers);
    setBallsLeft(3);
  }, [createPlayerMesh, user]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const player = localPlayerRef.current;
    if (!player) return;
    
    // Calculate bonuses
    const survivalBonus = Math.floor(timeAlive) * 5;
    const comboBonus = maxCombo * 20;
    const coverageBonus = Math.floor((tilesVisitedRef.current / tilesRef.current.length) * 500);
    const levelBonus = currentLevel * 100;
    
    const finalScore = scoreRef.current + survivalBonus + comboBonus + coverageBonus + levelBonus;
    setScore(finalScore);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'hex-arena',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            timeAlive,
            tilesVisited: tilesVisitedRef.current,
            totalTiles: tilesRef.current.length,
            maxCombo,
            maxLevel: currentLevel,
            gameMode,
            playerCount,
            theme
          }
        });
        
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'hex-arena',
            action: 'game_complete',
            score: finalScore,
            metadata: {
              timeAlive,
              tilesVisited: tilesVisitedRef.current,
              maxCombo,
              maxLevel: currentLevel,
              gameMode,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, timeAlive, maxCombo, currentLevel, gameMode, playerCount, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const delta = clockRef.current.getDelta();
    
    // Update local player
    const player = localPlayerRef.current;
    if (player && player.isAlive) {
      // Movement
      let dx = 0, dz = 0;
      
      if (keysRef.current.has('ArrowUp') || keysRef.current.has('w') || keysRef.current.has('W')) {
        dz -= moveSpeedRef.current;
      }
      if (keysRef.current.has('ArrowDown') || keysRef.current.has('s') || keysRef.current.has('S')) {
        dz += moveSpeedRef.current;
      }
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a') || keysRef.current.has('A')) {
        dx -= moveSpeedRef.current;
      }
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('d') || keysRef.current.has('D')) {
        dx += moveSpeedRef.current;
      }
      
      // Apply movement
      player.position.x += dx;
      player.position.z += dz;
      
      // Jumping physics
      if (player.isJumping) {
        player.jumpVelocity -= GRAVITY;
        player.position.y += player.jumpVelocity;
        
        // Check for landing
        const tile = findTileBelow(player.position.x, player.position.z, NUM_LEVELS - 1);
        const groundLevel = tile ? tile.level * LEVEL_HEIGHT + 0.7 : -10;
        
        if (player.position.y <= groundLevel) {
          player.position.y = groundLevel;
          player.isJumping = false;
          player.jumpVelocity = 0;
          
          if (tile) {
            player.level = tile.level;
            setCurrentLevel(tile.level);
            stepOnTile(tile, player);
          }
        }
      } else {
        // Check if standing on valid tile
        const tile = findTileAtPosition(player.position.x, player.position.z, player.level);
        
        if (!tile || tile.state === 'falling' || tile.state === 'gone') {
          // Check for tile below
          const tileBelow = findTileBelow(player.position.x, player.position.z, player.level - 1);
          
          if (tileBelow) {
            // Fall to lower level
            player.isJumping = true;
            player.jumpVelocity = 0;
          } else {
            // Player fell off!
            player.isAlive = false;
            setPlayersAlive(prev => prev - 1);
            endGame();
            return;
          }
        } else {
          // Normal ground movement
          player.position.y = player.level * LEVEL_HEIGHT + 0.7 + Math.sin(Date.now() * 0.005) * 0.03;
          stepOnTile(tile, player);
        }
      }
      
      // Boundary check
      const maxDist = (ARENA_RADIUS + 1) * HEX_SIZE * 1.5;
      const dist = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
      if (dist > maxDist) {
        const angle = Math.atan2(player.position.z, player.position.x);
        player.position.x = Math.cos(angle) * maxDist;
        player.position.z = Math.sin(angle) * maxDist;
      }
      
      // Update mesh
      player.mesh.position.copy(player.position);
      
      // Update aim line
      if (aimLineRef.current && player.balls > 0) {
        aimLineRef.current.visible = true;
        aimLineRef.current.position.copy(player.position);
        
        const direction = new THREE.Vector3(mouseRef.current.x, 0, mouseRef.current.y);
        direction.sub(player.position);
        direction.normalize();
        
        const angle = Math.atan2(direction.x, direction.z);
        aimLineRef.current.rotation.y = angle;
      } else if (aimLineRef.current) {
        aimLineRef.current.visible = false;
      }
    }
    
    // Update AI players (simple behavior)
    playersRef.current.forEach(p => {
      if (p.isLocal || !p.isAlive) return;
      
      // Simple AI: move randomly, avoid edges
      if (Math.random() < 0.02) {
        p.velocity.x = (Math.random() - 0.5) * moveSpeedRef.current;
        p.velocity.z = (Math.random() - 0.5) * moveSpeedRef.current;
      }
      
      p.position.x += p.velocity.x;
      p.position.z += p.velocity.z;
      
      // Keep within bounds
      const dist = Math.sqrt(p.position.x ** 2 + p.position.z ** 2);
      if (dist > ARENA_RADIUS * HEX_SIZE) {
        p.velocity.x *= -0.5;
        p.velocity.z *= -0.5;
      }
      
      p.mesh.position.copy(p.position);
      
      // Check if on valid tile
      const tile = findTileAtPosition(p.position.x, p.position.z, p.level);
      if (!tile && !p.isJumping) {
        const tileBelow = findTileBelow(p.position.x, p.position.z, p.level - 1);
        if (!tileBelow) {
          p.isAlive = false;
          sceneRef.current?.remove(p.mesh);
          setPlayersAlive(prev => Math.max(0, prev - 1));
        }
      }
    });
    
    // Update balls
    ballsRef.current = ballsRef.current.filter(ball => {
      ball.lifetime -= delta * 1000;
      
      if (ball.lifetime <= 0) {
        sceneRef.current?.remove(ball.mesh);
        return false;
      }
      
      // Move ball
      ball.position.add(ball.velocity);
      ball.mesh.position.copy(ball.position);
      
      // Bounce off arena edges
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
      
      // Check collision with players
      playersRef.current.forEach(p => {
        if (p.id === ball.ownerId || !p.isAlive) return;
        
        const dx = ball.position.x - p.position.x;
        const dy = ball.position.y - p.position.y;
        const dz = ball.position.z - p.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 0.6) {
          // Hit! Knockback
          p.velocity.x += ball.velocity.x * 2;
          p.velocity.z += ball.velocity.z * 2;
          
          // Score for hit
          const shooter = playersRef.current.find(pl => pl.id === ball.ownerId);
          if (shooter) {
            shooter.score += 100;
            if (shooter.isLocal) {
              scoreRef.current += 100;
              setScore(scoreRef.current);
              
              if (cameraRef.current) {
                const vector = p.mesh.position.clone();
                vector.project(cameraRef.current);
                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
                addFloatingScore(100, x, y, true);
              }
            }
          }
          
          sceneRef.current?.remove(ball.mesh);
          return false;
        }
      });
      
      return true;
    });
    
    // Update falling tiles
    tilesRef.current.forEach(tile => {
      if (tile.state === 'falling') {
        tile.fallSpeed += 0.004;
        tile.mesh.position.y -= tile.fallSpeed;
        tile.mesh.rotation.x += 0.015;
        tile.mesh.rotation.z += 0.01;
        
        const material = tile.mesh.material as THREE.MeshStandardMaterial;
        material.opacity = Math.max(0, 1 - Math.abs(tile.mesh.position.y - tile.level * LEVEL_HEIGHT) / 8);
        material.transparent = true;
        
        if (tile.mesh.position.y < -15) {
          tile.state = 'gone';
          sceneRef.current?.remove(tile.mesh);
          
          const remaining = tilesRef.current.filter(t => t.state !== 'gone').length;
          setTilesRemaining(remaining);
        }
      }
    });
    
    // Rebuild tiles periodically
    rebuildTimerRef.current += delta * 1000;
    if (rebuildTimerRef.current - lastRebuildRef.current > TILE_REBUILD_INTERVAL) {
      lastRebuildRef.current = rebuildTimerRef.current;
      rebuildRandomTiles();
    }
    
    // Check win condition
    const alivePlayers = playersRef.current.filter(p => p.isAlive);
    if (gameMode === 'multiplayer' && alivePlayers.length <= 1) {
      if (alivePlayers.length === 1 && alivePlayers[0].isLocal) {
        scoreRef.current += 500; // Win bonus
        setScore(scoreRef.current);
      }
      endGame();
      return;
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [findTileAtPosition, findTileBelow, stepOnTile, rebuildRandomTiles, addFloatingScore, gameMode, endGame]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeAlive(prev => prev + 0.1);
    }, 100);
    
    return () => clearInterval(timer);
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      
      // Jump
      if ((e.key === ' ' || e.key === 'Space') && localPlayerRef.current && !localPlayerRef.current.isJumping) {
        localPlayerRef.current.isJumping = true;
        localPlayerRef.current.jumpVelocity = JUMP_FORCE;
      }
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
      
      // Raycast to ground plane
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      
      if (target) {
        mouseRef.current = { x: target.x, y: target.z };
      }
    };
    
    const handleClick = () => {
      if (gameActiveRef.current) {
        shootBall();
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [shootBall]);

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
      const dx = (touch.clientX - touchStartPos.x) * 0.01;
      const dz = (touch.clientY - touchStartPos.y) * 0.01;
      
      localPlayerRef.current.position.x += dx;
      localPlayerRef.current.position.z += dz;
      
      touchStartPos = { x: touch.clientX, y: touch.clientY };
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      // Double tap to jump
      if (e.changedTouches.length === 1 && localPlayerRef.current && !localPlayerRef.current.isJumping) {
        localPlayerRef.current.isJumping = true;
        localPlayerRef.current.jumpVelocity = JUMP_FORCE;
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
  }, [gameState]);

  // Start game
  const startGame = useCallback((mode: 'solo' | 'multiplayer', numPlayers: number = 1) => {
    setGameMode(mode);
    setPlayerCount(numPlayers);
    setGameState('playing');
    setScore(0);
    setTimeAlive(0);
    setTilesVisited(0);
    setMaxCombo(0);
    setCurrentCombo(0);
    setCurrentLevel(0);
    
    scoreRef.current = 0;
    comboRef.current = 0;
    tilesVisitedRef.current = 0;
    rebuildTimerRef.current = 0;
    lastRebuildRef.current = 0;
    
    // Reset tiles
    if (sceneRef.current) {
      tilesRef.current.forEach(tile => {
        sceneRef.current?.remove(tile.mesh);
      });
      
      // Clear old players
      playersRef.current.forEach(p => {
        sceneRef.current?.remove(p.mesh);
      });
      
      // Clear balls
      ballsRef.current.forEach(b => {
        sceneRef.current?.remove(b.mesh);
      });
      ballsRef.current = [];
      
      // Rebuild arena
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      rngRef.current = new SeededRandom(seed);
      
      tilesRef.current = buildArena(sceneRef.current);
      setTilesRemaining(tilesRef.current.length);
      
      // Create players
      createPlayers(numPlayers);
    }
    
    clockRef.current.start();
    gameActiveRef.current = true;
    
    // Start game loop
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/hex-arena-halloween.mp3' 
      : theme === 'christmas' 
        ? '/hex-arena-christmas.mp3' 
        : '/hex-arena.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [buildArena, createPlayers, gameLoop, theme]);

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

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Game Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score & Combo */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold text-cyan-400">
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
              {currentCombo > 0 && (
                <div className={`mt-1 font-bold ${currentCombo >= 10 ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                  {currentCombo}x COMBO
                </div>
              )}
            </div>
            
            {/* Center: Time & Level */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-3xl font-mono font-bold text-white">
                {timeAlive.toFixed(1)}s
              </div>
              <div className="text-xs text-gray-400">ALIVE</div>
              <div className="mt-1 text-sm font-bold" style={{ color: `#${LEVEL_COLORS[currentLevel]?.solid.toString(16).padStart(6, '0')}` }}>
                LEVEL {currentLevel + 1}
              </div>
            </div>
            
            {/* Right: Stats */}
            <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{tilesRemaining}</div>
              <div className="text-xs text-gray-400">Tiles Left</div>
              <div className="flex items-center gap-1 mt-1 justify-end">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < ballsLeft ? 'bg-purple-500' : 'bg-gray-600'}`}
                  />
                ))}
                <span className="text-xs text-gray-400 ml-1">BALLS</span>
              </div>
              {gameMode === 'multiplayer' && (
                <div className="text-sm text-green-400 mt-1">
                  {playersAlive} alive
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden sm:inline">WASD/Arrows: Move • Space: Jump • Click: Shoot</span>
              <span className="sm:hidden">Drag: Move • Double-tap: Jump</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Level indicators */}
      {gameState === 'playing' && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex flex-col gap-2">
            {LEVEL_COLORS.map((level, i) => (
              <div 
                key={i}
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold text-sm ${
                  i === currentLevel ? 'border-white scale-110' : 'border-white/30 opacity-50'
                }`}
                style={{ backgroundColor: `#${level.solid.toString(16).padStart(6, '0')}` }}
              >
                {i + 1}
              </div>
            ))}
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
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-lg w-full">
            <h1 className="text-3xl font-bold text-cyan-400 mb-4 text-center">
              ⬡ HexArena
            </h1>
            
            <div className="text-sm text-gray-400 text-center mb-4">
              Multi-Level Survival Battle
            </div>
            
            <div className="space-y-3 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">🏃</span>
                <div>
                  <div className="font-bold text-white">Survive the Arena</div>
                  <div className="text-sm">Tiles collapse after you step on them! Keep moving!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">⬆️</span>
                <div>
                  <div className="font-bold text-white">4 Levels</div>
                  <div className="text-sm">Jump between levels - higher floors = more points!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">🔮</span>
                <div>
                  <div className="font-bold text-white">Shoot Balls</div>
                  <div className="text-sm">3 balls per game - knock opponents off (multiplayer)!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <div className="font-bold text-white">Tiles Rebuild</div>
                  <div className="text-sm">Random tiles respawn - jump to new paths!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-xl">🎮</span>
                <div>
                  <div className="font-bold text-white">Controls</div>
                  <div className="text-sm">WASD/Arrows: Move • Space: Jump • Click: Shoot</div>
                </div>
              </div>
            </div>
            
            {/* Game Mode Selection */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => startGame('solo', 1)}
                className="py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all transform hover:scale-105"
              >
                <div className="text-xl">🎮</div>
                <div>SOLO</div>
                <div className="text-xs opacity-75">Survive alone</div>
              </button>
              
              <button
                onClick={() => startGame('multiplayer', 4)}
                className="py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105"
              >
                <div className="text-xl">👥</div>
                <div>4 PLAYER</div>
                <div className="text-xs opacity-75">vs AI Bots</div>
              </button>
            </div>
            
            <div className="text-xs text-center text-gray-500">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
            </div>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {playersAlive === 1 && localPlayerRef.current?.isAlive ? '🏆 VICTORY!' : '💀 Game Over'}
            </h2>
            
            <div className="text-5xl font-bold text-cyan-400 my-6">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Time Alive</div>
                <div className="text-2xl font-bold text-white">{timeAlive.toFixed(1)}s</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Tiles Visited</div>
                <div className="text-2xl font-bold text-white">{tilesVisited}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Max Combo</div>
                <div className="text-2xl font-bold text-yellow-400">{maxCombo}x</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Max Level</div>
                <div className="text-2xl font-bold" style={{ color: `#${LEVEL_COLORS[currentLevel]?.solid.toString(16).padStart(6, '0')}` }}>
                  {currentLevel + 1}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => startGame(gameMode, playerCount)}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
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
