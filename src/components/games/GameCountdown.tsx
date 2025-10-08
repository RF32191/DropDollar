'use client';

import React, { useState, useEffect } from 'react';
import { GameAudio } from '@/utils/gameAudio';

interface GameCountdownProps {
  onCountdownComplete: () => void;
  onCancel?: () => void;
  countdownFrom?: number;
  showTitle?: string;
}

export default function GameCountdown({ 
  onCountdownComplete, 
  onCancel, 
  countdownFrom = 5,
  showTitle = "Get Ready!"
}: GameCountdownProps) {
  const [count, setCount] = useState(countdownFrom);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive) return;

    if (count > 0) {
      // Play countdown sound
      GameAudio.playCountdown(count);
      
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Countdown finished - play start sound and notify parent
      GameAudio.playGameStartCountdown();
      setTimeout(() => {
        onCountdownComplete();
      }, 300); // Small delay after the "GO!" sound
    }
  }, [count, isActive, onCountdownComplete]);

  const handleCancel = () => {
    setIsActive(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (!isActive && count > 0) {
    return null; // Component was cancelled
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-md mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {showTitle}
        </h2>
        
        {count > 0 ? (
          <>
            <div className="text-8xl font-bold text-blue-600 mb-4 animate-pulse">
              {count}
            </div>
            <div className="text-lg text-gray-600 mb-6">
              Game starts in...
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl font-bold text-green-600 mb-4 animate-bounce">
              GO!
            </div>
            <div className="text-lg text-gray-600">
              Starting game...
            </div>
          </>
        )}
        
        {onCancel && count > 0 && (
          <button
            onClick={handleCancel}
            className="mt-4 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
