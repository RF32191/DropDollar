'use client';

import React, { useEffect, useState } from 'react';

// Animation System for DropDollar
export class AnimationEffects {
  
  // Category-specific animations
  static ElectronicsAnimation() {
    return (
      <div className="electronics-animation">
        <style jsx>{`
          .electronics-animation {
            position: relative;
            overflow: hidden;
          }
          
          .electronics-animation::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
            animation: electronics-scan 2s infinite;
          }
          
          @keyframes electronics-scan {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          
          .electronics-animation::after {
            content: '⚡';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2rem;
            animation: electronics-pulse 1s infinite;
          }
          
          @keyframes electronics-pulse {
            0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  static BooksAnimation() {
    return (
      <div className="books-animation">
        <style jsx>{`
          .books-animation {
            position: relative;
            overflow: hidden;
          }
          
          .books-animation::before {
            content: '📚';
            position: absolute;
            top: 20%;
            left: 10%;
            font-size: 1.5rem;
            animation: books-float 3s ease-in-out infinite;
          }
          
          .books-animation::after {
            content: '📖';
            position: absolute;
            top: 60%;
            right: 15%;
            font-size: 1.2rem;
            animation: books-float 3s ease-in-out infinite reverse;
          }
          
          @keyframes books-float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-10px) rotate(5deg); }
          }
        `}</style>
      </div>
    );
  }

  static MusicAnimation() {
    return (
      <div className="music-animation">
        <style jsx>{`
          .music-animation {
            position: relative;
            overflow: hidden;
          }
          
          .music-animation::before {
            content: '🎵';
            position: absolute;
            top: 30%;
            left: 20%;
            font-size: 2rem;
            animation: music-bounce 1.5s ease-in-out infinite;
          }
          
          .music-animation::after {
            content: '🎶';
            position: absolute;
            top: 50%;
            right: 25%;
            font-size: 1.8rem;
            animation: music-bounce 1.5s ease-in-out infinite 0.5s;
          }
          
          @keyframes music-bounce {
            0%, 100% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.2) rotate(10deg); }
          }
        `}</style>
      </div>
    );
  }

  static ToolsAnimation() {
    return (
      <div className="tools-animation">
        <style jsx>{`
          .tools-animation {
            position: relative;
            overflow: hidden;
          }
          
          .tools-animation::before {
            content: '🔧';
            position: absolute;
            top: 25%;
            left: 15%;
            font-size: 1.8rem;
            animation: tools-spin 2s linear infinite;
          }
          
          .tools-animation::after {
            content: '⚒️';
            position: absolute;
            top: 60%;
            right: 20%;
            font-size: 1.5rem;
            animation: tools-hammer 1.5s ease-in-out infinite;
          }
          
          @keyframes tools-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes tools-hammer {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-15deg); }
          }
        `}</style>
      </div>
    );
  }

  static ArtAnimation() {
    return (
      <div className="art-animation">
        <style jsx>{`
          .art-animation {
            position: relative;
            overflow: hidden;
          }
          
          .art-animation::before {
            content: '🎨';
            position: absolute;
            top: 20%;
            left: 20%;
            font-size: 2rem;
            animation: art-paint 2s ease-in-out infinite;
          }
          
          .art-animation::after {
            content: '🖌️';
            position: absolute;
            top: 50%;
            right: 30%;
            font-size: 1.5rem;
            animation: art-brush 1.8s ease-in-out infinite;
          }
          
          @keyframes art-paint {
            0%, 100% { transform: scale(1) rotate(0deg); }
            50% { transform: scale(1.1) rotate(5deg); }
          }
          
          @keyframes art-brush {
            0%, 100% { transform: translateX(0px) rotate(0deg); }
            50% { transform: translateX(5px) rotate(10deg); }
          }
        `}</style>
      </div>
    );
  }

  // Game completion animations
  static GameWinAnimation() {
    return (
      <div className="game-win-animation">
        <style jsx>{`
          .game-win-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
          }
          
          .game-win-animation::before {
            content: '🎉';
            position: absolute;
            top: 20%;
            left: 20%;
            font-size: 3rem;
            animation: confetti-fall 3s ease-out infinite;
          }
          
          .game-win-animation::after {
            content: '🏆';
            position: absolute;
            top: 30%;
            right: 25%;
            font-size: 4rem;
            animation: trophy-bounce 2s ease-in-out infinite;
          }
          
          @keyframes confetti-fall {
            0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
          
          @keyframes trophy-bounce {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-20px) scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  static GameLossAnimation() {
    return (
      <div className="game-loss-animation">
        <style jsx>{`
          .game-loss-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
          }
          
          .game-loss-animation::before {
            content: '😔';
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 4rem;
            animation: sad-shake 2s ease-in-out infinite;
          }
          
          @keyframes sad-shake {
            0%, 100% { transform: translateX(-50%) rotate(0deg); }
            25% { transform: translateX(-52%) rotate(-2deg); }
            75% { transform: translateX(-48%) rotate(2deg); }
          }
        `}</style>
      </div>
    );
  }

  // Token purchase animation
  static TokenPurchaseAnimation() {
    return (
      <div className="token-purchase-animation">
        <style jsx>{`
          .token-purchase-animation {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
          }
          
          .token-purchase-animation::before {
            content: '💰';
            position: absolute;
            top: 30%;
            left: 30%;
            font-size: 3rem;
            animation: coin-spin 2s ease-in-out infinite;
          }
          
          .token-purchase-animation::after {
            content: '✨';
            position: absolute;
            top: 50%;
            right: 30%;
            font-size: 2rem;
            animation: sparkle-twinkle 1.5s ease-in-out infinite;
          }
          
          @keyframes coin-spin {
            0% { transform: rotateY(0deg) scale(1); }
            50% { transform: rotateY(180deg) scale(1.2); }
            100% { transform: rotateY(360deg) scale(1); }
          }
          
          @keyframes sparkle-twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.3); }
          }
        `}</style>
      </div>
    );
  }

  // Button hover animations
  static ButtonHoverAnimation() {
    return (
      <div className="button-hover-animation">
        <style jsx>{`
          .button-hover-animation {
            transition: all 0.3s ease;
          }
          
          .button-hover-animation:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          }
          
          .button-hover-animation:active {
            transform: scale(0.95);
          }
        `}</style>
      </div>
    );
  }

  // Page load animations
  static PageLoadAnimation() {
    return (
      <div className="page-load-animation">
        <style jsx>{`
          .page-load-animation {
            animation: page-fade-in 0.8s ease-out;
          }
          
          @keyframes page-fade-in {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // Listing hover animations
  static ListingHoverAnimation() {
    return (
      <div className="listing-hover-animation">
        <style jsx>{`
          .listing-hover-animation {
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          
          .listing-hover-animation:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
          }
          
          .listing-hover-animation:hover::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: listing-shine 0.6s ease-out;
          }
          
          @keyframes listing-shine {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    );
  }
}

// React component wrappers for animations
export const ElectronicsAnimationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {AnimationEffects.ElectronicsAnimation()}
    {children}
  </div>
);

export const BooksAnimationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {AnimationEffects.BooksAnimation()}
    {children}
  </div>
);

export const MusicAnimationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {AnimationEffects.MusicAnimation()}
    {children}
  </div>
);

export const ToolsAnimationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {AnimationEffects.ToolsAnimation()}
    {children}
  </div>
);

export const ArtAnimationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    {AnimationEffects.ArtAnimation()}
    {children}
  </div>
);

export default AnimationEffects;
