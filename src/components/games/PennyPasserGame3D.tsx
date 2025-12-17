'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { logGameCompletion, GAME_TYPES, GAME_MODES } from '@/lib/gameAudit';

interface CoinSorterGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  gameMode?: 'practice' | 'competition';
  rngSeed?: number;
  competitionId?: string;
}

type CoinType = 'penny' | 'nickel' | 'dime' | 'quarter';
type QuadrantColor = 'cyan' | 'green' | 'purple' | 'red';

interface Coin {
  id: number;
  type: CoinType;
  mesh: THREE.Group;
  x: number;
  y: number;
  isColorCoin: boolean; // Special colored coins match by color
  colorMatch?: QuadrantColor; // If color coin, which quadrant color to match
  isDragging: boolean;
  sorted: boolean;
  isPriority: boolean; // Highlighted coin to sort next
  glowMesh?: THREE.Mesh; // Glow effect mesh
  destinationColor: number; // Color of destination quadrant
  hasBonusShape: boolean; // Special coin with bonus shape indicator
  bonusShapeType?: ShapeType; // The bonus shape shown on coin (different from its normal type)
  bonusQuadrant?: QuadrantColor; // The quadrant this bonus shape belongs to
}

interface Quadrant {
  color: QuadrantColor;
  coinType: CoinType;
  shape: ShapeType; // Shape indicator for this quadrant
  mesh: THREE.Mesh;
  targetMesh: THREE.Mesh; // Bonus zone
  shapeIndicator: THREE.Mesh; // Shape shown in quadrant
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  hexColor: number;
  bonusShapes: THREE.Mesh[];
  matchCount: number;
}

// Coin appearance configurations - VERY DISTINCT SIZES
// Each coin has a unique symbol: Circle, Square, Triangle, Omega
const COIN_CONFIGS = {
  penny: { color: 0xB87333, radius: 0.35, thickness: 0.06, value: 1, shape: 'circle' as const },      // Tiny - Circle (Cyan)
  nickel: { color: 0xC0C0C0, radius: 0.55, thickness: 0.12, value: 5, shape: 'square' as const },     // Medium - Square (Green)
  dime: { color: 0xE8E8E8, radius: 0.25, thickness: 0.04, value: 10, shape: 'triangle' as const },    // Smallest - Triangle (Purple)
  quarter: { color: 0xD4D4D4, radius: 0.75, thickness: 0.15, value: 25, shape: 'omega' as const }     // Largest - OMEGA (Red)
};

// Shape types for quadrants - Omega replaces Pentagon for Red/Quarter!
type ShapeType = 'circle' | 'square' | 'triangle' | 'omega';

// Map shapes to quadrants
const SHAPE_TO_QUADRANT: Record<ShapeType, QuadrantColor> = {
  circle: 'cyan',     // Penny shape
  square: 'green',    // Nickel shape
  triangle: 'purple', // Dime shape
  omega: 'red'        // Quarter shape - RED OMEGA!
};

// Quadrant configurations - neon colors
const QUADRANT_COLORS = {
  cyan: 0x00FFFF,
  green: 0x00FF00,
  purple: 0xFF00FF,
  red: 0xFF0000
};

// Map coin types to their destination quadrant colors
const COIN_TO_QUADRANT_COLOR: Record<CoinType, number> = {
  penny: 0x00FFFF,   // Cyan
  nickel: 0x00FF00,  // Green
  dime: 0xFF00FF,    // Purple
  quarter: 0xFF0000  // Red
};

// Map coin types to their destination quadrant (color name)
const COIN_TO_QUADRANT: Record<CoinType, QuadrantColor> = {
  penny: 'cyan',
  nickel: 'green',
  dime: 'purple',
  quarter: 'red'
};

// Seeded random number generator
class Mulberry32 {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export default function PennyPasserGame3D({ 
  onGameEnd, 
  gameMode = 'practice',
  rngSeed,
  competitionId 
}: CoinSorterGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  
  const scoreRef = useRef(0);
  const coinsRef = useRef<Coin[]>([]);
  const quadrantsRef = useRef<Quadrant[]>([]);
  const draggedCoinRef = useRef<Coin | null>(null);
  const lastCoinIdRef = useRef(0);
  const totalCoinsRef = useRef(0);
  const correctSortsRef = useRef(0);
  const comboRef = useRef(0);
  const gameStartTimeRef = useRef(0);
  const rngRef = useRef<Mulberry32 | null>(null);
  const priorityCoinRef = useRef<Coin | null>(null);
  const targetZoneRef = useRef<THREE.Group | null>(null); // Moving target zone indicator
  const trickShapeRef = useRef<{ shape: ShapeType; coinType: CoinType; color: number } | null>(null); // Trick shape asking for different coin
  const trickShapeMeshRef = useRef<THREE.Mesh | null>(null); // The trick shape mesh in target zone
  
  // Initialize seeded RNG
  useEffect(() => {
    if (rngSeed !== undefined) {
      rngRef.current = new Mulberry32(rngSeed);
    }
  }, [rngSeed]);
  
  const getRandom = useCallback(() => {
    return rngRef.current ? rngRef.current.next() : Math.random();
  }, []);

  // Create realistic 3D coin mesh with destination color glow and shape indicator
  // bonusShape param: if set, adds a SECOND shape indicator in a different color for bonus placement
  const createCoinMesh = useCallback((
    type: CoinType, 
    isColorCoin: boolean, 
    colorMatch?: QuadrantColor,
    bonusShapeType?: ShapeType,
    bonusQuadrant?: QuadrantColor
  ): { group: THREE.Group; glowMesh: THREE.Mesh; destinationColor: number } => {
    const config = COIN_CONFIGS[type];
    const group = new THREE.Group();
    
    // Determine destination color (quadrant this coin belongs to)
    let destinationColor: number;
    if (isColorCoin && colorMatch) {
      destinationColor = QUADRANT_COLORS[colorMatch];
    } else {
      destinationColor = COIN_TO_QUADRANT_COLOR[type];
    }
    
    // Main coin body (cylinder) - VERY DISTINCT SIZES
    const coinGeometry = new THREE.CylinderGeometry(config.radius, config.radius, config.thickness, 32);
    const coinMaterial = new THREE.MeshStandardMaterial({
      color: config.color, // Original coin color
      metalness: 0.8,
      roughness: 0.2,
      emissive: destinationColor, // Glow with destination color
      emissiveIntensity: 0.5
    });
    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    coinMesh.rotation.x = Math.PI / 2; // Lay flat
    group.add(coinMesh);
    
    // Coin rim (torus for edge detail) - glows with destination color
    const rimGeometry = new THREE.TorusGeometry(config.radius, config.thickness / 3, 8, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: destinationColor,
      metalness: 0.9,
      roughness: 0.1,
      emissive: destinationColor,
      emissiveIntensity: 0.8
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.rotation.x = Math.PI / 2;
    group.add(rimMesh);
    
    // Add SHAPE indicator on coin face (matches the quadrant shape)
    let shapeGeometry: THREE.BufferGeometry;
    const shapeSize = config.radius * 0.5;
    switch (config.shape) {
      case 'circle':
        shapeGeometry = new THREE.RingGeometry(shapeSize * 0.5, shapeSize * 0.8, 32);
        break;
      case 'square':
        shapeGeometry = new THREE.PlaneGeometry(shapeSize * 1.2, shapeSize * 1.2);
        break;
      case 'triangle':
        shapeGeometry = new THREE.CircleGeometry(shapeSize * 0.8, 3);
        break;
      case 'omega':
        // Create proper OMEGA (Ω) symbol - Greek letter
        const omegaShape = new THREE.Shape();
        const s = shapeSize * 1.0;
        // Start from left foot, draw the actual Omega shape
        // Left foot (horizontal line at bottom left)
        omegaShape.moveTo(-s * 0.7, -s * 0.4);
        omegaShape.lineTo(-s * 0.4, -s * 0.4);
        // Go up to the arc
        omegaShape.lineTo(-s * 0.4, -s * 0.15);
        // Draw the main arc (the "U" part of omega, but inverted - like a dome)
        omegaShape.bezierCurveTo(
          -s * 0.5, s * 0.5,  // control point 1
          s * 0.5, s * 0.5,   // control point 2  
          s * 0.4, -s * 0.15  // end point
        );
        // Go down to right foot
        omegaShape.lineTo(s * 0.4, -s * 0.4);
        // Right foot (horizontal line at bottom right)
        omegaShape.lineTo(s * 0.7, -s * 0.4);
        shapeGeometry = new THREE.ShapeGeometry(omegaShape);
        break;
    }
    
    // Shape is WHITE/NEUTRAL - does NOT give away destination color!
    const shapeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF, // WHITE - neutral, doesn't give away answer
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const shapeMesh = new THREE.Mesh(shapeGeometry, shapeMaterial);
    shapeMesh.position.z = config.thickness / 2 + 0.02;
    group.add(shapeMesh);
    
    // Add BONUS SHAPE indicator if this is a bonus coin
    // Shows a DIFFERENT colored shape indicating alternate placement for +200 points
    if (bonusShapeType && bonusQuadrant) {
      const bonusColor = QUADRANT_COLORS[bonusQuadrant];
      let bonusShapeGeometry: THREE.BufferGeometry;
      const bonusShapeSize = config.radius * 0.35; // Smaller than main shape
      
      switch (bonusShapeType) {
        case 'circle':
          bonusShapeGeometry = new THREE.RingGeometry(bonusShapeSize * 0.5, bonusShapeSize * 0.8, 32);
          break;
        case 'square':
          bonusShapeGeometry = new THREE.PlaneGeometry(bonusShapeSize * 1.2, bonusShapeSize * 1.2);
          break;
        case 'triangle':
          bonusShapeGeometry = new THREE.CircleGeometry(bonusShapeSize * 0.8, 3);
          break;
        case 'omega':
          // Proper OMEGA (Ω) shape for bonus
          const omegaBonusShape = new THREE.Shape();
          const bs = bonusShapeSize * 1.0;
          omegaBonusShape.moveTo(-bs * 0.7, -bs * 0.4);
          omegaBonusShape.lineTo(-bs * 0.4, -bs * 0.4);
          omegaBonusShape.lineTo(-bs * 0.4, -bs * 0.15);
          omegaBonusShape.bezierCurveTo(-bs * 0.5, bs * 0.5, bs * 0.5, bs * 0.5, bs * 0.4, -bs * 0.15);
          omegaBonusShape.lineTo(bs * 0.4, -bs * 0.4);
          omegaBonusShape.lineTo(bs * 0.7, -bs * 0.4);
          bonusShapeGeometry = new THREE.ShapeGeometry(omegaBonusShape);
          break;
      }
      
      // Bonus shape indicator - WHITE, doesn't give away answer
      const bonusShapeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, // WHITE - neutral
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
      });
      const bonusShapeMesh = new THREE.Mesh(bonusShapeGeometry, bonusShapeMaterial);
      bonusShapeMesh.position.set(config.radius * 0.4, config.radius * 0.4, config.thickness / 2 + 0.03);
      bonusShapeMesh.name = 'bonusShape';
      group.add(bonusShapeMesh);
      
      // Pulsing glow ring around bonus shape - WHITE, no color hints!
      const bonusGlowGeometry = new THREE.RingGeometry(bonusShapeSize * 1.2, bonusShapeSize * 1.5, 16);
      const bonusGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, // WHITE - no color hint!
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const bonusGlowMesh = new THREE.Mesh(bonusGlowGeometry, bonusGlowMaterial);
      bonusGlowMesh.position.set(config.radius * 0.4, config.radius * 0.4, config.thickness / 2 + 0.025);
      bonusGlowMesh.name = 'bonusGlow';
      group.add(bonusGlowMesh);
    }
    
    // Glow effect - always present, shows destination quadrant color
    const glowGeometry = new THREE.CircleGeometry(config.radius * 1.6, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: destinationColor,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = -0.1;
    group.add(glowMesh);
    
    // Priority indicator ring (hidden by default, shown when priority)
    const priorityRingGeometry = new THREE.RingGeometry(config.radius * 1.7, config.radius * 2.0, 32);
    const priorityRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const priorityRing = new THREE.Mesh(priorityRingGeometry, priorityRingMaterial);
    priorityRing.position.z = -0.05;
    priorityRing.name = 'priorityRing';
    group.add(priorityRing);
    
    return { group, glowMesh, destinationColor };
  }, []);

  // Create quadrant with neon glow and shape indicator
  const createQuadrant = useCallback((
    color: QuadrantColor,
    coinType: CoinType,
    shape: ShapeType,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): Quadrant => {
    const hexColor = QUADRANT_COLORS[color];
    
    // Main quadrant plane
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(centerX, centerY, -0.5);
    
    // Border glow
    const borderGeometry = new THREE.EdgesGeometry(geometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: hexColor,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.position.set(centerX, centerY, -0.4);
    sceneRef.current?.add(border);
    
    // Create LARGE shape indicator in center of quadrant
    let shapeIndicatorGeometry: THREE.BufferGeometry;
    switch (shape) {
      case 'circle':
        shapeIndicatorGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
        break;
      case 'square':
        // Create square outline using edges
        const squareShape = new THREE.PlaneGeometry(1.8, 1.8);
        shapeIndicatorGeometry = new THREE.EdgesGeometry(squareShape);
        break;
      case 'triangle':
        shapeIndicatorGeometry = new THREE.RingGeometry(0.8, 1.0, 3);
        break;
      case 'omega':
        // Large proper OMEGA (Ω) indicator for quadrant
        const omegaIndicator = new THREE.Shape();
        const os = 1.2;
        omegaIndicator.moveTo(-os * 0.7, -os * 0.4);
        omegaIndicator.lineTo(-os * 0.4, -os * 0.4);
        omegaIndicator.lineTo(-os * 0.4, -os * 0.15);
        omegaIndicator.bezierCurveTo(-os * 0.5, os * 0.5, os * 0.5, os * 0.5, os * 0.4, -os * 0.15);
        omegaIndicator.lineTo(os * 0.4, -os * 0.4);
        omegaIndicator.lineTo(os * 0.7, -os * 0.4);
        shapeIndicatorGeometry = new THREE.ShapeGeometry(omegaIndicator);
        break;
    }
    
    const shapeIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF, // WHITE - no color hint! Shape recognition only!
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const shapeIndicator = new THREE.Mesh(shapeIndicatorGeometry, shapeIndicatorMaterial);
    shapeIndicator.position.set(centerX, centerY, -0.25);
    sceneRef.current?.add(shapeIndicator);
    
    // Target zone (bonus area) - center of quadrant
    const targetGeometry = new THREE.CircleGeometry(1.2, 32);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
    targetMesh.position.set(centerX, centerY, -0.35);
    
    // Add pulsing ring around target
    const ringGeometry = new THREE.RingGeometry(1.0, 1.3, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.set(centerX, centerY, -0.2);
    sceneRef.current?.add(ringMesh);
    
    // Create bonus shapes (10 per quadrant) - VISIBLE symbols showing what coin belongs here
    const bonusShapes: THREE.Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      let bonusGeometry: THREE.BufferGeometry;
      
      // Shape matches the coin type that belongs in this quadrant
      switch (shape) {
        case 'circle':
          bonusGeometry = new THREE.RingGeometry(0.15, 0.22, 32); // Circle outline
          break;
        case 'square':
          bonusGeometry = new THREE.PlaneGeometry(0.35, 0.35); // Filled square
          break;
        case 'triangle':
          bonusGeometry = new THREE.CircleGeometry(0.22, 3); // Triangle
          break;
        case 'omega':
          // Small proper OMEGA (Ω) for bonus shape
          const omegaBonus = new THREE.Shape();
          const ob = 0.25;
          omegaBonus.moveTo(-ob * 0.7, -ob * 0.4);
          omegaBonus.lineTo(-ob * 0.4, -ob * 0.4);
          omegaBonus.lineTo(-ob * 0.4, -ob * 0.15);
          omegaBonus.bezierCurveTo(-ob * 0.5, ob * 0.5, ob * 0.5, ob * 0.5, ob * 0.4, -ob * 0.15);
          omegaBonus.lineTo(ob * 0.4, -ob * 0.4);
          omegaBonus.lineTo(ob * 0.7, -ob * 0.4);
          bonusGeometry = new THREE.ShapeGeometry(omegaBonus);
          break;
      }
      
      const shapeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, // WHITE - no color hint! Shape recognition only!
        transparent: true,
        opacity: 0.25, // Subtle but visible
        side: THREE.DoubleSide
      });
      const shapeMesh = new THREE.Mesh(bonusGeometry, shapeMaterial);
      
      // Random position within quadrant - spread out nicely
      const angle = (i / 10) * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1.5;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      shapeMesh.position.set(centerX + offsetX, centerY + offsetY, -0.15);
      shapeMesh.visible = true; // ALWAYS VISIBLE - shows what shape belongs here
      shapeMesh.rotation.z = Math.random() * Math.PI * 2; // Random rotation
      
      sceneRef.current?.add(shapeMesh);
      bonusShapes.push(shapeMesh);
    }
    
    return {
      color,
      coinType,
      shape,
      mesh,
      targetMesh,
      shapeIndicator,
      bounds: {
        minX: centerX - width / 2,
        maxX: centerX + width / 2,
        minY: centerY - height / 2,
        maxY: centerY + height / 2
      },
      hexColor,
      bonusShapes,
      matchCount: 0
    };
  }, []);

  // Update priority coin and target zone
  const updatePriorityCoin = useCallback(() => {
    if (!sceneRef.current) return;
    
    // Find first unsorted coin that's not being dragged
    const availableCoins = coinsRef.current.filter(c => !c.sorted && !c.isDragging);
    
    // Reset all coins' priority state
    coinsRef.current.forEach(coin => {
      coin.isPriority = false;
      // Hide priority ring
      const priorityRing = coin.mesh.getObjectByName('priorityRing');
      if (priorityRing && priorityRing instanceof THREE.Mesh && priorityRing.material instanceof THREE.MeshBasicMaterial) {
        priorityRing.material.opacity = 0;
      }
    });
    
    if (availableCoins.length > 0) {
      const priorityCoin = availableCoins[0];
      priorityCoin.isPriority = true;
      priorityCoinRef.current = priorityCoin;
      
      // Show priority ring with pulsing animation
      const priorityRing = priorityCoin.mesh.getObjectByName('priorityRing');
      if (priorityRing && priorityRing instanceof THREE.Mesh && priorityRing.material instanceof THREE.MeshBasicMaterial) {
        priorityRing.material.opacity = 0.8;
        priorityRing.material.color.setHex(priorityCoin.destinationColor);
      }
      
      // Update target zone position to random spot in destination quadrant
      updateTargetZone(priorityCoin);
    } else {
      priorityCoinRef.current = null;
      // Hide target zone
      if (targetZoneRef.current) {
        targetZoneRef.current.visible = false;
      }
    }
  }, []);

  // Update target zone to show where to place the priority coin
  // TRICK MECHANIC: ~17% chance to show a DIFFERENT coin's shape inside the target
  // If the shape is a pentagon in the blue quadrant, it's asking for a RED coin (quarter)!
  const updateTargetZone = useCallback((coin: Coin) => {
    if (!sceneRef.current || !targetZoneRef.current) return;
    
    // Find the destination quadrant for this coin
    let targetQuadrant: Quadrant | null = null;
    
    if (coin.isColorCoin && coin.colorMatch) {
      targetQuadrant = quadrantsRef.current.find(q => q.color === coin.colorMatch) || null;
    } else {
      targetQuadrant = quadrantsRef.current.find(q => q.coinType === coin.type) || null;
    }
    
    if (targetQuadrant) {
      // Random position within the quadrant
      const randomX = targetQuadrant.bounds.minX + (getRandom() * 0.6 + 0.2) * (targetQuadrant.bounds.maxX - targetQuadrant.bounds.minX);
      const randomY = targetQuadrant.bounds.minY + (getRandom() * 0.6 + 0.2) * (targetQuadrant.bounds.maxY - targetQuadrant.bounds.minY);
      
      targetZoneRef.current.position.set(randomX, randomY, 0);
      targetZoneRef.current.visible = true;
      
      // ALWAYS show a TRICK SHAPE - target zone shows a DIFFERENT coin's symbol!
      // This forces players to identify the symbol, not just the quadrant color
      // Example: Blue quadrant shows RED OMEGA = place QUARTER here for bonus!
      {
        // Pick a DIFFERENT coin type than the quadrant's normal coin
        const coinTypes: CoinType[] = ['penny', 'nickel', 'dime', 'quarter'];
        const otherCoinTypes = coinTypes.filter(t => t !== targetQuadrant!.coinType);
        const trickCoinType = otherCoinTypes[Math.floor(getRandom() * otherCoinTypes.length)];
        const trickConfig = COIN_CONFIGS[trickCoinType];
        const trickColor = COIN_TO_QUADRANT_COLOR[trickCoinType];
        
        // Store trick shape info
        trickShapeRef.current = {
          shape: trickConfig.shape,
          coinType: trickCoinType,
          color: trickColor
        };
        
        // Helper function to create proper OMEGA (Ω) geometry
        const createOmegaGeometry = (size: number): THREE.BufferGeometry => {
          const omegaShape = new THREE.Shape();
          const s = size;
          // Left foot
          omegaShape.moveTo(-s * 0.7, -s * 0.4);
          omegaShape.lineTo(-s * 0.4, -s * 0.4);
          omegaShape.lineTo(-s * 0.4, -s * 0.15);
          // Main arc (dome shape)
          omegaShape.bezierCurveTo(
            -s * 0.5, s * 0.5,
            s * 0.5, s * 0.5,
            s * 0.4, -s * 0.15
          );
          // Right foot
          omegaShape.lineTo(s * 0.4, -s * 0.4);
          omegaShape.lineTo(s * 0.7, -s * 0.4);
          return new THREE.ShapeGeometry(omegaShape);
        };
        
        // Update the trick shape mesh
        if (trickShapeMeshRef.current) {
          // Remove old geometry and create new one based on shape
          const oldGeometry = trickShapeMeshRef.current.geometry;
          let newGeometry: THREE.BufferGeometry;
          
          switch (trickConfig.shape) {
            case 'circle':
              newGeometry = new THREE.RingGeometry(0.2, 0.4, 32);
              break;
            case 'square':
              newGeometry = new THREE.PlaneGeometry(0.7, 0.7);
              break;
            case 'triangle':
              newGeometry = new THREE.CircleGeometry(0.4, 3);
              break;
            case 'omega':
              newGeometry = createOmegaGeometry(0.4);
              break;
            default:
              newGeometry = new THREE.CircleGeometry(0.4, 32);
          }
          
          trickShapeMeshRef.current.geometry = newGeometry;
          oldGeometry.dispose();
          
          // Shape is WHITE - no color hint! Player must recognize the shape!
          if (trickShapeMeshRef.current.material instanceof THREE.MeshBasicMaterial) {
            trickShapeMeshRef.current.material.color.setHex(0xFFFFFF); // WHITE - neutral
          }
        }
        
        // Glow is also WHITE - no color hint!
        const trickGlow = targetZoneRef.current.getObjectByName('trickGlow');
        if (trickGlow instanceof THREE.Mesh && trickGlow.material instanceof THREE.MeshBasicMaterial) {
          trickGlow.material.color.setHex(0xFFFFFF); // WHITE - neutral
        }
        
        console.log(`🎯 TRICK TARGET: ${targetQuadrant.color} quadrant shows ${trickConfig.shape} (${trickCoinType}) - place ${trickCoinType} for +200 bonus!`);
      }
      
      // Update outer circle and crosshairs to match the quadrant color (where it is)
      const outerCircle = targetZoneRef.current.getObjectByName('outerCircle');
      if (outerCircle instanceof THREE.Mesh && outerCircle.material instanceof THREE.MeshBasicMaterial) {
        outerCircle.material.color.setHex(targetQuadrant.hexColor);
      }
      
      // Update crosshairs
      targetZoneRef.current.children.forEach(child => {
        if (child instanceof THREE.Line && child.material instanceof THREE.LineBasicMaterial) {
          child.material.color.setHex(targetQuadrant!.hexColor);
        }
      });
    }
  }, [getRandom]);

  // Spawn a new coin
  // ~10 bonus shape coins per minute (60s/10 = every 6s, with ~1 coin/second spawn = ~17% chance)
  const spawnCoin = useCallback(() => {
    if (!sceneRef.current) return;
    
    const coinTypes: CoinType[] = ['penny', 'nickel', 'dime', 'quarter'];
    const quadrantColors: QuadrantColor[] = ['cyan', 'green', 'purple', 'red'];
    const shapeTypes: ShapeType[] = ['circle', 'square', 'triangle', 'omega'];
    
    // 15% chance for color coin
    const isColorCoin = getRandom() < 0.15;
    const coinType = coinTypes[Math.floor(getRandom() * coinTypes.length)];
    const colorMatch = isColorCoin ? quadrantColors[Math.floor(getRandom() * quadrantColors.length)] : undefined;
    
    // ~17% chance for bonus shape coin (approximately 10 per minute)
    const hasBonusShape = getRandom() < 0.17;
    let bonusShapeType: ShapeType | undefined;
    let bonusQuadrant: QuadrantColor | undefined;
    
    if (hasBonusShape && !isColorCoin) {
      // Pick a DIFFERENT quadrant than the coin's normal destination
      const normalQuadrant = COIN_TO_QUADRANT[coinType];
      const otherQuadrants = quadrantColors.filter(c => c !== normalQuadrant);
      bonusQuadrant = otherQuadrants[Math.floor(getRandom() * otherQuadrants.length)];
      
      // Get the shape of the bonus quadrant
      const bonusQuadrantData = quadrantsRef.current.find(q => q.color === bonusQuadrant);
      bonusShapeType = bonusQuadrantData?.shape;
    }
    
    const { group: coinMesh, glowMesh, destinationColor } = createCoinMesh(
      coinType, 
      isColorCoin, 
      colorMatch,
      bonusShapeType,
      bonusQuadrant
    );
    
    // Spawn in center area with some randomness
    const x = (getRandom() - 0.5) * 3;
    const y = (getRandom() - 0.5) * 3;
    coinMesh.position.set(x, y, 0);
    
    const coin: Coin = {
      id: ++lastCoinIdRef.current,
      type: coinType,
      mesh: coinMesh,
      x,
      y,
      isColorCoin,
      colorMatch,
      isDragging: false,
      sorted: false,
      isPriority: false,
      glowMesh,
      destinationColor,
      hasBonusShape: hasBonusShape && !isColorCoin && !!bonusShapeType,
      bonusShapeType,
      bonusQuadrant
    };
    
    sceneRef.current.add(coinMesh);
    coinsRef.current.push(coin);
    totalCoinsRef.current++;
    
    // Update priority coin
    updatePriorityCoin();
    
    return coin;
  }, [createCoinMesh, getRandom, updatePriorityCoin]);

  // Check if coin is in correct quadrant
  // Now includes:
  // - bonusShapePlacement: coin with bonus shape placed in bonus quadrant (+200)
  // - trickShapePlacement: coin matches the TRICK shape in target zone (+200)
  // - wrongTrickPlacement: non-trick coin placed in target zone with trick shape (-points)
  const checkCoinPlacement = useCallback((coin: Coin, x: number, y: number): { 
    correct: boolean; 
    bonus: boolean; 
    perfectBonus: boolean; 
    quadrant: Quadrant | null;
    bonusShapePlacement: boolean; // Bonus shape coin placed in bonus quadrant (+200)
    trickShapePlacement: boolean; // Coin matches the trick shape in target zone (+200)
    wrongBonusPlacement: boolean; // Wrong coin placed when trick expected (-points)
  } => {
    for (const quadrant of quadrantsRef.current) {
      if (x >= quadrant.bounds.minX && x <= quadrant.bounds.maxX &&
          y >= quadrant.bounds.minY && y <= quadrant.bounds.maxY) {
        
        let isCorrect = false;
        
        if (coin.isColorCoin && coin.colorMatch) {
          // Color coins match by color
          isCorrect = coin.colorMatch === quadrant.color;
        } else {
          // Regular coins match by type
          isCorrect = coin.type === quadrant.coinType;
        }
        
        // Check for BONUS SHAPE placement (on coin itself)
        // If coin has bonus shape and is placed in the bonus quadrant = +200 points!
        let bonusShapePlacement = false;
        if (coin.hasBonusShape && coin.bonusQuadrant && coin.bonusQuadrant === quadrant.color) {
          bonusShapePlacement = true;
          isCorrect = true; // Bonus placement is also correct!
        }
        
        // Check if in target zone indicator
        let isPerfectBonus = false;
        let trickShapePlacement = false;
        let wrongTrickPlacement = false;
        
        if (targetZoneRef.current && targetZoneRef.current.visible) {
          const targetX = targetZoneRef.current.position.x;
          const targetY = targetZoneRef.current.position.y;
          const distanceToIndicator = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
          const inTargetZone = distanceToIndicator < 1.5; // Within target zone
          
          if (inTargetZone) {
            // Check if there's a TRICK SHAPE active
            if (trickShapeRef.current) {
              // Trick shape is asking for a DIFFERENT coin!
              if (coin.type === trickShapeRef.current.coinType) {
                // Player understood the trick - they placed the correct coin!
                trickShapePlacement = true;
                isCorrect = true; // Override - this is correct!
                isPerfectBonus = distanceToIndicator < 1.0;
                console.log(`🎯 TRICK SUCCESS! Placed ${coin.type} in trick target (+200 bonus!)`);
              } else if (coin.type === quadrant.coinType) {
                // Player placed the "obvious" coin but missed the trick
                wrongTrickPlacement = true; // Penalty!
                console.log(`❌ TRICK FAILED! Placed ${coin.type} but target wanted ${trickShapeRef.current.coinType}`);
              }
            } else {
              // No trick - normal target zone bonus
              isPerfectBonus = distanceToIndicator < 1.0 && isCorrect;
            }
          }
        }
        
        // Check if in general bonus zone (center of quadrant)
        const centerX = (quadrant.bounds.minX + quadrant.bounds.maxX) / 2;
        const centerY = (quadrant.bounds.minY + quadrant.bounds.maxY) / 2;
        const distanceToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const isBonus = distanceToCenter < 1.5;
        
        return { 
          correct: isCorrect, 
          bonus: isBonus && isCorrect, 
          perfectBonus: isPerfectBonus, 
          quadrant,
          bonusShapePlacement,
          trickShapePlacement,
          wrongBonusPlacement: wrongTrickPlacement
        };
      }
    }
    
    return { correct: false, bonus: false, perfectBonus: false, quadrant: null, bonusShapePlacement: false, trickShapePlacement: false, wrongBonusPlacement: false };
  }, []);

  // Handle coin drop
  const handleCoinDrop = useCallback((coin: Coin) => {
    const result = checkCoinPlacement(coin, coin.x, coin.y);
    
    if (result.correct) {
      correctSortsRef.current++;
      comboRef.current++;
      setCombo(comboRef.current);
      
      // Base points based on coin value
      const coinValue = COIN_CONFIGS[coin.type].value;
      let points = coinValue * 10;
      
      // Combo multiplier
      const comboMultiplier = Math.min(5, 1 + comboRef.current * 0.2);
      points = Math.floor(points * comboMultiplier);
      
      // *** BONUS SHAPE PLACEMENT - +200 points! ***
      // If coin has bonus shape and was placed in the bonus quadrant
      if (result.bonusShapePlacement) {
        points += 200; // Big bonus for bonus shape placement!
        console.log('🌟 BONUS SHAPE PLACEMENT! +200 points');
        
        // Flash the bonus shape on the coin
        coin.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name === 'bonusGlow') {
            if (child.material instanceof THREE.MeshBasicMaterial) {
              const originalOpacity = child.material.opacity;
              child.material.opacity = 1.0;
              setTimeout(() => {
                if (child.material instanceof THREE.MeshBasicMaterial) {
                  child.material.opacity = originalOpacity;
                }
              }, 300);
            }
          }
        });
      }
      
      // *** TRICK SHAPE PLACEMENT - +200 points! ***
      // If target zone had a trick shape and player put the CORRECT (trick) coin there!
      if (result.trickShapePlacement) {
        points += 200; // Big bonus for solving the trick!
        console.log('🎯 TRICK SHAPE SOLVED! +200 points');
        
        // Flash the trick shape in the target zone
        if (targetZoneRef.current) {
          const trickShape = targetZoneRef.current.getObjectByName('trickShape');
          if (trickShape instanceof THREE.Mesh && trickShape.material instanceof THREE.MeshBasicMaterial) {
            const originalColor = trickShape.material.color.getHex();
            trickShape.material.color.setHex(0xFFFFFF); // Flash white
            setTimeout(() => {
              if (trickShape.material instanceof THREE.MeshBasicMaterial) {
                trickShape.material.color.setHex(originalColor);
              }
            }, 300);
          }
        }
      }
      
      // Bonus for hitting target zone indicator (PERFECT ACCURACY)
      if (result.perfectBonus) {
        points += 250; // Big bonus for perfect placement!
        
        // Flash effect on target zone
        if (targetZoneRef.current) {
          targetZoneRef.current.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
              const originalOpacity = child.material.opacity;
              child.material.opacity = 1.0;
              setTimeout(() => {
                if (child.material instanceof THREE.MeshBasicMaterial) {
                  child.material.opacity = originalOpacity;
                }
              }, 200);
            }
          });
        }
      }
      
      // Bonus for general placement in quadrant center
      if (result.bonus) {
        points += 100;
        
        // Light up a bonus shape (make it brighter/glow)
        if (result.quadrant && result.quadrant.matchCount < 10) {
          const shapeIndex = result.quadrant.matchCount;
          const bonusShape = result.quadrant.bonusShapes[shapeIndex];
          if (bonusShape && bonusShape.material instanceof THREE.MeshBasicMaterial) {
            // Make shape bright and fully visible (was subtle, now glowing)
            bonusShape.material.opacity = 1.0;
            bonusShape.scale.setScalar(1.5); // Make it bigger
          }
          result.quadrant.matchCount++;
        }
      }
      
      // Color coin bonus
      if (coin.isColorCoin) {
        points += 50;
      }
      
      // Speed bonus (faster = more points)
      const gameTime = (Date.now() - gameStartTimeRef.current) / 1000;
      const speedBonus = Math.max(0, Math.floor(20 - gameTime / 3));
      points += speedBonus;
      
      scoreRef.current += points;
      setScore(scoreRef.current);
      
      // Visual feedback - coin disappears with effect
      if (coin.mesh) {
        const originalScale = coin.mesh.scale.clone();
        
        // Animate scale up then remove
        let frame = 0;
        const animateDisappear = () => {
          frame++;
          if (frame < 10) {
            coin.mesh.scale.multiplyScalar(1.1);
            coin.mesh.rotation.z += 0.3;
            requestAnimationFrame(animateDisappear);
          } else {
            sceneRef.current?.remove(coin.mesh);
          }
        };
        animateDisappear();
      }
      
      coin.sorted = true;
    } else {
      // Wrong placement - reset combo
      comboRef.current = 0;
      setCombo(0);
      
      // Return coin to center
      coin.x = (getRandom() - 0.5) * 3;
      coin.y = (getRandom() - 0.5) * 3;
      coin.mesh.position.set(coin.x, coin.y, 0);
      
      // Penalty - EXTRA penalty if wrong coin placed in trick target zone!
      let penalty = 10;
      if (result.wrongBonusPlacement) {
        penalty = 50; // Bigger penalty for ignoring the trick shape!
        console.log('❌ TRICK FAILED! -50 penalty for placing wrong coin in trick target');
        
        // Flash trick shape red to indicate failure
        if (targetZoneRef.current) {
          const trickGlow = targetZoneRef.current.getObjectByName('trickGlow');
          if (trickGlow instanceof THREE.Mesh && trickGlow.material instanceof THREE.MeshBasicMaterial) {
            trickGlow.material.color.setHex(0xFF0000); // Flash red for failure
            trickGlow.material.opacity = 1.0;
            setTimeout(() => {
              if (trickGlow.material instanceof THREE.MeshBasicMaterial) {
                trickGlow.material.color.setHex(0xFFFFFF); // Back to WHITE
                trickGlow.material.opacity = 0.6;
              }
            }, 500);
          }
        }
      }
      scoreRef.current = Math.max(0, scoreRef.current - penalty);
      setScore(scoreRef.current);
    }
    
    // Update accuracy
    if (totalCoinsRef.current > 0) {
      const newAccuracy = (correctSortsRef.current / totalCoinsRef.current) * 100;
      setAccuracy(newAccuracy);
    }
    
    coin.isDragging = false;
    draggedCoinRef.current = null;
    
    // Update priority coin after sorting
    updatePriorityCoin();
  }, [checkCoinPlacement, getRandom, updatePriorityCoin]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    sceneRef.current = scene;
    
    // Camera (orthographic for 2D-like view)
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const frustumSize = 15;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100
    );
    camera.position.z = 10;
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 10);
    scene.add(pointLight);
    
    // Create 4 quadrants with SHAPE indicators (no text labels)
    const quadrantWidth = 6;
    const quadrantHeight = 5;
    const offset = 4;
    
    // Top-Left: CYAN (Penny = Circle shape, smallest)
    const cyanQuadrant = createQuadrant('cyan', 'penny', 'circle', -offset, offset, quadrantWidth, quadrantHeight);
    scene.add(cyanQuadrant.mesh);
    scene.add(cyanQuadrant.targetMesh);
    
    // Top-Right: GREEN (Nickel = Square shape, medium)
    const greenQuadrant = createQuadrant('green', 'nickel', 'square', offset, offset, quadrantWidth, quadrantHeight);
    scene.add(greenQuadrant.mesh);
    scene.add(greenQuadrant.targetMesh);
    
    // Bottom-Left: PURPLE (Dime = Triangle shape, tiny)
    const purpleQuadrant = createQuadrant('purple', 'dime', 'triangle', -offset, -offset, quadrantWidth, quadrantHeight);
    scene.add(purpleQuadrant.mesh);
    scene.add(purpleQuadrant.targetMesh);
    
    // Bottom-Right: RED (Quarter = OMEGA shape, largest)
    const redQuadrant = createQuadrant('red', 'quarter', 'omega', offset, -offset, quadrantWidth, quadrantHeight);
    scene.add(redQuadrant.mesh);
    scene.add(redQuadrant.targetMesh);
    
    quadrantsRef.current = [cyanQuadrant, greenQuadrant, purpleQuadrant, redQuadrant];
    
    // Center zone
    const centerGeometry = new THREE.CircleGeometry(2, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0x333366,
      transparent: true,
      opacity: 0.3
    });
    const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
    centerMesh.position.z = -0.6;
    scene.add(centerMesh);
    
    // Create target zone indicator (shows where to place priority coin)
    // NOW WITH TRICK SHAPE - a shape in the center that asks for a DIFFERENT coin!
    const targetZoneGroup = new THREE.Group();
    
    // Outer accuracy circle (main target area)
    const targetCircleGeometry = new THREE.RingGeometry(1.0, 1.2, 32);
    const targetCircleMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const targetCircle = new THREE.Mesh(targetCircleGeometry, targetCircleMaterial);
    targetCircle.name = 'outerCircle';
    targetZoneGroup.add(targetCircle);
    
    // Inner background circle for the trick shape
    const innerBgGeometry = new THREE.CircleGeometry(0.7, 32);
    const innerBgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6
    });
    const innerBg = new THREE.Mesh(innerBgGeometry, innerBgMaterial);
    innerBg.position.z = 0.01;
    targetZoneGroup.add(innerBg);
    
    // TRICK SHAPE - this shape indicates which coin should ACTUALLY go here for bonus!
    // WHITE/NEUTRAL - no color hint! Player must recognize the shape!
    const trickShapeGeometry = new THREE.CircleGeometry(0.45, 5); // Pentagon by default
    const trickShapeMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF, // WHITE - no color hint!
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const trickShape = new THREE.Mesh(trickShapeGeometry, trickShapeMaterial);
    trickShape.name = 'trickShape';
    trickShape.position.z = 0.02;
    targetZoneGroup.add(trickShape);
    trickShapeMeshRef.current = trickShape;
    
    // Glow ring around trick shape - also WHITE
    const trickGlowGeometry = new THREE.RingGeometry(0.5, 0.65, 32);
    const trickGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF, // WHITE - no color hint!
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const trickGlow = new THREE.Mesh(trickGlowGeometry, trickGlowMaterial);
    trickGlow.name = 'trickGlow';
    trickGlow.position.z = 0.015;
    targetZoneGroup.add(trickGlow);
    
    // Crosshair lines (thinner, outside the shape)
    const crosshairMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 });
    
    // Horizontal line
    const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(1.5, 0, 0)
    ]);
    const hLine = new THREE.Line(hLineGeometry, crosshairMaterial);
    targetZoneGroup.add(hLine);
    
    // Vertical line
    const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.5, 0),
      new THREE.Vector3(0, 1.5, 0)
    ]);
    const vLine = new THREE.Line(vLineGeometry, crosshairMaterial);
    targetZoneGroup.add(vLine);
    
    // Pulsing outer ring
    const pulseRingGeometry = new THREE.RingGeometry(1.3, 1.4, 32);
    const pulseRingMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const pulseRing = new THREE.Mesh(pulseRingGeometry, pulseRingMaterial);
    pulseRing.name = 'pulseRing';
    targetZoneGroup.add(pulseRing);
    
    targetZoneGroup.position.z = 0.1;
    targetZoneGroup.visible = false;
    scene.add(targetZoneGroup);
    targetZoneRef.current = targetZoneGroup;
    
    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.003;
      
      // Rotate coins and pulse priority coin
      coinsRef.current.forEach(coin => {
        if (!coin.isDragging && !coin.sorted) {
          coin.mesh.rotation.z += 0.01;
          
          // Pulse priority coin glow
          if (coin.isPriority && coin.glowMesh) {
            const glowPulse = 0.5 + Math.sin(time * 3) * 0.3;
            if (coin.glowMesh.material instanceof THREE.MeshBasicMaterial) {
              coin.glowMesh.material.opacity = glowPulse;
            }
            // Scale pulse for priority coin
            const scalePulse = 1 + Math.sin(time * 2) * 0.05;
            coin.mesh.scale.setScalar(scalePulse);
          } else {
            coin.mesh.scale.setScalar(1);
          }
        }
      });
      
      // Pulse target zone
      if (targetZoneRef.current && targetZoneRef.current.visible) {
        const pulseRing = targetZoneRef.current.getObjectByName('pulseRing');
        if (pulseRing && pulseRing instanceof THREE.Mesh) {
          const ringPulse = 0.3 + Math.sin(time * 4) * 0.3;
          if (pulseRing.material instanceof THREE.MeshBasicMaterial) {
            pulseRing.material.opacity = ringPulse;
          }
          // Expand/contract pulse ring
          const ringScale = 1 + Math.sin(time * 2) * 0.15;
          pulseRing.scale.setScalar(ringScale);
        }
        // Rotate target zone slowly
        targetZoneRef.current.rotation.z += 0.01;
      }
      
      // Pulse quadrant targets
      quadrantsRef.current.forEach((quad, i) => {
        const pulse = 0.3 + Math.sin(time + i) * 0.1;
        if (quad.targetMesh.material instanceof THREE.MeshBasicMaterial) {
          quad.targetMesh.material.opacity = pulse;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const newAspect = width / height;
      
      camera.left = -frustumSize * newAspect / 2;
      camera.right = frustumSize * newAspect / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [createQuadrant]);

  // Mouse/touch handlers
  const getWorldPosition = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!containerRef.current || !cameraRef.current) return { x: 0, y: 0 };
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    // Convert to world coordinates
    const camera = cameraRef.current;
    const worldX = x * (camera.right - camera.left) / 2;
    const worldY = y * (camera.top - camera.bottom) / 2;
    
    return { x: worldX, y: worldY };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    
    const { x, y } = getWorldPosition(e.clientX, e.clientY);
    
    // Find coin under pointer
    for (const coin of coinsRef.current) {
      if (coin.sorted) continue;
      
      const dx = x - coin.x;
      const dy = y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const coinRadius = COIN_CONFIGS[coin.type].radius;
      
      if (distance < coinRadius + 0.3) {
        coin.isDragging = true;
        draggedCoinRef.current = coin;
        break;
      }
    }
  }, [gameState, getWorldPosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedCoinRef.current) return;
    
    const { x, y } = getWorldPosition(e.clientX, e.clientY);
    const coin = draggedCoinRef.current;
    
    coin.x = x;
    coin.y = y;
    coin.mesh.position.set(x, y, 0.5); // Lift while dragging
  }, [getWorldPosition]);

  const handlePointerUp = useCallback(() => {
    if (draggedCoinRef.current) {
      handleCoinDrop(draggedCoinRef.current);
    }
  }, [handleCoinDrop]);

  // Spawn coins periodically during gameplay
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    // Initial coins
    for (let i = 0; i < 3; i++) {
      spawnCoin();
    }
    
    // Spawn new coins periodically
    const spawnInterval = setInterval(() => {
      // Keep around 4-6 coins on screen
      const activeCoins = coinsRef.current.filter(c => !c.sorted).length;
      if (activeCoins < 5) {
        spawnCoin();
      }
    }, 1500);
    
    return () => clearInterval(spawnInterval);
  }, [gameState, spawnCoin]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState]);

  // Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setGameState('playing');
          gameStartTimeRef.current = Date.now();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdownInterval);
  }, [gameState]);

  const startGame = () => {
    setGameState('countdown');
    setScore(0);
    setTimeLeft(60);
    setCombo(0);
    setAccuracy(100);
    scoreRef.current = 0;
    comboRef.current = 0;
    correctSortsRef.current = 0;
    totalCoinsRef.current = 0;
    coinsRef.current = [];
    
    // Reset quadrant match counts
    quadrantsRef.current.forEach(quad => {
      quad.matchCount = 0;
      quad.bonusShapes.forEach(shape => shape.visible = false);
    });
  };

  const endGame = async () => {
    setGameState('ended');
    
    const finalScore = scoreRef.current;
    const finalAccuracy = totalCoinsRef.current > 0 
      ? (correctSortsRef.current / totalCoinsRef.current) * 100 
      : 0;
    
    // Add accuracy decimal to score
    const accuracyDecimal = (finalAccuracy % 100) / 100;
    const adjustedScore = finalScore + accuracyDecimal;
    
    // Log to audit
    try {
      await logGameCompletion({
        gameType: GAME_TYPES.PENNY_PASSERS || 'Coin Sorter',
        gameMode: gameMode === 'competition' ? GAME_MODES.ONE_V_ONE : GAME_MODES.PRACTICE,
        score: adjustedScore,
        accuracy: finalAccuracy,
        reactionTime: 0,
        durationSeconds: 60 - timeLeft,
        additionalData: {
          rngSeed,
          competitionId,
          correctSorts: correctSortsRef.current,
          totalCoins: totalCoinsRef.current,
          maxCombo: comboRef.current
        }
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
    
    onGameEnd({
      score: adjustedScore,
      accuracy: finalAccuracy
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-gray-900">
      <div 
        ref={containerRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
      
      {/* UI Overlay */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start text-white pointer-events-none">
          <div className="bg-black/50 rounded-lg p-3">
            <div className="text-2xl font-bold">Score: {score.toLocaleString()}</div>
            <div className="text-sm text-gray-300">Accuracy: {accuracy.toFixed(1)}%</div>
            {combo > 1 && (
              <div className="text-lg font-bold text-yellow-400 animate-pulse">
                🔥 {combo}x Combo!
              </div>
            )}
          </div>
          <div className="bg-black/50 rounded-lg p-3 text-right">
            <div className="text-2xl font-bold">Time: {timeLeft}s</div>
            <div className="text-sm text-gray-300">Sorted: {correctSortsRef.current}</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 text-white text-center pointer-events-none">
          <div className="bg-black/50 rounded-lg px-4 py-2">
            <p className="text-sm">Match coins by SIZE, SHAPE, and COLOR • Hit the target for bonus!</p>
            <p className="text-xs mt-1">
              <span className="text-cyan-400">⭕ Circle</span> • 
              <span className="text-green-400"> ⬜ Square</span> • 
              <span className="text-purple-400"> 🔺 Triangle</span> • 
              <span className="text-red-400"> ⬠ Pentagon</span>
            </p>
          </div>
        </div>
      )}
      
      {/* Ready Screen */}
      {gameState === 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-500 to-red-500 bg-clip-text text-transparent">
              COIN SORTER
            </h1>
            <p className="text-xl mb-6 text-gray-300">
              Match coins by SIZE, SHAPE, and COLOR!
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8 text-lg">
              <div className="text-cyan-400 flex items-center justify-center gap-2">
                <span className="text-2xl">⭕</span> Circle → Cyan (Tiny)
              </div>
              <div className="text-green-400 flex items-center justify-center gap-2">
                <span className="text-2xl">⬜</span> Square → Green (Medium)
              </div>
              <div className="text-purple-400 flex items-center justify-center gap-2">
                <span className="text-2xl">🔺</span> Triangle → Purple (Smallest)
              </div>
              <div className="text-red-400 flex items-center justify-center gap-2">
                <span className="text-2xl">⬠</span> Pentagon → Red (Largest)
              </div>
            </div>
            <p className="text-sm text-yellow-400 mb-4">
              ⚡ Hit the TARGET for +250 bonus! Glowing coins match by COLOR!
            </p>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-xl font-bold hover:scale-105 transition-transform"
            >
              START GAME
            </button>
          </div>
        </div>
      )}
      
      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="text-9xl font-bold text-white animate-ping">
            {countdown}
          </div>
        </div>
      )}
      
      {/* End Screen */}
      {gameState === 'ended' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70">
          <div className="text-center text-white bg-gray-800/80 rounded-2xl p-8">
            <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              Game Over!
            </h2>
            <p className="text-3xl mb-2">Score: <span className="text-yellow-400">{score.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            <p className="text-xl mb-4">Accuracy: <span className="text-cyan-400">{accuracy.toFixed(1)}%</span></p>
            <p className="text-lg text-gray-400">Coins Sorted: {correctSortsRef.current} / {totalCoinsRef.current}</p>
          </div>
        </div>
      )}
    </div>
  );
}
