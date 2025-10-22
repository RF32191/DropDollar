'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine } from '@/lib/gameEngine';
import { GameAudio } from '@/utils/gameAudio';
import GameCountdown from './GameCountdown';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface ColorSequenceGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string; // For competition mode
  entryNumber?: number; // For competition mode
  isCompetitionMode?: boolean;
  gameId?: string; // For deterministic gameplay
}

interface ColorFlash {
  color: string;
  name: string;
  sound: number; // Frequency for audio feedback
}

const COLORS: ColorFlash[] = [
  { color: '#FF6B6B', name: 'Red', sound: 261.63 },
  { color: '#4ECDC4', name: 'Teal', sound: 293.66 },
  { color: '#45B7D1', name: 'Blue', sound: 329.63 },
  { color: '#96CEB4', name: 'Green', sound: 349.23 },
  { color: '#FFEAA7', name: 'Yellow', sound: 392.00 },
  { color: '#DDA0DD', name: 'Purple', sound: 440.00 },
  { color: '#FF8C69', name: 'Orange', sound: 493.88 },
  { color: '#FFB6C1', name: 'Pink', sound: 523.25 }
];

export default function ColorSequenceGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, gameId }: ColorSequenceGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'showing' | 'input' | 'feedback' | 'ended'>('ready');
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<number>(-1);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const currentScoreRef = useRef(0); // Track current score for accurate game end reporting
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | ''>('');
  const [sequenceSpeed, setSequenceSpeed] = useState(800); // ms between colors
  const [inputStartTime, setInputStartTime] = useState(0);
  const [showingIndex, setShowingIndex] = useState(0);
  

  // Game engine with proper timer and RNG
  const { engine, timer, startGame, stopGame, resetGame } = useGameEngine({
    gameType: 'color-sequence',
    totalTime: 60,
    rng: {
      isPractice: !isCompetitionMode, // Practice mode if not competition
      listingId,
      entryNumber
    },
    onGameEnd: () => {
      console.log('ColorSequence: Game engine onGameEnd callback triggered');
      
      setGameState('ended');
      const avgReactionTime = reactionTimes.length > 0 ? 
        reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0;
      const accuracy = round > 0 ? (correctAnswers / round) * 100 : 0;
      
      const gameResult = {
        score: currentScoreRef.current, // Use ref for most up-to-date score
        accuracy,
        avgReactionTime
      };
      
      console.log('ColorSequenceGame calling onGameEnd with:', gameResult);
      onGameEnd(gameResult);
    }
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play sound for color
  const playSound = useCallback((frequency: number, duration: number = 200) => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
  }, []);

  // Generate sequence for current round
  const generateSequence = useCallback((length: number) => {
    const newSequence: number[] = [];
    for (let i = 0; i < length; i++) {
      // Add some logic to prevent too many consecutive same colors
      let colorIndex;
      do {
        colorIndex = engine.randomInt(0, COLORS.length - 1);
      } while (newSequence.length > 0 && colorIndex === newSequence[newSequence.length - 1] && engine.random() < 0.7);
      
      newSequence.push(colorIndex);
    }
    return newSequence;
  }, [engine]);

  // Start new round
  const startNewRound = useCallback(() => {
    if (timer.timeLeft <= 0) {
      console.log('ColorSequence: Timer expired, game will end automatically');
      return;
    }

    const currentRound = round + 1;
    setRound(currentRound);
    setUserSequence([]);
    setFeedback('');
    setCurrentDisplay(-1);
    setShowingIndex(0);

    // Progressive difficulty
    const sequenceLength = Math.min(3 + Math.floor(currentRound / 2), 12); // Max 12 colors
    const newSpeed = Math.max(300, 800 - (currentRound * 25)); // Gets faster each round
    setSequenceSpeed(newSpeed);

    const newSequence = generateSequence(sequenceLength);
    setSequence(newSequence);
    setGameState('showing');

    // Show sequence with delays
    let index = 0;
    const showNext = () => {
      if (index < newSequence.length) {
        setCurrentDisplay(newSequence[index]);
        setShowingIndex(index + 1);
        // Play color-specific sound for sequence display
        const colorName = COLORS[newSequence[index]].name.toLowerCase();
        GameAudio.playColorSound(colorName);
        
        timeoutRef.current = setTimeout(() => {
          setCurrentDisplay(-1);
          timeoutRef.current = setTimeout(() => {
            index++;
            showNext();
          }, newSpeed * 0.3); // Brief pause between colors
        }, newSpeed * 0.7); // Color display time
      } else {
        // Sequence complete, start input phase
        setGameState('input');
        setInputStartTime(Date.now());
      }
    };
    
    // Start showing sequence after brief delay
    timeoutRef.current = setTimeout(showNext, 500);
  }, [round, timer.timeLeft, generateSequence, sequenceSpeed, playSound]);

  // Handle color selection
  const handleColorSelect = useCallback((colorIndex: number) => {
    if (gameState !== 'input') return;

    // Play color-specific sound
    const colorName = COLORS[colorIndex].name.toLowerCase();
    GameAudio.playColorSound(colorName);

    const reactionTime = Date.now() - inputStartTime;
    setReactionTimes(prev => [...prev, reactionTime]);

    const newUserSequence = [...userSequence, colorIndex];
    setUserSequence(newUserSequence);

    // Sound already played above with GameAudio.playColorSound

    // Check if sequence is complete
    if (newUserSequence.length === sequence.length) {
      // Check if sequence is correct
      const isCorrect = newUserSequence.every((color, index) => color === sequence[index]);
      
      if (isCorrect) {
        // Play sequence complete sound
        GameAudio.playSequenceComplete();
        
        // Enhanced scoring system with speed-based precision
        const baseScore = 100 + (round * 20); // Base increases with rounds
        
        // Speed bonus (0-150 points) - exponential curve for lightning-fast completion
        const speedBonus = Math.max(0, 150 * Math.exp(-reactionTime / 800));
        
        // Sequence length bonus (longer = exponentially harder)
        const lengthBonus = Math.pow(sequence.length - 2, 2) * 15; // Exponential difficulty
        
        // Perfect memory bonus (no mistakes in sequence)
        const memoryBonus = newUserSequence.length === sequence.length ? 50 : 0;
        
        // Round progression bonus (compound difficulty)
        const roundBonus = Math.floor(round / 2) * 30;
        
        // Display speed bonus (faster sequence display = harder = more points)
        const displaySpeedBonus = sequenceSpeed < 600 ? (600 - sequenceSpeed) / 8 : 0;
        
        // Consistency bonus (reward consistent performance)
        const consistencyBonus = correctAnswers > 3 ? Math.min(correctAnswers * 3, 60) : 0;
        
        // Precision timing bonus (microsecond-level variability for uniqueness)
        const precisionBonus = (Date.now() % 1000) / 25; // 0-39.96 points
        
        // Sequence complexity bonus (varied colors = harder)
        const uniqueColors = new Set(sequence).size;
        const complexityBonus = uniqueColors * 8;
        
        // Random variability to ensure uniqueness (balanced range)
        const randomVariability = engine.randomFloat(0.001, 29.999);
        
        // Calculate final score with high precision
        const totalScore = baseScore + speedBonus + lengthBonus + memoryBonus + roundBonus + 
                          displaySpeedBonus + consistencyBonus + precisionBonus + 
                          complexityBonus + randomVariability;
        
        setScore(prev => {
          const newScore = prev + totalScore;
          currentScoreRef.current = newScore; // Update ref for accurate game end reporting
          return newScore;
        });
        setCorrectAnswers(prev => prev + 1);
        setFeedback('correct');
        
        console.log('ColorSequence score breakdown:', {
          base: baseScore.toFixed(2),
          speed: speedBonus.toFixed(2),
          length: lengthBonus.toFixed(2),
          memory: memoryBonus.toFixed(2),
          round: roundBonus.toFixed(2),
          displaySpeed: displaySpeedBonus.toFixed(2),
          consistency: consistencyBonus.toFixed(2),
          precision: precisionBonus.toFixed(2),
          complexity: complexityBonus.toFixed(2),
          random: randomVariability.toFixed(3),
          total: totalScore.toFixed(3),
          reactionTime: reactionTime + 'ms'
        });
      } else {
        // Play error sound
        GameAudio.playSequenceError();
        
        setFeedback('incorrect');
        // Small penalty for wrong sequences
        setScore(prev => {
          const newScore = Math.max(0, prev - 10);
          currentScoreRef.current = newScore; // Update ref for accurate game end reporting
          return newScore;
        });
      }

      setGameState('feedback');
      
      // Continue to next round after feedback
      timeoutRef.current = setTimeout(() => {
        if (timer.timeLeft > 0) {
          startNewRound();
        } else {
          console.log('ColorSequence: Timer expired in feedback timeout, game will end automatically');
        }
      }, 3000);
    } else {
      // Check if current selection is correct so far
      const isCorrectSoFar = sequence[newUserSequence.length - 1] === colorIndex;
      if (!isCorrectSoFar) {
        setFeedback('incorrect');
        setGameState('feedback');
        
        timeoutRef.current = setTimeout(() => {
          if (timer.timeLeft > 0) {
            startNewRound();
          } else {
            setGameState('ended');
          }
        }, 3000);
      }
    }
  }, [gameState, userSequence, sequence, inputStartTime, round, timer.timeLeft, startNewRound, playSound]);

  // Cleanup timeouts when game ends
  useEffect(() => {
    if (gameState === 'ended') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [gameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleStartGame = () => {
    console.log('Starting ColorSequenceGame countdown...');
    
    // Reset game state
    setRound(0);
    setScore(0);
    currentScoreRef.current = 0; // Reset score ref
    setCorrectAnswers(0);
    setReactionTimes([]);
    setUserSequence([]);
    setFeedback('');
    setCurrentDisplay(-1);
    setShowingIndex(0);
    
    // Start countdown
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('Countdown complete, starting game...');
    
    // Generate the first sequence BEFORE starting timer
    const currentRound = 1;
    setRound(currentRound);

    // Progressive difficulty
    const sequenceLength = Math.min(3 + Math.floor(currentRound / 2), 12); // Max 12 colors
    const newSpeed = Math.max(300, 800 - (currentRound * 25)); // Gets faster each round
    setSequenceSpeed(newSpeed);

    const newSequence = generateSequence(sequenceLength);
    setSequence(newSequence);
    
    // Now start the game and timer
    setGameState('showing');
    startGame(); // Start the engine timer
    
    // Show sequence with delays
    let index = 0;
    const showNext = () => {
      if (index < newSequence.length) {
        setCurrentDisplay(newSequence[index]);
        setShowingIndex(index + 1);
        // Play color-specific sound for sequence display
        const colorName = COLORS[newSequence[index]].name.toLowerCase();
        GameAudio.playColorSound(colorName);
        
        timeoutRef.current = setTimeout(() => {
          setCurrentDisplay(-1);
          timeoutRef.current = setTimeout(() => {
            index++;
            showNext();
          }, newSpeed * 0.3); // Brief pause between colors
        }, newSpeed * 0.7); // Color display time
      } else {
        // Sequence complete, start input phase
        setGameState('input');
        setInputStartTime(Date.now());
      }
    };
    
    // Start showing sequence after brief delay
    timeoutRef.current = setTimeout(showNext, 500);
  };

  const handleCountdownCancel = () => {
    console.log('Countdown cancelled');
    setGameState('ready');
  };

  // Show countdown overlay
  if (gameState === 'countdown') {
    return (
      <GameCountdown
        onCountdownComplete={handleCountdownComplete}
        onCancel={handleCountdownCancel}
        showTitle="🌈 Color Sequence Memory"
      />
    );
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-900 via-purple-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-yellow-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">🌈</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-red-300 to-yellow-300 bg-clip-text text-transparent">
              Color Sequence Memory
            </h2>
            <p className="text-red-200 text-sm mb-6 font-medium">Multi-Sensory Memory Challenge</p>
            
            {/* Epilepsy Warning */}
            <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 border border-red-400/50 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-sm font-bold">⚠️</span>
                </div>
                <p className="text-red-200 font-bold">EPILEPSY WARNING</p>
              </div>
              <p className="text-sm text-red-100">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>
            
            <div className="text-left text-sm text-white/90 mb-8 space-y-3 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">?</span>
                </div>
                <p className="text-white font-semibold">How to Play:</p>
              </div>
              
              <div className="space-y-3 pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-red-300 font-semibold">Watch:</span> Colors flash in sequence with unique sounds</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-yellow-300 font-semibold">Remember:</span> Memorize both colors and their order</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-blue-300 font-semibold">Repeat:</span> Click colors in the exact same sequence</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-semibold">Progress:</span> Sequences get longer and faster</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-purple-300 font-semibold">Audio:</span> Each color has a unique musical tone</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-500/20 to-yellow-500/20 border border-red-400/30 rounded-xl p-4 mt-6">
                <p className="text-xs text-red-200">
                  <span className="text-cyan-300 font-bold">🎵 Pro Tip:</span> Uses both visual and auditory memory. 
                  Listen to the tones to help remember the sequence!
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={onExit}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform"
              >
                ← Back
              </button>
              <button
                onClick={handleStartGame}
                className="flex-1 bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse"
              >
                🌈 Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Color Sequence Memory</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
              <span>Round: {round}</span>
              <span>Score: {score.toFixed(2)}</span>
              <span>Time: {timer.timeLeft}s</span>
            </div>
          </div>
          <button
            onClick={onExit}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            ✕
          </button>
        </div>

        {/* Game State Indicator */}
        <div className="text-center mb-6">
          {gameState === 'showing' && (
            <div>
              <div className="text-blue-600 font-semibold mb-2">👀 Watch & Listen to the Sequence!</div>
              <div className="text-sm text-gray-600">
                Sequence: {showingIndex}/{sequence.length} | Speed: {sequenceSpeed}ms
              </div>
            </div>
          )}
          {gameState === 'input' && (
            <div className="text-green-600 font-semibold">🎯 Repeat the Color Sequence!</div>
          )}
          {gameState === 'feedback' && (
            <div className={`font-semibold ${feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
              {feedback === 'correct' ? '✅ Perfect Sequence!' : '❌ Wrong Order!'}
            </div>
          )}
        </div>

        {/* Current Display Color */}
        {gameState === 'showing' && currentDisplay !== -1 && (
          <div className="flex justify-center mb-6">
            <div 
              className="w-32 h-32 rounded-full border-4 border-white shadow-2xl animate-pulse"
              style={{ backgroundColor: COLORS[currentDisplay].color }}
            >
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {COLORS[currentDisplay].name}
              </div>
            </div>
          </div>
        )}


        {/* Color Selection Grid */}
        {gameState === 'input' && (
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-900 mb-3 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>Click the colors in the same order:</div>
            <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
              {COLORS.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleColorSelect(index)}
                  className="w-16 h-16 rounded-lg border-2 border-gray-300 hover:border-gray-500 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  style={{ backgroundColor: color.color }}
                  title={color.name}
                >
                  <span className="text-white font-bold text-xs drop-shadow-lg">
                    {color.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {gameState === 'input' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress: {userSequence.length}/{sequence.length}</span>
              <span>Length: {sequence.length} colors</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(userSequence.length / sequence.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* User Sequence Display */}
        {gameState === 'input' && userSequence.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-600 mb-2">Your Sequence:</div>
            <div className="flex justify-center space-x-1">
              {userSequence.map((colorIndex, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: COLORS[colorIndex].color }}
                  title={COLORS[colorIndex].name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-600">
          <div>
            <div className="font-semibold text-gray-900">{correctAnswers}</div>
            <div>Correct</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{sequence.length}</div>
            <div>Length</div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">
              {reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0}ms
            </div>
            <div>Avg Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}
