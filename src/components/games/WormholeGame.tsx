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
  const initRef = useRef(false);
  
  const playerRef = useRef({
    position: new THREE.Vector3(0, 2, 5),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: true,
  });
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const isMouseDownRef = useRef(false);
  const swordRef = useRef<THREE.Group | null>(null);
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const enemiesRef = useRef<any[]>([]);
  
  const portalsRef = useRef<{
    green: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
    cyan: { mesh: THREE.Mesh | null; position: THREE.Vector3; normal: THREE.Vector3 } | null;
  }>({ green: null, cyan: null });
  
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
  
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // ===== INITIALIZATION =====
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    
    // Wait for container to have proper dimensions
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    
    if (width < 100 || height < 100) {
      // Container not ready, retry
      const retryTimer = setTimeout(() => {
        initRef.current = false;
        setGameState('loading');
      }, 100);
      return () => clearTimeout(retryTimer);
    }
    
    initRef.current = true;
    console.log('🎮 Initializing Wormhole...', { width, height });
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 100);
    sceneRef.current = scene;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.copy(playerRef.current.position);
    cameraRef.current = camera;
    
    // Lighting
    scene.add(new THREE.AmbientLight(0x6666aa, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(10, 30, 10);
    scene.add(dir);
    scene.add(new THREE.PointLight(0x3399ff, 2, 40).translateX(-5).translateY(10).translateZ(-5));
    scene.add(new THREE.PointLight(0x00ffff, 2, 40).translateX(5).translateY(10).translateZ(5));
    scene.add(new THREE.PointLight(0x00ff88, 1.5, 30).translateY(15));
    
    // === CREATE CHAMBER ===
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(40, 40, 0x4444ff, 0x222244));
    
    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, side: THREE.DoubleSide });
    
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat);
    backWall.position.set(0, 10, -20);
    backWall.userData.portalable = true;
    scene.add(backWall);
    
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), wallMat.clone());
    frontWall.position.set(0, 10, 20);
    frontWall.rotation.y = Math.PI;
    frontWall.userData.portalable = true;
    scene.add(frontWall);
    
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 40), wallMat.clone());
    leftWall.position.set(-20, 10, 0);
    leftWall.userData.portalable = true;
    scene.add(leftWall);
    
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 40), wallMat.clone());
    rightWall.position.set(20, 10, 0);
    rightWall.userData.portalable = true;
    scene.add(rightWall);
    
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    ceiling.position.set(0, 20, 0);
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);
    
    // Platforms
    const platMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x004422, roughness: 0.3 });
    [
      { x: -8, y: 2, z: -8, w: 5, d: 5 },
      { x: 8, y: 2, z: -8, w: 5, d: 5 },
      { x: 0, y: 4, z: 0, w: 6, d: 6 },
      { x: -10, y: 6, z: 5, w: 4, d: 4 },
      { x: 10, y: 6, z: 5, w: 4, d: 4 },
      { x: 0, y: 8, z: -5, w: 5, d: 5 },
      { x: -5, y: 10, z: 0, w: 4, d: 4 },
      { x: 5, y: 10, z: 0, w: 4, d: 4 },
      { x: 0, y: 12, z: 5, w: 6, d: 6 },
    ].forEach(p => {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.5, p.d), platMat.clone());
      plat.position.set(p.x, p.y, p.z);
      scene.add(plat);
    });
    
    // Crystals
    const colors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff6600, 0x6666ff, 0xffff00];
    const crystalPositions = [
      { x: -8, y: 3.5, z: -8 }, { x: 8, y: 3.5, z: -8 }, { x: 0, y: 5.5, z: 0 },
      { x: -10, y: 7.5, z: 5 }, { x: 10, y: 7.5, z: 5 }, { x: 0, y: 9.5, z: -5 },
      { x: -5, y: 11.5, z: 0 }, { x: 5, y: 11.5, z: 0 },
    ];
    
    targetsRef.current = [];
    crystalPositions.forEach((pos, i) => {
      const color = colors[i % colors.length];
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
    
    // Enemies
    enemiesRef.current = [];
    [{ x: -5, z: 0 }, { x: 5, z: -5 }, { x: 0, z: -10 }, { x: 10, z: 5 }].forEach(pos => {
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
      enemiesRef.current.push({ mesh: g, health: 3, position: new THREE.Vector3(pos.x, 0, pos.z), state: 'idle' });
    });
    
    // === CREATE SWORD ===
    const swordGroup = new THREE.Group();
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.8, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x00ff88, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.1 })
    );
    blade.position.y = 0.4;
    swordGroup.add(blade);
    
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x553311 })
    );
    handle.position.y = -0.1;
    swordGroup.add(handle);
    
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), blade.material);
    swordGroup.add(guard);
    
    swordGroup.position.set(0.4, -0.3, -0.5);
    swordGroup.rotation.set(0.1, -0.3, 0.1);
    camera.add(swordGroup);
    swordRef.current = swordGroup;
    
    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    
    // Initial render loop to ensure display
    let frameCount = 0;
    const initialRender = () => {
      renderer.render(scene, camera);
      frameCount++;
      if (frameCount < 10) {
        requestAnimationFrame(initialRender);
      }
    };
    initialRender();
    
    setGameState('instructions');
    console.log('✅ Wormhole initialized', { width, height });
    
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
  }, []);

  // ===== GAME LOOP =====
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
      const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      
      if (keysRef.current['KeyW']) player.velocity.add(forward.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyS']) player.velocity.sub(forward.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyA']) player.velocity.sub(right.clone().multiplyScalar(speed * delta));
      if (keysRef.current['KeyD']) player.velocity.add(right.clone().multiplyScalar(speed * delta));
      
      if (keysRef.current['Space'] && player.onGround) {
        player.velocity.y = 8;
        player.onGround = false;
      }
      
      if (!player.onGround) player.velocity.y -= 20 * delta;
      
      player.position.add(player.velocity.clone().multiplyScalar(delta));
      player.velocity.x *= 0.9;
      player.velocity.z *= 0.9;
      
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
      
      player.position.x = Math.max(-19, Math.min(19, player.position.x));
      player.position.z = Math.max(-19, Math.min(19, player.position.z));
      
      // Platform collisions
      [
        { x: -8, y: 2.25, z: -8, w: 5, d: 5 }, { x: 8, y: 2.25, z: -8, w: 5, d: 5 },
        { x: 0, y: 4.25, z: 0, w: 6, d: 6 }, { x: -10, y: 6.25, z: 5, w: 4, d: 4 },
        { x: 10, y: 6.25, z: 5, w: 4, d: 4 }, { x: 0, y: 8.25, z: -5, w: 5, d: 5 },
        { x: -5, y: 10.25, z: 0, w: 4, d: 4 }, { x: 5, y: 10.25, z: 0, w: 4, d: 4 },
        { x: 0, y: 12.25, z: 5, w: 6, d: 6 },
      ].forEach(p => {
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
          
          if (player.position.distanceTo(target.position) < 1.5) {
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
        swordRef.current.position.y = -0.3 + Math.sin(elapsed * 3) * 0.01;
        const blade = swordRef.current.children[0] as THREE.Mesh;
        if (blade?.material) {
          (blade.material as THREE.MeshStandardMaterial).emissive.setHex(portalMode === 'green' ? 0x00ff88 : 0x00ffff);
        }
      }
      
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
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
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyQ') setPortalMode('green');
      if (e.code === 'KeyE') setPortalMode('cyan');
    };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || gameState !== 'playing') return;
      playerRef.current.yaw -= e.movementX * 0.002;
      playerRef.current.pitch -= e.movementY * 0.002;
      playerRef.current.pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, playerRef.current.pitch));
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
      swordRef.current.rotation.z += 0.5;
      setTimeout(() => { if (swordRef.current) swordRef.current.rotation.z -= 0.5; }, 200);
    }
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const hit of intersects) {
      if (hit.object.userData.portalable && hit.face) {
        const old = portalsRef.current[portalMode];
        if (old?.mesh) scene.remove(old.mesh);
        
        const color = portalMode === 'green' ? 0x00ff88 : 0x00ffff;
        const portal = new THREE.Mesh(
          new THREE.TorusGeometry(1, 0.12, 16, 32),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 })
        );
        portal.position.copy(hit.point).add(hit.face.normal.clone().multiplyScalar(0.1));
        
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(up, hit.face.normal).normalize();
        const adjUp = new THREE.Vector3().crossVectors(hit.face.normal, right).normalize();
        portal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, adjUp, hit.face.normal));
        
        const inner = new THREE.Mesh(
          new THREE.CircleGeometry(0.8, 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
        );
        portal.add(inner);
        scene.add(portal);
        
        portalsRef.current[portalMode] = { mesh: portal, position: hit.point.clone(), normal: hit.face.normal.clone() };
        setMessage(`${portalMode.toUpperCase()} portal!`);
        setTimeout(() => setMessage(''), 1500);
        
        if (portalsRef.current.green && portalsRef.current.cyan) {
          setScore(prev => prev + 50);
          setMessage('Linked! +50');
          setTimeout(() => setMessage(''), 1500);
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
    setScore(0);
    setTimeLeft(90);
    setTargetsCollected(0);
    setPlayerHealth(3);
    targetsRef.current.forEach(t => { if (t) t.visible = true; });
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
            <div className="text-white text-2xl font-bold mb-2">WORMHOLE</div>
            <div className="text-gray-400 text-lg">Initializing portal systems...</div>
            <div className="mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      )}
      
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
          <div className="bg-gray-800/95 rounded-2xl p-6 md:p-8 max-w-lg w-full text-white max-h-[90vh] overflow-y-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              🌀 WORMHOLE
            </h1>
            
            <div className="space-y-4 mb-6">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h2 className="text-lg font-bold text-green-400 mb-2">⌨️ Controls</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-green-300">WASD</span> - Move</div>
                  <div><span className="text-green-300">Space</span> - Jump</div>
                  <div><span className="text-green-300">Shift</span> - Sprint</div>
                  <div><span className="text-green-300">Mouse</span> - Look (hold)</div>
                  <div><span className="text-cyan-300">Q</span> - Green Portal</div>
                  <div><span className="text-cyan-300">E</span> - Cyan Portal</div>
                  <div><span className="text-yellow-300">Click</span> - Shoot Portal</div>
                </div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h2 className="text-lg font-bold text-yellow-400 mb-2">🎯 Objectives</h2>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• Collect glowing crystals (+200 pts)</li>
                  <li>• Link both portals (+50 pts)</li>
                  <li>• Use portals to reach high platforms</li>
                  <li>• Score as much as possible in 90 seconds!</li>
                </ul>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h2 className="text-lg font-bold text-purple-400 mb-2">🌀 Portal Tips</h2>
                <ul className="text-sm space-y-1 text-gray-300">
                  <li>• Shoot portals on walls (blue/gray surfaces)</li>
                  <li>• Walk through green portal → exit cyan</li>
                  <li>• Use momentum to reach high areas!</li>
                </ul>
              </div>
            </div>
            
            {isMobile && (
              <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
                <p className="text-yellow-400 text-sm text-center">
                  ⚠️ Best played on desktop with mouse & keyboard
                </p>
              </div>
            )}
            
            <button
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-green-500/25"
            >
              🚀 START GAME
            </button>
          </div>
        </div>
      )}
      
      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-4 z-40 bg-black/70 rounded-lg px-4 py-2">
            <div className="text-white text-xl font-bold">Score: {score}</div>
            <div className="text-gray-300 text-sm">🎯 {targetsCollected}/{totalTargets}</div>
          </div>
          
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
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
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
              <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-lg font-bold animate-pulse">{message}</div>
            </div>
          )}
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40">
            <div className="bg-black/50 text-gray-400 px-4 py-2 rounded-lg text-sm">
              Hold click to look • WASD move • Space jump • Q🟢/E🔵 switch
            </div>
          </div>
          
          {isMobile && (
            <div className="absolute bottom-16 left-4 z-40">
              <div className="grid grid-cols-3 gap-1">
                <div />
                <button className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyW'] = true} onTouchEnd={() => keysRef.current['KeyW'] = false}>↑</button>
                <div />
                <button className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyA'] = true} onTouchEnd={() => keysRef.current['KeyA'] = false}>←</button>
                <button className="w-12 h-12 bg-green-600/50 rounded-lg text-white text-xl active:bg-green-600"
                  onTouchStart={() => keysRef.current['Space'] = true} onTouchEnd={() => keysRef.current['Space'] = false}>⬆</button>
                <button className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyD'] = true} onTouchEnd={() => keysRef.current['KeyD'] = false}>→</button>
                <div />
                <button className="w-12 h-12 bg-white/20 rounded-lg text-white text-xl active:bg-white/40"
                  onTouchStart={() => keysRef.current['KeyS'] = true} onTouchEnd={() => keysRef.current['KeyS'] = false}>↓</button>
              </div>
            </div>
          )}
        </>
      )}
      
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-800/95 rounded-2xl p-8 max-w-md mx-4 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">🎮 Game Over!</h2>
            <div className="text-6xl font-bold text-green-400 mb-4">{score}</div>
            <div className="text-gray-400 mb-6">Crystals: {targetsCollected}/{totalTargets}</div>
            <button onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-xl font-bold rounded-xl hover:from-green-500 hover:to-cyan-500 transition-all">
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
