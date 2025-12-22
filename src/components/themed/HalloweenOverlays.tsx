'use client';

import React, { useEffect, useState, useMemo } from 'react';

// Reusable Lightning Component
function Lightning({ active, position, color = '#FFE4B5' }: { active: boolean; position: { x: number; y: number }; color?: string }) {
  const path = useMemo(() => {
    const segments = 12;
    let d = `M${position.x},0`;
    for (let i = 1; i <= segments; i++) {
      const x = position.x + (Math.random() - 0.5) * 60;
      const y = (400 / segments) * i;
      d += ` L${x},${y}`;
    }
    return d;
  }, [position.x, active]);
  
  if (!active) return null;
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <defs>
        <filter id="lightning-glow">
          <feGaussianBlur stdDeviation="6" result="blur1"/>
          <feGaussianBlur stdDeviation="2" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d={path} stroke={color} strokeWidth="5" fill="none" filter="url(#lightning-glow)" strokeLinecap="round"/>
      <path d={path} stroke="white" strokeWidth="2" fill="none" opacity="0.9"/>
    </svg>
  );
}

// Dripping Blood Component
function DrippingBlood({ count = 10 }: { count?: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-around">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="relative" style={{ animationDelay: `${i * 0.3}s` }}>
          <div 
            className="w-2 rounded-b-full animate-blood-drip"
            style={{
              height: `${15 + (i % 4) * 8}px`,
              background: 'linear-gradient(180deg, #8b0000 0%, #dc143c 50%, #8b0000 100%)',
              animationDelay: `${i * 0.5}s`,
            }}
          />
        </div>
      ))}
      <style jsx>{`
        @keyframes blood-drip { 
          0%, 100% { height: 15px; } 
          50% { height: 40px; } 
        }
        .animate-blood-drip { animation: blood-drip 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// Floating Particles Component
function FloatingParticles({ count = 20, color = 'rgba(100,255,100,0.3)', speed = 'normal' }: { count?: number; color?: string; speed?: 'slow' | 'normal' | 'fast' }) {
  const duration = speed === 'slow' ? 15 : speed === 'fast' ? 5 : 10;
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-particle"
          style={{
            width: `${2 + (i % 3) * 2}px`,
            height: `${2 + (i % 3) * 2}px`,
            background: color,
            left: `${(i * 5) % 100}%`,
            bottom: `${(i * 7) % 30}%`,
            animationDelay: `${(i * 0.5) % duration}s`,
            animationDuration: `${duration + (i % 5)}s`,
            boxShadow: `0 0 6px 2px ${color}`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float-particle { 
          0% { transform: translateY(0) translateX(0); opacity: 0.3; } 
          50% { opacity: 0.8; }
          100% { transform: translateY(-100vh) translateX(${speed === 'fast' ? 30 : 15}px); opacity: 0; } 
        }
        .animate-float-particle { animation: float-particle linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// HELL THEME - For Hot Sell Page
// Inferno with ghostly presences
// ============================================
export function HellOverlay() {
  const [lightning, setLightning] = useState(false);
  const [lightningPos, setLightningPos] = useState({ x: 50, y: 0 });
  const [flameHeight, setFlameHeight] = useState(30);
  
  useEffect(() => {
    // Lightning strikes
    const lightningInterval = setInterval(() => {
      setLightningPos({ x: 15 + Math.random() * 70, y: 0 });
      setLightning(true);
      setTimeout(() => setLightning(false), 100);
      setTimeout(() => {
        setLightning(true);
        setTimeout(() => setLightning(false), 80);
      }, 150);
    }, 4000 + Math.random() * 3000);
    
    // Flame animation
    const flameInterval = setInterval(() => {
      setFlameHeight(25 + Math.random() * 15);
    }, 150);
    
    return () => { clearInterval(lightningInterval); clearInterval(flameInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DEEP INFERNO PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a0510 0%, #2a0a15 20%, #3a1010 40%, #2a0810 60%, #1a0508 100%)',
        }}
      />
      
      {/* Lightning flash */}
      {lightning && <div className="absolute inset-0 bg-orange-300/20" style={{ mixBlendMode: 'screen' }} />}
      <Lightning active={lightning} position={lightningPos} color="#FFA500" />
      
      {/* Ghost wisps */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-ghost-wisp"
          style={{
            left: `${10 + i * 15}%`,
            top: `${15 + (i % 3) * 20}%`,
            width: '80px',
            height: '120px',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)',
            borderRadius: '50% 50% 40% 40%',
            animationDelay: `${i * 1.5}s`,
            animationDuration: `${8 + i * 2}s`,
          }}
        />
      ))}
      
      {/* Hellfire at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 transition-all duration-150"
        style={{ height: `${flameHeight}%` }}
      >
        {/* Base fire glow */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(0deg, rgba(255,50,0,0.7) 0%, rgba(255,100,0,0.4) 40%, rgba(255,150,50,0.2) 70%, transparent 100%)',
          }}
        />
        
        {/* Flame shapes */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 animate-flame"
            style={{
              left: `${i * 7}%`,
              width: '30px',
              height: `${60 + (i % 4) * 20}%`,
              background: 'linear-gradient(0deg, #ff4500 0%, #ff8c00 40%, #ffd700 70%, transparent 100%)',
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              animationDelay: `${i * 0.1}s`,
              filter: 'blur(3px)',
            }}
          />
        ))}
      </div>
      
      {/* Purple infernal mist */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 animate-mist"
        style={{
          background: 'linear-gradient(0deg, rgba(120,40,150,0.4) 0%, rgba(80,20,100,0.2) 50%, transparent 100%)',
        }}
      />
      
      {/* Blood dripping from top */}
      <DrippingBlood count={12} />
      
      {/* Ember particles rising */}
      <FloatingParticles count={25} color="rgba(255,100,0,0.5)" speed="fast" />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 100%, transparent 20%, rgba(10,0,5,0.7) 100%)' }} />
      
      <style jsx>{`
        @keyframes ghost-wisp { 
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.08; } 
          50% { transform: translateY(-40px) translateX(20px) scale(1.1); opacity: 0.15; } 
        }
        @keyframes flame { 
          0%, 100% { transform: scaleY(1) scaleX(1) translateX(0); } 
          25% { transform: scaleY(1.1) scaleX(0.9) translateX(3px); } 
          50% { transform: scaleY(0.95) scaleX(1.05) translateX(-2px); } 
          75% { transform: scaleY(1.05) scaleX(0.95) translateX(2px); } 
        }
        @keyframes mist { 
          0%, 100% { transform: translateX(0); opacity: 0.8; } 
          50% { transform: translateX(20px); opacity: 1; } 
        }
        .animate-ghost-wisp { animation: ghost-wisp ease-in-out infinite; }
        .animate-flame { animation: flame 0.6s ease-in-out infinite; }
        .animate-mist { animation: mist 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// FRANKENSTEIN THEME - For 1v1 Page
// Electric laboratory with massive Tesla coils
// ============================================
export function FrankensteinOverlay() {
  const [leftArc, setLeftArc] = useState(false);
  const [rightArc, setRightArc] = useState(false);
  const [centerBolt, setCenterBolt] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  
  useEffect(() => {
    // Tesla arcs
    const arcInterval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.3) { 
        setLeftArc(true); 
        setTimeout(() => setLeftArc(false), 150 + Math.random() * 100); 
      } else if (rand < 0.6) { 
        setRightArc(true); 
        setTimeout(() => setRightArc(false), 150 + Math.random() * 100); 
      } else {
        setLeftArc(true); 
        setRightArc(true);
        setTimeout(() => { setLeftArc(false); setRightArc(false); }, 200);
      }
    }, 800 + Math.random() * 1200);
    
    // Center lightning
    const boltInterval = setInterval(() => {
      setCenterBolt(true);
      setTimeout(() => setCenterBolt(false), 120);
      setTimeout(() => { 
        setCenterBolt(true); 
        setTimeout(() => setCenterBolt(false), 80); 
      }, 150);
    }, 5000 + Math.random() * 4000);
    
    // Pulse
    const pulseInterval = setInterval(() => {
      setPulseIntensity(prev => (prev + 1) % 100);
    }, 50);
    
    return () => { clearInterval(arcInterval); clearInterval(boltInterval); clearInterval(pulseInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* TOXIC GREEN/PURPLE LAB PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #050a08 0%, #0a150a 20%, #080510 40%, #0a1208 60%, #050808 100%)',
        }}
      />
      
      {/* Electric pulse effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(0,255,150,${0.05 + Math.sin(pulseIntensity * 0.1) * 0.03}) 0%, transparent 50%)`,
        }}
      />
      
      {/* Flash on arc */}
      {(leftArc || rightArc || centerBolt) && (
        <div 
          className="absolute inset-0"
          style={{ 
            background: centerBolt ? 'rgba(100,255,150,0.2)' : 'rgba(50,200,150,0.1)',
            mixBlendMode: 'screen' 
          }} 
        />
      )}
      
      {/* Center lightning bolt */}
      <Lightning active={centerBolt} position={{ x: 200, y: 0 }} color="#00FF88" />
      
      {/* LEFT TESLA COIL - 3D Effect */}
      <div className="absolute left-4 sm:left-8 top-24 bottom-24 w-20 sm:w-24">
        {/* Base */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 bg-gradient-to-b from-gray-500 to-gray-800 rounded-t" />
        
        {/* Tower */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-10 h-48">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded" />
          {/* Copper coils */}
          {[...Array(16)].map((_, i) => (
            <div 
              key={i} 
              className="absolute left-1/2 -translate-x-1/2 h-1.5 rounded-full"
              style={{
                width: '52px',
                bottom: `${i * 12 + 8}px`,
                background: 'linear-gradient(90deg, #8B4513, #CD7F32, #DAA520, #CD7F32, #8B4513)',
              }}
            />
          ))}
        </div>
        
        {/* Electrode */}
        <div 
          className={`absolute top-16 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full transition-all duration-100 ${leftArc ? 'scale-115' : 'scale-100'}`}
          style={{ 
            background: leftArc 
              ? 'radial-gradient(circle at 30% 30%, white 0%, #00FFCC 30%, #00AA88 100%)'
              : 'radial-gradient(circle at 30% 30%, #66BBAA 0%, #227766 50%, #114433 100%)',
            boxShadow: leftArc 
              ? '0 0 60px 25px rgba(0,255,200,0.9), 0 0 120px 50px rgba(0,255,200,0.5)' 
              : '0 0 20px 8px rgba(0,200,150,0.3)',
          }}
        />
        
        {/* Electric arc */}
        {leftArc && (
          <svg className="absolute top-20 left-16 w-80 h-40 overflow-visible">
            <defs>
              <filter id="arc-glow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {[...Array(3)].map((_, i) => (
              <path 
                key={i}
                d={`M0,${20 + i * 5} Q${80 + Math.random() * 40},${(Math.random() - 0.5) * 60} ${200},${20 + i * 5}`}
                stroke="#00FFCC" 
                strokeWidth={3 - i * 0.5}
                fill="none" 
                filter="url(#arc-glow)"
                opacity={1 - i * 0.2}
              />
            ))}
          </svg>
        )}
      </div>
      
      {/* RIGHT TESLA COIL - 3D Effect */}
      <div className="absolute right-4 sm:right-8 top-24 bottom-24 w-20 sm:w-24">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 bg-gradient-to-b from-gray-500 to-gray-800 rounded-t" />
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-10 h-48">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded" />
          {[...Array(16)].map((_, i) => (
            <div 
              key={i} 
              className="absolute left-1/2 -translate-x-1/2 h-1.5 rounded-full"
              style={{
                width: '52px',
                bottom: `${i * 12 + 8}px`,
                background: 'linear-gradient(90deg, #8B4513, #CD7F32, #DAA520, #CD7F32, #8B4513)',
              }}
            />
          ))}
        </div>
        
        <div 
          className={`absolute top-16 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full transition-all duration-100 ${rightArc ? 'scale-115' : 'scale-100'}`}
          style={{ 
            background: rightArc 
              ? 'radial-gradient(circle at 30% 30%, white 0%, #CC88FF 30%, #8844AA 100%)'
              : 'radial-gradient(circle at 30% 30%, #AA88CC 0%, #553377 50%, #331155 100%)',
            boxShadow: rightArc 
              ? '0 0 60px 25px rgba(180,100,255,0.9), 0 0 120px 50px rgba(180,100,255,0.5)' 
              : '0 0 20px 8px rgba(150,80,200,0.3)',
          }}
        />
        
        {rightArc && (
          <svg className="absolute top-20 right-16 w-80 h-40 overflow-visible scale-x-[-1]">
            {[...Array(3)].map((_, i) => (
              <path 
                key={i}
                d={`M0,${20 + i * 5} Q${80 + Math.random() * 40},${(Math.random() - 0.5) * 60} ${200},${20 + i * 5}`}
                stroke="#CC88FF" 
                strokeWidth={3 - i * 0.5}
                fill="none" 
                filter="url(#arc-glow)"
                opacity={1 - i * 0.2}
              />
            ))}
          </svg>
        )}
      </div>
      
      {/* Toxic floor glow */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(0,255,100,0.25) 0%, transparent 60%)' }} />
      
      {/* Floating toxic particles */}
      <FloatingParticles count={30} color="rgba(0,255,100,0.4)" speed="slow" />
      
      {/* Lab equipment shadows */}
      <div className="absolute bottom-0 left-24 w-20 h-32 bg-gradient-to-t from-gray-900/50 to-transparent rounded-t opacity-40" />
      <div className="absolute bottom-0 right-24 w-16 h-28 bg-gradient-to-t from-gray-900/50 to-transparent rounded-t opacity-40" />
    </div>
  );
}

// ============================================
// ZOMBIES THEME - For Winner Takes All Page
// Graveyard with rising undead
// ============================================
export function ZombiesOverlay() {
  const [fogOffset, setFogOffset] = useState(0);
  const [lightningFlash, setLightningFlash] = useState(false);
  
  useEffect(() => {
    const fogInterval = setInterval(() => {
      setFogOffset(prev => (prev + 1) % 100);
    }, 100);
    
    const flashInterval = setInterval(() => {
      setLightningFlash(true);
      setTimeout(() => setLightningFlash(false), 100);
    }, 8000 + Math.random() * 5000);
    
    return () => { clearInterval(fogInterval); clearInterval(flashInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DECAY GREEN/PURPLE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0812 0%, #100a15 20%, #0a100a 40%, #12100a 60%, #0a0a08 100%)',
        }}
      />
      
      {lightningFlash && <div className="absolute inset-0 bg-purple-300/15" style={{ mixBlendMode: 'screen' }} />}
      
      {/* Full moon */}
      <div className="absolute top-8 right-16">
        <div 
          className="w-24 h-24 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #FFFACD 0%, #F0E68C 50%, #DAA520 100%)',
            boxShadow: '0 0 80px 30px rgba(255,250,200,0.3), 0 0 150px 60px rgba(150,100,200,0.2)',
          }}
        />
        {/* Moon craters */}
        <div className="absolute top-4 left-6 w-4 h-4 bg-yellow-300/30 rounded-full" />
        <div className="absolute top-10 right-5 w-3 h-3 bg-yellow-400/20 rounded-full" />
      </div>
      
      {/* Layered fog */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-56"
        style={{
          background: 'linear-gradient(0deg, rgba(80,100,60,0.5) 0%, rgba(60,80,50,0.3) 40%, transparent 100%)',
          transform: `translateX(${Math.sin(fogOffset * 0.03) * 30}px)`,
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background: 'linear-gradient(0deg, rgba(100,80,120,0.4) 0%, transparent 80%)',
          transform: `translateX(${Math.sin((fogOffset + 50) * 0.03) * -40}px)`,
        }}
      />
      
      {/* Tombstones */}
      {[...Array(6)].map((_, i) => (
        <div 
          key={i}
          className="absolute bottom-20"
          style={{ left: `${8 + i * 16}%` }}
        >
          <div 
            className={`bg-gray-800 rounded-t-lg opacity-60 ${i % 2 === 0 ? 'w-14 h-24' : 'w-12 h-20'}`}
            style={{ boxShadow: '0 0 20px rgba(100,50,150,0.3)' }}
          >
            {/* Cross */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-8 bg-gray-600" />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-6 h-1 bg-gray-600" />
          </div>
        </div>
      ))}
      
      {/* Dead tree */}
      <div className="absolute bottom-20 left-1/4 opacity-40">
        <div className="w-4 h-40 bg-gradient-to-t from-gray-900 to-gray-800" />
        <div className="absolute top-0 left-2 w-20 h-2 bg-gray-800 -rotate-30" />
        <div className="absolute top-8 left-2 w-16 h-2 bg-gray-800 -rotate-45" />
        <div className="absolute top-4 right-0 w-12 h-2 bg-gray-800 rotate-40" />
      </div>
      
      {/* Floating green particles */}
      <FloatingParticles count={20} color="rgba(100,200,100,0.3)" speed="slow" />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 20%, rgba(10,5,15,0.7) 100%)' }} />
    </div>
  );
}

// ============================================
// STYX THEME - For Coin Play Page
// Greek underworld river
// ============================================
export function StyxOverlay() {
  const [waterRipple, setWaterRipple] = useState(0);
  const [ghostGlow, setGhostGlow] = useState(false);
  
  useEffect(() => {
    const rippleInterval = setInterval(() => {
      setWaterRipple(prev => (prev + 1) % 100);
    }, 80);
    
    const glowInterval = setInterval(() => {
      setGhostGlow(true);
      setTimeout(() => setGhostGlow(false), 600);
    }, 5000 + Math.random() * 4000);
    
    return () => { clearInterval(rippleInterval); clearInterval(glowInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* UNDERWORLD PURPLE/BLUE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0515 0%, #10081a 25%, #0a0a18 50%, #08051a 75%, #050510 100%)',
        }}
      />
      
      {ghostGlow && <div className="absolute inset-0 bg-blue-400/8" style={{ mixBlendMode: 'screen' }} />}
      
      {/* River Styx water */}
      <div className="absolute bottom-0 left-0 right-0 h-44">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, rgba(20,40,80,0.8) 0%, rgba(30,50,100,0.5) 40%, rgba(50,40,100,0.3) 70%, transparent 100%)`,
            transform: `translateX(${Math.sin(waterRipple * 0.05) * 10}px)`,
          }}
        />
        {/* Ripples */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-purple-400/20"
            style={{
              width: '100%',
              bottom: `${20 + i * 8}%`,
              transform: `scaleX(${0.8 + Math.sin((waterRipple + i * 20) * 0.1) * 0.2})`,
            }}
          />
        ))}
      </div>
      
      {/* Floating spirit coins */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float-coin"
          style={{
            left: `${20 + i * 20}%`,
            bottom: `${25 + (i % 2) * 10}%`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          <div 
            className="w-10 h-10 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #FFD700 0%, #B8860B 50%, #8B6914 100%)',
              boxShadow: '0 0 25px 8px rgba(255,215,0,0.4)',
            }}
          />
        </div>
      ))}
      
      {/* Greek columns */}
      <div className="absolute bottom-0 left-6 w-12 h-72 opacity-25">
        <div className="w-full h-4 bg-purple-900 rounded" />
        <div className="w-10 h-60 bg-purple-950 mx-auto" />
        <div className="w-full h-4 bg-purple-900 rounded" />
      </div>
      <div className="absolute bottom-0 right-6 w-12 h-72 opacity-25">
        <div className="w-full h-4 bg-purple-900 rounded" />
        <div className="w-10 h-60 bg-purple-950 mx-auto" />
        <div className="w-full h-4 bg-purple-900 rounded" />
      </div>
      
      {/* Blue spirit particles */}
      <FloatingParticles count={15} color="rgba(100,150,255,0.3)" speed="slow" />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(5,0,15,0.8) 100%)' }} />
      
      <style jsx>{`
        @keyframes float-coin { 
          0%, 100% { transform: translateY(0) rotate(0deg); } 
          50% { transform: translateY(-25px) rotate(180deg); } 
        }
        .animate-float-coin { animation: float-coin 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// HAUNTED THEME - For Dashboard
// Toxic acid rising with webs
// ============================================
export function HauntedOverlay() {
  const [acidLevel, setAcidLevel] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAcidLevel(prev => (prev + 1) % 200);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  const acidHeight = 18 + Math.sin(acidLevel * 0.03) * 6;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* HAUNTED PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0812 0%, #12080a 25%, #0a100a 50%, #100a10 75%, #080a08 100%)',
        }}
      />
      
      {/* GREEN ACID RISING */}
      <div 
        className="absolute bottom-0 left-0 right-0 transition-all duration-300"
        style={{ height: `${acidHeight}%` }}
      >
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(0deg, rgba(0,200,50,0.6) 0%, rgba(50,255,100,0.4) 30%, rgba(100,255,150,0.2) 60%, transparent 100%)',
          }}
        />
        {/* Surface glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-6"
          style={{
            background: 'linear-gradient(0deg, transparent 0%, rgba(100,255,100,0.6) 50%, rgba(200,255,200,0.4) 100%)',
            boxShadow: '0 -15px 50px 15px rgba(0,255,100,0.4)',
          }}
        />
        {/* Bubbles */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bubble"
            style={{
              left: `${(i * 10) + 5}%`,
              bottom: '10%',
              width: `${6 + (i % 3) * 4}px`,
              height: `${6 + (i % 3) * 4}px`,
              background: 'radial-gradient(circle at 30% 30%, rgba(200,255,200,0.8), rgba(100,255,100,0.4))',
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>
      
      {/* Spider webs */}
      <svg className="absolute top-0 left-0 w-80 h-80 opacity-25" viewBox="0 0 100 100">
        <path d="M0,0 Q60,25 100,0" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 Q25,60 0,100" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 L85,85" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L100,45" stroke="#fff" strokeWidth="0.3" fill="none" />
        <ellipse cx="25" cy="25" rx="20" ry="15" stroke="#fff" strokeWidth="0.3" fill="none" transform="rotate(-45 25 25)" />
        <ellipse cx="45" cy="45" rx="40" ry="30" stroke="#fff" strokeWidth="0.2" fill="none" transform="rotate(-45 45 45)" />
      </svg>
      <svg className="absolute top-0 right-0 w-80 h-80 opacity-25 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q60,25 100,0" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 Q25,60 0,100" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 L85,85" stroke="#fff" strokeWidth="0.4" fill="none" />
      </svg>
      
      {/* Orange pumpkin glows */}
      <div className="absolute bottom-8 left-8 w-32 h-32" style={{ background: 'radial-gradient(circle, rgba(255,100,0,0.2) 0%, transparent 50%)' }} />
      <div className="absolute bottom-8 right-8 w-32 h-32" style={{ background: 'radial-gradient(circle, rgba(255,80,0,0.2) 0%, transparent 50%)' }} />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(10,5,12,0.6) 100%)' }} />
      
      <style jsx>{`
        @keyframes bubble { 
          0% { transform: translateY(0) scale(1); opacity: 0.8; } 
          100% { transform: translateY(-500px) scale(0.3); opacity: 0; } 
        }
        .animate-bubble { animation: bubble 5s ease-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// CARNIVAL THEME - For Games Page
// Creepy circus with spotlights
// ============================================
export function CarnivalOverlay() {
  const [spotlight1, setSpotlight1] = useState(0);
  const [spotlight2, setSpotlight2] = useState(45);
  const [lightFlicker, setLightFlicker] = useState([true, true, true, true, true, true]);
  
  useEffect(() => {
    const spotInterval = setInterval(() => {
      setSpotlight1(prev => (prev + 1) % 360);
      setSpotlight2(prev => (prev - 0.7 + 360) % 360);
    }, 40);
    
    const flickerInterval = setInterval(() => {
      setLightFlicker(Array.from({ length: 6 }, () => Math.random() > 0.15));
    }, 120);
    
    return () => { clearInterval(spotInterval); clearInterval(flickerInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* CREEPY CARNIVAL PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a0510 0%, #150812 25%, #120510 50%, #0a0808 100%)',
        }}
      />
      
      {/* Circus tent stripes */}
      <div className="absolute top-0 left-0 right-0 h-28 overflow-hidden opacity-35">
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(90deg, rgba(180,50,50,0.6) 0px, rgba(180,50,50,0.6) 50px, rgba(40,20,40,0.4) 50px, rgba(40,20,40,0.4) 100px)',
          }}
        />
        {/* Tent peak */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '150px solid transparent',
            borderRight: '150px solid transparent',
            borderBottom: '80px solid rgba(180,50,50,0.4)',
          }}
        />
      </div>
      
      {/* Swinging spotlights */}
      <div 
        className="absolute top-0 left-1/2 w-72 h-full opacity-20"
        style={{
          background: 'linear-gradient(180deg, rgba(255,200,100,0.8) 0%, rgba(255,150,50,0.3) 30%, transparent 60%)',
          transform: `translateX(-50%) rotate(${Math.sin(spotlight1 * Math.PI / 180) * 30}deg)`,
          transformOrigin: 'top center',
        }}
      />
      <div 
        className="absolute top-0 left-1/3 w-56 h-full opacity-15"
        style={{
          background: 'linear-gradient(180deg, rgba(255,100,100,0.7) 0%, rgba(255,50,50,0.2) 25%, transparent 50%)',
          transform: `translateX(-50%) rotate(${Math.sin(spotlight2 * Math.PI / 180) * 25}deg)`,
          transformOrigin: 'top center',
        }}
      />
      
      {/* Carnival lights */}
      <div className="absolute top-28 left-0 right-0 flex justify-around">
        {lightFlicker.map((on, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all duration-100"
            style={{
              background: on 
                ? (i % 2 === 0 ? '#ff6600' : '#cc44cc')
                : (i % 2 === 0 ? '#663300' : '#442244'),
              boxShadow: on 
                ? `0 0 20px 8px ${i % 2 === 0 ? 'rgba(255,100,0,0.7)' : 'rgba(200,100,200,0.7)'}` 
                : 'none',
            }}
          />
        ))}
      </div>
      
      {/* Floating tickets */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float-ticket"
          style={{
            left: `${20 + i * 30}%`,
            top: `${30 + (i % 2) * 15}%`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          <div 
            className="w-14 h-7 rounded opacity-45"
            style={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              boxShadow: '0 0 15px rgba(255,200,0,0.4)',
            }}
          />
        </div>
      ))}
      
      {/* Creepy clown silhouette */}
      <div className="absolute bottom-12 left-12 opacity-20">
        <div className="w-24 h-28 relative">
          <div className="absolute inset-x-2 top-0 h-16 rounded-full bg-gray-800" />
          <div className="absolute top-4 left-4 w-5 h-5 rounded-full bg-black" />
          <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-black" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-900" />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-12 h-5 rounded-full bg-red-900/50" />
        </div>
      </div>
      
      {/* Orange corner glows */}
      <div className="absolute bottom-0 left-0 w-56 h-56" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(255,100,0,0.2) 0%, transparent 50%)' }} />
      <div className="absolute bottom-0 right-0 w-56 h-56" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(255,80,0,0.2) 0%, transparent 50%)' }} />
      
      {/* Heavy vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 10%, rgba(10,5,15,0.75) 100%)' }} />
      
      <style jsx>{`
        @keyframes float-ticket { 
          0%, 100% { transform: translateY(0) rotate(-5deg); } 
          50% { transform: translateY(-20px) rotate(5deg); } 
        }
        .animate-float-ticket { animation: float-ticket 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SPIDER THEME - For Home Page
// Giant webs and crawling spiders
// ============================================
export function SpiderOverlay() {
  const [spiderPos, setSpiderPos] = useState({ x: 50, y: 25 });
  const [webShimmer, setWebShimmer] = useState(0);
  
  useEffect(() => {
    const spiderInterval = setInterval(() => {
      setSpiderPos({
        x: 30 + Math.random() * 40,
        y: 15 + Math.random() * 25,
      });
    }, 3000);
    
    const shimmerInterval = setInterval(() => {
      setWebShimmer(prev => (prev + 1) % 100);
    }, 80);
    
    return () => { clearInterval(spiderInterval); clearInterval(shimmerInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DARK PURPLE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #08050a 0%, #0a0812 25%, #0c0a10 50%, #0a0810 75%, #060508 100%)',
        }}
      />
      
      {/* GIANT CENTER WEB */}
      <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-5xl opacity-20" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="webGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset={`${webShimmer}%`} stopColor="rgba(255,255,255,0.5)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>
        {/* Radial threads */}
        {[...Array(20)].map((_, i) => (
          <line key={i} x1="200" y1="200" x2={200 + 200 * Math.cos(i * Math.PI / 10)} y2={200 + 200 * Math.sin(i * Math.PI / 10)} stroke="url(#webGrad)" strokeWidth="0.8" />
        ))}
        {/* Spiral */}
        {[...Array(10)].map((_, i) => (
          <circle key={i} cx="200" cy="200" r={20 + i * 20} stroke="url(#webGrad)" strokeWidth="0.5" fill="none" />
        ))}
      </svg>
      
      {/* Corner webs */}
      <svg className="absolute top-0 left-0 w-96 h-96 opacity-30" viewBox="0 0 100 100">
        <path d="M0,0 Q60,20 100,0" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 Q20,60 0,100" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 L90,90" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L100,50" stroke="#fff" strokeWidth="0.35" fill="none" />
        <path d="M0,0 L50,100" stroke="#fff" strokeWidth="0.35" fill="none" />
        <ellipse cx="20" cy="20" rx="15" ry="12" stroke="#fff" strokeWidth="0.3" fill="none" transform="rotate(-45 20 20)" />
        <ellipse cx="40" cy="40" rx="35" ry="25" stroke="#fff" strokeWidth="0.25" fill="none" transform="rotate(-45 40 40)" />
        <ellipse cx="60" cy="60" rx="55" ry="40" stroke="#fff" strokeWidth="0.2" fill="none" transform="rotate(-45 60 60)" />
      </svg>
      <svg className="absolute top-0 right-0 w-96 h-96 opacity-30 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q60,20 100,0" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 Q20,60 0,100" stroke="#fff" strokeWidth="0.6" fill="none" />
        <path d="M0,0 L90,90" stroke="#fff" strokeWidth="0.4" fill="none" />
        <ellipse cx="30" cy="30" rx="25" ry="18" stroke="#fff" strokeWidth="0.25" fill="none" transform="rotate(-45 30 30)" />
      </svg>
      
      {/* Animated spider */}
      <div 
        className="absolute transition-all duration-2000 ease-in-out"
        style={{ left: `${spiderPos.x}%`, top: `${spiderPos.y}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className="absolute left-1/2 bottom-full w-px h-40 bg-gradient-to-b from-white/5 to-white/25" />
        <div className="relative w-10 h-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-900 rounded-full" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-8 bg-gray-900 rounded-full" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute top-4 left-1/2 w-8 h-0.5 bg-gray-800 origin-left" style={{ transform: `rotate(${i < 4 ? -20 - i * 28 : 20 + (i - 4) * 28}deg)` }} />
          ))}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* Small spiders */}
      <div className="absolute top-24 left-20 w-5 h-6 opacity-40">
        <div className="w-2.5 h-2.5 bg-gray-800 rounded-full" />
        <div className="w-3 h-4 bg-gray-800 rounded-full -mt-1" />
      </div>
      <div className="absolute top-40 right-28 w-4 h-5 opacity-35">
        <div className="w-2 h-2 bg-gray-800 rounded-full" />
        <div className="w-2.5 h-3 bg-gray-800 rounded-full -mt-0.5" />
      </div>
      
      {/* Purple mist */}
      <div className="absolute bottom-0 left-0 right-0 h-56" style={{ background: 'linear-gradient(0deg, rgba(80,40,120,0.35) 0%, rgba(60,30,100,0.15) 50%, transparent 100%)' }} />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(5,0,10,0.7) 100%)' }} />
    </div>
  );
}

// ============================================
// MONEY HORROR THEME - For Buy Tokens Page
// Cursed money and dark horror
// ============================================
export function MoneyHorrorOverlay() {
  const [eyeOpen, setEyeOpen] = useState(false);
  const [bloodDrip, setBloodDrip] = useState(0);
  
  useEffect(() => {
    const eyeInterval = setInterval(() => {
      setEyeOpen(true);
      setTimeout(() => setEyeOpen(false), 2000);
    }, 5000);
    
    const dripInterval = setInterval(() => {
      setBloodDrip(prev => (prev + 1) % 100);
    }, 100);
    
    return () => { clearInterval(eyeInterval); clearInterval(dripInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* HORROR GREEN/PURPLE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #050a08 0%, #0a0812 25%, #081008 50%, #0a080a 75%, #050508 100%)',
        }}
      />
      
      {/* Blood dripping */}
      <DrippingBlood count={10} />
      
      {/* Evil watching eye */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-28 h-18 opacity-40">
        <div 
          className={`w-full h-full rounded-full transition-all duration-500 ${eyeOpen ? 'scale-110' : 'scale-90'}`}
          style={{
            background: 'radial-gradient(ellipse, rgba(20,0,0,0.95) 0%, rgba(40,0,0,0.8) 40%, transparent 70%)',
            border: '3px solid rgba(80,0,0,0.6)',
          }}
        >
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full transition-all duration-300 ${eyeOpen ? 'bg-green-400' : 'bg-green-900'}`}
            style={{ boxShadow: eyeOpen ? '0 0 40px 15px rgba(0,255,0,0.6)' : 'none' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-10 bg-black rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Floating cursed money */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-cursed-money"
          style={{
            left: `${10 + i * 12}%`,
            top: `${30 + (i % 3) * 15}%`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          <div 
            className="w-16 h-9 rounded relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(40,80,40,0.7) 0%, rgba(30,60,30,0.9) 100%)',
              border: '1px solid rgba(80,150,80,0.4)',
              boxShadow: '0 0 15px rgba(0,200,0,0.2)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-green-400/70 text-xl font-bold">$</div>
            <div className="absolute top-1 right-1 w-3 h-2 bg-red-800/60 rounded-full" />
          </div>
        </div>
      ))}
      
      {/* Haunted coin stacks */}
      <div className="absolute bottom-8 left-10 flex gap-2 opacity-35">
        <div className="w-10 h-20 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        <div className="w-10 h-28 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        <div className="w-10 h-16 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        <div className="absolute -inset-3 bg-green-500/15 blur-lg rounded" />
      </div>
      <div className="absolute bottom-8 right-10 flex gap-2 opacity-35">
        <div className="w-10 h-18 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        <div className="w-10 h-24 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        <div className="absolute -inset-3 bg-purple-500/15 blur-lg rounded" />
      </div>
      
      {/* Green poison mist */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-44"
        style={{
          background: 'linear-gradient(0deg, rgba(0,100,30,0.45) 0%, rgba(50,150,80,0.25) 40%, transparent 100%)',
          transform: `translateX(${Math.sin(bloodDrip * 0.05) * 20}px)`,
        }}
      />
      
      {/* Purple corner glows */}
      <div className="absolute top-0 left-0 w-56 h-56" style={{ background: 'radial-gradient(circle at 0% 0%, rgba(100,0,150,0.2) 0%, transparent 50%)' }} />
      <div className="absolute top-0 right-0 w-56 h-56" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(100,0,150,0.2) 0%, transparent 50%)' }} />
      
      {/* Very dark horror vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 10%, rgba(0,0,5,0.8) 100%)' }} />
      
      <style jsx>{`
        @keyframes cursed-money { 
          0%, 100% { transform: translateY(0) rotate(-3deg); opacity: 0.5; } 
          50% { transform: translateY(-20px) rotate(3deg); opacity: 0.7; } 
        }
        .animate-cursed-money { animation: cursed-money 7s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
