'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameEngine, GameEngine } from '@/lib/gameEngine';
import { GameAudio } from '@/utils/gameAudio';
import GameCountdown from './GameCountdown';
import { FairRNGService, MultiTargetRNGConfig } from '@/lib/fairRNGService';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface MultiTargetGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string; // For competition mode
  entryNumber?: number; // For competition mode
  isCompetitionMode?: boolean;
  gameId?: string; // For deterministic gameplay
}

interface Target {
  id: number;
  x: number;
  y: number;
  color: string;
  isCorrect: boolean;
  size: number; // Different sizes for difficulty
  pulseSpeed: number; // Different pulse speeds
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'];

export default function MultiTargetGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode, gameId }: MultiTargetGameProps) {
  // Get fair RNG configuration based on listing and attempt number
  const rngConfig = listingId && entryNumber 
    ? FairRNGService.getMultiTargetConfig(listingId, entryNumber)
    : null;
    
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'playing' | 'ended'>('ready');
  const [targets, setTargets] = useState<Target[]>([]);
  const [correctTargets, setCorrectTargets] = useState<number[]>([]); // Multiple correct targets
  const [hitTargets, setHitTargets] = useState<number[]>([]); // Track which correct targets have been hit
  const [score, setScore] = useState(0);
  const currentScoreRef = useRef(0); // Track current score for accurate game end reporting
  const [round, setRound] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  

  // Game engine with proper timer and RNG
  const { engine, timer, startGame, stopGame, resetGame } = useGameEngine({
    gameType: 'multi-target',
    totalTime: 60,
    rng: {
      isPractice: !isCompetitionMode, // Practice mode if not competition
      listingId,
      entryNumber
    },
    onGameEnd: () => {
      console.log('MultiTarget: Game engine onGameEnd callback triggered');
      // Play game end sound
      GameAudio.playGameEnd();
      
      setGameState('ended');
      const avgReactionTime = reactionTimes.length > 0 ? 
        reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0;
      const accuracy = round > 0 ? (correctAnswers / round) * 100 : 0;
      
      const gameResult = {
        score: currentScoreRef.current, // Use ref for most up-to-date score
        accuracy,
        avgReactionTime
      };
      
      console.log('MultiTargetGame calling onGameEnd with:', gameResult);
      onGameEnd(gameResult);
    }
  });

  const generateTargets = useCallback(() => {
    const currentRound = round + 1;
    
    // Use RNG configuration if available (competition mode)
    if (rngConfig && currentRound <= rngConfig.rounds.length) {
      const roundConfig = rngConfig.rounds[currentRound - 1];
      const newTargets: Target[] = [];
      const correctIndices: number[] = [];
      
      // Create targets based on RNG configuration
      roundConfig.targets.forEach((targetConfig, index) => {
        const target: Target = {
          id: index,
          x: targetConfig.x, // Already in percentage
          y: targetConfig.y, // Already in percentage
          color: COLORS[index % COLORS.length],
          isCorrect: true, // All configured targets are correct in this system
          size: Math.round(targetConfig.size * 60), // Convert size multiplier to pixels
          pulseSpeed: 1.0 + (index * 0.1) // Slight variation in pulse
        };
        newTargets.push(target);
        correctIndices.push(index);
      });
      
      console.log(`Using RNG Config ${rngConfig.id} for round ${currentRound}:`, roundConfig);
      setTargets(newTargets);
      setCorrectTargets(correctIndices);
      setHitTargets([]);
      setRoundStartTime(Date.now());
      setFeedback('');
      
      // Set round timeout based on configuration
      setTimeout(() => {
        if (gameState === 'playing') {
          setRound(prev => prev + 1); // Move to next round
        }
      }, roundConfig.timeLimit);
      
      return;
    }
    
    // Fallback to original random generation for practice mode
    const randomInt = (min: number, max: number) => {
      if (engine && engine.randomInt) {
        return engine.randomInt(min, max);
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const randomFloat = (min: number, max: number) => {
      if (engine && engine.randomFloat) {
        return engine.randomFloat(min, max);
      }
      return Math.random() * (max - min) + min;
    };

    const randomChoice = (arr: any[]) => {
      if (engine && engine.randomChoice) {
        return engine.randomChoice(arr);
      }
      return arr[Math.floor(Math.random() * arr.length)];
    };

    // Progressive difficulty based on round
    const baseTargets = 4;
    const maxTargets = Math.min(8, baseTargets + Math.floor(round / 3)); // Increase every 3 rounds, max 8
    const numTargets = randomInt(baseTargets, maxTargets);
    
    // Multiple correct targets for higher rounds
    const numCorrectTargets = Math.min(3, Math.max(1, Math.floor(round / 5) + 1)); // 1-3 correct targets
    
    const newTargets: Target[] = [];
    const correctIndices: number[] = [];

    // Generate correct target indices
    for (let i = 0; i < numCorrectTargets; i++) {
      let correctIndex;
      do {
        correctIndex = randomInt(0, numTargets - 1);
      } while (correctIndices.includes(correctIndex));
      correctIndices.push(correctIndex);
    }

    for (let i = 0; i < numTargets; i++) {
      // Generate non-overlapping positions
      let x: number, y: number;
      let attempts = 0;
      do {
        x = randomFloat(10, 85); // 10-85% of container width
        y = randomFloat(15, 85); // 15-85% of container height
        attempts++;
      } while (
        attempts < 15 && 
        newTargets.some(target => 
          Math.abs(target.x - x) < 12 || Math.abs(target.y - y) < 12
        )
      );

      const isCorrect = correctIndices.includes(i);
      
      // Variable target properties for difficulty and uniqueness
      const target = {
        id: i,
        x,
        y,
        color: randomChoice(COLORS),
        isCorrect,
        size: isCorrect ? randomInt(50, 70) : randomInt(40, 60), // Correct targets slightly larger
        pulseSpeed: isCorrect ? randomFloat(0.8, 1.5) : randomFloat(0.3, 0.8) // Correct targets pulse faster
      };

      newTargets.push(target);
    }

    console.log('Generated targets:', newTargets.length, 'targets, correct:', correctIndices.length, 'round:', round);
    setTargets(newTargets);
    setCorrectTargets(correctIndices);
    setHitTargets([]); // Reset hit targets for new round
    setRoundStartTime(Date.now());
    setFeedback('');
  }, [engine, round, rngConfig, gameState]);

  const handleTargetClick = useCallback((targetId: number, event?: React.MouseEvent) => {
    if (gameState !== 'playing') return;

    const reactionTime = Date.now() - roundStartTime;
    const isCorrect = correctTargets.includes(targetId);
    const alreadyHit = hitTargets.includes(targetId);
    const target = targets.find(t => t.id === targetId);

    // Don't allow hitting the same correct target twice
    if (isCorrect && alreadyHit) {
      return;
    }

    // Calculate click precision (distance from center)
    let centerAccuracy = 1.0; // Default perfect accuracy
    if (event && target) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const clickX = event.clientX;
      const clickY = event.clientY;
      
      // Calculate distance from center as percentage of target radius
      const distance = Math.sqrt(Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2));
      const maxDistance = Math.min(rect.width, rect.height) / 2;
      centerAccuracy = Math.max(0.1, 1 - (distance / maxDistance)); // 0.1 to 1.0
    }

    setReactionTimes(prev => [...prev, reactionTime]);
    
    // Advanced scoring system for 50,000+ users to prevent ties
    if (isCorrect && target) {
      // Play hit sound
      GameAudio.playTargetHit();
      
      // Base score varies by difficulty
      const baseScore = 100 + (round * 10); // Increases with rounds
      
      // Speed bonus (0-100 points) - exponential curve for lightning-fast reactions
      const speedBonus = Math.max(0, 100 * Math.exp(-reactionTime / 600));
      
      // Center accuracy bonus (0-75 points) - rewards precise clicking
      const centerBonus = centerAccuracy * 75;
      
      // Target size bonus (smaller = harder = more points)
      const sizeBonus = Math.max(0, (70 - target.size) * 1.5);
      
      // Multiple target bonus (more correct targets = higher multiplier)
      const multiTargetBonus = correctTargets.length > 1 ? (correctTargets.length - 1) * 30 : 0;
      
      // Round progression bonus (gets harder over time)
      const roundBonus = Math.floor(round / 3) * 20;
      
      // Pulse speed bonus (faster pulse = harder = more points)
      const pulseBonus = target.pulseSpeed > 1.0 ? (target.pulseSpeed - 1.0) * 25 : 0;
      
      // Precision timing bonus (microsecond-level variability for uniqueness)
      const precisionBonus = (Date.now() % 1000) / 50; // 0-19.98 points
      
      // Combo bonus (consecutive correct hits)
      const comboBonus = Math.min(correctAnswers * 2, 50); // Up to 50 bonus points
      
      // Random variability to ensure uniqueness (smaller range for better balance)
      const randomVariability = engine && engine.randomFloat ? 
        engine.randomFloat(0.001, 24.999) : 
        Math.random() * 24.998 + 0.001;
      
      // Calculate final score with high precision
      const totalScore = baseScore + speedBonus + centerBonus + sizeBonus + multiTargetBonus + 
                        roundBonus + pulseBonus + precisionBonus + comboBonus + randomVariability;
      
      // Add this target to hit targets
      const newHitTargets = [...hitTargets, targetId];
      setHitTargets(newHitTargets);
      
      setScore(prev => {
        const newScore = prev + totalScore;
        currentScoreRef.current = newScore; // Update ref for accurate game end reporting
        return newScore;
      });
      setCorrectAnswers(prev => prev + 1);
      setFeedback('correct');
      
      // Clear correct feedback after a short time so player can continue
      setTimeout(() => {
        setFeedback('');
      }, 600);
      
      console.log('Score breakdown:', {
        base: baseScore.toFixed(2),
        speed: speedBonus.toFixed(2),
        center: centerBonus.toFixed(2),
        size: sizeBonus.toFixed(2),
        multi: multiTargetBonus.toFixed(2),
        round: roundBonus.toFixed(2),
        pulse: pulseBonus.toFixed(2),
        precision: precisionBonus.toFixed(2),
        combo: comboBonus.toFixed(2),
        random: randomVariability.toFixed(3),
        total: totalScore.toFixed(3),
        centerAccuracy: (centerAccuracy * 100).toFixed(1) + '%'
      });
    } else {
      // Play miss sound
      GameAudio.playTargetMiss();
      
      setFeedback('wrong');
      // Small penalty for wrong clicks to discourage spam clicking
      setScore(prev => {
        const newScore = Math.max(0, prev - 5);
        currentScoreRef.current = newScore; // Update ref for accurate game end reporting
        return newScore;
      });
      
      // Clear wrong feedback after a short time so player can continue
      setTimeout(() => {
        setFeedback('');
      }, 800);
    }

    // Check if all correct targets have been hit (use newHitTargets if we just hit a correct target)
    const currentHitTargets = isCorrect && !alreadyHit ? [...hitTargets, targetId] : hitTargets;
    const allTargetsHit = correctTargets.every(correctId => currentHitTargets.includes(correctId));

    if (allTargetsHit) {
      // All targets hit - progress to next round
      setRound(prev => prev + 1);

      // Progressive speed-up: feedback time gets shorter as rounds increase
      const speedMultiplier = Math.max(0.2, 1 - (round * 0.03)); // Gets 3% faster each round, min 20% speed
      const feedbackTime = 600 * speedMultiplier;
      setTimeout(() => {
        if (timer.timeLeft > 0) {
          generateTargets();
        }
      }, feedbackTime);
    }
  }, [gameState, correctTargets, hitTargets, roundStartTime, timer.timeLeft, round, generateTargets, engine, targets]);

  const handleStartGame = () => {
    console.log('Starting MultiTargetGame countdown...');
    
    // Reset game state
    setRound(0);
    setScore(0);
    currentScoreRef.current = 0; // Reset score ref
    setCorrectAnswers(0);
    setReactionTimes([]);
    setHitTargets([]);
    setFeedback('');
    
    // Start countdown
    setGameState('countdown');
  };

  const handleCountdownComplete = () => {
    console.log('Countdown complete, starting game...');
    
    // Generate targets FIRST, before starting timer
    generateTargets();
    
    // Then start the game and timer
    setGameState('playing');
    startGame(); // Start the engine timer
    
    console.log('Game started, state set to playing');
  };

  const handleCountdownCancel = () => {
    console.log('Countdown cancelled');
    setGameState('ready');
  };

  const getTargetStyle = (target: Target) => {
    const isHit = hitTargets.includes(target.id);
    
    const baseColors = {
      red: 'bg-red-500 hover:bg-red-600',
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
      yellow: 'bg-yellow-500 hover:bg-yellow-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
      orange: 'bg-orange-500 hover:bg-orange-600',
      pink: 'bg-pink-500 hover:bg-pink-600'
    };
    
    // Different styles for hit vs unhit targets
    let baseClass;
    if (isHit && target.isCorrect) {
      // Hit correct target - show as completed with checkmark
      baseClass = 'bg-green-600 border-4 border-white';
    } else if (target.isCorrect) {
      // Unhit correct target - show pulsing
      baseClass = baseColors[target.color as keyof typeof baseColors] || 'bg-gray-500 hover:bg-gray-600';
    } else {
      // Incorrect target - normal appearance
      baseClass = baseColors[target.color as keyof typeof baseColors] || 'bg-gray-500 hover:bg-gray-600';
    }
    
    // Pulse effects for correct targets that haven't been hit yet
    const pulseClass = target.isCorrect && !isHit ? 
      `animate-pulse ring-4 ring-white ring-opacity-90 shadow-2xl` : 
      'hover:shadow-lg';
    
    // Disable interaction for already hit targets
    const interactionClass = isHit && target.isCorrect ? 
      'cursor-not-allowed opacity-75' : 
      'cursor-pointer transform hover:scale-110';
    
    return {
      className: `${baseClass} ${pulseClass} ${interactionClass} absolute rounded-full transition-all duration-200`,
      style: {
        left: `${target.x}%`,
        top: `${target.y}%`,
        width: `${target.size}px`,
        height: `${target.size}px`,
        transform: 'translate(-50%, -50%)',
        animationDuration: target.isCorrect ? `${target.pulseSpeed}s` : undefined,
        boxShadow: target.isCorrect ? 
          `0 0 ${target.size/2}px rgba(255, 255, 255, 0.8), 0 0 ${target.size}px rgba(255, 255, 255, 0.4)` : 
          undefined
      }
    };
  };

  if (gameState === 'ended') {
    return null; // Parent handles the results
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-2xl text-white">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Multi-Target Reaction</h2>
          <div className="text-left text-sm text-gray-700 mb-6 space-y-2">
            <p><strong>How to Play:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Find:</strong> Look for ALL glowing/pulsing targets</li>
              <li><strong>Click:</strong> Click each correct target as fast as possible</li>
              <li><strong>Difficulty:</strong> More targets and faster pace each round</li>
              <li><strong>Multiple:</strong> Later rounds have multiple correct targets</li>
              <li><strong>Scoring:</strong> Speed, accuracy, and target difficulty all matter</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
              <p className="text-xs text-blue-800">
                <strong>🎯 Visual Focus:</strong> Requires rapid visual scanning and precise clicking. 
                Look for the pulsing/glowing target!
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
              <p className="text-xs text-yellow-800">
                <strong>Bot-Proof Design:</strong> Requires human-like visual processing, 
                spatial awareness, and fine motor control.
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isCompetitionMode && onExit && (
              <button
                onClick={onExit}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleStartGame}
              className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors`}
            >
              {isCompetitionMode ? 'Start Competition' : 'Start Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show countdown overlay
  if (gameState === 'countdown') {
    return (
      <GameCountdown
        onCountdownComplete={handleCountdownComplete}
        onCancel={handleCountdownCancel}
        showTitle="🎯 Multi-Target Reaction"
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 text-center">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-lg font-bold text-gray-900">
            🎯 Multi-Target Reaction
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">Time: {timer.timeLeft}s</div>
            <div className="text-sm text-gray-600">Score: {score.toFixed(2)}</div>
            {correctTargets.length > 0 && (
              <div className="text-sm text-blue-600 font-semibold">
                Targets: {hitTargets.length}/{correctTargets.length}
              </div>
            )}
            {!isCompetitionMode && onExit && (
              <button 
                onClick={onExit}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {gameState === 'playing' && (
          <div className="space-y-6">
            <div className="text-xl font-bold text-gray-900">
              Click ALL the glowing targets! ✨
            </div>
            
            {/* Game Info */}
            <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Round {round + 1}</span>
                <span>{correctTargets.length} correct target{correctTargets.length > 1 ? 's' : ''}</span>
                <span>{targets.length} total targets</span>
              </div>
            </div>
            
            {/* Game Area */}
            <div className="relative bg-gray-100 rounded-xl h-96 border-4 border-gray-300">
              {targets.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  Generating targets... (Check console for logs)
                </div>
              )}
              {targets.map((target) => {
                const targetStyle = getTargetStyle(target);
                const isHit = hitTargets.includes(target.id);
                return (
                  <button
                    key={target.id}
                    onClick={(e) => handleTargetClick(target.id, e)}
                    className={targetStyle.className}
                    style={targetStyle.style}
                  >
                    {isHit && target.isCorrect && (
                      <span className="text-white font-bold text-xl">✓</span>
                    )}
                  </button>
                );
              })}
              
              {/* Feedback */}
              {feedback && (
                <div className={`absolute inset-0 flex items-center justify-center text-4xl font-bold ${
                  feedback === 'correct' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {feedback === 'correct' ? '✓ HIT!' : '✗ MISS!'}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600">
              Round {round + 1} • Click ALL glowing targets! • Difficulty increases each round
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-600 space-y-2">
          <div>🎯 Click the highlighted/glowing target</div>
          <div>⚡ Speed and accuracy both matter</div>
          <div>🔄 Positions shuffle each round</div>
        </div>
      </div>
    </div>
  );
}