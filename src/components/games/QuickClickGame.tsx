'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  isBonus?: boolean;
  targetX?: number;
  targetY?: number;
  accuracy?: number;
}

export default function QuickClickGame({ onGameEnd, onExit, listingId, entryNumber, isCompetitionMode }: QuickClickGameProps) {
  const [gameState, setGameState] = useState<'ready' | 'countdown' | 'waiting' | 'flash' | 'clicked' | 'ended'>('ready');
  const [currentRound, setCurrentRound] = useState(1);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [flashStartTime, setFlashStartTime] = useState<number>(0);
  const [targetPosition, setTargetPosition] = useState<{x: number, y: number} | null>(null);
  const [clickPosition, setClickPosition] = useState<{x: number, y: number} | null>(null);
  
  const flashTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Simple audio initialization (no complex GameAudio)
  useEffect(() => {
    // No complex audio initialization needed
  }, []);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        // Simple countdown beep
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
          audio.volume = 0.1;
          audio.play().catch(() => {});
        } catch (e) {
          // Audio failed, continue silently
        }
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
    const isBonus = currentRound === 4;
    
    if (isBonus) {
      // Bonus round - generate random target position
      const targetX = 20 + Math.random() * 60; // 20% to 80% of screen width
      const targetY = 20 + Math.random() * 60; // 20% to 80% of screen height
      setTargetPosition({ x: targetX, y: targetY });
      console.log(`QuickClick: Bonus round - target at ${targetX}%, ${targetY}%`);
    } else {
      setTargetPosition(null);
    }
    
    setGameState('waiting');
    
    // Random wait time between 2-6 seconds
    const waitTime = 2000 + Math.random() * 4000;
    
    flashTimeoutRef.current = setTimeout(() => {
      console.log('QuickClick: FLASH!');
      setGameState('flash');
      setFlashStartTime(Date.now());
      // Simple flash sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
        audio.volume = 0.15;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio failed, continue silently
      }
    }, waitTime);
  }, [currentRound]);

  // Handle click
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (gameState === 'flash') {
      const reactionTime = Date.now() - flashStartTime;
      console.log(`QuickClick: Clicked! Reaction time: ${reactionTime}ms`);
      
      const isBonus = currentRound === 4;
      let accuracy = 100;
      
      if (isBonus && targetPosition && gameAreaRef.current) {
        // Calculate click accuracy for bonus round
        const rect = gameAreaRef.current.getBoundingClientRect();
        const clickX = ((event.clientX - rect.left) / rect.width) * 100;
        const clickY = ((event.clientY - rect.top) / rect.height) * 100;
        setClickPosition({ x: clickX, y: clickY });
        
        // Calculate distance from target (in percentage points)
        const distance = Math.sqrt(
          Math.pow(clickX - targetPosition.x, 2) + Math.pow(clickY - targetPosition.y, 2)
        );
        
        // Convert distance to accuracy (closer = higher accuracy)
        accuracy = Math.max(0, 100 - (distance * 2)); // 2% penalty per percentage point distance
        console.log(`QuickClick: Bonus accuracy: ${accuracy.toFixed(1)}% (distance: ${distance.toFixed(1)})`);
      }
      
      // Play success sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
        audio.volume = 0.2;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio failed, continue silently
      }
      
      // Record the round
      const newRound: Round = {
        roundNumber: currentRound,
        reactionTime,
        clicked: true,
        isBonus,
        targetX: targetPosition?.x,
        targetY: targetPosition?.y,
        accuracy: isBonus ? accuracy : undefined
      };
      
      setRounds(prev => [...prev, newRound]);
      setGameState('clicked');
      
      // Move to next round or end game
      setTimeout(() => {
        if (currentRound < 4) {
          setCurrentRound(prev => prev + 1);
          setCountdown(3);
          setGameState('countdown');
        } else {
          endGame([...rounds, newRound]);
        }
      }, 2000); // Longer delay for bonus round to show results
      
    } else if (gameState === 'waiting') {
      // Clicked too early
      console.log('QuickClick: Clicked too early!');
      // Play error sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio failed, continue silently
      }
      
      // Record failed round
      const newRound: Round = {
        roundNumber: currentRound,
        reactionTime: null,
        clicked: false,
        isBonus: currentRound === 4
      };
      
      setRounds(prev => [...prev, newRound]);
      setGameState('clicked');
      
      // Move to next round or end game
      setTimeout(() => {
        if (currentRound < 4) {
          setCurrentRound(prev => prev + 1);
          setCountdown(3);
          setGameState('countdown');
        } else {
          endGame([...rounds, newRound]);
        }
      }, 1500);
    }
  }, [gameState, flashStartTime, currentRound, rounds, targetPosition]);

  // Auto-fail if no click during flash
  useEffect(() => {
    if (gameState === 'flash') {
      const timeout = setTimeout(() => {
        console.log('QuickClick: No click - auto fail');
        // Play error sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
          audio.volume = 0.1;
          audio.play().catch(() => {});
        } catch (e) {
          // Audio failed, continue silently
        }
        
        const newRound: Round = {
          roundNumber: currentRound,
          reactionTime: null,
          clicked: false,
          isBonus: currentRound === 4
        };
        
        setRounds(prev => [...prev, newRound]);
        setGameState('clicked');
        
        setTimeout(() => {
          if (currentRound < 4) {
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
    
    // Simple game end sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (e) {
      // Audio failed, continue silently
    }
    
    // Calculate results
    const validRounds = finalRounds.filter(r => r.reactionTime !== null);
    const avgReactionTime = validRounds.length > 0 
      ? validRounds.reduce((sum, r) => sum + r.reactionTime!, 0) / validRounds.length 
      : 0;
    
    const accuracy = (validRounds.length / 4) * 100; // Now 4 rounds total
    
    // Score based on speed and accuracy
    const speedScore = avgReactionTime > 0 ? Math.max(0, 1000 - avgReactionTime) : 0;
    const accuracyBonus = accuracy * 10;
    
    // Bonus round scoring
    const bonusRound = finalRounds.find(r => r.isBonus);
    let bonusScore = 0;
    if (bonusRound && bonusRound.reactionTime && bonusRound.accuracy) {
      // Bonus: reaction time + accuracy bonus
      const bonusSpeed = Math.max(0, 500 - bonusRound.reactionTime); // Up to 500 points for speed
      const bonusAccuracy = bonusRound.accuracy * 5; // Up to 500 points for accuracy
      bonusScore = bonusSpeed + bonusAccuracy;
      console.log(`Bonus scoring: Speed=${bonusSpeed}, Accuracy=${bonusAccuracy}, Total=${bonusScore}`);
    }
    
    const finalScore = Number((speedScore + accuracyBonus + bonusScore).toFixed(2));
    
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
                  <p><span className="text-purple-300 font-semibold">Bonus:</span> 4th round - click the target circle!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 animate-pulse"></div>
                  <p><span className="text-orange-300 font-semibold">Accuracy:</span> Closer to center = more bonus points!</p>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {currentRound === 4 ? 'BONUS ROUND!' : `Round ${currentRound} of 3`}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {currentRound === 4 
              ? 'Click the target circle when it appears!' 
              : 'Get ready to click when the screen flashes green!'
            }
          </p>
          <div className="text-8xl font-bold text-blue-500 animate-pulse">
            {countdown}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {currentRound === 4 ? 'Accuracy + Speed = Bonus Points!' : 'Prepare yourself...'}
          </p>
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
            ⚡ QuickClick - {currentRound === 4 ? 'BONUS ROUND' : `Round ${currentRound}/3`}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Completed: {rounds.length}/{currentRound === 4 ? '3+Bonus' : '3'}
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
                <div className="text-xl">
                  {currentRound === 4 ? "Don't click until you see the target!" : "Don't click yet!"}
                </div>
              </div>
            )}
            {gameState === 'flash' && (
              <div className="text-center">
                <div className="text-8xl font-bold mb-4 animate-bounce">
                  {currentRound === 4 ? 'TARGET!' : 'CLICK!'}
                </div>
                <div className="text-2xl">
                  {currentRound === 4 ? 'Click the circle!' : 'Click NOW!'}
                </div>
              </div>
            )}
            {gameState === 'clicked' && (
              <div className="text-center">
                {rounds.length > 0 && rounds[rounds.length - 1].reactionTime ? (
                  <div>
                    <div className="text-4xl font-bold mb-4">
                      {rounds[rounds.length - 1].reactionTime}ms
                    </div>
                    {rounds[rounds.length - 1].isBonus && rounds[rounds.length - 1].accuracy && (
                      <div className="text-2xl font-bold mb-2 text-yellow-300">
                        Accuracy: {rounds[rounds.length - 1].accuracy!.toFixed(1)}%
                      </div>
                    )}
                    <div className="text-xl">
                      {rounds[rounds.length - 1].isBonus ? 'Bonus Complete! 🎯' :
                       rounds[rounds.length - 1].reactionTime! < 200 ? 'Lightning Fast! ⚡' :
                       rounds[rounds.length - 1].reactionTime! < 300 ? 'Excellent! 🎯' :
                       rounds[rounds.length - 1].reactionTime! < 400 ? 'Good! 👍' :
                       'Keep practicing! 💪'}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl font-bold mb-4">Too Early!</div>
                    <div className="text-xl">
                      {currentRound === 4 ? 'Wait for the target circle!' : 'Wait for green next time!'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Target circle for bonus round */}
          {gameState === 'flash' && currentRound === 4 && targetPosition && (
            <>
              <div
                className="absolute w-16 h-16 bg-yellow-400 rounded-full border-4 border-yellow-200 animate-pulse shadow-lg"
                style={{
                  left: `${targetPosition.x}%`,
                  top: `${targetPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10
                }}
              />
              <div
                className="absolute w-8 h-8 bg-red-500 rounded-full border-2 border-red-300"
                style={{
                  left: `${targetPosition.x}%`,
                  top: `${targetPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 11
                }}
              />
            </>
          )}

          {/* Show click position for bonus round */}
          {gameState === 'clicked' && currentRound === 4 && clickPosition && (
            <div
              className="absolute w-4 h-4 bg-blue-400 rounded-full border-2 border-blue-200"
              style={{
                left: `${clickPosition.x}%`,
                top: `${clickPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 12
              }}
            />
          )}
        </div>

        {/* Round Results */}
        {rounds.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Round Results:</h3>
            <div className="grid grid-cols-4 gap-4">
              {rounds.map((round) => (
                <div key={round.roundNumber} className={`rounded-lg p-4 text-center ${
                  round.isBonus ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'
                }`}>
                  <div className="text-sm text-gray-600">
                    {round.isBonus ? 'Bonus' : `Round ${round.roundNumber}`}
                  </div>
                  <div className="text-lg font-bold">
                    {round.reactionTime ? `${round.reactionTime}ms` : 'Failed'}
                  </div>
                  {round.isBonus && round.accuracy && (
                    <div className="text-sm text-yellow-600 font-semibold">
                      {round.accuracy.toFixed(1)}% accuracy
                    </div>
                  )}
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
          <div>🎯 <strong>Bonus Round:</strong> Click the target circle for accuracy + speed points!</div>
        </div>
      </div>
    </div>
  );
}
