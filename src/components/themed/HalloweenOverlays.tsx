'use client';

import React, { useEffect, useState } from 'react';

// ============================================
// HELL THEME - For Hot Sell Page
// Deep orange/purple with GHOSTLY VEIL
// ============================================
export function HellOverlay() {
  const [lightning, setLightning] = useState(false);
  const [lightningPos, setLightningPos] = useState({ x: 50, type: 0 });
  const [ghostOpacity, setGhostOpacity] = useState(0.3);
  
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
    
    // Ghostly veil pulse
    const ghostInterval = setInterval(() => {
      setGhostOpacity(0.2 + Math.random() * 0.25);
    }, 2000);
    
    return () => { clearInterval(interval); clearInterval(ghostInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* HALLOWEEN ORANGE/PURPLE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(60,20,80,0.7) 0%, rgba(120,40,20,0.6) 30%, rgba(80,30,60,0.7) 60%, rgba(40,10,30,0.8) 100%)',
        }}
      />
      
      {/* GHOSTLY VEIL - ethereal mist overlay */}
      <div 
        className="absolute inset-0 animate-ghost-drift"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, rgba(200,200,255,${ghostOpacity}) 0%, transparent 40%),
                       radial-gradient(ellipse at 70% 60%, rgba(180,200,255,${ghostOpacity * 0.8}) 0%, transparent 35%),
                       radial-gradient(ellipse at 50% 80%, rgba(220,220,255,${ghostOpacity * 0.6}) 0%, transparent 30%)`,
          mixBlendMode: 'overlay',
        }}
      />
      
      {/* Ghost wisps floating */}
      <div className="absolute inset-0">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-ghost-float"
            style={{
              left: `${15 + i * 25}%`,
              top: `${20 + (i % 2) * 30}%`,
              width: '60px',
              height: '80px',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 70%)',
              borderRadius: '50% 50% 40% 40%',
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${6 + i}s`,
            }}
          />
        ))}
      </div>
      
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
          <path d="M35,60 L60,120 L55,125 L75,180" stroke="#FFE4B5" strokeWidth="2" fill="none" filter="url(#hellGlow)" />
        </svg>
      )}
      
      {/* Hellfire glow */}
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
        @keyframes ghost-drift { 0%, 100% { transform: translateX(0) translateY(0); } 25% { transform: translateX(10px) translateY(-5px); } 50% { transform: translateX(-5px) translateY(5px); } 75% { transform: translateX(5px) translateY(-3px); } }
        @keyframes ghost-float { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.15; } 50% { transform: translateY(-30px) translateX(15px) scale(1.1); opacity: 0.25; } }
        .animate-flash { animation: flash 0.1s ease-out; }
        .animate-hellfire { animation: hellfire 2s ease-in-out infinite; }
        .animate-mist-rise { animation: mist-rise 6s ease-in-out infinite; }
        .animate-ghost-drift { animation: ghost-drift 8s ease-in-out infinite; }
        .animate-ghost-float { animation: ghost-float 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// FRANKENSTEIN THEME - For 1v1 Page
// 3D TESLA COILS with REALISTIC LIGHTNING
// ============================================
export function FrankensteinOverlay() {
  const [leftArc, setLeftArc] = useState(false);
  const [rightArc, setRightArc] = useState(false);
  const [centerLightning, setCenterLightning] = useState(false);
  const [arcPaths, setArcPaths] = useState({ left: '', right: '', center: '' });
  
  // Generate realistic jagged lightning path
  const generateLightningPath = (startX: number, startY: number, endX: number, endY: number, segments: number = 8) => {
    let path = `M${startX},${startY}`;
    const dx = (endX - startX) / segments;
    const dy = (endY - startY) / segments;
    
    for (let i = 1; i < segments; i++) {
      const x = startX + dx * i + (Math.random() - 0.5) * 40;
      const y = startY + dy * i + (Math.random() - 0.5) * 20;
      path += ` L${x},${y}`;
    }
    path += ` L${endX},${endY}`;
    return path;
  };
  
  useEffect(() => {
    // Tesla coil arcs with realistic paths
    const arcInterval = setInterval(() => {
      const newPaths = {
        left: generateLightningPath(0, 75, 200, 75 + (Math.random() - 0.5) * 50, 10),
        right: generateLightningPath(250, 75, 50, 75 + (Math.random() - 0.5) * 50, 10),
        center: generateLightningPath(50, 0, 50, 400, 15),
      };
      setArcPaths(newPaths);
      
      const side = Math.random();
      if (side < 0.35) { setLeftArc(true); setTimeout(() => setLeftArc(false), 150 + Math.random() * 100); }
      else if (side < 0.7) { setRightArc(true); setTimeout(() => setRightArc(false), 150 + Math.random() * 100); }
      else { 
        setLeftArc(true); setRightArc(true); 
        setTimeout(() => { setLeftArc(false); setRightArc(false); }, 200 + Math.random() * 150);
      }
    }, 800 + Math.random() * 1500);
    
    // Center lightning
    const lightningInterval = setInterval(() => {
      setArcPaths(prev => ({
        ...prev,
        center: generateLightningPath(50, 0, 50 + (Math.random() - 0.5) * 30, 400, 18),
      }));
      setCenterLightning(true);
      setTimeout(() => setCenterLightning(false), 100);
      setTimeout(() => {
        setCenterLightning(true);
        setTimeout(() => setCenterLightning(false), 80);
      }, 120);
    }, 4000 + Math.random() * 4000);
    
    return () => { clearInterval(arcInterval); clearInterval(lightningInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* GREEN/PURPLE GRADIENT PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(10,50,20,0.8) 0%, rgba(50,15,70,0.75) 50%, rgba(20,70,35,0.8) 100%)',
        }}
      />
      
      {/* Dark laboratory ceiling */}
      <div 
        className="absolute top-0 left-0 right-0 h-1/3"
        style={{
          background: 'linear-gradient(180deg, rgba(5,5,15,0.7) 0%, transparent 100%)',
        }}
      />
      
      {/* Lightning flash */}
      {(leftArc || rightArc || centerLightning) && (
        <div 
          className="absolute inset-0"
          style={{ 
            background: centerLightning 
              ? 'rgba(150,255,200,0.25)' 
              : 'rgba(80,200,150,0.15)',
            mixBlendMode: 'screen'
          }} 
        />
      )}
      
      {/* CENTER LIGHTNING BOLT - Realistic with multiple branches */}
      {centerLightning && (
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-64" viewBox="0 0 100 400">
          <defs>
            <filter id="greenGlow3D">
              <feGaussianBlur stdDeviation="6" result="blur1"/>
              <feGaussianBlur stdDeviation="2" result="blur2"/>
              <feMerge>
                <feMergeNode in="blur1"/>
                <feMergeNode in="blur2"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF"/>
              <stop offset="30%" stopColor="#88FFCC"/>
              <stop offset="100%" stopColor="#00FF88"/>
            </linearGradient>
          </defs>
          {/* Main bolt */}
          <path d={arcPaths.center} stroke="url(#lightningGrad)" strokeWidth="6" fill="none" filter="url(#greenGlow3D)" strokeLinecap="round"/>
          {/* Core white */}
          <path d={arcPaths.center} stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.9"/>
          {/* Branches */}
          <path d={generateLightningPath(50, 100, 85, 160, 5)} stroke="#00FF88" strokeWidth="3" fill="none" filter="url(#greenGlow3D)"/>
          <path d={generateLightningPath(50, 180, 15, 250, 5)} stroke="#00FF88" strokeWidth="3" fill="none" filter="url(#greenGlow3D)"/>
          <path d={generateLightningPath(50, 280, 80, 340, 4)} stroke="#00FF88" strokeWidth="2" fill="none" filter="url(#greenGlow3D)"/>
        </svg>
      )}
      
      {/* LEFT 3D TESLA COIL */}
      <div className="absolute left-2 sm:left-6 top-20 bottom-20 w-16 sm:w-20">
        {/* Base platform - 3D effect */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-6">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-500 to-gray-700 rounded-sm transform perspective-100 rotateX-20" />
          <div className="absolute bottom-0 w-full h-2 bg-gray-800 rounded-sm" />
        </div>
        
        {/* Coil tower - 3D with copper rings */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-48">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded" />
          {/* Copper coil rings */}
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="absolute left-1/2 -translate-x-1/2 h-2 rounded-full"
              style={{
                width: '40px',
                bottom: `${i * 16 + 10}px`,
                background: 'linear-gradient(90deg, #8B4513 0%, #CD7F32 30%, #DAA520 50%, #CD7F32 70%, #8B4513 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,215,0,0.3)',
              }}
            />
          ))}
        </div>
        
        {/* Electrode sphere - 3D glowing */}
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full transition-all duration-75 ${leftArc ? 'scale-110' : 'scale-100'}`}
          style={{ 
            background: leftArc 
              ? 'radial-gradient(circle at 30% 30%, #FFFFFF 0%, #00FFCC 40%, #00AA88 100%)'
              : 'radial-gradient(circle at 30% 30%, #88CCBB 0%, #227766 50%, #114433 100%)',
            boxShadow: leftArc 
              ? '0 0 50px 20px rgba(0,255,200,0.9), 0 0 100px 40px rgba(0,255,200,0.5), inset 0 0 20px rgba(255,255,255,0.5)' 
              : '0 0 15px 5px rgba(0,200,150,0.3), inset 0 0 10px rgba(255,255,255,0.2)',
          }}
        />
        
        {/* Electric arc from left coil */}
        {leftArc && (
          <svg className="absolute top-6 left-12 w-72 h-32 overflow-visible" viewBox="0 0 250 100">
            <defs>
              <filter id="arcGlow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <path d={arcPaths.left} stroke="#00FFCC" strokeWidth="4" fill="none" filter="url(#arcGlow)" strokeLinecap="round"/>
            <path d={arcPaths.left} stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.8"/>
            {/* Secondary arcs */}
            <path d={generateLightningPath(0, 75, 120, 40, 6)} stroke="#00DDAA" strokeWidth="2" fill="none" filter="url(#arcGlow)" opacity="0.7"/>
          </svg>
        )}
      </div>
      
      {/* RIGHT 3D TESLA COIL */}
      <div className="absolute right-2 sm:right-6 top-20 bottom-20 w-16 sm:w-20">
        {/* Base platform */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-6">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-500 to-gray-700 rounded-sm" />
          <div className="absolute bottom-0 w-full h-2 bg-gray-800 rounded-sm" />
        </div>
        
        {/* Coil tower with copper rings */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-48">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded" />
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="absolute left-1/2 -translate-x-1/2 h-2 rounded-full"
              style={{
                width: '40px',
                bottom: `${i * 16 + 10}px`,
                background: 'linear-gradient(90deg, #8B4513 0%, #CD7F32 30%, #DAA520 50%, #CD7F32 70%, #8B4513 100%)',
                boxShadow: 'inset 0 1px 2px rgba(255,215,0,0.3)',
              }}
            />
          ))}
        </div>
        
        {/* Electrode sphere */}
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full transition-all duration-75 ${rightArc ? 'scale-110' : 'scale-100'}`}
          style={{ 
            background: rightArc 
              ? 'radial-gradient(circle at 30% 30%, #FFFFFF 0%, #CC88FF 40%, #8844AA 100%)'
              : 'radial-gradient(circle at 30% 30%, #AA88CC 0%, #553377 50%, #331155 100%)',
            boxShadow: rightArc 
              ? '0 0 50px 20px rgba(180,100,255,0.9), 0 0 100px 40px rgba(180,100,255,0.5), inset 0 0 20px rgba(255,255,255,0.5)' 
              : '0 0 15px 5px rgba(150,80,200,0.3), inset 0 0 10px rgba(255,255,255,0.2)',
          }}
        />
        
        {/* Electric arc from right coil */}
        {rightArc && (
          <svg className="absolute top-6 right-12 w-72 h-32 overflow-visible scale-x-[-1]" viewBox="0 0 250 100">
            <path d={arcPaths.right} stroke="#CC88FF" strokeWidth="4" fill="none" filter="url(#arcGlow)" strokeLinecap="round"/>
            <path d={arcPaths.right} stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.8"/>
            <path d={generateLightningPath(250, 75, 130, 110, 6)} stroke="#AA66DD" strokeWidth="2" fill="none" filter="url(#arcGlow)" opacity="0.7"/>
          </svg>
        )}
      </div>
      
      {/* Green toxic glow at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-36"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0,255,100,0.3) 0%, rgba(0,200,80,0.15) 40%, transparent 70%)',
        }}
      />
      
      {/* Purple energy glow at top */}
      <div 
        className="absolute top-0 left-0 right-0 h-28"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(150,50,200,0.25) 0%, transparent 60%)',
        }}
      />
      
      {/* Lab equipment shadows on sides */}
      <div className="absolute bottom-0 left-0 w-24 h-40 opacity-40">
        <div className="absolute bottom-0 left-4 w-16 h-24 bg-gradient-to-t from-gray-900 to-transparent rounded-t" />
        <div className="absolute bottom-0 left-8 w-8 h-32 bg-gradient-to-t from-gray-800 to-transparent rounded-t" />
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-40 opacity-40">
        <div className="absolute bottom-0 right-4 w-16 h-28 bg-gradient-to-t from-gray-900 to-transparent rounded-t" />
        <div className="absolute bottom-0 right-10 w-6 h-36 bg-gradient-to-t from-gray-800 to-transparent rounded-t" />
      </div>
    </div>
  );
}

// ============================================
// ZOMBIES THEME - For Winner Takes All Page
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
      
      {flicker && <div className="absolute inset-0 bg-purple-200/20" style={{ mixBlendMode: 'screen' }} />}
      
      {/* Full moon */}
      <div className="absolute top-8 right-12">
        <div 
          className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200"
          style={{ boxShadow: '0 0 60px 20px rgba(255,255,200,0.3), 0 0 100px 40px rgba(150,100,200,0.2)' }}
        />
      </div>
      
      {/* Green fog layers */}
      <div className="absolute bottom-0 left-0 right-0 h-48 animate-fog-drift"
        style={{ background: 'linear-gradient(0deg, rgba(100,150,80,0.4) 0%, rgba(80,120,60,0.2) 50%, transparent 100%)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 animate-fog-drift-slow"
        style={{ background: 'linear-gradient(0deg, rgba(120,100,150,0.3) 0%, transparent 80%)' }}
      />
      
      {/* Tombstones */}
      <div className="absolute bottom-16 left-12 opacity-50">
        <div className="w-12 h-20 bg-gray-800 rounded-t-lg" />
        <div className="absolute -inset-2 bg-purple-500/20 rounded-lg blur-sm" />
      </div>
      <div className="absolute bottom-16 right-12 opacity-50">
        <div className="w-14 h-24 bg-gray-700 rounded-t-lg" />
        <div className="absolute -inset-2 bg-purple-500/20 rounded-lg blur-sm" />
      </div>
      
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(40,20,60,0.5) 100%)' }} />
      
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
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(30,15,60,0.8) 0%, rgba(20,20,50,0.7) 40%, rgba(40,25,70,0.8) 70%, rgba(15,25,45,0.85) 100%)' }} />
      
      {ghostLight && <div className="absolute inset-0 bg-blue-300/10" style={{ mixBlendMode: 'screen' }} />}
      
      <div className="absolute bottom-0 left-0 right-0 h-36">
        <div className="absolute inset-0 animate-water" style={{ background: 'linear-gradient(0deg, rgba(30,50,100,0.7) 0%, rgba(40,60,120,0.4) 50%, transparent 100%)' }} />
        <div className="absolute inset-0 animate-water-alt" style={{ background: 'linear-gradient(0deg, rgba(80,40,120,0.3) 0%, transparent 60%)' }} />
      </div>
      
      <div className="absolute bottom-24 left-1/4 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-600/60 to-yellow-900/60 animate-float-coin" style={{ boxShadow: '0 0 20px 5px rgba(150,100,50,0.4)' }} />
      <div className="absolute bottom-32 right-1/3 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-700/50 to-yellow-900/50 animate-float-coin-alt" style={{ boxShadow: '0 0 15px 3px rgba(150,100,50,0.3)', animationDelay: '2s' }} />
      
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(15,10,30,0.7) 100%)' }} />
      
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
// GREEN ACID UNDERGLOW RISING
// ============================================
export function HauntedOverlay() {
  const [acidLevel, setAcidLevel] = useState(0);
  const [bubbles, setBubbles] = useState<{x: number; delay: number}[]>([]);
  
  useEffect(() => {
    // Animate acid level
    const acidInterval = setInterval(() => {
      setAcidLevel(prev => (prev + 1) % 100);
    }, 100);
    
    // Generate bubbles
    const newBubbles = Array.from({ length: 8 }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 3,
    }));
    setBubbles(newBubbles);
    
    return () => clearInterval(acidInterval);
  }, []);
  
  const acidHeight = 20 + Math.sin(acidLevel * 0.05) * 8;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ORANGE/PURPLE HALLOWEEN GRADIENT */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(60,30,80,0.65) 0%, rgba(100,50,30,0.5) 40%, rgba(70,40,70,0.6) 70%, rgba(30,50,30,0.75) 100%)',
        }}
      />
      
      {/* GREEN ACID UNDERGLOW - Rising from bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 transition-all duration-500"
        style={{
          height: `${acidHeight}%`,
          background: `linear-gradient(0deg, 
            rgba(0,255,50,0.5) 0%, 
            rgba(50,255,100,0.35) 20%,
            rgba(100,255,150,0.2) 50%,
            rgba(150,255,180,0.1) 70%,
            transparent 100%)`,
        }}
      >
        {/* Acid surface glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-4 animate-acid-pulse"
          style={{
            background: 'linear-gradient(0deg, transparent 0%, rgba(100,255,100,0.6) 50%, rgba(200,255,200,0.3) 100%)',
            boxShadow: '0 -10px 40px 10px rgba(0,255,100,0.4)',
          }}
        />
        
        {/* Rising bubbles */}
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bubble-rise"
            style={{
              left: `${bubble.x}%`,
              bottom: '5%',
              width: `${6 + (i % 3) * 4}px`,
              height: `${6 + (i % 3) * 4}px`,
              background: 'radial-gradient(circle at 30% 30%, rgba(200,255,200,0.8) 0%, rgba(100,255,100,0.4) 100%)',
              animationDelay: `${bubble.delay}s`,
            }}
          />
        ))}
      </div>
      
      {/* Spider webs */}
      <svg className="absolute top-0 left-0 w-56 h-56 opacity-25" viewBox="0 0 100 100">
        <path d="M0,0 Q50,25 100,0" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 Q25,50 0,100" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L75,75" stroke="#fff" strokeWidth="0.3" fill="none" />
        <ellipse cx="25" cy="25" rx="20" ry="15" stroke="#fff" strokeWidth="0.2" fill="none" transform="rotate(-45 25 25)" />
      </svg>
      <svg className="absolute top-0 right-0 w-56 h-56 opacity-25 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q50,25 100,0" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 Q25,50 0,100" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L75,75" stroke="#fff" strokeWidth="0.3" fill="none" />
      </svg>
      
      {/* Green underglow on corners */}
      <div className="absolute bottom-0 left-0 w-64 h-64" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(0,200,50,0.2) 0%, transparent 50%)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(0,200,50,0.2) 0%, transparent 50%)' }} />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(30,15,40,0.5) 100%)' }} />
      
      <style jsx>{`
        @keyframes acid-pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes bubble-rise { 0% { transform: translateY(0) scale(1); opacity: 0.8; } 100% { transform: translateY(-400px) scale(0.5); opacity: 0; } }
        .animate-acid-pulse { animation: acid-pulse 2s ease-in-out infinite; }
        .animate-bubble-rise { animation: bubble-rise 4s ease-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// CARNIVAL THEME - For Games Page
// MORE CARNIVAL + ORANGE + HAUNTED
// ============================================
export function CarnivalOverlay() {
  const [spotlightAngle, setSpotlightAngle] = useState(0);
  const [lightFlicker, setLightFlicker] = useState([true, true, true, true, true]);
  const [ticketFloat, setTicketFloat] = useState(0);
  
  useEffect(() => {
    const spotInterval = setInterval(() => {
      setSpotlightAngle(prev => (prev + 1) % 360);
      setTicketFloat(prev => (prev + 1) % 100);
    }, 50);
    
    const flickerInterval = setInterval(() => {
      setLightFlicker([
        Math.random() > 0.1,
        Math.random() > 0.15,
        Math.random() > 0.1,
        Math.random() > 0.12,
        Math.random() > 0.1,
      ]);
    }, 150);
    
    return () => { clearInterval(spotInterval); clearInterval(flickerInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DARK PURPLE/ORANGE CIRCUS GRADIENT - More orange */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(50,20,60,0.7) 0%, rgba(120,50,30,0.6) 30%, rgba(80,35,50,0.65) 60%, rgba(30,10,35,0.8) 100%)',
        }}
      />
      
      {/* Circus tent stripes - More prominent */}
      <div className="absolute top-0 left-0 right-0 h-24 overflow-hidden opacity-35">
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(90deg, rgba(200,60,30,0.7) 0px, rgba(200,60,30,0.7) 40px, rgba(50,20,40,0.5) 40px, rgba(50,20,40,0.5) 80px)',
          }}
        />
        {/* Tent peak */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '100px solid transparent',
            borderRight: '100px solid transparent',
            borderBottom: '60px solid rgba(200,60,30,0.4)',
          }}
        />
      </div>
      
      {/* Carnival banner with lights */}
      <div className="absolute top-24 left-0 right-0 h-12 flex justify-center items-center">
        <div 
          className="px-8 py-2 rounded-lg opacity-40"
          style={{
            background: 'linear-gradient(180deg, rgba(150,50,0,0.6) 0%, rgba(100,30,0,0.8) 100%)',
            border: '2px solid rgba(255,200,100,0.3)',
          }}
        >
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-75 ${lightFlicker[i] ? 'bg-orange-400' : 'bg-orange-700'}`}
                style={{ boxShadow: lightFlicker[i] ? '0 0 10px 3px rgba(255,150,0,0.8)' : 'none' }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Swinging spotlight - More prominent */}
      <div 
        className="absolute top-0 left-1/2 w-56 h-full opacity-20"
        style={{
          background: 'linear-gradient(180deg, rgba(255,200,100,0.7) 0%, rgba(255,150,50,0.3) 30%, transparent 60%)',
          transform: `translateX(-50%) rotate(${Math.sin(spotlightAngle * Math.PI / 180) * 25}deg)`,
          transformOrigin: 'top center',
        }}
      />
      {/* Second spotlight */}
      <div 
        className="absolute top-0 left-1/3 w-40 h-full opacity-15"
        style={{
          background: 'linear-gradient(180deg, rgba(255,100,100,0.6) 0%, rgba(255,50,50,0.2) 25%, transparent 50%)',
          transform: `translateX(-50%) rotate(${Math.sin((spotlightAngle + 90) * Math.PI / 180) * 20}deg)`,
          transformOrigin: 'top center',
        }}
      />
      
      {/* Floating carnival tickets */}
      <div 
        className="absolute w-12 h-6 rounded opacity-40"
        style={{
          left: '20%',
          top: `${30 + Math.sin(ticketFloat * 0.1) * 10}%`,
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          transform: `rotate(${Math.sin(ticketFloat * 0.05) * 15}deg)`,
          boxShadow: '0 0 15px rgba(255,200,0,0.5)',
        }}
      />
      <div 
        className="absolute w-10 h-5 rounded opacity-35"
        style={{
          right: '25%',
          top: `${45 + Math.sin((ticketFloat + 50) * 0.1) * 8}%`,
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          transform: `rotate(${Math.sin((ticketFloat + 50) * 0.05) * -12}deg)`,
          boxShadow: '0 0 15px rgba(255,200,0,0.5)',
        }}
      />
      
      {/* Creepy clown face silhouette in corner */}
      <div className="absolute bottom-16 left-8 opacity-20">
        <div className="w-20 h-24 relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-700 to-gray-900" />
          <div className="absolute top-6 left-3 w-4 h-4 rounded-full bg-black" />
          <div className="absolute top-6 right-3 w-4 h-4 rounded-full bg-black" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-10 h-4 rounded-full bg-red-900/50" />
        </div>
      </div>
      
      {/* Orange corner glows */}
      <div className="absolute bottom-0 left-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(255,120,0,0.25) 0%, transparent 50%)' }} />
      <div className="absolute bottom-0 right-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(255,100,0,0.25) 0%, transparent 50%)' }} />
      
      {/* Heavy vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(20,10,30,0.7) 100%)' }} />
    </div>
  );
}

// ============================================
// SPIDER THEME - For Home Page
// MORE HAUNTED + SPIDER THEMED
// ============================================
export function SpiderOverlay() {
  const [spiderPos, setSpiderPos] = useState({ x: 50, y: 20 });
  const [webShimmer, setWebShimmer] = useState(0);
  
  useEffect(() => {
    // Spider movement
    const spiderInterval = setInterval(() => {
      setSpiderPos(prev => ({
        x: prev.x + (Math.random() - 0.5) * 5,
        y: 15 + Math.random() * 20,
      }));
    }, 2000);
    
    // Web shimmer
    const shimmerInterval = setInterval(() => {
      setWebShimmer(prev => (prev + 1) % 100);
    }, 100);
    
    return () => { clearInterval(spiderInterval); clearInterval(shimmerInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* PURPLE/DARK GRADIENT */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(40,20,60,0.75) 0%, rgba(60,30,80,0.6) 40%, rgba(50,25,70,0.7) 70%, rgba(30,15,45,0.8) 100%)',
        }}
      />
      
      {/* LARGE SPIDER WEB - Center */}
      <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="webShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset={`${webShimmer}%`} stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
        </defs>
        {/* Radial threads */}
        {[...Array(16)].map((_, i) => (
          <line
            key={i}
            x1="200" y1="200"
            x2={200 + 200 * Math.cos(i * Math.PI / 8)}
            y2={200 + 200 * Math.sin(i * Math.PI / 8)}
            stroke="url(#webShine)"
            strokeWidth="0.8"
          />
        ))}
        {/* Spiral threads */}
        {[...Array(8)].map((_, i) => (
          <circle
            key={i}
            cx="200" cy="200"
            r={25 + i * 25}
            stroke="url(#webShine)"
            strokeWidth="0.5"
            fill="none"
          />
        ))}
      </svg>
      
      {/* Corner spider webs */}
      <svg className="absolute top-0 left-0 w-72 h-72 opacity-30" viewBox="0 0 100 100">
        <path d="M0,0 Q50,20 100,0" stroke="#fff" strokeWidth="0.5" fill="none" />
        <path d="M0,0 Q20,50 0,100" stroke="#fff" strokeWidth="0.5" fill="none" />
        <path d="M0,0 L80,80" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L100,40" stroke="#fff" strokeWidth="0.3" fill="none" />
        <path d="M0,0 L40,100" stroke="#fff" strokeWidth="0.3" fill="none" />
        <ellipse cx="20" cy="20" rx="15" ry="10" stroke="#fff" strokeWidth="0.3" fill="none" transform="rotate(-45 20 20)" />
        <ellipse cx="35" cy="35" rx="28" ry="20" stroke="#fff" strokeWidth="0.25" fill="none" transform="rotate(-45 35 35)" />
        <ellipse cx="50" cy="50" rx="42" ry="30" stroke="#fff" strokeWidth="0.2" fill="none" transform="rotate(-45 50 50)" />
      </svg>
      <svg className="absolute top-0 right-0 w-72 h-72 opacity-30 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q50,20 100,0" stroke="#fff" strokeWidth="0.5" fill="none" />
        <path d="M0,0 Q20,50 0,100" stroke="#fff" strokeWidth="0.5" fill="none" />
        <path d="M0,0 L80,80" stroke="#fff" strokeWidth="0.4" fill="none" />
        <ellipse cx="25" cy="25" rx="20" ry="14" stroke="#fff" strokeWidth="0.25" fill="none" transform="rotate(-45 25 25)" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-56 h-56 opacity-25 scale-y-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q50,25 100,0" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 Q25,50 0,100" stroke="#fff" strokeWidth="0.4" fill="none" />
        <path d="M0,0 L70,70" stroke="#fff" strokeWidth="0.3" fill="none" />
      </svg>
      
      {/* Animated spider */}
      <div 
        className="absolute transition-all duration-1000 ease-in-out"
        style={{ left: `${spiderPos.x}%`, top: `${spiderPos.y}%`, transform: 'translate(-50%, -50%)' }}
      >
        {/* Spider thread */}
        <div className="absolute left-1/2 bottom-full w-px h-32 bg-gradient-to-b from-white/5 to-white/20" />
        {/* Spider body */}
        <div className="relative w-8 h-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 bg-gray-900 rounded-full" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-7 bg-gray-900 rounded-full" />
          {/* Legs */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute top-3 left-1/2 w-6 h-px bg-gray-800 origin-left"
              style={{
                transform: `rotate(${i < 4 ? -20 - i * 25 : 20 + (i - 4) * 25}deg)`,
              }}
            />
          ))}
          {/* Eyes */}
          <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-red-600 rounded-full animate-pulse" />
          <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-red-600 rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* Small spiders in corners */}
      <div className="absolute top-20 left-16 w-4 h-4 opacity-40">
        <div className="w-2 h-2 bg-gray-800 rounded-full" />
        <div className="w-3 h-3 bg-gray-800 rounded-full -mt-0.5" />
      </div>
      <div className="absolute top-32 right-24 w-3 h-3 opacity-30">
        <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
        <div className="w-2 h-2 bg-gray-800 rounded-full -mt-0.5" />
      </div>
      
      {/* Purple mist */}
      <div className="absolute bottom-0 left-0 right-0 h-48 animate-mist"
        style={{ background: 'linear-gradient(0deg, rgba(80,40,120,0.35) 0%, rgba(60,30,100,0.15) 50%, transparent 100%)' }}
      />
      
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(20,10,35,0.6) 100%)' }} />
      
      <style jsx>{`
        @keyframes mist { 0%, 100% { opacity: 0.8; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-10px); } }
        .animate-mist { animation: mist 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// MONEY HORROR THEME - For Buy Tokens Page
// GREEN/PURPLE with DARK HORROR FLARE
// ============================================
export function MoneyHorrorOverlay() {
  const [floatingBills, setFloatingBills] = useState<{x: number; y: number; rot: number; delay: number}[]>([]);
  const [bloodDrip, setBloodDrip] = useState(0);
  const [eyeGlow, setEyeGlow] = useState(false);
  
  useEffect(() => {
    // Generate floating money
    const bills = Array.from({ length: 6 }, () => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
      rot: Math.random() * 40 - 20,
      delay: Math.random() * 5,
    }));
    setFloatingBills(bills);
    
    // Blood drip animation
    const dripInterval = setInterval(() => {
      setBloodDrip(prev => (prev + 1) % 100);
    }, 100);
    
    // Evil eye glow
    const eyeInterval = setInterval(() => {
      setEyeGlow(true);
      setTimeout(() => setEyeGlow(false), 1500);
    }, 4000);
    
    return () => { clearInterval(dripInterval); clearInterval(eyeInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* GREEN/PURPLE HORROR GRADIENT */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(20,50,30,0.8) 0%, rgba(40,20,60,0.75) 30%, rgba(30,60,40,0.7) 60%, rgba(50,30,70,0.85) 100%)',
        }}
      />
      
      {/* Dark horror overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, transparent 20%, rgba(10,5,15,0.5) 70%, rgba(5,0,10,0.7) 100%)',
        }}
      />
      
      {/* Blood dripping from top */}
      <div className="absolute top-0 left-0 right-0 h-20 flex justify-around">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="relative"
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            <div 
              className="w-2 bg-gradient-to-b from-red-900 via-red-700 to-transparent rounded-b-full animate-drip"
              style={{
                height: `${20 + (bloodDrip + i * 10) % 40}px`,
                opacity: 0.4 + (i % 3) * 0.1,
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Floating cursed money bills */}
      {floatingBills.map((bill, i) => (
        <div
          key={i}
          className="absolute w-16 h-8 animate-cursed-float"
          style={{
            left: `${bill.x}%`,
            top: `${bill.y}%`,
            transform: `rotate(${bill.rot}deg)`,
            animationDelay: `${bill.delay}s`,
          }}
        >
          <div 
            className="w-full h-full rounded relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(50,100,50,0.6) 0%, rgba(30,80,30,0.8) 100%)',
              border: '1px solid rgba(100,200,100,0.3)',
              boxShadow: '0 0 15px rgba(0,255,0,0.2)',
            }}
          >
            {/* Dollar sign */}
            <div className="absolute inset-0 flex items-center justify-center text-green-300/60 text-lg font-bold">$</div>
            {/* Blood stain */}
            <div 
              className="absolute rounded-full bg-red-800/50"
              style={{
                width: '12px',
                height: '8px',
                right: '3px',
                top: '2px',
              }}
            />
          </div>
        </div>
      ))}
      
      {/* Evil eye watching */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-24 h-16 opacity-30">
        <div 
          className={`w-full h-full rounded-full transition-all duration-500 ${eyeGlow ? 'scale-110' : 'scale-100'}`}
          style={{
            background: 'radial-gradient(ellipse, rgba(20,0,0,0.9) 0%, rgba(40,0,0,0.7) 40%, transparent 70%)',
            border: '2px solid rgba(100,0,0,0.5)',
          }}
        >
          {/* Iris */}
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full transition-all duration-300 ${eyeGlow ? 'bg-green-500' : 'bg-green-900'}`}
            style={{
              boxShadow: eyeGlow ? '0 0 30px 10px rgba(0,255,0,0.6)' : 'none',
            }}
          >
            {/* Pupil */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-black rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Haunted coin stacks silhouette */}
      <div className="absolute bottom-8 left-8 opacity-30">
        <div className="flex gap-2">
          <div className="w-8 h-16 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
          <div className="w-8 h-20 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
          <div className="w-8 h-12 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        </div>
        <div className="absolute -inset-2 bg-green-500/10 blur-md rounded" />
      </div>
      <div className="absolute bottom-8 right-8 opacity-30">
        <div className="flex gap-2">
          <div className="w-8 h-14 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
          <div className="w-8 h-18 rounded-t bg-gradient-to-t from-yellow-900 to-yellow-800" />
        </div>
        <div className="absolute -inset-2 bg-purple-500/10 blur-md rounded" />
      </div>
      
      {/* Green poison mist rising */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 animate-poison-rise"
        style={{
          background: 'linear-gradient(0deg, rgba(0,100,30,0.4) 0%, rgba(50,150,80,0.2) 40%, transparent 100%)',
        }}
      />
      
      {/* Purple horror corners */}
      <div className="absolute top-0 left-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 0% 0%, rgba(100,0,150,0.25) 0%, transparent 50%)' }} />
      <div className="absolute top-0 right-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(100,0,150,0.25) 0%, transparent 50%)' }} />
      
      {/* Very dark vignette for horror */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 15%, rgba(5,0,10,0.7) 100%)' }} />
      
      <style jsx>{`
        @keyframes drip { 0%, 100% { height: 20px; } 50% { height: 50px; } }
        @keyframes cursed-float { 0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); opacity: 0.5; } 50% { transform: translateY(-15px) rotate(calc(var(--rot, 0deg) + 5deg)); opacity: 0.7; } }
        @keyframes poison-rise { 0%, 100% { opacity: 0.6; transform: translateY(0); } 50% { opacity: 0.9; transform: translateY(-15px); } }
        .animate-drip { animation: drip 3s ease-in-out infinite; }
        .animate-cursed-float { animation: cursed-float 6s ease-in-out infinite; }
        .animate-poison-rise { animation: poison-rise 5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
