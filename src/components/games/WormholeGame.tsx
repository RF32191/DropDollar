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
  const timeRef = useRef(90);
  const currentRoomRef = useRef(1);
  const transitionTriggeredRef = useRef(false);
  const targetsCollectedRef = useRef(0);
  
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
  const [currentRoom, setCurrentRoom] = useState(1);
  const [showTransition, setShowTransition] = useState(false);
  
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
          setMessage('ENEMY KILLED! +300');
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
    
    // === ROOM TRANSITION ===
    if (!transitionTriggeredRef.current && currentRoomRef.current === 1 && player.position.x > 25 && player.position.y > 20) {
      transitionTriggeredRef.current = true;
      setShowTransition(true);
      setTimeout(() => {
        setCurrentRoom(2);
        setTimeout(() => setShowTransition(false), 800);
      }, 1200);
    }
    
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
      
      // Chase player when not attacking
      if (dist < 25 && dist > 2 && enemy.state === 'idle') {
        const dir = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
        dir.y = 0;
        enemy.position.add(dir.multiplyScalar(3 * delta));
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
    
    // === BRIDGE ===
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200, roughness: 0.3 });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 6), bridgeMat);
    bridge.position.set(20, 22, 0);
    scene.add(bridge);
    
    // === PLATFORMS ===
    const platMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x004422, roughness: 0.3 });
    const platMat2 = new THREE.MeshStandardMaterial({ color: 0x8866ff, emissive: 0x221144, roughness: 0.3 });
    
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
      { x: r2x, y: 18, z: 0, w: 6, d: 6 },
      { x: r2x - 8, y: 22, z: 0, w: 4, d: 4 },
    ];
    
    platformData.forEach((p, i) => {
      const mat = i < 17 ? platMat.clone() : platMat2.clone();
      const plat = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.5, p.d), mat);
      plat.position.set(p.x, p.y, p.z);
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);
    });
    
    // === CRYSTALS ===
    const crystalColors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff6600, 0x6666ff, 0xffff00];
    const crystalPositions = [
      { x: -8, y: 3.5, z: -8 }, { x: 8, y: 3.5, z: -8 }, { x: 0, y: 3.5, z: 8 },
      { x: 0, y: 6.5, z: 0 }, { x: -6, y: 9.5, z: -6 }, { x: 0, y: 12.5, z: 0 },
      { x: 0, y: 18.5, z: 0 }, { x: 0, y: 21.5, z: 0 },
      { x: r2x - 8, y: 3.5, z: -8 }, { x: r2x + 8, y: 3.5, z: -8 }, { x: r2x, y: 3.5, z: 8 },
      { x: r2x, y: 11.5, z: 0 }, { x: r2x, y: 19.5, z: 0 },
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
    
    // === ENEMIES WITH SWORDS ===
    enemiesRef.current = [];
    [{ x: -5, z: 0 }, { x: 5, z: -5 }, { x: 0, z: -10 }, { x: 10, z: 5 }, { x: r2x - 5, z: 0 }, { x: r2x + 5, z: -5 }].forEach(pos => {
      const g = new THREE.Group();
      
      // Body
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 0.8, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x440000, roughness: 0.5 })
      );
      body.position.y = 1;
      g.add(body);
      
      // Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      [[-0.15, 1.3, 0.3], [0.15, 1.3, 0.3]].forEach(([x, y, z]) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
        eye.position.set(x, y, z);
        g.add(eye);
      });
      
      // Enemy Sword (glows based on attack state)
      const swordGroup = new THREE.Group();
      const bladeMat = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        emissive: 0x222222, 
        emissiveIntensity: 0.5, 
        metalness: 0.9, 
        roughness: 0.1 
      });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.02), bladeMat);
      blade.position.y = 0.35;
      swordGroup.add(blade);
      
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0x553311 })
      );
      handle.position.y = -0.05;
      swordGroup.add(handle);
      
      swordGroup.position.set(0.5, 1.0, 0.2);
      swordGroup.rotation.set(0, 0, -0.3);
      swordGroup.userData.bladeMat = bladeMat;
      g.add(swordGroup);
      
      g.position.set(pos.x, 0, pos.z);
      scene.add(g);
      
      enemiesRef.current.push({ 
        mesh: g, 
        health: 3, 
        position: new THREE.Vector3(pos.x, 0, pos.z), 
        state: 'idle', // idle, winding_up, attacking
        attackTimer: 0,
        windupTimer: 0,
        sword: swordGroup
      });
    });
    
    // === SWORD ===
    const swordGroup = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x00ff88, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.1 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.02), bladeMat);
    blade.position.y = 0.5;
    swordGroup.add(blade);
    
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x553311 }));
    handle.position.y = -0.12;
    swordGroup.add(handle);
    
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), bladeMat);
    swordGroup.add(guard);
    
    swordGroup.position.set(0.45, -0.35, -0.55);
    swordGroup.rotation.set(0.15, -0.35, 0.12);
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
    transitionTriggeredRef.current = false;
    scoreRef.current = 0;
    timeRef.current = 90;
    healthRef.current = 3;
    targetsCollectedRef.current = 0;
    setScore(0);
    setTimeLeft(90);
    setTargetsCollected(0);
    setPlayerHealth(3);
    setCurrentRoom(1);
    setEnemiesKilled(0);
    targetsRef.current.forEach(t => { if (t) t.visible = true; });
    enemiesRef.current.forEach(e => { e.mesh.visible = true; e.health = 3; e.attackTimer = 0; });
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
              <h3 className="font-bold text-yellow-400 mb-1">🎯 Goals</h3>
              <p className="text-gray-300">Collect crystals (+200), link portals (+50), teleport (+100). Climb platforms to reach the bridge and Chamber 2!</p>
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
            <h2 className="text-3xl font-bold text-white mb-2">Entering Chamber 2...</h2>
            <div className="w-48 h-2 bg-gray-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 animate-pulse" style={{ width: '100%' }} />
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
            <div className={`text-sm font-bold ${currentRoom === 1 ? 'text-blue-400' : 'text-purple-400'}`}>🏠 Chamber {currentRoom}</div>
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
            <h2 className="text-4xl font-bold mb-4">🎮 Game Over!</h2>
            <div className="text-6xl font-bold text-green-400 mb-4">{score}</div>
            <div className="text-gray-400 mb-2">Crystals: {targetsCollected}/{totalTargets}</div>
            <div className="text-gray-400 mb-6">Chamber Reached: {currentRoom}</div>
            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-green-600 to-cyan-600 text-white text-xl font-bold rounded-xl hover:from-green-500 hover:to-cyan-500 transition-all hover:scale-105">
              🔄 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
