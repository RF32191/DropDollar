'use client';

import React from 'react';

// ============================================
// FIREPLACE THEME - For Hot Sell Page
// Cozy warm glow, subtle fire reflections
// ============================================
export function FireplaceOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Warm amber gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(40,25,15,0.3) 0%, rgba(50,30,15,0.25) 50%, rgba(60,35,20,0.35) 100%)',
        }}
      />
      
      {/* Fireplace glow at bottom center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48">
        <div 
          className="absolute inset-0 animate-fire-glow"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(255,120,50,0.3) 0%, rgba(255,80,30,0.15) 40%, transparent 70%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-fire-glow-alt"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(255,150,50,0.2) 0%, transparent 50%)',
          }}
        />
      </div>
      
      {/* Warm light reflection on sides */}
      <div 
        className="absolute bottom-0 left-0 w-48 h-64 opacity-30"
        style={{
          background: 'linear-gradient(45deg, rgba(255,100,50,0.15) 0%, transparent 60%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-48 h-64 opacity-30"
        style={{
          background: 'linear-gradient(-45deg, rgba(255,100,50,0.15) 0%, transparent 60%)',
        }}
      />
      
      {/* Subtle warm vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, transparent 30%, rgba(20,10,5,0.3) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes fire-glow { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes fire-glow-alt { 0%, 100% { opacity: 0.6; } 33% { opacity: 0.9; } 66% { opacity: 0.7; } }
        .animate-fire-glow { animation: fire-glow 2s ease-in-out infinite; }
        .animate-fire-glow-alt { animation: fire-glow-alt 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SNOWBALL THEME - For 1v1 Page
// Winter battle atmosphere, cool tones
// ============================================
export function SnowballOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cool winter gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(20,40,60,0.4) 0%, rgba(30,50,70,0.3) 50%, rgba(40,60,80,0.35) 100%)',
        }}
      />
      
      {/* Gentle snowfall - just 12 snowflakes, CSS only */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-gentle-snow"
            style={{
              width: `${3 + (i % 3) * 2}px`,
              height: `${3 + (i % 3) * 2}px`,
              left: `${(i * 8) + 4}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${10 + (i % 3) * 3}s`,
              opacity: 0.4 + (i % 3) * 0.15,
            }}
          />
        ))}
      </div>
      
      {/* Snow on ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20"
        style={{
          background: 'linear-gradient(0deg, rgba(255,255,255,0.2) 0%, rgba(230,240,255,0.1) 50%, transparent 100%)',
        }}
      />
      
      {/* Cool blue vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(20,40,80,0.3) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes gentle-snow { 
          0% { transform: translateY(-20px) translateX(0); } 
          100% { transform: translateY(100vh) translateX(20px); } 
        }
        .animate-gentle-snow { animation: gentle-snow 12s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// NORTH POLE THEME - For Winner Takes All Page
// Aurora borealis, magical atmosphere
// ============================================
export function NorthPoleOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark polar night */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,20,40,0.5) 0%, rgba(20,30,50,0.4) 50%, rgba(30,40,60,0.45) 100%)',
        }}
      />
      
      {/* Aurora borealis effect */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden">
        <div 
          className="absolute inset-0 animate-aurora-1"
          style={{
            background: 'linear-gradient(180deg, rgba(50,200,150,0.15) 0%, rgba(100,150,200,0.1) 50%, transparent 100%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-aurora-2"
          style={{
            background: 'linear-gradient(180deg, rgba(100,200,100,0.1) 0%, rgba(50,150,200,0.08) 60%, transparent 100%)',
          }}
        />
      </div>
      
      {/* Star field - subtle */}
      <div className="absolute top-0 left-0 right-0 h-48">
        <div className="absolute top-4 left-1/4 w-1 h-1 bg-white rounded-full opacity-40 animate-twinkle" />
        <div className="absolute top-8 left-1/2 w-1 h-1 bg-white rounded-full opacity-30 animate-twinkle" style={{ animationDelay: '1s' }} />
        <div className="absolute top-6 right-1/4 w-1 h-1 bg-white rounded-full opacity-35 animate-twinkle" style={{ animationDelay: '2s' }} />
        <div className="absolute top-12 left-1/3 w-1 h-1 bg-white rounded-full opacity-25 animate-twinkle" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Snow ground glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: 'linear-gradient(0deg, rgba(200,220,255,0.15) 0%, transparent 100%)',
        }}
      />
      
      {/* Magical vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, transparent 30%, rgba(10,20,40,0.4) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes aurora-1 { 0%, 100% { transform: translateX(0) scaleY(1); opacity: 0.5; } 50% { transform: translateX(30px) scaleY(1.2); opacity: 0.8; } }
        @keyframes aurora-2 { 0%, 100% { transform: translateX(0) scaleY(1); opacity: 0.4; } 50% { transform: translateX(-20px) scaleY(1.1); opacity: 0.6; } }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.6; } }
        .animate-aurora-1 { animation: aurora-1 8s ease-in-out infinite; }
        .animate-aurora-2 { animation: aurora-2 10s ease-in-out infinite 2s; }
        .animate-twinkle { animation: twinkle 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TREASURE THEME - For Coin Play Page
// Golden warmth, festive richness
// ============================================
export function TreasureOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Rich golden gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(50,40,20,0.35) 0%, rgba(60,45,25,0.3) 50%, rgba(70,50,30,0.4) 100%)',
        }}
      />
      
      {/* Golden light rays from top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48">
        <div 
          className="absolute inset-0 animate-golden-ray"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,200,100,0.15) 0%, transparent 60%)',
          }}
        />
      </div>
      
      {/* Subtle golden coins floating - just 3 */}
      <div className="absolute top-1/3 left-1/4 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-25 animate-float-treasure-1 shadow-lg" />
      <div className="absolute top-1/2 right-1/3 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 opacity-20 animate-float-treasure-2 shadow-lg" />
      <div className="absolute top-2/3 left-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-25 animate-float-treasure-3 shadow-lg" />
      
      {/* Warm golden vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(40,30,10,0.3) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes golden-ray { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes float-treasure-1 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(180deg); } }
        @keyframes float-treasure-2 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(-180deg); } }
        @keyframes float-treasure-3 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(180deg); } }
        .animate-golden-ray { animation: golden-ray 4s ease-in-out infinite; }
        .animate-float-treasure-1 { animation: float-treasure-1 7s ease-in-out infinite; }
        .animate-float-treasure-2 { animation: float-treasure-2 9s ease-in-out infinite 2s; }
        .animate-float-treasure-3 { animation: float-treasure-3 8s ease-in-out infinite 4s; }
      `}</style>
    </div>
  );
}

// ============================================
// WINTER THEME - For Dashboard
// Gentle winter atmosphere, cozy and clean
// ============================================
export function WinterOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cool winter gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,40,60,0.3) 0%, rgba(40,50,70,0.25) 50%, rgba(50,60,80,0.3) 100%)',
        }}
      />
      
      {/* Very gentle snowfall - just 8 flakes */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full animate-gentle-snow"
            style={{
              width: `${2 + (i % 2) * 2}px`,
              height: `${2 + (i % 2) * 2}px`,
              left: `${(i * 12) + 6}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${12 + (i % 3) * 4}s`,
              opacity: 0.3 + (i % 2) * 0.1,
            }}
          />
        ))}
      </div>
      
      {/* Warm corner glows - like indoor lights */}
      <div 
        className="absolute top-0 left-0 w-64 h-64"
        style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(255,200,150,0.08) 0%, transparent 50%)',
        }}
      />
      <div 
        className="absolute top-0 right-0 w-64 h-64"
        style={{
          background: 'radial-gradient(circle at 100% 0%, rgba(255,200,150,0.08) 0%, transparent 50%)',
        }}
      />
      
      {/* Subtle blue tint */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(30,50,80,0.2) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes gentle-snow { 
          0% { transform: translateY(-10px) translateX(0); } 
          100% { transform: translateY(100vh) translateX(15px); } 
        }
        .animate-gentle-snow { animation: gentle-snow 15s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TOYSHOP THEME - For Games Page
// Magical toy shop, warm and playful
// ============================================
export function ToyshopOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Warm magical gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(40,30,50,0.35) 0%, rgba(50,35,45,0.3) 50%, rgba(60,40,50,0.35) 100%)',
        }}
      />
      
      {/* Magical sparkle effect - subtle */}
      <div 
        className="absolute top-0 left-0 right-0 h-32"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,220,150,0.1) 0%, transparent 60%)',
        }}
      />
      
      {/* Warm shelf glow on sides */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-16 opacity-30"
        style={{
          background: 'linear-gradient(90deg, rgba(150,100,50,0.2) 0%, transparent 100%)',
        }}
      />
      <div 
        className="absolute top-0 bottom-0 right-0 w-16 opacity-30"
        style={{
          background: 'linear-gradient(-90deg, rgba(150,100,50,0.2) 0%, transparent 100%)',
        }}
      />
      
      {/* Festive colored lights glow at top */}
      <div className="absolute top-0 left-0 right-0 h-8 flex justify-around opacity-40">
        <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-light-pulse" />
        <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50 animate-light-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-light-pulse" style={{ animationDelay: '1s' }} />
        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-light-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-light-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Cozy vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(30,20,30,0.35) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes light-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        .animate-light-pulse { animation: light-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
