import React, { useState, useRef, useEffect, useCallback } from 'react';
// Sound effects will be added later

interface TetrisBlock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: 'gold' | 'silver' | 'bronze' | 'cash';
  isFalling: boolean;
  isGrabbed: boolean;
  rotation: number;
}

interface GameState {
  score: number;
  level: number;
  blocks: TetrisBlock[];
  gameOver: boolean;
  gameStarted: boolean;
  perfectStacks: number;
  totalStacks: number;
  gameStartTime: number;
  difficultyLevel: number;
  grabbedBlock: TetrisBlock | null;
  mouseX: number;
  mouseY: number;
}

interface CashStackGameProps {
  onGameEnd: (result: { score: number; accuracy: number }) => void;
  onExit: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
  gameId?: string;
}

const CashStackGame: React.FC<CashStackGameProps> = ({
  onGameEnd,
  onExit,
  isCompetitionMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [gameData, setGameData] = useState<GameState>({
    score: 0,
    level: 1,
    blocks: [],
    gameOver: false,
    gameStarted: false,
    perfectStacks: 0,
    totalStacks: 0,
    gameStartTime: 0,
    difficultyLevel: 1,
    grabbedBlock: null,
    mouseX: 0,
    mouseY: 0
  });

  // Game constants
  const CANVAS_WIDTH = window.innerWidth;
  const CANVAS_HEIGHT = window.innerHeight;
  const BLOCK_SIZE = 30;
  const GRID_WIDTH = Math.floor(CANVAS_WIDTH / BLOCK_SIZE);
  const GRID_HEIGHT = Math.floor(CANVAS_HEIGHT / BLOCK_SIZE);
  const GROUND_Y = CANVAS_HEIGHT - BLOCK_SIZE * 3;

  const COLORS = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    cash: '#00FF00'
  };

  // Generate new falling block
  const generateBlock = useCallback((): TetrisBlock => {
    const colors: ('gold' | 'silver' | 'bronze' | 'cash')[] = ['gold', 'silver', 'bronze', 'cash'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * (CANVAS_WIDTH - BLOCK_SIZE),
      y: -BLOCK_SIZE,
      width: BLOCK_SIZE,
      height: BLOCK_SIZE,
      color,
      isFalling: true,
      isGrabbed: false,
      rotation: 0
    };
  }, []);

  // Check if block can move to position
  const canMoveTo = useCallback((block: TetrisBlock, newX: number, newY: number): boolean => {
    // Check boundaries
    if (newX < 0 || newX + BLOCK_SIZE > CANVAS_WIDTH) return false;
    if (newY + BLOCK_SIZE > CANVAS_HEIGHT) return false;
    
    // Check collision with other blocks
    return !gameData.blocks.some(otherBlock => 
      otherBlock.id !== block.id &&
      !otherBlock.isFalling &&
      newX < otherBlock.x + otherBlock.width &&
      newX + BLOCK_SIZE > otherBlock.x &&
      newY < otherBlock.y + otherBlock.height &&
      newY + BLOCK_SIZE > otherBlock.y
    );
  }, [gameData.blocks]);

  // Check for color matches and explosions
  const checkMatches = useCallback(() => {
    const newBlocks = [...gameData.blocks];
    let scoreIncrease = 0;
    let perfectStacksIncrease = 0;
    let totalStacksIncrease = 0;

    // Group blocks by color and check for matches
    const colorGroups = {
      gold: newBlocks.filter(b => b.color === 'gold' && !b.isFalling),
      silver: newBlocks.filter(b => b.color === 'silver' && !b.isFalling),
      bronze: newBlocks.filter(b => b.color === 'bronze' && !b.isFalling),
      cash: newBlocks.filter(b => b.color === 'cash' && !b.isFalling)
    };

    // Check for cash explosions
    colorGroups.cash.forEach(cashBlock => {
      const nearbyBlocks = newBlocks.filter(block => 
        block.id !== cashBlock.id &&
        Math.abs(block.x - cashBlock.x) < BLOCK_SIZE * 2 &&
        Math.abs(block.y - cashBlock.y) < BLOCK_SIZE * 2
      );
      
      if (nearbyBlocks.length > 0) {
        // Explosion! Remove nearby blocks
        nearbyBlocks.forEach(block => {
          const index = newBlocks.findIndex(b => b.id === block.id);
          if (index !== -1) {
            newBlocks.splice(index, 1);
            scoreIncrease += 100;
          }
        });
        
        // Remove the cash block too
        const cashIndex = newBlocks.findIndex(b => b.id === cashBlock.id);
        if (cashIndex !== -1) {
          newBlocks.splice(cashIndex, 1);
          scoreIncrease += 50;
        }
        
        console.log('🎉 Success chime!');
      }
    });

    // Check for color matches (3+ blocks of same color touching)
    Object.entries(colorGroups).forEach(([color, blocks]) => {
      if (color === 'cash') return; // Already handled above
      
      const groups = [];
      const processed = new Set<number>();
      
      blocks.forEach(block => {
        if (processed.has(block.id)) return;
        
        const group = [block];
        processed.add(block.id);
        
        // Find connected blocks
        const findConnected = (currentBlock: TetrisBlock) => {
          blocks.forEach(otherBlock => {
            if (processed.has(otherBlock.id)) return;
            
            const distance = Math.sqrt(
              (currentBlock.x - otherBlock.x) ** 2 + 
              (currentBlock.y - otherBlock.y) ** 2
            );
            
            if (distance < BLOCK_SIZE * 1.5) {
              group.push(otherBlock);
              processed.add(otherBlock.id);
              findConnected(otherBlock);
            }
          });
        };
        
        findConnected(block);
        
        if (group.length >= 3) {
          groups.push(group);
        }
      });
      
      // Remove matched groups
      groups.forEach(group => {
        group.forEach(block => {
          const index = newBlocks.findIndex(b => b.id === block.id);
          if (index !== -1) {
            newBlocks.splice(index, 1);
            scoreIncrease += group.length * 25;
            totalStacksIncrease++;
            
            if (group.length >= 5) {
              perfectStacksIncrease++;
            }
          }
        });
        
        console.log('💰 Coins falling!');
      });
    });

    if (scoreIncrease > 0) {
      setGameData(prev => ({
        ...prev,
        blocks: newBlocks,
        score: prev.score + scoreIncrease,
        perfectStacks: prev.perfectStacks + perfectStacksIncrease,
        totalStacks: prev.totalStacks + totalStacksIncrease
      }));
    }
  }, [gameData.blocks]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameState !== 'playing' || gameData.gameOver) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      return;
    }

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    setGameData(prev => {
      const newState = { ...prev };
      
      // Move falling blocks down
      newState.blocks = newState.blocks.map(block => {
        if (block.isFalling && !block.isGrabbed) {
          const newY = block.y + 2; // Fall speed
          
          if (canMoveTo(block, block.x, newY)) {
            return { ...block, y: newY };
          } else {
            // Block has landed
            return { ...block, isFalling: false, y: Math.floor(block.y / BLOCK_SIZE) * BLOCK_SIZE };
          }
        }
        return block;
      });
      
      // Spawn new blocks
      const spawnChance = 0.01 + (newState.difficultyLevel * 0.005);
      if (Math.random() < spawnChance) {
        newState.blocks.push(generateBlock());
      }
      
      // Level up based on score
      const newLevel = Math.floor(newState.score / 200) + 1;
      if (newLevel > newState.level) {
        newState.level = newLevel;
        newState.difficultyLevel = newLevel;
        console.log('🎉 Success chime!');
      }
      
      return newState;
    });
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameData.gameOver, generateBlock, canMoveTo]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setGameData(prev => {
      const newState = { ...prev, mouseX, mouseY };
      
      // Move grabbed block with mouse
      if (newState.grabbedBlock) {
        const block = newState.grabbedBlock;
        const newX = mouseX - BLOCK_SIZE / 2;
        const newY = mouseY - BLOCK_SIZE / 2;
        
        if (canMoveTo(block, newX, newY)) {
          newState.grabbedBlock = { ...block, x: newX, y: newY };
        }
      }
      
      return newState;
    });
  }, [gameState, canMoveTo]);

  // Handle mouse down (grab block)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setGameData(prev => {
      // Find block under mouse
      const clickedBlock = prev.blocks.find(block => 
        mouseX >= block.x && mouseX <= block.x + block.width &&
        mouseY >= block.y && mouseY <= block.y + block.height
      );
      
      if (clickedBlock) {
        return {
          ...prev,
          grabbedBlock: { ...clickedBlock, isGrabbed: true },
          mouseX,
          mouseY
        };
      }
      
      return prev;
    });
  }, [gameState]);

  // Handle mouse up (drop block)
  const handleMouseUp = useCallback(() => {
    if (gameState !== 'playing' || !gameData.grabbedBlock) return;
    
    setGameData(prev => {
      const newState = { ...prev };
      
      if (newState.grabbedBlock) {
        // Snap to grid
        const snappedX = Math.floor(newState.grabbedBlock.x / BLOCK_SIZE) * BLOCK_SIZE;
        const snappedY = Math.floor(newState.grabbedBlock.y / BLOCK_SIZE) * BLOCK_SIZE;
        
        // Update the block in the blocks array
        newState.blocks = newState.blocks.map(block => 
          block.id === newState.grabbedBlock!.id 
            ? { ...block, x: snappedX, y: snappedY, isGrabbed: false, isFalling: false }
            : block
        );
        
        newState.grabbedBlock = null;
        
        // Check for matches after dropping
        setTimeout(() => checkMatches(), 100);
      }
      
      return newState;
    });
  }, [gameState, gameData.grabbedBlock, checkMatches]);

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // Draw blocks
    gameData.blocks.forEach(block => {
      ctx.save();
      
      // Set color based on block type
      let blockColor = COLORS[block.color];
      
      // Create gradient for shiny effect
      const gradient = ctx.createLinearGradient(block.x, block.y, block.x + BLOCK_SIZE, block.y + BLOCK_SIZE);
      gradient.addColorStop(0, blockColor);
      gradient.addColorStop(0.3, lightenColor(blockColor, 20));
      gradient.addColorStop(0.7, blockColor);
      gradient.addColorStop(1, darkenColor(blockColor, 20));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
      
      // Add highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(block.x + 2, block.y + 2, BLOCK_SIZE / 3, BLOCK_SIZE / 3);
      
      // Add border
      ctx.strokeStyle = darkenColor(blockColor, 30);
      ctx.lineWidth = 2;
      ctx.strokeRect(block.x, block.y, BLOCK_SIZE, BLOCK_SIZE);
      
      // Add color indicator
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(block.color[0].toUpperCase(), block.x + BLOCK_SIZE/2, block.y + BLOCK_SIZE/2);
      
      // Highlight grabbed block
      if (block.isGrabbed) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(block.x - 2, block.y - 2, BLOCK_SIZE + 4, BLOCK_SIZE + 4);
      }
      
      ctx.restore();
    });
    
    // Draw UI
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameData.score}`, 20, 40);
    ctx.fillText(`Level: ${gameData.level}`, 20, 70);
    ctx.fillText(`Perfect Stacks: ${gameData.perfectStacks}`, 20, 100);
    ctx.fillText(`Total Stacks: ${gameData.totalStacks}`, 20, 130);
    
    // Draw instructions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Click and drag blocks to stack!', CANVAS_WIDTH - 300, 40);
    ctx.fillText('Match colors for points!', CANVAS_WIDTH - 300, 70);
    ctx.fillText('Cash blocks explode when touching others!', CANVAS_WIDTH - 300, 100);
  }, [gameData]);

  // Helper functions for color manipulation
  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const darkenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  };

  // Start render loop
  useEffect(() => {
    if (gameState === 'playing') {
      const renderLoop = () => {
        render();
        if (gameState === 'playing') {
          requestAnimationFrame(renderLoop);
        }
      };
      renderLoop();
    }
  }, [gameState, render]);

  // Start game
  const handleStartGame = () => {
    setShowCountdown(true);
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          setGameState('playing');
          setGameData(prev => ({
            ...prev,
            gameStarted: true,
            gameStartTime: Date.now(),
            difficultyLevel: 1,
            blocks: [generateBlock()]
          }));
          lastTimeRef.current = performance.now();
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // End game
  const endGame = useCallback(() => {
    if (gameState === 'ended' || gameData.gameOver) {
      return;
    }
    
    setGameState('ended');
    setGameData(prev => ({ ...prev, gameOver: true }));
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
    
    const accuracy = gameData.totalStacks > 0 ? 
      (gameData.perfectStacks / gameData.totalStacks) * 100 : 100;
    
    onGameEnd({ score: gameData.score, accuracy });
  }, [gameState, gameData.gameOver, gameData.totalStacks, gameData.perfectStacks, gameData.score, onGameEnd]);

  // Check for game over
  useEffect(() => {
    if (gameData.blocks.some(block => block.y <= 0 && !block.isFalling)) {
      endGame();
    }
  }, [gameData.blocks, endGame]);

  // Lock screen during gameplay
  useEffect(() => {
    if (gameState === 'playing') {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, [gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-900 via-emerald-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-full overflow-y-auto text-center border border-white/20 shadow-2xl">
          {/* Background effects */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-emerald-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>

          <div className="relative z-10">
            {/* Game Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">💰</span>
            </div>

            {/* Game Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
              Cash Stack Challenge
            </h2>
            <p className="text-green-200 text-sm mb-4 sm:mb-6 font-medium">
              Tetris-Style Block Stacking Game
            </p>

            {/* Epilepsy Warning */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-600 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-white text-sm sm:text-lg font-black">⚠️</span>
                </div>
                <p className="text-white font-black text-lg sm:text-xl tracking-wide">EPILEPSY WARNING</p>
              </div>
              <p className="text-sm sm:text-base text-white font-semibold leading-relaxed">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>

            {/* Instructions */}
            <div className="text-left text-sm sm:text-base text-white mb-6 sm:mb-8 space-y-4 bg-gradient-to-r from-green-800 to-green-900 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border-2 border-green-600 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-lg font-black">!</span>
                </div>
                <h3 className="text-white font-black text-lg sm:text-xl">HOW TO PLAY:</h3>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Click & Drag:</span> Grab blocks and move them around</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Color Match:</span> Stack same colors together for points</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Cash Explosions:</span> Cash blocks explode when touching others</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Perfect Stacks:</span> 5+ blocks = perfect stack bonus</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-green-300 font-bold">Goal:</span> Score as many points as possible!</p>
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-gradient-to-r from-green-600/30 to-green-500/30 border border-green-400/50 rounded-lg p-3 mt-4">
              <p className="text-xs sm:text-sm text-green-200">
                <span className="text-green-300 font-bold">💡 Pro Tip:</span> Cash blocks are explosive! Use them strategically to clear large areas.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
              {!isCompetitionMode && onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform text-sm sm:text-base"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className={`${isCompetitionMode ? 'w-full' : 'flex-1'} bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform text-lg sm:text-xl border-2 border-green-400 hover:border-green-300 relative z-20`}
              >
                💰 START STACKING 💰
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCountdown) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-12 text-center max-w-md w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Cash Stack Challenge</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8">Stack blocks and create explosive combinations!</p>
          <div className="text-6xl sm:text-8xl font-bold text-green-500 animate-pulse">{countdown}</div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4">Get ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-screen h-screen cursor-grab"
        style={{ imageRendering: 'pixelated' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      />
    </div>
  );
};

export default CashStackGame;