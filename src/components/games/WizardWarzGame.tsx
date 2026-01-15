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

// Element-based teleport platforms - 7 platforms for 7 elements (HUGE ARENA)
const TELEPORT_ZONES: { id: string; x: number; z: number; element: Element }[] = [
  { id: 'fire', x: 0, z: -40, element: 'fire' },           // Far back
  { id: 'water', x: 35, z: -20, element: 'water' },        // Right back
  { id: 'earth', x: 35, z: 20, element: 'earth' },         // Right front
  { id: 'electric', x: 0, z: 40, element: 'electric' },    // Far front
  { id: 'nature', x: -35, z: 20, element: 'nature' },      // Left front
  { id: 'dark', x: -35, z: -20, element: 'dark' },         // Left back
  { id: 'light', x: 0, z: 0, element: 'light' },           // Center
];

// Damage constants
const DAMAGE_SAME_ELEMENT = 0;      // Same element = immune
const DAMAGE_IMMUNE = 0;            // Immune to element = no damage
const DAMAGE_WEAKNESS = 5;          // Weak to element = 5 hearts
const DAMAGE_NEUTRAL = 1;           // Neutral = 1 heart

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
const SPELL_SPEED = 0.4;
const SPELL_DAMAGE = 1; // Base damage (modified by element system)
const PARRY_WINDOW = 350;
const SHIELD_DURATION = 2000;
const TELEPORT_COOLDOWN = 2000;
const SPELL_COOLDOWN = 800; // 0.8 second between spells - no spam!
const MAX_HEARTS = 20;

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
  const [spellCooldown, setSpellCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState<string | null>(null);
  
  const { popups, addPopup, removePopup } = useFloatingScores();
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const enemyViewRef = useRef<HTMLDivElement>(null); // Sub-screen for enemy view
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const enemyCameraRef = useRef<THREE.PerspectiveCamera | null>(null); // Camera for enemy sub-screen
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const enemyRendererRef = useRef<THREE.WebGLRenderer | null>(null); // Renderer for enemy sub-screen
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
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 20));
  const opponentPositionRef = useRef(new THREE.Vector3(0, 0, -20));
  const shieldActiveRef = useRef(false);
  const shieldStartTimeRef = useRef(0);
  const teleportCooldownRef = useRef(0);
  const teleportInvincibleRef = useRef(false);
  const teleportInvincibleUntilRef = useRef(0);
  const spellCooldownRef = useRef(0);
  const lastSpellTimeRef = useRef(0);
  const currentElementRef = useRef<Element>('fire');
  const playerGlowRef = useRef<THREE.Mesh | null>(null);
  const opponentGlowRef = useRef<THREE.Mesh | null>(null);
  const opponentStaffRef = useRef<THREE.Group | null>(null);
  const opponentShieldRef = useRef<THREE.Mesh | null>(null);
  // Label refs for username sprites - must be declared at component level
  const playerNameLabelRef = useRef<THREE.Sprite | null>(null);
  const opponentNameLabelRef = useRef<THREE.Sprite | null>(null);
  const addPopupRef = useRef(addPopup);
  const userIdRef = useRef(user?.id);
  
  // Bot AI state
  const botElementRef = useRef<Element>('fire');
  const botShieldActiveRef = useRef(false);
  const botShieldStartRef = useRef(0);
  const botTeleportCooldownRef = useRef(0);
  const botLastActionRef = useRef(0);
  
  // Keep refs updated
  useEffect(() => {
    addPopupRef.current = addPopup;
    userIdRef.current = user?.id;
  }, [addPopup, user?.id]);
  
  // Calculate damage based on elements
  const calculateDamage = useCallback((spellElement: Element, defenderElement: Element): { damage: number; type: string } => {
    const spellData = ELEMENTS[spellElement];
    const defenderData = ELEMENTS[defenderElement];
    
    // Same element = immune
    if (spellElement === defenderElement) {
      return { damage: DAMAGE_SAME_ELEMENT, type: 'SAME ELEMENT!' };
    }
    
    // Defender is immune to spell (spell is weak to defender)
    if (spellData.weakTo.includes(defenderElement)) {
      return { damage: DAMAGE_IMMUNE, type: 'IMMUNE!' };
    }
    
    // Defender is weak to spell
    if (defenderData.weakTo.includes(spellElement)) {
      return { damage: DAMAGE_WEAKNESS, type: 'SUPER EFFECTIVE!' };
    }
    
    // Neutral damage
    return { damage: DAMAGE_NEUTRAL, type: '' };
  }, []);
  
  // Create username label sprite
  const createUsernameLabel = (username: string, color: number): THREE.Sprite => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    // Background with shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Text with glow
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = `#${color.toString(16).padStart(6, '0')}`;
    ctx.shadowBlur = 10;
    ctx.fillText(username.substring(0, 15), canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 0.75, 1);
    sprite.position.y = 4.5; // Above wizard head
    
    return sprite;
  };
  
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
    } else {
      opponentStaffRef.current = staff;
    }
    
    // Magical aura (base)
    const auraGeo = new THREE.SphereGeometry(1.5, 24, 24);
    const auraMat = new THREE.MeshBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.1,
      side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 2;
    wizard.add(aura);
    
    // Element glow - BOTH players get bright glow to show element
    const startElement = isPlayer ? currentElementRef.current : botElementRef.current;
    const elementGlowGeo = new THREE.SphereGeometry(2.5, 24, 24);
    const elementGlowMat = new THREE.MeshBasicMaterial({ 
      color: ELEMENTS[startElement].glowColor, 
      transparent: true, 
      opacity: 0.35, // Much brighter!
      side: THREE.BackSide
    });
    const elementGlow = new THREE.Mesh(elementGlowGeo, elementGlowMat);
    elementGlow.position.y = 2;
    elementGlow.name = 'elementGlow';
    wizard.add(elementGlow);
    
    if (isPlayer) {
      playerGlowRef.current = elementGlow;
    } else {
      opponentGlowRef.current = elementGlow;
    }
    
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
  
  // Create castle environment (HUGE ARENA)
  const createCastleEnvironment = useCallback((scene: THREE.Scene) => {
    // Concrete tile floor base (HUGE - 70 radius)
    const floorGeo = new THREE.CircleGeometry(70, 64);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x6a6a6a, // Lighter gray for concrete
      roughness: 0.7,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Concrete tile pattern - realistic concrete tiles with grout lines (HUGE AREA)
    const tileSize = 4;
    const groutWidth = 0.1;
    const tileHeight = 0.15;
    
    for (let x = -65; x <= 65; x += tileSize) {
      for (let z = -65; z <= 65; z += tileSize) {
        if (Math.sqrt(x*x + z*z) < 68) {
          // Dark stone tile - darker colors
          const tileGeo = new THREE.BoxGeometry(tileSize - groutWidth, tileHeight, tileSize - groutWidth);
          const baseColor = 0x2a2a2a; // Dark gray/black stone
          const variation = (Math.random() - 0.5) * 0x080808; // Very subtle dark variation
          const tileMat = new THREE.MeshStandardMaterial({ 
            color: baseColor + variation,
            roughness: 0.95, // Very rough dark stone
            metalness: 0.0
          });
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(x, tileHeight / 2, z);
          tile.castShadow = true;
          tile.receiveShadow = true;
          scene.add(tile);
          
          // Grout lines (very dark lines between tiles)
          if (Math.random() > 0.3) { // Not all tiles need grout for performance
            const groutGeo = new THREE.BoxGeometry(groutWidth, tileHeight * 0.5, tileSize);
            const groutMat = new THREE.MeshStandardMaterial({ 
              color: 0x1a1a1a, // Very dark grout
              roughness: 0.95
            });
            // Vertical grout
            const groutV = new THREE.Mesh(groutGeo, groutMat);
            groutV.position.set(x + tileSize/2, tileHeight * 0.25, z);
            scene.add(groutV);
            // Horizontal grout
            const groutH = new THREE.Mesh(new THREE.BoxGeometry(tileSize, tileHeight * 0.5, groutWidth), groutMat);
            groutH.position.set(x, tileHeight * 0.25, z + tileSize/2);
            scene.add(groutH);
          }
        }
      }
    }
    
    // Castle walls (HUGE) - Stone castle walls
    const wallHeight = 22;
    const wallRadius = 72;
    const wallSegments = 48;
    
    for (let i = 0; i < wallSegments; i++) {
      const angle = (i / wallSegments) * Math.PI * 2;
      const x = Math.cos(angle) * wallRadius;
      const z = Math.sin(angle) * wallRadius;
      
      // Wall segment - dark stone texture
      const wallGeo = new THREE.BoxGeometry(5.5, wallHeight, 1.8);
      const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2520, // Dark stone color
        roughness: 0.95,
        metalness: 0.0
      });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, wallHeight / 2, z);
      wall.rotation.y = angle + Math.PI / 2;
      wall.castShadow = true;
      wall.receiveShadow = true;
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
      
      // Tower base - dark stone castle tower
      const towerGeo = new THREE.CylinderGeometry(3, 3.5, wallHeight + 4, 12);
      const towerMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2520, // Dark stone color matching walls
        roughness: 0.95,
        metalness: 0.0
      });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(x, (wallHeight + 4) / 2, z);
      tower.castShadow = true;
      tower.receiveShadow = true;
      scene.add(tower);
      
      // Tower roof - very dark stone/conical roof
      const roofGeo = new THREE.ConeGeometry(3.5, 5, 12);
      const roofMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1510, // Very dark stone for roof
        roughness: 0.95 
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(x, wallHeight + 6.5, z);
      roof.castShadow = true;
      scene.add(roof);
      
      // Tower windows with dim glow
      const windowGeo = new THREE.BoxGeometry(0.8, 1.5, 0.5);
      const windowMat = new THREE.MeshBasicMaterial({ color: 0x664422 }); // Dim orange glow
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
    
    // Dark atmospheric lights - dim and moody
    const cornerLights = [
      { x: 30, z: 30, color: 0x442200, intensity: 0.5 },
      { x: -30, z: 30, color: 0x442200, intensity: 0.5 },
      { x: 30, z: -30, color: 0x442200, intensity: 0.5 },
      { x: -30, z: -30, color: 0x442200, intensity: 0.5 },
      // Additional dim lights for huge arena
      { x: 50, z: 0, color: 0x332211, intensity: 0.4 },
      { x: -50, z: 0, color: 0x332211, intensity: 0.4 },
      { x: 0, z: 50, color: 0x332211, intensity: 0.4 },
      { x: 0, z: -50, color: 0x332211, intensity: 0.4 },
    ];
    
    cornerLights.forEach(({ x, z, color, intensity }) => {
      const light = new THREE.PointLight(color, intensity, 40);
      light.position.set(x, 10, z);
      scene.add(light);
      
      // Small dim glowing orb to show light source
      const orbGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color, opacity: 0.3, transparent: true });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(x, 10, z);
      scene.add(orb);
    });
    
    // Center arena light - brighter for huge arena
    const centerLight = new THREE.PointLight(0xffffff, 2.5, 80);
    centerLight.position.set(0, 20, 0);
    scene.add(centerLight);
    
    // Element teleport zones - 7 platforms for 7 elements (BIGGER, MORE VISIBLE)
    TELEPORT_ZONES.forEach(zone => {
      const elementData = ELEMENTS[zone.element];
      const elementColor = elementData.color;
      const glowColor = elementData.glowColor;
      const pos = new THREE.Vector3(zone.x, 0, zone.z);
      
      // Platform base - darker stone (BIGGER)
      const baseGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.5, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.copy(pos);
      base.position.y = 0.25;
      scene.add(base);
      
      // Element platform (BIGGER, BRIGHTER)
      const platformGeo = new THREE.CylinderGeometry(3, 3, 0.4, 32);
      const platformMat = new THREE.MeshStandardMaterial({
        color: elementColor,
        emissive: glowColor,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.copy(pos);
      platform.position.y = 0.5;
      scene.add(platform);
      
      // Magical ring (BIGGER)
      const ringGeo = new THREE.TorusGeometry(3.3, 0.15, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({ color: glowColor });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.65;
      scene.add(ring);
      
      // Inner ring (BIGGER)
      const innerRingGeo = new THREE.TorusGeometry(2, 0.1, 12, 48);
      const innerRing = new THREE.Mesh(innerRingGeo, ringMat);
      innerRing.rotation.x = Math.PI / 2;
      innerRing.position.copy(pos);
      innerRing.position.y = 0.65;
      scene.add(innerRing);
      
      // Element symbol in center (BIGGER glowing orb)
      const symbolGeo = new THREE.SphereGeometry(0.6, 16, 16);
      const symbolMat = new THREE.MeshBasicMaterial({ 
        color: glowColor,
        transparent: true,
        opacity: 0.95
      });
      const symbol = new THREE.Mesh(symbolGeo, symbolMat);
      symbol.position.copy(pos);
      symbol.position.y = 1.5;
      scene.add(symbol);
      
      // Rune symbols around platform (BIGGER radius)
      for (let r = 0; r < 10; r++) {
        const runeAngle = (r / 10) * Math.PI * 2;
        const runeGeo = new THREE.BoxGeometry(0.3, 0.04, 0.5);
        const runeMat = new THREE.MeshBasicMaterial({ color: glowColor });
        const rune = new THREE.Mesh(runeGeo, runeMat);
        rune.position.set(
          zone.x + Math.cos(runeAngle) * 2.6,
          0.65,
          zone.z + Math.sin(runeAngle) * 2.6
        );
        rune.rotation.y = runeAngle;
        scene.add(rune);
      }
      
      // Vertical light beam (TALLER, BRIGHTER)
      const beamGeo = new THREE.CylinderGeometry(0.2, 1.2, 10, 12);
      const beamMat = new THREE.MeshBasicMaterial({ 
        color: glowColor, 
        transparent: true, 
        opacity: 0.35 
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(pos);
      beam.position.y = 5;
      scene.add(beam);
      
      // Platform light (BRIGHTER, LARGER RADIUS)
      const platformLight = new THREE.PointLight(elementColor, 1.2, 12);
      platformLight.position.copy(pos);
      platformLight.position.y = 3;
      scene.add(platformLight);
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
    scene.background = new THREE.Color(0x1a1025); // Dark purple, not pitch black
    scene.fog = new THREE.Fog(0x1a1025, 100, 200); // Push fog way back for huge arena
    sceneRef.current = scene;
    
    // Main camera - split screen view showing both players
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    // Start camera positioned higher and further back to see both players
    camera.position.set(0, 25, 30); // Higher overhead view for split screen
    camera.lookAt(0, 0, 0); // Look at center initially
    cameraRef.current = camera;
    
    // Enemy view camera for sub-screen - focused on opponent wizard (bigger size)
    const enemyCamera = new THREE.PerspectiveCamera(60, 350 / 260, 0.1, 1000);
    enemyCamera.position.set(0, 10, 20);
    enemyCameraRef.current = enemyCamera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Enemy view renderer for sub-screen (bigger size) - create after a small delay to ensure DOM is ready
    setTimeout(() => {
      if (enemyViewRef.current && !enemyRendererRef.current) {
        const enemyRenderer = new THREE.WebGLRenderer({ antialias: true });
        enemyRenderer.setSize(350, 260);
        enemyRenderer.shadowMap.enabled = true;
        enemyRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        enemyViewRef.current.appendChild(enemyRenderer.domElement);
        enemyRendererRef.current = enemyRenderer;
      }
    }, 100);
    
    // Brighter lighting - can see the arena clearly
    const ambientLight = new THREE.AmbientLight(0x404060, 0.7);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
    
    // Create player username label
    const playerUsername = user?.email?.split('@')[0] || 'Guest';
    const playerLabel = createUsernameLabel(playerUsername, 0x00aaff);
    playerLabel.position.copy(playerPositionRef.current);
    playerLabel.position.y = 4.5;
    scene.add(playerLabel);
    playerNameLabelRef.current = playerLabel;
    
    const opponentWizard = createWizard(scene, 0xff4400, false);
    opponentWizard.position.copy(opponentPositionRef.current);
    opponentWizardRef.current = opponentWizard;
    
    // Create opponent username label (AI or opponent name)
    const opponentUsername = gameMode === 'solo' ? 'AI' : (lobby.opponent?.username || 'Enemy');
    const opponentLabel = createUsernameLabel(opponentUsername, 0xff4400);
    opponentLabel.position.copy(opponentPositionRef.current);
    opponentLabel.position.y = 4.5;
    scene.add(opponentLabel);
    opponentNameLabelRef.current = opponentLabel;
    
    // ENEMY INDICATOR - Big red arrow floating above enemy
    const enemyIndicatorGroup = new THREE.Group();
    
    // Arrow body
    const arrowGeo = new THREE.ConeGeometry(1.5, 3, 6);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI; // Point down
    arrow.position.y = 0;
    enemyIndicatorGroup.add(arrow);
    
    // Arrow glow
    const arrowGlowGeo = new THREE.ConeGeometry(2, 3.5, 6);
    const arrowGlowMat = new THREE.MeshBasicMaterial({ 
      color: 0xff4400, 
      transparent: true, 
      opacity: 0.4 
    });
    const arrowGlow = new THREE.Mesh(arrowGlowGeo, arrowGlowMat);
    arrowGlow.rotation.x = Math.PI;
    arrowGlow.position.y = 0;
    enemyIndicatorGroup.add(arrowGlow);
    
    // "ENEMY" label ring
    const ringGeo = new THREE.TorusGeometry(2, 0.2, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2;
    enemyIndicatorGroup.add(ring);
    
    enemyIndicatorGroup.position.copy(opponentPositionRef.current);
    enemyIndicatorGroup.position.y = 8; // Float above enemy
    scene.add(enemyIndicatorGroup);
    
    // Store for animation
    const enemyIndicator = enemyIndicatorGroup;
    
    // Create player shield
    const shield = createShield(scene);
    shieldMeshRef.current = shield;
    
    // Create opponent shield (for bot)
    const opponentShield = createShield(scene);
    opponentShieldRef.current = opponentShield;
    
    // Initialize bot state
    botElementRef.current = 'fire';
    botShieldActiveRef.current = false;
    botTeleportCooldownRef.current = 0;
    botLastActionRef.current = 0;
    
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
        
        // Check collision - use actual wizard positions, not ref positions
        const isPlayerSpell = spell.ownerId === userIdRef.current;
        let targetPos: THREE.Vector3;
        if (isPlayerSpell) {
          // Player spell hitting opponent
          targetPos = opponentWizardRef.current?.position.clone() || opponentPositionRef.current.clone();
        } else {
          // Enemy spell hitting player
          targetPos = playerWizardRef.current?.position.clone() || playerPositionRef.current.clone();
        }
        // Set Y to match spell Y for better collision
        targetPos.y = spell.position.y;
        const dist = spell.position.distanceTo(targetPos);
        
        // Increased collision radius from 1.8 to 3.0 for better hit detection
        if (dist < 3.0) {
          if (!isPlayerSpell) {
            // Spell hitting PLAYER
            // Check teleport invincibility
            if (teleportInvincibleRef.current && currentTime < teleportInvincibleUntilRef.current) {
              addPopupRef.current(50, 50, 40, 'bonus', 'DODGED!');
              scoreRef.current += 50;
              setScore(scoreRef.current);
              spellsToRemoveRef.current.push(spell.id);
            } else if (shieldActiveRef.current) {
              // Shield ALWAYS deflects spell toward opponent
              const shieldTime = Date.now() - shieldStartTimeRef.current;
              const isPerfect = shieldTime < PARRY_WINDOW;
              
              // Redirect spell toward opponent
              const toOpponent = opponentPositionRef.current.clone().sub(spell.position).normalize();
              spell.velocity.copy(toOpponent.multiplyScalar(SPELL_SPEED * (isPerfect ? 1.8 : 1.2)));
              spell.ownerId = userIdRef.current || '';
              
              if (isPerfect) {
                addPopupRef.current(200, 50, 40, 'perfect', '⚔️ DEFLECT!');
                scoreRef.current += 200;
                setScore(scoreRef.current);
              } else {
                addPopupRef.current(50, 50, 40, 'bonus', '🛡️ DEFLECT!');
                scoreRef.current += 50;
                setScore(scoreRef.current);
              }
            } else {
              // No shield - take damage based on elements
              const { damage, type } = calculateDamage(spell.element, currentElementRef.current);
              
              if (damage === 0) {
                if (type === 'SAME ELEMENT!') {
                  addPopupRef.current(0, 50, 30, 'bonus', 'SAME ELEMENT!');
                } else {
                  addPopupRef.current(0, 50, 30, 'bonus', 'IMMUNE!');
                }
              } else if (damage === DAMAGE_WEAKNESS) {
                addPopupRef.current(0, 50, 30, 'critical', 'SUPER EFFECTIVE! -5❤️');
                heartsRef.current = Math.max(0, heartsRef.current - damage);
                setHearts(Math.ceil(heartsRef.current));
              } else {
                heartsRef.current = Math.max(0, heartsRef.current - damage);
                setHearts(Math.ceil(heartsRef.current));
              }
              
              if (heartsRef.current <= 0) {
                gameActiveRef.current = false;
                setWinner('opponent');
                setGameState('ended');
              }
              spellsToRemoveRef.current.push(spell.id);
            }
          } else {
            // Spell hitting OPPONENT (bot)
            // Check if bot is shielding
            if (botShieldActiveRef.current) {
              // Bot deflects spell back to player!
              const toPlayer = playerPositionRef.current.clone().sub(spell.position).normalize();
              spell.velocity.copy(toPlayer.multiplyScalar(SPELL_SPEED * 1.2));
              spell.ownerId = 'bot';
              // Don't remove spell - it continues toward player
            } else {
              // Calculate damage to opponent based on elements
              const { damage, type } = calculateDamage(spell.element, botElementRef.current);
              
              if (damage === 0) {
                // Opponent immune
                addPopupRef.current(0, 50, 50, 'bonus', `BOT ${type}`);
              } else {
                opponentHeartsRef.current = Math.max(0, opponentHeartsRef.current - damage);
                setOpponentHearts(Math.ceil(opponentHeartsRef.current));
                
                const points = damage === DAMAGE_WEAKNESS ? 500 : 100;
                scoreRef.current += points;
                setScore(scoreRef.current);
                
                if (damage === DAMAGE_WEAKNESS) {
                  addPopupRef.current(points, 50, 50, 'critical', 'SUPER EFFECTIVE!');
                } else {
                  addPopupRef.current(points, 50, 50, 'normal');
                }
              }
              
              if (opponentHeartsRef.current <= 0) {
                gameActiveRef.current = false;
                setWinner('player');
                setGameState('ended');
              }
              spellsToRemoveRef.current.push(spell.id);
            }
          }
        }
        
        // Remove if out of bounds (huge arena)
        if (spell.position.length() > 90) {
          spellsToRemoveRef.current.push(spell.id);
        }
      }
      
      // Update player shield
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
      
      // Update opponent shield position
      if (opponentShieldRef.current && opponentWizardRef.current) {
        opponentShieldRef.current.position.copy(opponentWizardRef.current.position);
        opponentShieldRef.current.position.y += 2;
        
        // Visual feedback when bot is shielding
        if (botShieldActiveRef.current) {
          (opponentShieldRef.current.material as THREE.MeshBasicMaterial).color.setHex(
            ELEMENTS[botElementRef.current].glowColor
          );
        }
      }
      
      // Update enemy indicator - follows enemy and bobs up/down
      if (enemyIndicator && opponentWizardRef.current) {
        enemyIndicator.position.x = opponentWizardRef.current.position.x;
        enemyIndicator.position.z = opponentWizardRef.current.position.z;
        enemyIndicator.position.y = 10 + Math.sin(currentTime * 0.003) * 1.5; // Bob up/down
        enemyIndicator.rotation.y += 0.02; // Spin slowly
      }
      
      // Update username labels to follow wizards
      if (playerNameLabelRef.current && playerWizardRef.current) {
        playerNameLabelRef.current.position.copy(playerWizardRef.current.position);
        playerNameLabelRef.current.position.y = 4.5;
        // Make label always face camera
        if (cameraRef.current) {
          playerNameLabelRef.current.lookAt(cameraRef.current.position);
        }
      }
      
      if (opponentNameLabelRef.current && opponentWizardRef.current) {
        opponentNameLabelRef.current.position.copy(opponentWizardRef.current.position);
        opponentNameLabelRef.current.position.y = 4.5;
        // Make label always face camera
        if (cameraRef.current) {
          opponentNameLabelRef.current.lookAt(cameraRef.current.position);
        }
      }
      
      // MAIN CAMERA TRACKING - Split screen view showing both players
      if (cameraRef.current && playerWizardRef.current && opponentWizardRef.current) {
        const camera = cameraRef.current;
        const playerPos = playerWizardRef.current.position;
        const opponentPos = opponentWizardRef.current.position;
        
        // Calculate midpoint between both players
        const midpoint = new THREE.Vector3()
          .addVectors(playerPos, opponentPos)
          .multiplyScalar(0.5);
        
        // Calculate distance between players to adjust camera for split screen
        const playerDistance = playerPos.distanceTo(opponentPos);
        
        // Camera height and distance adjusted to show both players (split screen)
        const cameraHeight = 22 + (playerDistance * 0.3); // Higher when players are far apart
        const zoomDistance = 20 + (playerDistance * 0.5); // Further back to show both
        
        const targetCamPos = new THREE.Vector3(
          midpoint.x,
          cameraHeight,
          midpoint.z + zoomDistance
        );
        
        // Smooth camera movement
        camera.position.lerp(targetCamPos, 0.05);
        
        // Look at midpoint between players for split screen view
        const lookAtPoint = midpoint.clone();
        lookAtPoint.y = 3; // Look at wizard height
        camera.lookAt(lookAtPoint);
      }
      
      // ENEMY VIEW CAMERA - Sub-screen showing opponent wizard
      if (enemyCameraRef.current && opponentWizardRef.current && enemyRendererRef.current && sceneRef.current) {
        const enemyCamera = enemyCameraRef.current;
        const enemyRenderer = enemyRendererRef.current;
        const opponentPos = opponentWizardRef.current.position;
        
        // Position camera to view opponent from side/above
        const enemyCamPos = new THREE.Vector3(
          opponentPos.x + 8,
          opponentPos.y + 8,
          opponentPos.z + 8
        );
        
        // Smooth camera movement
        enemyCamera.position.lerp(enemyCamPos, 0.05);
        
        // Look at opponent wizard
        const lookAtOpponent = opponentPos.clone();
        lookAtOpponent.y = 3; // Look at wizard height
        enemyCamera.lookAt(lookAtOpponent);
        
        // Render enemy view
        enemyRenderer.render(sceneRef.current, enemyCamera);
      }
      
      // Update spell cooldown
      if (spellCooldownRef.current > 0) {
        spellCooldownRef.current -= 16;
        setSpellCooldown(Math.max(0, spellCooldownRef.current));
      }
      
      // Update teleport cooldown
      if (teleportCooldownRef.current > 0) {
        teleportCooldownRef.current -= 16;
        setTeleportCooldown(Math.max(0, teleportCooldownRef.current));
      }
      
      // Update bot teleport cooldown
      if (botTeleportCooldownRef.current > 0) {
        botTeleportCooldownRef.current -= 16;
      }
      
      // Update bot shield
      if (botShieldActiveRef.current && Date.now() - botShieldStartRef.current > SHIELD_DURATION) {
        botShieldActiveRef.current = false;
        if (opponentShieldRef.current) {
          opponentShieldRef.current.visible = false;
        }
      }
      
      // ============ SMART BOT AI ============
      const timeSinceStart = currentTime - gameStartTime;
      if (gameMode === 'solo' && timeSinceStart > BOT_START_DELAY) {
        const timeSinceLastAction = currentTime - botLastActionRef.current;
        
        // Check for incoming player spells - try to SHIELD or TELEPORT
        const incomingSpells = spellsRef.current.filter(s => 
          s.ownerId === userIdRef.current && 
          s.position.distanceTo(opponentPositionRef.current) < 6
        );
        
        if (incomingSpells.length > 0 && timeSinceLastAction > 500) {
          // 50% chance to shield, 30% chance to teleport, 20% chance to do nothing
          const action = Math.random();
          
          if (action < 0.5 && !botShieldActiveRef.current) {
            // BOT SHIELD!
            botShieldActiveRef.current = true;
            botShieldStartRef.current = Date.now();
            botLastActionRef.current = currentTime;
            
            // Show opponent shield
            if (opponentShieldRef.current) {
              opponentShieldRef.current.visible = true;
              (opponentShieldRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5;
            }
          } else if (action < 0.8 && botTeleportCooldownRef.current <= 0) {
            // BOT TELEPORT!
            const randomZone = TELEPORT_ZONES[Math.floor(Math.random() * TELEPORT_ZONES.length)];
            opponentPositionRef.current.set(randomZone.x, 0, randomZone.z);
            if (opponentWizardRef.current) {
              opponentWizardRef.current.position.copy(opponentPositionRef.current);
            }
            
            // Change element and update glow
            botElementRef.current = randomZone.element;
            if (opponentGlowRef.current) {
              (opponentGlowRef.current.material as THREE.MeshBasicMaterial).color.setHex(
                ELEMENTS[randomZone.element].glowColor
              );
            }
            if (opponentStaffRef.current) {
              const orbGlow = opponentStaffRef.current.getObjectByName('staffOrbGlow') as THREE.Mesh;
              if (orbGlow) {
                (orbGlow.material as THREE.MeshBasicMaterial).color.setHex(
                  ELEMENTS[randomZone.element].glowColor
                );
              }
            }
            
            botTeleportCooldownRef.current = TELEPORT_COOLDOWN;
            botLastActionRef.current = currentTime;
          }
        }
        
        // Shoot spell every 2-3 seconds
        if (currentTime - lastBotShot > 2000 + Math.random() * 1000) {
          lastBotShot = currentTime;
          
          // Bot shoots its current element
          const spellMesh = createSpellMesh(botElementRef.current);
          const startPos = opponentPositionRef.current.clone();
          startPos.y += 2.5;
          
          const direction = playerPositionRef.current.clone().sub(startPos).normalize();
          
          const spell: Spell = {
            id: `bot-${Date.now()}`,
            mesh: spellMesh,
            element: botElementRef.current,
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
      }
      
      // Render main view
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(scene, cameraRef.current);
      }
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
  
  // Fire spell with cooldown
  const fireSpell = useCallback(() => {
    if (!gameActiveRef.current || !sceneRef.current || !playerWizardRef.current) return;
    
    // Check spell cooldown
    const now = Date.now();
    if (now - lastSpellTimeRef.current < SPELL_COOLDOWN) return;
    
    lastSpellTimeRef.current = now;
    spellCooldownRef.current = SPELL_COOLDOWN;
    setSpellCooldown(SPELL_COOLDOWN);
    
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
  
  // Change element - also updates player glow (MUST be defined before teleportTo)
  const changeElement = useCallback((element: Element) => {
    currentElementRef.current = element;
    setCurrentElement(element);
    
    const elementData = ELEMENTS[element];
    
    // Update staff orb
    if (playerStaffRef.current) {
      const orb = playerStaffRef.current.getObjectByName('staffOrb') as THREE.Mesh;
      const orbGlow = playerStaffRef.current.getObjectByName('staffOrbGlow') as THREE.Mesh;
      if (orb) {
        const mat = orb.material as THREE.MeshStandardMaterial;
        mat.color.setHex(elementData.color);
        mat.emissive.setHex(elementData.glowColor);
      }
      if (orbGlow) {
        const mat = orbGlow.material as THREE.MeshBasicMaterial;
        mat.color.setHex(elementData.glowColor);
      }
    }
    
    // Update player glow
    if (playerGlowRef.current) {
      const mat = playerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(elementData.glowColor);
    }
  }, []);
  
  // Teleport - also changes element and gives invincibility frames
  const teleportTo = useCallback((zoneId: string) => {
    if (!gameActiveRef.current || teleportCooldownRef.current > 0 || !playerWizardRef.current) return;
    
    const zone = TELEPORT_ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    
    // Move to zone
    const newPos = new THREE.Vector3(zone.x, 0, zone.z);
    playerPositionRef.current.copy(newPos);
    playerWizardRef.current.position.copy(newPos);
    teleportCooldownRef.current = TELEPORT_COOLDOWN;
    setTeleportCooldown(TELEPORT_COOLDOWN);
    
    // Invincibility frames for dodging
    teleportInvincibleRef.current = true;
    teleportInvincibleUntilRef.current = Date.now() + 500; // 0.5 second invincibility
    setTimeout(() => {
      teleportInvincibleRef.current = false;
    }, 500);
    
    // Change element to zone's element
    changeElement(zone.element);
    
    addPopup(0, 50, 50, 'bonus', `${ELEMENTS[zone.element].emoji} ${ELEMENTS[zone.element].name.toUpperCase()}!`);
  }, [addPopup, changeElement]);
  
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
  
  // Render hearts - simplified for mobile
  const renderHearts = (count: number, max: number, color: string) => {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xl">❤️</span>
        <span className="text-xl font-bold" style={{ color }}>{count}/{max}</span>
      </div>
    );
  };
  
  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-indigo-900 to-black overflow-hidden flex items-center justify-center">
        {/* Exit button on menu */}
        {onExit && (
          <button
            onClick={onExit}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-red-600/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-110"
          >
            ✕
          </button>
        )}
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
  
  // Playing state - FULL SCREEN
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Enemy View Sub-Screen - Top Right Corner - BIGGER */}
      {gameState === 'playing' && (
        <div className="absolute top-20 right-4 z-40 w-[350px] h-[260px] bg-black/90 border-2 border-orange-500/50 rounded-lg overflow-hidden shadow-2xl">
          <div className="absolute top-1 left-2 text-sm text-orange-400 font-bold z-10">ENEMY VIEW</div>
          <div ref={enemyViewRef} className="absolute inset-0" />
        </div>
      )}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Exit button - always accessible */}
          <button
            onClick={() => {
              gameActiveRef.current = false;
              setGameState('menu');
              spellsRef.current = [];
              if (onExit) onExit();
            }}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-red-600/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white font-bold transition-all hover:scale-110"
          >
            ✕
          </button>
          
          {/* Top HUD - Mobile optimized */}
          <div className="absolute top-0 left-0 right-0 p-2 md:p-3 pointer-events-none">
            <div className="flex justify-between items-start gap-1 md:gap-2">
              {/* Player */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3">
                <div className="text-cyan-400 font-bold text-xs md:text-sm">YOU</div>
                {renderHearts(hearts, MAX_HEARTS, '#00ffff')}
              </div>
              
              {/* Timer & Score */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg md:rounded-xl px-3 md:px-4 py-1 md:py-2 text-center">
                <div className={`text-2xl md:text-3xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-yellow-400 font-bold text-xs md:text-sm">⭐ {score}</div>
              </div>
              
              {/* Opponent */}
              <div className="bg-black/80 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3">
                <div className="text-orange-400 font-bold text-xs md:text-sm text-right">ENEMY</div>
                <div className="flex justify-end">
                  {renderHearts(opponentHearts, MAX_HEARTS, '#ff4400')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Current Element + Shield Status - Mobile optimized */}
          <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg md:rounded-xl px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2">
            <span className="text-xl md:text-2xl">{ELEMENTS[currentElement].emoji}</span>
            <span className="text-white font-bold text-sm md:text-base">{ELEMENTS[currentElement].name}</span>
            {isShielding && <span className="text-cyan-400 animate-pulse ml-1 md:ml-2">🛡️</span>}
          </div>
          
          {/* Element selector + Cast buttons - Combined, closer to bottom */}
          <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 overflow-x-auto">
            <div className="bg-black/90 backdrop-blur-sm rounded-xl p-2 md:p-2.5 flex gap-2 md:gap-2 w-max mx-auto border-2 border-white/20">
              {ELEMENT_ORDER.map((el) => (
                <button
                  key={el}
                  onClick={() => {
                    changeElement(el);
                    // Cast spell when clicking selected element
                    if (currentElement === el && spellCooldown === 0) {
                      fireSpell();
                    }
                  }}
                  disabled={spellCooldown > 0 && currentElement === el}
                  className={`w-16 h-16 md:w-14 md:h-14 rounded-xl flex flex-col items-center justify-center text-2xl md:text-xl transition-all touch-manipulation relative ${
                    currentElement === el 
                      ? spellCooldown > 0
                        ? 'bg-gray-700/80 scale-100 ring-2 ring-gray-500' 
                        : 'bg-gradient-to-t from-orange-700 to-orange-500 scale-110 ring-4 ring-orange-400 shadow-lg shadow-orange-500/50'
                      : 'bg-white/10 active:bg-white/30 hover:bg-white/20'
                  }`}
                >
                  <span>{ELEMENTS[el].emoji}</span>
                  {currentElement === el && spellCooldown > 0 && (
                    <>
                      <div className="text-[10px] font-bold text-white mt-0.5">
                        {(spellCooldown / 1000).toFixed(1)}s
                      </div>
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-orange-400 rounded-b-xl transition-all"
                        style={{ width: `${(1 - spellCooldown / SPELL_COOLDOWN) * 100}%` }}
                      />
                    </>
                  )}
                  {currentElement === el && spellCooldown === 0 && (
                    <div className="text-[9px] font-bold text-white mt-0.5">CAST</div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Shield button - Closer to bottom */}
          <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4">
            <button
              onMouseDown={activateShield}
              onMouseUp={deactivateShield}
              onTouchStart={(e) => { e.preventDefault(); activateShield(); }}
              onTouchEnd={(e) => { e.preventDefault(); deactivateShield(); }}
              disabled={shieldCooldown > 0}
              className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl font-bold transition-all active:scale-90 shadow-lg touch-manipulation ${
                shieldCooldown > 0 
                  ? 'bg-gray-700 text-gray-400' 
                  : isShielding 
                    ? 'bg-cyan-400 text-white animate-pulse shadow-cyan-400/50' 
                    : 'bg-gradient-to-t from-cyan-700 to-cyan-500 text-white shadow-cyan-500/30'
              }`}
            >
              <div className="text-3xl md:text-4xl">🛡️</div>
              <div className="text-xs font-bold">{shieldCooldown > 0 ? 'WAIT' : isShielding ? 'HOLD!' : 'SHIELD'}</div>
            </button>
          </div>
          
          {/* Element Teleport buttons - Mobile optimized with bigger buttons */}
          <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-black/80 backdrop-blur-sm rounded-xl p-1.5 md:p-2">
            <div className="text-[10px] md:text-xs text-gray-400 text-center mb-1 md:mb-2">TELEPORT</div>
            <div className="grid grid-cols-3 gap-0.5 md:gap-1">
              {/* Row 1: Fire (north) */}
              <div></div>
              <button
                onClick={() => teleportTo('fire')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-orange-600/80 active:bg-orange-500 active:scale-95'
                } ${currentElement === 'fire' ? 'ring-2 ring-white' : ''}`}
              >
                🔥
              </button>
              <div></div>
              
              {/* Row 2: Dark (west), Light (center), Water (east) */}
              <button
                onClick={() => teleportTo('dark')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-purple-900/80 active:bg-purple-800 active:scale-95'
                } ${currentElement === 'dark' ? 'ring-2 ring-white' : ''}`}
              >
                🌑
              </button>
              <button
                onClick={() => teleportTo('light')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-yellow-100/80 active:bg-yellow-50 active:scale-95'
                } ${currentElement === 'light' ? 'ring-2 ring-purple-500' : ''}`}
              >
                ✨
              </button>
              <button
                onClick={() => teleportTo('water')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-blue-600/80 active:bg-blue-500 active:scale-95'
                } ${currentElement === 'water' ? 'ring-2 ring-white' : ''}`}
              >
                💧
              </button>
              
              {/* Row 3: Nature (southwest), Electric (south center), Earth (southeast) */}
              <button
                onClick={() => teleportTo('nature')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-green-600/80 active:bg-green-500 active:scale-95'
                } ${currentElement === 'nature' ? 'ring-2 ring-white' : ''}`}
              >
                🌿
              </button>
              <button
                onClick={() => teleportTo('electric')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-yellow-500/80 active:bg-yellow-400 active:scale-95'
                } ${currentElement === 'electric' ? 'ring-2 ring-white' : ''}`}
              >
                ⚡
              </button>
              <button
                onClick={() => teleportTo('earth')}
                disabled={teleportCooldown > 0}
                className={`w-12 h-12 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-xl md:text-lg transition-all touch-manipulation ${
                  teleportCooldown > 0 ? 'bg-gray-700 opacity-50' : 'bg-amber-700/80 active:bg-amber-600 active:scale-95'
                } ${currentElement === 'earth' ? 'ring-2 ring-white' : ''}`}
              >
                🪨
              </button>
            </div>
            {teleportCooldown > 0 && (
              <div className="text-[10px] md:text-xs text-center text-gray-400 mt-1">
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
