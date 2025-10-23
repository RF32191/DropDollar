import React, { useState, useRef, useEffect, useCallback } from 'react';

// Tetris piece shapes
const PIECES = [
  // I piece
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  // O piece
  [
    [1, 1],
    [1, 1]
  ],
  // T piece
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // S piece
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  // Z piece
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  // J piece
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // L piece
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
];

const COLORS = [
  '#00FFFF', // I - Cyan
  '#FFFF00', // O - Yellow
  '#800080', // T - Purple
  '#00FF00', // S - Green
  '#FF0000', // Z - Red
  '#0000FF', // J - Blue
  '#FFA500'  // L - Orange
];

interface Piece {
  shape: number[][];
  x: number;
  y: number;
  color: string;
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
  const CELL_SIZE = 30;
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
    lastTime: 0
  });

  // Create a new piece
  const createPiece = useCallback((): Piece => {
    const shapeIndex = Math.floor(Math.random() * PIECES.length);
    return {
      shape: PIECES[shapeIndex],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(PIECES[shapeIndex][0].length / 2),
      y: 0,
      color: COLORS[shapeIndex]
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
            newBoard[boardY][boardX] = 1;
          }
        }
      }
    }
    
    return newBoard;
  }, []);

  // Clear completed lines
  const clearLines = useCallback((board: number[][]): { newBoard: number[][]; linesCleared: number } => {
    const newBoard = board.filter(row => row.some(cell => cell === 0));
    const linesCleared = BOARD_HEIGHT - newBoard.length;
    
    // Add empty lines at the top
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    return { newBoard, linesCleared };
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
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        
        // Calculate score
        let scoreIncrease = 0;
        if (linesCleared > 0) {
          scoreIncrease = linesCleared * 100 * prev.level;
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
          dropTime: Math.max(50, 1000 - (prev.level * 50))
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

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (gameData.board[y][x]) {
          ctx.fillStyle = '#333333';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = '#666666';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
    
    // Draw current piece
    if (gameData.currentPiece) {
      ctx.fillStyle = gameData.currentPiece.color;
      for (let y = 0; y < gameData.currentPiece.shape.length; y++) {
        for (let x = 0; x < gameData.currentPiece.shape[y].length; x++) {
          if (gameData.currentPiece.shape[y][x]) {
            const drawX = (gameData.currentPiece.x + x) * CELL_SIZE;
            const drawY = (gameData.currentPiece.y + y) * CELL_SIZE;
            ctx.fillRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }
    
    // Draw next piece preview
    if (gameData.nextPiece) {
      ctx.fillStyle = gameData.nextPiece.color;
      ctx.globalAlpha = 0.7;
      for (let y = 0; y < gameData.nextPiece.shape.length; y++) {
        for (let x = 0; x < gameData.nextPiece.shape[y].length; x++) {
          if (gameData.nextPiece.shape[y][x]) {
            const drawX = (x + BOARD_WIDTH + 1) * CELL_SIZE;
            const drawY = (y + 2) * CELL_SIZE;
            ctx.fillRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    
    // Draw UI
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${gameData.score}`, CANVAS_WIDTH + 20, 40);
    ctx.fillText(`Level: ${gameData.level}`, CANVAS_WIDTH + 20, 80);
    ctx.fillText(`Lines: ${gameData.lines}`, CANVAS_WIDTH + 20, 120);
    
    // Draw controls
    ctx.font = '14px Arial';
    ctx.fillText('Controls:', CANVAS_WIDTH + 20, 200);
    ctx.fillText('← → Move', CANVAS_WIDTH + 20, 230);
    ctx.fillText('↓ Drop', CANVAS_WIDTH + 20, 250);
    ctx.fillText('↑ Rotate', CANVAS_WIDTH + 20, 270);
    ctx.fillText('Space Rotate', CANVAS_WIDTH + 20, 290);
  }, [gameData]);

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
            lastTime: performance.now()
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
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm p-2 sm:p-4">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-8 max-w-lg w-full max-h-full overflow-y-auto text-center border border-white/20 shadow-2xl">
          {/* Background effects */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-cyan-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>

          <div className="relative z-10">
            {/* Game Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl sm:text-3xl">🧩</span>
            </div>

            {/* Game Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              Cash Stack Tetris
            </h2>
            <p className="text-blue-200 text-sm mb-4 sm:mb-6 font-medium">
              Classic Tetris Gameplay
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
            <div className="text-left text-sm sm:text-base text-white mb-6 sm:mb-8 space-y-4 bg-gradient-to-r from-blue-800 to-purple-900 rounded-2xl p-4 sm:p-6 backdrop-blur-sm border-2 border-blue-600 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-lg font-black">!</span>
                </div>
                <h3 className="text-white font-black text-lg sm:text-xl">HOW TO PLAY:</h3>
              </div>
              
              <div className="space-y-3 pl-8 sm:pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-bold">Arrow Keys:</span> Move and rotate pieces</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-bold">Space:</span> Rotate piece</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-bold">Complete Lines:</span> Clear rows for points</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-bold">Level Up:</span> Game gets faster each level</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse flex-shrink-0"></div>
                  <p><span className="text-blue-300 font-bold">Goal:</span> Survive as long as possible!</p>
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-gradient-to-r from-blue-600/30 to-purple-500/30 border border-blue-400/50 rounded-lg p-3 mt-4">
              <p className="text-xs sm:text-sm text-blue-200">
                <span className="text-blue-300 font-bold">💡 Pro Tip:</span> Plan ahead and leave space for the I-piece to clear multiple lines!
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
                className={`${isCompetitionMode ? 'w-full' : 'flex-1'} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform text-lg sm:text-xl border-2 border-blue-400 hover:border-blue-300 relative z-20`}
              >
                🧩 START TETRIS 🧩
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Cash Stack Tetris</h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8">Classic Tetris gameplay with falling pieces!</p>
          <div className="text-6xl sm:text-8xl font-bold text-blue-500 animate-pulse">{countdown}</div>
          <p className="text-xs sm:text-sm text-gray-500 mt-4">Get ready...</p>
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
        className="border border-gray-600"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default CashStackGame;