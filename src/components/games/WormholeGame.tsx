'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [portalMode, setPortalMode] = useState<'orange' | 'blue'>('orange');
  const [timeLeft, setTimeLeft] = useState(120);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [level, setLevel] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [message, setMessage] = useState('');

  // Game state
  const gameRef = useRef({
    player: { x: 0, y: 1.7, z: 8, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true },
    portals: { orange: null as { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null, blue: null as { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null },
    enemies: [] as { x: number; y: number; z: number; health: number; type: string; vx: number; vz: number }[],
    bullets: [] as { x: number; y: number; z: number; dx: number; dy: number; dz: number; isPortal: boolean; color: string }[],
    keys: {} as { [key: string]: boolean },
    mouseDown: false,
    lastShot: 0,
  });

  // Detect mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Show message
  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  // Initialize game
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const game = gameRef.current;

    // Spawn enemies
    const spawnEnemies = () => {
      game.enemies = [];
      const count = 3 + level * 2;
      for (let i = 0; i < count; i++) {
        game.enemies.push({
          x: (Math.random() - 0.5) * 16,
          y: Math.random() > 0.5 ? 1.5 + Math.random() * 3 : 0.5,
          z: (Math.random() - 0.5) * 16 - 5,
          health: 30,
          type: Math.random() > 0.5 ? 'drone' : 'turret',
          vx: 0,
          vz: 0
        });
      }
    };
    spawnEnemies();

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      game.keys[e.code] = true;
      if (e.code === 'KeyQ') {
        setPortalMode(prev => {
          const newMode = prev === 'orange' ? 'blue' : 'orange';
          showMessage(`${newMode.toUpperCase()} PORTAL MODE`);
          return newMode;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        game.player.yaw -= e.movementX * 0.002;
        game.player.pitch = Math.max(-1.4, Math.min(1.4, game.player.pitch - e.movementY * 0.002));
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }
      
      const now = Date.now();
      if (now - game.lastShot < 150) return;
      game.lastShot = now;

      // Calculate direction
      const dx = -Math.sin(game.player.yaw) * Math.cos(game.player.pitch);
      const dy = Math.sin(game.player.pitch);
      const dz = -Math.cos(game.player.yaw) * Math.cos(game.player.pitch);

      if (e.button === 0) {
        // Left click - regular bullet
        if (ammo > 0) {
          game.bullets.push({
            x: game.player.x,
            y: game.player.y,
            z: game.player.z,
            dx: dx * 50,
            dy: dy * 50,
            dz: dz * 50,
            isPortal: false,
            color: 'yellow'
          });
          setAmmo(prev => prev - 1);
        }
      } else if (e.button === 2) {
        // Right click - portal shot
        game.bullets.push({
          x: game.player.x,
          y: game.player.y,
          z: game.player.z,
          dx: dx * 40,
          dy: dy * 40,
          dz: dz * 40,
          isPortal: true,
          color: portalMode === 'orange' ? '#ff6600' : '#00aaff'
        });
      }
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    // Touch handling
    let touchStartX = 0, touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        game.player.yaw -= dx * 0.005;
        game.player.pitch = Math.max(-1.4, Math.min(1.4, game.player.pitch - dy * 0.005));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);

    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3D Projection helper
    const project = (x: number, y: number, z: number) => {
      // Translate relative to player
      let rx = x - game.player.x;
      let ry = y - game.player.y;
      let rz = z - game.player.z;

      // Rotate by yaw (Y axis)
      const cosY = Math.cos(game.player.yaw);
      const sinY = Math.sin(game.player.yaw);
      const tx = rx * cosY - rz * sinY;
      const tz = rx * sinY + rz * cosY;
      rx = tx;
      rz = tz;

      // Rotate by pitch (X axis)
      const cosP = Math.cos(game.player.pitch);
      const sinP = Math.sin(game.player.pitch);
      const ty = ry * cosP - rz * sinP;
      rz = ry * sinP + rz * cosP;
      ry = ty;

      // Behind camera check
      if (rz >= -0.1) return null;

      // Project to screen
      const fov = 500;
      const scale = fov / -rz;
      const sx = canvas.width / 2 + rx * scale;
      const sy = canvas.height / 2 - ry * scale;

      return { x: sx, y: sy, scale, z: rz };
    };

    // Draw wall
    const drawWall = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: string) => {
      const p1 = project(x1, y1, z1);
      const p2 = project(x2, y1, z2);
      const p3 = project(x2, y2, z2);
      const p4 = project(x1, y2, z1);

      if (!p1 || !p2 || !p3 || !p4) return;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
    };

    // Draw floor with grid
    const drawFloor = () => {
      const gridSize = 2;
      for (let x = -10; x < 10; x += gridSize) {
        for (let z = -15; z < 15; z += gridSize) {
          const shade = ((x + z) / gridSize) % 2 === 0 ? '#1a1a2e' : '#16213e';
          drawWall(x, 0, z, x + gridSize, 0, z + gridSize, shade);
        }
      }
    };

    // Draw enemy
    const drawEnemy = (enemy: typeof game.enemies[0]) => {
      const p = project(enemy.x, enemy.y, enemy.z);
      if (!p || p.z > -1) return;

      const size = 30 * p.scale;
      
      // Body
      ctx.fillStyle = enemy.type === 'drone' ? '#ff4444' : '#666666';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(p.x, p.y - size * 0.2, size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      ctx.fillStyle = '#333';
      ctx.fillRect(p.x - size, p.y - size * 1.5, size * 2, 4);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(p.x - size, p.y - size * 1.5, size * 2 * (enemy.health / 30), 4);
    };

    // Draw portal
    const drawPortal = (portal: { x: number; y: number; z: number }, color: string) => {
      const p = project(portal.x, portal.y, portal.z);
      if (!p || p.z > -1) return;

      const size = 60 * p.scale;
      
      // Outer ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 8 * p.scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 0.8);
      gradient.addColorStop(0, color + '80');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Swirl effect
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const angle = Date.now() * 0.002 + i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * (0.3 + i * 0.2), angle, angle + Math.PI);
        ctx.stroke();
      }
    };

    // Draw bullet
    const drawBullet = (bullet: typeof game.bullets[0]) => {
      const p = project(bullet.x, bullet.y, bullet.z);
      if (!p || p.z > -1) return;

      const size = bullet.isPortal ? 12 : 6;
      ctx.fillStyle = bullet.color;
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * p.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Draw HUD gun
    const drawGun = () => {
      const gx = canvas.width - 150;
      const gy = canvas.height - 80;
      
      // Gun body
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(gx, gy, 120, 40);
      ctx.fillRect(gx + 30, gy + 40, 30, 30);

      // Barrel
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(gx + 100, gy + 10, 40, 20);

      // Energy ring
      ctx.strokeStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(gx + 130, gy + 20, 15, 0, Math.PI * 2);
      ctx.stroke();

      // Glow
      ctx.shadowColor = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(gx + 130, gy + 20, 8, 0, Math.PI * 2);
      ctx.fillStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Draw crosshair
    const drawCrosshair = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      // Cross
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx - 5, cy);
      ctx.moveTo(cx + 5, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy - 5);
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    // Main game loop
    const gameLoop = () => {
      const dt = 1/60;

      // Clear
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Player movement
      const moveSpeed = 5;
      let mx = 0, mz = 0;

      if (game.keys['KeyW']) mz -= 1;
      if (game.keys['KeyS']) mz += 1;
      if (game.keys['KeyA']) mx -= 1;
      if (game.keys['KeyD']) mx += 1;

      if (mx !== 0 || mz !== 0) {
        const len = Math.sqrt(mx * mx + mz * mz);
        mx /= len;
        mz /= len;

        // Rotate movement by yaw
        const cos = Math.cos(game.player.yaw);
        const sin = Math.sin(game.player.yaw);
        game.player.vx = (mx * cos - mz * sin) * moveSpeed;
        game.player.vz = (mx * sin + mz * cos) * moveSpeed;
      } else {
        game.player.vx *= 0.8;
        game.player.vz *= 0.8;
      }

      // Jump
      if (game.keys['Space'] && game.player.onGround) {
        game.player.vy = 8;
        game.player.onGround = false;
      }

      // Gravity
      game.player.vy -= 20 * dt;

      // Update position
      game.player.x += game.player.vx * dt;
      game.player.y += game.player.vy * dt;
      game.player.z += game.player.vz * dt;

      // Ground collision
      if (game.player.y < 1.7) {
        game.player.y = 1.7;
        game.player.vy = 0;
        game.player.onGround = true;
      }

      // Boundaries
      game.player.x = Math.max(-9, Math.min(9, game.player.x));
      game.player.z = Math.max(-14, Math.min(14, game.player.z));

      // Portal teleportation
      if (game.portals.orange && game.portals.blue) {
        const checkPortal = (from: typeof game.portals.orange, to: typeof game.portals.blue) => {
          if (!from || !to) return;
          const dx = game.player.x - from.x;
          const dy = game.player.y - from.y;
          const dz = game.player.z - from.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          if (dist < 1) {
            game.player.x = to.x + to.nx * 2;
            game.player.y = to.y + to.ny * 2;
            game.player.z = to.z + to.nz * 2;
            setScore(prev => prev + 50);
            showMessage('+50 TELEPORT!');
          }
        };
        checkPortal(game.portals.orange, game.portals.blue);
        checkPortal(game.portals.blue, game.portals.orange);
      }

      // Update bullets
      game.bullets = game.bullets.filter(b => {
        b.x += b.dx * dt;
        b.y += b.dy * dt;
        b.z += b.dz * dt;

        // Wall collision for portals
        if (b.isPortal) {
          // Back wall
          if (b.z < -14) {
            const portal = { x: b.x, y: Math.max(1, b.y), z: -14, nx: 0, ny: 0, nz: 1 };
            if (b.color === '#ff6600') {
              game.portals.orange = portal;
              showMessage('ORANGE PORTAL PLACED!');
            } else {
              game.portals.blue = portal;
              showMessage('BLUE PORTAL PLACED!');
            }
            if (game.portals.orange && game.portals.blue) {
              showMessage('PORTALS LINKED!');
            }
            return false;
          }
          // Side walls
          if (b.x < -9) {
            const portal = { x: -9, y: Math.max(1, b.y), z: b.z, nx: 1, ny: 0, nz: 0 };
            if (b.color === '#ff6600') game.portals.orange = portal;
            else game.portals.blue = portal;
            showMessage(b.color === '#ff6600' ? 'ORANGE PORTAL!' : 'BLUE PORTAL!');
            return false;
          }
          if (b.x > 9) {
            const portal = { x: 9, y: Math.max(1, b.y), z: b.z, nx: -1, ny: 0, nz: 0 };
            if (b.color === '#ff6600') game.portals.orange = portal;
            else game.portals.blue = portal;
            showMessage(b.color === '#ff6600' ? 'ORANGE PORTAL!' : 'BLUE PORTAL!');
            return false;
          }
        }

        // Enemy collision (for regular bullets)
        if (!b.isPortal) {
          for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            const dx = b.x - e.x;
            const dy = b.y - e.y;
            const dz = b.z - e.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            if (dist < 0.8) {
              e.health -= 15;
              if (e.health <= 0) {
                game.enemies.splice(i, 1);
                const points = e.type === 'drone' ? 100 : 150;
                setScore(prev => prev + points);
                setEnemiesKilled(prev => prev + 1);
                setAmmo(prev => Math.min(prev + 5, 50));
                showMessage(`+${points} ENEMY DESTROYED!`);

                // Check level complete
                if (game.enemies.length === 0) {
                  setScore(prev => prev + 500);
                  setLevel(prev => prev + 1);
                  showMessage('+500 LEVEL COMPLETE!');
                  setTimeout(spawnEnemies, 1000);
                }
              }
              return false;
            }
          }
        }

        // Out of bounds
        return Math.abs(b.x) < 20 && Math.abs(b.z) < 20 && b.y > 0 && b.y < 15;
      });

      // Update enemies
      game.enemies.forEach(e => {
        if (e.type === 'drone') {
          // Chase player
          const dx = game.player.x - e.x;
          const dz = game.player.z - e.z;
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist > 0.1) {
            e.vx = (dx / dist) * 2;
            e.vz = (dz / dist) * 2;
          }
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          e.y = 2 + Math.sin(Date.now() * 0.003) * 0.5;
        }

        // Damage player on contact
        const dx = game.player.x - e.x;
        const dy = game.player.y - e.y;
        const dz = game.player.z - e.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 1) {
          setHealth(prev => {
            const newHealth = prev - 1;
            if (newHealth <= 0) setGameState('gameover');
            return Math.max(0, newHealth);
          });
        }
      });

      // Draw scene
      drawFloor();

      // Draw walls
      ctx.fillStyle = '#2a2a4a';
      drawWall(-10, 0, -15, 10, 8, -15, '#2a2a4a'); // Back
      drawWall(-10, 0, -15, -10, 8, 15, '#252540'); // Left
      drawWall(10, 0, -15, 10, 8, 15, '#252540'); // Right

      // Draw portals
      if (game.portals.orange) drawPortal(game.portals.orange, '#ff6600');
      if (game.portals.blue) drawPortal(game.portals.blue, '#00aaff');

      // Draw enemies
      game.enemies.forEach(drawEnemy);

      // Draw bullets
      game.bullets.forEach(drawBullet);

      // Draw gun and crosshair
      drawGun();
      drawCrosshair();

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearInterval(timerInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState, portalMode, ammo, level, showMessage]);

  // Mobile controls
  const mobileShoot = () => {
    if (ammo <= 0) return;
    const game = gameRef.current;
    const dx = -Math.sin(game.player.yaw) * Math.cos(game.player.pitch);
    const dy = Math.sin(game.player.pitch);
    const dz = -Math.cos(game.player.yaw) * Math.cos(game.player.pitch);
    game.bullets.push({ x: game.player.x, y: game.player.y, z: game.player.z, dx: dx * 50, dy: dy * 50, dz: dz * 50, isPortal: false, color: 'yellow' });
    setAmmo(prev => prev - 1);
  };

  const mobilePortal = () => {
    const game = gameRef.current;
    const dx = -Math.sin(game.player.yaw) * Math.cos(game.player.pitch);
    const dy = Math.sin(game.player.pitch);
    const dz = -Math.cos(game.player.yaw) * Math.cos(game.player.pitch);
    game.bullets.push({ x: game.player.x, y: game.player.y, z: game.player.z, dx: dx * 40, dy: dy * 40, dz: dz * 40, isPortal: true, color: portalMode === 'orange' ? '#ff6600' : '#00aaff' });
  };

  const mobileMove = (dir: string) => {
    const game = gameRef.current;
    game.keys['KeyW'] = dir === 'up';
    game.keys['KeyS'] = dir === 'down';
    game.keys['KeyA'] = dir === 'left';
    game.keys['KeyD'] = dir === 'right';
  };

  const mobileStop = () => {
    const game = gameRef.current;
    game.keys = {};
  };

  const mobileJump = () => {
    const game = gameRef.current;
    if (game.player.onGround) {
      game.player.vy = 8;
      game.player.onGround = false;
    }
  };

  // Instructions
  if (gameState === 'instructions') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center overflow-hidden">
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-4"
              style={{
                width: `${150 + i * 100}px`,
                height: `${150 + i * 100}px`,
                borderColor: i % 2 === 0 ? '#ff6600' : '#00aaff',
                animation: `spin ${4 + i}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`,
                opacity: 0.4
              }}
            />
          ))}
        </div>

        <div className="relative z-10 bg-black/90 rounded-2xl p-8 max-w-lg mx-4 border border-orange-500/50">
          <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
            WORMHOLE
          </h1>
          <p className="text-gray-400 text-center mb-6">Portal Gun Adventure</p>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-orange-400 font-bold mb-2">🎮 Controls</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div><span className="text-blue-400">WASD</span> - Move</div>
                <div><span className="text-blue-400">Mouse</span> - Look</div>
                <div><span className="text-blue-400">Left Click</span> - Shoot</div>
                <div><span className="text-blue-400">Right Click</span> - Portal</div>
                <div><span className="text-blue-400">Space</span> - Jump</div>
                <div><span className="text-blue-400">Q</span> - Switch Portal</div>
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-blue-400 font-bold mb-2">🌀 Portal System</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• <span className="text-orange-400">Orange</span> + <span className="text-blue-400">Blue</span> portals link together</li>
                <li>• Walk into one to teleport to the other</li>
                <li>• Press Q to switch portal color</li>
              </ul>
            </div>

            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-green-400 font-bold mb-2">📊 Scoring</h3>
              <div className="text-sm text-gray-300 grid grid-cols-2 gap-1">
                <div>Drone: <span className="text-green-400">+100</span></div>
                <div>Turret: <span className="text-green-400">+150</span></div>
                <div>Teleport: <span className="text-cyan-400">+50</span></div>
                <div>Level: <span className="text-yellow-400">+500</span></div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 text-white font-bold rounded-xl text-xl transition-all transform hover:scale-105"
          >
            ENTER THE WORMHOLE
          </button>
        </div>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Game Over
  if (gameState === 'gameover') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-gray-900 via-red-900/50 to-black flex items-center justify-center">
        <div className="bg-black/90 rounded-2xl p-8 max-w-md mx-4 border border-red-500/50 text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-6">GAME OVER</h1>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-4xl font-bold text-yellow-400">{score.toLocaleString()}</div>
              <div className="text-gray-400">Final Score</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">{enemiesKilled}</div>
                <div className="text-gray-400 text-sm">Kills</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-400">{level}</div>
                <div className="text-gray-400 text-sm">Level</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setScore(0);
                setHealth(100);
                setAmmo(30);
                setTimeLeft(120);
                setLevel(1);
                setEnemiesKilled(0);
                gameRef.current.portals = { orange: null, blue: null };
                setGameState('playing');
              }}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors"
            >
              RETRY
            </button>
            <button
              onClick={() => onGameEnd?.(score)}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[600px] bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
      />

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="space-y-2">
          {/* Health */}
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-red-400 text-xs font-bold mb-1">HEALTH</div>
            <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all" style={{ width: `${health}%` }} />
            </div>
          </div>
          {/* Ammo */}
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-yellow-400 text-xs font-bold">AMMO: {ammo}</div>
          </div>
        </div>

        {/* Score & Time */}
        <div className="text-center">
          <div className="bg-black/70 rounded-lg px-6 py-2 backdrop-blur-sm">
            <div className="text-yellow-400 text-2xl font-bold">{score.toLocaleString()}</div>
          </div>
          <div className="bg-black/70 rounded-lg px-4 py-1 mt-2 backdrop-blur-sm">
            <div className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Level & Portal Mode */}
        <div className="space-y-2">
          <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="text-cyan-400 text-xs font-bold">LEVEL {level}</div>
          </div>
          <button
            onClick={() => setPortalMode(p => p === 'orange' ? 'blue' : 'orange')}
            className={`pointer-events-auto px-4 py-2 rounded-lg font-bold text-sm ${portalMode === 'orange' ? 'bg-orange-600' : 'bg-blue-600'}`}
          >
            {portalMode.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-2xl font-bold text-white bg-black/50 px-6 py-3 rounded-xl animate-pulse">
          {message}
        </div>
      )}

      {/* Click to start */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none">
        {!isMobile && 'Click to lock mouse • Left=Shoot • Right=Portal • Q=Switch'}
      </div>

      {/* Mobile Controls */}
      {isMobile && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1">
            <div />
            <button className="w-14 h-14 bg-white/20 rounded-lg text-2xl active:bg-white/40" onTouchStart={() => mobileMove('up')} onTouchEnd={mobileStop}>▲</button>
            <div />
            <button className="w-14 h-14 bg-white/20 rounded-lg text-2xl active:bg-white/40" onTouchStart={() => mobileMove('left')} onTouchEnd={mobileStop}>◀</button>
            <button className="w-14 h-14 bg-white/20 rounded-lg text-xl active:bg-white/40" onTouchStart={mobileJump}>⬆</button>
            <button className="w-14 h-14 bg-white/20 rounded-lg text-2xl active:bg-white/40" onTouchStart={() => mobileMove('right')} onTouchEnd={mobileStop}>▶</button>
            <div />
            <button className="w-14 h-14 bg-white/20 rounded-lg text-2xl active:bg-white/40" onTouchStart={() => mobileMove('down')} onTouchEnd={mobileStop}>▼</button>
            <div />
          </div>

          <div className="absolute bottom-4 right-4 flex gap-3">
            <button className="w-16 h-16 bg-yellow-500/50 rounded-full text-2xl active:bg-yellow-500/80" onTouchStart={mobileShoot}>🔫</button>
            <button className={`w-16 h-16 rounded-full text-2xl active:opacity-80 ${portalMode === 'orange' ? 'bg-orange-500/50' : 'bg-blue-500/50'}`} onTouchStart={mobilePortal}>🌀</button>
          </div>
        </>
      )}
    </div>
  );
}
