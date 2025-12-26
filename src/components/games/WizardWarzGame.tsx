'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiplayerLobby } from '@/hooks/useMultiplayerLobby';
import FloatingScore, { useFloatingScores } from './FloatingScore';

// ============================================================================
// WIZARD WARZ - 3D Multiplayer Wizard Battle Game
// Castle Arena with Elemental Combat
// ============================================================================

type Element = 'fire' | 'water' | 'earth' | 'electric' | 'nature' | 'dark' | 'light';

interface ElementData {
  name: string;
  color: number;
  glowColor: number;
  emoji: string;
  beats: Element[];
  weakTo: Element[];
}

const ELEMENTS: Record<Element, ElementData> = {
  fire: { name: 'Fire', color: 0xff4400, glowColor: 0xff6600, emoji: '🔥', beats: ['nature', 'dark'], weakTo: ['water', 'earth'] },
  water: { name: 'Water', color: 0x0088ff, glowColor: 0x00aaff, emoji: '💧', beats: ['fire', 'earth'], weakTo: ['electric', 'nature'] },
  earth: { name: 'Earth', color: 0x8b4513, glowColor: 0xa0522d, emoji: '🪨', beats: ['electric', 'fire'], weakTo: ['water', 'nature'] },
  electric: { name: 'Electric', color: 0xffff00, glowColor: 0xffffaa, emoji: '⚡', beats: ['water', 'light'], weakTo: ['earth', 'dark'] },
  nature: { name: 'Nature', color: 0x00ff00, glowColor: 0x44ff44, emoji: '🌿', beats: ['water', 'earth'], weakTo: ['fire', 'dark'] },
  dark: { name: 'Dark', color: 0x440044, glowColor: 0x660066, emoji: '🌑', beats: ['light', 'nature', 'electric'], weakTo: ['light', 'fire'] },
  light: { name: 'Light', color: 0xffffff, glowColor: 0xffffee, emoji: '✨', beats: ['dark', 'fire'], weakTo: ['dark', 'electric'] },
};

const ELEMENT_ORDER: Element[] = ['fire', 'water', 'earth', 'electric', 'nature', 'dark', 'light'];

const TELEPORT_ZONES = [
  { id: 'north', position: new THREE.Vector3(0, 0, -10), color: 0x00ffff },
  { id: 'south', position: new THREE.Vector3(0, 0, 10), color: 0xff00ff },
  { id: 'east', position: new THREE.Vector3(10, 0, 0), color: 0xffff00 },
  { id: 'west', position: new THREE.Vector3(-10, 0, 0), color: 0x00ff00 },
  { id: 'center', position: new THREE.Vector3(0, 0, 0), color: 0xff8800 },
];

interface Spell {
  id: string;
  mesh: THREE.Group;
  element: Element;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  ownerId: string;
  damage: number;
  createdAt: number;
}

interface WizardWarzGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit?: () => void;
  isCompetitionMode?: boolean;
}

const GAME_DURATION = 120;
const SPELL_SPEED = 0.35;
const SPELL_DAMAGE = 1; // 1 heart per hit
const COUNTER_MULTIPLIER = 2; // 2 hearts for super effective
const RESIST_MULTIPLIER = 0.5; // Half heart for resisted
const PARRY_WINDOW = 350;
const SHIELD_DURATION = 2000;
const TELEPORT_COOLDOWN = 3000;
const MAX_HEARTS = 10;

export default function WizardWarzGame({
  onGameEnd,
  onExit,
  isCompetitionMode = false,
}: WizardWarzGameProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<'menu' | 'matchmaking' | 'lobby' | 'playing' | 'ended'>('menu');
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo');
  
  const lobby = useMultiplayerLobby(
    'wizard-warz',
    user?.id,
    user?.email?.split('@')[0] || 'Wizard'
  );
  
  // Game state
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [opponentHearts, setOpponentHearts] = useState(MAX_HEARTS);
  const [currentElement, setCurrentElement] = useState<Element>('fire');
  const [isShielding, setIsShielding] = useState(false);
  const [shieldCooldown, setShieldCooldown] = useState(0);
  const [teleportCooldown, setTeleportCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState<string | null>(null);
  
  const { popups, addPopup, removePopup } = useFloatingScores();
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerWizardRef = useRef<THREE.Group | null>(null);
  const opponentWizardRef = useRef<THREE.Group | null>(null);
  const playerStaffRef = useRef<THREE.Group | null>(null);
  const spellsRef = useRef<Spell[]>([]);
  const spellsToRemoveRef = useRef<string[]>([]);
  const shieldMeshRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const heartsRef = useRef(MAX_HEARTS);
  const opponentHeartsRef = useRef(MAX_HEARTS);
  const scoreRef = useRef(0);
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 8));
  const opponentPositionRef = useRef(new THREE.Vector3(0, 0, -8));
  const shieldActiveRef = useRef(false);
  const shieldStartTimeRef = useRef(0);
  const teleportCooldownRef = useRef(0);
  const currentElementRef = useRef<Element>('fire');
  const addPopupRef = useRef(addPopup);
  const userIdRef = useRef(user?.id);
  
  // Keep refs updated
  useEffect(() => {
    addPopupRef.current = addPopup;
    userIdRef.current = user?.id;
  }, [addPopup, user?.id]);
  
  // Create detailed wizard
  const createWizard = useCallback((scene: THREE.Scene, color: number, isPlayer: boolean) => {
    const wizard = new THREE.Group();
    
    // Robe/body - more detailed
    const robeShape = new THREE.Shape();
    robeShape.moveTo(0, 0);
    robeShape.lineTo(-0.9, 0);
    robeShape.lineTo(-0.6, 2.5);
    robeShape.lineTo(0.6, 2.5);
    robeShape.lineTo(0.9, 0);
    robeShape.lineTo(0, 0);
    
    const robeGeo = new THREE.ConeGeometry(0.9, 2.8, 12);
    const robeMat = new THREE.MeshStandardMaterial({ 
      color, 
      emissive: color, 
      emissiveIntensity: 0.15,
      roughness: 0.7,
      metalness: 0.1
    });
    const robe = new THREE.Mesh(robeGeo, robeMat);
    robe.position.y = 1.4;
    wizard.add(robe);
    
    // Robe trim
    const trimGeo = new THREE.TorusGeometry(0.85, 0.08, 8, 24);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = 0.1;
    wizard.add(trim);
    
    // Belt
    const beltGeo = new THREE.TorusGeometry(0.5, 0.1, 8, 24);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 1.8;
    wizard.add(belt);
    
    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 1.8, 0.5);
    wizard.add(buckle);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.45, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 3.1;
    wizard.add(head);
    
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 3.15, 0.38);
    wizard.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 3.15, 0.38);
    wizard.add(rightEye);
    
    // Beard
    const beardGeo = new THREE.ConeGeometry(0.3, 0.6, 8);
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 });
    const beard = new THREE.Mesh(beardGeo, beardMat);
    beard.position.set(0, 2.55, 0.25);
    beard.rotation.x = Math.PI;
    wizard.add(beard);
    
    // Hat
    const hatGeo = new THREE.ConeGeometry(0.55, 1.4, 12);
    const hatMat = new THREE.MeshStandardMaterial({ 
      color: color * 0.6, 
      emissive: color, 
      emissiveIntensity: 0.1,
      roughness: 0.5
    });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 4.0;
    hat.rotation.x = -0.1;
    wizard.add(hat);
    
    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 24);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 3.35;
    wizard.add(brim);
    
    // Hat band
    const hatBandGeo = new THREE.TorusGeometry(0.52, 0.05, 8, 24);
    const hatBandMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    const hatBand = new THREE.Mesh(hatBandGeo, hatBandMat);
    hatBand.rotation.x = Math.PI / 2;
    hatBand.position.y = 3.45;
    wizard.add(hatBand);
    
    // Staff
    const staff = new THREE.Group();
    
    // Staff pole - twisted wood texture
    const staffPoleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3, 12);
    const staffPoleMat = new THREE.MeshStandardMaterial({ 
      color: 0x5a4332, 
      roughness: 0.8,
      metalness: 0.1
    });
    const staffPole = new THREE.Mesh(staffPoleGeo, staffPoleMat);
    staffPole.position.y = 1.5;
    staff.add(staffPole);
    
    // Staff head - ornate design
    const staffHeadGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 24);
    const staffHeadMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const staffHead = new THREE.Mesh(staffHeadGeo, staffHeadMat);
    staffHead.position.y = 3.1;
    staff.add(staffHead);
    
    // Staff orb - glowing crystal
    const orbGeo = new THREE.IcosahedronGeometry(0.25, 2);
    const orbMat = new THREE.MeshStandardMaterial({ 
      color: ELEMENTS[currentElementRef.current].color,
      emissive: ELEMENTS[currentElementRef.current].glowColor,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.9
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 3.1;
    orb.name = 'staffOrb';
    staff.add(orb);
    
    // Orb inner glow
    const orbGlowGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const orbGlowMat = new THREE.MeshBasicMaterial({ 
      color: ELEMENTS[currentElementRef.current].glowColor,
      transparent: true,
      opacity: 0.3
    });
    const orbGlow = new THREE.Mesh(orbGlowGeo, orbGlowMat);
    orbGlow.position.y = 3.1;
    orbGlow.name = 'staffOrbGlow';
    staff.add(orbGlow);
    
    staff.position.x = 0.9;
    staff.rotation.z = -0.2;
    wizard.add(staff);
    
    if (isPlayer) {
      playerStaffRef.current = staff;
    }
    
    // Magical aura
    const auraGeo = new THREE.SphereGeometry(1.5, 24, 24);
    const auraMat = new THREE.MeshBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.08,
      side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 2;
    wizard.add(aura);
    
    scene.add(wizard);
    return wizard;
  }, []);
  
  // Create spell projectile
  const createSpellMesh = useCallback((element: Element) => {
    const spell = new THREE.Group();
    const data = ELEMENTS[element];
    
    // Core crystal
    const coreGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.glowColor,
      emissiveIntensity: 1.5
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    spell.add(core);
    
    // Inner glow
    const innerGlowGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: data.glowColor,
      transparent: true,
      opacity: 0.5
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    spell.add(innerGlow);
    
    // Outer glow
    const glowGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: data.glowColor,
      transparent: true,
      opacity: 0.25
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    spell.add(glow);
    
    // Orbiting particles
    for (let i = 0; i < 8; i++) {
      const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.9 });
      const particle = new THREE.Mesh(particleGeo, particleMat);
      const angle = (i / 8) * Math.PI * 2;
      particle.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
      particle.userData.angle = angle;
      particle.userData.isParticle = true;
      spell.add(particle);
    }
    
    // Trail particles
    for (let i = 0; i < 4; i++) {
      const trailGeo = new THREE.SphereGeometry(0.12 - i * 0.02, 8, 8);
      const trailMat = new THREE.MeshBasicMaterial({ color: data.glowColor, transparent: true, opacity: 0.4 - i * 0.1 });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.position.z = -0.3 - i * 0.2;
      spell.add(trail);
    }
    
    return spell;
  }, []);
  
  // Create shield mesh
  const createShield = useCallback((scene: THREE.Scene) => {
    const shieldGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.visible = false;
    scene.add(shield);
    return shield;
  }, []);
  
  // Create castle environment
  const createCastleEnvironment = useCallback((scene: THREE.Scene) => {
    // Stone floor
    const floorGeo = new THREE.CircleGeometry(18, 64);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a4a4a,
      roughness: 0.9,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Floor pattern - stone tiles
    for (let x = -15; x <= 15; x += 3) {
      for (let z = -15; z <= 15; z += 3) {
        if (Math.sqrt(x*x + z*z) < 16) {
          const tileGeo = new THREE.BoxGeometry(2.8, 0.1, 2.8);
          const tileMat = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a + Math.random() * 0x101010,
            roughness: 0.95
          });
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(x, 0.05, z);
          scene.add(tile);
        }
      }
    }
    
    // Castle walls
    const wallHeight = 12;
    const wallRadius = 20;
    const wallSegments = 24;
    
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * wallRadius;
      const z = Math.sin(angle) * wallRadius;
      
      // Wall segment
      const wallGeo = new THREE.BoxGeometry(5.5, wallHeight, 1.5);
      const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0x5a5a5a,
        roughness: 0.85
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, wallHeight / 2, z);
      wall.rotation.y = angle + Math.PI / 2;
      scene.add(wall);
      
      // Battlements (crenellations)
      for (let j = -1; j <= 1; j += 2) {
        const merlonGeo = new THREE.BoxGeometry(1.5, 2, 1.8);
        const merlon = new THREE.Mesh(merlonGeo, wallMat);
        merlon.position.set(
          x + Math.cos(angle + Math.PI/2) * j * 2,
          wallHeight + 1,
          z + Math.sin(angle + Math.PI/2) * j * 2
        );
        merlon.rotation.y = angle + Math.PI / 2;
        scene.add(merlon);
      }
    }
    
    // Corner towers
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * wallRadius;
      const z = Math.sin(angle) * wallRadius;
      
      // Tower base
      const towerGeo = new THREE.CylinderGeometry(3, 3.5, wallHeight + 4, 12);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(x, (wallHeight + 4) / 2, z);
      scene.add(tower);
      
      // Tower roof
      const roofGeo = new THREE.ConeGeometry(3.5, 5, 12);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.7 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(x, wallHeight + 6.5, z);
      scene.add(roof);
      
      // Tower windows with glow
      const windowGeo = new THREE.BoxGeometry(0.8, 1.5, 0.5);
      const windowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      for (let w = 0; w < 4; w++) {
        const wAngle = (w / 4) * Math.PI * 2;
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(
          x + Math.cos(wAngle) * 2.8,
          wallHeight,
          z + Math.sin(wAngle) * 2.8
        );
        win.rotation.y = wAngle;
        scene.add(win);
      }
    }
    
    // Pillars
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 12;
      const z = Math.sin(angle) * 12;
      
      // Pillar
      const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, 6, 12);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.7 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 3, z);
      scene.add(pillar);
      
      // Pillar capital
      const capitalGeo = new THREE.CylinderGeometry(0.8, 0.5, 0.5, 12);
      const capital = new THREE.Mesh(capitalGeo, pillarMat);
      capital.position.set(x, 6.25, z);
      scene.add(capital);
      
      // Pillar base
      const baseGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.4, 12);
      const base = new THREE.Mesh(baseGeo, pillarMat);
      base.position.set(x, 0.2, z);
      scene.add(base);
      
      // Torch on pillar
      const torchLightColor = [0xff6600, 0x00ff66, 0x6600ff, 0xff0066][i % 4];
      const torchLight = new THREE.PointLight(torchLightColor, 0.8, 8);
      torchLight.position.set(x, 5.5, z);
      scene.add(torchLight);
      
      // Torch flame
      const flameGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: torchLightColor });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x, 6.5, z);
      scene.add(flame);
    }
    
    // Teleport zones with magical circles
    TELEPORT_ZONES.forEach(zone => {
      // Platform
      const platformGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 24);
      const platformMat = new THREE.MeshStandardMaterial({
        color: zone.color,
        emissive: zone.color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.copy(zone.position);
      platform.position.y = 0.15;
      scene.add(platform);
      
      // Magical ring
      const ringGeo = new THREE.TorusGeometry(1.7, 0.08, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: zone.color });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(zone.position);
      ring.position.y = 0.35;
      scene.add(ring);
      
      // Rune symbols
      for (let r = 0; r < 6; r++) {
        const runeAngle = (r / 6) * Math.PI * 2;
        const runeGeo = new THREE.BoxGeometry(0.15, 0.02, 0.3);
        const runeMat = new THREE.MeshBasicMaterial({ color: zone.color });
        const rune = new THREE.Mesh(runeGeo, runeMat);
        rune.position.set(
          zone.position.x + Math.cos(runeAngle) * 1.3,
          0.35,
          zone.position.z + Math.sin(runeAngle) * 1.3
        );
        rune.rotation.y = runeAngle;
        scene.add(rune);
      }
      
      // Vertical light beam
      const beamGeo = new THREE.CylinderGeometry(0.1, 0.5, 4, 8);
      const beamMat = new THREE.MeshBasicMaterial({ 
        color: zone.color, 
        transparent: true, 
        opacity: 0.2 
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(zone.position);
      beam.position.y = 2;
      scene.add(beam);
    });
    
    // Chandelier in center
    const chandelierGroup = new THREE.Group();
    const chandelierBaseGeo = new THREE.TorusGeometry(2, 0.15, 8, 24);
    const chandelierMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
    const chandelierBase = new THREE.Mesh(chandelierBaseGeo, chandelierMat);
    chandelierBase.rotation.x = Math.PI / 2;
    chandelierGroup.add(chandelierBase);
    
    // Chandelier candles
    for (let c = 0; c < 8; c++) {
      const cAngle = (c / 8) * Math.PI * 2;
      const candleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8);
      const candleMat = new THREE.MeshStandardMaterial({ color: 0xfffff0 });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(Math.cos(cAngle) * 2, -0.2, Math.sin(cAngle) * 2);
      chandelierGroup.add(candle);
      
      const candleFlameGeo = new THREE.ConeGeometry(0.06, 0.15, 8);
      const candleFlameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const candleFlame = new THREE.Mesh(candleFlameGeo, candleFlameMat);
      candleFlame.position.set(Math.cos(cAngle) * 2, 0.08, Math.sin(cAngle) * 2);
      chandelierGroup.add(candleFlame);
    }
    
    // Chandelier chains
    for (let ch = 0; ch < 4; ch++) {
      const chAngle = (ch / 4) * Math.PI * 2 + Math.PI / 4;
      const chainGeo = new THREE.CylinderGeometry(0.03, 0.03, 5, 8);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
      const chain = new THREE.Mesh(chainGeo, chainMat);
      chain.position.set(Math.cos(chAngle) * 1.8, 2.5, Math.sin(chAngle) * 1.8);
      chandelierGroup.add(chain);
    }
    
    chandelierGroup.position.y = 8;
    scene.add(chandelierGroup);
    
    // Central chandelier light
    const chandelierLight = new THREE.PointLight(0xffaa44, 1.5, 20);
    chandelierLight.position.set(0, 8, 0);
    scene.add(chandelierLight);
  }, []);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || gameState !== 'playing') return;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 15, 50);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(55, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x303050, 0.6);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    
    const moonLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    moonLight.position.set(-10, 15, -5);
    scene.add(moonLight);
    
    // Create castle environment
    createCastleEnvironment(scene);
    
    // Create wizards
    const playerWizard = createWizard(scene, 0x00aaff, true);
    playerWizard.position.copy(playerPositionRef.current);
    playerWizardRef.current = playerWizard;
    
    const opponentWizard = createWizard(scene, 0xff4400, false);
    opponentWizard.position.copy(opponentPositionRef.current);
    opponentWizardRef.current = opponentWizard;
    
    // Create shield
    const shield = createShield(scene);
    shieldMeshRef.current = shield;
    
    // Initialize game state
    gameActiveRef.current = true;
    heartsRef.current = MAX_HEARTS;
    opponentHeartsRef.current = MAX_HEARTS;
    scoreRef.current = 0;
    setHearts(MAX_HEARTS);
    setOpponentHearts(MAX_HEARTS);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setWinner(null);
    
    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          gameActiveRef.current = false;
          // Determine winner by hearts
          if (heartsRef.current > opponentHeartsRef.current) {
            setWinner('player');
          } else if (opponentHeartsRef.current > heartsRef.current) {
            setWinner('opponent');
          } else {
            setWinner('draw');
          }
          setGameState('ended');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Animation loop
    let lastBotShot = Date.now();
    const gameStartTime = Date.now();
    const BOT_START_DELAY = 3000; // 3 seconds before bot starts shooting
    
    const animate = () => {
      if (!gameActiveRef.current) return;
      
      animationRef.current = requestAnimationFrame(animate);
      const currentTime = Date.now();
      
      // Process spells to remove
      if (spellsToRemoveRef.current.length > 0) {
        const idsToRemove = new Set(spellsToRemoveRef.current);
        spellsRef.current = spellsRef.current.filter(spell => {
          if (idsToRemove.has(spell.id)) {
            scene.remove(spell.mesh);
            return false;
          }
          return true;
        });
        spellsToRemoveRef.current = [];
      }
      
      // Update spells
      for (const spell of spellsRef.current) {
        spell.position.add(spell.velocity);
        spell.mesh.position.copy(spell.position);
        
        // Rotate particles
        spell.mesh.children.forEach(child => {
          if (child.userData.isParticle) {
            child.userData.angle += 0.12;
            const r = 0.5;
            child.position.x = Math.cos(child.userData.angle) * r;
            child.position.y = Math.sin(child.userData.angle) * r;
          }
        });
        
        // Rotate core
        spell.mesh.rotation.x += 0.05;
        spell.mesh.rotation.y += 0.05;
        
        // Check collision
        const isPlayerSpell = spell.ownerId === userIdRef.current;
        const targetPos = isPlayerSpell ? opponentPositionRef.current : playerPositionRef.current;
        const dist = spell.position.distanceTo(targetPos);
        
        if (dist < 1.8) {
          if (!isPlayerSpell) {
            // Hit player
            if (shieldActiveRef.current) {
              const shieldTime = Date.now() - shieldStartTimeRef.current;
              if (shieldTime < PARRY_WINDOW) {
                // Perfect parry
                addPopupRef.current(200, 50, 40, 'perfect', 'PERFECT PARRY!');
                scoreRef.current += 200;
                setScore(scoreRef.current);
                spell.velocity.multiplyScalar(-1.5);
                spell.ownerId = userIdRef.current || '';
                spell.damage *= 1.5;
              } else {
                // Blocked
                addPopupRef.current(0, 50, 40, 'bonus', 'BLOCKED!');
                spellsToRemoveRef.current.push(spell.id);
              }
            } else {
              // Hit player
              let damage = spell.damage;
              const spellData = ELEMENTS[spell.element];
              if (spellData.beats.includes(currentElementRef.current)) {
                damage *= COUNTER_MULTIPLIER;
                addPopupRef.current(0, 50, 30, 'critical', 'SUPER EFFECTIVE!');
              } else if (spellData.weakTo.includes(currentElementRef.current)) {
                damage *= RESIST_MULTIPLIER;
                addPopupRef.current(0, 50, 30, 'bonus', 'RESISTED!');
              }
              
              heartsRef.current = Math.max(0, heartsRef.current - damage);
              setHearts(Math.ceil(heartsRef.current));
              
              if (heartsRef.current <= 0) {
                gameActiveRef.current = false;
                setWinner('opponent');
                setGameState('ended');
              }
              spellsToRemoveRef.current.push(spell.id);
            }
          } else {
            // Hit opponent
            let damage = spell.damage;
            opponentHeartsRef.current = Math.max(0, opponentHeartsRef.current - damage);
            setOpponentHearts(Math.ceil(opponentHeartsRef.current));
            scoreRef.current += Math.floor(damage * 100);
            setScore(scoreRef.current);
            
            addPopupRef.current(Math.floor(damage * 100), 50, 50, 'normal');
            
            if (opponentHeartsRef.current <= 0) {
              gameActiveRef.current = false;
              setWinner('player');
              setGameState('ended');
            }
            spellsToRemoveRef.current.push(spell.id);
          }
        }
        
        // Remove if out of bounds
        if (spell.position.length() > 25) {
          spellsToRemoveRef.current.push(spell.id);
        }
      }
      
      // Update shield
      if (shieldMeshRef.current && playerWizardRef.current) {
        shieldMeshRef.current.position.copy(playerWizardRef.current.position);
        shieldMeshRef.current.position.y += 2;
        
        if (shieldActiveRef.current && Date.now() - shieldStartTimeRef.current > SHIELD_DURATION) {
          shieldActiveRef.current = false;
          shieldMeshRef.current.visible = false;
          (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
          setIsShielding(false);
          setShieldCooldown(1000);
          setTimeout(() => setShieldCooldown(0), 1000);
        }
      }
      
      // Update teleport cooldown
      if (teleportCooldownRef.current > 0) {
        teleportCooldownRef.current -= 16;
        setTeleportCooldown(Math.max(0, teleportCooldownRef.current));
      }
      
      // Bot AI - wait for delay, then shoot every 2-3 seconds
      const timeSinceStart = currentTime - gameStartTime;
      if (gameMode === 'solo' && timeSinceStart > BOT_START_DELAY && currentTime - lastBotShot > 2000 + Math.random() * 1000) {
        lastBotShot = currentTime;
        
        const randomElement = ELEMENT_ORDER[Math.floor(Math.random() * ELEMENT_ORDER.length)];
        const spellMesh = createSpellMesh(randomElement);
        const startPos = opponentPositionRef.current.clone();
        startPos.y += 2.5;
        
        const direction = playerPositionRef.current.clone().sub(startPos).normalize();
        
        const spell: Spell = {
          id: `bot-${Date.now()}`,
          mesh: spellMesh,
          element: randomElement,
          position: startPos,
          velocity: direction.multiplyScalar(SPELL_SPEED * 0.85),
          ownerId: 'bot',
          damage: SPELL_DAMAGE,
          createdAt: Date.now()
        };
        
        spellMesh.position.copy(startPos);
        scene.add(spellMesh);
        spellsRef.current.push(spell);
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    return () => {
      clearInterval(timerInterval);
      cancelAnimationFrame(animationRef.current);
      gameActiveRef.current = false;
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {}
      }
      rendererRef.current?.dispose();
    };
  }, [gameState, createWizard, createShield, createCastleEnvironment, createSpellMesh, gameMode]);
  
  // Fire spell
  const fireSpell = useCallback(() => {
    if (!gameActiveRef.current || !sceneRef.current || !playerWizardRef.current) return;
    
    const spellMesh = createSpellMesh(currentElementRef.current);
    const startPos = playerWizardRef.current.position.clone();
    startPos.y += 2.5;
    
    const direction = opponentPositionRef.current.clone().sub(startPos).normalize();
    
    const spell: Spell = {
      id: `player-${Date.now()}`,
      mesh: spellMesh,
      element: currentElementRef.current,
      position: startPos,
      velocity: direction.multiplyScalar(SPELL_SPEED),
      ownerId: userIdRef.current || '',
      damage: SPELL_DAMAGE,
      createdAt: Date.now()
    };
    
    spellMesh.position.copy(startPos);
    sceneRef.current.add(spellMesh);
    spellsRef.current.push(spell);
  }, [createSpellMesh]);
  
  // Activate shield
  const activateShield = useCallback(() => {
    if (!shieldMeshRef.current || shieldActiveRef.current) return;
    
    shieldActiveRef.current = true;
    shieldStartTimeRef.current = Date.now();
    shieldMeshRef.current.visible = true;
    (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5;
    setIsShielding(true);
  }, []);
  
  // Deactivate shield
  const deactivateShield = useCallback(() => {
    if (!shieldMeshRef.current || !shieldActiveRef.current) return;
    
    shieldActiveRef.current = false;
    shieldMeshRef.current.visible = false;
    (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
    setIsShielding(false);
    setShieldCooldown(1000);
    setTimeout(() => setShieldCooldown(0), 1000);
  }, []);
  
  // Teleport
  const teleportTo = useCallback((zoneId: string) => {
    if (!gameActiveRef.current || teleportCooldownRef.current > 0 || !playerWizardRef.current) return;
    
    const zone = TELEPORT_ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    
    playerPositionRef.current.copy(zone.position);
    playerWizardRef.current.position.copy(zone.position);
    teleportCooldownRef.current = TELEPORT_COOLDOWN;
    setTeleportCooldown(TELEPORT_COOLDOWN);
    
    addPopup(0, 50, 50, 'bonus', 'TELEPORT!');
  }, [addPopup]);
  
  // Change element
  const changeElement = useCallback((element: Element) => {
    currentElementRef.current = element;
    setCurrentElement(element);
    
    if (playerStaffRef.current) {
      const orb = playerStaffRef.current.getObjectByName('staffOrb') as THREE.Mesh;
      const orbGlow = playerStaffRef.current.getObjectByName('staffOrbGlow') as THREE.Mesh;
      if (orb) {
        const mat = orb.material as THREE.MeshStandardMaterial;
        mat.color.setHex(ELEMENTS[element].color);
        mat.emissive.setHex(ELEMENTS[element].glowColor);
      }
      if (orbGlow) {
        const mat = orbGlow.material as THREE.MeshBasicMaterial;
        mat.color.setHex(ELEMENTS[element].glowColor);
      }
    }
  }, []);
  
  // Keyboard controls
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fireSpell();
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'Shift') {
        e.preventDefault();
        activateShield();
      } else if (e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        changeElement(ELEMENT_ORDER[parseInt(e.key) - 1]);
      } else if (e.key === 'q' || e.key === 'Q') {
        const currentIndex = ELEMENT_ORDER.indexOf(currentElementRef.current);
        const prevIndex = (currentIndex - 1 + ELEMENT_ORDER.length) % ELEMENT_ORDER.length;
        changeElement(ELEMENT_ORDER[prevIndex]);
      } else if (e.key === 'r' || e.key === 'R') {
        const currentIndex = ELEMENT_ORDER.indexOf(currentElementRef.current);
        const nextIndex = (currentIndex + 1) % ELEMENT_ORDER.length;
        changeElement(ELEMENT_ORDER[nextIndex]);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Shift') {
        deactivateShield();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, fireSpell, activateShield, deactivateShield, changeElement]);
  
  // Render hearts
  const renderHearts = (count: number, max: number, color: string) => {
    return (
      <div className="flex gap-0.5 flex-wrap max-w-[120px]">
        {Array.from({ length: max }).map((_, i) => (
          <span 
            key={i} 
            className={`text-lg transition-all ${i < count ? '' : 'opacity-30 grayscale'}`}
            style={{ color: i < count ? color : '#666' }}
          >
            ❤️
          </span>
        ))}
      </div>
    );
  };
  
  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-purple-900 via-indigo-900 to-black rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            🧙 WIZARD WARZ ⚔️
          </h1>
          <p className="text-gray-400 text-lg mb-2">Battle in the Castle Arena</p>
          <p className="text-gray-500 text-sm mb-8">Master 7 elements • Perfect your parry timing • Defeat your opponent!</p>
          
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <button
              onClick={() => { setGameMode('solo'); setGameState('playing'); }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-xl text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
            >
              <span className="flex items-center justify-center gap-3">
                <span>🤖</span>
                <span>Solo vs Bot</span>
              </span>
            </button>
            
            <button
              onClick={() => { setGameMode('online'); setGameState('matchmaking'); lobby.findLobby(); }}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-xl text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50"
            >
              <span className="flex items-center justify-center gap-3">
                <span>⚔️</span>
                <span>Online 1v1</span>
              </span>
            </button>
          </div>
          
          {/* Element chart */}
          <div className="mt-8 bg-black/40 rounded-xl p-4 max-w-lg mx-auto backdrop-blur-sm">
            <h3 className="text-white font-bold mb-3">🔮 Element Chart</h3>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {ELEMENT_ORDER.map(el => (
                <div key={el} className="text-center p-2 rounded-lg bg-white/5">
                  <span className="text-2xl">{ELEMENTS[el].emoji}</span>
                  <div className="text-xs text-gray-400 mt-1">{ELEMENTS[el].name}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-3">
              🔥→🌿→💧→🔥 • ⚡→💧 • 🪨→⚡ • ✨↔🌑
            </div>
          </div>
          
          {/* Controls */}
          <div className="mt-6 text-gray-400 text-sm space-y-1">
            <p>❤️ 10 Hearts each • Perfect parry deflects spells!</p>
            <p>Space/F: Cast • E/Shift: Shield • Q/R: Switch Element</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Playing state
  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Top HUD */}
          <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
            <div className="flex justify-between items-start gap-2">
              {/* Player */}
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 min-w-[140px]">
                <div className="text-cyan-400 font-bold text-sm mb-1">YOU</div>
                {renderHearts(hearts, MAX_HEARTS, '#00ffff')}
              </div>
              
              {/* Timer */}
              <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <div className={`text-3xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-yellow-400 font-bold text-sm">⭐ {score}</div>
              </div>
              
              {/* Opponent */}
              <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 min-w-[140px]">
                <div className="text-orange-400 font-bold text-sm mb-1 text-right">ENEMY</div>
                <div className="flex justify-end">
                  {renderHearts(opponentHearts, MAX_HEARTS, '#ff4400')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Current Element */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-2xl">{ELEMENTS[currentElement].emoji}</span>
            <span className="text-white font-bold">{ELEMENTS[currentElement].name}</span>
            {isShielding && <span className="text-cyan-400 animate-pulse ml-2">🛡️</span>}
          </div>
          
          {/* Element selector */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-xl p-2 flex gap-1">
            {ELEMENT_ORDER.map((el) => (
              <button
                key={el}
                onClick={() => changeElement(el)}
                className={`w-11 h-11 rounded-lg flex items-center justify-center text-xl transition-all ${
                  currentElement === el 
                    ? 'bg-white/30 scale-110 ring-2 ring-white' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {ELEMENTS[el].emoji}
              </button>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={fireSpell}
              className="px-8 py-4 bg-gradient-to-t from-orange-700 to-orange-500 hover:from-orange-600 hover:to-orange-400 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-orange-500/30"
            >
              <div className="text-2xl">🔮</div>
              <div className="text-xs">CAST</div>
            </button>
            
            <button
              onMouseDown={activateShield}
              onMouseUp={deactivateShield}
              onTouchStart={activateShield}
              onTouchEnd={deactivateShield}
              disabled={shieldCooldown > 0}
              className={`px-8 py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${
                shieldCooldown > 0 
                  ? 'bg-gray-600 text-gray-400' 
                  : isShielding 
                    ? 'bg-cyan-500 text-white animate-pulse shadow-cyan-500/50' 
                    : 'bg-gradient-to-t from-cyan-700 to-cyan-500 hover:from-cyan-600 hover:to-cyan-400 text-white shadow-cyan-500/30'
              }`}
            >
              <div className="text-2xl">🛡️</div>
              <div className="text-xs">{shieldCooldown > 0 ? 'WAIT' : 'SHIELD'}</div>
            </button>
          </div>
          
          {/* Teleport buttons */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <div className="text-xs text-gray-400 text-center mb-1">TELEPORT</div>
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <button
                onClick={() => teleportTo('north')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  teleportCooldown > 0 ? 'bg-gray-700 text-gray-500' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                ⬆️
              </button>
              <div></div>
              <button
                onClick={() => teleportTo('west')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  teleportCooldown > 0 ? 'bg-gray-700 text-gray-500' : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                ⬅️
              </button>
              <button
                onClick={() => teleportTo('center')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  teleportCooldown > 0 ? 'bg-gray-700 text-gray-500' : 'bg-orange-600 hover:bg-orange-500 text-white'
                }`}
              >
                ⭕
              </button>
              <button
                onClick={() => teleportTo('east')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  teleportCooldown > 0 ? 'bg-gray-700 text-gray-500' : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                ➡️
              </button>
              <div></div>
              <button
                onClick={() => teleportTo('south')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  teleportCooldown > 0 ? 'bg-gray-700 text-gray-500' : 'bg-pink-600 hover:bg-pink-500 text-white'
                }`}
              >
                ⬇️
              </button>
              <div></div>
            </div>
            {teleportCooldown > 0 && (
              <div className="text-xs text-center text-gray-400">
                {(teleportCooldown / 1000).toFixed(1)}s
              </div>
            )}
          </div>
          
          <FloatingScore popups={popups} onRemove={removePopup} />
        </>
      )}
      
      {/* Game Over */}
      {gameState === 'ended' && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <h2 className={`text-5xl md:text-6xl font-black mb-4 ${
              winner === 'player' ? 'text-green-400' : winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {winner === 'player' ? '🏆 VICTORY!' : winner === 'opponent' ? '💀 DEFEAT' : '🤝 DRAW'}
            </h2>
            <div className="text-3xl text-yellow-400 mb-2">Score: {score}</div>
            <div className="text-lg text-gray-400 mb-6">
              Hearts: {hearts}/{MAX_HEARTS} vs {opponentHearts}/{MAX_HEARTS}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { 
                  setGameState('menu'); 
                  setWinner(null); 
                  spellsRef.current = [];
                }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white transition-all"
              >
                Play Again
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="px-8 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold text-white transition-all"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
