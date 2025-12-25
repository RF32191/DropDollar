'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TOWER TAP: COLLAPSE
// ============================================================================
// Core Mechanic: 3D tower made of physics blocks, tap weak points to score
// Skill Element: Timing, structural understanding, precision
// Competitive: Same tower seed for everyone, highest score wins
// ============================================================================

interface TowerTapGameProps {
  isPractice?: boolean;
  competitionId?: string;
  entryFee?: number;
  theme?: 'default' | 'halloween' | 'christmas';
}

interface Block {
  mesh: THREE.Mesh;
  id: number;
  row: number;
  col: number;
  isWeakPoint: boolean;
  isRemoved: boolean;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  grounded: boolean;
  health: number;
}

interface FloatingScore {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  color: string;
}

// Seeded random number generator for fair competition
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export default function TowerTapGame({ 
  isPractice = true, 
  competitionId,
  entryFee = 0,
  theme = 'default'
}: TowerTapGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Game state
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameover'>('instructions');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [tapsUsed, setTapsUsed] = useState(0);
  const [blocksRemoved, setBlocksRemoved] = useState(0);
  const [towerHealth, setTowerHealth] = useState(100);
  const [timeLeft, setTimeLeft] = useState(90); // 90 second game
  const [level, setLevel] = useState(1);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [perfectTaps, setPerfectTaps] = useState(0);
  
  // Refs for game loop
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const blocksRef = useRef<Block[]>([]);
  const animationRef = useRef<number>(0);
  const gameActiveRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const rngRef = useRef<SeededRandom | null>(null);
  const weakPointTimerRef = useRef(0);
  const floatingScoreIdRef = useRef(0);
  const towerBaseYRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Theme colors
  const getThemeColors = useCallback(() => {
    switch (theme) {
      case 'halloween':
        return {
          background: 0x1a0a2e,
          block: 0x4a1a6b,
          blockAlt: 0x2d1b4e,
          weakPoint: 0xff6600,
          weakPointGlow: 0xff9900,
          ground: 0x2d1b4e,
          ambient: 0x6b3fa0,
          text: '#ff6600',
          accent: '#9b59b6'
        };
      case 'christmas':
        return {
          background: 0x0a1628,
          block: 0x1e5631,
          blockAlt: 0x8b0000,
          weakPoint: 0xffd700,
          weakPointGlow: 0xffec8b,
          ground: 0xffffff,
          ambient: 0x87ceeb,
          text: '#ffd700',
          accent: '#ff0000'
        };
      default:
        return {
          background: 0x0a0a1a,
          block: 0x3498db,
          blockAlt: 0x2980b9,
          weakPoint: 0x00ff88,
          weakPointGlow: 0x00ffaa,
          ground: 0x1a1a2e,
          ambient: 0x6c5ce7,
          text: '#00ff88',
          accent: '#3498db'
        };
    }
  }, [theme]);

  // Add floating score
  const addFloatingScore = useCallback((points: number, x: number, y: number, isPerfect: boolean = false) => {
    const id = floatingScoreIdRef.current++;
    const color = isPerfect ? '#ffd700' : points > 0 ? '#00ff88' : '#ff4444';
    const text = isPerfect ? `PERFECT! +${points}` : (points > 0 ? `+${points}` : `${points}`);
    
    setFloatingScores(prev => [...prev, { id, text, x, y, opacity: 1, color }]);
    
    // Animate and remove
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== id));
    }, 1500);
  }, []);

  // Build tower with seeded randomness
  const buildTower = useCallback((scene: THREE.Scene, rng: SeededRandom, levelNum: number) => {
    const colors = getThemeColors();
    const blocks: Block[] = [];
    
    // Tower dimensions based on level
    const rows = 8 + levelNum * 2; // More rows at higher levels
    const cols = 3;
    const blockWidth = 1.2;
    const blockHeight = 0.5;
    const blockDepth = 0.4;
    
    // Create tower base
    const baseGeometry = new THREE.BoxGeometry(5, 0.3, 2);
    const baseMaterial = new THREE.MeshStandardMaterial({ 
      color: colors.ground,
      metalness: 0.3,
      roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0;
    base.receiveShadow = true;
    scene.add(base);
    
    let blockId = 0;
    
    // Build tower rows
    for (let row = 0; row < rows; row++) {
      // Alternate row orientation
      const isRotated = row % 2 === 1;
      
      for (let col = 0; col < cols; col++) {
        // Determine if this is a weak point (strategic placement)
        const isWeakPoint = rng.next() < 0.15 + (levelNum * 0.02); // More weak points at higher levels
        
        // Create block geometry
        const geometry = new THREE.BoxGeometry(blockWidth, blockHeight, blockDepth);
        
        // Create material
        const blockColor = isWeakPoint ? colors.weakPoint : (col % 2 === 0 ? colors.block : colors.blockAlt);
        const material = new THREE.MeshStandardMaterial({
          color: blockColor,
          metalness: isWeakPoint ? 0.6 : 0.2,
          roughness: isWeakPoint ? 0.3 : 0.6,
          emissive: isWeakPoint ? colors.weakPointGlow : 0x000000,
          emissiveIntensity: isWeakPoint ? 0.3 : 0
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position block
        let x, z;
        if (isRotated) {
          x = 0;
          z = (col - 1) * blockDepth * 1.1;
          mesh.rotation.y = Math.PI / 2;
        } else {
          x = (col - 1) * blockWidth * 0.35;
          z = 0;
        }
        
        mesh.position.set(x, 0.15 + blockHeight / 2 + row * blockHeight, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store block ID in userData for raycasting
        mesh.userData = { blockId, isWeakPoint };
        
        scene.add(mesh);
        
        blocks.push({
          mesh,
          id: blockId,
          row,
          col,
          isWeakPoint,
          isRemoved: false,
          velocity: new THREE.Vector3(0, 0, 0),
          angularVelocity: new THREE.Vector3(0, 0, 0),
          grounded: true,
          health: isWeakPoint ? 1 : 3
        });
        
        blockId++;
      }
    }
    
    // Store tower base Y for collapse detection
    towerBaseYRef.current = rows * blockHeight;
    
    return blocks;
  }, [getThemeColors]);

  // Initialize Three.js scene
  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    
    const colors = getThemeColors();
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 10, 50);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 3, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Point lights for atmosphere
    const pointLight1 = new THREE.PointLight(colors.weakPointGlow, 0.5, 20);
    pointLight1.position.set(-5, 8, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(colors.accent, 0.5, 20);
    pointLight2.position.set(5, 8, -5);
    scene.add(pointLight2);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: colors.ground,
      metalness: 0.1,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);
    
    // Initialize RNG with daily seed for fair competition
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    rngRef.current = new SeededRandom(seed);
    
    // Build initial tower
    blocksRef.current = buildTower(scene, rngRef.current, 1);
    
    return { scene, camera, renderer };
  }, [getThemeColors, buildTower]);

  // Handle tap/click on tower
  const handleTap = useCallback((event: MouseEvent | TouchEvent) => {
    if (!gameActiveRef.current || !sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    event.preventDefault();
    
    // Get mouse/touch position
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    
    // Raycast to find clicked block
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    
    const blockMeshes = blocksRef.current
      .filter(b => !b.isRemoved)
      .map(b => b.mesh);
    
    const intersects = raycaster.intersectObjects(blockMeshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const blockId = clickedMesh.userData.blockId;
      const block = blocksRef.current.find(b => b.id === blockId);
      
      if (block && !block.isRemoved) {
        setTapsUsed(prev => prev + 1);
        
        // Check if weak point
        if (block.isWeakPoint) {
          // Perfect tap on weak point!
          const basePoints = 100;
          const comboBonus = comboRef.current * 25;
          const points = basePoints + comboBonus;
          
          scoreRef.current += points;
          setScore(scoreRef.current);
          
          comboRef.current++;
          setCombo(comboRef.current);
          if (comboRef.current > maxCombo) {
            setMaxCombo(comboRef.current);
          }
          
          setPerfectTaps(prev => prev + 1);
          
          // Remove block with effect
          removeBlock(block, true);
          setBlocksRemoved(prev => prev + 1);
          
          // Floating score
          addFloatingScore(points, clientX, clientY, true);
          
        } else {
          // Regular block tap - damages structure
          block.health--;
          
          if (block.health <= 0) {
            // Block removed but costs points
            const points = -25;
            scoreRef.current += points;
            setScore(Math.max(0, scoreRef.current));
            
            // Break combo
            comboRef.current = 0;
            setCombo(0);
            
            // Damage tower health
            setTowerHealth(prev => {
              const newHealth = prev - 5;
              if (newHealth <= 0) {
                endGame('Tower collapsed! Too much damage.');
              }
              return Math.max(0, newHealth);
            });
            
            removeBlock(block, false);
            addFloatingScore(points, clientX, clientY, false);
          } else {
            // Block damaged but not removed
            // Visual feedback - make it shake
            const material = block.mesh.material as THREE.MeshStandardMaterial;
            material.emissive = new THREE.Color(0xff4444);
            material.emissiveIntensity = 0.5;
            
            setTimeout(() => {
              if (material) {
                material.emissive = new THREE.Color(0x000000);
                material.emissiveIntensity = 0;
              }
            }, 200);
            
            // Small penalty
            const points = -10;
            scoreRef.current += points;
            setScore(Math.max(0, scoreRef.current));
            addFloatingScore(points, clientX, clientY, false);
            
            // Break combo
            comboRef.current = 0;
            setCombo(0);
          }
        }
        
        // Check for level completion (all weak points removed)
        checkLevelComplete();
      }
    } else {
      // Missed tap - small penalty
      const points = -5;
      scoreRef.current += points;
      setScore(Math.max(0, scoreRef.current));
      addFloatingScore(points, clientX, clientY, false);
      
      // Break combo
      comboRef.current = 0;
      setCombo(0);
    }
  }, [addFloatingScore]);

  // Remove block with physics
  const removeBlock = useCallback((block: Block, isWeakPoint: boolean) => {
    block.isRemoved = true;
    
    // Apply removal animation
    const material = block.mesh.material as THREE.MeshStandardMaterial;
    material.transparent = true;
    
    if (isWeakPoint) {
      // Sparkle effect for weak points
      material.emissive = new THREE.Color(0xffd700);
      material.emissiveIntensity = 1;
      
      // Animate out
      let opacity = 1;
      const fadeOut = () => {
        opacity -= 0.1;
        material.opacity = opacity;
        block.mesh.scale.multiplyScalar(0.9);
        
        if (opacity > 0) {
          requestAnimationFrame(fadeOut);
        } else {
          if (sceneRef.current) {
            sceneRef.current.remove(block.mesh);
          }
        }
      };
      fadeOut();
    } else {
      // Physics fall for regular blocks
      block.velocity.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 2,
        (Math.random() - 0.5) * 2
      );
      block.angularVelocity.set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
      block.grounded = false;
    }
    
    // Check blocks above for physics
    updatePhysics();
  }, []);

  // Update physics for falling blocks
  const updatePhysics = useCallback(() => {
    const gravity = -0.02;
    
    blocksRef.current.forEach(block => {
      if (block.isRemoved && !block.grounded) {
        // Apply gravity
        block.velocity.y += gravity;
        
        // Update position
        block.mesh.position.add(block.velocity);
        
        // Update rotation
        block.mesh.rotation.x += block.angularVelocity.x * 0.05;
        block.mesh.rotation.y += block.angularVelocity.y * 0.05;
        block.mesh.rotation.z += block.angularVelocity.z * 0.05;
        
        // Ground collision
        if (block.mesh.position.y < 0) {
          block.grounded = true;
          block.mesh.position.y = 0;
          
          // Fade out
          const material = block.mesh.material as THREE.MeshStandardMaterial;
          material.transparent = true;
          
          let opacity = 1;
          const fadeOut = () => {
            opacity -= 0.05;
            material.opacity = opacity;
            
            if (opacity > 0) {
              requestAnimationFrame(fadeOut);
            } else {
              if (sceneRef.current) {
                sceneRef.current.remove(block.mesh);
              }
            }
          };
          fadeOut();
        }
      }
    });
  }, []);

  // Check if level is complete
  const checkLevelComplete = useCallback(() => {
    const remainingWeakPoints = blocksRef.current.filter(b => b.isWeakPoint && !b.isRemoved);
    
    if (remainingWeakPoints.length === 0) {
      // Level complete!
      const levelBonus = level * 500;
      scoreRef.current += levelBonus;
      setScore(scoreRef.current);
      
      // Advance to next level
      setLevel(prev => prev + 1);
      
      // Clear current tower
      blocksRef.current.forEach(block => {
        if (sceneRef.current && block.mesh) {
          sceneRef.current.remove(block.mesh);
        }
      });
      
      // Build new tower
      if (sceneRef.current && rngRef.current) {
        blocksRef.current = buildTower(sceneRef.current, rngRef.current, level + 1);
      }
      
      // Restore some tower health
      setTowerHealth(prev => Math.min(100, prev + 20));
    }
  }, [level, buildTower]);

  // End game
  const endGame = useCallback(async (reason?: string) => {
    gameActiveRef.current = false;
    setGameState('gameover');
    
    // Stop music
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Calculate final score with bonuses
    const accuracyBonus = perfectTaps > 0 ? Math.round((perfectTaps / Math.max(tapsUsed, 1)) * 1000) : 0;
    const comboBonus = maxCombo * 50;
    const levelBonus = (level - 1) * 200;
    const healthBonus = Math.round(towerHealth * 5);
    
    const finalScore = scoreRef.current + accuracyBonus + comboBonus + levelBonus + healthBonus;
    setScore(finalScore);
    
    // Save score
    if (user?.id) {
      try {
        await supabase.from('game_history').insert({
          user_id: user.id,
          game_type: 'tower-tap',
          score: finalScore,
          is_practice: isPractice,
          competition_id: competitionId || null,
          metadata: {
            level,
            blocksRemoved,
            perfectTaps,
            tapsUsed,
            maxCombo,
            towerHealth,
            accuracyBonus,
            theme
          }
        });
        
        // Audit log for competitive games
        if (!isPractice) {
          await supabase.from('game_audit_log').insert({
            user_id: user.id,
            game_type: 'tower-tap',
            action: 'game_complete',
            score: finalScore,
            metadata: {
              level,
              blocksRemoved,
              perfectTaps,
              tapsUsed,
              maxCombo,
              towerHealth,
              seed: rngRef.current?.['seed'],
              theme
            }
          });
        }
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  }, [user, isPractice, competitionId, perfectTaps, tapsUsed, maxCombo, level, blocksRemoved, towerHealth, theme]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameActiveRef.current) return;
    
    // Update physics
    updatePhysics();
    
    // Animate weak points (pulse effect)
    blocksRef.current.forEach(block => {
      if (block.isWeakPoint && !block.isRemoved) {
        const material = block.mesh.material as THREE.MeshStandardMaterial;
        const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.3;
        material.emissiveIntensity = pulse;
      }
    });
    
    // Render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [updatePhysics]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame('Time\'s up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState, endGame]);

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTapsUsed(0);
    setBlocksRemoved(0);
    setTowerHealth(100);
    setTimeLeft(90);
    setLevel(1);
    setPerfectTaps(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    gameActiveRef.current = true;
    
    // Initialize scene if needed
    if (!sceneRef.current) {
      initScene();
    }
    
    // Start game loop
    gameLoop();
    
    // Play music
    const musicFile = theme === 'halloween' 
      ? '/tower-tap-halloween.mp3' 
      : theme === 'christmas' 
        ? '/tower-tap-christmas.mp3' 
        : '/tower-tap.mp3';
    
    audioRef.current = new Audio(musicFile);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.play().catch(() => {});
  }, [initScene, gameLoop, theme]);

  // Setup event listeners
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;
    
    canvas.addEventListener('click', handleTap);
    canvas.addEventListener('touchstart', handleTap, { passive: false });
    
    return () => {
      canvas.removeEventListener('click', handleTap);
      canvas.removeEventListener('touchstart', handleTap);
    };
  }, [gameState, handleTap]);

  // Initialize on mount
  useEffect(() => {
    if (gameState === 'instructions') {
      initScene();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = getThemeColors();

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-xl overflow-hidden">
      {/* Game Canvas Container */}
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
          <div className="flex justify-between items-start">
            {/* Left: Score & Combo */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-2xl font-bold" style={{ color: colors.text }}>
                {score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">SCORE</div>
              {combo > 0 && (
                <div className="mt-1 text-yellow-400 font-bold animate-pulse">
                  {combo}x COMBO
                </div>
              )}
            </div>
            
            {/* Center: Timer */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
              <div className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>
            
            {/* Right: Stats */}
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 border border-white/10 text-right">
              <div className="text-lg font-bold text-white">Level {level}</div>
              <div className="text-xs text-gray-400">{blocksRemoved} blocks</div>
              <div className="w-24 h-2 bg-gray-700 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all"
                  style={{ width: `${towerHealth}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">Tower Health</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Scores */}
      {floatingScores.map(score => (
        <div
          key={score.id}
          className="absolute pointer-events-none font-bold text-xl animate-bounce"
          style={{
            left: score.x,
            top: score.y,
            color: score.color,
            transform: 'translate(-50%, -50%)',
            textShadow: '0 0 10px currentColor',
            animation: 'floatUp 1.5s ease-out forwards'
          }}
        >
          {score.text}
        </div>
      ))}
      
      {/* Instructions */}
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h1 className="text-3xl font-bold mb-4" style={{ color: colors.text }}>
              🏗️ Tower Tap: Collapse
            </h1>
            
            <div className="space-y-4 text-left text-gray-300 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-white">Tap Weak Points</div>
                  <div className="text-sm">Glowing blocks are weak points - tap them for +100 points!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-white">Avoid Regular Blocks</div>
                  <div className="text-sm">Tapping normal blocks damages the tower and costs points!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="font-bold text-white">Build Combos</div>
                  <div className="text-sm">Chain perfect taps for combo multipliers!</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="text-2xl">📈</span>
                <div>
                  <div className="font-bold text-white">Level Up</div>
                  <div className="text-sm">Clear all weak points to advance to harder towers!</div>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mb-4">
              {isPractice ? '🎮 Practice Mode' : '🏆 Competitive Mode'}
              {theme !== 'default' && ` • ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme`}
            </div>
            
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl font-bold text-xl text-white transition-all transform hover:scale-105"
              style={{ 
                background: `linear-gradient(135deg, ${colors.text}, ${colors.accent})`,
                boxShadow: `0 0 30px ${colors.text}40`
              }}
            >
              START GAME
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900/90 border border-white/20 rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Game Over!</h2>
            
            <div className="text-5xl font-bold my-6" style={{ color: colors.text }}>
              {score.toLocaleString()}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-left mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Level Reached</div>
                <div className="text-2xl font-bold text-white">{level}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Blocks Removed</div>
                <div className="text-2xl font-bold text-white">{blocksRemoved}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Perfect Taps</div>
                <div className="text-2xl font-bold text-green-400">{perfectTaps}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Max Combo</div>
                <div className="text-2xl font-bold text-yellow-400">{maxCombo}x</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Accuracy</div>
                <div className="text-2xl font-bold text-blue-400">
                  {tapsUsed > 0 ? Math.round((perfectTaps / tapsUsed) * 100) : 0}%
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-sm">Tower Health</div>
                <div className="text-2xl font-bold text-red-400">{towerHealth}%</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Reset and restart
                  if (sceneRef.current) {
                    blocksRef.current.forEach(b => sceneRef.current?.remove(b.mesh));
                    blocksRef.current = [];
                  }
                  
                  // Reinitialize RNG with same seed
                  const today = new Date();
                  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
                  rngRef.current = new SeededRandom(seed);
                  
                  if (sceneRef.current && rngRef.current) {
                    blocksRef.current = buildTower(sceneRef.current, rngRef.current, 1);
                  }
                  
                  startGame();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold transition-all"
              >
                Play Again
              </button>
              <button
                onClick={() => window.location.href = '/games'}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Float animation style */}
      <style jsx>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}

