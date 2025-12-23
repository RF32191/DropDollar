'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTime = useRef(0);
  
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(120);
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [portalMode, setPortalMode] = useState<'green' | 'red'>('green');

  const gameRef = useRef({
    player: { x: 0, y: 0, z: 0, angle: 0, pitch: 0, speed: 0 },
    portals: {
      green: null as { x: number; z: number; wall: 'N' | 'S' | 'E' | 'W' } | null,
      red: null as { x: number; z: number; wall: 'N' | 'S' | 'E' | 'W' } | null
    },
    keys: {} as Record<string, boolean>,
    mapSize: 20,
    lastTeleport: 0,
    projectiles: [] as { x: number; z: number; dx: number; dz: number; color: string }[],
    targets: [] as { x: number; z: number; collected: boolean }[],
  });

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const initLevel = useCallback((level: number) => {
    const g = gameRef.current;
    g.mapSize = 16 + level * 2;
    g.player = { x: 0, y: 0, z: -g.mapSize / 2 + 3, angle: 0, pitch: 0, speed: 0 };
    g.portals = { green: null, red: null };
    g.projectiles = [];
    g.targets = [];
    
    // Add collectible targets
    for (let i = 0; i < 3 + level; i++) {
      g.targets.push({
        x: (Math.random() - 0.5) * (g.mapSize - 4),
        z: (Math.random() - 0.5) * (g.mapSize - 4),
        collected: false
      });
    }
    showMessage(`LEVEL ${level}`);
  }, [showMessage]);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const g = gameRef.current;

    // Setup canvas
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    resize();
    window.addEventListener('resize', resize);

    initLevel(currentLevel);

    // Controls
    const onKeyDown = (e: KeyboardEvent) => {
      g.keys[e.code] = true;
      if (e.code === 'KeyQ') {
        setPortalMode(p => p === 'green' ? 'red' : 'green');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { g.keys[e.code] = false; };
    
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        g.player.angle += e.movementX * 0.003;
        g.player.pitch = Math.max(-0.8, Math.min(0.8, g.player.pitch + e.movementY * 0.003));
      }
    };

    const shootPortal = () => {
      const dx = Math.sin(g.player.angle);
      const dz = Math.cos(g.player.angle);
      g.projectiles.push({
        x: g.player.x,
        z: g.player.z,
        dx: dx * 0.8,
        dz: dz * 0.8,
        color: portalMode
      });
    };

    const onClick = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      } else {
        shootPortal();
      }
    };

    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        g.player.angle += (e.touches[0].clientX - touchStartX) * 0.01;
        g.player.pitch = Math.max(-0.8, Math.min(0.8, g.player.pitch + (e.touches[0].clientY - touchStartY) * 0.01));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchmove', onTouchMove);

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameState('gameover'); return 0; }
        return t - 1;
      });
    }, 1000);

    // Raycasting renderer
    const castRay = (angle: number, maxDist: number) => {
      const limit = g.mapSize / 2;
      let x = g.player.x, z = g.player.z;
      const dx = Math.sin(angle) * 0.1;
      const dz = Math.cos(angle) * 0.1;
      let dist = 0;
      let hitWall: 'N' | 'S' | 'E' | 'W' | null = null;
      
      while (dist < maxDist) {
        x += dx; z += dz; dist += 0.1;
        if (z >= limit) { hitWall = 'N'; break; }
        if (z <= -limit) { hitWall = 'S'; break; }
        if (x >= limit) { hitWall = 'E'; break; }
        if (x <= -limit) { hitWall = 'W'; break; }
      }
      return { dist, wall: hitWall, x, z };
    };

    // Game loop
    const gameLoop = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - lastFrameTime.current) / 1000, 0.05);
      lastFrameTime.current = timestamp;

      const w = canvas.width, h = canvas.height;
      const limit = g.mapSize / 2 - 0.3;

      // Player movement
      let moveX = 0, moveZ = 0;
      const moveSpeed = 8 * deltaTime;
      if (g.keys['KeyW']) { moveX += Math.sin(g.player.angle) * moveSpeed; moveZ += Math.cos(g.player.angle) * moveSpeed; }
      if (g.keys['KeyS']) { moveX -= Math.sin(g.player.angle) * moveSpeed; moveZ -= Math.cos(g.player.angle) * moveSpeed; }
      if (g.keys['KeyA']) { moveX -= Math.cos(g.player.angle) * moveSpeed; moveZ += Math.sin(g.player.angle) * moveSpeed; }
      if (g.keys['KeyD']) { moveX += Math.cos(g.player.angle) * moveSpeed; moveZ -= Math.sin(g.player.angle) * moveSpeed; }

      g.player.x = Math.max(-limit, Math.min(limit, g.player.x + moveX));
      g.player.z = Math.max(-limit, Math.min(limit, g.player.z + moveZ));

      // Portal teleportation
      const now = Date.now();
      if (g.portals.green && g.portals.red && now - g.lastTeleport > 500) {
        const checkTeleport = (from: typeof g.portals.green, to: typeof g.portals.green) => {
          if (!from || !to) return false;
          const dist = Math.hypot(g.player.x - from.x, g.player.z - from.z);
          if (dist < 1.5) {
            // Teleport to other portal
            g.player.x = to.x;
            g.player.z = to.z;
            // Push player away from wall
            if (to.wall === 'N') g.player.z -= 2;
            if (to.wall === 'S') g.player.z += 2;
            if (to.wall === 'E') g.player.x -= 2;
            if (to.wall === 'W') g.player.x += 2;
            g.lastTeleport = now;
            setScore(s => s + 50);
            showMessage('+50 TELEPORT!');
            return true;
          }
          return false;
        };
        if (!checkTeleport(g.portals.green, g.portals.red)) {
          checkTeleport(g.portals.red, g.portals.green);
        }
      }

      // Update projectiles
      g.projectiles = g.projectiles.filter(p => {
        p.x += p.dx;
        p.z += p.dz;
        const limit = g.mapSize / 2;
        
        // Hit wall - create portal
        if (p.z >= limit) {
          if (p.color === 'green') g.portals.green = { x: p.x, z: limit, wall: 'N' };
          else g.portals.red = { x: p.x, z: limit, wall: 'N' };
          showMessage(`${p.color.toUpperCase()} PORTAL`);
          if (g.portals.green && g.portals.red) showMessage('PORTALS LINKED!');
          return false;
        }
        if (p.z <= -limit) {
          if (p.color === 'green') g.portals.green = { x: p.x, z: -limit, wall: 'S' };
          else g.portals.red = { x: p.x, z: -limit, wall: 'S' };
          showMessage(`${p.color.toUpperCase()} PORTAL`);
          if (g.portals.green && g.portals.red) showMessage('PORTALS LINKED!');
          return false;
        }
        if (p.x >= limit) {
          if (p.color === 'green') g.portals.green = { x: limit, z: p.z, wall: 'E' };
          else g.portals.red = { x: limit, z: p.z, wall: 'E' };
          showMessage(`${p.color.toUpperCase()} PORTAL`);
          if (g.portals.green && g.portals.red) showMessage('PORTALS LINKED!');
          return false;
        }
        if (p.x <= -limit) {
          if (p.color === 'green') g.portals.green = { x: -limit, z: p.z, wall: 'W' };
          else g.portals.red = { x: -limit, z: p.z, wall: 'W' };
          showMessage(`${p.color.toUpperCase()} PORTAL`);
          if (g.portals.green && g.portals.red) showMessage('PORTALS LINKED!');
          return false;
        }
        return true;
      });

      // Collect targets
      g.targets.forEach(t => {
        if (!t.collected && Math.hypot(t.x - g.player.x, t.z - g.player.z) < 1.5) {
          t.collected = true;
          setScore(s => s + 100);
          showMessage('+100 TARGET!');
        }
      });

      // Check level complete
      if (g.targets.every(t => t.collected)) {
        setScore(s => s + 500);
        setCurrentLevel(l => l + 1);
        initLevel(currentLevel + 1);
        showMessage('+500 LEVEL COMPLETE!');
      }

      // === RENDER ===
      
      // Sky (top half)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h / 2);
      skyGrad.addColorStop(0, '#000011');
      skyGrad.addColorStop(1, '#001133');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h / 2);

      // Floor (bottom half)
      const floorGrad = ctx.createLinearGradient(0, h / 2, 0, h);
      floorGrad.addColorStop(0, '#111122');
      floorGrad.addColorStop(1, '#222244');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h / 2, w, h / 2);

      // Raycast walls
      const numRays = Math.min(w, 400);
      const fov = Math.PI / 3;
      
      for (let i = 0; i < numRays; i++) {
        const rayAngle = g.player.angle - fov / 2 + (i / numRays) * fov;
        const hit = castRay(rayAngle, 50);
        
        if (hit.wall) {
          // Fix fisheye
          const correctedDist = hit.dist * Math.cos(rayAngle - g.player.angle);
          const wallHeight = Math.min(h * 2, (h * 3) / (correctedDist + 0.1));
          const wallTop = (h - wallHeight) / 2 + g.player.pitch * 200;
          
          // Wall colors by direction
          let color: string;
          switch (hit.wall) {
            case 'N': color = `rgb(${Math.max(40, 180 - correctedDist * 8)}, ${Math.max(40, 180 - correctedDist * 8)}, ${Math.max(60, 220 - correctedDist * 8)})`; break;
            case 'S': color = `rgb(${Math.max(30, 140 - correctedDist * 6)}, ${Math.max(30, 140 - correctedDist * 6)}, ${Math.max(50, 180 - correctedDist * 6)})`; break;
            case 'E': color = `rgb(${Math.max(35, 160 - correctedDist * 7)}, ${Math.max(35, 160 - correctedDist * 7)}, ${Math.max(55, 200 - correctedDist * 7)})`; break;
            case 'W': color = `rgb(${Math.max(35, 160 - correctedDist * 7)}, ${Math.max(35, 160 - correctedDist * 7)}, ${Math.max(55, 200 - correctedDist * 7)})`; break;
          }
          
          ctx.fillStyle = color;
          const sliceWidth = Math.ceil(w / numRays) + 1;
          ctx.fillRect(i * (w / numRays), wallTop, sliceWidth, wallHeight);

          // Check if this ray hits a portal
          const checkPortalHit = (portal: typeof g.portals.green, portalColor: string) => {
            if (!portal || hit.wall !== portal.wall) return;
            const portalDist = portal.wall === 'N' || portal.wall === 'S' 
              ? Math.abs(hit.x - portal.x) 
              : Math.abs(hit.z - portal.z);
            if (portalDist < 1.5) {
              ctx.fillStyle = portalColor;
              ctx.fillRect(i * (w / numRays), wallTop + wallHeight * 0.1, sliceWidth, wallHeight * 0.8);
            }
          };
          checkPortalHit(g.portals.green, '#00ff4488');
          checkPortalHit(g.portals.red, '#ff224488');
        }
      }

      // Draw targets as 3D spheres
      g.targets.forEach(t => {
        if (t.collected) return;
        const dx = t.x - g.player.x;
        const dz = t.z - g.player.z;
        const dist = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);
        const relAngle = angle - g.player.angle;
        
        // Check if in view
        if (Math.abs(relAngle) < fov / 2 && dist < 30) {
          const screenX = w / 2 + Math.tan(relAngle) * w;
          const size = Math.min(200, 800 / dist);
          const screenY = h / 2 + g.player.pitch * 200;
          
          // Glowing orb
          const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, size);
          grad.addColorStop(0, '#ffff00');
          grad.addColorStop(0.5, '#ffaa00');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw projectiles
      g.projectiles.forEach(p => {
        const dx = p.x - g.player.x;
        const dz = p.z - g.player.z;
        const dist = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);
        const relAngle = angle - g.player.angle;
        
        if (Math.abs(relAngle) < fov / 2) {
          const screenX = w / 2 + Math.tan(relAngle) * w;
          const size = 300 / (dist + 1);
          
          ctx.fillStyle = p.color === 'green' ? '#00ff44' : '#ff2244';
          ctx.shadowColor = p.color === 'green' ? '#00ff44' : '#ff2244';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(screenX, h / 2, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw minimap
      const mapSize = 120;
      const mapX = w - mapSize - 20;
      const mapY = 20;
      const mapScale = mapSize / g.mapSize;
      
      ctx.fillStyle = '#00000088';
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
      ctx.strokeStyle = '#444466';
      ctx.lineWidth = 2;
      ctx.strokeRect(mapX, mapY, mapSize, mapSize);
      
      // Map walls
      ctx.strokeStyle = '#6666aa';
      ctx.strokeRect(mapX + 2, mapY + 2, mapSize - 4, mapSize - 4);
      
      // Player on map
      const playerMapX = mapX + mapSize / 2 + g.player.x * mapScale;
      const playerMapY = mapY + mapSize / 2 - g.player.z * mapScale;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(playerMapX, playerMapY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Player direction
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playerMapX, playerMapY);
      ctx.lineTo(playerMapX + Math.sin(g.player.angle) * 10, playerMapY - Math.cos(g.player.angle) * 10);
      ctx.stroke();
      
      // Portals on map
      if (g.portals.green) {
        ctx.fillStyle = '#00ff44';
        ctx.fillRect(mapX + mapSize / 2 + g.portals.green.x * mapScale - 3, mapY + mapSize / 2 - g.portals.green.z * mapScale - 3, 6, 6);
      }
      if (g.portals.red) {
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(mapX + mapSize / 2 + g.portals.red.x * mapScale - 3, mapY + mapSize / 2 - g.portals.red.z * mapScale - 3, 6, 6);
      }
      
      // Targets on map
      g.targets.forEach(t => {
        if (!t.collected) {
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(mapX + mapSize / 2 + t.x * mapScale, mapY + mapSize / 2 - t.z * mapScale, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Crosshair
      ctx.strokeStyle = portalMode === 'green' ? '#00ff44' : '#ff2244';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 20, h / 2);
      ctx.lineTo(w / 2 - 5, h / 2);
      ctx.moveTo(w / 2 + 5, h / 2);
      ctx.lineTo(w / 2 + 20, h / 2);
      ctx.moveTo(w / 2, h / 2 - 20);
      ctx.lineTo(w / 2, h / 2 - 5);
      ctx.moveTo(w / 2, h / 2 + 5);
      ctx.lineTo(w / 2, h / 2 + 20);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearInterval(timer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, [gameState, currentLevel, portalMode, initLevel, showMessage]);

  // Mobile controls
  const mobileMove = (dir: string) => {
    const g = gameRef.current;
    g.keys = { KeyW: dir === 'up', KeyS: dir === 'down', KeyA: dir === 'left', KeyD: dir === 'right' };
  };
  const mobileStop = () => { gameRef.current.keys = {}; };
  const mobileShoot = () => {
    const g = gameRef.current;
    const dx = Math.sin(g.player.angle);
    const dz = Math.cos(g.player.angle);
    g.projectiles.push({ x: g.player.x, z: g.player.z, dx: dx * 0.8, dz: dz * 0.8, color: portalMode });
  };

  if (gameState === 'instructions') {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
          <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent">
            WORMHOLE
          </h1>

          <div className="space-y-4 text-sm">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-green-400 font-bold mb-2">CONTROLS</h3>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <span>WASD</span><span>Move</span>
                <span>Mouse</span><span>Look</span>
                <span>Click</span><span>Shoot Portal</span>
                <span>Q</span><span>Switch Color</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-yellow-400 font-bold mb-2">OBJECTIVE</h3>
              <p className="text-gray-300">
                Collect yellow orbs. Use <span className="text-green-400">GREEN</span> and <span className="text-red-400">RED</span> portals to teleport!
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-cyan-400 font-bold mb-2">PORTALS</h3>
              <p className="text-gray-300">
                Shoot both colors on walls. Walk into one to exit from the other!
              </p>
            </div>
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full mt-6 py-4 bg-gradient-to-r from-green-600 to-red-600 hover:from-green-500 hover:to-red-500 text-white font-bold rounded-xl text-xl transition-all"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-6">GAME OVER</h1>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="text-4xl font-bold text-yellow-400">{score}</div>
            <div className="text-gray-400">Final Score</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="text-2xl font-bold text-cyan-400">Level {currentLevel}</div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => { setScore(0); setCurrentLevel(1); setTimeLeft(120); setGameState('playing'); }}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
            >
              RETRY
            </button>
            <button
              onClick={() => onGameEnd?.(score)}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      {/* HUD */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/70 rounded-lg px-4 py-2">
          <div className="text-cyan-400 font-bold">Level {currentLevel}</div>
          <div className="text-gray-400 text-sm">
            Targets: {gameRef.current.targets?.filter(t => t.collected).length || 0}/{gameRef.current.targets?.length || 0}
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center">
        <div className="bg-black/70 rounded-lg px-6 py-2">
          <div className="text-yellow-400 text-2xl font-bold">{score}</div>
        </div>
        <div className={`bg-black/70 rounded-lg px-4 py-1 mt-2 ${timeLeft < 30 ? 'animate-pulse' : ''}`}>
          <div className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-36 z-10">
        <button
          onClick={() => setPortalMode(p => p === 'green' ? 'red' : 'green')}
          className={`px-4 py-2 rounded-lg font-bold ${portalMode === 'green' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {portalMode.toUpperCase()} [Q]
        </button>
      </div>

      {message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 rounded-xl text-white text-xl font-bold z-20 animate-pulse">
          {message}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs z-10">
        {!isMobile && 'Click to lock mouse • Click to shoot portal • Q to switch'}
      </div>

      {/* Mobile Controls */}
      {isMobile && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 z-20">
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('up')} onTouchEnd={mobileStop}>▲</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('left')} onTouchEnd={mobileStop}>◀</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('right')} onTouchEnd={mobileStop}>▶</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('down')} onTouchEnd={mobileStop}>▼</button>
            <div />
          </div>
          <div className="absolute bottom-4 right-4 z-20">
            <button
              className={`w-20 h-20 rounded-full text-3xl ${portalMode === 'green' ? 'bg-green-500/70' : 'bg-red-500/70'}`}
              onTouchStart={mobileShoot}
            >
              🎯
            </button>
          </div>
        </>
      )}
    </div>
  );
}
