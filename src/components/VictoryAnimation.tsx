'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrophyIcon, 
  StarIcon, 
  FireIcon,
  SparklesIcon,
  BanknotesIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface VictoryAnimationProps {
  isVisible: boolean;
  tokensWon: number;
  isWinner: boolean;
  opponentName?: string;
  userScore: number;
  opponentScore?: number;
  gameType: string;
  onAnimationComplete: () => void;
}

export default function VictoryAnimation({
  isVisible,
  tokensWon,
  isWinner,
  opponentName,
  userScore,
  opponentScore,
  gameType,
  onAnimationComplete
}: VictoryAnimationProps) {
  const [showCoins, setShowCoins] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Play victory sound
      const audio = new Audio('/sounds/victory.mp3');
      audio.play().catch(() => {
        // Fallback sound if file doesn't exist
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      });

      // Animation sequence
      setTimeout(() => setShowCoins(true), 200);
      setTimeout(() => setShowText(true), 800);
      setTimeout(() => setShowDetails(true), 1200);
      setTimeout(() => onAnimationComplete(), 4000);
    }
  }, [isVisible, onAnimationComplete]);

  if (!isVisible) return null;

  const formatScore = (score: number) => score.toLocaleString();
  const formatTokens = (tokens: number) => {
    if (tokens >= 1) {
      return `$${tokens.toFixed(2)}`;
    } else {
      return `${(tokens * 100).toFixed(0)}¢`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Confetti */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 ${
              ['bg-yellow-400', 'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400'][i % 5]
            } rounded-full animate-bounce`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
        
        {/* Sparkles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Trophy Animation */}
        <div className={`transform transition-all duration-1000 ${
          showCoins ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}>
          <div className="relative mb-6">
            <TrophyIcon className="w-24 h-24 text-yellow-400 mx-auto animate-bounce" />
            
            {/* Rotating coins around trophy */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-6 h-6 bg-yellow-400 rounded-full animate-spin"
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: '0 60px',
                  transform: `rotate(${i * 45}deg) translateY(-60px)`,
                  animationDuration: '3s',
                  animationDelay: `${i * 0.1}s`
                }}
              >
                <BanknotesIcon className="w-4 h-4 text-yellow-600 m-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Victory Text */}
        <div className={`transform transition-all duration-1000 ${
          showText ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <h1 className={`text-4xl font-bold mb-2 ${
            isWinner ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {isWinner ? 'VICTORY!' : 'GAME COMPLETE'}
          </h1>
          
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="w-6 h-6 text-yellow-400 mr-2" />
            <span className="text-xl text-white">You earned</span>
            <SparklesIcon className="w-6 h-6 text-yellow-400 ml-2" />
          </div>
        </div>

        {/* Token Amount */}
        <div className={`transform transition-all duration-1000 ${
          showDetails ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}>
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black p-6 rounded-lg mb-6">
            <div className="flex items-center justify-center">
              <BanknotesIcon className="w-8 h-8 mr-3" />
              <span className="text-3xl font-bold">{formatTokens(tokensWon)}</span>
            </div>
            <p className="text-sm mt-2 opacity-80">Added to your wallet</p>
          </div>

          {/* Game Details */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Match Results</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Game:</span>
                <span className="text-white font-medium capitalize">{gameType.replace('-', ' ')}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Your Score:</span>
                <span className="text-white font-bold">{formatScore(userScore)}</span>
              </div>
              
              {opponentScore && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Opponent:</span>
                  <span className="text-white font-medium">{opponentName || 'Anonymous'}</span>
                </div>
              )}
              
              {opponentScore && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Opponent Score:</span>
                  <span className="text-white font-bold">{formatScore(opponentScore)}</span>
                </div>
              )}
              
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Result:</span>
                  <span className={`font-bold ${
                    isWinner ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isWinner ? 'WINNER!' : 'DEFEAT'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onAnimationComplete}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Continue
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
