'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine } from '@/lib/gameEngine';

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
  const [gameState, setGameState] = useState<'ready' | 'showing' | 'input' | 'feedback' | 'ended'>('ready');
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [currentDisplay, setCurrentDisplay] = useState<number>(-1);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
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
      entryNumber,
      gameId // Use gameId for deterministic seeding
    },
    onGameEnd: () => {
      setGameState('ended');
      const avgReactionTime = reactionTimes.length > 0 ? 
        reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0;
      const accuracy = round > 0 ? (correctAnswers / round) * 100 : 0;
      
      // Always pass the full result object (both competition and practice modes)
      const gameResult = {
        score,
        accuracy,
        avgReactionTime
      };
      
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
      setGameState('ended');
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
        playSound(COLORS[newSequence[index]].sound);
        
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

    const reactionTime = Date.now() - inputStartTime;
    setReactionTimes(prev => [...prev, reactionTime]);

    const newUserSequence = [...userSequence, colorIndex];
    setUserSequence(newUserSequence);

    // Play sound feedback
    playSound(COLORS[colorIndex].sound);

    // Check if sequence is complete
    if (newUserSequence.length === sequence.length) {
      // Check if sequence is correct
      const isCorrect = newUserSequence.every((color, index) => color === sequence[index]);
      
      if (isCorrect) {
        // Advanced scoring system for 50,000+ users to prevent ties
        const baseScore = 100 + (round * 15); // Base increases with rounds
        
        // Reaction time bonus (0-75 points) - exponential curve
        const reactionBonus = Math.max(0, 75 * Math.exp(-reactionTime / 1200));
        
        // Sequence length bonus (longer = harder = more points)
        const lengthBonus = (sequence.length - 3) * 20; // 20 points per length above 3
        
        // Round progression bonus
        const roundBonus = Math.floor(round / 3) * 25;
        
        // Sequence speed bonus (faster rounds = more points)
        const speedBonus = Math.max(0, (1000 - sequenceSpeed) / 20);
        
        // Precision timing bonus (microsecond-level variability)
        const precisionBonus = (Date.now() % 1000) / 50; // 0-19.98 points
        
        // Audio memory bonus (using sound helps = slight bonus)
        const audioBonus = engine.randomFloat(5, 15);
        
        // Random variability to ensure uniqueness (large range)
        const randomVariability = engine.randomFloat(0.001, 49.999);
        
        // Calculate final score with high precision
        const totalScore = baseScore + reactionBonus + lengthBonus + roundBonus + 
                          speedBonus + precisionBonus + audioBonus + randomVariability;
        
        setScore(prev => prev + totalScore);
        setCorrectAnswers(prev => prev + 1);
        setFeedback('correct');
        
        console.log('ColorSequence score breakdown:', {
          base: baseScore,
          reaction: reactionBonus.toFixed(2),
          length: lengthBonus,
          round: roundBonus,
          speed: speedBonus.toFixed(2),
          precision: precisionBonus.toFixed(2),
          audio: audioBonus.toFixed(2),
          random: randomVariability.toFixed(3),
          total: totalScore.toFixed(3)
        });
      } else {
        setFeedback('incorrect');
        // Small penalty for wrong sequences
        setScore(prev => Math.max(0, prev - 10));
      }

      setGameState('feedback');
      
      // Continue to next round after feedback
      timeoutRef.current = setTimeout(() => {
        if (timer.timeLeft > 0) {
          startNewRound();
        } else {
          setGameState('ended');
        }
      }, 1500);
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
        }, 1500);
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
    // Generate the first sequence BEFORE starting timer
    const currentRound = 1;
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
    
    // Now start the game and timer
    setGameState('showing');
    startGame(); // Start the engine timer
    
    // Show sequence with delays
    let index = 0;
    const showNext = () => {
      if (index < newSequence.length) {
        setCurrentDisplay(newSequence[index]);
        setShowingIndex(index + 1);
        playSound(COLORS[newSequence[index]].sound);
        
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

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-2xl text-white">🌈</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Color Sequence Memory</h2>
          <div className="text-left text-sm text-gray-700 mb-6 space-y-2">
            <p><strong>How to Play:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Watch:</strong> Colors flash in sequence with unique sounds</li>
              <li><strong>Remember:</strong> Memorize both the colors and their order</li>
              <li><strong>Repeat:</strong> Click colors in the exact same sequence</li>
              <li><strong>Progress:</strong> Sequences get longer and faster</li>
              <li><strong>Audio Cues:</strong> Each color has a unique musical tone</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
              <p className="text-xs text-blue-800">
                <strong>🎵 Multi-Sensory:</strong> Uses both visual and auditory memory. 
                Listen to the tones to help remember the sequence!
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
              <p className="text-xs text-yellow-800">
                <strong>Bot-Proof Design:</strong> Requires human-like audio-visual processing, 
                sequential memory, and multi-sensory integration.
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onExit}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStartGame}
              className="flex-1 bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-700 hover:to-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Start Game
            </button>
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
            <div className="text-sm font-semibold text-gray-900 mb-3">Click the colors in the same order:</div>
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
