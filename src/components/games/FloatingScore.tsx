'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface ScorePopup {
  id: number;
  points: number;
  x: number;
  y: number;
  type: 'normal' | 'bonus' | 'perfect' | 'combo' | 'critical';
  label?: string;
}

interface FloatingScoreProps {
  popups: ScorePopup[];
  onRemove: (id: number) => void;
}

// Call of Duty style floating score indicators
export default function FloatingScore({ popups, onRemove }: FloatingScoreProps) {
  // Safety check for undefined popups
  if (!popups || !Array.isArray(popups)) {
    return null;
  }
  
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {popups.map((popup) => (
        <ScoreIndicator key={popup.id} popup={popup} onComplete={() => onRemove(popup.id)} />
      ))}
    </div>
  );
}

interface ScoreIndicatorProps {
  popup: ScorePopup;
  onComplete: () => void;
}

function ScoreIndicator({ popup, onComplete }: ScoreIndicatorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300); // Wait for fade out animation
    }, 1200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Color based on type
  const getColor = () => {
    switch (popup.type) {
      case 'perfect':
        return 'text-yellow-400'; // Gold for perfect
      case 'critical':
        return 'text-red-500'; // Red for critical hits
      case 'combo':
        return 'text-purple-400'; // Purple for combos
      case 'bonus':
        return 'text-cyan-400'; // Cyan for bonuses
      default:
        return 'text-white'; // White for normal
    }
  };

  const getGlow = () => {
    switch (popup.type) {
      case 'perfect':
        return '0 0 20px rgba(250, 204, 21, 0.8), 0 0 40px rgba(250, 204, 21, 0.4)';
      case 'critical':
        return '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)';
      case 'combo':
        return '0 0 20px rgba(192, 132, 252, 0.8), 0 0 40px rgba(192, 132, 252, 0.4)';
      case 'bonus':
        return '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.4)';
      default:
        return '0 0 10px rgba(255, 255, 255, 0.6)';
    }
  };

  const getSize = () => {
    if (popup.points >= 500) return 'text-4xl';
    if (popup.points >= 200) return 'text-3xl';
    if (popup.points >= 100) return 'text-2xl';
    if (popup.points >= 50) return 'text-xl';
    return 'text-lg';
  };

  return (
    <div
      className={`absolute font-black ${getColor()} ${getSize()} transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: `${popup.x}%`,
        top: `${popup.y}%`,
        transform: 'translate(-50%, -50%)',
        textShadow: getGlow(),
        animation: visible ? 'scoreFloat 1.2s ease-out forwards' : undefined,
        WebkitTextStroke: popup.type !== 'normal' ? '1px rgba(0,0,0,0.5)' : undefined,
      }}
    >
      <div className="flex flex-col items-center">
        <span>+{popup.points}</span>
        {popup.label && (
          <span className="text-xs uppercase tracking-wider opacity-90 mt-0.5">
            {popup.label}
          </span>
        )}
      </div>
    </div>
  );
}

// Hook for managing score popups
export function useFloatingScores() {
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const nextIdRef = React.useRef(0);

  const addPopup = useCallback((
    points: number,
    x: number,
    y: number,
    type: ScorePopup['type'] = 'normal',
    label?: string
  ) => {
    const id = nextIdRef.current++;
    // Add some randomness to position to prevent stacking
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 5;
    
    setPopups(prev => [...prev, {
      id,
      points,
      x: Math.max(5, Math.min(95, x + offsetX)),
      y: Math.max(5, Math.min(95, y + offsetY)),
      type,
      label
    }]);
  }, []);

  const removePopup = useCallback((id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  return { popups, addPopup, removePopup };
}

