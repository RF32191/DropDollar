'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const gameStateRef = useRef<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  
  const playerRef = useRef({
    position: new THREE.Vector3(0, 2, 5),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: true
  });
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const isMouseDownRef = useRef(false);
  const isPointerLockedRef = useRef(false);
  const swordRef = useRef<THREE.Group | null>(null);
  const isAttackingRef = useRef(false);
  const isParryingRef = useRef(false);
  const attackCooldownRef = useRef(0);
  const parryCooldownRef = useRef(0);
  const targetsRef = useRef<THREE.Mesh[]>([]);
  const enemiesRef = useRef<any[]>([]);
  const portalsRef = useRef<{ green: any; cyan: any }>({ green: null, cyan: null });
  const portalModeRef = useRef<'green' | 'cyan'>('green');
  const scoreRef = useRef(0);
  const healthRef = useRef(3);
  const timeRef = useRef(120); // 2 minutes
  const currentRoomRef = useRef(1);
  const transitionTriggeredRef = useRef<Set<number>>(new Set());
  const targetsCollectedRef = useRef(0);
  const gameStartTimeRef = useRef(0);
  
  const [gameState, setGameState] = useState<'loading' | 'instructions' | 'playing' | 'gameover'>('loading');
  const [score, setScore] = useState(0);
  const [portalMode, setPortalMode] = useState<'green' | 'cyan'>('green');
  const [message, setMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [targetsCollected, setTargetsCollected] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [playerHealth, setPlayerHealth] = useState(3);
  const [enemiesKilled, setEnemiesKilled] = useState(0);
  const [currentRoom, setCurrentRoom] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionRoom, setTransitionRoom] = useState(1);
  const [completionTime, setCompletionTime] = useState(0);
  
  // Sync refs with state
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { portalModeRef.current = portalMode; }, [portalMode]);
  useEffect(() => { healthRef.current = playerHealth; }, [playerHealth]);
  useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);
  useEffect(() => { targetsCollectedRef.current = targetsCollected; }, [targetsCollected]);
  useEffect(() => { setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0); }, []);

  // Shoot portal function
  const shootPortal = useCallback(() => {
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;
    
    // Sword slash animation
    if (swordRef.current) {
      swordRef.current.rotation.z += 0.6;
      setTimeout(() => { if (swordRef.current) swordRef.current.rotation.z -= 0.6; }, 180);
    }
    
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = ray.intersectObjects(scene.children, true);
    
    for (const hit of hits) {
      if (hit.object.userData.portalable && hit.face) {
        const mode = portalModeRef.current;
        const old = portalsRef.current[mode];
        if (old?.mesh) scene.remove(old.mesh);
        
        const color = mode === 'green' ? 0x00ff88 : 0x00ffff;
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
        
        portalsRef.current[mode] = { mesh: portal, position: hit.point.clone(), normal: hit.face.normal.clone() };
        setMessage(`${mode.toUpperCase()} PORTAL!`);
        setTimeout(() => setMessage(''), 1000);
        
        if (portalsRef.current.green && portalsRef.current.cyan) {
          setScore(s => s + 50);
          setMessage('PORTALS LINKED! +50');
          setTimeout(() => setMessage(''), 1000);
        }
        break;
      }
    }
  }, []);

  // Attack function (V key)
  const performAttack = useCallback(() => {
    if (isAttackingRef.current || attackCooldownRef.current > 0) return;
    
    isAttackingRef.current = true;
    attackCooldownRef.current = 0.5; // 0.5 second cooldown
    
    // Sword attack animation
    if (swordRef.current) {
      swordRef.current.rotation.x -= 0.8;
      setTimeout(() => { if (swordRef.current) swordRef.current.rotation.x += 0.8; }, 200);
    }
    
    // Check if any enemy is in attack range
    const player = playerRef.current;
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    
    enemiesRef.current.forEach(enemy => {
      if (!enemy.mesh.visible) return;
      const dist = player.position.distanceTo(enemy.position);
      
      // Check if enemy is in front and within range
      const toEnemy = new THREE.Vector3().subVectors(enemy.position, player.position).normalize();
      const dot = forward.dot(toEnemy);
      
      if (dist < 3 && dot > 0.5) {
        enemy.health -= 1;
        setScore(s => s + 100);
        setMessage('HIT! +100');
        
        // Flash enemy red
        const body = enemy.mesh.children[0] as THREE.Mesh;
        if (body?.material) {
          const origColor = (body.material as THREE.MeshStandardMaterial).color.getHex();
          (body.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
          setTimeout(() => {
            if (body?.material) (body.material as THREE.MeshStandardMaterial).color.setHex(origColor);
          }, 150);
        }
        
        if (enemy.health <= 0) {
          enemy.mesh.visible = false;
          setScore(s => s + 300);
          setEnemiesKilled(k => k + 1);
          // Give heart on kill (max 5)
          setPlayerHealth(h => {
            const newHealth = Math.min(5, h + 1);
            if (newHealth > h) {
              setMessage('ENEMY KILLED! +300 +❤️');
            } else {
              setMessage('ENEMY KILLED! +300');
            }
            return newHealth;
          });
        }
        
        setTimeout(() => setMessage(''), 1000);
      }
    });
    
    setTimeout(() => { isAttackingRef.current = false; }, 300);
  }, []);

  // Parry function (C key) - blocks enemy attacks when their sword is RED
  const performParry = useCallback(() => {
    if (isParryingRef.current || parryCooldownRef.current > 0) return;
    
    isParryingRef.current = true;
    parryCooldownRef.current = 0.6; // 0.6 second cooldown
    
    // Sword parry animation - raise sword to block
    if (swordRef.current) {
      swordRef.current.rotation.z -= 0.6;
      swordRef.current.rotation.x += 0.3;
      swordRef.current.position.y += 0.25;
      
      // Flash sword blue during parry
      const blade = swordRef.current.children[0] as THREE.Mesh;
      if (blade?.material) {
        const mat = blade.material as THREE.MeshStandardMaterial;
        const origEmissive = mat.emissive.getHex();
        mat.emissive.setHex(0x4444ff);
        mat.emissiveIntensity = 2.0;
        
        setTimeout(() => { 
          if (blade?.material) {
            mat.emissive.setHex(origEmissive);
            mat.emissiveIntensity = 0.6;
          }
        }, 400);
      }
      
      setTimeout(() => { 
        if (swordRef.current) {
          swordRef.current.rotation.z += 0.6;
          swordRef.current.rotation.x -= 0.3;
          swordRef.current.position.y -= 0.25;
        }
      }, 400);
    }
    
    // Parry detection is now handled in the game loop
    // isParryingRef.current being true will block attacks
    
    setTimeout(() => { isParryingRef.current = false; }, 450);
  }, []);

  // Main game loop - defined as callback
  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    
    const delta = Math.min(clockRef.current.getDelta(), 0.1);
    const elapsed = clockRef.current.getElapsedTime();
    const player = playerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    
    if (!camera || !scene || !renderer) {
      animationRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    
    // === COOLDOWNS ===
    if (attackCooldownRef.current > 0) attackCooldownRef.current -= delta;
    if (parryCooldownRef.current > 0) parryCooldownRef.current -= delta;
    
    // === MOVEMENT ===
    const speed = keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'] ? 16 : 8;
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    
    const moveDir = new THREE.Vector3();
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveDir.add(forward);
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveDir.sub(forward);
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveDir.sub(right);
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveDir.add(right);
    
    if (moveDir.length() > 0) {
      moveDir.normalize();
      player.velocity.x += moveDir.x * speed * delta * 10;
      player.velocity.z += moveDir.z * speed * delta * 10;
    }
    
    // Jump
    if ((keysRef.current['Space'] || keysRef.current['KeyJ']) && player.onGround) {
      player.velocity.y = 12;
      player.onGround = false;
    }
    
    // Gravity
    if (!player.onGround) {
      player.velocity.y -= 30 * delta;
    }
    
    // Apply velocity
    player.position.add(player.velocity.clone().multiplyScalar(delta));
    
    // Friction
    player.velocity.x *= 0.85;
    player.velocity.z *= 0.85;
    
    // Floor collision - Room 1
    if (player.position.x >= -15 && player.position.x <= 15 && player.position.z >= -15 && player.position.z <= 15) {
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
    }
    // Floor collision - Room 2
    const r2x = 35;
    if (player.position.x >= r2x - 15 && player.position.x <= r2x + 15 && player.position.z >= -15 && player.position.z <= 15) {
      if (player.position.y < 2) {
        player.position.y = 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
    }
    // Bridge floor
    if (player.position.x >= 15 && player.position.x <= 25 && player.position.z >= -3 && player.position.z <= 3 && player.position.y >= 20) {
      if (player.position.y < 24 && player.velocity.y <= 0) {
        player.position.y = 24;
        player.velocity.y = 0;
        player.onGround = true;
      }
    }
    
    // World bounds
    player.position.x = Math.max(-14, Math.min(49, player.position.x));
    player.position.z = Math.max(-14, Math.min(14, player.position.z));
    if (player.position.y < -10) {
      player.position.set(0, 5, 5);
      player.velocity.set(0, 0, 0);
      setPlayerHealth(h => Math.max(0, h - 1));
    }
    
    // === PLATFORM COLLISIONS ===
    const platforms = [
      // Room 1 - Ground level
      { x: -8, y: 2, z: -8, w: 5, d: 5 }, { x: 8, y: 2, z: -8, w: 5, d: 5 }, { x: 0, y: 2, z: 8, w: 5, d: 5 },
      // Room 1 - Level 2
      { x: -10, y: 5, z: 0, w: 4, d: 4 }, { x: 10, y: 5, z: 0, w: 4, d: 4 }, { x: 0, y: 5, z: -10, w: 4, d: 4 },
      // Room 1 - Level 3
      { x: -6, y: 8, z: -6, w: 4, d: 4 }, { x: 6, y: 8, z: -6, w: 4, d: 4 }, { x: 0, y: 8, z: 6, w: 5, d: 5 },
      // Room 1 - Level 4
      { x: -8, y: 11, z: 2, w: 3, d: 3 }, { x: 8, y: 11, z: -2, w: 3, d: 3 }, { x: 0, y: 11, z: 0, w: 5, d: 5 },
      // Room 1 - Level 5
      { x: -5, y: 14, z: -4, w: 3, d: 3 }, { x: 5, y: 14, z: 4, w: 3, d: 3 },
      // Room 1 - Level 6 & 7
      { x: 0, y: 17, z: 0, w: 4, d: 4 }, { x: 0, y: 20, z: 0, w: 6, d: 6 },
      { x: 12, y: 22, z: 0, w: 4, d: 4 },
      // Bridge
      { x: 20, y: 22, z: 0, w: 10, d: 6 },
      // Room 2
      { x: r2x - 8, y: 2, z: -8, w: 5, d: 5 }, { x: r2x + 8, y: 2, z: -8, w: 5, d: 5 }, { x: r2x, y: 2, z: 8, w: 6, d: 6 },
      { x: r2x - 10, y: 6, z: 0, w: 4, d: 4 }, { x: r2x + 10, y: 6, z: 0, w: 4, d: 4 },
      { x: r2x - 6, y: 10, z: -6, w: 4, d: 4 }, { x: r2x + 6, y: 10, z: 6, w: 4, d: 4 }, { x: r2x, y: 10, z: 0, w: 5, d: 5 },
      { x: r2x - 4, y: 14, z: 4, w: 3, d: 3 }, { x: r2x + 4, y: 14, z: -4, w: 3, d: 3 },
      { x: r2x, y: 18, z: 0, w: 6, d: 6 },
      { x: r2x - 8, y: 22, z: 0, w: 4, d: 4 },
    ];
    
    platforms.forEach(p => {
      const halfW = p.w / 2;
      const halfD = p.d / 2;
      const platTop = p.y + 0.25;
      
      if (
        player.position.x > p.x - halfW && player.position.x < p.x + halfW &&
        player.position.z > p.z - halfD && player.position.z < p.z + halfD &&
        player.position.y >= platTop && player.position.y < platTop + 3 &&
        player.velocity.y <= 0
      ) {
        player.position.y = platTop + 2;
        player.velocity.y = 0;
        player.onGround = true;
      }
    });
    
    // === ROOM TRANSITIONS (4 rooms total) ===
    const r3x = 70;
    const r4x = 105;
    
    const triggerTransition = (fromRoom: number, toRoom: number, condition: boolean, targetX: number, targetY: number, targetZ: number) => {
      if (!transitionTriggeredRef.current.has(fromRoom) && currentRoomRef.current === fromRoom && condition) {
        transitionTriggeredRef.current.add(fromRoom);
        setTransitionRoom(toRoom);
        setShowTransition(true);
        setTimeout(() => {
          // Teleport player to new room
          player.position.set(targetX, targetY, targetZ);
          player.velocity.set(0, 0, 0);
          setCurrentRoom(toRoom);
          currentRoomRef.current = toRoom;
          setTimeout(() => setShowTransition(false), 800);
        }, 1200);
      }
    };
    
    // Room 1 → 2: Cross bridge at x=25, y>20 → teleport to room 2 entrance
    triggerTransition(1, 2, player.position.x > 28 && player.position.y > 20, 35, 2, 0);
    
    // Room 2 → 3: Reach far right of room 2 at x=52 → teleport to room 3 (Pillar Chamber)
    triggerTransition(2, 3, player.position.x > 52 && player.position.y > 18, r3x, 2, 0);
    
    // Room 3 → 4: Reach top of room 3 at y>36 → teleport to room 4 (Final Arena)
    triggerTransition(3, 4, player.position.y > 36 && player.position.x > 75, r4x, 2, 0);
    
    // === CAMERA ===
    camera.position.copy(player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    
    // === CRYSTALS ===
    targetsRef.current.forEach((t, i) => {
      if (t && t.visible) {
        t.rotation.y = elapsed * 2 + i * 0.5;
        t.rotation.x = Math.sin(elapsed * 1.5 + i) * 0.3;
        const baseY = t.userData?.baseY ?? t.position.y;
        t.position.y = baseY + Math.sin(elapsed * 2 + i * 0.7) * 0.25;
        
        if (player.position.distanceTo(t.position) < 1.8) {
          t.visible = false;
          setScore(s => s + 200);
          setTargetsCollected(c => c + 1);
          setMessage('CRYSTAL! +200');
          setTimeout(() => setMessage(''), 1200);
        }
      }
    });
    
    // === SWORD ANIMATION ===
    if (swordRef.current) {
      swordRef.current.position.y = -0.35 + Math.sin(elapsed * 3) * 0.02;
      const blade = swordRef.current.children[0] as THREE.Mesh;
      if (blade?.material) {
        const color = portalModeRef.current === 'green' ? 0x00ff88 : 0x00ffff;
        (blade.material as THREE.MeshStandardMaterial).emissive.setHex(color);
      }
    }
    
    // === MOVING PLATFORMS ===
    const movingPlatforms = (window as any).wormholeMovingPlatforms as any[];
    if (movingPlatforms) {
      movingPlatforms.forEach(mp => {
        const t = elapsed * mp.speed;
        const offset = Math.sin(t);
        mp.mesh.position.x = mp.startX + mp.moveX * offset * 0.5;
        mp.mesh.position.y = mp.startY + mp.moveY * offset * 0.5;
        mp.mesh.position.z = mp.startZ + mp.moveZ * offset * 0.5;
      });
    }
    
    // === POWER-UP COLLECTION ===
    const powerUps = (window as any).wormholePowerUps as THREE.Group[];
    if (powerUps) {
      powerUps.forEach(pu => {
        if (!pu.userData.collected && pu.visible) {
          // Animate power-ups
          pu.rotation.y = elapsed * 2;
          pu.position.y = pu.userData.baseY || pu.position.y;
          if (!pu.userData.baseY) pu.userData.baseY = pu.position.y;
          pu.position.y = pu.userData.baseY + Math.sin(elapsed * 3) * 0.3;
          
          // Check collection
          if (player.position.distanceTo(pu.position) < 2) {
            pu.userData.collected = true;
            pu.visible = false;
            
            switch (pu.userData.type) {
              case 'speed':
                setMessage('⚡ SPEED BOOST! 5s');
                // Speed boost handled by ref
                break;
              case 'shield':
                setMessage('🛡️ SHIELD! +1 Heart');
                setPlayerHealth(h => Math.min(5, h + 1));
                break;
              case 'time':
                setMessage('⏰ TIME BONUS! +15s');
                timeRef.current += 15;
                setTimeLeft(t => t + 15);
                break;
              case 'damage':
                setMessage('💀 DAMAGE BOOST! 2x');
                break;
            }
            setScore(s => s + 500);
            setTimeout(() => setMessage(''), 1500);
          }
        }
      });
    }
    
    // === LAVA HAZARD DAMAGE ===
    const lavaHazards = (window as any).wormholeLavaHazards as THREE.Mesh[];
    if (lavaHazards && healthRef.current > 0) {
      lavaHazards.forEach(lava => {
        const dist = Math.sqrt(
          Math.pow(player.position.x - lava.position.x, 2) +
          Math.pow(player.position.z - lava.position.z, 2)
        );
        if (dist < 2.5 && player.position.y < 1.5) {
          // Touching lava!
          if (!lava.userData.lastDamageTime || elapsed - lava.userData.lastDamageTime > 1) {
            lava.userData.lastDamageTime = elapsed;
            setPlayerHealth(h => Math.max(0, h - 1));
            setMessage('🔥 LAVA DAMAGE! -1 ❤️');
            // Bounce player up
            player.velocity.y = 8;
            setTimeout(() => setMessage(''), 1000);
          }
        }
      });
    }
    
    // === BOSS AI (Room 4) ===
    const boss = (window as any).wormholeBoss;
    if (boss && boss.mesh.visible && currentRoomRef.current === 4) {
      boss.isActive = true;
      const bossPos = boss.position;
      const distToBoss = player.position.distanceTo(bossPos);
      
      // Animate boss
      boss.mesh.rotation.y = Math.atan2(
        player.position.x - bossPos.x,
        player.position.z - bossPos.z
      );
      
      // Boss hover
      boss.mesh.position.y = bossPos.y + Math.sin(elapsed * 1.5) * 0.3;
      
      const bladeMat = boss.sword?.userData?.bladeMat;
      
      // Boss attack pattern
      if (distToBoss < 6 && healthRef.current > 0) {
        if (boss.state === 'idle') {
          boss.state = 'winding_up';
          boss.attackTimer = 0;
          if (bladeMat) {
            bladeMat.color.setHex(0x4444ff);
            bladeMat.emissive.setHex(0x0000ff);
          }
        }
        
        if (boss.state === 'winding_up') {
          boss.attackTimer += delta;
          if (boss.attackTimer > 1.2) {
            boss.state = 'attacking';
            boss.attackTimer = 0;
            if (bladeMat) {
              bladeMat.color.setHex(0xff0000);
              bladeMat.emissive.setHex(0xff0000);
            }
            boss.sword.rotation.z = 0.8;
          }
        }
        
        if (boss.state === 'attacking') {
          boss.attackTimer += delta;
          if (boss.attackTimer > 0.3 && boss.attackTimer < 0.5) {
            if (isParryingRef.current) {
              boss.state = 'stunned';
              boss.attackTimer = 0;
              boss.health -= 1;
              setScore(s => s + 300);
              setMessage('BOSS PARRY! +300');
              if (bladeMat) {
                bladeMat.color.setHex(0xffff00);
                bladeMat.emissive.setHex(0x888800);
              }
              setTimeout(() => setMessage(''), 1000);
            } else if (!boss.hasHitPlayer) {
              boss.hasHitPlayer = true;
              setPlayerHealth(h => Math.max(0, h - 2));
              setMessage('💀 BOSS HIT! -2 ❤️');
              setTimeout(() => setMessage(''), 1000);
            }
          }
          if (boss.attackTimer > 1) {
            boss.state = 'idle';
            boss.hasHitPlayer = false;
            boss.sword.rotation.z = -0.3;
            if (bladeMat) {
              bladeMat.color.setHex(0xffcc00);
              bladeMat.emissive.setHex(0xff6600);
            }
          }
        }
        
        if (boss.state === 'stunned') {
          boss.attackTimer += delta;
          if (boss.attackTimer > 2) {
            boss.state = 'idle';
            boss.sword.rotation.z = -0.3;
            if (bladeMat) {
              bladeMat.color.setHex(0xffcc00);
              bladeMat.emissive.setHex(0xff6600);
            }
          }
        }
      }
      
      // Boss defeated
      if (boss.health <= 0 && boss.mesh.visible) {
        boss.mesh.visible = false;
        setScore(s => s + 2000);
        setMessage('🏆 BOSS DEFEATED! +2000');
        setTimeout(() => setMessage(''), 2000);
      }
    }
    
    // === VICTORY PORTAL (Room 4) ===
    const victoryPortal = (window as any).wormholeVictoryPortal;
    if (victoryPortal && currentRoomRef.current === 4) {
      victoryPortal.rotation.z = elapsed;
      
      const boss2 = (window as any).wormholeBoss;
      const bossDefeated = !boss2 || !boss2.mesh.visible || boss2.health <= 0;
      
      if (bossDefeated && player.position.distanceTo(victoryPortal.position) < 3) {
        // Victory!
        const completedTime = Math.round((Date.now() - gameStartTimeRef.current) / 1000);
        setCompletionTime(completedTime);
        setScore(s => s + 5000); // Victory bonus
        setMessage('🎉 VICTORY! +5000');
        setTimeout(() => {
          setGameState('gameover');
          if (onGameEnd) onGameEnd(scoreRef.current);
        }, 2000);
      }
    }
    
    // === PORTALS ANIMATION ===
    if (portalsRef.current.green?.mesh) {
      portalsRef.current.green.mesh.rotation.z = elapsed;
    }
    if (portalsRef.current.cyan?.mesh) {
      portalsRef.current.cyan.mesh.rotation.z = -elapsed;
    }
    
    // === PORTAL TELEPORTATION ===
    const green = portalsRef.current.green;
    const cyan = portalsRef.current.cyan;
    if (green && cyan) {
      const distToGreen = player.position.distanceTo(green.position);
      const distToCyan = player.position.distanceTo(cyan.position);
      
      if (distToGreen < 1.5) {
        // Teleport to cyan portal
        player.position.copy(cyan.position).add(cyan.normal.clone().multiplyScalar(2));
        player.velocity.copy(cyan.normal.clone().multiplyScalar(Math.max(player.velocity.length(), 5)));
        // Face opposite direction of exit portal (look away from the wall)
        player.yaw = Math.atan2(-cyan.normal.x, -cyan.normal.z);
        player.pitch = 0;
        setScore(s => s + 100);
        setMessage('TELEPORT! +100');
        setTimeout(() => setMessage(''), 1000);
      } else if (distToCyan < 1.5) {
        // Teleport to green portal
        player.position.copy(green.position).add(green.normal.clone().multiplyScalar(2));
        player.velocity.copy(green.normal.clone().multiplyScalar(Math.max(player.velocity.length(), 5)));
        // Face opposite direction of exit portal (look away from the wall)
        player.yaw = Math.atan2(-green.normal.x, -green.normal.z);
        player.pitch = 0;
        setScore(s => s + 100);
        setMessage('TELEPORT! +100');
        setTimeout(() => setMessage(''), 1000);
      }
    }
    
    // === ENEMIES WITH ATTACK STATES ===
    enemiesRef.current.forEach((enemy) => {
      if (!enemy.mesh.visible) return;
      const dist = player.position.distanceTo(enemy.position);
      
      // Get sword material for color changes
      const bladeMat = enemy.sword?.userData?.bladeMat as THREE.MeshStandardMaterial | undefined;
      
      // Enemy physics - gravity and platform collision
      enemy.velocity = enemy.velocity || new THREE.Vector3();
      enemy.velocity.y -= 20 * delta; // Gravity
      
      // Platform collision for enemies
      const platforms = (window as any).wormholePlatforms || [];
      let onPlatform = false;
      platforms.forEach((plat: THREE.Mesh) => {
        const hw = (plat.userData.width || 4) / 2;
        const hd = (plat.userData.depth || 4) / 2;
        const py = plat.position.y + 0.25;
        
        if (Math.abs(enemy.position.x - plat.position.x) < hw + 0.4 &&
            Math.abs(enemy.position.z - plat.position.z) < hd + 0.4 &&
            enemy.position.y > py && enemy.position.y < py + 1.5 &&
            enemy.velocity.y <= 0) {
          enemy.position.y = py + 0.5;
          enemy.velocity.y = 0;
          onPlatform = true;
          enemy.onGround = true;
        }
      });
      
      // Floor collision
      if (enemy.position.y < 0.5 && enemy.velocity.y < 0) {
        enemy.position.y = 0.5;
        enemy.velocity.y = 0;
        enemy.onGround = true;
      }
      
      // Apply velocity
      enemy.position.add(enemy.velocity.clone().multiplyScalar(delta));
      
      // Chase player when not attacking
      if (dist < 30 && dist > 2 && enemy.state === 'idle') {
        const dir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
        
        // Horizontal movement
        const moveSpeed = 4;
        enemy.position.x += dir.x * moveSpeed * delta;
        enemy.position.z += dir.z * moveSpeed * delta;
        
        // Jump towards player if they're above us and we're on ground
        enemy.jumpCooldown = (enemy.jumpCooldown || 0) - delta;
        if (player.position.y > enemy.position.y + 2 && enemy.onGround && enemy.jumpCooldown <= 0) {
          enemy.velocity.y = 12; // Jump!
          enemy.onGround = false;
          enemy.jumpCooldown = 2; // 2 second cooldown between jumps
        }
        
        // Random jump if on ground
        if (enemy.onGround && Math.random() < 0.01 && enemy.jumpCooldown <= 0) {
          enemy.velocity.y = 10;
          enemy.onGround = false;
          enemy.jumpCooldown = 3;
        }
        
        enemy.mesh.position.copy(enemy.position);
        enemy.mesh.lookAt(player.position.x, enemy.position.y, player.position.z);
      }
      
      // Attack state machine
      if (dist < 2.5 && healthRef.current > 0) {
        if (enemy.state === 'idle') {
          // Start winding up attack
          enemy.state = 'winding_up';
          enemy.windupTimer = 0;
          
          // Blue glow - attack is coming!
          if (bladeMat) {
            bladeMat.color.setHex(0x4444ff);
            bladeMat.emissive.setHex(0x0000ff);
            bladeMat.emissiveIntensity = 1.5;
          }
          
          // Raise sword
          if (enemy.sword) {
            enemy.sword.rotation.z = -1.2;
            enemy.sword.position.y = 1.5;
          }
        }
        
        if (enemy.state === 'winding_up') {
          enemy.windupTimer = (enemy.windupTimer || 0) + delta;
          
          // After 0.8 seconds, start attacking
          if (enemy.windupTimer > 0.8) {
            enemy.state = 'attacking';
            enemy.attackTimer = 0;
            
            // Red glow - PARRY NOW!
            if (bladeMat) {
              bladeMat.color.setHex(0xff2222);
              bladeMat.emissive.setHex(0xff0000);
              bladeMat.emissiveIntensity = 2.0;
            }
            
            // Swing sword down
            if (enemy.sword) {
              enemy.sword.rotation.z = 0.5;
              enemy.sword.position.y = 0.8;
            }
          }
        }
        
        if (enemy.state === 'attacking') {
          enemy.attackTimer = (enemy.attackTimer || 0) + delta;
          
          // Attack hits after 0.3 seconds if not parried
          if (enemy.attackTimer > 0.3 && enemy.attackTimer < 0.5) {
            // Check if player is parrying
            if (isParryingRef.current) {
              // Perfect parry!
              enemy.state = 'idle';
              enemy.attackTimer = 0;
              
              // Reset sword
              if (bladeMat) {
                bladeMat.color.setHex(0x888888);
                bladeMat.emissive.setHex(0x222222);
                bladeMat.emissiveIntensity = 0.5;
              }
              if (enemy.sword) {
                enemy.sword.rotation.z = -0.3;
                enemy.sword.position.y = 1.0;
              }
              
              // Push enemy back
              const pushDir = new THREE.Vector3().subVectors(enemy.position, player.position).normalize();
              enemy.position.add(pushDir.multiplyScalar(3));
              enemy.mesh.position.copy(enemy.position);
              
              setScore(s => s + 200);
              setMessage('PERFECT PARRY! +200');
              setTimeout(() => setMessage(''), 1000);
            } else if (!enemy.hasHitPlayer) {
              // Hit the player!
              enemy.hasHitPlayer = true;
              setPlayerHealth(h => Math.max(0, h - 1));
              setMessage('OUCH! -1 ❤️');
              setTimeout(() => setMessage(''), 1000);
            }
          }
          
          // Reset after attack
          if (enemy.attackTimer > 1.0) {
            enemy.state = 'idle';
            enemy.attackTimer = 0;
            enemy.hasHitPlayer = false;
            
            // Reset sword to idle
            if (bladeMat) {
              bladeMat.color.setHex(0x888888);
              bladeMat.emissive.setHex(0x222222);
              bladeMat.emissiveIntensity = 0.5;
            }
            if (enemy.sword) {
              enemy.sword.rotation.z = -0.3;
              enemy.sword.position.y = 1.0;
            }
          }
        }
      } else {
        // Reset to idle if player moves away
        if (enemy.state !== 'idle') {
          enemy.state = 'idle';
          enemy.attackTimer = 0;
          enemy.windupTimer = 0;
          enemy.hasHitPlayer = false;
          
          if (bladeMat) {
            bladeMat.color.setHex(0x888888);
            bladeMat.emissive.setHex(0x222222);
            bladeMat.emissiveIntensity = 0.5;
          }
          if (enemy.sword) {
            enemy.sword.rotation.z = -0.3;
            enemy.sword.position.y = 1.0;
          }
        }
      }
    });
    
    // Render
    renderer.render(scene, camera);
    animationRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Initialize Three.js
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
    
    // === LIGHTING ===
    scene.add(new THREE.AmbientLight(0x6666aa, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(10, 30, 10);
    dir.castShadow = true;
    scene.add(dir);
    
    // Room lights
    [[0x3399ff, -8, 12, -8], [0x00ffff, 8, 12, 8], [0x00ff88, 0, 20, 0], [0xff6688, 35, 12, -8], [0xffaa00, 43, 12, 8], [0xffff00, 20, 25, 0]].forEach(([c, x, y, z]) => {
      const l = new THREE.PointLight(c as number, 2, 50);
      l.position.set(x as number, y as number, z as number);
      scene.add(l);
    });
    
    // === ROOM 1 ===
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.8 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5, side: THREE.DoubleSide });
    
    const floor1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
    floor1.rotation.x = -Math.PI / 2;
    floor1.receiveShadow = true;
    scene.add(floor1);
    scene.add(new THREE.GridHelper(30, 30, 0x4444ff, 0x222244));
    
    const wh = 25;
    // Back wall
    const bw1 = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat);
    bw1.position.set(0, wh/2, -15);
    bw1.userData.portalable = true;
    scene.add(bw1);
    // Front wall
    const fw1 = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat.clone());
    fw1.position.set(0, wh/2, 15);
    fw1.rotation.y = Math.PI;
    fw1.userData.portalable = true;
    scene.add(fw1);
    // Left wall
    const lw1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wh, 30), wallMat.clone());
    lw1.position.set(-15, wh/2, 0);
    lw1.userData.portalable = true;
    scene.add(lw1);
    // Right wall (partial - has opening to bridge)
    const rw1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 30), wallMat.clone());
    rw1.position.set(15, 9, 0);
    rw1.userData.portalable = true;
    scene.add(rw1);
    // Ceiling
    const ceil1 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x222233 }));
    ceil1.position.set(0, wh, 0);
    ceil1.rotation.x = Math.PI / 2;
    scene.add(ceil1);
    
    // === ROOM 2 ===
    const r2x = 35;
    const wallMat2 = new THREE.MeshStandardMaterial({ color: 0x664455, roughness: 0.5, side: THREE.DoubleSide });
    
    const floor2 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat.clone());
    floor2.rotation.x = -Math.PI / 2;
    floor2.position.set(r2x, 0, 0);
    scene.add(floor2);
    const grid2 = new THREE.GridHelper(30, 30, 0xff4444, 0x442222);
    grid2.position.set(r2x, 0, 0);
    scene.add(grid2);
    
    [[r2x, wh/2, -15, 0], [r2x, wh/2, 15, Math.PI]].forEach(([x, y, z, ry]) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat2.clone());
      w.position.set(x, y, z);
      w.rotation.y = ry;
      w.userData.portalable = true;
      scene.add(w);
    });
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
    
    // === ROOM 3 (Purple/Magenta) ===
    const r3x = 70;
    const wallMat3 = new THREE.MeshStandardMaterial({ color: 0x663388, roughness: 0.5, side: THREE.DoubleSide });
    
    const floor3 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat.clone());
    floor3.rotation.x = -Math.PI / 2;
    floor3.position.set(r3x, 0, 0);
    scene.add(floor3);
    const grid3 = new THREE.GridHelper(30, 30, 0xff00ff, 0x440044);
    grid3.position.set(r3x, 0, 0);
    scene.add(grid3);
    
    [[r3x, wh/2, -15, 0], [r3x, wh/2, 15, Math.PI]].forEach(([x, y, z, ry]) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat3.clone());
      w.position.set(x, y, z);
      w.rotation.y = ry;
      w.userData.portalable = true;
      scene.add(w);
    });
    const lw3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 30), wallMat3.clone());
    lw3.position.set(r3x - 15, 9, 0);
    lw3.userData.portalable = true;
    scene.add(lw3);
    const rw3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 30), wallMat3.clone());
    rw3.position.set(r3x + 15, 9, 0);
    rw3.userData.portalable = true;
    scene.add(rw3);
    const ceil3 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x332244 }));
    ceil3.position.set(r3x, 40, 0); // Higher ceiling
    ceil3.rotation.x = Math.PI / 2;
    scene.add(ceil3);
    
    // Room 3 light
    const p6 = new THREE.PointLight(0xff00ff, 2, 50);
    p6.position.set(r3x, 20, 0);
    scene.add(p6);
    
    // Define Room 4 position early for power-ups
    const r4x = 105;
    
    // === ROOM 3 PILLARS (The Pillar Chamber) ===
    const pillarMat = new THREE.MeshStandardMaterial({ 
      color: 0x8844aa, 
      emissive: 0x220044, 
      emissiveIntensity: 0.3,
      roughness: 0.3, 
      metalness: 0.7 
    });
    
    // Create 12 massive pillars in Room 3
    const pillarPositions = [
      { x: r3x - 10, z: -10 }, { x: r3x - 10, z: 0 }, { x: r3x - 10, z: 10 },
      { x: r3x - 5, z: -8 }, { x: r3x - 5, z: 8 },
      { x: r3x, z: -12 }, { x: r3x, z: 12 },
      { x: r3x + 5, z: -8 }, { x: r3x + 5, z: 8 },
      { x: r3x + 10, z: -10 }, { x: r3x + 10, z: 0 }, { x: r3x + 10, z: 10 },
    ];
    
    pillarPositions.forEach((pos, i) => {
      // Main pillar shaft
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.5, 35, 12),
        pillarMat.clone()
      );
      pillar.position.set(pos.x, 17.5, pos.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
      
      // Pillar base
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2.2, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x553377, metalness: 0.8 })
      );
      base.position.set(pos.x, 0.75, pos.z);
      scene.add(base);
      
      // Pillar capital (top decoration)
      const capital = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 1.2, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: 0x553377, metalness: 0.8 })
      );
      capital.position.set(pos.x, 34.25, pos.z);
      scene.add(capital);
      
      // Glowing rings on pillars
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 });
      [8, 18, 28].forEach(h => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 8, 24), ringMat);
        ring.position.set(pos.x, h, pos.z);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
      });
      
      // Add point light to some pillars
      if (i % 3 === 0) {
        const pillarLight = new THREE.PointLight(0xff00ff, 0.5, 8);
        pillarLight.position.set(pos.x, 10, pos.z);
        scene.add(pillarLight);
      }
    });
    
    // === LAVA HAZARDS IN ROOM 3 ===
    const lavaMat = new THREE.MeshStandardMaterial({ 
      color: 0xff3300, 
      emissive: 0xff2200, 
      emissiveIntensity: 1.5 
    });
    const lavaPositions = [
      { x: r3x - 8, z: -3, w: 4, d: 4 },
      { x: r3x + 8, z: 3, w: 4, d: 4 },
      { x: r3x, z: -6, w: 3, d: 3 },
    ];
    const lavaHazards: THREE.Mesh[] = [];
    lavaPositions.forEach(pos => {
      const lava = new THREE.Mesh(new THREE.BoxGeometry(pos.w, 0.3, pos.d), lavaMat.clone());
      lava.position.set(pos.x, 0.15, pos.z);
      lava.userData.isHazard = true;
      lava.userData.damage = 1;
      scene.add(lava);
      lavaHazards.push(lava);
      
      // Lava glow light
      const lavaLight = new THREE.PointLight(0xff3300, 1, 6);
      lavaLight.position.set(pos.x, 1, pos.z);
      scene.add(lavaLight);
    });
    (window as any).wormholeLavaHazards = lavaHazards;
    
    // === POWER-UPS ===
    const powerUpData = [
      { x: 0, y: 15, z: 0, type: 'speed', color: 0x00ffff },      // Room 1 - Speed
      { x: r2x, y: 15, z: 5, type: 'shield', color: 0xffff00 },   // Room 2 - Shield  
      { x: r3x, y: 20, z: 0, type: 'time', color: 0x00ff00 },     // Room 3 - Time
      { x: r4x, y: 12, z: 0, type: 'damage', color: 0xff0000 },   // Room 4 - Damage
    ];
    const powerUps: THREE.Group[] = [];
    powerUpData.forEach(pu => {
      const group = new THREE.Group();
      
      // Outer shell
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.6, 1),
        new THREE.MeshStandardMaterial({ 
          color: pu.color, 
          emissive: pu.color, 
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.6
        })
      );
      group.add(shell);
      
      // Inner core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.3),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      group.add(core);
      
      // Light
      const puLight = new THREE.PointLight(pu.color, 1, 5);
      group.add(puLight);
      
      group.position.set(pu.x, pu.y, pu.z);
      group.userData.type = pu.type;
      group.userData.collected = false;
      scene.add(group);
      powerUps.push(group);
    });
    (window as any).wormholePowerUps = powerUps;
    
    // === ROOM 4 (Golden/Final Arena) ===
    const wallMat4 = new THREE.MeshStandardMaterial({ color: 0xaa8833, roughness: 0.4, side: THREE.DoubleSide });
    
    const floor4 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x554422 }));
    floor4.rotation.x = -Math.PI / 2;
    floor4.position.set(r4x, 0, 0);
    scene.add(floor4);
    const grid4 = new THREE.GridHelper(30, 30, 0xffaa00, 0x442200);
    grid4.position.set(r4x, 0, 0);
    scene.add(grid4);
    
    [[r4x, wh/2, -15, 0], [r4x, wh/2, 15, Math.PI]].forEach(([x, y, z, ry]) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(30, wh), wallMat4.clone());
      w.position.set(x, y, z);
      w.rotation.y = ry;
      w.userData.portalable = true;
      scene.add(w);
    });
    const lw4 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wh, 30), wallMat4.clone());
    lw4.position.set(r4x - 15, wh/2, 0);
    lw4.userData.portalable = true;
    scene.add(lw4);
    const rw4 = new THREE.Mesh(new THREE.BoxGeometry(0.5, wh, 30), wallMat4.clone());
    rw4.position.set(r4x + 15, wh/2, 0);
    rw4.userData.portalable = true;
    scene.add(rw4);
    const ceil4 = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x443322 }));
    ceil4.position.set(r4x, wh, 0);
    ceil4.rotation.x = Math.PI / 2;
    scene.add(ceil4);
    
    // Room 4 light
    const p7 = new THREE.PointLight(0xffaa00, 2, 50);
    p7.position.set(r4x, 15, 0);
    scene.add(p7);
    
    // === ROOM 4 BOSS (The Golden Guardian) ===
    const bossGroup = new THREE.Group();
    
    // Boss body (large armored demon)
    const bossMat = new THREE.MeshStandardMaterial({ 
      color: 0xff4400, 
      emissive: 0x440000, 
      roughness: 0.3, 
      metalness: 0.6 
    });
    const bossBody = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 2.5, 12, 24), bossMat);
    bossBody.position.y = 2.5;
    bossGroup.add(bossBody);
    
    // Boss shoulders
    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9 });
    [[-1.5, 3.5, 0], [1.5, 3.5, 0]].forEach(([x, y, z]) => {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.6), shoulderMat);
      shoulder.position.set(x, y, z);
      shoulder.scale.set(1.3, 0.9, 1);
      bossGroup.add(shoulder);
    });
    
    // Boss horns
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
    [[-0.5, 4.5, 0.2, -0.3], [0.5, 4.5, 0.2, 0.3]].forEach(([x, y, z, rot]) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), hornMat);
      horn.position.set(x, y, z);
      horn.rotation.z = rot;
      bossGroup.add(horn);
    });
    
    // Boss glowing crown
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 1.5 });
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.15, 8, 16), crownMat);
    crown.position.y = 4.3;
    crown.rotation.x = Math.PI / 2;
    bossGroup.add(crown);
    
    // Boss eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    [[-0.4, 3.8, 0.8], [0.4, 3.8, 0.8]].forEach(([x, y, z]) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2), eyeMat);
      eye.position.set(x, y, z);
      bossGroup.add(eye);
    });
    
    // Boss sword (giant golden blade)
    const bossSwordGroup = new THREE.Group();
    const bossBladeMat = new THREE.MeshStandardMaterial({ 
      color: 0xffcc00, 
      emissive: 0xff6600, 
      emissiveIntensity: 0.8,
      metalness: 0.95 
    });
    const bossBlade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.1), bossBladeMat);
    bossBlade.position.y = 1.5;
    bossSwordGroup.add(bossBlade);
    const bossHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x442200 })
    );
    bossHandle.position.y = -0.2;
    bossSwordGroup.add(bossHandle);
    bossSwordGroup.position.set(2, 2.5, 0.5);
    bossSwordGroup.rotation.z = -0.3;
    bossSwordGroup.userData.bladeMat = bossBladeMat;
    bossGroup.add(bossSwordGroup);
    
    // Boss position
    bossGroup.position.set(r4x, 0, 0);
    scene.add(bossGroup);
    
    // Store boss reference
    (window as any).wormholeBoss = {
      mesh: bossGroup,
      position: new THREE.Vector3(r4x, 0, 0),
      health: 10,
      maxHealth: 10,
      state: 'idle',
      attackTimer: 0,
      sword: bossSwordGroup,
      isActive: false
    };
    
    // === MOVING PLATFORMS ===
    const movingPlatforms: { mesh: THREE.Mesh; startX: number; startY: number; startZ: number; moveX: number; moveY: number; moveZ: number; speed: number }[] = [];
    
    const movingPlatData = [
      // Room 1 - horizontal mover
      { x: -5, y: 6, z: 0, moveX: 10, moveY: 0, moveZ: 0, speed: 1.5 },
      // Room 2 - vertical mover
      { x: r2x, y: 5, z: -5, moveX: 0, moveY: 6, moveZ: 0, speed: 1.2 },
      // Room 3 - diagonal mover
      { x: r3x - 5, y: 12, z: 0, moveX: 10, moveY: 8, moveZ: 0, speed: 1 },
      { x: r3x + 5, y: 25, z: 5, moveX: 0, moveY: 0, moveZ: -10, speed: 1.5 },
      // Room 4 - arena platforms
      { x: r4x - 8, y: 8, z: 0, moveX: 16, moveY: 0, moveZ: 0, speed: 2 },
      { x: r4x, y: 4, z: -8, moveX: 0, moveY: 0, moveZ: 16, speed: 1.8 },
    ];
    
    const movePlatMat = new THREE.MeshStandardMaterial({ 
      color: 0x00aaff, 
      emissive: 0x0044aa, 
      emissiveIntensity: 0.5,
      roughness: 0.2 
    });
    
    movingPlatData.forEach(mp => {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 4), movePlatMat.clone());
      plat.position.set(mp.x, mp.y, mp.z);
      plat.userData.width = 4;
      plat.userData.depth = 4;
      plat.castShadow = true;
      scene.add(plat);
      
      movingPlatforms.push({
        mesh: plat,
        startX: mp.x,
        startY: mp.y,
        startZ: mp.z,
        moveX: mp.moveX,
        moveY: mp.moveY,
        moveZ: mp.moveZ,
        speed: mp.speed
      });
    });
    (window as any).wormholeMovingPlatforms = movingPlatforms;
    
    // === VICTORY PORTAL (Room 4) ===
    const victoryPortal = new THREE.Group();
    const vPortalRing = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.3, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 2 })
    );
    victoryPortal.add(vPortalRing);
    const vPortalCore = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    victoryPortal.add(vPortalCore);
    const vPortalLight = new THREE.PointLight(0xffff00, 3, 15);
    victoryPortal.add(vPortalLight);
    victoryPortal.position.set(r4x, 20, 0);
    victoryPortal.rotation.x = -Math.PI / 2;
    victoryPortal.userData.isVictoryPortal = true;
    scene.add(victoryPortal);
    (window as any).wormholeVictoryPortal = victoryPortal;
    
    // === BRIDGES ===
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200, roughness: 0.3 });
    const bridge1 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 6), bridgeMat);
    bridge1.position.set(20, 22, 0);
    scene.add(bridge1);
    
    const bridge2 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 6), bridgeMat.clone());
    bridge2.position.set(r2x + 12, 20, 0);
    scene.add(bridge2);
    
    const bridge3 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0x440044, roughness: 0.3 }));
    bridge3.position.set(r3x + 12, 38, 0);
    scene.add(bridge3);
    
    // === PLATFORMS ===
    const platMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x004422, roughness: 0.3 });
    const platMat2 = new THREE.MeshStandardMaterial({ color: 0x8866ff, emissive: 0x221144, roughness: 0.3 });
    const platMat3 = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0x440044, roughness: 0.3 });
    const platMat4 = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200, roughness: 0.3 });
    
    const platformData = [
      // Room 1
      { x: -8, y: 2, z: -8, w: 5, d: 5 }, { x: 8, y: 2, z: -8, w: 5, d: 5 }, { x: 0, y: 2, z: 8, w: 5, d: 5 },
      { x: -10, y: 5, z: 0, w: 4, d: 4 }, { x: 10, y: 5, z: 0, w: 4, d: 4 }, { x: 0, y: 5, z: -10, w: 4, d: 4 },
      { x: -6, y: 8, z: -6, w: 4, d: 4 }, { x: 6, y: 8, z: -6, w: 4, d: 4 }, { x: 0, y: 8, z: 6, w: 5, d: 5 },
      { x: -8, y: 11, z: 2, w: 3, d: 3 }, { x: 8, y: 11, z: -2, w: 3, d: 3 }, { x: 0, y: 11, z: 0, w: 5, d: 5 },
      { x: -5, y: 14, z: -4, w: 3, d: 3 }, { x: 5, y: 14, z: 4, w: 3, d: 3 },
      { x: 0, y: 17, z: 0, w: 4, d: 4 }, { x: 0, y: 20, z: 0, w: 6, d: 6 },
      { x: 12, y: 22, z: 0, w: 4, d: 4 },
      // Room 2
      { x: r2x - 8, y: 2, z: -8, w: 5, d: 5 }, { x: r2x + 8, y: 2, z: -8, w: 5, d: 5 }, { x: r2x, y: 2, z: 8, w: 6, d: 6 },
      { x: r2x - 10, y: 6, z: 0, w: 4, d: 4 }, { x: r2x + 10, y: 6, z: 0, w: 4, d: 4 },
      { x: r2x - 6, y: 10, z: -6, w: 4, d: 4 }, { x: r2x + 6, y: 10, z: 6, w: 4, d: 4 }, { x: r2x, y: 10, z: 0, w: 5, d: 5 },
      { x: r2x - 4, y: 14, z: 4, w: 3, d: 3 }, { x: r2x + 4, y: 14, z: -4, w: 3, d: 3 },
      { x: r2x, y: 18, z: 0, w: 6, d: 6 }, { x: r2x + 10, y: 20, z: 0, w: 4, d: 4 },
      // Room 3 (Taller room, platforms go higher)
      { x: r3x - 8, y: 2, z: -8, w: 5, d: 5 }, { x: r3x + 8, y: 2, z: -8, w: 5, d: 5 }, { x: r3x, y: 2, z: 8, w: 6, d: 6 },
      { x: r3x - 10, y: 8, z: 0, w: 4, d: 4 }, { x: r3x + 10, y: 8, z: 0, w: 4, d: 4 },
      { x: r3x - 6, y: 14, z: -6, w: 4, d: 4 }, { x: r3x + 6, y: 14, z: 6, w: 4, d: 4 }, { x: r3x, y: 14, z: 0, w: 5, d: 5 },
      { x: r3x - 4, y: 20, z: 4, w: 3, d: 3 }, { x: r3x + 4, y: 20, z: -4, w: 3, d: 3 },
      { x: r3x, y: 26, z: 0, w: 6, d: 6 }, { x: r3x - 6, y: 32, z: 0, w: 4, d: 4 }, { x: r3x + 6, y: 32, z: 0, w: 4, d: 4 },
      { x: r3x, y: 36, z: 0, w: 5, d: 5 }, { x: r3x + 10, y: 38, z: 0, w: 4, d: 4 },
      // Room 4 (Final room)
      { x: r4x - 8, y: 2, z: -8, w: 5, d: 5 }, { x: r4x + 8, y: 2, z: -8, w: 5, d: 5 }, { x: r4x, y: 2, z: 8, w: 6, d: 6 },
      { x: r4x - 10, y: 6, z: 0, w: 4, d: 4 }, { x: r4x + 10, y: 6, z: 0, w: 4, d: 4 },
      { x: r4x, y: 10, z: 0, w: 6, d: 6 }, { x: r4x - 6, y: 14, z: -6, w: 4, d: 4 }, { x: r4x + 6, y: 14, z: 6, w: 4, d: 4 },
      { x: r4x, y: 18, z: 0, w: 8, d: 8 }, // Victory platform
    ];
    
    // Store platforms for enemy jumping
    const platformMeshes: THREE.Mesh[] = [];
    
    platformData.forEach((p, i) => {
      let mat;
      if (i < 17) mat = platMat.clone(); // Room 1
      else if (i < 29) mat = platMat2.clone(); // Room 2
      else if (i < 44) mat = platMat3.clone(); // Room 3
      else mat = platMat4.clone(); // Room 4
      
      const plat = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.5, p.d), mat);
      plat.position.set(p.x, p.y, p.z);
      plat.userData.width = p.w;
      plat.userData.depth = p.d;
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);
      platformMeshes.push(plat);
    });
    
    // Store platforms ref for enemy AI
    (window as any).wormholePlatforms = platformMeshes;
    
    // === CRYSTALS (All 4 Rooms) ===
    const crystalColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff6600, 0x6666ff, 0xffff00];
    const crystalPositions = [
      // Room 1
      { x: -8, y: 3.5, z: -8 }, { x: 8, y: 3.5, z: -8 }, { x: 0, y: 3.5, z: 8 },
      { x: 0, y: 6.5, z: 0 }, { x: -6, y: 9.5, z: -6 }, { x: 0, y: 12.5, z: 0 },
      { x: 0, y: 18.5, z: 0 }, { x: 0, y: 21.5, z: 0 },
      // Room 2
      { x: r2x - 8, y: 3.5, z: -8 }, { x: r2x + 8, y: 3.5, z: -8 }, { x: r2x, y: 3.5, z: 8 },
      { x: r2x, y: 11.5, z: 0 }, { x: r2x, y: 19.5, z: 0 },
      // Room 3 (taller)
      { x: r3x - 8, y: 3.5, z: -8 }, { x: r3x + 8, y: 3.5, z: -8 }, { x: r3x, y: 3.5, z: 8 },
      { x: r3x - 10, y: 9.5, z: 0 }, { x: r3x + 10, y: 9.5, z: 0 },
      { x: r3x, y: 15.5, z: 0 }, { x: r3x - 4, y: 21.5, z: 4 }, { x: r3x + 4, y: 21.5, z: -4 },
      { x: r3x, y: 27.5, z: 0 }, { x: r3x, y: 37.5, z: 0 },
      // Room 4 (final)
      { x: r4x - 8, y: 3.5, z: -8 }, { x: r4x + 8, y: 3.5, z: -8 }, { x: r4x, y: 3.5, z: 8 },
      { x: r4x - 10, y: 7.5, z: 0 }, { x: r4x + 10, y: 7.5, z: 0 },
      { x: r4x, y: 11.5, z: 0 }, { x: r4x, y: 15.5, z: 0 }, { x: r4x, y: 19.5, z: 0 }, // Victory crystals
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
    
    // === DETAILED ENEMIES WITH SWORDS ===
    enemiesRef.current = [];
    const enemyPositions = [
      // Room 1
      { x: -5, z: 0, y: 0 }, { x: 5, z: -5, y: 0 }, { x: 0, z: -10, y: 0 },
      // Room 2
      { x: r2x - 5, z: 0, y: 0 }, { x: r2x + 5, z: -5, y: 0 }, { x: r2x, z: 8, y: 0 },
      // Room 3
      { x: r3x - 5, z: 0, y: 0 }, { x: r3x + 5, z: -5, y: 0 }, { x: r3x, z: -10, y: 0 }, { x: r3x - 8, z: 5, y: 0 },
      // Room 4
      { x: r4x - 5, z: 0, y: 0 }, { x: r4x + 5, z: -5, y: 0 }, { x: r4x, z: 8, y: 0 }, { x: r4x - 8, z: -8, y: 0 },
    ];
    
    enemyPositions.forEach((pos, idx) => {
      const g = new THREE.Group();
      
      // Armored body with segments
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: idx < 3 ? 0xff3333 : idx < 6 ? 0xff6600 : idx < 10 ? 0x9933ff : 0xff0066,
        emissive: idx < 3 ? 0x440000 : idx < 6 ? 0x442200 : idx < 10 ? 0x220044 : 0x440022,
        roughness: 0.3,
        metalness: 0.6
      });
      
      // Main body
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 12, 24), bodyMat);
      body.position.y = 1;
      g.add(body);
      
      // Armored shoulders
      const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
      const lShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15), shoulderMat);
      lShoulder.position.set(-0.4, 1.2, 0);
      lShoulder.scale.set(1.2, 0.8, 1);
      g.add(lShoulder);
      const rShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.15), shoulderMat);
      rShoulder.position.set(0.4, 1.2, 0);
      rShoulder.scale.set(1.2, 0.8, 1);
      g.add(rShoulder);
      
      // Helmet
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.95, roughness: 0.1 });
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), helmetMat);
      helmet.position.y = 1.55;
      helmet.scale.set(1, 1.1, 0.9);
      g.add(helmet);
      
      // Glowing visor
      const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.1), visorMat);
      visor.position.set(0, 1.55, 0.2);
      g.add(visor);
      
      // Glowing eyes behind visor
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      [[-0.08, 1.55, 0.22], [0.08, 1.55, 0.22]].forEach(([x, y, z]) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04), eyeMat);
        eye.position.set(x, y, z);
        g.add(eye);
      });
      
      // Enemy Sword (glows based on attack state)
      const swordGroup = new THREE.Group();
      const bladeMat = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        emissive: 0x333333, 
        emissiveIntensity: 0.5, 
        metalness: 0.95, 
        roughness: 0.05 
      });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.015), bladeMat);
      blade.position.y = 0.4;
      swordGroup.add(blade);
      
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0x442211 })
      );
      handle.position.y = -0.05;
      swordGroup.add(handle);
      
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), shoulderMat);
      swordGroup.add(guard);
      
      swordGroup.position.set(0.5, 1.0, 0.2);
      swordGroup.rotation.set(0, 0, -0.3);
      swordGroup.userData.bladeMat = bladeMat;
      g.add(swordGroup);
      
      g.position.set(pos.x, pos.y, pos.z);
      scene.add(g);
      
      enemiesRef.current.push({ 
        mesh: g, 
        health: 3, 
        position: new THREE.Vector3(pos.x, pos.y, pos.z),
        velocity: new THREE.Vector3(),
        state: 'idle',
        attackTimer: 0,
        windupTimer: 0,
        sword: swordGroup,
        jumpCooldown: 0,
        targetPlatform: null
      });
    });
    
    // === PLAYER SWORD (Neon Energy Blade) ===
    const swordGroup = new THREE.Group();
    
    // Main blade - sharp tapered design
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(0.04, 0);
    bladeShape.lineTo(0.02, 1.2); // Tapered tip
    bladeShape.lineTo(-0.02, 1.2);
    bladeShape.lineTo(-0.04, 0);
    bladeShape.closePath();
    
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005 });
    const bladeMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff, 
      emissive: 0x00ffff, 
      emissiveIntensity: 2.0, 
      metalness: 1.0, 
      roughness: 0.0,
      transparent: true,
      opacity: 0.9
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.1, -0.007);
    swordGroup.add(blade);
    
    // Inner glow core
    const coreGeo = new THREE.BoxGeometry(0.02, 1.1, 0.005);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.55, 0);
    swordGroup.add(core);
    
    // Handle with grip texture
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.3, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.15;
    swordGroup.add(handle);
    
    // Ornate crossguard
    const guardMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.5, metalness: 0.9 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.06), guardMat);
    guard.position.y = 0;
    swordGroup.add(guard);
    
    // Guard gems
    const gemMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2.0 });
    const gem1 = new THREE.Mesh(new THREE.SphereGeometry(0.02), gemMat);
    gem1.position.set(-0.09, 0, 0);
    swordGroup.add(gem1);
    const gem2 = new THREE.Mesh(new THREE.SphereGeometry(0.02), gemMat);
    gem2.position.set(0.09, 0, 0);
    swordGroup.add(gem2);
    
    // Pommel
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035), guardMat);
    pommel.position.y = -0.3;
    swordGroup.add(pommel);
    
    swordGroup.position.set(0.5, -0.3, -0.6);
    swordGroup.rotation.set(0.1, -0.3, 0.1);
    camera.add(swordGroup);
    swordRef.current = swordGroup;
    
    // Add camera to scene for sword
    scene.add(camera);
    
    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    
    renderer.render(scene, camera);
    setGameState('instructions');
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (renderer) {
        renderer.dispose();
        if (container && renderer.domElement.parentNode) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  // Start game loop when playing
  useEffect(() => {
    if (gameState === 'playing') {
      clockRef.current = new THREE.Clock();
      clockRef.current.start();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, gameLoop]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        // Calculate completion time
        const elapsed = Math.round((Date.now() - gameStartTimeRef.current) / 1000);
        setCompletionTime(elapsed);
        setGameState('gameover');
        if (onGameEnd) onGameEnd(scoreRef.current);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, onGameEnd]);

  // Pointer Lock for mouse control
  const requestPointerLock = useCallback(() => {
    const container = containerRef.current;
    if (container && gameStateRef.current === 'playing') {
      container.requestPointerLock?.();
    }
  }, []);

  // Keyboard & Mouse controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyQ') setPortalMode('green');
      if (e.code === 'KeyE') setPortalMode('cyan');
      if (e.code === 'KeyV' && gameStateRef.current === 'playing') performAttack();
      if (e.code === 'KeyC' && gameStateRef.current === 'playing') performParry();
      if (e.code === 'Escape') {
        document.exitPointerLock?.();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      // Only move camera when pointer is locked
      if (!isPointerLockedRef.current || gameStateRef.current !== 'playing') return;
      playerRef.current.yaw -= e.movementX * 0.002;
      playerRef.current.pitch -= e.movementY * 0.002;
      playerRef.current.pitch = Math.max(-1.4, Math.min(1.4, playerRef.current.pitch));
    };
    const onMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      
      // If not locked, request lock on click
      if (!isPointerLockedRef.current && gameStateRef.current === 'playing') {
        requestPointerLock();
        return;
      }
      
      // Shoot portal on left click when locked
      if (e.button === 0 && gameStateRef.current === 'playing' && isPointerLockedRef.current) {
        shootPortal();
      }
    };
    const onMouseUp = () => {
      isMouseDownRef.current = false;
    };
    
    // Pointer lock change handler
    const onPointerLockChange = () => {
      isPointerLockedRef.current = document.pointerLockElement === containerRef.current;
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.exitPointerLock?.();
    };
  }, [shootPortal, requestPointerLock, performAttack, performParry]);

  const startGame = () => {
    playerRef.current.position.set(0, 2, 5);
    playerRef.current.velocity.set(0, 0, 0);
    playerRef.current.yaw = 0;
    playerRef.current.pitch = 0;
    playerRef.current.onGround = true;
    transitionTriggeredRef.current = new Set();
    scoreRef.current = 0;
    timeRef.current = 120; // 2 minutes
    healthRef.current = 3;
    targetsCollectedRef.current = 0;
    gameStartTimeRef.current = Date.now();
    setScore(0);
    setTimeLeft(120); // 2 minutes
    setTargetsCollected(0);
    setPlayerHealth(3);
    setCurrentRoom(1);
    setEnemiesKilled(0);
    setCompletionTime(0);
    targetsRef.current.forEach(t => { if (t) t.visible = true; });
    enemiesRef.current.forEach(e => { 
      e.mesh.visible = true; 
      e.health = 3; 
      e.attackTimer = 0;
      e.state = 'idle';
      e.velocity = new THREE.Vector3();
      e.onGround = true;
    });
    if (portalsRef.current.green?.mesh && sceneRef.current) sceneRef.current.remove(portalsRef.current.green.mesh);
    if (portalsRef.current.cyan?.mesh && sceneRef.current) sceneRef.current.remove(portalsRef.current.cyan.mesh);
    portalsRef.current = { green: null, cyan: null };
    setGameState('playing');
    
    // Request pointer lock after a small delay to ensure game is ready
    setTimeout(() => {
      containerRef.current?.requestPointerLock?.();
    }, 100);
  };

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900">
      <div ref={containerRef} className="absolute inset-0" style={{ touchAction: 'none' }} />
      
      {/* Loading */}
      {gameState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 z-50">
          <div className="text-center">
            <div className="text-6xl animate-spin mb-4">🌀</div>
            <div className="text-white text-2xl font-bold">WORMHOLE</div>
            <div className="text-gray-400 mt-2">Loading...</div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800/95 rounded-2xl p-6 max-w-lg w-full text-white">
            <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">🌀 WORMHOLE</h1>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <h3 className="font-bold text-green-400 mb-2">⌨️ Movement</h3>
                <div><span className="text-green-300">WASD</span> Move</div>
                <div><span className="text-green-300">Space</span> Jump</div>
                <div><span className="text-green-300">Shift</span> Sprint</div>
                <div><span className="text-cyan-300">Mouse</span> Look (auto-lock)</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <h3 className="font-bold text-purple-400 mb-2">🎮 Portals</h3>
                <div><span className="text-green-300">Q</span> Green portal</div>
                <div><span className="text-cyan-300">E</span> Cyan portal</div>
                <div><span className="text-yellow-300">Click</span> Shoot portal</div>
                <div><span className="text-gray-400">ESC</span> Unlock mouse</div>
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4 text-sm">
              <h3 className="font-bold text-red-400 mb-2">⚔️ Combat</h3>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-red-300">V</span> Attack (+100)</div>
                <div><span className="text-blue-300">C</span> Parry (+200)</div>
              </div>
              <div className="text-gray-400 text-xs mt-2">3 hits to kill enemies!</div>
              <div className="mt-2 p-2 bg-gray-600/50 rounded">
                <div className="text-xs font-bold mb-1">Enemy Sword Colors:</div>
                <div className="flex gap-3 text-xs">
                  <span><span className="text-blue-400">🔵 BLUE</span> = Winding up</span>
                  <span><span className="text-red-400">🔴 RED</span> = PARRY NOW!</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4 text-sm">
              <h3 className="font-bold text-yellow-400 mb-1">🎯 Objective</h3>
              <p className="text-gray-300 text-xs">Navigate through 4 chambers, collect crystals, defeat enemies, and reach the Victory Portal in Chamber 4!</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-lg p-2">
                <div className="font-bold text-cyan-400">🏛️ Chamber 1</div>
                <div className="text-gray-400">Starting Area</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-lg p-2">
                <div className="font-bold text-purple-400">🔮 Chamber 2</div>
                <div className="text-gray-400">The Void</div>
              </div>
              <div className="bg-gradient-to-br from-pink-900/50 to-pink-800/30 rounded-lg p-2">
                <div className="font-bold text-pink-400">🏛️ Chamber 3</div>
                <div className="text-gray-400">Pillar Chamber</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 rounded-lg p-2">
                <div className="font-bold text-yellow-400">👑 Chamber 4</div>
                <div className="text-gray-400">Boss Arena</div>
              </div>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-2 mb-4 text-xs">
              <h3 className="font-bold text-green-400 mb-1">🎁 Power-Ups</h3>
              <div className="grid grid-cols-2 gap-1 text-gray-300">
                <div>⚡ Speed Boost</div>
                <div>🛡️ Shield (+1❤️)</div>
                <div>⏰ Time (+15s)</div>
                <div>💀 Damage (2x)</div>
              </div>
            </div>
            
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-2 mb-4 text-xs">
              <h3 className="font-bold text-red-400 mb-1">⚠️ Hazards</h3>
              <div className="text-gray-300">🔥 Lava in Chamber 3 • 👹 Boss in Chamber 4</div>
            </div>
            
            {isMobile && <p className="text-yellow-400 text-sm mb-4 text-center">⚠️ Best played on desktop with keyboard/mouse</p>}
            
            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 text-white text-xl font-bold rounded-xl transition-all hover:scale-105 active:scale-95">
              🚀 START GAME
            </button>
          </div>
        </div>
      )}
      
      {/* Room Transition */}
      {showTransition && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <div className="text-6xl animate-spin mb-4">🌀</div>
            <h2 className={`text-3xl font-bold mb-2 ${
              transitionRoom === 2 ? 'text-purple-400' :
              transitionRoom === 3 ? 'text-pink-400' :
              transitionRoom === 4 ? 'text-yellow-400' : 'text-cyan-400'
            }`}>
              Entering Chamber {transitionRoom}...
            </h2>
            <div className="text-white/60 text-sm mb-4">
              {transitionRoom === 2 ? '🔮 The Purple Void - More enemies await!' :
               transitionRoom === 3 ? '🏛️ The Pillar Chamber - Watch for lava!' :
               transitionRoom === 4 ? '👑 The Golden Arena - Face the Boss!' : 'Unknown'}
            </div>
            <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className={`h-full animate-pulse ${
                transitionRoom === 2 ? 'bg-gradient-to-r from-green-500 to-purple-500' :
                transitionRoom === 3 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                transitionRoom === 4 ? 'bg-gradient-to-r from-pink-500 to-yellow-500' :
                'bg-gradient-to-r from-green-500 to-cyan-500'
              }`} style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}
      
      {/* HUD */}
      {gameState === 'playing' && (
        <>
          {/* Score & Stats */}
          <div className="absolute top-4 left-4 z-40 bg-black/70 rounded-lg px-4 py-2">
            <div className="text-white text-xl font-bold">Score: {score}</div>
            <div className="text-gray-300 text-sm">🎯 Crystals: {targetsCollected}/{totalTargets}</div>
            <div className={`text-sm font-bold ${
              currentRoom === 1 ? 'text-cyan-400' :
              currentRoom === 2 ? 'text-purple-400' :
              currentRoom === 3 ? 'text-pink-400' :
              'text-yellow-400'
            }`}>🏠 Chamber {currentRoom}/4</div>
          </div>
          
          {/* Health */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`text-2xl ${i < playerHealth ? '' : 'opacity-30'}`}>
                {i < playerHealth ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
          
          {/* Timer */}
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-xl text-white ${timeLeft <= 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-800'}`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          {/* Portal Mode */}
          <div className="absolute top-4 right-4 z-40">
            <div className={`rounded-lg px-4 py-2 font-bold text-white ${portalMode === 'green' ? 'bg-green-600' : 'bg-cyan-600'}`}>
              {portalMode === 'green' ? '🟢 GREEN [Q]' : '🔵 CYAN [E]'}
            </div>
          </div>
          
          {/* Boss Health (Room 4) */}
          {currentRoom === 4 && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 w-64">
              <div className="text-center text-yellow-400 font-bold mb-1">👹 GOLDEN GUARDIAN</div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-yellow-500 transition-all duration-300"
                  style={{ width: `${((window as any).wormholeBoss?.health || 0) / 10 * 100}%` }}
                />
              </div>
              <div className="text-center text-xs text-gray-400 mt-1">
                {((window as any).wormholeBoss?.health || 0) > 0 ? 'Defeat the boss to unlock the Victory Portal!' : '✨ Defeated! Enter the portal!'}
              </div>
            </div>
          )}
          
          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className={`w-6 h-6 border-2 rounded-full ${portalMode === 'green' ? 'border-green-400' : 'border-cyan-400'}`}>
              <div className={`absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${portalMode === 'green' ? 'bg-green-400' : 'bg-cyan-400'}`} />
            </div>
          </div>
          
          {/* Message */}
          {message && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40">
              <div className="bg-black/80 text-white px-6 py-3 rounded-xl text-lg font-bold animate-bounce">{message}</div>
            </div>
          )}
          
          {/* Controls hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-black/50 text-gray-400 px-4 py-2 rounded-lg text-sm">
            Mouse auto-locks • WASD move • V attack • C parry • Q🟢/E🔵 portals
          </div>
          
          {/* Mobile Controls */}
          {isMobile && (
            <>
              <div className="absolute bottom-20 left-4 z-40 grid grid-cols-3 gap-1">
                <div />
                <button className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40 flex items-center justify-center" onTouchStart={() => keysRef.current['KeyW'] = true} onTouchEnd={() => keysRef.current['KeyW'] = false}>↑</button>
                <div />
                <button className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40 flex items-center justify-center" onTouchStart={() => keysRef.current['KeyA'] = true} onTouchEnd={() => keysRef.current['KeyA'] = false}>←</button>
                <button className="w-14 h-14 bg-green-600/50 rounded-lg text-white active:bg-green-600 flex items-center justify-center text-sm font-bold" onTouchStart={() => keysRef.current['Space'] = true} onTouchEnd={() => keysRef.current['Space'] = false}>JUMP</button>
                <button className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40 flex items-center justify-center" onTouchStart={() => keysRef.current['KeyD'] = true} onTouchEnd={() => keysRef.current['KeyD'] = false}>→</button>
                <div />
                <button className="w-14 h-14 bg-white/20 rounded-lg text-white text-2xl active:bg-white/40 flex items-center justify-center" onTouchStart={() => keysRef.current['KeyS'] = true} onTouchEnd={() => keysRef.current['KeyS'] = false}>↓</button>
              </div>
              
              <div className="absolute bottom-20 right-4 z-40 flex flex-col gap-2">
                <button className="w-14 h-14 bg-red-600/50 rounded-lg text-white text-xs font-bold active:bg-red-600" onClick={performAttack}>ATK</button>
                <button className="w-14 h-14 bg-blue-600/50 rounded-lg text-white text-xs font-bold active:bg-blue-600" onClick={performParry}>PARRY</button>
                <button className="w-14 h-14 bg-green-600/50 rounded-lg text-white font-bold active:bg-green-600" onClick={() => setPortalMode('green')}>🟢</button>
                <button className="w-14 h-14 bg-cyan-600/50 rounded-lg text-white font-bold active:bg-cyan-600" onClick={() => setPortalMode('cyan')}>🔵</button>
                <button className="w-14 h-14 bg-yellow-600/50 rounded-lg text-white font-bold active:bg-yellow-600" onClick={shootPortal}>🌀</button>
                <button className="w-14 h-14 bg-purple-600/50 rounded-lg text-white text-xs font-bold active:bg-purple-600" onTouchStart={() => keysRef.current['ShiftLeft'] = true} onTouchEnd={() => keysRef.current['ShiftLeft'] = false}>RUN</button>
              </div>
            </>
          )}
        </>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
          <div className="bg-gray-800/95 rounded-2xl p-8 max-w-md text-center text-white">
            <h2 className={`text-4xl font-bold mb-4 ${currentRoom === 4 ? 'text-yellow-400' : 'text-white'}`}>
              {currentRoom === 4 ? '🏆 Victory!' : '🎮 Game Over!'}
            </h2>
            <div className="text-6xl font-bold text-green-400 mb-4">{score}</div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">⏱️ Time</div>
                <div className="text-xl font-bold text-cyan-400">
                  {Math.floor(completionTime / 60)}:{(completionTime % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">🎯 Crystals</div>
                <div className="text-xl font-bold text-purple-400">{targetsCollected}/{totalTargets}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">💀 Enemies</div>
                <div className="text-xl font-bold text-red-400">{enemiesKilled}</div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-gray-400">🏠 Chamber</div>
                <div className={`text-xl font-bold ${
                  currentRoom === 1 ? 'text-cyan-400' :
                  currentRoom === 2 ? 'text-purple-400' :
                  currentRoom === 3 ? 'text-pink-400' :
                  'text-yellow-400'
                }`}>{currentRoom}/4</div>
              </div>
            </div>
            
            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-xl font-bold rounded-xl hover:from-green-500 hover:to-cyan-500 transition-all hover:scale-105">
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
