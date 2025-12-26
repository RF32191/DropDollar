'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiplayerLobby } from '@/hooks/useMultiplayerLobby';
import FloatingScore, { useFloatingScores } from './FloatingScore';

// ============================================================================
// WIZARD WARZ - 3D Multiplayer Wizard Battle Game
// Features:
// - Elemental spells with Pokemon-style weaknesses
// - Teleportation zones
// - Perfect parry timing for deflections
// - Lock-on targeting
// - Shield spells
// ============================================================================

// Element types and their properties
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

// Teleport zones on the map
const TELEPORT_ZONES = [
  { id: 'north', position: new THREE.Vector3(0, 0, -8), color: 0x00ffff },
  { id: 'south', position: new THREE.Vector3(0, 0, 8), color: 0xff00ff },
  { id: 'east', position: new THREE.Vector3(8, 0, 0), color: 0xffff00 },
  { id: 'west', position: new THREE.Vector3(-8, 0, 0), color: 0x00ff00 },
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

const GAME_DURATION = 120; // 2 minute matches
const SPELL_SPEED = 0.4;
const SPELL_DAMAGE = 20;
const COUNTER_MULTIPLIER = 2.0; // Double damage for effective elements
const RESIST_MULTIPLIER = 0.5; // Half damage for resisted elements
const PARRY_WINDOW = 300; // ms for perfect parry
const SHIELD_DURATION = 2000; // ms shield lasts
const TELEPORT_COOLDOWN = 3000; // ms between teleports

export default function WizardWarzGame({
  onGameEnd,
  onExit,
  isCompetitionMode = false,
}: WizardWarzGameProps) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<'menu' | 'matchmaking' | 'lobby' | 'playing' | 'ended'>('menu');
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo');
  
  // Multiplayer
  const lobby = useMultiplayerLobby(
    'wizard-warz',
    user?.id,
    user?.email?.split('@')[0] || 'Wizard'
  );
  
  // Game state
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [currentElement, setCurrentElement] = useState<Element>('fire');
  const [isShielding, setIsShielding] = useState(false);
  const [shieldCooldown, setShieldCooldown] = useState(0);
  const [teleportCooldown, setTeleportCooldown] = useState(0);
  const [isLockedOn, setIsLockedOn] = useState(true);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState<string | null>(null);
  
  // Floating scores
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
  const shieldMeshRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const healthRef = useRef(100);
  const opponentHealthRef = useRef(100);
  const scoreRef = useRef(0);
  const lastPositionSentRef = useRef(0);
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 5));
  const opponentPositionRef = useRef(new THREE.Vector3(0, 0, -5));
  const shieldActiveRef = useRef(false);
  const shieldStartTimeRef = useRef(0);
  const teleportCooldownRef = useRef(0);
  const currentElementRef = useRef<Element>('fire');
  
  // Create wizard mesh
  const createWizard = useCallback((scene: THREE.Scene, color: number, isPlayer: boolean) => {
    const wizard = new THREE.Group();
    
    // Robe/body
    const robeGeo = new THREE.ConeGeometry(0.8, 2.5, 8);
    const robeMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
    const robe = new THREE.Mesh(robeGeo, robeMat);
    robe.position.y = 1.25;
    wizard.add(robe);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.8;
    wizard.add(head);
    
    // Hat
    const hatGeo = new THREE.ConeGeometry(0.5, 1.2, 8);
    const hatMat = new THREE.MeshStandardMaterial({ color: color * 0.5, emissive: color, emissiveIntensity: 0.1 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 3.6;
    wizard.add(hat);
    
    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 3.0;
    wizard.add(brim);
    
    // Staff
    const staff = new THREE.Group();
    const staffPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8);
    const staffPoleMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const staffPole = new THREE.Mesh(staffPoleGeo, staffPoleMat);
    staffPole.position.y = 1.25;
    staff.add(staffPole);
    
    // Staff orb
    const orbGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const orbMat = new THREE.MeshStandardMaterial({ 
      color: ELEMENTS[currentElementRef.current].color,
      emissive: ELEMENTS[currentElementRef.current].glowColor,
      emissiveIntensity: 0.8
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 2.6;
    orb.name = 'staffOrb';
    staff.add(orb);
    
    staff.position.x = 0.8;
    staff.rotation.z = -0.3;
    wizard.add(staff);
    
    if (isPlayer) {
      playerStaffRef.current = staff;
    }
    
    // Glow effect
    const glowGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 1.5;
    wizard.add(glow);
    
    scene.add(wizard);
    return wizard;
  }, []);
  
  // Create spell projectile
  const createSpellMesh = useCallback((element: Element) => {
    const spell = new THREE.Group();
    const data = ELEMENTS[element];
    
    // Core
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: data.glowColor,
      emissiveIntensity: 1
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    spell.add(core);
    
    // Outer glow
    const glowGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: data.glowColor,
      transparent: true,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    spell.add(glow);
    
    // Element-specific particles
    for (let i = 0; i < 6; i++) {
      const particleGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const particleMat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.8 });
      const particle = new THREE.Mesh(particleGeo, particleMat);
      const angle = (i / 6) * Math.PI * 2;
      particle.position.set(Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0);
      particle.userData.angle = angle;
      particle.userData.isParticle = true;
      spell.add(particle);
    }
    
    return spell;
  }, []);
  
  // Create shield mesh
  const createShield = useCallback((scene: THREE.Scene) => {
    const shieldGeo = new THREE.SphereGeometry(1.5, 32, 32);
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
  
  // Create teleport zone
  const createTeleportZone = useCallback((scene: THREE.Scene, zone: typeof TELEPORT_ZONES[0]) => {
    const zoneGroup = new THREE.Group();
    
    // Platform
    const platformGeo = new THREE.CylinderGeometry(1, 1, 0.2, 16);
    const platformMat = new THREE.MeshStandardMaterial({
      color: zone.color,
      emissive: zone.color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    zoneGroup.add(platform);
    
    // Ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.05, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: zone.color });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    zoneGroup.add(ring);
    
    zoneGroup.position.copy(zone.position);
    zoneGroup.userData.zoneId = zone.id;
    scene.add(zoneGroup);
    
    return zoneGroup;
  }, []);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current || gameState !== 'playing') return;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a2e);
    scene.fog = new THREE.Fog(0x1a0a2e, 10, 50);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(60, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    
    const purpleLight = new THREE.PointLight(0x8800ff, 1, 20);
    purpleLight.position.set(-5, 5, 0);
    scene.add(purpleLight);
    
    const cyanLight = new THREE.PointLight(0x00ffff, 1, 20);
    cyanLight.position.set(5, 5, 0);
    scene.add(cyanLight);
    
    // Ground/Arena
    const groundGeo = new THREE.CircleGeometry(15, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a1a4a,
      emissive: 0x1a0a2e,
      emissiveIntensity: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Arena border
    const borderGeo = new THREE.TorusGeometry(15, 0.3, 8, 64);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x8800ff });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = Math.PI / 2;
    scene.add(border);
    
    // Create teleport zones
    TELEPORT_ZONES.forEach(zone => createTeleportZone(scene, zone));
    
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
    
    // Start game
    gameActiveRef.current = true;
    healthRef.current = 100;
    opponentHealthRef.current = 100;
    scoreRef.current = 0;
    setHealth(100);
    setOpponentHealth(100);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    
    // Game timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          gameActiveRef.current = false;
          determineWinner();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Animation loop
    const animate = () => {
      if (!gameActiveRef.current) return;
      
      animationRef.current = requestAnimationFrame(animate);
      
      // Update spells
      spellsRef.current.forEach((spell, index) => {
        spell.position.add(spell.velocity);
        spell.mesh.position.copy(spell.position);
        
        // Rotate particles
        spell.mesh.children.forEach(child => {
          if (child.userData.isParticle) {
            child.userData.angle += 0.1;
            const r = 0.4;
            child.position.x = Math.cos(child.userData.angle) * r;
            child.position.y = Math.sin(child.userData.angle) * r;
          }
        });
        
        // Check collision with opponent
        if (spell.ownerId === user?.id) {
          const dist = spell.position.distanceTo(opponentPositionRef.current);
          if (dist < 1.5) {
            handleSpellHit(spell, false);
            removeSpell(index);
          }
        } else {
          const dist = spell.position.distanceTo(playerPositionRef.current);
          if (dist < 1.5) {
            // Check if shielding for parry
            if (shieldActiveRef.current) {
              const shieldTime = Date.now() - shieldStartTimeRef.current;
              if (shieldTime < PARRY_WINDOW) {
                // Perfect parry! Deflect spell back
                handlePerfectParry(spell);
              } else {
                // Regular block - reduced damage
                handleSpellHit(spell, true, 0.3);
              }
            } else {
              handleSpellHit(spell, true);
            }
            removeSpell(index);
          }
        }
        
        // Remove if out of bounds
        if (spell.position.length() > 20) {
          removeSpell(index);
        }
      });
      
      // Update shield position
      if (shieldMeshRef.current && playerWizardRef.current) {
        shieldMeshRef.current.position.copy(playerWizardRef.current.position);
        shieldMeshRef.current.position.y += 1.5;
        
        // Check shield duration
        if (shieldActiveRef.current && Date.now() - shieldStartTimeRef.current > SHIELD_DURATION) {
          deactivateShield();
        }
      }
      
      // Update cooldowns
      if (teleportCooldownRef.current > 0) {
        teleportCooldownRef.current -= 16;
        setTeleportCooldown(Math.max(0, teleportCooldownRef.current));
      }
      
      // Bot AI for solo mode
      if (gameMode === 'solo' && Math.random() < 0.02) {
        fireBotSpell();
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    return () => {
      clearInterval(timerInterval);
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [gameState, createWizard, createShield, createTeleportZone, gameMode, user?.id]);
  
  // Remove spell helper
  const removeSpell = useCallback((index: number) => {
    const spell = spellsRef.current[index];
    if (spell && sceneRef.current) {
      sceneRef.current.remove(spell.mesh);
    }
    spellsRef.current.splice(index, 1);
  }, []);
  
  // Handle spell hit
  const handleSpellHit = useCallback((spell: Spell, hitPlayer: boolean, damageMultiplier = 1) => {
    let damage = spell.damage * damageMultiplier;
    const targetElement = currentElementRef.current;
    
    // Check element effectiveness
    const spellData = ELEMENTS[spell.element];
    if (hitPlayer) {
      if (spellData.beats.includes(targetElement)) {
        damage *= COUNTER_MULTIPLIER;
        addPopup({ id: Date.now().toString(), x: 50, y: 30, text: '💥 SUPER EFFECTIVE!', color: '#ff4444' });
      } else if (spellData.weakTo.includes(targetElement)) {
        damage *= RESIST_MULTIPLIER;
        addPopup({ id: Date.now().toString(), x: 50, y: 30, text: '🛡️ RESISTED!', color: '#44ff44' });
      }
      
      healthRef.current = Math.max(0, healthRef.current - damage);
      setHealth(healthRef.current);
      
      if (healthRef.current <= 0) {
        gameActiveRef.current = false;
        setWinner('opponent');
        setGameState('ended');
      }
    } else {
      opponentHealthRef.current = Math.max(0, opponentHealthRef.current - damage);
      setOpponentHealth(opponentHealthRef.current);
      scoreRef.current += Math.floor(damage * 10);
      setScore(scoreRef.current);
      
      addPopup({ id: Date.now().toString(), x: 50, y: 50, text: `+${Math.floor(damage * 10)}`, color: '#ffff00' });
      
      if (opponentHealthRef.current <= 0) {
        gameActiveRef.current = false;
        setWinner('player');
        setGameState('ended');
      }
    }
  }, [addPopup]);
  
  // Handle perfect parry
  const handlePerfectParry = useCallback((spell: Spell) => {
    addPopup({ id: Date.now().toString(), x: 50, y: 40, text: '⚔️ PERFECT PARRY!', color: '#00ffff' });
    scoreRef.current += 200;
    setScore(scoreRef.current);
    
    // Reverse spell direction
    spell.velocity.multiplyScalar(-1.5);
    spell.ownerId = user?.id || '';
    spell.damage *= 1.5;
  }, [addPopup, user?.id]);
  
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
    if (!shieldMeshRef.current) return;
    
    shieldActiveRef.current = false;
    shieldMeshRef.current.visible = false;
    (shieldMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
    setIsShielding(false);
    setShieldCooldown(1000);
    
    setTimeout(() => setShieldCooldown(0), 1000);
  }, []);
  
  // Fire spell
  const fireSpell = useCallback(() => {
    if (!gameActiveRef.current || !sceneRef.current || !playerWizardRef.current) return;
    
    const spellMesh = createSpellMesh(currentElementRef.current);
    const startPos = playerWizardRef.current.position.clone();
    startPos.y += 2;
    
    const direction = opponentPositionRef.current.clone().sub(startPos).normalize();
    
    const spell: Spell = {
      id: Date.now().toString(),
      mesh: spellMesh,
      element: currentElementRef.current,
      position: startPos,
      velocity: direction.multiplyScalar(SPELL_SPEED),
      ownerId: user?.id || '',
      damage: SPELL_DAMAGE,
      createdAt: Date.now()
    };
    
    spellMesh.position.copy(startPos);
    sceneRef.current.add(spellMesh);
    spellsRef.current.push(spell);
  }, [createSpellMesh, user?.id]);
  
  // Bot fires spell
  const fireBotSpell = useCallback(() => {
    if (!gameActiveRef.current || !sceneRef.current || !opponentWizardRef.current) return;
    
    const randomElement = ELEMENT_ORDER[Math.floor(Math.random() * ELEMENT_ORDER.length)];
    const spellMesh = createSpellMesh(randomElement);
    const startPos = opponentWizardRef.current.position.clone();
    startPos.y += 2;
    
    const direction = playerPositionRef.current.clone().sub(startPos).normalize();
    
    const spell: Spell = {
      id: Date.now().toString(),
      mesh: spellMesh,
      element: randomElement,
      position: startPos,
      velocity: direction.multiplyScalar(SPELL_SPEED * 0.8),
      ownerId: 'bot',
      damage: SPELL_DAMAGE * 0.8,
      createdAt: Date.now()
    };
    
    spellMesh.position.copy(startPos);
    sceneRef.current.add(spellMesh);
    spellsRef.current.push(spell);
  }, [createSpellMesh]);
  
  // Teleport to zone
  const teleportTo = useCallback((zoneId: string) => {
    if (!gameActiveRef.current || teleportCooldownRef.current > 0 || !playerWizardRef.current) return;
    
    const zone = TELEPORT_ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    
    playerPositionRef.current.copy(zone.position);
    playerWizardRef.current.position.copy(zone.position);
    teleportCooldownRef.current = TELEPORT_COOLDOWN;
    setTeleportCooldown(TELEPORT_COOLDOWN);
    
    addPopup({ id: Date.now().toString(), x: 50, y: 50, text: '✨ TELEPORT!', color: '#00ffff' });
  }, [addPopup]);
  
  // Change element
  const changeElement = useCallback((element: Element) => {
    currentElementRef.current = element;
    setCurrentElement(element);
    
    // Update staff orb color
    if (playerStaffRef.current) {
      const orb = playerStaffRef.current.getObjectByName('staffOrb') as THREE.Mesh;
      if (orb) {
        const mat = orb.material as THREE.MeshStandardMaterial;
        mat.color.setHex(ELEMENTS[element].color);
        mat.emissive.setHex(ELEMENTS[element].glowColor);
      }
    }
  }, []);
  
  // Determine winner
  const determineWinner = useCallback(() => {
    if (healthRef.current > opponentHealthRef.current) {
      setWinner('player');
    } else if (opponentHealthRef.current > healthRef.current) {
      setWinner('opponent');
    } else {
      setWinner('draw');
    }
    setGameState('ended');
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
  
  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
  }, []);
  
  // Menu screen
  if (gameState === 'menu') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-purple-900 via-indigo-900 to-black rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            🧙 WIZARD WARZ ⚔️
          </h1>
          <p className="text-gray-400 text-lg mb-8">Master the elements. Defeat your opponent.</p>
          
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            <button
              onClick={() => { setGameMode('solo'); startGame(); }}
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
          <div className="mt-8 bg-black/30 rounded-xl p-4 max-w-lg mx-auto">
            <h3 className="text-white font-bold mb-3">Element Chart</h3>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {ELEMENT_ORDER.map(el => (
                <div key={el} className="text-center">
                  <span className="text-2xl">{ELEMENTS[el].emoji}</span>
                  <div className="text-xs text-gray-400">{ELEMENTS[el].name}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Controls */}
          <div className="mt-6 text-gray-400 text-sm">
            <p>Space/F: Cast Spell • E/Shift: Shield • Q/R: Switch Element</p>
            <p>1-7: Select Element • Perfect timing = Parry!</p>
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
          {/* Top HUD - Health bars */}
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex justify-between items-start gap-4">
              {/* Player health */}
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 flex-1 max-w-xs">
                <div className="text-cyan-400 font-bold mb-1">YOU</div>
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all"
                    style={{ width: `${health}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">{health}/100 HP</div>
              </div>
              
              {/* Timer */}
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-2 text-center">
                <div className={`text-4xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-400">TIME</div>
              </div>
              
              {/* Opponent health */}
              <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 flex-1 max-w-xs">
                <div className="text-orange-400 font-bold mb-1 text-right">OPPONENT</div>
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                    style={{ width: `${opponentHealth}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1 text-right">{opponentHealth}/100 HP</div>
              </div>
            </div>
            
            {/* Score */}
            <div className="text-center mt-2">
              <span className="text-yellow-400 font-bold text-xl">Score: {score}</span>
            </div>
          </div>
          
          {/* Current Element */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-2xl">{ELEMENTS[currentElement].emoji}</span>
            <span className="text-white font-bold">{ELEMENTS[currentElement].name}</span>
            {isShielding && <span className="text-cyan-400 animate-pulse">🛡️ SHIELD</span>}
          </div>
          
          {/* Element selector */}
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-xl p-2 flex gap-1">
            {ELEMENT_ORDER.map((el, i) => (
              <button
                key={el}
                onClick={() => changeElement(el)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all ${
                  currentElement === el 
                    ? 'bg-white/30 scale-110 ring-2 ring-white' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                style={{ 
                  boxShadow: currentElement === el ? `0 0 20px ${ELEMENTS[el].glowColor.toString(16)}` : 'none'
                }}
              >
                {ELEMENTS[el].emoji}
              </button>
            ))}
          </div>
          
          {/* Action buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={fireSpell}
              className="px-8 py-4 bg-gradient-to-t from-orange-700 to-orange-500 hover:from-orange-600 hover:to-orange-400 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg"
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
                    ? 'bg-cyan-500 text-white animate-pulse' 
                    : 'bg-gradient-to-t from-cyan-700 to-cyan-500 hover:from-cyan-600 hover:to-cyan-400 text-white'
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
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
                  teleportCooldown > 0 ? 'bg-gray-600' : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
              >
                ⬆️
              </button>
              <div></div>
              <button
                onClick={() => teleportTo('west')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
                  teleportCooldown > 0 ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                ⬅️
              </button>
              <button
                onClick={() => teleportTo('center')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
                  teleportCooldown > 0 ? 'bg-gray-600' : 'bg-orange-600 hover:bg-orange-500'
                }`}
              >
                ⭕
              </button>
              <button
                onClick={() => teleportTo('east')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
                  teleportCooldown > 0 ? 'bg-gray-600' : 'bg-yellow-600 hover:bg-yellow-500'
                }`}
              >
                ➡️
              </button>
              <div></div>
              <button
                onClick={() => teleportTo('south')}
                disabled={teleportCooldown > 0}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm ${
                  teleportCooldown > 0 ? 'bg-gray-600' : 'bg-pink-600 hover:bg-pink-500'
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
          
          {/* Floating scores */}
          <FloatingScore popups={popups} onRemove={removePopup} />
        </>
      )}
      
      {/* Game Over */}
      {gameState === 'ended' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <h2 className={`text-6xl font-black mb-4 ${
              winner === 'player' ? 'text-green-400' : winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {winner === 'player' ? '🏆 VICTORY!' : winner === 'opponent' ? '💀 DEFEAT' : '🤝 DRAW'}
            </h2>
            <div className="text-3xl text-yellow-400 mb-4">Score: {score}</div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { setGameState('menu'); setWinner(null); }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white"
              >
                Play Again
              </button>
              {onExit && (
                <button
                  onClick={onExit}
                  className="px-8 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold text-white"
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

