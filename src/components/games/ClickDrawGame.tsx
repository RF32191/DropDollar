'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';
import GameThemeSelector from './GameThemeSelector';
import { GameTheme, getSavedTheme } from '@/lib/gameThemes';

type ClickDrawTheme = 'standard' | 'halloween' | 'christmas';

interface ClickDrawGameProps {
  onGameEnd?: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onGameComplete?: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  isCompetitionMode?: boolean;
  rngSeed?: number;
  theme?: ClickDrawTheme;
  listingId?: string;
  entryNumber?: number;
}

// Seeded RNG
class Mulberry32 {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Game duration in seconds
const GAME_DURATION = 60;
const MAX_BULLETS = 6;

interface Outlaw {
  id: number;
  side: 'left' | 'right' | 'center' | 'far-left' | 'far-right';
  phase: 'idle' | 'windup' | 'drawing' | 'recovery' | 'stunned' | 'dying';
  attackTimer: number;
  gunAngle: number;
  mesh: THREE.Group | null;
  nextAttackIn: number;
  health: number; // 3 hits to kill normally
  hitFlashTime: number;
}

interface Bullet {
  id: number;
  mesh: THREE.Mesh;
  targetOutlaw: Outlaw;
  progress: number; // 0 to 1
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
}

export default function ClickDrawGame({ onGameEnd, onGameComplete, onExit, gameMode = 'practice', isCompetitionMode, rngSeed, theme: initialTheme, listingId, entryNumber }: ClickDrawGameProps) {
  // Support both onGameEnd (from games page) and onGameComplete (legacy)
  const handleGameComplete = onGameEnd || onGameComplete || (() => {});
  const [currentTheme, setCurrentTheme] = useState<ClickDrawTheme>(() => (initialTheme || getSavedTheme()) as ClickDrawTheme);
  const currentThemeRef = useRef(currentTheme);
  
  useEffect(() => {
    currentThemeRef.current = currentTheme;
  }, [currentTheme]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerGunRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const snowflakesRef = useRef<THREE.Points | null>(null);
  const initializedRef = useRef(false);
  
  // Music ref
  const musicRef = useRef<HTMLAudioElement | null>(null);
  
  // Game state refs
  const outlawsRef = useRef<Outlaw[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const scoreRef = useRef<number>(0);
  const heartsRef = useRef<number>(3);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const perfectDrawsRef = useRef<number>(0);
  const totalDrawsRef = useRef<number>(0);
  const totalShotsRef = useRef<number>(0);
  const outlawsKilledRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const isDrawingRef = useRef<boolean>(false);
  const isDodgingRef = useRef<boolean>(false);
  const totalDodgesRef = useRef<number>(0);
  const drawWindowRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'playing' | 'complete'>('ready');
  const gameStartTimeRef = useRef<number>(0);
  const nextOutlawIdRef = useRef<number>(1);
  const spawnCooldownRef = useRef<number>(0);
  const endGameRef = useRef<() => void>(() => {});
  const bulletsRemainingRef = useRef<number>(MAX_BULLETS);
  const nextBulletIdRef = useRef<number>(1);
  
  // Callbacks ref
  const onGameCompleteRef = useRef(handleGameComplete);
  const gameModeRef = useRef(isCompetitionMode ? 'competition' : gameMode);
  const rngSeedRef = useRef(rngSeed);
  
  // Floating scores - CoD style popups
  const { popups: scorePopups, addPopup: addScorePopup, removePopup: removeScorePopup } = useFloatingScores();
  
  // State
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [endReason, setEndReason] = useState<'timeout' | 'dead' | null>(null);
  const [bullets, setBullets] = useState(MAX_BULLETS);
  
  useEffect(() => {
    onGameCompleteRef.current = handleGameComplete;
    gameModeRef.current = isCompetitionMode ? 'competition' : gameMode;
    rngSeedRef.current = rngSeed;
  }, [handleGameComplete, gameMode, isCompetitionMode, rngSeed]);
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('🤠 [ClickDraw] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const seededRngRef = useRef(seededRng);
  useEffect(() => {
    seededRngRef.current = seededRng;
  }, [seededRng]);
  
  // Get outlaw position based on side
  const getOutlawPosition = useCallback((side: Outlaw['side']): { x: number; z: number } => {
    switch (side) {
      case 'far-left': return { x: -5, z: -5 };
      case 'left': return { x: -3, z: -4 };
      case 'center': return { x: 0, z: -5 };
      case 'right': return { x: 3, z: -4 };
      case 'far-right': return { x: 5, z: -5 };
      default: return { x: 0, z: -4 };
    }
  }, []);
  
  // Create gun - REVOLVER for player, RIFLE for enemies
  const createGun = useCallback((isEnemy: boolean = false) => {
    const group = new THREE.Group();
    
    if (isEnemy) {
      // === ENEMY RIFLE - Long Western lever-action rifle ===
      const metalMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        emissive: 0x000000,
        shininess: 120,
        specular: 0x666666,
      });
      
      const woodMat = new THREE.MeshPhongMaterial({
        color: 0x5a3a2a,
        emissive: 0x1a0a00,
        shininess: 30,
      });
      
      // Long rifle barrel
      const barrelGeo = new THREE.CylinderGeometry(0.035, 0.04, 1.8, 16);
      const barrel = new THREE.Mesh(barrelGeo, metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.9;
      barrel.name = 'barrel';
      group.add(barrel);
      
      // Muzzle flash suppressor
      const muzzleGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.15, 16);
      const muzzle = new THREE.Mesh(muzzleGeo, metalMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.z = 1.85;
      group.add(muzzle);
      
      // Front sight
      const sightGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
      const sight = new THREE.Mesh(sightGeo, metalMat);
      sight.position.set(0, 0.06, 1.7);
      group.add(sight);
      
      // Receiver (action housing)
      const receiverGeo = new THREE.BoxGeometry(0.12, 0.14, 0.4);
      const receiver = new THREE.Mesh(receiverGeo, metalMat);
      receiver.position.set(0, -0.02, 0.1);
      group.add(receiver);
      
      // Lever
      const leverGeo = new THREE.BoxGeometry(0.08, 0.15, 0.04);
      const lever = new THREE.Mesh(leverGeo, metalMat);
      lever.position.set(0, -0.12, 0.05);
      lever.rotation.x = 0.3;
      group.add(lever);
      
      // Magazine tube (under barrel)
      const magGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12);
      const mag = new THREE.Mesh(magGeo, metalMat);
      mag.rotation.x = Math.PI / 2;
      mag.position.set(0, -0.06, 0.6);
      group.add(mag);
      
      // Wooden stock
      const stockGeo = new THREE.BoxGeometry(0.1, 0.12, 0.6);
      const stock = new THREE.Mesh(stockGeo, woodMat);
      stock.position.set(0, -0.04, -0.35);
      group.add(stock);
      
      // Stock butt (curved)
      const buttGeo = new THREE.BoxGeometry(0.1, 0.18, 0.15);
      const butt = new THREE.Mesh(buttGeo, woodMat);
      butt.position.set(0, -0.06, -0.7);
      butt.rotation.x = -0.2;
      group.add(butt);
      
      // Wooden forearm (handguard)
      const forearmGeo = new THREE.BoxGeometry(0.08, 0.08, 0.5);
      const forearm = new THREE.Mesh(forearmGeo, woodMat);
      forearm.position.set(0, -0.08, 0.5);
      group.add(forearm);
      
      // Trigger
      const triggerGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
      const trigger = new THREE.Mesh(triggerGeo, metalMat);
      trigger.position.set(0, -0.1, 0.0);
      group.add(trigger);
      
      // Trigger guard
      const guardGeo = new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI);
      const guard = new THREE.Mesh(guardGeo, metalMat);
      guard.position.set(0, -0.08, 0.0);
      guard.rotation.x = Math.PI / 2;
      group.add(guard);
      
      // === INTENSE GLOW EFFECTS for rifle ===
      // Large glowing orb at muzzle
      const glowSphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const glowSphereMat = new THREE.MeshBasicMaterial({
        color: 0x00AAFF,
        transparent: true,
        opacity: 0,
      });
      const glowSphere = new THREE.Mesh(glowSphereGeo, glowSphereMat);
      glowSphere.position.z = 1.9;
      glowSphere.name = 'glowSphere';
      group.add(glowSphere);
      
      // Glow ring at barrel end
      const glowGeo = new THREE.RingGeometry(0.08, 0.18, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00AAFF,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.z = 1.9;
      glow.name = 'glow';
      group.add(glow);
      
      // Secondary inner glow
      const innerGlowGeo = new THREE.RingGeometry(0.04, 0.1, 24);
      const innerGlowMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
      innerGlow.position.z = 1.92;
      innerGlow.name = 'innerGlow';
      group.add(innerGlow);
      
      // Barrel glow (runs along barrel when charging)
      const barrelGlowGeo = new THREE.CylinderGeometry(0.05, 0.055, 1.8, 16);
      const barrelGlowMat = new THREE.MeshBasicMaterial({
        color: 0x00AAFF,
        transparent: true,
        opacity: 0,
      });
      const barrelGlow = new THREE.Mesh(barrelGlowGeo, barrelGlowMat);
      barrelGlow.rotation.x = Math.PI / 2;
      barrelGlow.position.z = 0.9;
      barrelGlow.name = 'barrelGlow';
      group.add(barrelGlow);
      
    } else {
      // === PLAYER REVOLVER - Classic Western style ===
      const barrelMat = new THREE.MeshPhongMaterial({
        color: 0x666666,
        emissive: 0x222222,
        shininess: 150,
        specular: 0xffffff,
      });
      
      // Gun barrel
      const barrelGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 16);
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.5;
      barrel.name = 'barrel';
      group.add(barrel);
      
      // Barrel tip (muzzle)
      const muzzleGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.1, 16);
      const muzzle = new THREE.Mesh(muzzleGeo, barrelMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.z = 1.0;
      group.add(muzzle);
      
      // Cylinder (revolver chamber)
      const cylinderGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.18, 16);
      const cylinderMat = new THREE.MeshPhongMaterial({
        color: 0x444444,
        shininess: 100,
        specular: 0x888888,
      });
      const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
      cylinder.rotation.x = Math.PI / 2;
      cylinder.position.z = 0.15;
      group.add(cylinder);
      
      // Bullet holes on cylinder
      for (let i = 0; i < 6; i++) {
        const holeGeo = new THREE.CircleGeometry(0.02, 8);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        const angle = (i / 6) * Math.PI * 2;
        hole.position.set(Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, 0.25);
        group.add(hole);
      }
      
      // Frame/body
      const frameGeo = new THREE.BoxGeometry(0.12, 0.15, 0.25);
      const frameMat = new THREE.MeshPhongMaterial({
        color: 0x555555,
        shininess: 80,
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, -0.05, 0.05);
      group.add(frame);
      
      // Hammer
      const hammerGeo = new THREE.BoxGeometry(0.04, 0.08, 0.06);
      const hammer = new THREE.Mesh(hammerGeo, barrelMat);
      hammer.position.set(0, 0.05, -0.05);
      hammer.rotation.x = -0.3;
      group.add(hammer);
      
      // Handle - ornate wooden grip
      const handleGeo = new THREE.BoxGeometry(0.1, 0.3, 0.14);
      const handleMat = new THREE.MeshPhongMaterial({
        color: 0x8B4513,
        emissive: 0x3A1A05,
        shininess: 40,
      });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.y = -0.22;
      handle.rotation.x = -0.4;
      group.add(handle);
      
      // Handle grip lines
      for (let i = 0; i < 4; i++) {
        const lineGeo = new THREE.BoxGeometry(0.11, 0.015, 0.01);
        const lineMat = new THREE.MeshPhongMaterial({ color: 0x2a1a0a });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(0, -0.15 - i * 0.05, 0.08);
        line.rotation.x = -0.4;
        group.add(line);
      }
      
      // Trigger guard - gold accent
      const guardGeo = new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI);
      const guardMat = new THREE.MeshPhongMaterial({ 
        color: 0xDAA520, 
        shininess: 100,
        specular: 0xffffff,
      });
      const guard = new THREE.Mesh(guardGeo, guardMat);
      guard.position.set(0, -0.08, 0.08);
      guard.rotation.x = Math.PI / 2;
      group.add(guard);
      
      // Trigger
      const triggerGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
      const trigger = new THREE.Mesh(triggerGeo, barrelMat);
      trigger.position.set(0, -0.1, 0.08);
      group.add(trigger);
    }
    
    return group;
  }, []);
  
  // Create cowboy outlaw - THEME AWARE
  const createOutlaw = useCallback((side: Outlaw['side']) => {
    const group = new THREE.Group();
    const theme = currentThemeRef.current;
    
    if (theme === 'halloween') {
      // === HALLOWEEN SKELETON ===
      const boneMat = new THREE.MeshPhongMaterial({
        color: 0xE8E8D0,
        emissive: 0x2a2a20,
        emissiveIntensity: 0.3,
      });
      
      // Skeleton body (ribcage)
      const ribcageGeo = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
      const ribcage = new THREE.Mesh(ribcageGeo, boneMat);
      ribcage.position.y = 0.6;
      ribcage.name = 'body';
      group.add(ribcage);
      
      // Individual ribs
      for (let i = 0; i < 5; i++) {
        const ribGeo = new THREE.TorusGeometry(0.25, 0.03, 8, 16, Math.PI);
        const rib = new THREE.Mesh(ribGeo, boneMat);
        rib.position.set(0, 0.3 + i * 0.15, 0.1);
        rib.rotation.x = Math.PI / 2;
        group.add(rib);
      }
      
      // Spine
      for (let i = 0; i < 8; i++) {
        const vertebraGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
        const vertebra = new THREE.Mesh(vertebraGeo, boneMat);
        vertebra.position.set(0, 0.1 + i * 0.12, -0.1);
        group.add(vertebra);
      }
      
      // Skull
      const skullGeo = new THREE.SphereGeometry(0.28, 16, 16);
      const skull = new THREE.Mesh(skullGeo, boneMat);
      skull.position.y = 1.5;
      skull.scale.set(1, 1.1, 0.9);
      skull.name = 'head';
      group.add(skull);
      
      // Jaw
      const jawGeo = new THREE.BoxGeometry(0.2, 0.08, 0.15);
      const jaw = new THREE.Mesh(jawGeo, boneMat);
      jaw.position.set(0, 1.28, 0.1);
      group.add(jaw);
      
      // Eye sockets (dark holes)
      const socketMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const socketGeo = new THREE.CircleGeometry(0.08, 12);
      const leftSocket = new THREE.Mesh(socketGeo, socketMat);
      leftSocket.position.set(-0.1, 1.55, 0.25);
      group.add(leftSocket);
      const rightSocket = new THREE.Mesh(socketGeo, socketMat);
      rightSocket.position.set(0.1, 1.55, 0.25);
      group.add(rightSocket);
      
      // Glowing red eyes inside sockets
      const glowEyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
      const glowEyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const leftGlowEye = new THREE.Mesh(glowEyeGeo, glowEyeMat);
      leftGlowEye.position.set(-0.1, 1.55, 0.22);
      group.add(leftGlowEye);
      const rightGlowEye = new THREE.Mesh(glowEyeGeo, glowEyeMat);
      rightGlowEye.position.set(0.1, 1.55, 0.22);
      group.add(rightGlowEye);
      
      // Cowboy hat on skeleton
      const hatMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, emissive: 0x0a0a0a });
      const brimGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.06, 24);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.y = 1.8;
      group.add(brim);
      const crownGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.3, 16);
      const crown = new THREE.Mesh(crownGeo, hatMat);
      crown.position.y = 1.95;
      group.add(crown);
      
    } else if (theme === 'christmas') {
      // === CHRISTMAS COWBOY with Santa Hat ===
      const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xCC0000, // Red Christmas outfit
        emissive: 0x330000,
        emissiveIntensity: 0.3,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      body.name = 'body';
      group.add(body);
      
      // White fur trim on outfit
      const trimMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, emissive: 0x888888 });
      const trimGeo = new THREE.TorusGeometry(0.42, 0.06, 8, 24);
      const trim1 = new THREE.Mesh(trimGeo, trimMat);
      trim1.position.y = 0.2;
      trim1.rotation.x = Math.PI / 2;
      group.add(trim1);
      const trim2 = new THREE.Mesh(trimGeo, trimMat);
      trim2.position.y = 1.1;
      trim2.rotation.x = Math.PI / 2;
      group.add(trim2);
      
      // Head
      const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const headMat = new THREE.MeshPhongMaterial({ color: 0xd4a574, emissive: 0x3a2a1a });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.5;
      head.name = 'head';
      group.add(head);
      
      // SANTA HAT
      const santaHatMat = new THREE.MeshPhongMaterial({ color: 0xCC0000, emissive: 0x330000 });
      const hatBaseGeo = new THREE.ConeGeometry(0.35, 0.6, 16);
      const hatBase = new THREE.Mesh(hatBaseGeo, santaHatMat);
      hatBase.position.y = 1.9;
      hatBase.rotation.z = 0.3;
      group.add(hatBase);
      
      // White fur brim
      const furBrimGeo = new THREE.TorusGeometry(0.28, 0.08, 8, 24);
      const furBrim = new THREE.Mesh(furBrimGeo, trimMat);
      furBrim.position.y = 1.68;
      furBrim.rotation.x = Math.PI / 2;
      group.add(furBrim);
      
      // Pompom
      const pompomGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const pompom = new THREE.Mesh(pompomGeo, trimMat);
      pompom.position.set(0.15, 2.15, 0);
      group.add(pompom);
      
      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.08, 1.55, 0.2);
      group.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.08, 1.55, 0.2);
      group.add(rightEye);
      
      // White beard
      const beardMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
      const beardGeo = new THREE.SphereGeometry(0.2, 12, 12);
      const beard = new THREE.Mesh(beardGeo, beardMat);
      beard.position.set(0, 1.35, 0.15);
      beard.scale.set(1.2, 1.5, 0.6);
      group.add(beard);
      
    } else {
      // === STANDARD COWBOY ===
      const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
      const bodyMat = new THREE.MeshPhongMaterial({
        color: 0x4a3728,
        emissive: 0x1a1008,
        emissiveIntensity: 0.3,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.6;
      body.name = 'body';
      group.add(body);
      
      const vestGeo = new THREE.BoxGeometry(0.7, 0.8, 0.4);
      const vestMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, emissive: 0x0a0a0a });
      const vest = new THREE.Mesh(vestGeo, vestMat);
      vest.position.y = 0.7;
      group.add(vest);
      
      const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const headMat = new THREE.MeshPhongMaterial({ color: 0xd4a574, emissive: 0x3a2a1a });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.5;
      head.name = 'head';
      group.add(head);
      
      // Cowboy hat
      const hatMat = new THREE.MeshPhongMaterial({ color: 0x3d2817, emissive: 0x1a0a05, shininess: 30 });
      const brimGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.06, 24);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.y = 1.75;
      group.add(brim);
      const crownGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.3, 16);
      const crown = new THREE.Mesh(crownGeo, hatMat);
      crown.position.y = 1.9;
      group.add(crown);
      const indentGeo = new THREE.BoxGeometry(0.35, 0.05, 0.15);
      const indent = new THREE.Mesh(indentGeo, hatMat);
      indent.position.y = 2.05;
      group.add(indent);
      const bandGeo = new THREE.TorusGeometry(0.24, 0.02, 8, 24);
      const bandMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 1.78;
      band.rotation.x = Math.PI / 2;
      group.add(band);
      
      // Bandana
      const scarfGeo = new THREE.BoxGeometry(0.5, 0.15, 0.3);
      const scarfMat = new THREE.MeshPhongMaterial({ color: 0x8B0000 });
      const scarf = new THREE.Mesh(scarfGeo, scarfMat);
      scarf.position.y = 1.2;
      scarf.position.z = 0.1;
      group.add(scarf);
      
      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.08, 1.55, 0.2);
      group.add(leftEye);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.08, 1.55, 0.2);
      group.add(rightEye);
      
      // Mustache
      const stacheGeo = new THREE.BoxGeometry(0.2, 0.04, 0.05);
      const stacheMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
      const stache = new THREE.Mesh(stacheGeo, stacheMat);
      stache.position.set(0, 1.42, 0.22);
      group.add(stache);
    }
    
    // Gun in holster (will be raised when attacking) - ALL THEMES
    const gun = createGun(true);
    gun.position.set(0.5, 0.3, 0);
    gun.rotation.z = -Math.PI / 4;
    gun.name = 'gun';
    group.add(gun);
    
    // Position based on side
    const pos = getOutlawPosition(side);
    group.position.set(pos.x, 0, pos.z);
    group.lookAt(0, 1, 5);
    
    return group;
  }, [createGun, getOutlawPosition]);
  
  // Spawn new outlaw
  const spawnOutlaw = useCallback(() => {
    if (!sceneRef.current) return;
    
    const rng = seededRngRef.current;
    const sides: Outlaw['side'][] = ['left', 'right', 'center', 'far-left', 'far-right'];
    
    // Filter out sides with existing outlaws
    const occupiedSides = outlawsRef.current.filter(o => o.phase !== 'dying').map(o => o.side);
    const availableSides = sides.filter(s => !occupiedSides.includes(s));
    
    if (availableSides.length === 0) return;
    
    const side = availableSides[Math.floor(rng.next() * availableSides.length)];
    const mesh = createOutlaw(side);
    sceneRef.current.add(mesh);
    
    const outlaw: Outlaw = {
      id: nextOutlawIdRef.current++,
      side,
      phase: 'idle',
      attackTimer: 0,
      gunAngle: 0,
      mesh,
      nextAttackIn: 1.5 + rng.next() * 2,
      health: 3,
      hitFlashTime: 0,
    };
    
    outlawsRef.current.push(outlaw);
  }, [createOutlaw]);
  
  // Add popup score - wrapper for CoD style floating scores
  const addPopup = useCallback((points: number, x: number, y: number, type: 'perfect' | 'bonus' | 'kill' | 'critical' | 'normal' | 'combo', label?: string) => {
    // Map 'kill' to 'critical' for display
    const displayType = type === 'kill' ? 'critical' : type;
    addScorePopup(points, x, y, displayType as 'normal' | 'bonus' | 'perfect' | 'combo' | 'critical', label);
  }, [addScorePopup]);
  
  // Create bullet animation - must be defined before handleDraw
  const createBulletAnimation = useCallback((targetOutlaw: Outlaw) => {
    if (!sceneRef.current || !playerGunRef.current) return;
    
    const bulletGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ 
      color: 0xffcc00,
    });
    const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
    
    // Start from player gun
    const startPos = new THREE.Vector3(0, 0.8, 3);
    
    // End at outlaw
    const outlawPos = getOutlawPosition(targetOutlaw.side);
    const endPos = new THREE.Vector3(outlawPos.x, 1.2, outlawPos.z);
    
    bulletMesh.position.copy(startPos);
    sceneRef.current.add(bulletMesh);
    
    const bullet: Bullet = {
      id: nextBulletIdRef.current++,
      mesh: bulletMesh,
      targetOutlaw,
      progress: 0,
      startPos,
      endPos,
    };
    
    bulletsRef.current.push(bullet);
  }, [getOutlawPosition]);
  
  // Handle DRAW action - KILLS ALL DRAWING ENEMIES!
  const handleDraw = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isDrawingRef.current) return;
    if (bulletsRemainingRef.current <= 0) return;
    
    isDrawingRef.current = true;
    drawWindowRef.current = 0.3; // 300ms draw window
    lastActionTimeRef.current = gameTimeRef.current;
    
    // Find ALL enemies in the "drawing" phase (about to shoot) - KILL THEM ALL!
    const drawingOutlaws = outlawsRef.current.filter(o => o.phase === 'drawing' && o.health > 0);
    
    if (drawingOutlaws.length > 0) {
      totalDrawsRef.current++;
      totalShotsRef.current++;
      bulletsRemainingRef.current--;
      setBullets(bulletsRemainingRef.current);
      
      // Check timing for perfect draw (based on first enemy)
      const isPerfect = drawingOutlaws[0].attackTimer < 0.15;
      
      // Kill ALL drawing outlaws!
      let totalPoints = 0;
      drawingOutlaws.forEach((outlaw, index) => {
        outlaw.phase = 'dying';
        outlaw.health = 0;
        outlawsKilledRef.current++;
        createBulletAnimation(outlaw);
        
        // Add delay for multiple bullet animations
        if (index > 0) {
          setTimeout(() => createBulletAnimation(outlaw), index * 100);
        }
      });
      
      if (isPerfect) {
        // PERFECT DRAW - 1000 points per kill + combo bonus!
        perfectDrawsRef.current++;
        comboRef.current += drawingOutlaws.length;
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        
        totalPoints = (1000 * drawingOutlaws.length) + (comboRef.current * 50);
        scoreRef.current += totalPoints;
        setScore(scoreRef.current);
        
        if (drawingOutlaws.length > 1) {
          addPopup(totalPoints, 50, 30, 'perfect', `⚡ PERFECT MULTI-DRAW x${drawingOutlaws.length}! +${totalPoints}`);
        } else {
          addPopup(totalPoints, 50, 30, 'perfect', `⚡ PERFECT DRAW! +${totalPoints}`);
        }
        
        // Give heart back for perfect draw (max 3)
        if (heartsRef.current < 3) {
          heartsRef.current++;
          setHearts(heartsRef.current);
          addPopup(0, 50, 45, 'bonus', '❤️ +1 HEART!');
        }
        
      } else {
        // Normal DRAW - 1000 points per kill
        comboRef.current += drawingOutlaws.length;
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        
        totalPoints = 1000 * drawingOutlaws.length;
        scoreRef.current += totalPoints;
        setScore(scoreRef.current);
        
        if (drawingOutlaws.length > 1) {
          addPopup(totalPoints, 50, 30, 'bonus', `🔫 MULTI-DRAW x${drawingOutlaws.length}! +${totalPoints}`);
        } else {
          addPopup(totalPoints, 50, 30, 'bonus', `🔫 DRAW! +${totalPoints}`);
        }
      }
    } else {
      // SPAM PENALTY - No enemy was in "drawing" phase, user is spamming!
      // Check if ANY enemy is at least winding up
      const windupOutlaw = outlawsRef.current.find(o => o.phase === 'windup' && o.health > 0);
      
      if (windupOutlaw) {
        // At least someone is winding up - shoot at them (regular hit)
        totalShotsRef.current++;
        bulletsRemainingRef.current--;
        setBullets(bulletsRemainingRef.current);
        
        windupOutlaw.health--;
        windupOutlaw.hitFlashTime = 0.2;
        windupOutlaw.phase = 'stunned';
        windupOutlaw.attackTimer = 0;
        
        const points = 50;
        scoreRef.current += points;
        setScore(scoreRef.current);
        addPopup(points, 50, 35, 'kill', `💥 HIT! +${points}`);
        
        createBulletAnimation(windupOutlaw);
        
        if (windupOutlaw.health <= 0) {
          windupOutlaw.phase = 'dying';
          outlawsKilledRef.current++;
          const killPoints = 50;
          scoreRef.current += killPoints;
          setScore(scoreRef.current);
          addPopup(killPoints, 50, 40, 'kill', `☠️ KILLED! +${killPoints}`);
        }
      } else {
        // NO ONE is drawing or winding up - SPAM PENALTY!
        // Bullet misses and player loses points
        totalShotsRef.current++;
        bulletsRemainingRef.current--;
        setBullets(bulletsRemainingRef.current);
        
        // Reset combo for spamming
        comboRef.current = 0;
        setCombo(0);
        
        // Deduct 25 points
        scoreRef.current = Math.max(0, scoreRef.current - 25);
        setScore(scoreRef.current);
        addPopup(-25, 50, 35, 'kill', `❌ MISS! -25 (wait for glow!)`);
        
        // Create a miss animation (bullet goes to random spot)
        const missPos = new THREE.Vector3(
          (seededRngRef.current.next() - 0.5) * 6,
          seededRngRef.current.next() * 3 + 1,
          -5
        );
        
        // Create miss bullet (fades quickly)
        if (sceneRef.current) {
          const bulletGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const bulletMat = new THREE.MeshBasicMaterial({ color: 0xFFCC00 });
          const bullet = new THREE.Mesh(bulletGeo, bulletMat);
          bullet.position.set(0, 1.5, 3);
          sceneRef.current.add(bullet);
          
          // Animate miss
          let progress = 0;
          const startPos = bullet.position.clone();
          const animateMiss = () => {
            progress += 0.1;
            if (progress >= 1) {
              if (sceneRef.current) sceneRef.current.remove(bullet);
              return;
            }
            bullet.position.lerpVectors(startPos, missPos, progress);
            bullet.scale.setScalar(1 - progress * 0.5);
            requestAnimationFrame(animateMiss);
          };
          animateMiss();
        }
      }
    }
    
    setTimeout(() => {
      isDrawingRef.current = false;
    }, 100);
  }, [addPopup, createBulletAnimation]);
  
  // Handle SHOOT action (regular shot without draw timing)
  const handleShoot = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (bulletsRemainingRef.current <= 0) return;
    
    // Find closest non-dying enemy
    const targetOutlaw = outlawsRef.current.find(o => o.phase !== 'dying' && o.health > 0);
    if (!targetOutlaw) return;
    
    totalShotsRef.current++;
    bulletsRemainingRef.current--;
    setBullets(bulletsRemainingRef.current);
    
    targetOutlaw.health--;
    targetOutlaw.hitFlashTime = 0.2;
    
    if (targetOutlaw.phase !== 'drawing') {
      targetOutlaw.phase = 'stunned';
      targetOutlaw.attackTimer = 0;
    }
    
    const points = 50;
    scoreRef.current += points;
    setScore(scoreRef.current);
    addPopup(points, 50, 35, 'kill', `💥 SHOT! +${points}`);
    
    createBulletAnimation(targetOutlaw);
    
    if (targetOutlaw.health <= 0) {
      targetOutlaw.phase = 'dying';
      outlawsKilledRef.current++;
      const killPoints = 50;
      scoreRef.current += killPoints;
      setScore(scoreRef.current);
      addPopup(killPoints, 50, 40, 'kill', `☠️ KILLED! +${killPoints}`);
      
      // Heart for kills (max 3)
      if (heartsRef.current < 3) {
        heartsRef.current++;
        setHearts(heartsRef.current);
      }
    }
  }, [addPopup, createBulletAnimation]);
  
  // Handle RELOAD
  const handleReload = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    bulletsRemainingRef.current = MAX_BULLETS;
    setBullets(MAX_BULLETS);
    addPopup(0, 50, 25, 'bonus', '🔄 RELOADED!');
  }, [addPopup]);
  
  // Handle DODGE action - dodge incoming attacks
  const handleDodge = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (isDodgingRef.current) return;
    
    isDodgingRef.current = true;
    
    // Check if any outlaw is currently attacking (in drawing phase)
    const attackingOutlaws = outlawsRef.current.filter(o => o.phase === 'drawing');
    
    if (attackingOutlaws.length > 0) {
      // Successfully dodged attacks!
      totalDodgesRef.current++;
      const dodgePoints = 200 * attackingOutlaws.length;
      scoreRef.current += dodgePoints;
      setScore(scoreRef.current);
      addPopup(dodgePoints, 50, 35, 'bonus', `🏃 DODGE! +${dodgePoints}`);
      
      // Reset attacking outlaws
      attackingOutlaws.forEach(outlaw => {
        outlaw.phase = 'recovery';
        outlaw.attackTimer = 0;
      });
      
      comboRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      setCombo(comboRef.current);
    } else {
      // Dodged when no attack - small penalty
      addPopup(0, 50, 35, 'kill', '🏃 DODGE (no attack)');
    }
    
    // Dodge cooldown
    setTimeout(() => {
      isDodgingRef.current = false;
    }, 300);
  }, [addPopup]);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // If scene exists, dispose it first (for theme changes)
    if (sceneRef.current && rendererRef.current) {
      rendererRef.current.dispose();
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      playerGunRef.current = null;
      outlawsRef.current = [];
      initializedRef.current = false;
    }
    
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene - THEME AWARE
    const scene = new THREE.Scene();
    const theme = currentThemeRef.current;
    
    if (theme === 'halloween') {
      // HALLOWEEN - Dark spooky night
      scene.background = new THREE.Color(0x0a0a1a);
      scene.fog = new THREE.Fog(0x1a1a2a, 5, 30);
    } else if (theme === 'christmas') {
      // CHRISTMAS - Snowy winter night
      scene.background = new THREE.Color(0x1a2a3a);
      scene.fog = new THREE.Fog(0x2a3a4a, 8, 35);
    } else {
      // STANDARD - Western desert sunset
      scene.background = new THREE.Color(0xd4a574);
      scene.fog = new THREE.Fog(0xc4a070, 10, 40);
    }
    sceneRef.current = scene;
    
    // Camera - zoom out more for mobile
    const isMobileDevice = window.innerWidth < 768;
    const fov = isMobileDevice ? 90 : 60;
    const camZ = isMobileDevice ? 12 : 5;
    const camY = isMobileDevice ? 4 : 2;
    const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, 1, -3);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting - THEME AWARE
    if (theme === 'halloween') {
      const ambientLight = new THREE.AmbientLight(0x4444aa, 0.4);
      scene.add(ambientLight);
      const moonLight = new THREE.DirectionalLight(0x8888ff, 0.8);
      moonLight.position.set(-5, 10, 5);
      scene.add(moonLight);
      
      // Full moon
      const moonGeo = new THREE.CircleGeometry(2, 32);
      const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(8, 12, -20);
      scene.add(moon);
      
      // Moon glow
      const moonGlowGeo = new THREE.CircleGeometry(3, 32);
      const moonGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.3 });
      const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
      moonGlow.position.set(8, 12, -21);
      scene.add(moonGlow);
      
    } else if (theme === 'christmas') {
      const ambientLight = new THREE.AmbientLight(0x6688aa, 0.5);
      scene.add(ambientLight);
      const moonLight = new THREE.DirectionalLight(0xaabbff, 1.0);
      moonLight.position.set(5, 10, 5);
      scene.add(moonLight);
      
      // Snowflakes
      const snowGeo = new THREE.BufferGeometry();
      const snowCount = 200;
      const snowPositions = new Float32Array(snowCount * 3);
      for (let i = 0; i < snowCount; i++) {
        snowPositions[i * 3] = (Math.random() - 0.5) * 40;
        snowPositions[i * 3 + 1] = Math.random() * 20;
        snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
      }
      snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
      const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 });
      const snow = new THREE.Points(snowGeo, snowMat);
      snow.name = 'snowflakes';
      scene.add(snow);
      snowflakesRef.current = snow;
      
    } else {
      const ambientLight = new THREE.AmbientLight(0xffa366, 0.6);
      scene.add(ambientLight);
      const sunLight = new THREE.DirectionalLight(0xff8844, 1.5);
      sunLight.position.set(5, 10, 5);
      sunLight.castShadow = true;
      scene.add(sunLight);
      const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
      backLight.position.set(-5, 3, -5);
      scene.add(backLight);
    }
    
    // Ground - THEME AWARE
    const groundGeo = new THREE.CircleGeometry(20, 32);
    let groundColor = 0xc4a060;
    let groundEmissive = 0x3a2a10;
    if (theme === 'halloween') {
      groundColor = 0x2a2a1a;
      groundEmissive = 0x0a0a05;
    } else if (theme === 'christmas') {
      groundColor = 0xeeeeee; // Snow
      groundEmissive = 0x888888;
    }
    const groundMat = new THREE.MeshPhongMaterial({ color: groundColor, emissive: groundEmissive });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // === HALLOWEEN DECORATIONS ===
    if (theme === 'halloween') {
      // Tombstones
      const tombMat = new THREE.MeshPhongMaterial({ color: 0x555555, emissive: 0x111111 });
      const tombPositions = [[-6, -4], [-3, -3], [3, -3.5], [6, -4], [0, -5]];
      tombPositions.forEach(([x, z]) => {
        const tombGeo = new THREE.BoxGeometry(0.8, 1.2, 0.2);
        const tomb = new THREE.Mesh(tombGeo, tombMat);
        tomb.position.set(x, 0.6, z);
        scene.add(tomb);
        // Curved top
        const topGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16, 1, false, 0, Math.PI);
        const top = new THREE.Mesh(topGeo, tombMat);
        top.position.set(x, 1.2, z);
        top.rotation.z = Math.PI / 2;
        top.rotation.y = Math.PI / 2;
        scene.add(top);
      });
    }
    
    // === CHRISTMAS DECORATIONS ===
    if (theme === 'christmas') {
      // Christmas trees
      const treeMat = new THREE.MeshPhongMaterial({ color: 0x0a5a0a, emissive: 0x021a02 });
      const treePositions = [[-7, -5], [7, -5], [-5, -8], [5, -8]];
      treePositions.forEach(([x, z]) => {
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8);
        const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4a2a1a });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 0.25, z);
        scene.add(trunk);
        // Tree layers
        for (let i = 0; i < 3; i++) {
          const coneGeo = new THREE.ConeGeometry(1.2 - i * 0.3, 1.5, 12);
          const cone = new THREE.Mesh(coneGeo, treeMat);
          cone.position.set(x, 1 + i * 0.8, z);
          scene.add(cone);
        }
        // Star on top
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const starGeo = new THREE.OctahedronGeometry(0.15, 0);
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(x, 3.5, z);
        scene.add(star);
        // Ornaments
        const ornColors = [0xff0000, 0x0000ff, 0xffff00, 0xff00ff];
        for (let i = 0; i < 6; i++) {
          const ornGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const ornMat = new THREE.MeshPhongMaterial({ color: ornColors[i % ornColors.length], emissive: ornColors[i % ornColors.length], emissiveIntensity: 0.3 });
          const orn = new THREE.Mesh(ornGeo, ornMat);
          const angle = (i / 6) * Math.PI * 2;
          orn.position.set(x + Math.cos(angle) * 0.6, 1.5 + (i % 3) * 0.5, z + Math.sin(angle) * 0.6);
          scene.add(orn);
        }
      });
      
      // String of Christmas lights on saloon
      const lightColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
      for (let i = 0; i < 15; i++) {
        const bulbGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ color: lightColors[i % lightColors.length] });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(-4 + i * 0.6, 5.5, -6);
        scene.add(bulb);
      }
    }
    
    // === MAIN SALOON - Big and prominent behind enemies ===
    const saloonGroup = new THREE.Group();
    
    // Main saloon building
    const saloonMat = new THREE.MeshPhongMaterial({
      color: 0x5a3828,
      emissive: 0x1a0a00,
    });
    const saloonGeo = new THREE.BoxGeometry(8, 5, 3);
    const saloonMain = new THREE.Mesh(saloonGeo, saloonMat);
    saloonMain.position.set(0, 2.5, -8);
    saloonGroup.add(saloonMain);
    
    // Saloon roof
    const roofGeo = new THREE.BoxGeometry(9, 0.3, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x3a2818 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 5.15, -8);
    saloonGroup.add(roof);
    
    // False front (western style)
    const frontGeo = new THREE.BoxGeometry(10, 2, 0.2);
    const front = new THREE.Mesh(frontGeo, saloonMat);
    front.position.set(0, 6, -6.4);
    saloonGroup.add(front);
    
    // "SALOON" sign
    const signBackGeo = new THREE.BoxGeometry(5, 1.2, 0.15);
    const signBackMat = new THREE.MeshPhongMaterial({ color: 0x8B0000, emissive: 0x3a0000 });
    const signBack = new THREE.Mesh(signBackGeo, signBackMat);
    signBack.position.set(0, 6.5, -6.2);
    saloonGroup.add(signBack);
    
    // Sign border gold
    const borderMat = new THREE.MeshPhongMaterial({ color: 0xDAA520, emissive: 0x5a4a00 });
    const borderTop = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.1, 0.2), borderMat);
    borderTop.position.set(0, 7.1, -6.15);
    saloonGroup.add(borderTop);
    const borderBot = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.1, 0.2), borderMat);
    borderBot.position.set(0, 5.9, -6.15);
    saloonGroup.add(borderBot);
    
    // Swinging doors
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x4a2a18 });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), doorMat);
    doorL.position.set(-0.7, 1, -6.3);
    saloonGroup.add(doorL);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), doorMat);
    doorR.position.set(0.7, 1, -6.3);
    saloonGroup.add(doorR);
    
    // Windows with light
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xFFCC66 });
    for (let i = -1; i <= 1; i += 2) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.1), windowMat);
      win.position.set(i * 2.5, 3, -6.35);
      saloonGroup.add(win);
      // Window frame
      const frameMat = new THREE.MeshPhongMaterial({ color: 0x2a1a0a });
      const frameH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.15), frameMat);
      frameH.position.set(i * 2.5, 3.6, -6.3);
      saloonGroup.add(frameH);
      const frameH2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.15), frameMat);
      frameH2.position.set(i * 2.5, 2.4, -6.3);
      saloonGroup.add(frameH2);
    }
    
    // Wooden porch
    const porchGeo = new THREE.BoxGeometry(10, 0.2, 2);
    const porchMat = new THREE.MeshPhongMaterial({ color: 0x5a4030 });
    const porch = new THREE.Mesh(porchGeo, porchMat);
    porch.position.set(0, 0.1, -5.5);
    saloonGroup.add(porch);
    
    // Porch pillars
    for (let i = -2; i <= 2; i++) {
      const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 3, 8);
      const pillar = new THREE.Mesh(pillarGeo, saloonMat);
      pillar.position.set(i * 2, 1.5, -4.6);
      saloonGroup.add(pillar);
    }
    
    // Porch roof
    const porchRoofGeo = new THREE.BoxGeometry(10, 0.15, 2.5);
    const porchRoof = new THREE.Mesh(porchRoofGeo, roofMat);
    porchRoof.position.set(0, 3, -5.2);
    saloonGroup.add(porchRoof);
    
    scene.add(saloonGroup);
    
    // Side buildings
    const buildingMat = new THREE.MeshPhongMaterial({
      color: 0x4a3020,
      emissive: 0x1a0a00,
    });
    
    // Sheriff office (left)
    const sheriffGeo = new THREE.BoxGeometry(3, 3.5, 2);
    const sheriff = new THREE.Mesh(sheriffGeo, buildingMat);
    sheriff.position.set(-7, 1.75, -7);
    scene.add(sheriff);
    
    // General store (right)
    const storeGeo = new THREE.BoxGeometry(3, 3, 2);
    const store = new THREE.Mesh(storeGeo, buildingMat);
    store.position.set(7, 1.5, -7);
    scene.add(store);
    
    // Cacti (fewer, positioned better)
    const cactusMat = new THREE.MeshPhongMaterial({ color: 0x228B22, emissive: 0x0a3a0a });
    const cactusPositions = [[-9, -3], [9, -3], [-6, -2], [6, -2]];
    cactusPositions.forEach(([x, z]) => {
      const cactusGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8);
      const cactus = new THREE.Mesh(cactusGeo, cactusMat);
      cactus.position.set(x, 0.75, z);
      scene.add(cactus);
      
      const armGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 8);
      const arm = new THREE.Mesh(armGeo, cactusMat);
      arm.position.set(0.2, 0.3, 0);
      arm.rotation.z = -Math.PI / 4;
      cactus.add(arm);
    });
    
    // Tumbleweeds
    const tweedMat = new THREE.MeshPhongMaterial({ color: 0x8B7355, wireframe: true });
    [[-4, -2], [5, -1]].forEach(([x, z]) => {
      const tweedGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const tweed = new THREE.Mesh(tweedGeo, tweedMat);
      tweed.position.set(x, 0.3, z);
      scene.add(tweed);
    });
    
    // Player gun (MORE VISIBLE - higher position, larger)
    const playerGun = createGun(false);
    playerGun.position.set(0, 1.2, 4);
    playerGun.rotation.x = -0.2;
    playerGun.scale.set(3.5, 3.5, 3.5);
    scene.add(playerGun);
    playerGunRef.current = playerGun;
    
    // Resize handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    let lastTime = 0;
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      
      // Update game time
      if (gameStateRef.current === 'playing') {
        gameTimeRef.current += deltaTime;
        const remaining = Math.max(0, GAME_DURATION - Math.floor(gameTimeRef.current));
        setTimeRemaining(remaining);
        
        // Check if time ran out
        if (remaining <= 0) {
          setEndReason('timeout');
          endGameRef.current();
          return;
        }
        
        // Spawn outlaws - MORE enemies, FASTER spawning!
        spawnCooldownRef.current -= deltaTime;
        
        const aliveOutlaws = outlawsRef.current.filter(o => o.phase !== 'dying').length;
        
        if (spawnCooldownRef.current <= 0) {
          if (gameTimeRef.current >= 1 && aliveOutlaws < 2) {
            spawnOutlaw();
            spawnCooldownRef.current = 1.5;
          } else if (gameTimeRef.current >= 8 && aliveOutlaws < 3) {
            spawnOutlaw();
            spawnCooldownRef.current = 1.2;
          } else if (gameTimeRef.current >= 15 && aliveOutlaws < 4) {
            spawnOutlaw();
            spawnCooldownRef.current = 1.0;
          } else if (gameTimeRef.current >= 25 && aliveOutlaws < 5) {
            spawnOutlaw();
            spawnCooldownRef.current = 0.8;
          } else if (gameTimeRef.current >= 40 && aliveOutlaws < 5) {
            // Faster spawning in late game
            spawnOutlaw();
            spawnCooldownRef.current = 0.6;
          }
        }
        
        // Limit simultaneous shooters to max 2
        const drawingOutlaws = outlawsRef.current.filter(o => o.phase === 'drawing');
        if (drawingOutlaws.length >= 2) {
          // Reset any outlaws trying to enter drawing phase
          outlawsRef.current.forEach(o => {
            if (o.phase === 'windup' && o.attackTimer >= 0.75) {
              // Keep them in windup longer
              o.attackTimer = 0.5;
            }
          });
        }
        
        // Update outlaws
        outlawsRef.current.forEach(outlaw => {
          if (outlaw.phase === 'dying') {
            // Fade out and remove
            if (outlaw.mesh) {
              outlaw.mesh.position.y -= deltaTime * 2;
              outlaw.mesh.traverse(child => {
                if (child instanceof THREE.Mesh && child.material) {
                  const mat = child.material as THREE.MeshPhongMaterial;
                  if (mat.opacity !== undefined) {
                    mat.transparent = true;
                    mat.opacity = Math.max(0, (mat.opacity ?? 1) - deltaTime * 2);
                  }
                }
              });
              
              if (outlaw.mesh.position.y < -2) {
                scene.remove(outlaw.mesh);
                outlaw.mesh = null;
              }
            }
            return;
          }
          
          // Hit flash
          if (outlaw.hitFlashTime > 0) {
            outlaw.hitFlashTime -= deltaTime;
            if (outlaw.mesh) {
              const body = outlaw.mesh.getObjectByName('body') as THREE.Mesh;
              if (body?.material) {
                (body.material as THREE.MeshPhongMaterial).emissive.setHex(
                  outlaw.hitFlashTime > 0 ? 0xff0000 : 0x1a1008
                );
              }
            }
          }
          
          // Stunned recovery
          if (outlaw.phase === 'stunned') {
            outlaw.attackTimer += deltaTime;
            if (outlaw.attackTimer > 0.5) {
              outlaw.phase = 'idle';
              outlaw.nextAttackIn = 1 + seededRngRef.current.next();
            }
            return;
          }
          
          // Attack pattern
          if (outlaw.phase === 'idle') {
            outlaw.nextAttackIn -= deltaTime;
            if (outlaw.nextAttackIn <= 0) {
              outlaw.phase = 'windup';
              outlaw.attackTimer = 0;
            }
          } else if (outlaw.phase === 'windup') {
            outlaw.attackTimer += deltaTime;
            
            // Raise rifle - INTENSE BLUE GLOW when winding up
            if (outlaw.mesh) {
              const gun = outlaw.mesh.getObjectByName('gun') as THREE.Group;
              if (gun) {
                const progress = Math.min(outlaw.attackTimer / 0.8, 1);
                gun.rotation.z = -Math.PI / 6 + progress * (Math.PI / 3);
                gun.position.y = 0.3 + progress * 0.4;
                
                // INTENSE BLUE glow on barrel - pulsing bright
                const barrel = gun.getObjectByName('barrel') as THREE.Mesh;
                if (barrel?.material) {
                  (barrel.material as THREE.MeshPhongMaterial).emissive.setHex(0x00CCFF);
                  (barrel.material as THREE.MeshPhongMaterial).emissiveIntensity = 2.0 + Math.sin(time / 60) * 1.0;
                }
                
                // Barrel glow effect (cylinder around barrel)
                const barrelGlow = gun.getObjectByName('barrelGlow') as THREE.Mesh;
                if (barrelGlow?.material) {
                  (barrelGlow.material as THREE.MeshBasicMaterial).color.setHex(0x00CCFF);
                  (barrelGlow.material as THREE.MeshBasicMaterial).opacity = 0.3 * progress + Math.sin(time / 50) * 0.15;
                }
                
                // Glow sphere at muzzle - pulsing blue orb
                const glowSphere = gun.getObjectByName('glowSphere') as THREE.Mesh;
                if (glowSphere?.material) {
                  (glowSphere.material as THREE.MeshBasicMaterial).color.setHex(0x00AAFF);
                  (glowSphere.material as THREE.MeshBasicMaterial).opacity = 0.5 * progress + Math.sin(time / 40) * 0.2;
                  glowSphere.scale.setScalar(1 + Math.sin(time / 30) * 0.2);
                }
                
                // Outer glow ring - bright cyan
                const glow = gun.getObjectByName('glow') as THREE.Mesh;
                if (glow?.material) {
                  (glow.material as THREE.MeshBasicMaterial).color.setHex(0x00FFFF);
                  (glow.material as THREE.MeshBasicMaterial).opacity = 0.7 * progress + Math.sin(time / 35) * 0.2;
                }
                
                // Inner white glow core
                const innerGlow = gun.getObjectByName('innerGlow') as THREE.Mesh;
                if (innerGlow?.material) {
                  (innerGlow.material as THREE.MeshBasicMaterial).opacity = 0.4 * progress + Math.sin(time / 25) * 0.15;
                }
              }
            }
            
            if (outlaw.attackTimer >= 0.8) {
              outlaw.phase = 'drawing';
              outlaw.attackTimer = 0;
            }
          } else if (outlaw.phase === 'drawing') {
            outlaw.attackTimer += deltaTime;
            
            // INTENSE RED GLOW when drawing (about to shoot) - DANGER!
            if (outlaw.mesh) {
              const gun = outlaw.mesh.getObjectByName('gun') as THREE.Group;
              if (gun) {
                const barrel = gun.getObjectByName('barrel') as THREE.Mesh;
                if (barrel?.material) {
                  (barrel.material as THREE.MeshPhongMaterial).emissive.setHex(0xFF0000);
                  (barrel.material as THREE.MeshPhongMaterial).emissiveIntensity = 3.5 + Math.sin(time / 20) * 1.5;
                }
                
                // Barrel glow - RED WARNING
                const barrelGlow = gun.getObjectByName('barrelGlow') as THREE.Mesh;
                if (barrelGlow?.material) {
                  (barrelGlow.material as THREE.MeshBasicMaterial).color.setHex(0xFF0000);
                  (barrelGlow.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(time / 15) * 0.3;
                }
                
                // Glow sphere - FLASHING RED
                const glowSphere = gun.getObjectByName('glowSphere') as THREE.Mesh;
                if (glowSphere?.material) {
                  (glowSphere.material as THREE.MeshBasicMaterial).color.setHex(0xFF0000);
                  (glowSphere.material as THREE.MeshBasicMaterial).opacity = 0.9 + Math.sin(time / 10) * 0.1;
                  glowSphere.scale.setScalar(1.3 + Math.sin(time / 15) * 0.3);
                }
                
                // Glow ring - BRIGHT RED FLASHING
                const glow = gun.getObjectByName('glow') as THREE.Mesh;
                if (glow?.material) {
                  (glow.material as THREE.MeshBasicMaterial).color.setHex(0xFF0000);
                  (glow.material as THREE.MeshBasicMaterial).opacity = 1.0;
                }
                
                // Inner glow - WHITE HOT CENTER
                const innerGlow = gun.getObjectByName('innerGlow') as THREE.Mesh;
                if (innerGlow?.material) {
                  (innerGlow.material as THREE.MeshBasicMaterial).color.setHex(0xFFAAAA);
                  (innerGlow.material as THREE.MeshBasicMaterial).opacity = 0.8 + Math.sin(time / 8) * 0.2;
                }
              }
            }
            
            // Outlaw shoots!
            if (outlaw.attackTimer >= 0.4) {
              // Player gets hit
              heartsRef.current--;
              setHearts(heartsRef.current);
              comboRef.current = 0;
              setCombo(0);
              addPopup(-100, 50, 50, 'kill', '💔 HIT! -100');
              scoreRef.current -= 100;
              setScore(Math.max(0, scoreRef.current));
              
              if (heartsRef.current <= 0) {
                setEndReason('dead');
                endGameRef.current();
                return;
              }
              
              outlaw.phase = 'recovery';
              outlaw.attackTimer = 0;
            }
          } else if (outlaw.phase === 'recovery') {
            outlaw.attackTimer += deltaTime;
            
            // Lower gun
            if (outlaw.mesh) {
              const gun = outlaw.mesh.getObjectByName('gun') as THREE.Group;
              if (gun) {
                const progress = Math.min(outlaw.attackTimer / 0.5, 1);
                gun.rotation.z = Math.PI / 4 - progress * (Math.PI / 2);
                gun.position.y = 0.8 - progress * 0.5;
                
                // Remove glow
                const barrel = gun.getObjectByName('barrel') as THREE.Mesh;
                if (barrel?.material) {
                  (barrel.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
                  (barrel.material as THREE.MeshPhongMaterial).emissiveIntensity = 0;
                }
              }
            }
            
            if (outlaw.attackTimer >= 0.5) {
              outlaw.phase = 'idle';
              outlaw.nextAttackIn = 1.5 + seededRngRef.current.next() * 1.5;
            }
          }
        });
        
        // Update bullets
        bulletsRef.current.forEach((bullet, index) => {
          bullet.progress += deltaTime * 8; // Fast bullet
          
          if (bullet.progress >= 1) {
            // Bullet hit
            scene.remove(bullet.mesh);
            bulletsRef.current.splice(index, 1);
          } else {
            // Interpolate position
            bullet.mesh.position.lerpVectors(bullet.startPos, bullet.endPos, bullet.progress);
            
            // Trail effect
            bullet.mesh.scale.setScalar(1 + Math.sin(bullet.progress * Math.PI) * 0.5);
          }
        });
        
        // Remove dead outlaws from array
        outlawsRef.current = outlawsRef.current.filter(o => o.mesh !== null || o.phase !== 'dying');
      }
      
      // Animate snowflakes for Christmas theme
      if (snowflakesRef.current && currentThemeRef.current === 'christmas') {
        const positions = snowflakesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 1] -= 0.02; // Fall down
          positions[i * 3] += Math.sin(time / 1000 + i) * 0.005; // Drift sideways
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 15 + Math.random() * 5;
          }
        }
        snowflakesRef.current.geometry.attributes.position.needsUpdate = true;
      }
      
      renderer.render(scene, camera);
    };
    
    const endGame = () => {
      gameStateRef.current = 'complete';
      setGameState('complete');
      
      // Stop music
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.currentTime = 0;
      }
      
      const finalScore = scoreRef.current;
      const accuracy = totalShotsRef.current > 0 
        ? Math.round((outlawsKilledRef.current / totalShotsRef.current) * 100) 
        : 0;
      
      try {
        logGameCompletion({
          gameType: GAME_TYPES.CLICK_DRAW || 'click_draw',
          gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
          score: finalScore,
          accuracy,
          gameData: {
            perfectDraws: perfectDrawsRef.current,
            totalDraws: totalDrawsRef.current,
            totalDodges: totalDodgesRef.current,
            totalShots: totalShotsRef.current,
            outlawsKilled: outlawsKilledRef.current,
            maxCombo: maxComboRef.current,
            rngSeed: rngSeedRef.current,
          }
        });
      } catch (e) {
        console.error('Audit failed:', e);
      }
      
      onGameCompleteRef.current({
        score: finalScore,
        accuracy,
      });
    };
    endGameRef.current = endGame;
    
    animate(0);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      initializedRef.current = false;
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    };
  }, [createGun, createOutlaw, spawnOutlaw, addPopup, getOutlawPosition, currentTheme]);
  
  // Keyboard handler
  // Arrow keys: Left=Dodge, Up=Draw, Right=Shoot, Down=Reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleDraw();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyR') {
        e.preventDefault();
        handleReload();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyS') {
        e.preventDefault();
        handleShoot();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyD') {
        e.preventDefault();
        handleDodge();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDraw, handleReload, handleShoot, handleDodge]);
  
  // Start game
  const startGame = useCallback(() => {
    gameStateRef.current = 'playing';
    setGameState('playing');
    gameTimeRef.current = 0;
    gameStartTimeRef.current = Date.now();
    scoreRef.current = 0;
    setScore(0);
    heartsRef.current = 3;
    setHearts(3);
    comboRef.current = 0;
    setCombo(0);
    bulletsRemainingRef.current = MAX_BULLETS;
    setBullets(MAX_BULLETS);
    perfectDrawsRef.current = 0;
    totalDrawsRef.current = 0;
    totalShotsRef.current = 0;
    totalDodgesRef.current = 0;
    outlawsKilledRef.current = 0;
    maxComboRef.current = 0;
    setEndReason(null);
    
    // Spawn initial outlaw after a delay
    setTimeout(() => {
      spawnOutlaw();
    }, 1500);
  }, [spawnOutlaw]);
  
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-b from-amber-900 via-orange-800 to-yellow-700 overflow-hidden" style={{ touchAction: 'none' }}>
      {/* 3D Canvas Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      />
      
      {/* Floating Scores - CoD style */}
      {scorePopups && <FloatingScore popups={scorePopups} onRemove={removeScorePopup} />}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 pointer-events-none">
            {/* Hearts */}
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-2xl">
                  {i < hearts ? '❤️' : '🖤'}
                </div>
              ))}
            </div>
            
            {/* Score & Timer */}
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-300 drop-shadow-lg">
                {score.toLocaleString()}
              </div>
              <div className="text-xl font-bold text-white drop-shadow">
                ⏱️ {timeRemaining}s
              </div>
            </div>
            
            {/* Combo */}
            <div className="text-right">
              {combo > 0 && (
                <div className="text-2xl font-bold text-orange-400 animate-pulse">
                  🔥 {combo}x
                </div>
              )}
            </div>
          </div>
          
          {/* Bullets Display */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
            {[...Array(MAX_BULLETS)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-8 rounded-t-full ${
                  i < bullets 
                    ? 'bg-gradient-to-b from-yellow-400 to-amber-600 border-2 border-yellow-300' 
                    : 'bg-gray-600 border-2 border-gray-500'
                }`}
                style={{
                  boxShadow: i < bullets ? '0 0 8px rgba(255, 200, 0, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
          
          {/* Control Buttons - Mobile Optimized */}
          <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 z-10 px-2">
            {/* Top row - DRAW (main action) */}
            <div className="flex justify-center mb-2">
              <button
                onClick={handleDraw}
                className="px-10 sm:px-12 py-4 sm:py-5 bg-gradient-to-b from-red-600 to-red-800 text-white font-bold text-xl sm:text-2xl rounded-xl border-4 border-red-400 shadow-lg active:scale-95 transition-transform animate-pulse"
                style={{ boxShadow: '0 4px 0 #8B0000, 0 6px 10px rgba(0,0,0,0.3)' }}
              >
                ⚡ DRAW! (↑)
              </button>
            </div>
            
            {/* Bottom row - DODGE, SHOOT, RELOAD */}
            <div className="flex justify-center gap-2 sm:gap-3">
              <button
                onClick={handleDodge}
                className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-blue-500 to-blue-700 text-white font-bold text-sm sm:text-lg rounded-lg border-3 border-blue-400 shadow-lg active:scale-95 transition-transform"
                style={{ boxShadow: '0 3px 0 #1e40af, 0 5px 8px rgba(0,0,0,0.3)' }}
              >
                🏃 DODGE
                <span className="block text-xs opacity-75">(←)</span>
              </button>
              
              <button
                onClick={handleShoot}
                className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-b from-gray-600 to-gray-800 text-white font-bold text-sm sm:text-lg rounded-lg border-3 border-gray-500 shadow-lg active:scale-95 transition-transform"
                style={{ boxShadow: '0 3px 0 #333, 0 5px 8px rgba(0,0,0,0.3)' }}
              >
                🔫 SHOOT
                <span className="block text-xs opacity-75">(→)</span>
              </button>
              
              <button
                onClick={handleReload}
                disabled={bullets === MAX_BULLETS}
                className={`px-3 sm:px-5 py-3 sm:py-4 font-bold text-sm sm:text-lg rounded-lg border-3 shadow-lg transition-transform ${
                  bullets === MAX_BULLETS
                    ? 'bg-gray-500 text-gray-300 border-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-b from-amber-500 to-amber-700 text-white border-amber-400 active:scale-95'
                }`}
                style={{ boxShadow: bullets < MAX_BULLETS ? '0 3px 0 #8B4513, 0 5px 8px rgba(0,0,0,0.3)' : 'none' }}
              >
                🔄 RELOAD
                <span className="block text-xs opacity-75">(↓)</span>
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-start bg-black/80 z-20 overflow-y-auto py-8 px-4">
          {/* Mobile scroll indicator */}
          <div className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-500/90 text-black px-4 py-2 rounded-full shadow-lg animate-bounce flex items-center gap-2 pointer-events-none">
            <span>👆</span>
            <span className="text-sm font-bold">Scroll for more</span>
            <span>👇</span>
          </div>
          
          <div className="text-center p-6 max-w-md w-full">
            <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-4 drop-shadow-lg">
              🤠 CLICK DRAW
            </h1>
            <p className="text-amber-200 mb-6 text-lg">
              A Western Quick Draw Showdown!
            </p>
            
            <div className="bg-amber-900/80 rounded-xl p-4 mb-6 text-left border-2 border-amber-600">
              <h3 className="text-yellow-300 font-bold mb-2 text-center">🎯 HOW TO PLAY</h3>
              <ul className="text-amber-100 text-sm space-y-2">
                <li>⚡ <strong>DRAW</strong> when enemy gun glows <span className="text-red-400 font-bold">RED</span> for one-shot kill!</li>
                <li>🎯 <strong>Perfect Draw</strong> = 750+ points + combo bonus!</li>
                <li>🏃 <strong>DODGE</strong> to avoid attacks = 200 points per attack!</li>
                <li>🔫 <strong>SHOOT</strong> anytime = 50 points (3 hits to kill)</li>
                <li>🔄 <strong>RELOAD</strong> when out of bullets (6 max)</li>
                <li>💙 Gun glows <span className="text-blue-400 font-bold">BLUE</span> = Enemy is preparing</li>
              </ul>
              
              <div className="mt-3 pt-3 border-t border-amber-600">
                <p className="text-yellow-200 text-xs text-center">
                  ⌨️ ↑/Space = Draw | ← = Dodge | → = Shoot | ↓ = Reload
                </p>
              </div>
            </div>
            
            {/* Theme Selector */}
            <div className="mb-6">
              <p className="text-amber-200 text-sm mb-2">🎨 Choose Theme:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  onClick={() => setCurrentTheme('standard')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    currentTheme === 'standard'
                      ? 'bg-amber-500 text-amber-900 border-2 border-yellow-300'
                      : 'bg-amber-800/50 text-amber-200 border-2 border-amber-600 hover:bg-amber-700/50'
                  }`}
                >
                  🤠 Standard
                </button>
                <button
                  onClick={() => setCurrentTheme('halloween')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    currentTheme === 'halloween'
                      ? 'bg-purple-500 text-white border-2 border-purple-300'
                      : 'bg-purple-800/50 text-purple-200 border-2 border-purple-600 hover:bg-purple-700/50'
                  }`}
                >
                  💀 Halloween
                </button>
                <button
                  onClick={() => setCurrentTheme('christmas')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                    currentTheme === 'christmas'
                      ? 'bg-red-500 text-white border-2 border-red-300'
                      : 'bg-red-800/50 text-red-200 border-2 border-red-600 hover:bg-red-700/50'
                  }`}
                >
                  🎄 Christmas
                </button>
              </div>
            </div>
            
            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-b from-yellow-500 to-amber-600 text-amber-900 font-bold text-2xl rounded-xl border-4 border-yellow-400 shadow-xl hover:from-yellow-400 hover:to-amber-500 transition-all active:scale-95"
              style={{ boxShadow: '0 6px 0 #8B4513, 0 8px 15px rgba(0,0,0,0.4)' }}
            >
              🤠 DRAW!
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <div className="text-center p-6 max-w-md bg-amber-900/90 rounded-2xl border-4 border-amber-600">
            <h2 className="text-4xl font-bold text-yellow-400 mb-2">
              {endReason === 'timeout' ? '⏱️ TIME\'S UP!' : '💀 GAME OVER'}
            </h2>
            
            <div className="text-6xl font-bold text-white my-4">
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-amber-200 mb-6 text-center">
              <div>
                <div className="text-xl sm:text-2xl">⚡ {perfectDrawsRef.current}</div>
                <div className="text-xs">Perfect Draws</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🏃 {totalDodgesRef.current}</div>
                <div className="text-xs">Dodges</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">☠️ {outlawsKilledRef.current}</div>
                <div className="text-xs">Outlaws Killed</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🔥 {maxComboRef.current}x</div>
                <div className="text-xs">Max Combo</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🔫 {totalShotsRef.current}</div>
                <div className="text-xs">Total Shots</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl">🎯 {totalShotsRef.current > 0 ? Math.round((outlawsKilledRef.current / totalShotsRef.current) * 100) : 0}%</div>
                <div className="text-xs">Accuracy</div>
              </div>
            </div>
            
            {onExit && (
              <button
                onClick={onExit}
                className="px-8 py-3 bg-gradient-to-b from-amber-500 to-amber-700 text-white font-bold text-xl rounded-lg border-2 border-amber-400 hover:from-amber-400 hover:to-amber-600 transition-all"
              >
                🚪 EXIT
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

