'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// HEXARENA - 3D Tactical Skill Game
// ============================================================================
// Core Mechanic: Small 3D arena made of hex tiles
// Tiles collapse after stepping on them
// Players move in real time - survive as long as possible!
// Modes: Solo endurance, Ghost race (compete against replays)
// ============================================================================

interface HexArenaGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface HexTile {
  mesh: THREE.Mesh;
  q: number; // hex coordinate
  r: number; // hex coordinate
  state: 'solid' | 'warning' | 'falling' | 'gone';
  stepTime: number | null;
  fallSpeed: number;
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

export default function HexArenaGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: HexArenaGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [timeAlive, setTimeAlive] = useState(0);
  const [tilesVisited, setTilesVisited] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [tilesRemaining, setTilesRemaining] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  
  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerRef = useRef<THREE.Mesh | null>(null);
  const tilesRef = useRef<HexTile[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const tilesVisitedRef = useRef(0);
  const playerPosRef = useRef({ q: 0, r: 0 });
  const targetPosRef = useRef({ x: 0, z: 0 });
  const currentTileRef = useRef<HexTile | null>(null);
  const lastTileRef = useRef<HexTile | null>(null);
  const rngRef = useRef<SeededRandom | null>(null);
  const floatingScoreIdRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const moveSpeedRef = useRef(0.15);
  
  // Constants
  const HEX_SIZE = 1.2;
  const ARENA_RADIUS = 5; // Number of hex rings
  const TILE_COLLAPSE_DELAY = 800; // ms before tile starts falling
  const TILE_WARNING_TIME = 400; // ms of warning before collapse
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x0a0015,
          tileSolid: 0x4a1a6b,
          tileWarning: 0xff6600,
          tileFalling: 0xff0000,
          player: 0x00ff88,
          playerGlow: 0x00ffaa,
          ambient: 0x6b3fa0,
          accent: 0xff6600
        };
      case 'christmas':
        return {
          background: 0x001122,
          tileSolid: 0x1e5631,
          tileWarning: 0xffd700,
          tileFalling: 0xff0000,
          player: 0xffffff,
          playerGlow: 0x87ceeb,
          ambient: 0x87ceeb,
          accent: 0xff0000
        };
      default:
        return {
          background: 0x050515,
          tileSolid: 0x2a2a5a,
          tileWarning: 0xffaa00,
          tileFalling: 0xff3333,
          player: 0x00ffff,
          playerGlow: 0x00ccff,
          ambient: 0x6c5ce7,
          accent: 0xff00ff
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

  // Create hex tile
  const createHexTile = useCallback((q: number, r: number, scene: THREE.Scene): HexTile => {
    const colors = getThemeColors();
    
    const shape = createHexShape(HEX_SIZE * 0.95);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2
    });
    
    // Rotate to lay flat
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({
      color: colors.tileSolid,
      metalness: 0.3,
      roughness: 0.6,
      emissive: colors.tileSolid,
      emissiveIntensity: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const { x, z } = hexToWorld(q, r, HEX_SIZE);
    mesh.position.set(x, 0, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store hex coords in userData
    mesh.userData = { q, r };
    
    scene.add(mesh);
    
    return {
      mesh,
      q,
      r,
      state: 'solid',
      stepTime: null,
      fallSpeed: 0
    };
  }, [getThemeColors]);

  // Build arena
  const buildArena = useCallback((scene: THREE.Scene) => {
    const tiles: HexTile[] = [];
    
    // Create hexagonal grid
    for (let q = -ARENA_RADIUS; q <= ARENA_RADIUS; q++) {
      for (let r = -ARENA_RADIUS; r <= ARENA_RADIUS; r++) {
        // Skip tiles outside hexagonal bounds
        if (Math.abs(q + r) > ARENA_RADIUS) continue;
        
        const tile = createHexTile(q, r, scene);
        tiles.push(tile);
      }
    }
    
    return tiles;
  }, [createHexTile]);

  // Find tile at hex coordinates
  const findTile = useCallback((q: number, r: number): HexTile | undefined => {
    return tilesRef.current.find(t => t.q === q && t.r === r && t.state !== 'gone');
  }, []);

  // Get nearest valid tile from world position
  const worldToHex = useCallback((x: number, z: number): { q: number; r: number } => {
    const q = (2/3 * x) / HEX_SIZE;
    const r = (-1/3 * x + Math.sqrt(3)/3 * z) / HEX_SIZE;
    
    // Round to nearest hex
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

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 15, 40);
    sceneRef.current = scene;
    
    // Camera - isometric view
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 18, 12);
    camera.lookAt(0, 0, 0);
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
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    
    // Accent lights
    const pointLight1 = new THREE.PointLight(colors.accent, 0.8, 30);
    pointLight1.position.set(-10, 8, -10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(colors.playerGlow, 0.8, 30);
    pointLight2.position.set(10, 8, 10);
    scene.add(pointLight2);
    
    // Build arena
    tilesRef.current = buildArena(scene);
    setTilesRemaining(tilesRef.current.length);
    
    // Create player
    const playerGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const playerMaterial = new THREE.MeshStandardMaterial({
      color: colors.player,
      emissive: colors.playerGlow,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.7, 0);
    player.castShadow = true;
    scene.add(player);
    playerRef.current = player;
    
    // Player glow
    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.playerGlow,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    player.add(glow);
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Set initial player position
    playerPosRef.current = { q: 0, r: 0 };
    targetPosRef.current = { x: 0, z: 0 };
    
    return { scene, camera, renderer };
  }, [getThemeColors, buildArena]);

  // Handle player stepping on tile
  const stepOnTile = useCallback((tile: HexTile) => {
    if (tile.state !== 'solid' || tile === lastTileRef.current) return;
    
    const colors = getThemeColors();
    
    // Mark tile as stepped
    tile.stepTime = Date.now();
    lastTileRef.current = currentTileRef.current;
    currentTileRef.current = tile;
    
    // Increment visited count
    tilesVisitedRef.current++;
    setTilesVisited(tilesVisitedRef.current);
    
    // Score for visiting tile
    const basePoints = 10;
    comboRef.current++;
    setCurrentCombo(comboRef.current);
    
    if (comboRef.current > maxCombo) {
      setMaxCombo(comboRef.current);
    }
    
    const comboBonus = Math.floor(comboRef.current / 5) * 25;
    const points = basePoints + comboBonus;
    
    scoreRef.current += points;
    setScore(scoreRef.current);
    
    // Floating score at player position
    if (rendererRef.current && cameraRef.current && playerRef.current) {
      const vector = playerRef.current.position.clone();
      vector.project(cameraRef.current);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
      addFloatingScore(points, x, y, comboRef.current >= 10);
    }
    
    // Start warning timer
    setTimeout(() => {
      if (tile.state === 'solid') {
        tile.state = 'warning';
        const material = tile.mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(colors.tileWarning);
        material.emissive.setHex(colors.tileWarning);
        material.emissiveIntensity = 0.4;
      }
    }, TILE_COLLAPSE_DELAY - TILE_WARNING_TIME);
    
    // Start collapse timer
    setTimeout(() => {
      if (tile.state !== 'gone') {
        tile.state = 'falling';
        tile.fallSpeed = 0.01;
        const material = tile.mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(colors.tileFalling);
        material.emissive.setHex(colors.tileFalling);
        material.emissiveIntensity = 0.6;
      }
    }, TILE_COLLAPSE_DELAY);
  }, [getThemeColors, maxCombo, addFloatingScore]);

  // Check if player is on a valid tile
  const checkPlayerPosition = useCallback(() => {
    if (!playerRef.current) return true;
    
    const playerPos = playerRef.current.position;
    const { q, r } = worldToHex(playerPos.x, playerPos.z);
    const tile = findTile(q, r);
    
    if (!tile || tile.state === 'falling' || tile.state === 'gone') {
      // Check if player is within tile bounds
      const { x, z } = hexToWorld(q, r, HEX_SIZE);
      const dist = Math.sqrt((playerPos.x - x) ** 2 + (playerPos.z - z) ** 2);
      
      if (dist < HEX_SIZE * 0.7) {
        return false; // Player fell!
      }
    }
    
    if (tile && tile.state === 'solid') {
      stepOnTile(tile);
    }
    
    return true;
  }, [worldToHex, findTile, stepOnTile]);

  // End game
  const endGame = useCallback(async () => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Calculate bonuses
    const survivalBonus = Math.floor(timeAlive) * 5;
    const comboBonus = maxCombo * 20;
    const coverageBonus = Math.floor((tilesVisitedRef.current / tilesRef.current.length) * 500);
    
    const finalScore = scoreRef.current + survivalBonus + comboBonus + coverageBonus;
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
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, timeAlive, maxCombo, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    const colors = getThemeColors();
    
    // Handle player movement
    if (playerRef.current) {
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
      if (dx !== 0 || dz !== 0) {
        playerRef.current.position.x += dx;
        playerRef.current.position.z += dz;
        
        // Check boundaries
        const maxDist = ARENA_RADIUS * HEX_SIZE * 1.5;
        const dist = Math.sqrt(playerRef.current.position.x ** 2 + playerRef.current.position.z ** 2);
        if (dist > maxDist) {
          const angle = Math.atan2(playerRef.current.position.z, playerRef.current.position.x);
          playerRef.current.position.x = Math.cos(angle) * maxDist;
          playerRef.current.position.z = Math.sin(angle) * maxDist;
        }
      }
      
      // Bob animation
      playerRef.current.position.y = 0.7 + Math.sin(Date.now() * 0.005) * 0.05;
      
      // Check position
      if (!checkPlayerPosition()) {
        endGame();
        return;
      }
    }
    
    // Update falling tiles
    tilesRef.current.forEach(tile => {
      if (tile.state === 'falling') {
        tile.fallSpeed += 0.005; // Accelerate
        tile.mesh.position.y -= tile.fallSpeed;
        tile.mesh.rotation.x += 0.02;
        tile.mesh.rotation.z += 0.01;
        
        // Fade out
        const material = tile.mesh.material as THREE.MeshStandardMaterial;
        material.opacity = Math.max(0, 1 - Math.abs(tile.mesh.position.y) / 5);
        material.transparent = true;
        
        if (tile.mesh.position.y < -10) {
          tile.state = 'gone';
          if (sceneRef.current) {
            sceneRef.current.remove(tile.mesh);
          }
          
          // Update remaining count
          const remaining = tilesRef.current.filter(t => t.state !== 'gone').length;
          setTilesRemaining(remaining);
          
          // Bonus for tile collapse
          if (remaining < 20) {
            // Endgame bonus
            const bonus = 50;
            scoreRef.current += bonus;
            setScore(scoreRef.current);
          }
        }
      }
    });
    
    // Check if all tiles are gone
    const remaining = tilesRef.current.filter(t => t.state !== 'gone' && t.state !== 'falling').length;
    if (remaining === 0) {
      // Victory bonus!
      scoreRef.current += 1000;
      setScore(scoreRef.current);
      endGame();
      return;
    }
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [getThemeColors, checkPlayerPosition, endGame]);

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

  // Touch controls
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!gameActiveRef.current || !playerRef.current || !containerRef.current) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = (touch.clientX - centerX) / rect.width;
    const dz = (touch.clientY - centerY) / rect.height;
    
    // Move towards touch direction
    playerRef.current.position.x += dx * moveSpeedRef.current * 2;
    playerRef.current.position.z += dz * moveSpeedRef.current * 2;
  }, []);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeAlive(0);
    setTilesVisited(0);
    setMaxCombo(0);
    setCurrentCombo(0);
    
    scoreRef.current = 0;
    comboRef.current = 0;
    tilesVisitedRef.current = 0;
    lastTileRef.current = null;
    currentTileRef.current = null;
    
    // Reset tiles
    if (sceneRef.current) {
      tilesRef.current.forEach(tile => {
        sceneRef.current?.remove(tile.mesh);
      });
      tilesRef.current = buildArena(sceneRef.current);
      setTilesRemaining(tilesRef.current.length);
    }
    
    // Reset player position
    if (playerRef.current) {
      playerRef.current.position.set(0, 0.7, 0);
    }
    playerPosRef.current = { q: 0, r: 0 };
    
    // Initialize RNG
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
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
  }, [buildArena, gameLoop, theme]);

  // Touch events
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState, handleTouchMove]);

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

  const colors = getThemeColors();

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Game Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score & Combo */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
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
            
            {/* Center: Time */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-3xl font-mono font-bold text-white">
                {timeAlive.toFixed(1)}s
              </div>
              <div className="text-xs text-gray-400">ALIVE</div>
            </div>
            
            {/* Right: Tiles */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">{tilesRemaining}</div>
              <div className="text-xs text-gray-400">Tiles Left</div>
              <div className="text-sm text-purple-400 mt-1">
                {tilesVisited} visited
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Controls Guide */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
            <div className="text-xs text-gray-400 text-center">
              <span className="hidden sm:inline">WASD or Arrow Keys to move</span>
              <span className="sm:hidden">Touch & drag to move</span>
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
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h1 className="text-3xl font-bold text-cyan-400 mb-4">
              ⬡ HexArena
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏃</span>
                <div>
                  <div className="font-bold text-white">Keep Moving!</div>
                  <div className="text-sm">Tiles collapse shortly after you step on them!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-bold text-white">Build Combos</div>
                  <div className="text-sm">Visit tiles quickly for combo multipliers!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-white">Watch for Warnings</div>
                  <div className="text-sm">Orange tiles are about to fall - move away!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎮</span>
                <div>
                  <div className="font-bold text-white">Controls</div>
                  <div className="text-sm">WASD / Arrow Keys or Touch & Drag</div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-xl text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              ENTER ARENA
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Arena Cleared!</h2>
            
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
                <div className="text-gray-400 text-sm">Coverage</div>
                <div className="text-2xl font-bold text-purple-400">
                  {tilesRef.current.length > 0 
                    ? Math.round((tilesVisited / tilesRef.current.length) * 100) 
                    : 0}%
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={startGame}
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

