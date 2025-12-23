'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

// Portal-style physics puzzle game
export default function WormholeGame({ onGameEnd, isCompetitive = false }: WormholeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover' | 'levelcomplete'>('instructions');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(180);
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [portalMode, setPortalMode] = useState<'orange' | 'blue'>('orange');

  // Game state ref
  const gameRef = useRef({
    // Player
    player: { x: 2, y: 1.7, z: 2, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0, onGround: true },
    // Portals
    portals: {
      orange: null as { x: number; y: number; z: number; wall: string; active: boolean } | null,
      blue: null as { x: number; y: number; z: number; wall: string; active: boolean } | null
    },
    // Physics cubes
    cubes: [] as { x: number; y: number; z: number; held: boolean; id: number }[],
    // Buttons
    buttons: [] as { x: number; z: number; pressed: boolean; targetDoor: number }[],
    // Doors
    doors: [] as { x: number; z: number; wall: string; open: boolean; id: number }[],
    // Exit
    exit: { x: 0, z: 0, active: false },
    // Held cube
    heldCube: null as number | null,
    // Bullets
    bullets: [] as { x: number; y: number; z: number; dx: number; dy: number; dz: number; color: string }[],
    // Input
    keys: {} as Record<string, boolean>,
    mouseDown: false,
    lastShot: 0,
    // Level bounds
    walls: [] as { x1: number; z1: number; x2: number; z2: number; side: string }[],
  });

  // Detect mobile
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Show message
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  }, []);

  // Generate level
  const generateLevel = useCallback((levelNum: number) => {
    const game = gameRef.current;
    
    // Clear previous level
    game.cubes = [];
    game.buttons = [];
    game.doors = [];
    game.walls = [];
    game.portals = { orange: null, blue: null };
    game.heldCube = null;
    game.bullets = [];
    
    // Room size based on level
    const size = 10 + levelNum * 2;
    
    // Define walls (for portal placement)
    game.walls = [
      { x1: -size/2, z1: -size/2, x2: size/2, z2: -size/2, side: 'north' },
      { x1: -size/2, z1: size/2, x2: size/2, z2: size/2, side: 'south' },
      { x1: -size/2, z1: -size/2, x2: -size/2, z2: size/2, side: 'west' },
      { x1: size/2, z1: -size/2, x2: size/2, z2: size/2, side: 'east' },
    ];
    
    // Place cubes
    const cubeCount = Math.min(1 + levelNum, 3);
    for (let i = 0; i < cubeCount; i++) {
      game.cubes.push({
        x: (Math.random() - 0.5) * (size - 4),
        y: 0.5,
        z: (Math.random() - 0.5) * (size - 4),
        held: false,
        id: i
      });
    }
    
    // Place buttons (need cubes on them to activate)
    const buttonCount = Math.min(1 + Math.floor(levelNum / 2), 3);
    for (let i = 0; i < buttonCount; i++) {
      game.buttons.push({
        x: (Math.random() - 0.5) * (size - 4),
        z: size/2 - 2 - i * 3,
        pressed: false,
        targetDoor: i
      });
    }
    
    // Place doors (blocking exit)
    for (let i = 0; i < buttonCount; i++) {
      game.doors.push({
        x: 0,
        z: size/2 - 3 - i * 2,
        wall: 'horizontal',
        open: false,
        id: i
      });
    }
    
    // Exit portal
    game.exit = { x: 0, z: size/2 - 1, active: false };
    
    // Player start
    game.player.x = 0;
    game.player.y = 1.7;
    game.player.z = -size/2 + 2;
    game.player.yaw = 0;
    game.player.pitch = 0;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.vz = 0;
    
    showMessage(`TEST CHAMBER ${levelNum}`, 3000);
  }, [showMessage]);

  // Main game loop
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
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
          const newMode = prev === 'orange' ? 'blue' : 'orange';
          showMessage(`${newMode.toUpperCase()} PORTAL`, 1000);
          return newMode;
        });
      }
      
      // Pick up / drop cube
      if (e.code === 'KeyE') {
        if (game.heldCube !== null) {
          // Drop cube
          const cube = game.cubes.find(c => c.id === game.heldCube);
          if (cube) {
            cube.held = false;
            cube.x = game.player.x + Math.sin(game.player.yaw) * 2;
            cube.z = game.player.z + Math.cos(game.player.yaw) * 2;
            cube.y = 0.5;
          }
          game.heldCube = null;
          showMessage('CUBE DROPPED', 1000);
        } else {
          // Pick up nearest cube
          let nearest = null;
          let nearestDist = 3;
          game.cubes.forEach(cube => {
            if (cube.held) return;
            const dx = cube.x - game.player.x;
            const dz = cube.z - game.player.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = cube;
            }
          });
          if (nearest) {
            nearest.held = true;
            game.heldCube = nearest.id;
            showMessage('CUBE ACQUIRED', 1000);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.code] = false;
    };

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

      // Shoot direction
      const dx = Math.sin(game.player.yaw) * Math.cos(game.player.pitch);
      const dy = -Math.sin(game.player.pitch);
      const dz = Math.cos(game.player.yaw) * Math.cos(game.player.pitch);

      const isPortalShot = e.button === 2;
      
      game.bullets.push({
        x: game.player.x,
        y: game.player.y,
        z: game.player.z,
        dx: dx * (isPortalShot ? 30 : 50),
        dy: dy * (isPortalShot ? 30 : 50),
        dz: dz * (isPortalShot ? 30 : 50),
        color: isPortalShot ? (portalMode === 'orange' ? '#ff6600' : '#00aaff') : '#ffff00'
      });
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    // Touch controls
    let lastTouchX = 0, lastTouchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        game.player.yaw += dx * 0.005;
        game.player.pitch = Math.max(-1.2, Math.min(1.2, game.player.pitch - dy * 0.005));
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleClick);
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

    // 3D projection
    const project = (x: number, y: number, z: number) => {
      let rx = x - game.player.x;
      let ry = y - game.player.y;
      let rz = z - game.player.z;

      // Rotate by yaw
      const cosY = Math.cos(-game.player.yaw);
      const sinY = Math.sin(-game.player.yaw);
      const tx = rx * cosY - rz * sinY;
      const tz = rx * sinY + rz * cosY;
      rx = tx; rz = tz;

      // Rotate by pitch
      const cosP = Math.cos(game.player.pitch);
      const sinP = Math.sin(game.player.pitch);
      const ty = ry * cosP + rz * sinP;
      rz = -ry * sinP + rz * cosP;
      ry = ty;

      if (rz < 0.1) return null;

      const fov = 400;
      const scale = fov / rz;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      return { x: w/2 + rx * scale, y: h/2 - ry * scale, scale, z: rz };
    };

    // Draw functions
    const drawLine3D = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: string, width = 2) => {
      const p1 = project(x1, y1, z1);
      const p2 = project(x2, y2, z2);
      if (!p1 || !p2) return;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    const drawBox = (x: number, y: number, z: number, size: number, color: string) => {
      const s = size / 2;
      // Draw edges
      const edges = [
        [[-s,-s,-s], [s,-s,-s]], [[s,-s,-s], [s,-s,s]], [[s,-s,s], [-s,-s,s]], [[-s,-s,s], [-s,-s,-s]],
        [[-s,s,-s], [s,s,-s]], [[s,s,-s], [s,s,s]], [[s,s,s], [-s,s,s]], [[-s,s,s], [-s,s,-s]],
        [[-s,-s,-s], [-s,s,-s]], [[s,-s,-s], [s,s,-s]], [[s,-s,s], [s,s,s]], [[-s,-s,s], [-s,s,s]]
      ];
      edges.forEach(([[ax,ay,az], [bx,by,bz]]) => {
        drawLine3D(x+ax, y+ay, z+az, x+bx, y+by, z+bz, color, 3);
      });
    };

    const drawPortal = (portal: typeof game.portals.orange, color: string) => {
      if (!portal) return;
      const p = project(portal.x, 1.5, portal.z);
      if (!p || p.z < 0.5) return;

      const size = 80 * p.scale;
      
      // Outer ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 6 * p.scale;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, size * 0.6, size, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 0.8);
      gradient.addColorStop(0, color + '60');
      gradient.addColorStop(0.7, color + '20');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, size * 0.5, size * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Swirl
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const angle = Date.now() * 0.002 + i * Math.PI / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * (0.2 + i * 0.15), angle, angle + Math.PI * 0.7);
        ctx.stroke();
      }
    };

    // Game loop
    const gameLoop = () => {
      const dt = 1/60;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Clear with gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
      bgGradient.addColorStop(0, '#0a0a15');
      bgGradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // Player movement
      const speed = 4;
      let mx = 0, mz = 0;
      if (game.keys['KeyW']) mz = 1;
      if (game.keys['KeyS']) mz = -1;
      if (game.keys['KeyA']) mx = -1;
      if (game.keys['KeyD']) mx = 1;

      if (mx || mz) {
        const len = Math.sqrt(mx*mx + mz*mz);
        mx /= len; mz /= len;
        const cos = Math.cos(game.player.yaw);
        const sin = Math.sin(game.player.yaw);
        game.player.vx = (mx * cos + mz * sin) * speed;
        game.player.vz = (-mx * sin + mz * cos) * speed;
      } else {
        game.player.vx *= 0.85;
        game.player.vz *= 0.85;
      }

      // Jump
      if (game.keys['Space'] && game.player.onGround) {
        game.player.vy = 6;
        game.player.onGround = false;
      }
      game.player.vy -= 15 * dt;

      // Update position
      game.player.x += game.player.vx * dt;
      game.player.y += game.player.vy * dt;
      game.player.z += game.player.vz * dt;

      // Ground
      if (game.player.y < 1.7) {
        game.player.y = 1.7;
        game.player.vy = 0;
        game.player.onGround = true;
      }

      // Wall boundaries
      const size = 10 + currentLevel * 2;
      const limit = size/2 - 0.5;
      game.player.x = Math.max(-limit, Math.min(limit, game.player.x));
      game.player.z = Math.max(-limit, Math.min(limit, game.player.z));

      // Portal teleportation with momentum
      if (game.portals.orange && game.portals.blue) {
        const checkTeleport = (from: typeof game.portals.orange, to: typeof game.portals.blue) => {
          if (!from || !to) return;
          const dx = game.player.x - from.x;
          const dz = game.player.z - from.z;
          const dist = Math.sqrt(dx*dx + dz*dz);
          
          if (dist < 1.2) {
            // Teleport with momentum preserved
            const speed = Math.sqrt(game.player.vx**2 + game.player.vz**2);
            game.player.x = to.x;
            game.player.z = to.z;
            
            // Exit velocity based on exit portal orientation
            if (to.wall === 'north') { game.player.vz = speed; }
            else if (to.wall === 'south') { game.player.vz = -speed; }
            else if (to.wall === 'east') { game.player.vx = -speed; }
            else if (to.wall === 'west') { game.player.vx = speed; }
            
            // Move away from wall
            game.player.x += game.player.vx * 0.5;
            game.player.z += game.player.vz * 0.5;
            
            setScore(prev => prev + 25);
            showMessage('MOMENTUM TRANSFERRED', 1000);
          }
        };
        checkTeleport(game.portals.orange, game.portals.blue);
        checkTeleport(game.portals.blue, game.portals.orange);
      }

      // Update held cube position
      if (game.heldCube !== null) {
        const cube = game.cubes.find(c => c.id === game.heldCube);
        if (cube) {
          cube.x = game.player.x + Math.sin(game.player.yaw) * 1.5;
          cube.z = game.player.z + Math.cos(game.player.yaw) * 1.5;
          cube.y = 1.5;
        }
      }

      // Check buttons
      let allButtonsPressed = true;
      game.buttons.forEach((button, i) => {
        const cubeOnButton = game.cubes.some(cube => {
          if (cube.held) return false;
          const dx = cube.x - button.x;
          const dz = cube.z - button.z;
          return Math.sqrt(dx*dx + dz*dz) < 1;
        });
        
        if (cubeOnButton && !button.pressed) {
          button.pressed = true;
          const door = game.doors[button.targetDoor];
          if (door) door.open = true;
          showMessage('BUTTON ACTIVATED', 1500);
          setScore(prev => prev + 100);
        } else if (!cubeOnButton && button.pressed) {
          button.pressed = false;
          const door = game.doors[button.targetDoor];
          if (door) door.open = false;
        }
        
        if (!button.pressed) allButtonsPressed = false;
      });

      // Activate exit when all buttons pressed
      game.exit.active = allButtonsPressed && game.buttons.length > 0;

      // Check exit
      if (game.exit.active) {
        const dx = game.player.x - game.exit.x;
        const dz = game.player.z - game.exit.z;
        if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
          setScore(prev => prev + 500 + currentLevel * 100);
          setCurrentLevel(prev => prev + 1);
          generateLevel(currentLevel + 1);
          showMessage(`CHAMBER ${currentLevel} COMPLETE! +${500 + currentLevel * 100}`, 2000);
        }
      }

      // Update bullets
      game.bullets = game.bullets.filter(b => {
        b.x += b.dx * dt;
        b.y += b.dy * dt;
        b.z += b.dz * dt;

        // Check wall collision for portal shots
        if (b.color !== '#ffff00') {
          // North wall
          if (b.z > limit) {
            const portal = { x: b.x, y: b.y, z: limit, wall: 'north', active: true };
            if (b.color === '#ff6600') {
              game.portals.orange = portal;
              showMessage('ORANGE PORTAL', 1500);
            } else {
              game.portals.blue = portal;
              showMessage('BLUE PORTAL', 1500);
            }
            if (game.portals.orange && game.portals.blue) {
              showMessage('PORTALS LINKED!', 2000);
            }
            return false;
          }
          // South wall
          if (b.z < -limit) {
            const portal = { x: b.x, y: b.y, z: -limit, wall: 'south', active: true };
            if (b.color === '#ff6600') game.portals.orange = portal;
            else game.portals.blue = portal;
            showMessage(b.color === '#ff6600' ? 'ORANGE PORTAL' : 'BLUE PORTAL', 1500);
            return false;
          }
          // East wall
          if (b.x > limit) {
            const portal = { x: limit, y: b.y, z: b.z, wall: 'east', active: true };
            if (b.color === '#ff6600') game.portals.orange = portal;
            else game.portals.blue = portal;
            showMessage(b.color === '#ff6600' ? 'ORANGE PORTAL' : 'BLUE PORTAL', 1500);
            return false;
          }
          // West wall
          if (b.x < -limit) {
            const portal = { x: -limit, y: b.y, z: b.z, wall: 'west', active: true };
            if (b.color === '#ff6600') game.portals.orange = portal;
            else game.portals.blue = portal;
            showMessage(b.color === '#ff6600' ? 'ORANGE PORTAL' : 'BLUE PORTAL', 1500);
            return false;
          }
        }

        return b.y > 0 && b.y < 10;
      });

      // Draw floor grid
      ctx.strokeStyle = '#333355';
      ctx.lineWidth = 1;
      for (let x = -size/2; x <= size/2; x += 2) {
        drawLine3D(x, 0, -size/2, x, 0, size/2, '#333355', 1);
      }
      for (let z = -size/2; z <= size/2; z += 2) {
        drawLine3D(-size/2, 0, z, size/2, 0, z, '#333355', 1);
      }

      // Draw walls
      const wallH = 4;
      // North
      drawLine3D(-size/2, 0, size/2, size/2, 0, size/2, '#4444aa', 2);
      drawLine3D(-size/2, wallH, size/2, size/2, wallH, size/2, '#4444aa', 2);
      drawLine3D(-size/2, 0, size/2, -size/2, wallH, size/2, '#4444aa', 2);
      drawLine3D(size/2, 0, size/2, size/2, wallH, size/2, '#4444aa', 2);
      // South
      drawLine3D(-size/2, 0, -size/2, size/2, 0, -size/2, '#4444aa', 2);
      drawLine3D(-size/2, wallH, -size/2, size/2, wallH, -size/2, '#4444aa', 2);
      // East/West
      drawLine3D(size/2, 0, -size/2, size/2, 0, size/2, '#3333aa', 2);
      drawLine3D(size/2, wallH, -size/2, size/2, wallH, size/2, '#3333aa', 2);
      drawLine3D(-size/2, 0, -size/2, -size/2, 0, size/2, '#3333aa', 2);
      drawLine3D(-size/2, wallH, -size/2, -size/2, wallH, size/2, '#3333aa', 2);

      // Draw portals
      drawPortal(game.portals.orange, '#ff6600');
      drawPortal(game.portals.blue, '#00aaff');

      // Draw cubes
      game.cubes.forEach(cube => {
        if (!cube.held) {
          drawBox(cube.x, cube.y, cube.z, 0.8, '#ff66ff');
        }
      });

      // Draw buttons
      game.buttons.forEach(button => {
        const p = project(button.x, 0.1, button.z);
        if (p && p.z > 0.5) {
          const size = 40 * p.scale;
          ctx.fillStyle = button.pressed ? '#00ff00' : '#ff4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw doors
      game.doors.forEach(door => {
        if (!door.open) {
          drawLine3D(door.x - 2, 0, door.z, door.x + 2, 0, door.z, '#ff0000', 4);
          drawLine3D(door.x - 2, 3, door.z, door.x + 2, 3, door.z, '#ff0000', 4);
          drawLine3D(door.x - 2, 0, door.z, door.x - 2, 3, door.z, '#ff0000', 4);
          drawLine3D(door.x + 2, 0, door.z, door.x + 2, 3, door.z, '#ff0000', 4);
        }
      });

      // Draw exit
      if (game.exit.active) {
        const p = project(game.exit.x, 1.5, game.exit.z);
        if (p && p.z > 0.5) {
          const size = 60 * p.scale;
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.stroke();
          
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
          gradient.addColorStop(0, '#00ffff40');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      // Draw bullets
      game.bullets.forEach(b => {
        const p = project(b.x, b.y, b.z);
        if (p && p.z > 0.5) {
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 * p.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw held cube
      if (game.heldCube !== null) {
        ctx.fillStyle = '#ff66ff';
        ctx.fillRect(w/2 - 30, h - 100, 60, 60);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(w/2 - 30, h - 100, 60, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('HOLDING CUBE', w/2, h - 110);
      }

      // Crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w/2 - 15, h/2); ctx.lineTo(w/2 - 5, h/2);
      ctx.moveTo(w/2 + 5, h/2); ctx.lineTo(w/2 + 15, h/2);
      ctx.moveTo(w/2, h/2 - 15); ctx.lineTo(w/2, h/2 - 5);
      ctx.moveTo(w/2, h/2 + 5); ctx.lineTo(w/2, h/2 + 15);
      ctx.stroke();
      
      // Portal mode dot
      ctx.fillStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.beginPath();
      ctx.arc(w/2, h/2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Gun HUD
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(w - 130, h - 70, 110, 50);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(w - 50, h - 60, 30, 30);
      ctx.strokeStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w - 35, h - 45, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = portalMode === 'orange' ? '#ff6600' : '#00aaff';
      ctx.beginPath();
      ctx.arc(w - 35, h - 45, 6, 0, Math.PI * 2);
      ctx.fill();

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
    const g = gameRef.current; 
    g.keys = { KeyW: dir === 'up', KeyS: dir === 'down', KeyA: dir === 'left', KeyD: dir === 'right' }; 
  };
  const mobileStop = () => { gameRef.current.keys = {}; };
  const mobileJump = () => { 
    const g = gameRef.current;
    if (g.player.onGround) { g.player.vy = 6; g.player.onGround = false; }
  };
  const mobileShoot = (isPortal: boolean) => {
    const g = gameRef.current;
    const dx = Math.sin(g.player.yaw) * Math.cos(g.player.pitch);
    const dy = -Math.sin(g.player.pitch);
    const dz = Math.cos(g.player.yaw) * Math.cos(g.player.pitch);
    g.bullets.push({ x: g.player.x, y: g.player.y, z: g.player.z, dx: dx * 30, dy: dy * 30, dz: dz * 30, color: isPortal ? (portalMode === 'orange' ? '#ff6600' : '#00aaff') : '#ffff00' });
  };
  const mobilePickup = () => {
    const g = gameRef.current;
    if (g.heldCube !== null) {
      const cube = g.cubes.find(c => c.id === g.heldCube);
      if (cube) { cube.held = false; cube.x = g.player.x; cube.z = g.player.z; }
      g.heldCube = null;
    } else {
      const nearest = g.cubes.reduce((a, b) => {
        const da = Math.hypot(a.x - g.player.x, a.z - g.player.z);
        const db = Math.hypot(b.x - g.player.x, b.z - g.player.z);
        return da < db ? a : b;
      }, g.cubes[0]);
      if (nearest && Math.hypot(nearest.x - g.player.x, nearest.z - g.player.z) < 3) {
        nearest.held = true;
        g.heldCube = nearest.id;
      }
    }
  };

  // Instructions
  if (gameState === 'instructions') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-gray-900 via-slate-800 to-black flex items-center justify-center overflow-hidden">
        {/* Animated portals */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-40 h-60 border-4 border-orange-500 rounded-full animate-pulse" style={{ transform: 'translateX(-150px) rotateY(20deg)' }} />
          <div className="absolute w-40 h-60 border-4 border-blue-500 rounded-full animate-pulse" style={{ transform: 'translateX(150px) rotateY(-20deg)' }} />
          <div className="absolute w-32 h-32 bg-gradient-to-r from-orange-500/20 to-blue-500/20 rounded-full blur-xl animate-spin" style={{ animationDuration: '10s' }} />
        </div>

        <div className="relative z-10 bg-black/90 rounded-2xl p-8 max-w-lg mx-4 border border-cyan-500/30">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-white to-blue-400 bg-clip-text text-transparent mb-2">
              WORMHOLE
            </h1>
            <p className="text-cyan-400">Aperture Science Testing Initiative</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-orange-400 font-bold mb-2">🎮 CONTROLS</h3>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <div>WASD - Move</div>
                <div>Mouse - Look</div>
                <div>Left Click - (unused)</div>
                <div>Right Click - Portal</div>
                <div>Space - Jump</div>
                <div>Q - Switch Portal</div>
                <div>E - Pick Up/Drop Cube</div>
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-blue-400 font-bold mb-2">🌀 PORTAL PHYSICS</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Place <span className="text-orange-400">ORANGE</span> + <span className="text-blue-400">BLUE</span> portals on walls</li>
                <li>• Walk through one, exit the other</li>
                <li>• <span className="text-cyan-400">Momentum is preserved!</span></li>
              </ul>
            </div>

            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-pink-400 font-bold mb-2">📦 PUZZLE ELEMENTS</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Pick up <span className="text-pink-400">CUBES</span> with E</li>
                <li>• Place cubes on <span className="text-red-400">BUTTONS</span> to open doors</li>
                <li>• Reach the <span className="text-cyan-400">EXIT</span> to complete level</li>
              </ul>
            </div>

            <div className="bg-gray-800/80 rounded-lg p-4">
              <h3 className="text-green-400 font-bold mb-2">📊 SCORING</h3>
              <div className="text-gray-300 grid grid-cols-2 gap-1">
                <div>Teleport: +25</div>
                <div>Button: +100</div>
                <div>Level Complete: +500+</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full mt-6 py-4 bg-gradient-to-r from-orange-600 to-blue-600 text-white font-bold rounded-xl text-xl hover:from-orange-500 hover:to-blue-500 transition-all"
          >
            BEGIN TESTING
          </button>
        </div>
      </div>
    );
  }

  // Game Over
  if (gameState === 'gameover') {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-gradient-to-br from-red-900/20 via-gray-900 to-black flex items-center justify-center">
        <div className="bg-black/90 rounded-2xl p-8 max-w-md mx-4 border border-red-500/50 text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-6">TEST FAILED</h1>
          
          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-4xl font-bold text-yellow-400">{score.toLocaleString()}</div>
              <div className="text-gray-400">Final Score</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-cyan-400">Chamber {currentLevel}</div>
              <div className="text-gray-400">Reached</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setScore(0);
                setCurrentLevel(1);
                setTimeLeft(180);
                setGameState('playing');
              }}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"
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

  // Playing
  return (
    <div className="relative w-full h-full min-h-[600px] bg-black">
      <canvas ref={canvasRef} className="w-full h-full" style={{ touchAction: 'none' }} />

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/70 rounded-lg px-4 py-2 backdrop-blur-sm">
          <div className="text-cyan-400 text-sm font-bold">CHAMBER {currentLevel}</div>
        </div>
        <div className="text-center">
          <div className="bg-black/70 rounded-lg px-6 py-2 backdrop-blur-sm">
            <div className="text-yellow-400 text-2xl font-bold">{score.toLocaleString()}</div>
          </div>
          <div className={`bg-black/70 rounded-lg px-4 py-1 mt-2 backdrop-blur-sm ${timeLeft < 30 ? 'animate-pulse' : ''}`}>
            <div className={`text-xl font-bold ${timeLeft < 30 ? 'text-red-400' : 'text-white'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        <button
          onClick={() => setPortalMode(p => p === 'orange' ? 'blue' : 'orange')}
          className={`pointer-events-auto px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
            portalMode === 'orange' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {portalMode.toUpperCase()} [Q]
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 rounded-xl border border-cyan-500/50 text-cyan-400 text-xl font-bold animate-pulse">
          {message}
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none text-center">
        {!isMobile ? 'Click to lock mouse • Right-click = Portal • Q = Switch • E = Pick up cube' : 'Swipe to look • Use buttons below'}
      </div>

      {/* Mobile Controls */}
      {isMobile && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1">
            <div />
            <button className="w-12 h-12 bg-white/20 rounded-lg text-xl active:bg-white/40" onTouchStart={() => mobileMove('up')} onTouchEnd={mobileStop}>▲</button>
            <div />
            <button className="w-12 h-12 bg-white/20 rounded-lg text-xl active:bg-white/40" onTouchStart={() => mobileMove('left')} onTouchEnd={mobileStop}>◀</button>
            <button className="w-12 h-12 bg-white/20 rounded-lg text-sm active:bg-white/40" onTouchStart={mobileJump}>JUMP</button>
            <button className="w-12 h-12 bg-white/20 rounded-lg text-xl active:bg-white/40" onTouchStart={() => mobileMove('right')} onTouchEnd={mobileStop}>▶</button>
            <div />
            <button className="w-12 h-12 bg-white/20 rounded-lg text-xl active:bg-white/40" onTouchStart={() => mobileMove('down')} onTouchEnd={mobileStop}>▼</button>
            <div />
          </div>
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button className={`w-14 h-14 rounded-full text-xl active:opacity-80 ${portalMode === 'orange' ? 'bg-orange-500/60' : 'bg-blue-500/60'}`} onTouchStart={() => mobileShoot(true)}>🌀</button>
            <button className="w-14 h-14 bg-pink-500/60 rounded-full text-xl active:opacity-80" onTouchStart={mobilePickup}>📦</button>
          </div>
        </>
      )}
    </div>
  );
}

}
