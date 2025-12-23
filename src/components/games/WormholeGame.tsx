'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(180);
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [portalMode, setPortalMode] = useState<'orange' | 'blue'>('orange');

  // Game state
  const gameRef = useRef({
    player: { x: 0, y: 1.7, z: -8, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true },
    portals: { orange: null as { x: number; y: number; z: number; wall: string } | null, blue: null as { x: number; y: number; z: number; wall: string } | null },
    cubes: [] as { x: number; y: number; z: number; held: boolean; id: number }[],
    buttons: [] as { x: number; z: number; pressed: boolean }[],
    exit: { x: 0, z: 12, active: false },
    heldCube: null as number | null,
    bullets: [] as { x: number; y: number; z: number; dx: number; dy: number; dz: number; color: string }[],
    keys: {} as Record<string, boolean>,
    lastShot: 0,
    size: 14,
  });

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const showMessage = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  }, []);

  const generateLevel = useCallback((levelNum: number) => {
    const game = gameRef.current;
    game.size = 12 + levelNum * 2;
    game.cubes = [];
    game.buttons = [];
    game.portals = { orange: null, blue: null };
    game.heldCube = null;
    game.bullets = [];
    
    // Place cubes
    for (let i = 0; i < Math.min(levelNum, 3); i++) {
      game.cubes.push({
        x: -4 + i * 4,
        y: 0.5,
        z: 0,
        held: false,
        id: i
      });
    }
    
    // Place buttons near exit
    for (let i = 0; i < Math.min(levelNum, 3); i++) {
      game.buttons.push({
        x: -3 + i * 3,
        z: game.size / 2 - 3,
        pressed: false
      });
    }
    
    game.exit = { x: 0, z: game.size / 2 - 1, active: false };
    game.player = { x: 0, y: 1.7, z: -game.size / 2 + 3, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true };
    
    showMessage(`TEST CHAMBER ${levelNum}`, 2500);
  }, [showMessage]);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full screen canvas
    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const game = gameRef.current;
    generateLevel(currentLevel);

    // Input
    const handleKeyDown = (e: KeyboardEvent) => {
      game.keys[e.code] = true;
      if (e.code === 'KeyQ') {
        setPortalMode(prev => {
          const newMode = prev === 'orange' ? 'blue' : 'orange';
          showMessage(`${newMode.toUpperCase()} PORTAL`, 1000);
          return newMode;
        });
      }
      if (e.code === 'KeyE') {
        if (game.heldCube !== null) {
          const cube = game.cubes.find(c => c.id === game.heldCube);
          if (cube) {
            cube.held = false;
            cube.x = game.player.x + Math.sin(game.player.yaw) * 2;
            cube.z = game.player.z + Math.cos(game.player.yaw) * 2;
          }
          game.heldCube = null;
          showMessage('DROPPED', 800);
        } else {
          const nearest = game.cubes.find(c => !c.held && Math.hypot(c.x - game.player.x, c.z - game.player.z) < 2.5);
          if (nearest) {
            nearest.held = true;
            game.heldCube = nearest.id;
            showMessage('CUBE ACQUIRED', 800);
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { game.keys[e.code] = false; };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        game.player.yaw += e.movementX * 0.002;
        game.player.pitch = Math.max(-1.2, Math.min(1.2, game.player.pitch - e.movementY * 0.002));
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }
      const now = Date.now();
      if (now - game.lastShot < 200) return;
      game.lastShot = now;

      const dx = Math.sin(game.player.yaw) * Math.cos(game.player.pitch);
      const dy = -Math.sin(game.player.pitch);
      const dz = Math.cos(game.player.yaw) * Math.cos(game.player.pitch);
      const isPortal = e.button === 2;
      
      game.bullets.push({
        x: game.player.x, y: game.player.y, z: game.player.z,
        dx: dx * 35, dy: dy * 35, dz: dz * 35,
        color: isPortal ? (portalMode === 'orange' ? '#ff6600' : '#00aaff') : '#ffff00'
      });
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    let lastTouchX = 0, lastTouchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) { lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        game.player.yaw += (e.touches[0].clientX - lastTouchX) * 0.005;
        game.player.pitch = Math.max(-1.2, Math.min(1.2, game.player.pitch - (e.touches[0].clientY - lastTouchY) * 0.005));
        lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { setGameState('gameover'); return 0; } return prev - 1; });
    }, 1000);

    // 3D Projection
    const project = (x: number, y: number, z: number) => {
      let rx = x - game.player.x, ry = y - game.player.y, rz = z - game.player.z;
      const cosY = Math.cos(-game.player.yaw), sinY = Math.sin(-game.player.yaw);
      let tx = rx * cosY - rz * sinY; rz = rx * sinY + rz * cosY; rx = tx;
      const cosP = Math.cos(game.player.pitch), sinP = Math.sin(game.player.pitch);
      let ty = ry * cosP + rz * sinP; rz = -ry * sinP + rz * cosP; ry = ty;
      if (rz < 0.1) return null;
      const fov = 500, scale = fov / rz;
      return { x: canvas.width / 2 + rx * scale, y: canvas.height / 2 - ry * scale, scale, z: rz };
    };

    const drawLine3D = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: string, width = 2) => {
      const p1 = project(x1, y1, z1), p2 = project(x2, y2, z2);
      if (!p1 || !p2) return;
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    };

    const drawQuad = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number, color: string) => {
      const p1 = project(x1, y1, z1), p2 = project(x2, y2, z2), p3 = project(x3, y3, z3), p4 = project(x4, y4, z4);
      if (!p1 || !p2 || !p3 || !p4) return;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
    };

    const drawCube3D = (cx: number, cy: number, cz: number, size: number, color: string) => {
      const s = size / 2;
      // Faces
      drawQuad(cx-s, cy-s, cz+s, cx+s, cy-s, cz+s, cx+s, cy+s, cz+s, cx-s, cy+s, cz+s, color);
      drawQuad(cx-s, cy-s, cz-s, cx-s, cy+s, cz-s, cx+s, cy+s, cz-s, cx+s, cy-s, cz-s, color);
      drawQuad(cx-s, cy+s, cz-s, cx-s, cy+s, cz+s, cx+s, cy+s, cz+s, cx+s, cy+s, cz-s, '#ff88ff');
      drawQuad(cx-s, cy-s, cz-s, cx+s, cy-s, cz-s, cx+s, cy-s, cz+s, cx-s, cy-s, cz+s, '#cc44cc');
      drawQuad(cx+s, cy-s, cz-s, cx+s, cy+s, cz-s, cx+s, cy+s, cz+s, cx+s, cy-s, cz+s, '#dd55dd');
      drawQuad(cx-s, cy-s, cz-s, cx-s, cy-s, cz+s, cx-s, cy+s, cz+s, cx-s, cy+s, cz-s, '#dd55dd');
    };

    const drawPortal = (portal: typeof game.portals.orange, color: string) => {
      if (!portal) return;
      const p = project(portal.x, 1.5, portal.z);
      if (!p || p.z < 0.5) return;
      const size = 100 * p.scale;
      
      // Glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grad.addColorStop(0, color + 'aa'); grad.addColorStop(0.5, color + '44'); grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 0.7, size, 0, 0, Math.PI * 2); ctx.fill();
      
      // Ring
      ctx.strokeStyle = color; ctx.lineWidth = 8 * p.scale;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 0.6, size * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
      
      // Swirl
      ctx.strokeStyle = color + '80'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * (0.3 + i * 0.2), Date.now() * 0.003 + i, Date.now() * 0.003 + i + 2);
        ctx.stroke();
      }
    };

    // Draw first-person gun
    const drawGun = () => {
      const w = canvas.width, h = canvas.height;
      const gunX = w * 0.65, gunY = h * 0.75;
      
      // Gun arm
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.ellipse(gunX - 40, gunY + 60, 30, 50, -0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Gun body
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(gunX - 30, gunY - 20, 120, 50);
      ctx.fillRect(gunX + 70, gunY - 10, 60, 30);
      
      // Barrel
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(gunX + 110, gunY - 5, 80, 20);
      
      // Orange/Blue glow ring
      ctx.strokeStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(gunX + 180, gunY + 5, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner glow
      ctx.shadowColor = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.beginPath();
      ctx.arc(gunX + 180, gunY + 5, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Blue inner ring
      ctx.strokeStyle = portalMode === 'orange' ? '#00aaff' : '#ff6600';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gunX + 180, gunY + 5, 8, 0, Math.PI * 2);
      ctx.stroke();
      
      // Handle
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(gunX, gunY + 25, 40, 60);
    };

    // Game loop
    const gameLoop = () => {
      const dt = 1/60;
      const w = canvas.width, h = canvas.height;
      const size = game.size;
      const limit = size / 2 - 0.5;

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1a1a3a');
      sky.addColorStop(0.5, '#2a2a4a');
      sky.addColorStop(1, '#3a3a5a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Player movement
      let mx = 0, mz = 0;
      if (game.keys['KeyW']) mz = 1;
      if (game.keys['KeyS']) mz = -1;
      if (game.keys['KeyA']) mx = -1;
      if (game.keys['KeyD']) mx = 1;

      if (mx || mz) {
        const len = Math.hypot(mx, mz); mx /= len; mz /= len;
        const cos = Math.cos(game.player.yaw), sin = Math.sin(game.player.yaw);
        game.player.vx = (mx * cos + mz * sin) * 5;
        game.player.vz = (-mx * sin + mz * cos) * 5;
      } else {
        game.player.vx *= 0.85; game.player.vz *= 0.85;
      }

      if (game.keys['Space'] && game.player.onGround) {
        game.player.vy = 7; game.player.onGround = false;
      }
      game.player.vy -= 18 * dt;

      game.player.x += game.player.vx * dt;
      game.player.y += game.player.vy * dt;
      game.player.z += game.player.vz * dt;

      if (game.player.y < 1.7) { game.player.y = 1.7; game.player.vy = 0; game.player.onGround = true; }
      game.player.x = Math.max(-limit, Math.min(limit, game.player.x));
      game.player.z = Math.max(-limit, Math.min(limit, game.player.z));

      // Portal teleport
      if (game.portals.orange && game.portals.blue) {
        [game.portals.orange, game.portals.blue].forEach((from, i) => {
          const to = i === 0 ? game.portals.blue : game.portals.orange;
          if (!from || !to) return;
          if (Math.hypot(game.player.x - from.x, game.player.z - from.z) < 1.2) {
            const speed = Math.hypot(game.player.vx, game.player.vz);
            game.player.x = to.x; game.player.z = to.z;
            if (to.wall === 'north') game.player.vz = speed;
            else if (to.wall === 'south') game.player.vz = -speed;
            else if (to.wall === 'east') game.player.vx = -speed;
            else game.player.vx = speed;
            game.player.x += game.player.vx * 0.3;
            game.player.z += game.player.vz * 0.3;
            setScore(p => p + 25);
            showMessage('+25 TELEPORT!', 1000);
          }
        });
      }

      // Held cube
      if (game.heldCube !== null) {
        const cube = game.cubes.find(c => c.id === game.heldCube);
        if (cube) {
          cube.x = game.player.x + Math.sin(game.player.yaw) * 1.5;
          cube.z = game.player.z + Math.cos(game.player.yaw) * 1.5;
          cube.y = 1.2;
        }
      }

      // Buttons
      let allPressed = game.buttons.length > 0;
      game.buttons.forEach(btn => {
        const cubeOn = game.cubes.some(c => !c.held && Math.hypot(c.x - btn.x, c.z - btn.z) < 1);
        if (cubeOn && !btn.pressed) {
          btn.pressed = true;
          setScore(p => p + 100);
          showMessage('+100 BUTTON!', 1200);
        } else if (!cubeOn) {
          btn.pressed = false;
        }
        if (!btn.pressed) allPressed = false;
      });
      game.exit.active = allPressed;

      // Exit check
      if (game.exit.active && Math.hypot(game.player.x - game.exit.x, game.player.z - game.exit.z) < 1.5) {
        const bonus = 500 + currentLevel * 100;
        setScore(p => p + bonus);
        setCurrentLevel(p => p + 1);
        showMessage(`+${bonus} LEVEL COMPLETE!`, 2000);
        generateLevel(currentLevel + 1);
      }

      // Bullets
      game.bullets = game.bullets.filter(b => {
        b.x += b.dx * dt; b.y += b.dy * dt; b.z += b.dz * dt;
        
        if (b.color !== '#ffff00') {
          const walls = [
            { cond: b.z > limit, portal: { x: b.x, y: b.y, z: limit, wall: 'north' } },
            { cond: b.z < -limit, portal: { x: b.x, y: b.y, z: -limit, wall: 'south' } },
            { cond: b.x > limit, portal: { x: limit, y: b.y, z: b.z, wall: 'east' } },
            { cond: b.x < -limit, portal: { x: -limit, y: b.y, z: b.z, wall: 'west' } },
          ];
          for (const w of walls) {
            if (w.cond) {
              if (b.color === '#ff6600') game.portals.orange = w.portal;
              else game.portals.blue = w.portal;
              showMessage(b.color === '#ff6600' ? 'ORANGE PORTAL' : 'BLUE PORTAL', 1500);
              if (game.portals.orange && game.portals.blue) showMessage('PORTALS LINKED!', 2000);
              return false;
            }
          }
        }
        return b.y > 0 && b.y < 10 && Math.abs(b.x) < limit + 5 && Math.abs(b.z) < limit + 5;
      });

      // Draw floor - checkerboard
      for (let x = -size/2; x < size/2; x += 2) {
        for (let z = -size/2; z < size/2; z += 2) {
          const shade = ((x + z) / 2) % 2 === 0 ? '#3a3a5a' : '#2a2a4a';
          drawQuad(x, 0, z, x+2, 0, z, x+2, 0, z+2, x, 0, z+2, shade);
        }
      }

      // Draw walls
      const wallH = 5;
      // North wall (bright)
      drawQuad(-size/2, 0, size/2, size/2, 0, size/2, size/2, wallH, size/2, -size/2, wallH, size/2, '#5555aa');
      // South wall
      drawQuad(-size/2, 0, -size/2, -size/2, wallH, -size/2, size/2, wallH, -size/2, size/2, 0, -size/2, '#4444aa');
      // East wall
      drawQuad(size/2, 0, -size/2, size/2, 0, size/2, size/2, wallH, size/2, size/2, wallH, -size/2, '#4a4a9a');
      // West wall
      drawQuad(-size/2, 0, -size/2, -size/2, wallH, -size/2, -size/2, wallH, size/2, -size/2, 0, size/2, '#4a4a9a');
      // Ceiling
      drawQuad(-size/2, wallH, -size/2, size/2, wallH, -size/2, size/2, wallH, size/2, -size/2, wallH, size/2, '#2a2a4a');

      // Wall grid lines
      ctx.strokeStyle = '#6666bb';
      for (let i = -size/2; i <= size/2; i += 2) {
        drawLine3D(i, 0, size/2, i, wallH, size/2, '#6666bb', 1);
        drawLine3D(-size/2, 0, i, -size/2, wallH, i, '#5555aa', 1);
        drawLine3D(size/2, 0, i, size/2, wallH, i, '#5555aa', 1);
      }
      for (let y = 0; y <= wallH; y += 1) {
        drawLine3D(-size/2, y, size/2, size/2, y, size/2, '#6666bb', 1);
      }

      // Portals
      drawPortal(game.portals.orange, '#ff6600');
      drawPortal(game.portals.blue, '#00aaff');

      // Cubes
      game.cubes.forEach(c => { if (!c.held) drawCube3D(c.x, c.y, c.z, 0.8, '#ff66ff'); });

      // Buttons
      game.buttons.forEach(btn => {
        const p = project(btn.x, 0.1, btn.z);
        if (p && p.z > 0.3) {
          const r = 50 * p.scale;
          ctx.fillStyle = btn.pressed ? '#00ff00' : '#ff4444';
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
          ctx.stroke();
        }
      });

      // Exit
      if (game.exit.active) {
        const p = project(game.exit.x, 1.5, game.exit.z);
        if (p && p.z > 0.3) {
          const r = 80 * p.scale;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0, '#00ffff88');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 5;
          ctx.stroke();
        }
      }

      // Bullets
      game.bullets.forEach(b => {
        const p = project(b.x, b.y, b.z);
        if (p && p.z > 0.3) {
          ctx.shadowColor = b.color; ctx.shadowBlur = 15;
          ctx.fillStyle = b.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 8 * p.scale, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw held cube indicator
      if (game.heldCube !== null) {
        ctx.fillStyle = '#ff66ff';
        ctx.fillRect(w/2 - 40, h - 110, 80, 80);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.strokeRect(w/2 - 40, h - 110, 80, 80);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('HOLDING', w/2, h - 120);
      }

      // Draw gun (first person view)
      drawGun();

      // Crosshair
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w/2 - 20, h/2); ctx.lineTo(w/2 - 6, h/2);
      ctx.moveTo(w/2 + 6, h/2); ctx.lineTo(w/2 + 20, h/2);
      ctx.moveTo(w/2, h/2 - 20); ctx.lineTo(w/2, h/2 - 6);
      ctx.moveTo(w/2, h/2 + 6); ctx.lineTo(w/2, h/2 + 20);
      ctx.stroke();
      
      ctx.fillStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.beginPath(); ctx.arc(w/2, h/2, 4, 0, Math.PI * 2); ctx.fill();

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationRef.current);
      clearInterval(timerInterval);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [gameState, currentLevel, portalMode, generateLevel, showMessage]);

  // Mobile controls
  const mobileMove = (dir: string) => { 
    gameRef.current.keys = { KeyW: dir === 'up', KeyS: dir === 'down', KeyA: dir === 'left', KeyD: dir === 'right' }; 
  };
  const mobileStop = () => { gameRef.current.keys = {}; };
  const mobileJump = () => { 
    if (gameRef.current.player.onGround) { 
      gameRef.current.player.vy = 7; 
      gameRef.current.player.onGround = false; 
    }
  };
  const mobileShoot = () => {
    const g = gameRef.current;
    const dx = Math.sin(g.player.yaw) * Math.cos(g.player.pitch);
    const dy = -Math.sin(g.player.pitch);
    const dz = Math.cos(g.player.yaw) * Math.cos(g.player.pitch);
    g.bullets.push({ x: g.player.x, y: g.player.y, z: g.player.z, dx: dx * 35, dy: dy * 35, dz: dz * 35, color: portalMode === 'orange' ? '#ff6600' : '#00aaff' });
  };
  const mobilePickup = () => {
    const g = gameRef.current;
    if (g.heldCube !== null) {
      const cube = g.cubes.find(c => c.id === g.heldCube);
      if (cube) { cube.held = false; cube.x = g.player.x; cube.z = g.player.z; }
      g.heldCube = null;
    } else {
      const nearest = g.cubes.find(c => !c.held && Math.hypot(c.x - g.player.x, c.z - g.player.z) < 2.5);
      if (nearest) { nearest.held = true; g.heldCube = nearest.id; }
    }
  };

  if (gameState === 'instructions') {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-800 to-black flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="w-48 h-72 border-4 border-orange-500 rounded-full animate-pulse" style={{ transform: 'translateX(-120px)' }} />
          <div className="w-48 h-72 border-4 border-blue-500 rounded-full animate-pulse" style={{ transform: 'translateX(120px)' }} />
        </div>

        <div className="relative z-10 bg-black/90 rounded-2xl p-8 max-w-lg mx-4 border border-cyan-500/30">
          <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-orange-400 via-white to-blue-400 bg-clip-text text-transparent">WORMHOLE</h1>
          <p className="text-cyan-400 text-center mb-6">Aperture Science Testing</p>

          <div className="space-y-3 text-sm">
            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-orange-400 font-bold mb-2">🎮 CONTROLS</h3>
              <div className="grid grid-cols-2 gap-1 text-gray-300">
                <div>WASD - Move</div><div>Mouse - Look</div>
                <div>Right Click - Portal</div><div>Q - Switch Color</div>
                <div>E - Pickup/Drop</div><div>Space - Jump</div>
              </div>
            </div>
            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-blue-400 font-bold mb-2">🌀 PORTALS</h3>
              <p className="text-gray-300">Place <span className="text-orange-400">ORANGE</span> + <span className="text-blue-400">BLUE</span> on walls. Walk through to teleport with momentum!</p>
            </div>
            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-pink-400 font-bold mb-2">📦 PUZZLES</h3>
              <p className="text-gray-300">Pick up cubes, place on buttons to open the exit!</p>
            </div>
          </div>

          <button onClick={() => setGameState('playing')} className="w-full mt-6 py-4 bg-gradient-to-r from-orange-600 to-blue-600 text-white font-bold rounded-xl text-xl hover:from-orange-500 hover:to-blue-500">
            BEGIN TESTING
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-gray-900 to-black flex items-center justify-center">
        <div className="bg-black/90 rounded-2xl p-8 max-w-md mx-4 border border-red-500/50 text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-6">TEST FAILED</h1>
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="text-4xl font-bold text-yellow-400">{score.toLocaleString()}</div>
            <div className="text-gray-400">Final Score</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="text-2xl font-bold text-cyan-400">Chamber {currentLevel}</div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setScore(0); setCurrentLevel(1); setTimeLeft(180); setGameState('playing'); }} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl">RETRY</button>
            <button onClick={() => onGameEnd?.(score)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl">EXIT</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        <div className="bg-black/70 rounded-lg px-4 py-2"><div className="text-cyan-400 font-bold">CHAMBER {currentLevel}</div></div>
        <div className="text-center">
          <div className="bg-black/70 rounded-lg px-6 py-2"><div className="text-yellow-400 text-2xl font-bold">{score.toLocaleString()}</div></div>
          <div className={`bg-black/70 rounded-lg px-4 py-1 mt-2 ${timeLeft < 30 ? 'animate-pulse' : ''}`}>
            <div className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
          </div>
        </div>
        <button onClick={() => setPortalMode(p => p === 'orange' ? 'blue' : 'orange')} className={`pointer-events-auto px-4 py-2 rounded-lg font-bold ${portalMode === 'orange' ? 'bg-orange-600' : 'bg-blue-600'}`}>
          {portalMode.toUpperCase()} [Q]
        </button>
      </div>

      {message && <div className="absolute top-1/4 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 rounded-xl border border-cyan-500/50 text-cyan-400 text-xl font-bold z-20">{message}</div>}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none z-10">
        {!isMobile ? 'Click to lock mouse • Right-click = Portal • Q = Switch • E = Cube' : ''}
      </div>

      {isMobile && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 z-20">
            <div /><button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('up')} onTouchEnd={mobileStop}>▲</button><div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('left')} onTouchEnd={mobileStop}>◀</button>
            <button className="w-14 h-14 bg-white/30 rounded-lg text-sm active:bg-white/50" onTouchStart={mobileJump}>JUMP</button>
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('right')} onTouchEnd={mobileStop}>▶</button>
            <div /><button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('down')} onTouchEnd={mobileStop}>▼</button><div />
          </div>
          <div className="absolute bottom-4 right-4 flex flex-col gap-3 z-20">
            <button className={`w-16 h-16 rounded-full text-2xl ${portalMode === 'orange' ? 'bg-orange-500/70' : 'bg-blue-500/70'}`} onTouchStart={mobileShoot}>🌀</button>
            <button className="w-16 h-16 bg-pink-500/70 rounded-full text-2xl" onTouchStart={mobilePickup}>📦</button>
          </div>
        </>
      )}
    </div>
  );
}

