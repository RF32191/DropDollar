'use client';

import React, { useEffect, useState } from 'react';
import SoundEffects from '@/lib/SoundEffects';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
  color: string;
  velocityX: number;
  velocityY: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  velocityX: number;
  velocityY: number;
}

interface GameVictoryAnimationProps {
  show: boolean;
  gameName: string;
  score: number;
  onComplete?: () => void;
  duration?: number;
}

export default function GameVictoryAnimation({
  show,
  gameName,
  score,
  onComplete,
  duration = 3000
}: GameVictoryAnimationProps) {
  const [stars, setStars] = useState<Star[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (show) {
      console.log('⭐ [GameVictory] Starting victory animation for', gameName);
      setShowAnimation(true);
      
      // Play victory sounds
      try {
        SoundEffects.playGameWin();
        setTimeout(() => SoundEffects.playPracticeComplete(), 200);
      } catch (error) {
        console.error('Error playing victory sound:', error);
      }

      // Generate stars
      const newStars: Star[] = [];
      const starColors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'];
      
      for (let i = 0; i < 20; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: -10 + Math.random() * -20,
          size: 20 + Math.random() * 30,
          rotation: Math.random() * 360,
          delay: i * 100,
          color: starColors[i % starColors.length],
          velocityX: (Math.random() - 0.5) * 6,
          velocityY: Math.random() * 4 + 2
        });
      }
      
      setStars(newStars);

      // Generate particles
      const newParticles: Particle[] = [];
      const particleColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
      
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: 50 + (Math.random() - 0.5) * 40,
          y: 50,
          size: 5 + Math.random() * 10,
          color: particleColors[i % particleColors.length],
          velocityX: (Math.random() - 0.5) * 15,
          velocityY: (Math.random() - 0.5) * 15
        });
      }
      
      setParticles(newParticles);

      // Cleanup after duration
      const timer = setTimeout(() => {
        setShowAnimation(false);
        setStars([]);
        setParticles([]);
        if (onComplete) {
          onComplete();
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setShowAnimation(false);
      setStars([]);
      setParticles([]);
    }
  }, [show, gameName, duration, onComplete]);

  if (!showAnimation) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={`particle-${particle.id}`}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            animation: `particleBurst ${duration / 1000}s ease-out forwards`,
            animationDelay: '0ms',
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transform: `translate(-50%, -50%)`,
            willChange: 'transform, opacity'
          }}
        />
      ))}

      {/* Stars */}
      {stars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="absolute"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `starFall ${duration / 1000}s ease-in forwards`,
            animationDelay: `${star.delay}ms`,
            willChange: 'transform, top'
          }}
        >
          {/* Five-pointed star */}
          <svg viewBox="0 0 51 48" fill={star.color} className="drop-shadow-2xl animate-spin-pulse">
            <path d="M25.5 0l7.854 16.18L51 18.873l-12.75 12.43L41.208 48 25.5 39.18 9.792 48l2.958-16.697L0 18.873l17.646-2.694z"/>
            {/* Glow effect */}
            <path d="M25.5 0l7.854 16.18L51 18.873l-12.75 12.43L41.208 48 25.5 39.18 9.792 48l2.958-16.697L0 18.873l17.646-2.694z" 
                  fill="white" 
                  opacity="0.4" 
                  className="animate-pulse"/>
          </svg>
        </div>
      ))}

      {/* Modern Gaming Banner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          {/* Glow effect behind banner */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-3xl blur-2xl opacity-60 animate-pulse-slow"></div>
          
          {/* Main banner */}
          <div className="relative bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 px-12 py-8 rounded-3xl shadow-2xl border-4 border-purple-500 animate-scale-in">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
            
            {/* Trophy icon with glow */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-600 rounded-full flex items-center justify-center border-4 border-yellow-300 shadow-2xl">
                  <span className="text-3xl">🏆</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mt-4">
              {/* VICTORY text with neon effect */}
              <div className="relative mb-3">
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-lg animate-glow tracking-wider">
                  VICTORY!
                </h1>
                {/* Neon glow */}
                <div className="absolute inset-0 text-6xl font-black text-purple-500 blur-lg opacity-50 animate-pulse">
                  VICTORY!
                </div>
              </div>

              {/* Game name */}
              <p className="text-2xl font-bold text-white mb-2 drop-shadow-md animate-slide-up">
                {gameName}
              </p>

              {/* Score with shine effect */}
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-md opacity-60"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 rounded-lg border-2 border-blue-400">
                  <p className="text-3xl font-black text-white drop-shadow-lg">
                    SCORE: <span className="text-yellow-300">{score.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Practice complete badge */}
              <div className="mt-4 inline-block">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2 rounded-full border-2 border-green-300 shadow-lg">
                  <p className="text-lg font-bold text-white drop-shadow-md">
                    ⭐ PRACTICE COMPLETE ⭐
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-400 to-transparent"></div>

            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
            <div className="absolute top-2 right-2 w-3 h-3 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes starFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(0);
            opacity: 0;
          }
          10% {
            transform: translateY(50px) rotate(180deg) scale(1);
            opacity: 1;
          }
          90% {
            transform: translateY(calc(100vh + 50px)) rotate(720deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(calc(100vh + 100px)) rotate(720deg) scale(0);
            opacity: 0;
          }
        }

        @keyframes particleBurst {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(-50% + var(--vx, 0) * 300px),
              calc(-50% + var(--vy, 0) * 300px)
            ) scale(0);
            opacity: 0;
          }
        }

        @keyframes spin-pulse {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.2);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0.5) rotate(-5deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.05) rotate(2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes glow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.8),
                         0 0 40px rgba(255, 105, 180, 0.6),
                         0 0 60px rgba(138, 43, 226, 0.4);
          }
          50% {
            text-shadow: 0 0 30px rgba(255, 215, 0, 1),
                         0 0 60px rgba(255, 105, 180, 0.8),
                         0 0 90px rgba(138, 43, 226, 0.6);
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-spin-pulse {
          animation: spin-pulse 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          animation-delay: 0.3s;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

