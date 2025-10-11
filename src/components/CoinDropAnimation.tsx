'use client';

import React, { useEffect, useState } from 'react';
import SoundEffects from '@/lib/SoundEffects';

interface Coin {
  id: number;
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  size: number;
  delay: number;
}

interface CoinDropAnimationProps {
  show: boolean;
  tokenCount: number;
  onComplete?: () => void;
  duration?: number;
}

export default function CoinDropAnimation({
  show,
  tokenCount,
  onComplete,
  duration = 3000
}: CoinDropAnimationProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (show) {
      console.log('💰 [CoinDrop] Starting coin drop animation for', tokenCount, 'tokens');
      setShowAnimation(true);
      
      // Play coin sounds
      try {
        // Play multiple coin sounds staggered
        for (let i = 0; i < Math.min(tokenCount, 10); i++) {
          setTimeout(() => {
            SoundEffects.playCoinDrop();
          }, i * 100);
        }
        
        // Play cash register sound
        setTimeout(() => {
          SoundEffects.playTokenPurchase();
        }, 200);
      } catch (error) {
        console.error('Error playing coin sounds:', error);
      }

      // Generate coins
      const newCoins: Coin[] = [];
      const coinCount = Math.min(tokenCount * 3, 30); // Up to 30 coins for visual effect
      
      for (let i = 0; i < coinCount; i++) {
        newCoins.push({
          id: i,
          x: 50 + (Math.random() - 0.5) * 40, // Center with spread
          y: -10,
          rotation: Math.random() * 360,
          velocityX: (Math.random() - 0.5) * 8,
          velocityY: Math.random() * 5 + 3,
          rotationSpeed: (Math.random() - 0.5) * 20,
          size: 30 + Math.random() * 20,
          delay: i * 50 // Stagger the drops
        });
      }
      
      setCoins(newCoins);

      // Cleanup after duration
      const timer = setTimeout(() => {
        setShowAnimation(false);
        setCoins([]);
        if (onComplete) {
          onComplete();
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
      setCoins([]);
    }
  }, [show, tokenCount, duration, onComplete]);

  if (!showAnimation) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Coins */}
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
            width: `${coin.size}px`,
            height: `${coin.size}px`,
            animation: `coinFall ${duration / 1000}s ease-in forwards`,
            animationDelay: `${coin.delay}ms`,
            transform: `rotate(${coin.rotation}deg)`,
            willChange: 'transform, top'
          }}
        >
          {/* Gold coin with shine effect */}
          <div className="relative w-full h-full">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-2xl animate-spin-slow">
              {/* Inner circle */}
              <div className="absolute inset-[10%] rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-600 flex items-center justify-center">
                {/* Dollar sign or token symbol */}
                <span className="text-yellow-900 font-black" style={{ fontSize: `${coin.size * 0.5}px` }}>
                  $
                </span>
              </div>
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}

      {/* Banner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-bounce-slow">
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-12 py-6 rounded-2xl shadow-2xl border-4 border-yellow-300 transform rotate-[-2deg] animate-wiggle">
          <h2 className="text-5xl font-black drop-shadow-lg mb-2">
            💰 +{tokenCount} TOKEN{tokenCount !== 1 ? 'S' : ''}! 💰
          </h2>
          <p className="text-2xl font-bold text-yellow-100 drop-shadow-md">
            CHA-CHING! 🎉
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes coinFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(0);
            opacity: 0;
          }
          10% {
            transform: translateY(50px) rotate(180deg) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(calc(50vh - 100px)) rotate(360deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-20px);
          }
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(-2deg);
          }
          50% {
            transform: rotate(2deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

