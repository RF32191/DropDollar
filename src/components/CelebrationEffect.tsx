'use client';

import React, { useEffect, useState } from 'react';
import SoundEffects from '@/lib/SoundEffects';

interface CelebrationEffectProps {
  show: boolean;
  onComplete?: () => void;
  message?: string;
  duration?: number;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

export default function CelebrationEffect({ 
  show, 
  onComplete, 
  message = "Great Job!",
  duration = 3000 
}: CelebrationEffectProps) {
  const [confettiPieces, setConfettiPieces] = useState<Confetti[]>([]);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (show) {
      console.log('🎉 Starting celebration effect...');
      
      // Play celebration sound
      try {
        SoundEffects.playSuccess();
        SoundEffects.playPracticeComplete();
      } catch (error) {
        console.error('Error playing celebration sound:', error);
      }
      
      // Show message
      setShowMessage(true);
      
      // Generate confetti
      const pieces: Confetti[] = [];
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        '#F8B195', '#C06C84', '#6C5B7B', '#355C7D'
      ];
      
      for (let i = 0; i < 150; i++) {
        pieces.push({
          id: i,
          x: Math.random() * 100,
          y: -10,
          rotation: Math.random() * 360,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
          velocityX: (Math.random() - 0.5) * 4,
          velocityY: Math.random() * 3 + 2,
          rotationSpeed: (Math.random() - 0.5) * 10,
        });
      }
      
      setConfettiPieces(pieces);
      
      // Clean up after duration
      const timer = setTimeout(() => {
        console.log('🎉 Hiding celebration effect');
        setShowMessage(false);
        setConfettiPieces([]);
        if (onComplete) {
          onComplete();
        }
      }, duration);
      
      return () => {
        console.log('🎉 Cleaning up celebration effect');
        clearTimeout(timer);
      };
    } else {
      // Reset when show becomes false
      setShowMessage(false);
      setConfettiPieces([]);
    }
  }, [show, duration, onComplete]);

  // Animate confetti
  useEffect(() => {
    if (confettiPieces.length === 0) return;
    
    const animationFrame = requestAnimationFrame(function animate() {
      setConfettiPieces(prev => 
        prev.map(piece => ({
          ...piece,
          y: piece.y + piece.velocityY,
          x: piece.x + piece.velocityX,
          rotation: piece.rotation + piece.rotationSpeed,
          velocityY: piece.velocityY + 0.1, // Gravity
        })).filter(piece => piece.y < 110) // Remove pieces that fall off screen
      );
      
      if (confettiPieces.length > 0) {
        requestAnimationFrame(animate);
      }
    });
    
    return () => cancelAnimationFrame(animationFrame);
  }, [confettiPieces.length]);

  if (!show && !showMessage && confettiPieces.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Confetti */}
      {confettiPieces.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            opacity: 0.8,
          }}
        />
      ))}
      
      {/* Success Message */}
      {showMessage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-12 py-8 rounded-3xl shadow-2xl border-4 border-yellow-400 animate-bounce-slow">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">🎉</div>
              <h2 className="text-4xl font-extrabold mb-2 text-shadow-lg">
                {message}
              </h2>
              <div className="text-2xl font-bold text-yellow-300">
                Practice Complete!
              </div>
              <div className="flex justify-center space-x-4 mt-6 text-5xl">
                <span className="animate-bounce" style={{ animationDelay: '0s' }}>🎊</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>✨</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎯</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>🎊</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fireworks Effect */}
      {showMessage && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="firework firework-1"></div>
          <div className="firework firework-2"></div>
          <div className="firework firework-3"></div>
          <div className="firework firework-4"></div>
        </div>
      )}
      
      <style jsx>{`
        .animate-bounce-slow {
          animation: bounce 1s infinite;
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-5%);
            animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
          }
        }
        
        .text-shadow-lg {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
                       0 0 30px rgba(255, 255, 0, 0.6),
                       0 0 40px rgba(255, 200, 0, 0.4);
        }
        
        .firework {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          box-shadow: 
            0 0 20px 10px rgba(255, 255, 100, 0.8),
            0 0 40px 20px rgba(255, 200, 100, 0.6),
            0 0 60px 30px rgba(255, 150, 100, 0.4);
          animation: firework-animation 1.5s ease-out infinite;
        }
        
        .firework-1 {
          top: 20%;
          left: 20%;
          animation-delay: 0s;
        }
        
        .firework-2 {
          top: 30%;
          right: 20%;
          animation-delay: 0.3s;
        }
        
        .firework-3 {
          top: 40%;
          left: 30%;
          animation-delay: 0.6s;
        }
        
        .firework-4 {
          top: 25%;
          right: 30%;
          animation-delay: 0.9s;
        }
        
        @keyframes firework-animation {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(40);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

