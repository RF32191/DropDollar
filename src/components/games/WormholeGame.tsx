'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  // All refs at the top
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const initRef = useRef(false);
  
  // Player
  const playerRef = useRef({
    position: new THREE.Vector3(0, 2, 5),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: true,
  });
  
  // Controls
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const isMouseDownRef = useRef(false);
  
  // Sword
  const swordRef = useRef<THREE.Group | null>(null);
  const swordSlashRef = useRef(0);
  const swordActionRef = useRef<'idle' | 'slash' | 'parry' | 'strike'>('idle');
  const parryActiveRef = useRef(false);
  
  // Portals
  const portalsRef = useRef<{
    green: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
    cyan: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
  }>({ green: null, cyan: null });
  
  // Game state
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [portalMode, setPortalMode] = useState<'green' | 'cyan'>('green');
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Targets
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const [targetsCollected, setTargetsCollected] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  
  // Timer
  const [timeLeft, setTimeLeft] = useState(90);
  const gameStartTimeRef = useRef<number>(0);
  
  // Enemies
  const enemiesRef = useRef<any[]>([]);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(3);
  
  // Score ref
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);
  
  const lastTeleportRef = useRef(0);

  // Check for mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // ============================================
  // HELPER FUNCTIONS - defined before useEffect
  // ============================================
  
  const createSimpleSword = useCallback((camera: THREE.PerspectiveCamera) => {
    const swordGroup = new THREE.Group();
    
    // Simple sword blade
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.8, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      emissive: 0x00ff88,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.4;
    swordGroup.add(blade);
    
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x553311 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.1;
    swordGroup.add(handle);
    
    // Guard
    const guardGeo = new THREE.BoxGeometry(0.15, 0.03, 0.03);
    const guard = new THREE.Mesh(guardGeo, bladeMat);
    guard.position.y = 0;
    swordGroup.add(guard);
    
    // Position in view
    swordGroup.position.set(0.4, -0.3, -0.5);
    swordGroup.rotation.set(0.1, -0.3, 0.1);
    
    camera.add(swordGroup);
    swordRef.current = swordGroup;
  }, []);

  const createSimpleChamber = useCallback((scene: THREE.Scene) => {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Grid
    const grid = new THREE.GridHelper(40, 40, 0x4444ff, 0x222244);
    scene.add(grid);
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0x445566, 
      roughness: 0.5, 
      side: THREE.DoubleSide 
    });
    
    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
    backWall.position.set(0, 10, -20);
    backWall.userData.portalable = true;
    scene.add(backWall);
    
    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat.clone());
    frontWall.position.set(0, 10, 20);
    frontWall.rotation.y = Math.PI;
    frontWall.userData.portalable = true;
    scene.add(frontWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 40), wallMat.clone());
    leftWall.position.set(-20, 10, 0);
    leftWall.userData.portalable = true;
    scene.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 40), wallMat.clone());
    rightWall.position.set(20, 10, 0);
    rightWall.userData.portalable = true;
    scene.add(rightWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40), 
      new THREE.MeshStandardMaterial({ color: 0x222233 })
    );
    ceiling.position.set(0, 20, 0);
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);
    
    // Platforms
    const platformMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff88, 
      emissive: 0x004422,
      roughness: 0.3 
    });
    
    const platformPositions = [
      { x: -8, y: 2, z: -8, w: 5, d: 5 },
      { x: 8, y: 2, z: -8, w: 5, d: 5 },
      { x: 0, y: 4, z: 0, w: 6, d: 6 },
      { x: -10, y: 6, z: 5, w: 4, d: 4 },
      { x: 10, y: 6, z: 5, w: 4, d: 4 },
      { x: 0, y: 8, z: -5, w: 5, d: 5 },
      { x: -5, y: 10, z: 0, w: 4, d: 4 },
      { x: 5, y: 10, z: 0, w: 4, d: 4 },
      { x: 0, y: 12, z: 5, w: 6, d: 6 },
    ];
    
    platformPositions.forEach(p => {
      const plat = new THREE.Mesh(
        new THREE.BoxGeometry(p.w, 0.5, p.d),
        platformMat.clone()
      );
      plat.position.set(p.x, p.y, p.z);
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);
    });
    
    // Crystals (targets)
    const crystalColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff6600, 0x6666ff, 0xffff00];
    const crystalPositions = [
      { x: -8, y: 3.5, z: -8 },
      { x: 8, y: 3.5, z: -8 },
      { x: 0, y: 5.5, z: 0 },
      { x: -10, y: 7.5, z: 5 },
      { x: 10, y: 7.5, z: 5 },
      { x: 0, y: 9.5, z: -5 },
      { x: -5, y: 11.5, z: 0 },
      { x: 5, y: 11.5, z: 0 },
    ];
    
    targetsRef.current = [];
    crystalPositions.forEach((pos, i) => {
      const color = crystalColors[i % crystalColors.length];
      const crystalGeo = new THREE.OctahedronGeometry(0.5, 1);
      const crystalMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.5,
        metalness: 0.8,
        roughness: 0.1,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(pos.x, pos.y, pos.z);
      crystal.userData.isTarget = true;
      crystal.userData.baseY = pos.y;
      scene.add(crystal);
      
      // Glow
      const light = new THREE.PointLight(color, 1, 5);
      light.position.copy(crystal.position);
      scene.add(light);
      
      targetsRef.current.push(crystal);
    });
    
    setTotalTargets(crystalPositions.length);
    
    // Enemies
    enemiesRef.current = [];
    const enemyPositions = [
      { x: -5, z: 0 },
      { x: 5, z: -5 },
      { x: 0, z: -10 },
      { x: 10, z: 5 },
    ];
    
    enemyPositions.forEach(pos => {
      const enemyGroup = new THREE.Group();
      
      // Body
      const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        emissive: 0x440000,
        roughness: 0.5,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1;
      enemyGroup.add(body);
      
      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
      eye1.position.set(-0.15, 1.3, 0.3);
      enemyGroup.add(eye1);
      const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
      eye2.position.set(0.15, 1.3, 0.3);
      enemyGroup.add(eye2);
      
      enemyGroup.position.set(pos.x, 0, pos.z);
      scene.add(enemyGroup);
      
      enemiesRef.current.push({
        mesh: enemyGroup,
        health: 3,
        position: new THREE.Vector3(pos.x, 0, pos.z),
        velocity: new THREE.Vector3(),
        state: 'idle',
        attackCooldown: 0,
        hitCooldown: 0,
      });
    });
  }, []);

  // ============================================
  // INITIALIZATION - after function definitions
  // ============================================
  
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;
    
    console.log('🎮 Initializing Wormhole...');
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);
    sceneRef.current = scene;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;
    
    // Lighting
    const ambient = new THREE.AmbientLight(0x6666aa, 0.8);
    scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1.5);
    directional.position.set(10, 30, 10);
    directional.castShadow = true;
    scene.add(directional);
    
    const point1 = new THREE.PointLight(0x3399ff, 2, 40);
    point1.position.set(-5, 10, -5);
    scene.add(point1);
    
    const point2 = new THREE.PointLight(0x00ffff, 2, 40);
    point2.position.set(5, 10, 5);
    scene.add(point2);
    
    const point3 = new THREE.PointLight(0x00ff88, 1.5, 30);
    point3.position.set(0, 15, 0);
    scene.add(point3);
    
    // Create chamber and sword
    createSimpleChamber(scene);
    createSimpleSword(camera);
    
    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    
    setGameState('instructions');
    console.log('✅ Wormhole initialized');
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [createSimpleChamber, createSimpleSword]);

  // ============================================
  // GAME LOOP
  // ============================================
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const gameLoop = () => {
      if (gameState !== 'playing') return;
      
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();
      const player = playerRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      
      if (!camera || !scene || !renderer) return;
      
      // Movement
      const speed = keysRef.current['ShiftLeft'] ? 12 : 6;
      const forward = new THREE.Vector3(
        Math.sin(player.yaw),
        0,
        Math.cos(player.yaw)
      );
      const right = new THREE.Vector3(
        Math.cos(player.yaw),
        0,
        -Math.sin(player.yaw)
      );
      
      if (keysRef.current['KeyW']) player.velocity.add(forward.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyS']) player.velocity.sub(forward.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyA']) player.velocity.sub(right.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyD']) player.velocity.add(right.clone().multiplyScalar(speed * delta));
      
      // Jump
      if (keysRef.current['Space'] && player.onGround) {
        player.velocity.y = 8;
        player.onGround = false;
      }
      
      // Gravity
      if (!player.onGround) {
        player.velocity.y -= 20 * delta;
      }
      
      // Apply velocity
      player.position.add(player.velocity.clone().multiplyScalar(delta));
      
      // Friction
      player.velocity.x *= 0.9;
      player.velocity.z *= 0.9;
      
      // Floor collision
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
      
      // Wall bounds
      player.position.x = Math.max(-19, Math.min(19, player.position.x));
      player.position.z = Math.max(-19, Math.min(19, player.position.z));
      
      // Platform collisions
      const platforms = [
        { x: -8, y: 2.25, z: -8, w: 5, d: 5 },
        { x: 8, y: 2.25, z: -8, w: 5, d: 5 },
        { x: 0, y: 4.25, z: 0, w: 6, d: 6 },
        { x: -10, y: 6.25, z: 5, w: 4, d: 4 },
        { x: 10, y: 6.25, z: 5, w: 4, d: 4 },
        { x: 0, y: 8.25, z: -5, w: 5, d: 5 },
        { x: -5, y: 10.25, z: 0, w: 4, d: 4 },
        { x: 5, y: 10.25, z: 0, w: 4, d: 4 },
        { x: 0, y: 12.25, z: 5, w: 6, d: 6 },
      ];
      
      platforms.forEach(p => {
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
      
      // Update camera
      camera.position.copy(player.position);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
      
      // Animate crystals
      targetsRef.current.forEach((target, i) => {
        if (target && target.visible) {
          target.rotation.y = elapsed * 2 + i * 0.5;
          target.rotation.x = Math.sin(elapsed * 1.5 + i) * 0.3;
          const baseY = target.userData?.baseY ?? target.position.y;
          target.position.y = baseY + Math.sin(elapsed * 2 + i * 0.7) * 0.3;
          
          // Check collection
          const dist = player.position.distanceTo(target.position);
          if (dist < 1.5) {
            target.visible = false;
            setScore(prev => prev + 200);
            setTargetsCollected(prev => prev + 1);
            setMessage('Crystal collected! +200');
            setTimeout(() => setMessage(''), 1500);
          }
        }
      });
      
      // Animate sword
      if (swordRef.current) {
        const breathe = Math.sin(elapsed * 3) * 0.01;
        swordRef.current.position.y = -0.3 + breathe;
        
        // Update color based on portal mode
        const blade = swordRef.current.children[0] as THREE.Mesh;
        if (blade && blade.material) {
          (blade.material as THREE.MeshStandardMaterial).emissive.setHex(
            portalMode === 'green' ? 0x00ff88 : 0x00ffff
          );
        }
      }
      
      // Render
      renderer.render(scene, camera);
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, portalMode]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          if (onGameEnd) onGameEnd(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState, onGameEnd]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      if (e.code === 'KeyQ') setPortalMode('green');
      if (e.code === 'KeyE') setPortalMode('cyan');
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || gameState !== 'playing') return;
      
      playerRef.current.yaw -= e.movementX * 0.002;
      playerRef.current.pitch -= e.movementY * 0.002;
      playerRef.current.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, playerRef.current.pitch));
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      
      if (e.button === 0 && gameState === 'playing') {
        // Shoot portal
        shootPortal(portalMode);
      }
    };
    
    const handleMouseUp = () => {
      isMouseDownRef.current = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameState, portalMode]);

  // Shoot portal
  const shootPortal = (color: 'green' | 'cyan') => {
    if (!cameraRef.current || !sceneRef.current) return;
    
    // Animate sword
    if (swordRef.current) {
      swordRef.current.rotation.z += 0.5;
      setTimeout(() => {
        if (swordRef.current) swordRef.current.rotation.z -= 0.5;
      }, 200);
    }
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    
    for (const hit of intersects) {
      if (hit.object.userData.portalable && hit.face) {
        // Remove old portal
        const oldPortal = portalsRef.current[color];
        if (oldPortal?.mesh) {
          sceneRef.current.remove(oldPortal.mesh);
        }
        
        // Create new portal
        const portalColor = color === 'green' ? 0x00ff88 : 0x00ffff;
        const portalGeo = new THREE.TorusGeometry(1, 0.12, 16, 32);
        const portalMat = new THREE.MeshStandardMaterial({
          color: portalColor,
          emissive: portalColor,
          emissiveIntensity: 1,
        });
        const portalMesh = new THREE.Mesh(portalGeo, portalMat);
        
        portalMesh.position.copy(hit.point);
        portalMesh.position.add(hit.face.normal.clone().multiplyScalar(0.1));
        
        const up = new THREE.Vector3(0, 1, 0);
        const rightVec = new THREE.Vector3().crossVectors(up, hit.face.normal).normalize();
        const adjustedUp = new THREE.Vector3().crossVectors(hit.face.normal, rightVec).normalize();
        portalMesh.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(rightVec, adjustedUp, hit.face.normal)
        );
        
        // Inner glow
        const innerGeo = new THREE.CircleGeometry(0.8, 32);
        const innerMat = new THREE.MeshBasicMaterial({
          color: portalColor,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        portalMesh.add(inner);
        
        sceneRef.current.add(portalMesh);
        
        portalsRef.current[color] = {
          mesh: portalMesh,
          position: hit.point.clone(),
          normal: hit.face.normal.clone(),
        };
        
        setMessage(`${color.toUpperCase()} portal placed!`);
        setTimeout(() => setMessage(''), 1500);
        
        if (portalsRef.current.green && portalsRef.current.cyan) {
          setScore(prev => prev + 50);
          setMessage('Portals linked! +50');
          setTimeout(() => setMessage(''), 1500);
        }
        
        break;
      }
    }
  };

  // Start game
  const startGame = () => {
    playerRef.current.position.set(0, 2, 5);
    playerRef.current.velocity.set(0, 0, 0);
    playerRef.current.yaw = 0;
    playerRef.current.pitch = 0;
    setScore(0);
    setTimeLeft(90);
    setTargetsCollected(0);
    setPlayerHealth(3);
    setEnemiesKilled(0);
    
    targetsRef.current.forEach(t => { if (t) t.visible = true; });
    
    if (portalsRef.current.green?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.green.mesh);
    }
    if (portalsRef.current.cyan?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.cyan.mesh);
    }
    portalsRef.current = { green: null, cyan: null };
    
    setGameState('playing');
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="relative w-full h-full bg-gray-900">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Loading */}
      {gameState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="text-center">
            <div className="text-4xl animate-spin mb-4">🌀</div>
            <div className="text-white text-xl">Loading Wormhole...</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-800/95 rounded-2xl p-8 max-w-lg mx-4 text-white">
            <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              🌀 WORMHOLE
            </h1>
            
            <div className="space-y-3 text-gray-300 mb-6">
              <p><span className="text-green-400">WASD</span> - Move</p>
              <p><span className="text-green-400">Mouse</span> - Look (hold click)</p>
              <p><span className="text-green-400">Space</span> - Jump</p>
              <p><span className="text-green-400">Shift</span> - Sprint</p>
              <p><span className="text-cyan-400">Q</span> - Green Portal</p>
              <p><span className="text-cyan-400">E</span> - Cyan Portal</p>
              <p><span className="text-yellow-400">Click</span> - Shoot Portal</p>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-400">Collect crystals and link portals to score!</p>
            </div>
            
            {isMobile && (
              <p className="text-yellow-400 text-sm mb-4 text-center">
                ⚠️ Best played on desktop
              </p>
            )}
            
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105"
            >
              🚀 START
            </button>
          </div>
        </div>
      )}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Score */}
          <div className="absolute top-4 left-4 z-40 bg-black/70 rounded-lg px-4 py-2">
            <div className="text-white text-xl font-bold">Score: {score}</div>
            <div className="text-gray-300 text-sm">🎯 {targetsCollected}/{totalTargets}</div>
          </div>
          
          {/* Timer */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-xl text-white ${
              timeLeft <= 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-800'
            }`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          {/* Portal Mode */}
          <div className="absolute top-4 right-4 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-white ${
              portalMode === 'green' ? 'bg-green-600' : 'bg-cyan-600'
            }`}>
              {portalMode === 'green' ? '🟢 GREEN' : '🔵 CYAN'}
            </div>
          </div>
          
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`w-6 h-6 border-2 rounded-full ${
              portalMode === 'green' ? 'border-green-400' : 'border-cyan-400'
            }`}>
              <div className={`absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                portalMode === 'green' ? 'bg-green-400' : 'bg-cyan-400'
              }`} />
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
              <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-lg font-bold animate-pulse">
                {message}
              </div>
            </div>
          )}
          
          {/* Controls hint */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-black/50 text-gray-400 px-4 py-2 rounded-lg text-sm">
              Hold click to look • WASD move • Space jump • Q🟢/E🔵 switch
            </div>
          </div>
          
          {/* Mobile controls */}
          {isMobile && (
            <div className="absolute bottom-16 left-4 z-40">
              <div className="grid grid-cols-3 gap-1">
                <div />
                <button 
                  className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyW'] = true}
                  onTouchEnd={() => keysRef.current['KeyW'] = false}
                >↑</button>
                <div />
                <button 
                  className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyA'] = true}
                  onTouchEnd={() => keysRef.current['KeyA'] = false}
                >←</button>
                <button 
                  className="w-12 h-12 bg-green-600/50 rounded-lg text-white text-xl active:bg-green-600"
                  onTouchStart={() => keysRef.current['Space'] = true}
                  onTouchEnd={() => keysRef.current['Space'] = false}
                >⬆</button>
                <button 
                  className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyD'] = true}
                  onTouchEnd={() => keysRef.current['KeyD'] = false}
                >→</button>
                <div />
                <button 
                  className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyS'] = true}
                  onTouchEnd={() => keysRef.current['KeyS'] = false}
                >↓</button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-800/95 rounded-2xl p-8 max-w-md mx-4 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">🎮 Game Over!</h2>
            <div className="text-6xl font-bold text-green-400 mb-4">{score}</div>
            <div className="text-gray-400 mb-6">
              Crystals: {targetsCollected}/{totalTargets}
            </div>
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-xl font-bold rounded-xl hover:from-green-500 hover:to-cyan-500 transition-all"
            >
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
