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
      
      // Clear correct feedback after 3 seconds
      setTimeout(() => {
        setFeedback('');
      }, 3000);
      
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
      // Penalty for wrong clicks to discourage spam clicking
      setScore(prev => {
        const newScore = Math.max(0, prev - 25); // Increased penalty from 5 to 25 points
        currentScoreRef.current = newScore; // Update ref for accurate game end reporting
        return newScore;
      });
      
      // Clear wrong feedback after 3 seconds
      setTimeout(() => {
        setFeedback('');
      }, 3000);
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
    
    // In competition mode, skip countdown and go directly to playing
    if (isCompetitionMode) {
      console.log('Competition mode: skipping countdown, starting game directly');
      handleCountdownComplete();
    } else {
      // Start countdown for practice mode
      setGameState('countdown');
    }
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
      red: 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-300 hover:to-red-500',
      blue: 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-300 hover:to-blue-500',
      green: 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-300 hover:to-green-500',
      yellow: 'bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500',
      purple: 'bg-gradient-to-br from-purple-400 to-purple-600 hover:from-purple-300 hover:to-purple-500',
      orange: 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-300 hover:to-orange-500',
      pink: 'bg-gradient-to-br from-pink-400 to-pink-600 hover:from-pink-300 hover:to-pink-500'
    };
    
    // Different styles for hit vs unhit targets
    let baseClass;
    if (isHit && target.isCorrect) {
      // Hit correct target - show as completed with checkmark
      baseClass = 'bg-gradient-to-br from-green-500 to-green-700 border-4 border-white';
    } else if (target.isCorrect) {
      // Unhit correct target - show pulsing
      baseClass = baseColors[target.color as keyof typeof baseColors] || 'bg-gradient-to-br from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500';
    } else {
      // Incorrect target - normal appearance
      baseClass = baseColors[target.color as keyof typeof baseColors] || 'bg-gradient-to-br from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500';
    }
    
    // Subtle pulse effects for correct targets that haven't been hit yet
    const pulseClass = target.isCorrect && !isHit ? 
      `animate-pulse ring-1 ring-white ring-opacity-30 shadow-lg` : 
      'hover:shadow-md';
    
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
          `0 0 ${target.size/4}px rgba(255, 255, 255, 0.3), 0 0 ${target.size/2}px rgba(255, 255, 255, 0.1)` : 
          `0 0 ${target.size/6}px rgba(255, 255, 255, 0.2)`,
        filter: target.isCorrect ? 'brightness(1.1) contrast(1.05)' : 'brightness(1.05) contrast(1.02)'
      }
    };
  };

  if (gameState === 'ended') {
    return null; // Parent handles the results
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-900 via-blue-900 to-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-700"></div>
            <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-300"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">🎯</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent">
              Multi-Target Reaction
            </h2>
            <p className="text-green-200 text-sm mb-6 font-medium">Precision & Speed Challenge</p>
            
            {/* Epilepsy Warning */}
            {/* Epilepsy Warning - Enhanced Visibility */}
            <div className="bg-gradient-to-r from-red-800 to-red-900 border-2 border-red-600 rounded-xl p-6 mb-8 shadow-2xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <span className="text-white text-lg font-black">⚠️</span>
                </div>
                <p className="text-white font-black text-xl tracking-wide">EPILEPSY WARNING</p>
              </div>
              <p className="text-base text-white font-semibold leading-relaxed">
                This game contains flashing lights, rapid color changes, and intense visual effects that may trigger seizures in people with photosensitive epilepsy. 
                If you are sensitive to flashing lights, please do not play this game.
              </p>
            </div>
            
            {/* Instructions - Dark Money Green Theme */}
            <div className="text-left text-sm text-white mb-8 space-y-4 bg-gradient-to-r from-green-800 to-green-900 rounded-2xl p-6 backdrop-blur-sm border-2 border-green-600 shadow-2xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg font-black">?</span>
                </div>
                <h3 className="text-white font-black text-xl">How to Play:</h3>
              </div>
              
              <div className="space-y-3 pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Find:</span> Look for ALL glowing/pulsing targets</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Click:</span> Hit each correct target as fast as possible</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Multiple:</span> Later rounds have multiple correct targets</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Difficulty:</span> More targets and faster pace each round</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-bold">Scoring:</span> Speed, accuracy, and target difficulty matter</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-600/30 to-green-500/30 border border-green-400/50 rounded-lg p-4 mt-6">
                <p className="text-xs text-green-200">
                  <span className="text-green-300 font-bold">🎯 Pro Tip:</span> Requires rapid visual scanning and precise clicking. 
                  Look for the pulsing/glowing targets and click them all!
                </p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              {!isCompetitionMode && onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-105 transform"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleStartGame}
                className={`${!isCompetitionMode && onExit ? 'flex-1' : 'w-full'} bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform animate-pulse`}
              >
                🎯 {isCompetitionMode ? 'Start Competition' : 'Start Game'}
              </button>
            </div>
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
            <div className="text-xl font-bold text-gray-900 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
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
            <div 
              className="relative rounded-xl h-96 border-4 border-gray-300 select-none" 
              style={{ 
                userSelect: 'none', 
                WebkitUserSelect: 'none', 
                MozUserSelect: 'none', 
                msUserSelect: 'none',
                background: `
                  radial-gradient(circle at 25% 25%, rgba(0, 255, 0, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 75% 75%, rgba(0, 0, 255, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, rgba(255, 0, 255, 0.05) 0%, transparent 50%),
                  linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 25%, #d0d0d0 50%, #c0c0c0 75%, #b0b0b0 100%)
                `,
                animation: 'backgroundShift 6s ease-in-out infinite'
              }}
            >
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