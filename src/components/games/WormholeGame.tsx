'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  
  // Player state
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
  const lastMouseRef = useRef({ x: 0, y: 0 });
  
  // Portals
  const portalsRef = useRef<{
    blue: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
    orange: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
  }>({ blue: null, orange: null });
  
  // Game state
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [portalMode, setPortalMode] = useState<'blue' | 'orange'>('blue');
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Targets/objectives
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const [targetsCollected, setTargetsCollected] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);

  // Check for mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || rendererRef.current) return;
    
    console.log('🎮 Initializing Wormhole...');
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 10, 100);
    sceneRef.current = scene;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;
    
    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;
    scene.add(directional);
    
    const point1 = new THREE.PointLight(0x3399ff, 1, 20);
    point1.position.set(-5, 5, -5);
    scene.add(point1);
    
    const point2 = new THREE.PointLight(0xff6600, 1, 20);
    point2.position.set(5, 5, 5);
    scene.add(point2);
    
    // Create test chamber
    createTestChamber(scene);
    
    // Handle resize
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);
  
  // Create test chamber
  const createTestChamber = (scene: THREE.Scene) => {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x333344,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Grid on floor
    const gridHelper = new THREE.GridHelper(30, 30, 0x4444ff, 0x222244);
    scene.add(gridHelper);
    
    // Walls (portalable surfaces)
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: 0x445566,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    
    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    backWall.position.set(0, 5, -15);
    backWall.userData.portalable = true;
    scene.add(backWall);
    
    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    frontWall.position.set(0, 5, 15);
    frontWall.rotation.y = Math.PI;
    frontWall.userData.portalable = true;
    scene.add(frontWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    leftWall.position.set(-15, 5, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.userData.portalable = true;
    scene.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), wallMat);
    rightWall.position.set(15, 5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.userData.portalable = true;
    scene.add(rightWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    ceiling.position.y = 10;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);
    
    // Add some platforms
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6 });
    
    const platform1 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5), platformMat);
    platform1.position.set(-8, 2, -8);
    platform1.castShadow = true;
    scene.add(platform1);
    
    const platform2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5), platformMat);
    platform2.position.set(8, 4, -8);
    platform2.castShadow = true;
    scene.add(platform2);
    
    // Add collectible targets
    const targetMat = new THREE.MeshStandardMaterial({ 
      color: 0xffff00, 
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    
    const targetPositions = [
      new THREE.Vector3(-8, 3.5, -8),
      new THREE.Vector3(8, 5.5, -8),
      new THREE.Vector3(0, 1, -10),
      new THREE.Vector3(5, 1, 5),
      new THREE.Vector3(-5, 1, 10),
    ];
    
    targetsRef.current = [];
    targetPositions.forEach((pos) => {
      const target = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), targetMat);
      target.position.copy(pos);
      target.userData.isTarget = true;
      scene.add(target);
      targetsRef.current.push(target);
    });
    
    setTotalTargets(targetPositions.length);
    setTargetsCollected(0);
  };
  
  // Shoot portal
  const shootPortal = (color: 'blue' | 'orange') => {
    if (!cameraRef.current || !sceneRef.current) return;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
    
    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    
    for (const hit of intersects) {
      if (hit.object.userData.portalable && hit.face) {
        // Remove old portal of this color
        const oldPortal = portalsRef.current[color];
        if (oldPortal?.mesh) {
          sceneRef.current.remove(oldPortal.mesh);
        }
        
        // Create new portal
        const portalColor = color === 'blue' ? 0x00aaff : 0xff6600;
        const portalGeo = new THREE.TorusGeometry(1.2, 0.15, 16, 32);
        const portalMat = new THREE.MeshStandardMaterial({
          color: portalColor,
          emissive: portalColor,
          emissiveIntensity: 1,
        });
        const portalMesh = new THREE.Mesh(portalGeo, portalMat);
        
        // Position portal on wall
        portalMesh.position.copy(hit.point);
        portalMesh.position.add(hit.face.normal.clone().multiplyScalar(0.1));
        
        // Orient portal to face outward from wall
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(up, hit.face.normal).normalize();
        const adjustedUp = new THREE.Vector3().crossVectors(hit.face.normal, right).normalize();
        portalMesh.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(right, adjustedUp, hit.face.normal)
        );
        
        // Add inner glow
        const innerGeo = new THREE.CircleGeometry(1, 32);
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
        
        // Check if both portals exist
        if (portalsRef.current.blue && portalsRef.current.orange) {
          setScore(prev => prev + 50);
          setMessage('Portals linked! +50');
          setTimeout(() => setMessage(''), 1500);
        }
        
        break;
      }
    }
  };
  
  // Check portal teleportation
  const checkPortalTeleport = () => {
    const player = playerRef.current;
    const blue = portalsRef.current.blue;
    const orange = portalsRef.current.orange;
    
    if (!blue || !orange) return;
    
    const distToBlue = player.position.distanceTo(blue.position);
    const distToOrange = player.position.distanceTo(orange.position);
    
    const teleportDist = 1.5;
    
    if (distToBlue < teleportDist) {
      // Teleport to orange
      player.position.copy(orange.position);
      player.position.add(orange.normal.clone().multiplyScalar(2));
      // Preserve momentum through portal
      const speed = player.velocity.length();
      player.velocity.copy(orange.normal.clone().multiplyScalar(speed));
      setScore(prev => prev + 100);
      setMessage('Teleported! +100');
      setTimeout(() => setMessage(''), 1500);
    } else if (distToOrange < teleportDist) {
      // Teleport to blue
      player.position.copy(blue.position);
      player.position.add(blue.normal.clone().multiplyScalar(2));
      const speed = player.velocity.length();
      player.velocity.copy(blue.normal.clone().multiplyScalar(speed));
      setScore(prev => prev + 100);
      setMessage('Teleported! +100');
      setTimeout(() => setMessage(''), 1500);
    }
  };
  
  // Check target collection
  const checkTargets = () => {
    const player = playerRef.current;
    
    targetsRef.current.forEach((target, index) => {
      if (!target.visible) return;
      
      const dist = player.position.distanceTo(target.position);
      if (dist < 1.5) {
        target.visible = false;
        setScore(prev => prev + 200);
        setTargetsCollected(prev => prev + 1);
        setMessage('Target collected! +200');
        setTimeout(() => setMessage(''), 1500);
      }
    });
  };
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let running = true;
    
    const gameLoop = () => {
      if (!running) return;
      
      const delta = Math.min(clockRef.current.getDelta(), 0.1);
      const player = playerRef.current;
      const keys = keysRef.current;
      
      // Movement
      const moveSpeed = 8 * delta;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      
      if (keys['KeyW'] || keys['ArrowUp']) {
        player.position.add(forward.clone().multiplyScalar(moveSpeed));
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        player.position.add(forward.clone().multiplyScalar(-moveSpeed));
      }
      if (keys['KeyA'] || keys['ArrowLeft']) {
        player.position.add(right.clone().multiplyScalar(-moveSpeed));
      }
      if (keys['KeyD'] || keys['ArrowRight']) {
        player.position.add(right.clone().multiplyScalar(moveSpeed));
      }
      
      // Gravity
      player.velocity.y -= 20 * delta;
      player.position.add(player.velocity.clone().multiplyScalar(delta));
      
      // Floor collision
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
      
      // Platform collisions (simple)
      const platforms = [
        { x: -8, y: 2.25, z: -8, w: 5, d: 5 },
        { x: 8, y: 4.25, z: -8, w: 5, d: 5 },
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
      
      // Jump
      if ((keys['Space'] || keys['KeySpace']) && player.onGround) {
        player.velocity.y = 8;
        player.onGround = false;
      }
      
      // Boundary
      player.position.x = Math.max(-14, Math.min(14, player.position.x));
      player.position.z = Math.max(-14, Math.min(14, player.position.z));
      
      // Check portals
      checkPortalTeleport();
      
      // Check targets
      checkTargets();
      
      // Animate portals
      const elapsed = clockRef.current.getElapsedTime();
      if (portalsRef.current.blue?.mesh) {
        portalsRef.current.blue.mesh.rotation.z = elapsed;
      }
      if (portalsRef.current.orange?.mesh) {
        portalsRef.current.orange.mesh.rotation.z = -elapsed;
      }
      
      // Animate targets
      targetsRef.current.forEach((target, i) => {
        if (target.visible) {
          target.position.y += Math.sin(elapsed * 3 + i) * 0.01;
          target.rotation.y = elapsed;
        }
      });
      
      // Update camera
      if (cameraRef.current) {
        cameraRef.current.position.copy(player.position);
        cameraRef.current.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      }
      
      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      // Check win condition
      if (targetsCollected >= totalTargets && totalTargets > 0) {
        setScore(prev => prev + 500);
        setMessage('Level Complete! +500');
        setGameState('gameover');
        if (onGameEnd) onGameEnd(score + 500);
        return;
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    clockRef.current.start();
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, targetsCollected, totalTargets, onGameEnd, score]);
  
  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      if (e.code === 'KeyQ') setPortalMode('blue');
      if (e.code === 'KeyE') setPortalMode('orange');
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      if (e.button === 0) {
        shootPortal(portalMode);
      } else if (e.button === 2) {
        isMouseDownRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isMouseDownRef.current = false;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;
      
      if (isMouseDownRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        
        playerRef.current.yaw -= dx * 0.003;
        playerRef.current.pitch -= dy * 0.003;
        playerRef.current.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, playerRef.current.pitch));
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    
    const handleContextMenu = (e: Event) => e.preventDefault();
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameState, portalMode]);
  
  // Start game
  const startGame = () => {
    console.log('🎮 Starting game...');
    playerRef.current.position.set(0, 2, 5);
    playerRef.current.velocity.set(0, 0, 0);
    playerRef.current.yaw = 0;
    playerRef.current.pitch = 0;
    setScore(0);
    setTargetsCollected(0);
    
    // Reset targets
    targetsRef.current.forEach(t => t.visible = true);
    
    // Clear portals
    if (portalsRef.current.blue?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.blue.mesh);
    }
    if (portalsRef.current.orange?.mesh && sceneRef.current) {
      sceneRef.current.remove(portalsRef.current.orange.mesh);
    }
    portalsRef.current = { blue: null, orange: null };
    
    setGameState('playing');
    console.log('✅ Game started');
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* 3D Canvas */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Loading */}
      {gameState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center">
            <div className="text-6xl mb-4">🌀</div>
            <div className="text-white text-2xl">Loading Wormhole...</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50 overflow-y-auto">
          <div className="max-w-lg mx-auto p-6 text-center">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400 mb-6">
              🌀 WORMHOLE
            </h1>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">🎮 Controls</h2>
              <div className="space-y-2 text-gray-300">
                <p>• <span className="text-blue-400">WASD</span> - Move</p>
                <p>• <span className="text-blue-400">Space</span> - Jump</p>
                <p>• <span className="text-orange-400">Right-click + drag</span> - Look around</p>
                <p>• <span className="text-blue-400">Left-click</span> - Shoot portal</p>
                <p>• <span className="text-blue-400">Q</span> - Blue portal mode</p>
                <p>• <span className="text-orange-400">E</span> - Orange portal mode</p>
              </div>
            </div>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">🎯 Objective</h2>
              <p className="text-gray-300">
                Collect all golden orbs using portals to reach high platforms!
                Walk through one portal to exit the other.
              </p>
            </div>
            
            <div className="bg-gray-900/80 rounded-xl p-6 mb-6 text-left">
              <h2 className="text-xl font-bold text-white mb-4">⭐ Scoring</h2>
              <div className="space-y-1 text-gray-300">
                <p>• Link portals: <span className="text-green-400">+50</span></p>
                <p>• Teleport: <span className="text-green-400">+100</span></p>
                <p>• Collect orb: <span className="text-green-400">+200</span></p>
                <p>• Complete level: <span className="text-green-400">+500</span></p>
              </div>
            </div>
            
            {isMobile && (
              <p className="text-yellow-400 text-sm mb-4">
                ⚠️ Best played on desktop with mouse & keyboard
              </p>
            )}
            
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-500 hover:to-orange-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105"
            >
              🚀 BEGIN TEST
            </button>
          </div>
        </div>
      )}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Score */}
          <div className="absolute top-4 left-4 z-40">
            <div className="bg-black/70 rounded-lg px-4 py-2">
              <div className="text-white text-xl font-bold">Score: {score}</div>
              <div className="text-gray-300 text-sm">
                Targets: {targetsCollected}/{totalTargets}
              </div>
            </div>
          </div>
          
          {/* Portal Mode */}
          <div className="absolute top-4 right-4 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold ${
              portalMode === 'blue' ? 'bg-blue-600' : 'bg-orange-600'
            }`}>
              {portalMode === 'blue' ? '🔵 BLUE' : '🟠 ORANGE'} PORTAL
            </div>
          </div>
          
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`w-8 h-8 border-2 rounded-full ${
              portalMode === 'blue' ? 'border-blue-400' : 'border-orange-400'
            }`}>
              <div className={`absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                portalMode === 'blue' ? 'bg-blue-400' : 'bg-orange-400'
              }`} />
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
              <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-xl font-bold animate-pulse">
                {message}
              </div>
            </div>
          )}
          
          {/* Controls hint */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-black/50 text-gray-400 px-4 py-2 rounded-lg text-sm">
              WASD move • Space jump • Right-click+drag look • Left-click shoot • Q/E switch portals
            </div>
          </div>
          
          {/* Mobile controls */}
          {isMobile && (
            <div className="absolute bottom-20 left-4 right-4 z-40 flex justify-between">
              {/* D-pad */}
              <div className="grid grid-cols-3 gap-1">
                <div />
                <button 
                  className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyW'] = true}
                  onTouchEnd={() => keysRef.current['KeyW'] = false}
                >↑</button>
                <div />
                <button 
                  className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyA'] = true}
                  onTouchEnd={() => keysRef.current['KeyA'] = false}
                >←</button>
                <button 
                  className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['Space'] = true}
                  onTouchEnd={() => keysRef.current['Space'] = false}
                >⬆</button>
                <button 
                  className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyD'] = true}
                  onTouchEnd={() => keysRef.current['KeyD'] = false}
                >→</button>
                <div />
                <button 
                  className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyS'] = true}
                  onTouchEnd={() => keysRef.current['KeyS'] = false}
                >↓</button>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2">
                <button 
                  className="w-16 h-16 bg-blue-600/50 rounded-full text-white text-2xl active:bg-blue-600"
                  onClick={() => { setPortalMode('blue'); shootPortal('blue'); }}
                >🔵</button>
                <button 
                  className="w-16 h-16 bg-orange-600/50 rounded-full text-white text-2xl active:bg-orange-600"
                  onClick={() => { setPortalMode('orange'); shootPortal('orange'); }}
                >🟠</button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
          <div className="text-center p-8 bg-gradient-to-br from-blue-900/80 to-orange-900/80 rounded-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">Test Complete!</h2>
            <p className="text-4xl font-bold text-green-400 mb-6">{score} points</p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-orange-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
