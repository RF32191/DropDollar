'use client';

import { useEffect, useState } from 'react';
import { SparklesIcon, TrophyIcon, StarIcon, FireIcon } from '@heroicons/react/24/solid';

interface LevelUpAnimationProps {
  oldLevel: number;
  newLevel: number;
  onComplete: () => void;
}

export default function LevelUpAnimation({ oldLevel, newLevel, onComplete }: LevelUpAnimationProps) {
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<'entering' | 'celebrating' | 'exiting'>('entering');
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    console.log('🎉 [LevelUpAnimation] Showing animation for level', oldLevel, '->', newLevel);
    
    // Generate a simple level-up sound using Web Audio API (copyright-free)
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔊 [LevelUpAnimation] Sound played');
    } catch (e) {
      console.log('⚠️ [LevelUpAnimation] Audio context not available:', e);
    }

    // Animation sequence
    setTimeout(() => setPhase('celebrating'), 300);
    setTimeout(() => setPhase('exiting'), 3000);
    setTimeout(() => {
      setShow(false);
      onComplete();
    }, 4000);

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 transition-opacity duration-500 ${
          phase === 'entering' ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Main Animation */}
      <div 
        className={`
          relative z-10
          transform transition-all duration-500
          ${phase === 'entering' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
          ${phase === 'exiting' ? 'scale-110 opacity-0' : ''}
        `}
      >
        {/* Glowing Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full blur-3xl opacity-75 animate-pulse" />
        
        {/* Main Container */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 rounded-3xl p-12 border-4 border-yellow-300 shadow-2xl">
          {/* Sparkles Background */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {[...Array(20)].map((_, i) => (
              <SparklesIcon
                key={i}
                className="absolute text-yellow-300 animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  width: `${10 + Math.random() * 20}px`,
                  height: `${10 + Math.random() * 20}px`,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 text-center">
            {/* Level Up Text */}
            <div className="mb-6">
              <h1 className="text-7xl font-black text-white mb-2 drop-shadow-2xl animate-bounce">
                LEVEL UP!
              </h1>
              <div className="flex items-center justify-center gap-4">
                <span className="text-6xl font-black text-yellow-200 drop-shadow-lg">
                  {oldLevel}
                </span>
                <ArrowRight className="w-12 h-12 text-white animate-pulse" />
                <span className="text-8xl font-black text-yellow-100 drop-shadow-lg animate-pulse">
                  {newLevel}
                </span>
              </div>
            </div>

            {/* Trophy Icon */}
            <div className="mb-6 animate-bounce">
              <TrophyIcon className="w-32 h-32 text-yellow-300 mx-auto drop-shadow-2xl" />
            </div>

            {/* Congratulations Text */}
            <p className="text-2xl font-bold text-white drop-shadow-lg mb-4">
              🎉 Congratulations! 🎉
            </p>
            <p className="text-xl text-yellow-100 drop-shadow-md">
              You've reached Level {newLevel}!
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-4 mt-6">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className="w-8 h-8 text-yellow-300 animate-spin"
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Fire Particles */}
        {phase === 'celebrating' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <FireIcon
                key={i}
                className="absolute text-orange-500 animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.5 + Math.random()}s`,
                  width: `${15 + Math.random() * 25}px`,
                  height: `${15 + Math.random() * 25}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

