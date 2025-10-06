'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameAudio } from '@/utils/gameAudio';

interface GameResult {
  score: number;
  accuracy: number;
  avgReactionTime: number;
}

interface QuickClickGameProps {
  onGameEnd: (result: GameResult) => void;
  onExit?: () => void;
  listingId?: string;
  entryNumber?: number;
  isCompetitionMode?: boolean;
}

interface Round {
  roundNumber: number;
  reactionTime: number | null;
  clicked: boolean;
}

export default function QuickClickGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode }: QuickClickGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'waiting' | 'flash' | 'clicked' | 'ended'>('ready');
  const [currentRound, setCurrentRound] = useState(1);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [flashStartTime, setFlashStartTime] = useState<number>(0);
  
  const flashTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Initialize audio
  useEffect(() => {
    GameAudio.init();
  }, []);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        GameAudio.playCountdown(countdown);
        countdownRef.current = setTimeout(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        startRound();
      }
    }
    
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [gameState, countdown]);

  // Start a round
  const startRound = useCallback(() => {
    console.log(`QuickClick: Starting round ${currentRound}`);
    setGameState('waiting');
    
    // Random wait time between 2-6 seconds
    const waitTime = 2000 + Math.random() * 4000;
    
    flashTimeoutRef.current = setTimeout(() => {
      console.log('QuickClick: FLASH!');
      setGameState('flash');
      setFlashStartTime(Date.now());
      GameAudio.playCountdown(1); // Flash sound
    }, waitTime);
  }, [currentRound]);

  // Handle click
  const handleClick = useCallback(() => {
    if (gameState === 'flash') {
      const reactionTime = Date.now() - flashStartTime;
      console.log(`QuickClick: Clicked! Reaction time: ${reactionTime}ms`);
      
      // Play success sound
      GameAudio.playTargetHit();
      
      // Record the round
      const newRound: Round = {
        roundNumber: currentRound,
        reactionTime,
        clicked: true
      };
      
      setRounds(prev => [...prev, newRound]);
      setGameState('clicked');
      
      // Move to next round or end game
      setTimeout(() => {
        if (currentRound < 3) {
          setCurrentRound(prev => prev + 1);
          setCountdown(3);
          setGameState('countdown');
        } else {
          endGame([...rounds, newRound]);
        }
      }, 1500);
      
    } else if (gameState === 'waiting') {
      // Clicked too early
      console.log('QuickClick: Clicked too early!');
      GameAudio.playTargetMiss();
      
      // Record failed round
      const newRound: Round = {
        roundNumber: currentRound,
        reactionTime: null,
        clicked: false
      };
      
      setRounds(prev => [...prev, newRound]);
      setGameState('clicked');
      
      // Move to next round or end game
      setTimeout(() => {
        if (currentRound < 3) {
          setCurrentRound(prev => prev + 1);
          setCountdown(3);
          setGameState('countdown');
        } else {
          endGame([...rounds, newRound]);
        }
      }, 1500);
    }
  }, [gameState, flashStartTime, currentRound, rounds]);

  // Auto-fail if no click during flash
  useEffect(() => {
    if (gameState === 'flash') {
      const timeout = setTimeout(() => {
        console.log('QuickClick: No click - auto fail');
        GameAudio.playTargetMiss();
        
        const newRound: Round = {
          roundNumber: currentRound,
          reactionTime: null,
          clicked: false
        };
        
        setRounds(prev => [...prev, newRound]);
        setGameState('clicked');
        
        setTimeout(() => {
          if (currentRound < 3) {
            setCurrentRound(prev => prev + 1);
            setCountdown(3);
            setGameState('countdown');
          } else {
            endGame([...rounds, newRound]);
          }
        }, 1500);
      }, 1000); // 1 second to click after flash
      
      return () => clearTimeout(timeout);
    }
  }, [gameState, currentRound, rounds]);

  // End game
  const endGame = useCallback((finalRounds: Round[]) => {
    console.log('QuickClick: Game ended', finalRounds);
    setGameState('ended');
    
    GameAudio.playGameEnd();
    
    // Calculate results
    const validRounds = finalRounds.filter(r => r.reactionTime !== null);
    const avgReactionTime = validRounds.length > 0 
      ? validRounds.reduce((sum, r) => sum + r.reactionTime!, 0) / validRounds.length 
      : 0;
    
    const accuracy = (validRounds.length / 3) * 100;
    
    // Score based on speed and accuracy
    const speedScore = avgReactionTime > 0 ? Math.max(0, 1000 - avgReactionTime) : 0;
    const accuracyBonus = accuracy * 10;
    const finalScore = Number((speedScore + accuracyBonus).toFixed(2));
    
    const gameResult = {
      score: finalScore,
      accuracy,
      avgReactionTime
    };
    
    console.log('QuickClickGame calling onGameEnd with:', gameResult);
    onGameEnd(gameResult);
  }, [onGameEnd]);

  // Start game
  const handleStartGame = () => {
    setCountdown(3);
    setGameState('countdown');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, []);

  if (gameState === 'ended') {
    return null;
  }

  if (gameState === 'ready') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-lg w-full mx-4 text-center border border-white/20 shadow-2xl">
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-3xl">⚡</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent">
              QuickClick
            </h2>
            <p className="text-green-200 text-sm mb-6 font-medium">Lightning Reaction Challenge</p>
            
            <div className="text-left text-sm text-white/90 mb-8 space-y-3 bg-black/20 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">⚡</span>
                </div>
                <p className="text-white font-semibold">How to Play:</p>
              </div>
              
              <div className="space-y-3 pl-11">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-yellow-300 font-semibold">3 Rounds:</span> Test your reflexes 3 times</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-red-300 font-semibold">Wait:</span> Screen will be red - don't click!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-green-300 font-semibold">Flash:</span> Click instantly when screen turns green!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-blue-300 font-semibold">Speed:</span> Faster clicks = higher scores</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-purple-300 font-semibold">Accuracy:</span> Don't click too early!</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-xl p-4 mt-6">
                <p className="text-xs text-green-200">
                  <span className="text-yellow-300 font-bold">⚡ Pro Tip:</span> Stay focused and click the moment you see green! 
                  Average human reaction time is ~250ms. Can you beat it?
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
                ⚡ Start Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'countdown') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Round {currentRound} of 3</h2>
          <p className="text-lg text-gray-600 mb-8">Get ready to click when the screen flashes green!</p>
          <div className="text-8xl font-bold text-blue-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-sm text-gray-500 mt-4">Prepare yourself...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-bold text-gray-900">
            ⚡ QuickClick - Round {currentRound}/3
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Completed: {rounds.length}/3
            </div>
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

        {/* Game Area */}
        <div 
          ref={gameAreaRef}
          className={`relative rounded-xl h-96 border-4 cursor-pointer transition-all duration-100 ${
            gameState === 'waiting' ? 'bg-red-500 border-red-600' :
            gameState === 'flash' ? 'bg-green-500 border-green-600 animate-pulse' :
            gameState === 'clicked' ? 'bg-blue-500 border-blue-600' :
            'bg-gray-800 border-gray-600'
          }`}
          onClick={handleClick}
        >
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {gameState === 'waiting' && (
              <div className="text-center">
                <div className="text-6xl font-bold mb-4">WAIT...</div>
                <div className="text-xl">Don't click yet!</div>
              </div>
            )}
            {gameState === 'flash' && (
              <div className="text-center">
                <div className="text-8xl font-bold mb-4 animate-bounce">CLICK!</div>
                <div className="text-2xl">Click NOW!</div>
              </div>
            )}
            {gameState === 'clicked' && (
              <div className="text-center">
                {rounds.length > 0 && rounds[rounds.length - 1].reactionTime ? (
                  <div>
                    <div className="text-4xl font-bold mb-4">
                      {rounds[rounds.length - 1].reactionTime}ms
                    </div>
                    <div className="text-xl">
                      {rounds[rounds.length - 1].reactionTime! < 200 ? 'Lightning Fast! ⚡' :
                       rounds[rounds.length - 1].reactionTime! < 300 ? 'Excellent! 🎯' :
                       rounds[rounds.length - 1].reactionTime! < 400 ? 'Good! 👍' :
                       'Keep practicing! 💪'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl font-bold mb-4">Too Early!</div>
                    <div className="text-xl">Wait for green next time!</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Round Results */}
        {rounds.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Round Results:</h3>
            <div className="grid grid-cols-3 gap-4">
              {rounds.map((round) => (
                <div key={round.roundNumber} className="bg-gray-100 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600">Round {round.roundNumber}</div>
                  <div className="text-lg font-bold">
                    {round.reactionTime ? `${round.reactionTime}ms` : 'Failed'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-600 space-y-2">
          <div>⚡ <strong>Goal:</strong> Click as fast as possible when the screen turns green</div>
          <div>🔴 <strong>Red:</strong> Wait - don't click yet!</div>
          <div>🟢 <strong>Green:</strong> Click immediately for best score!</div>
        </div>
      </div>
    </div>
  );
}
