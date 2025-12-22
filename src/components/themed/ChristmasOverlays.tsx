'use client';

import React, { useState, useEffect } from 'react';

// Santa Tracker inspired bright colors
const SANTA_COLORS = {
  red: '#E53935',
  green: '#43A047',
  gold: '#FFD54F',
  blue: '#42A5F5',
  pink: '#EC407A',
  white: '#FFFFFF',
  snow: '#E3F2FD',
};

// Animated Christmas Lights - Santa Tracker Style (brighter, more colorful)
function ChristmasLights({ position = 'top', count = 20 }: { position?: 'top' | 'bottom' | 'left' | 'right'; count?: number }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const colors = [SANTA_COLORS.red, SANTA_COLORS.green, SANTA_COLORS.gold, SANTA_COLORS.blue, SANTA_COLORS.pink];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % count);
    }, 100);
    return () => clearInterval(interval);
  }, [count]);
  
  const isVertical = position === 'left' || position === 'right';
  
  return (
    <div 
      className={`absolute ${
        position === 'top' ? 'top-0 left-0 right-0 h-10' :
        position === 'bottom' ? 'bottom-0 left-0 right-0 h-10' :
        position === 'left' ? 'top-0 bottom-0 left-0 w-10' :
        'top-0 bottom-0 right-0 w-10'
      } flex ${isVertical ? 'flex-col' : 'flex-row'} justify-around items-center`}
    >
      {/* Wire */}
      <div className={`absolute ${isVertical ? 'w-1 h-full left-1/2 -translate-x-1/2' : 'h-1 w-full top-1/2 -translate-y-1/2'} bg-green-800 rounded-full`} />
      
      {[...Array(count)].map((_, i) => {
        const color = colors[i % colors.length];
        const isActive = Math.abs(i - activeIndex) <= 1 || Math.abs(i - activeIndex - count) <= 1 || Math.abs(i - activeIndex + count) <= 1;
        
        return (
          <div key={i} className="relative z-10 flex flex-col items-center">
            {/* Socket */}
            <div className="w-2 h-2 bg-green-700 rounded-t-sm" />
            {/* Bulb - 3D effect */}
            <div 
              className="w-4 h-5 rounded-b-full transition-all duration-100"
              style={{
                background: isActive 
                  ? `radial-gradient(circle at 35% 25%, white 0%, ${color} 50%, ${color}dd 100%)`
                  : `radial-gradient(circle at 35% 25%, ${color}88 0%, ${color}44 100%)`,
                boxShadow: isActive 
                  ? `0 0 20px 8px ${color}cc, 0 0 40px 15px ${color}66, 0 2px 4px rgba(0,0,0,0.3)`
                  : '0 2px 4px rgba(0,0,0,0.2)',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// 3D Snowflakes falling
function Snowfall3D({ count = 40 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-snowfall-3d"
          style={{
            left: `${(i * 2.5) % 100}%`,
            animationDelay: `${(i * 0.3) % 15}s`,
            animationDuration: `${8 + (i % 6) * 2}s`,
          }}
        >
          {/* 3D Snowflake */}
          <div 
            className="relative"
            style={{
              width: `${8 + (i % 4) * 4}px`,
              height: `${8 + (i % 4) * 4}px`,
            }}
          >
            <div 
              className="absolute inset-0 bg-white rounded-full animate-spin-slow"
              style={{
                boxShadow: '0 0 10px 2px rgba(255,255,255,0.8), inset 0 0 5px rgba(200,230,255,0.5)',
              }}
            />
            {/* Snowflake arms */}
            <div className="absolute inset-0 flex items-center justify-center text-white opacity-80" style={{ fontSize: `${6 + (i % 3) * 3}px` }}>
              ❄
            </div>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes snowfall-3d { 
          0% { transform: translateY(-20px) translateX(0) rotateZ(0deg); opacity: 0; } 
          10% { opacity: 1; }
          90% { opacity: 0.8; }
          100% { transform: translateY(100vh) translateX(50px) rotateZ(360deg); opacity: 0; } 
        }
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-snowfall-3d { animation: snowfall-3d linear infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>
    </div>
  );
}

// 3D Gift Box Component
function GiftBox3D({ x, y, color1, color2, size = 50, delay = 0 }: { x: number; y: number; color1: string; color2: string; size?: number; delay?: number }) {
  return (
    <div 
      className="absolute animate-gift-float"
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
          height: `${size}px`,
          transform: 'perspective(200px) rotateX(10deg) rotateY(-10deg)',
        }}
      >
        {/* Box body with 3D shading */}
        <div 
          className="absolute inset-0 rounded-md"
          style={{
            background: `linear-gradient(135deg, ${color1} 0%, ${color1}dd 50%, ${color1}aa 100%)`,
            boxShadow: `inset 0 -${size/4}px ${size/3}px rgba(0,0,0,0.2), 0 ${size/5}px ${size/3}px rgba(0,0,0,0.3)`,
          }}
        />
        {/* Ribbon vertical */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 h-full"
          style={{ 
            width: `${size * 0.15}px`,
            background: `linear-gradient(90deg, ${color2}aa 0%, ${color2} 50%, ${color2}aa 100%)`,
          }}
        />
        {/* Ribbon horizontal */}
        <div 
          className="absolute top-1/2 left-0 -translate-y-1/2 w-full"
          style={{ 
            height: `${size * 0.15}px`,
            background: `linear-gradient(180deg, ${color2}aa 0%, ${color2} 50%, ${color2}aa 100%)`,
          }}
        />
        {/* Bow */}
        <div 
          className="absolute -top-2 left-1/2 -translate-x-1/2"
          style={{ 
            width: `${size * 0.4}px`, 
            height: `${size * 0.25}px`,
            background: color2,
            borderRadius: '50%',
            boxShadow: `0 2px 4px rgba(0,0,0,0.3)`,
          }}
        />
      </div>
    </div>
  );
}

// 3D Christmas Ornament
function Ornament3D({ x, y, color, size = 40, delay = 0 }: { x: number; y: number; color: string; size?: number; delay?: number }) {
  return (
    <div 
      className="absolute animate-ornament-swing"
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    >
      {/* String */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -top-8 w-px bg-gradient-to-b from-transparent via-gray-400 to-gray-500"
        style={{ height: '32px' }}
      />
      {/* Cap */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -top-1 w-3 h-2 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      />
      {/* Ball with 3D effect */}
      <div 
        className="rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `radial-gradient(circle at 30% 30%, white 0%, ${color} 30%, ${color}dd 70%, ${color}88 100%)`,
          boxShadow: `0 ${size/6}px ${size/3}px rgba(0,0,0,0.3), inset 0 -${size/6}px ${size/4}px rgba(0,0,0,0.2), 0 0 ${size/2}px ${color}66`,
        }}
      >
        {/* Shine */}
        <div 
          className="absolute top-2 left-2 bg-white/60 rounded-full"
          style={{ width: `${size * 0.2}px`, height: `${size * 0.15}px` }}
        />
      </div>
    </div>
  );
}

// ============================================
// FIREPLACE THEME - For Hot Sell Page
// Santa Tracker inspired - warm and inviting
// ============================================
export function FireplaceOverlay() {
  const [flameIntensity, setFlameIntensity] = useState(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFlameIntensity(0.8 + Math.random() * 0.4);
    }, 150);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* WARM CHRISTMAS PAGE COLOR - Santa Tracker inspired */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            ${SANTA_COLORS.snow}15 0%, 
            #1a0a0a 20%, 
            #2a1008 50%, 
            #1a0805 80%, 
            #0a0503 100%)`,
        }}
      />
      
      {/* Christmas lights ALL sides */}
      <ChristmasLights position="top" count={28} />
      <ChristmasLights position="bottom" count={28} />
      <ChristmasLights position="left" count={18} />
      <ChristmasLights position="right" count={18} />
      
      {/* 3D Snowfall */}
      <Snowfall3D count={30} />
      
      {/* 3D Fireplace */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96">
        {/* Mantle - 3D */}
        <div 
          className="absolute -top-8 left-1/2 -translate-x-1/2 w-80 h-8 bg-gradient-to-b from-amber-800 to-amber-900 rounded-t-lg"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,200,100,0.2)' }}
        />
        
        {/* Fireplace opening */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-48 bg-gradient-to-t from-gray-900 to-gray-800 rounded-t-2xl"
          style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8)' }}
        >
          {/* Fire glow */}
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-32"
            style={{
              background: `radial-gradient(ellipse at 50% 100%, 
                rgba(255,${100 + flameIntensity * 50},0,0.9) 0%, 
                rgba(255,80,0,0.5) 40%, 
                transparent 70%)`,
              filter: 'blur(4px)',
            }}
          />
          
          {/* 3D Flames */}
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-6"
              style={{
                left: `${20 + i * 10}%`,
                width: '24px',
                height: `${50 + Math.sin((Date.now() / 100 + i * 30) * 0.1) * 15}px`,
                background: `linear-gradient(0deg, 
                  ${SANTA_COLORS.red} 0%, 
                  #ff6600 30%, 
                  #ffaa00 60%, 
                  ${SANTA_COLORS.gold} 80%, 
                  transparent 100%)`,
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                filter: 'blur(2px)',
                animation: `flame-dance ${0.4 + i * 0.05}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
          
          {/* Logs */}
          <div className="absolute bottom-2 left-1/4 w-20 h-4 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 rounded-full transform rotate-12" />
          <div className="absolute bottom-1 right-1/4 w-16 h-3 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 rounded-full transform -rotate-8" />
        </div>
        
        {/* 3D Stockings */}
        <div className="absolute -top-6 left-8">
          <div className="w-10 h-16 bg-gradient-to-b from-red-500 to-red-700 rounded-b-2xl" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 60% 100%, 0 70%)', boxShadow: '2px 3px 8px rgba(0,0,0,0.4)' }}>
            <div className="absolute top-0 left-0 right-0 h-4 bg-white rounded-t" />
          </div>
        </div>
        <div className="absolute -top-6 right-8">
          <div className="w-10 h-16 bg-gradient-to-b from-green-500 to-green-700 rounded-b-2xl" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 60% 100%, 0 70%)', boxShadow: '2px 3px 8px rgba(0,0,0,0.4)' }}>
            <div className="absolute top-0 left-0 right-0 h-4 bg-white rounded-t" />
          </div>
        </div>
      </div>
      
      {/* 3D Ornaments */}
      <Ornament3D x={10} y={15} color={SANTA_COLORS.red} size={35} delay={0} />
      <Ornament3D x={85} y={12} color={SANTA_COLORS.green} size={40} delay={0.5} />
      <Ornament3D x={25} y={20} color={SANTA_COLORS.gold} size={30} delay={1} />
      
      {/* Warm glow */}
      <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,150,50,0.3) 0%, transparent 60%)' }} />
      
      <style jsx>{`
        @keyframes flame-dance { 0%, 100% { transform: scaleY(1) scaleX(1); } 50% { transform: scaleY(1.1) scaleX(0.95); } }
        @keyframes gift-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        @keyframes ornament-swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        .animate-gift-float { animation: gift-float 4s ease-in-out infinite; }
        .animate-ornament-swing { animation: ornament-swing 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SNOWBALL THEME - For 1v1 Page
// Santa Tracker inspired winter battle
// ============================================
export function SnowballOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ICY BRIGHT BLUE PAGE - Santa Tracker style */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #0a1a2a 0%, 
            #0d2838 30%, 
            #1a3040 60%, 
            #0a1520 100%)`,
        }}
      />
      
      {/* Christmas lights */}
      <ChristmasLights position="top" count={32} />
      <ChristmasLights position="left" count={22} />
      <ChristmasLights position="right" count={22} />
      
      {/* Heavy 3D snow */}
      <Snowfall3D count={50} />
      
      {/* 3D Icicles */}
      <div className="absolute top-10 left-0 right-0 flex justify-around">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="relative"
            style={{ marginTop: `${(i % 4) * 6}px` }}
          >
            <div 
              className="animate-icicle-drip"
              style={{
                width: `${6 + (i % 3) * 3}px`,
                height: `${40 + (i % 5) * 20}px`,
                background: `linear-gradient(180deg, 
                  rgba(200,230,255,0.95) 0%, 
                  rgba(150,200,255,0.8) 30%,
                  rgba(100,180,255,0.6) 70%,
                  rgba(80,150,255,0.3) 100%)`,
                clipPath: 'polygon(10% 0, 90% 0, 50% 100%)',
                boxShadow: '0 0 10px rgba(150,200,255,0.5), inset 0 0 8px rgba(255,255,255,0.6)',
                animationDelay: `${i * 0.2}s`,
              }}
            />
            {/* Drip */}
            <div 
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-200 rounded-full animate-drip-fall"
              style={{ 
                animationDelay: `${i * 0.3}s`,
                boxShadow: '0 0 5px rgba(150,200,255,0.8)',
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Red vs Green battle sides with 3D effect */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-40"
        style={{ 
          background: `linear-gradient(90deg, ${SANTA_COLORS.red}30 0%, transparent 100%)`,
        }}
      />
      <div 
        className="absolute top-0 bottom-0 right-0 w-40"
        style={{ 
          background: `linear-gradient(-90deg, ${SANTA_COLORS.green}30 0%, transparent 100%)`,
        }}
      />
      
      {/* 3D Snow forts */}
      <div className="absolute bottom-0 left-4 opacity-60">
        <div 
          className="w-32 h-24 rounded-t-2xl"
          style={{
            background: 'linear-gradient(180deg, white 0%, #e0e8f0 50%, #c0d0e0 100%)',
            boxShadow: '0 -5px 20px rgba(255,255,255,0.5), inset 0 -10px 20px rgba(0,0,0,0.1)',
          }}
        />
      </div>
      <div className="absolute bottom-0 right-4 opacity-60">
        <div 
          className="w-32 h-24 rounded-t-2xl"
          style={{
            background: 'linear-gradient(180deg, white 0%, #e0e8f0 50%, #c0d0e0 100%)',
            boxShadow: '0 -5px 20px rgba(255,255,255,0.5), inset 0 -10px 20px rgba(0,0,0,0.1)',
          }}
        />
      </div>
      
      {/* Snowy ground with sparkle */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-20"
        style={{ 
          background: 'linear-gradient(0deg, rgba(255,255,255,0.5) 0%, rgba(220,240,255,0.3) 60%, transparent 100%)',
          boxShadow: '0 -10px 30px rgba(255,255,255,0.3)',
        }}
      />
      
      {/* Frost border effect */}
      <div 
        className="absolute inset-4 rounded-xl pointer-events-none"
        style={{ 
          border: '3px solid rgba(200,230,255,0.15)',
          boxShadow: 'inset 0 0 60px rgba(150,200,255,0.15)',
        }}
      />
      
      <style jsx>{`
        @keyframes icicle-drip { 0%, 100% { opacity: 0.9; } 50% { opacity: 1; } }
        @keyframes drip-fall { 0%, 70% { opacity: 0; transform: translateX(-50%) translateY(0); } 80% { opacity: 0.8; } 100% { opacity: 0; transform: translateX(-50%) translateY(30px); } }
        .animate-icicle-drip { animation: icicle-drip 2s ease-in-out infinite; }
        .animate-drip-fall { animation: drip-fall 3s ease-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// NORTH POLE THEME - For Winner Takes All Page
// Santa Tracker style magical workshop
// ============================================
export function NorthPoleOverlay() {
  const [auroraOffset, setAuroraOffset] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setAuroraOffset(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* MAGICAL NIGHT SKY - Bright like Santa Tracker */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #0a1528 0%, 
            #0f2040 20%, 
            #1a3050 50%, 
            #0f2030 80%, 
            #0a1520 100%)`,
        }}
      />
      
      {/* Aurora Borealis - 3D waves */}
      <div className="absolute top-0 left-0 right-0 h-72 overflow-hidden opacity-60">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${auroraOffset}deg, 
              transparent 0%, 
              ${SANTA_COLORS.green}40 20%, 
              ${SANTA_COLORS.blue}30 40%, 
              ${SANTA_COLORS.pink}25 60%, 
              ${SANTA_COLORS.green}30 80%, 
              transparent 100%)`,
            filter: 'blur(20px)',
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${auroraOffset + 60}deg, 
              transparent 0%, 
              ${SANTA_COLORS.blue}30 30%, 
              ${SANTA_COLORS.green}35 50%, 
              ${SANTA_COLORS.pink}20 70%, 
              transparent 100%)`,
            filter: 'blur(30px)',
          }}
        />
      </div>
      
      {/* Stars */}
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-twinkle"
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${2 + (i % 3)}px`,
              background: 'white',
              left: `${(i * 2.5) % 100}%`,
              top: `${(i * 1.8) % 40}%`,
              animationDelay: `${i * 0.2}s`,
              boxShadow: '0 0 6px 2px white',
            }}
          />
        ))}
      </div>
      
      {/* Christmas lights ALL sides */}
      <ChristmasLights position="top" count={35} />
      <ChristmasLights position="bottom" count={35} />
      <ChristmasLights position="left" count={25} />
      <ChristmasLights position="right" count={25} />
      
      {/* 3D Snow */}
      <Snowfall3D count={35} />
      
      {/* GIANT 3D STAR */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <div 
          className="text-7xl animate-star-pulse"
          style={{ 
            filter: `drop-shadow(0 0 30px ${SANTA_COLORS.gold}) drop-shadow(0 0 60px ${SANTA_COLORS.gold}88)`,
          }}
        >
          ⭐
        </div>
      </div>
      
      {/* 3D Gift boxes */}
      <GiftBox3D x={8} y={70} color1={SANTA_COLORS.red} color2={SANTA_COLORS.gold} size={55} delay={0} />
      <GiftBox3D x={85} y={68} color1={SANTA_COLORS.green} color2={SANTA_COLORS.red} size={48} delay={1} />
      <GiftBox3D x={15} y={75} color1={SANTA_COLORS.blue} color2={SANTA_COLORS.gold} size={40} delay={2} />
      
      {/* 3D Candy cane poles */}
      <div className="absolute bottom-0 left-8 w-8 h-56 overflow-hidden opacity-70">
        <div 
          className="w-full h-full rounded-t-full animate-candy-spin"
          style={{ 
            background: `repeating-linear-gradient(45deg, ${SANTA_COLORS.red}, ${SANTA_COLORS.red} 12px, white 12px, white 24px)`,
            boxShadow: '3px 0 8px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      <div className="absolute bottom-0 right-8 w-8 h-56 overflow-hidden opacity-70">
        <div 
          className="w-full h-full rounded-t-full animate-candy-spin"
          style={{ 
            background: `repeating-linear-gradient(-45deg, ${SANTA_COLORS.green}, ${SANTA_COLORS.green} 12px, white 12px, white 24px)`,
            boxShadow: '-3px 0 8px rgba(0,0,0,0.3)',
          }}
        />
      </div>
      
      {/* Snow ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{ 
          background: 'linear-gradient(0deg, rgba(255,255,255,0.45) 0%, rgba(220,240,255,0.2) 60%, transparent 100%)',
        }}
      />
      
      <style jsx>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes star-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes candy-spin { 0% { background-position: 0 0; } 100% { background-position: 0 48px; } }
        @keyframes gift-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
        .animate-star-pulse { animation: star-pulse 2s ease-in-out infinite; }
        .animate-candy-spin { animation: candy-spin 2s linear infinite; }
        .animate-gift-float { animation: gift-float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TREASURE THEME - For Coin Play Page
// Golden Christmas riches
// ============================================
export function TreasureOverlay() {
  const [shimmer, setShimmer] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setShimmer(prev => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* RICH GOLD/RED PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #1a0a05 0%, 
            #2a1508 30%, 
            #3a2010 60%, 
            #1a0805 100%)`,
        }}
      />
      
      {/* Golden shimmer sweep */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(${shimmer}deg, transparent 40%, ${SANTA_COLORS.gold}50 50%, transparent 60%)`,
        }}
      />
      
      {/* Christmas lights */}
      <ChristmasLights position="top" count={28} />
      <ChristmasLights position="left" count={18} />
      <ChristmasLights position="right" count={18} />
      
      {/* 3D Snow */}
      <Snowfall3D count={20} />
      
      {/* 3D Ornaments */}
      {[...Array(12)].map((_, i) => (
        <Ornament3D 
          key={i}
          x={5 + (i * 8)}
          y={8 + (i % 3) * 5}
          color={i % 3 === 0 ? SANTA_COLORS.red : i % 3 === 1 ? SANTA_COLORS.gold : SANTA_COLORS.green}
          size={28 + (i % 3) * 8}
          delay={i * 0.4}
        />
      ))}
      
      {/* 3D Gift boxes */}
      <GiftBox3D x={5} y={78} color1={SANTA_COLORS.red} color2={SANTA_COLORS.gold} size={50} delay={0} />
      <GiftBox3D x={88} y={75} color1={SANTA_COLORS.green} color2={SANTA_COLORS.red} size={42} delay={0.5} />
      <GiftBox3D x={12} y={82} color1={SANTA_COLORS.gold} color2={SANTA_COLORS.red} size={35} delay={1} />
      
      {/* Gold sparkles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-sparkle-gold"
          style={{
            left: `${(i * 7) + 3}%`,
            top: `${15 + (i % 5) * 12}%`,
            animationDelay: `${i * 0.25}s`,
          }}
        >
          <div 
            className="w-2 h-2 bg-yellow-300 rounded-full"
            style={{ boxShadow: `0 0 12px 4px ${SANTA_COLORS.gold}` }}
          />
        </div>
      ))}
      
      {/* Warm golden glow */}
      <div 
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,200,100,0.1) 0%, transparent 50%)' }}
      />
      
      <style jsx>{`
        @keyframes sparkle-gold { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.4); } }
        @keyframes ornament-swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes gift-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        .animate-sparkle-gold { animation: sparkle-gold 2s ease-in-out infinite; }
        .animate-ornament-swing { animation: ornament-swing 3s ease-in-out infinite; }
        .animate-gift-float { animation: gift-float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// WINTER THEME - For Dashboard
// Santa Tracker bright winter wonderland
// ============================================
export function WinterOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* BRIGHT WINTER PAGE - Santa Tracker inspired */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #0a1820 0%, 
            #0f2530 25%, 
            #1a3040 50%, 
            #0f2030 75%, 
            #0a1520 100%)`,
        }}
      />
      
      {/* Christmas lights ALL sides - extra prominent */}
      <ChristmasLights position="top" count={32} />
      <ChristmasLights position="bottom" count={32} />
      <ChristmasLights position="left" count={24} />
      <ChristmasLights position="right" count={24} />
      
      {/* 3D Icicles */}
      <div className="absolute top-10 left-0 right-0 flex justify-around">
        {[...Array(25)].map((_, i) => (
          <div key={i} style={{ marginTop: `${(i % 3) * 5}px` }}>
            <div 
              className="animate-icicle-shimmer"
              style={{
                width: `${5 + (i % 2) * 3}px`,
                height: `${30 + (i % 6) * 12}px`,
                background: 'linear-gradient(180deg, rgba(200,230,255,0.9) 0%, rgba(150,200,255,0.7) 50%, rgba(100,180,255,0.4) 100%)',
                clipPath: 'polygon(10% 0, 90% 0, 50% 100%)',
                boxShadow: '0 0 8px rgba(150,200,255,0.6)',
                animationDelay: `${i * 0.12}s`,
              }}
            />
          </div>
        ))}
      </div>
      
      {/* 3D Snow */}
      <Snowfall3D count={35} />
      
      {/* 3D Christmas Tree */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-40">
        <div className="relative">
          {/* Star */}
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-3xl animate-star-pulse"
            style={{ filter: `drop-shadow(0 0 10px ${SANTA_COLORS.gold})` }}
          >
            ⭐
          </div>
          {/* Tree layers - 3D effect */}
          <div 
            className="mx-auto"
            style={{
              width: 0,
              height: 0,
              borderLeft: '50px solid transparent',
              borderRight: '50px solid transparent',
              borderBottom: `80px solid ${SANTA_COLORS.green}`,
              filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.3))',
            }}
          />
          <div 
            className="mx-auto -mt-12"
            style={{
              width: 0,
              height: 0,
              borderLeft: '60px solid transparent',
              borderRight: '60px solid transparent',
              borderBottom: `90px solid #2e7d32`,
              filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.3))',
            }}
          />
          <div 
            className="mx-auto -mt-14"
            style={{
              width: 0,
              height: 0,
              borderLeft: '70px solid transparent',
              borderRight: '70px solid transparent',
              borderBottom: `100px solid #1b5e20`,
              filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.3))',
            }}
          />
          {/* Trunk */}
          <div className="w-10 h-16 bg-gradient-to-b from-amber-700 to-amber-900 mx-auto" style={{ boxShadow: '2px 0 5px rgba(0,0,0,0.3)' }} />
        </div>
      </div>
      
      {/* Corner glows */}
      <div className="absolute bottom-0 left-0 w-72 h-72" style={{ background: `radial-gradient(circle at 0% 100%, ${SANTA_COLORS.red}20 0%, transparent 50%)` }} />
      <div className="absolute bottom-0 right-0 w-72 h-72" style={{ background: `radial-gradient(circle at 100% 100%, ${SANTA_COLORS.green}20 0%, transparent 50%)` }} />
      
      {/* Frost effect */}
      <div 
        className="absolute inset-3 rounded-2xl"
        style={{ 
          border: '4px solid rgba(200,230,255,0.12)',
          boxShadow: 'inset 0 0 80px rgba(150,200,255,0.1)',
        }}
      />
      
      <style jsx>{`
        @keyframes icicle-shimmer { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes star-pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.2); } }
        .animate-icicle-shimmer { animation: icicle-shimmer 2s ease-in-out infinite; }
        .animate-star-pulse { animation: star-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// 3D Snowman Component
function Snowman3D({ x, y, size = 80, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <div 
      className="absolute animate-snowman-sway"
      style={{ 
        left: `${x}%`, 
        bottom: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="relative" style={{ width: `${size}px`, height: `${size * 1.6}px` }}>
        {/* Top hat */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 -top-2"
          style={{ width: `${size * 0.5}px`, height: `${size * 0.35}px` }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-2 bg-gradient-to-b from-gray-800 to-gray-900 rounded" />
          <div 
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-t"
            style={{ width: `${size * 0.35}px`, height: `${size * 0.3}px` }}
          />
          {/* Red band */}
          <div 
            className="absolute bottom-3 left-1/2 -translate-x-1/2 h-2 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded"
            style={{ width: `${size * 0.36}px` }}
          />
        </div>
        
        {/* Head */}
        <div 
          className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full"
          style={{ 
            width: `${size * 0.5}px`, 
            height: `${size * 0.45}px`,
            background: 'radial-gradient(circle at 35% 30%, white 0%, #f5f5f5 50%, #e0e0e0 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 -5px 15px rgba(0,0,0,0.05)',
          }}
        >
          {/* Eyes - coal */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-black rounded-full" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
          <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-black rounded-full" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.5)' }} />
          {/* Carrot nose */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderLeft: `${size * 0.15}px solid #ff6600`,
              filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))',
            }}
          />
          {/* Smile - coal dots */}
          <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-black rounded-full" />
          <div className="absolute bottom-[22%] left-[32%] w-1.5 h-1.5 bg-black rounded-full" />
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-black rounded-full" />
          <div className="absolute bottom-[22%] right-[32%] w-1.5 h-1.5 bg-black rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-1.5 h-1.5 bg-black rounded-full" />
        </div>
        
        {/* Scarf */}
        <div 
          className="absolute left-1/2 -translate-x-1/2"
          style={{ 
            top: `${size * 0.38}px`,
            width: `${size * 0.55}px`, 
            height: `${size * 0.12}px`,
            background: `linear-gradient(90deg, ${SANTA_COLORS.red} 0%, #cc0000 50%, ${SANTA_COLORS.red} 100%)`,
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
        {/* Scarf tail */}
        <div 
          className="absolute animate-scarf-wave"
          style={{ 
            top: `${size * 0.42}px`,
            left: `${size * 0.55}px`,
            width: `${size * 0.15}px`, 
            height: `${size * 0.25}px`,
            background: `linear-gradient(180deg, ${SANTA_COLORS.red} 0%, #aa0000 100%)`,
            borderRadius: '0 0 4px 4px',
          }}
        />
        
        {/* Body (middle ball) */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ 
            top: `${size * 0.45}px`,
            width: `${size * 0.65}px`, 
            height: `${size * 0.55}px`,
            background: 'radial-gradient(circle at 35% 30%, white 0%, #f0f0f0 50%, #d8d8d8 100%)',
            boxShadow: '0 6px 15px rgba(0,0,0,0.25), inset 0 -8px 20px rgba(0,0,0,0.08)',
          }}
        >
          {/* Buttons */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
        </div>
        
        {/* Bottom ball */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{ 
            width: `${size * 0.85}px`, 
            height: `${size * 0.6}px`,
            background: 'radial-gradient(circle at 35% 30%, white 0%, #f0f0f0 50%, #d0d0d0 100%)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 -10px 25px rgba(0,0,0,0.1)',
          }}
        />
        
        {/* Arms - sticks */}
        <div 
          className="absolute bg-gradient-to-r from-amber-900 to-amber-800 rounded"
          style={{ 
            top: `${size * 0.55}px`,
            left: `-${size * 0.2}px`,
            width: `${size * 0.35}px`, 
            height: '4px',
            transform: 'rotate(-20deg)',
          }}
        />
        <div 
          className="absolute bg-gradient-to-l from-amber-900 to-amber-800 rounded"
          style={{ 
            top: `${size * 0.55}px`,
            right: `-${size * 0.2}px`,
            width: `${size * 0.35}px`, 
            height: '4px',
            transform: 'rotate(20deg)',
          }}
        />
      </div>
    </div>
  );
}

// ============================================
// BUY TOKENS THEME - For Buy Tokens Page
// RED/GREEN with SNOWMEN
// ============================================
export function BuyTokensOverlay() {
  const [sparkle, setSparkle] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSparkle(prev => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* RED/GREEN CHRISTMAS PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #0a150a 0%, 
            #152010 20%, 
            #1a0a0a 40%,
            #0f1a0f 60%,
            #150a0a 80%,
            #0a100a 100%)`,
        }}
      />
      
      {/* Red and green glows */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 30%, ${SANTA_COLORS.red}25 0%, transparent 40%),
                       radial-gradient(ellipse at 70% 70%, ${SANTA_COLORS.green}25 0%, transparent 40%)`,
        }}
      />
      
      {/* Golden shimmer sweep */}
      <div 
        className="absolute inset-0 opacity-25"
        style={{
          background: `linear-gradient(${sparkle}deg, transparent 40%, ${SANTA_COLORS.gold}55 50%, transparent 60%)`,
        }}
      />
      
      {/* Christmas lights ALL sides */}
      <ChristmasLights position="top" count={30} />
      <ChristmasLights position="bottom" count={30} />
      <ChristmasLights position="left" count={20} />
      <ChristmasLights position="right" count={20} />
      
      {/* 3D Snowfall */}
      <Snowfall3D count={35} />
      
      {/* 3D SNOWMEN */}
      <Snowman3D x={8} y={5} size={75} delay={0} />
      <Snowman3D x={85} y={8} size={65} delay={0.5} />
      <Snowman3D x={25} y={3} size={55} delay={1} />
      <Snowman3D x={70} y={6} size={60} delay={1.5} />
      
      {/* 3D Gift boxes */}
      <GiftBox3D x={15} y={25} color1={SANTA_COLORS.red} color2={SANTA_COLORS.gold} size={50} delay={0} />
      <GiftBox3D x={78} y={30} color1={SANTA_COLORS.green} color2={SANTA_COLORS.red} size={45} delay={1} />
      <GiftBox3D x={45} y={22} color1={SANTA_COLORS.gold} color2={SANTA_COLORS.red} size={40} delay={2} />
      
      {/* 3D Ornaments */}
      <Ornament3D x={20} y={15} color={SANTA_COLORS.red} size={35} delay={0} />
      <Ornament3D x={75} y={12} color={SANTA_COLORS.green} size={38} delay={0.5} />
      <Ornament3D x={50} y={10} color={SANTA_COLORS.gold} size={32} delay={1} />
      
      {/* Floating coins with Christmas glow */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-coin-spin"
          style={{
            left: `${12 + i * 15}%`,
            top: `${35 + (i % 3) * 10}%`,
            animationDelay: `${i * 0.8}s`,
          }}
        >
          <div 
            className="rounded-full"
            style={{
              width: '48px',
              height: '48px',
              background: 'radial-gradient(circle at 35% 30%, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
              boxShadow: `0 0 25px 8px ${SANTA_COLORS.gold}66, 0 0 50px 15px ${i % 2 === 0 ? SANTA_COLORS.red : SANTA_COLORS.green}33`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-yellow-900 text-xl font-bold">$</div>
            <div className="absolute top-1 left-2 w-2 h-1.5 bg-white/50 rounded-full" />
          </div>
        </div>
      ))}
      
      {/* Snowy ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-28"
        style={{ 
          background: 'linear-gradient(0deg, rgba(255,255,255,0.45) 0%, rgba(230,245,255,0.25) 50%, transparent 100%)',
          boxShadow: '0 -10px 40px rgba(255,255,255,0.2)',
        }}
      />
      
      {/* Corner glows */}
      <div className="absolute bottom-0 left-0 w-64 h-64" style={{ background: `radial-gradient(circle at 0% 100%, ${SANTA_COLORS.red}30 0%, transparent 50%)` }} />
      <div className="absolute bottom-0 right-0 w-64 h-64" style={{ background: `radial-gradient(circle at 100% 100%, ${SANTA_COLORS.green}30 0%, transparent 50%)` }} />
      
      <style jsx>{`
        @keyframes snowman-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes scarf-wave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }
        @keyframes coin-spin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        @keyframes gift-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        @keyframes ornament-swing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        .animate-snowman-sway { animation: snowman-sway 4s ease-in-out infinite; }
        .animate-scarf-wave { animation: scarf-wave 2s ease-in-out infinite; }
        .animate-coin-spin { animation: coin-spin 4s linear infinite; }
        .animate-gift-float { animation: gift-float 4s ease-in-out infinite; }
        .animate-ornament-swing { animation: ornament-swing 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TOYSHOP THEME - For Games Page
// Santa Tracker magical toy store
// ============================================
export function ToyshopOverlay() {
  const [magicSparkle, setMagicSparkle] = useState({ x: 50, y: 50 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMagicSparkle({
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* MAGICAL TOYSHOP PAGE */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            #120815 0%, 
            #1a1020 30%, 
            #201525 60%, 
            #150a15 100%)`,
        }}
      />
      
      {/* Christmas lights ALL sides */}
      <ChristmasLights position="top" count={35} />
      <ChristmasLights position="bottom" count={35} />
      <ChristmasLights position="left" count={25} />
      <ChristmasLights position="right" count={25} />
      
      {/* Garland */}
      <div className="absolute top-10 left-4 right-4 h-8 opacity-50">
        <div 
          className="w-full h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${SANTA_COLORS.green}, #2e7d32, ${SANTA_COLORS.green}, #2e7d32, ${SANTA_COLORS.green})` }}
        />
        {/* Holly berries */}
        {[...Array(10)].map((_, i) => (
          <div 
            key={i} 
            className="absolute top-1/2 -translate-y-1/2 flex gap-1"
            style={{ left: `${8 + i * 10}%` }}
          >
            <div className="w-3 h-3 rounded-full bg-red-600" style={{ boxShadow: `0 0 8px ${SANTA_COLORS.red}` }} />
            <div className="w-3 h-3 rounded-full bg-red-600" style={{ boxShadow: `0 0 8px ${SANTA_COLORS.red}` }} />
          </div>
        ))}
      </div>
      
      {/* 3D Snow */}
      <Snowfall3D count={25} />
      
      {/* 3D Floating gifts */}
      <GiftBox3D x={15} y={30} color1={SANTA_COLORS.red} color2={SANTA_COLORS.gold} size={45} delay={0} />
      <GiftBox3D x={75} y={35} color1={SANTA_COLORS.green} color2={SANTA_COLORS.red} size={40} delay={1} />
      <GiftBox3D x={45} y={25} color1={SANTA_COLORS.blue} color2={SANTA_COLORS.gold} size={35} delay={2} />
      <GiftBox3D x={25} y={45} color1={SANTA_COLORS.pink} color2={SANTA_COLORS.gold} size={38} delay={1.5} />
      
      {/* Magic sparkle effect */}
      <div 
        className="absolute transition-all duration-1000"
        style={{ 
          left: `${magicSparkle.x}%`, 
          top: `${magicSparkle.y}%`,
        }}
      >
        <div 
          className="w-4 h-4 rounded-full animate-magic-burst"
          style={{
            background: 'white',
            boxShadow: `0 0 30px 15px ${SANTA_COLORS.gold}, 0 0 60px 30px ${SANTA_COLORS.gold}66`,
          }}
        />
      </div>
      
      {/* Toy shelf glow */}
      <div className="absolute top-0 bottom-0 left-0 w-24 opacity-30" style={{ background: `linear-gradient(90deg, rgba(139,69,19,0.5) 0%, transparent 100%)` }} />
      <div className="absolute top-0 bottom-0 right-0 w-24 opacity-30" style={{ background: `linear-gradient(-90deg, rgba(139,69,19,0.5) 0%, transparent 100%)` }} />
      
      {/* Warm magical vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(20,10,25,0.5) 100%)' }} />
      
      <style jsx>{`
        @keyframes magic-burst { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes gift-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
        .animate-magic-burst { animation: magic-burst 2s ease-out infinite; }
        .animate-gift-float { animation: gift-float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
