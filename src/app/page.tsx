'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import CleanNavigation from '@/components/navigation/CleanNavigation';

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Play audio when page loads
  useEffect(() => {
    const audioFile = '/HomePage.mp3';
    let hasPlayed = false;
    let audio: HTMLAudioElement | null = null;
    
    console.log('🎵 Attempting to load audio:', audioFile);
    
    // Create audio element
    audio = new Audio(audioFile);
    audioRef.current = audio;
    audio.volume = 0.7; // Slightly higher volume
    audio.loop = false;
    
    // Error handlers
    audio.addEventListener('error', (e) => {
      console.error('❌ Audio error:', e);
      console.error('Audio error details:', {
        code: audio?.error?.code,
        message: audio?.error?.message,
        networkState: audio?.networkState,
        readyState: audio?.readyState
      });
    });
    
    audio.addEventListener('loadstart', () => {
      console.log('📥 Audio loading started');
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('📦 Audio data loaded');
    });
    
    audio.addEventListener('canplay', () => {
      console.log('▶️ Audio can play');
    });
    
    const playAudio = async () => {
      if (hasPlayed || !audio) return;
      
      try {
        console.log('🎯 Attempting to play audio...');
        console.log('Audio state:', {
          readyState: audio.readyState,
          networkState: audio.networkState,
          paused: audio.paused,
          src: audio.src
        });
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          hasPlayed = true;
          console.log('✅ HomePage audio is now playing!');
        }
      } catch (error: any) {
        console.warn('⚠️ Autoplay blocked:', error.name, error.message);
        console.log('💡 Audio will play on first user interaction');
        
        // Play on first user interaction
        const playOnInteraction = async () => {
          if (!hasPlayed && audio) {
            try {
              await audio.play();
              hasPlayed = true;
              console.log('✅ HomePage audio playing after user interaction');
            } catch (err) {
              console.error('❌ Error playing audio after interaction:', err);
            }
            document.removeEventListener('click', playOnInteraction);
            document.removeEventListener('touchstart', playOnInteraction);
            document.removeEventListener('keydown', playOnInteraction);
          }
        };
        
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('touchstart', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
      }
    };
    
    // Try multiple approaches to play
    audio.addEventListener('canplaythrough', () => {
      console.log('✅ Audio ready to play');
      playAudio();
    }, { once: true });
    
    // Immediate attempt after load
    audio.addEventListener('loadeddata', () => {
      setTimeout(() => playAudio(), 100);
    }, { once: true });
    
    // Fallback timer
    const fallbackTimer = setTimeout(() => {
      if (!hasPlayed) {
        console.log('⏰ Fallback: attempting to play audio');
        playAudio();
      }
    }, 1000);
    
    // Start loading
    audio.load();
    console.log('🚀 Audio load() called');

    return () => {
      clearTimeout(fallbackTimer);
      if (audio) {
        audio.pause();
        audio = null;
      }
      audioRef.current = null;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden">
      <CleanNavigation variant="gradient" currentPage="/" />

      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" style={{ top: '10%', left: '10%' }}></div>
          <div className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" style={{ top: '50%', right: '10%' }}></div>
          <div className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" style={{ bottom: '10%', left: '50%' }}></div>
        </div>

        <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
            <span className="inline-block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
              Welcome to
            </span>
            <br />
            <span className="inline-block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient-reverse text-7xl md:text-9xl">
              DropDollar
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-3xl text-gray-200 mb-12 max-w-4xl mx-auto font-light leading-relaxed">
            Where Gaming Meets Opportunity
          </p>

          {/* Video Section */}
          <div className="mb-16 max-w-4xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-purple-500/50 hover:border-purple-400 transition-all duration-300 transform hover:scale-105">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0&mute=0&controls=1&rel=0"
                  title="DropDollar Introduction"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
            <Link
              href="/auth/login"
              className="group relative px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="/games"
              className="group relative px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl"
            >
              <span className="relative z-10">Explore Games</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-bold text-center mb-20">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Why DropDollar?
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-xl p-8 rounded-3xl border border-blue-500/30 hover:border-blue-400 transition-all duration-500 transform hover:-translate-y-4 hover:shadow-2xl">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🎮</div>
              <h3 className="text-2xl font-bold text-white mb-4">Exciting Games</h3>
              <p className="text-gray-300 leading-relaxed">
                Play skill-based games and compete for real prizes. Fast-paced action meets strategic gameplay.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-xl p-8 rounded-3xl border border-purple-500/30 hover:border-purple-400 transition-all duration-500 transform hover:-translate-y-4 hover:shadow-2xl">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">🔒</div>
              <h3 className="text-2xl font-bold text-white mb-4">Secure Platform</h3>
              <p className="text-gray-300 leading-relaxed">
                Bank-level security with Stripe payments. Your data and funds are always protected.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-pink-900/50 to-orange-900/50 backdrop-blur-xl p-8 rounded-3xl border border-pink-500/30 hover:border-pink-400 transition-all duration-500 transform hover:-translate-y-4 hover:shadow-2xl">
              <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">⚡</div>
              <h3 className="text-2xl font-bold text-white mb-4">Instant Payouts</h3>
              <p className="text-gray-300 leading-relaxed">
                Win prizes and get paid instantly. Fast, secure transactions directly to your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-bold text-center mb-20">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Sign Up</h3>
              <p className="text-gray-400">Create your free account in seconds</p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Buy Tokens</h3>
              <p className="text-gray-400">Purchase tokens to enter games</p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-orange-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Play & Win</h3>
              <p className="text-gray-400">Compete and win amazing prizes</p>
            </div>

            {/* Step 4 */}
            <div className="text-center group">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                4
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Get Paid</h3>
              <p className="text-gray-400">Receive your winnings instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Ready to Start Winning?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Join thousands of players competing for real prizes every day
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-16 py-6 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-2xl font-bold rounded-full hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-110 hover:shadow-2xl"
          >
            Join Now - It's Free!
          </Link>
        </div>
      </section>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-gradient-reverse {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite reverse;
        }
      `}</style>
    </div>
  );
}
