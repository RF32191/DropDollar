'use client';

import React from 'react';

// ============================================
// FIREPLACE THEME - For Hot Sell Page
// Cozy fireplace, stockings, warm glow
// ============================================
export function FireplaceOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/30 via-red-900/20 to-gray-900/50" />
      
      {/* Fireplace glow at bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48">
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-orange-500/40 via-red-500/30 to-transparent rounded-t-full" />
        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-yellow-500/30 to-transparent rounded-t-full animate-fire-flicker" />
      </div>
      
      {/* Animated flames */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="text-4xl animate-flame"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            🔥
          </div>
        ))}
      </div>
      
      {/* Stockings */}
      <div className="absolute bottom-32 left-1/4 text-5xl animate-stocking-sway">🧦</div>
      <div className="absolute bottom-32 right-1/4 text-5xl animate-stocking-sway" style={{ animationDelay: '0.5s' }}>🧦</div>
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-5xl animate-stocking-sway" style={{ animationDelay: '1s' }}>🧦</div>
      
      {/* Warm light particles */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-orange-400/60 rounded-full animate-ember-float"
          style={{
            left: `${40 + Math.random() * 20}%`,
            bottom: `${Math.random() * 40}%`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
      
      {/* Hot cocoa */}
      <div className="absolute bottom-5 left-10 text-4xl">☕</div>
      <div className="absolute bottom-5 right-10 text-4xl">🍪</div>
      
      <style jsx>{`
        @keyframes fire-flicker { 0%, 100% { opacity: 0.3; transform: scaleY(1); } 50% { opacity: 0.5; transform: scaleY(1.1); } }
        @keyframes flame { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.1); } }
        @keyframes stocking-sway { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes ember-float { 0%, 100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(-30px); opacity: 0.3; } }
        .animate-fire-flicker { animation: fire-flicker 1s ease-in-out infinite; }
        .animate-flame { animation: flame 1.5s ease-in-out infinite; }
        .animate-stocking-sway { animation: stocking-sway 3s ease-in-out infinite; }
        .animate-ember-float { animation: ember-float 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SNOWBALL THEME - For 1v1 Page
// Snowball fight, winter wonderland, competitive
// ============================================
export function SnowballOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Winter gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 via-cyan-900/30 to-gray-900/50" />
      
      {/* Snowfall */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white rounded-full animate-snowfall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            opacity: 0.4 + Math.random() * 0.4,
          }}
        />
      ))}
      
      {/* Snowballs flying */}
      <div className="absolute top-1/3 left-10 text-4xl animate-snowball-left">⚪</div>
      <div className="absolute top-1/3 right-10 text-4xl animate-snowball-right">⚪</div>
      <div className="absolute top-1/2 left-20 text-3xl animate-snowball-left" style={{ animationDelay: '1s' }}>⚪</div>
      <div className="absolute top-1/2 right-20 text-3xl animate-snowball-right" style={{ animationDelay: '1.5s' }}>⚪</div>
      
      {/* Snow forts */}
      <div className="absolute bottom-0 left-5 w-24 h-16 bg-white/30 rounded-t-lg" />
      <div className="absolute bottom-0 right-5 w-24 h-16 bg-white/30 rounded-t-lg" />
      
      {/* Snowmen as spectators */}
      <div className="absolute bottom-5 left-1/4 text-5xl opacity-50">⛄</div>
      <div className="absolute bottom-5 right-1/4 text-5xl opacity-50">⛄</div>
      
      {/* Ice sparkles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-lg animate-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          ✨
        </div>
      ))}
      
      <style jsx>{`
        @keyframes snowfall { 0% { transform: translateY(-20px) rotate(0deg); } 100% { transform: translateY(100vh) rotate(360deg); } }
        @keyframes snowball-left { 0%, 100% { transform: translateX(0); opacity: 1; } 50% { transform: translateX(40vw); opacity: 0; } }
        @keyframes snowball-right { 0%, 100% { transform: translateX(0); opacity: 1; } 50% { transform: translateX(-40vw); opacity: 0; } }
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 0.8; transform: scale(1); } }
        .animate-snowfall { animation: snowfall 5s linear infinite; }
        .animate-snowball-left { animation: snowball-left 3s ease-in-out infinite; }
        .animate-snowball-right { animation: snowball-right 3s ease-in-out infinite; }
        .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// NORTH POLE THEME - For Winner Takes All Page
// Santa's workshop, elves, presents, candy canes
// ============================================
export function NorthPoleOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Magical gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/40 via-green-900/30 to-gray-900/50" />
      
      {/* Northern lights effect */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-green-400/20 via-cyan-400/10 to-transparent animate-aurora" />
      
      {/* Candy cane poles */}
      <div className="absolute bottom-0 left-10 w-4 h-64">
        <div className="w-full h-full bg-gradient-to-r from-red-500 via-white via-50% to-red-500 animate-candy-spin" />
      </div>
      <div className="absolute bottom-0 right-10 w-4 h-64">
        <div className="w-full h-full bg-gradient-to-r from-red-500 via-white via-50% to-red-500 animate-candy-spin" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Workshop building outline */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-48 bg-gradient-to-b from-red-800/30 to-red-900/40 rounded-t-lg opacity-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-12 bg-yellow-400/50 rounded-sm" /> {/* Window */}
      </div>
      
      {/* Santa */}
      <div className="absolute top-10 right-10 text-6xl animate-santa-wave">🎅</div>
      
      {/* Elves working */}
      <div className="absolute bottom-20 left-1/3 text-4xl animate-elf-work">🧝</div>
      <div className="absolute bottom-20 right-1/3 text-4xl animate-elf-work" style={{ animationDelay: '0.5s' }}>🧝</div>
      
      {/* Presents */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-3xl animate-present-bounce"
          style={{
            left: `${15 + Math.random() * 70}%`,
            bottom: `${5 + Math.random() * 15}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          🎁
        </div>
      ))}
      
      {/* Snowfall */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white rounded-full animate-snowfall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 3}s`,
            opacity: 0.5,
          }}
        />
      ))}
      
      <style jsx>{`
        @keyframes aurora { 0%, 100% { opacity: 0.2; transform: translateX(0); } 50% { opacity: 0.4; transform: translateX(20px); } }
        @keyframes candy-spin { 0% { background-position: 0 0; } 100% { background-position: 0 100px; } }
        @keyframes santa-wave { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes elf-work { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes present-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes snowfall { 0% { transform: translateY(-20px); } 100% { transform: translateY(100vh); } }
        .animate-aurora { animation: aurora 8s ease-in-out infinite; }
        .animate-candy-spin { animation: candy-spin 2s linear infinite; background-size: 100% 100px; }
        .animate-santa-wave { animation: santa-wave 2s ease-in-out infinite; }
        .animate-elf-work { animation: elf-work 1s ease-in-out infinite; }
        .animate-present-bounce { animation: present-bounce 2s ease-in-out infinite; }
        .animate-snowfall { animation: snowfall 5s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TREASURE THEME - For Coin Play Page
// Golden gifts, treasure chest, festive coins
// ============================================
export function TreasureOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Golden gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/30 via-amber-900/20 to-gray-900/50" />
      
      {/* Golden light rays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-8 bg-gradient-to-b from-yellow-400/20 to-transparent animate-ray-pulse"
            style={{
              left: `${i * 12.5}%`,
              transform: `rotate(${(i - 4) * 8}deg)`,
              transformOrigin: 'top center',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Treasure chest */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <div className="text-7xl animate-chest-glow">🎁</div>
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl animate-coin-pop">🪙</div>
      </div>
      
      {/* Floating golden coins */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-3xl animate-gold-coin-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${20 + Math.random() * 60}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
          }}
        >
          🪙
        </div>
      ))}
      
      {/* Sparkles */}
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-xl animate-treasure-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        >
          ✨
        </div>
      ))}
      
      {/* Red ribbons */}
      <div className="absolute top-20 left-5 text-4xl animate-ribbon-sway">🎀</div>
      <div className="absolute top-20 right-5 text-4xl animate-ribbon-sway" style={{ animationDelay: '1s' }}>🎀</div>
      
      <style jsx>{`
        @keyframes ray-pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.3; } }
        @keyframes chest-glow { 0%, 100% { filter: drop-shadow(0 0 10px gold); } 50% { filter: drop-shadow(0 0 30px gold); } }
        @keyframes coin-pop { 0%, 100% { transform: translate(-50%, 0) scale(1); } 50% { transform: translate(-50%, -20px) scale(1.2); } }
        @keyframes gold-coin-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(180deg); } }
        @keyframes treasure-sparkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes ribbon-sway { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        .animate-ray-pulse { animation: ray-pulse 3s ease-in-out infinite; }
        .animate-chest-glow { animation: chest-glow 2s ease-in-out infinite; }
        .animate-coin-pop { animation: coin-pop 2s ease-in-out infinite; }
        .animate-gold-coin-float { animation: gold-coin-float 4s ease-in-out infinite; }
        .animate-treasure-sparkle { animation: treasure-sparkle 2s ease-in-out infinite; }
        .animate-ribbon-sway { animation: ribbon-sway 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// WINTER THEME - For Dashboard
// Gentle snowflakes, warm lights, cozy feel
// ============================================
export function WinterOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cool winter gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-slate-800/20 to-gray-900/40" />
      
      {/* Gentle snowfall */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full animate-gentle-snow"
          style={{
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
            opacity: 0.3 + Math.random() * 0.4,
          }}
        />
      ))}
      
      {/* String lights at top */}
      <div className="absolute top-5 left-0 right-0 flex justify-center gap-8">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="text-2xl animate-light-twinkle"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {i % 3 === 0 ? '🔴' : i % 3 === 1 ? '🟢' : '🟡'}
          </div>
        ))}
      </div>
      
      {/* Christmas tree in corner */}
      <div className="absolute bottom-5 right-5 text-6xl opacity-40 animate-tree-sway">🎄</div>
      
      {/* Snowflakes */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-30 animate-snowflake-drift"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          ❄️
        </div>
      ))}
      
      {/* Cozy elements */}
      <div className="absolute bottom-5 left-5 text-4xl opacity-50">☕</div>
      <div className="absolute bottom-5 left-20 text-3xl opacity-40">🧣</div>
      
      <style jsx>{`
        @keyframes gentle-snow { 0% { transform: translateY(-20px) translateX(0); } 100% { transform: translateY(100vh) translateX(20px); } }
        @keyframes light-twinkle { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes tree-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes snowflake-drift { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } }
        .animate-gentle-snow { animation: gentle-snow 8s linear infinite; }
        .animate-light-twinkle { animation: light-twinkle 1.5s ease-in-out infinite; }
        .animate-tree-sway { animation: tree-sway 4s ease-in-out infinite; }
        .animate-snowflake-drift { animation: snowflake-drift 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TOYSHOP THEME - For Games Page
// Toy shop, presents, playful elements
// ============================================
export function ToyshopOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Festive gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 via-red-900/20 to-gray-900/50" />
      
      {/* Shelves at sides */}
      <div className="absolute left-0 top-20 bottom-20 w-16 bg-gradient-to-r from-amber-900/30 to-transparent" />
      <div className="absolute right-0 top-20 bottom-20 w-16 bg-gradient-to-l from-amber-900/30 to-transparent" />
      
      {/* Toys on shelves */}
      <div className="absolute left-2 top-24 text-3xl animate-toy-bounce">🧸</div>
      <div className="absolute left-2 top-48 text-3xl animate-toy-bounce" style={{ animationDelay: '0.5s' }}>🪀</div>
      <div className="absolute left-2 top-72 text-3xl animate-toy-bounce" style={{ animationDelay: '1s' }}>🎮</div>
      <div className="absolute right-2 top-24 text-3xl animate-toy-bounce" style={{ animationDelay: '0.3s' }}>🚂</div>
      <div className="absolute right-2 top-48 text-3xl animate-toy-bounce" style={{ animationDelay: '0.8s' }}>🎪</div>
      <div className="absolute right-2 top-72 text-3xl animate-toy-bounce" style={{ animationDelay: '1.3s' }}>🎨</div>
      
      {/* Nutcracker soldiers */}
      <div className="absolute bottom-5 left-10 text-5xl opacity-50">🪖</div>
      <div className="absolute bottom-5 right-10 text-5xl opacity-50">🪖</div>
      
      {/* Floating presents */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-4xl animate-present-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${20 + Math.random() * 60}%`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        >
          🎁
        </div>
      ))}
      
      {/* Candy canes */}
      <div className="absolute top-10 left-20 text-4xl animate-candy-swing">🍬</div>
      <div className="absolute top-10 right-20 text-4xl animate-candy-swing" style={{ animationDelay: '0.7s' }}>🍭</div>
      
      {/* Stars */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-xl animate-star-twinkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        >
          ⭐
        </div>
      ))}
      
      <style jsx>{`
        @keyframes toy-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes present-float { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes candy-swing { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
        @keyframes star-twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        .animate-toy-bounce { animation: toy-bounce 2s ease-in-out infinite; }
        .animate-present-float { animation: present-float 4s ease-in-out infinite; }
        .animate-candy-swing { animation: candy-swing 2s ease-in-out infinite; }
        .animate-star-twinkle { animation: star-twinkle 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

