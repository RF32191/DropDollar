'use client';

import React, { useEffect, useState } from 'react';

// ============================================
// HELL THEME - For Hot Sell Page
// Flames, demons, hellfire, burning coins
// ============================================
export function HellOverlay() {
  const [flames, setFlames] = useState<{ id: number; x: number; delay: number; size: number }[]>([]);
  
  useEffect(() => {
    const newFlames = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      size: 0.5 + Math.random() * 1.5,
    }));
    setFlames(newFlames);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Hell gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 via-orange-900/20 to-transparent" />
      
      {/* Bottom flame glow */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-orange-500/30 via-red-600/20 to-transparent" />
      
      {/* Animated flames rising from bottom */}
      {flames.map((flame) => (
        <div
          key={flame.id}
          className="absolute bottom-0 animate-flame-rise"
          style={{
            left: `${flame.x}%`,
            animationDelay: `${flame.delay}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        >
          <div 
            className="text-4xl opacity-60"
            style={{ 
              fontSize: `${flame.size * 2}rem`,
              filter: 'blur(1px)',
            }}
          >
            🔥
          </div>
        </div>
      ))}
      
      {/* Demon silhouettes in corners */}
      <div className="absolute bottom-10 left-5 text-6xl opacity-20 animate-pulse">👹</div>
      <div className="absolute bottom-10 right-5 text-6xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>👹</div>
      
      {/* Falling embers */}
      <div className="absolute top-0 left-0 right-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-orange-500 rounded-full animate-ember-fall opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Pulsing hell glow effect */}
      <div className="absolute inset-0 bg-red-900/10 animate-pulse" style={{ animationDuration: '3s' }} />
      
      <style jsx>{`
        @keyframes flame-rise {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { opacity: 1; }
          100% { transform: translateY(-200px) scale(0.5); opacity: 0; }
        }
        @keyframes ember-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-flame-rise { animation: flame-rise 3s ease-out infinite; }
        .animate-ember-fall { animation: ember-fall 5s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// FRANKENSTEIN THEME - For 1v1 Page
// Lightning, lab equipment, green glow, electricity
// ============================================
export function FrankensteinOverlay() {
  const [lightning, setLightning] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLightning(true);
      setTimeout(() => setLightning(false), 150);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark lab background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-green-900/20 to-gray-900/60" />
      
      {/* Lightning flash */}
      {lightning && (
        <div className="absolute inset-0 bg-white/30 animate-flash z-10" />
      )}
      
      {/* Green glow from bottom (like lab equipment) */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-500/30 via-green-600/10 to-transparent" />
      
      {/* Tesla coils in corners */}
      <div className="absolute top-20 left-5">
        <div className="text-4xl animate-pulse">⚡</div>
        <div className="w-1 h-20 bg-gradient-to-b from-cyan-400 to-transparent mx-auto animate-electricity" />
      </div>
      <div className="absolute top-20 right-5">
        <div className="text-4xl animate-pulse" style={{ animationDelay: '0.5s' }}>⚡</div>
        <div className="w-1 h-20 bg-gradient-to-b from-cyan-400 to-transparent mx-auto animate-electricity" style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Electricity arcs */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-px bg-gradient-to-b from-cyan-400 via-green-400 to-transparent animate-electricity-arc"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${Math.random() * 30}%`,
            height: `${50 + Math.random() * 100}px`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.5,
          }}
        />
      ))}
      
      {/* Lab equipment silhouettes */}
      <div className="absolute bottom-5 left-10 text-4xl opacity-30">🧪</div>
      <div className="absolute bottom-5 right-10 text-4xl opacity-30">⚗️</div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-5xl opacity-20">🔬</div>
      
      {/* Green bubbling effect */}
      <div className="absolute bottom-0 left-0 right-0">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-green-400/40 rounded-full animate-bubble-rise"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      <style jsx>{`
        @keyframes flash { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        @keyframes electricity { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; transform: scaleY(1.2); } }
        @keyframes electricity-arc { 0%, 100% { opacity: 0; } 10%, 20% { opacity: 0.8; } 30% { opacity: 0; } }
        @keyframes bubble-rise { 0% { transform: translateY(0) scale(1); opacity: 0.6; } 100% { transform: translateY(-300px) scale(0.3); opacity: 0; } }
        .animate-flash { animation: flash 0.15s ease-out; }
        .animate-electricity { animation: electricity 0.5s ease-in-out infinite; }
        .animate-electricity-arc { animation: electricity-arc 2s ease-in-out infinite; }
        .animate-bubble-rise { animation: bubble-rise 3s ease-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// ZOMBIES THEME - For Winner Takes All Page
// Undead, graveyard, decay, reaching hands
// ============================================
export function ZombiesOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Foggy graveyard background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800/60 via-green-900/30 to-gray-900/70" />
      
      {/* Fog layers */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-400/40 to-transparent animate-fog-drift" />
      <div className="absolute bottom-10 left-0 right-0 h-32 bg-gradient-to-t from-gray-500/30 to-transparent animate-fog-drift-slow" />
      
      {/* Moon */}
      <div className="absolute top-10 right-10 w-20 h-20 rounded-full bg-yellow-100/80 shadow-2xl shadow-yellow-200/50" />
      
      {/* Tombstones */}
      <div className="absolute bottom-20 left-10 opacity-40">
        <div className="w-12 h-20 bg-gray-600 rounded-t-lg" />
        <div className="text-center text-gray-400 text-xs mt-1">RIP</div>
      </div>
      <div className="absolute bottom-20 right-10 opacity-40">
        <div className="w-14 h-24 bg-gray-700 rounded-t-lg" />
        <div className="text-center text-gray-400 text-xs mt-1">RIP</div>
      </div>
      <div className="absolute bottom-20 left-1/3 opacity-30">
        <div className="w-10 h-16 bg-gray-600 rounded-t-lg" />
      </div>
      
      {/* Zombie hands reaching up */}
      <div className="absolute bottom-0 left-20 text-5xl animate-zombie-reach">🤚</div>
      <div className="absolute bottom-0 right-20 text-5xl animate-zombie-reach" style={{ animationDelay: '1s' }}>✋</div>
      <div className="absolute bottom-0 left-1/2 text-6xl animate-zombie-reach" style={{ animationDelay: '0.5s' }}>🖐️</div>
      
      {/* Zombies in distance */}
      <div className="absolute bottom-24 left-1/4 text-4xl opacity-30 animate-zombie-walk">🧟</div>
      <div className="absolute bottom-24 right-1/4 text-4xl opacity-30 animate-zombie-walk" style={{ animationDelay: '2s' }}>🧟‍♂️</div>
      
      {/* Floating skull particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-2xl opacity-20 animate-float-skull"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${20 + Math.random() * 60}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          💀
        </div>
      ))}
      
      <style jsx>{`
        @keyframes fog-drift { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(20px); } }
        @keyframes fog-drift-slow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-30px); } }
        @keyframes zombie-reach { 0% { transform: translateY(100%); } 50% { transform: translateY(0); } 100% { transform: translateY(100%); } }
        @keyframes zombie-walk { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(30px); } }
        @keyframes float-skull { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(10deg); } }
        .animate-fog-drift { animation: fog-drift 8s ease-in-out infinite; }
        .animate-fog-drift-slow { animation: fog-drift-slow 12s ease-in-out infinite; }
        .animate-zombie-reach { animation: zombie-reach 4s ease-in-out infinite; }
        .animate-zombie-walk { animation: zombie-walk 6s ease-in-out infinite; }
        .animate-float-skull { animation: float-skull 5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// STYX THEME - For Coin Play Page
// Greek River of Death, coins on eyes, Charon's boat
// ============================================
export function StyxOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark underworld gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/70 via-purple-900/40 to-gray-900/80" />
      
      {/* River of Styx at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-blue-900/60 via-indigo-800/40 to-transparent animate-river-flow" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cyan-900/30 to-transparent animate-river-shimmer" />
      
      {/* Floating coins (obols for Charon) */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-3xl opacity-60 animate-float-coin"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 30}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${4 + Math.random() * 3}s`,
          }}
        >
          🪙
        </div>
      ))}
      
      {/* Charon's boat silhouette */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 opacity-30 animate-boat-drift">
        <div className="text-6xl">⛵</div>
        <div className="text-3xl -mt-6 ml-6">☠️</div>
      </div>
      
      {/* Ghostly souls */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-4xl opacity-20 animate-soul-drift"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${30 + Math.random() * 40}%`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          👻
        </div>
      ))}
      
      {/* Greek columns */}
      <div className="absolute bottom-0 left-5 w-8 h-48 bg-gradient-to-b from-gray-500/30 to-gray-600/20 opacity-40" />
      <div className="absolute bottom-0 right-5 w-8 h-48 bg-gradient-to-b from-gray-500/30 to-gray-600/20 opacity-40" />
      
      {/* Skull and coins (coins on eyes tradition) */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center opacity-40">
        <div className="text-6xl">💀</div>
        <div className="flex justify-center gap-8 -mt-12">
          <span className="text-2xl animate-pulse">🪙</span>
          <span className="text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>🪙</span>
        </div>
      </div>
      
      {/* Mystical purple mist */}
      <div className="absolute inset-0 bg-purple-900/10 animate-pulse" style={{ animationDuration: '4s' }} />
      
      <style jsx>{`
        @keyframes river-flow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
        @keyframes river-shimmer { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.5; } }
        @keyframes float-coin { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(180deg); } }
        @keyframes boat-drift { 0%, 100% { transform: translateX(-50%) translateX(-20px); } 50% { transform: translateX(-50%) translateX(20px); } }
        @keyframes soul-drift { 0%, 100% { transform: translateX(0) translateY(0); opacity: 0.15; } 50% { transform: translateX(30px) translateY(-20px); opacity: 0.3; } }
        .animate-river-flow { animation: river-flow 6s ease-in-out infinite; }
        .animate-river-shimmer { animation: river-shimmer 3s ease-in-out infinite; }
        .animate-float-coin { animation: float-coin 5s ease-in-out infinite; }
        .animate-boat-drift { animation: boat-drift 8s ease-in-out infinite; }
        .animate-soul-drift { animation: soul-drift 7s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// HAUNTED THEME - For Dashboard
// Spiders, webs, orange/purple, bats, pumpkins
// ============================================
export function HauntedOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Orange/purple gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-purple-900/20 to-gray-900/50" />
      
      {/* Spider webs in corners */}
      <div className="absolute top-0 left-0 w-48 h-48 opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M0,0 Q50,20 100,0" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M0,0 Q20,50 0,100" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M0,0 L60,60" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M0,0 Q30,10 50,30" stroke="white" strokeWidth="0.3" fill="none" />
          <path d="M0,0 Q10,30 30,50" stroke="white" strokeWidth="0.3" fill="none" />
        </svg>
      </div>
      <div className="absolute top-0 right-0 w-48 h-48 opacity-30 scale-x-[-1]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M0,0 Q50,20 100,0" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M0,0 Q20,50 0,100" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M0,0 L60,60" stroke="white" strokeWidth="0.5" fill="none" />
        </svg>
      </div>
      
      {/* Spiders */}
      <div className="absolute top-20 left-20 text-2xl animate-spider-dangle">🕷️</div>
      <div className="absolute top-32 right-24 text-xl animate-spider-dangle" style={{ animationDelay: '1.5s' }}>🕷️</div>
      <div className="absolute top-10 left-1/3 text-lg animate-spider-crawl">🕷️</div>
      
      {/* Flying bats */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-3xl animate-bat-fly"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${10 + Math.random() * 30}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${4 + Math.random() * 3}s`,
          }}
        >
          🦇
        </div>
      ))}
      
      {/* Pumpkins */}
      <div className="absolute bottom-5 left-10 text-4xl animate-pumpkin-glow">🎃</div>
      <div className="absolute bottom-5 right-10 text-5xl animate-pumpkin-glow" style={{ animationDelay: '0.5s' }}>🎃</div>
      <div className="absolute bottom-5 left-1/2 text-3xl animate-pumpkin-glow" style={{ animationDelay: '1s' }}>🎃</div>
      
      {/* Floating candy corn particles */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-xl opacity-40 animate-float-candy"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        >
          🍬
        </div>
      ))}
      
      <style jsx>{`
        @keyframes spider-dangle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(30px); } }
        @keyframes spider-crawl { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(100px); } }
        @keyframes bat-fly { 0% { transform: translateX(-100px) translateY(0); } 50% { transform: translateX(50vw) translateY(-30px); } 100% { transform: translateX(100vw) translateY(0); } }
        @keyframes pumpkin-glow { 0%, 100% { filter: drop-shadow(0 0 5px orange); } 50% { filter: drop-shadow(0 0 20px orange); } }
        @keyframes float-candy { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(15deg); } }
        .animate-spider-dangle { animation: spider-dangle 3s ease-in-out infinite; }
        .animate-spider-crawl { animation: spider-crawl 8s ease-in-out infinite; }
        .animate-bat-fly { animation: bat-fly 6s linear infinite; }
        .animate-pumpkin-glow { animation: pumpkin-glow 2s ease-in-out infinite; }
        .animate-float-candy { animation: float-candy 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// CARNIVAL THEME - For Games Page
// Creepy carnival, dark circus, spinning elements
// ============================================
export function CarnivalOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark circus tent gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/50 via-purple-950/30 to-gray-900/60" />
      
      {/* Circus tent stripes at top */}
      <div className="absolute top-0 left-0 right-0 h-20 overflow-hidden opacity-30">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 h-full w-12 bg-gradient-to-b from-red-600 to-transparent"
            style={{
              left: `${i * 10}%`,
              transform: `skewX(${i % 2 === 0 ? '-' : ''}20deg)`,
            }}
          />
        ))}
      </div>
      
      {/* Creepy clown faces in corners */}
      <div className="absolute bottom-10 left-5 text-5xl opacity-30 animate-creepy-smile">🤡</div>
      <div className="absolute bottom-10 right-5 text-5xl opacity-30 animate-creepy-smile" style={{ animationDelay: '1s' }}>🤡</div>
      
      {/* Spinning carnival wheel */}
      <div className="absolute top-20 right-10 text-6xl opacity-20 animate-spin-slow">🎡</div>
      
      {/* Floating balloons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-3xl animate-balloon-float"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `-50px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${8 + Math.random() * 5}s`,
          }}
        >
          🎈
        </div>
      ))}
      
      {/* Spotlights */}
      <div className="absolute top-0 left-1/4 w-32 h-96 bg-gradient-to-b from-yellow-400/10 to-transparent rotate-12 animate-spotlight" />
      <div className="absolute top-0 right-1/4 w-32 h-96 bg-gradient-to-b from-yellow-400/10 to-transparent -rotate-12 animate-spotlight" style={{ animationDelay: '2s' }} />
      
      {/* Popcorn and tickets */}
      <div className="absolute bottom-5 left-1/4 text-3xl opacity-40">🍿</div>
      <div className="absolute bottom-5 right-1/4 text-3xl opacity-40">🎟️</div>
      
      <style jsx>{`
        @keyframes creepy-smile { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1) rotate(5deg); } }
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes balloon-float { 0% { transform: translateY(0); opacity: 0.6; } 100% { transform: translateY(-110vh) translateX(30px); opacity: 0; } }
        @keyframes spotlight { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.3; } }
        .animate-creepy-smile { animation: creepy-smile 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-balloon-float { animation: balloon-float 10s linear infinite; }
        .animate-spotlight { animation: spotlight 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

