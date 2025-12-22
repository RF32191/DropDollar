'use client';

import React, { useState, useEffect } from 'react';

// Christmas light colors
const LIGHT_COLORS = ['#ff0000', '#00ff00', '#ffd700', '#00bfff', '#ff69b4', '#ff4500'];

// Reusable Christmas Lights Component
function ChristmasLights({ position = 'top', count = 20, offset = 0 }: { position?: 'top' | 'bottom' | 'left' | 'right'; count?: number; offset?: number }) {
  const [activeLight, setActiveLight] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLight(prev => (prev + 1) % count);
    }, 150);
    return () => clearInterval(interval);
  }, [count]);
  
  const isVertical = position === 'left' || position === 'right';
  
  return (
    <div 
      className={`absolute ${
        position === 'top' ? 'top-0 left-0 right-0 h-8 flex-row' :
        position === 'bottom' ? 'bottom-0 left-0 right-0 h-8 flex-row' :
        position === 'left' ? 'top-0 bottom-0 left-0 w-8 flex-col' :
        'top-0 bottom-0 right-0 w-8 flex-col'
      } flex justify-around items-center`}
    >
      {/* Wire */}
      <div className={`absolute ${isVertical ? 'w-0.5 h-full left-1/2 -translate-x-1/2' : 'h-0.5 w-full top-1/2 -translate-y-1/2'} bg-gray-700`} />
      
      {[...Array(count)].map((_, i) => {
        const colorIndex = (i + offset) % LIGHT_COLORS.length;
        const isActive = Math.abs(i - activeLight) <= 2 || Math.abs(i - activeLight - count) <= 2 || Math.abs(i - activeLight + count) <= 2;
        
        return (
          <div key={i} className="relative z-10">
            {/* Bulb socket */}
            <div className="w-2 h-1.5 bg-gray-600 rounded-t-sm mx-auto" />
            {/* Bulb */}
            <div 
              className="w-3 h-4 rounded-b-full transition-all duration-150"
              style={{
                background: isActive 
                  ? `radial-gradient(circle at 30% 30%, white 0%, ${LIGHT_COLORS[colorIndex]} 40%, ${LIGHT_COLORS[colorIndex]}88 100%)`
                  : `radial-gradient(circle at 30% 30%, ${LIGHT_COLORS[colorIndex]}66 0%, ${LIGHT_COLORS[colorIndex]}33 100%)`,
                boxShadow: isActive 
                  ? `0 0 15px 5px ${LIGHT_COLORS[colorIndex]}aa, 0 0 30px 10px ${LIGHT_COLORS[colorIndex]}55`
                  : 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// Falling Snow Component
function FallingSnow({ count = 30, speed = 'normal' }: { count?: number; speed?: 'slow' | 'normal' | 'fast' }) {
  const duration = speed === 'slow' ? 15 : speed === 'fast' ? 6 : 10;
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-snowfall"
          style={{
            width: `${2 + (i % 4) * 2}px`,
            height: `${2 + (i % 4) * 2}px`,
            left: `${(i * 3.3) % 100}%`,
            animationDelay: `${(i * 0.5) % duration}s`,
            animationDuration: `${duration + (i % 5)}s`,
            opacity: 0.4 + (i % 4) * 0.15,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes snowfall { 
          0% { transform: translateY(-20px) translateX(0) rotate(0deg); } 
          100% { transform: translateY(100vh) translateX(${speed === 'fast' ? '50' : '30'}px) rotate(360deg); } 
        }
        .animate-snowfall { animation: snowfall linear infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// FIREPLACE THEME - For Hot Sell Page
// Cozy cabin, crackling fire, Christmas magic
// ============================================
export function FireplaceOverlay() {
  const [fireFlicker, setFireFlicker] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFireFlicker(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* DEEP RED/GREEN CHRISTMAS PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a0a0a 0%, #0d1a0d 30%, #1a0f0a 60%, #0a0d0a 100%)',
        }}
      />
      
      {/* Christmas lights on ALL sides */}
      <ChristmasLights position="top" count={25} offset={0} />
      <ChristmasLights position="bottom" count={25} offset={3} />
      <ChristmasLights position="left" count={15} offset={1} />
      <ChristmasLights position="right" count={15} offset={2} />
      
      {/* Gentle snowfall */}
      <FallingSnow count={20} speed="slow" />
      
      {/* Fireplace at bottom center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-48">
        {/* Fireplace frame */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-40 bg-gradient-to-t from-stone-800 to-stone-700 rounded-t-lg border-4 border-stone-600" />
        
        {/* Fire glow */}
        <div 
          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-28"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, 
              rgba(255,${150 + Math.sin(fireFlicker * 0.2) * 50},0,0.9) 0%, 
              rgba(255,100,0,0.6) 30%, 
              rgba(255,50,0,0.3) 60%, 
              transparent 100%)`,
          }}
        />
        
        {/* Flames */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-8 animate-flame"
            style={{
              left: `${30 + i * 10}%`,
              width: '20px',
              height: `${40 + Math.sin((fireFlicker + i * 20) * 0.15) * 15}px`,
              background: `linear-gradient(0deg, #ff4500 0%, #ff8c00 40%, #ffd700 70%, transparent 100%)`,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              animationDelay: `${i * 0.2}s`,
              filter: 'blur(2px)',
            }}
          />
        ))}
        
        {/* Stockings */}
        <div className="absolute -top-12 left-4 w-8 h-16 bg-red-700 rounded-b-lg" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 60% 100%, 0 70%)' }}>
          <div className="absolute top-0 left-0 right-0 h-3 bg-white" />
        </div>
        <div className="absolute -top-12 right-4 w-8 h-16 bg-green-700 rounded-b-lg" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 60% 100%, 0 70%)' }}>
          <div className="absolute top-0 left-0 right-0 h-3 bg-white" />
        </div>
      </div>
      
      {/* Warm corner glows */}
      <div className="absolute bottom-0 left-0 w-96 h-96" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(255,100,50,0.2) 0%, transparent 50%)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(255,100,50,0.2) 0%, transparent 50%)' }} />
      
      {/* Cozy vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 100%, transparent 30%, rgba(10,5,0,0.5) 100%)' }} />
      
      <style jsx>{`
        @keyframes flame { 0%, 100% { transform: scaleY(1) translateX(0); } 50% { transform: scaleY(1.1) translateX(2px); } }
        .animate-flame { animation: flame 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// SNOWBALL THEME - For 1v1 Page
// Epic winter battle arena
// ============================================
export function SnowballOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* ICY BLUE/GREEN BATTLE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0a1a2a 0%, #0d2010 30%, #1a0a0a 70%, #0a1520 100%)',
        }}
      />
      
      {/* Christmas lights border */}
      <ChristmasLights position="top" count={30} offset={0} />
      <ChristmasLights position="left" count={20} offset={2} />
      <ChristmasLights position="right" count={20} offset={4} />
      
      {/* Heavy snowfall for battle atmosphere */}
      <FallingSnow count={40} speed="fast" />
      
      {/* Icicles at top - larger and more detailed */}
      <div className="absolute top-8 left-0 right-0 flex justify-around">
        {[...Array(25)].map((_, i) => (
          <div key={i} className="relative" style={{ marginTop: `${(i % 4) * 5}px` }}>
            <div 
              className="bg-gradient-to-b from-cyan-100/90 via-cyan-200/70 to-cyan-300/30 animate-icicle"
              style={{
                width: `${4 + (i % 3) * 2}px`,
                height: `${30 + (i % 5) * 15}px`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                animationDelay: `${i * 0.15}s`,
              }}
            />
            {/* Drip */}
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-300/70 rounded-full animate-drip"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          </div>
        ))}
      </div>
      
      {/* Red vs Green battle sides */}
      <div className="absolute top-0 bottom-0 left-0 w-32" style={{ background: 'linear-gradient(90deg, rgba(200,0,0,0.15) 0%, transparent 100%)' }} />
      <div className="absolute top-0 bottom-0 right-0 w-32" style={{ background: 'linear-gradient(-90deg, rgba(0,150,0,0.15) 0%, transparent 100%)' }} />
      
      {/* Snow forts */}
      <div className="absolute bottom-0 left-8 w-24 h-20 bg-gradient-to-t from-gray-100 to-white rounded-t-lg opacity-40" />
      <div className="absolute bottom-0 right-8 w-24 h-20 bg-gradient-to-t from-gray-100 to-white rounded-t-lg opacity-40" />
      
      {/* Snow ground */}
      <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.4) 0%, rgba(200,220,255,0.2) 60%, transparent 100%)' }} />
      
      {/* Frost border effect */}
      <div className="absolute inset-0 border-8 border-cyan-200/10 rounded-lg" style={{ boxShadow: 'inset 0 0 50px rgba(200,230,255,0.1)' }} />
      
      <style jsx>{`
        @keyframes icicle { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes drip { 0%, 80% { opacity: 0; transform: translateX(-50%) translateY(0); } 90% { opacity: 0.7; } 100% { opacity: 0; transform: translateX(-50%) translateY(25px); } }
        .animate-icicle { animation: icicle 3s ease-in-out infinite; }
        .animate-drip { animation: drip 3s ease-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// NORTH POLE THEME - For Winner Takes All Page
// Santa's magical workshop
// ============================================
export function NorthPoleOverlay() {
  const [starTwinkle, setStarTwinkle] = useState<number[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const newTwinkles = Array.from({ length: 15 }, () => Math.random());
      setStarTwinkle(newTwinkles);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* MAGICAL NIGHT SKY - DEEP GREEN/RED */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #050a15 0%, #0a1a0f 20%, #150a0a 50%, #0a150a 80%, #0f0a0a 100%)',
        }}
      />
      
      {/* Aurora Borealis effect */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden opacity-40">
        <div 
          className="absolute inset-0 animate-aurora"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,100,0.2) 20%, rgba(0,200,255,0.15) 40%, rgba(100,0,200,0.1) 60%, transparent 100%)',
          }}
        />
        <div 
          className="absolute inset-0 animate-aurora-2"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,150,0.15) 30%, rgba(255,100,200,0.1) 50%, transparent 100%)',
          }}
        />
      </div>
      
      {/* Stars */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              left: `${(i * 3.3) % 100}%`,
              top: `${(i * 2.7) % 40}%`,
              opacity: starTwinkle[i % 15] > 0.5 ? 1 : 0.3,
              boxShadow: starTwinkle[i % 15] > 0.7 ? '0 0 5px 2px white' : 'none',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      
      {/* Christmas lights ALL around */}
      <ChristmasLights position="top" count={35} offset={0} />
      <ChristmasLights position="bottom" count={35} offset={2} />
      <ChristmasLights position="left" count={25} offset={1} />
      <ChristmasLights position="right" count={25} offset={3} />
      
      {/* Gentle snow */}
      <FallingSnow count={25} speed="slow" />
      
      {/* Giant Christmas star */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2">
        <div 
          className="text-6xl animate-star-glow"
          style={{ 
            filter: 'drop-shadow(0 0 20px gold) drop-shadow(0 0 40px gold)',
          }}
        >
          ⭐
        </div>
      </div>
      
      {/* Candy cane poles */}
      <div className="absolute bottom-0 left-8 w-6 h-48 overflow-hidden opacity-60">
        <div className="w-full h-full animate-candy-stripe" style={{ background: 'repeating-linear-gradient(45deg, #dc2626, #dc2626 10px, white 10px, white 20px)' }} />
      </div>
      <div className="absolute bottom-0 right-8 w-6 h-48 overflow-hidden opacity-60">
        <div className="w-full h-full animate-candy-stripe" style={{ background: 'repeating-linear-gradient(-45deg, #16a34a, #16a34a 10px, white 10px, white 20px)' }} />
      </div>
      
      {/* Snow ground with sparkle */}
      <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(0deg, rgba(255,255,255,0.35) 0%, rgba(200,230,255,0.15) 60%, transparent 100%)' }} />
      
      <style jsx>{`
        @keyframes aurora { 0%, 100% { transform: translateX(-20%) scaleY(1); } 50% { transform: translateX(20%) scaleY(1.2); } }
        @keyframes aurora-2 { 0%, 100% { transform: translateX(10%) scaleY(1); } 50% { transform: translateX(-10%) scaleY(0.8); } }
        @keyframes star-glow { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes candy-stripe { 0% { transform: translateY(0); } 100% { transform: translateY(40px); } }
        .animate-aurora { animation: aurora 8s ease-in-out infinite; }
        .animate-aurora-2 { animation: aurora-2 6s ease-in-out infinite; }
        .animate-star-glow { animation: star-glow 2s ease-in-out infinite; }
        .animate-candy-stripe { animation: candy-stripe 1s linear infinite; }
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
      setShimmer(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* RICH RED/GOLD PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a0a05 0%, #2a1508 30%, #1a100a 60%, #150a0a 100%)',
        }}
      />
      
      {/* Golden shimmer overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `linear-gradient(${shimmer * 3.6}deg, transparent 40%, rgba(255,215,0,0.3) 50%, transparent 60%)`,
        }}
      />
      
      {/* Christmas lights */}
      <ChristmasLights position="top" count={25} offset={0} />
      <ChristmasLights position="left" count={18} offset={1} />
      <ChristmasLights position="right" count={18} offset={2} />
      
      {/* Gentle snow */}
      <FallingSnow count={15} speed="slow" />
      
      {/* Hanging ornaments */}
      <div className="absolute top-8 left-0 right-0 flex justify-around">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="relative animate-ornament" style={{ animationDelay: `${i * 0.3}s` }}>
            <div className="w-px h-10 bg-gray-400/50 mx-auto" />
            <div 
              className={`w-8 h-8 rounded-full ${
                i % 3 === 0 ? 'bg-gradient-to-br from-red-400 to-red-700' :
                i % 3 === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                'bg-gradient-to-br from-green-400 to-green-700'
              }`}
              style={{
                boxShadow: `0 0 20px 5px ${
                  i % 3 === 0 ? 'rgba(239,68,68,0.4)' :
                  i % 3 === 1 ? 'rgba(234,179,8,0.5)' :
                  'rgba(34,197,94,0.4)'
                }`,
              }}
            >
              <div className="absolute top-1 left-1.5 w-2 h-2 bg-white/50 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Gift boxes */}
      <div className="absolute bottom-4 left-8 w-16 h-14 bg-gradient-to-b from-red-600 to-red-800 rounded opacity-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-full bg-yellow-500" />
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-3 bg-yellow-500" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-4 bg-yellow-500 rounded-full" />
      </div>
      <div className="absolute bottom-4 right-8 w-12 h-10 bg-gradient-to-b from-green-600 to-green-800 rounded opacity-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full bg-red-500" />
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 bg-red-500" />
      </div>
      
      {/* Golden sparkles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"
          style={{
            left: `${(i * 8) + 5}%`,
            top: `${15 + (i % 5) * 12}%`,
            animationDelay: `${i * 0.3}s`,
            boxShadow: '0 0 8px 3px rgba(255,215,0,0.6)',
          }}
        />
      ))}
      
      {/* Warm golden vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(40,20,0,0.5) 100%)' }} />
      
      <style jsx>{`
        @keyframes ornament { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes sparkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.3); } }
        .animate-ornament { animation: ornament 4s ease-in-out infinite; }
        .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// WINTER THEME - For Dashboard
// Beautiful winter wonderland with lights everywhere
// ============================================
export function WinterOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* WINTER GREEN/RED PAGE COLOR - Dramatic change */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a1510 0%, #150a0f 25%, #0a1008 50%, #100a0f 75%, #080a08 100%)',
        }}
      />
      
      {/* Christmas lights ALL around - more prominent */}
      <ChristmasLights position="top" count={30} offset={0} />
      <ChristmasLights position="bottom" count={30} offset={2} />
      <ChristmasLights position="left" count={22} offset={1} />
      <ChristmasLights position="right" count={22} offset={3} />
      
      {/* Icicles */}
      <div className="absolute top-8 left-0 right-0 flex justify-around">
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{ marginTop: `${(i % 3) * 4}px` }}>
            <div 
              className="bg-gradient-to-b from-cyan-100/80 via-cyan-200/60 to-transparent animate-icicle-shimmer"
              style={{
                width: `${3 + (i % 2) * 2}px`,
                height: `${20 + (i % 6) * 10}px`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Snow */}
      <FallingSnow count={25} speed="normal" />
      
      {/* Christmas tree silhouette center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-20">
        <div className="relative">
          {/* Tree layers */}
          <div className="w-0 h-0 border-l-[60px] border-r-[60px] border-b-[80px] border-transparent border-b-green-800 mx-auto" />
          <div className="w-0 h-0 border-l-[50px] border-r-[50px] border-b-[70px] border-transparent border-b-green-700 mx-auto -mt-10" />
          <div className="w-0 h-0 border-l-[40px] border-r-[40px] border-b-[60px] border-transparent border-b-green-600 mx-auto -mt-10" />
          {/* Trunk */}
          <div className="w-8 h-12 bg-amber-900 mx-auto" />
          {/* Star */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">⭐</div>
        </div>
      </div>
      
      {/* Warm red/green corner glows */}
      <div className="absolute bottom-0 left-0 w-64 h-64" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(200,50,50,0.15) 0%, transparent 50%)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(50,150,50,0.15) 0%, transparent 50%)' }} />
      <div className="absolute top-0 left-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 0% 0%, rgba(50,150,50,0.1) 0%, transparent 50%)' }} />
      <div className="absolute top-0 right-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(200,50,50,0.1) 0%, transparent 50%)' }} />
      
      {/* Frost on edges */}
      <div className="absolute inset-0 border-[12px] border-white/5 rounded-lg" style={{ boxShadow: 'inset 0 0 60px rgba(200,230,255,0.1)' }} />
      
      <style jsx>{`
        @keyframes icicle-shimmer { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        .animate-icicle-shimmer { animation: icicle-shimmer 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ============================================
// TOYSHOP THEME - For Games Page
// Magical toy store atmosphere
// ============================================
export function ToyshopOverlay() {
  const [toyBounce, setToyBounce] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setToyBounce(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* MAGICAL TOY STORE PAGE COLOR */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #120a15 0%, #0a1510 30%, #150a0a 60%, #0a0f15 100%)',
        }}
      />
      
      {/* Christmas lights border - extra festive */}
      <ChristmasLights position="top" count={35} offset={0} />
      <ChristmasLights position="bottom" count={35} offset={2} />
      <ChristmasLights position="left" count={25} offset={1} />
      <ChristmasLights position="right" count={25} offset={3} />
      
      {/* Garland with holly */}
      <div className="absolute top-8 left-0 right-0 h-10">
        <div 
          className="absolute inset-x-4 h-6 rounded-full opacity-40"
          style={{ background: 'linear-gradient(90deg, #166534, #15803d, #166534, #15803d, #166534)' }}
        />
        {/* Holly berries */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute top-1" style={{ left: `${10 + i * 12}%` }}>
            <div className="flex gap-0.5">
              <div className="w-2 h-2 bg-red-600 rounded-full" style={{ boxShadow: '0 0 5px rgba(255,0,0,0.5)' }} />
              <div className="w-2 h-2 bg-red-600 rounded-full" style={{ boxShadow: '0 0 5px rgba(255,0,0,0.5)' }} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Snow */}
      <FallingSnow count={20} speed="slow" />
      
      {/* Floating presents */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float-present"
          style={{
            left: `${15 + i * 25}%`,
            top: `${25 + (i % 2) * 15}%`,
            animationDelay: `${i * 1}s`,
          }}
        >
          <div 
            className={`w-10 h-8 rounded-sm opacity-50 ${
              i % 2 === 0 ? 'bg-red-600' : 'bg-green-600'
            }`}
          >
            <div className={`absolute top-1/2 -translate-y-1/2 w-full h-2 ${i % 2 === 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full ${i % 2 === 0 ? 'bg-yellow-500' : 'bg-red-500'}`} />
          </div>
        </div>
      ))}
      
      {/* Toy shelf glow on sides */}
      <div className="absolute top-0 bottom-0 left-0 w-20 opacity-25" style={{ background: 'linear-gradient(90deg, rgba(139,69,19,0.4) 0%, transparent 100%)' }} />
      <div className="absolute top-0 bottom-0 right-0 w-20 opacity-25" style={{ background: 'linear-gradient(-90deg, rgba(139,69,19,0.4) 0%, transparent 100%)' }} />
      
      {/* Magical sparkle effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at ${50 + Math.sin(toyBounce * 0.1) * 20}% ${30 + Math.cos(toyBounce * 0.08) * 15}%, rgba(255,255,200,0.3) 0%, transparent 30%)`,
        }}
      />
      
      {/* Cozy vignette */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(15,10,20,0.5) 100%)' }} />
      
      <style jsx>{`
        @keyframes float-present { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-15px) rotate(3deg); } }
        .animate-float-present { animation: float-present 5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
