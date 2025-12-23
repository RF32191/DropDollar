'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WormholeGameProps {
  onGameEnd?: (score: number) => void;
  isCompetitive?: boolean;
}

interface Enemy {
  x: number;
  y: number;
  z: number;
  hp: number;
  state: 'idle' | 'winding' | 'attacking';
  attackTimer: number;
  windupTime: number;
  hitCount: number;
}

interface Platform {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
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
  const [hearts, setHearts] = useState(3);

  const gameRef = useRef({
    player: { x: 0, y: 0, z: 0, vy: 0, angle: 0, pitch: 0, onGround: true },
    portals: {
      green: null as { x: number; y: number; z: number; wall: string } | null,
      red: null as { x: number; y: number; z: number; wall: string } | null
    },
    enemies: [] as Enemy[],
    platforms: [] as Platform[],
    keys: {} as Record<string, boolean>,
    mapSize: 24,
    mapHeight: 16, // 4 floors x 4 units each
    lastTeleport: 0,
    projectiles: [] as { x: number; y: number; z: number; dx: number; dy: number; dz: number; color: string }[],
    swordSwing: 0,
    swordState: 'idle' as 'idle' | 'swinging' | 'parrying' | 'striking',
    parryWindow: 0,
    strikeWindow: 0,
    floatingScores: [] as { x: number; y: number; text: string; color: string; life: number }[],
  });

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const addFloatingScore = useCallback((x: number, y: number, text: string, color: string) => {
    gameRef.current.floatingScores.push({ x, y, text, color, life: 60 });
  }, []);

  const initLevel = useCallback((level: number) => {
    const g = gameRef.current;
    g.mapSize = 24;
    g.mapHeight = 16;
    g.player = { x: 0, y: 0, z: -g.mapSize / 2 + 4, vy: 0, angle: 0, pitch: 0, onGround: true };
    g.portals = { green: null, red: null };
    g.projectiles = [];
    g.enemies = [];
    g.platforms = [];
    g.floatingScores = [];
    
    // Create 4-story platforms
    const floors = [0, 4, 8, 12];
    floors.forEach((floorY, floorIndex) => {
      // Main floor platforms
      if (floorIndex === 0) {
        // Ground floor - full floor
        g.platforms.push({ x: 0, y: 0, z: 0, width: g.mapSize, depth: g.mapSize });
      } else {
        // Upper floors - partial platforms with gaps for jumping/portals
        g.platforms.push({ x: -8, y: floorY, z: -8, width: 8, depth: 8 });
        g.platforms.push({ x: 4, y: floorY, z: -8, width: 8, depth: 8 });
        g.platforms.push({ x: -8, y: floorY, z: 4, width: 8, depth: 8 });
        g.platforms.push({ x: 4, y: floorY, z: 4, width: 8, depth: 8 });
      }
      
      // Stair blocks to climb between floors (except top floor)
      if (floorIndex < floors.length - 1) {
        for (let step = 0; step < 4; step++) {
          g.platforms.push({ 
            x: -10 + step * 1.5, 
            y: floorY + step + 1, 
            z: -2, 
            width: 1.5, 
            depth: 4 
          });
        }
      }
    });
    
    // Spawn enemies on different floors
    for (let i = 0; i < level + 2; i++) {
      const floor = Math.floor(Math.random() * 4);
      const floorY = floors[floor];
      g.enemies.push({
        x: (Math.random() - 0.5) * (g.mapSize - 8),
        y: floorY + 1.5,
        z: (Math.random() - 0.5) * (g.mapSize - 8),
        hp: 3,
        state: 'idle',
        attackTimer: 60 + Math.random() * 120,
        windupTime: 0,
        hitCount: 0
      });
    }
    
    setHearts(3);
    showMessage(`FLOOR ${level}`);
  }, [showMessage]);

  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const g = gameRef.current;

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
      // Arrow Up = Parry
      if (e.code === 'ArrowUp' && g.swordState === 'idle') {
        g.swordState = 'parrying';
        g.parryWindow = 20;
        g.swordSwing = 1;
      }
      // Arrow Right = Strike
      if (e.code === 'ArrowRight' && g.swordState === 'idle') {
        g.swordState = 'striking';
        g.strikeWindow = 15;
        g.swordSwing = 1;
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
      const dx = Math.sin(g.player.angle) * Math.cos(g.player.pitch);
      const dy = -Math.sin(g.player.pitch);
      const dz = Math.cos(g.player.angle) * Math.cos(g.player.pitch);
      g.projectiles.push({
        x: g.player.x, y: g.player.y + 1.5, z: g.player.z,
        dx: dx * 1.2, dy: dy * 1.2, dz: dz * 1.2,
        color: portalMode
      });
      g.swordSwing = 1;
      g.swordState = 'swinging';
      setTimeout(() => { if (g.swordState === 'swinging') g.swordState = 'idle'; }, 300);
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

    // Raycasting
    const castRay = (angle: number, startY: number, maxDist: number) => {
      const limit = g.mapSize / 2;
      let x = g.player.x, y = startY, z = g.player.z;
      const dx = Math.sin(angle) * 0.2;
      const dz = Math.cos(angle) * 0.2;
      let dist = 0;
      let hitWall: string | null = null;
      let hitY = 0;
      
      while (dist < maxDist) {
        x += dx; z += dz; dist += 0.2;
        
        // Check outer walls
        if (z >= limit) { hitWall = 'N'; hitY = y; break; }
        if (z <= -limit) { hitWall = 'S'; hitY = y; break; }
        if (x >= limit) { hitWall = 'E'; hitY = y; break; }
        if (x <= -limit) { hitWall = 'W'; hitY = y; break; }
        
        // Check platform edges as walls
        for (const p of g.platforms) {
          if (y > p.y && y < p.y + 0.5) continue; // On this platform
          if (x >= p.x && x <= p.x + p.width && z >= p.z && z <= p.z + p.depth) {
            if (y < p.y + 4 && y > p.y) {
              hitWall = 'platform';
              hitY = p.y + 4;
              break;
            }
          }
        }
        if (hitWall) break;
      }
      return { dist, wall: hitWall, x, z, hitY };
    };

    // Game loop
    const gameLoop = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - lastFrameTime.current) / 1000, 0.05);
      lastFrameTime.current = timestamp;

      const w = canvas.width, h = canvas.height;
      const limit = g.mapSize / 2 - 0.5;

      // Update sword states
      if (g.swordSwing > 0) g.swordSwing = Math.max(0, g.swordSwing - 0.1);
      if (g.parryWindow > 0) {
        g.parryWindow--;
        if (g.parryWindow === 0) g.swordState = 'idle';
      }
      if (g.strikeWindow > 0) {
        g.strikeWindow--;
        if (g.strikeWindow === 0) g.swordState = 'idle';
      }

      // Player movement
      let moveX = 0, moveZ = 0;
      const moveSpeed = 8 * deltaTime;
      if (g.keys['KeyW']) { moveX += Math.sin(g.player.angle) * moveSpeed; moveZ += Math.cos(g.player.angle) * moveSpeed; }
      if (g.keys['KeyS']) { moveX -= Math.sin(g.player.angle) * moveSpeed; moveZ -= Math.cos(g.player.angle) * moveSpeed; }
      if (g.keys['KeyA']) { moveX -= Math.cos(g.player.angle) * moveSpeed; moveZ += Math.sin(g.player.angle) * moveSpeed; }
      if (g.keys['KeyD']) { moveX += Math.cos(g.player.angle) * moveSpeed; moveZ -= Math.sin(g.player.angle) * moveSpeed; }

      g.player.x = Math.max(-limit, Math.min(limit, g.player.x + moveX));
      g.player.z = Math.max(-limit, Math.min(limit, g.player.z + moveZ));

      // Gravity and jumping
      if (g.keys['Space'] && g.player.onGround) {
        g.player.vy = 12;
        g.player.onGround = false;
      }
      g.player.vy -= 25 * deltaTime;
      g.player.y += g.player.vy * deltaTime;

      // Platform collision
      g.player.onGround = false;
      for (const p of g.platforms) {
        if (g.player.x >= p.x - 0.5 && g.player.x <= p.x + p.width + 0.5 &&
            g.player.z >= p.z - 0.5 && g.player.z <= p.z + p.depth + 0.5) {
          if (g.player.y <= p.y + 0.1 && g.player.y >= p.y - 1 && g.player.vy <= 0) {
            g.player.y = p.y;
            g.player.vy = 0;
            g.player.onGround = true;
            break;
          }
        }
      }
      if (g.player.y < 0) { g.player.y = 0; g.player.vy = 0; g.player.onGround = true; }

      // Portal teleportation
      const now = Date.now();
      if (g.portals.green && g.portals.red && now - g.lastTeleport > 800) {
        const checkTeleport = (from: typeof g.portals.green, to: typeof g.portals.green) => {
          if (!from || !to) return false;
          const dist = Math.hypot(g.player.x - from.x, g.player.z - from.z);
          const yDist = Math.abs(g.player.y - from.y);
          if (dist < 2 && yDist < 3) {
            // Teleport to other portal
            g.player.x = to.x;
            g.player.y = to.y;
            g.player.z = to.z;
            // Push away from wall
            if (to.wall === 'N') g.player.z -= 2;
            if (to.wall === 'S') g.player.z += 2;
            if (to.wall === 'E') g.player.x -= 2;
            if (to.wall === 'W') g.player.x += 2;
            g.lastTeleport = now;
            setScore(s => s + 50);
            addFloatingScore(w/2, h/2, '+50', '#00ffff');
            showMessage('TELEPORT!');
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
        p.x += p.dx; p.y += p.dy; p.z += p.dz;
        const lim = g.mapSize / 2;
        
        // Hit walls - create portal
        const createPortal = (x: number, y: number, z: number, wall: string) => {
          if (p.color === 'green') {
            g.portals.green = { x, y: Math.max(0, y), z, wall };
            showMessage('GREEN PORTAL');
          } else {
            g.portals.red = { x, y: Math.max(0, y), z, wall };
            showMessage('RED PORTAL');
          }
          if (g.portals.green && g.portals.red) showMessage('PORTALS LINKED!');
        };
        
        if (p.z >= lim) { createPortal(p.x, p.y, lim, 'N'); return false; }
        if (p.z <= -lim) { createPortal(p.x, p.y, -lim, 'S'); return false; }
        if (p.x >= lim) { createPortal(lim, p.y, p.z, 'E'); return false; }
        if (p.x <= -lim) { createPortal(-lim, p.y, p.z, 'W'); return false; }
        if (p.y <= 0) { createPortal(p.x, 0, p.z, 'floor'); return false; }
        if (p.y >= g.mapHeight) { createPortal(p.x, g.mapHeight, p.z, 'ceiling'); return false; }
        
        return true;
      });

      // Update enemies (Parry Pro style)
      g.enemies = g.enemies.filter(enemy => {
        const distToPlayer = Math.hypot(enemy.x - g.player.x, enemy.z - g.player.z);
        const yDist = Math.abs(enemy.y - g.player.y - 1.5);
        
        // Enemy AI
        if (distToPlayer < 15 && yDist < 5) {
          enemy.attackTimer--;
          
          if (enemy.state === 'idle' && enemy.attackTimer <= 0) {
            enemy.state = 'winding';
            enemy.windupTime = 40; // Wind up before attack
          }
          
          if (enemy.state === 'winding') {
            enemy.windupTime--;
            if (enemy.windupTime <= 0) {
              enemy.state = 'attacking';
              enemy.attackTimer = 30;
            }
          }
          
          if (enemy.state === 'attacking') {
            if (distToPlayer < 4 && yDist < 3) {
              // Check for parry
              if (g.swordState === 'parrying') {
                setScore(s => s + 500);
                addFloatingScore(w/2, h/3, '+500 PARRY!', '#00ff00');
                enemy.state = 'idle';
                enemy.attackTimer = 90;
              } else {
                // Player hit
                setHearts(h => {
                  const newHearts = h - 1;
                  if (newHearts <= 0) setGameState('gameover');
                  return newHearts;
                });
                addFloatingScore(w/2, h/3, '-1 ❤️', '#ff0000');
                enemy.state = 'idle';
                enemy.attackTimer = 120;
              }
            }
            enemy.attackTimer--;
            if (enemy.attackTimer <= 0) {
              enemy.state = 'idle';
              enemy.attackTimer = 60 + Math.random() * 60;
            }
          }
        }
        
        // Check for player strike
        if (g.swordState === 'striking' && distToPlayer < 5 && yDist < 3) {
          enemy.hitCount++;
          setScore(s => s + 50);
          addFloatingScore(w/2, h/3, '+50', '#ffff00');
          
          if (enemy.hitCount >= 3) {
            setScore(s => s + 200);
            addFloatingScore(w/2, h/3, '+200 KILL!', '#ff00ff');
            setHearts(h => Math.min(3, h + 1));
            return false; // Remove enemy
          }
          g.swordState = 'idle'; // Reset after hit
        }
        
        return true;
      });

      // Spawn new enemies if needed
      if (g.enemies.length < currentLevel + 1) {
        const floors = [0, 4, 8, 12];
        const floor = floors[Math.floor(Math.random() * 4)];
        g.enemies.push({
          x: (Math.random() - 0.5) * (g.mapSize - 8),
          y: floor + 1.5,
          z: (Math.random() - 0.5) * (g.mapSize - 8),
          hp: 3,
          state: 'idle',
          attackTimer: 60 + Math.random() * 120,
          windupTime: 0,
          hitCount: 0
        });
      }

      // Update floating scores
      g.floatingScores = g.floatingScores.filter(f => {
        f.y -= 1;
        f.life--;
        return f.life > 0;
      });

      // === RENDER ===
      
      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h / 2);
      skyGrad.addColorStop(0, '#000022');
      skyGrad.addColorStop(1, '#001144');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h / 2);

      // Floor
      const floorGrad = ctx.createLinearGradient(0, h / 2, 0, h);
      floorGrad.addColorStop(0, '#112233');
      floorGrad.addColorStop(1, '#223344');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h / 2, w, h / 2);

      // Raycast walls
      const numRays = Math.min(w, 320);
      const fov = Math.PI / 3;
      
      for (let i = 0; i < numRays; i++) {
        const rayAngle = g.player.angle - fov / 2 + (i / numRays) * fov;
        const hit = castRay(rayAngle, g.player.y + 1.5, 40);
        
        if (hit.wall) {
          const correctedDist = hit.dist * Math.cos(rayAngle - g.player.angle);
          const wallHeight = Math.min(h * 2, (h * 4) / (correctedDist + 0.1));
          const wallTop = (h - wallHeight) / 2 + g.player.pitch * 200;
          
          // Wall color by direction and floor
          const floorLevel = Math.floor(hit.hitY / 4);
          const brightness = Math.max(30, 200 - correctedDist * 6);
          const floorColors = ['#4466aa', '#44aa66', '#aa6644', '#aa44aa'];
          const baseColor = floorColors[floorLevel % 4] || '#4466aa';
          
          let r = parseInt(baseColor.slice(1, 3), 16) * (brightness / 200);
          let gr = parseInt(baseColor.slice(3, 5), 16) * (brightness / 200);
          let b = parseInt(baseColor.slice(5, 7), 16) * (brightness / 200);
          
          ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(gr)}, ${Math.floor(b)})`;
          const sliceWidth = Math.ceil(w / numRays) + 1;
          ctx.fillRect(i * (w / numRays), wallTop, sliceWidth, wallHeight);

          // Portal overlays
          const checkPortal = (portal: typeof g.portals.green, color: string) => {
            if (!portal || hit.wall !== portal.wall) return;
            const portalDist = hit.wall === 'N' || hit.wall === 'S' 
              ? Math.abs(hit.x - portal.x) 
              : Math.abs(hit.z - portal.z);
            const yDist = Math.abs(g.player.y + 1.5 - portal.y);
            if (portalDist < 2 && yDist < 4) {
              ctx.fillStyle = color;
              ctx.fillRect(i * (w / numRays), wallTop + wallHeight * 0.1, sliceWidth, wallHeight * 0.8);
            }
          };
          checkPortal(g.portals.green, '#00ff4488');
          checkPortal(g.portals.red, '#ff224488');
        }
      }

      // Draw enemies in 3D
      g.enemies.forEach(enemy => {
        const dx = enemy.x - g.player.x;
        const dz = enemy.z - g.player.z;
        const dist = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);
        const relAngle = angle - g.player.angle;
        
        if (Math.abs(relAngle) < fov / 2 && dist < 30 && dist > 0.5) {
          const screenX = w / 2 + Math.tan(relAngle) * w;
          const size = Math.min(300, 1200 / dist);
          const yOffset = (enemy.y - g.player.y - 1.5) * 100 / dist;
          const screenY = h / 2 - yOffset + g.player.pitch * 200;
          
          // Enemy body
          ctx.fillStyle = enemy.state === 'attacking' ? '#ff0000' : 
                          enemy.state === 'winding' ? '#ffaa00' : '#880088';
          ctx.beginPath();
          ctx.arc(screenX, screenY, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          
          // Enemy eye
          ctx.fillStyle = '#ff0000';
          ctx.beginPath();
          ctx.arc(screenX, screenY - size * 0.1, size * 0.25, 0, Math.PI * 2);
          ctx.fill();
          
          // Sword (when attacking)
          if (enemy.state === 'winding' || enemy.state === 'attacking') {
            ctx.strokeStyle = enemy.state === 'attacking' ? '#ff0000' : '#ffaa00';
            ctx.lineWidth = size * 0.1;
            ctx.beginPath();
            ctx.moveTo(screenX + size * 0.3, screenY);
            const swordAngle = enemy.state === 'attacking' ? -0.5 : 0.5;
            ctx.lineTo(screenX + size * 0.3 + Math.cos(swordAngle) * size, screenY + Math.sin(swordAngle) * size);
            ctx.stroke();
          }
          
          // Health bar
          ctx.fillStyle = '#333';
          ctx.fillRect(screenX - size * 0.5, screenY - size - 10, size, 8);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(screenX - size * 0.5, screenY - size - 10, size * ((3 - enemy.hitCount) / 3), 8);
        }
      });

      // Draw platforms on minimap
      const mapSize = 100;
      const mapX = w - mapSize - 20;
      const mapY = 20;
      const mapScale = mapSize / g.mapSize;
      
      ctx.fillStyle = '#00000088';
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
      ctx.strokeStyle = '#4466aa';
      ctx.lineWidth = 2;
      ctx.strokeRect(mapX, mapY, mapSize, mapSize);
      
      // Player on map
      const playerMapX = mapX + mapSize / 2 + g.player.x * mapScale;
      const playerMapY = mapY + mapSize / 2 - g.player.z * mapScale;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(playerMapX, playerMapY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Direction indicator
      ctx.strokeStyle = '#00ffff';
      ctx.beginPath();
      ctx.moveTo(playerMapX, playerMapY);
      ctx.lineTo(playerMapX + Math.sin(g.player.angle) * 10, playerMapY - Math.cos(g.player.angle) * 10);
      ctx.stroke();
      
      // Portals on map
      if (g.portals.green) {
        ctx.fillStyle = '#00ff44';
        ctx.fillRect(mapX + mapSize / 2 + g.portals.green.x * mapScale - 4, mapY + mapSize / 2 - g.portals.green.z * mapScale - 4, 8, 8);
      }
      if (g.portals.red) {
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(mapX + mapSize / 2 + g.portals.red.x * mapScale - 4, mapY + mapSize / 2 - g.portals.red.z * mapScale - 4, 8, 8);
      }
      
      // Floor indicator
      const currentFloor = Math.floor(g.player.y / 4) + 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`F${currentFloor}`, mapX + mapSize / 2, mapY + mapSize + 15);

      // Draw sword (first person)
      const drawSword = () => {
        const baseX = w * 0.7, baseY = h * 0.85;
        const swingOffset = Math.sin(g.swordSwing * Math.PI) * 80;
        const swingRotate = Math.sin(g.swordSwing * Math.PI) * 1;
        
        ctx.save();
        ctx.translate(baseX + swingOffset * 0.5, baseY - swingOffset);
        ctx.rotate(-0.3 + swingRotate);
        
        // Glow based on state
        let glowColor = portalMode === 'green' ? '#00ff44' : '#ff2244';
        if (g.swordState === 'parrying') glowColor = '#00ffff';
        if (g.swordState === 'striking') glowColor = '#ffff00';
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 30;
        
        // Handle
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(-12, 60, 24, 80);
        
        // Guard
        const guardGrad = ctx.createLinearGradient(-40, 55, 40, 65);
        guardGrad.addColorStop(0, '#8B7500');
        guardGrad.addColorStop(0.5, '#FFD700');
        guardGrad.addColorStop(1, '#8B7500');
        ctx.fillStyle = guardGrad;
        ctx.fillRect(-40, 50, 80, 15);
        
        // Blade
        const bladeGrad = ctx.createLinearGradient(0, -160, 0, 50);
        bladeGrad.addColorStop(0, glowColor);
        bladeGrad.addColorStop(0.4, '#ffffff');
        bladeGrad.addColorStop(1, '#aaaaaa');
        ctx.fillStyle = bladeGrad;
        
        ctx.beginPath();
        ctx.moveTo(0, -160);
        ctx.lineTo(-20, 50);
        ctx.lineTo(20, 50);
        ctx.closePath();
        ctx.fill();
        
        // Blade glow edge
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -160);
        ctx.lineTo(-20, 50);
        ctx.moveTo(0, -160);
        ctx.lineTo(20, 50);
        ctx.stroke();
        
        // Center line
        ctx.strokeStyle = glowColor + '88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -150);
        ctx.lineTo(0, 40);
        ctx.stroke();
        
        // Slash effect
        if (g.swordSwing > 0.1) {
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 6;
          ctx.globalAlpha = g.swordSwing;
          ctx.beginPath();
          ctx.arc(-80, -30, 180, -0.4, 0.4);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
      };
      
      drawSword();

      // Crosshair
      const crossColor = portalMode === 'green' ? '#00ff44' : '#ff2244';
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 20, h / 2); ctx.lineTo(w / 2 - 5, h / 2);
      ctx.moveTo(w / 2 + 5, h / 2); ctx.lineTo(w / 2 + 20, h / 2);
      ctx.moveTo(w / 2, h / 2 - 20); ctx.lineTo(w / 2, h / 2 - 5);
      ctx.moveTo(w / 2, h / 2 + 5); ctx.lineTo(w / 2, h / 2 + 20);
      ctx.stroke();

      // Parry indicator
      if (g.swordState === 'parrying') {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Floating scores
      g.floatingScores.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = f.life / 60;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      });

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
  }, [gameState, currentLevel, portalMode, initLevel, showMessage, addFloatingScore]);

  // Mobile controls
  const mobileMove = (dir: string) => {
    const g = gameRef.current;
    g.keys = { KeyW: dir === 'up', KeyS: dir === 'down', KeyA: dir === 'left', KeyD: dir === 'right', Space: dir === 'jump' };
  };
  const mobileStop = () => { gameRef.current.keys = {}; };
  const mobileShoot = () => {
    const g = gameRef.current;
    const dx = Math.sin(g.player.angle) * Math.cos(g.player.pitch);
    const dy = -Math.sin(g.player.pitch);
    const dz = Math.cos(g.player.angle) * Math.cos(g.player.pitch);
    g.projectiles.push({ x: g.player.x, y: g.player.y + 1.5, z: g.player.z, dx: dx * 1.2, dy: dy * 1.2, dz: dz * 1.2, color: portalMode });
    g.swordSwing = 1;
  };
  const mobileParry = () => {
    const g = gameRef.current;
    if (g.swordState === 'idle') {
      g.swordState = 'parrying';
      g.parryWindow = 20;
      g.swordSwing = 1;
    }
  };
  const mobileStrike = () => {
    const g = gameRef.current;
    if (g.swordState === 'idle') {
      g.swordState = 'striking';
      g.strikeWindow = 15;
      g.swordSwing = 1;
    }
  };

  if (gameState === 'instructions') {
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h1 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent">
            WORMHOLE
          </h1>

          <div className="space-y-3 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-green-400 font-bold mb-2">MOVEMENT</h3>
              <div className="grid grid-cols-2 gap-1 text-gray-300">
                <span>WASD</span><span>Move</span>
                <span>Mouse</span><span>Look</span>
                <span>Space</span><span>Jump</span>
                <span>Click</span><span>Shoot Portal</span>
                <span>Q</span><span>Switch Portal</span>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-yellow-400 font-bold mb-2">COMBAT (Arrow Keys)</h3>
              <div className="grid grid-cols-2 gap-1 text-gray-300">
                <span>↑ Arrow Up</span><span>Parry (+500)</span>
                <span>→ Arrow Right</span><span>Strike (+50)</span>
                <span>3 Hits</span><span>Kill Enemy (+200)</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-cyan-400 font-bold mb-2">PORTALS</h3>
              <p className="text-gray-300">
                Shoot <span className="text-green-400">GREEN</span> and <span className="text-red-400">RED</span> on any wall. Walk into green to exit from red, and vice versa!
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3">
              <h3 className="text-purple-400 font-bold mb-2">4 FLOORS</h3>
              <p className="text-gray-300">
                Jump on stairs to climb up. Use portals to teleport between floors!
              </p>
            </div>
          </div>

          <button
            onClick={() => setGameState('playing')}
            className="w-full mt-4 py-4 bg-gradient-to-r from-green-600 to-red-600 hover:from-green-500 hover:to-red-500 text-white font-bold rounded-xl text-xl"
          >
            START
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
          <div className="flex gap-4">
            <button onClick={() => { setScore(0); setCurrentLevel(1); setTimeLeft(120); setHearts(3); setGameState('playing'); }} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl">RETRY</button>
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
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/70 rounded-lg px-4 py-2">
          <div className="text-cyan-400 font-bold">Level {currentLevel}</div>
          <div className="text-red-400 text-xl">{'❤️'.repeat(hearts)}</div>
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
        <button onClick={() => setPortalMode(p => p === 'green' ? 'red' : 'green')} className={`px-4 py-2 rounded-lg font-bold ${portalMode === 'green' ? 'bg-green-600' : 'bg-red-600'}`}>
          {portalMode.toUpperCase()} [Q]
        </button>
      </div>

      {message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/80 rounded-xl text-white text-xl font-bold z-20 animate-pulse">
          {message}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs z-10">
        {!isMobile && 'WASD=Move • Space=Jump • Click=Portal • ↑=Parry • →=Strike'}
      </div>

      {/* Mobile Controls */}
      {isMobile && (
        <>
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-1 z-20">
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('up')} onTouchEnd={mobileStop}>▲</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('left')} onTouchEnd={mobileStop}>◀</button>
            <button className="w-14 h-14 bg-cyan-500/50 rounded-lg text-sm active:bg-cyan-500/70" onTouchStart={() => mobileMove('jump')} onTouchEnd={mobileStop}>JUMP</button>
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('right')} onTouchEnd={mobileStop}>▶</button>
            <div />
            <button className="w-14 h-14 bg-white/30 rounded-lg text-2xl active:bg-white/50" onTouchStart={() => mobileMove('down')} onTouchEnd={mobileStop}>▼</button>
            <div />
          </div>
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
            <button className={`w-16 h-16 rounded-full text-2xl ${portalMode === 'green' ? 'bg-green-500/70' : 'bg-red-500/70'}`} onTouchStart={mobileShoot}>🌀</button>
            <button className="w-16 h-16 bg-cyan-500/70 rounded-full text-2xl" onTouchStart={mobileParry}>🛡️</button>
            <button className="w-16 h-16 bg-yellow-500/70 rounded-full text-2xl" onTouchStart={mobileStrike}>⚔️</button>
          </div>
        </>
      )}
    </div>
  );
}
