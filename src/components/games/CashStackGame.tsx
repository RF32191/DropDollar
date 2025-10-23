import React, { useState, useRef, useEffect, useCallback } from 'react';

// Cash/Gold bar piece shapes with different sizes
const PIECES = [
  // I piece - Large gold bars
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  // O piece - Medium gold bars
  [
    [1, 1],
    [1, 1]
  ],
  // T piece - Mixed sizes
  [
    [0, 2, 0],
    [2, 2, 2],
    [0, 0, 0]
  ],
  // S piece - Small gold bars
  [
    [0, 3, 3],
    [3, 3, 0],
    [0, 0, 0]
  ],
  // Z piece - Small gold bars
  [
    [3, 3, 0],
    [0, 3, 3],
    [0, 0, 0]
  ],
  // J piece - Mixed sizes
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0]
  ],
  // L piece - Mixed sizes
  [
    [0, 0, 2],
    [2, 2, 2],
    [0, 0, 0]
  ]
];

// Different bar types: 1=Large Gold, 2=Medium Gold, 3=Small Gold, 4=Silver, 5=Bronze
const BAR_TYPES = {
  1: { color: '#FFD700', name: 'Large Gold', value: 100, size: 'large' },
  2: { color: '#FFA500', name: 'Medium Gold', value: 75, size: 'medium' },
  3: { color: '#FF8C00', name: 'Small Gold', value: 50, size: 'small' },
  4: { color: '#C0C0C0', name: 'Silver', value: 30, size: 'medium' },
  5: { color: '#CD7F32', name: 'Bronze', value: 20, size: 'small' }
};

interface Piece {
  shape: number[][];
  x: number;
  y: number;
  id: string;
}

interface Explosion {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  type: 'cash' | 'row' | 'landing';
}

interface GameState {
  board: number[][];
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  dropTime: number;
  lastTime: number;
  explosions: Explosion[];
  grabbedPiece: Piece | null;
  isGrabbing: boolean;
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
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Game constants
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const CELL_SIZE = 35;
  const CANVAS_WIDTH = BOARD_WIDTH * CELL_SIZE;
  const CANVAS_HEIGHT = BOARD_HEIGHT * CELL_SIZE;
  
  const [gameData, setGameData] = useState<GameState>({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
    currentPiece: null,
    nextPiece: null,
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    dropTime: 1000,
    lastTime: 0,
    explosions: [],
    grabbedPiece: null,
    isGrabbing: false
  });

  // Create a new piece with random bar types
  const createPiece = useCallback((): Piece => {
    const shapeIndex = Math.floor(Math.random() * PIECES.length);
    const baseShape = PIECES[shapeIndex];
    
    // Convert shape to use different bar types
    const newShape = baseShape.map(row => 
      row.map(cell => {
        if (cell === 0) return 0;
        // Randomly assign bar types (1-5)
        return Math.floor(Math.random() * 5) + 1;
      })
    );
    
    return {
      shape: newShape,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newShape[0].length / 2),
      y: 0,
      id: `piece_${Date.now()}_${Math.random()}`
    };
  }, []);

  // Check if piece can be placed at position
  const isValidPosition = useCallback((piece: Piece, board: number[][], dx: number = 0, dy: number = 0): boolean => {
    const newX = piece.x + dx;
    const newY = piece.y + dy;

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = newX + x;
          const boardY = newY + y;

          // Check boundaries
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }

          // Check collision with existing blocks
          if (boardY >= 0 && board[boardY][boardX]) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  // Place piece on board
  const placePiece = useCallback((piece: Piece, board: number[][]): number[][] => {
    const newBoard = board.map(row => [...row]);
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = piece.x + x;
          const boardY = piece.y + y;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.shape[y][x];
          }
        }
      }
    }
    
    return newBoard;
  }, []);

  // Clear completed lines and create explosions
  const clearLines = useCallback((board: number[][]): { newBoard: number[][]; linesCleared: number; explosions: Explosion[] } => {
    const newBoard = board.filter(row => row.some(cell => cell === 0));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    const explosions: Explosion[] = [];
    
    // Create explosions for cleared lines
    if (linesCleared > 0) {
      for (let i = 0; i < linesCleared; i++) {
        const clearedRow = board[i];
        let goldCount = 0;
        
        // Count gold bars in the cleared row
        clearedRow.forEach(cell => {
          if (cell >= 1 && cell <= 3) goldCount++; // Gold bars (1-3)
        });
        
        // Create explosion for each cell in the cleared row
        for (let x = 0; x < BOARD_WIDTH; x++) {
          explosions.push({
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: i * CELL_SIZE + CELL_SIZE / 2,
            life: 30,
            maxLife: 30,
            type: 'row'
          });
        }
      }
    }
    
    // Add empty lines at the top
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { newBoard, linesCleared, explosions };
  }, []);

  // Rotate piece
  const rotatePiece = useCallback((piece: Piece): Piece => {
    const rotated = piece.shape[0].map((_, index) =>
      piece.shape.map(row => row[index]).reverse()
    );
    return { ...piece, shape: rotated };
  }, []);

  // Move piece
  const movePiece = useCallback((dx: number, dy: number) => {
    setGameData(prev => {
      if (!prev.currentPiece) return prev;
      
      const newPiece = { ...prev.currentPiece, x: prev.currentPiece.x + dx, y: prev.currentPiece.y + dy };
      
      if (isValidPosition(newPiece, prev.board)) {
        return { ...prev, currentPiece: newPiece };
      }
      
      return prev;
    });
  }, [isValidPosition]);

  // Drop piece
  const dropPiece = useCallback(() => {
    setGameData(prev => {
      if (!prev.currentPiece) return prev;
      
      const newPiece = { ...prev.currentPiece, y: prev.currentPiece.y + 1 };
      
      if (isValidPosition(newPiece, prev.board)) {
        return { ...prev, currentPiece: newPiece };
      } else {
        // Piece can't move down, place it
        const newBoard = placePiece(prev.currentPiece, prev.board);
        const { newBoard: clearedBoard, linesCleared, explosions } = clearLines(newBoard);
        
        // Create landing explosions
        const landingExplosions: Explosion[] = [];
        for (let y = 0; y < prev.currentPiece.shape.length; y++) {
          for (let x = 0; x < prev.currentPiece.shape[y].length; x++) {
            if (prev.currentPiece.shape[y][x]) {
              const boardX = prev.currentPiece.x + x;
              const boardY = prev.currentPiece.y + y;
              if (boardY >= 0) {
                landingExplosions.push({
                  x: boardX * CELL_SIZE + CELL_SIZE / 2,
                  y: boardY * CELL_SIZE + CELL_SIZE / 2,
                  life: 20,
                  maxLife: 20,
                  type: 'landing'
                });
              }
            }
          }
        }
        
        // Calculate score based on gold bars
        let scoreIncrease = 0;
        if (linesCleared > 0) {
          // Count gold bars in cleared lines for bonus
          let goldBarsInClearedLines = 0;
          for (let i = 0; i < linesCleared; i++) {
            const clearedRow = prev.board[i];
            clearedRow.forEach(cell => {
              if (cell >= 1 && cell <= 3) goldBarsInClearedLines++; // Gold bars
            });
          }
          scoreIncrease = linesCleared * 100 * prev.level + goldBarsInClearedLines * 50;
        }
        
        // Create next piece
        const nextPiece = prev.nextPiece || createPiece();
        const currentPiece = createPiece();
        
        // Check game over
        if (!isValidPosition(currentPiece, clearedBoard)) {
          return { ...prev, gameOver: true };
        }
        
        return {
          ...prev,
          board: clearedBoard,
          currentPiece,
          nextPiece,
          score: prev.score + scoreIncrease,
          lines: prev.lines + linesCleared,
          level: Math.floor((prev.lines + linesCleared) / 10) + 1,
          dropTime: Math.max(50, 1000 - (prev.level * 50)),
          explosions: [...prev.explosions, ...explosions, ...landingExplosions]
        };
      }
    });
  }, [isValidPosition, placePiece, clearLines, createPiece]);

  // Rotate current piece
  const rotateCurrentPiece = useCallback(() => {
    setGameData(prev => {
      if (!prev.currentPiece) return prev;
      
      const rotatedPiece = rotatePiece(prev.currentPiece);
      
      if (isValidPosition(rotatedPiece, prev.board)) {
        return { ...prev, currentPiece: rotatedPiece };
      }
      
      return prev;
    });
  }, [isValidPosition, rotatePiece]);

  // Handle mouse click for grabbing and rotating
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on current piece
    if (gameData.currentPiece) {
      const pieceX = gameData.currentPiece.x * CELL_SIZE;
      const pieceY = gameData.currentPiece.y * CELL_SIZE;
      
      // Check if click is within piece bounds
      if (x >= pieceX && x <= pieceX + gameData.currentPiece.shape[0].length * CELL_SIZE &&
          y >= pieceY && y <= pieceY + gameData.currentPiece.shape.length * CELL_SIZE) {
        
        // Right click or double click for rotation
        if (e.detail === 2 || e.button === 2) {
          rotateCurrentPiece();
        } else {
          // Left click for grabbing (future feature)
          console.log('Grabbing piece:', gameData.currentPiece.id);
        }
      }
    }
  }, [gameState, gameData.currentPiece, rotateCurrentPiece]);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameState !== 'playing' || gameData.gameOver) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      return;
    }

    const deltaTime = currentTime - gameData.lastTime;
    
    if (deltaTime >= gameData.dropTime) {
      dropPiece();
      setGameData(prev => ({ ...prev, lastTime: currentTime }));
    }
    
    // Update explosions
    setGameData(prev => ({
      ...prev,
      explosions: prev.explosions.filter(explosion => explosion.life > 0).map(explosion => ({
        ...explosion,
        life: explosion.life - 1
      }))
    }));
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameData.gameOver, gameData.lastTime, gameData.dropTime, dropPiece]);

  // Handle keyboard input
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        movePiece(1, 0);
        break;
      case 'ArrowDown':
        e.preventDefault();
        dropPiece();
        break;
      case 'ArrowUp':
      case ' ':
        e.preventDefault();
        rotateCurrentPiece();
        break;
    }
  }, [gameState, movePiece, dropPiece, rotateCurrentPiece]);

  // Draw gold bar with realistic 3D effect
  const drawGoldBar = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, barType: number, size: number = CELL_SIZE) => {
    const barInfo = BAR_TYPES[barType as keyof typeof BAR_TYPES];
    if (!barInfo) return;
    
    ctx.save();
    
    // Create gradient for realistic gold effect
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, barInfo.color);
    gradient.addColorStop(0.3, '#FFA500');
    gradient.addColorStop(0.7, '#FF8C00');
    gradient.addColorStop(1, '#B8860B');
    
    // Draw main bar
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);
    
    // Add highlight for 3D effect
    const highlightGradient = ctx.createLinearGradient(x, y, x + size/3, y + size/3);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(x + 2, y + 2, size/3, size/3);
    
    // Add shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 2, y + 2, size, size);
    
    // Draw border
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
    
    // Add inner border for depth
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    
    ctx.restore();
  }, []);

  // Draw explosion effect
  const drawExplosion = useCallback((ctx: CanvasRenderingContext2D, explosion: Explosion) => {
    const alpha = explosion.life / explosion.maxLife;
    const size = (1 - alpha) * 50;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Different explosion colors based on type
    let color = '#FFD700';
    if (explosion.type === 'row') color = '#FF6B6B';
    if (explosion.type === 'landing') color = '#32CD32';
    
    // Draw explosion particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = size * (0.5 + Math.random() * 0.5);
      const particleX = explosion.x + Math.cos(angle) * distance;
      const particleY = explosion.y + Math.sin(angle) * distance;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw center explosion
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, []);

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH + 200, CANVAS_HEIGHT);
    
    // Draw background with cash pattern
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH + 200, CANVAS_HEIGHT);
    
    // Draw cash pattern background
    ctx.fillStyle = '#2a2a2a';
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.fillRect(x, y, 20, 20);
      }
    }
    
    // Draw board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (gameData.board[y][x]) {
          drawGoldBar(ctx, x * CELL_SIZE, y * CELL_SIZE, gameData.board[y][x]);
        }
      }
    }
    
    // Draw current piece
    if (gameData.currentPiece) {
      for (let y = 0; y < gameData.currentPiece.shape.length; y++) {
        for (let x = 0; x < gameData.currentPiece.shape[y].length; x++) {
          if (gameData.currentPiece.shape[y][x]) {
            const drawX = (gameData.currentPiece.x + x) * CELL_SIZE;
            const drawY = (gameData.currentPiece.y + y) * CELL_SIZE;
            drawGoldBar(ctx, drawX, drawY, gameData.currentPiece.shape[y][x]);
          }
        }
      }
    }
    
    // Draw next piece preview
    if (gameData.nextPiece) {
      ctx.globalAlpha = 0.7;
      for (let y = 0; y < gameData.nextPiece.shape.length; y++) {
        for (let x = 0; x < gameData.nextPiece.shape[y].length; x++) {
          if (gameData.nextPiece.shape[y][x]) {
            const drawX = (x + BOARD_WIDTH + 1) * CELL_SIZE;
            const drawY = (y + 2) * CELL_SIZE;
            drawGoldBar(ctx, drawX, drawY, gameData.nextPiece.shape[y][x]);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    
    // Draw explosions
    gameData.explosions.forEach(explosion => {
      drawExplosion(ctx, explosion);
    });
    
    // Draw UI
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`💰 Score: $${gameData.score.toLocaleString()}`, CANVAS_WIDTH + 20, 40);
    ctx.fillText(`📊 Level: ${gameData.level}`, CANVAS_WIDTH + 20, 80);
    ctx.fillText(`📈 Lines: ${gameData.lines}`, CANVAS_WIDTH + 20, 120);
    
    // Draw controls
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.fillText('🎮 Controls:', CANVAS_WIDTH + 20, 200);
    ctx.fillText('← → Move', CANVAS_WIDTH + 20, 230);
    ctx.fillText('↓ Drop', CANVAS_WIDTH + 20, 250);
    ctx.fillText('↑ Rotate', CANVAS_WIDTH + 20, 270);
    ctx.fillText('Click: Grab', CANVAS_WIDTH + 20, 290);
    ctx.fillText('Double Click: Rotate', CANVAS_WIDTH + 20, 310);
    
    // Draw bar types legend
    ctx.fillText('💎 Bar Types:', CANVAS_WIDTH + 20, 350);
    Object.entries(BAR_TYPES).forEach(([key, bar], index) => {
      ctx.fillStyle = bar.color;
      ctx.fillRect(CANVAS_WIDTH + 20, 380 + index * 25, 15, 15);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${bar.name} (${bar.value}pts)`, CANVAS_WIDTH + 45, 390 + index * 25);
    });
  }, [gameData, drawGoldBar, drawExplosion]);

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
            board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
            currentPiece: createPiece(),
            nextPiece: createPiece(),
            score: 0,
            level: 1,
            lines: 0,
            gameOver: false,
            dropTime: 1000,
            lastTime: performance.now(),
            explosions: [],
            grabbedPiece: null,
            isGrabbing: false
          }));
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle game over
  useEffect(() => {
    if (gameData.gameOver && gameState === 'playing') {
      setGameState('ended');
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
      
      const accuracy = 100; // Tetris doesn't have accuracy concept
      onGameEnd({ score: gameData.score, accuracy });
    }
  }, [gameData.gameOver, gameState, gameData.score, onGameEnd]);

  // Add keyboard event listeners
  useEffect(() => {
    if (gameState === 'playing') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState, handleKeyPress]);

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
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-900 via-yellow-800 to-yellow-700 bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-full overflow-y-auto text-center border border-white/20 shadow-2xl">
          {/* Background effects */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-yellow-400/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>

          <div className="relative z-10">
            {/* Game Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">💰</span>
            </div>

            {/* Game Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
              Cash Stack Tetris
            </h2>
            <p className="text-yellow-200 text-sm mb-4 sm:mb-6 font-medium">
              Stack Gold Bars & Watch Them Explode!
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
            <div className="text-left text-sm sm:text-base text-white mb-6 sm:mb-8 space-y-4 bg-gradient-to-r from-yellow-800 to-yellow-900 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border-2 border-yellow-600 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-lg font-black">!</span>
                </div>
                <h3 className="text-white font-black text-lg sm:text-xl">HOW TO PLAY:</h3>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-bold">Arrow Keys:</span> Move and rotate gold bars</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                    <p><span className="text-yellow-300 font-bold">Click:</span> Grab pieces to move them</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-bold">Double Click:</span> Rotate pieces</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-bold">Complete Rows:</span> Watch gold bars explode!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-yellow-300 font-bold">More Gold = More Points:</span> Gold bars give bonus points!</p>
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-gradient-to-r from-yellow-600/30 to-yellow-500/30 border border-yellow-400/50 rounded-lg p-3 mt-4">
              <p className="text-xs sm:text-sm text-yellow-200">
                <span className="text-yellow-300 font-bold">💡 Pro Tip:</span> Mix different gold bar sizes for maximum explosion effects and points!
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
                className={`${isCompetitionMode ? 'w-full' : 'flex-1'} bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform text-lg sm:text-xl border-2 border-yellow-400 hover:border-yellow-300 relative z-20`}
              >
                💰 START CASH STACK 💰
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
        <div className="bg-gradient-to-br from-yellow-800 to-yellow-900 rounded-2xl p-6 sm:p-12 text-center max-w-md w-full border-2 border-yellow-600">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Cash Stack Tetris</h2>
          <p className="text-sm sm:text-lg text-yellow-200 mb-6 sm:mb-8">Stack gold bars and watch them explode!</p>
          <div className="text-6xl sm:text-8xl font-bold text-yellow-400 animate-pulse">{countdown}</div>
          <p className="text-xs sm:text-sm text-yellow-300 mt-4">Get ready to stack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH + 200}
        height={CANVAS_HEIGHT}
        className="border border-yellow-600"
        style={{ imageRendering: 'pixelated' }}
        onClick={handleCanvasClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};

export default CashStackGame;