'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';
import FloatingScore, { useFloatingScores } from './FloatingScore';
import GameThemeSelector from './GameThemeSelector';
import { GameTheme, getSavedTheme } from '@/lib/gameThemes';

type GameTheme = 'standard' | 'halloween' | 'christmas';

interface FlappyCoinGameProps {
  onGameComplete: (result: { score: number; accuracy: number; avgReactionTime?: number }) => void;
  onExit?: () => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
  theme?: GameTheme;
}

// Seeded random number generator
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

interface HandObstacle {
  id: number;
  x: number;
  gapY: number;
  gapSize: number;
  passed: boolean;
  topMesh: THREE.Group;
  bottomMesh: THREE.Group;
  // Animation properties for staggered movement
  topPhase: number;
  bottomPhase: number;
  topBaseY: number;
  bottomBaseY: number;
}

interface BonusCoin {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  mesh: THREE.Group;
}

export default function FlappyCoinGame({ onGameComplete, onExit, gameMode = 'practice', rngSeed, theme: initialTheme }: FlappyCoinGameProps) {
  const [currentTheme, setCurrentTheme] = useState<GameTheme>(() => initialTheme || getSavedTheme());
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const coinRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const cloudsRef = useRef<THREE.Group[]>([]);
  const initializedRef = useRef(false);
  
  // Game state refs
  const coinYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const obstaclesRef = useRef<HandObstacle[]>([]);
  const bonusCoinsRef = useRef<BonusCoin[]>([]); // Bonus collectible coins
  const gapsPassedRef = useRef<number>(0); // Track total gaps passed for bonus coins
  const gameSpeedRef = useRef<number>(4);
  const movingForwardRef = useRef<boolean>(true); // Direction: true = forward, false = reverse
  const scoreRef = useRef<number>(0);
  const isAliveRef = useRef<boolean>(true);
  const gameStartTimeRef = useRef<number>(0);
  const gameStateRef = useRef<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const highScoreRef = useRef<number>(0);
  const flipRotationRef = useRef<number>(0); // For the flip animation on tap
  const targetFlipRef = useRef<number>(0); // Target flip rotation
  const lastGapTimeRef = useRef<number>(0); // For speed bonus calculation
  const gapAccuracyRef = useRef<number>(0); // Track how centered through gaps
  
  // Store callbacks in refs to avoid stale closures
  const onGameCompleteRef = useRef(onGameComplete);
  const gameModeRef = useRef(gameMode);
  const rngSeedRef = useRef(rngSeed);
  
  useEffect(() => {
    onGameCompleteRef.current = onGameComplete;
    gameModeRef.current = gameMode;
    rngSeedRef.current = rngSeed;
  }, [onGameComplete, gameMode, rngSeed]);
  
  const seededRng = useMemo(() => {
    const seed = rngSeed ?? Math.floor(Math.random() * 1000000);
    console.log('🪙 [FlippyCoin] RNG Seed:', seed);
    return new Mulberry32(seed);
  }, [rngSeed]);
  
  const seededRngRef = useRef(seededRng);
  useEffect(() => {
    seededRngRef.current = seededRng;
  }, [seededRng]);
  
  const [gameState, setGameState] = useState<'ready' | 'waiting' | 'playing' | 'complete'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // CoD-style floating score indicators
  const { popups, addPopup, removePopup } = useFloatingScores();
  const addPopupRef = useRef(addPopup);
  addPopupRef.current = addPopup;
  
  // Flappy Bird style physics constants
  const GRAVITY = -40;
  const JUMP_VELOCITY = 10;
  const COIN_X = -4;
  const FLOOR_Y = -4.5;
  const CEILING_Y = 4.5;
  const OBSTACLE_GAP = 12.0; // Much larger gap between obstacles for back/forth movement
  const GAP_SIZE = 4.2; // Larger opening to pass through
  const BONUS_COIN_POINTS = 500; // Points for collecting bonus coins
  
  // Create glowing bonus collectible coin
  const createBonusCoin = useCallback((scene: THREE.Scene, x: number, y: number): THREE.Group => {
    const group = new THREE.Group();
    
    // Golden glowing coin
    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 32);
    const coinMat = new THREE.MeshPhongMaterial({
      color: 0xFFD700,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.8,
      shininess: 200,
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    group.add(coin);
    
    // Outer glow ring
    const glowGeo = new THREE.RingGeometry(0.6, 0.9, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI / 2;
    group.add(glow);
    
    // Star symbol on coin
    const starShape = new THREE.Shape();
    const outerR = 0.25, innerR = 0.1;
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      if (i === 0) starShape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else starShape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    starShape.closePath();
    const starGeo = new THREE.ShapeGeometry(starShape);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.z = 0.08;
    group.add(star);
    
    group.position.set(x, y, 0);
    scene.add(group);
    return group;
  }, []);
  
  // Create beautiful 3D SILVER coin with detailed features
  const createCoin = useCallback(() => {
    const group = new THREE.Group();
    
    // Main coin body - SILVER with high metallic shine
    const coinGeometry = new THREE.CylinderGeometry(0.65, 0.65, 0.12, 64);
    const coinMaterial = new THREE.MeshPhongMaterial({
      color: 0xC0C0C0, // Silver base
      emissive: 0x404040,
      emissiveIntensity: 0.2,
      shininess: 200, // Very shiny
      specular: 0xFFFFFF,
      reflectivity: 1,
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    coin.name = 'coinBody';
    group.add(coin);
    
    // Outer rim - darker silver edge
    const rimGeometry = new THREE.TorusGeometry(0.65, 0.05, 16, 64);
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0x808080,
      emissive: 0x303030,
      emissiveIntensity: 0.2,
      shininess: 150,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
    
    // Inner decorative ring
    const innerRimGeometry = new THREE.TorusGeometry(0.5, 0.02, 16, 64);
    const innerRimMaterial = new THREE.MeshPhongMaterial({
      color: 0xA0A0A0,
      shininess: 180,
    });
    const innerRim = new THREE.Mesh(innerRimGeometry, innerRimMaterial);
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.z = 0.065;
    group.add(innerRim);
    
    // Dollar sign - etched look (front)
    const dollarGroup = new THREE.Group();
    dollarGroup.name = 'dollarSign';
    
    // S curve of dollar sign
    const sCurve = new THREE.Shape();
    sCurve.moveTo(0.12, 0.15);
    sCurve.bezierCurveTo(0.2, 0.15, 0.2, 0.05, 0.1, 0);
    sCurve.bezierCurveTo(0, -0.05, -0.2, -0.05, -0.12, 0);
    sCurve.bezierCurveTo(-0.2, 0.05, -0.2, 0.15, -0.1, 0.15);
    
    const sGeometry = new THREE.ExtrudeGeometry(sCurve, { depth: 0.02, bevelEnabled: false });
    const dollarMaterial = new THREE.MeshPhongMaterial({
      color: 0x606060,
      shininess: 100,
    });
    const sMesh = new THREE.Mesh(sGeometry, dollarMaterial);
    sMesh.position.z = 0.05;
    sMesh.rotation.z = Math.PI;
    dollarGroup.add(sMesh);
    
    // Vertical lines through S
    const lineGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12);
    const line = new THREE.Mesh(lineGeometry, dollarMaterial);
    line.position.z = 0.07;
    dollarGroup.add(line);
    
    group.add(dollarGroup);
    
    // Back side dollar sign (mirrored)
    const backDollar = dollarGroup.clone();
    backDollar.rotation.y = Math.PI;
    backDollar.position.z = -0.14;
    group.add(backDollar);
    
    // Sparkle/shine effect glow
    const glowGeometry = new THREE.SphereGeometry(0.85, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.1,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    group.add(glow);
    
    // Secondary glow ring
    const glowRingGeometry = new THREE.TorusGeometry(0.75, 0.1, 8, 32);
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xC0C0C0,
      transparent: true,
      opacity: 0.15,
    });
    const glowRing = new THREE.Mesh(glowRingGeometry, glowRingMaterial);
    glowRing.rotation.x = Math.PI / 2;
    glowRing.name = 'glowRing';
    group.add(glowRing);
    
    return group;
  }, []);
  
  // Create skeleton bone hand for Halloween theme
  const createSkeletonHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    // Bone material - aged ivory with cracks
    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC, // Bone white
      roughness: 0.6,
      metalness: 0.0,
      emissive: 0x222211,
      emissiveIntensity: 0.1,
    });
    
    const boneJointMaterial = new THREE.MeshStandardMaterial({
      color: 0xE8E4D4, // Slightly darker for joints
      roughness: 0.7,
      metalness: 0.0,
    });
    
    // Metacarpal bones (palm area)
    const fingerXPositions = [-0.7, -0.25, 0.25, 0.7];
    fingerXPositions.forEach((xPos) => {
      const metacarpalGeo = new THREE.CapsuleGeometry(0.1, 0.8, 8, 12);
      const metacarpal = new THREE.Mesh(metacarpalGeo, boneMaterial);
      metacarpal.position.set(xPos, isTop ? 1.3 : -1.3, 0);
      group.add(metacarpal);
      
      // Joint at knuckle
      const jointGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const joint = new THREE.Mesh(jointGeo, boneJointMaterial);
      joint.position.set(xPos, isTop ? 0.7 : -0.7, 0);
      group.add(joint);
    });
    
    // Finger bones (phalanges) - pointing towards gap
    const fingerLengths = [0.9, 1.3, 1.25, 0.9];
    fingerXPositions.forEach((xPos, i) => {
      const fingerLength = fingerLengths[i];
      let cumulativeY = 0;
      
      // 3 phalanges per finger
      for (let seg = 0; seg < 3; seg++) {
        const segLength = fingerLength * (seg === 0 ? 0.4 : seg === 1 ? 0.35 : 0.25);
        const segRadius = 0.08 - seg * 0.015;
        
        const boneGeo = new THREE.CapsuleGeometry(segRadius, segLength, 8, 12);
        const bone = new THREE.Mesh(boneGeo, boneMaterial);
        
        cumulativeY += segLength * 0.6;
        const segY = isTop ? -cumulativeY : cumulativeY;
        bone.position.set(xPos, segY, 0);
        group.add(bone);
        
        // Joint between segments
        if (seg < 2) {
          const jointGeo = new THREE.SphereGeometry(0.1, 8, 8);
          const joint = new THREE.Mesh(jointGeo, boneJointMaterial);
          const jointY = isTop ? -(cumulativeY + segLength * 0.3) : cumulativeY + segLength * 0.3;
          joint.position.set(xPos, jointY, 0);
          group.add(joint);
        }
      }
    });
    
    // Thumb bones
    const thumbJoint = new THREE.SphereGeometry(0.12, 10, 10);
    const thumbJointMesh = new THREE.Mesh(thumbJoint, boneJointMaterial);
    thumbJointMesh.position.set(isTop ? 1.0 : -1.0, isTop ? 0.9 : -0.9, 0);
    group.add(thumbJointMesh);
    
    const thumbBone1 = new THREE.CapsuleGeometry(0.09, 0.35, 8, 12);
    const thumb1 = new THREE.Mesh(thumbBone1, boneMaterial);
    thumb1.position.set(isTop ? 1.2 : -1.2, isTop ? 0.5 : -0.5, 0);
    thumb1.rotation.z = isTop ? -0.5 : 0.5;
    group.add(thumb1);
    
    const thumbBone2 = new THREE.CapsuleGeometry(0.07, 0.3, 8, 12);
    const thumb2 = new THREE.Mesh(thumbBone2, boneMaterial);
    thumb2.position.set(isTop ? 1.45 : -1.45, isTop ? 0.1 : -0.1, 0);
    thumb2.rotation.z = isTop ? -0.4 : 0.4;
    group.add(thumb2);
    
    // Carpal bones (wrist)
    for (let c = 0; c < 4; c++) {
      const carpalGeo = new THREE.BoxGeometry(0.25, 0.25, 0.2);
      const carpal = new THREE.Mesh(carpalGeo, boneMaterial);
      carpal.position.set(-0.4 + c * 0.27, isTop ? 2.0 : -2.0, 0);
      carpal.rotation.z = Math.random() * 0.2 - 0.1;
      group.add(carpal);
    }
    
    // Radius and Ulna (forearm bones)
    const radiusGeo = new THREE.CapsuleGeometry(0.12, 5, 10, 16);
    const radius = new THREE.Mesh(radiusGeo, boneMaterial);
    radius.position.set(0.2, isTop ? 5.0 : -5.0, 0.1);
    group.add(radius);
    
    const ulnaGeo = new THREE.CapsuleGeometry(0.1, 5.2, 10, 16);
    const ulna = new THREE.Mesh(ulnaGeo, boneMaterial);
    ulna.position.set(-0.2, isTop ? 5.1 : -5.1, -0.1);
    group.add(ulna);
    
    // Tattered black robe sleeve
    const robeGeo = new THREE.ConeGeometry(1.5, 4, 16, 1, true);
    const robeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const robe = new THREE.Mesh(robeGeo, robeMaterial);
    robe.position.y = isTop ? 6.5 : -6.5;
    robe.rotation.x = isTop ? 0 : Math.PI;
    group.add(robe);
    
    return group;
  }, []);
  
  // Create Santa mitten for Christmas theme
  const createSantaMitten = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    // Red fuzzy mitten material
    const redMittenMaterial = new THREE.MeshStandardMaterial({
      color: 0xCC0000, // Christmas red
      roughness: 0.8,
      metalness: 0.0,
    });
    
    // White fur trim material
    const whiteFurMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0xDDDDDD,
      emissiveIntensity: 0.1,
    });
    
    // Main mitten body (rounded box shape)
    const mittenShape = new THREE.Shape();
    mittenShape.moveTo(-1.0, -1.2);
    mittenShape.quadraticCurveTo(-1.3, 0, -1.0, 1.0);
    mittenShape.quadraticCurveTo(-0.5, 1.5, 0.5, 1.5);
    mittenShape.quadraticCurveTo(1.0, 1.0, 1.2, 0);
    mittenShape.quadraticCurveTo(1.0, -1.0, 0.5, -1.2);
    mittenShape.lineTo(-1.0, -1.2);
    
    const mittenExtrudeSettings = { depth: 0.8, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.1, bevelSegments: 5 };
    const mittenGeo = new THREE.ExtrudeGeometry(mittenShape, mittenExtrudeSettings);
    const mitten = new THREE.Mesh(mittenGeo, redMittenMaterial);
    mitten.rotation.x = Math.PI / 2;
    mitten.position.y = isTop ? 0.5 : -0.5;
    mitten.position.z = -0.4;
    group.add(mitten);
    
    // Thumb
    const thumbGeo = new THREE.CapsuleGeometry(0.35, 0.8, 12, 16);
    const thumb = new THREE.Mesh(thumbGeo, redMittenMaterial);
    thumb.position.set(isTop ? 1.3 : -1.3, isTop ? 0.3 : -0.3, 0);
    thumb.rotation.z = isTop ? -0.5 : 0.5;
    group.add(thumb);
    
    // White fur cuff - fluffy looking
    const cuffGeo = new THREE.TorusGeometry(1.1, 0.35, 16, 32);
    const cuff = new THREE.Mesh(cuffGeo, whiteFurMaterial);
    cuff.position.y = isTop ? 2.0 : -2.0;
    cuff.rotation.x = Math.PI / 2;
    group.add(cuff);
    
    // Extra fur puffs for fluffy look
    for (let p = 0; p < 12; p++) {
      const angle = (p / 12) * Math.PI * 2;
      const puffGeo = new THREE.SphereGeometry(0.25, 8, 8);
      const puff = new THREE.Mesh(puffGeo, whiteFurMaterial);
      puff.position.set(
        Math.cos(angle) * 1.1,
        isTop ? 2.0 : -2.0,
        Math.sin(angle) * 1.1
      );
      group.add(puff);
    }
    
    // Red arm/sleeve
    const armGeo = new THREE.CylinderGeometry(0.9, 1.0, 5, 20);
    const arm = new THREE.Mesh(armGeo, redMittenMaterial);
    arm.position.y = isTop ? 5.0 : -5.0;
    group.add(arm);
    
    // Another fur cuff at elbow
    const elbowCuffGeo = new THREE.TorusGeometry(0.95, 0.25, 12, 24);
    const elbowCuff = new THREE.Mesh(elbowCuffGeo, whiteFurMaterial);
    elbowCuff.position.y = isTop ? 7.5 : -7.5;
    elbowCuff.rotation.x = Math.PI / 2;
    group.add(elbowCuff);
    
    // Gold jingle bells on cuff
    const bellMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      roughness: 0.2,
      metalness: 0.8,
    });
    for (let b = 0; b < 3; b++) {
      const bellGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const bell = new THREE.Mesh(bellGeo, bellMaterial);
      const bellAngle = (b / 3) * Math.PI * 2 + Math.PI / 6;
      bell.position.set(
        Math.cos(bellAngle) * 1.2,
        isTop ? 2.3 : -2.3,
        Math.sin(bellAngle) * 1.2
      );
      group.add(bell);
      
      // Bell slit
      const slitGeo = new THREE.BoxGeometry(0.08, 0.12, 0.02);
      const slitMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const slit = new THREE.Mesh(slitGeo, slitMat);
      slit.position.copy(bell.position);
      slit.position.y -= isTop ? 0.1 : -0.1;
      group.add(slit);
    }
    
    return group;
  }, []);
  
  // Create standard realistic hand
  const createStandardHand = useCallback((isTop: boolean) => {
    const group = new THREE.Group();
    
    // Multiple skin materials for realistic color variation
    const skinColorBase = 0xE8B89D;
    const skinColorDark = 0xD4A088;
    const skinColorLight = 0xF5C9B8;
    
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: skinColorBase,
      roughness: 0.7,
      metalness: 0.0,
      emissive: 0x3A1505,
      emissiveIntensity: 0.05,
    });
    
    const skinMaterialDark = new THREE.MeshStandardMaterial({
      color: skinColorDark,
      roughness: 0.75,
      metalness: 0.0,
    });
    
    const skinMaterialLight = new THREE.MeshStandardMaterial({
      color: skinColorLight,
      roughness: 0.65,
      metalness: 0.0,
    });
    
    const creaseMaterial = new THREE.MeshStandardMaterial({
      color: 0xB88A70,
      roughness: 0.9,
      metalness: 0.0,
    });
    
    // Palm - more anatomically correct with curved shape
    const palmShape = new THREE.Shape();
    palmShape.moveTo(-1.0, -0.8);
    palmShape.quadraticCurveTo(-1.2, 0, -1.0, 0.8);
    palmShape.quadraticCurveTo(-0.5, 1.1, 0, 1.1);
    palmShape.quadraticCurveTo(0.5, 1.1, 1.0, 0.8);
    palmShape.quadraticCurveTo(1.2, 0, 1.0, -0.8);
    palmShape.quadraticCurveTo(0, -1.0, -1.0, -0.8);
    
    const palmExtrudeSettings = { depth: 0.5, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 3 };
    const palmGeometry = new THREE.ExtrudeGeometry(palmShape, palmExtrudeSettings);
    const palm = new THREE.Mesh(palmGeometry, skinMaterial);
    palm.rotation.x = Math.PI / 2;
    palm.position.y = isTop ? 1.5 : -1.5;
    palm.position.z = -0.25;
    group.add(palm);
    
    // Palm creases
    const creaseGeo = new THREE.BoxGeometry(1.6, 0.02, 0.05);
    for (let i = 0; i < 3; i++) {
      const crease = new THREE.Mesh(creaseGeo, creaseMaterial);
      crease.position.y = isTop ? 1.2 - i * 0.3 : -1.2 + i * 0.3;
      crease.position.z = -0.28;
      crease.rotation.z = (i - 1) * 0.1;
      group.add(crease);
    }
    
    // Knuckle ridge with bumps for each finger
    const fingerXPositions = [-0.7, -0.25, 0.25, 0.7];
    fingerXPositions.forEach((xPos) => {
      const knuckleGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const knuckle = new THREE.Mesh(knuckleGeo, skinMaterial);
      knuckle.position.set(xPos, isTop ? 0.35 : -0.35, 0.05);
      knuckle.scale.set(1, 0.7, 0.8);
      group.add(knuckle);
    });
    
    // Detailed fingers with proper joints - pointing towards gap (y = 0)
    const fingerLengths = [1.0, 1.4, 1.35, 1.0];
    
    fingerXPositions.forEach((xPos, i) => {
      const fingerLength = fingerLengths[i];
      const baseRadius = i === 0 || i === 3 ? 0.12 : 0.14;
      
      // 3 phalanges per finger with decreasing size
      const segmentLengths = [fingerLength * 0.38, fingerLength * 0.32, fingerLength * 0.25];
      let cumulativeY = 0;
      
      for (let seg = 0; seg < 3; seg++) {
        const segLength = segmentLengths[seg];
        const segRadius = baseRadius * (1 - seg * 0.12);
        
        // Each segment is a capsule
        const segGeometry = new THREE.CapsuleGeometry(segRadius, segLength, 12, 16);
        const segMesh = new THREE.Mesh(segGeometry, seg === 0 ? skinMaterialDark : skinMaterial);
        
        // Position segments towards the gap (y = 0)
        cumulativeY += segLength * 0.6;
        const segY = isTop ? -cumulativeY : cumulativeY;
        segMesh.position.set(xPos, segY, 0);
        group.add(segMesh);
        
        // Joint between segments (small darker ring)
        if (seg < 2) {
          const jointGeo = new THREE.TorusGeometry(segRadius * 0.9, 0.02, 8, 16);
          const joint = new THREE.Mesh(jointGeo, creaseMaterial);
          const jointY = isTop ? -(cumulativeY + segLength * 0.4) : cumulativeY + segLength * 0.4;
          joint.position.set(xPos, jointY, 0);
          joint.rotation.x = Math.PI / 2;
          group.add(joint);
        }
      }
      
      // Fingertip (rounded end)
      const tipGeo = new THREE.SphereGeometry(baseRadius * 0.7, 12, 12);
      const tip = new THREE.Mesh(tipGeo, skinMaterialLight);
      const tipY = isTop ? -(cumulativeY + fingerLength * 0.15) : cumulativeY + fingerLength * 0.15;
      tip.position.set(xPos, tipY, 0);
      tip.scale.set(1, 1.3, 0.8);
      group.add(tip);
      
      // Fingernail with cuticle detail
      const nailGeo = new THREE.BoxGeometry(baseRadius * 1.4, baseRadius * 1.6, 0.04);
      const nailMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFE8E0, 
        roughness: 0.2, 
        metalness: 0.1 
      });
      const nail = new THREE.Mesh(nailGeo, nailMaterial);
      const nailY = isTop ? -(cumulativeY + fingerLength * 0.08) : cumulativeY + fingerLength * 0.08;
      nail.position.set(xPos, nailY, isTop ? -0.12 : 0.12);
      group.add(nail);
    });
    
    // Detailed thumb with anatomically correct positioning
    const thumbBase = new THREE.CapsuleGeometry(0.2, 0.5, 12, 16);
    const thumbBaseMesh = new THREE.Mesh(thumbBase, skinMaterialDark);
    thumbBaseMesh.position.set(isTop ? 1.0 : -1.0, isTop ? 0.8 : -0.8, 0.1);
    thumbBaseMesh.rotation.z = isTop ? -0.6 : 0.6;
    group.add(thumbBaseMesh);
    
    const thumbMid = new THREE.CapsuleGeometry(0.17, 0.45, 12, 16);
    const thumbMidMesh = new THREE.Mesh(thumbMid, skinMaterial);
    thumbMidMesh.position.set(isTop ? 1.35 : -1.35, isTop ? 0.3 : -0.3, 0.1);
    thumbMidMesh.rotation.z = isTop ? -0.4 : 0.4;
    group.add(thumbMidMesh);
    
    const thumbTip = new THREE.CapsuleGeometry(0.14, 0.35, 12, 16);
    const thumbTipMesh = new THREE.Mesh(thumbTip, skinMaterialLight);
    thumbTipMesh.position.set(isTop ? 1.55 : -1.55, isTop ? -0.15 : 0.15, 0.1);
    thumbTipMesh.rotation.z = isTop ? -0.25 : 0.25;
    group.add(thumbTipMesh);
    
    // Thenar eminence (thumb muscle on palm)
    const thenarGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const thenar = new THREE.Mesh(thenarGeo, skinMaterial);
    thenar.position.set(isTop ? 0.9 : -0.9, isTop ? 1.0 : -1.0, 0.15);
    thenar.scale.set(1.2, 1.5, 0.6);
    group.add(thenar);
    
    // Wrist with tendons detail
    const wristGeometry = new THREE.CylinderGeometry(0.85, 0.95, 1.0, 20);
    const wrist = new THREE.Mesh(wristGeometry, skinMaterial);
    wrist.position.y = isTop ? 2.6 : -2.6;
    group.add(wrist);
    
    // Forearm (extends away from gap)
    const armGeometry = new THREE.CylinderGeometry(0.8, 0.85, 7, 20);
    const arm = new THREE.Mesh(armGeometry, skinMaterial);
    arm.position.y = isTop ? 7.0 : -7.0;
    group.add(arm);
    
    // Elegant suit sleeve
    const cuffGeometry = new THREE.CylinderGeometry(1.0, 0.92, 1.0, 20);
    const cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.y = isTop ? 3.3 : -3.3;
    group.add(cuff);
    
    // Suit jacket sleeve extending up
    const sleeveGeometry = new THREE.CylinderGeometry(0.95, 1.0, 5, 20);
    const sleeve = new THREE.Mesh(sleeveGeometry, cuffMaterial);
    sleeve.position.y = isTop ? 6.0 : -6.0;
    group.add(sleeve);
    
    // Crisp white dress shirt cuff
    const shirtGeometry = new THREE.CylinderGeometry(0.88, 0.88, 0.35, 20);
    const shirtMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFF5, 
      roughness: 0.3,
      metalness: 0.0
    });
    const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
    shirt.position.y = isTop ? 2.9 : -2.9;
    group.add(shirt);
    
    // French cuff with gold cufflinks
    const cufflinkBase = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 16);
    const cufflinkMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700, 
      roughness: 0.1, 
      metalness: 0.9 
    });
    
    // Front cufflink
    const cufflink1 = new THREE.Mesh(cufflinkBase, cufflinkMat);
    cufflink1.rotation.x = Math.PI / 2;
    cufflink1.position.set(0.85, isTop ? 3.3 : -3.3, 0.15);
    group.add(cufflink1);
    
    // Back cufflink
    const cufflink2 = new THREE.Mesh(cufflinkBase, cufflinkMat);
    cufflink2.rotation.x = Math.PI / 2;
    cufflink2.position.set(0.85, isTop ? 3.3 : -3.3, -0.15);
    group.add(cufflink2);
    
    // Cufflink gem (small blue stone)
    const gemGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const gemMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e3a5f, 
      roughness: 0.0, 
      metalness: 0.2,
      emissive: 0x0a1525,
      emissiveIntensity: 0.3
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0.85, isTop ? 3.3 : -3.3, 0.18);
    group.add(gem);
    
    return group;
  }, []);
  
  // Theme-aware hand creation
  const createHand = useCallback((isTop: boolean) => {
    switch (currentTheme) {
      case 'halloween':
        return createSkeletonHand(isTop);
      case 'christmas':
        return createSantaMitten(isTop);
      default:
        return createStandardHand(isTop);
    }
  }, [currentTheme, createSkeletonHand, createSantaMitten, createStandardHand]);
  
  // Handle jump forward - moves coin up and keeps moving forward
  const handleJumpForward = useCallback(() => {
    console.log('🪙 Jump Forward! State:', gameStateRef.current);
    
    if (gameStateRef.current === 'waiting') {
      console.log('🪙 Starting game from waiting state');
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      lastGapTimeRef.current = Date.now();
      movingForwardRef.current = true;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current += Math.PI * 2;
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      movingForwardRef.current = true;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current += Math.PI * 2;
    }
  }, []);
  
  // Handle reverse - moves coin up but reverses horizontal direction
  const handleReverse = useCallback(() => {
    console.log('🪙 Reverse! State:', gameStateRef.current);
    
    if (gameStateRef.current === 'waiting') {
      console.log('🪙 Starting game from waiting state (reverse)');
      gameStateRef.current = 'playing';
      setGameState('playing');
      isAliveRef.current = true;
      gameStartTimeRef.current = Date.now();
      lastGapTimeRef.current = Date.now();
      movingForwardRef.current = false;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current -= Math.PI * 2; // Reverse flip
    } else if (gameStateRef.current === 'playing' && isAliveRef.current) {
      movingForwardRef.current = false;
      velocityRef.current = JUMP_VELOCITY;
      targetFlipRef.current -= Math.PI * 2; // Reverse flip
    }
  }, []);
  
  // Start game (from ready to waiting)
  const startGame = useCallback(() => {
    console.log('🪙 Starting game - going to waiting state');
    gameStateRef.current = 'waiting';
    setGameState('waiting');
    scoreRef.current = 0;
    setScore(0);
    gapsPassedRef.current = 0; // Reset gaps counter
    bonusCoinsRef.current = []; // Clear bonus coins
    coinYRef.current = 0;
    velocityRef.current = 0;
    gameSpeedRef.current = 4;
    movingForwardRef.current = true;
    lastGapTimeRef.current = 0;
    gapAccuracyRef.current = 0;
    isAliveRef.current = true;
    
    // Clear obstacles
    obstaclesRef.current.forEach(obs => {
      if (sceneRef.current) {
        sceneRef.current.remove(obs.topMesh);
        sceneRef.current.remove(obs.bottomMesh);
      }
    });
    obstaclesRef.current = [];
    
    // Reset coin
    if (coinRef.current) {
      coinRef.current.position.y = 0;
      coinRef.current.rotation.z = 0;
      coinRef.current.rotation.x = Math.PI / 2;
      coinRef.current.rotation.y = 0;
    }
    // Reset flip animation
    flipRotationRef.current = 0;
    targetFlipRef.current = 0;
  }, []);
  
  // Keyboard controls for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleJumpForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleReverse();
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        // Space or Up arrow also jumps forward
        handleJumpForward();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJumpForward, handleReverse]);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;
    
    const container = containerRef.current;
    
    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Theme-based sky colors
    let topColor, bottomColor;
    switch (currentTheme) {
      case 'halloween':
        topColor = new THREE.Color(0x0a0a1a); // Dark night sky
        bottomColor = new THREE.Color(0x2a1a3a); // Purple mist
        break;
      case 'christmas':
        topColor = new THREE.Color(0x1a2a4a); // Winter night blue
        bottomColor = new THREE.Color(0x4a5a7a); // Lighter winter blue
        break;
      default:
        topColor = new THREE.Color(0x1e90ff);
        bottomColor = new THREE.Color(0x87CEEB);
    }
    
    // Sky gradient
    const skyGeometry = new THREE.PlaneGeometry(100, 100);
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: topColor },
        bottomColor: { value: bottomColor },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, vUv.y), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.z = -15;
    scene.add(sky);
    
    // Halloween: Add large full moon
    if (currentTheme === 'halloween') {
      // Full moon
      const moonGeo = new THREE.CircleGeometry(4, 64);
      const moonMat = new THREE.MeshBasicMaterial({
        color: 0xFFF8DC,
        transparent: true,
        opacity: 0.95,
      });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(8, 6, -14);
      scene.add(moon);
      
      // Moon glow
      const moonGlowGeo = new THREE.CircleGeometry(5, 64);
      const moonGlowMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFCC,
        transparent: true,
        opacity: 0.3,
      });
      const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
      moonGlow.position.set(8, 6, -14.1);
      scene.add(moonGlow);
      
      // Moon craters
      const craterMat = new THREE.MeshBasicMaterial({
        color: 0xE8E0C8,
        transparent: true,
        opacity: 0.4,
      });
      for (let c = 0; c < 6; c++) {
        const craterGeo = new THREE.CircleGeometry(0.3 + Math.random() * 0.4, 16);
        const crater = new THREE.Mesh(craterGeo, craterMat);
        crater.position.set(
          7 + (Math.random() - 0.5) * 4,
          5 + (Math.random() - 0.5) * 4,
          -13.9
        );
        scene.add(crater);
      }
      
      // Spooky stars
      for (let s = 0; s < 50; s++) {
        const starGeo = new THREE.CircleGeometry(0.05 + Math.random() * 0.08, 8);
        const starMat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.4 + Math.random() * 0.6,
        });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(
          (Math.random() - 0.5) * 40,
          Math.random() * 10,
          -14.5
        );
        scene.add(star);
      }
      
      // Bats silhouettes
      for (let b = 0; b < 5; b++) {
        const batGroup = new THREE.Group();
        const batMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Body
        const bodyGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const body = new THREE.Mesh(bodyGeo, batMat);
        batGroup.add(body);
        
        // Wings
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.quadraticCurveTo(0.3, 0.2, 0.5, 0);
        wingShape.quadraticCurveTo(0.3, -0.1, 0, 0);
        const wingGeo = new THREE.ShapeGeometry(wingShape);
        
        const leftWing = new THREE.Mesh(wingGeo, batMat);
        leftWing.position.x = -0.1;
        leftWing.scale.x = -1;
        batGroup.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeo, batMat);
        rightWing.position.x = 0.1;
        batGroup.add(rightWing);
        
        batGroup.position.set(
          -8 + b * 4 + Math.random() * 2,
          3 + Math.random() * 4,
          -10
        );
        batGroup.scale.setScalar(0.5 + Math.random() * 0.5);
        scene.add(batGroup);
      }
    }
    
    // Christmas: Add snowy background elements
    if (currentTheme === 'christmas') {
      // Stars
      for (let s = 0; s < 40; s++) {
        const starGeo = new THREE.CircleGeometry(0.06 + Math.random() * 0.06, 6);
        const starMat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.5 + Math.random() * 0.5,
        });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(
          (Math.random() - 0.5) * 40,
          Math.random() * 10,
          -14.5
        );
        scene.add(star);
      }
      
      // Snowflakes (floating in the background)
      for (let f = 0; f < 100; f++) {
        const flakeGeo = new THREE.CircleGeometry(0.08 + Math.random() * 0.1, 6);
        const flakeMat = new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.6 + Math.random() * 0.4,
        });
        const flake = new THREE.Mesh(flakeGeo, flakeMat);
        flake.position.set(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 20,
          -12 - Math.random() * 3
        );
        flake.userData.fallSpeed = 0.01 + Math.random() * 0.02;
        flake.userData.swaySpeed = Math.random() * 0.02;
        flake.userData.swayOffset = Math.random() * Math.PI * 2;
        scene.add(flake);
      }
      
      // Distant snow-capped mountains
      const mountainMat = new THREE.MeshBasicMaterial({ color: 0x3a4a5a });
      for (let m = 0; m < 5; m++) {
        const mountainGeo = new THREE.ConeGeometry(3 + Math.random() * 2, 5 + Math.random() * 3, 4);
        const mountain = new THREE.Mesh(mountainGeo, mountainMat);
        mountain.position.set(-12 + m * 6, -3, -13);
        scene.add(mountain);
        
        // Snow cap
        const snowCapGeo = new THREE.ConeGeometry(1 + Math.random() * 0.5, 2, 4);
        const snowCapMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const snowCap = new THREE.Mesh(snowCapGeo, snowCapMat);
        snowCap.position.copy(mountain.position);
        snowCap.position.y += 2.5;
        scene.add(snowCap);
      }
    }
    
    // Camera - zoom out more on mobile
    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;
    const fov = isMobileDevice ? 65 : 50; // Wider FOV on mobile
    const cameraZ = isMobileDevice ? 20 : 14; // Further back on mobile
    const camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, cameraZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Theme-based lighting
    let ambientColor, ambientIntensity, mainLightColor;
    switch (currentTheme) {
      case 'halloween':
        ambientColor = 0x4444AA; // Eerie blue
        ambientIntensity = 0.4;
        mainLightColor = 0xFFFFCC; // Moonlight
        break;
      case 'christmas':
        ambientColor = 0x8888FF; // Cool winter light
        ambientIntensity = 0.6;
        mainLightColor = 0xFFFFFF; // Bright snow reflection
        break;
      default:
        ambientColor = 0xFFFFFF;
        ambientIntensity = 0.7;
        mainLightColor = 0xFFFFCC;
    }
    
    const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(mainLightColor, currentTheme === 'halloween' ? 0.6 : 1);
    sunLight.position.set(currentTheme === 'halloween' ? 8 : 10, 15, 10);
    scene.add(sunLight);
    
    // Add fill light for hands
    const fillLight = new THREE.DirectionalLight(currentTheme === 'christmas' ? 0xAABBFF : 0xFFE4C4, 0.5);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);
    
    // Coin
    const coin = createCoin();
    coin.position.x = COIN_X;
    coin.position.y = 0;
    scene.add(coin);
    coinRef.current = coin;
    
    // Theme-based clouds
    if (currentTheme !== 'halloween') { // No clouds for spooky night sky
      const cloudColor = currentTheme === 'christmas' ? 0xDDDDEE : 0xFFFFFF;
      for (let i = 0; i < 5; i++) {
        const cloudGroup = new THREE.Group();
        const cloudMaterial = new THREE.MeshPhongMaterial({
          color: cloudColor,
          transparent: true,
          opacity: 0.85,
        });
        
        for (let j = 0; j < 4; j++) {
          const sphereGeometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 12, 12);
          const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
          sphere.position.set((j - 1.5) * 0.4, Math.random() * 0.2, 0);
          cloudGroup.add(sphere);
        }
        
        cloudGroup.position.set(-10 + i * 5, 3 + Math.random() * 2, -5);
        cloudGroup.scale.setScalar(0.8 + Math.random() * 0.5);
        scene.add(cloudGroup);
        cloudsRef.current.push(cloudGroup);
      }
    }
    
    // Theme-based ground
    let groundColor, dirtColor;
    switch (currentTheme) {
      case 'halloween':
        groundColor = 0x1a1a1a; // Dark dead grass
        dirtColor = 0x2a1a0a; // Dark soil
        break;
      case 'christmas':
        groundColor = 0xFFFFFF; // Snow
        dirtColor = 0xE8E8F0; // Light snow/ice
        break;
      default:
        groundColor = 0x228B22; // Green grass
        dirtColor = 0x8B4513; // Brown dirt
    }
    
    const groundGeometry = new THREE.PlaneGeometry(50, 2);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: groundColor });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = FLOOR_Y - 0.5;
    scene.add(ground);
    
    // Halloween: Add tombstones
    if (currentTheme === 'halloween') {
      for (let t = 0; t < 8; t++) {
        const tombGroup = new THREE.Group();
        const tombMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
        
        // Tombstone body
        const tombGeo = new THREE.BoxGeometry(0.8, 1.2, 0.2);
        const tomb = new THREE.Mesh(tombGeo, tombMat);
        tomb.position.y = 0.6;
        tombGroup.add(tomb);
        
        // Rounded top
        const topGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16, 1, false, 0, Math.PI);
        const top = new THREE.Mesh(topGeo, tombMat);
        top.rotation.z = Math.PI / 2;
        top.rotation.y = Math.PI / 2;
        top.position.y = 1.2;
        tombGroup.add(top);
        
        tombGroup.position.set(-15 + t * 4, FLOOR_Y, -2 - Math.random() * 3);
        tombGroup.rotation.y = (Math.random() - 0.5) * 0.3;
        tombGroup.scale.setScalar(0.5 + Math.random() * 0.3);
        scene.add(tombGroup);
      }
    }
    
    // Christmas: Add snow mounds and candy canes
    if (currentTheme === 'christmas') {
      // Snow mounds
      for (let s = 0; s < 10; s++) {
        const moundGeo = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 12, 12);
        const moundMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        const mound = new THREE.Mesh(moundGeo, moundMat);
        mound.position.set(-20 + s * 4, FLOOR_Y - 0.3, -1 - Math.random() * 2);
        mound.scale.y = 0.4;
        scene.add(mound);
      }
      
      // Candy canes
      for (let c = 0; c < 5; c++) {
        const caneGroup = new THREE.Group();
        
        // Straight part (red and white stripes)
        const caneGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 12);
        const caneMat = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        const cane = new THREE.Mesh(caneGeo, caneMat);
        cane.position.y = 0.75;
        caneGroup.add(cane);
        
        // White stripes
        for (let stripe = 0; stripe < 5; stripe++) {
          const stripeGeo = new THREE.TorusGeometry(0.085, 0.02, 8, 16);
          const stripeMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
          const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
          stripeMesh.position.y = 0.2 + stripe * 0.3;
          stripeMesh.rotation.x = Math.PI / 2;
          caneGroup.add(stripeMesh);
        }
        
        // Curved top
        const hookGeo = new THREE.TorusGeometry(0.15, 0.08, 8, 12, Math.PI);
        const hookMat = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
        const hook = new THREE.Mesh(hookGeo, hookMat);
        hook.position.set(0.15, 1.5, 0);
        hook.rotation.z = Math.PI / 2;
        caneGroup.add(hook);
        
        caneGroup.position.set(-15 + c * 8, FLOOR_Y, -1.5);
        caneGroup.rotation.z = 0.1 + Math.random() * 0.1;
        scene.add(caneGroup);
      }
    }
    
    // Dirt layer
    const dirtGeometry = new THREE.PlaneGeometry(50, 1);
    const dirtMaterial = new THREE.MeshPhongMaterial({ color: dirtColor });
    const dirt = new THREE.Mesh(dirtGeometry, dirtMaterial);
    dirt.position.y = FLOOR_Y - 1.2;
    scene.add(dirt);
    
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
      
      if (!coinRef.current || !sceneRef.current) return;
      
      // Smooth flip animation towards target
      const flipDiff = targetFlipRef.current - flipRotationRef.current;
      if (Math.abs(flipDiff) > 0.01) {
        // Smooth interpolation for flip - faster for snappy feel
        flipRotationRef.current += flipDiff * Math.min(1, deltaTime * 12);
      } else {
        flipRotationRef.current = targetFlipRef.current;
      }
      
      // Apply flip rotation (around X axis for proper coin flip)
      coinRef.current.rotation.x = Math.PI / 2 + flipRotationRef.current;
      
      // Also add continuous slow spin for shimmer effect
      coinRef.current.rotation.y += deltaTime * 0.5;
      
      // Glow pulse - more dynamic based on flip
      const glow = coinRef.current.getObjectByName('glow') as THREE.Mesh;
      if (glow && glow.material) {
        const flipSpeed = Math.abs(flipDiff);
        const baseOpacity = 0.1 + Math.sin(time / 200) * 0.05;
        const flipBoost = Math.min(0.3, flipSpeed * 0.1); // Brighter glow during flip
        (glow.material as THREE.MeshBasicMaterial).opacity = baseOpacity + flipBoost;
      }
      
      // Glow ring pulse
      const glowRing = coinRef.current.getObjectByName('glowRing') as THREE.Mesh;
      if (glowRing && glowRing.material) {
        const flipSpeed = Math.abs(flipDiff);
        (glowRing.material as THREE.MeshBasicMaterial).opacity = 0.1 + flipSpeed * 0.15;
      }
      
      // Move clouds
      cloudsRef.current.forEach((cloud) => {
        cloud.position.x -= deltaTime * 0.5;
        if (cloud.position.x < -15) {
          cloud.position.x = 15;
        }
      });
      
      // Game physics when playing
      if (gameStateRef.current === 'playing' && isAliveRef.current) {
        // Gravity
        velocityRef.current += GRAVITY * deltaTime;
        coinYRef.current += velocityRef.current * deltaTime;
        
        // Floor collision
        if (coinYRef.current <= FLOOR_Y) {
          coinYRef.current = FLOOR_Y;
          isAliveRef.current = false;
          
          // End game
          gameStateRef.current = 'complete';
          setGameState('complete');
          
          const duration = (Date.now() - gameStartTimeRef.current) / 1000;
          const finalScore = scoreRef.current;
          const accuracy = Math.min(100, finalScore * 10);
          
          if (finalScore > highScoreRef.current) {
            highScoreRef.current = finalScore;
            setHighScore(finalScore);
          }
          
          logGameCompletion({
            gameType: 'flippy_coin',
            gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
            score: finalScore,
            accuracy: accuracy,
            durationSeconds: Math.round(duration),
            additionalData: { obstaclesPassed: finalScore, rngSeed: rngSeedRef.current }
          }).catch(err => console.error('Audit log failed:', err));
          
          onGameCompleteRef.current({
            score: finalScore,
            accuracy: accuracy,
            avgReactionTime: Math.round(duration * 1000 / Math.max(1, finalScore))
          });
          
          return;
        }
        
        // Ceiling
        if (coinYRef.current >= CEILING_Y) {
          coinYRef.current = CEILING_Y;
          velocityRef.current = -2;
        }
        
        coinRef.current.position.y = coinYRef.current;
        
        // Tilt based on velocity
        coinRef.current.rotation.z = Math.max(-0.8, Math.min(0.5, velocityRef.current * 0.06));
        
        // Spawn obstacles
        const rightmostX = obstaclesRef.current.length > 0 
          ? Math.max(...obstaclesRef.current.map(o => o.x))
          : COIN_X + 6;
          
        if (rightmostX < 14) {
          const newX = rightmostX + OBSTACLE_GAP;
          // More varied gap heights for interesting gameplay
          const gapY = (seededRngRef.current.next() - 0.5) * 6;
          
          const topHand = createHand(true);
          const bottomHand = createHand(false);
          
          // Base positions for hands - position so finger tips are at gap edges
          // Top hand: fingers point down (towards y=0 locally), positioned above gap
          // Bottom hand: fingers point up (towards y=0 locally), positioned below gap
          // Finger tips extend about 1.5 units from the hand group origin
          const fingerExtension = 1.5; // How far fingers extend towards gap
          const topBaseY = gapY + GAP_SIZE/2 + fingerExtension;
          const bottomBaseY = gapY - GAP_SIZE/2 - fingerExtension;
          
          topHand.position.set(newX, topBaseY, 0);
          bottomHand.position.set(newX, bottomBaseY, 0);
          
          scene.add(topHand);
          scene.add(bottomHand);
          
          // Random phase offset for staggered movement
          const topPhase = seededRngRef.current.next() * Math.PI * 2;
          const bottomPhase = topPhase + Math.PI; // Opposite phase for staggered effect
          
          obstaclesRef.current.push({
            id: Date.now() + Math.random(),
            x: newX,
            gapY,
            gapSize: GAP_SIZE,
            passed: false,
            topMesh: topHand,
            bottomMesh: bottomHand,
            topPhase,
            bottomPhase,
            topBaseY,
            bottomBaseY,
          });
        }
        
        // Move and check obstacles - direction affects movement
        const toRemove: number[] = [];
        const moveDirection = movingForwardRef.current ? -1 : 1; // Forward = obstacles come at you, Reverse = you go back
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obs = obstaclesRef.current[i];
          obs.x += moveDirection * gameSpeedRef.current * deltaTime;
          obs.topMesh.position.x = obs.x;
          obs.bottomMesh.position.x = obs.x;
          
          // Staggered up/down animation for hands
          const animSpeed = 1.5; // Speed of oscillation
          const animAmplitude = 0.4; // How far they move up/down
          const topOffset = Math.sin(time / 1000 * animSpeed + obs.topPhase) * animAmplitude;
          const bottomOffset = Math.sin(time / 1000 * animSpeed + obs.bottomPhase) * animAmplitude;
          
          obs.topMesh.position.y = obs.topBaseY + topOffset;
          obs.bottomMesh.position.y = obs.bottomBaseY + bottomOffset;
          
          // Score - ONLY for crossing gaps, with accuracy and speed bonuses
          if (!obs.passed && obs.x < COIN_X - 0.5) {
            obs.passed = true;
            gapsPassedRef.current++;
            
            // Calculate accuracy bonus - how centered through the gap
            const gapCenter = obs.gapY;
            const coinY = coinYRef.current;
            const distFromCenter = Math.abs(coinY - gapCenter);
            const maxDist = obs.gapSize / 2;
            const accuracy = Math.max(0, 1 - (distFromCenter / maxDist));
            gapAccuracyRef.current = (gapAccuracyRef.current + accuracy) / 2; // Running average
            
            // Base points: 10 per gap
            let points = 10;
            
            // Accuracy bonus: up to +20 for perfect center
            const accuracyBonus = Math.floor(accuracy * 20);
            points += accuracyBonus;
            
            // Speed bonus: faster time between gaps = more points (up to +15)
            const now = Date.now();
            const timeSinceLastGap = (now - lastGapTimeRef.current) / 1000;
            const speedBonus = Math.max(0, Math.min(15, Math.floor(15 - timeSinceLastGap * 2)));
            points += speedBonus;
            lastGapTimeRef.current = now;
            
            scoreRef.current += points;
            setScore(scoreRef.current);
            
            // CoD-style floating score popup
            const popupType = accuracy > 0.9 ? 'perfect' : accuracy > 0.7 ? 'bonus' : speedBonus > 10 ? 'combo' : 'normal';
            const label = accuracy > 0.9 ? 'PERFECT!' : accuracy > 0.7 ? 'CENTERED!' : speedBonus > 10 ? 'FAST!' : 'GAP';
            addPopupRef.current(points, 50, 40, popupType, label);
            
            // Spawn bonus coin every 10 gaps!
            if (gapsPassedRef.current % 10 === 0) {
              const bonusY = (seededRngRef.current.next() - 0.5) * 6; // Random Y position
              const bonusX = obs.x + OBSTACLE_GAP / 2; // Between this and next obstacle
              const bonusMesh = createBonusCoin(scene, bonusX, bonusY);
              bonusCoinsRef.current.push({
                id: gapsPassedRef.current,
                x: bonusX,
                y: bonusY,
                collected: false,
                mesh: bonusMesh,
              });
              addPopupRef.current(0, 50, 20, 'bonus', '⭐ BONUS COIN AHEAD!');
            }
          }
          
          // Collision
          if (Math.abs(obs.x - COIN_X) < 1.0) {
            const coinY = coinYRef.current;
            const topEdge = obs.gapY + obs.gapSize / 2;
            const bottomEdge = obs.gapY - obs.gapSize / 2;
            
            if (coinY + 0.5 > topEdge || coinY - 0.5 < bottomEdge) {
              isAliveRef.current = false;
              
              gameStateRef.current = 'complete';
              setGameState('complete');
              
              const duration = (Date.now() - gameStartTimeRef.current) / 1000;
              const finalScore = scoreRef.current;
              const accuracy = Math.min(100, finalScore * 10);
              
              if (finalScore > highScoreRef.current) {
                highScoreRef.current = finalScore;
                setHighScore(finalScore);
              }
              
              logGameCompletion({
                gameType: 'flippy_coin',
                gameMode: gameModeRef.current === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
                score: finalScore,
                accuracy: accuracy,
                durationSeconds: Math.round(duration),
                additionalData: { obstaclesPassed: finalScore, rngSeed: rngSeedRef.current }
              }).catch(err => console.error('Audit log failed:', err));
              
              onGameCompleteRef.current({
                score: finalScore,
                accuracy: accuracy,
                avgReactionTime: Math.round(duration * 1000 / Math.max(1, finalScore))
              });
              
              return;
            }
          }
          
          // Remove off-screen
          if (obs.x < -12) {
            toRemove.push(i);
            scene.remove(obs.topMesh);
            scene.remove(obs.bottomMesh);
          }
        }
        
        toRemove.reverse().forEach(i => {
          obstaclesRef.current.splice(i, 1);
        });
        
        // Update bonus coins
        const bonusToRemove: number[] = [];
        bonusCoinsRef.current.forEach((bonus, i) => {
          if (bonus.collected) return;
          
          // Move bonus coin with game speed
          bonus.x -= gameSpeedRef.current * dt;
          bonus.mesh.position.x = bonus.x;
          
          // Rotate and pulse the bonus coin
          bonus.mesh.rotation.y += 0.05;
          const pulseScale = 1 + Math.sin(time / 200) * 0.15;
          bonus.mesh.scale.set(pulseScale, pulseScale, pulseScale);
          
          // Check collision with player coin
          const coinY = coinYRef.current;
          const dist = Math.sqrt(Math.pow(bonus.x - COIN_X, 2) + Math.pow(bonus.y - coinY, 2));
          if (dist < 1.2) {
            // Collected!
            bonus.collected = true;
            bonus.mesh.visible = false;
            
            scoreRef.current += BONUS_COIN_POINTS;
            setScore(scoreRef.current);
            addPopupRef.current(BONUS_COIN_POINTS, 50, 30, 'critical', '⭐ BONUS! +500');
          }
          
          // Remove off-screen
          if (bonus.x < -12) {
            bonusToRemove.push(i);
            scene.remove(bonus.mesh);
          }
        });
        
        bonusToRemove.reverse().forEach(i => {
          bonusCoinsRef.current.splice(i, 1);
        });
      }
      
      renderer.render(scene, camera);
    };
    
    animate(0);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      initializedRef.current = false;
    };
  }, [createCoin, createHand]);
  
  // Screen tap is disabled - use the two buttons instead
  const handleScreenTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't handle - use dedicated buttons
    if (gameStateRef.current === 'ready' || gameStateRef.current === 'complete') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    // Default to forward on screen tap
    handleJumpForward();
  }, [handleJumpForward]);
  
  return (
    <div 
      className="fixed inset-0 w-full h-full bg-sky-400 overflow-hidden"
      style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      {/* CoD-style floating score popups */}
      {gameState === 'playing' && <FloatingScore popups={popups} onRemove={removePopup} />}
      
      {/* Game canvas - clickable during gameplay */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ touchAction: 'none' }}
        onClick={handleScreenTap}
        onTouchStart={handleScreenTap}
      />
      
      {/* Score Display */}
      {(gameState === 'playing' || gameState === 'waiting') && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
          <div className="text-white text-6xl sm:text-8xl font-bold" 
               style={{ textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
            {score}
          </div>
        </div>
      )}
      
      {/* Tap to Start */}
      {gameState === 'waiting' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-white text-3xl sm:text-4xl font-bold mb-4" style={{ textShadow: '2px 2px 0 #000' }}>
              TAP A BUTTON!
            </div>
            <div className="text-white text-lg" style={{ textShadow: '1px 1px 0 #000' }}>
              ⬅️ Reverse • Forward ➡️
            </div>
          </div>
        </div>
      )}
      
      {/* Control Buttons - during waiting and playing */}
      {(gameState === 'waiting' || gameState === 'playing') && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 z-20 px-4">
          {/* Reverse Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleReverse(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleReverse(); }}
            className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl border-4 border-blue-300 active:scale-90 transition-transform"
            style={{ touchAction: 'none' }}
          >
            <div className="text-center">
              <div className="text-4xl sm:text-5xl">⬅️</div>
              <div className="text-white text-sm font-bold mt-1" style={{ textShadow: '1px 1px 0 #000' }}>REVERSE</div>
            </div>
          </button>
          
          {/* Forward Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleJumpForward(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleJumpForward(); }}
            className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-b from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-green-300 active:scale-90 transition-transform"
            style={{ touchAction: 'none' }}
          >
            <div className="text-center">
              <div className="text-4xl sm:text-5xl">➡️</div>
              <div className="text-white text-sm font-bold mt-1" style={{ textShadow: '1px 1px 0 #000' }}>FORWARD</div>
            </div>
          </button>
        </div>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-600 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full">
            <div className="mb-6">
              <div className="text-7xl sm:text-8xl mb-2">🪙</div>
              <h1 className="text-4xl sm:text-6xl font-bold text-white mb-2" style={{ textShadow: '3px 3px 0 #000' }}>
                FLIPPY COIN
              </h1>
              <p className="text-white/90 text-lg" style={{ textShadow: '1px 1px 0 #000' }}>
                Tap to flip through the hands!
              </p>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/30">
              <div className="space-y-2 text-left text-white">
                <p className="flex items-center gap-2"><span className="text-2xl">➡️</span><span><strong>FORWARD</strong> - Jump & move forward</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">⬅️</span><span><strong>REVERSE</strong> - Jump & go back</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">🤚</span><span>Avoid <strong>grabbing hands</strong></span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">🎯</span><span>Points for <strong>crossing gaps</strong> only!</span></p>
                <p className="flex items-center gap-2"><span className="text-2xl">⚡</span><span><strong>Speed + Accuracy</strong> = Bonus points!</span></p>
              </div>
            </div>
            
            {highScore > 0 && (
              <div className="mb-4 text-yellow-300 text-xl font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                🏆 Best: {highScore}
              </div>
            )}
            
            {/* Theme Selector */}
            <div className="mb-4 bg-black/20 rounded-xl p-3">
              <GameThemeSelector
                currentTheme={currentTheme}
                onThemeChange={setCurrentTheme}
                compact={true}
              />
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-5 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold text-2xl sm:text-3xl rounded-2xl shadow-lg border-b-4 border-green-700 active:scale-95 transition-transform"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              PLAY
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full mt-3 px-6 py-3 bg-white/20 text-white font-bold rounded-xl border border-white/30"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30 p-4">
          <div className="text-center max-w-md w-full bg-gradient-to-b from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 border-4 border-amber-300">
            <div className="text-5xl mb-2">💀</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ textShadow: '2px 2px 0 #000' }}>
              GAME OVER
            </h1>
            
            <div className="mb-4">
              {score >= 40 && <div className="text-6xl">🏆</div>}
              {score >= 20 && score < 40 && <div className="text-6xl">🥇</div>}
              {score >= 10 && score < 20 && <div className="text-6xl">🥈</div>}
              {score >= 5 && score < 10 && <div className="text-6xl">🥉</div>}
              {score < 5 && <div className="text-6xl">🪙</div>}
            </div>
            
            <div className="bg-black/30 rounded-xl p-4 mb-6">
              <div className="text-5xl sm:text-6xl font-bold text-white mb-1" style={{ textShadow: '2px 2px 0 #000' }}>
                {score}
              </div>
              <div className="text-amber-200 text-lg">SCORE</div>
              
              {score >= highScore && score > 0 && (
                <div className="mt-3 text-yellow-300 font-bold text-lg animate-pulse">⭐ NEW BEST! ⭐</div>
              )}
              
              <div className="mt-3 text-amber-200">Best: <span className="text-white font-bold">{Math.max(score, highScore)}</span></div>
            </div>
            
            <button
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); startGame(); }}
              className="w-full px-8 py-4 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold text-xl rounded-xl border-b-4 border-green-700 active:scale-95 transition-transform mb-3"
              style={{ textShadow: '1px 1px 0 #000' }}
            >
              🔄 PLAY AGAIN
            </button>
            
            {onExit && (
              <button
                onClick={(e) => { e.stopPropagation(); onExit(); }}
                className="w-full px-6 py-3 bg-white/20 text-white font-bold rounded-xl border border-white/30"
              >
                ← Back to Games
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
