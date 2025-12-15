'use client';

import React, { useRef, useEffect, useState } from 'react';

interface LazyVideoProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  poster?: string;
  onLoadStart?: () => void;
  onLoadedData?: () => void;
  onError?: () => void;
}

/**
 * Lazy-loading video component that only loads when in viewport
 * Optimizes page load performance by deferring video loading
 */
export default function LazyVideo({
  src,
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  preload = 'none',
  poster,
  onLoadStart,
  onLoadedData,
  onError
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create Intersection Observer to detect when video enters viewport
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Stop observing once in view
            if (observerRef.current && containerRef.current) {
              observerRef.current.unobserve(containerRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current && containerRef.current) {
        observerRef.current.unobserve(containerRef.current);
      }
    };
  }, []);

  // Load video when in view
  useEffect(() => {
    if (isInView && videoRef.current && !isLoaded) {
      const video = videoRef.current;
      
      // Set source only when in view
      video.src = src;
      video.load(); // Trigger loading
      setIsLoaded(true);
      
      if (onLoadStart) onLoadStart();
    }
  }, [isInView, src, isLoaded, onLoadStart]);

  // Handle video loaded
  const handleLoadedData = () => {
    if (onLoadedData) onLoadedData();
  };

  // Handle video error
  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  // Show placeholder if not loaded or error
  if (!isInView || hasError) {
    return (
      <div
        ref={containerRef}
        className={`${className} bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center`}
        style={{ aspectRatio: '16/9' }}
      >
        {poster ? (
          <img
            src={poster}
            alt="Video preview"
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="text-white/50 text-sm">Loading video...</div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay={autoPlay && isInView}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
        poster={poster}
        onLoadedData={handleLoadedData}
        onError={handleError}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

