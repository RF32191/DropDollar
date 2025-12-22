'use client';

import React, { useState, useEffect } from 'react';

// ============================================
// FIREPLACE THEME - For Hot Sell Page
// Cozy Christmas cabin, warm fire, hanging lights
// ============================================
export function FireplaceOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Warm red/green Christmas gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(100,20,20,0.3) 0%, rgba(20,60,30,0.2) 50%, rgba(80,30,20,0.35) 100%)',
        }}
      />
      
      {/* Christmas string lights at top */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-center">
        <div className="flex gap-6 sm:gap-10">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-4 rounded-full animate-light-twinkle ${
                i % 3 === 0 ? 'bg-red-500 shadow-red-500/80' : 
                i % 3 === 1 ? 'bg-green-500 shadow-green-500/80' : 
                'bg-yellow-400 shadow-yellow-400/80'
              }`}
              style={{
                animationDelay: `${i * 0.2}s`,
                boxShadow: `0 0 10px 3px ${
                  i % 3 === 0 ? 'rgba(239,68,68,0.6)' : 
                  i % 3 === 1 ? 'rgba(34,197,94,0.6)' : 
                  'rgba(250,204,21,0.6)'
                }`,
              }}
            />
          ))}
        </div>
        {/* String wire */}
        <div className="absolute top-5 left-0 right-0 h-px bg-gray-600/50" style={{ 
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(100,100,100,0.3) 20px, rgba(100,100,100,0.3) 40px)' 
        }} />
      </div>
      
      {/* Fireplace glow at bottom center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-48">
        <div 
          className="absolute inset-0 animate-fire-glow"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(255,100,50,0.35) 0%, rgba(255,50,20,0.15) 40%, transparent 70%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-fire-glow-alt"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(255,150,50,0.25) 0%, transparent 50%)',
          }}
        />
      </div>
      
      {/* Red and green corner glows */}
      <div 
        className="absolute bottom-0 left-0 w-64 h-64"
        style={{
          background: 'radial-gradient(circle at 0% 100%, rgba(200,50,50,0.15) 0%, transparent 50%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-64 h-64"
        style={{
          background: 'radial-gradient(circle at 100% 100%, rgba(50,150,50,0.15) 0%, transparent 50%)',
        }}
      />
      
      {/* Warm Christmas vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, transparent 30%, rgba(60,20,20,0.3) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes fire-glow { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes fire-glow-alt { 0%, 100% { opacity: 0.6; } 33% { opacity: 0.9; } 66% { opacity: 0.7; } }
        @keyframes light-twinkle { 0%, 100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        .animate-fire-glow { animation: fire-glow 2s ease-in-out infinite; }
        .animate-fire-glow-alt { animation: fire-glow-alt 1.5s ease-in-out infinite; }
        .animate-light-twinkle { animation: light-twinkle 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SNOWBALL THEME - For 1v1 Page
// Christmas battle, icicles, snow
// ============================================
export function SnowballOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Red and green battle gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(150,30,30,0.25) 0%, rgba(20,20,50,0.3) 50%, rgba(30,100,50,0.25) 100%)',
        }}
      />
      
      {/* Icicles hanging from top */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="relative"
            style={{ marginTop: `${(i % 3) * 5}px` }}
          >
            {/* Icicle shape */}
            <div 
              className="w-2 bg-gradient-to-b from-cyan-200/80 via-cyan-300/60 to-transparent animate-icicle-glow"
              style={{
                height: `${30 + (i % 4) * 15}px`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                animationDelay: `${i * 0.3}s`,
              }}
            />
            {/* Drip */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-300/60 rounded-full animate-drip"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          </div>
        ))}
      </div>
      
      {/* Falling snow */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-snowfall"
            style={{
              width: `${3 + (i % 3) * 2}px`,
              height: `${3 + (i % 3) * 2}px`,
              left: `${(i * 7) + 2}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${8 + (i % 4) * 2}s`,
              opacity: 0.5 + (i % 3) * 0.15,
            }}
          />
        ))}
      </div>
      
      {/* Red vs Green sides */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-24"
        style={{
          background: 'linear-gradient(90deg, rgba(200,50,50,0.2) 0%, transparent 100%)',
        }}
      />
      <div 
        className="absolute top-0 bottom-0 right-0 w-24"
        style={{
          background: 'linear-gradient(-90deg, rgba(50,150,50,0.2) 0%, transparent 100%)',
        }}
      />
      
      {/* Snow ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: 'linear-gradient(0deg, rgba(255,255,255,0.25) 0%, rgba(200,220,255,0.1) 50%, transparent 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes icicle-glow { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes drip { 0%, 90% { transform: translateX(-50%) translateY(0); opacity: 0; } 95% { opacity: 0.6; } 100% { transform: translateX(-50%) translateY(30px); opacity: 0; } }
        @keyframes snowfall { 0% { transform: translateY(-20px) translateX(0); } 100% { transform: translateY(100vh) translateX(30px); } }
        .animate-icicle-glow { animation: icicle-glow 3s ease-in-out infinite; }
        .animate-drip { animation: drip 4s ease-in-out infinite; }
        .animate-snowfall { animation: snowfall 10s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// NORTH POLE THEME - For Winner Takes All Page
// Santa's workshop, magical Christmas lights
// ============================================
export function NorthPoleOverlay() {
  const [activeLights, setActiveLights] = useState<number[]>([]);
  
  useEffect(() => {
    // Random light chase effect
    const interval = setInterval(() => {
      const newActive = Array.from({ length: 5 }, () => Math.floor(Math.random() * 20));
      setActiveLights(newActive);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Magical red/green night sky */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(20,40,30,0.5) 0%, rgba(60,20,30,0.35) 50%, rgba(30,60,40,0.4) 100%)',
        }}
      />
      
      {/* Christmas light border all around */}
      <div className="absolute inset-0">
        {/* Top lights */}
        <div className="absolute top-2 left-0 right-0 flex justify-around">
          {[...Array(20)].map((_, i) => (
            <div
              key={`top-${i}`}
              className={`w-2 h-3 rounded-full transition-all duration-300 ${
                i % 2 === 0 ? 'bg-red-500' : 'bg-green-500'
              } ${activeLights.includes(i) ? 'scale-125' : 'scale-100'}`}
              style={{
                boxShadow: activeLights.includes(i) 
                  ? `0 0 15px 5px ${i % 2 === 0 ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.8)'}` 
                  : `0 0 8px 2px ${i % 2 === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Candy cane poles on sides */}
      <div className="absolute left-4 top-1/4 bottom-1/4 w-4 overflow-hidden opacity-40">
        <div 
          className="w-full h-full animate-candy-stripe"
          style={{
            background: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, white 10px, white 20px)',
          }}
        />
      </div>
      <div className="absolute right-4 top-1/4 bottom-1/4 w-4 overflow-hidden opacity-40">
        <div 
          className="w-full h-full animate-candy-stripe"
          style={{
            background: 'repeating-linear-gradient(-45deg, #16a34a, #16a34a 10px, white 10px, white 20px)',
          }}
        />
      </div>
      
      {/* Falling snow */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-snowfall"
            style={{
              width: `${2 + (i % 3) * 2}px`,
              height: `${2 + (i % 3) * 2}px`,
              left: `${(i * 8) + 4}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${10 + (i % 3) * 3}s`,
              opacity: 0.4 + (i % 3) * 0.1,
            }}
          />
        ))}
      </div>
      
      {/* Star on top center */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <div 
          className="text-4xl animate-star-glow"
          style={{ textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.4)' }}
        >
          ⭐
        </div>
      </div>
      
      {/* Snow ground with sparkle */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20"
        style={{
          background: 'linear-gradient(0deg, rgba(255,255,255,0.3) 0%, rgba(200,230,255,0.15) 60%, transparent 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes candy-stripe { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }
        @keyframes snowfall { 0% { transform: translateY(-20px); } 100% { transform: translateY(100vh); } }
        @keyframes star-glow { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } }
        .animate-candy-stripe { animation: candy-stripe 1s linear infinite; }
        .animate-snowfall { animation: snowfall 12s linear infinite; }
        .animate-star-glow { animation: star-glow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TREASURE THEME - For Coin Play Page
// Golden presents, Christmas riches
// ============================================
export function TreasureOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Rich red/gold/green gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(100,30,30,0.3) 0%, rgba(80,60,20,0.25) 50%, rgba(30,80,40,0.3) 100%)',
        }}
      />
      
      {/* Hanging ornaments */}
      <div className="absolute top-0 left-0 right-0 h-32">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-ornament-swing"
            style={{
              left: `${(i * 12) + 6}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            {/* String */}
            <div className="w-px h-8 bg-gray-400/50 mx-auto" />
            {/* Ornament */}
            <div 
              className={`w-6 h-6 rounded-full ${
                i % 3 === 0 ? 'bg-gradient-to-br from-red-400 to-red-600' :
                i % 3 === 1 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                'bg-gradient-to-br from-yellow-400 to-yellow-600'
              }`}
              style={{
                boxShadow: `0 0 15px 3px ${
                  i % 3 === 0 ? 'rgba(239,68,68,0.5)' :
                  i % 3 === 1 ? 'rgba(34,197,94,0.5)' :
                  'rgba(234,179,8,0.5)'
                }`,
              }}
            >
              {/* Shine */}
              <div className="absolute top-1 left-1 w-2 h-2 bg-white/40 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Golden sparkles */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"
            style={{
              left: `${(i * 12) + 5}%`,
              top: `${20 + (i % 4) * 15}%`,
              animationDelay: `${i * 0.4}s`,
              boxShadow: '0 0 6px 2px rgba(234,179,8,0.6)',
            }}
          />
        ))}
      </div>
      
      {/* Gift box silhouettes at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 flex justify-around items-end opacity-30">
        <div className="w-12 h-10 bg-red-700 rounded-sm relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full bg-yellow-500" />
          <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-500" />
        </div>
        <div className="w-16 h-14 bg-green-700 rounded-sm relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full bg-red-500" />
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
        </div>
        <div className="w-10 h-8 bg-red-700 rounded-sm relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full bg-green-500" />
          <div className="absolute top-0 left-0 right-0 h-2 bg-green-500" />
        </div>
      </div>
      
      {/* Warm Christmas vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(60,30,20,0.35) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes ornament-swing { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes sparkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        .animate-ornament-swing { animation: ornament-swing 4s ease-in-out infinite; }
        .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// WINTER THEME - For Dashboard
// Cozy winter home, Christmas lights, icicles
// ============================================
export function WinterOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cool red/green winter gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,50,40,0.35) 0%, rgba(50,30,40,0.25) 50%, rgba(40,50,60,0.3) 100%)',
        }}
      />
      
      {/* Icicles at top */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 bg-gradient-to-b from-cyan-200/70 via-cyan-300/50 to-transparent animate-icicle-shimmer"
            style={{
              height: `${20 + (i % 5) * 8}px`,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      
      {/* Christmas string lights */}
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <div className="flex gap-8">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-3 rounded-full animate-light-pulse ${
                i % 2 === 0 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{
                animationDelay: `${i * 0.2}s`,
                boxShadow: `0 0 8px 2px ${i % 2 === 0 ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Gentle snowfall */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-gentle-snow"
            style={{
              width: `${2 + (i % 2) * 2}px`,
              height: `${2 + (i % 2) * 2}px`,
              left: `${(i * 10) + 5}%`,
              animationDelay: `${i * 1}s`,
              animationDuration: `${12 + (i % 3) * 3}s`,
              opacity: 0.35 + (i % 2) * 0.1,
            }}
          />
        ))}
      </div>
      
      {/* Warm corner glows */}
      <div 
        className="absolute bottom-0 left-0 w-48 h-48"
        style={{
          background: 'radial-gradient(circle at 0% 100%, rgba(200,100,100,0.12) 0%, transparent 50%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-48 h-48"
        style={{
          background: 'radial-gradient(circle at 100% 100%, rgba(100,180,100,0.12) 0%, transparent 50%)',
        }}
      />
      
      {/* Subtle blue winter tint */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(30,50,70,0.25) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes icicle-shimmer { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.9; } }
        @keyframes light-pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }
        @keyframes gentle-snow { 0% { transform: translateY(-10px) translateX(0); } 100% { transform: translateY(100vh) translateX(20px); } }
        .animate-icicle-shimmer { animation: icicle-shimmer 3s ease-in-out infinite; }
        .animate-light-pulse { animation: light-pulse 1.5s ease-in-out infinite; }
        .animate-gentle-snow { animation: gentle-snow 14s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TOYSHOP THEME - For Games Page
// Magical toy shop, Christmas decorations
// ============================================
export function ToyshopOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Magical red/green gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(80,30,40,0.35) 0%, rgba(40,60,40,0.3) 50%, rgba(60,40,50,0.35) 100%)',
        }}
      />
      
      {/* Garland with lights at top */}
      <div className="absolute top-0 left-0 right-0 h-16">
        {/* Garland base */}
        <div 
          className="absolute top-4 left-0 right-0 h-6"
          style={{
            background: 'linear-gradient(180deg, rgba(20,80,30,0.4) 0%, rgba(30,100,40,0.3) 50%, rgba(20,80,30,0.4) 100%)',
          }}
        />
        {/* Lights on garland */}
        <div className="absolute top-5 left-0 right-0 flex justify-around">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-3 rounded-full animate-garland-light ${
                i % 4 === 0 ? 'bg-red-500' :
                i % 4 === 1 ? 'bg-yellow-400' :
                i % 4 === 2 ? 'bg-green-500' :
                'bg-blue-400'
              }`}
              style={{
                animationDelay: `${i * 0.15}s`,
                boxShadow: `0 0 8px 2px ${
                  i % 4 === 0 ? 'rgba(239,68,68,0.6)' :
                  i % 4 === 1 ? 'rgba(250,204,21,0.6)' :
                  i % 4 === 2 ? 'rgba(34,197,94,0.6)' :
                  'rgba(96,165,250,0.6)'
                }`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Holly decorations in corners */}
      <div className="absolute top-20 left-4 opacity-50">
        <div className="flex gap-1">
          <div className="w-3 h-4 bg-green-700 rounded-full rotate-45" />
          <div className="w-3 h-4 bg-green-700 rounded-full -rotate-45" />
        </div>
        <div className="flex justify-center gap-0.5 -mt-2">
          <div className="w-2 h-2 bg-red-600 rounded-full" />
          <div className="w-2 h-2 bg-red-600 rounded-full" />
          <div className="w-2 h-2 bg-red-600 rounded-full" />
        </div>
      </div>
      <div className="absolute top-20 right-4 opacity-50 scale-x-[-1]">
        <div className="flex gap-1">
          <div className="w-3 h-4 bg-green-700 rounded-full rotate-45" />
          <div className="w-3 h-4 bg-green-700 rounded-full -rotate-45" />
        </div>
        <div className="flex justify-center gap-0.5 -mt-2">
          <div className="w-2 h-2 bg-red-600 rounded-full" />
          <div className="w-2 h-2 bg-red-600 rounded-full" />
          <div className="w-2 h-2 bg-red-600 rounded-full" />
        </div>
      </div>
      
      {/* Falling snowflakes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white/40 animate-snowflake-fall"
            style={{
              left: `${(i * 8) + 4}%`,
              fontSize: `${10 + (i % 3) * 4}px`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${10 + (i % 4) * 2}s`,
            }}
          >
            ❄
          </div>
        ))}
      </div>
      
      {/* Toy shelf glow on sides */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-20 opacity-30"
        style={{
          background: 'linear-gradient(90deg, rgba(180,100,50,0.25) 0%, transparent 100%)',
        }}
      />
      <div 
        className="absolute top-0 bottom-0 right-0 w-20 opacity-30"
        style={{
          background: 'linear-gradient(-90deg, rgba(180,100,50,0.25) 0%, transparent 100%)',
        }}
      />
      
      {/* Cozy vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(40,25,30,0.35) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes garland-light { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes snowflake-fall { 0% { transform: translateY(-20px) rotate(0deg); } 100% { transform: translateY(100vh) rotate(360deg); } }
        .animate-garland-light { animation: garland-light 1s ease-in-out infinite; }
        .animate-snowflake-fall { animation: snowflake-fall 12s linear infinite; }
      `}</style>
    </div>
  );
}
