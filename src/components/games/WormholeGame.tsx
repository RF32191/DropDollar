'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  // All refs
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const initRef = useRef(false);
  
  const playerRef = useRef({ position: new THREE.Vector3(0, 2, 5), velocity: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: true });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const isMouseDownRef = useRef(false);
  const swordRef = useRef<THREE.Group | null>(null);
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const enemiesRef = useRef<any[]>([]);
  const portalsRef = useRef<{ green: any; cyan: any }>({ green: null, cyan: null });
  
  // All state
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [portalMode, setPortalMode] = useState<'green' | 'cyan'>('green');
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [targetsCollected, setTargetsCollected] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [playerHealth, setPlayerHealth] = useState(3);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [currentRoom, setCurrentRoom] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  
  const scoreRef = useRef(0);
  const transitionTriggeredRef = useRef(false);
  
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0); }, []);

  // ==================== MAIN INIT - ALL CODE INLINE ====================
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;
    
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 30, 120);
    sceneRef.current = scene;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;
    
    // ==================== LIGHTING ====================
    scene.add(new THREE.AmbientLight(0x6666aa, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(10, 30, 10);
    dir.castShadow = true;
    scene.add(dir);
    
    // Room 1 lights
    const p1 = new THREE.PointLight(0x3399ff, 2, 50);
    p1.position.set(-8, 12, -8);
    scene.add(p1);
    const p2 = new THREE.PointLight(0x00ffff, 2, 50);
    p2.position.set(8, 12, 8);
    scene.add(p2);
    const p3 = new THREE.PointLight(0x00ff88, 2, 40);
    p3.position.set(0, 20, 0);
    scene.add(p3);
    
    // Room 2 lights
    const p4 = new THREE.PointLight(0xff6688, 2, 50);
    p4.position.set(35, 12, -8);
    scene.add(p4);
    const p5 = new THREE.PointLight(0xffaa00, 2, 50);
    p5.position.set(43, 12, 8);
    scene.add(p5);
    
    // Bridge light
    const bridgeLight = new THREE.PointLight(0xffff00, 2, 30);
    bridgeLight.position.set(20, 25, 0);
    scene.add(bridgeLight);
    
    // ==================== ROOM 1 ====================
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, side: THREE.DoubleSide });
    
    // Floor
    const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor1.rotation.x = -Math.PI / 2;
    floor1.receiveShadow = true;
    scene.add(floor1);
    scene.add(new THREE.GridHelper(30, 30, 0x4444ff, 0x222244));
    
    // Walls Room 1
    const wh = 25;
    const bw1 = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat);
    bw1.position.set(0, wh/2, -15);
    bw1.userData.portalable = true;
    scene.add(bw1);
    
    const fw1 = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat.clone());
    fw1.position.set(0, wh/2, 15);
    fw1.rotation.y = Math.PI;
    fw1.userData.portalable = true;
    scene.add(fw1);
    
    const lw1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wh, 30), wallMat.clone());
    lw1.position.set(-15, wh/2, 0);
    lw1.userData.portalable = true;
    scene.add(lw1);
    
    const rw1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 30), wallMat.clone());
    rw1.position.set(15, 9, 0);
    rw1.userData.portalable = true;
    scene.add(rw1);
    
    const ceil1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    ceil1.position.set(0, wh, 0);
    ceil1.rotation.x = Math.PI / 2;
    scene.add(ceil1);
    
    // ==================== ROOM 2 ====================
    const r2x = 35;
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x664455, roughness: 0.5, side: THREE.DoubleSide });
    
    const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat.clone());
    floor2.rotation.x = -Math.PI / 2;
    floor2.position.set(r2x, 0, 0);
    scene.add(floor2);
    const grid2 = new THREE.GridHelper(30, 30, 0xff4444, 0x442222);
    grid2.position.set(r2x, 0, 0);
    scene.add(grid2);
    
    const bw2 = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat2);
    bw2.position.set(r2x, wh/2, -15);
    bw2.userData.portalable = true;
    scene.add(bw2);
    
    const fw2 = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat2.clone());
    fw2.position.set(r2x, wh/2, 15);
    fw2.rotation.y = Math.PI;
    fw2.userData.portalable = true;
    scene.add(fw2);
    
    const lw2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 30), wallMat2.clone());
    lw2.position.set(r2x - 15, 9, 0);
    lw2.userData.portalable = true;
    scene.add(lw2);
    
    const rw2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wh, 30), wallMat2.clone());
    rw2.position.set(r2x + 15, wh/2, 0);
    rw2.userData.portalable = true;
    scene.add(rw2);
    
    const ceil2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x332233 }));
    ceil2.position.set(r2x, wh, 0);
    ceil2.rotation.x = Math.PI / 2;
    scene.add(ceil2);
    
    // ==================== BRIDGE ====================
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200, roughness: 0.3 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 6), bridgeMat);
    bridge.position.set(20, 22, 0);
    scene.add(bridge);
    
    // ==================== PLATFORMS ====================
    const platMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x004422, roughness: 0.3 });
    const platMat2 = new THREE.MeshStandardMaterial({ color: 0x8866ff, emissive: 0x221144, roughness: 0.3 });
    
    const platforms = [
      // Room 1
      { x: -8, y: 2, z: -8, w: 5, d: 5 }, { x: 8, y: 2, z: -8, w: 5, d: 5 }, { x: 0, y: 2, z: 8, w: 5, d: 5 },
      { x: -10, y: 5, z: 0, w: 4, d: 4 }, { x: 10, y: 5, z: 0, w: 4, d: 4 }, { x: 0, y: 5, z: -10, w: 4, d: 4 },
      { x: -6, y: 8, z: -6, w: 4, d: 4 }, { x: 6, y: 8, z: -6, w: 4, d: 4 }, { x: 0, y: 8, z: 6, w: 5, d: 5 },
      { x: -8, y: 11, z: 2, w: 3, d: 3 }, { x: 8, y: 11, z: -2, w: 3, d: 3 }, { x: 0, y: 11, z: 0, w: 5, d: 5 },
      { x: -5, y: 14, z: -4, w: 3, d: 3 }, { x: 5, y: 14, z: 4, w: 3, d: 3 },
      { x: 0, y: 17, z: 0, w: 4, d: 4 }, { x: 0, y: 20, z: 0, w: 6, d: 6 },
      { x: 12, y: 22, z: 0, w: 4, d: 4 }, // Bridge entry
      // Room 2
      { x: r2x - 8, y: 2, z: -8, w: 5, d: 5 }, { x: r2x + 8, y: 2, z: -8, w: 5, d: 5 }, { x: r2x, y: 2, z: 8, w: 6, d: 6 },
      { x: r2x - 10, y: 6, z: 0, w: 4, d: 4 }, { x: r2x + 10, y: 6, z: 0, w: 4, d: 4 },
      { x: r2x - 6, y: 10, z: -6, w: 4, d: 4 }, { x: r2x + 6, y: 10, z: 6, w: 4, d: 4 }, { x: r2x, y: 10, z: 0, w: 5, d: 5 },
      { x: r2x - 4, y: 14, z: 4, w: 3, d: 3 }, { x: r2x + 4, y: 14, z: -4, w: 3, d: 3 },
      { x: r2x, y: 18, z: 0, w: 6, d: 6 },
      { x: r2x - 8, y: 22, z: 0, w: 4, d: 4 }, // Bridge exit
    ];
    
    platforms.forEach((p, i) => {
      const mat = i < 17 ? platMat.clone() : platMat2.clone();
      const plat = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.5, p.d), mat);
      plat.position.set(p.x, p.y, p.z);
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);
    });
    
    // ==================== CRYSTALS ====================
    const crystalColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff6600, 0x6666ff, 0xffff00];
    const crystalPositions = [
      // Room 1
      { x: -8, y: 3.5, z: -8 }, { x: 8, y: 3.5, z: -8 }, { x: 0, y: 3.5, z: 8 },
      { x: 0, y: 6.5, z: 0 }, { x: -6, y: 9.5, z: -6 }, { x: 0, y: 12.5, z: 0 },
      { x: 0, y: 18.5, z: 0 }, { x: 0, y: 21.5, z: 0 },
      // Room 2
      { x: r2x - 8, y: 3.5, z: -8 }, { x: r2x + 8, y: 3.5, z: -8 }, { x: r2x, y: 3.5, z: 8 },
      { x: r2x, y: 11.5, z: 0 }, { x: r2x, y: 19.5, z: 0 },
    ];
    
    targetsRef.current = [];
    crystalPositions.forEach((pos, i) => {
      const color = crystalColors[i % crystalColors.length];
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5, 1),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5, metalness: 0.8, roughness: 0.1 })
      );
      crystal.position.set(pos.x, pos.y, pos.z);
      crystal.userData.isTarget = true;
      crystal.userData.baseY = pos.y;
      scene.add(crystal);
      
      const light = new THREE.PointLight(color, 1, 5);
      light.position.copy(crystal.position);
      scene.add(light);
      
      targetsRef.current.push(crystal);
    });
    setTotalTargets(crystalPositions.length);
    
    // ==================== ENEMIES ====================
    enemiesRef.current = [];
    [{ x: -5, z: 0 }, { x: 5, z: -5 }, { x: 0, z: -10 }, { x: 10, z: 5 }, { x: r2x - 5, z: 0 }, { x: r2x + 5, z: -5 }].forEach(pos => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 0.8, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x440000, roughness: 0.5 })
      );
      body.position.y = 1;
      g.add(body);
      
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
      e1.position.set(-0.15, 1.3, 0.3);
      g.add(e1);
      const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
      e2.position.set(0.15, 1.3, 0.3);
      g.add(e2);
      
      g.position.set(pos.x, 0, pos.z);
      scene.add(g);
      enemiesRef.current.push({ mesh: g, health: 3, position: new THREE.Vector3(pos.x, 0, pos.z), state: 'idle', attackTimer: 0 });
    });
    
    // ==================== SWORD ====================
    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x00ff88, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 })
    );
    blade.position.y = 0.5;
    swordGroup.add(blade);
    
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x553311 })
    );
    handle.position.y = -0.12;
    swordGroup.add(handle);
    
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), blade.material);
    swordGroup.add(guard);
    
    swordGroup.position.set(0.45, -0.35, -0.55);
    swordGroup.rotation.set(0.15, -0.35, 0.12);
    camera.add(swordGroup);
    swordRef.current = swordGroup;
    
    // Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    
    // Initial render
    renderer.render(scene, camera);
    
    setGameState('instructions');
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container && rendererRef.current.domElement.parentNode) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // ==================== GAME LOOP ====================
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const loop = () => {
      if (gameState !== 'playing') return;
      
      const delta = Math.min(clockRef.current.getDelta(), 0.1);
      const elapsed = clockRef.current.getElapsedTime();
      const player = playerRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      
      if (!camera || !scene || !renderer) return;
      
      // Movement
      const speed = keysRef.current['ShiftLeft'] ? 14 : 7;
      const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      
      if (keysRef.current['KeyW']) player.velocity.add(forward.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyS']) player.velocity.sub(forward.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyA']) player.velocity.sub(right.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyD']) player.velocity.add(right.clone().multiplyScalar(speed * delta));
      
      if (keysRef.current['Space'] && player.onGround) {
        player.velocity.y = 10;
        player.onGround = false;
      }
      
      if (!player.onGround) player.velocity.y -= 25 * delta;
      
      player.position.add(player.velocity.clone().multiplyScalar(delta));
      player.velocity.x *= 0.88;
      player.velocity.z *= 0.88;
      
      // Floor
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
      
      // Bounds
      player.position.x = Math.max(-14, Math.min(49, player.position.x));
      player.position.z = Math.max(-14, Math.min(14, player.position.z));
      
      // Platform collision
      const r2x = 35;
      const plats = [
        { x: -8, y: 2.25, z: -8, w: 5, d: 5 }, { x: 8, y: 2.25, z: -8, w: 5, d: 5 }, { x: 0, y: 2.25, z: 8, w: 5, d: 5 },
        { x: -10, y: 5.25, z: 0, w: 4, d: 4 }, { x: 10, y: 5.25, z: 0, w: 4, d: 4 }, { x: 0, y: 5.25, z: -10, w: 4, d: 4 },
        { x: -6, y: 8.25, z: -6, w: 4, d: 4 }, { x: 6, y: 8.25, z: -6, w: 4, d: 4 }, { x: 0, y: 8.25, z: 6, w: 5, d: 5 },
        { x: -8, y: 11.25, z: 2, w: 3, d: 3 }, { x: 8, y: 11.25, z: -2, w: 3, d: 3 }, { x: 0, y: 11.25, z: 0, w: 5, d: 5 },
        { x: -5, y: 14.25, z: -4, w: 3, d: 3 }, { x: 5, y: 14.25, z: 4, w: 3, d: 3 },
        { x: 0, y: 17.25, z: 0, w: 4, d: 4 }, { x: 0, y: 20.25, z: 0, w: 6, d: 6 },
        { x: 12, y: 22.25, z: 0, w: 4, d: 4 }, { x: 20, y: 22.25, z: 0, w: 10, d: 6 }, // Bridge
        { x: r2x - 8, y: 2.25, z: -8, w: 5, d: 5 }, { x: r2x + 8, y: 2.25, z: -8, w: 5, d: 5 }, { x: r2x, y: 2.25, z: 8, w: 6, d: 6 },
        { x: r2x - 10, y: 6.25, z: 0, w: 4, d: 4 }, { x: r2x + 10, y: 6.25, z: 0, w: 4, d: 4 },
        { x: r2x - 6, y: 10.25, z: -6, w: 4, d: 4 }, { x: r2x + 6, y: 10.25, z: 6, w: 4, d: 4 }, { x: r2x, y: 10.25, z: 0, w: 5, d: 5 },
        { x: r2x - 4, y: 14.25, z: 4, w: 3, d: 3 }, { x: r2x + 4, y: 14.25, z: -4, w: 3, d: 3 },
        { x: r2x, y: 18.25, z: 0, w: 6, d: 6 }, { x: r2x - 8, y: 22.25, z: 0, w: 4, d: 4 },
      ];
      
      plats.forEach(p => {
        if (
          player.position.x > p.x - p.w/2 && player.position.x < p.x + p.w/2 &&
          player.position.z > p.z - p.d/2 && player.position.z < p.z + p.d/2 &&
          player.position.y > p.y && player.position.y < p.y + 2 &&
          player.velocity.y <= 0
        ) {
          player.position.y = p.y + 2;
          player.velocity.y = 0;
          player.onGround = true;
        }
      });
      
      // Room transition
      if (!transitionTriggeredRef.current && currentRoom === 1 && player.position.x > 25 && player.position.y > 20) {
        transitionTriggeredRef.current = true;
        setShowTransition(true);
        setTimeout(() => {
          setCurrentRoom(2);
          setTimeout(() => setShowTransition(false), 800);
        }, 1200);
      }
      
      // Camera
      camera.position.copy(player.position);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
      
      // Crystals
      targetsRef.current.forEach((t, i) => {
        if (t && t.visible) {
          t.rotation.y = elapsed * 2 + i * 0.5;
          t.rotation.x = Math.sin(elapsed * 1.5 + i) * 0.3;
          const baseY = t.userData?.baseY ?? t.position.y;
          t.position.y = baseY + Math.sin(elapsed * 2 + i * 0.7) * 0.25;
          
          if (player.position.distanceTo(t.position) < 1.5) {
            t.visible = false;
            setScore(s => s + 200);
            setTargetsCollected(c => c + 1);
            setMessage('Crystal! +200');
            setTimeout(() => setMessage(''), 1200);
          }
        }
      });
      
      // Sword animation
      if (swordRef.current) {
        swordRef.current.position.y = -0.35 + Math.sin(elapsed * 3) * 0.015;
        const blade = swordRef.current.children[0] as THREE.Mesh;
        if (blade?.material) {
          (blade.material as THREE.MeshStandardMaterial).emissive.setHex(portalMode === 'green' ? 0x00ff88 : 0x00ffff);
        }
      }
      
      // Enemies chase
      enemiesRef.current.forEach((enemy, i) => {
        if (!enemy.mesh.visible) return;
        const dist = player.position.distanceTo(enemy.position);
        if (dist < 20 && dist > 2) {
          const dir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
          enemy.position.add(dir.multiplyScalar(2 * delta));
          enemy.mesh.position.copy(enemy.position);
          enemy.mesh.lookAt(player.position.x, enemy.position.y, player.position.z);
        }
        if (dist < 1.5) {
          enemy.attackTimer += delta;
          if (enemy.attackTimer > 1) {
            enemy.attackTimer = 0;
            setPlayerHealth(h => Math.max(0, h - 1));
            setMessage('Ouch! -1 ❤️');
            setTimeout(() => setMessage(''), 1000);
          }
        }
      });
      
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(loop);
    };
    
    animationRef.current = requestAnimationFrame(loop);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [gameState, portalMode, currentRoom]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState('gameover');
          if (onGameEnd) onGameEnd(scoreRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, onGameEnd]);

  // Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyQ') setPortalMode('green');
      if (e.code === 'KeyE') setPortalMode('cyan');
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || gameState !== 'playing') return;
      playerRef.current.yaw -= e.movementX * 0.003;
      playerRef.current.pitch -= e.movementY * 0.003;
      playerRef.current.pitch = Math.max(-1.4, Math.min(1.4, playerRef.current.pitch));
    };
    const onMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      if (e.button === 0 && gameState === 'playing') shootPortal();
    };
    const onMouseUp = () => { isMouseDownRef.current = false; };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [gameState]);

  const shootPortal = () => {
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;
    
    if (swordRef.current) {
      swordRef.current.rotation.z += 0.6;
      setTimeout(() => { if (swordRef.current) swordRef.current.rotation.z -= 0.6; }, 180);
    }
    
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(scene.children, true);
    
    for (const hit of hits) {
      if (hit.object.userData.portalable && hit.face) {
        const old = portalsRef.current[portalMode];
        if (old?.mesh) scene.remove(old.mesh);
        
        const color = portalMode === 'green' ? 0x00ff88 : 0x00ffff;
        const portal = new THREE.Mesh(
          new THREE.TorusGeometry(1.1, 0.14, 16, 32),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 })
        );
        portal.position.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(0.1));
        
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(up, hit.face.normal).normalize();
        const adj = new THREE.Vector3().crossVectors(hit.face.normal, right).normalize();
        portal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, adj, hit.face.normal));
        
        const inner = new THREE.Mesh(
          new THREE.CircleGeometry(0.9, 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        portal.add(inner);
        scene.add(portal);
        
        portalsRef.current[portalMode] = { mesh: portal, position: hit.point.clone(), normal: hit.face.normal.clone() };
        setMessage(`${portalMode.toUpperCase()}!`);
        setTimeout(() => setMessage(''), 1000);
        
        if (portalsRef.current.green && portalsRef.current.cyan) {
          setScore(s => s + 50);
          setMessage('Linked! +50');
          setTimeout(() => setMessage(''), 1000);
        }
        break;
      }
    }
  };

  const startGame = () => {
    playerRef.current.position.set(0, 2, 5);
    playerRef.current.velocity.set(0, 0, 0);
    playerRef.current.yaw = 0;
    playerRef.current.pitch = 0;
    transitionTriggeredRef.current = false;
    setScore(0);
    setTimeLeft(90);
    setTargetsCollected(0);
    setPlayerHealth(3);
    setCurrentRoom(1);
    targetsRef.current.forEach(t => { if (t) t.visible = true; });
    enemiesRef.current.forEach(e => { e.mesh.visible = true; e.health = 3; });
    if (portalsRef.current.green?.mesh && sceneRef.current) sceneRef.current.remove(portalsRef.current.green.mesh);
    if (portalsRef.current.cyan?.mesh && sceneRef.current) sceneRef.current.remove(portalsRef.current.cyan.mesh);
    portalsRef.current = { green: null, cyan: null };
    setGameState('playing');
  };

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div ref={containerRef} className="absolute inset-0" />
      
      {gameState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 z-50">
          <div className="text-center">
            <div className="text-6xl animate-spin mb-4">🌀</div>
            <div className="text-white text-2xl font-bold">WORMHOLE</div>
            <div className="text-gray-400 mt-2">Loading...</div>
          </div>
        </div>
      )}
      
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800/95 rounded-2xl p-6 max-w-lg w-full text-white">
            <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">🌀 WORMHOLE</h1>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <h3 className="font-bold text-green-400 mb-2">⌨️ Controls</h3>
                <div><span className="text-green-300">WASD</span> Move</div>
                <div><span className="text-green-300">Space</span> Jump</div>
                <div><span className="text-green-300">Shift</span> Sprint</div>
                <div><span className="text-cyan-300">Q/E</span> Portal Mode</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <h3 className="font-bold text-yellow-400 mb-2">🎯 Goals</h3>
                <div>Collect crystals +200</div>
                <div>Link portals +50</div>
                <div>Reach Room 2!</div>
                <div>Survive 90 seconds</div>
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4 text-sm">
              <h3 className="font-bold text-purple-400 mb-1">🌀 Portals</h3>
              <p className="text-gray-300">Hold click to look, click to shoot portals on walls. Cross the bridge to Chamber 2!</p>
            </div>
            
            {isMobile && <p className="text-yellow-400 text-sm mb-4 text-center">⚠️ Best on desktop</p>}
            
            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-xl font-bold rounded-xl transition-all hover:scale-105">
              🚀 START
            </button>
          </div>
        </div>
      )}
      
      {showTransition && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <div className="text-6xl animate-spin mb-4">🌀</div>
            <h2 className="text-3xl font-bold text-white mb-2">Entering Chamber 2...</h2>
            <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}
      
      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 z-40 bg-black/70 rounded-lg px-4 py-2">
            <div className="text-white text-xl font-bold">Score: {score}</div>
            <div className="text-gray-300 text-sm">🎯 {targetsCollected}/{totalTargets}</div>
            <div className="text-gray-300 text-sm">💀 {enemiesKilled}</div>
            <div className={`text-sm font-bold ${currentRoom === 1 ? 'text-blue-400' : 'text-purple-400'}`}>🏠 Chamber {currentRoom}</div>
          </div>
          
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`text-2xl ${i < playerHealth ? '' : 'opacity-30'}`}>{i < playerHealth ? '❤️' : '🖤'}</span>
            ))}
          </div>
          
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-xl text-white ${timeLeft <= 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-800'}`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          <div className="absolute top-4 right-4 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-white ${portalMode === 'green' ? 'bg-green-600' : 'bg-cyan-600'}`}>
              {portalMode === 'green' ? '🟢 GREEN' : '🔵 CYAN'}
            </div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`w-6 h-6 border-2 rounded-full ${portalMode === 'green' ? 'border-green-400' : 'border-cyan-400'}`}>
              <div className={`absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${portalMode === 'green' ? 'bg-green-400' : 'bg-cyan-400'}`} />
            </div>
          </div>
          
          {message && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40">
              <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-lg font-bold animate-pulse">{message}</div>
            </div>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/50 text-gray-400 px-4 py-2 rounded-lg text-sm">
            Hold click to look • WASD • Space • Q🟢/E🔵
          </div>
          
          {isMobile && (
            <div className="absolute bottom-16 left-4 z-40 grid grid-cols-3 gap-1">
              <div />
              <button className="w-12 h-12 bg-white/20 rounded-lg text-white active:bg-white/40" onTouchStart={() => keysRef.current['KeyW'] = true} onTouchEnd={() => keysRef.current['KeyW'] = false}>↑</button>
              <div />
              <button className="w-12 h-12 bg-white/20 rounded-lg text-white active:bg-white/40" onTouchStart={() => keysRef.current['KeyA'] = true} onTouchEnd={() => keysRef.current['KeyA'] = false}>←</button>
              <button className="w-12 h-12 bg-green-600/50 rounded-lg text-white active:bg-green-600" onTouchStart={() => keysRef.current['Space'] = true} onTouchEnd={() => keysRef.current['Space'] = false}>⬆</button>
              <button className="w-12 h-12 bg-white/20 rounded-lg text-white active:bg-white/40" onTouchStart={() => keysRef.current['KeyD'] = true} onTouchEnd={() => keysRef.current['KeyD'] = false}>→</button>
              <div />
              <button className="w-12 h-12 bg-white/20 rounded-lg text-white active:bg-white/40" onTouchStart={() => keysRef.current['KeyS'] = true} onTouchEnd={() => keysRef.current['KeyS'] = false}>↓</button>
            </div>
          )}
        </>
      )}
      
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-800/95 rounded-2xl p-8 max-w-md text-center text-white">
            <h2 className="text-4xl font-bold mb-4">🎮 Game Over!</h2>
            <div className="text-6xl font-bold text-green-400 mb-4">{score}</div>
            <div className="text-gray-400 mb-6">Crystals: {targetsCollected}/{totalTargets}</div>
            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-xl font-bold rounded-xl hover:from-green-500 hover:to-cyan-500">
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
