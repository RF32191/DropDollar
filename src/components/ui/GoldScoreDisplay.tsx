'use client';

import React, { useEffect, useRef } from 'react';
import { SparklesIcon, StarIcon } from '@heroicons/react/24/solid';

interface GoldScoreDisplayProps {
  score: number;
  isPersonalBest?: boolean;
  showParticles?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
}

// Sparkle particle effect
function SparkleEffect({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!active) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    interface Sparkle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      rotation: number;
      rotationSpeed: number;
      color: string;
    }
    
    const sparkles: Sparkle[] = [];
    const colors = ['#FFD700', '#FFA500', '#FFEC8B', '#FFFACD', '#FFE4B5'];
    
    // Create initial sparkles
    for (let i = 0; i < 15; i++) {
      sparkles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 2,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.8 + 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    let animationId: number;
    
    function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, opacity: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;
      
      // Draw 4-point star
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.3, -size * 0.3);
      ctx.lineTo(size, 0);
      ctx.lineTo(size * 0.3, size * 0.3);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.3, size * 0.3);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-size * 0.3, -size * 0.3);
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add glow
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 2;
      ctx.fill();
      
      ctx.restore();
    }
    
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      
      sparkles.forEach(s => {
        drawSparkle(ctx!, s.x, s.y, s.size, s.rotation, s.color, s.opacity);
        
        s.x += s.speedX;
        s.y += s.speedY;
        s.rotation += s.rotationSpeed;
        s.opacity -= 0.008;
        
        // Reset sparkle when faded
        if (s.opacity <= 0) {
          s.x = Math.random() * canvas!.width;
          s.y = Math.random() * canvas!.height;
          s.opacity = Math.random() * 0.8 + 0.2;
          s.size = Math.random() * 4 + 2;
        }
        
        // Wrap around edges
        if (s.x < 0) s.x = canvas!.width;
        if (s.x > canvas!.width) s.x = 0;
        if (s.y < 0) s.y = canvas!.height;
        if (s.y > canvas!.height) s.y = 0;
      });
      
      animationId = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, [active]);
  
  if (!active) return null;
  
  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
}

export default function GoldScoreDisplay({ 
  score, 
  isPersonalBest = false, 
  showParticles = true,
  size = 'md',
  label
}: GoldScoreDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };
  
  const containerClasses = {
    sm: 'py-1 px-2',
    md: 'py-2 px-4',
    lg: 'py-3 px-5',
    xl: 'py-4 px-6'
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${containerClasses[size]}`}>
      {/* Sparkle effect for personal bests */}
      {isPersonalBest && showParticles && <SparkleEffect active={true} />}
      
      {/* Label */}
      {label && (
        <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</span>
      )}
      
      {/* Score container */}
      <div className={`relative flex items-center gap-2 ${isPersonalBest ? 'animate-pulse' : ''}`} style={{ animationDuration: '2s' }}>
        {/* Personal Best icon */}
        {isPersonalBest && (
          <StarIcon className={`text-yellow-400 ${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'}`} />
        )}
        
        {/* Score value with gold gradient */}
        <span 
          className={`font-bold ${sizeClasses[size]} bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent`}
          style={{
            textShadow: isPersonalBest ? '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 165, 0, 0.3)' : undefined,
            filter: isPersonalBest ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))' : undefined
          }}
        >
          {score.toLocaleString()}
        </span>
        
        {/* Sparkle icon for personal bests */}
        {isPersonalBest && (
          <SparklesIcon 
            className={`text-yellow-400 animate-spin ${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6'}`} 
            style={{ animationDuration: '3s' }} 
          />
        )}
      </div>
      
      {/* Personal Best badge */}
      {isPersonalBest && (
        <div className="mt-1 px-2 py-0.5 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-full">
          <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1">
            <StarIcon className="w-3 h-3" />
            PERSONAL BEST
          </span>
        </div>
      )}
    </div>
  );
}

// Compact inline version
export function GoldScoreInline({ 
  score, 
  isPersonalBest = false 
}: { 
  score: number; 
  isPersonalBest?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {isPersonalBest && <StarIcon className="w-4 h-4 text-yellow-400" />}
      <span 
        className={`font-bold bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent ${isPersonalBest ? 'animate-pulse' : ''}`}
        style={{ animationDuration: '2s' }}
      >
        {score.toLocaleString()}
      </span>
      {isPersonalBest && <SparklesIcon className="w-4 h-4 text-yellow-400 animate-spin" style={{ animationDuration: '3s' }} />}
    </span>
  );
}

