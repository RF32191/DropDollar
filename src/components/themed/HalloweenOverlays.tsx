'use client';

import React, { useEffect, useState, useRef } from 'react';

// ============================================
// HELL THEME - For Hot Sell Page
// Ominous lightning, hellfire sky, dark red atmosphere
// ============================================
export function HellOverlay() {
  const [lightning, setLightning] = useState(false);
  const [lightningPosition, setLightningPosition] = useState({ x: 50, branch: 0 });
  
  useEffect(() => {
    // Random lightning strikes
    const triggerLightning = () => {
      setLightningPosition({ 
        x: 20 + Math.random() * 60, 
        branch: Math.floor(Math.random() * 3) 
      });
      setLightning(true);
      
      // Double flash effect
      setTimeout(() => setLightning(false), 100);
      setTimeout(() => {
        setLightning(true);
        setTimeout(() => setLightning(false), 50);
      }, 150);
    };
    
    const interval = setInterval(triggerLightning, 4000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Hellish gradient sky */}
      <div 
        className="absolute inset-0 transition-opacity duration-100"
        style={{
          background: lightning 
            ? 'linear-gradient(180deg, rgba(255,100,50,0.4) 0%, rgba(139,0,0,0.5) 50%, rgba(20,0,0,0.7) 100%)'
            : 'linear-gradient(180deg, rgba(80,20,20,0.3) 0%, rgba(40,0,0,0.4) 50%, rgba(10,0,0,0.5) 100%)',
        }}
      />
      
      {/* Lightning bolt SVG */}
      {lightning && (
        <svg 
          className="absolute top-0 h-full opacity-90 animate-flash"
          style={{ left: `${lightningPosition.x}%`, width: '200px', transform: 'translateX(-50%)' }}
          viewBox="0 0 100 400"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Main bolt */}
          <path 
            d="M50,0 L45,80 L60,85 L40,180 L55,185 L30,300 L50,305 L25,400" 
            stroke="#fff" 
            strokeWidth="3" 
            fill="none"
            filter="url(#glow)"
          />
          {/* Branch 1 */}
          {lightningPosition.branch >= 1 && (
            <path 
              d="M45,80 L70,140 L65,145 L80,200" 
              stroke="#fff" 
              strokeWidth="2" 
              fill="none"
              filter="url(#glow)"
            />
          )}
          {/* Branch 2 */}
          {lightningPosition.branch >= 2 && (
            <path 
              d="M40,180 L20,240 L25,245 L10,300" 
              stroke="#fff" 
              strokeWidth="2" 
              fill="none"
              filter="url(#glow)"
            />
          )}
        </svg>
      )}
      
      {/* Bottom hellfire glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(0deg, rgba(255,50,0,0.25) 0%, rgba(200,50,0,0.1) 50%, transparent 100%)',
        }}
      />
      
      {/* Ambient red pulse */}
      <div 
        className="absolute inset-0 animate-pulse-slow"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(180,0,0,0.15) 0%, transparent 60%)',
        }}
      />
      
      {/* Smoke wisps at bottom - CSS only, no JS particles */}
      <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden opacity-30">
        <div className="absolute bottom-0 left-1/4 w-64 h-32 bg-gradient-radial from-gray-800/50 to-transparent rounded-full animate-smoke-1" />
        <div className="absolute bottom-0 left-1/2 w-48 h-24 bg-gradient-radial from-gray-700/40 to-transparent rounded-full animate-smoke-2" />
        <div className="absolute bottom-0 right-1/4 w-56 h-28 bg-gradient-radial from-gray-800/50 to-transparent rounded-full animate-smoke-3" />
      </div>
      
      <style jsx>{`
        @keyframes flash { 0%, 100% { opacity: 0; } 10% { opacity: 1; } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes smoke-1 { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3; } 50% { transform: translateY(-60px) translateX(30px) scale(1.3); opacity: 0.1; } }
        @keyframes smoke-2 { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.4; } 50% { transform: translateY(-80px) translateX(-20px) scale(1.4); opacity: 0.1; } }
        @keyframes smoke-3 { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3; } 50% { transform: translateY(-50px) translateX(-40px) scale(1.2); opacity: 0.1; } }
        .animate-flash { animation: flash 0.15s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-smoke-1 { animation: smoke-1 8s ease-in-out infinite; }
        .animate-smoke-2 { animation: smoke-2 10s ease-in-out infinite 2s; }
        .animate-smoke-3 { animation: smoke-3 9s ease-in-out infinite 4s; }
      `}</style>
    </div>
  );
}

// ============================================
// FRANKENSTEIN THEME - For 1v1 Page
// Electric lab, green toxic glow, Tesla coil arcs
// ============================================
export function FrankensteinOverlay() {
  const [arcActive, setArcActive] = useState(false);
  const [arcSide, setArcSide] = useState<'left' | 'right' | 'both'>('left');
  
  useEffect(() => {
    const triggerArc = () => {
      const sides: ('left' | 'right' | 'both')[] = ['left', 'right', 'both'];
      setArcSide(sides[Math.floor(Math.random() * 3)]);
      setArcActive(true);
      setTimeout(() => setArcActive(false), 200 + Math.random() * 300);
    };
    
    const interval = setInterval(triggerArc, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark lab atmosphere */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,20,15,0.6) 0%, rgba(0,30,20,0.4) 50%, rgba(5,15,10,0.5) 100%)',
        }}
      />
      
      {/* Green toxic glow from bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0,255,100,0.2) 0%, rgba(0,200,50,0.1) 40%, transparent 70%)',
        }}
      />
      
      {/* Left Tesla coil */}
      <div className="absolute left-4 top-20 bottom-20 w-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-full bg-gradient-to-b from-gray-600 via-gray-500 to-gray-600 rounded" />
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full transition-all duration-100 ${arcActive && (arcSide === 'left' || arcSide === 'both') ? 'bg-cyan-400 shadow-lg shadow-cyan-400/80' : 'bg-cyan-600/50'}`}
        />
        {/* Electric arc from left */}
        {arcActive && (arcSide === 'left' || arcSide === 'both') && (
          <svg className="absolute top-3 left-6 w-48 h-32 opacity-80" viewBox="0 0 200 100">
            <path 
              d="M0,50 Q30,30 60,50 T120,50 T180,50" 
              stroke="#00ffff" 
              strokeWidth="2" 
              fill="none"
              className="animate-arc-jitter"
            />
          </svg>
        )}
      </div>
      
      {/* Right Tesla coil */}
      <div className="absolute right-4 top-20 bottom-20 w-8">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-4 h-full bg-gradient-to-b from-gray-600 via-gray-500 to-gray-600 rounded" />
        <div 
          className={`absolute top-0 right-1/2 translate-x-1/2 w-6 h-6 rounded-full transition-all duration-100 ${arcActive && (arcSide === 'right' || arcSide === 'both') ? 'bg-cyan-400 shadow-lg shadow-cyan-400/80' : 'bg-cyan-600/50'}`}
        />
        {/* Electric arc from right */}
        {arcActive && (arcSide === 'right' || arcSide === 'both') && (
          <svg className="absolute top-3 right-6 w-48 h-32 opacity-80 scale-x-[-1]" viewBox="0 0 200 100">
            <path 
              d="M0,50 Q30,70 60,50 T120,50 T180,50" 
              stroke="#00ffff" 
              strokeWidth="2" 
              fill="none"
              className="animate-arc-jitter"
            />
          </svg>
        )}
      </div>
      
      {/* Screen flash on arc */}
      {arcActive && (
        <div 
          className="absolute inset-0 bg-cyan-500/10 animate-flash"
          style={{ mixBlendMode: 'screen' }}
        />
      )}
      
      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes arc-jitter { 
          0%, 100% { transform: translateY(0); } 
          25% { transform: translateY(-3px); } 
          50% { transform: translateY(2px); } 
          75% { transform: translateY(-2px); } 
        }
        @keyframes flash { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        .animate-arc-jitter { animation: arc-jitter 0.1s linear infinite; }
        .animate-flash { animation: flash 0.2s ease-out; }
      `}</style>
    </div>
  );
}

// ============================================
// ZOMBIES THEME - For Winner Takes All Page
// Eerie fog, decay, moonlit graveyard atmosphere
// ============================================
export function ZombiesOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Moonlit night sky */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(20,25,40,0.7) 0%, rgba(30,35,50,0.5) 40%, rgba(40,50,60,0.4) 100%)',
        }}
      />
      
      {/* Moon with glow */}
      <div className="absolute top-8 right-12">
        <div 
          className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 shadow-2xl"
          style={{
            boxShadow: '0 0 60px 20px rgba(255,255,200,0.3), 0 0 100px 40px rgba(255,255,150,0.1)',
          }}
        />
        {/* Moon craters - subtle */}
        <div className="absolute top-3 left-4 w-3 h-3 rounded-full bg-yellow-300/30" />
        <div className="absolute top-8 left-8 w-2 h-2 rounded-full bg-yellow-300/20" />
      </div>
      
      {/* Ground fog - layered CSS gradients */}
      <div className="absolute bottom-0 left-0 right-0 h-64">
        <div 
          className="absolute inset-0 animate-fog-1"
          style={{
            background: 'linear-gradient(0deg, rgba(180,190,200,0.4) 0%, rgba(150,160,170,0.2) 40%, transparent 80%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-fog-2"
          style={{
            background: 'linear-gradient(0deg, rgba(160,170,180,0.3) 0%, rgba(140,150,160,0.15) 50%, transparent 90%)',
          }}
        />
      </div>
      
      {/* Tombstone silhouettes */}
      <div className="absolute bottom-12 left-8 opacity-40">
        <div className="w-10 h-16 bg-gray-800 rounded-t-lg" />
      </div>
      <div className="absolute bottom-12 left-24 opacity-30">
        <div className="w-8 h-12 bg-gray-800 rounded-t-lg" />
        <div className="w-12 h-3 bg-gray-800 -mt-1 -ml-2 rounded-sm" />
      </div>
      <div className="absolute bottom-12 right-8 opacity-40">
        <div className="w-12 h-20 bg-gray-800 rounded-t-full" />
      </div>
      <div className="absolute bottom-12 right-28 opacity-35">
        <div className="w-10 h-14 bg-gray-800 rounded-t-lg" />
      </div>
      
      {/* Dead tree silhouette */}
      <div className="absolute bottom-12 left-1/3 opacity-25">
        <div className="w-4 h-48 bg-gray-900" />
        <div className="absolute top-8 left-4 w-24 h-2 bg-gray-900 -rotate-12" />
        <div className="absolute top-16 left-4 w-16 h-2 bg-gray-900 rotate-6" />
        <div className="absolute top-4 -left-16 w-20 h-2 bg-gray-900 rotate-12" />
      </div>
      
      {/* Green decay glow at ground level */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background: 'linear-gradient(0deg, rgba(100,150,50,0.15) 0%, transparent 100%)',
        }}
      />
      
      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes fog-1 { 0%, 100% { transform: translateX(0); opacity: 0.4; } 50% { transform: translateX(30px); opacity: 0.5; } }
        @keyframes fog-2 { 0%, 100% { transform: translateX(0); opacity: 0.3; } 50% { transform: translateX(-40px); opacity: 0.4; } }
        .animate-fog-1 { animation: fog-1 12s ease-in-out infinite; }
        .animate-fog-2 { animation: fog-2 15s ease-in-out infinite 3s; }
      `}</style>
    </div>
  );
}

// ============================================
// STYX THEME - For Coin Play Page
// Greek underworld, dark waters, ethereal coins
// ============================================
export function StyxOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Deep underworld gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,20,50,0.6) 0%, rgba(20,15,40,0.5) 40%, rgba(10,20,40,0.6) 100%)',
        }}
      />
      
      {/* River Styx at bottom - dark waters */}
      <div className="absolute bottom-0 left-0 right-0 h-40">
        <div 
          className="absolute inset-0 animate-water-shimmer"
          style={{
            background: 'linear-gradient(0deg, rgba(20,40,80,0.6) 0%, rgba(30,50,100,0.4) 40%, transparent 100%)',
          }}
        />
        {/* Water surface reflection */}
        <div 
          className="absolute top-0 left-0 right-0 h-2 opacity-30 animate-water-line"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(100,150,200,0.5) 25%, transparent 50%, rgba(100,150,200,0.3) 75%, transparent 100%)',
          }}
        />
      </div>
      
      {/* Floating ethereal coins - few, slow, subtle */}
      <div className="absolute bottom-20 left-1/4 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 opacity-40 animate-float-coin-1 shadow-lg shadow-yellow-900/50" />
      <div className="absolute bottom-28 right-1/3 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-700 to-yellow-900 opacity-30 animate-float-coin-2 shadow-lg shadow-yellow-900/50" />
      <div className="absolute bottom-16 left-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 opacity-35 animate-float-coin-3 shadow-lg shadow-yellow-900/50" />
      
      {/* Greek column silhouettes */}
      <div className="absolute bottom-0 left-4 w-8 h-56 opacity-20">
        <div className="w-full h-4 bg-gray-600 rounded" />
        <div className="w-6 h-48 bg-gray-700 mx-auto" />
        <div className="w-full h-4 bg-gray-600 rounded" />
      </div>
      <div className="absolute bottom-0 right-4 w-8 h-56 opacity-20">
        <div className="w-full h-4 bg-gray-600 rounded" />
        <div className="w-6 h-48 bg-gray-700 mx-auto" />
        <div className="w-full h-4 bg-gray-600 rounded" />
      </div>
      
      {/* Purple mist overlay */}
      <div 
        className="absolute inset-0 animate-pulse-mist"
        style={{
          background: 'radial-gradient(ellipse at 50% 80%, rgba(100,50,150,0.1) 0%, transparent 50%)',
        }}
      />
      
      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(10,5,20,0.6) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes water-shimmer { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.8; } }
        @keyframes water-line { 0%, 100% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes float-coin-1 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(180deg); } }
        @keyframes float-coin-2 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(-180deg); } }
        @keyframes float-coin-3 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(180deg); } }
        @keyframes pulse-mist { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .animate-water-shimmer { animation: water-shimmer 4s ease-in-out infinite; }
        .animate-water-line { animation: water-line 8s linear infinite; }
        .animate-float-coin-1 { animation: float-coin-1 6s ease-in-out infinite; }
        .animate-float-coin-2 { animation: float-coin-2 8s ease-in-out infinite 2s; }
        .animate-float-coin-3 { animation: float-coin-3 7s ease-in-out infinite 4s; }
        .animate-pulse-mist { animation: pulse-mist 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// HAUNTED THEME - For Dashboard
// Subtle creepy atmosphere, spider webs, shadows
// ============================================
export function HauntedOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark purple/orange atmosphere */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(40,20,50,0.4) 0%, rgba(30,15,25,0.3) 50%, rgba(50,30,20,0.35) 100%)',
        }}
      />
      
      {/* Corner spider web - top left */}
      <svg className="absolute top-0 left-0 w-48 h-48 opacity-20" viewBox="0 0 100 100">
        <path d="M0,0 Q50,20 100,0" stroke="white" strokeWidth="0.5" fill="none" />
        <path d="M0,0 Q20,50 0,100" stroke="white" strokeWidth="0.5" fill="none" />
        <path d="M0,0 L70,70" stroke="white" strokeWidth="0.3" fill="none" />
        <path d="M0,0 Q35,10 70,35" stroke="white" strokeWidth="0.3" fill="none" />
        <path d="M0,0 Q10,35 35,70" stroke="white" strokeWidth="0.3" fill="none" />
        {/* Radial web lines */}
        <path d="M0,0 L100,50" stroke="white" strokeWidth="0.2" fill="none" />
        <path d="M0,0 L50,100" stroke="white" strokeWidth="0.2" fill="none" />
      </svg>
      
      {/* Corner spider web - top right */}
      <svg className="absolute top-0 right-0 w-48 h-48 opacity-20 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q50,20 100,0" stroke="white" strokeWidth="0.5" fill="none" />
        <path d="M0,0 Q20,50 0,100" stroke="white" strokeWidth="0.5" fill="none" />
        <path d="M0,0 L70,70" stroke="white" strokeWidth="0.3" fill="none" />
        <path d="M0,0 Q35,10 70,35" stroke="white" strokeWidth="0.3" fill="none" />
      </svg>
      
      {/* Subtle pumpkin glow at bottom corners */}
      <div 
        className="absolute bottom-0 left-0 w-48 h-48 animate-pumpkin-glow"
        style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(255,120,0,0.15) 0%, transparent 50%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-48 h-48 animate-pumpkin-glow"
        style={{
          background: 'radial-gradient(circle at 80% 80%, rgba(255,120,0,0.15) 0%, transparent 50%)',
          animationDelay: '1.5s',
        }}
      />
      
      {/* Dark shadow creeping from corners */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.3) 100%)',
        }}
      />
      
      {/* Subtle purple tint */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(45deg, rgba(100,0,150,0.1) 0%, transparent 50%, rgba(150,50,0,0.1) 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes pumpkin-glow { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        .animate-pumpkin-glow { animation: pumpkin-glow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// CARNIVAL THEME - For Games Page
// Dark circus, spotlight effects, eerie atmosphere
// ============================================
export function CarnivalOverlay() {
  const [spotlightAngle, setSpotlightAngle] = useState(0);
  
  useEffect(() => {
    const animate = () => {
      setSpotlightAngle(prev => (prev + 0.5) % 360);
    };
    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dark circus tent gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(50,10,30,0.5) 0%, rgba(30,5,20,0.4) 50%, rgba(20,0,10,0.5) 100%)',
        }}
      />
      
      {/* Circus tent stripes at top - subtle */}
      <div className="absolute top-0 left-0 right-0 h-12 overflow-hidden opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(90deg, rgba(150,0,0,0.5) 0px, rgba(150,0,0,0.5) 40px, transparent 40px, transparent 80px)',
          }}
        />
      </div>
      
      {/* Swinging spotlight effect */}
      <div 
        className="absolute top-0 left-1/2 w-48 h-full opacity-10"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,200,0.4) 0%, rgba(255,255,150,0.1) 30%, transparent 60%)',
          transform: `translateX(-50%) rotate(${Math.sin(spotlightAngle * Math.PI / 180) * 15}deg)`,
          transformOrigin: 'top center',
        }}
      />
      
      {/* Red ambient glow at bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(150,0,0,0.2) 0%, transparent 70%)',
        }}
      />
      
      {/* Vignette - heavier for creepy effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      
      {/* Subtle golden ticket particles - just 2-3 */}
      <div className="absolute top-1/4 left-1/4 w-8 h-4 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded opacity-20 animate-float-ticket-1" />
      <div className="absolute top-1/3 right-1/4 w-6 h-3 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded opacity-15 animate-float-ticket-2" />
      
      <style jsx>{`
        @keyframes float-ticket-1 { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-30px) rotate(5deg); } }
        @keyframes float-ticket-2 { 0%, 100% { transform: translateY(0) rotate(5deg); } 50% { transform: translateY(-25px) rotate(-5deg); } }
        .animate-float-ticket-1 { animation: float-ticket-1 8s ease-in-out infinite; }
        .animate-float-ticket-2 { animation: float-ticket-2 10s ease-in-out infinite 3s; }
      `}</style>
    </div>
  );
}
