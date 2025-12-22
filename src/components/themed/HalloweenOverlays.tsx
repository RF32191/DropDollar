'use client';

import React, { useEffect, useState, useMemo } from 'react';

// Halloween color palette
const HALLOWEEN_COLORS = {
  orange: '#FF6B00',
  purple: '#8B00FF',
  darkPurple: '#4A0080',
  black: '#0a0008',
  green: '#00FF66',
  red: '#FF0000',
  bone: '#F5F5DC',
};

// 3D Pumpkin Component
function Pumpkin3D({ x, y, size = 60, glowing = false, delay = 0 }: { x: number; y: number; size?: number; glowing?: boolean; delay?: number }) {
  return (
    <div 
      className="absolute animate-pumpkin-bob"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    >
      <div 
        className="relative"
        style={{ 
          width: `${size}px`, 
          height: `${size * 0.85}px`,
        }}
      >
        {/* Pumpkin body with 3D ridges */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(ellipse at 30% 30%, 
              ${HALLOWEEN_COLORS.orange} 0%, 
              #cc5500 40%, 
              #994400 70%, 
              #662200 100%)`,
            boxShadow: glowing 
              ? `0 0 30px 10px ${HALLOWEEN_COLORS.orange}88, inset 0 0 20px rgba(255,200,0,0.5)`
              : `0 ${size/6}px ${size/4}px rgba(0,0,0,0.4)`,
          }}
        >
          {/* Ridges */}
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="absolute top-0 bottom-0 rounded-full"
              style={{
                left: `${15 + i * 15}%`,
                width: '4px',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)',
              }}
            />
          ))}
        </div>
        
        {/* Stem */}
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-5 bg-gradient-to-b from-green-700 to-green-900 rounded-t"
          style={{ transform: 'translateX(-50%) rotate(10deg)' }}
        />
        
        {/* Face - if glowing */}
        {glowing && (
          <>
            {/* Eyes */}
            <div 
              className="absolute bg-yellow-400"
              style={{
                left: '25%',
                top: '35%',
                width: `${size * 0.15}px`,
                height: `${size * 0.12}px`,
                clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                boxShadow: '0 0 10px yellow',
              }}
            />
            <div 
              className="absolute bg-yellow-400"
              style={{
                right: '25%',
                top: '35%',
                width: `${size * 0.15}px`,
                height: `${size * 0.12}px`,
                clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                boxShadow: '0 0 10px yellow',
              }}
            />
            {/* Mouth */}
            <div 
              className="absolute bg-yellow-400"
              style={{
                left: '20%',
                right: '20%',
                bottom: '25%',
                height: `${size * 0.15}px`,
                clipPath: 'polygon(0% 0%, 15% 100%, 30% 0%, 45% 100%, 60% 0%, 75% 100%, 90% 0%, 100% 100%, 100% 0%)',
                boxShadow: '0 0 15px yellow',
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// 3D Ghost Component
function Ghost3D({ x, y, size = 50, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <div 
      className="absolute animate-ghost-float"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    >
      <div 
        className="relative"
        style={{ width: `${size}px`, height: `${size * 1.3}px` }}
      >
        {/* Body */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 40% 30%, white 0%, #e0e0e0 40%, #c0c0c0 70%, #a0a0a0 100%)',
            borderRadius: '50% 50% 0 0',
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 85% 100%, 70% 85%, 55% 100%, 40% 85%, 25% 100%, 10% 85%, 0% 100%)',
            boxShadow: '0 0 20px rgba(255,255,255,0.5)',
            opacity: 0.85,
          }}
        />
        {/* Eyes */}
        <div className="absolute top-1/4 left-1/4 w-3 h-4 bg-black rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-3 h-4 bg-black rounded-full" />
        {/* Mouth */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-4 h-3 bg-black rounded-full" />
      </div>
    </div>
  );
}

// 3D Bat Component
function Bat3D({ x, y, size = 30, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <div 
      className="absolute animate-bat-fly"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="relative" style={{ width: `${size * 2}px`, height: `${size}px` }}>
        {/* Body */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-5 bg-gray-900 rounded-full"
          style={{ boxShadow: '0 0 5px rgba(0,0,0,0.8)' }}
        />
        {/* Wings */}
        <div 
          className="absolute left-0 top-0 animate-wing-flap"
          style={{
            width: `${size * 0.9}px`,
            height: `${size * 0.8}px`,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)',
            clipPath: 'polygon(100% 50%, 80% 0%, 40% 10%, 0% 30%, 20% 70%, 60% 100%)',
            transformOrigin: 'right center',
          }}
        />
        <div 
          className="absolute right-0 top-0 animate-wing-flap-reverse"
          style={{
            width: `${size * 0.9}px`,
            height: `${size * 0.8}px`,
            background: 'linear-gradient(-135deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)',
            clipPath: 'polygon(0% 50%, 20% 0%, 60% 10%, 100% 30%, 80% 70%, 40% 100%)',
            transformOrigin: 'left center',
          }}
        />
        {/* Ears */}
        <div className="absolute left-1/2 -translate-x-3 -top-1 w-2 h-3 bg-gray-900 rounded-t-full" />
        <div className="absolute left-1/2 translate-x-1 -top-1 w-2 h-3 bg-gray-900 rounded-t-full" />
        {/* Eyes */}
        <div className="absolute left-1/2 -translate-x-2 top-2 w-1 h-1 bg-red-500 rounded-full" style={{ boxShadow: '0 0 3px red' }} />
        <div className="absolute left-1/2 translate-x-1 top-2 w-1 h-1 bg-red-500 rounded-full" style={{ boxShadow: '0 0 3px red' }} />
      </div>
    </div>
  );
}

// Lightning SVG Component
function Lightning({ active, x, color = '#FFE4B5' }: { active: boolean; x: number; color?: string }) {
  const path = useMemo(() => {
    let d = `M${x},0`;
    for (let i = 1; i <= 12; i++) {
      const xOffset = x + (Math.random() - 0.5) * 80;
      d += ` L${xOffset},${(400 / 12) * i}`;
    }
    return d;
  }, [x, active]);
  
  if (!active) return null;
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <defs>
        <filter id="lightning-glow-main">
          <feGaussianBlur stdDeviation="8" result="blur1"/>
          <feGaussianBlur stdDeviation="3" result="blur2"/>
          <feMerge>
            <feMergeNode in="blur1"/>
            <feMergeNode in="blur2"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d={path} stroke={color} strokeWidth="6" fill="none" filter="url(#lightning-glow-main)" strokeLinecap="round"/>
      <path d={path} stroke="white" strokeWidth="2" fill="none" opacity="0.9"/>
    </svg>
  );
}

// ============================================
// HELL THEME - For Hot Sell Page
// Inferno with ghostly presences
// ============================================
export function HellOverlay() {
  const [lightning, setLightning] = useState(false);
  const [lightningX, setLightningX] = useState(50);
  const [flamePhase, setFlamePhase] = useState(0);
  
  useEffect(() => {
    const lightningInterval = setInterval(() => {
      setLightningX(15 + Math.random() * 70);
      setLightning(true);
      setTimeout(() => setLightning(false), 100);
      setTimeout(() => {
        setLightning(true);
        setTimeout(() => setLightning(false), 80);
      }, 150);
    }, 4000 + Math.random() * 3000);
    
    const flameInterval = setInterval(() => {
      setFlamePhase(prev => (prev + 1) % 100);
    }, 100);
    
    return () => { clearInterval(lightningInterval); clearInterval(flameInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ORANGE/PURPLE INFERNO PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${HALLOWEEN_COLORS.darkPurple}cc 0%, 
            #3a1530 20%, 
            #4a2020 40%, 
            #5a2a15 60%, 
            #3a1510 80%,
            ${HALLOWEEN_COLORS.black} 100%)`,
        }}
      />
      
      {/* Lightning */}
      {lightning && <div className="absolute inset-0 bg-orange-300/25" style={{ mixBlendMode: 'screen' }} />}
      <Lightning active={lightning} x={lightningX} color={HALLOWEEN_COLORS.orange} />
      
      {/* 3D Ghosts */}
      <Ghost3D x={10} y={15} size={45} delay={0} />
      <Ghost3D x={80} y={20} size={40} delay={1.5} />
      <Ghost3D x={45} y={12} size={35} delay={3} />
      
      {/* Hellfire */}
      <div 
        className="absolute bottom-0 left-0 right-0"
        style={{ height: `${25 + Math.sin(flamePhase * 0.1) * 8}%` }}
      >
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, 
              ${HALLOWEEN_COLORS.orange}dd 0%, 
              ${HALLOWEEN_COLORS.orange}88 30%, 
              ${HALLOWEEN_COLORS.red}44 60%, 
              transparent 100%)`,
          }}
        />
        {/* 3D Flame shapes */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 animate-flame-3d"
            style={{
              left: `${i * 8.5}%`,
              width: '35px',
              height: `${70 + Math.sin((flamePhase + i * 20) * 0.15) * 25}%`,
              background: `linear-gradient(0deg, 
                ${HALLOWEEN_COLORS.orange} 0%, 
                #ff8800 30%, 
                #ffcc00 60%, 
                transparent 100%)`,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              filter: 'blur(3px)',
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>
      
      {/* Purple mist */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-56"
        style={{
          background: `linear-gradient(0deg, ${HALLOWEEN_COLORS.purple}55 0%, ${HALLOWEEN_COLORS.darkPurple}22 50%, transparent 100%)`,
        }}
      />
      
      {/* Flying bats */}
      <Bat3D x={20} y={25} size={25} delay={0} />
      <Bat3D x={70} y={18} size={20} delay={2} />
      <Bat3D x={50} y={30} size={22} delay={4} />
      
      <style jsx>{`
        @keyframes flame-3d { 0%, 100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(1.15) scaleX(0.9); } }
        @keyframes ghost-float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(10px); } }
        @keyframes bat-fly { 0%, 100% { transform: translateY(0) translateX(0); } 25% { transform: translateY(-15px) translateX(20px); } 50% { transform: translateY(5px) translateX(40px); } 75% { transform: translateY(-10px) translateX(20px); } }
        @keyframes wing-flap { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(40deg); } }
        @keyframes wing-flap-reverse { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(-40deg); } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-flame-3d { animation: flame-3d 0.5s ease-in-out infinite; }
        .animate-ghost-float { animation: ghost-float 6s ease-in-out infinite; }
        .animate-bat-fly { animation: bat-fly 8s ease-in-out infinite; }
        .animate-wing-flap { animation: wing-flap 0.3s ease-in-out infinite; }
        .animate-wing-flap-reverse { animation: wing-flap-reverse 0.3s ease-in-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// FRANKENSTEIN THEME - For 1v1 Page
// Electric laboratory
// ============================================
export function FrankensteinOverlay() {
  const [leftArc, setLeftArc] = useState(false);
  const [rightArc, setRightArc] = useState(false);
  const [centerBolt, setCenterBolt] = useState(false);
  
  useEffect(() => {
    const arcInterval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.3) { 
        setLeftArc(true); 
        setTimeout(() => setLeftArc(false), 200); 
      } else if (rand < 0.6) { 
        setRightArc(true); 
        setTimeout(() => setRightArc(false), 200); 
      } else {
        setLeftArc(true); 
        setRightArc(true);
        setTimeout(() => { setLeftArc(false); setRightArc(false); }, 250);
      }
    }, 1000 + Math.random() * 1500);
    
    const boltInterval = setInterval(() => {
      setCenterBolt(true);
      setTimeout(() => setCenterBolt(false), 120);
    }, 6000 + Math.random() * 4000);
    
    return () => { clearInterval(arcInterval); clearInterval(boltInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* GREEN/PURPLE LAB */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #050a08 0%, 
            #0a1a0f 25%, 
            #0f1520 50%, 
            #0a150a 75%, 
            #050808 100%)`,
        }}
      />
      
      {/* Flash on discharge */}
      {(leftArc || rightArc || centerBolt) && (
        <div 
          className="absolute inset-0"
          style={{ 
            background: centerBolt ? 'rgba(100,255,150,0.25)' : 'rgba(50,200,150,0.15)',
            mixBlendMode: 'screen' 
          }} 
        />
      )}
      
      {/* Center lightning */}
      <Lightning active={centerBolt} x={200} color={HALLOWEEN_COLORS.green} />
      
      {/* LEFT TESLA COIL */}
      <div className="absolute left-4 sm:left-10 top-28 bottom-28 w-20">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 bg-gradient-to-b from-gray-500 to-gray-800 rounded-t" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-52">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded" />
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute left-1/2 -translate-x-1/2 h-2 rounded-full"
              style={{ width: '56px', bottom: `${i * 11 + 6}px`, background: 'linear-gradient(90deg, #6B4423, #B87333, #DAA520, #B87333, #6B4423)' }} />
          ))}
        </div>
        <div 
          className={`absolute top-20 left-1/2 -translate-x-1/2 w-18 h-18 rounded-full transition-all duration-100 ${leftArc ? 'scale-115' : ''}`}
          style={{ 
            background: leftArc 
              ? `radial-gradient(circle at 30% 30%, white 0%, ${HALLOWEEN_COLORS.green}cc 30%, #00AA88 100%)`
              : 'radial-gradient(circle at 30% 30%, #66BBAA 0%, #227766 50%, #114433 100%)',
            boxShadow: leftArc ? `0 0 70px 30px ${HALLOWEEN_COLORS.green}cc` : '0 0 25px 10px rgba(0,200,150,0.4)',
            width: '72px', height: '72px',
          }}
        />
        {leftArc && (
          <svg className="absolute top-24 left-20 w-96 h-48 overflow-visible">
            <defs><filter id="arc-glow-l"><feGaussianBlur stdDeviation="5"/></filter></defs>
            {[...Array(4)].map((_, i) => (
              <path key={i}
                d={`M0,${15 + i * 8} Q${100 + Math.random() * 50},${(Math.random() - 0.5) * 80} ${250},${15 + i * 8}`}
                stroke={HALLOWEEN_COLORS.green} strokeWidth={4 - i * 0.7} fill="none" filter="url(#arc-glow-l)" opacity={1 - i * 0.2} />
            ))}
          </svg>
        )}
      </div>
      
      {/* RIGHT TESLA COIL */}
      <div className="absolute right-4 sm:right-10 top-28 bottom-28 w-20">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 bg-gradient-to-b from-gray-500 to-gray-800 rounded-t" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-52">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded" />
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute left-1/2 -translate-x-1/2 h-2 rounded-full"
              style={{ width: '56px', bottom: `${i * 11 + 6}px`, background: 'linear-gradient(90deg, #6B4423, #B87333, #DAA520, #B87333, #6B4423)' }} />
          ))}
        </div>
        <div 
          className={`absolute top-20 left-1/2 -translate-x-1/2 w-18 h-18 rounded-full transition-all duration-100 ${rightArc ? 'scale-115' : ''}`}
          style={{ 
            background: rightArc 
              ? `radial-gradient(circle at 30% 30%, white 0%, ${HALLOWEEN_COLORS.purple}cc 30%, #8844AA 100%)`
              : 'radial-gradient(circle at 30% 30%, #AA88CC 0%, #553377 50%, #331155 100%)',
            boxShadow: rightArc ? `0 0 70px 30px ${HALLOWEEN_COLORS.purple}cc` : '0 0 25px 10px rgba(150,80,200,0.4)',
            width: '72px', height: '72px',
          }}
        />
        {rightArc && (
          <svg className="absolute top-24 right-20 w-96 h-48 overflow-visible scale-x-[-1]">
            {[...Array(4)].map((_, i) => (
              <path key={i}
                d={`M0,${15 + i * 8} Q${100 + Math.random() * 50},${(Math.random() - 0.5) * 80} ${250},${15 + i * 8}`}
                stroke={HALLOWEEN_COLORS.purple} strokeWidth={4 - i * 0.7} fill="none" filter="url(#arc-glow-l)" opacity={1 - i * 0.2} />
            ))}
          </svg>
        )}
      </div>
      
      {/* Toxic floor */}
      <div className="absolute bottom-0 left-0 right-0 h-36" style={{ background: `radial-gradient(ellipse at 50% 100%, ${HALLOWEEN_COLORS.green}44 0%, transparent 60%)` }} />
    </div>
  );
}

// ============================================
// ZOMBIES THEME - For Winner Takes All Page
// ORANGE BACKGROUND WITH PURPLE UNDERTONES
// ============================================
export function ZombiesOverlay() {
  const [fogOffset, setFogOffset] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFogOffset(prev => (prev + 1) % 100);
    }, 80);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ORANGE PAGE WITH PURPLE UNDERTONES */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${HALLOWEEN_COLORS.darkPurple}dd 0%, 
            #4a2040 15%, 
            #5a3020 30%,
            ${HALLOWEEN_COLORS.orange}55 50%, 
            #4a2515 70%,
            ${HALLOWEEN_COLORS.darkPurple}cc 85%,
            #1a0820 100%)`,
        }}
      />
      
      {/* Orange glow overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${HALLOWEEN_COLORS.orange}30 0%, transparent 60%)`,
        }}
      />
      
      {/* Full moon - 3D */}
      <div className="absolute top-10 right-16">
        <div 
          className="rounded-full"
          style={{
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle at 35% 35%, #FFFACD 0%, #F0E68C 40%, #DAA520 80%, #B8860B 100%)',
            boxShadow: `0 0 80px 30px rgba(255,250,200,0.4), 0 0 150px 60px ${HALLOWEEN_COLORS.orange}33`,
          }}
        >
          {/* Craters */}
          <div className="absolute top-4 left-6 w-5 h-5 bg-yellow-300/30 rounded-full" />
          <div className="absolute top-12 right-6 w-4 h-4 bg-yellow-400/25 rounded-full" />
          <div className="absolute bottom-8 left-10 w-3 h-3 bg-yellow-300/20 rounded-full" />
        </div>
      </div>
      
      {/* 3D Pumpkins */}
      <Pumpkin3D x={8} y={65} size={55} glowing={true} delay={0} />
      <Pumpkin3D x={85} y={70} size={48} glowing={true} delay={1} />
      <Pumpkin3D x={25} y={72} size={40} glowing={false} delay={0.5} />
      <Pumpkin3D x={70} y={68} size={35} glowing={false} delay={1.5} />
      
      {/* Tombstones - 3D */}
      {[...Array(5)].map((_, i) => (
        <div 
          key={i}
          className="absolute bottom-24"
          style={{ left: `${12 + i * 18}%` }}
        >
          <div 
            className="bg-gradient-to-b from-gray-700 to-gray-900 rounded-t-xl"
            style={{
              width: `${50 + (i % 2) * 15}px`,
              height: `${80 + (i % 3) * 20}px`,
              boxShadow: `0 0 20px ${HALLOWEEN_COLORS.purple}44, 5px 10px 20px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-10 bg-gray-500" />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-500" />
          </div>
        </div>
      ))}
      
      {/* Dead tree - 3D */}
      <div className="absolute bottom-24 left-1/4 opacity-50">
        <div className="w-5 h-48 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-t" />
        <div className="absolute top-4 left-3 w-24 h-3 bg-gray-800 -rotate-30 origin-left rounded" />
        <div className="absolute top-16 left-3 w-18 h-2.5 bg-gray-800 -rotate-50 origin-left rounded" />
        <div className="absolute top-8 right-0 w-16 h-2.5 bg-gray-800 rotate-40 origin-right rounded" />
      </div>
      
      {/* Fog layers */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-64"
        style={{
          background: `linear-gradient(0deg, ${HALLOWEEN_COLORS.purple}55 0%, ${HALLOWEEN_COLORS.orange}22 40%, transparent 100%)`,
          transform: `translateX(${Math.sin(fogOffset * 0.03) * 30}px)`,
        }}
      />
      <div 
        className="absolute bottom-0 left-0 right-0 h-44"
        style={{
          background: `linear-gradient(0deg, ${HALLOWEEN_COLORS.darkPurple}66 0%, transparent 80%)`,
          transform: `translateX(${Math.sin((fogOffset + 50) * 0.03) * -40}px)`,
        }}
      />
      
      {/* Bats */}
      <Bat3D x={15} y={20} size={22} delay={0} />
      <Bat3D x={60} y={15} size={18} delay={2} />
      <Bat3D x={40} y={25} size={20} delay={4} />
      
      <style jsx>{`
        @keyframes ghost-float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(10px); } }
        @keyframes bat-fly { 0%, 100% { transform: translateY(0) translateX(0); } 25% { transform: translateY(-15px) translateX(20px); } 50% { transform: translateY(5px) translateX(40px); } 75% { transform: translateY(-10px) translateX(20px); } }
        @keyframes wing-flap { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(40deg); } }
        @keyframes wing-flap-reverse { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(-40deg); } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-ghost-float { animation: ghost-float 6s ease-in-out infinite; }
        .animate-bat-fly { animation: bat-fly 8s ease-in-out infinite; }
        .animate-wing-flap { animation: wing-flap 0.3s ease-in-out infinite; }
        .animate-wing-flap-reverse { animation: wing-flap-reverse 0.3s ease-in-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// STYX THEME - For Coin Play Page
// ORANGE BACKGROUND WITH PURPLE UNDERTONES
// ============================================
export function StyxOverlay() {
  const [waterPhase, setWaterPhase] = useState(0);
  const [coinGlow, setCoinGlow] = useState([false, false, false, false]);
  
  useEffect(() => {
    const waterInterval = setInterval(() => {
      setWaterPhase(prev => (prev + 1) % 100);
    }, 60);
    
    const coinInterval = setInterval(() => {
      setCoinGlow(prev => prev.map(() => Math.random() > 0.3));
    }, 800);
    
    return () => { clearInterval(waterInterval); clearInterval(coinInterval); };
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ORANGE/PURPLE UNDERWORLD PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${HALLOWEEN_COLORS.darkPurple}ee 0%, 
            #3a1840 20%, 
            #4a2530 40%,
            ${HALLOWEEN_COLORS.orange}44 55%,
            #3a2025 70%,
            ${HALLOWEEN_COLORS.darkPurple}dd 85%,
            #150820 100%)`,
        }}
      />
      
      {/* Orange mystical glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 70%, ${HALLOWEEN_COLORS.orange}35 0%, transparent 55%)`,
        }}
      />
      
      {/* River Styx - dark mystical water */}
      <div className="absolute bottom-0 left-0 right-0 h-52">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, 
              ${HALLOWEEN_COLORS.darkPurple}dd 0%, 
              ${HALLOWEEN_COLORS.purple}88 30%,
              ${HALLOWEEN_COLORS.orange}44 60%, 
              transparent 100%)`,
            transform: `translateX(${Math.sin(waterPhase * 0.04) * 15}px)`,
          }}
        />
        {/* Ripples */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-0.5"
            style={{
              width: '100%',
              bottom: `${15 + i * 10}%`,
              background: `linear-gradient(90deg, transparent, ${HALLOWEEN_COLORS.orange}44, transparent)`,
              transform: `scaleX(${0.7 + Math.sin((waterPhase + i * 15) * 0.08) * 0.3})`,
            }}
          />
        ))}
      </div>
      
      {/* 3D Floating spirit coins */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute animate-coin-float"
          style={{
            left: `${18 + i * 22}%`,
            bottom: `${28 + (i % 2) * 12}%`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          <div 
            className="rounded-full"
            style={{
              width: '52px',
              height: '52px',
              background: 'radial-gradient(circle at 35% 35%, #FFD700 0%, #DAA520 40%, #B8860B 70%, #8B6914 100%)',
              boxShadow: coinGlow[i] 
                ? `0 0 35px 12px ${HALLOWEEN_COLORS.orange}88, 0 0 60px 20px ${HALLOWEEN_COLORS.purple}55`
                : `0 0 20px 6px rgba(255,200,100,0.4)`,
              transition: 'box-shadow 0.3s',
            }}
          >
            <div className="absolute top-2 left-3 w-3 h-2 bg-white/40 rounded-full" />
          </div>
        </div>
      ))}
      
      {/* 3D Greek columns */}
      <div className="absolute bottom-0 left-6 w-14 h-80 opacity-35">
        <div className="w-full h-5 bg-gradient-to-b from-purple-800 to-purple-900 rounded" />
        <div className="w-12 h-68 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 mx-auto" />
        <div className="w-full h-5 bg-gradient-to-b from-purple-800 to-purple-900 rounded" />
      </div>
      <div className="absolute bottom-0 right-6 w-14 h-80 opacity-35">
        <div className="w-full h-5 bg-gradient-to-b from-purple-800 to-purple-900 rounded" />
        <div className="w-12 h-68 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 mx-auto" />
        <div className="w-full h-5 bg-gradient-to-b from-purple-800 to-purple-900 rounded" />
      </div>
      
      {/* 3D Pumpkins */}
      <Pumpkin3D x={10} y={55} size={45} glowing={true} delay={0} />
      <Pumpkin3D x={82} y={52} size={40} glowing={true} delay={1.5} />
      
      {/* Ghost */}
      <Ghost3D x={50} y={20} size={55} delay={0} />
      
      <style jsx>{`
        @keyframes coin-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(180deg); } }
        @keyframes ghost-float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(10px); } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-coin-float { animation: coin-float 7s ease-in-out infinite; }
        .animate-ghost-float { animation: ghost-float 6s ease-in-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// HAUNTED THEME - For Dashboard
// Acid rising with webs
// ============================================
export function HauntedOverlay() {
  const [acidLevel, setAcidLevel] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAcidLevel(prev => (prev + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);
  
  const acidHeight = 16 + Math.sin(acidLevel * 0.025) * 7;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* HAUNTED PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${HALLOWEEN_COLORS.darkPurple}dd 0%, 
            #2a1530 25%, 
            #3a2025 50%, 
            #2a2520 75%, 
            #1a1518 100%)`,
        }}
      />
      
      {/* GREEN ACID RISING */}
      <div 
        className="absolute bottom-0 left-0 right-0 transition-all duration-200"
        style={{ height: `${acidHeight}%` }}
      >
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, 
              ${HALLOWEEN_COLORS.green}77 0%, 
              ${HALLOWEEN_COLORS.green}55 30%,
              ${HALLOWEEN_COLORS.green}33 60%, 
              transparent 100%)`,
          }}
        />
        {/* Surface glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-8"
          style={{
            background: `linear-gradient(0deg, transparent 0%, ${HALLOWEEN_COLORS.green}99 50%, ${HALLOWEEN_COLORS.green}66 100%)`,
            boxShadow: `0 -20px 60px 20px ${HALLOWEEN_COLORS.green}66`,
          }}
        />
        {/* Bubbles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-bubble-rise"
            style={{
              left: `${(i * 8.5) + 3}%`,
              bottom: '8%',
              width: `${8 + (i % 3) * 5}px`,
              height: `${8 + (i % 3) * 5}px`,
              background: `radial-gradient(circle at 30% 30%, rgba(200,255,200,0.9), ${HALLOWEEN_COLORS.green}66)`,
              animationDelay: `${i * 0.35}s`,
            }}
          />
        ))}
      </div>
      
      {/* Spider webs */}
      <svg className="absolute top-0 left-0 w-96 h-96 opacity-30" viewBox="0 0 100 100">
        <path d="M0,0 Q60,22 100,0" stroke="#fff" strokeWidth="0.7" fill="none" />
        <path d="M0,0 Q22,60 0,100" stroke="#fff" strokeWidth="0.7" fill="none" />
        <path d="M0,0 L90,90" stroke="#fff" strokeWidth="0.5" fill="none" />
        <ellipse cx="22" cy="22" rx="18" ry="14" stroke="#fff" strokeWidth="0.35" fill="none" transform="rotate(-45 22 22)" />
        <ellipse cx="45" cy="45" rx="40" ry="30" stroke="#fff" strokeWidth="0.28" fill="none" transform="rotate(-45 45 45)" />
      </svg>
      <svg className="absolute top-0 right-0 w-96 h-96 opacity-30 scale-x-[-1]" viewBox="0 0 100 100">
        <path d="M0,0 Q60,22 100,0" stroke="#fff" strokeWidth="0.7" fill="none" />
        <path d="M0,0 Q22,60 0,100" stroke="#fff" strokeWidth="0.7" fill="none" />
        <path d="M0,0 L90,90" stroke="#fff" strokeWidth="0.5" fill="none" />
      </svg>
      
      {/* 3D Pumpkins */}
      <Pumpkin3D x={5} y={72} size={50} glowing={true} delay={0} />
      <Pumpkin3D x={88} y={70} size={45} glowing={true} delay={1} />
      
      <style jsx>{`
        @keyframes bubble-rise { 0% { transform: translateY(0) scale(1); opacity: 0.9; } 100% { transform: translateY(-600px) scale(0.3); opacity: 0; } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bubble-rise { animation: bubble-rise 5s ease-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
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
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSpotlight1(prev => (prev + 1) % 360);
      setSpotlight2(prev => (prev - 0.7 + 360) % 360);
    }, 35);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* CREEPY CARNIVAL PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${HALLOWEEN_COLORS.darkPurple}dd 0%, 
            #3a1525 25%, 
            ${HALLOWEEN_COLORS.orange}33 50%, 
            #2a1020 75%, 
            #150815 100%)`,
        }}
      />
      
      {/* Circus tent */}
      <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden opacity-40">
        <div style={{ position: 'absolute', inset: 0, background: `repeating-linear-gradient(90deg, ${HALLOWEEN_COLORS.red}88 0px, ${HALLOWEEN_COLORS.red}88 55px, ${HALLOWEEN_COLORS.darkPurple}66 55px, ${HALLOWEEN_COLORS.darkPurple}66 110px)` }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '180px solid transparent', borderRight: '180px solid transparent', borderBottom: `100px solid ${HALLOWEEN_COLORS.red}66` }} />
      </div>
      
      {/* Swinging spotlights */}
      <div 
        className="absolute top-0 left-1/2 w-80 h-full opacity-25"
        style={{
          background: `linear-gradient(180deg, ${HALLOWEEN_COLORS.orange}cc 0%, ${HALLOWEEN_COLORS.orange}44 30%, transparent 60%)`,
          transform: `translateX(-50%) rotate(${Math.sin(spotlight1 * Math.PI / 180) * 28}deg)`,
          transformOrigin: 'top center',
        }}
      />
      <div 
        className="absolute top-0 left-1/3 w-64 h-full opacity-18"
        style={{
          background: `linear-gradient(180deg, ${HALLOWEEN_COLORS.purple}bb 0%, ${HALLOWEEN_COLORS.purple}33 25%, transparent 50%)`,
          transform: `translateX(-50%) rotate(${Math.sin(spotlight2 * Math.PI / 180) * 22}deg)`,
          transformOrigin: 'top center',
        }}
      />
      
      {/* 3D Pumpkins */}
      <Pumpkin3D x={8} y={65} size={55} glowing={true} delay={0} />
      <Pumpkin3D x={85} y={68} size={48} glowing={true} delay={1.5} />
      
      {/* Bats */}
      <Bat3D x={25} y={22} size={24} delay={0} />
      <Bat3D x={65} y={18} size={20} delay={2} />
      
      {/* Ghosts */}
      <Ghost3D x={15} y={35} size={40} delay={0} />
      <Ghost3D x={78} y={30} size={35} delay={2} />
      
      {/* Orange corner glows */}
      <div className="absolute bottom-0 left-0 w-64 h-64" style={{ background: `radial-gradient(circle at 0% 100%, ${HALLOWEEN_COLORS.orange}44 0%, transparent 50%)` }} />
      <div className="absolute bottom-0 right-0 w-64 h-64" style={{ background: `radial-gradient(circle at 100% 100%, ${HALLOWEEN_COLORS.orange}44 0%, transparent 50%)` }} />
      
      <style jsx>{`
        @keyframes ghost-float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(10px); } }
        @keyframes bat-fly { 0%, 100% { transform: translateY(0) translateX(0); } 25% { transform: translateY(-15px) translateX(20px); } 50% { transform: translateY(5px) translateX(40px); } 75% { transform: translateY(-10px) translateX(20px); } }
        @keyframes wing-flap { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(40deg); } }
        @keyframes wing-flap-reverse { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(-40deg); } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-ghost-float { animation: ghost-float 6s ease-in-out infinite; }
        .animate-bat-fly { animation: bat-fly 8s ease-in-out infinite; }
        .animate-wing-flap { animation: wing-flap 0.3s ease-in-out infinite; }
        .animate-wing-flap-reverse { animation: wing-flap-reverse 0.3s ease-in-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SPIDER THEME - For Home Page
// ============================================
export function SpiderOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DARK PURPLE PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${HALLOWEEN_COLORS.black} 0%, 
            ${HALLOWEEN_COLORS.darkPurple}dd 30%, 
            #2a1535 60%, 
            ${HALLOWEEN_COLORS.black} 100%)`,
        }}
      />
      
      {/* Giant center web */}
      <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-5xl opacity-25" viewBox="0 0 400 400">
        {[...Array(20)].map((_, i) => (
          <line key={i} x1="200" y1="200" x2={200 + 200 * Math.cos(i * Math.PI / 10)} y2={200 + 200 * Math.sin(i * Math.PI / 10)} stroke="#fff" strokeWidth="0.8" />
        ))}
        {[...Array(10)].map((_, i) => (
          <circle key={i} cx="200" cy="200" r={20 + i * 20} stroke="#fff" strokeWidth="0.5" fill="none" />
        ))}
      </svg>
      
      {/* 3D Pumpkins */}
      <Pumpkin3D x={10} y={60} size={60} glowing={true} delay={0} />
      <Pumpkin3D x={80} y={65} size={50} glowing={true} delay={1} />
      
      {/* Bats */}
      <Bat3D x={20} y={20} size={25} delay={0} />
      <Bat3D x={70} y={15} size={22} delay={1.5} />
      <Bat3D x={45} y={25} size={20} delay={3} />
      
      {/* Ghosts */}
      <Ghost3D x={30} y={30} size={45} delay={0.5} />
      <Ghost3D x={65} y={35} size={40} delay={2} />
      
      {/* Purple mist */}
      <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: `linear-gradient(0deg, ${HALLOWEEN_COLORS.purple}55 0%, ${HALLOWEEN_COLORS.darkPurple}22 50%, transparent 100%)` }} />
      
      <style jsx>{`
        @keyframes ghost-float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(10px); } }
        @keyframes bat-fly { 0%, 100% { transform: translateY(0) translateX(0); } 25% { transform: translateY(-15px) translateX(20px); } 50% { transform: translateY(5px) translateX(40px); } 75% { transform: translateY(-10px) translateX(20px); } }
        @keyframes wing-flap { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(40deg); } }
        @keyframes wing-flap-reverse { 0%, 100% { transform: rotateY(0deg); } 50% { transform: rotateY(-40deg); } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-ghost-float { animation: ghost-float 6s ease-in-out infinite; }
        .animate-bat-fly { animation: bat-fly 8s ease-in-out infinite; }
        .animate-wing-flap { animation: wing-flap 0.3s ease-in-out infinite; }
        .animate-wing-flap-reverse { animation: wing-flap-reverse 0.3s ease-in-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// MONEY HORROR THEME - For Buy Tokens Page
// ============================================
export function MoneyHorrorOverlay() {
  const [eyeOpen, setEyeOpen] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEyeOpen(true);
      setTimeout(() => setEyeOpen(false), 2500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* HORROR GREEN/PURPLE PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #050a08 0%, 
            ${HALLOWEEN_COLORS.darkPurple}cc 25%, 
            #0a1810 50%, 
            ${HALLOWEEN_COLORS.darkPurple}bb 75%, 
            #050508 100%)`,
        }}
      />
      
      {/* Evil watching eye */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-50">
        <div 
          className={`rounded-full transition-all duration-500 ${eyeOpen ? 'scale-110' : 'scale-90'}`}
          style={{
            width: '120px',
            height: '70px',
            background: 'radial-gradient(ellipse, rgba(20,0,0,0.95) 0%, rgba(40,0,0,0.8) 40%, transparent 70%)',
            border: '4px solid rgba(80,0,0,0.7)',
          }}
        >
          <div 
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full transition-all duration-400 ${eyeOpen ? 'bg-green-400' : 'bg-green-900'}`}
            style={{ boxShadow: eyeOpen ? `0 0 50px 20px ${HALLOWEEN_COLORS.green}88` : 'none' }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-black rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Floating cursed money */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-cursed-money"
          style={{
            left: `${8 + i * 12}%`,
            top: `${35 + (i % 3) * 15}%`,
            animationDelay: `${i * 0.9}s`,
          }}
        >
          <div 
            className="w-18 h-10 rounded relative overflow-hidden"
            style={{
              width: '72px',
              height: '40px',
              background: `linear-gradient(135deg, rgba(40,80,40,0.8) 0%, rgba(30,60,30,0.95) 100%)`,
              border: `1px solid ${HALLOWEEN_COLORS.green}55`,
              boxShadow: `0 0 20px ${HALLOWEEN_COLORS.green}33`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-green-400/80 text-2xl font-bold">$</div>
            <div className="absolute top-1 right-1 w-4 h-2.5 bg-red-800/70 rounded-full" />
          </div>
        </div>
      ))}
      
      {/* 3D Pumpkins */}
      <Pumpkin3D x={8} y={68} size={52} glowing={true} delay={0} />
      <Pumpkin3D x={85} y={65} size={46} glowing={true} delay={1.2} />
      
      {/* Green poison mist */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-52"
        style={{
          background: `linear-gradient(0deg, ${HALLOWEEN_COLORS.green}55 0%, ${HALLOWEEN_COLORS.green}22 50%, transparent 100%)`,
        }}
      />
      
      <style jsx>{`
        @keyframes cursed-money { 0%, 100% { transform: translateY(0) rotate(-4deg); opacity: 0.6; } 50% { transform: translateY(-25px) rotate(4deg); opacity: 0.85; } }
        @keyframes pumpkin-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-cursed-money { animation: cursed-money 7s ease-in-out infinite; }
        .animate-pumpkin-bob { animation: pumpkin-bob 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
