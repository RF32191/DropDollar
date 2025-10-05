import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AdOverlayProps {
  onAdComplete: () => void;
  onSkip?: () => void;
  duration?: number;
  allowSkip?: boolean;
  skipAfter?: number;
}

export default function AdOverlay({ 
  onAdComplete, 
  onSkip, 
  duration = 10, 
  allowSkip = false, 
  skipAfter = 5 
}: AdOverlayProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Enable skip button after specified time
    if (allowSkip && skipAfter < duration) {
      const skipTimer = setTimeout(() => {
        setCanSkip(true);
      }, skipAfter * 1000);

      return () => {
        clearInterval(timer);
        clearTimeout(skipTimer);
      };
    }

    return () => clearInterval(timer);
  }, [duration, allowSkip, skipAfter, onAdComplete]);

  const handleSkip = () => {
    if (canSkip && onSkip) {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="relative w-full max-w-4xl mx-4">
        {/* Ad Content Area */}
        <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl p-8 shadow-2xl border border-gray-700">
          
          {/* Ad Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">Advertisement</span>
            </div>
            
            {/* Skip Button */}
            {allowSkip && (
              <button
                onClick={handleSkip}
                disabled={!canSkip}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  canSkip
                    ? 'bg-gray-600 hover:bg-gray-500 text-white cursor-pointer'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                {canSkip ? 'Skip Ad' : `Skip in ${skipAfter - (duration - timeRemaining)}`}
              </button>
            )}
          </div>

          {/* Ad Content - Blank Template */}
          <div className="bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 rounded-xl p-12 text-center border border-gray-600">
            
            {/* Placeholder Ad Content */}
            <div className="space-y-6">
              <div className="text-6xl">📺</div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Advertisement Space
              </h2>
              
              <p className="text-xl text-gray-300 mb-6">
                Your ad could be here! Contact us for advertising opportunities.
              </p>
              
              {/* Fake Brand Elements */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mx-auto mb-3"></div>
                  <div className="text-white font-medium">Premium Gaming</div>
                  <div className="text-gray-400 text-sm">Experience the best</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg mx-auto mb-3"></div>
                  <div className="text-white font-medium">Skill Enhancement</div>
                  <div className="text-gray-400 text-sm">Level up your game</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mx-auto mb-3"></div>
                  <div className="text-white font-medium">Win More</div>
                  <div className="text-gray-400 text-sm">Increase your odds</div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  🎯 Ready to Compete?
                </h3>
                <p className="text-blue-100 mb-4">
                  Join thousands of players in skill-based competitions
                </p>
                <button className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                  Learn More
                </button>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="mt-6 text-center">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-full px-6 py-3 inline-flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">{timeRemaining}</span>
              </div>
              <span className="text-white font-medium">
                {timeRemaining === 1 ? 'Starting game...' : `Game starts in ${timeRemaining} seconds`}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 w-full max-w-md mx-auto bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((duration - timeRemaining) / duration) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Ad Info */}
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              Ads help keep DropDollar free to play. Thank you for your patience!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
