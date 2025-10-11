'use client';

import React, { useEffect, useState } from 'react';

interface CoinAnimationProps {
  isActive: boolean;
  onComplete: () => void;
  tokenAmount: number;
}

export default function CoinAnimation({ isActive, onComplete, tokenAmount }: CoinAnimationProps) {
  const [coins, setCoins] = useState<Array<{ 
    id: number; 
    x: number; 
    y: number; 
    rotation: number; 
    scale: number;
    delay: number;
    finalY: number;
  }>>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isActive && typeof window !== 'undefined') {
      try {
        // Create multiple coins for animation
        const coinCount = Math.min(tokenAmount || 1, 15); // Max 15 coins, fallback to 1
        const newCoins = Array.from({ length: coinCount }, (_, i) => ({
          id: i,
          x: Math.random() * (window.innerWidth - 100),
          y: window.innerHeight + 50,
          rotation: Math.random() * 360,
          scale: 0.6 + Math.random() * 0.4,
          delay: Math.random() * 500,
          finalY: Math.random() * (window.innerHeight * 0.3) + 50,
        }));
        
        setCoins(newCoins);
        setShowSuccess(true);

        // Play multiple cash sounds
        playCashSounds();

        // Animate coins with staggered timing
        newCoins.forEach((coin, index) => {
          setTimeout(() => {
            setCoins(prevCoins => 
              prevCoins.map(c => 
                c.id === coin.id 
                  ? { ...c, y: coin.finalY, rotation: c.rotation + 720 }
                  : c
              )
            );
          }, coin.delay);
        });

        // Complete animation after duration
        setTimeout(() => {
          setCoins([]);
          setShowSuccess(false);
          onComplete();
        }, 3000);
      } catch (error) {
        console.error('Coin animation error:', error);
        // Fallback: just show success message
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onComplete();
        }, 2000);
      }
    }
  }, [isActive, tokenAmount, onComplete]);

  const playCashSounds = () => {
    // Play multiple cash register sounds
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        playCashSound();
      }, i * 200);
    }
  };

  const playCashSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create cash register sound effect
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Cash register sound: ascending chime
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.15);
      oscillator.frequency.exponentialRampToValueAtTime(1400, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Animated coins */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute transition-all duration-1500 ease-out"
          style={{
            left: coin.x,
            top: coin.y,
            transform: `rotate(${coin.rotation}deg) scale(${coin.scale})`,
            transitionDelay: `${coin.delay}ms`,
          }}
        >
          {/* Coin with shine effect */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full shadow-2xl animate-pulse">
              <div className="absolute inset-1 bg-gradient-to-br from-yellow-300 to-yellow-700 rounded-full flex items-center justify-center">
                <span className="text-yellow-900 font-bold text-lg">$</span>
              </div>
              {/* Shine effect */}
              <div className="absolute top-1 left-2 w-4 h-4 bg-white opacity-60 rounded-full blur-sm"></div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Success celebration overlay */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-12 py-6 rounded-2xl shadow-2xl text-3xl font-bold animate-bounce border-4 border-green-300">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🎉</span>
              <div className="text-center">
                <div className="text-2xl">+{tokenAmount} Tokens</div>
                <div className="text-lg opacity-90">Successfully Purchased!</div>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>
        </div>
      )}

      {/* Confetti effect */}
      {showSuccess && (
        <div className="absolute inset-0">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}