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
  const [portalMode, setPortalMode] = useState<'green' | 'red'>('green');

  // Game state
  const gameRef = useRef({
    player: { x: 0, y: 1.7, z: -8, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true },
    portals: { 
      green: null as { x: number; y: number; z: number; wall: string; nx: number; nz: number } | null, 
      red: null as { x: number; y: number; z: number; wall: string; nx: number; nz: number } | null 
    },
    cubes: [] as { x: number; y: number; z: number; held: boolean; id: number }[],
    buttons: [] as { x: number; z: number; pressed: boolean }[],
    enemies: [] as { x: number; y: number; z: number; vx: number; vz: number; hp: number; attackTimer: number }[],
    enemyBullets: [] as { x: number; y: number; z: number; dx: number; dy: number; dz: number }[],
    exit: { x: 0, z: 12, active: false },
    heldCube: null as number | null,
    portalShots: [] as { x: number; y: number; z: number; dx: number; dy: number; dz: number; color: string }[],
    keys: {} as Record<string, boolean>,
    lastShot: 0,
    size: 20,
    swordSwing: 0,
    isParrying: false,
    parryTimer: 0,
    teleportCooldown: 0,
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
    game.size = 18 + levelNum * 3;
    game.cubes = [];
    game.buttons = [];
    game.enemies = [];
    game.enemyBullets = [];
    game.portals = { green: null, red: null };
    game.heldCube = null;
    game.portalShots = [];
    
    // Place cubes spread out
    for (let i = 0; i < Math.min(levelNum + 1, 4); i++) {
      game.cubes.push({
        x: (Math.random() - 0.5) * (game.size - 4),
        y: 0.5,
        z: (Math.random() - 0.5) * (game.size - 4),
        held: false,
        id: i
      });
    }
    
    // Place buttons
    for (let i = 0; i < Math.min(levelNum, 3); i++) {
      game.buttons.push({
        x: -4 + i * 4,
        z: game.size / 2 - 4,
        pressed: false
      });
    }
    
    // Spawn enemies
    for (let i = 0; i < levelNum + 1; i++) {
      const angle = (i / (levelNum + 1)) * Math.PI * 2;
      game.enemies.push({
        x: Math.cos(angle) * (game.size / 3),
        y: 1.5,
        z: Math.sin(angle) * (game.size / 3),
        vx: (Math.random() - 0.5) * 2,
        vz: (Math.random() - 0.5) * 2,
        hp: 3,
        attackTimer: Math.random() * 120
      });
    }
    
    game.exit = { x: 0, z: game.size / 2 - 2, active: false };
    game.player = { x: 0, y: 1.7, z: -game.size / 2 + 4, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true };
    
    showMessage(`CHAMBER ${levelNum}`, 2500);
  }, [showMessage]);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // Input handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      game.keys[e.code] = true;
      if (e.code === 'KeyQ') {
        setPortalMode(prev => {
          const newMode = prev === 'green' ? 'red' : 'green';
          showMessage(`${newMode.toUpperCase()} PORTAL`, 800);
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
        } else {
          const nearest = game.cubes.find(c => !c.held && Math.hypot(c.x - game.player.x, c.z - game.player.z) < 2.5);
          if (nearest) {
            nearest.held = true;
            game.heldCube = nearest.id;
            showMessage('CUBE ACQUIRED', 800);
          }
        }
      }
      // Parry with F key
      if (e.code === 'KeyF' && game.parryTimer <= 0) {
        game.isParrying = true;
        game.parryTimer = 30;
        game.swordSwing = 1;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { game.keys[e.code] = false; };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        game.player.yaw += e.movementX * 0.002;
        // FIXED: Non-inverted pitch (positive movementY = look down)
        game.player.pitch = Math.max(-1.2, Math.min(1.2, game.player.pitch + e.movementY * 0.002));
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
        return;
      }
      
      // Trigger sword swing animation
      game.swordSwing = 1;
      
      const now = Date.now();
      if (now - game.lastShot < 300) return;
      game.lastShot = now;

      const dx = Math.sin(game.player.yaw) * Math.cos(game.player.pitch);
      const dy = -Math.sin(game.player.pitch);
      const dz = Math.cos(game.player.yaw) * Math.cos(game.player.pitch);
      
      // Shoot portal
      game.portalShots.push({
        x: game.player.x, y: game.player.y, z: game.player.z,
        dx: dx * 50, dy: dy * 50, dz: dz * 50,
        color: portalMode === 'green' ? '#00ff44' : '#ff2244'
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
        game.player.pitch = Math.max(-1.2, Math.min(1.2, game.player.pitch + (e.touches[0].clientY - lastTouchY) * 0.005));
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
      const fov = 600, scale = fov / rz;
      return { x: canvas.width / 2 + rx * scale, y: canvas.height / 2 - ry * scale, scale, z: rz };
    };

    const drawQuad = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, x3: number, y3: number, z3: number, x4: number, y4: number, z4: number, color: string) => {
      const p1 = project(x1, y1, z1), p2 = project(x2, y2, z2), p3 = project(x3, y3, z3), p4 = project(x4, y4, z4);
      if (!p1 || !p2 || !p3 || !p4) return;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
    };

    const drawCube3D = (cx: number, cy: number, cz: number, size: number, color: string, glow = false) => {
      const s = size / 2;
      if (glow) {
        const p = project(cx, cy, cz);
        if (p && p.z > 0.5) {
          ctx.shadowColor = color; ctx.shadowBlur = 30;
        }
      }
      drawQuad(cx-s, cy-s, cz+s, cx+s, cy-s, cz+s, cx+s, cy+s, cz+s, cx-s, cy+s, cz+s, color);
      drawQuad(cx-s, cy-s, cz-s, cx-s, cy+s, cz-s, cx+s, cy+s, cz-s, cx+s, cy-s, cz-s, color);
      drawQuad(cx-s, cy+s, cz-s, cx-s, cy+s, cz+s, cx+s, cy+s, cz+s, cx+s, cy+s, cz-s, '#ffffff40');
      drawQuad(cx+s, cy-s, cz-s, cx+s, cy+s, cz-s, cx+s, cy+s, cz+s, cx+s, cy-s, cz+s, '#ffffff20');
      drawQuad(cx-s, cy-s, cz-s, cx-s, cy-s, cz+s, cx-s, cy+s, cz+s, cx-s, cy+s, cz-s, '#00000020');
      ctx.shadowBlur = 0;
    };

    const drawPortal = (portal: typeof game.portals.green, color: string) => {
      if (!portal) return;
      const p = project(portal.x, 1.5, portal.z);
      if (!p || p.z < 0.5) return;
      const size = 120 * p.scale;
      
      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 40;
      
      // Portal swirl effect
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(0.3, color + '88');
      grad.addColorStop(0.7, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 0.8, size, 0, 0, Math.PI * 2); ctx.fill();
      
      // Rotating rings
      ctx.strokeStyle = color; ctx.lineWidth = 4 * p.scale;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, size * (0.4 + i * 0.15), size * (0.6 + i * 0.15), Date.now() * 0.002 + i, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Center void
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, size * 0.25, size * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      
      ctx.shadowBlur = 0;
    };

    const drawSword = () => {
      const w = canvas.width, h = canvas.height;
      const baseX = w * 0.7, baseY = h * 0.85;
      const swingOffset = Math.sin(game.swordSwing * Math.PI) * 60;
      const swingRotate = Math.sin(game.swordSwing * Math.PI) * 0.8;
      
      ctx.save();
      ctx.translate(baseX + swingOffset * 0.5, baseY - swingOffset);
      ctx.rotate(-0.3 + swingRotate);
      
      // Sword glow color based on mode
      const glowColor = portalMode === 'green' ? '#00ff44' : '#ff2244';
      
      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 30;
      
      // Handle
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(-15, 80, 30, 100);
      
      // Hand guard
      ctx.fillStyle = '#gold';
      const guardGrad = ctx.createLinearGradient(-50, 75, 50, 85);
      guardGrad.addColorStop(0, '#8B7500');
      guardGrad.addColorStop(0.5, '#FFD700');
      guardGrad.addColorStop(1, '#8B7500');
      ctx.fillStyle = guardGrad;
      ctx.fillRect(-50, 70, 100, 20);
      
      // Blade
      const bladeGrad = ctx.createLinearGradient(0, -180, 0, 70);
      bladeGrad.addColorStop(0, glowColor);
      bladeGrad.addColorStop(0.3, '#ffffff');
      bladeGrad.addColorStop(0.7, '#cccccc');
      bladeGrad.addColorStop(1, '#888888');
      ctx.fillStyle = bladeGrad;
      
      ctx.beginPath();
      ctx.moveTo(0, -180); // Tip
      ctx.lineTo(-25, 70);  // Left base
      ctx.lineTo(25, 70);   // Right base
      ctx.closePath();
      ctx.fill();
      
      // Blade edge glow
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -180);
      ctx.lineTo(-25, 70);
      ctx.moveTo(0, -180);
      ctx.lineTo(25, 70);
      ctx.stroke();
      
      // Center line glow
      ctx.strokeStyle = glowColor + '88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -170);
      ctx.lineTo(0, 60);
      ctx.stroke();
      
      // Slash effect when swinging
      if (game.swordSwing > 0.1) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 8;
        ctx.globalAlpha = game.swordSwing;
        ctx.beginPath();
        ctx.arc(-100, -50, 200, -0.5, 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawEnemy = (enemy: typeof game.enemies[0]) => {
      const p = project(enemy.x, enemy.y, enemy.z);
      if (!p || p.z < 0.5) return;
      const size = 60 * p.scale;
      
      // Body
      ctx.fillStyle = '#660066';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(p.x, p.y - size * 0.2, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(p.x, p.y - size * 0.2, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      
      // HP bar
      ctx.fillStyle = '#333';
      ctx.fillRect(p.x - size, p.y - size - 15, size * 2, 8);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(p.x - size, p.y - size - 15, size * 2 * (enemy.hp / 3), 8);
    };

    // Portal teleport function
    const tryTeleport = () => {
      if (game.teleportCooldown > 0) return;
      if (!game.portals.green || !game.portals.red) return;
      
      const checkPortal = (from: typeof game.portals.green, to: typeof game.portals.green, name: string) => {
        if (!from || !to) return false;
        const dist = Math.hypot(game.player.x - from.x, game.player.z - from.z);
        if (dist < 1.5) {
          // Teleport to the other portal
          game.player.x = to.x + to.nx * 2;
          game.player.z = to.z + to.nz * 2;
          
          // Preserve momentum but redirect based on exit portal direction
          const speed = Math.hypot(game.player.vx, game.player.vz);
          game.player.vx = to.nx * speed * 1.2;
          game.player.vz = to.nz * speed * 1.2;
          
          game.teleportCooldown = 30;
          setScore(p => p + 50);
          showMessage('+50 TELEPORT!', 1000);
          return true;
        }
        return false;
      };
      
      if (!checkPortal(game.portals.green, game.portals.red, 'green')) {
        checkPortal(game.portals.red, game.portals.green, 'red');
      }
    };

    // Game loop
    const gameLoop = () => {
      const dt = 1/60;
      const w = canvas.width, h = canvas.height;
      const size = game.size;
      const limit = size / 2 - 0.5;

      // Update timers
      if (game.swordSwing > 0) game.swordSwing = Math.max(0, game.swordSwing - 0.08);
      if (game.parryTimer > 0) { game.parryTimer--; if (game.parryTimer === 0) game.isParrying = false; }
      if (game.teleportCooldown > 0) game.teleportCooldown--;

      // Sky gradient - darker void theme
      const sky = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
      sky.addColorStop(0, '#1a0a2a');
      sky.addColorStop(0.5, '#0a0515');
      sky.addColorStop(1, '#000000');
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
        game.player.vx = (mx * cos + mz * sin) * 6;
        game.player.vz = (-mx * sin + mz * cos) * 6;
      } else {
        game.player.vx *= 0.85; game.player.vz *= 0.85;
      }

      if (game.keys['Space'] && game.player.onGround) {
        game.player.vy = 8; game.player.onGround = false;
      }
      game.player.vy -= 20 * dt;

      game.player.x += game.player.vx * dt;
      game.player.y += game.player.vy * dt;
      game.player.z += game.player.vz * dt;

      if (game.player.y < 1.7) { game.player.y = 1.7; game.player.vy = 0; game.player.onGround = true; }
      game.player.x = Math.max(-limit, Math.min(limit, game.player.x));
      game.player.z = Math.max(-limit, Math.min(limit, game.player.z));

      // Check portal teleportation
      tryTeleport();

      // Update enemies
      game.enemies.forEach(enemy => {
        enemy.x += enemy.vx * dt;
        enemy.z += enemy.vz * dt;
        
        // Bounce off walls
        if (Math.abs(enemy.x) > limit - 1) enemy.vx *= -1;
        if (Math.abs(enemy.z) > limit - 1) enemy.vz *= -1;
        
        // Attack timer
        enemy.attackTimer--;
        if (enemy.attackTimer <= 0) {
          enemy.attackTimer = 90 + Math.random() * 60;
          const dx = game.player.x - enemy.x;
          const dz = game.player.z - enemy.z;
          const len = Math.hypot(dx, dz);
          game.enemyBullets.push({
            x: enemy.x, y: enemy.y, z: enemy.z,
            dx: (dx / len) * 12, dy: 0, dz: (dz / len) * 12
          });
        }
      });

      // Update enemy bullets
      game.enemyBullets = game.enemyBullets.filter(b => {
        b.x += b.dx * dt; b.y += b.dy * dt; b.z += b.dz * dt;
        
        // Check parry
        const dist = Math.hypot(b.x - game.player.x, b.z - game.player.z);
        if (dist < 2 && game.isParrying) {
          setScore(p => p + 100);
          showMessage('+100 PARRY!', 1000);
          return false;
        }
        
        // Hit player
        if (dist < 1 && !game.isParrying) {
          showMessage('HIT! -50', 1000);
          setScore(p => Math.max(0, p - 50));
          return false;
        }
        
        return Math.abs(b.x) < limit && Math.abs(b.z) < limit && b.y > 0 && b.y < 5;
      });

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
        } else if (!cubeOn) { btn.pressed = false; }
        if (!btn.pressed) allPressed = false;
      });
      game.exit.active = allPressed || game.buttons.length === 0;

      // Exit check
      if (game.exit.active && Math.hypot(game.player.x - game.exit.x, game.player.z - game.exit.z) < 2) {
        const bonus = 500 + currentLevel * 150;
        setScore(p => p + bonus);
        setCurrentLevel(p => p + 1);
        showMessage(`+${bonus} LEVEL COMPLETE!`, 2000);
        generateLevel(currentLevel + 1);
      }

      // Portal shots
      game.portalShots = game.portalShots.filter(b => {
        b.x += b.dx * dt; b.y += b.dy * dt; b.z += b.dz * dt;
        
        // Check wall collisions
        const walls = [
          { cond: b.z > limit, portal: { x: Math.max(-limit+1, Math.min(limit-1, b.x)), y: b.y, z: limit, wall: 'north', nx: 0, nz: -1 } },
          { cond: b.z < -limit, portal: { x: Math.max(-limit+1, Math.min(limit-1, b.x)), y: b.y, z: -limit, wall: 'south', nx: 0, nz: 1 } },
          { cond: b.x > limit, portal: { x: limit, y: b.y, z: Math.max(-limit+1, Math.min(limit-1, b.z)), wall: 'east', nx: -1, nz: 0 } },
          { cond: b.x < -limit, portal: { x: -limit, y: b.y, z: Math.max(-limit+1, Math.min(limit-1, b.z)), wall: 'west', nx: 1, nz: 0 } },
        ];
        
        for (const w of walls) {
          if (w.cond) {
            if (b.color === '#00ff44') {
              game.portals.green = w.portal;
              showMessage('GREEN PORTAL PLACED', 1500);
            } else {
              game.portals.red = w.portal;
              showMessage('RED PORTAL PLACED', 1500);
            }
            if (game.portals.green && game.portals.red) {
              showMessage('PORTALS LINKED!', 2000);
            }
            return false;
          }
        }
        
        // Check enemy hit
        game.enemies = game.enemies.filter(e => {
          const dist = Math.hypot(e.x - b.x, e.z - b.z);
          if (dist < 1.5) {
            e.hp--;
            if (e.hp <= 0) {
              setScore(p => p + 200);
              showMessage('+200 ENEMY DESTROYED!', 1000);
              return false;
            }
            return true;
          }
          return true;
        });
        
        return Math.abs(b.x) < limit + 2 && Math.abs(b.z) < limit + 2 && b.y > 0 && b.y < 8;
      });

      // Draw floor - glowing grid
      ctx.strokeStyle = '#00ff4422';
      ctx.lineWidth = 1;
      for (let x = -size/2; x <= size/2; x += 2) {
        const p1 = project(x, 0, -size/2), p2 = project(x, 0, size/2);
        if (p1 && p2) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
      }
      for (let z = -size/2; z <= size/2; z += 2) {
        const p1 = project(-size/2, 0, z), p2 = project(size/2, 0, z);
        if (p1 && p2) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
      }

      // Draw walls - semi-transparent with grid
      const wallH = 6;
      ctx.fillStyle = '#1a0a3a44';
      drawQuad(-size/2, 0, size/2, size/2, 0, size/2, size/2, wallH, size/2, -size/2, wallH, size/2);
      drawQuad(-size/2, 0, -size/2, -size/2, wallH, -size/2, size/2, wallH, -size/2, size/2, 0, -size/2);
      drawQuad(size/2, 0, -size/2, size/2, 0, size/2, size/2, wallH, size/2, size/2, wallH, -size/2);
      drawQuad(-size/2, 0, -size/2, -size/2, wallH, -size/2, -size/2, wallH, size/2, -size/2, 0, size/2);

      // Wall grid lines
      ctx.strokeStyle = '#4400ff44';
      ctx.lineWidth = 1;
      for (let i = -size/2; i <= size/2; i += 3) {
        const p1 = project(i, 0, size/2), p2 = project(i, wallH, size/2);
        if (p1 && p2) { ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); }
      }

      // Portals
      drawPortal(game.portals.green, '#00ff44');
      drawPortal(game.portals.red, '#ff2244');

      // Cubes
      game.cubes.forEach(c => { if (!c.held) drawCube3D(c.x, c.y, c.z, 0.8, '#ff66ff', true); });

      // Buttons
      game.buttons.forEach(btn => {
        const p = project(btn.x, 0.1, btn.z);
        if (p && p.z > 0.3) {
          const r = 50 * p.scale;
          ctx.shadowColor = btn.pressed ? '#00ff00' : '#ff0000';
          ctx.shadowBlur = 20;
          ctx.fillStyle = btn.pressed ? '#00ff00' : '#ff4444';
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Exit
      if (game.exit.active) {
        const p = project(game.exit.x, 1.5, game.exit.z);
        if (p && p.z > 0.3) {
          const r = 100 * p.scale;
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 40;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0, '#00ffff88');
          grad.addColorStop(0.5, '#00ffff44');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Enemies
      game.enemies.forEach(e => drawEnemy(e));

      // Enemy bullets
      game.enemyBullets.forEach(b => {
        const p = project(b.x, b.y, b.z);
        if (p && p.z > 0.3) {
          ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15;
          ctx.fillStyle = '#ff0000';
          ctx.beginPath(); ctx.arc(p.x, p.y, 10 * p.scale, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Portal shots
      game.portalShots.forEach(b => {
        const p = project(b.x, b.y, b.z);
        if (p && p.z > 0.3) {
          ctx.shadowColor = b.color; ctx.shadowBlur = 20;
          ctx.fillStyle = b.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 12 * p.scale, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw held cube indicator
      if (game.heldCube !== null) {
        ctx.fillStyle = '#ff66ff';
        ctx.shadowColor = '#ff66ff'; ctx.shadowBlur = 20;
        ctx.fillRect(w/2 - 30, h - 80, 60, 60);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('CUBE', w/2, h - 90);
      }

      // Draw sword
      drawSword();

      // Crosshair
      const crossColor = portalMode === 'green' ? '#00ff44' : '#ff2244';
      ctx.strokeStyle = crossColor; ctx.lineWidth = 2;
      ctx.shadowColor = crossColor; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(w/2 - 25, h/2); ctx.lineTo(w/2 - 8, h/2);
      ctx.moveTo(w/2 + 8, h/2); ctx.lineTo(w/2 + 25, h/2);
      ctx.moveTo(w/2, h/2 - 25); ctx.lineTo(w/2, h/2 - 8);
      ctx.moveTo(w/2, h/2 + 8); ctx.lineTo(w/2, h/2 + 25);
      ctx.stroke();
      
      ctx.fillStyle = crossColor;
      ctx.beginPath(); ctx.arc(w/2, h/2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Parry indicator
      if (game.isParrying) {
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(w/2, h/2, 50, 0, Math.PI * 2); ctx.stroke();
      }

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
      gameRef.current.player.vy = 8; 
      gameRef.current.player.onGround = false; 
    }
  };
  const mobileShoot = () => {
    const g = gameRef.current;
    g.swordSwing = 1;
    const dx = Math.sin(g.player.yaw) * Math.cos(g.player.pitch);
    const dy = -Math.sin(g.player.pitch);
    const dz = Math.cos(g.player.yaw) * Math.cos(g.player.pitch);
    g.portalShots.push({ x: g.player.x, y: g.player.y, z: g.player.z, dx: dx * 50, dy: dy * 50, dz: dz * 50, color: portalMode === 'green' ? '#00ff44' : '#ff2244' });
  };
  const mobileParry = () => {
    const g = gameRef.current;
    if (g.parryTimer <= 0) {
      g.isParrying = true;
      g.parryTimer = 30;
      g.swordSwing = 1;
    }
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-black to-green-950 flex items-center justify-center overflow-hidden">
        {/* Animated portal rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-96 border-4 border-green-500 rounded-full animate-pulse opacity-30" style={{ transform: 'translateX(-150px) rotate(10deg)', animation: 'spin 8s linear infinite' }} />
          <div className="w-64 h-96 border-4 border-red-500 rounded-full animate-pulse opacity-30" style={{ transform: 'translateX(150px) rotate(-10deg)', animation: 'spin 8s linear infinite reverse' }} />
        </div>

        <div className="relative z-10 bg-black/90 rounded-2xl p-8 max-w-lg mx-4 border border-green-500/30 shadow-2xl shadow-green-500/20">
          <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 via-white to-red-400 bg-clip-text text-transparent">WORMHOLE</h1>
          <p className="text-purple-400 text-center mb-6">Dimensional Testing Facility</p>

          <div className="space-y-3 text-sm">
            <div className="bg-gray-900/80 rounded-lg p-4 border border-green-500/20">
              <h3 className="text-green-400 font-bold mb-2">🎮 CONTROLS</h3>
              <div className="grid grid-cols-2 gap-1 text-gray-300">
                <div>WASD - Move</div><div>Mouse - Look</div>
                <div>Click - Slash Portal</div><div>Q - Switch Color</div>
                <div>E - Pickup/Drop</div><div>F - Parry</div>
                <div>Space - Jump</div><div></div>
              </div>
            </div>
            <div className="bg-gray-900/80 rounded-lg p-4 border border-red-500/20">
              <h3 className="text-red-400 font-bold mb-2">🌀 PORTALS</h3>
              <p className="text-gray-300">Slash <span className="text-green-400">GREEN</span> + <span className="text-red-400">RED</span> portals on walls. Walk through one to exit the other with momentum!</p>
            </div>
            <div className="bg-gray-900/80 rounded-lg p-4 border border-purple-500/20">
              <h3 className="text-purple-400 font-bold mb-2">⚔️ COMBAT</h3>
              <p className="text-gray-300">Press F to parry enemy attacks! Destroy enemies for +200 points.</p>
            </div>
          </div>

          <button onClick={() => setGameState('playing')} className="w-full mt-6 py-4 bg-gradient-to-r from-green-600 via-purple-600 to-red-600 text-white font-bold rounded-xl text-xl hover:from-green-500 hover:via-purple-500 hover:to-red-500 transition-all shadow-lg shadow-purple-500/30">
            ENTER THE VOID
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-black to-purple-900/30 flex items-center justify-center">
        <div className="bg-black/90 rounded-2xl p-8 max-w-md mx-4 border border-red-500/50 text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-6">DIMENSION COLLAPSED</h1>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-4 border border-yellow-500/30">
            <div className="text-4xl font-bold text-yellow-400">{score.toLocaleString()}</div>
            <div className="text-gray-400">Final Score</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-cyan-500/30">
            <div className="text-2xl font-bold text-cyan-400">Chamber {currentLevel}</div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setScore(0); setCurrentLevel(1); setTimeLeft(180); setGameState('playing'); }} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">RETRY</button>
            <button onClick={() => onGameEnd?.(score)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors">EXIT</button>
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
        <div className="bg-black/70 rounded-lg px-4 py-2 border border-purple-500/30">
          <div className="text-purple-400 font-bold">CHAMBER {currentLevel}</div>
          <div className="text-xs text-gray-400">Enemies: {gameRef.current.enemies?.length || 0}</div>
        </div>
        <div className="text-center">
          <div className="bg-black/70 rounded-lg px-6 py-2 border border-yellow-500/30">
            <div className="text-yellow-400 text-2xl font-bold">{score.toLocaleString()}</div>
          </div>
          <div className={`bg-black/70 rounded-lg px-4 py-1 mt-2 border ${timeLeft < 30 ? 'border-red-500' : 'border-gray-500/30'} ${timeLeft < 30 ? 'animate-pulse' : ''}`}>
            <div className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
          </div>
        </div>
        <button 
          onClick={() => setPortalMode(p => p === 'green' ? 'red' : 'green')} 
          className={`pointer-events-auto px-4 py-2 rounded-lg font-bold transition-all ${portalMode === 'green' ? 'bg-green-600 shadow-lg shadow-green-500/50' : 'bg-red-600 shadow-lg shadow-red-500/50'}`}
        >
          {portalMode.toUpperCase()} [Q]
        </button>
      </div>

      {message && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 rounded-xl border border-green-500/50 text-green-400 text-xl font-bold z-20 animate-pulse">
          {message}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none z-10">
        {!isMobile ? 'Click to lock mouse • Click = Slash Portal • Q = Switch • E = Cube • F = Parry' : ''}
      </div>

      {isMobile && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 z-20">
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50 border border-white/20" onTouchStart={() => mobileMove('up')} onTouchEnd={mobileStop}>▲</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50 border border-white/20" onTouchStart={() => mobileMove('left')} onTouchEnd={mobileStop}>◀</button>
            <button className="w-14 h-14 bg-white/30 rounded-lg text-sm active:bg-white/50 border border-white/20" onTouchStart={mobileJump}>JUMP</button>
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50 border border-white/20" onTouchStart={() => mobileMove('right')} onTouchEnd={mobileStop}>▶</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50 border border-white/20" onTouchStart={() => mobileMove('down')} onTouchEnd={mobileStop}>▼</button>
            <div />
          </div>
          <div className="absolute bottom-4 right-4 flex flex-col gap-3 z-20">
            <button className={`w-16 h-16 rounded-full text-2xl border-2 ${portalMode === 'green' ? 'bg-green-500/70 border-green-400' : 'bg-red-500/70 border-red-400'}`} onTouchStart={mobileShoot}>⚔️</button>
            <button className="w-16 h-16 bg-cyan-500/70 rounded-full text-2xl border-2 border-cyan-400" onTouchStart={mobileParry}>🛡️</button>
            <button className="w-16 h-16 bg-pink-500/70 rounded-full text-2xl border-2 border-pink-400" onTouchStart={mobilePickup}>📦</button>
          </div>
        </>
      )}
    </div>
  );
}

