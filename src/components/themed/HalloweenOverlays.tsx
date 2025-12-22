'use client';

import React, { useEffect, useState } from 'react';

// ============================================
// HELL THEME - For Hot Sell Page
// Deep orange/purple, hellfire, dramatic lightning
// ============================================
export function HellOverlay() {
  const [lightning, setLightning] = useState(false);
  const [lightningPos, setLightningPos] = useState({ x: 50, type: 0 });
  
  useEffect(() => {
    const strike = () => {
      setLightningPos({ x: 15 + Math.random() * 70, type: Math.floor(Math.random() * 3) });
      setLightning(true);
      setTimeout(() => setLightning(false), 100);
      setTimeout(() => {
        setLightning(true);
        setTimeout(() => setLightning(false), 60);
      }, 120);
    };
    const interval = setInterval(strike, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* HALLOWEEN ORANGE/PURPLE PAGE COLOR OVERRIDE */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(60,20,80,0.7) 0%, rgba(120,40,20,0.6) 30%, rgba(80,30,60,0.7) 60%, rgba(40,10,30,0.8) 100%)',
        }}
      />
      
      {/* Lightning flash overlay */}
      {lightning && (
        <div className="absolute inset-0 bg-orange-200/30 animate-flash" style={{ mixBlendMode: 'overlay' }} />
      )}
      
      {/* Lightning bolt SVG */}
      {lightning && (
        <svg 
          className="absolute top-0 h-full"
          style={{ left: `${lightningPos.x}%`, width: '150px', transform: 'translateX(-50%)' }}
          viewBox="0 0 80 400"
        >
          <defs>
            <filter id="hellGlow">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path 
            d={lightningPos.type === 0 
              ? "M40,0 L35,60 L50,65 L30,140 L48,145 L20,250 L45,255 L15,400"
              : lightningPos.type === 1
              ? "M40,0 L45,70 L30,75 L50,150 L35,155 L55,280 L30,285 L50,400"
              : "M40,0 L38,80 L52,85 L28,180 L45,185 L25,300 L42,305 L20,400"
            }
            stroke="#FFE4B5" 
            strokeWidth="4" 
            fill="none"
            filter="url(#hellGlow)"
          />
          {/* Branch */}
          <path 
            d="M35,60 L60,120 L55,125 L75,180" 
            stroke="#FFE4B5" 
            strokeWidth="2" 
            fill="none"
            filter="url(#hellGlow)"
          />
        </svg>
      )}
      
      {/* Hellfire glow bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 animate-hellfire"
        style={{
          background: 'linear-gradient(0deg, rgba(255,80,0,0.5) 0%, rgba(200,50,0,0.3) 40%, transparent 100%)',
        }}
      />
      
      {/* Purple mist rising */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64 animate-mist-rise"
        style={{
          background: 'linear-gradient(0deg, rgba(100,0,150,0.3) 0%, rgba(80,0,120,0.15) 50%, transparent 100%)',
        }}
      />
      
      {/* Dark vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(20,0,30,0.6) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes flash { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        @keyframes hellfire { 0%, 100% { opacity: 0.8; transform: scaleY(1); } 50% { opacity: 1; transform: scaleY(1.1); } }
        @keyframes mist-rise { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-20px); opacity: 0.7; } }
        .animate-flash { animation: flash 0.1s ease-out; }
        .animate-hellfire { animation: hellfire 2s ease-in-out infinite; }
        .animate-mist-rise { animation: mist-rise 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// FRANKENSTEIN THEME - For 1v1 Page
// GREEN/PURPLE MIX with REAL LIGHTNING
// ============================================
export function FrankensteinOverlay() {
  const [leftArc, setLeftArc] = useState(false);
  const [rightArc, setRightArc] = useState(false);
  const [centerLightning, setCenterLightning] = useState(false);
  
  useEffect(() => {
    // Tesla coil arcs
    const arcInterval = setInterval(() => {
      const side = Math.random();
      if (side < 0.4) { setLeftArc(true); setTimeout(() => setLeftArc(false), 200); }
      else if (side < 0.8) { setRightArc(true); setTimeout(() => setRightArc(false), 200); }
      else { 
        setLeftArc(true); setRightArc(true); 
        setTimeout(() => { setLeftArc(false); setRightArc(false); }, 300);
      }
    }, 1500 + Math.random() * 2000);
    
    // Center lightning
    const lightningInterval = setInterval(() => {
      setCenterLightning(true);
      setTimeout(() => setCenterLightning(false), 150);
    }, 5000 + Math.random() * 5000);
    
    return () => { clearInterval(arcInterval); clearInterval(lightningInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* GREEN/PURPLE GRADIENT PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(20,60,30,0.75) 0%, rgba(60,20,80,0.7) 50%, rgba(30,80,40,0.75) 100%)',
        }}
      />
      
      {/* Dark laboratory sections */}
      <div 
        className="absolute top-0 left-0 right-0 h-1/3"
        style={{
          background: 'linear-gradient(180deg, rgba(10,5,20,0.6) 0%, transparent 100%)',
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{
          background: 'linear-gradient(0deg, rgba(5,10,5,0.5) 0%, transparent 100%)',
        }}
      />
      
      {/* Lightning flash */}
      {(leftArc || rightArc || centerLightning) && (
        <div 
          className="absolute inset-0 animate-flash"
          style={{ 
            background: centerLightning 
              ? 'rgba(200,255,200,0.2)' 
              : 'rgba(100,255,200,0.15)',
            mixBlendMode: 'screen'
          }} 
        />
      )}
      
      {/* Center lightning bolt */}
      {centerLightning && (
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-48" viewBox="0 0 100 400">
          <defs>
            <filter id="greenGlow">
              <feGaussianBlur stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path 
            d="M50,0 L45,60 L58,65 L38,130 L55,135 L30,220 L52,225 L25,320 L48,325 L35,400" 
            stroke="#00FF88" 
            strokeWidth="5" 
            fill="none"
            filter="url(#greenGlow)"
          />
          <path 
            d="M45,60 L70,100 L65,105 L85,150" 
            stroke="#00FF88" 
            strokeWidth="3" 
            fill="none"
            filter="url(#greenGlow)"
          />
          <path 
            d="M38,130 L15,180 L20,185 L5,230" 
            stroke="#00FF88" 
            strokeWidth="3" 
            fill="none"
            filter="url(#greenGlow)"
          />
        </svg>
      )}
      
      {/* Left Tesla coil with arc */}
      <div className="absolute left-4 top-16 bottom-16">
        <div className="w-6 h-full bg-gradient-to-b from-gray-600 via-gray-500 to-gray-600 rounded" />
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full transition-all duration-100 ${leftArc ? 'bg-cyan-300 shadow-2xl shadow-cyan-400' : 'bg-cyan-700/50'}`} 
          style={{ boxShadow: leftArc ? '0 0 40px 15px rgba(0,255,200,0.8)' : 'none' }}
        />
        {leftArc && (
          <svg className="absolute top-5 left-8 w-64 h-48" viewBox="0 0 250 150">
            <path 
              d="M0,75 Q40,50 80,75 T160,75 T240,75" 
              stroke="#00FFCC" 
              strokeWidth="3" 
              fill="none"
              className="animate-arc"
              style={{ filter: 'drop-shadow(0 0 10px #00FFCC)' }}
            />
          </svg>
        )}
      </div>
      
      {/* Right Tesla coil with arc */}
      <div className="absolute right-4 top-16 bottom-16">
        <div className="w-6 h-full bg-gradient-to-b from-gray-600 via-gray-500 to-gray-600 rounded" />
        <div className={`absolute top-0 right-1/2 translate-x-1/2 w-10 h-10 rounded-full transition-all duration-100 ${rightArc ? 'bg-purple-300 shadow-2xl shadow-purple-400' : 'bg-purple-700/50'}`}
          style={{ boxShadow: rightArc ? '0 0 40px 15px rgba(180,100,255,0.8)' : 'none' }}
        />
        {rightArc && (
          <svg className="absolute top-5 right-8 w-64 h-48 scale-x-[-1]" viewBox="0 0 250 150">
            <path 
              d="M0,75 Q40,100 80,75 T160,75 T240,75" 
              stroke="#CC88FF" 
              strokeWidth="3" 
              fill="none"
              className="animate-arc"
              style={{ filter: 'drop-shadow(0 0 10px #CC88FF)' }}
            />
          </svg>
        )}
      </div>
      
      {/* Green toxic glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0,255,100,0.25) 0%, transparent 60%)',
        }}
      />
      
      {/* Purple energy at top */}
      <div 
        className="absolute top-0 left-0 right-0 h-24"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(150,50,200,0.2) 0%, transparent 60%)',
        }}
      />
      
      <style jsx>{`
        @keyframes flash { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        @keyframes arc { 0%, 100% { transform: translateY(0); opacity: 0.8; } 25% { transform: translateY(-5px); opacity: 1; } 75% { transform: translateY(5px); opacity: 1; } }
        .animate-flash { animation: flash 0.15s ease-out; }
        .animate-arc { animation: arc 0.1s linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// ZOMBIES THEME - For Winner Takes All Page
// Dark purple/green decay, eerie atmosphere
// ============================================
export function ZombiesOverlay() {
  const [flicker, setFlicker] = useState(false);
  
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      setFlicker(true);
      setTimeout(() => setFlicker(false), 100);
    }, 8000 + Math.random() * 4000);
    return () => clearInterval(flickerInterval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* PURPLE/GREEN DECAY GRADIENT */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(40,20,60,0.75) 0%, rgba(30,40,30,0.6) 40%, rgba(50,30,50,0.7) 70%, rgba(20,30,20,0.8) 100%)',
        }}
      />
      
      {/* Lightning flicker */}
      {flicker && (
        <div className="absolute inset-0 bg-purple-200/20" style={{ mixBlendMode: 'screen' }} />
      )}
      
      {/* Full moon with purple haze */}
      <div className="absolute top-8 right-12">
        <div 
          className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200"
          style={{
            boxShadow: '0 0 60px 20px rgba(255,255,200,0.3), 0 0 100px 40px rgba(150,100,200,0.2)',
          }}
        />
      </div>
      
      {/* Green fog layers */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 animate-fog-drift"
        style={{
          background: 'linear-gradient(0deg, rgba(100,150,80,0.4) 0%, rgba(80,120,60,0.2) 50%, transparent 100%)',
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 animate-fog-drift-slow"
        style={{
          background: 'linear-gradient(0deg, rgba(120,100,150,0.3) 0%, transparent 80%)',
        }}
      />
      
      {/* Tombstones with purple glow */}
      <div className="absolute bottom-16 left-12 opacity-50">
        <div className="w-12 h-20 bg-gray-800 rounded-t-lg" />
        <div className="absolute -inset-2 bg-purple-500/20 rounded-lg blur-sm" />
      </div>
      <div className="absolute bottom-16 right-12 opacity-50">
        <div className="w-14 h-24 bg-gray-700 rounded-t-lg" />
        <div className="absolute -inset-2 bg-purple-500/20 rounded-lg blur-sm" />
      </div>
      <div className="absolute bottom-16 left-1/3 opacity-40">
        <div className="w-10 h-16 bg-gray-800 rounded-t-lg" />
        <div className="absolute -inset-1 bg-green-500/10 rounded-lg blur-sm" />
      </div>
      
      {/* Purple/green vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(40,20,60,0.5) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes fog-drift { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(30px); } }
        @keyframes fog-drift-slow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-40px); } }
        .animate-fog-drift { animation: fog-drift 10s ease-in-out infinite; }
        .animate-fog-drift-slow { animation: fog-drift-slow 14s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// STYX THEME - For Coin Play Page
// Deep purple underworld, ghostly blue
// ============================================
export function StyxOverlay() {
  const [ghostLight, setGhostLight] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setGhostLight(true);
      setTimeout(() => setGhostLight(false), 500);
    }, 6000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DEEP PURPLE/DARK BLUE UNDERWORLD */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,15,60,0.8) 0%, rgba(20,20,50,0.7) 40%, rgba(40,25,70,0.8) 70%, rgba(15,25,45,0.85) 100%)',
        }}
      />
      
      {/* Ghost light flash */}
      {ghostLight && (
        <div className="absolute inset-0 bg-blue-300/10" style={{ mixBlendMode: 'screen' }} />
      )}
      
      {/* River Styx - dark mystical water */}
      <div className="absolute bottom-0 left-0 right-0 h-36">
        <div 
          className="absolute inset-0 animate-water"
          style={{
            background: 'linear-gradient(0deg, rgba(30,50,100,0.7) 0%, rgba(40,60,120,0.4) 50%, transparent 100%)',
          }}
        />
        {/* Purple reflections */}
        <div 
          className="absolute inset-0 animate-water-alt"
          style={{
            background: 'linear-gradient(0deg, rgba(80,40,120,0.3) 0%, transparent 60%)',
          }}
        />
      </div>
      
      {/* Floating spirit coins */}
      <div className="absolute bottom-24 left-1/4 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600/60 to-yellow-900/60 animate-float-coin shadow-lg" 
        style={{ boxShadow: '0 0 20px 5px rgba(150,100,50,0.4)' }} 
      />
      <div className="absolute bottom-32 right-1/3 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-700/50 to-yellow-900/50 animate-float-coin-alt shadow-lg"
        style={{ boxShadow: '0 0 15px 3px rgba(150,100,50,0.3)', animationDelay: '2s' }}
      />
      
      {/* Greek columns with purple glow */}
      <div className="absolute bottom-0 left-4 w-10 h-64 opacity-30">
        <div className="w-full h-5 bg-purple-800 rounded" />
        <div className="w-8 h-52 bg-purple-900 mx-auto" />
        <div className="w-full h-5 bg-purple-800 rounded" />
        <div className="absolute -inset-2 bg-purple-500/20 blur-md" />
      </div>
      <div className="absolute bottom-0 right-4 w-10 h-64 opacity-30">
        <div className="w-full h-5 bg-purple-800 rounded" />
        <div className="w-8 h-52 bg-purple-900 mx-auto" />
        <div className="w-full h-5 bg-purple-800 rounded" />
        <div className="absolute -inset-2 bg-purple-500/20 blur-md" />
      </div>
      
      {/* Dark vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(15,10,30,0.7) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes water { 0%, 100% { opacity: 0.7; } 50% { opacity: 0.9; } }
        @keyframes water-alt { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
        @keyframes float-coin { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } }
        @keyframes float-coin-alt { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-25px) rotate(-180deg); } }
        .animate-water { animation: water 4s ease-in-out infinite; }
        .animate-water-alt { animation: water-alt 6s ease-in-out infinite; }
        .animate-float-coin { animation: float-coin 5s ease-in-out infinite; }
        .animate-float-coin-alt { animation: float-coin-alt 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// HAUNTED THEME - For Dashboard
// Orange/purple Halloween colors, spooky
// ============================================
export function HauntedOverlay() {
  const [candleFlicker, setCandleFlicker] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCandleFlicker(prev => !prev);
    }, 200 + Math.random() * 300);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ORANGE/PURPLE HALLOWEEN GRADIENT */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(60,30,80,0.65) 0%, rgba(100,50,30,0.5) 40%, rgba(70,40,70,0.6) 70%, rgba(40,20,50,0.75) 100%)',
        }}
      />
      
      {/* Spider webs in corners */}
      <svg className="absolute top-0 left-0 w-56 h-56 opacity-25" viewBox="0 0 100 100">
        <path d="M0,0 Q50,25 100,0" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 Q25,50 0,100" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L75,75" stroke="#fff" strokeWidth="0.3" fill="none" />
        <path d="M0,0 Q40,15 80,40" stroke="#fff" strokeWidth="0.25" fill="none" />
        <path d="M0,0 Q15,40 40,80" stroke="#fff" strokeWidth="0.25" fill="none" />
        <path d="M0,0 L50,100" stroke="#fff" strokeWidth="0.2" fill="none" />
        <path d="M0,0 L100,50" stroke="#fff" strokeWidth="0.2" fill="none" />
        {/* Web circles */}
        <ellipse cx="25" cy="25" rx="20" ry="15" stroke="#fff" strokeWidth="0.2" fill="none" transform="rotate(-45 25 25)" />
        <ellipse cx="40" cy="40" rx="35" ry="25" stroke="#fff" strokeWidth="0.15" fill="none" transform="rotate(-45 40 40)" />
      </svg>
      <svg className="absolute top-0 right-0 w-56 h-56 opacity-25 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q50,25 100,0" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 Q25,50 0,100" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L75,75" stroke="#fff" strokeWidth="0.3" fill="none" />
      </svg>
      
      {/* Pumpkin glow corners */}
      <div 
        className={`absolute bottom-0 left-0 w-48 h-48 transition-opacity duration-200 ${candleFlicker ? 'opacity-100' : 'opacity-70'}`}
        style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(255,120,0,0.25) 0%, transparent 50%)',
        }}
      />
      <div 
        className={`absolute bottom-0 right-0 w-48 h-48 transition-opacity duration-200 ${!candleFlicker ? 'opacity-100' : 'opacity-70'}`}
        style={{
          background: 'radial-gradient(circle at 80% 80%, rgba(255,100,0,0.25) 0%, transparent 50%)',
        }}
      />
      
      {/* Purple mist at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(0deg, rgba(100,50,150,0.3) 0%, transparent 100%)',
        }}
      />
      
      {/* Dark vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(30,15,40,0.5) 100%)',
        }}
      />
    </div>
  );
}

// ============================================
// CARNIVAL THEME - For Games Page
// Dark purple/orange circus, eerie lights
// ============================================
export function CarnivalOverlay() {
  const [spotlightAngle, setSpotlightAngle] = useState(0);
  const [lightFlicker, setLightFlicker] = useState([true, true, true]);
  
  useEffect(() => {
    const spotInterval = setInterval(() => {
      setSpotlightAngle(prev => (prev + 1) % 360);
    }, 50);
    
    const flickerInterval = setInterval(() => {
      setLightFlicker([
        Math.random() > 0.1,
        Math.random() > 0.15,
        Math.random() > 0.1,
      ]);
    }, 150);
    
    return () => { clearInterval(spotInterval); clearInterval(flickerInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DARK PURPLE/ORANGE CIRCUS GRADIENT */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(50,20,60,0.7) 0%, rgba(80,40,30,0.55) 40%, rgba(60,25,50,0.65) 70%, rgba(30,10,35,0.8) 100%)',
        }}
      />
      
      {/* Circus tent stripes at top */}
      <div className="absolute top-0 left-0 right-0 h-16 overflow-hidden opacity-25">
        <div 
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(90deg, rgba(150,50,50,0.6) 0px, rgba(150,50,50,0.6) 30px, rgba(80,40,60,0.4) 30px, rgba(80,40,60,0.4) 60px)',
          }}
        />
      </div>
      
      {/* Swinging spotlight */}
      <div 
        className="absolute top-0 left-1/2 w-40 h-full opacity-15"
        style={{
          background: 'linear-gradient(180deg, rgba(255,200,100,0.5) 0%, rgba(255,180,80,0.2) 30%, transparent 60%)',
          transform: `translateX(-50%) rotate(${Math.sin(spotlightAngle * Math.PI / 180) * 20}deg)`,
          transformOrigin: 'top center',
        }}
      />
      
      {/* Flickering carnival lights */}
      <div className="absolute top-20 left-0 right-0 flex justify-around">
        <div className={`w-3 h-3 rounded-full transition-opacity duration-75 ${lightFlicker[0] ? 'bg-orange-400 opacity-100' : 'bg-orange-600 opacity-50'}`}
          style={{ boxShadow: lightFlicker[0] ? '0 0 15px 5px rgba(255,150,0,0.6)' : 'none' }} />
        <div className={`w-3 h-3 rounded-full transition-opacity duration-75 ${lightFlicker[1] ? 'bg-purple-400 opacity-100' : 'bg-purple-600 opacity-50'}`}
          style={{ boxShadow: lightFlicker[1] ? '0 0 15px 5px rgba(180,100,255,0.6)' : 'none' }} />
        <div className={`w-3 h-3 rounded-full transition-opacity duration-75 ${lightFlicker[2] ? 'bg-orange-400 opacity-100' : 'bg-orange-600 opacity-50'}`}
          style={{ boxShadow: lightFlicker[2] ? '0 0 15px 5px rgba(255,150,0,0.6)' : 'none' }} />
      </div>
      
      {/* Dark bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: 'linear-gradient(0deg, rgba(20,10,30,0.6) 0%, transparent 100%)',
        }}
      />
      
      {/* Heavy vignette for creepy effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(20,10,30,0.6) 100%)',
        }}
      />
    </div>
  );
}
